import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-error-state',
  imports: [TranslatePipe, ButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './error-state.component.html',
  styleUrl: './error-state.component.scss',
})
export class ErrorStateComponent {
  @Input() title = 'common.error';
  @Input() message?: string;
  @Input() showRetry = true;
  @Output() retry = new EventEmitter<void>();
}
