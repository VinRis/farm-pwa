import { DB } from './db.js';
import { Utils } from './utils.js';

// Firebase Auth & Firestore Imports
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, addDoc, serverTimestamp, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const App = {
    state: {
        livestock: localStorage.getItem('ft_livestock') || null,
        theme: localStorage.getItem('ft_theme') || 'light',
        currency: localStorage.getItem('ft_currency') || 'KSh',
        chartInstance: null,
        isLoginMode: true 
    },

    async init() {
        this.applyTheme();
        this.bindEvents();
        
        onAuthStateChanged(window.auth, (user) => {
            const emailDisp = document.getElementById('user-email-display');
            if (emailDisp) emailDisp.innerText = user ? `Signed in as ${user.email.split('@')[0]}` : "Guest User";
            if (this.state.livestock) this.refreshDashboard();
        });

        if (this.state.livestock) this.loadAppShell();
    },

    bindEvents() {
        // Navigation
        document.querySelectorAll('.bottom-nav .nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetBtn = e.target.closest('.nav-btn');
                this.switchTab(targetBtn.getAttribute('data-target'), targetBtn);
            });
        });

        // Home / Exit Action
        document.getElementById('home-btn')?.addEventListener('click', () => {
            if(confirm("Return to home screen?")) {
                this.state.livestock = null;
                localStorage.removeItem('ft_livestock');
                document.getElementById('app-shell').classList.add('hidden');
                document.getElementById('landing-page').classList.remove('hidden');
            }
        });

        // Theme Toggle
        document.getElementById('theme-toggle')?.addEventListener('click', () => {
            this.state.theme = this.state.theme === 'light' ? 'dark' : 'light';
            localStorage.setItem('ft_theme', this.state.theme);
            this.applyTheme();
        });

        // Form Submissions
        document.getElementById('add-record-form')?.addEventListener('submit', (e) => this.saveProductionRecord(e));
        document.getElementById('add-transaction-form')?.addEventListener('submit', (e) => this.saveTransaction(e));
        document.getElementById('reminder-form')?.addEventListener('submit', (e) => this.saveReminder(e));
        document.getElementById('generate-pdf-btn')?.addEventListener('click', () => this.generateReport());
    },

    switchTab(viewId, btnElement) {
        document.querySelectorAll('.tab-view').forEach(view => view.classList.add('hidden'));
        document.getElementById(viewId)?.classList.remove('hidden');
        document.querySelectorAll('.bottom-nav .nav-btn').forEach(b => b.classList.remove('active'));
        if (btnElement) btnElement.classList.add('active');

        // Refresh data based on view
        if (viewId === 'view-dashboard') this.refreshDashboard();
        if (viewId === 'view-records') this.loadRecords();
        if (viewId === 'view-finance') this.loadFinance();
        if (viewId === 'view-vax') this.renderVaxSchedule();
    },

    // --- PRODUCTION LOGIC ---
    async saveProductionRecord(e) {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());
        const record = { 
            id: Utils.uuid(), 
            livestock: this.state.livestock, 
            createdAt: Date.now(), 
            ...data 
        };
        
        await DB.add('records', record);
        this.saveToCloud("production", record);
        
        e.target.reset();
        alert("Production Record Saved!");
        this.switchTab('view-dashboard', document.querySelector('[data-target="view-dashboard"]'));
    },

    async loadRecords() {
        const records = await DB.getAll('records', 'livestock', this.state.livestock);
        const tbody = document.querySelector('#records-table tbody');
        if (!tbody) return;

        tbody.innerHTML = records.sort((a,b) => new Date(b.date) - new Date(a.date)).map(r => `
            <tr>
                <td>${Utils.formatDate(r.date)}<br><small>${r.cowId || 'Batch'}</small></td>
                <td>${r.quantity} ${this.state.livestock === 'dairy' ? 'L' : 'Qty'}</td>
                <td><button onclick="app.deleteItem('records', '${r.id}')" class="btn-text-danger"><i class="fa-solid fa-trash"></i></button></td>
            </tr>
        `).join('') || '<tr><td colspan="3" class="text-center">No records found</td></tr>';
    },

    // --- FINANCE LOGIC ---
    async saveTransaction(e) {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());
        const trans = { 
            id: Utils.uuid(), 
            livestock: this.state.livestock, 
            amount: parseFloat(data.amount),
            type: data.type,
            category: data.category,
            date: data.date,
            createdAt: Date.now() 
        };

        await DB.add('transactions', trans);
        this.saveToCloud("transactions", trans);
        
        e.target.reset();
        alert("Transaction Saved!");
        this.loadFinance();
    },

    async loadFinance() {
        const trans = await DB.getAll('transactions', 'livestock', this.state.livestock);
        const income = trans.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const expense = trans.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        
        const balEl = document.getElementById('total-balance');
        if(balEl) balEl.innerText = `${this.state.currency} ${(income - expense).toLocaleString()}`;

        const list = document.getElementById('transaction-list');
        if(!list) return;

        list.innerHTML = trans.sort((a,b) => new Date(b.date) - new Date(a.date)).map(t => `
            <li class="list-item">
                <div><strong>${t.category}</strong><br><small>${Utils.formatDate(t.date)}</small></div>
                <span style="color: ${t.type === 'income' ? 'var(--primary)' : 'var(--danger)'}">
                    ${t.type === 'income' ? '+' : '-'}${t.amount}
                </span>
            </li>
        `).join('') || '<p class="text-center text-muted">No transactions.</p>';
    },

    // --- REMINDERS LOGIC ---
    async saveReminder(e) {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());
        const reminder = {
            id: Utils.uuid(),
            livestock: this.state.livestock,
            task: data.task,
            animal: data.animal,
            date: data.date,
            completed: false
        };

        const local = JSON.parse(localStorage.getItem('ft_reminders') || '[]');
        local.push(reminder);
        localStorage.setItem('ft_reminders', JSON.stringify(local));

        e.target.reset();
        alert("Reminder Set!");
        this.renderVaxSchedule();
    },

    async renderVaxSchedule() {
        const list = document.getElementById('vax-list');
        if(!list) return;
        const local = JSON.parse(localStorage.getItem('ft_reminders') || '[]');
        const filtered = local.filter(r => r.livestock === this.state.livestock);

        list.innerHTML = filtered.map(r => `
            <li class="list-item">
                <div><strong>${r.task}</strong><br><small>${r.animal} • ${Utils.formatDate(r.date)}</small></div>
                <button onclick="app.deleteReminder('${r.id}')" class="btn-text-danger"><i class="fa-solid fa-check-circle"></i></button>
            </li>
        `).join('') || '<p class="text-muted">No upcoming tasks.</p>';
    },

    deleteReminder(id) {
        let local = JSON.parse(localStorage.getItem('ft_reminders') || '[]');
        localStorage.setItem('ft_reminders', JSON.stringify(local.filter(r => r.id !== id)));
        this.renderVaxSchedule();
    },

    // --- DASHBOARD ---
    async refreshDashboard() {
        const records = await DB.getAll('records', 'livestock', this.state.livestock);
        const trans = await DB.getAll('transactions', 'livestock', this.state.livestock);
        
        const totalProd = records.reduce((sum, r) => sum + (parseFloat(r.quantity) || 0), 0);
        const income = trans.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const expense = trans.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

        const kpis = document.querySelectorAll('.kpi-card .value');
        if (kpis.length >= 2) {
            kpis[0].innerText = totalProd.toFixed(1);
            kpis[1].innerText = `${this.state.currency} ${(income - expense).toFixed(0)}`;
        }
        this.renderChart(records);
    },

    renderChart(records) {
        const canvas = document.getElementById('productionChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (this.state.chartInstance) this.state.chartInstance.destroy();
        const sorted = records.sort((a,b) => new Date(a.date) - new Date(b.date)).slice(-7);
        
        this.state.chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: sorted.map(r => r.date.split('-').slice(1).join('/')),
                datasets: [{ 
                    label: 'Yield', 
                    data: sorted.map(r => r.quantity), 
                    borderColor: '#10B981', 
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true,
                    tension: 0.4 
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    },

    // --- CLOUD SYNC & UTILS ---
    async saveToCloud(colName, data) {
        if (!window.auth.currentUser) return;
        try {
            await addDoc(collection(window.db, colName), {
                ...data,
                userId: window.auth.currentUser.uid,
                timestamp: serverTimestamp()
            });
        } catch (e) { console.error("Cloud Sync Failed", e); }
    },

    async deleteItem(store, id) {
        if(confirm("Delete this entry?")) {
            await DB.delete(store, id);
            this.loadRecords();
            this.refreshDashboard();
        }
    },

    selectLivestock(type) {
        this.state.livestock = type;
        localStorage.setItem('ft_livestock', type);
        this.loadAppShell();
    },

    loadAppShell() {
        document.getElementById('landing-page').classList.add('hidden');
        document.getElementById('app-shell').classList.remove('hidden');
        document.getElementById('header-title').innerText = this.state.livestock.toUpperCase();
        this.renderAddForm();
        this.switchTab('view-dashboard', document.querySelector('[data-target="view-dashboard"]'));
    },

    renderAddForm() {
        const container = document.getElementById('dynamic-fields');
        let html = `<div class="mb-3"><label class="text-muted">Date</label><input type="date" name="date" class="modern-input" required value="${new Date().toISOString().split('T')[0]}"></div>`;
        if (this.state.livestock === 'dairy') {
            html += `<input type="text" name="cowId" placeholder="Cow ID / Name" class="modern-input" required>
                     <input type="number" name="quantity" placeholder="Liters Collected" class="modern-input" step="0.1" required>`;
        } else if (this.state.livestock === 'poultry') {
            html += `<input type="number" name="quantity" placeholder="Eggs Collected" class="modern-input" required>
                     <input type="number" name="mortality" placeholder="Birds Lost (Optional)" class="modern-input">`;
        } else {
            html += `<input type="text" name="cowId" placeholder="Animal ID" class="modern-input">
                     <input type="number" name="quantity" placeholder="Weight (Kg)" class="modern-input" step="0.1" required>`;
        }
        html += `<textarea name="notes" placeholder="Notes..." class="modern-input" rows="2"></textarea>`;
        container.innerHTML = html;
    },

    applyTheme() { document.body.classList.toggle('dark-mode', this.state.theme === 'dark'); },
    
    async generateReport() {
        const records = await DB.getAll('records', 'livestock', this.state.livestock);
        const trans = await DB.getAll('transactions', 'livestock', this.state.livestock);
        Utils.generatePDF('Farm Production Report', records, trans, this.state.livestock);
    }
};

window.app = App;
document.addEventListener('DOMContentLoaded', () => App.init());
