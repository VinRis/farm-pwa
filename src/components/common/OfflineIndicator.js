import './OfflineIndicator.css';

class OfflineIndicator {
    constructor(config = {}) {
        this.isOnline = navigator.onLine;
        this.syncing = false;
        this.pendingSyncs = config.pendingSyncs || 0;
        this.showActions = config.showActions !== false;
        this.onRetry = config.onRetry || (() => {});
        this.onViewQueue = config.onViewQueue || (() => {});
        
        this.init();
    }
    
    init() {
        console.log('OfflineIndicator initialized');
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Listen for online/offline events
        window.addEventListener('online', () => this.setOnline(true));
        window.addEventListener('offline', () => this.setOnline(false));
        
        // Listen for custom sync events
        document.addEventListener('sync-started', () => this.setSyncing(true));
        document.addEventListener('sync-completed', () => this.setSyncing(false));
        document.addEventListener('sync-failed', () => this.setSyncing(false));
        
        // Listen for sync queue updates
        document.addEventListener('sync-queue-updated', (e) => {
            this.setPendingSyncs(e.detail.count || 0);
        });
    }
    
    setOnline(status) {
        this.isOnline = status;
        this.updateIndicator();
        
        // Trigger sync when coming online
        if (status && this.pendingSyncs > 0) {
            this.triggerAutoSync();
        }
    }
    
    setSyncing(status) {
        this.syncing = status;
        this.updateIndicator();
    }
    
    setPendingSyncs(count) {
        this.pendingSyncs = count;
        this.updateIndicator();
    }
    
    updateIndicator() {
        const indicator = document.querySelector('.offline-indicator');
        if (!indicator) return;
        
        // Update classes based on state
        indicator.classList.remove('online', 'offline', 'syncing');
        
        if (this.syncing) {
            indicator.classList.add('syncing');
        } else if (this.isOnline) {
            indicator.classList.add('online');
        } else {
            indicator.classList.add('offline');
        }
        
        // Update text and icons
        const dot = indicator.querySelector('.indicator-dot');
        const text = indicator.querySelector('.indicator-text');
        const syncCount = indicator.querySelector('.sync-count');
        const progressFill = indicator.querySelector('.sync-progress-fill');
        
        if (dot) {
            dot.className = 'indicator-dot';
            dot.classList.add(this.syncing ? 'syncing' : this.isOnline ? 'online' : 'offline');
        }
        
        if (text) {
            text.textContent = this.syncing ? 'Syncing...' : this.isOnline ? 'Online' : 'Offline';
            text.className = 'indicator-text';
            text.classList.add(this.syncing ? 'syncing' : this.isOnline ? 'online' : 'offline');
        }
        
        if (syncCount) {
            syncCount.textContent = this.pendingSyncs > 0 ? `${this.pendingSyncs} pending` : '';
            syncCount.style.display = this.pendingSyncs > 0 ? 'block' : 'none';
        }
        
        if (progressFill) {
            if (this.syncing) {
                progressFill.style.width = '100%';
            } else {
                progressFill.style.width = '0%';
            }
        }
        
        // Update action buttons visibility
        const actions = indicator.querySelector('.offline-actions');
        if (actions) {
            actions.style.display = (!this.isOnline || this.pendingSyncs > 0) && this.showActions ? 'flex' : 'none';
        }
    }
    
    triggerAutoSync() {
        if (this.isOnline && this.pendingSyncs > 0 && !this.syncing) {
            console.log('Auto-syncing pending changes...');
            this.setSyncing(true);
            
            // Simulate sync process
            setTimeout(() => {
                this.setSyncing(false);
                this.setPendingSyncs(0);
                this.showNotification('Sync completed successfully!', 'success');
            }, 2000);
        }
    }
    
    handleRetry() {
        console.log('Retrying sync...');
        this.setSyncing(true);
        this.onRetry();
        
        // Simulate retry
        setTimeout(() => {
            this.setSyncing(false);
            if (this.isOnline) {
                this.setPendingSyncs(0);
                this.showNotification('Sync retry successful!', 'success');
            }
        }, 1500);
    }
    
