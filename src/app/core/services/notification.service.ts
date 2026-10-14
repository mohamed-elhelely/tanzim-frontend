import { Injectable, Injector, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';
import { AppError } from '../errors/app-error';

type NotificationSeverity = 'success' | 'info' | 'warn' | 'error';

/** Toasts (PrimeNG MessageService) with a translated title. Messages passed in are shown as-is. */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly messages = inject(MessageService);
  private readonly injector = inject(Injector);

  success(detail: string): void {
    this.show('success', detail);
  }

  info(detail: string): void {
    this.show('info', detail);
  }

  warn(detail: string): void {
    this.show('warn', detail);
  }

  error(detail: string): void {
    this.show('error', detail);
  }

  /**
   * An error toast for a failed request: `detail` (or the backend's message) plus the response's support code
   * (`X-Request-ID`), which stays longer so it can be copied and sent to support.
   */
  failure(error: AppError, detail = error.message): void {
    if (!error.requestId) {
      this.show('error', detail);
      return;
    }
    const code = this.injector.get(TranslateService).instant('errors.supportCode', { code: error.requestId });
    this.show('error', `${detail}
${code}`, 10000);
  }

  private show(severity: NotificationSeverity, detail: string, life = 4000): void {
    const summaryKey = severity === 'warn' ? 'common.warning' : `common.${severity}`;
    const translate = this.injector.get(TranslateService);
    this.messages.add({
      severity,
      summary: translate.instant(summaryKey),
      detail,
      life,
    });
  }
}
