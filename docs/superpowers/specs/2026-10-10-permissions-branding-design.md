# Permissions & branding (follows backend 43d7e69)

## Why

Backend commit 43d7e69 ("Enforce codename permissions on every API; core groups; branding and profile APIs")
changed the contract the frontend relies on:

- Every company API (company, locations, inventory, sales, returns, quality, assembly, accounting, reports,
  integrations) now needs the module's feature permission `access_<module>` **and** the CRUD codename
  (`view_/add_/change_/delete_<resource>`; a POST action on one record needs `change_`).
- Each company gets read-only core permission groups (Full Access, Read Only, Full/Read Only per module).
- Permission groups take `permissions: [ids]`; roles take single `permissions` next to `permission_groups`
  (now optional). Catalog permissions and core groups answer 403 to PATCH/DELETE; `is_core` is read-only.
- `GET /me/` returns the user's `profile_picture` and the company's `logo`, `primary_color`, `secondary_color`.
- New: `PATCH /me/profile/`, `POST /me/change-password/`, `GET/PATCH /company-profile/`.

## What changed in the frontend

| Area | Change |
|---|---|
| Access | `core/auth/permission-catalog.ts` mirrors the backend catalog. `AccessService.can(codename)` also requires `access_<module>` for catalog codenames. `current()` exposes the /me payload; `update()` merges a saved change. |
| Menu & routes | Groups need `access_<module>`, children their `view_` codename; module parent routes run `permissionGuard` with `access_<module>`. Dashboard location cards need `view_location` / `add_location`. |
| Roles | Permission groups optional; single permissions picked in the permission matrix; list shows "+ N permissions". |
| Permission groups | `is_core` toggle replaced by the permission matrix. Core groups: "System" badge, view-only form, no delete. |
| Permissions | Catalog permissions: "System" badge, no edit/delete. The form's group picker hides core groups. |
| Permission matrix | `permission-picker` form control: per module, the access switch and a resource × view/add/change/delete grid; modules with a selection start open; company codenames under "Other". |
| Profile | `/profile` (header menu, every signed-in user): picture (multipart), names, phone, timezone; change password with confirmation. |
| Company profile | `/company/profile` (`view_company`; read-only without `change_company`): logo, primary/secondary colors with a live preview. |
| Branding | Header avatar uses the profile picture; sidebar brand shows the company logo and name. |

## Not done / follow-ups

- Brand colors are saved and previewed but not applied to the app theme (Tailwind's `primary` palette is static;
  applying them needs CSS variables for the palette).
- No GET for the profile: loaded with an empty PATCH (BACKEND_REQUESTS.md item 29).
- The stock-levels screen also reads `reports/v1/run/…`, which needs `access_reports` + `view_report`; its menu
  entry only checks `view_stockreservation`.

## Verification results

| Check | Result |
|---|---|
| `ng build` | Clean, no warnings |
| `ng test` | 421 / 421 pass (new: catalog rule in AccessService, nav access_ gating, role matrix save, core group read-only, profile page, company profile) |
| Browser walk against the API | Pending: the seeded test login isn't in the current local DB |
