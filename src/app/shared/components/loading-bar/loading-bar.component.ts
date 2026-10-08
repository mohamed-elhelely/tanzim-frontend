import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ProgressBarModule } from 'primeng/progressbar';
import { LoadingService } from '../../../core/services/loading.service';

/** Thin bar at the top of the page while any HTTP request is in flight (LoadingService). */
@Component({
  selector: 'app-loading-bar',
  imports: [ProgressBarModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './loading-bar.component.html',
})
export class LoadingBarComponent {
  readonly loading = inject(LoadingService);
}
