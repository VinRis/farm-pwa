/**
 * Farm Production Tracker - Core Logic
 * Version: 2.0.0
 */

// --- 1. CONFIGURATION & STATE ---
let db;
const DB_NAME = "FarmTrackerDB";
const DB_VERSION = 1;

let appState = {
    farmType: null, // dairy, poultry, crops
    currentView: 'dashboardView',
    isDarkMode: false
};

// --- 2. DATABASE INITIALIZATION ---
const initDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (err) => reject("DB Error: " + err.target.error);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            // Store for production and expense records
            if (!db.objectStoreNames.contains("records")) {
                db.createObjectStore("records", { keyPath: "id", autoIncrement: true });
            }
            // Store for settings (farmType, theme, farmName)
            if (!db.objectStoreNames.contains("settings")) {
                db.createObjectStore("settings", { keyPath: "key" });
            }
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            resolve(db);
        };
    });
};

// --- 3. UI CONTROLS & NAVIGATION ---
const showView = (viewId) => {
    // Hide all views
    document.querySelectorAll('.view-section').forEach(view => view.style.display = 'none');
    
    // Show target view
    const target = document.getElementById(viewId);
    if (target) {
        target.style.display = 'block';
        appState.currentView = viewId;
    }

    // Update Nav Styling
    document.querySelectorAll('.nav-item').forEach(nav => {
        nav.classList.toggle('active', nav.dataset.screen === viewId);
    });

    // Refresh data if entering dashboard or history
    if (viewId === 'dashboardView') renderDashboard();
    if (viewId === 'recordsView') renderRecords();
};

const toggleFarmFields = (type) => {
    const poultryFields = document.getElementById('poultryFields');
    const dairyFields = document.getElementById('dairyFields');
    const poultryToggle = document.getElementById('poultryToggleContainer');

    poultryFields.style.display = type === 'poultry' ? 'block' : 'none';
    dairyFields.style.display = type === 'dairy' ? 'block' : 'none';
    poultryToggle.style.display = type === 'poultry' ? 'block' : 'none';
};

// --- 4. DATA CORE FUNCTIONS ---
const saveRecord = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const record = {
        date: document.getElementById('date').value,
        type: appState.farmType,
        timestamp: new Date().getTime(),
        // Poultry specific
        subtype: document.getElementById('poultrySubtype').value,
        mortality: parseInt(document.getElementById('mortality').value) || 0,
        flockSize: parseInt(document.getElementById('flockSize').value) || 0,
        quantity: parseFloat(document.getElementById('quantityProduced').value) || 0,
        price: parseFloat(document.getElementById('pricePerUnit').value) || 0,
        // Dairy specific
        cowId: document.getElementById('cowId').value,
        milkQty: parseFloat(document.getElementById('milkQty').value) || 0,
        // Expenses logic (Simplified for single entry)
        expenses: [{
            category: document.querySelector('.expense-cat').value,
            amount: parseFloat(document.querySelector('.expense-amount').value) || 0
        }]
    };

    const tx = db.transaction("records", "readwrite");
    tx.objectStore("records").add(record);

    tx.oncomplete = () => {
        showToast("Record Saved! ✅");
        e.target.reset();
        showView('dashboardView');
    };
};

const deleteRecord = (id) => {
    const modal = document.getElementById('confirmModal');
    modal.style.display = 'flex';
    
    document.getElementById('modalConfirm').onclick = () => {
        const tx = db.transaction("records", "readwrite");
        tx.objectStore("records").delete(id);
        tx.oncomplete = () => {
            modal.style.display = 'none';
            renderRecords();
            showToast("Deleted 🗑️");
        };
    };

    document.getElementById('modalCancel').onclick = () => modal.style.display = 'none';
};

