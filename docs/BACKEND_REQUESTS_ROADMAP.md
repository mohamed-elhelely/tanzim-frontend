# Backend requests — roadmap round

Paste the block below as the first message of a new session on the backend repo (`0Mustafa37/Tanzim`).
This file holds only the requests added with the roadmap (docs/plans/2026-10-12-roadmap-and-system-logs.md).
The older open items (24–31) stay in docs/BACKEND_REQUESTS.md. Remove items here as they ship and move them to
"Fixed" with how they were verified.

```text
You are working on the backend of Tanzim, a bilingual (English/Arabic) multi-tenant ERP.

- Backend (this repo): 0Mustafa37/Tanzim — Django + DRF, pytest. Follow CLAUDE.md.
- Frontend: mohamed-elhelely/tanzim-frontend (Angular 21). It consumes the API exactly as documented in docs/API_REFERENCE.md.
- Responses are wrapped by sales.renderers.StandardizedJSONRenderer: { success, data, metadata, error: { code, message, errors } }.
  Field validation errors must come back as 400 with errors keyed by field name.

## Rules
- One logical change per commit, each with a pytest test that fails before and passes after.
- Keep docs/API_REFERENCE.md (and its "Known issues") in sync with every change.
- Additive response changes are fine; don't remove or rename fields the frontend reads.
- New branch, PR to master when done. Never include model names in commits or PRs.
- Reply to the owner in Egyptian Arabic; keep code, commits and PR text in English.
- Items marked "question" only need an answer; reply to every one, even with "no".

## Open items (in priority order)

1. System log (audit log) for the whole system. The owner wants to know who changed any data, when, what changed
   (old → new) and from where. Today only SalesAuditTrail exists, for four sales models; `created_by`/`updated_by`
   only keep the last editor. The frontend is being built against the contract below. Please implement it as
   written (or tell us what you change) and reply to the questions at the end.
   - Capture every create/update/delete (soft delete = `delete`, un-delete = `restore`) on every CompanyBaseModel,
     many-to-many changes (role permissions, permission groups, team members), bulk queryset
     update/delete/bulk_create/bulk_update (one entry with the count and ids), imports, and auth events
     (`login`, `login_failed`, `logout`, `password_change`). Background tasks and imports log the user who started them.
   - Write the entry in the same transaction as the change (no entry if it rolls back). Entries are immutable.
   - Never log secrets: passwords, tokens, API keys and webhook secrets are written as "***". Skip noise such as
     `updated_at` and `last_login`.
   - New resource `auditlog` with `view_auditlog` only (no add/change/delete). Company users see their company;
     platform staff see every company and can filter with `?company=`.
   - `GET /api/audit/v1/logs/` (paged, standard envelope). Query parameters: `search` (object_repr, user name/email),
     `user` (id), `action`, `resource`, `object_id`, `source`, `date_from` / `date_to` (YYYY-MM-DD, inclusive),
     `ordering` (default `-timestamp`). Each row:
     {
       "id": 981,
       "timestamp": "2026-10-12T09:15:02Z",
       "action": "update",            // create | update | delete | restore | bulk_update | bulk_delete | import |
                                      // login | login_failed | logout | password_change
       "source": "api",               // api | admin | import | task | system
       "user": { "id": 4, "email": "sara@acme.test", "first_name": "Sara", "last_name": "Ali" },  // null for system
       "resource": "salesorder",      // the permission-catalog resource name, lower case
       "object_id": "245",
       "object_repr": "SO-2026-00012",
       "changes": { "status": ["draft", "confirmed"], "notes": ["", "Rush"] },
                                      // create: [null, new]; delete: [old, null];
                                      // m2m: { "permissions": { "added": ["view_brand"], "removed": [] } };
                                      // foreign keys as their display text, not ids
       "ip_address": "196.221.10.4",
       "user_agent": "Mozilla/5.0 …",
       "request_id": "c1f…"
     }
   - `GET /api/audit/v1/logs/{id}/` returns the same shape.
   - `GET /api/audit/v1/logs/export/` with the same filters returns an .xlsx file.
   - Questions: (a) is production on ASGI/Daphne? `CurrentUserMiddleware` keeps the user in `threading.local`, which
     is not safe there; `contextvars` is. (b) Should SalesAuditTrail move into the new log and be retired? (c) How
     long should entries be kept per plan? (d) Anything in the contract you'd rather change?

2. Date range filters on document lists, like journal entries have: `date_from` / `date_to` (document date) on
   sales-invoices, sales-orders, delivery-notes, invoice-payments, customer-returns, supplier-returns,
   supplier-payments and debit-notes. Which of these already support it, and under which parameter names?

3. Export what the list shows: does the export endpoint accept the same `search` and filters as the list? If not,
   please add them, so "export" downloads the filtered rows only.

4. Can list filters take several values (e.g. `status=draft,issued`)? If not, is it easy to add for status filters?

5. Global search: one endpoint that searches customers, sales orders, sales invoices, products and suppliers and
   returns up to 5 hits per type (`type`, `id`, `label`, `sublabel`). Possible?

6. Account security: access tokens live 3650 days today, so a stolen token works for ten years. Can we move to a
   short-lived access token (15–30 min) with refresh-token rotation? The frontend will update its interceptor.
   Also: is there (or can there be) an endpoint to list a user's active sessions/devices and revoke them, and is
   two-factor login planned?

7. Business features. For each, reply "exists" (with an example request/response or the API_REFERENCE section),
   "doesn't exist" (and a rough effort), or notes:
   a. quotations (quote → customer approval → converted to a sales order);
   b. price lists and discount rules by customer type or quantity;
   c. customer credit limit enforced when an order is created (a "credit limit" workflow error already exists — where
      is the limit set, and is it enforced everywhere?);
   d. customer account statement (endpoint or PDF);
   e. Egyptian e-invoice / e-receipt (ETA) integration;
   f. several tax rates (VAT, table tax, exempt items) and a tax-return report;
   g. batch / serial number tracking and FEFO picking;
   h. sales targets and commissions per salesperson/team;
   i. self sign-up with a trial period for new companies (billing has something called trial — what does it do?);
   j. plan limits (users, warehouses, …) and an endpoint returning current usage against them;
   k. PDF for invoices and sales orders, and emailing them to the customer;
   l. attachments on documents;
   m. online payment (Paymob / Fawry);
   n. WhatsApp / SMS sending (any provider agreed?).

8. Existing endpoints without frontend screens yet: purchase requisitions, purchase orders (and their actions),
   stock adjustments, stock transfers, cycle counts, stock reservations, low-stock and expiry alerts, reorder
   policies and suggestions, `planning/run/`, approval workflows/stages/requests/actions, quality (inspections,
   NCRs, quarantine), assembly work orders, webhooks and saved/scheduled reports. Please make sure each is in
   docs/API_REFERENCE.md with an example request/response, the allowed status transitions, and the permission each
   action needs.
9. Question: the dashboard's "getting started" list wants a "chart of accounts ready" step, but listing accounts
   creates the default chart as a side effect. Is there a read-only way to know whether a company's chart exists
   (e.g. a `chart_ready` flag on `GET /api/company/v1/me/`, or a count that doesn't create anything)?

```

## Fixed

| Item | What was fixed | Verified with |
|---|---|---|
