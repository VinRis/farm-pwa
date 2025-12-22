import { DB } from './db.js';
import { Utils } from './utils.js';
import { loadSampleData } from './sample-data.js';
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword 
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

    // --- Health & Custom Reminders ---
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

        try {
            if (window.auth.currentUser) {
                await addDoc(collection(window.db, "reminders"), {
                    ...reminder,
                    userId: window.auth.currentUser.uid
                });
            } else {
                const local = JSON.parse(localStorage.getItem('reminders') || '[]');
                local.push({ ...reminder, id: Utils.uuid() });
                localStorage.setItem('reminders', JSON.stringify(local));
            }
            
            e.target.reset();
            await this.renderVaxSchedule(); // Refresh the list
            alert("Reminder Set Successfully!");
        } catch (err) {
            console.error("Save Reminder Error:", err);
        }
    },

    async renderVaxSchedule() {
        const list = document.getElementById('vax-list');
        if (!list) return;

        let reminders = [];
        
        // 1. Get Custom Reminders
        if (window.auth.currentUser) {
            const q = query(collection(window.db, "reminders"), where("userId", "==", window.auth.currentUser.uid), where("type", "==", this.state.livestock));
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach((doc) => reminders.push({ id: doc.id, ...doc.data() }));
        } else {
            reminders = JSON.parse(localStorage.getItem('reminders') || '[]')
                        .filter(r => r.type === this.state.livestock);
        }

        // 2. Add Static Schedule templates (Optional)
        const templates = {
            poultry: [{ task: "Newcastle Vaccine", animal: "All Birds", date: "Recurring" }],
            dairy: [{ task: "Deworming", animal: "All Cows", date: "Quarterly" }]
        };
        const activeTemplates = templates[this.state.livestock] || [];

        // 3. Render HTML
        const customHTML = reminders.map(rem => `
            <li class="list-item ${new Date(rem.date) < new Date() ? 'overdue' : ''}" style="display:flex; justify-content:space-between; align-items:center; padding:12px; border-bottom:1px solid #eee; margin-bottom:5px; border-radius:8px;">
                <div class="item-info">
                    <strong>${rem.task}</strong><br>
                    <small>${rem.animal} • ${rem.date}</small>
                </div>
                <button onclick="app.deleteReminder('${rem.id}')" class="icon-btn" style="color:#e53935">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </li>
        `).join('');

        list.innerHTML = customHTML || '<p style="text-align:center; padding:20px; color:#666;">No reminders set.</p>';
    },

    async deleteReminder(id) {
        if (!confirm("Delete this reminder?")) return;
        if (window.auth.currentUser) {
            await deleteDoc(doc(window.db, "reminders", id));
        } else {
            let local = JSON.parse(localStorage.getItem('reminders') || '[]');
            local = local.filter(r => r.id !== id);
            localStorage.setItem('reminders', JSON.stringify(local));
        }
        this.renderVaxSchedule();
    },

    // --- Core logic & UI ---
    init() {
        this.applyTheme();
        this.bindEvents();
        
        // Listen for Firebase Auth to update Drawer Profile
        window.auth.onAuthStateChanged(user => {
            const emailDisp = document.getElementById('user-email-display');
            if (emailDisp) emailDisp.innerText = user ? user.email : "Guest User";
            if (this.state.livestock) this.renderVaxSchedule(); 
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('./service-worker.js')
                    .then(() => console.log("FarmTrack Offline Ready"))
                    .catch(err => console.log("SW Registration Failed", err));
            }
        });

        if (this.state.livestock) this.loadAppShell();
    },

    bindEvents() {
        const drawer = document.getElementById('side-drawer');
        const overlay = document.getElementById('drawer-overlay');

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

        // Map Drawer Buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetId = btn.getAttribute('data-target');
                this.switchTab(targetId, btn);
                closeDrawer();
            });
        });

        // Forms
        document.getElementById('reminder-form')?.addEventListener('submit', (e) => this.saveReminder(e));
        
        document.getElementById('auth-status-btn')?.addEventListener('click', () => {
            document.getElementById('auth-modal').classList.remove('hidden');
        });

        document.getElementById('auth-toggle-btn')?.addEventListener('click', () => {
            this.state.isLoginMode = !this.state.isLoginMode;
            document.getElementById('auth-title').innerText = this.state.isLoginMode ? "Sign In" : "Create Account";
            document.getElementById('auth-submit-btn').innerText = this.state.isLoginMode ? "Login" : "Sign Up";
        });

        document.getElementById('auth-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('auth-email').value;
            const password = document.getElementById('auth-password').value;
            try {
                if (this.state.isLoginMode) {
                    await signInWithEmailAndPassword(window.auth, email, password);
                } else {
                    await createUserWithEmailAndPassword(window.auth, email, password);
                }
                document.getElementById('auth-modal').classList.add('hidden');
            } catch (err) { alert(err.message); }
        });

        document.getElementById('logout-btn')?.addEventListener('click', () => {
            if (confirm("Log out?")) window.auth.signOut().then(() => window.location.reload());
        });

        document.getElementById('home-btn')?.addEventListener('click', () => {
            this.state.livestock = null;
            localStorage.removeItem('ft_livestock');
            document.getElementById('app-shell').classList.add('hidden');
            document.getElementById('landing-page').classList.remove('hidden');
        });

        document.getElementById('add-record-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = Object.fromEntries(new FormData(e.target).entries());
            const record = { id: Utils.uuid(), livestock: this.state.livestock, createdAt: Date.now(), ...data };
            await DB.add('records', record);
            e.target.reset();
            this.refreshDashboard();
            this.saveRecordToCloud(record);
        });

        document.getElementById('theme-toggle')?.addEventListener('click', () => {
            this.state.theme = this.state.theme === 'light' ? 'dark' : 'light';
            localStorage.setItem('ft_theme', this.state.theme);
            this.applyTheme();
        });
    },

    applyTheme() {
        document.body.classList.toggle('dark-mode', this.state.theme === 'dark');
    },

    selectLivestock(type) {
        this.state.livestock = type;
        localStorage.setItem('ft_livestock', type);
        this.loadAppShell();
    },

    async loadAppShell() {
        document.getElementById('landing-page').classList.add('hidden');
        document.getElementById('app-shell').classList.remove('hidden');
        const titles = { dairy: 'Dairy Farm', poultry: 'Poultry Farm', pig: 'Pig Farm', goat: 'Goat Farm' };
        document.getElementById('header-title').innerText = titles[this.state.livestock];
        this.renderAddForm();
        this.switchTab('view-dashboard', document.querySelector('[data-target="view-dashboard"]'));
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

        if (viewId === 'view-dashboard') this.refreshDashboard();
        if (viewId === 'view-records') this.loadRecords();
        if (viewId === 'view-finance') this.loadFinance();
        if (viewId === 'view-vax') this.renderVaxSchedule();
    },

    // ... [Add Form, Dashboard, Chart methods remain same as your previous logic] ...
    renderAddForm() {
        const container = document.getElementById('dynamic-fields');
        const type = this.state.livestock;
        let html = `<div class="form-group"><input type="date" name="date" required value="${new Date().toISOString().split('T')[0]}"></div>`;
        if (type === 'dairy') {
            html += `<input type="text" name="cowId" placeholder="Cow ID" required class="form-control">
                     <select name="session"><option value="morning">Morning</option><option value="evening">Evening</option></select>
                     <input type="number" name="quantity" placeholder="Milk (L)" step="0.1" required>`;
        } else if (type === 'poultry') {
            html += `<input type="number" name="quantity" placeholder="Eggs Collected" required>
                     <input type="number" name="mortality" placeholder="Birds Dead">`;
        }
        html += `<input type="number" name="feedKg" placeholder="Feed (Kg)">
                 <textarea name="notes" placeholder="Notes"></textarea>`;
        container.innerHTML = html;
    },

    async refreshDashboard() {
        const records = await DB.getAll('records', 'livestock', this.state.livestock);
        this.renderChart(records);
        // ... rest of dashboard logic
    },

    renderChart(records) {
        const ctx = document.getElementById('productionChart')?.getContext('2d');
        if (!ctx) return;
        if (this.state.chartInstance) this.state.chartInstance.destroy();
        const sorted = records.sort((a,b) => new Date(a.date) - new Date(b.date)).slice(-7);
        this.state.chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: sorted.map(r => r.date),
                datasets: [{ label: 'Prod', data: sorted.map(r => r.quantity), borderColor: '#2E7D32', tension: 0.1 }]
            },
            options: { responsive: true }
        });
    },

    async saveRecordToCloud(recordData) {
        if (!window.auth.currentUser) return;
        try {
            await addDoc(collection(window.db, "production"), {
                ...recordData,
                userId: window.auth.currentUser.uid,
                timestamp: serverTimestamp()
            });
        } catch (e) { console.error("Cloud Error: ", e); }
    }
};

window.app = App;
document.addEventListener('DOMContentLoaded', () => App.init());

