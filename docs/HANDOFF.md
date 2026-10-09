# Session handoff prompt

Paste the block below as the first message of a new session to continue work without re-explaining the project.
Update the "Current state" section whenever a PR merges or the next step changes.

```text
You are continuing work on Tanzim, a bilingual (English/Arabic, RTL) ERP. Two repos:

- Frontend: mohamed-elhelely/tanzim-frontend (Angular 21, standalone + signals, PrimeNG 21.1.10, Tailwind 3, ngx-translate, Jasmine/Karma)
- Backend: 0Mustafa37/Tanzim (Django + DRF, SQLite + Redis locally). API source of truth: docs/API_REFERENCE.md and docs/BUSINESS_LOGIC.md in the backend repo; check the serializers when the docs look stale.

## Current state (2026-10-09)
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
- main also has Step 12 (notifications + billing, #14), Step 13 (customers + sales orders, #16) Step 14 (deliveries, invoices, payments, #17) Step 15 (returns, #18) Step 16 (accounting ledger, #19) Step 17 (accounting reports and payables, #20) and Step 18 (import / export; spec 2026-10-09-import-export-design.md).
- Test data: Test Company's subscription also has the `accounting` SubscriptionModule (added with the shell; clear the cache after changing modules).
- Test data: two variants have 50 units in Main Warehouse, seeded with the Django shell (the stock ledger is read-only in the API).
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
- docs/BACKEND_REQUESTS.md lists items 0–23. The backend says all of them are fixed (0Mustafa37/Tanzim master at
  c6509d9, PRs #15–#18; one commit per item, e.g. 66eba7a "Return every model field from inventory read serializers",
  7a6e154 "Send 204 responses without a body", 52c449f platform invoice writes, 5668873 company import permissions).
  Verify each one against the running backend before relying on it; move verified items to a "Fixed" section.
- Not yet raised: nothing in sales/ ever sets SalesInvoice status `overdue` (only billing has an overdue task, for
  platform invoices). Add it as item 24.
- The backend's own list is "Known issues" at the end of docs/API_REFERENCE.md.

## Running and verifying locally
- Backend: python venv + `pip install -r requirements.txt`, `SECRET_KEY=... DEBUG=True python manage.py migrate && python manage.py setup_plans && python manage.py seed_permissions && python setup_data.py`; give "Test Company" an active Subscription with the `location` and `inventory` SubscriptionModules; `redis-server` + `uvicorn Tanzim.asgi:application --port 8000` (ASGI so the notifications WebSocket works; `runserver` serves HTTP only). Login: admin@testcompany.com / testpass123. For platform-staff screens, create a user with is_staff=True and no CompanyUser (`manage.py shell`).
- Frontend: `npm ci`, `npx ng serve --proxy-config proxy.conf.json` (proxies /api to :8000), `npm run build`, `npx ng test --watch=false` (in a container, run ChromeHeadless with --no-sandbox).
- Before calling UI work done: screenshot the changed screens in English, Arabic (RTL), dark mode and 390px mobile, and check the console has no errors.

## Next steps (the owner asked to work through them in order, one branch + PR per step, merging each)
1. Step 19 — verify the backend fixes and drop the workarounds. Pull backend master, re-run migrations, then for every
   item in docs/BACKEND_REQUESTS.md: reproduce the old behaviour against the API, confirm it's fixed, remove the matching
   frontend workaround (search the code for the item number and for comments mentioning the backend, e.g. omitPristine
   for item 2, the 204-body handling for item 1, re-loading after RMA actions for item 18, `amount_due: number | string`
   for item 16, the "hide Create invoice" guard for item 14), and update specs/tests. Items that are not really fixed
   stay open with a note on what still fails. Add item 24 (sales overdue). Update CODE_MAP.md.
2. Step 20 — inventory stock levels and stock ledger (read), now that item 2 is fixed.
3. Step 21 — stock movements: transfers, adjustments (and their confirm/cancel workflows).
4. Step 22 — procurement: purchase orders, goods receipts, supplier invoices (screens beyond the dropdown ref service).
5. Then the test campaign: the backend is writing `manage.py seed_test_campaign` (4 companies, ~18 test accounts,
   18 months of data, docs/TEST_ACCOUNTS.md with an expectation matrix). When it lands, run Playwright walks per account
   against the matrix, cross-check numbers between screens and reports, EN/AR/dark/390px, and write a findings report.
6. Deploy: GitHub Pages from main (`npm run deploy`).

Reply to the owner in Egyptian Arabic; keep code, commits and PR text in English.
```
