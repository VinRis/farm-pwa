let editingRecordId = null;
let activeFilter = 'month';

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
  <div class="filters">
    <button onclick="setFilter('today')">Today</button>
    <button onclick="setFilter('week')">7 Days</button>
    <button onclick="setFilter('month')">Month</button>
    <button onclick="setFilter('all')">All</button>
  </div>
  window.setFilter = f => {
    activeFilter = f;
    renderDashboard();
  };
}

/* ================= ADD RECORD ================= */

function renderAddForm(record = null) {
  const isEdit = !!record;
  editingRecordId = record?.id || null;

  const view = document.getElementById('view-add');

  let fields = '';

  if (currentLivestock === 'dairy') {
    fields = `
      <input id="quantity" type="number" placeholder="Milk (litres)" value="${record?.quantity || ''}">
      <input id="cows" type="number" placeholder="Cows milked" value="${record?.cows || ''}">
      <input id="feedKg" type="number" placeholder="Feed (kg)" value="${record?.feedKg || ''}">
    `;
  }

  if (currentLivestock === 'poultry') {
    fields = `
      <input id="quantity" type="number" placeholder="Eggs collected" value="${record?.quantity || ''}">
      <input id="mortality" type="number" placeholder="Mortality" value="${record?.mortality || ''}">
      <input id="feedKg" type="number" placeholder="Feed (kg)" value="${record?.feedKg || ''}">
    `;
  }

  if (currentLivestock === 'pig') {
    fields = `
      <input id="quantity" type="number" placeholder="Weight gain (kg)" value="${record?.quantity || ''}">
      <input id="feedKg" type="number" placeholder="Feed (kg)" value="${record?.feedKg || ''}">
      <input id="mortality" type="number" placeholder="Mortality" value="${record?.mortality || ''}">
    `;
  }

  if (currentLivestock === 'goat') {
    fields = `
      <input id="quantity" type="number" placeholder="Milk / Weight" value="${record?.quantity || ''}">
      <input id="feedKg" type="number" placeholder="Feed (kg)" value="${record?.feedKg || ''}">
    `;
  }

  view.innerHTML = `
    <div class="card">
      <h3>${isEdit ? 'Edit' : 'Add'} ${currentLivestock.toUpperCase()} Record</h3>
      <input id="date" type="date" value="${record?.date || ''}">
      ${fields}
      <textarea id="notes" placeholder="Notes">${record?.notes || ''}</textarea>
      <button id="saveRecord">${isEdit ? 'Update' : 'Save'}</button>
    </div>
  `;

  document.getElementById('saveRecord').onclick = async () => {
    const data = {
      id: editingRecordId || crypto.randomUUID(),
      livestock: currentLivestock,
      date: date.value,
      quantity: Number(quantity?.value || 0),
      cows: Number(cows?.value || 0),
      feedKg: Number(feedKg?.value || 0),
      mortality: Number(mortality?.value || 0),
      notes: notes.value,
      createdAt: Date.now()
    };

    await put('records', data);
    editingRecordId = null;
    navigate('dashboard');
  };
}


/* ================= RECORDS ================= */

async function renderRecords() {
  const records = filterByDate(
    (await getAll('records')).filter(r => r.livestock === currentLivestock)
  );

  const view = document.getElementById('view-records');

  view.innerHTML = records.map(r => `
    <div class="card">
      <strong>${r.date}</strong><br>
      Qty: ${r.quantity} | Feed: ${r.feedKg || 0}kg | Mortality: ${r.mortality || 0}
      <div class="actions">
        <button class="edit" data-id="${r.id}">Edit</button>
        <button class="delete" data-id="${r.id}">Delete</button>
      </div>
    </div>
  `).join('');

  view.querySelectorAll('.edit').forEach(b => {
    b.onclick = () => renderAddForm(records.find(r => r.id === b.dataset.id));
  });

  view.querySelectorAll('.delete').forEach(b => {
    b.onclick = async () => {
      if (confirm('Delete record?')) {
        await del('records', b.dataset.id);
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

function filterByDate(records) {
  const now = new Date();

  if (activeFilter === 'today')
    return records.filter(r => r.date === now.toISOString().slice(0,10));

  if (activeFilter === 'week')
    return records.filter(r => new Date(r.date) >= new Date(now - 7*864e5));

  if (activeFilter === 'month')
    return records.filter(r => new Date(r.date).getMonth() === now.getMonth());

  return records;
}


