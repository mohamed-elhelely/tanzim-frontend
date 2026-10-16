import { AppDatePipe } from './app-date.pipe';

describe('AppDatePipe', () => {
  const pipe = new AppDatePipe();
  const value = new Date(2026, 9, 16, 9, 5, 7).toISOString();

  it('formats date and time by default', () => {
    expect(pipe.transform(value)).toBe('2026-10-16 09:05');
  });

  it('formats a date only, or with seconds', () => {
    expect(pipe.transform(value, 'date')).toBe('2026-10-16');
    expect(pipe.transform(value, 'seconds')).toBe('2026-10-16 09:05:07');
  });

  it('shows a dash for an empty value', () => {
    expect(pipe.transform(null)).toBe('—');
    expect(pipe.transform(undefined, 'date')).toBe('—');
    expect(pipe.transform('')).toBe('—');
  });
});
