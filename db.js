// db.js
export const DB_NAME = 'farmtrack-db';
export const DB_VERSION = 1;
let db;

export function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      db = e.target.result;
      db.createObjectStore('meta', { keyPath: 'key' });
      db.createObjectStore('records', { keyPath: 'id' });
      db.createObjectStore('transactions', { keyPath: 'id' });
      db.createObjectStore('syncQueue', { keyPath: 'id' });
    };
    req.onsuccess = e => { db = e.target.result; resolve(db); };
    req.onerror = () => reject(req.error);
  });
}

function tx(store, mode='readonly') {
  return db.transaction(store, mode).objectStore(store);
}

export function put(store, value) {
  return new Promise(res => tx(store,'readwrite').put(value).onsuccess = () => res());
}

export function get(store, key) {
  return new Promise(res => tx(store).get(key).onsuccess = e => res(e.target.result));
}

export function getAll(store) {
  return new Promise(res => tx(store).getAll().onsuccess = e => res(e.target.result));
}

export function del(store, key) {
  return new Promise(res => tx(store,'readwrite').delete(key).onsuccess = () => res());
}
