# Company & Organisation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give a company admin working list/create/edit/delete screens for Users, Departments, Teams, Roles, Permission groups and Permissions, backed by the real Tanzim API, in English and Arabic.

**Architecture:** A shared `CrudApi<T, TPayload>` (in `core/api`) does the standard HTTP calls and unwraps the `{ success, data, metadata }` envelope; each resource has a ~10-line service extending it. Each resource then has its own explicit list page (PrimeNG `p-table`) and form page (reactive form), reached through an expandable "Company" sidebar group and lazy routes under `/company`.

**Tech Stack:** Angular 18.2 standalone components + signals, PrimeNG 17.18 (`p-table`, `p-dropdown`, `p-multiSelect`, `p-inputSwitch`), Tailwind CSS, ngx-translate, Jasmine/Karma with `HttpTestingController`.

**Spec:** `docs/superpowers/specs/2026-10-07-company-organisation-design.md`
**API source of truth:** `D:\tanzim\backend\Tanzim\docs\API_REFERENCE.md` → "Company & organisation".

## Global Constraints

- Angular 18 standalone components only; no NgModules, no Angular Material, no Taiga UI, no new npm dependencies.
- All API paths are relative to `API_BASE_URL` (`/api/` in dev) and **must end with `/`**.
- Updates use **PATCH** (`PUT` requires every required field).
- Never send `company`, `created_by`, `updated_by`, `is_deleted`, `deleted_at`.
- Department `manager` and team `leads` are **User** ids (`company_user.user.id`), not company-user ids.
- Company-user list is unpaginated (`all()`); every other company list is paginated (`page`, `page_size` default 10 max 100, `search`, `ordering`, `dropdown=true`).
- Every user-visible string goes through ngx-translate with keys in both `src/assets/i18n/en.json` and `ar.json`.
- Layout must work LTR and RTL: use logical Tailwind classes (`ps-`, `pe-`, `ms-`, `me-`, `text-start`, `text-end`), never `pl-`/`pr-`/`ml-`/`mr-`/`text-left`/`text-right`.
- Out of scope: platform Companies screen, permission-based hiding, creating locations, subscription-module menu hiding.
- Commit after every task; every commit message ends with the trailer line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Single-file test command: `npx ng test --watch=false --browsers=ChromeHeadless --include=<spec path>`.
- Full suite: `npx ng test --watch=false --browsers=ChromeHeadless`; build: `npm run build`.

**Deviation from spec (naming only):** the spec's `get(id)` is named `retrieve(id)` because `BaseApiService` already has a protected `get<T>(path)` and a public method of the same name would clash.

## Review Focus

1. Typing quickly in a search box → exactly one request after 300 ms, starting again from page 1 (test in Task 6).
2. Deleting the only row on the last page → the list moves to the previous page instead of showing an empty page (test in Task 6).
3. Editing a department → that department is not offered as its own parent (test in Task 6).
4. Clearing an optional picker on edit → the PATCH body sends `null`, not an omitted field (test in Task 6).
5. Server rejects a nested user field (`{"user": {"email": ["…already exists"]}}`) → the message shows under the Email field, not lost (test in Task 11).

---

## File map

| File | Responsibility | Task |
|---|---|---|
| `src/app/core/api/crud-api.ts` (+ spec) | Generic list/all/dropdown/retrieve/create/update/remove + envelope unwrap | 1 |
| `src/app/testing/api-testing.ts` | Test-only: envelope builders and common test providers | 1 |
| `src/app/shared/pipes/localized-name.pipe.ts` (+ spec) | `localizedName()` fn + pipe: AR/EN name choice | 2 |
| `src/app/shared/pipes/user-name.pipe.ts` (+ spec) | `userName()` fn + pipe for `UserRef` | 2 |
| `src/app/shared/utils/server-errors.ts` (+ spec) | `applyServerErrors()` and `errorTitleKey()` | 2 |
| `src/app/shared/components/field-error/field-error.component.ts` (+ spec) | One control's validation/server message | 3 |
| `src/app/shared/components/page-header/*` (+ spec) | Add `back` output | 3 |
| `src/app/layout/shell/shell.component.*` | Host the confirm dialog | 3 |
| `src/styles.scss` | CSS layer order so PrimeNG styles beat Tailwind's reset | 3 |
| `src/app/features/company/company.models.ts` | Response, payload and option types | 4 |
| `src/app/features/company/*/…service.ts`, `src/app/features/locations/location.service.ts` (+ specs) | One service per resource | 4 |
| `src/app/testing/company-fixtures.ts` | Test-only sample records | 4 |
| `src/app/layout/nav/nav-items.ts`, `nav-list.component.ts` (+ spec) | Expandable Company group | 5 |
| `src/app/features/company/company.routes.ts`, `src/app/app.routes.ts` | Lazy company routes | 5 |
| `src/assets/i18n/en.json`, `ar.json` | All new keys | 5 |
| `src/app/features/company/departments/*` | Department list + form | 6 |
| `src/app/features/company/permission-groups/*` | Permission group list + form | 7 |
| `src/app/features/company/permissions/*` | Permission list + form | 8 |
| `src/app/features/company/roles/*` | Role list + form | 9 |
| `src/app/features/company/teams/*` | Team list + form | 10 |
| `src/app/features/company/users/*` | User list + form | 11 |
| — | Full verification + open points | 12 |

---

### Task 1: `CrudApi` base class and test helpers

**Files:**
- Create: `src/app/core/api/crud-api.ts`
- Create: `src/app/core/api/crud-api.spec.ts`
- Create: `src/app/testing/api-testing.ts`

**Interfaces:**
- Consumes: `BaseApiService` (`src/app/core/api/base-api.service.ts`, protected `get/post/patch/delete<T>(path, …)` returning `Observable<ApiResponse<T>>`), `Paginated<T>` (`src/app/core/models/api-response.model.ts`: `{ items: T[]; total: number; page: number; pageSize: number }`).
- Produces:
  - `interface ListQuery { page: number; pageSize: number; search?: string; ordering?: string }`
  - `abstract class CrudApi<T, TPayload>` with `protected abstract readonly path: string` and methods
    `list(q: ListQuery): Observable<Paginated<T>>`, `all(): Observable<T[]>`, `dropdown<D>(): Observable<D[]>`,
    `retrieve(id: number): Observable<T>`, `create(body: TPayload): Observable<T>`,
    `update(id: number, body: Partial<TPayload>): Observable<T>`, `remove(id: number): Observable<void>`.
  - Test helpers: `envelope<T>(data: T, totalCount?: number)`, `errorEnvelope(code: number, message: string, errors?: Record<string, unknown>)`, `provideApiTesting(): (Provider | EnvironmentProviders)[]`.

- [ ] **Step 1: Create the test helpers**

`src/app/testing/api-testing.ts`:

```ts
import { EnvironmentProviders, Provider } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { errorInterceptor } from '../core/interceptors/error.interceptor';

/** A successful API response in the backend's envelope. */
export function envelope<T>(data: T, totalCount?: number) {
  return {
    success: true,
    data,
    metadata: {
      timestamp: '2026-10-07T00:00:00Z',
      version: '1.0',
      ...(totalCount === undefined ? {} : { total_count: totalCount }),
    },
  };
}

/** A failed API response in the backend's envelope. */
export function errorEnvelope(code: number, message: string, errors: Record<string, unknown> = {}) {
  return {
    success: false,
    data: null,
    metadata: { timestamp: '2026-10-07T00:00:00Z', version: '1.0' },
    error: { code, message, errors },
  };
}

/**
 * Providers for component/service tests that talk to HttpTestingController.
 * Includes the real error interceptor so failures arrive as AppError, like in the app.
 */
export function provideApiTesting(): (Provider | EnvironmentProviders)[] {
  return [
    provideRouter([]),
    provideHttpClient(withInterceptors([errorInterceptor])),
    provideHttpClientTesting(),
    provideAnimations(),
    provideTranslateService(),
    MessageService,
    ConfirmationService,
  ];
}
```

- [ ] **Step 2: Write the failing test**

`src/app/core/api/crud-api.spec.ts`:

```ts
import { Injectable } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { envelope, provideApiTesting } from '../../testing/api-testing';
import { CrudApi } from './crud-api';

interface Thing {
  id: number;
  name_en: string;
}

interface ThingPayload {
  name_en: string;
}

@Injectable({ providedIn: 'root' })
class ThingApi extends CrudApi<Thing, ThingPayload> {
  protected readonly path = 'test/v1/things/';
}

const URL = '/api/test/v1/things/';

describe('CrudApi', () => {
  let api: ThingApi;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: provideApiTesting() });
    api = TestBed.inject(ThingApi);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lists a page with paging, search and ordering params', () => {
    let result: unknown;
    api.list({ page: 2, pageSize: 25, search: 'sal', ordering: '-name_en' }).subscribe((r) => (result = r));

    const req = httpMock.expectOne((r) => r.url === URL);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('page_size')).toBe('25');
    expect(req.request.params.get('search')).toBe('sal');
    expect(req.request.params.get('ordering')).toBe('-name_en');
    req.flush(envelope([{ id: 1, name_en: 'Sales' }], 31));

    expect(result).toEqual({ items: [{ id: 1, name_en: 'Sales' }], total: 31, page: 2, pageSize: 25 });
  });

  it('omits empty search and ordering', () => {
    api.list({ page: 1, pageSize: 10, search: '', ordering: undefined }).subscribe();
    const req = httpMock.expectOne((r) => r.url === URL);
    expect(req.request.params.has('search')).toBeFalse();
    expect(req.request.params.has('ordering')).toBeFalse();
    req.flush(envelope([]));
  });

  it('falls back to the item count when total_count is missing', () => {
    let total = -1;
    api.list({ page: 1, pageSize: 10 }).subscribe((r) => (total = r.total));
    httpMock.expectOne((r) => r.url === URL).flush(envelope([{ id: 1, name_en: 'A' }]));
    expect(total).toBe(1);
  });

  it('loads the full list without params', () => {
    let items: Thing[] = [];
    api.all().subscribe((r) => (items = r));
    const req = httpMock.expectOne(URL);
    expect(req.request.params.keys().length).toBe(0);
    req.flush(envelope([{ id: 1, name_en: 'A' }]));
    expect(items.length).toBe(1);
  });

  it('loads the dropdown list with dropdown=true', () => {
    api.dropdown<{ id: number }>().subscribe();
    const req = httpMock.expectOne((r) => r.url === URL);
    expect(req.request.params.get('dropdown')).toBe('true');
    req.flush(envelope([]));
  });

  it('retrieves one record by id with a trailing slash', () => {
    let item: Thing | undefined;
    api.retrieve(5).subscribe((r) => (item = r));
    const req = httpMock.expectOne(`${URL}5/`);
    expect(req.request.method).toBe('GET');
    req.flush(envelope({ id: 5, name_en: 'Five' }));
    expect(item).toEqual({ id: 5, name_en: 'Five' });
  });

  it('creates with POST', () => {
    api.create({ name_en: 'New' }).subscribe();
    const req = httpMock.expectOne(URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name_en: 'New' });
    req.flush(envelope({ id: 9, name_en: 'New' }), { status: 201, statusText: 'Created' });
  });

  it('updates with PATCH', () => {
    api.update(5, { name_en: 'Renamed' }).subscribe();
    const req = httpMock.expectOne(`${URL}5/`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ name_en: 'Renamed' });
    req.flush(envelope({ id: 5, name_en: 'Renamed' }));
  });

  it('removes with DELETE and completes on 204', () => {
    let done = false;
    api.remove(5).subscribe({ complete: () => (done = true) });
    const req = httpMock.expectOne(`${URL}5/`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
    expect(done).toBeTrue();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include=src/app/core/api/crud-api.spec.ts`
Expected: compile error `Cannot find module './crud-api'`.

- [ ] **Step 4: Write the implementation**

`src/app/core/api/crud-api.ts`:

```ts
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { Paginated } from '../models/api-response.model';
import { BaseApiService } from './base-api.service';

export interface ListQuery {
  page: number;
  pageSize: number;
  search?: string;
  ordering?: string;
}

/**
 * Standard calls for one backend resource. Subclasses only set `path`,
 * e.g. 'company/v1/departments/' (always keep the trailing slash).
 */
@Injectable()
export abstract class CrudApi<T, TPayload> extends BaseApiService {
  protected abstract readonly path: string;

  list(query: ListQuery): Observable<Paginated<T>> {
    const params: Record<string, string | number> = { page: query.page, page_size: query.pageSize };
    if (query.search) {
      params['search'] = query.search;
    }
    if (query.ordering) {
      params['ordering'] = query.ordering;
    }
    return this.get<T[]>(this.path, { params }).pipe(
      map((response) => {
        const items = response.data ?? [];
        return {
          items,
          total: response.metadata?.total_count ?? items.length,
          page: query.page,
          pageSize: query.pageSize,
        };
      }),
    );
  }

  all(): Observable<T[]> {
    return this.get<T[]>(this.path).pipe(map((response) => response.data ?? []));
  }

  dropdown<D>(): Observable<D[]> {
    return this.get<D[]>(this.path, { params: { dropdown: 'true' } }).pipe(map((response) => response.data ?? []));
  }

  retrieve(id: number): Observable<T> {
    return this.get<T>(this.detailPath(id)).pipe(map((response) => response.data as T));
  }

  create(body: TPayload): Observable<T> {
    return this.post<T>(this.path, body).pipe(map((response) => response.data as T));
  }

  update(id: number, body: Partial<TPayload>): Observable<T> {
    return this.patch<T>(this.detailPath(id), body).pipe(map((response) => response.data as T));
  }

  remove(id: number): Observable<void> {
    return this.delete<unknown>(this.detailPath(id)).pipe(map(() => undefined));
  }

  protected detailPath(id: number): string {
    return `${this.path}${id}/`;
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include=src/app/core/api/crud-api.spec.ts`
Expected: `TOTAL: 9 SUCCESS`.

- [ ] **Step 6: Commit**

```bash
git add src/app/core/api/crud-api.ts src/app/core/api/crud-api.spec.ts src/app/testing/api-testing.ts
git commit -m "Add CrudApi base class for standard resource calls" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Name pipes and server-error helpers

**Files:**
- Create: `src/app/shared/pipes/localized-name.pipe.ts`, `src/app/shared/pipes/localized-name.pipe.spec.ts`
- Create: `src/app/shared/pipes/user-name.pipe.ts`, `src/app/shared/pipes/user-name.pipe.spec.ts`
- Create: `src/app/shared/utils/server-errors.ts`, `src/app/shared/utils/server-errors.spec.ts`

**Interfaces:**
- Consumes: `AppError` (`src/app/core/errors/app-error.ts`: `{ status: number; message: string; errors: Record<string, string[]>; raw?: unknown }`).
- Produces:
  - `interface Named { name_en?: string | null; name_ar?: string | null; name?: string | null }`
  - `localizedName(item: Named | null | undefined, lang: string): string` and pipe `localizedName` (usage `item | localizedName: lang()`)
  - `interface UserLike { full_name?: string; first_name?: string; last_name?: string; email?: string }`
  - `userName(user: UserLike | null | undefined): string` and pipe `userName`
  - `applyServerErrors(form: FormGroup, error: AppError, fieldMap?: Record<string, string>): string[]`
  - `errorTitleKey(error: AppError | null): string` → `'common.notFound' | 'common.forbidden' | 'common.error'`

- [ ] **Step 1: Write the failing tests**

`src/app/shared/pipes/localized-name.pipe.spec.ts`:

```ts
import { LocalizedNamePipe, localizedName } from './localized-name.pipe';

describe('localizedName', () => {
  const sales = { name_en: 'Sales', name_ar: 'المبيعات' };

  it('uses the Arabic name in Arabic', () => {
    expect(localizedName(sales, 'ar')).toBe('المبيعات');
  });

  it('uses the English name in English', () => {
    expect(localizedName(sales, 'en')).toBe('Sales');
  });

  it('falls back to English when the Arabic name is empty', () => {
    expect(localizedName({ name_en: 'Sales', name_ar: null }, 'ar')).toBe('Sales');
    expect(localizedName({ name_en: 'Sales', name_ar: '' }, 'ar')).toBe('Sales');
  });

  it('falls back to a plain name field', () => {
    expect(localizedName({ name: 'Head Office (HQ-01)' }, 'ar')).toBe('Head Office (HQ-01)');
  });

  it('returns an empty string for null', () => {
    expect(localizedName(null, 'en')).toBe('');
  });

  it('works as a pipe', () => {
    expect(new LocalizedNamePipe().transform(sales, 'ar')).toBe('المبيعات');
  });
});
```

`src/app/shared/pipes/user-name.pipe.spec.ts`:

```ts
import { UserNamePipe, userName } from './user-name.pipe';

describe('userName', () => {
  it('prefers full_name', () => {
    expect(userName({ full_name: 'Sara Ali', first_name: 'S', last_name: 'A' })).toBe('Sara Ali');
  });

  it('joins first and last name', () => {
    expect(userName({ first_name: 'Sara', last_name: 'Ali' })).toBe('Sara Ali');
  });

  it('falls back to the email', () => {
    expect(userName({ first_name: '', last_name: '', email: 'sara@acme.example' })).toBe('sara@acme.example');
  });

  it('returns an empty string for null', () => {
    expect(userName(null)).toBe('');
  });

  it('works as a pipe', () => {
    expect(new UserNamePipe().transform({ first_name: 'Sara', last_name: 'Ali' })).toBe('Sara Ali');
  });
});
```

`src/app/shared/utils/server-errors.spec.ts`:

```ts
import { FormControl, FormGroup } from '@angular/forms';
import { AppError } from '../../core/errors/app-error';
import { applyServerErrors, errorTitleKey } from './server-errors';

function makeForm() {
  return new FormGroup({
    name_en: new FormControl(''),
    email: new FormControl(''),
  });
}

function error(errors: Record<string, unknown>, status = 400): AppError {
  return { status, message: 'Unknown error', errors: errors as Record<string, string[]> };
}

describe('applyServerErrors', () => {
  it('puts field messages on the matching control and marks it touched', () => {
    const form = makeForm();
    const rest = applyServerErrors(form, error({ name_en: ['Already exists.'] }));

    expect(form.controls.name_en.errors).toEqual({ serverError: 'Already exists.' });
    expect(form.controls.name_en.touched).toBeTrue();
    expect(rest).toEqual([]);
  });

  it('maps nested keys through the field map', () => {
    const form = makeForm();
    applyServerErrors(form, error({ user: { email: ['Taken.'] } }), { 'user.email': 'email' });
    expect(form.controls.email.errors).toEqual({ serverError: 'Taken.' });
  });

  it('returns non_field_errors and unknown fields', () => {
    const form = makeForm();
    const rest = applyServerErrors(form, error({ non_field_errors: ['Bad combo.'], color: ['Nope.'] }));
    expect(rest).toEqual(['Bad combo.', 'Nope.']);
  });

  it('clears the server error when the value changes', () => {
    const form = makeForm();
    applyServerErrors(form, error({ name_en: ['Already exists.'] }));
    form.controls.name_en.setValue('Other');
    expect(form.controls.name_en.errors).toBeNull();
  });
});

