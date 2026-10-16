import { Subject, of, throwError } from 'rxjs';
import { ME, chatMember, chatMessage } from '../../testing/chat-fixtures';
import { ChatApiService } from './chat-api.service';
import { ChatMessage } from './chat.models';
import { ChatThread, ChatThreadDeps } from './chat-thread';

function page(from: number, count: number): ChatMessage[] {
  // Newest first, like the API.
  return Array.from({ length: count }, (_, i) => chatMessage(from + count - 1 - i));
}

describe('ChatThread', () => {
  let api: jasmine.SpyObj<ChatApiService>;
  let deps: ChatThreadDeps;

  beforeEach(() => {
    api = jasmine.createSpyObj<ChatApiService>('ChatApiService', ['messages', 'members', 'send', 'edit', 'remove']);
    api.members.and.returnValue(of([chatMember(45, 'Sara Ali')]));
    deps = {
      api,
      me: () => ME,
      sent: jasmine.createSpy('sent'),
      gone: jasmine.createSpy('gone'),
      refused: jasmine.createSpy('refused'),
      loaded: jasmine.createSpy('loaded'),
      fail: jasmine.createSpy('fail'),
    };
  });

  it('loads the newest page and members, oldest first', () => {
    api.messages.and.returnValue(of(page(1, 50)));
    const thread = new ChatThread(12, deps);
    thread.load();
    expect(api.messages).toHaveBeenCalledWith(12, { limit: 50 });
    expect(thread.items()[0].message.id).toBe(1);
    expect(thread.newestId()).toBe(50);
    expect(thread.hasOlder()).toBeTrue();
    expect(thread.loading()).toBeFalse();
    expect(thread.nameOf(45)).toBe('Sara Ali');
    expect(deps.loaded).toHaveBeenCalled();
  });

  it('loads older pages until a short page comes back', () => {
    api.messages.and.returnValues(of(page(51, 50)), of(page(41, 10)));
    const thread = new ChatThread(12, deps);
    thread.load();
    thread.loadOlder();
    expect(api.messages.calls.mostRecent().args).toEqual([12, { before: 51, limit: 50 }]);
    expect(thread.items()[0].message.id).toBe(41);
    expect(thread.hasOlder()).toBeFalse();
    thread.loadOlder();
    expect(api.messages).toHaveBeenCalledTimes(2);
  });

  it('a 404 while loading the thread reports it gone', () => {
    api.messages.and.returnValue(throwError(() => ({ status: 404, message: 'Not found.', errors: {} })));
    const thread = new ChatThread(12, deps);
    thread.load();
    expect(deps.gone).toHaveBeenCalled();
  });

  it('sends: pending bubble, then the stored message', () => {
    api.messages.and.returnValue(of([]));
    const answer = new Subject<ChatMessage>();
    api.send.and.returnValue(answer);
    const thread = new ChatThread(12, deps);
    thread.load();
    thread.send('hi', null, []);
    const draft = api.send.calls.mostRecent().args[1];
    expect(draft.body).toBe('hi');
    expect(draft.clientId).toMatch(/[0-9a-f-]{36}/);
    expect(thread.items()[0].status).toBe('pending');
    const stored = chatMessage(9, { sender: ME, client_id: draft.clientId });
    answer.next(stored);
    expect(thread.items().map((i) => [i.message.id, i.status])).toEqual([[9, 'sent']]);
    expect(deps.sent).toHaveBeenCalledWith(stored);
  });

  it('a network failure can be retried with the same client id', () => {
    api.messages.and.returnValue(of([]));
    api.send.and.returnValue(throwError(() => ({ status: 0, message: 'x', errors: {} })));
    const thread = new ChatThread(12, deps);
    thread.load();
    thread.send('hi', null, []);
    const clientId = api.send.calls.mostRecent().args[1].clientId;
    expect(thread.items()[0]).toEqual(jasmine.objectContaining({ status: 'failed', retryable: true }));
    api.send.and.returnValue(of(chatMessage(9, { sender: ME, client_id: clientId })));
    thread.retry(clientId);
    expect(api.send.calls.mostRecent().args[1].clientId).toBe(clientId);
    expect(thread.items()[0].status).toBe('sent');
  });

  it('a 4xx failure shows the reason; 403 asks for a refresh of the chat', () => {
    api.messages.and.returnValue(of([]));
    api.send.and.returnValue(throwError(() => ({ status: 403, message: 'You cannot post in this chat.', errors: {} })));
    const thread = new ChatThread(12, deps);
    thread.load();
    thread.send('hi', null, []);
    expect(thread.items()[0]).toEqual(jasmine.objectContaining({ status: 'failed', retryable: false, error: 'You cannot post in this chat.' }));
    expect(deps.refused).toHaveBeenCalled();
    thread.discard(thread.items()[0].draft!.clientId);
    expect(thread.items()).toEqual([]);
  });

  it('applies socket events to the window', () => {
    api.messages.and.returnValue(of([chatMessage(1)]));
    const thread = new ChatThread(12, deps);
    thread.load();
    thread.apply({ type: 'chat.message', conversation_id: 12, message: chatMessage(2) });
    thread.apply({ type: 'chat.message_updated', conversation_id: 12, message: chatMessage(1, { body: 'edited' }) });
    thread.apply({ type: 'chat.message_deleted', conversation_id: 12, message_id: 2 });
    expect(thread.items().map((i) => [i.message.body, i.message.is_deleted])).toEqual([['edited', false], ['', true]]);
  });

  it('edits and deletes', () => {
    api.messages.and.returnValue(of([chatMessage(1, { sender: ME })]));
    api.edit.and.returnValue(of(chatMessage(1, { sender: ME, body: 'new', edited_at: '2026-10-15T10:00:00Z' })));
    api.remove.and.returnValue(of(undefined));
    const thread = new ChatThread(12, deps);
    thread.load();
    thread.edit(1, 'new');
    expect(thread.items()[0].message.edited_at).not.toBeNull();
    thread.deleteRequest(1).subscribe();
    expect(thread.items()[0].message.is_deleted).toBeTrue();
  });

  it('a failed edit is reported', () => {
    api.messages.and.returnValue(of([chatMessage(1, { sender: ME })]));
    const error = { status: 400, message: 'Unknown error', errors: { body: ['Too late.'] } };
    api.edit.and.returnValue(throwError(() => error));
    const thread = new ChatThread(12, deps);
    thread.load();
    thread.edit(1, 'new');
    expect(deps.fail).toHaveBeenCalledWith(error);
  });

  it('catches up after a reconnect: after-pages while full, then the newest window, then pending sends', () => {
    api.messages.and.returnValue(of([chatMessage(10)]));
    const pending = new Subject<ChatMessage>();
    api.send.and.returnValue(pending);
    const thread = new ChatThread(12, deps);
    thread.load();
    thread.send('later', null, []);
    api.messages.and.returnValues(of(page(11, 50)), of(page(61, 3)), of(page(14, 50)));
    api.send.and.returnValue(of(chatMessage(70, { sender: ME, client_id: api.send.calls.mostRecent().args[1].clientId })));
    thread.catchUp();
    const calls = api.messages.calls.allArgs().slice(1);
    expect(calls).toEqual([
      [12, { after: 10, limit: 50 }],
      [12, { after: 60, limit: 50 }],
      [12, { limit: 50 }],
    ]);
    expect(thread.newestId()).toBe(70);
    expect(thread.items().some((i) => i.status === 'pending')).toBeFalse();
  });
});
