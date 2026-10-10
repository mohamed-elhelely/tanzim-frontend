# Backend session prompt

Paste the block below as the first message of a new session on the backend repo (`0Mustafa37/Tanzim`).
It lists what the frontend still needs from the backend. Remove items as they ship.

History: the first round (current-user endpoint, enforced permissions, `is_staff`, company and location fixes,
product variants, workflow actions, import, WebSocket token, export parameters, the password-hash leak) shipped on
2026-10-08 and was verified from the frontend on 2026-10-09. The second round (items 0–23, backend master c6509d9)
was verified against the running API on 2026-10-09; see "Fixed" below. Items 24–29 and 31 are open; item 30 shipped on 2026-10-10 (backend a9bccfe).

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

24. Nothing in sales/ ever sets a SalesInvoice to `overdue`: the status exists (SalesInvoice.Status.OVERDUE) and the
   payment and report code reads it, but only billing has an overdue task (for platform invoices). An issued invoice
   past its `due_date` stays `issued` forever, so the frontend's Overdue filter and badge never show anything.
   Add a periodic task (like billing's) that moves issued, unpaid invoices past their due date to `overdue`, and
   back to `issued`/`paid` as payments come in.

25. Two small leftovers from round two:
   - the category export writes the parent as a float id ("1.0") rather than the name the import now accepts;
     write the parent's name (or a plain integer id);
   - the customer-return action responses (approve, reject, receive, inspect, close) don't include
     `sales_order_number`, which the retrieve response has. Use the same serializer. The frontend keeps the number
     it loaded.

26. Stock screens need filters and a stock-level endpoint:
   - GET /api/inventory/v1/stock-ledger/ only supports search (reference_type, reference_id) and ordering. Add
     exact-match filters `product_variant`, `warehouse`, `transaction_type` and a `created_at` range
     (`date_from`, `date_to`), so a variant's or a warehouse's movements can be listed.
   - GET /api/inventory/v1/stock-reservation/ can't be filtered either; add `is_released`, `product_variant`,
     `warehouse`. The stock-levels screen reads every reservation to sum the open ones.
   - There is no current-stock endpoint: the frontend uses reports/v1/run/inventory_valuation/ for on hand (per
     variant, optionally one warehouse) and computes reserved/available itself. A stock-level list with
     on hand, reserved and available per variant × warehouse (paged, searchable, with the same filters) would
     replace both.

27. Analytics (reports/v1, PR #21) is English-only where the screen can't translate it:
   - dashboard `alerts[].message` has no key: add a `code` (e.g. `orders_past_required_date`) and keep `count`, so the
     frontend can show it in Arabic;
   - KPI `label` and category `label`s (order pipeline, inspections by source, NCR severity) are English; the KPI
     `key` is enough for KPIs (the frontend translates by key), but categories need their code in every row (the
     pipeline has `status`, the others should have theirs, e.g. `source_type`, `severity`, already there for some);
   - `customer_health` rows send `flags` as comma-separated text ("inactive,overdue"), while the reference documents a
     list. Send a list (the frontend accepts both).

28. Opening stock: there is no proper way to load it. A stock adjustment with a positive difference credits 5200
   Inventory Adjustments (a cost-of-sales account), so loading 2 × 2,000 of opening stock through an adjustment made
   cost of sales −3,960 and the gross margin 1,860 % on the finance dashboard and the income statement. Either add an
   opening-stock path (e.g. reason `initial`, posting against an opening-balance equity account) or tell us how
   opening stock is meant to be entered.

29. `/api/company/v1/me/profile/` only answers PATCH, and `GET /me/` returns just first/last name and the picture, so
   the profile screen can't show the middle name, preferred name, phone or timezone it is about to edit. The frontend
   loads them with an empty `PATCH {}` (which saves nothing and answers with every field). Add `GET` to
   `MeProfileAPIView` returning the same fields.


31. Docs only: API_REFERENCE says `POST /api/subscriptions/v1/invoices/{id}/add_payment/` returns the invoice, but
   it returns the new payment (`PaymentSerializer`, 201). `mark_paid` and the other invoice actions do return the
   invoice. Fix the reference (or return the invoice, which would match the other actions); the frontend reloads
   the invoice after a payment, so either works.

```

## Fixed (verified against the API on 2026-10-09, backend master 0a78259)

| Item | What was fixed | Verified with |
|---|---|---|
| 30 | Billing: subscription writes staff-only; staff see every company's subscriptions, subscription modules and reports (`?company=`, `?status=`); `company_name` on subscriptions; plan `included_module_ids` / `addon_module_ids`. All under `/api/subscriptions/v1/` | Backend commit a9bccfe and its tests (not yet walked from the UI) |
| 0 | Platform invoice/payment writes need platform staff; staff can manage any company's invoices | Employee and company admin → 403; staff create_draft → add_item → issue |
| 1 | 204 responses have no body | DELETE brand → 204, Content-Length 0 |
| 2 | Inventory read serializers return every field (warehouse … variant, and all stock, movement and procurement documents) | Retrieve/list of each; serializer field check for the 18 stock/procurement serializers |
| 3 | Warehouse `manager` from the current company | PATCH manager → 200; another company's user → 400 |
| 4 | Warehouse code and variant SKU unique per company | Model has no `unique=True`; SKU check scoped |
| 5 | Category update keeps its own name/parent | PATCH unchanged name + parent → 200 |
| 6 | Used brands/categories can't be deleted | 400 "Cannot delete: still used by …" |
| 7 | Category parent cycles refused | parent = self / child → 400 |
| 8 | `supplier` / `product_variant` filters; supplier invoices `?supplier=&open=true`, `open_balance` in the dropdown | Filtered lists; open balance after a payment |
| 9 | WebSocket notifications use the HTTP field names | `notification_payload` = NotificationSerializer |
| 10 | Accounting documented | docs/API_REFERENCE.md → Accounting |
| 11 | Plain workflow error messages | "Order exceeds customer credit limit" |
| 12 | Orders editable/deletable only as drafts | PATCH/DELETE confirmed order → 400 |
| 13 | Customers with open orders can't be deleted | 400 "the customer has 1 open order" |
| 14 | An order/delivery note is invoiced once | Second create_from_order → 400 |
| 15 | Invoices carry shipping and discount | Order 245.00 = invoice 245.00 |
| 16 | `amount_due` is a decimal string | Detail and list |
| 17 | Return quantities capped by shipped minus earlier returns | 100 of 2 → 400; 2 after 1 requested → 400 |
| 18 | Return actions answer with the updated lines | receive → `quantity_received: 1.000` |
| 19 | Supplier return `refund_amount` set; `close` action; `po_number` | approve → 80.00; close with 75 → closed |
| 20 | Customer return reject, `notes` returned, PATCH with lines | reject → rejected; notes; PATCH lines → 200 |
| 21 | Returned line value includes discount and tax | 100 + 10 % tax → 110.00 |
| 22 | Company import/export check CRUD permissions | Employee → 403 on department import and export |
| 23 | Import usability (optional headers, message, parent by name, re-import updates, bad file 400, header-only export) | Each case by request; see item 25 for the export's parent column |
