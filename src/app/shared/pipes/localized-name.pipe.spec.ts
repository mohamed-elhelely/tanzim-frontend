import { LocalizedNamePipe, localizedName } from './localized-name.pipe';

describe('localizedName', () => {
  const sales = { name_en: 'Sales', name_ar: 'المبيعات' };

  it('uses the Arabic name in Arabic', () => {
    expect(localizedName(sales, 'ar')).toBe('المبيعات');
  });

  it('uses the English name in English', () => {
    expect(localizedName(sales, 'en')).toBe('Sales');
  });

  it('falls back to English when the Arabic name is empty', () => {
    expect(localizedName({ name_en: 'Sales', name_ar: null }, 'ar')).toBe('Sales');
    expect(localizedName({ name_en: 'Sales', name_ar: '' }, 'ar')).toBe('Sales');
  });

  it('falls back to a plain name field', () => {
    expect(localizedName({ name: 'Head Office (HQ-01)' }, 'ar')).toBe('Head Office (HQ-01)');
  });

  it('returns an empty string for null', () => {
    expect(localizedName(null, 'en')).toBe('');
  });

  it('works as a pipe', () => {
    expect(new LocalizedNamePipe().transform(sales, 'ar')).toBe('المبيعات');
  });
});
