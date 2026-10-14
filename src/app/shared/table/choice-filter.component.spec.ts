import { TestBed } from '@angular/core/testing';
import { provideApiTesting } from '../../testing/api-testing';
import { ChoiceFilterComponent } from './choice-filter.component';

describe('ChoiceFilterComponent', () => {
  it('offers the options with their labels translated', async () => {
    await TestBed.configureTestingModule({ imports: [ChoiceFilterComponent], providers: provideApiTesting() }).compileComponents();
    const fixture = TestBed.createComponent(ChoiceFilterComponent);
    fixture.componentRef.setInput('options', [{ value: 'draft', label: 'sales.orderStatuses.draft' }]);
    fixture.componentRef.setInput('placeholder', 'sales.fields.status');
    fixture.detectChanges();
    // No translations are loaded in tests, so a label comes back as its key.
    expect(fixture.componentInstance.translatedOptions()).toEqual([{ value: 'draft', label: 'sales.orderStatuses.draft' }]);
  });
});
