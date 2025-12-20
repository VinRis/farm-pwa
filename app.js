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
  // Instead of creating a Date object, just slice the YYYY-MM part of the string
  // If dateStr is "2023-11-25", this returns "2023-11"
  return dateStr.substring(0, 7); 
}

  /* =========================
      LOAD RECORDS
  ========================= */
function loadRecords() {
  const tx = db.transaction("records", "readonly");
  const store = tx.objectStore("records");
  const req = store.getAll();

  req.onsuccess = () => {
    const allRecords = req.result;
    const list = document.getElementById("records");
    const monthFilter = document.getElementById("monthFilter");
    const selectedMonth = monthFilter.value;

  list.innerHTML += `
        <li>
          <div>
            <strong>📅 ${r.date}</strong><br>
            <small>Qty: ${r.quantity} | Exp: ${r.expenses}</small>
          </div>
          <div style="text-align:right; display: flex; align-items: center; gap: 10px;">
            <strong>KES ${Number(r.quantity) * Number(r.price)}</strong>
            <button class="delete-btn" data-id="${r.id}" style="width: auto; margin: 0; padding: 5px 10px; background: #c62828;">✕</button>
          </div>
        </li>
      `;

    // 1. Get all unique months from the data
    const existingMonthsInData = new Set();
    allRecords.forEach(r => {
      existingMonthsInData.add(getMonthKey(r.date));
    });

    // 2. Update the Dropdown Menu
    // Get currently existing options in the dropdown to avoid duplicates
    const currentOptions = Array.from(monthFilter.options).map(opt => opt.value);

    // Sort months newest to oldest
    const sortedMonths = Array.from(existingMonthsInData).sort().reverse();

    sortedMonths.forEach(m => {
      if (!currentOptions.includes(m)) {
        const opt = document.createElement("option");
        opt.value = m;
        opt.textContent = m;
        monthFilter.appendChild(opt);
      }
    });

    // 3. Filter and Display
    allRecords.sort((a, b) => new Date(b.date) - new Date(a.date));

    allRecords.forEach(r => {
      const recordMonth = getMonthKey(r.date);

      if (selectedMonth !== "all" && recordMonth !== selectedMonth) return;

      totalQty += Number(r.quantity);
      totalExp += Number(r.expenses);
      totalRevenue += Number(r.quantity) * Number(r.price);

      list.innerHTML += `
        <li>
          <div>
            <strong>📅 ${r.date}</strong><br>
            <small>Qty: ${r.quantity} | Exp: ${r.expenses}</small>
          </div>
          <div style="text-align:right">
            <strong>KES ${Number(r.quantity) * Number(r.price)}</strong>
          </div>
        </li>
      `;
    });

    // Dashboard updates
    document.getElementById("totalRecords").innerText = (selectedMonth === "all") ? allRecords.length : list.children.length;
    document.getElementById("totalQuantity").innerText = totalQty;
    document.getElementById("totalExpenses").innerText = totalExp;
    document.getElementById("totalProfit").innerText = totalRevenue - totalExp;
  };
}
/* =========================
      DELETE RECORD
  ========================= */
  document.getElementById("records").addEventListener("click", (e) => {
    if (e.target.classList.contains("delete-btn")) {
      const id = Number(e.target.dataset.id);
      if (confirm("Delete this record?")) {
        const tx = db.transaction("records", "readwrite");
        tx.objectStore("records").delete(id);
        tx.oncomplete = () => {
          loadRecords(); // Refresh the list and dashboard
        };
      }
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





