import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { AccessService } from '../../../core/auth/access.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { PageHeaderAction, PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { ServerTable } from '../../../shared/table/server-table';
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
  templateUrl: './permission-group-list.component.html',
})
export class PermissionGroupListComponent implements OnInit {
  private readonly api = inject(PermissionGroupService);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmService);
  private readonly access = inject(AccessService);

  readonly table = new ServerTable<PermissionGroup>((query) => this.api.list(query));
  readonly errorTitleKey = errorTitleKey;

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
}
