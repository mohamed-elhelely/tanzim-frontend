import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { AccessService } from '../../../core/auth/access.service';
import { isSystemCodename } from '../../../core/auth/permission-catalog';
import { ConfirmService } from '../../../core/services/confirm.service';
import { LanguageService } from '../../../core/services/language.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { PageHeaderAction, PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { localizedName } from '../../../shared/pipes/localized-name.pipe';
import { ServerTable } from '../../../shared/table/server-table';
import { errorTitleKey } from '../../../shared/utils/server-errors';
import { FormDialogService } from '../../../shared/forms/form-dialog.service';
import { Permission } from '../company.models';
import { PermissionFormComponent } from './permission-form.component';
import { PermissionService } from './permission.service';

@Component({
  selector: 'app-permission-list',
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
  templateUrl: './permission-list.component.html',
})
export class PermissionListComponent implements OnInit {
  private readonly api = inject(PermissionService);
  private readonly formDialog = inject(FormDialogService);
  private readonly confirm = inject(ConfirmService);
  private readonly access = inject(AccessService);
  private readonly lang = inject(LanguageService).currentLang;

  readonly table = new ServerTable<Permission>((query) => this.api.list(query));
  readonly errorTitleKey = errorTitleKey;
  /** Catalog permissions can't be changed or deleted (the backend answers 403). */
  readonly isSystem = (row: Permission) => isSystemCodename(row.codename);

  /** Buttons follow the user's permissions; the backend refuses the rest with 403. */
  readonly canAdd = computed(() => this.access.can('add_permission'));
  readonly canEdit = computed(() => this.access.can('change_permission'));
  readonly canDelete = computed(() => this.access.can('delete_permission'));

  readonly headerActions = computed<PageHeaderAction[]>(() =>
    this.canAdd() ? [{ label: 'company.permissions.new', icon: 'pi pi-plus', onClick: () => this.openForm() }] : [],
  );

  ngOnInit(): void {
    this.table.load();
  }

  groupNames(row: Permission): string {
    return (row.groups ?? []).map((group) => localizedName(group, this.lang())).join(', ');
  }

  /** Create (no id) or edit in a dialog over the list; the list reloads after a save. */
  openForm(id?: number): void {
    this.formDialog
      .open(PermissionFormComponent, { header: id ? 'company.permissions.edit' : 'company.permissions.new', id })
      .subscribe(() => this.table.load());
  }

  edit(row: Permission): void {
    this.openForm(row.id);
  }

  confirmDelete(row: Permission): void {
    this.confirm.confirmDelete(row.codename, () => this.api.remove(row.id), () => this.table.afterDelete());
  }
}
