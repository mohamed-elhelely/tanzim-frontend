import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { ChoiceFilterComponent } from '../../../shared/table/choice-filter.component';
import { DateRangeFilterComponent } from '../../../shared/table/date-range-filter.component';
import { FilterErrorsComponent } from '../../../shared/table/filter-errors.component';
import { ServerTable, splitFilter } from '../../../shared/table/server-table';
import { errorTitleKey } from '../../../shared/utils/server-errors';
import { DELIVERY_STATUSES, DELIVERY_STATUS_SEVERITY, DeliveryNoteListItem, DeliveryStatus } from '../sales.models';
import { DeliveryNoteService } from './delivery-note.service';
import { RowActionComponent, RowActionsComponent } from '../../../shared/table/row-actions.component';
import { SavedViewsComponent } from '../../../shared/table/saved-views.component';

/** Delivery notes are created from an order ("Ship"), so this list has no New button. */
@Component({
  selector: 'app-delivery-note-list',
  imports: [
    RowActionsComponent,
    RowActionComponent,
    SavedViewsComponent,
    FormsModule,
    TranslatePipe,
    TableModule,
    ButtonModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    ChoiceFilterComponent,
    DateRangeFilterComponent,
    FilterErrorsComponent,
    PageHeaderComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    StatusBadgeComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './delivery-note-list.component.html',
})
export class DeliveryNoteListComponent implements OnInit {
  private readonly api = inject(DeliveryNoteService);
  private readonly router = inject(Router);

  status: DeliveryStatus[] = [];
  dateFrom = '';
  dateTo = '';
  readonly table = new ServerTable<DeliveryNoteListItem>(
    (query) => this.api.list(query),
    {
      filters: () => ({ status: this.status, date_from: this.dateFrom, date_to: this.dateTo }),
      reset: () => {
        this.status = [];
        this.dateFrom = '';
        this.dateTo = '';
      },
      restore: (filters) => {
        this.status = splitFilter(filters['status']) as DeliveryNoteListComponent['status'];
        this.dateFrom = String(filters['date_from'] ?? '');
        this.dateTo = String(filters['date_to'] ?? '');
      },
    },
  );
  readonly errorTitleKey = errorTitleKey;
  readonly statusOptions = DELIVERY_STATUSES.map((status) => ({ value: status, label: `sales.deliveryStatuses.${status}` }));

  ngOnInit(): void {
    this.table.load();
  }

  statusSeverity(status: DeliveryStatus) {
    return DELIVERY_STATUS_SEVERITY[status] ?? 'secondary';
  }

  open(row: DeliveryNoteListItem): void {
    void this.router.navigate(['/sales/deliveries', row.id]);
  }
}
