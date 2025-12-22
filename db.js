const DB_NAME = 'FarmTrackDB';
const DB_VERSION = 6; // Increased version to fix the index error

export const DB = {
    open() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                const stores = ['records', 'transactions'];
                
                stores.forEach(storeName => {
                    if (!db.objectStoreNames.contains(storeName)) {
                        const store = db.createObjectStore(storeName, { keyPath: 'id' });
                        // This index is required for the "getAll" filtering to work
                        store.createIndex('livestock', 'livestock', { unique: false });
                    }
                });
            };

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async add(storeName, data) {
        const db = await this.open();
        return new Promise((resolve) => {
            const transaction = db.transaction(storeName, 'readwrite');
            transaction.objectStore(storeName).add(data);
            transaction.oncomplete = () => resolve(true);
        });
    },

    async getAll(storeName, indexName, indexValue) {
        const db = await this.open();
        return new Promise((resolve) => {
            const transaction = db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.getAll(indexValue);
            request.onsuccess = () => resolve(request.result);
        });
    },

    async delete(storeName, id) {
        const db = await this.open();
        return new Promise((resolve) => {
            const transaction = db.transaction(storeName, 'readwrite');
            transaction.objectStore(storeName).delete(id);
            transaction.oncomplete = () => resolve(true);
        });
    }
};