// --- 5. DASHBOARD & ANALYTICS ---
const renderDashboard = async () => {
    const tx = db.transaction("records", "readonly");
    const store = tx.objectStore("records");
    const request = store.getAll();

    request.onsuccess = () => {
        const records = request.result.filter(r => r.type === appState.farmType);
        
        // Filter by poultry subtype if applicable
        const subFilter = document.getElementById('poultrySubtypeToggle').value;
        const filtered = appState.farmType === 'poultry' ? records.filter(r => r.subtype === subFilter) : records;

        let totalExp = 0;
        let totalRev = 0;
        let totalProd = 0;

        filtered.forEach(r => {
            totalProd += (r.quantity || r.milkQty || 0);
            totalRev += (r.quantity || 0) * (r.price || 0);
            r.expenses.forEach(e => totalExp += e.amount);
        });

        // Update UI Text
        document.getElementById('totalExpensesDisplay').innerText = `KES ${totalExp.toLocaleString()}`;
        document.getElementById('totalProfitDisplay').innerText = `KES ${(totalRev - totalExp).toLocaleString()}`;
        document.getElementById('statProd').innerText = totalProd.toFixed(1);
        
        // Simple Monthly Forecast (Last 7 days average * 30)
        const dailyAvg = filtered.length > 0 ? totalProd / filtered.length : 0;
        document.getElementById('estProduction').innerText = (dailyAvg * 30).toFixed(1);
        document.getElementById('estProfit').innerText = `KES ${((totalRev - totalExp) / (filtered.length || 1) * 30).toFixed(0)}`;

        renderChart(filtered);
    };
};

const renderChart = (data) => {
    const chart = document.getElementById('productionChart');
    chart.innerHTML = '';
    
    // Get last 7 entries
    const last7 = data.slice(-7);
    const maxVal = Math.max(...last7.map(r => r.quantity || r.milkQty || 1));

    last7.forEach(r => {
        const val = r.quantity || r.milkQty || 0;
        const height = (val / maxVal) * 100;
        const bar = document.createElement('div');
        bar.className = 'chart-bar-wrapper';
        bar.innerHTML = `
            <div class="bar" style="height: ${height}%"></div>
            <span class="bar-label">${r.date.split('-').slice(1).join('/')}</span>
        `;
        chart.appendChild(bar);
    });
};

const renderRecords = () => {
    const list = document.getElementById('recordsList');
    const tx = db.transaction("records", "readonly");
    tx.objectStore("records").getAll().onsuccess = (e) => {
        const records = e.target.result.reverse();
        list.innerHTML = records.map(r => `
            <div class="record-item">
                <div>
                    <strong>${r.date}</strong><br>
                    <small>${r.quantity || r.milkQty} Units | KES ${r.expenses[0].amount} Exp</small>
                </div>
                <button onclick="deleteRecord(${r.id})" class="delete-btn">🗑️</button>
            </div>
        `).join('');
    };
};

// --- 6. UTILS & INITIALIZATION ---
const showToast = (msg) => {
    const t = document.getElementById('toast');
    t.innerText = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
};

const initApp = async () => {
    await initDB();
    
    // Check for saved farm type
    const settingsTx = db.transaction("settings", "readonly");
    settingsTx.objectStore("settings").get("farmType").onsuccess = (e) => {
        if (e.target.result) {
            appState.farmType = e.target.result.value;
            toggleFarmFields(appState.farmType);
            document.getElementById('farmTypeScreen').style.display = 'none';
            document.getElementById('appScreen').style.display = 'block';
            document.getElementById('bottomNav').style.display = 'flex';
            document.getElementById('mainHeader').innerText = appState.farmType.charAt(0).toUpperCase() + appState.farmType.slice(1) + " Tracker";
            renderDashboard();
        }
    };

    // Remove Loader
    document.getElementById('app-loader').style.display = 'none';
};

// --- 7. EVENT LISTENERS ---
document.querySelectorAll('.type-card').forEach(card => {
    card.onclick = () => {
        const type = card.dataset.type;
        appState.farmType = type;
        db.transaction("settings", "readwrite").objectStore("settings").put({ key: "farmType", value: type });
        location.reload(); // Refresh to set state
    };
});

document.querySelectorAll('.nav-item').forEach(btn => {
    btn.onclick = () => showView(btn.dataset.screen);
});

document.getElementById('farmForm').onsubmit = saveRecord;

document.getElementById('switchTypeBtn').onclick = () => {
    if(confirm("Switching types will reset the dashboard view. Continue?")) {
        db.transaction("settings", "readwrite").objectStore("settings").delete("farmType").onsuccess = () => location.reload();
    }
};

document.getElementById('darkModeBtn').onclick = () => {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    db.transaction("settings", "readwrite").objectStore("settings").put({ key: "darkMode", value: isDark });
};

document.getElementById('resetBtn').onclick = () => {
    if(confirm("⚠️ WIPE ALL DATA? This cannot be undone.")) {
        indexedDB.deleteDatabase(DB_NAME);
        location.reload();
    }
};

document.getElementById('poultrySubtypeToggle').onchange = renderDashboard;

// Start the App
window.onload = initApp;
