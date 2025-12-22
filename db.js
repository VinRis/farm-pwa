const DB_NAME = 'FarmTrackDB';
const DB_VERSION = 10; // Forced high version to reset everything

export const DB = {
    open() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                const stores = ['records', 'transactions', 'reminders'];
                stores.forEach(name => {
                    if (!db.objectStoreNames.contains(name)) {
                        const store = db.createObjectStore(name, { keyPath: 'id' });
                        store.createIndex('livestock', 'livestock', { unique: false });
                    }
                });
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },
    async add(store, data) {
        const db = await this.open();
        const tx = db.transaction(store, 'readwrite');
        tx.objectStore(store).add(data);
        return new Promise(r => tx.oncomplete = () => r(true));
    },
    async getAll(storeName, indexName, val) {
        const db = await this.open();
        return new Promise((resolve) => {
            const tx = db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.getAll(val);
            request.onsuccess = () => resolve(request.result || []);
        });
    }
};
