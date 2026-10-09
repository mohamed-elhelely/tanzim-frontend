import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { forkJoin } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BaseApiService } from '../api/base-api.service';
import { AuthService } from '../auth/auth.service';
import { TokenStorageService } from '../auth/token-storage.service';
import { AppNotification, SocketMessage } from './notification.model';

/** The socket was refused for good (4001 bad token, 4003 wrong user): don't reconnect. */
const FINAL_CLOSE_CODES = new Set([4001, 4003]);
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
  private readonly itemsState = signal<AppNotification[]>([]);
  private readonly unreadState = signal(0);
  private socket: WebSocket | null = null;
  private pingTimer?: ReturnType<typeof setInterval>;
  private retryTimer?: ReturnType<typeof setTimeout>;
  private retryDelay = 2_000;
  private started = false;

  /** Most recent first (the backend returns the latest 20). */
  readonly items = this.itemsState.asReadonly();
  readonly unread = this.unreadState.asReadonly();
  readonly hasUnread = computed(() => this.unreadState() > 0);

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
      this.pingTimer = setInterval(() => socket.send(JSON.stringify({ action: 'ping' })), PING_EVERY_MS);
    };
    socket.onmessage = (event) => this.onMessage(JSON.parse(event.data) as SocketMessage);
    socket.onclose = (event) => {
      clearInterval(this.pingTimer);
      if (this.socket !== socket || FINAL_CLOSE_CODES.has(event.code)) {
        return;
      }
      this.retryTimer = setTimeout(() => this.connect(), this.retryDelay);
      this.retryDelay = Math.min(this.retryDelay * 2, MAX_RETRY_DELAY_MS);
    };
  }

  private onMessage(message: SocketMessage): void {
    switch (message.type) {
      case 'connection_established':
        this.unreadState.set(message.unread_notification);
        break;
      case 'new_notification':
      case 'broadcast_notification': {
        const notification = message.notification;
        this.itemsState.update((items) => [notification, ...items.filter((i) => i.id !== notification.id)]);
        if (!notification.is_read) {
          this.unreadState.update((count) => count + 1);
        }
        break;
      }
    }
  }

  private stop(): void {
    this.started = false;
    clearTimeout(this.retryTimer);
    clearInterval(this.pingTimer);
    const socket = this.socket;
    this.socket = null;
    socket?.close();
    this.itemsState.set([]);
    this.unreadState.set(0);
  }
}
