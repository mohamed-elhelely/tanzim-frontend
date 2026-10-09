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

   **Blocks the stock, movement and procurement screens:** the same problem is worse there, the read serializers
   drop the document number, quantities and dates, so a list has nothing to show:
   - BatchRead: batch_number, location, manufacturing_date, expiry_date, received_date, initial_quantity,
     remaining_quantity, notes
   - SerialNumberRead: serial_number, bin, received_at, sold_at, last_movement
   - StockLedgerRead: quantity, unit_cost, total_cost, reference_type, reference_id, notes, metadata
   - StockSnapshotRead: snapshot_date, quantity_on_hand, quantity_reserved, quantity_available, average_cost
   - StockReservationRead: quantity, reference_type, reference_id, reserved_at, expires_at, released_at
   - StockTransferRead: transfer_number, requested_date, expected_delivery_date, shipped_date, received_date,
     carrier, tracking_number, current_approval_stage, notes; StockTransferLineRead: quantity_requested,
     quantity_shipped, quantity_received, notes
   - StockAdjustmentRead: adjustment_number, adjustment_date, notes; StockAdjustmentLineRead: current_quantity,
     new_quantity, difference, unit_cost, total_cost, notes
   - CycleCountRead: count_number, scheduled_date, notes; CycleCountLineRead: system_quantity, counted_quantity,
     variance, notes
   - PurchaseRequisitionRead: requisition_number, date_requested, required_date, estimated_total, currency,
     current_approval_stage, custom_fields, notes; PurchaseRequisitionLineRead: quantity, estimated_unit_cost,
     estimated_total, notes
   - PurchaseOrderRead: po_number, order_date, expected_date, currency, payment_terms, shipping_method, terms,
     supplier_reference, subtotal, tax_amount, total_amount, version, current_approval_stage, custom_fields, notes;
     PurchaseOrderLineRead: quantity_ordered, quantity_received, unit_cost, discount_percent, tax_rate, tax_amount,
     total, expected_date, notes
   - GoodsReceiptRead: received_date, delivery_note, notes; GoodsReceiptLineRead: quantity_received, notes
   - SupplierInvoiceRead: invoice_number, invoice_date, due_date, amount, currency, payment_reference, notes
   The frontend builds sales and returns first and comes back to these screens once they are fixed.

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
   as exact-match filters (the variant list already supports `?product=`). The same for
   GET /api/inventory/v1/supplier-invoice/?supplier=<id> (and ideally `?open=true`, with the open balance in the
   dropdown): the supplier-payment allocation picker currently lists every supplier's invoices.

9. The notifications WebSocket sends `type` and `timestamp` (notifications/services.py → _push) where the HTTP API
   says `notif_type` and `created_at`. Send the same field names as the HTTP API (the frontend accepts both).

10. Accounting: the /api/accounting/v1/ endpoints are described in docs/BUSINESS_LOGIC.md but not in
   docs/API_REFERENCE.md. The frontend built the ledger screens from accounting/serializers.py and views.py; please
   still document them there (paths, bodies, filters, response objects) so the contract is written down.

11. Sales workflow actions (confirm, cancel, clone, mark_delivered, create_delivery, …) answer
   `{"detail": str(e)}` for a Django ValidationError, so the message arrives as "['Order exceeds customer credit
   limit']". Use `" ".join(e.messages)` (as gdpr_erase already does). The frontend unwraps it for now
   (core/errors/app-error.ts).

12. Sales orders: PATCH /api/sales/sales-orders/{id}/ and DELETE accept orders in any status. A PATCH with `lines`
   on a confirmed order deletes and recreates its lines while their stock reservations stay. Allow update and
   delete only for `draft` orders (the order-line endpoint already does this with _require_draft). The frontend
   only offers edit and delete for drafts.

13. DELETE /api/sales/customers/{id}/ soft-deletes a customer that still has open orders (confirmed/picking/shipped),
   so the customer disappears from the list while its orders still point to it. Refuse with 400 while the customer
   has open orders (or unpaid invoices).

14. POST /api/sales/sales-invoices/create_from_order/ can be called again for an order that already has an invoice,
   which bills the same shipped lines twice (reproduced: INV-2026-00001 and INV-2026-00002 for SO-2026-00004).
   Refuse when the order (or the given delivery note) already has an invoice that isn't cancelled. The frontend
   only offers "Create invoice" while there is none.

15. Invoices drop the order's `shipping_cost` and `discount_amount`: SO-2026-00001 totals 312.00 (260 + 27 tax +
   25 shipping) but its invoice totals 287.00. Carry both onto the invoice in create_sales_invoice (and include
   them in SalesInvoice.calculate_totals), or tell us if shipping is meant to be billed separately.

16. `amount_due` (sales invoices) is serialized as a JSON number (`ReadOnlyField` over a Decimal property) while every
   other amount is a decimal string. Use `DecimalField(read_only=True, max_digits=19, decimal_places=4)`.

17. Customer returns don't check quantities against the order: a return for 100 units of an order line that
   shipped 2 was accepted, and nothing stops several returns for the same units. Cap `quantity_requested` by
   `quantity_shipped` minus what earlier returns already requested. The frontend caps it by the shipped quantity.

18. The customer-return actions (receive, inspect, close) answer with the return's lines as they were before the
   step (the viewset prefetches `lines`, the service updates other instances): after receive the response still
   says `quantity_received: 0`. Re-fetch the object before serializing the response. The frontend re-reads the
   return after each step.

19. Supplier returns: `refund_amount` is never set and nothing moves a return to `closed`; and
   `purchase_order_number` reads `purchase_order.order_number`, but PurchaseOrder's field is `po_number`, so a return
   linked to a PO will fail to serialize. The frontend shows the sum of the lines instead of `refund_amount`.

20. Customer returns: there's no reject/cancel action, so `rejected` can't be reached and a wrong request can only be
   deleted; `notes` is accepted on create but not returned by the read serializer; and PATCH with `lines` fails
   (CustomerReturnWriteSerializer has no nested `update`). The frontend offers create, delete (while requested) and
   the workflow only.

21. The accepted value of a returned line (`line_value`, then the default refund) is `quantity × unit_price` of the
   order line, ignoring its discount and tax: a line sold at 100 with 10 % off and 15 % tax refunds 100 instead of
   103.50. Tell us if that is intended.

22. Import/export of company data (department, team, country, region, city, district, location;
   company/apis/imports.py and export.py) only checks IsAuthenticated: an employee without `add_department` can import
   departments, and anyone can export them. Check the same permissions as the CRUD endpoints (add_* to import,
   view_* to export). The frontend only lists a company resource when the user has its add_* permission.

23. Import usability (common/base_import_export.py):
   - every header is required, optional ones included (`Missing required headers: parent, description, is_active`),
     and the message repeats the list three times;
   - that error comes back as `errors.error = "[ErrorDetail(string='…', code='invalid')]"` with message
     "Unknown error"; send the sentence as the message (the frontend extracts it for now);
   - a category's `parent` must be an id although its header label is "Parent Category Name" and the export writes
     the id; accept the name (as the label says) or label it as an id;
   - re-importing an exported file reports every existing row as "Violates unique constraint" instead of
     updating it, although the stats have an `updated` count; match existing rows and update them;
   - a malformed file (bad base64) answers 500 instead of 400;
   - an export with no rows is an empty file without the header row.
```
