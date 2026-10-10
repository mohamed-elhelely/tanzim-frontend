import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { ConfirmService } from '../../../core/services/confirm.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { PageHeaderAction, PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { ServerTable } from '../../../shared/table/server-table';
import { errorTitleKey } from '../../../shared/utils/server-errors';
import { FormDialogService } from '../../../shared/forms/form-dialog.service';
import { Zone } from '../inventory.models';
import { ZoneFormComponent } from './zone-form.component';
import { ZoneService } from './zone.service';

@Component({
  selector: 'app-zone-list',
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
  templateUrl: './zone-list.component.html',
})
export class ZoneListComponent implements OnInit {
  private readonly api = inject(ZoneService);
  private readonly formDialog = inject(FormDialogService);
  private readonly confirm = inject(ConfirmService);

  readonly table = new ServerTable<Zone>((query) => this.api.list(query));
  readonly errorTitleKey = errorTitleKey;

  readonly headerActions: PageHeaderAction[] = [
    {
      label: 'inventory.zones.new',
      icon: 'pi pi-plus',
      onClick: () => this.openForm(),
    },
  ];

  ngOnInit(): void {
    this.table.load();
  }

  /** Create (no id) or edit in a dialog over the list; the list reloads after a save. */
  openForm(id?: number): void {
    this.formDialog
      .open(ZoneFormComponent, { header: id ? 'inventory.zones.edit' : 'inventory.zones.new', id })
      .subscribe(() => this.table.load());
  }

  edit(row: Zone): void {
    this.openForm(row.id);
  }

  confirmDelete(row: Zone): void {
    this.confirm.confirmDelete(row.name, () => this.api.remove(row.id), () => this.table.afterDelete());
  }
}
