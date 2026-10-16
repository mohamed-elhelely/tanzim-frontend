import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CardModule } from 'primeng/card';

/** A content card. Layout classes on the element (`class="lg:col-span-2"`) place it in a grid. */
@Component({
  selector: 'app-card',
  imports: [CardModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './card.component.html',
  host: { class: 'block' },
})
export class CardComponent {}
