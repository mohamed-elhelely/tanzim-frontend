# Code map

A reference for reading and reviewing the frontend: what each part does, how the parts connect, and where the
non-obvious logic lives. Rules and the roadmap are in [ARCHITECTURE.md](ARCHITECTURE.md).

**Legend** — use these markers to decide where to look closely during a review:

| Marker | Meaning |
|---|---|
| 🧠 | Non-obvious logic: read the code and its comment before changing it |
| ⚠️ | Works around a backend bug; remove when the backend is fixed (item in `docs/BACKEND_REQUESTS.md`) |
| 🆕 | A project-wide pattern or concept introduced here; other code depends on it |
| 🔒 | Access control (who can see or do what) |

Paths are relative to `src/app/`.

---

## 1. The big picture

```mermaid
flowchart TD
    main["main.ts + app.config.ts<br/>providers, interceptors, theme, i18n"] --> routes["app.routes.ts"]
    routes -->|"/auth/login (guestGuard)"| login["features/auth/login"]
    routes -->|"everything else (authGuard)"| shell["layout/shell<br/>sidebar · header · toasts · confirm dialog"]
    shell --> dash["features/dashboard"]
    shell -->|"/admin (platformAdminGuard) 🔒"| admin["features/admin<br/>Companies"]
    shell -->|"/company (companyMemberGuard) 🔒"| company["features/company"]
    shell -->|"/locations 🔒"| locations["features/locations"]
    shell -->|"/inventory 🔒"| inventory["features/inventory"]
    shell -->|"/notifications"| notif["features/notifications"]
    shell -->|"/billing 🔒"| billing["features/billing"]
    shell -->|"/analytics 🔒"| analytics["features/analytics"]

    subgraph core["core/ (singletons, no UI)"]
        api["api: BaseApiService, CrudApi"]
        auth["auth: AuthService, guards"]
        sub["auth: AccessService (/me)"]
        svc["services: notification, confirm, language, theme, loading"]
        ncenter["notifications: NotificationCenterService (WebSocket)"]
        int["interceptors"]
    end
    subgraph shared["shared/ (reusable, no business knowledge)"]
        table["table: ServerTable"]
        comps["components: page-header, field-error, states, badge"]
        utils["utils: server-errors · pipes"]
    end

    company & locations & inventory & admin --> api
    company & locations & inventory & admin --> table
    company & locations & inventory & admin --> comps
    shell --> sub
    shell --> auth
```

## 2. One HTTP request, end to end 🧠

```mermaid
sequenceDiagram
    participant C as Component
    participant S as Resource service (CrudApi)
    participant H as api-headers → auth → loading → error interceptors
    participant B as Backend

    C->>S: list({ page, pageSize, search, ordering })
    S->>H: GET company/v1/departments/?page=1&page_size=10
    H->>B: + ngrok header (ngrok hosts only), + Bearer token
    B-->>H: { success, data, metadata: { total_count } }
    H-->>S: response
    S-->>C: Paginated { items, total }
    Note over H: On error the order reverses: errorInterceptor runs first<br/>(→ AppError, toast for network/5xx), then authInterceptor<br/>(401 → refresh token once → retry, else logout)
```

- `core/api/crud-api.ts` 🆕 — `list / all / listAll / dropdown / retrieve / create / update (PATCH) / remove`.
  Unwraps the `{ success, data, metadata }` envelope. `listAll` 🧠 pages through 100 at a time (the backend max).
- `core/interceptors/auth.interceptor.ts` 🧠 — the refresh is shared between parallel 401s
  (`AuthService.refreshAccessToken` keeps one in-flight request); a request is retried only once (`RETRIED` token).
- `core/interceptors/error.interceptor.ts` — every error becomes an `AppError` (`core/errors/app-error.ts`).
  Screens never see `HttpErrorResponse`.

## 3. Who sees what 🔒 🧠

```mermaid
flowchart LR
    login["POST /api/login/"] --> authsvc["AuthService.user()<br/>role = ADMIN · COMPANY · EMPLOYEE"]
    me["GET /api/company/v1/me/"] --> access["AccessService<br/>can(codename) · hasModule(code) · isStaff()"]
    shellinit["ShellComponent / guards"] -->|load()| access
    access --> guards["guards: platformAdmin · companyMember · permission (route data.permission)"]
    access --> nav["nav-list: hides groups without access_&lt;module&gt;, screens without view_; drops empty groups"]
    access --> lists["company lists: New / edit / delete by add_ / change_ / delete_"]
    access --> dash["dashboard: cards, setup steps, quick actions"]
    authsvc --> guards
```

