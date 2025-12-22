import { DB } from './db.js';
import { Utils } from './utils.js';

const App = {
    state: {
        livestock: localStorage.getItem('ft_livestock') || null,
        theme: localStorage.getItem('ft_theme') || 'light',
        currency: 'KSh',
        chartInstance: null
    },

    async init() {
        this.applyTheme();
        this.bindEvents();
        if (this.state.livestock) this.loadAppShell();
    },

    bindEvents() {
        // Livestock Selection
        document.querySelectorAll('.livestock-card').forEach(card => {
            card.addEventListener('click', () => {
                const type = card.getAttribute('data-type');
                this.selectLivestock(type);
            });
        });

        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.currentTarget.getAttribute('data-target');
                this.switchTab(target, e.currentTarget);
            });
        });

        // Home Button
        document.getElementById('home-btn')?.addEventListener('click', () => {
            this.state.livestock = null;
            localStorage.removeItem('ft_livestock');
            location.reload(); 
        });

        // Form Submissions
        document.getElementById('add-record-form')?.addEventListener('submit', (e) => this.saveRecord(e));
    },

    async selectLivestock(type) {
        this.state.livestock = type;
        localStorage.setItem('ft_livestock', type);
        this.loadAppShell();
    },

    loadAppShell() {
        document.getElementById('landing-page').classList.add('hidden');
        document.getElementById('app-shell').classList.remove('hidden');
        document.getElementById('header-title').innerText = `${this.state.livestock.toUpperCase()} FARM`;
        this.renderAddForm();
        this.refreshDashboard();
    },

    renderAddForm() {
        const container = document.getElementById('dynamic-fields');
        if (!container) return;
        
        let html = `<input type="date" name="date" class="modern-input" required value="${new Date().toISOString().split('T')[0]}">`;
        if (this.state.livestock === 'dairy') {
            html += `<input type="text" name="cowId" placeholder="Cow Name/ID" class="modern-input" required>
                     <input type="number" name="quantity" placeholder="Liters" class="modern-input" step="0.1" required>`;
        } else {
            html += `<input type="number" name="quantity" placeholder="Quantity/Weight" class="modern-input" required>`;
        }
        container.innerHTML = html;
    },

    async saveRecord(e) {
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
        e.target.reset();
        alert('Data Saved Locally');
        this.refreshDashboard();
    },

    async refreshDashboard() {
        const records = await DB.getAll('records', 'livestock', this.state.livestock);
        
        // Update KPI
        const total = records.reduce((sum, r) => sum + (parseFloat(r.quantity) || 0), 0);
        const kpiValue = document.querySelector('.kpi-card .value');
        if (kpiValue) kpiValue.innerText = total.toFixed(1);

        this.renderChart(records);
    },

    renderChart(records) {
        const ctx = document.getElementById('productionChart')?.getContext('2d');
        if (!ctx) return;

        if (this.state.chartInstance) this.state.chartInstance.destroy();

        const sorted = records.sort((a, b) => new Date(a.date) - new Date(b.date)).slice(-7);

        this.state.chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: sorted.map(r => Utils.formatDate(r.date)),
                datasets: [{
                    label: 'Yield',
                    data: sorted.map(r => r.quantity),
                    borderColor: '#10B981',
                    tension: 0.4,
                    fill: true,
                    backgroundColor: 'rgba(16, 185, 129, 0.1)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } }
            }
        });
    },

    switchTab(viewId, btn) {
        document.querySelectorAll('.tab-view').forEach(v => v.classList.add('hidden'));
        document.getElementById(viewId)?.classList.remove('hidden');
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        btn?.classList.add('active');
        
        if (viewId === 'view-dashboard') this.refreshDashboard();
    },

    applyTheme() {
        document.body.classList.toggle('dark-mode', this.state.theme === 'dark');
    }
};

window.app = App;
document.addEventListener('DOMContentLoaded', () => App.init());
