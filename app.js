import { DB } from './db.js';
import { Utils } from './utils.js';
import { loadSampleData } from './sample-data.js';

// Firebase Auth Imports
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Firebase Firestore Imports
import { 
    collection, 
    addDoc, 
    serverTimestamp, 
    getDocs, 
    query, 
    where, 
    deleteDoc, 
    doc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const App = {
    state: {
        livestock: localStorage.getItem('ft_livestock') || null,
        theme: localStorage.getItem('ft_theme') || 'light',
        currency: localStorage.getItem('ft_currency') || 'KSh',
        chartInstance: null,
        isLoginMode: true 
    },

    // --- INITIALIZATION ---
    init() {
        this.applyTheme();
        this.bindEvents();
        
        // Listen for Firebase Auth State
        onAuthStateChanged(window.auth, (user) => {
            const emailDisp = document.getElementById('user-email-display');
            // Update the greeting on the dashboard
            if (emailDisp) emailDisp.innerText = user ? `Signed in as ${user.email.split('@')[0]}` : "Guest User";
            
            if (this.state.livestock) {
                this.renderVaxSchedule(); 
                this.refreshDashboard();
            }
        });

        // Register Service Worker for Offline/PWA
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./service-worker.js')
                .then(() => console.log("Service Worker Registered"))
                .catch(err => console.error("SW Registration Failed", err));
        }

        // Check currency setting
        const savedCurrency = localStorage.getItem('ft_currency');
        if(savedCurrency) document.getElementById('currency-input').value = savedCurrency;

        // If a livestock type was previously selected, skip landing page
        if (this.state.livestock) {
            this.loadAppShell();
        }
    },

    // --- CORE NAVIGATION & UI ---
    bindEvents() {
        // Bottom Navigation Logic
        document.querySelectorAll('.bottom-nav .nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Handle the click bubbling (sometimes clicks hit the icon, not the button)
                const targetBtn = e.target.closest('.nav-btn');
                const targetId = targetBtn.getAttribute('data-target');
                this.switchTab(targetId, targetBtn);
            });
        });

        // Auth Modal Handlers
        document.getElementById('auth-status-btn')?.addEventListener('click', () => {
            if(window.auth.currentUser) {
                if(confirm("Log out?")) signOut(window.auth).then(() => window.location.reload());
            } else {
                document.getElementById('auth-modal').classList.remove('hidden');
            }
        });

        document.getElementById('auth-toggle-btn')?.addEventListener('click', () => {
            this.state.isLoginMode = !this.state.isLoginMode;
            document.getElementById('auth-title').innerText = this.state.isLoginMode ? "Welcome Back" : "Create Account";
            document.getElementById('auth-submit-btn').innerText = this.state.isLoginMode ? "Login" : "Sign Up";
        });

        document.getElementById('auth-form')?.addEventListener('submit', (e) => this.handleAuth(e));

        // Global UI Actions
        document.getElementById('home-btn')?.addEventListener('click', () => {
            this.state.livestock = null;
            localStorage.removeItem('ft_livestock');
            document.getElementById('app-shell').classList.add('hidden');
            document.getElementById('landing-page').classList.remove('hidden');
            document.getElementById('landing-page').classList.add('active');
        });

        document.getElementById('theme-toggle')?.addEventListener('click', () => {
            this.state.theme = this.state.theme === 'light' ? 'dark' : 'light';
            localStorage.setItem('ft_theme', this.state.theme);
            this.applyTheme();
        });

        // Currency Change
        document.getElementById('currency-input')?.addEventListener('change', (e) => {
            this.state.currency = e.target.value;
            localStorage.setItem('ft_currency', this.state.currency);
            this.refreshDashboard(); // Refresh to show new symbol
        });

        // Form Submissions
        document.getElementById('add-record-form')?.addEventListener('submit', (e) => this.saveProductionRecord(e));
        document.getElementById('reminder-form')?.addEventListener('submit', (e) => this.saveReminder(e));
        document.getElementById('add-transaction-form')?.addEventListener('submit', (e) => this.saveTransaction(e));
        document.getElementById('generate-pdf-btn')?.addEventListener('click', () => this.generateReport());
    },

    switchTab(viewId, btnElement) {
        // Hide all views
        document.querySelectorAll('.tab-view').forEach(view => {
            view.style.display = 'none';
            view.classList.remove('active');
        });
        
        // Show target view
        const target = document.getElementById(viewId);
        if (target) {
            target.style.display = 'block';
            setTimeout(() => target.classList.add('active'), 10); // Small delay for CSS transition
        }

        // Update Bottom Nav State
        document.querySelectorAll('.bottom-nav .nav-btn').forEach(b => b.classList.remove('active'));
        if (btnElement) btnElement.classList.add('active');

        // Trigger Data Refreshes based on view
        if (viewId === 'view-dashboard') this.refreshDashboard();
        if (viewId === 'view-records') this.loadRecords();
        if (viewId === 'view-finance') this.loadFinance();
        if (viewId === 'view-vax') this.renderVaxSchedule();
    },

    // --- AUTHENTICATION ---
    async handleAuth(e) {
        e.preventDefault();
        const email = document.getElementById('auth-email').value;
        const password = document.getElementById('auth-password').value;
        try {
            if (this.state.isLoginMode) {
                await signInWithEmailAndPassword(window.auth, email, password);
            } else {
                await createUserWithEmailAndPassword(window.auth, email, password);
            }
            document.getElementById('auth-modal').classList.add('hidden');
        } catch (err) { alert(err.message); }
    },

    // --- PRODUCTION & DATA ---
    async saveProductionRecord(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        
        const record = { 
            id: Utils.uuid(), 
            livestock: this.state.livestock, 
            createdAt: Date.now(), 
            ...data 
        };

        await DB.add('records', record);
        this.saveToCloud("production", record);
        
        e.target.reset();
        // Show success feedback (You could add a toast notification here later)
        alert("Record Saved Successfully!");
        
        // Return to dashboard
        const dashBtn = document.querySelector('[data-target="view-dashboard"]');
        this.switchTab('view-dashboard', dashBtn);
    },

    async loadRecords() {
        const records = await DB.getAll('records', 'livestock', this.state.livestock);
        const tbody = document.querySelector('#records-table tbody');
        if (tbody) {
            tbody.innerHTML = records.sort((a,b) => new Date(b.date) - new Date(a.date)).map(r => `
                <tr>
                    <td>
                        <div style="font-weight:600;">${Utils.formatDate(r.date)}</div>
                        <small class="text-muted">${r.cowId || r.id || 'Batch Update'}</small>
                    </td>
                    <td>${r.quantity || r.weightKg || '-'}</td>
                    <td class="text-right">
                        <button onclick="app.deleteRecord('${r.id}')" class="btn-text-danger"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>
            `).join('');
        }
    },

    async deleteRecord(id) {
        if(confirm('Delete this record?')) { 
            await DB.delete('records', id); 
            this.loadRecords(); 
            this.refreshDashboard(); 
        }
    },

    // --- FINANCE ---
    async saveTransaction(e) {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());
        data.amount = parseFloat(data.amount);
        
        const trans = { 
            id: Utils.uuid(), 
            livestock: this.state.livestock, 
            createdAt: Date.now(), 
            ...data 
        };

        await DB.add('transactions', trans);
        this.saveToCloud("transactions", trans);
        
        e.target.reset();
        this.loadFinance();
    },

    async loadFinance() {
        const trans = await DB.getAll('transactions', 'livestock', this.state.livestock);
        
        // Calculate Total Balance
        const income = trans.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const expense = trans.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        const balance = income - expense;

        const balanceEl = document.getElementById('total-balance');
        if(balanceEl) {
            balanceEl.innerText = `${this.state.currency} ${balance.toFixed(2)}`;
            balanceEl.style.color = balance >= 0 ? 'var(--primary-dark)' : 'var(--danger)';
        }

        const list = document.getElementById('transaction-list');
        if (!list) return;

        list.innerHTML = trans.sort((a,b) => new Date(b.date) - new Date(a.date)).map(t => `
            <li class="list-item">
                <div style="display:flex; align-items:center; gap:10px;">
                    <div class="icon-circle" style="width:35px; height:35px; font-size:0.9rem; background: ${t.type === 'income' ? 'var(--primary-light)' : 'var(--danger-light)'}; color: ${t.type === 'income' ? 'var(--primary)' : 'var(--danger)'}">
                        <i class="fa-solid ${t.type === 'income' ? 'fa-arrow-down' : 'fa-arrow-up'}"></i>
                    </div>
                    <div>
                        <strong>${t.category}</strong><br>
                        <small class="text-muted">${Utils.formatDate(t.date)}</small>
                    </div>
                </div>
                <span style="font-weight:600; color: ${t.type === 'income' ? 'var(--primary)' : 'var(--danger)'}">
                    ${t.type === 'income' ? '+' : '-'}${this.state.currency}${t.amount}
                </span>
            </li>
        `).join('') || '<p class="text-muted text-center mt-3">No transactions recorded yet.</p>';
    },

    // --- REMINDERS (Updated for Phase 1.5) ---
    async saveReminder(e) {
        e.preventDefault();
        const reminder = {
            animal: document.getElementById('remind-animal').value,
            task: document.getElementById('remind-task').value,
            date: document.getElementById('remind-date').value,
            type: this.state.livestock,
            completed: false,
            createdAt: new Date().toISOString()
        };

        // ... (Keep existing Cloud/Local logic from previous db.js/app.js) ...
        if (window.auth.currentUser) {
            await addDoc(collection(window.db, "reminders"), { ...reminder, userId: window.auth.currentUser.uid });
        } else {
        // Simplified for this phase to ensure UI works:
        const local = JSON.parse(localStorage.getItem('reminders') || '[]');
        local.push({ ...reminder, id: Utils.uuid() });
        localStorage.setItem('reminders', JSON.stringify(local));

        e.target.reset();
        this.renderVaxSchedule();
        alert("Reminder Set!");
    },

    async renderVaxSchedule() {
        // Simplified Local Load for UI Testing
        let reminders = JSON.parse(localStorage.getItem('reminders') || '[]').filter(r => r.type === this.state.livestock);
        const list = document.getElementById('vax-list');
        
        if (!list) return;
        list.innerHTML = reminders.map(rem => `
            <li class="list-item">
                <div>
                    <strong>${rem.task}</strong>
                    <div class="text-muted" style="font-size:0.8rem">${rem.animal} • ${Utils.formatDate(rem.date)}</div>
                </div>
                <button onclick="app.deleteReminder('${rem.id}')" class="btn-text-danger"><i class="fa-solid fa-trash"></i></button>
            </li>
        `).join('') || '<p class="text-muted">No upcoming tasks.</p>';
    },

    deleteReminder(id) {
         let local = JSON.parse(localStorage.getItem('reminders') || '[]');
         localStorage.setItem('reminders', JSON.stringify(local.filter(r => r.id !== id)));
         this.renderVaxSchedule();
    },

    // --- DASHBOARD & ANALYTICS ---
    async refreshDashboard() {
        // 1. Get data from fixed DB
        const records = await DB.getAll('records', 'livestock', this.state.livestock);
        const trans = await DB.getAll('transactions', 'livestock', this.state.livestock);
        
        // 2. Calculate Totals
        const totalProd = records.reduce((sum, r) => sum + (parseFloat(r.quantity) || 0), 0);
        const income = trans.filter(t => t.type === 'income').reduce((sum, t) => sum + parseFloat(t.amount), 0);
        const expense = trans.filter(t => t.type === 'expense').reduce((sum, t) => sum + parseFloat(t.amount), 0);

        // 3. Update UI Text
        document.querySelector('.kpi-card:nth-child(1) .value').innerText = totalProd.toFixed(1);
        document.querySelector('.kpi-card:nth-child(2) .value').innerText = `${this.state.currency} ${income - expense}`;

        // 4. Render the Chart
        this.renderChart(records);
    },

        this.renderChart(records);
    },

    renderChart(records) {
        const canvas = document.getElementById('productionChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        
        if (this.state.chartInstance) this.state.chartInstance.destroy();
        
        // Sort data for the line graph
        const sorted = records.sort((a,b) => new Date(a.date) - new Date(b.date)).slice(-7);
        
        this.state.chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: sorted.map(r => r.date.split('-').slice(1).join('/')), // Shows MM/DD
                datasets: [{
                    label: 'Yield',
                    data: sorted.map(r => r.quantity),
                    borderColor: '#10B981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } }
            }
        });
    }

 // Fake AI Insight Logic
        const insightText = document.getElementById('insight-text');
        if(insightText) {
            if(records.length === 0) {
                insightText.innerText = "Start adding records to generate insights.";
            } else if (records.length > 5) {
                const recent = records.slice(-3);
                // Simple logic: is the latest one higher than the average of the last 3?
                insightText.innerText = "Production trends look stable based on recent inputs.";
            } else {
                insightText.innerText = "Gathering more data for analysis...";
            }
        }

    // --- REPORTS ---
    async generateReport() {
        const records = await DB.getAll('records', 'livestock', this.state.livestock);
        const trans = await DB.getAll('transactions', 'livestock', this.state.livestock);
        // Call Utils PDF generator
        Utils.generatePDF('Monthly Report', records, trans, this.state.livestock, 'All Time', 'Now');
    },

    // --- CLOUD SYNC ---
    async saveToCloud(colName, data) {
        if (!window.auth.currentUser) return;
        try {
            await addDoc(collection(window.db, colName), {
                ...data,
                userId: window.auth.currentUser.uid,
                timestamp: serverTimestamp()
            });
        } catch (e) { console.error("Cloud Sync Error:", e); }
    },

    // --- HELPERS ---
    applyTheme() { 
        document.body.classList.toggle('dark-mode', this.state.theme === 'dark'); 
    },
    
    selectLivestock(type) {
        this.state.livestock = type;
        localStorage.setItem('ft_livestock', type);
        this.loadAppShell();
    },

    loadAppShell() {
        document.getElementById('landing-page').classList.remove('active');
        // Wait for fade out
        setTimeout(() => {
            document.getElementById('landing-page').classList.add('hidden');
            document.getElementById('app-shell').classList.remove('hidden');
            document.getElementById('header-title').innerText = this.state.livestock.charAt(0).toUpperCase() + this.state.livestock.slice(1);
            this.renderAddForm();
            
            // Set Home as active
            this.switchTab('view-dashboard', document.querySelector('[data-target="view-dashboard"]'));
        }, 200);
    },

    renderAddForm() {
        const container = document.getElementById('dynamic-fields');
        const type = this.state.livestock;
        
        let html = `<div class="form-group mb-3"><label class="text-muted">Date</label><input type="date" name="date" class="modern-input" required value="${new Date().toISOString().split('T')[0]}"></div>`;
        
        if (type === 'dairy') {
            html += `
                <input type="text" name="cowId" placeholder="Cow Name/ID" class="modern-input" required>
                <div class="form-row" style="display:flex; gap:10px;">
                     <select name="session" class="modern-input"><option value="morning">Morning</option><option value="evening">Evening</option></select>
                     <input type="number" name="quantity" placeholder="Milk (L)" class="modern-input" step="0.1" required>
                </div>`;
        } else if (type === 'poultry') {
            html += `
                <input type="number" name="quantity" placeholder="Eggs Collected" class="modern-input" required>
                <input type="number" name="mortality" placeholder="Mortality (Birds)" class="modern-input">`;
        } else {
            html += `
                <input type="text" name="id" placeholder="Animal ID" class="modern-input">
                <input type="number" name="weightKg" placeholder="Weight (Kg)" class="modern-input" step="0.1">`;
        }
        
        html += `
            <input type="number" name="feedKg" placeholder="Feed Consumed (Kg)" class="modern-input" step="0.1">
            <textarea name="notes" placeholder="Notes" class="modern-input" rows="3"></textarea>`;
            
        container.innerHTML = html;
    }
};

window.app = App;
document.addEventListener('DOMContentLoaded', () => App.init());


