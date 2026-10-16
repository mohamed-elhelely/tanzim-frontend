import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ButtonComponent, CardComponent } from '../../../shared/ui';
import { ShowcaseSectionComponent } from '../showcase-section.component';

@Component({
  selector: 'app-cards-page',
  imports: [ButtonComponent, CardComponent, ShowcaseSectionComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cards-page.component.html',
})
export class CardsPageComponent {
  readonly code = {
    basic: `<app-card>…content…</app-card>`,
    grid: `<div class="grid gap-4 lg:grid-cols-3">\n  <app-card class="lg:col-span-2">…</app-card>\n  <app-card>…</app-card>\n</div>`,
  };
}
