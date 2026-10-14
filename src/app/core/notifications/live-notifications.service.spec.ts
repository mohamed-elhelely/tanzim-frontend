import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { provideApiTesting } from '../../testing/api-testing';
import { AccessService } from '../auth/access.service';
import { AuthService } from '../auth/auth.service';
import { NotificationService } from '../services/notification.service';
import { ACCESS_RELOAD_DEBOUNCE_MS, LiveNotificationsService, SIGN_OUT_DELAY_MS } from './live-notifications.service';
import { AccountChangeData, AppNotification } from './notification.model';
import { NotificationCenterService } from './notification-center.service';

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

  beforeEach(() => {
    incoming = new Subject<AppNotification>();
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
    expect(reload).not.toHaveBeenCalled();
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
});
