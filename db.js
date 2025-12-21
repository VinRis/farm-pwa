const DB_NAME = 'farmtrack-db';
const DB_VERSION = 1;

export const dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
        const db = e.target.result;
        
        // Records Store
        if (!db.objectStoreNames.contains('records')) {
            const store = db.createObjectStore('records', { keyPath: 'id' });
            store.createIndex('livestock', 'livestock', { unique: false });
            store.createIndex('date', 'date', { unique: false });
            store.createIndex('syncStatus', 'syncStatus', { unique: false });
        }

        // Transactions Store
        if (!db.objectStoreNames.contains('transactions')) {
            const store = db.createObjectStore('transactions', { keyPath: 'id' });
            store.createIndex('livestock', 'livestock', { unique: false });
            store.createIndex('date', 'date', { unique: false });
        }

        // Meta/Settings Store
        if (!db.objectStoreNames.contains('meta')) {
            db.createObjectStore('meta', { keyPath: 'key' });
        }

        // Sync Queue
        if (!db.objectStoreNames.contains('syncQueue')) {
            db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
        }
    };

    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
});

// Helper for transaction
const getStore = async (storeName, mode) => {
    const db = await dbPromise;
    const tx = db.transaction(storeName, mode);
    return tx.objectStore(storeName);
};

export const DB = {
    async getAll(storeName, indexName, value) {
        const store = await getStore(storeName, 'readonly');
        return new Promise((resolve, reject) => {
            let request;
            if (indexName && value) {
                const index = store.index(indexName);
                request = index.getAll(value);
            } else {
                request = store.getAll();
            }
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async add(storeName, item) {
        const store = await getStore(storeName, 'readwrite');
        return new Promise((resolve, reject) => {
            const request = store.add(item);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async update(storeName, item) {
        const store = await getStore(storeName, 'readwrite');
        return new Promise((resolve, reject) => {
            const request = store.put(item);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async delete(storeName, id) {
        const store = await getStore(storeName, 'readwrite');
        return new Promise((resolve, reject) => {
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    async dump() {
        // Export all data for backup
        const stores = ['records', 'transactions', 'meta'];
        const data = {};
        for (const s of stores) {
            data[s] = await this.getAll(s);
        }
        return data;
    },

    async restore(data) {
        // Simple restore: iterate and put
        const db = await dbPromise;
        const tx = db.transaction(Object.keys(data), 'readwrite');
        for (const storeName of Object.keys(data)) {
            const store = tx.objectStore(storeName);
            await store.clear(); // Wipe existing before restore
            for (const item of data[storeName]) {
                store.put(item);
            }
        }
        return new Promise((resolve) => {
            tx.oncomplete = () => resolve();
        });
    }
};
