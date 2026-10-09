import { fitsSpec, isIdKey, isMoneyKey } from './analytics.models';
import { formatValue, humanize } from './analytics-format';

describe('analytics formatting', () => {
  it('makes a readable label from any key', () => {
    expect(humanize('days_since_last_order')).toBe('Days since last order');
    expect(humanize('return_rate_percent')).toBe('Return rate %');
  });

  it('tells money from counts, days and percentages', () => {
    expect(isMoneyKey('revenue')).toBeTrue();
    expect(isMoneyKey('open_receivables')).toBeTrue();
    expect(isMoneyKey('credit_limit')).toBeTrue();
    expect(isMoneyKey('near_credit_limit')).toBeFalse();
    expect(isMoneyKey('gross_margin_percent')).toBeFalse();
    expect(isMoneyKey('net_margin_percent')).toBeFalse();
    expect(isMoneyKey('days_sales_outstanding')).toBeFalse();
    expect(isMoneyKey('orders')).toBeFalse();
    expect(isIdKey('customer_id')).toBeTrue();
  });

  it('formats values by their key', () => {
    expect(formatValue('revenue', 1234.5)).toBe('1,234.50');
    expect(formatValue('share_percent', 78.954)).toBe('78.95%');
    expect(formatValue('quantity', 2.5)).toBe('2.5');
    expect(formatValue('revenue', null)).toBe('—');
    expect(formatValue('flags', ['inactive', 'overdue'])).toBe('inactive, overdue');
    expect(formatValue('quantity_by_decision', { restock: 2 })).toBe('Restock: 2');
  });

  it('only draws a chart when the rows fit its spec', () => {
    const spec = { type: 'bar' as const, category: 'label', series: ['value'] };
    expect(fitsSpec(spec, [{ label: 'Draft', value: 10 }])).toBeTrue();
    expect(fitsSpec(spec, [])).toBeFalse();
    expect(fitsSpec(spec, [{ label: 'Draft', amount: 10 }])).toBeFalse();
    expect(fitsSpec(undefined, [{ label: 'Draft', value: 10 }])).toBeFalse();
  });
});
