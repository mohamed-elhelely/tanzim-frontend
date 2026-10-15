# Chat Drawer (core messaging) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A floating chat drawer (conversation list ⇄ thread) opened from the header, with live updates over the
existing notifications socket, typing indicators, read markers and a header unread badge.

**Architecture:** `core/chat/` holds the models, the API service, pure helpers, a `ChatThread` class (one open
thread's messages, members and sending) and the root signal store `ChatStore`, the only place that applies socket
events and REST results. `NotificationCenterService` routes `chat.*` frames to `chatEvents$` on the one socket.
`features/chat/` holds the drawer UI, loaded with `@defer` the first time the drawer opens.

**Tech Stack:** Angular 21 (standalone, signals, zone.js), PrimeNG 21 (`p-drawer`, `p-dialog`, `p-listbox`,
`p-menu`), Tailwind, ngx-translate, Karma + Jasmine.

**Spec:** [docs/superpowers/specs/2026-10-15-chat-drawer-design.md](../specs/2026-10-15-chat-drawer-design.md) —
API contract: [docs/API_REFERENCE_CHAT.md](../../API_REFERENCE_CHAT.md). Read both before starting.

## Global Constraints

- Base path `chat/v1/` relative to `API_BASE_URL` (`/api/`); every JSON response is the `{ success, data, metadata }` envelope.
- Chat is shown only when `access.can('access_chat') && access.can('view_chat')`.
- Message body: at most 4,000 characters after trimming; counter shown from 3,800.
- Files: up to 5 per message, 10 MB (10,485,760 bytes) each, extensions png, jpg, jpeg, gif, webp, pdf, doc, docx, xls, xlsx, ppt, pptx, csv, txt, zip.
- Edit window 24 hours, sender only, never system messages (`sender === null`).
- `@all` is offered when `my_role` is `owner`/`admin`, `change_chatmoderation` is held, or `members_count <= 20`.
- History page size 50 (`limit=50`); `before=<smallest id>` for older, `after=<largest id>` for catch-up.
- Outgoing typing frame `{action: 'typing', conversation_id}` at most once per 3 s per conversation; incoming typing shown ~5 s.
- Read marker sent debounced ~1 s while the thread is open; after a successful read call refetch `unread/` and `NotificationCenterService.refresh()`.
- Every send carries `client_id = crypto.randomUUID()`; retries reuse it.
- Drawer: single view, ~400px (`w-full sm:w-[25rem]`), end side (right in LTR, left in RTL), non-modal.
- Ids: chat ids are numbers; `AuthService.user().id` is a string — always compare with `Number(...)`.
- All UI text through ngx-translate keys under `chat.*` in both `src/assets/i18n/en.json` and `ar.json`.
- 4xx errors are not toasted by the error interceptor (only network/5xx are); chat code toasts 4xx itself with `NotificationService.failure(error, errorText(error))`.
- Test command: `npx ng test --watch=false --browsers=ChromeHeadless --include='<glob>'`.
- Before every commit run `git branch --show-current`; it must be `feat/chat-drawer` (never commit on `main`). Stage only the files the task lists — the owner has unrelated uncommitted work (`app.config.ts`, `duplicate-write.interceptor*`, `docs/ARCHITECTURE.md`, `docs/CODE_MAP.md`, a video) that must stay out of chat commits.
- End every commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. A `chat.message` arrives while the conversation list was never loaded (drawer never opened): the header badge must still go up. → Task 6 test "counts messages before the list is loaded".
2. The socket echo of my own message arrives before the POST response: the message must appear once, not twice. → Task 1 test "socket echo before the POST response leaves one message".
3. The drawer is opened from a bell for a chat while the list is still loading, and the list then arrives with that chat's old `unread_count`: the open chat must show 0 and the badge must not count it. → Task 6 test "list arriving after opening a thread keeps the open chat read".
4. Two members whose names share a prefix (`Sara` and `Sara Ali`): mentioning `@Sara Ali` must not become `@[1] Ali`. → Task 4 test "encodes the longest name first".
5. The open chat disappears (404 on load, or `chat.removed`): the drawer goes back to the list with a toast instead of showing a broken thread. → Task 6 tests "chat.removed on the open thread goes back to the list" and "a 404 while loading the thread drops it".

---

## File structure

| File | Responsibility |
|---|---|
| `src/app/core/chat/chat.models.ts` | API types, `ChatEvent` union, `ThreadItem`, limits, `chatConversationId()` |
| `src/app/core/chat/message-window.ts` | Pure functions over a thread's `ThreadItem[]` |
| `src/app/core/chat/chat-api.service.ts` | HTTP calls under `chat/v1/` |
| `src/app/core/chat/chat-format.ts` | Pure display helpers: titles, previews, mentions, system text, times, files, `errorText` |
| `src/app/core/chat/chat-rules.ts` | Pure rules: can edit/delete, `@all`, posting note |
| `src/app/core/chat/typing-tracker.ts` | Who is typing where, with expiry |
| `src/app/core/chat/chat-thread.ts` | One open thread: load, older pages, send/retry, edit, delete, catch-up |
| `src/app/core/chat/chat.store.ts` | Root store: list, unread, drawer, open thread, socket events, reconnect |
| `src/app/core/notifications/notification-center.service.ts` | + `chatEvents$`, `reconnected$`, `send()` |
| `src/app/features/chat/mention-tokens.ts` | Composer mention encoding/decoding |
| `src/app/features/chat/thread-rows.ts` | Day separators and sender grouping for the thread view |
| `src/app/features/chat/chat-drawer.component.ts` | The drawer and its header |
| `src/app/features/chat/conversation-list.component.ts` | List view with search and "New chat" |
| `src/app/features/chat/new-chat-dialog.component.ts` | People picker |
| `src/app/features/chat/chat-attachment.component.ts` | Thumbnail or file chip, blob download |
| `src/app/features/chat/message-bubble.component.ts` | One message with its menu |
| `src/app/features/chat/message-composer.component.ts` | Text box, mentions, files, reply/edit banners |
| `src/app/features/chat/chat-thread.component.ts` | Thread view: messages, scroll, typing line, composer or note |
| `src/app/testing/chat-fixtures.ts` | Test factories |
| `src/app/layout/header/*`, `src/app/layout/shell/*`, `src/app/features/notifications/notifications-page.component.ts` | Wiring |

---

### Task 1: Models, fixtures and the message window

**Files:**
- Create: `src/app/core/chat/chat.models.ts`
- Create: `src/app/core/chat/message-window.ts`
- Create: `src/app/testing/chat-fixtures.ts`
- Test: `src/app/core/chat/message-window.spec.ts`

**Interfaces:**
- Consumes: `AppNotification` from `src/app/core/notifications/notification.model.ts`.
- Produces: all types below; `mergeMessages`, `replaceMessage`, `markDeleted`, `addPending`, `setStatus`, `removeUnsent`, `oldestId`, `newestId`; fixtures `chatUser`, `chatMessage`, `conversation`, `chatMember`, `sentItem`, `ME`.

- [ ] **Step 1: Write the models**

`src/app/core/chat/chat.models.ts`:

```ts
import { AppNotification } from '../notifications/notification.model';

/** /api/chat/v1/ (docs/API_REFERENCE_CHAT.md). */
export type ConversationKind = 'company' | 'team' | 'direct' | 'group';
export type ChatRole = 'owner' | 'admin' | 'member' | 'readonly';
export type PostingPolicy = 'everyone' | 'admins_only';

/** A person as chat shows them. `is_active: false` = left the company. */
export interface ChatUserRef {
  id: number;
  name: string;
  is_active: boolean;
}

export interface ChatAttachment {
  id: number;
  filename: string;
  content_type: string;
  size: number;
  /** Relative path of the authenticated download (`/api/chat/v1/messages/{id}/attachments/{id}/`); '' while sending. */
  url: string;
}

export interface ReplyPreview {
  id: number;
  sender: ChatUserRef | null;
  body: string;
  is_deleted: boolean;
}

/** `data` of a system message (`sender === null`); the body is an English sentence, render from this instead. */
export type SystemMessageData =
  | { event: 'role_changed'; user_id: number; role: ChatRole }
  | { event: 'posting_policy'; posting_policy: PostingPolicy };

export interface ChatMessage {
  id: number;
  conversation: number;
  sender: ChatUserRef | null;
  body: string;
  data: SystemMessageData | Record<string, never>;
  reply_to: ReplyPreview | null;
  attachments: ChatAttachment[];
  mentions: number[];
  mentions_all: boolean;
  edited_at: string | null;
  is_deleted: boolean;
  created_at: string;
  client_id: string | null;
}

export interface Conversation {
  id: number;
  kind: ConversationKind;
  name_en: string;
  name_ar: string;
  title: string;
  description: string;
  avatar: string | null;
  team: number | null;
  posting_policy: PostingPolicy;
  last_message_at: string | null;
  created_at: string;
  other_user: ChatUserRef | null;
  unread_count: number;
  members_count: number;
  last_message: ChatMessage | null;
  my_role: ChatRole;
  muted_until: string | null;
  mute_mentions: boolean;
  is_muted: boolean;
  can_post: boolean;
}

export interface ChatMember {
  user: ChatUserRef;
  role: ChatRole;
  is_synced: boolean;
  created_at: string;
}

export interface UnreadSummary {
  conversations: number;
  messages: number;
}

/** Frames the notifications socket pushes for chat (`type` starts with `chat.`). */
export type ChatEvent =
  | { type: 'chat.message'; conversation_id: number; message: ChatMessage }
  | { type: 'chat.message_updated'; conversation_id: number; message: ChatMessage }
  | { type: 'chat.message_deleted'; conversation_id: number; message_id: number }
  | { type: 'chat.read'; conversation_id: number; user_id: number; message_id: number }
  | {
      type: 'chat.conversation';
      conversation_id: number;
      action: 'member_added' | 'member_removed' | 'role_changed' | 'updated';
      user_id?: number;
      role?: ChatRole;
    }
  | { type: 'chat.removed'; conversation_id: number }
  | { type: 'chat.typing'; conversation_id: number; user_id: number };

/** What one send posts; `clientId` is reused by retries so the backend stores the message once. */
export interface MessageDraft {
  body: string;
  replyTo: number | null;
  files: File[];
  clientId: string;
}

/** A message in the open thread: stored (`sent`), on its way (`pending`) or refused/lost (`failed`). */
export interface ThreadItem {
  message: ChatMessage;
  status: 'sent' | 'pending' | 'failed';
  /** Failed with a 4xx: the server's reason, shown under the bubble. */
  error?: string;
  /** Failed on the network or a 5xx: Retry resends with the same client id. */
  retryable?: boolean;
  draft?: MessageDraft;
}

export const CHAT_LIMITS = {
  bodyMax: 4000,
  counterFrom: 3800,
  maxFiles: 5,
  maxFileSize: 10 * 1024 * 1024,
  extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'csv', 'txt', 'zip'],
  editWindowMs: 24 * 60 * 60 * 1000,
  allMentionOpenLimit: 20,
  pageSize: 50,
} as const;

/** The chat a bell notification points at (`data.kind === 'chat'`), or null for other notifications. */
export function chatConversationId(notification: AppNotification): number | null {
  const data = notification.data ?? {};
  const id = Number(data['conversation_id']);
  return data['kind'] === 'chat' && Number.isInteger(id) && id > 0 ? id : null;
}
```

- [ ] **Step 2: Write the fixtures**

`src/app/testing/chat-fixtures.ts`:

```ts
import { ChatMember, ChatMessage, ChatRole, ChatUserRef, Conversation, ThreadItem } from '../core/chat/chat.models';

/** The signed-in user in chat tests (AuthService.user().id is '7'). */
export const ME: ChatUserRef = { id: 7, name: 'Me Myself', is_active: true };

export function chatUser(id: number, name = `User ${id}`, is_active = true): ChatUserRef {
  return { id, name, is_active };
}

export function chatMessage(id: number, overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id,
    conversation: 12,
    sender: chatUser(45, 'Sara Ali'),
    body: `m${id}`,
    data: {},
    reply_to: null,
    attachments: [],
    mentions: [],
    mentions_all: false,
    edited_at: null,
    is_deleted: false,
    created_at: '2026-10-15T09:00:00+03:00',
    client_id: null,
    ...overrides,
  };
}

export function conversation(id: number, overrides: Partial<Conversation> = {}): Conversation {
  return {
    id,
    kind: 'group',
    name_en: `Chat ${id}`,
    name_ar: `محادثة ${id}`,
    title: `Chat ${id}`,
    description: '',
    avatar: null,
    team: null,
    posting_policy: 'everyone',
    last_message_at: null,
    created_at: '2026-10-10T08:00:00+03:00',
    other_user: null,
    unread_count: 0,
    members_count: 3,
    last_message: null,
    my_role: 'member',
    muted_until: null,
    mute_mentions: false,
    is_muted: false,
    can_post: true,
    ...overrides,
  };
}

export function chatMember(id: number, name = `User ${id}`, role: ChatRole = 'member'): ChatMember {
  return { user: chatUser(id, name), role, is_synced: false, created_at: '2026-10-10T08:00:00+03:00' };
}

export function sentItem(message: ChatMessage): ThreadItem {
  return { message, status: 'sent' };
}
```

- [ ] **Step 3: Write the failing tests**

`src/app/core/chat/message-window.spec.ts`:

```ts
import { ME, chatMessage, sentItem } from '../../testing/chat-fixtures';
import { MessageDraft } from './chat.models';
import { addPending, markDeleted, mergeMessages, newestId, oldestId, removeUnsent, replaceMessage, setStatus } from './message-window';

function draft(clientId: string, body = 'hi'): MessageDraft {
  return { body, replyTo: null, files: [], clientId };
}

describe('message window', () => {
  it('merges pages in ascending id order without duplicates', () => {
    const items = mergeMessages([], [chatMessage(3), chatMessage(1)]);
    const merged = mergeMessages(items, [chatMessage(2), chatMessage(3, { body: 'new' })]);
    expect(merged.map((i) => i.message.id)).toEqual([1, 2, 3]);
    expect(merged[2].message.body).toBe('new');
  });

  it('keeps unsent messages after the stored ones', () => {
    const pending = addPending(mergeMessages([], [chatMessage(5)]), draft('c1'), ME, 12, null);
    const merged = mergeMessages(pending, [chatMessage(6)]);
    expect(merged.map((i) => i.status)).toEqual(['sent', 'sent', 'pending']);
  });

  it('replaces the pending bubble with the stored message of the same client id', () => {
    const pending = addPending([], draft('c1'), ME, 12, null);
    const merged = mergeMessages(pending, [chatMessage(9, { client_id: 'c1', sender: ME })]);
    expect(merged.length).toBe(1);
    expect(merged[0].status).toBe('sent');
    expect(merged[0].message.id).toBe(9);
  });

  it('socket echo before the POST response leaves one message', () => {
    const pending = addPending([], draft('c1'), ME, 12, null);
    const stored = chatMessage(9, { client_id: 'c1', sender: ME });
    const afterEcho = mergeMessages(pending, [stored]);
    const afterResponse = mergeMessages(afterEcho, [stored]);
    expect(afterResponse.map((i) => i.message.id)).toEqual([9]);
  });

  it('builds a pending message from the draft', () => {
    const file = new File(['x'], 'a.pdf', { type: 'application/pdf' });
    const [item] = addPending([], { body: 'see', replyTo: null, files: [file], clientId: 'c1' }, ME, 12, null);
    expect(item.status).toBe('pending');
    expect(item.message.sender).toEqual(ME);
    expect(item.message.client_id).toBe('c1');
    expect(item.message.attachments[0].filename).toBe('a.pdf');
    expect(item.draft?.clientId).toBe('c1');
  });

  it('replaces only messages already in the window', () => {
    const items = mergeMessages([], [chatMessage(1)]);
    expect(replaceMessage(items, chatMessage(1, { body: 'edited' }))[0].message.body).toBe('edited');
    expect(replaceMessage(items, chatMessage(2))).toBe(items);
  });

  it('marks a message deleted and blanks its content', () => {
    const items = mergeMessages([], [chatMessage(1, { body: 'x', mentions: [3], attachments: [{ id: 1, filename: 'a', content_type: '', size: 1, url: 'u' }] })]);
    const [item] = markDeleted(items, 1);
    expect(item.message.is_deleted).toBeTrue();
    expect(item.message.body).toBe('');
    expect(item.message.attachments).toEqual([]);
    expect(item.message.mentions).toEqual([]);
  });

  it('sets the status of an unsent message and removes it', () => {
    const pending = addPending([], draft('c1'), ME, 12, null);
    const failed = setStatus(pending, 'c1', 'failed', 'Nope', false);
    expect(failed[0]).toEqual(jasmine.objectContaining({ status: 'failed', error: 'Nope', retryable: false }));
    expect(setStatus(failed, 'c1', 'pending')[0].status).toBe('pending');
    expect(removeUnsent(failed, 'c1')).toEqual([]);
  });

  it('finds the smallest and largest stored ids', () => {
    expect(oldestId([])).toBeNull();
    const items = addPending(mergeMessages([], [chatMessage(4), chatMessage(2)]), draft('c1'), ME, 12, null);
    expect(oldestId(items)).toBe(2);
    expect(newestId(items)).toBe(4);
  });

  it('keeps sentItem fixtures usable as stored items', () => {
    expect(oldestId([sentItem(chatMessage(8))])).toBe(8);
  });
});
```

- [ ] **Step 4: Run the tests to see them fail**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include='src/app/core/chat/**/*.spec.ts'`
Expected: FAIL — compile error, `./message-window` not found.

- [ ] **Step 5: Implement the window**

`src/app/core/chat/message-window.ts`:

```ts
import { ChatMessage, ChatUserRef, MessageDraft, ReplyPreview, ThreadItem } from './chat.models';

/**
 * Pure functions over one thread's items: stored messages ascending by id, then the unsent ones in the order they
 * were written. A stored message carrying an unsent item's client id replaces it (the POST answer or the socket echo,
 * whichever comes first).
 */
export function mergeMessages(items: ThreadItem[], messages: ChatMessage[]): ThreadItem[] {
  if (!messages.length) {
    return items;
  }
  const stored = new Map<number, ThreadItem>();
  const unsent: ThreadItem[] = [];
  for (const item of items) {
    if (item.status === 'sent') {
      stored.set(item.message.id, item);
    } else {
      unsent.push(item);
    }
  }
  const claimed = new Set<string>();
  for (const message of messages) {
    stored.set(message.id, { message, status: 'sent' });
    if (message.client_id) {
      claimed.add(message.client_id);
    }
  }
  const sorted = [...stored.values()].sort((a, b) => a.message.id - b.message.id);
  return [...sorted, ...unsent.filter((item) => !item.draft || !claimed.has(item.draft.clientId))];
}

/** An edit: replaces the message if it is in the window (an edit of an older message is not pulled in). */
export function replaceMessage(items: ThreadItem[], message: ChatMessage): ThreadItem[] {
  if (!items.some((item) => item.status === 'sent' && item.message.id === message.id)) {
    return items;
  }
  return items.map((item) => (item.status === 'sent' && item.message.id === message.id ? { message, status: 'sent' } : item));
}

export function markDeleted(items: ThreadItem[], messageId: number): ThreadItem[] {
  return items.map((item) =>
    item.status === 'sent' && item.message.id === messageId
      ? { ...item, message: { ...item.message, is_deleted: true, body: '', attachments: [], mentions: [], mentions_all: false } }
      : item,
  );
}

export function addPending(
  items: ThreadItem[],
  draft: MessageDraft,
  sender: ChatUserRef,
  conversationId: number,
  replyTo: ReplyPreview | null,
  now = new Date(),
): ThreadItem[] {
  const message: ChatMessage = {
    id: 0,
    conversation: conversationId,
    sender,
    body: draft.body,
    data: {},
    reply_to: replyTo,
    attachments: draft.files.map((file, index) => ({ id: -(index + 1), filename: file.name, content_type: file.type, size: file.size, url: '' })),
    mentions: [],
    mentions_all: false,
    edited_at: null,
    is_deleted: false,
    created_at: now.toISOString(),
    client_id: draft.clientId,
  };
  return [...items, { message, status: 'pending', draft }];
}

export function setStatus(
  items: ThreadItem[],
  clientId: string,
  status: 'pending' | 'failed',
  error?: string,
  retryable?: boolean,
): ThreadItem[] {
  return items.map((item) =>
    item.status !== 'sent' && item.draft?.clientId === clientId ? { ...item, status, error, retryable } : item,
  );
}

export function removeUnsent(items: ThreadItem[], clientId: string): ThreadItem[] {
  return items.filter((item) => item.status === 'sent' || item.draft?.clientId !== clientId);
}

export function oldestId(items: ThreadItem[]): number | null {
  const first = items.find((item) => item.status === 'sent');
  return first ? first.message.id : null;
}

export function newestId(items: ThreadItem[]): number | null {
  for (let i = items.length - 1; i >= 0; i--) {
    if (items[i].status === 'sent') {
      return items[i].message.id;
    }
  }
  return null;
}
```

- [ ] **Step 6: Run the tests to see them pass**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include='src/app/core/chat/**/*.spec.ts'`
Expected: PASS (10 specs).

- [ ] **Step 7: Commit**

```bash
git branch --show-current
git add src/app/core/chat/chat.models.ts src/app/core/chat/message-window.ts src/app/core/chat/message-window.spec.ts src/app/testing/chat-fixtures.ts
git commit -m "feat(chat): models and the message window

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Chat API service

**Files:**
- Create: `src/app/core/chat/chat-api.service.ts`
- Test: `src/app/core/chat/chat-api.service.spec.ts`

**Interfaces:**
- Consumes: `BaseApiService` (`get`, `post`, `patch`, `delete`, `getBlob`, all protected), types from Task 1.
- Produces (`ChatApiService`, root):
  - `conversations(): Observable<Conversation[]>`
  - `conversation(id: number): Observable<Conversation>`
  - `direct(userId: number): Observable<Conversation>`
  - `members(id: number): Observable<ChatMember[]>`
  - `messages(id: number, cursor: { before?: number; after?: number; limit?: number }): Observable<ChatMessage[]>`
  - `send(id: number, draft: MessageDraft): Observable<ChatMessage>`
  - `edit(messageId: number, body: string): Observable<ChatMessage>`
  - `remove(messageId: number): Observable<void>`
  - `read(id: number, messageId: number): Observable<number>`
  - `unread(): Observable<UnreadSummary>`
  - `attachment(url: string): Observable<Blob>`
  - exported `attachmentPath(url: string): string`

- [ ] **Step 1: Write the failing tests**

`src/app/core/chat/chat-api.service.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { envelope, provideApiTesting } from '../../testing/api-testing';
import { chatMessage, conversation } from '../../testing/chat-fixtures';
import { ChatApiService, attachmentPath } from './chat-api.service';

describe('ChatApiService', () => {
  let api: ChatApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: provideApiTesting() });
    api = TestBed.inject(ChatApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists conversations and unwraps the envelope', () => {
    let result: unknown;
    api.conversations().subscribe((list) => (result = list));
    http.expectOne('/api/chat/v1/conversations/').flush(envelope([conversation(1)], 1));
    expect(result).toEqual([conversation(1)]);
  });

  it('loads history with only the cursor params given', () => {
    api.messages(12, { before: 884, limit: 50 }).subscribe();
    const req = http.expectOne((r) => r.url === '/api/chat/v1/conversations/12/messages/');
    expect(req.request.params.get('before')).toBe('884');
    expect(req.request.params.get('limit')).toBe('50');
    expect(req.request.params.has('after')).toBeFalse();
    req.flush(envelope([]));
  });

  it('sends text as JSON with the client id', () => {
    api.send(12, { body: 'hi', replyTo: 881, files: [], clientId: 'c1' }).subscribe();
    const req = http.expectOne('/api/chat/v1/conversations/12/messages/');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ body: 'hi', reply_to: 881, client_id: 'c1' });
    req.flush(envelope(chatMessage(1)));
  });

  it('sends files as multipart, repeating the files field', () => {
    const a = new File(['a'], 'a.pdf');
    const b = new File(['b'], 'b.png');
    api.send(12, { body: '', replyTo: null, files: [a, b], clientId: 'c1' }).subscribe();
    const req = http.expectOne('/api/chat/v1/conversations/12/messages/');
    const form = req.request.body as FormData;
    expect(form.getAll('files').length).toBe(2);
    expect(form.get('client_id')).toBe('c1');
    expect(form.has('reply_to')).toBeFalse();
    req.flush(envelope(chatMessage(1)));
  });

  it('starts a direct chat, edits, deletes, reads and counts unread', () => {
    api.direct(45).subscribe();
    expect(http.expectOne('/api/chat/v1/conversations/direct/').request.body).toEqual({ user_id: 45 });

    api.edit(884, 'new').subscribe();
    const edit = http.expectOne('/api/chat/v1/messages/884/');
    expect(edit.request.method).toBe('PATCH');
    edit.flush(envelope(chatMessage(884)));

    let removed = false;
    api.remove(884).subscribe(() => (removed = true));
    http.expectOne('/api/chat/v1/messages/884/').flush(null, { status: 204, statusText: 'No Content' });
    expect(removed).toBeTrue();

    let marker = 0;
    api.read(12, 881).subscribe((id) => (marker = id));
    const read = http.expectOne('/api/chat/v1/conversations/12/read/');
    expect(read.request.body).toEqual({ message_id: 881 });
    read.flush(envelope({ last_read_message_id: 881 }));
    expect(marker).toBe(881);

    let total = 0;
    api.unread().subscribe((s) => (total = s.messages));
    http.expectOne('/api/chat/v1/unread/').flush(envelope({ conversations: 2, messages: 7 }));
    expect(total).toBe(7);
  });

  it('downloads an attachment by its relative url', () => {
    api.attachment('/api/chat/v1/messages/884/attachments/17/').subscribe();
    const req = http.expectOne('/api/chat/v1/messages/884/attachments/17/');
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['x']));
  });

  it('strips everything up to /api/ from attachment urls', () => {
    expect(attachmentPath('/api/chat/v1/messages/1/attachments/2/')).toBe('chat/v1/messages/1/attachments/2/');
    expect(attachmentPath('http://host/api/chat/v1/x/')).toBe('chat/v1/x/');
  });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include='src/app/core/chat/chat-api.service.spec.ts'`
Expected: FAIL — `./chat-api.service` not found.

- [ ] **Step 3: Implement**

`src/app/core/chat/chat-api.service.ts`:

```ts
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BaseApiService } from '../api/base-api.service';
import { ApiResponse } from '../models/api-response.model';
import { ChatMember, ChatMessage, Conversation, MessageDraft, UnreadSummary } from './chat.models';

