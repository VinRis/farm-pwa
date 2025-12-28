import './PoultryDashboard.css';

class PoultryDashboard {
    constructor(config = {}) {
        this.data = config.data || this.getDefaultData();
        this.onDataUpdate = config.onDataUpdate || (() => {});
        this.currentView = 'overview';
        this.selectedFlock = null;
        this.feedInventory = config.feedInventory || this.getDefaultFeedInventory();
        
        // Initialize data if empty
        if (!this.data || this.data.length === 0) {
            this.data = this.getDefaultData();
        }
        
        this.init();
    }
    
    init() {
        console.log('PoultryDashboard initialized with', this.data.length, 'flocks');
        this.calculateStats();
        this.checkLowStockAlerts();
    }
    
    getDefaultData() {
        return [
            {
                id: 'flock_001',
                name: 'Layer Flock A',
                birdType: 'Layers',
                breed: 'Hybrid Layer',
                birdCount: 500,
                startDate: '2023-09-15',
                age: 120, // days
                healthStatus: 'healthy',
                mortalityRate: 2.5,
                eggProduction: {
                    '2024-01-15': 480,
                    '2024-01-14': 475,
                    '2024-01-13': 490
                },
                feedType: 'Layer Mash',
                dailyFeed: 75, // kg per day
                vaccinationSchedule: [
                    { type: 'Newcastle', date: '2023-10-01', nextDue: '2024-04-01' },
                    { type: 'Marek', date: '2023-09-20', nextDue: null }
                ],
                notes: 'Good production rate, consistent layers'
            },
            {
                id: 'flock_002',
                name: 'Broiler Flock B',
                birdType: 'Broilers',
                breed: 'Cobb 500',
                birdCount: 1000,
                startDate: '2024-01-01',
                age: 15, // days
                healthStatus: 'needs_checkup',
                mortalityRate: 1.2,
                weight: '0.8', // average kg per bird
                targetWeight: '2.5',
                feedType: 'Broiler Starter',
                dailyFeed: 120, // kg per day
                vaccinationSchedule: [
                    { type: 'IBD', date: '2024-01-05', nextDue: null }
                ],
                notes: 'Growing well, monitor for respiratory issues'
            },
            {
                id: 'flock_003',
                name: 'Free Range Layers',
                birdType: 'Layers',
                breed: 'Rhode Island Red',
                birdCount: 200,
                startDate: '2023-11-01',
                age: 75, // days
                healthStatus: 'healthy',
                mortalityRate: 1.8,
                eggProduction: {
                    '2024-01-15': 180,
                    '2024-01-14': 175,
                    '2024-01-13': 185
                },
                feedType: 'Layer Pellets',
                dailyFeed: 30, // kg per day
                vaccinationSchedule: [
                    { type: 'Newcastle', date: '2023-11-15', nextDue: '2024-05-15' }
                ],
                notes: 'Free range, organic production'
            }
        ];
    }
    
    getDefaultFeedInventory() {
        return {
            'Layer Mash': 850,
            'Broiler Starter': 420,
            'Layer Pellets': 320,
            'Grower Feed': 180,
            'Grit': 150,
            'Shell Grit': 200
        };
    }
    
    calculateStats() {
        const stats = {
            totalBirds: 0,
            totalFlocks: this.data.length,
            layers: 0,
            broilers: 0,
            todayEggs: 0,
            weeklyProduction: 0,
            feedOnHand: 0,
            flocksNeedingAttention: 0,
            mortalityRate: 0,
            totalEggsThisMonth: 0
        };
        
        // Calculate totals
        this.data.forEach(flock => {
            stats.totalBirds += flock.birdCount;
            
            if (flock.birdType === 'Layers') {
                stats.layers += flock.birdCount;
                
                // Calculate today's eggs
                const today = new Date().toISOString().split('T')[0];
                if (flock.eggProduction && flock.eggProduction[today]) {
                    stats.todayEggs += flock.eggProduction[today];
                }
                
                // Calculate monthly eggs
                const thisMonth = new Date().getMonth();
                if (flock.eggProduction) {
                    Object.entries(flock.eggProduction).forEach(([date, count]) => {
                        const recordMonth = new Date(date).getMonth();
                        if (recordMonth === thisMonth) {
                            stats.totalEggsThisMonth += count;
                        }
                    });
                }
            } else if (flock.birdType === 'Broilers') {
                stats.broilers += flock.birdCount;
            }
            
            if (flock.healthStatus !== 'healthy') {
                stats.flocksNeedingAttention++;
            }
            
            stats.mortalityRate += flock.mortalityRate || 0;
        });
        
        // Calculate averages
        stats.mortalityRate = stats.mortalityRate / this.data.length;
        
        // Calculate feed on hand
        stats.feedOnHand = Object.values(this.feedInventory).reduce((sum, amount) => sum + amount, 0);
        
        this.stats = stats;
        return stats;
    }
    
    checkLowStockAlerts() {
        const lowStockThresholds = {
            'Layer Mash': 100,
            'Broiler Starter': 50,
            'Layer Pellets': 50,
            'Grower Feed': 30,
            'Grit': 20,
            'Shell Grit': 20
        };
        
        const lowStockItems = [];
        
        Object.entries(this.feedInventory).forEach(([feedType, amount]) => {
            const threshold = lowStockThresholds[feedType] || 50;
            if (amount < threshold) {
                lowStockItems.push({
                    feedType,
                    amount,
                    threshold
                });
            }
        });
        
        this.lowStockAlerts = lowStockItems;
        return lowStockItems;
    }
    
    addFlock(flockData) {
        const newFlock = {
            id: 'flock_' + Date.now(),
            ...flockData,
            healthStatus: flockData.healthStatus || 'healthy',
            startDate: flockData.startDate || new Date().toISOString().split('T')[0],
            createdAt: new Date().toISOString()
        };
        
        this.data.push(newFlock);
        this.calculateStats();
        this.onDataUpdate(this.data);
        
        this.showNotification('Flock added successfully', 'success');
        
        return newFlock;
    }
    
    updateFlock(flockId, updates) {
        const index = this.data.findIndex(flock => flock.id === flockId);
        if (index !== -1) {
            this.data[index] = { ...this.data[index], ...updates };
            this.calculateStats();
            this.onDataUpdate(this.data);
            
            this.showNotification('Flock information updated', 'success');
            return this.data[index];
        }
        return null;
    }
    
