# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Tanzim frontend: a bilingual (English / Arabic, RTL) multi-tenant ERP UI for the Django/DRF backend `0Mustafa37/Tanzim`.
Angular 21 (standalone components, signals, zone.js), PrimeNG 21.1.10, Tailwind 3, ngx-translate, Karma + Jasmine.

Read before changing code: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) (structure, conventions, list/form recipes,
roadmap) and [docs/CODE_MAP.md](docs/CODE_MAP.md) (what exists, how it connects, hot spots). The API contract is
[docs/API_REFERENCE.md](docs/API_REFERENCE.md) (a copy of the backend's; re-copy after backend changes) and
[docs/API_REFERENCE_CHAT.md](docs/API_REFERENCE_CHAT.md) for `/api/chat/v1/`.

## Commands

Node `^20.19`, `^22.12` or `^24`. How the lint, tests, e2e and CI fit together: [docs/guides/safety-net.md](docs/guides/safety-net.md).

| Task | Command |
|---|---|
| Install | `npm ci` |
| Dev server (proxies `/api` and `/ws` to `localhost:8000`) | `npx ng serve --proxy-config proxy.conf.json` |
| Lint (ESLint, `src/**/*.ts` and `*.html`) | `npm run lint` (auto-fix: `npx eslint src --fix`) |
| Production build | `npm run build` (initial bundle budget: warning 1.5 MB, error 2.5 MB) |
| All unit tests | `npx ng test --watch=false --browsers=ChromeHeadless` (CI uses `ChromeHeadlessCI`, no sandbox) |
| One spec file / folder | `npx ng test --watch=false --browsers=ChromeHeadless --include='src/app/core/chat/chat.store.spec.ts'` (globs work: `'src/app/features/chat/**/*.spec.ts'`) |
| End-to-end (Playwright, mocked API, starts `ng serve` on :4300) | `npm run e2e`; one file: `npx playwright test e2e/chat.spec.ts`; first time: `npx playwright install chromium` |
| Deploy to GitHub Pages | Automatic: `.github/workflows/deploy.yml` publishes `main` after CI passes. `npm run deploy` still works locally |

`.github/workflows/ci.yml` runs lint → unit tests → build → e2e on every PR and push to `main`. A local
`npm run deploy` builds from the working folder, so uncommitted changes ship too; prefer the CI deploy.
E2E tests mock every `/api/` request and the notifications socket with `e2e/support/mock-api.ts`
(`MockApi.on(method, path, response)`, `MockSocket.push(frame)`, `signIn(page, api)`); keep mocked responses in the
real API's shape. `src/app/i18n-parity.spec.ts` fails when `en.json` and `ar.json` keys differ.
The production build talks to the backend through an ngrok URL set in `src/environments/environment.prod.ts`;
the dev build uses relative `/api/` through the proxy and `ws://localhost:8000/ws/`.

## Architecture

- `core/` — singletons without UI; `shared/` — reusable UI with no business knowledge; `layout/` — the signed-in
  frame (shell, header, sidebar, nav); `features/<area>/` — one folder per business area, lazy-loaded from
  `app.routes.ts`; `testing/` — spec helpers and fixtures only. Features may import other features' services and
  models, never their components; `core/` and `shared/` never import from `features/`.
- **HTTP**: every response is the envelope `{ success, data, metadata, error }`. `BaseApiService` prefixes
  `API_BASE_URL`; resource services extend `CrudApi<T, TPayload>` and only set `path` (ending in `/`).
  Interceptor order (`app.config.ts`): duplicate-write → api-headers → auth → loading → error. Errors arrive as
  `AppError`; `errorInterceptor` toasts only network/5xx, so 4xx is handled by the screen (`handleSaveError`,
  `ConfirmService`, `<app-error-state>`).
- **Access**: `AccessService` loads `GET company/v1/me/`; `can('add_x')` needs the codename plus the module's
  `access_<module>` (mirrored in `core/auth/permission-catalog.ts`, keep it in step with the backend). It answers
  false while loading and true if `/me` fails. Gate menus in `layout/nav/nav-items.ts`, routes with
  `permissionGuard` + `data.permission`, buttons with `computed(() => access.can(...))`.
- **Real time**: `NotificationCenterService` owns the single WebSocket `/ws/notifications/{user_id}/?token=…`
  (reconnect with backoff, token refresh on close code 4001). Bells go to `incoming$`
  (`LiveNotificationsService` toasts them and reloads `/me` on account changes); `chat.*` frames go to
  `chatEvents$`, reconnects to `reconnected$`, client frames out through `send()`.
- **Chat**: `core/chat/ChatStore` is the only place chat socket events and REST answers are applied (list, header
  badge, open thread, typing, read markers, reconnect catch-up). One `ChatThread` per opened chat holds its
  messages, members and idempotent sends (`client_id`). The drawer UI in `features/chat/` loads with
  `@defer (when chat.drawerOpen())` in the shell; keep it out of the initial bundle.
- **Dropdown cache**: `CrudApi.dropdown()` reads through `core/api/OptionsCache` (5-minute TTL); every successful
  POST/PUT/PATCH/DELETE through `BaseApiService` drops the lists of the resource it wrote to (prefix match on the
  path), plus `ALSO_CHANGES` for related lists; other tabs hear it over a BroadcastChannel. Never cache dropdowns by hand.
  Guide: [docs/guides/global-services.md](docs/guides/global-services.md).
- **Lists**: `readonly table = new ServerTable((q) => this.api.list(q))` handles paging, sorting, debounced search
  and stale requests. Non-paginated endpoints (`company-user/`, `admin/company/`) use `api.all()` + client paging.
- **Forms**: reactive (`NonNullableFormBuilder`), create = POST, edit = PATCH with the full body, cleared pickers
  send `null`. Short forms open in a dialog (`FormDialogService` + `injectFormContext`), long ones are pages.

## Conventions

- **UI library only through `src/app/shared/ui`**: `app-button`, `app-card`, `app-select` / `app-multi-select`
  (ControlValueAccessors, `(changed)` gives the value, `[translateLabels]`, `appSelectItem` templates), `app-toggle`,
  `app-password`, `app-dialog` (`[(visible)]`, `width`, `appDialogFooter`). Import each from its own file (no barrel:
  it pulls every wrapper into the bundle). ESLint forbids those PrimeNG modules elsewhere; tables (`p-table`) are not
  wrapped yet. Every variant is on the dev-only gallery at `/ui` (`ng serve`). Shape tokens (radius, shadow, font)
  are CSS variables in `styles.scss`. Guide: [docs/guides/ui-components.md](docs/guides/ui-components.md).
- Components: `.ts` + `.html` (`templateUrl`), `ChangeDetectionStrategy.OnPush`, selectors `app-<name>`,
  `inject()` for dependencies. Models per area in `<area>.models.ts`.
- Error panels: `<app-error-state [error]="err">` (title follows the status). Dates: `{{ x | appDate }}`
  (`'date'`, `'seconds'`; empty shows "—"). Export names: `datedFileName(base, ext)`.
- Every visible string is a key in both `src/assets/i18n/en.json` and `ar.json`. Use logical Tailwind classes only
  (`ps-/pe-/ms-/me-/start-/end-/text-start/text-end`, arrows `rtl:rotate-180`); never left/right variants.
- Comments explain why (backend quirks point to the backend-requests doc), not what.
- Specs sit next to the file; use `provideApiTesting()`, `envelope()` / `errorEnvelope()` from
  `src/app/testing/api-testing.ts` and the per-area fixtures there.
- PrimeNG 22 needs a paid license key: don't upgrade past 21 without the owner's decision.
- `ng serve` on Windows sometimes keeps serving a stale chunk: touch the file or restart it.

## Workflow

- One branch and one PR per step; run `git branch --show-current` before every commit (the owner may have switched
  to `main`). The `gh` CLI isn't installed: open PRs through the GitHub REST API with git's stored credentials.
- Progress lives in `docs/plans/checklist.md`; tick an item ✅ only when the backend shipped, the frontend works
  against the real API and tests pass (🟡 = frontend ready, waiting on backend).
- Don't read the backend repo to find out what exists. Anything unknown or missing becomes a numbered item in
  `docs/BACKEND_REQUESTS_ROADMAP.md` (English); the owner relays it.
- Designs go in `docs/superpowers/specs/`, plans in `docs/superpowers/plans/`. Update `docs/CODE_MAP.md` with
  every change.
- Once a feature's tests pass, don't re-run the suite or do extra browser checks before wrapping up.
