# Tanzim frontend

Bilingual (English / Arabic, RTL) ERP frontend for the Tanzim backend (`0Mustafa37/Tanzim`).
Angular 21 · PrimeNG 21 · Tailwind 3 · ngx-translate.

## Start here

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): folder structure, conventions, how to add a screen, and the roadmap.
- [docs/CODE_MAP.md](docs/CODE_MAP.md): every module, feature and service, how they connect, and where the tricky logic is.
- [docs/BACKEND_REQUESTS.md](docs/BACKEND_REQUESTS.md): what the frontend needs from the backend.
- [docs/HANDOFF.md](docs/HANDOFF.md): the prompt for continuing work in a new session.

## Commands

Node `^20.19`, `^22.12` or `^24`.

| Task | Command |
|---|---|
| Install | `npm ci` |
| Dev server (proxies `/api` to `localhost:8000`) | `npx ng serve --proxy-config proxy.conf.json` |
| Production build | `npm run build` (output in `dist/tanzim-frontend/browser`) |
| Unit tests | `npx ng test --watch=false` |
| Deploy to GitHub Pages | `npm run deploy` |
