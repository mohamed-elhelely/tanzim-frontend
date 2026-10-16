const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

/** `primary-600` → `rgb(var(--brand-primary-600) / <alpha-value>)`, so opacity modifiers like `/40` still work. */
function brandScale(name) {
  return Object.fromEntries(SHADES.map((shade) => [shade, `rgb(var(--brand-${name}-${shade}) / <alpha-value>)`]));
}

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        // --app-font puts the Arabic face first when <html lang="ar"> (styles.scss).
        sans: ['var(--app-font)'],
      },
      // Design tokens from styles.scss: same values as Tailwind's defaults, changeable in one place.
      borderRadius: {
        sm: 'var(--app-radius-sm)',
        DEFAULT: 'var(--app-radius)',
        md: 'var(--app-radius-md)',
        lg: 'var(--app-radius-lg)',
        xl: 'var(--app-radius-xl)',
        '2xl': 'var(--app-radius-2xl)',
      },
      boxShadow: {
        sm: 'var(--app-shadow-sm)',
        DEFAULT: 'var(--app-shadow)',
        md: 'var(--app-shadow-md)',
        lg: 'var(--app-shadow-lg)',
      },
      colors: {
        // The company's brand colors from /me (BrandThemeService writes the CSS variables; styles.scss holds
        // Tanzim's indigo defaults). primary: buttons, links, active items. secondary: the sidebar.
        primary: brandScale('primary'),
        secondary: brandScale('secondary'),
      },
    },
  },
  plugins: [],
};
