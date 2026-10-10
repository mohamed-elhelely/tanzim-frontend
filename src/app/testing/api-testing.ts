import { EnvironmentProviders, Provider } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { DialogService } from 'primeng/dynamicdialog';
import { errorInterceptor } from '../core/interceptors/error.interceptor';

/** A successful API response in the backend's envelope. */
export function envelope<T>(data: T, totalCount?: number) {
  return {
    success: true,
    data,
    metadata: {
      timestamp: '2026-10-07T00:00:00Z',
      version: '1.0',
      ...(totalCount === undefined ? {} : { total_count: totalCount }),
    },
  };
}

/** A failed API response in the backend's envelope. */
export function errorEnvelope(code: number, message: string, errors: Record<string, unknown> = {}) {
  return {
    success: false,
    data: null,
    metadata: { timestamp: '2026-10-07T00:00:00Z', version: '1.0' },
    error: { code, message, errors },
  };
}

/**
 * Providers for component/service tests that talk to HttpTestingController.
 * Includes the real error interceptor so failures arrive as AppError, like in the app.
 */
export function provideApiTesting(): (Provider | EnvironmentProviders)[] {
  return [
    provideRouter([]),
    provideHttpClient(withInterceptors([errorInterceptor])),
    provideHttpClientTesting(),
    provideAnimations(),
    provideTranslateService(),
    MessageService,
    ConfirmationService,
    DialogService,
  ];
}
