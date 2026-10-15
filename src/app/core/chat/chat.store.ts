import { DestroyRef, Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateService } from '@ngx-translate/core';
import { AccessService } from '../auth/access.service';
import { AuthService } from '../auth/auth.service';
import { AppError } from '../errors/app-error';
import { NotificationCenterService } from '../notifications/notification-center.service';
import { LanguageService } from '../services/language.service';
import { NotificationService } from '../services/notification.service';
import { ChatApiService } from './chat-api.service';
import { conversationTitle, errorText } from './chat-format';
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
  private readonly language = inject(LanguageService);

  private readonly conversationsState = signal<Conversation[]>([]);
  private readonly listState = signal<'idle' | 'loading' | 'ready'>('idle');
  private readonly unreadState = signal(0);
  private readonly drawerState = signal(false);
  private readonly threadState = signal<ChatThread | null>(null);
  private readonly currentState = signal<Conversation | null>(null);
  /** Set while a read is waiting for the debounce; leaving the thread sends it at once. */
  private readTimer?: ReturnType<typeof setTimeout>;
  /** Messages that arrived in the open thread while the browser tab was hidden (counted as unread). */
  private unseen = 0;
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
    const onVisibility = (): void => this.onVisibility();
    document.addEventListener('visibilitychange', onVisibility);
    inject(DestroyRef).onDestroy(() => {
      document.removeEventListener('visibilitychange', onVisibility);
      clearTimeout(this.readTimer);
    });
  }

  /** The user is looking at this chat now: drawer open on its thread, browser tab visible. */
  isOpen(conversationId: number): boolean {
    return this.drawerState() && this.threadState()?.conversationId === conversationId && this.visible();
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
    if (this.threadState()?.conversationId === id) {
      return;
    }
    this.backToList();
    const known = this.conversationsState().find((c) => c.id === id) ?? null;
    this.currentState.set(known);
    if (!known) {
      this.api.conversation(id).subscribe({
        next: (conversation) => this.threadState()?.conversationId === id && this.currentState.set(conversation),
        error: (error: AppError) => error.status === 404 && this.onGone(id),
      });
    }
    if (known?.unread_count) {
      this.unreadState.update((n) => Math.max(0, n - known.unread_count));
      this.patch(id, (c) => ({ ...c, unread_count: 0 }));
    }
    const thread: ChatThread = new ChatThread(id, {
      api: this.api,
      me: () => this.me(),
      sent: (message) => this.onNewMessage(id, message, false),
      gone: () => this.onGone(id),
      refused: () => this.refetch(id),
      loaded: () => this.threadState() === thread && this.readIfBehind(thread),
      fail: (error) => this.toast.failure(error, errorText(error)),
      lostSend: () => this.threadState() !== thread && this.toast.warn(this.translate.instant('chat.notSent', { name: this.titleOf(id) })),
    });
    this.threadState.set(thread);
    thread.load();
  }

  /** Leaves the thread; a read still waiting for its debounce is sent now, not dropped. */
  backToList(): void {
    this.leaveThread(true);
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

  private leaveThread(sendPendingRead: boolean): void {
    const pending = this.readTimer !== undefined;
    clearTimeout(this.readTimer);
    this.readTimer = undefined;
    if (pending && sendPendingRead) {
      this.sendRead();
    }
    this.unseen = 0;
    this.threadState.set(null);
    this.currentState.set(null);
  }

  private visible(): boolean {
    return document.visibilityState === 'visible';
  }

  /** Back on the tab with a thread open: what arrived meanwhile is seen now. */
  private onVisibility(): void {
    const thread = this.threadState();
    if (!this.visible() || !thread) {
      return;
    }
    if (this.unseen) {
      const unseen = this.unseen;
      this.unseen = 0;
      this.unreadState.update((n) => Math.max(0, n - unseen));
      this.patch(thread.conversationId, (c) => ({ ...c, unread_count: 0 }));
    }
    this.readIfBehind(thread);
  }

  /** Schedules a read when the newest loaded message is someone else's and newer than the last read sent. */
  private readIfBehind(thread: ChatThread): void {
    const newest = [...thread.items()].reverse().find((item) => item.status === 'sent')?.message;
    if (!newest || !this.visible() || newest.sender?.id === this.myId() || newest.id <= (this.readSent.get(thread.conversationId) ?? 0)) {
      return;
    }
    this.scheduleRead();
  }

  private titleOf(id: number): string {
    const known = this.conversationsState().find((c) => c.id === id);
    return known ? conversationTitle(known, this.language.currentLang()) : this.translate.instant('chat.title');
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
        const seen = !!open && this.visible();
        const counts = !mine && !seen;
        if (counts) {
          this.unreadState.update((n) => n + 1);
          if (open) {
            this.unseen++;
          }
        }
        this.onNewMessage(id, event.message, counts);
        if (open) {
          open.apply(event);
          if (event.message.sender) {
            this.typing.clear(id, event.message.sender.id);
          }
          if (seen && !mine) {
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
          this.leaveThread(false);
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
      this.leaveThread(false);
      this.toast.warn(this.translate.instant('chat.gone'));
    }
    this.loadUnread();
  }

  private scheduleRead(): void {
    clearTimeout(this.readTimer);
    this.readTimer = setTimeout(() => {
      this.readTimer = undefined;
      this.sendRead();
    }, READ_DEBOUNCE_MS);
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
    const previous = this.readSent.get(id);
    this.readSent.set(id, newest);
    this.api.read(id, newest).subscribe({
      next: () => {
        this.loadUnread();
        this.center.refresh();
      },
      error: (error: AppError) => {
        if (error.status === 404) {
          this.onGone(id);
          return;
        }
        // The server never stored the read: allow a retry and bring the badge back in step.
        if (previous === undefined) {
          this.readSent.delete(id);
        } else {
          this.readSent.set(id, previous);
        }
        this.loadUnread();
      },
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
    this.leaveThread(false);
    this.drawerState.set(false);
    this.conversationsState.set([]);
    this.listState.set('idle');
    this.unreadState.set(0);
    this.typing.reset();
    this.readSent.clear();
    this.typingSent.clear();
  }
}
