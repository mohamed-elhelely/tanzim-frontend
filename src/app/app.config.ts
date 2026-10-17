import { ApplicationConfig, ErrorHandler, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { ConfirmationService, MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';
import { DialogService } from 'primeng/dynamicdialog';
import { routes } from './app.routes';
import { GlobalErrorHandler } from './core/errors/global-error-handler';
import { apiHeadersInterceptor } from './core/interceptors/api-headers.interceptor';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { duplicateWriteInterceptor } from './core/interceptors/duplicate-write.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { loadingInterceptor } from './core/interceptors/loading.interceptor';
import { TanzimPreset } from './core/theme/tanzim-preset';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    // A repeated write still waiting for its response is dropped first, before it counts anywhere.
    provideHttpClient(
      withInterceptors([duplicateWriteInterceptor, apiHeadersInterceptor, authInterceptor, loadingInterceptor, errorInterceptor]),
    ),
    // No provideAnimations(): nothing uses @angular/animations (PrimeNG 21 animates with CSS). Its renderer only
    // removes an element at the next change detection, and PrimeNG removes a drawer's mask outside Angular, so the
    // mask stayed on screen after closing a drawer by clicking outside it and swallowed every later click.
    providePrimeNG({
      theme: {
        preset: TanzimPreset,
        options: {
          // Dark mode follows the `dark` class on <html> (shared with Tailwind).
          darkModeSelector: '.dark',
          // Same order as src/layer-order.css.
          cssLayer: { name: 'primeng', order: 'tailwind-base, primeng, app, tailwind-utilities' },
        },
      },
    }),
    provideTranslateService({
      lang: 'en',
      fallbackLang: 'en',
      loader: provideTranslateHttpLoader({ prefix: './assets/i18n/', suffix: '.json' }),
    }),
    MessageService,
    ConfirmationService,
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    // Short create/edit forms open in dialogs (shared/forms/form-dialog.service.ts).
    DialogService,
  ],
};
