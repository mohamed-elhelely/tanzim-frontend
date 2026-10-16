import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, Directive, TemplateRef, computed, contentChild, inject, input, model, output } from '@angular/core';
import { DialogModule } from 'primeng/dialog';

/** Buttons at the bottom of an `app-dialog`: `<ng-template appDialogFooter>…</ng-template>`. */
@Directive({ selector: 'ng-template[appDialogFooter]' })
export class DialogFooterDirective {
  readonly template = inject<TemplateRef<unknown>>(TemplateRef);
}

/**
 * A modal dialog. `[(visible)]` opens and closes it; `width` is its width on large screens (it never exceeds the
 * screen minus a margin). `dismissable`: a click outside closes it.
 */
@Component({
  selector: 'app-dialog',
  imports: [NgTemplateOutlet, DialogModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dialog.component.html',
})
export class DialogComponent {
  readonly visible = model(false);
  readonly header = input<string>();
  readonly width = input('32rem');
  readonly dismissable = input(false);
  readonly draggable = input(true);
  readonly position = input<'center' | 'top'>('center');
  /** No padding around the content (lists that run edge to edge). */
  readonly flush = input(false);
  /** Extra classes on the dialog box, for one-off placements (the command palette). */
  readonly panelClass = input<string>();

  /** The dialog finished opening (focus a field, load data). */
  readonly shown = output<void>();

  readonly footerTemplate = contentChild(DialogFooterDirective);
  readonly style = computed(() => ({ width: this.width(), maxWidth: 'calc(100vw - 2rem)' }));
}
