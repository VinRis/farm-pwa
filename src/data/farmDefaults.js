// Farm Default Data and Configuration

export const FarmDefaults = {
    // Default dairy cow breeds
    DAIRY_BREEDS: [
        { id: 'holstein', name: 'Holstein', color: '#000000', avgMilk: 25.5 },
        { id: 'jersey', name: 'Jersey', color: '#8B4513', avgMilk: 18.2 },
        { id: 'guernsey', name: 'Guernsey', color: '#FFD700', avgMilk: 20.1 },
        { id: 'brown_swiss', name: 'Brown Swiss', color: '#8B7355', avgMilk: 22.3 },
        { id: 'ayrshire', name: 'Ayrshire', color: '#FF0000', avgMilk: 19.8 },
        { id: 'milking_shorthorn', name: 'Milking Shorthorn', color: '#8B0000', avgMilk: 17.5 }
    ],
    
    // Default poultry breeds
    POULTRY_BREEDS: [
        { id: 'hybrid_layer', name: 'Hybrid Layer', type: 'layers', avgEggs: 280 },
        { id: 'rhode_island_red', name: 'Rhode Island Red', type: 'layers', avgEggs: 260 },
        { id: 'leghorn', name: 'Leghorn', type: 'layers', avgEggs: 300 },
        { id: 'sussex', name: 'Sussex', type: 'dual', avgEggs: 250 },
        { id: 'cobb_500', name: 'Cobb 500', type: 'broilers', avgWeight: 2.5 },
        { id: 'ross_308', name: 'Ross 308', type: 'broilers', avgWeight: 2.7 }
    ],
    
    // Health status options
    HEALTH_STATUSES: [
        { id: 'healthy', name: 'Healthy', color: '#4CAF50', icon: '✅' },
        { id: 'needs_checkup', name: 'Needs Checkup', color: '#FF9800', icon: '⚠️' },
        { id: 'sick', name: 'Sick', color: '#F44336', icon: '🤒' },
        { id: 'recovering', name: 'Recovering', color: '#2196F3', icon: '🩹' },
        { id: 'quarantined', name: 'Quarantined', color: '#9C27B0', icon: '🚫' }
    ],
    
    // Breeding status options
    BREEDING_STATUSES: [
        { id: 'open', name: 'Open', color: '#757575', icon: '○' },
        { id: 'pregnant', name: 'Pregnant', color: '#9C27B0', icon: '🤰' },
        { id: 'dry', name: 'Dry', color: '#795548', icon: '🌵' },
        { id: 'in_heat', name: 'In Heat', color: '#E91E63', icon: '🔥' }
    ],
    
    // Milk production times
    MILKING_TIMES: [
        { id: 'morning', name: 'Morning', icon: '🌅' },
        { id: 'evening', name: 'Evening', icon: '🌇' },
        { id: 'afternoon', name: 'Afternoon', icon: '🌞' },
        { id: 'night', name: 'Night', icon: '🌙' }
    ],
    
    // Feed types
    FEED_TYPES: [
        { id: 'layer_mash', name: 'Layer Mash', type: 'layers', unit: 'kg' },
        { id: 'broiler_starter', name: 'Broiler Starter', type: 'broilers', unit: 'kg' },
        { id: 'grower_feed', name: 'Grower Feed', type: 'general', unit: 'kg' },
        { id: 'layer_pellets', name: 'Layer Pellets', type: 'layers', unit: 'kg' },
        { id: 'organic_feed', name: 'Organic Feed', type: 'general', unit: 'kg' },
        { id: 'grit', name: 'Grit', type: 'general', unit: 'kg' },
        { id: 'shell_grit', name: 'Shell Grit', type: 'layers', unit: 'kg' }
    ],
    
    // Vaccination types
    VACCINATION_TYPES: [
        { id: 'bvd', name: 'BVD', animal: 'dairy', duration: 180 },
        { id: 'ibr', name: 'IBR', animal: 'dairy', duration: 365 },
        { id: 'leptospirosis', name: 'Leptospirosis', animal: 'dairy', duration: 365 },
        { id: 'newcastle', name: 'Newcastle', animal: 'poultry', duration: 180 },
        { id: 'marek', name: 'Marek', animal: 'poultry', duration: 'lifetime' },
        { id: 'ibd', name: 'IBD', animal: 'poultry', duration: 90 },
        { id: 'coccidiosis', name: 'Coccidiosis', animal: 'poultry', duration: 60 }
    ],
    
    // Housing types
    HOUSING_TYPES: [
        { id: 'free_stall', name: 'Free Stall', animal: 'dairy' },
        { id: 'tie_stall', name: 'Tie Stall', animal: 'dairy' },
        { id: 'pasture', name: 'Pasture', animal: 'dairy' },
        { id: 'battery_cages', name: 'Battery Cages', animal: 'poultry' },
        { id: 'free_range', name: 'Free Range', animal: 'poultry' },
        { id: 'deep_litter', name: 'Deep Litter', animal: 'poultry' },
        { id: 'aviaries', name: 'Aviaries', animal: 'poultry' }
    ],
    
    // Egg quality grades
    EGG_QUALITY: [
        { id: 'grade_a', name: 'Grade A', color: '#4CAF50' },
        { id: 'grade_b', name: 'Grade B', color: '#FF9800' },
        { id: 'grade_c', name: 'Grade C', color: '#F44336' },
        { id: 'jumbo', name: 'Jumbo', color: '#9C27B0' },
        { id: 'large', name: 'Large', color: '#2196F3' },
        { id: 'medium', name: 'Medium', color: '#00BCD4' },
        { id: 'small', name: 'Small', color: '#009688' }
    ],
    
    // Default feed consumption rates (kg per bird per day)
    FEED_CONSUMPTION_RATES: {
        layers: {
            week1_4: 0.02,   // 20g per day
            week5_8: 0.05,   // 50g per day
            week9_16: 0.08,  // 80g per day
            week17_plus: 0.11 // 110g per day (laying)
        },
        broilers: {
            week1: 0.03,     // 30g per day
            week2: 0.07,     // 70g per day
            week3: 0.12,     // 120g per day
            week4: 0.18,     // 180g per day
            week5: 0.23,     // 230g per day
            week6: 0.28,     // 280g per day
            week7: 0.32,     // 320g per day
            week8: 0.35      // 350g per day
        }
    },
    
    // Default water consumption rates (liters per animal per day)
    WATER_CONSUMPTION_RATES: {
        dairy_cow: 70,       // 70L per cow per day
        calf: 10,            // 10L per calf per day
        layer: 0.25,         // 0.25L per layer per day
        broiler: 0.2,        // 0.2L per broiler per day
        chick: 0.05          // 0.05L per chick per day
    },
    
    // Default mortality rates (percentage)
    DEFAULT_MORTALITY_RATES: {
        dairy_calves: 5,     // 5% calf mortality
        dairy_cows: 2,       // 2% cow mortality
        layers: 8,           // 8% layer mortality
        broilers: 5,         // 5% broiler mortality
        chicks: 10           // 10% chick mortality
    },
    
    // Default production targets
    PRODUCTION_TARGETS: {
        dairy: {
            avg_milk_per_cow: 25,      // 25L per cow per day
            calving_interval: 400,     // 400 days between calvings
            milk_fat: 3.8,             // 3.8% fat content
            milk_protein: 3.2          // 3.2% protein content
        },
        poultry: {
            layers_egg_production: 85, // 85% production rate
            layers_egg_weight: 62,     // 62g average egg weight
            broilers_fcr: 1.6,         // 1.6 feed conversion ratio
            broilers_target_weight: 2.5 // 2.5kg target weight
        }
    },
    
    // Default economic values (example prices)
    ECONOMIC_VALUES: {
        milk_price_per_liter: 0.40,    // $0.40 per liter
        egg_price_per_dozen: 2.50,     // $2.50 per dozen
        broiler_price_per_kg: 3.00,    // $3.00 per kg
        feed_price_per_kg: 0.50,       // $0.50 per kg
        veterinary_cost_per_animal: 50, // $50 per animal per year
        labor_cost_per_hour: 15         // $15 per hour
    },
    
    // Default alert thresholds
    ALERT_THRESHOLDS: {
        low_milk_production: 15,       // Alert if milk < 15L
        high_mortality: 10,            // Alert if mortality > 10%
        low_egg_production: 70,        // Alert if production < 70%
        feed_low_stock: 100,           // Alert if feed < 100kg
        health_check_overdue: 30,      // Alert if no health check for 30 days
        vaccination_overdue: 7         // Alert if vaccination overdue by 7 days
    },
    
    // Default notification settings
    NOTIFICATION_SETTINGS: {
        enabled: true,
        health_alerts: true,
        production_alerts: true,
        feed_alerts: true,
        sync_alerts: true,
        daily_summary: true,
        sound_enabled: true,
        vibration_enabled: true
    },
    
    // Default sync settings
    SYNC_SETTINGS: {
        auto_sync: true,
        sync_interval: 300,            // 5 minutes in seconds
        sync_on_startup: true,
        sync_in_background: true,
        max_retries: 3,
        conflict_resolution: 'server'  // 'server', 'client', or 'manual'
    },
    
    // Default display settings
    DISPLAY_SETTINGS: {
        theme: 'auto',                 // 'light', 'dark', or 'auto'
        font_size: 'medium',           // 'small', 'medium', 'large'
        language: 'en',
        currency: 'USD',
        unit_system: 'metric',         // 'metric' or 'imperial'
        date_format: 'yyyy-mm-dd',
        time_format: '24h'             // '12h' or '24h'
    },
    
    // Default backup settings
    BACKUP_SETTINGS: {
        auto_backup: true,
        backup_interval: 7,            // days
        keep_backups: 10,              // number of backups to keep
        backup_location: 'local',      // 'local', 'cloud', or 'both'
        encrypt_backups: true
    },
    
    // Helper functions
    getBreedById: function(breedId, animalType) {
        const breeds = animalType === 'dairy' ? this.DAIRY_BREEDS : this.POULTRY_BREEDS;
        return breeds.find(breed => breed.id === breedId) || breeds[0];
    },
    
    getHealthStatusById: function(statusId) {
        return this.HEALTH_STATUSES.find(status => status.id === statusId) || this.HEALTH_STATUSES[0];
    },
    
    getFeedTypeById: function(feedId) {
        return this.FEED_TYPES.find(feed => feed.id === feedId) || this.FEED_TYPES[0];
    },
    
    calculateFeedConsumption: function(animalType, ageInWeeks, count) {
        const rates = this.FEED_CONSUMPTION_RATES[animalType];
        if (!rates) return 0;
        
        let rate = 0;
        if (animalType === 'layers') {
            if (ageInWeeks <= 4) rate = rates.week1_4;
            else if (ageInWeeks <= 8) rate = rates.week5_8;
            else if (ageInWeeks <= 16) rate = rates.week9_16;
            else rate = rates.week17_plus;
        } else if (animalType === 'broilers') {
            if (ageInWeeks === 1) rate = rates.week1;
            else if (ageInWeeks === 2) rate = rates.week2;
            else if (ageInWeeks === 3) rate = rates.week3;
            else if (ageInWeeks === 4) rate = rates.week4;
            else if (ageInWeeks === 5) rate = rates.week5;
            else if (ageInWeeks === 6) rate = rates.week6;
            else if (ageInWeeks === 7) rate = rates.week7;
            else rate = rates.week8;
        }
        
        return rate * count;
    },
    
    calculateWaterConsumption: function(animalType, count) {
        const rate = this.WATER_CONSUMPTION_RATES[animalType] || 0;
        return rate * count;
    },
    
    getDefaultMortalityRate: function(animalType) {
        return this.DEFAULT_MORTALITY_RATES[animalType] || 5;
    },
    
    getProductionTarget: function(animalType, metric) {
        const targets = this.PRODUCTION_TARGETS[animalType];
        return targets ? targets[metric] : null;
    },
    
    formatCurrency: function(amount, currency = this.DISPLAY_SETTINGS.currency) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency
        }).format(amount);
    },
    
    formatNumber: function(number, decimals = 2) {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(number);
    },
    
    // Initialize default settings in localStorage
    initializeSettings: function() {
        const settings = {
            notifications: this.NOTIFICATION_SETTINGS,
            sync: this.SYNC_SETTINGS,
            display: this.DISPLAY_SETTINGS,
            backup: this.BACKUP_SETTINGS,
            economic: this.ECONOMIC_VALUES,
            alerts: this.ALERT_THRESHOLDS
        };
        
        if (!localStorage.getItem('farm_settings')) {
            localStorage.setItem('farm_settings', JSON.stringify(settings));
        }
        
        return settings;
    },
    
    // Get user settings with defaults
    getUserSettings: function() {
        const saved = localStorage.getItem('farm_settings');
        if (saved) {
            return JSON.parse(saved);
        }
        return this.initializeSettings();
    },
    
    // Update user settings
    updateUserSettings: function(category, updates) {
        const settings = this.getUserSettings();
        if (settings[category]) {
            settings[category] = { ...settings[category], ...updates };
            localStorage.setItem('farm_settings', JSON.stringify(settings));
        }
        return settings;
    },
    
    // Reset settings to defaults
    resetSettings: function() {
        localStorage.removeItem('farm_settings');
        return this.initializeSettings();
    }
};

export default FarmDefaults;