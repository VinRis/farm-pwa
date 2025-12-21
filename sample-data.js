import { DB } from './db.js';
import { Utils } from './utils.js';

export async function loadSampleData() {
    const records = await DB.getAll('records');
    if (records.length > 0) return; // Only load if empty

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    const sampleRecords = [
        // Dairy
        { id: Utils.uuid(), livestock: 'dairy', date: today, cowId: 'C001', session: 'morning', quantity: 15, unit: 'L', feedKg: 5, createdAt: Date.now() },
        { id: Utils.uuid(), livestock: 'dairy', date: yesterday, cowId: 'C001', session: 'evening', quantity: 12, unit: 'L', feedKg: 5, createdAt: Date.now() },
        // Poultry
        { id: Utils.uuid(), livestock: 'poultry', date: today, flockId: 'F1', quantity: 200, unit: 'eggs', birdsCount: 500, mortality: 2, feedKg: 50, createdAt: Date.now() },
        // Pig
        { id: Utils.uuid(), livestock: 'pig', date: today, pigId: 'P10', weightKg: 80, feedKg: 3, notes: 'Healthy', createdAt: Date.now() },
        // Goat
        { id: Utils.uuid(), livestock: 'goat', date: today, goatId: 'G5', quantity: 2, unit: 'L', feedKg: 2, createdAt: Date.now() }
    ];

    const sampleTrans = [
        { id: Utils.uuid(), livestock: 'dairy', date: today, type: 'expense', amount: 50, category: 'Feed', description: 'Bought Hay', createdAt: Date.now() },
        { id: Utils.uuid(), livestock: 'poultry', date: yesterday, type: 'income', amount: 100, category: 'Sales', description: 'Sold Eggs', createdAt: Date.now() }
    ];

    for (const r of sampleRecords) await DB.add('records', r);
    for (const t of sampleTrans) await DB.add('transactions', t);
    
    console.log("Sample data loaded");
}
