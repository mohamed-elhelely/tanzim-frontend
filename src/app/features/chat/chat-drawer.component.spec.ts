import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { provideApiTesting } from '../../testing/api-testing';
import { ME, chatMessage, conversation } from '../../testing/chat-fixtures';
import { AccessService } from '../../core/auth/access.service';
import { ChatApiService } from '../../core/chat/chat-api.service';
import { ChatThread } from '../../core/chat/chat-thread';
import { ChatStore } from '../../core/chat/chat.store';
import { TypingTracker } from '../../core/chat/typing-tracker';
import { Conversation } from '../../core/chat/chat.models';
import { ChatThreadComponent } from './chat-thread.component';
import { ChatDrawerComponent } from './chat-drawer.component';

describe('ChatDrawerComponent thread switching', () => {
  it('gives a newly opened chat fresh thread state', () => {
    const api = jasmine.createSpyObj<ChatApiService>('ChatApiService', ['messages', 'members']);
    api.messages.and.returnValue(of([chatMessage(1, { body: 'theirs' })]));
    api.members.and.returnValue(of([]));
    const make = (id: number) => {
      const t = new ChatThread(id, { api, me: () => ME, sent: () => undefined, gone: () => undefined, refused: () => undefined, loaded: () => undefined, fail: () => undefined });
      t.load();
      return t;
    };
    const thread = signal<ChatThread | null>(make(12));
    const store = {
      drawerOpen: signal(true),
      thread,
      current: signal<Conversation | null>(conversation(12)),
      myId: signal(7),
      typing: new TypingTracker(),
      typed: () => undefined,
      closeDrawer: () => undefined,
      backToList: () => undefined,
    };
    TestBed.configureTestingModule({
      imports: [ChatDrawerComponent],
      providers: [...provideApiTesting(), provideAnimations(), { provide: ChatStore, useValue: store }, { provide: AccessService, useValue: { can: () => false } }],
    });
    const fixture = TestBed.createComponent(ChatDrawerComponent);
    fixture.detectChanges();
    const first = fixture.debugElement.query((d) => d.componentInstance instanceof ChatThreadComponent).componentInstance as ChatThreadComponent;
    first.startReply(first.thread().items()[0]);
    expect(first.replyTo()).not.toBeNull();

    thread.set(null);
    thread.set(make(13));
    fixture.detectChanges();
    const second = fixture.debugElement.query((d) => d.componentInstance instanceof ChatThreadComponent).componentInstance as ChatThreadComponent;
    expect(second).not.toBe(first);
    expect(second.replyTo()).toBeNull();
  });
});
