# Step 19 — Verify the backend fixes, drop the workarounds (design)

Date: 2026-10-09
Status: built and verified against the local backend (backend master at 0a78259, after c6509d9)

The backend reported every item of docs/BACKEND_REQUESTS.md (0–23) fixed. Each one was reproduced against the
running API (scripted requests as the company admin, an employee without permissions and a platform staff user),
then the matching frontend workaround was removed.

| Item | Checked against the API | Frontend change |
|---|---|---|
| 0 | Employee and company admin get 403 on every platform invoice/payment write; staff can create_draft, add_item, issue | None (billing is read-only for companies) |
| 1 | DELETE answers 204 with `Content-Length: 0` | None in code (the dev proxy no longer turns deletes into 500) |
| 2 | Warehouse, zone, bin, supplier, supplier product and variant reads return every field; every stock, movement and procurement read serializer has the listed fields | `shared/utils/omit-pristine.ts` deleted; the six edit forms load and send every field; warehouse/zone/bin lists read `code` from the row (no dropdown lookup); supplier price list shows cost, currency and dates; the "partial data" hint is gone |
| 3 | PATCH `manager` with a company user saves; a user of another company → 400 | Warehouse form has a Manager picker (company users) |
| 4 | `unique=True` dropped on warehouse code and variant SKU; SKU check scoped to the company | None |
| 5 | PATCH a category with its unchanged name and parent → 200 | Category edit always sends name and parent |
| 6 | DELETE a used brand/category → 400 "Cannot delete: still used by …" | None (ConfirmService shows the message) |
| 7 | Parent = self or a descendant → 400 under `parent` | None (the picker already hides those) |
| 8 | `supplier-product/?supplier=`, `?product_variant=`; `supplier-invoice/?supplier=&open=true` with `open_balance` in the dropdown | Supplier payment form loads the chosen supplier's open invoices ("SI-7 · 60.00 EGP") and clears allocations when the supplier changes. `CrudApi.dropdown(filters)` added |
| 9 | Socket payload is `NotificationSerializer` (notif_type, created_at) | `toAppNotification` / `SocketNotification` removed |
| 10 | Accounting documented in API_REFERENCE.md | Comment in accounting.models.ts |
| 11 | Workflow errors arrive as plain text ("Order exceeds customer credit limit") | `unwrapDjangoMessage` removed from `toAppError` |
| 12 | PATCH/DELETE on a confirmed order → 400 | Comment only (the screen still offers edit/delete for drafts only) |
| 13 | DELETE a customer with an open order → 400 | None |
| 14 | A second `create_from_order` → 400 "already invoiced" | The "Create invoice" guard stays as the UI rule; ⚠️ removed |
| 15 | Invoice carries `shipping_cost` and `discount_amount`; totals match the order (245.00) | Invoice detail shows a Shipping row |
| 16 | `amount_due` is a decimal string (detail and list) | Type is `string` |
| 17 | 100 of 2 shipped → 400 under the line; a second return is capped by what earlier ones requested | Comment only (the form still caps by shipped) |
| 18 | Action responses carry the updated lines | No re-read after approve/receive/inspect/close; the response is applied, keeping `sales_order_number` (not in action responses) |
| 19 | `refund_amount` set on approve; `close` action with an optional amount | Supplier return shows the refund amount and offers "Close with refund" when confirmed |
| 20 | `reject` (requested/approved), `notes` returned, PATCH with lines works | Reject with an optional reason; notes and the rejection shown on the detail. Edit of returns not built yet |
| 21 | `line_value` = qty × price × (1 − discount) × (1 + tax): 110.00 for 100 + 10 % tax | None |
| 22 | Employee without permissions → 403 on department import and export | Comment only |
| 23 | Optional headers optional; header error as `message`; parent by name; bad base64 → 400; re-import updates; empty export has the header row | `readableImportError` removed |

New items raised: 24 (nothing sets a sales invoice `overdue`), 25 (two small leftovers: the category export writes
the parent id as "1.0"; return action responses omit `sales_order_number`).

## Verification results

| Check | Result |
|---|---|
| `npm run build` | ✅ |
| `npx ng test --watch=false` (Chrome) | ✅ 387 / 387 |
| Warehouse edit: every field loaded, phone changed, API shows email/address/manager kept | ✅ |
| Supplier price list: cost and dates in the list; edit loads every field | ✅ |
| Sales invoice detail: Shipping 25.00, total 245.00 | ✅ |
| Customer return: Reject with a reason → Rejected, reason and date shown, actions gone | ✅ |
| Supplier return: Close with refund 100 → Closed, refund 100.00 | ✅ |
| Supplier payment: only the chosen supplier's open invoices; after paying 300 the open balance is 200 | ✅ |
| Arabic (RTL), dark mode, 390 px mobile | ✅ |
| Console errors | ✅ none |
