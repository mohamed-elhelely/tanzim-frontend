import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { ConfirmService } from '../../../core/services/confirm.service';
import { LanguageService } from '../../../core/services/language.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { PageHeaderAction, PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { ImportExportActionsComponent } from '../../import-export/import-export-actions.component';
import { LocalizedNamePipe } from '../../../shared/pipes/localized-name.pipe';
import { ServerTable } from '../../../shared/table/server-table';

import { FormDialogService } from '../../../shared/forms/form-dialog.service';
import { Region } from '../locations.models';
import { RegionFormComponent } from './region-form.component';
import { RegionService } from './region.service';
import { RowActionComponent, RowActionsComponent } from '../../../shared/table/row-actions.component';
import { SavedViewsComponent } from '../../../shared/table/saved-views.component';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { TableComponent } from '../../../shared/ui/table/table.component';
import { TableEmptyDirective, TableHeaderDirective, TableRowDirective } from '../../../shared/ui/table/table-templates';
import { SortableHeaderComponent } from '../../../shared/ui/table/sortable-header.component';
import { TableSelectAllComponent } from '../../../shared/ui/table/table-select-all.component';
import { TableRowSelectComponent } from '../../../shared/ui/table/table-row-select.component';

@Component({
  selector: 'app-region-list',
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
    ImportExportActionsComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    LocalizedNamePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './region-list.component.html',
})
export class RegionListComponent implements OnInit {
  private readonly api = inject(RegionService);
  private readonly formDialog = inject(FormDialogService);
  private readonly confirm = inject(ConfirmService);

  readonly lang = inject(LanguageService).currentLang;

  readonly table = new ServerTable<Region>((query) => this.api.list(query));

  readonly headerActions: PageHeaderAction[] = [
    {
      label: 'locations.regions.new',
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
      .open(RegionFormComponent, { header: id ? 'locations.regions.edit' : 'locations.regions.new', id })
      .subscribe(() => this.table.load());
  }

  edit(row: Region): void {
    this.openForm(row.id);
  }

  confirmDelete(row: Region): void {
    this.confirm.confirmDelete(row.name_en, () => this.api.remove(row.id), () => this.table.afterDelete());
  }

  confirmBulkDelete(): void {
    this.confirm.confirmBulkDelete(
      this.table.selection(),
      (row: Region) => this.api.remove(row.id),
      (deleted) => this.table.afterBulkDelete(deleted),
    );
  }
}
