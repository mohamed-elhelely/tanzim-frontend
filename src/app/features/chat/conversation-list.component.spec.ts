import { signal } from '@angular/core';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideApiTesting } from '../../testing/api-testing';
import { chatMessage, chatUser, conversation } from '../../testing/chat-fixtures';
import { ChatStore } from '../../core/chat/chat.store';
import { LanguageService } from '../../core/services/language.service';
import { ConversationListComponent } from './conversation-list.component';

describe('ConversationListComponent', () => {
  const list = signal([
    conversation(12, { unread_count: 2, last_message: chatMessage(5, { body: 'Count at 3' }), last_message_at: '2026-10-15T09:00:00+03:00' }),
    conversation(13, { kind: 'direct', other_user: chatUser(45, 'Sara Ali', false) }),
    conversation(14, { kind: 'company', name_en: 'Acme' }),
  ]);
  const store = {
    conversations: list,
    listLoading: signal(false),
    listLoaded: signal(true),
    myId: signal(7),
    openThread: jasmine.createSpy('openThread'),
  };
  const lang = signal<'en' | 'ar'>('en');

  beforeEach(() => {
    store.openThread.calls.reset();
    TestBed.configureTestingModule({
      imports: [ConversationListComponent],
      providers: [
        ...provideApiTesting(),
        provideAnimations(),
        { provide: ChatStore, useValue: store },
        { provide: LanguageService, useValue: { currentLang: lang, direction: signal('ltr') } },
      ],
    });
  });

  function render() {
    const fixture = TestBed.createComponent(ConversationListComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('shows titles, previews, unread badges and the left-company tag', () => {
    const text = render().nativeElement.textContent as string;
    expect(text).toContain('Chat 12');
    expect(text).toContain('Count at 3');
    expect(text).toContain('Sara Ali');
    expect(text).toContain('chat.leftCompany');
    expect(text).toContain('Acme');
    expect(render().nativeElement.querySelector('[data-test=unread-12]').textContent.trim()).toBe('2');
  });

  it('filters by title after the debounce', fakeAsync(() => {
    const fixture = render();
    fixture.componentInstance.search.set('sara');
    fixture.detectChanges(); // flushes the toObservable effect
    tick(300);
    fixture.detectChanges();
    const rows = fixture.nativeElement.querySelectorAll('[data-test=conversation]');
    expect(rows.length).toBe(1);
  }));

  it('opens a chat on click', () => {
    const fixture = render();
    fixture.nativeElement.querySelector('[data-test=conversation]').click();
    expect(store.openThread).toHaveBeenCalledWith(12);
  });
});
