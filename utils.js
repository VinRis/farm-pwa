// utils.js - helpers for CSV, PDF, date formatting, uuid
import DB from './db.js';

export function uid() {
  // simple UUID v4
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}

export function isoNow() {
  return new Date().toISOString();
}

export function formatDate(iso) {
  if(!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString();
}

export function csvDownload(filename, rows, headers) {
  const cols = headers || Object.keys(rows[0] || {});
  const csv = [cols.join(',')].concat(rows.map(r => cols.map(c => {
    let v = r[c] ?? '';
    if (typeof v === 'string') v = v.replace(/"/g,'""');
    return `"${v}"`;
  }).join(','))).join('\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// JSON backup download
export function jsonDownload(filename, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Generate PDF report using html2canvas + jsPDF
export async function generatePdfReport({title='FarmReport', element, filename='report.pdf'}) {
  // element can be a DOM node or array of nodes to capture
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF('p','mm','a4');
  const nodes = Array.isArray(element) ? element : [element];
  let y = 10;
  for (const node of nodes) {
    // rending at 2x scale for clarity
    const canvas = await html2canvas(node, { scale: 2, useCORS: true, logging: false });
    const imgData = canvas.toDataURL('image/png');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfW = pdf.internal.pageSize.getWidth() - 20;
    const pdfH = (imgProps.height * pdfW) / imgProps.width;
    if (y + pdfH > pdf.internal.pageSize.getHeight() - 10) {
      pdf.addPage();
      y = 10;
    }
    pdf.addImage(imgData, 'PNG', 10, y, pdfW, pdfH);
    y += pdfH + 8;
  }
  pdf.save(filename);
  return true;
}

// small helper to aggregate
export function sum(arr, field) {
  return arr.reduce((s, a) => s + (Number(a[field]) || 0), 0);
}

// attach to window for quick debugging
window.utils = { uid, isoNow, formatDate, csvDownload, jsonDownload, generatePdfReport, sum, DB };
export default { uid, isoNow, formatDate, csvDownload, jsonDownload, generatePdfReport, sum };
