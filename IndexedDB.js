/**
 * Simple IndexedDB Wrapper for FarmTrack
 */
export const dbName = 'farmtrack-db';
export const dbVersion = 1;

export const openDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, dbVersion);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'key' });
            if (!db.objectStoreNames.contains('records')) {
                const store = db.createObjectStore('records', { keyPath: 'id' });
                store.createIndex('livestock', 'livestock', { unique: false });
                store.createIndex('date', 'date', { unique: false });
            }
            if (!db.objectStoreNames.contains('transactions')) {
                const store = db.createObjectStore('transactions', { keyPath: 'id' });
                store.createIndex('livestock', 'livestock', { unique: false });
                store.createIndex('date', 'date', { unique: false });
            }
            if (!db.objectStoreNames.contains('syncQueue')) db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const crud = {
    async get(storeName, key) {
        const db = await openDB();
        return new Promise((res) => {
            const req = db.transaction(storeName).objectStore(storeName).get(key);
            req.onsuccess = () => res(req.result);
        });
    },
    async getAll(storeName) {
        const db = await openDB();
        return new Promise((res) => {
            const req = db.transaction(storeName).objectStore(storeName).getAll();
            req.onsuccess = () => res(req.result);
        });
    },
    async put(storeName, data) {
        const db = await openDB();
        const tx = db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).put(data);
        return new Promise((res) => tx.oncomplete = () => res(true));
    },
    async delete(storeName, key) {
        const db = await openDB();
        const tx = db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).delete(key);
        return new Promise((res) => tx.oncomplete = () => res(true));
    },
    async clear(storeName) {
        const db = await openDB();
        const tx = db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).clear();
        return new Promise((res) => tx.oncomplete = () => res(true));
    }
};
