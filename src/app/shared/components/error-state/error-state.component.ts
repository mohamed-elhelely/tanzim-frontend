import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { AppError } from '../../../core/errors/app-error';
import { errorTitleKey } from '../../utils/server-errors';
import { ButtonComponent } from '../../ui/button/button.component';

/**
 * Full-width error panel for a screen that failed to load. Pass the `error` and the title follows its status
 * (not found, no access, or a general error); `title` is for panels without an HTTP error.
 */
@Component({
  selector: 'app-error-state',
  imports: [ButtonComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './error-state.component.html',
})
export class ErrorStateComponent {
  @Input() error?: AppError | null;
  @Input() title = 'common.error';
  @Input() message?: string;
  @Input() showRetry = true;
  @Output() retry = new EventEmitter<void>();

  get heading(): string {
    return this.error ? errorTitleKey(this.error) : this.title;
  }
}
