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

  // Create Archive Button dynamically
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
        archived: false, // Default to false
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
        showToast("Record Saved Successfully! ✅");
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
        let [totalQty, totalExp, totalRev] = [0, 0, 0];
        let pStats = { mortality: 0, feed: 0, eggs: 0, size: 0, weightSum: 0, weightCount: 0 };
        const months = new Set();

        // Only chart non-archived records
        const activeRecords = allRecords.filter(r => !r.archived);
        updateChart(activeRecords, currentType);

        allRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        allRecords.forEach(r => {
          if (r.type !== currentType) return;
          if (currentType === "poultry" && r.subtype !== activePoultrySub) return;
          if (r.archived) return; // Hide archived records from current dashboard

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
    if (confirm(`Are you sure you want to close the current ${sub} batch?`)) {
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
      tx.oncomplete = () => {
        loadRecords();
        showToast(`${sub} Batch Archived!`);
      };
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
