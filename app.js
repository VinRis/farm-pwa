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

  /* =========================
      CLICK HANDLER
  ========================= */
  document.addEventListener("click", function (e) {
    const btn = e.target.closest("#farmTypeScreen button");
    if (btn) {
      const type = btn.dataset.type;
      setFarmType(type);
    }
  });

  /* =========================
      OPEN DATABASE
  ========================= */
  const request = indexedDB.open("FarmDB", 1);

  request.onupgradeneeded = (event) => {
    db = event.target.result;
    if (!db.objectStoreNames.contains("records")) {
      db.createObjectStore("records", { keyPath: "id", autoIncrement: true });
    }
    if (!db.objectStoreNames.contains("settings")) {
      db.createObjectStore("settings", { keyPath: "key" });
    }
  };

  request.onsuccess = (event) => {
    db = event.target.result;
    dbReady = true;
    getFarmType();
    loadRecords();
  };

  /* =========================
      FARM TYPE LOGIC
  ========================= */
  function setFarmType(type) {
    if (!dbReady) return alert("App loading...");
    const tx = db.transaction("settings", "readwrite");
    tx.objectStore("settings").put({ key: "farmType", value: type });
    tx.oncomplete = () => showApp(type);
  }

  function getFarmType() {
    const tx = db.transaction("settings", "readonly");
    const req = tx.objectStore("settings").get("farmType");
    req.onsuccess = () => {
      if (req.result) showApp(req.result.value);
      else farmTypeScreen.style.display = "block";
    };
  }

  function showApp(type) {
    farmTypeScreen.style.display = "none";
    appScreen.style.display = "block";
    if (qtyLabel) {
      if (type === "dairy") qtyLabel.innerText = "Milk Collected (Litres)";
      else if (type === "poultry") qtyLabel.innerText = "Eggs Collected";
      else if (type === "crops") qtyLabel.innerText = "Harvest Quantity (Kg)";
    }
  }

  /* =========================
      SAVE RECORDS
  ========================= */
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const record = {
      date: document.getElementById("date").value,
      quantity: Number(document.getElementById("quantity").value),
      price: Number(document.getElementById("price").value),
      expenses: Number(document.getElementById("expenses").value) || 0,
    };

    const tx = db.transaction("records", "readwrite");
    tx.objectStore("records").add(record);
    tx.oncomplete = () => {
      loadRecords();
      e.target.reset();
      document.getElementById("date").valueAsDate = new Date();
    };
  });

  function getMonthKey(dateStr) {
    return dateStr.substring(0, 7); 
  }

  /* =========================
      LOAD RECORDS
  ========================= */
  monthFilter.addEventListener("change", loadRecords);

  function loadRecords() {
    if (!db) return;
    const tx = db.transaction("records", "readonly");
    const req = tx.objectStore("records").getAll();

    req.onsuccess = () => {
      const allRecords = req.result;
      const selectedMonth = monthFilter.value;
      recordsList.innerHTML = "";

      let totalQty = 0;
      let totalExp = 0;
      let totalRevenue = 0;

      const existingMonthsInData = new Set();
      allRecords.forEach(r => existingMonthsInData.add(getMonthKey(r.date)));

      const currentOptions = Array.from(monthFilter.options).map(opt => opt.value);
      Array.from(existingMonthsInData).sort().reverse().forEach(m => {
        if (!currentOptions.includes(m)) {
          const opt = document.createElement("option");
          opt.value = m;
          opt.textContent = m;
          monthFilter.appendChild(opt);
        }
      });

      allRecords.sort((a, b) => new Date(b.date) - new Date(a.date));

      allRecords.forEach(r => {
        const recordMonth = getMonthKey(r.date);
        if (selectedMonth !== "all" && recordMonth !== selectedMonth) return;

        totalQty += r.quantity;
        totalExp += r.expenses;
        totalRevenue += (r.quantity * r.price);

        recordsList.innerHTML += `
          <li>
            <div>
              <strong>📅 ${r.date}</strong><br>
              <small>Qty: ${r.quantity} | Exp: ${r.expenses}</small>
            </div>
            <div style="text-align:right; display: flex; align-items: center; gap: 10px;">
              <strong>KES ${r.quantity * r.price}</strong>
              <button class="delete-btn" data-id="${r.id}" style="width: auto; margin: 0; padding: 5px 10px; background: #c62828;">✕</button>
            </div>
          </li>`;
      });

      document.getElementById("totalRecords").innerText = (selectedMonth === "all") ? allRecords.length : recordsList.children.length;
      document.getElementById("totalQuantity").innerText = totalQty;
      document.getElementById("totalExpenses").innerText = totalExp;
      document.getElementById("totalProfit").innerText = totalRevenue - totalExp;
    };
  }

  /* =========================
      DELETE RECORD
  ========================= */
  recordsList.addEventListener("click", (e) => {
    if (e.target.classList.contains("delete-btn")) {
      const id = Number(e.target.dataset.id);
      if (confirm("Delete this record?")) {
        const tx = db.transaction("records", "readwrite");
        tx.objectStore("records").delete(id);
        tx.oncomplete = () => loadRecords();
      }
    }
  });  

  /* =========================
      RESET APP
  ========================= */
  document.getElementById("resetBtn").addEventListener("click", () => {
    if (confirm("Are you sure? This will delete all records.")) {
      if (db) db.close();
      const req = indexedDB.deleteDatabase("FarmDB");
      req.onsuccess = () => window.location.reload();
    }
  });
  /* =========================
      EXPORT DATA TO CSV
  ========================= */
  document.getElementById("exportBtn").addEventListener("click", () => {
    const tx = db.transaction("records", "readonly");
    const req = tx.objectStore("records").getAll();

    req.onsuccess = () => {
      const records = req.result;
      if (records.length === 0) return alert("No records to export!");

      // 1. Define CSV Headers
      let csvContent = "Date,Quantity,Price per Unit,Expenses,Total Revenue,Estimated Profit\n";

      // 2. Add Rows
      records.forEach(r => {
        const revenue = r.quantity * r.price;
        const profit = revenue - r.expenses;
        const row = `${r.date},${r.quantity},${r.price},${r.expenses},${revenue},${profit}`;
        csvContent += row + "\n";
      });

      // 3. Create a downloadable link
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      
      link.setAttribute("href", url);
      link.setAttribute("download", `Farm_Records_${new Date().toISOString().slice(0,10)}.csv`);
      link.style.visibility = "hidden";
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };
  });
}); // End of DOMContentLoaded

