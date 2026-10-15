import {
  ChangeDetectionStrategy, Component, ElementRef, Injector, afterNextRender, computed, effect, inject, input, signal, untracked, viewChild,
} from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AccessService } from '../../core/auth/access.service';
import { NameOf, dayLabel, systemText } from '../../core/chat/chat-format';
import { canDelete, canEdit, postingNote } from '../../core/chat/chat-rules';
import { ChatThread } from '../../core/chat/chat-thread';
import { ChatMessage, ReplyPreview, SystemMessageData, ThreadItem } from '../../core/chat/chat.models';
import { ChatStore } from '../../core/chat/chat.store';
import { ConfirmService } from '../../core/services/confirm.service';
import { LanguageService } from '../../core/services/language.service';
import { MessageBubbleComponent } from './message-bubble.component';
import { MessageComposerComponent } from './message-composer.component';
import { threadRows } from './thread-rows';

/** Close enough to the bottom to keep following new messages. */
const STICKY_PX = 48;
/** Close enough to the top to load the previous page. */
const LOAD_OLDER_PX = 80;

/** The open chat: messages (oldest at the top), typing line, and the composer or the reason I cannot post. */
@Component({
  selector: 'app-chat-thread',
  imports: [TranslatePipe, MessageBubbleComponent, MessageComposerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex h-full min-h-0 flex-col' },
  template: `
    <div #scroller class="relative min-h-0 flex-1 overflow-y-auto px-3 py-2" (scroll)="onScroll()">
      @if (thread().loadingOlder()) {
        <p class="py-2 text-center text-xs text-gray-500"><i class="pi pi-spin pi-spinner me-1"></i>{{ 'chat.loadingOlder' | translate }}</p>
      }
      @if (thread().loading()) {
        <p class="py-8 text-center text-sm text-gray-500"><i class="pi pi-spin pi-spinner"></i></p>
      } @else {
        @for (row of rows(); track row.key) {
          @switch (row.kind) {
            @case ('day') {
              <p data-test="day" class="my-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400">{{ row.label }}</p>
            }
            @case ('system') {
              <p class="my-2 text-center text-xs italic text-gray-500 dark:text-gray-400" [attr.data-message]="row.item.message.id">{{ system(row.item.message) }}</p>
            }
            @case ('message') {
              <app-message-bubble
                [attr.data-message]="row.item.message.id"
                [item]="row.item"
                [mine]="row.mine"
                [first]="row.first"
                [nameOf]="nameOf"
                [canEdit]="editable(row.item)"
                [canDelete]="deletable(row.item)"
                (reply)="startReply($event)"
                (edit)="startEdit($event)"
                (remove)="confirmDelete($event)"
                (retry)="thread().retry($event)"
                (discard)="thread().discard($event)"
                (jump)="jumpTo($event)"
              ></app-message-bubble>
            }
          }
        } @empty {
          <p class="py-8 text-center text-sm text-gray-500 dark:text-gray-400">{{ 'chat.noMessages' | translate }}</p>
        }
      }
    </div>

    @if (unseen()) {
      <button
        type="button"
        class="mx-auto -mt-10 mb-2 rounded-full bg-primary-600 px-3 py-1 text-xs font-semibold text-white shadow"
        (click)="scrollToBottom()"
      >
        {{ 'chat.newMessages' | translate }} ↓
      </button>
    }

    <p class="h-5 px-4 text-xs italic text-gray-500 dark:text-gray-400">{{ typingLine() }}</p>

    @if (store.current(); as c) {
      @if (note(); as key) {
        <p class="border-t border-gray-200 px-4 py-3 text-center text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">{{ key | translate }}</p>
      } @else {
        <app-message-composer
          [conversation]="c"
          [members]="thread().members()"
          [myId]="store.myId()"
          [moderator]="moderator()"
          [replyTo]="replyTo()"
          [editing]="editing()"
          [nameOf]="nameOf"
          (send)="onSend($event)"
          (saveEdit)="onSaveEdit($event)"
          (cancelReply)="replyTo.set(null)"
          (cancelEdit)="editing.set(null)"
          (typed)="store.typed()"
        ></app-message-composer>
      }
    }
  `,
})
export class ChatThreadComponent {
  readonly thread = input.required<ChatThread>();
  readonly store = inject(ChatStore);
  private readonly access = inject(AccessService);
  private readonly confirm = inject(ConfirmService);
  private readonly translate = inject(TranslateService);
  private readonly language = inject(LanguageService);
  private readonly injector = inject(Injector);
  private readonly scroller = viewChild<ElementRef<HTMLElement>>('scroller');

  readonly replyTo = signal<ReplyPreview | null>(null);
  readonly editing = signal<ChatMessage | null>(null);
  readonly unseen = signal(false);
  private atBottom = true;
  private olderAnchor: { height: number; top: number; firstId: number | undefined } | null = null;
  private lastKey: string | undefined;

  readonly moderator = computed(() => this.access.can('change_chatmoderation'));
  readonly note = computed(() => {
    const c = this.store.current();
    return c ? postingNote(c) : null;
  });
  readonly nameOf: NameOf = (id) => this.thread().nameOf(id);
  private readonly t = (key: string, params?: Record<string, unknown>) => this.translate.instant(key, params) as string;

  readonly rows = computed(() => {
    const lang = this.language.currentLang();
    return threadRows(this.thread().items(), this.store.myId(), (iso) => dayLabel(iso, lang, this.t));
  });

  readonly typingLine = computed(() => {
    const ids = this.store.typing.usersIn(this.thread().conversationId);
    if (!ids.length) {
      return '';
    }
    if (ids.length > 1) {
      return this.t('chat.typingMany', { count: ids.length });
    }
    return this.t('chat.typingOne', { name: this.nameOf(ids[0]) ?? this.t('chat.someone') });
  });

  constructor() {
    effect(() => {
      const rows = this.rows();
      const first = rows[0]?.key;
      const last = rows.at(-1)?.key;
      untracked(() => afterNextRender(() => this.afterRows(first, last), { injector: this.injector }));
    });
    // An older page that failed or added nothing must not leave its anchor for a later, unrelated row change.
    effect(() => {
      if (!this.thread().loadingOlder()) {
        untracked(() => afterNextRender(() => (this.olderAnchor = null), { injector: this.injector }));
      }
    });
  }

  editable(item: ThreadItem): boolean {
    return canEdit(item, this.store.myId());
  }

  deletable(item: ThreadItem): boolean {
    return canDelete(item, this.store.myId(), this.store.current()?.my_role, this.moderator());
  }

  system(message: ChatMessage): string {
    return systemText(message.data as SystemMessageData, this.nameOf, this.t);
  }

  startReply(item: ThreadItem): void {
    const m = item.message;
    this.editing.set(null);
    this.replyTo.set({ id: m.id, sender: m.sender, body: m.body.slice(0, 200), is_deleted: m.is_deleted });
  }

  startEdit(item: ThreadItem): void {
    this.replyTo.set(null);
    this.editing.set(item.message);
  }

  onSend(draft: { body: string; files: File[] }): void {
    this.thread().send(draft.body, this.replyTo(), draft.files);
    this.replyTo.set(null);
    this.atBottom = true;
  }

  onSaveEdit(change: { id: number; body: string }): void {
    this.thread().edit(change.id, change.body);
    this.editing.set(null);
  }

  confirmDelete(item: ThreadItem): void {
    this.confirm.confirmAction({
      message: 'chat.confirmDelete',
      accept: 'chat.delete',
      success: 'chat.deletedToast',
      danger: true,
      run: () => this.thread().deleteRequest(item.message.id),
      onDone: () => undefined,
    });
  }

  jumpTo(messageId: number): void {
    this.scroller()?.nativeElement.querySelector(`[data-message="${messageId}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  onScroll(): void {
    const el = this.scroller()?.nativeElement;
    if (!el) {
      return;
    }
    this.atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < STICKY_PX;
    if (this.atBottom) {
      this.unseen.set(false);
    }
    if (el.scrollTop < LOAD_OLDER_PX && this.thread().hasOlder() && !this.thread().loadingOlder()) {
      this.olderAnchor = { height: el.scrollHeight, top: el.scrollTop, firstId: this.thread().items()[0]?.message.id };
      this.thread().loadOlder();
    }
  }

  scrollToBottom(): void {
    const el = this.scroller()?.nativeElement;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
    this.atBottom = true;
    this.unseen.set(false);
  }

  /** Older page: keep the reading position. New message: follow it if at the bottom, else show the pill. */
  private afterRows(first: string | undefined, last: string | undefined): void {
    const el = this.scroller()?.nativeElement;
    if (!el) {
      return;
    }
    if (this.olderAnchor && first !== undefined && this.thread().items()[0]?.message.id !== this.olderAnchor.firstId) {
      el.scrollTop = el.scrollHeight - this.olderAnchor.height + this.olderAnchor.top;
      this.olderAnchor = null;
    }
    if (last !== this.lastKey) {
      const lastItem = this.thread().items().at(-1);
      if (this.atBottom || lastItem?.message.sender?.id === this.store.myId()) {
        this.scrollToBottom();
      } else {
        this.unseen.set(true);
      }
      this.lastKey = last;
    }
  }
}
