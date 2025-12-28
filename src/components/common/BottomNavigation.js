import './BottomNavigation.css';

class BottomNavigation {
    constructor(config = {}) {
        this.currentTab = config.currentTab || 'dashboard';
        this.onTabChange = config.onTabChange || (() => {});
        this.badges = config.badges || {};
        this.disabledTabs = config.disabledTabs || [];
        
        // Define navigation items
        this.navItems = [
            {
                id: 'dashboard',
                label: 'Dashboard',
                icon: '📊',
                description: 'Main dashboard view'
            },
            {
                id: 'animals',
                label: 'Animals',
                icon: '🐮',
                description: 'Manage livestock'
            },
            {
                id: 'health',
                label: 'Health',
                icon: '❤️',
                description: 'Health monitoring'
            },
            {
                id: 'production',
                label: 'Production',
                icon: '📈',
                description: 'Production records'
            },
            {
                id: 'more',
                label: 'More',
                icon: '⋯',
                description: 'Additional options'
            }
        ];
        
        this.init();
    }
    
    init() {
        console.log('BottomNavigation initialized');
    }
    
    setCurrentTab(tab) {
        if (this.navItems.some(item => item.id === tab)) {
            this.currentTab = tab;
            this.updateActiveTab();
        }
    }
    
    setBadge(tabId, count) {
        if (count > 0) {
            this.badges[tabId] = count;
        } else {
            delete this.badges[tabId];
        }
        this.updateBadges();
    }
    
    setDisabledTabs(tabs) {
        this.disabledTabs = tabs;
        this.updateDisabledStates();
    }
    
    updateActiveTab() {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.classList.remove('active');
            if (item.dataset.tab === this.currentTab) {
                item.classList.add('active');
                item.setAttribute('aria-current', 'page');
            } else {
                item.removeAttribute('aria-current');
            }
        });
    }
    
    updateBadges() {
        // Remove all existing badges
        document.querySelectorAll('.nav-badge').forEach(badge => badge.remove());
        
        // Add new badges
        Object.entries(this.badges).forEach(([tabId, count]) => {
            const navItem = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
            if (navItem) {
                const badge = document.createElement('span');
                badge.className = 'nav-badge';
                badge.textContent = count > 99 ? '99+' : count;
                badge.setAttribute('aria-label', `${count} notifications`);
                navItem.appendChild(badge);
            }
        });
    }
    
    updateDisabledStates() {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            const tabId = item.dataset.tab;
            if (this.disabledTabs.includes(tabId)) {
                item.classList.add('disabled');
                item.setAttribute('aria-disabled', 'true');
                item.style.pointerEvents = 'none';
            } else {
                item.classList.remove('disabled');
                item.removeAttribute('aria-disabled');
                item.style.pointerEvents = '';
            }
        });
    }
    
    handleTabClick(tabId) {
        if (this.disabledTabs.includes(tabId)) {
            return;
        }
        
        console.log(`Switching to tab: ${tabId}`);
        
        // Add click animation
        const navItem = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
        if (navItem) {
            navItem.style.transform = 'scale(0.95)';
            setTimeout(() => {
                navItem.style.transform = '';
            }, 150);
        }
        
        // Update current tab
        this.currentTab = tabId;
        this.updateActiveTab();
        
        // Call callback
        this.onTabChange(tabId);
    }
    
    handleKeyboardNav(event, tabId) {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            this.handleTabClick(tabId);
        }
    }
    
    render() {
        const nav = document.createElement('nav');
        nav.className = 'bottom-navigation';
        nav.setAttribute('role', 'navigation');
        nav.setAttribute('aria-label', 'Main navigation');
        
        const container = document.createElement('div');
        container.className = 'nav-container';
        
        this.navItems.forEach(item => {
            const isActive = item.id === this.currentTab;
            const isDisabled = this.disabledTabs.includes(item.id);
            const hasBadge = this.badges[item.id];
            
            const button = document.createElement('button');
            button.className = `nav-item ${isActive ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`;
            button.dataset.tab = item.id;
            button.setAttribute('role', 'tab');
            button.setAttribute('aria-selected', isActive);
            button.setAttribute('aria-label', item.description);
            button.setAttribute('tabindex', isDisabled ? '-1' : '0');
            
            if (isDisabled) {
                button.setAttribute('aria-disabled', 'true');
            }
            
            button.innerHTML = `
                <span class="nav-icon" aria-hidden="true">${item.icon}</span>
                <span class="nav-label">${item.label}</span>
                ${hasBadge ? `<span class="nav-badge">${hasBadge > 99 ? '99+' : hasBadge}</span>` : ''}
            `;
            
            // Add event listeners
            if (!isDisabled) {
                button.addEventListener('click', () => this.handleTabClick(item.id));
                button.addEventListener('keydown', (e) => this.handleKeyboardNav(e, item.id));
            }
            
            container.appendChild(button);
        });
        
        nav.appendChild(container);
        return nav;
    }
    
    // Public methods
    show() {
        const nav = document.querySelector('.bottom-navigation');
        if (nav) {
            nav.style.display = 'block';
            setTimeout(() => {
                nav.style.transform = 'translateY(0)';
            }, 10);
        }
    }
    
    hide() {
        const nav = document.querySelector('.bottom-navigation');
        if (nav) {
            nav.style.transform = 'translateY(100%)';
            setTimeout(() => {
                nav.style.display = 'none';
            }, 300);
        }
    }
    
    updateItems(newItems) {
        this.navItems = newItems;
        // Re-render the navigation
        const oldNav = document.querySelector('.bottom-navigation');
        if (oldNav && oldNav.parentNode) {
            oldNav.parentNode.replaceChild(this.render(), oldNav);
        }
    }
    
    getCurrentTab() {
        return this.currentTab;
    }
    
    getBadges() {
        return { ...this.badges };
    }
}

export default BottomNavigation;