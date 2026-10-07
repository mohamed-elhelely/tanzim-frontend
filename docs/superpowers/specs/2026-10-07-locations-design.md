# Step 5 — Locations (design)

Date: 2026-10-07
Status: implemented; not yet checked against a running backend

## Goal

Give a company admin a working **Locations** screen: list, search, create, edit and delete physical
addresses (used by teams and, later, warehouses), in English and Arabic, on desktop and mobile.

Source of truth: backend `docs/API_REFERENCE.md` → "Locations", `docs/BUSINESS_LOGIC.md` §5, and
`company/serializers/location.py`.

## Decisions taken

| Topic | Decision |
|---|---|
| Scope | Locations only. Countries, regions, cities and districts are picked from what the backend already has; screens to manage them are out of scope. |
| Hierarchy picker | Cascading: Country → Region → City → District. Choosing a parent clears the levels below it. |
| Filtering by parent | The geo endpoints have no parent filter and `dropdown=true` returns only `id, name_en, name_ar`, so the form loads the first page of 100 (the backend's max `page_size`) of each level, with the nested parent, and filters in the browser. |
| Saved values outside that page | On edit, the location's own country/region/city/district (nested in the retrieve response) are added to the picker lists so they still show by name. |
| Routes | `/locations`, `/locations/new`, `/locations/:id/edit` (lazy `LOCATION_ROUTES`); replaces the "coming soon" placeholder. The sidebar entry was already there. |

## API used

| Call | Use |
|---|---|
| `GET/POST /api/company/v1/location/`, `GET/PATCH/DELETE …/location/{id}/` | `LocationService` (`CrudApi<Location, LocationPayload>`) |
| `GET /api/company/v1/{country,region,city,district}/?page=1&page_size=100&ordering=name_en` | `CountryService`, `RegionService`, `CityService`, `DistrictService` (`options()`) |

All require the `location` subscription module (403 otherwise).

## Screens

- **List**: ID (sortable), name EN (sortable), name AR, code, type, city, address (`full_address`, falling back to
  `address_line1` because the backend omits `full_address` when empty), active badge, edit/delete. Search hits
  `name_en`/`name_ar`. 403 shows the "no access" state.
- **Form**: name EN*, name AR, code (3–10 chars, unique on the backend), type* (`office` default, `warehouse`,
  `retail`, `factory`, `remote`), country*, region*, city*, district, address line 1*, address line 2, postal code,
  active (default on). Saving is blocked with a notice when the geo lists are forbidden (403), empty (no countries),
  or fail to load. Backend field errors (e.g. "City must belong to selected region") show under the field.

## Tests

`location-list.component.spec.ts`, `location-form.component.spec.ts`, geo services in `company-services.spec.ts`
(Jasmine/Karma with `HttpTestingController`). Browser check with a mocked API: list and edit pages in English
(1280 px) and Arabic RTL (375 px).

## Open points to verify against the running backend

1. Create/update with `address_line2: ""` and `postal_code: null` succeeds.
2. Delete of a location used by a team: expected 400/409 from `on_delete=PROTECT`; the list shows the backend message.
3. Companies with more than 100 regions/cities/districts: only the first 100 (by English name) are offered. If this
   matters, the backend should add parent filters (e.g. `?country=`) to the geo endpoints.

## Out of scope

- Screens to create/edit countries, regions, cities, districts.
- Hiding the Locations menu when the subscription lacks the `location` module.
