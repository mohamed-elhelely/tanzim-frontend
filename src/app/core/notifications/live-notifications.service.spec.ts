import { signal } from '@angular/core';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { provideApiTesting } from '../../testing/api-testing';
import { AccessService } from '../auth/access.service';
import { AuthService } from '../auth/auth.service';
import { ChatStore } from '../chat/chat.store';
import { LanguageService } from '../services/language.service';
import { NotificationService } from '../services/notification.service';
import { ACCESS_RELOAD_DEBOUNCE_MS, LiveNotificationsService, SIGN_OUT_DELAY_MS } from './live-notifications.service';
import { AccountChangeData, AppNotification, notificationText } from './notification.model';
import { NotificationCenterService } from './notification-center.service';
import { NotificationSoundService } from './notification-sound.service';

function note(id: number, overrides: Partial<AppNotification> = {}): AppNotification {
  return { id, title: `N${id}`, message: 'm', notif_type: 'info', is_read: false, created_at: '2026-10-15T10:00:00Z', data: {}, ...overrides };
}

function change(id: number, resource: AccountChangeData['resource'], action: AccountChangeData['action'], title = `T${id}`): AppNotification {
  const data: AccountChangeData = { event: 'account_change', resource, action, object_id: '42', changed_by: 'Mona Adel', audit_log_id: id };
  return note(id, { title, data: data as unknown as Record<string, unknown> });
}

describe('LiveNotificationsService', () => {
  let incoming: Subject<AppNotification>;
  let reload: jasmine.Spy;
  let can: jasmine.Spy;
  let endSession: jasmine.Spy;
  let navigate: jasmine.Spy;
  let toast: jasmine.SpyObj<NotificationService>;
  const lang = signal<'en' | 'ar'>('en');
  let play: jasmine.Spy;
  let isOpen: jasmine.Spy;

  beforeEach(() => {
    incoming = new Subject<AppNotification>();
    lang.set('en');
    play = jasmine.createSpy('play');
    isOpen = jasmine.createSpy('isOpen').and.callFake((id: number) => id === 12);
    reload = jasmine.createSpy('reload').and.callFake((then?: () => void) => then?.());
    can = jasmine.createSpy('can').and.returnValue(true);
    endSession = jasmine.createSpy('endSession');
    toast = jasmine.createSpyObj<NotificationService>('NotificationService', ['notify', 'warn']);
    TestBed.configureTestingModule({
      providers: [
        ...provideApiTesting(),
        { provide: NotificationCenterService, useValue: { incoming$: incoming.asObservable() } },
        { provide: AccessService, useValue: { reload, can } },
        { provide: AuthService, useValue: { user: () => ({ id: '7' }), endSession } },
        { provide: NotificationService, useValue: toast },
        { provide: LanguageService, useValue: { currentLang: lang } },
        { provide: NotificationSoundService, useValue: { play } },
        { provide: ChatStore, useValue: { isOpen } },
      ],
    });
    const router = TestBed.inject(Router);
    // The open page needs view_team.
    spyOnProperty(router, 'routerState').and.returnValue({
      snapshot: { root: { data: {}, firstChild: { data: { permission: 'view_team' }, firstChild: null } } },
    } as never);
    navigate = spyOn(router, 'navigate').and.resolveTo(true);
    TestBed.inject(LiveNotificationsService).start();
  });

  it('shows a toast with the title and message of an ordinary notification', () => {
    incoming.next(note(1, { title: 'Order shipped', message: 'SO-12 left the warehouse.', notif_type: 'warning' }));
    expect(toast.notify).toHaveBeenCalledWith('warn', 'Order shipped', 'SO-12 left the warehouse.');
    expect(play).toHaveBeenCalledWith('alert');
    incoming.next(note(2));
    expect(play).toHaveBeenCalledWith('normal');
    expect(reload).not.toHaveBeenCalled();
  });

  it('stays quiet for a chat bell of the chat being read, not for other chats', () => {
    incoming.next(note(1, { data: { kind: 'chat', conversation_id: 12 } }));
    expect(play).not.toHaveBeenCalled();
    expect(toast.notify).not.toHaveBeenCalled();
    incoming.next(note(2, { title: 'Sara Ali', message: 'hi', data: { kind: 'chat', conversation_id: 13 } }));
    expect(play).toHaveBeenCalledWith('normal');
    expect(toast.notify).toHaveBeenCalledWith('info', 'Sara Ali', 'hi');
  });

  it('fetches /me once after a burst of access changes, and stays when the page is still allowed', fakeAsync(() => {
    incoming.next(change(1, 'role', 'update'));
    incoming.next(change(2, 'role', 'update'));
    tick(ACCESS_RELOAD_DEBOUNCE_MS - 1);
    incoming.next(change(3, 'permissiongroup', 'update'));
    tick(ACCESS_RELOAD_DEBOUNCE_MS);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(can).toHaveBeenCalledWith('view_team');
    expect(navigate).not.toHaveBeenCalled();
  }));

  it('goes back to the dashboard when the open page is no longer allowed', fakeAsync(() => {
    can.and.returnValue(false);
    incoming.next(change(1, 'companyuser', 'update', 'Your access was updated'));
    tick(ACCESS_RELOAD_DEBOUNCE_MS);
    expect(toast.warn).toHaveBeenCalledWith('notifications.accessLost');
    expect(navigate).toHaveBeenCalledWith(['/dashboard']);
  }));

  it('signs out after the message when removed from the company', fakeAsync(() => {
    incoming.next(change(1, 'companyuser', 'delete', 'Removed from company'));
    expect(toast.notify).toHaveBeenCalledWith('error', 'Removed from company', 'm', { life: SIGN_OUT_DELAY_MS });
    expect(play).toHaveBeenCalledWith('alert');
    tick(SIGN_OUT_DELAY_MS - 1);
    expect(endSession).not.toHaveBeenCalled();
    tick(1);
    expect(endSession).toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  }));

  it('keeps a password change on screen and does not refetch access for profile changes', fakeAsync(() => {
    incoming.next(change(1, 'user', 'password_change', 'Password changed'));
    expect(toast.notify).toHaveBeenCalledWith('warn', 'Password changed', 'm', { sticky: true });
    incoming.next(change(2, 'user', 'update', 'Account updated'));
    expect(toast.notify).toHaveBeenCalledWith('info', 'Account updated', 'm', { sticky: false });
    tick(ACCESS_RELOAD_DEBOUNCE_MS);
    expect(reload).not.toHaveBeenCalled();
  }));

  it('shows the Arabic title and message when the interface is in Arabic', () => {
    lang.set('ar');
    incoming.next(note(1, { title: 'Order shipped', message: 'SO-12 left.', title_ar: 'تم شحن الطلب', message_ar: 'خرج SO-12.' }));
    expect(toast.notify).toHaveBeenCalledWith('info', 'تم شحن الطلب', 'خرج SO-12.');
  });
});

describe('notificationText', () => {
  const item = note(1, { title: 'Password changed', message: 'Your password was changed.', title_ar: 'تم تغيير كلمة المرور', message_ar: null });

  it('uses the Arabic text in Arabic and falls back to the default text where there is none', () => {
    expect(notificationText(item, 'ar')).toEqual({ title: 'تم تغيير كلمة المرور', message: 'Your password was changed.' });
    expect(notificationText(item, 'en')).toEqual({ title: 'Password changed', message: 'Your password was changed.' });
  });
});
