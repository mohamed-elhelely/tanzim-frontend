/** /api/notifications/… (API_REFERENCE.md → "Notifications & background tasks"). */
export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface AppNotification {
  id: number;
  title: string;
  message: string;
  /** Arabic text; older notifications may have none (then `title` / `message` are shown). */
  title_ar?: string | null;
  message_ar?: string | null;
  notif_type: NotificationType;
  is_read: boolean;
  created_at: string;
  data: Record<string, unknown>;
}

/** The title and message in the UI language: Arabic when the notification has it, otherwise the default text. */
export function notificationText(notification: AppNotification, lang: string): { title: string; message: string } {
  const arabic = lang === 'ar';
  return {
    title: (arabic && notification.title_ar) || notification.title,
    message: (arabic && notification.message_ar) || notification.message,
  };
}

/** Messages the server sends on the notifications WebSocket; notifications have the HTTP API's shape. */
export type SocketMessage =
  | { type: 'connection_established'; unread_notification: number }
  | { type: 'new_notification' | 'broadcast_notification'; notification: AppNotification }
  | { type: 'pong' };

/**
 * `data` of a notification the backend sends when someone else changed this user's account, membership, role or
 * permission groups (`event: 'account_change'`). The user's own changes never produce one.
 */
export interface AccountChangeData {
  event: 'account_change';
  /** What changed: the user's profile/password, their company membership, their role, or a group inside it. */
  resource: 'user' | 'companyuser' | 'role' | 'permissiongroup';
  object_id: string;
  action: 'update' | 'bulk_update' | 'delete' | 'bulk_delete' | 'restore' | 'password_change';
  changed_by: string;
  audit_log_id: number;
}

export function accountChange(notification: AppNotification): AccountChangeData | null {
  return notification.data?.['event'] === 'account_change' ? (notification.data as unknown as AccountChangeData) : null;
}
