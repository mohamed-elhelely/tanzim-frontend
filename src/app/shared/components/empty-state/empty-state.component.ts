import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

/** Shown inside a table when there are no rows. Texts are translation keys. */
@Component({
  selector: 'app-empty-state',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './empty-state.component.html',
})
export class EmptyStateComponent {
  @Input() title = 'common.empty';
  @Input() message?: string;
  @Input() icon = 'pi-inbox';
}
