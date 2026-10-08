/** /api/notifications/… (API_REFERENCE.md → "Notifications & background tasks"). */
export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface AppNotification {
  id: number;
  title: string;
  message: string;
  notif_type: NotificationType;
  is_read: boolean;
  created_at: string;
  data: Record<string, unknown>;
}

/**
 * A notification as the WebSocket sends it. ⚠️ It names two fields differently from the HTTP API
 * (`type` for `notif_type`, `timestamp` for `created_at`); see toAppNotification().
 */
export interface SocketNotification {
  id: number;
  title: string;
  message: string;
  type?: NotificationType;
  notif_type?: NotificationType;
  timestamp?: string;
  created_at?: string;
  data?: Record<string, unknown>;
  is_read?: boolean;
}

/** Messages the server sends on the notifications WebSocket. */
export type SocketMessage =
  | { type: 'connection_established'; unread_notification: number }
  | { type: 'new_notification' | 'broadcast_notification'; notification: SocketNotification }
  | { type: 'pong' };

/** Accepts both field names, so it keeps working if the backend aligns the socket with the HTTP API. */
export function toAppNotification(raw: SocketNotification): AppNotification {
  return {
    id: raw.id,
    title: raw.title,
    message: raw.message,
    notif_type: raw.notif_type ?? raw.type ?? 'info',
    is_read: raw.is_read ?? false,
    created_at: raw.created_at ?? raw.timestamp ?? new Date().toISOString(),
    data: raw.data ?? {},
  };
}
