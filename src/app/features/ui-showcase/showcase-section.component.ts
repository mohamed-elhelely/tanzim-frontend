import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** One block on a /ui page: a title, what it shows, and the examples. */
@Component({
  selector: 'app-showcase-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './showcase-section.component.html',
  host: { class: 'block' },
})
export class ShowcaseSectionComponent {
  readonly heading = input.required<string>();
  readonly note = input<string>();
  /** The markup to copy, shown under the examples. */
  readonly code = input<string>();
}
