// app.js
document.addEventListener('DOMContentLoaded', () => {

    // 1. Select all livestock category buttons
    const livestockButtons = document.querySelectorAll('main .grid button');

    livestockButtons.forEach(button => {
        // Add click event
        button.addEventListener('click', function(e) {
            // Get the name of the livestock from the button's text
            const livestockName = this.querySelector('p.text-white').innerText;
            
            console.log(`Navigating to: ${livestockName}`);
            
            // Visual feedback: brief flash or scale effect
            this.classList.add('ring-4', 'ring-primary');
            
            // Simulate navigation/loading
            handleNavigation(livestockName);
            
            // Remove the ring after a short delay
            setTimeout(() => {
                this.classList.remove('ring-4', 'ring-primary');
            }, 200);
        });
    });

    // 2. Navigation Handler
    function handleNavigation(category) {
        // In a real app, this would route to a new page or change the view
        const mainContent = document.querySelector('main');
        
        // Simple transition effect
        mainContent.style.opacity = '0';
        mainContent.style.transform = 'translateY(10px)';
        mainContent.style.transition = 'all 0.3s ease';

        setTimeout(() => {
            alert(`Opening ${category} Management Dashboard...`);
            // Reset for demo purposes
            mainContent.style.opacity = '1';
            mainContent.style.transform = 'translateY(0)';
        }, 300);
    }

    // 3. Sync Button Logic
    const syncBtn = document.querySelector('button:last-of-type').parentElement.previousElementSibling.querySelector('button');
    if (syncBtn) {
        syncBtn.addEventListener('click', () => {
            syncBtn.innerText = "Syncing...";
            syncBtn.classList.add('animate-pulse');
            setTimeout(() => {
                syncBtn.innerText = "Sync Now";
                syncBtn.classList.remove('animate-pulse');
            }, 1500);
        });
    }
});
    
    // --- State Management ---
    const state = {
        currentCategory: 'All',
        isDarkMode: true,
        totalHerd: 145,
        healthyCount: 142,
        monitoringCount: 2,
        sickCount: 1
    };

    // --- Selectors ---
    const livestockCards = document.querySelectorAll('main > .grid > button');
    const syncBtn = document.querySelector('button:contains("Sync Now")');
    const body = document.body;

    // --- Feature: Dynamic Livestock Selection ---
    livestockCards.forEach(card => {
        card.addEventListener('click', () => {
            const animal = card.querySelector('p').innerText;
            showToast(`Loading ${animal} Dashboard...`);
            // Transition logic to secondary screens could go here
            animateTransition();
        });
    });

    // --- Feature: Bottom Sheet Toggle ---
    // (Injecting the FAB and Bottom Sheet for the demo)
    injectActionMenu();

    // --- Feature: Progress Bar Animation ---
    updateHealthBar();

    // --- Feature: Financial Pulse ---
    initFinanceInteractions();

    // --- Helper Functions ---

    function updateHealthBar() {
        const total = state.totalHerd;
        const healthyPercent = (state.healthyCount / total) * 100;
        const monitorPercent = (state.monitoringCount / total) * 100;
        
        // This targets the visual indicator seen in the screenshot
        const bar = document.querySelector('.health-progress-bar');
        if(bar) {
            bar.style.width = `${healthyPercent}%`;
        }
    }

    function injectActionMenu() {
        // Create the Floating Action Button (+)
        const fab = document.createElement('button');
        fab.className = "fixed bottom-6 right-6 size-14 bg-primary rounded-full fab-glow flex items-center justify-center text-background-dark z-[60] transition-transform active:scale-90";
        fab.innerHTML = '<span class="material-symbols-outlined text-3xl font-bold">add</span>';
        document.body.appendChild(fab);

        // Create the Overlay & Bottom Sheet
        const overlay = document.createElement('div');
        overlay.className = "fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] hidden opacity-0 transition-opacity duration-300";
        
        const sheet = document.createElement('div');
        sheet.className = "fixed bottom-0 left-0 right-0 bg-surface-dark rounded-t-3xl p-6 z-[80] bottom-sheet border-t border-white/10";
        sheet.innerHTML = `
            <div class="w-12 h-1.5 bg-gray-600 rounded-full mx-auto mb-6"></div>
            <h3 class="text-white text-xl font-bold mb-4">New Record</h3>
            <div class="space-y-4">
                <button class="w-full flex items-center p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group">
                    <div class="p-3 rounded-lg bg-green-500/20 text-green-400 mr-4"><span class="material-symbols-outlined">inventory_2</span></div>
                    <div class="text-left"><p class="text-white font-bold">Production Record</p><p class="text-gray-400 text-sm">Log milk, eggs, or weight</p></div>
                    <span class="material-symbols-outlined ml-auto text-gray-500 group-hover:text-white">chevron_right</span>
                </button>
                <button class="w-full flex items-center p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group">
                    <div class="p-3 rounded-lg bg-blue-500/20 text-blue-400 mr-4"><span class="material-symbols-outlined">payments</span></div>
                    <div class="text-left"><p class="text-white font-bold">Financial Transaction</p><p class="text-gray-400 text-sm">Record sales or expenses</p></div>
                    <span class="material-symbols-outlined ml-auto text-gray-500 group-hover:text-white">chevron_right</span>
                </button>
            </div>
        `;

        document.body.appendChild(overlay);
        document.body.appendChild(sheet);

        fab.addEventListener('click', () => {
            overlay.classList.remove('hidden');
            setTimeout(() => {
                overlay.classList.add('opacity-100');
                sheet.classList.add('active');
            }, 10);
        });

        overlay.addEventListener('click', () => {
            sheet.classList.remove('active');
            overlay.classList.remove('opacity-100');
            setTimeout(() => overlay.classList.add('hidden'), 300);
        });
    }

    function initFinanceInteractions() {
        const syncBtn = document.querySelector('button:contains("Sync Now")');
        if(syncBtn) {
            syncBtn.addEventListener('click', (e) => {
                const icon = e.target.parentElement.querySelector('.material-symbols-outlined');
                icon.classList.add('animate-spin');
                e.target.innerText = "Syncing...";
                setTimeout(() => {
                    icon.classList.remove('animate-spin');
                    e.target.innerText = "Sync Now";
                    showToast("Farm data synchronized!");
                }, 2000);
            });
        }
    }

    function showToast(message) {
        const toast = document.createElement('div');
        toast.className = "fixed bottom-24 left-1/2 -translate-x-1/2 bg-white text-background-dark px-6 py-3 rounded-full font-bold shadow-2xl z-[100] animate-bounce";
        toast.innerText = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    function animateTransition() {
        document.querySelector('main').style.opacity = '0';
        setTimeout(() => {
            document.querySelector('main').style.opacity = '1';
            document.querySelector('main').style.transition = 'opacity 0.5s ease';
        }, 300);
    }
});

// Custom selector helper
window.NodeList.prototype.contains = function(text) {
    return Array.from(this).find(el => el.textContent.includes(text));
};
