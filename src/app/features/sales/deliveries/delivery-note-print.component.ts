import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AccessService } from '../../../core/auth/access.service';
import { AppError } from '../../../core/errors/app-error';
import { PrintLayoutComponent } from '../../../shared/components/print-layout/print-layout.component';
import { DeliveryNote } from '../sales.models';
import { DeliveryNoteService } from './delivery-note.service';

/**
 * A delivery note on paper, to travel with the goods: customer, warehouse, carrier, the quantities shipped and
 * space for the receiver's signature. Opened from the delivery note page in a new tab with `?print=1`.
 */
@Component({
  selector: 'app-delivery-note-print',
  imports: [DecimalPipe, TranslatePipe, PrintLayoutComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './delivery-note-print.component.html',
})
export class DeliveryNotePrintComponent implements OnInit {
  private readonly api = inject(DeliveryNoteService);
  private readonly access = inject(AccessService);
  private readonly route = inject(ActivatedRoute);

  readonly note = signal<DeliveryNote | null>(null);
  readonly error = signal<AppError | null>(null);
  readonly warningKey = computed(() => {
    const status = this.note()?.status;
    return status === 'draft' || status === 'failed' ? `sales.deliveryStatuses.${status}` : null;
  });

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    const autoPrint = this.route.snapshot.queryParamMap.get('print') === '1';
    this.access.load().subscribe();
    this.api.detail(id).subscribe({
      next: (note) => {
        this.note.set(note);
        if (autoPrint) {
          setTimeout(() => window.print(), 500);
        }
      },
      error: (error: AppError) => this.error.set(error),
    });
  }
}
