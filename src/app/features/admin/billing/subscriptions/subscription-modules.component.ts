import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { AccessService } from '../../../../core/auth/access.service';
import { ConfirmService } from '../../../../core/services/confirm.service';
import { BillingModule, MODULE_EDITABLE_STATUSES, Subscription } from '../platform-billing.models';
import { BillingModuleService, SubscriptionService } from '../platform-billing.service';
import { ToggleComponent } from '../../../../shared/ui/toggle/toggle.component';

/**
 * Switches a subscription's feature modules on (add_module) and off (remove_module, after a confirm), with the
 * estimated monthly add-on cost. Staff only: hidden for everyone else. Emits the subscription as the backend has it
 * after each change.
 */
@Component({
  selector: 'app-subscription-modules',
  imports: [ToggleComponent, DecimalPipe, FormsModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './subscription-modules.component.html',
})
export class SubscriptionModulesComponent implements OnInit {
  private readonly api = inject(SubscriptionService);
  private readonly modulesApi = inject(BillingModuleService);
  private readonly access = inject(AccessService);
  private readonly confirm = inject(ConfirmService);

  readonly subscription = input.required<Subscription>();
  readonly changed = output<Subscription>();

  /** The subscription as last fetched: starts from the input, replaced after each change. */
  readonly current = linkedSignal(() => this.subscription());
  readonly isStaff = this.access.isStaff;
  readonly catalog = signal<BillingModule[]>([]);
  readonly catalogLoading = signal(true);
  /** The module whose request is in flight; every toggle waits for it. */
  readonly busyModule = signal<number | null>(null);

  /** Module id → price per user, for the modules switched on (`is_active` entries only). */
  readonly enabled = computed(() => {
    const prices = new Map<number, number>();
    for (const item of this.current().modules ?? []) {
      if (item.is_active) {
        prices.set(item.module.id, Number(item.price_per_user ?? item.module.price_per_user ?? 0));
      }
    }
    return prices;
  });
  /** What each toggle shows: the backend's state, flipped while the user's change is pending. */
  readonly toggles = linkedSignal(() => this.serverToggles());
  /** The active catalog, plus anything still enabled on the subscription after being retired from it. */
  readonly rows = computed(() => this.catalog().filter((module) => module.is_active || this.enabled().has(module.id)));
  readonly editable = computed(() => MODULE_EDITABLE_STATUSES.includes(this.current().status));
  /** Sum of the enabled modules' price per user (the price the subscription locked in, else the catalog's). */
  readonly perUser = computed(() => [...this.enabled().values()].reduce((sum, price) => sum + (Number.isFinite(price) ? price : 0), 0));
  readonly estimatedCost = computed(() => this.perUser() * (this.current().licensed_users || 0));

  ngOnInit(): void {
    if (!this.isStaff()) {
      return;
    }
    this.modulesApi.all().subscribe({
      next: (modules) => {
        this.catalog.set(modules);
        this.catalogLoading.set(false);
      },
      error: () => {
        this.catalog.set([]);
        this.catalogLoading.set(false);
      },
    });
  }

  toggle(module: BillingModule, on: boolean): void {
    const subscription = this.current();
    if (this.busyModule() !== null || !this.editable()) {
      return;
    }
    this.toggles.update((state) => ({ ...state, [module.id]: on }));
    this.busyModule.set(module.id);
    const revert = () => {
      this.toggles.update((state) => ({ ...state, [module.id]: !on }));
      this.busyModule.set(null);
    };
    if (on) {
      this.confirm.runAction(
        () => this.api.addModule(subscription.id, module.id),
        'admin.billing.subscriptions.moduleEnabled',
        () => this.refresh(subscription.id),
        () => this.refresh(subscription.id),
      );
      return;
    }
    this.confirm.confirmAction({
      message: 'admin.billing.subscriptions.confirmDisableModule',
      params: { name: module.name },
      accept: 'admin.billing.subscriptions.disableModule',
      success: 'admin.billing.subscriptions.moduleDisabled',
      danger: true,
      run: () => this.api.removeModule(subscription.id, module.id),
      onDone: () => this.refresh(subscription.id),
      onError: () => this.refresh(subscription.id),
      onCancel: revert,
    });
  }

  /** Shows the subscription as the backend now has it, and updates the menus if it's the user's own company. */
  private refresh(id: number): void {
    this.api.retrieve(id).subscribe({
      next: (subscription) => {
        this.current.set(subscription);
        // A new object even when nothing changed, so a failed toggle snaps back.
        this.toggles.set(this.serverToggles());
        this.busyModule.set(null);
        if (this.access.current()?.company?.id === subscription.company) {
          this.access.reload();
        }
        this.changed.emit(subscription);
      },
      error: () => {
        this.toggles.set(this.serverToggles());
        this.busyModule.set(null);
      },
    });
  }

  private serverToggles(): Record<number, boolean> {
    return Object.fromEntries(this.catalog().map((module) => [module.id, this.enabled().has(module.id)]));
  }
}