const BASE = 'chat/v1/';

function data<T>() {
  return map((response: ApiResponse<T>) => response.data as T);
}

/** `/api/chat/v1/` (docs/API_REFERENCE_CHAT.md). Errors arrive as AppError. */
@Injectable({ providedIn: 'root' })
export class ChatApiService extends BaseApiService {
  conversations(): Observable<Conversation[]> {
    return this.get<Conversation[]>(`${BASE}conversations/`).pipe(data<Conversation[]>());
  }

  conversation(id: number): Observable<Conversation> {
    return this.get<Conversation>(`${BASE}conversations/${id}/`).pipe(data<Conversation>());
  }

  /** The existing direct chat with that person (200) or a new one (201). */
  direct(userId: number): Observable<Conversation> {
    return this.post<Conversation>(`${BASE}conversations/direct/`, { user_id: userId }).pipe(data<Conversation>());
  }

  members(id: number): Observable<ChatMember[]> {
    return this.get<ChatMember[]>(`${BASE}conversations/${id}/members/`).pipe(data<ChatMember[]>());
  }

  /** Newest first, deleted messages included. */
  messages(id: number, cursor: { before?: number; after?: number; limit?: number }): Observable<ChatMessage[]> {
    const params: Record<string, number> = {};
    for (const key of ['before', 'after', 'limit'] as const) {
      if (cursor[key] !== undefined) {
        params[key] = cursor[key]!;
      }
    }
    return this.get<ChatMessage[]>(`${BASE}conversations/${id}/messages/`, { params }).pipe(data<ChatMessage[]>());
  }

  /** JSON for text, multipart (repeated `files`) when files are attached. */
  send(id: number, draft: MessageDraft): Observable<ChatMessage> {
    const path = `${BASE}conversations/${id}/messages/`;
    if (!draft.files.length) {
      return this.post<ChatMessage>(path, { body: draft.body, reply_to: draft.replyTo, client_id: draft.clientId }).pipe(data<ChatMessage>());
    }
    const form = new FormData();
    form.append('body', draft.body);
    if (draft.replyTo !== null) {
      form.append('reply_to', String(draft.replyTo));
    }
    form.append('client_id', draft.clientId);
    for (const file of draft.files) {
      form.append('files', file, file.name);
    }
    return this.post<ChatMessage>(path, form).pipe(data<ChatMessage>());
  }

  edit(messageId: number, body: string): Observable<ChatMessage> {
    return this.patch<ChatMessage>(`${BASE}messages/${messageId}/`, { body }).pipe(data<ChatMessage>());
  }

  remove(messageId: number): Observable<void> {
    return this.delete<null>(`${BASE}messages/${messageId}/`).pipe(map(() => undefined));
  }

  /** Moves my read marker forward; answers the effective marker. */
  read(id: number, messageId: number): Observable<number> {
    return this.post<{ last_read_message_id: number }>(`${BASE}conversations/${id}/read/`, { message_id: messageId }).pipe(
      map((response) => response.data?.last_read_message_id ?? messageId),
    );
  }

  unread(): Observable<UnreadSummary> {
    return this.get<UnreadSummary>(`${BASE}unread/`).pipe(data<UnreadSummary>());
  }

  /** Needs the Authorization header, so it is fetched as a blob (an `<img src>` cannot send it). */
  attachment(url: string): Observable<Blob> {
    return this.getBlob(attachmentPath(url));
  }
}

/** `/api/chat/v1/…` (or an absolute URL) → the path under API_BASE_URL. */
export function attachmentPath(url: string): string {
  const index = url.indexOf('/api/');
  return index >= 0 ? url.slice(index + '/api/'.length) : url.replace(/^\/+/, '');
}
```

- [ ] **Step 4: Run to see it pass**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include='src/app/core/chat/chat-api.service.spec.ts'`
Expected: PASS (7 specs).

- [ ] **Step 5: Commit**

```bash
git branch --show-current
git add src/app/core/chat/chat-api.service.ts src/app/core/chat/chat-api.service.spec.ts
git commit -m "feat(chat): chat API service

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Chat frames, reconnects and send on the notifications socket

**Files:**
- Modify: `src/app/core/notifications/notification-center.service.ts`
- Test: `src/app/core/notifications/notification-center.service.spec.ts`

**Interfaces:**
- Consumes: `ChatEvent` (Task 1).
- Produces on `NotificationCenterService`: `readonly chatEvents$: Observable<ChatEvent>`, `readonly reconnected$: Observable<void>`, `send(frame: object): void`.

- [ ] **Step 1: Extend the fake socket and write the failing tests**

In `notification-center.service.spec.ts`, change `FakeSocket` so it records what is sent and has a ready state:

```ts
class FakeSocket {
  static last: FakeSocket | null = null;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: ((event: { code: number }) => void) | null = null;
  closed = false;
  readyState = 0;
  sent: string[] = [];
  constructor(readonly url: string) {
    FakeSocket.last = this;
  }
  send(frame: string): void {
    this.sent.push(frame);
  }
  close(): void {
    this.closed = true;
  }
  open(): void {
    this.readyState = 1;
    this.onopen?.();
  }
  receive(message: unknown): void {
    this.onmessage?.({ data: JSON.stringify(message) });
  }
}
```

Existing tests that call `FakeSocket.last!.onopen!()` keep working; new ones use `open()`. Add at the end of the `describe`:

```ts
  it('routes chat frames to chatEvents$, not to incoming$', () => {
    const center = start();
    const chat: unknown[] = [];
    const incoming: unknown[] = [];
    center.chatEvents$.subscribe((e) => chat.push(e));
    center.incoming$.subscribe((n) => incoming.push(n));
    FakeSocket.last!.receive({ type: 'chat.typing', conversation_id: 12, user_id: 45 });
    expect(chat).toEqual([{ type: 'chat.typing', conversation_id: 12, user_id: 45 }]);
    expect(incoming).toEqual([]);
  });

  it('emits reconnected$ on every open after the first', fakeAsync(() => {
    const center = start();
    let count = 0;
    center.reconnected$.subscribe(() => count++);
    FakeSocket.last!.open();
    expect(count).toBe(0);
    FakeSocket.last!.onclose!({ code: 1006 });
    tick(2_000);
    FakeSocket.last!.open();
    expect(count).toBe(1);
    discardPeriodicTasks();
  }));

  it('send() writes JSON to the open socket only', fakeAsync(() => {
    const center = start();
    center.send({ action: 'typing', conversation_id: 12 });
    expect(FakeSocket.last!.sent).toEqual([]);
    FakeSocket.last!.open();
    center.send({ action: 'typing', conversation_id: 12 });
    expect(FakeSocket.last!.sent).toEqual([JSON.stringify({ action: 'typing', conversation_id: 12 })]);
    discardPeriodicTasks();
  }));
```

Add `fakeAsync, tick, discardPeriodicTasks` to the `@angular/core/testing` import.

- [ ] **Step 2: Run to see them fail**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include='src/app/core/notifications/notification-center.service.spec.ts'`
Expected: FAIL — `chatEvents$`, `reconnected$`, `send` do not exist.

- [ ] **Step 3: Implement**

In `notification-center.service.ts`:

1. Imports: add `import { ChatEvent } from '../chat/chat.models';`.
2. Constants: add `const SOCKET_OPEN = 1;` (the fake socket in tests has no `WebSocket.OPEN`).
3. Fields, next to `incoming`:

```ts
  private readonly chatEvents = new Subject<ChatEvent>();
  private readonly reconnected = new Subject<void>();
  /** True once this session's socket opened; later opens are reconnects. */
  private openedBefore = false;
```

4. Public, after `incoming$`:

```ts
  /** Chat frames (`type` starts with `chat.`); ChatStore applies them. */
  readonly chatEvents$ = this.chatEvents.asObservable();
  /** Each time the socket opens again after a drop: chat refetches what it may have missed. */
  readonly reconnected$ = this.reconnected.asObservable();
```

5. New method after `markAllRead()`:

```ts
  /** A client frame (chat typing); dropped when the socket is not open. */
  send(frame: object): void {
    if (this.socket?.readyState === SOCKET_OPEN) {
      this.socket.send(JSON.stringify(frame));
    }
  }
```

6. In `connect()`, `socket.onopen` becomes:

```ts
    socket.onopen = () => {
      this.retryDelay = 2_000;
      this.refreshedForSocket = false;
      this.pingTimer = setInterval(() => socket.send(JSON.stringify({ action: 'ping' })), PING_EVERY_MS);
      if (this.openedBefore) {
        this.reconnected.next();
      }
      this.openedBefore = true;
    };
```

and `socket.onmessage` becomes `socket.onmessage = (event) => this.onMessage(JSON.parse(event.data) as SocketMessage | ChatEvent);`.

7. `onMessage` signature and first lines:

```ts
  private onMessage(message: SocketMessage | ChatEvent): void {
    if (message.type.startsWith('chat.')) {
      this.chatEvents.next(message as ChatEvent);
      return;
    }
    switch ((message as SocketMessage).type) {
```

and inside the `new_notification` case read `const notification = (message as { notification: AppNotification }).notification;` (the cast keeps TypeScript happy after widening the union). Keep the `connection_established` case reading `(message as { unread_notification: number }).unread_notification`.

8. In `stop()`, add `this.openedBefore = false;`.

- [ ] **Step 4: Run to see it pass**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include='src/app/core/notifications/notification-center.service.spec.ts'`
Expected: PASS (existing specs plus 3 new).

- [ ] **Step 5: Commit**

```bash
git branch --show-current
git add src/app/core/notifications/notification-center.service.ts src/app/core/notifications/notification-center.service.spec.ts
git commit -m "feat(chat): carry chat frames, reconnects and typing on the notifications socket

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Display helpers, rules, mention tokens and translations

**Files:**
- Create: `src/app/core/chat/chat-format.ts`
- Create: `src/app/core/chat/chat-rules.ts`
- Create: `src/app/features/chat/mention-tokens.ts`
- Create: `src/app/features/chat/thread-rows.ts`
- Modify: `src/assets/i18n/en.json`, `src/assets/i18n/ar.json` (new top-level `chat` block)
- Test: `src/app/core/chat/chat-format.spec.ts`, `src/app/core/chat/chat-rules.spec.ts`, `src/app/features/chat/mention-tokens.spec.ts`, `src/app/features/chat/thread-rows.spec.ts`

**Interfaces:**
- Consumes: Task 1 types; `AppError` from `src/app/core/errors/app-error.ts`.
- Produces:
  - `chat-format.ts`: `type Translate = (key: string, params?: Record<string, unknown>) => string`; `type NameOf = (userId: number) => string | undefined`; `conversationTitle(c, lang)`, `conversationIcon(c): string | null`, `initials(name)`, `type BodySegment`, `bodySegments(body, nameOf)`, `plainBody(body, nameOf, fallback)`, `systemText(data, nameOf, t)`, `messagePreview(message, myId, nameOf, t)`, `chatTime(iso, lang, now?)`, `dayKey(iso)`, `dayLabel(iso, lang, t, now?)`, `formatSize(bytes)`, `isImageFile(name)`, `checkFiles(current, added)`, `errorText(error)`.
  - `chat-rules.ts`: `canEdit(item, myId, now?)`, `canDelete(item, myId, role, moderator)`, `canMentionAll(c, moderator)`, `postingNote(c): string | null` (translation key).
  - `mention-tokens.ts`: `interface MentionToken { id: number; display: string }`, `encodeMentions(text, tokens)`, `decodeMentions(body, nameOf)`, `mentionQuery(text, caret)`.
  - `thread-rows.ts`: `type ThreadRow`, `threadRows(items, myId, dayLabelOf)`, `GROUP_WINDOW_MS`.

- [ ] **Step 1: Write the failing tests**

`src/app/core/chat/chat-format.spec.ts`:

```ts
import { ME, chatMessage, chatUser, conversation } from '../../testing/chat-fixtures';
import {
  bodySegments, chatTime, checkFiles, conversationIcon, conversationTitle, dayKey, errorText, formatSize,
  initials, isImageFile, messagePreview, plainBody, systemText,
} from './chat-format';

const t = (key: string, params?: Record<string, unknown>) => (params ? `${key} ${JSON.stringify(params)}` : key);
const names: Record<number, string> = { 51: 'Omar Nasr' };
const nameOf = (id: number) => names[id];

describe('chat format', () => {
  it('titles chats by kind and language', () => {
    expect(conversationTitle(conversation(1), 'en')).toBe('Chat 1');
    expect(conversationTitle(conversation(1), 'ar')).toBe('محادثة 1');
    expect(conversationTitle(conversation(1, { name_ar: '' }), 'ar')).toBe('Chat 1');
    expect(conversationTitle(conversation(1, { kind: 'direct', other_user: chatUser(45, 'Sara Ali') }), 'ar')).toBe('Sara Ali');
    expect(conversationIcon(conversation(1, { kind: 'company' }))).toBe('pi-building');
    expect(conversationIcon(conversation(1, { kind: 'team' }))).toBe('pi-users');
    expect(conversationIcon(conversation(1))).toBeNull();
    expect(initials('Sara Ali')).toBe('SA');
  });

  it('splits bodies into text, mentions and @all', () => {
    expect(bodySegments('@[51] hi @all, a@all.com @[99]', nameOf)).toEqual([
      { kind: 'mention', userId: 51, name: 'Omar Nasr' },
      { kind: 'text', text: ' hi ' },
      { kind: 'all' },
      { kind: 'text', text: ', a@all.com ' },
      { kind: 'mention', userId: 99, name: null },
    ]);
    expect(plainBody('@[51] and @[99]', nameOf, 'user')).toBe('@Omar Nasr and @user');
  });

  it('writes system messages from data', () => {
    expect(systemText({ event: 'role_changed', user_id: 51, role: 'admin' }, nameOf, t)).toBe(
      'chat.system.roleChanged {"name":"Omar Nasr","role":"chat.roles.admin"}',
    );
    expect(systemText({ event: 'posting_policy', posting_policy: 'admins_only' }, nameOf, t)).toBe('chat.system.adminsOnly');
    expect(systemText({ event: 'posting_policy', posting_policy: 'everyone' }, nameOf, t)).toBe('chat.system.everyone');
  });

  it('previews the last message', () => {
    expect(messagePreview(chatMessage(1, { body: '@[51] count' }), 7, nameOf, t)).toBe('@Omar Nasr count');
    expect(messagePreview(chatMessage(1, { sender: ME, body: 'ok' }), 7, nameOf, t)).toBe('chat.you {"text":"ok"}');
    expect(messagePreview(chatMessage(1, { body: '', attachments: [{ id: 1, filename: 'a', content_type: '', size: 1, url: '' }] }), 7, nameOf, t)).toBe('chat.attachment');
    expect(messagePreview(chatMessage(1, { is_deleted: true, body: '' }), 7, nameOf, t)).toBe('chat.deletedPreview');
    expect(messagePreview(chatMessage(1, { sender: null, data: { event: 'posting_policy', posting_policy: 'everyone' } }), 7, nameOf, t)).toBe('chat.system.everyone');
  });

  it('formats times, days and sizes', () => {
    const now = new Date(2026, 9, 15, 18, 0);
    expect(chatTime(new Date(2026, 9, 15, 9, 5).toISOString(), 'en', now)).toMatch(/09:05|9:05/);
    expect(chatTime(new Date(2026, 9, 10, 9, 5).toISOString(), 'en', now)).not.toMatch(/9:05/);
    expect(dayKey(new Date(2026, 9, 15, 23, 0).toISOString())).toBe('2026-10-15');
    expect(formatSize(512)).toBe('512 B');
    expect(formatSize(20480)).toBe('20 KB');
    expect(formatSize(3 * 1024 * 1024)).toBe('3.0 MB');
    expect(isImageFile('Photo.JPG')).toBeTrue();
    expect(isImageFile('count.xlsx')).toBeFalse();
  });

  it('checks files against type, size and count', () => {
    const ok = new File(['x'], 'a.pdf');
    const exe = new File(['x'], 'x.exe');
    const big = new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'big.png');
    const result = checkFiles([], [ok, exe, big]);
    expect(result.accepted).toEqual([ok]);
    expect(result.rejected.map((r) => [r.name, r.reason])).toEqual([['x.exe', 'type'], ['big.png', 'size']]);
    const five = Array.from({ length: 5 }, (_, i) => new File(['x'], `${i}.txt`));
    expect(checkFiles(five, [ok]).rejected).toEqual([{ name: 'a.pdf', reason: 'count' }]);
  });

  it('reads the error text from field errors, arrays or the message', () => {
    expect(errorText({ status: 400, message: 'Unknown error', errors: { body: ['Too long.'] } })).toBe('Too long.');
    expect(errorText({ status: 400, message: ['Direct chats cannot be changed.'] as unknown as string, errors: {} })).toBe('Direct chats cannot be changed.');
    expect(errorText({ status: 403, message: 'You cannot post in this chat.', errors: {} })).toBe('You cannot post in this chat.');
  });
});
```

`src/app/core/chat/chat-rules.spec.ts`:

