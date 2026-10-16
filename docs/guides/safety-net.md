# شبكة الأمان: الـ Lint والتستات والـ CI

دليل للمذاكرة: كل أداة اتضافت في المرحلة الأولى من خطة الـ refactor، بتعمل إيه، وليه، وإزاي تشغّلها وتزوّد عليها.
البرانش: `chore/safety-net`.

## الصورة الكبيرة

قبل ما نغيّر حاجات كبيرة في المشروع (global services، الـ UI components)، محتاجين حاجة تقولنا **فورًا** لو كسرنا
حاجة. شبكة الأمان دي أربع طبقات، من الأسرع للأبطأ:

| الطبقة | بتمسك إيه | الأمر | بتاخد قد إيه |
|---|---|---|---|
| ESLint | أخطاء في الكود نفسه قبل ما يشتغل: imports مش مستخدمة، كود ميت، مشاكل accessibility في الـ HTML | `npm run lint` | ثواني |
| تستات الوحدة (Karma + Jasmine) | لوجيك كل service و component لوحده | `npx ng test --watch=false` | دقيقة تقريبًا |
| تست تطابق الترجمة | key موجود في `en.json` ومش في `ar.json` أو العكس | جزء من تستات الوحدة | جزء من الثانية |
| تستات E2E (Playwright) | الموقع كله شغال في متصفح حقيقي: دخول، قايمة، فورم، لغة، دردشة | `npm run e2e` | نص دقيقة تقريبًا |

والـ **CI** بيشغّل الأربعة دول أوتوماتيك على GitHub مع كل PR، والـ **Deploy** بينشر الموقع لوحده بعد ما الـ CI ينجح على `main`.

---

## 1. ESLint

### هو إيه

أداة بتقرا الكود من غير ما تشغّله، وبتطلّع المشاكل اللي ليها قواعد معروفة. ركّبناها بـ `angular-eslint` (نسخة 21
عشان تمشي مع Angular 21؛ نسخة 22 بتاعة Angular 22).

### الملفات

- `eslint.config.js`: القواعد.
  - لملفات `.ts`: القواعد المقترحة من ESLint و TypeScript و Angular.
  - لملفات `.html`: قواعد الـ templates وقواعد الـ accessibility (مثلًا: أي `<label>` لازم يبقى مربوط بـ input).
- `angular.json`: target اسمه `lint` بيفحص `src/**/*.ts` و `src/**/*.html`.
- `package.json`: سكريبت `"lint": "ng lint"`.

### إعدادات خاصة بالمشروع (ومكتوب جنبها السبب)

- **`no-unused-vars`**: الأسماء اللي بتبدأ بـ `_` مسموح تفضل مش مستخدمة، وكمان الـ rest siblings. ده عشان الحالة دي:
  ```ts
  const { id: _, ...rest } = row; // شيلنا id عن قصد
  ```
- **`label-has-associated-control`**: عرّفنا له إن `p-toggleswitch` و `p-inputnumber` و `p-select`… كلها form controls،
  عشان `<label>` اللي جواه واحد منهم مايتحسبش غلط.

### اللي اتصلّح في الكود (47 مشكلة)

| المشكلة | العدد | اتعمل إيه |
|---|---|---|
| `Array<T>` بدل `T[]` | 19 | اتصلّحت أوتوماتيك بـ `--fix` |
| imports مش مستخدمة (`tick`، `errorEnvelope`) | 16 | اتشالت |
| دالة `today()` مش مستخدمة في فورم أمر البيع | 1 | اتشالت |
| expression لوحده في effect الدردشة (`this.auth.user()?.id;`) | 1 | بقى الـ effect بيقارن key فيه رقم اليوزر، وده كمان صلّح ملحوظة قديمة: اليوزر نفسه لو اتعمله تسجيل دخول تاني ماتتمسحش الدردشة |
| options بتاعة الـ command palette بتتضغط بالماوس بس | 4 | **مش غلط**: الكيبورد شغال من خانة البحث (نمط `aria-activedescendant`)، فعطّلنا القاعدة للسطرين دول بتعليق بيشرح السبب |

### إزاي تستخدمه

```bash
npm run lint
```

لو طلع خطأ:
1. جرّب التصليح الأوتوماتيك: `npx eslint src --fix`
2. اللي فاضل صلّحه بإيدك.
3. لو القاعدة غلط في حالة معينة: `// eslint-disable-next-line <اسم القاعدة>` في الـ `.ts`، أو
   `<!-- eslint-disable-next-line <اسم القاعدة> -->` في الـ `.html`، **ومعاها تعليق بيقول ليه**.

