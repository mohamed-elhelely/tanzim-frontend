import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { AccessService } from '../../../core/auth/access.service';
import { AppError } from '../../../core/errors/app-error';
import { LanguageService } from '../../../core/services/language.service';

import { ErrorStateComponent } from '../error-state/error-state.component';
import { LoadingStateComponent } from '../loading-state/loading-state.component';
import { ButtonComponent } from '../../ui/button/button.component';

/**
 * The paper frame shared by printable documents: Print/Close toolbar (screen only), the company's logo, name and
 * colour, the document title and number, then the document body (content projection).
 *
 *   <app-print-layout titleKey="print.invoice" [number]="invoice()?.invoice_number" [ready]="!!invoice()" [error]="error()">
 *     …body…
 *   </app-print-layout>
 */
@Component({
  selector: 'app-print-layout',
  imports: [ButtonComponent, TranslatePipe, ErrorStateComponent, LoadingStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './print-layout.component.html',
})
export class PrintLayoutComponent {
  private readonly access = inject(AccessService);
  readonly direction = inject(LanguageService).direction;

  readonly titleKey = input.required<string>();
  readonly number = input<string | null | undefined>('');
  /** A status worth printing in red under the number, e.g. "Draft" or "Cancelled" (already translated key). */
  readonly warningKey = input<string | null>(null);
  readonly ready = input(false);
  readonly error = input<AppError | null>(null);

  readonly company = computed(() => this.access.current()?.company ?? null);
  readonly accent = computed(() => this.company()?.primary_color || '#4f46e5');

  print(): void {
    window.print();
  }

  /** Printable pages open in their own tab. */
  close(): void {
    window.close();
  }
}
