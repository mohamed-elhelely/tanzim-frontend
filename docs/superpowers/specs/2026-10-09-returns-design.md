# Step 15 — Customer and supplier returns (design)

Date: 2026-10-09
Status: built and verified against the local backend (`/api/returns/v1/`, not the legacy `/api/returns/api/returns/`)

## Customer returns (RMA)

| Topic | Decision |
|---|---|
| List | `/returns/customer`: number, customer, requested date, reason, status, items, refund; search, status and reason filters. |
| New | Customer → optional sales order (only orders that shipped something). With an order: its shipped lines, "Return qty" capped by the shipped quantity (⚠️ the backend doesn't check, BACKEND_REQUESTS 17) and a problem description; the warehouse follows the order. Without an order: free item rows (variant picker → product). Reason, details, refund method, notes. |
| No edit | The backend can't update returns with lines (20), so a return is created once; while requested it can be deleted. |
| Workflow | Requested: Approve, Delete. Approved: Receive (per-line quantity, defaults to requested; goods go back into stock). Received: Inspect (accepted quantity, condition, outcome, problem; the restocking decision is derived from the outcome, `RESTOCKING_FOR`). Inspected: Close and refund (defaults to the accepted value). Inspected/closed with refund method replacement or exchange: Create replacement order → opens it. |
| ⚠️ Stale responses | Receive/inspect/close answer with the old lines (18), so the page re-reads the return after each step. |

## Supplier returns

| Topic | Decision |
|---|---|
| List | `/returns/supplier`: number, supplier, warehouse, status, shipped date; search and status filter. |
| New | Supplier, warehouse, reason (free text) and items with quantity and unit cost (defaults to the standard cost). |
| Workflow | Draft: Approve (stock leaves), Delete. Approved: Mark shipped. Shipped: Supplier confirmed. The value shown is the sum of the lines (`refund_amount` stays 0, 19). |

## Shared

`toItemOption` / `trimZeros` moved to `features/inventory/variants/variant-options.ts` (sales order form and both
return forms use them).

## Verification results (2026-10-09)

| Check | Result |
|---|---|
| New RMA from SO-2026-00001 | warehouse filled from the order; 2 shipped lines; 5 refused (> shipped); 1 with a problem → Requested |
| Approve → Receive → Inspect | receive defaults 1; after the re-read the inspect dialog defaults "accepted" to 1 (before the fix it showed 0 — backend item 18) |
| Close | refund defaults to 100.00 → Closed |
| Replacement | created and opened (SO draft) |
| RMA without an order | missing item caught; created with a picked item; deleted |
| Supplier return | created (S3, Damaged batch, 1 × 10); approve → shipped → confirmed by supplier |
| **Backend** | over-return accepted (17), stale lines in action responses (18), plus 19–21 from reading the code and API |

English, Arabic, dark mode and 390 px for every new screen: no horizontal overflow, no console errors, no 4xx.
