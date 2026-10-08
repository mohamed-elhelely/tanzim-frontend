# Step 17 — Accounting reports, supplier payments and debit notes (design)

Date: 2026-10-09
Status: built and verified against the local backend

## Reports (`/accounting/reports`)

| Topic | Decision |
|---|---|
| One viewer | All eight reports answer `{ columns, rows, summary }`, so one screen renders any of them: the columns drive the table, the summary becomes cards (empty dates skipped, `is_balanced` as a badge). Column and summary keys are translated (`accounting.reportColumns.*`). Text keys stay text; other numbers are money. |
| Parameters | `REPORT_PARAMS` mirrors the backend: dates for trial balance / income statement, "as of" for balance sheet and agings, account / customer / supplier (required) plus dates for the ledger and statements. Only those parameters are sent. Reports without a required picker run as soon as they're chosen. |
| Excel | Same request with `export=xlsx` as a blob (`BaseApiService.getBlob`) saved with `saveFile()` (`shared/utils/save-file.ts`). |

## Supplier payments (`/accounting/supplier-payments`)

List (status, method), record form (supplier, date, amount, method, reference, notes, optional allocations to
supplier invoices, refused above the payment amount), detail with allocations and **Void** (reason). Payments are
never edited. ⚠️ No supplier invoices exist until procurement is built, and the invoice endpoint can't filter by
supplier (BACKEND_REQUESTS 8, 2): the picker lists every invoice number and shows "No supplier invoices yet". Allocations
are covered by unit tests only.

## Debit notes (`/accounting/debit-notes`)

List (status), form for new and draft notes (supplier → that supplier's returns, optional invoice, date, subtotal,
tax, supplier reference, reason), detail: draft → Edit, Issue, Delete; issued → Cancel (reason). On a supplier
return (not draft) **Raise debit note** creates a draft from it when the company has the accounting module.

## Verification results (2026-10-09)

| Check | Result |
|---|---|
| Trial balance | 10 rows, summary with "Balanced" |
| Balance sheet | 7 rows, "as of" parameter |
| General ledger | refused until an account is picked; Bank → 6 rows with opening/closing; Excel downloaded (`general_ledger_<date>.xlsx`) |
| Receivables aging | 1 row (Acme Trading) |
| Supplier payment | allocation picker says "No supplier invoices yet"; SP-00001 (75.00 cash) recorded; voided with "Entered twice" |
| Debit note from SRN-2026-00001 | DBN-00001 draft (return linked); tax and reference edited; issued; cancelled; a new draft can be raised after the cancel |
| Manual debit note | created (S3, 20.00) and deleted |

English, Arabic, dark mode and 390 px: no horizontal overflow, no console errors, no 4xx. (The Debit notes menu icon
was missing: `pi-file-minus` isn't a PrimeIcons icon; now `pi-minus-circle`, and all icons in the app were checked.)
