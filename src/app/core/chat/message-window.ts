import { ChatMessage, ChatUserRef, MessageDraft, ReplyPreview, ThreadItem } from './chat.models';

/**
 * Pure functions over one thread's items: stored messages ascending by id, then the unsent ones in the order they
 * were written. A stored message carrying an unsent item's client id replaces it (the POST answer or the socket echo,
 * whichever comes first).
 */
export function mergeMessages(items: ThreadItem[], messages: ChatMessage[]): ThreadItem[] {
  if (!messages.length) {
    return items;
  }
  const stored = new Map<number, ThreadItem>();
  const unsent: ThreadItem[] = [];
  for (const item of items) {
    if (item.status === 'sent') {
      stored.set(item.message.id, item);
    } else {
      unsent.push(item);
    }
  }
  const claimed = new Set<string>();
  for (const message of messages) {
    stored.set(message.id, { message, status: 'sent' });
    if (message.client_id) {
      claimed.add(message.client_id);
    }
  }
  const sorted = [...stored.values()].sort((a, b) => a.message.id - b.message.id);
  return [...sorted, ...unsent.filter((item) => !item.draft || !claimed.has(item.draft.clientId))];
}

/** An edit: replaces the message if it is in the window (an edit of an older message is not pulled in). */
export function replaceMessage(items: ThreadItem[], message: ChatMessage): ThreadItem[] {
  if (!items.some((item) => item.status === 'sent' && item.message.id === message.id)) {
    return items;
  }
  return items.map((item) => (item.status === 'sent' && item.message.id === message.id ? { message, status: 'sent' } : item));
}

export function markDeleted(items: ThreadItem[], messageId: number): ThreadItem[] {
  return items.map((item) =>
    item.status === 'sent' && item.message.id === messageId
      ? { ...item, message: { ...item.message, is_deleted: true, body: '', attachments: [], mentions: [], mentions_all: false } }
      : item,
  );
}

export function addPending(
  items: ThreadItem[],
  draft: MessageDraft,
  sender: ChatUserRef,
  conversationId: number,
  replyTo: ReplyPreview | null,
  now = new Date(),
): ThreadItem[] {
  const message: ChatMessage = {
    id: 0,
    conversation: conversationId,
    sender,
    body: draft.body,
    data: {},
    reply_to: replyTo,
    attachments: draft.files.map((file, index) => ({ id: -(index + 1), filename: file.name, content_type: file.type, size: file.size, url: '' })),
    mentions: [],
    mentions_all: false,
    edited_at: null,
    is_deleted: false,
    created_at: now.toISOString(),
    client_id: draft.clientId,
  };
  return [...items, { message, status: 'pending', draft }];
}

export function setStatus(
  items: ThreadItem[],
  clientId: string,
  status: 'pending' | 'failed',
  error?: string,
  retryable?: boolean,
): ThreadItem[] {
  return items.map((item) =>
    item.status !== 'sent' && item.draft?.clientId === clientId ? { ...item, status, error, retryable } : item,
  );
}

export function removeUnsent(items: ThreadItem[], clientId: string): ThreadItem[] {
  return items.filter((item) => item.status === 'sent' || item.draft?.clientId !== clientId);
}

export function oldestId(items: ThreadItem[]): number | null {
  const first = items.find((item) => item.status === 'sent');
  return first ? first.message.id : null;
}

export function newestId(items: ThreadItem[]): number | null {
  for (let i = items.length - 1; i >= 0; i--) {
    if (items[i].status === 'sent') {
      return items[i].message.id;
    }
  }
  return null;
}
