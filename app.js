// app.js - main app logic (module)
import DB from './db.js';
import Utils from './utils.js';
import { ensureSampleData } from './sample-data.js';

const { uid, formatDate, csvDownload, jsonDownload, generatePdfReport, sum } = Utils;

let state = {
  selectedLivestock: null,
  view: 'dashboardView',
  recordsPage: 0,
  pageSize: 20,
  selectedRecords: new Set()
};

async function init() {
  await DB.init();
  // restore selected livestock from meta
  const sel = await DB.getMeta('selectedLivestock');
  if (sel) {
    state.selectedLivestock = sel;
    hideLanding();
  } else {
    showLanding();
  }
  bindUI();
  navigateTo(state.view);
  await refreshDashboard();
  setupOnlineSync();
  // debug: if no data, don't force sample
}

function bindUI() {
  document.querySelectorAll('.nav-btn').forEach(b => b.addEventListener('click', (e) => {
    document.querySelectorAll('.nav-btn').forEach(n=>n.classList.remove('active'));
    b.classList.add('active');
    navigateTo(b.dataset.view);
  }));

  // landing
  document.querySelectorAll('.livestock').forEach(b => b.addEventListener('click', async (e) => {
    const type = b.dataset.type;
    state.selectedLivestock = type;
    await DB.putMeta('selectedLivestock', type);
    document.getElementById('selectedLivestockLabel').textContent = capitalize(type);
    hideLanding();
    await refreshDashboard();
  }));

  document.getElementById('landingSkip').addEventListener('click', async () => {
    await ensureSampleData();
    const sel = await DB.getMeta('selectedLivestock') || 'dairy';
    state.selectedLivestock = sel;
    document.getElementById('selectedLivestockLabel').textContent = capitalize(sel);
    hideLanding();
    await refreshDashboard();
  });

  // Add record nav
  document.querySelector('[data-view="addView"]').addEventListener('click', () => {
    renderAddForm();
  });

  // record form
  document.getElementById('recordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const rec = await collectRecordForm();
    if (!rec) return;
    if (!rec.id) rec.id = uid();
    rec.createdAt = rec.createdAt || new Date().toISOString();
    rec.updatedAt = new Date().toISOString();
    await DB.addRecord(rec);
    alert('Record saved');
    navigateTo('dashboardView');
    await refreshDashboard();
  });

  document.getElementById('cancelRecord').addEventListener('click', () => navigateTo('dashboardView'));

  document.getElementById('refreshBtn').addEventListener('click', refreshDashboard);

  // records list controls
  document.getElementById('searchRecords').addEventListener('input', renderRecordsList);
  document.getElementById('filterMonth').addEventListener('change', renderRecordsList);
  document.getElementById('sortRecords').addEventListener('change', renderRecordsList);
  document.getElementById('bulkDeleteBtn').addEventListener('click', bulkDelete);

  // finance
  document.getElementById('txnForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const t = {
      id: uid(),
      livestock: state.selectedLivestock,
      date: document.getElementById('txnDate').value || new Date().toISOString(),
      type: document.getElementById('txnType').value,
      amount: Number(document.getElementById('txnAmount').value) || 0,
      currency: await DB.getMeta('currency') || 'KES',
      category: document.getElementById('txnCategory').value,
      description: document.getElementById('txnDesc').value,
      createdAt: new Date().toISOString()
    };
    await DB.addTxn(t);
    document.getElementById('txnForm').reset();
    await refreshDashboard();
    renderTxns();
  });

  document.getElementById('exportTxnsCsv').addEventListener('click', exportTxnsCsv);

  // export / import JSON
  document.getElementById('exportJsonBtn').addEventListener('click', async () => {
    const data = await DB.exportAll();
    jsonDownload(`farmtrack-backup-${Date.now()}.json`, data);
  });
  document.getElementById('importJsonBtn').addEventListener('click', async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (ev) => {
      const file = ev.target.files[0];
      if (!file) return;
      const text = await file.text();
      try {
        const data = JSON.parse(text);
        await DB.importAll(data, {overwrite:false});
        alert('Restore complete');
        await refreshDashboard();
      } catch (err) { alert('Failed to import: ' + err.message); }
    };
    input.click();
  });

  // Reports
  document.getElementById('downloadPdf').addEventListener('click', async () => {
    const from = document.getElementById('reportFrom').value;
    const to = document.getElementById('reportTo').value;
    const nodes = [ document.querySelector('.kpi-grid'), document.getElementById('trendChart'), document.getElementById('recentList') ];
    await generatePdfReport({ element: nodes, filename: `farm-report-${Date.now()}.pdf` });
  });
  document.getElementById('downloadStatement').addEventListener('click', async () => {
    // simple sales statement from transactions marked income
    const txns = await DB.listTxns({ livestock: state.selectedLivestock });
    const sales = txns.filter(t => t.type === 'income');
    const node = document.createElement('div');
    node.className = 'card';
    node.innerHTML = `<h3>Sales Statement — ${capitalize(state.selectedLivestock || '')}</h3>
      <p>${sales.length} sales</p>
      <ul>${sales.map(s=>`<li>${formatDate(s.date)} — ${s.category || ''} — ${s.amount} ${s.currency}</li>`).join('')}</ul>`;
    await generatePdfReport({ element: node, filename: `statement-${Date.now()}.pdf` });
  });

  // nav show appropriate label
  const lbl = document.getElementById('selectedLivestockLabel');
  if (state.selectedLivestock) lbl.textContent = capitalize(state.selectedLivestock);

  // records view navigation
  document.addEventListener('click', async (e) => {
    if (e.target.matches('.edit-record')) {
      const id = e.target.closest('li').dataset.id;
      await loadRecordForEdit(id);
      navigateTo('addView');
    } else if (e.target.matches('.delete-record')) {
      const id = e.target.closest('li').dataset.id;
      if (confirm('Delete record?')) {
        await DB.deleteRecord(id);
        await refreshDashboard();
        renderRecordsList();
      }
    }
  });
}

