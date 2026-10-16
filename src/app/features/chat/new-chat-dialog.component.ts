import { ChangeDetectionStrategy, Component, inject, model, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { ListboxModule } from 'primeng/listbox';
import { ChatStore } from '../../core/chat/chat.store';
import { SelectOption } from '../company/company.models';
import { CompanyUserService } from '../company/users/company-user.service';
import { DialogComponent } from '../../shared/ui/dialog/dialog.component';

/**
 * Picks a colleague for a direct chat. Uses the company-user dropdown, which also lists people without chat
 * access (the backend then answers "This user cannot be messaged."); BACKEND_REQUESTS_ROADMAP 17 asks for a
 * chat-only list.
 */
@Component({
  selector: 'app-new-chat-dialog',
  imports: [DialogComponent, FormsModule, TranslatePipe, ListboxModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-dialog
      [visible]="visible()"
      (visibleChange)="visible.set($event)"
      (shown)="load()"
      [header]="'chat.newChat' | translate"
      width="22rem"
    >
      <p-listbox
        [options]="options()"
        optionLabel="label"
        optionValue="value"
        [filter]="true"
        [filterPlaceHolder]="'chat.searchPeople' | translate"
        [ariaLabel]="'chat.pickPerson' | translate"
        listStyleClass="max-h-80"
        [ngModel]="null"
        (onChange)="pick($event.value)"
      ></p-listbox>
    </app-dialog>
  `,
})
export class NewChatDialogComponent {
  readonly visible = model(false);
  private readonly store = inject(ChatStore);
  private readonly users = inject(CompanyUserService);
  readonly options = signal<SelectOption[]>([]);
  private loaded = false;

  load(): void {
    if (this.loaded) {
      return;
    }
    this.users.userOptions().subscribe({
      next: (options) => {
        this.loaded = true;
        this.options.set(options.filter((option) => option.value !== this.store.myId()));
      },
      error: () => undefined,
    });
  }

  pick(userId: number | null): void {
    if (!userId) {
      return;
    }
    this.visible.set(false);
    this.store.startDirect(userId);
  }
}
