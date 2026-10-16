import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, input, output, signal, untracked, viewChild } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { NameOf, checkFiles, formatSize, plainBody } from '../../core/chat/chat-format';
import { canMentionAll } from '../../core/chat/chat-rules';
import { CHAT_LIMITS, ChatMember, ChatMessage, Conversation, ReplyPreview } from '../../core/chat/chat.models';
import { NotificationService } from '../../core/services/notification.service';
import { MentionToken, decodeMentions, encodeMentions, mentionQuery } from './mention-tokens';

interface Candidate {
  id: number | 'all';
  label: string;
}

/**
 * The text box: Enter sends (Shift+Enter, or Enter on touch screens, adds a line), `@` picks a member, files are
 * checked before upload. Edit mode reuses it with the message's text; Esc cancels.
 */
@Component({
  selector: 'app-message-composer',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block border-t border-gray-200 p-2 dark:border-gray-800' },
  template: `
    @if (editing()) {
      <div class="mb-1 flex items-center gap-2 rounded-lg bg-gray-50 px-2 py-1 text-xs dark:bg-gray-800">
        <i class="pi pi-pencil text-primary-600"></i>
        <span class="flex-1 font-semibold">{{ 'chat.editing' | translate }}</span>
        <button type="button" class="text-gray-500" [attr.aria-label]="'chat.cancel' | translate" (click)="cancelEdit.emit()"><i class="pi pi-times"></i></button>
      </div>
    } @else if (replyTo(); as reply) {
      <div class="mb-1 flex items-center gap-2 rounded-lg bg-gray-50 px-2 py-1 text-xs dark:bg-gray-800">
        <i class="pi pi-reply text-primary-600"></i>
        <span class="min-w-0 flex-1">
          <span class="block font-semibold">{{ 'chat.replyingTo' | translate: { name: reply.sender?.name ?? '' } }}</span>
          <span class="block truncate text-gray-500">{{ replyText() }}</span>
        </span>
        <button type="button" class="text-gray-500" [attr.aria-label]="'chat.cancel' | translate" (click)="cancelReply.emit()"><i class="pi pi-times"></i></button>
      </div>
    }

    @if (files().length) {
      <div class="mb-1 flex flex-wrap gap-1">
        @for (file of files(); track $index) {
          <span class="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs dark:bg-gray-800">
            <i class="pi pi-file"></i>{{ file.name }} <span class="text-gray-500">{{ size(file.size) }}</span>
            <button type="button" [attr.aria-label]="'chat.removeFile' | translate" (click)="removeFile($index)"><i class="pi pi-times text-[10px]"></i></button>
          </span>
        }
      </div>
    }

    @if (mention() && candidates().length) {
      <ul class="mb-1 max-h-40 overflow-y-auto rounded-lg border border-gray-200 bg-white text-sm shadow dark:border-gray-700 dark:bg-gray-900" role="listbox">
        @for (candidate of candidates(); track candidate.id) {
          <li>
            <button type="button" class="w-full px-3 py-1.5 text-start hover:bg-gray-100 dark:hover:bg-gray-800" (mousedown)="$event.preventDefault()" (click)="pickMention(candidate)">
              {{ candidate.id === 'all' ? '@all · ' + ('chat.mentionAll' | translate) : candidate.label }}
            </button>
          </li>
        }
      </ul>
    }

    <div class="flex items-end gap-1">
      @if (!editing()) {
        <label class="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800" [title]="'chat.fileRules' | translate">
          <i class="pi pi-paperclip"></i>
          <span class="sr-only">{{ 'chat.attach' | translate }}</span>
          <input type="file" multiple class="hidden" [attr.accept]="accept" (change)="onFiles($event)" />
        </label>
      }
      <textarea
        #box
        rows="1"
        class="[field-sizing:content] max-h-32 min-h-9 flex-1 resize-none rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary-500 dark:border-gray-700 dark:bg-gray-900"
        [placeholder]="'chat.placeholder' | translate"
        [attr.aria-label]="'chat.placeholder' | translate"
        [value]="text()"
        (input)="onInput()"
        (keydown)="onKeydown($event)"
        (click)="updateMention()"
      ></textarea>
      <button
        type="button"
        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-600 text-white disabled:opacity-40"
        [disabled]="!canSubmit()"
        [attr.aria-label]="'chat.send' | translate"
        (click)="submit()"
      >
        <i class="pi" [class.pi-send]="!editing()" [class.pi-check]="editing()"></i>
      </button>
    </div>
    @if (length() >= limits.counterFrom) {
      <p class="mt-0.5 text-end text-[10px]" [class.text-red-600]="length() > limits.bodyMax">{{ length() }}/{{ limits.bodyMax }}</p>
    }
  `,
})
export class MessageComposerComponent {
  readonly conversation = input.required<Conversation>();
  readonly nameOf = input.required<NameOf>();
  readonly members = input<ChatMember[]>([]);
  readonly myId = input(0);
  readonly moderator = input(false);
  readonly replyTo = input<ReplyPreview | null>(null);
  readonly editing = input<ChatMessage | null>(null);

