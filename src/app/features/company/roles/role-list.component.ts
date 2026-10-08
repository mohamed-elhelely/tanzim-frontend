import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { ConfirmService } from '../../../core/services/confirm.service';
import { LanguageService } from '../../../core/services/language.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { PageHeaderAction, PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { localizedName } from '../../../shared/pipes/localized-name.pipe';
import { ServerTable } from '../../../shared/table/server-table';
import { errorTitleKey } from '../../../shared/utils/server-errors';
import { Role } from '../company.models';
import { RoleService } from './role.service';

@Component({
  selector: 'app-role-list',
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
  templateUrl: './role-list.component.html',
})
export class RoleListComponent implements OnInit {
  private readonly api = inject(RoleService);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmService);
  private readonly lang = inject(LanguageService).currentLang;

  readonly table = new ServerTable<Role>((query) => this.api.list(query));
  readonly errorTitleKey = errorTitleKey;

  readonly headerActions: PageHeaderAction[] = [
    {
      label: 'company.roles.new',
      icon: 'pi pi-plus',
      onClick: () => void this.router.navigate(['/company/roles/new']),
    },
  ];

  ngOnInit(): void {
    this.table.load();
  }

  groupNames(row: Role): string {
    return (row.permission_groups ?? []).map((group) => localizedName(group, this.lang())).join(', ');
  }

  edit(row: Role): void {
    void this.router.navigate(['/company/roles', row.id, 'edit']);
  }

  confirmDelete(row: Role): void {
    this.confirm.confirmDelete(row.name_en, () => this.api.remove(row.id), () => this.table.afterDelete());
  }
}
