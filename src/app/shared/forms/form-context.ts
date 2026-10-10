import { inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

/** What a create/edit form needs to know about where it runs. */
export interface FormContext {
  /** The record to edit (null = create): the dialog's `data.id`, else the route's `:id`. */
  readonly id: number | null;
  /** True inside a FormDialogService dialog. */
  readonly inDialog: boolean;
  /** Leaves the form: closes the dialog (reporting whether it saved) or goes back to the list page. */
  close(saved?: boolean): void;
}

/**
 * Lets one form component run both as a page (/x/new, /x/:id/edit) and in a dialog opened from its list.
 * Call it in a field initializer: `private readonly ctx = injectFormContext(['/company/departments']);`.
 */
export function injectFormContext(listUrl: unknown[]): FormContext {
  const ref = inject(DynamicDialogRef, { optional: true });
  const config = inject(DynamicDialogConfig, { optional: true });
  if (ref) {
    const id = Number((config?.data as { id?: number } | undefined)?.id) || null;
    return { id, inDialog: true, close: (saved = false) => ref.close(saved) };
  }
  const router = inject(Router);
  const id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id')) || null;
  return { id, inDialog: false, close: () => void router.navigate(listUrl) };
}
