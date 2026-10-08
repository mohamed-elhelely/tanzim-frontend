import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
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
import { Team } from '../company.models';
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
  private readonly router = inject(Router);
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
    this.canAdd() ? [{ label: 'company.teams.new', icon: 'pi pi-plus', onClick: () => void this.router.navigate(['/company/teams/new']) }] : [],
  );

  ngOnInit(): void {
    this.table.load();
  }

  leadNames(row: Team): string {
    return (row.leads ?? []).map((lead) => userName(lead)).join(', ');
  }

  edit(row: Team): void {
    void this.router.navigate(['/company/teams', row.id, 'edit']);
  }

  confirmDelete(row: Team): void {
    this.confirm.confirmDelete(row.name_en, () => this.api.remove(row.id), () => this.table.afterDelete());
  }
}
