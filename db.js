db.js
import { idb } from 'idb'; // From CDN

const DB_NAME = 'farmtrack-db';
const VERSION = 1;

export async function openDB() {
  return idb.openDB(DB_NAME, VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('records')) {
        const store = db.createObjectStore('records', { keyPath: 'id' });
        store.createIndex('livestock', 'livestock');
        store.createIndex('date', 'date');
      }
      if (!db.objectStoreNames.contains('transactions')) {
        const store = db.createObjectStore('transactions', { keyPath: 'id' });
        store.createIndex('livestock', 'livestock');
        store.createIndex('date', 'date');
      }
      if (!db.objectStoreNames.contains('syncQueue')) {
        db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
      }
    }
  });
}

export async function getMeta() {
  const db = await openDB();
  const tx = db.transaction('meta', 'readonly');
  const store = tx.objectStore('meta');
  const settings = await store.get('settings') || {};
  return settings;
}

export async function setMeta(data) {
  const db = await openDB();
  const tx = db.transaction('meta', 'readwrite');
  const store = tx.objectStore('meta');
  await store.put({ key: 'settings', ...data });
  await tx.done;
}

export async function getAllRecords(livestock, start, end) {
  const db = await openDB();
  const tx = db.transaction('records', 'readonly');
  const store = tx.objectStore('records');
  let cursor = await store.index('livestock').openCursor(livestock);
  let records = [];
  while (cursor) {
    const r = cursor.value;
    const date = new Date(r.date);
    if ((!start || date >= new Date(start)) && (!end || date <= new Date(end))) {
      records.push(r);
    }
    cursor = await cursor.continue();
  }
  return records;
}

export async function addRecord(data) {
  const db = await openDB();
  const tx = db.transaction('records', 'readwrite');
  const store = tx.objectStore('records');
  await store.add(data);
  await tx.done;
}

export async function updateRecord(data) {
  const db = await openDB();
  const tx = db.transaction('records', 'readwrite');
  const store = tx.objectStore('records');
  await store.put(data);
  await tx.done;
}

export async function deleteRecord(id) {
  const db = await openDB();
  const tx = db.transaction('records', 'readwrite');
  const store = tx.objectStore('records');
  await store.delete(id);
  await tx.done;
}

export async function getRecordById(id) {
  const db = await openDB();
  const tx = db.transaction('records', 'readonly');
  const store = tx.objectStore('records');
  return await store.get(id);
}

export async function getAllTransactions(livestock, start, end) {
  const db = await openDB();
  const tx = db.transaction('transactions', 'readonly');
  const store = tx.objectStore('transactions');
  let cursor = await store.index('livestock').openCursor(livestock);
  let trans = [];
  while (cursor) {
    const t = cursor.value;
    const date = new Date(t.date);
    if ((!start || date >= new Date(start)) && (!end || date <= new Date(end))) {
      trans.push(t);
    }
    cursor = await cursor.continue();
  }
  return trans;
}

export async function addTransaction(data) {
  const db = await openDB();
  const tx = db.transaction('transactions', 'readwrite');
  const store = tx.objectStore('transactions');
  await store.add(data);
  await tx.done;
}

export async function updateTransaction(data) {
  const db = await openDB();
  const tx = db.transaction('transactions', 'readwrite');
  const store = tx.objectStore('transactions');
  await store.put(data);
  await tx.done;
}

export async function deleteTransaction(id) {
  const db = await openDB();
  const tx = db.transaction('transactions', 'readwrite');
  const store = tx.objectStore('transactions');
  await store.delete(id);
  await tx.done;
}

export async function getTransactionById(id) {
  const db = await openDB();
  const tx = db.transaction('transactions', 'readonly');
  const store = tx.objectStore('transactions');
  return await store.get(id);
}

export async function getSyncQueue() {
  const db = await openDB();
  return await db.getAll('syncQueue');
}

export async function addToSyncQueue(action) {
  const db = await openDB();
  const tx = db.transaction('syncQueue', 'readwrite');
  const store = tx.objectStore('syncQueue');
  await store.add(action);
  await tx.done;
}

export async function clearSyncQueue() {
  const db = await openDB();
  const tx = db.transaction('syncQueue', 'readwrite');
  const store = tx.objectStore('syncQueue');
  await store.clear();
  await tx.done;
}

export async function getAllRecords() {
  const db = await openDB();
  return await db.getAll('records');
}

export async function getAllTransactions() {
  const db = await openDB();
  return await db.getAll('transactions');
}
