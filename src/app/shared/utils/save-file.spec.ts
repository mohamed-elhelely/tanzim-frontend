import { datedFileName } from './save-file';

describe('datedFileName', () => {
  it('stamps the local day', () => {
    expect(datedFileName('stock', 'xlsx', new Date(2026, 9, 16, 23, 30))).toBe('stock_2026-10-16.xlsx');
  });

  it('takes a day that is already a string', () => {
    expect(datedFileName('stock', 'csv', '2026-01-31')).toBe('stock_2026-01-31.csv');
  });
});
