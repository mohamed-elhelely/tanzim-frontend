import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { Subscription } from 'rxjs';
import { AppError } from '../../../core/errors/app-error';
import { LanguageService } from '../../../core/services/language.service';
import { NotificationService } from '../../../core/services/notification.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { PageHeaderAction, PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { localizedName } from '../../../shared/pipes/localized-name.pipe';
import { errorTitleKey } from '../../../shared/utils/server-errors';
import { Permission } from '../company.models';
import { PermissionService } from './permission.service';

@Component({
  selector: 'app-permission-list',
  standalone: true,
  imports: [
    TranslatePipe,
    TableModule,
    ButtonModule,
    PageHeaderComponent,
    EmptyStateComponent,
    ErrorStateComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './permission-list.component.html',
})
export class PermissionListComponent implements OnInit {
  private readonly api = inject(PermissionService);
  private readonly router = inject(Router);
  private readonly confirmation = inject(ConfirmationService);
  private readonly notifications = inject(NotificationService);
  private readonly translate = inject(TranslateService);
  private readonly lang = inject(LanguageService).currentLang;
  private ordering?: string;
  private listRequest?: Subscription;

  readonly rows = signal<Permission[]>([]);
  readonly total = signal(0);
  readonly first = signal(0);
  readonly pageSize = signal(10);
  readonly loading = signal(false);
  readonly error = signal<AppError | null>(null);
  readonly errorTitleKey = errorTitleKey;

  readonly headerActions: PageHeaderAction[] = [
    {
      label: 'company.permissions.new',
      icon: 'pi pi-plus',
      onClick: () => void this.router.navigate(['/company/permissions/new']),
    },
  ];

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

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    // Cancel the previous request so a slower, older response can't overwrite newer results.
    this.listRequest?.unsubscribe();
    this.listRequest = this.api
      .list({
        page: Math.floor(this.first() / this.pageSize()) + 1,
        pageSize: this.pageSize(),
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

  groupNames(row: Permission): string {
    return (row.groups ?? []).map((group) => localizedName(group, this.lang())).join(', ');
  }

  edit(row: Permission): void {
    void this.router.navigate(['/company/permissions', row.id, 'edit']);
  }

  confirmDelete(row: Permission): void {
    this.confirmation.confirm({
      key: 'app-confirm',
      header: this.translate.instant('common.confirm'),
      message: this.translate.instant('common.confirmDelete', { name: row.codename }),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.translate.instant('common.delete'),
      rejectLabel: this.translate.instant('common.cancel'),
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.delete(row),
    });
  }

  private delete(row: Permission): void {
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
