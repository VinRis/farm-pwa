app.js
import { openDB, getMeta, setMeta, getAllRecords, addRecord, updateRecord, deleteRecord, getAllTransactions, addTransaction, updateTransaction, deleteTransaction, getSyncQueue, addToSyncQueue } from './db.js';
import { formatDate, exportCSV, exportJSON, importJSON, generatePDF } from './utils.js';
import sampleData from './sample-data.js';

let selectedLivestock = null;
let db = null;

async function initApp() {
  db = await openDB();
  const meta = await getMeta();
  if (!meta.selectedLivestock) {
    showModal();
  } else {
    selectedLivestock = meta.selectedLivestock;
    updateTitle();
    showBottomNav();
    loadDashboard();
  }
  preloadSampleData();
  if (new URLSearchParams(window.location.search).get('debug') === 'true') {
    runTests();
  }
  window.addEventListener('online', syncToCloud);
}

function showModal() {
  document.getElementById('modal').style.display = 'flex';
}

window.selectLivestock = async (type) => {
  selectedLivestock = type;
  await setMeta({ selectedLivestock: type });
  updateTitle();
  document.getElementById('modal').style.display = 'none';
  showBottomNav();
  loadDashboard();
};

function updateTitle() {
  const titles = {
    dairy: 'Dairy Production',
    poultry: 'Poultry Production',
    pig: 'Pig Production',
    goat: 'Goat Production'
  };
  document.getElementById('title').textContent = titles[selectedLivestock] || 'FarmTrack';
}

function showBottomNav() {
  document.getElementById('bottom-nav').style.display = 'flex';
  setupNavListeners();
}

function setupNavListeners() {
  document.getElementById('dashboard-btn').addEventListener('click', loadDashboard);
  document.getElementById('add-record-btn').addEventListener('click', loadAddRecord);
  document.getElementById('records-btn').addEventListener('click', loadRecords);
  document.getElementById('finance-btn').addEventListener('click', loadFinance);
  document.getElementById('reports-btn').addEventListener('click', loadReports);
}

async function preloadSampleData() {
  const records = await getAllRecords(selectedLivestock);
  if (records.length === 0) {
    for (const rec of sampleData.records[selectedLivestock] || []) {
      await addRecord(rec);
    }
  }
  const trans = await getAllTransactions(selectedLivestock);
  if (trans.length === 0) {
    for (const t of sampleData.transactions[selectedLivestock] || []) {
      await addTransaction(t);
    }
  }
}

async function loadDashboard() {
  const main = document.getElementById('main-content');
  main.innerHTML = '';
  const records = await getAllRecords(selectedLivestock);
  const trans = await getAllTransactions(selectedLivestock);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthRecords = records.filter(r => new Date(r.date) >= monthStart);
  const monthTrans = trans.filter(t => new Date(t.date) >= monthStart);

  // Calculate KPIs
  let totalProduction = 0;
  let totalFeed = 0;
  let mortality = 0;
  let births = 0;
  let uniqueAnimals = new Set(monthRecords.map(r => r.animalId || r.flockId || r.pigId || r.goatId)).size;
  monthRecords.forEach(r => {
    totalProduction += r.quantity || 0;
    totalFeed += r.feedKg || 0;
    mortality += r.mortality || 0;
    births += r.births || r.pigletsBorn || 0;
  });
  const daysInMonth = now.getDate();
  const avgPerDay = totalProduction / daysInMonth;
  const mortalityRate = (mortality / (uniqueAnimals || 1)) * 100;
  let income = monthTrans.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  let expenses = monthTrans.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  let netProfit = income - expenses;
  const projectedIncome = (income / daysInMonth) * new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  // Dashboard HTML
  const dashboard = document.createElement('div');
  dashboard.innerHTML = `
    <h2>Dashboard</h2>
    <p>Total Production this month: ${totalProduction.toFixed(2)} ${getUnit()}</p>
    <p>Avg per day: ${avgPerDay.toFixed(2)} ${getUnit()}</p>
    <p>Total Animals: ${uniqueAnimals}</p>
    <p>Mortality Rate: ${mortalityRate.toFixed(2)}%</p>
    <p>Feed Consumed: ${totalFeed.toFixed(2)} kg</p>
    <p>Income: $${income.toFixed(2)}</p>
    <p>Expenses: $${expenses.toFixed(2)}</p>
    <p>Net Profit: $${netProfit.toFixed(2)}</p>
    <p>Projected Income: $${projectedIncome.toFixed(2)}</p>
    <canvas id="trendChart"></canvas>
    <h3>Recent Records</h3>
    <ul>${monthRecords.slice(-3).map(r => `<li>${formatDate(r.date)}: ${r.quantity} ${getUnit()}</li>`).join('')}</ul>
  `;
  main.appendChild(dashboard);

  // Chart
  const last30Days = Array.from({length: 30}, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  }).reverse();
  const data = last30Days.map(d => {
    const dayRecs = records.filter(r => r.date === d);
    return dayRecs.reduce((sum, r) => sum + (r.quantity || 0), 0);
  });
  new Chart(document.getElementById('trendChart'), {
    type: 'line',
    data: { labels: last30Days, datasets: [{ label: 'Production', data }] }
  });
}

