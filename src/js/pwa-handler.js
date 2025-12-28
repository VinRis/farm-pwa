// PWA Installation and Service Worker Handler

class PWAHandler {
    constructor() {
        this.deferredPrompt = null;
        this.isInstalled = false;
        this.isStandalone = window.matchMedia('(display-mode: standalone)').matches;
        this.serviceWorkerRegistration = null;
        
        this.init();
    }
    
    async init() {
        console.log('PWAHandler initialized');
        
        // Check if app is already installed
        this.checkInstallStatus();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Register service worker
        await this.registerServiceWorker();
        
        // Check for updates
        this.checkForUpdates();
    }
    
    setupEventListeners() {
        // Before install prompt
        window.addEventListener('beforeinstallprompt', (e) => {
            console.log('beforeinstallprompt event fired');
            e.preventDefault();
            this.deferredPrompt = e;
            this.showInstallPromotion();
        });
        
        // App installed
        window.addEventListener('appinstalled', () => {
            console.log('PWA installed successfully');
            this.isInstalled = true;
            this.hideInstallPromotion();
            this.showInstallationSuccess();
        });
        
        // Display mode changes
        window.matchMedia('(display-mode: standalone)').addEventListener('change', (e) => {
            this.isStandalone = e.matches;
            console.log(`Display mode changed to: ${this.isStandalone ? 'standalone' : 'browser'}`);
        });
        
        // Service worker events
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            console.log('Service worker controller changed');
            this.showUpdateNotification();
        });
        
        // Online/offline events
        window.addEventListener('online', this.handleOnlineStatus.bind(this));
        window.addEventListener('offline', this.handleOfflineStatus.bind(this));
        
        // Visibility change (for background sync)
        document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
        
        // Periodic sync (if supported)
        if ('periodicSync' in navigator && 'permissions' in navigator) {
            this.setupPeriodicSync();
        }
    }
    
    async registerServiceWorker() {
        if (!('serviceWorker' in navigator)) {
            console.log('Service workers are not supported');
            return;
        }
        
        try {
            const registration = await navigator.serviceWorker.register('/farm-pwa/service-worker.js', {
                scope: '/farm-pwa/'
            });
            
            this.serviceWorkerRegistration = registration;
            console.log('ServiceWorker registration successful with scope:', registration.scope);
            
            // Listen for updates
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                console.log('New service worker found:', newWorker.state);
                
                newWorker.addEventListener('statechange', () => {
                    console.log('Service worker state changed to:', newWorker.state);
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        this.showUpdateNotification();
                    }
                });
            });
            
        } catch (error) {
            console.error('ServiceWorker registration failed:', error);
        }
    }
    
    checkInstallStatus() {
        // Check if app is installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            this.isInstalled = true;
            console.log('App is installed as PWA');
        } else if (window.navigator.standalone) {
            this.isInstalled = true;
            console.log('App is installed on iOS');
        } else {
            this.isInstalled = false;
            console.log('App is running in browser');
        }
    }
    
    showInstallPromotion() {
        // Don't show if already installed or in standalone mode
        if (this.isInstalled || this.isStandalone) {
            return;
        }
        
        // Check if promotion was already shown recently
        const lastShown = localStorage.getItem('install_promotion_last_shown');
        const now = Date.now();
        
        if (lastShown && (now - parseInt(lastShown)) < 7 * 24 * 60 * 60 * 1000) {
            return; // Only show once per week
        }
        
        // Create install promotion
        const promotion = document.createElement('div');
        promotion.className = 'pwa-install-promotion';
        promotion.innerHTML = `
            <div class="promotion-content">
                <div class="promotion-header">
                    <span class="promotion-icon">📱</span>
                    <h3>Install Farm Manager Pro</h3>
                    <button class="promotion-close" aria-label="Close">&times;</button>
                </div>
                <div class="promotion-body">
                    <p>Get the full app experience:</p>
                    <ul>
                        <li>📲 Works offline</li>
                        <li>⚡ Faster loading</li>
                        <li>🔔 Push notifications</li>
                        <li>🏠 Home screen access</li>
                    </ul>
                </div>
                <div class="promotion-footer">
                    <button class="btn btn-secondary later-btn">Later</button>
                    <button class="btn btn-primary install-btn">Install Now</button>
                </div>
            </div>
        `;
        
        // Add styles
        promotion.style.cssText = `
            position: fixed;
            bottom: 80px;
            right: 20px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.15);
            z-index: 9999;
            max-width: 320px;
            animation: slide-up 0.3s ease;
            border: 1px solid var(--medium-gray);
        `;
        
        document.body.appendChild(promotion);
        
        // Add event listeners
        promotion.querySelector('.promotion-close').addEventListener('click', () => {
            this.hideInstallPromotion();
        });
        
        promotion.querySelector('.later-btn').addEventListener('click', () => {
            this.hideInstallPromotion();
            localStorage.setItem('install_promotion_last_shown', now.toString());
        });
        
        promotion.querySelector('.install-btn').addEventListener('click', () => {
            this.installPWA();
        });
        
        // Auto-hide after 30 seconds
        setTimeout(() => {
            if (document.body.contains(promotion)) {
                this.hideInstallPromotion();
            }
        }, 30000);
    }
    
    hideInstallPromotion() {
        const promotion = document.querySelector('.pwa-install-promotion');
        if (promotion) {
            promotion.style.opacity = '0';
            promotion.style.transform = 'translateY(20px)';
            setTimeout(() => {
                if (promotion.parentNode) {
                    promotion.parentNode.removeChild(promotion);
                }
            }, 300);
        }
    }
    
    async installPWA() {
        if (!this.deferredPrompt) {
            console.log('Install prompt not available');
            this.showManualInstallInstructions();
            return;
        }
        
        try {
            this.deferredPrompt.prompt();
            
            const choiceResult = await this.deferredPrompt.userChoice;
            console.log(`User ${choiceResult.outcome} the install prompt`);
            
            if (choiceResult.outcome === 'accepted') {
                console.log('User accepted the install');
                this.isInstalled = true;
                this.hideInstallPromotion();
            }
            
            this.deferredPrompt = null;
            
        } catch (error) {
            console.error('Error during installation:', error);
            this.showManualInstallInstructions();
        }
    }
    
    showManualInstallInstructions() {
        const instructions = document.createElement('div');
        instructions.className = 'pwa-install-instructions';
        instructions.innerHTML = `
            <div class="instructions-content">
                <h3>How to Install</h3>
                <div class="instructions-steps">
                    <div class="step">
                        <span class="step-number">1</span>
                        <span class="step-text">Tap the Share button <span style="font-size: 20px;">📤</span></span>
                    </div>
                    <div class="step">
                        <span class="step-number">2</span>
                        <span class="step-text">Select "Add to Home Screen"</span>
                    </div>
                    <div class="step">
                        <span class="step-number">3</span>
                        <span class="step-text">Tap "Add" to install</span>
                    </div>
                </div>
                <button class="btn btn-primary close-instructions">Got it</button>
            </div>
        `;
        
        document.body.appendChild(instructions);
        
        instructions.querySelector('.close-instructions').addEventListener('click', () => {
            document.body.removeChild(instructions);
        });
    }
    
    showInstallationSuccess() {
        const success = document.createElement('div');
        success.className = 'pwa-install-success';
        success.innerHTML = `
            <div class="success-content">
                <span class="success-icon">🎉</span>
                <h3>App Installed Successfully!</h3>
                <p>Farm Manager Pro is now installed on your device.</p>
                <button class="btn btn-primary close-success">Get Started</button>
            </div>
        `;
        
        document.body.appendChild(success);
        
        setTimeout(() => {
            if (success.parentNode) {
                document.body.removeChild(success);
            }
        }, 5000);
        
        success.querySelector('.close-success').addEventListener('click', () => {
            if (success.parentNode) {
                document.body.removeChild(success);
            }
        });
    }
    
    showUpdateNotification() {
        if (!this.serviceWorkerRegistration || !this.serviceWorkerRegistration.waiting) {
            return;
        }
        
        const notification = document.createElement('div');
        notification.className = 'pwa-update-notification';
        notification.innerHTML = `
            <div class="update-content">
                <span class="update-icon">🔄</span>
                <div class="update-text">
                    <strong>Update Available</strong>
                    <p>A new version is ready</p>
                </div>
                <button class="btn btn-primary update-btn">Update Now</button>
                <button class="btn btn-text later-btn">Later</button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        notification.querySelector('.update-btn').addEventListener('click', () => {
            // Tell service worker to skip waiting and activate
            this.serviceWorkerRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
            
            // Reload page
            window.location.reload();
        });
        
        notification.querySelector('.later-btn').addEventListener('click', () => {
            document.body.removeChild(notification);
        });
    }
    
    async checkForUpdates() {
        if (!this.serviceWorkerRegistration) {
            return;
        }
        
        try {
            await this.serviceWorkerRegistration.update();
            console.log('Checked for service worker updates');
        } catch (error) {
            console.error('Error checking for updates:', error);
        }
    }
    
    handleOnlineStatus() {
        console.log('App is online');
        
        // Trigger sync when coming online
        const event = new CustomEvent('app-online');
        document.dispatchEvent(event);
        
        // Show online notification
        this.showStatusNotification('Online', 'success');
    }
    
    handleOfflineStatus() {
        console.log('App is offline');
        
        // Show offline notification
        this.showStatusNotification('Offline - Working locally', 'warning');
    }
    
    handleVisibilityChange() {
        if (!document.hidden && navigator.onLine) {
            // App came to foreground and is online
            this.checkForUpdates();
            
            // Trigger sync if needed
            const event = new CustomEvent('app-foreground');
            document.dispatchEvent(event);
        }
    }
    
    async setupPeriodicSync() {
        try {
            const status = await navigator.permissions.query({
                name: 'periodic-background-sync'
            });
            
            if (status.state === 'granted') {
                if ('periodicSync' in navigator) {
                    try {
                        await navigator.periodicSync.register('farm-data-sync', {
                            minInterval: 24 * 60 * 60 * 1000 // 24 hours
                        });
                        console.log('Periodic sync registered');
                    } catch (error) {
                        console.error('Periodic sync registration failed:', error);
                    }
                }
            }
        } catch (error) {
            console.log('Periodic background sync not supported');
        }
    }
    
    showStatusNotification(message, type = 'info') {
        // Don't show notifications if app is in background
        if (document.hidden) {
            return;
        }
        
        const notification = document.createElement('div');
        notification.className = `pwa-status-notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }
    
    // Push notifications
    async requestNotificationPermission() {
        if (!('Notification' in window)) {
            console.log('Notifications not supported');
            return false;
        }
        
        if (Notification.permission === 'granted') {
            return true;
        }
        
        if (Notification.permission === 'denied') {
            console.log('Notification permission denied');
            return false;
        }
        
        try {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        } catch (error) {
            console.error('Error requesting notification permission:', error);
            return false;
        }
    }
    
    async subscribeToPushNotifications() {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            console.log('Push notifications not supported');
            return null;
        }
        
        try {
            // Request notification permission
            const permissionGranted = await this.requestNotificationPermission();
            if (!permissionGranted) {
                return null;
            }
            
            // Get service worker registration
            const registration = await navigator.serviceWorker.ready;
            
            // Subscribe to push
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: this.urlBase64ToUint8Array('BLxqCkP1v5JZ0L9Xw8T3r6Y2u1I4o7A9s2D5f8G1h3J6k9L2q4W7e0R3t6Y8u1I4o7A9s2D5f8G1h3J6k9L2')
            });
            
            console.log('Push notification subscription successful');
            return subscription;
            
        } catch (error) {
            console.error('Error subscribing to push notifications:', error);
            return null;
        }
    }
    
    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/');
        
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        
        return outputArray;
    }
    
    // Background sync
    async registerBackgroundSync() {
        if (!('serviceWorker' in navigator) || !('SyncManager' in window)) {
            console.log('Background sync not supported');
            return;
        }
        
        try {
            const registration = await navigator.serviceWorker.ready;
            await registration.sync.register('farm-data-sync');
            console.log('Background sync registered');
        } catch (error) {
            console.error('Background sync registration failed:', error);
        }
    }
    
    // App lifecycle events
    setupAppLifecycle() {
        // Page visibility
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                console.log('App went to background');
                this.saveAppState();
            } else {
                console.log('App came to foreground');
                this.restoreAppState();
            }
        });
        
        // Before unload
        window.addEventListener('beforeunload', () => {
            this.saveAppState();
        });
        
        // Page load
        window.addEventListener('load', () => {
            this.restoreAppState();
        });
    }
    
    saveAppState() {
        try {
            const state = {
                timestamp: new Date().toISOString(),
                // Add any app state you want to save
            };
            localStorage.setItem('app_state', JSON.stringify(state));
        } catch (error) {
            console.error('Error saving app state:', error);
        }
    }
    
    restoreAppState() {
        try {
            const savedState = localStorage.getItem('app_state');
            if (savedState) {
                const state = JSON.parse(savedState);
                console.log('Restored app state from:', state.timestamp);
                // Restore your app state here
            }
        } catch (error) {
            console.error('Error restoring app state:', error);
        }
    }
    
    // Public methods
    getInstallStatus() {
        return {
            isInstalled: this.isInstalled,
            isStandalone: this.isStandalone,
            canInstall: !!this.deferredPrompt
        };
    }
    
    async triggerUpdateCheck() {
        await this.checkForUpdates();
    }
    
    async triggerSync() {
        await this.registerBackgroundSync();
    }
    
    // Debug info
    getDebugInfo() {
        return {
            pwa: {
                installed: this.isInstalled,
                standalone: this.isStandalone,
                deferredPrompt: !!this.deferredPrompt
            },
            serviceWorker: {
                supported: 'serviceWorker' in navigator,
                controller: !!navigator.serviceWorker?.controller
            },
            capabilities: {
                push: 'PushManager' in window,
                sync: 'SyncManager' in window,
                periodicSync: 'periodicSync' in navigator,
                notifications: 'Notification' in window
            },
            network: {
                online: navigator.onLine,
                connection: navigator.connection?.effectiveType || 'unknown'
            }
        };
    }
}

// Create and export singleton instance
const pwaHandler = new PWAHandler();

// Make available globally for debugging
if (typeof window !== 'undefined') {
    window.pwaHandler = pwaHandler;
}

export default pwaHandler;