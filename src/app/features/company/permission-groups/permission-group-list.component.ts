import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { Subject, debounceTime, distinctUntilChanged, Subscription } from 'rxjs';
import { AppError } from '../../../core/errors/app-error';
import { NotificationService } from '../../../core/services/notification.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { PageHeaderAction, PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { errorTitleKey } from '../../../shared/utils/server-errors';
import { PermissionGroup } from '../company.models';
import { PermissionGroupService } from './permission-group.service';

@Component({
    selector: 'app-permission-group-list',
    imports: [
        TranslatePipe,
        TableModule,
        ButtonModule,
        InputTextModule,
    IconFieldModule,
    InputIconModule,
        PageHeaderComponent,
        EmptyStateComponent,
        ErrorStateComponent,
        StatusBadgeComponent,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './permission-group-list.component.html'
})
export class PermissionGroupListComponent implements OnInit {
  private readonly api = inject(PermissionGroupService);
  private readonly router = inject(Router);
  private readonly confirmation = inject(ConfirmationService);
  private readonly notifications = inject(NotificationService);
  private readonly translate = inject(TranslateService);
  private readonly search$ = new Subject<string>();
  private searchTerm = '';
  private ordering?: string;
  private listRequest?: Subscription;

  readonly rows = signal<PermissionGroup[]>([]);
  readonly total = signal(0);
  readonly first = signal(0);
  readonly pageSize = signal(10);
  readonly loading = signal(false);
  readonly error = signal<AppError | null>(null);
  readonly errorTitleKey = errorTitleKey;

  readonly headerActions: PageHeaderAction[] = [
    {
      label: 'company.permissionGroups.new',
      icon: 'pi pi-plus',
      onClick: () => void this.router.navigate(['/company/permission-groups/new']),
    },
  ];

  constructor() {
    this.search$.pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed()).subscribe((term) => {
      this.searchTerm = term;
      this.first.set(0);
      this.load();
    });
  }

  ngOnInit(): void {
    this.load();
  }

  onLazyLoad(event: TableLazyLoadEvent): void {
    this.first.set(event.first ?? 0);
    this.pageSize.set(event.rows ?? this.pageSize());
    const field = typeof event.sortField === 'string' ? event.sortField : undefined;
    this.ordering = field ? `${event.sortOrder === -1 ? '-' : ''}${field}` : undefined;
    this.load();
  }

  onSearch(term: string): void {
    this.search$.next(term.trim());
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    // Cancel the previous request so a slower, older response can't overwrite newer results.
    this.listRequest?.unsubscribe();
    this.listRequest = this.api
      .list({
        page: Math.floor(this.first() / this.pageSize()) + 1,
        pageSize: this.pageSize(),
        search: this.searchTerm || undefined,
        ordering: this.ordering,
      })
      .subscribe({
        next: (page) => {
          this.rows.set(page.items);
          this.total.set(page.total);
          this.loading.set(false);
        },
        error: (error: AppError) => {
          this.error.set(error);
          this.loading.set(false);
        },
      });
  }

  edit(row: PermissionGroup): void {
    void this.router.navigate(['/company/permission-groups', row.id, 'edit']);
  }

  confirmDelete(row: PermissionGroup): void {
    this.confirmation.confirm({
      key: 'app-confirm',
      header: this.translate.instant('common.confirm'),
      message: this.translate.instant('common.confirmDelete', { name: row.name_en }),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.translate.instant('common.delete'),
      rejectLabel: this.translate.instant('common.cancel'),
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.delete(row),
    });
  }

  private delete(row: PermissionGroup): void {
    this.api.remove(row.id).subscribe({
      next: () => {
        this.notifications.success(this.translate.instant('common.deleted'));
        if (this.rows().length === 1 && this.first() >= this.pageSize()) {
          this.first.update((first) => first - this.pageSize());
        }
        this.load();
      },
      error: (error: AppError) => {
        if (error.status >= 400 && error.status < 500 && error.status !== 401) {
          this.notifications.error(error.message);
        }
      },
    });
  }
}
