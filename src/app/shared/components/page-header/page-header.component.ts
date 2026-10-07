import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';

export interface PageHeaderAction {
  label: string;
  icon?: string;
  severity?: 'success' | 'info' | 'warning' | 'danger' | 'help' | 'primary' | 'secondary' | 'contrast';
  onClick: () => void;
  disabled?: boolean;
}

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [TranslatePipe, ButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './page-header.component.html',
  styleUrl: './page-header.component.scss',
})
export class PageHeaderComponent {
  @Input() title = '';
  @Input() subtitle?: string;
  @Input() showBack = false;
  @Input() backLabel = 'common.back';
  @Input() actions: PageHeaderAction[] = [];
  @Output() back = new EventEmitter<void>();
}
