import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ComingSoonComponent } from '../../shared/components/coming-soon/coming-soon.component';

@Component({
  selector: 'app-billing-page',
  imports: [ComingSoonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-coming-soon title="nav.billing" icon="pi-credit-card"></app-coming-soon>
  `,
})
export class BillingPageComponent {}
