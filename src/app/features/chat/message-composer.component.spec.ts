import { TestBed } from '@angular/core/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideApiTesting } from '../../testing/api-testing';
import { chatMember, chatMessage, conversation } from '../../testing/chat-fixtures';
import { NotificationService } from '../../core/services/notification.service';
import { MessageComposerComponent } from './message-composer.component';

describe('MessageComposerComponent', () => {
  let toast: jasmine.SpyObj<NotificationService>;

  beforeEach(() => {
    toast = jasmine.createSpyObj<NotificationService>('NotificationService', ['warn', 'success', 'error', 'info', 'failure']);
    TestBed.configureTestingModule({
      imports: [MessageComposerComponent],
      providers: [...provideApiTesting(), provideAnimations(), { provide: NotificationService, useValue: toast }],
    });
  });

  function render(inputs: Record<string, unknown> = {}) {
    const fixture = TestBed.createComponent(MessageComposerComponent);
    fixture.componentRef.setInput('conversation', conversation(12, { members_count: 30 }));
    fixture.componentRef.setInput('members', [chatMember(7, 'Me Myself'), chatMember(51, 'Omar Nasr'), chatMember(52, 'Omar Adel')]);
    fixture.componentRef.setInput('myId', 7);
    fixture.componentRef.setInput('nameOf', (id: number) => ({ 51: 'Omar Nasr', 52: 'Omar Adel' })[id]);
    for (const [key, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(key, value);
    }
    fixture.detectChanges();
    // The editing effect sets the text during the first pass; the second renders it.
    fixture.detectChanges();
    return fixture;
  }

  function type(fixture: ReturnType<typeof render>, text: string): HTMLTextAreaElement {
    const box: HTMLTextAreaElement = fixture.nativeElement.querySelector('textarea');
    box.value = text;
    box.setSelectionRange(text.length, text.length);
    box.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    return box;
  }

  it('sends on Enter, adds a line on Shift+Enter', () => {
    const fixture = render();
    const sent: unknown[] = [];
    fixture.componentInstance.send.subscribe((v) => sent.push(v));
    const box = type(fixture, '  hello  ');
    box.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true }));
    expect(sent).toEqual([]);
    box.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(sent).toEqual([{ body: 'hello', files: [] }]);
    expect(box.value).toBe('');
  });

  it('emits typed on input', () => {
    const fixture = render();
    let typed = 0;
    fixture.componentInstance.typed.subscribe(() => typed++);
    type(fixture, 'h');
    expect(typed).toBe(1);
  });

  it('picks a mention and sends it as @[id]', () => {
    const fixture = render();
    const sent: { body: string }[] = [];
    fixture.componentInstance.send.subscribe((v) => sent.push(v));
    type(fixture, 'hi @Om');
    const names = fixture.componentInstance.candidates().map((c) => c.label);
    expect(names).toEqual(['Omar Nasr', 'Omar Adel']);
    fixture.componentInstance.pickMention(fixture.componentInstance.candidates()[0]);
    fixture.detectChanges();
    const box: HTMLTextAreaElement = fixture.nativeElement.querySelector('textarea');
    expect(box.value).toBe('hi @Omar Nasr ');
    box.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(sent[0].body).toBe('hi @[51]');
  });

  it('offers @all only when allowed', () => {
    const fixture = render();
    type(fixture, '@a');
    expect(fixture.componentInstance.candidates().some((c) => c.id === 'all')).toBeFalse();
    const admin = render({ moderator: true });
    type(admin, '@a');
    expect(admin.componentInstance.candidates().some((c) => c.id === 'all')).toBeTrue();
  });

  it('rejects files that break the rules and names them', () => {
    const fixture = render();
    fixture.componentInstance.addFiles([new File(['x'], 'a.pdf'), new File(['x'], 'x.exe')]);
    expect(fixture.componentInstance.files().map((f) => f.name)).toEqual(['a.pdf']);
    expect(toast.warn).toHaveBeenCalled();
  });

  it('blocks bodies over 4000 characters and shows the counter from 3800', () => {
    const fixture = render();
    const sent: unknown[] = [];
    fixture.componentInstance.send.subscribe((v) => sent.push(v));
    const box = type(fixture, 'x'.repeat(4001));
    expect(fixture.nativeElement.textContent).toContain('4001/4000');
    box.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(sent).toEqual([]);
  });

  it('edits a message with its mentions decoded, Esc cancels', () => {
    const fixture = render({ editing: chatMessage(9, { body: '@[51] at 3' }) });
    const box: HTMLTextAreaElement = fixture.nativeElement.querySelector('textarea');
    expect(box.value).toBe('@Omar Nasr at 3');
    const saved: unknown[] = [];
    fixture.componentInstance.saveEdit.subscribe((v) => saved.push(v));
    let cancelled = 0;
    fixture.componentInstance.cancelEdit.subscribe(() => cancelled++);
    type(fixture, '@Omar Nasr at 4');
    box.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(saved).toEqual([{ id: 9, body: '@[51] at 4' }]);
    box.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(cancelled).toBe(1);
  });
});
