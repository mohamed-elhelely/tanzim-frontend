import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

@Component({
    selector: 'app-inventory-page',
    imports: [PageHeaderComponent, EmptyStateComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <app-page-header title="nav.inventory" subtitle="common.comingSoon"></app-page-header>
    <app-empty-state title="common.empty" icon="pi-box"></app-empty-state>
  `
})
export class InventoryPageComponent {}
