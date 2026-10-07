import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ComingSoonComponent } from '../../shared/components/coming-soon/coming-soon.component';

@Component({
  selector: 'app-returns-page',
  imports: [ComingSoonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-coming-soon title="nav.returns" icon="pi-replay"></app-coming-soon>
  `,
})
export class ReturnsPageComponent {}
