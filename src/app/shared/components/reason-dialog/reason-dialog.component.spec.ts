import { TestBed } from '@angular/core/testing';
import { provideApiTesting } from '../../../testing/api-testing';
import { ReasonDialogComponent } from './reason-dialog.component';

describe('ReasonDialogComponent', () => {
  it('emits the trimmed reason and clears it when reopened', () => {
    TestBed.configureTestingModule({ imports: [ReasonDialogComponent], providers: provideApiTesting() });
    const fixture = TestBed.createComponent(ReasonDialogComponent);
    const component = fixture.componentInstance;
    fixture.componentRef.setInput('header', 'h');
    fixture.componentRef.setInput('confirmLabel', 'c');
    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();
    const emitted: string[] = [];
    component.confirmed.subscribe((reason) => emitted.push(reason));
    component.reason = '  Wrong address ';
    component.confirm();
    expect(emitted).toEqual(['Wrong address']);

    fixture.componentRef.setInput('visible', false);
    fixture.detectChanges();
    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();
    expect(component.reason).toBe('');
  });
});
