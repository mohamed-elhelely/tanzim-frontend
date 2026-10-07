# Step 4 — Company & Organisation (design)

Date: 2026-10-07
Status: approved in chat, awaiting written-spec review

## Goal

Give a company admin working screens to manage their organisation: **Users, Departments, Teams, Roles,
Permission groups, Permissions**. Each screen lists, searches, creates, edits and deletes records through the
real backend API, in English and Arabic (LTR/RTL), on desktop and mobile.

Source of truth: `D:\tanzim\backend\Tanzim\docs\API_REFERENCE.md` (section "Company & organisation") and
`BUSINESS_LOGIC.md` (sections 3 and 5). No API contract is invented; anything the docs leave unclear is listed
under *Open points to verify*.

## Decisions taken

| Topic | Decision |
|---|---|
| Scope | The 6 company-admin resources above. The platform-staff **Companies** screen is out of scope. |
| Permissions | Management screens only. No hiding of menus/buttons by the user's permissions (later step). |
| Team location | Read-only location picker from `/api/company/v1/location/?dropdown=true`. Creating locations is Step 5. |
| UI pattern | Expandable "Company" sidebar group with 6 entries; create/edit on separate pages. |
| Code structure | One shared `CrudApi<T, TPayload>` helper + a short service per resource + explicit list/form components per resource (no config-driven generic screens). |

## 1. Routes and sidebar

### Sidebar

- `NavItem` (`src/app/layout/nav/nav-items.ts`) gets an optional `children?: NavItem[]`.
- The Company item becomes a group with children: Users, Departments, Teams, Roles, Permission groups,
  Permissions.
- `NavListComponent` renders a group as a button with a chevron; children are indented underneath.
- The group starts expanded when the current URL is under `/company`, and can be toggled by hand.
- Mobile sidebar reuses `NavListComponent`, so it gets the group automatically.
- RTL: indent and chevron use logical Tailwind classes (`ps-`, `ms-`) and the chevron flips direction.

### Routes

`src/app/features/company/company.routes.ts`, lazy-loaded from `app.routes.ts` with `loadChildren` (replacing
the current `loadComponent` for `company`):

```
/company                              → redirect to /company/users
/company/users                        list
/company/users/new                    form (create)
/company/users/:id/edit               form (edit)
/company/departments  /new  /:id/edit
/company/teams        /new  /:id/edit
/company/roles        /new  /:id/edit
/company/permission-groups /new /:id/edit
/company/permissions  /new  /:id/edit
```

- Every route sets `data.titleKey`.
- The placeholder `CompanyPageComponent` is deleted.
- After a successful save, or on Cancel, the form navigates back to its list.

### Folder layout

```
src/app/features/company/
  company.routes.ts
  company.models.ts
  users/              company-user.service.ts, user-list.component.*, user-form.component.*
  departments/        department.service.ts, department-list.component.*, department-form.component.*
  teams/              team.service.ts, team-list.component.*, team-form.component.*
  roles/              role.service.ts, role-list.component.*, role-form.component.*
  permission-groups/  permission-group.service.ts, permission-group-list.component.*, permission-group-form.component.*
  permissions/        permission.service.ts, permission-list.component.*, permission-form.component.*
src/app/features/locations/location.service.ts      (dropdown only for now)
src/app/core/api/crud-api.ts
src/app/shared/pipes/localized-name.pipe.ts
src/app/shared/utils/server-errors.ts
```

## 2. API layer and data types

### `CrudApi<T, TPayload>` (`core/api/crud-api.ts`)

Abstract class extending the existing `BaseApiService`. Subclasses set `protected readonly path`
(e.g. `'company/v1/departments/'`). It unwraps the `{ success, data, metadata }` envelope.

| Method | Request | Returns |
|---|---|---|
| `list({ page, pageSize, search, ordering })` | `GET path?page=&page_size=&search=&ordering=` (empty params omitted) | `Paginated<T>` — `items` = `data`, `total` = `metadata.total_count` (fallback `items.length`), plus `page`, `pageSize` |
| `all()` | `GET path` | `T[]` |
| `dropdown()` | `GET path?dropdown=true` | `T[]` (only id + name fields) |
| `get(id)` | `GET path{id}/` | `T` |
| `create(body)` | `POST path` | `T` |
| `update(id, body)` | `PATCH path{id}/` | `T` |
| `remove(id)` | `DELETE path{id}/` | `void` |

All paths keep the trailing slash (the backend redirects otherwise and drops POST bodies).
`Paginated<T>` is the existing model in `core/models/api-response.model.ts`.

### Services

| Service | Path | Notes |
|---|---|---|
| `CompanyUserService` | `company/v1/company-user/` | List is unpaginated: pages use `all()`. `create()` is overridden to `POST` then `get(id)` because create returns a different shape (re-fetch as documented). |
| `DepartmentService` | `company/v1/departments/` | |
| `TeamService` | `company/v1/teams/` | |
| `RoleService` | `company/v1/roles/` | |
| `PermissionGroupService` | `company/v1/permission-groups/` | |
| `PermissionService` | `company/v1/permissions/` | Dropdown returns `id`, `name`, `codename`. |
| `LocationService` | `company/v1/location/` | Only `dropdown()` is used in Step 4; Step 5 extends it. |

