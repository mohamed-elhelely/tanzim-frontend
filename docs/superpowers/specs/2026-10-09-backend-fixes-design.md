# Step 10 — Drop workarounds the backend fixed (design)

Date: 2026-10-09
Status: built and verified against the local backend (backend master at 672f450)

Each change below removes a frontend workaround after checking the backend fix with real requests.

| Area | Backend fix (verified) | Frontend change |
|---|---|---|
| Company users | Nested `user` update on PATCH works (name, email, phone) | Edit form no longer locks the login details; PATCH sends `user` without a password |
| Permissions | `?search=` works (name, codename) | Search box on the list |
| Companies (platform) | List supports `page`, `search`, `ordering`; phone can be cleared; DELETE deactivates; create is atomic and validates the admin email (400) | List uses `ServerTable` (server paging and search); phone always sent; still no delete button (the Active switch does the same) |
| Company locations | `full_address` is returned; deleting used places returns 400 with a message; partial PATCH works | List shows `full_address`; the delete message reaches the user through `ConfirmService` |
| Cities | Any IANA time zone is accepted | Time zone list is UTC + the browser's zones (no UTC/GMT-first special case) |

Still open (kept, listed in docs/BACKEND_REQUESTS.md): DELETE 204 with a body, partial inventory read serializers
(`omitPristine`), warehouse manager 500, warehouse code globally unique, category duplicate check on edit,
inventory deletes of used records, category cycles, accounting API not documented.

## Verification
Edited a user's preferred name (saved, `user` nested in the PATCH); permissions search "team" → the four team
codenames; companies list sends `page/page_size/search`; sites list shows the full address; no console errors and
no 4xx responses.