function getUnit() {
  const units = { dairy: 'L', poultry: 'eggs', pig: 'kg', goat: 'L/kg' };
  return units[selectedLivestock];
}

function loadAddRecord() {
  const main = document.getElementById('main-content');
  main.innerHTML = '';
  const form = document.createElement('form');
  form.innerHTML = getRecordFormHTML();
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = getFormData(form);
    data.id = crypto.randomUUID();
    data.livestock = selectedLivestock;
    data.createdAt = new Date().toISOString();
    data.updatedAt = data.createdAt;
    await addRecord(data);
    await addToSyncQueue({ action: 'create', type: 'record', data });
    if (data.isSale) {
      const trans = {
        id: crypto.randomUUID(),
        livestock: selectedLivestock,
        date: data.date,
        type: 'income',
        amount: data.saleAmount || 0,
        currency: 'USD',
        category: 'sale',
        description: 'Sale from record',
        relatedRecordId: data.id,
        createdAt: new Date().toISOString()
      };
      await addTransaction(trans);
      await addToSyncQueue({ action: 'create', type: 'transaction', data: trans });
    }
    loadDashboard();
  });
  main.appendChild(form);
}

function getRecordFormHTML() {
  let specificFields = '';
  switch (selectedLivestock) {
    case 'dairy':
      specificFields = `
        <label>Cow ID <input name="animalId" required></label>
        <label>Session <select name="session"><option>morning</option><option>evening</option></select></label>
        <label>Milk Liters <input name="quantity" type="number" required></label>
        <label>Fat % <input name="fatPct" type="number"></label>
        <label>Feed Kg <input name="feedKg" type="number"></label>
        <label>Weight Kg <input name="weightKg" type="number"></label>
        <label>Medication <input name="medication"></label>
      `;
      break;
    case 'poultry':
      specificFields = `
        <label>Flock ID <input name="animalId" required></label>
        <label>Eggs Collected <input name="quantity" type="number" required></label>
        <label>Birds Count <input name="birdsCount" type="number"></label>
        <label>Mortality <input name="mortality" type="number"></label>
        <label>Feed Kg <input name="feedKg" type="number"></label>
        <label>Vaccination <input name="medication"></label>
      `;
      break;
    case 'pig':
      specificFields = `
        <label>Pig ID <input name="animalId" required></label>
        <label>Weight Kg <input name="weightKg" type="number"></label>
        <label>Feed Kg <input name="feedKg" type="number"></label>
        <label>Piglets Born <input name="births" type="number"></label>
        <label>Mortality <input name="mortality" type="number"></label>
        <label>Sales Count <input name="salesCount" type="number"></label>
      `;
      break;
    case 'goat':
      specificFields = `
        <label>Goat ID <input name="animalId" required></label>
        <label>Milk Liters <input name="quantity" type="number"></label>
        <label>Weight Kg <input name="weightKg" type="number"></label>
        <label>Births <input name="births" type="number"></label>
        <label>Mortality <input name="mortality" type="number"></label>
        <label>Feed Kg <input name="feedKg" type="number"></label>
        <label>Medication <input name="medication"></label>
      `;
      break;
  }
  return `
    <h2>Add Record</h2>
    <label>Date <input name="date" type="date" required value="${new Date().toISOString().split('T')[0]}"></label>
    ${specificFields}
    <label>Health Notes <textarea name="healthNotes"></textarea></label>
    <label>Notes <textarea name="notes"></textarea></label>
    <label>Mark as Sale <input name="isSale" type="checkbox"></label>
    <label>Sale Amount <input name="saleAmount" type="number"></label>
    <button type="submit">Save</button>
  `;
}

function getFormData(form) {
  const data = {};
  new FormData(form).forEach((v, k) => data[k] = v);
  return data;
}

