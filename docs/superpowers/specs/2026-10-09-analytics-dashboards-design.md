# Analytics — role dashboards and the reports viewer (design)

Date: 2026-10-09
Status: built and verified against the local backend (backend master f178130, PR 0Mustafa37/Tanzim#21)

## Goal
Use the backend's new analytics API (`/api/reports/v1/`): seven role dashboards and thirty reports, read-only.

## Decisions

| Question | Decision | Why |
|---|---|---|
| Charts | chart.js 4.5.1 through PrimeNG's `<p-chart>` (owner's choice, the only new dependency) | Tooltips, legends and animations; PrimeNG already wraps it |
| Where | New area `features/analytics`, menu "Analytics" (module `inventory`, like the API) with Dashboards and Reports | The API spans every module; it isn't part of one of them |
| Which dashboards | Only those `GET dashboards/` lists (finance needs accounting) | The backend decides availability |
| Unknown charts | `CHART_SPECS` describes each known chart (type, category field, series); a chart missing there, or whose rows lack those fields (`fitsSpec`), is shown as a table | A backend change can't break the page |
| Report inputs | `REPORT_PARAMS` per report (from the API reference); `REQUIRED_PARAMS` for inventory_movement | Only show what a report takes |
| Labels | Every column, summary and KPI key under `analytics.labels.*` (EN + AR, 230+ keys); the `analyticsLabel` pipe falls back to the backend's English (KPIs) or a humanized key | Reports can gain columns; a raw key must never show |
| Numbers | `formatValue`: money (keys matching `isMoneyKey`) with two decimals, `_percent` with "%", counts as they come; Latin digits | One rule for tables, cards and summaries |
| Dark mode / RTL | Chart options rebuild from ThemeService and LanguageService: axis/legend colours, reversed category axis and right-hand value axis in Arabic, rtl tooltips/legend | Same look in every theme and direction |

## Screens
- **Dashboards** (`/analytics/dashboards/:name`, default overview): pills for each dashboard, a date window (defaults to the
  backend's last 30 days, shown after loading), a warehouse on overview and inventory. Alerts, KPI cards (value by
  unit, change vs. the previous window when the KPI has one), charts in a two-column grid, then the dashboard's tables.
- **Reports** (`/analytics/reports?report=…`): a grouped, searchable picker (inventory, sales, operations, purchasing,
  finance, administration, other), the report's inputs, Run and Excel. Result: single summary values as cards, nested
  summary lists/objects as small tables, then the rows in the report's own column order (sortable, paged over 25).

## Backend requests raised
- 27: KPI labels, alert messages and category labels are English only (alerts have no key); `flags` arrives as
  comma-separated text, not the documented list (the table accepts both).
- 28: opening stock has no proper path: a positive adjustment credits 5200 Inventory Adjustments (cost of sales), so
  entering opening stock made cost of sales −3,960 and the gross margin 1,860 % locally.

## Follow-ups
- Saved reports and schedules (`reports/v1/saved/`, `schedules/`) have no screens yet.
- The inventory "Stock levels" screen keeps using `inventory_valuation` directly.

## Verification results

| Check | Result |
|---|---|
| `npm run build` | ✅ |
| `npx ng test --watch=false` | ✅ 410 / 410 |
| Overview dashboard: KPIs, order pipeline (vertical bars, statuses translated), top products / customers (horizontal bars) | ✅ |
| Reports viewer: opens the report from `?report=`, customer health summary cards and rows; flags shown | ✅ (after fixing flags and the "near credit limit" money format) |
| Console errors | ✅ none |
| Full EN/AR/dark/390 px walk | ⏸ paused at the owner's request; charts already follow theme and direction (unit-tested) |
