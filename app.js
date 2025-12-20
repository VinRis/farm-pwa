let db;

// Open database
const request = indexedDB.open("FarmDB", 1);

// Create table
request.onupgradeneeded = event => {
  db = event.target.result;
  db.createObjectStore("records", { keyPath: "id", autoIncrement: true });
  db.createObjectStore("settings", { keyPath: "key" });
  
function setFarmType(type) {
  const tx = db.transaction("settings", "readwrite");
  tx.objectStore("settings").put({ key: "farmType", value: type });

  tx.oncomplete = () => {
    showApp(type);
  };
}

function getFarmType() {
  const tx = db.transaction("settings", "readonly");
  const store = tx.objectStore("settings");
  const request = store.get("farmType");

  request.onsuccess = () => {
    if (request.result) {
      showApp(request.result.value);
    } else {
      document.getElementById("farmTypeScreen").style.display = "block";
    }
  };
}
};

// Database ready
request.onsuccess = event => {
  db = event.target.result;
  getFarmType();
  loadRecords();
};

// Save data
document.getElementById("farmForm").addEventListener("submit", e => {
  e.preventDefault();

  const record = {
    date: document.getElementById("date").value,
    quantity: document.getElementById("quantity").value,
    expenses: document.getElementById("expenses").value || 0
  };

  const tx = db.transaction("records", "readwrite");
  tx.objectStore("records").add(record);

  tx.oncomplete = () => {
    loadRecords();
    e.target.reset();
  };
});

// Load data
function loadRecords() {
  const tx = db.transaction("records", "readonly");
  const store = tx.objectStore("records");
  const request = store.getAll();

  request.onsuccess = () => {
    const list = document.getElementById("records");
    list.innerHTML = "";

    request.result.forEach(r => {
      list.innerHTML += `
        <li>
          📅 ${r.date}<br>
          🧺 Quantity: ${r.quantity}<br>
          💰 Expenses: KES ${r.expenses}
        </li>
      `;
    });
  };
}

// Register service worker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js");
}
function showApp(type) {
  document.getElementById("farmTypeScreen").style.display = "none";
  document.getElementById("appScreen").style.display = "block";

  const quantityLabel = document.querySelector("label[for='quantity']") || document.querySelectorAll("label")[1];

  if (type === "dairy") {
    quantityLabel.innerText = "Milk Collected (Litres)";
  } else if (type === "poultry") {
    quantityLabel.innerText = "Eggs Collected";
  } else if (type === "crops") {
    quantityLabel.innerText = "Harvest Quantity (Kg)";
  }
}
document.addEventListener("click", function (e) {
  if (e.target.matches("#farmTypeScreen button")) {
    const type = e.target.getAttribute("data-type");
    setFarmType(type);
  }
});
document.addEventListener("click", function (e) {
  if (e.target.matches("#farmTypeScreen button")) {
    const type = e.target.getAttribute("data-type");
    setFarmType(type);
  }
});






