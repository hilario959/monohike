# Monohike

Monohike is an offline-first, mobile-focused “AllTrails-lite” Progressive Web App for recording hikes, reviewing stats, and exporting GPX files. Everything is stored locally in IndexedDB.

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
npm run preview
```

## GitHub Pages deployment

This project is configured for **root-domain GitHub Pages** hosting (https://<USER>.github.io/).

1. Push to the `main` branch.
2. The workflow at `.github/workflows/deploy.yml` builds the Vite app and publishes the `dist` folder.
3. In your repository settings, ensure GitHub Pages is set to **GitHub Actions** as the source.

## Notes on iOS PWA limitations

- Location tracking only works while the PWA is in the foreground.
- Background location updates are restricted, so pause/resume as needed when switching apps.
- If permission prompts are dismissed, reopen Safari settings to re-enable location permissions.
