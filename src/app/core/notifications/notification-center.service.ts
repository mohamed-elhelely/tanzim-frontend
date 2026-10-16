import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, forkJoin } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ChatEvent } from '../chat/chat.models';
import { BaseApiService } from '../api/base-api.service';
import { AuthService } from '../auth/auth.service';
import { TokenStorageService } from '../auth/token-storage.service';
import { AppNotification, SocketMessage, accountChange } from './notification.model';

/** 4001: the access token was refused (expired or rotated) → refresh once, then reconnect. 4003: wrong user, final. */
const TOKEN_REFUSED = 4001;
const WRONG_USER = 4003;
const SOCKET_OPEN = 1;
const PING_EVERY_MS = 30_000;
const MAX_RETRY_DELAY_MS = 60_000;

/**
 * The signed-in user's notifications: the recent list, the unread count, and live updates.
 * `start()` (called by the shell) loads both over HTTP, then opens the WebSocket
 * `/ws/notifications/{user_id}/?token=…`, which pushes new notifications and the unread count.
 * The socket reconnects with a growing delay and is closed when the user signs out.
 */
@Injectable({ providedIn: 'root' })
export class NotificationCenterService extends BaseApiService {
  private readonly auth = inject(AuthService);
  private readonly tokens = inject(TokenStorageService);
  private readonly router = inject(Router);
  private readonly incoming = new Subject<AppNotification>();
  private readonly chatEvents = new Subject<ChatEvent>();
  private readonly reconnected = new Subject<void>();
  /** True once this session's socket opened; later opens are reconnects. */
  private openedBefore = false;
  private readonly itemsState = signal<AppNotification[]>([]);
  private readonly unreadState = signal(0);
  private socket: WebSocket | null = null;
  private pingTimer?: ReturnType<typeof setInterval>;
  private retryTimer?: ReturnType<typeof setTimeout>;
  private retryDelay = 2_000;
  private started = false;
  /** One token refresh per refused connection, so a server that keeps refusing doesn't loop. */
  private refreshedForSocket = false;

  /** Most recent first (the backend returns the latest 20). */
  readonly items = this.itemsState.asReadonly();
  readonly unread = this.unreadState.asReadonly();
  readonly hasUnread = computed(() => this.unreadState() > 0);
  /** Each notification the socket pushes, as it arrives (toasts and account-change handling listen here). */
  readonly incoming$ = this.incoming.asObservable();
  /** Chat frames (`type` starts with `chat.`); ChatStore applies them. */
  readonly chatEvents$ = this.chatEvents.asObservable();
  /** Each time the socket opens again after a drop: chat refetches what it may have missed. */
  readonly reconnected$ = this.reconnected.asObservable();

  constructor() {
    super();
    // Signing out (or in as someone else) closes the previous user's socket and forgets their list.
    // Only a real change stops it: the first run must not undo a start() that already happened.
    let previous: string | null | undefined;
    effect(() => {
      const id = this.auth.user()?.id ?? null;
      if (previous !== undefined && id !== previous) {
        untracked(() => this.stop());
      }
      previous = id;
    });
  }

  start(): void {
    if (this.started || !this.auth.user()) {
      return;
    }
    this.started = true;
    this.refresh();
    this.connect();
  }

  refresh(): void {
    this.get<AppNotification[]>('notifications/my-notifications/').subscribe({
      next: (response) => this.itemsState.set(response.data ?? []),
      error: () => undefined,
    });
    this.get<{ unread_count: number }>('notifications/unread-count/').subscribe({
      next: (response) => this.unreadState.set(response.data?.unread_count ?? 0),
      error: () => undefined,
    });
  }

  markRead(notification: AppNotification): void {
    if (notification.is_read) {
      return;
    }
    this.post<unknown>(`notifications/mark-read/${notification.id}/`).subscribe({
      next: () => this.applyRead([notification.id]),
      error: () => undefined,
    });
  }

