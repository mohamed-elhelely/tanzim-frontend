import { SHADES, brandPalette, toRgbChannels } from './brand-palette';

describe('brandPalette', () => {
  function lightness(hex: string): number {
    const [r, g, b] = toRgbChannels(hex).split(' ').map(Number);
    return (Math.max(r, g, b) + Math.min(r, g, b)) / 2 / 255;
  }

  it('keeps the brand color at the shade nearest its lightness', () => {
    expect(brandPalette('#FF0000')?.[500]).toBe('#ff0000');
    // A light mint lands on a light shade, so 600+ stays dark enough for white text.
    const mint = brandPalette('#4CE6B3')!;
    expect(Object.values(mint)).toContain('#4ce6b3');
    expect(lightness(mint[600])).toBeLessThan(0.5);
  });

  it('runs from light to dark', () => {
    const palette = brandPalette('#0B5FFF')!;
    const values = SHADES.map((shade) => lightness(palette[shade]));
    expect([...values].sort((a, b) => b - a)).toEqual(values);
  });

  it('gives grays for a gray and refuses an invalid color', () => {
    const [r, g, b] = toRgbChannels(brandPalette('#EBEBEB')![900]).split(' ');
    expect(r).toBe(g);
    expect(g).toBe(b);
    expect(brandPalette('blue')).toBeNull();
  });
});
