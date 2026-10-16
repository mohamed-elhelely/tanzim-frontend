import { Directive, TemplateRef, inject } from '@angular/core';

/** Context of the option templates: `<ng-template appSelectItem let-option>`. */
export interface OptionContext<T = unknown> {
  $implicit: T;
}

/** Custom content for each option in the list (`app-select`, `app-multi-select`). */
@Directive({ selector: 'ng-template[appSelectItem]' })
export class SelectItemDirective {
  readonly template = inject<TemplateRef<OptionContext>>(TemplateRef);
}

/** Custom content for the chosen option shown in the closed field (`app-select`). */
@Directive({ selector: 'ng-template[appSelectSelected]' })
export class SelectSelectedDirective {
  readonly template = inject<TemplateRef<OptionContext>>(TemplateRef);
}

/** Custom content for a group heading when options are grouped (`app-select` with `[group]="true"`). */
@Directive({ selector: 'ng-template[appSelectGroup]' })
export class SelectGroupDirective {
  readonly template = inject<TemplateRef<OptionContext>>(TemplateRef);
}
