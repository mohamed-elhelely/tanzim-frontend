# Step 12 — Notifications and Billing (design)

Date: 2026-10-09
Status: built and verified against the local backend (served with uvicorn so the WebSocket works)

## Notifications

| Topic | Decision |
|---|---|
| State | `NotificationCenterService` (`core/notifications`), started by the shell: loads `my-notifications/` (latest 20) and `unread-count/`, then opens `ws(s)://…/ws/notifications/{user_id}/?token=…`. Pushed notifications go on top and bump the count; `connection_established` sets the count. Ping every 30 s; reconnect with a growing delay (2 s → 60 s) unless closed with 4001/4003; closed and cleared when the user changes. |
| ⚠️ Socket payload | The socket names two fields differently from the HTTP API (`type`/`timestamp` vs `notif_type`/`created_at`); `toAppNotification()` accepts both. |
| Header bell | Unread badge (99+), a popover with the latest 6, "Mark all as read", "View all". Clicking an item marks it read. |
| Page | `/notifications` for every signed-in user (platform staff too): All / Unread filter, "Mark all as read". There is no bulk endpoint, so marking all sends one request per unread item. |
| Shared pieces | `NotificationItemComponent` (`shared/components`) renders one row (icon and colour by type, unread dot, relative time); `timeAgo` pipe (`shared/pipes`) uses `Intl.RelativeTimeFormat` in the current language. |

## Billing

| Topic | Decision |
|---|---|
| Who | Sidebar entry for company admins (`roles: ['COMPANY']`); the backend lets any company user read it. |
| Subscription | Plan, status, auto-renew, period, days remaining, next billing date, licensed users, billing email, modules. 404 → "no active subscription". |
| Invoices | Read-only table (number, status, dates, total, amount due) with a details dialog: items, totals, notes, status history. Creating, issuing and paying invoices is the platform's job. |

## Verification results (2026-10-09)

| Check | Result |
|---|---|
| WebSocket with `?token=` (uvicorn) | connects; `connection_established` carries the unread count; `{"action":"ping"}` → `pong` |
| Live push (`notify_users` from the shell) | badge 3 → 4 without reload; popover shows it with the right icon and time |
| Mark one / mark all | badge 4 → 3 → hidden |
| Billing as company admin | plan, modules, 2 invoices; dialog shows items, totals and history |
| Employee | no Billing entry; bell works |
| Platform staff | `/notifications` opens |
| **Backend security** | an employee with no permissions could `create_draft`, `add_item`, `issue` and `mark_paid` their own company's platform invoices (the viewset only checks `IsAuthenticated`) — raised as BACKEND_REQUESTS item 0 |
| Platform staff creating invoices | 403 "No company associated with user" — raised |

English, Arabic, dark mode and 390 px; no console errors and no 4xx in the walk.