```ts
import { ME, chatMessage, conversation, sentItem } from '../../testing/chat-fixtures';
import { canDelete, canEdit, canMentionAll, postingNote } from './chat-rules';

describe('chat rules', () => {
  const now = Date.parse('2026-10-15T12:00:00+03:00');
  const mine = sentItem(chatMessage(1, { sender: ME, created_at: '2026-10-15T09:00:00+03:00' }));
  const theirs = sentItem(chatMessage(2));
  const system = sentItem(chatMessage(3, { sender: null }));

  it('lets only the sender edit, within 24 hours, never system or deleted messages', () => {
    expect(canEdit(mine, 7, now)).toBeTrue();
    expect(canEdit(mine, 7, now + 24 * 3600 * 1000)).toBeFalse();
    expect(canEdit(theirs, 7, now)).toBeFalse();
    expect(canEdit(system, 7, now)).toBeFalse();
    expect(canEdit({ ...mine, status: 'pending' }, 7, now)).toBeFalse();
  });

  it('lets the sender, chat owners/admins and moderators delete', () => {
    expect(canDelete(mine, 7, 'member', false)).toBeTrue();
    expect(canDelete(theirs, 7, 'member', false)).toBeFalse();
    expect(canDelete(theirs, 7, 'admin', false)).toBeTrue();
    expect(canDelete(theirs, 7, 'owner', false)).toBeTrue();
    expect(canDelete(theirs, 7, 'member', true)).toBeTrue();
    expect(canDelete(system, 7, 'admin', false)).toBeTrue();
    expect(canDelete(sentItem(chatMessage(4, { sender: ME, is_deleted: true })), 7, 'member', false)).toBeFalse();
  });

  it('offers @all to admins, moderators and small chats', () => {
    expect(canMentionAll(conversation(1, { members_count: 30 }), false)).toBeFalse();
    expect(canMentionAll(conversation(1, { members_count: 20 }), false)).toBeTrue();
    expect(canMentionAll(conversation(1, { members_count: 30, my_role: 'admin' }), false)).toBeTrue();
    expect(canMentionAll(conversation(1, { members_count: 30 }), true)).toBeTrue();
  });

  it('explains why posting is not allowed', () => {
    expect(postingNote(conversation(1))).toBeNull();
    expect(postingNote(conversation(1, { can_post: false, kind: 'direct', other_user: { id: 45, name: 'S', is_active: false } }))).toBe('chat.note.peerLeft');
    expect(postingNote(conversation(1, { can_post: false, posting_policy: 'admins_only' }))).toBe('chat.note.adminsOnly');
    expect(postingNote(conversation(1, { can_post: false }))).toBe('chat.note.readOnly');
  });
});
```

`src/app/features/chat/mention-tokens.spec.ts`:

```ts
import { decodeMentions, encodeMentions, mentionQuery } from './mention-tokens';

describe('mention tokens', () => {
  it('encodes picked names as @[id]', () => {
    expect(encodeMentions('@Omar Nasr see this', [{ id: 51, display: '@Omar Nasr' }])).toBe('@[51] see this');
  });

  it('encodes the longest name first', () => {
    const tokens = [{ id: 1, display: '@Sara' }, { id: 2, display: '@Sara Ali' }];
    expect(encodeMentions('@Sara Ali and @Sara', tokens)).toBe('@[2] and @[1]');
  });

  it('leaves names the user typed by hand alone', () => {
    expect(encodeMentions('@Omar hi', [])).toBe('@Omar hi');
  });

  it('decodes a stored body for editing', () => {
    const decoded = decodeMentions('@[51] and @[99]', (id) => (id === 51 ? 'Omar Nasr' : undefined));
    expect(decoded.text).toBe('@Omar Nasr and @[99]');
    expect(decoded.tokens).toEqual([{ id: 51, display: '@Omar Nasr' }]);
  });

  it('finds the @query being typed at the caret', () => {
    expect(mentionQuery('hello @Om', 9)).toEqual({ start: 6, query: 'Om' });
    expect(mentionQuery('@', 1)).toEqual({ start: 0, query: '' });
    expect(mentionQuery('mail a@b', 8)).toBeNull();
    expect(mentionQuery('@Om x', 5)).toBeNull();
  });
});
```

`src/app/features/chat/thread-rows.spec.ts`:

```ts
import { ME, chatMessage, chatUser, sentItem } from '../../testing/chat-fixtures';
import { threadRows } from './thread-rows';

describe('threadRows', () => {
  const label = (iso: string) => iso.slice(0, 10);

  it('adds a day separator before each new day and groups a sender within 5 minutes', () => {
    const items = [
      sentItem(chatMessage(1, { created_at: '2026-10-14T10:00:00Z' })),
      sentItem(chatMessage(2, { created_at: '2026-10-15T10:00:00Z' })),
      sentItem(chatMessage(3, { created_at: '2026-10-15T10:04:00Z' })),
      sentItem(chatMessage(4, { created_at: '2026-10-15T10:10:00Z' })),
      sentItem(chatMessage(5, { created_at: '2026-10-15T10:11:00Z', sender: chatUser(51) })),
      sentItem(chatMessage(6, { created_at: '2026-10-15T10:12:00Z', sender: ME })),
      sentItem(chatMessage(7, { created_at: '2026-10-15T10:12:30Z', sender: null })),
    ];
    const rows = threadRows(items, 7, label);
    expect(rows.map((r) => (r.kind === 'message' ? `${r.item.message.id}${r.first ? '*' : ''}${r.mine ? 'm' : ''}` : r.kind))).toEqual([
      'day', '1*', 'day', '2*', '3', '4*', '5*', '6*m', 'system',
    ]);
  });

  it('keys rows by id, or by client id while unsent', () => {
    const rows = threadRows([{ message: chatMessage(0, { client_id: 'c1', sender: ME }), status: 'pending' }], 7, label);
    expect(rows[1].key).toBe('c:c1');
  });
});
```

- [ ] **Step 2: Run to see them fail**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include='src/app/{core,features}/chat/**/*.spec.ts'`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement `chat-format.ts`**

```ts
import { AppError } from '../errors/app-error';
import { CHAT_LIMITS, ChatMessage, Conversation, SystemMessageData } from './chat.models';

export type Translate = (key: string, params?: Record<string, unknown>) => string;
/** A member's name by user id; undefined when not known (e.g. the member list is not loaded). */
export type NameOf = (userId: number) => string | undefined;

export function conversationTitle(conversation: Conversation, lang: string): string {
  if (conversation.kind === 'direct') {
    return conversation.other_user?.name || conversation.title;
  }
  return (lang === 'ar' && conversation.name_ar) || conversation.name_en || conversation.title;
}

/** Company and team chats show an icon instead of an avatar. */
export function conversationIcon(conversation: Conversation): string | null {
  return conversation.kind === 'company' ? 'pi-building' : conversation.kind === 'team' ? 'pi-users' : null;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}

export type BodySegment =
  | { kind: 'text'; text: string }
  | { kind: 'mention'; userId: number; name: string | null }
  | { kind: 'all' };

/** `@[45]` mentions user 45; `@all` only as a word of its own (not in `a@all.com`, `@all-hands`). */
const MENTION = /@\[(\d+)\]|(?<![\w@.])@all(?![\w-])/g;

export function bodySegments(body: string, nameOf: NameOf): BodySegment[] {
  const segments: BodySegment[] = [];
  let last = 0;
  for (const match of body.matchAll(MENTION)) {
    const index = match.index ?? 0;
    if (index > last) {
      segments.push({ kind: 'text', text: body.slice(last, index) });
    }
    if (match[1]) {
      const userId = Number(match[1]);
      segments.push({ kind: 'mention', userId, name: nameOf(userId) ?? null });
    } else {
      segments.push({ kind: 'all' });
    }
    last = index + match[0].length;
  }
  if (last < body.length) {
    segments.push({ kind: 'text', text: body.slice(last) });
  }
  return segments;
}

/** The body as plain text, mentions as `@Name` (`@<fallback>` when unknown). */
export function plainBody(body: string, nameOf: NameOf, fallback: string): string {
  return bodySegments(body, nameOf)
    .map((s) => (s.kind === 'text' ? s.text : s.kind === 'all' ? '@all' : `@${s.name ?? fallback}`))
    .join('');
}

export function systemText(data: SystemMessageData, nameOf: NameOf, t: Translate): string {
  if (data.event === 'role_changed') {
    return t('chat.system.roleChanged', { name: nameOf(data.user_id) ?? t('chat.someone'), role: t(`chat.roles.${data.role}`) });
  }
  return t(data.posting_policy === 'admins_only' ? 'chat.system.adminsOnly' : 'chat.system.everyone');
}

/** One line for the conversation list. */
export function messagePreview(message: ChatMessage, myId: number, nameOf: NameOf, t: Translate): string {
  if (message.is_deleted) {
    return t('chat.deletedPreview');
  }
  if (!message.sender) {
    return systemText(message.data as SystemMessageData, nameOf, t);
  }
  const text = message.body.trim() ? plainBody(message.body, nameOf, t('chat.someone')).replace(/\s+/g, ' ').trim() : t('chat.attachment');
  return message.sender.id === myId ? t('chat.you', { text }) : text;
}

function locale(lang: string): string {
  return lang === 'ar' ? 'ar-EG' : 'en-GB';
}

/** `HH:mm` today, otherwise a short date. */
export function chatTime(iso: string, lang: string, now = new Date()): string {
  const date = new Date(iso);
  if (dayKey(iso) === dayKey(now.toISOString())) {
    return new Intl.DateTimeFormat(locale(lang), { hour: '2-digit', minute: '2-digit' }).format(date);
  }
  const sameYear = date.getFullYear() === now.getFullYear();
  return new Intl.DateTimeFormat(locale(lang), { day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) }).format(date);
}

