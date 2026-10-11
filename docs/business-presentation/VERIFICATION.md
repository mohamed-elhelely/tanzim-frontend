# Verification notes

How the presentation's claims were checked, as of 11 October 2026.

- Frontend: `D:/tanzim/frontend`, branch `claude/billing-payment-fix` (main + platform billing work). Menus from
  `src/app/layout/nav/nav-items.ts`, screens from `src/app/features/*`, `docs/CODE_MAP.md`, `docs/HANDOFF.md`,
  `docs/BACKEND_REQUESTS.md`.
- Backend: `D:/tanzim/backend/Tanzim`, master at `847f506`. URL map `Tanzim/urls.py`, services
  (`inventory/services/*.py`, `sales/services.py`, `assembly/services.py`, `accounting/services/reports.py`),
  permission catalog `company/access.py`, schedules `Tanzim/celery.py`, plan seed
  `billing/management/commands/setup_plans.py`, `docs/API_REFERENCE.md`, `docs/BUSINESS_LOGIC.md`.

## Where the documentation is out of date

`docs/BUSINESS_LOGIC.md` (backend) was written after backend PR #8 and is stale in several places. The code wins:

| BUSINESS_LOGIC.md says | Code today |
|---|---|
| Transfer, adjustment, count, purchasing and approval actions answer 405 | All wired: `inventory/services/movement.py`, `procurement.py`, `approvals.py`; documented in API_REFERENCE.md |
| Goods receipts, transfers, adjustments never write the stock ledger | `post_goods_receipt`, `ship_transfer` / `receive_transfer`, `post_adjustment`, `approve_cycle_count` call `post_ledger_entry` |
| Approval only handles the first stage | Multi-stage with skip and escalate (`approvals.py`), hourly escalation job |
| Line `tax_percent` is ignored; one tax amount per order | Totals sum each line's tax (`sales/models/__init__.py`) |
| Nothing raises `credit_used` | Raised on invoice issue, lowered on payment / refund (`sales/services.py` `_change_credit_used`) |
| Reservations are not released on shipping | `consume_reservation` on each shipment |
| Delivery note cannot reach `in_transit` | `ship` and `mark_failed` actions exist |
| Planning data is manual only | Nightly `run_daily_planning` creates low-stock alerts and reorder suggestions |
| Quality, assembly, reports, audit trail have no endpoints | `api/quality/v1/`, `api/assembly/v1/`, `api/reports/v1/` exist; the audit trail feeds the `user_activity` report |
| Import fails on every row | Fixed (frontend BACKEND_REQUESTS items verified 2026-10-09) |

The backend `CLAUDE.md` also describes things that are not in the code (CRM/GDPR endpoints, Kubernetes/Helm,
two-factor authentication, ELK and Jaeger). None of them is presented as a feature.

## Status matrix

| Module | Status | Evidence |
|---|---|---|
| Subscriptions & platform billing | Live | `features/admin/billing/*`, `features/billing/*`; backend `billing/` |
| Company, users & permissions | Live | `features/company/*`; `company/access.py` |
| Locations | Live | `features/locations/*` |
| Product catalog | Live | `features/inventory/{products,variants,categories,brands}` |
| Warehouses & suppliers | Live | `features/inventory/{warehouses,zones,bins,suppliers,supplier-products}` |
| Stock levels & ledger | Live | `features/inventory/{stock-levels,stock-ledger}` |
| Sales | Live | `features/sales/*` |
| Returns | Live | `features/returns/*` |
| Accounting | Live | `features/accounting/*` (incl. supplier payments, debit notes) |
| Dashboards & reports | Live | `features/analytics/*` (saved reports and schedules: server only) |
| Notifications | Live | `features/notifications`, `core/notifications` |
| Import & export | Live | `features/import-export` |
| Stock transfers & adjustments | Screens in progress | branch `claude/stock-movements` (WIP commit `fcfb1e2`, not merged) |
| Cycle counts | Backend only | `cycle-count` API, no screen |
| Purchasing | Backend only | requisition / PO / receipt / supplier-invoice APIs; frontend has only a supplier-invoice dropdown service |
| Quality control | Backend only | `quality/views.py` (inspections, NCRs, quarantine) |
| Assembly & work orders | Backend only | `assembly/views.py` (schedule, start, complete, substitute) |
| Approval workflows | Backend only | `inventory/services/approvals.py` |
| Stock planning & alerts | Backend only | `inventory/services/planning.py`, nightly job |
| Integrations (webhooks) | Backend only | `integrations/` |
| Attendance, time tracking, payroll, “Advanced analytics” | Name only | Module rows in `setup_plans.py`; no app or model |
| Expenses | Not in the project | Only manual journal entries |
| Custody (عُهد) and fixed assets | Not in the project | No code |

## Workflows checked against code

Sales order confirm / cancel / clone / ship, delivery confirm / ship / deliver / fail, invoice create-from-order /
issue / pay / refund / cancel, customer return approve / reject / receive / inspect / close, supplier return
approve / ship / confirm / close, supplier payments and debit notes, journal entries and fiscal periods, transfers,
adjustments, cycle counts, requisitions, purchase orders, goods receipts, supplier invoice match / pay / dispute,
approval process, work orders, planning, platform subscriptions and invoices, permission gates.

Not run against a live server in this task: the claims rest on code reading and the project's API reference, which
was itself captured from real requests.

## Facts used in the deck

- 30 analytics report types and 7 dashboards (`API_REFERENCE.md` → Analytics); 8 accounting reports
  (`accounting/services/reports.py`).
- 10 permission modules; 22 core groups per company (Full Access, Read Only, and Full / Read Only for each module).
- 19 importable resources (7 company + 12 inventory).
- Invoices need a fully delivered order (`sales/services.py`, status check before `create_from_order`).
- Customer and document currency default `USD`; product `default_uom` is free text with default `each`.
- No online payment gateway in the backend.

## Open business questions (need the owner's input)

1. Units for steel (ton, kg, bar, meter) and conversion.
2. Invoicing before full delivery; counter cash sales.
3. Currency, and whether more than one is needed.
4. How to load opening stock and opening customer / supplier balances (backend request 28).
5. Overdue rules and reminders (backend request 24).
6. Block or warn when credit is exceeded.
7. Post-dated cheques.
8. Approval thresholds by amount.
9. Meaning of “custody” (cash advances, tools, vehicles).
10. Expenses: journal entries or a dedicated module.
11. Attendance and payroll: build, integrate, or remove from plans.
12. Factory needs beyond work orders (cutting, scrap, labor, machines).
13. Tax e-invoicing requirement.
14. Daily steel price lists.

Everything in Part K of the deck (recommendations) is a proposal and does not exist in the code.
