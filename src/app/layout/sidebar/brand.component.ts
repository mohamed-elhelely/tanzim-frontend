import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AccessService } from '../../core/auth/access.service';

/** Logo + name at the top of the sidebar and the mobile drawer: the company's (from /me) when it has one. */
@Component({
  selector: 'app-brand',
  imports: [RouterLink, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './brand.component.html',
})
export class BrandComponent {
  private readonly access = inject(AccessService);
  readonly company = computed(() => this.access.current()?.company ?? null);
}