If the create response for company users does not include `id`, the service finds the new record by email
from `all()` instead (see *Open points*).

### Types (`features/company/company.models.ts`)

```ts
interface UserRef { id: number; email: string; first_name: string; last_name: string;
                    date_joined: string; full_name?: string }
interface NamedRef { id: number; name_en: string; name_ar?: string | null }

interface CompanyUser {
  id: number;
  user: { id: number; email: string; first_name: string; last_name: string; preferred_name: string;
          profile_picture: string | null; phone_number: string; timezone: string };
  role: { id: number; name_en: string; name_ar: string | null; is_admin: boolean;
          permission_groups: NamedRef[] } | null;
  department: Department | null;
  team: Team | null;
  is_company_admin: boolean; is_department_manager: boolean; is_team_lead: boolean;
  date_joined: string; last_updated: string;
}
interface Department { id: number; name_en: string; name_ar: string | null; parent: NamedRef | null;
                       manager: UserRef | null; created_by: UserRef | null; updated_by: UserRef | null }
interface Team { id: number; name_en: string; name_ar: string | null; department: Department;
                 leads: UserRef[]; location: { id: number; name: string } | null;
                 created_by: UserRef | null; updated_by: UserRef | null }
interface Role { id: number; name_en: string; name_ar: string | null; is_admin: boolean;
                 permission_groups: NamedRef[] }
interface PermissionGroup { id: number; name_en: string; name_ar: string | null; description: string;
                            is_core: boolean; created_by: UserRef | null; updated_by: UserRef | null }
type PermissionType = 'API' | 'OBJECT' | 'FEATURE';
interface Permission { id: number; codename: string; name: string; description: string;
                       permission_type: PermissionType; groups: NamedRef[];
                       created_by: UserRef | null; updated_by: UserRef | null }
```

Payload types contain only documented request fields:

| Payload | Fields |
|---|---|
| `CompanyUserPayload` | `user { email, first_name, last_name, preferred_name?, phone_number?, password? }`, `role?`, `department?`, `team?`, `is_company_admin?`, `is_department_manager?`, `is_team_lead?` |
| `DepartmentPayload` | `name_en`, `name_ar?`, `parent?`, `manager?` |
| `TeamPayload` | `department`, `name_en`, `name_ar?`, `leads?`, `location` |
| `RolePayload` | `name_en`, `name_ar?`, `permission_groups`, `is_admin?` |
| `PermissionGroupPayload` | `name_en`, `name_ar?`, `description?`, `is_core?` |
| `PermissionPayload` | `codename`, `name`, `description?`, `permission_type?`, `groups?` |

Never sent: `company`, `created_by`, `updated_by`, `is_deleted`, `deleted_at`.

### Id semantics

- Department `manager` and team `leads` are **User** ids, not company-user ids. The user picker is built from
  `CompanyUserService.all()` with value `user.id` and label `first_name last_name (email)`.
- `role`, `department`, `team` on a company user are Role/Department/Team ids.

## 3. Screens

### List pages (Departments, Teams, Roles, Permission groups, Permissions)

- `PageHeader` with title and a "New …" action navigating to `…/new`.
- Search input, debounced 300 ms, sends `search=`; resets to page 1.
- PrimeNG `p-table` in lazy mode with paginator (10/25/50 rows); sort on the sortable columns (`id`, `name_en`)
  sends `ordering` (`-` prefix for descending).
- Row actions: Edit (navigate to `…/:id/edit`) and Delete (confirm via `ConfirmationService` → `remove()` →
  reload current page → success toast). If the deleted row was the last on its page, go to the previous page.
- States: table loading indicator; `EmptyState` when there are no rows; `ErrorState` with Retry when the list
  request fails.

### Users list

Same look, but the list comes from `all()`; paging, sorting and search (name, email) happen client-side in
the `p-table`.

### Columns

| Screen | Columns |
|---|---|
| Users | Name (`first_name last_name`), Email, Role, Department, Team, Company admin (badge) |
| Departments | Name (EN), Name (AR), Parent, Manager |
| Teams | Name (EN), Name (AR), Department, Location, Leads |
| Roles | Name (EN), Name (AR), Admin (badge), Permission groups |
| Permission groups | Name (EN), Name (AR), Description, Core (badge) |
| Permissions | Codename, Name, Type, Groups |

Related-object names and picker labels use `localizedName`: `name_ar` when the UI language is Arabic and it is
non-empty, otherwise `name_en`. It is a pure pipe that takes the current language as an argument
(`item | localizedName: lang()`) so it re-renders on language change.

### Form pages

