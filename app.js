import { DB } from './db.js';
import { Utils } from './utils.js';

const App = {
    state: {
        livestock: localStorage.getItem('ft_livestock') || null,
        currency: 'KSh',
        chartInstance: null
    },

    async init() {
        this.bindEvents();
        if (this.state.livestock) {
            this.loadAppShell();
        }
    },

    bindEvents() {
        // Handle the livestock selection from your HTML
        window.selectLivestock = (type) => this.selectLivestock(type);

        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.currentTarget.getAttribute('data-target');
                this.switchTab(target, e.currentTarget);
            });
        });

        document.getElementById('add-record-form')?.addEventListener('submit', (e) => this.saveRecord(e));
        document.getElementById('home-btn')?.addEventListener('click', () => {
            localStorage.removeItem('ft_livestock');
            window.location.reload();
        });
    },

    selectLivestock(type) {
        this.state.livestock = type;
        localStorage.setItem('ft_livestock', type);
        this.loadAppShell();
    },

    async loadAppShell() {
        try {
            const landing = document.getElementById('landing-page');
            const shell = document.getElementById('app-shell');
            
            if (landing) landing.classList.add('hidden');
            if (shell) shell.classList.remove('hidden');
            
            document.getElementById('header-title').innerText = this.state.livestock.toUpperCase();
            this.renderFields();
            await this.refreshDashboard();
        } catch (err) {
            console.error("Error loading shell:", err);
        }
    },

    renderFields() {
        const container = document.getElementById('dynamic-fields');
        if (!container) return;
        let html = `<input type="date" name="date" class="modern-input" required value="${new Date().toISOString().split('T')[0]}">`;
        html += `<input type="number" name="quantity" placeholder="Yield/Quantity" class="modern-input" step="0.1" required>`;
        container.innerHTML = html;
    },

    async refreshDashboard() {
        try {
            const records = await DB.getAll('records', 'livestock', this.state.livestock);
            const total = records.reduce((s, r) => s + parseFloat(r.quantity || 0), 0);
            
            const kpi = document.getElementById('kpi-container');
            if (kpi) {
                kpi.innerHTML = `<div class="kpi-card"><h4>Total Production</h4><div class="value">${total.toFixed(1)}</div></div>`;
            }
            this.renderChart(records);
        } catch (err) {
            console.error("Dashboard error:", err);
        }
    },

    renderChart(records) {
        const canvas = document.getElementById('productionChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (this.state.chartInstance) this.state.chartInstance.destroy();
        
        const sorted = records.slice(-7);
        this.state.chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: sorted.map(r => r.date || ''),
                datasets: [{ label: 'Yield', data: sorted.map(r => r.quantity), borderColor: '#10B981' }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    },

    switchTab(viewId, btn) {
        document.querySelectorAll('.tab-view').forEach(v => v.classList.add('hidden'));
        document.getElementById(viewId)?.classList.remove('hidden');
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        btn?.classList.add('active');
    },

    async saveRecord(e) {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target));
        const record = { id: Utils.uuid(), livestock: this.state.livestock, ...data };
        await DB.add('records', record);
        e.target.reset();
        alert("Saved!");
        this.refreshDashboard();
    }
};

window.app = App;
document.addEventListener('DOMContentLoaded', () => App.init());
