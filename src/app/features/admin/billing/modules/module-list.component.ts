import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { AppError } from '../../../../core/errors/app-error';
import { ConfirmService } from '../../../../core/services/confirm.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { PageHeaderAction, PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { FormDialogService } from '../../../../shared/forms/form-dialog.service';

import { BillingModule } from '../platform-billing.models';
import { BillingModuleService } from '../platform-billing.service';
import { RowActionComponent, RowActionsComponent } from '../../../../shared/table/row-actions.component';
import { ModuleFormComponent } from './module-form.component';
import { TableComponent } from '../../../../shared/ui/table/table.component';
import { TableEmptyDirective, TableHeaderDirective, TableRowDirective } from '../../../../shared/ui/table/table-templates';

/** /admin/modules: the feature modules companies can subscribe to (staff). */
@Component({
  selector: 'app-module-list',
  imports: [TableEmptyDirective, TableRowDirective, TableHeaderDirective, TableComponent, RowActionsComponent, RowActionComponent, DecimalPipe, TranslatePipe, PageHeaderComponent, EmptyStateComponent, ErrorStateComponent, StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './module-list.component.html',
})
export class ModuleListComponent implements OnInit {
  private readonly api = inject(BillingModuleService);
  private readonly formDialog = inject(FormDialogService);
  private readonly confirm = inject(ConfirmService);

  readonly modules = signal<BillingModule[]>([]);
  readonly loading = signal(true);
  readonly error = signal<AppError | null>(null);
  readonly headerActions: PageHeaderAction[] = [{ label: 'admin.billing.modules.new', icon: 'pi pi-plus', onClick: () => this.openForm() }];

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.all().subscribe({
      next: (modules) => {
        this.modules.set(modules);
        this.loading.set(false);
      },
      error: (error: AppError) => {
        this.error.set(error);
        this.loading.set(false);
      },
    });
  }

  /** Create (no id) or edit in a dialog over the list; the list reloads after a save. */
  openForm(id?: number): void {
    this.formDialog
      .open(ModuleFormComponent, { header: id ? 'admin.billing.modules.edit' : 'admin.billing.modules.new', id })
      .subscribe(() => this.load());
  }

  confirmDelete(module: BillingModule): void {
    this.confirm.confirmDelete(module.name, () => this.api.remove(module.id), () => this.load());
  }
}