    recordEggCollection(flockId, count, date = null) {
        const flock = this.data.find(f => f.id === flockId);
        if (!flock) {
            this.showNotification('Flock not found', 'error');
            return null;
        }
        
        if (flock.birdType !== 'Layers') {
            this.showNotification('Only layer flocks produce eggs', 'error');
            return null;
        }
        
        const collectionDate = date || new Date().toISOString().split('T')[0];
        
        if (!flock.eggProduction) {
            flock.eggProduction = {};
        }
        
        flock.eggProduction[collectionDate] = (flock.eggProduction[collectionDate] || 0) + parseInt(count);
        
        this.calculateStats();
        this.onDataUpdate(this.data);
        
        this.showNotification(`Recorded ${count} eggs from ${flock.name}`, 'success');
        
        return {
            flockId,
            count,
            date: collectionDate,
            total: flock.eggProduction[collectionDate]
        };
    }
    
    updateFeedInventory(feedType, amount, operation = 'add') {
        const currentAmount = this.feedInventory[feedType] || 0;
        let newAmount;
        
        if (operation === 'add') {
            newAmount = currentAmount + amount;
        } else if (operation === 'remove') {
            newAmount = Math.max(0, currentAmount - amount);
        } else if (operation === 'set') {
            newAmount = amount;
        } else {
            return null;
        }
        
        this.feedInventory[feedType] = newAmount;
        
        // Check for low stock alert
        this.checkLowStockAlerts();
        
        this.onDataUpdate(this.data);
        
        const action = operation === 'add' ? 'added to' : operation === 'remove' ? 'removed from' : 'updated in';
        this.showNotification(`${amount}kg ${action} ${feedType} inventory`, 'success');
        
        return {
            feedType,
            oldAmount: currentAmount,
            newAmount,
            operation
        };
    }
    
    recordMortality(flockId, count, cause = 'unknown') {
        const flock = this.data.find(f => f.id === flockId);
        if (!flock) return null;
        
        const oldCount = flock.birdCount;
        flock.birdCount = Math.max(0, oldCount - count);
        
        // Update mortality rate
        const deaths = oldCount - flock.birdCount;
        const mortalityRate = (deaths / oldCount) * 100;
        
        if (!flock.mortalityRecords) {
            flock.mortalityRecords = [];
        }
        
        flock.mortalityRecords.push({
            date: new Date().toISOString().split('T')[0],
            count: deaths,
            cause: cause,
            previousCount: oldCount,
            newCount: flock.birdCount
        });
        
        flock.mortalityRate = mortalityRate;
        
        this.calculateStats();
        this.onDataUpdate(this.data);
        
        if (deaths > 0) {
            this.showNotification(`Recorded ${deaths} mortality in ${flock.name}`, 'warning');
        }
        
        return {
            flockId,
            deaths,
            mortalityRate,
            newCount: flock.birdCount
        };
    }
    
    getFlock(flockId) {
        return this.data.find(flock => flock.id === flockId);
    }
    
    getFlocksByType(birdType) {
        return this.data.filter(flock => flock.birdType === birdType);
    }
    
    getEggProductionReport(days = 7) {
        const report = {
            daily: {},
            total: 0,
            average: 0,
            byFlock: {}
        };
        
        // Generate dates for the last N days
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            report.daily[dateStr] = 0;
        }
        
        // Calculate production for each day and by flock
        this.data.forEach(flock => {
            if (flock.eggProduction) {
                report.byFlock[flock.id] = {
                    name: flock.name,
                    daily: {},
                    total: 0
                };
                
                Object.entries(flock.eggProduction).forEach(([date, count]) => {
                    if (report.daily[date] !== undefined) {
                        report.daily[date] += count;
                        report.total += count;
                        
                        report.byFlock[flock.id].daily[date] = count;
                        report.byFlock[flock.id].total += count;
                    }
                });
            }
        });
        
        report.average = report.total / days;
        