| Who | How it's known | Sees |
|---|---|---|
| Platform staff | `/me.is_staff` (token `is_staff` until /me answers) | Dashboard (company counts) and Companies |
| User without a company, not staff | login `role: ADMIN` | Dashboard welcome only |
| Company user | login `role: COMPANY`/`EMPLOYEE` | Sections their subscription has (`/me.modules`) **and** whose `access_<module>` permission they hold; screens and buttons by `/me.permissions` (`has_full_access` = everything) |

Things to know:
- Since backend 43d7e69 **every** company API is permission-gated: the module's feature permission
  (`access_company`, `access_sales`, …) **and** the CRUD codename (`view_/add_/change_/delete_<resource>`; a POST
  action on one record needs `change_`). `core/auth/permission-catalog.ts` 🔒 mirrors the backend catalog
  (`company/access.py`): `can('add_salesorder')` also checks `access_sales`. Keep the two in step.
- Menu groups carry `permission: 'access_<module>'`, their children the screen's `view_` codename; the module
  parent routes in `app.routes.ts` run `permissionGuard` with `access_<module>`. `?dropdown=true` needs no
  permission, so pickers always work. Subscription modules still apply on top.
- `AccessService.can()` / `hasModule()` 🧠 return **false while /me loads** (no flicker) and **true if /me fails**
  (fail open: the backend still answers 403).
- `AccessService` 🧠 resets itself when the signed-in user changes (an `effect` on `AuthService.user()`), so the next
  user never inherits the previous user's permissions.
- Guards call `access.load()` themselves (child routes are checked before the shell exists); `load()` shares one
  request.
- `layout/nav/nav-list.component.ts` 🧠 expands the active group by looking at **all** `NAV_ITEMS`, because a gated
  group only appears after /me has loaded.

## 4. core/

| File | Purpose | Notes |
|---|---|---|
| `api/api.config.ts` | `API_BASE_URL` from `src/environments` | Prod points at the backend's ngrok URL |
| `api/base-api.service.ts` | Typed `get/post/put/patch/delete` with the base URL; `getBlob` / `postBlob` for file downloads | |
| `api/crud-api.ts` | Standard calls for one resource; `ListQuery.filters`, `all(filters)` and `dropdown(filters)` for exact-match filters | 🆕 every resource service extends it |
| `auth/auth.service.ts` | Signed-in user, login, logout, token refresh | 🧠 role restored from the JWT on reload |
| `auth/token-storage.service.ts` | Tokens in localStorage | |
| `auth/access.service.ts` | Permissions, modules, staff flag and branding (`current()`) from GET /me; `update()` merges a saved profile/logo | 🧠 🔒 see §3 |
| `auth/permission-catalog.ts` | The backend's permission catalog: modules → resources → actions; `codenameModule`, `isSystemCodename` | 🆕 🔒 mirror of backend `company/access.py` |
| `auth/auth.guard.ts` | `authGuard`, `guestGuard`, `platformAdminGuard`, `companyMemberGuard`, `permissionGuard` | 🔒 `permissionGuard` reads `route.data.permission` |
| `errors/app-error.ts` | `AppError` + `toAppError()` | The only error shape in the app |
| `errors/global-error-handler.ts` | Toast for uncaught non-HTTP errors | |
| `interceptors/api-headers.interceptor.ts` | `ngrok-skip-browser-warning` for ngrok hosts | ⚠️ ngrok free tier, not a backend bug |
| `interceptors/auth.interceptor.ts` | Bearer token, refresh on 401 | 🧠 see §2 |
| `interceptors/loading.interceptor.ts` | Counts requests for the loading bar | |
| `interceptors/error.interceptor.ts` | → `AppError`, toast for network/5xx | |
| `models/api-response.model.ts` | Envelope types, `Paginated<T>` | |
| `notifications/notification-center.service.ts` | Notifications list, unread count, live WebSocket | 🆕 🧠 reconnects with backoff, stops on sign-out |
| `services/confirm.service.ts` | `confirmDelete(name, remove, onDeleted)`; `confirmAction()` / `runAction()` for workflow buttons | 🆕 used by every list that deletes and every confirm/ship/issue/cancel action |
| `services/notification.service.ts` | Toasts | |
| `services/language.service.ts` | en/ar, sets `<html lang dir>` | |
| `services/theme.service.ts` | Light/dark via `.dark` on `<html>` | 🧠 `index.html` applies it before Angular starts |
| `services/loading.service.ts` | Requests in flight | |
| `theme/tanzim-preset.ts` | PrimeNG Aura preset (indigo) | 🧠 CSS layer order in `src/layer-order.css` |