async function loadRecords() {
  const main = document.getElementById('main-content');
  main.innerHTML = `
    <h2>Records</h2>
    <input id="search" placeholder="Search">
    <select id="sort"><option value="desc">Latest</option><option value="asc">Oldest</option></select>
    <input id="month" type="month">
    <ul id="records-list"></ul>
    <button id="delete-selected">Delete Selected</button>
  `;
  const records = await getAllRecords(selectedLivestock);
  renderRecords(records);

  document.getElementById('search').addEventListener('input', filterRecords);
  document.getElementById('sort').addEventListener('change', filterRecords);
  document.getElementById('month').addEventListener('change', filterRecords);
  document.getElementById('delete-selected').addEventListener('click', deleteSelected);
}

function renderRecords(records) {
  const list = document.getElementById('records-list');
  list.innerHTML = records.map(r => `
    <li>
      <input type="checkbox" data-id="${r.id}">
      ${formatDate(r.date)}: ${r.quantity || 0} ${getUnit()} 
      <button onclick="editRecord('${r.id}')">Edit</button>
      <button onclick="deleteRecordSingle('${r.id}')">Delete</button>
    </li>
  `).join('');
}

async function filterRecords() {
  const search = document.getElementById('search').value.toLowerCase();
  const sort = document.getElementById('sort').value;
  const month = document.getElementById('month').value;
  let records = await getAllRecords(selectedLivestock);
  if (month) {
    const [year, m] = month.split('-');
    records = records.filter(r => {
      const d = new Date(r.date);
      return d.getFullYear() == year && d.getMonth() + 1 == m;
    });
  }
  if (search) {
    records = records.filter(r => JSON.stringify(r).toLowerCase().includes(search));
  }
  records.sort((a, b) => sort === 'desc' ? new Date(b.date) - new Date(a.date) : new Date(a.date) - new Date(b.date));
  renderRecords(records);
}

window.editRecord = async (id) => {
  const record = await getRecordById(id); // Assume implemented in db.js
  const main = document.getElementById('main-content');
  main.innerHTML = '';
  const form = document.createElement('form');
  form.innerHTML = getRecordFormHTML();
  Object.keys(record).forEach(k => {
    const input = form.querySelector(`[name="${k}"]`);
    if (input) input.value = record[k];
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = getFormData(form);
    data.id = id;
    data.updatedAt = new Date().toISOString();
    await updateRecord(data);
    await addToSyncQueue({ action: 'update', type: 'record', data });
    loadRecords();
  });
  main.appendChild(form);
};

window.deleteRecordSingle = async (id) => {
  if (confirm('Delete this record?')) {
    await deleteRecord(id);
    await addToSyncQueue({ action: 'delete', type: 'record', id });
    loadRecords();
  }
};

async function deleteSelected() {
  const checkboxes = document.querySelectorAll('#records-list input:checked');
  if (confirm(`Delete ${checkboxes.length} records?`)) {
    for (const cb of checkboxes) {
      const id = cb.dataset.id;
      await deleteRecord(id);
      await addToSyncQueue({ action: 'delete', type: 'record', id });
    }
    loadRecords();
  }
}

async function loadFinance() {
  const main = document.getElementById('main-content');
  main.innerHTML = `
    <h2>Finance</h2>
    <form id="trans-form">
      <label>Date <input name="date" type="date" required></label>
      <label>Type <select name="type"><option>income</option><option>expense</option></select></label>
      <label>Amount <input name="amount" type="number" required></label>
      <label>Currency <input name="currency" value="USD"></label>
      <label>Category <input name="category"></label>
      <label>Description <textarea name="description"></textarea></label>
      <button type="submit">Add Transaction</button>
    </form>
    <select id="filter"><option>day</option><option>week</option><option>month</option><option>custom</option></select>
    <input id="start-date" type="date" style="display:none;">
    <input id="end-date" type="date" style="display:none;">
    <ul id="trans-list"></ul>
    <button id="export-csv">Export CSV</button>
    <button id="delete-selected-trans">Delete Selected</button>
  `;
  const trans = await getAllTransactions(selectedLivestock);
  renderTransactions(trans);

  document.getElementById('trans-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = getFormData(e.target);
    data.id = crypto.randomUUID();
    data.livestock = selectedLivestock;
    data.createdAt = new Date().toISOString();
    await addTransaction(data);
    await addToSyncQueue({ action: 'create', type: 'transaction', data });
    loadFinance();
  });

  document.getElementById('filter').addEventListener('change', (e) => {
    const custom = e.target.value === 'custom';
    document.getElementById('start-date').style.display = custom ? 'block' : 'none';
    document.getElementById('end-date').style.display = custom ? 'block' : 'none';
    filterTransactions();
  });
  document.getElementById('start-date').addEventListener('change', filterTransactions);
  document.getElementById('end-date').addEventListener('change', filterTransactions);
  document.getElementById('export-csv').addEventListener('click', async () => {
    const trans = await getFilteredTransactions(); // Assume based on current filter
    exportCSV(trans, 'transactions.csv');
  });
  document.getElementById('delete-selected-trans').addEventListener('click', deleteSelectedTrans);
}