        return report;
    }
    
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <span class="notification-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
            <span class="notification-message">${message}</span>
            <button class="notification-close">&times;</button>
        `;
        
        // Add to DOM
        const container = document.querySelector('.notifications-container');
        if (!container) {
            const newContainer = document.createElement('div');
            newContainer.className = 'notifications-container';
            document.body.appendChild(newContainer);
            newContainer.appendChild(notification);
        } else {
            container.appendChild(notification);
        }
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.opacity = '0';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }
        }, 5000);
        
        // Close button handler
        notification.querySelector('.notification-close').addEventListener('click', () => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        });
    }
    
    setView(view) {
        this.currentView = view;
        this.render();
    }
    
    selectFlock(flockId) {
        this.selectedFlock = this.getFlock(flockId);
        this.setView('detail');
    }
    
    render() {
        const container = document.createElement('div');
        container.className = 'poultry-dashboard';
        
        // Calculate stats if not already calculated
        if (!this.stats) {
            this.calculateStats();
        }
        
        switch (this.currentView) {
            case 'overview':
                container.appendChild(this.renderOverview());
                break;
            case 'detail':
                if (this.selectedFlock) {
                    container.appendChild(this.renderFlockDetail(this.selectedFlock));
                } else {
                    container.appendChild(this.renderOverview());
                }
                break;
            case 'add':
                container.appendChild(this.renderAddFlockForm());
                break;
            case 'inventory':
                container.appendChild(this.renderInventory());
                break;
            case 'reports':
                container.appendChild(this.renderReports());
                break;
            default:
                container.appendChild(this.renderOverview());
        }
        
        return container;
    }
    
    renderOverview() {
        const overview = document.createElement('div');
        overview.className = 'poultry-overview';
        
        // Check for alerts
        const hasLowStock = this.lowStockAlerts && this.lowStockAlerts.length > 0;
        
        overview.innerHTML = `
            <div class="dashboard-header">
                <h2><span class="icon">🐔</span> Poultry Farm Dashboard</h2>
                <div class="header-actions">
                    <button class="btn btn-primary" id="add-flock-btn">
                        <span class="btn-icon">+</span> Add New Flock
                    </button>
                    <button class="btn btn-secondary" id="record-eggs-btn">
                        <span class="btn-icon">🥚</span> Record Eggs
                    </button>
                </div>
            </div>
            
            ${hasLowStock ? `
                <div class="alert alert-warning">
                    <span class="alert-icon">⚠️</span>
                    <div class="alert-content">
                        <strong>Low Stock Alert</strong>
                        <p>${this.lowStockAlerts.length} feed items are running low</p>
                    </div>
                    <button class="alert-action" id="view-inventory">View Inventory</button>
                </div>
            ` : ''}
            
            <div class="stats-grid">
                <div class="stat-card stat-total">
                    <div class="stat-icon">🐔</div>
                    <div class="stat-content">
                        <div class="stat-value">${this.stats.totalBirds.toLocaleString()}</div>
                        <div class="stat-label">Total Birds</div>
                    </div>
                </div>
                
                <div class="stat-card stat-eggs">
                    <div class="stat-icon">🥚</div>
                    <div class="stat-content">
                        <div class="stat-value">${this.stats.todayEggs}</div>
                        <div class="stat-label">Today's Eggs</div>
                    </div>
                </div>
                
                <div class="stat-card stat-feed">
                    <div class="stat-icon">🌾</div>
                    <div class="stat-content">
                        <div class="stat-value">${this.stats.feedOnHand}kg</div>
                        <div class="stat-label">Feed On Hand</div>
                    </div>
                </div>
                
                <div class="stat-card stat-health">
                    <div class="stat-icon">❤️</div>
                    <div class="stat-content">
                        <div class="stat-value">${this.stats.flocksNeedingAttention}</div>
                        <div class="stat-label">Needs Attention</div>
                    </div>
                </div>
            </div>
            
            <div class="dashboard-sections">
                <div class="section">
                    <div class="section-header">
                        <h3>Active Flocks</h3>
                        <button class="btn-text" id="view-all-flocks">View All</button>
                    </div>
                    <div class="section-content">
                        ${this.renderActiveFlocks()}
                    </div>
                </div>
                
                <div class="section">
                    <div class="section-header">
                        <h3>Recent Egg Production</h3>
                    </div>
                    <div class="section-content">
                        ${this.renderRecentEggProduction()}
                    </div>
                </div>
                
                <div class="section">
                    <div class="section-header">
                        <h3>Feed Inventory Summary</h3>
                        <button class="btn-text" id="manage-inventory">Manage</button>
                    </div>
                    <div class="section-content">
                        ${this.renderFeedSummary()}
                    </div>
                </div>
            </div>
            
            <div class="quick-actions">
                <h3>Quick Actions</h3>
                <div class="action-buttons">
                    <button class="action-btn" id="quick-egg-record">
                        <span class="action-icon">📝</span>
                        <span class="action-text">Record Eggs</span>
                    </button>
                    <button class="action-btn" id="record-mortality">
                        <span class="action-icon">📉</span>
                        <span class="action-text">Record Mortality</span>
                    </button>
                    <button class="action-btn" id="order-feed">
                        <span class="action-icon">🛒</span>
                        <span class="action-text">Order Feed</span>
                    </button>
                    <button class="action-btn" id="health-checkup">
                        <span class="action-icon">🏥</span>
                        <span class="action-text">Health Checkup</span>
                    </button>
                </div>
            </div>
        `;
        
        // Add event listeners
        overview.querySelector('#add-flock-btn').addEventListener('click', () => {
            this.setView('add');
        });
        
        overview.querySelector('#record-eggs-btn').addEventListener('click', () => {
            this.showEggRecordingModal();
        });
        
        if (hasLowStock) {
            overview.querySelector('#view-inventory').addEventListener('click', () => {
                this.setView('inventory');
            });
        }
        
        overview.querySelector('#manage-inventory').addEventListener('click', () => {
            this.setView('inventory');
        });
        
        // Add more event listeners as needed
        
        return overview;
    }
    
    renderActiveFlocks() {
        if (this.data.length === 0) {
            return '<p class="empty-state">No active flocks</p>';
        }
        
        let html = '<div class="flocks-list">';
        
        this.data.slice(0, 4).forEach(flock => {
            const todayEggs = flock.eggProduction 
                ? flock.eggProduction[new Date().toISOString().split('T')[0]] || 0
                : 0;
            
            html += `
                <div class="flock-card" data-flock-id="${flock.id}">
                    <div class="flock-header">
                        <h4>${flock.name}</h4>
                        <span class="status-badge ${flock.healthStatus}">
                            ${flock.healthStatus.replace('_', ' ')}
                        </span>
                    </div>
                    <div class="flock-details">
                        <div class="detail-item">
                            <span class="detail-label">Type:</span>
                            <span class="detail-value">${flock.birdType}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Birds:</span>
                            <span class="detail-value">${flock.birdCount}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Age:</span>
                            <span class="detail-value">${flock.age} days</span>
                        </div>
                        ${flock.birdType === 'Layers' ? `
                            <div class="detail-item">
                                <span class="detail-label">Today's Eggs:</span>
                                <span class="detail-value">${todayEggs}</span>
                            </div>
                        ` : ''}
                    </div>
                    <button class="btn-small btn-outline" data-action="view-detail">View Details</button>
                </div>
            `;
        });
        
        html += '</div>';
        
        return html;
    }
    
    renderRecentEggProduction() {
        const eggReport = this.getEggProductionReport(7);
        const dates = Object.keys(eggReport.daily).slice(-5); // Last 5 days
        
        if (dates.length === 0 || eggReport.total === 0) {
            return '<p class="empty-state">No egg production data</p>';
        }
        
        let html = `
            <div class="egg-production-chart">
                <div class="chart-bars">
        `;
        
        const maxEggs = Math.max(...Object.values(eggReport.daily));
        
        dates.forEach(date => {
            const eggs = eggReport.daily[date] || 0;
            const percentage = maxEggs > 0 ? (eggs / maxEggs) * 100 : 0;
            
            html += `
                <div class="chart-bar-container">
                    <div class="chart-bar" style="height: ${percentage}%">
                        <span class="bar-value">${eggs}</span>
                    </div>
                    <div class="bar-label">${this.formatDateShort(date)}</div>
                </div>
            `;
        });
        
        html += `
                </div>
                <div class="chart-stats">
                    <div class="stat-item">
                        <span class="stat-label">7-day Total:</span>
                        <span class="stat-value">${eggReport.total}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Daily Avg:</span>
                        <span class="stat-value">${Math.round(eggReport.average)}</span>
                    </div>
                </div>
            </div>
        `;
        
        return html;
    }
    
    renderFeedSummary() {
        const feedTypes = Object.keys(this.feedInventory).slice(0, 4); // Show first 4
        
        if (feedTypes.length === 0) {
            return '<p class="empty-state">No feed inventory</p>';
        }
        
        let html = '<div class="feed-summary">';
        
        feedTypes.forEach(feedType => {
            const amount = this.feedInventory[feedType];
            const isLow = this.lowStockAlerts.some(alert => alert.feedType === feedType);
            
            html += `
                <div class="feed-item ${isLow ? 'low-stock' : ''}">
                    <div class="feed-type">${feedType}</div>
                    <div class="feed-amount">${amount}kg</div>
                    ${isLow ? '<span class="low-stock-indicator">⚠️ Low</span>' : ''}
                </div>
            `;
        });
        
        html += '</div>';
        
        return html;
    }
    
    renderFlockDetail(flock) {
        const detail = document.createElement('div');
        detail.className = 'flock-detail';
        
        const today = new Date().toISOString().split('T')[0];
        const todayEggs = flock.eggProduction ? flock.eggProduction[today] || 0 : 0;
        
        detail.innerHTML = `
            <div class="detail-header">
                <button class="btn-back" id="back-to-overview">
                    ← Back
                </button>
                <h2>${flock.name}</h2>
                <div class="header-actions">
                    <button class="btn btn-secondary" id="edit-flock-btn">Edit</button>
                </div>
            </div>
            
            <div class="flock-profile">
                <div class="profile-header">
                    <div class="profile-icon">${flock.birdType === 'Layers' ? '🐔' : '🍗'}</div>
                    <div class="profile-info">
                        <h3>${flock.name}</h3>
                        <div class="profile-details">
                            <span class="detail-item">
                                <span class="detail-label">Type:</span>
                                <span class="detail-value">${flock.birdType}</span>
                            </span>
                            <span class="detail-item">
                                <span class="detail-label">Breed:</span>
                                <span class="detail-value">${flock.breed}</span>
                            </span>
                            <span class="detail-item">
                                <span class="detail-label">Age:</span>
                                <span class="detail-value">${flock.age} days</span>
                            </span>
                        </div>
                    </div>
                    <div class="profile-status">
                        <span class="status-badge large ${flock.healthStatus}">
                            ${flock.healthStatus.replace('_', ' ')}
                        </span>
                    </div>
                </div>
                
                <div class="detail-grid">
                    <div class="detail-card">
                        <h4>Bird Count</h4>
                        <div class="detail-value large">${flock.birdCount}</div>
                        <div class="detail-subtext">
                            Mortality: ${flock.mortalityRate ? flock.mortalityRate.toFixed(2) + '%' : 'N/A'}
                        </div>
                    </div>
                    
                    ${flock.birdType === 'Layers' ? `
                        <div class="detail-card">
                            <h4>Today's Eggs</h4>
                            <div class="detail-value large">${todayEggs}</div>
                            <div class="detail-subtext">
                                Production Rate: ${flock.birdCount > 0 ? ((todayEggs / flock.birdCount) * 100).toFixed(1) + '%' : 'N/A'}
                            </div>
                        </div>
                    ` : flock.birdType === 'Broilers' ? `
                        <div class="detail-card">
                            <h4>Avg. Weight</h4>
                            <div class="detail-value large">${flock.weight || '0'}kg</div>
                            <div class="detail-subtext">
                                Target: ${flock.targetWeight || 'N/A'}kg
                            </div>
                        </div>
                    ` : ''}
                    
                    <div class="detail-card">
                        <h4>Daily Feed</h4>
                        <div class="detail-value">${flock.dailyFeed || '0'}kg</div>
                        <div class="detail-subtext">${flock.feedType || 'Not specified'}</div>
                    </div>
                    
                    <div class="detail-card">
                        <h4>Started On</h4>
                        <div class="detail-value">
                            ${this.formatDate(flock.startDate)}
                        </div>
                        <div class="detail-subtext">
                            ${flock.age} days ago
                        </div>
                    </div>
                </div>
                
                <div class="detail-tabs">
                    <button class="tab-btn active" data-tab="production">Production</button>
                    <button class="tab-btn" data-tab="health">Health</button>
                    <button class="tab-btn" data-tab="feed">Feed & Care</button>
                    <button class="tab-btn" data-tab="notes">Notes</button>
                </div>
                
                <div class="tab-content active" id="production">
                    ${this.renderProductionTab(flock)}
                </div>
                
                <div class="tab-content" id="health">
                    ${this.renderHealthTab(flock)}
                </div>
                
                <div class="tab-content" id="feed">
                    ${this.renderFeedTab(flock)}
                </div>
                
                <div class="tab-content" id="notes">
                    <div class="notes-content">
                        <p>${flock.notes || 'No notes available'}</p>
                        <textarea class="notes-input" placeholder="Add notes..."></textarea>
                        <button class="btn btn-primary" id="save-notes-btn">Save Notes</button>
                    </div>
                </div>
            </div>
        `;
        
        // Add event listeners
        detail.querySelector('#back-to-overview').addEventListener('click', () => {
            this.setView('overview');
        });
        
        // Tab switching
        detail.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabId = e.target.dataset.tab;
                
                // Update active tab
                detail.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                // Show corresponding content
                detail.querySelectorAll('.tab-content').forEach(content => {
                    content.classList.remove('active');
                });
                detail.querySelector(`#${tabId}`).classList.add('active');
            });
        });
        
        return detail;
    }
    
    renderProductionTab(flock) {
        if (flock.birdType !== 'Layers') {
            return `
                <div class="tab-info">
                    <p>Broiler flocks don't produce eggs. Track weight gain instead.</p>
                    <div class="weight-tracking">
                        <h4>Weight Tracking</h4>
                        <div class="current-weight">
                            <span class="label">Current Avg. Weight:</span>
                            <span class="value">${flock.weight || '0'} kg</span>
                        </div>
                        ${flock.targetWeight ? `
                            <div class="target-weight">
                                <span class="label">Target Weight:</span>
                                <span class="value">${flock.targetWeight} kg</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }
        
        if (!flock.eggProduction || Object.keys(flock.eggProduction).length === 0) {
            return '<p class="empty-state">No production data available</p>';
        }
        
        // Get last 7 days of production
        const last7Days = {};
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            last7Days[dateStr] = flock.eggProduction[dateStr] || 0;
        }
        
        let html = `
            <div class="production-stats">
                <div class="stat-row">
                    <div class="stat-item">
                        <span class="stat-label">7-day Total</span>
                        <span class="stat-value">${Object.values(last7Days).reduce((a, b) => a + b, 0)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Daily Average</span>
                        <span class="stat-value">
                            ${Math.round(Object.values(last7Days).reduce((a, b) => a + b, 0) / 7)}
                        </span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Production Rate</span>
                        <span class="stat-value">
                            ${flock.birdCount > 0 ? 
                                ((Object.values(last7Days).reduce((a, b) => a + b, 0) / 7 / flock.birdCount) * 100).toFixed(1) + '%' 
                                : 'N/A'}
                        </span>
                    </div>
                </div>
            </div>
            
            <div class="production-chart">
                <h4>Last 7 Days Production</h4>
                <div class="chart-bars">
        `;
        
        const maxEggs = Math.max(...Object.values(last7Days));
        
        Object.entries(last7Days).forEach(([date, eggs]) => {
            const percentage = maxEggs > 0 ? (eggs / maxEggs) * 100 : 0;
            
            html += `
                <div class="chart-bar-container">
                    <div class="chart-bar" style="height: ${percentage}%">
                        <span class="bar-value">${eggs}</span>
                    </div>
                    <div class="bar-label">${this.formatDateShort(date)}</div>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
        
        return html;
    }
    
    renderHealthTab(flock) {
        let html = `
            <div class="health-overview">
                <div class="health-metrics">
                    <div class="metric">
                        <span class="metric-label">Mortality Rate</span>
                        <span class="metric-value">${flock.mortalityRate ? flock.mortalityRate.toFixed(2) + '%' : 'N/A'}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Health Status</span>
                        <span class="metric-value status-badge ${flock.healthStatus}">
                            ${flock.healthStatus.replace('_', ' ')}
                        </span>
                    </div>
                </div>
        `;
        
        if (flock.vaccinationSchedule && flock.vaccinationSchedule.length > 0) {
            html += `
                <div class="vaccination-schedule">
                    <h4>Vaccination Schedule</h4>
                    <div class="vaccination-list">
            `;
            
            flock.vaccinationSchedule.forEach(vaccine => {
                html += `
                    <div class="vaccine-item">
                        <span class="vaccine-type">${vaccine.type}</span>
                        <span class="vaccine-date">Given: ${this.formatDate(vaccine.date)}</span>
                        ${vaccine.nextDue ? `
                            <span class="vaccine-due">Next due: ${this.formatDate(vaccine.nextDue)}</span>
                        ` : ''}
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        }
        
        if (flock.mortalityRecords && flock.mortalityRecords.length > 0) {
            html += `
                <div class="mortality-records">
                    <h4>Recent Mortality</h4>
                    <div class="mortality-list">
            `;
            
            flock.mortalityRecords.slice(-3).forEach(record => {
                html += `
                    <div class="mortality-item">
                        <span class="mortality-date">${this.formatDate(record.date)}</span>
                        <span class="mortality-count">${record.count} birds</span>
                        <span class="mortality-cause">${record.cause}</span>
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        }
        
        html += '</div>';
        
        return html;
    }
    
    renderFeedTab(flock) {
        let html = `
            <div class="feed-management">
                <div class="feed-info">
                    <div class="info-item">
                        <span class="info-label">Feed Type:</span>
                        <span class="info-value">${flock.feedType || 'Not specified'}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Daily Consumption:</span>
                        <span class="info-value">${flock.dailyFeed || '0'} kg</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Monthly Feed Cost:</span>
                        <span class="info-value">
                            ${flock.dailyFeed ? '₹' + (flock.dailyFeed * 30 * 45).toFixed(0) : 'N/A'}
                        </span>
                    </div>
                </div>
                
                <div class="inventory-check">
                    <h4>Feed Inventory</h4>
                    <div class="inventory-status">
                        <span class="status-label">Available:</span>
                        <span class="status-value ${this.feedInventory[flock.feedType] < 100 ? 'low' : 'good'}">
                            ${this.feedInventory[flock.feedType] || 0} kg
                        </span>
                        <span class="status-days">
                            (≈ ${this.feedInventory[flock.feedType] && flock.dailyFeed 
                                ? Math.floor(this.feedInventory[flock.feedType] / flock.dailyFeed) 
                                : 0} days supply)
                        </span>
                    </div>
                    ${this.feedInventory[flock.feedType] < 100 ? `
                        <div class="low-stock-alert">
                            ⚠️ Low stock! Consider ordering more feed.
                        </div>
                    ` : ''}
                </div>
                
                <div class="feed-actions">
                    <button class="btn btn-primary" id="adjust-feed-btn">Adjust Daily Feed</button>
                    <button class="btn btn-secondary" id="order-feed-btn">Order Feed</button>
                </div>
            </div>
        `;
        
        return html;
    }
    
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }
    
    formatDateShort(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });
    }
    
    showEggRecordingModal(flockId = null) {
        const layerFlocks = this.getFlocksByType('Layers');
        
        if (layerFlocks.length === 0) {
            this.showNotification('No layer flocks available', 'error');
            return;
        }
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Record Egg Collection</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="egg-recording-form">
                        <div class="form-group">
                            <label for="flock-select">Select Flock</label>
                            <select id="flock-select" required>
                                <option value="">Choose a flock</option>
                                ${layerFlocks.map(flock => `
                                    <option value="${flock.id}" ${flockId === flock.id ? 'selected' : ''}>
                                        ${flock.name} (${flock.birdCount} birds)
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="egg-count">Number of Eggs</label>
                            <input type="number" 
                                   id="egg-count" 
                                   min="0" 
                                   max="10000" 
                                   placeholder="e.g., 480" 
                                   required>
                        </div>
                        
                        <div class="form-group">
                            <label for="egg-date">Collection Date</label>
                            <input type="date" 
                                   id="egg-date" 
                                   value="${new Date().toISOString().split('T')[0]}" 
                                   required>
                        </div>
                        
                        <div class="form-group">
                            <label for="egg-quality">Egg Quality (Optional)</label>
                            <select id="egg-quality">
                                <option value="">Select quality</option>
                                <option value="excellent">Excellent</option>
                                <option value="good">Good</option>
                                <option value="average">Average</option>
                                <option value="poor">Poor</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="egg-notes">Notes (Optional)</label>
                            <textarea id="egg-notes" 
                                      placeholder="Any observations about the eggs..."></textarea>
                        </div>
                        
                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary modal-close">Cancel</button>
                            <button type="submit" class="btn btn-primary">Record Collection</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Close modal
        const closeModal = () => {
            document.body.removeChild(modal);
        };
        
        modal.querySelector('.modal-close').addEventListener('click', closeModal);
        modal.querySelector('.modal').addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
        
        // Handle form submission
        modal.querySelector('#egg-recording-form').addEventListener('submit', (e) => {
            e.preventDefault();
            
            const flockId = modal.querySelector('#flock-select').value;
            const count = parseInt(modal.querySelector('#egg-count').value);
            const date = modal.querySelector('#egg-date').value;
            const quality = modal.querySelector('#egg-quality').value;
            const notes = modal.querySelector('#egg-notes').value;
            
            this.recordEggCollection(flockId, count, date);
            closeModal();
        });
    }
    
    renderAddFlockForm() {
        const form = document.createElement('div');
        form.className = 'add-flock-form';
        
        form.innerHTML = `
            <div class="form-header">
                <button class="btn-back" id="back-to-overview">
                    ← Back
                </button>
                <h2>Add New Flock</h2>
            </div>
            
            <form id="new-flock-form">
                <div class="form-section">
                    <h3>Basic Information</h3>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="flock-name">Flock Name *</label>
                            <input type="text" 
                                   id="flock-name" 
                                   placeholder="e.g., Layer Flock A" 
                                   required>
                        </div>
                        
                        <div class="form-group">
                            <label for="bird-type">Bird Type *</label>
                            <select id="bird-type" required>
                                <option value="">Select type</option>
                                <option value="Layers">Layers (Egg production)</option>
                                <option value="Broilers">Broilers (Meat production)</option>
                                <option value="Breeders">Breeders</option>
                                <option value="Pullets">Pullets</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="breed">Breed</label>
                            <select id="breed">
                                <option value="Hybrid Layer">Hybrid Layer</option>
                                <option value="Rhode Island Red">Rhode Island Red</option>
                                <option value="Leghorn">Leghorn</option>
                                <option value="Cobb 500">Cobb 500</option>
                                <option value="Ross 308">Ross 308</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="bird-count">Number of Birds *</label>
                            <input type="number" 
                                   id="bird-count" 
                                   min="1" 
                                   max="100000" 
                                   placeholder="e.g., 500" 
                                   required>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="start-date">Start Date *</label>
                        <input type="date" 
                               id="start-date" 
                               value="${new Date().toISOString().split('T')[0]}" 
                               required>
                    </div>
                </div>
                
                <div class="form-section">
                    <h3>Health & Management</h3>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="health-status">Initial Health Status</label>
                            <select id="health-status">
                                <option value="healthy">Healthy</option>
                                <option value="needs_checkup">Needs Checkup</option>
                                <option value="quarantined">Quarantined</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="source">Source</label>
                            <input type="text" 
                                   id="source" 
                                   placeholder="e.g., Hatchery name">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="initial-vaccinations">Initial Vaccinations (Optional)</label>
                        <textarea id="initial-vaccinations" 
                                  placeholder="List vaccinations with dates, one per line..."
                                  rows="3"></textarea>
                    </div>
                </div>
                
                <div class="form-section">
                    <h3>Feed & Housing</h3>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="feed-type">Feed Type</label>
                            <select id="feed-type">
                                <option value="">Select feed</option>
                                ${Object.keys(this.feedInventory).map(feed => `
                                    <option value="${feed}">${feed}</option>
                                `).join('')}
                                <option value="other">Other</option>
                            </select>
                        </div>
                        
                        <div class="form-group" id="other-feed-container" style="display: none;">
                            <label for="other-feed">Specify Feed Type</label>
                            <input type="text" 
                                   id="other-feed" 
                                   placeholder="Enter feed type">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="housing-type">Housing Type</label>
                        <select id="housing-type">
                            <option value="battery_cages">Battery Cages</option>
                            <option value="free_range">Free Range</option>
                            <option value="deep_litter">Deep Litter</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="notes">Additional Notes</label>
                        <textarea id="notes" 
                                  placeholder="Any additional information about the flock..."
                                  rows="3"></textarea>
                    </div>
                </div>
                
                <div class="form-actions">
                    <button type="reset" class="btn btn-secondary">Clear Form</button>
                    <button type="submit" class="btn btn-primary">Add Flock</button>
                </div>
            </form>
        `;
        
        // Show/hide other feed input
        const feedType = form.querySelector('#feed-type');
        const otherFeedContainer = form.querySelector('#other-feed-container');
        
        feedType.addEventListener('change', () => {
            if (feedType.value === 'other') {
                otherFeedContainer.style.display = 'block';
            } else {
                otherFeedContainer.style.display = 'none';
            }
        });
        
        // Back button
        form.querySelector('#back-to-overview').addEventListener('click', () => {
            this.setView('overview');
        });
        
        // Form submission
        form.querySelector('#new-flock-form').addEventListener('submit', (e) => {
            e.preventDefault();
            
            let selectedFeedType = feedType.value;
            if (selectedFeedType === 'other') {
                selectedFeedType = form.querySelector('#other-feed').value;
            }
            
            const flockData = {
                name: form.querySelector('#flock-name').value,
                birdType: form.querySelector('#bird-type').value,
                breed: form.querySelector('#breed').value,
                birdCount: parseInt(form.querySelector('#bird-count').value),
                startDate: form.querySelector('#start-date').value,
                healthStatus: form.querySelector('#health-status').value,
                feedType: selectedFeedType,
                housingType: form.querySelector('#housing-type').value,
                notes: form.querySelector('#notes').value
            };
            
            if (form.querySelector('#source').value) {
                flockData.source = form.querySelector('#source').value;
            }
            
            if (form.querySelector('#initial-vaccinations').value) {
                flockData.vaccinationSchedule = form.querySelector('#initial-vaccinations').value
                    .split('\n')
                    .filter(v => v.trim())
                    .map(v => ({
                        type: v,
                        date: new Date().toISOString().split('T')[0],
                        nextDue: this.calculateVaccineDueDate(v)
                    }));
            }
            
            this.addFlock(flockData);
            this.setView('overview');
        });
        
        return form;
    }
    
    calculateVaccineDueDate(vaccineType) {
        // Simple logic - 6 months from now for most vaccines
        const nextDue = new Date();
        nextDue.setMonth(nextDue.getMonth() + 6);
        return nextDue.toISOString().split('T')[0];
    }
    
    renderInventory() {
        const inventory = document.createElement('div');
        inventory.className = 'inventory-view';
        
        inventory.innerHTML = `
            <div class="inventory-header">
                <button class="btn-back" id="back-to-overview">
                    ← Back
                </button>
                <h2>Feed Inventory Management</h2>
            </div>
            
            <div class="inventory-summary">
                <div class="summary-card">
                    <h3>Total Feed On Hand</h3>
                    <div class="summary-value">${this.stats.feedOnHand} kg</div>
                    <div class="summary-detail">
                        ${Object.keys(this.feedInventory).length} different types
                    </div>
                </div>
                
                <div class="summary-card">
                    <h3>Low Stock Items</h3>
                    <div class="summary-value ${this.lowStockAlerts.length > 0 ? 'warning' : 'good'}">
                        ${this.lowStockAlerts.length}
                    </div>
                    <div class="summary-detail">
                        ${this.lowStockAlerts.length > 0 ? 'Needs attention' : 'All good'}
                    </div>
                </div>
                
                <div class="summary-card">
                    <h3>Estimated Days Supply</h3>
                    <div class="summary-value">${this.calculateDaysSupply()}</div>
                    <div class="summary-detail">Based on current consumption</div>
                </div>
            </div>
            
            <div class="inventory-content">
                <div class="inventory-table-section">
                    <div class="section-header">
                        <h3>Current Inventory</h3>
                        <button class="btn btn-primary" id="add-feed-type">
                            <span class="btn-icon">+</span> Add Feed Type
                        </button>
                    </div>
                    
                    <div class="inventory-table">
                        <div class="table-header">
                            <div class="header-cell">Feed Type</div>
                            <div class="header-cell">Current Stock</div>
                            <div class="header-cell">Status</div>
                            <div class="header-cell">Actions</div>
                        </div>
                        <div class="table-body" id="inventory-table-body">
                            ${this.renderInventoryTable()}
                        </div>
                    </div>
                </div>
                
                <div class="inventory-actions-section">
                    <div class="action-card">
                        <h4>Quick Actions</h4>
                        <button class="action-btn full-width" id="receive-feed">
                            <span class="action-icon">📦</span>
                            <span class="action-text">Receive Feed Delivery</span>
                        </button>
                        <button class="action-btn full-width" id="adjust-stock">
                            <span class="action-icon">📊</span>
                            <span class="action-text">Adjust Stock Levels</span>
                        </button>
                        <button class="action-btn full-width" id="generate-order">
                            <span class="action-icon">🛒</span>
                            <span class="action-text">Generate Order List</span>
                        </button>
                    </div>
                    
                    <div class="action-card">
                        <h4>Low Stock Alerts</h4>
                        ${this.lowStockAlerts.length > 0 ? `
                            <div class="alerts-list">
                                ${this.lowStockAlerts.map(alert => `
                                    <div class="alert-item">
                                        <span class="alert-feed">${alert.feedType}</span>
                                        <span class="alert-amount">${alert.amount} kg</span>
                                        <span class="alert-threshold">Threshold: ${alert.threshold} kg</span>
                                    </div>
                                `).join('')}
                            </div>
                            <button class="btn btn-warning full-width" id="order-low-stock">
                                Order Low Stock Items
                            </button>
                        ` : `
                            <p class="no-alerts">No low stock alerts 🎉</p>
                        `}
                    </div>
                </div>
            </div>
        `;
        
        // Back button
        inventory.querySelector('#back-to-overview').addEventListener('click', () => {
            this.setView('overview');
        });
        
        // Add feed type button
        inventory.querySelector('#add-feed-type').addEventListener('click', () => {
            this.showAddFeedTypeModal();
        });
        
        // Action buttons
        inventory.querySelector('#receive-feed').addEventListener('click', () => {
            this.showReceiveFeedModal();
        });
        
        inventory.querySelector('#order-low-stock').addEventListener('click', () => {
            this.showOrderModal();
        });
        
        return inventory;
    }
    
    renderInventoryTable() {
        if (Object.keys(this.feedInventory).length === 0) {
            return '<div class="empty-row">No feed inventory data</div>';
        }
        
        let html = '';
        
        Object.entries(this.feedInventory).forEach(([feedType, amount]) => {
            const isLow = this.lowStockAlerts.some(alert => alert.feedType === feedType);
            const status = isLow ? 'low' : amount > 500 ? 'high' : 'medium';
            const statusText = isLow ? 'Low Stock' : amount > 500 ? 'Good' : 'Adequate';
            
            html += `
                <div class="table-row">
                    <div class="table-cell">${feedType}</div>
                    <div class="table-cell">${amount} kg</div>
                    <div class="table-cell">
                        <span class="stock-status ${status}">${statusText}</span>
                    </div>
                    <div class="table-cell">
                        <div class="cell-actions">
                            <button class="btn-icon" data-action="add" data-feed="${feedType}">
                                ➕
                            </button>
                            <button class="btn-icon" data-action="remove" data-feed="${feedType}">
                                ➖
                            </button>
                            <button class="btn-icon" data-action="edit" data-feed="${feedType}">
                                ✏️
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        
        return html;
    }
    
    calculateDaysSupply() {
        // Calculate total daily feed consumption
        let totalDailyFeed = 0;
        this.data.forEach(flock => {
            totalDailyFeed += flock.dailyFeed || 0;
        });
        
        if (totalDailyFeed === 0) {
            return '∞ days';
        }
        
        const days = Math.floor(this.stats.feedOnHand / totalDailyFeed);
        return `${days} days`;
    }
    
    showAddFeedTypeModal() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Add New Feed Type</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="add-feed-form">
                        <div class="form-group">
                            <label for="new-feed-type">Feed Type Name *</label>
                            <input type="text" 
                                   id="new-feed-type" 
                                   placeholder="e.g., Organic Layer Pellets" 
                                   required>
                        </div>
                        
                        <div class="form-group">
                            <label for="initial-amount">Initial Amount (kg) *</label>
                            <input type="number" 
                                   id="initial-amount" 
                                   min="0" 
                                   step="1" 
                                   placeholder="e.g., 100" 
                                   required>
                        </div>
                        
                        <div class="form-group">
                            <label for="low-stock-threshold">Low Stock Threshold (kg)</label>
                            <input type="number" 
                                   id="low-stock-threshold" 
                                   min="1" 
                                   step="1" 
                                   placeholder="e.g., 50" 
                                   value="50">
                        </div>
                        
                        <div class="form-group">
                            <label for="feed-price">Price per kg (Optional)</label>
                            <input type="number" 
                                   id="feed-price" 
                                   min="0" 
                                   step="0.01" 
                                   placeholder="e.g., 45.00">
                        </div>
                        
                        <div class="form-group">
                            <label for="supplier">Supplier (Optional)</label>
                            <input type="text" 
                                   id="supplier" 
                                   placeholder="Supplier name">
                        </div>
                        
                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary modal-close">Cancel</button>
                            <button type="submit" class="btn btn-primary">Add Feed Type</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Close modal
        const closeModal = () => {
            document.body.removeChild(modal);
        };
        
        modal.querySelector('.modal-close').addEventListener('click', closeModal);
        modal.querySelector('.modal').addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
        
        // Handle form submission
        modal.querySelector('#add-feed-form').addEventListener('submit', (e) => {
            e.preventDefault();
            
            const feedType = modal.querySelector('#new-feed-type').value;
            const amount = parseFloat(modal.querySelector('#initial-amount').value);
            const threshold = parseFloat(modal.querySelector('#low-stock-threshold').value);
            const price = modal.querySelector('#feed-price').value;
            const supplier = modal.querySelector('#supplier').value;
            
            this.updateFeedInventory(feedType, amount, 'set');
            closeModal();
            this.setView('inventory'); // Refresh view
        });
    }
    
    renderReports() {
        const reports = document.createElement('div');
        reports.className = 'reports-view';
        
        const eggReport = this.getEggProductionReport(30);
        
        reports.innerHTML = `
            <div class="reports-header">
                <button class="btn-back" id="back-to-overview">
                    ← Back
                </button>
                <h2>Poultry Farm Reports</h2>
            </div>
            
            <div class="reports-grid">
                <div class="report-card">
                    <h3>Egg Production Report</h3>
                    <div class="report-stats">
                        <div class="stat-item">
                            <span class="stat-label">30-day Total</span>
                            <span class="stat-value">${eggReport.total}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Daily Average</span>
                            <span class="stat-value">${Math.round(eggReport.average)}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Best Day</span>
                            <span class="stat-value">${Math.max(...Object.values(eggReport.daily))}</span>
                        </div>
                    </div>
                    <div class="report-chart">
                        <h4>Daily Production (Last 7 days)</h4>
                        <div class="chart-bars">
                            ${Object.entries(eggReport.daily)
                                .slice(-7)
                                .map(([date, eggs]) => {
                                    const maxEggs = Math.max(...Object.values(eggReport.daily).slice(-7));
                                    const percentage = maxEggs > 0 ? (eggs / maxEggs) * 100 : 0;
                                    return `
                                        <div class="chart-bar-container">
                                            <div class="chart-bar" style="height: ${percentage}%">
                                                <span class="bar-value">${eggs}</span>
                                            </div>
                                            <div class="bar-label">${this.formatDateShort(date)}</div>
                                        </div>
                                    `;
                                }).join('')}
                        </div>
                    </div>
                </div>
                
                <div class="report-card">
                    <h3>Flock Health Report</h3>
                    <div class="health-summary">
                        <div class="health-stats">
                            <div class="health-stat healthy">
                                <span class="stat-label">Healthy Flocks</span>
                                <span class="stat-value">
                                    ${this.data.filter(f => f.healthStatus === 'healthy').length}
                                </span>
                            </div>
                            <div class="health-stat needs-checkup">
                                <span class="stat-label">Needs Checkup</span>
                                <span class="stat-value">
                                    ${this.data.filter(f => f.healthStatus === 'needs_checkup').length}
                                </span>
                            </div>
                            <div class="health-stat sick">
                                <span class="stat-label">Sick/Quarantined</span>
                                <span class="stat-value">
                                    ${this.data.filter(f => f.healthStatus === 'sick' || f.healthStatus === 'quarantined').length}
                                </span>
                            </div>
                        </div>
                        <div class="mortality-summary">
                            <h4>Average Mortality Rate</h4>
                            <div class="mortality-rate">
                                <span class="rate-value">${this.stats.mortalityRate.toFixed(2)}%</span>
                                <span class="rate-trend ${this.stats.mortalityRate < 3 ? 'good' : 'bad'}">
                                    ${this.stats.mortalityRate < 3 ? 'Good' : 'Needs Improvement'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="report-card">
                    <h3>Feed Consumption</h3>
                    <div class="feed-report">
                        <div class="report-item">
                            <span class="report-label">Total Feed On Hand</span>
                            <span class="report-value">${this.stats.feedOnHand} kg</span>
                        </div>
                        <div class="report-item">
                            <span class="report-label">Daily Consumption</span>
                            <span class="report-value">
                                ${this.data.reduce((sum, flock) => sum + (flock.dailyFeed || 0), 0)} kg
                            </span>
                        </div>
                        <div class="report-item">
                            <span class="report-label">Days Supply</span>
                            <span class="report-value">${this.calculateDaysSupply()}</span>
                        </div>
                    </div>
                    <div class="low-stock-report">
                        <h4>Low Stock Items</h4>
                        ${this.lowStockAlerts.length > 0 ? `
                            <div class="low-stock-list">
                                ${this.lowStockAlerts.map(alert => `
                                    <div class="stock-item">
                                        <span class="item-name">${alert.feedType}</span>
                                        <span class="item-amount">${alert.amount} kg</span>
                                    </div>
                                `).join('')}
                            </div>
                        ` : '<p class="no-alerts">No low stock items</p>'}
                    </div>
                </div>
                
                <div class="report-card">
                    <h3>Export Reports</h3>
                    <div class="export-options">
                        <button class="export-btn" id="export-egg-report">
                            <span class="export-icon">📥</span>
                            <span class="export-text">Egg Production Report</span>
                        </button>
                        <button class="export-btn" id="export-feed-report">
                            <span class="export-icon">📥</span>
                            <span class="export-text">Feed Consumption Report</span>
                        </button>
                        <button class="export-btn" id="export-health-report">
                            <span class="export-icon">📥</span>
                            <span class="export-text">Health Report</span>
                        </button>
                        <button class="export-btn" id="export-full-report">
                            <span class="export-icon">📥</span>
                            <span class="export-text">Complete Farm Report</span>
                        </button>
                    </div>
                    <div class="export-format">
                        <label>Format:</label>
                        <select id="export-format">
                            <option value="csv">CSV</option>
                            <option value="pdf">PDF</option>
                            <option value="excel">Excel</option>
                        </select>
                    </div>
                    <div class="export-period">
                        <label>Period:</label>
                        <select id="export-period">
                            <option value="7">Last 7 days</option>
                            <option value="30">Last 30 days</option>
                            <option value="90">Last 90 days</option>
                            <option value="custom">Custom Range</option>
                        </select>
                    </div>
                </div>
            </div>
        `;
        
        // Back button
        reports.querySelector('#back-to-overview').addEventListener('click', () => {
            this.setView('overview');
        });
        
        // Export buttons
        reports.querySelectorAll('.export-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const reportType = e.currentTarget.id.replace('export-', '').replace('-report', '');
                const format = reports.querySelector('#export-format').value;
                const period = reports.querySelector('#export-period').value;
                this.exportReport(reportType, format, period);
            });
        });
        
        return reports;
    }
    
    exportReport(reportType, format, period) {
        // This would be implemented to generate and download reports
        console.log(`Exporting ${reportType} report as ${format} for period: ${period}`);
        this.showNotification(`Generating ${reportType} report...`, 'info');
        
        // Simulate report generation
        setTimeout(() => {
            this.showNotification(`${reportType.charAt(0).toUpperCase() + reportType.slice(1)} report exported successfully`, 'success');
        }, 1000);
    }
}

export default PoultryDashboard;