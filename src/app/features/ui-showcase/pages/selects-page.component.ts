import { JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MultiSelectComponent, SelectComponent, SelectGroupDirective, SelectItemDirective } from '../../../shared/ui';
import { ShowcaseSectionComponent } from '../showcase-section.component';

@Component({
  selector: 'app-selects-page',
  imports: [
    FormsModule,
    JsonPipe,
    ReactiveFormsModule,
    MultiSelectComponent,
    SelectComponent,
    SelectGroupDirective,
    SelectItemDirective,
    ShowcaseSectionComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './selects-page.component.html',
})
export class SelectsPageComponent {
  readonly warehouses = [
    { id: 1, name: 'Main warehouse', code: 'MAIN' },
    { id: 2, name: 'Branch 1', code: 'BR1' },
    { id: 3, name: 'Cairo depot', code: 'CAI' },
  ];
  /** Labels that are translation keys: shown translated with [translateLabels]. */
  readonly priorities = [
    { value: 'low', label: 'sales.priorities.low' },
    { value: 'normal', label: 'sales.priorities.normal' },
    { value: 'high', label: 'sales.priorities.high' },
  ];
  readonly grouped = [
    { label: 'Inventory', items: [{ label: 'Stock levels', value: 'stock' }, { label: 'Stock ledger', value: 'ledger' }] },
    { label: 'Sales', items: [{ label: 'Orders', value: 'orders' }, { label: 'Invoices', value: 'invoices' }] },
  ];

  readonly warehouse = new FormControl<number | null>(1);
  readonly locked = new FormControl<number | null>({ value: 2, disabled: true });
  priority: string | null = 'normal';
  report: string | null = null;
  modules: string[] = ['stock'];
  readonly lastChange = signal<unknown>(null);

  readonly code = {
    form: `<app-select formControlName="warehouse" [options]="warehouses()" optionLabel="name" optionValue="id"\n  inputId="warehouse" [filter]="true" [showClear]="true" [placeholder]="'common.select' | translate"></app-select>`,
    translate: `<app-select [(ngModel)]="priority" [options]="priorityOptions" optionValue="value" [translateLabels]="true"></app-select>`,
    custom: `<app-select …>\n  <ng-template appSelectItem let-option>{{ option.code }} · {{ option.name }}</ng-template>\n</app-select>`,
    multi: `<app-multi-select [(ngModel)]="modules" [options]="…" optionValue="value" [maxSelectedLabels]="2"\n  [selectedItemsLabel]="'common.selectedCount' | translate"></app-multi-select>`,
  };
}
