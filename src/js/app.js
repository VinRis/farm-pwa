// Farm Manager PWA - Main Application
import '../styles/colors.css';
import '../styles/mobile-first.css';
import '../styles/main.css';

// Import components
import LivestockSwitch from '../components/livestock/LivestockSwitch.js';
import DairyDashboard from '../components/livestock/DairyDashboard.js';
import PoultryDashboard from '../components/livestock/PoultryDashboard.js';
import OfflineIndicator from '../components/common/OfflineIndicator.js';
import BottomNavigation from '../components/common/BottomNavigation.js';

class FarmManagerApp {
    constructor() {
        this.currentMode = 'dairy'; // 'dairy' or 'poultry'
        this.currentView = 'dashboard';
        this.offlineData = {};
        this.syncQueue = [];
        
        // Initialize app
        this.init();
    }
    
    async init() {
        console.log('Initializing Farm Manager PWA...');
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            await new Promise(resolve => {
                document.addEventListener('DOMContentLoaded', resolve);
            });
        }
        
        // Initialize components
        this.initComponents();
        
        // Load saved data
        await this.loadSavedData();
        
        // Check network status
        this.initNetworkListeners();
        
        // Initialize service worker if not already done
        this.initServiceWorker();
        
        // Render initial view
        this.render();
        
