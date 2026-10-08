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
- Open PR 0Mustafa37/Tanzim#11 (claude/cors-frontend-origins → master): CORS allows http://localhost:4200, https://mohamed-elhelely.github.io and the ngrok header; CORS_EXTRA_ORIGINS env var for more.
- GitHub Pages (https://mohamed-elhelely.github.io/tanzim-frontend/) was deployed from claude/redesign-ui, which now equals main; redeploy from main from now on (`npm run deploy`, angular-cli-ghpages, baseHref /tanzim-frontend/).
- Stale branches (delete only if the owner agrees): claude/awesome-hawking-7uf16d, step-4-company-organisation, master (frontend), claude/awesome-lovelace-2bdsqn, claude/redesign-ui (merged).

## Architecture and conventions (frontend)
- API: `CrudApi<T, TPayload>` in core/api/crud-api.ts (list/all/listAll/dropdown/retrieve/create/update(PATCH)/remove), unwraps `{ success, data, metadata }`. One ~8-line service per resource. Paths are relative to API_BASE_URL and MUST end with `/`.
- Each resource has explicit list + form components (no generic config-driven screens), mirroring features/company/departments/*. Lists: p-table lazy paging, 300 ms debounced search, cancel stale requests, step back a page after deleting the last row. Forms: reactive, `applyServerErrors` for field errors, `app-field-error` (supports `patternKey`), PATCH sends full values, cleared pickers send null.
- Theme: Aura preset in core/theme/tanzim-preset.ts (indigo primary, gray surfaces), providePrimeNG with cssLayer `primeng`. Layer order (src/layer-order.css): tailwind-base, primeng, app, tailwind-utilities. Dark mode = `.dark` on <html> (ThemeService + inline script in index.html). Base font size 14px; fonts Inter + IBM Plex Sans Arabic.
- PrimeNG 21 names: p-select, p-toggleswitch, pTextarea, p-drawer, p-iconfield/p-inputicon; severity 'warn' (not 'warning').
- Every user-visible string in src/assets/i18n/en.json AND ar.json. Use logical Tailwind classes (ps-/pe-/ms-/me-/text-start/text-end, rtl:rotate-180 for arrows), never pl-/pr-/ml-/mr-/text-left/right.
- Match surrounding code style and comment density; no new npm dependencies without asking; no Angular Material.
- Commit after each logical step; never include model names in commits or PRs.

## Known backend issues (raise, don't work around silently)
- Soft-deleting a country/region/city/district still in use returns 204.
- Re-using the name of a soft-deleted record returns 500 (unique_together ignores is_deleted).
- Location `full_address` is never returned.
- PATCH company-user with nested `user` re-validates the email (400).
- GET /permissions/?search= returns 500.

## Running and verifying locally
- Backend: python venv + `pip install -r requirements.txt`, `SECRET_KEY=... DEBUG=True python manage.py migrate && python manage.py setup_plans && python setup_data.py`; give "Test Company" an active Subscription with the `location` and `inventory` SubscriptionModules; `redis-server` + `python manage.py runserver 8000`. Login: admin@testcompany.com / testpass123.
- Frontend: `npm ci`, `npx ng serve --proxy-config proxy.conf.json` (proxies /api to :8000), `npm run build`, `npx ng test --watch=false` (in a container, run ChromeHeadless with --no-sandbox).
- Before calling UI work done: screenshot the changed screens in English, Arabic (RTL), dark mode and 390px mobile, and check the console has no errors.

## Next steps (ask the owner which one first)
1. Help merge 0Mustafa37/Tanzim#11 (backend CORS) if still open, then redeploy GitHub Pages from main.
2. Platform-staff Companies screen (/api/company/v1/admin/company/).
3. Hide menus/buttons by the user's permissions/role.
4. Hide menu sections when the subscription lacks a module (`module` field already on NavItem).
5. Start Inventory screens (see API_REFERENCE.md "Inventory"; note backend known issues #1–#3 block workflow actions and variants).

Reply to the owner in Egyptian Arabic; keep code, commits and PR text in English.
```
