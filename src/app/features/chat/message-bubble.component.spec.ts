import { TestBed } from '@angular/core/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideApiTesting } from '../../testing/api-testing';
import { ME, chatMessage, chatUser, sentItem } from '../../testing/chat-fixtures';
import { ThreadItem } from '../../core/chat/chat.models';
import { MessageBubbleComponent } from './message-bubble.component';

describe('MessageBubbleComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [MessageBubbleComponent], providers: [...provideApiTesting(), provideAnimations()] });
  });

  function render(item: ThreadItem, inputs: Record<string, unknown> = {}) {
    const fixture = TestBed.createComponent(MessageBubbleComponent);
    fixture.componentRef.setInput('item', item);
    fixture.componentRef.setInput('nameOf', (id: number) => (id === 51 ? 'Omar Nasr' : undefined));
    for (const [key, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(key, value);
    }
    fixture.detectChanges();
    return fixture;
  }

  it('renders mentions as names and @all highlighted', () => {
    const el: HTMLElement = render(sentItem(chatMessage(1, { body: '@[51] and @all and @[99]' }))).nativeElement;
    const mentions = [...el.querySelectorAll('[data-test=mention]')].map((m) => m.textContent?.trim());
    expect(mentions).toEqual(['@Omar Nasr', '@all', '@chat.someone']);
  });

  it('shows the sender only on the first message of a group, never on mine', () => {
    expect(render(sentItem(chatMessage(1)), { first: true }).nativeElement.textContent).toContain('Sara Ali');
    expect(render(sentItem(chatMessage(1)), { first: false }).nativeElement.textContent).not.toContain('Sara Ali');
    expect(render(sentItem(chatMessage(1, { sender: ME })), { first: true, mine: true }).nativeElement.textContent).not.toContain('Me Myself');
  });

  it('shows deleted, edited and former-colleague states', () => {
    expect(render(sentItem(chatMessage(1, { is_deleted: true, body: '' }))).nativeElement.textContent).toContain('chat.deleted');
    expect(render(sentItem(chatMessage(1, { edited_at: '2026-10-15T10:00:00Z' }))).nativeElement.textContent).toContain('chat.edited');
    expect(render(sentItem(chatMessage(1, { sender: chatUser(45, 'Sara Ali', false) })), { first: true }).nativeElement.textContent).toContain('chat.leftCompany');
  });

  it('shows the reply preview and jumps to it', () => {
    const fixture = render(sentItem(chatMessage(2, { reply_to: { id: 1, sender: chatUser(51, 'Omar Nasr'), body: 'When?', is_deleted: false } })));
    let jumped = 0;
    fixture.componentInstance.jump.subscribe((id: number) => (jumped = id));
    const quote = fixture.nativeElement.querySelector('[data-test=reply-preview]');
    expect(quote.textContent).toContain('When?');
    quote.click();
    expect(jumped).toBe(1);
  });

  it('offers Retry and Remove on a failed send', () => {
    const item: ThreadItem = { message: chatMessage(0, { sender: ME, client_id: 'c1' }), status: 'failed', retryable: true, draft: { body: 'x', replyTo: null, files: [], clientId: 'c1' } };
    const fixture = render(item, { mine: true });
    let retried = '';
    fixture.componentInstance.retry.subscribe((id: string) => (retried = id));
    fixture.nativeElement.querySelector('[data-test=retry]').click();
    expect(retried).toBe('c1');
    const refused: ThreadItem = { ...item, retryable: false, error: 'You cannot post in this chat.' };
    const el: HTMLElement = render(refused, { mine: true }).nativeElement;
    expect(el.textContent).toContain('You cannot post in this chat.');
    expect(el.querySelector('[data-test=retry]')).toBeNull();
    expect(el.querySelector('[data-test=discard]')).not.toBeNull();
  });

  it('builds the menu from what is allowed', () => {
    const fixture = render(sentItem(chatMessage(1)), { canEdit: false, canDelete: true });
    const labels = fixture.componentInstance.menuItems().map((m) => m.label);
    expect(labels).toEqual(['chat.reply', 'chat.copy', 'chat.delete']);
  });
});
