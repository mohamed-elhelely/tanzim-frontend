import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { UserNamePipe } from '../../../shared/pipes/user-name.pipe';
import { ServerTable } from '../../../shared/table/server-table';

import { LEDGER_TYPE_SEVERITY, LedgerTransactionType, Severity, StockLedgerEntry } from '../inventory.models';
import { StockLedgerService } from './stock-ledger.service';
import { SavedViewsComponent } from '../../../shared/table/saved-views.component';
import { AppDatePipe } from '../../../shared/pipes/app-date.pipe';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { TableComponent } from '../../../shared/ui/table/table.component';
import { TableEmptyDirective, TableHeaderDirective, TableRowDirective } from '../../../shared/ui/table/table-templates';
import { SortableHeaderComponent } from '../../../shared/ui/table/sortable-header.component';

/**
 * Every stock movement, newest first, read-only (the inventory services write it). Search matches the document
 * type; the API has no variant or warehouse filter yet (BACKEND_REQUESTS 26).
 */
@Component({
  selector: 'app-stock-ledger-list',
  imports: [
    SortableHeaderComponent,
    TableEmptyDirective,
    TableRowDirective,
    TableHeaderDirective,
    TableComponent,
    ButtonComponent,
    SavedViewsComponent,
    AppDatePipe,
    DecimalPipe,
    TranslatePipe,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    PageHeaderComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    StatusBadgeComponent,
    UserNamePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './stock-ledger-list.component.html',
})
export class StockLedgerListComponent implements OnInit {
  private readonly api = inject(StockLedgerService);

  readonly table = new ServerTable<StockLedgerEntry>((query) => this.api.list({ ...query, ordering: query.ordering ?? '-created_at' }));

  ngOnInit(): void {
    this.table.load();
  }

  typeSeverity(type: LedgerTransactionType): Severity {
    return LEDGER_TYPE_SEVERITY[type] ?? 'secondary';
  }

  isInbound(entry: StockLedgerEntry): boolean {
    return Number(entry.quantity) > 0;
  }
}
