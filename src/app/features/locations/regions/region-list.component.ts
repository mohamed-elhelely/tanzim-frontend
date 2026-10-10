import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
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
import { LocalizedNamePipe } from '../../../shared/pipes/localized-name.pipe';
import { ServerTable } from '../../../shared/table/server-table';
import { errorTitleKey } from '../../../shared/utils/server-errors';
import { FormDialogService } from '../../../shared/forms/form-dialog.service';
import { Region } from '../locations.models';
import { RegionFormComponent } from './region-form.component';
import { RegionService } from './region.service';

@Component({
  selector: 'app-region-list',
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
  readonly errorTitleKey = errorTitleKey;

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
}
