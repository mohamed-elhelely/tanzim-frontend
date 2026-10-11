# خطة الـ Features القادمة + System Logs

تاريخ: 2026-10-12

## 0. اللي اتعمل في الجلسة دي (فلاتر القوائم)

- كل الفلاتر بقت بتتطبق بالضغط (زرار **تطبيق/بحث** أو Enter) بدل ما تتطبق وقت الكتابة.
- زرار **تطبيق** بيبقى disabled لو الفلاتر ماتغيرتش عن اللي معروض، فمفيش request بيتكرر على نفس الداتا.
- زرار **مسح الفلاتر** بيظهر لما يكون في فلتر متطبق.
- تحت الكود: `ServerTable.apply()` / `changed()` / `clear()` في `src/app/shared/table/server-table.ts`.
- **حفظ الفلاتر في الـ URL:** اتلغى بناءً على طلبك.

---

## 1. System Logs (أولوية أولى)

**الهدف:** أي action بيعدّل داتا في السيستم بأي شكل نعرف عنه: **مين** عمله، **إمتى**، **إيه اللي اتغير بالظبط** (قبل/بعد)، و**منين** (IP، الجهاز، API ولا import ولا background task).

### الوضع الحالي في الباك إند

- `SalesAuditTrail` (`sales/signals/audit_trail.py`) بيغطي 4 models بس: Customer وSalesOrder وDeliveryNote وSalesInvoice. باقي السيستم مش متسجل: المخزون، الحسابات، الصلاحيات، المرتجعات، الفوترة.
- `CompanyBaseModel` فيه `created_by` و`updated_by`، لكن دول بيقولوا **آخر** واحد عدّل وبس. مفيش history ومفيش القيم القديمة.
- `CurrentUserMiddleware` بيحفظ اليوزر في `threading.local`. ده مش آمن مع ASGI/Daphne، والأحسن `contextvars`.
- في حوالي 56 مكان بيستخدم `queryset.update()` أو `bulk_create`/`bulk_update` أو `queryset.delete()`. الأماكن دي **مش بتطلع signals**، فأي audit مبني على signals بس هيفوّتها.

### التصميم المقترح (Backend)

**أ) app جديد `audit` وفيه model واحد `AuditLog`:**

| Field | الوصف |
|---|---|
| `company` | الـ tenant (nullable لـ actions المنصة) |
| `user` + `user_display` | FK (SET_NULL) + snapshot للاسم/الإيميل علشان اللوج يفضل مقروء لو اليوزر اتمسح |
| `action` | `create` / `update` / `delete` / `restore` / `bulk_update` / `bulk_delete` / `import` / `login` / `login_failed` / `logout` / `permission_change` |
| `content_type` + `object_id` + `object_repr` | السجل اللي اتعدل (`object_repr` زي "SO-2026-00012") |
| `changes` | JSON: `{"status": ["draft", "approved"], ...}` |
| `source` | `api` / `admin` / `import` / `celery` / `system` |
| `request_id`, `ip_address`, `user_agent`, `method`, `path` | سياق الـ request |
| `timestamp` | indexed |

- **Immutable:** `save()` بيرفض أي تعديل لسجل موجود، و`delete()` ممنوع. على PostgreSQL نضيف trigger يمنع UPDATE/DELETE على الجدول.
- **Indexes:** `(company, -timestamp)` و`(content_type, object_id)` و`(company, user, -timestamp)`.

**ب) الالتقاط (capture):**

1. **Signals عامة** على كل subclass من `CompanyBaseModel`، بدل ما نسجّل model model:
   - `pre_save`: snapshot للقيم القديمة.
   - `post_save`: نحسب الـ diff ونسجّل `create` أو `update`.
   - `post_delete`: نسجّل `delete`.
   - الـ soft delete (`is_deleted=True`) يتسجل `delete`، ولو رجع `False` يتسجل `restore`.
2. **`m2m_changed`**: علشان تغييرات الصلاحيات (`Role.permissions` والـ permission groups وأعضاء التيمز). دي أهم حاجة أمنيًا.
3. **Bulk operations**: نعمل override لـ `update()` و`bulk_create()` و`bulk_update()` و`delete()` في الـ QuerySet بتاع `TenantAwareManager`، ونسجّل entry واحد فيه عدد السجلات والـ IDs. ونراجع الـ 56 مكان واحد واحد.
4. **Auth events**: login (ناجح/فاشل) وlogout وتغيير الباسورد. دي من signals بتاعة `django.contrib.auth` ومن الـ login view.
5. **Context**:
   - نستبدل `threading.local` بـ `contextvars` (user، request_id، ip، source).
   - في Celery نبعت `user_id` و`request_id` في الـ task headers، وsignal بتاع `task_prerun` يرجّعهم.
   - الـ import/export ياخد اليوزر من `DataSheetTask.created_by`.
