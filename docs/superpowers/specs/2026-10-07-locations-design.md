# Step 5 — Locations (design)

Date: 2026-10-07
Status: approved in chat (scope, cascading pickers, sidebar group)

## Goal

Give a company admin working screens for the geographic hierarchy and the company's physical locations:
**Countries → Regions → Cities → Districts → Locations**. Each screen lists, searches, creates, edits and
deletes records through the real backend API, in English and Arabic (LTR/RTL), on desktop and mobile.

Source of truth: backend repo `0Mustafa37/Tanzim`, `docs/API_REFERENCE.md` → "Locations",
`docs/BUSINESS_LOGIC.md` (location hierarchy), and the serializers in `company/serializers/location.py`
where the docs are out of date.

## Decisions taken

| Topic | Decision |
|---|---|
| Scope | All 5 resources. A Location needs an existing country, region and city, so without the other four screens no location can be created from the UI. |
| Cascading pickers | Filtered in the browser. The backend has no parent filter (`?country=`), and `dropdown=true` returns only `id, name_en, name_ar`, so the forms load the full paginated lists (page size 100, all pages) and filter by the nested parent object. |
| Sidebar | "Locations" becomes an expandable group like "Company", with routes under `/locations`. |
| Code structure | Same as Step 4: `CrudApi` service per resource + explicit list/form components per resource. |

## 1. Routes and sidebar

Sidebar group `nav.locations` (module `location`) with children:

| Label | Route |
|---|---|
| Company locations | `/locations/sites` |
| Countries | `/locations/countries` |
| Regions | `/locations/regions` |
| Cities | `/locations/cities` |
| Districts | `/locations/districts` |

`/locations` redirects to `/locations/sites`. Each resource has `…/new` and `…/:id/edit`.
`src/app/features/locations/locations.routes.ts` is lazy-loaded with `loadChildren`; the placeholder
`LocationsPageComponent` is deleted.

```
src/app/features/locations/
  locations.routes.ts
  locations.models.ts
  location.service.ts          (existing file, now typed with the full Location model)
  countries/  regions/  cities/  districts/  sites/
```

## 2. API layer

All paths under `company/v1/`, paginated (default 10, max 100), `search` on `name_en`/`name_ar`,
`ordering` on `id`/`name_en`, updates with PATCH.

| Service | Path |
|---|---|
| `CountryService` | `company/v1/country/` |
| `RegionService` | `company/v1/region/` |
| `CityService` | `company/v1/city/` |
| `DistrictService` | `company/v1/district/` |
| `LocationService` | `company/v1/location/` |

New `CrudApi.listAll()`: requests page 1 with `page_size=100`; if `total_count` is larger, requests the
remaining pages in parallel and concatenates them. Used to fill the cascading pickers.

## 3. Screens

### Countries
- List: ID, name EN, name AR, ISO code, phone code, active.
- Form: `name_en`* (≤100), `name_ar` (≤100), `iso_code`* (2 letters, sent upper-case), `phone_code`*
  (`+` and 1–4 digits), `is_active` (default on).

### Regions
- List: ID, name EN, name AR, code, country.
- Form: `name_en`*, `name_ar`, `code` (optional, 2–3 letters, sent upper-case, empty → `""` because the
  column is not nullable), `country`* (country dropdown).

### Cities
- List: ID, name EN, name AR, region, country, timezone.
- Form: `name_en`*, `name_ar`, `region`* (options labelled "Region — Country", from `listAll()`),
  `timezone` (filterable list from the browser's `Intl.supportedValuesOf('timeZone')` plus `UTC`, default
  `UTC`).

### Districts
- List: ID, name EN, name AR, postal code prefix, city, region.
- Form: `name_en`*, `name_ar`, `postal_code_prefix` (3–5 digits, empty → `null`), `city`* (options labelled
  "City — Region", from `listAll()`).

### Company locations (sites)
- List: ID, name EN, name AR, code, type, city, address line 1, active.
- Form: `name_en`*, `name_ar`, `code` (3–10 chars, empty → `null`), `location_type` (office / warehouse /
  retail / factory / remote, default office), `country`*, `region`*, `city`*, `district`, `address_line1`*
  (≤200), `address_line2` (≤200, empty → `""`), `postal_code` (≤20, empty → `null`), `is_active` (default on).
- Cascade: region options = regions of the chosen country, city options = cities of the chosen region,
  district options = districts of the chosen city. Changing a parent **by hand** clears the pickers below it
  (driven by the dropdown's `onChange`, so loading a record in edit mode never clears anything).
- Updates always send the full body, which also avoids known issue #5 (PATCH 500 without country+region).

## 4. Shared changes

- `FieldErrorComponent` shows `minlength` and `pattern` errors. `pattern` uses an optional
  `patternKey` input so each field can explain its format.
- New translation section `locations` (en + ar); new nav keys for the group children.

## Open points to verify against the backend

1. `City.timezone` accepts any common timezone (serializer uses `pytz.common_timezones`), not only
   `UTC`/`GMT` as the docs' known issue #9 says.
2. `PATCH /location/{id}/` without `country`/`region` no longer returns 500 (serializer falls back to the
   stored values). The frontend sends them anyway.
3. `full_address` is never returned (serializer source `get_full_address` doesn't exist on the model), so
   the list shows `address_line1` + city instead.

## Verification results (2026-10-07, against the backend at `0Mustafa37/Tanzim@f033209`)

Checked with real requests as the seeded company admin (`setup_data.py`, plus an active subscription with the
`location` module).

| Open point | Result | What the frontend does |
|---|---|---|
| 1. City `timezone` | `Africa/Cairo` accepted (201). The docs' "only UTC/GMT" is out of date. | Full time-zone list, `UTC` and `GMT` first. |
| 2. `PATCH /location/{id}/` with only `name_en` | **200**. Known issue #5 is fixed in the current backend. | Still sends the full body, which is harmless and works on older backends. |
| 3. `full_address` | Never in the response. | List shows `address_line1` + city. |
| Extra: region not in the chosen country | **400** `{"region": ["Region must belong to selected country"]}` | Shown under the Region picker (tested). |
| Extra: `?dropdown=true` | Only `id`, `name_en`, `name_ar` | Cascades use `listAll()`, as designed. |
| Extra: `DELETE /region/{id}/` while a location uses it | **204** (soft delete; the location keeps pointing at it) | Nothing; worth raising with the backend. |
| Extra: create a region with the same name as a soft-deleted one in that country | **500** (`UNIQUE constraint failed: company_region.country_id, company_region.name_en`) | The global error toast; the user has to pick another name. |

Backend issues to raise: soft-deleting a country/region/city/district that is still in use succeeds silently;
re-using the name of a soft-deleted record returns 500 (the `unique_together` constraints ignore `is_deleted`);
`full_address` uses a missing `get_full_address` source; API docs still list known issues #5 and #9.

Browser walk (Chromium, `ng serve` + proxy): all five lists load; a location created through the cascading
pickers saves and shows in the list; switching the country by hand clears region/city/district; editing keeps
the saved hierarchy; Arabic is RTL with translated labels and type names; at 375 px the form stacks to one
column. No console errors.

## Out of scope

- Map / geocoding.
- Import/export of locations.
- Hiding the menu when the subscription has no `location` module (lists show the forbidden state on 403).
