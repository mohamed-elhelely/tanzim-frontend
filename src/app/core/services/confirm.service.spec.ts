import { TestBed } from '@angular/core/testing';
import { Confirmation, ConfirmationService } from 'primeng/api';
import { of, throwError } from 'rxjs';
import { provideApiTesting } from '../../testing/api-testing';
import { CONFIRM_DIALOG_KEY, ConfirmService } from './confirm.service';
import { NotificationService } from './notification.service';

describe('ConfirmService', () => {
  let service: ConfirmService;
  let notifications: jasmine.SpyObj<NotificationService>;
  let lastConfirmation: Confirmation | undefined;

  beforeEach(() => {
    notifications = jasmine.createSpyObj('NotificationService', ['success', 'error']);
    TestBed.configureTestingModule({
      providers: [...provideApiTesting(), { provide: NotificationService, useValue: notifications }],
    });
    const confirmation = TestBed.inject(ConfirmationService);
    spyOn(confirmation, 'confirm').and.callFake((c: Confirmation) => {
      lastConfirmation = c;
      return confirmation;
    });
    service = TestBed.inject(ConfirmService);
  });

  it('opens the shared dialog and does nothing until accepted', () => {
    const remove = jasmine.createSpy('remove').and.returnValue(of(null));
    service.confirmDelete('Sales', remove, () => undefined);
    expect(lastConfirmation?.key).toBe(CONFIRM_DIALOG_KEY);
    expect(remove).not.toHaveBeenCalled();
  });

  it('deletes, shows success and calls onDeleted after accepting', () => {
    const onDeleted = jasmine.createSpy('onDeleted');
    service.confirmDelete('Sales', () => of(null), onDeleted);
    lastConfirmation?.accept?.();
    expect(notifications.success).toHaveBeenCalled();
    expect(onDeleted).toHaveBeenCalled();
  });

  it('shows the backend message for a 4xx, but not for 5xx (the interceptor already did)', () => {
    service.confirmDelete('Sales', () => throwError(() => ({ status: 400, message: 'In use', errors: {} })), () => undefined);
    lastConfirmation?.accept?.();
    expect(notifications.error).toHaveBeenCalledWith('In use');

    notifications.error.calls.reset();
    service.confirmDelete('Sales', () => throwError(() => ({ status: 500, message: 'Boom', errors: {} })), () => undefined);
    lastConfirmation?.accept?.();
    expect(notifications.error).not.toHaveBeenCalled();
  });

  it('runs a workflow action after accepting, then toasts and hands over the result', () => {
    const onDone = jasmine.createSpy('onDone');
    const run = jasmine.createSpy('run').and.returnValue(of({ id: 1, status: 'confirmed' }));
    service.confirmAction({ message: 'sales.confirm.confirmOrder', accept: 'sales.actions.confirmOrder', success: 'sales.toasts.confirmed', run, onDone });
    expect(run).not.toHaveBeenCalled();
    expect(lastConfirmation?.acceptButtonStyleClass).toBeUndefined();
    lastConfirmation?.accept?.();
    expect(notifications.success).toHaveBeenCalledWith('sales.toasts.confirmed');
    expect(onDone).toHaveBeenCalledWith({ id: 1, status: 'confirmed' });
  });

  it('shows the backend message when a workflow action is refused', () => {
    const onDone = jasmine.createSpy('onDone');
    service.runAction(() => throwError(() => ({ status: 400, message: 'Order exceeds customer credit limit', errors: {} })), 'x', onDone);
    expect(notifications.error).toHaveBeenCalledWith('Order exceeds customer credit limit');
    expect(onDone).not.toHaveBeenCalled();
  });
});
