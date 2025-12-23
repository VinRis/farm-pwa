// App State
let currentLivestock = null;

// Navigation Function
function showPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.page-content').forEach(p => p.classList.add('hidden'));
    
    // Show selected page
    const target = document.getElementById(`page-${pageId}`);
    if (target) target.classList.remove('hidden');

    // Update Top Bar & FAB visibility
    const isWelcome = pageId === 'welcome';
    document.getElementById('top-bar').classList.toggle('hidden', isWelcome);
    document.getElementById('bottom-nav').classList.toggle('hidden', isWelcome);
    document.getElementById('fab').classList.toggle('hidden', isWelcome);

    // Update Title
    document.getElementById('page-title').innerText = pageId.charAt(0).toUpperCase() + pageId.slice(1);
    
    // Update Nav Icons
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
}

// Livestock Selection
function selectLivestock(type) {
    currentLivestock = type;
    showPage('dashboard');
}

// Modal Toggle
function toggleModal(id) {
    const modal = document.getElementById(id);
    modal.classList.toggle('hidden');
}

// PDF Generation (Requires jsPDF)
function generatePDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text("Farm Report - " + currentLivestock, 10, 10);
    doc.text("Date: " + new Date().toLocaleDateString(), 10, 20);
    doc.save("Farm_Report.pdf");
}

// Initialize
window.onload = () => {
    showPage('welcome');
};
