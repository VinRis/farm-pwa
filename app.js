import { DB } from './db.js';

import { Utils } from './utils.js';

import { loadSampleData } from './sample-data.js';



// Firebase Auth Imports

import { 

    signInWithEmailAndPassword, 

    createUserWithEmailAndPassword,

    onAuthStateChanged,

    signOut

} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";



// Firebase Firestore Imports

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



    // --- INITIALIZATION ---

    init() {

        this.applyTheme();

        this.bindEvents();

        

        // Listen for Firebase Auth State

        onAuthStateChanged(window.auth, (user) => {

            const emailDisp = document.getElementById('user-email-display');

            if (emailDisp) emailDisp.innerText = user ? user.email : "Guest User";

            

            if (this.state.livestock) {

                this.renderVaxSchedule(); 

                this.refreshDashboard();

            }

        });



        // Register Service Worker for Offline/PWA

        if ('serviceWorker' in navigator) {

            navigator.serviceWorker.register('./service-worker.js')

                .then(() => console.log("Service Worker Registered"))

                .catch(err => console.error("SW Registration Failed", err));

        }



        // If a livestock type was previously selected, skip landing page

        if (this.state.livestock) {

            this.loadAppShell();

        }

    },



    // --- CORE NAVIGATION & UI ---

    bindEvents() { 

        const drawer = document.getElementById('side-drawer');

        const overlay = document.getElementById('drawer-overlay');

        // Bind livestock card clicks dynamically
        document.querySelectorAll('.livestock-grid .card').forEach(card => {
            card.addEventListener('click', () => {
                const type = card.dataset.livestock;
                if (type) this.selectLivestock(type);
            });
        });



        // Sidebar Toggle Logic

        document.getElementById('menu-toggle')?.addEventListener('click', () => {

            drawer.classList.add('open');

            overlay.classList.remove('hidden');

        });



        const closeDrawer = () => {

            drawer.classList.remove('open');

            overlay.classList.add('hidden');

        };



        document.getElementById('close-drawer')?.addEventListener('click', closeDrawer);

        overlay?.addEventListener('click', closeDrawer);



        // Sidebar Navigation Links

        document.querySelectorAll('.nav-btn').forEach(btn => {

            btn.addEventListener('click', () => {

                const targetId = btn.getAttribute('data-target');

                this.switchTab(targetId, btn);

                closeDrawer();

            });

        });



        // Auth Modal Handlers

        document.getElementById('auth-status-btn')?.addEventListener('click', () => {

            document.getElementById('auth-modal').classList.remove('hidden');

        });



        document.getElementById('auth-toggle-btn')?.addEventListener('click', () => {

            this.state.isLoginMode = !this.state.isLoginMode;

            document.getElementById('auth-title').innerText = this.state.isLoginMode ? "Sign In" : "Create Account";

            document.getElementById('auth-submit-btn').innerText = this.state.isLoginMode ? "Login" : "Sign Up";

        });



        document.getElementById('auth-form')?.addEventListener('submit', (e) => this.handleAuth(e));



        document.getElementById('logout-btn')?.addEventListener('click', () => {

            if (confirm("Log out?")) signOut(window.auth).then(() => window.location.reload());

        });



        // Global UI Actions

        document.getElementById('home-btn')?.addEventListener('click', () => {

            this.state.livestock = null;

            localStorage.removeItem('ft_livestock');

            document.getElementById('app-shell').classList.add('hidden');

            document.getElementById('landing-page').classList.remove('hidden');

        });



        document.getElementById('theme-toggle')?.addEventListener('click', () => {

            this.state.theme = this.state.theme === 'light' ? 'dark' : 'light';

            localStorage.setItem('ft_theme', this.state.theme);

            this.applyTheme();

        });



        // Form Submissions

        document.getElementById('add-record-form')?.addEventListener('submit', (e) => this.saveProductionRecord(e));

        document.getElementById('reminder-form')?.addEventListener('submit', (e) => this.saveReminder(e));

        document.getElementById('add-transaction-form')?.addEventListener('submit', (e) => this.saveTransaction(e));

    },



    switchTab(viewId, btnElement) {

        document.querySelectorAll('.tab-view').forEach(view => {

            view.style.display = 'none';

            view.classList.remove('active');

        });

        const target = document.getElementById(viewId);

        if (target) {

            target.style.display = 'block';

            target.classList.add('active');

        }

        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

        if (btnElement) btnElement.classList.add('active');



        // Refresh dynamic content based on view

        if (viewId === 'view-dashboard') this.refreshDashboard();

        if (viewId === 'view-records') this.loadRecords();

        if (viewId === 'view-finance') this.loadFinance();

        if (viewId === 'view-vax') this.renderVaxSchedule();

    },



    // --- AUTHENTICATION ---

    async handleAuth(e) {

        e.preventDefault();

        const email = document.getElementById('auth-email').value;

        const password = document.getElementById('auth-password').value;

        try {

            if (this.state.isLoginMode) {

                await signInWithEmailAndPassword(window.auth, email, password);

                alert("Welcome back!");

            } else {

                await createUserWithEmailAndPassword(window.auth, email, password);

                alert("Account created successfully!");

            }

            document.getElementById('auth-modal').classList.add('hidden');

        } catch (err) { alert(err.message); }

    },



    // --- PRODUCTION & DATA ---

    async saveProductionRecord(e) {

        e.preventDefault();

        const formData = new FormData(e.target);

        const data = Object.fromEntries(formData.entries());

        

        const record = { 

            id: Utils.uuid(), 

            livestock: this.state.livestock, 

            createdAt: Date.now(), 

            ...data 

        };



        await DB.add('records', record);

        this.saveToCloud("production", record);

        

        e.target.reset();

        alert("Record Saved!");

        this.refreshDashboard();

    },



    async loadRecords() {

        const records = await DB.getAll('records', 'livestock', this.state.livestock);

        const tbody = document.querySelector('#records-table tbody');

        if (tbody) {

            tbody.innerHTML = records.sort((a,b) => b.createdAt - a.createdAt).map(r => `

                <tr>

                    <td>${r.date}</td>

                    <td>${r.quantity || r.weightKg || '-'}</td>

                    <td><button onclick="app.deleteRecord('${r.id}')" class="btn-danger btn-sm"><i class="fa-solid fa-trash"></i></button></td>

                </tr>

            `).join('');

        }

    },



    async deleteRecord(id) {

        if(confirm('Delete this record?')) { 

            await DB.delete('records', id); 

            this.loadRecords(); 

            this.refreshDashboard(); 

        }

    },



    // --- FINANCE ---

    async saveTransaction(e) {

        e.preventDefault();

        const data = Object.fromEntries(new FormData(e.target).entries());

        data.amount = parseFloat(data.amount);

        

        const trans = { 

            id: Utils.uuid(), 

            livestock: this.state.livestock, 

            createdAt: Date.now(), 

            ...data 

        };



        await DB.add('transactions', trans);

        this.saveToCloud("transactions", trans);

        

        e.target.reset();

        this.loadFinance();

    },



    async loadFinance() {

        const trans = await DB.getAll('transactions', 'livestock', this.state.livestock);

        const list = document.getElementById('transaction-list');

        if (!list) return;



        list.innerHTML = trans.map(t => `

            <li class="list-item">

                <div><strong>${t.category}</strong><br><small>${t.date}</small></div>

                <span class="${t.type}" style="color: ${t.type === 'income' ? '#2e7d32' : '#d32f2f'}">

                    ${t.type === 'income' ? '+' : '-'}${this.state.currency}${t.amount}

                </span>

            </li>

        `).join('') || '<p>No transactions yet.</p>';

    },



    // --- REMINDERS & HEALTH ---

    async saveReminder(e) {

        e.preventDefault();

        const reminder = {

            animal: document.getElementById('remind-animal').value,

            task: document.getElementById('remind-task').value,

            date: document.getElementById('remind-date').value,

            type: this.state.livestock,

            completed: false,

            createdAt: new Date().toISOString()

        };



        if (window.auth.currentUser) {

            await addDoc(collection(window.db, "reminders"), { ...reminder, userId: window.auth.currentUser.uid });

        } else {

            const local = JSON.parse(localStorage.getItem('reminders') || '[]');

            local.push({ ...reminder, id: Utils.uuid() });

            localStorage.setItem('reminders', JSON.stringify(local));

        }



        e.target.reset();

        this.renderVaxSchedule();

        alert("Reminder Set!");

    },



    async renderVaxSchedule() {

        const list = document.getElementById('vax-list');

        if (!list) return;



        let reminders = [];

        if (window.auth.currentUser) {

            const q = query(collection(window.db, "reminders"), 

                      where("userId", "==", window.auth.currentUser.uid), 

                      where("type", "==", this.state.livestock));

            const snap = await getDocs(q);

            snap.forEach(doc => reminders.push({ id: doc.id, ...doc.data() }));

        } else {

            reminders = JSON.parse(localStorage.getItem('reminders') || '[]').filter(r => r.type === this.state.livestock);

        }



        list.innerHTML = reminders.map(rem => `

            <li class="list-item ${new Date(rem.date) < new Date() ? 'overdue' : ''}" style="display:flex; justify-content:space-between; align-items:center; padding:10px; border-bottom:1px solid #eee;">

                <div><strong>${rem.task}</strong><br><small>${rem.animal} • ${rem.date}</small></div>

                <button onclick="app.deleteReminder('${rem.id}')" class="icon-btn danger"><i class="fa-solid fa-trash"></i></button>

            </li>

        `).join('') || '<p>No reminders set.</p>';

    },



    async deleteReminder(id) {

        if (!confirm("Delete?")) return;

        if (window.auth.currentUser) {

            await deleteDoc(doc(window.db, "reminders", id));

        } else {

            let local = JSON.parse(localStorage.getItem('reminders') || '[]');

            localStorage.setItem('reminders', JSON.stringify(local.filter(r => r.id !== id)));

        }

        this.renderVaxSchedule();

    },



    // --- DASHBOARD & ANALYTICS ---

    async refreshDashboard() {
        const records = await DB.getAll('records', 'livestock', this.state.livestock);
        const trans = await DB.getAll('transactions', 'livestock', this.state.livestock);
    
        const totalProd = records.reduce((sum, r) => sum + (parseFloat(r.quantity) || 0), 0);
        const income = trans.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const expense = trans.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    
        const kpi = document.getElementById('kpi-container');
        if (kpi) {
            kpi.innerHTML = `
                <div class="kpi-card"><h4>Production</h4><div class="value">${totalProd.toFixed(1)}</div></div>
                <div class="kpi-card"><h4>Net Cash</h4><div class="value" style="color:${(income-expense) >= 0 ? '#2e7d32' : '#d32f2f'}">${this.state.currency} ${income - expense}</div></div>
            `;
        }
    
        // Animate KPI cards sequentially
        const cards = document.querySelectorAll('.kpi-card, #insight-card, .chart-card');
        cards.forEach((el, idx) => {
            setTimeout(() => el.classList.add('visible'), idx * 150);
        });
    
        this.renderChart(records);
    },

    renderChart(records) {
        const ctx = document.getElementById('productionChart')?.getContext('2d');
        const chartCard = document.querySelector('.chart-card');
        if (!ctx || records.length === 0) return;
        if (this.state.chartInstance) this.state.chartInstance.destroy();
    
        const sorted = records.sort((a,b) => new Date(a.date) - new Date(b.date)).slice(-7);
        this.state.chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: sorted.map(r => r.date),
                datasets: [{ label: 'Daily Yield', data: sorted.map(r => r.quantity || r.weightKg), borderColor: '#2E7D32', tension: 0.3 }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    
        // Fade-in chart
        if (chartCard) {
            chartCard.style.opacity = 0;
            chartCard.style.transform = 'translateY(20px)';
            setTimeout(() => chartCard.classList.add('visible'), 300);
        }
    },


    // --- CLOUD SYNC ---

    async saveToCloud(colName, data) {

        if (!window.auth.currentUser) return;

        try {

            await addDoc(collection(window.db, colName), {

                ...data,

                userId: window.auth.currentUser.uid,

                timestamp: serverTimestamp()

            });

        } catch (e) { console.error("Cloud Sync Error:", e); }

    },



    // --- HELPERS ---

    applyTheme() { document.body.classList.toggle('dark-mode', this.state.theme === 'dark'); },

    

    selectLivestock(type) {
        const landing = document.getElementById('landing-page');
        const dashboard = document.getElementById('dashboard');
        const appShell = document.getElementById('app-shell');
        const selectedCard = document.querySelector(`.card.${type}`);
    
        // Highlight selected card briefly
        if (selectedCard) {
            selectedCard.style.transform = 'scale(1.05)';
            selectedCard.style.transition = 'transform 0.2s ease';
            setTimeout(() => {
                selectedCard.style.transform = 'scale(1)';
            }, 200);
        }
    
        // Animate landing page fade-out
        landing.classList.add('fade-out');
        landing.style.opacity = 0;
        landing.style.transform = 'scale(0.98) translateY(-10px)';
    
        // After landing fade-out, hide landing and show app shell
        setTimeout(() => {
            landing.classList.add('hidden');
            landing.classList.remove('fade-out');
    
            // Show dashboard inside app shell with fade-in
            appShell.classList.remove('hidden');
            appShell.classList.add('fade-in');
            setTimeout(() => appShell.classList.remove('fade-in'), 500);
    
            // Store selected livestock type
            this.state.livestock = type;
            localStorage.setItem('ft_livestock', type);
    
            // Load dashboard content
            this.loadAppShell();
        }, 400);
    },


    loadAppShell() {

        document.getElementById('landing-page').classList.add('hidden');
        document.getElementById('app-shell').classList.remove('hidden');
        
        this.updateHeader();
        this.renderDashboard();

        const titles = { dairy: 'Dairy Farm', poultry: 'Poultry Farm', pig: 'Pig Farm', goat: 'Goat Farm' };

        document.getElementById('header-title').innerText = titles[this.state.livestock];

        this.renderAddForm();
       
        this.switchTab('view-dashboard', document.querySelector('[data-target="view-dashboard"]'));

    },

    renderDashboard() {
      const main = document.getElementById("main-content");
      main.innerHTML = `
        <div class="card">
          <h3>Production Overview</h3>
          <div class="kpi-grid">
            <div class="kpi-card">
              <h4>Total Output</h4>
              <div class="value">0</div>
            </div>
            <div class="kpi-card">
              <h4>Last Entry</h4>
              <div class="value">—</div>
            </div>
          </div>
        </div>
      `;
    },

    renderAddForm() {

        const container = document.getElementById('dynamic-fields');

        const type = this.state.livestock;

        let html = `<div class="form-group"><label>Date</label><input type="date" name="date" required value="${new Date().toISOString().split('T')[0]}"></div>`;

        if (type === 'dairy') {

            html += `<input type="text" name="cowId" placeholder="Cow Name/ID" required>

                     <select name="session"><option value="morning">Morning</option><option value="evening">Evening</option></select>

                     <input type="number" name="quantity" placeholder="Milk (Liters)" step="0.1" required>`;

        } else if (type === 'poultry') {

            html += `<input type="number" name="quantity" placeholder="Eggs Collected" required>

                     <input type="number" name="mortality" placeholder="Mortality (Birds)">`;

        } else {

            html += `<input type="text" name="id" placeholder="Animal ID">

                     <input type="number" name="weightKg" placeholder="Weight (Kg)" step="0.1">`;

        }

        html += `<input type="number" name="feedKg" placeholder="Feed Consumed (Kg)" step="0.1">

                 <textarea name="notes" placeholder="General Notes"></textarea>`;

        container.innerHTML = html;

    }

};



window.app = App;

document.addEventListener('DOMContentLoaded', () => App.init());









