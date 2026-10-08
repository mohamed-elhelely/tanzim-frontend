# Backend session prompt

Paste the block below as the first message of a new session on the backend repo (`0Mustafa37/Tanzim`).
It lists what the frontend needs from the backend, in priority order. Tick items off (or delete them) as they ship.

```text
You are working on the backend of Tanzim, a bilingual (English/Arabic) multi-tenant ERP.

- Backend (this repo): 0Mustafa37/Tanzim — Django + DRF, SQLite + Redis locally, pytest. Follow CLAUDE.md.
- Frontend: mohamed-elhelely/tanzim-frontend (Angular 21). It consumes the API exactly as documented in docs/API_REFERENCE.md.
- Responses are wrapped by sales.renderers.StandardizedJSONRenderer: { success, data, metadata, error: { code, message, errors } }.
  Field validation errors must come back as 400 with errors keyed by field name, so the frontend can show them under the right input.

## Rules
- One logical change per commit, each with a test (pytest) that fails before and passes after.
- Keep docs/API_REFERENCE.md (and its "Known issues" section) in sync with every change: remove an issue when it is fixed, document any new field or endpoint.
- Don't change existing response shapes without saying so; the frontend depends on them. Additive changes are fine.
- Work on a new branch and open a PR to master when a group of items is done. Never include model names in commits or PRs.
- Ask the owner before anything destructive or ambiguous (e.g. item 6).
- Reply to the owner in Egyptian Arabic; keep code, commits and PR text in English.

## Running locally
python -m venv venv && venv/bin/pip install -r requirements.txt
SECRET_KEY=dev DEBUG=True python manage.py migrate && python manage.py setup_plans && python setup_data.py
redis-server --daemonize yes && SECRET_KEY=dev DEBUG=True python manage.py runserver 8000
Company admin login: admin@testcompany.com / testpass123. For platform-staff checks, create a user with
is_staff=True and no CompanyUser in `manage.py shell`. With no EMAIL_HOST_PASSWORD, emails go to the console.

## Priority 0 — security, fix first

0. POST /api/company/v1/company-user/ returns the new user's password hash (data.user.password = "pbkdf2_sha256$…").
   company/serializers/user.py → UserWriteSerializer lists "password" without write_only. Make it
   extra_kwargs = {"password": {"write_only": True}} and add a test that no response (create/update/retrieve/list) contains it.

## Priority 1 — needed for the frontend's next step (hide menus/buttons by permissions)

1. Current-user endpoint, e.g. GET /api/company/v1/me/ (or /api/me/). Return at least:
   user (id, email, first_name, last_name), is_staff, company (id, name) or null, role (id, name_en, name_ar, is_admin) or null,
   is_company_admin, is_department_manager, is_team_lead, and `permissions`: the flat, de-duplicated list of permission
   codenames the user gets through role → permission_groups → permissions (all permissions if is_company_admin / role.is_admin).
   Also return the company's active subscription module codes (`modules`: ["inventory", "location", …]) so one call drives the menu.
2. Enforce those permissions on the server. Today the company endpoints (departments, teams, roles, permission groups,
   permissions — common/views.py and company/apis/*.py) only check IsAuthenticated, so any employee can create/edit/delete
   them through the API. Add a permission class that maps the view + HTTP method to a codename (view/add/change/delete) and
   checks it against the same rules as item 1. Company admins keep full access. Document the codenames in API_REFERENCE.md.
3. Put is_staff in the login response and the JWT payload (users/apis.py → LoginAPIView). Today role "ADMIN" only means
   "has no CompanyUser"; the admin/company/ endpoints check is_staff (IsAdminUser), so a non-staff user without a company
   sees a Companies menu that returns 403.

## Priority 2 — found while building the platform-staff Companies screen (company/apis/company.py, company/serializers/company.py)

4. POST /api/company/v1/admin/company/ is not atomic. With a blank email (ValueError "Users must have an email address")
   or an email that already belongs to a user (IntegrityError on users_user.email) it returns 500 AND the company row stays
   created without an admin. Wrap create in transaction.atomic, make email required on create, and validate that no user has
   that email yet → 400 { email: [...] }. Send the credentials email only after the transaction commits (transaction.on_commit).
5. Company phone: PhoneNumberField(required=False) rejects "" ("This field may not be blank."), so a saved phone can't be cleared.
   Allow blank (and treat "" as empty). The frontend currently omits phone when empty.
6. DELETE /api/company/v1/admin/company/{id}/ is a hard delete and every company-owned model cascades (common/models.py
   on_delete=CASCADE), while API_REFERENCE.md says "soft delete". ASK THE OWNER which one is intended; either make it a real
   soft delete (or deactivate) or fix the docs. The frontend has no delete button until this is settled.
7. Confirm/document how to upload the company logo (multipart PATCH with `logo`) and that logo_url comes back absolute.
8. Optional: add search_fields (name, legal_name, domain, email) and ordering to the companies list.

## Priority 3 — still open from the Company & Locations screens

9. Soft-deleting a country/region/city/district that is still referenced (by a region/city/district/location) returns 204.
   Return 400 with a clear message while it is in use.
10. Re-using the name of a soft-deleted record returns 500: unique_together (company/models.py, e.g. ("country", "name_en"))
    ignores is_deleted. Use a UniqueConstraint with condition=Q(is_deleted=False) (plus a migration), or validate in the
    serializer and return 400.
11. Location `full_address` is never returned: company/serializers/location.py uses source="get_full_address" but the model
    has a `full_address` property (company/models.py).
12. PATCH /api/company/v1/company-user/{id}/ with a nested `user` re-validates the unchanged email and returns 400
    ("User with this Email Address already exists."). Support nested update of the user's name/email/phone, excluding the
    instance's own user from the uniqueness check.
13. GET /api/company/v1/permissions/?search= returns 500: the shared view (common/views.py) searches name_en/name_ar, which
    Permission doesn't have. Give the permissions view its own search_fields (name, codename).
14. PATCH /api/company/v1/location/{id}/ returns 500 unless both country and region are sent (validator reads data["region"]).
    Fall back to the instance's values on partial updates.
15. POST /api/company/v1/city/ accepts only timezone UTC or GMT although the model default is Asia/Riyadh. Accept IANA names.

## Priority 4 — blocks the Inventory screens (see "Known issues" #1–#3 in docs/API_REFERENCE.md)

16. Workflow actions return 405: POST /api/inventory/v1/{stock-transfer, stock-adjustment, cycle-count, purchase-requisition,
    purchase-order, supplier-invoice}/{id}/action/ and POST /api/inventory/v1/approval-request/{id}/process/. Route them to
    the existing approve/ship/post/… methods, and filter the lookups by company.
17. No CRUD API for ProductVariant, while stock, batches, serials, PO lines and transfers all require product_variant.
    Add list/create/retrieve/update/delete under /api/inventory/v1/product-variant/ (company-scoped, with dropdown=true).
18. Import fails on every row: validate_name() missing 1 required positional argument: 'field_name'
    (confirmed on POST /api/inventory/v1/category/import/).

## Priority 5 — later

- Subscriptions: FeatureFlag.is_enabled (billing/feature_flags.py) picks company.subscriptions.first() while
  GET subscriptions/current/ picks latest("created_at"). With more than one subscription they can disagree, and the menu
  (built from current/) won't match the 403s. Use the same lookup in both.

19. WebSocket auth only reads the Authorization header, which browsers can't set on new WebSocket(). Also accept ?token=.
20. Export reads `format`/`async` from the GET body; read them from query params so browsers can request xlsx/async.

Start by reading docs/API_REFERENCE.md and the files named above, then confirm the plan for Priority 1 with the owner
(endpoint path and the codename scheme) before writing code. Then work down the list.
```
