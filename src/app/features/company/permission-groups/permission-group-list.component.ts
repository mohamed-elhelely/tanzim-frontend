import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { AccessService } from '../../../core/auth/access.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { PageHeaderAction, PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { ServerTable } from '../../../shared/table/server-table';

import { PermissionGroup } from '../company.models';
import { PermissionGroupService } from './permission-group.service';
import { RowActionComponent, RowActionsComponent } from '../../../shared/table/row-actions.component';
import { SavedViewsComponent } from '../../../shared/table/saved-views.component';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { TableComponent } from '../../../shared/ui/table/table.component';
import { TableEmptyDirective, TableHeaderDirective, TableRowDirective } from '../../../shared/ui/table/table-templates';
import { SortableHeaderComponent } from '../../../shared/ui/table/sortable-header.component';
import { TableSelectAllComponent } from '../../../shared/ui/table/table-select-all.component';
import { TableRowSelectComponent } from '../../../shared/ui/table/table-row-select.component';

@Component({
  selector: 'app-permission-group-list',
  imports: [
    TableRowSelectComponent,
    TableSelectAllComponent,
    SortableHeaderComponent,
    TableEmptyDirective,
    TableRowDirective,
    TableHeaderDirective,
    TableComponent,
    ButtonComponent,
    RowActionsComponent,
    RowActionComponent,
    SavedViewsComponent,
    TranslatePipe,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    PageHeaderComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    StatusBadgeComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './permission-group-list.component.html',
})
export class PermissionGroupListComponent implements OnInit {
  private readonly api = inject(PermissionGroupService);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmService);
  private readonly access = inject(AccessService);

  readonly table = new ServerTable<PermissionGroup>((query) => this.api.list(query));

  /** Buttons follow the user's permissions; the backend refuses the rest with 403. */
  readonly canAdd = computed(() => this.access.can('add_permissiongroup'));
  readonly canEdit = computed(() => this.access.can('change_permissiongroup'));
  readonly canDelete = computed(() => this.access.can('delete_permissiongroup'));

  readonly headerActions = computed<PageHeaderAction[]>(() =>
    this.canAdd() ? [{ label: 'company.permissionGroups.new', icon: 'pi pi-plus', onClick: () => void this.router.navigate(['/company/permission-groups/new']) }] : [],
  );

  ngOnInit(): void {
    this.table.load();
  }

  edit(row: PermissionGroup): void {
    void this.router.navigate(['/company/permission-groups', row.id, 'edit']);
  }

  confirmDelete(row: PermissionGroup): void {
    this.confirm.confirmDelete(row.name_en, () => this.api.remove(row.id), () => this.table.afterDelete());
  }

  confirmBulkDelete(): void {
    this.confirm.confirmBulkDelete(
      this.table.selection(),
      (row: PermissionGroup) => this.api.remove(row.id),
      (deleted) => this.table.afterBulkDelete(deleted),
    );
  }
}
