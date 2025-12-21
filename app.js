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
  const form = document.getElementById("farmForm");
  const recordsList = document.getElementById("records");
  const monthFilter = document.getElementById("monthFilter");
  const qtyLabel = document.getElementById("qtyLabel");
  const darkModeBtn = document.getElementById("darkModeBtn");
  const expenseContainer = document.getElementById("expenseContainer");

  const catColors = {
    "Feed": "#2e7d32", "Medication": "#d32f2f", "Chicks": "#fbc02d",
    "Labor": "#0288d1", "Utilities": "#7b1fa2", "Other": "#757575"
  };

  // --- FEATURE: DAILY REMINDERS ---
  function requestNotificationPermission() {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }

  function scheduleDailyReminder() {
    setInterval(() => {
      const now = new Date();
      if (now.getHours() === 18 && now.getMinutes() === 0) {
        new Notification("Farm Tracker Pro", {
          body: "Time to record today's production!",
          icon: "icon-192.png"
        });
      }
    }, 60000);
  }

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
    requestNotificationPermission();
    scheduleDailyReminder();
  };

  // --- DYNAMIC EXPENSE ROWS ---
  document.getElementById("addExpenseRow").addEventListener("click", () => {
    const newRow = document.querySelector(".expense-row").cloneNode(true);
    newRow.querySelector(".exp-amt").value = "";
    const btn = newRow.querySelector("button");
    btn.innerText = "✕";
    btn.style.background = "#d32f2f";
    btn.onclick = () => newRow.remove();
    expenseContainer.appendChild(newRow);
  });

  // --- NEW FEATURE: CALCULATE PROJECTIONS ---
  function updateProjections(filteredRecords) {
    const now = new Date();
    const currentMonth = now.toISOString().substring(0, 7);
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dayOfMonth = now.getDate();

    // Filter only records from the current month
    const thisMonthData = filteredRecords.filter(r => r.date.startsWith(currentMonth));

    if (thisMonthData.length === 0) {
      document.getElementById("projectedProfit").innerText = "Awaiting data...";
      document.getElementById("projectedQty").innerText = "0.0";
      return;
    }

    let totalMonthProfit = 0;
    let totalMonthQty = 0;

    thisMonthData.forEach(r => {
      totalMonthProfit += (r.quantity * r.price) - r.expenses;
      totalMonthQty += r.quantity;
    });

    // Calculate daily averages
    const avgDailyProfit = totalMonthProfit / dayOfMonth;
    const avgDailyQty = totalMonthQty / dayOfMonth;

    // Project for the full month
    const projectedProfit = avgDailyProfit * daysInMonth;
    const projectedQty = avgDailyQty * daysInMonth;

    document.getElementById("projectedProfit").innerText = `KES ${Math.round(projectedProfit).toLocaleString()}`;
    document.getElementById("projectedQty").innerText = projectedQty.toFixed(1);
  }

  // --- CHARTING & VISUALS ---
  function updateChart(data) {
    const container = document.getElementById("productionChart");
    if (!container) return;
    container.innerHTML = "";
    const recent = data.slice(-7);
    const maxQty = Math.max(...recent.map(r => r.quantity), 10);

    recent.forEach(r => {
      const height = (r.quantity / maxQty) * 100;
      const barWrapper = document.createElement("div");
      barWrapper.className = "chart-bar-wrapper";
      barWrapper.innerHTML = `
        <span class="bar-value">${r.quantity}</span>
        <div class="bar" style="height: ${height}%"></div>
        <span class="bar-label">${r.date.split('-').slice(1).join('/')}</span>
      `;
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
      list.innerHTML += `<div><small style="color:${color}">●</small> ${cat}: ${percent.toFixed(0)}%</div>`;
      gradient.push(`${color} ${currentPercent}% ${currentPercent + percent}%`);
      currentPercent += percent;
    });
    pie.style.background = `conic-gradient(${gradient.join(", ")})`;
  }

  // --- DATA LOGIC ---
  function loadRecords() {
    if (!db) return;
    const tx = db.transaction(["records", "settings"], "readonly");
    tx.objectStore("settings").get("farmType").onsuccess = (e) => {
      const type = e.target.result?.value;
      if (!type) return;

      tx.objectStore("records").getAll().onsuccess = (ev) => {
        const all = ev.target.result;
        const sub = document.getElementById("poultrySubtypeToggle").value;
        const filtered = all.filter(r => r.type === type && (!r.subtype || r.subtype === sub));
        
        let [rev, exp, qty] = [0, 0, 0];
        let cats = {};
        recordsList.innerHTML = "";

        // Sort by date descending for the list
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

        document.getElementById("totalProfit").innerText = `KES ${(rev - exp).toLocaleString()}`;
        document.getElementById("totalExpensesDisplay").innerText = `KES ${exp.toLocaleString()}`;
        document.getElementById("totalQuantity").innerText = qty.toFixed(1);
        
        renderPie(cats, exp);
        updateChart(filtered.slice(-7)); // Show last 7 for trend
        updateProjections(filtered);     // Calculate projections
      };
    };
  }

  // --- NAVIGATION LOGIC ---
document.querySelectorAll('.nav-item').forEach(btn => {
    btn.onclick = () => {
        // Update active button UI
        document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Toggle Views
        const target = btn.dataset.screen;
        document.querySelectorAll('.view-section').forEach(section => {
            section.style.display = 'none';
        });

        if (target === 'dashboard') {
            document.getElementById('dashboardView').style.display = 'block';
            loadRecords(); // Reload to refresh charts
        } else if (target === 'records-section') {
            document.getElementById('recordsView').style.display = 'block';
        } else {
            document.getElementById('formView').style.display = 'block';
        }
    };
});

  // --- NAVIGATION & FORM ---
  function showApp(type) {
    farmTypeScreen.style.display = "none";
    appScreen.style.display = "block";
    document.querySelectorAll(".extra-fields").forEach(f => f.style.display = "none");
    if (type === "poultry") document.getElementById("poultryFields").style.display = "block";
    if (type === "dairy") document.getElementById("dairyFields").style.display = "block";
    if (type === "crops") document.getElementById("cropFields").style.display = "block";
    loadRecords();
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
        subtype: document.getElementById("poultrySubtype").value
      };

      db.transaction("records", "readwrite").objectStore("records").add(record).onsuccess = () => {
        form.reset();
        document.getElementById("date").valueAsDate = new Date();
        loadRecords();
        const toast = document.getElementById("toast");
        toast.classList.add("show");
        setTimeout(() => toast.classList.remove("show"), 3000);
      };
    };
  };

  darkModeBtn.onclick = () => document.body.classList.toggle("dark-mode");
  document.getElementById("switchTypeBtn").onclick = () => {
    appScreen.style.display = "none";
    farmTypeScreen.style.display = "block";
  };
  
  // Re-load data when sub-type toggle changes
  document.getElementById("poultrySubtypeToggle").onchange = loadRecords;
});

