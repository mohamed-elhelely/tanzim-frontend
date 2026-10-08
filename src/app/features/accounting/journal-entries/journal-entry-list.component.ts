import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { PageHeaderAction, PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { ServerTable } from '../../../shared/table/server-table';
import { errorTitleKey } from '../../../shared/utils/server-errors';
import { JournalEntry, JournalStatus } from '../accounting.models';
import { JournalEntryService } from './journal-entry.service';

type Origin = 'manual' | 'automatic';

/** The journal, newest first. Automatic entries come from sales, stock and payments. */
@Component({
  selector: 'app-journal-entry-list',
  imports: [
    DecimalPipe,
    FormsModule,
    TranslatePipe,
    TableModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
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
  readonly table = new ServerTable<JournalEntry>((query) => {
    const filters: Record<string, string> = {};
    if (this.status) {
      filters['status'] = this.status;
    }
    if (this.origin) {
      filters['automatic'] = String(this.origin === 'automatic');
    }
    if (this.startDate) {
      filters['start_date'] = this.startDate;
    }
    if (this.endDate) {
      filters['end_date'] = this.endDate;
    }
    // The endpoint has no text search or sorting; only filters and paging.
    return this.api.list({ page: query.page, pageSize: query.pageSize, filters });
  });
  readonly errorTitleKey = errorTitleKey;
  readonly statusOptions = (['draft', 'posted'] as const).map((status) => ({ value: status, label: `accounting.entryStatuses.${status}` }));
  readonly originOptions = (['manual', 'automatic'] as const).map((origin) => ({ value: origin, label: `accounting.origins.${origin}` }));

  readonly headerActions: PageHeaderAction[] = [
    { label: 'accounting.entries.new', icon: 'pi pi-plus', onClick: () => void this.router.navigate(['/accounting/journal-entries/new']) },
  ];

  ngOnInit(): void {
    this.table.load();
  }

  onFilterChange(): void {
    this.table.first.set(0);
    this.table.load();
  }

  open(row: JournalEntry): void {
    void this.router.navigate(['/accounting/journal-entries', row.id]);
  }
}
