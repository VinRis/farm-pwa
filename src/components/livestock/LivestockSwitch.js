// Livestock Switch Component
import './LivestockSwitch.css';

class LivestockSwitch {
    constructor(config = {}) {
        this.currentMode = config.currentMode || 'dairy';
        this.onSwitch = config.onSwitch || (() => {});
        this.showLabels = config.showLabels !== false;
        this.animations = config.animations !== false;
        
        this.init();
    }
    
    init() {
        console.log('LivestockSwitch initialized');
    }
    
    render(currentMode = this.currentMode) {
        this.currentMode = currentMode;
        
        const container = document.createElement('div');
        container.className = 'livestock-switch';
        
        container.innerHTML = `
            <div class="switch-header">
                <h2 class="switch-title">
                    <span class="mode-icon">${this.currentMode === 'dairy' ? '🐄' : '🐔'}</span>
                    ${this.currentMode === 'dairy' ? 'Dairy Farm' : 'Poultry Farm'} Manager
                </h2>
                <p class="switch-subtitle">
                    ${this.currentMode === 'dairy' 
                        ? 'Manage your dairy cattle, milk production, and breeding schedules' 
                        : 'Track poultry flocks, egg production, feed inventory, and health'}
                </p>
            </div>
            
            <div class="switch-controls">
                <div class="switch-tabs">
                    <button 
                        class="switch-tab ${this.currentMode === 'dairy' ? 'active' : ''}" 
                        data-mode="dairy"
                        aria-label="Switch to Dairy Farm Mode"
                        aria-pressed="${this.currentMode === 'dairy'}"
                    >
                        <span class="tab-icon">🐄</span>
                        ${this.showLabels ? '<span class="tab-label">Dairy</span>' : ''}
                    </button>
                    
                    <button 
                        class="switch-tab ${this.currentMode === 'poultry' ? 'active' : ''}" 
                        data-mode="poultry"
                        aria-label="Switch to Poultry Farm Mode"
                        aria-pressed="${this.currentMode === 'poultry'}"
                    >
                        <span class="tab-icon">🐔</span>
                        ${this.showLabels ? '<span class="tab-label">Poultry</span>' : ''}
                    </button>
                    
                    <div class="switch-slider ${this.currentMode === 'dairy' ? 'dairy' : 'poultry'}"></div>
                </div>
                
                <div class="switch-stats">
                    <div class="stat ${this.currentMode === 'dairy' ? 'active' : ''}">
                        <span class="stat-value">${this.getDairyStats().totalAnimals}</span>
                        <span class="stat-label">Cattle</span>
                    </div>
                    <div class="stat ${this.currentMode === 'poultry' ? 'active' : ''}">
                        <span class="stat-value">${this.getPoultryStats().totalBirds}</span>
                        <span class="stat-label">Birds</span>
                    </div>
                </div>
            </div>
        `;
        
        // Add event listeners
        const tabs = container.querySelectorAll('.switch-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const mode = e.currentTarget.dataset.mode;
                this.handleSwitch(mode);
            });
            
            // Keyboard navigation
            tab.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    const mode = e.currentTarget.dataset.mode;
                    this.handleSwitch(mode);
                }
            });
        });
        
        return container;
    }
    
    handleSwitch(mode) {
        if (mode === this.currentMode) return;
        
        console.log(`Switching livestock mode to: ${mode}`);
        
        // Animation effect
        if (this.animations) {
            this.animateSwitch(mode);
        }
        
        // Update current mode
        this.currentMode = mode;
        
        // Call callback
        this.onSwitch(mode);
    }
    
    animateSwitch(newMode) {
        const slider = document.querySelector('.switch-slider');
        if (slider) {
            slider.classList.remove('dairy', 'poultry');
            slider.classList.add(newMode);
            
            // Add ripple effect
            const tabs = document.querySelector('.switch-tabs');
            const ripple = document.createElement('div');
            ripple.className = 'switch-ripple';
            tabs.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        }
    }
    
    getDairyStats() {
        // In a real app, this would fetch from your data store
        return {
            totalAnimals: 24,
            milkingToday: 18,
            averageProduction: '24.5L',
            healthAlerts: 2
        };
    }
    
    getPoultryStats() {
        // In a real app, this would fetch from your data store
        return {
            totalBirds: 1200,
            eggProduction: '980',
            feedInventory: '85%',
            healthAlerts: 1
        };
    }
    
    setMode(mode) {
        if (['dairy', 'poultry'].includes(mode)) {
            this.currentMode = mode;
            
            // Update UI if rendered
            const container = document.querySelector('.livestock-switch');
            if (container) {
                container.replaceWith(this.render(mode));
            }
        }
    }
    
    getCurrentMode() {
        return this.currentMode;
    }
    
    // Method to update stats (call this when data changes)
    updateStats() {
        const statsContainer = document.querySelector('.switch-stats');
        if (statsContainer) {
            const dairyStat = statsContainer.querySelector('.stat:nth-child(1) .stat-value');
            const poultryStat = statsContainer.querySelector('.stat:nth-child(2) .stat-value');
            
            if (dairyStat) {
                dairyStat.textContent = this.getDairyStats().totalAnimals;
            }
            if (poultryStat) {
                poultryStat.textContent = this.getPoultryStats().totalBirds;
            }
        }
    }
}

export default LivestockSwitch;