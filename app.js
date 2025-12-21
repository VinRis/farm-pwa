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
  const mainHeader = document.getElementById("mainHeader"); // Reference to header h1

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

      if (target === 'dashboard') {
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
    // Define titles for each farm type
    const titles = {
      'dairy': '🐄 Dairy Manager',
      'poultry': '🐔 Poultry Tracker',
      'crops': '🌽 Crop Manager'
    };

    // Update Header Text
    if (mainHeader && titles[type]) {
      mainHeader.innerText = titles[type];
    }

    farmTypeScreen.style.display = "none";
    appScreen.style.display = "block";
    if (bottomNav) bottomNav.style.display = "flex"; 
    
    // Set default view to dashboard
    const dashTab = document.querySelector('[data-screen="dashboard"]');
    if (dashTab) dashTab.click();
    
    // Configure specific form fields
    document.querySelectorAll(".extra-fields").forEach(f => f.style.display = "none");
    const fieldId = type + "Fields";
    if (document.getElementById(fieldId)) {
        document.getElementById(fieldId).style.display = "block";
    }
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

  // --- DYNAMIC EXPENSE ROWS ---
  document.getElementById("addExpenseRow").onclick = () => {
    const newRow = document.querySelector(".expense-row").cloneNode(true);
    newRow.querySelector(".exp-amt").value = "";
    const btn = newRow.querySelector("button");
    btn.innerText = "✕";
    btn.classList.replace("add-row-btn", "btn-danger");
    btn.onclick = () => newRow.remove();
    expenseContainer.appendChild(newRow);
  };

  // --- DATA LOADING, VISUALS & PROJECTIONS ---
  function loadRecords() {
    if (!db) return;
    const tx = db.transaction(["records", "settings"], "readonly");
    tx.objectStore("settings").get("farmType").onsuccess = (e) => {
      const type = e.target.result?.value;
      if (!type) return;

      tx.objectStore("records").getAll().onsuccess = (ev) => {
        const all = ev.target.result;
        const subToggle = document.getElementById("poultrySubtypeToggle");
        const sub = subToggle ? subToggle.value : "layers";
        const filtered = all.filter(r => r.type === type && (!r.subtype || r.subtype === sub));
        
        let [rev, exp, qty] = [0, 0, 0];
        let cats = {};
        recordsList.innerHTML = "";
        const sorted = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));

        sorted.forEach(r => {
          rev += (r.quantity * r.price);
          exp += r.expenses;
          qty += r.quantity;
          r.expenseItems?.forEach(i => cats[i.category] = (cats[i.category] || 0) + i.amount);

          recordsList.innerHTML += `<li>
            <span><strong>${r.date}</strong><br>${r.quantity} units</span>
            <span style="text-align:right">KES ${(r.quantity * r.price).toLocaleString()}<br>
            <small>Exp: ${r.expenses}</small></span>
          </li>`;
        });

        if (document.getElementById("totalProfit")) {
            document.getElementById("totalProfit").innerText = `KES ${(rev - exp).toLocaleString()}`;
            document.getElementById("totalExpensesDisplay").innerText = `KES ${exp.toLocaleString()}`;
            document.getElementById("totalQuantity").innerText = qty.toFixed(1);
            renderPie(cats, exp);
            updateChart(filtered.slice(-7));
            updateProjections(filtered);
        }
      };
    };
  }

  function updateChart(data) {
    const container = document.getElementById("productionChart");
    if (!container) return;
    container.innerHTML = "";
    const recent = data.slice(-7);
    const maxQty = Math.max(...recent.map(r => r.quantity), 5);

    recent.forEach(r => {
      const height = (r.quantity / maxQty) * 100;
      const barWrapper = document.createElement("div");
      barWrapper.className = "chart-bar-wrapper";
      barWrapper.innerHTML = `<div class="bar" style="height: ${height}%"></div><span class="bar-label">${r.date.split('-').slice(2)}</span>`;
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
        const toast = document.getElementById("toast");
        toast.classList.add("show");
        setTimeout(() => toast.classList.remove("show"), 3000);
      };
    };
  };

  function updateProjections(filteredRecords) {
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
    document.getElementById("projectedProfit").innerText = `KES ${Math.round(totalMonthProfit / prog).toLocaleString()}`;
    document.getElementById("projectedQty").innerText = (totalMonthQty / prog).toFixed(1);
  }

  darkModeBtn.onclick = () => document.body.classList.toggle("dark-mode");
});
