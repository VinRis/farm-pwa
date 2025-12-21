utils.js
export function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString();
}

export function exportCSV(data, filename) {
  const csv = data.map(row => Object.values(row).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  downloadBlob(blob, filename);
}

export function exportJSON(data, filename) {
  const json = JSON.stringify(data);
  const blob = new Blob([json], { type: 'application/json' });
  downloadBlob(blob, filename);
}

export async function importJSON(data) {
  // Assume db is global or import
  const db = await openDB(); // from db.js
  const tx = db.transaction(['meta', 'records', 'transactions', 'syncQueue'], 'readwrite');
  await tx.objectStore('meta').put({ key: 'settings', ...data.meta });
  for (const rec of data.records) {
    await tx.objectStore('records').put(rec);
  }
  for (const t of data.transactions) {
    await tx.objectStore('transactions').put(t);
  }
  for (const q of data.syncQueue || []) {
    await tx.objectStore('syncQueue').put(q);
  }
  await tx.done;
}

export async function generatePDF(contentHtml, filename) {
  const element = document.createElement('div');
  element.innerHTML = contentHtml;
  document.body.appendChild(element); // Temp for rendering
  const opt = {
    margin: 1,
    filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
  };
  await html2pdf().set(opt).from(element).save();
  document.body.removeChild(element);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function generateReportContent(meta, records, trans) {
  // Simple HTML for PDF
  return `
    <h1>Farm Report</h1>
    <p>Farmer: ${meta.farmerName || 'Unknown'}</p>
    <p>Farm: ${meta.farmName || 'Unknown'}</p>
    <!-- Add KPIs, charts as images, tables -->
    <h2>Records</h2>
    <table>
      ${records.map(r => `<tr><td>${formatDate(r.date)}</td><td>${r.quantity}</td></tr>`).join('')}
    </table>
    <h2>Transactions</h2>
    <table>
      ${trans.map(t => `<tr><td>${formatDate(t.date)}</td><td>${t.amount}</td></tr>`).join('')}
    </table>
  `;
}
