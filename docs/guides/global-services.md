# الـ Global Services: لوجيك متكرر بقى في مكان واحد

دليل للمذاكرة للمرحلة التانية من خطة الـ refactor. البرانش: `refactor/global-services` (مبني على `chore/safety-net`).

## القاعدة

نعمل service أو helper مشترك **بس** لما نفس اللوجيك بالظبط يتكرر في 3 أماكن أو أكتر (مكتوبة في
`docs/ARCHITECTURE.md`). التشابه بس مش كفاية. الجرد طلّع 4 حاجات بتعدّي القاعدة دي:

| اللوجيك | كان متكرر | بقى فين |
|---|---|---|
| تحميل قوايم الـ dropdown | كل picker بيطلب القايمة من الأول كل مرة (38 مكان) | `OptionsCache` + `CrudApi.dropdown()` |
| عنوان شاشة الخطأ (404 / 403 / غيره) | `readonly errorTitleKey = errorTitleKey` + `[title]="errorTitleKey(err)"` في 90 شاشة | `<app-error-state [error]="err">` |
| تنسيق التاريخ | `date: 'yyyy-MM-dd HH:mm'` مع `? … : '—'` في 21 مكان | pipe اسمه `appDate` |
| اسم ملف التصدير | `` `${x}_${new Date().toISOString().slice(0, 10)}.xlsx` `` في 5 أماكن | `datedFileName(base, ext)` |

---

## 1. كاش الـ dropdowns: `OptionsCache`

**الملف:** `src/app/core/api/options-cache.ts`

### القواعد (اللي انت حددتها)

1. أي قايمة dropdown (`?dropdown=true`) بتتحفظ **5 دقايق بالكتير** (`OPTIONS_CACHE_TTL_MS`).
2. أي **إضافة أو تعديل أو حذف** ناجح على نفس الحاجة بيمسح الكاش بتاعها **فورًا**، حتى لو الـ 5 دقايق ماخلصوش.

### إزاي اتعمل

```
الشاشة → brandsApi.dropdown() → CrudApi.dropdown() → OptionsCache.get(path, filters, load)
                                                          ├─ موجود ولسه صالح؟ ← يرجّعه من غير طلب
                                                          └─ لأ ← يطلب مرة واحدة ويحفظه 5 دقايق

أي POST / PUT / PATCH / DELETE ناجح ← BaseApiService ← OptionsCache.invalidate(path)
```

- **مفيش شاشة اتغيّرت عشان الكاش.** كل الـ pickers أصلًا بتنادي `CrudApi.dropdown()`، فالكاش اتعمل جوّاها.
- **المسح بيحصل في `BaseApiService`** (الأب بتاع كل الـ services)، مش في كل شاشة. أي كتابة ناجحة على
  `inventory/v1/brand/3/` أو `inventory/v1/brand/import/` أو `inventory/v1/brand/` بتمسح كل قوايم
  `inventory/v1/brand/` (بكل الفلاتر). يعني الإضافة، والتعديل، والحذف، والاستيراد، والأكشنز الخاصة
  (`sales-order/5/confirm/`) كلهم بيمسحوا.
- **الكتابة اللي فشلت مابتمسحش** حاجة (القايمة ماتغيّرتش).
- **كل فلتر ليه كاش لوحده**: `zone/?warehouse=1` غير `zone/?warehouse=2`.
- **طلب واحد بس في نفس الوقت**: لو شاشتين طلبوا نفس القايمة قبل ما الرد يرجع، بيستنوا نفس الطلب.
- **الطلب اللي فشل مابيتحفظش**، فالمحاولة الجاية بتطلب من جديد.

### الحالات الخاصة

