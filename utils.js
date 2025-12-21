// utils.js
export function uuid() {
  return crypto.randomUUID();
}

export function formatDate(d) {
  return new Date(d).toLocaleDateString();
}

export function exportCSV(filename, rows) {
  const csv = rows.map(r => Object.values(r).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

export async function exportPDF(elementId, filename) {
  const el = document.getElementById(elementId);
  const canvas = await html2canvas(el);
  const img = canvas.toDataURL('image/png');
  const pdf = new jspdf.jsPDF();
  pdf.addImage(img, 'PNG', 10, 10, 190, 0);
  pdf.save(filename);
}
