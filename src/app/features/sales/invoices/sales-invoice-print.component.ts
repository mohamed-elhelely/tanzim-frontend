import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AccessService } from '../../../core/auth/access.service';
import { AppError } from '../../../core/errors/app-error';
import { PrintLayoutComponent } from '../../../shared/components/print-layout/print-layout.component';
import { SalesInvoice } from '../sales.models';
import { SalesInvoiceService } from './sales-invoice.service';

/**
 * A sales invoice laid out for paper (PrintLayoutComponent), outside the app shell: customer, lines and totals.
 * The browser's print dialog also saves it as PDF. Opened from the invoice page in a new tab with `?print=1`,
 * which opens the print dialog as soon as the invoice is shown.
 */
@Component({
  selector: 'app-sales-invoice-print',
  imports: [DecimalPipe, TranslatePipe, PrintLayoutComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sales-invoice-print.component.html',
})
export class SalesInvoicePrintComponent implements OnInit {
  private readonly api = inject(SalesInvoiceService);
  private readonly access = inject(AccessService);
  private readonly route = inject(ActivatedRoute);

  readonly invoice = signal<SalesInvoice | null>(null);
  readonly error = signal<AppError | null>(null);
  /** Drafts and cancelled invoices say so on paper. */
  readonly warningKey = computed(() => {
    const status = this.invoice()?.status;
    return status === 'draft' || status === 'cancelled' ? `sales.invoiceStatuses.${status}` : null;
  });

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    const autoPrint = this.route.snapshot.queryParamMap.get('print') === '1';
    // Branding comes from /me; the invoice prints without it if /me fails.
    this.access.load().subscribe();
    this.api.detail(id).subscribe({
      next: (invoice) => {
        this.invoice.set(invoice);
        if (autoPrint) {
          // Let the page (and the logo) render before the dialog freezes it.
          setTimeout(() => this.print(), 500);
        }
      },
      error: (error: AppError) => this.error.set(error),
    });
  }

  print(): void {
    window.print();
  }

  /** The discount column only shows when a line has one. */
  hasDiscount(invoice: SalesInvoice): boolean {
    return invoice.lines.some((line) => Number(line.discount_percent) > 0);
  }
}
