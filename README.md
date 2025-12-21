# FarmTrack — Offline Farm Production Tracker (PWA)

**FarmTrack** is a complete offline-first Progressive Web App (PWA) to help smallholder farmers track and monitor production for **Dairy, Poultry, Pig, and Goat**.  It uses **IndexedDB** as the single source of truth and works entirely in the browser — no server required.

---

## Features

- Offline-first PWA with Service Worker and Web App Manifest.
- IndexedDB stores: `meta`, `records`, `transactions`, `syncQueue`.
- Add/Edit/Delete records per livestock type with adaptive forms.
- Dashboard with KPIs, trend charts (Chart.js) and recent records.
- Finance view with transactions, CSV export.
- Reports view: generate printable PDF reports (html2canvas + jsPDF).
- Export/Import JSON backup of the entire database.
- Sync queue stub for optional cloud sync (implement `syncToCloud()`).
- Installable on Android/desktop via PWA install.

---

## Files in this repo

Key files included:

- `index.html` — main app shell and UI.
- `style.css` — styles.
- `app.js` — main application logic (ES module).
- `db.js` — IndexedDB helper using `idb`.
- `utils.js` — export / date / PDF helpers.
- `manifest.json` — PWA manifest.
- `service-worker.js` — SW caches app shell & libs.
- `sample-data.js` — preloads small sample records (used by landing page).
- `README.md`, `LICENSE`.
- `.github/workflows/deploy.yml` — GitHub Actions workflow to deploy to GitHub Pages.

---

## How to run locally

1. Clone the repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
   cd YOUR_REPO
