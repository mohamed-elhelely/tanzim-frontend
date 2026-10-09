# Architecture and roadmap

How the Tanzim frontend is organised, the rules every new file follows, and what comes next.
For a file-by-file reference of what exists today, see [CODE_MAP.md](CODE_MAP.md).

## 1. What the app is

A bilingual (English / Arabic, RTL) ERP frontend for the Django backend `0Mustafa37/Tanzim`.

| Concern | Choice |
|---|---|
| Framework | Angular 21, standalone components, signals, lazy routes |
| UI | PrimeNG 21.1.10 (last MIT release — do not move to 22 without the owner) + Tailwind 3 |
| i18n | ngx-translate, `src/assets/i18n/en.json` and `ar.json` |
| Tests | Jasmine + Karma, `HttpTestingController` against the real error interceptor |
| Backend contract | `docs/API_REFERENCE.md` in the backend repo; serializers win when the docs disagree |

## 2. Folder structure

```
src/app/
├── app.config.ts          providers: router, HTTP + interceptors, PrimeNG theme, i18n
├── app.routes.ts          top-level routes and guards; features are lazy-loaded
├── core/                  singletons with no UI, used everywhere
│   ├── api/               BaseApiService, CrudApi, API_BASE_URL
│   ├── auth/              AuthService, AccessService (/me), TokenStorageService, guards, auth models
│   ├── errors/            AppError + toAppError, GlobalErrorHandler
│   ├── interceptors/      api-headers → auth → loading → error
│   ├── models/            the backend response envelope
│   ├── notifications/     NotificationCenterService (list, unread count, live WebSocket)
│   ├── services/          app-wide services (notifications, confirm + workflow actions, language, theme, loading)
│   └── theme/             PrimeNG preset
├── layout/                the signed-in frame: shell, header, sidebar, nav
├── shared/                reusable UI and helpers with no business knowledge
│   ├── components/        page-header, field-error, empty/error/loading states, status-badge, …
│   ├── pipes/             localizedName, userName
│   ├── table/             ServerTable (state for server-paged lists)
│   └── utils/             server-errors (form error handling)
├── features/              one folder per business area
│   └── <area>/
│       ├── <area>.routes.ts
│       ├── <area>.models.ts
│       └── <resource>/    service + list + form (+ specs)
└── testing/               test helpers and fixtures (never imported by app code)
```

### Which folder does a new file go in?

| If the file… | Put it in |
|---|---|
| is a singleton used by many features and has no template | `core/` (pick the matching sub-folder) |
| is a reusable component, pipe or helper that knows nothing about a business area | `shared/` |
| belongs to the signed-in frame (sidebar, header) | `layout/` |
| belongs to one business area | `features/<area>/` |
| is only used by tests | `testing/` |

A feature may import from `core/`, `shared/` and another feature's **service or models** (e.g. the team form
uses `LocationService`). Features never import another feature's components. `core/` and `shared/` never
import from `features/`. The one exception: the dashboard reads several features' services to show counts.

## 3. Conventions

### Files and naming

- **Every component is two files**: `name.component.ts` + `name.component.html` (`templateUrl`). No inline
  templates. Add a `.scss` only when the component has styles Tailwind can't express (none do today).
- One resource folder = `<resource>.service.ts`, `<resource>-list.component.*`, `<resource>-form.component.*`,
  and their `.spec.ts` next to them.
- Models for an area live in one file, `<area>.models.ts`. Core models are `<topic>.model.ts`.
- Route paths are plural and kebab-case (`/company/permission-groups`); `…/new` and `…/:id/edit` for forms.
- Selectors are `app-<name>`. Classes end in `Component`, `Service`, `Pipe`.

### Component anatomy

Inside a component class, in this order: injected dependencies (`private readonly x = inject(X)`), public
state (signals), constants for the template, lifecycle hooks, public handlers, private helpers.
All components use `ChangeDetectionStrategy.OnPush` (except `FieldErrorComponent`, which must react to
`touched` changes made by its parent form).

### The list screen recipe

