import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { AppError } from '../../core/errors/app-error';
import { ConfirmService } from '../../core/services/confirm.service';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { errorTitleKey } from '../../shared/utils/server-errors';
import { SessionsService, UserSession, describeUserAgent } from './sessions.service';
import { AppDatePipe } from '../../shared/pipes/app-date.pipe';
import { CardComponent } from '../../shared/ui/card/card.component';

/**
 * "Signed-in devices" on the profile page: every session of this user with its browser, OS, IP and last use;
 * sign one device out, or all but this one. Two-factor login doesn't exist yet.
 */
@Component({
  selector: 'app-signed-in-devices',
  imports: [CardComponent, AppDatePipe, TranslatePipe, ButtonModule, StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './signed-in-devices.component.html',
})
export class SignedInDevicesComponent implements OnInit {
  private readonly api = inject(SessionsService);
  private readonly confirm = inject(ConfirmService);

  readonly sessions = signal<UserSession[] | null>(null);
  readonly error = signal<AppError | null>(null);
  readonly errorTitleKey = errorTitleKey;
  readonly describe = describeUserAgent;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.error.set(null);
    this.api.list().subscribe({
      next: (sessions) => this.sessions.set(sessions),
      error: (error: AppError) => this.error.set(error),
    });
  }

  hasOthers(): boolean {
    return (this.sessions() ?? []).some((session) => !session.current);
  }

  signOut(session: UserSession): void {
    this.confirm.confirmAction({
      message: 'profile.sessions.confirmSignOut',
      accept: 'profile.sessions.signOut',
      success: 'profile.sessions.signedOut',
      danger: true,
      run: () => this.api.revoke(session.id),
      onDone: () => this.sessions.update((sessions) => (sessions ?? []).filter((s) => s.id !== session.id)),
    });
  }

  signOutOthers(): void {
    this.confirm.confirmAction({
      message: 'profile.sessions.confirmSignOutOthers',
      accept: 'profile.sessions.signOutOthers',
      success: 'profile.sessions.signedOutOthers',
      danger: true,
      run: () => this.api.revokeOthers(),
      onDone: () => this.load(),
    });
  }
}
