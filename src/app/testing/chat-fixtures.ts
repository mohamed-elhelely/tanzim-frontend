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
