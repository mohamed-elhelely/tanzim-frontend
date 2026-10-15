# Chat drawer — core messaging (design)

Date: 2026-10-15
Status: approved design, not built
API contract: [API_REFERENCE_CHAT.md](../../API_REFERENCE_CHAT.md) (`/api/chat/v1/` plus `chat.*` frames on the existing
notifications socket)

## Goal and scope

People in a company can chat from any page without leaving their work: a floating chat drawer opened from the header,
showing the company chat, their team chat, direct chats and groups they belong to.

| In v1 (core messaging) | Out of v1 (group-management follow-up) |
|---|---|
| Conversation list with unread badges and client-side search | Creating groups, adding/removing members, roles |
| Thread: history paging, send (text, files, reply, mentions), edit, delete | Conversation settings (name, avatar, description, posting policy), leave, delete group |
| Live updates, typing indicator, read markers, header unread badge | Mute / unmute |
| Starting a direct chat | Seen-by, read receipts of others (`chat.read` from other users is ignored) |
| Bell click on a chat notification opens the drawer on that chat | A full `/chat` page |

## Decisions

| Topic | Decision |
|---|---|
| Placement | Floating drawer only (no route). Header button with the total unread badge. |
| Drawer layout | Single view, ~400px wide on every screen size: conversation list ⇄ thread (back arrow). Docks at the end side (right in LTR, left in RTL). |
| State | One root signal store (`ChatStore`), the only place socket events and REST results are applied. |
| Socket | No second WebSocket: `NotificationCenterService` routes `chat.*` frames to a new `chatEvents$`. |
| New direct chat picker | `CompanyUserService.userOptions()` (company-user `?dropdown=true`, login user ids). It also lists people without chat access; picking one gives a 400 shown as a toast. A `chat/v1/users/` endpoint is requested in `BACKEND_REQUESTS_ROADMAP.md`; swapping to it changes one service method. |
| Lazy loading | The drawer UI loads on first open (`@defer (when chat.drawerOpen())` in the shell), like the activity and record drawers, so the initial bundle stays under budget. The store and API service are in core (the badge needs them from the start) and stay small. |

## Architecture and files

### Core: `src/app/core/chat/`