        console.log('Farm Manager PWA initialized successfully');
    }
    
    initComponents() {
        // Create main app structure
        const appContainer = document.getElementById('app');
        appContainer.innerHTML = '';
        
        // Create header
        const header = document.createElement('header');
        header.className = 'app-header';
        header.innerHTML = `
            <div class="header-content">
                <div class="app-title">
                    <div class="app-logo">🚜</div>
                    <h1>Farm Manager Pro</h1>
                </div>
                <div id="offline-indicator-container"></div>
            </div>
        `;
        appContainer.appendChild(header);
        
        // Create main content area
        const mainContent = document.createElement('main');
        mainContent.className = 'main-content';
        mainContent.id = 'main-content';
        appContainer.appendChild(mainContent);
        
        // Create bottom navigation
        const bottomNav = document.createElement('nav');
        bottomNav.className = 'bottom-nav';
        bottomNav.id = 'bottom-nav';
        appContainer.appendChild(bottomNav);
        
        // Initialize Offline Indicator
        this.offlineIndicator = new OfflineIndicator();
        document.getElementById('offline-indicator-container').appendChild(
            this.offlineIndicator.render()
        );
        
        // Initialize Bottom Navigation
        this.bottomNavigation = new BottomNavigation({
            onTabChange: (tab) => this.handleTabChange(tab)
        });
        document.getElementById('bottom-nav').appendChild(
            this.bottomNavigation.render()
        );
        
        // Initialize Livestock Switch
        this.livestockSwitch = new LivestockSwitch({
            currentMode: this.currentMode,
            onSwitch: (mode) => this.handleLivestockSwitch(mode)
        });
    }
    
    async loadSavedData() {
        try {
            // Try to load from localStorage first
            const savedMode = localStorage.getItem('farm_manager_mode');
            if (savedMode) {
                this.currentMode = savedMode;
            }
            
            // Load offline data from IndexedDB
            if (typeof offlineDb !== 'undefined') {
                await offlineDb.init();
                const dairyData = await offlineDb.getAll('dairy_cows');
                const poultryData = await offlineDb.getAll('poultry_flocks');
                
                this.offlineData = {
                    dairy: dairyData || [],
                    poultry: poultryData || []
                };
            }
            
            // Load sync queue
            const savedQueue = localStorage.getItem('sync_queue');
            if (savedQueue) {
                this.syncQueue = JSON.parse(savedQueue);
            }
        } catch (error) {
            console.error('Error loading saved data:', error);
        }
    }
    
    initNetworkListeners() {
        // Listen for online/offline events
        window.addEventListener('online', () => {
            console.log('App is online');
            this.offlineIndicator.setOnline(true);
            this.processSyncQueue();
        });
        
        window.addEventListener('offline', () => {
            console.log('App is offline');
            this.offlineIndicator.setOnline(false);
        });
        
        // Initial network status check
        this.offlineIndicator.setOnline(navigator.onLine);
    }
    
    initServiceWorker() {
        // Service worker is already registered in index.html
        // Additional service worker messaging can be set up here
        
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            // Set up message channel with service worker
            navigator.serviceWorker.addEventListener('message', event => {
                this.handleServiceWorkerMessage(event.data);
            });
        }
    }
    
    handleServiceWorkerMessage(message) {
        switch (message.type) {
            case 'SYNC_COMPLETE':
                console.log('Background sync complete:', message.data);
                this.showNotification('Data Synced', 'Your farm data has been synchronized');
                break;
                
            case 'PUSH_NOTIFICATION':
                this.showNotification(message.data.title, message.data.body);
                break;
                
            case 'CACHE_UPDATED':
                console.log('Cache updated, new version available');
                this.showUpdateNotification();
                break;
        }
    }
    
    handleLivestockSwitch(mode) {
        console.log(`Switching to ${mode} mode`);
        this.currentMode = mode;
        localStorage.setItem('farm_manager_mode', mode);
        this.render();
    }
    
    handleTabChange(tab) {
        console.log(`Changing to ${tab} tab`);
        this.currentView = tab;
        this.render();
    }
    
    async processSyncQueue() {
        if (this.syncQueue.length === 0 || !navigator.onLine) {
            return;
        }
        
        console.log(`Processing ${this.syncQueue.length} items in sync queue`);
        
        try {
            for (const item of this.syncQueue) {
                await this.syncDataItem(item);
            }
            
            // Clear sync queue
            this.syncQueue = [];
            localStorage.removeItem('sync_queue');
            
            console.log('Sync queue processed successfully');
        } catch (error) {
            console.error('Error processing sync queue:', error);
        }
    }
    
    async syncDataItem(item) {
        // Simulate API call
        return new Promise((resolve) => {
            setTimeout(() => {
                console.log('Synced item:', item);
                resolve();
            }, 500);
        });
    }
    
    render() {
        const mainContent = document.getElementById('main-content');
        
        // Clear previous content
        mainContent.innerHTML = '';
        
        // Render livestock switch
        const switchContainer = document.createElement('div');
        switchContainer.id = 'livestock-switch-container';
        switchContainer.appendChild(this.livestockSwitch.render(this.currentMode));
        mainContent.appendChild(switchContainer);
        
        // Render current dashboard based on mode
        const dashboardContainer = document.createElement('div');
        dashboardContainer.id = 'dashboard-container';
        
        if (this.currentMode === 'dairy') {
            const dairyDashboard = new DairyDashboard({
                data: this.offlineData.dairy,
                onDataUpdate: (data) => this.handleDataUpdate('dairy', data)
            });
            dashboardContainer.appendChild(dairyDashboard.render());
        } else {
            const poultryDashboard = new PoultryDashboard({
                data: this.offlineData.poultry,
                onDataUpdate: (data) => this.handleDataUpdate('poultry', data)
            });
            dashboardContainer.appendChild(poultryDashboard.render());
        }
        
        mainContent.appendChild(dashboardContainer);
        
        // Update bottom navigation active state
        this.bottomNavigation.setActiveTab(this.currentView);
    }
    
    handleDataUpdate(type, data) {
        console.log(`${type} data updated:`, data);
        
        // Update local data
        this.offlineData[type] = data;
        
        // Save to IndexedDB
        if (typeof offlineDb !== 'undefined') {
            const storeName = type === 'dairy' ? 'dairy_cows' : 'poultry_flocks';
            offlineDb.put(storeName, data);
        }
        
        // Add to sync queue if offline
        if (!navigator.onLine) {
            this.syncQueue.push({
                type: type,
                data: data,
                timestamp: new Date().toISOString()
            });
            localStorage.setItem('sync_queue', JSON.stringify(this.syncQueue));
        }
    }
    
    showNotification(title, body) {
        // Check if notifications are supported and permitted
        if (!('Notification' in window) || Notification.permission !== 'granted') {
            return;
        }
        
        new Notification(title, {
            body: body,
            icon: '/farm-pwa/icon-192.png'
        });
    }
    
    showUpdateNotification() {
        if ('serviceWorker' in navigator) {
            const notification = document.createElement('div');
            notification.className = 'alert alert-info';
            notification.innerHTML = `
                <strong>Update Available!</strong>
                <p>A new version of Farm Manager is available.</p>
                <button class="btn btn-sm btn-primary" onclick="window.location.reload()">
                    Reload to Update
                </button>
            `;
            
            document.getElementById('main-content').prepend(notification);
        }
    }
    
    // Public methods for external access
    switchToDairy() {
        this.handleLivestockSwitch('dairy');
    }
    
    switchToPoultry() {
        this.handleLivestockSwitch('poultry');
    }
    
    getCurrentData() {
        return {
            mode: this.currentMode,
            view: this.currentView,
            data: this.offlineData[this.currentMode],
            online: navigator.onLine
        };
    }
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Create global app instance
    window.farmManagerApp = new FarmManagerApp();
    
    // Make app accessible via console for debugging
    console.log('Farm Manager App initialized. Access via window.farmManagerApp');
    
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
    
    // Register beforeinstallprompt for PWA installation
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        window.deferredPrompt = e;
        
        // Show install button if not running in standalone mode
        if (!window.matchMedia('(display-mode: standalone)').matches) {
            showInstallPromotion();
        }
    });
});

// Install promotion function
function showInstallPromotion() {
    const installPrompt = document.createElement('div');
    installPrompt.className = 'alert alert-info';
    installPrompt.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
                <strong>Install Farm Manager Pro</strong>
                <p style="margin: 4px 0 0 0; font-size: 14px;">Get the full app experience</p>
            </div>
            <button class="btn btn-sm btn-primary" onclick="installPWA()">
                Install
            </button>
        </div>
    `;
    
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
        mainContent.prepend(installPrompt);
    }
}

// Global PWA installation function
window.installPWA = async function() {
    if (!window.deferredPrompt) {
        return;
    }
    
    const result = await window.deferredPrompt.prompt();
    console.log(`Install prompt was: ${result.outcome}`);
    
    window.deferredPrompt = null;
    
    // Remove install promotion
    const installPrompt = document.querySelector('.alert-info');
    if (installPrompt) {
        installPrompt.remove();
    }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FarmManagerApp;
}