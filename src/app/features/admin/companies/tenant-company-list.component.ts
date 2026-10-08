import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { AppError } from '../../../core/errors/app-error';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { PageHeaderAction, PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { errorTitleKey } from '../../../shared/utils/server-errors';
import { TenantCompany } from '../admin.models';
import { TenantCompanyService } from './tenant-company.service';

/**
 * No delete action: the backend hard-deletes the company and cascades to all of its data.
 * Deactivate it from the form instead.
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

  readonly companies = signal<TenantCompany[]>([]);
  readonly loading = signal(false);
  readonly error = signal<AppError | null>(null);
  readonly errorTitleKey = errorTitleKey;
  readonly searchFields = ['name', 'legal_name', 'domain', 'email'];

  readonly headerActions: PageHeaderAction[] = [
    {
      label: 'admin.companies.new',
      icon: 'pi pi-plus',
      onClick: () => void this.router.navigate(['/admin/companies/new']),
    },
  ];

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.all().subscribe({
      next: (companies) => {
        this.companies.set(companies);
        this.loading.set(false);
      },
      error: (error: AppError) => {
        this.error.set(error);
        this.loading.set(false);
      },
    });
  }

  edit(row: TenantCompany): void {
    void this.router.navigate(['/admin/companies', row.id, 'edit']);
  }
}
