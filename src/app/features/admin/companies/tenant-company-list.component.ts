import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { PageHeaderAction, PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { ServerTable } from '../../../shared/table/server-table';
import { errorTitleKey } from '../../../shared/utils/server-errors';
import { TenantCompany } from '../admin.models';
import { TenantCompanyService } from './tenant-company.service';

/**
 * No delete action: the backend's DELETE deactivates the company, which the form's Active switch already does
 * (and PATCH is_active=true reactivates it).
 */
@Component({
  selector: 'app-tenant-company-list',
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
  templateUrl: './tenant-company-list.component.html',
})
export class TenantCompanyListComponent implements OnInit {
  private readonly api = inject(TenantCompanyService);
  private readonly router = inject(Router);

  readonly table = new ServerTable<TenantCompany>((query) => this.api.list(query));
  readonly errorTitleKey = errorTitleKey;

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
