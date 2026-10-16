import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { AccessService } from '../../../core/auth/access.service';
import { AppError } from '../../../core/errors/app-error';
import { ConfirmService } from '../../../core/services/confirm.service';
import { LanguageService } from '../../../core/services/language.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { PageHeaderAction, PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { LocalizedNamePipe } from '../../../shared/pipes/localized-name.pipe';

import { CompanyUser } from '../company.models';
import { RowActionComponent, RowActionsComponent } from '../../../shared/table/row-actions.component';
import { CompanyUserService } from './company-user.service';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { TableComponent } from '../../../shared/ui/table/table.component';
import { TableEmptyDirective, TableHeaderDirective, TableRowDirective } from '../../../shared/ui/table/table-templates';
import { SortableHeaderComponent } from '../../../shared/ui/table/sortable-header.component';

/** The company-user endpoint returns the full list, so paging, sorting and search happen in the table. */
@Component({
  selector: 'app-user-list',
  imports: [
    SortableHeaderComponent,
    TableEmptyDirective,
    TableRowDirective,
    TableHeaderDirective,
    TableComponent,
    ButtonComponent,
    RowActionsComponent,
    RowActionComponent,
    TranslatePipe,
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
  templateUrl: './user-list.component.html',
})
export class UserListComponent implements OnInit {
  private readonly api = inject(CompanyUserService);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmService);
  private readonly access = inject(AccessService);

  readonly lang = inject(LanguageService).currentLang;
  readonly users = signal<CompanyUser[]>([]);
  readonly loading = signal(false);
  readonly error = signal<AppError | null>(null);
  readonly searchFields = ['user.first_name', 'user.last_name', 'user.email'];
  /** What the search box shows, and the term the table is currently filtered by. */
  readonly searchDraft = signal('');
  readonly appliedSearch = signal('');

  /** Buttons follow the user's permissions; the backend refuses the rest with 403. */
  readonly canAdd = computed(() => this.access.can('add_companyuser'));
  readonly canEdit = computed(() => this.access.can('change_companyuser'));
  readonly canDelete = computed(() => this.access.can('delete_companyuser'));

  readonly headerActions = computed<PageHeaderAction[]>(() =>
    this.canAdd()
      ? [{ label: 'company.users.new', icon: 'pi pi-plus', onClick: () => void this.router.navigate(['/company/users/new']) }]
      : [],
  );

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
    this.confirm.confirmDelete(row.user.email, () => this.api.remove(row.id), () => this.load());
  }
}