## 5. layout/ and shared/

| File | Purpose | Notes |
|---|---|---|
| `layout/shell/` | Frame for signed-in pages; starts loading /me | Hosts the toast and the confirm dialog once |
| `layout/header/` | Breadcrumb (route `data.titleKey` + nav group), notifications bell, language/theme toggles, user menu (My profile, sign out) | Bell: unread badge + popover with the latest 6. Avatar = `/me` profile picture, else initials |
| `layout/sidebar/` + `brand.component` | Desktop sidebar; brand shows the company's logo and name from `/me` | Mobile uses a PrimeNG drawer in the shell. Brand colors are not applied to the theme yet |
| `layout/nav/nav-items.ts` | The menu: label, icon, link, `module`, `roles`, children | 🔒 the single place to add a menu entry |
| `layout/nav/nav-list.component` | Renders the menu, filters it, expands the active group | 🧠 §3 |
| `shared/table/server-table.ts` | State for server-paged tables | 🆕 🧠 cancels stale requests; steps back a page after deleting the last row |
| `shared/utils/server-errors.ts` | `applyServerErrors`, `handleSaveError`, `errorTitleKey` | 🆕 🧠 flattens nested backend errors to dotted keys (`user.email`) |
| `shared/utils/save-file.ts` | Saves a downloaded Blob under a file name | Used by the Excel export |
| `shared/components/field-error` | Message under an input (required, email, length, pattern, `greaterThan`, `max`, server) | Not OnPush on purpose (reacts to `touched`) |
| `shared/components/page-header` | Title, back link, action buttons | |
| `shared/components/notification-item` | One notification row (bell + page) | Icon/colour by type, unread dot |
| `shared/pipes/time-ago.pipe.ts` | "3 hours ago" in the current language | `Intl.RelativeTimeFormat`; not live |
| `shared/components/confirm-dialog` | The one PrimeNG confirm dialog | Opened only through `ConfirmService` |
| `shared/components/image-picker` | Image preview with Choose / Remove, 5 MB check; emits File or null | 🆕 profile picture, company logo |
| `shared/components/reason-dialog` | Optional-reason dialog before cancel / failed steps | Collects the text; the parent runs the action |
| `shared/components/empty-state`, `error-state`, `loading-state`, `status-badge`, `loading-bar` | Visual states | |
| `shared/pipes/localized-name.pipe.ts` | Arabic name in Arabic, else English | |
| `shared/pipes/user-name.pipe.ts` | Full name → first + last → email | |

## 6. features/

Every resource below has a `*.service.ts`, a list and a form unless noted. Lists use `ServerTable` unless
marked "client list".

### auth, dashboard, notifications, billing

| Path | Notes |
|---|---|
| `auth/login/` | Split-screen login, language/theme toggles |
| `dashboard/` | 🧠 🔒 platform counts for staff; for company users every card, setup step and quick action is gated by a permission or module (`Gate`). Counts are requested after /me answers, only for the visible cards. Reads services from company, locations and admin |
| `profile/` | 🆕 `/profile` for every signed-in user (header menu): details + picture (`PATCH me/profile/`, multipart when a picture is picked) and change password (`POST me/change-password/`). ⚠️ no GET: an empty PATCH loads it (BACKEND_REQUESTS item 29) |
| `notifications/` | `/notifications` for every signed-in user: All/Unread, mark all read (one request each) |
| `billing/` | `/billing` (company admins in the menu): subscription card + read-only invoices with a details dialog. `BillingService` reads `subscriptions/current/` and `subscriptions/invoices/` |

### admin — `/admin` (platform admins only) 🔒

| Resource | Endpoint | Notes |
|---|---|---|
| `companies/` (`TenantCompanyService`) | `company/v1/admin/company/` | Server list with search. No delete button: DELETE only deactivates, which the form's Active switch does. Email required on create (the backend emails the admin's password). Logo upload not built yet |

### company — `/company`

