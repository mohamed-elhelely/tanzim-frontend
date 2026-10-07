import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

const GRAY_SURFACE = {
  0: '#ffffff',
  50: '{gray.50}',
  100: '{gray.100}',
  200: '{gray.200}',
  300: '{gray.300}',
  400: '{gray.400}',
  500: '{gray.500}',
  600: '{gray.600}',
  700: '{gray.700}',
  800: '{gray.800}',
  900: '{gray.900}',
  950: '{gray.950}',
};

/**
 * PrimeNG's Aura theme with indigo as the brand colour and Tailwind's gray for surfaces,
 * so PrimeNG components match the `primary-*` / `gray-*` classes used in the templates.
 */
export const TanzimPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '{indigo.50}',
      100: '{indigo.100}',
      200: '{indigo.200}',
      300: '{indigo.300}',
      400: '{indigo.400}',
      500: '{indigo.500}',
      600: '{indigo.600}',
      700: '{indigo.700}',
      800: '{indigo.800}',
      900: '{indigo.900}',
      950: '{indigo.950}',
    },
    colorScheme: {
      light: { surface: GRAY_SURFACE },
      dark: { surface: GRAY_SURFACE },
    },
  },
});
