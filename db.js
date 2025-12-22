const DB_NAME = 'FarmTrackDB';
const DB_VERSION = 2; // Incremented version to trigger update

export const DB = {
    db: null,

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                
                // Create Records Store
                if (!db.objectStoreNames.contains('records')) {
                    const store = db.createObjectStore('records', { keyPath: 'id' });
                    store.createIndex('livestock', 'livestock', { unique: false });
                } else {
                    // If store exists but needs index
                    const store = request.transaction.objectStore('records');
                    if (!store.indexNames.contains('livestock')) {
                        store.createIndex('livestock', 'livestock', { unique: false });
                    }
                }

                // Create Transactions Store
                if (!db.objectStoreNames.contains('transactions')) {
                    const store = db.createObjectStore('transactions', { keyPath: 'id' });
                    store.createIndex('livestock', 'livestock', { unique: false });
                } else {
                    const store = request.transaction.objectStore('transactions');
                    if (!store.indexNames.contains('livestock')) {
                        store.createIndex('livestock', 'livestock', { unique: false });
                    }
                }
            };

            request.onsuccess = (e) => {
                this.db = e.target.result;
                resolve(this.db);
            };

            request.onerror = (e) => reject(e.target.error);
        });
    },

    async getAll(storeName, indexName, value) {
        if (!this.db) await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.getAll(value);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async add(storeName, data) {
        if (!this.db) await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async delete(storeName, id) {
        if (!this.db) await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
};
