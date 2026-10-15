import { ME, chatMessage, chatUser, conversation } from '../../testing/chat-fixtures';
import {
  bodySegments, chatTime, checkFiles, conversationIcon, conversationTitle, dayKey, errorText, formatSize,
  initials, isImageFile, messagePreview, plainBody, systemText,
} from './chat-format';

const t = (key: string, params?: Record<string, unknown>) => (params ? `${key} ${JSON.stringify(params)}` : key);
const names: Record<number, string> = { 51: 'Omar Nasr' };
const nameOf = (id: number) => names[id];

describe('chat format', () => {
  it('titles chats by kind and language', () => {
    expect(conversationTitle(conversation(1), 'en')).toBe('Chat 1');
    expect(conversationTitle(conversation(1), 'ar')).toBe('محادثة 1');
    expect(conversationTitle(conversation(1, { name_ar: '' }), 'ar')).toBe('Chat 1');
    expect(conversationTitle(conversation(1, { kind: 'direct', other_user: chatUser(45, 'Sara Ali') }), 'ar')).toBe('Sara Ali');
    expect(conversationIcon(conversation(1, { kind: 'company' }))).toBe('pi-building');
    expect(conversationIcon(conversation(1, { kind: 'team' }))).toBe('pi-users');
    expect(conversationIcon(conversation(1))).toBeNull();
    expect(initials('Sara Ali')).toBe('SA');
  });

  it('splits bodies into text, mentions and @all', () => {
    expect(bodySegments('@[51] hi @all, a@all.com @[99]', nameOf)).toEqual([
      { kind: 'mention', userId: 51, name: 'Omar Nasr' },
      { kind: 'text', text: ' hi ' },
      { kind: 'all' },
      { kind: 'text', text: ', a@all.com ' },
      { kind: 'mention', userId: 99, name: null },
    ]);
    expect(plainBody('@[51] and @[99]', nameOf, 'user')).toBe('@Omar Nasr and @user');
  });

  it('writes system messages from data', () => {
    expect(systemText({ event: 'role_changed', user_id: 51, role: 'admin' }, nameOf, t)).toBe(
      'chat.system.roleChanged {"name":"Omar Nasr","role":"chat.roles.admin"}',
    );
    expect(systemText({ event: 'posting_policy', posting_policy: 'admins_only' }, nameOf, t)).toBe('chat.system.adminsOnly');
    expect(systemText({ event: 'posting_policy', posting_policy: 'everyone' }, nameOf, t)).toBe('chat.system.everyone');
  });

  it('previews the last message', () => {
    expect(messagePreview(chatMessage(1, { body: '@[51] count' }), 7, nameOf, t)).toBe('@Omar Nasr count');
    expect(messagePreview(chatMessage(1, { sender: ME, body: 'ok' }), 7, nameOf, t)).toBe('chat.you {"text":"ok"}');
    expect(messagePreview(chatMessage(1, { body: '', attachments: [{ id: 1, filename: 'a', content_type: '', size: 1, url: '' }] }), 7, nameOf, t)).toBe('chat.attachment');
    expect(messagePreview(chatMessage(1, { is_deleted: true, body: '' }), 7, nameOf, t)).toBe('chat.deletedPreview');
    expect(messagePreview(chatMessage(1, { sender: null, data: { event: 'posting_policy', posting_policy: 'everyone' } }), 7, nameOf, t)).toBe('chat.system.everyone');
  });

  it('formats times, days and sizes', () => {
    const now = new Date(2026, 9, 15, 18, 0);
    expect(chatTime(new Date(2026, 9, 15, 9, 5).toISOString(), 'en', now)).toMatch(/09:05|9:05/);
    expect(chatTime(new Date(2026, 9, 10, 9, 5).toISOString(), 'en', now)).not.toMatch(/9:05/);
    expect(dayKey(new Date(2026, 9, 15, 23, 0).toISOString())).toBe('2026-10-15');
    expect(formatSize(512)).toBe('512 B');
    expect(formatSize(20480)).toBe('20 KB');
    expect(formatSize(3 * 1024 * 1024)).toBe('3.0 MB');
    expect(isImageFile('Photo.JPG')).toBeTrue();
    expect(isImageFile('count.xlsx')).toBeFalse();
  });

  it('checks files against type, size and count', () => {
    const ok = new File(['x'], 'a.pdf');
    const exe = new File(['x'], 'x.exe');
    const big = new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'big.png');
    const result = checkFiles([], [ok, exe, big]);
    expect(result.accepted).toEqual([ok]);
    expect(result.rejected.map((r) => [r.name, r.reason])).toEqual([['x.exe', 'type'], ['big.png', 'size']]);
    const five = Array.from({ length: 5 }, (_, i) => new File(['x'], `${i}.txt`));
    expect(checkFiles(five, [ok]).rejected).toEqual([{ name: 'a.pdf', reason: 'count' }]);
  });

  it('reads the error text from field errors, arrays or the message', () => {
    expect(errorText({ status: 400, message: 'Unknown error', errors: { body: ['Too long.'] } })).toBe('Too long.');
    expect(errorText({ status: 400, message: ['Direct chats cannot be changed.'] as unknown as string, errors: {} })).toBe('Direct chats cannot be changed.');
    expect(errorText({ status: 403, message: 'You cannot post in this chat.', errors: {} })).toBe('You cannot post in this chat.');
  });
});
