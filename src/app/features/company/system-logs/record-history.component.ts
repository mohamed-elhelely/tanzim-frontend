import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { AccessService } from '../../../core/auth/access.service';
import { AppError } from '../../../core/errors/app-error';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { UserNamePipe } from '../../../shared/pipes/user-name.pipe';
import { errorTitleKey } from '../../../shared/utils/server-errors';
import { AUDIT_ACTION_SEVERITY, AuditLogEntry, auditChangeRows } from './system-log.models';
import { SystemLogService } from './system-log.service';
import { AppDatePipe } from '../../../shared/pipes/app-date.pipe';
import { CardComponent } from '../../../shared/ui';

const PAGE_SIZE = 20;

/**
 * "History" card for a detail page: the system log of one record, newest first. It loads only when opened, so
 * a detail page costs no extra request, and only shows for users who may read the system log.
 *
 *   <app-record-history resource="salesorder" [objectId]="order.id"></app-record-history>
 */
@Component({
  selector: 'app-record-history',
  imports: [CardComponent, AppDatePipe, TranslatePipe, ButtonModule, StatusBadgeComponent, UserNamePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './record-history.component.html',
})
export class RecordHistoryComponent {
  private readonly api = inject(SystemLogService);
  readonly access = inject(AccessService);

  /** The permission-catalog resource, e.g. `salesorder`. */
  readonly resource = input.required<string>();
  readonly objectId = input.required<number | string>();

  readonly open = signal(false);
  readonly entries = signal<AuditLogEntry[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly error = signal<AppError | null>(null);
  private page = 0;

  readonly changeRows = auditChangeRows;
  readonly errorTitleKey = errorTitleKey;
  readonly severity = AUDIT_ACTION_SEVERITY;

  toggle(): void {
    this.open.update((open) => !open);
    if (this.open() && this.page === 0) {
      this.loadMore();
    }
  }

  loadMore(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api
      .list({
        page: this.page + 1,
        pageSize: PAGE_SIZE,
        ordering: '-timestamp',
        filters: { resource: this.resource(), object_id: String(this.objectId()) },
      })
      .subscribe({
        next: (page) => {
          this.page += 1;
          this.entries.update((entries) => [...entries, ...page.items]);
          this.total.set(page.total);
          this.loading.set(false);
        },
        error: (error: AppError) => {
          this.error.set(error);
          this.loading.set(false);
        },
      });
  }

  hasMore(): boolean {
    return this.entries().length < this.total();
  }
}
