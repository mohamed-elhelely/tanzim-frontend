/** Tailwind/PrimeNG shade names. */
export const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
export type Shade = (typeof SHADES)[number];
export type Palette = Record<Shade, string>;

/** Lightness (HSL %) of each shade, close to Tailwind's scales, so 600+ always carries white text. */
const LIGHTNESS: Record<Shade, number> = {
  50: 97,
  100: 94,
  200: 87,
  300: 77,
  400: 65,
  500: 54,
  600: 45,
  700: 37,
  800: 30,
  900: 24,
  950: 15,
};

/** Tanzim's own indigo, used until the company sets its colors. */
export const DEFAULT_PALETTE: Palette = {
  50: '#eef2ff',
  100: '#e0e7ff',
  200: '#c7d2fe',
  300: '#a5b4fc',
  400: '#818cf8',
  500: '#6366f1',
  600: '#4f46e5',
  700: '#4338ca',
  800: '#3730a3',
  900: '#312e81',
  950: '#1e1b4b',
};

const HEX = /^#?([0-9a-f]{6})$/i;

/**
 * A full 50–950 scale from one brand color: hue and saturation are kept, lightness follows LIGHTNESS, and the
 * brand color itself sits unchanged at the shade closest to its own lightness. Returns null for an invalid hex.
 */
export function brandPalette(hex: string): Palette | null {
  const match = HEX.exec(hex.trim());
  if (!match) {
    return null;
  }
  const [h, s, l] = toHsl(parseInt(match[1], 16));
  const anchor = SHADES.reduce((best, shade) => (Math.abs(LIGHTNESS[shade] - l) < Math.abs(LIGHTNESS[best] - l) ? shade : best));
  const palette = {} as Palette;
  for (const shade of SHADES) {
    // Very light and very dark shades read better a little less saturated.
    const saturation = shade <= 100 || shade >= 900 ? Math.min(s, 85) : s;
    palette[shade] = shade === anchor ? `#${match[1].toLowerCase()}` : toHex(h, saturation, LIGHTNESS[shade]);
  }
  return palette;
}

/** `#4f46e5` → `79 70 229`, the form Tailwind's `rgb(var(--x) / <alpha-value>)` colors expect. */
export function toRgbChannels(hex: string): string {
  const value = parseInt(hex.replace('#', ''), 16);
  return `${(value >> 16) & 255} ${(value >> 8) & 255} ${value & 255}`;
}

function toHsl(rgb: number): [number, number, number] {
  const r = ((rgb >> 16) & 255) / 255;
  const g = ((rgb >> 8) & 255) / 255;
  const b = (rgb & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) {
    return [0, 0, l * 100];
  }
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s * 100, l * 100];
}

function toHex(h: number, s: number, l: number): string {
  const sat = s / 100;
  const light = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sat * Math.min(light, 1 - light);
  const channel = (n: number) => Math.round((light - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))) * 255);
  return `#${[channel(0), channel(8), channel(4)].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}
