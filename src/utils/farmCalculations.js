// Farm Calculations and Analytics Utilities

export const FarmCalculations = {
    
    // ============================================================================
    // DAIRY FARM CALCULATIONS
    // ============================================================================
    
    /**
     * Calculate average milk production per cow
     * @param {Array} milkRecords - Array of milk production records
     * @param {number} cowCount - Number of cows in production
     * @returns {number} Average milk per cow
     */
    calculateAvgMilkPerCow: function(milkRecords, cowCount) {
        if (!milkRecords || milkRecords.length === 0 || cowCount === 0) {
            return 0;
        }
        
        const totalMilk = milkRecords.reduce((sum, record) => {
            return sum + (record.total || record.amount || 0);
        }, 0);
        
        return totalMilk / cowCount;
    },
    
    /**
     * Calculate milk production efficiency
     * @param {number} totalMilk - Total milk produced (liters)
     * @param {number} feedConsumed - Total feed consumed (kg)
     * @returns {number} Milk per kg of feed
     */
    calculateMilkFeedEfficiency: function(totalMilk, feedConsumed) {
        if (feedConsumed === 0) return 0;
        return totalMilk / feedConsumed;
    },
    
    /**
     * Calculate expected calving date
     * @param {string} breedingDate - Date of breeding (YYYY-MM-DD)
     * @param {number} gestationDays - Gestation period in days (default: 283)
     * @returns {string} Expected calving date (YYYY-MM-DD)
     */
    calculateExpectedCalving: function(breedingDate, gestationDays = 283) {
        const breeding = new Date(breedingDate);
        breeding.setDate(breeding.getDate() + gestationDays);
        return breeding.toISOString().split('T')[0];
    },
    
    /**
     * Calculate days since last calving
     * @param {string} lastCalvingDate - Last calving date (YYYY-MM-DD)
     * @returns {number} Days since last calving
     */
    calculateDaysSinceCalving: function(lastCalvingDate) {
        if (!lastCalvingDate) return 0;
        
        const lastCalving = new Date(lastCalvingDate);
        const today = new Date();
        const diffTime = Math.abs(today - lastCalving);
        return Math.floor(diffTime / (1000 * 60 * 60 * 24));
    },
    
    /**
     * Calculate calving interval
     * @param {Array} calvingDates - Array of previous calving dates
     * @returns {number} Average calving interval in days
     */
    calculateCalvingInterval: function(calvingDates) {
        if (!calvingDates || calvingDates.length < 2) {
            return 0;
        }
        
        // Sort dates in ascending order
        const sortedDates = [...calvingDates].sort();
        let totalInterval = 0;
        
        for (let i = 1; i < sortedDates.length; i++) {
            const current = new Date(sortedDates[i]);
            const previous = new Date(sortedDates[i - 1]);
            const interval = Math.abs(current - previous);
            totalInterval += interval / (1000 * 60 * 60 * 24);
        }
        
        return totalInterval / (sortedDates.length - 1);
    },
    
    /**
     * Calculate lactation curve for a cow
     * @param {number} peakMilk - Peak milk production (liters)
     * @param {number} daysInMilk - Days since calving
     * @returns {number} Expected milk production
     */
    calculateLactationCurve: function(peakMilk, daysInMilk) {
        if (daysInMilk <= 0) return 0;
        
        // Standard lactation curve formula
        const a = 0.05;  // Scale factor
        const b = 0.07;  // Shape factor
        const c = 0.001; // Persistency factor
        
        const production = peakMilk * Math.exp(-a * daysInMilk - b * Math.log(daysInMilk) + c * daysInMilk);
        return Math.max(0, production);
    },
    
    /**
     * Calculate butterfat corrected milk (FCM)
     * @param {number} milkVolume - Milk volume in liters
     * @param {number} fatPercentage - Fat percentage
     * @returns {number} FCM in liters
     */
    calculateButterfatCorrectedMilk: function(milkVolume, fatPercentage) {
        // Standard formula: FCM = milk * (0.4 + 0.15 * fat%)
        return milkVolume * (0.4 + 0.15 * fatPercentage);
    },
    
    /**
     * Calculate milk value based on components
     * @param {number} milkVolume - Milk volume in liters
     * @param {number} fatPercentage - Fat percentage
     * @param {number} proteinPercentage - Protein percentage
     * @param {Object} prices - Price per component
     * @returns {number} Total value
     */
    calculateMilkValue: function(milkVolume, fatPercentage, proteinPercentage, prices = {}) {
        const defaults = {
            basePrice: 0.35,      // $ per liter
            fatPrice: 3.50,       // $ per kg of fat
            proteinPrice: 6.00    // $ per kg of protein
        };
        
        const price = { ...defaults, ...prices };
        
        // Calculate component weights (1 liter of milk ≈ 1.03 kg)
        const milkWeight = milkVolume * 1.03;
        const fatWeight = milkWeight * (fatPercentage / 100);
        const proteinWeight = milkWeight * (proteinPercentage / 100);
        
        // Calculate value
        const baseValue = milkVolume * price.basePrice;
        const fatValue = fatWeight * price.fatPrice;
        const proteinValue = proteinWeight * price.proteinPrice;
        
        return baseValue + fatValue + proteinValue;
    },
    
    // ============================================================================
    // POULTRY FARM CALCULATIONS
    // ============================================================================
    
    /**
     * Calculate egg production rate
     * @param {number} eggsCollected - Number of eggs collected
     * @param {number} birdCount - Number of laying birds
     * @returns {number} Production rate as percentage
     */
    calculateEggProductionRate: function(eggsCollected, birdCount) {
        if (birdCount === 0) return 0;
        return (eggsCollected / birdCount) * 100;
    },
    
    /**
     * Calculate feed conversion ratio (FCR) for broilers
     * @param {number} feedConsumed - Total feed consumed (kg)
     * @param {number} weightGain - Total weight gain (kg)
     * @returns {number} FCR (kg feed per kg weight gain)
     */
    calculateFeedConversionRatio: function(feedConsumed, weightGain) {
        if (weightGain === 0) return 0;
        return feedConsumed / weightGain;
    },
    
    /**
     * Calculate European Production Efficiency Factor (EPEF)
     * @param {number} livability - Percentage of birds alive
     * @param {number} avgWeight - Average weight (kg)
     * @param {number} age - Age in days
     * @param {number} fcr - Feed conversion ratio
     * @returns {number} EPEF score
     */
    calculateEPEF: function(livability, avgWeight, age, fcr) {
        if (fcr === 0) return 0;
        return (livability * avgWeight * 100) / (age * fcr);
    },
    
    /**
     * Calculate egg mass production
     * @param {number} eggCount - Number of eggs
     * @param {number} avgEggWeight - Average egg weight (grams)
     * @returns {number} Egg mass in kg
     */
    calculateEggMass: function(eggCount, avgEggWeight) {
        return (eggCount * avgEggWeight) / 1000; // Convert grams to kg
    },
    
    /**
     * Calculate hatchability rate
     * @param {number} eggsSet - Number of eggs set in incubator
     * @param {number} chicksHatched - Number of chicks hatched
     * @returns {number} Hatchability percentage
     */
    calculateHatchability: function(eggsSet, chicksHatched) {
        if (eggsSet === 0) return 0;
        return (chicksHatched / eggsSet) * 100;
    },
    
    /**
     * Calculate mortality rate
     * @param {number} deaths - Number of deaths
     * @param {number} initialCount - Initial bird count
     * @returns {number} Mortality percentage
     */
    calculateMortalityRate: function(deaths, initialCount) {
        if (initialCount === 0) return 0;
        return (deaths / initialCount) * 100;
    },
    
    /**
     * Calculate daily weight gain for broilers
     * @param {number} currentWeight - Current weight (kg)
     * @param {number} initialWeight - Initial weight (kg)
     * @param {number} ageInDays - Age in days
     * @returns {number} Daily weight gain in grams
     */
    calculateDailyWeightGain: function(currentWeight, initialWeight, ageInDays) {
        if (ageInDays === 0) return 0;
        return ((currentWeight - initialWeight) * 1000) / ageInDays;
    },
    
    /**
     * Calculate feed requirement for flock
     * @param {number} birdCount - Number of birds
     * @param {number} ageInWeeks - Age in weeks
     * @param {string} birdType - 'layers' or 'broilers'
     * @returns {number} Daily feed requirement in kg
     */
    calculateDailyFeedRequirement: function(birdCount, ageInWeeks, birdType) {
        const feedRates = {
            layers: {
                1: 0.02,   // 20g per bird per day
                2: 0.03,
                3: 0.04,
                4: 0.05,
                5: 0.06,
                6: 0.07,
                7: 0.08,
                8: 0.09,
                9: 0.10,
                10: 0.105,
                11: 0.11,
                12: 0.115,
                13: 0.12,
                14: 0.12,
                15: 0.12,
                16: 0.12,
                17: 0.115,
                18: 0.11,
                adult: 0.11
            },
            broilers: {
                1: 0.03,   // 30g per bird per day
                2: 0.07,
                3: 0.12,
                4: 0.18,
                5: 0.23,
                6: 0.28,
                7: 0.32,
                8: 0.35
            }
        };
        
        const rates = feedRates[birdType];
        if (!rates) return 0;
        
        // Use specific week rate or adult rate for layers
        let rate;
        if (birdType === 'layers' && ageInWeeks > 18) {
            rate = rates.adult;
        } else {
            rate = rates[Math.min(ageInWeeks, Object.keys(rates).length)] || rates.adult || 0;
        }
        
        return birdCount * rate;
    },
    
    // ============================================================================
    // FINANCIAL CALCULATIONS
    // ============================================================================
    
    /**
     * Calculate gross margin
     * @param {number} totalRevenue - Total revenue
     * @param {number} variableCosts - Variable costs
     * @returns {number} Gross margin
     */
    calculateGrossMargin: function(totalRevenue, variableCosts) {
        return totalRevenue - variableCosts;
    },
    
    /**
     * Calculate net profit
     * @param {number} totalRevenue - Total revenue
     * @param {number} totalCosts - Total costs (variable + fixed)
     * @returns {number} Net profit
     */
    calculateNetProfit: function(totalRevenue, totalCosts) {
        return totalRevenue - totalCosts;
    },
    
    /**
     * Calculate profit margin
     * @param {number} netProfit - Net profit
     * @param {number} totalRevenue - Total revenue
     * @returns {number} Profit margin as percentage
     */
    calculateProfitMargin: function(netProfit, totalRevenue) {
        if (totalRevenue === 0) return 0;
        return (netProfit / totalRevenue) * 100;
    },
    
    /**
     * Calculate return on investment (ROI)
     * @param {number} netProfit - Net profit
     * @param {number} totalInvestment - Total investment
     * @returns {number} ROI as percentage
     */
    calculateROI: function(netProfit, totalInvestment) {
        if (totalInvestment === 0) return 0;
        return (netProfit / totalInvestment) * 100;
    },
    
    /**
     * Calculate break-even point
     * @param {number} fixedCosts - Fixed costs
     * @param {number} pricePerUnit - Price per unit
     * @param {number} variableCostPerUnit - Variable cost per unit
     * @returns {number} Break-even quantity
     */
    calculateBreakEvenPoint: function(fixedCosts, pricePerUnit, variableCostPerUnit) {
        const contributionMargin = pricePerUnit - variableCostPerUnit;
        if (contributionMargin <= 0) return Infinity;
        return fixedCosts / contributionMargin;
    },
    
    /**
     * Calculate cost of production per unit
     * @param {number} totalCosts - Total production costs
     * @param {number} totalUnits - Total units produced
     * @returns {number} Cost per unit
     */
    calculateCostPerUnit: function(totalCosts, totalUnits) {
        if (totalUnits === 0) return 0;
        return totalCosts / totalUnits;
    },
    
    // ============================================================================
    // FEED AND INVENTORY CALCULATIONS
    // ============================================================================
    
    /**
     * Calculate days of feed supply remaining
     * @param {number} currentStock - Current stock (kg)
     * @param {number} dailyConsumption - Daily consumption (kg/day)
     * @returns {number} Days of supply remaining
     */
    calculateFeedDaysRemaining: function(currentStock, dailyConsumption) {
        if (dailyConsumption === 0) return Infinity;
        return Math.floor(currentStock / dailyConsumption);
    },
    
    /**
     * Calculate reorder point for feed
     * @param {number} leadTimeDays - Lead time in days
     * @param {number} dailyConsumption - Daily consumption (kg/day)
     * @param {number} safetyStock - Safety stock in days
     * @returns {number} Reorder point in kg
     */
    calculateReorderPoint: function(leadTimeDays, dailyConsumption, safetyStock = 7) {
        return dailyConsumption * (leadTimeDays + safetyStock);
    },
    
    /**
     * Calculate economic order quantity (EOQ)
     * @param {number} annualDemand - Annual demand (kg)
     * @param {number} orderingCost - Cost per order
     * @param {number} holdingCost - Holding cost per kg per year
     * @returns {number} Economic order quantity in kg
     */
    calculateEOQ: function(annualDemand, orderingCost, holdingCost) {
        if (holdingCost === 0) return 0;
        return Math.sqrt((2 * annualDemand * orderingCost) / holdingCost);
    },
    
    /**
     * Calculate inventory turnover ratio
     * @param {number} costOfGoodsSold - Cost of goods sold
     * @param {number} averageInventory - Average inventory value
     * @returns {number} Inventory turnover ratio
     */
    calculateInventoryTurnover: function(costOfGoodsSold, averageInventory) {
        if (averageInventory === 0) return 0;
        return costOfGoodsSold / averageInventory;
    },
    
    // ============================================================================
    // STATISTICAL ANALYSIS
    // ============================================================================
    
    /**
     * Calculate moving average
     * @param {Array} data - Array of numerical data
     * @param {number} period - Period for moving average
     * @returns {Array} Moving average values
     */
    calculateMovingAverage: function(data, period) {
        if (!data || data.length < period) return [];
        
        const result = [];
        for (let i = period - 1; i < data.length; i++) {
            const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
            result.push(sum / period);
        }
        return result;
    },
    
    /**
     * Calculate standard deviation
     * @param {Array} data - Array of numerical data
     * @returns {number} Standard deviation
     */
    calculateStandardDeviation: function(data) {
        if (!data || data.length === 0) return 0;
        
        const mean = data.reduce((a, b) => a + b, 0) / data.length;
        const squaredDifferences = data.map(value => Math.pow(value - mean, 2));
        const variance = squaredDifferences.reduce((a, b) => a + b, 0) / data.length;
        
        return Math.sqrt(variance);
    },
    
    /**
     * Calculate coefficient of variation
     * @param {Array} data - Array of numerical data
     * @returns {number} Coefficient of variation as percentage
     */
    calculateCoefficientOfVariation: function(data) {
        if (!data || data.length === 0) return 0;
        
        const mean = data.reduce((a, b) => a + b, 0) / data.length;
        if (mean === 0) return 0;
        
        const stdDev = this.calculateStandardDeviation(data);
        return (stdDev / mean) * 100;
    },
    
    /**
     * Calculate trend line using linear regression
     * @param {Array} x - X values (e.g., days)
     * @param {Array} y - Y values (e.g., production)
     * @returns {Object} Slope and intercept
     */
    calculateTrendLine: function(x, y) {
        if (!x || !y || x.length !== y.length || x.length < 2) {
            return { slope: 0, intercept: 0 };
        }
        
        const n = x.length;
        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
        
        for (let i = 0; i < n; i++) {
            sumX += x[i];
            sumY += y[i];
            sumXY += x[i] * y[i];
            sumX2 += x[i] * x[i];
        }
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        
        return { slope, intercept };
    },
    
    /**
     * Calculate forecast using trend line
     * @param {Object} trend - Trend line object with slope and intercept
     * @param {number} xValue - X value to forecast for
     * @returns {number} Forecasted Y value
     */
    calculateForecast: function(trend, xValue) {
        return trend.slope * xValue + trend.intercept;
    },
    
    // ============================================================================
    // UNIT CONVERSIONS
    // ============================================================================
    
    /**
     * Convert liters to gallons
     * @param {number} liters - Volume in liters
     * @returns {number} Volume in gallons
     */
    litersToGallons: function(liters) {
        return liters * 0.264172;
    },
    
    /**
     * Convert kilograms to pounds
     * @param {number} kg - Weight in kilograms
     * @returns {number} Weight in pounds
     */
    kilogramsToPounds: function(kg) {
        return kg * 2.20462;
    },
    
    /**
     * Convert grams to ounces
     * @param {number} grams - Weight in grams
     * @returns {number} Weight in ounces
     */
    gramsToOunces: function(grams) {
        return grams * 0.035274;
    },
    
    /**
     * Convert Celsius to Fahrenheit
     * @param {number} celsius - Temperature in Celsius
     * @returns {number} Temperature in Fahrenheit
     */
    celsiusToFahrenheit: function(celsius) {
        return (celsius * 9/5) + 32;
    },
    
    // ============================================================================
    // VALIDATION AND FORMATTING
    // ============================================================================
    
    /**
     * Validate farm data entry
     * @param {Object} data - Data to validate
     * @param {string} type - Type of data ('dairy', 'poultry', 'feed', etc.)
     * @returns {Object} Validation result with isValid and errors
     */
    validateFarmData: function(data, type) {
        const errors = [];
        
        switch (type) {
            case 'dairy':
                if (!data.name || data.name.trim().length === 0) {
                    errors.push('Cow name is required');
                }
                if (data.weight && (data.weight < 0 || data.weight > 1500)) {
                    errors.push('Weight must be between 0 and 1500 kg');
                }
                if (data.milkProduction && data.milkProduction < 0) {
                    errors.push('Milk production cannot be negative');
                }
                break;
                
            case 'poultry':
                if (!data.name || data.name.trim().length === 0) {
                    errors.push('Flock name is required');
                }
                if (!data.birdCount || data.birdCount < 1) {
                    errors.push('Bird count must be at least 1');
                }
                if (data.mortalityRate && (data.mortalityRate < 0 || data.mortalityRate > 100)) {
                    errors.push('Mortality rate must be between 0 and 100%');
                }
                break;
                
            case 'feed':
                if (!data.type || data.type.trim().length === 0) {
                    errors.push('Feed type is required');
                }
                if (!data.currentStock || data.currentStock < 0) {
                    errors.push('Current stock cannot be negative');
                }
                if (data.consumptionRate && data.consumptionRate < 0) {
                    errors.push('Consumption rate cannot be negative');
                }
                break;
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    },
    
    /**
     * Format number with specified decimal places
     * @param {number} value - Number to format
     * @param {number} decimals - Number of decimal places
     * @returns {string} Formatted number
     */
    formatNumber: function(value, decimals = 2) {
        if (value === null || value === undefined) return '0.00';
        return value.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    },
    
    /**
     * Format percentage
     * @param {number} value - Value to format as percentage
     * @param {number} decimals - Number of decimal places
     * @returns {string} Formatted percentage
     */
    formatPercentage: function(value, decimals = 1) {
        if (value === null || value === undefined) return '0.0%';
        return `${value.toFixed(decimals)}%`;
    },
    
    /**
     * Format currency
     * @param {number} amount - Amount to format
     * @param {string} currency - Currency code (default: 'USD')
     * @returns {string} Formatted currency
     */
    formatCurrency: function(amount, currency = 'USD') {
        if (amount === null || amount === undefined) amount = 0;
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency
        }).format(amount);
    },
    
    /**
     * Format date for display
     * @param {string|Date} date - Date to format
     * @param {string} format - Format type ('short', 'medium', 'long')
     * @returns {string} Formatted date
     */
    formatDate: function(date, format = 'medium') {
        if (!date) return '';
        
        const dateObj = new Date(date);
        if (isNaN(dateObj.getTime())) return '';
        
        const options = {
            short: { year: 'numeric', month: 'short', day: 'numeric' },
            medium: { year: 'numeric', month: 'long', day: 'numeric' },
            long: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
        };
        
        return dateObj.toLocaleDateString('en-US', options[format] || options.medium);
    }
};

export default FarmCalculations;