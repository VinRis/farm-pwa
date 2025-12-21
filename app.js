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
    getFarmType();
  };

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
      insightText.innerText = "Expenses are exceeding revenue. Check your Breakdown chart.";
    }
  }

  function generateBatchReport(batchName, data) {
    const mortalityRate = data.size > 0 ? ((data.mortality / data.size) * 100).toFixed(1) : 0;
    const fcr = data.weight > 0 ? (data.feed / data.weight).toFixed(2) : "N/A";

    return `
      <div class="batch-report-card" style="background:var(--card-bg); border:1px solid var(--border-color); border-radius:12px; padding:15px; margin-bottom:12px;">
        <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
          <strong>📦 ${batchName}</strong>
          <span style="font-size:0.7rem; padding:2px 8px; border-radius:10px; background:${mortalityRate > 5 ? '#ffebee' : '#e8f5e9'}; color:${mortalityRate > 5 ? '#c62828' : '#2e7d32'};">
            ${mortalityRate}% Mortality
          </span>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:0.85rem;">
          <div><small>Profit</small><p style="margin:0; font-weight:bold;">KES ${data.profit.toLocaleString()}</p></div>
          <div style="text-align:right;"><small>FCR (Feed Conv.)</small><p style="margin:0; font-weight:bold;">${fcr}</p></div>
        </div>
      </div>`;
  }

  // --- DATA LOADING ---
  function loadRecords() {
    if (!db) return;
    const tx = db.transaction(["records", "settings"], "readonly");
    tx.objectStore("settings").get("farmType").onsuccess = (e) => {
      const currentType = e.target.result.value;
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
        const months = new Set();

        allRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        allRecords.forEach(r => {
          if (r.type !== currentType) return;

          // History Logic
          if (r.archived && currentType === "poultry") {
            const batchKey = r.extra || "Unnamed Batch";
            if (!archivedGroups[batchKey]) archivedGroups[batchKey] = { profit: 0, mortality: 0, size: 0, weight: 0, feed: 0 };
            archivedGroups[batchKey].profit += (r.quantity * r.price) - r.expenses;
            archivedGroups[batchKey].mortality += (r.mortality || 0);
            archivedGroups[batchKey].size = Math.max(archivedGroups[batchKey].size, r.flockSize || 0);
            archivedGroups[batchKey].weight += (r.weight || 0);
            archivedGroups[batchKey].feed += (r.feed || 0);
            return;
          }

          if (currentType === "poultry" && r.subtype !== activePoultrySub) return;

          const mKey = r.date.substring(0, 7);
          months.add(mKey);
          if (selectedMonth !== "all" && mKey !== selectedMonth) return;

          totalQty += r.quantity; 
          totalExp += r.expenses; 
          totalRev += (r.quantity * r.price);
          
          if (r.expenseItems) {
            r.expenseItems.forEach(item => {
              const cat = item.category !== "none" ? item.category : "Other";
              categoryTotals[cat] = (categoryTotals[cat] || 0) + item.amount;
            });
          }

          if (currentType === "poultry") {
            pStats.mortality += (r.mortality || 0);
            pStats.feed += (r.feed || 0);
            pStats.size = r.flockSize || pStats.size;
            if(r.weight > 0) { pStats.weight += r.weight; pStats.count++; }
          }

          recordsList.innerHTML += `<li><div><strong>📅 ${r.date}</strong><br><small>Qty: ${r.quantity} | Exp: ${r.expenses}</small></div><div style="text-align:right"><strong>KES ${(r.quantity * r.price).toLocaleString()}</strong><br><button class="delete-btn" data-id="${r.id}">✕</button></div></li>`;
        });

        const profitVal = totalRev - totalExp;
        document.getElementById("totalQuantity").innerText = totalQty.toFixed(1);
        document.getElementById("totalProfit").innerText = `KES ${profitVal.toLocaleString()}`;
        document.getElementById("totalProfit").style.color = profitVal >= 0 ? "#2e7d32" : "#d32f2f";
        document.getElementById("totalExpensesDisplay").innerText = `KES ${totalExp.toLocaleString()}`;
        
        updateSmartInsights(profitVal, totalQty, currentType);

        if (currentType === "poultry") {
          document.getElementById("statFlock").innerText = pStats.size;
          document.getElementById("statMortality").innerText = pStats.mortality;
          document.getElementById("statWeight").innerText = pStats.count > 0 ? (pStats.weight / pStats.count).toFixed(2) + "kg" : "0kg";
          document.getElementById("statFeed").innerText = pStats.feed.toFixed(1) + "kg";
          
          // Render Reports
          if (historyList) {
            Object.keys(archivedGroups).forEach(batch => {
              historyList.innerHTML += generateBatchReport(batch, archivedGroups[batch]);
            });
          }
        }

        renderPie(categoryTotals, totalExp);
        updateChart(allRecords.filter(r => !r.archived && r.type === currentType), currentType);
      };
    };
  }

  // --- REST OF NAVIGATION & UI LOGIC (Remains similar but cleaned) ---
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
  }

  function updatePoultryUI() {
    const sub = document.getElementById("poultrySubtype").value;
    const isBroiler = (sub === "broilers");
    document.querySelectorAll('.broiler-only-field').forEach(el => el.style.display = isBroiler ? "block" : "none");
    qtyLabel.innerText = isBroiler ? "Weight Sold (Kg)" : "Eggs Collected (Pcs/Trays)";
  }

  // Event Listeners
  darkModeBtn.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    const isDark = document.body.classList.contains("dark-mode");
    localStorage.setItem("theme", isDark ? "dark" : "light");
  });

  document.getElementById("poultrySubtypeToggle").addEventListener("change", loadRecords);
  document.getElementById("poultrySubtype").addEventListener("change", updatePoultryUI);
  monthFilter.addEventListener("change", loadRecords);
  
  // Initialize Chart and Dashboard on Start
  window.loadRecords = loadRecords; // For global access if needed
});
