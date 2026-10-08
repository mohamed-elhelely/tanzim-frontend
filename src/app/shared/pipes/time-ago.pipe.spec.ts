import { timeAgo } from './time-ago.pipe';

describe('timeAgo', () => {
  const now = new Date('2026-10-09T12:00:00Z').getTime();

  it('picks the largest fitting unit, in the given language', () => {
    expect(timeAgo('2026-10-09T09:00:00Z', 'en', now)).toBe('3 hours ago');
    expect(timeAgo('2026-10-08T12:00:00Z', 'en', now)).toBe('yesterday');
    expect(timeAgo('2026-10-09T11:59:40Z', 'en', now)).toBe('this minute');
    expect(timeAgo('2026-10-09T09:00:00Z', 'ar', now)).toContain('3');
  });

  it('is empty without a date', () => {
    expect(timeAgo(null, 'en', now)).toBe('');
  });
});
