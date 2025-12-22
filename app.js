import { DB } from './db.js';
import { Utils } from './utils.js';
import { loadSampleData } from './sample-data.js';

const App = {
    state: {
        livestock: localStorage.getItem('ft_livestock') || null,
        theme: localStorage.getItem('ft_theme') || 'light',
        currency: localStorage.getItem('ft_currency') || 'KSh', // Load saved currency
        chartInstance: null  
    },

    init() {
        this.applyTheme();
        this.bindEvents();

        // Set the currency input value in settings
        const curInput = document.getElementById('currency-input');
        if(curInput) curInput.value = this.state.currency;
        
        if (this.state.livestock) {
            this.loadAppShell();
        } else {
            // Wait for DB, then load sample, then stay on landing
            loadSampleData(); 
        }

        // Service Worker Communication for Sync (stub)
        window.addEventListener('online', this.syncToCloud);
    },

    bindEvents() {
    // 1. IMPROVED NAVIGATION HANDLER
    const navButtons = document.querySelectorAll('.nav-btn');
    
    navButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Prevent default behavior and stop event bubbling
            e.preventDefault();
            e.stopPropagation();

            // Get the target ID from the clicked button's data-target attribute
            const targetId = btn.getAttribute('data-target');
            console.log("Navigating to:", targetId); // Debug Log

            if (targetId) {
                this.switchTab(targetId, btn);
            }
        });
    });

    // 2. THEME TOGGLE
    document.getElementById('theme-toggle')?.addEventListener('click', () => {
        this.state.theme = this.state.theme === 'light' ? 'dark' : 'light';
        localStorage.setItem('ft_theme', this.state.theme);
        this.applyTheme();
    });

    // 3. HOME BUTTON
    document.getElementById('home-btn')?.addEventListener('click', () => {
        this.state.livestock = null;
        localStorage.removeItem('ft_livestock');
        document.getElementById('app-shell').classList.add('hidden');
        document.getElementById('landing-page').classList.remove('hidden');
    });

        // Bottom Nav
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.currentTarget.dataset.target;
                this.switchTab(target, e.currentTarget);
            });
        });

        // Add Record Form
        document.getElementById('add-record-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());
            
            // Normalize numbers
            ['quantity', 'feedKg', 'weightKg', 'mortality', 'births', 'birdsCount'].forEach(k => {
                if(data[k]) data[k] = parseFloat(data[k]);
            });

            const record = {
                id: Utils.uuid(),
                livestock: this.state.livestock,
                createdAt: Date.now(),
                ...data
            };

            await DB.add('records', record);
            e.target.reset();
            alert('Record saved');
            this.refreshDashboard();
        });

        // Add Transaction Form
        document.getElementById('add-transaction-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());
            data.amount = parseFloat(data.amount);
            
            const trans = {
                id: Utils.uuid(),
                livestock: this.state.livestock,
                createdAt: Date.now(),
                ...data
            };

            await DB.add('transactions', trans);
            e.target.reset();
            alert('Transaction saved');
            this.loadFinance();
        });

        // Records Filter & Actions
        document.getElementById('record-filter-date').addEventListener('change', () => this.loadRecords());
        
        // Reports
        document.getElementById('generate-pdf-btn').addEventListener('click', () => this.generateReport());
        document.getElementById('export-csv-btn').addEventListener('click', async () => {
            const records = await DB.getAll('records', 'livestock', this.state.livestock);
            Utils.downloadCSV(records, `farmtrack_${this.state.livestock}.csv`);
        });
        
        // Backup/Restore
        document.getElementById('backup-btn').addEventListener('click', async () => {
            const data = await DB.dump();
            const blob = new Blob([JSON.stringify(data)], {type: 'application/json'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'farmtrack_backup.json';
            a.click();
        });

        document.getElementById('restore-btn').addEventListener('click', () => document.getElementById('restore-file').click());
        document.getElementById('restore-file').addEventListener('change', (e) => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = async (ev) => {
                try {
                    const data = JSON.parse(ev.target.result);
                    await DB.restore(data);
                    alert('Restore complete. Reloading...');
                    location.reload();
                } catch(err) {
                    alert('Invalid backup file');
                }
            };
            reader.readAsText(file);
        });
    },

    applyTheme() {
        if (this.state.theme === 'dark') document.body.classList.add('dark-mode');
        else document.body.classList.remove('dark-mode');
    },

    selectLivestock(type) {
        this.state.livestock = type;
        localStorage.setItem('ft_livestock', type);
        this.loadAppShell();
    },

    async loadAppShell() {
        // Load Data First
        await loadSampleData();

        document.getElementById('landing-page').classList.add('hidden');
        document.getElementById('app-shell').classList.remove('hidden');
        
        // Update Title
        const titles = { dairy: 'Dairy Farm', poultry: 'Poultry Farm', pig: 'Pig Farm', goat: 'Goat Farm' };
        document.getElementById('header-title').innerText = titles[this.state.livestock];

        // Setup Forms
        this.renderAddForm();

        // Load Default View
        this.switchTab('view-dashboard', document.querySelector('[data-target="view-dashboard"]'));
    },

    switchTab(viewId, btnElement) {
        console.log("Switching view to:", viewId);
    
        // Remove 'active' class from all views
        document.querySelectorAll('.tab-view').forEach(view => {
            view.classList.remove('active');
            view.style.display = 'none'; // Explicitly hide
        });
    
        // Add 'active' class to the target view
        const targetView = document.getElementById(viewId);
        if (targetView) {
            targetView.classList.add('active');
            targetView.style.display = 'block'; // Explicitly show
        } else {
            console.error("Could not find view with ID:", viewId);
        }
    
        // Update Button Styles
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        if (btnElement) {
            btnElement.classList.add('active');
        }
    
        // Trigger data loading based on view
        if (viewId === 'view-dashboard') this.refreshDashboard();
        if (viewId === 'view-records') this.loadRecords();
        if (viewId === 'view-finance') this.loadFinance();
    },

    renderAddForm() {
        const container = document.getElementById('dynamic-fields');
        const type = this.state.livestock;
        let html = `<div class="form-group"><input type="date" name="date" required value="${new Date().toISOString().split('T')[0]}"></div>`;

        if (type === 'dairy') {
            html += `
                <div class="form-group"><input type="text" name="cowId" placeholder="Cow ID" required></div>
                <div class="form-group"><select name="session"><option value="morning">Morning</option><option value="evening">Evening</option></select></div>
                <div class="form-group"><input type="number" name="quantity" placeholder="Milk (Liters)" step="0.1" required></div>
                <div class="form-group"><input type="number" name="feedKg" placeholder="Feed (Kg)" step="0.1"></div>
            `;
        } else if (type === 'poultry') {
            html += `
                <div class="form-group"><input type="text" name="flockId" placeholder="Flock ID"></div>
                <div class="form-group"><input type="number" name="quantity" placeholder="Eggs Collected" required></div>
                <div class="form-group"><input type="number" name="mortality" placeholder="Mortality (Dead birds)"></div>
                <div class="form-group"><input type="number" name="feedKg" placeholder="Feed (Kg)"></div>
            `;
        } else if (type === 'pig') {
            html += `
                <div class="form-group"><input type="text" name="pigId" placeholder="Pig ID"></div>
                <div class="form-group"><input type="number" name="weightKg" placeholder="Weight (Kg)"></div>
                <div class="form-group"><input type="number" name="pigletsBorn" placeholder="Piglets Born"></div>
                <div class="form-group"><input type="number" name="feedKg" placeholder="Feed (Kg)"></div>
            `;
        } else if (type === 'goat') {
            html += `
                <div class="form-group"><input type="text" name="goatId" placeholder="Goat ID"></div>
                <div class="form-group"><input type="number" name="quantity" placeholder="Milk (L)" step="0.1"></div>
                <div class="form-group"><input type="number" name="weightKg" placeholder="Weight (Kg)"></div>
                <div class="form-group"><input type="number" name="feedKg" placeholder="Feed (Kg)"></div>
            `;
        }
        
        html += `<div class="form-group"><textarea name="notes" placeholder="Notes / Medication"></textarea></div>`;
        container.innerHTML = html;
    },

    async refreshDashboard() {

        // 1. Fetch both records and transactions
        const records = await DB.getAll('records', 'livestock', this.state.livestock);
        const trans = await DB.getAll('transactions', 'livestock', this.state.livestock);
        
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        // 2. Filter data for the current month
        const thisMonthRecs = records.filter(r => {
            const d = new Date(r.date);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });

        const thisMonthTrans = trans.filter(t => {
            const d = new Date(t.date);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });

        // 3. Calculate Production and Feed totals
        let totalProd = 0, totalFeed = 0;
        let unit = this.state.livestock === 'dairy' ? 'L' : (this.state.livestock === 'poultry' ? 'Eggs' : 'Kg');

        thisMonthRecs.forEach(r => {
            totalProd += (r.quantity || 0);
            totalFeed += (r.feedKg || 0);
        });

        // 4. Calculate Financial totals
        let totalIncome = 0, totalExpense = 0;
        thisMonthTrans.forEach(t => {
            if (t.type === 'income') totalIncome += t.amount;
            else totalExpense += t.amount;
        });

        // 5. Render the new KPI Cards
        document.getElementById('kpi-container').innerHTML = `
            <div class="kpi-card">
                <h4>Production (${unit})</h4>
                <div class="value">${totalProd.toFixed(1)}</div>
            </div>
            <div class="kpi-card">
                <h4>Feed (Kg)</h4>
                <div class="value">${totalFeed.toFixed(1)}</div>
            </div>
            <div class="kpi-card">
                <h4>Income</h4>
                <div class="value" style="color:var(--primary-color)">
                    ${this.state.currency} ${totalIncome.toLocaleString()}
                </div>
            </div>
            <div class="kpi-card">
                <h4>Expense</h4>
                <div class="value" style="color:#e53935">
                    ${this.state.currency} ${totalExpense.toLocaleString()}
                </div>
            </div>
        `;

        // 6. Refresh the chart
        this.renderChart(records);
    
        // Recent Activity
        const recent = records.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 3);
        document.getElementById('recent-records-list').innerHTML = recent.map(r => `
            <li>
                <span>${r.date}</span>
                <span>${r.quantity ? r.quantity + unit : 'Checkup'}</span>
            </li>
        `).join('');
    },

    renderChart(records) {
        // Group by Date for last 15 days
        const days = {};
        const sorted = records.sort((a,b) => new Date(a.date) - new Date(b.date));
        
        sorted.forEach(r => {
            if(r.quantity) {
                days[r.date] = (days[r.date] || 0) + r.quantity;
            }
        });

        const labels = Object.keys(days).slice(-15); // Last 15 data points
        const data = Object.values(days).slice(-15);

        const ctx = document.getElementById('productionChart').getContext('2d');
        if (this.state.chartInstance) this.state.chartInstance.destroy();

        this.state.chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: `Production`,
                    data: data,
                    borderColor: '#2E7D32',
                    backgroundColor: 'rgba(46, 125, 50, 0.1)',
                    fill: true,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } }
            }
        });
          
    },

    async loadRecords() {
        const filterDate = document.getElementById('record-filter-date').value; // YYYY-MM
        let records = await DB.getAll('records', 'livestock', this.state.livestock);

        if (filterDate) {
            records = records.filter(r => r.date.startsWith(filterDate));
        }
        
        // Sort DESC
        records.sort((a,b) => new Date(b.date) - new Date(a.date));

        const tbody = document.querySelector('#records-table tbody');
        tbody.innerHTML = records.map(r => `
            <tr>
                <td><input type="checkbox" class="rec-check" value="${r.id}"></td>
                <td>${r.date}</td>
                <td><small>${r.cowId || r.flockId || r.pigId || r.goatId || '-'}</small></td>
                <td>${r.quantity || '-'}${r.unit || ''}</td>
                <td><button onclick="app.deleteRecord('${r.id}')" class="btn-danger btn-sm"><i class="fa-solid fa-trash"></i></button></td>
            </tr>
        `).join('');
    },

    async deleteRecord(id) {
        if(confirm('Delete this record?')) {
            await DB.delete('records', id);
            this.loadRecords();
            this.refreshDashboard();
        }
    },

    async loadFinance() {
        const trans = await DB.getAll('transactions', 'livestock', this.state.livestock);
        const list = document.getElementById('transaction-list');
        let income = 0, expense = 0;

        trans.sort((a,b) => new Date(b.date) - new Date(a.date));
        
        list.innerHTML = trans.map(t => {
            t.type === 'income' ? income += t.amount : expense += t.amount;
            return `
                <li>
                    <div><strong>${t.category}</strong><br><small>${t.date}</small></div>
                    <span class="amount ${t.type}">
                        ${t.type === 'income' ? '+' : '-'}${this.state.currency} ${t.amount.toLocaleString()}
                    </span>
                    <i class="fa-solid fa-trash" style="color:#aaa; cursor:pointer; margin-left:10px" onclick="app.deleteTransaction('${t.id}')"></i>
                </li>
            `;
        }).join('');

        document.getElementById('fin-income').innerText = `${this.state.currency} ${income.toLocaleString()}`;
        document.getElementById('fin-expense').innerText = `${this.state.currency} ${expense.toLocaleString()}`;
    },

    updateCurrency(val) {
        this.state.currency = val || 'KSh';
        localStorage.setItem('ft_currency', this.state.currency);
        alert('Currency updated!');
    },

    async exportTransactionsCSV() {
        const trans = await DB.getAll('transactions', 'livestock', this.state.livestock);
        if (trans.length === 0) return alert("No transactions to export.");

        // Create CSV Header
        let csv = "Date,Category,Type,Amount,Notes\n";
        
        // Add Rows
        trans.sort((a,b) => new Date(b.date) - new Date(a.date)).forEach(t => {
            csv += `${t.date},"${t.category}",${t.type.toUpperCase()},${t.amount},"${t.notes || ''}"\n`;
        });

        // Download logic
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', `transactions_${this.state.livestock}.csv`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    },

    async deleteTransaction(id) {
        if(confirm('Delete Transaction?')) {
            await DB.delete('transactions', id);
            this.loadFinance();
        }
    },

    async generateReport() {
        const start = document.getElementById('report-start').value;
        const end = document.getElementById('report-end').value;
        
        if(!start || !end) return alert('Please select date range');

        const records = await DB.getAll('records', 'livestock', this.state.livestock);
        const trans = await DB.getAll('transactions', 'livestock', this.state.livestock);

        const filteredRecs = records.filter(r => r.date >= start && r.date <= end);
        const filteredTrans = trans.filter(t => t.date >= start && t.date <= end);

        Utils.generatePDF('Farm Report', filteredRecs, filteredTrans, this.state.livestock, start, end);
    },

    syncToCloud() {
        // Stub: This would iterate IndexedDB 'syncQueue' and POST to an API
        console.log('Online: Checking sync queue...');
    }
};

window.app = App; // Expose for HTML onclick handlers
document.addEventListener('DOMContentLoaded', () => App.init());








