import './SyncManager.css';

class SyncManager {
    constructor(config = {}) {
        this.offlineDb = config.offlineDb;
        this.apiEndpoint = config.apiEndpoint || '/api/sync';
        this.syncInterval = config.syncInterval || 30000; // 30 seconds
        this.maxRetries = config.maxRetries || 3;
        this.isSyncing = false;
        this.syncQueue = [];
        this.failedSyncs = [];
        this.syncListeners = [];
        
        this.init();
    }
    
    async init() {
        console.log('SyncManager initialized');
        
        // Load existing sync queue from IndexedDB
        await this.loadSyncQueue();
        
        // Start periodic sync
        this.startPeriodicSync();
        
        // Listen for online/offline events
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        window.addEventListener('online', () => {
            console.log('Device came online, attempting sync...');
            this.attemptSync();
        });
        
        window.addEventListener('offline', () => {
            console.log('Device went offline, pausing sync...');
            this.stopPeriodicSync();
        });
        
        // Listen for custom sync events
        document.addEventListener('farm-data-updated', (e) => {
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
            timestamp: new Date().toISOString(),
            attempts: 0,
            synced: false,
            lastError: null
        };
        
        // Add to local queue
        this.syncQueue.push(syncItem);
        
        // Save to IndexedDB if available
        if (this.offlineDb) {
            try {
                await this.offlineDb.addToSyncQueue(syncItem.type, 'update', syncItem.data);
            } catch (error) {
                console.error('Failed to save sync item to IndexedDB:', error);
            }
        }
        
        // Notify listeners
        this.notifySyncListeners('queued', syncItem);
        
        // Trigger sync if online
        if (navigator.onLine && !this.isSyncing) {
            this.attemptSync();
        }
        
        console.log(`Queued item for sync: ${syncItem.id}`);
        return syncItem;
    }
    
    async attemptSync() {
        if (this.isSyncing || this.syncQueue.length === 0 || !navigator.onLine) {
            return;
        }
        
        this.isSyncing = true;
        this.notifySyncListeners('started');
        
        console.log(`Starting sync of ${this.syncQueue.length} items...`);
        
        // Process sync queue
        const successfulSyncs = [];
        const failedSyncs = [];
        
        for (const item of [...this.syncQueue]) {
            try {
                await this.syncItem(item);
                successfulSyncs.push(item);
                
                // Remove from queue
                const index = this.syncQueue.findIndex(i => i.id === item.id);
                if (index !== -1) {
                    this.syncQueue.splice(index, 1);
                }
                
                // Remove from IndexedDB if available
                if (this.offlineDb) {
                    await this.offlineDb.markAsSynced(item.id, true);
                }
                
                this.notifySyncListeners('item-synced', item);
                
            } catch (error) {
                console.error(`Failed to sync item ${item.id}:`, error);
                
                item.attempts++;
                item.lastError = error.message;
                
                if (item.attempts >= this.maxRetries) {
                    // Move to failed syncs after max retries
                    failedSyncs.push(item);
                    
                    const index = this.syncQueue.findIndex(i => i.id === item.id);
                    if (index !== -1) {
                        this.syncQueue.splice(index, 1);
                    }
                    
                    this.notifySyncListeners('item-failed', item);
                }
            }
        }
        
        // Update failed syncs list
        this.failedSyncs = [...this.failedSyncs, ...failedSyncs];
        
        this.isSyncing = false;
        
        // Notify completion
        if (successfulSyncs.length > 0 || failedSyncs.length > 0) {
            this.notifySyncListeners('completed', {
                successful: successfulSyncs.length,
                failed: failedSyncs.length,
                total: successfulSyncs.length + failedSyncs.length
            });
            
            console.log(`Sync completed: ${successfulSyncs.length} successful, ${failedSyncs.length} failed`);
            
            // Show notification
            this.showSyncNotification(successfulSyncs.length, failedSyncs.length);
        }
    }
    
    async syncItem(item) {
        return new Promise((resolve, reject) => {
            // Simulate API call
            setTimeout(() => {
                // 90% success rate for simulation
                if (Math.random() < 0.9) {
                    resolve(item);
                } else {
                    reject(new Error('Simulated sync failure'));
                }
            }, 500);
        });
        
        // In a real implementation, this would be:
        // return fetch(this.apiEndpoint, {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify(item.data)
        // }).then(response => {
        //     if (!response.ok) throw new Error(`HTTP ${response.status}`);
        //     return item;
        // });
    }
    
    startPeriodicSync() {
        if (this.syncIntervalId) {
            clearInterval(this.syncIntervalId);
        }
        
        this.syncIntervalId = setInterval(() => {
            if (navigator.onLine && this.syncQueue.length > 0) {
                this.attemptSync();
            }
        }, this.syncInterval);
    }
    
    stopPeriodicSync() {
        if (this.syncIntervalId) {
            clearInterval(this.syncIntervalId);
            this.syncIntervalId = null;
        }
    }
    
    notifySyncListeners(event, data = null) {
        this.syncListeners.forEach(listener => {
            try {
                listener(event, data);
            } catch (error) {
                console.error('Error in sync listener:', error);
            }
        });
        
        // Also dispatch custom event
        const customEvent = new CustomEvent(`sync-${event}`, {
            detail: data
        });
        document.dispatchEvent(customEvent);
    }
    
    addSyncListener(listener) {
        if (typeof listener === 'function') {
            this.syncListeners.push(listener);
        }
    }
    
    removeSyncListener(listener) {
        const index = this.syncListeners.indexOf(listener);
        if (index !== -1) {
            this.syncListeners.splice(index, 1);
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
        }
        
        if (title && body) {
            new Notification(title, {
                body: body,
                icon: '/farm-pwa/icon-192.png',
                tag: 'sync-notification'
            });
        }
    }
    
    getSyncStats() {
        return {
            queued: this.syncQueue.length,
            failed: this.failedSyncs.length,
            syncing: this.isSyncing,
            online: navigator.onLine
        };
    }
    
    retryFailedSyncs() {
        // Move failed syncs back to queue
        this.syncQueue = [...this.syncQueue, ...this.failedSyncs];
        this.failedSyncs = [];
        
        // Attempt sync
        if (navigator.onLine) {
            this.attemptSync();
        }
        
        return this.syncQueue.length;
    }
    
    clearFailedSyncs() {
        const count = this.failedSyncs.length;
        this.failedSyncs = [];
        return count;
    }
    
    render() {
        const container = document.createElement('div');
        container.className = 'sync-manager';
        container.style.display = 'none'; // Hidden by default
        
        const stats = this.getSyncStats();
        
        container.innerHTML = `
            <div class="sync-manager-header">
                <h3>Sync Manager</h3>
                <button class="sync-manager-close" aria-label="Close sync manager">×</button>
            </div>
            
            <div class="sync-stats">
                <div class="stat-item">
                    <span class="stat-label">Status:</span>
                    <span class="stat-value ${stats.syncing ? 'syncing' : stats.online ? 'online' : 'offline'}">
                        ${stats.syncing ? 'Syncing...' : stats.online ? 'Online' : 'Offline'}
                    </span>
                </div>
                
                <div class="stat-item">
                    <span class="stat-label">Queued:</span>
                    <span class="stat-value">${stats.queued}</span>
                </div>
                
                <div class="stat-item">
                    <span class="stat-label">Failed:</span>
                    <span class="stat-value">${stats.failed}</span>
                </div>
            </div>
            
            <div class="sync-actions">
                <button class="btn btn-primary sync-now" ${stats.queued === 0 || !stats.online ? 'disabled' : ''}>
                    Sync Now
                </button>
                <button class="btn btn-secondary retry-failed" ${stats.failed === 0 ? 'disabled' : ''}>
                    Retry Failed
                </button>
                <button class="btn btn-outline clear-failed" ${stats.failed === 0 ? 'disabled' : ''}>
                    Clear Failed
                </button>
            </div>
            
            ${stats.queued > 0 ? `
                <div class="sync-queue">
                    <h4>Pending Syncs (${stats.queued})</h4>
                    <div class="queue-list">
                        ${this.syncQueue.slice(0, 5).map(item => `
                            <div class="queue-item" data-id="${item.id}">
                                <span class="item-type">${item.type}</span>
                                <span class="item-time">${new Date(item.timestamp).toLocaleTimeString()}</span>
                                <span class="item-attempts">${item.attempts} attempts</span>
                            </div>
                        `).join('')}
                        ${stats.queued > 5 ? `<div class="queue-more">...and ${stats.queued - 5} more</div>` : ''}
                    </div>
                </div>
            ` : ''}
            
            ${stats.failed > 0 ? `
                <div class="failed-syncs">
                    <h4>Failed Syncs (${stats.failed})</h4>
                    <div class="failed-list">
                        ${this.failedSyncs.slice(0, 3).map(item => `
                            <div class="failed-item" data-id="${item.id}">
                                <span class="failed-type">${item.type}</span>
                                <span class="failed-error">${item.lastError || 'Unknown error'}</span>
                                <span class="failed-time">${new Date(item.timestamp).toLocaleDateString()}</span>
                            </div>
                        `).join('')}
                        ${stats.failed > 3 ? `<div class="failed-more">...and ${stats.failed - 3} more</div>` : ''}
                    </div>
                </div>
            ` : ''}
            
            <div class="sync-settings">
                <h4>Sync Settings</h4>
                <div class="setting-item">
                    <label>
                        <input type="checkbox" class="auto-sync" checked>
                        Auto-sync when online
                    </label>
                </div>
                <div class="setting-item">
                    <label>
                        Sync interval:
                        <select class="sync-interval">
                            <option value="15000">15 seconds</option>
                            <option value="30000" selected>30 seconds</option>
                            <option value="60000">1 minute</option>
                            <option value="300000">5 minutes</option>
                        </select>
                    </label>
                </div>
            </div>
        `;
        
        // Add event listeners
        container.querySelector('.sync-manager-close').addEventListener('click', () => {
            this.hide();
        });
        
        container.querySelector('.sync-now').addEventListener('click', () => {
            this.attemptSync();
        });
        
        container.querySelector('.retry-failed').addEventListener('click', () => {
            this.retryFailedSyncs();
        });
        
        container.querySelector('.clear-failed').addEventListener('click', () => {
            const cleared = this.clearFailedSyncs();
            this.showNotification(`Cleared ${cleared} failed syncs`, 'info');
            this.render(); // Re-render
        });
        
        container.querySelector('.auto-sync').addEventListener('change', (e) => {
            if (e.target.checked) {
                this.startPeriodicSync();
            } else {
                this.stopPeriodicSync();
            }
        });
        
        container.querySelector('.sync-interval').addEventListener('change', (e) => {
            this.syncInterval = parseInt(e.target.value);
            this.startPeriodicSync();
        });
        
        return container;
    }
    
    // Public methods
    show() {
        const manager = document.querySelector('.sync-manager');
        if (!manager) {
            const rendered = this.render();
            document.body.appendChild(rendered);
            rendered.style.display = 'block';
            setTimeout(() => {
                rendered.style.opacity = '1';
                rendered.style.transform = 'translateY(0)';
            }, 10);
        } else {
            manager.style.display = 'block';
            setTimeout(() => {
                manager.style.opacity = '1';
                manager.style.transform = 'translateY(0)';
            }, 10);
        }
    }
    
    hide() {
        const manager = document.querySelector('.sync-manager');
        if (manager) {
            manager.style.opacity = '0';
            manager.style.transform = 'translateY(-20px)';
            setTimeout(() => {
                manager.style.display = 'none';
            }, 300);
        }
    }
    
    showNotification(message, type = 'info') {
        // Similar to OfflineIndicator's notification
        const notification = document.createElement('div');
        notification.className = 'sync-notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            bottom: 80px;
            right: 20px;
            background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#F44336' : '#2196F3'};
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 2000;
            animation: slide-up 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(20px)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
    
    // Cleanup
    destroy() {
        this.stopPeriodicSync();
        this.syncListeners = [];
        
        // Remove event listeners
        window.removeEventListener('online', this.attemptSync);
        window.removeEventListener('offline', this.stopPeriodicSync);
        
        // Remove from DOM
        const manager = document.querySelector('.sync-manager');
        if (manager && manager.parentNode) {
            manager.parentNode.removeChild(manager);
        }
    }
}

export default SyncManager;