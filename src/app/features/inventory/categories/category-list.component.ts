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
import { Category } from '../inventory.models';
import { CategoryFormComponent } from './category-form.component';
import { CategoryService } from './category.service';

@Component({
  selector: 'app-category-list',
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
  templateUrl: './category-list.component.html',
})
export class CategoryListComponent implements OnInit {
  private readonly api = inject(CategoryService);
  private readonly formDialog = inject(FormDialogService);
  private readonly confirm = inject(ConfirmService);

  readonly table = new ServerTable<Category>((query) => this.api.list(query));
  readonly errorTitleKey = errorTitleKey;

  readonly headerActions: PageHeaderAction[] = [
    {
      label: 'inventory.categories.new',
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
      .open(CategoryFormComponent, { header: id ? 'inventory.categories.edit' : 'inventory.categories.new', id })
      .subscribe(() => this.table.load());
  }

  edit(row: Category): void {
    this.openForm(row.id);
  }

  confirmDelete(row: Category): void {
    this.confirm.confirmDelete(row.name, () => this.api.remove(row.id), () => this.table.afterDelete());
  }
}