| Resource | Endpoint | Notes |
|---|---|---|
| `users/` (`CompanyUserService`) | `company/v1/company-user/` | Client list (not paginated). 🔒 New/Edit/Delete by `*_companyuser` permissions (+ `permissionGuard` on the form routes). Edit sends the nested `user` without a password. `userOptions()` uses the dropdown, so pickers work without `view_companyuser`. 🧠 `USER_FIELD_MAP` maps `user.email` errors to flat controls |
| `departments/` | `company/v1/departments/` | Parent picker excludes itself. 🔒 every company list shows New/edit/delete by permission |
| `teams/` | `company/v1/teams/` | Uses `LocationService.dropdown()` for the location picker |
| `roles/` | `company/v1/roles/` | Groups (optional) + single `permissions` from the permission matrix |
| `permission-groups/` | `company/v1/permission-groups/` | `permissions` from the matrix. 🔒 core groups (`is_core`) open read-only, no delete (backend 403) |
| `permissions/` | `company/v1/permissions/` | Search by name and codename. 🔒 catalog permissions show "System", no edit/delete. The form's group picker hides core groups |
| `permissions/permission-picker.component` | dropdown of `permissions/` | 🆕 🧠 form control (`number[]`): a module-by-module matrix (access switch + view/add/change/delete per resource) from `permission-catalog.ts`; company codenames under "Other" |
| `company-profile/` | `company/v1/company-profile/` | 🆕 `/company/profile`: logo + primary/secondary colors with a live preview. `view_company` to open, read-only without `change_company`. Saving updates the sidebar brand through `AccessService.update()` |

### locations — `/locations` (module `location`)

| Resource | Endpoint | Notes |
|---|---|---|
| `sites/` (`LocationService`) | `company/v1/location/` | 🧠 cascading pickers Country → Region → City → District filtered in the browser (no parent filter in the API). List shows the backend's `full_address` |
| `countries/` | `company/v1/country/` | ISO and phone code validated client-side |
| `regions/` | `company/v1/region/` | |
| `cities/` | `company/v1/city/` | Time zone: UTC + the browser's IANA list |
| `districts/` | `company/v1/district/` | |

### inventory — `/inventory` (module `inventory`)

| Resource | Endpoint | Notes |
|---|---|---|
| `products/` | `inventory/v1/product/` | Enum selects (type, valuation); shelf life only with an expiry date. Each row links to its variants |
| `variants/` | `inventory/v1/product-variant/` | 🧠 `?product=` filter from the URL (chip + "Show all", reloads on change). 🧠 attributes edited as name/value rows (`FormArray`), sent as an object. `dimensions`/`image` never sent. `variant-options.ts` (`toItemOption`, `trimZeros`) feeds the item pickers of the sales order and return forms; `trimZeros` also formats decimals loaded into forms |
| `categories/` | `inventory/v1/category/` | 🧠 parent picker shows the full path and excludes itself and its descendants |
| `brands/` | `inventory/v1/brand/` | Smallest resource: copy it for new ones |
| `warehouses/` | `inventory/v1/warehouse/` | Manager picker (company users, `CompanyUserService.userOptions`) |
| `zones/` | `inventory/v1/zone/` | Warehouse picker "Name (CODE)" |
| `bins/` | `inventory/v1/bin/` | 🧠 zone picker from the full zone list, labelled "Warehouse › Zone" |
| `suppliers/` | `inventory/v1/supplier/` | Reliability is 0–1; empty lead time/reliability → 0 |
| `supplier-invoices/` | `inventory/v1/supplier-invoice/` | Service only so far (`?dropdown=true&supplier=&open=true` with `open_balance` for payment allocations and debit notes) |
| `supplier-products/` | `inventory/v1/supplier-product/` | The supplier price list (cost, currency, validity dates) |
| `stock-levels/` | `reports/v1/run/inventory_valuation/`, `inventory/v1/stock-reservation/` | Read only, no form. 🧠 on hand from the valuation report (warehouse, as-of date, method, Excel); reserved/available from open reservations summed in the browser, today only. ⚠️ reads every reservation (no filters, BACKEND_REQUESTS 26). `InventoryReportService`, `StockReservationService` |
| `stock-ledger/` | `inventory/v1/stock-ledger/` | Read-only server list, newest first by default, search by document type. ⚠️ no variant/warehouse filter (BACKEND_REQUESTS 26) |

### sales — `/sales` (no module needed)

Sales endpoints (`/api/sales/…`) return flat ids plus `*_name` fields, a shorter list shape than retrieve
(services add `detail(id)`), and only paginate when `page` is sent.

