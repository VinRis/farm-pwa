import { DB } from './db.js';
import { Utils } from './utils.js';

const App = {
    state: {
        livestock: localStorage.getItem('ft_livestock') || null,
        currency: localStorage.getItem('ft_currency') || 'KSh',
        theme: localStorage.getItem('ft_theme') || 'light'
    },

    async init() {
        this.applyTheme();
        this.bindEvents();
        if (this.state.livestock) this.loadAppShell();
        
        // Listen for Firebase Auth if available
        if (window.auth) {
            window.auth.onAuthStateChanged(user => {
                document.getElementById('user-email-display').innerText = user ? user.email : "Guest User";
            });
        }
    },

    bindEvents() {
        // Tab Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.currentTarget.getAttribute('data-target');
                this.switchTab(target, e.currentTarget);
            });
        });

        // Theme & Home
        document.getElementById('theme-toggle')?.addEventListener('click', () => {
            this.state.theme = this.state.theme === 'light' ? 'dark' : 'light';
            localStorage.setItem('ft_theme', this.state.theme);
            this.applyTheme();
        });

        document.getElementById('home-btn')?.addEventListener('click', () => {
            localStorage.removeItem('ft_livestock');
            location.reload();
        });

        // Form Submissions
        document.getElementById('add-record-form')?.addEventListener('submit', (e) => this.handleProduction(e));
        document.getElementById('add-transaction-form')?.addEventListener('submit', (e) => this.handleFinance(e));
        document.getElementById('reminder-form')?.addEventListener('submit', (e) => this.handleReminder(e));
        document.getElementById('generate-pdf-btn')?.addEventListener('click', () => this.generateReport());
    },

    switchTab(viewId, btn) {
        document.querySelectorAll('.tab-view').forEach(v => v.classList.add('hidden'));
        document.getElementById(viewId)?.classList.remove('hidden');
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        btn?.classList.add('active');

        if (viewId === 'view-dashboard') this.refreshDashboard();
        if (viewId === 'view-records') this.loadHistory();
        if (viewId === 'view-finance') this.loadFinance();
        if (viewId === 'view-vax') this.loadReminders();
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
        this.renderFields();
        this.refreshDashboard();
    },

    renderFields() {
        const container = document.getElementById('dynamic-fields');
        let html = `<input type="date" name="date" class="modern-input" required value="${new Date().toISOString().split('T')[0]}">`;
        if (this.state.livestock === 'dairy') {
            html += `<input type="text" name="cowId" placeholder="Cow ID" class="modern-input" required>
                     <input type="number" name="quantity" placeholder="Liters" class="modern-input" step="0.1" required>`;
        } else {
            html += `<input type="number" name="quantity" placeholder="Quantity/Weight" class="modern-input" required>`;
        }
        container.innerHTML = html;
    },

    async refreshDashboard() {
        const records = await DB.getAll('records', 'livestock', this.state.livestock);
        const kpi = document.getElementById('kpi-container');
        const total = records.reduce((s, r) => s + parseFloat(r.quantity || 0), 0);
        
        kpi.innerHTML = `
            <div class="kpi-card"><h4>Total Yield</h4><div class="value">${total.toFixed(1)}</div></div>
            <div class="kpi-card"><h4>Records</h4><div class="value">${records.length}</div></div>
        `;
        this.renderChart(records);
    },

    async handleProduction(e) {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target));
        await DB.add('records', { id: Utils.uuid(), livestock: this.state.livestock, ...data });
        e.target.reset();
        alert("Saved!");
        this.switchTab('view-dashboard', document.querySelector('[data-target="view-dashboard"]'));
    },

    async loadHistory() {
        const records = await DB.getAll('records', 'livestock', this.state.livestock);
        const tbody = document.querySelector('#records-table tbody');
        tbody.innerHTML = records.map(r => `
            <tr>
                <td>${r.date}</td>
                <td>${r.quantity}</td>
                <td class="text-right"><button onclick="app.deleteItem('records','${r.id}')" class="btn-text-danger">Delete</button></td>
            </tr>
        `).join('');
    },

    async loadFinance() {
        const trans = await DB.getAll('transactions', 'livestock', this.state.livestock);
        const income = trans.filter(t => t.type === 'income').reduce((s, t) => s + parseFloat(t.amount), 0);
        const expense = trans.filter(t => t.type === 'expense').reduce((s, t) => s + parseFloat(t.amount), 0);
        document.getElementById('total-balance').innerText = `${this.state.currency} ${income - expense}`;
        
        document.getElementById('transaction-list').innerHTML = trans.map(t => `
            <li class="list-item">
                <span>${t.category}</span>
                <span class="${t.type}">${t.type === 'income' ? '+' : '-'}${t.amount}</span>
            </li>
        `).join('');
    },

    async handleFinance(e) {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target));
        await DB.add('transactions', { id: Utils.uuid(), livestock: this.state.livestock, ...data });
        e.target.reset();
        this.loadFinance();
    },

    async handleReminder(e) {
        e.preventDefault();
        const reminder = {
            id: Utils.uuid(),
            livestock: this.state.livestock,
            animal: document.getElementById('remind-animal').value,
            date: document.getElementById('remind-date').value,
            task: document.getElementById('remind-task').value
        };
        await DB.add('reminders', reminder);
        e.target.reset();
        this.loadReminders();
    },

    async loadReminders() {
        const list = await DB.getAll('reminders', 'livestock', this.state.livestock);
        document.getElementById('vax-list').innerHTML = list.map(r => `
            <li class="list-item">
                <div><strong>${r.task}</strong><br><small>${r.animal} - ${r.date}</small></div>
            </li>
        `).join('');
    },

    async deleteItem(store, id) {
        if(confirm("Delete?")) {
            await DB.delete(store, id);
            this.loadHistory();
            this.refreshDashboard();
        }
    },

    renderChart(records) {
        const ctx = document.getElementById('productionChart');
        if (!ctx) return;
        if (this.state.chartInstance) this.state.chartInstance.destroy();
        const sorted = records.sort((a,b) => new Date(a.date) - new Date(b.date)).slice(-7);
        this.state.chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: sorted.map(r => r.date),
                datasets: [{ label: 'Yield', data: sorted.map(r => r.quantity), borderColor: '#10B981' }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    },

    applyTheme() { document.body.classList.toggle('dark-mode', this.state.theme === 'dark'); },
    
    async generateReport() {
        const r = await DB.getAll('records', 'livestock', this.state.livestock);
        Utils.generatePDF("Farm Report", r, [], this.state.livestock);
    }
};

window.app = App;
document.addEventListener('DOMContentLoaded', () => App.init());
