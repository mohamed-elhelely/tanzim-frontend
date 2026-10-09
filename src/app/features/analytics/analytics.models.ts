/**
 * Types for the analytics endpoints (/api/reports/v1/, API_REFERENCE.md → "Analytics, reports & dashboards").
 * Amounts and ratios are JSON numbers; percentages are 0–100 and null when there is nothing to divide by.
 */

/** A report cell or summary value: numbers, text, dates, lists of flags, or nested rows. */
export type AnalyticsValue = string | number | boolean | null | AnalyticsValue[] | { [key: string]: AnalyticsValue };
export type AnalyticsRow = Record<string, AnalyticsValue>;

export interface ReportType {
  report_type: string;
  name: string;
  module: string;
}

export interface ReportResult {
  report_type: string;
  columns: string[];
  rows: AnalyticsRow[];
  summary: Record<string, AnalyticsValue>;
}

export const DASHBOARD_NAMES = ['overview', 'sales', 'inventory', 'finance', 'operations', 'purchasing', 'administration'] as const;
export type DashboardName = (typeof DASHBOARD_NAMES)[number];

export type KpiUnit = 'currency' | 'number' | 'percent' | 'days' | 'ratio';

export interface Kpi {
  key: string;
  /** English; the screen shows `analytics.labels.<key>` and falls back to this. */
  label: string;
  value: number | null;
  unit: KpiUnit;
  /** Only on KPIs compared with the previous window of the same length. */
  previous?: number | null;
  change_percent?: number | null;
}

export interface DashboardAlert {
  level: 'warning' | 'critical';
  /** English only: there is no key to translate by (BACKEND_REQUESTS 27). */
  message: string;
  count: number | null;
}

export interface Dashboard {
  dashboard: DashboardName;
  title: string;
  start_date: string;
  end_date: string;
  kpis: Kpi[];
  charts: Record<string, AnalyticsRow[]>;
  tables: Record<string, AnalyticsRow[]>;
  alerts: DashboardAlert[];
}

export interface DashboardRef {
  dashboard: DashboardName;
  title: string;
}

/** How a dashboard chart is drawn: the category field and the numeric fields to plot. */
export interface ChartSpec {
  type: 'line' | 'bar' | 'doughnut';
  category: string;
  series: string[];
  /** Horizontal bars, for long category names (customers, products). */
  horizontal?: boolean;
  stacked?: boolean;
  /** Translate the category by this field's value under this key prefix (e.g. a status code), not the English label. */
  categoryKey?: { field: string; prefix: string };
}

/**
 * 🧠 The charts the dashboards send, by name. A chart missing here, or whose rows lack these fields, is shown as a
 * table instead, so a backend change never breaks the page (see fitsSpec).
 */
export const CHART_SPECS: Record<string, ChartSpec> = {
  sales_trend: { type: 'line', category: 'period', series: ['revenue'] },
  margin_trend: { type: 'line', category: 'period', series: ['revenue', 'gross_profit', 'net_income'] },
  spend_trend: { type: 'line', category: 'period', series: ['spend'] },
  order_pipeline: { type: 'bar', category: 'label', series: ['value'], categoryKey: { field: 'status', prefix: 'sales.orderStatuses' } },
  top_products: { type: 'bar', category: 'variant', series: ['net_sales'], horizontal: true },
  top_customers: { type: 'bar', category: 'customer', series: ['revenue'], horizontal: true },
  spend_by_supplier: { type: 'bar', category: 'supplier', series: ['spend'], horizontal: true },
  stock_aging: { type: 'bar', category: 'bucket', series: ['quantity'] },
  movement: { type: 'bar', category: 'sku', series: ['inbound', 'outbound'] },
  warehouses: { type: 'bar', category: 'warehouse', series: ['stock_value'] },
  cash_flow: { type: 'bar', category: 'category', series: ['inflow', 'outflow'] },
  receivables_aging: { type: 'bar', category: 'bucket', series: ['amount'] },
  payables_aging: { type: 'bar', category: 'bucket', series: ['amount'] },
  return_reasons: { type: 'doughnut', category: 'label', series: ['returns'], categoryKey: { field: 'reason', prefix: 'returns.reasons' } },
  inspections_by_source: { type: 'bar', category: 'label', series: ['passed', 'failed'], stacked: true },
  ncrs_by_severity: { type: 'bar', category: 'label', series: ['open', 'closed'], stacked: true },
  activity_by_user: { type: 'bar', category: 'name', series: ['creates', 'updates', 'deletes'], stacked: true, horizontal: true },
};

