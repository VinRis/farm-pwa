import { openDB, getAll, put, del } from './db.js';
import { uuid } from './utils.js';

let db;
let currentLivestock = null;
let navHistory = [];

const headerTitle = document.getElementById('headerTitle');
const backBtn = document.getElementById('backBtn');

await openDB().then(d => db = d);

/* ================= NAVIGATION ================= */

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

/* ================= LIVESTOCK SELECT ================= */

document.querySelectorAll('#selector button').forEach(btn => {
  btn.onclick = async () => {
    currentLivestock = btn.dataset.livestock;
    headerTitle.textContent = currentLivestock.toUpperCase();
    document.getElementById('selector').classList.remove('active');
    await put('meta', { key: 'livestock', value: currentLivestock });
    navigate('dashboard');
  };
});

/* ================= RENDER ================= */

async function render(view) {
  if (view === 'dashboard') renderDashboard();
  if (view === 'add') renderAddForm();
  if (view === 'records') renderRecords();
  if (view === 'finance') renderFinance();
  if (view === 'reports') renderSimple('Reports', 'PDF & CSV reports coming next');
}

/* ================= DASHBOARD ================= */

async function renderDashboard() {
  const records = (await getAll('records')).filter(r => r.livestock === currentLivestock);
  const transactions = (await getAll('transactions')).filter(t => t.livestock === currentLivestock);

  const totalProduction = records.reduce((s,r)=>s+(r.quantity||0),0);
  const feed = records.reduce((s,r)=>s+(r.feedKg||0),0);
  const mortality = records.reduce((s,r)=>s+(r.mortality||0),0);

  const income = transactions.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  const expenses = transactions.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
  const profit = income - expenses;

  const view = document.getElementById('view-dashboard');
  view.innerHTML = `
    <div class="kpi-grid">
      <div class="card kpi"><h3>Total Production</h3><p>${totalProduction}</p></div>
      <div class="card kpi"><h3>Feed Used (kg)</h3><p>${feed}</p></div>
      <div class="card kpi"><h3>Mortality</h3><p>${mortality}</p></div>
      <div class="card kpi"><h3>Net Profit</h3><p>KES ${profit}</p></div>
    </div>

    <div class="card">
      <canvas id="trendChart" height="180"></canvas>
    </div>
  `;

  new Chart(document.getElementById('trendChart'), {
    type: 'line',
    data: {
      labels: records.map(r=>r.date.slice(0,10)),
      datasets: [{
        label: 'Production',
        data: records.map(r=>r.quantity||0),
        borderWidth: 2,
        tension: .3
      }]
    },
    options: { plugins:{legend:{display:false}} }
  });
}

/* ================= ADD RECORD ================= */

function renderAddForm() {
  const view = document.getElementById('view-add');

  view.innerHTML = `
    <div class="card">
      <h3>Add ${currentLivestock.toUpperCase()} Record</h3>

      <input type="date" id="date" required />
      <input placeholder="Animal / Flock ID" id="animalId" />

      <input type="number" placeholder="Quantity" id="quantity" />
      <input type="number" placeholder="Feed (kg)" id="feedKg" />
      <input type="number" placeholder="Mortality" id="mortality" />

      <label>
        <input type="checkbox" id="isSale" /> Mark as sale
      </label>
      <input type="number" placeholder="Sale Amount (KES)" id="saleAmount" />

      <button id="saveRecord">Save Record</button>
    </div>
  `;

  document.getElementById('saveRecord').onclick = async () => {
    const record = {
      id: uuid(),
      livestock: currentLivestock,
      date: document.getElementById('date').value,
      animalId: document.getElementById('animalId').value,
      quantity: Number(document.getElementById('quantity').value || 0),
      feedKg: Number(document.getElementById('feedKg').value || 0),
      mortality: Number(document.getElementById('mortality').value || 0),
      createdAt: Date.now()
    };

    await put('records', record);

    if (document.getElementById('isSale').checked) {
      await put('transactions', {
        id: uuid(),
        livestock: currentLivestock,
        type: 'income',
        amount: Number(document.getElementById('saleAmount').value || 0),
        date: record.date,
        description: 'Sale from production',
        createdAt: Date.now()
      });
    }

    navigate('dashboard');
  };
}

/* ================= RECORDS ================= */

async function renderRecords() {
  const records = (await getAll('records')).filter(r=>r.livestock===currentLivestock);
  const view = document.getElementById('view-records');

  view.innerHTML = records.map(r=>`
    <div class="card">
      <strong>${r.date}</strong><br/>
      Qty: ${r.quantity} | Feed: ${r.feedKg}kg | Mortality: ${r.mortality}
      <br/>
      <button data-id="${r.id}" class="delete">Delete</button>
    </div>
  `).join('');

  view.querySelectorAll('.delete').forEach(btn=>{
    btn.onclick = async () => {
      if(confirm('Delete record?')) {
        await del('records', btn.dataset.id);
        renderRecords();
      }
    };
  });
}

/* ================= FINANCE ================= */

async function renderFinance() {
  const txs = (await getAll('transactions')).filter(t=>t.livestock===currentLivestock);
  const view = document.getElementById('view-finance');

  view.innerHTML = `
    <div class="card">
      <h3>Add Transaction</h3>
      <select id="type">
        <option value="income">Income</option>
        <option value="expense">Expense</option>
      </select>
      <input type="number" placeholder="Amount" id="amount" />
      <input type="date" id="date" />
      <button id="addTx">Save</button>
    </div>

    ${txs.map(t=>`
      <div class="card">
        ${t.type.toUpperCase()} – KES ${t.amount} (${t.date})
      </div>
    `).join('')}
  `;

  document.getElementById('addTx').onclick = async () => {
    await put('transactions', {
      id: uuid(),
      livestock: currentLivestock,
      type: document.getElementById('type').value,
      amount: Number(document.getElementById('amount').value),
      date: document.getElementById('date').value,
      createdAt: Date.now()
    });
    renderFinance();
  };
}

/* ================= SIMPLE ================= */

function renderSimple(title, text) {
  document.querySelector('.view.active').innerHTML = `
    <div class="card">
      <h3>${title}</h3>
      <p>${text}</p>
    </div>
  `;
}
