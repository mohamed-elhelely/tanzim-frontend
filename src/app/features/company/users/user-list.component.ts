import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { AuthService } from '../../../core/auth/auth.service';
import { AppError } from '../../../core/errors/app-error';
import { LanguageService } from '../../../core/services/language.service';
import { NotificationService } from '../../../core/services/notification.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { PageHeaderAction, PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { LocalizedNamePipe } from '../../../shared/pipes/localized-name.pipe';
import { errorTitleKey } from '../../../shared/utils/server-errors';
import { CompanyUser } from '../company.models';
import { CompanyUserService } from './company-user.service';

/** The company-user endpoint returns the full list, so paging, sorting and search happen in the table. */
@Component({
    selector: 'app-user-list',
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
        LocalizedNamePipe,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './user-list.component.html'
})
export class UserListComponent implements OnInit {
  private readonly api = inject(CompanyUserService);
  private readonly router = inject(Router);
  private readonly confirmation = inject(ConfirmationService);
  private readonly notifications = inject(NotificationService);
  private readonly translate = inject(TranslateService);

  readonly lang = inject(LanguageService).currentLang;
  /** Only company admins may add, edit or delete users (enforced by the backend). */
  readonly canManage = inject(AuthService).role() === 'COMPANY';
  readonly users = signal<CompanyUser[]>([]);
  readonly loading = signal(false);
  readonly error = signal<AppError | null>(null);
  readonly errorTitleKey = errorTitleKey;
  readonly searchFields = ['user.first_name', 'user.last_name', 'user.email'];

  readonly headerActions: PageHeaderAction[] = this.canManage
    ? [
        {
          label: 'company.users.new',
          icon: 'pi pi-plus',
          onClick: () => void this.router.navigate(['/company/users/new']),
        },
      ]
    : [];

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.all().subscribe({
      next: (users) => {
        this.users.set(users);
        this.loading.set(false);
      },
      error: (error: AppError) => {
        this.error.set(error);
        this.loading.set(false);
      },
    });
  }

  edit(row: CompanyUser): void {
    void this.router.navigate(['/company/users', row.id, 'edit']);
  }

  confirmDelete(row: CompanyUser): void {
    this.confirmation.confirm({
      key: 'app-confirm',
      header: this.translate.instant('common.confirm'),
      message: this.translate.instant('common.confirmDelete', { name: row.user.email }),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.translate.instant('common.delete'),
      rejectLabel: this.translate.instant('common.cancel'),
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.delete(row),
    });
  }

  private delete(row: CompanyUser): void {
    this.api.remove(row.id).subscribe({
      next: () => {
        this.notifications.success(this.translate.instant('common.deleted'));
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