/** Whether `rows` can be drawn with `spec`: every row has the category and the first row every series as a number. */
export function fitsSpec(spec: ChartSpec | undefined, rows: AnalyticsRow[]): spec is ChartSpec {
  if (!spec || rows.length === 0) {
    return false;
  }
  return rows.every((row) => spec.category in row) && spec.series.every((field) => typeof rows[0][field] === 'number');
}

export type ReportParam =
  | 'start_date'
  | 'end_date'
  | 'as_of_date'
  | 'period'
  | 'limit'
  | 'warehouse'
  | 'method'
  | 'days_ahead'
  | 'inactive_days';

const WINDOW: ReportParam[] = ['start_date', 'end_date'];

/** The parameters each report takes (API_REFERENCE.md → "Report types"); a report not listed takes none. */
export const REPORT_PARAMS: Record<string, ReportParam[]> = {
  inventory_valuation: ['warehouse', 'as_of_date', 'method'],
  stock_aging: ['warehouse', 'as_of_date'],
  inventory_movement: [...WINDOW, 'warehouse'],
  abc_analysis: [...WINDOW, 'warehouse'],
  supplier_performance: WINDOW,
  warehouse_utilization: [],
  reorder_status: ['warehouse'],
  stock_turnover: [...WINDOW, 'warehouse'],
  expiry: ['warehouse', 'days_ahead'],
  sales_performance: [...WINDOW, 'period'],
  top_customers: [...WINDOW, 'limit'],
  product_sales: [...WINDOW, 'limit'],
  order_pipeline: ['as_of_date'],
  delivery_performance: WINDOW,
  customer_health: ['as_of_date', 'inactive_days'],
  return_rate: [...WINDOW, 'limit'],
  return_reasons: WINDOW,
  quality_inspections: WINDOW,
  ncr_summary: WINDOW,
  quarantine_status: ['as_of_date'],
  work_order_performance: WINDOW,
  component_shortages: [],
  purchase_spend: [...WINDOW, 'period'],
  purchase_price_trend: [...WINDOW, 'limit'],
  open_purchase_orders: ['as_of_date'],
  cash_flow: WINDOW,
  financial_kpis: WINDOW,
  margin_trend: [...WINDOW, 'period'],
  webhook_health: WINDOW,
  user_activity: WINDOW,
};

/** inventory_movement answers 400 without both dates. */
export const REQUIRED_PARAMS: Record<string, ReportParam[]> = {
  inventory_movement: ['start_date', 'end_date'],
};

export const REPORT_GROUP_ORDER = ['inventory', 'sales', 'operations', 'purchasing', 'finance', 'administration'] as const;

/** The picker's group for each report; reports not listed go under "other". */
export const REPORT_GROUPS: Record<string, string> = {
  inventory_valuation: 'inventory',
  stock_aging: 'inventory',
  inventory_movement: 'inventory',
  abc_analysis: 'inventory',
  warehouse_utilization: 'inventory',
  reorder_status: 'inventory',
  stock_turnover: 'inventory',
  expiry: 'inventory',
  sales_performance: 'sales',
  top_customers: 'sales',
  product_sales: 'sales',
  order_pipeline: 'sales',
  delivery_performance: 'sales',
  customer_health: 'sales',
  return_rate: 'operations',
  return_reasons: 'operations',
  quality_inspections: 'operations',
  ncr_summary: 'operations',
  quarantine_status: 'operations',
  work_order_performance: 'operations',
  component_shortages: 'operations',
  supplier_performance: 'purchasing',
  purchase_spend: 'purchasing',
  purchase_price_trend: 'purchasing',
  open_purchase_orders: 'purchasing',
  cash_flow: 'finance',
  financial_kpis: 'finance',
  margin_trend: 'finance',
  webhook_health: 'administration',
  user_activity: 'administration',
};

/** Keys whose numbers are money (two decimals). Percentages, days and counts are shown as they come. */
const MONEY = /(revenue|value|amount|cost|spend|sales|profit|income|cash|receivable|payable|refund|expense|inflow|outflow|capital|^credit_limit$|gross_margin$|^net$|^net_(?!margin)|^total$)/;

export function isMoneyKey(key: string): boolean {
  return !key.endsWith('_percent') && !key.endsWith('_days') && !key.startsWith('days_') && MONEY.test(key);
}

/** Columns that only carry ids for links; tables hide them. */
export function isIdKey(key: string): boolean {
  return key === 'id' || key.endsWith('_id');
}
