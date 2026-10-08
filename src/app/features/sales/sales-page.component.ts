import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ComingSoonComponent } from '../../shared/components/coming-soon/coming-soon.component';

@Component({
  selector: 'app-sales-page',
  imports: [ComingSoonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-coming-soon title="nav.sales" icon="pi-shopping-cart"></app-coming-soon>
  `,
})
export class SalesPageComponent {}
