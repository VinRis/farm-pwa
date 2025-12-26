/* =========================================
   1. Database Layer (IndexedDB Wrapper)
   ========================================= */
const DB_NAME = 'AgriFlowDB';
const DB_VERSION = 1;

const dbManager = {
    db: null,
    async open() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('records')) {
                    const store = db.createObjectStore('records', { keyPath: 'id', autoIncrement: true });
                    store.createIndex('type', 'type', { unique: false });
                    store.createIndex('date', 'date', { unique: false });
                    store.createIndex('mode', 'mode', { unique: false }); // dairy or poultry
                }
                if (!db.objectStoreNames.contains('animals')) {
                    db.createObjectStore('animals', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
            };
            request.onsuccess = (e) => {
                this.db = e.target.result;
                resolve(this.db);
            };
            request.onerror = (e) => reject(e);
        });
    },
    async add(storeName, data) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction([storeName], 'readwrite');
            const store = tx.objectStore(storeName);
            const req = store.put(data);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    },
    async getAll(storeName) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction([storeName], 'readonly');
            const store = tx.objectStore(storeName);
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result);
        });
    },
    async delete(storeName, id) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction([storeName], 'readwrite');
            store = tx.objectStore(storeName);
            store.delete(id);
            tx.oncomplete = () => resolve();
        });
    }
};

/* =========================================
   2. App Logic & State
   ========================================= */
const app = {
    mode: null, // 'dairy' or 'poultry'
    view: 'dashboard',
    currency: 'KES',

    async init() {
        await dbManager.open();
        // Check for saved mode
        const savedMode = localStorage.getItem('farmMode');
        if (savedMode) {
            this.selectMode(savedMode, false);
        }
        
        // Service Worker Registration
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./sw.js')
                .then(() => console.log('SW Registered'))
                .catch(err => console.error('SW Error', err));
        }
    },

    selectMode(mode, save = true) {
        this.mode = mode;
        if (save) localStorage.setItem('farmMode', mode);
        document.getElementById('welcome-screen').classList.add('hidden');
        document.getElementById('app-container').classList.remove('hidden');
        document.getElementById('farm-mode-label').innerText = mode === 'dairy' ? 'Dairy Farm' : 'Poultry Farm';
        this.navigate('dashboard');
    },

    logout() {
        localStorage.removeItem('farmMode');
        location.reload();
    },

    toggleTheme() {
        const body = document.body;
        const isDark = body.getAttribute('data-theme') === 'dark';
        body.setAttribute('data-theme', isDark ? 'light' : 'dark');
    },

    navigate(viewId) {
        this.view = viewId;
        // Update Nav UI
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        document.querySelector(`.nav-item[onclick="app.navigate('${viewId}')"]`).classList.add('active');
        document.getElementById('page-title').innerText = viewId.charAt(0).toUpperCase() + viewId.slice(1);
        
        this.renderView(viewId);
    },

    async renderView(viewId) {
        const content = document.getElementById('content');
        content.innerHTML = '<div style="text-align:center; padding:20px;">Loading...</div>';
        
        const records = await dbManager.getAll('records');
        const animals = await dbManager.getAll('animals');
        
        // Filter records by current farm mode
        const farmRecords = records.filter(r => r.mode === this.mode);

        if (viewId === 'dashboard') ui.renderDashboard(farmRecords, animals);
        else if (viewId === 'history') ui.renderHistory(farmRecords);
        else if (viewId === 'finance') ui.renderFinance(farmRecords);
        else if (viewId === 'health') ui.renderHealth(farmRecords);
        else if (viewId === 'reports') ui.renderReports(farmRecords);
    },

    async saveForm() {
        const form = document.getElementById('generic-form');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        // Add Meta data
        data.date = data.date || new Date().toISOString().split('T')[0];
        data.timestamp = Date.now();
        data.mode = this.mode;

        // If ID exists, it's an animal, else it's a record
        const store = data.recordType === 'animal' ? 'animals' : 'records';
        if (data.recordType === 'animal' && !data.id) data.id = Date.now().toString(); // Simple ID gen
        
        await dbManager.add(store, data);
        ui.closeModal();
        ui.toast('Saved Successfully');
        this.renderView(this.view);
    }
};

/* =========================================
   3. UI Renderer
   ========================================= */