  /** A click on a notification: marks it read; a change to the user's own account opens their profile. */
  open(notification: AppNotification): void {
    this.markRead(notification);
    if (accountChange(notification)?.resource === 'user') {
      void this.router.navigate(['/profile']);
    }
  }

  /** There is no bulk endpoint: one request per unread notification in the list. */
  markAllRead(): void {
    const unread = this.itemsState().filter((item) => !item.is_read);
    if (!unread.length) {
      return;
    }
    forkJoin(unread.map((item) => this.post<unknown>(`notifications/mark-read/${item.id}/`))).subscribe({
      next: () => this.applyRead(unread.map((item) => item.id)),
      error: () => this.refresh(),
    });
  }

  /** A client frame (chat typing); dropped when the socket is not open. */
  send(frame: object): void {
    if (this.socket?.readyState === SOCKET_OPEN) {
      this.socket.send(JSON.stringify(frame));
    }
  }

  private applyRead(ids: number[]): void {
    const set = new Set(ids);
    this.itemsState.update((items) => items.map((item) => (set.has(item.id) ? { ...item, is_read: true } : item)));
    this.unreadState.update((count) => Math.max(0, count - ids.length));
  }

  private connect(): void {
    const user = this.auth.user();
    const token = this.tokens.accessToken();
    if (!user || !token || typeof WebSocket === 'undefined') {
      return;
    }
    const socket = new WebSocket(`${environment.wsBaseUrl}notifications/${user.id}/?token=${encodeURIComponent(token)}`);
    this.socket = socket;
    socket.onopen = () => {
      this.retryDelay = 2_000;
      this.refreshedForSocket = false;
      this.pingTimer = setInterval(() => socket.send(JSON.stringify({ action: 'ping' })), PING_EVERY_MS);
      if (this.openedBefore) {
        this.reconnected.next();
      }
      this.openedBefore = true;
    };
    socket.onmessage = (event) => this.onMessage(JSON.parse(event.data) as SocketMessage | ChatEvent);
    socket.onclose = (event) => {
      clearInterval(this.pingTimer);
      if (this.socket !== socket || event.code === WRONG_USER) {
        return;
      }
      if (event.code === TOKEN_REFUSED) {
        // The token is only checked on connect: after 30 minutes it has expired, so get a new one and come back.
        if (this.refreshedForSocket) {
          return;
        }
        this.refreshedForSocket = true;
        this.auth.refreshAccessToken().subscribe({
          next: () => this.socket === socket && this.connect(),
          error: () => this.auth.endSession(),
        });
        return;
      }
      this.retryTimer = setTimeout(() => this.connect(), this.retryDelay);
      this.retryDelay = Math.min(this.retryDelay * 2, MAX_RETRY_DELAY_MS);
    };
  }

  private onMessage(message: SocketMessage | ChatEvent): void {
    if (message.type?.startsWith('chat.')) {
      this.chatEvents.next(message as ChatEvent);
      return;
    }
    switch ((message as SocketMessage).type) {
      case 'connection_established':
        this.unreadState.set((message as { unread_notification: number }).unread_notification);
        break;
      case 'new_notification':
      case 'broadcast_notification': {
        const notification = (message as { notification: AppNotification }).notification;
        // A collapsed chat bell comes back with the same id: replacing an item that was already unread keeps the count.
        const alreadyUnread = this.itemsState().some((i) => i.id === notification.id && !i.is_read);
        this.itemsState.update((items) => [notification, ...items.filter((i) => i.id !== notification.id)]);
        if (!notification.is_read && !alreadyUnread) {
          this.unreadState.update((count) => count + 1);
        }
        this.incoming.next(notification);
        break;
      }
    }
  }

  private stop(): void {
    this.started = false;
    this.openedBefore = false;
    clearTimeout(this.retryTimer);
    clearInterval(this.pingTimer);
    const socket = this.socket;
    this.socket = null;
    socket?.close();
    this.itemsState.set([]);
    this.unreadState.set(0);
  }
}
