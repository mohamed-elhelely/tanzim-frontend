import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MenuItem } from 'primeng/api';
import { MenuModule } from 'primeng/menu';
import { NameOf, bodySegments, chatTime, plainBody } from '../../core/chat/chat-format';
import { ThreadItem } from '../../core/chat/chat.models';
import { LanguageService } from '../../core/services/language.service';
import { NotificationService } from '../../core/services/notification.service';
import { ChatAttachmentComponent } from './chat-attachment.component';

/** One message: mine at the end side, others at the start (flips in RTL). Its menu opens from ⋮ or a long-press. */
@Component({
  selector: 'app-message-bubble',
  imports: [TranslatePipe, MenuModule, ChatAttachmentComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'group flex flex-wrap', '[class.justify-end]': 'mine()', '[class.mt-2]': 'first()', '[class.mt-0.5]': '!first()' },
  template: `
    <div class="flex max-w-[85%] items-start gap-1" [class.flex-row-reverse]="mine()">
      <div
        class="min-w-0 rounded-2xl px-3 py-2 text-sm"
        [class]="mine() ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'"
        [class.opacity-60]="item().status === 'pending'"
        (contextmenu)="openMenu($event, menu)"
      >
        @if (first() && !mine() && message().sender; as sender) {
          <p class="mb-0.5 text-xs font-semibold text-primary-700 dark:text-primary-300">
            {{ sender.name }}
            @if (!sender.is_active) {
              <span class="font-normal text-gray-500">· {{ 'chat.leftCompany' | translate }}</span>
            }
          </p>
        }

        @if (message().is_deleted) {
          <p class="italic opacity-70">{{ 'chat.deleted' | translate }}</p>
        } @else {
          @if (message().reply_to; as reply) {
            <button
              type="button"
              data-test="reply-preview"
              class="mb-1 block w-full rounded-lg border-s-4 border-current/40 bg-black/5 px-2 py-1 text-start text-xs dark:bg-white/10"
              (click)="jump.emit(reply.id)"
            >
              <span class="block font-semibold">{{ reply.sender?.name }}</span>
              <span class="line-clamp-2 opacity-80">{{ reply.is_deleted ? ('chat.deleted' | translate) : replyText() }}</span>
            </button>
          }
          @if (message().body) {
            <p class="whitespace-pre-wrap break-words">
              @for (segment of segments(); track $index) {
                @switch (segment.kind) {
                  @case ('text') {<span>{{ segment.text }}</span>}
                  @case ('all') {<span data-test="mention" class="rounded bg-amber-200/60 px-0.5 font-semibold dark:bg-amber-500/30">&#64;all</span>}
                  @case ('mention') {<span data-test="mention" class="rounded bg-black/10 px-0.5 font-semibold dark:bg-white/15">&#64;{{ segment.name ?? ('chat.someone' | translate) }}</span>}
                }
              }
            </p>
          }
          @if (message().attachments.length) {
            <div class="mt-1 flex flex-col gap-1">
              @for (attachment of message().attachments; track attachment.id) {
                <app-chat-attachment [attachment]="attachment"></app-chat-attachment>
              }
            </div>
          }
        }

        <p class="mt-0.5 flex items-center justify-end gap-1 text-[10px] opacity-70">
          @if (message().edited_at && !message().is_deleted) {
            <span>{{ 'chat.edited' | translate }}</span>
          }
          @if (item().status === 'pending') {
            <span>{{ 'chat.sending' | translate }}</span>
          } @else {
            <span>{{ time() }}</span>
          }
        </p>
      </div>

      @if (item().status === 'sent' && !message().is_deleted) {
        <button
          type="button"
          class="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-gray-400 opacity-0 transition-opacity hover:bg-gray-100 focus:opacity-100 group-hover:opacity-100 dark:hover:bg-gray-800 [@media(hover:none)]:opacity-100"
          [attr.aria-label]="'chat.actions' | translate"
          (click)="menu.toggle($event)"
        >
          <i class="pi pi-ellipsis-v text-xs"></i>
        </button>
      }
    </div>
    <!-- Outside the @if so the long-press handler above can reach it. -->
    <p-menu #menu [model]="menuItems()" [popup]="true" appendTo="body"></p-menu>

    @if (item().status === 'failed') {
      <div class="mt-0.5 flex w-full items-center justify-end gap-2 text-xs text-red-600 dark:text-red-400">
        <span>{{ item().error || ('chat.failed' | translate) }}</span>
        @if (item().retryable) {
          <button type="button" data-test="retry" class="font-semibold underline" (click)="retry.emit(clientId())">{{ 'chat.retry' | translate }}</button>
        }
        <button type="button" data-test="discard" class="font-semibold underline" (click)="discard.emit(clientId())">{{ 'chat.remove' | translate }}</button>
      </div>
    }
  `,
})
export class MessageBubbleComponent {
  readonly item = input.required<ThreadItem>();
  readonly nameOf = input.required<NameOf>();
  readonly mine = input(false);
  readonly first = input(true);
  readonly canEdit = input(false);
  readonly canDelete = input(false);

  readonly reply = output<ThreadItem>();
  readonly edit = output<ThreadItem>();
  readonly remove = output<ThreadItem>();
  readonly retry = output<string>();
  readonly discard = output<string>();
  readonly jump = output<number>();

  private readonly translate = inject(TranslateService);
  private readonly language = inject(LanguageService);
  private readonly toast = inject(NotificationService);

  readonly message = computed(() => this.item().message);
  readonly clientId = computed(() => this.item().draft?.clientId ?? '');
  readonly segments = computed(() => bodySegments(this.message().body, this.nameOf()));
  readonly replyText = computed(() => plainBody(this.message().reply_to?.body ?? '', this.nameOf(), this.translate.instant('chat.someone')));
  readonly time = computed(() => chatTime(this.message().created_at, this.language.currentLang()));

  readonly menuItems = computed<MenuItem[]>(() => {
    const t = (key: string) => this.translate.instant(key) as string;
    const items: MenuItem[] = [
      { label: t('chat.reply'), icon: 'pi pi-reply', command: () => this.reply.emit(this.item()) },
      { label: t('chat.copy'), icon: 'pi pi-copy', command: () => this.copy() },
    ];
    if (this.canEdit()) {
      items.push({ label: t('chat.edit'), icon: 'pi pi-pencil', command: () => this.edit.emit(this.item()) });
    }
    if (this.canDelete()) {
      items.push({ label: t('chat.delete'), icon: 'pi pi-trash', styleClass: 'text-red-600', command: () => this.remove.emit(this.item()) });
    }
    return items;
  });

  openMenu(event: MouseEvent, menu: { toggle: (e: Event) => void } | undefined): void {
    if (!menu || this.item().status !== 'sent' || this.message().is_deleted) {
      return;
    }
    event.preventDefault();
    menu.toggle(event);
  }

  private copy(): void {
    const text = plainBody(this.message().body, this.nameOf(), this.translate.instant('chat.someone'));
    void navigator.clipboard?.writeText(text).then(() => this.toast.success(this.translate.instant('chat.copied')));
  }
}
