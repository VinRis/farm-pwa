// Synchronization Service for Farm Manager PWA

export class SyncService {
    constructor(config = {}) {
        this.offlineDb = config.offlineDb;
        this.apiBaseUrl = config.apiBaseUrl || 'https://api.example.com';
        this.syncInterval = config.syncInterval || 30000; // 30 seconds
        this.maxRetries = config.maxRetries || 3;
        this.batchSize = config.batchSize || 10;
        
        this.isSyncing = false;
        this.syncQueue = [];
        this.failedItems = [];
        this.lastSyncTime = null;
        this.syncListeners = [];
        
        this.authToken = localStorage.getItem('auth_token');
        this.userId = localStorage.getItem('user_id');
        
        this.init();
    }
    
    async init() {
        console.log('SyncService initialized');
        
        // Load sync queue from IndexedDB
        await this.loadSyncQueue();
        
        // Start background sync
        this.startBackgroundSync();
        
        // Listen for online/offline events
        this.setupEventListeners();
        
        // Initialize sync if online
        if (navigator.onLine) {
            setTimeout(() => this.attemptSync(), 5000);
        }
    }
    
    setupEventListeners() {
        window.addEventListener('online', () => {
            console.log('Device online, attempting sync...');
            this.attemptSync();
        });
        
        window.addEventListener('offline', () => {
            console.log('Device offline, pausing sync...');
            this.stopBackgroundSync();
        });
        
        // Listen for data changes
        document.addEventListener('farm-data-changed', (e) => {
            this.queueForSync(e.detail);
        });
    }
    
    async loadSyncQueue() {
        try {
            if (this.offlineDb) {
                this.syncQueue = await this.offlineDb.getPendingSyncs() || [];
                console.log(`Loaded ${this.syncQueue.length} pending syncs`);
            }
        } catch (error) {
            console.error('Failed to load sync queue:', error);
        }
    }
    
    async queueForSync(data) {
        const syncItem = {
            id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            data: data,
            type: data.type || 'unknown',
            action: data.action || 'create',
            entity: data.entity || 'unknown',
            timestamp: new Date().toISOString(),
            attempts: 0,
            synced: false,
            lastError: null,
            metadata: {
                userId: this.userId,
                deviceId: this.getDeviceId(),
                appVersion: '2.0.0'
            }
        };
        
        // Add to local queue
        this.syncQueue.push(syncItem);
        
        // Save to IndexedDB if available
        if (this.offlineDb) {
            try {
                await this.offlineDb.addToSyncQueue(syncItem.entity, syncItem.action, syncItem.data);
            } catch (error) {
                console.error('Failed to save sync item to IndexedDB:', error);
            }
        }
        
        // Notify listeners
        this.notifyListeners('queued', { item: syncItem, queueSize: this.syncQueue.length });
        
        // Trigger sync if online
        if (navigator.onLine && !this.isSyncing) {
            setTimeout(() => this.attemptSync(), 1000);
        }
        
        console.log(`Queued item for sync: ${syncItem.id} (${syncItem.entity})`);
        return syncItem;
    }
    
    async attemptSync() {
        if (this.isSyncing || this.syncQueue.length === 0 || !navigator.onLine) {
            return;
        }
        
        this.isSyncing = true;
        this.lastSyncTime = new Date();
        this.notifyListeners('started', { queueSize: this.syncQueue.length });
        
        console.log(`Starting sync of ${this.syncQueue.length} items...`);
        
        // Process items in batches
        const batches = this.createBatches(this.syncQueue, this.batchSize);
        let successful = 0;
        let failed = 0;
        
        for (const batch of batches) {
            try {
                const results = await this.syncBatch(batch);
                successful += results.successful;
                failed += results.failed;
                
                // Update local queue
                this.syncQueue = this.syncQueue.filter(item => 
                    !batch.some(batchItem => batchItem.id === item.id && results.successIds.includes(batchItem.id))
                );
                
            } catch (error) {
                console.error('Batch sync failed:', error);
                failed += batch.length;
            }
            
            // Small delay between batches
            await this.delay(1000);
        }
        
        this.isSyncing = false;
        
        // Notify completion
        this.notifyListeners('completed', {
            successful,
            failed,
            total: successful + failed,
            timestamp: this.lastSyncTime
        });
        
        console.log(`Sync completed: ${successful} successful, ${failed} failed`);
        
        // Update UI if needed
        this.updateUIAfterSync(successful, failed);
        
        return { successful, failed };
    }
    
    createBatches(items, batchSize) {
        const batches = [];
        for (let i = 0; i < items.length; i += batchSize) {
            batches.push(items.slice(i, i + batchSize));
        }
        return batches;
    }
    
