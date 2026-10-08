# Backend session prompt

Paste the block below as the first message of a new session on the backend repo (`0Mustafa37/Tanzim`).
It lists what the frontend still needs from the backend. Remove items as they ship.

History: the first round (current-user endpoint, enforced permissions, `is_staff`, company and location fixes,
product variants, workflow actions, import, WebSocket token, export parameters, the password-hash leak) shipped on
2026-10-08 and was verified from the frontend on 2026-10-09. Everything below was still open on that date.

```text
You are working on the backend of Tanzim, a bilingual (English/Arabic) multi-tenant ERP.

- Backend (this repo): 0Mustafa37/Tanzim — Django + DRF, SQLite + Redis locally, pytest. Follow CLAUDE.md.
- Frontend: mohamed-elhelely/tanzim-frontend (Angular 21). It consumes the API exactly as documented in docs/API_REFERENCE.md.
- Responses are wrapped by sales.renderers.StandardizedJSONRenderer: { success, data, metadata, error: { code, message, errors } }.
  Field validation errors must come back as 400 with errors keyed by field name.

## Rules
- One logical change per commit, each with a pytest test that fails before and passes after.
- Keep docs/API_REFERENCE.md (and its "Known issues") in sync with every change.
- Additive response changes are fine; don't remove or rename fields the frontend reads.
- New branch, PR to master when done. Never include model names in commits or PRs.
- Reply to the owner in Egyptian Arabic; keep code, commits and PR text in English.

## Running locally
python -m venv venv && venv/bin/pip install -r requirements.txt
SECRET_KEY=dev DEBUG=True python manage.py migrate && python manage.py setup_plans && python manage.py seed_permissions && python setup_data.py
redis-server --daemonize yes && SECRET_KEY=dev DEBUG=True python manage.py runserver 8000
Company admin: admin@testcompany.com / testpass123.

## Open items (in priority order)

0. SECURITY — platform invoices: /api/subscriptions/invoices/ (InvoiceViewSet, billing/apis.py) only checks
   IsAuthenticated, so ANY company user — verified with an employee who has no permissions — can create_draft,
   add_item, issue, add_payment and mark_paid their own company's invoices (e.g. mark an unpaid invoice "paid").
   Company users must only read; every write action must require platform staff.
   Related: platform staff can't use these endpoints at all (CompanyContextMixin answers 403 "No company associated
   with user"), so nobody can manage invoices through the API. Let staff act on any company's invoices (choose the
   company from the subscription).

1. Every DELETE answers "204 No Content" WITH a 99-byte JSON body (the renderer wraps the empty response).
   A 204 must not have a body. The Angular dev-server proxy rejects it ("Parse Error: Expected HTTP/") and turns
   it into a 500, so every delete looks failed in local development although it succeeded.
   Fix: skip the envelope (empty body) for 204, or answer 200 with the envelope.
   Reproduce: curl -i -X DELETE localhost:8000/api/inventory/v1/brand/{id}/ -H "Authorization: Bearer …" → Content-Length: 99.

2. Inventory read serializers return only a few fields, so edit screens can't show what is saved:
   WarehouseReadSerializer (no code, email, phone, address fields), ZoneReadSerializer (no code, description),
   BinReadSerializer (no code, barcode, max_capacity, bin_type), SupplierReadSerializer (no tax_id, contact_person,
   email, phone, mobile, website, address fields, payment_terms, currency, reliability_score, notes).
   SupplierProductReadSerializer (returns only supplier, product_variant, is_preferred: no unit_cost, currency,
   quantities, lead time, dates, supplier_sku/name, is_primary, notes), ProductVariantReadSerializer (no weight_uom).
   Return every model field (keep the nested objects as they are). The frontend currently shows those fields empty
   and only sends them when the user changes them (shared/utils/omit-pristine.ts).

3. POST/PATCH /api/inventory/v1/warehouse/ with `manager` returns 500 ("Cannot resolve keyword 'company_id'"):
   WarehouseSerializer.manager is a CompanyRelatedField over User, which has no company. Restrict managers to users
   of the current company through CompanyUser. The frontend hides the manager field until then.

4. Warehouse.code and ProductVariant.sku still have `unique=True` (besides unique_together company + code/sku), so a
   company can't use a code or SKU another company has, and the 400 message reveals that it exists elsewhere.
   Drop `unique=True` on both (migration) and make ProductVariantSerializer.validate_sku check only the current company.

5. PATCH /api/inventory/v1/category/{id}/ that re-sends the unchanged name and parent returns 400 "Category with this
   name already exists under this parent.": CategorySerializer.validate doesn't exclude self.instance (and should use
   the instance's name/parent when a partial update omits them). The frontend omits unchanged name/parent for now.

6. Soft-deleting a brand or category that is still used returns 204: products keep pointing at the deleted brand or
   category, and child categories at a deleted parent. Return 400 "Cannot delete: still used by …" like the location
   endpoints now do.

7. Nothing stops a category from becoming its own ancestor (parent cycles). Validate on create/update.

8. GET /api/inventory/v1/supplier-product/?supplier=<id> ignores the filter. Support `supplier` and `product_variant`
   as exact-match filters (the variant list already supports `?product=`).

9. The notifications WebSocket sends `type` and `timestamp` (notifications/services.py → _push) where the HTTP API
   says `notif_type` and `created_at`. Send the same field names as the HTTP API (the frontend accepts both).

10. Accounting: the new /api/accounting/v1/ endpoints are described in docs/BUSINESS_LOGIC.md but not in
   docs/API_REFERENCE.md. Document them there (paths, bodies, response objects, examples) so the frontend can build
   the accounting screens.
```