| الحالة | الحل |
|---|---|
| كتابة على حاجة بتغيّر قايمة حاجة تانية | جدول `ALSO_CHANGES` في نفس الملف. دلوقتي: دفعة لمورد أو إشعار مدين بيمسحوا قايمة "فواتير المورد المفتوحة" |
| تاب تاني في نفس المتصفح عمل تعديل | `BroadcastChannel` اسمه `tanzim.options-cache`: كل تاب بيبلّغ التابات التانية بالـ path اللي اتكتب عليه |
| مستخدم تاني عمل تعديل من جهازه | مفيش طريقة نعرف؛ الحد الأقصى 5 دقايق هو اللي بيحمي |
| خروج أو دخول بيوزر تاني | الكاش كله بيتمسح (القوايم بتاعة شركة معينة) |

### لو ضفت حاجة جديدة

- service جديدة بتورث `CrudApi`: الكاش شغال عليها لوحده.
- كتابة على حاجة بتأثر على قايمة حاجة تانية: زوّد سطر في `ALSO_CHANGES`.

### التستات

`options-cache.spec.ts` (الوقت، الفلاتر، الطلب المشترك، الفشل، المسح، الأكشنز، العلاقات، تغيير اليوزر، التابات) و
`crud-api.spec.ts` (القايمة بتتحفظ، وبتتطلب تاني بعد create / update / remove، ومابتتمسحش لو الكتابة فشلت).

---

## 2. شاشة الخطأ: `<app-error-state [error]="err">`

**الملف:** `src/app/shared/components/error-state/error-state.component.ts`

قبل:
```ts
readonly errorTitleKey = errorTitleKey;   // في كل شاشة
```
```html
<app-error-state [title]="errorTitleKey(err)" ...>
```
بعد:
```html
<app-error-state [error]="err" ...>
```

الكومبوننت بيختار العنوان من الـ status لوحده: 404 ← "مش موجود"، 403 ← "مالكش صلاحية"، غير كده ← "حصل خطأ".
`[title]` لسه موجود للحالات اللي مافيهاش خطأ HTTP. شاشتين بس فضلوا بيستخدموا `errorTitleKey` لأنهم بيكتبوا العنوان
كنص عادي مش في panel (`record-history`، `signed-in-devices`).

---

## 3. التاريخ: `appDate`

**الملف:** `src/app/shared/pipes/app-date.pipe.ts`

```html
{{ order.approved_at | appDate }}            <!-- 2026-10-16 09:05 -->
{{ rma.requested_date | appDate: 'date' }}   <!-- 2026-10-16 -->
{{ row.timestamp | appDate: 'seconds' }}     <!-- 2026-10-16 09:05:07 -->
{{ null | appDate }}                         <!-- — -->
```

- الأشكال التلاتة متعرّفة في مكان واحد (`FORMATS`). لو حبيت تغيّر شكل التاريخ في الموقع كله، بتغيّره هنا.
- القيمة الفاضية بتطلع "—" لوحدها، فمش محتاج تكتب `x ? (x | date: …) : '—'`.
- الأرقام إنجليزي في اللغتين، والتاريخ بيتعرض جوّه `dir="ltr"` زي ما كان.

---

## 4. اسم ملف التصدير: `datedFileName`

**الملف:** `src/app/shared/utils/save-file.ts`

```ts
saveFile(blob, datedFileName('stock', 'xlsx'));                  // stock_2026-10-16.xlsx
saveFile(blob, datedFileName('stock', 'xlsx', this.asOfDate));   // بتاريخ معين
```

**صلّحت معاه bug صغير:** الكود القديم كان بيستخدم `toISOString()`، وده بيدّي تاريخ اليوم بتوقيت UTC. يعني تصدير
الساعة 1 بالليل في القاهرة كان بياخد تاريخ امبارح. دلوقتي بياخد اليوم بتوقيت المستخدم.

---

## الكوميتات

| الكوميت | الخطوة |
|---|---|
| `feat(api): cache dropdown lists for 5 minutes, drop them on any write` | الكاش |
| `refactor(errors): error panels take the error and title themselves` | شاشة الخطأ |
| `refactor(shared): one date pipe and one dated export file name` | التاريخ واسم الملف |
