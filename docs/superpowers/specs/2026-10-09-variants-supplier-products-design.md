# Step 11 — Product variants and supplier price list (design)

Date: 2026-10-09
Status: built and verified against the local backend (the backend added `/api/inventory/v1/product-variant/`)

## Goal

Create the variants (SKUs) that stock and purchasing need, and each supplier's price per variant.

## Decisions taken

| Topic | Decision |
|---|---|
| Variants screen | `/inventory/variants`, its own list and form. The products list gets a "Variants" button per row that opens the list filtered with `?product=` (the backend supports this exact-match filter). The filter shows as a chip with "Show all"; the list reloads when the query param changes. |
| Filters in `CrudApi` | `ListQuery.filters` adds exact-match query params (`{ product: 3 }` → `?product=3`). `ServerTable` stays generic: the list's fetch function adds the filter. |
| Attributes | Edited as name/value rows (a `FormArray`) and sent as one object (`{ "color": "red" }`); names must be unique (case-insensitive). |
| Not edited | `dimensions` (free JSON) and `image` (multipart) are never sent, so they're never overwritten. |
| ⚠️ `weight_uom` | Not returned by the read endpoint: `omitPristine` (empty on edit means "keep"). New variants default to `kg`. |
| Supplier price list | `/inventory/supplier-products`: supplier, variant ("SKU — name"), supplier SKU and name, unit cost, currency, min/max quantity, lead time, preferred/primary, validity dates, notes. Defaults on create: USD, min qty 1, starts today. |
| ⚠️ Partial read data | The supplier-product read endpoint returns only supplier, variant and `is_preferred` (no cost, quantities or dates). The list shows supplier, SKU, variant and product; the edit form shows the notice and sends only changed fields (verified: the cost stayed 700 after an edit). |

## Verification results (2026-10-09, against the local backend)

| Check | Result | What the frontend does |
|---|---|---|
| `GET product-variant/?product=2` | filters by product | Variants button + chip |
| Variant read | all fields except `weight_uom` | `omitPristine` for `weight_uom` |
| Duplicate SKU | 400 under `sku` — across **all** companies (`sku` is globally unique) | Shown under the field; raise on the backend |
| Supplier-product read | only `supplier`, `product_variant`, `is_preferred` | Notice + `omitPristine` |
| `GET supplier-product/?supplier=999` | filter ignored (returns everything) | No supplier filter in the UI |

Browser walk: Products → Variants (chip "Product: Phone X") → New variant (product preselected) with two attributes
and a price → back in the filtered list; "Show all" clears the filter; created a supplier price and edited only the
"primary" flag (PATCH carried supplier, variant, preferred, primary; cost, SKU and lead time unchanged); English,
Arabic, dark mode, 390 px; no console errors, no 4xx.
