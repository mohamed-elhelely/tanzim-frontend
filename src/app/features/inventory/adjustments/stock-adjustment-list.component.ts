import { DatePipe } from '@angular/common';
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
import { UserNamePipe } from '../../../shared/pipes/user-name.pipe';
import { ServerTable } from '../../../shared/table/server-table';
import { errorTitleKey } from '../../../shared/utils/server-errors';
import { ADJUSTMENT_STATUS_SEVERITY, AdjustmentStatus, Severity, StockAdjustment } from '../inventory.models';
import { StockAdjustmentService } from './stock-adjustment.service';

/** Adjustments, newest first; search by number or notes (the API has no status filter). */
@Component({
  selector: 'app-stock-adjustment-list',
  imports: [
    DatePipe,
    TranslatePipe,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    TableModule,
    PageHeaderComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    StatusBadgeComponent,
    UserNamePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './stock-adjustment-list.component.html',
})
export class StockAdjustmentListComponent implements OnInit {
  private readonly api = inject(StockAdjustmentService);
  private readonly router = inject(Router);

  readonly table = new ServerTable<StockAdjustment>((query) => this.api.list({ ...query, ordering: query.ordering ?? '-id' }));
  readonly errorTitleKey = errorTitleKey;

  readonly headerActions: PageHeaderAction[] = [
    { label: 'inventory.adjustments.new', icon: 'pi pi-plus', onClick: () => void this.router.navigate(['/inventory/adjustments/new']) },
  ];

  ngOnInit(): void {
    this.table.load();
  }

  statusSeverity(status: AdjustmentStatus): Severity {
    return ADJUSTMENT_STATUS_SEVERITY[status] ?? 'secondary';
  }

  open(row: StockAdjustment): void {
    void this.router.navigate(['/inventory/adjustments', row.id]);
  }
}
