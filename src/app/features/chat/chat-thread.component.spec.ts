import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { provideApiTesting } from '../../testing/api-testing';
import { ME, chatMember, chatMessage, conversation } from '../../testing/chat-fixtures';
import { AccessService } from '../../core/auth/access.service';
import { ChatApiService } from '../../core/chat/chat-api.service';
import { ChatThread } from '../../core/chat/chat-thread';
import { ChatStore } from '../../core/chat/chat.store';
import { TypingTracker } from '../../core/chat/typing-tracker';
import { Conversation } from '../../core/chat/chat.models';
import { ChatThreadComponent } from './chat-thread.component';

describe('ChatThreadComponent', () => {
  const current = signal<Conversation | null>(conversation(12));
  const typing = new TypingTracker();
  const store = { current, myId: signal(7), typing, typed: jasmine.createSpy('typed') };
  let api: jasmine.SpyObj<ChatApiService>;

  beforeEach(() => {
    current.set(conversation(12));
    typing.reset();
    api = jasmine.createSpyObj<ChatApiService>('ChatApiService', ['messages', 'members', 'send', 'edit', 'remove', 'attachment']);
    const now = Date.now();
    api.messages.and.returnValue(of([
      chatMessage(2, { sender: ME, body: 'mine', created_at: new Date(now).toISOString() }),
      chatMessage(1, { body: 'theirs', created_at: new Date(now - 60000).toISOString() }),
    ]));
    api.members.and.returnValue(of([chatMember(45, 'Sara Ali'), chatMember(7, 'Me Myself')]));
    TestBed.configureTestingModule({
      imports: [ChatThreadComponent],
      providers: [
        ...provideApiTesting(),
        provideAnimations(),
        { provide: ChatStore, useValue: store },
        { provide: AccessService, useValue: { can: () => false } },
      ],
    });
  });

  function render() {
    const thread = new ChatThread(12, { api, me: () => ME, sent: () => undefined, gone: () => undefined, refused: () => undefined, loaded: () => undefined, fail: () => undefined });
    thread.load();
    const fixture = TestBed.createComponent(ChatThreadComponent);
    fixture.componentRef.setInput('thread', thread);
    fixture.detectChanges();
    return { fixture, thread };
  }

  it('renders the messages oldest first with a day separator', () => {
    const el: HTMLElement = render().fixture.nativeElement;
    const text = el.textContent ?? '';
    expect(text.indexOf('theirs')).toBeLessThan(text.indexOf('mine'));
    expect(el.querySelectorAll('[data-test=day]').length).toBe(1);
  });

  it('lets me edit my message and delete only mine as a member', () => {
    const { fixture } = render();
    const bubbles = fixture.debugElement.queryAll((d) => d.name === 'app-message-bubble');
    const theirs = bubbles[0].componentInstance;
    const mine = bubbles[1].componentInstance;
    expect(mine.canEdit()).toBeTrue();
    expect(mine.canDelete()).toBeTrue();
    expect(theirs.canEdit()).toBeFalse();
    expect(theirs.canDelete()).toBeFalse();
  });

  it('chat admins may delete anyone’s message', () => {
    current.set(conversation(12, { my_role: 'admin' }));
    const { fixture } = render();
    const theirs = fixture.debugElement.queryAll((d) => d.name === 'app-message-bubble')[0].componentInstance;
    expect(theirs.canDelete()).toBeTrue();
  });

  it('shows the read-only note instead of the composer', () => {
    current.set(conversation(12, { can_post: false, posting_policy: 'admins_only' }));
    const el: HTMLElement = render().fixture.nativeElement;
    expect(el.querySelector('app-message-composer')).toBeNull();
    expect(el.textContent).toContain('chat.note.adminsOnly');
  });

  it('shows who is typing', () => {
    const { fixture } = render();
    typing.add(12, 45);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('chat.typingOne');
  });

  it('sends through the thread with the reply it was answering', () => {
    const { fixture, thread } = render();
    spyOn(thread, 'send');
    fixture.componentInstance.startReply(thread.items()[0]);
    fixture.componentInstance.onSend({ body: 'ok', files: [] });
    expect(thread.send).toHaveBeenCalledWith('ok', jasmine.objectContaining({ id: 1 }), []);
    expect(fixture.componentInstance.replyTo()).toBeNull();
  });
});