---

## 2. تست تطابق الترجمة

### الملف

`src/app/i18n-parity.spec.ts`

### بيعمل إيه

1. بيحمّل `en.json` و `ar.json` من `/assets/i18n/` (نفس الطريقة اللي الموقع بيحمّلهم بيها؛ Karma بيقدّم فولدر `assets`).
2. بيحوّل كل ملف لقايمة keys بالنقط: `{"chat": {"note": {"readOnly": "…"}}}` ← `chat.note.readOnly`.
3. بيفشل لو فيه key في واحد ومش في التاني، **وبيطبع أسماء الـ keys الناقصة**:
   ```
   missing in ar.json: Expected [ 'chat.newThing' ] to equal [ ].
   ```

### ليه

key ناقص في ملف بيظهر للمستخدم كنص خام (`chat.newThing`) في اللغة دي. التست ده بيمسكه قبل ما يتنشر.

---

## 3. تستات E2E بـ Playwright

### الفكرة

Playwright بيفتح Chromium حقيقي، ويشغّل الموقع، ويضغط ويكتب زي المستخدم بالظبط. **بس من غير باك إند**: كل طلب لـ
`/api/` والـ WebSocket بيترد عليهم جوه المتصفح من بيانات ثابتة. عشان كده التستات تشتغل في أي مكان، حتى على GitHub.

### الملفات

| الملف | دوره |
|---|---|
| `playwright.config.ts` | بيشغّل `ng serve` على port 4300 لوحده، Chromium بس، وبيحفظ trace وصورة لو تست فشل |
| `e2e/support/mock-api.ts` | الأدوات المشتركة (تحت) |
| `e2e/auth.spec.ts` | تسجيل الدخول: ناجح ← الداشبورد، باسورد غلط ← رسالة السيرفر |
| `e2e/brands.spec.ts` | قايمة الماركات: البحث بيبعت `?search=`، وإضافة ماركة من الـ dialog بتحدّث القايمة |
| `e2e/language.spec.ts` | العربي بيقلب الصفحة `dir="rtl"` |
| `e2e/chat.spec.ts` | الدردشة: رسالة بتتبعت **مرة واحدة** حتى لو الـ socket رجّعها قبل رد الـ POST، ورسالة جاية من حد تاني بتظهر لايف |

### الأدوات في `mock-api.ts`

- **`MockApi`**: بيعترض كل `/api/**`.
  - `api.on('GET', 'inventory/v1/brand/', envelope([...]))` ← رد ثابت.
  - `api.on('POST', 'login/', (route) => route.fulfill({...}))` ← رد بلوجيك (مثلًا خطأ 400).
  - أي طلب مالوش رد متسجّل بياخد رد نجاح فاضي (`[]` للـ GET)، عشان الحاجات الجانبية (الداشبورد مثلًا) ماتوقعش التست.
  - `api.last('POST', 'inventory/v1/brand/')?.body` ← تتأكد إن الطلب اتبعت صح.
- **`MockSocket`**: بيعترض الـ WebSocket بتاع الإشعارات. `socket.push({ type: 'chat.message', … })` بيبعت frame للصفحة.
- **`signIn(page, api)`**: بيدخّلك من غير فورم الدخول: بيحط tokens في `localStorage` (JWT من غير توقيع، لأن الموقع
  بيعمل decode بس) وبيرد على `/me` بأدمن عنده كل الصلاحيات والموديولات.

### إزاي تشغّلها

```bash
npm run e2e                 # كلها
npx playwright test e2e/chat.spec.ts   # ملف واحد
npx playwright test --ui    # واجهة تتفرج فيها خطوة بخطوة
npx playwright show-report  # تقرير آخر تشغيل
```

أول مرة على جهاز جديد: `npx playwright install chromium`.
لو `ng serve` شغال أصلًا على 4300، Playwright بيستخدمه بدل ما يشغّل واحد جديد.

### إزاي تضيف تست جديد

```ts
import { expect, test } from '@playwright/test';
import { MockApi, MockSocket, envelope, signIn } from './support/mock-api';

test('warehouses list loads', async ({ page }) => {
  const api = new MockApi(page);
  await api.install();
  await new MockSocket(page).install();
  await signIn(page, api);
  api.on('GET', 'inventory/v1/warehouse/', envelope([{ id: 1, name: 'MAIN' }], 1));

  await page.goto('/inventory/warehouses');
  await expect(page.getByRole('cell', { name: 'MAIN' })).toBeVisible();
});
```

