# الـ UI Components: المكتبة في مكان واحد

دليل للمذاكرة للمرحلة التالتة من خطة الـ refactor. البرانش: `refactor/ui-components` (مبني على `refactor/global-services`).

## الفكرة

قبل كده كل شاشة كانت بتستخدم PrimeNG مباشرة (`<p-button>`، `<p-select>`…). يعني لو حبينا نحدّث المكتبة أو نغيّرها،
لازم نعدّل 134 ملف. دلوقتي:

```
الشاشة → <app-button> / <app-select> / … (src/app/shared/ui) → PrimeNG
```

الـ wrapper جواه PrimeNG عادي. التحديث أو التغيير بيحصل جوّه `src/app/shared/ui` بس، والشاشات ماتتلمسش.

## اللي اتعمل بالترتيب

| الخطوة | التفاصيل |
|---|---|
| 1. Design tokens | دوران الأركان والظلال والخط بقوا CSS variables في `src/styles.scss` |
| 2. الـ wrappers | 7 components في `src/app/shared/ui/` بتستخدم PrimeNG جوّاها |
| 3. موديول `/ui` | صفحة لكل component بكل أشكاله، في نسخة التطوير بس |
| 4. تحويل الشاشات | 250 زرار، 91 select، 59 كارت، 56 جدول، 34 toggle، 19 dialog، 7 multi-select، 5 password |
| 5. قاعدة lint | بتمنع import من PrimeNG للحاجات اللي اتعملها wrapper، برّه `shared/ui` |

---

## 1. Design tokens

**الملف:** `src/styles.scss` (أول `:root`)

```css
--app-radius-sm / --app-radius / -md / -lg / -xl / -2xl   /* دوران الأركان */
--app-shadow-sm / --app-shadow / -md / -lg                 /* الظلال */
--app-font                                                 /* الخط (العربي الأول لما اللغة عربي) */
```

- كلاسات Tailwind (`rounded-xl`، `shadow-sm`، `font-sans`) بقت بتقرا من المتغيرات دي (`tailwind.config.js`)،
  والقيم هي نفس قيم Tailwind الافتراضية، فالشكل ماتغيّرش.
- PrimeNG بيقرا نفس المتغيرات لدوران الأركان (`core/theme/tanzim-preset.ts`). الفرق الوحيد: PrimeNG كان بيستخدم px،
  دلوقتي نفس مقياس Tailwind (يعني 6px بقت 5.25px على حجم خط 14px). فرق مش ملحوظ.
- **ريديزاين = تغيير قيم هنا**، مش لف على الشاشات.

---

## 2. الـ wrappers

**الفولدر:** `src/app/shared/ui/` (كل component في فولدر لوحده، `.ts` + `.html` + spec)

قبل ما أكتبهم عدّيت كل الـ attributes المستخدمة فعلًا في المشروع، والـ wrapper بيعرض **اللي الشاشات محتاجاه بس**،
مش كل خصائص PrimeNG. لو عرضنا كل حاجة، هنبقى ربطنا نفسنا بالمكتبة تاني من ورا الـ wrapper.

### `app-button`

```html
<app-button
  [label]="'common.save' | translate"
  icon="pi pi-check"
  severity="danger"          <!-- primary (الافتراضي) | secondary | success | info | warn | danger | help | contrast -->
  variant="outlined"         <!-- solid (الافتراضي) | outlined | text -->
  size="small"               <!-- small | large -->
  type="submit"              <!-- button (الافتراضي) | submit -->
  [loading]="saving()"
  [disabled]="form.invalid"
  [rounded]="true"
  width="mobile"             <!-- auto (الافتراضي) | always: عرض كامل | mobile: عرض كامل على الموبايل بس -->
  [flipIconInRtl]="true"     <!-- يقلب سهم الأيقونة في العربي -->
  [ariaLabel]="…"            <!-- لازم لو زرار أيقونة بس -->
  class="sm:ms-auto"         <!-- كلاسات المكان على العنصر نفسه -->
  (clicked)="save()"
></app-button>
```

### `app-select` و `app-multi-select`

بيشتغلوا مع `formControlName` أو `ngModel` زي أي input (معمولين `ControlValueAccessor`).

```html
<app-select
  formControlName="warehouse"
  [options]="warehouses()"
  optionLabel="name"
  optionValue="id"
  inputId="warehouse"
  [filter]="true"
  [showClear]="true"
  [placeholder]="'common.select' | translate"
  [translateLabels]="true"       <!-- لو الـ label عبارة عن translation key -->
  class="sm:w-56"                <!-- بيملا العرض؛ حط العرض على العنصر -->
  (changed)="onWarehouseChange($event)"   <!-- القيمة نفسها، مش event -->
></app-select>
```

- **شكل مخصص للاختيار:** `<ng-template appSelectItem let-option>` (في القايمة)، `appSelectSelected` (في الخانة المقفولة)،
  `appSelectGroup` (عنوان المجموعة لما `[group]="true"`).
