import { crud } from './db.js';
import { formatters, uuid, exportCSV, getMonthRange } from './utils.js';
import { loadSampleData } from './sample-data.js';

const state = {
    livestock: null,
    currentView: 'dashboard',
    chart: null
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    await loadSampleData();
    const meta = await crud.get('meta', 'selectedLivestock');
    
    if (meta) {
        state.livestock = meta.value;
        initApp();
    } else {
        document.getElementById('livestock-modal').classList.add('show');
    }

    setupEventListeners();
    checkOnlineStatus();
});

function initApp() {
    document.getElementById('livestock-modal').classList.remove('show');
    document.getElementById('app-title').textContent = `${state.livestock} Production`;
    renderView(state.currentView);
}

function setupEventListeners() {
    // Nav Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.dataset.view;
            switchView(view);
        });
    });

    // Livestock Selection
    document.querySelectorAll('.select-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            state.livestock = btn.dataset.type;
            await crud.put('meta', { key: 'selectedLivestock', value: state.livestock });
            initApp();
        });
    });

    window.addEventListener('online', checkOnlineStatus);
    window.addEventListener('offline', checkOnlineStatus);
}

function checkOnlineStatus() {
    const statusIcon = document.getElementById('sync-status');
    if (navigator.onLine) {
        statusIcon.style.color = '#fff';
        syncToCloud();
    } else {
        statusIcon.style.color = 'rgba(255,255,255,0.4)';
    }
}

async function switchView(viewName) {
    state.currentView = viewName;
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === viewName));
    renderView(viewName);
}

// --- View Rendering ---
async function renderView(view) {
    const container = document.getElementById(`view-${view}`);
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    container.classList.add('active');

    const records = (await crud.getAll('records')).filter(r => r.livestock === state.livestock);
    const transactions = (await crud.getAll('transactions')).filter(r => r.livestock === state.livestock);

    switch (view) {
        case 'dashboard': renderDashboard(container, records, transactions); break;
        case 'add-record': renderAddRecord(container); break;
        case 'records': renderRecordsList(container, records); break;
        case 'finance': renderFinance(container, transactions); break;
        case 'reports': renderReports(container, records, transactions); break;
    }
}

// --- Component Handlers ---

async function renderDashboard(container, records, transactions) {
    const now = new Date();
    const thisMonth = records.filter(r => new Date(r.date).getMonth() === now.getMonth());
    const totalProd = thisMonth.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);
    const totalFeed = thisMonth.reduce((sum, r) => sum + (Number(r.feedKg) || 0), 0);
    
    const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    container.innerHTML = `
        <div class="kpi-grid">
            <div class="card kpi-card"><h3>Total Production</h3><div class="value">${totalProd}</div></div>
            <div class="card kpi-card"><h3>Net Profit</h3><div class="value">${formatters.currency(income - expense)}</div></div>
            <div class="card kpi-card"><h3>Feed Consumed</h3><div class="value">${totalFeed} kg</div></div>
            <div class="card kpi-card"><h3>Projected</h3><div class="value">${formatters.currency(income * 1.1)}</div></div>
        </div>
        <div class="card chart-container"><canvas id="prodChart"></canvas></div>
        <h3>Recent Records</h3>
        <div id="recent-list">${records.slice(-3).map(r => `<div class="record-item"><span>${formatters.date(r.date)}</span> <b>${r.quantity} ${r.unit || ''}</b></div>`).join('')}</div>
    `;

    // Charting
    setTimeout(() => {
        const ctx = document.getElementById('prodChart').getContext('2d');
        if(state.chart) state.chart.destroy();
        state.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: records.slice(-7).map(r => formatters.date(r.date)),
                datasets: [{ label: 'Production', data: records.slice(-7).map(r => r.quantity), borderColor: '#2e7d32', tension: 0.3 }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }, 100);
}

function renderAddRecord(container) {
    const fields = {
        dairy: ['Cow ID', 'Session (M/E)', 'Milk (Liters)'],
        poultry: ['Flock ID', 'Eggs Collected', 'Mortality'],
        pig: ['Pig ID', 'Weight (kg)', 'Piglets Born'],
        goat: ['Goat ID', 'Milk/Weight', 'Notes']
    };

    container.innerHTML = `
        <div class="card">
            <h2>New ${state.livestock} Entry</h2>
            <form id="record-form">
                <div class="form-group"><label>Date</label><input type="date" id="f-date" value="${new Date().toISOString().split('T')[0]}" required></div>
                <div class="form-group"><label>${fields[state.livestock][0]}</label><input type="text" id="f-id" required></div>
                <div class="form-group"><label>${fields[state.livestock][1]}</label><input type="number" id="f-qty" required></div>
                <div class="form-group"><label>Feed (kg)</label><input type="number" id="f-feed"></div>
                <div class="form-group"><label>Notes</label><textarea id="f-notes"></textarea></div>
                <button type="submit" class="btn">Save Record</button>
            </form>
        </div>
    `;

    document.getElementById('record-form').onsubmit = async (e) => {
        e.preventDefault();
        const data = {
            id: uuid(),
            livestock: state.livestock,
            date: document.getElementById('f-date').value,
            animalId: document.getElementById('f-id').value,
            quantity: Number(document.getElementById('f-qty').value),
            feedKg: Number(document.getElementById('f-feed').value),
            notes: document.getElementById('f-notes').value,
            createdAt: new Date().toISOString()
        };
        await crud.put('records', data);
        alert('Saved successfully!');
        switchView('dashboard');
    };
}

