# Session handoff prompt

Paste the block below as the first message of a new session to continue work without re-explaining the project.
Update the "Current state" section whenever a PR merges or the next step changes.

```text
You are continuing work on Tanzim, a bilingual (English/Arabic, RTL) ERP. Two repos:

- Frontend: mohamed-elhelely/tanzim-frontend (Angular 21, standalone + signals, PrimeNG 21.1.10, Tailwind 3, ngx-translate, Jasmine/Karma)
- Backend: 0Mustafa37/Tanzim (Django + DRF, SQLite + Redis locally). API source of truth: docs/API_REFERENCE.md and docs/BUSINESS_LOGIC.md in the backend repo; check the serializers when the docs look stale.

## Current state (2026-10-08)
- main (frontend) has Step 4 (Company & Organisation), Step 5 (Locations) and the redesign (PR mohamed-elhelely/tanzim-frontend#4, merged 2026-10-08). Specs live in docs/superpowers/specs/ (2026-10-07-company-organisation-design.md, 2026-10-07-locations-design.md, each ends with a "Verification results" table).
- What #4 brought in:
  - Angular 18→21 via ng update, one major at a time.
  - PrimeNG 17→21.1.10. This is the last MIT release; v22 needs a PrimeUI license key, so do NOT upgrade to 22 without the owner's decision.
  - Builders moved to @angular/build.
  - Redesign: dark indigo sidebar, header with breadcrumb + language/dark-mode toggles + user menu, dashboard with real counts/setup checklist/quick actions, search inside list cards, coming-soon pages, split-screen login.
  - Production build points at the backend via ngrok: https://chunk-surcharge-manhood.ngrok-free.dev/api/. An interceptor adds `ngrok-skip-browser-warning` to any ngrok host.
- main also has Step 6 (platform-staff Companies, /admin/companies; spec 2026-10-08-platform-companies-design.md) and menu visibility by role and subscription (spec 2026-10-08-menu-visibility-design.md).
- main also has Step 7 (Inventory catalogue; spec 2026-10-08-inventory-catalogue-design.md).
- Code-structure cleanup (one convention, ServerTable/ConfirmService/handleSaveError, ARCHITECTURE.md, CODE_MAP.md) is PR mohamed-elhelely/tanzim-frontend#9 (branch claude/code-structure).
- Step 8 (warehouses, zones, bins, suppliers) is on branch claude/jolly-hopper-2gqwi0, stacked on #9; spec: docs/superpowers/specs/2026-10-09-inventory-warehouses-suppliers-design.md.
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
- The full list of backend requests, as a prompt for a backend session, is in docs/BACKEND_REQUESTS.md.
- Soft-deleting a country/region/city/district still in use returns 204.
- Re-using the name of a soft-deleted record returns 500 (unique_together ignores is_deleted).
- Location `full_address` is never returned.
- PATCH company-user with nested `user` re-validates the email (400).
- GET /permissions/?search= returns 500.
- Editing a category without renaming it returns 400 "already exists" (the form omits unchanged name/parent).
- Deleting a brand/category still in use returns 204 and leaves products pointing at it.
- Warehouse/zone/bin/supplier read endpoints return only some fields (edit forms use omitPristine); warehouse `manager` returns 500 (field hidden); warehouse code is unique across all companies.
- Every DELETE returns 204 with a body; the dev-server proxy turns it into a 500 (the delete still happens). BACKEND_REQUESTS 1b.
- Creating a company user returns the password hash (security; BACKEND_REQUESTS.md Priority 0).
- Company create (admin/company/) is not atomic: a blank or already-used email returns 500 and leaves the company without an admin.
- Company phone can't be blank (400), so it can't be cleared once saved.
- DELETE admin/company/{id}/ is a cascading hard delete (docs say soft delete); the UI has no delete button.

## Running and verifying locally
- Backend: python venv + `pip install -r requirements.txt`, `SECRET_KEY=... DEBUG=True python manage.py migrate && python manage.py setup_plans && python setup_data.py`; give "Test Company" an active Subscription with the `location` and `inventory` SubscriptionModules; `redis-server` + `python manage.py runserver 8000`. Login: admin@testcompany.com / testpass123. For platform-staff screens, create a user with is_staff=True and no CompanyUser (`manage.py shell`).
- Frontend: `npm ci`, `npx ng serve --proxy-config proxy.conf.json` (proxies /api to :8000), `npm run build`, `npx ng test --watch=false` (in a container, run ChromeHeadless with --no-sandbox).
- Before calling UI work done: screenshot the changed screens in English, Arabic (RTL), dark mode and 390px mobile, and check the console has no errors.

## Next steps (ask the owner which one first)
1. Help merge 0Mustafa37/Tanzim#11 (backend CORS) if still open, then redeploy GitHub Pages from main.
2. Fine-grained permissions (hide buttons by permission codename) once the backend ships a current-user endpoint (BACKEND_REQUESTS.md Priority 1). Role- and module-based hiding is done.
3. Notifications (bell + page, polling) and Billing (the company's own subscription and invoices).
4. Inventory phase 2 (variants, supplier products, stock, procurement workflows) waits for backend items 16–18.

Reply to the owner in Egyptian Arabic; keep code, commits and PR text in English.
```
