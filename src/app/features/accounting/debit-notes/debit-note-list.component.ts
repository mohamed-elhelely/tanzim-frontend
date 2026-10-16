import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { PageHeaderAction, PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { ChoiceFilterComponent } from '../../../shared/table/choice-filter.component';
import { DateRangeFilterComponent } from '../../../shared/table/date-range-filter.component';
import { FilterErrorsComponent } from '../../../shared/table/filter-errors.component';
import { ServerTable, splitFilter } from '../../../shared/table/server-table';
import { errorTitleKey } from '../../../shared/utils/server-errors';
import { DEBIT_NOTE_SEVERITY, DebitNote, DebitNoteStatus } from '../accounting.models';
import { DebitNoteService } from './debit-note.service';
import { RowActionComponent, RowActionsComponent } from '../../../shared/table/row-actions.component';
import { SavedViewsComponent } from '../../../shared/table/saved-views.component';

@Component({
  selector: 'app-debit-note-list',
  imports: [
    RowActionsComponent,
    RowActionComponent,
    SavedViewsComponent,
    DecimalPipe,
    FormsModule,
    TranslatePipe,
    TableModule,
    ButtonModule,
    ChoiceFilterComponent,
    DateRangeFilterComponent,
    FilterErrorsComponent,
    PageHeaderComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    StatusBadgeComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './debit-note-list.component.html',
})
export class DebitNoteListComponent implements OnInit {
  private readonly api = inject(DebitNoteService);
  private readonly router = inject(Router);

  status: DebitNoteStatus[] = [];
  dateFrom = '';
  dateTo = '';
  readonly table = new ServerTable<DebitNote>(
    (query) => this.api.list({ page: query.page, pageSize: query.pageSize, filters: query.filters }),
    {
      filters: () => ({ status: this.status, date_from: this.dateFrom, date_to: this.dateTo }),
      reset: () => {
        this.status = [];
        this.dateFrom = '';
        this.dateTo = '';
      },
      restore: (filters) => {
        this.status = splitFilter(filters['status']) as DebitNoteListComponent['status'];
        this.dateFrom = String(filters['date_from'] ?? '');
        this.dateTo = String(filters['date_to'] ?? '');
      },
    },
  );
  readonly errorTitleKey = errorTitleKey;
  readonly statusOptions = (['draft', 'issued', 'cancelled'] as const).map((status) => ({ value: status, label: `accounting.noteStatuses.${status}` }));

  readonly headerActions: PageHeaderAction[] = [
    { label: 'accounting.notes.new', icon: 'pi pi-plus', onClick: () => void this.router.navigate(['/accounting/debit-notes/new']) },
  ];

  ngOnInit(): void {
    this.table.load();
  }

  statusSeverity(status: DebitNoteStatus) {
    return DEBIT_NOTE_SEVERITY[status] ?? 'secondary';
  }

  open(row: DebitNote): void {
    void this.router.navigate(['/accounting/debit-notes', row.id]);
  }
}