describe('errorTitleKey', () => {
  it('maps status codes to title keys', () => {
    expect(errorTitleKey(error({}, 404))).toBe('common.notFound');
    expect(errorTitleKey(error({}, 403))).toBe('common.forbidden');
    expect(errorTitleKey(error({}, 500))).toBe('common.error');
    expect(errorTitleKey(null)).toBe('common.error');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include=src/app/shared/**/*.spec.ts`
Expected: compile errors, modules `./localized-name.pipe`, `./user-name.pipe`, `./server-errors` not found.

- [ ] **Step 3: Write the implementations**

`src/app/shared/pipes/localized-name.pipe.ts`:

```ts
import { Pipe, PipeTransform } from '@angular/core';

export interface Named {
  name_en?: string | null;
  name_ar?: string | null;
  name?: string | null;
}

/** Arabic name in Arabic when it exists, otherwise the English (or plain) name. */
export function localizedName(item: Named | null | undefined, lang: string): string {
  if (!item) {
    return '';
  }
  if (lang === 'ar' && item.name_ar) {
    return item.name_ar;
  }
  return item.name_en || item.name || '';
}

/** Usage: `{{ item | localizedName: lang() }}` — pass the language so it re-renders on switch. */
@Pipe({ name: 'localizedName', standalone: true })
export class LocalizedNamePipe implements PipeTransform {
  transform(item: Named | null | undefined, lang: string): string {
    return localizedName(item, lang);
  }
}
```

`src/app/shared/pipes/user-name.pipe.ts`:

```ts
import { Pipe, PipeTransform } from '@angular/core';

export interface UserLike {
  full_name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
}

export function userName(user: UserLike | null | undefined): string {
  if (!user) {
    return '';
  }
  const name = user.full_name || `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim();
  return name || user.email || '';
}

@Pipe({ name: 'userName', standalone: true })
export class UserNamePipe implements PipeTransform {
  transform(user: UserLike | null | undefined): string {
    return userName(user);
  }
}
```

`src/app/shared/utils/server-errors.ts`:

```ts
import { FormGroup } from '@angular/forms';
import { AppError } from '../../core/errors/app-error';

const NON_FIELD_ERRORS = 'non_field_errors';

/**
 * Puts backend validation messages (`error.errors`) on matching controls as `{ serverError }`.
 * Nested keys are flattened with dots ("user.email"); `fieldMap` renames them to control names.
 * Returns the messages that matched no control (including non_field_errors) for a top-of-form alert.
 * Angular re-runs validators when the value changes, which clears `serverError` automatically.
 */
export function applyServerErrors(
  form: FormGroup,
  error: AppError,
  fieldMap: Record<string, string> = {},
): string[] {
  const unmatched: string[] = [];
  for (const [field, messages] of flattenErrors(error.errors ?? {}, '')) {
    const control = field === NON_FIELD_ERRORS ? null : form.get(fieldMap[field] ?? field);
    if (control) {
      control.setErrors({ ...(control.errors ?? {}), serverError: messages.join(' ') });
      control.markAsTouched();
    } else {
      unmatched.push(...messages);
    }
  }
  return unmatched;
}

/** Translation key for an ErrorState title. */
export function errorTitleKey(error: AppError | null): string {
  if (error?.status === 404) {
    return 'common.notFound';
  }
  if (error?.status === 403) {
    return 'common.forbidden';
  }
  return 'common.error';
}

function flattenErrors(errors: unknown, prefix: string): Array<[string, string[]]> {
  if (Array.isArray(errors)) {
    const messages = errors.filter((item): item is string => typeof item === 'string');
    const nested = errors.flatMap((item, index) =>
      item && typeof item === 'object' ? flattenErrors(item, `${prefix}.${index}`) : [],
    );
    return messages.length ? [[prefix, messages], ...nested] : nested;
  }
  if (errors && typeof errors === 'object') {
    return Object.entries(errors).flatMap(([key, value]) => flattenErrors(value, prefix ? `${prefix}.${key}` : key));
  }
  return typeof errors === 'string' ? [[prefix, [errors]]] : [];
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include=src/app/shared/**/*.spec.ts`
Expected: all pass (16 specs).

- [ ] **Step 5: Commit**

```bash
git add src/app/shared/pipes src/app/shared/utils
git commit -m "Add name pipes and server error helpers" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Shared UI updates — field errors, page-header back, confirm dialog, PrimeNG styles

**Files:**
- Create: `src/app/shared/components/field-error/field-error.component.ts`, `field-error.component.spec.ts`
- Modify: `src/app/shared/components/page-header/page-header.component.ts`, `page-header.component.html`
- Create: `src/app/shared/components/page-header/page-header.component.spec.ts`
- Modify: `src/app/layout/shell/shell.component.ts`, `shell.component.html`, `shell.component.spec.ts`
- Modify: `src/styles.scss`

**Interfaces:**
- Consumes: `ConfirmDialogComponent` (`src/app/shared/components/confirm-dialog/confirm-dialog.component.ts`, selector `app-confirm-dialog`, input `key` default `'app-confirm'`).
- Produces:
  - `<app-field-error [control]="form.controls.x" />` shows, when touched: `serverError` text, else `validation.required`, `validation.email`, or `validation.maxLength` (param `max`).
  - `PageHeaderComponent` new `@Output() back: EventEmitter<void>` emitted by the back button.
  - Shell renders `<app-confirm-dialog>` (key `app-confirm`) so pages can call `ConfirmationService.confirm({ key: 'app-confirm', … })`.
  - PrimeNG components (buttons, tables, dropdowns, dialogs) render with the Lara theme instead of being reset by Tailwind preflight.

**Why the style fix is here:** the PrimeNG theme CSS is wrapped in `@layer primeng`, while Tailwind's `@tailwind base` is unlayered. Unlayered CSS always beats layered CSS, so preflight rules such as `button { background-color: transparent }` currently strip PrimeNG styling (verified on the login page: the Sign in button has a transparent background). Every screen in this plan uses PrimeNG components, so this is fixed first.

- [ ] **Step 1: Write the failing tests**

`src/app/shared/components/field-error/field-error.component.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { FormControl, Validators } from '@angular/forms';
import { provideTranslateService } from '@ngx-translate/core';
import { FieldErrorComponent } from './field-error.component';

describe('FieldErrorComponent', () => {
  function render(control: FormControl) {
    TestBed.configureTestingModule({ imports: [FieldErrorComponent], providers: [provideTranslateService()] });
    const fixture = TestBed.createComponent(FieldErrorComponent);
    fixture.componentRef.setInput('control', control);
    fixture.detectChanges();
    return fixture;
  }

  it('shows nothing while untouched', () => {
    const fixture = render(new FormControl('', Validators.required));
    expect(fixture.nativeElement.textContent.trim()).toBe('');
  });

  it('shows the required message once touched', () => {
    const control = new FormControl('', Validators.required);
    control.markAsTouched();
    expect(render(control).nativeElement.textContent).toContain('validation.required');
  });

  it('prefers the server message', () => {
    const control = new FormControl('x');
    control.setErrors({ serverError: 'Already exists.' });
    control.markAsTouched();
    expect(render(control).nativeElement.textContent).toContain('Already exists.');
  });
});
```

`src/app/shared/components/page-header/page-header.component.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideTranslateService } from '@ngx-translate/core';
import { PageHeaderComponent } from './page-header.component';

describe('PageHeaderComponent', () => {
  it('emits back when the back button is clicked', () => {
    TestBed.configureTestingModule({
      imports: [PageHeaderComponent],
      providers: [provideTranslateService(), provideAnimations()],
    });
    const fixture = TestBed.createComponent(PageHeaderComponent);
    fixture.componentInstance.showBack = true;
    fixture.detectChanges();

    let clicked = false;
    fixture.componentInstance.back.subscribe(() => (clicked = true));
    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();

    expect(clicked).toBeTrue();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include=src/app/shared/components/**/*.spec.ts`
Expected: compile errors — `./field-error.component` not found and `Property 'back' does not exist`.

- [ ] **Step 3: Implement the field error component**

`src/app/shared/components/field-error/field-error.component.ts`:

```ts
import { Component, Input } from '@angular/core';
import { AbstractControl } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

/**
 * Shows one message for a touched, invalid control. Server messages win over client validators.
 * Default change detection on purpose: it must react to `touched` changes made by the parent form.
 */
@Component({
  selector: 'app-field-error',
  standalone: true,
  imports: [TranslatePipe],
  template: `
    @if (control.touched && control.errors; as errors) {
      <small class="text-sm text-red-600">
        @if (errors['serverError']) {
          {{ errors['serverError'] }}
        } @else if (errors['required']) {
          {{ 'validation.required' | translate }}
        } @else if (errors['email']) {
          {{ 'validation.email' | translate }}
        } @else if (errors['maxlength']) {
          {{ 'validation.maxLength' | translate: { max: errors['maxlength'].requiredLength } }}
        }
      </small>
    }
  `,
})
export class FieldErrorComponent {
  @Input({ required: true }) control!: AbstractControl;
}
```

- [ ] **Step 4: Add the `back` output to the page header**

In `src/app/shared/components/page-header/page-header.component.ts` change the Angular import and add the output:

```ts
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
```

```ts
  @Input() actions: PageHeaderAction[] = [];
  @Output() back = new EventEmitter<void>();
}
```

In `page-header.component.html` add the click handler to the back button:

```html
      <p-button
        [label]="backLabel | translate"
        icon="pi pi-arrow-left"
        severity="secondary"
        [outlined]="true"
        (onClick)="back.emit()"
      ></p-button>
```

- [ ] **Step 5: Host the confirm dialog in the shell**

In `src/app/layout/shell/shell.component.ts` add the import and the entry in `imports`:

```ts
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
```

```ts
  imports: [
    RouterOutlet,
    TranslatePipe,
    SidebarModule,
    ToastModule,
    LoadingBarComponent,
    AppHeaderComponent,
    AppSidebarComponent,
    NavListComponent,
    ConfirmDialogComponent,
  ],
```

At the end of `shell.component.html`, after `<p-toast …>`:

```html
<app-confirm-dialog></app-confirm-dialog>
```

`ConfirmationService` is already provided in `app.config.ts`. The shell spec does not provide it; add it there:

In `src/app/layout/shell/shell.component.spec.ts` change `import { MessageService } from 'primeng/api';` to `import { ConfirmationService, MessageService } from 'primeng/api';` and add `ConfirmationService,` after `MessageService,` in `providers`.

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx ng test --watch=false --browsers=ChromeHeadless`
Expected: whole suite passes (previous 26 + Tasks 1–3).

- [ ] **Step 7: Put PrimeNG and Tailwind in an explicit CSS layer order**

This is global CSS, so it is checked in the browser, not with a unit test. First record the current (broken) state with the dev server running (`npx ng serve`), on `http://localhost:4200/auth/login`, in the browser console:

```js
getComputedStyle(document.querySelector('p-button button')).backgroundColor
```

Expected now: `"rgba(0, 0, 0, 0)"` (transparent: the bug).

Replace `src/styles.scss` with:

```scss
/*
 * Layer order: Tailwind's reset first, then PrimeNG's theme, then Tailwind utilities.
 * PrimeNG 17 ships its CSS inside `@layer primeng`; without this order the unlayered
 * Tailwind preflight would override every PrimeNG component style.
 */
@layer tailwind-base, primeng, tailwind-utilities;

@import "primeng/resources/themes/lara-light-blue/theme.css";
@import "primeng/resources/primeng.css";
@import "primeicons/primeicons.css";

@layer tailwind-base {
  @tailwind base;
}

@layer tailwind-utilities {
  @tailwind components;
  @tailwind utilities;
}
```

Reload the login page and run the same console line.
Expected: `"rgb(59, 130, 246)"` (the Lara blue `#3B82F6`). Also check that a Tailwind utility still applies, e.g. the login card wrapper keeps its `max-w-md` width and the page background is still `bg-gray-100`, and that the header and sidebar look unchanged in English and Arabic.

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 8: Commit**

```bash
git add src/app/shared/components src/app/layout/shell src/styles.scss
git commit -m "Update shared UI: field errors, page header back, confirm dialog, PrimeNG layer order" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Company models and resource services

**Files:**
- Create: `src/app/features/company/company.models.ts`
- Create: `src/app/features/company/users/company-user.service.ts`, `company-user.service.spec.ts`
- Create: `src/app/features/company/departments/department.service.ts`
- Create: `src/app/features/company/teams/team.service.ts`
- Create: `src/app/features/company/roles/role.service.ts`
- Create: `src/app/features/company/permission-groups/permission-group.service.ts`
- Create: `src/app/features/company/permissions/permission.service.ts`
- Create: `src/app/features/locations/location.service.ts`
- Create: `src/app/features/company/company-services.spec.ts`
- Create: `src/app/testing/company-fixtures.ts`

**Interfaces:**
- Consumes: `CrudApi<T, TPayload>` (Task 1), `envelope`, `errorEnvelope`, `provideApiTesting` (Task 1), `AppError`.
- Produces (all `@Injectable({ providedIn: 'root' })`, all inherit `list/all/dropdown/retrieve/create/update/remove`):
  - `DepartmentService` path `company/v1/departments/`
  - `TeamService` path `company/v1/teams/`
  - `RoleService` path `company/v1/roles/`
  - `PermissionGroupService` path `company/v1/permission-groups/`
  - `PermissionService` path `company/v1/permissions/`
  - `LocationService` path `company/v1/location/` (type `CrudApi<NamedRef, Record<string, never>>`)
  - `CompanyUserService` path `company/v1/company-user/`, overrides `create()` to re-fetch, adds `userOptions(): Observable<SelectOption[]>` (value = `user.id`).
  - Types from `company.models.ts` listed in Step 1.
  - Fixtures: `makeCompanyUser(overrides?)`, `makeDepartment(overrides?)`, `makeRole(overrides?)`, `makePermissionGroup(overrides?)`, `makePermission(overrides?)`, `makeTeam(overrides?)`.

- [ ] **Step 1: Create the models**

`src/app/features/company/company.models.ts`:

```ts
/** Types for /api/company/v1/… (API_REFERENCE.md → "Company & organisation"). */

export interface UserRef {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  date_joined: string;
  full_name?: string;
}

export interface NamedRef {
  id: number;
  name_en: string;
  name_ar?: string | null;
}

export interface SelectOption {
  value: number;
  label: string;
}

export interface Department {
  id: number;
  name_en: string;
  name_ar: string | null;
  parent: NamedRef | null;
  manager: UserRef | null;
  created_by: UserRef | null;
  updated_by: UserRef | null;
}

export interface Team {
  id: number;
  name_en: string;
  name_ar: string | null;
  department: Department;
  leads: UserRef[];
  location: { id: number; name: string } | null;
  created_by: UserRef | null;
  updated_by: UserRef | null;
}

export interface Role {
  id: number;
  name_en: string;
  name_ar: string | null;
  is_admin: boolean;
  permission_groups: NamedRef[];
}

export interface PermissionGroup {
  id: number;
  name_en: string;
  name_ar: string | null;
  description: string;
  is_core: boolean;
  created_by: UserRef | null;
  updated_by: UserRef | null;
}

export type PermissionType = 'API' | 'OBJECT' | 'FEATURE';

export interface Permission {
  id: number;
  codename: string;
  name: string;
  description: string;
  permission_type: PermissionType;
  groups: NamedRef[];
  created_by: UserRef | null;
  updated_by: UserRef | null;
}

export interface CompanyUser {
  id: number;
  user: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    preferred_name: string;
    profile_picture: string | null;
    phone_number: string;
    timezone: string;
  };
  role: Role | null;
  department: Department | null;
  team: Team | null;
  is_company_admin: boolean;
  is_department_manager: boolean;
  is_team_lead: boolean;
  date_joined: string;
  last_updated: string;
}

export interface CompanyUserPayload {
  user: {
    email: string;
    first_name: string;
    last_name: string;
    preferred_name?: string;
    phone_number?: string;
    password?: string;
  };
  role?: number | null;
  department?: number | null;
  team?: number | null;
  is_company_admin?: boolean;
  is_department_manager?: boolean;
  is_team_lead?: boolean;
}

export interface DepartmentPayload {
  name_en: string;
  name_ar?: string | null;
  parent?: number | null;
  manager?: number | null;
}

export interface TeamPayload {
  department: number;
  name_en: string;
  name_ar?: string | null;
  leads?: number[];
  location: number;
}

export interface RolePayload {
  name_en: string;
  name_ar?: string | null;
  permission_groups: number[];
  is_admin?: boolean;
}

export interface PermissionGroupPayload {
  name_en: string;
  name_ar?: string | null;
  description?: string;
  is_core?: boolean;
}

export interface PermissionPayload {
  codename: string;
  name: string;
  description?: string;
  permission_type?: PermissionType;
  groups?: number[];
}
```

- [ ] **Step 2: Create the fixtures**

`src/app/testing/company-fixtures.ts`:

```ts
import {
  CompanyUser,
  Department,
  Permission,
  PermissionGroup,
  Role,
  Team,
  UserRef,
} from '../features/company/company.models';

export const SARA_REF: UserRef = {
  id: 9,
  email: 'sara@acme.example',
  first_name: 'Sara',
  last_name: 'Ali',
  date_joined: '2026-10-04T00:49:35+03:00',
  full_name: 'Sara Ali',
};

export function makeDepartment(overrides: Partial<Department> = {}): Department {
  return {
    id: 5,
    name_en: 'Sales',
    name_ar: 'المبيعات',
    parent: null,
    manager: null,
    created_by: null,
    updated_by: null,
    ...overrides,
  };
}

export function makeRole(overrides: Partial<Role> = {}): Role {
  return { id: 3, name_en: 'Sales Manager', name_ar: null, is_admin: false, permission_groups: [], ...overrides };
}

export function makePermissionGroup(overrides: Partial<PermissionGroup> = {}): PermissionGroup {
  return {
    id: 4,
    name_en: 'Sales access',
    name_ar: null,
    description: '',
    is_core: false,
    created_by: null,
    updated_by: null,
    ...overrides,
  };
}

export function makePermission(overrides: Partial<Permission> = {}): Permission {
  return {
    id: 6,
    codename: 'sales.view',
    name: 'View sales',
    description: '',
    permission_type: 'API',
    groups: [],
    created_by: null,
    updated_by: null,
    ...overrides,
  };
}

export function makeTeam(overrides: Partial<Team> = {}): Team {
  return {
    id: 7,
    name_en: 'B2B Team',
    name_ar: null,
    department: makeDepartment(),
    leads: [],
    location: { id: 1, name: 'Head Office (HQ-01)' },
    created_by: null,
    updated_by: null,
    ...overrides,
  };
}

export function makeCompanyUser(overrides: Partial<CompanyUser> = {}): CompanyUser {
  return {
    id: 12,
    user: {
      id: 9,
      email: 'sara@acme.example',
      first_name: 'Sara',
      last_name: 'Ali',
      preferred_name: '',
      profile_picture: null,
      phone_number: '',
      timezone: 'Asia/Riyadh',
    },
    role: null,
    department: null,
    team: null,
    is_company_admin: false,
    is_department_manager: false,
    is_team_lead: false,
    date_joined: '2026-10-04T00:49:35+03:00',
    last_updated: '2026-10-04T00:49:35+03:00',
    ...overrides,
  };
}
```

- [ ] **Step 3: Write the failing tests**

`src/app/features/company/company-services.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { envelope, provideApiTesting } from '../../testing/api-testing';
import { LocationService } from '../locations/location.service';
import { DepartmentService } from './departments/department.service';
import { PermissionGroupService } from './permission-groups/permission-group.service';
import { PermissionService } from './permissions/permission.service';
import { RoleService } from './roles/role.service';
import { TeamService } from './teams/team.service';
import { CompanyUserService } from './users/company-user.service';

describe('company resource services', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: provideApiTesting() });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  const cases: Array<[string, () => { all(): import('rxjs').Observable<unknown> }]> = [
    ['/api/company/v1/departments/', () => TestBed.inject(DepartmentService)],
    ['/api/company/v1/teams/', () => TestBed.inject(TeamService)],
    ['/api/company/v1/roles/', () => TestBed.inject(RoleService)],
    ['/api/company/v1/permission-groups/', () => TestBed.inject(PermissionGroupService)],
    ['/api/company/v1/permissions/', () => TestBed.inject(PermissionService)],
    ['/api/company/v1/location/', () => TestBed.inject(LocationService)],
    ['/api/company/v1/company-user/', () => TestBed.inject(CompanyUserService)],
  ];

  for (const [url, service] of cases) {
    it(`calls ${url}`, () => {
      service().all().subscribe();
      httpMock.expectOne(url).flush(envelope([]));
    });
  }
});
```

`src/app/features/company/users/company-user.service.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { envelope, provideApiTesting } from '../../../testing/api-testing';
import { makeCompanyUser } from '../../../testing/company-fixtures';
import { CompanyUser, CompanyUserPayload, SelectOption } from '../company.models';
import { CompanyUserService } from './company-user.service';

const URL = '/api/company/v1/company-user/';

describe('CompanyUserService', () => {
  let service: CompanyUserService;
  let httpMock: HttpTestingController;

  const body: CompanyUserPayload = {
    user: { email: 'Sara@Acme.example', first_name: 'Sara', last_name: 'Ali', password: 'Passw0rd!' },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: provideApiTesting() });
    service = TestBed.inject(CompanyUserService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('re-fetches the full record after create when the response has an id', () => {
    let result: CompanyUser | undefined;
    service.create(body).subscribe((u) => (result = u));

    httpMock.expectOne(URL).flush(envelope({ id: 12, user: body.user }), { status: 201, statusText: 'Created' });
    httpMock.expectOne(`${URL}12/`).flush(envelope(makeCompanyUser()));

    expect(result?.id).toBe(12);
    expect(result?.user.timezone).toBe('Asia/Riyadh');
  });

  it('finds the new record by email when the create response has no id', () => {
    let result: CompanyUser | undefined;
    service.create(body).subscribe((u) => (result = u));

    httpMock.expectOne((r) => r.url === URL && r.method === 'POST').flush(envelope({ user: body.user }));
    httpMock.expectOne((r) => r.url === URL && r.method === 'GET').flush(envelope([makeCompanyUser()]));

    expect(result?.id).toBe(12);
  });

  it('builds user options keyed by the login user id', () => {
    let options: SelectOption[] = [];
    service.userOptions().subscribe((o) => (options = o));
    httpMock.expectOne(URL).flush(envelope([makeCompanyUser()]));
    expect(options).toEqual([{ value: 9, label: 'Sara Ali (sara@acme.example)' }]);
  });
});
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include=src/app/features/company/**/*.spec.ts`
Expected: compile errors — service modules not found.

- [ ] **Step 5: Write the services**

`src/app/features/company/departments/department.service.ts`:

```ts
import { Injectable } from '@angular/core';
import { CrudApi } from '../../../core/api/crud-api';
import { Department, DepartmentPayload } from '../company.models';

@Injectable({ providedIn: 'root' })
export class DepartmentService extends CrudApi<Department, DepartmentPayload> {
  protected readonly path = 'company/v1/departments/';
}
```

`src/app/features/company/teams/team.service.ts`:

```ts
import { Injectable } from '@angular/core';
import { CrudApi } from '../../../core/api/crud-api';
import { Team, TeamPayload } from '../company.models';

@Injectable({ providedIn: 'root' })
export class TeamService extends CrudApi<Team, TeamPayload> {
  protected readonly path = 'company/v1/teams/';
}
```

`src/app/features/company/roles/role.service.ts`:

```ts
import { Injectable } from '@angular/core';
import { CrudApi } from '../../../core/api/crud-api';
import { Role, RolePayload } from '../company.models';

@Injectable({ providedIn: 'root' })
export class RoleService extends CrudApi<Role, RolePayload> {
  protected readonly path = 'company/v1/roles/';
}
```

`src/app/features/company/permission-groups/permission-group.service.ts`:

```ts
import { Injectable } from '@angular/core';
import { CrudApi } from '../../../core/api/crud-api';
import { PermissionGroup, PermissionGroupPayload } from '../company.models';

@Injectable({ providedIn: 'root' })
export class PermissionGroupService extends CrudApi<PermissionGroup, PermissionGroupPayload> {
  protected readonly path = 'company/v1/permission-groups/';
}
```

`src/app/features/company/permissions/permission.service.ts`:

```ts
import { Injectable } from '@angular/core';
import { CrudApi } from '../../../core/api/crud-api';
import { Permission, PermissionPayload } from '../company.models';

@Injectable({ providedIn: 'root' })
export class PermissionService extends CrudApi<Permission, PermissionPayload> {
  protected readonly path = 'company/v1/permissions/';
}
```

`src/app/features/locations/location.service.ts`:

```ts
import { Injectable } from '@angular/core';
import { CrudApi } from '../../core/api/crud-api';
import { NamedRef } from '../company/company.models';

/** Step 4 only uses dropdown(); Step 5 (Locations) replaces the types with the full Location model. */
@Injectable({ providedIn: 'root' })
export class LocationService extends CrudApi<NamedRef, Record<string, never>> {
  protected readonly path = 'company/v1/location/';
}
```

`src/app/features/company/users/company-user.service.ts`:

```ts
import { Injectable } from '@angular/core';
import { Observable, map, switchMap } from 'rxjs';
import { CrudApi } from '../../../core/api/crud-api';
import { AppError } from '../../../core/errors/app-error';
import { CompanyUser, CompanyUserPayload, SelectOption } from '../company.models';

@Injectable({ providedIn: 'root' })
export class CompanyUserService extends CrudApi<CompanyUser, CompanyUserPayload> {
  protected readonly path = 'company/v1/company-user/';

  /** The create response is a shorter shape (API_REFERENCE: "Re-fetch the detail"), so load the full record. */
  override create(body: CompanyUserPayload): Observable<CompanyUser> {
    return super.create(body).pipe(
      switchMap((created) => {
        const id = (created as Partial<CompanyUser> | null)?.id;
        if (typeof id === 'number') {
          return this.retrieve(id);
        }
        return this.all().pipe(map((users) => this.findByEmail(users, body.user.email)));
      }),
    );
  }

  /** Options for "user" pickers. Department manager and team leads take the login user id. */
  userOptions(): Observable<SelectOption[]> {
    return this.all().pipe(
      map((users) =>
        users.map((u) => ({ value: u.user.id, label: `${u.user.first_name} ${u.user.last_name} (${u.user.email})` })),
      ),
    );
  }

  private findByEmail(users: CompanyUser[], email: string): CompanyUser {
    const match = users.find((u) => u.user.email.toLowerCase() === email.toLowerCase());
    if (!match) {
      const error: AppError = { status: 404, message: 'The new user could not be loaded.', errors: {} };
      throw error;
    }
    return match;
  }
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include=src/app/features/company/**/*.spec.ts`
Expected: `TOTAL: 10 SUCCESS`.

- [ ] **Step 7: Commit**

```bash
git add src/app/features/company src/app/features/locations/location.service.ts src/app/testing/company-fixtures.ts
git commit -m "Add company models and resource services" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Sidebar group, company routes and translations

**Files:**
- Modify: `src/app/layout/nav/nav-items.ts`
- Modify: `src/app/layout/nav/nav-list.component.ts`
- Create: `src/app/layout/nav/nav-list.component.spec.ts`
- Create: `src/app/features/company/company.routes.ts`
- Modify: `src/app/app.routes.ts` (the `company` route)
- Delete: `src/app/features/company/company-page.component.ts`
- Modify: `src/assets/i18n/en.json`, `src/assets/i18n/ar.json`

**Interfaces:**
- Consumes: `LanguageService.direction` (`Signal<'ltr' | 'rtl'>`).
- Produces:
  - `NavItem.children?: NavItem[]`; Company group links: `/company/users`, `/company/departments`, `/company/teams`, `/company/roles`, `/company/permission-groups`, `/company/permissions`.
  - `export const COMPANY_ROUTES: Routes` in `company.routes.ts`. Tasks 6–11 append three routes each to this array.
  - Translation keys used by Tasks 6–11 (full list in Step 6).

- [ ] **Step 1: Write the failing test**

`src/app/layout/nav/nav-list.component.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { NavListComponent } from './nav-list.component';

describe('NavListComponent', () => {
  async function render(url: string) {
    TestBed.configureTestingModule({
      imports: [NavListComponent],
      providers: [provideRouter([{ path: '**', children: [] }]), provideTranslateService()],
    });
    await TestBed.inject(Router).navigateByUrl(url);
    const fixture = TestBed.createComponent(NavListComponent);
    fixture.detectChanges();
    return fixture;
  }

  function links(fixture: { nativeElement: HTMLElement }): string[] {
    return Array.from(fixture.nativeElement.querySelectorAll('a')).map((a) => (a as HTMLAnchorElement).getAttribute('href') ?? '');
  }

  it('expands the Company group on a company page', async () => {
    const fixture = await render('/company/departments');
    expect(links(fixture)).toContain('/company/departments');
    expect(links(fixture)).toContain('/company/users');
  });

  it('keeps the Company group collapsed elsewhere and toggles it on click', async () => {
    const fixture = await render('/dashboard');
    expect(links(fixture)).not.toContain('/company/users');

    const toggle = fixture.nativeElement.querySelector('button[aria-expanded]') as HTMLButtonElement;
    toggle.click();
    fixture.detectChanges();

    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(links(fixture)).toContain('/company/users');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include=src/app/layout/nav/nav-list.component.spec.ts`
Expected: FAIL — `/company/departments` not in links / no `button[aria-expanded]`.

- [ ] **Step 3: Add children to the nav items**

Replace `src/app/layout/nav/nav-items.ts` with:

```ts
export type AppModuleCode = 'inventory' | 'location';

export interface NavItem {
  labelKey: string;
  icon: string;
  routerLink: string;
  module?: AppModuleCode;
  children?: NavItem[];
}

export const NAV_ITEMS: NavItem[] = [
  { labelKey: 'nav.dashboard', icon: 'pi pi-home', routerLink: '/dashboard' },
  {
    labelKey: 'nav.company',
    icon: 'pi pi-building',
    routerLink: '/company',
    children: [
      { labelKey: 'nav.companyUsers', icon: 'pi pi-users', routerLink: '/company/users' },
      { labelKey: 'nav.departments', icon: 'pi pi-sitemap', routerLink: '/company/departments' },
      { labelKey: 'nav.teams', icon: 'pi pi-id-card', routerLink: '/company/teams' },
      { labelKey: 'nav.roles', icon: 'pi pi-shield', routerLink: '/company/roles' },
      { labelKey: 'nav.permissionGroups', icon: 'pi pi-th-large', routerLink: '/company/permission-groups' },
      { labelKey: 'nav.permissions', icon: 'pi pi-key', routerLink: '/company/permissions' },
    ],
  },
  { labelKey: 'nav.locations', icon: 'pi pi-map-marker', routerLink: '/locations', module: 'location' },
  { labelKey: 'nav.inventory', icon: 'pi pi-box', routerLink: '/inventory', module: 'inventory' },
  { labelKey: 'nav.sales', icon: 'pi pi-shopping-cart', routerLink: '/sales' },
  { labelKey: 'nav.returns', icon: 'pi pi-replay', routerLink: '/returns' },
  { labelKey: 'nav.billing', icon: 'pi pi-credit-card', routerLink: '/billing' },
  { labelKey: 'nav.notifications', icon: 'pi pi-bell', routerLink: '/notifications' },
  { labelKey: 'nav.importExport', icon: 'pi pi-file-import', routerLink: '/import-export' },
];
```

- [ ] **Step 4: Render groups in the nav list**

Replace `src/app/layout/nav/nav-list.component.ts` with:

```ts
import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { filter } from 'rxjs';
import { LanguageService } from '../../core/services/language.service';
import { NAV_ITEMS, NavItem } from './nav-items';

const LINK_CLASSES =
  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700';
const ACTIVE_CLASSES = 'bg-primary-50 text-primary-700 dark:bg-gray-700 dark:text-white';

@Component({
  selector: 'app-nav-list',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="flex flex-col gap-1 p-3">
      @for (item of items; track item.routerLink) {
        @if (item.children) {
          <button
            type="button"
            [class]="linkClasses + ' w-full'"
            [attr.aria-expanded]="isExpanded(item)"
            (click)="toggle(item)"
          >
            <i [class]="item.icon + ' text-base'"></i>
            <span class="flex-1 whitespace-nowrap text-start">{{ item.labelKey | translate }}</span>
            <i
              class="pi text-xs"
              [class.pi-chevron-down]="isExpanded(item)"
              [class.pi-chevron-right]="!isExpanded(item) && direction() === 'ltr'"
              [class.pi-chevron-left]="!isExpanded(item) && direction() === 'rtl'"
            ></i>
          </button>
          @if (isExpanded(item)) {
            <div class="flex flex-col gap-1 ps-4">
              @for (child of item.children; track child.routerLink) {
                <a
                  [routerLink]="child.routerLink"
                  [routerLinkActive]="activeClasses"
                  [class]="linkClasses"
                  (click)="itemSelected.emit()"
                >
                  <i [class]="child.icon + ' text-base'"></i>
                  <span class="whitespace-nowrap">{{ child.labelKey | translate }}</span>
                </a>
              }
            </div>
          }
        } @else {
          <a
            [routerLink]="item.routerLink"
            [routerLinkActive]="activeClasses"
            [class]="linkClasses"
            (click)="itemSelected.emit()"
          >
            <i [class]="item.icon + ' text-base'"></i>
            <span class="whitespace-nowrap">{{ item.labelKey | translate }}</span>
          </a>
        }
      }
    </nav>
  `,
})
export class NavListComponent {
  private readonly router = inject(Router);
  private readonly expanded = signal<ReadonlySet<string>>(new Set());

  readonly items = NAV_ITEMS;
  readonly itemSelected = output<void>();
  readonly direction = inject(LanguageService).direction;
  readonly linkClasses = LINK_CLASSES;
  readonly activeClasses = ACTIVE_CLASSES;

  constructor() {
    this.expandActiveGroup(this.router.url);
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((event) => this.expandActiveGroup(event.urlAfterRedirects));
  }

  isExpanded(item: NavItem): boolean {
    return this.expanded().has(item.routerLink);
  }

  toggle(item: NavItem): void {
    this.expanded.update((current) => {
      const next = new Set(current);
      if (next.has(item.routerLink)) {
        next.delete(item.routerLink);
      } else {
        next.add(item.routerLink);
      }
      return next;
    });
  }

  private expandActiveGroup(url: string): void {
    for (const item of this.items) {
      if (item.children && (url === item.routerLink || url.startsWith(`${item.routerLink}/`))) {
        this.expanded.update((current) => new Set(current).add(item.routerLink));
      }
    }
  }
}
```

- [ ] **Step 5: Add the company routes and remove the placeholder**

`src/app/features/company/company.routes.ts`:

```ts
import { Routes } from '@angular/router';

/** Lazy routes under /company. Each resource adds its list, new and edit routes below. */
export const COMPANY_ROUTES: Routes = [{ path: '', pathMatch: 'full', redirectTo: 'users' }];
```

In `src/app/app.routes.ts` replace the `company` route:

```ts
      {
        path: 'company',
        loadComponent: () => import('./features/company/company-page.component').then((m) => m.CompanyPageComponent),
        data: { titleKey: 'nav.company' },
      },
```

with:

```ts
      {
        path: 'company',
        loadChildren: () => import('./features/company/company.routes').then((m) => m.COMPANY_ROUTES),
      },
```

Delete the placeholder:

```bash
git rm src/app/features/company/company-page.component.ts
```

- [ ] **Step 6: Add the translations**

Run this from the project root (it is a one-off; do not add the script to the repo):

```bash
node --input-type=module -e "
import fs from 'node:fs';
const add = {
  en: {
    nav: { companyUsers: 'Users', departments: 'Departments', teams: 'Teams', roles: 'Roles', permissionGroups: 'Permission groups', permissions: 'Permissions' },
    common: { new: 'New', saved: 'Saved successfully.', deleted: 'Deleted successfully.', notFound: 'The record was not found.', forbidden: \"You don't have access to this section.\", confirmDelete: 'Delete \"{{name}}\"? This cannot be undone.', select: 'Select…', backToList: 'Back to list' },
    validation: { required: 'This field is required.', maxLength: 'Maximum {{max}} characters.', email: 'Enter a valid email address.' },
    company: {
      fields: { id: 'ID', nameEn: 'Name (English)', nameAr: 'Name (Arabic)', name: 'Name', email: 'Email', firstName: 'First name', lastName: 'Last name', preferredName: 'Preferred name', phone: 'Phone number', password: 'Password', role: 'Role', department: 'Department', team: 'Team', parent: 'Parent department', manager: 'Manager', location: 'Location', leads: 'Team leads', permissionGroups: 'Permission groups', isAdmin: 'Admin', description: 'Description', isCore: 'Core', codename: 'Codename', type: 'Type', groups: 'Groups', companyAdmin: 'Company admin', departmentManager: 'Department manager', teamLead: 'Team lead' },
      users: { title: 'Users', new: 'New user', edit: 'Edit user' },
      departments: { title: 'Departments', new: 'New department', edit: 'Edit department' },
      teams: { title: 'Teams', new: 'New team', edit: 'Edit team', locationForbidden: \"Your company's subscription doesn't include Locations, so a team can't be saved.\", locationEmpty: 'There are no locations yet. Create a location first (Locations section).' },
      roles: { title: 'Roles', new: 'New role', edit: 'Edit role' },
      permissionGroups: { title: 'Permission groups', new: 'New permission group', edit: 'Edit permission group' },
      permissions: { title: 'Permissions', new: 'New permission', edit: 'Edit permission' }
    }
  },
  ar: {
    nav: { companyUsers: 'المستخدمون', departments: 'الأقسام', teams: 'الفرق', roles: 'الأدوار', permissionGroups: 'مجموعات الصلاحيات', permissions: 'الصلاحيات' },
    common: { new: 'جديد', saved: 'تم الحفظ بنجاح.', deleted: 'تم الحذف بنجاح.', notFound: 'السجل غير موجود.', forbidden: 'ليس لديك صلاحية الوصول إلى هذا القسم.', confirmDelete: 'حذف \"{{name}}\"؟ لا يمكن التراجع عن ذلك.', select: 'اختر…', backToList: 'العودة إلى القائمة' },
    validation: { required: 'هذا الحقل مطلوب.', maxLength: 'الحد الأقصى {{max}} حرفًا.', email: 'أدخل بريدًا إلكترونيًا صحيحًا.' },
    company: {
      fields: { id: 'المعرّف', nameEn: 'الاسم (إنجليزي)', nameAr: 'الاسم (عربي)', name: 'الاسم', email: 'البريد الإلكتروني', firstName: 'الاسم الأول', lastName: 'اسم العائلة', preferredName: 'الاسم المفضل', phone: 'رقم الهاتف', password: 'كلمة المرور', role: 'الدور', department: 'القسم', team: 'الفريق', parent: 'القسم الرئيسي', manager: 'المدير', location: 'الموقع', leads: 'قادة الفريق', permissionGroups: 'مجموعات الصلاحيات', isAdmin: 'مسؤول', description: 'الوصف', isCore: 'أساسية', codename: 'الرمز', type: 'النوع', groups: 'المجموعات', companyAdmin: 'مسؤول الشركة', departmentManager: 'مدير قسم', teamLead: 'قائد فريق' },
      users: { title: 'المستخدمون', new: 'مستخدم جديد', edit: 'تعديل مستخدم' },
      departments: { title: 'الأقسام', new: 'قسم جديد', edit: 'تعديل قسم' },
      teams: { title: 'الفرق', new: 'فريق جديد', edit: 'تعديل فريق', locationForbidden: 'اشتراك شركتك لا يشمل المواقع، لذلك لا يمكن حفظ الفريق.', locationEmpty: 'لا توجد مواقع بعد. أنشئ موقعًا أولًا (قسم المواقع).' },
      roles: { title: 'الأدوار', new: 'دور جديد', edit: 'تعديل دور' },
      permissionGroups: { title: 'مجموعات الصلاحيات', new: 'مجموعة صلاحيات جديدة', edit: 'تعديل مجموعة صلاحيات' },
      permissions: { title: 'الصلاحيات', new: 'صلاحية جديدة', edit: 'تعديل صلاحية' }
    }
  }
};
const merge = (target, source) => { for (const [k, v] of Object.entries(source)) { target[k] = v && typeof v === 'object' ? merge(target[k] ?? {}, v) : v; } return target; };
for (const lang of ['en', 'ar']) {
  const file = 'src/assets/i18n/' + lang + '.json';
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  fs.writeFileSync(file, JSON.stringify(merge(json, add[lang]), null, 2) + '\n');
}
"
```

Check both files still parse and have the new keys:

```bash
node -e "for (const l of ['en','ar']) { const j = JSON.parse(require('fs').readFileSync('src/assets/i18n/'+l+'.json','utf8')); console.log(l, j.company.teams.locationEmpty, j.validation.required); }"
```

Expected: one line per language printing the two strings.

- [ ] **Step 7: Run tests and build**

Run: `npx ng test --watch=false --browsers=ChromeHeadless` then `npm run build`
Expected: all tests pass; build succeeds.

- [ ] **Step 8: Commit**

```bash
git add src/app/layout/nav src/app/features/company/company.routes.ts src/app/app.routes.ts src/assets/i18n
git commit -m "Add Company sidebar group, company routes and translations" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Departments list and form

**Files:**
- Create: `src/app/features/company/departments/department-list.component.ts`, `.html`, `.spec.ts`
- Create: `src/app/features/company/departments/department-form.component.ts`, `.html`, `.spec.ts`
- Modify: `src/app/features/company/company.routes.ts`

**Interfaces:**
- Consumes: `DepartmentService`, `CompanyUserService.userOptions()` (Task 4); `Department`, `DepartmentPayload`, `NamedRef`, `SelectOption` (Task 4); `localizedName`, `LocalizedNamePipe`, `UserNamePipe` (Task 2); `applyServerErrors`, `errorTitleKey` (Task 2); `FieldErrorComponent`, `PageHeaderComponent` with `(back)` (Task 3); `LanguageService.currentLang`; `NotificationService`; `envelope`, `errorEnvelope`, `provideApiTesting`, `makeDepartment`, `makeCompanyUser`, `SARA_REF`.
- Produces: `DepartmentListComponent` (public: `onLazyLoad(e: TableLazyLoadEvent)`, `onSearch(term: string)`, `load()`, `edit(row)`, `confirmDelete(row)`), `DepartmentFormComponent` (public: `form`, `submit()`, `goBack()`, `parentOptions`).

- [ ] **Step 1: Write the failing list test**

`src/app/features/company/departments/department-list.component.spec.ts`:

```ts
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { Confirmation, ConfirmationService } from 'primeng/api';
import { envelope, errorEnvelope, provideApiTesting } from '../../../testing/api-testing';
import { makeDepartment } from '../../../testing/company-fixtures';
import { DepartmentListComponent } from './department-list.component';

const URL = '/api/company/v1/departments/';

describe('DepartmentListComponent', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DepartmentListComponent],
      providers: provideApiTesting(),
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
  });

  afterEach(() => httpMock.verify());

  function create() {
    const fixture = TestBed.createComponent(DepartmentListComponent);
    fixture.detectChanges();
    return fixture;
  }

  function expectList(params: Record<string, string>, rows: unknown[], total = rows.length) {
    const req = httpMock.expectOne((r) => r.url === URL && r.method === 'GET');
    for (const [key, value] of Object.entries(params)) {
      expect(req.request.params.get(key)).withContext(key).toBe(value);
    }
    req.flush(envelope(rows, total));
  }

  function acceptConfirmations() {
    const confirmation = TestBed.inject(ConfirmationService);
    spyOn(confirmation, 'confirm').and.callFake((c: Confirmation) => {
      c.accept?.();
      return confirmation;
    });
  }

  it('loads the first page on start and shows rows', () => {
    const fixture = create();
    expectList({ page: '1', page_size: '10' }, [makeDepartment()]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Sales');
  });

  it('sends paging and ordering from the table', () => {
    const fixture = create();
    expectList({}, [makeDepartment()], 30);
    fixture.componentInstance.onLazyLoad({ first: 20, rows: 10, sortField: 'name_en', sortOrder: -1 });
    expectList({ page: '3', page_size: '10', ordering: '-name_en' }, []);
  });

  it('debounces search and restarts from page 1', fakeAsync(() => {
    const fixture = create();
    expectList({}, [makeDepartment()], 30);
    fixture.componentInstance.onLazyLoad({ first: 10, rows: 10 });
    expectList({ page: '2' }, []);

    fixture.componentInstance.onSearch('sa');
    tick(100);
    fixture.componentInstance.onSearch('sales ');
    tick(300);

    expectList({ page: '1', search: 'sales' }, [makeDepartment()]);
  }));

  it('shows the forbidden state on 403', () => {
    const fixture = create();
    httpMock
      .expectOne((r) => r.url === URL)
      .flush(errorEnvelope(403, 'Forbidden'), { status: 403, statusText: 'Forbidden' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('common.forbidden');
  });

  it('opens the edit page', () => {
    const fixture = create();
    expectList({}, [makeDepartment()]);
    fixture.componentInstance.edit(makeDepartment());
    expect(router.navigate).toHaveBeenCalledWith(['/company/departments', 5, 'edit']);
  });

  it('deletes after confirmation and reloads', () => {
    acceptConfirmations();
    const fixture = create();
    expectList({}, [makeDepartment(), makeDepartment({ id: 6 })]);

    fixture.componentInstance.confirmDelete(makeDepartment());
    const del = httpMock.expectOne(`${URL}5/`);
    expect(del.request.method).toBe('DELETE');
    del.flush(null, { status: 204, statusText: 'No Content' });

    expectList({ page: '1' }, [makeDepartment({ id: 6 })]);
  });

  it('goes back a page after deleting the last row on a page', () => {
    acceptConfirmations();
    const fixture = create();
    expectList({}, [makeDepartment()], 11);
    fixture.componentInstance.onLazyLoad({ first: 10, rows: 10 });
    expectList({ page: '2' }, [makeDepartment({ id: 15 })], 11);

    fixture.componentInstance.confirmDelete(makeDepartment({ id: 15 }));
    httpMock.expectOne(`${URL}15/`).flush(null, { status: 204, statusText: 'No Content' });

    expectList({ page: '1' }, [makeDepartment()], 10);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include=src/app/features/company/departments/department-list.component.spec.ts`
Expected: compile error `Cannot find module './department-list.component'`.

- [ ] **Step 3: Write the list component**

`src/app/features/company/departments/department-list.component.ts`:

```ts
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { AppError } from '../../../core/errors/app-error';
import { LanguageService } from '../../../core/services/language.service';
import { NotificationService } from '../../../core/services/notification.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { PageHeaderAction, PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { LocalizedNamePipe } from '../../../shared/pipes/localized-name.pipe';
import { UserNamePipe } from '../../../shared/pipes/user-name.pipe';
import { errorTitleKey } from '../../../shared/utils/server-errors';
import { Department } from '../company.models';
import { DepartmentService } from './department.service';

@Component({
  selector: 'app-department-list',
  standalone: true,
  imports: [
    TranslatePipe,
    TableModule,
    ButtonModule,
    InputTextModule,
    PageHeaderComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    LocalizedNamePipe,
    UserNamePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './department-list.component.html',
})
export class DepartmentListComponent implements OnInit {
  private readonly api = inject(DepartmentService);
  private readonly router = inject(Router);
  private readonly confirmation = inject(ConfirmationService);
  private readonly notifications = inject(NotificationService);
  private readonly translate = inject(TranslateService);
  private readonly search$ = new Subject<string>();
  private searchTerm = '';
  private ordering?: string;

  readonly lang = inject(LanguageService).currentLang;
  readonly rows = signal<Department[]>([]);
  readonly total = signal(0);
  readonly first = signal(0);
  readonly pageSize = signal(10);
  readonly loading = signal(false);
  readonly error = signal<AppError | null>(null);
  readonly errorTitleKey = errorTitleKey;

  readonly headerActions: PageHeaderAction[] = [
    {
      label: 'company.departments.new',
      icon: 'pi pi-plus',
      onClick: () => void this.router.navigate(['/company/departments/new']),
    },
  ];

  constructor() {
    this.search$.pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed()).subscribe((term) => {
      this.searchTerm = term;
      this.first.set(0);
      this.load();
    });
  }

  ngOnInit(): void {
    this.load();
  }

  onLazyLoad(event: TableLazyLoadEvent): void {
    this.first.set(event.first ?? 0);
    this.pageSize.set(event.rows ?? this.pageSize());
    const field = typeof event.sortField === 'string' ? event.sortField : undefined;
    this.ordering = field ? `${event.sortOrder === -1 ? '-' : ''}${field}` : undefined;
    this.load();
  }

  onSearch(term: string): void {
    this.search$.next(term.trim());
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api
      .list({
        page: Math.floor(this.first() / this.pageSize()) + 1,
        pageSize: this.pageSize(),
        search: this.searchTerm || undefined,
        ordering: this.ordering,
      })
      .subscribe({
        next: (page) => {
          this.rows.set(page.items);
          this.total.set(page.total);
          this.loading.set(false);
        },
        error: (error: AppError) => {
          this.error.set(error);
          this.loading.set(false);
        },
      });
  }

  edit(row: Department): void {
    void this.router.navigate(['/company/departments', row.id, 'edit']);
  }

  confirmDelete(row: Department): void {
    this.confirmation.confirm({
      key: 'app-confirm',
      header: this.translate.instant('common.confirm'),
      message: this.translate.instant('common.confirmDelete', { name: row.name_en }),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.translate.instant('common.delete'),
      rejectLabel: this.translate.instant('common.cancel'),
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.delete(row),
    });
  }

  private delete(row: Department): void {
    this.api.remove(row.id).subscribe({
      next: () => {
        this.notifications.success(this.translate.instant('common.deleted'));
        if (this.rows().length === 1 && this.first() >= this.pageSize()) {
          this.first.update((first) => first - this.pageSize());
        }
        this.load();
      },
      error: (error: AppError) => {
        if (error.status >= 400 && error.status < 500 && error.status !== 401) {
          this.notifications.error(error.message);
        }
      },
    });
  }
}
```

`src/app/features/company/departments/department-list.component.html`:

```html
<app-page-header title="company.departments.title" [actions]="headerActions"></app-page-header>

<div class="mb-4">
  <input
    pInputText
    type="search"
    class="w-full sm:w-80"
    [placeholder]="'common.search' | translate"
    (input)="onSearch($any($event.target).value)"
  />
</div>

@if (error(); as err) {
  <app-error-state [title]="errorTitleKey(err)" [showRetry]="err.status !== 403" (retry)="load()"></app-error-state>
} @else {
  <div class="overflow-x-auto rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
    <p-table
      [value]="rows()"
      [lazy]="true"
      [lazyLoadOnInit]="false"
      (onLazyLoad)="onLazyLoad($event)"
      [paginator]="true"
      [first]="first()"
      [rows]="pageSize()"
      [totalRecords]="total()"
      [rowsPerPageOptions]="[10, 25, 50]"
      [loading]="loading()"
      dataKey="id"
      styleClass="p-datatable-sm"
    >
      <ng-template pTemplate="header">
        <tr>
          <th pSortableColumn="id">{{ 'company.fields.id' | translate }} <p-sortIcon field="id"></p-sortIcon></th>
          <th pSortableColumn="name_en">
            {{ 'company.fields.nameEn' | translate }} <p-sortIcon field="name_en"></p-sortIcon>
          </th>
          <th>{{ 'company.fields.nameAr' | translate }}</th>
          <th>{{ 'company.fields.parent' | translate }}</th>
          <th>{{ 'company.fields.manager' | translate }}</th>
          <th class="text-end">{{ 'common.actions' | translate }}</th>
        </tr>
      </ng-template>
      <ng-template pTemplate="body" let-row>
        <tr>
          <td>{{ row.id }}</td>
          <td>{{ row.name_en }}</td>
          <td>{{ row.name_ar }}</td>
          <td>{{ row.parent | localizedName: lang() }}</td>
          <td>{{ row.manager | userName }}</td>
          <td class="whitespace-nowrap text-end">
            <p-button
              icon="pi pi-pencil"
              [text]="true"
              [rounded]="true"
              [ariaLabel]="'common.edit' | translate"
              (onClick)="edit(row)"
            ></p-button>
            <p-button
              icon="pi pi-trash"
              severity="danger"
              [text]="true"
              [rounded]="true"
              [ariaLabel]="'common.delete' | translate"
              (onClick)="confirmDelete(row)"
            ></p-button>
          </td>
        </tr>
      </ng-template>
      <ng-template pTemplate="emptymessage">
        <tr>
          <td colspan="6"><app-empty-state icon="pi-sitemap"></app-empty-state></td>
        </tr>
      </ng-template>
    </p-table>
  </div>
}
```

- [ ] **Step 4: Run the list test to verify it passes**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include=src/app/features/company/departments/department-list.component.spec.ts`
Expected: `TOTAL: 7 SUCCESS`.

- [ ] **Step 5: Write the failing form test**

`src/app/features/company/departments/department-form.component.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { envelope, errorEnvelope, provideApiTesting } from '../../../testing/api-testing';
import { SARA_REF, makeCompanyUser, makeDepartment } from '../../../testing/company-fixtures';
import { DepartmentFormComponent } from './department-form.component';

const URL = '/api/company/v1/departments/';
const USERS_URL = '/api/company/v1/company-user/';

describe('DepartmentFormComponent', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  function setup(id: string | null) {
    TestBed.configureTestingModule({
      imports: [DepartmentFormComponent],
      providers: [
        ...provideApiTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(id ? { id } : {}) } } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);

    const fixture = TestBed.createComponent(DepartmentFormComponent);
    fixture.detectChanges();
    httpMock
      .expectOne((r) => r.url === URL && r.params.get('dropdown') === 'true')
      .flush(envelope([{ id: 1, name_en: 'Head office', name_ar: null }, { id: 5, name_en: 'Sales', name_ar: 'المبيعات' }]));
    httpMock.expectOne(USERS_URL).flush(envelope([makeCompanyUser()]));
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('creates a department and returns to the list', () => {
    const fixture = setup(null);
    const component = fixture.componentInstance;
    component.form.setValue({ name_en: ' Finance ', name_ar: '', parent: 1, manager: 9 });
    component.submit();

    const req = httpMock.expectOne((r) => r.url === URL && r.method === 'POST');
    expect(req.request.body).toEqual({ name_en: 'Finance', name_ar: null, parent: 1, manager: 9 });
    req.flush(envelope(makeDepartment({ id: 8, name_en: 'Finance' })), { status: 201, statusText: 'Created' });

    expect(router.navigate).toHaveBeenCalledWith(['/company/departments']);
  });

  it('does not submit an invalid form', () => {
    const fixture = setup(null);
    fixture.componentInstance.submit();
    httpMock.expectNone((r) => r.method === 'POST');
    expect(fixture.componentInstance.form.controls.name_en.touched).toBeTrue();
  });

  it('loads the department in edit mode and excludes it from parent options', () => {
    const fixture = setup('5');
    httpMock.expectOne(`${URL}5/`).flush(
      envelope(makeDepartment({ parent: { id: 1, name_en: 'Head office' }, manager: SARA_REF })),
    );

    const component = fixture.componentInstance;
    expect(component.form.getRawValue()).toEqual({ name_en: 'Sales', name_ar: 'المبيعات', parent: 1, manager: 9 });
    expect(component.parentOptions().map((o) => o.value)).toEqual([1]);
  });

  it('sends null when an optional picker is cleared on edit', () => {
    const fixture = setup('5');
    httpMock.expectOne(`${URL}5/`).flush(envelope(makeDepartment({ manager: SARA_REF })));

    const component = fixture.componentInstance;
    component.form.controls.manager.setValue(null);
    component.submit();

    const req = httpMock.expectOne((r) => r.url === `${URL}5/` && r.method === 'PATCH');
    expect(req.request.body.manager).toBeNull();
    req.flush(envelope(makeDepartment()));
  });

  it('shows the not-found state when the department does not exist', () => {
    const fixture = setup('99');
    httpMock.expectOne(`${URL}99/`).flush(errorEnvelope(404, 'Not found.'), { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('common.notFound');
  });

  it('shows server field errors and non-field errors', () => {
    const fixture = setup(null);
    const component = fixture.componentInstance;
    component.form.controls.name_en.setValue('Sales');
    component.submit();

    httpMock
      .expectOne((r) => r.method === 'POST')
      .flush(
        errorEnvelope(400, 'Unknown error', { name_en: ['Already exists.'], non_field_errors: ['Cycle detected.'] }),
        { status: 400, statusText: 'Bad Request' },
      );
    fixture.detectChanges();

    expect(component.form.controls.name_en.errors).toEqual({ serverError: 'Already exists.' });
    expect(fixture.nativeElement.textContent).toContain('Already exists.');
    expect(fixture.nativeElement.textContent).toContain('Cycle detected.');
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include=src/app/features/company/departments/department-form.component.spec.ts`
Expected: compile error `Cannot find module './department-form.component'`.

- [ ] **Step 7: Write the form component**

`src/app/features/company/departments/department-form.component.ts`:

```ts
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { AppError } from '../../../core/errors/app-error';
import { LanguageService } from '../../../core/services/language.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { FieldErrorComponent } from '../../../shared/components/field-error/field-error.component';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { localizedName } from '../../../shared/pipes/localized-name.pipe';
import { applyServerErrors, errorTitleKey } from '../../../shared/utils/server-errors';
import { DepartmentPayload, NamedRef, SelectOption } from '../company.models';
import { CompanyUserService } from '../users/company-user.service';
import { DepartmentService } from './department.service';

@Component({
  selector: 'app-department-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    ButtonModule,
    CardModule,
    DropdownModule,
    InputTextModule,
    PageHeaderComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    FieldErrorComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './department-form.component.html',
})
export class DepartmentFormComponent implements OnInit {
  private readonly api = inject(DepartmentService);
  private readonly users = inject(CompanyUserService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);
  private readonly translate = inject(TranslateService);
  private readonly lang = inject(LanguageService).currentLang;
  private readonly departments = signal<NamedRef[]>([]);

  readonly id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id')) || null;
  readonly isEdit = this.id !== null;
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly loadError = signal<AppError | null>(null);
  readonly formErrors = signal<string[]>([]);
  readonly userOptions = signal<SelectOption[]>([]);
  readonly parentOptions = computed<SelectOption[]>(() =>
    this.departments()
      .filter((d) => d.id !== this.id)
      .map((d) => ({ value: d.id, label: localizedName(d, this.lang()) })),
  );
  readonly errorTitleKey = errorTitleKey;

  readonly form = inject(NonNullableFormBuilder).group({
    name_en: ['', [Validators.required, Validators.maxLength(100)]],
    name_ar: ['', [Validators.maxLength(100)]],
    parent: [null as number | null],
    manager: [null as number | null],
  });

  ngOnInit(): void {
    this.api.dropdown<NamedRef>().subscribe({
      next: (items) => this.departments.set(items),
      error: () => this.departments.set([]),
    });
    this.users.userOptions().subscribe({
      next: (options) => this.userOptions.set(options),
      error: () => this.userOptions.set([]),
    });
    if (this.id !== null) {
      this.loadDepartment(this.id);
    }
  }

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const body: DepartmentPayload = {
      name_en: value.name_en.trim(),
      name_ar: value.name_ar.trim() || null,
      parent: value.parent,
      manager: value.manager,
    };
    this.saving.set(true);
    this.formErrors.set([]);
    const request = this.id !== null ? this.api.update(this.id, body) : this.api.create(body);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.notifications.success(this.translate.instant('common.saved'));
        this.goBack();
      },
      error: (error: AppError) => this.onSaveError(error),
    });
  }

  goBack(): void {
    void this.router.navigate(['/company/departments']);
  }

  private loadDepartment(id: number): void {
    this.loading.set(true);
    this.api.retrieve(id).subscribe({
      next: (department) => {
        this.form.patchValue({
          name_en: department.name_en,
          name_ar: department.name_ar ?? '',
          parent: department.parent?.id ?? null,
          manager: department.manager?.id ?? null,
        });
        this.loading.set(false);
      },
      error: (error: AppError) => {
        this.loadError.set(error);
        this.loading.set(false);
      },
    });
  }

  private onSaveError(error: AppError): void {
    this.saving.set(false);
    if (error.status === 0 || error.status === 401 || error.status >= 500) {
      return; // already shown by the global error handling
    }
    this.formErrors.set(applyServerErrors(this.form, error));
    if (Object.keys(error.errors ?? {}).length === 0) {
      this.notifications.error(error.message);
    }
  }
}
```

`src/app/features/company/departments/department-form.component.html`:

```html
<app-page-header
  [title]="isEdit ? 'company.departments.edit' : 'company.departments.new'"
  [showBack]="true"
  backLabel="common.backToList"
  (back)="goBack()"
></app-page-header>

@if (loadError(); as err) {
  <app-error-state [title]="errorTitleKey(err)" [showRetry]="false"></app-error-state>
} @else if (loading()) {
  <app-loading-state></app-loading-state>
} @else {
  <p-card>
    <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-6" novalidate>
      @if (formErrors().length) {
        <div
          role="alert"
          class="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        >
          @for (message of formErrors(); track $index) {
            <p>{{ message }}</p>
          }
        </div>
      }

      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div class="flex flex-col gap-1">
          <label for="name_en" class="text-sm font-medium">{{ 'company.fields.nameEn' | translate }} *</label>
          <input pInputText id="name_en" formControlName="name_en" class="w-full" />
          <app-field-error [control]="form.controls.name_en"></app-field-error>
        </div>

        <div class="flex flex-col gap-1">
          <label for="name_ar" class="text-sm font-medium">{{ 'company.fields.nameAr' | translate }}</label>
          <input pInputText id="name_ar" formControlName="name_ar" dir="rtl" class="w-full" />
          <app-field-error [control]="form.controls.name_ar"></app-field-error>
        </div>

        <div class="flex flex-col gap-1">
          <label for="parent" class="text-sm font-medium">{{ 'company.fields.parent' | translate }}</label>
          <p-dropdown
            inputId="parent"
            formControlName="parent"
            [options]="parentOptions()"
            optionLabel="label"
            optionValue="value"
            [filter]="true"
            [showClear]="true"
            [placeholder]="'common.select' | translate"
            styleClass="w-full"
            appendTo="body"
          ></p-dropdown>
          <app-field-error [control]="form.controls.parent"></app-field-error>
        </div>

        <div class="flex flex-col gap-1">
          <label for="manager" class="text-sm font-medium">{{ 'company.fields.manager' | translate }}</label>
          <p-dropdown
            inputId="manager"
            formControlName="manager"
            [options]="userOptions()"
            optionLabel="label"
            optionValue="value"
            [filter]="true"
            [showClear]="true"
            [placeholder]="'common.select' | translate"
            styleClass="w-full"
            appendTo="body"
          ></p-dropdown>
          <app-field-error [control]="form.controls.manager"></app-field-error>
        </div>
      </div>

      <div class="flex justify-end gap-2">
        <p-button
          type="button"
          [label]="'common.cancel' | translate"
          severity="secondary"
          [outlined]="true"
          (onClick)="goBack()"
        ></p-button>
        <p-button
          type="submit"
          [label]="'common.save' | translate"
          icon="pi pi-check"
          [loading]="saving()"
          [disabled]="saving()"
        ></p-button>
      </div>
    </form>
  </p-card>
}
```

- [ ] **Step 8: Add the routes**

In `src/app/features/company/company.routes.ts` replace the array with:

```ts
export const COMPANY_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'users' },
  {
    path: 'departments',
    loadComponent: () =>
      import('./departments/department-list.component').then((m) => m.DepartmentListComponent),
    data: { titleKey: 'company.departments.title' },
  },
  {
    path: 'departments/new',
    loadComponent: () =>
      import('./departments/department-form.component').then((m) => m.DepartmentFormComponent),
    data: { titleKey: 'company.departments.new' },
  },
  {
    path: 'departments/:id/edit',
    loadComponent: () =>
      import('./departments/department-form.component').then((m) => m.DepartmentFormComponent),
    data: { titleKey: 'company.departments.edit' },
  },
];
```

- [ ] **Step 9: Run tests and build**

Run: `npx ng test --watch=false --browsers=ChromeHeadless` then `npm run build`
Expected: all pass; build succeeds.

- [ ] **Step 10: Commit**

```bash
git add src/app/features/company/departments src/app/features/company/company.routes.ts
git commit -m "Add department list and form pages" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Permission groups list and form

**Files:**
- Create: `src/app/features/company/permission-groups/permission-group-list.component.ts`, `.html`, `.spec.ts`
- Create: `src/app/features/company/permission-groups/permission-group-form.component.ts`, `.html`, `.spec.ts`
- Modify: `src/app/features/company/company.routes.ts`

**Interfaces:**
- Consumes: `PermissionGroupService`, `PermissionGroup`, `PermissionGroupPayload` (Task 4); `StatusBadgeComponent` (`src/app/shared/components/status-badge/status-badge.component.ts`, inputs `value`, `severity`); everything else as Task 6.
- Produces: `PermissionGroupListComponent`, `PermissionGroupFormComponent` (public API same shape as Task 6, without `parentOptions`).

- [ ] **Step 1: Write the failing list test**

`src/app/features/company/permission-groups/permission-group-list.component.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { Confirmation, ConfirmationService } from 'primeng/api';
import { envelope, provideApiTesting } from '../../../testing/api-testing';
import { makePermissionGroup } from '../../../testing/company-fixtures';
import { PermissionGroupListComponent } from './permission-group-list.component';

const URL = '/api/company/v1/permission-groups/';

describe('PermissionGroupListComponent', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PermissionGroupListComponent],
      providers: provideApiTesting(),
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
  });

  afterEach(() => httpMock.verify());

  function create() {
    const fixture = TestBed.createComponent(PermissionGroupListComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('loads the first page and shows rows', () => {
    const fixture = create();
    const req = httpMock.expectOne((r) => r.url === URL);
    expect(req.request.params.get('page')).toBe('1');
    req.flush(envelope([makePermissionGroup()], 1));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Sales access');
  });

  it('opens the edit page', () => {
    const fixture = create();
    httpMock.expectOne((r) => r.url === URL).flush(envelope([makePermissionGroup()], 1));
    fixture.componentInstance.edit(makePermissionGroup());
    expect(router.navigate).toHaveBeenCalledWith(['/company/permission-groups', 4, 'edit']);
  });

  it('deletes after confirmation and reloads', () => {
    const confirmation = TestBed.inject(ConfirmationService);
    spyOn(confirmation, 'confirm').and.callFake((c: Confirmation) => {
      c.accept?.();
      return confirmation;
    });
    const fixture = create();
    httpMock.expectOne((r) => r.url === URL).flush(envelope([makePermissionGroup()], 1));

    fixture.componentInstance.confirmDelete(makePermissionGroup());
    httpMock.expectOne(`${URL}4/`).flush(null, { status: 204, statusText: 'No Content' });
    httpMock.expectOne((r) => r.url === URL).flush(envelope([], 0));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include=src/app/features/company/permission-groups/permission-group-list.component.spec.ts`
Expected: compile error `Cannot find module './permission-group-list.component'`.

- [ ] **Step 3: Write the list component**

`src/app/features/company/permission-groups/permission-group-list.component.ts`:

```ts
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { AppError } from '../../../core/errors/app-error';
import { NotificationService } from '../../../core/services/notification.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { PageHeaderAction, PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { errorTitleKey } from '../../../shared/utils/server-errors';
import { PermissionGroup } from '../company.models';
import { PermissionGroupService } from './permission-group.service';

@Component({
  selector: 'app-permission-group-list',
  standalone: true,
  imports: [
    TranslatePipe,
    TableModule,
    ButtonModule,
    InputTextModule,
    PageHeaderComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    StatusBadgeComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './permission-group-list.component.html',
})
export class PermissionGroupListComponent implements OnInit {
  private readonly api = inject(PermissionGroupService);
  private readonly router = inject(Router);
  private readonly confirmation = inject(ConfirmationService);
  private readonly notifications = inject(NotificationService);
  private readonly translate = inject(TranslateService);
  private readonly search$ = new Subject<string>();
  private searchTerm = '';
  private ordering?: string;

  readonly rows = signal<PermissionGroup[]>([]);
  readonly total = signal(0);
  readonly first = signal(0);
  readonly pageSize = signal(10);
  readonly loading = signal(false);
  readonly error = signal<AppError | null>(null);
  readonly errorTitleKey = errorTitleKey;

  readonly headerActions: PageHeaderAction[] = [
    {
      label: 'company.permissionGroups.new',
      icon: 'pi pi-plus',
      onClick: () => void this.router.navigate(['/company/permission-groups/new']),
    },
  ];

  constructor() {
    this.search$.pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed()).subscribe((term) => {
      this.searchTerm = term;
      this.first.set(0);
      this.load();
    });
  }

  ngOnInit(): void {
    this.load();
  }

  onLazyLoad(event: TableLazyLoadEvent): void {
    this.first.set(event.first ?? 0);
    this.pageSize.set(event.rows ?? this.pageSize());
    const field = typeof event.sortField === 'string' ? event.sortField : undefined;
    this.ordering = field ? `${event.sortOrder === -1 ? '-' : ''}${field}` : undefined;
    this.load();
  }

  onSearch(term: string): void {
    this.search$.next(term.trim());
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api
      .list({
        page: Math.floor(this.first() / this.pageSize()) + 1,
        pageSize: this.pageSize(),
        search: this.searchTerm || undefined,
        ordering: this.ordering,
      })
      .subscribe({
        next: (page) => {
          this.rows.set(page.items);
          this.total.set(page.total);
          this.loading.set(false);
        },
        error: (error: AppError) => {
          this.error.set(error);
          this.loading.set(false);
        },
      });
  }

  edit(row: PermissionGroup): void {
    void this.router.navigate(['/company/permission-groups', row.id, 'edit']);
  }

  confirmDelete(row: PermissionGroup): void {
    this.confirmation.confirm({
      key: 'app-confirm',
      header: this.translate.instant('common.confirm'),
      message: this.translate.instant('common.confirmDelete', { name: row.name_en }),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.translate.instant('common.delete'),
      rejectLabel: this.translate.instant('common.cancel'),
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.delete(row),
    });
  }

  private delete(row: PermissionGroup): void {
    this.api.remove(row.id).subscribe({
      next: () => {
        this.notifications.success(this.translate.instant('common.deleted'));
        if (this.rows().length === 1 && this.first() >= this.pageSize()) {
          this.first.update((first) => first - this.pageSize());
        }
        this.load();
      },
      error: (error: AppError) => {
        if (error.status >= 400 && error.status < 500 && error.status !== 401) {
          this.notifications.error(error.message);
        }
      },
    });
  }
}
```

`src/app/features/company/permission-groups/permission-group-list.component.html`:

```html
<app-page-header title="company.permissionGroups.title" [actions]="headerActions"></app-page-header>

<div class="mb-4">
  <input
    pInputText
    type="search"
    class="w-full sm:w-80"
    [placeholder]="'common.search' | translate"
    (input)="onSearch($any($event.target).value)"
  />
</div>

@if (error(); as err) {
  <app-error-state [title]="errorTitleKey(err)" [showRetry]="err.status !== 403" (retry)="load()"></app-error-state>
} @else {
  <div class="overflow-x-auto rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
    <p-table
      [value]="rows()"
      [lazy]="true"
      [lazyLoadOnInit]="false"
      (onLazyLoad)="onLazyLoad($event)"
      [paginator]="true"
      [first]="first()"
      [rows]="pageSize()"
      [totalRecords]="total()"
      [rowsPerPageOptions]="[10, 25, 50]"
      [loading]="loading()"
      dataKey="id"
      styleClass="p-datatable-sm"
    >
      <ng-template pTemplate="header">
        <tr>
          <th pSortableColumn="id">{{ 'company.fields.id' | translate }} <p-sortIcon field="id"></p-sortIcon></th>
          <th pSortableColumn="name_en">
            {{ 'company.fields.nameEn' | translate }} <p-sortIcon field="name_en"></p-sortIcon>
          </th>
          <th>{{ 'company.fields.nameAr' | translate }}</th>
          <th>{{ 'company.fields.description' | translate }}</th>
          <th>{{ 'company.fields.isCore' | translate }}</th>
          <th class="text-end">{{ 'common.actions' | translate }}</th>
        </tr>
      </ng-template>
      <ng-template pTemplate="body" let-row>
        <tr>
          <td>{{ row.id }}</td>
          <td>{{ row.name_en }}</td>
          <td>{{ row.name_ar }}</td>
          <td class="max-w-xs truncate">{{ row.description }}</td>
          <td>
            @if (row.is_core) {
              <app-status-badge [value]="'common.yes' | translate" severity="info"></app-status-badge>
            }
          </td>
          <td class="whitespace-nowrap text-end">
            <p-button
              icon="pi pi-pencil"
              [text]="true"
              [rounded]="true"
              [ariaLabel]="'common.edit' | translate"
              (onClick)="edit(row)"
            ></p-button>
            <p-button
              icon="pi pi-trash"
              severity="danger"
              [text]="true"
              [rounded]="true"
              [ariaLabel]="'common.delete' | translate"
              (onClick)="confirmDelete(row)"
            ></p-button>
          </td>
        </tr>
      </ng-template>
      <ng-template pTemplate="emptymessage">
        <tr>
          <td colspan="6"><app-empty-state icon="pi-th-large"></app-empty-state></td>
        </tr>
      </ng-template>
    </p-table>
  </div>
}
```

- [ ] **Step 4: Run the list test to verify it passes**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include=src/app/features/company/permission-groups/permission-group-list.component.spec.ts`
Expected: `TOTAL: 3 SUCCESS`.

- [ ] **Step 5: Write the failing form test**

`src/app/features/company/permission-groups/permission-group-form.component.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { envelope, errorEnvelope, provideApiTesting } from '../../../testing/api-testing';
import { makePermissionGroup } from '../../../testing/company-fixtures';
import { PermissionGroupFormComponent } from './permission-group-form.component';

const URL = '/api/company/v1/permission-groups/';

describe('PermissionGroupFormComponent', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  function setup(id: string | null) {
    TestBed.configureTestingModule({
      imports: [PermissionGroupFormComponent],
      providers: [
        ...provideApiTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(id ? { id } : {}) } } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    const fixture = TestBed.createComponent(PermissionGroupFormComponent);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('creates a permission group', () => {
    const fixture = setup(null);
    fixture.componentInstance.form.setValue({ name_en: 'Reports', name_ar: '', description: ' Read reports ', is_core: true });
    fixture.componentInstance.submit();

    const req = httpMock.expectOne(URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name_en: 'Reports', name_ar: null, description: 'Read reports', is_core: true });
    req.flush(envelope(makePermissionGroup()), { status: 201, statusText: 'Created' });
    expect(router.navigate).toHaveBeenCalledWith(['/company/permission-groups']);
  });

  it('does not submit an invalid form', () => {
    const fixture = setup(null);
    fixture.componentInstance.submit();
    httpMock.expectNone(URL);
  });

  it('loads and updates in edit mode', () => {
    const fixture = setup('4');
    httpMock.expectOne(`${URL}4/`).flush(envelope(makePermissionGroup({ description: 'All sales screens' })));
    expect(fixture.componentInstance.form.getRawValue()).toEqual({
      name_en: 'Sales access',
      name_ar: '',
      description: 'All sales screens',
      is_core: false,
    });

    fixture.componentInstance.submit();
    const req = httpMock.expectOne(`${URL}4/`);
    expect(req.request.method).toBe('PATCH');
    req.flush(envelope(makePermissionGroup()));
  });

  it('shows server field errors', () => {
    const fixture = setup(null);
    fixture.componentInstance.form.controls.name_en.setValue('Reports');
    fixture.componentInstance.submit();
    httpMock
      .expectOne(URL)
      .flush(errorEnvelope(400, 'Unknown error', { name_en: ['Already exists.'] }), {
        status: 400,
        statusText: 'Bad Request',
      });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Already exists.');
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include=src/app/features/company/permission-groups/permission-group-form.component.spec.ts`
Expected: compile error `Cannot find module './permission-group-form.component'`.

- [ ] **Step 7: Write the form component**

`src/app/features/company/permission-groups/permission-group-form.component.ts`:

```ts
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputSwitchModule } from 'primeng/inputswitch';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { AppError } from '../../../core/errors/app-error';
import { NotificationService } from '../../../core/services/notification.service';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { FieldErrorComponent } from '../../../shared/components/field-error/field-error.component';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { applyServerErrors, errorTitleKey } from '../../../shared/utils/server-errors';
import { PermissionGroupPayload } from '../company.models';
import { PermissionGroupService } from './permission-group.service';

@Component({
  selector: 'app-permission-group-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    ButtonModule,
    CardModule,
    InputSwitchModule,
    InputTextModule,
    InputTextareaModule,
    PageHeaderComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    FieldErrorComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './permission-group-form.component.html',
})
export class PermissionGroupFormComponent implements OnInit {
  private readonly api = inject(PermissionGroupService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);
  private readonly translate = inject(TranslateService);

  readonly id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id')) || null;
  readonly isEdit = this.id !== null;
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly loadError = signal<AppError | null>(null);
  readonly formErrors = signal<string[]>([]);
  readonly errorTitleKey = errorTitleKey;

  readonly form = inject(NonNullableFormBuilder).group({
    name_en: ['', [Validators.required, Validators.maxLength(100)]],
    name_ar: ['', [Validators.maxLength(100)]],
    description: [''],
    is_core: [false],
  });

  ngOnInit(): void {
    if (this.id !== null) {
      this.loadGroup(this.id);
    }
  }

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const body: PermissionGroupPayload = {
      name_en: value.name_en.trim(),
      name_ar: value.name_ar.trim() || null,
      description: value.description.trim(),
      is_core: value.is_core,
    };
    this.saving.set(true);
    this.formErrors.set([]);
    const request = this.id !== null ? this.api.update(this.id, body) : this.api.create(body);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.notifications.success(this.translate.instant('common.saved'));
        this.goBack();
      },
      error: (error: AppError) => this.onSaveError(error),
    });
  }

  goBack(): void {
    void this.router.navigate(['/company/permission-groups']);
  }

  private loadGroup(id: number): void {
    this.loading.set(true);
    this.api.retrieve(id).subscribe({
      next: (group) => {
        this.form.patchValue({
          name_en: group.name_en,
          name_ar: group.name_ar ?? '',
          description: group.description ?? '',
          is_core: group.is_core,
        });
        this.loading.set(false);
      },
      error: (error: AppError) => {
        this.loadError.set(error);
        this.loading.set(false);
      },
    });
  }

  private onSaveError(error: AppError): void {
    this.saving.set(false);
    if (error.status === 0 || error.status === 401 || error.status >= 500) {
      return; // already shown by the global error handling
    }
    this.formErrors.set(applyServerErrors(this.form, error));
    if (Object.keys(error.errors ?? {}).length === 0) {
      this.notifications.error(error.message);
    }
  }
}
```

`src/app/features/company/permission-groups/permission-group-form.component.html`:

```html
<app-page-header
  [title]="isEdit ? 'company.permissionGroups.edit' : 'company.permissionGroups.new'"
  [showBack]="true"
  backLabel="common.backToList"
  (back)="goBack()"
></app-page-header>

@if (loadError(); as err) {
  <app-error-state [title]="errorTitleKey(err)" [showRetry]="false"></app-error-state>
} @else if (loading()) {
  <app-loading-state></app-loading-state>
} @else {
  <p-card>
    <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-6" novalidate>
      @if (formErrors().length) {
        <div
          role="alert"
          class="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        >
          @for (message of formErrors(); track $index) {
            <p>{{ message }}</p>
          }
        </div>
      }

      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div class="flex flex-col gap-1">
          <label for="name_en" class="text-sm font-medium">{{ 'company.fields.nameEn' | translate }} *</label>
          <input pInputText id="name_en" formControlName="name_en" class="w-full" />
          <app-field-error [control]="form.controls.name_en"></app-field-error>
        </div>

        <div class="flex flex-col gap-1">
          <label for="name_ar" class="text-sm font-medium">{{ 'company.fields.nameAr' | translate }}</label>
          <input pInputText id="name_ar" formControlName="name_ar" dir="rtl" class="w-full" />
          <app-field-error [control]="form.controls.name_ar"></app-field-error>
        </div>

        <div class="flex flex-col gap-1 md:col-span-2">
          <label for="description" class="text-sm font-medium">{{ 'company.fields.description' | translate }}</label>
          <textarea pInputTextarea id="description" formControlName="description" rows="3" class="w-full"></textarea>
          <app-field-error [control]="form.controls.description"></app-field-error>
        </div>

        <div class="flex items-center gap-3">
          <p-inputSwitch inputId="is_core" formControlName="is_core"></p-inputSwitch>
          <label for="is_core" class="text-sm font-medium">{{ 'company.fields.isCore' | translate }}</label>
        </div>
      </div>

      <div class="flex justify-end gap-2">
        <p-button
          type="button"
          [label]="'common.cancel' | translate"
          severity="secondary"
          [outlined]="true"
          (onClick)="goBack()"
        ></p-button>
        <p-button
          type="submit"
          [label]="'common.save' | translate"
          icon="pi pi-check"
          [loading]="saving()"
          [disabled]="saving()"
        ></p-button>
      </div>
    </form>
  </p-card>
}
```

- [ ] **Step 8: Add the routes**

In `src/app/features/company/company.routes.ts` append to `COMPANY_ROUTES` (after the department routes):

```ts
  {
    path: 'permission-groups',
    loadComponent: () =>
      import('./permission-groups/permission-group-list.component').then((m) => m.PermissionGroupListComponent),
    data: { titleKey: 'company.permissionGroups.title' },
  },
  {
    path: 'permission-groups/new',
    loadComponent: () =>
      import('./permission-groups/permission-group-form.component').then((m) => m.PermissionGroupFormComponent),
    data: { titleKey: 'company.permissionGroups.new' },
  },
  {
    path: 'permission-groups/:id/edit',
    loadComponent: () =>
      import('./permission-groups/permission-group-form.component').then((m) => m.PermissionGroupFormComponent),
    data: { titleKey: 'company.permissionGroups.edit' },
  },
```

- [ ] **Step 9: Run tests and build**

Run: `npx ng test --watch=false --browsers=ChromeHeadless` then `npm run build`
Expected: all pass; build succeeds.

- [ ] **Step 10: Commit**

```bash
git add src/app/features/company/permission-groups src/app/features/company/company.routes.ts
git commit -m "Add permission group list and form pages" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Permissions list and form

**Files:**
- Create: `src/app/features/company/permissions/permission-list.component.ts`, `.html`, `.spec.ts`
- Create: `src/app/features/company/permissions/permission-form.component.ts`, `.html`, `.spec.ts`
- Modify: `src/app/features/company/company.routes.ts`

**Interfaces:**
- Consumes: `PermissionService`, `PermissionGroupService.dropdown<NamedRef>()`, `Permission`, `PermissionPayload`, `PermissionType`, `NamedRef`, `SelectOption` (Task 4); `localizedName` (Task 2); others as Task 6.
- Produces: `PermissionListComponent` (adds `groupNames(row: Permission): string`), `PermissionFormComponent` (adds `groupOptions`, `typeOptions`).
- Note: the API documents `ordering` only for `id` and `name_en`, and permissions have no `name_en` field, so only the **ID** column is sortable.

- [ ] **Step 1: Write the failing list test**

`src/app/features/company/permissions/permission-list.component.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { Confirmation, ConfirmationService } from 'primeng/api';
import { envelope, provideApiTesting } from '../../../testing/api-testing';
import { makePermission } from '../../../testing/company-fixtures';
import { PermissionListComponent } from './permission-list.component';

const URL = '/api/company/v1/permissions/';

describe('PermissionListComponent', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PermissionListComponent],
      providers: provideApiTesting(),
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
  });

  afterEach(() => httpMock.verify());

  function create() {
    const fixture = TestBed.createComponent(PermissionListComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('loads the first page and shows codename and group names', () => {
    const fixture = create();
    const req = httpMock.expectOne((r) => r.url === URL);
    expect(req.request.params.get('page')).toBe('1');
    req.flush(envelope([makePermission({ groups: [{ id: 4, name_en: 'Sales access' }] })], 1));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('sales.view');
    expect(fixture.nativeElement.textContent).toContain('Sales access');
  });

  it('opens the edit page', () => {
    const fixture = create();
    httpMock.expectOne((r) => r.url === URL).flush(envelope([makePermission()], 1));
    fixture.componentInstance.edit(makePermission());
    expect(router.navigate).toHaveBeenCalledWith(['/company/permissions', 6, 'edit']);
  });

  it('deletes after confirmation and reloads', () => {
    const confirmation = TestBed.inject(ConfirmationService);
    spyOn(confirmation, 'confirm').and.callFake((c: Confirmation) => {
      c.accept?.();
      return confirmation;
    });
    const fixture = create();
    httpMock.expectOne((r) => r.url === URL).flush(envelope([makePermission()], 1));
    fixture.componentInstance.confirmDelete(makePermission());
    httpMock.expectOne(`${URL}6/`).flush(null, { status: 204, statusText: 'No Content' });
    httpMock.expectOne((r) => r.url === URL).flush(envelope([], 0));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include=src/app/features/company/permissions/permission-list.component.spec.ts`
Expected: compile error `Cannot find module './permission-list.component'`.

- [ ] **Step 3: Write the list component**

`src/app/features/company/permissions/permission-list.component.ts`:

```ts
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { AppError } from '../../../core/errors/app-error';
import { LanguageService } from '../../../core/services/language.service';
import { NotificationService } from '../../../core/services/notification.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { PageHeaderAction, PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { localizedName } from '../../../shared/pipes/localized-name.pipe';
import { errorTitleKey } from '../../../shared/utils/server-errors';
import { Permission } from '../company.models';
import { PermissionService } from './permission.service';

@Component({
  selector: 'app-permission-list',
  standalone: true,
  imports: [
    TranslatePipe,
    TableModule,
    ButtonModule,
    InputTextModule,
    PageHeaderComponent,
    EmptyStateComponent,
    ErrorStateComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './permission-list.component.html',
})
export class PermissionListComponent implements OnInit {
  private readonly api = inject(PermissionService);
  private readonly router = inject(Router);
  private readonly confirmation = inject(ConfirmationService);
  private readonly notifications = inject(NotificationService);
  private readonly translate = inject(TranslateService);
  private readonly lang = inject(LanguageService).currentLang;
  private readonly search$ = new Subject<string>();
  private searchTerm = '';
  private ordering?: string;

  readonly rows = signal<Permission[]>([]);
  readonly total = signal(0);
  readonly first = signal(0);
  readonly pageSize = signal(10);
  readonly loading = signal(false);
  readonly error = signal<AppError | null>(null);
  readonly errorTitleKey = errorTitleKey;

  readonly headerActions: PageHeaderAction[] = [
    {
      label: 'company.permissions.new',
      icon: 'pi pi-plus',
      onClick: () => void this.router.navigate(['/company/permissions/new']),
    },
  ];

  constructor() {
    this.search$.pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed()).subscribe((term) => {
      this.searchTerm = term;
      this.first.set(0);
      this.load();
    });
  }

  ngOnInit(): void {
    this.load();
  }

  onLazyLoad(event: TableLazyLoadEvent): void {
    this.first.set(event.first ?? 0);
    this.pageSize.set(event.rows ?? this.pageSize());
    const field = typeof event.sortField === 'string' ? event.sortField : undefined;
    this.ordering = field ? `${event.sortOrder === -1 ? '-' : ''}${field}` : undefined;
    this.load();
  }

  onSearch(term: string): void {
    this.search$.next(term.trim());
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api
      .list({
        page: Math.floor(this.first() / this.pageSize()) + 1,
        pageSize: this.pageSize(),
        search: this.searchTerm || undefined,
        ordering: this.ordering,
      })
      .subscribe({
        next: (page) => {
          this.rows.set(page.items);
          this.total.set(page.total);
          this.loading.set(false);
        },
        error: (error: AppError) => {
          this.error.set(error);
          this.loading.set(false);
        },
      });
  }

  groupNames(row: Permission): string {
    return (row.groups ?? []).map((group) => localizedName(group, this.lang())).join(', ');
  }

  edit(row: Permission): void {
    void this.router.navigate(['/company/permissions', row.id, 'edit']);
  }

  confirmDelete(row: Permission): void {
    this.confirmation.confirm({
      key: 'app-confirm',
      header: this.translate.instant('common.confirm'),
      message: this.translate.instant('common.confirmDelete', { name: row.codename }),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.translate.instant('common.delete'),
      rejectLabel: this.translate.instant('common.cancel'),
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.delete(row),
    });
  }

  private delete(row: Permission): void {
    this.api.remove(row.id).subscribe({
      next: () => {
        this.notifications.success(this.translate.instant('common.deleted'));
        if (this.rows().length === 1 && this.first() >= this.pageSize()) {
          this.first.update((first) => first - this.pageSize());
        }
        this.load();
      },
      error: (error: AppError) => {
        if (error.status >= 400 && error.status < 500 && error.status !== 401) {
          this.notifications.error(error.message);
        }
      },
    });
  }
}
```

`src/app/features/company/permissions/permission-list.component.html`:

```html
<app-page-header title="company.permissions.title" [actions]="headerActions"></app-page-header>

<div class="mb-4">
  <input
    pInputText
    type="search"
    class="w-full sm:w-80"
    [placeholder]="'common.search' | translate"
    (input)="onSearch($any($event.target).value)"
  />
</div>

@if (error(); as err) {
  <app-error-state [title]="errorTitleKey(err)" [showRetry]="err.status !== 403" (retry)="load()"></app-error-state>
} @else {
  <div class="overflow-x-auto rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
    <p-table
      [value]="rows()"
      [lazy]="true"
      [lazyLoadOnInit]="false"
      (onLazyLoad)="onLazyLoad($event)"
      [paginator]="true"
      [first]="first()"
      [rows]="pageSize()"
      [totalRecords]="total()"
      [rowsPerPageOptions]="[10, 25, 50]"
      [loading]="loading()"
      dataKey="id"
      styleClass="p-datatable-sm"
    >
      <ng-template pTemplate="header">
        <tr>
          <th pSortableColumn="id">{{ 'company.fields.id' | translate }} <p-sortIcon field="id"></p-sortIcon></th>
          <th>{{ 'company.fields.codename' | translate }}</th>
          <th>{{ 'company.fields.name' | translate }}</th>
          <th>{{ 'company.fields.type' | translate }}</th>
          <th>{{ 'company.fields.groups' | translate }}</th>
          <th class="text-end">{{ 'common.actions' | translate }}</th>
        </tr>
      </ng-template>
      <ng-template pTemplate="body" let-row>
        <tr>
          <td>{{ row.id }}</td>
          <td class="font-mono text-sm">{{ row.codename }}</td>
          <td>{{ row.name }}</td>
          <td>{{ row.permission_type }}</td>
          <td>{{ groupNames(row) }}</td>
          <td class="whitespace-nowrap text-end">
            <p-button
              icon="pi pi-pencil"
              [text]="true"
              [rounded]="true"
              [ariaLabel]="'common.edit' | translate"
              (onClick)="edit(row)"
            ></p-button>
            <p-button
              icon="pi pi-trash"
              severity="danger"
              [text]="true"
              [rounded]="true"
              [ariaLabel]="'common.delete' | translate"
              (onClick)="confirmDelete(row)"
            ></p-button>
          </td>
        </tr>
      </ng-template>
      <ng-template pTemplate="emptymessage">
        <tr>
          <td colspan="6"><app-empty-state icon="pi-key"></app-empty-state></td>
        </tr>
      </ng-template>
    </p-table>
  </div>
}
```

- [ ] **Step 4: Run the list test to verify it passes**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include=src/app/features/company/permissions/permission-list.component.spec.ts`
Expected: `TOTAL: 3 SUCCESS`.

- [ ] **Step 5: Write the failing form test**

`src/app/features/company/permissions/permission-form.component.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { envelope, errorEnvelope, provideApiTesting } from '../../../testing/api-testing';
import { makePermission } from '../../../testing/company-fixtures';
import { PermissionFormComponent } from './permission-form.component';

const URL = '/api/company/v1/permissions/';
const GROUPS_URL = '/api/company/v1/permission-groups/';

describe('PermissionFormComponent', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  function setup(id: string | null) {
    TestBed.configureTestingModule({
      imports: [PermissionFormComponent],
      providers: [
        ...provideApiTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(id ? { id } : {}) } } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    const fixture = TestBed.createComponent(PermissionFormComponent);
    fixture.detectChanges();
    httpMock
      .expectOne((r) => r.url === GROUPS_URL && r.params.get('dropdown') === 'true')
      .flush(envelope([{ id: 4, name_en: 'Sales access', name_ar: null }]));
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('creates a permission with its groups', () => {
    const fixture = setup(null);
    fixture.componentInstance.form.setValue({
      codename: 'reports.view',
      name: 'View reports',
      description: '',
      permission_type: 'FEATURE',
      groups: [4],
    });
    fixture.componentInstance.submit();

    const req = httpMock.expectOne((r) => r.url === URL && r.method === 'POST');
    expect(req.request.body).toEqual({
      codename: 'reports.view',
      name: 'View reports',
      description: '',
      permission_type: 'FEATURE',
      groups: [4],
    });
    req.flush(envelope(makePermission()), { status: 201, statusText: 'Created' });
    expect(router.navigate).toHaveBeenCalledWith(['/company/permissions']);
  });

  it('leaves out permission_type when none is chosen', () => {
    const fixture = setup(null);
    fixture.componentInstance.form.patchValue({ codename: 'a.b', name: 'A B' });
    fixture.componentInstance.submit();
    const req = httpMock.expectOne((r) => r.url === URL && r.method === 'POST');
    expect('permission_type' in req.request.body).toBeFalse();
    req.flush(envelope(makePermission()));
  });

  it('does not submit an invalid form', () => {
    const fixture = setup(null);
    fixture.componentInstance.submit();
    httpMock.expectNone((r) => r.method === 'POST');
  });

  it('loads and updates in edit mode', () => {
    const fixture = setup('6');
    httpMock.expectOne(`${URL}6/`).flush(envelope(makePermission({ groups: [{ id: 4, name_en: 'Sales access' }] })));
    expect(fixture.componentInstance.form.getRawValue().groups).toEqual([4]);

    fixture.componentInstance.submit();
    const req = httpMock.expectOne((r) => r.url === `${URL}6/` && r.method === 'PATCH');
    req.flush(envelope(makePermission()));
  });

  it('shows server field errors', () => {
    const fixture = setup(null);
    fixture.componentInstance.form.patchValue({ codename: 'sales.view', name: 'View sales' });
    fixture.componentInstance.submit();
    httpMock
      .expectOne((r) => r.method === 'POST')
      .flush(errorEnvelope(400, 'Unknown error', { codename: ['Already exists.'] }), {
        status: 400,
        statusText: 'Bad Request',
      });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Already exists.');
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include=src/app/features/company/permissions/permission-form.component.spec.ts`
Expected: compile error `Cannot find module './permission-form.component'`.

- [ ] **Step 7: Write the form component**

`src/app/features/company/permissions/permission-form.component.ts`:

```ts
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { MultiSelectModule } from 'primeng/multiselect';
import { AppError } from '../../../core/errors/app-error';
import { LanguageService } from '../../../core/services/language.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { FieldErrorComponent } from '../../../shared/components/field-error/field-error.component';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { localizedName } from '../../../shared/pipes/localized-name.pipe';
import { applyServerErrors, errorTitleKey } from '../../../shared/utils/server-errors';
import { NamedRef, PermissionPayload, PermissionType, SelectOption } from '../company.models';
import { PermissionGroupService } from '../permission-groups/permission-group.service';
import { PermissionService } from './permission.service';

@Component({
  selector: 'app-permission-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    ButtonModule,
    CardModule,
    DropdownModule,
    InputTextModule,
    InputTextareaModule,
    MultiSelectModule,
    PageHeaderComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    FieldErrorComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './permission-form.component.html',
})
export class PermissionFormComponent implements OnInit {
  private readonly api = inject(PermissionService);
  private readonly groupsApi = inject(PermissionGroupService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);
  private readonly translate = inject(TranslateService);
  private readonly lang = inject(LanguageService).currentLang;
  private readonly groups = signal<NamedRef[]>([]);

  readonly id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id')) || null;
  readonly isEdit = this.id !== null;
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly loadError = signal<AppError | null>(null);
  readonly formErrors = signal<string[]>([]);
  readonly groupOptions = computed<SelectOption[]>(() =>
    this.groups().map((g) => ({ value: g.id, label: localizedName(g, this.lang()) })),
  );
  readonly typeOptions: { value: PermissionType; label: string }[] = [
    { value: 'API', label: 'API' },
    { value: 'OBJECT', label: 'OBJECT' },
    { value: 'FEATURE', label: 'FEATURE' },
  ];
  readonly errorTitleKey = errorTitleKey;

  readonly form = inject(NonNullableFormBuilder).group({
    codename: ['', [Validators.required, Validators.maxLength(100)]],
    name: ['', [Validators.required, Validators.maxLength(255)]],
    description: [''],
    permission_type: [null as PermissionType | null],
    groups: [[] as number[]],
  });

  ngOnInit(): void {
    this.groupsApi.dropdown<NamedRef>().subscribe({
      next: (items) => this.groups.set(items),
      error: () => this.groups.set([]),
    });
    if (this.id !== null) {
      this.loadPermission(this.id);
    }
  }

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const body: PermissionPayload = {
      codename: value.codename.trim(),
      name: value.name.trim(),
      description: value.description.trim(),
      groups: value.groups,
    };
    if (value.permission_type) {
      body.permission_type = value.permission_type;
    }
    this.saving.set(true);
    this.formErrors.set([]);
    const request = this.id !== null ? this.api.update(this.id, body) : this.api.create(body);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.notifications.success(this.translate.instant('common.saved'));
        this.goBack();
      },
      error: (error: AppError) => this.onSaveError(error),
    });
  }

  goBack(): void {
    void this.router.navigate(['/company/permissions']);
  }

  private loadPermission(id: number): void {
    this.loading.set(true);
    this.api.retrieve(id).subscribe({
      next: (permission) => {
        this.form.patchValue({
          codename: permission.codename,
          name: permission.name,
          description: permission.description ?? '',
          permission_type: permission.permission_type ?? null,
          groups: (permission.groups ?? []).map((g) => g.id),
        });
        this.loading.set(false);
      },
      error: (error: AppError) => {
        this.loadError.set(error);
        this.loading.set(false);
      },
    });
  }

  private onSaveError(error: AppError): void {
    this.saving.set(false);
    if (error.status === 0 || error.status === 401 || error.status >= 500) {
      return; // already shown by the global error handling
    }
    this.formErrors.set(applyServerErrors(this.form, error));
    if (Object.keys(error.errors ?? {}).length === 0) {
      this.notifications.error(error.message);
    }
  }
}
```

`src/app/features/company/permissions/permission-form.component.html`:

```html
<app-page-header
  [title]="isEdit ? 'company.permissions.edit' : 'company.permissions.new'"
  [showBack]="true"
  backLabel="common.backToList"
  (back)="goBack()"
></app-page-header>

@if (loadError(); as err) {
  <app-error-state [title]="errorTitleKey(err)" [showRetry]="false"></app-error-state>
} @else if (loading()) {
  <app-loading-state></app-loading-state>
} @else {
  <p-card>
    <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-6" novalidate>
      @if (formErrors().length) {
        <div
          role="alert"
          class="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        >
          @for (message of formErrors(); track $index) {
            <p>{{ message }}</p>
          }
        </div>
      }

      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div class="flex flex-col gap-1">
          <label for="codename" class="text-sm font-medium">{{ 'company.fields.codename' | translate }} *</label>
          <input pInputText id="codename" formControlName="codename" dir="ltr" class="w-full font-mono" />
          <app-field-error [control]="form.controls.codename"></app-field-error>
        </div>

        <div class="flex flex-col gap-1">
          <label for="name" class="text-sm font-medium">{{ 'company.fields.name' | translate }} *</label>
          <input pInputText id="name" formControlName="name" class="w-full" />
          <app-field-error [control]="form.controls.name"></app-field-error>
        </div>

        <div class="flex flex-col gap-1">
          <label for="permission_type" class="text-sm font-medium">{{ 'company.fields.type' | translate }}</label>
          <p-dropdown
            inputId="permission_type"
            formControlName="permission_type"
            [options]="typeOptions"
            optionLabel="label"
            optionValue="value"
            [showClear]="true"
            [placeholder]="'common.select' | translate"
            styleClass="w-full"
            appendTo="body"
          ></p-dropdown>
          <app-field-error [control]="form.controls.permission_type"></app-field-error>
        </div>

        <div class="flex flex-col gap-1">
          <label for="groups" class="text-sm font-medium">{{ 'company.fields.groups' | translate }}</label>
          <p-multiSelect
            inputId="groups"
            formControlName="groups"
            [options]="groupOptions()"
            optionLabel="label"
            optionValue="value"
            [filter]="true"
            display="chip"
            [placeholder]="'common.select' | translate"
            styleClass="w-full"
            appendTo="body"
          ></p-multiSelect>
          <app-field-error [control]="form.controls.groups"></app-field-error>
        </div>

        <div class="flex flex-col gap-1 md:col-span-2">
          <label for="description" class="text-sm font-medium">{{ 'company.fields.description' | translate }}</label>
          <textarea pInputTextarea id="description" formControlName="description" rows="3" class="w-full"></textarea>
          <app-field-error [control]="form.controls.description"></app-field-error>
        </div>
      </div>

      <div class="flex justify-end gap-2">
        <p-button
          type="button"
          [label]="'common.cancel' | translate"
          severity="secondary"
          [outlined]="true"
          (onClick)="goBack()"
        ></p-button>
        <p-button
          type="submit"
          [label]="'common.save' | translate"
          icon="pi pi-check"
          [loading]="saving()"
          [disabled]="saving()"
        ></p-button>
      </div>
    </form>
  </p-card>
}
```

- [ ] **Step 8: Add the routes**

Append to `COMPANY_ROUTES` in `src/app/features/company/company.routes.ts`:

```ts
  {
    path: 'permissions',
    loadComponent: () => import('./permissions/permission-list.component').then((m) => m.PermissionListComponent),
    data: { titleKey: 'company.permissions.title' },
  },
  {
    path: 'permissions/new',
    loadComponent: () => import('./permissions/permission-form.component').then((m) => m.PermissionFormComponent),
    data: { titleKey: 'company.permissions.new' },
  },
  {
    path: 'permissions/:id/edit',
    loadComponent: () => import('./permissions/permission-form.component').then((m) => m.PermissionFormComponent),
    data: { titleKey: 'company.permissions.edit' },
  },
```

- [ ] **Step 9: Run tests and build**

Run: `npx ng test --watch=false --browsers=ChromeHeadless` then `npm run build`
Expected: all pass; build succeeds.

- [ ] **Step 10: Commit**

```bash
git add src/app/features/company/permissions src/app/features/company/company.routes.ts
git commit -m "Add permission list and form pages" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Roles list and form

**Files:**
- Create: `src/app/features/company/roles/role-list.component.ts`, `.html`, `.spec.ts`
- Create: `src/app/features/company/roles/role-form.component.ts`, `.html`, `.spec.ts`
- Modify: `src/app/features/company/company.routes.ts`

**Interfaces:**
- Consumes: `RoleService`, `PermissionGroupService.dropdown<NamedRef>()`, `Role`, `RolePayload`, `NamedRef`, `SelectOption`; `StatusBadgeComponent`; `localizedName`; others as Task 6.
- Produces: `RoleListComponent` (adds `groupNames(row: Role): string`), `RoleFormComponent` (adds `groupOptions`).

- [ ] **Step 1: Write the failing list test**

`src/app/features/company/roles/role-list.component.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { Confirmation, ConfirmationService } from 'primeng/api';
import { envelope, provideApiTesting } from '../../../testing/api-testing';
import { makeRole } from '../../../testing/company-fixtures';
import { RoleListComponent } from './role-list.component';

const URL = '/api/company/v1/roles/';

describe('RoleListComponent', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [RoleListComponent], providers: provideApiTesting() }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
  });

  afterEach(() => httpMock.verify());

  function create() {
    const fixture = TestBed.createComponent(RoleListComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('loads the first page and shows permission group names', () => {
    const fixture = create();
    const req = httpMock.expectOne((r) => r.url === URL);
    expect(req.request.params.get('page')).toBe('1');
    req.flush(envelope([makeRole({ permission_groups: [{ id: 1, name_en: 'Group 0' }] })], 1));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Sales Manager');
    expect(fixture.nativeElement.textContent).toContain('Group 0');
  });

  it('opens the edit page', () => {
    const fixture = create();
    httpMock.expectOne((r) => r.url === URL).flush(envelope([makeRole()], 1));
    fixture.componentInstance.edit(makeRole());
    expect(router.navigate).toHaveBeenCalledWith(['/company/roles', 3, 'edit']);
  });

  it('deletes after confirmation and reloads', () => {
    const confirmation = TestBed.inject(ConfirmationService);
    spyOn(confirmation, 'confirm').and.callFake((c: Confirmation) => {
      c.accept?.();
      return confirmation;
    });
    const fixture = create();
    httpMock.expectOne((r) => r.url === URL).flush(envelope([makeRole()], 1));
    fixture.componentInstance.confirmDelete(makeRole());
    httpMock.expectOne(`${URL}3/`).flush(null, { status: 204, statusText: 'No Content' });
    httpMock.expectOne((r) => r.url === URL).flush(envelope([], 0));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include=src/app/features/company/roles/role-list.component.spec.ts`
Expected: compile error `Cannot find module './role-list.component'`.

- [ ] **Step 3: Write the list component**

`src/app/features/company/roles/role-list.component.ts`:

```ts
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { AppError } from '../../../core/errors/app-error';
import { LanguageService } from '../../../core/services/language.service';
import { NotificationService } from '../../../core/services/notification.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { PageHeaderAction, PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { localizedName } from '../../../shared/pipes/localized-name.pipe';
import { errorTitleKey } from '../../../shared/utils/server-errors';
import { Role } from '../company.models';
import { RoleService } from './role.service';

@Component({
  selector: 'app-role-list',
  standalone: true,
  imports: [
    TranslatePipe,
    TableModule,
    ButtonModule,
    InputTextModule,
    PageHeaderComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    StatusBadgeComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './role-list.component.html',
})
export class RoleListComponent implements OnInit {
  private readonly api = inject(RoleService);
  private readonly router = inject(Router);
  private readonly confirmation = inject(ConfirmationService);
  private readonly notifications = inject(NotificationService);
  private readonly translate = inject(TranslateService);
  private readonly lang = inject(LanguageService).currentLang;
  private readonly search$ = new Subject<string>();
  private searchTerm = '';
  private ordering?: string;

  readonly rows = signal<Role[]>([]);
  readonly total = signal(0);
  readonly first = signal(0);
  readonly pageSize = signal(10);
  readonly loading = signal(false);
  readonly error = signal<AppError | null>(null);
  readonly errorTitleKey = errorTitleKey;

  readonly headerActions: PageHeaderAction[] = [
    {
      label: 'company.roles.new',
      icon: 'pi pi-plus',
      onClick: () => void this.router.navigate(['/company/roles/new']),
    },
  ];

  constructor() {
    this.search$.pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed()).subscribe((term) => {
      this.searchTerm = term;
      this.first.set(0);
      this.load();
    });
  }

  ngOnInit(): void {
    this.load();
  }

  onLazyLoad(event: TableLazyLoadEvent): void {
    this.first.set(event.first ?? 0);
    this.pageSize.set(event.rows ?? this.pageSize());
    const field = typeof event.sortField === 'string' ? event.sortField : undefined;
    this.ordering = field ? `${event.sortOrder === -1 ? '-' : ''}${field}` : undefined;
    this.load();
  }

  onSearch(term: string): void {
    this.search$.next(term.trim());
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api
      .list({
        page: Math.floor(this.first() / this.pageSize()) + 1,
        pageSize: this.pageSize(),
        search: this.searchTerm || undefined,
        ordering: this.ordering,
      })
      .subscribe({
        next: (page) => {
          this.rows.set(page.items);
          this.total.set(page.total);
          this.loading.set(false);
        },
        error: (error: AppError) => {
          this.error.set(error);
          this.loading.set(false);
        },
      });
  }

  groupNames(row: Role): string {
    return (row.permission_groups ?? []).map((group) => localizedName(group, this.lang())).join(', ');
  }

  edit(row: Role): void {
    void this.router.navigate(['/company/roles', row.id, 'edit']);
  }

  confirmDelete(row: Role): void {
    this.confirmation.confirm({
      key: 'app-confirm',
      header: this.translate.instant('common.confirm'),
      message: this.translate.instant('common.confirmDelete', { name: row.name_en }),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.translate.instant('common.delete'),
      rejectLabel: this.translate.instant('common.cancel'),
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.delete(row),
    });
  }

  private delete(row: Role): void {
    this.api.remove(row.id).subscribe({
      next: () => {
        this.notifications.success(this.translate.instant('common.deleted'));
        if (this.rows().length === 1 && this.first() >= this.pageSize()) {
          this.first.update((first) => first - this.pageSize());
        }
        this.load();
      },
      error: (error: AppError) => {
        if (error.status >= 400 && error.status < 500 && error.status !== 401) {
          this.notifications.error(error.message);
        }
      },
    });
  }
}
```

`src/app/features/company/roles/role-list.component.html`:

```html
<app-page-header title="company.roles.title" [actions]="headerActions"></app-page-header>

<div class="mb-4">
  <input
    pInputText
    type="search"
    class="w-full sm:w-80"
    [placeholder]="'common.search' | translate"
    (input)="onSearch($any($event.target).value)"
  />
</div>

@if (error(); as err) {
  <app-error-state [title]="errorTitleKey(err)" [showRetry]="err.status !== 403" (retry)="load()"></app-error-state>
} @else {
  <div class="overflow-x-auto rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
    <p-table
      [value]="rows()"
      [lazy]="true"
      [lazyLoadOnInit]="false"
      (onLazyLoad)="onLazyLoad($event)"
      [paginator]="true"
      [first]="first()"
      [rows]="pageSize()"
      [totalRecords]="total()"
      [rowsPerPageOptions]="[10, 25, 50]"
      [loading]="loading()"
      dataKey="id"
      styleClass="p-datatable-sm"
    >
      <ng-template pTemplate="header">
        <tr>
          <th pSortableColumn="id">{{ 'company.fields.id' | translate }} <p-sortIcon field="id"></p-sortIcon></th>
          <th pSortableColumn="name_en">
            {{ 'company.fields.nameEn' | translate }} <p-sortIcon field="name_en"></p-sortIcon>
          </th>
          <th>{{ 'company.fields.nameAr' | translate }}</th>
          <th>{{ 'company.fields.isAdmin' | translate }}</th>
          <th>{{ 'company.fields.permissionGroups' | translate }}</th>
          <th class="text-end">{{ 'common.actions' | translate }}</th>
        </tr>
      </ng-template>
      <ng-template pTemplate="body" let-row>
        <tr>
          <td>{{ row.id }}</td>
          <td>{{ row.name_en }}</td>
          <td>{{ row.name_ar }}</td>
          <td>
            @if (row.is_admin) {
              <app-status-badge [value]="'common.yes' | translate" severity="warning"></app-status-badge>
            }
          </td>
          <td>{{ groupNames(row) }}</td>
          <td class="whitespace-nowrap text-end">
            <p-button
              icon="pi pi-pencil"
              [text]="true"
              [rounded]="true"
              [ariaLabel]="'common.edit' | translate"
              (onClick)="edit(row)"
            ></p-button>
            <p-button
              icon="pi pi-trash"
              severity="danger"
              [text]="true"
              [rounded]="true"
              [ariaLabel]="'common.delete' | translate"
              (onClick)="confirmDelete(row)"
            ></p-button>
          </td>
        </tr>
      </ng-template>
      <ng-template pTemplate="emptymessage">
        <tr>
          <td colspan="6"><app-empty-state icon="pi-shield"></app-empty-state></td>
        </tr>
      </ng-template>
    </p-table>
  </div>
}
```

- [ ] **Step 4: Run the list test to verify it passes**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include=src/app/features/company/roles/role-list.component.spec.ts`
Expected: `TOTAL: 3 SUCCESS`.

- [ ] **Step 5: Write the failing form test**

`src/app/features/company/roles/role-form.component.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { envelope, errorEnvelope, provideApiTesting } from '../../../testing/api-testing';
import { makeRole } from '../../../testing/company-fixtures';
import { RoleFormComponent } from './role-form.component';

const URL = '/api/company/v1/roles/';
const GROUPS_URL = '/api/company/v1/permission-groups/';

describe('RoleFormComponent', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  function setup(id: string | null) {
    TestBed.configureTestingModule({
      imports: [RoleFormComponent],
      providers: [
        ...provideApiTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(id ? { id } : {}) } } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    const fixture = TestBed.createComponent(RoleFormComponent);
    fixture.detectChanges();
    httpMock
      .expectOne((r) => r.url === GROUPS_URL && r.params.get('dropdown') === 'true')
      .flush(envelope([{ id: 1, name_en: 'Group 0', name_ar: null }]));
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('creates a role', () => {
    const fixture = setup(null);
    fixture.componentInstance.form.setValue({ name_en: 'Sales Manager', name_ar: '', permission_groups: [1], is_admin: false });
    fixture.componentInstance.submit();

    const req = httpMock.expectOne((r) => r.url === URL && r.method === 'POST');
    expect(req.request.body).toEqual({ name_en: 'Sales Manager', name_ar: null, permission_groups: [1], is_admin: false });
    req.flush(envelope(makeRole()), { status: 201, statusText: 'Created' });
    expect(router.navigate).toHaveBeenCalledWith(['/company/roles']);
  });

  it('requires at least one permission group', () => {
    const fixture = setup(null);
    fixture.componentInstance.form.patchValue({ name_en: 'Viewer' });
    fixture.componentInstance.submit();
    httpMock.expectNone((r) => r.method === 'POST');
    expect(fixture.componentInstance.form.controls.permission_groups.hasError('required')).toBeTrue();
  });

  it('loads and updates in edit mode', () => {
    const fixture = setup('3');
    httpMock.expectOne(`${URL}3/`).flush(envelope(makeRole({ permission_groups: [{ id: 1, name_en: 'Group 0' }] })));
    expect(fixture.componentInstance.form.getRawValue().permission_groups).toEqual([1]);

    fixture.componentInstance.submit();
    const req = httpMock.expectOne((r) => r.url === `${URL}3/` && r.method === 'PATCH');
    req.flush(envelope(makeRole()));
  });

  it('shows server field errors', () => {
    const fixture = setup(null);
    fixture.componentInstance.form.patchValue({ name_en: 'Sales Manager', permission_groups: [1] });
    fixture.componentInstance.submit();
    httpMock
      .expectOne((r) => r.method === 'POST')
      .flush(errorEnvelope(400, 'Unknown error', { name_en: ['Already exists.'] }), {
        status: 400,
        statusText: 'Bad Request',
      });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Already exists.');
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include=src/app/features/company/roles/role-form.component.spec.ts`
Expected: compile error `Cannot find module './role-form.component'`.

- [ ] **Step 7: Write the form component**

`src/app/features/company/roles/role-form.component.ts`:

```ts
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputSwitchModule } from 'primeng/inputswitch';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { AppError } from '../../../core/errors/app-error';
import { LanguageService } from '../../../core/services/language.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { FieldErrorComponent } from '../../../shared/components/field-error/field-error.component';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { localizedName } from '../../../shared/pipes/localized-name.pipe';
import { applyServerErrors, errorTitleKey } from '../../../shared/utils/server-errors';
import { NamedRef, RolePayload, SelectOption } from '../company.models';
import { PermissionGroupService } from '../permission-groups/permission-group.service';
import { RoleService } from './role.service';

@Component({
  selector: 'app-role-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    ButtonModule,
    CardModule,
    InputSwitchModule,
    InputTextModule,
    MultiSelectModule,
    PageHeaderComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    FieldErrorComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './role-form.component.html',
})
export class RoleFormComponent implements OnInit {
  private readonly api = inject(RoleService);
  private readonly groupsApi = inject(PermissionGroupService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);
  private readonly translate = inject(TranslateService);
  private readonly lang = inject(LanguageService).currentLang;
  private readonly groups = signal<NamedRef[]>([]);

  readonly id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id')) || null;
  readonly isEdit = this.id !== null;
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly loadError = signal<AppError | null>(null);
  readonly formErrors = signal<string[]>([]);
  readonly groupOptions = computed<SelectOption[]>(() =>
    this.groups().map((g) => ({ value: g.id, label: localizedName(g, this.lang()) })),
  );
  readonly errorTitleKey = errorTitleKey;

  readonly form = inject(NonNullableFormBuilder).group({
    name_en: ['', [Validators.required, Validators.maxLength(100)]],
    name_ar: ['', [Validators.maxLength(100)]],
    permission_groups: [[] as number[], [Validators.required]],
    is_admin: [false],
  });

  ngOnInit(): void {
    this.groupsApi.dropdown<NamedRef>().subscribe({
      next: (items) => this.groups.set(items),
      error: () => this.groups.set([]),
    });
    if (this.id !== null) {
      this.loadRole(this.id);
    }
  }

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const body: RolePayload = {
      name_en: value.name_en.trim(),
      name_ar: value.name_ar.trim() || null,
      permission_groups: value.permission_groups,
      is_admin: value.is_admin,
    };
    this.saving.set(true);
    this.formErrors.set([]);
    const request = this.id !== null ? this.api.update(this.id, body) : this.api.create(body);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.notifications.success(this.translate.instant('common.saved'));
        this.goBack();
      },
      error: (error: AppError) => this.onSaveError(error),
    });
  }

  goBack(): void {
    void this.router.navigate(['/company/roles']);
  }

  private loadRole(id: number): void {
    this.loading.set(true);
    this.api.retrieve(id).subscribe({
      next: (role) => {
        this.form.patchValue({
          name_en: role.name_en,
          name_ar: role.name_ar ?? '',
          permission_groups: (role.permission_groups ?? []).map((g) => g.id),
          is_admin: role.is_admin,
        });
        this.loading.set(false);
      },
      error: (error: AppError) => {
        this.loadError.set(error);
        this.loading.set(false);
      },
    });
  }

  private onSaveError(error: AppError): void {
    this.saving.set(false);
    if (error.status === 0 || error.status === 401 || error.status >= 500) {
      return; // already shown by the global error handling
    }
    this.formErrors.set(applyServerErrors(this.form, error));
    if (Object.keys(error.errors ?? {}).length === 0) {
      this.notifications.error(error.message);
    }
  }
}
```

`src/app/features/company/roles/role-form.component.html`:

```html
<app-page-header
  [title]="isEdit ? 'company.roles.edit' : 'company.roles.new'"
  [showBack]="true"
  backLabel="common.backToList"
  (back)="goBack()"
></app-page-header>

@if (loadError(); as err) {
  <app-error-state [title]="errorTitleKey(err)" [showRetry]="false"></app-error-state>
} @else if (loading()) {
  <app-loading-state></app-loading-state>
} @else {
  <p-card>
    <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-6" novalidate>
      @if (formErrors().length) {
        <div
          role="alert"
          class="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        >
          @for (message of formErrors(); track $index) {
            <p>{{ message }}</p>
          }
        </div>
      }

      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div class="flex flex-col gap-1">
          <label for="name_en" class="text-sm font-medium">{{ 'company.fields.nameEn' | translate }} *</label>
          <input pInputText id="name_en" formControlName="name_en" class="w-full" />
          <app-field-error [control]="form.controls.name_en"></app-field-error>
        </div>

        <div class="flex flex-col gap-1">
          <label for="name_ar" class="text-sm font-medium">{{ 'company.fields.nameAr' | translate }}</label>
          <input pInputText id="name_ar" formControlName="name_ar" dir="rtl" class="w-full" />
          <app-field-error [control]="form.controls.name_ar"></app-field-error>
        </div>

        <div class="flex flex-col gap-1 md:col-span-2">
          <label for="permission_groups" class="text-sm font-medium">
            {{ 'company.fields.permissionGroups' | translate }} *
          </label>
          <p-multiSelect
            inputId="permission_groups"
            formControlName="permission_groups"
            [options]="groupOptions()"
            optionLabel="label"
            optionValue="value"
            [filter]="true"
            display="chip"
            [placeholder]="'common.select' | translate"
            styleClass="w-full"
            appendTo="body"
          ></p-multiSelect>
          <app-field-error [control]="form.controls.permission_groups"></app-field-error>
        </div>

        <div class="flex items-center gap-3">
          <p-inputSwitch inputId="is_admin" formControlName="is_admin"></p-inputSwitch>
          <label for="is_admin" class="text-sm font-medium">{{ 'company.fields.isAdmin' | translate }}</label>
        </div>
      </div>

      <div class="flex justify-end gap-2">
        <p-button
          type="button"
          [label]="'common.cancel' | translate"
          severity="secondary"
          [outlined]="true"
          (onClick)="goBack()"
        ></p-button>
        <p-button
          type="submit"
          [label]="'common.save' | translate"
          icon="pi pi-check"
          [loading]="saving()"
          [disabled]="saving()"
        ></p-button>
      </div>
    </form>
  </p-card>
}
```

- [ ] **Step 8: Add the routes**

Append to `COMPANY_ROUTES` in `src/app/features/company/company.routes.ts`:

```ts
  {
    path: 'roles',
    loadComponent: () => import('./roles/role-list.component').then((m) => m.RoleListComponent),
    data: { titleKey: 'company.roles.title' },
  },
  {
    path: 'roles/new',
    loadComponent: () => import('./roles/role-form.component').then((m) => m.RoleFormComponent),
    data: { titleKey: 'company.roles.new' },
  },
  {
    path: 'roles/:id/edit',
    loadComponent: () => import('./roles/role-form.component').then((m) => m.RoleFormComponent),
    data: { titleKey: 'company.roles.edit' },
  },
```

- [ ] **Step 9: Run tests and build**

Run: `npx ng test --watch=false --browsers=ChromeHeadless` then `npm run build`
Expected: all pass; build succeeds.

- [ ] **Step 10: Commit**

```bash
git add src/app/features/company/roles src/app/features/company/company.routes.ts
git commit -m "Add role list and form pages" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Teams list and form

**Files:**
- Create: `src/app/features/company/teams/team-list.component.ts`, `.html`, `.spec.ts`
- Create: `src/app/features/company/teams/team-form.component.ts`, `.html`, `.spec.ts`
- Modify: `src/app/features/company/company.routes.ts`

**Interfaces:**
- Consumes: `TeamService`, `DepartmentService.dropdown<NamedRef>()`, `LocationService.dropdown<NamedRef>()`, `CompanyUserService.userOptions()`, `Team`, `TeamPayload`, `NamedRef`, `SelectOption`; `LocalizedNamePipe`, `localizedName`, `userName`; others as Task 6.
- Produces: `TeamListComponent` (adds `leadNames(row: Team): string`), `TeamFormComponent` (adds `locationState: Signal<'loading' | 'ready' | 'forbidden' | 'empty' | 'error'>`, `canSave: Signal<boolean>`, `departmentOptions`, `locationOptions`, `userOptions`).

- [ ] **Step 1: Write the failing list test**

`src/app/features/company/teams/team-list.component.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { Confirmation, ConfirmationService } from 'primeng/api';
import { envelope, provideApiTesting } from '../../../testing/api-testing';
import { SARA_REF, makeTeam } from '../../../testing/company-fixtures';
import { TeamListComponent } from './team-list.component';

const URL = '/api/company/v1/teams/';

describe('TeamListComponent', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TeamListComponent], providers: provideApiTesting() }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
  });

  afterEach(() => httpMock.verify());

  function create() {
    const fixture = TestBed.createComponent(TeamListComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('loads the first page and shows department, location and leads', () => {
    const fixture = create();
    const req = httpMock.expectOne((r) => r.url === URL);
    expect(req.request.params.get('page')).toBe('1');
    req.flush(envelope([makeTeam({ leads: [SARA_REF] })], 1));
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('B2B Team');
    expect(text).toContain('Sales');
    expect(text).toContain('Head Office (HQ-01)');
    expect(text).toContain('Sara Ali');
  });

  it('opens the edit page', () => {
    const fixture = create();
    httpMock.expectOne((r) => r.url === URL).flush(envelope([makeTeam()], 1));
    fixture.componentInstance.edit(makeTeam());
    expect(router.navigate).toHaveBeenCalledWith(['/company/teams', 7, 'edit']);
  });

  it('deletes after confirmation and reloads', () => {
    const confirmation = TestBed.inject(ConfirmationService);
    spyOn(confirmation, 'confirm').and.callFake((c: Confirmation) => {
      c.accept?.();
      return confirmation;
    });
    const fixture = create();
    httpMock.expectOne((r) => r.url === URL).flush(envelope([makeTeam()], 1));
    fixture.componentInstance.confirmDelete(makeTeam());
    httpMock.expectOne(`${URL}7/`).flush(null, { status: 204, statusText: 'No Content' });
    httpMock.expectOne((r) => r.url === URL).flush(envelope([], 0));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include=src/app/features/company/teams/team-list.component.spec.ts`
Expected: compile error `Cannot find module './team-list.component'`.

- [ ] **Step 3: Write the list component**

`src/app/features/company/teams/team-list.component.ts`:

```ts
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { AppError } from '../../../core/errors/app-error';
import { LanguageService } from '../../../core/services/language.service';
import { NotificationService } from '../../../core/services/notification.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { PageHeaderAction, PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { LocalizedNamePipe } from '../../../shared/pipes/localized-name.pipe';
import { userName } from '../../../shared/pipes/user-name.pipe';
import { errorTitleKey } from '../../../shared/utils/server-errors';
import { Team } from '../company.models';
import { TeamService } from './team.service';

@Component({
  selector: 'app-team-list',
  standalone: true,
  imports: [
    TranslatePipe,
    TableModule,
    ButtonModule,
    InputTextModule,
    PageHeaderComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    LocalizedNamePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './team-list.component.html',
})
export class TeamListComponent implements OnInit {
  private readonly api = inject(TeamService);
  private readonly router = inject(Router);
  private readonly confirmation = inject(ConfirmationService);
  private readonly notifications = inject(NotificationService);
  private readonly translate = inject(TranslateService);
  private readonly search$ = new Subject<string>();
  private searchTerm = '';
  private ordering?: string;

  readonly lang = inject(LanguageService).currentLang;
  readonly rows = signal<Team[]>([]);
  readonly total = signal(0);
  readonly first = signal(0);
  readonly pageSize = signal(10);
  readonly loading = signal(false);
  readonly error = signal<AppError | null>(null);
  readonly errorTitleKey = errorTitleKey;

  readonly headerActions: PageHeaderAction[] = [
    {
      label: 'company.teams.new',
      icon: 'pi pi-plus',
      onClick: () => void this.router.navigate(['/company/teams/new']),
    },
  ];

  constructor() {
    this.search$.pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed()).subscribe((term) => {
      this.searchTerm = term;
      this.first.set(0);
      this.load();
    });
  }

  ngOnInit(): void {
    this.load();
  }

  onLazyLoad(event: TableLazyLoadEvent): void {
    this.first.set(event.first ?? 0);
    this.pageSize.set(event.rows ?? this.pageSize());
    const field = typeof event.sortField === 'string' ? event.sortField : undefined;
    this.ordering = field ? `${event.sortOrder === -1 ? '-' : ''}${field}` : undefined;
    this.load();
  }

  onSearch(term: string): void {
    this.search$.next(term.trim());
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api
      .list({
        page: Math.floor(this.first() / this.pageSize()) + 1,
        pageSize: this.pageSize(),
        search: this.searchTerm || undefined,
        ordering: this.ordering,
      })
      .subscribe({
        next: (page) => {
          this.rows.set(page.items);
          this.total.set(page.total);
          this.loading.set(false);
        },
        error: (error: AppError) => {
          this.error.set(error);
          this.loading.set(false);
        },
      });
  }

  leadNames(row: Team): string {
    return (row.leads ?? []).map((lead) => userName(lead)).join(', ');
  }

  edit(row: Team): void {
    void this.router.navigate(['/company/teams', row.id, 'edit']);
  }

  confirmDelete(row: Team): void {
    this.confirmation.confirm({
      key: 'app-confirm',
      header: this.translate.instant('common.confirm'),
      message: this.translate.instant('common.confirmDelete', { name: row.name_en }),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.translate.instant('common.delete'),
      rejectLabel: this.translate.instant('common.cancel'),
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.delete(row),
    });
  }

  private delete(row: Team): void {
    this.api.remove(row.id).subscribe({
      next: () => {
        this.notifications.success(this.translate.instant('common.deleted'));
        if (this.rows().length === 1 && this.first() >= this.pageSize()) {
          this.first.update((first) => first - this.pageSize());
        }
        this.load();
      },
      error: (error: AppError) => {
        if (error.status >= 400 && error.status < 500 && error.status !== 401) {
          this.notifications.error(error.message);
        }
      },
    });
  }
}
```

`src/app/features/company/teams/team-list.component.html`:

```html
<app-page-header title="company.teams.title" [actions]="headerActions"></app-page-header>

<div class="mb-4">
  <input
    pInputText
    type="search"
    class="w-full sm:w-80"
    [placeholder]="'common.search' | translate"
    (input)="onSearch($any($event.target).value)"
  />
</div>

@if (error(); as err) {
  <app-error-state [title]="errorTitleKey(err)" [showRetry]="err.status !== 403" (retry)="load()"></app-error-state>
} @else {
  <div class="overflow-x-auto rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
    <p-table
      [value]="rows()"
      [lazy]="true"
      [lazyLoadOnInit]="false"
      (onLazyLoad)="onLazyLoad($event)"
      [paginator]="true"
      [first]="first()"
      [rows]="pageSize()"
      [totalRecords]="total()"
      [rowsPerPageOptions]="[10, 25, 50]"
      [loading]="loading()"
      dataKey="id"
      styleClass="p-datatable-sm"
    >
      <ng-template pTemplate="header">
        <tr>
          <th pSortableColumn="id">{{ 'company.fields.id' | translate }} <p-sortIcon field="id"></p-sortIcon></th>
          <th pSortableColumn="name_en">
            {{ 'company.fields.nameEn' | translate }} <p-sortIcon field="name_en"></p-sortIcon>
          </th>
          <th>{{ 'company.fields.nameAr' | translate }}</th>
          <th>{{ 'company.fields.department' | translate }}</th>
          <th>{{ 'company.fields.location' | translate }}</th>
          <th>{{ 'company.fields.leads' | translate }}</th>
          <th class="text-end">{{ 'common.actions' | translate }}</th>
        </tr>
      </ng-template>
      <ng-template pTemplate="body" let-row>
        <tr>
          <td>{{ row.id }}</td>
          <td>{{ row.name_en }}</td>
          <td>{{ row.name_ar }}</td>
          <td>{{ row.department | localizedName: lang() }}</td>
          <td>{{ row.location?.name }}</td>
          <td>{{ leadNames(row) }}</td>
          <td class="whitespace-nowrap text-end">
            <p-button
              icon="pi pi-pencil"
              [text]="true"
              [rounded]="true"
              [ariaLabel]="'common.edit' | translate"
              (onClick)="edit(row)"
            ></p-button>
            <p-button
              icon="pi pi-trash"
              severity="danger"
              [text]="true"
              [rounded]="true"
              [ariaLabel]="'common.delete' | translate"
              (onClick)="confirmDelete(row)"
            ></p-button>
          </td>
        </tr>
      </ng-template>
      <ng-template pTemplate="emptymessage">
        <tr>
          <td colspan="7"><app-empty-state icon="pi-id-card"></app-empty-state></td>
        </tr>
      </ng-template>
    </p-table>
  </div>
}
```

- [ ] **Step 4: Run the list test to verify it passes**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include=src/app/features/company/teams/team-list.component.spec.ts`
Expected: `TOTAL: 3 SUCCESS`.

- [ ] **Step 5: Write the failing form test**

`src/app/features/company/teams/team-form.component.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { envelope, errorEnvelope, provideApiTesting } from '../../../testing/api-testing';
import { SARA_REF, makeCompanyUser, makeTeam } from '../../../testing/company-fixtures';
import { TeamFormComponent } from './team-form.component';

const URL = '/api/company/v1/teams/';
const DEPARTMENTS_URL = '/api/company/v1/departments/';
const LOCATIONS_URL = '/api/company/v1/location/';
const USERS_URL = '/api/company/v1/company-user/';

type LocationReply = { body: unknown; status?: number };

describe('TeamFormComponent', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  function setup(id: string | null, locations: LocationReply = { body: envelope([{ id: 1, name_en: 'HQ', name_ar: null }]) }) {
    TestBed.configureTestingModule({
      imports: [TeamFormComponent],
      providers: [
        ...provideApiTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(id ? { id } : {}) } } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    const fixture = TestBed.createComponent(TeamFormComponent);
    fixture.detectChanges();

    httpMock
      .expectOne((r) => r.url === DEPARTMENTS_URL && r.params.get('dropdown') === 'true')
      .flush(envelope([{ id: 5, name_en: 'Sales', name_ar: 'المبيعات' }]));
    httpMock.expectOne(USERS_URL).flush(envelope([makeCompanyUser()]));
    httpMock
      .expectOne((r) => r.url === LOCATIONS_URL && r.params.get('dropdown') === 'true')
      .flush(locations.body, locations.status ? { status: locations.status, statusText: 'Error' } : undefined);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('creates a team', () => {
    const fixture = setup(null);
    fixture.componentInstance.form.setValue({ department: 5, name_en: 'B2B Team', name_ar: '', location: 1, leads: [9] });
    fixture.componentInstance.submit();

    const req = httpMock.expectOne((r) => r.url === URL && r.method === 'POST');
    expect(req.request.body).toEqual({ department: 5, name_en: 'B2B Team', name_ar: null, location: 1, leads: [9] });
    req.flush(envelope(makeTeam()), { status: 201, statusText: 'Created' });
    expect(router.navigate).toHaveBeenCalledWith(['/company/teams']);
  });

  it('does not submit without department and location', () => {
    const fixture = setup(null);
    fixture.componentInstance.form.patchValue({ name_en: 'B2B Team' });
    fixture.componentInstance.submit();
    httpMock.expectNone((r) => r.method === 'POST');
  });

  it('blocks saving when the subscription has no Locations module', () => {
    const fixture = setup(null, { body: errorEnvelope(403, 'Forbidden'), status: 403 });
    expect(fixture.componentInstance.locationState()).toBe('forbidden');
    expect(fixture.componentInstance.canSave()).toBeFalse();
    expect(fixture.nativeElement.textContent).toContain('company.teams.locationForbidden');

    fixture.componentInstance.form.setValue({ department: 5, name_en: 'B2B Team', name_ar: '', location: 1, leads: [] });
    fixture.componentInstance.submit();
    httpMock.expectNone((r) => r.method === 'POST');
  });

  it('blocks saving when there are no locations yet', () => {
    const fixture = setup(null, { body: envelope([]) });
    expect(fixture.componentInstance.locationState()).toBe('empty');
    expect(fixture.componentInstance.canSave()).toBeFalse();
    expect(fixture.nativeElement.textContent).toContain('company.teams.locationEmpty');
  });

  it('loads and updates in edit mode', () => {
    const fixture = setup('7');
    httpMock.expectOne(`${URL}7/`).flush(envelope(makeTeam({ leads: [SARA_REF] })));
    expect(fixture.componentInstance.form.getRawValue()).toEqual({
      department: 5,
      name_en: 'B2B Team',
      name_ar: '',
      location: 1,
      leads: [9],
    });

    fixture.componentInstance.submit();
    const req = httpMock.expectOne((r) => r.url === `${URL}7/` && r.method === 'PATCH');
    req.flush(envelope(makeTeam()));
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include=src/app/features/company/teams/team-form.component.spec.ts`
Expected: compile error `Cannot find module './team-form.component'`.

- [ ] **Step 7: Write the form component**

`src/app/features/company/teams/team-form.component.ts`:

```ts
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { AppError } from '../../../core/errors/app-error';
import { LanguageService } from '../../../core/services/language.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { FieldErrorComponent } from '../../../shared/components/field-error/field-error.component';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { localizedName } from '../../../shared/pipes/localized-name.pipe';
import { applyServerErrors, errorTitleKey } from '../../../shared/utils/server-errors';
import { LocationService } from '../../locations/location.service';
import { NamedRef, SelectOption, TeamPayload } from '../company.models';
import { DepartmentService } from '../departments/department.service';
import { CompanyUserService } from '../users/company-user.service';
import { TeamService } from './team.service';

export type LocationState = 'loading' | 'ready' | 'forbidden' | 'empty' | 'error';

@Component({
  selector: 'app-team-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    ButtonModule,
    CardModule,
    DropdownModule,
    InputTextModule,
    MultiSelectModule,
    PageHeaderComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    FieldErrorComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './team-form.component.html',
})
export class TeamFormComponent implements OnInit {
  private readonly api = inject(TeamService);
  private readonly departmentsApi = inject(DepartmentService);
  private readonly locationsApi = inject(LocationService);
  private readonly users = inject(CompanyUserService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);
  private readonly translate = inject(TranslateService);
  private readonly lang = inject(LanguageService).currentLang;
  private readonly departments = signal<NamedRef[]>([]);
  private readonly locations = signal<NamedRef[]>([]);

  readonly id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id')) || null;
  readonly isEdit = this.id !== null;
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly loadError = signal<AppError | null>(null);
  readonly formErrors = signal<string[]>([]);
  readonly userOptions = signal<SelectOption[]>([]);
  readonly locationState = signal<LocationState>('loading');
  readonly canSave = computed(() => this.locationState() === 'ready');
  readonly departmentOptions = computed<SelectOption[]>(() =>
    this.departments().map((d) => ({ value: d.id, label: localizedName(d, this.lang()) })),
  );
  readonly locationOptions = computed<SelectOption[]>(() =>
    this.locations().map((l) => ({ value: l.id, label: localizedName(l, this.lang()) })),
  );
  readonly errorTitleKey = errorTitleKey;

  readonly form = inject(NonNullableFormBuilder).group({
    department: [null as number | null, [Validators.required]],
    name_en: ['', [Validators.required, Validators.maxLength(100)]],
    name_ar: ['', [Validators.maxLength(100)]],
    location: [null as number | null, [Validators.required]],
    leads: [[] as number[]],
  });

  ngOnInit(): void {
    this.departmentsApi.dropdown<NamedRef>().subscribe({
      next: (items) => this.departments.set(items),
      error: () => this.departments.set([]),
    });
    this.users.userOptions().subscribe({
      next: (options) => this.userOptions.set(options),
      error: () => this.userOptions.set([]),
    });
    this.locationsApi.dropdown<NamedRef>().subscribe({
      next: (items) => {
        this.locations.set(items);
        this.locationState.set(items.length ? 'ready' : 'empty');
      },
      error: (error: AppError) => this.locationState.set(error.status === 403 ? 'forbidden' : 'error'),
    });
    if (this.id !== null) {
      this.loadTeam(this.id);
    }
  }

  submit(): void {
    if (this.form.invalid || this.saving() || !this.canSave()) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const body: TeamPayload = {
      department: value.department as number,
      name_en: value.name_en.trim(),
      name_ar: value.name_ar.trim() || null,
      location: value.location as number,
      leads: value.leads,
    };
    this.saving.set(true);
    this.formErrors.set([]);
    const request = this.id !== null ? this.api.update(this.id, body) : this.api.create(body);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.notifications.success(this.translate.instant('common.saved'));
        this.goBack();
      },
      error: (error: AppError) => this.onSaveError(error),
    });
  }

  goBack(): void {
    void this.router.navigate(['/company/teams']);
  }

  private loadTeam(id: number): void {
    this.loading.set(true);
    this.api.retrieve(id).subscribe({
      next: (team) => {
        this.form.patchValue({
          department: team.department?.id ?? null,
          name_en: team.name_en,
          name_ar: team.name_ar ?? '',
          location: team.location?.id ?? null,
          leads: (team.leads ?? []).map((lead) => lead.id),
        });
        this.loading.set(false);
      },
      error: (error: AppError) => {
        this.loadError.set(error);
        this.loading.set(false);
      },
    });
  }

  private onSaveError(error: AppError): void {
    this.saving.set(false);
    if (error.status === 0 || error.status === 401 || error.status >= 500) {
      return; // already shown by the global error handling
    }
    this.formErrors.set(applyServerErrors(this.form, error));
    if (Object.keys(error.errors ?? {}).length === 0) {
      this.notifications.error(error.message);
    }
  }
}
```

`src/app/features/company/teams/team-form.component.html`:

```html
<app-page-header
  [title]="isEdit ? 'company.teams.edit' : 'company.teams.new'"
  [showBack]="true"
  backLabel="common.backToList"
  (back)="goBack()"
></app-page-header>

@if (loadError(); as err) {
  <app-error-state [title]="errorTitleKey(err)" [showRetry]="false"></app-error-state>
} @else if (loading()) {
  <app-loading-state></app-loading-state>
} @else {
  <p-card>
    <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-6" novalidate>
      @if (locationState() === 'forbidden' || locationState() === 'empty') {
        <div
          role="status"
          class="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200"
        >
          {{ (locationState() === 'forbidden' ? 'company.teams.locationForbidden' : 'company.teams.locationEmpty') | translate }}
        </div>
      }

      @if (formErrors().length) {
        <div
          role="alert"
          class="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        >
          @for (message of formErrors(); track $index) {
            <p>{{ message }}</p>
          }
        </div>
      }

      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div class="flex flex-col gap-1">
          <label for="name_en" class="text-sm font-medium">{{ 'company.fields.nameEn' | translate }} *</label>
          <input pInputText id="name_en" formControlName="name_en" class="w-full" />
          <app-field-error [control]="form.controls.name_en"></app-field-error>
        </div>

        <div class="flex flex-col gap-1">
          <label for="name_ar" class="text-sm font-medium">{{ 'company.fields.nameAr' | translate }}</label>
          <input pInputText id="name_ar" formControlName="name_ar" dir="rtl" class="w-full" />
          <app-field-error [control]="form.controls.name_ar"></app-field-error>
        </div>

        <div class="flex flex-col gap-1">
          <label for="department" class="text-sm font-medium">{{ 'company.fields.department' | translate }} *</label>
          <p-dropdown
            inputId="department"
            formControlName="department"
            [options]="departmentOptions()"
            optionLabel="label"
            optionValue="value"
            [filter]="true"
            [placeholder]="'common.select' | translate"
            styleClass="w-full"
            appendTo="body"
          ></p-dropdown>
          <app-field-error [control]="form.controls.department"></app-field-error>
        </div>

        <div class="flex flex-col gap-1">
          <label for="location" class="text-sm font-medium">{{ 'company.fields.location' | translate }} *</label>
          <p-dropdown
            inputId="location"
            formControlName="location"
            [options]="locationOptions()"
            optionLabel="label"
            optionValue="value"
            [filter]="true"
            [placeholder]="'common.select' | translate"
            styleClass="w-full"
            appendTo="body"
          ></p-dropdown>
          <app-field-error [control]="form.controls.location"></app-field-error>
        </div>

        <div class="flex flex-col gap-1 md:col-span-2">
          <label for="leads" class="text-sm font-medium">{{ 'company.fields.leads' | translate }}</label>
          <p-multiSelect
            inputId="leads"
            formControlName="leads"
            [options]="userOptions()"
            optionLabel="label"
            optionValue="value"
            [filter]="true"
            display="chip"
            [placeholder]="'common.select' | translate"
            styleClass="w-full"
            appendTo="body"
          ></p-multiSelect>
          <app-field-error [control]="form.controls.leads"></app-field-error>
        </div>
      </div>

      <div class="flex justify-end gap-2">
        <p-button
          type="button"
          [label]="'common.cancel' | translate"
          severity="secondary"
          [outlined]="true"
          (onClick)="goBack()"
        ></p-button>
        <p-button
          type="submit"
          [label]="'common.save' | translate"
          icon="pi pi-check"
          [loading]="saving()"
          [disabled]="saving() || !canSave()"
        ></p-button>
      </div>
    </form>
  </p-card>
}
```

- [ ] **Step 8: Add the routes**

Append to `COMPANY_ROUTES` in `src/app/features/company/company.routes.ts`:

```ts
  {
    path: 'teams',
    loadComponent: () => import('./teams/team-list.component').then((m) => m.TeamListComponent),
    data: { titleKey: 'company.teams.title' },
  },
  {
    path: 'teams/new',
    loadComponent: () => import('./teams/team-form.component').then((m) => m.TeamFormComponent),
    data: { titleKey: 'company.teams.new' },
  },
  {
    path: 'teams/:id/edit',
    loadComponent: () => import('./teams/team-form.component').then((m) => m.TeamFormComponent),
    data: { titleKey: 'company.teams.edit' },
  },
```

- [ ] **Step 9: Run tests and build**

Run: `npx ng test --watch=false --browsers=ChromeHeadless` then `npm run build`
Expected: all pass; build succeeds.

- [ ] **Step 10: Commit**

```bash
git add src/app/features/company/teams src/app/features/company/company.routes.ts
git commit -m "Add team list and form pages" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Users list and form

**Files:**
- Create: `src/app/features/company/users/user-list.component.ts`, `.html`, `.spec.ts`
- Create: `src/app/features/company/users/user-form.component.ts`, `.html`, `.spec.ts`
- Modify: `src/app/features/company/company.routes.ts`

**Interfaces:**
- Consumes: `CompanyUserService` (`all()`, overridden `create()`, `retrieve()`, `update()`, `remove()`), `RoleService.dropdown`, `DepartmentService.dropdown`, `TeamService.dropdown`, `CompanyUser`, `CompanyUserPayload`, `NamedRef`, `SelectOption`; `LocalizedNamePipe`, `localizedName`; `StatusBadgeComponent`; others as Task 6.
- Produces: `UserListComponent` (public `load()`, `edit(row)`, `confirmDelete(row)`, `users` signal), `UserFormComponent` (public `form`, `submit()`, `goBack()`, `isEdit`).
- Note: the company-user list is **not paginated**, so this table pages, sorts and searches in the browser.

- [ ] **Step 1: Write the failing list test**

`src/app/features/company/users/user-list.component.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { Confirmation, ConfirmationService } from 'primeng/api';
import { envelope, errorEnvelope, provideApiTesting } from '../../../testing/api-testing';
import { makeCompanyUser, makeRole } from '../../../testing/company-fixtures';
import { UserListComponent } from './user-list.component';

const URL = '/api/company/v1/company-user/';

describe('UserListComponent', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [UserListComponent], providers: provideApiTesting() }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
  });

  afterEach(() => httpMock.verify());

  function create() {
    const fixture = TestBed.createComponent(UserListComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('loads the full user list without paging params', () => {
    const fixture = create();
    const req = httpMock.expectOne(URL);
    expect(req.request.params.keys().length).toBe(0);
    req.flush(envelope([makeCompanyUser({ role: makeRole(), is_company_admin: true })]));
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Sara Ali');
    expect(text).toContain('sara@acme.example');
    expect(text).toContain('Sales Manager');
  });

  it('shows the forbidden state on 403', () => {
    const fixture = create();
    httpMock.expectOne(URL).flush(errorEnvelope(403, 'Forbidden'), { status: 403, statusText: 'Forbidden' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('common.forbidden');
  });

  it('opens the edit page with the company-user id', () => {
    const fixture = create();
    httpMock.expectOne(URL).flush(envelope([makeCompanyUser()]));
    fixture.componentInstance.edit(makeCompanyUser());
    expect(router.navigate).toHaveBeenCalledWith(['/company/users', 12, 'edit']);
  });

  it('deletes after confirmation and reloads', () => {
    const confirmation = TestBed.inject(ConfirmationService);
    spyOn(confirmation, 'confirm').and.callFake((c: Confirmation) => {
      c.accept?.();
      return confirmation;
    });
    const fixture = create();
    httpMock.expectOne(URL).flush(envelope([makeCompanyUser()]));
    fixture.componentInstance.confirmDelete(makeCompanyUser());
    httpMock.expectOne(`${URL}12/`).flush(null, { status: 204, statusText: 'No Content' });
    httpMock.expectOne(URL).flush(envelope([]));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include=src/app/features/company/users/user-list.component.spec.ts`
Expected: compile error `Cannot find module './user-list.component'`.

- [ ] **Step 3: Write the list component**

`src/app/features/company/users/user-list.component.ts`:

```ts
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { AppError } from '../../../core/errors/app-error';
import { LanguageService } from '../../../core/services/language.service';
import { NotificationService } from '../../../core/services/notification.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { PageHeaderAction, PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { LocalizedNamePipe } from '../../../shared/pipes/localized-name.pipe';
import { errorTitleKey } from '../../../shared/utils/server-errors';
import { CompanyUser } from '../company.models';
import { CompanyUserService } from './company-user.service';

/** The company-user endpoint returns the full list, so paging, sorting and search happen in the table. */
@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [
    TranslatePipe,
    TableModule,
    ButtonModule,
    InputTextModule,
    PageHeaderComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    StatusBadgeComponent,
    LocalizedNamePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './user-list.component.html',
})
export class UserListComponent implements OnInit {
  private readonly api = inject(CompanyUserService);
  private readonly router = inject(Router);
  private readonly confirmation = inject(ConfirmationService);
  private readonly notifications = inject(NotificationService);
  private readonly translate = inject(TranslateService);

  readonly lang = inject(LanguageService).currentLang;
  readonly users = signal<CompanyUser[]>([]);
  readonly loading = signal(false);
  readonly error = signal<AppError | null>(null);
  readonly errorTitleKey = errorTitleKey;
  readonly searchFields = ['user.first_name', 'user.last_name', 'user.email'];

  readonly headerActions: PageHeaderAction[] = [
    {
      label: 'company.users.new',
      icon: 'pi pi-plus',
      onClick: () => void this.router.navigate(['/company/users/new']),
    },
  ];

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.all().subscribe({
      next: (users) => {
        this.users.set(users);
        this.loading.set(false);
      },
      error: (error: AppError) => {
        this.error.set(error);
        this.loading.set(false);
      },
    });
  }

  edit(row: CompanyUser): void {
    void this.router.navigate(['/company/users', row.id, 'edit']);
  }

  confirmDelete(row: CompanyUser): void {
    this.confirmation.confirm({
      key: 'app-confirm',
      header: this.translate.instant('common.confirm'),
      message: this.translate.instant('common.confirmDelete', { name: row.user.email }),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.translate.instant('common.delete'),
      rejectLabel: this.translate.instant('common.cancel'),
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.delete(row),
    });
  }

  private delete(row: CompanyUser): void {
    this.api.remove(row.id).subscribe({
      next: () => {
        this.notifications.success(this.translate.instant('common.deleted'));
        this.load();
      },
      error: (error: AppError) => {
        if (error.status >= 400 && error.status < 500 && error.status !== 401) {
          this.notifications.error(error.message);
        }
      },
    });
  }
}
```

`src/app/features/company/users/user-list.component.html`:

```html
<app-page-header title="company.users.title" [actions]="headerActions"></app-page-header>

@if (error(); as err) {
  <app-error-state [title]="errorTitleKey(err)" [showRetry]="err.status !== 403" (retry)="load()"></app-error-state>
} @else {
  <div class="mb-4">
    <input
      pInputText
      type="search"
      class="w-full sm:w-80"
      [placeholder]="'common.search' | translate"
      (input)="table.filterGlobal($any($event.target).value, 'contains')"
    />
  </div>

  <div class="overflow-x-auto rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
    <p-table
      #table
      [value]="users()"
      [paginator]="true"
      [rows]="10"
      [rowsPerPageOptions]="[10, 25, 50]"
      [globalFilterFields]="searchFields"
      [loading]="loading()"
      dataKey="id"
      styleClass="p-datatable-sm"
    >
      <ng-template pTemplate="header">
        <tr>
          <th pSortableColumn="user.first_name">
            {{ 'company.fields.name' | translate }} <p-sortIcon field="user.first_name"></p-sortIcon>
          </th>
          <th pSortableColumn="user.email">
            {{ 'company.fields.email' | translate }} <p-sortIcon field="user.email"></p-sortIcon>
          </th>
          <th>{{ 'company.fields.role' | translate }}</th>
          <th>{{ 'company.fields.department' | translate }}</th>
          <th>{{ 'company.fields.team' | translate }}</th>
          <th>{{ 'company.fields.companyAdmin' | translate }}</th>
          <th class="text-end">{{ 'common.actions' | translate }}</th>
        </tr>
      </ng-template>
      <ng-template pTemplate="body" let-row>
        <tr>
          <td>{{ row.user.first_name }} {{ row.user.last_name }}</td>
          <td>{{ row.user.email }}</td>
          <td>{{ row.role | localizedName: lang() }}</td>
          <td>{{ row.department | localizedName: lang() }}</td>
          <td>{{ row.team | localizedName: lang() }}</td>
          <td>
            @if (row.is_company_admin) {
              <app-status-badge [value]="'common.yes' | translate" severity="warning"></app-status-badge>
            }
          </td>
          <td class="whitespace-nowrap text-end">
            <p-button
              icon="pi pi-pencil"
              [text]="true"
              [rounded]="true"
              [ariaLabel]="'common.edit' | translate"
              (onClick)="edit(row)"
            ></p-button>
            <p-button
              icon="pi pi-trash"
              severity="danger"
              [text]="true"
              [rounded]="true"
              [ariaLabel]="'common.delete' | translate"
              (onClick)="confirmDelete(row)"
            ></p-button>
          </td>
        </tr>
      </ng-template>
      <ng-template pTemplate="emptymessage">
        <tr>
          <td colspan="7"><app-empty-state icon="pi-users"></app-empty-state></td>
        </tr>
      </ng-template>
    </p-table>
  </div>
}
```

- [ ] **Step 4: Run the list test to verify it passes**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include=src/app/features/company/users/user-list.component.spec.ts`
Expected: `TOTAL: 4 SUCCESS`.

- [ ] **Step 5: Write the failing form test**

`src/app/features/company/users/user-form.component.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { envelope, errorEnvelope, provideApiTesting } from '../../../testing/api-testing';
import { makeCompanyUser, makeDepartment, makeRole } from '../../../testing/company-fixtures';
import { UserFormComponent } from './user-form.component';

const URL = '/api/company/v1/company-user/';
const ROLES_URL = '/api/company/v1/roles/';
const DEPARTMENTS_URL = '/api/company/v1/departments/';
const TEAMS_URL = '/api/company/v1/teams/';

describe('UserFormComponent', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  function setup(id: string | null) {
    TestBed.configureTestingModule({
      imports: [UserFormComponent],
      providers: [
        ...provideApiTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(id ? { id } : {}) } } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    const fixture = TestBed.createComponent(UserFormComponent);
    fixture.detectChanges();
    for (const url of [ROLES_URL, DEPARTMENTS_URL, TEAMS_URL]) {
      httpMock.expectOne((r) => r.url === url && r.params.get('dropdown') === 'true').flush(envelope([]));
    }
    return fixture;
  }

  function fillRequired(fixture: ReturnType<typeof setup>) {
    fixture.componentInstance.form.patchValue({
      email: 'omar@acme.example',
      first_name: 'Omar',
      last_name: 'Hassan',
      password: 'Passw0rd!',
    });
  }

  afterEach(() => httpMock.verify());

  it('requires a password when creating', () => {
    const fixture = setup(null);
    fixture.componentInstance.form.patchValue({ email: 'omar@acme.example', first_name: 'Omar', last_name: 'Hassan' });
    fixture.componentInstance.submit();
    httpMock.expectNone((r) => r.method === 'POST');
    expect(fixture.componentInstance.form.controls.password.hasError('required')).toBeTrue();
  });

  it('creates a user with a nested user object, then re-fetches it', () => {
    const fixture = setup(null);
    fillRequired(fixture);
    fixture.componentInstance.form.patchValue({ role: 3, is_company_admin: true });
    fixture.componentInstance.submit();

    const req = httpMock.expectOne((r) => r.url === URL && r.method === 'POST');
    expect(req.request.body).toEqual({
      user: {
        email: 'omar@acme.example',
        first_name: 'Omar',
        last_name: 'Hassan',
        preferred_name: '',
        phone_number: '',
        password: 'Passw0rd!',
      },
      role: 3,
      department: null,
      team: null,
      is_company_admin: true,
      is_department_manager: false,
      is_team_lead: false,
    });
    req.flush(envelope({ id: 20 }), { status: 201, statusText: 'Created' });
    httpMock.expectOne(`${URL}20/`).flush(envelope(makeCompanyUser({ id: 20 })));

    expect(router.navigate).toHaveBeenCalledWith(['/company/users']);
  });

  it('hides the password and leaves it out when editing', () => {
    const fixture = setup('12');
    httpMock
      .expectOne(`${URL}12/`)
      .flush(envelope(makeCompanyUser({ role: makeRole(), department: makeDepartment(), is_team_lead: true })));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('#password')).toBeNull();
    expect(fixture.componentInstance.form.getRawValue()).toEqual(
      jasmine.objectContaining({ email: 'sara@acme.example', role: 3, department: 5, team: null, is_team_lead: true }),
    );

    fixture.componentInstance.submit();
    const req = httpMock.expectOne((r) => r.url === `${URL}12/` && r.method === 'PATCH');
    expect('password' in req.request.body.user).toBeFalse();
    req.flush(envelope(makeCompanyUser()));
  });

  it('shows a nested user field error under the matching field', () => {
    const fixture = setup(null);
    fillRequired(fixture);
    fixture.componentInstance.submit();

    httpMock
      .expectOne((r) => r.method === 'POST')
      .flush(errorEnvelope(400, 'Unknown error', { user: { email: ['A user with this email already exists.'] } }), {
        status: 400,
        statusText: 'Bad Request',
      });
    fixture.detectChanges();

    expect(fixture.componentInstance.form.controls.email.errors).toEqual({
      serverError: 'A user with this email already exists.',
    });
    expect(fixture.nativeElement.textContent).toContain('A user with this email already exists.');
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include=src/app/features/company/users/user-form.component.spec.ts`
Expected: compile error `Cannot find module './user-form.component'`.

- [ ] **Step 7: Write the form component**

`src/app/features/company/users/user-form.component.ts`:

```ts
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DropdownModule } from 'primeng/dropdown';
import { InputSwitchModule } from 'primeng/inputswitch';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { AppError } from '../../../core/errors/app-error';
import { LanguageService } from '../../../core/services/language.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { FieldErrorComponent } from '../../../shared/components/field-error/field-error.component';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { localizedName } from '../../../shared/pipes/localized-name.pipe';
import { applyServerErrors, errorTitleKey } from '../../../shared/utils/server-errors';
import { CompanyUserPayload, NamedRef, SelectOption } from '../company.models';
import { DepartmentService } from '../departments/department.service';
import { RoleService } from '../roles/role.service';
import { TeamService } from '../teams/team.service';
import { CompanyUserService } from './company-user.service';

/** Server errors arrive nested under "user"; map them to this form's flat controls. */
const USER_FIELD_MAP: Record<string, string> = {
  'user.email': 'email',
  'user.first_name': 'first_name',
  'user.last_name': 'last_name',
  'user.preferred_name': 'preferred_name',
  'user.phone_number': 'phone_number',
  'user.password': 'password',
};

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    ButtonModule,
    CardModule,
    DropdownModule,
    InputSwitchModule,
    InputTextModule,
    PasswordModule,
    PageHeaderComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    FieldErrorComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './user-form.component.html',
})
export class UserFormComponent implements OnInit {
  private readonly api = inject(CompanyUserService);
  private readonly rolesApi = inject(RoleService);
  private readonly departmentsApi = inject(DepartmentService);
  private readonly teamsApi = inject(TeamService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);
  private readonly translate = inject(TranslateService);
  private readonly lang = inject(LanguageService).currentLang;
  private readonly roles = signal<NamedRef[]>([]);
  private readonly departments = signal<NamedRef[]>([]);
  private readonly teams = signal<NamedRef[]>([]);

  readonly id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id')) || null;
  readonly isEdit = this.id !== null;
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly loadError = signal<AppError | null>(null);
  readonly formErrors = signal<string[]>([]);
  readonly roleOptions = computed<SelectOption[]>(() => this.toOptions(this.roles()));
  readonly departmentOptions = computed<SelectOption[]>(() => this.toOptions(this.departments()));
  readonly teamOptions = computed<SelectOption[]>(() => this.toOptions(this.teams()));
  readonly errorTitleKey = errorTitleKey;

  readonly form = inject(NonNullableFormBuilder).group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    first_name: ['', [Validators.required, Validators.maxLength(100)]],
    last_name: ['', [Validators.required, Validators.maxLength(100)]],
    preferred_name: ['', [Validators.maxLength(100)]],
    phone_number: ['', [Validators.maxLength(128)]],
    password: ['', this.isEdit ? [] : [Validators.required, Validators.maxLength(128)]],
    role: [null as number | null],
    department: [null as number | null],
    team: [null as number | null],
    is_company_admin: [false],
    is_department_manager: [false],
    is_team_lead: [false],
  });

  ngOnInit(): void {
    this.rolesApi.dropdown<NamedRef>().subscribe({ next: (r) => this.roles.set(r), error: () => this.roles.set([]) });
    this.departmentsApi
      .dropdown<NamedRef>()
      .subscribe({ next: (d) => this.departments.set(d), error: () => this.departments.set([]) });
    this.teamsApi.dropdown<NamedRef>().subscribe({ next: (t) => this.teams.set(t), error: () => this.teams.set([]) });
    if (this.id !== null) {
      this.loadUser(this.id);
    }
  }

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const user: CompanyUserPayload['user'] = {
      email: value.email.trim(),
      first_name: value.first_name.trim(),
      last_name: value.last_name.trim(),
      preferred_name: value.preferred_name.trim(),
      phone_number: value.phone_number.trim(),
    };
    if (!this.isEdit) {
      user.password = value.password;
    }
    const body: CompanyUserPayload = {
      user,
      role: value.role,
      department: value.department,
      team: value.team,
      is_company_admin: value.is_company_admin,
      is_department_manager: value.is_department_manager,
      is_team_lead: value.is_team_lead,
    };
    this.saving.set(true);
    this.formErrors.set([]);
    const request = this.id !== null ? this.api.update(this.id, body) : this.api.create(body);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.notifications.success(this.translate.instant('common.saved'));
        this.goBack();
      },
      error: (error: AppError) => this.onSaveError(error),
    });
  }

  goBack(): void {
    void this.router.navigate(['/company/users']);
  }

  private toOptions(items: NamedRef[]): SelectOption[] {
    return items.map((item) => ({ value: item.id, label: localizedName(item, this.lang()) }));
  }

  private loadUser(id: number): void {
    this.loading.set(true);
    this.api.retrieve(id).subscribe({
      next: (companyUser) => {
        this.form.patchValue({
          email: companyUser.user.email,
          first_name: companyUser.user.first_name,
          last_name: companyUser.user.last_name,
          preferred_name: companyUser.user.preferred_name ?? '',
          phone_number: companyUser.user.phone_number ?? '',
          role: companyUser.role?.id ?? null,
          department: companyUser.department?.id ?? null,
          team: companyUser.team?.id ?? null,
          is_company_admin: companyUser.is_company_admin,
          is_department_manager: companyUser.is_department_manager,
          is_team_lead: companyUser.is_team_lead,
        });
        this.loading.set(false);
      },
      error: (error: AppError) => {
        this.loadError.set(error);
        this.loading.set(false);
      },
    });
  }

  private onSaveError(error: AppError): void {
    this.saving.set(false);
    if (error.status === 0 || error.status === 401 || error.status >= 500) {
      return; // already shown by the global error handling
    }
    this.formErrors.set(applyServerErrors(this.form, error, USER_FIELD_MAP));
    if (Object.keys(error.errors ?? {}).length === 0) {
      this.notifications.error(error.message);
    }
  }
}
```

`src/app/features/company/users/user-form.component.html`:

```html
<app-page-header
  [title]="isEdit ? 'company.users.edit' : 'company.users.new'"
  [showBack]="true"
  backLabel="common.backToList"
  (back)="goBack()"
