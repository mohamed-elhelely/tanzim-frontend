import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TextareaModule } from 'primeng/textarea';
import { AppError } from '../../../core/errors/app-error';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { PageHeaderAction, PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { ReasonDialogComponent } from '../../../shared/components/reason-dialog/reason-dialog.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { errorTitleKey } from '../../../shared/utils/server-errors';
import { DELIVERY_STATUS_SEVERITY, DeliveryNote, SHIPPING_METHODS, ShippingMethod } from '../sales.models';
import { DeliveryNoteService } from './delivery-note.service';

/**
 * One delivery note and its workflow: draft → confirmed → in transit → delivered or failed
 * (pick-ups go from confirmed straight to delivered). The stock was issued when the note was created.
 */
@Component({
  selector: 'app-delivery-note-detail',
  imports: [
    DecimalPipe,
    FormsModule,
    RouterLink,
    TranslatePipe,
    ButtonModule,
    CardModule,
    DialogModule,
    InputTextModule,
    SelectModule,
    TableModule,
    TextareaModule,
    PageHeaderComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    ReasonDialogComponent,
    StatusBadgeComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './delivery-note-detail.component.html',
})
export class DeliveryNoteDetailComponent implements OnInit {
  private readonly api = inject(DeliveryNoteService);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmService);

  readonly id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id'));
  readonly note = signal<DeliveryNote | null>(null);
  readonly loadError = signal<AppError | null>(null);
  /** The carrier dialog edits the details of a draft, or collects carrier/tracking when handing over. */
  readonly carrierDialog = signal<'details' | 'ship' | null>(null);
  readonly failDialogOpen = signal(false);
  readonly saving = signal(false);
  form = { shipping_method: 'standard' as ShippingMethod, carrier: '', tracking_number: '', notes: '' };
  readonly errorTitleKey = errorTitleKey;
  readonly statusSeverity = DELIVERY_STATUS_SEVERITY;
  readonly methodOptions = SHIPPING_METHODS.map((method) => ({ value: method, label: `sales.shippingMethods.${method}` }));

  readonly actions = computed<PageHeaderAction[]>(() => {
    const note = this.note();
    if (!note) {
      return [];
    }
    const actions: PageHeaderAction[] = [];
    if (note.status === 'draft') {
      actions.push({ label: 'sales.actions.editDetails', icon: 'pi pi-pencil', severity: 'secondary', onClick: () => this.openCarrier('details') });
      actions.push({ label: 'sales.actions.confirmDelivery', icon: 'pi pi-check', onClick: () => this.confirmDelivery() });
    }
    if (note.status === 'confirmed' && note.shipping_method !== 'pickup') {
      actions.push({ label: 'sales.actions.handToCarrier', icon: 'pi pi-truck', onClick: () => this.openCarrier('ship') });
    }
    if (note.status === 'in_transit' || (note.status === 'confirmed' && note.shipping_method === 'pickup')) {
      actions.push({ label: 'sales.actions.markDelivered', icon: 'pi pi-flag', onClick: () => this.markDelivered() });
    }
    if (note.status === 'in_transit') {
      actions.push({ label: 'sales.actions.markFailed', icon: 'pi pi-times', severity: 'danger', onClick: () => this.failDialogOpen.set(true) });
    }
    return actions;
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loadError.set(null);
    this.api.detail(this.id).subscribe({
      next: (note) => this.note.set(note),
      error: (error: AppError) => this.loadError.set(error),
    });
  }

  goBack(): void {
    void this.router.navigate(['/sales/deliveries']);
  }

  saveCarrier(): void {
    const mode = this.carrierDialog();
    const carrier = this.form.carrier.trim();
    const tracking = this.form.tracking_number.trim();
    this.saving.set(true);
    const request =
      mode === 'ship'
        ? () => this.api.ship(this.id, carrier, tracking)
        : () =>
            this.api
              .update(this.id, { shipping_method: this.form.shipping_method, carrier, tracking_number: tracking, notes: this.form.notes.trim() });
    this.confirm.runAction(
      request,
      mode === 'ship' ? 'sales.toasts.handedToCarrier' : 'common.saved',
      () => {
        this.saving.set(false);
        this.carrierDialog.set(null);
        // The PATCH answers with the write shape (no names or lines), so read the note again.
        this.load();
      },
      () => this.saving.set(false),
    );
  }

  onFailConfirmed(reason: string): void {
    this.confirm.runAction(
      () => this.api.markFailed(this.id, reason),
      'sales.toasts.deliveryFailed',
      (note) => {
        this.failDialogOpen.set(false);
        this.note.set(note);
      },
    );
  }

  private openCarrier(mode: 'details' | 'ship'): void {
    const note = this.note();
    this.form = {
      shipping_method: note?.shipping_method ?? 'standard',
      carrier: note?.carrier ?? '',
      tracking_number: note?.tracking_number ?? '',
      notes: note?.notes ?? '',
    };
    this.carrierDialog.set(mode);
  }

  private confirmDelivery(): void {
    this.confirm.confirmAction({
      message: 'sales.confirm.confirmDelivery',
      accept: 'sales.actions.confirmDelivery',
      success: 'sales.toasts.deliveryConfirmed',
      run: () => this.api.confirmDelivery(this.id),
      onDone: (note) => this.note.set(note),
    });
  }

  private markDelivered(): void {
    this.confirm.confirmAction({
      message: 'sales.confirm.deliveryDelivered',
      accept: 'sales.actions.markDelivered',
      success: 'sales.toasts.deliveryDelivered',
      run: () => this.api.markDelivered(this.id),
      onDone: (note) => this.note.set(note),
    });
  }
}