6. **الكتابة جوه نفس الـ transaction**: لو الـ request عمل rollback، اللوج كمان يتلغي، فمفيش لوج لحاجة ماحصلتش.

**ج) الإعدادات:**

- `AUDIT_EXCLUDED_FIELDS`: حقول ماتتسجلش زي `updated_at` و`last_login`.
- `AUDIT_MASKED_FIELDS`: حقول تتسجل كـ `"***"` زي `password` والـ tokens والـ API keys والـ webhook secrets.
- `AUDIT_EXCLUDED_MODELS`: models ماتتسجلش زي الـ notifications والـ AuditLog نفسه.

**د) الـ API:**

- `GET /api/audit/v1/logs/` فيه pagination وsearch، وفلاتر: `user` و`action` و`resource` و`object_id` و`source` و`date_from` و`date_to`.
- `GET /api/audit/v1/logs/{id}/` بيرجع التفاصيل والـ diff.
- `GET /api/audit/v1/logs/export/` بيعمل CSV/Excel بنفس الفلاتر.
- **الصلاحيات:**
  - resource جديد `auditlog` في `company/access.py` بـ `view_auditlog` بس، ومفيش add/change/delete.
  - الـ company admin يشوف لوجات شركته بس، والـ platform admin يشوف كل حاجة.
  - `test_permission_coverage.py` هيفشل لو ماتضافش، وده مقصود.

**هـ) الهجرة من `SalesAuditTrail`:**

- migration تنقل السجلات القديمة لـ `AuditLog`.
- بعدها نشيل الـ signals القديمة، ونخلي endpoint `audit-trail` يقرا من الجدول الجديد علشان التوافق، لحد ما نشيله.

**و) الحجم والأداء:**

- retention حسب الباقة: feature flag في `billing/feature_flags.py`، مثلًا 90 يوم / سنة / بلا حد.
- مهمة Celery beat تمسح القديم. دي الوحيدة المسموح لها تمسح، وتتسجل هي نفسها كـ `system`.
- لو الجدول كبر: monthly partitioning على PostgreSQL.

**ز) Tests:**

- coverage test يتأكد إن كل model بيورث `CompanyBaseModel` بيتسجل، أو موجود صراحةً في `AUDIT_EXCLUDED_MODELS`، زي `test_permission_coverage`.
- tests للـ diff والـ m2m والـ bulk والـ rollback والـ masking والـ immutability والـ tenant isolation.

### الفرونت إند

1. **صفحة "سجل النظام"** تحت إعدادات الشركة:
   - جدول بـ `ServerTable` بالفلاتر الجديدة (تطبيق/مسح): المستخدم، نوع الـ action، الـ resource، والفترة من/إلى.
   - الضغط على سطر يفتح drawer فيه الـ diff (قبل ← بعد) بأسماء الحقول المترجمة.
   - زرار تصدير.
2. **تاب "السجل/History"** في صفحات التفاصيل (أمر بيع، فاتورة، منتج، مستخدم…). بيعرض timeline من نفس الـ API بـ `resource` و`object_id`.
3. **"آخر تعديل بواسطة"** في صفحات التفاصيل (من `updated_by`).
4. **صفحة للـ platform admin** فيها لوجات كل الشركات، مع فلتر بالشركة.

### مراحل التنفيذ

| المرحلة | المحتوى |
|---|---|
| 1 | model + `contextvars` + signals عامة + m2m + API + صلاحية + tests |
| 2 | bulk operations + Celery/import context + auth events + masking |
| 3 | صفحة سجل النظام + تاب History في الفرونت |
| 4 | هجرة `SalesAuditTrail` + retention + partitioning (لو احتجنا) |

---

## 2. Features الباك إند جاهز فيها والفرونت ناقصها (أسرع مكسب)

الباك إند فيه endpoints شغالة **ومفيش لها شاشات**:

