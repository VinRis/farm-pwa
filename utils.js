export const Utils = {
    uuid: () => Math.random().toString(36).substr(2, 9),
    
    formatDate: (dateStr) => {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateStr).toLocaleDateString(undefined, options);
    },

    generatePDF: (title, records, transactions, type, dateRange) => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Header
        doc.setFontSize(20);
        doc.setTextColor(16, 185, 129); // FarmTrack Green
        doc.text("FarmTrack Report", 14, 22);
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Category: ${type.toUpperCase()} | Generated: ${new Date().toLocaleString()}`, 14, 30);
        
        // Production Table
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text("Production Records", 14, 45);
        
        const prodData = records.map(r => [
            this.Utils.formatDate(r.date),
            r.cowId || r.id || 'N/A',
            r.quantity || r.weightKg || '0'
        ]);

        doc.autoTable({
            startY: 50,
            head: [['Date', 'ID/Name', 'Yield']],
            body: prodData,
            theme: 'striped',
            headStyles: { fillColor: [16, 185, 129] }
        });

        // Finance Table
        const finalY = doc.lastAutoTable.finalY + 15;
        doc.text("Financial Summary", 14, finalY);

        const financeData = transactions.map(t => [
            this.Utils.formatDate(t.date),
            t.category,
            t.type.toUpperCase(),
            t.amount.toFixed(2)
        ]);

        doc.autoTable({
            startY: finalY + 5,
            head: [['Date', 'Category', 'Type', 'Amount']],
            body: financeData,
            theme: 'grid',
            headStyles: { fillColor: [59, 130, 246] }
        });

        doc.save(`FarmTrack_${type}_Report.pdf`);
    }
};
