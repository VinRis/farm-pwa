export const Utils = {
    uuid() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    formatDate(dateStr) {
        const options = { month: 'short', day: 'numeric' };
        return new Date(dateStr).toLocaleDateString(undefined, options);
    },

    generatePDF(title, records, transactions, type) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        doc.setFontSize(20);
        doc.text(title, 14, 22);
        doc.setFontSize(12);
        doc.text(`Livestock Type: ${type.toUpperCase()}`, 14, 30);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 38);

        const data = records.map(r => [r.date, r.cowId || 'N/A', r.quantity]);
        doc.autoTable({
            head: [['Date', 'ID/Name', 'Quantity']],
            body: data,
            startY: 45
        });

        doc.save(`FarmTrack_${type}_Report.pdf`);
    }
};
