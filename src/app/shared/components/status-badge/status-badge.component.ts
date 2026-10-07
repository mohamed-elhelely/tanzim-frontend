import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TagModule } from 'primeng/tag';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [TagModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './status-badge.component.html',
  styleUrl: './status-badge.component.scss',
})
export class StatusBadgeComponent {
  @Input() value = '';
  @Input() severity: 'success' | 'secondary' | 'info' | 'warning' | 'danger' | 'contrast' = 'info';
  @Input() icon?: string;
}
