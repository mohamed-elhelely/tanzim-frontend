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
import { ServerTable } from '../../../shared/table/server-table';
import { errorTitleKey } from '../../../shared/utils/server-errors';
import { Country } from '../locations.models';
import { CountryService } from './country.service';

@Component({
  selector: 'app-country-list',
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
  templateUrl: './country-list.component.html',
})
export class CountryListComponent implements OnInit {
  private readonly api = inject(CountryService);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmService);

  readonly lang = inject(LanguageService).currentLang;

  readonly table = new ServerTable<Country>((query) => this.api.list(query));
  readonly errorTitleKey = errorTitleKey;

  readonly headerActions: PageHeaderAction[] = [
    {
      label: 'locations.countries.new',
      icon: 'pi pi-plus',
      onClick: () => void this.router.navigate(['/locations/countries/new']),
    },
  ];

  ngOnInit(): void {
    this.table.load();
  }

  edit(row: Country): void {
    void this.router.navigate(['/locations/countries', row.id, 'edit']);
  }

  confirmDelete(row: Country): void {
    this.confirm.confirmDelete(row.name_en, () => this.api.remove(row.id), () => this.table.afterDelete());
  }
}
