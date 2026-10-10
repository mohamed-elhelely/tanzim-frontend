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
        sans: ['Inter', '"IBM Plex Sans Arabic"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
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
