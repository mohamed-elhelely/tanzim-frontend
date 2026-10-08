# Step 6 — Platform-staff Companies (design)

Date: 2026-10-08
Status: built and verified against the local backend; the owner asked to go straight to this step

## Goal

Give platform staff a screen to list, create and edit the tenant companies, in English and Arabic
(LTR/RTL), on desktop and mobile.

Source of truth: backend repo `0Mustafa37/Tanzim`, `docs/API_REFERENCE.md` → "Companies (platform admin)",
and the code that disagrees with it in places: `company/apis/company.py`, `company/serializers/company.py`.

## Decisions taken

| Topic | Decision |
|---|---|
| Who sees it | Login role `ADMIN` (a user with no company). `NavItem` gets an optional `roles` list; the nav list hides items whose roles don't include the current one. The `/admin` routes use `platformAdminGuard`, which sends everyone else to the dashboard. The backend itself checks `is_staff` (`IsAdminUser`); a non-staff user without a company gets the forbidden state. |
| Route | `/admin/companies`, `…/new`, `…/:id/edit` (`features/admin/admin.routes.ts`, lazy). Top-level sidebar item "Companies" under Dashboard. |
| Listing | The endpoint returns the full list and has no `search`/`ordering`, so the table filters, sorts and pages in the browser (same as Company users). |
| Delete | **No delete action.** The docs say soft delete, but the view hard-deletes the company, and every company-owned model has `on_delete=CASCADE`. Deactivate the company from the form instead. |
| Contact email | Required on create only: the backend creates the company's first admin user with this email and emails them a random password. Optional on edit. |
| Phone | Left out of the body when empty: the backend rejects `""` with 400 and has no way to clear a saved phone. Client check: `+` then 8–15 digits (the backend accepts international numbers only). |
| Time zone | Searchable select of the browser's IANA zones (`Intl.supportedValuesOf('timeZone')`) plus `UTC`. A saved zone the browser doesn't know is kept in the options. |
| Colors | Native `<input type="color">` with the hex value next to it. The backend requires the two colors to differ; that error shows under the secondary color. |
| Logo | Out of scope (multipart upload). |

## Fields

| Field | Form rule |
|---|---|
| `name` | required, max 255 |
| `legal_name` | max 255 |
| `domain` | required, the backend's domain regex (case-insensitive), lower-cased on save |
| `tax_id` | letters, digits and hyphens |
| `email` | email, max 254, required on create |
| `phone` | `+` then 8–15 digits, omitted when empty |
| `address` | free text |
| `timezone` | required, default `Asia/Riyadh` |
| `primary_color`, `secondary_color` | hex, defaults `#4f46e5` / `#ffffff` |
| `is_active` | toggle, default on |

## Out of scope

- Logo upload.
- Hiding the Company/Locations menus from platform staff (they have no company, so those screens return 403). That is part of the "hide menus by role/permissions" step.
- Company settings, subscriptions and platform invoices.

## Verification results (2026-10-08, against the local backend)

Checked with real requests as a platform staff user (`is_staff`, no company) and as the seeded company admin.

| Check | Result | What the frontend does |
|---|---|---|
| List as staff | 200, full list, no paging | Client-side table. |
| List as company admin | 403 | Menu item hidden, route redirects to the dashboard. |
| Create with `phone: ""` | **400** `phone: This field may not be blank.` | Omits `phone` when empty. |
| Create with a local number (`0501234567`) | 400 `Enter a valid phone number.` | Client pattern asks for international format. |
| Create with an email that already belongs to a user | **500**, and the company **is still created** without an admin (not atomic) | Nothing to do client-side; raise on the backend. |
| Create with a blank email | **500** (`Users must have an email address`), company still created | Email required on create. |
| Same primary and secondary color | 400 under `secondary_color` | Shown under the field. |
| Duplicate domain on edit | 400 under `domain` | Shown under the field. |

Backend issues to raise: company create is not atomic and returns 500 for a blank or already-used admin email;
a blank phone can't be saved or cleared; DELETE is a cascading hard delete although the docs say soft delete.

Browser walk (staff): list, search, create (domain lower-cased, success toast names the admin email), edit with a
server error under the field, deactivate; English, Arabic (RTL), dark mode and 390 px mobile. Company admin: no
Companies item, `/admin/companies` redirects to `/dashboard`. No console errors from these screens (the dashboard's
existing count requests return 403 for platform staff).
