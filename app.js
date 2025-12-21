if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js")
    .then(() => console.log("Service Worker Registered"))
    .catch(err => console.log("SW Registration Failed: ", err));
}

document.addEventListener("DOMContentLoaded", () => {
  let db;
  const farmTypeScreen = document.getElementById("farmTypeScreen");
  const appScreen = document.getElementById("appScreen");
  const bottomNav = document.getElementById("bottomNav");
  const form = document.getElementById("farmForm");
  const recordsList = document.getElementById("records");
  const darkModeBtn = document.getElementById("darkModeBtn");
  const mainHeader = document.getElementById("mainHeader");

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
    // Set default dates
    if (document.getElementById("date")) document.getElementById("date").valueAsDate = new Date();
    if (document.getElementById("finDate")) document.getElementById("finDate").valueAsDate = new Date();
    
    // Check for dark mode preference
    db.transaction("settings").objectStore("settings").get("darkMode").onsuccess = (ev) => {
      if (ev.target.result?.value) document.body.classList.add("dark-mode");
    };

    getFarmType();
  };

  // --- FARM TYPE SELECTION ---
  document.querySelectorAll(".type-btn").forEach(btn => {
    btn.onclick = () => {
      const type = btn.dataset.type;
      db.transaction("settings", "readwrite").objectStore("settings").put({ key: "farmType", value: type });
      showApp(type);
    };
  });

  // --- NAVIGATION LOGIC ---
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

  // --- SHOW/HIDE APP LAYOUT ---
  function showApp(type) {
    const titles = { 'dairy': '🐄 Dairy Manager', 'poultry': '🐔 Poultry Tracker', 'crops': '🌽 Crop Manager' };
    if (mainHeader) mainHeader.innerText = titles[type] || "Farm Tracker";
    
    const poultryToggle = document.getElementById("poultryToggleContainer");
    if (poultryToggle) poultryToggle.style.display = (type === 'poultry') ? "block" : "none";

    farmTypeScreen.style.display = "none";
    appScreen.style.display = "block";
    if (bottomNav) bottomNav.style.display = "flex"; 
    
    // Reset to dashboard
    const dashTab = document.querySelector('[data-screen="dashboard"]');
    if (dashTab) dashTab.click();
    
    // Toggle form fields
    document.querySelectorAll(".extra-fields").forEach(f => f.style.display = "none");
    const fieldId = type + "Fields";
    if (document.getElementById(fieldId)) document.getElementById(fieldId).style.display = "block";
  }

  // --- DATA LOADING ---
  function loadRecords() {
    if (!db) return;
    const tx = db.transaction(["records", "settings", "finance"], "readonly");
    
    tx.objectStore("settings").get("currency").onsuccess = (curEvent) => {
      const symbol = curEvent.target.result ? curEvent.target.result.value : "KES";
      
      tx.objectStore("settings").get("farmType").onsuccess = (typeEvent) => {
        const type = typeEvent.target.result?.value;
        if (!type) return;

        tx.objectStore("finance").getAll().onsuccess = (finEv) => {
          const finances = finEv.target.result;
          let totalSales = finances.filter(f => f.type === 'sale').reduce((s, r) => s + r.amount, 0);
          let totalExpenses = finances.filter(f => f.type === 'expense').reduce((s, r) => s + r.amount, 0);

          tx.objectStore("records").getAll().onsuccess = (ev) => {
            const all = ev.target.result;
            let filtered = all.filter(r => r.type === type);
            
            if (type === 'poultry') {
              const sub = document.getElementById("poultrySubtypeToggle").value;
              filtered = filtered.filter(r => r.subtype === sub);
            }
            
            let totalQty = filtered.reduce((s, r) => s + (r.eggsCollected || r.avgWeight || 0), 0);
            
            document.getElementById("totalProfit").innerText = `${symbol} ${(totalSales - totalExpenses).toLocaleString()}`;
            document.getElementById("totalExpensesDisplay").innerText = `${symbol} ${totalExpenses.toLocaleString()}`;
            document.getElementById("totalQuantity").innerText = totalQty.toFixed(1);
            
            updateChart(filtered.slice(-7));
            updateInsights(filtered);

            recordsList.innerHTML = "";
            filtered.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(r => {
              const li = document.createElement("li");
              li.className = "record-item";
              li.innerHTML = `<div class="record-info"><strong>${r.date}</strong><br><small>${r.subtype || r.type}</small></div>
                              <button onclick="deleteRecord(${r.id})" class="delete-btn">🗑️</button>`;
              recordsList.appendChild(li);
            });
          };
        };
      };
    };
  }

  // --- SUBMISSIONS ---
  form.onsubmit = (e) => {
    e.preventDefault();
    db.transaction("settings").objectStore("settings").get("farmType").onsuccess = (ev) => {
      const type = ev.target.result.value;
      const record = {
        date: document.getElementById("date").value,
        type: type,
        subtype: document.getElementById("poultrySubtype")?.value || null,
        eggsCollected: parseFloat(document.getElementById("eggsCollected")?.value) || 0,
        avgWeight: parseFloat(document.getElementById("avgWeight")?.value) || 0,
        mortality: parseFloat(document.getElementById("mortalityPoultry")?.value) || 0,
      };

      db.transaction("records", "readwrite").objectStore("records").add(record).onsuccess = () => {
        form.reset();
        showToast("Production Logged! ✅");
        document.querySelector('[data-screen="dashboard"]').click();
      };
    };
  };

  document.getElementById("financeForm").onsubmit = (e) => {
    e.preventDefault();
    const trans = {
        date: document.getElementById("finDate").value,
        type: document.getElementById("finType").value,
        amount: parseFloat(document.getElementById("finAmount").value),
        desc: document.getElementById("finDesc").value
    };
    db.transaction("finance", "readwrite").objectStore("finance").add(trans).onsuccess = () => {
        showToast("Finance Recorded! 💰");
        document.getElementById("financeForm").reset();
        document.querySelector('[data-screen="dashboard"]').click();
    };
  };

  // --- HEADER CONTROL LISTENERS ---
  document.getElementById("switchTypeBtn").onclick = () => {
    appScreen.style.display = "none";
    if (bottomNav) bottomNav.style.display = "none"; 
    farmTypeScreen.style.display = "block";
    if (mainHeader) mainHeader.innerText = "Farm Production Tracker";
    db.transaction("settings", "readwrite").objectStore("settings").delete("farmType");
  };

  document.getElementById("resetBtn").onclick = () => {
    if (confirm("⚠️ Delete ALL records? This cannot be undone.")) {
      indexedDB.deleteDatabase("FarmDB");
      location.reload();
    }
  };

  darkModeBtn.onclick = () => {
    document.body.classList.toggle("dark-mode");
    const isDark = document.body.classList.contains("dark-mode");
    db.transaction("settings", "readwrite").objectStore("settings").put({ key: "darkMode", value: isDark });
  };

  // --- HELPERS ---
  function getFarmType() {
    db.transaction("settings").objectStore("settings").get("farmType").onsuccess = (e) => {
      if (e.target.result) {
        showApp(e.target.result.value);
      } else {
        farmTypeScreen.style.display = "block";
      }
    };
  }

  function showToast(msg) {
    const toast = document.getElementById("toast");
    toast.innerText = msg;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 3000);
  }

  function updateChart(data) {
    const container = document.getElementById("productionChart");
    if (!container) return;
    container.innerHTML = data.length ? "" : "<p style='text-align:center; padding:20px;'>No data yet</p>";
    const maxQty = Math.max(...data.map(r => r.eggsCollected || r.avgWeight || 0), 5);
    data.forEach(r => {
      const val = (r.eggsCollected || r.avgWeight || 0);
      const height = (val / maxQty) * 100;
      const bar = document.createElement("div");
      bar.className = "chart-bar-wrapper";
      bar.innerHTML = `<div class="bar" style="height: ${height}%"></div><span class="bar-label">${r.date.slice(-5)}</span>`;
      container.appendChild(bar);
    });
  }

  function updateInsights(data) {
    const txt = document.getElementById("insightText");
    if (!txt) return;
    if (data.length < 2) { txt.innerText = "Log more data for insights!"; return; }
    const last = (data[data.length-1].eggsCollected || data[data.length-1].avgWeight);
    const prev = (data[data.length-2].eggsCollected || data[data.length-2].avgWeight);
    txt.innerText = last >= prev ? "Production is steady! 🚀" : "Production dip detected. ⚠️";
  }

  document.getElementById("poultrySubtype").onchange = (e) => {
    const isLayers = e.target.value === 'layers';
    document.getElementById("layerSpecificFields").style.display = isLayers ? "block" : "none";
    document.getElementById("broilerSpecificFields").style.display = isLayers ? "none" : "block";
  };
  
  document.getElementById("poultrySubtypeToggle").onchange = () => loadRecords();
  // Ensure buttons on the Selection Screen work
  document.querySelectorAll(".type-btn").forEach(btn => {
    btn.onclick = () => {
      const type = btn.dataset.type;
      // Save to DB and show the app
      db.transaction("settings", "readwrite").objectStore("settings").put({ key: "farmType", value: type });
      showApp(type);
    };
  });
  
  // Fix the Switch Type button in the header
  document.getElementById("switchTypeBtn").onclick = () => {
    db.transaction("settings", "readwrite").objectStore("settings").delete("farmType").onsuccess = () => {
        appScreen.style.display = "none";
        bottomNav.style.display = "none";
        farmTypeScreen.style.display = "block";
        mainHeader.innerText = "Farm Production Tracker";
    };
  };
  
  // Fix the Reset App button
  document.getElementById("resetBtn").onclick = () => {
    if (confirm("⚠️ This will wipe ALL records. Are you sure?")) {
      indexedDB.deleteDatabase("FarmDB");
      location.reload();
    }
  };
});

