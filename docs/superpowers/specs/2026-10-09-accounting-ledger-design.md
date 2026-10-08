# Step 16 — Accounting: chart of accounts, journal entries, fiscal years (design)

Date: 2026-10-09
Status: built and verified against the local backend

The API isn't in API_REFERENCE.md (BACKEND_REQUESTS 10); the contract is `accounting/serializers.py` and
`views.py`. Everything sits behind the `accounting` subscription module (menu `module: 'accounting'`; the backend
answers 403 without it). For local testing the module was added to Test Company's subscription with the shell.

## Chart of accounts (`/accounting/accounts`)

| Topic | Decision |
|---|---|
| List | The whole chart (small; the backend creates the default one on the first list) as an indented tree (`toTree`), filtered in the browser by type and code/name. Group vs posting, "System" marker, active. Delete hidden on system accounts (the backend also refuses accounts with entries or children). "Add missing defaults" calls `setup/`. |
| Form | Code, name, type, parent, group, active, description. Parent options: group accounts of the same type, never the account itself or its descendants; changing the type clears an invalid parent. System accounts: type and group locked, with an explanation. |

## Journal entries (`/accounting/journal-entries`)

| Topic | Decision |
|---|---|
| List | Server-paged; filters status, origin (manual / automatic → `automatic=true/false`), from/to dates. The endpoint has no text search or sorting. |
| Form | Date (today), description, reference, lines (account = active posting accounts, debit or credit, description). 🧠 totals compared in cents; each line must have exactly one side; "Balance last line" fills the difference; the balance message follows the totals after the first attempt. "Save as draft" or "Save and post" (`post: true`). Only drafts open in the form; editing sends every line (the backend replaces them). |
| Detail | Status, date, origin (source type/id for automatic entries), posted at, reference, lines with totals. Draft: Edit, Post, Delete. Posted: Reverse (optional date and description) → opens the reversal; banners link an entry and its reversal. Follows the route param. |

## Fiscal years (`/accounting/fiscal-years`)

One page: each year with its status, dates and monthly periods as tiles. New year dialog suggests the calendar year after
the latest; the backend creates the periods. Close / reopen per period, close / reopen / delete per year. The backend
enforces the order rules (not before the end, earlier years first) and its message is shown.

## Verification results (2026-10-09)

| Check | Result |
|---|---|
| Chart | 29 default accounts as a tree; Expense filter → 5 rows; parent options for an expense = "6000 Operating Expenses" only |
| Account | created under 6000, deleted; Cash on Hand shows the system note with the type locked |
| Fiscal year | FY2026 suggested and created with 12 periods; January closed and reopened; closing the year early → backend message "FY2026 cannot be closed before it ends" |
| Entry | 500 / 400 → difference 100 and the balance error; "Balance last line" → 500.00, Balanced; saved as draft (JE-000022), edited, posted, reversed → JE-000023 opened with the "reverses another" banner; the original shows "was reversed" and no Reverse button |
| List | 10 entries; Manual filter → 2 |

English, Arabic, dark mode and 390 px: no horizontal overflow, no console errors; the only 4xx was the expected
early year close.