function renderTransactions(trans) {
  const list = document.getElementById('trans-list');
  list.innerHTML = trans.map(t => `
    <li>
      <input type="checkbox" data-id="${t.id}">
      ${formatDate(t.date)}: ${t.type} $${t.amount} - ${t.description}
      <button onclick="editTransaction('${t.id}')">Edit</button>
      <button onclick="deleteTransactionSingle('${t.id}')">Delete</button>
    </li>
  `).join('');
}

async function filterTransactions() {
  const filter = document.getElementById('filter').value;
  const start = new Date(document.getElementById('start-date').value);
  const end = new Date(document.getElementById('end-date').value);
  let trans = await getAllTransactions(selectedLivestock);
  const now = new Date();
  let startDate;
  switch (filter) {
    case 'day':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'week':
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'custom':
      if (!start || !end) return;
      trans = trans.filter(t => new Date(t.date) >= start && new Date(t.date) <= end);
      renderTransactions(trans);
      return;
  }
  trans = trans.filter(t => new Date(t.date) >= startDate);
  renderTransactions(trans);
}

window.editTransaction = async (id) => {
  const trans = await getTransactionById(id); // Assume in db.js
  const form = document.getElementById('trans-form');
  Object.keys(trans).forEach(k => {
    const input = form.querySelector(`[name="${k}"]`);
    if (input) input.value = trans[k];
  });
  form.onsubmit = async (e) => {
    e.preventDefault();
    const data = getFormData(form);
    data.id = id;
    await updateTransaction(data);
    await addToSyncQueue({ action: 'update', type: 'transaction', data });
    loadFinance();
  };
};

window.deleteTransactionSingle = async (id) => {
  if (confirm('Delete this transaction?')) {
    await deleteTransaction(id);
    await addToSyncQueue({ action: 'delete', type: 'transaction', id });
    loadFinance();
  }
};

async function deleteSelectedTrans() {
  const checkboxes = document.querySelectorAll('#trans-list input:checked');
  if (confirm(`Delete ${checkboxes.length} transactions?`)) {
    for (const cb of checkboxes) {
      const id = cb.dataset.id;
      await deleteTransaction(id);
      await addToSyncQueue({ action: 'delete', type: 'transaction', id });
    }
    loadFinance();
  }
}

async function loadReports() {
  const main = document.getElementById('main-content');
  main.innerHTML = `
    <h2>Reports</h2>
    <label>Start Date <input id="report-start" type="date"></label>
    <label>End Date <input id="report-end" type="date"></label>
    <button id="generate-pdf">Generate PDF</button>
    <button id="export-json">Export JSON Backup</button>
    <input id="import-json" type="file" accept=".json">
    <button onclick="document.getElementById('import-json').click()">Import JSON</button>
  `;
  document.getElementById('generate-pdf').addEventListener('click', async () => {
    const start = document.getElementById('report-start').value;
    const end = document.getElementById('report-end').value;
    const records = await getAllRecords(selectedLivestock, start, end); // Assume filtered
    const trans = await getAllTransactions(selectedLivestock, start, end);
    const meta = await getMeta();
    const content = generateReportContent(meta, records, trans); // Assume function in utils that returns HTML
    generatePDF(content, 'report.pdf');
  });
  document.getElementById('export-json').addEventListener('click', async () => {
    const data = {
      meta: await getMeta(),
      records: await getAllRecords(),
      transactions: await getAllTransactions(),
      syncQueue: await getSyncQueue()
    };
    exportJSON(data, 'backup.json');
  });
  document.getElementById('import-json').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const data = JSON.parse(ev.target.result);
      await importJSON(data);
      loadDashboard();
    };
    reader.readAsText(file);
  });
}

// Stub for sync
async function syncToCloud() {
  const queue = await getSyncQueue();
  if (queue.length === 0 || !navigator.onLine) return;
  // TODO: Implement real sync, e.g., to Firebase
  console.log('Syncing', queue);
  // Clear queue after sync
  await clearSyncQueue(); // Assume in db.js
}

async function runTests() {
  console.log('Running tests...');
  // Simple checks
  try {
    const meta = await getMeta();
    console.assert(meta, 'Meta exists');
    const records = await getAllRecords();
    console.assert(records.length > 0, 'Sample records loaded');
    console.log('Tests passed');
  } catch (e) {
    console.error('Tests failed', e);
  }
}

// Helper to get record/transaction by id, add in db.js
// Also add getAllRecords(filterStart, filterEnd) etc.

initApp();
