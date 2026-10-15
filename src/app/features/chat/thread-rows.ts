import { dayKey } from '../../core/chat/chat-format';
import { ThreadItem } from '../../core/chat/chat.models';

/** Messages of one sender closer than this share one name/avatar. */
export const GROUP_WINDOW_MS = 5 * 60 * 1000;

export type ThreadRow =
  | { kind: 'day'; key: string; label: string }
  | { kind: 'system'; key: string; item: ThreadItem }
  | { kind: 'message'; key: string; item: ThreadItem; mine: boolean; first: boolean };

function itemKey(item: ThreadItem): string {
  return item.status === 'sent' ? `m:${item.message.id}` : `c:${item.message.client_id}`;
}

export function threadRows(items: ThreadItem[], myId: number, dayLabelOf: (iso: string) => string): ThreadRow[] {
  const rows: ThreadRow[] = [];
  let day = '';
  let previous: ThreadItem | null = null;
  for (const item of items) {
    const message = item.message;
    const key = dayKey(message.created_at);
    if (key !== day) {
      rows.push({ kind: 'day', key: `d:${key}`, label: dayLabelOf(message.created_at) });
      day = key;
      previous = null;
    }
    if (!message.sender) {
      rows.push({ kind: 'system', key: itemKey(item), item });
      previous = null;
      continue;
    }
    const first =
      !previous ||
      previous.message.sender?.id !== message.sender.id ||
      Date.parse(message.created_at) - Date.parse(previous.message.created_at) > GROUP_WINDOW_MS;
    rows.push({ kind: 'message', key: itemKey(item), item, mine: message.sender.id === myId, first });
    previous = item;
  }
  return rows;
}
