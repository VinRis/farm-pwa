// sample-data.js - adds small sample records for each livestock when user chooses "Use sample data" or first run if DB empty
import DB from './db.js';
import { uid, isoNow } from './utils.js';

async function ensureSampleData() {
  await DB.init();
  const selected = await DB.getMeta('selectedLivestock');
  if (selected) return; // don't clobber existing
  // meta
  await DB.putMeta('farmName', 'Ngong Hills Farm');
  await DB.putMeta('farmerName', 'Farmer Jane');
  await DB.putMeta('currency', 'KES');
  // sample records (small)
  const now = new Date();
  const recs = [];
  // dairy
  for (let i=1;i<=6;i++){
    const d = new Date(now); d.setDate(now.getDate() - i);
    recs.push({
      id: uid(), livestock: 'dairy', date: d.toISOString(), animalId: `cow-${(i%3)+1}`,
      session: i%2? 'morning':'evening', quantity: 12 + i, unit: 'L',
      feedKg: 5 + i*0.2, weightKg: 450 + i, mortality:0, births:0,
      healthNotes:'', medication:'', notes: 'Sample dairy record', photos:[], createdAt: isoNow(), updatedAt: isoNow()
    });
  }
  // poultry
  for (let i=1;i<=6;i++){
    const d = new Date(now); d.setDate(now.getDate() - i);
    recs.push({
      id: uid(), livestock: 'poultry', date: d.toISOString(), animalId: `flock-1`,
      session:'', quantity: 120 + i*5, unit: 'eggs', feedKg: 8 + i*0.5, weightKg: null,
      mortality: i%5===0?1:0, births:0, healthNotes:'', medication:'vaccinated', notes:'Sample poultry', photos:[], createdAt: isoNow(), updatedAt: isoNow()
    });
  }
  // pig
  for (let i=1;i<=4;i++){
    const d = new Date(now); d.setDate(now.getDate() - i*2);
    recs.push({
      id: uid(), livestock: 'pig', date: d.toISOString(), animalId: `pig-${i}`,
      session:'', quantity: null, unit: 'kg', feedKg: 12 + i, weightKg: 50 + i*2,
      mortality:0, births:0, salesCount: 0, healthNotes:'', medication:'', notes:'Sample pig', photos:[], createdAt: isoNow(), updatedAt: isoNow()
    });
  }
  // goat
  for (let i=1;i<=4;i++){
    const d = new Date(now); d.setDate(now.getDate() - i*3);
    recs.push({
      id: uid(), livestock: 'goat', date: d.toISOString(), animalId: `goat-${i}`,
      session:'', quantity: 2 + i, unit: 'L', feedKg: 2 + i*0.2, weightKg: 35 + i,
      deaths:0, mortality:0, births:0, medication:'', notes:'Sample goat', photos:[], createdAt: isoNow(), updatedAt: isoNow()
    });
  }

  for (const r of recs) {
    await DB.addRecord(r);
  }

  // sample transactions
  const txns = [
    { id: uid(), livestock:'dairy', date: new Date().toISOString(), type:'income', amount: 1500, currency:'KES', category:'Milk sales', description:'Morning milk sale', createdAt: isoNow() },
    { id: uid(), livestock:'poultry', date: new Date().toISOString(), type:'expense', amount: 800, currency:'KES', category:'Feed', description:'Poultry feed purchase', createdAt: isoNow() }
  ];
  for (const t of txns) await DB.addTxn(t);

  // set default selected livestock
  await DB.putMeta('selectedLivestock', 'dairy');
}

window.addEventListener('load', async () => {
  // small non-invasive check to ensure DB exists
  await DB.init();
  // If ?debug=true, add sample data automatically
  const qs = new URLSearchParams(location.search);
  if (qs.get('debug') === 'true') {
    await ensureSampleData();
    console.log('Sample data installed.');
  }

  // attach helper to window for app.js usage
  window.ensureSampleData = ensureSampleData;
});

export { ensureSampleData };
