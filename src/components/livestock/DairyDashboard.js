import './DairyDashboard.css';

class DairyDashboard {
    constructor(config = {}) {
        this.data = config.data || this.getDefaultData();
        this.onDataUpdate = config.onDataUpdate || (() => {});
        this.currentView = 'overview';
        this.selectedCow = null;
        
        // Initialize data if empty
        if (!this.data || this.data.length === 0) {
            this.data = this.getDefaultData();
        }
        
        this.init();
    }
    
    init() {
        console.log('DairyDashboard initialized with', this.data.length, 'cows');
        this.calculateStats();
    }
    
    getDefaultData() {
        return [
            {
                id: 'cow_001',
                name: 'Bella',
                tagNumber: 'D001',
                breed: 'Holstein',
                age: '4 years',
                weight: '650 kg',
                healthStatus: 'healthy',
                lastMilking: new Date().toISOString(),
                milkProduction: [
                    { date: '2024-01-15', amount: 24.5, time: 'morning' },
                    { date: '2024-01-15', amount: 22.3, time: 'evening' }
                ],
                breedingStatus: 'pregnant',
                expectedCalving: '2024-03-15',
                vaccinations: [
                    { type: 'BVD', date: '2024-01-01', nextDue: '2024-07-01' }
                ],
                notes: 'Good milk producer, calm temperament'
            },
            {
                id: 'cow_002',
                name: 'Daisy',
                tagNumber: 'D002',
                breed: 'Jersey',
                age: '3 years',
                weight: '450 kg',
                healthStatus: 'needs_checkup',
                lastMilking: new Date(Date.now() - 86400000).toISOString(),
                milkProduction: [
                    { date: '2024-01-15', amount: 18.2, time: 'morning' }
                ],
                breedingStatus: 'open',
                vaccinations: [
                    { type: 'BVD', date: '2023-12-15', nextDue: '2024-06-15' }
                ],
                notes: 'Slight drop in milk production'
            },
            {
                id: 'cow_003',
                name: 'Molly',
                tagNumber: 'D003',
                breed: 'Holstein',
                age: '5 years',
                weight: '700 kg',
                healthStatus: 'healthy',
                lastMilking: new Date().toISOString(),
                milkProduction: [
                    { date: '2024-01-15', amount: 26.8, time: 'morning' }
                ],
                breedingStatus: 'pregnant',
                expectedCalving: '2024-04-10',
                vaccinations: [
                    { type: 'BVD', date: '2024-01-05', nextDue: '2024-07-05' }
                ],
                notes: 'High producer, due for hoof trimming'
            }
        ];
    }
    
    calculateStats() {
        const stats = {
            totalCows: this.data.length,
            milkingToday: this.data.filter(cow => {
                const lastMilking = new Date(cow.lastMilking);
                const today = new Date();
                return lastMilking.toDateString() === today.toDateString();
            }).length,
            totalMilkToday: 0,
            averageProduction: 0,
            cowsNeedingAttention: this.data.filter(cow => cow.healthStatus !== 'healthy').length,
            pregnantCows: this.data.filter(cow => cow.breedingStatus === 'pregnant').length,
            dueThisMonth: 0
        };
        
        // Calculate today's milk production
        const today = new Date().toISOString().split('T')[0];
        this.data.forEach(cow => {
            if (cow.milkProduction) {
                cow.milkProduction.forEach(record => {
                    if (record.date === today) {
                        stats.totalMilkToday += record.amount;
                    }
                });
            }
        });
        
        // Calculate average production
        let totalProduction = 0;
        let recordCount = 0;
        this.data.forEach(cow => {
            if (cow.milkProduction) {
                cow.milkProduction.forEach(record => {
                    totalProduction += record.amount;
                    recordCount++;
                });
            }
        });
        
        stats.averageProduction = recordCount > 0 ? (totalProduction / recordCount).toFixed(1) : 0;
        
        // Calculate cows due this month
        const currentMonth = new Date().getMonth();
        this.data.forEach(cow => {
            if (cow.expectedCalving) {
                const dueDate = new Date(cow.expectedCalving);
                if (dueDate.getMonth() === currentMonth) {
                    stats.dueThisMonth++;
                }
            }
        });
        
        this.stats = stats;
        return stats;
    }
    
