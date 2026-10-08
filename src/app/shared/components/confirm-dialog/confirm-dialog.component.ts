import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { CONFIRM_DIALOG_KEY } from '../../../core/services/confirm.service';

/** The one confirm dialog, hosted by the shell. Open it through ConfirmService. */
@Component({
  selector: 'app-confirm-dialog',
  imports: [ConfirmDialogModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './confirm-dialog.component.html',
})
export class ConfirmDialogComponent {
  readonly key = CONFIRM_DIALOG_KEY;
}
