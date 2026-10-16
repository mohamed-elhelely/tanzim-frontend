import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { PageHeaderAction, PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { ServerTable } from '../../../shared/table/server-table';

import { TenantCompany } from '../admin.models';
import { TenantCompanyService } from './tenant-company.service';
import { RowActionComponent, RowActionsComponent } from '../../../shared/table/row-actions.component';
import { SavedViewsComponent } from '../../../shared/table/saved-views.component';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { TableComponent } from '../../../shared/ui/table/table.component';
import { TableEmptyDirective, TableHeaderDirective, TableRowDirective } from '../../../shared/ui/table/table-templates';
import { SortableHeaderComponent } from '../../../shared/ui/table/sortable-header.component';

/**
 * No delete action: the backend's DELETE deactivates the company, which the form's Active switch already does
 * (and PATCH is_active=true reactivates it).
 */
@Component({
  selector: 'app-tenant-company-list',
  imports: [
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
  templateUrl: './tenant-company-list.component.html',
})
export class TenantCompanyListComponent implements OnInit {
  private readonly api = inject(TenantCompanyService);
  private readonly router = inject(Router);

  readonly table = new ServerTable<TenantCompany>((query) => this.api.list(query));

  readonly headerActions: PageHeaderAction[] = [
    {
      label: 'admin.companies.new',
      icon: 'pi pi-plus',
      onClick: () => void this.router.navigate(['/admin/companies/new']),
    },
  ];

  ngOnInit(): void {
    this.table.load();
  }

  edit(row: TenantCompany): void {
    void this.router.navigate(['/admin/companies', row.id, 'edit']);
  }
}