    addCow(cowData) {
        const newCow = {
            id: 'cow_' + Date.now(),
            ...cowData,
            healthStatus: cowData.healthStatus || 'healthy',
            lastMilking: new Date().toISOString(),
            milkProduction: [],
            createdAt: new Date().toISOString()
        };
        
        this.data.push(newCow);
        this.calculateStats();
        this.onDataUpdate(this.data);
        
        // Show success message
        this.showNotification('Cow added successfully', 'success');
        
        return newCow;
    }
    
    updateCow(cowId, updates) {
        const index = this.data.findIndex(cow => cow.id === cowId);
        if (index !== -1) {
            this.data[index] = { ...this.data[index], ...updates };
            this.calculateStats();
            this.onDataUpdate(this.data);
            
            this.showNotification('Cow information updated', 'success');
            return this.data[index];
        }
        return null;
    }
    
    recordMilking(cowId, amount, time = 'morning') {
        const cow = this.data.find(c => c.id === cowId);
        if (!cow) {
            this.showNotification('Cow not found', 'error');
            return null;
        }
        
        const today = new Date().toISOString().split('T')[0];
        const milkingRecord = {
            date: today,
            amount: parseFloat(amount),
            time: time,
            recordedAt: new Date().toISOString()
        };
        
        if (!cow.milkProduction) {
            cow.milkProduction = [];
        }
        
        cow.milkProduction.push(milkingRecord);
        cow.lastMilking = new Date().toISOString();
        
        this.calculateStats();
        this.onDataUpdate(this.data);
        
        this.showNotification(`Recorded ${amount}L milk for ${cow.name}`, 'success');
        
        return milkingRecord;
    }
    
    updateHealthStatus(cowId, status, notes = '') {
        const cow = this.data.find(c => c.id === cowId);
        if (!cow) return null;
        
        const previousStatus = cow.healthStatus;
        cow.healthStatus = status;
        
        if (notes) {
            if (!cow.healthNotes) cow.healthNotes = [];
            cow.healthNotes.push({
                date: new Date().toISOString(),
                status: status,
                notes: notes,
                previousStatus: previousStatus
            });
        }
        
        this.calculateStats();
        this.onDataUpdate(this.data);
        
        if (status !== 'healthy') {
            this.showNotification(`Health alert: ${cow.name} needs attention`, 'warning');
        }
        
        return cow;
    }
    
    getCow(cowId) {
        return this.data.find(cow => cow.id === cowId);
    }
    
    getCowsByStatus(status) {
        return this.data.filter(cow => cow.healthStatus === status);
    }
    
    getMilkProductionReport(days = 7) {
        const report = {
            daily: {},
            total: 0,
            average: 0
        };
        
        // Generate dates for the last N days
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            report.daily[dateStr] = 0;
        }
        
