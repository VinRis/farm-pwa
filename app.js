import { DB } from './db.js';
import { Utils } from './utils.js';
import { loadSampleData } from './sample-data.js';

const App = {
    state: {
        livestock: localStorage.getItem('ft_livestock') || null,
        theme: localStorage.getItem('ft_theme') || 'light',
        currency: localStorage.getItem('ft_currency') || 'KSh',
        chartInstance: null  
    },

    init() {
        this.applyTheme();
        this.bindEvents();

        // Initialize currency input value in settings
        const curInput = document.getElementById('currency-input');
        if (curInput) curInput.value = this.state.currency;
        
        if (this.state.livestock) {
            this.loadAppShell();
        } else {
            loadSampleData(); 
        }

        window.addEventListener('online', this.syncToCloud);
    },

    bindEvents() {
        // Navigation Handler (Fixed: Removed duplicate binding)
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = btn.getAttribute('data-target');
                if (targetId) this.switchTab(targetId, btn);
            });
        });

        // Theme Toggle
        document.getElementById('theme-toggle')?.addEventListener('click', () => {
            this.state.theme = this.state.theme === 'light' ? 'dark' : 'light';
            localStorage.setItem('ft_theme', this.state.theme);
            this.applyTheme();
        });

        // Home Button
        document.getElementById('home-btn')?.addEventListener('click', () => {
            this.state.livestock = null;
            localStorage.removeItem('ft_livestock');
            document.getElementById('app-shell').classList.add('hidden');
            document.getElementById('landing-page').classList.remove('hidden');
        });

        // Add Record Form
        document.getElementById('add-record-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());
            
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
            this.saveRecordToCloud(record); // Add this line to attempt cloud sync
        });

        // Add Transaction Form
        document.getElementById('add-transaction-form')?.addEventListener('submit', async (e) => {
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

        // Records Filter
        document.getElementById('record-filter-date')?.addEventListener('change', () => this.loadRecords());
        
        // Reports & Export
        document.getElementById('generate-pdf-btn')?.addEventListener('click', () => this.generateReport());
        document.getElementById('export-csv-btn')?.addEventListener('click', () => this.exportTransactionsCSV());
        
        // Backup/Restore
        document.getElementById('backup-btn')?.addEventListener('click', async () => {
            const data = await DB.dump();
            const blob = new Blob([JSON.stringify(data)], {type: 'application/json'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'farmtrack_backup.json';
            a.click();
        });

        document.getElementById('restore-file')?.addEventListener('change', (e) => {
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
        await loadSampleData();
        document.getElementById('landing-page').classList.add('hidden');
        document.getElementById('app-shell').classList.remove('hidden');
        
        const titles = { dairy: 'Dairy Farm', poultry: 'Poultry Farm', pig: 'Pig Farm', goat: 'Goat Farm' };
        document.getElementById('header-title').innerText = titles[this.state.livestock];

        this.renderAddForm();
        this.switchTab('view-dashboard', document.querySelector('[data-target="view-dashboard"]'));
    },

    switchTab(viewId, btnElement) {
        document.querySelectorAll('.tab-view').forEach(view => {
            view.classList.remove('active');
            view.style.display = 'none';
        });
    
        const targetView = document.getElementById(viewId);
        if (targetView) {
            targetView.classList.add('active');
            targetView.style.display = 'block';
        }
    
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        if (btnElement) btnElement.classList.add('active');
    
        // Load data based on view
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
        const records = await DB.getAll('records', 'livestock', this.state.livestock);
        const trans = await DB.getAll('transactions', 'livestock', this.state.livestock);
        const now = new Date();
        
        const thisMonthRecs = records.filter(r => new Date(r.date).getMonth() === now.getMonth());
        const thisMonthTrans = trans.filter(t => new Date(t.date).getMonth() === now.getMonth());

        let totalProd = 0, totalFeed = 0;
        let unit = this.state.livestock === 'dairy' ? 'L' : (this.state.livestock === 'poultry' ? 'Eggs' : 'Kg');

        thisMonthRecs.forEach(r => {
            totalProd += (r.quantity || 0);
            totalFeed += (r.feedKg || 0);
        });

        let totalIncome = 0, totalExpense = 0;
        thisMonthTrans.forEach(t => {
            if (t.type === 'income') totalIncome += t.amount;
            else totalExpense += t.amount;
        });

        // KPI Cards Update (Income & Expense replace Mortality & Records)
        document.getElementById('kpi-container').innerHTML = `
            <div class="kpi-card"><h4>Production (${unit})</h4><div class="value">${totalProd.toFixed(1)}</div></div>
            <div class="kpi-card"><h4>Feed (Kg)</h4><div class="value">${totalFeed.toFixed(1)}</div></div>
            <div class="kpi-card"><h4>Income</h4><div class="value" style="color:var(--primary-color)">${this.state.currency} ${totalIncome.toLocaleString()}</div></div>
            <div class="kpi-card"><h4>Expense</h4><div class="value" style="color:#e53935">${this.state.currency} ${totalExpense.toLocaleString()}</div></div>
        `;

        this.generateInsights(thisMonthRecs, totalIncome, totalExpense);
        this.renderChart(records);

        // Recent Activity
        const recent = records.sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 3);
        document.getElementById('recent-records-list').innerHTML = recent.map(r => `
            <li><span>${r.date}</span><span>${r.quantity ? r.quantity + unit : 'Logged'}</span></li>
        `).join('');
    },

    generateInsights(records, income, expense) {
        const textEl = document.getElementById('insight-text');
        if (!textEl) return;
        
        let insight = "Keep up the good work! Your farm records are looking organized.";
        
        if (expense > income && income > 0) {
            insight = `Warning: Expenses exceed income this month. Review your feed efficiency.`;
        } else if (records.length >= 2) {
            const latest = records[0].quantity || 0;
            const prev = records[1].quantity || 0;
            if (latest < prev) insight = `Production is down compared to last record. Check for environmental stressors.`;
            else insight = `Production is trending upwards! Your management practices are working.`;
        }
        textEl.innerText = insight;
    },

    renderChart(records) {
        const days = {};
        const sorted = records.sort((a,b) => new Date(a.date) - new Date(b.date));
        sorted.forEach(r => { if(r.quantity) days[r.date] = (days[r.date] || 0) + r.quantity; });

        const labels = Object.keys(days).slice(-15);
        const data = Object.values(days).slice(-15);

        const ctx = document.getElementById('productionChart')?.getContext('2d');
        if (!ctx) return;
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
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    },

    async loadRecords() {
        const filterDate = document.getElementById('record-filter-date').value;
        let records = await DB.getAll('records', 'livestock', this.state.livestock);
        if (filterDate) records = records.filter(r => r.date.startsWith(filterDate));
        records.sort((a,b) => new Date(b.date) - new Date(a.date));

        document.querySelector('#records-table tbody').innerHTML = records.map(r => `
            <tr>
                <td><input type="checkbox" class="rec-check" value="${r.id}"></td>
                <td>${r.date}</td>
                <td><small>${r.cowId || r.flockId || r.pigId || r.goatId || '-'}</small></td>
                <td>${r.quantity || '-'}${this.state.livestock === 'dairy' ? 'L' : ''}</td>
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
                    <span class="amount ${t.type}">${t.type === 'income' ? '+' : '-'}${this.state.currency} ${t.amount.toLocaleString()}</span>
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
        this.loadFinance(); // Refresh list to show new symbol
    },

    async exportTransactionsCSV() {
        const trans = await DB.getAll('transactions', 'livestock', this.state.livestock);
        if (trans.length === 0) return alert("No transactions to export.");
        let csv = "Date,Category,Type,Amount,Notes\n";
        trans.sort((a,b) => new Date(b.date) - new Date(a.date)).forEach(t => {
            csv += `${t.date},"${t.category}",${t.type.toUpperCase()},${t.amount},"${t.notes || ''}"\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `finance_${this.state.livestock}.csv`;
        a.click();
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
            console.log('Online: Checking sync queue...');
        }, // Added missing comma
    
        // Move these inside the App object as methods
        async saveRecordToCloud(recordData) {
            const user = window.auth?.currentUser;
            if (!user) {
                console.log("Saving locally only (Not signed in)");
                return;
            }
        
            try {
                // This requires the firebase imports at the TOP of app.js
                // import { collection, addDoc, serverTimestamp } from "https://..."
                await addDoc(collection(window.db, "production"), {
                    ...recordData,
                    userId: user.uid,
                    timestamp: serverTimestamp()
                });
                console.log("Synced to cloud!");
            } catch (e) {
                console.error("Error syncing: ", e);
            }
        },
    
        async checkProStatus() {
            const user = window.auth?.currentUser;
            if (user) {
                const userDoc = await getDoc(doc(window.db, "users", user.uid));
                if (userDoc.exists() && userDoc.data().isPremium) {
                    document.body.classList.add('premium-unlocked');
                }
            }
        }
    }; // Correctly closing the App object
    
    window.app = App;
    document.addEventListener('DOMContentLoaded', () => App.init());


