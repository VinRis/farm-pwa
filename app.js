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
  const request = indexedDB.open("FarmDB", 1);
  request.onupgradeneeded = (e) => {
    db = e.target.result;
    if (!db.objectStoreNames.contains("records")) db.createObjectStore("records", { keyPath: "id", autoIncrement: true });
    if (!db.objectStoreNames.contains("settings")) db.createObjectStore("settings", { keyPath: "key" });
  };

  request.onsuccess = (e) => {
    db = e.target.result;
    if (document.getElementById("date")) document.getElementById("date").valueAsDate = new Date();
    getFarmType();
  };

  // --- NAVIGATION LOGIC ---
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const target = btn.dataset.screen;
      document.querySelectorAll('.view-section').forEach(section => {
        section.style.display = 'none';
      });

      if (target === 'settings-view') {
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
    if (type === 'poultry') {
        poultryToggle.style.display = "flex";
    } else {
        poultryToggle.style.display = "none";
    }
    // ----------------------

    farmTypeScreen.style.display = "none";
    appScreen.style.display = "block";
    if (bottomNav) bottomNav.style.display = "flex";

    farmTypeScreen.style.display = "none";
    appScreen.style.display = "block";
    if (bottomNav) bottomNav.style.display = "flex"; 
    
    const dashTab = document.querySelector('[data-screen="dashboard"]');
    if (dashTab) dashTab.click();
    
    document.querySelectorAll(".extra-fields").forEach(f => f.style.display = "none");
    const fieldId = type + "Fields";
    if (document.getElementById(fieldId)) document.getElementById(fieldId).style.display = "block";
  }

  function getFarmType() {
    db.transaction("settings").objectStore("settings").get("farmType").onsuccess = (e) => {
      if (e.target.result) showApp(e.target.result.value);
    };
  }

  document.querySelectorAll(".type-btn").forEach(btn => {
    btn.onclick = () => {
      const type = btn.dataset.type;
      db.transaction("settings", "readwrite").objectStore("settings").put({key: "farmType", value: type});
      showApp(type);
    };
  });

  document.getElementById("switchTypeBtn").onclick = () => {
    appScreen.style.display = "none";
    if (bottomNav) bottomNav.style.display = "none"; 
    farmTypeScreen.style.display = "block";
    if (mainHeader) mainHeader.innerText = "Farm Production Tracker";
  };

  document.getElementById("addExpenseRow").onclick = () => {
    const newRow = document.querySelector(".expense-row").cloneNode(true);
    newRow.querySelector(".exp-amt").value = "";
    const btn = newRow.querySelector("button");
    btn.innerText = "✕";
    btn.classList.replace("add-row-btn", "btn-danger");
    btn.onclick = () => newRow.remove();
    expenseContainer.appendChild(newRow);
  };

  // --- DATA LOADING & VISUALS ---
  function loadRecords() {
    if (!db) return;
    const tx = db.transaction(["records", "settings"], "readonly");
    
    tx.objectStore("settings").get("currency").onsuccess = (curEvent) => {
      const symbol = curEvent.target.result ? curEvent.target.result.value : "KES";
      
      tx.objectStore("settings").get("farmType").onsuccess = (typeEvent) => {
        const type = typeEvent.target.result?.value;
        if (!type) return;

        tx.objectStore("records").getAll().onsuccess = (ev) => {
          const all = ev.target.result;
          const filtered = all.filter(r => r.type === type);
          
          let [rev, exp, qty] = [0, 0, 0];
          let cats = {};
          recordsList.innerHTML = "";
          const sorted = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));

          sorted.forEach(r => {
            const income = (r.quantity * r.price);
            rev += income;
            exp += r.expenses;
            qty += r.quantity;
            r.expenseItems?.forEach(i => cats[i.category] = (cats[i.category] || 0) + i.amount);
          
            const li = document.createElement("li");
            li.className = "record-item";
            li.innerHTML = `
              <div class="record-info"><strong>${r.date}</strong><br><small>${r.quantity} units</small></div>
              <div class="record-actions">
                <div class="record-finance">${symbol} ${income.toLocaleString()}<br><small>Exp: ${r.expenses}</small></div>
                <div class="action-btns">
                  <button onclick="editRecord(${r.id})" class="edit-btn">✏️</button>
                  <button onclick="deleteRecord(${r.id})" class="delete-btn">🗑️</button>
                </div>
              </div>`;
            recordsList.appendChild(li);
          });

          if (document.getElementById("totalProfit")) {
            document.getElementById("totalProfit").innerText = `${symbol} ${(rev - exp).toLocaleString()}`;
            document.getElementById("totalExpensesDisplay").innerText = `${symbol} ${exp.toLocaleString()}`;
            document.getElementById("totalQuantity").innerText = qty.toFixed(1);
            // Inside loadRecords, after calculating rev, exp, qty...
            updateInsights(filtered, type);
            renderPie(cats, exp);
            updateChart(filtered.slice(-7));
            updateProjections(filtered, symbol);
          }
        };
      };
    };
  }

  function updateChart(data) {
    const container = document.getElementById("productionChart");
    if (!container) return;
    container.innerHTML = "";
    const maxQty = Math.max(...data.map(r => r.quantity), 5);

    data.forEach(r => {
      const height = (r.quantity / maxQty) * 100;
      const dateParts = r.date.split('-'); 
      const label = `${dateParts[1]}/${dateParts[2]}`;
      const barWrapper = document.createElement("div");
      barWrapper.className = "chart-bar-wrapper";
      barWrapper.innerHTML = `<div class="bar" style="height: ${height}%"></div><span class="bar-label">${label}</span>`;
      container.appendChild(barWrapper);
    });
  }

  function renderPie(categories, total) {
    const list = document.getElementById("breakdownList");
    const pie = document.getElementById("pieChartCircle");
    if (!list || !pie || total <= 0) return;
    list.innerHTML = "";
    let currentPercent = 0;
    let gradient = [];
    Object.entries(categories).forEach(([cat, val]) => {
      const percent = (val / total) * 100;
      const color = catColors[cat] || "#757575";
      list.innerHTML += `<div><small style="color:${color}">●</small> ${cat}</div>`;
      gradient.push(`${color} ${currentPercent}% ${currentPercent + percent}%`);
      currentPercent += percent;
    });
    pie.style.background = `conic-gradient(${gradient.join(", ")})`;
  }

  form.onsubmit = (e) => {
    e.preventDefault();
    db.transaction("settings").objectStore("settings").get("farmType").onsuccess = (ev) => {
      const type = ev.target.result.value;
      const expItems = Array.from(document.querySelectorAll(".expense-row")).map(row => ({
        category: row.querySelector(".exp-cat").value,
        amount: parseFloat(row.querySelector(".exp-amt").value) || 0
      })).filter(i => i.amount > 0);

      const record = {
        date: document.getElementById("date").value,
        type: type,
        quantity: parseFloat(document.getElementById("quantity").value),
        price: parseFloat(document.getElementById("price").value),
        expenses: expItems.reduce((sum, i) => sum + i.amount, 0),
        expenseItems: expItems,
        subtype: document.getElementById("poultrySubtype") ? document.getElementById("poultrySubtype").value : ""
      };

      db.transaction("records", "readwrite").objectStore("records").add(record).onsuccess = () => {
        form.reset();
        document.getElementById("date").valueAsDate = new Date();
        document.querySelector('[data-screen="dashboard"]').click();
        showToast("Record Saved Successfully! ✅");
      };
    };
  };

  function updateProjections(filteredRecords, symbol) {
    const now = new Date();
    const currentMonth = now.toISOString().substring(0, 7);
    const thisMonthData = filteredRecords.filter(r => r.date.startsWith(currentMonth));
    if (thisMonthData.length === 0) return;
    
    let totalMonthProfit = 0;
    let totalMonthQty = 0;
    thisMonthData.forEach(r => {
      totalMonthProfit += (r.quantity * r.price) - r.expenses;
      totalMonthQty += r.quantity;
    });
    const prog = now.getDate() / 30;
    document.getElementById("projectedProfit").innerText = `${symbol} ${Math.round(totalMonthProfit / prog).toLocaleString()}`;
    document.getElementById("projectedQty").innerText = (totalMonthQty / prog).toFixed(1);
  }

  // --- MODAL & ACTIONS ---
  const confirmModal = document.getElementById("confirmModal");
  const modalConfirmBtn = document.getElementById("modalConfirm");
  const modalCancelBtn = document.getElementById("modalCancel");
  let deleteId = null;

  window.deleteRecord = (id) => {
    deleteId = id;
    document.getElementById("modalMessage").innerText = "Do you really want to remove this record?";
    confirmModal.style.display = "flex";
  };

  modalConfirmBtn.onclick = () => {
    if (deleteId) {
      db.transaction("records", "readwrite").objectStore("records").delete(deleteId).onsuccess = () => {
        loadRecords();
        confirmModal.style.display = "none";
        showToast("Record Deleted 🗑️");
        deleteId = null;
      };
    }
  };

  modalCancelBtn.onclick = () => confirmModal.style.display = "none";

  window.editRecord = (id) => {
    db.transaction("records", "readonly").objectStore("records").get(id).onsuccess = (e) => {
      const r = e.target.result;
      document.querySelector('[data-screen="main-form"]').click();
      document.getElementById("date").value = r.date;
      document.getElementById("quantity").value = r.quantity;
      document.getElementById("price").value = r.price;
      if (r.type === 'poultry' && document.getElementById("poultrySubtype")) {
          document.getElementById("poultrySubtype").value = r.subtype;
      }
      db.transaction("records", "readwrite").objectStore("records").delete(id).onsuccess = () => {
        showToast("Editing: Old record will be replaced on save.");
      };
    };
  };

  function loadSettings() {
    const tx = db.transaction("settings", "readonly");
    tx.objectStore("settings").get("farmName").onsuccess = (e) => {
      if (e.target.result) document.getElementById("settingFarmName").value = e.target.result.value;
    };
    tx.objectStore("settings").get("currency").onsuccess = (e) => {
      if (e.target.result) document.getElementById("settingCurrency").value = e.target.result.value;
    };
  }

  document.getElementById("saveSettingsBtn").onclick = () => {
    const name = document.getElementById("settingFarmName").value;
    const curr = document.getElementById("settingCurrency").value;
    const tx = db.transaction("settings", "readwrite");
    tx.objectStore("settings").put({key: "farmName", value: name});
    tx.objectStore("settings").put({key: "currency", value: curr});
    tx.oncomplete = () => {
      showToast("Settings Saved! 💾");
      setTimeout(() => location.reload(), 1000);
    };
  };

  function showToast(msg) {
    const toast = document.getElementById("toast");
    toast.innerText = msg;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 3000);
  }

  darkModeBtn.onclick = () => document.body.classList.toggle("dark-mode");
});

    function updateInsights(data, type) {
        const insightText = document.getElementById("insightText");
        if (!insightText || data.length < 2) {
            insightText.innerText = "Keep recording data to see trends!";
            return;
        }
    
        // Sort by date to compare last two entries
        const sorted = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));
        const latest = sorted[sorted.length - 1];
        const previous = sorted[sorted.length - 2];
    
        let message = "";
    
        if (latest.quantity > previous.quantity) {
            message = `Production is up by ${(latest.quantity - previous.quantity).toFixed(1)} units since last record! 📈`;
        } else if (latest.quantity < previous.quantity) {
            message = `Production dropped slightly. Check ${type === 'dairy' ? 'fodder quality' : 'feed intake'}. 🧐`;
        } else {
            message = "Production is stable. Consistent monitoring pays off! ✅";
        }
    
        // Add financial insight if expenses are high
        if (latest.expenses > (latest.quantity * latest.price) * 0.5) {
            message += " Warning: Expenses are taking up over 50% of revenue today.";
        }
    
        insightText.innerText = message;
    }
