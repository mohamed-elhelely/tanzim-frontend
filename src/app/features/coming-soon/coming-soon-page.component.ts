import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

/**
 * Placeholder for sections that aren't built yet. One component for all of them:
 * the route's `data` gives the title (`titleKey`, also used by the header breadcrumb) and the `icon`.
 */
@Component({
  selector: 'app-coming-soon-page',
  imports: [TranslatePipe, RouterLink, ButtonModule, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './coming-soon-page.component.html',
})
export class ComingSoonPageComponent {
  private readonly data = inject(ActivatedRoute).snapshot.data;

  readonly titleKey: string = this.data['titleKey'] ?? '';
  readonly icon: string = this.data['icon'] ?? 'pi-clock';
}