```ts
private readonly api = inject(DepartmentService);
private readonly confirm = inject(ConfirmService);
readonly table = new ServerTable<Department>((query) => this.api.list(query));

ngOnInit() { this.table.load(); }
confirmDelete(row) { this.confirm.confirmDelete(row.name_en, () => this.api.remove(row.id), () => this.table.afterDelete()); }
```

The template binds `p-table` to `table.rows()`, `table.total()`, `table.first()`, `table.pageSize()`,
`table.loading()`, `(onLazyLoad)="table.onLazyLoad($event)"` and the search box to `table.onSearch(...)`.
`ServerTable` handles paging, sorting, the 300 ms search debounce, cancelling stale requests and stepping back
a page after deleting the last row. Endpoints that are **not** paginated (`company-user/`, `admin/company/`)
load everything with `api.all()` and let `p-table` page and filter in the browser.

### The form screen recipe

- A reactive form built with `NonNullableFormBuilder`; client validators mirror the backend's rules.
- `id` from the route decides create (POST) or edit (PATCH with the full body).
- On save failure: `this.formErrors.set(handleSaveError(this.form, error, this.notifications))`. Field errors
  appear under the inputs (`<app-field-error>`), everything else in the alert above the form.
- Cleared pickers send `null`; text fields are trimmed; optional numbers are converted explicitly.
- Each form stays explicit on purpose: the per-resource rules (and backend workarounds) are what matters when
  reading it, so there is no generic form base class.

### Services

- One service per backend resource, extending `CrudApi<T, TPayload>`; it only sets `path` (always ending in `/`).
- App-wide services live in `core/services` and are `providedIn: 'root'`.
- Add a shared service only when the **same logic** appears in several features (that is how `ConfirmService`,
  `ServerTable` and `handleSaveError` came about). Two similar screens are not a reason; three copies are.

### Access control

- Menu entries: add `permission`, `module`, `roles` or `staffOnly` to the item in `layout/nav/nav-items.ts`.
- Routes: `canActivate: [permissionGuard]` + `data: { permission: 'add_department' }`.
- Buttons: `readonly canAdd = computed(() => this.access.can('add_department'))` and `@if (canAdd())` in the template.
- Only company resources have permission codenames; everything else is gated by subscription module.

### Errors — who shows what

| Error | Shown by |
|---|---|
| Network / 5xx | `errorInterceptor` (toast) |
| 401 | `authInterceptor` (refresh once, else logout) |
| 403 / 404 on a list or a form load | the screen's `<app-error-state>` with `errorTitleKey()` |
| 4xx on save | `handleSaveError` (under the field, alert, or toast) |
| 4xx on delete | `ConfirmService` (toast) |
| Anything uncaught that isn't HTTP | `GlobalErrorHandler` (toast) |

### i18n and RTL

- Every visible string is a key in both `en.json` and `ar.json`, grouped by area (`company.*`, `inventory.*`).
- Use logical Tailwind classes only: `ps-/pe-/ms-/me-/start-/end-/text-start/text-end`; arrows get
  `rtl:rotate-180`. Never `pl-/pr-/ml-/mr-/left-/right-/text-left/text-right`.
- Enum options store translation keys as labels; the template translates them (`option.label | translate`).

### Comments

Explain **why** (a backend quirk, a non-obvious rule), not what the next line does. Every file in `core/`
starts with a one-line purpose. Backend workarounds always say so and point to `docs/BACKEND_REQUESTS.md`.

### Testing

- Specs sit next to the file. Use `provideApiTesting()` and the fixtures in `src/app/testing/`.
- Each list: loads, paging/search params, 403 state, edit navigation, delete. Each form: create body, client
  validation, edit load + PATCH, server error under the field. Backend workarounds get their own test.
- Run: `npx ng test --watch=false` (in a container, ChromeHeadless needs `--no-sandbox`).

### Definition of done for a screen

Build and tests pass; checked against the local backend in English, Arabic (RTL), dark mode and 390 px
mobile with no console errors; a spec in `docs/superpowers/specs/` with a "Verification results" table;
backend problems added to `docs/BACKEND_REQUESTS.md`; [CODE_MAP.md](CODE_MAP.md) updated.

