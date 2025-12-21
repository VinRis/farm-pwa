sample-data.js
const sampleData = {
  records: {
    dairy: [
      { id: crypto.randomUUID(), livestock: 'dairy', date: '2025-12-01', animalId: 'cow1', session: 'morning', quantity: 20, feedKg: 10, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    ],
    poultry: [
      { id: crypto.randomUUID(), livestock: 'poultry', date: '2025-12-01', animalId: 'flock1', quantity: 100, mortality: 0, feedKg: 50, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    ],
    pig: [
      { id: crypto.randomUUID(), livestock: 'pig', date: '2025-12-01', animalId: 'pig1', weightKg: 100, feedKg: 20, mortality: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    ],
    goat: [
      { id: crypto.randomUUID(), livestock: 'goat', date: '2025-12-01', animalId: 'goat1', quantity: 5, feedKg: 5, mortality: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    ]
  },
  transactions: {
    dairy: [
      { id: crypto.randomUUID(), livestock: 'dairy', date: '2025-12-01', type: 'income', amount: 100, currency: 'USD', category: 'sale', createdAt: new Date().toISOString() }
    ],
    poultry: [
      { id: crypto.randomUUID(), livestock: 'poultry', date: '2025-12-01', type: 'income', amount: 50, currency: 'USD', category: 'sale', createdAt: new Date().toISOString() }
    ],
    pig: [
      { id: crypto.randomUUID(), livestock: 'pig', date: '2025-12-01', type: 'expense', amount: 30, currency: 'USD', category: 'feed', createdAt: new Date().toISOString() }
    ],
    goat: [
      { id: crypto.randomUUID(), livestock: 'goat', date: '2025-12-01', type: 'income', amount: 40, currency: 'USD', category: 'sale', createdAt: new Date().toISOString() }
    ]
  }
};

export default sampleData;
