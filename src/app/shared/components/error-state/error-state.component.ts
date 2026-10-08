import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';

/** Full-width error panel for a screen that failed to load (use errorTitleKey() for the title). */
@Component({
  selector: 'app-error-state',
  imports: [TranslatePipe, ButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './error-state.component.html',
})
export class ErrorStateComponent {
  @Input() title = 'common.error';
  @Input() message?: string;
  @Input() showRetry = true;
  @Output() retry = new EventEmitter<void>();
}
