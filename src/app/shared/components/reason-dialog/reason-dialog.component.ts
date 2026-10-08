import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TextareaModule } from 'primeng/textarea';

/**
 * A dialog that asks for an optional reason before a destructive workflow step (cancel an order or invoice,
 * record a failed delivery). It only collects the text; the parent runs the action and closes it on success.
 */
@Component({
  selector: 'app-reason-dialog',
  imports: [FormsModule, TranslatePipe, ButtonModule, DialogModule, TextareaModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './reason-dialog.component.html',
})
export class ReasonDialogComponent implements OnChanges {
  @Input() visible = false;
  /** Translation keys. */
  @Input({ required: true }) header!: string;
  @Input() label = 'common.reasonOptional';
  @Input({ required: true }) confirmLabel!: string;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() confirmed = new EventEmitter<string>();

  reason = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible']?.currentValue) {
      this.reason = '';
    }
  }

  close(): void {
    this.visibleChange.emit(false);
  }

  confirm(): void {
    this.confirmed.emit(this.reason.trim());
  }
}
