let db;

// Open database
const request = indexedDB.open("FarmDB", 1);

// Create table
request.onupgradeneeded = event => {
  db = event.target.result;
  db.createObjectStore("records", { keyPath: "id", autoIncrement: true });
};

// Database ready
request.onsuccess = event => {
  db = event.target.result;
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
