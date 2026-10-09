import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { PageHeaderAction, PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { ServerTable } from '../../../shared/table/server-table';
import { errorTitleKey } from '../../../shared/utils/server-errors';
import { Severity, StockTransfer, TRANSFER_STATUS_SEVERITY, TransferStatus } from '../inventory.models';
import { StockTransferService } from './stock-transfer.service';

/** Transfers, newest first; search by number, carrier or tracking number (the API has no status filter). */
@Component({
  selector: 'app-stock-transfer-list',
  imports: [
    TranslatePipe,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    TableModule,
    PageHeaderComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    StatusBadgeComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './stock-transfer-list.component.html',
})
export class StockTransferListComponent implements OnInit {
  private readonly api = inject(StockTransferService);
  private readonly router = inject(Router);

  readonly table = new ServerTable<StockTransfer>((query) => this.api.list({ ...query, ordering: query.ordering ?? '-id' }));
  readonly errorTitleKey = errorTitleKey;

  readonly headerActions: PageHeaderAction[] = [
    { label: 'inventory.transfers.new', icon: 'pi pi-plus', onClick: () => void this.router.navigate(['/inventory/transfers/new']) },
  ];

  ngOnInit(): void {
    this.table.load();
  }

  statusSeverity(status: TransferStatus): Severity {
    return TRANSFER_STATUS_SEVERITY[status] ?? 'secondary';
  }

  open(row: StockTransfer): void {
    void this.router.navigate(['/inventory/transfers', row.id]);
  }
}
