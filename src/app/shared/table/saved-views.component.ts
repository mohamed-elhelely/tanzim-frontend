import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Popover, PopoverModule } from 'primeng/popover';
import { SavedView, SavedViewsService } from './saved-views.service';
import { ServerTable } from './server-table';

/**
 * "Views" button for a list's filter bar: save the applied search and filters under a name, and bring them back
 * with one click.
 *
 *   <app-saved-views [table]="table" screen="sales-orders"></app-saved-views>
 */
@Component({
  selector: 'app-saved-views',
  imports: [FormsModule, TranslatePipe, ButtonModule, InputTextModule, PopoverModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './saved-views.component.html',
})
export class SavedViewsComponent {
  private readonly store = inject(SavedViewsService);

  readonly table = input.required<ServerTable<unknown>>();
  /** Storage key for this list, e.g. `sales-orders`. */
  readonly screen = input.required<string>();

  readonly views = signal<SavedView[]>([]);
  readonly name = signal('');
  readonly canSave = computed(() => !!this.name().trim() && this.table().filtered());

  /** Reads the views each time the popover opens, so another tab's saves show up. */
  toggle(event: Event, popover: Popover): void {
    this.views.set(this.store.list(this.screen()));
    this.name.set('');
    popover.toggle(event);
  }

  show(view: SavedView, popover: Popover): void {
    this.table().applyQuery(view.query);
    popover.hide();
  }

  save(): void {
    if (this.canSave()) {
      this.views.set(this.store.save(this.screen(), this.name().trim(), this.table().appliedQuery()));
      this.name.set('');
    }
  }

  remove(view: SavedView): void {
    this.views.set(this.store.remove(this.screen(), view.name));
  }
}
