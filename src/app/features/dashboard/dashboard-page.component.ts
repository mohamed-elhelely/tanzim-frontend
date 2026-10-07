import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { CardModule } from 'primeng/card';
import { SkeletonModule } from 'primeng/skeleton';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

@Component({
    selector: 'app-dashboard-page',
    imports: [TranslatePipe, CardModule, SkeletonModule, PageHeaderComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './dashboard-page.component.html'
})
export class DashboardPageComponent {
  readonly statSlots = [0, 1, 2, 3];
  readonly activitySlots = [0, 1, 2, 3, 4];
}