></app-page-header>

@if (loadError(); as err) {
  <app-error-state [title]="errorTitleKey(err)" [showRetry]="false"></app-error-state>
} @else if (loading()) {
  <app-loading-state></app-loading-state>
} @else {
  <p-card>
    <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-6" novalidate>
      @if (formErrors().length) {
        <div
          role="alert"
          class="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        >
          @for (message of formErrors(); track $index) {
            <p>{{ message }}</p>
          }
        </div>
      }

      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div class="flex flex-col gap-1">
          <label for="email" class="text-sm font-medium">{{ 'company.fields.email' | translate }} *</label>
          <input pInputText id="email" type="email" formControlName="email" dir="ltr" class="w-full" />
          <app-field-error [control]="form.controls.email"></app-field-error>
        </div>

        @if (!isEdit) {
          <div class="flex flex-col gap-1">
            <label for="password" class="text-sm font-medium">{{ 'company.fields.password' | translate }} *</label>
            <p-password
              inputId="password"
              formControlName="password"
              [feedback]="false"
              [toggleMask]="true"
              autocomplete="new-password"
              styleClass="w-full"
              inputStyleClass="w-full"
            ></p-password>
            <app-field-error [control]="form.controls.password"></app-field-error>
          </div>
        }

        <div class="flex flex-col gap-1">
          <label for="first_name" class="text-sm font-medium">{{ 'company.fields.firstName' | translate }} *</label>
          <input pInputText id="first_name" formControlName="first_name" class="w-full" />
          <app-field-error [control]="form.controls.first_name"></app-field-error>
        </div>

        <div class="flex flex-col gap-1">
          <label for="last_name" class="text-sm font-medium">{{ 'company.fields.lastName' | translate }} *</label>
          <input pInputText id="last_name" formControlName="last_name" class="w-full" />
          <app-field-error [control]="form.controls.last_name"></app-field-error>
        </div>

        <div class="flex flex-col gap-1">
          <label for="preferred_name" class="text-sm font-medium">{{ 'company.fields.preferredName' | translate }}</label>
          <input pInputText id="preferred_name" formControlName="preferred_name" class="w-full" />
          <app-field-error [control]="form.controls.preferred_name"></app-field-error>
        </div>

        <div class="flex flex-col gap-1">
          <label for="phone_number" class="text-sm font-medium">{{ 'company.fields.phone' | translate }}</label>
          <input pInputText id="phone_number" type="tel" formControlName="phone_number" dir="ltr" class="w-full" />
          <app-field-error [control]="form.controls.phone_number"></app-field-error>
        </div>

        <div class="flex flex-col gap-1">
          <label for="role" class="text-sm font-medium">{{ 'company.fields.role' | translate }}</label>
          <p-dropdown
            inputId="role"
            formControlName="role"
            [options]="roleOptions()"
            optionLabel="label"
            optionValue="value"
            [filter]="true"
            [showClear]="true"
            [placeholder]="'common.select' | translate"
            styleClass="w-full"
            appendTo="body"
          ></p-dropdown>
          <app-field-error [control]="form.controls.role"></app-field-error>
        </div>

        <div class="flex flex-col gap-1">
          <label for="department" class="text-sm font-medium">{{ 'company.fields.department' | translate }}</label>
          <p-dropdown
            inputId="department"
            formControlName="department"
            [options]="departmentOptions()"
            optionLabel="label"
            optionValue="value"
            [filter]="true"
            [showClear]="true"
            [placeholder]="'common.select' | translate"
            styleClass="w-full"
            appendTo="body"
          ></p-dropdown>
          <app-field-error [control]="form.controls.department"></app-field-error>
        </div>

        <div class="flex flex-col gap-1">
          <label for="team" class="text-sm font-medium">{{ 'company.fields.team' | translate }}</label>
          <p-dropdown
            inputId="team"
            formControlName="team"
            [options]="teamOptions()"
            optionLabel="label"
            optionValue="value"
            [filter]="true"
            [showClear]="true"
            [placeholder]="'common.select' | translate"
            styleClass="w-full"
            appendTo="body"
          ></p-dropdown>
          <app-field-error [control]="form.controls.team"></app-field-error>
        </div>
      </div>

      <div class="flex flex-col gap-3 sm:flex-row sm:gap-8">
        <div class="flex items-center gap-3">
          <p-inputSwitch inputId="is_company_admin" formControlName="is_company_admin"></p-inputSwitch>
          <label for="is_company_admin" class="text-sm font-medium">{{ 'company.fields.companyAdmin' | translate }}</label>
        </div>
        <div class="flex items-center gap-3">
          <p-inputSwitch inputId="is_department_manager" formControlName="is_department_manager"></p-inputSwitch>
          <label for="is_department_manager" class="text-sm font-medium">
            {{ 'company.fields.departmentManager' | translate }}
          </label>
        </div>
        <div class="flex items-center gap-3">
          <p-inputSwitch inputId="is_team_lead" formControlName="is_team_lead"></p-inputSwitch>
          <label for="is_team_lead" class="text-sm font-medium">{{ 'company.fields.teamLead' | translate }}</label>
        </div>
      </div>

      <div class="flex justify-end gap-2">
        <p-button
          type="button"
          [label]="'common.cancel' | translate"
          severity="secondary"
          [outlined]="true"
          (onClick)="goBack()"
        ></p-button>
        <p-button
          type="submit"
          [label]="'common.save' | translate"
          icon="pi pi-check"
          [loading]="saving()"
          [disabled]="saving()"
        ></p-button>
      </div>
    </form>
  </p-card>
}
```

- [ ] **Step 8: Add the routes**

Append to `COMPANY_ROUTES` in `src/app/features/company/company.routes.ts`:

```ts
  {
    path: 'users',
    loadComponent: () => import('./users/user-list.component').then((m) => m.UserListComponent),
    data: { titleKey: 'company.users.title' },
  },
  {
    path: 'users/new',
    loadComponent: () => import('./users/user-form.component').then((m) => m.UserFormComponent),
    data: { titleKey: 'company.users.new' },
  },
  {
    path: 'users/:id/edit',
    loadComponent: () => import('./users/user-form.component').then((m) => m.UserFormComponent),
    data: { titleKey: 'company.users.edit' },
  },
