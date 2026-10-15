import { signal } from '@angular/core';
import { TestBed, discardPeriodicTasks, fakeAsync, tick } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { Subject } from 'rxjs';
import { envelope, errorEnvelope, provideApiTesting } from '../../testing/api-testing';
import { ME, chatMessage, conversation } from '../../testing/chat-fixtures';
import { AccessService } from '../auth/access.service';
import { AuthService } from '../auth/auth.service';
import { NotificationCenterService } from '../notifications/notification-center.service';
import { NotificationService } from '../services/notification.service';
import { ChatEvent } from './chat.models';
import { ChatStore, READ_DEBOUNCE_MS, TYPING_SEND_EVERY_MS } from './chat.store';

describe('ChatStore', () => {
  let http: HttpTestingController;
  let events: Subject<ChatEvent>;
  let reconnected: Subject<void>;
  let center: { chatEvents$: Subject<ChatEvent>; reconnected$: Subject<void>; send: jasmine.Spy; refresh: jasmine.Spy };
  let toast: jasmine.SpyObj<NotificationService>;
  const allowed = signal(true);
  const user = signal<{ id: string; name: string } | null>({ id: '7', name: 'Me Myself' });

  const base = '/api/chat/v1/';

  beforeEach(() => {
    allowed.set(true);
    user.set({ id: '7', name: 'Me Myself' });
    events = new Subject();
    reconnected = new Subject();
    center = { chatEvents$: events, reconnected$: reconnected, send: jasmine.createSpy('send'), refresh: jasmine.createSpy('refresh') };
    toast = jasmine.createSpyObj<NotificationService>('NotificationService', ['warn', 'failure', 'success', 'error', 'info']);
    TestBed.configureTestingModule({
      providers: [
        ...provideApiTesting(),
        { provide: AuthService, useValue: { user } },
        { provide: AccessService, useValue: { can: () => allowed() } },
        { provide: NotificationCenterService, useValue: center },
        { provide: NotificationService, useValue: toast },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function create(unread = 3): ChatStore {
    const store = TestBed.inject(ChatStore);
    TestBed.tick();
    http.expectOne(`${base}unread/`).flush(envelope({ conversations: 1, messages: unread }));
    return store;
  }

  function openDrawerWith(store: ChatStore, list = [conversation(12, { unread_count: 2 }), conversation(13)]): void {
    store.openDrawer();
    http.expectOne(`${base}conversations/`).flush(envelope(list));
  }

  function openThread(store: ChatStore, id = 12, messages = [chatMessage(1)]): void {
    store.openThread(id);
    http.expectOne((r) => r.url === `${base}conversations/${id}/messages/`).flush(envelope(messages));
    http.expectOne(`${base}conversations/${id}/members/`).flush(envelope([]));
  }

  it('loads the unread total when chat is allowed', () => {
    const store = create(3);
    expect(store.enabled()).toBeTrue();
    expect(store.unreadTotal()).toBe(3);
  });

  it('does nothing without chat access', () => {
    allowed.set(false);
    const store = TestBed.inject(ChatStore);
    TestBed.tick();
    http.expectNone(`${base}unread/`);
    store.openDrawer();
    expect(store.drawerOpen()).toBeFalse();
  });

  it('loads the list once when the drawer opens', () => {
    const store = create();
    openDrawerWith(store);
    expect(store.drawerOpen()).toBeTrue();
    expect(store.conversations().map((c) => c.id)).toEqual([12, 13]);
    store.closeDrawer();
    store.openDrawer();
    http.expectNone(`${base}conversations/`);
  });

  it('counts messages before the list is loaded', () => {
    const store = create(3);
    events.next({ type: 'chat.message', conversation_id: 12, message: chatMessage(5) });
    expect(store.unreadTotal()).toBe(4);
    events.next({ type: 'chat.message', conversation_id: 12, message: chatMessage(6, { sender: ME }) });
    expect(store.unreadTotal()).toBe(4);
  });

  it('moves a chat to the top with its new message and unread count', () => {
    const store = create(3);
    openDrawerWith(store);
    events.next({ type: 'chat.message', conversation_id: 13, message: chatMessage(5, { conversation: 13 }) });
    expect(store.conversations()[0]).toEqual(jasmine.objectContaining({ id: 13, unread_count: 1 }));
    expect(store.conversations()[0].last_message?.id).toBe(5);
  });

  it('fetches a chat it does not know yet', () => {
    const store = create();
    openDrawerWith(store);
    events.next({ type: 'chat.message', conversation_id: 99, message: chatMessage(5, { conversation: 99 }) });
    http.expectOne(`${base}conversations/99/`).flush(envelope(conversation(99, { unread_count: 1 })));
    expect(store.conversations()[0].id).toBe(99);
  });

  it('opening a thread zeroes its unread and marks it read after the debounce', fakeAsync(() => {
    const store = create(3);
    openDrawerWith(store);
    openThread(store, 12, [chatMessage(1), chatMessage(2)]);
    expect(store.view()).toBe('thread');
    expect(store.conversations()[0].unread_count).toBe(0);
    expect(store.unreadTotal()).toBe(1);
    tick(READ_DEBOUNCE_MS);
    const read = http.expectOne(`${base}conversations/12/read/`);
    expect(read.request.body).toEqual({ message_id: 2 });
    read.flush(envelope({ last_read_message_id: 2 }));
    http.expectOne(`${base}unread/`).flush(envelope({ conversations: 0, messages: 1 }));
    expect(center.refresh).toHaveBeenCalled();
  }));

  it('messages in the open thread are appended and read, not counted', fakeAsync(() => {
    const store = create(0);
    openDrawerWith(store, [conversation(12)]);
    openThread(store);
    events.next({ type: 'chat.message', conversation_id: 12, message: chatMessage(2) });
    expect(store.unreadTotal()).toBe(0);
    expect(store.thread()!.items().map((i) => i.message.id)).toEqual([1, 2]);
    tick(READ_DEBOUNCE_MS);
    http.expectOne(`${base}conversations/12/read/`).flush(envelope({ last_read_message_id: 2 }));
    http.expectOne(`${base}unread/`).flush(envelope({ conversations: 0, messages: 0 }));
  }));

  it('list arriving after opening a thread keeps the open chat read', fakeAsync(() => {
    const store = create(2);
    store.openDrawer(12);
    const list = http.expectOne(`${base}conversations/`);
    http.expectOne(`${base}conversations/12/`).flush(envelope(conversation(12, { unread_count: 2 })));
    http.expectOne((r) => r.url === `${base}conversations/12/messages/`).flush(envelope([chatMessage(1)]));
    http.expectOne(`${base}conversations/12/members/`).flush(envelope([]));
    list.flush(envelope([conversation(12, { unread_count: 2 })]));
    expect(store.conversations()[0].unread_count).toBe(0);
    tick(READ_DEBOUNCE_MS);
    http.expectOne(`${base}conversations/12/read/`).flush(envelope({ last_read_message_id: 1 }));
    http.expectOne(`${base}unread/`).flush(envelope({ conversations: 0, messages: 0 }));
    expect(store.unreadTotal()).toBe(0);
  }));

  it('my read from another tab clears that chat', () => {
    const store = create(3);
    openDrawerWith(store);
    events.next({ type: 'chat.read', conversation_id: 12, user_id: 7, message_id: 9 });
    expect(store.conversations()[0].unread_count).toBe(0);
    http.expectOne(`${base}unread/`).flush(envelope({ conversations: 0, messages: 1 }));
    expect(store.unreadTotal()).toBe(1);
    events.next({ type: 'chat.read', conversation_id: 13, user_id: 45, message_id: 9 });
    http.expectNone(`${base}unread/`);
  });

  it('refetches a chat on chat.conversation', () => {
    const store = create();
    openDrawerWith(store);
    events.next({ type: 'chat.conversation', conversation_id: 13, action: 'updated' });
    http.expectOne(`${base}conversations/13/`).flush(envelope(conversation(13, { can_post: false })));
    expect(store.conversations().find((c) => c.id === 13)?.can_post).toBeFalse();
  });

  it('chat.removed on the open thread goes back to the list', () => {
    const store = create();
    openDrawerWith(store);
    openThread(store, 13);
    events.next({ type: 'chat.removed', conversation_id: 13 });
    http.expectOne(`${base}unread/`).flush(envelope({ conversations: 0, messages: 0 }));
    expect(store.view()).toBe('list');
    expect(store.conversations().map((c) => c.id)).toEqual([12]);
    expect(toast.warn).toHaveBeenCalled();
  });

  it('a 404 while loading the thread drops it', () => {
    const store = create();
    openDrawerWith(store);
    store.openThread(13);
    http.expectOne((r) => r.url === `${base}conversations/13/messages/`).flush(errorEnvelope(404, 'Not found.'), { status: 404, statusText: 'Not Found' });
    http.expectOne(`${base}conversations/13/members/`).flush(envelope([]));
    http.expectOne(`${base}unread/`).flush(envelope({ conversations: 0, messages: 0 }));
    expect(store.view()).toBe('list');
    expect(store.conversations().map((c) => c.id)).toEqual([12]);
  });

  it('shows typing and clears it when that person posts', fakeAsync(() => {
    const store = create(0);
    openDrawerWith(store, [conversation(12)]);
    openThread(store);
    events.next({ type: 'chat.typing', conversation_id: 12, user_id: 45 });
    expect(store.typing.usersIn(12)).toEqual([45]);
    events.next({ type: 'chat.message', conversation_id: 12, message: chatMessage(2) });
    expect(store.typing.usersIn(12)).toEqual([]);
    tick(READ_DEBOUNCE_MS);
    http.expectOne(`${base}conversations/12/read/`).flush(envelope({ last_read_message_id: 2 }));
    http.expectOne(`${base}unread/`).flush(envelope({ conversations: 0, messages: 0 }));
  }));

  it('sends typing at most every 3 seconds, only where I may post', fakeAsync(() => {
    const store = create(0);
    openDrawerWith(store, [conversation(12), conversation(13, { can_post: false })]);
    openThread(store, 12);
    store.typed();
    store.typed();
    expect(center.send).toHaveBeenCalledTimes(1);
    expect(center.send).toHaveBeenCalledWith({ action: 'typing', conversation_id: 12 });
    tick(TYPING_SEND_EVERY_MS);
    store.typed();
    expect(center.send).toHaveBeenCalledTimes(2);
    store.backToList();
    openThread(store, 13);
    store.typed();
    expect(center.send).toHaveBeenCalledTimes(2);
    discardPeriodicTasks();
  }));

  it('resyncs after a reconnect', () => {
    const store = create(0);
    openDrawerWith(store, [conversation(12)]);
    openThread(store, 12, [chatMessage(1)]);
    reconnected.next();
    http.expectOne(`${base}unread/`).flush(envelope({ conversations: 0, messages: 0 }));
    http.expectOne(`${base}conversations/`).flush(envelope([conversation(12)]));
    http.expectOne((r) => r.url === `${base}conversations/12/messages/` && r.params.get('after') === '1').flush(envelope([]));
    http.expectOne((r) => r.url === `${base}conversations/12/messages/` && !r.params.has('after')).flush(envelope([chatMessage(1)]));
  });

  it('starts a direct chat and opens it', () => {
    const store = create(0);
    openDrawerWith(store, [conversation(12)]);
    store.startDirect(45);
    http.expectOne(`${base}conversations/direct/`).flush(envelope(conversation(20, { kind: 'direct' })));
    http.expectOne((r) => r.url === `${base}conversations/20/messages/`).flush(envelope([]));
    http.expectOne(`${base}conversations/20/members/`).flush(envelope([]));
    expect(store.conversations()[0].id).toBe(20);
    expect(store.current()?.id).toBe(20);
  });

  it('shows why a direct chat cannot start', () => {
    const store = create(0);
    store.startDirect(45);
    http.expectOne(`${base}conversations/direct/`).flush(errorEnvelope(400, 'This user cannot be messaged.'), { status: 400, statusText: 'Bad Request' });
    expect(toast.failure).toHaveBeenCalled();
  });

  it('a thread closed while loading does not schedule a read for the open one', fakeAsync(() => {
    const store = create(3);
    openDrawerWith(store);
    store.openThread(12);
    const first = http.expectOne((r) => r.url === `${base}conversations/12/messages/`);
    const firstMembers = http.expectOne(`${base}conversations/12/members/`);
    store.openThread(13);
    http.expectOne((r) => r.url === `${base}conversations/13/messages/`).flush(envelope([chatMessage(1, { conversation: 13 })]));
    http.expectOne(`${base}conversations/13/members/`).flush(envelope([]));
    first.flush(envelope([chatMessage(1)]));
    firstMembers.flush(envelope([]));
    tick(READ_DEBOUNCE_MS);
    http.expectNone(`${base}conversations/12/read/`);
    http.expectNone(`${base}conversations/13/read/`);
    expect(store.current()?.id).toBe(13);
  }));

  it('forgets everything when chat access is lost', () => {
    const store = create(3);
    openDrawerWith(store);
    allowed.set(false);
    TestBed.tick();
    expect(store.drawerOpen()).toBeFalse();
    expect(store.conversations()).toEqual([]);
    expect(store.unreadTotal()).toBe(0);
  });
});
