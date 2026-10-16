import { ME, chatMessage, conversation, sentItem } from '../../testing/chat-fixtures';
import { canDelete, canEdit, canMentionAll, postingNote } from './chat-rules';

describe('chat rules', () => {
  const now = Date.parse('2026-10-15T12:00:00+03:00');
  const mine = sentItem(chatMessage(1, { sender: ME, created_at: '2026-10-15T09:00:00+03:00' }));
  const theirs = sentItem(chatMessage(2));
  const system = sentItem(chatMessage(3, { sender: null }));

  it('lets only the sender edit, within 24 hours, never system or deleted messages', () => {
    expect(canEdit(mine, 7, now)).toBeTrue();
    expect(canEdit(mine, 7, now + 24 * 3600 * 1000)).toBeFalse();
    expect(canEdit(theirs, 7, now)).toBeFalse();
    expect(canEdit(system, 7, now)).toBeFalse();
    expect(canEdit({ ...mine, status: 'pending' }, 7, now)).toBeFalse();
  });

  it('lets the sender, chat owners/admins and moderators delete', () => {
    expect(canDelete(mine, 7, 'member', false)).toBeTrue();
    expect(canDelete(theirs, 7, 'member', false)).toBeFalse();
    expect(canDelete(theirs, 7, 'admin', false)).toBeTrue();
    expect(canDelete(theirs, 7, 'owner', false)).toBeTrue();
    expect(canDelete(theirs, 7, 'member', true)).toBeTrue();
    expect(canDelete(system, 7, 'admin', false)).toBeTrue();
    expect(canDelete(sentItem(chatMessage(4, { sender: ME, is_deleted: true })), 7, 'member', false)).toBeFalse();
  });

  it('offers @all to admins, moderators and small chats', () => {
    expect(canMentionAll(conversation(1, { members_count: 30 }), false)).toBeFalse();
    expect(canMentionAll(conversation(1, { members_count: 20 }), false)).toBeTrue();
    expect(canMentionAll(conversation(1, { members_count: 30, my_role: 'admin' }), false)).toBeTrue();
    expect(canMentionAll(conversation(1, { members_count: 30 }), true)).toBeTrue();
  });

  it('explains why posting is not allowed', () => {
    expect(postingNote(conversation(1))).toBeNull();
    expect(postingNote(conversation(1, { can_post: false, kind: 'direct', other_user: { id: 45, name: 'S', is_active: false } }))).toBe('chat.note.peerLeft');
    expect(postingNote(conversation(1, { can_post: false, posting_policy: 'admins_only' }))).toBe('chat.note.adminsOnly');
    expect(postingNote(conversation(1, { can_post: false }))).toBe('chat.note.readOnly');
  });
});
