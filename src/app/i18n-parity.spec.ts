/**
 * en.json and ar.json must hold the same keys: a key missing on one side shows up raw on screen in that language.
 * Karma serves src/assets, so the files are fetched the way the app loads them.
 */
type Translations = Record<string, unknown>;

async function load(lang: 'en' | 'ar'): Promise<Translations> {
  const response = await fetch(`/assets/i18n/${lang}.json`);
  return (await response.json()) as Translations;
}

/** Every leaf as a dotted path (`chat.note.readOnly`). */
export function translationKeys(node: Translations, prefix = ''): string[] {
  return Object.entries(node).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return value !== null && typeof value === 'object' ? translationKeys(value as Translations, path) : [path];
  });
}

describe('translations', () => {
  let en: Set<string>;
  let ar: Set<string>;

  beforeAll(async () => {
    en = new Set(translationKeys(await load('en')));
    ar = new Set(translationKeys(await load('ar')));
  });

  it('loads both files', () => {
    expect(en.size).toBeGreaterThan(0);
    expect(ar.size).toBeGreaterThan(0);
  });

  it('has every English key in Arabic', () => {
    expect([...en].filter((key) => !ar.has(key))).withContext('missing in ar.json').toEqual([]);
  });

  it('has every Arabic key in English', () => {
    expect([...ar].filter((key) => !en.has(key))).withContext('missing in en.json').toEqual([]);
  });

  it('flattens nested keys to dotted paths', () => {
    expect(translationKeys({ a: { b: 'x', c: { d: 'y' } }, e: 'z' })).toEqual(['a.b', 'a.c.d', 'e']);
  });
});
