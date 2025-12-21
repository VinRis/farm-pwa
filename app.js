if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js")
    .then(() => console.log("Service Worker Registered"))
    .catch(err => console.log("SW Registration Failed: ", err));
}

document.addEventListener("DOMContentLoaded", () => {
  let db;
  // UI Elements
  const farmTypeScreen = document.getElementById("farmTypeScreen");
  const appScreen = document.getElementById("appScreen");
  const bottomNav = document.getElementById("bottomNav");
  const form = document.getElementById("farmForm");
  const recordsList = document.getElementById("records");
  const darkModeBtn = document.getElementById("darkModeBtn");
  const expenseContainer = document.getElementById("expenseContainer");
  const mainHeader = document.getElementById("mainHeader");

  const catColors = {
    "Feed": "#2e7d32", "Medication": "#d32f2f", "Chicks": "#fbc02d",
    "Labor": "#0288d1", "Utilities": "#7b1fa2", "Other": "#757575"
  };

  // --- DATABASE SETUP ---
  const request = indexedDB.open("FarmDB", 2);
  request.onupgradeneeded = (e) => {
    db = e.target.result;
    if (!db.objectStoreNames.contains("records")) db.createObjectStore("records", { keyPath: "id", autoIncrement: true });
    if (!db.objectStoreNames.contains("settings")) db.createObjectStore("settings", { keyPath: "key" });
    if (!db.objectStoreNames.contains("finance")) db.createObjectStore("finance", { keyPath: "id", autoIncrement: true });
  };

  request.onsuccess = (e) => {
    db = e.target.result;
    if (document.getElementById("date")) document.getElementById("date").valueAsDate = new Date();
    if (document.getElementById("finDate")) document.getElementById("finDate").valueAsDate = new Date();
    getFarmType();
  };

  // --- FIXED NAVIGATION LOGIC ---
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.onclick = () => {
      const target = btn.dataset.screen;
      document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      document.querySelectorAll('.view-section').forEach(section => section.style.display = 'none');

      if (target === 'finance-view') {
        document.getElementById('financeView').style.display = 'block';
      } else if (target === 'settings-view') {
        document.getElementById('settingsView').style.display = 'block';
        loadSettings();
      } else if (target === 'dashboard') {
        document.getElementById('dashboardView').style.display = 'block';
        loadRecords(); 
      } else if (target === 'records-section') {
        document.getElementById('recordsView').style.display = 'block';
        loadRecords(); 
      } else if (target === 'main-form') {
        document.getElementById('formView').style.display = 'block';
      }
    };
  });

  // --- FEATURE: SHOW/HIDE APP LAYOUT ---
  function showApp(type) {
    const titles = { 'dairy': '🐄 Dairy Manager', 'poultry': '🐔 Poultry Tracker', 'crops': '🌽 Crop Manager' };
    if (mainHeader && titles[type]) mainHeader.innerText = titles[type];
    
    const poultryToggle = document.getElementById("poultryToggleContainer");
    if (poultryToggle) poultryToggle.style.display = (type === 'poultry') ? "block" : "none";

    farmTypeScreen.style.display = "none";
    appScreen.style.display = "block";
    if (bottomNav) bottomNav.style.display = "flex"; 
    
    const dashTab = document.querySelector('[data-screen="dashboard"]');
    if (dashTab) dashTab.click();
    
    document.querySelectorAll(".extra-fields").forEach(f => f.style.display = "none");
    const fieldId = type + "Fields";
    if (document.getElementById(fieldId)) document.getElementById(fieldId).style.display = "block";
  }

  // --- DATA LOADING & VISUALS (With Finance Integration) ---
  function loadRecords() {
    if (!db) return;
    const tx = db.transaction(["records", "settings", "finance"], "readonly");
    
    tx.objectStore("settings").get("currency").onsuccess = (curEvent) => {
      const symbol = curEvent.target.result ? curEvent.target.result.value : "KES";
      
      tx.objectStore("settings").get("farmType").onsuccess = (typeEvent) => {
        const type = typeEvent.target.result?.value;
        if (!type) return;

        // Load Financial Data for the Dashboard
        tx.objectStore("finance").getAll().onsuccess = (finEv) => {
          const finances = finEv.target.result;
          let totalSales = finances.filter(f => f.type === 'sale').reduce((s, r) => s + r.amount, 0);
          let totalExpenses = finances.filter(f => f.type === 'expense').reduce((s, r) => s + r.amount, 0);

          // Load Production Records
          tx.objectStore("records").getAll().onsuccess = (ev) => {
            const all = ev.target.result;
            let filtered = all.filter(r => r.type === type);

            if (type === 'poultry') {
              const subtype = document.getElementById("poultrySubtypeToggle").value;
              filtered = filtered.filter(r => r.subtype === subtype);
            }
            
            let totalQtyProduced = filtered.reduce((s, r) => s + (r.eggsCollected || r.avgWeight || 0), 0);
            
            // Update Dashboard UI
            if (document.getElementById("totalProfit")) {
              document.getElementById("totalProfit").innerText = `${symbol} ${(totalSales - totalExpenses).toLocaleString()}`;
              document.getElementById("totalExpensesDisplay").innerText = `${symbol} ${totalExpenses.toLocaleString()}`;
              document.getElementById("totalQuantity").innerText = totalQtyProduced.toFixed(1);
              
              updateChart(filtered.slice(-7));
              updateInsights(filtered, type);
            }

            // Render History List
            recordsList.innerHTML = "";
            filtered.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(r => {
              const li = document.createElement("li");
              li.className = "record-item";
              li.innerHTML = `
                <div class="record-info"><strong>${r.date}</strong><br><small>${r.subtype || r.type}</small></div>
                <div class="action-btns">
                   <button onclick="deleteRecord(${r.id})" class="delete-btn">🗑️</button>
                </div>`;
              recordsList.appendChild(li);
            });
          };
        };
      };
    };
  }

  // --- FORM SUBMISSION (Updated for Poultry Subtypes) ---
  form.onsubmit = (e) => {
    e.preventDefault();
    db.transaction("settings").objectStore("settings").get("farmType").onsuccess = (ev) => {
      const type = ev.target.result.value;
      
      const feedItems = Array.from(document.querySelectorAll(".feed-row")).map(row => ({
        type: row.querySelector(".feed-type").value,
        qty: parseFloat(row.querySelector(".feed-qty").value) || 0
      })).filter(f => f.qty > 0);

      const record = {
        date: document.getElementById("date").value,
        type: type,
        subtype: document.getElementById("poultrySubtype")?.value || null,
        eggsCollected: parseFloat(document.getElementById("eggsCollected")?.value) || 0,
        eggsBroken: parseFloat(document.getElementById("eggsBroken")?.value) || 0,
        avgWeight: parseFloat(document.getElementById("avgWeight")?.value) || 0,
        flockSize: parseFloat(document.getElementById("flockSizePoultry")?.value) || 0,
        mortality: parseFloat(document.getElementById("mortalityPoultry")?.value) || 0,
        feedData: feedItems
      };

      const tx = db.transaction("records", "readwrite");
      tx.objectStore("records").add(record).onsuccess = () => {
        form.reset();
        showToast("Production Logged! ✅");
        document.querySelector('[data-screen="dashboard"]').click();
      };
    };
  };

  // --- FINANCE FORM SUBMISSION ---
  document.getElementById("financeForm").onsubmit = (e) => {
    e.preventDefault();
    const trans = {
        date: document.getElementById("finDate").value,
        type: document.getElementById("finType").value,
        desc: document.getElementById("finDesc").value,
        amount: parseFloat(document.getElementById("finAmount").value),
        category: document.getElementById("finCat").value
    };

    db.transaction("finance", "readwrite").objectStore("finance").add(trans).onsuccess = () => {
        showToast("Finance Recorded! 💰");
        document.getElementById("financeForm").reset();
        document.querySelector('[data-screen="dashboard"]').click();
    };
  };

  // --- HELPERS ---
  function getFarmType() {
    db.transaction("settings").objectStore("settings").get("farmType").onsuccess = (e) => {
      if (e.target.result) showApp(e.target.result.value);
    };
  }

  function showToast(msg) {
    const toast = document.getElementById("toast");
    toast.innerText = msg;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 3000);
  }

  // Event Listeners for Dynamic UI
  document.getElementById("poultrySubtype").onchange = (e) => {
    const isLayers = e.target.value === 'layers';
    document.getElementById("layerSpecificFields").style.display = isLayers ? "block" : "none";
    document.getElementById("broilerSpecificFields").style.display = isLayers ? "none" : "block";
  };

  document.getElementById("poultrySubtypeToggle").onchange = () => loadRecords();

  darkModeBtn.onclick = () => document.body.classList.toggle("dark-mode");
});
