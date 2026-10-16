import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ToggleComponent } from './toggle.component';

@Component({
  imports: [ReactiveFormsModule, ToggleComponent],
  template: `<app-toggle [formControl]="control" inputId="active"></app-toggle>`,
})
class HostComponent {
  readonly control = new FormControl(false);
}

describe('ToggleComponent', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [HostComponent] }));

  it('reads and writes the form value', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input#active') as HTMLInputElement;
    expect(input.checked).toBeFalse();
    input.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.control.value).toBeTrue();
    expect(fixture.componentInstance.control.touched).toBeTrue();

    fixture.componentInstance.control.setValue(false);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(input.checked).toBeFalse();
  });

  it('follows the form being disabled', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.control.disable();
    fixture.detectChanges();
    expect((fixture.nativeElement.querySelector('input#active') as HTMLInputElement).disabled).toBeTrue();
  });
});
