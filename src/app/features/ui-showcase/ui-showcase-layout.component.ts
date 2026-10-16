import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { LanguageService } from '../../core/services/language.service';
import { ThemeService } from '../../core/services/theme.service';
import { UI_SHOWCASE_PAGES } from './ui-showcase.routes';

/** The /ui frame: page list, language and dark mode switches, and the current page. */
@Component({
  selector: 'app-ui-showcase-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ui-showcase-layout.component.html',
})
export class UiShowcaseLayoutComponent {
  readonly language = inject(LanguageService);
  readonly theme = inject(ThemeService);
  readonly pages = UI_SHOWCASE_PAGES;
}
