import { openDB, getAll, put } from './db.js';

let db;
let currentLivestock = null;
let navHistory = [];

const headerTitle = document.getElementById('headerTitle');
const backBtn = document.getElementById('backBtn');

await openDB().then(d => db = d);

/* ---------------- NAVIGATION ---------------- */

document.querySelectorAll('.bottom-nav button').forEach(btn => {
  btn.onclick = () => navigate(btn.dataset.view);
});

backBtn.onclick = () => {
  navHistory.pop();
  navigate(navHistory.pop() || 'dashboard', false);
};

function navigate(view, push = true) {
  if (push) navHistory.push(view);

  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(`view-${view}`).classList.add('active');

  document.querySelectorAll('.bottom-nav button').forEach(b =>
    b.classList.toggle('active', b.dataset.view === view)
  );

  backBtn.classList.toggle('hidden', view === 'dashboard');
  render(view);
}

/* ---------------- LIVESTOCK SELECT ---------------- */

document.querySelectorAll('#selector button').forEach(btn => {
  btn.onclick = async () => {
    currentLivestock = btn.dataset.livestock;
    headerTitle.textContent = currentLivestock.toUpperCase();
    document.getElementById('selector').classList.remove('active');
    await put('meta', { key: 'livestock', value: currentLivestock });
    navigate('dashboard');
  };
});

/* ---------------- RENDER ---------------- */

async function render(view) {
  if (view === 'dashboard') renderDashboard();
  if (view === 'add') renderSimple('Add Record', 'Create a new production record');
  if (view === 'records') renderSimple('Records', 'View & edit saved records');
  if (view === 'finance') renderSimple('Finance', 'Income and expenses');
  if (view === 'reports') renderSimple('Reports', 'Generate PDF & CSV reports');
}

/* ---------------- DASHBOARD ---------------- */

async function renderDashboard() {
  const records = (await getAll('records')).filter(r => r.livestock === currentLivestock);

  const total = records.reduce((s,r)=>s+(r.quantity||0),0);
  const feed = records.reduce((s,r)=>s+(r.feedKg||0),0);
  const mortality = records.reduce((s,r)=>s+(r.mortality||0),0);

  const view = document.getElementById('view-dashboard');
  view.innerHTML = `
    <div class="kpi-grid">
      <div class="card kpi"><h3>Total Production</h3><p>${total}</p></div>
      <div class="card kpi"><h3>Records</h3><p>${records.length}</p></div>
      <div class="card kpi"><h3>Feed Used (kg)</h3><p>${feed}</p></div>
      <div class="card kpi"><h3>Mortality</h3><p>${mortality}</p></div>
    </div>

    <div class="card">
      <canvas id="trendChart" height="180"></canvas>
    </div>
  `;

  new Chart(document.getElementById('trendChart'), {
    type: 'line',
    data: {
      labels: records.map(r => r.date.slice(0,10)),
      datasets: [{
        label: 'Production',
        data: records.map(r => r.quantity || 0),
        borderWidth: 2,
        tension: .3
      }]
    },
    options: {
      plugins: { legend: { display: false } }
    }
  });
}

/* ---------------- SIMPLE PAGES ---------------- */

function renderSimple(title, text) {
  const id = `view-${title.toLowerCase()}`;
  const view = document.querySelector('.view.active');
  view.innerHTML = `
    <div class="card">
      <h3>${title}</h3>
      <p>${text}</p>
    </div>
  `;
}
