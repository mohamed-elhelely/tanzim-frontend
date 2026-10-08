import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ComingSoonComponent } from '../../shared/components/coming-soon/coming-soon.component';

@Component({
  selector: 'app-inventory-page',
  imports: [ComingSoonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-coming-soon title="nav.inventory" icon="pi-box"></app-coming-soon>
  `,
})
export class InventoryPageComponent {}
