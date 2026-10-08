# Step 13 — Customers and sales orders (design)

Date: 2026-10-09
Status: built and verified against the local backend

The stock, movement and procurement screens were meant to come next, but their read serializers return almost no
fields (BACKEND_REQUESTS 2), so the owner chose to build sales first.

## Customers

| Topic | Decision |
|---|---|
| List | `/sales/customers`, server-paged (the sales API only paginates when `page` is sent). Search, sort by name, filter by customer type. Available credit shows "No limit" when the customer has none. |
| Form | Name, type, tax ID, contact, credit limit (empty = no limit), payment terms, currency, billing and shipping addresses ("Same as billing"), active, notes. `credit_used` is never sent (the backend maintains it). On edit, read-only cards show number, credit used, available credit and open orders. |
| Addresses | Free JSON on the backend; the UI uses the keys its own fixtures use: `street`, `city`, `state`, `zip`, `country`. Empty parts are dropped. `AddressFieldsComponent` + `addressGroup()/toAddress()/patchAddress()` in `features/sales/address-fields`. |
| Not built | GDPR export/erase/consent, `assigned_to`, tags, the statement endpoint (the detail already carries open orders and credit). |

## Sales orders

| Topic | Decision |
|---|---|
| List | `/sales/orders`: number, customer, date, status, priority, total, fulfilment bar. Search (number, customer, PO), sort, status filter. Rows open the order; delete only on drafts. |
| Form | Customer (active ones), warehouse, required date, priority, customer PO, terms, currency, lines, shipping cost, order discount, addresses, notes and internal notes. Picking a customer on a new order fills terms, currency and addresses. |
| 🧠 Lines | One item picker over all active variants (`product-variant/` fetched 100 at a time): it sets both `product` and `variant`, and the standard price when the price is empty. Every product has at least a default variant (inventory signal), so nothing is missing. Saving sends every line; the backend deletes and recreates them. |
| Totals | Previewed with the backend's formula: line = qty × price × (1 − disc%), tax per line on that, total = subtotal + tax + shipping − discount. `lineTotal()`/`lineTax()` in `sales.models.ts`. |
| Detail | `/sales/orders/:id`: status, customer, warehouse, dates, lines with reserved/shipped, totals, addresses, notes; cancelled reason banner. Follows the route param, because cloning opens the copy on the same route. |
| Workflow | Draft: Edit, Confirm (reserves stock, checks credit), Duplicate, Cancel. Confirmed / on hold: Duplicate, Cancel. Shipped: Mark delivered, Duplicate. Cancel asks for an optional reason. Shipping (create_delivery) comes with delivery notes in step 14. |
| Shared | `ConfirmService.confirmAction()` / `runAction()` (confirm → act → toast, the backend's 4xx message on failure) for every workflow button from now on. `FieldError` learned `greaterThan` and `max`. |
| ⚠️ Edit guard | Only drafts open in the form; the backend allows PATCH/DELETE in any status (BACKEND_REQUESTS 12). |
| ⚠️ Messages | Workflow errors arrive as "['…']" (BACKEND_REQUESTS 11); `toAppError` unwraps them. |

## Verification results (2026-10-09)

Stock for two variants was seeded in Main Warehouse with the Django shell (the stock ledger is read-only through
the API and receipts are blocked on BACKEND_REQUESTS 2).

| Check | Result |
|---|---|
| Customer create | required errors shown; currency upper-cased; "Same as billing" copies; saved and listed |
| Customer edit | fields and addresses loaded; credit cards shown |
| New order | customer fills SAR / Net 30 / addresses; two lines; preview 292.00 SAR = backend total after save |
| Edit draft | lines reloaded; quantity change saved, total recalculated by the backend |
| Confirm | "Order confirmed", status Confirmed, reserved quantities filled |
| Edit URL of a confirmed order | "Only draft orders can be edited." |
| Duplicate → cancel with reason | copy opened as Draft; cancelled with the reason shown in the banner |
| Credit limit | order over the limit → toast "Order exceeds customer credit limit" (unwrapped), order stays Draft |
| Status filter | Confirmed → 1 row |
| Employee | can open the orders list |
| **Backend** | PATCH on a confirmed order accepted (item 12); deleting a customer with an open order succeeded (soft delete, item 13) |

English, Arabic, dark mode and 390 px: no horizontal overflow, no console errors; the only 4xx was the expected
credit-limit 400.
