// Sample Data for Farm Manager PWA

export const SampleData = {
    // Sample Dairy Cattle
    dairyCows: [
        {
            id: 'cow_001',
            name: 'Bella',
            tagNumber: 'D001',
            breed: 'Holstein',
            age: '4 years 2 months',
            dateOfBirth: '2019-11-15',
            weight: 650,
            healthStatus: 'healthy',
            breedingStatus: 'pregnant',
            lastCalving: '2023-03-20',
            expectedCalving: '2024-03-15',
            lastMilking: new Date().toISOString(),
            avgMilkProduction: 24.5,
            milkRecords: [
                { date: '2024-01-15', morning: 24.5, evening: 22.3, total: 46.8 },
                { date: '2024-01-14', morning: 25.2, evening: 23.1, total: 48.3 },
                { date: '2024-01-13', morning: 23.8, evening: 21.9, total: 45.7 }
            ],
            vaccinations: [
                { type: 'BVD', date: '2024-01-01', nextDue: '2024-07-01' },
                { type: 'IBR', date: '2023-12-15', nextDue: '2024-12-15' }
            ],
            healthNotes: [
                { date: '2024-01-10', status: 'healthy', notes: 'Routine checkup - all good' },
                { date: '2023-12-05', status: 'needs_checkup', notes: 'Minor hoof issue, treated' }
            ],
            notes: 'High milk producer, calm temperament. Due for hoof trimming next month.'
        },
        {
            id: 'cow_002',
            name: 'Daisy',
            tagNumber: 'D002',
            breed: 'Jersey',
            age: '3 years 6 months',
            dateOfBirth: '2020-07-20',
            weight: 450,
            healthStatus: 'needs_checkup',
            breedingStatus: 'open',
            lastCalving: '2023-05-10',
            expectedCalving: null,
            lastMilking: new Date(Date.now() - 86400000).toISOString(),
            avgMilkProduction: 18.2,
            milkRecords: [
                { date: '2024-01-15', morning: 18.2, evening: 0, total: 18.2 },
                { date: '2024-01-14', morning: 19.1, evening: 17.5, total: 36.6 },
                { date: '2024-01-13', morning: 17.8, evening: 16.9, total: 34.7 }
            ],
            vaccinations: [
                { type: 'BVD', date: '2023-12-15', nextDue: '2024-06-15' },
                { type: 'Leptospirosis', date: '2023-11-30', nextDue: '2024-11-30' }
            ],
            healthNotes: [
                { date: '2024-01-12', status: 'needs_checkup', notes: 'Slight drop in milk production' },
                { date: '2023-11-20', status: 'healthy', notes: 'Vaccination administered' }
            ],
            notes: 'Good butterfat content. Monitor milk production.'
        },
        {
            id: 'cow_003',
            name: 'Molly',
            tagNumber: 'D003',
            breed: 'Holstein',
            age: '5 years 1 month',
            dateOfBirth: '2018-12-10',
            weight: 700,
            healthStatus: 'healthy',
            breedingStatus: 'pregnant',
            lastCalving: '2023-02-28',
            expectedCalving: '2024-04-10',
            lastMilking: new Date().toISOString(),
            avgMilkProduction: 26.8,
            milkRecords: [
                { date: '2024-01-15', morning: 26.8, evening: 0, total: 26.8 },
                { date: '2024-01-14', morning: 27.5, evening: 25.2, total: 52.7 },
                { date: '2024-01-13', morning: 26.2, evening: 24.8, total: 51.0 }
            ],
            vaccinations: [
                { type: 'BVD', date: '2024-01-05', nextDue: '2024-07-05' },
                { type: 'IBR', date: '2023-12-20', nextDue: '2024-12-20' }
            ],
            healthNotes: [
                { date: '2024-01-08', status: 'healthy', notes: 'Routine checkup - excellent condition' },
                { date: '2023-11-15', status: 'recovering', notes: 'Treated for mastitis, recovered well' }
            ],
            notes: 'Highest producer in herd. Due for hoof trimming soon.'
        },
        {
            id: 'cow_004',
            name: 'Buttercup',
            tagNumber: 'D004',
            breed: 'Brown Swiss',
            age: '2 years 8 months',
            dateOfBirth: '2021-05-15',
            weight: 580,
            healthStatus: 'healthy',
            breedingStatus: 'in_heat',
            lastCalving: '2023-08-05',
            expectedCalving: null,
            lastMilking: new Date().toISOString(),
            avgMilkProduction: 22.3,
            milkRecords: [
                { date: '2024-01-15', morning: 22.3, evening: 20.1, total: 42.4 },
                { date: '2024-01-14', morning: 21.8, evening: 19.7, total: 41.5 },
                { date: '2024-01-13', morning: 23.1, evening: 20.8, total: 43.9 }
            ],
            vaccinations: [
                { type: 'BVD', date: '2023-11-10', nextDue: '2024-05-10' }
            ],
            healthNotes: [
                { date: '2024-01-05', status: 'healthy', notes: 'First lactation going well' }
            ],
            notes: 'Young cow, first lactation. Showing good potential.'
        },
        {
            id: 'cow_005',
            name: 'Rosie',
            tagNumber: 'D005',
            breed: 'Ayrshire',
            age: '6 years 3 months',
            dateOfBirth: '2017-10-05',
            weight: 620,
            healthStatus: 'sick',
            breedingStatus: 'dry',
            lastCalving: '2023-11-20',
            expectedCalving: null,
            lastMilking: new Date(Date.now() - 172800000).toISOString(),
            avgMilkProduction: 19.8,
            milkRecords: [
                { date: '2024-01-13', morning: 19.8, evening: 18.2, total: 38.0 },
                { date: '2024-01-12', morning: 20.1, evening: 18.5, total: 38.6 },
                { date: '2024-01-11', morning: 18.9, evening: 17.8, total: 36.7 }
            ],
            vaccinations: [
                { type: 'BVD', date: '2023-10-15', nextDue: '2024-04-15' },
                { type: 'Leptospirosis', date: '2023-09-30', nextDue: '2024-09-30' }
            ],
            healthNotes: [
                { date: '2024-01-14', status: 'sick', notes: 'Showing signs of lameness, treatment started' },
                { date: '2023-12-01', status: 'healthy', notes: 'Dry period started' }
            ],
            notes: 'Experienced cow, currently dry period. Monitor lameness treatment.'
        }
    ],
    
    // Sample Poultry Flocks
    poultryFlocks: [
        {
            id: 'flock_001',
            name: 'Layer Flock A',
            birdType: 'layers',
            breed: 'Hybrid Layer',
            birdCount: 500,
            startDate: '2023-09-15',
            age: 120, // days
            healthStatus: 'healthy',
            mortalityRate: 2.5,
            mortalityCount: 13,
            eggProduction: {
                '2024-01-15': 480,
                '2024-01-14': 475,
                '2024-01-13': 490,
                '2024-01-12': 485,
                '2024-01-11': 478,
                '2024-01-10': 492,
                '2024-01-09': 488
            },
            avgEggProduction: 87.5, // percentage
            avgEggWeight: 62, // grams
            feedType: 'Layer Mash',
            dailyFeed: 75, // kg per day
            waterConsumption: 125, // liters per day
            vaccinationSchedule: [
                { type: 'Newcastle', date: '2023-10-01', nextDue: '2024-04-01' },
                { type: 'Marek', date: '2023-09-20', nextDue: null },
                { type: 'IBD', date: '2023-10-15', nextDue: '2024-01-15' }
            ],
            housingType: 'battery_cages',
            notes: 'Good production rate, consistent layers. Peak production expected next month.'
        },
        {
            id: 'flock_002',
            name: 'Broiler Flock B',
            birdType: 'broilers',
            breed: 'Cobb 500',
            birdCount: 1000,
            startDate: '2024-01-01',
            age: 15, // days
            healthStatus: 'needs_checkup',
            mortalityRate: 1.2,
            mortalityCount: 12,
            currentWeight: 0.8, // average kg per bird
            targetWeight: 2.5,
            feedConversionRatio: 1.6,
            feedType: 'Broiler Starter',
            dailyFeed: 120, // kg per day
            waterConsumption: 200, // liters per day
            vaccinationSchedule: [
                { type: 'IBD', date: '2024-01-05', nextDue: null },
                { type: 'Newcastle', date: '2024-01-10', nextDue: null }
            ],
            housingType: 'deep_litter',
            notes: 'Growing well, monitor for respiratory issues. On track for 8-week cycle.'
        },
        {
            id: 'flock_003',
            name: 'Free Range Layers',
            birdType: 'layers',
            breed: 'Rhode Island Red',
            birdCount: 200,
            startDate: '2023-11-01',
            age: 75, // days
            healthStatus: 'healthy',
            mortalityRate: 1.8,
            mortalityCount: 4,
            eggProduction: {
                '2024-01-15': 180,
                '2024-01-14': 175,
                '2024-01-13': 185,
                '2024-01-12': 178,
                '2024-01-11': 182
            },
            avgEggProduction: 90.5, // percentage
            avgEggWeight: 58, // grams
            feedType: 'Layer Pellets',
            dailyFeed: 30, // kg per day
            waterConsumption: 50, // liters per day
            vaccinationSchedule: [
                { type: 'Newcastle', date: '2023-11-15', nextDue: '2024-05-15' },
                { type: 'Marek', date: '2023-11-05', nextDue: null }
            ],
            housingType: 'free_range',
            notes: 'Free range, organic production. Lower density, higher welfare standards.'
        },
        {
            id: 'flock_004',
            name: 'Breeder Flock',
            birdType: 'breeders',
            breed: 'Ross 308',
            birdCount: 150,
            startDate: '2023-08-10',
            age: 160, // days
            healthStatus: 'healthy',
            mortalityRate: 3.0,
            mortalityCount: 5,
            eggProduction: {
                '2024-01-15': 135,
                '2024-01-14': 132,
                '2024-01-13': 138,
                '2024-01-12': 130,
                '2024-01-11': 136
            },
            avgEggProduction: 90.0, // percentage
            fertilityRate: 92, // percentage
            hatchRate: 85, // percentage
            feedType: 'Breeder Feed',
            dailyFeed: 22.5, // kg per day
            waterConsumption: 37.5, // liters per day
            vaccinationSchedule: [
                { type: 'Newcastle', date: '2023-09-01', nextDue: '2024-03-01' },
                { type: 'IBD', date: '2023-09-15', nextDue: '2023-12-15' }
            ],
            housingType: 'aviaries',
            notes: 'Breeder flock for hatching eggs. Maintain strict biosecurity.'
        }
    ],
    
    // Sample Feed Inventory
    feedInventory: [
        {
            id: 'feed_001',
            type: 'Layer Mash',
            currentStock: 850, // kg
            unit: 'kg',
            lastRestocked: '2024-01-10',
            consumptionRate: 75, // kg per day
            daysRemaining: 11,
            supplier: 'ABC Feeds',
            pricePerKg: 0.45,
            lowStockThreshold: 100
        },
        {
            id: 'feed_002',
            type: 'Broiler Starter',
            currentStock: 420, // kg
            unit: 'kg',
            lastRestocked: '2024-01-12',
            consumptionRate: 120, // kg per day
            daysRemaining: 3.5,
            supplier: 'XYZ Nutrition',
            pricePerKg: 0.52,
            lowStockThreshold: 50
        },
        {
            id: 'feed_003',
            type: 'Layer Pellets',
            currentStock: 320, // kg
            unit: 'kg',
            lastRestocked: '2024-01-05',
            consumptionRate: 30, // kg per day
            daysRemaining: 10.7,
            supplier: 'Organic Feeds Co.',
            pricePerKg: 0.65,
            lowStockThreshold: 50
        },
        {
            id: 'feed_004',
            type: 'Grower Feed',
            currentStock: 180, // kg
            unit: 'kg',
            lastRestocked: '2023-12-28',
            consumptionRate: 15, // kg per day
            daysRemaining: 12,
            supplier: 'ABC Feeds',
            pricePerKg: 0.48,
            lowStockThreshold: 30
        },
        {
            id: 'feed_005',
            type: 'Grit',
            currentStock: 150, // kg
            unit: 'kg',
            lastRestocked: '2024-01-08',
            consumptionRate: 2, // kg per day
            daysRemaining: 75,
            supplier: 'Mineral Supplies',
            pricePerKg: 0.25,
            lowStockThreshold: 20
        },
        {
            id: 'feed_006',
            type: 'Shell Grit',
            currentStock: 200, // kg
            unit: 'kg',
            lastRestocked: '2024-01-03',
            consumptionRate: 3, // kg per day
            daysRemaining: 66.7,
            supplier: 'Mineral Supplies',
            pricePerKg: 0.30,
            lowStockThreshold: 20
        }
    ],
    
    // Sample Milk Production Records
    milkProductionRecords: [
        {
            id: 'milk_001',
            cowId: 'cow_001',
            date: '2024-01-15',
            morning: 24.5,
            evening: 22.3,
            total: 46.8,
            fatContent: 3.9,
            proteinContent: 3.3,
            temperature: 4.2,
            notes: 'Normal production'
        },
        {
            id: 'milk_002',
            cowId: 'cow_002',
            date: '2024-01-15',
            morning: 18.2,
            evening: 0,
            total: 18.2,
            fatContent: 4.2,
            proteinContent: 3.5,
            temperature: 4.1,
            notes: 'Only morning milking'
        },
        {
            id: 'milk_003',
            cowId: 'cow_003',
            date: '2024-01-15',
            morning: 26.8,
            evening: 0,
            total: 26.8,
            fatContent: 3.7,
            proteinContent: 3.2,
            temperature: 4.3,
            notes: 'Excellent production'
        },
        {
            id: 'milk_004',
            cowId: 'cow_004',
            date: '2024-01-15',
            morning: 22.3,
            evening: 20.1,
            total: 42.4,
            fatContent: 4.0,
            proteinContent: 3.4,
            temperature: 4.0,
            notes: 'Good consistency'
        }
    ],
    
    // Sample Egg Collection Records
    eggCollectionRecords: [
        {
            id: 'egg_001',
            flockId: 'flock_001',
            date: '2024-01-15',
            count: 480,
            gradeA: 420,
            gradeB: 50,
            gradeC: 10,
            cracked: 5,
            dirty: 8,
            notes: 'Good collection day'
        },
        {
            id: 'egg_002',
            flockId: 'flock_003',
            date: '2024-01-15',
            count: 180,
            gradeA: 150,
            gradeB: 25,
            gradeC: 5,
            cracked: 3,
            dirty: 2,
            notes: 'Free range collection'
        },
        {
            id: 'egg_003',
            flockId: 'flock_004',
            date: '2024-01-15',
            count: 135,
            gradeA: 120,
            gradeB: 12,
            gradeC: 3,
            cracked: 2,
            dirty: 1,
            notes: 'Breeder eggs for hatching'
        }
    ],
    
    // Sample Health Records
    healthRecords: [
        {
            id: 'health_001',
            animalId: 'cow_005',
            animalType: 'dairy',
            date: '2024-01-14',
            status: 'sick',
            diagnosis: 'Lameness - foot rot',
            treatment: 'Antibiotics and hoof trimming',
            medication: 'Penicillin, anti-inflammatory',
            dosage: 'As prescribed',
            nextCheckup: '2024-01-21',
            vetName: 'Dr. Smith',
            cost: 85.50,
            notes: 'Isolate from herd, monitor closely'
        },
        {
            id: 'health_002',
            animalId: 'flock_002',
            animalType: 'poultry',
            date: '2024-01-13',
            status: 'needs_checkup',
            diagnosis: 'Possible respiratory issue',
            treatment: 'Increased ventilation, monitor',
            medication: 'None yet',
            dosage: 'N/A',
            nextCheckup: '2024-01-16',
            vetName: 'Poultry Specialist',
            cost: 45.00,
            notes: 'Check for coughing or nasal discharge'
        }
    ],
    
    // Sample Financial Records
    financialRecords: [
        {
            id: 'finance_001',
            date: '2024-01-15',
            type: 'income',
            category: 'milk_sales',
            amount: 1250.75,
            description: 'Weekly milk delivery to dairy',
            paymentMethod: 'bank_transfer',
            reference: 'INV-2024-001'
        },
        {
            id: 'finance_002',
            date: '2024-01-15',
            type: 'income',
            category: 'egg_sales',
            amount: 375.20,
            description: 'Egg sales to local market',
            paymentMethod: 'cash',
            reference: 'EGG-2024-015'
        },
        {
            id: 'finance_003',
            date: '2024-01-14',
            type: 'expense',
            category: 'feed_purchase',
            amount: 850.00,
            description: 'Layer mash and broiler starter',
            paymentMethod: 'bank_transfer',
            reference: 'PO-2024-003'
        },
        {
            id: 'finance_004',
            date: '2024-01-13',
            type: 'expense',
            category: 'veterinary',
            amount: 130.50,
            description: 'Treatment for cow #005',
            paymentMethod: 'credit_card',
            reference: 'VET-2024-002'
        }
    ],
    
    // Sample Tasks and Reminders
    tasks: [
        {
            id: 'task_001',
            title: 'Vaccinate Broiler Flock',
            description: 'Newcastle disease vaccination due',
            dueDate: '2024-01-20',
            priority: 'high',
            status: 'pending',
            assignedTo: 'Farm Manager',
            category: 'health',
            animalIds: ['flock_002']
        },
        {
            id: 'task_002',
            title: 'Order Layer Mash',
            description: 'Feed stock running low',
            dueDate: '2024-01-18',
            priority: 'medium',
            status: 'in_progress',
            assignedTo: 'Procurement',
            category: 'feed',
            notes: 'Contact ABC Feeds'
        },
        {
            id: 'task_003',
            title: 'Hoof Trimming',
            description: 'Routine hoof care for dairy herd',
            dueDate: '2024-01-25',
            priority: 'medium',
            status: 'pending',
            assignedTo: 'Farm Hands',
            category: 'maintenance',
            animalIds: ['cow_001', 'cow_003']
        },
        {
            id: 'task_004',
            title: 'Clean Poultry House',
            description: 'Weekly deep cleaning',
            dueDate: '2024-01-17',
            priority: 'low',
            status: 'completed',
            assignedTo: 'Cleaning Staff',
            category: 'cleaning',
            completedDate: '2024-01-16'
        }
    ],
    
    // Helper functions
    getCowById: function(cowId) {
        return this.dairyCows.find(cow => cow.id === cowId);
    },
    
    getFlockById: function(flockId) {
        return this.poultryFlocks.find(flock => flock.id === flockId);
    },
    
    getFeedByType: function(feedType) {
        return this.feedInventory.find(feed => feed.type === feedType);
    },
    
    getMilkRecordsByDate: function(date) {
        return this.milkProductionRecords.filter(record => record.date === date);
    },
    
    getEggRecordsByDate: function(date) {
        return this.eggCollectionRecords.filter(record => record.date === date);
    },
    
    getPendingTasks: function() {
        return this.tasks.filter(task => task.status !== 'completed');
    },
    
    getHighPriorityTasks: function() {
        return this.tasks.filter(task => task.priority === 'high' && task.status !== 'completed');
    },
    
    getTodayMilkTotal: function() {
        const today = new Date().toISOString().split('T')[0];
        return this.milkProductionRecords
            .filter(record => record.date === today)
            .reduce((sum, record) => sum + record.total, 0);
    },
    
    getTodayEggTotal: function() {
        const today = new Date().toISOString().split('T')[0];
        return this.eggCollectionRecords
            .filter(record => record.date === today)
            .reduce((sum, record) => sum + record.count, 0);
    },
    
    getFeedDaysRemaining: function(feedType) {
        const feed = this.getFeedByType(feedType);
        if (!feed) return 0;
        return Math.floor(feed.currentStock / feed.consumptionRate);
    },
    
    getLowStockFeeds: function() {
        return this.feedInventory.filter(feed => {
            const daysRemaining = feed.currentStock / feed.consumptionRate;
            return daysRemaining < 7; // Less than 7 days supply
        });
    },
    
    getAnimalsNeedingAttention: function() {
        const cows = this.dairyCows.filter(cow => cow.healthStatus !== 'healthy');
        const flocks = this.poultryFlocks.filter(flock => flock.healthStatus !== 'healthy');
        return [...cows, ...flocks];
    },
    
    // Statistics
    getFarmStats: function() {
        const today = new Date().toISOString().split('T')[0];
        
        return {
            totalCows: this.dairyCows.length,
            totalFlocks: this.poultryFlocks.length,
            totalBirds: this.poultryFlocks.reduce((sum, flock) => sum + flock.birdCount, 0),
            todayMilk: this.getTodayMilkTotal(),
            todayEggs: this.getTodayEggTotal(),
            animalsNeedingAttention: this.getAnimalsNeedingAttention().length,
            lowStockFeeds: this.getLowStockFeeds().length,
            pendingTasks: this.getPendingTasks().length,
            totalFeedStock: this.feedInventory.reduce((sum, feed) => sum + feed.currentStock, 0)
        };
    },
    
    // Generate sample data for charts
    getWeeklyMilkProduction: function() {
        const days = 7;
        const production = {};
        
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            
            // Simulate production data
            const baseProduction = 180 + Math.random() * 40; // 180-220 liters
            production[dateStr] = Math.round(baseProduction);
        }
        
        return production;
    },
    
    getWeeklyEggProduction: function() {
        const days = 7;
        const production = {};
        
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            
            // Simulate production data
            const baseProduction = 750 + Math.random() * 100; // 750-850 eggs
            production[dateStr] = Math.round(baseProduction);
        }
        
        return production;
    },
    
    // Export sample data as JSON
    exportAllData: function() {
        return {
            dairyCows: this.dairyCows,
            poultryFlocks: this.poultryFlocks,
            feedInventory: this.feedInventory,
            milkProductionRecords: this.milkProductionRecords,
            eggCollectionRecords: this.eggCollectionRecords,
            healthRecords: this.healthRecords,
            financialRecords: this.financialRecords,
            tasks: this.tasks,
            stats: this.getFarmStats(),
            exportedAt: new Date().toISOString(),
            version: '1.0.0'
        };
    },
    
    // Import data (basic validation)
    importData: function(data) {
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid data format');
        }
        
        // Update sample data with imported data
        if (data.dairyCows) this.dairyCows = data.dairyCows;
        if (data.poultryFlocks) this.poultryFlocks = data.poultryFlocks;
        if (data.feedInventory) this.feedInventory = data.feedInventory;
        
        return {
            success: true,
            imported: Object.keys(data).length,
            timestamp: new Date().toISOString()
        };
    }
};

export default SampleData;