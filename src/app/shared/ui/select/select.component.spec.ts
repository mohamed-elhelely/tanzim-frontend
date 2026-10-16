import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { provideTranslateService } from '@ngx-translate/core';
import { SelectItemDirective } from './select-templates';
import { SelectComponent } from './select.component';

const options = [
  { value: 1, label: 'status.open' },
  { value: 2, label: 'status.closed' },
];

@Component({
  imports: [ReactiveFormsModule, SelectComponent, SelectItemDirective],
  template: `
    <app-select
      [formControl]="control"
      [options]="options"
      optionValue="value"
      inputId="status"
      [translateLabels]="translate()"
      (changed)="changes.push($event)"
    >
      @if (custom()) {
        <ng-template appSelectItem let-option><b class="custom">#{{ option.value }}</b></ng-template>
      }
    </app-select>
  `,
})
class HostComponent {
  readonly control = new FormControl<number | null>(2);
  readonly options = options;
  readonly translate = signal(true);
  readonly custom = signal(false);
  readonly changes: unknown[] = [];
}

describe('SelectComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent], providers: [provideTranslateService()] });
  });

  async function render() {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    // ngModel inside writes its value in a microtask.
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  function open(fixture: Awaited<ReturnType<typeof render>>): HTMLElement[] {
    (fixture.nativeElement.querySelector('.p-select') as HTMLElement).click();
    fixture.detectChanges();
    return [...document.querySelectorAll<HTMLElement>('.p-select-option')];
  }

  afterEach(() => document.querySelectorAll('.p-select-overlay').forEach((el) => el.remove()));

  it('shows the form value, with translated labels', async () => {
    const fixture = await render();
    expect(fixture.nativeElement.querySelector('.p-select-label').textContent.trim()).toBe('status.closed');
  });

  it('writes the picked value to the form and emits it', async () => {
    const fixture = await render();
    open(fixture)[0].click();
    fixture.detectChanges();
    expect(fixture.componentInstance.control.value).toBe(1);
    expect(fixture.componentInstance.changes).toEqual([1]);
    expect(fixture.componentInstance.control.dirty).toBeTrue();
  });

  it('follows the form being disabled', async () => {
    const fixture = await render();
    fixture.componentInstance.control.disable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.p-select').className).toContain('p-disabled');
  });

  it('renders a custom option template', async () => {
    const fixture = await render();
    fixture.componentInstance.custom.set(true);
    fixture.detectChanges();
    const items = open(fixture);
    expect(items[0].querySelector('.custom')?.textContent).toBe('#1');
  });
});
