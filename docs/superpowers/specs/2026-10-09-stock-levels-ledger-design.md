# Step 20 — Stock levels and stock ledger (design)

Date: 2026-10-09
Status: built and verified against the local backend (backend master 0a78259)

## Goal
Show what is in stock and every movement that changed it, read-only, under Inventory.

## Where the data comes from
The API has no "current stock" endpoint. Options considered:

| Source | Verdict |
|---|---|
| Sum the stock ledger in the browser | Rejected: every row of the ledger would have to be downloaded, and the ledger can't be filtered by variant or warehouse |
| Stock snapshots | Rejected: point-in-time rows that nothing creates on a schedule (empty locally) |
| `GET /api/reports/v1/run/inventory_valuation/` | **Chosen**: the backend sums the ledger per variant (`on_hand_by_variant`), with `warehouse`, `as_of_date` and `method` (AVERAGE/FIFO/LIFO) parameters and `export=xlsx` |

Reserved stock: open `stock-reservation` rows (`is_released = false`), summed per variant in the browser, filtered by
the shown warehouse. Available = on hand − reserved, as the backend's `get_available` computes it. Reservations
only describe today, so for a past date the two columns are hidden. The reservation list can't be filtered either,
so the screen reads it all with `listAll()` (open reservations are few).

## Screens
- **Stock levels** (`/inventory/stock`, menu Inventory → Stock levels): warehouse (all or one), as-of date, valuation
  method, Show and Excel. Cards: items, total quantity, stock value. Table (client-side paging and sorting, search by
  SKU / variant / product): SKU, variant (names from the variant dropdown), product, on hand (with an "Out of stock"
  badge at ≤ 0), reserved, available, unit cost, value.
- **Stock ledger** (`/inventory/stock-ledger`, menu Inventory → Stock ledger): server-paged list, newest first
  (`ordering=-created_at` unless the user sorts), search by document type (`reference_type`). Columns: date, movement
  type (translated badge), SKU, variant, warehouse › bin, quantity (signed, green in / red out), unit cost, total
  cost, the document (`notes`, e.g. "Delivery Note DN-2026-00001"), by.

## Backend request raised
Item 26: exact-match filters on the stock ledger (`product_variant`, `warehouse`, `transaction_type`, date range) and
on reservations (`is_released`, `product_variant`, `warehouse`), and a stock-level endpoint with reserved and
available per variant × warehouse. With those, a stock-level row can open its variant's ledger and the screen stops
reading every reservation.

## Follow-ups (not in this step)
- The other inventory reports (`reports/v1`: ABC, aging, movement, turnover, expiry, reorder status, supplier
  performance, warehouse utilization) could get a viewer like the accounting one.
- Batches, serial numbers and reservations lists.

## Verification results

| Check | Result |
|---|---|
| `npm run build` | ✅ |
| `npx ng test --watch=false` (Chrome) | ✅ 393 / 393 |
| Stock levels, all warehouses: 2 items, 94 units, 3,760.00 (matches the report) | ✅ |
| Confirming a sales order for 5 × HAM-L → reserved 5, available 45 | ✅ |
| Warehouse filter Branch Store → 0 items | ✅ |
| Past date (2026-10-01) → empty, reserved/available hidden | ✅ (API + unit test) |
| Excel export returns an .xlsx (checked through the API, no download in the browser) | ✅ |
| Stock ledger newest first, signed quantities, translated types, search "Delivery" → the delivery note row | ✅ |
| English, Arabic (RTL), dark and light mode, 390 px mobile (no page-level horizontal scroll) | ✅ |
| Console errors | ✅ none |
