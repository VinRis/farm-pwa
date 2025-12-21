// app.js
import { openDB, getAll, put, get } from './db.js';
import { uuid, exportCSV, exportPDF } from './utils.js';

let currentLivestock = null;
let db;

const headerTitle = document.getElementById('headerTitle');
const selector = document.getElementById('selector');

openDB().then(d => db = d);

document.querySelectorAll('#selector button').forEach(btn => {
  btn.onclick = async () => {
    currentLivestock = btn.dataset.livestock;
    headerTitle.textContent = currentLivestock.toUpperCase();
    selector.classList.remove('active');
    await put('meta', { key: 'livestock', value: currentLivestock });
    renderDashboard();
  };
});

document.querySelectorAll('#bottom-nav button').forEach(btn => {
  btn.onclick = () => showView(btn.dataset.view);
});

function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(`view-${name}`).classList.add('active');
}

async function renderDashboard() {
  const view = document.getElementById('view-dashboard');
  const records = (await getAll('records')).filter(r => r.livestock === currentLivestock);
  const total = records.reduce((s,r)=>s+(r.quantity||0),0);
  view.innerHTML = `
    <div class="card"><h3>Total production</h3><p>${total}</p></div>
    <canvas id="trend"></canvas>
  `;
  const ctx = document.getElementById('trend');
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: records.map(r=>r.date.slice(0,10)),
      datasets: [{ data: records.map(r=>r.quantity) }]
    }
  });
}

window.addEventListener('online', syncToCloud);
export function syncToCloud() {
  // optional stub
}
