# Step 9 — Access control from /me (design)

Date: 2026-10-09
Status: built and verified against the local backend (backend added `GET /api/company/v1/me/` and enforces role
permissions on the company endpoints)

## Goal

Each user sees only the screens and buttons they can use, and the frontend gets that from one call instead of
guessing from the login role.

## Decisions taken

| Topic | Decision |
|---|---|
| Source | `AccessService` (`core/auth`) loads `GET /api/company/v1/me/` once per sign-in: `permissions`, `has_full_access`, `modules`, `is_staff`. It replaces `SubscriptionService` (the modules come from /me now). |
| Loading | `can()` / `hasModule()` are false while loading and true if /me fails (fail open; the backend still answers 403). Guards call `load()` themselves because child routes are checked before the shell is created; one request is shared. It resets when the signed-in user changes. |
| Platform staff | `isStaff` from /me, falling back to the token. A user with `role: ADMIN` (no company) who isn't staff sees only the dashboard welcome. |
| Menu | `NavItem.permission` (`view_*` on the six company screens) and `staffOnly` (Companies); a group with no visible children disappears. |
| Routes | `permissionGuard` reads `data.permission`: `view_*` for lists, `add_*` for new, `change_*` for edit. Denied → dashboard. Replaces `companyAdminGuard`. |
| Buttons | The six company lists show New / edit / delete by `add_*` / `change_*` / `delete_*`; the actions column disappears when neither edit nor delete is allowed. |
| Dashboard | Cards, setup steps and quick actions each have a permission or module gate; counts are requested after /me, only for visible cards. |
| Pickers | `CompanyUserService.userOptions()` uses `?dropdown=true`, which the backend allows without `view_companyuser` (the team and department forms need it). |
| Scope | Only the company resources have permission codenames in the backend; locations and inventory stay gated by module. |

## Verification results (2026-10-09, against the local backend)

| User | Result |
|---|---|
| Employee with role "Clerk" (`view_team`, `add_team`, `view_department`) | Menu: Departments and Teams under Company. Teams list has New, no edit/delete; Departments list read-only. `/company/roles`, `/company/users`, `/company/departments/new`, `/admin/companies` → dashboard; `/company/teams/new` opens (leads picker loads via dropdown). Dashboard: departments, teams, locations; quick actions "Create a team", "Add a location". No 4xx. |
| Company admin (`has_full_access`) | Everything as before. No 4xx. |
| Platform staff | Dashboard + Companies; `/company/users` → `/admin/companies`. No 4xx. |
