import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { AccessService } from '../../../core/auth/access.service';
import { ModuleActivityService, moduleActivityFor } from '../../activity/module-activity';
import { ButtonComponent } from '../../ui/button/button.component';

export interface PageHeaderAction {
  label: string;
  icon?: string;
  severity?: 'success' | 'info' | 'warn' | 'danger' | 'help' | 'primary' | 'secondary' | 'contrast';
  onClick: () => void;
  disabled?: boolean;
}

/**
 * Page title with an optional back link (forms) and action buttons (lists). Texts are translation keys.
 * On a module's list screen (see MODULE_ACTIVITY_RESOURCES) it also shows an "Activity log" button for users who
 * may read the system log; it opens the module's log in the drawer the shell hosts.
 */
@Component({
  selector: 'app-page-header',
  imports: [ButtonComponent, DecimalPipe, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './page-header.component.html',
})
export class PageHeaderComponent {
  @Input() title = '';
  /** The list's total from the API, shown as "Customers (125)"; null while unknown (loading or unavailable). */
  @Input() count: number | null | undefined = null;
  @Input() subtitle?: string;
  @Input() showBack = false;
  @Input() backLabel = 'common.back';
  @Input() actions: PageHeaderAction[] = [];
  @Output() back = new EventEmitter<void>();

  /** The screen's module activity, from its path; detail and form screens have none (they have record history). */
  private readonly activity = moduleActivity(inject(ActivatedRoute, { optional: true }));
  private readonly access = this.activity ? inject(AccessService) : null;
  private readonly activityDrawer = this.activity ? inject(ModuleActivityService) : null;
  readonly showActivity = computed(() => !!this.activity && !!this.access?.can('view_auditlog'));

  openActivity(): void {
    if (this.activity) {
      this.activityDrawer?.open(this.activity);
    }
  }
}

function moduleActivity(route: ActivatedRoute | null) {
  // Partial routes (test stubs) have no path: no activity then.
  const path = route?.snapshot?.pathFromRoot?.flatMap((r) => r.url?.map((segment) => segment.path) ?? []).join('/');
  return path === undefined ? null : moduleActivityFor(`/${path}`);
}