function renderRecordsList(container, records) {
    container.innerHTML = `
        <div style="display:flex; justify-content:space-between; margin-bottom:15px;">
            <h3>All Logs</h3>
            <button id="btn-csv" class="btn" style="width:auto; padding:5px 15px;">CSV</button>
        </div>
        ${records.map(r => `
            <div class="record-item">
                <div class="record-info">
                    <strong>${r.animalId || 'General'}</strong>
                    <div>${formatters.date(r.date)}</div>
                </div>
                <div class="record-qty">${r.quantity}</div>
                <button onclick="window._delRecord('${r.id}')" style="background:none; border:none; color:var(--danger);"><i class="fas fa-trash"></i></button>
            </div>
        `).join('')}
    `;
    document.getElementById('btn-csv').onclick = () => exportCSV(records, `${state.livestock}_records`);
}

window._delRecord = async (id) => {
    if(confirm('Delete this record?')) {
        await crud.delete('records', id);
        renderView('records');
    }
};

function renderFinance(container, transactions) {
    container.innerHTML = `
        <div class="card" style="margin-bottom:20px;">
            <h3>Add Transaction</h3>
            <form id="trans-form">
                <select id="t-type"><option value="income">Income</option><option value="expense">Expense</option></select>
                <input type="number" id="t-amount" placeholder="Amount" required style="margin:10px 0;">
                <input type="text" id="t-cat" placeholder="Category (e.g. Feed, Sale)" required>
                <button type="submit" class="btn btn-secondary" style="margin-top:10px;">Add</button>
            </form>
        </div>
        <h3>History</h3>
        ${transactions.map(t => `
            <div class="record-item" style="border-left-color: ${t.type === 'income' ? 'green' : 'red'}">
                <span>${t.category}</span>
                <span style="color: ${t.type === 'income' ? 'green' : 'red'}">${t.type === 'income' ? '+' : '-'}${t.amount}</span>
            </div>
        `).join('')}
    `;

    document.getElementById('trans-form').onsubmit = async (e) => {
        e.preventDefault();
        const data = {
            id: uuid(),
            livestock: state.livestock,
            date: new Date().toISOString(),
            type: document.getElementById('t-type').value,
            amount: Number(document.getElementById('t-amount').value),
            category: document.getElementById('t-cat').value
        };
        await crud.put('transactions', data);
        renderView('finance');
    };
}

async function renderReports(container, records, transactions) {
    container.innerHTML = `
        <div class="card" style="text-align:center;">
            <i class="fas fa-file-pdf" style="font-size:3rem; color:var(--danger); margin-bottom:15px;"></i>
            <h2>Monthly Summary Report</h2>
            <p>Generate a professional PDF report of your ${state.livestock} production and finances.</p>
            <button id="btn-pdf" class="btn">Download PDF Report</button>
            <button id="btn-backup" class="btn btn-secondary" style="margin-top:10px;">Export JSON Backup</button>
        </div>
    `;

    document.getElementById('btn-pdf').onclick = () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.setFontSize(20);
        doc.text(`FarmTrack: ${state.livestock} Report`, 14, 22);
        doc.setFontSize(11);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
        
        const data = records.map(r => [formatters.date(r.date), r.animalId, r.quantity]);
        doc.autoTable({
            startY: 40,
            head: [['Date', 'ID', 'Quantity']],
            body: data,
        });
        doc.save(`${state.livestock}_report.pdf`);
    };

    document.getElementById('btn-backup').onclick = async () => {
        const data = {
            records: await crud.getAll('records'),
            transactions: await crud.getAll('transactions'),
            meta: await crud.getAll('meta')
        };
        const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `farmtrack_backup_${Date.now()}.json`;
        a.click();
    };
}

// --- Sync Placeholder ---
async function syncToCloud() {
    const queue = await crud.getAll('syncQueue');
    if (queue.length === 0) return;
    console.log("Syncing items to cloud...", queue);
    // Placeholder for API call: fetch('/api/sync', { method: 'POST', body: JSON.stringify(queue) })
    // On success: await crud.clear('syncQueue');
}
