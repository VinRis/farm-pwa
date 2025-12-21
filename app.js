import { DB } from './db.js';
import { Utils } from './utils.js';
import { loadSampleData } from './sample-data.js';

const App = {
    state: {
        livestock: localStorage.getItem('ft_livestock') || null,
        theme: localStorage.getItem('ft_theme') || 'light',
        chartInstance: null
    },

    init() {
        this.applyTheme();
        this.bindEvents();
        
        if (this.state.livestock) {
            this.loadAppShell();
        } else {
            loadSampleData(); 
        }

        window.addEventListener('online', () => this.syncToCloud());
    },

    bindEvents() {
        // Navigation Buttons
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

        // FORM SUBMIT: Add/Update Record
        document.getElementById('add-record-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());
            const editId = data.editId;

            // Normalize numbers
            ['quantity', 'feedKg', 'weightKg', 'mortality', 'pigletsBorn'].forEach(k => {
                if(data[k]) data[k] = parseFloat(data[k]);
            });

            const record = {
                id: editId || Utils.uuid(),
                livestock: this.state.livestock,
                updatedAt: Date.now(),
                ...data
            };
            delete record.editId; 

            if (editId) {
                await DB.update('records', record);
                alert('Record updated!');
            } else {
                record.createdAt = Date.now();
                await DB.add('records', record);
                alert('Record saved!');
            }
            
            e.target.reset();
            const submitBtn = e.target.querySelector('button[type="submit"]');
            if (submitBtn) submitBtn.innerText = "Save Record";
            
            // Clear hidden ID after save
            const hiddenInput = document.getElementById('edit-id');
            if (hiddenInput) hiddenInput.value = "";

            this.refreshDashboard();
        });

        // Other Listeners
        document.getElementById('add-transaction-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());
            data.amount = parseFloat(data.amount);
            await DB.add('transactions', { id: Utils.uuid(), livestock: this.state.livestock, createdAt: Date.now(), ...data });
            e.target.reset();
            this.loadFinance();
        });

        document.getElementById('record-filter-date')?.addEventListener('change', () => this.loadRecords());
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
        document.getElementById('landing-page').classList.add('hidden');
        document.getElementById('app-shell').classList.remove('hidden');
        
        const titles = { dairy: 'Dairy Farm', poultry: 'Poultry Farm', pig: 'Pig Farm', goat: 'Goat Farm' };
        document.getElementById('header-title').innerText = titles[this.state.livestock] || 'My Farm';

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
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        const thisMonthRecs = records.filter(r => {
            const d = new Date(r.date);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });

        let totalProd = 0, totalFeed = 0, mortality = 0;
        let unit = this.state.livestock === 'dairy' ? 'L' : (this.state.livestock === 'poultry' ? 'Eggs' : 'Kg');

        thisMonthRecs.forEach(r => {
            totalProd += (r.quantity || 0);
            totalFeed += (r.feedKg || 0);
            mortality += (r.mortality || 0);
        });

        document.getElementById('kpi-container').innerHTML = `
            <div class="kpi-card"><h4>Production (${unit})</h4><div class="value">${totalProd.toFixed(1)}</div></div>
            <div class="kpi-card"><h4>Feed (Kg)</h4><div class="value">${totalFeed.toFixed(1)}</div></div>
            <div class="kpi-card"><h4>Mortality</h4><div class="value" style="color:red">${mortality}</div></div>
            <div class="kpi-card"><h4>Records</h4><div class="value">${thisMonthRecs.length}</div></div>
        `;

        this.renderChart(records);
    },

    renderChart(records) {
        const days = {};
        records.sort((a,b) => new Date(a.date) - new Date(b.date)).forEach(r => {
            if(r.quantity) days[r.date] = (days[r.date] || 0) + r.quantity;
        });

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
            options: { responsive: true, maintainAspectRatio: false }
        });
    },

    async loadRecords() {
        const filterDate = document.getElementById('record-filter-date').value;
        let records = await DB.getAll('records', 'livestock', this.state.livestock);
        if (filterDate) records = records.filter(r => r.date.startsWith(filterDate));
        
        records.sort((a,b) => new Date(b.date) - new Date(a.date));
        const tbody = document.querySelector('#records-table tbody');
        if (!tbody) return;
    
        tbody.innerHTML = records.map(r => `
            <tr>
                <td><input type="checkbox" class="record-checkbox" value="${r.id}"></td>
                <td>${r.date}</td>
                <td><small>${r.cowId || r.flockId || r.pigId || r.goatId || 'N/A'}</small></td>
                <td>${r.quantity || '-'}${r.unit || ''}</td>
                <td>
                    <button onclick="app.editRecord('${r.id}')" class="btn-secondary btn-sm"><i class="fa-solid fa-pen"></i></button>
                    <button onclick="app.deleteRecord('${r.id}')" class="btn-danger btn-sm"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    
        this.initRecordListeners();
    },

    initRecordListeners() {
        const selectAll = document.getElementById('select-all-records');
        const checkboxes = document.querySelectorAll('.record-checkbox');
        const bulkBtn = document.getElementById('bulk-delete-btn');
        const countSpan = document.getElementById('selected-count');

        const updateBulkUI = () => {
            const checkedCount = document.querySelectorAll('.record-checkbox:checked').length;
            if (checkedCount > 0) {
                bulkBtn?.classList.remove('hidden');
                if (countSpan) countSpan.innerText = checkedCount;
            } else {
                bulkBtn?.classList.add('hidden');
            }
        };

        if (selectAll) {
            selectAll.onchange = () => {
                checkboxes.forEach(cb => cb.checked = selectAll.checked);
                updateBulkUI();
            };
        }

        checkboxes.forEach(cb => { cb.onchange = () => updateBulkUI(); });

        if (bulkBtn) {
            bulkBtn.onclick = async () => {
                const ids = Array.from(document.querySelectorAll('.record-checkbox:checked')).map(cb => cb.value);
                if (confirm(`Delete ${ids.length} records?`)) {
                    for (const id of ids) await DB.delete('records', id);
                    this.loadRecords();
                    this.refreshDashboard();
                    if (selectAll) selectAll.checked = false;
                }
            };
        }
    },

    async editRecord(id) {
        const records = await DB.getAll('records', 'livestock', this.state.livestock);
        const record = records.find(r => String(r.id) === String(id));
        if (!record) return;

        this.switchTab('view-add', document.querySelector('[data-target="view-add"]'));

        setTimeout(() => {
            const form = document.getElementById('add-record-form');
            if (!form) return;

            Object.keys(record).forEach(key => {
                if (form.elements[key]) form.elements[key].value = record[key];
            });

            let editIdInput = document.getElementById('edit-id');
            if (!editIdInput) {
                editIdInput = document.createElement('input');
                editIdInput.type = 'hidden';
                editIdInput.id = 'edit-id';
                editIdInput.name = 'editId';
                form.appendChild(editIdInput);
            }
            editIdInput.value = id;
            form.querySelector('button[type="submit"]').innerText = "Update Record";
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 100); 
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
                    <span class="amount ${t.type}">${t.type === 'income' ? '+' : '-'}${Utils.formatCurrency(t.amount)}</span>
                    <i class="fa-solid fa-trash" style="color:#aaa; cursor:pointer; margin-left:10px" onclick="app.deleteTransaction('${t.id}')"></i>
                </li>
            `;
        }).join('');

        document.getElementById('fin-income').innerText = Utils.formatCurrency(income);
        document.getElementById('fin-expense').innerText = Utils.formatCurrency(expense);
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

        Utils.generatePDF('Farm Report', 
            records.filter(r => r.date >= start && r.date <= end), 
            trans.filter(t => t.date >= start && t.date <= end), 
            this.state.livestock, start, end);
    },

    syncToCloud() { console.log('Online: Checking sync...'); }
};

window.app = App;
document.addEventListener('DOMContentLoaded', () => App.init());
