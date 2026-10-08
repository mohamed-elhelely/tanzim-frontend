# Menu visibility by role and subscription (design)

Date: 2026-10-08
Status: built and verified against the local backend; scope agreed in chat (items 1–3 of "what can be done now")

## Goal

Each user only sees what they can open, so the app stops showing sections that answer 403.
Fine-grained permissions (role → permission groups → permissions) wait for the backend
(docs/BACKEND_REQUESTS.md, Priority 1); this step uses what the API already gives.

## Decisions taken

| Topic | Decision |
|---|---|
| Subscription modules | `SubscriptionService` (core/subscription) loads `GET /api/subscriptions/subscriptions/current/` once per sign-in (from the shell). A module is on when the subscription is `trial`/`active` and both the subscription module and the module are active, matching the backend's `FeatureFlag.is_enabled`. 404 (no subscription) → nothing on. Any other error fails open; the backend still answers 403. While loading, gated items stay hidden so they don't flash. |
| Sidebar | `NavItem.module` items show only when the module is on; `NavItem.roles` hides company sections (Company, Locations, Inventory, Sales, Returns, Billing, Notifications, Import/Export) from platform admins, who see Dashboard + Companies only. |
| Routes | `companyMemberGuard` on every company section sends platform admins to `/admin/companies`. Module-gated routes are not guarded (the subscription loads asynchronously); a deep link still shows the forbidden state. |
| Users screen | Only company admins (`role === 'COMPANY'`) see New/Edit/Delete; `companyAdminGuard` on `users/new` and `users/:id/edit`. This matches the backend, which allows writes on company-user to company admins only. |
| Dashboard | Platform admin: company counts (total, active) and "Add a company". Company admin: as before, minus the Locations card/step/action when the module is off (and no locations request). Employee: stats only, no setup checklist or quick actions. |

## Verification results (2026-10-08, against the local backend)

| Check | Result |
|---|---|
| Platform staff | Sidebar: Dashboard, Companies. Dashboard shows 6 companies / 5 active. `/company/users` → `/admin/companies`. No 4xx responses. |
| Company admin, subscription with `location` only | Sidebar has Company and Locations, no Inventory. Users list has New/Edit/Delete. No 4xx responses. |
| Company admin, no active module | Locations group, card, setup step and quick action hidden; no request to `location/`. No 4xx responses. |
| Employee (Arabic) | Users list without New/Edit/Delete; `/company/users/new` → `/company/users`; dashboard shows stats only. No 4xx responses. |
| Mobile 390 px (Arabic) | Dashboard cards stack; drawer shows the same filtered items. |

Found on the way (added to docs/BACKEND_REQUESTS.md): creating a company user returns the password hash.
