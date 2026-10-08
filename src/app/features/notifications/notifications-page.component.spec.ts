import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { AppNotification } from '../../core/notifications/notification.model';
import { NotificationCenterService } from '../../core/notifications/notification-center.service';
import { NotificationsPageComponent } from './notifications-page.component';

describe('NotificationsPageComponent', () => {
  const items = signal<AppNotification[]>([
    { id: 2, title: 'Low stock', message: 'Phone X is low', notif_type: 'warning', is_read: false, created_at: '2026-10-09T10:00:00Z', data: {} },
    { id: 1, title: 'Welcome', message: 'Ready', notif_type: 'info', is_read: true, created_at: '2026-10-08T10:00:00Z', data: {} },
  ]);
  const center = {
    items,
    hasUnread: () => true,
    refresh: jasmine.createSpy('refresh'),
    markRead: jasmine.createSpy('markRead'),
    markAllRead: jasmine.createSpy('markAllRead'),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [NotificationsPageComponent],
      providers: [provideTranslateService(), { provide: NotificationCenterService, useValue: center }],
    });
  });

  it('refreshes on open, filters unread, and marks read on click', () => {
    const fixture = TestBed.createComponent(NotificationsPageComponent);
    fixture.detectChanges();
    expect(center.refresh).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Welcome');

    fixture.componentInstance.filter.set('unread');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Welcome');

    (fixture.nativeElement.querySelector('app-notification-item button') as HTMLButtonElement).click();
    expect(center.markRead).toHaveBeenCalledWith(jasmine.objectContaining({ id: 2 }));
    expect(fixture.componentInstance.headerActions().length).toBe(1);
  });
});
