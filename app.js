if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js")
    .then(() => console.log("Service Worker Registered"))
    .catch(err => console.log("SW Registration Failed: ", err));
}

document.addEventListener("DOMContentLoaded", () => {
  let db;
  let dbReady = false;

  const farmTypeScreen = document.getElementById("farmTypeScreen");
  const appScreen = document.getElementById("appScreen");
  const form = document.getElementById("farmForm");
  const recordsList = document.getElementById("records");
  const monthFilter = document.getElementById("monthFilter");
  const qtyLabel = document.getElementById("qtyLabel");

  document.addEventListener("click", (e) => {
    const btn = e.target.closest("#farmTypeScreen button");
    if (btn) setFarmType(btn.dataset.type);
  });

  const request = indexedDB.open("FarmDB", 1);
  request.onupgradeneeded = (e) => {
    db = e.target.result;
    if (!db.objectStoreNames.contains("records")) db.createObjectStore("records", { keyPath: "id", autoIncrement: true });
    if (!db.objectStoreNames.contains("settings")) db.createObjectStore("settings", { keyPath: "key" });
  };

  request.onsuccess = (e) => {
    db = e.target.result;
    dbReady = true;
    getFarmType();
  };

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
    if (type === "dairy") qtyLabel.innerText = "Milk Collected (Litres)";
    else if (type === "poultry") qtyLabel.innerText = "Eggs Collected";
    else if (type === "crops") qtyLabel.innerText = "Harvest Quantity (Kg)";
  }

  function getMonthKey(dateStr) { return dateStr.substring(0, 7); }

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
        expenses: Number(document.getElementById("expenses").value) || 0
      };
      const tx = db.transaction("records", "readwrite");
      tx.objectStore("records").add(record);
      tx.oncomplete = () => {
        loadRecords();
        form.reset();
      };
    };
  });

  function loadRecords() {
    if (!db) return;
    const tx = db.transaction(["records", "settings"], "readonly");
    const recordStore = tx.objectStore("records");
    const settingsStore = tx.objectStore("settings");

    settingsStore.get("farmType").onsuccess = (e) => {
      const currentType = e.target.result.value;
      recordStore.getAll().onsuccess = (ev) => {
        const allRecords = ev.target.result;
        const selectedMonth = monthFilter.value;
        recordsList.innerHTML = "";

        let [totalQty, totalExp, totalRevenue] = [0, 0, 0];
        const months = new Set();

        // Sort records newest first
        allRecords.sort((a, b) => new Date(b.date) - new Date(a.date));

        allRecords.forEach(r => {
          if (r.type !== currentType) return;
          const mKey = getMonthKey(r.date);
          months.add(mKey);

          if (selectedMonth !== "all" && mKey !== selectedMonth) return;

          totalQty += r.quantity;
          totalExp += r.expenses;
          totalRevenue += (r.quantity * r.price);

          recordsList.innerHTML += `
            <li>
              <div><strong>📅 ${r.date}</strong><br><small>Qty: ${r.quantity} | Exp: ${r.expenses}</small></div>
              <div style="text-align:right">
                <strong>KES ${r.quantity * r.price}</strong><br>
                <button class="delete-btn" data-id="${r.id}">✕</button>
              </div>
            </li>`;
        });

        // Update Dropdown
        const currentOpts = Array.from(monthFilter.options).map(o => o.value);
        Array.from(months).sort().reverse().forEach(m => {
          if (!currentOpts.includes(m)) {
            const opt = new Option(m, m);
            monthFilter.add(opt);
          }
        });

        document.getElementById("totalRecords").innerText = recordsList.children.length;
        document.getElementById("totalQuantity").innerText = totalQty.toFixed(1);
        document.getElementById("totalExpenses").innerText = totalExp.toLocaleString();
        document.getElementById("totalProfit").innerText = (totalRevenue - totalExp).toLocaleString();
      };
    };
  }

  monthFilter.addEventListener("change", loadRecords);

  recordsList.addEventListener("click", (e) => {
    if (e.target.classList.contains("delete-btn")) {
      if (confirm("Delete record?")) {
        const tx = db.transaction("records", "readwrite");
        tx.objectStore("records").delete(Number(e.target.dataset.id));
        tx.oncomplete = loadRecords;
      }
    }
  });

  document.getElementById("resetBtn").addEventListener("click", () => {
    if (confirm("Wipe all data?")) {
      db.close();
      indexedDB.deleteDatabase("FarmDB").onsuccess = () => window.location.reload();
    }
  });

  document.getElementById("switchTypeBtn").addEventListener("click", () => {
    farmTypeScreen.style.display = "block";
    appScreen.style.display = "none";
  });

  document.getElementById("exportBtn").addEventListener("click", () => {
    const tx = db.transaction("records", "readonly");
    tx.objectStore("records").getAll().onsuccess = (e) => {
      const recs = e.target.result;
      if (!recs.length) return alert("No data");
      let csv = "Type,Date,Quantity,Price,Expenses,Revenue\n";
      recs.forEach(r => csv += `${r.type},${r.date},${r.quantity},${r.price},${r.expenses},${r.quantity*r.price}\n`);
      const blob = new Blob([csv], { type: "text/csv" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "farm_records.csv";
      a.click();
    };
  });
});
