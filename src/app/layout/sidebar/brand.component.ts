import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

/** Logo + app name at the top of the sidebar and the mobile drawer. */
@Component({
  selector: 'app-brand',
  imports: [RouterLink, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './brand.component.html',
})
export class BrandComponent {}