const ui = {
    renderDashboard(records, animals) {
        const content = document.getElementById('content');
        
        // Calc KPIs
        const currentMonth = new Date().toISOString().slice(0, 7);
        const thisMonthRecords = records.filter(r => r.date.startsWith(currentMonth));
        
        let production = 0;
        let income = 0;
        let expense = 0;

        thisMonthRecords.forEach(r => {
            if (r.type === 'production') production += parseFloat(r.amount || 0);
            if (r.type === 'income') income += parseFloat(r.amount || 0);
            if (r.type === 'expense') expense += parseFloat(r.amount || 0);
        });

        const prodLabel = app.mode === 'dairy' ? 'Litres Milk' : 'Eggs';
        
        // Generate Insights
        let insights = '';
        if (production === 0) insights += `<div class="insight-box">⚠️ No production recorded this month.</div>`;
        if (income < expense) insights += `<div class="insight-box">📉 Expenses exceed income this month.</div>`;
        
        // Render
        content.innerHTML = `
            <div class="kpi-row">
                <div class="kpi-card">
                    <small>${prodLabel} (Mo)</small>
                    <span class="kpi-val">${production}</span>
                </div>
                <div class="kpi-card">
                    <small>Profit (Mo)</small>
                    <span class="kpi-val" style="color:${income - expense >= 0 ? 'green' : 'red'}">
                        ${app.currency} ${income - expense}
                    </span>
                </div>
            </div>
            
            <h3>Smart Insights</h3>
            ${insights || '<p style="color:#777">Everything looks good!</p>'}
            
            <h3 style="margin-top:20px">Recent Activity</h3>
            <div class="card">
                ${this.generateList(records.slice(-5).reverse())}
            </div>

            ${app.mode === 'dairy' ? `
            <h3 style="margin-top:20px">Herd Status</h3>
            <div class="card">
                <p>Total Animals: <b>${animals.length}</b></p>
            </div>` : ''}
        `;
    },

    renderHistory(records) {
        records.sort((a, b) => new Date(b.date) - new Date(a.date));
        document.getElementById('content').innerHTML = `
            <div class="card">
                ${this.generateList(records)}
            </div>
        `;
    },

    renderFinance(records) {
        const finRecords = records.filter(r => r.type === 'income' || r.type === 'expense');
        finRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
        document.getElementById('content').innerHTML = `
            <div class="card">
                ${this.generateList(finRecords)}
            </div>
        `;
    },

    renderHealth(records) {
        const healthRecords = records.filter(r => r.type === 'health');
        healthRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
        document.getElementById('content').innerHTML = `
            <div class="card">
                ${this.generateList(healthRecords)}
            </div>
        `;
    },

    renderReports(records) {
        document.getElementById('content').innerHTML = `
            <div class="card" style="text-align:center">
                <i class="fa-solid fa-file-pdf fa-3x" style="color:var(--danger); margin-bottom:10px;"></i>
                <h3>Generate Farm Report</h3>
                <p style="color:#666; margin-bottom:20px;">Download professional PDF summary for investors or records.</p>
                <button class="btn primary" onclick="reportGenerator.downloadPDF()">Download PDF</button>
            </div>
        `;
    },

    generateList(list) {
        if (list.length === 0) return '<p style="text-align:center; padding:10px; color:#999">No records found.</p>';
        
        return list.map(item => {
            let icon = 'fa-circle';
            let color = '#ccc';
            let detail = '';

            if (item.type === 'production') { icon = 'fa-bucket'; color = 'var(--primary)'; detail = `${item.amount} units`; }
            if (item.type === 'income') { icon = 'fa-arrow-up'; color = 'green'; detail = `+${item.amount}`; }
            if (item.type === 'expense') { icon = 'fa-arrow-down'; color = 'red'; detail = `-${item.amount}`; }
            if (item.type === 'health') { icon = 'fa-heart-pulse'; color = 'orange'; detail = item.treatment; }

            return `
            <div class="list-item">
                <div style="display:flex; align-items:center; gap:10px;">
                    <div style="background:${color}20; padding:8px; border-radius:50%; color:${color}">
                        <i class="fa-solid ${icon}"></i>
                    </div>
                    <div>
                        <div style="font-weight:600">${item.category || item.type.toUpperCase()}</div>
                        <div style="font-size:0.8rem; color:#777">${item.date}</div>
                    </div>
                </div>
                <div style="font-weight:bold">${detail}</div>
            </div>`;
        }).join('');
    },

    openModal(id) {
        document.getElementById(id).classList.remove('hidden');
    },

    closeModal() {
        document.querySelectorAll('.modal-overlay').forEach(el => el.classList.add('hidden'));
    },

    showForm(type) {
        this.closeModal(); // close selector
        this.openModal('form-modal');
        const form = document.getElementById('generic-form');
        const title = document.getElementById('form-title');
        
        let html = `<input type="date" name="date" required value="${new Date().toISOString().split('T')[0]}">`;

        if (type === 'production') {
            title.innerText = 'Add Production';
            html += `
                <input type="hidden" name="type" value="production">
                <label>Amount (${app.mode === 'dairy' ? 'Litres' : 'Eggs'})</label>
                <input type="number" name="amount" step="0.1" required placeholder="0.0">
                <label>Animal ID / Group (Optional)</label>
                <input type="text" name="refId" placeholder="e.g. Cow-101">
            `;
        } else if (type === 'finance') {
            title.innerText = 'Add Transaction';
            html += `
                <select name="type" required>
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                </select>
                <label>Amount</label>
                <input type="number" name="amount" required placeholder="0.00">
                <label>Category</label>
                <select name="category">
                    <option value="Feed">Feed</option>
                    <option value="Sales">Sales</option>
                    <option value="Vet">Vet/Medicine</option>
                    <option value="Other">Other</option>
                </select>
                <label>Notes</label>
                <input type="text" name="notes">
            `;
        } else if (type === 'health') {
            title.innerText = 'Health Record';
            html += `
                <input type="hidden" name="type" value="health">
                <label>Animal ID</label>
                <input type="text" name="refId" required placeholder="e.g. Cow-101">
                <label>Treatment / Vaccination</label>
                <input type="text" name="treatment" required placeholder="e.g. Deworming">
                <label>Cost (Optional)</label>
                <input type="number" name="cost" placeholder="0.00">
            `;
        } else if (type === 'animal') {
            title.innerText = 'Add Animal';
            html += `
                <input type="hidden" name="recordType" value="animal">
                <label>Tag / Name</label>
                <input type="text" name="tag" required>
                <label>Breed</label>
                <input type="text" name="breed">
                <label>Birth Date</label>
                <input type="date" name="dob">
            `;
        }

        form.innerHTML = html;
    },

    toast(msg) {
        const t = document.getElementById('toast');
        t.innerText = msg;
        t.classList.remove('hidden');
        setTimeout(() => t.classList.add('hidden'), 3000);
    }
};

