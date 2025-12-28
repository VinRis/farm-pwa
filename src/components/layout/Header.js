import './Header.css';

class Header {
    constructor(config = {}) {
        this.title = config.title || 'Farm Manager Pro';
        this.showLivestockSwitch = config.showLivestockSwitch !== false;
        this.showOfflineIndicator = config.showOfflineIndicator !== false;
        this.showSyncManager = config.showSyncManager !== false;
        this.currentMode = config.currentMode || 'dairy';
        this.onModeSwitch = config.onModeSwitch || (() => {});
        this.onMenuClick = config.onMenuClick || (() => {});
        
        this.init();
    }
    
    init() {
        console.log('Header initialized');
    }
    
    setTitle(title) {
        this.title = title;
        this.updateTitle();
    }
    
    setCurrentMode(mode) {
        this.currentMode = mode;
        this.updateModeIndicator();
    }
    
    updateTitle() {
        const titleElement = document.querySelector('.header-title');
        if (titleElement) {
            titleElement.textContent = this.title;
        }
    }
    
    updateModeIndicator() {
        const modeIndicator = document.querySelector('.mode-indicator');
        if (modeIndicator) {
            modeIndicator.textContent = this.currentMode === 'dairy' ? '🐄 Dairy' : '🐔 Poultry';
            modeIndicator.className = `mode-indicator ${this.currentMode}`;
        }
    }
    
    handleModeSwitch() {
        const newMode = this.currentMode === 'dairy' ? 'poultry' : 'dairy';
        console.log(`Switching to ${newMode} mode`);
        
        // Update UI
        this.setCurrentMode(newMode);
        
        // Call callback
        this.onModeSwitch(newMode);
    }
    
    handleMenuClick() {
        console.log('Menu button clicked');
        this.onMenuClick();
    }
    
    handleSyncClick() {
        console.log('Sync button clicked');
        // Dispatch event for SyncManager to handle
        document.dispatchEvent(new CustomEvent('open-sync-manager'));
    }
    
