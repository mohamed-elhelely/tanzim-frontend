import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideApiTesting } from '../../testing/api-testing';
import { ChatStore } from '../../core/chat/chat.store';
import { AppHeaderComponent } from './header.component';

describe('AppHeaderComponent chat button', () => {
  const enabled = signal(true);
  const store = { enabled, unreadTotal: signal(4), drawerOpen: signal(false), toggleDrawer: jasmine.createSpy('toggleDrawer'), openDrawer: jasmine.createSpy('openDrawer') };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AppHeaderComponent],
      providers: [...provideApiTesting(), provideAnimations(), { provide: ChatStore, useValue: store }],
    });
  });

  it('shows the chat button with the unread badge and toggles the drawer', () => {
    enabled.set(true);
    const fixture = TestBed.createComponent(AppHeaderComponent);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('[data-test=chat-button]');
    expect(button.textContent).toContain('4');
    button.click();
    expect(store.toggleDrawer).toHaveBeenCalled();
  });

  it('hides the chat button without chat access', () => {
    enabled.set(false);
    const fixture = TestBed.createComponent(AppHeaderComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-test=chat-button]')).toBeNull();
  });

  it('opens the chat a chat bell points at', () => {
    const fixture = TestBed.createComponent(AppHeaderComponent);
    const popover = { hide: jasmine.createSpy('hide') };
    fixture.componentInstance.openNotification(
      { id: 1, title: 't', message: 'm', notif_type: 'info', is_read: true, created_at: '', data: { kind: 'chat', event: 'message', conversation_id: 12 } },
      popover as never,
    );
    expect(store.openDrawer).toHaveBeenCalledWith(12);
    expect(popover.hide).toHaveBeenCalled();
  });
});
