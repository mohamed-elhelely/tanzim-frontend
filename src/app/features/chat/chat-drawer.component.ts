import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { PrimeTemplate } from 'primeng/api';
import { DrawerModule } from 'primeng/drawer';
import { conversationTitle } from '../../core/chat/chat-format';
import { ChatStore } from '../../core/chat/chat.store';
import { LanguageService } from '../../core/services/language.service';
import { ChatThreadComponent } from './chat-thread.component';
import { ConversationListComponent } from './conversation-list.component';
import { ButtonComponent } from '../../shared/ui/button/button.component';

/** The floating chat: list ⇄ thread in one ~400px drawer at the end side. Hosted once by the shell, loaded on first open. */
@Component({
  selector: 'app-chat-drawer',
  imports: [ButtonComponent, TranslatePipe, PrimeTemplate, DrawerModule, ConversationListComponent, ChatThreadComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-drawer
      [visible]="store.drawerOpen()"
      (visibleChange)="$event || store.closeDrawer()"
      [modal]="false"
      [position]="language.direction() === 'rtl' ? 'left' : 'right'"
      styleClass="w-full sm:w-[25rem] [&_.p-drawer-content]:!p-0"
    >
      <ng-template pTemplate="header">
        @if (store.thread()) {
          <div class="flex min-w-0 items-center gap-2">
            <app-button
              icon="pi pi-arrow-left"
              [rounded]="true"
              severity="secondary"
              [ariaLabel]="'chat.back' | translate"
              (clicked)="store.backToList()"
              variant="text"
              [flipIconInRtl]="true"
            ></app-button>
            <div class="min-w-0">
              <h2 class="truncate text-base font-semibold text-gray-900 dark:text-gray-100">{{ title() }}</h2>
              @if (store.current(); as c) {
                <p class="truncate text-xs text-gray-500 dark:text-gray-400">
                  @if (c.kind === 'direct') {
                    @if (c.other_user && !c.other_user.is_active) {
                      {{ 'chat.leftCompany' | translate }}
                    }
                  } @else {
                    {{ 'chat.membersCount' | translate: { count: c.members_count } }}
                  }
                </p>
              }
            </div>
          </div>
        } @else {
          <h2 class="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
            <i class="pi pi-comments text-primary-600 dark:text-primary-300" aria-hidden="true"></i>
            {{ 'chat.title' | translate }}
          </h2>
        }
      </ng-template>

      @if (store.thread(); as thread) {
        <!-- Keyed by the thread instance so opening another chat starts from fresh component state. -->
        @for (t of [thread]; track t) {
          <app-chat-thread [thread]="t"></app-chat-thread>
        }
      } @else {
        <app-conversation-list></app-conversation-list>
      }
    </p-drawer>
  `,
})
export class ChatDrawerComponent {
  readonly store = inject(ChatStore);
  readonly language = inject(LanguageService);
  readonly title = computed(() => {
    const c = this.store.current();
    return c ? conversationTitle(c, this.language.currentLang()) : '';
  });
}
