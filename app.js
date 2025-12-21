if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js")
    .then(() => console.log("Service Worker Registered"))
    .catch(err => console.log("SW Registration Failed: ", err));
}

document.addEventListener("DOMContentLoaded", () => {
  let db;
  const farmTypeScreen = document.getElementById("farmTypeScreen");
  const appScreen = document.getElementById("appScreen");
  const form = document.getElementById("farmForm");
  const recordsList = document.getElementById("records");
  const monthFilter = document.getElementById("monthFilter");
  const qtyLabel = document.getElementById("qtyLabel");

  // Create Archive Button
  const archiveBtn = document.createElement('button');
  archiveBtn.id = "archiveBtn";
  archiveBtn.innerHTML = "📂 Close & Archive Batch";
  archiveBtn.style.cssText = "background: #455a64; margin-top: 10px; display: none; width: 100%; color: white; border: none; padding: 10px; border-radius: 8px; font-weight: bold; cursor: pointer;";
  document.getElementById("dashboard").appendChild(archiveBtn);

  const request = indexedDB.open("FarmDB", 1);

  request.onupgradeneeded = (e) => {
    db = e.target.result;
    if (!db.objectStoreNames.contains("records")) db.createObjectStore("records", { keyPath: "id", autoIncrement: true });
    if (!db.objectStoreNames.contains("settings")) db.createObjectStore("settings", { keyPath: "key" });
  };

  request.onsuccess = (e) => {
    db = e.target.result;
    document.getElementById("date").valueAsDate = new Date();
    getFarmType();
  };

  document.addEventListener("click", (e) => {
    const btn = e.target.closest("#farmTypeScreen button");
    if (btn) setFarmType(btn.dataset.type);
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
    farmTypeScreen.style.display = "none";
    appScreen.style.display = "block";
    document.querySelectorAll('.extra-fields').forEach(div => div.style.display = 'none');
    
    const isPoultry = type === "poultry";
    document.getElementById("poultrySubtypeToggle").style.display = isPoultry ? "block" : "none";
    document.getElementById("poultryKpis").style.display = isPoultry ? "grid" : "none";
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
    const isBroiler = sub === "broilers";
    document.querySelectorAll('.broiler-only-field').forEach(el => el.style.display = isBroiler ? "block" : "none");
    qtyLabel.innerText = isBroiler ? "Weight Sold (Kg)" : "Eggs Collected (Pcs/Trays)";
  }

  document.getElementById("poultrySubtype").addEventListener("change", updatePoultryUI);
  document.getElementById("poultrySubtypeToggle").addEventListener("change", loadRecords);

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const txS = db.transaction("settings", "readonly");
    txS.objectStore("settings").get("farmType").onsuccess = (ev) => {
      const currentType = ev.target.result.value;
      const record = {
        type: currentType,
        date: document.getElementById("date").value,
        quantity: Number(document.getElementById("quantity").value),
        price: Number(document.getElementById("price").value),
        expenses: Number(document.getElementById("expenses").value) || 0,
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
        showApp(currentType);
        showToast("Record Saved! ✅");
      };
    };
  });

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
        if(historyList) historyList.innerHTML = "";

        let [totalQty, totalExp, totalRev] = [0, 0, 0];
        let pStats = { mortality: 0, feed: 0, eggs: 0, size: 0, weightSum: 0, weightCount: 0 };
        let archivedGroups = {}; // For history section
        const months = new Set();

        const activeRecords = allRecords.filter(r => !r.archived);
        updateChart(activeRecords, currentType);

        allRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        allRecords.forEach(r => {
          if (r.type !== currentType) return;
          if (currentType === "poultry" && r.subtype !== activePoultrySub) return;

          // HANDLE ARCHIVED DATA (History Section)
          if (r.archived && currentType === "poultry") {
            const batchKey = r.extra || "Unknown Batch";
            if (!archivedGroups[batchKey]) archivedGroups[batchKey] = { qty: 0, profit: 0, mortality: 0 };
            archivedGroups[batchKey].qty += r.quantity;
            archivedGroups[batchKey].profit += (r.quantity * r.price) - r.expenses;
            archivedGroups[batchKey].mortality += (r.mortality || 0);
            return;
          }

          // HANDLE ACTIVE DATA
          const mKey = r.date.substring(0, 7);
          months.add(mKey);
          if (selectedMonth !== "all" && mKey !== selectedMonth) return;

          totalQty += r.quantity; totalExp += r.expenses; totalRev += (r.quantity * r.price);
          
          if (currentType === "poultry") {
            pStats.mortality += (r.mortality || 0);
            pStats.feed += (r.feed || 0);
            pStats.size = r.flockSize || pStats.size; 
            if (r.subtype === "layers") pStats.eggs += r.quantity;
            else { pStats.weightSum += (r.weight || 0); pStats.weightCount++; }
          }

          const extraLabel = r.extra ? `<br><small>🏷️ ${r.extra}</small>` : "";
          recordsList.innerHTML += `<li><div><strong>📅 ${r.date}</strong> ${extraLabel}<br><small>Qty: ${r.quantity} | Exp: ${r.expenses}</small></div><div style="text-align:right"><strong>KES ${(r.quantity * r.price).toLocaleString()}</strong><br><button class="delete-btn" data-id="${r.id}">✕</button></div></li>`;
        });

        // Update Dashboard
        document.getElementById("totalQuantity").innerText = totalQty.toFixed(1);
        document.getElementById("totalProfit").innerText = (totalRev - totalExp).toLocaleString();
        
        if (currentType === "poultry") {
          document.getElementById("statFlock").innerText = pStats.size;
          document.getElementById("statMortality").innerText = pStats.mortality;
          document.getElementById("statFeed").innerText = pStats.feed.toFixed(1);
          
          const isLayers = activePoultrySub === "layers";
          document.querySelectorAll('.layer-only').forEach(el => el.style.display = isLayers ? "block" : "none");
          document.querySelectorAll('.broiler-only').forEach(el => el.style.display = isLayers ? "none" : "block");

          const ratio = pStats.size > 0 ? ((pStats.eggs / pStats.size) * 100).toFixed(1) : 0;
          document.getElementById("statLaying").innerText = ratio + "%";
          const avgW = pStats.weightCount > 0 ? (pStats.weightSum / pStats.weightCount).toFixed(2) : 0;
          document.getElementById("statWeight").innerText = avgW + "kg";

          // Render History Cards
          Object.keys(archivedGroups).forEach(batch => {
            const data = archivedGroups[batch];
            historyList.innerHTML += `<div class="card" style="background:#f1f8e9; border-left: 4px solid #2e7d32;">
              <p><strong>📦 ${batch}</strong></p>
              <small>Profit: KES ${data.profit.toLocaleString()}<br>
              Total Qty: ${data.qty.toFixed(1)}<br>
              Total Mortality: ${data.mortality}</small>
            </div>`;
          });
        }

        const currentOpts = Array.from(monthFilter.options).map(o => o.value);
        Array.from(months).sort().reverse().forEach(m => { if (!currentOpts.includes(m)) monthFilter.add(new Option(m, m)); });
      };
    };
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
    data.forEach(r => { if (r.type === currentType && dailyTotals.hasOwnProperty(r.date)) dailyTotals[r.date] += r.quantity; });
    const maxVal = Math.max(...Object.values(dailyTotals), 1);
    last7Days.forEach(date => {
      const val = dailyTotals[date];
      const heightPercent = (val / maxVal) * 100;
      chartContainer.innerHTML += `<div class="chart-bar-wrapper"><span class="bar-value">${val > 0 ? val.toFixed(1) : ''}</span><div class="bar" style="height: ${heightPercent}%"></div><span class="bar-label">${date.split('-')[2]}</span></div>`;
    });
  }

  archiveBtn.addEventListener("click", () => {
    const sub = document.getElementById("poultrySubtypeToggle").value;
    if (confirm(`Archive the current ${sub} batch? Dashboard will reset for a new flock.`)) {
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

  monthFilter.addEventListener("change", loadRecords);
  recordsList.addEventListener("click", (e) => {
    if (e.target.classList.contains("delete-btn") && confirm("Delete record?")) {
      const tx = db.transaction("records", "readwrite");
      tx.objectStore("records").delete(Number(e.target.dataset.id));
      tx.oncomplete = loadRecords;
    }
  });

  document.getElementById("switchTypeBtn").addEventListener("click", () => { farmTypeScreen.style.display = "block"; appScreen.style.display = "none"; });
  document.getElementById("resetBtn").addEventListener("click", () => { if (confirm("Wipe all data?")) { db.close(); indexedDB.deleteDatabase("FarmDB").onsuccess = () => window.location.reload(); } });

  function showToast(msg) {
    const toast = document.getElementById("toast");
    toast.innerText = msg;
    toast.className = "toast show";
    setTimeout(() => { toast.className = toast.className.replace("show", ""); }, 3000);
  }
});

// ... existing setup code ...

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const txS = db.transaction("settings", "readonly");
    txS.objectStore("settings").get("farmType").onsuccess = (ev) => {
      const currentType = ev.target.result.value;
      const record = {
        type: currentType,
        date: document.getElementById("date").value,
        quantity: Number(document.getElementById("quantity").value),
        price: Number(document.getElementById("price").value),
        expenses: Number(document.getElementById("expenses").value) || 0,
        expenseCategory: document.getElementById("expenseCategory").value, // NEW FIELD
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
        showApp(currentType);
        showToast("Record & Category Saved! ✅");
      };
    };
  });

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
        if(historyList) historyList.innerHTML = "";
        if(breakdownList) breakdownList.innerHTML = "";

        let [totalQty, totalExp, totalRev] = [0, 0, 0];
        let pStats = { mortality: 0, feed: 0, eggs: 0, size: 0, weightSum: 0, weightCount: 0 };
        let categoryTotals = {}; // NEW: To track expense breakdown
        let archivedGroups = {};
        const months = new Set();

        const activeRecords = allRecords.filter(r => !r.archived);
        updateChart(activeRecords, currentType);

        allRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        allRecords.forEach(r => {
          if (r.type !== currentType) return;
          if (currentType === "poultry" && r.subtype !== activePoultrySub) return;
          if (r.archived) {
             // ... archived grouping logic ...
             return;
          }

          const mKey = r.date.substring(0, 7);
          months.add(mKey);
          if (selectedMonth !== "all" && mKey !== selectedMonth) return;

          totalQty += r.quantity; totalExp += r.expenses; totalRev += (r.quantity * r.price);
          
          // Calculate Category Breakdown
          if (r.expenses > 0) {
            const cat = r.expenseCategory || "Other";
            categoryTotals[cat] = (categoryTotals[cat] || 0) + r.expenses;
          }

          // ... poultry stats logic ...

          const catBadge = r.expenses > 0 ? `<br><small style="color:#d32f2f;">💸 ${r.expenseCategory}</small>` : "";
          recordsList.innerHTML += `<li><div><strong>📅 ${r.date}</strong> ${catBadge}<br><small>Qty: ${r.quantity} | Exp: ${r.expenses}</small></div><div style="text-align:right"><strong>KES ${(r.quantity * r.price).toLocaleString()}</strong><br><button class="delete-btn" data-id="${r.id}">✕</button></div></li>`;
        });

        // Update Dashboard
        document.getElementById("totalQuantity").innerText = totalQty.toFixed(1);
        document.getElementById("totalProfit").innerText = (totalRev - totalExp).toLocaleString();
        
        // Show Expense Breakdown
        const breakdownDiv = document.getElementById("expenseBreakdown");
        if (Object.keys(categoryTotals).length > 0) {
          breakdownDiv.style.display = "block";
          for (const [cat, amt] of Object.entries(categoryTotals)) {
            const percentage = ((amt / totalExp) * 100).toFixed(0);
            breakdownList.innerHTML += `<div style="display:flex; justify-content:space-between; margin-bottom:4px;">
              <span>${cat}</span>
              <span>KES ${amt.toLocaleString()} (${percentage}%)</span>
            </div>`;
          }
        } else {
          breakdownDiv.style.display = "none";
        }

        // ... rest of the poultry stats and history rendering ...
      };
    };
  }
// ... rest of app.js ...
