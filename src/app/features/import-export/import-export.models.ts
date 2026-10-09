import { AppModuleCode } from '../../layout/nav/nav-items';

/** One resource the backend can import and export (`/api/{path}/import/` and `/export/`). */
export interface DataResource {
  /** Stable key, also the translation key under `importExport.resources`. */
  key: string;
  /** API path without /api/ and without the trailing import/ or export/, e.g. 'inventory/v1/category/'. */
  path: string;
  group: 'company' | 'locations' | 'inventory';
  /** Shown only with this subscription module. */
  module?: AppModuleCode;
  /** Shown only with this permission (company resources; the backend checks the same add_/view_ permissions). */
  permission?: string;
}

/** Everything API_REFERENCE.md → "Import & export" lists, in menu order. */
export const DATA_RESOURCES: DataResource[] = [
  { key: 'department', path: 'company/v1/department/', group: 'company', permission: 'add_department' },
  { key: 'team', path: 'company/v1/team/', group: 'company', permission: 'add_team' },
  { key: 'location', path: 'company/v1/location/', group: 'locations', module: 'location' },
  { key: 'country', path: 'company/v1/country/', group: 'locations', module: 'location' },
  { key: 'region', path: 'company/v1/region/', group: 'locations', module: 'location' },
  { key: 'city', path: 'company/v1/city/', group: 'locations', module: 'location' },
  { key: 'district', path: 'company/v1/district/', group: 'locations', module: 'location' },
  { key: 'product', path: 'inventory/v1/product/', group: 'inventory', module: 'inventory' },
  { key: 'productVariant', path: 'inventory/v1/product-variant/', group: 'inventory', module: 'inventory' },
  { key: 'productAttribute', path: 'inventory/v1/product-attribute/', group: 'inventory', module: 'inventory' },
  { key: 'category', path: 'inventory/v1/category/', group: 'inventory', module: 'inventory' },
  { key: 'brand', path: 'inventory/v1/brand/', group: 'inventory', module: 'inventory' },
  { key: 'warehouse', path: 'inventory/v1/warehouse/', group: 'inventory', module: 'inventory' },
  { key: 'zone', path: 'inventory/v1/zone/', group: 'inventory', module: 'inventory' },
  { key: 'bin', path: 'inventory/v1/bin/', group: 'inventory', module: 'inventory' },
  { key: 'supplier', path: 'inventory/v1/supplier/', group: 'inventory', module: 'inventory' },
  { key: 'supplierProduct', path: 'inventory/v1/supplier-product/', group: 'inventory', module: 'inventory' },
  { key: 'batch', path: 'inventory/v1/batch/', group: 'inventory', module: 'inventory' },
  { key: 'serialNumber', path: 'inventory/v1/serial-number/', group: 'inventory', module: 'inventory' },
];

export type ExportFormat = 'csv' | 'xlsx';

export type ImportRowStatus = 'new' | 'updated' | 'errors' | 'skipped' | 'warnings';

export interface ImportStats {
  new: number;
  updated: number;
  errors: number;
  skipped: number;
  warnings: number;
}

export interface ImportPreviewRow {
  row: number;
  status: ImportRowStatus;
  data: Record<string, unknown>;
  error: string | null;
  warning: string | null;
}

export interface ImportResult {
  success: boolean;
  dry_run: boolean;
  task_id: string;
  stats: ImportStats;
  /** Per-row result of a dry run. */
  preview?: ImportPreviewRow[];
}

export type TaskStatus = 'pending' | 'processing' | 'completed' | 'failed';

/** GET common/v1/tasks/ (newest first). */
export interface DataTask {
  task_id: string;
  task_type: 'import' | 'export';
  /** Python path of the model, e.g. "inventory.models.product.Category". */
  resource: string;
  filename: string | null;
  status: TaskStatus;
  created_at: string;
  completed_at: string | null;
  total_rows: number | null;
  success_rows: number | null;
  error_rows: { detailed_errors?: { row: number; error: string }[]; import_error?: string } | null;
  download_url: string | null;
  created_by_name: string | null;
}

/** The last part of a task's model path, e.g. "Category". */
export function taskModelName(resource: string): string {
  return resource.split('.').pop() ?? resource;
}
