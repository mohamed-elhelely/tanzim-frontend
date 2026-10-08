import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TagModule } from 'primeng/tag';

/** Small coloured tag (PrimeNG Tag), e.g. Yes/No in the Active column. */
@Component({
  selector: 'app-status-badge',
  imports: [TagModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './status-badge.component.html',
})
export class StatusBadgeComponent {
  @Input() value = '';
  @Input() severity: 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast' = 'info';
  @Input() icon?: string;
}
