import { TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { provideApiTesting } from '../../testing/api-testing';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let messages: jasmine.Spy;
  let notifications: NotificationService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: provideApiTesting() });
    messages = spyOn(TestBed.inject(MessageService), 'add');
    notifications = TestBed.inject(NotificationService);
  });

  it('adds the support code to a failed request, and keeps it on screen longer', () => {
    notifications.failure({ status: 500, message: 'Boom', errors: {}, requestId: 'c1f0' }, 'Server error');
    expect(messages).toHaveBeenCalledWith(
      jasmine.objectContaining({ severity: 'error', detail: 'Server error\nerrors.supportCode', life: 10000 }),
    );
  });

  it('shows the message alone when the response had no request id', () => {
    notifications.failure({ status: 400, message: 'Out of stock', errors: {} });
    expect(messages).toHaveBeenCalledWith(jasmine.objectContaining({ detail: 'Out of stock', life: 4000 }));
  });
});
