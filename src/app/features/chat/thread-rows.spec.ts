import { ME, chatMessage, chatUser, sentItem } from '../../testing/chat-fixtures';
import { threadRows } from './thread-rows';

describe('threadRows', () => {
  const label = (iso: string) => iso.slice(0, 10);

  it('adds a day separator before each new day and groups a sender within 5 minutes', () => {
    const items = [
      sentItem(chatMessage(1, { created_at: '2026-10-14T10:00:00Z' })),
      sentItem(chatMessage(2, { created_at: '2026-10-15T10:00:00Z' })),
      sentItem(chatMessage(3, { created_at: '2026-10-15T10:04:00Z' })),
      sentItem(chatMessage(4, { created_at: '2026-10-15T10:10:00Z' })),
      sentItem(chatMessage(5, { created_at: '2026-10-15T10:11:00Z', sender: chatUser(51) })),
      sentItem(chatMessage(6, { created_at: '2026-10-15T10:12:00Z', sender: ME })),
      sentItem(chatMessage(7, { created_at: '2026-10-15T10:12:30Z', sender: null })),
    ];
    const rows = threadRows(items, 7, label);
    expect(rows.map((r) => (r.kind === 'message' ? `${r.item.message.id}${r.first ? '*' : ''}${r.mine ? 'm' : ''}` : r.kind))).toEqual([
      'day', '1*', 'day', '2*', '3', '4*', '5*', '6*m', 'system',
    ]);
  });

  it('keys rows by id, or by client id while unsent', () => {
    const rows = threadRows([{ message: chatMessage(0, { client_id: 'c1', sender: ME }), status: 'pending' }], 7, label);
    expect(rows[1].key).toBe('c:c1');
  });
});