- `PageHeader` with back button; `p-card` with a reactive form; 2-column grid on `md+`, 1 column below.
- Validators from the docs: `required`, `maxLength`, `email`.
- Edit mode: `get(id)` with a loading state, then `patchValue`. 404 → `ErrorState` "not found" with a link back.
- Save: button disabled with spinner while submitting; on success a "Saved" toast and navigate to the list.
  Create uses `create()`, edit uses `update()` (PATCH).

| Form | Fields (`*` required) and limits |
|---|---|
| User | Email\* (email, ≤254), First name\* (≤100), Last name\* (≤100), Preferred name (≤100), Phone (≤128), Password\* (≤128, **create only**), Role, Department, Team, Company admin, Department manager, Team lead (switches) |
| Department | Name EN\* (≤100), Name AR (≤100), Parent department (excludes itself), Manager (user picker) |
| Team | Department\*, Name EN\* (≤100), Name AR (≤100), Location\*, Leads (user multi-select) |
| Role | Name EN\* (≤100), Name AR (≤100), Permission groups\* (multi-select, at least one), Admin |
| Permission group | Name EN\* (≤100), Name AR (≤100), Description (textarea), Core |
| Permission | Codename\* (≤100), Name\* (≤255), Description, Type (API/OBJECT/FEATURE), Groups (multi-select) |

- Pickers are filterable `p-dropdown` / `p-multiSelect`, loaded from each service's `dropdown()`; the user picker
  from `CompanyUserService.all()`. Optional single pickers can be cleared (sends `null`).
- Empty optional text fields are sent as empty string for non-nullable fields (`description`,
  `preferred_name`, `phone_number`) and `null` for nullable ones (`name_ar`).

### Team form — location picker

- Location request returns **403** → inline message "Your subscription doesn't include Locations."
- Returns an **empty list** → inline message "Create a location first (Locations section)."
- In both cases Save stays disabled because `location` is required.

### Translations

New `company.*` block in `en.json` and `ar.json` (titles, column headers, field labels, messages, states).
Generic words reuse `common.*` (`save`, `cancel`, `delete`, `edit`, `search`, `actions`, …). New common keys if
needed: `common.new`, `common.saved`, `common.deleted`, `common.notFound`, `common.forbidden`,
`common.confirmDelete`.

## 4. Errors, testing, verification

### Error handling

| Case | Behaviour |
|---|---|
| 400 validation (`error.errors` field → messages) | Messages shown under the matching control (`serverError` key on the control). Nested `user.email` etc. map to the user form's flat controls. `non_field_errors` and unknown fields go to an inline alert at the top of the form. |
| 400 business rule (`error.message`, empty `errors`) | Error toast with the server message (forms and deletes). |
| 403 on a list | `ErrorState` "You don't have access to this section". |
| 404 on edit | `ErrorState` "Not found" with a link back to the list. |
| Network / 5xx / 401 | Already handled globally (toast; refresh → logout). Pages only stop their loading state. |

Helper `applyServerErrors(form, error): string[]` (`shared/utils/server-errors.ts`) sets `{ serverError: msg }`
on matching controls (with an optional field-name map for nested keys) and returns the messages that did not
match a control, for the top alert. A server error is cleared when the control's value changes.

### Tests (Jasmine/Karma, test-first, `HttpTestingController` — never the real backend)

- `CrudApi`: URLs, query params, trailing slashes, `total_count` → `Paginated`, `dropdown=true`, PATCH on update,
  DELETE returns void.
- `CompanyUserService`: create then re-fetch.
- `applyServerErrors`: field errors, nested `user.*` mapping, unmatched → returned list.
- `localizedName`: AR/EN choice and fallback to EN.
- `NavListComponent`: group expanded on `/company/*`, toggle works.
- Per resource:
  - list: loads, sends paging/search/ordering params, delete after confirmation reloads.
  - form: create, edit (loads and patches), invalid form not submitted, server errors displayed.
- User form: password required on create, absent on edit.
- Team form: location 403 and empty list both disable Save.

### Verification

1. `npm run build` and `ng test --watch=false --browsers=ChromeHeadless` both green.
2. Browser against the local backend as a company admin: create, edit, search and delete on each of the 6 screens;
   Arabic RTL labels; mobile sidebar; confirm *Open points* below.
3. Prerequisite: a working company-admin login. Either the user provides an account, or (with the user's OK)
   the backend's `setup_data.py` seeds `admin@testcompany.com`.

## Open points to verify against the running backend

1. Shape of `Department.parent` and `Permission.groups` when non-empty (docs only show `null` / `[]`); assumed
   `{ id, name_en }`.
2. `PATCH /company-user/{id}/` with a nested `user` object without `password` succeeds.
3. Company-user create response includes an `id` (docs list `user, role, department, team, is_company_admin,
   is_department_manager, is_team_lead` only). If not, re-fetch by email from `all()`.

Each is checked with a real request during implementation; types and code are adjusted if the backend differs.

## Out of scope

- Platform-staff Companies screen (`/api/company/v1/admin/company/`).
- Hiding menus/buttons by the user's permissions or role.
- Creating/editing locations (Step 5).
- Hiding menus by subscription module.