| Feature | Endpoints موجودة | الأولوية |
|---|---|---|
| **المشتريات**: طلبات شراء ← أوامر شراء ← استلام | `PurchaseRequisition*`, `PurchaseOrder*` | عالية |
| **عمليات المخزون**: تسويات، تحويلات بين المخازن، جرد دوري، حجوزات | `StockAdjustment*`, `StockTransfer*`, `CycleCount*`, `StockReservation` | عالية |
| **تنبيهات المخزون وإعادة الطلب**: نقص المخزون، انتهاء الصلاحية، اقتراحات إعادة الطلب + widget في الداشبورد | `LowStockAlert`, `ExpiryAlert`, `ReorderPolicy`, `ReorderSuggestion`, `planning/run/` | عالية |
| **الموافقات (Approvals)**: inbox للطلبات اللي مستنية موافقتي + إعداد مراحل الـ workflow | `ApprovalWorkflow`, `ApprovalStage`, `ApprovalRequest`, `ApprovalAction` | متوسطة |
| **الجودة**: فحوصات، NCRs، الحجر (quarantine) | `quality/` (`inspections`, `ncrs`, `quarantine`) | متوسطة |
| **التجميع (Assembly)**: أوامر العمل | `assembly/` (`work-orders`) | متوسطة |
| **التكاملات**: إعداد الـ webhooks وسجل الأحداث | `integrations/` (`webhooks`, `events/`) | منخفضة |
| **التقارير المحفوظة والمجدولة** | `reports/` (`saved`, `schedules`) | منخفضة |

---

## 3. Features محتاجة شغل في الباك والفرونت

1. **فلتر بالتاريخ في القوائم**: الفواتير وأوامر البيع والمرتجعات والمدفوعات، زي قيود اليومية. الفرونت هيضيف from/to، والباك يأكد الدعم (بند 2 في طلبات الباك).
2. **تصدير اللي ظاهر بس**: Excel/CSV بنفس الفلاتر المطبقة (بند 3 في طلبات الباك).
3. **بحث شامل (Ctrl+K)**: endpoint واحد يدور في العملاء والأوامر والفواتير والمنتجات ويرجع نتائج مجمّعة.
4. **مرفقات على المستندات**: PDF وصور على الفواتير وأوامر الشراء والمرتجعات.
5. **تعليقات/ملاحظات على المستندات** مع @mention يبعت notification (الـ notifications موجودة بالفعل).
6. **طباعة PDF وإرسال الفاتورة بالإيميل للعميل** بلوجو وألوان الشركة (موجودين في company profile).
7. **عمليات جماعية في القوائم**: تحديد كذا سطر ← حذف، أو تغيير حالة، أو تصدير.
8. **Saved views**: كل يوزر يحفظ مجموعة فلاتر بإسم ويرجعلها.
9. **أمان الحساب**:
   - الـ JWT حاليًا عمره **3650 يوم**، وده خطر لو التوكن اتسرق. المقترح: access token قصير + refresh rotation.
   - إدارة الجلسات/الأجهزة مع "تسجيل خروج من كل الأجهزة".
   - 2FA اختياري.
   - دي بتكمّل الـ System Logs (login events).

---

## 4. Features مفيدة للـ Business

دي حاجات بتزوّد قيمة المنتج للعميل وبتساعد في البيع. اللي مش عارفين حالته في الباك عليه سؤال في سكشن 6.

### بيع وتحصيل (بتأثر على الفلوس مباشرة)

1. **عروض الأسعار (Quotations)**: عرض سعر ← موافقة العميل ← يتحول لأمر بيع بضغطة. ده أول خطوة في دورة البيع عند أغلب الشركات.
2. **قوائم الأسعار والخصومات**: سعر مختلف لكل فئة عملاء (جملة/قطاعي/حكومي)، وخصومات بالكمية وعروض لفترة محددة.
3. **حد الائتمان وكشف حساب العميل**:
   - منع أو تحذير لما أمر البيع يتخطى حد ائتمان العميل.
   - كشف حساب PDF يتبعت للعميل.
   - تنبيه تلقائي للفواتير المتأخرة (aging موجود في تقارير الحسابات).
4. **تذكير التحصيل التلقائي**: إيميل أو WhatsApp للعميل قبل وبعد ميعاد الاستحقاق.
5. **أهداف المبيعات والعمولات**: target لكل مندوب/تيم، وحساب العمولة من الفواتير المحصّلة، وداشبورد للأداء.

### التزام قانوني (مصر)

