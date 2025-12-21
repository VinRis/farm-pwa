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
  const totalProfitDisplay = document.getElementById("totalProfit"); // FIXED: Defined missing variable

  const catColors = {
    "Feed": "#2e7d32", "Medication": "#d32f2f", "Chicks": "#fbc02d",
    "Labor": "#0288d1", "Utilities": "#7b1fa2", "Other": "#757575"
  };

  // Create Archive Button dynamically
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
    const dateInput = document.getElementById("date");
    if (dateInput) dateInput.valueAsDate = new Date();
    getFarmType();
  };

  // --- UI/THEME LOGIC ---
  if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark-mode");
    darkModeBtn.innerText = "☀️ Light Mode";
  }

  darkModeBtn.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    const isDark = document.body.classList.contains("dark-mode");
    localStorage.setItem("theme", isDark ? "dark" : "light");
    darkModeBtn.innerText = isDark ? "☀️ Light Mode" : "🌙 Dark Mode";
  });

  // --- EXPENSE ROW LOGIC ---
  document.getElementById("expenseContainer").addEventListener("click", (e) => {
    const container = document.getElementById("expenseContainer");
    if (e.target.id === "addExpenseRow") {
      const newRow = document.createElement("div");
      newRow.className = "expense-row";
      newRow.style.cssText = "display: flex; gap: 5px; margin-bottom: 10px;";
      newRow.innerHTML = `
        <select class="exp-cat" style="flex: 2; margin: 0; padding: 8px;">
          <option value="none">-- Category --</option>
          <option value="Feed">🌾 Feed</option>
          <option value="Medication">💉 Medication</option>
          <option value="Chicks">🐣 Chicks</option>
          <option value="Labor">👷 Labor</option>
          <option value="Utilities">💡 Utilities</option>
          <option value="Other">📦 Other</option>
        </select>
        <input type="number" class="exp-amt" placeholder="Amount" style="flex: 2; margin: 0; padding: 8px;" inputmode="decimal">
        <button type="button" class="remove-exp" style="flex: 0.5; margin: 0; background: #d32f2f; color:white; border:none; border-radius:4px;">✕</button>
      `;
      container.appendChild(newRow);
    }
    if (e.target.classList.contains("remove-exp")) {
      e.target.parentElement.remove();
    }
  });

  // --- NAVIGATION LOGIC ---
  const farmTypeBtns = document.querySelectorAll("#farmTypeScreen button");
  farmTypeBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      setFarmType(btn.getAttribute("data-type"));
    });
  });

  function setFarmType(type) {
    const tx = db.transaction("settings", "readwrite");
    tx.objectStore("settings").put({ key: "farmType", value: type });
    tx.oncomplete = () => {
      showApp(type);
      loadRecords();
    };
  }

  function getFarmType() {
    const tx = db.transaction("settings", "readonly");
    const req = tx.objectStore("settings").get("farmType");
    req.onsuccess = () => {
      if (req.result) {
        showApp(req.result.value);
        loadRecords();
      } else {
        farmTypeScreen.style.display = "block";
      }
    };
  }

  function showApp(type) {
    const headerElement = document.getElementById("mainHeader");
    const titles = { poultry: "Poultry Production", dairy: "Dairy Production", crops: "Crops Production" };
    headerElement.innerText = titles[type] || "Farm Production Tracker";

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

  // --- SAVE RECORD ---
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const txS = db.transaction("settings", "readonly");
    txS.objectStore("settings").get("farmType").onsuccess = (ev) => {
      const currentType = ev.target.result.value;
      const expenseRows = document.querySelectorAll(".expense-row");
      const expenseItems = Array.from(expenseRows).map(row => ({
        category: row.querySelector(".exp-cat").value,
        amount: Number(row.querySelector(".exp-amt").value) || 0
      })).filter(item => item.amount > 0);

      const totalExpenses = expenseItems.reduce((sum, item) => sum + item.amount, 0);

      const record = {
        type: currentType,
        date: document.getElementById("date").value,
        quantity: Number(document.getElementById("quantity").value),
        price: Number(document.getElementById("price").value),
        expenses: totalExpenses,
        expenseItems: expenseItems,
        subtype: currentType === "poultry" ? document.getElementById("poultrySubtype").value : null,
        mortality: currentType === "poultry" ? Number(document.getElementById("mortality").value) || 0 : 0,
        flockSize: currentType === "poultry" ? Number(document.getElementById("flockSize").value) || 0 : 0,
        feed: currentType === "poultry" ? Number(document.getElementById("feed").value) || 0 : 0,
        weight: currentType === "poultry" ? Number(document.getElementById("avgWeight").value) || 0 : 0,
        archived: false,
        extra: currentType === "dairy" ? document.getElementById("cowId").value :
               currentType === "poultry" ? document.getElementById("batchId").value :
               document.getElementById("fieldName").value
      };
      
      const tx = db.transaction("records", "readwrite");
      tx.objectStore("records").add(record);
      tx.oncomplete = () => {
        loadRecords();
        form.reset();
        document.getElementById("date").valueAsDate = new Date();
        // Reset expense container to one blank row
        document.getElementById("expenseContainer").innerHTML = `
          <div class="expense-row" style="display: flex; gap: 5px; margin-bottom: 10px;">
            <select class="exp-cat" style="flex: 2; margin: 0; padding: 8px;">
              <option value="none">-- Category --</option>
              <option value="Feed">🌾 Feed</option>
              <option value="Medication">💉 Medication</option>
              <option value="Chicks">🐣 Chicks</option>
              <option value="Labor">👷 Labor</option>
              <option value="Utilities">💡 Utilities</option>
              <option value="Other">📦 Other</option>
            </select>
            <input type="number" class="exp-amt" placeholder="Amount" style="flex: 2; margin: 0; padding: 8px;" inputmode="decimal">
            <button type="button" id="addExpenseRow" style="flex: 0.5; margin: 0; background: #2e7d32; border:none; border-radius: 4px; color:white; font-weight: bold;">+</button>
          </div>
        `;
        showToast("Record Saved! ✅");
      };
    };
  });

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
        const pieCircle = document.getElementById("pieChartCircle");
        
        if(historyList) historyList.innerHTML = "";
        if(breakdownList) breakdownList.innerHTML = "";

        let [totalQty, totalExp, totalRev] = [0, 0, 0];
        let pStats = { mortality: 0, feed: 0, size: 0, weight: 0, count: 0 };
        let categoryTotals = {}; 
        let archivedGroups = {}; 
        const months = new Set();

        const activeRecords = allRecords.filter(r => !r.archived && r.type === currentType);
        updateChart(activeRecords, currentType);

        allRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        allRecords.forEach(r => {
          if (r.type !== currentType) return;
          if (currentType === "poultry" && r.subtype !== activePoultrySub) return;

          if (r.archived && currentType === "poultry") {
            const batchKey = r.extra || "Unnamed Batch";
            if (!archivedGroups[batchKey]) archivedGroups[batchKey] = { qty: 0, profit: 0, mortality: 0 };
            archivedGroups[batchKey].qty += r.quantity;
            archivedGroups[batchKey].profit += (r.quantity * r.price) - r.expenses;
            archivedGroups[batchKey].mortality += (r.mortality || 0);
            return;
          }

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

          const extraLabel = r.extra ? `<br><small>🏷️ ${r.extra}</small>` : "";
          recordsList.innerHTML += `<li><div><strong>📅 ${r.date}</strong> ${extraLabel}<br><small>Qty: ${r.quantity} | Exp: ${r.expenses}</small></div><div style="text-align:right"><strong>KES ${(r.quantity * r.price).toLocaleString()}</strong><br><button class="delete-btn" data-id="${r.id}">✕</button></div></li>`;
        });
        function updateSmartInsights(profit, totalQty, type) {
  const insightDiv = document.getElementById("smartInsights");
  const insightText = document.getElementById("insightText");
  const icon = document.getElementById("insightIcon");

  let message = "";
  
  if (profit > 0) {
    insightDiv.style.display = "flex";
    insightDiv.style.background = "rgba(46, 125, 50, 0.1)";
    icon.innerText = "🚀";
    
    if (type === "poultry") {
      message = "Profit is positive! Consider reinvesting in higher quality feed to boost egg/weight yield.";
    } else if (type === "dairy") {
      message = "Great milk yield! Ensure your cooling storage is efficient to minimize waste.";
    } else {
      message = "Harvest is profitable. Have you considered rotating crops for the next season?";
    }
  } else if (profit < 0 && totalQty > 0) {
    insightDiv.style.display = "flex";
    insightDiv.style.background = "rgba(211, 47, 47, 0.1)";
    icon.innerText = "📉";
    message = "Expenses are exceeding revenue. Review your 'Expense Breakdown' chart to identify leaks.";
  } else {
    insightDiv.style.display = "none";
  }

  insightText.innerText = message;
}

        // --- UPDATE DASHBOARD UI ---
        const profitVal = totalRev - totalExp;
        document.getElementById("totalQuantity").innerText = totalQty.toFixed(1);
        document.getElementById("totalProfit").innerText = `KES ${profitVal.toLocaleString()}`;
        document.getElementById("totalProfit").style.color = profitVal >= 0 ? "#2e7d32" : "#d32f2f";
        document.getElementById("totalExpensesDisplay").innerText = `KES ${totalExp.toLocaleString()}`;
        
        if (currentType === "poultry") {
          document.getElementById("kpiLabel3").innerText = "Flock Size";
          document.getElementById("statFlock").innerText = pStats.size;
          document.getElementById("kpiLabel4").innerText = "Mortality";
          document.getElementById("statMortality").innerText = pStats.mortality;
          const isBroiler = (activePoultrySub === "broilers");
          document.getElementById("avgWeightCard").style.display = isBroiler ? "block" : "none";
          document.getElementById("feedCard").style.display = "block"; 
          document.getElementById("statWeight").innerText = pStats.count > 0 ? (pStats.weight / pStats.count).toFixed(2) + "kg" : "0kg";
          document.getElementById("statFeed").innerText = pStats.feed.toFixed(1) + "kg";
        } else {
          document.getElementById("kpiLabel3").innerText = currentType === "dairy" ? "Avg Price" : "Total Area";
          document.getElementById("statFlock").innerText = totalQty > 0 ? (totalRev / totalQty).toFixed(1) : "-";
          document.getElementById("kpiLabel4").innerText = "Months Active";
          document.getElementById("statMortality").innerText = months.size;
          document.getElementById("avgWeightCard").style.display = "none";
          document.getElementById("feedCard").style.display = "none";
        }

        // --- RENDER PIE CHART ---
        renderPie(categoryTotals, totalExp);

        if (currentType === "poultry" && historyList) {
          Object.keys(archivedGroups).forEach(batch => {
            const data = archivedGroups[batch];
            historyList.innerHTML += `<div class="card" style="background:var(--highlight-bg); border-left: 4px solid var(--accent-green);"><p><strong>📦 ${batch}</strong></p><small>Profit: KES ${data.profit.toLocaleString()}<br>Total Qty: ${data.qty.toFixed(1)}<br>Mortality: ${data.mortality}</small></div>`;
          });
        }

        const currentOpts = Array.from(monthFilter.options).map(o => o.value);
        Array.from(months).sort().reverse().forEach(m => { if (!currentOpts.includes(m)) monthFilter.add(new Option(m, m)); });
      };
    };
  }

  function renderPie(totals, totalExp) {
    const pieCircle = document.getElementById("pieChartCircle");
    const breakdownList = document.getElementById("breakdownList");
    const breakdownDiv = document.getElementById("expenseBreakdown");
    if (Object.keys(totals).length > 0 && totalExp > 0) {
      breakdownDiv.style.display = "block";
      let gradientParts = [];
      let currentPct = 0;
      for (const [cat, amt] of Object.entries(totals)) {
        const pct = (amt / totalExp) * 100;
        const color = catColors[cat] || "#455a64";
        breakdownList.innerHTML += `
          <div style="display:flex; justify-content:space-between; margin-bottom:6px; font-size:0.85rem;">
            <span><span style="height:8px; width:8px; background:${color}; display:inline-block; border-radius:2px; margin-right:5px;"></span>${cat}</span>
            <span style="font-weight:bold;">${pct.toFixed(0)}%</span>
          </div>`;
        if (pct > 0) {
          gradientParts.push(`${color} ${currentPct}% ${currentPct + pct}%`);
          currentPct += pct;
        }
      }
      pieCircle.style.background = `conic-gradient(${gradientParts.join(", ")})`;
    } else {
      breakdownDiv.style.display = "none";
    }
  }

  function updateChart(data, currentType) {
    const chartContainer = document.getElementById("productionChart");
    if (!chartContainer) return;
    chartContainer.innerHTML = "";
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      last7Days.push(d.toISOString().split('T')[0]);
    }
    const dailyTotals = {};
    last7Days.forEach(date => dailyTotals[date] = 0);
    data.forEach(r => { if (dailyTotals.hasOwnProperty(r.date)) dailyTotals[r.date] += r.quantity; });
    const maxVal = Math.max(...Object.values(dailyTotals), 1);
    last7Days.forEach(date => {
      const val = dailyTotals[date];
      const heightPercent = (val / maxVal) * 100;
      chartContainer.innerHTML += `<div class="chart-bar-wrapper"><span class="bar-value">${val > 0 ? val.toFixed(1) : ''}</span><div class="bar" style="height: ${heightPercent}%"></div><span class="bar-label">${date.split('-')[2]}</span></div>`;
    });
  }

  // --- ACTIONS & UTILS ---
  archiveBtn.addEventListener("click", () => {
    const sub = document.getElementById("poultrySubtypeToggle").value;
    if (confirm(`Archive the current ${sub} batch? Dashboard will reset.`)) {
      const tx = db.transaction("records", "readwrite");
      const store = tx.objectStore("records");
      store.getAll().onsuccess = (ev) => {
        ev.target.result.forEach(r => {
          if (r.type === "poultry" && r.subtype === sub && !r.archived) {
            r.archived = true;
            store.put(r);
          }
        });
      };
      tx.oncomplete = () => { loadRecords(); showToast("Batch Archived! 📂"); };
    }
  });

  document.getElementById("exportBtn").addEventListener("click", () => {
    const tx = db.transaction("records", "readonly");
    tx.objectStore("records").getAll().onsuccess = (e) => {
      const data = e.target.result;
      if (data.length === 0) return showToast("No records to export!");
      const headers = ["Date", "Type", "Subtype", "Label", "Qty", "Price", "Rev", "Exp", "Profit"];
      const csvRows = data.map(r => [r.date, r.type, r.subtype||"-", `"${r.extra||''}"`, r.quantity, r.price, r.quantity*r.price, r.expenses, (r.quantity*r.price)-r.expenses].join(","));
      const csvContent = [headers.join(","), ...csvRows].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Farm_Report_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
    };
  });

  monthFilter.addEventListener("change", loadRecords);
  document.getElementById("poultrySubtype").addEventListener("change", updatePoultryUI);
  document.getElementById("poultrySubtypeToggle").addEventListener("change", loadRecords);
  
  recordsList.addEventListener("click", (e) => {
    if (e.target.classList.contains("delete-btn") && confirm("Delete record?")) {
      const tx = db.transaction("records", "readwrite");
      tx.objectStore("records").delete(Number(e.target.dataset.id));
      tx.oncomplete = loadRecords;
    }
  });

  document.getElementById("switchTypeBtn").addEventListener("click", () => { 
    farmTypeScreen.style.display = "block"; 
    appScreen.style.display = "none"; 
  });

  document.getElementById("resetBtn").addEventListener("click", () => { 
    if (confirm("Wipe all data? This cannot be undone.")) { 
      db.close(); 
      indexedDB.deleteDatabase("FarmDB").onsuccess = () => window.location.reload(); 
    } 
  });

  function showToast(msg) {
    const toast = document.getElementById("toast");
    toast.innerText = msg;
    toast.className = "toast show";
    setTimeout(() => { toast.className = "toast"; }, 3000);
  }

  function updateOnlineStatus() {
    const dot = document.getElementById("statusIndicator");
    const text = document.getElementById("statusText");
    if (navigator.onLine) {
      dot.style.background = "#4caf50";
      text.innerText = "Online";
    } else {
      dot.style.background = "#f44336";
      text.innerText = "Offline";
    }
  }

  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  updateOnlineStatus();
});

