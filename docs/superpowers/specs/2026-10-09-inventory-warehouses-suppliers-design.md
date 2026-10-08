# Step 8 — Inventory: warehouses, zones, bins and suppliers (design)

Date: 2026-10-09
Status: built and verified against the local backend; second part of "Inventory phase 1"

## Goal

Screens to list, search, create, edit and delete warehouses, their zones and bins, and suppliers, in English
and Arabic (LTR/RTL), on desktop and mobile. Built with the recipes in `docs/ARCHITECTURE.md`.

Source of truth: backend `docs/API_REFERENCE.md` → "Inventory — warehouses" / "Inventory — suppliers", and
`inventory/serializers/warehouse.py`, `inventory/serializers/supplier.py`, `inventory/models/warehouse.py`,
`inventory/models/supplier.py`.

## Decisions taken

| Topic | Decision |
|---|---|
| Sidebar and routes | Warehouses, Zones, Bins and Suppliers join the Inventory group under `/inventory/...`. |
| **Partial read data** ⚠️ | The read serializers return only some fields (warehouse: no code, contact or address; zone: no code or description; bin: no code, barcode, capacity or type; supplier: none of the contact, address or terms fields). Edit forms show those fields empty with a notice, and `omitPristine()` (`shared/utils`) leaves them out of the PATCH unless the user typed in them, so saving never blanks a stored value. Verified: editing a warehouse's name kept its phone and city. |
| Codes | Warehouse, zone and bin codes come from `?dropdown=true` (the only place they are returned): the lists show them by id, and the edit forms prefill them. |
| Warehouse manager | **Not shown.** Sending `manager` makes the backend answer 500 (it filters users by a `company_id` they don't have). |
| Pickers | Zone → warehouse from the dropdown, labelled "Name (CODE)". Bin → zone from the full zone list (the dropdown has no warehouse), labelled "Warehouse › Zone". |
| Supplier numbers | `lead_time_days` and `reliability_score` can't be null, so empty means 0 (the backend default). Reliability is **0–1**, validated client-side. Currency defaults to USD (the backend default) and is required on create. |
| Supplier products | **Not built.** Each one needs a `product_variant`, and the backend has no API to create variants (BACKEND_REQUESTS item 17). |

## Verification results (2026-10-09, against the local backend)

| Check | Result | What the frontend does |
|---|---|---|
| GET warehouse/zone/bin/supplier detail | Only some fields come back (see above) | Notice + `omitPristine()` on edit |
| `?dropdown=true` for warehouse/zone/bin | `id`, `name`, `code` | Codes for lists and edit forms |
| POST warehouse with `manager: 1` | **500** `Cannot resolve keyword 'company_id'` | No manager field |
| Duplicate warehouse code | 400 under `code` "warehouse with this code already exists." — **across all companies** (`code` is globally unique) | Shown under the field; raise on the backend |
| Duplicate zone name in a warehouse / bin name in a zone / supplier name | 400 `non_field_errors` "… must make a unique set." | Shown above the form |
| Supplier `reliability_score: 4.5` | 400 "less than or equal to 1" | Client check 0–1 |
| Supplier `lead_time_days: null` | 400 "may not be null" | Empty → 0 |
| Bin `max_capacity: ""` or null | accepted | Empty → null |
| PATCH with only some fields | other fields kept | Basis of `omitPristine()` |

Browser walk (company admin, `inventory` module on): created a warehouse (type, location, phone, city, bin
tracking), edited only its name (PATCH carried no contact/address fields; phone and city still saved), created a
zone and a bin under it (list shows "Warehouse › Zone"), created a supplier with contact, terms and preferred flag;
English, Arabic (RTL), dark mode and 390 px mobile; no console errors and no 4xx responses.