| File | Job |
|---|---|
| `chat.models.ts` | `Conversation`, `ChatMessage`, `ChatMember`, `ChatUserRef`, `ChatAttachment`, `UnreadSummary`, and the `ChatEvent` union (`chat.message`, `chat.message_updated`, `chat.message_deleted`, `chat.read`, `chat.conversation`, `chat.removed`, `chat.typing`). |
| `chat-api.service.ts` | Extends `BaseApiService`, paths `chat/v1/…`: `conversations()`, `conversation(id)`, `direct(userId)`, `members(id)`, `messages(id, {before, after, limit})`, `send(id, draft)` (JSON, or multipart with repeated `files` when files are attached), `edit(messageId, body)`, `remove(messageId)`, `read(id, messageId)`, `unread()`, `attachment(url)` (blob). Unwraps the envelope. |
| `chat.store.ts` | Root signal store. State: `conversations`, `listLoaded`, `unreadTotal`, `openId`, `window` (the open thread's messages and `hasOlder`), `members` of the open thread, `typing` (`conversationId → userIds`, entries expire after ~5 s), `drawerOpen`, `view` (`list` / `thread`). Subscribes to `chatEvents$` and `reconnected$`. Methods: `openDrawer(conversationId?)`, `closeDrawer()`, `openThread(id)`, `backToList()`, `loadOlder()`, `send(draft)`, `retry(clientId)`, `discard(clientId)`, `edit()`, `remove()`, `startDirect(userId)`, `typed()`. |
| `message-window.ts` | Pure functions over one thread's messages (ascending by id): merge a page, append/replace by id, resolve a pending message by `client_id`, mark deleted, mark a pending message failed, compute smallest/largest server id. Tested alone. |

### Change: `NotificationCenterService`

- `onMessage`: frames whose `type` starts with `chat.` go to a new `chatEvents$` (not to `incoming$`).
- `reconnected$`: emits on every `onopen` after the first one of a session.
- `send(frame)`: writes JSON to the open socket; does nothing when it is not open.

### Feature UI: `src/app/features/chat/`

| Component | Job |
|---|---|
| `chat-drawer.component` | `p-drawer`, end side, ~400px (full width under 400px), hosts list or thread by `store.view()`. |
| `conversation-list.component` | Search box (client filter, 300 ms debounce), "New chat" button, rows: avatar/icon, title, preview, time, unread badge. Loading and empty states. |
| `chat-thread.component` | Header (back, title, member count or "left the company"), scrollable message list with day separators, "New messages ↓" pill, typing line, composer or the read-only note. |
| `message-bubble.component` | Sender, body with rendered mentions, reply preview, attachments, edited/deleted states, system messages, pending/failed states with Retry/Remove, message menu. |
| `message-composer.component` | Textarea, `@` member picker, reply chip, file picker with client-side limits, character counter. |
| `new-chat-dialog.component` | People picker on `userOptions()`, excluding me; on pick `store.startDirect(userId)` then opens that thread. |

### Other changes

- Header: chat button (`pi pi-comments`) with the `unreadTotal` badge (same style as the bell, `99+` cap), visible only
  when `access.can('access_chat') && access.can('view_chat')`.
- Shell: `@defer (when chat.drawerOpen()) { <app-chat-drawer> }`; the store starts with the shell when the user has chat
  access and stops on sign-out (state cleared).
- Bell: clicking a notification whose `data.kind === 'chat'` calls `store.openDrawer(data.conversation_id)`.
- i18n: a `chat.*` block in `src/assets/i18n/en.json` and `ar.json`.
- Docs: this spec, `docs/API_REFERENCE_CHAT.md`, the `chat/v1/users/` request in `BACKEND_REQUESTS_ROADMAP.md`,
  `ARCHITECTURE.md` and `CODE_MAP.md`.

## Data flow

**Start.** With chat access: `GET unread/` → `unreadTotal` (`messages`). Nothing else until the drawer opens.

**Drawer opens.** List view loads `GET conversations/` once (unpaginated) and keeps it in the store; later opens reuse it
(socket events keep it current). Search filters the loaded list by title (localized name, peer name).

**Open a thread.**

1. `GET conversations/{id}/messages/?limit=50`; reaching the top loads `before=<smallest id>` until a page returns fewer
   than 50 (`hasOlder = false`).
2. `GET conversations/{id}/members/` once per opened thread (mention picker and `@[id]` rendering).
3. If the thread has unread messages: `POST read/` with the newest message id, set the row's `unread_count` to 0 and
   lower `unreadTotal` at once; afterwards `NotificationCenterService.refresh()` so the bell matches (the backend
   marks the chat's bells read).
4. While the thread is open and the drawer visible, incoming messages trigger another `read` (debounced ~1 s).

**Send.**

1. `client_id = crypto.randomUUID()`; a pending bubble (`status: 'pending'`) is appended.
2. POST JSON, or multipart when files are attached.
3. Success: the pending bubble is replaced by the server message; the `chat.message` echo is de-duplicated by
   `client_id` / id. The conversation moves to the top with the new `last_message`.
4. Network error or 5xx: bubble `failed`, **Retry** resends with the same `client_id` (the backend returns the original
   if it was stored). 4xx: bubble `failed` with the server's message, **Remove** discards it.

**Socket events** (applied by the store):

| Event | Effect |
|---|---|
| `chat.message` | Conversation to the top, `last_message` set. If not from me and its thread is not open-and-visible: `unread_count + 1`, `unreadTotal + 1`. If its thread is open: append to the window; a message from a typing user clears their typing entry. Unknown conversation: fetch `GET conversations/{id}/` and insert it. |
| `chat.message_updated` | Replace in the window and in `last_message` when it is that message. |
| `chat.message_deleted` | Mark deleted in the window and in `last_message`. |
| `chat.read`, `user_id` = me | Read from another tab or device: that row's `unread_count = 0`, refetch `unread/`. |
| `chat.read`, someone else | Ignored in v1. |
| `chat.conversation` | Refetch `GET conversations/{id}/` and replace the row (covers `can_post` after `role_changed` or a policy change). If its thread is open and the action is `member_added` / `member_removed`, refetch members. |
| `chat.removed` | Remove the row, subtract its unread from `unreadTotal`; if its thread is open, go back to the list with a toast. |
| `chat.typing` | Add the user to `typing[conversationId]` for ~5 s (timer restarts on repeat). |

**Typing out.** On composer input, when `can_post`: `send({action: 'typing', conversation_id})`, at most once per 3 s
per conversation.

**Reconnect** (`reconnected$`):

1. Refetch `unread/`, and the conversation list if it was loaded.
2. Open thread: `messages?after=<largest id>` repeated while a page returns 50 rows, merged; then refetch the newest
   window (`limit=50`) so edits and deletions apply.
3. Retry pending sends with their `client_id`.

## UI behavior

### Conversation list

- Title by kind: company/team chats use `name_ar` in Arabic (falling back to `name_en`), `name_en` in English, with a
  building (company) or users (team) icon; direct chats use `other_user.name` with a muted "left the company" tag when
  `other_user.is_active` is false; groups use the avatar image or initials.
- Preview: "You: …" for my messages; "Attachment" for a message without body; localized system text from `data`;
  "Message deleted"; mention tokens as `@Name` when known, otherwise `@user`.
- Time: `HH:mm` for today, otherwise a short date, in the app language.
- Unread: bold title and a count badge.

### Thread

- Oldest at top, newest at bottom; day separators. Sticks to the bottom unless the user scrolled up, then a "New
  messages ↓" pill appears.
- My bubbles at the end side, others at the start side (flips in RTL). Consecutive messages of one sender within
  5 minutes are grouped (name and avatar once). System messages are centered gray lines rendered from `data`
  (`role_changed`: "<name> is now <role>", `posting_policy`: "Only admins can post now" / "Everyone can post now").
- Mentions: `@[id]` renders as a highlighted `@Name` from the members list (`@user` when unknown); `@all` highlighted.
- Reply preview: a quoted block (sender, body cut); clicking scrolls to the original if it is in the window.
- Attachments: images (by extension) load as blobs into object URLs shown as thumbnails; other files are a chip with
  name and size. Clicking downloads the blob under its `filename`. Object URLs are revoked when the thread closes.
- "Edited" label when `edited_at` is set; deleted messages show "This message was deleted" in italics.
- Message menu (hover on desktop, long-press on touch):
  - Reply.
  - Copy (body text with mentions as `@Name`).
  - Edit: my message, not a system message, within 24 h of `created_at`. Inline editor; Esc cancels.
  - Delete: my message, or `my_role` is `owner`/`admin`, or `access.can('change_chatmoderation')` (company admins hold
    it too). Confirmed through `ConfirmService`.

### Composer

- Enter sends, Shift+Enter is a new line; on touch devices Enter is a new line and the send button sends.
- Character counter shown from 3,800 characters; sending is blocked above 4,000 (after trimming).
- Files: up to 5, 10 MB each, extensions png, jpg, jpeg, gif, webp, pdf, doc, docx, xls, xlsx, ppt, pptx, csv, txt,
  zip; rejected files are named in a toast. Chips show selected files with a remove button.
- `@` opens a picker of the thread's members (excluding me), filtered as the user types. The textarea shows `@Name`;
  a token map turns it into `@[id]` on send (and back when editing a message). `@all` is offered when `my_role` is
  `owner`/`admin`, `change_chatmoderation` is held, or `members_count <= 20`.
- Reply chip above the box with a close button.
- When `can_post` is false the composer is replaced by a note: direct chat with `other_user.is_active === false` →
  "This person is no longer in the company"; `posting_policy === 'admins_only'` → "Only admins can post in this chat";
  otherwise "You can only read this chat".

### Errors

- Request errors are already `AppError`s with toasts from the error interceptor.
- 404 on the open thread (messages, read, send): close the thread, drop the conversation, toast.
- 403 on send: refetch the conversation (updates `can_post`); the bubble shows the message as failed.
- 400 from `direct`: toast with the server's message ("This user cannot be messaged.").

## Testing

Karma + Jasmine, `src/app/testing/api-testing.ts` helpers, new `src/app/testing/chat-fixtures.ts` (conversation, message,
member factories). Tests first per unit.

| Spec | Covers |
|---|---|
| `message-window.spec.ts` | Merge/de-dupe by id and `client_id`, ascending order, older pages, `after` catch-up pages, replace on update, deletions, pending resolve/fail. |
| `chat-api.service.spec.ts` | Paths and params (`limit`, `before`, `after`), JSON vs multipart (repeated `files`), envelope unwrap, attachment blob. |
| `chat.store.spec.ts` | Each socket event above; unread rules (open-and-visible vs not); own `chat.read`; `chat.removed` on the open thread; typing expiry (fake timers); outgoing typing throttle; reconnect catch-up loop; send success, retry with the same `client_id`, 4xx failure; read debounce and bell `refresh()`. |
| `notification-center.service.spec.ts` (extended) | `chat.*` frames to `chatEvents$` and not `incoming$`; `reconnected$` only after the first open; `send()` on the open socket. |
| Component specs | List (titles by kind and language, previews, empty state); bubble (mentions, system, deleted, edited, mine vs theirs, pending/failed); composer (Enter vs Shift+Enter, token serialization, file limits, `can_post` notes, `@all` offer); thread (Edit/Delete visibility); header (badge only with chat access); bell click with `kind: chat` opens the drawer. |

After implementation: `ng test`, `ng build` (initial bundle under budget), and one browser pass against the local
backend (open drawer, send, receive live in a second user's session).

## Backend request

`GET chat/v1/users/?search=` — active users of my company who hold `access_chat` + `view_chat` (`{id, name}`), for the
new-chat picker. Logged in `BACKEND_REQUESTS_ROADMAP.md`.