6. **الفاتورة الإلكترونية والإيصال الإلكتروني (منظومة الضرائب المصرية ETA)**: ربط مباشر يرفع الفواتير ويرجّع الـ UUID/QR. ده **إلزامي** على شركات كتير، وبيبقى سبب رئيسي لاختيار السيستم.
7. **إعداد الضرايب**: أكتر من نسبة VAT، وأصناف معفاة، وضريبة الجدول. وتقرير إقرار ضريبي جاهز.

### تشغيل المخزن

8. **الباركود**: طباعة ليبلز للمنتجات/الـ bins، والمسح بالموبايل في الاستلام والصرف والجرد.
9. **تطبيق موبايل/PWA للمخزن والمندوبين**: استلام وصرف وجرد، وأوامر بيع من عند العميل. PWA على نفس الـ Angular أرخص بداية.
10. **Batch/Serial tracking وتواريخ الصلاحية** في الصرف (FEFO): مهم للأغذية والأدوية. فيه تنبيهات صلاحية أصلًا، والسؤال عن الـ batch tracking.

### للـ SaaS نفسه (نمو واحتفاظ بالعملاء)

11. **تسجيل ذاتي + فترة تجريبية** (self sign-up + trial) من غير ما الـ platform admin يعمل الشركة يدويًا.
12. **Onboarding wizard**: أول ما الشركة تدخل، خطوات تجهيز المخازن ودليل الحسابات واستيراد المنتجات والعملاء من Excel (الـ import موجود).
13. **داشبورد صحة العملاء للـ platform admin**: مين بيستخدم السيستم فعلًا ومين خامل (معرض إنه يلغي)، والاستخدام مقابل حدود الباقة. ده بيتبني على الـ System Logs.
14. **حدود الباقة الظاهرة للعميل**: "استخدمت 8 من 10 مستخدمين"، مع زرار upgrade.

### تواصل

15. **إشعارات WhatsApp/SMS**: تأكيد الطلب، الشحن، الفاتورة، والتذكير بالدفع.
16. **بوابة العميل (Customer portal)**: العميل يشوف فواتيره وطلباته وكشف حسابه ويدفع أونلاين. ده بيقلل مكالمات خدمة العملاء.
17. **الدفع الأونلاين** للفواتير (Paymob/Fawry) من لينك في الإيميل/الـ WhatsApp.

### تقارير للإدارة

18. **داشبورد للإدارة**: المبيعات مقابل الهدف، هامش الربح لكل منتج/عميل، أكتر الأصناف حركة/ركود، والتدفق النقدي المتوقع.
19. **تقارير مجدولة بالإيميل**: ملخص يومي/أسبوعي يوصل للمدير لوحده.

---

## 5. الترتيب المقترح

1. **System Logs**: المرحلة 1 و2 (باك)، بعدين المرحلة 3 (فرونت).
2. شاشات **المشتريات + عمليات المخزون + التنبيهات** (الباك جاهز).
3. **الفاتورة الإلكترونية (ETA)** + **عروض الأسعار** + **حد الائتمان/كشف الحساب**: أعلى قيمة بيعية.
4. **فلتر التاريخ + تصدير المفلتر**.
5. **أمان الحساب** (عمر التوكن + الجلسات).
6. **Self sign-up + Onboarding + حدود الباقة** (نمو الـ SaaS).
7. الموافقات، الجودة، التجميع، الباركود/PWA.
8. باقي الحاجات: البحث الشامل، المرفقات، التعليقات، PDF/إيميل، العمليات الجماعية، Saved views، WhatsApp، بوابة العميل، العمولات.

---

## 6. أسئلة/طلبات للباك إند

الأسئلة كلها اتنقلت لـ [`docs/BACKEND_REQUESTS_ROADMAP.md`](../BACKEND_REQUESTS_ROADMAP.md) (البنود 1–8؛ الملف القديم `BACKEND_REQUESTS.md` فيه البنود المفتوحة القديمة بس)، علشان يبقى فيه مكان واحد تبعته للباك:

| البند | الموضوع |
|---|---|
| 1 | System Logs: الـ API contract الكامل + أسئلة (ASGI، SalesAuditTrail، فترة الاحتفاظ) |
| 2 | فلتر التاريخ في القوائم |
| 3 | تصدير اللي ظاهر بس |
| 4 | أكتر من قيمة لنفس الفلتر |
| 5 | البحث الشامل |
| 6 | أمان الحساب (عمر التوكن، الجلسات، 2FA) |
| 7 | حالة features البيزنس (a–n) |
| 8 | docs للـ endpoints الموجودة اللي ملهاش شاشات |

حالة كل حاجة متتبعة في [`checklist.md`](checklist.md).
