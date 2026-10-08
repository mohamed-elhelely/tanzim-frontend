# Step 14 — Delivery notes, sales invoices and payments (design)

Date: 2026-10-09
Status: built and verified against the local backend

## Delivery notes

| Topic | Decision |
|---|---|
| Creating | Only from an order ("Ship", confirmed or picking orders with something left to ship): a dialog lists each line's remaining quantity (prefilled), plus carrier and tracking. ⚠️ The stock is issued as soon as the note is created, which the dialog says. Over-shipping and "nothing to ship" are caught before sending. |
| List | `/sales/deliveries`: number, order, customer, status, method, carrier/tracking, shipped date; search and status filter. No New button. |
| Detail | `/sales/deliveries/:id`: status, order link, warehouse, method, carrier, tracking, dates, notes, lines. |
| Workflow | Draft: Edit details (method, carrier, tracking, notes via PATCH), Confirm delivery. Confirmed: Hand to carrier (carrier/tracking prefilled) — or Mark delivered for pick-ups. In transit: Mark delivered, Delivery failed (reason). The backend moves the order to shipped / delivered by itself. |

## Sales invoices

| Topic | Decision |
|---|---|
| Creating | Only from a delivered order ("Create invoice", a draft for everything shipped). ⚠️ Offered only while the order has no invoice that isn't cancelled (BACKEND_REQUESTS 14). |
| List | `/sales/invoices`: number, customer + order, dates, status, payment status, total, amount due; search, status and payment filters. |
| Detail | Lines, totals (subtotal, tax, discount, total, paid, due), payments table. |
| Workflow | Draft: Edit details (due date, reference, terms, notes), Issue, Delete, Cancel. Issued / overdue: Record payment (amount defaults to the amount due; more than due is refused), Cancel while nothing is paid. Payments: Refund (completed ones). |
| ⚠️ Totals | Invoices don't carry the order's shipping and discount (BACKEND_REQUESTS 15); `amount_due` arrives as a number (16). |

## Payments

`/sales/payments`: read-only list (date, invoice, method, reference, status, user, amount) with a method filter; rows
open the invoice. Recording and refunding happen on the invoice.

## Shared

- `ReasonDialogComponent` (`shared/components/reason-dialog`): the optional-reason dialog for cancel order, cancel
  invoice and failed delivery.
- `ConfirmService.runAction()` takes an `onError` so dialogs stop their spinner and stay open.
- `CrudApi.all(filters)` for "everything of this order" on unpaginated endpoints.
- The order page lists its deliveries and invoices.

## Verification results (2026-10-09)

| Check | Result |
|---|---|
| Ship dialog | defaults 2 / 4 (remaining); 10 refused; partial 2 + 2 shipped → DN created (draft), stock issued |
| Confirm DN | Confirmed; order stays Picking (1 delivery listed) |
| Second shipment as pick-up | details saved (method + notes); confirm → only "Mark delivered" offered → Delivered |
| First DN | Hand to carrier (carrier prefilled, tracking AWB-123) → In transit → Delivered; order → Delivered |
| Failed delivery | In-transit DN → reason "Wrong address" → Failed, reason added to notes |
| Invoice | Created from the order (draft 287.00 SAR); details saved; issued; 99999 refused; 100 paid → Cancel no longer offered; refund; full payment → Paid / Paid |
| Duplicate invoice | "Create invoice" no longer offered on the order |
| Lists | deliveries 5, invoices 2, payments 4 rows |
| **Backend** | a second invoice for the same order is accepted (14); the order's 25.00 shipping is missing from the invoice (15) |

English, Arabic, dark mode and 390 px for every new screen: no horizontal overflow, no console errors, no 4xx.
