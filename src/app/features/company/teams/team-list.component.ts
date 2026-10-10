import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { AccessService } from '../../../core/auth/access.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { LanguageService } from '../../../core/services/language.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { PageHeaderAction, PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { LocalizedNamePipe } from '../../../shared/pipes/localized-name.pipe';
import { userName } from '../../../shared/pipes/user-name.pipe';
import { ServerTable } from '../../../shared/table/server-table';
import { errorTitleKey } from '../../../shared/utils/server-errors';
import { FormDialogService } from '../../../shared/forms/form-dialog.service';
import { Team } from '../company.models';
import { TeamFormComponent } from './team-form.component';
import { TeamService } from './team.service';

@Component({
  selector: 'app-team-list',
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
  templateUrl: './team-list.component.html',
})
export class TeamListComponent implements OnInit {
  private readonly api = inject(TeamService);
  private readonly formDialog = inject(FormDialogService);
  private readonly confirm = inject(ConfirmService);
  private readonly access = inject(AccessService);

  readonly lang = inject(LanguageService).currentLang;

  readonly table = new ServerTable<Team>((query) => this.api.list(query));
  readonly errorTitleKey = errorTitleKey;

  /** Buttons follow the user's permissions; the backend refuses the rest with 403. */
  readonly canAdd = computed(() => this.access.can('add_team'));
  readonly canEdit = computed(() => this.access.can('change_team'));
  readonly canDelete = computed(() => this.access.can('delete_team'));

  readonly headerActions = computed<PageHeaderAction[]>(() =>
    this.canAdd() ? [{ label: 'company.teams.new', icon: 'pi pi-plus', onClick: () => this.openForm() }] : [],
  );

  ngOnInit(): void {
    this.table.load();
  }

  leadNames(row: Team): string {
    return (row.leads ?? []).map((lead) => userName(lead)).join(', ');
  }

  /** Create (no id) or edit in a dialog over the list; the list reloads after a save. */
  openForm(id?: number): void {
    this.formDialog
      .open(TeamFormComponent, { header: id ? 'company.teams.edit' : 'company.teams.new', id })
      .subscribe(() => this.table.load());
  }

  edit(row: Team): void {
    this.openForm(row.id);
  }

  confirmDelete(row: Team): void {
    this.confirm.confirmDelete(row.name_en, () => this.api.remove(row.id), () => this.table.afterDelete());
  }
}
