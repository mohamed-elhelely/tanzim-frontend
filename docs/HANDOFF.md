# Session handoff prompt

Paste the block below as the first message of a new session to continue work without re-explaining the project.
Update the "Current state" section whenever a PR merges or the next step changes.

```text
You are continuing work on Tanzim, a bilingual (English/Arabic, RTL) ERP. Two repos:

- Frontend: mohamed-elhelely/tanzim-frontend (Angular 21, standalone + signals, PrimeNG 21.1.10, Tailwind 3, ngx-translate, Jasmine/Karma)
- Backend: 0Mustafa37/Tanzim (Django + DRF, SQLite + Redis locally). API source of truth: docs/API_REFERENCE.md and docs/BUSINESS_LOGIC.md in the backend repo; check the serializers when the docs look stale.

## Current state (2026-10-10)
- main (frontend) has Step 4 (Company & Organisation), Step 5 (Locations) and the redesign (PR mohamed-elhelely/tanzim-frontend#4, merged 2026-10-08). Specs live in docs/superpowers/specs/ (2026-10-07-company-organisation-design.md, 2026-10-07-locations-design.md, each ends with a "Verification results" table).
- What #4 brought in:
  - Angular 18→21 via ng update, one major at a time.
  - PrimeNG 17→21.1.10. This is the last MIT release; v22 needs a PrimeUI license key, so do NOT upgrade to 22 without the owner's decision.
  - Builders moved to @angular/build.
  - Redesign: dark indigo sidebar, header with breadcrumb + language/dark-mode toggles + user menu, dashboard with real counts/setup checklist/quick actions, search inside list cards, coming-soon pages, split-screen login.
  - Production build points at the backend via ngrok: https://chunk-surcharge-manhood.ngrok-free.dev/api/. An interceptor adds `ngrok-skip-browser-warning` to any ngrok host.
- main also has Step 6 (platform-staff Companies, /admin/companies; spec 2026-10-08-platform-companies-design.md) and menu visibility by role and subscription (spec 2026-10-08-menu-visibility-design.md).
- main also has Step 7 (Inventory catalogue; spec 2026-10-08-inventory-catalogue-design.md).
- main also has the code-structure cleanup (#9) and Step 8 (warehouses, zones, bins, suppliers; #10).
- main also has Step 9 (access control from /me), Step 10 (fixed workarounds dropped).
- main also has Step 11 (variants + supplier price list).
- main also has Step 12 (notifications + billing, #14), Step 13 (customers + sales orders, #16) Step 14 (deliveries, invoices, payments, #17) Step 15 (returns, #18) Step 16 (accounting ledger, #19) Step 17 (accounting reports and payables, #20) Step 18 (import / export; spec 2026-10-09-import-export-design.md) Step 19 (backend fixes 0–23 verified, workarounds dropped; #23; spec 2026-10-09-verify-backend-fixes-design.md) and Step 20 (stock levels + stock ledger; spec 2026-10-09-stock-levels-ledger-design.md) and Analytics (dashboards + reports viewer, chart.js; spec 2026-10-09-analytics-dashboards-design.md).
- Permissions & branding (branch claude/permissions-branding; spec 2026-10-10-permissions-branding-design.md) follows backend 43d7e69: every company API now needs the module's `access_<module>` permission plus the CRUD codename. core/auth/permission-catalog.ts mirrors the backend catalog (keep in step); menu groups, module routes and `can()` check `access_<module>`. Roles take single permissions, groups take `permissions`, both through a module matrix (permission-picker); core groups and catalog permissions are read-only. New /profile (details, picture, password) and /company/profile (logo, colors); header avatar and sidebar brand come from /me. Brand colors are stored but not yet applied to the theme. docs/API_REFERENCE.md is a copy of the backend's; re-copy it after backend changes.
- Same branch also has: company colors as the site palette (core/theme/brand-*), short forms in dialogs / long forms full width (shared/forms, form-layout), and platform billing for staff under /admin/billing (subscriptions, plans, modules, invoices, payments, reports). All billing calls use /api/subscriptions/v1/ (backend a9bccfe: staff see every company, subscription writes staff-only, plan module lists writable). The local backend checkout must pull origin/master (and restart daphne) to serve it.
- Step 21 (transfers + adjustments) is built and walked through on branch claude/stock-movements (WIP commit fcfb1e2, pushed, no PR): still needs unit tests, a spec and docs, then a PR. Backend PR 0Mustafa37/Tanzim#20 (line filters by document) is merged, so its lines load with ?transfer= / ?adjustment=. Known nit: the adjustment form's "Current" and "New quantity" headers run together.
- Local machine (Windows, D:/tanzim): backend in backend/Tanzim (venv, daphne on :8000 via start-tanzim.ps1; daphne doesn't reload, restart it after a backend pull). `setup_plans` now creates the `accounting` Module; Test Company's subscription has location, inventory and accounting (clear the cache after changing modules).
- Test data (local DB): warehouses MAIN (zone ZA, bin B1) and BR1; suppliers Nile Supplies and Delta Metals; product Hammer with variants HAM-S / HAM-L, 50 units each in MAIN (posted through a stock adjustment, the API way now); customer Delta Trading, orders, a delivered and invoiced order; customer and supplier returns; supplier invoices NS-INV-001/002, DM-INV-001 (set to `matched` in the shell: matching needs a PO + receipt); a staff user staff@tanzim.test and an employee without permissions (passwords set in the shell; reset them there if needed). Platform billing test data (2026-10-10): staff user staff.test@tanzim.test (no company; reset its password in the shell if needed), an active subscription for company "test" on plan "testy" with the location module, and invoice INV-2-2026-000001 (30.00, partially paid 10 + 5). Keep them for testing.
- `ng serve` on Windows sometimes misses a file change and keeps serving the old chunk: touch the file or restart it.
- The `gh` CLI isn't installed locally: PRs are opened and merged through the GitHub REST API with git's stored credentials (`git credential fill`).
- Open PR 0Mustafa37/Tanzim#11 (claude/cors-frontend-origins → master): CORS allows http://localhost:4200, https://mohamed-elhelely.github.io and the ngrok header; CORS_EXTRA_ORIGINS env var for more.
- GitHub Pages (https://mohamed-elhelely.github.io/tanzim-frontend/) was deployed from claude/redesign-ui, which now equals main; redeploy from main from now on (`npm run deploy`, angular-cli-ghpages, baseHref /tanzim-frontend/).
- Stale branches (delete only if the owner agrees): claude/awesome-hawking-7uf16d, step-4-company-organisation, master (frontend), claude/awesome-lovelace-2bdsqn, claude/redesign-ui, claude/menu-visibility (merged).

## Architecture and conventions (frontend)
- Read docs/ARCHITECTURE.md (structure, conventions, recipes, roadmap) and docs/CODE_MAP.md (what exists, how it connects, hot spots) before changing code. Keep CODE_MAP.md updated with every change.
- Lists: `readonly table = new ServerTable((q) => this.api.list(q))` (shared/table) + `ConfirmService.confirmDelete(...)` (core/services). Forms: reactive, `handleSaveError(...)` (shared/utils/server-errors), PATCH sends full values, cleared pickers send null.
- Every component is .ts + .html (no inline templates, no empty .scss). Services extend `CrudApi` and only set `path` (ending in `/`).
- PrimeNG 21 names: p-select, p-toggleswitch, pTextarea, p-drawer, p-iconfield/p-inputicon; severity 'warn' (not 'warning').
- Every user-visible string in src/assets/i18n/en.json AND ar.json. Logical Tailwind classes only (ps-/pe-/ms-/me-/text-start/text-end, rtl:rotate-180).
- Match surrounding code style and comment density; no new npm dependencies without asking; no Angular Material.
- Commit after each logical step; never include model names in commits or PRs.

## Known backend issues (raise, don't work around silently)
- docs/BACKEND_REQUESTS.md: items 0–23 verified fixed on 2026-10-09 (backend master 0a78259, "Fixed" table). Open:
  24 (nothing sets a sales invoice `overdue`), 25 (category export writes the parent as "1.0"; return action
  responses omit `sales_order_number`, worked around in the customer-return detail), 26 (stock ledger and
  reservation filters, a stock-level endpoint), 27 (analytics labels/alerts English-only, `flags` as text) and 28
  (no opening-stock path: adjustments credit cost of sales).
- The backend's own list is "Known issues" at the end of docs/API_REFERENCE.md.

## Running and verifying locally
- Backend: python venv + `pip install -r requirements.txt`, `SECRET_KEY=... DEBUG=True python manage.py migrate && python manage.py setup_plans && python manage.py seed_permissions && python setup_data.py`; give "Test Company" an active Subscription with the `location` and `inventory` SubscriptionModules; `redis-server` + `uvicorn Tanzim.asgi:application --port 8000` (ASGI so the notifications WebSocket works; `runserver` serves HTTP only). Login: admin@testcompany.com / testpass123. For platform-staff screens, create a user with is_staff=True and no CompanyUser (`manage.py shell`).
- Frontend: `npm ci`, `npx ng serve --proxy-config proxy.conf.json` (proxies /api to :8000), `npm run build`, `npx ng test --watch=false` (in a container, run ChromeHeadless with --no-sandbox).
- Before calling UI work done: screenshot the changed screens in English, Arabic (RTL), dark mode and 390px mobile, and check the console has no errors.

## Next steps (the owner asked to work through them in order, one branch + PR per step, merging each)
1. Step 21 — finish branch claude/stock-movements (tests, spec, docs), PR and merge.
2. Step 22 — procurement: purchase orders, goods receipts, supplier invoices (screens beyond the dropdown ref service).
   Analytics follow-ups: saved reports and schedules screens; the full EN/AR/dark/390 px walk of the dashboards was paused by the owner.
3. Then the test campaign: the backend is writing `manage.py seed_test_campaign` (4 companies, ~18 test accounts,
   18 months of data, docs/TEST_ACCOUNTS.md with an expectation matrix). When it lands, run Playwright walks per account
   against the matrix, cross-check numbers between screens and reports, EN/AR/dark/390px, and write a findings report.
4. Deploy: GitHub Pages from main (`npm run deploy`).

Reply to the owner in Egyptian Arabic; keep code, commits and PR text in English.
```
