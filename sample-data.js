// sample-data.js
import { openDB, put } from './db.js';
import { uuid } from './utils.js';

(async () => {
  const db = await openDB();
  const meta = await new Promise(r => {
    const req = db.transaction('meta').objectStore('meta').get('initialized');
    req.onsuccess = () => r(req.result);
  });
  if (!meta) {
    await put('meta', { key: 'initialized', value: true });
    await put('meta', { key: 'currency', value: 'KES' });
    await put('records', {
      id: uuid(),
      livestock: 'dairy',
      date: new Date().toISOString(),
      animalId: 'Cow-01',
      quantity: 12,
      unit: 'L',
      feedKg: 5,
      mortality: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  }
})();
