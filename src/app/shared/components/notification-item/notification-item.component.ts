import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { AppNotification, NotificationType } from '../../../core/notifications/notification.model';
import { LanguageService } from '../../../core/services/language.service';
import { TimeAgoPipe } from '../../pipes/time-ago.pipe';

const STYLES: Record<NotificationType, { icon: string; tone: string }> = {
  info: { icon: 'pi-info-circle', tone: 'bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300' },
  success: { icon: 'pi-check-circle', tone: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300' },
  warning: { icon: 'pi-exclamation-triangle', tone: 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300' },
  error: { icon: 'pi-times-circle', tone: 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-300' },
};

/** One notification row (header bell and notifications page). Clicking it emits `open`, used to mark it read. */
@Component({
  selector: 'app-notification-item',
  imports: [TimeAgoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './notification-item.component.html',
})
export class NotificationItemComponent {
  @Input({ required: true }) notification!: AppNotification;
  @Output() open = new EventEmitter<AppNotification>();

  readonly lang = inject(LanguageService).currentLang;

  get style(): { icon: string; tone: string } {
    return STYLES[this.notification.notif_type] ?? STYLES.info;
  }
}
