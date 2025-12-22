import { DB } from './db.js';
import { Utils } from './utils.js';
import { loadSampleData } from './sample-data.js';
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import { 
    collection, 
    addDoc, 
    serverTimestamp, 
    doc, 
    getDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const App = {
    state: {
        livestock: localStorage.getItem('ft_livestock') || null,
        theme: localStorage.getItem('ft_theme') || 'light',
        currency: localStorage.getItem('ft_currency') || 'KSh',
        chartInstance: null,
        isLoginMode: true 
    },

    // --- NEW: Health & Reminder Methods ---
    async checkMissingLogs() {
        if (!this.state.livestock) return;
        const today = new Date().toISOString().split('T')[0];
        const records = await DB.getAll('records', 'livestock', this.state.livestock);
        const hasLogToday = records.some(r => r.date === today);
        
        const insightEl = document.getElementById('insight-text');
        const insightCard = document.getElementById('insight-card');
        
        if (!hasLogToday && insightEl) {
            insightEl.innerHTML = `<b style="color:#e53935">Missing Entry:</b> You haven't recorded data for today yet!`;
            if (insightCard) insightCard.style.borderLeft = "5px solid #e53935";
        }
    },

    async requestNotificationPermission() {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
            console.log("Notification permission granted.");
            // Test notification
            new Notification("FarmTrack Active", {
                body: "You will now receive reminders for your livestock health tasks.",
                icon: "icon-192x192.png"
            });
        }
    }
    
    async saveReminder(e) {
        e.preventDefault();
        const reminder = {
            animal: document.getElementById('remind-animal').value,
            task: document.getElementById('remind-task').value,
            date: document.getElementById('remind-date').value,
            type: this.state.livestock, // dairy, poultry, etc.
            completed: false,
            createdAt: new Date().toISOString()
        };
    
        // Save to Firestore (if logged in) or LocalStorage
        if (window.auth.currentUser) {
            await addDoc(collection(window.db, "reminders"), reminder);
        } else {
            const local = JSON.parse(localStorage.getItem('reminders') || '[]');
            local.push(reminder);
            localStorage.setItem('reminders', JSON.stringify(local));
            // Example of how to render each list item
            const reminderHTML = reminders.map(rem => `
                <li class="list-item ${new Date(rem.date) < new Date() ? 'overdue' : ''}">
                    <div class="item-info">
                        <strong>${rem.task}</strong>
                        <span>${rem.animal} • ${new Date(rem.date).toLocaleDateString()}</span>
                    </div>
                    <button onclick="app.completeReminder('${rem.id}')" class="icon-btn success">
                        <i class="fa-solid fa-check"></i>
                    </button>
                </li>
            `).join('');
        }
    
        e.target.reset();
        this.renderReminders();
        alert("Reminder Set!");
    }

    renderVaxSchedule() {
        const schedules = {
            poultry: [
                { task: "Gumboro (1st Dose)", type: "Vaccine" },
                { task: "Newcastle (1st Dose)", type: "Vaccine" },
                { task: "Gumboro (2nd Dose)", type: "Vaccine" }
            ],
            dairy: [
                { task: "Foot & Mouth", type: "Annual" },
                { task: "Deworming", type: "Quarterly" }
            ],
            pig: [
                { task: "Swine Fever", type: "Vaccine" },
                { task: "Deworming", type: "Routine" }
            ],
            goat: [
                { task: "PPR Vaccine", type: "Annual" },
                { task: "Deworming", type: "Routine" }
            ]
        };

        const list = document.getElementById('vax-list');
        if (!list) return;

        const currentSched = schedules[this.state.livestock] || [];
        list.innerHTML = currentSched.map(v => `
            <li style="display:flex; justify-content:space-between; align-items:center; padding:12px 0; border-bottom:1px solid #eee;">
                <div>
                    <strong>${v.task}</strong><br>
                    <small style="color:#666">${v.type}</small>
                </div>
                <button class="btn-sm btn-secondary" onclick="alert('Health task marked as completed!')">Done</button>
            </li>
        `).join('');
    },

    // --- Core Logic ---
    init() {
        this.applyTheme();
        this.bindEvents();

        const curInput = document.getElementById('currency-input');
        if (curInput) curInput.value = this.state.currency;
        
        if (this.state.livestock) {
            this.loadAppShell();
        }

        window.addEventListener('online', () => this.syncToCloud());
    },

    bindEvents() {
        const drawer = document.getElementById('side-drawer');
        const overlay = document.getElementById('drawer-overlay');
    
        // Open Drawer
        document.getElementById('menu-toggle')?.addEventListener('click', () => {
            drawer.classList.add('open');
            overlay.classList.remove('hidden');
        });
    
        // Close Drawer
        const closeDrawer = () => {
            drawer.classList.remove('open');
            overlay.classList.add('hidden');
        };
    
        document.getElementById('close-drawer')?.addEventListener('click', closeDrawer);
        overlay?.addEventListener('click', closeDrawer);
    
        // Update switchTab to close drawer after clicking a link
        const originalSwitchTab = this.switchTab.bind(this);
        this.switchTab = (viewId, btnElement) => {
            originalSwitchTab(viewId, btnElement);
            closeDrawer(); // Close the menu whenever a tab is selected
        };
        document.getElementById('auth-status-btn')?.addEventListener('click', () => {
            document.getElementById('auth-modal').classList.remove('hidden');
        });
        
        document.getElementById('auth-toggle-btn')?.addEventListener('click', () => {
            this.state.isLoginMode = !this.state.isLoginMode;
            const isLogin = this.state.isLoginMode;
            document.getElementById('auth-title').innerText = isLogin ? "Sign In" : "Create Account";
            document.getElementById('auth-submit-btn').innerText = isLogin ? "Login" : "Sign Up";
            document.getElementById('auth-toggle-btn').innerText = isLogin ? "Need an account? Sign Up" : "Have an account? Login";
        });
        
        document.getElementById('auth-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('auth-email').value;
            const password = document.getElementById('auth-password').value;
            try {
                if (this.state.isLoginMode) {
                    await signInWithEmailAndPassword(window.auth, email, password);
                    alert("Signed in!");
                } else {
                    await createUserWithEmailAndPassword(window.auth, email, password);
                    alert("Account created!");
                }
                document.getElementById('auth-modal').classList.add('hidden');
            } catch (err) { alert(err.message); }
        });

        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetId = btn.getAttribute('data-target');
                if (targetId) this.switchTab(targetId, btn);
            });
        });

        document.getElementById('theme-toggle')?.addEventListener('click', () => {
            this.state.theme = this.state.theme === 'light' ? 'dark' : 'light';
            localStorage.setItem('ft_theme', this.state.theme);
            this.applyTheme();
        });

        document.getElementById('logout-btn')?.addEventListener('click', async () => {
            if (confirm("Are you sure you want to log out?")) {
                try {
                    await window.auth.signOut();
                    window.location.reload(); // Refresh to clear state
                } catch (error) {
                    console.error("Logout Error:", error);
                }
            }
        });

        document.getElementById('home-btn')?.addEventListener('click', () => {
            this.state.livestock = null;
            localStorage.removeItem('ft_livestock');
            document.getElementById('app-shell').classList.add('hidden');
            document.getElementById('landing-page').classList.remove('hidden');
        });

        document.getElementById('add-record-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());
            ['quantity', 'feedKg', 'weightKg', 'mortality'].forEach(k => {
                if(data[k]) data[k] = parseFloat(data[k]);
            });

            const record = { id: Utils.uuid(), livestock: this.state.livestock, createdAt: Date.now(), ...data };
            await DB.add('records', record);
            e.target.reset();
            this.refreshDashboard();
            this.saveRecordToCloud(record);
        });

        document.getElementById('add-transaction-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());
            data.amount = parseFloat(data.amount);
            const trans = { id: Utils.uuid(), livestock: this.state.livestock, createdAt: Date.now(), ...data };
            await DB.add('transactions', trans);
            e.target.reset();
            this.loadFinance();
        });

        document.getElementById('record-filter-date')?.addEventListener('change', () => this.loadRecords());
        document.getElementById('generate-pdf-btn')?.addEventListener('click', () => this.generateReport());
        document.getElementById('export-csv-btn')?.addEventListener('click', () => this.exportTransactionsCSV());
        
        document.getElementById('backup-btn')?.addEventListener('click', async () => {
            const data = await DB.dump();
            const blob = new Blob([JSON.stringify(data)], {type: 'application/json'});
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'farmtrack_backup.json';
            a.click();
        });
    },

    applyTheme() {
        document.body.classList.toggle('dark-mode', this.state.theme === 'dark');
    },

    selectLivestock(type) {
        this.state.livestock = type;
        localStorage.setItem('ft_livestock', type);
        this.loadAppShell();
    },

    async loadAppShell() {
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

        if (viewId === 'view-dashboard') this.refreshDashboard();
        if (viewId === 'view-records') this.loadRecords();
        if (viewId === 'view-finance') this.loadFinance();
        if (viewId === 'view-vax') this.renderVaxSchedule();
    },

    renderAddForm() {
        const container = document.getElementById('dynamic-fields');
        const type = this.state.livestock;
        let html = `<div class="form-group"><input type="date" name="date" required value="${new Date().toISOString().split('T')[0]}"></div>`;

        if (type === 'dairy') {
            html += `<div class="form-group"><input type="text" name="cowId" placeholder="Cow ID" required></div>
                     <div class="form-group"><select name="session"><option value="morning">Morning</option><option value="evening">Evening</option></select></div>
                     <div class="form-group"><input type="number" name="quantity" placeholder="Milk (L)" step="0.1" required></div>`;
        } else if (type === 'poultry') {
            html += `<div class="form-group"><input type="number" name="quantity" placeholder="Eggs Collected" required></div>
                     <div class="form-group"><input type="number" name="mortality" placeholder="Birds Dead"></div>`;
        } else if (type === 'pig' || type === 'goat') {
            html += `<div class="form-group"><input type="text" name="id" placeholder="Animal ID"></div>
                     <div class="form-group"><input type="number" name="weightKg" placeholder="Weight (Kg)"></div>`;
        }
        html += `<div class="form-group"><input type="number" name="feedKg" placeholder="Feed (Kg)"></div>
                 <div class="form-group"><textarea name="notes" placeholder="Notes"></textarea></div>`;
        container.innerHTML = html;
    },

    async refreshDashboard() {
        const records = await DB.getAll('records', 'livestock', this.state.livestock);
        const trans = await DB.getAll('transactions', 'livestock', this.state.livestock);
        const now = new Date();
        const thisMonthRecs = records.filter(r => new Date(r.date).getMonth() === now.getMonth());

        let totalProd = 0, totalFeed = 0;
        let unit = this.state.livestock === 'dairy' ? 'L' : (this.state.livestock === 'poultry' ? 'Eggs' : 'Kg');

        thisMonthRecs.forEach(r => {
            totalProd += (r.quantity || 0);
            totalFeed += (r.feedKg || 0);
        });

        let totalIncome = 0, totalExpense = 0;
        trans.filter(t => new Date(t.date).getMonth() === now.getMonth()).forEach(t => {
            t.type === 'income' ? totalIncome += t.amount : totalExpense += t.amount;
        });

        document.getElementById('kpi-container').innerHTML = `
            <div class="kpi-card"><h4>Prod (${unit})</h4><div class="value">${totalProd.toFixed(1)}</div></div>
            <div class="kpi-card"><h4>Feed (Kg)</h4><div class="value">${totalFeed.toFixed(1)}</div></div>
            <div class="kpi-card"><h4>Income</h4><div class="value" style="color:#2E7D32">${this.state.currency} ${totalIncome}</div></div>
            <div class="kpi-card"><h4>Expense</h4><div class="value" style="color:#e53935">${this.state.currency} ${totalExpense}</div></div>
        `;

        this.generateInsights(thisMonthRecs, totalIncome, totalExpense);
        this.renderChart(records);
        this.checkMissingLogs();

        const recent = records.sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 3);
        document.getElementById('recent-records-list').innerHTML = recent.map(r => `
            <li><span>${r.date}</span><span>${r.quantity ? r.quantity + unit : 'Logged'}</span></li>
        `).join('');
    },

    generateInsights(records, income, expense) {
        const textEl = document.getElementById('insight-text');
        if (!textEl) return;
        let insight = "Your records are up to date.";
        if (expense > income && income > 0) insight = "Warning: Monthly expenses are higher than income.";
        textEl.innerText = insight;
    },

    renderChart(records) {
        const ctx = document.getElementById('productionChart')?.getContext('2d');
        if (!ctx) return;
        if (this.state.chartInstance) this.state.chartInstance.destroy();

        const sorted = records.sort((a,b) => new Date(a.date) - new Date(b.date)).slice(-7);
        this.state.chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: sorted.map(r => r.date),
                datasets: [{ label: 'Prod', data: sorted.map(r => r.quantity), borderColor: '#2E7D32', fill: false }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    },

    async loadRecords() {
        const records = await DB.getAll('records', 'livestock', this.state.livestock);
        document.querySelector('#records-table tbody').innerHTML = records.map(r => `
            <tr>
                <td><input type="checkbox"></td>
                <td>${r.date}</td>
                <td>${r.quantity || '-'}</td>
                <td><button onclick="app.deleteRecord('${r.id}')" class="btn-danger btn-sm">Delete</button></td>
            </tr>
        `).join('');
    },

    async deleteRecord(id) {
        if(confirm('Delete record?')) { await DB.delete('records', id); this.loadRecords(); this.refreshDashboard(); }
    },

    async loadFinance() {
        const trans = await DB.getAll('transactions', 'livestock', this.state.livestock);
        const list = document.getElementById('transaction-list');
        list.innerHTML = trans.map(t => `
            <li>
                <div><strong>${t.category}</strong><br><small>${t.date}</small></div>
                <span class="${t.type}">${t.type === 'income' ? '+' : '-'}${this.state.currency}${t.amount}</span>
            </li>
        `).join('');
    },

    updateCurrency(val) {
        this.state.currency = val || 'KSh';
        localStorage.setItem('ft_currency', this.state.currency);
        this.loadFinance();
    },

    async exportTransactionsCSV() {
        const trans = await DB.getAll('transactions', 'livestock', this.state.livestock);
        let csv = "Date,Type,Amount\n" + trans.map(t => `${t.date},${t.type},${t.amount}`).join("\n");
        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `finance.csv`;
        a.click();
    },

    syncToCloud() { console.log('Syncing...'); },

    async saveRecordToCloud(recordData) {
        const user = window.auth?.currentUser;
        if (!user) return;
        try {
            await addDoc(collection(window.db, "production"), {
                ...recordData,
                userId: user.uid,
                timestamp: serverTimestamp()
            });
        } catch (e) { console.error("Cloud Error: ", e); }
    }
};

window.app = App;
document.addEventListener('DOMContentLoaded', () => App.init());



