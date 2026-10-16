import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRouteSnapshot, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { AccessService } from '../auth/access.service';
import { AuthService } from '../auth/auth.service';
import { chatConversationId } from '../chat/chat.models';
import { ChatStore } from '../chat/chat.store';
import { LanguageService } from '../services/language.service';
import { NotificationService, NotificationSeverity } from '../services/notification.service';
import { AppNotification, NotificationType, accountChange, notificationText } from './notification.model';
import { NotificationCenterService } from './notification-center.service';
import { NotificationSoundService } from './notification-sound.service';

const SEVERITY: Record<NotificationType, NotificationSeverity> = { info: 'info', success: 'success', warning: 'warn', error: 'error' };
/** One save can push several notifications (three permissions removed → three); /me is fetched once after the last. */
export const ACCESS_RELOAD_DEBOUNCE_MS = 800;
/** Long enough to read why before the login page replaces the shell (and its toasts). */
export const SIGN_OUT_DELAY_MS = 5000;

/**
 * Reacts to notifications as the socket pushes them: a sound and a toast for each (none for a chat bell of the chat
 * the user is reading), and for account changes made by someone
 * else (`data.event === 'account_change'`):
 * - membership, role or permission-group changes: /me again (debounced), so menus, guards and buttons follow
 *   without a re-login; if the open page is no longer allowed, back to the dashboard;
 * - removed from the company: signs out after the message;
 * - password changed: a toast that stays until closed (other sessions may have been signed out).
 * Started by the shell, for the signed-in user's lifetime there.
 */
@Injectable({ providedIn: 'root' })
export class LiveNotificationsService {
  private readonly center = inject(NotificationCenterService);
  private readonly access = inject(AccessService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(NotificationService);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly language = inject(LanguageService);
  private readonly sound = inject(NotificationSoundService);
  private readonly chat = inject(ChatStore);
  private reloadTimer?: ReturnType<typeof setTimeout>;
  private signOutTimer?: ReturnType<typeof setTimeout>;
  private started = false;

  start(): void {
    if (this.started) {
      return;
    }
    this.started = true;
    this.center.incoming$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((notification) => this.handle(notification));
    this.destroyRef.onDestroy(() => {
      clearTimeout(this.reloadTimer);
      clearTimeout(this.signOutTimer);
    });
  }

  private handle(notification: AppNotification): void {
    const conversationId = chatConversationId(notification);
    if (conversationId !== null && this.chat.isOpen(conversationId)) {
      return; // The user is reading that chat right now.
    }
    const change = accountChange(notification);
    const { title, message } = notificationText(notification, this.language.currentLang());
    const important = !!change || notification.notif_type === 'warning' || notification.notif_type === 'error';
    this.sound.play(important ? 'alert' : 'normal');
    if (!change) {
      this.toast.notify(SEVERITY[notification.notif_type] ?? 'info', title, message);
      return;
    }
    if (change.resource === 'user') {
      const password = change.action === 'password_change';
      this.toast.notify(password ? 'warn' : 'info', title, message, { sticky: password });
      return;
    }
    if (change.resource === 'companyuser' && (change.action === 'delete' || change.action === 'bulk_delete')) {
      this.toast.notify('error', title, message, { life: SIGN_OUT_DELAY_MS });
      clearTimeout(this.reloadTimer);
      clearTimeout(this.signOutTimer);
      this.signOutTimer = setTimeout(() => this.auth.user() && this.auth.endSession(), SIGN_OUT_DELAY_MS);
      return;
    }
    this.toast.notify('info', title, message);
    clearTimeout(this.reloadTimer);
    this.reloadTimer = setTimeout(() => this.access.reload(() => this.leaveIfNotAllowed()), ACCESS_RELOAD_DEBOUNCE_MS);
  }

  /** The same check as permissionGuard, on the page that is open now. */
  private leaveIfNotAllowed(): void {
    const allowed = this.routeChain(this.router.routerState.snapshot.root).every((route) => {
      const permission = route.data['permission'] as string | undefined;
      return !permission || this.access.can(permission);
    });
    if (!allowed) {
      this.toast.warn(this.translate.instant('notifications.accessLost'));
      void this.router.navigate(['/dashboard']);
    }
  }

  private routeChain(root: ActivatedRouteSnapshot): ActivatedRouteSnapshot[] {
    const chain = [root];
    let route = root;
    while (route.firstChild) {
      route = route.firstChild;
      chain.push(route);
    }
    return chain;
  }
}
