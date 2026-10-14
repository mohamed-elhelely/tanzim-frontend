import { signal } from '@angular/core';
import { Subject, of, throwError } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { HttpTestingController } from '@angular/common/http/testing';
import { envelope, provideApiTesting } from '../../testing/api-testing';
import { AuthService } from '../auth/auth.service';
import { TokenStorageService } from '../auth/token-storage.service';
import { AppNotification } from './notification.model';
import { NotificationCenterService } from './notification-center.service';

/** Stands in for the browser WebSocket so tests can push server messages. */
class FakeSocket {
  static last: FakeSocket | null = null;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: ((event: { code: number }) => void) | null = null;
  closed = false;
  constructor(readonly url: string) {
    FakeSocket.last = this;
  }
  send(): void {}
  close(): void {
    this.closed = true;
  }
  receive(message: unknown): void {
    this.onmessage?.({ data: JSON.stringify(message) });
  }
}

function note(id: number, overrides: Partial<AppNotification> = {}): AppNotification {
  return { id, title: `N${id}`, message: 'm', notif_type: 'info', is_read: false, created_at: '2026-10-09T10:00:00Z', data: {}, ...overrides };
}

describe('NotificationCenterService', () => {
  let httpMock: HttpTestingController;
  let original: typeof WebSocket;
  const user = signal<{ id: string } | null>({ id: '7' });
  let token = 'tok en';
  const auth = {
    user,
    refreshAccessToken: jasmine.createSpy('refreshAccessToken'),
    endSession: jasmine.createSpy('endSession'),
  };

  beforeEach(() => {
    original = window.WebSocket;
    (window as unknown as { WebSocket: unknown }).WebSocket = FakeSocket;
    FakeSocket.last = null;
    user.set({ id: '7' });
    token = 'tok en';
    auth.refreshAccessToken.calls.reset();
    auth.endSession.calls.reset();
    TestBed.configureTestingModule({
      providers: [
        ...provideApiTesting(),
        { provide: AuthService, useValue: auth },
        { provide: TokenStorageService, useValue: { accessToken: () => token } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    window.WebSocket = original;
    httpMock.verify();
  });

  function start(): NotificationCenterService {
    const center = TestBed.inject(NotificationCenterService);
    TestBed.tick();
    center.start();
    httpMock.expectOne('/api/notifications/my-notifications/').flush(envelope([note(2), note(1, { is_read: true })]));
    httpMock.expectOne('/api/notifications/unread-count/').flush(envelope({ unread_count: 1 }));
    return center;
  }

  it('loads the list and count, then opens the socket for this user with the token', () => {
    const center = start();
    expect(center.items().map((n) => n.id)).toEqual([2, 1]);
    expect(center.unread()).toBe(1);
    expect(FakeSocket.last?.url).toContain('notifications/7/?token=tok%20en');
  });

  it('adds pushed notifications on top and counts them', () => {
    const center = start();
    FakeSocket.last?.receive({
      type: 'new_notification',
      notification: { id: 3, title: 'T', message: 'm', notif_type: 'success', created_at: '2026-10-09T11:00:00Z', is_read: false, data: {} },
    });
    expect(center.items()[0]).toEqual(jasmine.objectContaining({ id: 3, notif_type: 'success', created_at: '2026-10-09T11:00:00Z' }));
    expect(center.unread()).toBe(2);
    FakeSocket.last?.receive({ type: 'connection_established', unread_notification: 5 });
    expect(center.unread()).toBe(5);
  });

  it('marks one or all as read', () => {
    const center = start();
    center.markRead(center.items()[0]);
    httpMock.expectOne('/api/notifications/mark-read/2/').flush(envelope({ status: 'success' }));
    expect(center.items()[0].is_read).toBeTrue();
    expect(center.unread()).toBe(0);

    FakeSocket.last?.receive({ type: 'new_notification', notification: note(4) });
    FakeSocket.last?.receive({ type: 'new_notification', notification: note(5) });
    center.markAllRead();
    httpMock.expectOne('/api/notifications/mark-read/5/').flush(envelope({ status: 'success' }));
    httpMock.expectOne('/api/notifications/mark-read/4/').flush(envelope({ status: 'success' }));
    expect(center.items().every((n) => n.is_read)).toBeTrue();
    expect(center.unread()).toBe(0);
  });

  it('passes pushed notifications on, and opens the profile for a change to the own account', () => {
    const center = start();
    const pushed: number[] = [];
    center.incoming$.subscribe((n) => pushed.push(n.id));
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    FakeSocket.last?.receive({
      type: 'new_notification',
      notification: note(8, { data: { event: 'account_change', resource: 'user', action: 'update' } }),
    });
    expect(pushed).toEqual([8]);

    center.open(center.items()[0]);
    httpMock.expectOne('/api/notifications/mark-read/8/').flush(envelope({ status: 'success' }));
    expect(navigate).toHaveBeenCalledWith(['/profile']);

    center.open(note(9, { data: { event: 'account_change', resource: 'role', action: 'update' } }));
    httpMock.expectOne('/api/notifications/mark-read/9/').flush(envelope({ status: 'success' }));
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it('closes the socket and forgets everything when the user signs out', () => {
    const center = start();
    const socket = FakeSocket.last!;
    user.set(null);
    TestBed.tick();
    expect(socket.closed).toBeTrue();
    expect(center.items()).toEqual([]);
    expect(center.unread()).toBe(0);
  });

  it('refreshes the token once and reconnects when the socket refuses it (4001)', () => {
    const refreshed = new Subject<string>();
    auth.refreshAccessToken.and.returnValue(refreshed);
    start();
    const socket = FakeSocket.last!;
    socket.onclose?.({ code: 4001 });
    expect(auth.refreshAccessToken).toHaveBeenCalledTimes(1);

    token = 'new';
    refreshed.next('new');
    expect(FakeSocket.last).not.toBe(socket);
    expect(FakeSocket.last!.url).toContain('token=new');

    // Refused again before ever opening: don't loop.
    FakeSocket.last!.onclose?.({ code: 4001 });
    expect(auth.refreshAccessToken).toHaveBeenCalledTimes(1);
  });

  it('ends the session when the socket refuses the token and the refresh fails', () => {
    auth.refreshAccessToken.and.returnValue(throwError(() => ({ status: 401 })));
    start();
    FakeSocket.last!.onclose?.({ code: 4001 });
    expect(auth.endSession).toHaveBeenCalled();
  });

  it('does not reconnect after a final close (wrong user, 4003)', () => {
    auth.refreshAccessToken.and.returnValue(of('x'));
    jasmine.clock().install();
    try {
      start();
      const socket = FakeSocket.last!;
      socket.onclose?.({ code: 4003 });
      jasmine.clock().tick(70_000);
      expect(FakeSocket.last).toBe(socket);
      expect(auth.refreshAccessToken).not.toHaveBeenCalled();
    } finally {
      jasmine.clock().uninstall();
    }
  });
});
