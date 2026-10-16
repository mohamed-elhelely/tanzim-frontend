import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { CheckboxModule } from 'primeng/checkbox';
import { TableComponent } from './table.component';

/** The header checkbox of an `app-table`: selects or clears every row on the page. */
@Component({
  selector: 'app-table-select-all',
  imports: [FormsModule, TranslatePipe, CheckboxModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './table-select-all.component.html',
})
export class TableSelectAllComponent {
  readonly table = inject(TableComponent);
}
