# FarmTrack PWA

An offline-first Progressive Web App (PWA) for managing farm production (Dairy, Poultry, Pig, Goat).

## Features
- **Offline First:** Uses IndexedDB and Service Worker. Works completely without internet.
- **Multi-Livestock:** Track Dairy, Poultry, Pig, and Goat farms separately.
- **Dashboard:** Visual charts and KPIs for production and finances.
- **Finance:** Track Income and Expenses.
- **Reports:** Generate PDF reports and Export CSVs.
- **Backup:** Export/Import JSON data for local backups.

## Installation

### Hosting on GitHub Pages
1. Fork or Clone this repository.
2. Go to Repository Settings -> Pages.
3. Source: `GitHub Actions`.
4. Push a change to `main`. The included workflow will deploy it automatically.

### Running Locally
No build tools required.
1. Clone repo.
2. Use a local server (e.g., VS Code Live Server or Python `http.server`).
   ```bash
   python3 -m http.server
