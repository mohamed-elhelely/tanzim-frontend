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
