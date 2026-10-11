import { CODE128_PATTERNS, canEncodeCode128, code128Bars, code128Values } from './code128';

describe('Code 128', () => {
  it('has 107 distinct symbols of eleven modules (stop: thirteen)', () => {
    expect(CODE128_PATTERNS.length).toBe(107);
    expect(new Set(CODE128_PATTERNS).size).toBe(107);
    const modules = (pattern: string) => [...pattern].reduce((sum, digit) => sum + Number(digit), 0);
    CODE128_PATTERNS.slice(0, 106).forEach((pattern) => expect(modules(pattern)).withContext(pattern).toBe(11));
    expect(modules(CODE128_PATTERNS[106])).toBe(13);
  });

  it('starts with B, adds the mod-103 check symbol and stops', () => {
    // "PJJ123C": P=48 J=42 J=42 1=17 2=18 3=19 C=35;
    // 104 + 48·1 + 42·2 + 42·3 + 17·4 + 18·5 + 19·6 + 35·7 = 879 → 879 mod 103 = 55.
    expect(code128Values('PJJ123C')).toEqual([104, 48, 42, 42, 17, 18, 19, 35, 55, 106]);
  });

  it('draws bars inside quiet zones', () => {
    const { bars, width } = code128Bars('A', 10);
    // start + "A" + check + stop = 11 + 11 + 11 + 13 modules, plus 2 × 10 quiet zone.
    expect(width).toBe(66);
    expect(bars[0]).toEqual({ x: 10, width: 2 });
    expect(bars.length).toBe(3 + 3 + 3 + 4);
  });

  it('only encodes printable ASCII', () => {
    expect(canEncodeCode128('SKU-001 ~')).toBeTrue();
    expect(canEncodeCode128('')).toBeFalse();
    expect(canEncodeCode128('منتج')).toBeFalse();
    expect(() => code128Values('منتج')).toThrowError();
  });
});
