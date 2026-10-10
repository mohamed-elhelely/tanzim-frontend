import { Injectable, effect, inject } from '@angular/core';
import { updatePrimaryPalette } from '@primeuix/themes';
import { AccessService } from '../auth/access.service';
import { AuthService } from '../auth/auth.service';
import { DEFAULT_PALETTE, Palette, SHADES, brandPalette, toRgbChannels } from './brand-palette';

const STORAGE_KEY = 'tanzim.brand';

/** The backend's defaults (company.models): treated as "no brand color set". */
const UNSET_PRIMARY = '#000000';
const UNSET_SECONDARY = '#FFFFFF';

interface BrandColors {
  primary: string | null;
  secondary: string | null;
}

/**
 * The company's colors from /me become the site's palettes: `primary` (buttons, links, active items, PrimeNG
 * components) and `secondary` (the sidebar and the mobile menu). Each is a 50–950 scale from brandPalette(),
 * written as CSS variables (`--brand-primary-500: 79 70 229`) that tailwind.config.js reads, and the primary one
 * is also handed to PrimeNG. Unset colors keep Tanzim's indigo. The last colors are cached so a reload starts in
 * the company's colors instead of flashing indigo until /me answers.
 */
@Injectable({ providedIn: 'root' })
export class BrandThemeService {
  private readonly access = inject(AccessService);
  private readonly auth = inject(AuthService);
  private applied = '';

  constructor() {
    effect(() => {
      // Signed out (the login page): Tanzim's colors. Signed in: wait for /me, then the company's.
      if (!this.auth.isAuthenticated()) {
        this.apply({ primary: null, secondary: null });
        this.cache({ primary: null, secondary: null });
        return;
      }
      if (!this.access.settled()) {
        return;
      }
      const company = this.access.current()?.company ?? null;
      const colors: BrandColors = {
        primary: company && company.primary_color.toUpperCase() !== UNSET_PRIMARY ? company.primary_color : null,
        secondary: company && company.secondary_color.toUpperCase() !== UNSET_SECONDARY ? company.secondary_color : null,
      };
      this.apply(colors);
      this.cache(colors);
    });
  }

  /** Called once at start-up, before /me: the cached colors avoid an indigo flash on reload. */
  init(): void {
    if (this.auth.isAuthenticated()) {
      this.apply(this.readCached());
    }
  }

  private apply(colors: BrandColors): void {
    const key = `${colors.primary}|${colors.secondary}`;
    if (key === this.applied) {
      return;
    }
    this.applied = key;
    const primary = (colors.primary && brandPalette(colors.primary)) || null;
    const secondary = (colors.secondary && brandPalette(colors.secondary)) || null;
    this.setVariables('primary', primary ?? DEFAULT_PALETTE);
    this.setVariables('secondary', secondary ?? DEFAULT_PALETTE);
    updatePrimaryPalette(primary ?? Object.fromEntries(SHADES.map((shade) => [shade, `{indigo.${shade}}`])));
  }

  private setVariables(name: 'primary' | 'secondary', palette: Palette): void {
    const style = document.documentElement.style;
    for (const shade of SHADES) {
      style.setProperty(`--brand-${name}-${shade}`, toRgbChannels(palette[shade]));
    }
  }

  private readCached(): BrandColors {
    try {
      const cached = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as BrandColors | null;
      return { primary: cached?.primary ?? null, secondary: cached?.secondary ?? null };
    } catch {
      return { primary: null, secondary: null };
    }
  }

  private cache(colors: BrandColors): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(colors));
    } catch {
      // Storage can be blocked; the next reload then starts in indigo.
    }
  }
}
