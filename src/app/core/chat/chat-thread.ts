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
  /** A send failed (any error); the store warns when this thread is no longer the open one. */
  lostSend?: () => void;
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
        this.deps.lostSend?.();
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