```

- [ ] **Step 9: Run tests and build**

Run: `npx ng test --watch=false --browsers=ChromeHeadless` then `npm run build`
Expected: all pass; build succeeds.

- [ ] **Step 10: Commit**

```bash
git add src/app/features/company/users src/app/features/company/company.routes.ts
git commit -m "Add user list and form pages" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Verification against the real backend

**Files:**
- Possibly modify: `src/app/features/company/company.models.ts` and the affected component if an open point differs.
- Modify: `docs/superpowers/specs/2026-10-07-company-organisation-design.md` (record the answers under *Open points*).

**Interfaces:**
- Consumes: everything above; the running backend at `http://localhost:8000` via the dev proxy at `http://localhost:4200`.
- Produces: a verified Step 4.

- [ ] **Step 1: Full test suite and build**

Run: `npx ng test --watch=false --browsers=ChromeHeadless` then `npm run build`
Expected: all tests pass, build succeeds with no new warnings.

- [ ] **Step 2: Get a company-admin login**

Ask the user for a company-admin account, or — only with the user's explicit OK — seed the backend's test data:

```bash
cd D:/tanzim/backend/Tanzim && python setup_data.py
```

Then log in at `http://localhost:4200/auth/login`. Do not paste credentials into chat.

- [ ] **Step 3: Check the open points with real requests**

