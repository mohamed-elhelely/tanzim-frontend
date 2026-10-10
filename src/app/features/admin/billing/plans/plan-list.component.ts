import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { AppError } from '../../../../core/errors/app-error';
import { ConfirmService } from '../../../../core/services/confirm.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { PageHeaderAction, PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { FormDialogService } from '../../../../shared/forms/form-dialog.service';
import { errorTitleKey } from '../../../../shared/utils/server-errors';
import { Plan } from '../platform-billing.models';
import { PlanService } from '../platform-billing.service';
import { PlanFormComponent } from './plan-form.component';

/** /admin/plans: the plan catalog companies subscribe to (staff). */
@Component({
  selector: 'app-plan-list',
  imports: [DecimalPipe, TranslatePipe, ButtonModule, TableModule, PageHeaderComponent, EmptyStateComponent, ErrorStateComponent, StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './plan-list.component.html',
})
export class PlanListComponent implements OnInit {
  private readonly api = inject(PlanService);
  private readonly formDialog = inject(FormDialogService);
  private readonly confirm = inject(ConfirmService);

  readonly plans = signal<Plan[]>([]);
  readonly loading = signal(true);
  readonly error = signal<AppError | null>(null);
  readonly errorTitleKey = errorTitleKey;
  readonly headerActions: PageHeaderAction[] = [{ label: 'admin.billing.plans.new', icon: 'pi pi-plus', onClick: () => this.openForm() }];

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.all().subscribe({
      next: (plans) => {
        this.plans.set(plans);
        this.loading.set(false);
      },
      error: (error: AppError) => {
        this.error.set(error);
        this.loading.set(false);
      },
    });
  }

  /** Create (no id) or edit in a dialog over the list; the list reloads after a save. */
  openForm(id?: number): void {
    this.formDialog.open(PlanFormComponent, { header: id ? 'admin.billing.plans.edit' : 'admin.billing.plans.new', id }).subscribe(() => this.load());
  }

  moduleNames(plan: Plan): string {
    return plan.included_modules.map((module) => module.name).join(', ');
  }

  confirmDelete(plan: Plan): void {
    this.confirm.confirmDelete(plan.name, () => this.api.remove(plan.id), () => this.load());
  }
}
