import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

@Component({
  selector: 'app-loading-state',
  imports: [ProgressSpinnerModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './loading-state.component.html',
  styleUrl: './loading-state.component.scss',
})
export class LoadingStateComponent {
  @Input() message = 'common.loading';
  @Input() showMessage = true;
}
