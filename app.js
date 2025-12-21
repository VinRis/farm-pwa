import { openDB, getAll, put } from './db.js';

let db;
let currentLivestock = null;
let historyStack = [];

const headerTitle = document.getElementById('headerTitle');
const backBtn = document.getElementById('backBtn');

await openDB().then(d => db = d);

// Navigation
document.querySelectorAll('.bottom-nav button').forEach(btn => {
  btn.onclick = () => navigate(btn.dataset.view);
});

backBtn.onclick = () => {
  historyStack.pop();
  const prev = historyStack.pop() || 'dashboard';
  navigate(prev, false);
};

function navigate(view, push = true) {
  if (push) historyStack.push(view);
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(`view-${view}`).classList.add('active');
  backBtn.classList.toggle('hidden', view === 'dashboard');
  render(view);
}

// Livestock selection
document.querySelectorAll('#selector button').forEach(btn => {
  btn.onclick = async () => {
    currentLivestock = btn.dataset.livestock;
    headerTitle.textContent = currentLivestock.toUpperCase();
    document.getElementById('selector').classList.remove('active');
    await put('meta', { key: 'livestock', value: currentLivestock });
    navigate('dashboard');
  };
});

async function render(view) {
  if (view === 'dashboard') renderDashboard();
  if (view === 'add') renderAdd();
  if (view === 'records') renderRecords();
  if (view === 'finance') renderFinance();
  if (view === 'reports') renderReports();
}

// DASHBOARD
async function renderDashboard() {
  const records = (await getAll('records')).filter(r => r.livestock === currentLivestock);
  const total = records.reduce((s, r) => s + (r.quantity || 0), 0);
  const feed = records.reduce((s, r) => s + (r.feedKg || 0), 0);

  const view = document.getElementById('view-dashboard');
  view.innerHTML = `
    <div class="kpi-grid">
      <div class="card kpi"><h3>Total Production</h3><p>${total}</p></div>
      <div class="card kpi"><h3>Records</h3><p>${records.length}</p></div>
      <div class="card kpi"><h3>Feed Used (kg)</h3><p>${feed}</p></div>
      <div class="card kpi"><h3>Mortality</h3><p>${records.reduce((s,r)=>s+(r.mortality||0),0)}</p></div>
    </div>
    <div class="card">
      <canvas id="trendChart"></canvas>
    </div>
  `;

  new Chart(document.getElementById('trendChart'), {
    type: 'line',
    data: {
      labels: records.map(r => r.date.slice(0,10)),
      datasets: [{
        label: 'Production',
        data: records.map(r => r.quantity || 0),
        borderWidth: 2
      }]
    }
  });
}

function renderAdd() {
  document.getElementById('view-add').innerHTML =
    `<div class="card"><h3>Add Record</h3><p>Form comes next ✔</p></div>`;
}

function renderRecords() {
  document.getElementById('view-records').innerHTML =
    `<div class="card"><h3>Records</h3><p>List view coming ✔</p></div>`;
}

function renderFinance() {
  document.getElementById('view-finance').innerHTML =
    `<div class="card"><h3>Finance</h3><p>Income & expenses ✔</p></div>`;
}

function renderReports() {
  document.getElementById('view-reports').innerHTML =
    `<div class="card"><h3>Reports</h3><p>PDF & CSV reports ✔</p></div>`;
}