In the browser (DevTools → Network, or `read_network_requests`):
1. Create a department with a parent, and a permission inside a group; open `GET /api/company/v1/departments/{id}/` and `GET /api/company/v1/permissions/{id}/`. Record the real shape of `parent` and `groups`. If it differs from `{ id, name_en }`, update `NamedRef` usage in `company.models.ts` and the list/form that reads it, with a failing test first.
2. Edit a user and save without a password. The `PATCH /api/company/v1/company-user/{id}/` must return 200. If it returns 400 for the nested `user`, record the message and adjust the payload (test first).
3. Create a user. Check whether `POST /api/company/v1/company-user/` returns an `id` (either path is already handled; record which one runs).
4. Type in the Permissions search box. If `?search=` returns 500 (the docs list `name_en`/`name_ar` as search fields, which permissions don't have), remove the search box from the Permissions list (test first) and add a line to the spec's Known issues.

- [ ] **Step 4: Walk every screen**

For each of Users, Departments, Teams, Roles, Permission groups, Permissions: create, edit, search, sort (paginated lists), page, delete. Also:
- switch to Arabic: labels translated, layout RTL, sidebar chevron points left, Arabic names shown in pickers;
- mobile width (375 px): sidebar group in the drawer, tables scroll horizontally, forms one column;
- Teams form with no locations / no Locations module shows the right message and Save stays disabled.

- [ ] **Step 5: Record results and commit**

Write the answers to the three open points (and the search finding) at the end of the spec, then:

```bash
git add docs/superpowers/specs/2026-10-07-company-organisation-design.md src/app/features/company
git commit -m "Verify Company & Organisation against the backend" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
