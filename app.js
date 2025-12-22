import { DB } from './db.js';
import { Utils } from './utils.js';
import { loadSampleData } from './sample-data.js';

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  collection,
  addDoc,
  serverTimestamp,
  getDocs,
  query,
  where,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const App = {

  state: {
    livestock: localStorage.getItem('ft_livestock') || null,
    theme: localStorage.getItem('ft_theme') || 'light',
    currency: localStorage.getItem('ft_currency') || 'KSh',
    chartInstance: null,
    isLoginMode: true
  },

  /* ================= INIT ================= */
  init() {
    this.applyTheme();
    this.bindEvents();

    onAuthStateChanged(window.auth, user => {
      const email = document.getElementById('user-email-display');
      if (email) email.textContent = user ? user.email : 'Guest User';
      if (this.state.livestock) this.refreshDashboard();
    });

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./service-worker.js');
    }

    if (this.state.livestock) this.loadAppShell();
  },

  /* ================= EVENTS ================= */
  bindEvents() {

    document.querySelectorAll('.livestock-grid .card').forEach(card => {
      card.addEventListener('click', () => {
        const type = card.dataset.livestock;
        if (type) this.selectLivestock(type);
      });
    });

    document.getElementById('home-btn')?.addEventListener('click', () => {
      localStorage.removeItem('ft_livestock');
      this.state.livestock = null;
      document.getElementById('app-shell').classList.add('hidden');
      document.getElementById('landing-page').classList.remove('hidden');
    });

    document.getElementById('theme-toggle')?.addEventListener('click', () => {
      this.state.theme = this.state.theme === 'light' ? 'dark' : 'light';
      localStorage.setItem('ft_theme', this.state.theme);
      this.applyTheme();
    });

    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.switchTab(btn.dataset.target, btn);
      });
    });

    document.getElementById('add-record-form')?.addEventListener('submit', e => this.saveProductionRecord(e));
    document.getElementById('add-transaction-form')?.addEventListener('submit', e => this.saveTransaction(e));
    document.getElementById('reminder-form')?.addEventListener('submit', e => this.saveReminder(e));
  },

  /* ================= NAV ================= */
  switchTab(id, btn) {
    document.querySelectorAll('.tab-view').forEach(v => {
      v.classList.remove('active');
    });
  
    document.getElementById(id).classList.add('active');
  
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn?.classList.add('active');
  
    if (id === 'view-dashboard') this.refreshDashboard();
    if (id === 'view-records') this.loadRecords();
    if (id === 'view-finance') this.loadFinance();
    if (id === 'view-vax') this.renderVaxSchedule();
  },

  /* ================= UI ================= */
  applyTheme() {
    document.body.classList.toggle('dark-mode', this.state.theme === 'dark');
  },

  updateHeader() {
    const titles = {
      dairy: 'Dairy Farm',
      poultry: 'Poultry Farm',
      pig: 'Pig Farm',
      goat: 'Goat Farm'
    };
    document.getElementById('header-title').textContent = titles[this.state.livestock];
  },

  selectLivestock(type) {
    this.state.livestock = type;
    localStorage.setItem('ft_livestock', type);
    this.loadAppShell();
  },

  loadAppShell() {
    document.getElementById('landing-page').classList.add('hidden');
    document.getElementById('app-shell').classList.remove('hidden');
    this.updateHeader();
    this.renderDashboardShell();
    this.renderAddForm();
    this.switchTab('view-dashboard', document.querySelector('[data-target="view-dashboard"]'));
  },

  /* ================= DASHBOARD ================= */
  renderDashboardShell() {
    document.getElementById('main-content').innerHTML = `
      <div class="kpi-grid" id="kpi-container"></div>
      <div class="card chart-card">
        <canvas id="productionChart"></canvas>
      </div>
    `;
  },

  async refreshDashboard() {
    const records = await DB.getAll('records', 'livestock', this.state.livestock);
    const trans = await DB.getAll('transactions', 'livestock', this.state.livestock);

    const total = records.reduce((s, r) => s + (Number(r.quantity) || 0), 0);
    const income = trans.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = trans.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    document.getElementById('kpi-container').innerHTML = `
      <div class="kpi-card"><h4>Total Production</h4><div class="value">${total}</div></div>
      <div class="kpi-card"><h4>Net Cash</h4><div class="value">${this.state.currency} ${income - expense}</div></div>
    `;

    this.renderChart(records);
  },

  renderChart(records) {
    const canvas = document.getElementById('productionChart');
    if (!canvas || !records.length) return;
  
    const ctx = canvas.getContext('2d');
    if (this.state.chartInstance) this.state.chartInstance.destroy();
  
    this.state.chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: records.map(r => r.date || ''),
        datasets: [{
          label: 'Production',
          data: records.map(r => Number(r.quantity) || 0),
          borderColor: '#2E7D32',
          tension: 0.3
        }]
      }
    });
  },

  /* ================= FORMS ================= */
  renderAddForm() {
    const c = document.getElementById('dynamic-fields');
    c.innerHTML = `<input type="number" name="quantity" placeholder="Quantity" required>`;
  },

  async saveProductionRecord(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    await DB.add('records', { ...data, id: Utils.uuid(), livestock: this.state.livestock, createdAt: Date.now() });
    e.target.reset();
    this.refreshDashboard();
  },

  async loadRecords() {
    console.log('Records loaded');
  },

  async saveTransaction(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    await DB.add('transactions', { ...data, id: Utils.uuid(), livestock: this.state.livestock });
    this.loadFinance();
  },

  async loadFinance() {
    console.log('Finance loaded');
  },

  async saveReminder(e) {
    e.preventDefault();
    alert('Reminder saved');
  },

  async renderVaxSchedule() {
    console.log('Vax loaded');
  }
};

  window.app = App;
  document.addEventListener('DOMContentLoaded', () => App.init());
  
  window.addEventListener('load', () => {
    console.log('Force activating app shell');
  
    const landing = document.getElementById('landing-page');
    const app = document.getElementById('app-shell');
    const dashboard = document.getElementById('view-dashboard');
  
    if (landing) landing.style.display = 'none';
    if (app) app.classList.remove('hidden');
    if (dashboard) dashboard.classList.add('active');
  });