| Resource | Endpoint | Notes |
|---|---|---|
| `customers/` | `sales/customers/` | Type filter. `credit_used` never sent; edit shows credit used / available / open orders. Addresses via `address-fields/` |
| `orders/` (`SalesOrderService`) | `sales/sales-orders/` | List with status filter (delete on drafts only). 🧠 form: lines in a `FormArray`, one item picker over every active variant (sets product + variant + default price), totals previewed with the backend formula (`lineTotal`/`lineTax`), saving replaces all lines. Only drafts open in the form (the backend refuses the rest). Detail page: lines, totals, its deliveries and invoices, workflow (confirm, ship dialog, mark delivered, create invoice, cancel with reason, duplicate) via `ConfirmService.confirmAction`; 🧠 follows the `:id` param because duplicate navigates to the copy |
| `deliveries/` | `sales/delivery-notes/` | Created only from an order (Ship dialog on the order page, which issues stock). List + detail; workflow confirm → hand to carrier → delivered / failed (pick-ups skip the carrier); draft details via PATCH, then re-read (the write shape has no names) |
| `invoices/` | `sales/sales-invoices/` | Created only from a delivered order. Detail: lines, totals, payments; draft details / issue / delete / cancel; record payment (≤ amount due), refund. "Create invoice" only while there is no non-cancelled invoice (the backend refuses a second); totals include shipping |
| `payments/` (`InvoicePaymentService`) | `sales/invoice-payments/` | Read-only list (method filter) → invoice; `refund(id)` |
| `address-fields/` | — | `AddressFieldsComponent` + `addressGroup/toAddress/patchAddress`; keys `street, city, state, zip, country` |

### returns — `/returns` (no module needed)

Endpoints under `/api/returns/v1/` (the legacy `/api/returns/api/returns/` mount is not used).

| Resource | Endpoint | Notes |
|---|---|---|
| `customer-returns/` | `returns/v1/customer-returns/` | List (status + reason filters). 🧠 form: from an order's shipped lines (capped by shipped; the backend also subtracts earlier returns) or free item rows; no edit yet. Detail: approve / reject (reason) / receive / inspect (outcome → derived restocking decision, `RESTOCKING_FOR`) / close with refund / replacement order. ⚠️ applies each action's response, keeping the loaded `sales_order_number` (BACKEND_REQUESTS 25) |
| `supplier-returns/` | `returns/v1/supplier-returns/` | List, form (items with cost from the standard cost), detail: approve → shipped → confirmed → close with the refund received |

### accounting — `/accounting` (module `accounting`)

API_REFERENCE.md → Accounting; checked against `accounting/serializers.py`.

| Resource | Endpoint | Notes |
|---|---|---|
| `accounts/` | `accounting/v1/accounts/` | Client list as a tree (`toTree`), type + search filters; `setup()` adds missing defaults. Form: 🧠 parent = same-type groups minus itself and descendants; system accounts keep type/group |
| `journal-entries/` | `accounting/v1/journal-entries/` | Server list (status, origin, dates; no search). 🧠 form: balanced lines in cents, one side per line, "Balance last line", draft or `post: true`; drafts only. Detail: post / delete / reverse (opens the reversal, follows the route) |
| `fiscal-years/` | `accounting/v1/fiscal-years/`, `fiscal-periods/{id}/close|reopen/` | One page: years with period tiles; create (periods made by the backend), close/reopen year and periods, delete year |
| `reports/` | `accounting/v1/reports/<type>/` | 🧠 one viewer for all 8 reports: `REPORT_PARAMS` decides the inputs, `columns`/`rows`/`summary` drive the table and cards; Excel via `getBlob` + `saveFile` |
| `supplier-payments/` | `accounting/v1/supplier-payments/` | List, record form (allocations ≤ amount; 🧠 picking a supplier loads its open invoices with their balance and clears the allocations), detail with void |
| `debit-notes/` | `accounting/v1/debit-notes/` | List, form (draft only; returns of the chosen supplier), detail: issue / cancel / delete. Raised from a supplier return too (`fromSupplierReturn`) |

### analytics — `/analytics` (module `inventory`)

Read-only, from `/api/reports/v1/` (API_REFERENCE.md → "Analytics, reports & dashboards"). Charts use chart.js through
PrimeNG's `p-chart`.

