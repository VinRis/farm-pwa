// IndexedDB wrapper for offline data storage
class OfflineDB {
    constructor(dbName = 'FarmManagerDB', version = 3) {
        this.dbName = dbName;
        this.version = version;
        this.db = null;
        this.isInitialized = false;
    }
    
    async init() {
        if (this.isInitialized) {
            return this.db;
        }
        
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);
            
            request.onerror = (event) => {
                console.error('IndexedDB error:', event.target.error);
                reject(event.target.error);
            };
            
            request.onsuccess = (event) => {
                this.db = event.target.result;
                this.isInitialized = true;
                console.log('IndexedDB initialized successfully');
                resolve(this.db);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                const oldVersion = event.oldVersion;
                
                console.log(`Upgrading database from version ${oldVersion} to ${this.version}`);
                
                // Create object stores if they don't exist
                if (!db.objectStoreNames.contains('dairy_cows')) {
                    const store = db.createObjectStore('dairy_cows', { keyPath: 'id' });
                    store.createIndex('by_health', 'healthStatus');
                    store.createIndex('by_tag', 'tagNumber');
                    store.createIndex('by_sync', 'synced');
                    store.createIndex('by_breeding', 'breedingStatus');
                    console.log('Created dairy_cows store');
                }
                
                if (!db.objectStoreNames.contains('poultry_flocks')) {
                    const store = db.createObjectStore('poultry_flocks', { keyPath: 'id' });
                    store.createIndex('by_health', 'healthStatus');
                    store.createIndex('by_type', 'birdType');
                    store.createIndex('by_sync', 'synced');
                    console.log('Created poultry_flocks store');
                }
                
                if (!db.objectStoreNames.contains('milk_records')) {
                    const store = db.createObjectStore('milk_records', { keyPath: 'id', autoIncrement: true });
                    store.createIndex('by_cow', 'cowId');
                    store.createIndex('by_date', 'date');
                    store.createIndex('by_sync', 'synced');
                    console.log('Created milk_records store');
                }
                
                if (!db.objectStoreNames.contains('egg_records')) {
                    const store = db.createObjectStore('egg_records', { keyPath: 'id', autoIncrement: true });
                    store.createIndex('by_flock', 'flockId');
                    store.createIndex('by_date', 'date');
                    store.createIndex('by_sync', 'synced');
                    console.log('Created egg_records store');
                }
                
                if (!db.objectStoreNames.contains('feed_inventory')) {
                    const store = db.createObjectStore('feed_inventory', { keyPath: 'type' });
                    store.createIndex('by_amount', 'amount');
                    store.createIndex('by_sync', 'synced');
                    console.log('Created feed_inventory store');
                }
                
                if (!db.objectStoreNames.contains('sync_queue')) {
                    const store = db.createObjectStore('sync_queue', { 
                        keyPath: 'id',
                        autoIncrement: true 
                    });
                    store.createIndex('by_type', 'dataType');
                    store.createIndex('by_status', 'synced');
                    store.createIndex('by_timestamp', 'timestamp');
                    console.log('Created sync_queue store');
                }
                
                if (!db.objectStoreNames.contains('health_records')) {
                    const store = db.createObjectStore('health_records', { 
                        keyPath: 'id',
                        autoIncrement: true 
                    });
                    store.createIndex('by_animal', 'animalId');
                    store.createIndex('by_date', 'date');
                    store.createIndex('by_type', 'animalType');
                    console.log('Created health_records store');
                }
                
                if (!db.objectStoreNames.contains('app_settings')) {
                    const store = db.createObjectStore('app_settings', { keyPath: 'key' });
                    console.log('Created app_settings store');
                }
                
                // Migration from old versions
                if (oldVersion < 2) {
                    // Migration logic for version 1 to 2
                    console.log('Migrating from version 1 to 2');
                }
                
                if (oldVersion < 3) {
                    // Migration logic for version 2 to 3
                    console.log('Migrating from version 2 to 3');
                }
            };
            
