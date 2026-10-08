import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { AccessService } from '../../../core/auth/access.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { LanguageService } from '../../../core/services/language.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { PageHeaderAction, PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { localizedName } from '../../../shared/pipes/localized-name.pipe';
import { ServerTable } from '../../../shared/table/server-table';
import { errorTitleKey } from '../../../shared/utils/server-errors';
import { Permission } from '../company.models';
import { PermissionService } from './permission.service';

@Component({
  selector: 'app-permission-list',
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
  private readonly confirm = inject(ConfirmService);
  private readonly access = inject(AccessService);
  private readonly lang = inject(LanguageService).currentLang;

  readonly table = new ServerTable<Permission>((query) => this.api.list(query));
  readonly errorTitleKey = errorTitleKey;

  /** Buttons follow the user's permissions; the backend refuses the rest with 403. */
  readonly canAdd = computed(() => this.access.can('add_permission'));
  readonly canEdit = computed(() => this.access.can('change_permission'));
  readonly canDelete = computed(() => this.access.can('delete_permission'));

  readonly headerActions = computed<PageHeaderAction[]>(() =>
    this.canAdd() ? [{ label: 'company.permissions.new', icon: 'pi pi-plus', onClick: () => void this.router.navigate(['/company/permissions/new']) }] : [],
  );

  ngOnInit(): void {
    this.table.load();
  }

  groupNames(row: Permission): string {
    return (row.groups ?? []).map((group) => localizedName(group, this.lang())).join(', ');
  }

  edit(row: Permission): void {
    void this.router.navigate(['/company/permissions', row.id, 'edit']);
  }

  confirmDelete(row: Permission): void {
    this.confirm.confirmDelete(row.codename, () => this.api.remove(row.id), () => this.table.afterDelete());
  }
}