- `app-multi-select` قيمته array، وفيه `maxSelectedLabels` و `selectedItemsLabel` و `display="chip"`.
- **ليه `(changed)` نوعه `any`:** القيمة جاية من `optionValue`، والـ template مايقدرش يعرف نوعها. ده نفس اللي المكتبة
  كانت بتعمله، وكل handler بيكتب النوع اللي مستنيه.

### `app-toggle` و `app-password`

```html
<app-toggle inputId="is_active" formControlName="is_active"></app-toggle>
<app-password inputId="password" formControlName="password" autocomplete="new-password"></app-password>
```

### `app-card`

```html
<app-card class="lg:col-span-2">…</app-card>
```

### `app-dialog`

```html
<app-dialog [(visible)]="open" [header]="'…' | translate" width="28rem" [dismissable]="true" (shown)="focus()">
  …المحتوى…
  <ng-template appDialogFooter>
    <app-button …></app-button>
  </ng-template>
</app-dialog>
```

- `width` هو العرض على الشاشات الكبيرة، وعمره ما يعدّي عرض الشاشة (هامش 2rem).
- من غير `appDialogFooter` مفيش مساحة footer فاضية.
- `position="top"`، `[flush]="true"` (من غير padding)، `panelClass` (كلاسات لحالة خاصة زي الـ command palette).

### `FormControlBase`

`src/app/shared/ui/form-control.ts`: الكود المشترك بين الـ 4 form controls (`writeValue`، `registerOnChange`،
`setDisabledState`…). لو عملت form control جديد، ورّثه منها.

---

## 3. موديول `/ui` (للتطوير بس)

افتح `ng serve` وروح على **`http://localhost:4200/ui`**. مش محتاج تسجيل دخول ولا باك إند.

| الصفحة | فيها |
|---|---|
| Buttons | كل severity × variant، الأحجام، loading/disabled، أزرار الأيقونة، العرض، الـ RTL |
| Cards | كارت عادي، وفي grid |
| Selects | في form، labels مترجمة، شكل مخصص، مجموعات، multi-select |
| Toggles & passwords | مع الـ form، disabled |
| Dialogs | عادي، بـ footer، عريض، فوق |

- فوق فيه زرار للعربي (RTL) وللـ dark mode.
- تحت كل مثال فيه الكود اللي تنسخه.
- **مش موجود في الموقع المنشور خالص:** الـ production build بيبدّل `ngDevMode` بـ `false`، فالـ route وكود الموديول
  كله بيتشال من الـ bundle (اتأكدت من الـ dist).
- تستات E2E (`e2e/ui-gallery.spec.ts`) بتفتح كل صفحة وتتأكد إن مفيش errors.

---

## 4. تحويل الشاشات

اتعمل بـ script بيقرا كل template ويحوّل الـ attributes (مثلًا `[outlined]="true"` ← `variant="outlined"`،
`(onClick)` ← `(clicked)`، `styleClass="w-full sm:w-auto"` ← `width="mobile"`)، ويعدّل الـ imports في الـ component.
كل نوع اتعمله كوميت لوحده بعد البيلد واللينت والتستات.

**حاجات لقيتها وأنا بحوّل:**
- 7 components كانوا بيعملوا import لـ `MultiSelectModule` أو `ButtonModule` من غير ما يستخدموهم. اتشالوا.
- 5 أماكن مكتوب فيها `<p-multiSelect>` (camelCase)، فاتحوّلوا لوحدهم.
- **الـ barrel (`shared/ui/index.ts`) اتشال:** الـ import من ملف واحد بيجمع كل الـ wrappers كان بيدخّل كل الـ
  wrappers في أي bundle بيستخدم واحد منهم. الـ command palette اللي في الهيدر كبّر أول تحميل من 977 KB لـ 1.26 MB.
  دلوقتي كل شاشة بتعمل import من ملف الـ wrapper نفسه (`shared/ui/button/button.component`)، وأول تحميل رجع 979 KB.

---

## 5. قاعدة الـ lint

في `eslint.config.js`: أي ملف برّه `src/app/shared/ui` يعمل import من `primeng/button` أو `card` أو `dialog` أو
`multiselect` أو `password` أو `select` أو `toggleswitch` ← خطأ، والرسالة بتقولك تستخدم أنهي wrapper.

لما نعمل wrapper جديد (الجدول الجاي)، بنزوّد سطره في القايمة دي.

---

## 6. الجدول: `app-table`

**الفولدر:** `src/app/shared/ui/table/`

الجدول كان مختلف عن الباقي: كل شاشة كانت حاطة جوّه الـ template حاجات من PrimeNG
(`pSortableColumn`، `<p-sortIcon>`، `<p-tableCheckbox>`، `pTemplate`)، وكلها بتقرا حالتها من جدول PrimeNG نفسه.
فعملت جدول ليه **الترتيب والتحديد بتوعه هو**، والشاشات بقت بتكتب الـ `<th>` والـ `<td>` بتوعها بس.

