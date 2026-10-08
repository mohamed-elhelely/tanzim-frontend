# Step 7 — Inventory catalogue: Products, Categories, Brands (design)

Date: 2026-10-08
Status: built and verified against the local backend; first part of "Inventory phase 1" agreed in chat
(warehouses and suppliers come next)

## Goal

Give a company with the `inventory` module screens to list, search, create, edit and delete its products,
product categories and brands, in English and Arabic (LTR/RTL), on desktop and mobile.

Source of truth: backend `docs/API_REFERENCE.md` → "Inventory — catalogue", and `inventory/serializers/product.py`,
`inventory/models/product.py`, `inventory/apis/product.py`.

## Decisions taken

| Topic | Decision |
|---|---|
| Sidebar and routes | "Inventory" becomes a group (module `inventory`) with Products, Categories and Brands under `/inventory/...`; `/inventory` redirects to products. The "coming soon" placeholder is removed. |
| Code structure | Same as Steps 4–5: one `CrudApi` service per resource and explicit list/form components, copied from Departments. Lists are server-paged, with debounced search and sorting by id/name (the backend's only `ordering_fields`). |
| Category parent | Picker built from the full category list (`listAll`), labelled with the full path (`Electronics › Phones`). The category itself and its descendants are left out, so the tree can't loop (the backend doesn't check). |
| Category edit | **Workaround:** the backend's duplicate check doesn't exclude the record being edited, so re-sending an unchanged name and parent returns 400 "already exists". The form sends `name` and `parent` only on create or when one of them changed. |
| Product enums | `product_type` (simple / variant / bundle / service) and `valuation_method` (average / FIFO / LIFO) as translated selects; defaults match the backend (`simple`, `average`, uom `each`). |
| Shelf life | Shown only when "Has expiry date" is on; whole number ≥ 1; sent as `null` otherwise. |
| Description | Always sent as a string (the backend rejects `null`). |
| Images and logos | Out of scope (multipart upload), like the company logo. |
| Variants | Not in this step: the backend has no ProductVariant CRUD (BACKEND_REQUESTS.md item 17). Products of type "With variants" can be created, but their variants can't. |

Also fixed: a sidebar group gated by a module (Inventory, Locations) stayed collapsed when its page was opened by URL,
because the group only appears once the subscription has loaded. The active group is now looked up in all items.

## Verification results (2026-10-08, against the local backend)

| Check | Result | What the frontend does |
|---|---|---|
| PATCH a category re-sending its unchanged name and parent | **400** "Category with this name already exists under this parent." | Omits unchanged `name`/`parent`; verified the edit saves. |
| Duplicate brand name | 400 `non_field_errors` "The fields company, name must make a unique set." | Shown above the form. |
| Product with `description: null` | 400 "This field may not be null." | Always sends a string. |
| Delete a brand still used by a product | **204**; the product keeps showing the deleted brand | Nothing yet; raise on the backend. |
| Delete a parent category | **204**; children keep pointing at the deleted parent | Nothing yet; raise on the backend. |
| `ordering` other than id/name | ignored (200) | Only id and name columns are sortable. |

Browser walk (company admin, `inventory` module on): sidebar group with Products/Categories/Brands; create a child
category, edit a category without renaming; create a brand; create a product with category, brand, type "Bundle" and
a shelf life; edit loads every field back; English, Arabic (RTL), dark mode and 390 px mobile; no console errors and
no 4xx responses.
