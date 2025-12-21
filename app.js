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

  const catColors = {
    "Feed": "#2e7d32", "Medication": "#d32f2f", "Chicks": "#fbc02d",
    "Labor": "#0288d1", "Utilities": "#7b1fa2", "Other": "#757575"
  };

  const archiveBtn = document.createElement('button');
  archiveBtn.id = "archiveBtn";
  archiveBtn.innerHTML = "📂 Close & Archive Batch";
  archiveBtn.style.cssText = "background: #455a64; margin-top: 15px; display: none; width: 100%; color: white; border: none; padding: 12px; border-radius: 8px; font-weight: bold; cursor: pointer;";
  document.getElementById("dashboard").appendChild(archiveBtn);

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
    getFarmType(); // Load saved preference
  };

  // --- CHARTING FUNCTIONS ---
  function updateChart(data, type) {
    const container = document.getElementById("productionChart");
    if (!container) return;
    container.innerHTML = "";
    
    // Take last 7 records for the trend
    const recent = data.slice(-7).reverse();
    const maxQty = Math.max(...recent.map(r => r.quantity), 10);

    recent.forEach(r => {
      const height = (r.quantity / maxQty) * 100;
      const bar = document.createElement("div");
      bar.className = "chart-bar-wrapper";
      bar.innerHTML = `
        <span class="bar-value">${r.quantity}</span>
        <div class="bar" style="height: ${height}%"></div>
        <span class="bar-label">${r.date.split('-')[2]}/${r.date.split('-')[1]}</span>
      `;
      container.appendChild(bar);
    });
  }

  function renderPie(categories, total) {
    const list = document.getElementById("breakdownList");
    const pie = document.getElementById("pieChartCircle");
    if (!list || !pie) return;

    list.innerHTML = "";
    document.getElementById("expenseBreakdown").style.display = total > 0 ? "block" : "none";

    let gradient = [];
    let currentPercent = 0;

    Object.keys(categories).forEach(cat => {
      const val = categories[cat];
      const percent = (val / total) * 100;
      const color = catColors[cat] || "#757575";

      list.innerHTML += `<div style="font-size:0.8rem; margin-bottom:4px;">
        <span style="color:${color}">●</span> ${cat}: <strong>${percent.toFixed(0)}%</strong>
      </div>`;

      gradient.push(`${color} ${currentPercent}% ${currentPercent + percent}%`);
      currentPercent += percent;
    });

    pie.style.background = `conic-gradient(${gradient.join(", ")})`;
  }

  // --- INSIGHTS & REPORTS LOGIC ---
  function updateSmartInsights(profit, totalQty, type) {
    const insightDiv = document.getElementById("smartInsights");
    if (!insightDiv) return;
    const insightText = document.getElementById("insightText");
    const icon = document.getElementById("insightIcon");

    if (totalQty === 0) { insightDiv.style.display = "none"; return; }

    insightDiv.style.display = "flex";
    if (profit > 0) {
      insightDiv.style.background = "rgba(46, 125, 50, 0.1)";
      icon.innerText = "🚀";
      const tips = {
        poultry: "Profit is positive! Reinvest in quality feed for better conversion.",
        dairy: "Great milk yield! Monitor storage temps to prevent spoilage.",
        crops: "Profitable harvest! Consider soil testing for the next cycle."
      };
      insightText.innerText = tips[type] || "Farm is performing well!";
    } else {
      insightDiv.style.background = "rgba(211, 47, 47, 0.1)";
      icon.innerText = "📉";
      insightText.innerText = "Expenses exceed revenue. Check your Breakdown chart.";
    }
  }

  function generateBatchReport(batchName, data) {
    const mortalityRate = data.size > 0 ? ((data.mortality / data.size) * 100).toFixed(1) : 0;
    const fcr = data.weight > 0 ? (data.feed / data.weight).toFixed(2) : "N/A";

    return `
      <div class="batch-report-card">
        <div class="report-header">
          <strong>📦 ${batchName}</strong>
          <span class="status-tag ${mortalityRate > 5 ? 'warn' : 'good'}">
            ${mortalityRate}% Mortality
          </span>
        </div>
        <div class="report-stats">
          <div class="stat-item"><small>Profit</small><p>KES ${data.profit.toLocaleString()}</p></div>
          <div class="stat-item" style="text-align:right;"><small>FCR</small><p>${fcr}</p></div>
        </div>
        <div class="performance-bar"><div class="fill" style="width:${Math.min(100, (1/fcr)*200)}%"></div></div>
      </div>`;
  }

  // --- DATA SAVING & NAVIGATION ---
  function getFarmType() {
    const tx = db.transaction("settings", "readonly");
    tx.objectStore("settings").get("farmType").onsuccess = (e) => {
      if (e.target.result) showApp(e.target.result.value);
    };
  }

  function setFarmType(type) {
    const tx = db.transaction("settings", "readwrite");
    tx.objectStore("settings").put({ key: "farmType", value: type });
    showApp(type);
    loadRecords();
  }

  function showApp(type) {
    farmTypeScreen.style.display = "none";
    appScreen.style.display = "block";
    document.querySelectorAll('.extra-fields').forEach(div => div.style.display = 'none');
    
    const isPoultry = (type === "poultry");
    document.getElementById("poultrySubtypeToggle").style.display = isPoultry ? "block" : "none";
    document.getElementById("historySection").style.display = isPoultry ? "block" : "none";
    archiveBtn.style.display = isPoultry ? "block" : "none";

    if (type === "dairy") {
      qtyLabel.innerText = "Milk Collected (Litres)";
      document.getElementById("dairyFields").style.display = "block";
    } else if (type === "poultry") {
      document.getElementById("poultryFields").style.display = "block";
      updatePoultryUI();
    } else if (type === "crops") {
      qtyLabel.innerText = "Harvest Quantity (Kg)";
      document.getElementById("cropFields").style.display = "block";
    }
    loadRecords();
  }

  function updatePoultryUI() {
    const sub = document.getElementById("poultrySubtype").value;
    const isBroiler = (sub === "broilers");
    document.querySelectorAll('.broiler-only-field').forEach(el => el.style.display = isBroiler ? "block" : "none");
    qtyLabel.innerText = isBroiler ? "Weight Sold (Kg)" : "Eggs Collected (Pcs/Trays)";
  }

  // --- LOAD RECORDS ---
  function loadRecords() {
    if (!db) return;
    const tx = db.transaction(["records", "settings"], "readonly");
    tx.objectStore("settings").get("farmType").onsuccess = (e) => {
      const currentType = e.target.result ? e.target.result.value : null;
      if(!currentType) return;

      tx.objectStore("records").getAll().onsuccess = (ev) => {
        const allRecords = ev.target.result;
        const selectedMonth = monthFilter.value;
        const activePoultrySub = document.getElementById("poultrySubtypeToggle").value;
        
        recordsList.innerHTML = "";
        const historyList = document.getElementById("historyList");
        const breakdownList = document.getElementById("breakdownList");
        
        if (historyList) historyList.innerHTML = "";
        if (breakdownList) breakdownList.innerHTML = "";

        let [totalQty, totalExp, totalRev] = [0, 0, 0];
        let pStats = { mortality: 0, feed: 0, size: 0, weight: 0, count: 0 };
        let categoryTotals = {}; 
        let archivedGroups = {}; 

        allRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        allRecords.forEach(r => {
          if (r.type !== currentType) return;

          if (r.archived && currentType === "poultry") {
            const batchKey = r.batchId || "Unnamed Batch";
            if (!archivedGroups[batchKey]) archivedGroups[batchKey] = { profit: 0, mortality: 0, size: 0, weight: 0, feed: 0 };
            archivedGroups[batchKey].profit += (r.quantity * r.price) - r.expenses;
            archivedGroups[batchKey].mortality += (r.mortality || 0);
            archivedGroups[batchKey].size = Math.max(archivedGroups[batchKey].size, r.flockSize || 0);
            archivedGroups[batchKey].weight += (r.avgWeight || 0);
            archivedGroups[batchKey].feed += (r.feed || 0);
            return;
          }

          if (currentType === "poultry" && r.subtype !== activePoultrySub) return;

          const mKey = r.date.substring(0, 7);
          if (selectedMonth !== "all" && mKey !== selectedMonth) return;

          totalQty += r.quantity; 
          totalExp += (r.expenses || 0); 
          totalRev += (r.quantity * r.price);
          
          if (r.expenseItems) {
            r.expenseItems.forEach(item => {
              const cat = item.category !== "none" ? item.category : "Other";
              categoryTotals[cat] = (categoryTotals[cat] || 0) + item.amount;
            });
          }

          recordsList.innerHTML += `<li>
            <div><strong>📅 ${r.date}</strong><br><small>Qty: ${r.quantity} | Exp: ${r.expenses}</small></div>
            <div style="text-align:right"><strong>KES ${(r.quantity * r.price).toLocaleString()}</strong></div>
          </li>`;
        });

        const profitVal = totalRev - totalExp;
        document.getElementById("totalQuantity").innerText = totalQty.toFixed(1);
        document.getElementById("totalProfit").innerText = `KES ${profitVal.toLocaleString()}`;
        document.getElementById("totalExpensesDisplay").innerText = `KES ${totalExp.toLocaleString()}`;
        
        updateSmartInsights(profitVal, totalQty, currentType);
        renderPie(categoryTotals, totalExp);
        updateChart(allRecords.filter(r => !r.archived && r.type === currentType), currentType);

        if (currentType === "poultry" && historyList) {
          Object.keys(archivedGroups).forEach(batch => {
            historyList.innerHTML += generateBatchReport(batch, archivedGroups[batch]);
          });
        }
      };
    };
  }

  // --- EVENT LISTENERS ---
  document.querySelectorAll(".type-btn").forEach(btn => {
    btn.addEventListener("click", () => setFarmType(btn.dataset.type));
  });

  document.getElementById("switchTypeBtn").addEventListener("click", () => {
    farmTypeScreen.style.display = "block";
    appScreen.style.display = "none";
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const tx = db.transaction("settings", "readonly");
    tx.objectStore("settings").get("farmType").onsuccess = (ev) => {
      const type = ev.target.result.value;
      const expenseRows = document.querySelectorAll(".expense-row");
      let expenseItems = [];
      let totalExp = 0;

      expenseRows.forEach(row => {
        const cat = row.querySelector(".exp-cat").value;
        const amt = parseFloat(row.querySelector(".exp-amt").value) || 0;
        if (amt > 0) {
          expenseItems.push({ category: cat, amount: amt });
          totalExp += amt;
        }
      });

      const record = {
        date: document.getElementById("date").value,
        type: type,
        quantity: parseFloat(document.getElementById("quantity").value),
        price: parseFloat(document.getElementById("price").value),
        expenses: totalExp,
        expenseItems: expenseItems,
        // Poultry specific
        subtype: document.getElementById("poultrySubtype").value,
        batchId: document.getElementById("batchId").value,
        mortality: parseInt(document.getElementById("mortality").value) || 0,
        flockSize: parseInt(document.getElementById("flockSize").value) || 0,
        feed: parseFloat(document.getElementById("feed").value) || 0,
        avgWeight: parseFloat(document.getElementById("avgWeight").value) || 0
      };

      const saveTx = db.transaction("records", "readwrite");
      saveTx.objectStore("records").add(record).onsuccess = () => {
        form.reset();
        document.getElementById("date").valueAsDate = new Date();
        loadRecords();
        const toast = document.getElementById("toast");
        toast.classList.add("show");
        setTimeout(() => toast.classList.remove("show"), 3000);
      };
    };
  });

  darkModeBtn.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
  });

  document.getElementById("poultrySubtypeToggle").addEventListener("change", loadRecords);
  document.getElementById("poultrySubtype").addEventListener("change", updatePoultryUI);
  monthFilter.addEventListener("change", loadRecords);
});
