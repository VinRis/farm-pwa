const DB_NAME = 'FarmTrackDB';
const DB_VERSION = 7; // Increment to ensure all stores & indexes are created

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
    async getAll(store, indexName, val) {
        const db = await this.open();
        const tx = db.transaction(store, 'readonly');
        const idx = tx.objectStore(store).index(indexName);
        return new Promise(r => idx.getAll(val).onsuccess = (e) => r(e.target.result));
    },
    async delete(store, id) {
        const db = await this.open();
        const tx = db.transaction(store, 'readwrite');
        tx.objectStore(store).delete(id);
        return new Promise(r => tx.oncomplete = () => r(true));
    }
};
