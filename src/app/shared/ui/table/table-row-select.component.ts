import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { CheckboxModule } from 'primeng/checkbox';
import { TableComponent } from './table.component';

/** A row's checkbox in an `app-table`: `<td><app-table-row-select [row]="row"></app-table-row-select></td>`. */
@Component({
  selector: 'app-table-row-select',
  imports: [FormsModule, TranslatePipe, CheckboxModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './table-row-select.component.html',
})
export class TableRowSelectComponent {
  readonly row = input.required<unknown>();
  readonly table = inject(TableComponent);
  readonly selected = computed(() => this.table.isSelected(this.row()));
}
