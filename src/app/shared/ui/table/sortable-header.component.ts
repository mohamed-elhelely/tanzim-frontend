import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TableComponent } from './table.component';

/**
 * A sortable column header inside `app-table`: `<th appSortable="name">Name</th>`. A click sorts by the field
 * (ascending, then descending); the icon and `aria-sort` show the current direction.
 */
@Component({
  // It has to be the <th> itself (a wrapper element inside <tr> would break the table), hence an attribute selector.
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'th[appSortable]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sortable-header.component.html',
  host: {
    class: 'cursor-pointer select-none',
    tabindex: '0',
    '[attr.aria-sort]': "order() === 1 ? 'ascending' : order() === -1 ? 'descending' : 'none'",
    '(click)': 'sort()',
    '(keydown.enter)': 'sort()',
    '(keydown.space)': '$event.preventDefault(); sort()',
  },
})
export class SortableHeaderComponent {
  readonly appSortable = input.required<string>();
  private readonly table = inject(TableComponent);

  readonly order = computed(() => this.table.sortOf(this.appSortable()));
  readonly icon = computed(() => {
    const order = this.order();
    return order === 1 ? 'pi-sort-amount-up-alt' : order === -1 ? 'pi-sort-amount-down' : 'pi-sort-alt';
  });

  sort(): void {
    this.table.toggleSort(this.appSortable());
  }
}