function capitalize(s){ if(!s) return ''; return s[0].toUpperCase() + s.slice(1); }

function showLanding(){
  document.getElementById('landing').style.display = 'flex';
}
function hideLanding(){
  document.getElementById('landing').style.display = 'none';
}

function navigateTo(view) {
  state.view = view;
  document.querySelectorAll('.view').forEach(v => v.hidden = true);
  const el = document.getElementById(view);
  if (el) el.hidden = false;
  // pre-render certain things
  if (view === 'dashboardView') refreshDashboard();
  if (view === 'recordsView') renderRecordsList();
  if (view === 'financeView') renderTxns();
  if (view === 'addView') renderAddForm();
}

// Add record form adapts to livestock
function renderAddForm(record = null) {
  const dynamic = document.getElementById('dynamicFields');
  dynamic.innerHTML = '';
  const type = state.selectedLivestock || 'dairy';
  const r = record || {};
  // common: date and notes already present
  if (type === 'dairy') {
    dynamic.innerHTML = `
      <div class="form-row"><label for="cowId">Cow ID</label><input id="cowId" name="animalId" value="${r.animalId || ''}" /></div>
      <div class="form-row"><label for="session">Session</label><select id="session" name="session"><option value="">--</option><option value="morning">Morning</option><option value="evening">Evening</option></select></div>
      <div class="form-row"><label for="milkLiters">Milk (L)</label><input id="milkLiters" name="quantity" type="number" step="0.1" value="${r.quantity || ''}" required /></div>
      <div class="form-row"><label for="fatPct">Fat % (optional)</label><input id="fatPct" name="fatPct" type="number" step="0.1" value="${r.fatPct || ''}" /></div>
      <div class="form-row"><label for="feedKg">Feed (kg)</label><input id="feedKg" name="feedKg" type="number" step="0.1" value="${r.feedKg || ''}" /></div>
      <div class="form-row"><label for="weightKg">Weight (kg)</label><input id="weightKg" name="weightKg" type="number" step="0.1" value="${r.weightKg || ''}" /></div>
      <div class="form-row"><label for="medication">Medication</label><input id="medication" name="medication" value="${r.medication || ''}" /></div>
    `;
  } else if (type === 'poultry') {
    dynamic.innerHTML = `
      <div class="form-row"><label for="flockId">Flock ID</label><input id="flockId" name="animalId" value="${r.animalId || 'flock-1'}" /></div>
      <div class="form-row"><label for="eggsCollected">Eggs collected</label><input id="eggsCollected" name="quantity" type="number" value="${r.quantity || ''}" required /></div>
      <div class="form-row"><label for="birdsCount">Birds count</label><input id="birdsCount" name="birdsCount" type="number" value="${r.birdsCount || ''}" /></div>
      <div class="form-row"><label for="mortality">Mortality</label><input id="mortality" name="mortality" type="number" value="${r.mortality || 0}" /></div>
      <div class="form-row"><label for="feedKg">Feed (kg)</label><input id="feedKg" name="feedKg" type="number" step="0.1" value="${r.feedKg || ''}" /></div>
      <div class="form-row"><label for="vaccination">Vaccination</label><input id="vaccination" name="vaccination" value="${r.vaccination || ''}" /></div>
    `;
  } else if (type === 'pig') {
    dynamic.innerHTML = `
      <div class="form-row"><label for="pigId">Pig ID</label><input id="pigId" name="animalId" value="${r.animalId || ''}" /></div>
      <div class="form-row"><label for="weightKg">Weight (kg)</label><input id="weightKg" name="weightKg" type="number" step="0.1" value="${r.weightKg || ''}" /></div>
      <div class="form-row"><label for="feedKg">Feed (kg)</label><input id="feedKg" name="feedKg" type="number" step="0.1" value="${r.feedKg || ''}" /></div>
      <div class="form-row"><label for="pigletsBorn">Piglets born</label><input id="pigletsBorn" name="births" type="number" value="${r.births || 0}" /></div>
      <div class="form-row"><label for="mortality">Mortality</label><input id="mortality" name="mortality" type="number" value="${r.mortality || 0}" /></div>
      <div class="form-row"><label for="salesCount">Sales count</label><input id="salesCount" name="salesCount" type="number" value="${r.salesCount || 0}" /></div>
    `;
  } else if (type === 'goat') {
    dynamic.innerHTML = `
      <div class="form-row"><label for="goatId">Goat ID</label><input id="goatId" name="animalId" value="${r.animalId || ''}" /></div>
      <div class="form-row"><label for="milkLiters">Milk (L)</label><input id="milkLiters" name="quantity" type="number" step="0.1" value="${r.quantity || ''}" /></div>
      <div class="form-row"><label for="weightKg">Weight (kg)</label><input id="weightKg" name="weightKg" type="number" step="0.1" value="${r.weightKg || ''}" /></div>
      <div class="form-row"><label for="births">Births</label><input id="births" name="births" type="number" value="${r.births || 0}" /></div>
      <div class="form-row"><label for="mortality">Mortality</label><input id="mortality" name="mortality" type="number" value="${r.mortality || 0}" /></div>
      <div class="form-row"><label for="feedKg">Feed (kg)</label><input id="feedKg" name="feedKg" type="number" step="0.1" value="${r.feedKg || ''}" /></div>
      <div class="form-row"><label for="medication">Medication</label><input id="medication" name="medication" value="${r.medication || ''}" /></div>
    `;
  }
  // prefill date
  const dateEl = document.getElementById('recDate');
  if (record) dateEl.value = record.date ? record.date.split('T')[0] : '';
  else dateEl.value = new Date().toISOString().substr(0,10);
}

