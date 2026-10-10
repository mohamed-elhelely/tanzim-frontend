import { Injectable, Type, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { DialogService } from 'primeng/dynamicdialog';
import { Observable, filter, map, of } from 'rxjs';

export interface FormDialogOptions {
  /** Translation key of the dialog title, e.g. `company.departments.new`. */
  header: string;
  /** The record to edit; omitted for create. */
  id?: number;
  /** Wider dialogs for forms with more fields. */
  size?: 'md' | 'lg';
}

/**
 * Opens a short create/edit form (one that uses injectFormContext) in a dialog over its list. Emits once when the
 * form saved, so the list can reload; cancelling or closing the dialog emits nothing.
 */
@Injectable({ providedIn: 'root' })
export class FormDialogService {
  private readonly dialogs = inject(DialogService);
  private readonly translate = inject(TranslateService);

  open(component: Type<unknown>, options: FormDialogOptions): Observable<void> {
    const ref = this.dialogs.open(component, {
      header: this.translate.instant(options.header),
      data: { id: options.id },
      width: options.size === 'lg' ? '56rem' : '40rem',
      breakpoints: { '960px': '90vw', '640px': '100vw' },
      modal: true,
      closable: true,
      dismissableMask: false,
      closeOnEscape: true,
      focusOnShow: false,
    });
    if (!ref) {
      return of();
    }
    return ref.onClose.pipe(
      filter((saved) => saved === true),
      map(() => undefined),
    );
  }
}