| File | Notes |
|---|---|
| `analytics.models.ts` | 🧠 `CHART_SPECS` (how each dashboard chart is drawn) + `fitsSpec` (else a table); `REPORT_PARAMS` / `REQUIRED_PARAMS` / `REPORT_GROUPS` per report; `isMoneyKey`, `isIdKey` |
| `analytics.service.ts` | Dashboards list/one, report types, run, Excel |
| `analytics-format.ts` | 🧠 `analyticsLabel` pipe (impure): `<namespace>.<key>`, else the backend's English, else a humanized key; `formatValue` by key (money, %, counts, lists, objects) |
| `analytics-table.component` | Any rows as a sortable table: report column order or the first row's keys, ids hidden, `flags` as badges (⚠️ text or list, BACKEND_REQUESTS 27) |
| `analytics-chart.component` | 🧠 chart.js data/options from a spec; rebuilds on theme/language (dark colours, RTL axes), translates series and coded categories |
| `dashboards/dashboard-page.component` | `/analytics/dashboards/:name`: pills from the API's list, window + warehouse (overview, inventory), alerts, KPI cards with change vs. previous, charts, tables |
| `reports/report-runner.component` | `/analytics/reports?report=`: grouped picker, per-report inputs, summary cards + nested tables, rows, Excel |

### import-export — `/import-export`

| File | Notes |
|---|---|
| `import-export.models.ts` | `DATA_RESOURCES`: every importable resource with its path, group, module / permission |
| `import-export.service.ts` | export / template blobs, `importFile(dryRun)`, task list. ⚠️ `fileToDataUri` picks the data-URI prefix from the extension (Excel needs `data:@file/…`) |
| `import-export-page.component` | 🧠 grouped picker filtered by module/permission; Check file (dry run, row preview) → Import only without errors; history with type filter and downloads |

## 7. Cross-feature links

```mermaid
flowchart LR
    teams["company/teams form"] -->|LocationService| sites["locations/sites"]
    dash["dashboard"] --> users["company/users"]
    dash --> depts["company/departments"]
    dash --> teamsS["company/teams"]
    dash --> sites
    dash --> tenants["admin/companies"]
    products["inventory/products form"] --> cats["inventory/categories"]
    products --> brands["inventory/brands"]
    whform["inventory/warehouses form"] -->|LocationService| sites
    zoneform["inventory/zones form"] --> wh["inventory/warehouses"]
    binform["inventory/bins form"] --> zones["inventory/zones"]
    products --> variants["inventory/variants"]
    spform["inventory/supplier-products form"] --> variants
    spform --> suppliers["inventory/suppliers"]
    soform["sales/orders form"] --> customers["sales/customers"]
    soform --> wh
    soform --> variants
    rmaform["returns/customer form"] --> customers
    rmaform --> soS["sales/orders service"]
    srnform["returns/supplier form"] --> suppliers
    srnform --> variants
```

Only services and models cross feature boundaries; components never do.

## 8. Review hot spots

The places most likely to hide a bug, in the order to check them:

1. 🧠 `core/interceptors/auth.interceptor.ts` + `AuthService.refreshAccessToken` — token refresh and logout.
2. 🧠 🔒 `core/auth/access.service.ts`, `layout/nav/nav-list.component.ts`, `core/auth/auth.guard.ts` — what each user may see and open.
3. 🧠 `shared/table/server-table.ts` — every list depends on it.
4. 🧠 `shared/utils/server-errors.ts` — every form depends on it.
5. 🧠 `features/locations/sites/site-form.component.ts` — cascading pickers that must not clear on load.
6. 🧠 `features/inventory/categories/category-form.component.ts` — tree rules (no cycles in the parent picker).
7. 🧠 `features/sales/orders/sales-order-form.component.ts` — line rows, product/variant pairing and the totals preview.
8. ⚠️ Every workaround still marked above: re-check when the backend fixes the matching item.

## 9. Keeping this map up to date

- Adding a resource: add one row to its area table in §6 (endpoint + anything unusual).
- Adding a feature area: add a §6 sub-section, a node in §1, and any cross-links in §7.
- Adding something to `core/` or `shared/`: add a row in §4 or §5; mark it 🆕 if other code will build on it.
- Adding a backend workaround: mark it ⚠️ here and add the item to `docs/BACKEND_REQUESTS.md`; remove both
  when the backend is fixed.
- Keep notes to one line. If it needs a paragraph, the explanation belongs in a code comment or a spec in
  `docs/superpowers/specs/`, and the map links to it.
