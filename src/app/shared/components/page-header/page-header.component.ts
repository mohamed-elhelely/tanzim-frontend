import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';

export interface PageHeaderAction {
  label: string;
  icon?: string;
  severity?: 'success' | 'info' | 'warn' | 'danger' | 'help' | 'primary' | 'secondary' | 'contrast';
  onClick: () => void;
  disabled?: boolean;
}

/** Page title with an optional back link (forms) and action buttons (lists). Texts are translation keys. */
@Component({
  selector: 'app-page-header',
  imports: [TranslatePipe, ButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './page-header.component.html',
})
export class PageHeaderComponent {
  @Input() title = '';
  @Input() subtitle?: string;
  @Input() showBack = false;
  @Input() backLabel = 'common.back';
  @Input() actions: PageHeaderAction[] = [];
  @Output() back = new EventEmitter<void>();
}
