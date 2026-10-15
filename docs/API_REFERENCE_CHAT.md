# Chat API Reference

In-company chat for the Tanzim ERP: the company chat, team chats, direct chats and groups. This document is for
frontend and mobile developers. It describes the code as it is; the general conventions of the rest of the API (login,
refresh, rate limit) are in [API_REFERENCE.md](API_REFERENCE.md). How the module works inside is in the backend repo's
`LOGIC_CHAT.md`.

## Contents

- [Conventions](#conventions)
- [Permissions](#permissions)
- [Conversations](#conversations)
- [Members](#members)
- [Per-user state: mute, read, unread](#per-user-state-mute-read-unread)
- [Messages](#messages)
- [Real-time (WebSocket)](#real-time-websocket)
- [Bell notifications](#bell-notifications)
- [Limits](#limits)

---

## Conventions

### Base path, auth, envelope

| Item | Value |
|---|---|
| Base path | `/api/chat/v1/` (all paths below are relative to it) |
| Auth | `Authorization: Bearer <access_token>` (JWT, see *Authentication* in API_REFERENCE.md) |
| Ids | Integers (conversation, message, attachment, user ids) |
| Datetimes | ISO 8601 with offset |
| Rate limit | 60 requests/minute per user/IP (429) |

Every JSON response is wrapped by the standard renderer. Note the key is `metadata`:

```json
{
  "success": true,
  "data": { "...": "payload (object or array)" },
  "metadata": { "timestamp": "2026-10-15T09:30:00.123456Z", "version": "1.0", "total_count": 3 }
}
```

- `metadata.total_count` is present for arrays (the page length, or the total when paginated).
- Errors: `{"success": false, "data": null, "metadata": {...}, "error": {"code": 400, "message": "...", "errors": {...}}}`.
  Field validation errors are in `error.errors` (`{"body": ["..."]}`) and `error.message` is `"Unknown error"`. For
  errors raised as `{"detail": [...]}` (for example `Direct chats cannot be changed.`) `error.message` carries that
  value as is, which can be an array with one sentence. Permission and not-found errors have a plain sentence in
  `error.message`.
- `204` responses (delete, leave, kick) have an empty body. The attachment download is a raw file, not JSON.

### Scope: active company

Chat acts in your **active company** (your first live company membership, the company every other API acts in).
Conversations, messages, attachments and typing of other companies do not exist for you (404). A direct chat needs the
other person's active company to match yours.

### Pagination

| Endpoint | Behavior |
|---|---|
| `GET conversations/` | Not paginated by default. Send `page` and/or `page_size` (default 25, max 200) to get a page; then `metadata.next` / `metadata.previous` / `metadata.total_count` are set |
| `GET conversations/{id}/messages/` | Cursor based (`before`, `after`, `limit`), see [Messages](#messages). `page` is not supported |
| `GET conversations/{id}/members/`, `GET messages/{id}/seen-by/` | Full list, no paging |

### Status codes

| Code | When |
|---|---|
| 200 / 201 / 204 | OK / created / done without body |
| 400 | Validation or business rule: empty message, body too long, bad file, `reply_to` of another chat, edit window passed, chat with yourself, user cannot use chat, mentioning a non-member or former employee, `@all` without right, bad cursor or `limit`, group-only action on a non-group, direct chat roles/edits, last owner demotion |
| 401 | Missing or invalid token |
| 403 | No chat access (`access_chat` + `view_chat`), missing admin right, posting not allowed, editing someone else's message, leaving a synced or direct chat, deleting a non-group |
| 404 | The conversation, message, attachment or member does not exist **or you are not a member of it**, or it belongs to another company. Non-members always get 404, never 403 |
| 429 | Rate limit |

---

## Permissions

| Permission | Needed for |
|---|---|
| `access_chat` + `view_chat` | Every chat endpoint, `?dropdown=true` requests included (403 `You do not have access to the chat module.` otherwise). The core group **Chat - Read Only** holds both; so does **Read Only** (all modules) |
| `add_chatgroup` | Creating groups (`POST conversations/`). Checked in the service, 403 `You do not have permission to create chat groups.` |
| `change_chatmoderation` | Acting as a chat admin in the chats **you are a member of**: rename/settings, roles, add/remove members, delete messages, delete groups, `@all`. Gives no posting right |
| Company admin / full access (`is_company_admin` or a role flagged admin) / superuser | Holds every codename above, so it moderates, creates groups and can always post (even in read-only or admins-only chats) |

Role inside a chat (`owner`, `admin`, `member`, `readonly`) decides what a member may do in that chat; see
[Posting rules](#posting-rules). Moderation never reaches chats you are not a member of (404).

Who can be added, messaged or mentioned: an active user of your company who also holds `access_chat` + `view_chat`.

---

## Conversations

### Conversation object

```json
{
  "id": 12,
  "kind": "group",
  "name_en": "Warehouse leads",
  "name_ar": "قادة المستودع",
  "title": "Warehouse leads",
  "description": "Daily coordination",
  "avatar": "http://host/media/chat/avatars/lead.png",
  "team": null,
  "posting_policy": "everyone",
  "last_message_at": "2026-10-15T09:28:11.402113+03:00",
  "created_at": "2026-10-10T08:00:00+03:00",
  "other_user": null,
  "unread_count": 3,
  "members_count": 8,
  "last_message": { "...": "a message object, or null" },
  "my_role": "admin",
  "muted_until": null,
  "mute_mentions": false,
  "is_muted": false,
  "can_post": true
}
```

| Field | Notes |
|---|---|
| `kind` | `company`, `team`, `direct`, `group` |
| `title` | Direct chats: the other person's name; otherwise `name_en`. Use `name_ar` yourself for Arabic UIs |
| `avatar` | URL or `null` |
| `team` | Team id for `team` chats, else `null` |
| `posting_policy` | `everyone` or `admins_only` |
| `other_user` | Direct chats: `{id, name, is_active}` of the other person (`is_active: false` = left the company); else `null` |
| `unread_count` | Messages after your read marker, not sent by you, not deleted. System messages count |
| `members_count` | Live members (former colleagues included) |
| `last_message` | Full message object (see [Message object](#message-object)) or `null` |
| `my_role` | Your role in this chat |
| `muted_until`, `is_muted`, `mute_mentions` | Your mute state. "Forever" is `9999-12-31T00:00:00Z` |
| `can_post` | Whether you may post right now (role x policy x company-admin bypass) |

### `GET conversations/`

Your live conversations, newest activity first (`last_message_at` desc, never-used chats last). Anyone with chat access.

| Query | Type | Meaning |
|---|---|---|
| `kind` | `company` / `team` / `direct` / `group` | Exact filter. Unknown value: empty list |
| `search` | string | Case-insensitive match on `name_en`, `name_ar`, or (direct chats) the other person's first/last name |
| `page`, `page_size` | int | Optional paging, see [Pagination](#pagination) |

```http
GET /api/chat/v1/conversations/?kind=group&search=ware
```

```json
{ "success": true, "data": [ { "id": 12, "kind": "group", "...": "..." } ],
  "metadata": { "timestamp": "...", "version": "1.0", "total_count": 1 } }
```

### `GET conversations/{id}/`

One conversation object. 404 for non-members.

### `POST conversations/` - create a group

Needs `add_chatgroup`. The creator becomes `owner`. Bell `added` goes to the other members.

| Body | Type | Rules |
|---|---|---|
| `name_en` | string, required | 1-150 chars, not blank |
| `name_ar` | string | 0-150 chars |
| `description` | string | any length |
| `member_ids` | int[] | Optional; duplicates and your own id are ignored |

```json
{ "name_en": "Warehouse leads", "name_ar": "قادة المستودع", "member_ids": [45, 51, 60] }
```

`201` with the conversation object. Errors: `403` no `add_chatgroup`; `400` `{"user_ids": ["Some users are not in your company."]}`
(unknown, inactive or other-company user) or `{"user_ids": ["Some users cannot use chat."]}`.

### `POST conversations/direct/`

Body `{"user_id": 45}`. Returns the existing direct chat (`200`) or creates it (`201`) with both people as `member`.
Errors `400`: `You cannot start a chat with yourself.` / `This user cannot be messaged.` (not in your company, inactive,
or without chat access).

### `PATCH conversations/{id}/`

Chat `owner`/`admin` or a moderator. Not for `direct` (400). Works on group, team and company chats. Send only the fields
to change. JSON, or `multipart/form-data` for `avatar`.

| Field | Type | Notes |
|---|---|---|
| `name_en` | string | 1-150, not blank |
| `name_ar` | string | 0-150 |
| `description` | string | |
| `avatar` | image file | Multipart only. Cannot be cleared through the API |
| `posting_policy` | `everyone` / `admins_only` | A change posts a system message (`{"event": "posting_policy", "posting_policy": ...}`) |

Returns the conversation object. `403 Only chat owners and admins can do this.` for plain members.

```http
PATCH /api/chat/v1/conversations/12/
Content-Type: multipart/form-data

name_en=Warehouse leads&avatar=<lead.png>
```

### `DELETE conversations/{id}/`

`group` only, by its `owner` or a moderator. `204`. `403` otherwise (`This chat cannot be deleted.` for company, team,
direct). Members get `chat.removed`.

---

## Members

### Member object

```json
{ "user": { "id": 45, "name": "Sara Ali", "is_active": true }, "role": "member", "is_synced": false,
  "created_at": "2026-10-10T08:00:00+03:00" }
```

`is_synced: true` means the membership follows company membership (company and team chats) and cannot be left or removed
by hand. In the members list and `seen-by`, `is_active` is always `true` (the flag is only computed for message senders and
direct-chat peers).

### `GET conversations/{id}/members/`

Any member. All live members, ordered by first then last name. Former colleagues are included.

### `POST conversations/{id}/members/`

`group` only, by `owner`/`admin` or a moderator (`400 Members of this chat are managed automatically.` for other kinds).

```json
{ "user_ids": [51, 60] }
```

`201` with the full members list. Already-members are skipped silently; new members start with nothing unread and get the
`added` bell. `400` for users outside the company or without chat access. A removed member re-added gets their old row back.

### `PATCH conversations/{id}/members/{user_id}/`

Body `{"role": "admin"}` with `owner`, `admin`, `member`, `readonly`. By `owner`/`admin` or a moderator; not in `direct`
chats (400). Returns the member object. Posts a system message (`{"event": "role_changed", "user_id", "role"}`) and sends
the target a `role_changed` bell (unless it is you).

| Error | When |
|---|---|
| 403 `Only an owner can grant or remove ownership.` | Granting/removing `owner` without being an owner or moderator |
| 400 `A chat needs at least one owner.` | Demoting the only owner |
| 404 `Member not found.` | Target is not a live member |

Setting the role a member already has changes nothing.

### `DELETE conversations/{id}/members/{user_id}/`

`group` only, by `owner`/`admin` or a moderator. `204`. The removed user gets `chat.removed`. Errors: `400 Leave the chat
instead.` (yourself), `403 Only an owner can remove an owner.`, `404 Member not found.`

### `POST conversations/{id}/leave/`

Groups only, not synced. `204`. `403 You cannot leave this chat.` for company, team and direct chats. When the last owner
leaves, the oldest admin (else the oldest member) becomes owner; when the last member leaves the group is deleted.

---

## Per-user state: mute, read, unread

### `POST conversations/{id}/mute/`

```json
{ "until": "2026-10-16T08:00:00+03:00", "mute_mentions": false }
```

| Field | Notes |
|---|---|
| `until` | Future datetime. `null` or omitted = forever. A time in the past: `400 {"until": ["Choose a time in the future."]}` |
| `mute_mentions` | Default `false`. `true`: mentions and replies are muted too |

Returns the conversation object. Effects on bells are in [Bell notifications](#bell-notifications). Muting never stops
socket events or the unread count.

### `POST conversations/{id}/unmute/`

No body. Returns the conversation object.

### `POST conversations/{id}/read/`

Body `{"message_id": 881}`. Moves your read marker forward only (an older id changes nothing). The message must belong to
this chat (deleted ones too), else `400 {"message_id": ["That message is not in this chat."]}`. Also marks your unread chat
bells of this conversation as read.

```json
{ "success": true, "data": { "last_read_message_id": 881 }, "metadata": { "...": "..." } }
```

When the marker moves, a `chat.read` event is pushed (audience rules below).

### `GET unread/`

Totals for the app badge: `{"conversations": 2, "messages": 7}` (chats with unread messages, unread messages). Counts
follow the same rules as `unread_count`.

---

## Messages

### Message object

```json
{
  "id": 884,
  "conversation": 12,
  "sender": { "id": 45, "name": "Sara Ali", "is_active": true },
  "body": "@[51] stock count moved to 3 pm",
  "data": {},
  "reply_to": { "id": 881, "sender": { "id": 51, "name": "Omar Nasr", "is_active": true }, "body": "When is the count?", "is_deleted": false },
  "attachments": [
    { "id": 17, "filename": "count.xlsx", "content_type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "size": 20480, "url": "/api/chat/v1/messages/884/attachments/17/" }
  ],
  "mentions": [51],
  "mentions_all": false,
  "edited_at": null,
  "is_deleted": false,
  "created_at": "2026-10-15T09:28:11.402113+03:00",
  "client_id": "6f1c1c1e-6f4e-4f7b-9d2e-6c6d1a0b9f10"
}
```

| Field | Notes |
|---|---|
| `sender` | `null` for system messages (role changes, posting policy). `is_active: false` = left the company |
| `body` | `""` when deleted. Deleted messages stay in history with `is_deleted: true`, empty `body`, `attachments`, `mentions` |
| `data` | `{}` for user messages. System messages: `{"event": "role_changed", "user_id": 51, "role": "admin"}` or `{"event": "posting_policy", "posting_policy": "admins_only"}`; `body` holds an English sentence, render your own text from `data` |
| `reply_to` | Preview (`body` cut to 200 chars) or `null` |
| `mentions` | User ids of `@[id]` tokens |
| `attachments[].url` | Relative path of the authenticated download |
| `client_id` | Echo of the id the sender supplied, or `null` |

### `GET conversations/{id}/messages/`

Any member. History, newest first, deleted messages included.

| Query | Type | Rules |
|---|---|---|
| `limit` | int | Default 50, values above 100 are capped to 100 |
| `before` | message id | Messages with a lower id. Use to load older pages: pass the smallest id you have |
| `after` | message id | Messages with a higher id: the **oldest** `limit` of them, still returned newest first. Use to catch up after a reconnect: pass the largest id you have and repeat while you get `limit` rows |

`before`, `after`, `limit` must be positive whole numbers of at most 18 digits; anything else (including `0`, `-1`, `abc`)
is `400 {"limit": ["limit must be a positive whole number."]}` (keyed by the parameter). `before` and `after` can be
combined. An empty page is `[]`.

```http
GET /api/chat/v1/conversations/12/messages/?before=884&limit=30
```

### `POST conversations/{id}/messages/`

Any member who may post (see [Posting rules](#posting-rules)). JSON or `multipart/form-data`.

| Field | Type | Rules |
|---|---|---|
| `body` | string | At most 4,000 chars after trimming. May be empty only when files are attached |
| `reply_to` | message id or null | Must be in the same conversation (deleted messages allowed) |
| `files` | file[] | Multipart only, repeat the field. Up to 5 files, 10 MB each, allowed extensions in [Limits](#limits) |
| `client_id` | UUID or null | Idempotency key, see below |

JSON example:

```http
POST /api/chat/v1/conversations/12/messages/
Content-Type: application/json

{ "body": "@[51] stock count moved to 3 pm", "reply_to": 881, "client_id": "6f1c1c1e-6f4e-4f7b-9d2e-6c6d1a0b9f10" }
```

Multipart example: `body=See attached`, `files=<count.xlsx>`, `files=<photo.png>`, `client_id=...`.

Response: the message object (above), `201` when created.

**Idempotency.** Generate a UUID per outgoing message and resend the same `client_id` when a request times out or the
socket was lost. If a message with that `client_id` from you already exists in the chat (even deleted), you get the
original with `200` instead of a duplicate. The uniqueness is per conversation and sender; a concurrent duplicate is also
absorbed (one of them gets `201`, the other `200`). Retries return the stored message and ignore the new body.

**Mentions.**

- `@[45]` mentions user 45. Every id must be a member of this chat who is still in the company, otherwise
  `400 {"body": ["You can only mention members of this chat."]}`. Send the display text yourself (the body keeps the raw
  token; render it using `mentions` and your member list).
- `@all` mentions everyone. It must stand alone as a word: not inside an email (`a@all.com`), not `@all-hands` or
  `@all_x`. Allowed for the chat's `owner`/`admin`, moderators and company admins, or for anyone when the chat has 20 or
  fewer live members; otherwise `400 {"body": ["Only chat admins can use @all in this chat."]}`. Sets `mentions_all`.

Errors: `404` not a member; `403 You cannot post in this chat.`; `403 This person is no longer in the company.` (direct chat
whose other member left); `400 {"body": ["Write a message or attach a file."]}`, body too long, bad extension
(`{"files": ["x.exe: this file type is not allowed."]}`), file over 10 MB, more than 5 files, `reply_to` of another chat.

### `PATCH messages/{id}/`

Body `{"body": "new text"}`. Only the sender, within 24 hours of sending, and only the text (attachments stay). The new
body is validated like a new message (length, mentions, `@all` rule) and may be empty only if the message has attachments.
Sets `edited_at`, replaces mentions, pushes `chat.message_updated`. No new bells. Returns the message object.
`403 You can only edit your own messages.` (system messages included), `400` after the window, `404` unknown, deleted or
foreign message.

### `DELETE messages/{id}/`

The sender, or the chat `owner`/`admin`, or a moderator (system messages can be deleted by admins). `204`. The message
becomes `is_deleted` (still returned by history), `chat.message_deleted` is pushed. `403 You cannot delete this message.`

### `GET messages/{message_id}/attachments/{attachment_id}/`

Any member of the chat. Streams the file. Needs the `Authorization` header, so fetch it as a blob (an `<img src>` cannot
send it).

| Header | Value |
|---|---|
| `Content-Disposition` | `attachment; filename="<original name>"` (always a download, never inline) |
| `Content-Type` | Guessed from the file name extension, else `application/octet-stream`. The `content_type` the uploader claimed is never used |

`404` for non-members, deleted messages or chats, wrong ids or a missing file.

### `GET messages/{id}/seen-by/`

Any member. Array of `{id, name, is_active}` of the live members whose read marker is at or after this message, excluding
the sender. Former members can appear and show `is_active: true`.

### Posting rules

`can_post` on the conversation object is the answer. Company admins always post. Otherwise:

| Role | `posting_policy: everyone` | `posting_policy: admins_only` |
|---|---|---|
| owner | yes | yes |
| admin | yes | yes |
| member | yes | no |
| readonly | no | no |

The company chat is `admins_only` by default (company admins and members promoted to `admin` post); team and other chats
are `everyone`. Granting someone posting rights in the company chat means setting their role to `admin`.

---

## Real-time (WebSocket)

Chat rides the existing notifications socket, no extra route.

```
ws(s)://<host>/ws/notifications/{user_id}/?token=<access_jwt>
```

Authentication, close codes (`4001` not authenticated, `4003` user id mismatch, `4000` error), `connection_established`,
and `ping`/`pong` are described in *Real-time notifications (WebSocket)* in API_REFERENCE.md. Browsers pass the access
token as `?token=`; other clients may send the `Authorization: Bearer` header.

Events are pushed **after the database transaction commits**, to members who are still in the company (former
colleagues get none). Delivery is best effort and nothing is queued for offline clients. Every frame is JSON with a
`type`:

| `type` | Keys | Sent to |
|---|---|---|
| `chat.message` | `conversation_id`, `message` (message object, also system messages) | Active members, sender included |
| `chat.message_updated` | `conversation_id`, `message` | Active members |
| `chat.message_deleted` | `conversation_id`, `message_id` | Active members |
| `chat.read` | `conversation_id`, `user_id` (the reader), `message_id` (their new marker) | Only when the marker moved. Direct chat: both people. Group with 20 or fewer active members: all of them. Company, team and larger groups: the reader's own sockets only |
| `chat.conversation` | `conversation_id`, `action`, see below | Active members |
| `chat.removed` | `conversation_id` | A user removed from the chat (kick, sync removal, team or company departure), and every active member when a group or team chat is deleted |
| `chat.typing` | `conversation_id`, `user_id` | Other members, see below |

`chat.conversation` actions:

| `action` | Extra keys | When |
|---|---|---|
| `member_added` | `user_id` | A member joined (also on chat creation, one event per member, and for yourself: refetch the conversation) |
| `member_removed` | `user_id` | A member was removed (the removed user gets `chat.removed` instead) |
| `role_changed` | `user_id`, `role` | A role changed, including an owner's successor after the owner left |
| `updated` | none | Name, description, avatar or posting policy changed |

Events carry no full conversation; refetch `GET conversations/{id}/` to see the new state.

### Typing (client to server)

Send on the same socket:

```json
{ "action": "typing", "conversation_id": 12 }
```

| Rule | Value |
|---|---|
| Who | Members who may post there in their active company. Read-only members, members of admins-only chats and non-members: nothing is sent |
| Throttle | One event per user per conversation per 3 seconds (extra frames are dropped); send at most that often |
| Audience | Other members still in the company. Chats with more than 200 other members send nothing |
| Stored | Never |
| Output | Others receive `{"type": "chat.typing", "conversation_id": 12, "user_id": 45}`; show it for a few seconds |
| Bad frames | Not JSON, not an object, an unknown `action`, or a `conversation_id` that is not an integer in 1..10^18 are ignored silently (the socket stays open) |

The answer "may this user type here" is cached for 60 seconds, so a role or admin-flag change can take up to a minute to
apply to typing.

### Reconnect guidance

1. Reconnect with a fresh access token after any drop (an open socket survives token refresh, a new one needs the new token).
2. Refetch `GET conversations/` and `GET unread/`.
3. For each open conversation call `GET conversations/{id}/messages/?after=<largest id you have>` (repeat while a full
   page returns), and re-apply edits/deletions by also refetching the visible window.
4. On `chat.removed` drop the conversation locally. On `chat.conversation` refetch it.
5. Use `client_id` on every send so retries are safe.

---

## Bell notifications

Bells use the normal notifications API and socket (`new_notification`). Only these reach the bell; ordinary messages
only move the unread badge. Former colleagues get none.

| Trigger | Who | `data.event` |
|---|---|---|
| Any message in a **direct** chat | The other person, unless the chat is muted | `message` |
| A message mentioning you (`@[id]` or `@all`) in a non-direct chat | The mentioned members | `message` |
| A reply to your message in a non-direct chat | The author of the replied message | `message` |
| You are added to a group (at creation or later) | The added members, not the actor | `added` |
| Your role in a chat changed | The target, not when you changed it yourself | `role_changed` |

A user gets at most one bell per message (mention wins over reply). Sending your own message never rings you.

`Notification.data` always has `kind: "chat"` and `conversation_id`:

| `event` | Extra keys | Example |
|---|---|---|
| `message` | `message_id` (latest message in the collapsed notification), `count` (starts at 1) | `{"kind": "chat", "event": "message", "conversation_id": 12, "message_id": 884, "count": 3}` |
| `added` | none | `{"kind": "chat", "event": "added", "conversation_id": 12}` |
| `role_changed` | none | `{"kind": "chat", "event": "role_changed", "conversation_id": 12}` |

Title/message are provided in English and Arabic (`title`, `title_ar`, `message`, `message_ar`). Message previews are
the body with whitespace collapsed and cut to 80 characters; attachment-only messages show `Attachment` / `مرفق`.

**Mute.** A chat is muted while `muted_until` is in the future. Muted: direct-message bells stop. Mentions and replies
still ring unless `mute_mentions` is true. `added` and `role_changed` bells ignore mute.

**Collapsing.** If you already have an unread `message` bell for the same conversation, no new row is created: its
`count` grows, `message_id` moves to the newest message, the title becomes "N new messages in <chat>", the text becomes
"<sender>: <preview>", `created_at` is refreshed, and it is pushed again over the socket (`new_notification` with the same
`id`; replace the existing item). `added` / `role_changed` bells are separate rows.

**Clearing.** `POST conversations/{id}/read/` marks all your unread chat bells of that conversation as read.

Messages with 200 or more bell recipients ring from a background worker, so bells can lag slightly in the company chat.

---

## Limits

| Item | Limit | Where |
|---|---|---|
| Message body | 4,000 characters (after trimming) | `BODY_MAX_LENGTH` |
| Files per message | 5 | `MAX_FILES` |
| File size | 10 MB (10,485,760 bytes) | `MAX_FILE_SIZE` |
| Allowed extensions | png, jpg, jpeg, gif, webp, pdf, doc, docx, xls, xlsx, ppt, pptx, csv, txt, zip | `ALLOWED_EXTENSIONS` |
| Edit window | 24 hours | `EDIT_WINDOW_HOURS` |
| `@all` open to everyone | chats with 20 or fewer live members | `ALL_MENTION_OPEN_LIMIT` |
| History page | default 50, max 100 | `PAGE_SIZE`, `MAX_PAGE` |
| Conversation list paging | default 25, max 200 | `OptionalPageNumberPagination` |
| Group name / chat names | 150 characters | model fields |
| Reply preview | 200 characters | `ReplyPreviewSerializer` |
| Bell preview | 80 characters | `PREVIEW_LENGTH` |
| Read receipts to other members | direct chats, and groups with 20 or fewer active members | `READ_RECEIPT_MEMBER_LIMIT` |
| Typing throttle | 1 event / 3 s per user per chat | `TYPING_THROTTLE_SECONDS` |
| Typing audience | at most 200 other members | `TYPING_MAX_RECIPIENTS` |
| Typing permission cache | 60 s | `MEMBERSHIP_CACHE_SECONDS` |
| Socket fan-out via Celery | audiences of 200 or more users | `INLINE_FANOUT_LIMIT` |
| Bells via Celery | 200 or more recipients | `INLINE_FANOUT_LIMIT` |
| Mute "forever" | stored as `9999-12-31T00:00:00Z` | `FOREVER` |
