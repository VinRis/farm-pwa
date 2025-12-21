// db.js - IndexedDB helper using idb (CDN global: idb)
import { openDB } from 'https://cdn.jsdelivr.net/npm/idb@7/build/esm/index.js';

const DB_NAME = 'farmtrack-db';
const DB_VERSION = 1;
const DB = {
  async init() {
    if (this.db) return this.db;
    this.db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(upgradeDB) {
        if (!upgradeDB.objectStoreNames.contains('meta')) {
          const meta = upgradeDB.createObjectStore('meta', { keyPath: 'key' });
        }
        if (!upgradeDB.objectStoreNames.contains('records')) {
          const rs = upgradeDB.createObjectStore('records', { keyPath: 'id' });
          rs.createIndex('livestock', 'livestock');
          rs.createIndex('date', 'date');
        }
        if (!upgradeDB.objectStoreNames.contains('transactions')) {
          const ts = upgradeDB.createObjectStore('transactions', { keyPath: 'id' });
          ts.createIndex('livestock', 'livestock');
          ts.createIndex('date', 'date');
        }
        if (!upgradeDB.objectStoreNames.contains('syncQueue')) {
          upgradeDB.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
        }
      }
    });
    return this.db;
  },

  async putMeta(key, value) {
    const db = await this.init();
    return db.put('meta', { key, value });
  },
  async getMeta(key) {
    const db = await this.init();
    const r = await db.get('meta', key);
    return r ? r.value : null;
  },

  // Records
  async addRecord(record) {
    const db = await this.init();
    await db.put('records', record);
    // queue for sync
    await db.add('syncQueue', { action: 'upsert', store: 'records', data: record, createdAt: new Date().toISOString() });
    return record;
  },
  async updateRecord(record) {
    const db = await this.init();
    record.updatedAt = new Date().toISOString();
    await db.put('records', record);
    await db.add('syncQueue', { action: 'upsert', store: 'records', data: record, createdAt: new Date().toISOString() });
    return record;
  },
  async deleteRecord(id) {
    const db = await this.init();
    // store delete action
    await db.add('syncQueue', { action: 'delete', store: 'records', id, createdAt: new Date().toISOString() });
    return db.delete('records', id);
  },
  async getRecord(id) {
    const db = await this.init();
    return db.get('records', id);
  },
  async listRecords({livestock, limit=1000, index='date', direction='prev'}={}) {
    const db = await this.init();
    const tx = db.transaction('records');
    const store = tx.objectStore('records');
    if (livestock) {
      const idx = store.index('livestock');
      return idx.getAll(livestock);
    }
    return store.getAll();
  },

  // Transactions
  async addTxn(txn) {
    const db = await this.init();
    await db.put('transactions', txn);
    await db.add('syncQueue', { action: 'upsert', store: 'transactions', data: txn, createdAt: new Date().toISOString() });
    return txn;
  },
  async updateTxn(txn) {
    const db = await this.init();
    await db.put('transactions', txn);
    await db.add('syncQueue', { action: 'upsert', store: 'transactions', data: txn, createdAt: new Date().toISOString() });
    return txn;
  },
  async deleteTxn(id) {
    const db = await this.init();
    await db.add('syncQueue', { action: 'delete', store: 'transactions', id, createdAt: new Date().toISOString() });
    return db.delete('transactions', id);
  },
  async listTxns({livestock}={}) {
    const db = await this.init();
    if (livestock) {
      const idx = db.transaction('transactions').objectStore('transactions').index('livestock');
      return idx.getAll(livestock);
    }
    return db.getAll('transactions');
  },

  // Sync queue
  async getSyncQueue() {
    const db = await this.init();
    return db.getAll('syncQueue');
  },
  async clearSyncQueueItem(key) {
    const db = await this.init();
    return db.delete('syncQueue', key);
  },

  // Backup & restore
  async exportAll() {
    const db = await this.init();
    const meta = await db.getAll('meta');
    const records = await db.getAll('records');
    const transactions = await db.getAll('transactions');
    const syncQueue = await db.getAll('syncQueue');
    return { meta, records, transactions, syncQueue, exportedAt: new Date().toISOString() };
  },
  async importAll(data, {overwrite=false}={}) {
    const db = await this.init();
    const tx = db.transaction(['meta','records','transactions','syncQueue'],'readwrite');
    if (overwrite) {
      await Promise.all([
        tx.objectStore('meta').clear(),
        tx.objectStore('records').clear(),
        tx.objectStore('transactions').clear(),
        tx.objectStore('syncQueue').clear(),
      ]);
    }
    for (const m of data.meta || []) await tx.objectStore('meta').put(m);
    for (const r of data.records || []) await tx.objectStore('records').put(r);
    for (const t of data.transactions || []) await tx.objectStore('transactions').put(t);
    for (const s of data.syncQueue || []) await tx.objectStore('syncQueue').put(s);
    await tx.done;
    return true;
  }
};

window.DB = DB;
export default DB;
