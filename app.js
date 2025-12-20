document.addEventListener("DOMContentLoaded", () => {

  let db;
  let dbReady = false;

  /* =========================
     CLICK HANDLER
  ========================= */
  document.addEventListener("click", function (e) {
    if (e.target.matches("#farmTypeScreen button")) {
      const type = e.target.dataset.type;
      setFarmType(type);
    }
  });

  /* =========================
     OPEN DATABASE
  ========================= */
  const request = indexedDB.open("FarmDB", 1);

  request.onupgradeneeded = event => {
    db = event.target.result;

    if (!db.objectStoreNames.contains("records")) {
      db.createObjectStore("records", { keyPath: "id", autoIncrement: true });
    }

    if (!db.objectStoreNames.contains("settings")) {
      db.createObjectStore("settings", { keyPath: "key" });
    }
  };

  request.onsuccess = event => {
    db = event.target.result;
    dbReady = true;
    getFarmType();
    loadRecords();
  };

  /* =========================
     FARM TYPE LOGIC
  ========================= */
  function setFarmType(type) {
    if (!dbReady) {
      alert("App loading, please wait...");
      return;
    }

    const tx = db.transaction("settings", "readwrite");
    tx.objectStore("settings").put({ key: "farmType", value: type });

    tx.oncomplete = () => showApp(type);
  }

  function getFarmType() {
    const tx = db.transaction("settings", "readonly");
    const store = tx.objectStore("settings");
    const req = store.get("farmType");

    req.onsuccess = () => {
      if (req.result) {
        showApp(req.result.value);
      } else {
        document.getElementById("farmTypeScreen").style.display = "block";
      }
    };
  }

  /* =========================
     SHOW APP SCREEN
  ========================= */
  function showApp(type) {
    document.getElementById("farmTypeScreen").style.display = "none";
    document.getElementById("appScreen").style.display = "block";

    const labels = document.querySelectorAll("label");

    if (type === "dairy") labels[1].innerText = "Milk Collected (Litres)";
    if (type === "poultry") labels[1].innerText = "Eggs Collected";
    if (type === "crops") labels[1].innerText = "Harvest Quantity (Kg)";
  }

  /* =========================
     SAVE RECORDS
  ========================= */
  document.getElementById("farmForm").addEventListener("submit", e => {
    e.preventDefault();

    const record = {
      date: date.value,
      quantity: quantity.value,
      price: price.value,
      expenses: expenses.value || 0
    };

    const tx = db.transaction("records", "readwrite");
    tx.objectStore("records").add(record);

    tx.oncomplete = () => {
      loadRecords();
      e.target.reset();
    };
  });

function getMonthKey(dateStr) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
  
  /* =========================
     LOAD RECORDS
  ========================= */
function loadRecords() {
  const tx = db.transaction("records", "readonly");
  const store = tx.objectStore("records");
  const req = store.getAll();

  req.onsuccess = () => {
    const list = document.getElementById("records");
    const monthFilter = document.getElementById("monthFilter");
    const selectedMonth = monthFilter.value;

    list.innerHTML = "";

    let totalQty = 0;
    let totalExp = 0;
    let totalRevenue = 0;

    const months = new Set();

    req.result.forEach(r => {
      const recordMonth = getMonthKey(r.date);
      months.add(recordMonth);

      if (selectedMonth !== "all" && recordMonth !== selectedMonth) return;

      totalQty += Number(r.quantity);
      totalExp += Number(r.expenses);
      totalRevenue += Number(r.quantity) * Number(r.price);

      list.innerHTML += `
        <li>
          📅 ${r.date}<br>
          🧺 Quantity: ${r.quantity}<br>
          💰 Expenses: KES ${r.expenses}
        </li>
      `;
    });

    // Populate month dropdown
    monthFilter.innerHTML = `<option value="all">All Time</option>`;
    [...months].sort().reverse().forEach(m => {
      const opt = document.createElement("option");
      opt.value = m;
      opt.textContent = m;
      monthFilter.appendChild(opt);
    });

    // Dashboard updates
    document.getElementById("totalRecords").innerText = req.result.length;
    document.getElementById("totalQuantity").innerText = totalQty;
    document.getElementById("totalExpenses").innerText = totalExp;
    document.getElementById("totalProfit").innerText =
      totalRevenue - totalExp;
  };
  document.getElementById("monthFilter").addEventListener("change", loadRecords);
}









