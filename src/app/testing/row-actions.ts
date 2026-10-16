import { ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { RowActionsComponent } from '../shared/table/row-actions.component';

/**
 * The icons of every row action declared in the table (all rows), whether shown as a button or inside a "⋮" menu,
 * e.g. `['pi pi-pencil', 'pi pi-trash']`. The actions are read from each `<app-row-actions>`: they are not in the DOM.
 */
export function rowActionIcons(fixture: ComponentFixture<unknown>): string[] {
  return fixture.debugElement
    .queryAll(By.directive(RowActionsComponent))
    .flatMap((row) => (row.componentInstance as RowActionsComponent).actions().map((action) => action.icon()));
}
