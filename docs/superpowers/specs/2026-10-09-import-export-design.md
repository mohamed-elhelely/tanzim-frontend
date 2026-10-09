# Step 18 — Import / export (design)

Date: 2026-10-09
Status: built and verified against the local backend

## Screen (`/import-export`)

| Topic | Decision |
|---|---|
| Resource picker | One grouped select with every resource API_REFERENCE.md lists (`DATA_RESOURCES`): Company (department, team; shown with `add_*` permission — the backend itself doesn't check, BACKEND_REQUESTS 22), Locations (module `location`), Inventory (module `inventory`). |
| Export | CSV or Excel → `GET …/export/?format=` as a blob, saved as `<resource>_<date>.<ext>`. |
| Template | `POST …/import/?template=true` (blob, new `BaseApiService.postBlob`). |
| 🧠 Import | Pick a .csv/.xlsx (≤ 5 MB; other types refused). **Check file** sends a dry run and shows the stats and every row's result and message. **Import** is enabled only when the check found no errors and something to save (the backend rejects the whole file otherwise). The file goes as a base64 data URI with the prefix chosen from the extension — ⚠️ Excel needs `data:@file/vnd…` (not the browser's MIME). Imports are synchronous: async ones need a Celery worker. |
| Errors | Header problems arrive as a stringified `ErrorDetail` (BACKEND_REQUESTS 23); `readableImportError` shows the sentence. |
| History | `GET common/v1/tasks/` server-paged, type filter: date, type, model, status, rows done / total, first errors, user; a download button when a background export has a file. |
| Removed | The "coming soon" placeholder page: nothing uses it any more. |

## Verification results (2026-10-09)

| Check | Result |
|---|---|
| Picker | 3 groups, 19 resources for the admin; the employee (add_team only) sees Company → Teams, plus Locations and Inventory |
| Export | categories CSV and Excel downloaded; departments exported |
| Template | `category_template.xlsx` downloaded |
| File checks | .txt refused; Import disabled before a check |
| Bad headers | toast "Missing required headers: …" (readable; repeated by the backend) |
| File with an error | 2 preview rows (New, Errors with the backend's message), Import stays disabled |
| Good file | "No errors found", imported 2 new, history updated |
| **Backend** | company imports not permission-checked (22); all headers required, `parent` expects an id, re-import doesn't update, bad base64 → 500 (23) |

English, Arabic, dark mode and 390 px: no horizontal overflow, no console errors; the only 4xx was the expected
bad-header 400.
