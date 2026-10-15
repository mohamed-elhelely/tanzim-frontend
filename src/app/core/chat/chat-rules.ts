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