### نوعين

```html
<!-- 1. ServerTable: الصفحات والترتيب والتحديد من السيرفر (35 قايمة) -->
<app-table [table]="table">
  <ng-template appTableHeader>
    <tr>
      <th class="w-12"><app-table-select-all></app-table-select-all></th>
      <th appSortable="name">{{ 'fields.name' | translate }}</th>
    </tr>
  </ng-template>
  <ng-template appTableRow let-row>
    <tr>
      <td><app-table-row-select [row]="row"></app-table-row-select></td>
      <td>{{ row.name }}</td>
    </tr>
  </ng-template>
  <ng-template appTableEmpty><tr><td colspan="2">…</td></tr></ng-template>
</app-table>

<!-- 2. صفوف في الذاكرة (بنود المستندات، المستخدمين، المخزون) -->
<app-table [rows]="users()" [paginate]="true" sortField="name" [filterText]="search()" [filterFields]="['name', 'email']">
  …
  <ng-template appTableFooter><tr>…الإجمالي…</tr></ng-template>
</app-table>
```

| الحاجة | بتعمل إيه |
|---|---|
| `th[appSortable]="field"` | ضغطة (أو Enter/Space) ترتّب تصاعدي ثم تنازلي، والأيقونة و `aria-sort` بيوضحوا الاتجاه. مع ServerTable الترتيب بيروح للسيرفر (`ordering`) ويرجع لأول صفحة |
| `app-table-select-all` / `app-table-row-select` | التحديد بيتحفظ في `table.selection()` بتاع الـ ServerTable (ونفس الـ `dataKey`) |
| `[paginate]`, `[pageSize]`, `[pageSizes]` | للصفوف اللي في الذاكرة. `[pageSizes]="[]"` يخفي اختيار عدد الصفوف |
| `sortField` / `[sortOrder]` | الترتيب اللي يبدأ بيه |
| `[filterText]` + `[filterFields]` | بحث في الصفوف اللي في الذاكرة (بيدعم `user.email`) |

**الترتيب في الذاكرة:** الأرقام كأرقام (حتى لو جاية نص زي `"12.50"`)، والنص بترتيب حروف المستخدم، والفاضي في الآخر.

**`ServerTable` اتغيّر حاجة صغيرة:** بقى بياخد نوع حدث بتاعه (`TablePageEvent`) بدل نوع PrimeNG، فـ
`shared/table` مابقاش معتمد على المكتبة.

### التحويل

| قبل | بعد |
|---|---|
| `<p-table [value]="table.rows()" [lazy]="true" … 15 attribute>` | `<app-table [table]="table">` |
| `<p-table [value]="lines" …>` | `<app-table [rows]="lines">` |
| `pTemplate="header"` / `"body"` / `"emptymessage"` / `"footer"` | `appTableHeader` / `appTableRow` / `appTableEmpty` / `appTableFooter` |
| `pSortableColumn="x"` + `<p-sortIcon field="x">` | `appSortable="x"` |
| `<p-tableHeaderCheckbox>` / `<p-tableCheckbox [value]="row">` | `<app-table-select-all>` / `<app-table-row-select [row]="row">` |
| شاشة المستخدمين: `table.filterGlobal(…)` | `[filterText]="appliedSearch()"` |

56 جدول في 54 ملف اتحوّلوا، والتستات كلها عدّت من غير تعديل.

## اللي لسه برّه الـ wrappers

حاجات PrimeNG تانية لسه مستخدمة مباشرة ومش في الخطة دي: `pInputText`/`pTextarea` على الـ inputs، `p-drawer`،
`p-menu`، `p-popover`، `p-selectbutton`، `p-tabs`، `p-toast`، `p-confirmdialog`، `p-iconfield`، `p-checkbox`
(جوّه الجدول بس). لما يتعمل لأي واحد فيهم wrapper، بنزوّد سطره في قاعدة الـ lint.

## الكوميتات

| الكوميت | الخطوة |
|---|---|
| `feat(theme): design tokens for corners, shadows and font` | الـ tokens |
| `feat(ui): wrapper components for button, card, select, …` | الـ wrappers |
| `feat(ui): /ui component gallery for development builds` | موديول `/ui` |
| `refactor(ui): screens use app-card …` | الكروت |
| `refactor(ui): screens use app-toggle, app-password and app-multi-select` | الـ form controls |
| `refactor(ui): screens use app-select …` | الـ selects |
| `refactor(ui): screens use app-dialog; import wrappers per file` | الـ dialogs وشيل الـ barrel |
| `refactor(ui): screens use app-button …` | الأزرار |
| `chore(lint): forbid the wrapped PrimeNG modules outside shared/ui` | قاعدة الـ lint |
| `feat(ui): app-table wrapper with its own sorting and selection` | الجدول |
| `refactor(ui): screens use app-table …` | تحويل الجداول + الـ lint |
