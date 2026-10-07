import { Component, Input } from '@angular/core';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [ConfirmDialogModule],
  template: '<p-confirmDialog [key]="key" [style]="{ width: \'450px\' }"></p-confirmDialog>',
})
export class ConfirmDialogComponent {
  @Input() key: string = 'app-confirm';
}
