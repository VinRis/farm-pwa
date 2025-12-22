const DB_NAME = 'FarmTrackDB';
const DB_VERSION = 3; 

export const DB = {
    db: null,

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                // Create stores if they don't exist and add search indexes
                if (!db.objectStoreNames.contains('records')) {
                    const store = db.createObjectStore('records', { keyPath: 'id' });
                    store.createIndex('livestock', 'livestock', { unique: false });
                }
                if (!db.objectStoreNames.contains('transactions')) {
                    const store = db.createObjectStore('transactions', { keyPath: 'id' });
                    store.createIndex('livestock', 'livestock', { unique: false });
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
            const index = store.index(indexName); // This is where the error was happening
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
            store.put(data);
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }
};