async function collectRecordForm() {
  const type = state.selectedLivestock || 'dairy';
  const date = document.getElementById('recDate').value || new Date().toISOString();
  const notes = document.getElementById('recNotes').value;
  const rec = {
    id: uid(),
    livestock: type,
    date: new Date(date).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  // gather dynamic fields
  if (type === 'dairy') {
    rec.animalId = document.getElementById('cowId').value || '';
    rec.session = document.getElementById('session').value || '';
    rec.quantity = Number(document.getElementById('milkLiters').value) || 0;
    rec.unit = 'L';
    rec.fatPct = Number(document.getElementById('fatPct')?.value) || null;
    rec.feedKg = Number(document.getElementById('feedKg')?.value) || 0;
    rec.weightKg = Number(document.getElementById('weightKg')?.value) || null;
    rec.medication = document.getElementById('medication')?.value || '';
  } else if (type === 'poultry') {
    rec.animalId = document.getElementById('flockId').value || '';
    rec.quantity = Number(document.getElementById('eggsCollected').value) || 0;
    rec.unit = 'eggs';
    rec.birdsCount = Number(document.getElementById('birdsCount')?.value) || 0;
    rec.mortality = Number(document.getElementById('mortality')?.value) || 0;
    rec.feedKg = Number(document.getElementById('feedKg')?.value) || 0;
    rec.vaccination = document.getElementById('vaccination')?.value || '';
  } else if (type === 'pig') {
    rec.animalId = document.getElementById('pigId').value || '';
    rec.weightKg = Number(document.getElementById('weightKg')?.value) || null;
    rec.feedKg = Number(document.getElementById('feedKg')?.value) || 0;
    rec.births = Number(document.getElementById('pigletsBorn')?.value) || 0;
    rec.mortality = Number(document.getElementById('mortality')?.value) || 0;
    rec.salesCount = Number(document.getElementById('salesCount')?.value) || 0;
  } else if (type === 'goat') {
    rec.animalId = document.getElementById('goatId').value || '';
    rec.quantity = Number(document.getElementById('milkLiters')?.value) || 0;
    rec.unit = rec.quantity ? 'L' : 'kg';
    rec.weightKg = Number(document.getElementById('weightKg')?.value) || null;
    rec.births = Number(document.getElementById('births')?.value) || 0;
    rec.mortality = Number(document.getElementById('mortality')?.value) || 0;
    rec.feedKg = Number(document.getElementById('feedKg')?.value) || 0;
    rec.medication = document.getElementById('medication')?.value || '';
  }
  rec.notes = document.getElementById('recNotes')?.value || notes || '';
  // validation basic
  if (!rec.date) { alert('Date required'); return null; }
  if (rec.quantity === 0 && (type==='dairy' || type==='poultry') ) {
    if (!confirm('Quantity is zero. Save anyway?')) return null;
  }
  return rec;
}

async function refreshDashboard() {
  const type = state.selectedLivestock;
  if (!type) return;
  document.getElementById('selectedLivestockLabel').textContent = capitalize(type);
  const records = (await DB.listRecords({livestock:type})) || [];
  const txns = (await DB.listTxns({livestock:type})) || [];
  // compute KPIs for current month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const recThisMonth = records.filter(r => new Date(r.date) >= startOfMonth);
  const productionField = 'quantity';
  const totalProduction = sum(recThisMonth, productionField);
  const days = Math.max(1, (now.getDate()));
  const avgPerDay = (totalProduction / days).toFixed(2);
  const uniqueAnimals = new Set(records.map(r => r.animalId).filter(Boolean)).size;
  const mortality = sum(recThisMonth, 'mortality');
  const feed = sum(recThisMonth, 'feedKg');
  const income = sum(txns.filter(t=>new Date(t.date)>=startOfMonth && t.type==='income'), 'amount');
  const expenses = sum(txns.filter(t=>new Date(t.date)>=startOfMonth && t.type==='expense'), 'amount');
  const profit = income - expenses;

  // render KPI grid
  const grid = document.getElementById('kpiGrid');
  grid.innerHTML = '';
  const kpis = [
    { title: 'Total production (this month)', value: `${totalProduction} ${type==='poultry'?'eggs': (type==='pig'?'kg':'L')}` },
    { title: 'Avg / day', value: `${avgPerDay}` },
    { title: 'Registered animals', value: `${uniqueAnimals}` },
    { title: 'Mortality (this month)', value: `${mortality}` },
    { title: 'Feed consumed (kg)', value: `${feed}` },
    { title: 'Income / Expenses', value: `${income} / ${expenses} (${await DB.getMeta('currency') || 'KES'})` },
    { title: 'Net profit', value: `${profit}` }
  ];
  for (const kp of kpis) {
    const div = document.createElement('div');
    div.className = 'kpi';
    div.innerHTML = `<h4>${kp.title}</h4><p>${kp.value}</p>`;
    grid.appendChild(div);
  }

  // trend chart data (last 30 days)
  const trendEl = document.getElementById('trendChart');
  const last30 = Array.from({length:30}).map((_,i)=>{
    const date = new Date(); date.setDate(date.getDate() - (29 - i));
    return { day: date.toISOString().substr(0,10), value: 0 };
  });
  const map = {};
  for (const r of records) {
    const d = r.date.substr(0,10);
    map[d] = (map[d] || 0) + (Number(r.quantity) || 0);
  }
  last30.forEach(d => { d.value = map[d.day] || 0; });

  // Chart.js chart
  if (window.trendChart) window.trendChart.destroy();
  window.trendChart = new Chart(trendEl.getContext('2d'), {
    type: 'line',
    data: {
      labels: last30.map(d=>d.day),
      datasets: [{ label: 'Production', data: last30.map(d=>d.value), fill:true, tension:0.3 }]
    },
    options: {
      responsive:true,
      maintainAspectRatio:false,
      plugins:{legend:{display:false}}
    }
  });

  // recent records list
  const recentList = document.getElementById('recentList');
  recentList.innerHTML = '';
  const recent = records.sort((a,b)=> new Date(b.date)-new Date(a.date)).slice(0,5);
  for (const r of recent) {
    const li = document.createElement('li');
    li.className = 'list-item small-text';
    li.innerHTML = `<strong>${formatDate(r.date)}</strong> — ${r.animalId || ''} — ${r.quantity || ''} ${r.unit || ''} <div class="small-text">${r.notes || ''}</div>`;
    recentList.appendChild(li);
  }
}

async function renderRecordsList() {
  const listEl = document.getElementById('recordsList');
  listEl.innerHTML = '';
  const records = (await DB.listRecords({livestock:state.selectedLivestock})) || [];
  // filters
  const search = document.getElementById('searchRecords').value.toLowerCase();
  const month = document.getElementById('filterMonth').value;
  const sort = document.getElementById('sortRecords').value;
  let filtered = records.filter(r => {
    if (search) {
      const hay = `${r.animalId||''} ${r.notes||''}`.toLowerCase();
      if (!hay.includes(search)) return false;
    }
    if (month && month !== 'all') {
      const m = new Date(r.date).toISOString().substr(0,7);
      if (m !== month) return false;
    }
    return true;
  });
  filtered.sort((a,b) => sort === 'asc' ? new Date(a.date)-new Date(b.date) : new Date(b.date)-new Date(a.date));

  // fill month filter options
  const months = [...new Set(records.map(r=> new Date(r.date).toISOString().substr(0,7)))].sort().reverse();
  const msel = document.getElementById('filterMonth');
  if (msel.options.length <= 1) {
    for (const m of months) {
      const opt = document.createElement('option');
      opt.value = m; opt.textContent = m;
      msel.appendChild(opt);
    }
  }

  for (const r of filtered.slice(0,200)) {
    const li = document.getElementById('recordItemTemplate').content.cloneNode(true);
    const item = li.querySelector('li');
    item.dataset.id = r.id;
    item.querySelector('.record-meta').textContent = `${formatDate(r.date)} — ${r.animalId || ''} — ${r.quantity || ''} ${r.unit || ''}`;
    item.querySelector('.record-notes').textContent = r.notes || '';
    listEl.appendChild(li);
  }
}

async function loadRecordForEdit(id) {
  const r = await DB.getRecord(id);
  if (!r) return alert('Record not found');
  renderAddForm(r);
  // fill form with record values
  document.getElementById('recDate').value = r.date.substr(0,10);
  document.getElementById('recNotes').value = r.notes || '';
  // for every input inside dynamicFields try to set value by name
  const dynamic = document.getElementById('dynamicFields');
  dynamic.querySelectorAll('input,select,textarea').forEach(inp => {
    const name = inp.name || inp.id;
    if (r[name] !== undefined && r[name] !== null) inp.value = r[name];
  });
  // override submit to update instead of create
  const form = document.getElementById('recordForm');
  form.onsubmit = async (e) => {
    e.preventDefault();
    // collect and merge
    const updated = await collectRecordForm();
    if (!updated) return;
    updated.id = r.id;
    updated.createdAt = r.createdAt;
    updated.updatedAt = new Date().toISOString();
    await DB.updateRecord(updated);
    alert('Updated');
    form.onsubmit = null;
    navigateTo('dashboardView');
    await refreshDashboard();
  };
}

async function bulkDelete() {
  const checks = Array.from(document.querySelectorAll('.select-record:checked')).map(c => c.closest('li').dataset.id);
  if (checks.length === 0) return alert('No records selected');
  if (!confirm(`Delete ${checks.length} records?`)) return;
  for (const id of checks) {
    await DB.deleteRecord(id);
  }
  await refreshDashboard();
  renderRecordsList();
}

async function renderTxns() {
  const list = document.getElementById('txnList');
  list.innerHTML = '';
  const txns = await DB.listTxns({livestock: state.selectedLivestock});
  const range = document.getElementById('txnRange').value;
  const now = new Date();
  let filtered = txns;
  if (range === 'day') {
    filtered = txns.filter(t => new Date(t.date).toDateString() === now.toDateString());
  } else if (range === 'week') {
    const start = new Date(now); start.setDate(now.getDate()-7);
    filtered = txns.filter(t => new Date(t.date) >= start);
  } else if (range === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    filtered = txns.filter(t => new Date(t.date) >= start);
  }
  for (const t of filtered.sort((a,b)=>new Date(b.date)-new Date(a.date))) {
    const li = document.createElement('li'); li.className='record-item';
    li.innerHTML = `<div class="record-main"><div class="record-meta">${formatDate(t.date)} — ${t.category || ''} — ${t.amount} ${t.currency || ''}</div><div class="record-notes">${t.description || ''}</div></div>
      <div class="record-actions"><button class="btn small edit-txn" data-id="${t.id}">Edit</button><button class="btn small danger delete-txn" data-id="${t.id}">Delete</button></div>`;
    list.appendChild(li);
  }
  // txn edit/delete handlers
  list.querySelectorAll('.delete-txn').forEach(btn => btn.addEventListener('click', async (e) => {
    const id = btn.dataset.id;
    if (confirm('Delete transaction?')) { await DB.deleteTxn(id); renderTxns(); refreshDashboard(); }
  }));
  list.querySelectorAll('.edit-txn').forEach(btn => btn.addEventListener('click', async (e) => {
    const id = btn.dataset.id;
    const t = (await DB.listTxns({livestock: state.selectedLivestock})).find(x => x.id === id);
    if (!t) return alert('Not found');
    document.getElementById('txnDate').value = t.date.substr(0,10);
    document.getElementById('txnType').value = t.type;
    document.getElementById('txnAmount').value = t.amount;
    document.getElementById('txnCategory').value = t.category;
    document.getElementById('txnDesc').value = t.description;
    // override submit
    const form = document.getElementById('txnForm');
    form.onsubmit = async (ev) => {
      ev.preventDefault();
      t.date = document.getElementById('txnDate').value;
      t.type = document.getElementById('txnType').value;
      t.amount = Number(document.getElementById('txnAmount').value) || 0;
      t.category = document.getElementById('txnCategory').value;
      t.description = document.getElementById('txnDesc').value;
      await DB.updateTxn(t);
      form.onsubmit = null;
      form.reset();
      renderTxns();
      refreshDashboard();
    };
  }));
}

async function exportTxnsCsv() {
  const txns = await DB.listTxns({livestock: state.selectedLivestock});
  if (!txns.length) return alert('No transactions');
  const rows = txns.map(t => ({ date: t.date, type: t.type, amount: t.amount, currency: t.currency, category: t.category, description: t.description }));
  csvDownload(`transactions-${state.selectedLivestock || 'all'}-${Date.now()}.csv`, rows, ['date','type','amount','currency','category','description']);
}

// Sync stub
function setupOnlineSync() {
  window.addEventListener('online', processSyncQueue);
}
async function processSyncQueue() {
  // stub: attempt to process DB.syncQueue - left as optional cloud sync
  const q = await DB.getSyncQueue();
  if (!q.length) return;
  console.log('Sync queue items:', q.length);
  // Call to syncToCloud for each (user must implement their cloud option)
  for (const item of q) {
    try {
      // placeholder: simulate success
      console.log('Processing sync item', item);
      // If you implement cloud sync, post item to your endpoint here.
      await DB.clearSyncQueueItem(item.id);
    } catch (err) {
      console.warn('Sync failed for item', item, err);
    }
  }
}

// expose stub for user to implement real sync
window.syncToCloud = async function syncToCloud() {
  // Implement cloud sync here (e.g., Firebase, custom API). This stub processes local queue but does not send data.
  await processSyncQueue();
  alert('syncToCloud ran (stub). Implement cloud sync in app.js or external module.');
};

init();

// small utility for debug check when ?debug=true
if (new URLSearchParams(location.search).get('debug') === 'true') {
  (async ()=> {
    try {
      await DB.init();
      console.log('DB initialized');
      const meta = await DB.getMeta('selectedLivestock');
      console.log('selected livestock: ', meta);
    } catch (e) {
      console.error(e);
    }
  })();
}
