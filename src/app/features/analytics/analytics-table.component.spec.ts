import { TestBed } from '@angular/core/testing';
import { provideApiTesting } from '../../testing/api-testing';
import { AnalyticsTableComponent } from './analytics-table.component';

describe('AnalyticsTableComponent', () => {
  function render(rows: Record<string, unknown>[], columns?: string[]) {
    TestBed.configureTestingModule({ imports: [AnalyticsTableComponent], providers: provideApiTesting() });
    const fixture = TestBed.createComponent(AnalyticsTableComponent);
    fixture.componentInstance.rows = rows as never;
    fixture.componentInstance.columns = columns;
    fixture.detectChanges();
    return fixture;
  }

  it('shows the report columns in order, hides ids and formats numbers', () => {
    const fixture = render(
      [{ customer_id: 2, customer: 'Delta Trading', revenue: 995, share_percent: 100 }],
      ['customer', 'revenue', 'share_percent'],
    );
    expect(fixture.componentInstance.shownColumns()).toEqual(['customer', 'revenue', 'share_percent']);
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Delta Trading');
    expect(text).toContain('995.00');
    expect(text).toContain('100.00%');
  });

  it('takes the columns from the first row when none are given, without id columns', () => {
    const fixture = render([{ variant_id: 1, sku: 'A', quantity: 3 }]);
    expect(fixture.componentInstance.shownColumns()).toEqual(['sku', 'quantity']);
  });

  it('shows flags as badges, from a list or comma-separated text', () => {
    const component = render([]).componentInstance;
    expect(component.flags('inactive,overdue')).toEqual(['inactive', 'overdue']);
    expect(component.flags(['over_credit_limit'])).toEqual(['over_credit_limit']);
    expect(component.flags('')).toEqual([]);
  });
});