/* =========================================
   4. PDF Report Generator
   ========================================= */
const reportGenerator = {
    async downloadPDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        const records = await dbManager.getAll('records');
        const farmRecords = records.filter(r => r.mode === app.mode);
        
        doc.setFontSize(22);
        doc.setTextColor(46, 125, 50);
        doc.text("Farm Report", 14, 20);
        
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);
        doc.text(`Type: ${app.mode.toUpperCase()}`, 14, 36);

        // Prepare table data
        const tableData = farmRecords.map(r => [
            r.date, 
            r.type.toUpperCase(), 
            r.category || '-', 
            r.amount || '-'
        ]);

        doc.autoTable({
            startY: 45,
            head: [['Date', 'Type', 'Category', 'Value']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [46, 125, 50] }
        });

        doc.save(`farm_report_${new Date().toISOString().split('T')[0]}.pdf`);
    }
};

/* =========================================
   5. Import / Export Logic
   ========================================= */
const dataManager = {
    async exportData() {
        const records = await dbManager.getAll('records');
        const animals = await dbManager.getAll('animals');
        const data = { records, animals, exportDate: new Date() };
        const blob = new Blob([JSON.stringify(data)], {type: "application/json"});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `agriflow_backup.json`;
        a.click();
    },
    
    importData(input) {
        const file = input.files[0];
        if(!file) return;
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target.result);
                // Simple bulk add
                if(data.records) {
                    for(let r of data.records) await dbManager.add('records', r);
                }
                if(data.animals) {
                    for(let a of data.animals) await dbManager.add('animals', a);
                }
                alert('Data Restored Successfully!');
                location.reload();
            } catch(err) {
                alert('Invalid Backup File');
            }
        };
        reader.readAsText(file);
    }
};

// Start App
window.addEventListener('DOMContentLoaded', () => app.init());
