import { Injectable, Injector, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';

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

  private show(severity: NotificationSeverity, detail: string): void {
    const summaryKey = severity === 'warn' ? 'common.warning' : `common.${severity}`;
    const translate = this.injector.get(TranslateService);
    this.messages.add({
      severity,
      summary: translate.instant(summaryKey),
      detail,
      life: 4000,
    });
  }
}
