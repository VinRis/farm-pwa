<!-- README.md -->
# FarmTrack PWA

Offline-first Progressive Web App for farmers to track Dairy, Poultry, Pig, and Goat production.

## Features
- Works fully offline using IndexedDB
- Dashboards, records, finance, reports
- CSV & PDF exports
- Installable as PWA

## Install & Run
1. Clone repo
2. Push to GitHub
3. Enable GitHub Pages (root)

Or open `index.html` locally.

## Backup & Restore
- Export CSV from Finance
- JSON backup can be added via IndexedDB dump (see utils)

## Optional Cloud Sync
Implement `syncToCloud()` in `app.js` (Firebase/Gist). No keys included.

## PWA Install
Open in Chrome → “Add to Home Screen”