        // Calculate production for each day
        this.data.forEach(cow => {
            if (cow.milkProduction) {
                cow.milkProduction.forEach(record => {
                    if (report.daily[record.date] !== undefined) {
                        report.daily[record.date] += record.amount;
                        report.total += record.amount;
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
    
    selectCow(cowId) {
        this.selectedCow = this.getCow(cowId);
        this.setView('detail');
    }
    
    render() {
        const container = document.createElement('div');
        container.className = 'dairy-dashboard';
        
        // Calculate stats if not already calculated
        if (!this.stats) {
            this.calculateStats();
        }
        
        switch (this.currentView) {
            case 'overview':
                container.appendChild(this.renderOverview());
                break;
            case 'detail':
                if (this.selectedCow) {
                    container.appendChild(this.renderCowDetail(this.selectedCow));
                } else {
                    container.appendChild(this.renderOverview());
                }
                break;
            case 'add':
                container.appendChild(this.renderAddCowForm());
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
        overview.className = 'dairy-overview';
        
        overview.innerHTML = `
            <div class="dashboard-header">
                <h2><span class="icon">🐄</span> Dairy Farm Dashboard</h2>
                <div class="header-actions">
                    <button class="btn btn-primary" id="add-cow-btn">
                        <span class="btn-icon">+</span> Add New Cow
                    </button>
                    <button class="btn btn-secondary" id="milk-recording-btn">
                        <span class="btn-icon">🥛</span> Record Milking
                    </button>
                </div>
            </div>
            
            <div class="stats-grid">
                <div class="stat-card stat-total">
                    <div class="stat-icon">🐮</div>
                    <div class="stat-content">
                        <div class="stat-value">${this.stats.totalCows}</div>
                        <div class="stat-label">Total Cattle</div>
                    </div>
                </div>
                
                <div class="stat-card stat-milk">
                    <div class="stat-icon">🥛</div>
                    <div class="stat-content">
                        <div class="stat-value">${this.stats.totalMilkToday}L</div>
                        <div class="stat-label">Today's Milk</div>
                    </div>
                </div>
                
                <div class="stat-card stat-health">
                    <div class="stat-icon">❤️</div>
                    <div class="stat-content">
                        <div class="stat-value">${this.stats.cowsNeedingAttention}</div>
                        <div class="stat-label">Needs Attention</div>
                    </div>
                </div>
                
                <div class="stat-card stat-pregnant">
                    <div class="stat-icon">🤰</div>
                    <div class="stat-content">
                        <div class="stat-value">${this.stats.pregnantCows}</div>
                        <div class="stat-label">Pregnant</div>
                    </div>
                </div>
            </div>
            
            <div class="dashboard-sections">
                <div class="section">
                    <div class="section-header">
                        <h3>Recent Milking Records</h3>
                        <button class="btn-text" id="view-all-milking">View All</button>
                    </div>
                    <div class="section-content">
                        ${this.renderRecentMilking()}
                    </div>
                </div>
                
                <div class="section">
                    <div class="section-header">
                        <h3>Cattle Needing Attention</h3>
                    </div>
                    <div class="section-content">
                        ${this.renderAttentionList()}
                    </div>
                </div>
                
                <div class="section">
                    <div class="section-header">
                        <h3>Upcoming Calvings</h3>
                        <button class="btn-text" id="view-breeding-schedule">Full Schedule</button>
                    </div>
                    <div class="section-content">
                        ${this.renderCalvingSchedule()}
                    </div>
                </div>
            </div>
            
            <div class="quick-actions">
                <h3>Quick Actions</h3>
                <div class="action-buttons">
                    <button class="action-btn" id="quick-milk-record">
                        <span class="action-icon">📝</span>
                        <span class="action-text">Quick Milk Record</span>
                    </button>
                    <button class="action-btn" id="health-check">
                        <span class="action-icon">🏥</span>
                        <span class="action-text">Health Check</span>
                    </button>
                    <button class="action-btn" id="feed-tracker">
                        <span class="action-icon">🌾</span>
                        <span class="action-text">Feed Tracker</span>
                    </button>
                    <button class="action-btn" id="generate-report">
                        <span class="action-icon">📊</span>
                        <span class="action-text">Generate Report</span>
                    </button>
                </div>
            </div>
        `;
        
        // Add event listeners
        overview.querySelector('#add-cow-btn').addEventListener('click', () => {
            this.setView('add');
        });
        
        overview.querySelector('#milk-recording-btn').addEventListener('click', () => {
            this.showMilkRecordingModal();
        });
        
        // Add more event listeners as needed
        
        return overview;
    }
    
    renderRecentMilking() {
        const recentRecords = [];
        
        this.data.forEach(cow => {
            if (cow.milkProduction && cow.milkProduction.length > 0) {
                const latest = cow.milkProduction[cow.milkProduction.length - 1];
                recentRecords.push({
                    cowName: cow.name,
                    amount: latest.amount,
                    time: latest.time,
                    date: latest.date
                });
            }
        });
        
        // Sort by date (newest first)
        recentRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Take only last 5
        const displayRecords = recentRecords.slice(0, 5);
        
        if (displayRecords.length === 0) {
            return '<p class="empty-state">No milking records yet</p>';
        }
        
        let html = '<div class="records-list">';
        displayRecords.forEach(record => {
            html += `
                <div class="record-item">
                    <div class="record-cow">${record.cowName}</div>
                    <div class="record-details">
                        <span class="record-amount">${record.amount}L</span>
                        <span class="record-time">${record.time}</span>
                    </div>
                    <div class="record-date">${this.formatDate(record.date)}</div>
                </div>
            `;
        });
        html += '</div>';
        
        return html;
    }
    
    renderAttentionList() {
        const cowsNeedingAttention = this.getCowsByStatus('needs_checkup')
            .concat(this.getCowsByStatus('sick'));
        
        if (cowsNeedingAttention.length === 0) {
            return '<p class="empty-state">All cows are healthy! 🎉</p>';
        }
        
        let html = '<div class="attention-list">';
        cowsNeedingAttention.forEach(cow => {
            html += `
                <div class="attention-item" data-cow-id="${cow.id}">
                    <div class="attention-cow">
                        <span class="cow-name">${cow.name}</span>
                        <span class="cow-tag">${cow.tagNumber}</span>
                    </div>
                    <div class="attention-status">
                        <span class="status-badge ${cow.healthStatus}">${cow.healthStatus.replace('_', ' ')}</span>
                    </div>
                    <button class="btn-small btn-outline" data-action="view-detail">View</button>
                </div>
            `;
        });
        html += '</div>';
        
        return html;
    }
    
    renderCalvingSchedule() {
        const pregnantCows = this.data.filter(cow => cow.breedingStatus === 'pregnant' && cow.expectedCalving);
        
        if (pregnantCows.length === 0) {
            return '<p class="empty-state">No upcoming calvings</p>';
        }
        
        // Sort by due date
        pregnantCows.sort((a, b) => new Date(a.expectedCalving) - new Date(b.expectedCalving));
        
        let html = '<div class="calving-list">';
        pregnantCows.forEach(cow => {
            const dueDate = new Date(cow.expectedCalving);
            const today = new Date();
            const daysUntil = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
            
            html += `
                <div class="calving-item">
                    <div class="calving-cow">
                        <span class="cow-name">${cow.name}</span>
                        <span class="cow-breed">${cow.breed}</span>
                    </div>
                    <div class="calving-due">
                        <span class="due-date">${this.formatDate(cow.expectedCalving)}</span>
                        <span class="due-days ${daysUntil <= 7 ? 'due-soon' : ''}">
                            ${daysUntil} days
                        </span>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        
        return html;
    }
    
    renderCowDetail(cow) {
        const detail = document.createElement('div');
        detail.className = 'cow-detail';
        
        const today = new Date().toISOString().split('T')[0];
        const todayMilk = cow.milkProduction 
            ? cow.milkProduction
                .filter(record => record.date === today)
                .reduce((sum, record) => sum + record.amount, 0)
            : 0;
        
        detail.innerHTML = `
            <div class="detail-header">
                <button class="btn-back" id="back-to-overview">
                    ← Back
                </button>
                <h2>${cow.name}</h2>
                <div class="header-actions">
                    <button class="btn btn-secondary" id="edit-cow-btn">Edit</button>
                </div>
            </div>
            
            <div class="cow-profile">
                <div class="profile-header">
                    <div class="profile-icon">🐄</div>
                    <div class="profile-info">
                        <h3>${cow.name} <span class="tag-number">${cow.tagNumber}</span></h3>
                        <div class="profile-details">
                            <span class="detail-item">
                                <span class="detail-label">Breed:</span>
                                <span class="detail-value">${cow.breed}</span>
                            </span>
                            <span class="detail-item">
                                <span class="detail-label">Age:</span>
                                <span class="detail-value">${cow.age}</span>
                            </span>
                            <span class="detail-item">
                                <span class="detail-label">Weight:</span>
                                <span class="detail-value">${cow.weight}</span>
                            </span>
                        </div>
                    </div>
                    <div class="profile-status">
                        <span class="status-badge large ${cow.healthStatus}">
                            ${cow.healthStatus.replace('_', ' ')}
                        </span>
                    </div>
                </div>
                
                <div class="detail-grid">
                    <div class="detail-card">
                        <h4>Today's Milk Production</h4>
                        <div class="detail-value large">${todayMilk}L</div>
                        <button class="btn-small" id="record-milk-btn">Record Milking</button>
                    </div>
                    
                    <div class="detail-card">
                        <h4>Breeding Status</h4>
                        <div class="detail-value">${cow.breedingStatus}</div>
                        ${cow.expectedCalving ? `
                            <div class="detail-subtext">
                                Due: ${this.formatDate(cow.expectedCalving)}
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="detail-card">
                        <h4>Last Milking</h4>
                        <div class="detail-value">
                            ${cow.lastMilking ? this.formatDate(cow.lastMilking) : 'Never'}
                        </div>
                    </div>
                    
                    <div class="detail-card">
                        <h4>Avg. Milk/Day</h4>
                        <div class="detail-value">
                            ${this.calculateAverageMilk(cow).toFixed(1)}L
                        </div>
                    </div>
                </div>
                
                <div class="detail-tabs">
                    <button class="tab-btn active" data-tab="milk-history">Milk History</button>
                    <button class="tab-btn" data-tab="health-history">Health History</button>
                    <button class="tab-btn" data-tab="notes">Notes</button>
                </div>
                
                <div class="tab-content active" id="milk-history">
                    ${this.renderMilkHistory(cow)}
                </div>
                
                <div class="tab-content" id="health-history">
                    ${this.renderHealthHistory(cow)}
                </div>
                
                <div class="tab-content" id="notes">
                    <div class="notes-content">
                        <p>${cow.notes || 'No notes available'}</p>
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
        
        detail.querySelector('#record-milk-btn').addEventListener('click', () => {
            this.showMilkRecordingModal(cow.id);
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
    
    renderMilkHistory(cow) {
        if (!cow.milkProduction || cow.milkProduction.length === 0) {
            return '<p class="empty-state">No milk production records</p>';
        }
        
        // Group by date
        const groupedByDate = {};
        cow.milkProduction.forEach(record => {
            if (!groupedByDate[record.date]) {
                groupedByDate[record.date] = {
                    morning: 0,
                    evening: 0,
                    total: 0
                };
            }
            
            if (record.time === 'morning') {
                groupedByDate[record.date].morning = record.amount;
            } else if (record.time === 'evening') {
                groupedByDate[record.date].evening = record.amount;
            }
            
            groupedByDate[record.date].total += record.amount;
        });
        
        // Convert to array and sort by date (newest first)
        const dates = Object.keys(groupedByDate)
            .sort((a, b) => new Date(b) - new Date(a))
            .slice(0, 10); // Show last 10 days
        
        let html = `
            <div class="milk-history">
                <div class="history-header">
                    <span>Date</span>
                    <span>Morning</span>
                    <span>Evening</span>
                    <span>Total</span>
                </div>
                <div class="history-list">
        `;
        
        dates.forEach(date => {
            const dayData = groupedByDate[date];
            html += `
                <div class="history-item">
                    <span class="history-date">${this.formatDate(date)}</span>
                    <span class="history-amount ${dayData.morning > 0 ? 'has-data' : 'no-data'}">
                        ${dayData.morning > 0 ? `${dayData.morning}L` : '-'}
                    </span>
                    <span class="history-amount ${dayData.evening > 0 ? 'has-data' : 'no-data'}">
                        ${dayData.evening > 0 ? `${dayData.evening}L` : '-'}
                    </span>
                    <span class="history-total">${dayData.total}L</span>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
        
        return html;
    }
    
    renderHealthHistory(cow) {
        if (!cow.healthNotes || cow.healthNotes.length === 0) {
            return '<p class="empty-state">No health records</p>';
        }
        
        let html = '<div class="health-history">';
        
        // Sort by date (newest first)
        const sortedNotes = [...cow.healthNotes].sort((a, b) => 
            new Date(b.date) - new Date(a.date)
        );
        
        sortedNotes.forEach(note => {
            html += `
                <div class="health-item">
                    <div class="health-date">${this.formatDate(note.date)}</div>
                    <div class="health-status">
                        <span class="status-badge small ${note.status}">
                            ${note.status.replace('_', ' ')}
                        </span>
                    </div>
                    <div class="health-notes">${note.notes}</div>
                </div>
            `;
        });
        
        html += '</div>';
        
        return html;
    }
    
    calculateAverageMilk(cow) {
        if (!cow.milkProduction || cow.milkProduction.length === 0) return 0;
        
        const total = cow.milkProduction.reduce((sum, record) => sum + record.amount, 0);
        return total / cow.milkProduction.length;
    }
    
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }
    
    showMilkRecordingModal(cowId = null) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Record Milking</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="milk-recording-form">
                        <div class="form-group">
                            <label for="cow-select">Select Cow</label>
                            <select id="cow-select" required>
                                <option value="">Choose a cow</option>
                                ${this.data.map(cow => `
                                    <option value="${cow.id}" ${cowId === cow.id ? 'selected' : ''}>
                                        ${cow.name} (${cow.tagNumber})
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="milk-amount">Amount (Liters)</label>
                            <input type="number" 
                                   id="milk-amount" 
                                   step="0.1" 
                                   min="0" 
                                   max="50" 
                                   placeholder="e.g., 24.5" 
                                   required>
                        </div>
                        
                        <div class="form-group">
                            <label for="milk-time">Time of Milking</label>
                            <select id="milk-time" required>
                                <option value="morning">Morning</option>
                                <option value="evening">Evening</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="milk-date">Date</label>
                            <input type="date" 
                                   id="milk-date" 
                                   value="${new Date().toISOString().split('T')[0]}" 
                                   required>
                        </div>
                        
                        <div class="form-group">
                            <label for="milk-notes">Notes (Optional)</label>
                            <textarea id="milk-notes" 
                                      placeholder="Any observations about the milk..."></textarea>
                        </div>
                        
                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary modal-close">Cancel</button>
                            <button type="submit" class="btn btn-primary">Record Milking</button>
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
        modal.querySelector('#milk-recording-form').addEventListener('submit', (e) => {
            e.preventDefault();
            
            const cowId = modal.querySelector('#cow-select').value;
            const amount = parseFloat(modal.querySelector('#milk-amount').value);
            const time = modal.querySelector('#milk-time').value;
            const date = modal.querySelector('#milk-date').value;
            const notes = modal.querySelector('#milk-notes').value;
            
            this.recordMilking(cowId, amount, time);
            closeModal();
        });
    }
    
    renderAddCowForm() {
        const form = document.createElement('div');
        form.className = 'add-cow-form';
        
        form.innerHTML = `
            <div class="form-header">
                <button class="btn-back" id="back-to-overview">
                    ← Back
                </button>
                <h2>Add New Cow</h2>
            </div>
            
            <form id="new-cow-form">
                <div class="form-section">
                    <h3>Basic Information</h3>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="cow-name">Name *</label>
                            <input type="text" 
                                   id="cow-name" 
                                   placeholder="e.g., Bella" 
                                   required>
                        </div>
                        
                        <div class="form-group">
                            <label for="tag-number">Tag Number *</label>
                            <input type="text" 
                                   id="tag-number" 
                                   placeholder="e.g., D001" 
                                   required>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="breed">Breed</label>
                            <select id="breed">
                                <option value="Holstein">Holstein</option>
                                <option value="Jersey">Jersey</option>
                                <option value="Guernsey">Guernsey</option>
                                <option value="Brown Swiss">Brown Swiss</option>
                                <option value="Ayrshire">Ayrshire</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="age">Age</label>
                            <input type="text" 
                                   id="age" 
                                   placeholder="e.g., 3 years">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="weight">Weight (kg)</label>
                        <input type="number" 
                               id="weight" 
                               placeholder="e.g., 650">
                    </div>
                </div>
                
                <div class="form-section">
                    <h3>Health & Status</h3>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="health-status">Health Status</label>
                            <select id="health-status">
                                <option value="healthy">Healthy</option>
                                <option value="needs_checkup">Needs Checkup</option>
                                <option value="sick">Sick</option>
                                <option value="recovering">Recovering</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="breeding-status">Breeding Status</label>
                            <select id="breeding-status">
                                <option value="open">Open</option>
                                <option value="pregnant">Pregnant</option>
                                <option value="dry">Dry</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-group" id="due-date-container" style="display: none;">
                        <label for="expected-calving">Expected Calving Date</label>
                        <input type="date" id="expected-calving">
                    </div>
                    
                    <div class="form-group">
                        <label for="last-calving">Last Calving Date (Optional)</label>
                        <input type="date" id="last-calving">
                    </div>
                </div>
                
                <div class="form-section">
                    <h3>Additional Information</h3>
                    
                    <div class="form-group">
                        <label for="notes">Notes</label>
                        <textarea id="notes" 
                                  placeholder="Any additional information about the cow..."
                                  rows="3"></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label for="vaccinations">Vaccinations (Optional)</label>
                        <textarea id="vaccinations" 
                                  placeholder="List vaccinations with dates..."
                                  rows="2"></textarea>
                    </div>
                </div>
                
                <div class="form-actions">
                    <button type="reset" class="btn btn-secondary">Clear Form</button>
                    <button type="submit" class="btn btn-primary">Add Cow</button>
                </div>
            </form>
        `;
        
        // Show/hide due date based on breeding status
        const breedingStatus = form.querySelector('#breeding-status');
        const dueDateContainer = form.querySelector('#due-date-container');
        
        breedingStatus.addEventListener('change', () => {
            if (breedingStatus.value === 'pregnant') {
                dueDateContainer.style.display = 'block';
            } else {
                dueDateContainer.style.display = 'none';
            }
        });
        
        // Back button
        form.querySelector('#back-to-overview').addEventListener('click', () => {
            this.setView('overview');
        });
        
        // Form submission
        form.querySelector('#new-cow-form').addEventListener('submit', (e) => {
            e.preventDefault();
            
            const cowData = {
                name: form.querySelector('#cow-name').value,
                tagNumber: form.querySelector('#tag-number').value,
                breed: form.querySelector('#breed').value,
                age: form.querySelector('#age').value,
                weight: form.querySelector('#weight').value,
                healthStatus: form.querySelector('#health-status').value,
                breedingStatus: form.querySelector('#breeding-status').value,
                notes: form.querySelector('#notes').value
            };
            
            if (breedingStatus.value === 'pregnant') {
                cowData.expectedCalving = form.querySelector('#expected-calving').value;
            }
            
            if (form.querySelector('#last-calving').value) {
                cowData.lastCalving = form.querySelector('#last-calving').value;
            }
            
            if (form.querySelector('#vaccinations').value) {
                cowData.vaccinations = form.querySelector('#vaccinations').value
                    .split('\n')
                    .filter(v => v.trim())
                    .map(v => ({
                        type: v,
                        date: new Date().toISOString().split('T')[0],
                        nextDue: this.calculateNextDueDate(v)
                    }));
            }
            
            this.addCow(cowData);
            this.setView('overview');
        });
        
        return form;
    }
    
    calculateNextDueDate(vaccinationType) {
        // Simple logic - 6 months from now for most vaccines
        const nextDue = new Date();
        nextDue.setMonth(nextDue.getMonth() + 6);
        return nextDue.toISOString().split('T')[0];
    }
    
    renderReports() {
        const reports = document.createElement('div');
        reports.className = 'reports-view';
        
        const milkReport = this.getMilkProductionReport(30);
        
        reports.innerHTML = `
            <div class="reports-header">
                <button class="btn-back" id="back-to-overview">
                    ← Back
                </button>
                <h2>Reports & Analytics</h2>
            </div>
            
            <div class="reports-grid">
                <div class="report-card">
                    <h3>Monthly Milk Production</h3>
                    <div class="report-stats">
                        <div class="stat-item">
                            <span class="stat-label">Total This Month</span>
                            <span class="stat-value">${milkReport.total.toFixed(1)}L</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Daily Average</span>
                            <span class="stat-value">${milkReport.average.toFixed(1)}L</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Best Day</span>
                            <span class="stat-value">${Math.max(...Object.values(milkReport.daily)).toFixed(1)}L</span>
                        </div>
                    </div>
                    <div class="report-chart">
                        <!-- Milk production chart would go here -->
                        <div class="chart-placeholder">
                            <p>Milk production chart</p>
                            <div class="chart-bars">
                                ${Object.entries(milkReport.daily).map(([date, amount]) => `
                                    <div class="chart-bar" style="height: ${(amount / 100) * 100}%">
                                        <span class="bar-value">${amount.toFixed(0)}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="report-card">
                    <h3>Health Overview</h3>
                    <div class="health-summary">
                        <div class="health-stats">
                            <div class="health-stat healthy">
                                <span class="stat-label">Healthy</span>
                                <span class="stat-value">
                                    ${this.data.filter(c => c.healthStatus === 'healthy').length}
                                </span>
                            </div>
                            <div class="health-stat needs-checkup">
                                <span class="stat-label">Needs Checkup</span>
                                <span class="stat-value">
                                    ${this.data.filter(c => c.healthStatus === 'needs_checkup').length}
                                </span>
                            </div>
                            <div class="health-stat sick">
                                <span class="stat-label">Sick</span>
                                <span class="stat-value">
                                    ${this.data.filter(c => c.healthStatus === 'sick').length}
                                </span>
                            </div>
                        </div>
                        <div class="health-chart">
                            <!-- Health chart would go here -->
                            <div class="chart-placeholder">
                                <p>Health status distribution</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="report-card">
                    <h3>Breeding Report</h3>
                    <div class="breeding-report">
                        <div class="report-item">
                            <span class="report-label">Pregnant Cows</span>
                            <span class="report-value">${this.stats.pregnantCows}</span>
                        </div>
                        <div class="report-item">
                            <span class="report-label">Due This Month</span>
                            <span class="report-value">${this.stats.dueThisMonth}</span>
                        </div>
                        <div class="report-item">
                            <span class="report-label">Calving Rate</span>
                            <span class="report-value">
                                ${((this.stats.pregnantCows / this.stats.totalCows) * 100).toFixed(1)}%
                            </span>
                        </div>
                    </div>
                    <div class="upcoming-carvings">
                        <h4>Upcoming Calvings</h4>
                        <div class="calving-list">
                            ${this.data
                                .filter(cow => cow.breedingStatus === 'pregnant' && cow.expectedCalving)
                                .sort((a, b) => new Date(a.expectedCalving) - new Date(b.expectedCalving))
                                .slice(0, 3)
                                .map(cow => `
                                    <div class="calving-item">
                                        <span class="cow-name">${cow.name}</span>
                                        <span class="due-date">${this.formatDate(cow.expectedCalving)}</span>
                                    </div>
                                `).join('')}
                        </div>
                    </div>
                </div>
                
                <div class="report-card">
                    <h3>Export Reports</h3>
                    <div class="export-options">
                        <button class="export-btn" id="export-milk-report">
                            <span class="export-icon">📥</span>
                            <span class="export-text">Milk Production Report</span>
                        </button>
                        <button class="export-btn" id="export-health-report">
                            <span class="export-icon">📥</span>
                            <span class="export-text">Health Report</span>
                        </button>
                        <button class="export-btn" id="export-breeding-report">
                            <span class="export-icon">📥</span>
                            <span class="export-text">Breeding Report</span>
                        </button>
                        <button class="export-btn" id="export-full-report">
                            <span class="export-icon">📥</span>
                            <span class="export-text">Full Farm Report</span>
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
                this.exportReport(reportType, format);
            });
        });
        
        return reports;
    }
    
    exportReport(reportType, format) {
        // This would be implemented to generate and download reports
        console.log(`Exporting ${reportType} report as ${format}`);
        this.showNotification(`Generating ${reportType} report...`, 'info');
        
        // Simulate report generation
        setTimeout(() => {
            this.showNotification(`${reportType.charAt(0).toUpperCase() + reportType.slice(1)} report exported successfully`, 'success');
        }, 1000);
    }
}

export default DairyDashboard;