    render() {
        const header = document.createElement('header');
        header.className = 'app-header';
        header.setAttribute('role', 'banner');
        
        header.innerHTML = `
            <div class="header-container">
                <div class="header-left">
                    <button class="menu-button" aria-label="Open menu" aria-expanded="false">
                        <span class="menu-icon">☰</span>
                    </button>
                    <div class="header-brand">
                        <div class="header-logo" aria-hidden="true">🚜</div>
                        <h1 class="header-title">${this.title}</h1>
                    </div>
                </div>
                
                <div class="header-center">
                    ${this.showLivestockSwitch ? `
                        <div class="mode-switch-container">
                            <button class="mode-switch-button" aria-label="Switch between dairy and poultry mode">
                                <span class="mode-indicator ${this.currentMode}">
                                    ${this.currentMode === 'dairy' ? '🐄 Dairy' : '🐔 Poultry'}
                                </span>
                                <span class="mode-switch-icon">↻</span>
                            </button>
                        </div>
                    ` : ''}
                </div>
                
                <div class="header-right">
                    ${this.showOfflineIndicator ? `
                        <div class="header-indicator" id="offline-indicator-placeholder"></div>
                    ` : ''}
                    
                    ${this.showSyncManager ? `
                        <button class="sync-button" aria-label="Open sync manager">
                            <span class="sync-icon">🔄</span>
                            <span class="sync-badge" style="display: none;">0</span>
                        </button>
                    ` : ''}
                    
                    <button class="profile-button" aria-label="Open profile menu">
                        <span class="profile-icon">👤</span>
                    </button>
                </div>
            </div>
            
            ${this.showLivestockSwitch ? `
                <div class="mode-switch-dropdown" style="display: none;">
                    <button class="mode-option ${this.currentMode === 'dairy' ? 'active' : ''}" data-mode="dairy">
                        <span class="mode-icon">🐄</span>
                        <span class="mode-text">Dairy Farm</span>
                        ${this.currentMode === 'dairy' ? '<span class="mode-check">✓</span>' : ''}
                    </button>
                    <button class="mode-option ${this.currentMode === 'poultry' ? 'active' : ''}" data-mode="poultry">
                        <span class="mode-icon">🐔</span>
                        <span class="mode-text">Poultry Farm</span>
                        ${this.currentMode === 'poultry' ? '<span class="mode-check">✓</span>' : ''}
                    </button>
                </div>
            ` : ''}
            
            <div class="profile-dropdown" style="display: none;">
                <div class="profile-info">
                    <div class="profile-avatar">👤</div>
                    <div class="profile-details">
                        <div class="profile-name">Farm User</div>
                        <div class="profile-email">user@example.com</div>
                    </div>
                </div>
                <div class="profile-menu">
                    <button class="profile-menu-item">
                        <span class="menu-icon">⚙️</span>
                        <span class="menu-text">Settings</span>
                    </button>
                    <button class="profile-menu-item">
                        <span class="menu-icon">📊</span>
                        <span class="menu-text">Reports</span>
                    </button>
                    <button class="profile-menu-item">
                        <span class="menu-icon">📤</span>
                        <span class="menu-text">Export Data</span>
                    </button>
                    <button class="profile-menu-item">
                        <span class="menu-icon">❓</span>
                        <span class="menu-text">Help & Support</span>
                    </button>
                    <div class="profile-menu-divider"></div>
                    <button class="profile-menu-item logout">
                        <span class="menu-icon">🚪</span>
                        <span class="menu-text">Log Out</span>
                    </button>
                </div>
            </div>
        `;
        
        // Add event listeners
        const menuButton = header.querySelector('.menu-button');
        if (menuButton) {
            menuButton.addEventListener('click', () => this.handleMenuClick());
        }
        
        const modeSwitchButton = header.querySelector('.mode-switch-button');
        if (modeSwitchButton) {
            modeSwitchButton.addEventListener('click', () => this.handleModeSwitch());
            
            // Long press for dropdown
            let longPressTimer;
            modeSwitchButton.addEventListener('mousedown', () => {
                longPressTimer = setTimeout(() => {
                    this.showModeDropdown();
                }, 1000);
            });
            
            modeSwitchButton.addEventListener('mouseup', () => {
                clearTimeout(longPressTimer);
            });
            
            modeSwitchButton.addEventListener('mouseleave', () => {
                clearTimeout(longPressTimer);
            });
            
            // Touch events for mobile
            modeSwitchButton.addEventListener('touchstart', () => {
                longPressTimer = setTimeout(() => {
                    this.showModeDropdown();
                }, 1000);
            });
            
            modeSwitchButton.addEventListener('touchend', () => {
                clearTimeout(longPressTimer);
            });
        }
        
        const syncButton = header.querySelector('.sync-button');
        if (syncButton) {
            syncButton.addEventListener('click', () => this.handleSyncClick());
        }
        
        const profileButton = header.querySelector('.profile-button');
        if (profileButton) {
            profileButton.addEventListener('click', () => this.toggleProfileDropdown());
        }
        
        // Mode dropdown options
        const modeOptions = header.querySelectorAll('.mode-option');
        modeOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                const mode = e.currentTarget.dataset.mode;
                this.setCurrentMode(mode);
                this.onModeSwitch(mode);
                this.hideModeDropdown();
            });
        });
        
        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            if (!header.contains(e.target)) {
                this.hideModeDropdown();
                this.hideProfileDropdown();
            }
        });
        
        // Listen for sync queue updates
        if (this.showSyncManager) {
            document.addEventListener('sync-queue-updated', (e) => {
                this.updateSyncBadge(e.detail.count || 0);
            });
        }
        
        return header;
    }
    
    showModeDropdown() {
        const dropdown = document.querySelector('.mode-switch-dropdown');
        if (dropdown) {
            dropdown.style.display = 'block';
            setTimeout(() => {
                dropdown.style.opacity = '1';
                dropdown.style.transform = 'translateY(0)';
            }, 10);
        }
    }
    
    hideModeDropdown() {
        const dropdown = document.querySelector('.mode-switch-dropdown');
        if (dropdown) {
            dropdown.style.opacity = '0';
            dropdown.style.transform = 'translateY(-10px)';
            setTimeout(() => {
                dropdown.style.display = 'none';
            }, 300);
        }
    }
    
    toggleProfileDropdown() {
        const dropdown = document.querySelector('.profile-dropdown');
        if (dropdown) {
            if (dropdown.style.display === 'none' || dropdown.style.display === '') {
                dropdown.style.display = 'block';
                setTimeout(() => {
                    dropdown.style.opacity = '1';
                    dropdown.style.transform = 'translateY(0)';
                }, 10);
            } else {
                this.hideProfileDropdown();
            }
        }
    }
    
    hideProfileDropdown() {
        const dropdown = document.querySelector('.profile-dropdown');
        if (dropdown) {
            dropdown.style.opacity = '0';
            dropdown.style.transform = 'translateY(-10px)';
            setTimeout(() => {
                dropdown.style.display = 'none';
            }, 300);
        }
    }
    
    updateSyncBadge(count) {
        const syncBadge = document.querySelector('.sync-badge');
        if (syncBadge) {
            if (count > 0) {
                syncBadge.textContent = count > 99 ? '99+' : count;
                syncBadge.style.display = 'flex';
                syncBadge.classList.add('has-items');
            } else {
                syncBadge.style.display = 'none';
                syncBadge.classList.remove('has-items');
            }
        }
    }
    
    // Public methods
    setOfflineIndicator(indicatorElement) {
        const placeholder = document.getElementById('offline-indicator-placeholder');
        if (placeholder && indicatorElement) {
            placeholder.innerHTML = '';
            placeholder.appendChild(indicatorElement);
        }
    }
    
    updateHeader(config) {
        if (config.title !== undefined) {
            this.setTitle(config.title);
        }
        
        if (config.currentMode !== undefined) {
            this.setCurrentMode(config.currentMode);
        }
    }
    
    getCurrentMode() {
        return this.currentMode;
    }
}

export default Header;