## 4. Adding a new resource (checklist)

1. Types in `features/<area>/<area>.models.ts` (response type + payload type), checked against the serializer.
2. `features/<area>/<resource>/<resource>.service.ts` extending `CrudApi`.
3. List and form components (copy the closest existing resource; brands is the smallest).
4. Routes in `<area>.routes.ts` with `data: { titleKey }` (the header breadcrumb uses it).
5. A sidebar entry in `layout/nav/nav-items.ts` (with `module` / `roles` when gated).
6. Strings in `en.json` and `ar.json`.
7. Specs, fixtures in `testing/<area>-fixtures.ts`.
8. Verify, write the spec, update the code map.

## 5. Roadmap

### Done

| Step | What |
|---|---|
| 1–3 | Project setup, auth, layout |
| 4 | Company & organisation (users, departments, teams, roles, permission groups, permissions) |
| 5 | Locations (countries, regions, cities, districts, company locations) |
| — | Redesign, Angular 21 + PrimeNG 21 |
| 6 | Platform-staff Companies screen |
| — | Menu visibility by role and subscription module |
| 7 | Inventory catalogue (products, categories, brands) — PR #8 |
| — | Code structure: one convention, shared ServerTable / ConfirmService / handleSaveError, this document |
| 8 | Inventory warehouses, zones, bins and suppliers |
| 9 | Access control from `/me`: permissions, modules and staff flag drive the menu, guards, buttons and dashboard |
| 10 | Dropped the workarounds the backend fixed |
| 11 | Product variants and the supplier price list |
| 12 | Notifications (bell, page, live WebSocket) and Billing (subscription + invoices, read-only) |
| 13 | Sales: customers and sales orders (lines, totals, confirm / cancel / duplicate / mark delivered) |
| 14 | Sales: delivery notes (ship from an order), sales invoices and payments |
| 15 | Returns: customer returns (RMA workflow, replacement orders) and supplier returns |
| 16 | Accounting: chart of accounts, journal entries (manual, post, reverse), fiscal years and periods |
| 17 | Accounting: reports viewer (8 reports, Excel), supplier payments, debit notes |
| 18 | Import / export: every supported resource, dry-run check before import, task history |
| 19 | Verified backend fixes 0–23 against the API; dropped their workarounds (`omitPristine`, socket mapping, message unwrapping, …) |

### Next — features (in order)

1. **Inventory stock and movements** (batches, serials, stock ledger, transfers, adjustments, cycle counts) and **procurement** (requisitions, purchase orders, goods receipts, supplier invoices, approvals). The read serializers are complete now (BACKEND_REQUESTS 2 fixed).

### Next — code health (small, do alongside features)

| When | Change | Why |
|---|---|---|
| Next time shared components are touched | Move `@Input`/`@Output` to signal `input()`/`output()` in one go | Today all 21 inputs use `@Input`; mixing styles would be worse than either |
| Before the first file upload (logos, product images) | A `toFormData()` helper in `core/api` and a `CrudApi.createMultipart()` | Several resources need multipart; keep it in one place |
| When a fourth client-side list appears | A `ClientTable` next to `ServerTable` | Only two exist today, so no abstraction yet |
| Before production | Lint + format in CI (ESLint + Prettier, needs the owner's OK for new dev dependencies) | Formatting is consistent today but not enforced |

## 6. Decisions and why

| Decision | Why |
|---|---|
| Explicit list/form components per resource, no config-driven generic screens | Each resource has its own rules and backend quirks; explicit code is easier to read and review |
| `ServerTable` is a plain class, not a base component | Composition is easier to follow than inheritance; the component still owns its template and actions |
| (removed in step 18) One placeholder page for unbuilt sections | Every section is built now |
| Subscription loading fails open | The backend still answers 403; hiding everything on a network blip would be worse |
| Edit forms send every field (PATCH with the full body) | Every read endpoint returns the full object since step 19, so what the form shows is what is saved |
