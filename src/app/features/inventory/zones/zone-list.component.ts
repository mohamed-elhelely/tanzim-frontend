import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
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
import { CodedRef, Zone } from '../inventory.models';
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
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmService);

  readonly table = new ServerTable<Zone>((query) => this.api.list(query));
  readonly errorTitleKey = errorTitleKey;
  /** ⚠️ The list endpoint doesn't return `code`; the dropdown does, so codes are looked up by id. */
  readonly codes = signal<ReadonlyMap<number, string>>(new Map());

  readonly headerActions: PageHeaderAction[] = [
    {
      label: 'inventory.zones.new',
      icon: 'pi pi-plus',
      onClick: () => void this.router.navigate(['/inventory/zones/new']),
    },
  ];

  ngOnInit(): void {
    this.table.load();
    this.api.dropdown<CodedRef>().subscribe({
      next: (items) => this.codes.set(new Map(items.map((item) => [item.id, item.code]))),
      error: () => this.codes.set(new Map()),
    });
  }

  edit(row: Zone): void {
    void this.router.navigate(['/inventory/zones', row.id, 'edit']);
  }

  confirmDelete(row: Zone): void {
    this.confirm.confirmDelete(row.name, () => this.api.remove(row.id), () => this.table.afterDelete());
  }
}
