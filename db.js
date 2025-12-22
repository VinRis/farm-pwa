const DB_NAME = 'farmtrack-db';

const DB_VERSION = 2; // Incremented version to trigger the new 'reminders' store



export const dbPromise = new Promise((resolve, reject) => {

    const request = indexedDB.open(DB_NAME, DB_VERSION);



    request.onupgradeneeded = (e) => {

        const db = e.target.result;

        

        // Records Store

        if (!db.objectStoreNames.contains('records')) {

            const store = db.createObjectStore('records', { keyPath: 'id' });

            store.createIndex('livestock', 'livestock', { unique: false });

            store.createIndex('date', 'date', { unique: false });

        }



        // Transactions Store

        if (!db.objectStoreNames.contains('transactions')) {

            const store = db.createObjectStore('transactions', { keyPath: 'id' });

            store.createIndex('livestock', 'livestock', { unique: false });

            store.createIndex('date', 'date', { unique: false });

        }



        // Reminders Store (NEW - Matches the new app features)

        if (!db.objectStoreNames.contains('reminders')) {

            const store = db.createObjectStore('reminders', { keyPath: 'id' });

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



const getStore = async (storeName, mode) => {

    const db = await dbPromise;

    return db.transaction(storeName, mode).objectStore(storeName);

};



export const DB = {

    async getAll(storeName, indexName, value) {

        const store = await getStore(storeName, 'readonly');

        return new Promise((resolve, reject) => {

            let request = (indexName && value) ? store.index(indexName).getAll(value) : store.getAll();

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

        const stores = ['records', 'transactions', 'meta', 'reminders'];

        const data = {};

        for (const s of stores) {

            data[s] = await this.getAll(s);

        }

        return data;

    },



    async restore(data) {

        const db = await dbPromise;

        const tx = db.transaction(Object.keys(data), 'readwrite');

        for (const storeName of Object.keys(data)) {

            const store = tx.objectStore(storeName);

            store.clear(); 

            for (const item of data[storeName]) {

                store.put(item);

            }

        }

        return new Promise((resolve) => { tx.oncomplete = () => resolve(); });

    }

};
