# Record details and activity logs — audit (2026-10-15)

## Log / audit APIs the frontend can use

| API | What it gives | Used by |
|---|---|---|
| `GET /api/audit/v1/logs/` | Paged log; filters `resource` (comma-separated), `object_id`, `user`, `action`, `source`, `date_from`/`date_to`, `search` | System log page, module "Activity log", row "View logs", record History card |
| `GET /api/audit/v1/logs/{id}/` | One entry with its field changes | Change details drawer |
| `GET /api/audit/v1/logs/export/` | Excel with the same filters | System log export |
| `audit_trail` field on customer returns | Return-specific history (JSON) | Not shown yet |
| Approval history (`/approvals/…`) | Approval actions | No screen yet (roadmap §2) |

## Existing details views

| Record | View |
|---|---|
| Sales orders, delivery notes, sales invoices | Detail page + History card |
| Customer returns, supplier returns | Detail page + History card |
| Journal entries, supplier payments, debit notes | Detail page + History card |
| Platform invoices | Detail page (platform data: no log) |
| Company billing invoices | Drawer on the billing page |
| System log entries | Change details drawer |

## Missing details views → covered by the shared record details drawer

Brands, categories, products, product variants, warehouses, zones, bins, suppliers, supplier price list, customers,
departments, teams, roles, permission groups, company users, company locations, countries, regions, cities,
districts, accounts. Each row's ⋮ menu gets **View**, which opens a drawer with the row's fields in sections and an
**Activity log** tab (the record's log, `resource` + `object_id`) for users with `view_auditlog`.

Still without a details view (platform admin screens, outside the company log): companies, plans, billing modules,
subscriptions, platform payments. Customer payments open their invoice.

## Records whose logs the current backend does not give

- Platform admin records (companies, plans, modules, subscriptions, platform payments): not company data, not logged.
- Permissions: a global catalog, not company data.
- A document's lines under the document: logged as their own resource with their own ids
  (BACKEND_REQUESTS_ROADMAP item 16).
- A company user's account changes (`user`, a different id than the membership): item 16.
- Countries, regions, cities, districts: unconfirmed whether they are logged company data (item 15b).
