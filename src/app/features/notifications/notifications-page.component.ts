import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { SelectButtonModule } from 'primeng/selectbutton';
import { FormsModule } from '@angular/forms';
import { AppNotification } from '../../core/notifications/notification.model';
import { NotificationCenterService } from '../../core/notifications/notification-center.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { NotificationItemComponent } from '../../shared/components/notification-item/notification-item.component';
import { PageHeaderAction, PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

type Filter = 'all' | 'unread';

/** The user's recent notifications (the backend keeps the latest 20); live through NotificationCenterService. */
@Component({
  selector: 'app-notifications-page',
  imports: [TranslatePipe, FormsModule, SelectButtonModule, PageHeaderComponent, EmptyStateComponent, NotificationItemComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './notifications-page.component.html',
})
export class NotificationsPageComponent implements OnInit {
  readonly center = inject(NotificationCenterService);

  readonly filter = signal<Filter>('all');
  readonly filterOptions = [
    { value: 'all', label: 'notifications.all' },
    { value: 'unread', label: 'notifications.unread' },
  ];
  readonly shown = computed(() =>
    this.filter() === 'unread' ? this.center.items().filter((item) => !item.is_read) : this.center.items(),
  );
  readonly headerActions = computed<PageHeaderAction[]>(() =>
    this.center.hasUnread()
      ? [{ label: 'notifications.markAllRead', icon: 'pi pi-check', onClick: () => this.center.markAllRead() }]
      : [],
  );

  ngOnInit(): void {
    this.center.refresh();
  }

  open(notification: AppNotification): void {
    this.center.markRead(notification);
  }
}
