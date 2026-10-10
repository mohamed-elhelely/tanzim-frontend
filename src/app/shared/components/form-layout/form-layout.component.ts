import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { CardModule } from 'primeng/card';
import { DynamicDialogRef } from 'primeng/dynamicdialog';
import { PageHeaderComponent } from '../page-header/page-header.component';

/**
 * Frame of a create/edit form. As a page: the page header with a back link, then the form in a full-width card.
 * Inside a FormDialogService dialog (which shows the title itself): just the form.
 */
@Component({
  selector: 'app-form-layout',
  imports: [NgTemplateOutlet, CardModule, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './form-layout.component.html',
})
export class FormLayoutComponent {
  readonly title = input.required<string>();
  readonly back = output<void>();
  readonly inDialog = inject(DynamicDialogRef, { optional: true }) !== null;
}
