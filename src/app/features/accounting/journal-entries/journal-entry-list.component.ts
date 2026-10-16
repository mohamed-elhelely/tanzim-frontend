import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { PageHeaderAction, PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { ServerTable } from '../../../shared/table/server-table';

import { JournalEntry, JournalStatus } from '../accounting.models';
import { JournalEntryService } from './journal-entry.service';
import { RowActionComponent, RowActionsComponent } from '../../../shared/table/row-actions.component';
import { SavedViewsComponent } from '../../../shared/table/saved-views.component';
import { SelectComponent } from '../../../shared/ui';

type Origin = 'manual' | 'automatic';

/** The journal, newest first. Automatic entries come from sales, stock and payments. */
@Component({
  selector: 'app-journal-entry-list',
  imports: [
    SelectComponent,
    RowActionsComponent,
    RowActionComponent,
    SavedViewsComponent,
    DecimalPipe,
    FormsModule,
    TranslatePipe,
    TableModule,
    ButtonModule,
    InputTextModule,
    PageHeaderComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    StatusBadgeComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './journal-entry-list.component.html',
})
export class JournalEntryListComponent implements OnInit {
  private readonly api = inject(JournalEntryService);
  private readonly router = inject(Router);

  status: JournalStatus | null = null;
  origin: Origin | null = null;
  startDate = '';
  endDate = '';
  readonly table = new ServerTable<JournalEntry>(
    // The endpoint has no text search or sorting; only filters and paging.
    (query) => this.api.list({ page: query.page, pageSize: query.pageSize, filters: query.filters }),
    {
      filters: () => ({
        status: this.status,
        automatic: this.origin ? this.origin === 'automatic' : null,
        start_date: this.startDate,
        end_date: this.endDate,
      }),
      reset: () => {
        this.status = null;
        this.origin = null;
        this.startDate = '';
        this.endDate = '';
      },
      restore: (filters) => {
        this.status = (filters['status'] ?? null) as JournalEntryListComponent['status'];
        this.origin = filters['automatic'] === undefined ? null : filters['automatic'] === 'true' ? 'automatic' : 'manual';
        this.startDate = String(filters['start_date'] ?? '');
        this.endDate = String(filters['end_date'] ?? '');
      },
    },
  );
  readonly statusOptions = (['draft', 'posted'] as const).map((status) => ({ value: status, label: `accounting.entryStatuses.${status}` }));
  readonly originOptions = (['manual', 'automatic'] as const).map((origin) => ({ value: origin, label: `accounting.origins.${origin}` }));

  readonly headerActions: PageHeaderAction[] = [
    { label: 'accounting.entries.new', icon: 'pi pi-plus', onClick: () => void this.router.navigate(['/accounting/journal-entries/new']) },
  ];

  ngOnInit(): void {
    this.table.load();
  }

  open(row: JournalEntry): void {
    void this.router.navigate(['/accounting/journal-entries', row.id]);
  }
}
