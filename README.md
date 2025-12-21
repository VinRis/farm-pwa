README.md
# FarmTrack

FarmTrack is an offline-first Progressive Web App (PWA) for farmers to track and monitor production for dairy, poultry, pig, and goat livestock.

## Installation

1. Clone the repository: `git clone <repo-url>`
2. Push to your GitHub repository.

## Deployment to GitHub Pages

Use the provided GitHub Action in `.github/workflows/deploy.yml` which deploys on push to main.

Alternatively:
1. Go to repository settings > Pages.
2. Select source as main branch and root folder.
3. Save.

## Installing as PWA

Open in Chrome/Android, click "Add to home screen".

## Backup/Restore

Use Reports view to export/import JSON backups.

## Optional Cloud Sync

To enable cloud backup, implement `syncToCloud()` in app.js using e.g., Firebase. Add your API keys via user input (not in code). Warning: Storing sensitive data in cloud has risks; use at own discretion.