/** Local calendar day, `yyyy-mm-dd`. */
export function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function dayLabel(iso: string, lang: string, t: Translate, now = new Date()): string {
  const key = dayKey(iso);
  if (key === dayKey(now.toISOString())) {
    return t('chat.today');
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (key === dayKey(yesterday.toISOString())) {
    return t('chat.yesterday');
  }
  return new Intl.DateTimeFormat(locale(lang), { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(iso));
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function extension(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : '';
}

export function isImageFile(name: string): boolean {
  return ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(extension(name));
}

export interface RejectedFile {
  name: string;
  reason: 'type' | 'size' | 'count';
}

/** The backend's file rules, checked before upload so the user hears why at once. */
export function checkFiles(current: File[], added: File[]): { accepted: File[]; rejected: RejectedFile[] } {
  const accepted: File[] = [];
  const rejected: RejectedFile[] = [];
  for (const file of added) {
    if (!(CHAT_LIMITS.extensions as readonly string[]).includes(extension(file.name))) {
      rejected.push({ name: file.name, reason: 'type' });
    } else if (file.size > CHAT_LIMITS.maxFileSize) {
      rejected.push({ name: file.name, reason: 'size' });
    } else if (current.length + accepted.length >= CHAT_LIMITS.maxFiles) {
      rejected.push({ name: file.name, reason: 'count' });
    } else {
      accepted.push(file);
    }
  }
  return { accepted, rejected };
}

/** The sentence to show for a failed chat request: the first field error, else the message (which can be an array). */
export function errorText(error: AppError): string {
  const field = Object.values(error.errors ?? {}).flat()[0];
  if (field) {
    return field;
  }
  const message = error.message as unknown;
  return Array.isArray(message) ? message.join(' ') : String(message ?? '');
}
```

- [ ] **Step 4: Implement `chat-rules.ts`**

```ts
import { CHAT_LIMITS, ChatRole, Conversation, ThreadItem } from './chat.models';

const ADMIN_ROLES: ChatRole[] = ['owner', 'admin'];

export function canEdit(item: ThreadItem, myId: number, now = Date.now()): boolean {
  const message = item.message;
  return (
    item.status === 'sent' &&
    !message.is_deleted &&
    message.sender?.id === myId &&
    now - Date.parse(message.created_at) < CHAT_LIMITS.editWindowMs
  );
}

/** Sender, chat owner/admin, or a moderator (`change_chatmoderation`, company admins included). */
export function canDelete(item: ThreadItem, myId: number, role: ChatRole | undefined, moderator: boolean): boolean {
  if (item.status !== 'sent' || item.message.is_deleted) {
    return false;
  }
  return item.message.sender?.id === myId || (!!role && ADMIN_ROLES.includes(role)) || moderator;
}

export function canMentionAll(conversation: Conversation, moderator: boolean): boolean {
  return ADMIN_ROLES.includes(conversation.my_role) || moderator || conversation.members_count <= CHAT_LIMITS.allMentionOpenLimit;
}

/** Translation key of the note shown instead of the composer, or null when I may post. */
export function postingNote(conversation: Conversation): string | null {
  if (conversation.can_post) {
    return null;
  }
  if (conversation.kind === 'direct' && conversation.other_user && !conversation.other_user.is_active) {
    return 'chat.note.peerLeft';
  }
  return conversation.posting_policy === 'admins_only' ? 'chat.note.adminsOnly' : 'chat.note.readOnly';
}
```

- [ ] **Step 5: Implement `mention-tokens.ts`**

```ts
import { NameOf } from '../../core/chat/chat-format';

/** A mention the user picked: the box shows `display` (`@Sara Ali`), the body gets `@[id]`. */
export interface MentionToken {
  id: number;
  display: string;
}

/** Longest names first, so `@Sara Ali` is not read as `@Sara` + ` Ali`. */
export function encodeMentions(text: string, tokens: MentionToken[]): string {
  let out = text;
  for (const token of [...tokens].sort((a, b) => b.display.length - a.display.length)) {
    out = out.split(token.display).join(`@[${token.id}]`);
  }
  return out;
}

/** A stored body back into editable text; unknown ids stay as `@[id]` so they survive the edit. */
export function decodeMentions(body: string, nameOf: NameOf): { text: string; tokens: MentionToken[] } {
  const tokens: MentionToken[] = [];
  const text = body.replace(/@\[(\d+)\]/g, (raw, id: string) => {
    const name = nameOf(Number(id));
    if (!name) {
      return raw;
    }
    const display = `@${name}`;
    if (!tokens.some((t) => t.id === Number(id))) {
      tokens.push({ id: Number(id), display });
    }
    return display;
  });
  return { text, tokens };
}

/** The `@query` right before the caret (start of text or after a space), or null. */
export function mentionQuery(text: string, caret: number): { start: number; query: string } | null {
  const match = /(^|\s)@([^\s@]*)$/.exec(text.slice(0, caret));
  return match ? { start: caret - match[2].length - 1, query: match[2] } : null;
}
```

- [ ] **Step 6: Implement `thread-rows.ts`**

```ts
import { dayKey } from '../../core/chat/chat-format';
import { ThreadItem } from '../../core/chat/chat.models';

/** Messages of one sender closer than this share one name/avatar. */
export const GROUP_WINDOW_MS = 5 * 60 * 1000;

export type ThreadRow =
  | { kind: 'day'; key: string; label: string }
  | { kind: 'system'; key: string; item: ThreadItem }
  | { kind: 'message'; key: string; item: ThreadItem; mine: boolean; first: boolean };

function itemKey(item: ThreadItem): string {
  return item.status === 'sent' ? `m:${item.message.id}` : `c:${item.message.client_id}`;
}

export function threadRows(items: ThreadItem[], myId: number, dayLabelOf: (iso: string) => string): ThreadRow[] {
  const rows: ThreadRow[] = [];
  let day = '';
  let previous: ThreadItem | null = null;
  for (const item of items) {
    const message = item.message;
    const key = dayKey(message.created_at);
    if (key !== day) {
      rows.push({ kind: 'day', key: `d:${key}`, label: dayLabelOf(message.created_at) });
      day = key;
      previous = null;
    }
    if (!message.sender) {
      rows.push({ kind: 'system', key: itemKey(item), item });
      previous = null;
      continue;
    }
    const first =
      !previous ||
      previous.message.sender?.id !== message.sender.id ||
      Date.parse(message.created_at) - Date.parse(previous.message.created_at) > GROUP_WINDOW_MS;
    rows.push({ kind: 'message', key: itemKey(item), item, mine: message.sender.id === myId, first });
    previous = item;
  }
  return rows;
}
```

- [ ] **Step 7: Add the translations**

Add a top-level `"chat"` block to `src/assets/i18n/en.json` (after `"notifications"`):

```json
"chat": {
  "title": "Chat",
  "open": "Open chat",
  "search": "Search chats",
  "newChat": "New chat",
  "pickPerson": "Choose a colleague",
  "searchPeople": "Search people",
  "empty": "No chats yet.",
  "noMatches": "No chats match your search.",
  "back": "Back to chats",
  "you": "You: {{text}}",
  "someone": "user",
  "attachment": "Attachment",
  "deleted": "This message was deleted",
  "deletedPreview": "Message deleted",
  "edited": "edited",
  "leftCompany": "Left the company",
  "membersCount": "{{count}} members",
  "today": "Today",
  "yesterday": "Yesterday",
  "newMessages": "New messages",
  "loadingOlder": "Loading earlier messages…",
  "noMessages": "No messages yet. Say hello!",
  "typingOne": "{{name}} is typing…",
  "typingMany": "{{count}} people are typing…",
  "placeholder": "Write a message",
  "send": "Send",
  "attach": "Attach files",
  "removeFile": "Remove file",
  "replyingTo": "Replying to {{name}}",
  "editing": "Editing message",
  "cancel": "Cancel",
  "reply": "Reply",
  "copy": "Copy",
  "edit": "Edit",
  "delete": "Delete",
  "actions": "Message actions",
  "copied": "Copied",
  "sending": "Sending…",
  "failed": "Not sent",
  "retry": "Retry",
  "remove": "Remove",
  "confirmDelete": "Delete this message for everyone?",
  "deletedToast": "Message deleted",
  "removed": "You are no longer in this chat.",
  "gone": "This chat is no longer available.",
  "mentionAll": "Everyone in this chat",
  "filesRejected": "Not attached: {{names}}",
  "fileRules": "Up to 5 files, 10 MB each",
  "note": {
    "peerLeft": "This person is no longer in the company.",
    "adminsOnly": "Only admins can post in this chat.",
    "readOnly": "You can only read this chat."
  },
  "system": {
    "roleChanged": "{{name}} is now {{role}}",
    "adminsOnly": "Only admins can post now",
    "everyone": "Everyone can post now"
  },
  "roles": {
    "owner": "owner",
    "admin": "admin",
    "member": "member",
    "readonly": "read-only"
  }
}
```

And the same keys in `src/assets/i18n/ar.json`:

```json
"chat": {
  "title": "الدردشة",
  "open": "فتح الدردشة",
  "search": "ابحث في المحادثات",
  "newChat": "محادثة جديدة",
  "pickPerson": "اختر زميلًا",
  "searchPeople": "ابحث عن شخص",
  "empty": "لا توجد محادثات بعد.",
  "noMatches": "لا توجد محادثات مطابقة.",
  "back": "العودة للمحادثات",
  "you": "أنت: {{text}}",
  "someone": "مستخدم",
  "attachment": "مرفق",
  "deleted": "تم حذف هذه الرسالة",
  "deletedPreview": "رسالة محذوفة",
  "edited": "معدّلة",
  "leftCompany": "غادر الشركة",
  "membersCount": "{{count}} عضو",
  "today": "اليوم",
  "yesterday": "أمس",
  "newMessages": "رسائل جديدة",
  "loadingOlder": "جارٍ تحميل الرسائل الأقدم…",
  "noMessages": "لا توجد رسائل بعد. ابدأ المحادثة!",
  "typingOne": "{{name}} يكتب…",
  "typingMany": "{{count}} أشخاص يكتبون…",
  "placeholder": "اكتب رسالة",
  "send": "إرسال",
  "attach": "إرفاق ملفات",
  "removeFile": "إزالة الملف",
  "replyingTo": "رد على {{name}}",
  "editing": "تعديل الرسالة",
  "cancel": "إلغاء",
  "reply": "رد",
  "copy": "نسخ",
  "edit": "تعديل",
  "delete": "حذف",
  "actions": "إجراءات الرسالة",
  "copied": "تم النسخ",
  "sending": "جارٍ الإرسال…",
  "failed": "لم تُرسل",
  "retry": "إعادة المحاولة",
  "remove": "إزالة",
  "confirmDelete": "حذف هذه الرسالة للجميع؟",
  "deletedToast": "تم حذف الرسالة",
  "removed": "لم تعد عضوًا في هذه المحادثة.",
  "gone": "هذه المحادثة لم تعد متاحة.",
  "mentionAll": "كل أعضاء المحادثة",
  "filesRejected": "لم يتم إرفاق: {{names}}",
  "fileRules": "حتى 5 ملفات، 10 ميجابايت لكل ملف",
  "note": {
    "peerLeft": "هذا الشخص لم يعد في الشركة.",
    "adminsOnly": "المشرفون فقط يمكنهم الكتابة في هذه المحادثة.",
    "readOnly": "يمكنك القراءة فقط في هذه المحادثة."
  },
  "system": {
    "roleChanged": "{{name}} أصبح {{role}}",
    "adminsOnly": "المشرفون فقط يمكنهم الكتابة الآن",
    "everyone": "يمكن للجميع الكتابة الآن"
  },
  "roles": {
    "owner": "مالك",
    "admin": "مشرف",
    "member": "عضو",
    "readonly": "قراءة فقط"
  }
}
```

Check both files still parse: `node -e "require('./src/assets/i18n/en.json');require('./src/assets/i18n/ar.json')"` (no output = OK).

- [ ] **Step 8: Run to see them pass**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include='src/app/{core,features}/chat/**/*.spec.ts'`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git branch --show-current
git add src/app/core/chat/chat-format.ts src/app/core/chat/chat-format.spec.ts src/app/core/chat/chat-rules.ts src/app/core/chat/chat-rules.spec.ts src/app/features/chat/mention-tokens.ts src/app/features/chat/mention-tokens.spec.ts src/app/features/chat/thread-rows.ts src/app/features/chat/thread-rows.spec.ts src/assets/i18n/en.json src/assets/i18n/ar.json
git commit -m "feat(chat): display helpers, rules, mention tokens and translations

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Typing tracker and the open thread

**Files:**
- Create: `src/app/core/chat/typing-tracker.ts`
- Create: `src/app/core/chat/chat-thread.ts`
- Test: `src/app/core/chat/typing-tracker.spec.ts`, `src/app/core/chat/chat-thread.spec.ts`

**Interfaces:**
- Consumes: `ChatApiService` (Task 2), window functions (Task 1), `AppError`.
- Produces:
  - `TYPING_SHOW_MS = 5_000`; `class TypingTracker { readonly all: Signal<ReadonlyMap<number, readonly number[]>>; usersIn(conversationId: number): number[]; add(conversationId: number, userId: number): void; clear(conversationId: number, userId: number): void; reset(): void }`
  - `interface ChatThreadDeps { api: ChatApiService; me: () => ChatUserRef; sent: (message: ChatMessage) => void; gone: () => void; refused: () => void; loaded: () => void; fail: (error: AppError) => void }`
  - `class ChatThread` with signals `items`, `members`, `loading`, `loadingOlder`, `hasOlder`, computed `newestId`, and methods `load()`, `loadMembers()`, `loadOlder()`, `apply(event: ChatEvent)`, `send(body: string, replyTo: ReplyPreview | null, files: File[])`, `retry(clientId: string)`, `discard(clientId: string)`, `edit(messageId: number, body: string)`, `deleteRequest(messageId: number): Observable<void>`, `catchUp()`, `nameOf(userId: number): string | undefined`.

- [ ] **Step 1: Write the failing tests**

`src/app/core/chat/typing-tracker.spec.ts`:

```ts
import { fakeAsync, tick } from '@angular/core/testing';
import { TYPING_SHOW_MS, TypingTracker } from './typing-tracker';

describe('TypingTracker', () => {
  it('shows a typing user for a few seconds, restarting on repeat', fakeAsync(() => {
    const typing = new TypingTracker();
    typing.add(12, 45);
    typing.add(12, 51);
    expect(typing.usersIn(12)).toEqual([45, 51]);
    tick(TYPING_SHOW_MS - 1000);
    typing.add(12, 45);
    tick(1000);
    expect(typing.usersIn(12)).toEqual([45]);
    tick(TYPING_SHOW_MS);
    expect(typing.usersIn(12)).toEqual([]);
  }));

  it('clears one user and resets everything', fakeAsync(() => {
    const typing = new TypingTracker();
    typing.add(12, 45);
    typing.add(13, 51);
    typing.clear(12, 45);
    expect(typing.usersIn(12)).toEqual([]);
    typing.reset();
    expect(typing.usersIn(13)).toEqual([]);
    tick(TYPING_SHOW_MS);
  }));
});
```

`src/app/core/chat/chat-thread.spec.ts`:

```ts
import { Observable, Subject, of, throwError } from 'rxjs';
import { ME, chatMember, chatMessage } from '../../testing/chat-fixtures';
import { ChatApiService } from './chat-api.service';
import { ChatMessage } from './chat.models';
import { ChatThread, ChatThreadDeps } from './chat-thread';

function page(from: number, count: number): ChatMessage[] {
  // Newest first, like the API.
  return Array.from({ length: count }, (_, i) => chatMessage(from + count - 1 - i));
}

describe('ChatThread', () => {
  let api: jasmine.SpyObj<ChatApiService>;
  let deps: jasmine.SpyObj<ChatThreadDeps> & ChatThreadDeps;

  beforeEach(() => {
    api = jasmine.createSpyObj<ChatApiService>('ChatApiService', ['messages', 'members', 'send', 'edit', 'remove']);
    api.members.and.returnValue(of([chatMember(45, 'Sara Ali')]));
    deps = {
      api,
      me: () => ME,
      sent: jasmine.createSpy('sent'),
      gone: jasmine.createSpy('gone'),
      refused: jasmine.createSpy('refused'),
      loaded: jasmine.createSpy('loaded'),
      fail: jasmine.createSpy('fail'),
    } as jasmine.SpyObj<ChatThreadDeps> & ChatThreadDeps;
  });

  it('loads the newest page and members, oldest first', () => {
    api.messages.and.returnValue(of(page(1, 50)));
    const thread = new ChatThread(12, deps);
    thread.load();
    expect(api.messages).toHaveBeenCalledWith(12, { limit: 50 });
    expect(thread.items()[0].message.id).toBe(1);
    expect(thread.newestId()).toBe(50);
    expect(thread.hasOlder()).toBeTrue();
    expect(thread.loading()).toBeFalse();
    expect(thread.nameOf(45)).toBe('Sara Ali');
    expect(deps.loaded).toHaveBeenCalled();
  });

  it('loads older pages until a short page comes back', () => {
    api.messages.and.returnValues(of(page(51, 50)), of(page(41, 10)));
    const thread = new ChatThread(12, deps);
    thread.load();
    thread.loadOlder();
    expect(api.messages.calls.mostRecent().args).toEqual([12, { before: 51, limit: 50 }]);
    expect(thread.items()[0].message.id).toBe(41);
    expect(thread.hasOlder()).toBeFalse();
    thread.loadOlder();
    expect(api.messages).toHaveBeenCalledTimes(2);
  });

  it('a 404 while loading the thread reports it gone', () => {
    api.messages.and.returnValue(throwError(() => ({ status: 404, message: 'Not found.', errors: {} })));
    const thread = new ChatThread(12, deps);
    thread.load();
    expect(deps.gone).toHaveBeenCalled();
  });

  it('sends: pending bubble, then the stored message', () => {
    api.messages.and.returnValue(of([]));
    const answer = new Subject<ChatMessage>();
    api.send.and.returnValue(answer);
    const thread = new ChatThread(12, deps);
    thread.load();
    thread.send('hi', null, []);
    const draft = api.send.calls.mostRecent().args[1];
    expect(draft.body).toBe('hi');
    expect(draft.clientId).toMatch(/[0-9a-f-]{36}/);
    expect(thread.items()[0].status).toBe('pending');
    const stored = chatMessage(9, { sender: ME, client_id: draft.clientId });
    answer.next(stored);
    expect(thread.items().map((i) => [i.message.id, i.status])).toEqual([[9, 'sent']]);
    expect(deps.sent).toHaveBeenCalledWith(stored);
  });

  it('a network failure can be retried with the same client id', () => {
    api.messages.and.returnValue(of([]));
    api.send.and.returnValue(throwError(() => ({ status: 0, message: 'x', errors: {} })));
    const thread = new ChatThread(12, deps);
    thread.load();
    thread.send('hi', null, []);
    const clientId = api.send.calls.mostRecent().args[1].clientId;
    expect(thread.items()[0]).toEqual(jasmine.objectContaining({ status: 'failed', retryable: true }));
    api.send.and.returnValue(of(chatMessage(9, { sender: ME, client_id: clientId })));
    thread.retry(clientId);
    expect(api.send.calls.mostRecent().args[1].clientId).toBe(clientId);
    expect(thread.items()[0].status).toBe('sent');
  });

  it('a 4xx failure shows the reason; 403 asks for a refresh of the chat', () => {
    api.messages.and.returnValue(of([]));
    api.send.and.returnValue(throwError(() => ({ status: 403, message: 'You cannot post in this chat.', errors: {} })));
    const thread = new ChatThread(12, deps);
    thread.load();
    thread.send('hi', null, []);
    expect(thread.items()[0]).toEqual(jasmine.objectContaining({ status: 'failed', retryable: false, error: 'You cannot post in this chat.' }));
    expect(deps.refused).toHaveBeenCalled();
    thread.discard(thread.items()[0].draft!.clientId);
    expect(thread.items()).toEqual([]);
  });

  it('applies socket events to the window', () => {
    api.messages.and.returnValue(of([chatMessage(1)]));
    const thread = new ChatThread(12, deps);
    thread.load();
    thread.apply({ type: 'chat.message', conversation_id: 12, message: chatMessage(2) });
    thread.apply({ type: 'chat.message_updated', conversation_id: 12, message: chatMessage(1, { body: 'edited' }) });
    thread.apply({ type: 'chat.message_deleted', conversation_id: 12, message_id: 2 });
    expect(thread.items().map((i) => [i.message.body, i.message.is_deleted])).toEqual([['edited', false], ['', true]]);
  });

  it('edits and deletes', () => {
    api.messages.and.returnValue(of([chatMessage(1, { sender: ME })]));
    api.edit.and.returnValue(of(chatMessage(1, { sender: ME, body: 'new', edited_at: '2026-10-15T10:00:00Z' })));
    api.remove.and.returnValue(of(undefined));
    const thread = new ChatThread(12, deps);
    thread.load();
    thread.edit(1, 'new');
    expect(thread.items()[0].message.edited_at).not.toBeNull();
    thread.deleteRequest(1).subscribe();
    expect(thread.items()[0].message.is_deleted).toBeTrue();
  });

  it('a failed edit is reported', () => {
    api.messages.and.returnValue(of([chatMessage(1, { sender: ME })]));
    const error = { status: 400, message: 'Unknown error', errors: { body: ['Too late.'] } };
    api.edit.and.returnValue(throwError(() => error));
    const thread = new ChatThread(12, deps);
    thread.load();
    thread.edit(1, 'new');
    expect(deps.fail).toHaveBeenCalledWith(error);
  });

  it('catches up after a reconnect: after-pages while full, then the newest window, then pending sends', () => {
    api.messages.and.returnValue(of([chatMessage(10)]));
    const pending = new Subject<ChatMessage>();
    api.send.and.returnValue(pending);
    const thread = new ChatThread(12, deps);
    thread.load();
    thread.send('later', null, []);
    api.messages.and.returnValues(of(page(11, 50)), of(page(61, 3)), of(page(14, 50)));
    api.send.and.returnValue(of(chatMessage(70, { sender: ME, client_id: api.send.calls.mostRecent().args[1].clientId })));
    thread.catchUp();
    const calls = api.messages.calls.allArgs().slice(1);
    expect(calls).toEqual([
      [12, { after: 10, limit: 50 }],
      [12, { after: 60, limit: 50 }],
      [12, { limit: 50 }],
    ]);
    expect(thread.newestId()).toBe(70);
    expect(thread.items().some((i) => i.status === 'pending')).toBeFalse();
  });
});
```

(The unused `Observable` import is fine to drop if the linter complains.)

- [ ] **Step 2: Run to see them fail**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include='src/app/core/chat/{typing-tracker,chat-thread}.spec.ts'`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement `typing-tracker.ts`**

```ts
import { signal } from '@angular/core';

/** How long "X is typing…" stays after the last typing event. */
export const TYPING_SHOW_MS = 5_000;

/** Who is typing in which chat; each entry expires on its own. */
export class TypingTracker {
  private readonly state = signal<ReadonlyMap<number, readonly number[]>>(new Map());
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
  readonly all = this.state.asReadonly();

  usersIn(conversationId: number): number[] {
    return [...(this.state().get(conversationId) ?? [])];
  }

  add(conversationId: number, userId: number): void {
    const key = `${conversationId}:${userId}`;
    clearTimeout(this.timers.get(key));
    this.timers.set(key, setTimeout(() => this.clear(conversationId, userId), TYPING_SHOW_MS));
    const users = this.state().get(conversationId) ?? [];
    if (!users.includes(userId)) {
      this.state.update((map) => new Map(map).set(conversationId, [...users, userId]));
    }
  }

  clear(conversationId: number, userId: number): void {
    const key = `${conversationId}:${userId}`;
    clearTimeout(this.timers.get(key));
    this.timers.delete(key);
    const users = this.state().get(conversationId);
    if (!users?.includes(userId)) {
      return;
    }
    this.state.update((map) => {
      const next = new Map(map);
      const left = users.filter((id) => id !== userId);
      if (left.length) {
        next.set(conversationId, left);
      } else {
        next.delete(conversationId);
      }
      return next;
    });
  }

  reset(): void {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();
    this.state.set(new Map());
  }
}
```

- [ ] **Step 4: Implement `chat-thread.ts`**

```ts
import { computed, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { AppError } from '../errors/app-error';
import { ChatApiService } from './chat-api.service';
import { errorText } from './chat-format';
import { CHAT_LIMITS, ChatEvent, ChatMember, ChatMessage, ChatUserRef, MessageDraft, ReplyPreview, ThreadItem } from './chat.models';
import { addPending, markDeleted, mergeMessages, newestId, oldestId, removeUnsent, replaceMessage, setStatus } from './message-window';

/** What a thread needs from the store. */
export interface ChatThreadDeps {
  api: ChatApiService;
  me: () => ChatUserRef;
  /** A message I sent was stored (the conversation moves to the top). */
  sent: (message: ChatMessage) => void;
  /** The chat is gone or I lost access (404). */
  gone: () => void;
  /** Posting was refused (403): the conversation's `can_post` is stale. */
  refused: () => void;
  /** The first page arrived. */
  loaded: () => void;
  /** A 4xx on load, edit or members (not 404): show it. */
  fail: (error: AppError) => void;
}

const PAGE = CHAT_LIMITS.pageSize;

/** One open chat: its loaded messages (oldest first), members, and sending. Created by ChatStore per opening. */
export class ChatThread {
  readonly items = signal<ThreadItem[]>([]);
  readonly members = signal<ChatMember[]>([]);
  readonly loading = signal(true);
  readonly loadingOlder = signal(false);
  readonly hasOlder = signal(false);
  readonly newestId = computed(() => newestId(this.items()));
  private catchingUp = false;

  constructor(
    readonly conversationId: number,
    private readonly deps: ChatThreadDeps,
  ) {}

  nameOf(userId: number): string | undefined {
    return this.members().find((member) => member.user.id === userId)?.user.name;
  }

  load(): void {
    this.deps.api.messages(this.conversationId, { limit: PAGE }).subscribe({
      next: (page) => {
        this.items.update((items) => mergeMessages(items, page));
        this.hasOlder.set(page.length === PAGE);
        this.loading.set(false);
        this.deps.loaded();
      },
      error: (error: AppError) => {
        this.loading.set(false);
        this.handle(error);
      },
    });
    this.loadMembers();
  }

  loadMembers(): void {
    this.deps.api.members(this.conversationId).subscribe({
      next: (members) => this.members.set(members),
      error: () => undefined,
    });
  }

  loadOlder(): void {
    const before = oldestId(this.items());
    if (!this.hasOlder() || this.loadingOlder() || before === null) {
      return;
    }
    this.loadingOlder.set(true);
    this.deps.api.messages(this.conversationId, { before, limit: PAGE }).subscribe({
      next: (page) => {
        this.items.update((items) => mergeMessages(items, page));
        this.hasOlder.set(page.length === PAGE);
        this.loadingOlder.set(false);
      },
      error: (error: AppError) => {
        this.loadingOlder.set(false);
        this.handle(error);
      },
    });
  }

  apply(event: ChatEvent): void {
    switch (event.type) {
      case 'chat.message':
        this.items.update((items) => mergeMessages(items, [event.message]));
        break;
      case 'chat.message_updated':
        this.items.update((items) => replaceMessage(items, event.message));
        break;
      case 'chat.message_deleted':
        this.items.update((items) => markDeleted(items, event.message_id));
        break;
    }
  }

  send(body: string, replyTo: ReplyPreview | null, files: File[]): void {
    const draft: MessageDraft = { body, replyTo: replyTo?.id ?? null, files, clientId: crypto.randomUUID() };
    this.items.update((items) => addPending(items, draft, this.deps.me(), this.conversationId, replyTo));
    this.post(draft);
  }

  retry(clientId: string): void {
    const item = this.items().find((i) => i.status !== 'sent' && i.draft?.clientId === clientId);
    if (!item?.draft) {
      return;
    }
    this.items.update((items) => setStatus(items, clientId, 'pending'));
    this.post(item.draft);
  }

  discard(clientId: string): void {
    this.items.update((items) => removeUnsent(items, clientId));
  }

  edit(messageId: number, body: string): void {
    this.deps.api.edit(messageId, body).subscribe({
      next: (message) => this.items.update((items) => replaceMessage(items, message)),
      error: (error: AppError) => this.handle(error),
    });
  }

  /** For ConfirmService.confirmAction: deletes on the server, then marks it deleted here. */
  deleteRequest(messageId: number): Observable<void> {
    return this.deps.api.remove(messageId).pipe(tap(() => this.items.update((items) => markDeleted(items, messageId))));
  }

  /**
   * After a socket drop: newer messages page by page (`after`) while pages come back full, then the newest window
   * again so edits and deletions apply, then the sends that never got an answer.
   */
  catchUp(): void {
    if (this.catchingUp || this.loading()) {
      return;
    }
    this.catchingUp = true;
    const step = (after: number | null): void => {
      if (after === null) {
        this.refreshNewest();
        return;
      }
      this.deps.api.messages(this.conversationId, { after, limit: PAGE }).subscribe({
        next: (page) => {
          this.items.update((items) => mergeMessages(items, page));
          if (page.length === PAGE) {
            step(newestId(this.items()));
          } else {
            this.refreshNewest();
          }
        },
        error: (error: AppError) => {
          this.catchingUp = false;
          this.handle(error);
        },
      });
    };
    step(newestId(this.items()));
  }

  private refreshNewest(): void {
    this.deps.api.messages(this.conversationId, { limit: PAGE }).subscribe({
      next: (page) => {
        this.items.update((items) => mergeMessages(items, page));
        this.catchingUp = false;
        for (const item of this.items()) {
          if (item.status === 'pending' && item.draft) {
            this.post(item.draft);
          }
        }
      },
      error: (error: AppError) => {
        this.catchingUp = false;
        this.handle(error);
      },
    });
  }

  private post(draft: MessageDraft): void {
    this.deps.api.send(this.conversationId, draft).subscribe({
      next: (message) => {
        this.items.update((items) => mergeMessages(items, [message]));
        this.deps.sent(message);
      },
      error: (error: AppError) => {
        const retryable = error.status === 0 || error.status >= 500;
        this.items.update((items) => setStatus(items, draft.clientId, 'failed', retryable ? undefined : errorText(error), retryable));
        if (error.status === 403) {
          this.deps.refused();
        } else if (error.status === 404) {
          this.deps.gone();
        }
      },
    });
  }

  private handle(error: AppError): void {
    if (error.status === 404) {
      this.deps.gone();
    } else if (error.status >= 400 && error.status < 500 && error.status !== 401) {
      this.deps.fail(error);
    }
  }
}
```

- [ ] **Step 5: Run to see them pass**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include='src/app/core/chat/{typing-tracker,chat-thread}.spec.ts'`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git branch --show-current
git add src/app/core/chat/typing-tracker.ts src/app/core/chat/typing-tracker.spec.ts src/app/core/chat/chat-thread.ts src/app/core/chat/chat-thread.spec.ts
git commit -m "feat(chat): typing tracker and the open thread

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: ChatStore

**Files:**
- Create: `src/app/core/chat/chat.store.ts`
- Test: `src/app/core/chat/chat.store.spec.ts`

**Interfaces:**
- Consumes: `ChatApiService`, `NotificationCenterService` (`chatEvents$`, `reconnected$`, `send`, `refresh`), `AccessService.can`, `AuthService.user`, `NotificationService` (`warn`, `failure`), `TranslateService`, `ChatThread`, `TypingTracker`, `errorText`.
- Produces (`ChatStore`, root):
  - Signals: `enabled`, `conversations`, `listLoading`, `listLoaded`, `unreadTotal`, `drawerOpen`, `thread` (`ChatThread | null`), `current` (`Conversation | null`), `view` (`'list' | 'thread'`), `myId`; field `typing: TypingTracker`.
  - Methods: `openDrawer(conversationId?: number)`, `closeDrawer()`, `toggleDrawer()`, `openThread(id: number)`, `backToList()`, `startDirect(userId: number)`, `typed()`.
  - Constants `READ_DEBOUNCE_MS = 1_000`, `TYPING_SEND_EVERY_MS = 3_000`.

- [ ] **Step 1: Write the failing tests**

`src/app/core/chat/chat.store.spec.ts`:

```ts
import { signal } from '@angular/core';
import { TestBed, discardPeriodicTasks, fakeAsync, tick } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { Subject } from 'rxjs';
import { envelope, errorEnvelope, provideApiTesting } from '../../testing/api-testing';
import { ME, chatMessage, conversation } from '../../testing/chat-fixtures';
import { AccessService } from '../auth/access.service';
import { AuthService } from '../auth/auth.service';
import { NotificationCenterService } from '../notifications/notification-center.service';
import { NotificationService } from '../services/notification.service';
import { ChatEvent } from './chat.models';
import { ChatStore, READ_DEBOUNCE_MS, TYPING_SEND_EVERY_MS } from './chat.store';

describe('ChatStore', () => {
  let http: HttpTestingController;
  let events: Subject<ChatEvent>;
  let reconnected: Subject<void>;
  let center: { chatEvents$: Subject<ChatEvent>; reconnected$: Subject<void>; send: jasmine.Spy; refresh: jasmine.Spy };
  let toast: jasmine.SpyObj<NotificationService>;
  const allowed = signal(true);
  const user = signal<{ id: string; name: string } | null>({ id: '7', name: 'Me Myself' });

  const base = '/api/chat/v1/';

  beforeEach(() => {
    allowed.set(true);
    user.set({ id: '7', name: 'Me Myself' });
    events = new Subject();
    reconnected = new Subject();
    center = { chatEvents$: events, reconnected$: reconnected, send: jasmine.createSpy('send'), refresh: jasmine.createSpy('refresh') };
    toast = jasmine.createSpyObj<NotificationService>('NotificationService', ['warn', 'failure', 'success', 'error', 'info']);
    TestBed.configureTestingModule({
      providers: [
        ...provideApiTesting(),
        { provide: AuthService, useValue: { user } },
        { provide: AccessService, useValue: { can: () => allowed() } },
        { provide: NotificationCenterService, useValue: center },
        { provide: NotificationService, useValue: toast },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function create(unread = 3): ChatStore {
    const store = TestBed.inject(ChatStore);
    TestBed.tick();
    http.expectOne(`${base}unread/`).flush(envelope({ conversations: 1, messages: unread }));
    return store;
  }

  function openDrawerWith(store: ChatStore, list = [conversation(12, { unread_count: 2 }), conversation(13)]): void {
    store.openDrawer();
    http.expectOne(`${base}conversations/`).flush(envelope(list));
  }

  function openThread(store: ChatStore, id = 12, messages = [chatMessage(1)]): void {
    store.openThread(id);
    http.expectOne((r) => r.url === `${base}conversations/${id}/messages/`).flush(envelope(messages));
    http.expectOne(`${base}conversations/${id}/members/`).flush(envelope([]));
  }

  it('loads the unread total when chat is allowed', () => {
    const store = create(3);
    expect(store.enabled()).toBeTrue();
    expect(store.unreadTotal()).toBe(3);
  });

  it('does nothing without chat access', () => {
    allowed.set(false);
    const store = TestBed.inject(ChatStore);
    TestBed.tick();
    http.expectNone(`${base}unread/`);
    store.openDrawer();
    expect(store.drawerOpen()).toBeFalse();
  });

  it('loads the list once when the drawer opens', () => {
    const store = create();
    openDrawerWith(store);
    expect(store.drawerOpen()).toBeTrue();
    expect(store.conversations().map((c) => c.id)).toEqual([12, 13]);
    store.closeDrawer();
    store.openDrawer();
    http.expectNone(`${base}conversations/`);
  });

  it('counts messages before the list is loaded', () => {
    const store = create(3);
    events.next({ type: 'chat.message', conversation_id: 12, message: chatMessage(5) });
    expect(store.unreadTotal()).toBe(4);
    events.next({ type: 'chat.message', conversation_id: 12, message: chatMessage(6, { sender: ME }) });
    expect(store.unreadTotal()).toBe(4);
  });

  it('moves a chat to the top with its new message and unread count', () => {
    const store = create(3);
    openDrawerWith(store);
    events.next({ type: 'chat.message', conversation_id: 13, message: chatMessage(5, { conversation: 13 }) });
    expect(store.conversations()[0]).toEqual(jasmine.objectContaining({ id: 13, unread_count: 1 }));
    expect(store.conversations()[0].last_message?.id).toBe(5);
  });

  it('fetches a chat it does not know yet', () => {
    const store = create();
    openDrawerWith(store);
    events.next({ type: 'chat.message', conversation_id: 99, message: chatMessage(5, { conversation: 99 }) });
    http.expectOne(`${base}conversations/99/`).flush(envelope(conversation(99, { unread_count: 1 })));
    expect(store.conversations()[0].id).toBe(99);
  });

  it('opening a thread zeroes its unread and marks it read after the debounce', fakeAsync(() => {
    const store = create(3);
    openDrawerWith(store);
    openThread(store, 12, [chatMessage(1), chatMessage(2)]);
    expect(store.view()).toBe('thread');
    expect(store.conversations()[0].unread_count).toBe(0);
    expect(store.unreadTotal()).toBe(1);
    tick(READ_DEBOUNCE_MS);
    const read = http.expectOne(`${base}conversations/12/read/`);
    expect(read.request.body).toEqual({ message_id: 2 });
    read.flush(envelope({ last_read_message_id: 2 }));
    http.expectOne(`${base}unread/`).flush(envelope({ conversations: 0, messages: 1 }));
    expect(center.refresh).toHaveBeenCalled();
  }));

  it('messages in the open thread are appended and read, not counted', fakeAsync(() => {
    const store = create(0);
    openDrawerWith(store, [conversation(12)]);
    openThread(store);
    events.next({ type: 'chat.message', conversation_id: 12, message: chatMessage(2) });
    expect(store.unreadTotal()).toBe(0);
    expect(store.thread()!.items().map((i) => i.message.id)).toEqual([1, 2]);
    tick(READ_DEBOUNCE_MS);
    http.expectOne(`${base}conversations/12/read/`).flush(envelope({ last_read_message_id: 2 }));
    http.expectOne(`${base}unread/`).flush(envelope({ conversations: 0, messages: 0 }));
  }));

  it('list arriving after opening a thread keeps the open chat read', fakeAsync(() => {
    const store = create(2);
    store.openDrawer(12);
    const list = http.expectOne(`${base}conversations/`);
    http.expectOne(`${base}conversations/12/`).flush(envelope(conversation(12, { unread_count: 2 })));
    http.expectOne((r) => r.url === `${base}conversations/12/messages/`).flush(envelope([chatMessage(1)]));
    http.expectOne(`${base}conversations/12/members/`).flush(envelope([]));
    list.flush(envelope([conversation(12, { unread_count: 2 })]));
    expect(store.conversations()[0].unread_count).toBe(0);
    tick(READ_DEBOUNCE_MS);
    http.expectOne(`${base}conversations/12/read/`).flush(envelope({ last_read_message_id: 1 }));
    http.expectOne(`${base}unread/`).flush(envelope({ conversations: 0, messages: 0 }));
    expect(store.unreadTotal()).toBe(0);
  }));

  it('my read from another tab clears that chat', () => {
    const store = create(3);
    openDrawerWith(store);
    events.next({ type: 'chat.read', conversation_id: 12, user_id: 7, message_id: 9 });
    expect(store.conversations()[0].unread_count).toBe(0);
    http.expectOne(`${base}unread/`).flush(envelope({ conversations: 0, messages: 1 }));
    expect(store.unreadTotal()).toBe(1);
    events.next({ type: 'chat.read', conversation_id: 13, user_id: 45, message_id: 9 });
    http.expectNone(`${base}unread/`);
  });

  it('refetches a chat on chat.conversation', () => {
    const store = create();
    openDrawerWith(store);
    events.next({ type: 'chat.conversation', conversation_id: 13, action: 'updated' });
    http.expectOne(`${base}conversations/13/`).flush(envelope(conversation(13, { can_post: false })));
    expect(store.conversations().find((c) => c.id === 13)?.can_post).toBeFalse();
  });

  it('chat.removed on the open thread goes back to the list', () => {
    const store = create();
    openDrawerWith(store);
    openThread(store, 13);
    events.next({ type: 'chat.removed', conversation_id: 13 });
    http.expectOne(`${base}unread/`).flush(envelope({ conversations: 0, messages: 0 }));
    expect(store.view()).toBe('list');
    expect(store.conversations().map((c) => c.id)).toEqual([12]);
    expect(toast.warn).toHaveBeenCalled();
  });

  it('a 404 while loading the thread drops it', () => {
    const store = create();
    openDrawerWith(store);
    store.openThread(13);
    http.expectOne((r) => r.url === `${base}conversations/13/messages/`).flush(errorEnvelope(404, 'Not found.'), { status: 404, statusText: 'Not Found' });
    http.expectOne(`${base}conversations/13/members/`).flush(envelope([]));
    http.expectOne(`${base}unread/`).flush(envelope({ conversations: 0, messages: 0 }));
    expect(store.view()).toBe('list');
    expect(store.conversations().map((c) => c.id)).toEqual([12]);
  });

  it('shows typing and clears it when that person posts', fakeAsync(() => {
    const store = create(0);
    openDrawerWith(store, [conversation(12)]);
    openThread(store);
    events.next({ type: 'chat.typing', conversation_id: 12, user_id: 45 });
    expect(store.typing.usersIn(12)).toEqual([45]);
    events.next({ type: 'chat.message', conversation_id: 12, message: chatMessage(2) });
    expect(store.typing.usersIn(12)).toEqual([]);
    tick(READ_DEBOUNCE_MS);
    http.expectOne(`${base}conversations/12/read/`).flush(envelope({ last_read_message_id: 2 }));
    http.expectOne(`${base}unread/`).flush(envelope({ conversations: 0, messages: 0 }));
  }));

  it('sends typing at most every 3 seconds, only where I may post', fakeAsync(() => {
    const store = create(0);
    openDrawerWith(store, [conversation(12), conversation(13, { can_post: false })]);
    openThread(store, 12);
    store.typed();
    store.typed();
    expect(center.send).toHaveBeenCalledTimes(1);
    expect(center.send).toHaveBeenCalledWith({ action: 'typing', conversation_id: 12 });
    tick(TYPING_SEND_EVERY_MS);
    store.typed();
    expect(center.send).toHaveBeenCalledTimes(2);
    store.backToList();
    openThread(store, 13);
    store.typed();
    expect(center.send).toHaveBeenCalledTimes(2);
    discardPeriodicTasks();
  }));

  it('resyncs after a reconnect', () => {
    const store = create(0);
    openDrawerWith(store, [conversation(12)]);
    openThread(store, 12, [chatMessage(1)]);
    reconnected.next();
    http.expectOne(`${base}unread/`).flush(envelope({ conversations: 0, messages: 0 }));
    http.expectOne(`${base}conversations/`).flush(envelope([conversation(12)]));
    http.expectOne((r) => r.url === `${base}conversations/12/messages/` && r.params.get('after') === '1').flush(envelope([]));
    http.expectOne((r) => r.url === `${base}conversations/12/messages/` && !r.params.has('after')).flush(envelope([chatMessage(1)]));
  });

  it('starts a direct chat and opens it', () => {
    const store = create(0);
    openDrawerWith(store, [conversation(12)]);
    store.startDirect(45);
    http.expectOne(`${base}conversations/direct/`).flush(envelope(conversation(20, { kind: 'direct' })));
    http.expectOne((r) => r.url === `${base}conversations/20/messages/`).flush(envelope([]));
    http.expectOne(`${base}conversations/20/members/`).flush(envelope([]));
    expect(store.conversations()[0].id).toBe(20);
    expect(store.current()?.id).toBe(20);
  });

  it('shows why a direct chat cannot start', () => {
    const store = create(0);
    store.startDirect(45);
    http.expectOne(`${base}conversations/direct/`).flush(errorEnvelope(400, 'This user cannot be messaged.'), { status: 400, statusText: 'Bad Request' });
    expect(toast.failure).toHaveBeenCalled();
  });

  it('forgets everything when chat access is lost', () => {
    const store = create(3);
    openDrawerWith(store);
    allowed.set(false);
    TestBed.tick();
    expect(store.drawerOpen()).toBeFalse();
    expect(store.conversations()).toEqual([]);
    expect(store.unreadTotal()).toBe(0);
  });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include='src/app/core/chat/chat.store.spec.ts'`
Expected: FAIL — `./chat.store` not found.

- [ ] **Step 3: Implement**

`src/app/core/chat/chat.store.ts`:

```ts
import { DestroyRef, Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateService } from '@ngx-translate/core';
import { AccessService } from '../auth/access.service';
import { AuthService } from '../auth/auth.service';
import { AppError } from '../errors/app-error';
import { NotificationCenterService } from '../notifications/notification-center.service';
import { NotificationService } from '../services/notification.service';
import { ChatApiService } from './chat-api.service';
import { errorText } from './chat-format';
import { ChatThread } from './chat-thread';
import { ChatEvent, ChatMessage, ChatUserRef, Conversation } from './chat.models';
import { TypingTracker } from './typing-tracker';

/** Incoming messages in the open chat are marked read this long after the last one. */
export const READ_DEBOUNCE_MS = 1_000;
/** The backend drops typing frames closer than this. */
export const TYPING_SEND_EVERY_MS = 3_000;

/**
 * Chat state for the header badge and the drawer: the conversation list, the unread total, the open thread and
 * who is typing. The only place socket events and REST answers are applied. Active only with chat access
 * (`access_chat` + `view_chat`); losing it or signing out forgets everything.
 */
@Injectable({ providedIn: 'root' })
export class ChatStore {
  private readonly api = inject(ChatApiService);
  private readonly center = inject(NotificationCenterService);
  private readonly access = inject(AccessService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(NotificationService);
  private readonly translate = inject(TranslateService);

  private readonly conversationsState = signal<Conversation[]>([]);
  private readonly listState = signal<'idle' | 'loading' | 'ready'>('idle');
  private readonly unreadState = signal(0);
  private readonly drawerState = signal(false);
  private readonly threadState = signal<ChatThread | null>(null);
  private readonly currentState = signal<Conversation | null>(null);
  private readTimer?: ReturnType<typeof setTimeout>;
  /** The newest id already sent as read, per chat, so the same marker is not posted twice. */
  private readonly readSent = new Map<number, number>();
  private readonly typingSent = new Map<number, number>();

  readonly typing = new TypingTracker();
  readonly enabled = computed(() => this.access.can('access_chat') && this.access.can('view_chat'));
  readonly conversations = this.conversationsState.asReadonly();
  readonly listLoading = computed(() => this.listState() === 'loading');
  readonly listLoaded = computed(() => this.listState() === 'ready');
  readonly unreadTotal = this.unreadState.asReadonly();
  readonly drawerOpen = this.drawerState.asReadonly();
  readonly thread = this.threadState.asReadonly();
  /** The open thread's conversation (from the list, or fetched when opened from a bell). */
  readonly current = this.currentState.asReadonly();
  readonly view = computed<'list' | 'thread'>(() => (this.threadState() ? 'thread' : 'list'));
  readonly myId = computed(() => Number(this.auth.user()?.id ?? 0));

  constructor() {
    this.center.chatEvents$.pipe(takeUntilDestroyed(inject(DestroyRef))).subscribe((event) => this.enabled() && this.handle(event));
    this.center.reconnected$.pipe(takeUntilDestroyed(inject(DestroyRef))).subscribe(() => this.enabled() && this.resync());
    // A new user, or chat access granted/taken away: start from nothing.
    effect(() => {
      const on = this.enabled();
      this.auth.user()?.id;
      untracked(() => {
        this.reset();
        if (on) {
          this.loadUnread();
        }
      });
    });
  }

  openDrawer(conversationId?: number): void {
    if (!this.enabled()) {
      return;
    }
    this.drawerState.set(true);
    this.ensureList();
    if (conversationId) {
      this.openThread(conversationId);
    }
  }

  closeDrawer(): void {
    this.drawerState.set(false);
    this.backToList();
  }

  toggleDrawer(): void {
    if (this.drawerState()) {
      this.closeDrawer();
    } else {
      this.openDrawer();
    }
  }

  openThread(id: number): void {
    this.backToList();
    const known = this.conversationsState().find((c) => c.id === id) ?? null;
    this.currentState.set(known);
    if (!known) {
      this.api.conversation(id).subscribe({
        next: (conversation) => this.threadState()?.conversationId === id && this.currentState.set(conversation),
        error: (error: AppError) => error.status === 404 && this.onGone(id),
      });
    }
    const hadUnread = known ? known.unread_count > 0 : true;
    if (known?.unread_count) {
      this.unreadState.update((n) => Math.max(0, n - known.unread_count));
      this.patch(id, (c) => ({ ...c, unread_count: 0 }));
    }
    const thread = new ChatThread(id, {
      api: this.api,
      me: () => this.me(),
      sent: (message) => this.onNewMessage(id, message, false),
      gone: () => this.onGone(id),
      refused: () => this.refetch(id),
      loaded: () => hadUnread && this.scheduleRead(),
      fail: (error) => this.toast.failure(error, errorText(error)),
    });
    this.threadState.set(thread);
    thread.load();
  }

  backToList(): void {
    clearTimeout(this.readTimer);
    this.threadState.set(null);
    this.currentState.set(null);
  }

  startDirect(userId: number): void {
    this.api.direct(userId).subscribe({
      next: (conversation) => {
        if (this.listLoaded()) {
          this.upsert(conversation, true);
        }
        this.openThread(conversation.id);
      },
      error: (error: AppError) => {
        if (error.status >= 400 && error.status < 500 && error.status !== 401) {
          this.toast.failure(error, errorText(error));
        }
      },
    });
  }

  /** The composer changed: tell the others, at most every 3 s, only where I may post. */
  typed(): void {
    const thread = this.threadState();
    if (!thread || !this.currentState()?.can_post) {
      return;
    }
    const now = Date.now();
    if (now - (this.typingSent.get(thread.conversationId) ?? -Infinity) < TYPING_SEND_EVERY_MS) {
      return;
    }
    this.typingSent.set(thread.conversationId, now);
    this.center.send({ action: 'typing', conversation_id: thread.conversationId });
  }

  private me(): ChatUserRef {
    return { id: this.myId(), name: this.auth.user()?.name ?? '', is_active: true };
  }

  private handle(event: ChatEvent): void {
    const id = event.conversation_id;
    const thread = this.threadState();
    const open = thread?.conversationId === id ? thread : null;
    switch (event.type) {
      case 'chat.message': {
        const mine = event.message.sender?.id === this.myId();
        const counts = !mine && !open;
        if (counts) {
          this.unreadState.update((n) => n + 1);
        }
        this.onNewMessage(id, event.message, counts);
        if (open) {
          open.apply(event);
          if (event.message.sender) {
            this.typing.clear(id, event.message.sender.id);
          }
          if (!mine) {
            this.scheduleRead();
          }
        }
        break;
      }
      case 'chat.message_updated':
        this.patch(id, (c) => (c.last_message?.id === event.message.id ? { ...c, last_message: event.message } : c));
        open?.apply(event);
        break;
      case 'chat.message_deleted':
        this.patch(id, (c) =>
          c.last_message?.id === event.message_id ? { ...c, last_message: { ...c.last_message, is_deleted: true, body: '', attachments: [] } } : c,
        );
        open?.apply(event);
        this.loadUnread();
        break;
      case 'chat.read':
        if (event.user_id === this.myId()) {
          this.patch(id, (c) => ({ ...c, unread_count: 0 }));
          this.loadUnread();
        }
        break;
      case 'chat.conversation':
        if (this.listLoaded() || open) {
          this.refetch(id);
        }
        if (open && (event.action === 'member_added' || event.action === 'member_removed')) {
          open.loadMembers();
        }
        break;
      case 'chat.removed':
        this.conversationsState.update((list) => list.filter((c) => c.id !== id));
        this.loadUnread();
        if (open) {
          this.backToList();
          this.toast.warn(this.translate.instant('chat.removed'));
        }
        break;
      case 'chat.typing':
        if (event.user_id !== this.myId()) {
          this.typing.add(id, event.user_id);
        }
        break;
    }
  }

  private onNewMessage(id: number, message: ChatMessage, counts: boolean): void {
    if (!this.listLoaded()) {
      return;
    }
    const existing = this.conversationsState().find((c) => c.id === id);
    if (!existing) {
      this.refetch(id);
      return;
    }
    this.upsert(
      { ...existing, last_message: message, last_message_at: message.created_at, unread_count: existing.unread_count + (counts ? 1 : 0) },
      true,
    );
  }

  private ensureList(): void {
    if (this.listState() !== 'idle') {
      return;
    }
    this.listState.set('loading');
    this.api.conversations().subscribe({
      next: (list) => {
        const openId = this.threadState()?.conversationId;
        this.conversationsState.set(list.map((c) => (c.id === openId ? { ...c, unread_count: 0 } : c)));
        this.listState.set('ready');
      },
      error: () => this.listState.set('idle'),
    });
  }

  private refetch(id: number): void {
    this.api.conversation(id).subscribe({
      next: (conversation) => {
        const known = this.conversationsState().some((c) => c.id === id);
        if (this.listLoaded() || known) {
          this.upsert(this.threadState()?.conversationId === id ? { ...conversation, unread_count: 0 } : conversation, !known);
        } else if (this.currentState()?.id === id) {
          this.currentState.set(conversation);
        }
      },
      error: (error: AppError) => error.status === 404 && this.onGone(id),
    });
  }

  private upsert(conversation: Conversation, toTop: boolean): void {
    this.conversationsState.update((list) => {
      const rest = list.filter((c) => c.id !== conversation.id);
      if (toTop) {
        return [conversation, ...rest];
      }
      const index = list.findIndex((c) => c.id === conversation.id);
      return index < 0 ? [...list, conversation] : list.map((c) => (c.id === conversation.id ? conversation : c));
    });
    if (this.currentState()?.id === conversation.id || this.threadState()?.conversationId === conversation.id) {
      this.currentState.set(conversation);
    }
  }

  private patch(id: number, change: (c: Conversation) => Conversation): void {
    this.conversationsState.update((list) => list.map((c) => (c.id === id ? change(c) : c)));
    const current = this.currentState();
    if (current?.id === id) {
      this.currentState.set(change(current));
    }
  }

  private onGone(id: number): void {
    this.conversationsState.update((list) => list.filter((c) => c.id !== id));
    if (this.threadState()?.conversationId === id) {
      this.backToList();
      this.toast.warn(this.translate.instant('chat.gone'));
    }
    this.loadUnread();
  }

  private scheduleRead(): void {
    clearTimeout(this.readTimer);
    this.readTimer = setTimeout(() => this.sendRead(), READ_DEBOUNCE_MS);
  }

  private sendRead(): void {
    const thread = this.threadState();
    const newest = thread?.newestId();
    if (!thread || newest === null || newest === undefined) {
      return;
    }
    const id = thread.conversationId;
    if (newest <= (this.readSent.get(id) ?? 0)) {
      return;
    }
    this.readSent.set(id, newest);
    this.api.read(id, newest).subscribe({
      next: () => {
        this.loadUnread();
        this.center.refresh();
      },
      error: (error: AppError) => error.status === 404 && this.onGone(id),
    });
  }

  private loadUnread(): void {
    this.api.unread().subscribe({
      next: (summary) => this.unreadState.set(summary.messages),
      error: () => undefined,
    });
  }

  private resync(): void {
    this.loadUnread();
    if (this.listLoaded()) {
      this.api.conversations().subscribe({
        next: (list) => {
          const openId = this.threadState()?.conversationId;
          this.conversationsState.set(list.map((c) => (c.id === openId ? { ...c, unread_count: 0 } : c)));
        },
        error: () => undefined,
      });
    }
    this.threadState()?.catchUp();
  }

  private reset(): void {
    this.backToList();
    this.drawerState.set(false);
    this.conversationsState.set([]);
    this.listState.set('idle');
    this.unreadState.set(0);
    this.typing.reset();
    this.readSent.clear();
    this.typingSent.clear();
  }
}
```

- [ ] **Step 4: Run to see it pass**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include='src/app/core/chat/chat.store.spec.ts'`
Expected: PASS. If the "list arriving after opening a thread" test sees the open row with `unread_count: 2`, check that `ensureList()` maps the open id to 0.

- [ ] **Step 5: Commit**

```bash
git branch --show-current
git add src/app/core/chat/chat.store.ts src/app/core/chat/chat.store.spec.ts
git commit -m "feat(chat): chat store for the list, unread badge, open thread and live events

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Drawer, conversation list, new-chat dialog and wiring

The first visible deliverable: the header button with its badge opens the drawer showing the list; clicking a row
opens an empty thread placeholder until Task 10.

**Files:**
- Create: `src/app/features/chat/chat-drawer.component.ts`
- Create: `src/app/features/chat/conversation-list.component.ts`
- Create: `src/app/features/chat/new-chat-dialog.component.ts`
- Modify: `src/app/layout/header/header.component.ts`, `src/app/layout/header/header.component.html`
- Modify: `src/app/layout/shell/shell.component.ts`, `src/app/layout/shell/shell.component.html`
- Modify: `src/app/features/notifications/notifications-page.component.ts`
- Test: `src/app/features/chat/conversation-list.component.spec.ts`, `src/app/layout/header/header.component.spec.ts` (create if missing)

**Interfaces:**
- Consumes: `ChatStore` (Task 6), `chatConversationId` (Task 1), `conversationTitle`, `conversationIcon`, `initials`, `messagePreview`, `chatTime` (Task 4), `CompanyUserService.userOptions(): Observable<SelectOption[]>`.
- Produces: `<app-chat-drawer>`, `<app-conversation-list>`, `<app-new-chat-dialog [(visible)]>`. The drawer's thread slot is filled in Task 10.

- [ ] **Step 1: Write the failing tests**

`src/app/features/chat/conversation-list.component.spec.ts`:

```ts
import { signal } from '@angular/core';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideApiTesting } from '../../testing/api-testing';
import { chatMessage, chatUser, conversation } from '../../testing/chat-fixtures';
import { ChatStore } from '../../core/chat/chat.store';
import { LanguageService } from '../../core/services/language.service';
import { ConversationListComponent } from './conversation-list.component';

describe('ConversationListComponent', () => {
  const list = signal([
    conversation(12, { unread_count: 2, last_message: chatMessage(5, { body: 'Count at 3' }), last_message_at: '2026-10-15T09:00:00+03:00' }),
    conversation(13, { kind: 'direct', other_user: chatUser(45, 'Sara Ali', false) }),
    conversation(14, { kind: 'company', name_en: 'Acme' }),
  ]);
  const store = {
    conversations: list,
    listLoading: signal(false),
    listLoaded: signal(true),
    myId: signal(7),
    openThread: jasmine.createSpy('openThread'),
  };
  const lang = signal<'en' | 'ar'>('en');

  beforeEach(() => {
    store.openThread.calls.reset();
    TestBed.configureTestingModule({
      imports: [ConversationListComponent],
      providers: [
        ...provideApiTesting(),
        provideAnimations(),
        { provide: ChatStore, useValue: store },
        { provide: LanguageService, useValue: { currentLang: lang, direction: signal('ltr') } },
      ],
    });
  });

  function render() {
    const fixture = TestBed.createComponent(ConversationListComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('shows titles, previews, unread badges and the left-company tag', () => {
    const text = render().nativeElement.textContent as string;
    expect(text).toContain('Chat 12');
    expect(text).toContain('Count at 3');
    expect(text).toContain('Sara Ali');
    expect(text).toContain('chat.leftCompany');
    expect(text).toContain('Acme');
    expect(render().nativeElement.querySelector('[data-test=unread-12]').textContent.trim()).toBe('2');
  });

  it('filters by title after the debounce', fakeAsync(() => {
    const fixture = render();
    fixture.componentInstance.search.set('sara');
    tick(300);
    fixture.detectChanges();
    const rows = fixture.nativeElement.querySelectorAll('[data-test=conversation]');
    expect(rows.length).toBe(1);
  }));

  it('opens a chat on click', () => {
    const fixture = render();
    fixture.nativeElement.querySelector('[data-test=conversation]').click();
    expect(store.openThread).toHaveBeenCalledWith(12);
  });
});
```

`src/app/layout/header/header.component.spec.ts` (create; if it exists, add the two `it` blocks and the providers):

```ts
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideApiTesting } from '../../testing/api-testing';
import { ChatStore } from '../../core/chat/chat.store';
import { AppHeaderComponent } from './header.component';

describe('AppHeaderComponent chat button', () => {
  const enabled = signal(true);
  const store = { enabled, unreadTotal: signal(4), drawerOpen: signal(false), toggleDrawer: jasmine.createSpy('toggleDrawer'), openDrawer: jasmine.createSpy('openDrawer') };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AppHeaderComponent],
      providers: [...provideApiTesting(), provideAnimations(), { provide: ChatStore, useValue: store }],
    });
  });

  it('shows the chat button with the unread badge and toggles the drawer', () => {
    enabled.set(true);
    const fixture = TestBed.createComponent(AppHeaderComponent);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('[data-test=chat-button]');
    expect(button.textContent).toContain('4');
    button.click();
    expect(store.toggleDrawer).toHaveBeenCalled();
  });

  it('hides the chat button without chat access', () => {
    enabled.set(false);
    const fixture = TestBed.createComponent(AppHeaderComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-test=chat-button]')).toBeNull();
  });

  it('opens the chat a chat bell points at', () => {
    const fixture = TestBed.createComponent(AppHeaderComponent);
    const popover = { hide: jasmine.createSpy('hide') };
    fixture.componentInstance.openNotification(
      { id: 1, title: 't', message: 'm', notif_type: 'info', is_read: true, created_at: '', data: { kind: 'chat', event: 'message', conversation_id: 12 } },
      popover as never,
    );
    expect(store.openDrawer).toHaveBeenCalledWith(12);
    expect(popover.hide).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to see them fail**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include='src/app/{features/chat,layout/header}/**/*.spec.ts'`
Expected: FAIL — components and `[data-test=chat-button]` missing.

- [ ] **Step 3: Implement the conversation list**

`src/app/features/chat/conversation-list.component.ts`:

```ts
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { debounceTime, map } from 'rxjs';
import { chatTime, conversationIcon, conversationTitle, initials, messagePreview } from '../../core/chat/chat-format';
import { ChatStore } from '../../core/chat/chat.store';
import { LanguageService } from '../../core/services/language.service';
import { NewChatDialogComponent } from './new-chat-dialog.component';

/** The drawer's list view: search (on the loaded list), "New chat", one row per conversation. */
@Component({
  selector: 'app-conversation-list',
  imports: [FormsModule, TranslatePipe, ButtonModule, NewChatDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex h-full min-h-0 flex-col' },
  template: `
    <div class="flex items-center gap-2 px-3 pb-2">
      <span class="relative flex-1">
        <i class="pi pi-search pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-sm text-gray-400"></i>
        <input
          type="search"
          class="h-9 w-full rounded-lg border border-gray-200 bg-white ps-9 pe-3 text-sm outline-none focus:border-primary-500 dark:border-gray-700 dark:bg-gray-900"
          [placeholder]="'chat.search' | translate"
          [attr.aria-label]="'chat.search' | translate"
          [ngModel]="search()"
          (ngModelChange)="search.set($event)"
        />
      </span>
      <p-button icon="pi pi-pen-to-square" [rounded]="true" [text]="true" [ariaLabel]="'chat.newChat' | translate" (onClick)="newChatOpen.set(true)"></p-button>
    </div>

    <div class="min-h-0 flex-1 overflow-y-auto">
      @if (store.listLoading() && !rows().length) {
        <p class="px-4 py-8 text-center text-sm text-gray-500"><i class="pi pi-spin pi-spinner"></i></p>
      } @else {
        @for (row of rows(); track row.c.id) {
          <button
            type="button"
            data-test="conversation"
            class="flex w-full items-center gap-3 px-3 py-2.5 text-start transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
            (click)="store.openThread(row.c.id)"
          >
            @if (row.c.avatar) {
              <img [src]="row.c.avatar" alt="" class="h-10 w-10 shrink-0 rounded-full object-cover" />
            } @else {
              <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700 dark:bg-primary-900 dark:text-primary-200">
                @if (row.icon) {
                  <i class="pi {{ row.icon }}"></i>
                } @else {
                  {{ row.initials }}
                }
              </span>
            }
            <span class="min-w-0 flex-1">
              <span class="flex items-center gap-2">
                <span class="truncate text-sm text-gray-900 dark:text-gray-100" [class.font-semibold]="row.c.unread_count > 0">{{ row.title }}</span>
                @if (row.c.other_user && !row.c.other_user.is_active) {
                  <span class="shrink-0 rounded bg-gray-100 px-1.5 text-[10px] text-gray-500 dark:bg-gray-800">{{ 'chat.leftCompany' | translate }}</span>
                }
                <span class="ms-auto shrink-0 text-xs text-gray-400">{{ row.time }}</span>
              </span>
              <span class="flex items-center gap-2">
                <span class="truncate text-xs text-gray-500 dark:text-gray-400">{{ row.preview }}</span>
                @if (row.c.unread_count > 0) {
                  <span
                    [attr.data-test]="'unread-' + row.c.id"
                    class="ms-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary-600 px-1.5 text-[10px] font-bold text-white"
                  >
                    {{ row.c.unread_count > 99 ? '99+' : row.c.unread_count }}
                  </span>
                }
              </span>
            </span>
          </button>
        } @empty {
          <p class="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
            {{ (term() ? 'chat.noMatches' : 'chat.empty') | translate }}
          </p>
        }
      }
    </div>

    <app-new-chat-dialog [(visible)]="newChatOpen"></app-new-chat-dialog>
  `,
})
export class ConversationListComponent {
  readonly store = inject(ChatStore);
  private readonly language = inject(LanguageService);
  private readonly translate = inject(TranslateService);
  readonly search = signal('');
  readonly newChatOpen = signal(false);
  readonly term = toSignal(toObservable(this.search).pipe(debounceTime(300), map((s) => s.trim().toLowerCase())), { initialValue: '' });

  readonly rows = computed(() => {
    const lang = this.language.currentLang();
    const me = this.store.myId();
    const term = this.term();
    const t = (key: string, params?: Record<string, unknown>) => this.translate.instant(key, params) as string;
    return this.store
      .conversations()
      .map((c) => {
        const title = conversationTitle(c, lang);
        return {
          c,
          title,
          icon: conversationIcon(c),
          initials: initials(title),
          preview: c.last_message ? messagePreview(c.last_message, me, () => undefined, t) : '',
          time: c.last_message_at ? chatTime(c.last_message_at, lang) : '',
        };
      })
      .filter((row) => !term || row.title.toLowerCase().includes(term));
  });
}
```

- [ ] **Step 4: Implement the new-chat dialog**

`src/app/features/chat/new-chat-dialog.component.ts`:

```ts
import { ChangeDetectionStrategy, Component, inject, model, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { DialogModule } from 'primeng/dialog';
import { ListboxModule } from 'primeng/listbox';
import { ChatStore } from '../../core/chat/chat.store';
import { SelectOption } from '../company/company.models';
import { CompanyUserService } from '../company/users/company-user.service';

/**
 * Picks a colleague for a direct chat. Uses the company-user dropdown, which also lists people without chat
 * access (the backend then answers "This user cannot be messaged."); BACKEND_REQUESTS_ROADMAP 17 asks for a
 * chat-only list.
 */
@Component({
  selector: 'app-new-chat-dialog',
  imports: [FormsModule, TranslatePipe, DialogModule, ListboxModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-dialog
      [visible]="visible()"
      (visibleChange)="visible.set($event)"
      (onShow)="load()"
      [modal]="true"
      [header]="'chat.newChat' | translate"
      appendTo="body"
      styleClass="w-[22rem] max-w-[calc(100vw-2rem)]"
    >
      <p-listbox
        [options]="options()"
        optionLabel="label"
        optionValue="value"
        [filter]="true"
        [filterPlaceHolder]="'chat.searchPeople' | translate"
        [ariaLabel]="'chat.pickPerson' | translate"
        listStyleClass="max-h-80"
        [ngModel]="null"
        (onChange)="pick($event.value)"
      ></p-listbox>
    </p-dialog>
  `,
})
export class NewChatDialogComponent {
  readonly visible = model(false);
  private readonly store = inject(ChatStore);
  private readonly users = inject(CompanyUserService);
  readonly options = signal<SelectOption[]>([]);
  private loaded = false;

  load(): void {
    if (this.loaded) {
      return;
    }
    this.users.userOptions().subscribe({
      next: (options) => {
        this.loaded = true;
        this.options.set(options.filter((option) => option.value !== this.store.myId()));
      },
      error: () => undefined,
    });
  }

  pick(userId: number | null): void {
    if (!userId) {
      return;
    }
    this.visible.set(false);
    this.store.startDirect(userId);
  }
}
```

- [ ] **Step 5: Implement the drawer**

`src/app/features/chat/chat-drawer.component.ts`:

```ts
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { PrimeTemplate } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { conversationTitle } from '../../core/chat/chat-format';
import { ChatStore } from '../../core/chat/chat.store';
import { LanguageService } from '../../core/services/language.service';
import { ConversationListComponent } from './conversation-list.component';

/** The floating chat: list ⇄ thread in one ~400px drawer at the end side. Hosted once by the shell, loaded on first open. */
@Component({
  selector: 'app-chat-drawer',
  imports: [TranslatePipe, PrimeTemplate, ButtonModule, DrawerModule, ConversationListComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-drawer
      [visible]="store.drawerOpen()"
      (visibleChange)="$event || store.closeDrawer()"
      [modal]="false"
      [position]="language.direction() === 'rtl' ? 'left' : 'right'"
      styleClass="w-full sm:w-[25rem] [&_.p-drawer-content]:!p-0"
    >
      <ng-template pTemplate="header">
        @if (store.thread()) {
          <div class="flex min-w-0 items-center gap-2">
            <p-button
              icon="pi pi-arrow-left"
              styleClass="rtl:[&_.pi]:rotate-180"
              [rounded]="true"
              [text]="true"
              severity="secondary"
              [ariaLabel]="'chat.back' | translate"
              (onClick)="store.backToList()"
            ></p-button>
            <div class="min-w-0">
              <h2 class="truncate text-base font-semibold text-gray-900 dark:text-gray-100">{{ title() }}</h2>
              @if (store.current(); as c) {
                <p class="truncate text-xs text-gray-500 dark:text-gray-400">
                  @if (c.kind === 'direct') {
                    @if (c.other_user && !c.other_user.is_active) {
                      {{ 'chat.leftCompany' | translate }}
                    }
                  } @else {
                    {{ 'chat.membersCount' | translate: { count: c.members_count } }}
                  }
                </p>
              }
            </div>
          </div>
        } @else {
          <h2 class="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
            <i class="pi pi-comments text-primary-600 dark:text-primary-300" aria-hidden="true"></i>
            {{ 'chat.title' | translate }}
          </h2>
        }
      </ng-template>

      @if (store.thread(); as thread) {
        <!-- Task 10 replaces this with <app-chat-thread>. -->
        <div class="h-full"></div>
      } @else {
        <app-conversation-list></app-conversation-list>
      }
    </p-drawer>
  `,
})
export class ChatDrawerComponent {
  readonly store = inject(ChatStore);
  readonly language = inject(LanguageService);
  readonly title = computed(() => {
    const c = this.store.current();
    return c ? conversationTitle(c, this.language.currentLang()) : '';
  });
}
```

- [ ] **Step 6: Wire the header, shell and notifications page**

`header.component.ts`:
- Imports: `import { Popover } from 'primeng/popover';`, `import { ChatStore } from '../../core/chat/chat.store';`, `import { chatConversationId } from '../../core/chat/chat.models';`.
- Field: `readonly chat = inject(ChatStore);`.
- Replace `openNotification`:

```ts
  /** A chat bell opens that chat in the drawer; every click marks the notification read. */
  openNotification(notification: AppNotification, popover?: Popover): void {
    this.notifications.open(notification);
    const conversationId = chatConversationId(notification);
    if (conversationId) {
      popover?.hide();
      this.chat.openDrawer(conversationId);
    }
  }
```

`header.component.html`:
- The bell item becomes `(open)="openNotification($event, bell)"`.
- Insert before the bell `<button>`:

```html
    @if (chat.enabled()) {
      <button
        type="button"
        data-test="chat-button"
        class="relative flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
        [class.bg-gray-100]="chat.drawerOpen()"
        [attr.aria-label]="'chat.open' | translate"
        [attr.aria-pressed]="chat.drawerOpen()"
        [title]="'chat.title' | translate"
        (click)="chat.toggleDrawer()"
      >
        <i class="pi pi-comments"></i>
        @if (chat.unreadTotal() > 0) {
          <span
            class="absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white"
          >
            {{ chat.unreadTotal() > 99 ? '99+' : chat.unreadTotal() }}
          </span>
        }
      </button>
    }
```

`shell.component.ts`:
- Import `ChatStore` and `ChatDrawerComponent` (`../../features/chat/chat-drawer.component`); add `ChatDrawerComponent` to `imports`.
- Field: `/** Chat state (header badge); the drawer UI loads the first time it opens. */ readonly chat = inject(ChatStore);`.
- Update the class comment to mention the chat drawer.

`shell.component.html`, after the record-details `@defer`:

```html
@defer (when chat.drawerOpen()) {
  <app-chat-drawer></app-chat-drawer>
}
```

`notifications-page.component.ts`:
- Inject `ChatStore` as `private readonly chat = inject(ChatStore);` and import `chatConversationId`.
- `open()` becomes:

```ts
  open(notification: AppNotification): void {
    this.center.open(notification);
    const conversationId = chatConversationId(notification);
    if (conversationId) {
      this.chat.openDrawer(conversationId);
    }
  }
```

- [ ] **Step 7: Run to see them pass, plus the shell and notifications specs**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include='src/app/{features/chat,layout,features/notifications}/**/*.spec.ts'`
Expected: PASS. If `ShellComponent` spec fails on missing providers for `ChatStore`'s dependencies, add `provideApiTesting()`-style providers there (it already has HttpClient, translate, MessageService).

- [ ] **Step 8: Commit**

```bash
git branch --show-current
git add src/app/features/chat/chat-drawer.component.ts src/app/features/chat/conversation-list.component.ts src/app/features/chat/conversation-list.component.spec.ts src/app/features/chat/new-chat-dialog.component.ts src/app/layout/header/header.component.ts src/app/layout/header/header.component.html src/app/layout/header/header.component.spec.ts src/app/layout/shell/shell.component.ts src/app/layout/shell/shell.component.html src/app/features/notifications/notifications-page.component.ts
git commit -m "feat(chat): chat drawer with the conversation list and header badge

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Message bubble and attachments

**Files:**
- Create: `src/app/features/chat/chat-attachment.component.ts`
- Create: `src/app/features/chat/message-bubble.component.ts`
- Test: `src/app/features/chat/message-bubble.component.spec.ts`

**Interfaces:**
- Consumes: `ChatApiService.attachment`, `saveFile` (`src/app/shared/utils/save-file.ts`), `bodySegments`, `plainBody`, `formatSize`, `isImageFile`, `chatTime`, `NameOf` (Task 4), `ThreadItem`.
- Produces:
  - `<app-chat-attachment [attachment]>`.
  - `<app-message-bubble>` inputs: `item: ThreadItem` (required), `mine: boolean`, `first: boolean`, `nameOf: NameOf` (required), `canEdit: boolean`, `canDelete: boolean`; outputs: `reply: ThreadItem`, `edit: ThreadItem`, `remove: ThreadItem`, `retry: string` (client id), `discard: string`, `jump: number` (replied message id).

- [ ] **Step 1: Write the failing tests**

`src/app/features/chat/message-bubble.component.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideApiTesting } from '../../testing/api-testing';
import { ME, chatMessage, chatUser, sentItem } from '../../testing/chat-fixtures';
import { ThreadItem } from '../../core/chat/chat.models';
import { MessageBubbleComponent } from './message-bubble.component';

describe('MessageBubbleComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [MessageBubbleComponent], providers: [...provideApiTesting(), provideAnimations()] });
  });

  function render(item: ThreadItem, inputs: Record<string, unknown> = {}) {
    const fixture = TestBed.createComponent(MessageBubbleComponent);
    fixture.componentRef.setInput('item', item);
    fixture.componentRef.setInput('nameOf', (id: number) => (id === 51 ? 'Omar Nasr' : undefined));
    for (const [key, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(key, value);
    }
    fixture.detectChanges();
    return fixture;
  }

  it('renders mentions as names and @all highlighted', () => {
    const el: HTMLElement = render(sentItem(chatMessage(1, { body: '@[51] and @all and @[99]' }))).nativeElement;
    const mentions = [...el.querySelectorAll('[data-test=mention]')].map((m) => m.textContent?.trim());
    expect(mentions).toEqual(['@Omar Nasr', '@all', '@chat.someone']);
  });

  it('shows the sender only on the first message of a group, never on mine', () => {
    expect(render(sentItem(chatMessage(1)), { first: true }).nativeElement.textContent).toContain('Sara Ali');
    expect(render(sentItem(chatMessage(1)), { first: false }).nativeElement.textContent).not.toContain('Sara Ali');
    expect(render(sentItem(chatMessage(1, { sender: ME })), { first: true, mine: true }).nativeElement.textContent).not.toContain('Me Myself');
  });

  it('shows deleted, edited and former-colleague states', () => {
    expect(render(sentItem(chatMessage(1, { is_deleted: true, body: '' }))).nativeElement.textContent).toContain('chat.deleted');
    expect(render(sentItem(chatMessage(1, { edited_at: '2026-10-15T10:00:00Z' }))).nativeElement.textContent).toContain('chat.edited');
    expect(render(sentItem(chatMessage(1, { sender: chatUser(45, 'Sara Ali', false) })), { first: true }).nativeElement.textContent).toContain('chat.leftCompany');
  });

  it('shows the reply preview and jumps to it', () => {
    const fixture = render(sentItem(chatMessage(2, { reply_to: { id: 1, sender: chatUser(51, 'Omar Nasr'), body: 'When?', is_deleted: false } })));
    let jumped = 0;
    fixture.componentInstance.jump.subscribe((id: number) => (jumped = id));
    const quote = fixture.nativeElement.querySelector('[data-test=reply-preview]');
    expect(quote.textContent).toContain('When?');
    quote.click();
    expect(jumped).toBe(1);
  });

  it('offers Retry and Remove on a failed send', () => {
    const item: ThreadItem = { message: chatMessage(0, { sender: ME, client_id: 'c1' }), status: 'failed', retryable: true, draft: { body: 'x', replyTo: null, files: [], clientId: 'c1' } };
    const fixture = render(item, { mine: true });
    let retried = '';
    fixture.componentInstance.retry.subscribe((id: string) => (retried = id));
    fixture.nativeElement.querySelector('[data-test=retry]').click();
    expect(retried).toBe('c1');
    const refused: ThreadItem = { ...item, retryable: false, error: 'You cannot post in this chat.' };
    const el: HTMLElement = render(refused, { mine: true }).nativeElement;
    expect(el.textContent).toContain('You cannot post in this chat.');
    expect(el.querySelector('[data-test=retry]')).toBeNull();
    expect(el.querySelector('[data-test=discard]')).not.toBeNull();
  });

  it('builds the menu from what is allowed', () => {
    const fixture = render(sentItem(chatMessage(1)), { canEdit: false, canDelete: true });
    const labels = fixture.componentInstance.menuItems().map((m) => m.label);
    expect(labels).toEqual(['chat.reply', 'chat.copy', 'chat.delete']);
  });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include='src/app/features/chat/message-bubble.component.spec.ts'`
Expected: FAIL — component missing.

- [ ] **Step 3: Implement the attachment**

`src/app/features/chat/chat-attachment.component.ts`:

```ts
import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { ChatApiService } from '../../core/chat/chat-api.service';
import { formatSize, isImageFile } from '../../core/chat/chat-format';
import { ChatAttachment } from '../../core/chat/chat.models';
import { saveFile } from '../../shared/utils/save-file';

/**
 * An image thumbnail or a file chip. The download needs the Authorization header, so files come as blobs; the
 * thumbnail's object URL is released when the message leaves the screen.
 */
@Component({
  selector: 'app-chat-attachment',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (image() && src(); as url) {
      <button type="button" class="block overflow-hidden rounded-lg" [title]="attachment().filename" (click)="download()">
        <img [src]="url" [alt]="attachment().filename" class="max-h-48 max-w-full object-cover" />
      </button>
    } @else {
      <button
        type="button"
        class="flex max-w-full items-center gap-2 rounded-lg border border-black/10 bg-white/60 px-2.5 py-1.5 text-start text-xs dark:border-white/10 dark:bg-black/20"
        [disabled]="!attachment().url"
        (click)="download()"
      >
        <i class="pi pi-file shrink-0"></i>
        <span class="min-w-0">
          <span class="block truncate font-medium">{{ attachment().filename }}</span>
          <span class="block opacity-70">{{ size() }}</span>
        </span>
      </button>
    }
  `,
})
export class ChatAttachmentComponent {
  readonly attachment = input.required<ChatAttachment>();
  private readonly api = inject(ChatApiService);
  readonly image = computed(() => isImageFile(this.attachment().filename));
  readonly size = computed(() => formatSize(this.attachment().size));
  readonly src = signal<string | null>(null);
  private objectUrl: string | null = null;

  constructor() {
    effect(() => {
      const attachment = this.attachment();
      if (!this.image() || !attachment.url) {
        return;
      }
      untracked(() =>
        this.api.attachment(attachment.url).subscribe({
          next: (blob) => {
            this.release();
            this.objectUrl = URL.createObjectURL(blob);
            this.src.set(this.objectUrl);
          },
          error: () => undefined,
        }),
      );
    });
    inject(DestroyRef).onDestroy(() => this.release());
  }

  download(): void {
    const attachment = this.attachment();
    if (!attachment.url) {
      return;
    }
    this.api.attachment(attachment.url).subscribe({ next: (blob) => saveFile(blob, attachment.filename), error: () => undefined });
  }

  private release(): void {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
  }
}
```

- [ ] **Step 4: Implement the bubble**

`src/app/features/chat/message-bubble.component.ts`:

```ts
import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MenuItem } from 'primeng/api';
import { MenuModule } from 'primeng/menu';
import { NameOf, bodySegments, chatTime, plainBody } from '../../core/chat/chat-format';
import { ThreadItem } from '../../core/chat/chat.models';
import { LanguageService } from '../../core/services/language.service';
import { NotificationService } from '../../core/services/notification.service';
import { ChatAttachmentComponent } from './chat-attachment.component';

/** One message: mine at the end side, others at the start (flips in RTL). Its menu opens from ⋮ or a long-press. */
@Component({
  selector: 'app-message-bubble',
  imports: [TranslatePipe, MenuModule, ChatAttachmentComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'group flex', '[class.justify-end]': 'mine()', '[class.mt-2]': 'first()', '[class.mt-0.5]': '!first()' },
  template: `
    <div class="flex max-w-[85%] items-start gap-1" [class.flex-row-reverse]="mine()">
      <div
        class="min-w-0 rounded-2xl px-3 py-2 text-sm"
        [class]="mine() ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'"
        [class.opacity-60]="item().status === 'pending'"
        (contextmenu)="openMenu($event, menu)"
      >
        @if (first() && !mine() && message().sender; as sender) {
          <p class="mb-0.5 text-xs font-semibold text-primary-700 dark:text-primary-300">
            {{ sender.name }}
            @if (!sender.is_active) {
              <span class="font-normal text-gray-500">· {{ 'chat.leftCompany' | translate }}</span>
            }
          </p>
        }

        @if (message().is_deleted) {
          <p class="italic opacity-70">{{ 'chat.deleted' | translate }}</p>
        } @else {
          @if (message().reply_to; as reply) {
            <button
              type="button"
              data-test="reply-preview"
              class="mb-1 block w-full rounded-lg border-s-4 border-current/40 bg-black/5 px-2 py-1 text-start text-xs dark:bg-white/10"
              (click)="jump.emit(reply.id)"
            >
              <span class="block font-semibold">{{ reply.sender?.name }}</span>
              <span class="line-clamp-2 opacity-80">{{ reply.is_deleted ? ('chat.deleted' | translate) : replyText() }}</span>
            </button>
          }
          @if (message().body) {
            <p class="whitespace-pre-wrap break-words">
              @for (segment of segments(); track $index) {
                @switch (segment.kind) {
                  @case ('text') {<span>{{ segment.text }}</span>}
                  @case ('all') {<span data-test="mention" class="rounded bg-amber-200/60 px-0.5 font-semibold dark:bg-amber-500/30">&#64;all</span>}
                  @case ('mention') {<span data-test="mention" class="rounded bg-black/10 px-0.5 font-semibold dark:bg-white/15">&#64;{{ segment.name ?? ('chat.someone' | translate) }}</span>}
                }
              }
            </p>
          }
          @if (message().attachments.length) {
            <div class="mt-1 flex flex-col gap-1">
              @for (attachment of message().attachments; track attachment.id) {
                <app-chat-attachment [attachment]="attachment"></app-chat-attachment>
              }
            </div>
          }
        }

        <p class="mt-0.5 flex items-center justify-end gap-1 text-[10px] opacity-70">
          @if (message().edited_at && !message().is_deleted) {
            <span>{{ 'chat.edited' | translate }}</span>
          }
          @if (item().status === 'pending') {
            <span>{{ 'chat.sending' | translate }}</span>
          } @else {
            <span>{{ time() }}</span>
          }
        </p>
      </div>

      @if (item().status === 'sent' && !message().is_deleted) {
        <button
          type="button"
          class="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-gray-400 opacity-0 transition-opacity hover:bg-gray-100 focus:opacity-100 group-hover:opacity-100 dark:hover:bg-gray-800 [@media(hover:none)]:opacity-100"
          [attr.aria-label]="'chat.actions' | translate"
          (click)="menu.toggle($event)"
        >
          <i class="pi pi-ellipsis-v text-xs"></i>
        </button>
      }
    </div>
    <!-- Outside the @if so the long-press handler above can reach it. -->
    <p-menu #menu [model]="menuItems()" [popup]="true" appendTo="body"></p-menu>

    @if (item().status === 'failed') {
      <div class="mt-0.5 flex w-full items-center justify-end gap-2 text-xs text-red-600 dark:text-red-400">
        <span>{{ item().error || ('chat.failed' | translate) }}</span>
        @if (item().retryable) {
          <button type="button" data-test="retry" class="font-semibold underline" (click)="retry.emit(clientId())">{{ 'chat.retry' | translate }}</button>
        }
        <button type="button" data-test="discard" class="font-semibold underline" (click)="discard.emit(clientId())">{{ 'chat.remove' | translate }}</button>
      </div>
    }
  `,
})
export class MessageBubbleComponent {
  readonly item = input.required<ThreadItem>();
  readonly nameOf = input.required<NameOf>();
  readonly mine = input(false);
  readonly first = input(true);
  readonly canEdit = input(false);
  readonly canDelete = input(false);

  readonly reply = output<ThreadItem>();
  readonly edit = output<ThreadItem>();
  readonly remove = output<ThreadItem>();
  readonly retry = output<string>();
  readonly discard = output<string>();
  readonly jump = output<number>();

  private readonly translate = inject(TranslateService);
  private readonly language = inject(LanguageService);
  private readonly toast = inject(NotificationService);

  readonly message = computed(() => this.item().message);
  readonly clientId = computed(() => this.item().draft?.clientId ?? '');
  readonly segments = computed(() => bodySegments(this.message().body, this.nameOf()));
  readonly replyText = computed(() => plainBody(this.message().reply_to?.body ?? '', this.nameOf(), this.translate.instant('chat.someone')));
  readonly time = computed(() => chatTime(this.message().created_at, this.language.currentLang()));

  readonly menuItems = computed<MenuItem[]>(() => {
    const t = (key: string) => this.translate.instant(key) as string;
    const items: MenuItem[] = [
      { label: t('chat.reply'), icon: 'pi pi-reply', command: () => this.reply.emit(this.item()) },
      { label: t('chat.copy'), icon: 'pi pi-copy', command: () => this.copy() },
    ];
    if (this.canEdit()) {
      items.push({ label: t('chat.edit'), icon: 'pi pi-pencil', command: () => this.edit.emit(this.item()) });
    }
    if (this.canDelete()) {
      items.push({ label: t('chat.delete'), icon: 'pi pi-trash', styleClass: 'text-red-600', command: () => this.remove.emit(this.item()) });
    }
    return items;
  });

  openMenu(event: MouseEvent, menu: { toggle: (e: Event) => void } | undefined): void {
    if (!menu || this.item().status !== 'sent' || this.message().is_deleted) {
      return;
    }
    event.preventDefault();
    menu.toggle(event);
  }

  private copy(): void {
    const text = plainBody(this.message().body, this.nameOf(), this.translate.instant('chat.someone'));
    void navigator.clipboard?.writeText(text).then(() => this.toast.success(this.translate.instant('chat.copied')));
  }
}
```

- [ ] **Step 5: Run to see it pass**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include='src/app/features/chat/message-bubble.component.spec.ts'`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git branch --show-current
git add src/app/features/chat/chat-attachment.component.ts src/app/features/chat/message-bubble.component.ts src/app/features/chat/message-bubble.component.spec.ts
git commit -m "feat(chat): message bubble with mentions, replies, attachments and actions

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Message composer

**Files:**
- Create: `src/app/features/chat/message-composer.component.ts`
- Test: `src/app/features/chat/message-composer.component.spec.ts`

**Interfaces:**
- Consumes: `checkFiles`, `NameOf` (Task 4), `canMentionAll` (Task 4), `encodeMentions`, `decodeMentions`, `mentionQuery`, `MentionToken` (Task 4), `CHAT_LIMITS`, `NotificationService.warn`.
- Produces: `<app-message-composer>` inputs `conversation: Conversation` (required), `members: ChatMember[]`, `myId: number`, `moderator: boolean`, `replyTo: ReplyPreview | null`, `editing: ChatMessage | null`, `nameOf: NameOf` (required); outputs `send: { body: string; files: File[] }`, `saveEdit: { id: number; body: string }`, `cancelReply: void`, `cancelEdit: void`, `typed: void`.

- [ ] **Step 1: Write the failing tests**

`src/app/features/chat/message-composer.component.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideApiTesting } from '../../testing/api-testing';
import { chatMember, chatMessage, conversation } from '../../testing/chat-fixtures';
import { NotificationService } from '../../core/services/notification.service';
import { MessageComposerComponent } from './message-composer.component';

describe('MessageComposerComponent', () => {
  let toast: jasmine.SpyObj<NotificationService>;

  beforeEach(() => {
    toast = jasmine.createSpyObj<NotificationService>('NotificationService', ['warn', 'success', 'error', 'info', 'failure']);
    TestBed.configureTestingModule({
      imports: [MessageComposerComponent],
      providers: [...provideApiTesting(), provideAnimations(), { provide: NotificationService, useValue: toast }],
    });
  });

  function render(inputs: Record<string, unknown> = {}) {
    const fixture = TestBed.createComponent(MessageComposerComponent);
    fixture.componentRef.setInput('conversation', conversation(12, { members_count: 30 }));
    fixture.componentRef.setInput('members', [chatMember(7, 'Me Myself'), chatMember(51, 'Omar Nasr'), chatMember(52, 'Omar Adel')]);
    fixture.componentRef.setInput('myId', 7);
    fixture.componentRef.setInput('nameOf', (id: number) => ({ 51: 'Omar Nasr', 52: 'Omar Adel' })[id]);
    for (const [key, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(key, value);
    }
    fixture.detectChanges();
    // The editing effect sets the text during the first pass; the second renders it.
    fixture.detectChanges();
    return fixture;
  }

  function type(fixture: ReturnType<typeof render>, text: string): HTMLTextAreaElement {
    const box: HTMLTextAreaElement = fixture.nativeElement.querySelector('textarea');
    box.value = text;
    box.setSelectionRange(text.length, text.length);
    box.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    return box;
  }

  it('sends on Enter, adds a line on Shift+Enter', () => {
    const fixture = render();
    const sent: unknown[] = [];
    fixture.componentInstance.send.subscribe((v) => sent.push(v));
    const box = type(fixture, '  hello  ');
    box.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true }));
    expect(sent).toEqual([]);
    box.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(sent).toEqual([{ body: 'hello', files: [] }]);
    expect(box.value).toBe('');
  });

  it('emits typed on input', () => {
    const fixture = render();
    let typed = 0;
    fixture.componentInstance.typed.subscribe(() => typed++);
    type(fixture, 'h');
    expect(typed).toBe(1);
  });

  it('picks a mention and sends it as @[id]', () => {
    const fixture = render();
    const sent: { body: string }[] = [];
    fixture.componentInstance.send.subscribe((v) => sent.push(v));
    type(fixture, 'hi @Om');
    const names = fixture.componentInstance.candidates().map((c) => c.label);
    expect(names).toEqual(['Omar Nasr', 'Omar Adel']);
    fixture.componentInstance.pickMention(fixture.componentInstance.candidates()[0]);
    fixture.detectChanges();
    const box: HTMLTextAreaElement = fixture.nativeElement.querySelector('textarea');
    expect(box.value).toBe('hi @Omar Nasr ');
    box.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(sent[0].body).toBe('hi @[51]');
  });

  it('offers @all only when allowed', () => {
    const fixture = render();
    type(fixture, '@a');
    expect(fixture.componentInstance.candidates().some((c) => c.id === 'all')).toBeFalse();
    const admin = render({ moderator: true });
    type(admin, '@a');
    expect(admin.componentInstance.candidates().some((c) => c.id === 'all')).toBeTrue();
  });

  it('rejects files that break the rules and names them', () => {
    const fixture = render();
    fixture.componentInstance.addFiles([new File(['x'], 'a.pdf'), new File(['x'], 'x.exe')]);
    expect(fixture.componentInstance.files().map((f) => f.name)).toEqual(['a.pdf']);
    expect(toast.warn).toHaveBeenCalled();
  });

  it('blocks bodies over 4000 characters and shows the counter from 3800', () => {
    const fixture = render();
    const sent: unknown[] = [];
    fixture.componentInstance.send.subscribe((v) => sent.push(v));
    const box = type(fixture, 'x'.repeat(4001));
    expect(fixture.nativeElement.textContent).toContain('4001/4000');
    box.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(sent).toEqual([]);
  });

  it('edits a message with its mentions decoded, Esc cancels', () => {
    const fixture = render({ editing: chatMessage(9, { body: '@[51] at 3' }) });
    const box: HTMLTextAreaElement = fixture.nativeElement.querySelector('textarea');
    expect(box.value).toBe('@Omar Nasr at 3');
    const saved: unknown[] = [];
    fixture.componentInstance.saveEdit.subscribe((v) => saved.push(v));
    let cancelled = 0;
    fixture.componentInstance.cancelEdit.subscribe(() => cancelled++);
    type(fixture, '@Omar Nasr at 4');
    box.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(saved).toEqual([{ id: 9, body: '@[51] at 4' }]);
    box.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(cancelled).toBe(1);
  });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include='src/app/features/chat/message-composer.component.spec.ts'`
Expected: FAIL — component missing.

- [ ] **Step 3: Implement**

`src/app/features/chat/message-composer.component.ts`:

```ts
import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, input, output, signal, untracked, viewChild } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { NameOf, checkFiles, formatSize, plainBody } from '../../core/chat/chat-format';
import { canMentionAll } from '../../core/chat/chat-rules';
import { CHAT_LIMITS, ChatMember, ChatMessage, Conversation, ReplyPreview } from '../../core/chat/chat.models';
import { NotificationService } from '../../core/services/notification.service';
import { MentionToken, decodeMentions, encodeMentions, mentionQuery } from './mention-tokens';

interface Candidate {
  id: number | 'all';
  label: string;
}

/**
 * The text box: Enter sends (Shift+Enter, or Enter on touch screens, adds a line), `@` picks a member, files are
 * checked before upload. Edit mode reuses it with the message's text; Esc cancels.
 */
@Component({
  selector: 'app-message-composer',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block border-t border-gray-200 p-2 dark:border-gray-800' },
  template: `
    @if (editing()) {
      <div class="mb-1 flex items-center gap-2 rounded-lg bg-gray-50 px-2 py-1 text-xs dark:bg-gray-800">
        <i class="pi pi-pencil text-primary-600"></i>
        <span class="flex-1 font-semibold">{{ 'chat.editing' | translate }}</span>
        <button type="button" class="text-gray-500" [attr.aria-label]="'chat.cancel' | translate" (click)="cancelEdit.emit()"><i class="pi pi-times"></i></button>
      </div>
    } @else if (replyTo(); as reply) {
      <div class="mb-1 flex items-center gap-2 rounded-lg bg-gray-50 px-2 py-1 text-xs dark:bg-gray-800">
        <i class="pi pi-reply text-primary-600"></i>
        <span class="min-w-0 flex-1">
          <span class="block font-semibold">{{ 'chat.replyingTo' | translate: { name: reply.sender?.name ?? '' } }}</span>
          <span class="block truncate text-gray-500">{{ replyText() }}</span>
        </span>
        <button type="button" class="text-gray-500" [attr.aria-label]="'chat.cancel' | translate" (click)="cancelReply.emit()"><i class="pi pi-times"></i></button>
      </div>
    }

    @if (files().length) {
      <div class="mb-1 flex flex-wrap gap-1">
        @for (file of files(); track $index) {
          <span class="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs dark:bg-gray-800">
            <i class="pi pi-file"></i>{{ file.name }} <span class="text-gray-500">{{ size(file.size) }}</span>
            <button type="button" [attr.aria-label]="'chat.removeFile' | translate" (click)="removeFile($index)"><i class="pi pi-times text-[10px]"></i></button>
          </span>
        }
      </div>
    }

    @if (mention() && candidates().length) {
      <ul class="mb-1 max-h-40 overflow-y-auto rounded-lg border border-gray-200 bg-white text-sm shadow dark:border-gray-700 dark:bg-gray-900" role="listbox">
        @for (candidate of candidates(); track candidate.id) {
          <li>
            <button type="button" class="w-full px-3 py-1.5 text-start hover:bg-gray-100 dark:hover:bg-gray-800" (mousedown)="$event.preventDefault()" (click)="pickMention(candidate)">
              {{ candidate.id === 'all' ? '@all · ' + ('chat.mentionAll' | translate) : candidate.label }}
            </button>
          </li>
        }
      </ul>
    }

    <div class="flex items-end gap-1">
      @if (!editing()) {
        <label class="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800" [title]="'chat.fileRules' | translate">
          <i class="pi pi-paperclip"></i>
          <span class="sr-only">{{ 'chat.attach' | translate }}</span>
          <input type="file" multiple class="hidden" [attr.accept]="accept" (change)="onFiles($event)" />
        </label>
      }
      <textarea
        #box
        rows="1"
        class="max-h-32 min-h-9 flex-1 resize-none rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary-500 dark:border-gray-700 dark:bg-gray-900"
        [placeholder]="'chat.placeholder' | translate"
        [attr.aria-label]="'chat.placeholder' | translate"
        [value]="text()"
        (input)="onInput()"
        (keydown)="onKeydown($event)"
        (click)="updateMention()"
      ></textarea>
      <button
        type="button"
        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-600 text-white disabled:opacity-40"
        [disabled]="!canSubmit()"
        [attr.aria-label]="'chat.send' | translate"
        (click)="submit()"
      >
        <i class="pi" [class.pi-send]="!editing()" [class.pi-check]="editing()"></i>
      </button>
    </div>
    @if (length() >= limits.counterFrom) {
      <p class="mt-0.5 text-end text-[10px]" [class.text-red-600]="length() > limits.bodyMax">{{ length() }}/{{ limits.bodyMax }}</p>
    }
  `,
})
export class MessageComposerComponent {
  readonly conversation = input.required<Conversation>();
  readonly nameOf = input.required<NameOf>();
  readonly members = input<ChatMember[]>([]);
  readonly myId = input(0);
  readonly moderator = input(false);
  readonly replyTo = input<ReplyPreview | null>(null);
  readonly editing = input<ChatMessage | null>(null);

  readonly send = output<{ body: string; files: File[] }>();
  readonly saveEdit = output<{ id: number; body: string }>();
  readonly cancelReply = output<void>();
  readonly cancelEdit = output<void>();
  readonly typed = output<void>();

  private readonly toast = inject(NotificationService);
  private readonly translate = inject(TranslateService);
  private readonly box = viewChild<ElementRef<HTMLTextAreaElement>>('box');

  readonly limits = CHAT_LIMITS;
  readonly accept = CHAT_LIMITS.extensions.map((ext) => `.${ext}`).join(',');
  readonly text = signal('');
  readonly files = signal<File[]>([]);
  readonly mention = signal<{ start: number; query: string } | null>(null);
  private tokens: MentionToken[] = [];

  readonly body = computed(() => encodeMentions(this.text().trim(), this.tokens));
  readonly length = computed(() => this.text().trim().length);
  readonly canSubmit = computed(() => this.length() <= CHAT_LIMITS.bodyMax && (this.length() > 0 || this.files().length > 0));
  readonly replyText = computed(() => plainBody(this.replyTo()?.body ?? '', this.nameOf(), this.translate.instant('chat.someone')));

  readonly candidates = computed<Candidate[]>(() => {
    const mention = this.mention();
    if (!mention) {
      return [];
    }
    const query = mention.query.toLowerCase();
    const people: Candidate[] = this.members()
      .filter((m) => m.user.id !== this.myId() && m.user.is_active && m.user.name.toLowerCase().includes(query))
      .map((m) => ({ id: m.user.id, label: m.user.name }));
    const all: Candidate[] = canMentionAll(this.conversation(), this.moderator()) && 'all'.startsWith(query) ? [{ id: 'all', label: 'all' }] : [];
    return [...all, ...people].slice(0, 8);
  });

  constructor() {
    // Entering edit mode loads the message's text, mentions shown as names.
    effect(() => {
      const editing = this.editing();
      untracked(() => {
        if (editing) {
          const decoded = decodeMentions(editing.body, this.nameOf());
          this.tokens = decoded.tokens;
          this.text.set(decoded.text);
          this.files.set([]);
          queueMicrotask(() => this.box()?.nativeElement.focus());
        } else {
          this.reset();
        }
      });
    });
  }

  size(bytes: number): string {
    return formatSize(bytes);
  }

  onInput(): void {
    this.text.set(this.box()!.nativeElement.value);
    this.updateMention();
    this.typed.emit();
  }

  updateMention(): void {
    const el = this.box()!.nativeElement;
    this.mention.set(mentionQuery(el.value, el.selectionStart ?? el.value.length));
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      if (this.mention()) {
        this.mention.set(null);
      } else if (this.editing()) {
        this.cancelEdit.emit();
      }
      return;
    }
    if (event.key === 'Enter' && !event.shiftKey && !this.isTouch()) {
      event.preventDefault();
      const first = this.candidates()[0];
      if (this.mention() && first) {
        this.pickMention(first);
        return;
      }
      this.submit();
    }
  }

  pickMention(candidate: Candidate): void {
    const mention = this.mention();
    if (!mention) {
      return;
    }
    const el = this.box()!.nativeElement;
    const caret = el.selectionStart ?? el.value.length;
    const display = candidate.id === 'all' ? '@all' : `@${candidate.label}`;
    const value = `${el.value.slice(0, mention.start)}${display} ${el.value.slice(caret)}`;
    if (candidate.id !== 'all' && !this.tokens.some((t) => t.id === candidate.id)) {
      this.tokens = [...this.tokens, { id: candidate.id, display }];
    }
    this.text.set(value);
    el.value = value;
    const at = mention.start + display.length + 1;
    el.setSelectionRange(at, at);
    this.mention.set(null);
    el.focus();
  }

  onFiles(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.addFiles([...(input.files ?? [])]);
    input.value = '';
  }

  addFiles(added: File[]): void {
    const { accepted, rejected } = checkFiles(this.files(), added);
    this.files.update((files) => [...files, ...accepted]);
    if (rejected.length) {
      this.toast.warn(`${this.translate.instant('chat.filesRejected', { names: rejected.map((r) => r.name).join(', ') })} (${this.translate.instant('chat.fileRules')})`);
    }
  }

  removeFile(index: number): void {
    this.files.update((files) => files.filter((_, i) => i !== index));
  }

  submit(): void {
    if (!this.canSubmit()) {
      return;
    }
    const editing = this.editing();
    if (editing) {
      this.saveEdit.emit({ id: editing.id, body: this.body() });
    } else {
      this.send.emit({ body: this.body(), files: this.files() });
    }
    this.reset();
  }

  private reset(): void {
    this.text.set('');
    this.files.set([]);
    this.tokens = [];
    this.mention.set(null);
    const el = this.box()?.nativeElement;
    if (el) {
      el.value = '';
    }
  }

  private isTouch(): boolean {
    return typeof matchMedia === 'function' && matchMedia('(hover: none)').matches;
  }
}
```

- [ ] **Step 4: Run to see it pass**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include='src/app/features/chat/message-composer.component.spec.ts'`
Expected: PASS. (The `editing` effect can run before the view exists, which is why `reset()` and the focus call use `this.box()?.`.)

- [ ] **Step 5: Commit**

```bash
git branch --show-current
git add src/app/features/chat/message-composer.component.ts src/app/features/chat/message-composer.component.spec.ts
git commit -m "feat(chat): message composer with mentions, files, reply and edit

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Thread view and plugging it into the drawer

**Files:**
- Create: `src/app/features/chat/chat-thread.component.ts`
- Modify: `src/app/features/chat/chat-drawer.component.ts` (replace the placeholder)
- Test: `src/app/features/chat/chat-thread.component.spec.ts`

**Interfaces:**
- Consumes: `ChatStore` (`current`, `myId`, `typing`, `typed`), `ChatThread` (Task 5), `threadRows` (Task 4), `canEdit`, `canDelete`, `postingNote` (Task 4), `systemText`, `dayLabel` (Task 4), `ConfirmService.confirmAction`, `AccessService.can('change_chatmoderation')`, `MessageBubbleComponent` (Task 8), `MessageComposerComponent` (Task 9).
- Produces: `<app-chat-thread [thread]>`.

- [ ] **Step 1: Write the failing tests**

`src/app/features/chat/chat-thread.component.spec.ts`:

```ts
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { provideApiTesting } from '../../testing/api-testing';
import { ME, chatMember, chatMessage, conversation } from '../../testing/chat-fixtures';
import { AccessService } from '../../core/auth/access.service';
import { ChatApiService } from '../../core/chat/chat-api.service';
import { ChatThread } from '../../core/chat/chat-thread';
import { ChatStore } from '../../core/chat/chat.store';
import { TypingTracker } from '../../core/chat/typing-tracker';
import { Conversation } from '../../core/chat/chat.models';
import { ChatThreadComponent } from './chat-thread.component';

describe('ChatThreadComponent', () => {
  const current = signal<Conversation | null>(conversation(12));
  const typing = new TypingTracker();
  const store = { current, myId: signal(7), typing, typed: jasmine.createSpy('typed') };
  let api: jasmine.SpyObj<ChatApiService>;

  beforeEach(() => {
    current.set(conversation(12));
    typing.reset();
    api = jasmine.createSpyObj<ChatApiService>('ChatApiService', ['messages', 'members', 'send', 'edit', 'remove', 'attachment']);
    api.messages.and.returnValue(of([chatMessage(2, { sender: ME, body: 'mine' }), chatMessage(1, { body: 'theirs' })]));
    api.members.and.returnValue(of([chatMember(45, 'Sara Ali'), chatMember(7, 'Me Myself')]));
    TestBed.configureTestingModule({
      imports: [ChatThreadComponent],
      providers: [
        ...provideApiTesting(),
        provideAnimations(),
        { provide: ChatStore, useValue: store },
        { provide: AccessService, useValue: { can: () => false } },
      ],
    });
  });

  function render() {
    const thread = new ChatThread(12, { api, me: () => ME, sent: () => undefined, gone: () => undefined, refused: () => undefined, loaded: () => undefined, fail: () => undefined });
    thread.load();
    const fixture = TestBed.createComponent(ChatThreadComponent);
    fixture.componentRef.setInput('thread', thread);
    fixture.detectChanges();
    return { fixture, thread };
  }

  it('renders the messages oldest first with a day separator', () => {
    const el: HTMLElement = render().fixture.nativeElement;
    const text = el.textContent ?? '';
    expect(text.indexOf('theirs')).toBeLessThan(text.indexOf('mine'));
    expect(el.querySelectorAll('[data-test=day]').length).toBe(1);
  });

  it('lets me edit my message and delete only mine as a member', () => {
    const { fixture } = render();
    const bubbles = fixture.debugElement.queryAll((d) => d.name === 'app-message-bubble');
    const theirs = bubbles[0].componentInstance;
    const mine = bubbles[1].componentInstance;
    expect(mine.canEdit()).toBeTrue();
    expect(mine.canDelete()).toBeTrue();
    expect(theirs.canEdit()).toBeFalse();
    expect(theirs.canDelete()).toBeFalse();
  });

  it('chat admins may delete anyone’s message', () => {
    current.set(conversation(12, { my_role: 'admin' }));
    const { fixture } = render();
    const theirs = fixture.debugElement.queryAll((d) => d.name === 'app-message-bubble')[0].componentInstance;
    expect(theirs.canDelete()).toBeTrue();
  });

  it('shows the read-only note instead of the composer', () => {
    current.set(conversation(12, { can_post: false, posting_policy: 'admins_only' }));
    const el: HTMLElement = render().fixture.nativeElement;
    expect(el.querySelector('app-message-composer')).toBeNull();
    expect(el.textContent).toContain('chat.note.adminsOnly');
  });

  it('shows who is typing', () => {
    const { fixture } = render();
    typing.add(12, 45);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('chat.typingOne');
  });

  it('sends through the thread with the reply it was answering', () => {
    const { fixture, thread } = render();
    spyOn(thread, 'send');
    fixture.componentInstance.startReply(thread.items()[0]);
    fixture.componentInstance.onSend({ body: 'ok', files: [] });
    expect(thread.send).toHaveBeenCalledWith('ok', jasmine.objectContaining({ id: 1 }), []);
    expect(fixture.componentInstance.replyTo()).toBeNull();
  });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include='src/app/features/chat/chat-thread.component.spec.ts'`
Expected: FAIL — component missing.

- [ ] **Step 3: Implement**

`src/app/features/chat/chat-thread.component.ts`:

```ts
import {
  ChangeDetectionStrategy, Component, ElementRef, Injector, afterNextRender, computed, effect, inject, input, signal, untracked, viewChild,
} from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AccessService } from '../../core/auth/access.service';
import { NameOf, dayLabel, systemText } from '../../core/chat/chat-format';
import { canDelete, canEdit, postingNote } from '../../core/chat/chat-rules';
import { ChatThread } from '../../core/chat/chat-thread';
import { ChatMessage, ReplyPreview, SystemMessageData, ThreadItem } from '../../core/chat/chat.models';
import { ChatStore } from '../../core/chat/chat.store';
import { ConfirmService } from '../../core/services/confirm.service';
import { LanguageService } from '../../core/services/language.service';
import { MessageBubbleComponent } from './message-bubble.component';
import { MessageComposerComponent } from './message-composer.component';
import { threadRows } from './thread-rows';

/** Close enough to the bottom to keep following new messages. */
const STICKY_PX = 48;
/** Close enough to the top to load the previous page. */
const LOAD_OLDER_PX = 80;

/** The open chat: messages (oldest at the top), typing line, and the composer or the reason I cannot post. */
@Component({
  selector: 'app-chat-thread',
  imports: [TranslatePipe, MessageBubbleComponent, MessageComposerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex h-full min-h-0 flex-col' },
  template: `
    <div #scroller class="relative min-h-0 flex-1 overflow-y-auto px-3 py-2" (scroll)="onScroll()">
      @if (thread().loadingOlder()) {
        <p class="py-2 text-center text-xs text-gray-500"><i class="pi pi-spin pi-spinner me-1"></i>{{ 'chat.loadingOlder' | translate }}</p>
      }
      @if (thread().loading()) {
        <p class="py-8 text-center text-sm text-gray-500"><i class="pi pi-spin pi-spinner"></i></p>
      } @else {
        @for (row of rows(); track row.key) {
          @switch (row.kind) {
            @case ('day') {
              <p data-test="day" class="my-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400">{{ row.label }}</p>
            }
            @case ('system') {
              <p class="my-2 text-center text-xs italic text-gray-500 dark:text-gray-400" [attr.data-message]="row.item.message.id">{{ system(row.item.message) }}</p>
            }
            @case ('message') {
              <app-message-bubble
                [attr.data-message]="row.item.message.id"
                [item]="row.item"
                [mine]="row.mine"
                [first]="row.first"
                [nameOf]="nameOf"
                [canEdit]="editable(row.item)"
                [canDelete]="deletable(row.item)"
                (reply)="startReply($event)"
                (edit)="startEdit($event)"
                (remove)="confirmDelete($event)"
                (retry)="thread().retry($event)"
                (discard)="thread().discard($event)"
                (jump)="jumpTo($event)"
              ></app-message-bubble>
            }
          }
        } @empty {
          <p class="py-8 text-center text-sm text-gray-500 dark:text-gray-400">{{ 'chat.noMessages' | translate }}</p>
        }
      }
    </div>

    @if (unseen()) {
      <button
        type="button"
        class="mx-auto -mt-10 mb-2 rounded-full bg-primary-600 px-3 py-1 text-xs font-semibold text-white shadow"
        (click)="scrollToBottom()"
      >
        {{ 'chat.newMessages' | translate }} ↓
      </button>
    }

    <p class="h-5 px-4 text-xs italic text-gray-500 dark:text-gray-400">{{ typingLine() }}</p>

    @if (store.current(); as c) {
      @if (note(); as key) {
        <p class="border-t border-gray-200 px-4 py-3 text-center text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">{{ key | translate }}</p>
      } @else {
        <app-message-composer
          [conversation]="c"
          [members]="thread().members()"
          [myId]="store.myId()"
          [moderator]="moderator()"
          [replyTo]="replyTo()"
          [editing]="editing()"
          [nameOf]="nameOf"
          (send)="onSend($event)"
          (saveEdit)="onSaveEdit($event)"
          (cancelReply)="replyTo.set(null)"
          (cancelEdit)="editing.set(null)"
          (typed)="store.typed()"
        ></app-message-composer>
      }
    }
  `,
})
export class ChatThreadComponent {
  readonly thread = input.required<ChatThread>();
  readonly store = inject(ChatStore);
  private readonly access = inject(AccessService);
  private readonly confirm = inject(ConfirmService);
  private readonly translate = inject(TranslateService);
  private readonly language = inject(LanguageService);
  private readonly injector = inject(Injector);
  private readonly scroller = viewChild<ElementRef<HTMLElement>>('scroller');

  readonly replyTo = signal<ReplyPreview | null>(null);
  readonly editing = signal<ChatMessage | null>(null);
  readonly unseen = signal(false);
  private atBottom = true;
  private olderAnchor: { height: number; top: number } | null = null;
  private lastKey: string | undefined;

  readonly moderator = computed(() => this.access.can('change_chatmoderation'));
  readonly note = computed(() => {
    const c = this.store.current();
    return c ? postingNote(c) : null;
  });
  readonly nameOf: NameOf = (id) => this.thread().nameOf(id);
  private readonly t = (key: string, params?: Record<string, unknown>) => this.translate.instant(key, params) as string;

  readonly rows = computed(() => {
    const lang = this.language.currentLang();
    return threadRows(this.thread().items(), this.store.myId(), (iso) => dayLabel(iso, lang, this.t));
  });

  readonly typingLine = computed(() => {
    const ids = this.store.typing.usersIn(this.thread().conversationId);
    if (!ids.length) {
      return '';
    }
    if (ids.length > 1) {
      return this.t('chat.typingMany', { count: ids.length });
    }
    return this.t('chat.typingOne', { name: this.nameOf(ids[0]) ?? this.t('chat.someone') });
  });

  constructor() {
    effect(() => {
      const rows = this.rows();
      const first = rows[0]?.key;
      const last = rows.at(-1)?.key;
      untracked(() => afterNextRender(() => this.afterRows(first, last), { injector: this.injector }));
    });
  }

  editable(item: ThreadItem): boolean {
    return canEdit(item, this.store.myId());
  }

  deletable(item: ThreadItem): boolean {
    return canDelete(item, this.store.myId(), this.store.current()?.my_role, this.moderator());
  }

  system(message: ChatMessage): string {
    return systemText(message.data as SystemMessageData, this.nameOf, this.t);
  }

  startReply(item: ThreadItem): void {
    const m = item.message;
    this.editing.set(null);
    this.replyTo.set({ id: m.id, sender: m.sender, body: m.body.slice(0, 200), is_deleted: m.is_deleted });
  }

  startEdit(item: ThreadItem): void {
    this.replyTo.set(null);
    this.editing.set(item.message);
  }

  onSend(draft: { body: string; files: File[] }): void {
    this.thread().send(draft.body, this.replyTo(), draft.files);
    this.replyTo.set(null);
    this.atBottom = true;
  }

  onSaveEdit(change: { id: number; body: string }): void {
    this.thread().edit(change.id, change.body);
    this.editing.set(null);
  }

  confirmDelete(item: ThreadItem): void {
    this.confirm.confirmAction({
      message: 'chat.confirmDelete',
      accept: 'chat.delete',
      success: 'chat.deletedToast',
      danger: true,
      run: () => this.thread().deleteRequest(item.message.id),
      onDone: () => undefined,
    });
  }

  jumpTo(messageId: number): void {
    this.scroller()?.nativeElement.querySelector(`[data-message="${messageId}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  onScroll(): void {
    const el = this.scroller()?.nativeElement;
    if (!el) {
      return;
    }
    this.atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < STICKY_PX;
    if (this.atBottom) {
      this.unseen.set(false);
    }
    if (el.scrollTop < LOAD_OLDER_PX && this.thread().hasOlder() && !this.thread().loadingOlder()) {
      this.olderAnchor = { height: el.scrollHeight, top: el.scrollTop };
      this.thread().loadOlder();
    }
  }

  scrollToBottom(): void {
    const el = this.scroller()?.nativeElement;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
    this.atBottom = true;
    this.unseen.set(false);
  }

  /** Older page: keep the reading position. New message: follow it if at the bottom, else show the pill. */
  private afterRows(first: string | undefined, last: string | undefined): void {
    const el = this.scroller()?.nativeElement;
    if (!el) {
      return;
    }
    if (this.olderAnchor && first !== undefined) {
      el.scrollTop = el.scrollHeight - this.olderAnchor.height + this.olderAnchor.top;
      this.olderAnchor = null;
    }
    if (last !== this.lastKey) {
      const lastItem = this.thread().items().at(-1);
      if (this.atBottom || lastItem?.message.sender?.id === this.store.myId()) {
        this.scrollToBottom();
      } else {
        this.unseen.set(true);
      }
      this.lastKey = last;
    }
  }
}
```

- [ ] **Step 4: Plug it into the drawer**

In `chat-drawer.component.ts`: import `ChatThreadComponent` (add to `imports`) and replace the placeholder block with:

```html
      @if (store.thread(); as thread) {
        <app-chat-thread [thread]="thread"></app-chat-thread>
      } @else {
        <app-conversation-list></app-conversation-list>
      }
```

The drawer's `styleClass` from Task 7 already removes the content padding (`[&_.p-drawer-content]:!p-0`), so the thread fills the drawer edge to edge; the list keeps its own `px-3`.

- [ ] **Step 5: Run the chat specs**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include='src/app/features/chat/**/*.spec.ts'`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git branch --show-current
git add src/app/features/chat/chat-thread.component.ts src/app/features/chat/chat-thread.component.spec.ts src/app/features/chat/chat-drawer.component.ts
git commit -m "feat(chat): thread view with history, typing and the composer

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Full verification and docs

**Files:**
- Modify: `docs/plans/checklist.md` (new line)
- Modify: `docs/ARCHITECTURE.md`, `docs/CODE_MAP.md` (only if the owner's uncommitted edits there have been committed or the owner says to include them; otherwise skip and say so)

- [ ] **Step 1: Run the whole suite**

Run: `npx ng test --watch=false --browsers=ChromeHeadless`
Expected: PASS, no failures. Fix any spec broken by the new `ChatStore` dependency in layout tests (e.g. `ShellComponent` spec needs `provideHttpClientTesting()` and an `AuthService` with `user` — mirror `provideApiTesting()`).

- [ ] **Step 2: Build and check the budget**

Run: `npx ng build`
Expected: success; the initial bundle stays under the 1.5 MB warning (it was 952 kB before; the chat drawer components must be in a lazy chunk). If the initial size jumped by more than ~40 kB, check that nothing outside `@defer` imports `features/chat/*` except the shell's deferred `ChatDrawerComponent`.

- [ ] **Step 3: Browser check against the local backend**

Start the app with `preview_start` (or `npm start` through the preview tool), sign in as a seeded user with chat access:
1. The header shows the chat button; the badge matches `GET /api/chat/v1/unread/`.
2. Open the drawer: the list loads (company chat, team chat).
3. Open the company chat: history shows; if the user cannot post, the admins-only note shows.
4. Send a message in a chat where posting is allowed; it appears once.
5. In a second browser session as another user, see it arrive live and the badge rise; type in one and see "… is typing…" in the other.
6. Switch to Arabic: drawer opens on the left, bubbles flip, titles use `name_ar`.

Take a screenshot of the open thread for the owner.

- [ ] **Step 4: Add the checklist line**

Append under the last section of `docs/plans/checklist.md` (same style as the other lines, Egyptian Arabic):

```markdown
## الدردشة

- [ ] 🔵 الدردشة (المرحلة الأولى): زرار في الهيدر بعدد الرسائل اللي مااتقرتش بيفتح درج فيه المحادثات (الشركة، الفريق، الخاص، الجروبات)، والمحادثة بالرسائل القديمة، الإرسال (نص، ملفات، رد، منشن)، التعديل والحذف، الكتابة شغالة لايف، و"بيكتب…"، وعلامة القراءة، ومحادثة جديدة مع زميل. التستات ناجحة. لسه: إدارة الجروبات (إنشاء، أعضاء، أدوار، إعدادات، كتم، اتشاف من)، وطلبات الباك 17 (قايمة الناس اللي ينفع أكلمهم)
```

- [ ] **Step 5: Update ARCHITECTURE.md and CODE_MAP.md (conditional)**

Run `git status --short docs/ARCHITECTURE.md docs/CODE_MAP.md`. If either shows ` M` from before this branch's work, stop and ask the owner whether to include their pending edits; do not stage them. If clean, add:
- `docs/ARCHITECTURE.md` folder tree, under `core/`: `│   ├── chat/              ChatStore (list, unread, open thread, live events), ChatApiService, ChatThread, helpers`; under `features/`: `chat/` — the floating chat drawer (deferred).
- `docs/CODE_MAP.md` section 4 table: `| \`chat/chat.store.ts\` | Chat list, unread badge, open thread, socket events, reconnect | 🆕 🧠 only place chat events are applied |`; section 5 header row: add "chat button with unread badge" to `layout/header/`; section 6: a `### chat — floating drawer (no route)` paragraph naming the components.

- [ ] **Step 6: Commit**

```bash
git branch --show-current
git add docs/plans/checklist.md
git commit -m "docs(chat): checklist entry for the chat drawer

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

(Add `docs/ARCHITECTURE.md docs/CODE_MAP.md` to the `git add` only if Step 5 updated them.)
