import { ME, chatMessage, sentItem } from '../../testing/chat-fixtures';
import { MessageDraft } from './chat.models';
import { addPending, markDeleted, mergeMessages, newestId, oldestId, removeUnsent, replaceMessage, setStatus } from './message-window';

function draft(clientId: string, body = 'hi'): MessageDraft {
  return { body, replyTo: null, files: [], clientId };
}

describe('message window', () => {
  it('merges pages in ascending id order without duplicates', () => {
    const items = mergeMessages([], [chatMessage(3), chatMessage(1)]);
    const merged = mergeMessages(items, [chatMessage(2), chatMessage(3, { body: 'new' })]);
    expect(merged.map((i) => i.message.id)).toEqual([1, 2, 3]);
    expect(merged[2].message.body).toBe('new');
  });

  it('keeps unsent messages after the stored ones', () => {
    const pending = addPending(mergeMessages([], [chatMessage(5)]), draft('c1'), ME, 12, null);
    const merged = mergeMessages(pending, [chatMessage(6)]);
    expect(merged.map((i) => i.status)).toEqual(['sent', 'sent', 'pending']);
  });

  it('replaces the pending bubble with the stored message of the same client id', () => {
    const pending = addPending([], draft('c1'), ME, 12, null);
    const merged = mergeMessages(pending, [chatMessage(9, { client_id: 'c1', sender: ME })]);
    expect(merged.length).toBe(1);
    expect(merged[0].status).toBe('sent');
    expect(merged[0].message.id).toBe(9);
  });

  it('socket echo before the POST response leaves one message', () => {
    const pending = addPending([], draft('c1'), ME, 12, null);
    const stored = chatMessage(9, { client_id: 'c1', sender: ME });
    const afterEcho = mergeMessages(pending, [stored]);
    const afterResponse = mergeMessages(afterEcho, [stored]);
    expect(afterResponse.map((i) => i.message.id)).toEqual([9]);
  });

  it('builds a pending message from the draft', () => {
    const file = new File(['x'], 'a.pdf', { type: 'application/pdf' });
    const [item] = addPending([], { body: 'see', replyTo: null, files: [file], clientId: 'c1' }, ME, 12, null);
    expect(item.status).toBe('pending');
    expect(item.message.sender).toEqual(ME);
    expect(item.message.client_id).toBe('c1');
    expect(item.message.attachments[0].filename).toBe('a.pdf');
    expect(item.draft?.clientId).toBe('c1');
  });

  it('replaces only messages already in the window', () => {
    const items = mergeMessages([], [chatMessage(1)]);
    expect(replaceMessage(items, chatMessage(1, { body: 'edited' }))[0].message.body).toBe('edited');
    expect(replaceMessage(items, chatMessage(2))).toBe(items);
  });

  it('marks a message deleted and blanks its content', () => {
    const items = mergeMessages([], [chatMessage(1, { body: 'x', mentions: [3], attachments: [{ id: 1, filename: 'a', content_type: '', size: 1, url: 'u' }] })]);
    const [item] = markDeleted(items, 1);
    expect(item.message.is_deleted).toBeTrue();
    expect(item.message.body).toBe('');
    expect(item.message.attachments).toEqual([]);
    expect(item.message.mentions).toEqual([]);
  });

  it('sets the status of an unsent message and removes it', () => {
    const pending = addPending([], draft('c1'), ME, 12, null);
    const failed = setStatus(pending, 'c1', 'failed', 'Nope', false);
    expect(failed[0]).toEqual(jasmine.objectContaining({ status: 'failed', error: 'Nope', retryable: false }));
    expect(setStatus(failed, 'c1', 'pending')[0].status).toBe('pending');
    expect(removeUnsent(failed, 'c1')).toEqual([]);
  });

  it('finds the smallest and largest stored ids', () => {
    expect(oldestId([])).toBeNull();
    const items = addPending(mergeMessages([], [chatMessage(4), chatMessage(2)]), draft('c1'), ME, 12, null);
    expect(oldestId(items)).toBe(2);
    expect(newestId(items)).toBe(4);
  });

  it('keeps sentItem fixtures usable as stored items', () => {
    expect(oldestId([sentItem(chatMessage(8))])).toBe(8);
  });
});