  readonly send = output<{ body: string; files: File[] }>();
  readonly saveEdit = output<{ id: number; body: string }>();
  readonly cancelReply = output<void>();
  readonly cancelEdit = output<void>();
  readonly typed = output<void>();

  private readonly toast = inject(NotificationService);
  private readonly translate = inject(TranslateService);
  private readonly box = viewChild<ElementRef<HTMLTextAreaElement>>('box');

  readonly limits = CHAT_LIMITS;
  readonly accept = CHAT_LIMITS.extensions.map((ext) => `.${ext}`).join(',');
  readonly text = signal('');
  readonly files = signal<File[]>([]);
  readonly mention = signal<{ start: number; query: string } | null>(null);
  private tokens: MentionToken[] = [];

  readonly body = computed(() => encodeMentions(this.text().trim(), this.tokens));
  readonly length = computed(() => this.text().trim().length);
  readonly canSubmit = computed(() => this.length() <= CHAT_LIMITS.bodyMax && (this.length() > 0 || this.files().length > 0));
  readonly replyText = computed(() => plainBody(this.replyTo()?.body ?? '', this.nameOf(), this.translate.instant('chat.someone')));

  readonly candidates = computed<Candidate[]>(() => {
    const mention = this.mention();
    if (!mention) {
      return [];
    }
    const query = mention.query.toLowerCase();
    const people: Candidate[] = this.members()
      .filter((m) => m.user.id !== this.myId() && m.user.is_active && m.user.name.toLowerCase().includes(query))
      .map((m) => ({ id: m.user.id, label: m.user.name }));
    const all: Candidate[] = canMentionAll(this.conversation(), this.moderator()) && 'all'.startsWith(query) ? [{ id: 'all', label: 'all' }] : [];
    return [...all, ...people].slice(0, 8);
  });

  constructor() {
    // Entering edit mode loads the message's text, mentions shown as names.
    effect(() => {
      const editing = this.editing();
      untracked(() => {
        if (editing) {
          const decoded = decodeMentions(editing.body, this.nameOf());
          this.tokens = decoded.tokens;
          this.text.set(decoded.text);
          this.files.set([]);
          queueMicrotask(() => this.box()?.nativeElement.focus());
        } else {
          this.reset();
        }
      });
    });
  }

  size(bytes: number): string {
    return formatSize(bytes);
  }

  onInput(): void {
    this.text.set(this.box()!.nativeElement.value);
    this.updateMention();
    this.typed.emit();
  }

  updateMention(): void {
    const el = this.box()!.nativeElement;
    this.mention.set(mentionQuery(el.value, el.selectionStart ?? el.value.length));
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      if (this.mention()) {
        this.mention.set(null);
      } else if (this.editing()) {
        this.cancelEdit.emit();
      }
      return;
    }
    if (event.key === 'Enter' && !event.shiftKey && !this.isTouch()) {
      event.preventDefault();
      const first = this.candidates()[0];
      if (this.mention() && first) {
        this.pickMention(first);
        return;
      }
      this.submit();
    }
  }

  pickMention(candidate: Candidate): void {
    const mention = this.mention();
    if (!mention) {
      return;
    }
    const el = this.box()!.nativeElement;
    const caret = el.selectionStart ?? el.value.length;
    const display = candidate.id === 'all' ? '@all' : `@${candidate.label}`;
    const value = `${el.value.slice(0, mention.start)}${display} ${el.value.slice(caret)}`;
    if (candidate.id !== 'all' && !this.tokens.some((t) => t.id === candidate.id)) {
      this.tokens = [...this.tokens, { id: candidate.id, display }];
    }
    this.text.set(value);
    el.value = value;
    const at = mention.start + display.length + 1;
    el.setSelectionRange(at, at);
    this.mention.set(null);
    el.focus();
  }

  onFiles(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.addFiles([...(input.files ?? [])]);
    input.value = '';
  }

  addFiles(added: File[]): void {
    const { accepted, rejected } = checkFiles(this.files(), added);
    this.files.update((files) => [...files, ...accepted]);
    if (rejected.length) {
      this.toast.warn(`${this.translate.instant('chat.filesRejected', { names: rejected.map((r) => r.name).join(', ') })} (${this.translate.instant('chat.fileRules')})`);
    }
  }

  removeFile(index: number): void {
    this.files.update((files) => files.filter((_, i) => i !== index));
  }

  submit(): void {
    if (!this.canSubmit()) {
      return;
    }
    const editing = this.editing();
    if (editing) {
      this.saveEdit.emit({ id: editing.id, body: this.body() });
    } else {
      this.send.emit({ body: this.body(), files: this.files() });
    }
    this.reset();
  }

  private reset(): void {
    this.text.set('');
    this.files.set([]);
    this.tokens = [];
    this.mention.set(null);
    const el = this.box()?.nativeElement;
    if (el) {
      el.value = '';
    }
  }

  /**
   * A finger is the main pointer (phones, tablets): Enter adds a line and the send button sends. `(hover: none)`
   * alone also matches machines with no mouse at all (headless browsers, some kiosks), which do have a keyboard.
   */
  private isTouch(): boolean {
    return typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  }
}