    async syncBatch(batch) {
        const results = {
            successful: 0,
            failed: 0,
            successIds: []
        };
        
        for (const item of batch) {
            try {
                await this.syncItem(item);
                results.successful++;
                results.successIds.push(item.id);
                
                // Mark as synced in IndexedDB
                if (this.offlineDb) {
                    await this.offlineDb.markAsSynced(item.id, true);
                }
                
                // Notify item synced
                this.notifyListeners('item-synced', { item });
                
            } catch (error) {
                console.error(`Failed to sync item ${item.id}:`, error);
                results.failed++;
                
                item.attempts++;
                item.lastError = error.message;
                item.lastAttempt = new Date().toISOString();
                
                if (item.attempts >= this.maxRetries) {
                    // Move to failed items
                    this.failedItems.push(item);
                    this.notifyListeners('item-failed', { item, error: error.message });
                }
            }
            
            // Small delay between items
            await this.delay(200);
        }
        
        return results;
    }
    
    async syncItem(item) {
        // Determine API endpoint based on entity type
        const endpoint = this.getEndpointForEntity(item.entity);
        const url = `${this.apiBaseUrl}${endpoint}`;
        
        // Prepare request based on action
        let method, body;
        switch (item.action) {
            case 'create':
                method = 'POST';
                body = item.data;
                break;
            case 'update':
                method = 'PUT';
                body = { ...item.data, id: item.data.id };
                break;
            case 'delete':
                method = 'DELETE';
                body = { id: item.data.id };
                break;
            default:
                method = 'POST';
                body = item.data;
        }
        
        // Prepare headers
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        
        if (this.authToken) {
            headers['Authorization'] = `Bearer ${this.authToken}`;
        }
        
        // Simulated API call (replace with actual fetch)
        return this.simulateApiCall(url, method, body, headers);
        
        // Actual implementation would be:
        // const response = await fetch(url, {
        //     method,
        //     headers,
        //     body: JSON.stringify(body)
        // });
        // 
        // if (!response.ok) {
        //     throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        // }
        // 
        // return response.json();
    }
    
    simulateApiCall(url, method, body, headers) {
        return new Promise((resolve, reject) => {
            // Simulate network delay
            setTimeout(() => {
                // Simulate 90% success rate
                if (Math.random() < 0.9) {
                    resolve({
                        success: true,
                        id: body.id || `server_${Date.now()}`,
                        timestamp: new Date().toISOString()
                    });
                } else {
                    reject(new Error('Simulated API failure'));
                }
            }, 500);
        });
    }
    
    getEndpointForEntity(entity) {
        const endpoints = {
            'dairy_cow': '/api/dairy/cows',
            'poultry_flock': '/api/poultry/flocks',
            'milk_record': '/api/dairy/milk-records',
            'egg_record': '/api/poultry/egg-records',
            'feed_inventory': '/api/inventory/feed',
            'health_record': '/api/health/records',
            'financial_record': '/api/financial/records',
            'task': '/api/tasks'
        };
        
        return endpoints[entity] || '/api/sync';
    }
    
    startBackgroundSync() {
        if (this.syncIntervalId) {
            clearInterval(this.syncIntervalId);
        }
        
        this.syncIntervalId = setInterval(() => {
            if (navigator.onLine && this.syncQueue.length > 0 && !this.isSyncing) {
                this.attemptSync();
            }
        }, this.syncInterval);
    }
    
    stopBackgroundSync() {
        if (this.syncIntervalId) {
            clearInterval(this.syncIntervalId);
            this.syncIntervalId = null;
        }
    }
    
    getDeviceId() {
        let deviceId = localStorage.getItem('device_id');
        if (!deviceId) {
            deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            localStorage.setItem('device_id', deviceId);
        }
        return deviceId;
    }
    
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    notifyListeners(event, data) {
        this.syncListeners.forEach(listener => {
            try {
                listener(event, data);
            } catch (error) {
                console.error('Error in sync listener:', error);
            }
        });
        
        // Dispatch custom event
        const customEvent = new CustomEvent(`sync-${event}`, { detail: data });
        document.dispatchEvent(customEvent);
    }
    
    addListener(listener) {
        if (typeof listener === 'function') {
            this.syncListeners.push(listener);
        }
    }
    
    removeListener(listener) {
        const index = this.syncListeners.indexOf(listener);
        if (index !== -1) {
            this.syncListeners.splice(index, 1);
        }
    }
    
    updateUIAfterSync(successful, failed) {
        // Update sync badge if exists
        const syncBadge = document.querySelector('.sync-badge');
        if (syncBadge) {
            const remaining = this.syncQueue.length;
            if (remaining > 0) {
                syncBadge.textContent = remaining > 99 ? '99+' : remaining;
                syncBadge.style.display = 'flex';
            } else {
                syncBadge.style.display = 'none';
            }
        }
        
        // Show notification if needed
        if (successful > 0 || failed > 0) {
            this.showSyncNotification(successful, failed);
        }
        
        // Update offline indicator
        const offlineIndicator = document.querySelector('.offline-indicator');
        if (offlineIndicator) {
            const syncCount = offlineIndicator.querySelector('.sync-count');
            if (syncCount) {
                const remaining = this.syncQueue.length;
                syncCount.textContent = remaining > 0 ? `${remaining} pending` : '';
                syncCount.style.display = remaining > 0 ? 'block' : 'none';
            }
        }
    }
    
