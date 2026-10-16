import { Directive, TemplateRef, inject } from '@angular/core';

/** Context of `<ng-template appTableRow let-row let-i="index">`. */
export interface TableRowContext<T = unknown> {
  $implicit: T;
  index: number;
}

/** The header row(s) of an `app-table`: `<ng-template appTableHeader><tr><th>…</th></tr></ng-template>`. */
@Directive({ selector: 'ng-template[appTableHeader]' })
export class TableHeaderDirective {
  readonly template = inject<TemplateRef<unknown>>(TemplateRef);
}

/** One row per record: `<ng-template appTableRow let-row><tr><td>{{ row.name }}</td></tr></ng-template>`. */
@Directive({ selector: 'ng-template[appTableRow]' })
export class TableRowDirective {
  readonly template = inject<TemplateRef<TableRowContext>>(TemplateRef);
}

/** What shows when there are no records (a `<tr>` with a full-width cell). */
@Directive({ selector: 'ng-template[appTableEmpty]' })
export class TableEmptyDirective {
  readonly template = inject<TemplateRef<unknown>>(TemplateRef);
}

/** Rows under the records, e.g. totals. */
@Directive({ selector: 'ng-template[appTableFooter]' })
export class TableFooterDirective {
  readonly template = inject<TemplateRef<unknown>>(TemplateRef);
}
