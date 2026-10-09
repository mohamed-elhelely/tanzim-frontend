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

/** Messages the server sends on the notifications WebSocket; notifications have the HTTP API's shape. */
export type SocketMessage =
  | { type: 'connection_established'; unread_notification: number }
  | { type: 'new_notification' | 'broadcast_notification'; notification: AppNotification }
  | { type: 'pong' };
