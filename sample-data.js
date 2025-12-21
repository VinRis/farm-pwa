import { crud, openDB } from './db.js';
import { uuid } from './utils.js';

export const loadSampleData = async () => {
    const existing = await crud.getAll('records');
    if (existing.length > 0) return;

    const today = new Date().toISOString();
    const samples = [
        { id: uuid(), livestock: 'dairy', date: today, animalId: 'C-01', quantity: 12, unit: 'L', feedKg: 5, createdAt: today },
        { id: uuid(), livestock: 'poultry', date: today, flockId: 'A-Batch', quantity: 45, unit: 'eggs', mortality: 0, createdAt: today },
        { id: uuid(), livestock: 'pig', date: today, animalId: 'P-05', weightKg: 85, pigletsBorn: 0, createdAt: today },
        { id: uuid(), livestock: 'goat', date: today, animalId: 'G-10', quantity: 2, unit: 'L', createdAt: today }
    ];

    for (const s of samples) {
        await crud.put('records', s);
    }
    
    // Sample Transaction
    await crud.put('transactions', {
        id: uuid(), livestock: 'dairy', date: today, type: 'income', amount: 50, category: 'Milk Sale', description: 'Morning collection'
    });
};