    showSyncNotification(successful, failed) {
        if (!('Notification' in window) || Notification.permission !== 'granted') {
            return;
        }
        
        let title, body;
        
        if (successful > 0 && failed === 0) {
            title = 'Sync Successful';
            body = `${successful} items synced successfully`;
        } else if (successful > 0 && failed > 0) {
            title = 'Sync Partially Complete';
            body = `${successful} items synced, ${failed} failed`;
        } else if (failed > 0) {
            title = 'Sync Failed';
            body = `${failed} items failed to sync`;
        } else {
            return; // Nothing to notify
        }
        
        const notification = new Notification(title, {
            body: body,
            icon: '/farm-pwa/icon-192.png',
            tag: 'sync-notification',
            silent: true
        });
        
        // Auto-close after 5 seconds
        setTimeout(() => notification.close(), 5000);
    }
    
    // Public methods
    getSyncStatus() {
        return {
            isSyncing: this.isSyncing,
            queueSize: this.syncQueue.length,
            failedItems: this.failedItems.length,
            lastSyncTime: this.lastSyncTime,
            isOnline: navigator.onLine
        };
    }
    
    async retryFailedItems() {
        if (this.failedItems.length === 0) {
            return { retried: 0 };
        }
        
        // Move failed items back to queue
        this.syncQueue = [...this.syncQueue, ...this.failedItems];
        this.failedItems = [];
        
        // Attempt sync
        if (navigator.onLine) {
            return this.attemptSync();
        }
        
        return { retried: this.syncQueue.length };
    }
    
    clearFailedItems() {
        const count = this.failedItems.length;
        this.failedItems = [];
        return count;
    }
    
    async forceSync() {
        if (this.isSyncing) {
            console.log('Sync already in progress');
            return;
        }
        
        console.log('Force syncing...');
        return this.attemptSync();
    }
    
    setAuthToken(token) {
        this.authToken = token;
        localStorage.setItem('auth_token', token);
    }
    
    setUserId(userId) {
        this.userId = userId;
        localStorage.setItem('user_id', userId);
    }
    
    // Conflict resolution
    async resolveConflict(localItem, serverItem) {
        // Simple conflict resolution: server wins
        console.log('Resolving conflict:', { local: localItem, server: serverItem });
        
        // Update local item with server data
        const resolvedItem = {
            ...localItem,
            data: serverItem.data,
            conflictResolved: true,
            resolution: 'server-wins',
            resolvedAt: new Date().toISOString()
        };
        
        // Save resolved item
        if (this.offlineDb) {
            await this.offlineDb.put('sync_queue', resolvedItem);
        }
        
        return resolvedItem;
    }
    
    // Backup and restore
    async createBackup() {
        const backup = {
            type: 'farm_sync_backup',
            version: '1.0',
            created: new Date().toISOString(),
            syncQueue: this.syncQueue,
            failedItems: this.failedItems,
            lastSyncTime: this.lastSyncTime,
            settings: {
                syncInterval: this.syncInterval,
                maxRetries: this.maxRetries,
                batchSize: this.batchSize
            }
        };
        
        // Create download
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `farm_sync_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        return backup;
    }
    
    async restoreBackup(backupData) {
        if (typeof backupData === 'string') {
            backupData = JSON.parse(backupData);
        }
        
        if (backupData.type !== 'farm_sync_backup') {
            throw new Error('Invalid backup format');
        }
        
        // Restore data
        this.syncQueue = backupData.syncQueue || [];
        this.failedItems = backupData.failedItems || [];
        this.lastSyncTime = backupData.lastSyncTime ? new Date(backupData.lastSyncTime) : null;
        
        // Update settings
        if (backupData.settings) {
            this.syncInterval = backupData.settings.syncInterval || this.syncInterval;
            this.maxRetries = backupData.settings.maxRetries || this.maxRetries;
            this.batchSize = backupData.settings.batchSize || this.batchSize;
        }
        
        console.log('Sync backup restored:', {
            queueSize: this.syncQueue.length,
            failedItems: this.failedItems.length
        });
        
        return true;
    }
    
    // Cleanup
    destroy() {
        this.stopBackgroundSync();
        this.syncListeners = [];
        
        // Remove event listeners
        window.removeEventListener('online', this.attemptSync);
        window.removeEventListener('offline', this.stopBackgroundSync);
    }
}

// Singleton instance
let syncServiceInstance = null;

export function getSyncService(config = {}) {
    if (!syncServiceInstance) {
        syncServiceInstance = new SyncService(config);
    }
    return syncServiceInstance;
}

export default SyncService;