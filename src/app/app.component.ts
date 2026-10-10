import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LanguageService } from './core/services/language.service';
import { ThemeService } from './core/services/theme.service';
import { BrandThemeService } from './core/theme/brand-theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.component.html',
})
export class AppComponent {
  private readonly language = inject(LanguageService);
  private readonly theme = inject(ThemeService);
  private readonly brand = inject(BrandThemeService);

  constructor() {
    this.language.init();
    this.theme.init();
    this.brand.init();
  }
}
