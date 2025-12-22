import { DB } from './db.js';
import { Utils } from './utils.js';

// Firebase Auth & Firestore Imports
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
        // Nav Buttons
        document.querySelectorAll('.bottom-nav .nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetBtn = e.target.closest('.nav-btn');
                this.switchTab(targetBtn.getAttribute('data-target'), targetBtn);
            });
        });

        // Other UI Handlers
        document.getElementById('home-btn')?.addEventListener('click', () => {
            this.state.livestock = null;
            localStorage.removeItem('ft_livestock');
            document.getElementById('app-shell').classList.add('hidden');
            document.getElementById('landing-page').classList.remove('hidden');
        });

        document.getElementById('theme-toggle')?.addEventListener('click', () => {
            this.state.theme = this.state.theme === 'light' ? 'dark' : 'light';
            localStorage.setItem('ft_theme', this.state.theme);
            this.applyTheme();
        });

        // Form Handlers
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

        if (viewId === 'view-dashboard') this.refreshDashboard();
        if (viewId === 'view-records') this.loadRecords();
        if (viewId === 'view-finance') this.loadFinance();
        if (viewId === 'view-vax') this.renderVaxSchedule();
    },

    async saveProductionRecord(e) {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());
        const record = { id: Utils.uuid(), livestock: this.state.livestock, createdAt: Date.now(), ...data };
        await DB.add('records', record);
        this.saveToCloud("production", record);
        e.target.reset();
        alert("Record Saved!");
        this.switchTab('view-dashboard', document.querySelector('[data-target="view-dashboard"]'));
    },

    async refreshDashboard() {
        const records = await DB.getAll('records', 'livestock', this.state.livestock);
        const trans = await DB.getAll('transactions', 'livestock', this.state.livestock);
        
        const totalProd = records.reduce((sum, r) => sum + (parseFloat(r.quantity) || 0), 0);
        const income = trans.filter(t => t.type === 'income').reduce((sum, t) => sum + parseFloat(t.amount), 0);
        const expense = trans.filter(t => t.type === 'expense').reduce((sum, t) => sum + parseFloat(t.amount), 0);

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
                datasets: [{ label: 'Yield', data: sorted.map(r => r.quantity), borderColor: '#10B981', tension: 0.4 }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
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
        let html = `<input type="date" name="date" class="modern-input" required value="${new Date().toISOString().split('T')[0]}">`;
        if (this.state.livestock === 'dairy') {
            html += `<input type="text" name="cowId" placeholder="Cow ID" class="modern-input" required><input type="number" name="quantity" placeholder="Liters" class="modern-input" step="0.1" required>`;
        } else {
            html += `<input type="number" name="quantity" placeholder="Quantity/Weight" class="modern-input" required>`;
        }
        container.innerHTML = html;
    },

    applyTheme() { document.body.classList.toggle('dark-mode', this.state.theme === 'dark'); },
    
    // Placeholder for required methods
    async loadRecords() {},
    async loadFinance() {},
    async renderVaxSchedule() {},
    async saveTransaction() {},
    async saveReminder() {},
    async saveToCloud() {},
    async generateReport() {
        const records = await DB.getAll('records', 'livestock', this.state.livestock);
        const trans = await DB.getAll('transactions', 'livestock', this.state.livestock);
        Utils.generatePDF('Farm Report', records, trans, this.state.livestock);
    }
};

window.app = App;
document.addEventListener('DOMContentLoaded', () => App.init());
