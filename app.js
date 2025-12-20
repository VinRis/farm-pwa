if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js")
    .then(() => console.log("Service Worker Registered"))
    .catch(err => console.log("SW Registration Failed: ", err));
}
document.addEventListener("DOMContentLoaded", () => {
  let db;
  let dbReady = false;

  // Cache DOM elements for performance and reliability
  const farmTypeScreen = document.getElementById("farmTypeScreen");
  const appScreen = document.getElementById("appScreen");
  const form = document.getElementById("farmForm");
  const recordsList = document.getElementById("records");
  const monthFilter = document.getElementById("monthFilter");

  // Specific Labels (Assumes you add IDs to your HTML, see below)
  // If you can't change HTML, keep your querySelectorAll, but IDs are safer.
  const dynamicLabel = document.querySelector("label[for='quantity']"); 

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

  request.onerror = (event) => {
    console.error("Database error:", event.target.errorCode);
  };

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
      if (req.result) {
        showApp(req.result.value);
      } else {
        farmTypeScreen.style.display = "block";
      }
    };
  }

  /* =========================
      SHOW APP SCREEN
  ========================= */
function showApp(type) {
    document.getElementById("farmTypeScreen").style.display = "none";
    document.getElementById("appScreen").style.display = "block";

    // UPDATED: Select by ID
    const qtyLabel = document.getElementById("qtyLabel");

    if (type === "dairy") qtyLabel.innerText = "Milk Collected (Litres)";
    if (type === "poultry") qtyLabel.innerText = "Eggs Collected";
    if (type === "crops") qtyLabel.innerText = "Harvest Quantity (Kg)";
  }

  /* =========================
      SAVE RECORDS
  ========================= */
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    // BUG FIX: Explicitly get values from the form elements
    const dateVal = document.getElementById("date").value;
    const qtyVal = document.getElementById("quantity").value;
    const priceVal = document.getElementById("price").value;
    const expVal = document.getElementById("expenses").value;

    const record = {
      date: dateVal,
      quantity: Number(qtyVal), // Ensure numbers are stored as numbers
      price: Number(priceVal),
      expenses: Number(expVal) || 0,
    };

    const tx = db.transaction("records", "readwrite");
    tx.objectStore("records").add(record);

    tx.oncomplete = () => {
      loadRecords();
      e.target.reset();
      // Optional: Set date back to today after reset
      document.getElementById("date").valueAsDate = new Date();
    };
  });

  function getMonthKey(dateStr) {
    const d = new Date(dateStr);
    // Fix: Ensure valid date before parsing
    if (isNaN(d)) return "Unknown";
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }

  /* =========================
      LOAD RECORDS
  ========================= */
  // BUG FIX: Event listener moved OUTSIDE the function
  monthFilter.addEventListener("change", loadRecords);

  function loadRecords() {
    const tx = db.transaction("records", "readonly");
    const req = tx.objectStore("records").getAll();

    req.onsuccess = () => {
      const allRecords = req.result;
      const selectedMonth = monthFilter.value;
      
      // Clear list
      recordsList.innerHTML = "";

      let totalQty = 0;
      let totalExp = 0;
      let totalRevenue = 0;
      let filteredCount = 0; // Track count of filtered items

      const months = new Set();

      // 1. Collect all available months first
      allRecords.forEach(r => {
          months.add(getMonthKey(r.date));
      });

      // 2. Handle Dropdown (Only rebuild if empty to prevent resetting selection)
      // If the dropdown has only 1 child (the "All" option), populate it.
      if (monthFilter.children.length <= 1) {
          [...months].sort().reverse().forEach((m) => {
            // Check if option already exists to avoid duplicates if logic changes
            if (!monthFilter.querySelector(`option[value="${m}"]`)) {
                const opt = document.createElement("option");
                opt.value = m;
                opt.textContent = m;
                monthFilter.appendChild(opt);
            }
          });
      }

      // 3. Process and Display Records
      // Sort records by date descending (newest first)
      allRecords.sort((a, b) => new Date(b.date) - new Date(a.date));

      allRecords.forEach((r) => {
        const recordMonth = getMonthKey(r.date);

        if (selectedMonth !== "all" && recordMonth !== selectedMonth) return;

        filteredCount++;
        totalQty += Number(r.quantity);
        totalExp += Number(r.expenses);
        totalRevenue += Number(r.quantity) * Number(r.price);

        recordsList.innerHTML += `
          <li>
             <strong>📅 ${r.date}</strong><br>
             🧺 Qty: ${r.quantity} | 
             💰 Exp: ${r.expenses}
          </li>
        `;
      });

      // Dashboard updates
      // BUG FIX: Show count of displayed records, not database total
      document.getElementById("totalRecords").innerText = filteredCount; 
      document.getElementById("totalQuantity").innerText = totalQty;
      document.getElementById("totalExpenses").innerText = totalExp;
      document.getElementById("totalProfit").innerText = totalRevenue - totalExp;
    };
  }
});
/* =========================
      RESET APP (Delete DB)
  ========================= */
  document.getElementById("resetBtn").addEventListener("click", () => {
    if (confirm("Are you sure? This will delete all records.")) {
      // Close the current connection first
      if (db) db.close();
      
      const req = indexedDB.deleteDatabase("FarmDB");
      
      req.onsuccess = () => {
        console.log("Database deleted");
        window.location.reload();
      };
      
      req.onerror = () => {
        alert("Could not delete database.");
      };
      
      req.onblocked = () => {
        // If the database is open in another tab, this might happen
        window.location.reload();
      };
    }
  });