    handleViewQueue() {
        console.log('Viewing sync queue...');
        this.onViewQueue();
    }
    
    showNotification(message, type = 'info') {
        // Create notification
        const notification = document.createElement('div');
        notification.className = `offline-notification notification-${type}`;
        notification.innerHTML = `
            <span class="notification-icon">${type === 'success' ? '✅' : '⚠️'}</span>
            <span class="notification-message">${message}</span>
        `;
        
        // Style the notification
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: white;
            padding: 12px 16px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            display: flex;
            align-items: center;
            gap: 8px;
            z-index: 2000;
            animation: slide-in 0.3s ease;
            border-left: 4px solid ${type === 'success' ? '#4CAF50' : '#FF9800'};
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
    
    render() {
        const indicator = document.createElement('div');
        indicator.className = `offline-indicator ${this.syncing ? 'syncing' : this.isOnline ? 'online' : 'offline'}`;
        indicator.setAttribute('role', 'status');
        indicator.setAttribute('aria-live', 'polite');
        
        indicator.innerHTML = `
            <div class="sync-progress">
                <span class="indicator-dot ${this.syncing ? 'syncing' : this.isOnline ? 'online' : 'offline'}"></span>
                <span class="indicator-text ${this.syncing ? 'syncing' : this.isOnline ? 'online' : 'offline'}">
                    ${this.syncing ? 'Syncing...' : this.isOnline ? 'Online' : 'Offline'}
                </span>
                ${this.pendingSyncs > 0 ? `
                    <div class="sync-progress-bar">
                        <div class="sync-progress-fill"></div>
                    </div>
                    <span class="sync-count">${this.pendingSyncs} pending</span>
                ` : ''}
            </div>
            
            ${this.showActions ? `
                <div class="offline-actions" style="display: ${(!this.isOnline || this.pendingSyncs > 0) ? 'flex' : 'none'}">
                    ${!this.isOnline ? `
                        <button class="offline-action-btn retry" aria-label="Retry connection">
                            <span>↻</span> Retry
                        </button>
                    ` : ''}
                    ${this.pendingSyncs > 0 ? `
                        <button class="offline-action-btn view-queue" aria-label="View sync queue">
                            <span>📋</span> View Queue
                        </button>
                    ` : ''}
                </div>
            ` : ''}
            
            <div class="offline-tooltip">
                ${this.isOnline ? 
                    'You are connected to the internet' : 
                    'You are offline. Changes will sync when connected'
                }
                ${this.pendingSyncs > 0 ? ` • ${this.pendingSyncs} changes pending sync` : ''}
            </div>
        `;
        
        // Add event listeners to action buttons
        if (this.showActions) {
            const retryBtn = indicator.querySelector('.retry');
            const viewQueueBtn = indicator.querySelector('.view-queue');
            
            if (retryBtn) {
                retryBtn.addEventListener('click', () => this.handleRetry());
            }
            
            if (viewQueueBtn) {
                viewQueueBtn.addEventListener('click', () => this.handleViewQueue());
            }
        }
        
        return indicator;
    }
    
    // Public methods
    show() {
        const indicator = document.querySelector('.offline-indicator');
        if (indicator) {
            indicator.style.display = 'flex';
            indicator.style.opacity = '1';
            indicator.style.transform = 'translateY(0)';
        }
    }
    
    hide() {
        const indicator = document.querySelector('.offline-indicator');
        if (indicator) {
            indicator.style.opacity = '0';
            indicator.style.transform = 'translateY(-10px)';
            setTimeout(() => {
                indicator.style.display = 'none';
            }, 300);
        }
    }
    
    updateStatus(online, syncing = false, pending = 0) {
        this.setOnline(online);
        this.setSyncing(syncing);
        this.setPendingSyncs(pending);
    }
    
    getStatus() {
        return {
            online: this.isOnline,
            syncing: this.syncing,
            pendingSyncs: this.pendingSyncs
        };
    }
}

export default OfflineIndicator;