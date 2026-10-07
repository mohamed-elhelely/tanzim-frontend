import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ProgressBarModule } from 'primeng/progressbar';
import { LoadingService } from '../../../core/services/loading.service';

@Component({
  selector: 'app-loading-bar',
  standalone: true,
  imports: [ProgressBarModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading.isLoading()) {
      <p-progressBar
        mode="indeterminate"
        [showValue]="false"
        styleClass="h-1 !rounded-none !border-0"
      ></p-progressBar>
    }
  `,
})
export class LoadingBarComponent {
  readonly loading = inject(LoadingService);
}