قواعد:
- دوّر على العناصر زي المستخدم: `getByRole`، `getByText`، `getByPlaceholder`، `getByLabel`. الـ `#id` بس لو مفيش غيره.
- `await expect(...)` بيستنى لوحده لحد ما الحاجة تظهر؛ ماتستخدمش `waitForTimeout`.
- الردود الوهمية لازم تبقى بنفس شكل الـ API الحقيقي (`docs/API_REFERENCE.md`)، وإلا التست هيعدّي والموقع الحقيقي يقع.

### حدودها

بتختبر الواجهة مع API **وهمي**. لو الباك غيّر شكل رد، التستات دي مش هتحس. ممكن بعدين نضيف تشغيل نفس التستات على
الباك المحلي.

---

## 4. الـ CI والنشر (GitHub Actions)

### `.github/workflows/ci.yml`

بيشتغل على **كل PR** وعلى **كل push لـ `main`**:

```
npm ci → lint → unit tests → build → تثبيت Chromium → e2e
```

- لو أي خطوة فشلت، الـ PR بيظهر عليه ❌ وتقدر تفتح التفاصيل.
- لو الـ e2e فشل، بيترفع artifact اسمه `playwright-report` فيه صور وtrace لكل تست وقع (بيفضل 7 أيام).
- لو عملت push جديد على نفس البرانش، التشغيل القديم بيتلغي (`concurrency`).

### `.github/workflows/deploy.yml`

- بيشتغل **بعد** ما الـ CI ينجح على push لـ `main` بس.
- بيبني **نفس الكوميت** اللي الـ CI اختبره، وبيرفعه على برانش `gh-pages` (GitHub Pages).
- بيستخدم `GITHUB_TOKEN` اللي GitHub بيديه للـ workflow، فمش محتاج تحط أي secret.

**الفرق عن `npm run deploy` من جهازك:** الأمر المحلي بيبني الفولدر زي ما هو، بأي تعديلات لسه ماعملتلهاش كوميت.
النشر من الـ CI بينشر بس كود اتعمله كوميت ونجح في كل التستات. الأحسن من دلوقتي: ماتنشرش من جهازك، اعمل merge
لـ `main` وادفع (push)، والنشر يحصل لوحده.

### `karma.conf.js`

نفس إعدادات Angular الافتراضية، وزوّدنا launcher اسمه `ChromeHeadlessCI` (Chrome من غير شاشة ومن غير sandbox)، لأن
سيرفرات GitHub بتمنع الـ sandbox بتاع Chrome. على جهازك اشتغل عادي بـ `npx ng test`.

### محتاج تعمل إيه على GitHub (مرة واحدة)

1. **Settings → Actions → General → Workflow permissions**: لو مختار "Read repository contents" بس، النشر هيفشل.
   اختار "Read and write permissions"، أو سيبها لأن الـ workflow بيطلب `contents: write` لنفسه (بيشتغل طالما
   الإعداد ده مش مقفول على مستوى الحساب).
2. **Settings → Pages**: المصدر لازم يفضل برانش `gh-pages` (زي ما هو دلوقتي).
3. (اختياري) **Settings → Branches → Branch protection** على `main`: "Require status checks to pass" واختار `check`،
   كده مايتعملش merge لأي PR الـ CI بتاعه فاشل.

---

## الأوامر في مكان واحد

```bash
npm run lint                                   # ESLint
npx eslint src --fix                           # تصليح أوتوماتيك
npx ng test --watch=false                      # كل تستات الوحدة (بيفتح Chrome)
npx ng test --watch=false --browsers=ChromeHeadless --include='src/app/i18n-parity.spec.ts'   # ملف واحد
npm run e2e                                    # تستات E2E
npx playwright test --ui                       # E2E بواجهة
npm run build                                  # البيلد
```

## الكوميتات

| الكوميت | الخطوة |
|---|---|
| `chore(lint): add ESLint with angular-eslint and fix every finding` | ESLint |
| `test(i18n): fail when en.json and ar.json keys differ` | تطابق الترجمة |
| `test(e2e): Playwright suite against a mocked API` | E2E |
| `ci: lint, test, build and e2e on every PR; deploy main to Pages after CI` | CI والنشر |
