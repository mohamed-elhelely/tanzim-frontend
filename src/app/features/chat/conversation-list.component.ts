import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { debounceTime, map } from 'rxjs';
import { chatTime, conversationIcon, conversationTitle, initials, messagePreview } from '../../core/chat/chat-format';
import { ChatStore } from '../../core/chat/chat.store';
import { LanguageService } from '../../core/services/language.service';
import { NewChatDialogComponent } from './new-chat-dialog.component';

/** The drawer's list view: search (on the loaded list), "New chat", one row per conversation. */
@Component({
  selector: 'app-conversation-list',
  imports: [FormsModule, TranslatePipe, ButtonModule, NewChatDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex h-full min-h-0 flex-col' },
  template: `
    <div class="flex items-center gap-2 px-3 pb-2">
      <span class="relative flex-1">
        <i class="pi pi-search pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-sm text-gray-400"></i>
        <input
          type="search"
          class="h-9 w-full rounded-lg border border-gray-200 bg-white ps-9 pe-3 text-sm outline-none focus:border-primary-500 dark:border-gray-700 dark:bg-gray-900"
          [placeholder]="'chat.search' | translate"
          [attr.aria-label]="'chat.search' | translate"
          [ngModel]="search()"
          (ngModelChange)="search.set($event)"
        />
      </span>
      <p-button icon="pi pi-pen-to-square" [rounded]="true" [text]="true" [ariaLabel]="'chat.newChat' | translate" (onClick)="newChatOpen.set(true)"></p-button>
    </div>

    <div class="min-h-0 flex-1 overflow-y-auto">
      @if (store.listLoading() && !rows().length) {
        <p class="px-4 py-8 text-center text-sm text-gray-500"><i class="pi pi-spin pi-spinner"></i></p>
      } @else {
        @for (row of rows(); track row.c.id) {
          <button
            type="button"
            data-test="conversation"
            class="flex w-full items-center gap-3 px-3 py-2.5 text-start transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
            (click)="store.openThread(row.c.id)"
          >
            @if (row.c.avatar) {
              <img [src]="row.c.avatar" alt="" class="h-10 w-10 shrink-0 rounded-full object-cover" />
            } @else {
              <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700 dark:bg-primary-900 dark:text-primary-200">
                @if (row.icon) {
                  <i class="pi {{ row.icon }}"></i>
                } @else {
                  {{ row.initials }}
                }
              </span>
            }
            <span class="min-w-0 flex-1">
              <span class="flex items-center gap-2">
                <span class="truncate text-sm text-gray-900 dark:text-gray-100" [class.font-semibold]="row.c.unread_count > 0">{{ row.title }}</span>
                @if (row.c.other_user && !row.c.other_user.is_active) {
                  <span class="shrink-0 rounded bg-gray-100 px-1.5 text-[10px] text-gray-500 dark:bg-gray-800">{{ 'chat.leftCompany' | translate }}</span>
                }
                <span class="ms-auto shrink-0 text-xs text-gray-400">{{ row.time }}</span>
              </span>
              <span class="flex items-center gap-2">
                <span class="truncate text-xs text-gray-500 dark:text-gray-400">{{ row.preview }}</span>
                @if (row.c.unread_count > 0) {
                  <span
                    [attr.data-test]="'unread-' + row.c.id"
                    class="ms-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary-600 px-1.5 text-[10px] font-bold text-white"
                  >
                    {{ row.c.unread_count > 99 ? '99+' : row.c.unread_count }}
                  </span>
                }
              </span>
            </span>
          </button>
        } @empty {
          <p class="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
            {{ (term() ? 'chat.noMatches' : 'chat.empty') | translate }}
          </p>
        }
      }
    </div>

    <app-new-chat-dialog [(visible)]="newChatOpen"></app-new-chat-dialog>
  `,
})
export class ConversationListComponent {
  readonly store = inject(ChatStore);
  private readonly language = inject(LanguageService);
  private readonly translate = inject(TranslateService);
  readonly search = signal('');
  readonly newChatOpen = signal(false);
  readonly term = toSignal(toObservable(this.search).pipe(debounceTime(300), map((s) => s.trim().toLowerCase())), { initialValue: '' });

  readonly rows = computed(() => {
    const lang = this.language.currentLang();
    const me = this.store.myId();
    const term = this.term();
    const t = (key: string, params?: Record<string, unknown>) => this.translate.instant(key, params) as string;
    return this.store
      .conversations()
      .map((c) => {
        const title = conversationTitle(c, lang);
        return {
          c,
          title,
          icon: conversationIcon(c),
          initials: initials(title),
          preview: c.last_message ? messagePreview(c.last_message, me, () => undefined, t) : '',
          time: c.last_message_at ? chatTime(c.last_message_at, lang) : '',
        };
      })
      .filter((row) => !term || row.title.toLowerCase().includes(term));
  });
}
