/**
 * The backend's system permission catalog (company/access.py, API_REFERENCE.md → "Permissions"), mirrored so the
 * UI can group permissions by module, require the module's `access_<module>` permission next to a CRUD codename,
 * and tell system permissions (read-only through the API) from a company's own. Keep it in step with the backend.
 */

export type PermissionAction = 'view' | 'add' | 'change' | 'delete';

export const PERMISSION_ACTIONS: PermissionAction[] = ['view', 'add', 'change', 'delete'];

const CRUD: PermissionAction[] = PERMISSION_ACTIONS;
const READ_ONLY: PermissionAction[] = ['view'];

export interface CatalogModule {
  code: string;
  /** i18n key of the module name. */
  labelKey: string;
  resources: Array<{ resource: string; actions: PermissionAction[] }>;
}

export const PERMISSION_MODULES: CatalogModule[] = [
  {
    code: 'company',
    labelKey: 'permissionCatalog.modules.company',
    resources: [
      { resource: 'company', actions: ['view', 'change'] },
      { resource: 'department', actions: CRUD },
      { resource: 'team', actions: CRUD },
      { resource: 'role', actions: CRUD },
      { resource: 'permissiongroup', actions: CRUD },
      { resource: 'permission', actions: CRUD },
      { resource: 'companyuser', actions: CRUD },
    ],
  },
  {
    code: 'location',
    labelKey: 'permissionCatalog.modules.location',
    resources: ['country', 'region', 'city', 'district', 'location'].map((resource) => ({ resource, actions: CRUD })),
  },
  {
    code: 'inventory',
    labelKey: 'permissionCatalog.modules.inventory',
    resources: [
      ...['category', 'brand', 'product', 'productattribute', 'productattributevalue', 'productvariant', 'productbom'],
      ...['warehouse', 'zone', 'bin', 'batch', 'serialnumber'],
      'stockledger',
      'stocksnapshot',
      ...['stockreservation', 'stockalert', 'stocktransfer', 'stockadjustment', 'cyclecount'],
      ...['supplier', 'supplierproduct', 'purchaserequisition', 'purchaseorder', 'goodsreceipt', 'supplierinvoice'],
      ...['approvalworkflow', 'approvalrequest', 'reorderpolicy', 'reordersuggestion', 'demandforecast'],
    ].map((resource) => ({
      resource,
      actions: resource === 'stockledger' || resource === 'stocksnapshot' ? READ_ONLY : CRUD,
    })),
  },
  {
    code: 'quality',
    labelKey: 'permissionCatalog.modules.quality',
    resources: ['qualityinspection', 'nonconformancereport', 'quarantinerecord'].map((resource) => ({ resource, actions: CRUD })),
  },
  {
    code: 'assembly',
    labelKey: 'permissionCatalog.modules.assembly',
    resources: [{ resource: 'workorder', actions: CRUD }],
  },
  {
    code: 'sales',
    labelKey: 'permissionCatalog.modules.sales',
    resources: [
      ...['customer', 'salesorder', 'deliverynote', 'salesinvoice', 'invoicepayment'].map((resource) => ({ resource, actions: CRUD })),
      { resource: 'salesaudittrail', actions: READ_ONLY },
    ],
  },
  {
    code: 'returns',
    labelKey: 'permissionCatalog.modules.returns',
    resources: ['customerreturn', 'supplierreturn'].map((resource) => ({ resource, actions: CRUD })),
  },
  {
    code: 'accounting',
    labelKey: 'permissionCatalog.modules.accounting',
    resources: [
      ...['account', 'journalentry', 'fiscalyear', 'fiscalperiod', 'supplierpayment', 'debitnote'].map((resource) => ({
        resource,
        actions: CRUD,
      })),
      { resource: 'accountingreport', actions: READ_ONLY },
    ],
  },
  {
    code: 'reports',
    labelKey: 'permissionCatalog.modules.reports',
    resources: [
      { resource: 'report', actions: READ_ONLY },
      { resource: 'dashboard', actions: READ_ONLY },
      { resource: 'savedreport', actions: CRUD },
      { resource: 'reportschedule', actions: CRUD },
    ],
  },
  {
    code: 'integrations',
    labelKey: 'permissionCatalog.modules.integrations',
    resources: [{ resource: 'webhook', actions: CRUD }],
  },
];

/** `access_inventory` etc.: the feature permission a user needs before any of the module's APIs answer. */
export function moduleCodename(module: string): string {
  return `access_${module}`;
}

/** i18n key of a resource's name, e.g. `permissionCatalog.resources.salesorder`. */
export function resourceLabelKey(resource: string): string {
  return `permissionCatalog.resources.${resource}`;
}

const RESOURCE_MODULE = new Map<string, string>(
  PERMISSION_MODULES.flatMap((module) => module.resources.map(({ resource }) => [resource, module.code] as const)),
);

const SYSTEM_CODENAMES = new Set<string>(
  PERMISSION_MODULES.flatMap((module) => [
    moduleCodename(module.code),
    ...module.resources.flatMap(({ resource, actions }) => actions.map((action) => `${action}_${resource}`)),
  ]),
);

/** The module whose `access_` permission a CRUD codename also needs, e.g. `add_salesorder` → `sales`. */
export function codenameModule(codename: string): string | null {
  const match = /^(view|add|change|delete)_(.+)$/.exec(codename);
  return match ? (RESOURCE_MODULE.get(match[2]) ?? null) : null;
}

/** Catalog permissions can't be changed or deleted through the API (403). */
export function isSystemCodename(codename: string): boolean {
  return SYSTEM_CODENAMES.has(codename);
}
