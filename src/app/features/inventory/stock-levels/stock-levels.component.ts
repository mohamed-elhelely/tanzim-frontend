import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { AppError } from '../../../core/errors/app-error';
import { NotificationService } from '../../../core/services/notification.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { saveFile } from '../../../shared/utils/save-file';
import { errorTitleKey } from '../../../shared/utils/server-errors';
import {
  CodedRef,
  StockLevelRow,
  StockReservation,
  StockValuation,
  VALUATION_REPORT_METHODS,
  ValuationReportMethod,
  VariantRef,
} from '../inventory.models';
import { ProductVariantService } from '../variants/product-variant.service';
import { WarehouseService } from '../warehouses/warehouse.service';
import { InventoryReportService } from './inventory-report.service';
import { StockReservationService } from './stock-reservation.service';

export interface StockLevel extends StockLevelRow {
  variantName: string;
  /** Held by open reservations; null for a past date (reservations are only known for now). */
  reserved: number | null;
  available: number | null;
}

/**
 * Stock on hand per variant, from the inventory valuation report (all warehouses or one, today or at a past date,
 * valued by average, FIFO or LIFO). 🧠 Reserved and available come from the open reservations, the same way the
 * backend's get_available does (on hand − reserved); they are only shown for today.
 */
@Component({
  selector: 'app-stock-levels',
  imports: [
    DecimalPipe,
    FormsModule,
    TranslatePipe,
    ButtonModule,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    SelectModule,
    TableModule,
    PageHeaderComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    StatusBadgeComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './stock-levels.component.html',
})
export class StockLevelsComponent implements OnInit {
  private readonly api = inject(InventoryReportService);
  private readonly reservationsApi = inject(StockReservationService);
  private readonly warehousesApi = inject(WarehouseService);
  private readonly variantsApi = inject(ProductVariantService);
  private readonly notifications = inject(NotificationService);

  readonly warehouseOptions = signal<{ value: number; label: string }[]>([]);
  readonly methodOptions = VALUATION_REPORT_METHODS.map((method) => ({ value: method, label: `inventory.valuationMethods.${method}` }));
  warehouse: number | null = null;
  asOfDate = '';
  method: ValuationReportMethod = 'AVERAGE';

  readonly report = signal<StockValuation | null>(null);
  /** Whether the shown report is for today (so reservations apply). */
  readonly isCurrent = signal(true);
  private readonly shownWarehouse = signal<number | null>(null);
  readonly loading = signal(false);
  readonly exporting = signal(false);
  readonly error = signal<AppError | null>(null);
  readonly search = signal('');
  private readonly variantNames = signal<ReadonlyMap<number, string>>(new Map());
  private readonly reservations = signal<StockReservation[]>([]);
  readonly errorTitleKey = errorTitleKey;

  readonly rows = computed<StockLevel[]>(() => {
    const names = this.variantNames();
    const warehouse = this.shownWarehouse();
    const current = this.isCurrent();
    const reserved = new Map<number, number>();
    for (const reservation of this.reservations()) {
      if (warehouse === null || reservation.warehouse?.id === warehouse) {
        const id = reservation.product_variant.id;
        reserved.set(id, (reserved.get(id) ?? 0) + Number(reservation.quantity));
      }
    }
    const term = this.search().trim().toLowerCase();
    return (this.report()?.rows ?? [])
      .map((row) => {
        const held = current ? (reserved.get(row.variant_id) ?? 0) : null;
        return {
          ...row,
          variantName: names.get(row.variant_id) ?? '',
          reserved: held,
          available: held === null ? null : row.quantity - held,
        };
      })
      .filter((row) => !term || [row.sku, row.product, row.variantName].some((text) => text.toLowerCase().includes(term)));
  });

  ngOnInit(): void {
    this.warehousesApi.dropdown<CodedRef>().subscribe({
      next: (items) => this.warehouseOptions.set(items.map((w) => ({ value: w.id, label: `${w.name} (${w.code})` }))),
      error: () => undefined,
    });
    this.variantsApi.dropdown<VariantRef>().subscribe({
      next: (items) => this.variantNames.set(new Map(items.map((v) => [v.id, v.name]))),
      error: () => undefined,
    });
    // Without reservations the table still shows on-hand stock; reserved then reads 0.
    this.reservationsApi.open().subscribe({ next: (items) => this.reservations.set(items), error: () => undefined });
    this.run();
  }

  run(): void {
    this.loading.set(true);
    this.error.set(null);
    const warehouse = this.warehouse;
    const current = !this.asOfDate;
    this.api.valuation(this.query()).subscribe({
      next: (report) => {
        this.report.set(report);
        this.shownWarehouse.set(warehouse);
        this.isCurrent.set(current);
        this.loading.set(false);
      },
      error: (error: AppError) => {
        this.error.set(error);
        this.loading.set(false);
      },
    });
  }

  exportXlsx(): void {
    this.exporting.set(true);
    this.api.valuationXlsx(this.query()).subscribe({
      next: (blob) => {
        this.exporting.set(false);
        saveFile(blob, `stock_${this.asOfDate || new Date().toISOString().slice(0, 10)}.xlsx`);
      },
      error: (error: AppError) => {
        this.exporting.set(false);
        if (error.status >= 400 && error.status < 500) {
          this.notifications.error(error.message);
        }
      },
    });
  }

  private query(): Record<string, string> {
    const query: Record<string, string> = { method: this.method };
    if (this.warehouse !== null) {
      query['warehouse'] = String(this.warehouse);
    }
    if (this.asOfDate) {
      query['as_of_date'] = this.asOfDate;
    }
    return query;
  }
}
