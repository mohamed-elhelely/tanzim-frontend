# Tanzim — API Reference (for frontend)

> Generated from the code on branch `master` (after PR #8) and **verified by calling every endpoint**:
> all examples below are real requests and responses captured from the running API with test data.
> Field tables come straight from the serializers each endpoint uses.
> Live Swagger UI is also available at `/api/docs/` (schema at `/api/schema/`), but it describes custom
> action bodies incorrectly — trust this document for actions.

## Contents

1. [Conventions](#conventions)
2. [Authentication](#authentication)
3. [Company & organisation](#company--organisation)
4. [Locations](#locations)
5. [Inventory — catalogue](#inventory--catalogue)
6. [Inventory — warehouses](#inventory--warehouses)
7. [Inventory — suppliers](#inventory--suppliers)
8. [Inventory — stock](#inventory--stock)
9. [Inventory — stock movements](#inventory--stock-movements)
10. [Inventory — procurement](#inventory--procurement)
11. [Inventory — planning & alerts](#inventory--planning--alerts)
12. [Inventory — approvals](#inventory--approvals)
13. [Sales](#sales)
14. [Returns](#returns)
15. [Accounting](#accounting)
16. [Subscriptions & platform billing](#subscriptions--platform-billing)
17. [Reports (platform billing)](#reports-platform-billing)
18. [Analytics, reports & dashboards](#analytics-reports--dashboards)
19. [Import & export](#import--export)
20. [Notifications & background tasks](#notifications--background-tasks)
21. [Known issues](#known-issues)

## Conventions

### Base URL and versioning

All paths below are relative to the server root, e.g. `https://api.example.com/api/sales/customers/`.
Paths **end with a slash** — calling without the trailing slash redirects (POST bodies are lost), so always include it.

| Area | Prefix |
|---|---|
| Auth | `/api/login/`, `/api/refresh/` |
| Company, users, locations | `/api/company/v1/` |
| Inventory | `/api/inventory/v1/` |
| Sales | `/api/sales/v1/` (old `/api/sales/` still works) |
| Returns | `/api/returns/v1/` (old `/api/returns/api/returns/` still works) |
| Subscriptions & platform billing | `/api/subscriptions/v1/` (old `/api/subscriptions/` still works) |
| Notifications | `/api/notifications/v1/` (old `/api/notifications/` still works) |
| Import/export tasks | `/api/common/v1/` |

### Response envelope

**Every** JSON response (success and error) is wrapped:

```json
{
  "success": true,
  "data": { "...": "the actual payload (object or array)" },
  "metadata": {
    "timestamp": "2026-10-03T21:57:41.047738Z",
    "version": "1.0",
    "total_count": 25
  }
}
```

- `data` is the object, or the **array** for list endpoints.
- `metadata.total_count` is present for lists (total across all pages when paginated).
- Paginated lists also return `metadata.next` / `metadata.previous` (URLs or `null`).

Errors:

```json
{
  "success": false,
  "data": null,
  "metadata": { "timestamp": "…", "version": "1.0" },
  "error": {
    "code": 400,
    "message": "Only draft invoices can be edited.",
    "errors": { "field_name": ["This field is required."] }
  }
}
```

- Validation errors: `error.message` is `"Unknown error"` and the details are in `error.errors` — a map of
  `field → [messages]` (`non_field_errors` for cross-field rules). Nested objects/lists follow the same shape.
- Business-rule errors (wrong status, insufficient quantity…): `error.message` holds the reason as a plain sentence
  (e.g. `"Order exceeds customer credit limit"`; several reasons are joined with a space) and `error.errors` is `{}`.
- Non-JSON 500 errors return an HTML page — treat any 5xx as "server error".

| Status | Meaning |
|---|---|
| 200 / 201 / 204 | OK / created / deleted (204 has no body) |
| 400 | Validation or business-rule error (see `error`) |
| 401 | Missing/invalid token |
| 403 | Authenticated but not allowed (missing permission codename, missing subscription module, not staff…) |
| 404 | Not found **or belongs to another company** (cross-company ids always look like 404) |
| 405 | Method not allowed on this path |
| 429 | Rate limit exceeded (60 requests/minute per user/IP) — retry after a short wait |

### Data types

| Type in tables | JSON | Example |
|---|---|---|
| id | integer | `12` |
| decimal (string) | **string** in responses; send string or number | `"250.0000"` |
| date | `YYYY-MM-DD` | `"2026-10-15"` |
| datetime | ISO 8601 with offset | `"2026-10-04T00:57:33.448148+03:00"` |
| enum | string, one of the listed values | `"draft"` |
| array of ids | `[1, 2]` | |
| object / JSON | free-form object | `{"street": "…"}` |

Money and quantities are decimals — never parse them as floats for arithmetic you send back.

### Multi-tenancy (company)

Every user belongs to one company. **You never send `company`** — the server sets it from the token and
filters every list/detail to the user's company. Ids of other companies' objects are rejected (400 on create
with *"Invalid pk … object does not exist"*, 404 on retrieve/update).

Do not send `created_by`, `updated_by`, `is_deleted`, `deleted_at` either — some inventory forms accept them,
but they are server-managed (see *Known issues*).

### Subscription modules

Some areas require the company's subscription to include a module; otherwise you get **403**:

| Module code | Unlocks |
|---|---|
| `inventory` | everything under `/api/inventory/v1/` |
| `location` | countries, regions, cities, districts, locations |
| `accounting` | everything under `/api/accounting/v1/` |

Use `modules` from [`GET /api/company/v1/me/`](#get-apicompanyv1me) to know which modules the company has and hide menus accordingly
(`GET /api/subscriptions/subscriptions/current/` returns the full subscription).

### Listing: pagination, search, ordering, dropdowns

Two families of list endpoints exist:

**Company & inventory endpoints** (`/api/company/v1/…`, `/api/inventory/v1/…`, except `company-user/` and `admin/company/` which return the full list):

| Query param | Meaning |
|---|---|
| `page`, `page_size` | Paginated, default 10, max 100 |
| `search` | Free-text search on the fields listed per resource |
| `ordering` | e.g. `ordering=-id` |
| `dropdown=true` | Unpaginated short list (`id` + name fields) for select boxes |

**Sales, returns and billing endpoints**: the full list by default; send `page` and/or `page_size` to get pages
(same envelope as above). `search`, `ordering` and exact-match filters are listed per resource (e.g. `?status=draft&customer=3`).

Detail routes use the numeric id: `/…/{id}/`. `PUT` requires all required fields; `PATCH` accepts any subset.
`DELETE` on inventory/company resources is a **soft delete** (the row disappears from lists).
Names that must be unique (department, role and location `name_en` per company; team per department; region per
country; city per region; district per city) only clash with live rows: a soft-deleted row's name can be reused.
A clash returns **400** on the field, e.g. `{"name_en": ["A region with this Name EN already exists."]}`.

---

## Authentication

JWT (Bearer). Log in once, store the tokens, and send the access token on every request:

```
Authorization: Bearer <access>
```

Tokens are currently configured to be very long-lived (10 years), so in practice you rarely need to refresh.
Public endpoints (no token): `POST /api/login/`, `POST /api/refresh/`, `GET /api/subscriptions/plans/`,
`POST /api/subscriptions/plans/{id}/calculate_cost/`.

### `POST /api/login/`

| Field | Type | Required |
|---|---|---|
| `email` | email | **yes** |
| `password` | string | **yes** |

Response `data`:

| Field | Type | Notes |
|---|---|---|
| `access` | string (JWT) | send as Bearer token |
| `refresh` | string (JWT) | use with `/api/refresh/` |
| `user` | string | full name |
| `role` | enum | `ADMIN` = user has no company · `COMPANY` = company admin · `EMPLOYEE` = regular company user |
| `is_staff` | boolean | platform staff. `role: "ADMIN"` only means "no company": show platform screens (Companies…) only when `is_staff` is `true` |

The access token payload also contains `user_id`, `company_id`, `company_role` (role name or null),
`is_company_admin` and `is_staff` — decode it (no verification needed on the client) to drive the UI, or call
[`GET /api/company/v1/me/`](#get-apicompanyv1me) for permissions and modules.

<details><summary>Example: Login → <code>200</code></summary>

```http
POST /api/login/
```

Request body:

```json
{
  "email": "admin@acme.example",
  "password": "Passw0rd!"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MjEwNjQyNDY1NSwiaWF0IjoxNzkxMDY0NjU1LCJqdGkiOiJjZTM5MmZmY2UxY2M0MGFhYWRlNDZmZDhjNGUxNDk3MCIsInVzZXJfaWQiOiIxIiwiY29tcGFueV9pZCI6MSwiY29tcGFueV9yb2xlIjpudWxsLCJpc19jb21wYW55X2FkbWluIjp0cnVlfQ.2NdthRY67HF_HywznE27Cv6ccA_mUHcxq80ArATxKhw",
    "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoyMTA2NDI0NjU1LCJpYXQiOjE3OTEwNjQ2NTUsImp0aSI6IjZlZDU5YjQ0N2VmNTQ1M2FiZWViN2I0YzNmYmY4NjhiIiwidXNlcl9pZCI6IjEiLCJjb21wYW55X2lkIjoxLCJjb21wYW55X3JvbGUiOm51bGwsImlzX2NvbXBhbnlfYWRtaW4iOnRydWV9.EtQzU-fa8ISNUalrztYco3IGEk6KJWhWpcf4QiOWxM4",
    "user": "Sara Ali",
    "role": "COMPANY",
    "is_staff": false
  },
  "metadata": {
    "timestamp": "2026-10-03T21:57:35.040208Z",
    "version": "1.0"
  }
}
```

</details>

<details><summary>Example: Login (wrong password) → <code>400</code></summary>

```http
POST /api/login/
```

Request body:

```json
{
  "email": "admin@acme.example",
  "password": "nope"
}
```

Response:

```json
{
  "success": false,
  "data": null,
  "metadata": {
    "timestamp": "2026-10-03T21:57:35.706429Z",
    "version": "1.0"
  },
  "error": {
    "code": 400,
    "message": "Unknown error",
    "errors": {
      "non_field_errors": [
        "Unable to log in with provided credentials."
      ]
    }
  }
}
```

</details>

### `POST /api/refresh/`

| Field | Type | Required |
|---|---|---|
| `refresh` | string | **yes** |

Returns `{"access": "…"}`.

<details><summary>Example: Refresh token → <code>200</code></summary>

```http
POST /api/refresh/
```

Request body:

```json
{
  "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MjEwNjQyNDY1MywiaWF0IjoxNzkxMDY0NjUzLCJqdGkiOiI1MjRiYmVjMTZlOTY0YTlmODhhYjgwYzM0ZWE3NzhmZSIsInVzZXJfaWQiOiIxIn0.CxyGK-tZG373jMIez_Ok3mUjlga8Csj_cTvE9C4IA2I"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoyMTA2NDI0NjU1LCJpYXQiOjE3OTEwNjQ2NTUsImp0aSI6IjhjOTg0NzJhYmYzNTQ0NjdiZmUxZjIzMTgwZTBmYTlhIiwidXNlcl9pZCI6IjEifQ.DpE7dsG6gDgoP6KfUpWxK-t5Clp-17sG0DcxC7QMAqU"
  },
  "metadata": {
    "timestamp": "2026-10-03T21:57:35.709394Z",
    "version": "1.0"
  }
}
```

</details>

### `GET /api/company/v1/me/`

The logged-in user with everything the UI needs to build menus and hide buttons, in one call.
Call it after login (and on app start).

| Field | Type | Notes |
|---|---|---|
| `user` | object | `id`, `email`, `first_name`, `last_name`, `profile_picture` (absolute URL or null) |
| `is_staff` | boolean | platform staff (can use `/api/company/v1/admin/company/`) |
| `company` | object or null | `id`, `name`, `logo` (absolute URL or null), `primary_color`, `secondary_color` (`#RRGGBB`); `null` for users without a company |
| `role` | object or null | `id`, `name_en`, `name_ar`, `is_admin` |
| `is_company_admin` | boolean | |
| `is_department_manager` | boolean | |
| `is_team_lead` | boolean | |
| `has_full_access` | boolean | `true` for company admins and admin roles: treat every permission as granted |
| `permissions` | array of strings | sorted, de-duplicated codenames (see [Permissions](#permissions)); every codename when `has_full_access` |
| `modules` | array of strings | module codes of the company's active subscription (see [Subscription modules](#subscription-modules)); `[]` without an active subscription |

<details><summary>Example: Current user → <code>200</code></summary>

```http
GET /api/company/v1/me/
```

Response:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": 7,
      "email": "sara@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "profile_picture": "https://api.example.com/media/profile_pics/sara.png"
    },
    "is_staff": false,
    "company": {
      "id": 1,
      "name": "Acme",
      "logo": "https://api.example.com/media/company/logos/acme.png",
      "primary_color": "#0B5FFF",
      "secondary_color": "#FFFFFF"
    },
    "role": { "id": 3, "name_en": "Clerk", "name_ar": "كاتب", "is_admin": false },
    "is_company_admin": false,
    "is_department_manager": false,
    "is_team_lead": true,
    "has_full_access": false,
    "permissions": ["access_company", "add_team", "view_department", "view_team"],
    "modules": ["inventory", "location"]
  },
  "metadata": {
    "timestamp": "2026-10-08T10:00:00.000000Z",
    "version": "1.0"
  }
}
```

</details>

### `PATCH /api/company/v1/me/profile/`

The caller updates their own profile. Send `multipart/form-data` to upload a picture (JSON works for the
other fields). Any authenticated user; no permission needed.

| Field | Type | Notes |
|---|---|---|
| `first_name`, `middle_name`, `last_name`, `preferred_name` | string | |
| `phone_number` | string | international format, e.g. `+201001234567` |
| `timezone` | string | IANA name, e.g. `Africa/Cairo` |
| `profile_picture` | image file or `null` | PNG/JPEG/…, max 5 MB; `null` removes it |

Response `data`: the same fields, with `profile_picture` as an absolute URL (or null).

### `POST /api/company/v1/me/change-password/`

| Field | Type | Required |
|---|---|---|
| `current_password` | string | **yes** |
| `new_password` | string | **yes**; must pass the password rules (length, not common, not numeric only, not like the user's details) and differ from the current one |

`200` with `{"detail": "Password changed."}`; `400` with the failing field (`current_password` or `new_password`).
The current tokens stay valid.

### `GET` / `PATCH /api/company/v1/company-profile/`

The caller's company branding. `GET` needs `view_company`, `PATCH` needs `change_company` (plus
`access_company`; company admins always pass). Send `multipart/form-data` to upload a logo.

| Field | Type | Notes |
|---|---|---|
| `id`, `name` | | read-only |
| `logo` | image file or `null` | max 5 MB; `null` removes it; returned as an absolute URL |
| `primary_color`, `secondary_color` | string | `#RRGGBB`, stored upper-case |

There is no logout endpoint: drop the tokens on the client.

---

## Company & organisation

Company profile, users, departments, teams, roles and permissions.

### Companies (platform admin)

Create and manage tenant companies. Platform staff only — a normal company user gets 403.

**Access:** platform staff only.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/company/v1/admin/company/` | List |
| `POST` | `/api/company/v1/admin/company/` | Create |
| `GET` | `/api/company/v1/admin/company/{id}/` | Retrieve |
| `PUT` | `/api/company/v1/admin/company/{id}/` | Replace (all required fields) |
| `PATCH` | `/api/company/v1/admin/company/{id}/` | Partial update |
| `DELETE` | `/api/company/v1/admin/company/{id}/` | Deactivate (see below) |

**List query parameters** (not paginated):

| Query param | Meaning |
|---|---|
| `search` | Text search in: `name`, `legal_name`, `domain`, `email` |
| `ordering` | Sort by `id`, `name`, `domain`, `is_active`, `created_at` (prefix `-` for descending); default `name` |
| `is_active` | `true` / `false` — only active / deactivated companies |

**Create** (`POST`): `name`, `domain`, `email` and `timezone` are required. `email` becomes the login of the
company's first admin, so it must not belong to an existing user → otherwise **400** `{"email": ["A user with this
email already exists."]}`. The company and its admin are created together (nothing is saved on error), and the
admin's credentials are emailed only after both are saved.

**Update** (`PUT`/`PATCH`): send `"phone": ""` to clear the phone. On `PATCH`, colours you don't send keep their
stored values (`secondary_color` must still differ from `primary_color`).

**Logo**: send it as `multipart/form-data` — e.g. `PATCH /api/company/v1/admin/company/{id}/` with a `logo` file part
(other fields may go in the same form). It must be a real image (otherwise 400 on `logo`). Responses return
`logo_url` as an absolute URL (`http(s)://<host>/media/company/logos/…`), or `null` without a logo.

**Deactivate** (`DELETE`): returns **204** and sets `is_active` to `false`; no data is deleted and the company stays
in the list. Its users can no longer log in (400, *"Your company account has been deactivated."*) and their
existing tokens get **401** with the same message (and the notifications WebSocket closes with `4001`). `PATCH {"is_active": true}` reactivates it.

**Examples** (real responses from the running API)

<details><summary>Example: list → <code>200</code></summary>

```http
GET /api/company/v1/admin/company/
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Acme Trading",
      "legal_name": "",
      "domain": "acme.example",
      "tax_id": "",
      "is_active": true,
      "email": "info@acme.example",
      "phone": "",
      "address": "",
      "timezone": "Asia/Riyadh",
      "logo_url": null,
      "primary_color": "#000000",
      "secondary_color": "#FFFFFF",
      "created_at": "2026-10-04T00:49:34.257126+03:00",
      "updated_at": "2026-10-04T00:49:34.257162+03:00"
    }
  ],
  "metadata": {
    "timestamp": "2026-10-03T21:50:20.945167Z",
    "version": "1.0",
    "total_count": 24
  }
}
```

</details>

### Company users

Users that belong to the current company, with their role, department and team. Creating one also creates the login user (nested `user` object).

Needs `view_companyuser` / `add_companyuser` / `change_companyuser` / `delete_companyuser` (see [Permissions](#permissions)).
Only users with full access (company admins, admin roles) may:
- set `is_company_admin: true` or assign a role with `is_admin: true` → otherwise **400** on that field;
- change or delete a user who has full access → otherwise **403**.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/company/v1/company-user/` | List |
| `POST` | `/api/company/v1/company-user/` | Create |
| `GET` | `/api/company/v1/company-user/{id}/` | Retrieve |
| `PUT` | `/api/company/v1/company-user/{id}/` | Replace (all required fields) |
| `PATCH` | `/api/company/v1/company-user/{id}/` | Partial update |
| `DELETE` | `/api/company/v1/company-user/{id}/` | Delete |

**Create body** (`POST`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `user` | object | **yes** |  |
| &nbsp;&nbsp;↳ `email` | email | **yes** | max 254 chars |
| &nbsp;&nbsp;↳ `first_name` | string | **yes** | max 100 chars |
| &nbsp;&nbsp;↳ `last_name` | string | **yes** | max 100 chars |
| &nbsp;&nbsp;↳ `preferred_name` | string | no | max 100 chars |
| &nbsp;&nbsp;↳ `phone_number` | string | no | max 128 chars |
| &nbsp;&nbsp;↳ `password` | string | **yes** | max 128 chars |
| `role` | id (Role) | no | nullable |
| `department` | id (Department) | no | nullable |
| `team` | id (Team) | no | nullable |
| `is_company_admin` | boolean | no |  |
| `is_department_manager` | boolean | no |  |
| `is_team_lead` | boolean | no |  |

_Update (`PUT`/`PATCH`) accepts the same fields; with `PATCH` every field is optional._
The nested `user` updates the login user in place: send only what changes (`first_name`, `last_name`,
`preferred_name`, `email`, `phone_number`); re-sending the user's own unchanged email is fine, another user's email
gives 400 `{"user": {"email": [...]}}`. `password` is optional on update (hashed when sent) and never returned.

**Response object** (retrieve)

| Field | Type | Notes |
|---|---|---|
| `id` | integer |  |
| `user` | object | fields: id, email, first_name, last_name, preferred_name, profile_picture, phone_number, timezone |
| `role` | object | fields: id, name_en, name_ar, is_admin, permission_groups |
| `department` | object | fields: id, name_en, name_ar, parent, manager, created_by, updated_by |
| `team` | object | fields: id, name_en, name_ar, department, leads, location, created_by, updated_by |
| `is_company_admin` | boolean |  |
| `is_department_manager` | boolean |  |
| `is_team_lead` | boolean |  |
| `date_joined` | datetime (ISO 8601) |  |
| `last_updated` | datetime (ISO 8601) |  |

> **Create and update return a different shape** with fields: `user`, `role`, `department`, `team`, `is_company_admin`, `is_department_manager`, `is_team_lead` (role/department/team as ids). Re-fetch the detail if you need the full object.

**Examples** (real responses from the running API)

<details><summary>Example: list → <code>200</code></summary>

```http
GET /api/company/v1/company-user/
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "user": {
        "id": 1,
        "email": "admin@acme.example",
        "first_name": "Sara",
        "last_name": "Ali",
        "preferred_name": "",
        "profile_picture": null,
        "phone_number": "",
        "timezone": "Asia/Riyadh"
      },
      "role": null,
      "department": null,
      "team": null,
      "is_company_admin": true,
      "is_department_manager": false,
      "is_team_lead": false,
      "date_joined": "2026-10-04T00:49:35.686270+03:00",
      "last_updated": "2026-10-04T00:49:35.686278+03:00"
    }
  ],
  "metadata": {
    "timestamp": "2026-10-03T21:50:20.786046Z",
    "version": "1.0",
    "total_count": 1
  }
}
```

</details>

<details><summary>Example: Add company user → <code>201</code></summary>

```http
POST /api/company/v1/company-user/
```

Request body:

```json
{
  "user": {
    "email": "omar@acme.example",
    "first_name": "Omar",
    "last_name": "Hassan",
    "password": "Str0ngPass!"
  },
  "role": 3,
  "department": 1,
  "is_company_admin": false
}
```

Response:

```json
{
  "success": true,
  "data": {
    "user": {
      "email": "omar@acme.example",
      "first_name": "Omar",
      "last_name": "Hassan",
      "preferred_name": "",
      "phone_number": "",
      "password": "pbkdf2_sha256$1000000$NdMrAzpx0DbRVbdO6kUnP0$U9Ezg1HnsqHUHFT0HlcX7l3oaTS1qqVb9+CINCktB3I="
    },
    "role": 3,
    "department": 1,
    "team": null,
    "is_company_admin": false,
    "is_department_manager": false,
    "is_team_lead": false
  },
  "metadata": {
    "timestamp": "2026-10-03T21:57:36.582276Z",
    "version": "1.0"
  }
}
```

</details>

### Departments

Company departments.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/company/v1/departments/` | List |
| `POST` | `/api/company/v1/departments/` | Create |
| `GET` | `/api/company/v1/departments/{id}/` | Retrieve |
| `PUT` | `/api/company/v1/departments/{id}/` | Replace (all required fields) |
| `PATCH` | `/api/company/v1/departments/{id}/` | Partial update |
| `DELETE` | `/api/company/v1/departments/{id}/` | Delete (soft delete) |

**List query parameters**

| Query param | Meaning |
|---|---|
| `page`, `page_size` | Pagination (default 10, max 100). Total in `metadata.total_count`. |
| `dropdown=true` | Unpaginated short list with only: `id`, `name_en`, `name_ar` |
| `search` | Text search in: `name_en`, `name_ar` |
| `ordering` | Sort by `id`, `name_en` (prefix `-` for descending) |

**Create body** (`POST`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `name_en` | string | **yes** | max 100 chars |
| `name_ar` | string | no | nullable; max 100 chars |
| `parent` | id (Department) | no | nullable |
| `manager` | id (User) | no | nullable |

_Update (`PUT`/`PATCH`) accepts the same fields; with `PATCH` every field is optional._

**Response object** (retrieve; create/update return the same shape)

| Field | Type | Notes |
|---|---|---|
| `id` | integer |  |
| `name_en` | string |  |
| `name_ar` | string |  |
| `parent` | computed |  |
| `manager` | object | fields: id, email, first_name, last_name, date_joined |
| `created_by` | object | fields: id, email, first_name, last_name, date_joined |
| `updated_by` | object | fields: id, email, first_name, last_name, date_joined |

**Examples** (real responses from the running API)

<details><summary>Example: list → <code>200</code></summary>

```http
GET /api/company/v1/departments/?page_size=2
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name_en": "Department 0",
      "name_ar": null,
      "parent": null,
      "manager": null,
      "created_by": null,
      "updated_by": null
    }
  ],
  "metadata": {
    "timestamp": "2026-10-03T21:50:21.275799Z",
    "version": "1.0",
    "total_count": 6
  }
}
```

</details>

<details><summary>Example: Create department → <code>201</code></summary>

```http
POST /api/company/v1/departments/
```

Request body:

```json
{
  "name_en": "Sales",
  "name_ar": "المبيعات"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name_en": "Sales",
    "name_ar": "المبيعات",
    "parent": null,
    "manager": null,
    "created_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:57:32.752930+03:00",
      "full_name": "Sara Ali"
    },
    "updated_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:57:32.752930+03:00",
      "full_name": "Sara Ali"
    }
  },
  "metadata": {
    "timestamp": "2026-10-03T21:57:35.874205Z",
    "version": "1.0"
  }
}
```

</details>

### Teams

Teams inside a department, attached to a location.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/company/v1/teams/` | List |
| `POST` | `/api/company/v1/teams/` | Create |
| `GET` | `/api/company/v1/teams/{id}/` | Retrieve |
| `PUT` | `/api/company/v1/teams/{id}/` | Replace (all required fields) |
| `PATCH` | `/api/company/v1/teams/{id}/` | Partial update |
| `DELETE` | `/api/company/v1/teams/{id}/` | Delete (soft delete) |

**List query parameters**

| Query param | Meaning |
|---|---|
| `page`, `page_size` | Pagination (default 10, max 100). Total in `metadata.total_count`. |
| `dropdown=true` | Unpaginated short list with only: `id`, `name_en`, `name_ar` |
| `search` | Text search in: `name_en`, `name_ar` |
| `ordering` | Sort by `id`, `name_en` (prefix `-` for descending) |

**Create body** (`POST`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `department` | id (Department) | **yes** |  |
| `name_en` | string | **yes** | max 100 chars |
| `name_ar` | string | no | nullable; max 100 chars |
| `leads` | array of ids (User) | no |  |
| `location` | id (Location) | **yes** |  |

_Update (`PUT`/`PATCH`) accepts the same fields; with `PATCH` every field is optional._

**Response object** (retrieve; create/update return the same shape)

| Field | Type | Notes |
|---|---|---|
| `id` | integer |  |
| `name_en` | string |  |
| `name_ar` | string |  |
| `department` | object | fields: id, name_en, name_ar, parent, manager, created_by, updated_by |
| `leads` | array of objects | fields: id, email, first_name, last_name, date_joined |
| `location` | computed |  |
| `created_by` | object | fields: id, email, first_name, last_name, date_joined |
| `updated_by` | object | fields: id, email, first_name, last_name, date_joined |

**Examples** (real responses from the running API)

<details><summary>Example: list → <code>200</code></summary>

```http
GET /api/company/v1/teams/?page_size=2
```

Response:

```json
{
  "success": true,
  "data": [],
  "metadata": {
    "timestamp": "2026-10-03T21:50:21.303573Z",
    "version": "1.0",
    "total_count": 0
  }
}
```

</details>

<details><summary>Example: Create team → <code>201</code></summary>

```http
POST /api/company/v1/teams/
```

Request body:

```json
{
  "name_en": "B2B Team",
  "department": 1,
  "location": 1
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name_en": "B2B Team",
    "name_ar": null,
    "department": {
      "id": 1,
      "name_en": "Sales",
      "name_ar": "المبيعات",
      "parent": null,
      "manager": null,
      "created_by": {
        "id": 1,
        "email": "admin@acme.example",
        "first_name": "Sara",
        "last_name": "Ali",
        "date_joined": "2026-10-04T00:57:32.752930+03:00",
        "full_name": "Sara Ali"
      },
      "updated_by": {
        "id": 1,
        "email": "admin@acme.example",
        "first_name": "Sara",
        "last_name": "Ali",
        "date_joined": "2026-10-04T00:57:32.752930+03:00",
        "full_name": "Sara Ali"
      }
    },
    "leads": [],
    "location": {
      "id": 1,
      "name": "Head Office (HQ-01)"
    },
    "created_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
  … (truncated)
```

</details>

### Roles

Roles grant permission groups and/or single permissions; assigned to company users.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/company/v1/roles/` | List |
| `POST` | `/api/company/v1/roles/` | Create |
| `GET` | `/api/company/v1/roles/{id}/` | Retrieve |
| `PUT` | `/api/company/v1/roles/{id}/` | Replace (all required fields) |
| `PATCH` | `/api/company/v1/roles/{id}/` | Partial update |
| `DELETE` | `/api/company/v1/roles/{id}/` | Delete (soft delete) |

**List query parameters**

| Query param | Meaning |
|---|---|
| `page`, `page_size` | Pagination (default 10, max 100). Total in `metadata.total_count`. |
| `dropdown=true` | Unpaginated short list with only: `id`, `name_en`, `name_ar` |
| `search` | Text search in: `name_en`, `name_ar` |
| `ordering` | Sort by `id`, `name_en` (prefix `-` for descending) |

**Create body** (`POST`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `name_en` | string | **yes** | max 100 chars |
| `name_ar` | string | no | nullable; max 100 chars |
| `permission_groups` | array of ids (PermissionGroup) | no | groups of your company (core groups included) |
| `permissions` | array of ids (Permission) | no | single permissions on top of the groups; on update the list **replaces** them |
| `is_admin` | boolean | no |  |

_Update (`PUT`/`PATCH`) accepts the same fields; with `PATCH` every field is optional._

**Response object** (retrieve; create/update return the same shape)

| Field | Type | Notes |
|---|---|---|
| `id` | integer |  |
| `name_en` | string |  |
| `name_ar` | string |  |
| `is_admin` | boolean |  |
| `permission_groups` | array of objects | `id`, `name_en` |
| `permissions` | array of objects | single permissions: `id`, `codename`, `name`, `permission_type` |

**Examples** (real responses from the running API)

<details><summary>Example: list → <code>200</code></summary>

```http
GET /api/company/v1/roles/?page_size=2
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name_en": "Administrator",
      "name_ar": null,
      "is_admin": true,
      "permission_groups": [],
      "permissions": []
    }
  ],
  "metadata": {
    "timestamp": "2026-10-03T21:50:21.378243Z",
    "version": "1.0",
    "total_count": 4
  }
}
```

</details>

<details><summary>Example: Create role → <code>201</code></summary>

```http
POST /api/company/v1/roles/
```

Request body:

```json
{
  "name_en": "Sales Manager",
  "permission_groups": [
    1
  ],
  "permissions": [
    40
  ]
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 3,
    "name_en": "Sales Manager",
    "name_ar": null,
    "is_admin": false,
    "permission_groups": [
      {
        "id": 1,
        "name_en": "Group 0"
      }
    ],
    "permissions": [
      { "id": 40, "codename": "add_salesorder", "name": "Add sales orders", "permission_type": "API" }
    ]
  },
  "metadata": {
    "timestamp": "2026-10-03T21:57:35.902123Z",
    "version": "1.0"
  }
}
```

</details>

### Permission groups

Named sets of permissions. Core groups (`is_core: true`) are created by the system and are read-only
(see [Permissions](#permissions)).

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/company/v1/permission-groups/` | List |
| `POST` | `/api/company/v1/permission-groups/` | Create |
| `GET` | `/api/company/v1/permission-groups/{id}/` | Retrieve |
| `PUT` | `/api/company/v1/permission-groups/{id}/` | Replace (all required fields) |
| `PATCH` | `/api/company/v1/permission-groups/{id}/` | Partial update |
| `DELETE` | `/api/company/v1/permission-groups/{id}/` | Delete (soft delete) |

**List query parameters**

| Query param | Meaning |
|---|---|
| `page`, `page_size` | Pagination (default 10, max 100). Total in `metadata.total_count`. |
| `dropdown=true` | Unpaginated short list with only: `id`, `name_en`, `name_ar`, `is_core` |
| `search` | Text search in: `name_en`, `name_ar` |
| `ordering` | Sort by `id`, `name_en` (prefix `-` for descending) |

**Create body** (`POST`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `name_en` | string | **yes** | max 100 chars |
| `name_ar` | string | no | nullable; max 100 chars |
| `description` | string | no |  |
| `permissions` | array of ids (Permission) | no | permissions of your company; on update the list **replaces** the group's permissions |

_Update (`PUT`/`PATCH`) accepts the same fields; with `PATCH` every field is optional. `is_core` is read-only.
Updating or deleting a core group returns **403**._

```json
PATCH /api/company/v1/permission-groups/12/
{ "permissions": [1, 2, 3] }
```

**Response object** (retrieve; create/update return the same shape)

| Field | Type | Notes |
|---|---|---|
| `id` | integer |  |
| `name_en` | string |  |
| `name_ar` | string |  |
| `description` | string |  |
| `is_core` | boolean | system group, read-only |
| `permissions` | array of objects | `id`, `codename`, `name`, `permission_type` |
| `created_by` | object | fields: id, email, first_name, last_name, date_joined |
| `updated_by` | object | fields: id, email, first_name, last_name, date_joined |

**Examples** (real responses from the running API)

<details><summary>Example: list → <code>200</code></summary>

```http
GET /api/company/v1/permission-groups/?page_size=2
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name_en": "Group 0",
      "name_ar": null,
      "description": "",
      "is_core": false,
      "permissions": [],
      "created_by": null,
      "updated_by": null
    }
  ],
  "metadata": {
    "timestamp": "2026-10-03T21:50:21.315428Z",
    "version": "1.0",
    "total_count": 2
  }
}
```

</details>

<details><summary>Example: create → <code>201</code></summary>

```http
POST /api/company/v1/permission-groups/
```

Request body:

```json
{
  "name_en": "Group 1-N",
  "description": "",
  "permissions": [1, 2]
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 3,
    "name_en": "Group 1-N",
    "name_ar": null,
    "description": "",
    "is_core": false,
    "permissions": [
      { "id": 1, "codename": "view_department", "name": "View departments", "permission_type": "API" },
      { "id": 2, "codename": "add_department", "name": "Add departments", "permission_type": "API" }
    ],
    "created_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:49:34.976387+03:00",
      "full_name": "Sara Ali"
    },
    "updated_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:49:34.976387+03:00",
      "full_name": "Sara Ali"
    }
  },
  "metadata": {
    "timestamp": "2026-10-03T21:50:21.321207Z",
    "version": "1.0"
  }
}
```

</details>

### Permissions

Individual permissions.

**System permission catalog.** Every company gets these permissions and the core permission groups below
automatically (new companies on creation; existing ones through a migration or
`python manage.py seed_permissions`). CRUD codenames follow `<action>_<resource>` with action
`view` / `add` / `change` / `delete`; each module also has a **feature permission** `access_<module>`
(`permission_type: "FEATURE"`, the others are `"API"`).

| Module (feature permission) | Resource | Actions |
|---|---|---|
| Company (`access_company`) | `company` (company profile) | view, change |
|  | `department` (departments) | view, add, change, delete |
|  | `team` (teams) | view, add, change, delete |
|  | `role` (roles) | view, add, change, delete |
|  | `permissiongroup` (permission groups) | view, add, change, delete |
|  | `permission` (permissions) | view, add, change, delete |
|  | `companyuser` (company users) | view, add, change, delete |
| Locations (`access_location`) | `country` (countries) | view, add, change, delete |
|  | `region` (regions) | view, add, change, delete |
|  | `city` (cities) | view, add, change, delete |
|  | `district` (districts) | view, add, change, delete |
|  | `location` (locations) | view, add, change, delete |
| Inventory (`access_inventory`) | `category` (categories) | view, add, change, delete |
|  | `brand` (brands) | view, add, change, delete |
|  | `product` (products) | view, add, change, delete |
|  | `productattribute` (product attributes) | view, add, change, delete |
|  | `productattributevalue` (product attribute values) | view, add, change, delete |
|  | `productvariant` (product variants) | view, add, change, delete |
|  | `productbom` (bills of materials) | view, add, change, delete |
|  | `warehouse` (warehouses) | view, add, change, delete |
|  | `zone` (zones) | view, add, change, delete |
|  | `bin` (bins) | view, add, change, delete |
|  | `batch` (batches) | view, add, change, delete |
|  | `serialnumber` (serial numbers) | view, add, change, delete |
|  | `stockledger` (stock ledger) | view |
|  | `stocksnapshot` (stock snapshots) | view |
|  | `stockreservation` (stock reservations) | view, add, change, delete |
|  | `stockalert` (stock alerts) | view, add, change, delete |
|  | `stocktransfer` (stock transfers) | view, add, change, delete |
|  | `stockadjustment` (stock adjustments) | view, add, change, delete |
|  | `cyclecount` (cycle counts) | view, add, change, delete |
|  | `supplier` (suppliers) | view, add, change, delete |
|  | `supplierproduct` (supplier products) | view, add, change, delete |
|  | `purchaserequisition` (purchase requisitions) | view, add, change, delete |
|  | `purchaseorder` (purchase orders) | view, add, change, delete |
|  | `goodsreceipt` (goods receipts) | view, add, change, delete |
|  | `supplierinvoice` (supplier invoices) | view, add, change, delete |
|  | `approvalworkflow` (approval workflows) | view, add, change, delete |
|  | `approvalrequest` (approval requests) | view, add, change, delete |
|  | `reorderpolicy` (reorder policies) | view, add, change, delete |
|  | `reordersuggestion` (reorder suggestions) | view, add, change, delete |
|  | `demandforecast` (demand forecasts) | view, add, change, delete |
| Quality (`access_quality`) | `qualityinspection` (quality inspections) | view, add, change, delete |
|  | `nonconformancereport` (non-conformance reports) | view, add, change, delete |
|  | `quarantinerecord` (quarantine records) | view, add, change, delete |
| Assembly (`access_assembly`) | `workorder` (work orders) | view, add, change, delete |
| Sales (`access_sales`) | `customer` (customers) | view, add, change, delete |
|  | `salesorder` (sales orders) | view, add, change, delete |
|  | `deliverynote` (delivery notes) | view, add, change, delete |
|  | `salesinvoice` (sales invoices) | view, add, change, delete |
|  | `invoicepayment` (invoice payments) | view, add, change, delete |
|  | `salesaudittrail` (sales audit trail) | view |
| Returns (`access_returns`) | `customerreturn` (customer returns) | view, add, change, delete |
|  | `supplierreturn` (supplier returns) | view, add, change, delete |
| Accounting (`access_accounting`) | `account` (accounts) | view, add, change, delete |
|  | `journalentry` (journal entries) | view, add, change, delete |
|  | `fiscalyear` (fiscal years) | view, add, change, delete |
|  | `fiscalperiod` (fiscal periods) | view, add, change, delete |
|  | `supplierpayment` (supplier payments) | view, add, change, delete |
|  | `debitnote` (debit notes) | view, add, change, delete |
|  | `accountingreport` (accounting reports) | view |
| Reports (`access_reports`) | `report` (reports) | view |
|  | `dashboard` (dashboards) | view |
|  | `savedreport` (saved reports) | view, add, change, delete |
|  | `reportschedule` (report schedules) | view, add, change, delete |
| Integrations (`access_integrations`) | `webhook` (webhooks) | view, add, change, delete |

Document lines and workflow parts use their parent's codenames:
`stocktransferline` → `stocktransfer`, `stockadjustmentline` → `stockadjustment`, `cyclecountline` → `cyclecount`, `purchaserequisitionline` → `purchaserequisition`, `purchaseorderline` → `purchaseorder`, `goodsreceiptline` → `goodsreceipt`, `salesorderline` → `salesorder`, `deliverynoteline` → `deliverynote`, `salesinvoiceline` → `salesinvoice`, `customerreturnline` → `customerreturn`, `supplierreturnline` → `supplierreturn`, `approvalstage` → `approvalworkflow`, `approvalaction` → `approvalrequest`, `webhookendpoint` → `webhook`, `webhookdelivery` → `webhook`.

**Core permission groups.** Created for every company with `is_core: true`, kept in sync with the catalog,
and read-only through the API (`PATCH`/`PUT`/`DELETE` return **403**). Assign them to roles as they are,
or create your own group with the permission ids you need.

| Group (`name_en`) | `name_ar` | Grants | Permissions |
|---|---|---|---|
| Full Access | صلاحيات كاملة | Every permission in every module. | 254 |
| Read Only | قراءة فقط | View everything in every module, change nothing. | 76 |
| Company - Full Access | الشركة - صلاحيات كاملة | Every permission in the Company module. | 27 |
| Company - Read Only | الشركة - قراءة فقط | View everything in the Company module. | 8 |
| Locations - Full Access | المواقع - صلاحيات كاملة | Every permission in the Locations module. | 21 |
| Locations - Read Only | المواقع - قراءة فقط | View everything in the Locations module. | 6 |
| Inventory - Full Access | المخزون - صلاحيات كاملة | Every permission in the Inventory module. | 115 |
| Inventory - Read Only | المخزون - قراءة فقط | View everything in the Inventory module. | 31 |
| Quality - Full Access | الجودة - صلاحيات كاملة | Every permission in the Quality module. | 13 |
| Quality - Read Only | الجودة - قراءة فقط | View everything in the Quality module. | 4 |
| Assembly - Full Access | التجميع - صلاحيات كاملة | Every permission in the Assembly module. | 5 |
| Assembly - Read Only | التجميع - قراءة فقط | View everything in the Assembly module. | 2 |
| Sales - Full Access | المبيعات - صلاحيات كاملة | Every permission in the Sales module. | 22 |
| Sales - Read Only | المبيعات - قراءة فقط | View everything in the Sales module. | 7 |
| Returns - Full Access | المرتجعات - صلاحيات كاملة | Every permission in the Returns module. | 9 |
| Returns - Read Only | المرتجعات - قراءة فقط | View everything in the Returns module. | 3 |
| Accounting - Full Access | المحاسبة - صلاحيات كاملة | Every permission in the Accounting module. | 26 |
| Accounting - Read Only | المحاسبة - قراءة فقط | View everything in the Accounting module. | 8 |
| Reports - Full Access | التقارير - صلاحيات كاملة | Every permission in the Reports module. | 11 |
| Reports - Read Only | التقارير - قراءة فقط | View everything in the Reports module. | 5 |
| Integrations - Full Access | التكاملات - صلاحيات كاملة | Every permission in the Integrations module. | 5 |
| Integrations - Read Only | التكاملات - قراءة فقط | View everything in the Integrations module. | 2 |

**Who holds what.** A user's permissions are the union of the permissions in their role's (non-deleted)
permission groups and the single permissions granted to the role directly (`permissions` on the role).
Company admins (`is_company_admin`), users whose role has `is_admin=true`, and superusers hold every permission.
Catalog (system) permissions cannot be changed or deleted (**403**); companies may add their own codenames,
which are returned to the frontend but not enforced by the API.

**Enforcement.** Every company endpoint (all of `/api/company/v1/` except `me/…`, `/api/inventory/v1/`,
`/api/sales/v1/`, `/api/returns/v1/`, `/api/quality/v1/`, `/api/assembly/v1/`, `/api/accounting/v1/`,
`/api/reports/v1/` and `/api/integrations/v1/`) needs **both** the module's `access_<module>` permission
**and** the codename for the request:

- `GET` → `view_`, `POST` → `add_`, `PUT`/`PATCH` → `change_`, `DELETE` → `delete_`
- a `POST` to an action on one record (`/sales-orders/{id}/confirm/`, `/purchase-order/{id}/action/`,
  `/reorder-policy/{id}/recalculate/`, …) → `change_`
- imports (`…/import/`) → `add_`, exports (`…/export/`) → `view_`

A missing permission returns **403** (`"You do not have access to the sales module."` when the module permission
is missing). Exception: `GET …?dropdown=true` only needs the user to belong to a company, so forms can fill their
select boxes. Users without a company get 403. The subscription-module check (see
[Subscription modules](#subscription-modules)) still applies on top.
Not permission-checked: login/refresh, `me/…`, notifications, background tasks and downloads, and platform billing.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/company/v1/permissions/` | List |
| `POST` | `/api/company/v1/permissions/` | Create |
| `GET` | `/api/company/v1/permissions/{id}/` | Retrieve |
| `PUT` | `/api/company/v1/permissions/{id}/` | Replace (all required fields) |
| `PATCH` | `/api/company/v1/permissions/{id}/` | Partial update |
| `DELETE` | `/api/company/v1/permissions/{id}/` | Delete (soft delete) |

**List query parameters**

| Query param | Meaning |
|---|---|
| `page`, `page_size` | Pagination (default 10, max 100). Total in `metadata.total_count`. |
| `dropdown=true` | Unpaginated short list with only: `id`, `name`, `codename` |
| `search` | Text search in: `name`, `codename` |
| `ordering` | Sort by `id`, `codename`, `name` (prefix `-` for descending); default `codename` |

**Create body** (`POST`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `codename` | string | **yes** | max 100 chars |
| `name` | string | **yes** | max 255 chars |
| `description` | string | no |  |
| `permission_type` | enum | no | one of: `API`, `OBJECT`, `FEATURE` |
| `groups` | array of ids (PermissionGroup) | no |  |

_Update (`PUT`/`PATCH`) accepts the same fields; with `PATCH` every field is optional._

**Response object** (retrieve; create/update return the same shape)

| Field | Type | Notes |
|---|---|---|
| `id` | integer |  |
| `codename` | string |  |
| `name` | string |  |
| `description` | string |  |
| `permission_type` | string |  |
| `groups` | computed |  |
| `created_by` | object | fields: id, email, first_name, last_name, date_joined |
| `updated_by` | object | fields: id, email, first_name, last_name, date_joined |

**Examples** (real responses from the running API)

<details><summary>Example: list → <code>200</code></summary>

```http
GET /api/company/v1/permissions/?page_size=2
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "codename": "perm_0",
      "name": "Permission 0",
      "description": "",
      "permission_type": "API",
      "groups": [],
      "created_by": null,
      "updated_by": null
    }
  ],
  "metadata": {
    "timestamp": "2026-10-03T21:50:21.342582Z",
    "version": "1.0",
    "total_count": 2
  }
}
```

</details>

<details><summary>Example: create → <code>201</code></summary>

```http
POST /api/company/v1/permissions/
```

Request body:

```json
{
  "codename": "perm_1",
  "name": "Permission 1-N",
  "description": "",
  "permission_type": "API",
  "groups": []
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 3,
    "codename": "perm_1",
    "name": "Permission 1-N",
    "description": "",
    "permission_type": "API",
    "groups": [],
    "created_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:49:34.976387+03:00",
      "full_name": "Sara Ali"
    },
    "updated_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:49:34.976387+03:00",
      "full_name": "Sara Ali"
    }
  },
  "metadata": {
    "timestamp": "2026-10-03T21:50:21.351922Z",
    "version": "1.0"
  }
}
```

</details>

---

## Locations

Geographic hierarchy: Country → Region → City → District → Location. Requires the `location` subscription module.

`DELETE` (soft delete) is refused with **400** while other live records still use the row, e.g.
`{"error": {"message": "Cannot delete: still used by 2 regions, 1 Location."}}` (countries used by regions or
locations, regions by cities/locations, cities by districts/locations, districts by locations, locations by
teams or warehouses). Delete or move those first.

### Countries

**Access:** subscription module `location`.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/company/v1/country/` | List |
| `POST` | `/api/company/v1/country/` | Create |
| `GET` | `/api/company/v1/country/{id}/` | Retrieve |
| `PUT` | `/api/company/v1/country/{id}/` | Replace (all required fields) |
| `PATCH` | `/api/company/v1/country/{id}/` | Partial update |
| `DELETE` | `/api/company/v1/country/{id}/` | Delete (soft delete) |

**List query parameters**

| Query param | Meaning |
|---|---|
| `page`, `page_size` | Pagination (default 10, max 100). Total in `metadata.total_count`. |
| `dropdown=true` | Unpaginated short list with only: `id`, `name_en`, `name_ar` |
| `search` | Text search in: `name_en`, `name_ar` |
| `ordering` | Sort by `id`, `name_en` (prefix `-` for descending) |

**Create body** (`POST`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `name_en` | string | **yes** | max 100 chars |
| `name_ar` | string | no | nullable; max 100 chars |
| `iso_code` | string | **yes** | max 2 chars |
| `phone_code` | string | **yes** | max 5 chars |
| `is_active` | boolean | no |  |

_Update (`PUT`/`PATCH`) accepts the same fields; with `PATCH` every field is optional._

**Response object** (retrieve; create/update return the same shape)

| Field | Type | Notes |
|---|---|---|
| `id` | integer |  |
| `created_at` | datetime (ISO 8601) |  |
| `updated_at` | datetime (ISO 8601) |  |
| `created_by` | object | fields: id, email, first_name, last_name, date_joined |
| `updated_by` | object | fields: id, email, first_name, last_name, date_joined |
| `name_en` | string |  |
| `name_ar` | string |  |
| `iso_code` | string |  |
| `phone_code` | string |  |
| `is_active` | boolean |  |

**Examples** (real responses from the running API)

<details><summary>Example: list → <code>200</code></summary>

```http
GET /api/company/v1/country/?page_size=2
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": 8,
      "created_at": "2026-10-04T00:49:35.972363+03:00",
      "updated_at": "2026-10-04T00:49:35.972380+03:00",
      "created_by": null,
      "updated_by": null,
      "name_en": "Afghanistan",
      "name_ar": "دولة",
      "iso_code": "07",
      "phone_code": "+1",
      "is_active": true
    }
  ],
  "metadata": {
    "timestamp": "2026-10-03T21:50:21.018829Z",
    "version": "1.0",
    "total_count": 4
  }
}
```

</details>

<details><summary>Example: Create country → <code>201</code></summary>

```http
POST /api/company/v1/country/
```

Request body:

```json
{
  "name_en": "Egypt",
  "name_ar": "مصر",
  "iso_code": "EG",
  "phone_code": "+20"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "created_at": "2026-10-04T00:57:35.730075+03:00",
    "updated_at": "2026-10-04T00:57:35.730228+03:00",
    "created_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:57:32.752930+03:00",
      "full_name": "Sara Ali"
    },
    "updated_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:57:32.752930+03:00",
      "full_name": "Sara Ali"
    },
    "name_en": "Egypt",
    "name_ar": "مصر",
    "iso_code": "EG",
    "phone_code": "+20",
    "is_active": true
  },
  "metadata": {
    "timestamp": "2026-10-03T21:57:35.732328Z",
    "version": "1.0"
  }
}
```

</details>

### Regions

`code` must be 2–3 uppercase letters.

**Access:** subscription module `location`.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/company/v1/region/` | List |
| `POST` | `/api/company/v1/region/` | Create |
| `GET` | `/api/company/v1/region/{id}/` | Retrieve |
| `PUT` | `/api/company/v1/region/{id}/` | Replace (all required fields) |
| `PATCH` | `/api/company/v1/region/{id}/` | Partial update |
| `DELETE` | `/api/company/v1/region/{id}/` | Delete (soft delete) |

**List query parameters**

| Query param | Meaning |
|---|---|
| `page`, `page_size` | Pagination (default 10, max 100). Total in `metadata.total_count`. |
| `dropdown=true` | Unpaginated short list with only: `id`, `name_en`, `name_ar` |
| `search` | Text search in: `name_en`, `name_ar` |
| `ordering` | Sort by `id`, `name_en` (prefix `-` for descending) |

**Create body** (`POST`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `name_en` | string | **yes** | max 100 chars |
| `name_ar` | string | no | nullable; max 100 chars |
| `code` | string | no | max 10 chars |
| `country` | id (Country) | **yes** |  |

_Update (`PUT`/`PATCH`) accepts the same fields; with `PATCH` every field is optional._

**Response object** (retrieve; create/update return the same shape)

| Field | Type | Notes |
|---|---|---|
| `id` | integer |  |
| `created_at` | datetime (ISO 8601) |  |
| `updated_at` | datetime (ISO 8601) |  |
| `created_by` | object | fields: id, email, first_name, last_name, date_joined |
| `updated_by` | object | fields: id, email, first_name, last_name, date_joined |
| `name_en` | string |  |
| `name_ar` | string |  |
| `code` | string |  |
| `country` | object | fields: id, created_at, updated_at, created_by, updated_by, name_en, name_ar, iso_code, phone_code, is_active |
| `country_name` | string |  |
| `country_iso` | string |  |

**Examples** (real responses from the running API)

<details><summary>Example: list → <code>200</code></summary>

```http
GET /api/company/v1/region/?page_size=2
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": 6,
      "created_at": "2026-10-04T00:49:35.972921+03:00",
      "updated_at": "2026-10-04T00:49:35.972937+03:00",
      "created_by": null,
      "updated_by": null,
      "name_en": "Utah",
      "name_ar": "منطقة",
      "code": "REG5",
      "country": {
        "id": 8,
        "created_at": "2026-10-04T00:49:35.972363+03:00",
        "updated_at": "2026-10-04T00:49:35.972380+03:00",
        "created_by": null,
        "updated_by": null,
        "name_en": "Afghanistan",
        "name_ar": "دولة",
        "iso_code": "07",
        "phone_code": "+1",
        "is_active": true
      },
      "country_name": "Afghanistan",
      "country_iso": "07"
    }
  ],
  "metadata": {
    "timestamp": "2026-10-03T21:50:21.053880Z",
    "version": "1.0",
    "total_count": 4
  }
}
```

</details>

<details><summary>Example: Create region → <code>201</code></summary>

```http
POST /api/company/v1/region/
```

Request body:

```json
{
  "name_en": "Cairo Governorate",
  "name_ar": "القاهرة",
  "country": 1,
  "code": "CAI"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "created_at": "2026-10-04T00:57:35.741646+03:00",
    "updated_at": "2026-10-04T00:57:35.741695+03:00",
    "created_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:57:32.752930+03:00",
      "full_name": "Sara Ali"
    },
    "updated_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:57:32.752930+03:00",
      "full_name": "Sara Ali"
    },
    "name_en": "Cairo Governorate",
    "name_ar": "القاهرة",
    "code": "CAI",
    "country": {
      "id": 1,
      "created_at": "2026-10-04T00:57:35.730075+03:00",
      "updated_at": "2026-10-04T00:57:35.730228+03:00",
      "created_by": {
        "id": 1,
        "email": "admin@acme.example",
        "first_name": "Sara",
        "last_name": "Ali",
        "date_joined": "2026-10-04T00:57:32.752930+03:00",
        "full_name": "Sara Ali"
      },
      "updated_by": {
  … (truncated)
```

</details>

### Cities

`timezone` accepts any IANA name (e.g. `Asia/Riyadh`, `Africa/Cairo`); default `Asia/Riyadh`.

**Access:** subscription module `location`.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/company/v1/city/` | List |
| `POST` | `/api/company/v1/city/` | Create |
| `GET` | `/api/company/v1/city/{id}/` | Retrieve |
| `PUT` | `/api/company/v1/city/{id}/` | Replace (all required fields) |
| `PATCH` | `/api/company/v1/city/{id}/` | Partial update |
| `DELETE` | `/api/company/v1/city/{id}/` | Delete (soft delete) |

**List query parameters**

| Query param | Meaning |
|---|---|
| `page`, `page_size` | Pagination (default 10, max 100). Total in `metadata.total_count`. |
| `dropdown=true` | Unpaginated short list with only: `id`, `name_en`, `name_ar` |
| `search` | Text search in: `name_en`, `name_ar` |
| `ordering` | Sort by `id`, `name_en` (prefix `-` for descending) |

**Create body** (`POST`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `name_en` | string | **yes** | max 100 chars |
| `name_ar` | string | no | nullable; max 100 chars |
| `timezone` | enum | no | one of: `UTC`, `GMT`; default `UTC` |
| `region` | id (Region) | **yes** |  |

_Update (`PUT`/`PATCH`) accepts the same fields; with `PATCH` every field is optional._

**Response object** (retrieve; create/update return the same shape)

| Field | Type | Notes |
|---|---|---|
| `id` | integer |  |
| `created_at` | datetime (ISO 8601) |  |
| `updated_at` | datetime (ISO 8601) |  |
| `created_by` | object | fields: id, email, first_name, last_name, date_joined |
| `updated_by` | object | fields: id, email, first_name, last_name, date_joined |
| `name_en` | string |  |
| `name_ar` | string |  |
| `timezone` | string |  |
| `region` | object | fields: id, created_at, updated_at, created_by, updated_by, name_en, name_ar, code, country, country_name, country_iso |
| `region_name` | string |  |
| `country_name` | string |  |

**Examples** (real responses from the running API)

<details><summary>Example: list → <code>200</code></summary>

```http
GET /api/company/v1/city/?page_size=2
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": 6,
      "created_at": "2026-10-04T00:49:35.973596+03:00",
      "updated_at": "2026-10-04T00:49:35.973614+03:00",
      "created_by": null,
      "updated_by": null,
      "name_en": "Lake Gregory",
      "name_ar": "مدينة",
      "timezone": "Asia/Riyadh",
      "region": {
        "id": 6,
        "created_at": "2026-10-04T00:49:35.972921+03:00",
        "updated_at": "2026-10-04T00:49:35.972937+03:00",
        "created_by": null,
        "updated_by": null,
        "name_en": "Utah",
        "name_ar": "منطقة",
        "code": "REG5",
        "country": {
          "id": 8,
          "created_at": "2026-10-04T00:49:35.972363+03:00",
          "updated_at": "2026-10-04T00:49:35.972380+03:00",
          "created_by": null,
          "updated_by": null,
          "name_en": "Afghanistan",
          "name_ar": "دولة",
          "iso_code": "07",
          "phone_code": "+1",
          "is_active": true
        },
        "country_name": "Afghanistan",
        "country_iso": "07"
      },
      "region_name": "Utah",
      "country_name": "Afghanistan"
  … (truncated)
```

</details>

<details><summary>Example: Create city → <code>201</code></summary>

```http
POST /api/company/v1/city/
```

Request body:

```json
{
  "name_en": "Cairo",
  "name_ar": "القاهرة",
  "region": 1,
  "timezone": "UTC"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "created_at": "2026-10-04T00:57:35.757388+03:00",
    "updated_at": "2026-10-04T00:57:35.757441+03:00",
    "created_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:57:32.752930+03:00",
      "full_name": "Sara Ali"
    },
    "updated_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:57:32.752930+03:00",
      "full_name": "Sara Ali"
    },
    "name_en": "Cairo",
    "name_ar": "القاهرة",
    "timezone": "UTC",
    "region": {
      "id": 1,
      "created_at": "2026-10-04T00:57:35.741646+03:00",
      "updated_at": "2026-10-04T00:57:35.741695+03:00",
      "created_by": {
        "id": 1,
        "email": "admin@acme.example",
        "first_name": "Sara",
        "last_name": "Ali",
        "date_joined": "2026-10-04T00:57:32.752930+03:00",
        "full_name": "Sara Ali"
      },
      "updated_by": {
  … (truncated)
```

</details>

### Districts

**Access:** subscription module `location`.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/company/v1/district/` | List |
| `POST` | `/api/company/v1/district/` | Create |
| `GET` | `/api/company/v1/district/{id}/` | Retrieve |
| `PUT` | `/api/company/v1/district/{id}/` | Replace (all required fields) |
| `PATCH` | `/api/company/v1/district/{id}/` | Partial update |
| `DELETE` | `/api/company/v1/district/{id}/` | Delete (soft delete) |

**List query parameters**

| Query param | Meaning |
|---|---|
| `page`, `page_size` | Pagination (default 10, max 100). Total in `metadata.total_count`. |
| `dropdown=true` | Unpaginated short list with only: `id`, `name_en`, `name_ar` |
| `search` | Text search in: `name_en`, `name_ar` |
| `ordering` | Sort by `id`, `name_en` (prefix `-` for descending) |

**Create body** (`POST`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `name_en` | string | **yes** | max 100 chars |
| `name_ar` | string | no | nullable; max 100 chars |
| `postal_code_prefix` | string | no | nullable; max 10 chars |
| `city` | id (City) | **yes** |  |

_Update (`PUT`/`PATCH`) accepts the same fields; with `PATCH` every field is optional._

**Response object** (retrieve; create/update return the same shape)

| Field | Type | Notes |
|---|---|---|
| `id` | integer |  |
| `created_at` | datetime (ISO 8601) |  |
| `updated_at` | datetime (ISO 8601) |  |
| `created_by` | object | fields: id, email, first_name, last_name, date_joined |
| `updated_by` | object | fields: id, email, first_name, last_name, date_joined |
| `name_en` | string |  |
| `name_ar` | string |  |
| `postal_code_prefix` | string |  |
| `city` | object | fields: id, created_at, updated_at, created_by, updated_by, name_en, name_ar, timezone, region, region_name, country_name |
| `city_name` | string |  |
| `region_name` | string |  |

**Examples** (real responses from the running API)

<details><summary>Example: list → <code>200</code></summary>

```http
GET /api/company/v1/district/?page_size=2
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": 4,
      "created_at": "2026-10-04T00:49:35.974099+03:00",
      "updated_at": "2026-10-04T00:49:35.974115+03:00",
      "created_by": null,
      "updated_by": null,
      "name_en": "District 3",
      "name_ar": "حي",
      "postal_code_prefix": null,
      "city": {
        "id": 6,
        "created_at": "2026-10-04T00:49:35.973596+03:00",
        "updated_at": "2026-10-04T00:49:35.973614+03:00",
        "created_by": null,
        "updated_by": null,
        "name_en": "Lake Gregory",
        "name_ar": "مدينة",
        "timezone": "Asia/Riyadh",
        "region": {
          "id": 6,
          "created_at": "2026-10-04T00:49:35.972921+03:00",
          "updated_at": "2026-10-04T00:49:35.972937+03:00",
          "created_by": null,
          "updated_by": null,
          "name_en": "Utah",
          "name_ar": "منطقة",
          "code": "REG5",
          "country": {
            "id": 8,
            "created_at": "2026-10-04T00:49:35.972363+03:00",
            "updated_at": "2026-10-04T00:49:35.972380+03:00",
            "created_by": null,
            "updated_by": null,
            "name_en": "Afghanistan",
            "name_ar": "دولة",
  … (truncated)
```

</details>

<details><summary>Example: Create district → <code>201</code></summary>

```http
POST /api/company/v1/district/
```

Request body:

```json
{
  "name_en": "Nasr City",
  "city": 1
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "created_at": "2026-10-04T00:57:35.775629+03:00",
    "updated_at": "2026-10-04T00:57:35.775678+03:00",
    "created_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:57:32.752930+03:00",
      "full_name": "Sara Ali"
    },
    "updated_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:57:32.752930+03:00",
      "full_name": "Sara Ali"
    },
    "name_en": "Nasr City",
    "name_ar": null,
    "postal_code_prefix": null,
    "city": {
      "id": 1,
      "created_at": "2026-10-04T00:57:35.757388+03:00",
      "updated_at": "2026-10-04T00:57:35.757441+03:00",
      "created_by": {
        "id": 1,
        "email": "admin@acme.example",
        "first_name": "Sara",
        "last_name": "Ali",
        "date_joined": "2026-10-04T00:57:32.752930+03:00",
        "full_name": "Sara Ali"
      },
      "updated_by": {
  … (truncated)
```

</details>

### Locations

A physical address used by teams and warehouses. `region` must belong to `country`.

**Access:** subscription module `location`.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/company/v1/location/` | List |
| `POST` | `/api/company/v1/location/` | Create |
| `GET` | `/api/company/v1/location/{id}/` | Retrieve |
| `PUT` | `/api/company/v1/location/{id}/` | Replace (all required fields) |
| `PATCH` | `/api/company/v1/location/{id}/` | Partial update |
| `DELETE` | `/api/company/v1/location/{id}/` | Delete (soft delete) |

**List query parameters**

| Query param | Meaning |
|---|---|
| `page`, `page_size` | Pagination (default 10, max 100). Total in `metadata.total_count`. |
| `dropdown=true` | Unpaginated short list with only: `id`, `name_en`, `name_ar` |
| `search` | Text search in: `name_en`, `name_ar` |
| `ordering` | Sort by `id`, `name_en` (prefix `-` for descending) |

**Create body** (`POST`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `name_en` | string | **yes** | max 100 chars |
| `name_ar` | string | no | nullable; max 100 chars |
| `code` | string | no | nullable; max 10 chars |
| `country` | id (Country) | **yes** |  |
| `region` | id (Region) | **yes** |  |
| `city` | id (City) | **yes** |  |
| `district` | id (District) | no | nullable |
| `address_line1` | string | **yes** | max 200 chars |
| `address_line2` | string | no | max 200 chars |
| `postal_code` | string | no | nullable; max 20 chars |
| `is_active` | boolean | no |  |
| `location_type` | enum | no | one of: `office`, `warehouse`, `retail`, `factory`, `remote` |

_Update (`PUT`/`PATCH`) accepts the same fields; with `PATCH` every field is optional._

**Response object** (retrieve; create/update return the same shape)

| Field | Type | Notes |
|---|---|---|
| `id` | integer |  |
| `created_at` | datetime (ISO 8601) |  |
| `updated_at` | datetime (ISO 8601) |  |
| `created_by` | object | fields: id, email, first_name, last_name, date_joined |
| `updated_by` | object | fields: id, email, first_name, last_name, date_joined |
| `name_en` | string |  |
| `name_ar` | string |  |
| `code` | string |  |
| `country` | object | fields: id, created_at, updated_at, created_by, updated_by, name_en, name_ar, iso_code, phone_code, is_active |
| `region` | object | fields: id, created_at, updated_at, created_by, updated_by, name_en, name_ar, code, country, country_name, country_iso |
| `city` | object | fields: id, created_at, updated_at, created_by, updated_by, name_en, name_ar, timezone, region, region_name, country_name |
| `district` | object | fields: id, created_at, updated_at, created_by, updated_by, name_en, name_ar, postal_code_prefix, city, city_name, region_name |
| `address_line1` | string |  |
| `address_line2` | string |  |
| `postal_code` | string |  |
| `is_active` | boolean |  |
| `location_type` | string |  |
| `full_address` | string | e.g. `"12 King Fahd Rd, Riyadh, Riyadh Region, Olaya, Saudi Arabia"` (line 1, line 2, city, region, district, country) |

**Examples** (real responses from the running API)

<details><summary>Example: list → <code>200</code></summary>

```http
GET /api/company/v1/location/?page_size=2
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": 2,
      "created_at": "2026-10-04T00:49:35.974879+03:00",
      "updated_at": "2026-10-04T00:49:35.974896+03:00",
      "created_by": null,
      "updated_by": null,
      "name_en": "Location 1",
      "name_ar": null,
      "code": "LOC-1",
      "country": {
        "id": 8,
        "created_at": "2026-10-04T00:49:35.972363+03:00",
        "updated_at": "2026-10-04T00:49:35.972380+03:00",
        "created_by": null,
        "updated_by": null,
        "name_en": "Afghanistan",
        "name_ar": "دولة",
        "iso_code": "07",
        "phone_code": "+1",
        "is_active": true
      },
      "region": {
        "id": 6,
        "created_at": "2026-10-04T00:49:35.972921+03:00",
        "updated_at": "2026-10-04T00:49:35.972937+03:00",
        "created_by": null,
        "updated_by": null,
        "name_en": "Utah",
        "name_ar": "منطقة",
        "code": "REG5",
        "country": {
          "id": 8,
          "created_at": "2026-10-04T00:49:35.972363+03:00",
          "updated_at": "2026-10-04T00:49:35.972380+03:00",
          "created_by": null,
  … (truncated)
```

</details>

<details><summary>Example: Create location → <code>201</code></summary>

```http
POST /api/company/v1/location/
```

Request body:

```json
{
  "name_en": "Head Office",
  "code": "HQ-01",
  "country": 1,
  "region": 1,
  "city": 1,
  "district": 1,
  "address_line1": "12 Abbas El Akkad St"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "created_at": "2026-10-04T00:57:35.802178+03:00",
    "updated_at": "2026-10-04T00:57:35.802232+03:00",
    "created_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:57:32.752930+03:00",
      "full_name": "Sara Ali"
    },
    "updated_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:57:32.752930+03:00",
      "full_name": "Sara Ali"
    },
    "name_en": "Head Office",
    "name_ar": null,
    "code": "HQ-01",
    "country": {
      "id": 1,
      "created_at": "2026-10-04T00:57:35.730075+03:00",
      "updated_at": "2026-10-04T00:57:35.730228+03:00",
      "created_by": {
        "id": 1,
        "email": "admin@acme.example",
        "first_name": "Sara",
        "last_name": "Ali",
        "date_joined": "2026-10-04T00:57:32.752930+03:00",
        "full_name": "Sara Ali"
      },
      "updated_by": {
  … (truncated)
```

</details>

---

## Inventory — catalogue

Requires the `inventory` subscription module.

**Inventory read responses** (list, retrieve, and the object returned by create/update) contain **every saved field** of
the record except `company` and the soft-delete flags. Relations listed as `object`/`computed` are nested objects (which
in turn carry all their fields); other relations come back as ids (`id (Model)`).

### Categories

Product categories (tree via `parent`).

**Access:** subscription module `inventory`.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/inventory/v1/category/` | List |
| `POST` | `/api/inventory/v1/category/` | Create |
| `GET` | `/api/inventory/v1/category/{id}/` | Retrieve |
| `PUT` | `/api/inventory/v1/category/{id}/` | Replace (all required fields) |
| `PATCH` | `/api/inventory/v1/category/{id}/` | Partial update |
| `DELETE` | `/api/inventory/v1/category/{id}/` | Delete (soft delete); `400` while live products or child categories still use it |

**List query parameters**

| Query param | Meaning |
|---|---|
| `page`, `page_size` | Pagination (default 10, max 100). Total in `metadata.total_count`. |
| `dropdown=true` | Unpaginated short list with only: `id`, `name` |
| `search` | Text search in: `name` |
| `ordering` | Sort by `id`, `name` (prefix `-` for descending) |

**Create body** (`POST`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `parent` | id (Category) | no | nullable |
| `name` | string | **yes** | max 200 chars |
| `description` | string | no |  |
| `logo` | file (image) | no | nullable; max 100 chars |
| `is_active` | boolean | no |  |
| `flags` | object/JSON | no |  |

_Update (`PUT`/`PATCH`) accepts the same fields; with `PATCH` every field is optional._

**Delete** answers `400` with `error.message` `"Cannot delete: still used by 3 products, 2 categories."` while live products
or child categories point at it (the same for a brand used by products).

`name` must be unique among the categories of the same `parent`; a clash answers `400` with
`errors.name = ["Category with this name already exists under this parent."]`. An update may re-send the category's own
name and parent; a `PATCH` that omits one of them is checked with the saved value.

`parent` cannot be the category itself or one of its descendants (`400`,
`errors.parent = ["A category cannot be its own parent or ancestor."]`).

**Response object** (retrieve; create/update return the same shape)

| Field | Type | Notes |
|---|---|---|
| `id` | integer |  |
| `created_at` | datetime (ISO 8601) |  |
| `updated_at` | datetime (ISO 8601) |  |
| `created_by` | object | fields: id, email, first_name, last_name, date_joined |
| `updated_by` | object | fields: id, email, first_name, last_name, date_joined |
| `name` | string |  |
| `parent` | computed |  |
| `description` | string |  |
| `is_active` | boolean |  |
| `logo` | file (image) | nullable |
| `flags` | object/JSON |  |

**Examples** (real responses from the running API)

<details><summary>Example: list → <code>200</code></summary>

```http
GET /api/inventory/v1/category/?page_size=2
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "created_at": "2026-10-04T00:49:37.325150+03:00",
      "updated_at": "2026-10-04T00:49:37.325167+03:00",
      "created_by": null,
      "updated_by": null,
      "name": "Category 0",
      "parent": null,
      "description": "Song event morning smile. Draw near despite ago rate occur. Hair half suffer yard about newspaper visit.",
      "is_active": true
    }
  ],
  "metadata": {
    "timestamp": "2026-10-03T21:50:21.609887Z",
    "version": "1.0",
    "total_count": 72
  }
}
```

</details>

<details><summary>Example: Create category → <code>201</code></summary>

```http
POST /api/inventory/v1/category/
```

Request body:

```json
{
  "name": "Electronics",
  "description": "Phones & laptops"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "created_at": "2026-10-04T00:57:36.825135+03:00",
    "updated_at": "2026-10-04T00:57:36.825187+03:00",
    "created_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:57:32.752930+03:00",
      "full_name": "Sara Ali"
    },
    "updated_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:57:32.752930+03:00",
      "full_name": "Sara Ali"
    },
    "name": "Electronics",
    "parent": null,
    "description": "Phones & laptops",
    "is_active": true
  },
  "metadata": {
    "timestamp": "2026-10-03T21:57:36.826591Z",
    "version": "1.0"
  }
}
```

</details>

### Brands

**Access:** subscription module `inventory`.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/inventory/v1/brand/` | List |
| `POST` | `/api/inventory/v1/brand/` | Create |
| `GET` | `/api/inventory/v1/brand/{id}/` | Retrieve |
| `PUT` | `/api/inventory/v1/brand/{id}/` | Replace (all required fields) |
| `PATCH` | `/api/inventory/v1/brand/{id}/` | Partial update |
| `DELETE` | `/api/inventory/v1/brand/{id}/` | Delete (soft delete); `400` while live products still use it |

**List query parameters**

| Query param | Meaning |
|---|---|
| `page`, `page_size` | Pagination (default 10, max 100). Total in `metadata.total_count`. |
| `dropdown=true` | Unpaginated short list with only: `id`, `name` |
| `search` | Text search in: `name` |
| `ordering` | Sort by `id`, `name` (prefix `-` for descending) |

**Create body** (`POST`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | **yes** | max 200 chars |
| `description` | string | no |  |
| `logo` | file (image) | no | nullable; max 100 chars |
| `is_active` | boolean | no |  |
| `flags` | object/JSON | no |  |

_Update (`PUT`/`PATCH`) accepts the same fields; with `PATCH` every field is optional._

**Response object** (retrieve; create/update return the same shape)

| Field | Type | Notes |
|---|---|---|
| `id` | integer |  |
| `created_at` | datetime (ISO 8601) |  |
| `updated_at` | datetime (ISO 8601) |  |
| `created_by` | object | fields: id, email, first_name, last_name, date_joined |
| `updated_by` | object | fields: id, email, first_name, last_name, date_joined |
| `name` | string |  |
| `description` | string |  |
| `logo` | file (image) |  |
| `is_active` | boolean |  |
| `flags` | object/JSON |  |

**Examples** (real responses from the running API)

<details><summary>Example: list → <code>200</code></summary>

```http
GET /api/inventory/v1/brand/?page_size=2
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "created_at": "2026-10-04T00:49:37.326374+03:00",
      "updated_at": "2026-10-04T00:49:37.326392+03:00",
      "created_by": null,
      "updated_by": null,
      "name": "Brand 0",
      "description": "Candidate many make without our send. Week score do language choose staff culture.\nResult matter or beautiful. Care rest require trade since edge security life. Gas realize health order.",
      "logo": null,
      "is_active": true
    }
  ],
  "metadata": {
    "timestamp": "2026-10-03T21:50:21.653765Z",
    "version": "1.0",
    "total_count": 72
  }
}
```

</details>

<details><summary>Example: Create brand → <code>201</code></summary>

```http
POST /api/inventory/v1/brand/
```

Request body:

```json
{
  "name": "Contoso"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "created_at": "2026-10-04T00:57:36.837101+03:00",
    "updated_at": "2026-10-04T00:57:36.837150+03:00",
    "created_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:57:32.752930+03:00",
      "full_name": "Sara Ali"
    },
    "updated_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:57:32.752930+03:00",
      "full_name": "Sara Ali"
    },
    "name": "Contoso",
    "description": "",
    "logo": null,
    "is_active": true
  },
  "metadata": {
    "timestamp": "2026-10-03T21:57:36.838768Z",
    "version": "1.0"
  }
}
```

</details>

### Products

A sellable/purchasable item. Stock is tracked per **product variant** (see [Product variants](#product-variants)).

**Access:** subscription module `inventory`.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/inventory/v1/product/` | List |
| `POST` | `/api/inventory/v1/product/` | Create |
| `GET` | `/api/inventory/v1/product/{id}/` | Retrieve |
| `PUT` | `/api/inventory/v1/product/{id}/` | Replace (all required fields) |
| `PATCH` | `/api/inventory/v1/product/{id}/` | Partial update |
| `DELETE` | `/api/inventory/v1/product/{id}/` | Delete (soft delete) |

**List query parameters**

| Query param | Meaning |
|---|---|
| `page`, `page_size` | Pagination (default 10, max 100). Total in `metadata.total_count`. |
| `dropdown=true` | Unpaginated short list with only: `id`, `name` |
| `search` | Text search in: `name` |
| `ordering` | Sort by `id`, `name` (prefix `-` for descending) |

**Create body** (`POST`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `category` | id (Category) | no | nullable |
| `brand` | id (Brand) | no | nullable |
| `name` | string | **yes** | max 200 chars |
| `description` | string | no |  |
| `logo` | file (image) | no | nullable; max 100 chars |
| `product_type` | enum | no | one of: `simple`, `variant`, `bundle`, `service` |
| `default_uom` | string | no | max 20 chars |
| `is_batch_tracked` | boolean | no |  |
| `is_serial_tracked` | boolean | no |  |
| `has_expiry` | boolean | no |  |
| `shelf_life_days` | integer | no | nullable |
| `valuation_method` | enum | no | one of: `fifo`, `lifo`, `average` |
| `image` | file (image) | no | nullable; max 100 chars |
| `additional_images` | object/JSON | no |  |
| `is_active` | boolean | no |  |
| `is_purchasable` | boolean | no |  |
| `is_sellable` | boolean | no |  |
| `flags` | object/JSON | no |  |

_Update (`PUT`/`PATCH`) accepts the same fields; with `PATCH` every field is optional._

**Response object** (retrieve; create/update return the same shape)

| Field | Type | Notes |
|---|---|---|
| `id` | integer |  |
| `created_at` | datetime (ISO 8601) |  |
| `updated_at` | datetime (ISO 8601) |  |
| `created_by` | object | fields: id, email, first_name, last_name, date_joined |
| `updated_by` | object | fields: id, email, first_name, last_name, date_joined |
| `name` | string |  |
| `description` | string |  |
| `product_type` | string |  |
| `category` | object | fields: id, created_at, updated_at, created_by, updated_by, name, parent, description, is_active |
| `brand` | object | fields: id, created_at, updated_at, created_by, updated_by, name, description, logo, is_active |
| `default_uom` | string |  |
| `is_batch_tracked` | boolean |  |
| `is_serial_tracked` | boolean |  |
| `has_expiry` | boolean |  |
| `shelf_life_days` | integer |  |
| `valuation_method` | string |  |
| `image` | file (image) |  |
| `additional_images` | object/JSON |  |
| `is_active` | boolean |  |
| `is_purchasable` | boolean |  |
| `is_sellable` | boolean |  |
| `logo` | file (image) | nullable |
| `flags` | object/JSON |  |

**Examples** (real responses from the running API)

<details><summary>Example: list → <code>200</code></summary>

```http
GET /api/inventory/v1/product/?page_size=2
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "created_at": "2026-10-04T00:49:37.327331+03:00",
      "updated_at": "2026-10-04T00:49:37.327349+03:00",
      "created_by": null,
      "updated_by": null,
      "name": "Product 0",
      "description": "",
      "product_type": "simple",
      "category": {
        "id": 1,
        "created_at": "2026-10-04T00:49:37.325150+03:00",
        "updated_at": "2026-10-04T00:49:37.325167+03:00",
        "created_by": null,
        "updated_by": null,
        "name": "Category 0",
        "parent": null,
        "description": "Song event morning smile. Draw near despite ago rate occur. Hair half suffer yard about newspaper visit.",
        "is_active": true
      },
      "brand": {
        "id": 1,
        "created_at": "2026-10-04T00:49:37.326374+03:00",
        "updated_at": "2026-10-04T00:49:37.326392+03:00",
        "created_by": null,
        "updated_by": null,
        "name": "Brand 0",
        "description": "Candidate many make without our send. Week score do language choose staff culture.\nResult matter or beautiful. Care rest require trade since edge security life. Gas realize health order.",
        "logo": null,
        "is_active": true
      },
      "default_uom": "each",
      "is_batch_tracked": false,
      "is_serial_tracked": false,
      "has_expiry": false,
  … (truncated)
```

</details>

<details><summary>Example: Create product → <code>201</code></summary>

```http
POST /api/inventory/v1/product/
```

Request body:

```json
{
  "name": "Smartphone X",
  "product_type": "simple",
  "category": 1,
  "brand": 1,
  "default_uom": "pcs",
  "is_batch_tracked": false,
  "is_serial_tracked": false,
  "valuation_method": "fifo",
  "is_purchasable": true,
  "is_sellable": true
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "created_at": "2026-10-04T00:57:36.866414+03:00",
    "updated_at": "2026-10-04T00:57:36.866471+03:00",
    "created_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:57:32.752930+03:00",
      "full_name": "Sara Ali"
    },
    "updated_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:57:32.752930+03:00",
      "full_name": "Sara Ali"
    },
    "name": "Smartphone X",
    "description": "",
    "product_type": "simple",
    "category": {
      "id": 1,
      "created_at": "2026-10-04T00:57:36.825135+03:00",
      "updated_at": "2026-10-04T00:57:36.825187+03:00",
      "created_by": {
        "id": 1,
        "email": "admin@acme.example",
        "first_name": "Sara",
        "last_name": "Ali",
        "date_joined": "2026-10-04T00:57:32.752930+03:00",
        "full_name": "Sara Ali"
      },
      "updated_by": {
  … (truncated)
```

</details>

---

### Product variants

The stock-keeping unit of a product (stock, batches, serials, PO lines and transfers all reference a variant).

**Access:** subscription module `inventory`.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/inventory/v1/product-variant/` | List |
| `POST` | `/api/inventory/v1/product-variant/` | Create |
| `GET` | `/api/inventory/v1/product-variant/{id}/` | Retrieve |
| `PUT` | `/api/inventory/v1/product-variant/{id}/` | Replace (all required fields) |
| `PATCH` | `/api/inventory/v1/product-variant/{id}/` | Partial update |
| `DELETE` | `/api/inventory/v1/product-variant/{id}/` | Delete (soft delete) |

**List query parameters**

| Query param | Meaning |
|---|---|
| `page`, `page_size` | Pagination (default 10, max 100). Total in `metadata.total_count`. |
| `dropdown=true` | Unpaginated short list with only: `id`, `sku`, `name` |
| `search` | Text search in: `sku`, `name`, `barcode`, product name |
| `ordering` | Sort by `id`, `sku`, `name` (prefix `-` for descending) |

**Create body** (`POST`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `product` | id (Product) | **yes** | must belong to your company |
| `sku` | string | **yes** | max 100 chars, unique within your company |
| `name` | string | **yes** | max 255 chars |
| `barcode` | string | no | max 100 chars |
| `attributes` | object | no | e.g. `{"color": "red", "size": "M"}` |
| `standard_cost` | decimal (string) | no | nullable |
| `standard_price` | decimal (string) | no | nullable |
| `weight` | decimal (string) | no | nullable |
| `weight_uom` | string | no | default `kg` |
| `dimensions` | object | no |  |
| `image` | file | no | multipart upload |
| `is_active` | boolean | no | default `true` |

**Response object**: `id`, `product` (full product object), `sku`, `barcode`, `name`, `attributes`, `standard_cost`,
`standard_price`, `weight`, `weight_uom`, `dimensions`, `image`, `is_active`, plus the usual `created_at` / `updated_at` /
`created_by` / `updated_by`.

## Inventory — warehouses

Warehouse → Zone → Bin.

### Warehouses

**Access:** subscription module `inventory`.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/inventory/v1/warehouse/` | List |
| `POST` | `/api/inventory/v1/warehouse/` | Create |
| `GET` | `/api/inventory/v1/warehouse/{id}/` | Retrieve |
| `PUT` | `/api/inventory/v1/warehouse/{id}/` | Replace (all required fields) |
| `PATCH` | `/api/inventory/v1/warehouse/{id}/` | Partial update |
| `DELETE` | `/api/inventory/v1/warehouse/{id}/` | Delete (soft delete) |

**List query parameters**

| Query param | Meaning |
|---|---|
| `page`, `page_size` | Pagination (default 10, max 100). Total in `metadata.total_count`. |
| `dropdown=true` | Unpaginated short list with only: `id`, `name`, `code` |
| `search` | Text search in: `name`, `code` |
| `ordering` | Sort by `id`, `name`, `code` (prefix `-` for descending) |

**Create body** (`POST`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `location` | id (Location) | no | nullable |
| `manager` | id (User) | no | nullable; a user of your company |
| `name` | string | **yes** | max 100 chars |
| `code` | string | **yes** | max 20 chars, unique within your company |
| `warehouse_type` | enum | no | one of: `central`, `regional`, `retail`, `transit`, `returns`, `quarantine` |
| `email` | email | no | max 254 chars |
| `phone` | string | no | max 50 chars |
| `is_active` | boolean | no |  |
| `allow_negative_stock` | boolean | no |  |
| `use_bin_locations` | boolean | no |  |
| `address_line1` | string | no | max 200 chars |
| `address_line2` | string | no | max 200 chars |
| `city` | string | no | max 100 chars |
| `state` | string | no | max 100 chars |
| `postal_code` | string | no | max 20 chars |
| `country` | string | no | max 100 chars |

_Update (`PUT`/`PATCH`) accepts the same fields; with `PATCH` every field is optional._

**Response object** (retrieve; create/update return the same shape)

| Field | Type | Notes |
|---|---|---|
| `id` | integer |  |
| `created_at` | datetime (ISO 8601) |  |
| `updated_at` | datetime (ISO 8601) |  |
| `created_by` | object | fields: id, email, first_name, last_name, date_joined |
| `updated_by` | object | fields: id, email, first_name, last_name, date_joined |
| `name` | string |  |
| `warehouse_type` | string |  |
| `location` | computed |  |
| `manager` | computed |  |
| `is_active` | boolean |  |
| `allow_negative_stock` | boolean |  |
| `use_bin_locations` | boolean |  |
| `code` | string |  |
| `email` | email |  |
| `phone` | string |  |
| `address_line1` | string |  |
| `address_line2` | string |  |
| `city` | string |  |
| `state` | string |  |
| `postal_code` | string |  |
| `country` | string |  |

**Examples** (real responses from the running API)

<details><summary>Example: list → <code>200</code></summary>

```http
GET /api/inventory/v1/warehouse/?page_size=2
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "created_at": "2026-10-04T00:49:37.333828+03:00",
      "updated_at": "2026-10-04T00:49:37.333846+03:00",
      "created_by": null,
      "updated_by": null,
      "name": "Warehouse 0",
      "warehouse_type": "central",
      "location": null,
      "manager": null,
      "is_active": true,
      "allow_negative_stock": false,
      "use_bin_locations": false
    }
  ],
  "metadata": {
    "timestamp": "2026-10-03T21:50:21.762154Z",
    "version": "1.0",
    "total_count": 78
  }
}
```

</details>

<details><summary>Example: Create warehouse → <code>201</code></summary>

```http
POST /api/inventory/v1/warehouse/
```

Request body:

```json
{
  "name": "Main Warehouse",
  "code": "WH-MAIN",
  "warehouse_type": "central",
  "email": "wh@acme.example",
  "location": 1,
  "use_bin_locations": true
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "created_at": "2026-10-04T00:57:36.625349+03:00",
    "updated_at": "2026-10-04T00:57:36.625409+03:00",
    "created_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:57:32.752930+03:00",
      "full_name": "Sara Ali"
    },
    "updated_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:57:32.752930+03:00",
      "full_name": "Sara Ali"
    },
    "name": "Main Warehouse",
    "warehouse_type": "central",
    "location": {
      "id": 1,
      "created_at": "2026-10-04T00:57:35.802178+03:00",
      "updated_at": "2026-10-04T00:57:35.802232+03:00",
      "created_by": {
        "id": 1,
        "email": "admin@acme.example",
        "first_name": "Sara",
        "last_name": "Ali",
        "date_joined": "2026-10-04T00:57:32.752930+03:00",
        "full_name": "Sara Ali"
      },
      "updated_by": {
        "id": 1,
  … (truncated)
```

</details>

### Zones

An area inside a warehouse.

**Access:** subscription module `inventory`.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/inventory/v1/zone/` | List |
| `POST` | `/api/inventory/v1/zone/` | Create |
| `GET` | `/api/inventory/v1/zone/{id}/` | Retrieve |
| `PUT` | `/api/inventory/v1/zone/{id}/` | Replace (all required fields) |
| `PATCH` | `/api/inventory/v1/zone/{id}/` | Partial update |
| `DELETE` | `/api/inventory/v1/zone/{id}/` | Delete (soft delete) |

**List query parameters**

| Query param | Meaning |
|---|---|
| `page`, `page_size` | Pagination (default 10, max 100). Total in `metadata.total_count`. |
| `dropdown=true` | Unpaginated short list with only: `id`, `name`, `code` |
| `search` | Text search in: `name`, `code` |
| `ordering` | Sort by `id`, `name` (prefix `-` for descending) |

**Create body** (`POST`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `warehouse` | id (Warehouse) | **yes** |  |
| `name` | string | **yes** | max 100 chars |
| `code` | string | no | max 20 chars |
| `description` | string | no |  |
| `is_active` | boolean | no |  |

_Update (`PUT`/`PATCH`) accepts the same fields; with `PATCH` every field is optional._

**Response object** (retrieve; create/update return the same shape)

| Field | Type | Notes |
|---|---|---|
| `id` | integer |  |
| `created_at` | datetime (ISO 8601) |  |
| `updated_at` | datetime (ISO 8601) |  |
| `created_by` | object | fields: id, email, first_name, last_name, date_joined |
| `updated_by` | object | fields: id, email, first_name, last_name, date_joined |
| `name` | string |  |
| `warehouse` | object | fields: id, created_at, updated_at, created_by, updated_by, name, warehouse_type, location, manager, is_active, allow_negative_stock, use_bin_locations |
| `is_active` | boolean |  |
| `code` | string |  |
| `description` | string |  |

**Examples** (real responses from the running API)

<details><summary>Example: list → <code>200</code></summary>

```http
GET /api/inventory/v1/zone/?page_size=2
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "created_at": "2026-10-04T00:49:37.334767+03:00",
      "updated_at": "2026-10-04T00:49:37.334784+03:00",
      "created_by": null,
      "updated_by": null,
      "name": "Zone 0",
      "warehouse": {
        "id": 1,
        "created_at": "2026-10-04T00:49:37.333828+03:00",
        "updated_at": "2026-10-04T00:49:37.333846+03:00",
        "created_by": null,
        "updated_by": null,
        "name": "Warehouse 0",
        "warehouse_type": "central",
        "location": null,
        "manager": null,
        "is_active": true,
        "allow_negative_stock": false,
        "use_bin_locations": false
      },
      "is_active": true
    }
  ],
  "metadata": {
    "timestamp": "2026-10-03T21:50:21.808999Z",
    "version": "1.0",
    "total_count": 18
  }
}
```

</details>

<details><summary>Example: Create zone → <code>201</code></summary>

```http
POST /api/inventory/v1/zone/
```

Request body:

```json
{
  "warehouse": 1,
  "name": "Zone A",
  "code": "ZA"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "created_at": "2026-10-04T00:57:36.694984+03:00",
    "updated_at": "2026-10-04T00:57:36.695121+03:00",
    "created_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:57:32.752930+03:00",
      "full_name": "Sara Ali"
    },
    "updated_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:57:32.752930+03:00",
      "full_name": "Sara Ali"
    },
    "name": "Zone A",
    "warehouse": {
      "id": 1,
      "created_at": "2026-10-04T00:57:36.625349+03:00",
      "updated_at": "2026-10-04T00:57:36.625409+03:00",
      "created_by": {
        "id": 1,
        "email": "admin@acme.example",
        "first_name": "Sara",
        "last_name": "Ali",
        "date_joined": "2026-10-04T00:57:32.752930+03:00",
        "full_name": "Sara Ali"
      },
      "updated_by": {
        "id": 1,
        "email": "admin@acme.example",
  … (truncated)
```

</details>

### Bins

A shelf/location inside a zone.

**Access:** subscription module `inventory`.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/inventory/v1/bin/` | List |
| `POST` | `/api/inventory/v1/bin/` | Create |
| `GET` | `/api/inventory/v1/bin/{id}/` | Retrieve |
| `PUT` | `/api/inventory/v1/bin/{id}/` | Replace (all required fields) |
| `PATCH` | `/api/inventory/v1/bin/{id}/` | Partial update |
| `DELETE` | `/api/inventory/v1/bin/{id}/` | Delete (soft delete) |

**List query parameters**

| Query param | Meaning |
|---|---|
| `page`, `page_size` | Pagination (default 10, max 100). Total in `metadata.total_count`. |
| `dropdown=true` | Unpaginated short list with only: `id`, `name`, `code` |
| `search` | Text search in: `name`, `code`, `barcode` |
| `ordering` | Sort by `id`, `name` (prefix `-` for descending) |

**Create body** (`POST`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `zone` | id (Zone) | **yes** |  |
| `name` | string | **yes** | max 100 chars |
| `code` | string | no | max 20 chars |
| `barcode` | string | no | max 100 chars |
| `max_capacity` | decimal (string) | no | nullable |
| `is_active` | boolean | no |  |
| `allow_mixed_products` | boolean | no |  |
| `bin_type` | string | no | max 20 chars |

_Update (`PUT`/`PATCH`) accepts the same fields; with `PATCH` every field is optional._

**Response object** (retrieve; create/update return the same shape)

| Field | Type | Notes |
|---|---|---|
| `id` | integer |  |
| `created_at` | datetime (ISO 8601) |  |
| `updated_at` | datetime (ISO 8601) |  |
| `created_by` | object | fields: id, email, first_name, last_name, date_joined |
| `updated_by` | object | fields: id, email, first_name, last_name, date_joined |
| `name` | string |  |
| `zone` | object | fields: id, created_at, updated_at, created_by, updated_by, name, warehouse, is_active |
| `is_active` | boolean |  |
| `allow_mixed_products` | boolean |  |
| `code` | string |  |
| `barcode` | string |  |
| `max_capacity` | decimal (string) | nullable |
| `bin_type` | string |  |

**Examples** (real responses from the running API)

<details><summary>Example: list → <code>200</code></summary>

```http
GET /api/inventory/v1/bin/?page_size=2
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "created_at": "2026-10-04T00:49:37.335515+03:00",
      "updated_at": "2026-10-04T00:49:37.335533+03:00",
      "created_by": null,
      "updated_by": null,
      "name": "Bin 0",
      "zone": {
        "id": 1,
        "created_at": "2026-10-04T00:49:37.334767+03:00",
        "updated_at": "2026-10-04T00:49:37.334784+03:00",
        "created_by": null,
        "updated_by": null,
        "name": "Zone 0",
        "warehouse": {
          "id": 1,
          "created_at": "2026-10-04T00:49:37.333828+03:00",
          "updated_at": "2026-10-04T00:49:37.333846+03:00",
          "created_by": null,
          "updated_by": null,
          "name": "Warehouse 0",
          "warehouse_type": "central",
          "location": null,
          "manager": null,
          "is_active": true,
          "allow_negative_stock": false,
          "use_bin_locations": false
        },
        "is_active": true
      },
      "is_active": true,
      "allow_mixed_products": false
    }
  ],
  "metadata": {
  … (truncated)
```

</details>

<details><summary>Example: Create bin → <code>201</code></summary>

```http
POST /api/inventory/v1/bin/
```

Request body:

```json
{
  "zone": 1,
  "warehouse": 1,
  "name": "A-01-01",
  "code": "A0101"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "created_at": "2026-10-04T00:57:36.760521+03:00",
    "updated_at": "2026-10-04T00:57:36.760576+03:00",
    "created_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:57:32.752930+03:00",
      "full_name": "Sara Ali"
    },
    "updated_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:57:32.752930+03:00",
      "full_name": "Sara Ali"
    },
    "name": "A-01-01",
    "zone": {
      "id": 1,
      "created_at": "2026-10-04T00:57:36.694984+03:00",
      "updated_at": "2026-10-04T00:57:36.695121+03:00",
      "created_by": {
        "id": 1,
        "email": "admin@acme.example",
        "first_name": "Sara",
        "last_name": "Ali",
        "date_joined": "2026-10-04T00:57:32.752930+03:00",
        "full_name": "Sara Ali"
      },
      "updated_by": {
        "id": 1,
        "email": "admin@acme.example",
  … (truncated)
```

</details>

---

## Inventory — suppliers

### Suppliers

**Access:** subscription module `inventory`.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/inventory/v1/supplier/` | List |
| `POST` | `/api/inventory/v1/supplier/` | Create |
| `GET` | `/api/inventory/v1/supplier/{id}/` | Retrieve |
| `PUT` | `/api/inventory/v1/supplier/{id}/` | Replace (all required fields) |
| `PATCH` | `/api/inventory/v1/supplier/{id}/` | Partial update |
| `DELETE` | `/api/inventory/v1/supplier/{id}/` | Delete (soft delete) |

**List query parameters**

| Query param | Meaning |
|---|---|
| `page`, `page_size` | Pagination (default 10, max 100). Total in `metadata.total_count`. |
| `dropdown=true` | Unpaginated short list with only: `id`, `name` |
| `search` | Text search in: `name`, `contact_person`, `email`, `phone` |
| `ordering` | Sort by `id`, `name` (prefix `-` for descending) |

**Create body** (`POST`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | **yes** | max 200 chars |
| `supplier_type` | enum | no | one of: `manufacturer`, `distributor`, `wholesaler`, `retailer`, `service` |
| `tax_id` | string | no | max 50 chars |
| `contact_person` | string | no | max 200 chars |
| `email` | email | no | max 254 chars |
| `phone` | string | no | max 50 chars |
| `mobile` | string | no | max 50 chars |
| `website` | url | no | max 200 chars |
| `address_line1` | string | no | max 200 chars |
| `address_line2` | string | no | max 200 chars |
| `city` | string | no | max 100 chars |
| `state` | string | no | max 100 chars |
| `postal_code` | string | no | max 20 chars |
| `country` | string | no | max 100 chars |
| `payment_terms` | string | no | max 100 chars |
| `currency` | string | no | max 3 chars |
| `credit_limit` | decimal (string) | no | nullable |
| `lead_time_days` | integer | no |  |
| `reliability_score` | number | no |  |
| `is_preferred` | boolean | no |  |
| `is_active` | boolean | no |  |
| `notes` | string | no |  |

_Update (`PUT`/`PATCH`) accepts the same fields; with `PATCH` every field is optional._

**Response object** (retrieve; create/update return the same shape)

| Field | Type | Notes |
|---|---|---|
| `id` | integer |  |
| `created_at` | datetime (ISO 8601) |  |
| `updated_at` | datetime (ISO 8601) |  |
| `created_by` | object | fields: id, email, first_name, last_name, date_joined |
| `updated_by` | object | fields: id, email, first_name, last_name, date_joined |
| `name` | string |  |
| `supplier_type` | string |  |
| `is_active` | boolean |  |
| `is_preferred` | boolean |  |
| `lead_time_days` | integer |  |
| `credit_limit` | decimal (string) |  |
| `tax_id` | string |  |
| `contact_person` | string |  |
| `email` | email |  |
| `phone` | string |  |
| `mobile` | string |  |
| `website` | url |  |
| `address_line1` | string |  |
| `address_line2` | string |  |
| `city` | string |  |
| `state` | string |  |
| `postal_code` | string |  |
| `country` | string |  |
| `payment_terms` | string |  |
| `currency` | string |  |
| `reliability_score` | string |  |
| `notes` | string |  |

**Examples** (real responses from the running API)

<details><summary>Example: list → <code>200</code></summary>

```http
GET /api/inventory/v1/supplier/?page_size=2
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "created_at": "2026-10-04T00:49:40.264362+03:00",
      "updated_at": "2026-10-04T00:49:40.264408+03:00",
      "created_by": null,
      "updated_by": null,
      "name": "Supplier 0",
      "supplier_type": "distributor",
      "is_active": true,
      "is_preferred": false,
      "lead_time_days": 0,
      "credit_limit": null
    }
  ],
  "metadata": {
    "timestamp": "2026-10-03T21:50:21.916633Z",
    "version": "1.0",
    "total_count": 20
  }
}
```

</details>

<details><summary>Example: Create supplier → <code>201</code></summary>

```http
POST /api/inventory/v1/supplier/
```

Request body:

```json
{
  "name": "Global Parts Ltd",
  "email": "sales@globalparts.example",
  "payment_terms": "Net 30",
  "currency": "USD",
  "lead_time_days": 7
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "created_at": "2026-10-04T00:57:36.891163+03:00",
    "updated_at": "2026-10-04T00:57:36.891218+03:00",
    "created_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:57:32.752930+03:00",
      "full_name": "Sara Ali"
    },
    "updated_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:57:32.752930+03:00",
      "full_name": "Sara Ali"
    },
    "name": "Global Parts Ltd",
    "supplier_type": "distributor",
    "is_active": true,
    "is_preferred": false,
    "lead_time_days": 7,
    "credit_limit": null
  },
  "metadata": {
    "timestamp": "2026-10-03T21:57:36.892958Z",
    "version": "1.0"
  }
}
```

</details>

### Supplier products

Price list: what a supplier sells, at what cost, from which date. `supplier + product_variant + effective_from` must be unique.

**Access:** subscription module `inventory`.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/inventory/v1/supplier-product/` | List |
| `POST` | `/api/inventory/v1/supplier-product/` | Create |
| `GET` | `/api/inventory/v1/supplier-product/{id}/` | Retrieve |
| `PUT` | `/api/inventory/v1/supplier-product/{id}/` | Replace (all required fields) |
| `PATCH` | `/api/inventory/v1/supplier-product/{id}/` | Partial update |
| `DELETE` | `/api/inventory/v1/supplier-product/{id}/` | Delete (soft delete) |

**List query parameters**

| Query param | Meaning |
|---|---|
| `page`, `page_size` | Pagination (default 10, max 100). Total in `metadata.total_count`. |
| `dropdown=true` | Unpaginated short list with only: `id`, `supplier_sku` |
| `search` | Text search in: `supplier_sku`, `supplier_product_name` |
| `supplier`, `product_variant` | Exact-match filters by id (combine them for one supplier and variant) |
| `ordering` | Sort by `id` (prefix `-` for descending) |

**Create body** (`POST`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `supplier` | id (Supplier) | **yes** |  |
| `product_variant` | id (ProductVariant) | **yes** |  |
| `supplier_sku` | string | no | max 100 chars |
| `supplier_product_name` | string | no | max 200 chars |
| `unit_cost` | decimal (string) | **yes** |  |
| `currency` | string | no | max 3 chars |
| `min_order_qty` | decimal (string) | no |  |
| `max_order_qty` | decimal (string) | no | nullable |
| `lead_time_days` | integer | no | nullable |
| `is_preferred` | boolean | no |  |
| `is_primary` | boolean | no |  |
| `effective_from` | date (YYYY-MM-DD) | **yes** |  |
| `effective_to` | date (YYYY-MM-DD) | no | nullable |
| `notes` | string | no |  |

_Update (`PUT`/`PATCH`) accepts the same fields; with `PATCH` every field is optional._

**Response object** (retrieve; create/update return the same shape)

| Field | Type | Notes |
|---|---|---|
| `id` | integer |  |
| `created_at` | datetime (ISO 8601) |  |
| `updated_at` | datetime (ISO 8601) |  |
| `created_by` | object | fields: id, email, first_name, last_name, date_joined |
| `updated_by` | object | fields: id, email, first_name, last_name, date_joined |
| `supplier` | object | fields: id, created_at, updated_at, created_by, updated_by, name, supplier_type, is_active, is_preferred, lead_time_days, credit_limit |
| `product_variant` | computed |  |
| `is_preferred` | boolean |  |
| `supplier_sku` | string |  |
| `supplier_product_name` | string |  |
| `unit_cost` | decimal (string) |  |
| `currency` | string |  |
| `min_order_qty` | decimal (string) |  |
| `max_order_qty` | decimal (string) | nullable |
| `lead_time_days` | integer | nullable |
| `is_primary` | boolean |  |
| `effective_from` | date (YYYY-MM-DD) |  |
| `effective_to` | date (YYYY-MM-DD) | nullable |
| `notes` | string |  |

**Examples** (real responses from the running API)

<details><summary>Example: list → <code>200</code></summary>

```http
GET /api/inventory/v1/supplier-product/?page_size=2
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "created_at": "2026-10-04T00:49:59.057222+03:00",
      "updated_at": "2026-10-04T00:49:59.057239+03:00",
      "created_by": null,
      "updated_by": null,
      "supplier": {
        "id": 17,
        "created_at": "2026-10-04T00:49:59.053606+03:00",
        "updated_at": "2026-10-04T00:49:59.053623+03:00",
        "created_by": null,
        "updated_by": null,
        "name": "Supplier 16",
        "supplier_type": "distributor",
        "is_active": true,
        "is_preferred": false,
        "lead_time_days": 0,
        "credit_limit": null
      },
      "product_variant": {
        "id": 35,
        "created_at": "2026-10-04T00:49:59.056476+03:00",
        "updated_at": "2026-10-04T00:49:59.056493+03:00",
        "created_by": null,
        "updated_by": null,
        "name": "",
        "product": {
          "id": 39,
          "created_at": "2026-10-04T00:49:59.055862+03:00",
          "updated_at": "2026-10-04T00:49:59.055878+03:00",
          "created_by": null,
          "updated_by": null,
          "name": "Product 38",
          "description": "",
          "product_type": "simple",
  … (truncated)
```

</details>

<details><summary>Example: Create supplier product → <code>201</code></summary>

```http
POST /api/inventory/v1/supplier-product/
```

Request body:

```json
{
  "supplier": 1,
  "product_variant": 1,
  "unit_cost": "120.00",
  "effective_from": "2026-10-04",
  "min_order_qty": "10"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "created_at": "2026-10-04T00:57:36.922948+03:00",
    "updated_at": "2026-10-04T00:57:36.923037+03:00",
    "created_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:57:32.752930+03:00",
      "full_name": "Sara Ali"
    },
    "updated_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:57:32.752930+03:00",
      "full_name": "Sara Ali"
    },
    "supplier": {
      "id": 1,
      "created_at": "2026-10-04T00:57:36.891163+03:00",
      "updated_at": "2026-10-04T00:57:36.891218+03:00",
      "created_by": {
        "id": 1,
        "email": "admin@acme.example",
        "first_name": "Sara",
        "last_name": "Ali",
        "date_joined": "2026-10-04T00:57:32.752930+03:00",
        "full_name": "Sara Ali"
      },
      "updated_by": {
        "id": 1,
        "email": "admin@acme.example",
        "first_name": "Sara",
  … (truncated)
```

</details>

---

## Inventory — stock

Batches, serial numbers and stock positions.

### Batches / lots

Quantity received in one lot, with optional expiry.

**Access:** subscription module `inventory`.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/inventory/v1/batch/` | List |
| `POST` | `/api/inventory/v1/batch/` | Create |
| `GET` | `/api/inventory/v1/batch/{id}/` | Retrieve |
| `PUT` | `/api/inventory/v1/batch/{id}/` | Replace (all required fields) |
| `PATCH` | `/api/inventory/v1/batch/{id}/` | Partial update |
| `DELETE` | `/api/inventory/v1/batch/{id}/` | Delete (soft delete) |

**List query parameters**

| Query param | Meaning |
|---|---|
| `page`, `page_size` | Pagination (default 10, max 100). Total in `metadata.total_count`. |
| `dropdown=true` | Unpaginated short list with only: `id`, `batch_number` |
| `search` | Text search in: `batch_number` |
| `ordering` | Sort by `id`, `batch_number`, `expiry_date` (prefix `-` for descending) |

**Create body** (`POST`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `product_variant` | id (ProductVariant) | **yes** |  |
| `supplier` | id (Supplier) | no | nullable |
| `location` | id (Bin) | no | nullable |
| `batch_number` | string | **yes** | max 100 chars |
| `manufacturing_date` | date (YYYY-MM-DD) | no | nullable |
| `expiry_date` | date (YYYY-MM-DD) | no | nullable |
| `received_date` | date (YYYY-MM-DD) | **yes** |  |
| `initial_quantity` | decimal (string) | **yes** |  |
| `remaining_quantity` | decimal (string) | **yes** |  |
| `is_quarantined` | boolean | no |  |
| `notes` | string | no |  |

_Update (`PUT`/`PATCH`) accepts the same fields; with `PATCH` every field is optional._

**Response object** (retrieve; create/update return the same shape)

| Field | Type | Notes |
|---|---|---|
| `id` | integer |  |
| `created_at` | datetime (ISO 8601) |  |
| `updated_at` | datetime (ISO 8601) |  |
| `created_by` | object | fields: id, email, first_name, last_name, date_joined |
| `updated_by` | object | fields: id, email, first_name, last_name, date_joined |
| `product_variant` | computed |  |
| `supplier` | computed |  |
| `is_quarantined` | boolean |  |
| `batch_number` | string |  |
| `manufacturing_date` | date (YYYY-MM-DD) | nullable |
| `expiry_date` | date (YYYY-MM-DD) | nullable |
| `received_date` | date (YYYY-MM-DD) |  |
| `initial_quantity` | decimal (string) |  |
| `remaining_quantity` | decimal (string) |  |
| `notes` | string |  |
| `location` | id (Bin) |  |

**Examples** (real responses from the running API)

<details><summary>Example: list → <code>200</code></summary>

```http
GET /api/inventory/v1/batch/?page_size=2
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "created_at": "2026-10-04T00:49:37.329293+03:00",
      "updated_at": "2026-10-04T00:49:37.329310+03:00",
      "created_by": null,
      "updated_by": null,
      "product_variant": {
        "id": 1,
        "created_at": "2026-10-04T00:49:37.328296+03:00",
        "updated_at": "2026-10-04T00:49:37.328313+03:00",
        "created_by": null,
        "updated_by": null,
        "name": "",
        "product": {
          "id": 1,
          "created_at": "2026-10-04T00:49:37.327331+03:00",
          "updated_at": "2026-10-04T00:49:37.327349+03:00",
          "created_by": null,
          "updated_by": null,
          "name": "Product 0",
          "description": "",
          "product_type": "simple",
          "category": {
            "id": 1,
            "created_at": "2026-10-04T00:49:37.325150+03:00",
            "updated_at": "2026-10-04T00:49:37.325167+03:00",
            "created_by": null,
            "updated_by": null,
            "name": "Category 0",
            "parent": null,
            "description": "Song event morning smile. Draw near despite ago rate occur. Hair half suffer yard about newspaper visit.",
            "is_active": true
          },
          "brand": {
            "id": 1,
  … (truncated)
```

</details>

<details><summary>Example: Create batch → <code>201</code></summary>

```http
POST /api/inventory/v1/batch/
```

Request body:

```json
{
  "product_variant": 1,
  "batch_number": "B-2026-001",
  "received_date": "2026-10-04",
  "expiry_date": "2027-10-04",
  "initial_quantity": "100",
  "remaining_quantity": "100"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "created_at": "2026-10-04T00:57:36.958574+03:00",
    "updated_at": "2026-10-04T00:57:36.958628+03:00",
    "created_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:57:32.752930+03:00",
      "full_name": "Sara Ali"
    },
    "updated_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:57:32.752930+03:00",
      "full_name": "Sara Ali"
    },
    "product_variant": {
      "id": 1,
      "created_at": "2026-10-04T00:57:36.877457+03:00",
      "updated_at": "2026-10-04T00:57:36.877485+03:00",
      "created_by": null,
      "updated_by": null,
      "name": "",
      "product": {
        "id": 1,
        "created_at": "2026-10-04T00:57:36.866414+03:00",
        "updated_at": "2026-10-04T00:57:36.866471+03:00",
        "created_by": {
          "id": 1,
          "email": "admin@acme.example",
          "first_name": "Sara",
          "last_name": "Ali",
  … (truncated)
```

</details>

### Serial numbers

Individually tracked units.

**Access:** subscription module `inventory`.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/inventory/v1/serial-number/` | List |
| `POST` | `/api/inventory/v1/serial-number/` | Create |
| `GET` | `/api/inventory/v1/serial-number/{id}/` | Retrieve |
| `PUT` | `/api/inventory/v1/serial-number/{id}/` | Replace (all required fields) |
| `PATCH` | `/api/inventory/v1/serial-number/{id}/` | Partial update |
| `DELETE` | `/api/inventory/v1/serial-number/{id}/` | Delete (soft delete) |

**List query parameters**

| Query param | Meaning |
|---|---|
| `page`, `page_size` | Pagination (default 10, max 100). Total in `metadata.total_count`. |
| `dropdown=true` | Unpaginated short list with only: `id`, `serial_number` |
| `search` | Text search in: `serial_number` |
| `ordering` | Sort by `id`, `serial_number` (prefix `-` for descending) |

**Create body** (`POST`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `product_variant` | id (ProductVariant) | **yes** |  |
| `batch` | id (Batch) | no | nullable |
| `warehouse` | id (Warehouse) | no | nullable |
| `bin` | id (Bin) | no | nullable |
| `serial_number` | string | **yes** | max 100 chars |
| `status` | enum | no | one of: `in_stock`, `reserved`, `sold`, `returned`, `written_off`, `in_transit`, `lost`, `damaged` |
| `received_at` | datetime (ISO 8601) | no | nullable |
| `sold_at` | datetime (ISO 8601) | no | nullable |

_Update (`PUT`/`PATCH`) accepts the same fields; with `PATCH` every field is optional._

**Response object** (retrieve; create/update return the same shape)

| Field | Type | Notes |
|---|---|---|
| `id` | integer |  |
| `created_at` | datetime (ISO 8601) |  |
| `updated_at` | datetime (ISO 8601) |  |
| `created_by` | object | fields: id, email, first_name, last_name, date_joined |
| `updated_by` | object | fields: id, email, first_name, last_name, date_joined |
| `product_variant` | computed |  |
| `batch` | object | fields: id, created_at, updated_at, created_by, updated_by, name, product_variant, supplier, is_quarantined |
| `warehouse` | computed |  |
| `status` | string |  |
| `serial_number` | string |  |
| `received_at` | datetime (ISO 8601) | nullable |
| `sold_at` | datetime (ISO 8601) | nullable |
| `last_movement` | datetime (ISO 8601) |  |
| `bin` | id (Bin) |  |

**Examples** (real responses from the running API)

<details><summary>Example: list → <code>200</code></summary>

```http
GET /api/inventory/v1/serial-number/?page_size=2
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "created_at": "2026-10-04T00:49:53.216469+03:00",
      "updated_at": "2026-10-04T00:49:53.216486+03:00",
      "created_by": null,
      "updated_by": null,
      "product_variant": {
        "id": 23,
        "created_at": "2026-10-04T00:49:53.215717+03:00",
        "updated_at": "2026-10-04T00:49:53.215734+03:00",
        "created_by": null,
        "updated_by": null,
        "name": "",
        "product": {
          "id": 27,
          "created_at": "2026-10-04T00:49:53.215037+03:00",
          "updated_at": "2026-10-04T00:49:53.215053+03:00",
          "created_by": null,
          "updated_by": null,
          "name": "Product 26",
          "description": "",
          "product_type": "simple",
          "category": {
            "id": 29,
            "created_at": "2026-10-04T00:49:53.213738+03:00",
            "updated_at": "2026-10-04T00:49:53.213755+03:00",
            "created_by": null,
            "updated_by": null,
            "name": "Category 28",
            "parent": null,
            "description": "Yes form action play attack. Ball more fill director choice treat hospital try.\nEvidence player small alone. Much would already open.",
            "is_active": true
          },
          "brand": {
            "id": 29,
  … (truncated)
```

</details>

<details><summary>Example: Create serial number → <code>201</code></summary>

```http
POST /api/inventory/v1/serial-number/
```

Request body:

```json
{
  "product_variant": 1,
  "serial_number": "SN-0001",
  "warehouse": 1
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "created_at": "2026-10-04T00:57:36.999628+03:00",
    "updated_at": "2026-10-04T00:57:36.999683+03:00",
    "created_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:57:32.752930+03:00",
      "full_name": "Sara Ali"
    },
    "updated_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:57:32.752930+03:00",
      "full_name": "Sara Ali"
    },
    "product_variant": {
      "id": 1,
      "created_at": "2026-10-04T00:57:36.877457+03:00",
      "updated_at": "2026-10-04T00:57:36.877485+03:00",
      "created_by": null,
      "updated_by": null,
      "name": "",
      "product": {
        "id": 1,
        "created_at": "2026-10-04T00:57:36.866414+03:00",
        "updated_at": "2026-10-04T00:57:36.866471+03:00",
        "created_by": {
          "id": 1,
          "email": "admin@acme.example",
          "first_name": "Sara",
          "last_name": "Ali",
  … (truncated)
```

</details>

### Stock ledger

Every stock movement (receipt, issue, transfer, adjustment…). Current stock = sum of `quantity` per variant/warehouse.

**Access:** subscription module `inventory`.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/inventory/v1/stock-ledger/` | List |
| `POST` | `/api/inventory/v1/stock-ledger/` | Create |
| `GET` | `/api/inventory/v1/stock-ledger/{id}/` | Retrieve |
| `PUT` | `/api/inventory/v1/stock-ledger/{id}/` | Replace (all required fields) |
| `PATCH` | `/api/inventory/v1/stock-ledger/{id}/` | Partial update |
| `DELETE` | `/api/inventory/v1/stock-ledger/{id}/` | Delete (soft delete) |

**List query parameters**

| Query param | Meaning |
|---|---|
| `page`, `page_size` | Pagination (default 10, max 100). Total in `metadata.total_count`. |
| `dropdown=true` | Unpaginated short list with only: `id` |
| `search` | Text search in: `reference_type`, `reference_id` |
| `ordering` | Sort by `id`, `created_at` (prefix `-` for descending) |

**Create body** (`POST`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `product_variant` | id (ProductVariant) | **yes** |  |
| `warehouse` | id (Warehouse) | **yes** |  |
| `bin` | id (Bin) | no | nullable |
| `batch` | id (Batch) | no | nullable |
| `serial_number` | id (SerialNumber) | no | nullable |
| `transaction_type` | enum | **yes** | one of: `receipt`, `issue`, `transfer_out`, `transfer_in`, `adjustment`, `return`, `write_off`, `reservation`, `reservation_release`, `initial`, `repair` |
| `quantity` | decimal (string) | **yes** |  |
| `unit_cost` | decimal (string) | no | nullable |
| `total_cost` | decimal (string) | no | nullable |
| `reference_type` | string | no | max 50 chars |
| `reference_id` | uuid | no | nullable |
| `notes` | string | no |  |
| `metadata` | object/JSON | no |  |

_Update (`PUT`/`PATCH`) accepts the same fields; with `PATCH` every field is optional._

**Response object** (retrieve; create/update return the same shape)

| Field | Type | Notes |
|---|---|---|
| `id` | integer |  |
| `created_at` | datetime (ISO 8601) |  |
| `updated_at` | datetime (ISO 8601) |  |
| `created_by` | object | fields: id, email, first_name, last_name, date_joined |
| `updated_by` | object | fields: id, email, first_name, last_name, date_joined |
| `product_variant` | computed |  |
| `warehouse` | computed |  |
| `bin` | computed |  |
| `batch` | computed |  |
| `serial_number` | computed |  |
| `transaction_type` | string |  |
| `quantity` | decimal (string) |  |
| `unit_cost` | decimal (string) | nullable |
| `total_cost` | decimal (string) | nullable |
| `reference_type` | string |  |
| `reference_id` | uuid | nullable |
| `notes` | string |  |
| `metadata` | object/JSON |  |

**Examples** (real responses from the running API)

<details><summary>Example: list → <code>200</code></summary>

```http
GET /api/inventory/v1/stock-ledger/?page_size=2
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": 2,
      "created_at": "2026-10-04T00:49:53.241226+03:00",
      "updated_at": "2026-10-04T00:49:53.241242+03:00",
      "created_by": null,
      "updated_by": null,
      "product_variant": {
        "id": 28,
        "created_at": "2026-10-04T00:49:53.239980+03:00",
        "updated_at": "2026-10-04T00:49:53.239998+03:00",
        "created_by": null,
        "updated_by": null,
        "name": "",
        "product": {
          "id": 32,
          "created_at": "2026-10-04T00:49:53.239391+03:00",
          "updated_at": "2026-10-04T00:49:53.239409+03:00",
          "created_by": null,
          "updated_by": null,
          "name": "Product 31",
          "description": "",
          "product_type": "simple",
          "category": {
            "id": 34,
            "created_at": "2026-10-04T00:49:53.237802+03:00",
            "updated_at": "2026-10-04T00:49:53.237820+03:00",
            "created_by": null,
            "updated_by": null,
            "name": "Category 33",
            "parent": null,
            "description": "Happy entire fear put since behavior center. All human network suffer up.\nStore line American skin. Word compare next political. Through office leader to store adult career.",
            "is_active": true
          },
          "brand": {
            "id": 34,
  … (truncated)
```

</details>

<details><summary>Example: Create stock ledger entry → <code>201</code></summary>

```http
POST /api/inventory/v1/stock-ledger/
```

Request body:

```json
{
  "product_variant": 1,
  "warehouse": 1,
  "transaction_type": "initial",
  "quantity": "100",
  "unit_cost": "120.00"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "created_at": "2026-10-04T00:57:37.087268+03:00",
    "updated_at": "2026-10-04T00:57:37.087324+03:00",
    "created_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:57:32.752930+03:00",
      "full_name": "Sara Ali"
    },
    "updated_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:57:32.752930+03:00",
      "full_name": "Sara Ali"
    },
    "product_variant": {
      "id": 1,
      "created_at": "2026-10-04T00:57:36.877457+03:00",
      "updated_at": "2026-10-04T00:57:36.877485+03:00",
      "created_by": null,
      "updated_by": null,
      "name": "",
      "product": {
        "id": 1,
        "created_at": "2026-10-04T00:57:36.866414+03:00",
        "updated_at": "2026-10-04T00:57:36.866471+03:00",
        "created_by": {
          "id": 1,
          "email": "admin@acme.example",
          "first_name": "Sara",
          "last_name": "Ali",
  … (truncated)
```

</details>

### Stock snapshots

Point-in-time stock levels per variant/warehouse/bin.

**Access:** subscription module `inventory`.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/inventory/v1/stock-snapshot/` | List |
| `POST` | `/api/inventory/v1/stock-snapshot/` | Create |
| `GET` | `/api/inventory/v1/stock-snapshot/{id}/` | Retrieve |
| `PUT` | `/api/inventory/v1/stock-snapshot/{id}/` | Replace (all required fields) |
| `PATCH` | `/api/inventory/v1/stock-snapshot/{id}/` | Partial update |
| `DELETE` | `/api/inventory/v1/stock-snapshot/{id}/` | Delete (soft delete) |

**List query parameters**

| Query param | Meaning |
|---|---|
| `page`, `page_size` | Pagination (default 10, max 100). Total in `metadata.total_count`. |
| `dropdown=true` | Unpaginated short list with only: `id` |
| `search` | Text search in: `name_en`, `name_ar` |
| `ordering` | Sort by `id`, `snapshot_date` (prefix `-` for descending) |

**Create body** (`POST`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `product_variant` | id (ProductVariant) | **yes** |  |
| `warehouse` | id (Warehouse) | **yes** |  |
| `bin` | id (Bin) | no | nullable |
| `snapshot_date` | date (YYYY-MM-DD) | **yes** |  |
| `quantity_on_hand` | decimal (string) | **yes** |  |
| `quantity_reserved` | decimal (string) | no |  |
| `quantity_available` | decimal (string) | **yes** |  |
| `average_cost` | decimal (string) | no | nullable |

_Update (`PUT`/`PATCH`) accepts the same fields; with `PATCH` every field is optional._

**Response object** (retrieve; create/update return the same shape)

| Field | Type | Notes |
|---|---|---|
| `id` | integer |  |
| `created_at` | datetime (ISO 8601) |  |
| `updated_at` | datetime (ISO 8601) |  |
| `created_by` | object | fields: id, email, first_name, last_name, date_joined |
| `updated_by` | object | fields: id, email, first_name, last_name, date_joined |
| `product_variant` | computed |  |
| `warehouse` | computed |  |
| `bin` | computed |  |
| `snapshot_date` | date (YYYY-MM-DD) |  |
| `quantity_on_hand` | decimal (string) |  |
| `quantity_reserved` | decimal (string) |  |
| `quantity_available` | decimal (string) |  |
| `average_cost` | decimal (string) | nullable |

**Examples** (real responses from the running API)

<details><summary>Example: list → <code>200</code></summary>

```http
GET /api/inventory/v1/stock-snapshot/?page_size=2
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "created_at": "2026-10-04T00:49:54.608481+03:00",
      "updated_at": "2026-10-04T00:49:54.608500+03:00",
      "created_by": null,
      "updated_by": null,
      "product_variant": {
        "id": 31,
        "created_at": "2026-10-04T00:49:54.605341+03:00",
        "updated_at": "2026-10-04T00:49:54.605358+03:00",
        "created_by": null,
        "updated_by": null,
        "name": "",
        "product": {
          "id": 35,
          "created_at": "2026-10-04T00:49:54.604714+03:00",
          "updated_at": "2026-10-04T00:49:54.604732+03:00",
          "created_by": null,
          "updated_by": null,
          "name": "Product 34",
          "description": "",
          "product_type": "simple",
          "category": {
            "id": 37,
            "created_at": "2026-10-04T00:49:54.603247+03:00",
            "updated_at": "2026-10-04T00:49:54.603268+03:00",
            "created_by": null,
            "updated_by": null,
            "name": "Category 36",
            "parent": null,
            "description": "Officer six station decide concern seem may. Whether firm her sport deep central. Raise yourself quality open picture.",
            "is_active": true
          },
          "brand": {
            "id": 37,
  … (truncated)
```

</details>

<details><summary>Example: Create stock snapshot → <code>201</code></summary>

```http
POST /api/inventory/v1/stock-snapshot/
```

Request body:

```json
{
  "product_variant": 1,
  "warehouse": 1,
  "bin": 1,
  "snapshot_date": "2026-10-04",
  "quantity_on_hand": "100",
  "quantity_available": "100"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "created_at": "2026-10-04T00:57:37.195534+03:00",
    "updated_at": "2026-10-04T00:57:37.195584+03:00",
    "created_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:57:32.752930+03:00",
      "full_name": "Sara Ali"
    },
    "updated_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:57:32.752930+03:00",
      "full_name": "Sara Ali"
    },
    "product_variant": {
      "id": 1,
      "created_at": "2026-10-04T00:57:36.877457+03:00",
      "updated_at": "2026-10-04T00:57:36.877485+03:00",
      "created_by": null,
      "updated_by": null,
      "name": "",
      "product": {
        "id": 1,
        "created_at": "2026-10-04T00:57:36.866414+03:00",
        "updated_at": "2026-10-04T00:57:36.866471+03:00",
        "created_by": {
          "id": 1,
          "email": "admin@acme.example",
          "first_name": "Sara",
          "last_name": "Ali",
  … (truncated)
```

</details>

### Stock reservations

Quantity held for a document (e.g. a confirmed sales order).

**Access:** subscription module `inventory`.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/inventory/v1/stock-reservation/` | List |
| `POST` | `/api/inventory/v1/stock-reservation/` | Create |
| `GET` | `/api/inventory/v1/stock-reservation/{id}/` | Retrieve |
| `PUT` | `/api/inventory/v1/stock-reservation/{id}/` | Replace (all required fields) |
| `PATCH` | `/api/inventory/v1/stock-reservation/{id}/` | Partial update |
| `DELETE` | `/api/inventory/v1/stock-reservation/{id}/` | Delete (soft delete) |

**List query parameters**

| Query param | Meaning |
|---|---|
| `page`, `page_size` | Pagination (default 10, max 100). Total in `metadata.total_count`. |
| `dropdown=true` | Unpaginated short list with only: `id` |
| `search` | Text search in: `reference_type`, `reference_id` |
| `ordering` | Sort by `id`, `reserved_at` (prefix `-` for descending) |

**Create body** (`POST`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `product_variant` | id (ProductVariant) | **yes** |  |
| `warehouse` | id (Warehouse) | **yes** |  |
| `bin` | id (Bin) | no | nullable |
| `quantity` | decimal (string) | **yes** |  |
| `reference_type` | string | **yes** | max 50 chars |
| `reference_id` | uuid | **yes** |  |
| `expires_at` | datetime (ISO 8601) | no | nullable |
| `released_at` | datetime (ISO 8601) | no | nullable |
| `is_released` | boolean | no |  |

_Update (`PUT`/`PATCH`) accepts the same fields; with `PATCH` every field is optional._

**Response object** (retrieve; create/update return the same shape)

| Field | Type | Notes |
|---|---|---|
| `id` | integer |  |
| `created_at` | datetime (ISO 8601) |  |
| `updated_at` | datetime (ISO 8601) |  |
| `created_by` | object | fields: id, email, first_name, last_name, date_joined |
| `updated_by` | object | fields: id, email, first_name, last_name, date_joined |
| `product_variant` | computed |  |
| `warehouse` | computed |  |
| `bin` | computed |  |
| `reserved_by` | computed |  |
| `is_released` | boolean |  |
| `quantity` | decimal (string) |  |
| `reference_type` | string |  |
| `reference_id` | uuid |  |
| `reserved_at` | datetime (ISO 8601) |  |
| `expires_at` | datetime (ISO 8601) | nullable |
| `released_at` | datetime (ISO 8601) | nullable |

**Examples** (real responses from the running API)

<details><summary>Example: list → <code>200</code></summary>

```http
GET /api/inventory/v1/stock-reservation/?page_size=2
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "created_at": "2026-10-04T00:49:53.928786+03:00",
      "updated_at": "2026-10-04T00:49:53.928812+03:00",
      "created_by": null,
      "updated_by": null,
      "product_variant": {
        "id": 29,
        "created_at": "2026-10-04T00:49:53.244232+03:00",
        "updated_at": "2026-10-04T00:49:53.244249+03:00",
        "created_by": null,
        "updated_by": null,
        "name": "",
        "product": {
          "id": 33,
          "created_at": "2026-10-04T00:49:53.243688+03:00",
          "updated_at": "2026-10-04T00:49:53.243704+03:00",
          "created_by": null,
          "updated_by": null,
          "name": "Product 32",
          "description": "",
          "product_type": "simple",
          "category": {
            "id": 35,
            "created_at": "2026-10-04T00:49:53.242269+03:00",
            "updated_at": "2026-10-04T00:49:53.242287+03:00",
            "created_by": null,
            "updated_by": null,
            "name": "Category 34",
            "parent": null,
            "description": "Again trip security fund wall treatment myself. Ball evening and look.\nStop hour better available chance hit. Century system break still different history visit. Job onto ahead.",
            "is_active": true
          },
          "brand": {
            "id": 35,
  … (truncated)
```

</details>

<details><summary>Example: Create stock reservation → <code>201</code></summary>

```http
POST /api/inventory/v1/stock-reservation/
```

Request body:

```json
{
  "product_variant": 1,
  "warehouse": 1,
  "quantity": "5",
  "reference_type": "salesorder",
  "reference_id": "6f1c2d3e-0000-4000-8000-0000000000aa"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "created_at": "2026-10-04T00:57:37.327420+03:00",
    "updated_at": "2026-10-04T00:57:37.327474+03:00",
    "created_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:57:32.752930+03:00",
      "full_name": "Sara Ali"
    },
    "updated_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:57:32.752930+03:00",
      "full_name": "Sara Ali"
    },
    "product_variant": {
      "id": 1,
      "created_at": "2026-10-04T00:57:36.877457+03:00",
      "updated_at": "2026-10-04T00:57:36.877485+03:00",
      "created_by": null,
      "updated_by": null,
      "name": "",
      "product": {
        "id": 1,
        "created_at": "2026-10-04T00:57:36.866414+03:00",
        "updated_at": "2026-10-04T00:57:36.866471+03:00",
        "created_by": {
          "id": 1,
          "email": "admin@acme.example",
          "first_name": "Sara",
          "last_name": "Ali",
  … (truncated)
```

</details>

---

## Inventory — stock movements

Transfers between warehouses, adjustments and cycle counts. Each has header + lines + a workflow `action` endpoint.

### Stock transfers

Move stock from `source_warehouse` to `destination_warehouse`. Status flow: `draft → pending_approval → approved → in_transit → received` (or `cancelled`).

**Access:** subscription module `inventory`.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/inventory/v1/stock-transfer/` | List |
| `POST` | `/api/inventory/v1/stock-transfer/` | Create |
| `GET` | `/api/inventory/v1/stock-transfer/{id}/` | Retrieve |
| `PUT` | `/api/inventory/v1/stock-transfer/{id}/` | Replace (all required fields) |
| `PATCH` | `/api/inventory/v1/stock-transfer/{id}/` | Partial update |
| `DELETE` | `/api/inventory/v1/stock-transfer/{id}/` | Delete (soft delete) |
| `POST` | `/api/inventory/v1/stock-transfer/{id}/action/` | Workflow action on a stock transfer |

**List query parameters**

| Query param | Meaning |
|---|---|
| `page`, `page_size` | Pagination (default 10, max 100). Total in `metadata.total_count`. |
| `dropdown=true` | Unpaginated short list with only: `id`, `transfer_number` |
| `search` | Text search in: `transfer_number`, `carrier`, `tracking_number` |
| `ordering` | Sort by `id`, `requested_date`, `transfer_number` (prefix `-` for descending) |

**Create body** (`POST`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `source_warehouse` | id (Warehouse) | **yes** |  |
| `destination_warehouse` | id (Warehouse) | **yes** |  |
| `expected_delivery_date` | date (YYYY-MM-DD) | no | nullable |
| `carrier` | string | no | max 100 chars |
| `tracking_number` | string | no | max 100 chars |
| `shipped_date` | date (YYYY-MM-DD) | no | nullable |
| `received_date` | date (YYYY-MM-DD) | no | nullable |
| `notes` | string | no |  |
| `current_approval_stage` | id (ApprovalStage) | no | nullable |

_Update (`PUT`/`PATCH`) accepts the same fields; with `PATCH` every field is optional._

**Response object** (retrieve; create/update return the same shape)

| Field | Type | Notes |
|---|---|---|
| `id` | integer |  |
| `created_at` | datetime (ISO 8601) |  |
| `updated_at` | datetime (ISO 8601) |  |
| `created_by` | object | fields: id, email, first_name, last_name, date_joined |
| `updated_by` | object | fields: id, email, first_name, last_name, date_joined |
| `source_warehouse` | computed |  |
| `destination_warehouse` | computed |  |
| `requested_by` | computed |  |
| `status` | string |  |
| `transfer_number` | string |  |
| `requested_date` | date (YYYY-MM-DD) |  |
| `expected_delivery_date` | date (YYYY-MM-DD) | nullable |
| `carrier` | string |  |
| `tracking_number` | string |  |
| `shipped_date` | date (YYYY-MM-DD) | nullable |
| `received_date` | date (YYYY-MM-DD) | nullable |
| `notes` | string |  |
| `current_approval_stage` | id (ApprovalStage) |  |

**Examples** (real responses from the running API)

<details><summary>Example: list → <code>200</code></summary>

```http
GET /api/inventory/v1/stock-transfer/?page_size=2
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": 4,
      "created_at": "2026-10-04T00:49:57.549607+03:00",
      "updated_at": "2026-10-04T00:49:57.549643+03:00",
      "created_by": null,
      "updated_by": null,
      "source_warehouse": {
        "id": 53,
        "created_at": "2026-10-04T00:49:56.837106+03:00",
        "updated_at": "2026-10-04T00:49:56.837125+03:00",
        "created_by": null,
        "updated_by": null,
        "name": "Warehouse 52",
        "warehouse_type": "central",
        "location": null,
        "manager": null,
        "is_active": true,
        "allow_negative_stock": false,
        "use_bin_locations": false
      },
      "destination_warehouse": {
        "id": 54,
        "created_at": "2026-10-04T00:49:56.837712+03:00",
        "updated_at": "2026-10-04T00:49:56.837729+03:00",
        "created_by": null,
        "updated_by": null,
        "name": "Warehouse 53",
        "warehouse_type": "central",
        "location": null,
        "manager": null,
        "is_active": true,
        "allow_negative_stock": false,
        "use_bin_locations": false
      },
      "requested_by": {
  … (truncated)
```

</details>

<details><summary>Example: Create stock transfer → <code>201</code></summary>

```http
POST /api/inventory/v1/stock-transfer/
```

Request body:

```json
{
  "source_warehouse": 1,
  "destination_warehouse": 2,
  "notes": "Rebalance"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "created_at": "2026-10-04T00:57:37.837251+03:00",
    "updated_at": "2026-10-04T00:57:37.837308+03:00",
    "created_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:57:32.752930+03:00",
      "full_name": "Sara Ali"
    },
    "updated_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:57:32.752930+03:00",
      "full_name": "Sara Ali"
    },
    "source_warehouse": {
      "id": 1,
      "created_at": "2026-10-04T00:57:36.625349+03:00",
      "updated_at": "2026-10-04T00:57:36.625409+03:00",
      "created_by": {
        "id": 1,
        "email": "admin@acme.example",
        "first_name": "Sara",
        "last_name": "Ali",
        "date_joined": "2026-10-04T00:57:32.752930+03:00",
        "full_name": "Sara Ali"
      },
      "updated_by": {
        "id": 1,
        "email": "admin@acme.example",
        "first_name": "Sara",
  … (truncated)
```

</details>

#### `POST /api/inventory/v1/stock-transfer/{id}/action/` — Workflow action on a stock transfer

Body: `{"action": "<name>", …extra fields}`. The document is looked up in your company (404 otherwise).
Success → **200** with the updated document (same shape as retrieve). A wrong status or rule → **400** with the
reason in `error.message`; an unknown action → **400** listing `allowed_actions`.

`submit` sends a draft for approval: if an [approval workflow](#approval-workflows) matches, the document goes to
`pending_approval` and an approval request is opened (approve it through
[`approval-request/{id}/process/`](#post-apiinventoryv1approval-requestidprocess--approve--reject--escalate-a-request));
otherwise it waits in `pending_approval` for a direct `approve` / `reject` here.

| Action | Allowed from | Result | Extra body fields |
|---|---|---|---|
| `submit` | `draft` (needs ≥1 line, different warehouses) | `pending_approval` | — |
| `approve` | `pending_approval` | `approved` | — |
| `reject` | `pending_approval` | back to `draft` | `reason` (optional) |
| `ship` | `approved` | `in_transit`; stock leaves the source warehouse | `lines` (optional, default: everything requested) `[{"line_id": 1, "quantity": "5"}]`, `carrier`, `tracking_number` |
| `receive` | `in_transit`, `partial` | `received` (or `partial`); stock enters the destination | `lines` (optional, default: everything outstanding) `[{"line_id": 1, "quantity": "5"}]` |
| `cancel` | `draft`, `pending_approval`, `approved` | `cancelled` | — |

Status flow: draft → pending_approval → approved → in_transit → (partial →) received; cancelled. Reject returns it to draft.


### Stock transfer lines

**Access:** subscription module `inventory`.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/inventory/v1/stock-transfer-line/` | List |
| `POST` | `/api/inventory/v1/stock-transfer-line/` | Create |
| `GET` | `/api/inventory/v1/stock-transfer-line/{id}/` | Retrieve |
| `PUT` | `/api/inventory/v1/stock-transfer-line/{id}/` | Replace (all required fields) |
| `PATCH` | `/api/inventory/v1/stock-transfer-line/{id}/` | Partial update |
| `DELETE` | `/api/inventory/v1/stock-transfer-line/{id}/` | Delete (soft delete) |

**List query parameters**

| Query param | Meaning |
|---|---|
| `page`, `page_size` | Pagination (default 10, max 100). Total in `metadata.total_count`. |
| `dropdown=true` | Unpaginated short list with only: `id` |
| `search` | Text search in: `name_en`, `name_ar` |
| `ordering` | Sort by `id` (prefix `-` for descending) |
| `transfer` | Only the lines of this StockTransfer (id); a value that isn't an id → 400 |

**Create body** (`POST`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `transfer` | id (StockTransfer) | **yes** |  |
| `product_variant` | id (ProductVariant) | **yes** |  |
| `batch` | id (Batch) | no | nullable |
| `quantity_requested` | decimal (string) | **yes** |  |
| `quantity_shipped` | decimal (string) | no |  |
| `quantity_received` | decimal (string) | no |  |
| `notes` | string | no | max 255 chars |
| `serial_numbers` | array of ids (SerialNumber) | no |  |

_Update (`PUT`/`PATCH`) accepts the same fields; with `PATCH` every field is optional._

**Response object** (retrieve; create/update return the same shape)

| Field | Type | Notes |
|---|---|---|
| `id` | integer |  |
| `created_at` | datetime (ISO 8601) |  |
| `updated_at` | datetime (ISO 8601) |  |
| `created_by` | object | fields: id, email, first_name, last_name, date_joined |
| `updated_by` | object | fields: id, email, first_name, last_name, date_joined |
| `transfer` | object | fields: id, created_at, updated_at, created_by, updated_by, name, source_warehouse, destination_warehouse, requested_by, status |
| `product_variant` | computed |  |
| `batch` | computed |  |
| `quantity_requested` | decimal (string) |  |
| `quantity_shipped` | decimal (string) |  |
| `quantity_received` | decimal (string) |  |
| `notes` | string |  |
| `serial_numbers` | array of ids (SerialNumber) |  |

**Examples** (real responses from the running API)

<details><summary>Example: list → <code>200</code></summary>

```http
GET /api/inventory/v1/stock-transfer-line/?page_size=2
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": 2,
      "created_at": "2026-10-04T00:49:57.554299+03:00",
      "updated_at": "2026-10-04T00:49:57.554322+03:00",
      "created_by": null,
      "updated_by": null,
      "transfer": {
        "id": 4,
        "created_at": "2026-10-04T00:49:57.549607+03:00",
        "updated_at": "2026-10-04T00:49:57.549643+03:00",
        "created_by": null,
        "updated_by": null,
        "source_warehouse": {
          "id": 53,
          "created_at": "2026-10-04T00:49:56.837106+03:00",
          "updated_at": "2026-10-04T00:49:56.837125+03:00",
          "created_by": null,
          "updated_by": null,
          "name": "Warehouse 52",
          "warehouse_type": "central",
          "location": null,
          "manager": null,
          "is_active": true,
          "allow_negative_stock": false,
          "use_bin_locations": false
        },
        "destination_warehouse": {
          "id": 54,
          "created_at": "2026-10-04T00:49:56.837712+03:00",
          "updated_at": "2026-10-04T00:49:56.837729+03:00",
          "created_by": null,
          "updated_by": null,
          "name": "Warehouse 53",
          "warehouse_type": "central",
          "location": null,
  … (truncated)
```

</details>

<details><summary>Example: Add transfer line → <code>201</code></summary>

```http
POST /api/inventory/v1/stock-transfer-line/
```

Request body:

```json
{
  "transfer": 1,
  "product_variant": 1,
  "quantity_requested": "10"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "created_at": "2026-10-04T00:57:37.920732+03:00",
    "updated_at": "2026-10-04T00:57:37.920793+03:00",
    "created_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:57:32.752930+03:00",
      "full_name": "Sara Ali"
    },
    "updated_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:57:32.752930+03:00",
      "full_name": "Sara Ali"
    },
    "transfer": {
      "id": 1,
      "created_at": "2026-10-04T00:57:37.837251+03:00",
      "updated_at": "2026-10-04T00:57:37.837308+03:00",
      "created_by": {
        "id": 1,
        "email": "admin@acme.example",
        "first_name": "Sara",
        "last_name": "Ali",
        "date_joined": "2026-10-04T00:57:32.752930+03:00",
        "full_name": "Sara Ali"
      },
      "updated_by": {
        "id": 1,
        "email": "admin@acme.example",
        "first_name": "Sara",
  … (truncated)
```

</details>

### Stock adjustments

Correct stock for damage, theft, counts, etc. Status flow: `draft → pending → approved → posted`.

**Access:** subscription module `inventory`.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/inventory/v1/stock-adjustment/` | List |
| `POST` | `/api/inventory/v1/stock-adjustment/` | Create |
| `GET` | `/api/inventory/v1/stock-adjustment/{id}/` | Retrieve |
| `PUT` | `/api/inventory/v1/stock-adjustment/{id}/` | Replace (all required fields) |
| `PATCH` | `/api/inventory/v1/stock-adjustment/{id}/` | Partial update |
| `DELETE` | `/api/inventory/v1/stock-adjustment/{id}/` | Delete (soft delete) |
| `POST` | `/api/inventory/v1/stock-adjustment/{id}/action/` | Workflow action on a stock adjustment |

**List query parameters**

| Query param | Meaning |
|---|---|
| `page`, `page_size` | Pagination (default 10, max 100). Total in `metadata.total_count`. |
| `dropdown=true` | Unpaginated short list with only: `id`, `adjustment_number` |
| `search` | Text search in: `adjustment_number`, `notes` |
| `ordering` | Sort by `id`, `adjustment_date` (prefix `-` for descending) |

**Create body** (`POST`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `warehouse` | id (Warehouse) | **yes** |  |
| `reason` | enum | **yes** | one of: `count`, `damage`, `expiry`, `return`, `sample`, `theft`, `correction`, `write_off` |
| `notes` | string | no |  |
| `approved_by` | id (User) | no | nullable |

_Update (`PUT`/`PATCH`) accepts the same fields; with `PATCH` every field is optional._

**Response object** (retrieve; create/update return the same shape)

| Field | Type | Notes |
|---|---|---|
| `id` | integer |  |
| `created_at` | datetime (ISO 8601) |  |
| `updated_at` | datetime (ISO 8601) |  |
| `created_by` | computed |  |
| `updated_by` | object | fields: id, email, first_name, last_name, date_joined |
| `warehouse` | computed |  |
| `approved_by` | computed |  |
| `reason` | string |  |
| `status` | string |  |
| `adjustment_number` | string |  |
| `adjustment_date` | datetime (ISO 8601) |  |
| `notes` | string |  |

**Examples** (real responses from the running API)

<details><summary>Example: list → <code>200</code></summary>

```http
GET /api/inventory/v1/stock-adjustment/?page_size=2
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": 4,
      "created_at": "2026-10-04T00:49:53.228928+03:00",
      "updated_at": "2026-10-04T00:49:53.228944+03:00",
      "created_by": {},
      "updated_by": null,
      "warehouse": {
        "id": 38,
        "created_at": "2026-10-04T00:49:53.228440+03:00",
        "updated_at": "2026-10-04T00:49:53.228458+03:00",
        "created_by": null,
        "updated_by": null,
        "name": "Warehouse 37",
        "warehouse_type": "central",
        "location": null,
        "manager": null,
        "is_active": true,
        "allow_negative_stock": false,
        "use_bin_locations": false
      },
      "approved_by": null,
      "reason": "",
      "status": "draft"
    }
  ],
  "metadata": {
    "timestamp": "2026-10-03T21:50:22.602075Z",
    "version": "1.0",
    "total_count": 4
  }
}
```

</details>

<details><summary>Example: Create stock adjustment → <code>201</code></summary>

```http
POST /api/inventory/v1/stock-adjustment/
```

Request body:

```json
{
  "warehouse": 1,
  "reason": "damage",
  "notes": "Broken in handling"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "created_at": "2026-10-04T00:57:38.078702+03:00",
    "updated_at": "2026-10-04T00:57:38.078774+03:00",
    "created_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:57:32.752930+03:00",
      "full_name": "Sara Ali"
    },
    "updated_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:57:32.752930+03:00",
      "full_name": "Sara Ali"
    },
    "warehouse": {
      "id": 1,
      "created_at": "2026-10-04T00:57:36.625349+03:00",
      "updated_at": "2026-10-04T00:57:36.625409+03:00",
      "created_by": {
        "id": 1,
        "email": "admin@acme.example",
        "first_name": "Sara",
        "last_name": "Ali",
        "date_joined": "2026-10-04T00:57:32.752930+03:00",
        "full_name": "Sara Ali"
      },
      "updated_by": {
        "id": 1,
        "email": "admin@acme.example",
        "first_name": "Sara",
  … (truncated)
```

</details>

#### `POST /api/inventory/v1/stock-adjustment/{id}/action/` — Workflow action on a stock adjustment

Body: `{"action": "<name>", …extra fields}`. The document is looked up in your company (404 otherwise).
Success → **200** with the updated document (same shape as retrieve). A wrong status or rule → **400** with the
reason in `error.message`; an unknown action → **400** listing `allowed_actions`.

`submit` sends a draft for approval: if an [approval workflow](#approval-workflows) matches, the document goes to
`pending_approval` and an approval request is opened (approve it through
[`approval-request/{id}/process/`](#post-apiinventoryv1approval-requestidprocess--approve--reject--escalate-a-request));
otherwise it waits in `pending_approval` for a direct `approve` / `reject` here.

| Action | Allowed from | Result | Extra body fields |
|---|---|---|---|
| `submit` | `draft` (needs ≥1 line) | `pending` | — |
| `approve` | `pending` | `approved` | — |
| `reject` | `pending` | back to `draft` | `reason` (optional) |
| `post` | `approved` | `posted`; writes the stock ledger (a negative difference with reason `damage`, `expiry`, `theft` or `write_off` is a `write_off` entry) | — |

Status flow: draft → pending → approved → posted; reject returns it to draft.


### Stock adjustment lines

`current_quantity` (system) vs `new_quantity` (actual).

**Access:** subscription module `inventory`.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/inventory/v1/stock-adjustment-line/` | List |
| `POST` | `/api/inventory/v1/stock-adjustment-line/` | Create |
| `GET` | `/api/inventory/v1/stock-adjustment-line/{id}/` | Retrieve |
| `PUT` | `/api/inventory/v1/stock-adjustment-line/{id}/` | Replace (all required fields) |
| `PATCH` | `/api/inventory/v1/stock-adjustment-line/{id}/` | Partial update |
| `DELETE` | `/api/inventory/v1/stock-adjustment-line/{id}/` | Delete (soft delete) |

**List query parameters**

| Query param | Meaning |
|---|---|
| `page`, `page_size` | Pagination (default 10, max 100). Total in `metadata.total_count`. |
| `dropdown=true` | Unpaginated short list with only: `id` |
| `search` | Text search in: `name_en`, `name_ar` |
| `ordering` | Sort by `id` (prefix `-` for descending) |
| `adjustment` | Only the lines of this StockAdjustment (id); a value that isn't an id → 400 |

**Create body** (`POST`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `adjustment` | id (StockAdjustment) | **yes** |  |
| `product_variant` | id (ProductVariant) | **yes** |  |
| `bin` | id (Bin) | no | nullable |
| `batch` | id (Batch) | no | nullable |
| `serial_number` | id (SerialNumber) | no | nullable |
| `current_quantity` | decimal (string) | **yes** |  |
| `new_quantity` | decimal (string) | **yes** |  |
| `unit_cost` | decimal (string) | no | nullable |
| `total_cost` | decimal (string) | no | nullable |
| `notes` | string | no | max 255 chars |

_Update (`PUT`/`PATCH`) accepts the same fields; with `PATCH` every field is optional._

**Response object** (retrieve; create/update return the same shape)

| Field | Type | Notes |
|---|---|---|
| `id` | integer |  |
| `created_at` | datetime (ISO 8601) |  |
| `updated_at` | datetime (ISO 8601) |  |
| `created_by` | object | fields: id, email, first_name, last_name, date_joined |
| `updated_by` | object | fields: id, email, first_name, last_name, date_joined |
| `adjustment` | object | fields: id, created_at, updated_at, created_by, updated_by, name, warehouse, approved_by, reason, status |
| `product_variant` | computed |  |
| `bin` | computed |  |
| `batch` | computed |  |
| `serial_number` | computed |  |
| `current_quantity` | decimal (string) |  |
| `new_quantity` | decimal (string) |  |
| `difference` | decimal (string) |  |
| `unit_cost` | decimal (string) | nullable |
| `total_cost` | decimal (string) | nullable |
| `notes` | string |  |

**Examples** (real responses from the running API)

<details><summary>Example: list → <code>200</code></summary>

```http
GET /api/inventory/v1/stock-adjustment-line/?page_size=2
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": 2,
      "created_at": "2026-10-04T00:49:53.232268+03:00",
      "updated_at": "2026-10-04T00:49:53.232285+03:00",
      "created_by": null,
      "updated_by": null,
      "adjustment": {
        "id": 4,
        "created_at": "2026-10-04T00:49:53.228928+03:00",
        "updated_at": "2026-10-04T00:49:53.228944+03:00",
        "created_by": {},
        "updated_by": null,
        "warehouse": {
          "id": 38,
          "created_at": "2026-10-04T00:49:53.228440+03:00",
          "updated_at": "2026-10-04T00:49:53.228458+03:00",
          "created_by": null,
          "updated_by": null,
          "name": "Warehouse 37",
          "warehouse_type": "central",
          "location": null,
          "manager": null,
          "is_active": true,
          "allow_negative_stock": false,
          "use_bin_locations": false
        },
        "approved_by": null,
        "reason": "",
        "status": "draft"
      },
      "product_variant": {
        "id": 26,
        "created_at": "2026-10-04T00:49:53.231723+03:00",
        "updated_at": "2026-10-04T00:49:53.231739+03:00",
        "created_by": null,
  … (truncated)
```

</details>

<details><summary>Example: Add adjustment line → <code>201</code></summary>

```http
POST /api/inventory/v1/stock-adjustment-line/
```

Request body:

```json
{
  "adjustment": 1,
  "product_variant": 1,
  "current_quantity": "100",
  "new_quantity": "98"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "created_at": "2026-10-04T00:57:38.159905+03:00",
    "updated_at": "2026-10-04T00:57:38.160002+03:00",
    "created_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:57:32.752930+03:00",
      "full_name": "Sara Ali"
    },
    "updated_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:57:32.752930+03:00",
      "full_name": "Sara Ali"
    },
    "adjustment": {
      "id": 1,
      "created_at": "2026-10-04T00:57:38.078702+03:00",
      "updated_at": "2026-10-04T00:57:38.078774+03:00",
      "created_by": {
        "id": 1,
        "email": "admin@acme.example",
        "first_name": "Sara",
        "last_name": "Ali",
        "date_joined": "2026-10-04T00:57:32.752930+03:00",
        "full_name": "Sara Ali"
      },
      "updated_by": {
        "id": 1,
        "email": "admin@acme.example",
        "first_name": "Sara",
  … (truncated)
```

</details>

### Cycle counts

Scheduled physical counts. Status flow: `scheduled → in_progress → completed → approved` (or `cancelled`).

**Access:** subscription module `inventory`.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/inventory/v1/cycle-count/` | List |
| `POST` | `/api/inventory/v1/cycle-count/` | Create |
| `GET` | `/api/inventory/v1/cycle-count/{id}/` | Retrieve |
| `PUT` | `/api/inventory/v1/cycle-count/{id}/` | Replace (all required fields) |
| `PATCH` | `/api/inventory/v1/cycle-count/{id}/` | Partial update |
| `DELETE` | `/api/inventory/v1/cycle-count/{id}/` | Delete (soft delete) |
| `POST` | `/api/inventory/v1/cycle-count/{id}/action/` | Workflow action on a cycle count |

**List query parameters**

| Query param | Meaning |
|---|---|
| `page`, `page_size` | Pagination (default 10, max 100). Total in `metadata.total_count`. |
| `dropdown=true` | Unpaginated short list with only: `id`, `count_number` |
| `search` | Text search in: `count_number`, `notes` |
| `ordering` | Sort by `id`, `scheduled_date` (prefix `-` for descending) |

**Create body** (`POST`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `warehouse` | id (Warehouse) | **yes** |  |
| `zone` | id (Zone) | no | nullable |
| `scheduled_date` | date (YYYY-MM-DD) | **yes** |  |
| `notes` | string | no |  |
| `approved_by` | id (User) | no | nullable |

_Update (`PUT`/`PATCH`) accepts the same fields; with `PATCH` every field is optional._

**Response object** (retrieve; create/update return the same shape)

| Field | Type | Notes |
|---|---|---|
| `id` | integer |  |
| `created_at` | datetime (ISO 8601) |  |
| `updated_at` | datetime (ISO 8601) |  |
| `created_by` | object | fields: id, email, first_name, last_name, date_joined |
| `updated_by` | object | fields: id, email, first_name, last_name, date_joined |
| `warehouse` | computed |  |
| `zone` | computed |  |
| `counted_by` | computed |  |
| `approved_by` | computed |  |
| `status` | string |  |
| `count_number` | string |  |
| `scheduled_date` | date (YYYY-MM-DD) |  |
| `notes` | string |  |

**Examples** (real responses from the running API)

<details><summary>Example: list → <code>200</code></summary>

```http
GET /api/inventory/v1/cycle-count/?page_size=2
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": 4,
      "created_at": "2026-10-04T00:49:40.227489+03:00",
      "updated_at": "2026-10-04T00:49:40.227528+03:00",
      "created_by": null,
      "updated_by": null,
      "warehouse": {
        "id": 7,
        "created_at": "2026-10-04T00:49:39.445147+03:00",
        "updated_at": "2026-10-04T00:49:39.445164+03:00",
        "created_by": null,
        "updated_by": null,
        "name": "Warehouse 6",
        "warehouse_type": "central",
        "location": null,
        "manager": null,
        "is_active": true,
        "allow_negative_stock": false,
        "use_bin_locations": false
      },
      "zone": null,
      "counted_by": {
        "id": 7,
        "email": "user6@example.com",
        "first_name": "Ashley",
        "last_name": "Thompson",
        "date_joined": "2026-10-04T00:49:40.225982+03:00",
        "full_name": "Ashley Thompson"
      },
      "approved_by": null,
      "status": "scheduled"
    }
  ],
  "metadata": {
    "timestamp": "2026-10-03T21:50:22.902658Z",
  … (truncated)
```

</details>

<details><summary>Example: Create cycle count → <code>201</code></summary>

```http
POST /api/inventory/v1/cycle-count/
```

Request body:

```json
{
  "warehouse": 1,
  "scheduled_date": "2026-10-10",
  "zone": 1
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "created_at": "2026-10-04T00:57:38.250275+03:00",
    "updated_at": "2026-10-04T00:57:38.250329+03:00",
    "created_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:57:32.752930+03:00",
      "full_name": "Sara Ali"
    },
    "updated_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:57:32.752930+03:00",
      "full_name": "Sara Ali"
    },
    "warehouse": {
      "id": 1,
      "created_at": "2026-10-04T00:57:36.625349+03:00",
      "updated_at": "2026-10-04T00:57:36.625409+03:00",
      "created_by": {
        "id": 1,
        "email": "admin@acme.example",
        "first_name": "Sara",
        "last_name": "Ali",
        "date_joined": "2026-10-04T00:57:32.752930+03:00",
        "full_name": "Sara Ali"
      },
      "updated_by": {
        "id": 1,
        "email": "admin@acme.example",
        "first_name": "Sara",
  … (truncated)
```

</details>

#### `POST /api/inventory/v1/cycle-count/{id}/action/` — Workflow action on a cycle count

Body: `{"action": "<name>", …extra fields}`. The document is looked up in your company (404 otherwise).
Success → **200** with the updated document (same shape as retrieve). A wrong status or rule → **400** with the
reason in `error.message`; an unknown action → **400** listing `allowed_actions`.


| Action | Allowed from | Result | Extra body fields |
|---|---|---|---|
| `start` | `scheduled` | `in_progress`; count lines are generated from current stock | — |
| `record` | `in_progress` | stays `in_progress` | `counts`: `[{"line_id": 1, "counted_quantity": "9"}]` |
| `complete` | `in_progress` | `completed` | — |
| `approve` | `completed` | `approved`; variances are posted to the ledger | — |
| `cancel` | `scheduled`, `in_progress` | `cancelled` | — |

Status flow: scheduled → in_progress → completed → approved; cancelled.


### Cycle count lines

`system_quantity` vs `counted_quantity` per bin.

**Access:** subscription module `inventory`.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/inventory/v1/cycle-count-line/` | List |
| `POST` | `/api/inventory/v1/cycle-count-line/` | Create |
| `GET` | `/api/inventory/v1/cycle-count-line/{id}/` | Retrieve |
| `PUT` | `/api/inventory/v1/cycle-count-line/{id}/` | Replace (all required fields) |
| `PATCH` | `/api/inventory/v1/cycle-count-line/{id}/` | Partial update |
| `DELETE` | `/api/inventory/v1/cycle-count-line/{id}/` | Delete (soft delete) |

**List query parameters**

| Query param | Meaning |
|---|---|
| `page`, `page_size` | Pagination (default 10, max 100). Total in `metadata.total_count`. |
| `dropdown=true` | Unpaginated short list with only: `id` |
| `search` | Text search in: `name_en`, `name_ar` |
| `ordering` | Sort by `id` (prefix `-` for descending) |
| `cycle_count` | Only the lines of this CycleCount (id); a value that isn't an id → 400 |

**Create body** (`POST`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `cycle_count` | id (CycleCount) | **yes** |  |
| `product_variant` | id (ProductVariant) | **yes** |  |
| `bin` | id (Bin) | **yes** |  |
| `batch` | id (Batch) | no | nullable |
| `system_quantity` | decimal (string) | **yes** |  |
| `counted_quantity` | decimal (string) | no | nullable |
| `is_counted` | boolean | no |  |
| `notes` | string | no | max 255 chars |

_Update (`PUT`/`PATCH`) accepts the same fields; with `PATCH` every field is optional._

**Response object** (retrieve; create/update return the same shape)

| Field | Type | Notes |
|---|---|---|
| `id` | integer |  |
| `created_at` | datetime (ISO 8601) |  |
| `updated_at` | datetime (ISO 8601) |  |
| `created_by` | object | fields: id, email, first_name, last_name, date_joined |
| `updated_by` | object | fields: id, email, first_name, last_name, date_joined |
| `cycle_count` | object | fields: id, created_at, updated_at, created_by, updated_by, name, warehouse, zone, counted_by, approved_by, status |
| `product_variant` | computed |  |
| `bin` | computed |  |
| `batch` | computed |  |
| `is_counted` | boolean |  |
| `system_quantity` | decimal (string) |  |
| `counted_quantity` | decimal (string) | nullable |
| `variance` | decimal (string) |  |
| `notes` | string |  |

**Examples** (real responses from the running API)

<details><summary>Example: list → <code>200</code></summary>

```http
GET /api/inventory/v1/cycle-count-line/?page_size=2
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": 2,
      "created_at": "2026-10-04T00:49:40.236038+03:00",
      "updated_at": "2026-10-04T00:49:40.236062+03:00",
      "created_by": null,
      "updated_by": null,
      "cycle_count": {
        "id": 4,
        "created_at": "2026-10-04T00:49:40.227489+03:00",
        "updated_at": "2026-10-04T00:49:40.227528+03:00",
        "created_by": null,
        "updated_by": null,
        "warehouse": {
          "id": 7,
          "created_at": "2026-10-04T00:49:39.445147+03:00",
          "updated_at": "2026-10-04T00:49:39.445164+03:00",
          "created_by": null,
          "updated_by": null,
          "name": "Warehouse 6",
          "warehouse_type": "central",
          "location": null,
          "manager": null,
          "is_active": true,
          "allow_negative_stock": false,
          "use_bin_locations": false
        },
        "zone": null,
        "counted_by": {
          "id": 7,
          "email": "user6@example.com",
          "first_name": "Ashley",
          "last_name": "Thompson",
          "date_joined": "2026-10-04T00:49:40.225982+03:00",
          "full_name": "Ashley Thompson"
        },
  … (truncated)
```

</details>

<details><summary>Example: Add cycle count line → <code>201</code></summary>

```http
POST /api/inventory/v1/cycle-count-line/
```

Request body:

```json
{
  "cycle_count": 1,
  "product_variant": 1,
  "bin": 1,
  "system_quantity": "100",
  "counted_quantity": "98"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "created_at": "2026-10-04T00:57:38.386171+03:00",
    "updated_at": "2026-10-04T00:57:38.386224+03:00",
    "created_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:57:32.752930+03:00",
      "full_name": "Sara Ali"
    },
    "updated_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:57:32.752930+03:00",
      "full_name": "Sara Ali"
    },
    "cycle_count": {
      "id": 1,
      "created_at": "2026-10-04T00:57:38.250275+03:00",
      "updated_at": "2026-10-04T00:57:38.250329+03:00",
      "created_by": {
        "id": 1,
        "email": "admin@acme.example",
        "first_name": "Sara",
        "last_name": "Ali",
        "date_joined": "2026-10-04T00:57:32.752930+03:00",
        "full_name": "Sara Ali"
      },
      "updated_by": {
        "id": 1,
        "email": "admin@acme.example",
        "first_name": "Sara",
  … (truncated)
```

</details>

---

## Inventory — procurement

Requisition → Purchase order → Goods receipt → Supplier invoice.

### Purchase requisitions

Internal request to buy. Status flow: `draft → pending_approval → approved → ordered` (or `rejected` / `cancelled`).

**Access:** subscription module `inventory`.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/inventory/v1/purchase-requisition/` | List |
| `POST` | `/api/inventory/v1/purchase-requisition/` | Create |
| `GET` | `/api/inventory/v1/purchase-requisition/{id}/` | Retrieve |
| `PUT` | `/api/inventory/v1/purchase-requisition/{id}/` | Replace (all required fields) |
| `PATCH` | `/api/inventory/v1/purchase-requisition/{id}/` | Partial update |
| `DELETE` | `/api/inventory/v1/purchase-requisition/{id}/` | Delete (soft delete) |
| `POST` | `/api/inventory/v1/purchase-requisition/{id}/action/` | Workflow action on a purchase requisition |

**List query parameters**

| Query param | Meaning |
|---|---|
| `page`, `page_size` | Pagination (default 10, max 100). Total in `metadata.total_count`. |
| `dropdown=true` | Unpaginated short list with only: `id`, `requisition_number` |
| `search` | Text search in: `requisition_number`, `notes` |
| `ordering` | Sort by `id`, `date_requested` (prefix `-` for descending) |

**Create body** (`POST`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `department` | id (Department) | no | nullable |
| `supplier` | id (Supplier) | no | nullable |
| `warehouse` | id (Warehouse) | **yes** |  |
| `required_date` | date (YYYY-MM-DD) | no | nullable |
| `estimated_total` | decimal (string) | no | nullable |
| `currency` | string | no | max 3 chars |
| `notes` | string | no |  |
| `custom_fields` | object/JSON | no |  |
| `current_approval_stage` | id (ApprovalStage) | no | nullable |

_Update (`PUT`/`PATCH`) accepts the same fields; with `PATCH` every field is optional._

**Response object** (retrieve; create/update return the same shape)

| Field | Type | Notes |
|---|---|---|
| `id` | integer |  |
| `created_at` | datetime (ISO 8601) |  |
| `updated_at` | datetime (ISO 8601) |  |
| `created_by` | object | fields: id, email, first_name, last_name, date_joined |
| `updated_by` | object | fields: id, email, first_name, last_name, date_joined |
| `requester` | computed |  |
| `department` | computed |  |
| `supplier` | computed |  |
| `warehouse` | computed |  |
| `status` | string |  |
| `requisition_number` | string |  |
| `date_requested` | date (YYYY-MM-DD) |  |
| `required_date` | date (YYYY-MM-DD) | nullable |
| `estimated_total` | decimal (string) | nullable |
| `currency` | string |  |
| `notes` | string |  |
| `custom_fields` | object/JSON |  |
| `current_approval_stage` | id (ApprovalStage) |  |

**Examples** (real responses from the running API)

<details><summary>Example: list → <code>200</code></summary>

```http
GET /api/inventory/v1/purchase-requisition/?page_size=2
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": 4,
      "created_at": "2026-10-04T00:49:53.190222+03:00",
      "updated_at": "2026-10-04T00:49:53.190238+03:00",
      "created_by": null,
      "updated_by": null,
      "requester": {
        "id": 25,
        "email": "user24@example.com",
        "first_name": "Joy",
        "last_name": "Jones",
        "date_joined": "2026-10-04T00:49:53.188628+03:00",
        "full_name": "Joy Jones"
      },
      "department": {
        "id": 7,
        "name_en": "Department 6",
        "name_ar": null,
        "parent": null,
        "manager": null,
        "created_by": null,
        "updated_by": null
      },
      "supplier": null,
      "warehouse": {
        "id": 30,
        "created_at": "2026-10-04T00:49:52.483180+03:00",
        "updated_at": "2026-10-04T00:49:52.483198+03:00",
        "created_by": null,
        "updated_by": null,
        "name": "Warehouse 29",
        "warehouse_type": "central",
        "location": null,
        "manager": null,
        "is_active": true,
  … (truncated)
```

</details>

<details><summary>Example: Create purchase requisition → <code>201</code></summary>

```http
POST /api/inventory/v1/purchase-requisition/
```

Request body:

```json
{
  "warehouse": 1,
  "supplier": 1,
  "required_date": "2026-10-20",
  "notes": "Q4 restock"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "created_at": "2026-10-04T00:57:38.571181+03:00",
    "updated_at": "2026-10-04T00:57:38.571234+03:00",
    "created_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:57:32.752930+03:00",
      "full_name": "Sara Ali"
    },
    "updated_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:57:32.752930+03:00",
      "full_name": "Sara Ali"
    },
    "requester": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:57:32.752930+03:00",
      "full_name": "Sara Ali"
    },
    "department": null,
    "supplier": {
      "id": 1,
      "created_at": "2026-10-04T00:57:36.891163+03:00",
      "updated_at": "2026-10-04T00:57:36.891218+03:00",
      "created_by": {
        "id": 1,
        "email": "admin@acme.example",
  … (truncated)
```

</details>

#### `POST /api/inventory/v1/purchase-requisition/{id}/action/` — Workflow action on a purchase requisition

Body: `{"action": "<name>", …extra fields}`. The document is looked up in your company (404 otherwise).
Success → **200** with the updated document (same shape as retrieve). A wrong status or rule → **400** with the
reason in `error.message`; an unknown action → **400** listing `allowed_actions`.

`submit` sends a draft for approval: if an [approval workflow](#approval-workflows) matches, the document goes to
`pending_approval` and an approval request is opened (approve it through
[`approval-request/{id}/process/`](#post-apiinventoryv1approval-requestidprocess--approve--reject--escalate-a-request));
otherwise it waits in `pending_approval` for a direct `approve` / `reject` here.

| Action | Allowed from | Result | Extra body fields |
|---|---|---|---|
| `submit` | `draft` | `pending_approval` | — |
| `approve` | `pending_approval` | `approved` | — |
| `reject` | `pending_approval` | `rejected` | `reason` (optional) |
| `convert_to_order` | `approved` | `ordered`; returns the new purchase order (**201**, purchase-order shape) | `supplier` (id, optional when the lines carry one) |
| `mark_ordered` | `approved` | `ordered` (without creating an order) | — |
| `cancel` | `draft`, `pending_approval` | `cancelled` | — |

Status flow: draft → pending_approval → approved → ordered; rejected / cancelled.


### Requisition lines

**Access:** subscription module `inventory`.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/inventory/v1/purchase-requisition-line/` | List |
| `POST` | `/api/inventory/v1/purchase-requisition-line/` | Create |
| `GET` | `/api/inventory/v1/purchase-requisition-line/{id}/` | Retrieve |
| `PUT` | `/api/inventory/v1/purchase-requisition-line/{id}/` | Replace (all required fields) |
| `PATCH` | `/api/inventory/v1/purchase-requisition-line/{id}/` | Partial update |
| `DELETE` | `/api/inventory/v1/purchase-requisition-line/{id}/` | Delete (soft delete) |

**List query parameters**

| Query param | Meaning |
|---|---|
| `page`, `page_size` | Pagination (default 10, max 100). Total in `metadata.total_count`. |
| `dropdown=true` | Unpaginated short list with only: `id` |
| `search` | Text search in: `name_en`, `name_ar` |
| `ordering` | Sort by `id` (prefix `-` for descending) |
| `requisition` | Only the lines of this PurchaseRequisition (id); a value that isn't an id → 400 |

**Create body** (`POST`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `requisition` | id (PurchaseRequisition) | **yes** |  |
| `product_variant` | id (ProductVariant) | **yes** |  |
| `quantity` | decimal (string) | **yes** |  |
| `estimated_unit_cost` | decimal (string) | no | nullable |
| `estimated_total` | decimal (string) | no | nullable |
| `notes` | string | no | max 255 chars |

_Update (`PUT`/`PATCH`) accepts the same fields; with `PATCH` every field is optional._

**Response object** (retrieve; create/update return the same shape)

| Field | Type | Notes |
|---|---|---|
| `id` | integer |  |
| `created_at` | datetime (ISO 8601) |  |
| `updated_at` | datetime (ISO 8601) |  |
| `created_by` | object | fields: id, email, first_name, last_name, date_joined |
| `updated_by` | object | fields: id, email, first_name, last_name, date_joined |
| `requisition` | object | fields: id, created_at, updated_at, created_by, updated_by, name, requester, department, supplier, warehouse, status |
| `product_variant` | computed |  |
| `quantity` | decimal (string) |  |
| `estimated_unit_cost` | decimal (string) | nullable |
| `estimated_total` | decimal (string) | nullable |
| `notes` | string |  |

**Examples** (real responses from the running API)

<details><summary>Example: list → <code>200</code></summary>

```http
GET /api/inventory/v1/purchase-requisition-line/?page_size=2
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": 2,
      "created_at": "2026-10-04T00:49:53.195394+03:00",
      "updated_at": "2026-10-04T00:49:53.195411+03:00",
      "created_by": null,
      "updated_by": null,
      "requisition": {
        "id": 4,
        "created_at": "2026-10-04T00:49:53.190222+03:00",
        "updated_at": "2026-10-04T00:49:53.190238+03:00",
        "created_by": null,
        "updated_by": null,
        "requester": {
          "id": 25,
          "email": "user24@example.com",
          "first_name": "Joy",
          "last_name": "Jones",
          "date_joined": "2026-10-04T00:49:53.188628+03:00",
          "full_name": "Joy Jones"
        },
        "department": {
          "id": 7,
          "name_en": "Department 6",
          "name_ar": null,
          "parent": null,
          "manager": null,
          "created_by": null,
          "updated_by": null
        },
        "supplier": null,
        "warehouse": {
          "id": 30,
          "created_at": "2026-10-04T00:49:52.483180+03:00",
          "updated_at": "2026-10-04T00:49:52.483198+03:00",
          "created_by": null,
  … (truncated)
```

</details>

<details><summary>Example: Add requisition line → <code>201</code></summary>

```http
POST /api/inventory/v1/purchase-requisition-line/
```

Request body:

```json
{
  "requisition": 1,
  "product_variant": 1,
  "quantity": "50",
  "estimated_unit_cost": "120.00"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "created_at": "2026-10-04T00:57:38.657624+03:00",
    "updated_at": "2026-10-04T00:57:38.657692+03:00",
    "created_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:57:32.752930+03:00",
      "full_name": "Sara Ali"
    },
    "updated_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:57:32.752930+03:00",
      "full_name": "Sara Ali"
    },
    "requisition": {
      "id": 1,
      "created_at": "2026-10-04T00:57:38.571181+03:00",
      "updated_at": "2026-10-04T00:57:38.571234+03:00",
      "created_by": {
        "id": 1,
        "email": "admin@acme.example",
        "first_name": "Sara",
        "last_name": "Ali",
        "date_joined": "2026-10-04T00:57:32.752930+03:00",
        "full_name": "Sara Ali"
      },
      "updated_by": {
        "id": 1,
        "email": "admin@acme.example",
        "first_name": "Sara",
  … (truncated)
```

</details>

### Purchase orders

Order sent to a supplier. Status flow: `draft → pending_approval → approved → sent → confirmed → shipped → partial/received` (or `cancelled`).

**Access:** subscription module `inventory`.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/inventory/v1/purchase-order/` | List |
| `POST` | `/api/inventory/v1/purchase-order/` | Create |
| `GET` | `/api/inventory/v1/purchase-order/{id}/` | Retrieve |
| `PUT` | `/api/inventory/v1/purchase-order/{id}/` | Replace (all required fields) |
| `PATCH` | `/api/inventory/v1/purchase-order/{id}/` | Partial update |
| `DELETE` | `/api/inventory/v1/purchase-order/{id}/` | Delete (soft delete) |
| `POST` | `/api/inventory/v1/purchase-order/{id}/action/` | Workflow action on a purchase order |

**List query parameters**

| Query param | Meaning |
|---|---|
| `page`, `page_size` | Pagination (default 10, max 100). Total in `metadata.total_count`. |
| `dropdown=true` | Unpaginated short list with only: `id`, `po_number` |
| `search` | Text search in: `po_number`, `supplier_reference`, `notes` |
| `ordering` | Sort by `id`, `order_date` (prefix `-` for descending) |

**Create body** (`POST`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `supplier` | id (Supplier) | **yes** |  |
| `requisition` | id (PurchaseRequisition) | no | nullable |
| `department` | id (Department) | no | nullable |
| `warehouse` | id (Warehouse) | **yes** |  |
| `expected_date` | date (YYYY-MM-DD) | no | nullable |
| `subtotal` | decimal (string) | no |  |
| `tax_amount` | decimal (string) | no |  |
| `total_amount` | decimal (string) | no |  |
| `currency` | string | no | max 3 chars |
| `supplier_reference` | string | no | max 100 chars |
| `payment_terms` | string | no | max 100 chars |
| `shipping_method` | string | no | max 100 chars |
| `terms` | string | no |  |
| `notes` | string | no |  |
| `custom_fields` | object/JSON | no |  |
| `current_approval_stage` | id (ApprovalStage) | no | nullable |

_Update (`PUT`/`PATCH`) accepts the same fields; with `PATCH` every field is optional._

**Response object** (retrieve; create/update return the same shape)

| Field | Type | Notes |
|---|---|---|
| `id` | integer |  |
| `created_at` | datetime (ISO 8601) |  |
| `updated_at` | datetime (ISO 8601) |  |
| `created_by` | object | fields: id, email, first_name, last_name, date_joined |
| `updated_by` | object | fields: id, email, first_name, last_name, date_joined |
| `supplier` | computed |  |
| `requisition` | computed |  |
| `buyer` | computed |  |
| `department` | computed |  |
| `warehouse` | computed |  |
| `status` | string |  |
| `po_number` | string |  |
| `order_date` | date (YYYY-MM-DD) |  |
| `expected_date` | date (YYYY-MM-DD) | nullable |
| `subtotal` | decimal (string) |  |
| `tax_amount` | decimal (string) |  |
| `total_amount` | decimal (string) |  |
| `currency` | string |  |
| `supplier_reference` | string |  |
| `payment_terms` | string |  |
| `shipping_method` | string |  |
| `terms` | string |  |
| `notes` | string |  |
| `custom_fields` | object/JSON |  |
| `version` | integer |  |
| `current_approval_stage` | id (ApprovalStage) |  |

**Examples** (real responses from the running API)

<details><summary>Example: list → <code>200</code></summary>

```http
GET /api/inventory/v1/purchase-order/?page_size=2
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": 10,
      "created_at": "2026-10-04T00:49:50.245602+03:00",
      "updated_at": "2026-10-04T00:49:50.245622+03:00",
      "created_by": null,
      "updated_by": null,
      "supplier": {
        "id": 10,
        "created_at": "2026-10-04T00:49:49.553235+03:00",
        "updated_at": "2026-10-04T00:49:49.553252+03:00",
        "created_by": null,
        "updated_by": null,
        "name": "Supplier 9",
        "supplier_type": "distributor",
        "is_active": true,
        "is_preferred": false,
        "lead_time_days": 0,
        "credit_limit": null
      },
      "requisition": null,
      "buyer": {
        "id": 21,
        "email": "user20@example.com",
        "first_name": "Ronald",
        "last_name": "Shannon",
        "date_joined": "2026-10-04T00:49:50.243822+03:00",
        "full_name": "Ronald Shannon"
      },
      "department": null,
      "warehouse": {
        "id": 26,
        "created_at": "2026-10-04T00:49:50.244899+03:00",
        "updated_at": "2026-10-04T00:49:50.244924+03:00",
        "created_by": null,
        "updated_by": null,
  … (truncated)
```

</details>

<details><summary>Example: Create purchase order → <code>201</code></summary>

```http
POST /api/inventory/v1/purchase-order/
```

Request body:

```json
{
  "supplier": 1,
  "warehouse": 1,
  "expected_date": "2026-10-25",
  "payment_terms": "Net 30",
  "requisition": 1
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "created_at": "2026-10-04T00:57:38.764613+03:00",
    "updated_at": "2026-10-04T00:57:38.764676+03:00",
    "created_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:57:32.752930+03:00",
      "full_name": "Sara Ali"
    },
    "updated_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:57:32.752930+03:00",
      "full_name": "Sara Ali"
    },
    "supplier": {
      "id": 1,
      "created_at": "2026-10-04T00:57:36.891163+03:00",
      "updated_at": "2026-10-04T00:57:36.891218+03:00",
      "created_by": {
        "id": 1,
        "email": "admin@acme.example",
        "first_name": "Sara",
        "last_name": "Ali",
        "date_joined": "2026-10-04T00:57:32.752930+03:00",
        "full_name": "Sara Ali"
      },
      "updated_by": {
        "id": 1,
        "email": "admin@acme.example",
        "first_name": "Sara",
  … (truncated)
```

</details>

#### `POST /api/inventory/v1/purchase-order/{id}/action/` — Workflow action on a purchase order

Body: `{"action": "<name>", …extra fields}`. The document is looked up in your company (404 otherwise).
Success → **200** with the updated document (same shape as retrieve). A wrong status or rule → **400** with the
reason in `error.message`; an unknown action → **400** listing `allowed_actions`.

`submit` sends a draft for approval: if an [approval workflow](#approval-workflows) matches, the document goes to
`pending_approval` and an approval request is opened (approve it through
[`approval-request/{id}/process/`](#post-apiinventoryv1approval-requestidprocess--approve--reject--escalate-a-request));
otherwise it waits in `pending_approval` for a direct `approve` / `reject` here.

| Action | Allowed from | Result | Extra body fields |
|---|---|---|---|
| `submit` | `draft` (needs ≥1 line; totals are recalculated) | `pending_approval` | — |
| `approve` | `pending_approval` | `approved` | — |
| `reject` | `pending_approval` | `rejected` | `reason` (optional) |
| `send` | `approved` | `sent` | — |
| `confirm` | `sent` | `confirmed` | — |
| `ship` | `confirmed` | `shipped` | — |
| `cancel` | anything before goods are received | `cancelled` | — |

Status flow: draft → pending_approval → approved → sent → confirmed → shipped → partial → received (receiving is done by posting [goods receipts](#goods-receipts)); rejected / cancelled.

### Purchase order lines

**Access:** subscription module `inventory`.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/inventory/v1/purchase-order-line/` | List |
| `POST` | `/api/inventory/v1/purchase-order-line/` | Create |
| `GET` | `/api/inventory/v1/purchase-order-line/{id}/` | Retrieve |
| `PUT` | `/api/inventory/v1/purchase-order-line/{id}/` | Replace (all required fields) |
| `PATCH` | `/api/inventory/v1/purchase-order-line/{id}/` | Partial update |
| `DELETE` | `/api/inventory/v1/purchase-order-line/{id}/` | Delete (soft delete) |

**List query parameters**

| Query param | Meaning |
|---|---|
| `page`, `page_size` | Pagination (default 10, max 100). Total in `metadata.total_count`. |
| `dropdown=true` | Unpaginated short list with only: `id` |
| `search` | Text search in: `name_en`, `name_ar` |
| `ordering` | Sort by `id` (prefix `-` for descending) |
| `purchase_order` | Only the lines of this PurchaseOrder (id); a value that isn't an id → 400 |

**Create body** (`POST`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `purchase_order` | id (PurchaseOrder) | **yes** |  |
| `product_variant` | id (ProductVariant) | **yes** |  |
| `quantity_ordered` | decimal (string) | **yes** |  |
| `quantity_received` | decimal (string) | no |  |
| `unit_cost` | decimal (string) | **yes** |  |
| `discount_percent` | decimal (string) | no |  |
| `tax_rate` | decimal (string) | no |  |
| `tax_amount` | decimal (string) | no |  |
| `expected_date` | date (YYYY-MM-DD) | no | nullable |
| `notes` | string | no | max 255 chars |

_Update (`PUT`/`PATCH`) accepts the same fields; with `PATCH` every field is optional._

**Response object** (retrieve; create/update return the same shape)

| Field | Type | Notes |
|---|---|---|
| `id` | integer |  |
| `created_at` | datetime (ISO 8601) |  |
| `updated_at` | datetime (ISO 8601) |  |
| `created_by` | object | fields: id, email, first_name, last_name, date_joined |
| `updated_by` | object | fields: id, email, first_name, last_name, date_joined |
| `purchase_order` | object | fields: id, created_at, updated_at, created_by, updated_by, name, supplier, requisition, buyer, department, warehouse, status |
| `product_variant` | computed |  |
| `quantity_ordered` | decimal (string) |  |
| `quantity_received` | decimal (string) |  |
| `unit_cost` | decimal (string) |  |
| `total` | decimal (string) |  |
| `discount_percent` | decimal (string) |  |
| `tax_rate` | decimal (string) |  |
| `tax_amount` | decimal (string) |  |
| `expected_date` | date (YYYY-MM-DD) | nullable |
| `notes` | string |  |

**Examples** (real responses from the running API)

<details><summary>Example: list → <code>200</code></summary>

```http
GET /api/inventory/v1/purchase-order-line/?page_size=2
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": 4,
      "created_at": "2026-10-04T00:49:50.249503+03:00",
      "updated_at": "2026-10-04T00:49:50.249558+03:00",
      "created_by": null,
      "updated_by": null,
      "purchase_order": {
        "id": 10,
        "created_at": "2026-10-04T00:49:50.245602+03:00",
        "updated_at": "2026-10-04T00:49:50.245622+03:00",
        "created_by": null,
        "updated_by": null,
        "supplier": {
          "id": 10,
          "created_at": "2026-10-04T00:49:49.553235+03:00",
          "updated_at": "2026-10-04T00:49:49.553252+03:00",
          "created_by": null,
          "updated_by": null,
          "name": "Supplier 9",
          "supplier_type": "distributor",
          "is_active": true,
          "is_preferred": false,
          "lead_time_days": 0,
          "credit_limit": null
        },
        "requisition": null,
        "buyer": {
          "id": 21,
          "email": "user20@example.com",
          "first_name": "Ronald",
          "last_name": "Shannon",
          "date_joined": "2026-10-04T00:49:50.243822+03:00",
          "full_name": "Ronald Shannon"
        },
        "department": null,
  … (truncated)
```

</details>

<details><summary>Example: Add PO line → <code>201</code></summary>

```http
POST /api/inventory/v1/purchase-order-line/
```

Request body:

```json
{
  "purchase_order": 1,
  "product_variant": 1,
  "quantity_ordered": "50",
  "unit_cost": "120.00"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "created_at": "2026-10-04T00:57:38.899817+03:00",
    "updated_at": "2026-10-04T00:57:38.899912+03:00",
    "created_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:57:32.752930+03:00",
      "full_name": "Sara Ali"
    },
    "updated_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:57:32.752930+03:00",
      "full_name": "Sara Ali"
    },
    "purchase_order": {
      "id": 1,
      "created_at": "2026-10-04T00:57:38.764613+03:00",
      "updated_at": "2026-10-04T00:57:38.764676+03:00",
      "created_by": {
        "id": 1,
        "email": "admin@acme.example",
        "first_name": "Sara",
        "last_name": "Ali",
        "date_joined": "2026-10-04T00:57:32.752930+03:00",
        "full_name": "Sara Ali"
      },
      "updated_by": {
        "id": 1,
        "email": "admin@acme.example",
        "first_name": "Sara",
  … (truncated)
```

</details>

### Goods receipts

Receiving goods against a purchase order.

**Access:** subscription module `inventory`.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/inventory/v1/goods-receipt/` | List |
| `POST` | `/api/inventory/v1/goods-receipt/` | Create |
| `GET` | `/api/inventory/v1/goods-receipt/{id}/` | Retrieve |
| `PUT` | `/api/inventory/v1/goods-receipt/{id}/` | Replace (all required fields) |
| `PATCH` | `/api/inventory/v1/goods-receipt/{id}/` | Partial update |
| `DELETE` | `/api/inventory/v1/goods-receipt/{id}/` | Delete (soft delete) |

**List query parameters**

| Query param | Meaning |
|---|---|
| `page`, `page_size` | Pagination (default 10, max 100). Total in `metadata.total_count`. |
| `dropdown=true` | Unpaginated short list with only: `id`, `receipt_number` |
| `search` | Text search in: `receipt_number`, `delivery_note` |
| `ordering` | Sort by `id`, `received_date` (prefix `-` for descending) |

**Create body** (`POST`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `purchase_order` | id (PurchaseOrder) | **yes** |  |
| `warehouse` | id (Warehouse) | **yes** |  |
| `delivery_note` | string | no | max 100 chars |
| `is_complete` | boolean | no |  |
| `notes` | string | no |  |

_Update (`PUT`/`PATCH`) accepts the same fields; with `PATCH` every field is optional._

**Response object** (retrieve; create/update return the same shape)

| Field | Type | Notes |
|---|---|---|
| `id` | integer |  |
| `created_at` | datetime (ISO 8601) |  |
| `updated_at` | datetime (ISO 8601) |  |
| `created_by` | object | fields: id, email, first_name, last_name, date_joined |
| `updated_by` | object | fields: id, email, first_name, last_name, date_joined |
| `purchase_order` | object | fields: id, created_at, updated_at, created_by, updated_by, name, supplier, requisition, buyer, department, warehouse, status |
| `warehouse` | computed |  |
| `received_by` | computed |  |
| `receipt_number` | string |  |
| `status` | string |  |
| `posted_at` | datetime (ISO 8601) |  |
| `is_complete` | boolean |  |
| `received_date` | datetime (ISO 8601) |  |
| `delivery_note` | string |  |
| `notes` | string |  |

**Examples** (real responses from the running API)

<details><summary>Example: list → <code>200</code></summary>

```http
GET /api/inventory/v1/goods-receipt/?page_size=2
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": 4,
      "created_at": "2026-10-04T00:49:46.749291+03:00",
      "updated_at": "2026-10-04T00:49:46.749312+03:00",
      "created_by": null,
      "updated_by": null,
      "purchase_order": {
        "id": 5,
        "created_at": "2026-10-04T00:49:45.976254+03:00",
        "updated_at": "2026-10-04T00:49:45.976282+03:00",
        "created_by": null,
        "updated_by": null,
        "supplier": {
          "id": 5,
          "created_at": "2026-10-04T00:49:45.287949+03:00",
          "updated_at": "2026-10-04T00:49:45.287983+03:00",
          "created_by": null,
          "updated_by": null,
          "name": "Supplier 4",
          "supplier_type": "distributor",
          "is_active": true,
          "is_preferred": false,
          "lead_time_days": 0,
          "credit_limit": null
        },
        "requisition": null,
        "buyer": {
          "id": 15,
          "email": "user14@example.com",
          "first_name": "Amy",
          "last_name": "Cline",
          "date_joined": "2026-10-04T00:49:45.973612+03:00",
          "full_name": "Amy Cline"
        },
        "department": null,
  … (truncated)
```

</details>

<details><summary>Example: Create goods receipt → <code>201</code></summary>

```http
POST /api/inventory/v1/goods-receipt/
```

Request body:

```json
{
  "purchase_order": 1,
  "warehouse": 1,
  "delivery_note": "DN-778"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "created_at": "2026-10-04T00:57:39.040516+03:00",
    "updated_at": "2026-10-04T00:57:39.040571+03:00",
    "created_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:57:32.752930+03:00",
      "full_name": "Sara Ali"
    },
    "updated_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:57:32.752930+03:00",
      "full_name": "Sara Ali"
    },
    "purchase_order": {
      "id": 1,
      "created_at": "2026-10-04T00:57:38.764613+03:00",
      "updated_at": "2026-10-04T00:57:38.764676+03:00",
      "created_by": {
        "id": 1,
        "email": "admin@acme.example",
        "first_name": "Sara",
        "last_name": "Ali",
        "date_joined": "2026-10-04T00:57:32.752930+03:00",
        "full_name": "Sara Ali"
      },
      "updated_by": {
        "id": 1,
        "email": "admin@acme.example",
        "first_name": "Sara",
  … (truncated)
```

</details>

#### `POST /api/inventory/v1/goods-receipt/{id}/action/` — Post a goods receipt

Same envelope and errors as the other workflow actions. Only action: `post` (receipt `draft` → `posted`). Stock is
added to the warehouse only when the receipt is posted; the purchase order becomes `partial` or `received`.

### Goods receipt lines

One per PO line received (`po_line`).

**Access:** subscription module `inventory`.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/inventory/v1/goods-receipt-line/` | List |
| `POST` | `/api/inventory/v1/goods-receipt-line/` | Create |
| `GET` | `/api/inventory/v1/goods-receipt-line/{id}/` | Retrieve |
| `PUT` | `/api/inventory/v1/goods-receipt-line/{id}/` | Replace (all required fields) |
| `PATCH` | `/api/inventory/v1/goods-receipt-line/{id}/` | Partial update |
| `DELETE` | `/api/inventory/v1/goods-receipt-line/{id}/` | Delete (soft delete) |

**List query parameters**

| Query param | Meaning |
|---|---|
| `page`, `page_size` | Pagination (default 10, max 100). Total in `metadata.total_count`. |
| `dropdown=true` | Unpaginated short list with only: `id` |
| `search` | Text search in: `name_en`, `name_ar` |
| `ordering` | Sort by `id` (prefix `-` for descending) |
| `goods_receipt` | Only the lines of this GoodsReceipt (id); a value that isn't an id → 400 |

**Create body** (`POST`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `goods_receipt` | id (GoodsReceipt) | **yes** |  |
| `po_line` | id (PurchaseOrderLine) | **yes** |  |
| `batch` | id (Batch) | no | nullable |
| `bin` | id (Bin) | no | nullable |
| `quantity_received` | decimal (string) | **yes** |  |
| `notes` | string | no | max 255 chars |
| `serial_numbers` | array of ids (SerialNumber) | no |  |

_Update (`PUT`/`PATCH`) accepts the same fields; with `PATCH` every field is optional._

**Response object** (retrieve; create/update return the same shape)

| Field | Type | Notes |
|---|---|---|
| `id` | integer |  |
| `created_at` | datetime (ISO 8601) |  |
| `updated_at` | datetime (ISO 8601) |  |
| `created_by` | object | fields: id, email, first_name, last_name, date_joined |
| `updated_by` | object | fields: id, email, first_name, last_name, date_joined |
| `goods_receipt` | object | fields: id, created_at, updated_at, created_by, updated_by, name, purchase_order, warehouse, received_by |
| `po_line` | computed |  |
| `batch` | computed |  |
| `bin` | computed |  |
| `quantity_received` | decimal (string) |  |
| `notes` | string |  |
| `serial_numbers` | array of ids (SerialNumber) |  |

**Examples** (real responses from the running API)

<details><summary>Example: list → <code>200</code></summary>

```http
GET /api/inventory/v1/goods-receipt-line/?page_size=2
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": 2,
      "created_at": "2026-10-04T00:49:47.438227+03:00",
      "updated_at": "2026-10-04T00:49:47.438244+03:00",
      "created_by": null,
      "updated_by": null,
      "goods_receipt": {
        "id": 4,
        "created_at": "2026-10-04T00:49:46.749291+03:00",
        "updated_at": "2026-10-04T00:49:46.749312+03:00",
        "created_by": null,
        "updated_by": null,
        "purchase_order": {
          "id": 5,
          "created_at": "2026-10-04T00:49:45.976254+03:00",
          "updated_at": "2026-10-04T00:49:45.976282+03:00",
          "created_by": null,
          "updated_by": null,
          "supplier": {
            "id": 5,
            "created_at": "2026-10-04T00:49:45.287949+03:00",
            "updated_at": "2026-10-04T00:49:45.287983+03:00",
            "created_by": null,
            "updated_by": null,
            "name": "Supplier 4",
            "supplier_type": "distributor",
            "is_active": true,
            "is_preferred": false,
            "lead_time_days": 0,
            "credit_limit": null
          },
          "requisition": null,
          "buyer": {
            "id": 15,
            "email": "user14@example.com",
  … (truncated)
```

</details>

<details><summary>Example: Add goods receipt line → <code>201</code></summary>

```http
POST /api/inventory/v1/goods-receipt-line/
```

Request body:

```json
{
  "goods_receipt": 1,
  "po_line": 1,
  "quantity_received": "50",
  "quantity_accepted": "50"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "created_at": "2026-10-04T00:57:39.232242+03:00",
    "updated_at": "2026-10-04T00:57:39.232297+03:00",
    "created_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:57:32.752930+03:00",
      "full_name": "Sara Ali"
    },
    "updated_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:57:32.752930+03:00",
      "full_name": "Sara Ali"
    },
    "goods_receipt": {
      "id": 1,
      "created_at": "2026-10-04T00:57:39.040516+03:00",
      "updated_at": "2026-10-04T00:57:39.040571+03:00",
      "created_by": {
        "id": 1,
        "email": "admin@acme.example",
        "first_name": "Sara",
        "last_name": "Ali",
        "date_joined": "2026-10-04T00:57:32.752930+03:00",
        "full_name": "Sara Ali"
      },
      "updated_by": {
        "id": 1,
        "email": "admin@acme.example",
        "first_name": "Sara",
  … (truncated)
```

</details>

### Supplier invoices

Bills from suppliers, matched to purchase orders.

**Access:** subscription module `inventory`.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/inventory/v1/supplier-invoice/` | List |
| `POST` | `/api/inventory/v1/supplier-invoice/` | Create |
| `GET` | `/api/inventory/v1/supplier-invoice/{id}/` | Retrieve |
| `PUT` | `/api/inventory/v1/supplier-invoice/{id}/` | Replace (all required fields) |
| `PATCH` | `/api/inventory/v1/supplier-invoice/{id}/` | Partial update |
| `DELETE` | `/api/inventory/v1/supplier-invoice/{id}/` | Delete (soft delete) |
| `POST` | `/api/inventory/v1/supplier-invoice/{id}/action/` | Workflow action on a supplier invoice |

**List query parameters**

| Query param | Meaning |
|---|---|
| `page`, `page_size` | Pagination (default 10, max 100). Total in `metadata.total_count`. |
| `dropdown=true` | Unpaginated short list with only: `id`, `invoice_number`, `supplier` (id), `due_date`, `amount`, `currency`, `status`, `open_balance` |
| `search` | Text search in: `invoice_number`, `payment_reference` |
| `supplier` | Exact-match filter by supplier id |
| `status` | Exact-match filter by status |
| `open=true` | Only invoices a supplier payment can still be allocated to: `matched`/`paid` with `open_balance` > 0 |
| `ordering` | Sort by `id`, `invoice_date` (prefix `-` for descending) |

**Create body** (`POST`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `supplier` | id (Supplier) | **yes** |  |
| `purchase_order` | id (PurchaseOrder) | no | nullable |
| `invoice_number` | string | **yes** | max 50 chars |
| `invoice_date` | date (YYYY-MM-DD) | **yes** |  |
| `due_date` | date (YYYY-MM-DD) | **yes** |  |
| `amount` | decimal (string) | **yes** |  |
| `currency` | string | no | max 3 chars |
| `status` | enum | no | one of: `pending`, `matched`, `paid`, `disputed` |
| `payment_reference` | string | no | max 100 chars |
| `notes` | string | no |  |

_Update (`PUT`/`PATCH`) accepts the same fields; with `PATCH` every field is optional._

**Response object** (retrieve; create/update return the same shape)

| Field | Type | Notes |
|---|---|---|
| `id` | integer |  |
| `created_at` | datetime (ISO 8601) |  |
| `updated_at` | datetime (ISO 8601) |  |
| `created_by` | object | fields: id, email, first_name, last_name, date_joined |
| `updated_by` | object | fields: id, email, first_name, last_name, date_joined |
| `supplier` | computed |  |
| `purchase_order` | computed |  |
| `status` | string |  |
| `invoice_number` | string |  |
| `invoice_date` | date (YYYY-MM-DD) |  |
| `due_date` | date (YYYY-MM-DD) |  |
| `amount` | decimal (string) |  |
| `currency` | string |  |
| `payment_reference` | string |  |
| `notes` | string |  |
| `open_balance` | decimal (string) | `amount` less completed supplier payments and issued debit notes, never below 0 |

**Examples** (real responses from the running API)

<details><summary>Example: list → <code>200</code></summary>

```http
GET /api/inventory/v1/supplier-invoice/?page_size=2
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "created_at": "2026-10-04T00:49:58.355784+03:00",
      "updated_at": "2026-10-04T00:49:58.355809+03:00",
      "created_by": null,
      "updated_by": null,
      "supplier": {
        "id": 14,
        "created_at": "2026-10-04T00:49:58.354411+03:00",
        "updated_at": "2026-10-04T00:49:58.354439+03:00",
        "created_by": null,
        "updated_by": null,
        "name": "Supplier 13",
        "supplier_type": "distributor",
        "is_active": true,
        "is_preferred": false,
        "lead_time_days": 0,
        "credit_limit": null
      },
      "purchase_order": {
        "id": 11,
        "created_at": "2026-10-04T00:49:58.353198+03:00",
        "updated_at": "2026-10-04T00:49:58.353227+03:00",
        "created_by": null,
        "updated_by": null,
        "supplier": {
          "id": 13,
          "created_at": "2026-10-04T00:49:57.556850+03:00",
          "updated_at": "2026-10-04T00:49:57.556868+03:00",
          "created_by": null,
          "updated_by": null,
          "name": "Supplier 12",
          "supplier_type": "distributor",
          "is_active": true,
          "is_preferred": false,
  … (truncated)
```

</details>

<details><summary>Example: Create supplier invoice → <code>201</code></summary>

```http
POST /api/inventory/v1/supplier-invoice/
```

Request body:

```json
{
  "supplier": 1,
  "purchase_order": 1,
  "invoice_number": "GP-9001",
  "invoice_date": "2026-10-04",
  "due_date": "2026-11-02",
  "amount": "6000.00"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "created_at": "2026-10-04T00:57:39.719582+03:00",
    "updated_at": "2026-10-04T00:57:39.719637+03:00",
    "created_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:57:32.752930+03:00",
      "full_name": "Sara Ali"
    },
    "updated_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:57:32.752930+03:00",
      "full_name": "Sara Ali"
    },
    "supplier": {
      "id": 1,
      "created_at": "2026-10-04T00:57:36.891163+03:00",
      "updated_at": "2026-10-04T00:57:36.891218+03:00",
      "created_by": {
        "id": 1,
        "email": "admin@acme.example",
        "first_name": "Sara",
        "last_name": "Ali",
        "date_joined": "2026-10-04T00:57:32.752930+03:00",
        "full_name": "Sara Ali"
      },
      "updated_by": {
        "id": 1,
        "email": "admin@acme.example",
        "first_name": "Sara",
  … (truncated)
```

</details>

#### `POST /api/inventory/v1/supplier-invoice/{id}/action/` — Workflow action on a supplier invoice

Body: `{"action": "<name>", …extra fields}`. The document is looked up in your company (404 otherwise).
Success → **200** with the updated document (same shape as retrieve). A wrong status or rule → **400** with the
reason in `error.message`; an unknown action → **400** listing `allowed_actions`.


| Action | Allowed from | Result | Extra body fields |
|---|---|---|---|
| `match` | `pending` | `matched` (three-way match against received value) | `tolerance` (optional decimal) |
| `mark_paid` | `matched` | `paid` | `payment_reference` (optional) |
| `dispute` | `pending`, `matched` | `disputed` | `notes` (optional) |

Status flow: pending → matched → paid; disputed.


### Low-stock alerts

**Access:** subscription module `inventory`.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/inventory/v1/low-stock-alert/` | List |
| `POST` | `/api/inventory/v1/low-stock-alert/` | Create |
| `GET` | `/api/inventory/v1/low-stock-alert/{id}/` | Retrieve |
| `PUT` | `/api/inventory/v1/low-stock-alert/{id}/` | Replace (all required fields) |
| `PATCH` | `/api/inventory/v1/low-stock-alert/{id}/` | Partial update |
| `DELETE` | `/api/inventory/v1/low-stock-alert/{id}/` | Delete (soft delete) |

**List query parameters**

| Query param | Meaning |
|---|---|
| `page`, `page_size` | Pagination (default 10, max 100). Total in `metadata.total_count`. |
| `dropdown=true` | Unpaginated short list with only: `id` |
| `search` | Text search in: `name_en`, `name_ar` |
| `ordering` | Sort by `id`, `triggered_at` (prefix `-` for descending) |

**Create body** (`POST`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `product_variant` | id (ProductVariant) | **yes** |  |
| `warehouse` | id (Warehouse) | **yes** |  |
| `current_quantity` | decimal (string) | **yes** |  |
| `reorder_point` | decimal (string) | **yes** |  |
| `resolved_at` | datetime (ISO 8601) | no | nullable |
| `is_resolved` | boolean | no |  |
| `notes` | string | no |  |
| `acknowledged_by` | id (User) | no | nullable |

_Update (`PUT`/`PATCH`) accepts the same fields; with `PATCH` every field is optional._

**Response object** (retrieve; create/update return the same shape)

| Field | Type | Notes |
|---|---|---|
| `id` | integer |  |
| `created_at` | datetime (ISO 8601) |  |
| `updated_at` | datetime (ISO 8601) |  |
| `created_by` | object | fields: id, email, first_name, last_name, date_joined |
| `updated_by` | object | fields: id, email, first_name, last_name, date_joined |
| `product_variant` | computed |  |
| `warehouse` | computed |  |
| `acknowledged_by` | computed |  |
| `is_resolved` | boolean |  |
| `current_quantity` | decimal (string) |  |
| `reorder_point` | decimal (string) |  |
| `triggered_at` | datetime (ISO 8601) |  |
| `resolved_at` | datetime (ISO 8601) | nullable |
| `notes` | string |  |

**Examples** (real responses from the running API)

<details><summary>Example: list → <code>200</code></summary>

```http
GET /api/inventory/v1/low-stock-alert/?page_size=2
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": 2,
      "created_at": "2026-10-04T00:49:47.450501+03:00",
      "updated_at": "2026-10-04T00:49:47.450518+03:00",
      "created_by": null,
      "updated_by": null,
      "product_variant": {
        "id": 12,
        "created_at": "2026-10-04T00:49:47.449303+03:00",
        "updated_at": "2026-10-04T00:49:47.449320+03:00",
        "created_by": null,
        "updated_by": null,
        "name": "",
        "product": {
          "id": 12,
          "created_at": "2026-10-04T00:49:47.448695+03:00",
          "updated_at": "2026-10-04T00:49:47.448712+03:00",
          "created_by": null,
          "updated_by": null,
          "name": "Product 11",
          "description": "",
          "product_type": "simple",
          "category": {
            "id": 14,
            "created_at": "2026-10-04T00:49:47.447256+03:00",
            "updated_at": "2026-10-04T00:49:47.447273+03:00",
            "created_by": null,
            "updated_by": null,
            "name": "Category 13",
            "parent": null,
            "description": "Democrat risk style somebody matter. Agent common compare either cut.\nCut drug pass international. Poor professor whatever law government partner. Seem animal save enjoy. Know future act everything.",
            "is_active": true
          },
          "brand": {
            "id": 14,
  … (truncated)
```

</details>

<details><summary>Example: Create low stock alert → <code>201</code></summary>

```http
POST /api/inventory/v1/low-stock-alert/
```

Request body:

```json
{
  "product_variant": 1,
  "warehouse": 1,
  "current_quantity": "8",
  "reorder_point": "10"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "created_at": "2026-10-04T00:57:37.705721+03:00",
    "updated_at": "2026-10-04T00:57:37.705783+03:00",
    "created_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:57:32.752930+03:00",
      "full_name": "Sara Ali"
    },
    "updated_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:57:32.752930+03:00",
      "full_name": "Sara Ali"
    },
    "product_variant": {
      "id": 1,
      "created_at": "2026-10-04T00:57:36.877457+03:00",
      "updated_at": "2026-10-04T00:57:36.877485+03:00",
      "created_by": null,
      "updated_by": null,
      "name": "",
      "product": {
        "id": 1,
        "created_at": "2026-10-04T00:57:36.866414+03:00",
        "updated_at": "2026-10-04T00:57:36.866471+03:00",
        "created_by": {
          "id": 1,
          "email": "admin@acme.example",
          "first_name": "Sara",
          "last_name": "Ali",
  … (truncated)
```

</details>

### Expiry alerts

**Access:** subscription module `inventory`.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/inventory/v1/expiry-alert/` | List |
| `POST` | `/api/inventory/v1/expiry-alert/` | Create |
| `GET` | `/api/inventory/v1/expiry-alert/{id}/` | Retrieve |
| `PUT` | `/api/inventory/v1/expiry-alert/{id}/` | Replace (all required fields) |
| `PATCH` | `/api/inventory/v1/expiry-alert/{id}/` | Partial update |
| `DELETE` | `/api/inventory/v1/expiry-alert/{id}/` | Delete (soft delete) |

**List query parameters**

| Query param | Meaning |
|---|---|
| `page`, `page_size` | Pagination (default 10, max 100). Total in `metadata.total_count`. |
| `dropdown=true` | Unpaginated short list with only: `id` |
| `search` | Text search in: `name_en`, `name_ar` |
| `ordering` | Sort by `id`, `triggered_at` (prefix `-` for descending) |

**Create body** (`POST`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `batch` | id (Batch) | **yes** |  |
| `expiry_date` | date (YYYY-MM-DD) | **yes** |  |
| `days_until_expiry` | integer | **yes** |  |
| `resolved_at` | datetime (ISO 8601) | no | nullable |
| `is_resolved` | boolean | no |  |

_Update (`PUT`/`PATCH`) accepts the same fields; with `PATCH` every field is optional._

**Response object** (retrieve; create/update return the same shape)

| Field | Type | Notes |
|---|---|---|
| `id` | integer |  |
| `created_at` | datetime (ISO 8601) |  |
| `updated_at` | datetime (ISO 8601) |  |
| `created_by` | object | fields: id, email, first_name, last_name, date_joined |
| `updated_by` | object | fields: id, email, first_name, last_name, date_joined |
| `batch` | computed |  |
| `is_resolved` | boolean |  |
| `expiry_date` | date (YYYY-MM-DD) |  |
| `days_until_expiry` | integer |  |
| `triggered_at` | datetime (ISO 8601) |  |
| `resolved_at` | datetime (ISO 8601) | nullable |

**Examples** (real responses from the running API)

<details><summary>Example: list → <code>200</code></summary>

```http
GET /api/inventory/v1/expiry-alert/?page_size=2
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": 2,
      "created_at": "2026-10-04T00:49:40.262808+03:00",
      "updated_at": "2026-10-04T00:49:40.262835+03:00",
      "created_by": null,
      "updated_by": null,
      "batch": {
        "id": 4,
        "created_at": "2026-10-04T00:49:40.261970+03:00",
        "updated_at": "2026-10-04T00:49:40.261994+03:00",
        "created_by": null,
        "updated_by": null,
        "product_variant": {
          "id": 8,
          "created_at": "2026-10-04T00:49:40.261018+03:00",
          "updated_at": "2026-10-04T00:49:40.261043+03:00",
          "created_by": null,
          "updated_by": null,
          "name": "",
          "product": {
            "id": 8,
            "created_at": "2026-10-04T00:49:40.260062+03:00",
            "updated_at": "2026-10-04T00:49:40.260097+03:00",
            "created_by": null,
            "updated_by": null,
            "name": "Product 7",
            "description": "",
            "product_type": "simple",
            "category": {
              "id": 10,
              "created_at": "2026-10-04T00:49:40.257556+03:00",
              "updated_at": "2026-10-04T00:49:40.257584+03:00",
              "created_by": null,
              "updated_by": null,
              "name": "Category 9",
  … (truncated)
```

</details>

<details><summary>Example: Create expiry alert → <code>201</code></summary>

```http
POST /api/inventory/v1/expiry-alert/
```

Request body:

```json
{
  "batch": 1,
  "expiry_date": "2026-12-01",
  "days_until_expiry": 59
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "created_at": "2026-10-04T00:57:37.791503+03:00",
    "updated_at": "2026-10-04T00:57:37.791557+03:00",
    "created_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:57:32.752930+03:00",
      "full_name": "Sara Ali"
    },
    "updated_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:57:32.752930+03:00",
      "full_name": "Sara Ali"
    },
    "batch": {
      "id": 1,
      "created_at": "2026-10-04T00:57:36.958574+03:00",
      "updated_at": "2026-10-04T00:57:36.958628+03:00",
      "created_by": {
        "id": 1,
        "email": "admin@acme.example",
        "first_name": "Sara",
        "last_name": "Ali",
        "date_joined": "2026-10-04T00:57:32.752930+03:00",
        "full_name": "Sara Ali"
      },
      "updated_by": {
        "id": 1,
        "email": "admin@acme.example",
        "first_name": "Sara",
  … (truncated)
```

</details>

### Reorder policies

Min/max/reorder point per variant and warehouse (unique per pair).

**Access:** subscription module `inventory`.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/inventory/v1/reorder-policy/` | List |
| `POST` | `/api/inventory/v1/reorder-policy/` | Create |
| `GET` | `/api/inventory/v1/reorder-policy/{id}/` | Retrieve |
| `PUT` | `/api/inventory/v1/reorder-policy/{id}/` | Replace (all required fields) |
| `PATCH` | `/api/inventory/v1/reorder-policy/{id}/` | Partial update |
| `DELETE` | `/api/inventory/v1/reorder-policy/{id}/` | Delete (soft delete) |

**List query parameters**

| Query param | Meaning |
|---|---|
| `page`, `page_size` | Pagination (default 10, max 100). Total in `metadata.total_count`. |
| `dropdown=true` | Unpaginated short list with only: `id` |
| `search` | Text search in: `name_en`, `name_ar` |
| `ordering` | Sort by `id` (prefix `-` for descending) |

**Create body** (`POST`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `product_variant` | id (ProductVariant) | **yes** |  |
| `warehouse` | id (Warehouse) | **yes** |  |
| `min_stock` | decimal (string) | no | nullable |
| `max_stock` | decimal (string) | no | nullable |
| `reorder_point` | decimal (string) | no | nullable |
| `reorder_quantity` | decimal (string) | no | nullable |
| `safety_stock` | decimal (string) | no |  |
| `lead_time_days` | integer | no |  |
| `is_active` | boolean | no |  |
| `is_ai_suggested` | boolean | no |  |

_Update (`PUT`/`PATCH`) accepts the same fields; with `PATCH` every field is optional._

**Response object** (retrieve; create/update return the same shape)

| Field | Type | Notes |
|---|---|---|
| `id` | integer |  |
| `created_at` | datetime (ISO 8601) |  |
| `updated_at` | datetime (ISO 8601) |  |
| `created_by` | object | fields: id, email, first_name, last_name, date_joined |
| `updated_by` | object | fields: id, email, first_name, last_name, date_joined |
| `product_variant` | computed |  |
| `warehouse` | computed |  |
| `is_active` | boolean |  |
| `is_ai_suggested` | boolean |  |
| `min_stock` | decimal (string) | nullable |
| `max_stock` | decimal (string) | nullable |
| `reorder_point` | decimal (string) | nullable |
| `reorder_quantity` | decimal (string) | nullable |
| `safety_stock` | decimal (string) |  |
| `lead_time_days` | integer |  |

**Examples** (real responses from the running API)

<details><summary>Example: list → <code>200</code></summary>

```http
GET /api/inventory/v1/reorder-policy/?page_size=2
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "created_at": "2026-10-04T00:49:53.199585+03:00",
      "updated_at": "2026-10-04T00:49:53.199603+03:00",
      "created_by": null,
      "updated_by": null,
      "product_variant": {
        "id": 19,
        "created_at": "2026-10-04T00:49:53.198143+03:00",
        "updated_at": "2026-10-04T00:49:53.198159+03:00",
        "created_by": null,
        "updated_by": null,
        "name": "",
        "product": {
          "id": 23,
          "created_at": "2026-10-04T00:49:53.197580+03:00",
          "updated_at": "2026-10-04T00:49:53.197597+03:00",
          "created_by": null,
          "updated_by": null,
          "name": "Product 22",
          "description": "",
          "product_type": "simple",
          "category": {
            "id": 25,
            "created_at": "2026-10-04T00:49:53.196254+03:00",
            "updated_at": "2026-10-04T00:49:53.196272+03:00",
            "created_by": null,
            "updated_by": null,
            "name": "Category 24",
            "parent": null,
            "description": "Water new theory mother. Become cold could however capital here food. Economy draw again rest.",
            "is_active": true
          },
          "brand": {
            "id": 25,
  … (truncated)
```

</details>

<details><summary>Example: Create reorder policy → <code>201</code></summary>

```http
POST /api/inventory/v1/reorder-policy/
```

Request body:

```json
{
  "product_variant": 1,
  "warehouse": 1,
  "min_stock": "10",
  "max_stock": "200",
  "reorder_point": "20",
  "reorder_quantity": "100"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "created_at": "2026-10-04T00:57:37.425171+03:00",
    "updated_at": "2026-10-04T00:57:37.425226+03:00",
    "created_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:57:32.752930+03:00",
      "full_name": "Sara Ali"
    },
    "updated_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:57:32.752930+03:00",
      "full_name": "Sara Ali"
    },
    "product_variant": {
      "id": 1,
      "created_at": "2026-10-04T00:57:36.877457+03:00",
      "updated_at": "2026-10-04T00:57:36.877485+03:00",
      "created_by": null,
      "updated_by": null,
      "name": "",
      "product": {
        "id": 1,
        "created_at": "2026-10-04T00:57:36.866414+03:00",
        "updated_at": "2026-10-04T00:57:36.866471+03:00",
        "created_by": {
          "id": 1,
          "email": "admin@acme.example",
          "first_name": "Sara",
          "last_name": "Ali",
  … (truncated)
```

</details>

### Reorder suggestions

System or manual suggestions to buy.

**Access:** subscription module `inventory`.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/inventory/v1/reorder-suggestion/` | List |
| `POST` | `/api/inventory/v1/reorder-suggestion/` | Create |
| `GET` | `/api/inventory/v1/reorder-suggestion/{id}/` | Retrieve |
| `PUT` | `/api/inventory/v1/reorder-suggestion/{id}/` | Replace (all required fields) |
| `PATCH` | `/api/inventory/v1/reorder-suggestion/{id}/` | Partial update |
| `DELETE` | `/api/inventory/v1/reorder-suggestion/{id}/` | Delete (soft delete) |

**List query parameters**

| Query param | Meaning |
|---|---|
| `page`, `page_size` | Pagination (default 10, max 100). Total in `metadata.total_count`. |
| `dropdown=true` | Unpaginated short list with only: `id` |
| `search` | Text search in: `name_en`, `name_ar` |
| `ordering` | Sort by `id`, `generated_at` (prefix `-` for descending) |

**Create body** (`POST`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `product_variant` | id (ProductVariant) | **yes** |  |
| `warehouse` | id (Warehouse) | **yes** |  |
| `suggested_supplier` | id (Supplier) | no | nullable |
| `suggested_quantity` | decimal (string) | **yes** |  |
| `reason` | string | **yes** | max 255 chars |
| `priority` | enum | no | one of: `low`, `medium`, `high` |
| `expires_at` | datetime (ISO 8601) | **yes** |  |
| `is_actioned` | boolean | no |  |
| `actioned_at` | datetime (ISO 8601) | no | nullable |
| `actioned_by` | id (User) | no | nullable |
| `converted_to_pr` | id (PurchaseRequisition) | no | nullable |

_Update (`PUT`/`PATCH`) accepts the same fields; with `PATCH` every field is optional._

**Response object** (retrieve; create/update return the same shape)

| Field | Type | Notes |
|---|---|---|
| `id` | integer |  |
| `created_at` | datetime (ISO 8601) |  |
| `updated_at` | datetime (ISO 8601) |  |
| `created_by` | object | fields: id, email, first_name, last_name, date_joined |
| `updated_by` | object | fields: id, email, first_name, last_name, date_joined |
| `product_variant` | computed |  |
| `warehouse` | computed |  |
| `suggested_supplier` | computed |  |
| `priority` | string |  |
| `is_actioned` | boolean |  |
| `suggested_quantity` | decimal (string) |  |
| `reason` | string |  |
| `generated_at` | datetime (ISO 8601) |  |
| `expires_at` | datetime (ISO 8601) |  |
| `actioned_at` | datetime (ISO 8601) | nullable |
| `actioned_by` | id (User) |  |
| `converted_to_pr` | id (PurchaseRequisition) |  |

**Examples** (real responses from the running API)

<details><summary>Example: list → <code>200</code></summary>

```http
GET /api/inventory/v1/reorder-suggestion/?page_size=2
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": 2,
      "created_at": "2026-10-04T00:49:53.212759+03:00",
      "updated_at": "2026-10-04T00:49:53.212777+03:00",
      "created_by": null,
      "updated_by": null,
      "product_variant": {
        "id": 22,
        "created_at": "2026-10-04T00:49:53.211529+03:00",
        "updated_at": "2026-10-04T00:49:53.211547+03:00",
        "created_by": null,
        "updated_by": null,
        "name": "",
        "product": {
          "id": 26,
          "created_at": "2026-10-04T00:49:53.210841+03:00",
          "updated_at": "2026-10-04T00:49:53.210859+03:00",
          "created_by": null,
          "updated_by": null,
          "name": "Product 25",
          "description": "",
          "product_type": "simple",
          "category": {
            "id": 28,
            "created_at": "2026-10-04T00:49:53.209528+03:00",
            "updated_at": "2026-10-04T00:49:53.209547+03:00",
            "created_by": null,
            "updated_by": null,
            "name": "Category 27",
            "parent": null,
            "description": "Other thing account happen. One far whether natural peace themselves table huge.",
            "is_active": true
          },
          "brand": {
            "id": 28,
  … (truncated)
```

</details>

<details><summary>Example: Create reorder suggestion → <code>201</code></summary>

```http
POST /api/inventory/v1/reorder-suggestion/
```

Request body:

```json
{
  "product_variant": 1,
  "warehouse": 1,
  "suggested_quantity": "100",
  "reason": "Below reorder point",
  "expires_at": "2026-12-31T00:00:00Z",
  "suggested_supplier": 1
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "created_at": "2026-10-04T00:57:37.525503+03:00",
    "updated_at": "2026-10-04T00:57:37.525552+03:00",
    "created_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:57:32.752930+03:00",
      "full_name": "Sara Ali"
    },
    "updated_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:57:32.752930+03:00",
      "full_name": "Sara Ali"
    },
    "product_variant": {
      "id": 1,
      "created_at": "2026-10-04T00:57:36.877457+03:00",
      "updated_at": "2026-10-04T00:57:36.877485+03:00",
      "created_by": null,
      "updated_by": null,
      "name": "",
      "product": {
        "id": 1,
        "created_at": "2026-10-04T00:57:36.866414+03:00",
        "updated_at": "2026-10-04T00:57:36.866471+03:00",
        "created_by": {
          "id": 1,
          "email": "admin@acme.example",
          "first_name": "Sara",
          "last_name": "Ali",
  … (truncated)
```

</details>

### Demand forecasts

**Access:** subscription module `inventory`.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/inventory/v1/demand-forecast/` | List |
| `POST` | `/api/inventory/v1/demand-forecast/` | Create |
| `GET` | `/api/inventory/v1/demand-forecast/{id}/` | Retrieve |
| `PUT` | `/api/inventory/v1/demand-forecast/{id}/` | Replace (all required fields) |
| `PATCH` | `/api/inventory/v1/demand-forecast/{id}/` | Partial update |
| `DELETE` | `/api/inventory/v1/demand-forecast/{id}/` | Delete (soft delete) |

**List query parameters**

| Query param | Meaning |
|---|---|
| `page`, `page_size` | Pagination (default 10, max 100). Total in `metadata.total_count`. |
| `dropdown=true` | Unpaginated short list with only: `id` |
| `search` | Text search in: `name_en`, `name_ar` |
| `ordering` | Sort by `id`, `forecast_date` (prefix `-` for descending) |

**Create body** (`POST`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `product_variant` | id (ProductVariant) | **yes** |  |
| `warehouse` | id (Warehouse) | **yes** |  |
| `forecast_date` | date (YYYY-MM-DD) | **yes** |  |
| `predicted_demand` | decimal (string) | **yes** |  |
| `lower_bound` | decimal (string) | no | nullable |
| `upper_bound` | decimal (string) | no | nullable |
| `confidence` | number | no | nullable |
| `model_version` | string | no | max 50 chars |

_Update (`PUT`/`PATCH`) accepts the same fields; with `PATCH` every field is optional._

**Response object** (retrieve; create/update return the same shape)

| Field | Type | Notes |
|---|---|---|
| `id` | integer |  |
| `created_at` | datetime (ISO 8601) |  |
| `updated_at` | datetime (ISO 8601) |  |
| `created_by` | object | fields: id, email, first_name, last_name, date_joined |
| `updated_by` | object | fields: id, email, first_name, last_name, date_joined |
| `product_variant` | computed |  |
| `warehouse` | computed |  |
| `forecast_date` | date (YYYY-MM-DD) |  |
| `predicted_demand` | decimal (string) |  |
| `lower_bound` | decimal (string) | nullable |
| `upper_bound` | decimal (string) | nullable |
| `confidence` | string | nullable |
| `model_version` | string |  |
| `generated_at` | datetime (ISO 8601) |  |

**Examples** (real responses from the running API)

<details><summary>Example: list → <code>200</code></summary>

```http
GET /api/inventory/v1/demand-forecast/?page_size=2
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "created_at": "2026-10-04T00:49:40.242436+03:00",
      "updated_at": "2026-10-04T00:49:40.242460+03:00",
      "created_by": null,
      "updated_by": null,
      "product_variant": {
        "id": 5,
        "created_at": "2026-10-04T00:49:40.240455+03:00",
        "updated_at": "2026-10-04T00:49:40.240481+03:00",
        "created_by": null,
        "updated_by": null,
        "name": "",
        "product": {
          "id": 5,
          "created_at": "2026-10-04T00:49:40.239570+03:00",
          "updated_at": "2026-10-04T00:49:40.239593+03:00",
          "created_by": null,
          "updated_by": null,
          "name": "Product 4",
          "description": "",
          "product_type": "simple",
          "category": {
            "id": 7,
            "created_at": "2026-10-04T00:49:40.237467+03:00",
            "updated_at": "2026-10-04T00:49:40.237494+03:00",
            "created_by": null,
            "updated_by": null,
            "name": "Category 6",
            "parent": null,
            "description": "Company long myself team region reveal away. Before maintain up walk.\nReality writer south hospital voice three up anything. Forget current machine future hit term trip. Tax road ground play.",
            "is_active": true
          },
          "brand": {
            "id": 7,
  … (truncated)
```

</details>

<details><summary>Example: Create demand forecast → <code>201</code></summary>

```http
POST /api/inventory/v1/demand-forecast/
```

Request body:

```json
{
  "product_variant": 1,
  "warehouse": 1,
  "forecast_date": "2026-11-01",
  "predicted_demand": "40"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "created_at": "2026-10-04T00:57:37.618438+03:00",
    "updated_at": "2026-10-04T00:57:37.618487+03:00",
    "created_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:57:32.752930+03:00",
      "full_name": "Sara Ali"
    },
    "updated_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:57:32.752930+03:00",
      "full_name": "Sara Ali"
    },
    "product_variant": {
      "id": 1,
      "created_at": "2026-10-04T00:57:36.877457+03:00",
      "updated_at": "2026-10-04T00:57:36.877485+03:00",
      "created_by": null,
      "updated_by": null,
      "name": "",
      "product": {
        "id": 1,
        "created_at": "2026-10-04T00:57:36.866414+03:00",
        "updated_at": "2026-10-04T00:57:36.866471+03:00",
        "created_by": {
          "id": 1,
          "email": "admin@acme.example",
          "first_name": "Sara",
          "last_name": "Ali",
  … (truncated)
```

</details>

---

## Inventory — approvals

Configurable multi-stage approval for requisitions, POs, transfers and adjustments.

### Approval workflows

`document_type`: `purchaserequisition`, `purchaseorder`, `stocktransfer`, `stockadjustment`. `department` is required.

**Access:** subscription module `inventory`.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/inventory/v1/approval-workflow/` | List |
| `POST` | `/api/inventory/v1/approval-workflow/` | Create |
| `GET` | `/api/inventory/v1/approval-workflow/{id}/` | Retrieve |
| `PUT` | `/api/inventory/v1/approval-workflow/{id}/` | Replace (all required fields) |
| `PATCH` | `/api/inventory/v1/approval-workflow/{id}/` | Partial update |
| `DELETE` | `/api/inventory/v1/approval-workflow/{id}/` | Delete (soft delete) |

**List query parameters**

| Query param | Meaning |
|---|---|
| `page`, `page_size` | Pagination (default 10, max 100). Total in `metadata.total_count`. |
| `dropdown=true` | Unpaginated short list with only: `id`, `name` |
| `search` | Text search in: `name` |
| `ordering` | Sort by `id`, `name` (prefix `-` for descending) |

**Create body** (`POST`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `department` | id (Department) | no | nullable |
| `name` | string | **yes** | max 100 chars |
| `document_type` | enum | **yes** | one of: `purchaserequisition`, `purchaseorder`, `stocktransfer`, `stockadjustment` |
| `is_active` | boolean | no |  |
| `description` | string | no |  |

_Update (`PUT`/`PATCH`) accepts the same fields; with `PATCH` every field is optional._

**Response object** (retrieve; create/update return the same shape)

| Field | Type | Notes |
|---|---|---|
| `id` | integer |  |
| `created_at` | datetime (ISO 8601) |  |
| `updated_at` | datetime (ISO 8601) |  |
| `created_by` | object | fields: id, email, first_name, last_name, date_joined |
| `updated_by` | object | fields: id, email, first_name, last_name, date_joined |
| `name` | string |  |
| `document_type` | string |  |
| `is_active` | boolean |  |
| `department` | computed |  |
| `description` | string |  |

**Examples** (real responses from the running API)

<details><summary>Example: list → <code>200</code></summary>

```http
GET /api/inventory/v1/approval-workflow/?page_size=2
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "created_at": "2026-10-04T00:49:35.988127+03:00",
      "updated_at": "2026-10-04T00:49:35.988144+03:00",
      "created_by": null,
      "updated_by": null,
      "name": "Workflow 0",
      "document_type": "",
      "is_active": true,
      "department": null
    }
  ],
  "metadata": {
    "timestamp": "2026-10-03T21:50:23.965449Z",
    "version": "1.0",
    "total_count": 12
  }
}
```

</details>

<details><summary>Example: Create approval workflow → <code>201</code></summary>

```http
POST /api/inventory/v1/approval-workflow/
```

Request body:

```json
{
  "name": "PO over 5k",
  "document_type": "purchaseorder",
  "department": 1,
  "is_active": true
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "created_at": "2026-10-04T00:57:39.836842+03:00",
    "updated_at": "2026-10-04T00:57:39.836900+03:00",
    "created_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:57:32.752930+03:00",
      "full_name": "Sara Ali"
    },
    "updated_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:57:32.752930+03:00",
      "full_name": "Sara Ali"
    },
    "name": "PO over 5k",
    "document_type": "purchaseorder",
    "is_active": true,
    "department": {
      "id": 1,
      "name_en": "Sales",
      "name_ar": "المبيعات",
      "parent": null,
      "manager": null,
      "created_by": {
        "id": 1,
        "email": "admin@acme.example",
        "first_name": "Sara",
        "last_name": "Ali",
        "date_joined": "2026-10-04T00:57:32.752930+03:00",
        "full_name": "Sara Ali"
  … (truncated)
```

</details>

### Approval stages

Ordered steps (`sequence`, unique per workflow) with approver `users`/`roles`.

**Access:** subscription module `inventory`.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/inventory/v1/approval-stage/` | List |
| `POST` | `/api/inventory/v1/approval-stage/` | Create |
| `GET` | `/api/inventory/v1/approval-stage/{id}/` | Retrieve |
| `PUT` | `/api/inventory/v1/approval-stage/{id}/` | Replace (all required fields) |
| `PATCH` | `/api/inventory/v1/approval-stage/{id}/` | Partial update |
| `DELETE` | `/api/inventory/v1/approval-stage/{id}/` | Delete (soft delete) |

**List query parameters**

| Query param | Meaning |
|---|---|
| `page`, `page_size` | Pagination (default 10, max 100). Total in `metadata.total_count`. |
| `dropdown=true` | Unpaginated short list with only: `id`, `name` |
| `search` | Text search in: `name` |
| `ordering` | Sort by `id`, `sequence` (prefix `-` for descending) |

**Create body** (`POST`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `workflow` | id (ApprovalWorkflow) | **yes** |  |
| `sequence` | integer | **yes** |  |
| `name` | string | **yes** | max 100 chars |
| `approval_type` | enum | no | one of: `any`, `all` |
| `is_optional` | boolean | no |  |
| `escalation_hours` | integer | no | nullable |
| `escalation_action` | enum | no | one of: `next_stage`, `manager`, `auto_approve`; nullable |
| `roles` | array of ids (Role) | no |  |
| `users` | array of ids (User) | no |  |

_Update (`PUT`/`PATCH`) accepts the same fields; with `PATCH` every field is optional._

**Response object** (retrieve; create/update return the same shape)

| Field | Type | Notes |
|---|---|---|
| `id` | integer |  |
| `created_at` | datetime (ISO 8601) |  |
| `updated_at` | datetime (ISO 8601) |  |
| `created_by` | object | fields: id, email, first_name, last_name, date_joined |
| `updated_by` | object | fields: id, email, first_name, last_name, date_joined |
| `name` | string |  |
| `workflow` | object | fields: id, created_at, updated_at, created_by, updated_by, name, document_type, is_active, department |
| `approval_type` | string |  |
| `is_optional` | boolean |  |
| `sequence` | integer |  |
| `escalation_hours` | integer | nullable |
| `escalation_action` | enum | one of: `next_stage`, `manager`, `auto_approve`; nullable |
| `roles` | array of ids (Role) |  |
| `users` | array of ids (User) |  |

**Examples** (real responses from the running API)

<details><summary>Example: list → <code>200</code></summary>

```http
GET /api/inventory/v1/approval-stage/?page_size=2
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "created_at": "2026-10-04T00:49:35.989370+03:00",
      "updated_at": "2026-10-04T00:49:35.989386+03:00",
      "created_by": null,
      "updated_by": null,
      "name": "Stage 0",
      "workflow": {
        "id": 2,
        "created_at": "2026-10-04T00:49:35.988794+03:00",
        "updated_at": "2026-10-04T00:49:35.988811+03:00",
        "created_by": null,
        "updated_by": null,
        "name": "Workflow 1",
        "document_type": "",
        "is_active": true,
        "department": null
      },
      "approval_type": "any",
      "is_optional": false
    }
  ],
  "metadata": {
    "timestamp": "2026-10-03T21:50:24.007028Z",
    "version": "1.0",
    "total_count": 6
  }
}
```

</details>

<details><summary>Example: Create approval stage → <code>201</code></summary>

```http
POST /api/inventory/v1/approval-stage/
```

Request body:

```json
{
  "workflow": 1,
  "sequence": 1,
  "name": "Finance review",
  "users": [
    1
  ]
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "created_at": "2026-10-04T00:57:39.862403+03:00",
    "updated_at": "2026-10-04T00:57:39.862462+03:00",
    "created_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:57:32.752930+03:00",
      "full_name": "Sara Ali"
    },
    "updated_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:57:32.752930+03:00",
      "full_name": "Sara Ali"
    },
    "name": "Finance review",
    "workflow": {
      "id": 1,
      "created_at": "2026-10-04T00:57:39.836842+03:00",
      "updated_at": "2026-10-04T00:57:39.836900+03:00",
      "created_by": {
        "id": 1,
        "email": "admin@acme.example",
        "first_name": "Sara",
        "last_name": "Ali",
        "date_joined": "2026-10-04T00:57:32.752930+03:00",
        "full_name": "Sara Ali"
      },
      "updated_by": {
        "id": 1,
        "email": "admin@acme.example",
  … (truncated)
```

</details>

### Approval requests

A document waiting for approval.

**Access:** subscription module `inventory`.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/inventory/v1/approval-request/` | List |
| `POST` | `/api/inventory/v1/approval-request/` | Create |
| `GET` | `/api/inventory/v1/approval-request/{id}/` | Retrieve |
| `PUT` | `/api/inventory/v1/approval-request/{id}/` | Replace (all required fields) |
| `PATCH` | `/api/inventory/v1/approval-request/{id}/` | Partial update |
| `DELETE` | `/api/inventory/v1/approval-request/{id}/` | Delete (soft delete) |
| `POST` | `/api/inventory/v1/approval-request/{id}/process/` | Approve / reject / escalate a request |

**List query parameters**

| Query param | Meaning |
|---|---|
| `page`, `page_size` | Pagination (default 10, max 100). Total in `metadata.total_count`. |
| `dropdown=true` | Unpaginated short list with only: `id` |
| `search` | Text search in: `name_en`, `name_ar` |
| `ordering` | Sort by `id`, `requested_at` (prefix `-` for descending) |

**Create body** (`POST`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `workflow` | id (ApprovalWorkflow) | **yes** |  |
| `current_stage` | id (ApprovalStage) | **yes** |  |
| `document_type` | string | **yes** | max 30 chars |
| `document_id` | uuid | **yes** |  |
| `status` | enum | no | one of: `pending`, `approved`, `rejected`, `escalated`, `skipped` |
| `completed_at` | datetime (ISO 8601) | no | nullable |
| `rejection_reason` | string | no |  |
| `escalated_at` | datetime (ISO 8601) | no | nullable |
| `rejected_by` | id (User) | no | nullable |
| `approved_by` | array of ids (User) | no |  |

_Update (`PUT`/`PATCH`) accepts the same fields; with `PATCH` every field is optional._

**Response object** (retrieve; create/update return the same shape)

| Field | Type | Notes |
|---|---|---|
| `id` | integer |  |
| `created_at` | datetime (ISO 8601) |  |
| `updated_at` | datetime (ISO 8601) |  |
| `created_by` | object | fields: id, email, first_name, last_name, date_joined |
| `updated_by` | object | fields: id, email, first_name, last_name, date_joined |
| `workflow` | object | fields: id, created_at, updated_at, created_by, updated_by, name, document_type, is_active, department |
| `current_stage` | object | fields: id, created_at, updated_at, created_by, updated_by, name, workflow, approval_type, is_optional |
| `status` | string |  |
| `rejected_by` | computed |  |
| `document_type` | string |  |
| `document_id` | string |  |
| `requested_at` | datetime (ISO 8601) |  |
| `last_updated` | datetime (ISO 8601) |  |
| `completed_at` | datetime (ISO 8601) | nullable |
| `rejection_reason` | string |  |
| `escalated_at` | datetime (ISO 8601) | nullable |
| `stage_entered_at` | datetime (ISO 8601) | nullable |
| `approved_by` | array of ids (User) |  |

**Examples** (real responses from the running API)

<details><summary>Example: list → <code>200</code></summary>

```http
GET /api/inventory/v1/approval-request/?page_size=2
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "created_at": "2026-10-04T00:49:35.990352+03:00",
      "updated_at": "2026-10-04T00:49:35.990370+03:00",
      "created_by": null,
      "updated_by": null,
      "workflow": {
        "id": 1,
        "created_at": "2026-10-04T00:49:35.988127+03:00",
        "updated_at": "2026-10-04T00:49:35.988144+03:00",
        "created_by": null,
        "updated_by": null,
        "name": "Workflow 0",
        "document_type": "",
        "is_active": true,
        "department": null
      },
      "current_stage": {
        "id": 1,
        "created_at": "2026-10-04T00:49:35.989370+03:00",
        "updated_at": "2026-10-04T00:49:35.989386+03:00",
        "created_by": null,
        "updated_by": null,
        "name": "Stage 0",
        "workflow": {
          "id": 2,
          "created_at": "2026-10-04T00:49:35.988794+03:00",
          "updated_at": "2026-10-04T00:49:35.988811+03:00",
          "created_by": null,
          "updated_by": null,
          "name": "Workflow 1",
          "document_type": "",
          "is_active": true,
          "department": null
        },
  … (truncated)
```

</details>

<details><summary>Example: Create approval request → <code>201</code></summary>

```http
POST /api/inventory/v1/approval-request/
```

Request body:

```json
{
  "workflow": 1,
  "current_stage": 1,
  "document_type": "purchaseorder",
  "document_id": "6f1c2d3e-0000-4000-8000-000000000001"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "created_at": "2026-10-04T00:57:39.899199+03:00",
    "updated_at": "2026-10-04T00:57:39.899254+03:00",
    "created_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:57:32.752930+03:00",
      "full_name": "Sara Ali"
    },
    "updated_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:57:32.752930+03:00",
      "full_name": "Sara Ali"
    },
    "workflow": {
      "id": 1,
      "created_at": "2026-10-04T00:57:39.836842+03:00",
      "updated_at": "2026-10-04T00:57:39.836900+03:00",
      "created_by": {
        "id": 1,
        "email": "admin@acme.example",
        "first_name": "Sara",
        "last_name": "Ali",
        "date_joined": "2026-10-04T00:57:32.752930+03:00",
        "full_name": "Sara Ali"
      },
      "updated_by": {
        "id": 1,
        "email": "admin@acme.example",
        "first_name": "Sara",
  … (truncated)
```

</details>

#### `POST /api/inventory/v1/approval-request/{id}/process/` — Approve / reject / escalate a request

Body: `{"action": "<name>", …}`. Only users allowed on the current stage (stage user or role approvers) can act.
Returns **200** with the updated approval request; rule violations → **400** with `error.message`.

| Action | Effect | Extra body fields |
|---|---|---|
| `approve` | Approves the current stage; the request (and its document) is approved after the last required stage | `comment` |
| `reject` | Rejects the request and its document | `reason`, `comment` |
| `skip` | Skips an optional stage | `comment` |
| `escalate` | Escalates the current stage | `comment` |

### Approval actions (history)

Log of approve/reject/escalate actions.

**Access:** subscription module `inventory`.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/inventory/v1/approval-action/` | List |
| `POST` | `/api/inventory/v1/approval-action/` | Create |
| `GET` | `/api/inventory/v1/approval-action/{id}/` | Retrieve |
| `PUT` | `/api/inventory/v1/approval-action/{id}/` | Replace (all required fields) |
| `PATCH` | `/api/inventory/v1/approval-action/{id}/` | Partial update |
| `DELETE` | `/api/inventory/v1/approval-action/{id}/` | Delete (soft delete) |

**List query parameters**

| Query param | Meaning |
|---|---|
| `page`, `page_size` | Pagination (default 10, max 100). Total in `metadata.total_count`. |
| `dropdown=true` | Unpaginated short list with only: `id` |
| `search` | Text search in: `name_en`, `name_ar` |
| `ordering` | Sort by `id`, `timestamp` (prefix `-` for descending) |

**Create body** (`POST`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `request` | id (ApprovalRequest) | **yes** |  |
| `action` | enum | **yes** | one of: `approve`, `reject`, `escalate` |
| `comment` | string | no |  |

_Update (`PUT`/`PATCH`) accepts the same fields; with `PATCH` every field is optional._

**Response object** (retrieve; create/update return the same shape)

| Field | Type | Notes |
|---|---|---|
| `id` | integer |  |
| `created_at` | datetime (ISO 8601) |  |
| `updated_at` | datetime (ISO 8601) |  |
| `created_by` | object | fields: id, email, first_name, last_name, date_joined |
| `updated_by` | object | fields: id, email, first_name, last_name, date_joined |
| `request` | object | fields: id, created_at, updated_at, created_by, updated_by, name, workflow, current_stage, status, rejected_by |
| `user` | computed |  |
| `action` | string |  |
| `comment` | string |  |
| `timestamp` | datetime (ISO 8601) |  |
| `stage` | id (ApprovalStage) |  |

**Examples** (real responses from the running API)

<details><summary>Example: list → <code>200</code></summary>

```http
GET /api/inventory/v1/approval-action/?page_size=2
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": 2,
      "created_at": "2026-10-04T00:49:37.316674+03:00",
      "updated_at": "2026-10-04T00:49:37.316698+03:00",
      "created_by": null,
      "updated_by": null,
      "request": {
        "id": 2,
        "created_at": "2026-10-04T00:49:36.657801+03:00",
        "updated_at": "2026-10-04T00:49:36.657818+03:00",
        "created_by": null,
        "updated_by": null,
        "workflow": {
          "id": 3,
          "created_at": "2026-10-04T00:49:36.656100+03:00",
          "updated_at": "2026-10-04T00:49:36.656121+03:00",
          "created_by": null,
          "updated_by": null,
          "name": "Workflow 2",
          "document_type": "",
          "is_active": true,
          "department": null
        },
        "current_stage": {
          "id": 2,
          "created_at": "2026-10-04T00:49:36.657210+03:00",
          "updated_at": "2026-10-04T00:49:36.657226+03:00",
          "created_by": null,
          "updated_by": null,
          "name": "Stage 1",
          "workflow": {
            "id": 4,
            "created_at": "2026-10-04T00:49:36.656748+03:00",
            "updated_at": "2026-10-04T00:49:36.656765+03:00",
            "created_by": null,
  … (truncated)
```

</details>

<details><summary>Example: Approval action record → <code>201</code></summary>

```http
POST /api/inventory/v1/approval-action/
```

Request body:

```json
{
  "request": 1,
  "action": "approve",
  "comment": "OK"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "created_at": "2026-10-04T00:57:39.935759+03:00",
    "updated_at": "2026-10-04T00:57:39.935851+03:00",
    "created_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:57:32.752930+03:00",
      "full_name": "Sara Ali"
    },
    "updated_by": {
      "id": 1,
      "email": "admin@acme.example",
      "first_name": "Sara",
      "last_name": "Ali",
      "date_joined": "2026-10-04T00:57:32.752930+03:00",
      "full_name": "Sara Ali"
    },
    "request": {
      "id": 1,
      "created_at": "2026-10-04T00:57:39.899199+03:00",
      "updated_at": "2026-10-04T00:57:39.899254+03:00",
      "created_by": {
        "id": 1,
        "email": "admin@acme.example",
        "first_name": "Sara",
        "last_name": "Ali",
        "date_joined": "2026-10-04T00:57:32.752930+03:00",
        "full_name": "Sara Ali"
      },
      "updated_by": {
        "id": 1,
        "email": "admin@acme.example",
        "first_name": "Sara",
  … (truncated)
```

</details>

---

## Sales

Customers → Sales orders → Delivery notes → Sales invoices → Payments. No subscription module is required.

### Customers

`customer_number` is generated (`CUST-00001`).

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/sales/customers/` | List |
| `POST` | `/api/sales/customers/` | Create |
| `GET` | `/api/sales/customers/{id}/` | Retrieve |
| `PUT` | `/api/sales/customers/{id}/` | Replace (all required fields) |
| `PATCH` | `/api/sales/customers/{id}/` | Partial update |
| `DELETE` | `/api/sales/customers/{id}/` | Delete (soft delete); `400` `"Cannot delete: the customer has 1 open order and 2 unpaid invoices."` while it has confirmed/picking/shipped/on-hold orders or issued/overdue invoices |
| `GET` | `/api/sales/customers/{id}/statement/` | Customer statement |

**List query parameters**

| Query param | Meaning |
|---|---|
| `search` | Text search in: `name`, `email`, `customer_number` |
| `ordering` | Sort by `name`, `created_at` (prefix `-` for descending) |
| `customer_type`, `is_active`, `assigned_to` | Exact-match filters |

**Create body** (`POST`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | **yes** | max 200 chars |
| `customer_type` | enum | no | one of: `individual`, `business`, `government` |
| `email` | email | no | max 254 chars |
| `phone` | string | no | max 50 chars |
| `mobile` | string | no | max 50 chars |
| `website` | url | no | max 200 chars |
| `tax_id` | string | no | max 50 chars |
| `credit_limit` | decimal (string) | no | nullable |
| `credit_used` | decimal (string) | no |  |
| `payment_terms` | string | no | max 100 chars |
| `currency` | string | no | max 3 chars |
| `billing_address` | object/JSON | no |  |
| `shipping_address` | object/JSON | no |  |
| `is_active` | boolean | no |  |
| `notes` | string | no |  |
| `assigned_to` | id (User) | no | nullable |
| `tags` | object/JSON | no |  |

_Update (`PUT`/`PATCH`) accepts the same fields; with `PATCH` every field is optional._

**Response object** (retrieve)

| Field | Type | Notes |
|---|---|---|
| `id` | integer |  |
| `customer_number` | string |  |
| `name` | string |  |
| `customer_type` | enum | one of: `individual`, `business`, `government` |
| `email` | email |  |
| `phone` | string |  |
| `mobile` | string |  |
| `website` | url |  |
| `tax_id` | string |  |
| `credit_limit` | decimal (string) |  |
| `credit_used` | decimal (string) |  |
| `available_credit` | computed |  |
| `payment_terms` | string |  |
| `currency` | string |  |
| `billing_address` | object/JSON |  |
| `shipping_address` | object/JSON |  |
| `is_active` | boolean |  |
| `notes` | string |  |
| `assigned_to` | id (User) |  |
| `tags` | object/JSON |  |
| `company` | id |  |
| `created_at` | datetime (ISO 8601) |  |
| `updated_at` | datetime (ISO 8601) |  |
| `open_orders_count` | computed |  |
| `total_balance` | computed |  |

> **Create returns a different shape** with fields: `id`, `customer_number`, `name`, `customer_type`, `email`, `phone`, `mobile`, `website`, `tax_id`, `credit_limit`, `credit_used`, `available_credit`, `payment_terms`, `currency`, `billing_address`, `shipping_address`, `is_active`, `notes`, `assigned_to`, `tags`, `company`, `created_at`, `updated_at`. Re-fetch the detail if you need the full object.

**List item shape** (shorter than retrieve)

| Field | Type | Notes |
|---|---|---|
| `id` | integer |  |
| `customer_number` | string |  |
| `name` | string |  |
| `customer_type` | enum | one of: `individual`, `business`, `government` |
| `email` | email |  |
| `phone` | string |  |
| `is_active` | boolean |  |
| `available_credit` | computed |  |

**Examples** (real responses from the running API)

<details><summary>Example: list → <code>200</code></summary>

```http
GET /api/sales/customers/
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": 17,
      "customer_number": "CUST-00016",
      "name": "Erickson and Sons",
      "customer_type": "business",
      "email": "nlopez@example.org",
      "phone": "981.775.9534",
      "is_active": true,
      "available_credit": 87421.2092
    }
  ],
  "metadata": {
    "timestamp": "2026-10-03T21:50:24.227188Z",
    "version": "1.0",
    "total_count": 8
  }
}
```

</details>

<details><summary>Example: Create customer → <code>201</code></summary>

```http
POST /api/sales/customers/
```

Request body:

```json
{
  "name": "Nile Retail",
  "customer_type": "business",
  "email": "buyer@nile.example",
  "phone": "+20221234567",
  "credit_limit": "50000.00",
  "payment_terms": "Net 30",
  "currency": "EGP",
  "billing_address": {
    "street": "5 Tahrir Sq",
    "city": "Cairo",
    "country": "EG"
  }
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "customer_number": "CUST-00001",
    "name": "Nile Retail",
    "customer_type": "business",
    "email": "buyer@nile.example",
    "phone": "+20221234567",
    "mobile": "",
    "website": "",
    "tax_id": "",
    "credit_limit": "50000.0000",
    "credit_used": "0.0000",
    "available_credit": 50000.0,
    "payment_terms": "Net 30",
    "currency": "EGP",
    "billing_address": {
      "street": "5 Tahrir Sq",
      "city": "Cairo",
      "country": "EG"
    },
    "shipping_address": {},
    "is_active": true,
    "notes": "",
    "assigned_to": null,
    "tags": [],
    "company": 1,
    "created_at": "2026-10-04T00:57:39.976409+03:00",
    "updated_at": "2026-10-04T00:57:39.976465+03:00"
  },
  "metadata": {
    "timestamp": "2026-10-03T21:57:39.978687Z",
    "version": "1.0"
  }
}
```

</details>

#### `GET /api/sales/customers/{id}/statement/` — Customer statement

Returns: `{customer, open_orders[], …}` — the customer plus orders in confirmed/picking/shipped status.

<details><summary>Example: Customer statement → <code>200</code></summary>

```http
GET /api/sales/customers/1/statement/
```

Response:

```json
{
  "success": true,
  "data": {
    "customer": {
      "id": 1,
      "customer_number": "CUST-00001",
      "name": "Nile Retail",
      "customer_type": "business",
      "email": "buyer@nile.example",
      "phone": "+20221234567",
      "mobile": "",
      "website": "",
      "tax_id": "",
      "credit_limit": "50000.0000",
      "credit_used": "0.0000",
      "available_credit": 50000.0,
      "payment_terms": "Net 30",
      "currency": "EGP",
      "billing_address": {
        "street": "5 Tahrir Sq",
        "city": "Cairo",
        "country": "EG"
      },
      "shipping_address": {},
      "is_active": true,
      "notes": "",
      "assigned_to": null,
      "tags": [],
      "company": 1,
      "created_at": "2026-10-04T00:57:39.976409+03:00",
      "updated_at": "2026-10-04T00:57:39.976465+03:00",
      "open_orders_count": 0,
      "total_balance": 0.0
    },
    "open_orders": [],
    "balance": {
      "credit_limit": 50000.0,
      "credit_used": 0.0,
  … (truncated)
```

</details>

### Sales orders

`order_number` is generated. Lines are sent in the same request (`lines`). Status flow: `draft → confirmed → picking → shipped → delivered` (or `cancelled` / `on_hold`).

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/sales/sales-orders/` | List |
| `POST` | `/api/sales/sales-orders/` | Create |
| `GET` | `/api/sales/sales-orders/{id}/` | Retrieve |
| `PUT` | `/api/sales/sales-orders/{id}/` | Replace (all required fields; drafts only) |
| `PATCH` | `/api/sales/sales-orders/{id}/` | Partial update (drafts only) |
| `DELETE` | `/api/sales/sales-orders/{id}/` | Delete (drafts only) |
| `POST` | `/api/sales/sales-orders/{id}/confirm/` | Confirm order (reserves stock, checks credit) |
| `POST` | `/api/sales/sales-orders/{id}/cancel/` | Cancel order |
| `POST` | `/api/sales/sales-orders/{id}/clone/` | Copy as a new draft order |
| `POST` | `/api/sales/sales-orders/{id}/create_delivery/` | Ship lines: create a delivery note and issue stock |
| `POST` | `/api/sales/sales-orders/{id}/mark_delivered/` | Mark the order delivered |

Update and delete are refused with `400` `"Only draft orders can be changed (order is confirmed)."` (or `deleted`)
once the order has left `draft`: cancel it instead.

**List query parameters**

| Query param | Meaning |
|---|---|
| `search` | Text search in: `order_number`, `reference`, `customer__name` |
| `ordering` | Sort by `order_date`, `order_number`, `total_amount` (prefix `-` for descending) |
| `status`, `customer`, `warehouse`, `priority` | Exact-match filters |

**Create body** (`POST`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `customer` | id (Customer) | **yes** |  |
| `warehouse` | id (Warehouse) | **yes** |  |
| `required_date` | date (YYYY-MM-DD) | no | nullable |
| `shipping_address` | object/JSON | no |  |
| `billing_address` | object/JSON | no |  |
| `payment_terms` | string | no | max 100 chars |
| `currency` | string | no | max 3 chars |
| `discount_amount` | decimal (string) | no |  |
| `shipping_cost` | decimal (string) | no |  |
| `reference` | string | no | max 100 chars |
| `priority` | enum | no | one of: `normal`, `high`, `urgent` |
| `tags` | object/JSON | no |  |
| `notes` | string | no |  |
| `internal_notes` | string | no |  |
| `lines` | array of objects | **yes** |  |
| &nbsp;&nbsp;↳ `product` | id (Product) | **yes** |  |
| &nbsp;&nbsp;↳ `variant` | id (ProductVariant) | no | nullable |
| &nbsp;&nbsp;↳ `description` | string | no | max 500 chars |
| &nbsp;&nbsp;↳ `quantity_ordered` | decimal (string) | **yes** |  |
| &nbsp;&nbsp;↳ `unit_price` | decimal (string) | **yes** |  |
| &nbsp;&nbsp;↳ `discount_percent` | decimal (string) | no |  |
| &nbsp;&nbsp;↳ `tax_percent` | decimal (string) | no |  |
| &nbsp;&nbsp;↳ `warehouse_bin` | id (Bin) | no | nullable |
| &nbsp;&nbsp;↳ `batch` | id (Batch) | no | nullable |
| &nbsp;&nbsp;↳ `serials` | array of ids (SerialNumber) | no |  |
| &nbsp;&nbsp;↳ `notes` | string | no |  |

_Update (`PUT`/`PATCH`) accepts the same fields; with `PATCH` every field is optional._

**Response object** (retrieve)

| Field | Type | Notes |
|---|---|---|
| `id` | integer |  |
| `order_number` | string |  |
| `customer` | id (Customer) |  |
| `customer_name` | string |  |
| `customer_number` | string |  |
| `status` | enum | one of: `draft`, `confirmed`, `picking`, `shipped`, `delivered`, `cancelled`, `on_hold` |
| `warehouse` | id (Warehouse) |  |
| `warehouse_name` | string |  |
| `order_date` | date (YYYY-MM-DD) |  |
| `required_date` | date (YYYY-MM-DD) |  |
| `shipped_date` | date (YYYY-MM-DD) |  |
| `shipping_address` | object/JSON |  |
| `billing_address` | object/JSON |  |
| `payment_terms` | string |  |
| `currency` | string |  |
| `subtotal` | decimal (string) |  |
| `tax_amount` | decimal (string) |  |
| `discount_amount` | decimal (string) |  |
| `shipping_cost` | decimal (string) |  |
| `total_amount` | decimal (string) |  |
| `reference` | string |  |
| `approved_by` | id |  |
| `approved_at` | datetime (ISO 8601) |  |
| `cancelled_reason` | string |  |
| `priority` | enum | one of: `normal`, `high`, `urgent` |
| `tags` | object/JSON |  |
| `notes` | string |  |
| `internal_notes` | string |  |
| `lines` | array of objects | fields: id, line_number, product, product_name, variant, sku, description, quantity_ordered, quantity_reserved, quantity_picked, quantity_shipped, unit_price … |
| `fulfillment_percent` | computed |  |
| `company` | id |  |
| `created_at` | datetime (ISO 8601) |  |
| `updated_at` | datetime (ISO 8601) |  |

> **Create returns a different shape** with fields: `id`, `order_number`, `status`, `customer`, `warehouse`, `required_date`, `shipping_address`, `billing_address`, `payment_terms`, `currency`, `discount_amount`, `shipping_cost`, `reference`, `priority`, `tags`, `notes`, `internal_notes`, `lines`. Re-fetch the detail if you need the full object.

**List item shape** (shorter than retrieve)

| Field | Type | Notes |
|---|---|---|
| `id` | integer |  |
| `order_number` | string |  |
| `customer` | id (Customer) |  |
| `customer_name` | string |  |
| `status` | enum | one of: `draft`, `confirmed`, `picking`, `shipped`, `delivered`, `cancelled`, `on_hold` |
| `warehouse` | id (Warehouse) |  |
| `warehouse_name` | string |  |
| `order_date` | date (YYYY-MM-DD) |  |
| `required_date` | date (YYYY-MM-DD) |  |
| `total_amount` | decimal (string) |  |
| `currency` | string |  |
| `priority` | enum | one of: `normal`, `high`, `urgent` |
| `total_lines` | computed |  |
| `fulfillment_percent` | computed |  |
| `company` | id (Company) |  |
| `created_at` | datetime (ISO 8601) |  |

**Examples** (real responses from the running API)

<details><summary>Example: list → <code>200</code></summary>

```http
GET /api/sales/sales-orders/
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": 14,
      "order_number": "SO-2026-00013",
      "customer": 18,
      "customer_name": "Santana Inc",
      "status": "draft",
      "warehouse": 83,
      "warehouse_name": "Warehouse 82",
      "order_date": "2026-10-04",
      "required_date": "2026-09-28",
      "total_amount": "0.0000",
      "currency": "USD",
      "priority": "normal",
      "total_lines": 1,
      "fulfillment_percent": 0.0,
      "company": 1,
      "created_at": "2026-10-04T00:50:16.047194+03:00"
    }
  ],
  "metadata": {
    "timestamp": "2026-10-03T21:50:24.331871Z",
    "version": "1.0",
    "total_count": 4
  }
}
```

</details>

<details><summary>Example: Create sales order → <code>201</code></summary>

```http
POST /api/sales/sales-orders/
```

Request body:

```json
{
  "customer": 1,
  "warehouse": 1,
  "required_date": "2026-10-15",
  "priority": "normal",
  "reference": "PO-NILE-77",
  "lines": [
    {
      "product": 1,
      "variant": 1,
      "quantity_ordered": "10",
      "unit_price": "250.00",
      "discount_percent": "5"
    }
  ]
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "order_number": "SO-2026-00001",
    "status": "draft",
    "customer": 1,
    "warehouse": 1,
    "required_date": "2026-10-15",
    "shipping_address": {},
    "billing_address": {},
    "payment_terms": "",
    "currency": "USD",
    "discount_amount": "0.0000",
    "shipping_cost": "0.0000",
    "reference": "PO-NILE-77",
    "priority": "normal",
    "tags": [],
    "notes": "",
    "internal_notes": "",
    "lines": [
      {
        "id": 1,
        "product": 1,
        "variant": 1,
        "description": "Smartphone X",
        "quantity_ordered": "10.000",
        "unit_price": "250.0000",
        "discount_percent": "5.00",
        "tax_percent": "0.00",
        "warehouse_bin": null,
        "batch": null,
        "serials": [],
        "notes": ""
      }
    ]
  },
  "metadata": {
  … (truncated)
```

</details>

#### `POST /api/sales/sales-orders/{id}/confirm/` — Confirm order (reserves stock, checks credit)

_No body._

Returns: the order.

<details><summary>Example: Confirm order → <code>200</code></summary>

```http
POST /api/sales/sales-orders/1/confirm/
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "order_number": "SO-2026-00001",
    "customer": 1,
    "customer_name": "Nile Retail",
    "customer_number": "CUST-00001",
    "status": "confirmed",
    "warehouse": 1,
    "warehouse_name": "Main Warehouse",
    "order_date": "2026-10-04",
    "required_date": "2026-10-15",
    "shipped_date": null,
    "shipping_address": {},
    "billing_address": {},
    "payment_terms": "",
    "currency": "USD",
    "subtotal": "2875.0000",
    "tax_amount": "0.0000",
    "discount_amount": "0.0000",
    "shipping_cost": "0.0000",
    "total_amount": "2875.0000",
    "reference": "PO-NILE-77",
    "approved_by": 1,
    "approved_at": "2026-10-04T00:57:40.101867+03:00",
    "cancelled_reason": "",
    "priority": "normal",
    "tags": [],
    "notes": "",
    "internal_notes": "",
    "lines": [
      {
        "id": 1,
        "line_number": 1,
        "product": 1,
        "product_name": "Smartphone X",
        "variant": 1,
  … (truncated)
```

</details>

#### `POST /api/sales/sales-orders/{id}/cancel/` — Cancel order

| Field | Type | Required | Notes |
|---|---|---|---|
| reason | string | no |  |

Returns: the order.

<details><summary>Example: Cancel order → <code>200</code></summary>

```http
POST /api/sales/sales-orders/3/cancel/
```

Request body:

```json
{
  "reason": "Duplicate"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 3,
    "order_number": "SO-2026-00003",
    "customer": 1,
    "customer_name": "Nile Retail",
    "customer_number": "CUST-00001",
    "status": "cancelled",
    "warehouse": 1,
    "warehouse_name": "Main Warehouse",
    "order_date": "2026-10-04",
    "required_date": null,
    "shipped_date": null,
    "shipping_address": {},
    "billing_address": {},
    "payment_terms": "",
    "currency": "USD",
    "subtotal": "250.0000",
    "tax_amount": "0.0000",
    "discount_amount": "0.0000",
    "shipping_cost": "0.0000",
    "total_amount": "250.0000",
    "reference": "",
    "approved_by": null,
    "approved_at": null,
    "cancelled_reason": "Duplicate",
    "priority": "normal",
    "tags": [],
    "notes": "",
    "internal_notes": "",
    "lines": [
      {
        "id": 5,
        "line_number": 1,
        "product": 1,
        "product_name": "Smartphone X",
        "variant": null,
  … (truncated)
```

</details>

#### `POST /api/sales/sales-orders/{id}/clone/` — Copy as a new draft order

_No body._

Returns: the new order.

<details><summary>Example: Clone order → <code>200</code></summary>

```http
POST /api/sales/sales-orders/1/clone/
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 2,
    "order_number": "SO-2026-00002",
    "customer": 1,
    "customer_name": "Nile Retail",
    "customer_number": "CUST-00001",
    "status": "draft",
    "warehouse": 1,
    "warehouse_name": "Main Warehouse",
    "order_date": "2026-10-04",
    "required_date": null,
    "shipped_date": null,
    "shipping_address": {},
    "billing_address": {},
    "payment_terms": "",
    "currency": "USD",
    "subtotal": "2875.0000",
    "tax_amount": "0.0000",
    "discount_amount": "0.0000",
    "shipping_cost": "0.0000",
    "total_amount": "2875.0000",
    "reference": "",
    "approved_by": null,
    "approved_at": null,
    "cancelled_reason": "",
    "priority": "normal",
    "tags": [],
    "notes": "Cloned from SO-2026-00001",
    "internal_notes": "",
    "lines": [
      {
        "id": 3,
        "line_number": 1,
        "product": 1,
        "product_name": "Smartphone X",
        "variant": 1,
  … (truncated)
```

</details>

#### `POST /api/sales/sales-orders/{id}/create_delivery/` — Ship lines: create a delivery note and issue stock

Order must be `confirmed` or `picking`. Quantity per line cannot exceed `quantity_ordered − quantity_shipped`.

| Field | Type | Required | Notes |
|---|---|---|---|
| lines | array | **yes** | items below |
| ↳ line_id | id (SalesOrderLine) | **yes** |  |
| ↳ quantity | decimal | **yes** |  |
| ↳ batch_id | id | no |  |
| ↳ bin_id | id | no | auto-picked if omitted |
| ↳ serial_ids | array of ids | no |  |
| carrier | string | no |  |
| tracking_number | string | no |  |

Returns: the delivery note.

<details><summary>Example: Create delivery from order → <code>200</code></summary>

```http
POST /api/sales/sales-orders/1/create_delivery/
```

Request body:

```json
{
  "carrier": "Aramex",
  "tracking_number": "ARX123",
  "lines": [
    {
      "line_id": 1,
      "quantity": 10
    },
    {
      "line_id": 2,
      "quantity": 2
    }
  ]
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "sales_order": 1,
    "sales_order_number": "SO-2026-00001",
    "customer_name": "Nile Retail",
    "delivery_number": "DN-2026-00001",
    "status": "draft",
    "warehouse": 1,
    "warehouse_name": "Main Warehouse",
    "shipped_date": null,
    "delivered_date": null,
    "carrier": "Aramex",
    "tracking_number": "ARX123",
    "shipping_method": "standard",
    "notes": "",
    "created_by": 1,
    "created_by_name": "Sara Ali",
    "lines": [
      {
        "id": 1,
        "delivery_note": 1,
        "sales_order_line": 1,
        "product": 1,
        "product_name": "Smartphone X",
        "sku": "SKU-0",
        "quantity_delivered": "10.000",
        "batch": 1,
        "serials": [],
        "bin": null,
        "company": 1,
        "created_at": "2026-10-04T00:57:40.145088+03:00",
        "updated_at": "2026-10-04T00:57:40.145144+03:00"
      }
    ],
    "company": 1,
    "created_at": "2026-10-04T00:57:40.134758+03:00",
  … (truncated)
```

</details>

#### `POST /api/sales/sales-orders/{id}/mark_delivered/` — Mark the order delivered

_No body._

Returns: the order.

<details><summary>Example: Mark order delivered → <code>200</code></summary>

```http
POST /api/sales/sales-orders/1/mark_delivered/
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "order_number": "SO-2026-00001",
    "customer": 1,
    "customer_name": "Nile Retail",
    "customer_number": "CUST-00001",
    "status": "delivered",
    "warehouse": 1,
    "warehouse_name": "Main Warehouse",
    "order_date": "2026-10-04",
    "required_date": "2026-10-15",
    "shipped_date": "2026-10-03",
    "shipping_address": {},
    "billing_address": {},
    "payment_terms": "",
    "currency": "USD",
    "subtotal": "2875.0000",
    "tax_amount": "0.0000",
    "discount_amount": "0.0000",
    "shipping_cost": "0.0000",
    "total_amount": "2875.0000",
    "reference": "PO-NILE-77",
    "approved_by": 1,
    "approved_at": "2026-10-04T00:57:40.101867+03:00",
    "cancelled_reason": "",
    "priority": "normal",
    "tags": [],
    "notes": "",
    "internal_notes": "",
    "lines": [
      {
        "id": 1,
        "line_number": 1,
        "product": 1,
        "product_name": "Smartphone X",
        "variant": 1,
  … (truncated)
```

</details>

### Sales order lines

Add/edit/remove lines **only while the order is `draft`** (400 otherwise). `line_number` is assigned automatically and order totals are recalculated.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/sales/sales-order-lines/` | List |
| `POST` | `/api/sales/sales-order-lines/` | Create |
| `GET` | `/api/sales/sales-order-lines/{id}/` | Retrieve |
| `PUT` | `/api/sales/sales-order-lines/{id}/` | Replace (all required fields) |
| `PATCH` | `/api/sales/sales-order-lines/{id}/` | Partial update |
| `DELETE` | `/api/sales/sales-order-lines/{id}/` | Delete |

**List query parameters**

| Query param | Meaning |
|---|---|
| `ordering` | Sort by `line_number` (prefix `-` for descending) |
| `sales_order`, `product` | Exact-match filters |

**Create body** (`POST`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `sales_order` | id (SalesOrder) | **yes** |  |
| `product` | id (Product) | **yes** |  |
| `variant` | id (ProductVariant) | no | nullable |
| `description` | string | no | max 500 chars |
| `quantity_ordered` | decimal (string) | **yes** |  |
| `unit_price` | decimal (string) | **yes** |  |
| `discount_percent` | decimal (string) | no |  |
| `tax_percent` | decimal (string) | no |  |
| `warehouse_bin` | id (Bin) | no | nullable |
| `batch` | id (Batch) | no | nullable |
| `serials` | array of ids (SerialNumber) | no |  |
| `notes` | string | no |  |

**Update body** (`PUT`/`PATCH`; with `PATCH` every field is optional)

| Field | Type | Required | Notes |
|---|---|---|---|
| `product` | id (Product) | **yes** |  |
| `variant` | id (ProductVariant) | no | nullable |
| `description` | string | no | max 500 chars |
| `quantity_ordered` | decimal (string) | **yes** |  |
| `unit_price` | decimal (string) | **yes** |  |
| `discount_percent` | decimal (string) | no |  |
| `tax_percent` | decimal (string) | no |  |
| `warehouse_bin` | id (Bin) | no | nullable |
| `batch` | id (Batch) | no | nullable |
| `serials` | array of ids (SerialNumber) | no |  |
| `notes` | string | no |  |

**Response object** (retrieve; create/update return the same shape)

| Field | Type | Notes |
|---|---|---|
| `id` | integer |  |
| `line_number` | integer |  |
| `product` | id (Product) |  |
| `product_name` | string |  |
| `variant` | id (ProductVariant) |  |
| `sku` | string |  |
| `description` | string |  |
| `quantity_ordered` | decimal (string) |  |
| `quantity_reserved` | decimal (string) |  |
| `quantity_picked` | decimal (string) |  |
| `quantity_shipped` | decimal (string) |  |
| `unit_price` | decimal (string) |  |
| `discount_percent` | decimal (string) |  |
| `tax_percent` | decimal (string) |  |
| `line_total` | decimal (string) |  |
| `warehouse_bin` | id (Bin) |  |
| `batch` | id (Batch) |  |
| `serials` | array of ids (SerialNumber) |  |
| `notes` | string |  |
| `company` | id |  |
| `created_at` | datetime (ISO 8601) |  |
| `updated_at` | datetime (ISO 8601) |  |

**Examples** (real responses from the running API)

<details><summary>Example: list → <code>200</code></summary>

```http
GET /api/sales/sales-order-lines/
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "line_number": 0,
      "product": 41,
      "product_name": "Product 40",
      "variant": 37,
      "sku": "SKU-36",
      "description": "Product 40",
      "quantity_ordered": "83.064",
      "quantity_reserved": "0.000",
      "quantity_picked": "0.000",
      "quantity_shipped": "0.000",
      "unit_price": "212.4582",
      "discount_percent": "0.00",
      "tax_percent": "0.00",
      "line_total": "17647.6279",
      "warehouse_bin": 7,
      "batch": 5,
      "serials": [],
      "notes": "",
      "company": 1,
      "created_at": "2026-10-04T00:50:05.403497+03:00",
      "updated_at": "2026-10-04T00:50:05.403515+03:00"
    }
  ],
  "metadata": {
    "timestamp": "2026-10-03T21:50:24.433875Z",
    "version": "1.0",
    "total_count": 8
  }
}
```

</details>

<details><summary>Example: Add line to draft order → <code>201</code></summary>

```http
POST /api/sales/sales-order-lines/
```

Request body:

```json
{
  "sales_order": 1,
  "product": 1,
  "variant": 1,
  "quantity_ordered": "2",
  "unit_price": "250.00"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 2,
    "line_number": 2,
    "product": 1,
    "product_name": "Smartphone X",
    "variant": 1,
    "sku": "SKU-0",
    "description": "Smartphone X",
    "quantity_ordered": "2.000",
    "quantity_reserved": "0.000",
    "quantity_picked": "0.000",
    "quantity_shipped": "0.000",
    "unit_price": "250.0000",
    "discount_percent": "0.00",
    "tax_percent": "0.00",
    "line_total": "500.0000",
    "warehouse_bin": null,
    "batch": null,
    "serials": [],
    "notes": "",
    "company": 1,
    "created_at": "2026-10-04T00:57:40.030254+03:00",
    "updated_at": "2026-10-04T00:57:40.030347+03:00"
  },
  "metadata": {
    "timestamp": "2026-10-03T21:57:40.039942Z",
    "version": "1.0"
  }
}
```

</details>

### Delivery notes

Usually created via `sales-orders/{id}/create_delivery/`. `POST` here with `lines` (same item shape as `create_delivery`) also issues stock; without `lines` it creates an empty draft header. Order must be `confirmed`/`picking`. Status flow: `draft → confirmed → in_transit → delivered` (or `failed`).

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/sales/delivery-notes/` | List |
| `POST` | `/api/sales/delivery-notes/` | Create |
| `GET` | `/api/sales/delivery-notes/{id}/` | Retrieve |
| `PUT` | `/api/sales/delivery-notes/{id}/` | Replace (all required fields) |
| `PATCH` | `/api/sales/delivery-notes/{id}/` | Partial update |
| `DELETE` | `/api/sales/delivery-notes/{id}/` | Delete |
| `POST` | `/api/sales/delivery-notes/{id}/confirm_delivery/` | Confirm (draft → confirmed); updates shipped quantities |
| `POST` | `/api/sales/delivery-notes/{id}/mark_delivered/` | Mark delivered (in_transit → delivered) |

**List query parameters**

| Query param | Meaning |
|---|---|
| `search` | Text search in: `delivery_number`, `tracking_number` |
| `ordering` | Sort by `shipped_date`, `delivery_number` (prefix `-` for descending) |
| `status`, `sales_order`, `warehouse` | Exact-match filters |

**Create body** (`POST`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `sales_order` | id (SalesOrder) | **yes** |  |
| `carrier` | string | no | max 100 chars |
| `tracking_number` | string | no | max 100 chars |
| `shipping_method` | enum | no | one of: `standard`, `express`, `overnight`, `pickup` |
| `notes` | string | no |  |
| `lines` | array of object | no |  |

_Update (`PUT`/`PATCH`) accepts the same fields; with `PATCH` every field is optional._

**Response object** (retrieve; create/update return the same shape)

| Field | Type | Notes |
|---|---|---|
| `id` | integer |  |
| `sales_order` | id (SalesOrder) |  |
| `sales_order_number` | string |  |
| `customer_name` | string |  |
| `delivery_number` | string |  |
| `status` | enum | one of: `draft`, `confirmed`, `in_transit`, `delivered`, `failed` |
| `warehouse` | id (Warehouse) |  |
| `warehouse_name` | string |  |
| `shipped_date` | date (YYYY-MM-DD) |  |
| `delivered_date` | date (YYYY-MM-DD) |  |
| `carrier` | string |  |
| `tracking_number` | string |  |
| `shipping_method` | enum | one of: `standard`, `express`, `overnight`, `pickup` |
| `notes` | string |  |
| `created_by` | id (User) |  |
| `created_by_name` | computed |  |
| `lines` | array of objects | fields: id, delivery_note, sales_order_line, product, product_name, sku, quantity_delivered, batch, serials, bin, company, created_at … |
| `company` | id |  |
| `created_at` | datetime (ISO 8601) |  |
| `updated_at` | datetime (ISO 8601) |  |

**List item shape** (shorter than retrieve)

| Field | Type | Notes |
|---|---|---|
| `id` | integer |  |
| `sales_order` | id (SalesOrder) |  |
| `sales_order_number` | string |  |
| `customer_name` | string |  |
| `delivery_number` | string |  |
| `status` | enum | one of: `draft`, `confirmed`, `in_transit`, `delivered`, `failed` |
| `warehouse` | id (Warehouse) |  |
| `warehouse_name` | string |  |
| `shipped_date` | date (YYYY-MM-DD) |  |
| `delivered_date` | date (YYYY-MM-DD) |  |
| `carrier` | string |  |
| `tracking_number` | string |  |
| `shipping_method` | enum | one of: `standard`, `express`, `overnight`, `pickup` |
| `company` | id (Company) |  |
| `created_at` | datetime (ISO 8601) |  |

**Examples** (real responses from the running API)

<details><summary>Example: list → <code>200</code></summary>

```http
GET /api/sales/delivery-notes/
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": 2,
      "sales_order": 2,
      "sales_order_number": "SO-2026-00001",
      "customer_name": "Hendrix Group",
      "delivery_number": "DN-2026-00001",
      "status": "draft",
      "warehouse": 62,
      "warehouse_name": "Warehouse 61",
      "shipped_date": null,
      "delivered_date": null,
      "carrier": "Odonnell, Faulkner and Adams",
      "tracking_number": "TRK-MyyP-RQZl-rLdZ",
      "shipping_method": "standard",
      "company": 1,
      "created_at": "2026-10-04T00:50:03.250447+03:00"
    }
  ],
  "metadata": {
    "timestamp": "2026-10-03T21:50:24.497614Z",
    "version": "1.0",
    "total_count": 2
  }
}
```

</details>

#### `POST /api/sales/delivery-notes/{id}/confirm_delivery/` — Confirm (draft → confirmed); updates shipped quantities

_No body._

Returns: the delivery note.

<details><summary>Example: Confirm delivery note → <code>200</code></summary>

```http
POST /api/sales/delivery-notes/1/confirm_delivery/
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "sales_order": 1,
    "sales_order_number": "SO-2026-00001",
    "customer_name": "Nile Retail",
    "delivery_number": "DN-2026-00001",
    "status": "confirmed",
    "warehouse": 1,
    "warehouse_name": "Main Warehouse",
    "shipped_date": "2026-10-03",
    "delivered_date": null,
    "carrier": "Aramex",
    "tracking_number": "ARX123",
    "shipping_method": "standard",
    "notes": "",
    "created_by": 1,
    "created_by_name": "Sara Ali",
    "lines": [
      {
        "id": 1,
        "delivery_note": 1,
        "sales_order_line": 1,
        "product": 1,
        "product_name": "Smartphone X",
        "sku": "SKU-0",
        "quantity_delivered": "10.000",
        "batch": 1,
        "serials": [],
        "bin": null,
        "company": 1,
        "created_at": "2026-10-04T00:57:40.145088+03:00",
        "updated_at": "2026-10-04T00:57:40.145144+03:00"
      }
    ],
    "company": 1,
    "created_at": "2026-10-04T00:57:40.134758+03:00",
  … (truncated)
```

</details>

#### `POST /api/sales/delivery-notes/{id}/mark_delivered/` — Mark delivered (in_transit → delivered)

_No body._

Returns: the delivery note.

<details><summary>Example: Mark delivery note delivered → <code>400</code></summary>

```http
POST /api/sales/delivery-notes/1/mark_delivered/
```

Response:

```json
{
  "success": false,
  "data": null,
  "metadata": {
    "timestamp": "2026-10-03T21:57:40.233953Z",
    "version": "1.0"
  },
  "error": {
    "code": 400,
    "message": "Can only mark IN_TRANSIT deliveries as delivered",
    "errors": {}
  }
}
```

</details>

Allowed from `in_transit` (set by `ship` below), or straight from `confirmed` when `shipping_method` is `pickup`.

#### `POST /api/sales/delivery-notes/{id}/ship/` — Hand to the carrier (confirmed → in_transit)

Body (optional): `carrier`, `tracking_number`. Sets `shipped_date` if empty. Returns the delivery note.

#### `POST /api/sales/delivery-notes/{id}/mark_failed/` — Failed delivery attempt (in_transit → failed)

Body (optional): `reason`. Goods stay issued; handle them with a customer return.

### Delivery note lines

Editable only while the delivery note is `draft`.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/sales/delivery-note-lines/` | List |
| `POST` | `/api/sales/delivery-note-lines/` | Create |
| `GET` | `/api/sales/delivery-note-lines/{id}/` | Retrieve |
| `PUT` | `/api/sales/delivery-note-lines/{id}/` | Replace (all required fields) |
| `PATCH` | `/api/sales/delivery-note-lines/{id}/` | Partial update |
| `DELETE` | `/api/sales/delivery-note-lines/{id}/` | Delete |

**List query parameters**

| Query param | Meaning |
|---|---|
| `delivery_note`, `product` | Exact-match filters |

**Create body** (`POST`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `delivery_note` | id (DeliveryNote) | **yes** |  |
| `sales_order_line` | id (SalesOrderLine) | **yes** |  |
| `product` | id (Product) | **yes** |  |
| `quantity_delivered` | decimal (string) | **yes** |  |
| `batch` | id (Batch) | no | nullable |
| `serials` | array of ids (SerialNumber) | no |  |
| `bin` | id (Bin) | no | nullable |

_Update (`PUT`/`PATCH`) accepts the same fields; with `PATCH` every field is optional._

**Response object** (retrieve; create/update return the same shape)

| Field | Type | Notes |
|---|---|---|
| `id` | integer |  |
| `delivery_note` | id (DeliveryNote) |  |
| `sales_order_line` | id (SalesOrderLine) |  |
| `product` | id (Product) |  |
| `product_name` | string |  |
| `sku` | string |  |
| `quantity_delivered` | decimal (string) |  |
| `batch` | id (Batch) |  |
| `serials` | array of ids (SerialNumber) |  |
| `bin` | id (Bin) |  |
| `company` | id |  |
| `created_at` | datetime (ISO 8601) |  |
| `updated_at` | datetime (ISO 8601) |  |

**Examples** (real responses from the running API)

<details><summary>Example: list → <code>200</code></summary>

```http
GET /api/sales/delivery-note-lines/
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "delivery_note": 3,
      "sales_order_line": 1,
      "product": 41,
      "product_name": "Product 40",
      "sku": "SKU-36",
      "quantity_delivered": "14.250",
      "batch": 6,
      "serials": [],
      "bin": 8,
      "company": 1,
      "created_at": "2026-10-04T00:50:05.409880+03:00",
      "updated_at": "2026-10-04T00:50:05.409898+03:00"
    }
  ],
  "metadata": {
    "timestamp": "2026-10-03T21:50:24.554565Z",
    "version": "1.0",
    "total_count": 2
  }
}
```

</details>

### Sales invoices

`invoice_number` is generated (`INV-YYYY-NNNNN`). `status` is never writable by the client — use the actions. Only `draft` invoices can be edited or deleted. Status flow: `draft → issued → paid` (or `cancelled`, `overdue`). Payment status: `pending → partial → paid`.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/sales/sales-invoices/` | List |
| `POST` | `/api/sales/sales-invoices/` | Create |
| `GET` | `/api/sales/sales-invoices/{id}/` | Retrieve |
| `PUT` | `/api/sales/sales-invoices/{id}/` | Replace (all required fields) |
| `PATCH` | `/api/sales/sales-invoices/{id}/` | Partial update |
| `DELETE` | `/api/sales/sales-invoices/{id}/` | Delete |
| `POST` | `/api/sales/sales-invoices/create_from_order/` | Create a draft invoice from a delivered order |
| `POST` | `/api/sales/sales-invoices/{id}/issue/` | Issue (draft → issued) |
| `POST` | `/api/sales/sales-invoices/{id}/pay/` | Record a payment |
| `POST` | `/api/sales/sales-invoices/{id}/cancel/` | Cancel (not allowed if any payment is applied) |

**List query parameters**

| Query param | Meaning |
|---|---|
| `search` | Text search in: `invoice_number`, `reference`, `customer__name` |
| `ordering` | Sort by `invoice_date`, `invoice_number`, `total_amount`, `amount_paid` (prefix `-` for descending) |
| `status`, `payment_status`, `customer`, `sales_order`, `delivery_note` | Exact-match filters |

**Create body** (`POST`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `sales_order` | id (SalesOrder) | **yes** |  |
| `delivery_note` | id (DeliveryNote) | no | nullable |
| `due_date` | date (YYYY-MM-DD) | no | nullable |
| `reference` | string | no | max 100 chars |
| `notes` | string | no |  |
| `payment_terms` | string | no | max 100 chars |
| `lines` | array of object | no |  |

_Update (`PUT`/`PATCH`) accepts the same fields; with `PATCH` every field is optional._

**Response object** (retrieve; create/update return the same shape)

| Field | Type | Notes |
|---|---|---|
| `id` | integer |  |
| `invoice_number` | string |  |
| `uuid` | uuid |  |
| `sales_order` | id (SalesOrder) |  |
| `sales_order_number` | string |  |
| `delivery_note` | id (DeliveryNote) |  |
| `delivery_note_number` | string — omitted when empty |  |
| `status` | enum | one of: `draft`, `issued`, `paid`, `overdue`, `cancelled` |
| `payment_status` | enum | one of: `pending`, `partial`, `paid`, `overpaid`, `failed` |
| `invoice_date` | date (YYYY-MM-DD) |  |
| `due_date` | date (YYYY-MM-DD) |  |
| `customer` | id (Customer) |  |
| `customer_name` | string |  |
| `currency` | string |  |
| `subtotal` | decimal (string) |  |
| `tax_amount` | decimal (string) |  |
| `discount_amount` | decimal (string) | the order's discount (first invoice of the order only) |
| `shipping_cost` | decimal (string) | the order's shipping (first invoice of the order only) |
| `total_amount` | decimal (string) | `subtotal + tax_amount + shipping_cost - discount_amount` |
| `amount_paid` | decimal (string) |  |
| `amount_due` | decimal (string) | `total_amount - amount_paid` |
| `payment_percentage` | computed |  |
| `reference` | string |  |
| `notes` | string |  |
| `payment_terms` | string |  |
| `issued_by` | id |  |
| `issued_by_name` | computed |  |
| `paid_by` | id |  |
| `paid_by_name` | computed |  |
| `paid_at` | datetime (ISO 8601) |  |
| `cancelled_by` | id |  |
| `cancelled_at` | datetime (ISO 8601) |  |
| `cancelled_reason` | string |  |
| `created_by` | id |  |
| `created_by_name` | computed |  |
| `lines` | array of objects | fields: id, line_number, delivery_note_line, delivery_note_line_id, sales_order_line, sales_order_line_id, product, product_name, variant, sku, description, quantity … |
| `company` | id |  |
| `created_at` | datetime (ISO 8601) |  |
| `updated_at` | datetime (ISO 8601) |  |

**List item shape** (shorter than retrieve)

| Field | Type | Notes |
|---|---|---|
| `id` | integer |  |
| `invoice_number` | string |  |
| `sales_order` | id (SalesOrder) |  |
| `sales_order_number` | string |  |
| `delivery_note` | id (DeliveryNote) |  |
| `delivery_note_number` | string |  |
| `status` | enum | one of: `draft`, `issued`, `paid`, `overdue`, `cancelled` |
| `payment_status` | enum | one of: `pending`, `partial`, `paid`, `overpaid`, `failed` |
| `invoice_date` | date (YYYY-MM-DD) |  |
| `due_date` | date (YYYY-MM-DD) |  |
| `customer` | id (Customer) |  |
| `customer_name` | string |  |
| `currency` | string |  |
| `total_amount` | decimal (string) |  |
| `amount_paid` | decimal (string) |  |
| `amount_due` | decimal (string) | `total_amount - amount_paid` |
| `payment_percentage` | computed |  |
| `company` | id (Company) |  |
| `created_at` | datetime (ISO 8601) |  |

**Examples** (real responses from the running API)

<details><summary>Example: list → <code>200</code></summary>

```http
GET /api/sales/sales-invoices/
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": 2,
      "invoice_number": "INV-2026-00001",
      "sales_order": 8,
      "sales_order_number": "SO-2026-00007",
      "delivery_note": null,
      "status": "issued",
      "payment_status": "pending",
      "invoice_date": "2026-10-04",
      "due_date": "2026-09-14",
      "customer": 10,
      "customer_name": "Navarro PLC",
      "currency": "USD",
      "total_amount": "0.0000",
      "amount_paid": "0.0000",
      "amount_due": "0.0000",
      "payment_percentage": 0,
      "company": 1,
      "created_at": "2026-10-04T00:50:10.406385+03:00"
    }
  ],
  "metadata": {
    "timestamp": "2026-10-03T21:50:24.611682Z",
    "version": "1.0",
    "total_count": 2
  }
}
```

</details>

#### `POST /api/sales/sales-invoices/create_from_order/` — Create a draft invoice from a delivered order

Bills shipped quantities only. Order must be `delivered`. With `delivery_note`, bills only that delivery.

The order's `shipping_cost` and `discount_amount` are carried onto the **first** invoice of the order (later per-delivery
invoices get `0`), so the invoices of an order add up to the order total.

Each shipment is billed once: `400` `"Order SO-2026-00004 is already invoiced (INV-2026-00001)"` when the order already
has an invoice that isn't cancelled (an invoice of the whole order covers all its deliveries), and
`"Delivery note DN-… is already invoiced (INV-…)"` when that delivery has one. Credit notes from returns don't count;
cancel an invoice to bill it again.

| Field | Type | Required | Notes |
|---|---|---|---|
| sales_order | id | **yes** |  |
| delivery_note | id | no | must belong to the order |
| due_date | date | no |  |
| reference | string | no |  |
| notes | string | no |  |
| payment_terms | string | no |  |

Returns: the invoice (201).

<details><summary>Example: Create invoice from order → <code>201</code></summary>

```http
POST /api/sales/sales-invoices/create_from_order/
```

Request body:

```json
{
  "sales_order": 1,
  "due_date": "2026-11-02"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "invoice_number": "INV-2026-00001",
    "uuid": "9067c4bf-5952-49c3-b768-35792ff25f9b",
    "sales_order": 1,
    "sales_order_number": "SO-2026-00001",
    "delivery_note": null,
    "status": "draft",
    "payment_status": "pending",
    "invoice_date": "2026-10-04",
    "due_date": "2026-11-02",
    "customer": 1,
    "customer_name": "Nile Retail",
    "currency": "USD",
    "subtotal": "2875.0000",
    "tax_amount": "0.0000",
    "discount_amount": "0.0000",
    "total_amount": "2875.0000",
    "amount_paid": "0.0000",
    "amount_due": "2875.0000",
    "payment_percentage": 0.0,
    "reference": "PO-NILE-77",
    "notes": "",
    "payment_terms": "",
    "issued_by": null,
    "issued_by_name": null,
    "paid_by": null,
    "paid_by_name": null,
    "paid_at": null,
    "cancelled_by": null,
    "cancelled_at": null,
    "cancelled_reason": "",
    "created_by": 1,
    "created_by_name": "Sara Ali",
    "lines": [
      {
  … (truncated)
```

</details>

#### `POST /api/sales/sales-invoices/{id}/issue/` — Issue (draft → issued)

_No body._

Returns: the invoice.

<details><summary>Example: Issue invoice → <code>200</code></summary>

```http
POST /api/sales/sales-invoices/1/issue/
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "invoice_number": "INV-2026-00001",
    "uuid": "9067c4bf-5952-49c3-b768-35792ff25f9b",
    "sales_order": 1,
    "sales_order_number": "SO-2026-00001",
    "delivery_note": null,
    "status": "issued",
    "payment_status": "pending",
    "invoice_date": "2026-10-04",
    "due_date": "2026-11-02",
    "customer": 1,
    "customer_name": "Nile Retail",
    "currency": "USD",
    "subtotal": "2875.0000",
    "tax_amount": "0.0000",
    "discount_amount": "0.0000",
    "total_amount": "2875.0000",
    "amount_paid": "0.0000",
    "amount_due": "2875.0000",
    "payment_percentage": 0.0,
    "reference": "PO-NILE-77",
    "notes": "",
    "payment_terms": "",
    "issued_by": 1,
    "issued_by_name": "Sara Ali",
    "paid_by": null,
    "paid_by_name": null,
    "paid_at": null,
    "cancelled_by": null,
    "cancelled_at": null,
    "cancelled_reason": "",
    "created_by": 1,
    "created_by_name": "Sara Ali",
    "lines": [
      {
  … (truncated)
```

</details>

#### `POST /api/sales/sales-invoices/{id}/pay/` — Record a payment

Invoice must be `issued` or `overdue`. `amount` must be > 0 and ≤ `amount_due`. When fully paid the invoice becomes `paid`.

| Field | Type | Required | Notes |
|---|---|---|---|
| amount | decimal | **yes** |  |
| payment_method | enum | no | `cash`, `credit_card`, `bank_transfer` (default), `check`, `other` |
| payment_date | date | no | default today |
| reference | string | no |  |
| notes | string | no |  |

Returns: the invoice.

<details><summary>Example: Pay invoice (partial) → <code>200</code></summary>

```http
POST /api/sales/sales-invoices/1/pay/
```

Request body:

```json
{
  "amount": "1000.00",
  "payment_method": "bank_transfer",
  "reference": "TRX-1"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "invoice_number": "INV-2026-00001",
    "uuid": "9067c4bf-5952-49c3-b768-35792ff25f9b",
    "sales_order": 1,
    "sales_order_number": "SO-2026-00001",
    "delivery_note": null,
    "status": "issued",
    "payment_status": "partial",
    "invoice_date": "2026-10-04",
    "due_date": "2026-11-02",
    "customer": 1,
    "customer_name": "Nile Retail",
    "currency": "USD",
    "subtotal": "2875.0000",
    "tax_amount": "0.0000",
    "discount_amount": "0.0000",
    "total_amount": "2875.0000",
    "amount_paid": "1000.0000",
    "amount_due": "1875.0000",
    "payment_percentage": 34.78,
    "reference": "PO-NILE-77",
    "notes": "",
    "payment_terms": "",
    "issued_by": 1,
    "issued_by_name": "Sara Ali",
    "paid_by": null,
    "paid_by_name": null,
    "paid_at": null,
    "cancelled_by": null,
    "cancelled_at": null,
    "cancelled_reason": "",
    "created_by": 1,
    "created_by_name": "Sara Ali",
    "lines": [
      {
  … (truncated)
```

</details>

#### `POST /api/sales/sales-invoices/{id}/cancel/` — Cancel (not allowed if any payment is applied)

| Field | Type | Required | Notes |
|---|---|---|---|
| reason | string | no |  |

Returns: the invoice.

<details><summary>Example: Cancel invoice with payments → <code>400</code></summary>

```http
POST /api/sales/sales-invoices/1/cancel/
```

Request body:

```json
{
  "reason": "Customer request"
}
```

Response:

```json
{
  "success": false,
  "data": null,
  "metadata": {
    "timestamp": "2026-10-03T21:57:40.447835Z",
    "version": "1.0"
  },
  "error": {
    "code": 400,
    "message": "Cannot cancel an invoice with payments; refund them first",
    "errors": {}
  }
}
```

</details>

### Sales invoice lines (read-only)

Lines are created through the invoice.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/sales/sales-invoice-lines/` | List |
| `GET` | `/api/sales/sales-invoice-lines/{id}/` | Retrieve |

**List query parameters**

| Query param | Meaning |
|---|---|
| `invoice`, `product`, `delivery_note_line`, `sales_order_line` | Exact-match filters |

**Response object** (retrieve; create/update return the same shape)

| Field | Type | Notes |
|---|---|---|
| `id` | integer |  |
| `line_number` | integer |  |
| `delivery_note_line` | id (DeliveryNoteLine) |  |
| `delivery_note_line_id` | integer |  |
| `sales_order_line` | id (SalesOrderLine) |  |
| `sales_order_line_id` | integer |  |
| `product` | id (Product) |  |
| `product_name` | string |  |
| `variant` | id (ProductVariant) |  |
| `sku` | string |  |
| `description` | string |  |
| `quantity` | decimal (string) |  |
| `unit_price` | decimal (string) |  |
| `discount_percent` | decimal (string) |  |
| `tax_percent` | decimal (string) |  |
| `line_total` | decimal (string) |  |
| `batch` | id (Batch) |  |
| `serials` | array of ids (SerialNumber) |  |
| `notes` | string |  |
| `company` | id |  |
| `created_at` | datetime (ISO 8601) |  |
| `updated_at` | datetime (ISO 8601) |  |

**Examples** (real responses from the running API)

<details><summary>Example: list → <code>200</code></summary>

```http
GET /api/sales/sales-invoice-lines/
```

Response:

```json
{
  "success": true,
  "data": [],
  "metadata": {
    "timestamp": "2026-10-03T21:50:24.689181Z",
    "version": "1.0",
    "total_count": 0
  }
}
```

</details>

### Invoice payments

Append-only ledger: you can record and refund payments, not edit or delete them (`PUT`/`PATCH`/`DELETE` → 405). Recording here is equivalent to `sales-invoices/{id}/pay/`.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/sales/invoice-payments/` | List |
| `POST` | `/api/sales/invoice-payments/` | Create |
| `GET` | `/api/sales/invoice-payments/{id}/` | Retrieve |
| `PUT` | `/api/sales/invoice-payments/{id}/` | Replace (all required fields) |
| `PATCH` | `/api/sales/invoice-payments/{id}/` | Partial update |
| `DELETE` | `/api/sales/invoice-payments/{id}/` | Delete |
| `POST` | `/api/sales/invoice-payments/{id}/refund/` | Refund a completed payment in full (once) |

**List query parameters**

| Query param | Meaning |
|---|---|
| `ordering` | Sort by `payment_date`, `amount` (prefix `-` for descending) |
| `invoice`, `payment_method`, `status` | Exact-match filters |

**Create body** (`POST`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `invoice` | id (SalesInvoice) | **yes** |  |
| `payment_date` | date (YYYY-MM-DD) | **yes** |  |
| `amount` | decimal (string) | **yes** |  |
| `payment_method` | enum | no | one of: `cash`, `credit_card`, `bank_transfer`, `check`, `other` |
| `reference` | string | no | max 100 chars |
| `notes` | string | no |  |

**Update body** (`PUT`/`PATCH`; with `PATCH` every field is optional)

| Field | Type | Required | Notes |
|---|---|---|---|
| `invoice` | id (SalesInvoice) | **yes** |  |
| `payment_date` | date (YYYY-MM-DD) | **yes** |  |
| `amount` | decimal (string) | **yes** |  |
| `payment_method` | enum | no | one of: `cash`, `credit_card`, `bank_transfer`, `check`, `other` |
| `reference` | string | no | max 100 chars |
| `notes` | string | no |  |
| `status` | enum | no | one of: `pending`, `completed`, `failed`, `refunded` |

**Response object** (retrieve; create/update return the same shape)

| Field | Type | Notes |
|---|---|---|
| `id` | integer |  |
| `invoice` | id (SalesInvoice) |  |
| `invoice_number` | string |  |
| `payment_date` | date (YYYY-MM-DD) |  |
| `amount` | decimal (string) |  |
| `payment_method` | enum | one of: `cash`, `credit_card`, `bank_transfer`, `check`, `other` |
| `reference` | string |  |
| `notes` | string |  |
| `created_by` | id (User) |  |
| `created_by_name` | computed |  |
| `status` | enum | one of: `pending`, `completed`, `failed`, `refunded` |
| `company` | id |  |
| `created_at` | datetime (ISO 8601) |  |
| `updated_at` | datetime (ISO 8601) |  |

**Examples** (real responses from the running API)

<details><summary>Example: list → <code>200</code></summary>

```http
GET /api/sales/invoice-payments/
```

Response:

```json
{
  "success": true,
  "data": [],
  "metadata": {
    "timestamp": "2026-10-03T21:50:24.701987Z",
    "version": "1.0",
    "total_count": 0
  }
}
```

</details>

<details><summary>Example: Record payment → <code>201</code></summary>

```http
POST /api/sales/invoice-payments/
```

Request body:

```json
{
  "invoice": 1,
  "payment_date": "2026-10-04",
  "amount": "500.00",
  "payment_method": "cash"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 2,
    "invoice": 1,
    "invoice_number": "INV-2026-00001",
    "payment_date": "2026-10-04",
    "amount": "500.0000",
    "payment_method": "cash",
    "reference": "",
    "notes": "",
    "created_by": 1,
    "created_by_name": "Sara Ali",
    "status": "completed",
    "company": 1,
    "created_at": "2026-10-04T00:57:40.397574+03:00",
    "updated_at": "2026-10-04T00:57:40.397639+03:00"
  },
  "metadata": {
    "timestamp": "2026-10-03T21:57:40.406824Z",
    "version": "1.0"
  }
}
```

</details>

#### `POST /api/sales/invoice-payments/{id}/refund/` — Refund a completed payment in full (once)

_No body._

Returns: the payment with `status: refunded`. The invoice balance reopens; a paid invoice goes back to `issued`.

<details><summary>Example: Refund payment → <code>200</code></summary>

```http
POST /api/sales/invoice-payments/2/refund/
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 2,
    "invoice": 1,
    "invoice_number": "INV-2026-00001",
    "payment_date": "2026-10-04",
    "amount": "500.0000",
    "payment_method": "cash",
    "reference": "",
    "notes": "Refunded by Sara Ali",
    "created_by": 1,
    "created_by_name": "Sara Ali",
    "status": "refunded",
    "company": 1,
    "created_at": "2026-10-04T00:57:40.397574+03:00",
    "updated_at": "2026-10-04T00:57:40.397639+03:00"
  },
  "metadata": {
    "timestamp": "2026-10-03T21:57:40.431498Z",
    "version": "1.0"
  }
}
```

</details>

---

## Returns

Customer returns (RMA) and returns to suppliers. ⚠️ Note the doubled prefix `/api/returns/api/returns/`.

### Customer returns (RMA)

`return_number` is generated (`RMA-YYYY-NNNNN`). Lines are sent in the same request. Status flow: `requested → approved → received → inspected → closed`, or `rejected` (with `reject`, before anything is received).

The workflow actions (`approve`, `receive`, `inspect`, `close`, and the supplier-return actions) answer with the return
**as it is after the step**, lines included (e.g. `quantity_received` after `receive`).

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/returns/api/returns/customer-returns/` | List |
| `POST` | `/api/returns/api/returns/customer-returns/` | Create |
| `GET` | `/api/returns/api/returns/customer-returns/{id}/` | Retrieve |
| `PUT` | `/api/returns/api/returns/customer-returns/{id}/` | Replace (all required fields) |
| `PATCH` | `/api/returns/api/returns/customer-returns/{id}/` | Partial update; sending `lines` replaces all lines (only while `requested`, `400` on `lines` otherwise) |
| `DELETE` | `/api/returns/api/returns/customer-returns/{id}/` | Delete |
| `POST` | `/api/returns/api/returns/customer-returns/{id}/approve/` | Approve (requested → approved) |
| `POST` | `/api/returns/api/returns/customer-returns/{id}/reject/` | Reject (requested/approved → rejected), body `{"reason": "…"}` optional |
| `POST` | `/api/returns/api/returns/customer-returns/{id}/receive/` | Receive items into stock (approved → received) |
| `POST` | `/api/returns/api/returns/customer-returns/{id}/inspect/` | Record inspection results (received → inspected) |
| `POST` | `/api/returns/api/returns/customer-returns/{id}/close/` | Close and record the refund |

**List query parameters**

| Query param | Meaning |
|---|---|
| `search` | Text search in: `return_number`, `customer__name`, `sales_order__order_number` |
| `ordering` | Sort by `requested_date`, `return_number`, `refund_amount` (prefix `-` for descending) |
| `status`, `customer`, `warehouse`, `return_reason` | Exact-match filters |

**Create body** (`POST`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `sales_order` | id (SalesOrder) | no | nullable |
| `customer` | id (Customer) | **yes** |  |
| `warehouse` | id (Warehouse) | **yes** |  |
| `return_reason` | enum | no | one of: `defective`, `wrong_item`, `not_as_described`, `changed_mind`, `damaged_in_transit`, `other` |
| `return_reason_note` | string | no |  |
| `refund_method` | enum | no | one of: `credit_note`, `replacement`, `refund`, `exchange`; nullable |
| `notes` | string | no |  |
| `lines` | array of objects | **yes** |  |
| &nbsp;&nbsp;↳ `sales_order_line` | id (SalesOrderLine) | no | nullable |
| &nbsp;&nbsp;↳ `product` | id (Product) | **yes** |  |
| &nbsp;&nbsp;↳ `quantity_requested` | decimal (string) | **yes** | with a `sales_order_line`: at most its shipped quantity less what other (not rejected) returns already requested — `400` `"Only 2.000 of order line 1 can still be returned (2.000 shipped, 0.000 already requested)."` under `lines[i].quantity_requested` |
| &nbsp;&nbsp;↳ `batch` | id (Batch) | no | nullable |
| &nbsp;&nbsp;↳ `serials` | array of ids (SerialNumber) | no |  |
| &nbsp;&nbsp;↳ `notes` | string | no |  |
| &nbsp;&nbsp;↳ `disposition` | enum | no | one of: `accept`, `quarantine`, `reject`, `return_to_supplier`, `warranty_repair`; nullable |
| &nbsp;&nbsp;↳ `defect_description` | string | no |  |

_Update (`PUT`/`PATCH`) accepts the same fields; with `PATCH` every field is optional._

**Response object** (retrieve)

| Field | Type | Notes |
|---|---|---|
| `id` | integer |  |
| `return_number` | string |  |
| `sales_order` | id (SalesOrder) |  |
| `sales_order_number` | string |  |
| `customer` | id (Customer) |  |
| `customer_name` | string |  |
| `customer_number` | string |  |
| `warehouse` | id (Warehouse) |  |
| `warehouse_name` | string |  |
| `status` | enum | one of: `requested`, `approved`, `in_transit`, `received`, `inspected`, `closed`, `rejected` |
| `return_reason` | enum | one of: `defective`, `wrong_item`, `not_as_described`, `changed_mind`, `damaged_in_transit`, `other` |
| `return_reason_note` | string |  |
| `requested_date` | datetime (ISO 8601) |  |
| `approved_date` | datetime (ISO 8601) |  |
| `received_date` | datetime (ISO 8601) |  |
| `inspected_date` | datetime (ISO 8601) |  |
| `closed_date` | datetime (ISO 8601) |  |
| `rejected_date` | datetime (ISO 8601) | nullable; set by `reject` |
| `rejection_reason` | string | set by `reject` |
| `notes` | string |  |
| `refund_method` | enum | one of: `credit_note`, `replacement`, `refund`, `exchange` |
| `refund_amount` | decimal (string) |  |
| `credit_note_number` | string |  |
| `replacement_order` | id (SalesOrder) |  |
| `inspection_notes` | string |  |
| `inspection_result` | string |  |
| `approved_by` | id |  |
| `inspected_by` | id |  |
| `closed_by` | id |  |
| `lines` | array of objects | fields: id, customer_return, sales_order_line, sales_order_line_info, product, product_name, quantity_requested, quantity_received, quantity_accepted, quantity_quarantined, condition, rejection_reason … |
| `total_lines` | computed |  |
| `total_requested` | computed |  |
| `inspection_date` | datetime (ISO 8601) |  |
| `total_items_received` | decimal (string) |  |
| `total_items_accepted` | decimal (string) |  |
| `total_items_quarantined` | decimal (string) |  |
| `total_items_rejected` | decimal (string) |  |
| `total_items_returned_to_supplier` | decimal (string) |  |
| `total_return_value` | decimal (string) |  |
| `primary_disposition` | enum | one of: `accept`, `quarantine`, `reject`, `return_to_supplier`, `warranty_repair`, `replacement` |
| `return_status_summary` | object/JSON |  |
| `audit_trail` | object/JSON |  |
| `company` | id |  |
| `created_at` | datetime (ISO 8601) |  |
| `updated_at` | datetime (ISO 8601) |  |

> **Create returns a different shape** with fields: `id`, `return_number`, `status`, `sales_order`, `customer`, `warehouse`, `return_reason`, `return_reason_note`, `refund_method`, `notes`, `lines`. Re-fetch the detail if you need the full object.

**List item shape** (shorter than retrieve)

| Field | Type | Notes |
|---|---|---|
| `id` | integer |  |
| `return_number` | string |  |
| `customer` | id (Customer) |  |
| `customer_name` | string |  |
| `warehouse` | id (Warehouse) |  |
| `warehouse_name` | string |  |
| `status` | enum | one of: `requested`, `approved`, `in_transit`, `received`, `inspected`, `closed`, `rejected` |
| `return_reason` | enum | one of: `defective`, `wrong_item`, `not_as_described`, `changed_mind`, `damaged_in_transit`, `other` |
| `requested_date` | datetime (ISO 8601) |  |
| `refund_amount` | decimal (string) |  |
| `total_lines` | computed |  |
| `company` | id (Company) |  |
| `created_at` | datetime (ISO 8601) |  |

**Examples** (real responses from the running API)

<details><summary>Example: list → <code>200</code></summary>

```http
GET /api/returns/api/returns/customer-returns/
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": 2,
      "return_number": "RMA-2026-00001",
      "customer": 17,
      "customer_name": "Erickson and Sons",
      "warehouse": 82,
      "warehouse_name": "Warehouse 81",
      "status": "requested",
      "return_reason": "defective",
      "requested_date": "2026-10-04T00:50:16.048509+03:00",
      "refund_amount": "0.0000",
      "total_lines": 1,
      "company": 1,
      "created_at": "2026-10-04T00:50:16.048463+03:00"
    }
  ],
  "metadata": {
    "timestamp": "2026-10-03T21:50:24.734219Z",
    "version": "1.0",
    "total_count": 2
  }
}
```

</details>

<details><summary>Example: Create customer return → <code>201</code></summary>

```http
POST /api/returns/api/returns/customer-returns/
```

Request body:

```json
{
  "customer": 1,
  "warehouse": 1,
  "sales_order": 1,
  "return_reason": "defective",
  "refund_method": "credit_note",
  "lines": [
    {
      "product": 1,
      "sales_order_line": 1,
      "quantity_requested": "2"
    }
  ]
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "return_number": "RMA-2026-00001",
    "status": "requested",
    "sales_order": 1,
    "customer": 1,
    "warehouse": 1,
    "return_reason": "defective",
    "return_reason_note": "",
    "refund_method": "credit_note",
    "notes": "",
    "lines": [
      {
        "id": 1,
        "sales_order_line": 1,
        "product": 1,
        "quantity_requested": "2.000",
        "batch": null,
        "serials": [],
        "notes": "",
        "disposition": null,
        "defect_description": ""
      }
    ]
  },
  "metadata": {
    "timestamp": "2026-10-03T21:57:40.519207Z",
    "version": "1.0"
  }
}
```

</details>

#### `POST /api/returns/api/returns/customer-returns/{id}/approve/` — Approve (requested → approved)

_No body._

Returns: the return.

<details><summary>Example: Approve return → <code>200</code></summary>

```http
POST /api/returns/api/returns/customer-returns/1/approve/
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "return_number": "RMA-2026-00001",
    "sales_order": 1,
    "sales_order_number": "SO-2026-00001",
    "customer": 1,
    "customer_name": "Nile Retail",
    "customer_number": "CUST-00001",
    "warehouse": 1,
    "warehouse_name": "Main Warehouse",
    "status": "approved",
    "return_reason": "defective",
    "return_reason_note": "",
    "requested_date": "2026-10-04T00:57:40.514194+03:00",
    "approved_date": "2026-10-04T00:57:40.538424+03:00",
    "received_date": null,
    "inspected_date": null,
    "closed_date": null,
    "refund_method": "credit_note",
    "refund_amount": "0.0000",
    "credit_note_number": null,
    "replacement_order": null,
    "inspection_notes": "",
    "inspection_result": "",
    "approved_by": 1,
    "inspected_by": null,
    "closed_by": null,
    "lines": [
      {
        "id": 1,
        "customer_return": 1,
        "sales_order_line": 1,
        "sales_order_line_info": {
          "line_number": 1,
          "quantity_ordered": 10.0,
          "unit_price": 250.0
  … (truncated)
```

</details>

#### `POST /api/returns/api/returns/customer-returns/{id}/receive/` — Receive items into stock (approved → received)

| Field | Type | Required | Notes |
|---|---|---|---|
| lines | array | **yes** |  |
| ↳ line_id | id | **yes** | a line of this return |
| ↳ quantity_received | decimal | **yes** |  |
| ↳ serial_ids | array of ids | no | must belong to the company |

Returns: the return.

<details><summary>Example: Receive return → <code>200</code></summary>

```http
POST /api/returns/api/returns/customer-returns/1/receive/
```

Request body:

```json
{
  "lines": [
    {
      "line_id": 1,
      "quantity_received": "2"
    }
  ]
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "return_number": "RMA-2026-00001",
    "sales_order": 1,
    "sales_order_number": "SO-2026-00001",
    "customer": 1,
    "customer_name": "Nile Retail",
    "customer_number": "CUST-00001",
    "warehouse": 1,
    "warehouse_name": "Main Warehouse",
    "status": "received",
    "return_reason": "defective",
    "return_reason_note": "",
    "requested_date": "2026-10-04T00:57:40.514194+03:00",
    "approved_date": "2026-10-04T00:57:40.538424+03:00",
    "received_date": "2026-10-04T00:57:40.571473+03:00",
    "inspected_date": null,
    "closed_date": null,
    "refund_method": "credit_note",
    "refund_amount": "0.0000",
    "credit_note_number": null,
    "replacement_order": null,
    "inspection_notes": "",
    "inspection_result": "",
    "approved_by": 1,
    "inspected_by": null,
    "closed_by": null,
    "lines": [
      {
        "id": 1,
        "customer_return": 1,
        "sales_order_line": 1,
        "sales_order_line_info": {
          "line_number": 1,
          "quantity_ordered": 10.0,
          "unit_price": 250.0
  … (truncated)
```

</details>

#### `POST /api/returns/api/returns/customer-returns/{id}/inspect/` — Record inspection results (received → inspected)

| Field | Type | Required | Notes |
|---|---|---|---|
| lines | array | **yes** |  |
| ↳ line_id | id | **yes** |  |
| ↳ quantity_accepted | decimal | **yes** |  |
| ↳ condition | enum | **yes** | `new`, `good`, `fair`, `damaged`, `unsaleable` |
| ↳ restocking_decision | enum | **yes** | `restock`, `quarantine`, `write_off`, `return_to_supplier` |
| ↳ disposition | enum | no | `accept`, `quarantine`, `reject`, `return_to_supplier`, `warranty_repair`, `replacement` |
| ↳ rejection_reason | string | no |  |
| ↳ defect_description | string | no |  |

Returns: the return.

<details><summary>Example: Inspect return → <code>200</code></summary>

```http
POST /api/returns/api/returns/customer-returns/1/inspect/
```

Request body:

```json
{
  "lines": [
    {
      "line_id": 1,
      "quantity_accepted": "2",
      "condition": "good",
      "restocking_decision": "restock",
      "disposition": "accept"
    }
  ]
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "return_number": "RMA-2026-00001",
    "sales_order": 1,
    "sales_order_number": "SO-2026-00001",
    "customer": 1,
    "customer_name": "Nile Retail",
    "customer_number": "CUST-00001",
    "warehouse": 1,
    "warehouse_name": "Main Warehouse",
    "status": "inspected",
    "return_reason": "defective",
    "return_reason_note": "",
    "requested_date": "2026-10-04T00:57:40.514194+03:00",
    "approved_date": "2026-10-04T00:57:40.538424+03:00",
    "received_date": "2026-10-04T00:57:40.571473+03:00",
    "inspected_date": "2026-10-04T00:57:40.604202+03:00",
    "closed_date": null,
    "refund_method": "credit_note",
    "refund_amount": "0.0000",
    "credit_note_number": null,
    "replacement_order": null,
    "inspection_notes": "",
    "inspection_result": "",
    "approved_by": 1,
    "inspected_by": 1,
    "closed_by": null,
    "lines": [
      {
        "id": 1,
        "customer_return": 1,
        "sales_order_line": 1,
        "sales_order_line_info": {
          "line_number": 1,
          "quantity_ordered": 10.0,
          "unit_price": 250.0
  … (truncated)
```

</details>

#### `POST /api/returns/api/returns/customer-returns/{id}/close/` — Close and record the refund

| Field | Type | Required | Notes |
|---|---|---|---|
| refund_amount | decimal | **yes** |  |

Returns: the return.

<details><summary>Example: Close return → <code>200</code></summary>

```http
POST /api/returns/api/returns/customer-returns/1/close/
```

Request body:

```json
{
  "refund_amount": "475.00"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "return_number": "RMA-2026-00001",
    "sales_order": 1,
    "sales_order_number": "SO-2026-00001",
    "customer": 1,
    "customer_name": "Nile Retail",
    "customer_number": "CUST-00001",
    "warehouse": 1,
    "warehouse_name": "Main Warehouse",
    "status": "closed",
    "return_reason": "defective",
    "return_reason_note": "",
    "requested_date": "2026-10-04T00:57:40.514194+03:00",
    "approved_date": "2026-10-04T00:57:40.538424+03:00",
    "received_date": "2026-10-04T00:57:40.571473+03:00",
    "inspected_date": "2026-10-04T00:57:40.604202+03:00",
    "closed_date": "2026-10-04T00:57:40.644666+03:00",
    "refund_method": "credit_note",
    "refund_amount": "475.0000",
    "credit_note_number": "INV-2026-00002",
    "replacement_order": null,
    "inspection_notes": "",
    "inspection_result": "",
    "approved_by": 1,
    "inspected_by": 1,
    "closed_by": 1,
    "lines": [
      {
        "id": 1,
        "customer_return": 1,
        "sales_order_line": 1,
        "sales_order_line_info": {
          "line_number": 1,
          "quantity_ordered": 10.0,
          "unit_price": 250.0
  … (truncated)
```

</details>

### Customer return lines

`quantity_requested` is capped like on the return (shipped quantity of the `sales_order_line` less what other returns
already requested; `400` on `quantity_requested`).

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/returns/api/returns/customer-return-lines/` | List |
| `POST` | `/api/returns/api/returns/customer-return-lines/` | Create |
| `GET` | `/api/returns/api/returns/customer-return-lines/{id}/` | Retrieve |
| `PUT` | `/api/returns/api/returns/customer-return-lines/{id}/` | Replace (all required fields) |
| `PATCH` | `/api/returns/api/returns/customer-return-lines/{id}/` | Partial update |
| `DELETE` | `/api/returns/api/returns/customer-return-lines/{id}/` | Delete |

**List query parameters**

| Query param | Meaning |
|---|---|
| `ordering` | Sort by `id` (prefix `-` for descending) |
| `customer_return`, `product` | Exact-match filters |

**Create body** (`POST`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `customer_return` | id (CustomerReturn) | **yes** |  |
| `sales_order_line` | id (SalesOrderLine) | no | nullable |
| `product` | id (Product) | **yes** |  |
| `quantity_requested` | decimal (string) | **yes** |  |
| `quantity_received` | decimal (string) | no |  |
| `quantity_accepted` | decimal (string) | no |  |
| `quantity_quarantined` | decimal (string) | no |  |
| `condition` | enum | no | one of: `new`, `good`, `fair`, `damaged`, `unsaleable` |
| `rejection_reason` | string | no |  |
| `restocking_decision` | enum | no | one of: `restock`, `quarantine`, `write_off`, `return_to_supplier` |
| `inspection_notes` | string | no |  |
| `inspection_result` | string | no |  |
| `disposition` | enum | no | one of: `accept`, `quarantine`, `reject`, `return_to_supplier`, `warranty_repair`; nullable |
| `defect_description` | string | no |  |
| `inspected_by` | id (User) | no | nullable |
| `inspected_date` | datetime (ISO 8601) | no | nullable |
| `unit_price` | decimal (string) | no | nullable |
| `line_value` | decimal (string) | no | nullable |
| `batch` | id (Batch) | no | nullable |
| `serials` | array of ids (SerialNumber) | no |  |
| `notes` | string | no |  |

_Update (`PUT`/`PATCH`) accepts the same fields; with `PATCH` every field is optional._

**Response object** (retrieve; create/update return the same shape)

| Field | Type | Notes |
|---|---|---|
| `id` | integer |  |
| `customer_return` | id (CustomerReturn) |  |
| `sales_order_line` | id (SalesOrderLine) |  |
| `sales_order_line_info` | computed |  |
| `product` | id (Product) |  |
| `product_name` | string |  |
| `quantity_requested` | decimal (string) |  |
| `quantity_received` | decimal (string) |  |
| `quantity_accepted` | decimal (string) |  |
| `quantity_quarantined` | decimal (string) |  |
| `condition` | enum | one of: `new`, `good`, `fair`, `damaged`, `unsaleable` |
| `rejection_reason` | string |  |
| `restocking_decision` | enum | one of: `restock`, `quarantine`, `write_off`, `return_to_supplier` |
| `inspection_notes` | string |  |
| `inspection_result` | string |  |
| `disposition` | enum | one of: `accept`, `quarantine`, `reject`, `return_to_supplier`, `warranty_repair` |
| `defect_description` | string |  |
| `inspected_by` | id (User) |  |
| `inspected_date` | datetime (ISO 8601) |  |
| `unit_price` | decimal (string) |  |
| `line_value` | decimal (string) | set by `inspect`: accepted quantity × order-line unit price, after the line's discount and with its tax (what the customer paid; the default refund and the credit note use it) |
| `batch` | id (Batch) |  |
| `serials` | array of ids (SerialNumber) |  |
| `notes` | string |  |
| `company` | id |  |
| `created_at` | datetime (ISO 8601) |  |
| `updated_at` | datetime (ISO 8601) |  |

**Examples** (real responses from the running API)

<details><summary>Example: list → <code>200</code></summary>

```http
GET /api/returns/api/returns/customer-return-lines/
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "customer_return": 1,
      "sales_order_line": 5,
      "sales_order_line_info": {
        "line_number": 4,
        "quantity_ordered": 31.777,
        "unit_price": 393.1018
      },
      "product": 55,
      "product_name": "Product 54",
      "quantity_requested": "31.777",
      "quantity_received": "0.000",
      "quantity_accepted": "0.000",
      "quantity_quarantined": "0.000",
      "condition": "",
      "rejection_reason": "",
      "restocking_decision": "",
      "inspection_notes": "",
      "inspection_result": "",
      "disposition": null,
      "defect_description": "",
      "inspected_by": null,
      "inspected_date": null,
      "unit_price": null,
      "line_value": null,
      "batch": null,
      "serials": [],
      "notes": "",
      "company": 1,
      "created_at": "2026-10-04T00:50:14.711185+03:00",
      "updated_at": "2026-10-04T00:50:14.711203+03:00"
    }
  ],
  "metadata": {
  … (truncated)
```

</details>

<details><summary>Example: Add return line → <code>500</code></summary>

```http
POST /api/returns/api/returns/customer-return-lines/
```

Request body:

```json
{
  "customer_return": 1,
  "product": 1,
  "quantity_requested": "1"
}
```

Response:

```json
{
  "_non_json": "text/html; charset=utf-8",
  "_preview": "\n<!doctype html>\n<html lang=\"en\">\n<head>\n  <title>Server Error (500)</title>\n</head>\n<body>\n  <h1>Server Error (500)</h1><p></p>\n</body>\n</html>\n"
}
```

</details>

### Supplier returns

Send goods back to a supplier. Status flow: `draft → approved → shipped → confirmed → closed`.

`refund_amount` is set when the return is approved (the value of its lines, unless one was entered) and can be
corrected with the amount the supplier actually refunded when the return is closed.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/returns/api/returns/supplier-returns/` | List |
| `POST` | `/api/returns/api/returns/supplier-returns/` | Create |
| `GET` | `/api/returns/api/returns/supplier-returns/{id}/` | Retrieve |
| `PUT` | `/api/returns/api/returns/supplier-returns/{id}/` | Replace (all required fields) |
| `PATCH` | `/api/returns/api/returns/supplier-returns/{id}/` | Partial update |
| `DELETE` | `/api/returns/api/returns/supplier-returns/{id}/` | Delete |
| `POST` | `/api/returns/api/returns/supplier-returns/{id}/approve/` | Approve |
| `POST` | `/api/returns/api/returns/supplier-returns/{id}/ship/` | Mark shipped |
| `POST` | `/api/returns/api/returns/supplier-returns/{id}/confirm_receipt/` | Supplier confirmed receipt |
| `POST` | `/api/returns/api/returns/supplier-returns/{id}/close/` | Close (confirmed → closed), body `{"refund_amount": "20.00"}` optional |

**List query parameters**

| Query param | Meaning |
|---|---|
| `search` | Text search in: `return_number`, `supplier__name` |
| `ordering` | Sort by `shipped_date`, `return_number` (prefix `-` for descending) |
| `status`, `supplier`, `warehouse` | Exact-match filters |

**Create body** (`POST`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `purchase_order` | id (PurchaseOrder) | no | nullable |
| `supplier` | id (Supplier) | **yes** |  |
| `warehouse` | id (Warehouse) | **yes** |  |
| `return_reason` | string | no |  |
| `customer_return` | id (CustomerReturn) | no | nullable |
| `lines` | array of objects | **yes** |  |
| &nbsp;&nbsp;↳ `product` | id (Product) | **yes** |  |
| &nbsp;&nbsp;↳ `quantity` | decimal (string) | **yes** |  |
| &nbsp;&nbsp;↳ `batch` | id (Batch) | no | nullable |
| &nbsp;&nbsp;↳ `serials` | array of ids (SerialNumber) | no |  |
| &nbsp;&nbsp;↳ `unit_cost` | decimal (string) | no |  |
| &nbsp;&nbsp;↳ `notes` | string | no |  |

_Update (`PUT`/`PATCH`) accepts the same fields; with `PATCH` every field is optional._

**Response object** (retrieve)

| Field | Type | Notes |
|---|---|---|
| `id` | integer |  |
| `return_number` | string |  |
| `purchase_order` | id (PurchaseOrder) |  |
| `purchase_order_number` | string — omitted when empty |  |
| `supplier` | id (Supplier) |  |
| `supplier_name` | string |  |
| `warehouse` | id (Warehouse) |  |
| `warehouse_name` | string |  |
| `status` | enum | one of: `draft`, `approved`, `shipped`, `confirmed`, `closed` |
| `return_reason` | string |  |
| `refund_amount` | decimal (string) |  |
| `shipped_date` | date (YYYY-MM-DD) |  |
| `confirmed_date` | date (YYYY-MM-DD) |  |
| `customer_return` | id (CustomerReturn) |  |
| `customer_return_number` | string — omitted when empty |  |
| `approved_by` | id |  |
| `lines` | array of objects | fields: id, supplier_return, product, product_name, quantity, batch, serials, unit_cost, line_total, notes, company, created_at … |
| `total_lines` | computed |  |
| `company` | id |  |
| `created_at` | datetime (ISO 8601) |  |
| `updated_at` | datetime (ISO 8601) |  |

> **Create returns a different shape** with fields: `id`, `return_number`, `status`, `purchase_order`, `supplier`, `warehouse`, `return_reason`, `customer_return`. Re-fetch the detail if you need the full object.

**List item shape** (shorter than retrieve)

| Field | Type | Notes |
|---|---|---|
| `id` | integer |  |
| `return_number` | string |  |
| `supplier` | id (Supplier) |  |
| `supplier_name` | string |  |
| `warehouse` | id (Warehouse) |  |
| `warehouse_name` | string |  |
| `status` | enum | one of: `draft`, `approved`, `shipped`, `confirmed`, `closed` |
| `shipped_date` | date (YYYY-MM-DD) |  |
| `refund_amount` | decimal (string) |  |
| `company` | id (Company) |  |
| `created_at` | datetime (ISO 8601) |  |

**Examples** (real responses from the running API)

<details><summary>Example: list → <code>200</code></summary>

```http
GET /api/returns/api/returns/supplier-returns/
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "return_number": "SRN-2026-00000",
      "supplier": 19,
      "supplier_name": "Supplier 18",
      "warehouse": 95,
      "warehouse_name": "Warehouse 94",
      "status": "draft",
      "shipped_date": null,
      "refund_amount": "0.0000",
      "company": 1,
      "created_at": "2026-10-04T00:50:20.217659+03:00"
    }
  ],
  "metadata": {
    "timestamp": "2026-10-03T21:50:24.965232Z",
    "version": "1.0",
    "total_count": 2
  }
}
```

</details>

<details><summary>Example: Create supplier return → <code>201</code></summary>

```http
POST /api/returns/api/returns/supplier-returns/
```

Request body:

```json
{
  "supplier": 1,
  "warehouse": 1,
  "purchase_order": 1,
  "return_reason": "Wrong items",
  "lines": [
    {
      "product": 1,
      "quantity": "3",
      "unit_cost": "120.00"
    }
  ]
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "return_number": "SRN-2026-00001",
    "status": "draft",
    "purchase_order": 1,
    "supplier": 1,
    "warehouse": 1,
    "return_reason": "Wrong items",
    "customer_return": null
  },
  "metadata": {
    "timestamp": "2026-10-03T21:57:40.696260Z",
    "version": "1.0"
  }
}
```

</details>

#### `POST /api/returns/api/returns/supplier-returns/{id}/approve/` — Approve

_No body._

Returns: the supplier return.

<details><summary>Example: Approve supplier return → <code>200</code></summary>

```http
POST /api/returns/api/returns/supplier-returns/1/approve/
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "return_number": "SRN-2026-00001",
    "purchase_order": 1,
    "supplier": 1,
    "supplier_name": "Global Parts Ltd",
    "warehouse": 1,
    "warehouse_name": "Main Warehouse",
    "status": "approved",
    "return_reason": "Wrong items",
    "refund_amount": "0.0000",
    "shipped_date": null,
    "confirmed_date": null,
    "customer_return": null,
    "approved_by": 1,
    "lines": [
      {
        "id": 1,
        "supplier_return": 1,
        "product": 1,
        "product_name": "Smartphone X",
        "quantity": "3.000",
        "batch": null,
        "serials": [],
        "unit_cost": "120.0000",
        "line_total": "360.0000000",
        "notes": "",
        "company": 1,
        "created_at": "2026-10-04T00:57:40.694551+03:00",
        "updated_at": "2026-10-04T00:57:40.694648+03:00"
      }
    ],
    "total_lines": 1,
    "company": 1,
    "created_at": "2026-10-04T00:57:40.692983+03:00",
    "updated_at": "2026-10-04T00:57:40.720470+03:00"
  … (truncated)
```

</details>

#### `POST /api/returns/api/returns/supplier-returns/{id}/ship/` — Mark shipped

_No body._

Returns: the supplier return.

<details><summary>Example: Ship supplier return → <code>200</code></summary>

```http
POST /api/returns/api/returns/supplier-returns/1/ship/
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "return_number": "SRN-2026-00001",
    "purchase_order": 1,
    "supplier": 1,
    "supplier_name": "Global Parts Ltd",
    "warehouse": 1,
    "warehouse_name": "Main Warehouse",
    "status": "shipped",
    "return_reason": "Wrong items",
    "refund_amount": "0.0000",
    "shipped_date": "2026-10-03",
    "confirmed_date": null,
    "customer_return": null,
    "approved_by": 1,
    "lines": [
      {
        "id": 1,
        "supplier_return": 1,
        "product": 1,
        "product_name": "Smartphone X",
        "quantity": "3.000",
        "batch": null,
        "serials": [],
        "unit_cost": "120.0000",
        "line_total": "360.0000000",
        "notes": "",
        "company": 1,
        "created_at": "2026-10-04T00:57:40.694551+03:00",
        "updated_at": "2026-10-04T00:57:40.694648+03:00"
      }
    ],
    "total_lines": 1,
    "company": 1,
    "created_at": "2026-10-04T00:57:40.692983+03:00",
    "updated_at": "2026-10-04T00:57:40.720470+03:00"
  … (truncated)
```

</details>

#### `POST /api/returns/api/returns/supplier-returns/{id}/confirm_receipt/` — Supplier confirmed receipt

_No body._

Returns: the supplier return.

<details><summary>Example: Confirm supplier receipt → <code>200</code></summary>

```http
POST /api/returns/api/returns/supplier-returns/1/confirm_receipt/
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "return_number": "SRN-2026-00001",
    "purchase_order": 1,
    "supplier": 1,
    "supplier_name": "Global Parts Ltd",
    "warehouse": 1,
    "warehouse_name": "Main Warehouse",
    "status": "confirmed",
    "return_reason": "Wrong items",
    "refund_amount": "0.0000",
    "shipped_date": "2026-10-03",
    "confirmed_date": "2026-10-03",
    "customer_return": null,
    "approved_by": 1,
    "lines": [
      {
        "id": 1,
        "supplier_return": 1,
        "product": 1,
        "product_name": "Smartphone X",
        "quantity": "3.000",
        "batch": null,
        "serials": [],
        "unit_cost": "120.0000",
        "line_total": "360.0000000",
        "notes": "",
        "company": 1,
        "created_at": "2026-10-04T00:57:40.694551+03:00",
        "updated_at": "2026-10-04T00:57:40.694648+03:00"
      }
    ],
    "total_lines": 1,
    "company": 1,
    "created_at": "2026-10-04T00:57:40.692983+03:00",
    "updated_at": "2026-10-04T00:57:40.720470+03:00"
  … (truncated)
```

</details>

#### `POST /api/returns/api/returns/supplier-returns/{id}/close/` — Close and record the refund

| Field | Type | Required | Notes |
|---|---|---|---|
| refund_amount | decimal | no | what the supplier refunded; ≥ 0. Default: the amount set at approval (the lines' value) |

Only `confirmed` returns can be closed (`400` `"Cannot close return in shipped status"`). Returns: the supplier return.

### Supplier return lines

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/returns/api/returns/supplier-return-lines/` | List |
| `POST` | `/api/returns/api/returns/supplier-return-lines/` | Create |
| `GET` | `/api/returns/api/returns/supplier-return-lines/{id}/` | Retrieve |
| `PUT` | `/api/returns/api/returns/supplier-return-lines/{id}/` | Replace (all required fields) |
| `PATCH` | `/api/returns/api/returns/supplier-return-lines/{id}/` | Partial update |
| `DELETE` | `/api/returns/api/returns/supplier-return-lines/{id}/` | Delete |

**List query parameters**

| Query param | Meaning |
|---|---|
| `supplier_return`, `product` | Exact-match filters |

**Create body** (`POST`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `product` | id (Product) | **yes** |  |
| `quantity` | decimal (string) | **yes** |  |
| `batch` | id (Batch) | no | nullable |
| `serials` | array of ids (SerialNumber) | no |  |
| `unit_cost` | decimal (string) | no |  |
| `notes` | string | no |  |

_Update (`PUT`/`PATCH`) accepts the same fields; with `PATCH` every field is optional._

**Response object** (retrieve; create/update return the same shape)

| Field | Type | Notes |
|---|---|---|
| `id` | integer |  |
| `supplier_return` | id |  |
| `product` | id (Product) |  |
| `product_name` | string |  |
| `quantity` | decimal (string) |  |
| `batch` | id (Batch) |  |
| `serials` | array of ids (SerialNumber) |  |
| `unit_cost` | decimal (string) |  |
| `line_total` | decimal (string) |  |
| `notes` | string |  |
| `company` | id |  |
| `created_at` | datetime (ISO 8601) |  |
| `updated_at` | datetime (ISO 8601) |  |

**Examples** (real responses from the running API)

<details><summary>Example: list → <code>200</code></summary>

```http
GET /api/returns/api/returns/supplier-return-lines/
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "supplier_return": 3,
      "product": 75,
      "product_name": "Product 74",
      "quantity": "16.128",
      "batch": null,
      "serials": [],
      "unit_cost": "20.4311",
      "line_total": "329.5127808",
      "notes": "",
      "company": 1,
      "created_at": "2026-10-04T00:50:20.226302+03:00",
      "updated_at": "2026-10-04T00:50:20.226319+03:00"
    }
  ],
  "metadata": {
    "timestamp": "2026-10-03T21:50:25.031436Z",
    "version": "1.0",
    "total_count": 2
  }
}
```

</details>

<details><summary>Example: Add supplier return line → <code>500</code></summary>

```http
POST /api/returns/api/returns/supplier-return-lines/
```

Request body:

```json
{
  "supplier_return": 1,
  "product": 1,
  "quantity": "1"
}
```

Response:

```json
{
  "_non_json": "text/html; charset=utf-8",
  "_preview": "\n<!doctype html>\n<html lang=\"en\">\n<head>\n  <title>Server Error (500)</title>\n</head>\n<body>\n  <h1>Server Error (500)</h1><p></p>\n</body>\n</html>\n"
}
```

</details>

---

## Accounting

General ledger: chart of accounts, journal entries (most of them posted automatically from sales invoices, payments,
supplier invoices and stock movements), fiscal periods, supplier payments, debit notes and financial reports. The
business rules are in `docs/BUSINESS_LOGIC.md` §9; this section is the HTTP contract.

**Access:** subscription module `accounting` (`403` otherwise). Every row belongs to the user's company; related ids in
request bodies (accounts, customers, suppliers, invoices…) must belong to it too (`400` otherwise).

**Lists** return the full list by default; send `page` and/or `page_size` for pages (envelope `metadata.total_count`,
`next`, `previous`). Filters below are exact-match query params.

**Errors** from business rules (unbalanced entry, closed period, wrong status…) answer `400` with the reason in
`error.message`, e.g. `"Posted entries cannot be changed; reverse them instead"`. Field errors come back keyed by field
name in `error.errors`.

**Amounts** in objects are decimal strings with 2 decimals (`"100.00"`). In **reports** they are JSON numbers.

### Accounts (chart of accounts)

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/accounting/v1/accounts/` | List, ordered by `code` (creates the default chart on the first call) |
| `POST` | `/api/accounting/v1/accounts/` | Create |
| `GET` | `/api/accounting/v1/accounts/{id}/` | Retrieve |
| `PUT` | `/api/accounting/v1/accounts/{id}/` | Replace |
| `PATCH` | `/api/accounting/v1/accounts/{id}/` | Partial update |
| `DELETE` | `/api/accounting/v1/accounts/{id}/` | Delete (`400` for system accounts, accounts with entries or with children: deactivate them instead) |
| `POST` | `/api/accounting/v1/accounts/setup/` | Add any default account the company is missing |

**List query parameters**

| Query param | Meaning |
|---|---|
| `account_type` | one of `asset`, `liability`, `equity`, `revenue`, `cost_of_sales`, `expense` |
| `is_active` | `true` / `false` |
| `search` | code starting with, or name containing, the term |

**Body** (`POST`; `PUT`/`PATCH` accept the same fields)

| Field | Type | Required | Notes |
|---|---|---|---|
| `code` | string | **yes** | max 20 chars, unique within the company (`400` on `code`) |
| `name` | string | **yes** | max 200 chars |
| `account_type` | enum | **yes** | see above. System accounts and accounts with entries keep their type |
| `parent` | id (Account) | no | nullable; must be a group account of the same type, not the account itself |
| `is_group` | boolean | no | group accounts organise the chart and take no entries |
| `is_active` | boolean | no | default `true` |
| `description` | string | no |  |

**Response object**

| Field | Type | Notes |
|---|---|---|
| `id` | integer |  |
| `code` | string |  |
| `name` | string |  |
| `account_type` | enum |  |
| `parent` | id (Account) | nullable |
| `is_group` | boolean |  |
| `system_key` | string | read-only; set on the accounts automatic entries use (`cash`, `bank`, `accounts_receivable`, `inventory`, `accounts_payable`, `grni`, `vat_input`, `vat_output`, `sales`, `cogs`, `retained_earnings`…), `""` otherwise |
| `is_active` | boolean |  |
| `description` | string |  |
| `created_at`, `updated_at` | datetime (ISO 8601) |  |

`POST accounts/setup/` takes no body and answers `{"created": [<account>, …]}` — `201` when accounts were added,
`200` with an empty list when the chart was complete.

### Journal entries

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/accounting/v1/journal-entries/` | List, newest first (`-date`, `-number`) |
| `POST` | `/api/accounting/v1/journal-entries/` | Create a manual entry (draft, or posted with `post: true`) |
| `GET` | `/api/accounting/v1/journal-entries/{id}/` | Retrieve |
| `PUT` | `/api/accounting/v1/journal-entries/{id}/` | Replace a draft |
| `PATCH` | `/api/accounting/v1/journal-entries/{id}/` | Update a draft (`400` once posted) |
| `DELETE` | `/api/accounting/v1/journal-entries/{id}/` | Delete a draft (`400` once posted) |
| `POST` | `/api/accounting/v1/journal-entries/{id}/post/` | Post a draft (final from then on) |
| `POST` | `/api/accounting/v1/journal-entries/{id}/reverse/` | Reverse a posted entry (once) → `201` with the reversing entry |

**List query parameters**

| Query param | Meaning |
|---|---|
| `status` | `draft` / `posted` |
| `source_type`, `source_id`, `event` | the document an automatic entry comes from (e.g. `source_type=salesinvoice&source_id=12`) |
| `account` | entries with at least one line on this account id |
| `start_date`, `end_date` | `YYYY-MM-DD`, inclusive, on `date` |
| `automatic` | `true` = only automatic entries, `false` = only manual ones |

**Body** (`POST`; `PUT`/`PATCH` on drafts)

| Field | Type | Required | Notes |
|---|---|---|---|
| `date` | date (YYYY-MM-DD) | **yes** | must not fall in a closed period |
| `description` | string | no | max 255 chars |
| `reference` | string | no | max 100 chars |
| `lines` | array of objects | **yes** | at least 2 lines; total debit must equal total credit. On `PATCH`, sending `lines` replaces them all |
| `lines[].account` | id (Account) | **yes** | an active, non-group account |
| `lines[].debit` | decimal (string) | no | default `0`; each line is either a debit or a credit |
| `lines[].credit` | decimal (string) | no | default `0` |
| `lines[].description` | string | no |  |
| `lines[].customer` | id (Customer) | no | nullable; links the line to a customer (statements) |
| `lines[].supplier` | id (Supplier) | no | nullable; links the line to a supplier (statements) |
| `post` | boolean | no | write-only; `true` posts the entry right away |

**Response object**

| Field | Type | Notes |
|---|---|---|
| `id` | integer |  |
| `entry_number` | string | `JE-000001`, per company |
| `date` | date (YYYY-MM-DD) |  |
| `description`, `reference` | string |  |
| `status` | enum | `draft`, `posted` |
| `source_type`, `source_id`, `event` | string | empty for manual entries |
| `reversal_of` | id (JournalEntry) | nullable; set on a reversing entry |
| `reversed_by` | id (JournalEntry) | nullable; set once the entry has been reversed |
| `posted_at` | datetime (ISO 8601) | nullable |
| `posted_by` | id (User) | nullable |
| `lines` | array of objects | `id`, `account`, `account_code`, `account_name`, `debit`, `credit`, `description`, `customer`, `supplier` |
| `total_debit`, `total_credit` | decimal (string) |  |
| `created_at` | datetime (ISO 8601) |  |

**Reverse body** (all optional): `date` (default: today), `description` (default `"Reversal of JE-…"`).

<details><summary>Example: create and post a manual entry → <code>201</code></summary>

```http
POST /api/accounting/v1/journal-entries/
Content-Type: application/json

{"date": "2026-05-01", "description": "Office rent", "post": true,
 "lines": [{"account": 27, "debit": "100.00"}, {"account": 3, "credit": "100.00"}]}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "entry_number": "JE-000001",
    "date": "2026-05-01",
    "description": "Office rent",
    "reference": "",
    "status": "posted",
    "source_type": "",
    "source_id": "",
    "event": "",
    "reversal_of": null,
    "reversed_by": null,
    "posted_at": "2026-10-09T14:31:34.527267+03:00",
    "posted_by": 1,
    "lines": [
      {"id": 1, "account": 27, "account_code": "6200", "account_name": "Rent", "debit": "100.00", "credit": "0.00",
       "description": "", "customer": null, "supplier": null},
      {"id": 2, "account": 3, "account_code": "1110", "account_name": "Bank", "debit": "0.00", "credit": "100.00",
       "description": "", "customer": null, "supplier": null}
    ],
    "total_debit": "100.00",
    "total_credit": "100.00",
    "created_at": "2026-10-09T14:31:34.526137+03:00"
  },
  "metadata": {"timestamp": "2026-10-09T11:31:34.532292Z", "version": "1.0"}
}
```

</details>

### Fiscal years and periods

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/accounting/v1/fiscal-years/` | List |
| `POST` | `/api/accounting/v1/fiscal-years/` | Create (creates its monthly periods) |
| `GET` | `/api/accounting/v1/fiscal-years/{id}/` | Retrieve (with `periods`) |
| `PATCH` | `/api/accounting/v1/fiscal-years/{id}/` | Rename (dates cannot change: `400`) |
| `DELETE` | `/api/accounting/v1/fiscal-years/{id}/` | Delete (`400` once a period is closed) |
| `POST` | `/api/accounting/v1/fiscal-years/{id}/close/` | Close every period and post the closing entry to retained earnings |
| `POST` | `/api/accounting/v1/fiscal-years/{id}/reopen/` | Reverse the closing entry (periods stay closed) |
| `GET` | `/api/accounting/v1/fiscal-periods/` | List periods, by `start_date`. Filters: `fiscal_year`, `status` (`open`/`closed`) |
| `GET` | `/api/accounting/v1/fiscal-periods/{id}/` | Retrieve |
| `POST` | `/api/accounting/v1/fiscal-periods/{id}/close/` | Close (in order, only once it has ended) |
| `POST` | `/api/accounting/v1/fiscal-periods/{id}/reopen/` | Reopen (latest closed first) |

Periods cannot be created directly (`POST fiscal-periods/` → `405`). Every action takes no body and returns the
updated year/period.

**Fiscal year body**: `start_date` (**yes**), `end_date` (**yes**, at most 18 months after the start, no overlap with
another year), `name` (optional, default `FY 2026`).

**Fiscal year object**: `id`, `name`, `start_date`, `end_date`, `status` (`open`/`closed`), `closing_entry`
(id (JournalEntry), nullable), `closed_at`, `closed_by` (id (User)), `periods` (array of period objects).

**Period object**: `id`, `fiscal_year` (id), `name` (`Jan 2026`), `start_date`, `end_date`, `status` (`open`/`closed`),
`closed_at`, `closed_by`.

### Supplier payments

Payments are never edited or deleted: void them and enter them again.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/accounting/v1/supplier-payments/` | List, newest first |
| `POST` | `/api/accounting/v1/supplier-payments/` | Record a payment |
| `GET` | `/api/accounting/v1/supplier-payments/{id}/` | Retrieve |
| `POST` | `/api/accounting/v1/supplier-payments/{id}/void/` | Void (body `{"reason": "…"}`, optional); reverses its entry and reopens the invoices |

**List query parameters**: `supplier`, `status` (`completed`/`voided`), `payment_method`, `invoice` (payments allocated
to that supplier invoice), `start_date`, `end_date` (on `payment_date`).

**Body**

| Field | Type | Required | Notes |
|---|---|---|---|
| `supplier` | id (Supplier) | **yes** |  |
| `amount` | decimal (string) | **yes** | > 0 |
| `payment_date` | date (YYYY-MM-DD) | no | default today |
| `payment_method` | enum | no | `cash`, `bank_transfer` (default), `check`, `credit_card`, `other` |
| `reference` | string | no | max 100 chars |
| `notes` | string | no |  |
| `allocations` | array of objects | no | `[{"invoice": <supplier invoice id>, "amount": "60.00"}]`. Invoices of the same supplier, `matched` (or `paid`) with at least that much open (see `open_balance` and `?open=true` on [supplier invoices](#supplier-invoices)); the allocations cannot exceed `amount`. What is not allocated stays an advance to the supplier |

**Response object**: `id`, `payment_number` (`SP-00001`), `supplier` (id), `supplier_name`, `payment_date`, `amount`,
`payment_method`, `reference`, `notes`, `status` (`completed`/`voided`), `allocations` (`id`, `invoice`,
`invoice_number`, `amount`), `allocated_amount`, `unallocated_amount`, `voided_at`, `voided_by` (id (User)),
`void_reason`, `created_at`.

### Debit notes

Claims against a supplier that reduce what the company owes them. Drafts can be edited and deleted; issued notes are
only cancelled.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/accounting/v1/debit-notes/` | List, newest first |
| `POST` | `/api/accounting/v1/debit-notes/` | Create a draft |
| `GET` | `/api/accounting/v1/debit-notes/{id}/` | Retrieve |
| `PUT` | `/api/accounting/v1/debit-notes/{id}/` | Replace (drafts only) |
| `PATCH` | `/api/accounting/v1/debit-notes/{id}/` | Update (drafts only) |
| `DELETE` | `/api/accounting/v1/debit-notes/{id}/` | Delete (drafts only) |
| `POST` | `/api/accounting/v1/debit-notes/{id}/issue/` | Issue (posts its entry; may not exceed the linked invoice's open balance) |
| `POST` | `/api/accounting/v1/debit-notes/{id}/cancel/` | Cancel an issued note (body `{"reason": "…"}`, optional) |
| `POST` | `/api/accounting/v1/debit-notes/from-supplier-return/` | Draft a note for an approved supplier return: `{"supplier_return": <id>, "tax_amount": "0.00"}` → `201` |

**List query parameters**: `supplier`, `status` (`draft`/`issued`/`cancelled`), `supplier_invoice`, `supplier_return`.

**Body**

| Field | Type | Required | Notes |
|---|---|---|---|
| `supplier` | id (Supplier) | **yes** |  |
| `supplier_invoice` | id (SupplierInvoice) | no | nullable; must belong to the same supplier |
| `supplier_return` | id (SupplierReturn) | no | nullable; must belong to the same supplier |
| `date` | date (YYYY-MM-DD) | **yes** |  |
| `subtotal` | decimal (string) | **yes** | ≥ 0 |
| `tax_amount` | decimal (string) | no | ≥ 0, default `0` |
| `supplier_reference` | string | no | the supplier's own credit note number |
| `reason` | string | no |  |

**Response object**: `id`, `note_number` (`DBN-00001`), `supplier`, `supplier_name`, `supplier_invoice`,
`supplier_return`, `date`, `subtotal`, `tax_amount`, `total_amount`, `supplier_reference`, `reason`, `status`,
`issued_at`, `cancelled_at`, `cancel_reason`, `created_at`.

### Financial reports

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/accounting/v1/reports/` | Report types: `[{"report_type": "trial_balance", "name": "Trial Balance"}, …]` |
| `GET` | `/api/accounting/v1/reports/{report_type}/` | Run a report; `export=xlsx` downloads it as an Excel file instead |

Reports read **posted** entries only. Unknown parameters are ignored; a bad date or an unknown id answers `400`
(`"start_date must be a date (YYYY-MM-DD)"`, `"Account not found"`).

| `report_type` | Parameters | `rows` | `summary` |
|---|---|---|---|
| `trial_balance` | `start_date`, `end_date` | `account_id`, `code`, `name`, `account_type`, `opening_debit`, `opening_credit`, `debit`, `credit`, `closing_debit`, `closing_credit` | `start_date`, `end_date`, `total_<each amount>`, `is_balanced` |
| `income_statement` | `start_date`, `end_date` | `account_id`, `code`, `name`, `account_type`, `section` (`revenue`/`cost_of_sales`/`expense`), `amount` | `start_date`, `end_date`, `total_revenue`, `total_cost_of_sales`, `gross_profit`, `total_expenses`, `net_income` |
| `balance_sheet` | `as_of_date` (default today) | same as above with `section` `asset`/`liability`/`equity`; unclosed profit is a `Current Earnings` row (`account_id: null`) | `as_of_date`, `total_assets`, `total_liabilities`, `total_equity`, `total_liabilities_and_equity`, `is_balanced` |
| `general_ledger` | `account` (**required**), `start_date`, `end_date` | `date`, `entry_id`, `entry_number`, `account_code`, `description`, `reference`, `debit`, `credit`, `balance` (running) | `account` (`"1110 Bank"`), `start_date`, `end_date`, `opening_balance`, `total_debit`, `total_credit`, `closing_balance` |
| `customer_statement` | `customer` (**required**), `start_date`, `end_date` | as `general_ledger` (receivable lines of that customer) | as `general_ledger` with `customer` (name) instead of `account` |
| `supplier_statement` | `supplier` (**required**), `start_date`, `end_date` | as `general_ledger` (payable lines of that supplier) | as `general_ledger` with `supplier` (name) instead of `account` |
| `receivables_aging` | `as_of_date` (default today) | `customer_id`, `customer`, `current`, `days_1_30`, `days_31_60`, `days_61_90`, `over_90`, `total`, `credits`, `net` | `as_of_date` and the totals of every amount column |
| `payables_aging` | `as_of_date` (default today) | the same with `supplier_id`, `supplier` | the same |

Every report answers `{"report_type", "columns", "rows", "summary"}`; `columns` lists the row keys to show, in order.

<details><summary>Example: trial balance → <code>200</code></summary>

```http
GET /api/accounting/v1/reports/trial_balance/
```

Response:

```json
{
  "success": true,
  "data": {
    "report_type": "trial_balance",
    "columns": ["code", "name", "account_type", "opening_debit", "opening_credit", "debit", "credit",
                "closing_debit", "closing_credit"],
    "rows": [
      {"account_id": 3, "code": "1110", "name": "Bank", "account_type": "asset", "opening_debit": 0.0,
       "opening_credit": 0.0, "debit": 100.0, "credit": 100.0, "closing_debit": 0.0, "closing_credit": 0.0},
      {"account_id": 27, "code": "6200", "name": "Rent", "account_type": "expense", "opening_debit": 0.0,
       "opening_credit": 0.0, "debit": 100.0, "credit": 100.0, "closing_debit": 0.0, "closing_credit": 0.0}
    ],
    "summary": {
      "start_date": null, "end_date": null,
      "total_opening_debit": 0.0, "total_opening_credit": 0.0, "total_debit": 200.0, "total_credit": 200.0,
      "total_closing_debit": 0.0, "total_closing_credit": 0.0, "is_balanced": true
    }
  },
  "metadata": {"timestamp": "2026-10-09T11:31:34.556634Z", "version": "1.0"}
}
```

</details>

---

## Subscriptions & platform billing

The company's own subscription to Tanzim (plans, modules, platform invoices). Not to be confused with *sales invoices*.

### Plans

Public catalogue (no token needed to read).

**Access:** read: anyone · write: platform staff.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/subscriptions/plans/` | List |
| `POST` | `/api/subscriptions/plans/` | Create |
| `GET` | `/api/subscriptions/plans/{id}/` | Retrieve |
| `PUT` | `/api/subscriptions/plans/{id}/` | Replace (all required fields) |
| `PATCH` | `/api/subscriptions/plans/{id}/` | Partial update |
| `DELETE` | `/api/subscriptions/plans/{id}/` | Delete |
| `POST` | `/api/subscriptions/plans/{id}/calculate_cost/` | Price quote (public) |

**Create body** (`POST`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | **yes** | max 100 chars |
| `description` | string | no |  |
| `billing_period` | enum | no | one of: `monthly`, `quarterly`, `yearly` |
| `base_price` | decimal (string) | **yes** |  |
| `max_users` | integer | no | nullable |
| `trial_days` | integer | no |  |
| `is_featured` | boolean | no |  |

_Update (`PUT`/`PATCH`) accepts the same fields; with `PATCH` every field is optional._

**Response object** (retrieve; create/update return the same shape)

| Field | Type | Notes |
|---|---|---|
| `id` | integer |  |
| `name` | string |  |
| `description` | string |  |
| `billing_period` | enum | one of: `monthly`, `quarterly`, `yearly` |
| `base_price` | decimal (string) |  |
| `max_users` | integer |  |
| `trial_days` | integer |  |
| `is_featured` | boolean |  |
| `included_modules` | computed |  |
| `addon_modules` | computed |  |

**Examples** (real responses from the running API)

<details><summary>Example: list → <code>200</code></summary>

```http
GET /api/subscriptions/plans/
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Plan 0",
      "description": "",
      "billing_period": "monthly",
      "base_price": "99.00",
      "max_users": null,
      "trial_days": 14,
      "is_featured": false,
      "included_modules": [],
      "addon_modules": []
    }
  ],
  "metadata": {
    "timestamp": "2026-10-03T21:50:21.426393Z",
    "version": "1.0",
    "total_count": 2
  }
}
```

</details>

<details><summary>Example: create → <code>201</code></summary>

```http
POST /api/subscriptions/plans/
```

Request body:

```json
{
  "name": "Plan 1-N",
  "description": "",
  "billing_period": "monthly",
  "base_price": "99.00",
  "trial_days": 14,
  "is_featured": false
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 3,
    "name": "Plan 1-N",
    "description": "",
    "billing_period": "monthly",
    "base_price": "99.00",
    "max_users": null,
    "trial_days": 14,
    "is_featured": false,
    "included_modules": [],
    "addon_modules": []
  },
  "metadata": {
    "timestamp": "2026-10-03T21:50:21.432874Z",
    "version": "1.0"
  }
}
```

</details>

#### `POST /api/subscriptions/plans/{id}/calculate_cost/` — Price quote (public)

| Field | Type | Required | Notes |
|---|---|---|---|
| modules | array of module ids | no | add-on modules |
| user_count | integer | no | default 1 |

Returns: `{subtotal, package_savings, modules[…], …}`.

<details><summary>Example: Calculate plan cost → <code>200</code></summary>

```http
POST /api/subscriptions/plans/1/calculate_cost/
```

Request body:

```json
{
  "modules": [
    3
  ],
  "user_count": 10
}
```

Response:

```json
{
  "success": true,
  "data": {
    "plan": {
      "id": 1,
      "name": "Professional",
      "description": "",
      "billing_period": "monthly",
      "base_price": "99.00",
      "max_users": null,
      "trial_days": 14,
      "is_featured": false,
      "included_modules": [
        {
          "id": 1,
          "name": "Inventory",
          "code": "inventory",
          "description": "",
          "price_per_user": "0.00",
          "icon": "",
          "is_active": true
        }
      ],
      "addon_modules": [
        {
          "id": 3,
          "name": "Analytics",
          "code": "analytics",
          "description": "",
          "price_per_user": "5.00",
          "icon": "",
          "is_active": true
        }
      ]
    },
    "user_count": 10,
    "subtotal": "50.00",
    "package_savings": "0.00",
  … (truncated)
```

</details>

### Modules

Feature modules (`inventory`, `location`, …). Read: any user · write: staff.

**Access:** read: anyone · write: platform staff.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/subscriptions/modules/` | List |
| `POST` | `/api/subscriptions/modules/` | Create |
| `GET` | `/api/subscriptions/modules/{id}/` | Retrieve |
| `PUT` | `/api/subscriptions/modules/{id}/` | Replace (all required fields) |
| `PATCH` | `/api/subscriptions/modules/{id}/` | Partial update |
| `DELETE` | `/api/subscriptions/modules/{id}/` | Delete |

**Create body** (`POST`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | **yes** | max 100 chars |
| `code` | string | **yes** | max 50 chars |
| `description` | string | no |  |
| `price_per_user` | decimal (string) | **yes** |  |
| `icon` | string | no | max 50 chars |
| `is_active` | boolean | no |  |

_Update (`PUT`/`PATCH`) accepts the same fields; with `PATCH` every field is optional._

**Response object** (retrieve; create/update return the same shape)

| Field | Type | Notes |
|---|---|---|
| `id` | integer |  |
| `name` | string |  |
| `code` | string |  |
| `description` | string |  |
| `price_per_user` | decimal (string) |  |
| `icon` | string |  |
| `is_active` | boolean |  |

**Examples** (real responses from the running API)

<details><summary>Example: list → <code>200</code></summary>

```http
GET /api/subscriptions/modules/
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Module 0",
      "code": "inventory",
      "description": "",
      "price_per_user": "2.00",
      "icon": "",
      "is_active": true
    }
  ],
  "metadata": {
    "timestamp": "2026-10-03T21:50:21.569511Z",
    "version": "1.0",
    "total_count": 2
  }
}
```

</details>

### Subscriptions

The current company's subscription(s).

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/subscriptions/subscriptions/` | List |
| `POST` | `/api/subscriptions/subscriptions/` | Create |
| `GET` | `/api/subscriptions/subscriptions/{id}/` | Retrieve |
| `PUT` | `/api/subscriptions/subscriptions/{id}/` | Replace (all required fields) |
| `PATCH` | `/api/subscriptions/subscriptions/{id}/` | Partial update |
| `DELETE` | `/api/subscriptions/subscriptions/{id}/` | Delete |
| `GET` | `/api/subscriptions/subscriptions/current/` | Current subscription |
| `POST` | `/api/subscriptions/subscriptions/{id}/add_module/` | Add a module |
| `POST` | `/api/subscriptions/subscriptions/{id}/remove_module/` | Remove a module |
| `POST` | `/api/subscriptions/subscriptions/{id}/update_users/` | Change licensed user count |

**Create body** (`POST`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `company` | id (Company) | **yes** |  |
| `plan` | id (Plan) | **yes** |  |
| `status` | enum | no | one of: `trial`, `active`, `past_due`, `canceled`, `expired` |
| `start_date` | date (YYYY-MM-DD) | **yes** |  |
| `end_date` | date (YYYY-MM-DD) | **yes** |  |
| `trial_end_date` | date (YYYY-MM-DD) | no | nullable |
| `next_billing_date` | date (YYYY-MM-DD) | **yes** |  |
| `billing_email` | email | **yes** | max 254 chars |
| `licensed_users` | integer | no |  |
| `auto_renew` | boolean | no |  |

_Update (`PUT`/`PATCH`) accepts the same fields; with `PATCH` every field is optional._

**Response object** (retrieve; create/update return the same shape)

| Field | Type | Notes |
|---|---|---|
| `id` | integer |  |
| `company` | id (Company) |  |
| `plan` | id (Plan) |  |
| `plan_name` | string |  |
| `status` | enum | one of: `trial`, `active`, `past_due`, `canceled`, `expired` |
| `start_date` | date (YYYY-MM-DD) |  |
| `end_date` | date (YYYY-MM-DD) |  |
| `trial_end_date` | date (YYYY-MM-DD) |  |
| `next_billing_date` | date (YYYY-MM-DD) |  |
| `billing_email` | email |  |
| `licensed_users` | integer |  |
| `auto_renew` | boolean |  |
| `modules` | array of objects | fields: id, module, price_per_user, is_active, package_name, enabled_at |
| `is_trial_active` | computed |  |
| `days_remaining` | computed |  |

**Examples** (real responses from the running API)

<details><summary>Example: list → <code>200</code></summary>

```http
GET /api/subscriptions/subscriptions/
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "company": 1,
      "plan": 1,
      "plan_name": "Plan 0",
      "status": "active",
      "start_date": "2026-10-03",
      "end_date": "2026-11-02",
      "trial_end_date": null,
      "next_billing_date": "2026-10-03",
      "billing_email": "info@acme.example",
      "licensed_users": 10,
      "auto_renew": true,
      "modules": [
        {
          "id": 1,
          "module": {
            "id": 1,
            "name": "Module 0",
            "code": "inventory",
            "description": "",
            "price_per_user": "2.00",
            "icon": "",
            "is_active": true
          },
          "price_per_user": "2.00",
          "is_active": true,
          "package_name": null,
          "enabled_at": "2026-10-04T00:49:35.689512+03:00"
        }
      ],
      "is_trial_active": false,
      "days_remaining": 30
    }
  ],
  … (truncated)
```

</details>

#### `GET /api/subscriptions/subscriptions/current/` — Current subscription

Returns: the latest subscription or 404.

<details><summary>Example: Current subscription → <code>200</code></summary>

```http
GET /api/subscriptions/subscriptions/current/
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "company": 1,
    "plan": 1,
    "plan_name": "Professional",
    "status": "active",
    "start_date": "2026-10-03",
    "end_date": "2026-11-02",
    "trial_end_date": null,
    "next_billing_date": "2026-10-03",
    "billing_email": "info@acme.example",
    "licensed_users": 5,
    "auto_renew": true,
    "modules": [
      {
        "id": 1,
        "module": {
          "id": 1,
          "name": "Inventory",
          "code": "inventory",
          "description": "",
          "price_per_user": "0.00",
          "icon": "",
          "is_active": true
        },
        "price_per_user": "0.00",
        "is_active": true,
        "package_name": null,
        "enabled_at": "2026-10-04T00:57:33.444731+03:00"
      }
    ],
    "is_trial_active": false,
    "days_remaining": 30
  },
  "metadata": {
    "timestamp": "2026-10-03T21:57:40.803030Z",
  … (truncated)
```

</details>

#### `POST /api/subscriptions/subscriptions/{id}/add_module/` — Add a module

| Field | Type | Required | Notes |
|---|---|---|---|
| module_id | id | **yes** |  |

Returns: 201 with the subscription module.

<details><summary>Example: Add module → <code>201</code></summary>

```http
POST /api/subscriptions/subscriptions/1/add_module/
```

Request body:

```json
{
  "module_id": 3
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 3,
    "module": {
      "id": 3,
      "name": "Analytics",
      "code": "analytics",
      "description": "",
      "price_per_user": "5.00",
      "icon": "",
      "is_active": true
    },
    "price_per_user": "5.00",
    "is_active": true,
    "package_name": null,
    "enabled_at": "2026-10-04T00:57:40.815193+03:00"
  },
  "metadata": {
    "timestamp": "2026-10-03T21:57:40.816888Z",
    "version": "1.0"
  }
}
```

</details>

#### `POST /api/subscriptions/subscriptions/{id}/remove_module/` — Remove a module

| Field | Type | Required | Notes |
|---|---|---|---|
| module_id | id | **yes** |  |

Returns: 204.

<details><summary>Example: Remove module → <code>204</code></summary>

```http
POST /api/subscriptions/subscriptions/1/remove_module/
```

Request body:

```json
{
  "module_id": 3
}
```

</details>

#### `POST /api/subscriptions/subscriptions/{id}/update_users/` — Change licensed user count

| Field | Type | Required | Notes |
|---|---|---|---|
| licensed_users | integer | **yes** |  |

Returns: the subscription.

<details><summary>Example: Update licensed users → <code>200</code></summary>

```http
POST /api/subscriptions/subscriptions/1/update_users/
```

Request body:

```json
{
  "licensed_users": 8
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "company": 1,
    "plan": 1,
    "plan_name": "Professional",
    "status": "active",
    "start_date": "2026-10-03",
    "end_date": "2026-11-02",
    "trial_end_date": null,
    "next_billing_date": "2026-10-03",
    "billing_email": "info@acme.example",
    "licensed_users": 8,
    "auto_renew": true,
    "modules": [
      {
        "id": 3,
        "module": {
          "id": 3,
          "name": "Analytics",
          "code": "analytics",
          "description": "",
          "price_per_user": "5.00",
          "icon": "",
          "is_active": true
        },
        "price_per_user": "5.00",
        "is_active": false,
        "package_name": null,
        "enabled_at": "2026-10-04T00:57:40.815193+03:00"
      }
    ],
    "is_trial_active": false,
    "days_remaining": 30
  },
  "metadata": {
    "timestamp": "2026-10-03T21:57:40.841747Z",
  … (truncated)
```

</details>

### Subscription modules

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/subscriptions/subscription-modules/` | List |
| `POST` | `/api/subscriptions/subscription-modules/` | Create |
| `GET` | `/api/subscriptions/subscription-modules/{id}/` | Retrieve |
| `PUT` | `/api/subscriptions/subscription-modules/{id}/` | Replace (all required fields) |
| `PATCH` | `/api/subscriptions/subscription-modules/{id}/` | Partial update |
| `DELETE` | `/api/subscriptions/subscription-modules/{id}/` | Delete |

**Create body** (`POST`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `price_per_user` | decimal (string) | **yes** |  |
| `is_active` | boolean | no |  |

_Update (`PUT`/`PATCH`) accepts the same fields; with `PATCH` every field is optional._

**Response object** (retrieve; create/update return the same shape)

| Field | Type | Notes |
|---|---|---|
| `id` | integer |  |
| `module` | object | fields: id, name, code, description, price_per_user, icon, is_active |
| `price_per_user` | decimal (string) |  |
| `is_active` | boolean |  |
| `package_name` | string |  |
| `enabled_at` | datetime (ISO 8601) |  |

**Examples** (real responses from the running API)

<details><summary>Example: list → <code>200</code></summary>

```http
GET /api/subscriptions/subscription-modules/
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "module": {
        "id": 1,
        "name": "Module 0",
        "code": "inventory",
        "description": "",
        "price_per_user": "2.00",
        "icon": "",
        "is_active": true
      },
      "price_per_user": "2.00",
      "is_active": true,
      "package_name": null,
      "enabled_at": "2026-10-04T00:49:35.689512+03:00"
    }
  ],
  "metadata": {
    "timestamp": "2026-10-03T21:50:21.581009Z",
    "version": "1.0",
    "total_count": 2
  }
}
```

</details>

### Platform invoices

Invoices Tanzim issues to the company.

**Access.** Company users can only read (`GET`) their own company's invoices. Every write — `POST`, `PUT`, `PATCH`,
`DELETE` and all the actions below — requires platform staff (`is_staff`); anyone else gets `403`. Staff see the
invoices of every company (optional filter `?company=<id>`) and need no company of their own; `create_draft` creates
the invoice for the company of the given `subscription`.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/subscriptions/invoices/` | List |
| `POST` | `/api/subscriptions/invoices/` | Create |
| `GET` | `/api/subscriptions/invoices/{id}/` | Retrieve |
| `PUT` | `/api/subscriptions/invoices/{id}/` | Replace (all required fields) |
| `PATCH` | `/api/subscriptions/invoices/{id}/` | Partial update |
| `DELETE` | `/api/subscriptions/invoices/{id}/` | Delete |
| `POST` | `/api/subscriptions/invoices/create_draft/` | Create a draft invoice |
| `POST` | `/api/subscriptions/invoices/{id}/add_item/` | Add a line item (draft only) |
| `PATCH` | `/api/subscriptions/invoices/{id}/items/{item_id}/` | Update a line item |
| `DELETE` | `/api/subscriptions/invoices/{id}/items/{item_id}/` | Remove a line item |
| `POST` | `/api/subscriptions/invoices/{id}/issue/` | Issue (needs at least one item) |
| `POST` | `/api/subscriptions/invoices/{id}/add_payment/` | Record a payment |
| `POST` | `/api/subscriptions/invoices/{id}/mark_paid/` | Mark fully paid |
| `POST` | `/api/subscriptions/invoices/{id}/cancel/` | Cancel |

**Create body** (`POST`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `subscription` | id (Subscription) | **yes** |  |
| `status` | enum | no | one of: `draft`, `issued`, `partially_paid`, `paid`, `overdue`, `cancelled` |
| `issue_date` | date (YYYY-MM-DD) | **yes** |  |
| `due_date` | date (YYYY-MM-DD) | **yes** |  |
| `tax_rate` | decimal (string) | no |  |
| `discount` | decimal (string) | no |  |
| `discount_type` | enum | no | one of: `fixed`, `percentage` |
| `payment_method` | string | no | max 50 chars |
| `notes` | string | no |  |

_Update (`PUT`/`PATCH`) accepts the same fields; with `PATCH` every field is optional._

**Response object** (retrieve; create/update return the same shape)

| Field | Type | Notes |
|---|---|---|
| `id` | integer |  |
| `invoice_number` | string |  |
| `company_name` | string |  |
| `subscription` | id (Subscription) |  |
| `status` | enum | one of: `draft`, `issued`, `partially_paid`, `paid`, `overdue`, `cancelled` |
| `issue_date` | date (YYYY-MM-DD) |  |
| `due_date` | date (YYYY-MM-DD) |  |
| `paid_date` | date (YYYY-MM-DD) |  |
| `subtotal` | decimal (string) |  |
| `tax_rate` | decimal (string) |  |
| `tax_amount` | decimal (string) |  |
| `discount` | decimal (string) |  |
| `discount_type` | enum | one of: `fixed`, `percentage` |
| `total` | decimal (string) |  |
| `amount_paid` | decimal (string) |  |
| `amount_due` | decimal (string) |  |
| `payment_method` | string |  |
| `notes` | string |  |
| `items` | array of objects | fields: id, description, quantity, unit_price, amount, module_name |
| `items_count` | integer |  |
| `can_edit` | boolean |  |
| `can_cancel` | boolean |  |
| `can_add_payment` | boolean |  |
| `status_history` | array of objects | fields: id, from_status, to_status, reason, changed_by_email, created_at |

**Examples** (real responses from the running API)

<details><summary>Example: list → <code>200</code></summary>

```http
GET /api/subscriptions/invoices/
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "invoice_number": "INV-0000",
      "company_name": "Acme Trading",
      "subscription": 1,
      "status": "issued",
      "issue_date": "2026-10-03",
      "due_date": "2026-11-02",
      "paid_date": null,
      "subtotal": "0.00",
      "tax_rate": "0.00",
      "tax_amount": "0.00",
      "discount": "0.00",
      "discount_type": "fixed",
      "total": "0.00",
      "amount_paid": "0.00",
      "amount_due": "0.00",
      "payment_method": "",
      "notes": "",
      "items": [
        {
          "id": 1,
          "description": "Scientist quickly throughout authority.",
          "quantity": 1,
          "unit_price": "10.00",
          "amount": "10.00",
          "module_name": null
        }
      ],
      "items_count": 1,
      "can_edit": false,
      "can_cancel": true,
      "can_add_payment": true,
      "status_history": []
    }
  … (truncated)
```

</details>

#### `POST /api/subscriptions/invoices/create_draft/` — Create a draft invoice

| Field | Type | Required | Notes |
|---|---|---|---|
| subscription | id | **yes** |  |
| due_date | date | no |  |
| notes | string | no |  |
| tax_rate | decimal (percent) | no |  |
| discount | decimal | no |  |

Returns: the invoice (201).

<details><summary>Example: Create draft platform invoice → <code>201</code></summary>

```http
POST /api/subscriptions/invoices/create_draft/
```

Request body:

```json
{
  "subscription": 1,
  "tax_rate": "14.00",
  "discount": "0",
  "notes": "October"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "invoice_number": "INV-1-2026-000001",
    "company_name": "Acme Trading",
    "subscription": 1,
    "status": "draft",
    "issue_date": "2026-10-03",
    "due_date": "2026-11-02",
    "paid_date": null,
    "subtotal": "0.00",
    "tax_rate": "14.00",
    "tax_amount": "0.00",
    "discount": "0.00",
    "discount_type": "fixed",
    "total": "0.00",
    "amount_paid": "0.00",
    "amount_due": "0.00",
    "payment_method": "",
    "notes": "October",
    "items": [],
    "items_count": 0,
    "can_edit": true,
    "can_cancel": true,
    "can_add_payment": false,
    "status_history": []
  },
  "metadata": {
    "timestamp": "2026-10-03T21:57:40.860962Z",
    "version": "1.0"
  }
}
```

</details>

#### `POST /api/subscriptions/invoices/{id}/add_item/` — Add a line item (draft only)

| Field | Type | Required | Notes |
|---|---|---|---|
| description | string | **yes** |  |
| quantity | integer ≥ 1 | **yes** |  |
| unit_price | decimal | **yes** |  |
| module | id | no |  |

Returns: the invoice.

<details><summary>Example: Add invoice item → <code>200</code></summary>

```http
POST /api/subscriptions/invoices/1/add_item/
```

Request body:

```json
{
  "description": "Extra seats",
  "quantity": 3,
  "unit_price": "10.00"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "invoice_number": "INV-1-2026-000001",
    "company_name": "Acme Trading",
    "subscription": 1,
    "status": "draft",
    "issue_date": "2026-10-03",
    "due_date": "2026-11-02",
    "paid_date": null,
    "subtotal": "30.00",
    "tax_rate": "14.00",
    "tax_amount": "4.20",
    "discount": "0.00",
    "discount_type": "fixed",
    "total": "34.20",
    "amount_paid": "0.00",
    "amount_due": "34.20",
    "payment_method": "",
    "notes": "October",
    "items": [
      {
        "id": 1,
        "description": "Extra seats",
        "quantity": 3,
        "unit_price": "10.00",
        "amount": "30.00",
        "module_name": null
      }
    ],
    "items_count": 1,
    "can_edit": true,
    "can_cancel": true,
    "can_add_payment": false,
    "status_history": []
  },
  "metadata": {
  … (truncated)
```

</details>

#### `PATCH /api/subscriptions/invoices/{id}/items/{item_id}/` — Update a line item

| Field | Type | Required | Notes |
|---|---|---|---|
| description / quantity / unit_price |  |  | same as add_item |

Draft invoices only. Returns the updated invoice.

#### `DELETE /api/subscriptions/invoices/{id}/items/{item_id}/` — Remove a line item

Returns: the invoice.

<details><summary>Example: Remove invoice item → <code>200</code></summary>

```http
DELETE /api/subscriptions/invoices/1/items/2/
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "invoice_number": "INV-1-2026-000001",
    "company_name": "Acme Trading",
    "subscription": 1,
    "status": "draft",
    "issue_date": "2026-10-03",
    "due_date": "2026-11-02",
    "paid_date": null,
    "subtotal": "30.00",
    "tax_rate": "14.00",
    "tax_amount": "4.20",
    "discount": "0.00",
    "discount_type": "fixed",
    "total": "34.20",
    "amount_paid": "0.00",
    "amount_due": "34.20",
    "payment_method": "",
    "notes": "October",
    "items": [
      {
        "id": 1,
        "description": "Extra seats",
        "quantity": 3,
        "unit_price": "10.00",
        "amount": "30.00",
        "module_name": null
      }
    ],
    "items_count": 1,
    "can_edit": true,
    "can_cancel": true,
    "can_add_payment": false,
    "status_history": []
  },
  "metadata": {
  … (truncated)
```

</details>

#### `POST /api/subscriptions/invoices/{id}/issue/` — Issue (needs at least one item)

_No body._

Returns: the invoice.

<details><summary>Example: Issue platform invoice → <code>200</code></summary>

```http
POST /api/subscriptions/invoices/1/issue/
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "invoice_number": "INV-1-2026-000001",
    "company_name": "Acme Trading",
    "subscription": 1,
    "status": "issued",
    "issue_date": "2026-10-03",
    "due_date": "2026-11-02",
    "paid_date": null,
    "subtotal": "30.00",
    "tax_rate": "14.00",
    "tax_amount": "4.20",
    "discount": "0.00",
    "discount_type": "fixed",
    "total": "34.20",
    "amount_paid": "0.00",
    "amount_due": "34.20",
    "payment_method": "",
    "notes": "October",
    "items": [
      {
        "id": 1,
        "description": "Extra seats",
        "quantity": 3,
        "unit_price": "10.00",
        "amount": "30.00",
        "module_name": null
      }
    ],
    "items_count": 1,
    "can_edit": false,
    "can_cancel": true,
    "can_add_payment": true,
    "status_history": []
  },
  "metadata": {
  … (truncated)
```

</details>

#### `POST /api/subscriptions/invoices/{id}/add_payment/` — Record a payment

| Field | Type | Required | Notes |
|---|---|---|---|
| amount | decimal | **yes** | ≤ amount due |
| payment_method | id (PaymentMethod) | no |  |
| transaction_id | string | no |  |
| notes | string | no |  |

Returns: the invoice.

<details><summary>Example: Add platform payment → <code>201</code></summary>

```http
POST /api/subscriptions/invoices/1/add_payment/
```

Request body:

```json
{
  "amount": "10.00",
  "payment_method": 1,
  "transaction_id": "ch_123"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "invoice": 1,
    "invoice_number": "INV-1-2026-000001",
    "payment_method": 1,
    "payment_method_detail": {
      "id": 1,
      "method_type": "card",
      "display": "card",
      "is_default": true
    },
    "amount": "10.00",
    "status": "completed",
    "transaction_id": "ch_123",
    "paid_at": "2026-10-04T00:57:40.957531+03:00",
    "refunded_amount": "0.00",
    "net_amount": "10.00",
    "notes": "",
    "created_at": "2026-10-04T00:57:40.957947+03:00"
  },
  "metadata": {
    "timestamp": "2026-10-03T21:57:40.964133Z",
    "version": "1.0"
  }
}
```

</details>

#### `POST /api/subscriptions/invoices/{id}/mark_paid/` — Mark fully paid

| Field | Type | Required | Notes |
|---|---|---|---|
| payment_method | id | no |  |
| transaction_id | string | no |  |

Returns: the invoice.

<details><summary>Example: Mark platform invoice paid → <code>200</code></summary>

```http
POST /api/subscriptions/invoices/1/mark_paid/
```

Request body:

```json
{
  "payment_method": 1,
  "transaction_id": "ch_124"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "invoice_number": "INV-1-2026-000001",
    "company_name": "Acme Trading",
    "subscription": 1,
    "status": "paid",
    "issue_date": "2026-10-03",
    "due_date": "2026-11-02",
    "paid_date": "2026-10-03",
    "subtotal": "30.00",
    "tax_rate": "14.00",
    "tax_amount": "4.20",
    "discount": "0.00",
    "discount_type": "fixed",
    "total": "34.20",
    "amount_paid": "10.00",
    "amount_due": "24.20",
    "payment_method": "1",
    "notes": "October",
    "items": [
      {
        "id": 1,
        "description": "Extra seats",
        "quantity": 3,
        "unit_price": "10.00",
        "amount": "30.00",
        "module_name": null
      }
    ],
    "items_count": 1,
    "can_edit": false,
    "can_cancel": false,
    "can_add_payment": false,
    "status_history": [
      {
        "id": 2,
  … (truncated)
```

</details>

#### `POST /api/subscriptions/invoices/{id}/cancel/` — Cancel

| Field | Type | Required | Notes |
|---|---|---|---|
| reason | string | no |  |

Returns: the invoice.

<details><summary>Example: Cancel platform invoice → <code>200</code></summary>

```http
POST /api/subscriptions/invoices/2/cancel/
```

Request body:

```json
{
  "reason": "Created by mistake"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 2,
    "invoice_number": "INV-1-2026-000002",
    "company_name": "Acme Trading",
    "subscription": 1,
    "status": "cancelled",
    "issue_date": "2026-10-03",
    "due_date": "2026-11-02",
    "paid_date": null,
    "subtotal": "0.00",
    "tax_rate": "0.00",
    "tax_amount": "0.00",
    "discount": "0.00",
    "discount_type": "fixed",
    "total": "0.00",
    "amount_paid": "0.00",
    "amount_due": "0.00",
    "payment_method": "",
    "notes": "",
    "items": [],
    "items_count": 0,
    "can_edit": false,
    "can_cancel": false,
    "can_add_payment": false,
    "status_history": []
  },
  "metadata": {
    "timestamp": "2026-10-03T21:57:41.018335Z",
    "version": "1.0"
  }
}
```

</details>

### Platform payments

Read-only list of payments, plus refunds.

**Access.** Company users read their own company's payments; `refund` requires platform staff (`403` otherwise).
Staff see every company's payments (optional filter `?company=<id>`).

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/subscriptions/payments/` | List |
| `GET` | `/api/subscriptions/payments/{id}/` | Retrieve |
| `POST` | `/api/subscriptions/payments/{id}/refund/` | Refund (full or partial) |

**Response object** (retrieve; create/update return the same shape)

| Field | Type | Notes |
|---|---|---|
| `id` | integer |  |
| `invoice` | id (Invoice) |  |
| `invoice_number` | string |  |
| `payment_method` | id (PaymentMethod) |  |
| `payment_method_detail` | object | fields: id, method_type, display, is_default |
| `amount` | decimal (string) |  |
| `status` | enum | one of: `pending`, `completed`, `failed`, `refunded`, `partially_refunded` |
| `transaction_id` | string |  |
| `paid_at` | datetime (ISO 8601) |  |
| `refunded_amount` | decimal (string) |  |
| `net_amount` | decimal (string) |  |
| `notes` | string |  |
| `created_at` | datetime (ISO 8601) |  |

**Examples** (real responses from the running API)

<details><summary>Example: list → <code>200</code></summary>

```http
GET /api/subscriptions/payments/
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "invoice": 1,
      "invoice_number": "INV-0000",
      "payment_method": null,
      "payment_method_detail": null,
      "amount": "100.00",
      "status": "completed",
      "transaction_id": "txn_00000000",
      "paid_at": "2026-10-04T00:49:35.695794+03:00",
      "refunded_amount": "0.00",
      "net_amount": "100.00",
      "notes": "",
      "created_at": "2026-10-04T00:49:35.696212+03:00"
    }
  ],
  "metadata": {
    "timestamp": "2026-10-03T21:50:21.538817Z",
    "version": "1.0",
    "total_count": 1
  }
}
```

</details>

#### `POST /api/subscriptions/payments/{id}/refund/` — Refund (full or partial)

| Field | Type | Required | Notes |
|---|---|---|---|
| amount | decimal | **yes** |  |
| reason | string | no |  |

Returns: the payment.

<details><summary>Example: Refund platform payment → <code>200</code></summary>

```http
POST /api/subscriptions/payments/1/refund/
```

Request body:

```json
{
  "amount": "10.00",
  "reason": "Goodwill"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "invoice": 1,
    "invoice_number": "INV-1-2026-000001",
    "payment_method": 1,
    "payment_method_detail": {
      "id": 1,
      "method_type": "card",
      "display": "card",
      "is_default": true
    },
    "amount": "10.00",
    "status": "refunded",
    "transaction_id": "ch_123",
    "paid_at": "2026-10-04T00:57:40.957531+03:00",
    "refunded_amount": "10.00",
    "net_amount": "0.00",
    "notes": "",
    "created_at": "2026-10-04T00:57:40.957947+03:00"
  },
  "metadata": {
    "timestamp": "2026-10-03T21:57:40.990534Z",
    "version": "1.0"
  }
}
```

</details>

---

## Reports (platform billing)

All under `/api/subscriptions/reports/`, read-only, scoped to the current company.

| Method | Path | Query | Returns |
|---|---|---|---|
| `GET` | `/api/subscriptions/reports/outstanding_invoices/` | — | Platform invoices in `issued`, `partially_paid` or `overdue`, with `days_overdue` |
| `GET` | `/api/subscriptions/reports/revenue_summary/` | `year` (required, e.g. `2026`) | Monthly revenue rows for the year (400 if `year` is invalid) |
| `GET` | `/api/subscriptions/reports/customer_balances/` | — | Outstanding balance per subscription |

<details><summary>Example: Outstanding invoices report → <code>200</code></summary>

```http
GET /api/subscriptions/reports/outstanding_invoices/
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "invoice_number": "INV-1-2026-000001",
      "company_name": "Acme Trading",
      "status": "issued",
      "due_date": "2026-11-02",
      "total": "34.20",
      "amount_paid": "0.00",
      "amount_due": "34.20",
      "days_overdue": 0
    }
  ],
  "metadata": {
    "timestamp": "2026-10-03T21:57:41.027048Z",
    "version": "1.0",
    "total_count": 1
  }
}
```

</details>

<details><summary>Example: Revenue summary report → <code>200</code></summary>

```http
GET /api/subscriptions/reports/revenue_summary/?year=2026
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "period": "2026-10",
      "total_invoiced": "34.20",
      "total_paid": "0.00",
      "total_outstanding": "34.20",
      "invoice_count": 2,
      "paid_count": 0
    }
  ],
  "metadata": {
    "timestamp": "2026-10-03T21:57:41.033364Z",
    "version": "1.0",
    "total_count": 1
  }
}
```

</details>

<details><summary>Example: Customer balances report → <code>200</code></summary>

```http
GET /api/subscriptions/reports/customer_balances/
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "subscription_id": 1,
      "company_name": "Acme Trading",
      "plan_name": "Professional",
      "total_outstanding": "34.20",
      "overdue_count": 0
    }
  ],
  "metadata": {
    "timestamp": "2026-10-03T21:57:41.041405Z",
    "version": "1.0",
    "total_count": 1
  }
}
```

</details>

---

## Analytics, reports & dashboards

Operational and financial reports over every module, plus ready-made dashboards per role. Everything is read-only and
computed on request from the company's own data.

**Access:** subscription module `inventory` (`403` otherwise). The finance reports (`cash_flow`, `financial_kpis`,
`margin_trend`) and the `finance` dashboard also need the `accounting` module (`403` otherwise); without it the
`overview` dashboard simply leaves out its cash and receivables KPIs.

**Amounts and ratios** are JSON numbers; percentages are 0–100 with 2 decimals and are `null` when there is nothing to
divide by. Dates are `YYYY-MM-DD`.

### Reports

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/reports/v1/types/` | Report types this company can run: `[{"report_type", "name", "module"}]` |
| `GET` | `/api/reports/v1/run/{report_type}/` | Run a report → `{"report_type", "columns", "rows", "summary"}`; `export=xlsx` downloads it as Excel |
| `GET` `POST` | `/api/reports/v1/saved/` | Saved report configurations (`name`, `report_type`, `parameters`) |
| `GET` `PUT` `PATCH` `DELETE` | `/api/reports/v1/saved/{id}/` | One saved report |
| `GET` | `/api/reports/v1/saved/{id}/run/` | Run a saved report; query params override its `parameters` |
| `GET` `POST` | `/api/reports/v1/schedules/` | Email a saved report on a schedule |
| `GET` `PUT` `PATCH` `DELETE` | `/api/reports/v1/schedules/{id}/` | One schedule |

**Query parameters** (each report takes the ones listed for it; others are ignored)

| Query param | Meaning |
|---|---|
| `start_date`, `end_date` | window; defaults to the last 30 days ending today (365 for `purchase_price_trend` and `margin_trend`, 90 for `financial_kpis`) |
| `as_of_date` | point-in-time reports; defaults to today |
| `period` | `day`, `week` or `month` (default) for trends |
| `limit` | keep only the first N rows |
| `warehouse` | warehouse id (inventory reports) |
| `inactive_days` | `customer_health`: days without an order before a customer counts as inactive (default 90) |
| `method`, `days_ahead`, `a_threshold`, `b_threshold` | inventory valuation, expiry and ABC options |

Bad dates, periods or numbers, or a warehouse from another company, answer `400` with `detail`.

**Report types**

| `report_type` | Rows | Parameters |
|---|---|---|
| `inventory_valuation`, `stock_aging`, `inventory_movement`, `abc_analysis`, `supplier_performance`, `warehouse_utilization`, `reorder_status`, `stock_turnover`, `expiry` | stock reports from the stock ledger | see parameters above |
| `sales_performance` | orders, revenue and average order value per period; summary compares with the previous window and gives the cancellation rate | `start_date`, `end_date`, `period` |
| `top_customers` | customers by booked order value with share and last order date | `start_date`, `end_date`, `limit` (default 10) |
| `product_sales` | units, net sales, estimated cost and gross margin per variant (cost = average cost of shipped stock, else standard cost) | `start_date`, `end_date`, `limit` |
| `order_pipeline` | open orders per status with value, average age and oldest order; summary counts orders past their required date | `as_of_date` |
| `delivery_performance` | on-time shipping and days to ship per warehouse; summary adds failed deliveries and transit days | `start_date`, `end_date` |
| `customer_health` | per customer: last order, 12-month orders and revenue, open/overdue receivables, credit use and `flags` (`inactive`, `overdue`, `near_credit_limit`, `over_credit_limit`) | `as_of_date`, `inactive_days` |
| `return_rate` | units sold vs. units customers asked to return, per product | `start_date`, `end_date`, `limit` |
| `return_reasons` | returns, value and refunds per reason; summary adds days to approve/close and restocking decisions | `start_date`, `end_date` |
| `quality_inspections` | inspections, pass rate and quantity pass rate per source (receipts, returns, production…) | `start_date`, `end_date` |
| `ncr_summary` | non-conformance reports per severity with days to close; summary lists the top suppliers | `start_date`, `end_date` |
| `quarantine_status` | stock currently in quarantine, days held and estimated value | `as_of_date` |
| `work_order_performance` | work orders per type: completed/open, yield, cycle days and unit cost | `start_date`, `end_date` |
| `component_shortages` | components open work orders still need vs. stock on hand in their warehouse | — |
| `purchase_spend` | committed purchase order value per supplier; summary has the spend trend and change vs. previous window | `start_date`, `end_date`, `period` |
| `purchase_price_trend` | first, last, lowest, highest and average unit cost per variant, with % change | `start_date`, `end_date`, `limit` |
| `open_purchase_orders` | purchase orders awaiting goods, with days overdue | `as_of_date` |
| `cash_flow` | direct-method cash flow: cash in/out of cash and bank accounts by operating, investing and financing category; summary has opening and closing cash | `start_date`, `end_date` |
| `financial_kpis` | `metric`/`value` rows: cash, receivables, payables, working capital, margins, DSO, DIO, DPO, cash conversion cycle | `start_date`, `end_date` |
| `margin_trend` | revenue, cost of sales, gross profit, expenses and net income per period | `start_date`, `end_date`, `period` |
| `webhook_health` | deliveries, success rate, attempts and last error per webhook endpoint | `start_date`, `end_date` |
| `user_activity` | changes per user from the sales audit trail | `start_date`, `end_date` |

### Dashboards

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/reports/v1/dashboards/` | Dashboards this company can open: `[{"dashboard", "title"}]` |
| `GET` | `/api/reports/v1/dashboards/{name}/` | One dashboard (`404` for an unknown name) |

`name` is one of `overview`, `sales`, `inventory`, `finance`, `operations`, `purchasing`, `administration`.
Query parameters: `start_date`, `end_date` (default: last 30 days) and `warehouse`.

**Response**

```json
{
  "dashboard": "overview",
  "title": "Overview",
  "start_date": "2026-09-10",
  "end_date": "2026-10-09",
  "kpis": [
    {"key": "revenue", "label": "Revenue", "value": 400.0, "unit": "currency", "previous": 200.0, "change_percent": 100.0},
    {"key": "open_orders", "label": "Open orders", "value": 3, "unit": "number"}
  ],
  "charts": {"sales_trend": [{"period": "2026-10-04", "orders": 1, "revenue": 300.0, "average_order_value": 300.0}]},
  "tables": {"reorder": []},
  "alerts": [{"level": "warning", "message": "Sales orders past their required date", "count": 1}]
}
```

`unit` is `currency`, `number`, `percent`, `days` or `ratio`. `previous` and `change_percent` appear on KPIs that compare
with the previous window of the same length. `charts` and `tables` hold report rows (see the report types above);
`alerts.level` is `warning` or `critical`.

| Dashboard | For | KPIs | Charts and tables |
|---|---|---|---|
| `overview` | owners, managers | revenue, orders, order value, gross margin, open orders, stock value, items to reorder, return rate, inspection pass rate, open NCRs, open POs (+ cash, overdue receivables, net income with `accounting`) | sales trend, order pipeline, top products and customers, reorder list |
| `sales` | sales managers | revenue, orders, order value, margin, cancellations, open orders, on-time shipping, days to ship, repeat and inactive customers | sales trend, pipeline, top products and customers, customers at risk |
| `inventory` | stock controllers | stock value, units, SKUs, turnover, items at safety stock / below reorder point, expiring and expired batches, open low-stock alerts | stock aging, movement, warehouses, reorder list, expiring batches, slow movers |
| `finance` | finance | revenue, gross profit and margin, net income and margin, cash, net cash flow, receivables (overdue), payables, DSO, DPO, cash conversion cycle | margin trend, cash flow, receivables and payables aging, top debtors and creditors |
| `operations` | returns, quality, production | returns, return rate, refunds, open returns, days to close, inspections, pass rate, open NCRs, quarantine value, work orders completed, yield, blocked work orders | return reasons, inspections by source, NCRs by severity, work orders by type, most returned, quarantine, component shortages |
| `purchasing` | buyers | spend, purchase orders, suppliers, open and overdue POs, price increases, items to reorder | spend trend, spend by supplier, overdue POs, price changes, supplier performance, reorder suggestions |
| `administration` | admins | active users, recorded changes, webhook endpoints, deliveries and success rate | activity by user, webhook health |

## Import & export

Available for: **company** `department`, `team`, `country`, `region`, `city`, `district`, `location`
(under `/api/company/v1/{resource}/import/` and `/export/`) and **inventory** `category`, `brand`, `product`,
`product-attribute`, `product-variant`, `warehouse`, `zone`, `bin`, `supplier`, `supplier-product`, `batch`,
`serial-number` (under `/api/inventory/v1/{resource}/import/` and `/export/`).

**Access** is the same as the resource's CRUD endpoints: `department` and `team` need `add_department`/`add_team` to
import and `view_department`/`view_team` to export (company admins pass); the location resources need the `location`
module and the inventory ones the `inventory` module. Otherwise `403`.

### Export — `GET /…/{resource}/export/`

Returns a **file download**, not JSON: `Content-Type: text/csv` with
`Content-Disposition: attachment; filename="export.csv"`. Columns are the same headers the matching import accepts;
an export with no rows still has the header row (usable as an import template).
Only the current company's rows are exported. You may add exact-match filters on the model's own fields as query
parameters (e.g. `?is_active=true`); relation lookups are ignored.

Open it with a normal authenticated `fetch`, then save the blob.
Query parameters: `format=csv|xlsx` (default `csv`) and `async=true`. With `async=true` the response is JSON with
the background task id; follow it in [`/api/common/v1/tasks/`](#background-task-list--get-apicommonv1tasks) and download
the file from the task's `download_url` (`/api/common/v1/download/export/{filename}/`).

<details><summary>Example: Export categories (CSV) → <code>200</code></summary>

```http
GET /api/inventory/v1/category/export/
```

Response:

```json
{
  "_non_json": "text/csv",
  "_disposition": "attachment; filename=\"export.csv\"",
  "_preview": "name,parent,description,is_active\nElectronics,,Phones & laptops,True\n"
}
```

</details>

### Import — `POST /…/{resource}/import/`

JSON body, the file as a **base64 data URI**:

| Field | Type | Required | Notes |
|---|---|---|---|
| `file` | string | **yes** | `data:text/csv;base64,<…>` for CSV; for Excel use `data:@file/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,<…>` (the standard `application/vnd…` MIME type is **not** recognised) |
| `dry_run` | boolean | no | validate and preview without saving |
| `async` | boolean | no | process in the background; poll the task list |
| `batch_size` | integer | no | default 100 |

`POST /…/{resource}/import/?template=true` (empty body) downloads an Excel template with the expected headers.
Only the required headers must be present in an uploaded file; optional columns can be left out. Headers may be the
field names (`name`) or the template labels (`Category Name`).
Columns that point at another record (a category's `parent`, a product's `category`/`brand`, a zone's `warehouse`…)
take that record's **name** (`name_en` for company data) or its **id** (what exports write); an unknown value is a row
error `"Could not find Category 'Nowhere'"`.

A row that matches an existing record (by its name, e.g. `name` + `parent` for categories) **updates** it and counts
in `stats.updated`, so an exported file can be edited and imported back. Only a row that would create a duplicate of
another record is an error (`"Violates unique constraint: …"`).

The response `data` has `success`, `dry_run`, `task_id`, `stats` (`new`, `updated`, `errors`, `skipped`, `warnings`),
and per-row `preview` / `errors`. A failed import returns **400** with the same structure inside `error.errors`
(`error_message`: `"Import failed with 2 errors"`). A request that can't be imported at all (no file, unreadable file,
missing required headers) returns **400** with the reason in `error.message`, e.g. `"Missing required headers: name"`,
`"Invalid file: the base64 data could not be decoded."` or `"The file could not be read as CSV."`.

<details><summary>Example: Import categories (dry run) → <code>200</code></summary>

```http
POST /api/inventory/v1/category/import/
```

Request body:

```json
{
  "file": "data:text/csv;base64,bmFtZSxkZXNjcmlwdGlvbixpc19hY3RpdmUKQWNjZXNzb3JpZXMsQ2FibGVzIGFuZCBjYXNlcyx0cnVlCg==",
  "dry_run": true
}
```

Response:

```json
{
  "success": true,
  "data": {
    "success": true,
    "dry_run": true,
    "task_id": "da1a8d52-1e3c-4a3e-a342-7daeecda3999",
    "stats": {
      "new": 0,
      "updated": 0,
      "errors": 1,
      "skipped": 0,
      "warnings": 0
    },
    "preview": [
      {
        "row": 1,
        "status": "errors",
        "data": {
          "name": "Accessories",
          "description": "Cables and cases",
          "is_active": "True"
        },
        "instance": null,
        "error": "BaseCompanySerializer.validate_name() missing 1 required positional argument: 'field_name'",
        "warning": null
      }
    ],
    "warnings": []
  },
  "metadata": {
    "timestamp": "2026-10-03T21:57:41.069377Z",
    "version": "1.0"
  }
}
```

</details>

### Background task list — `GET /api/common/v1/tasks/`

Import/export jobs for the company (newest first). Optional `?type=import|export`.

<details><summary>Example: Import/export task list → <code>200</code></summary>

```http
GET /api/common/v1/tasks/
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "task_id": "d60a93ce-9537-4ba6-aac8-f9ac59eb93f8",
      "task_type": "import",
      "resource": "inventory.models.product.Category",
      "file_format": "json",
      "filename": "upload.csv",
      "status": "failed",
      "created_at": "2026-10-04T00:57:41.077485+03:00",
      "completed_at": "2026-10-04T00:57:41.085009+03:00",
      "fields": {
        "required_headers": [
          "name"
        ],
        "optional_headers": [
          "parent"
        ],
        "custom_headers": {
          "name": "Category Name",
          "parent": "Parent Category Name",
          "description": "Description",
          "is_active": "Is Active (true/false)"
        },
        "dry_run": false,
        "async": false
      },
      "total_rows": 1,
      "success_rows": null,
      "error_rows": {
        "import_error": "Import failed with 1 errors"
      },
      "download_url": null,
      "duration": 0.007524,
      "created_by_name": "Sara Ali"
    }
  ],
  … (truncated)
```

</details>

Async export files are downloaded from `GET /api/common/v1/api/download/export/{filename}/`.

---

## Notifications & background tasks

| Method | Path | Body | Returns |
|---|---|---|---|
| `GET` | `/api/notifications/my-notifications/` | — | the user's recent notifications (`id`, `title`, `message`, `notif_type`, `is_read`, `created_at`, `data`) |
| `GET` | `/api/notifications/unread-count/` | — | `{"unread_count": 3}` |
| `POST` | `/api/notifications/mark-read/{notification_id}/` | — | `{"status": "success"}` or 404 |

<details><summary>Example: My notifications → <code>200</code></summary>

```http
GET /api/notifications/my-notifications/
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Low stock",
      "message": "SKU-1 below reorder point",
      "notif_type": "info",
      "is_read": false,
      "created_at": "2026-10-04T00:57:33.448148+03:00",
      "data": {}
    }
  ],
  "metadata": {
    "timestamp": "2026-10-03T21:57:41.045298Z",
    "version": "1.0",
    "total_count": 1
  }
}
```

</details>

<details><summary>Example: Unread count → <code>200</code></summary>

```http
GET /api/notifications/unread-count/
```

Response:

```json
{
  "success": true,
  "data": {
    "unread_count": 1
  },
  "metadata": {
    "timestamp": "2026-10-03T21:57:41.047738Z",
    "version": "1.0"
  }
}
```

</details>

<details><summary>Example: Mark notification read → <code>200</code></summary>

```http
POST /api/notifications/mark-read/1/
```

Response:

```json
{
  "success": true,
  "data": {
    "status": "success"
  },
  "metadata": {
    "timestamp": "2026-10-03T21:57:41.050632Z",
    "version": "1.0"
  }
}
```

</details>

### Real-time notifications (WebSocket)

```
ws(s)://<host>/ws/notifications/{user_id}/
```

- Authenticate with the access token as a query parameter — `new WebSocket(`${url}?token=${access}`)` — or, outside
  browsers, an `Authorization: Bearer <access>` header on the handshake (the header wins when both are sent).
- `{user_id}` must be the logged-in user's id (from the token), otherwise the socket is closed with code `4003`;
  no/invalid token closes with `4001`.
- On connect the server sends:
  `{"type": "connection_established", "message": "…", "unread_notification": 0}`
- New notifications arrive as `{"type": "new_notification", "notification": {…}}`
  (company-wide ones as `{"type": "broadcast_notification", …}`). `notification` has exactly the fields of the HTTP
  notification object: `id`, `title`, `message`, `notif_type`, `is_read`, `created_at`, `data`.
- Keep-alive: send `{"action": "ping"}` → receive `{"type": "pong"}`.

---

## Known issues

Open backend issues the frontend should know about. Issues are removed from this list as they are fixed.

| # | Where | Note |
|---|---|---|
| 1 | Inventory create/update forms | `created_by`, `updated_by`, `is_deleted`, `deleted_at` are accepted from the client; customers accept `credit_used`. Never send them. |