            request.onblocked = (event) => {
                console.warn('Database upgrade blocked. Close other tabs using this database.');
                reject(new Error('Database upgrade blocked'));
            };
        });
    }
    
    // Generic CRUD operations
    async get(storeName, key) {
        await this.ensureInitialized();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
            
            request.onsuccess = (event) => {
                resolve(event.target.result);
            };
        });
    }
    
    async getAll(storeName, indexName = null, query = null) {
        await this.ensureInitialized();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            let request;
            
            if (indexName && query) {
                const index = store.index(indexName);
                request = index.getAll(query);
            } else if (indexName) {
                const index = store.index(indexName);
                request = index.getAll();
            } else {
                request = store.getAll();
            }
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
            
            request.onsuccess = (event) => {
                resolve(event.target.result);
            };
        });
    }
    
    async put(storeName, data) {
        await this.ensureInitialized();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
            
            request.onsuccess = (event) => {
                resolve(event.target.result);
            };
        });
    }
    
    async add(storeName, data) {
        await this.ensureInitialized();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.add(data);
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
            
            request.onsuccess = (event) => {
                resolve(event.target.result);
            };
        });
    }
    
    async delete(storeName, key) {
        await this.ensureInitialized();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(key);
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
            
            request.onsuccess = (event) => {
                resolve(event.target.result);
            };
        });
    }
    
    async clear(storeName) {
        await this.ensureInitialized();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
            
            request.onsuccess = (event) => {
                resolve();
            };
        });
    }
    
    async count(storeName, indexName = null, query = null) {
        await this.ensureInitialized();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            let request;
            
            if (indexName && query) {
                const index = store.index(indexName);
                request = index.count(query);
            } else if (indexName) {
                const index = store.index(indexName);
                request = index.count();
            } else {
                request = store.count();
            }
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
            
            request.onsuccess = (event) => {
                resolve(event.target.result);
            };
        });
    }
    
    // Dairy-specific operations
    async getDairyCows(filter = {}) {
        let cows = await this.getAll('dairy_cows');
        
        // Apply filters
        if (filter.healthStatus) {
            cows = cows.filter(cow => cow.healthStatus === filter.healthStatus);
        }
        
        if (filter.breedingStatus) {
            cows = cows.filter(cow => cow.breedingStatus === filter.breedingStatus);
        }
        
        if (filter.minAge) {
            cows = cows.filter(cow => {
                const age = this.calculateCowAge(cow);
                return age >= filter.minAge;
            });
        }
        
        if (filter.maxAge) {
            cows = cows.filter(cow => {
                const age = this.calculateCowAge(cow);
                return age <= filter.maxAge;
            });
        }
        
        return cows;
    }
    
    async getCow(cowId) {
        return this.get('dairy_cows', cowId);
    }
    
    async saveCow(cowData) {
        // Ensure required fields
        if (!cowData.id) {
            cowData.id = 'cow_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        }
        
        if (!cowData.createdAt) {
            cowData.createdAt = new Date().toISOString();
        }
        
        cowData.updatedAt = new Date().toISOString();
        
        // If offline, mark as needing sync
        if (!navigator.onLine) {
            cowData.synced = false;
        } else {
            cowData.synced = true;
        }
        
        return this.put('dairy_cows', cowData);
    }
    
    async getMilkRecords(cowId = null, startDate = null, endDate = null) {
        let records;
        
        if (cowId) {
            records = await this.getAll('milk_records', 'by_cow', cowId);
        } else {
            records = await this.getAll('milk_records');
        }
        
        // Filter by date range if provided
        if (startDate) {
            const start = new Date(startDate);
            records = records.filter(record => new Date(record.date) >= start);
        }
        
        if (endDate) {
            const end = new Date(endDate);
            records = records.filter(record => new Date(record.date) <= end);
        }
        
        // Sort by date (newest first)
        records.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        return records;
    }
    
    async recordMilking(cowId, amount, time = 'morning', date = null) {
        const record = {
            cowId: cowId,
            amount: parseFloat(amount),
            time: time,
            date: date || new Date().toISOString().split('T')[0],
            recordedAt: new Date().toISOString(),
            synced: navigator.onLine
        };
        
        // Also update the cow's last milking time
        const cow = await this.getCow(cowId);
        if (cow) {
            cow.lastMilking = new Date().toISOString();
            if (!cow.milkProduction) {
                cow.milkProduction = [];
            }
            cow.milkProduction.push({
                date: record.date,
                amount: record.amount,
                time: record.time
            });
            await this.saveCow(cow);
        }
        
        return this.add('milk_records', record);
    }
    
    // Poultry-specific operations
    async getPoultryFlocks(filter = {}) {
        let flocks = await this.getAll('poultry_flocks');
        
        // Apply filters
        if (filter.birdType) {
            flocks = flocks.filter(flock => flock.birdType === filter.birdType);
        }
        
        if (filter.healthStatus) {
            flocks = flocks.filter(flock => flock.healthStatus === filter.healthStatus);
        }
        
        if (filter.minBirdCount) {
            flocks = flocks.filter(flock => flock.birdCount >= filter.minBirdCount);
        }
        
        if (filter.maxBirdCount) {
            flocks = flocks.filter(flock => flock.birdCount <= filter.maxBirdCount);
        }
        
        return flocks;
    }
    
    async getFlock(flockId) {
        return this.get('poultry_flocks', flockId);
    }
    
    async saveFlock(flockData) {
        // Ensure required fields
        if (!flockData.id) {
            flockData.id = 'flock_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        }
        
        if (!flockData.createdAt) {
            flockData.createdAt = new Date().toISOString();
        }
        
        flockData.updatedAt = new Date().toISOString();
        
        // Calculate age if startDate is provided
        if (flockData.startDate && !flockData.age) {
            const start = new Date(flockData.startDate);
            const today = new Date();
            const ageInDays = Math.floor((today - start) / (1000 * 60 * 60 * 24));
            flockData.age = ageInDays;
        }
        
        // If offline, mark as needing sync
        if (!navigator.onLine) {
            flockData.synced = false;
        } else {
            flockData.synced = true;
        }
        
        return this.put('poultry_flocks', flockData);
    }
    
    async getEggRecords(flockId = null, startDate = null, endDate = null) {
        let records;
        
        if (flockId) {
            records = await this.getAll('egg_records', 'by_flock', flockId);
        } else {
            records = await this.getAll('egg_records');
        }
        
        // Filter by date range if provided
        if (startDate) {
            const start = new Date(startDate);
            records = records.filter(record => new Date(record.date) >= start);
        }
        
        if (endDate) {
            const end = new Date(endDate);
            records = records.filter(record => new Date(record.date) <= end);
        }
        
        // Sort by date (newest first)
        records.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        return records;
    }
    
    async recordEggCollection(flockId, count, date = null) {
        const record = {
            flockId: flockId,
            count: parseInt(count),
            date: date || new Date().toISOString().split('T')[0],
            recordedAt: new Date().toISOString(),
            synced: navigator.onLine
        };
        
        // Also update the flock's egg production
        const flock = await this.getFlock(flockId);
        if (flock) {
            if (!flock.eggProduction) {
                flock.eggProduction = {};
            }
            
            const dateKey = record.date;
            flock.eggProduction[dateKey] = (flock.eggProduction[dateKey] || 0) + record.count;
            flock.totalEggs = (flock.totalEggs || 0) + record.count;
            
            await this.saveFlock(flock);
        }
        
        return this.add('egg_records', record);
    }
    
    // Feed inventory operations
    async getFeedInventory() {
        const inventory = await this.getAll('feed_inventory');
        
        // Convert array to object for easier access
        const inventoryObj = {};
        inventory.forEach(item => {
            inventoryObj[item.type] = item.amount;
        });
        
        return inventoryObj;
    }
    
    async updateFeedInventory(feedType, amount, operation = 'set') {
        const existing = await this.get('feed_inventory', feedType);
        let newAmount;
        
        if (existing) {
            if (operation === 'add') {
                newAmount = existing.amount + amount;
            } else if (operation === 'remove') {
                newAmount = Math.max(0, existing.amount - amount);
            } else if (operation === 'set') {
                newAmount = amount;
            } else {
                throw new Error(`Invalid operation: ${operation}`);
            }
        } else {
            if (operation === 'add' || operation === 'set') {
                newAmount = amount;
            } else {
                throw new Error(`Cannot ${operation} non-existent feed type`);
            }
        }
        
        const feedItem = {
            type: feedType,
            amount: newAmount,
            updatedAt: new Date().toISOString(),
            synced: navigator.onLine
        };
        
        if (!existing) {
            feedItem.createdAt = new Date().toISOString();
        }
        
        return this.put('feed_inventory', feedItem);
    }
    
    async getLowStockItems(threshold = 50) {
        const inventory = await this.getAll('feed_inventory');
        return inventory.filter(item => item.amount < threshold);
    }
    
    // Sync queue operations
    async addToSyncQueue(dataType, action, data) {
        const queueItem = {
            dataType: dataType,
            action: action,
            data: data,
            timestamp: new Date().toISOString(),
            synced: false,
            attempts: 0,
            lastAttempt: null
        };
        
        return this.add('sync_queue', queueItem);
    }
    
    async getPendingSyncs(dataType = null) {
        let pending;
        
        if (dataType) {
            pending = await this.getAll('sync_queue', 'by_type', dataType);
        } else {
            pending = await this.getAll('sync_queue');
        }
        
        return pending.filter(item => !item.synced);
    }
    
    async markAsSynced(queueId, success = true, error = null) {
        const item = await this.get('sync_queue', queueId);
        
        if (item) {
            item.synced = success;
            item.lastAttempt = new Date().toISOString();
            item.attempts = (item.attempts || 0) + 1;
            
            if (error) {
                item.lastError = error.message || String(error);
            }
            
            return this.put('sync_queue', item);
        }
        
        return null;
    }
    
    async clearSyncedItems() {
        const allItems = await this.getAll('sync_queue');
        const syncedItems = allItems.filter(item => item.synced);
        
        // Delete synced items
        for (const item of syncedItems) {
            await this.delete('sync_queue', item.id);
        }
        
        return syncedItems.length;
    }
    
    // Health records operations
    async recordHealthCheck(animalId, animalType, status, notes = '', date = null) {
        const record = {
            animalId: animalId,
            animalType: animalType, // 'dairy' or 'poultry'
            status: status,
            notes: notes,
            date: date || new Date().toISOString().split('T')[0],
            recordedAt: new Date().toISOString()
        };
        
        // Update the animal's health status
        if (animalType === 'dairy') {
            const cow = await this.getCow(animalId);
            if (cow) {
                cow.healthStatus = status;
                if (!cow.healthNotes) {
                    cow.healthNotes = [];
                }
                cow.healthNotes.push({
                    date: record.date,
                    status: status,
                    notes: notes
                });
                await this.saveCow(cow);
            }
        } else if (animalType === 'poultry') {
            const flock = await this.getFlock(animalId);
            if (flock) {
                flock.healthStatus = status;
                await this.saveFlock(flock);
            }
        }
        
        return this.add('health_records', record);
    }
    
    async getHealthHistory(animalId, animalType = null, limit = 50) {
        let records;
        
        if (animalId) {
            records = await this.getAll('health_records', 'by_animal', animalId);
        } else if (animalType) {
            records = await this.getAll('health_records', 'by_type', animalType);
        } else {
            records = await this.getAll('health_records');
        }
        
        // Sort by date (newest first)
        records.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Apply limit
        if (limit) {
            records = records.slice(0, limit);
        }
        
        return records;
    }
    
    // App settings operations
    async getSetting(key, defaultValue = null) {
        try {
            const setting = await this.get('app_settings', key);
            return setting ? setting.value : defaultValue;
        } catch (error) {
            return defaultValue;
        }
    }
    
    async setSetting(key, value) {
        const setting = {
            key: key,
            value: value,
            updatedAt: new Date().toISOString()
        };
        
        return this.put('app_settings', setting);
    }
    
    async getLivestockMode() {
        return this.getSetting('livestock_mode', 'dairy');
    }
    
    async setLivestockMode(mode) {
        return this.setSetting('livestock_mode', mode);
    }
    
    // Statistics and calculations
    async getDairyStats() {
        const cows = await this.getDairyCows();
        
        const stats = {
            totalCows: cows.length,
            healthyCows: cows.filter(c => c.healthStatus === 'healthy').length,
            needsCheckup: cows.filter(c => c.healthStatus === 'needs_checkup').length,
            sickCows: cows.filter(c => c.healthStatus === 'sick').length,
            pregnantCows: cows.filter(c => c.breedingStatus === 'pregnant').length,
            milkingToday: 0,
            totalMilkToday: 0
        };
        
        // Calculate today's milk production
        const today = new Date().toISOString().split('T')[0];
        const todayRecords = await this.getMilkRecords(null, today, today);
        
        stats.milkingToday = new Set(todayRecords.map(r => r.cowId)).size;
        stats.totalMilkToday = todayRecords.reduce((sum, record) => sum + record.amount, 0);
        
        // Calculate average milk production
        const lastWeek = new Date();
        lastWeek.setDate(lastWeek.getDate() - 7);
        const lastWeekRecords = await this.getMilkRecords(null, lastWeek.toISOString().split('T')[0], today);
        
        if (lastWeekRecords.length > 0) {
            stats.avgMilkPerDay = lastWeekRecords.reduce((sum, r) => sum + r.amount, 0) / 7;
            stats.avgMilkPerCow = stats.avgMilkPerDay / stats.totalCows;
        }
        
        return stats;
    }
    
    async getPoultryStats() {
        const flocks = await this.getPoultryFlocks();
        
        const stats = {
            totalFlocks: flocks.length,
            totalBirds: flocks.reduce((sum, flock) => sum + (flock.birdCount || 0), 0),
            layerFlocks: flocks.filter(f => f.birdType === 'Layers').length,
            broilerFlocks: flocks.filter(f => f.birdType === 'Broilers').length,
            healthyFlocks: flocks.filter(f => f.healthStatus === 'healthy').length,
            needsCheckup: flocks.filter(f => f.healthStatus === 'needs_checkup').length,
            todayEggs: 0,
            totalEggsThisMonth: 0
        };
        
        // Calculate egg production
        const today = new Date().toISOString().split('T')[0];
        const thisMonth = new Date().getMonth();
        
        const layerFlocks = flocks.filter(f => f.birdType === 'Layers');
        
        layerFlocks.forEach(flock => {
            if (flock.eggProduction) {
                // Today's eggs
                if (flock.eggProduction[today]) {
                    stats.todayEggs += flock.eggProduction[today];
                }
                
                // This month's eggs
                Object.entries(flock.eggProduction).forEach(([date, count]) => {
                    const recordMonth = new Date(date).getMonth();
                    if (recordMonth === thisMonth) {
                        stats.totalEggsThisMonth += count;
                    }
                });
            }
        });
        
        // Calculate feed consumption
        const feedInventory = await this.getFeedInventory();
        stats.feedOnHand = Object.values(feedInventory).reduce((sum, amount) => sum + amount, 0);
        
        return stats;
    }
    
    // Helper methods
    calculateCowAge(cow) {
        if (!cow.age) {
            return 0;
        }
        
        // Parse age string like "4 years" or "2.5 years"
        const match = cow.age.match(/(\d+(?:\.\d+)?)\s*(year|yr|y)/i);
        if (match) {
            return parseFloat(match[1]);
        }
        
        return 0;
    }
    
    async ensureInitialized() {
        if (!this.isInitialized) {
            await this.init();
        }
    }
    
    async clearAllData() {
        await this.ensureInitialized();
        
        const stores = [
            'dairy_cows',
            'poultry_flocks',
            'milk_records',
            'egg_records',
            'feed_inventory',
            'sync_queue',
            'health_records'
        ];
        
        for (const storeName of stores) {
            await this.clear(storeName);
        }
        
        console.log('All data cleared from IndexedDB');
    }
    
    async exportData() {
        await this.ensureInitialized();
        
        const exportData = {
            timestamp: new Date().toISOString(),
            version: this.version,
            data: {}
        };
        
        // Export all stores
        const stores = [
            'dairy_cows',
            'poultry_flocks',
            'milk_records',
            'egg_records',
            'feed_inventory',
            'sync_queue',
            'health_records',
            'app_settings'
        ];
        
        for (const storeName of stores) {
            try {
                exportData.data[storeName] = await this.getAll(storeName);
            } catch (error) {
                console.warn(`Failed to export ${storeName}:`, error);
                exportData.data[storeName] = [];
            }
        }
        
        return exportData;
    }
    
    async importData(importData) {
        await this.ensureInitialized();
        
        if (!importData || !importData.data) {
            throw new Error('Invalid import data format');
        }
        
        // Clear existing data
        await this.clearAllData();
        
        // Import data to each store
        for (const [storeName, data] of Object.entries(importData.data)) {
            if (Array.isArray(data)) {
                for (const item of data) {
                    try {
                        await this.put(storeName, item);
                    } catch (error) {
                        console.warn(`Failed to import item to ${storeName}:`, error);
                    }
                }
            }
        }
        
        console.log('Data imported successfully');
        return true;
    }
    
    // Backup and restore
    async createBackup() {
        const data = await this.exportData();
        const backup = {
            type: 'farm_manager_backup',
            version: '1.0',
            created: new Date().toISOString(),
            data: JSON.stringify(data)
        };
        
        // Create a download link
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `farm_manager_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        return backup;
    }
    
    async restoreBackup(backupData) {
        if (typeof backupData === 'string') {
            backupData = JSON.parse(backupData);
        }
        
        if (backupData.type !== 'farm_manager_backup') {
            throw new Error('Invalid backup file format');
        }
        
        const data = JSON.parse(backupData.data);
        return this.importData(data);
    }
}

// Create singleton instance
const offlineDb = new OfflineDB();

// Export for use in other modules
export default offlineDb;

// Also make available globally for debugging
if (typeof window !== 'undefined') {
    window.offlineDb = offlineDb;
}