/*
 * Spoken narration per slide, keyed by slide id. Used by the deck's "Narrate" mode and by video-tools/ to build the
 * explainer videos. Write it to be heard: short sentences, no symbols or codes, words a listener can follow.
 */
TANZIM_DECK.narration = {
  "cover": {
    en: "Welcome. This is Tanzim, a cloud system that helps companies run their team, stock, sales and accounts in one place. In the next minutes we will see what it does today, how a company runs on it, and what still needs to be built.",
    ar: "أهلًا بكم. هذا هو نظام تنظيم، نظام سحابي يساعد الشركات على إدارة فريقها ومخزونها ومبيعاتها وحساباتها في مكان واحد. سنتعرف خلال الدقائق القادمة على ما يقدمه النظام اليوم، وكيف تعمل الشركة عليه، وما الذي ما زال يحتاج إلى بناء.",
  },
  "how-to-read": {
    en: "Every feature carries a status label. Green means it works in the app today. Blue means the server is ready but there are no screens yet. Amber means screens are in progress. Grey is a name with nothing behind it, red is missing, and purple is our proposal.",
    ar: "كل خاصية عليها علامة حالة. الأخضر يعني أنها تعمل في التطبيق اليوم. والأزرق يعني أن الخادم جاهز لكن الشاشات لم تُبنَ بعد. والبرتقالي يعني أن الشاشات قيد التطوير. والرمادي اسم بلا تنفيذ، والأحمر غير موجود، والبنفسجي مقترح منا.",
  },
  "part-a": {
    en: "Part A. Project overview.",
    ar: "الجزء الأول. نظرة عامة على المشروع.",
  },
  "what-is": {
    en: "Tanzim is one subscription system for buying, storing, selling and accounting. Many companies share the platform, and each company sees only its own data. It covers inventory, sales and collection, returns, automatic accounting, and dashboards, all in Arabic and English.",
    ar: "تنظيم نظام اشتراك واحد للشراء والتخزين والبيع والمحاسبة. تشترك فيه شركات كثيرة، وكل شركة ترى بياناتها فقط. ويغطي المخزون، والمبيعات والتحصيل، والمرتجعات، والمحاسبة التلقائية، ولوحات المتابعة، باللغتين العربية والإنجليزية.",
  },
  "problems": {
    en: "Companies face familiar problems. Stock nobody can confirm, credit sales without control, selling goods that are not there, accounts that lag behind the warehouse, returns that vanish, and owners without a clear view. Tanzim answers each one with a recorded rule in the system.",
    ar: "تواجه الشركات مشكلات معروفة: رصيد لا يستطيع أحد تأكيده، وبيع آجل بلا ضوابط، وبيع بضاعة غير موجودة، وحسابات متأخرة عن المخزن، ومرتجعات تضيع، وإدارة بلا رؤية واضحة. ويعالج تنظيم كل مشكلة منها بقاعدة مسجلة في النظام.",
  },
  "customers": {
    en: "Today the system fits companies that buy, store and sell best: trading, distribution and retail, with several warehouses, credit customers and automatic accounting. Companies that assemble or produce are next. Their work orders and quality checks are ready in the server and wait for screens.",
    ar: "النظام اليوم أنسب للشركات التي تشتري وتخزّن وتبيع: التجارة والتوزيع والتجزئة، بعدة مخازن، وعملاء آجل، ومحاسبة تلقائية. أما الشركات التي تجمّع أو تُنتج فهي الخطوة التالية، فأوامر التشغيل وفحوصات الجودة جاهزة في الخادم وتنتظر الشاشات.",
  },
  "at-a-glance": {
    en: "In numbers: twelve business modules work in the app, seven more are ready in the server, there are thirty analytical reports, eight financial reports, seven dashboards, and nineteen data sets you can import from Excel.",
    ar: "بالأرقام: اثنتا عشرة وحدة تعمل في التطبيق، وسبع وحدات أخرى جاهزة في الخادم، وثلاثون تقريرًا تحليليًا، وثمانية تقارير مالية، وسبع لوحات متابعة، وتسعة عشر نوعًا من البيانات يمكن استيرادها من إكسل.",
  },
  "part-b": {
    en: "Part B. The company lifecycle.",
    ar: "الجزء الثاني. دورة حياة الشركة.",
  },
  "lifecycle": {
    en: "A company moves through ten stages: subscribe, organize people, map locations, build the catalog, set up warehouses and suppliers, load opening stock, buy, sell and collect, monitor, and close the books. Opening stock and buying are the weak points today.",
    ar: "تمر الشركة بعشر مراحل: الاشتراك، وتنظيم الأفراد، وتحديد المواقع، وبناء الكتالوج، وإعداد المخازن والموردين، وإدخال رصيد أول المدة، ثم الشراء، والبيع والتحصيل، والمتابعة، وإقفال الدفاتر. ونقاط الضعف اليوم هي رصيد أول المدة والشراء.",
  },
  "ready-to-sell": {
    en: "Before the first sale, the company needs an active subscription, a user with rights, a warehouse, a sellable product with a price, stock on hand, and a customer. The chart of accounts is created automatically.",
    ar: "قبل أول عملية بيع تحتاج الشركة إلى اشتراك فعّال، ومستخدم له صلاحيات، ومخزن، ومنتج قابل للبيع له سعر، ورصيد متاح، وعميل. أما دليل الحسابات فيُنشأ تلقائيًا.",
  },
  "part-c": {
    en: "Part C. An overview of every module.",
    ar: "الجزء الثالث. نظرة عامة على الوحدات.",
  },
  "modules-1": {
    en: "The foundation: subscriptions, company users and permissions, locations, the product catalog, warehouses and suppliers, and import and export for fast onboarding.",
    ar: "الأساس: الاشتراكات، ومستخدمو الشركة وصلاحياتهم، والمواقع، وكتالوج المنتجات، والمخازن والموردون، والاستيراد والتصدير لبدء التشغيل بسرعة.",
  },
  "modules-2": {
    en: "Daily operations: stock levels and the stock ledger, transfers and adjustments, cycle counts, purchasing, sales, and returns.",
    ar: "العمليات اليومية: أرصدة المخزون وسجل الحركة، والتحويلات والتسويات، والجرد الدوري، والمشتريات، والمبيعات، والمرتجعات.",
  },
  "modules-3": {
    en: "Control and finance: accounting, dashboards and reports, and notifications are live. Quality, work orders, approvals, stock planning and integrations are ready in the server only.",
    ar: "الرقابة والمالية: المحاسبة ولوحات المتابعة والتقارير والإشعارات تعمل اليوم. أما الجودة وأوامر التشغيل والاعتمادات وتخطيط المخزون والتكاملات فهي جاهزة في الخادم فقط.",
  },
  "status-chart": {
    en: "Here is the full picture: twelve modules live, seven ready in the server, one in progress, one that is only a name, and two that do not exist yet.",
    ar: "وهذه الصورة الكاملة: اثنتا عشرة وحدة تعمل، وسبع جاهزة في الخادم، وواحدة قيد التطوير، وواحدة مجرد اسم، واثنتان غير موجودتين بعد.",
  },
  "part-d": {
    en: "Part D. How each module works, step by step.",
    ar: "الجزء الرابع. كيف تعمل كل وحدة، خطوة بخطوة.",
  },
  "wf-platform": {
    en: "The Tanzim team creates the company and its admin, chooses a plan, adds modules and users, then issues invoices and records payments. Modules stay open only while the subscription is in trial or active.",
    ar: "يُنشئ فريق تنظيم الشركة ومسؤولها، ويختار الخطة، ويضيف الوحدات والمستخدمين، ثم يصدر الفواتير ويسجل المدفوعات. وتبقى الوحدات مفتوحة فقط أثناء الفترة التجريبية أو الاشتراك الفعّال.",
  },
  "wf-org": {
    en: "The company admin sets the logo and colors, departments and teams, roles, and users. Every action needs two permissions: access to the module, and the right action on the record.",
    ar: "يضبط مسؤول الشركة الشعار والألوان، والأقسام والفرق، والأدوار، والمستخدمين. وكل إجراء يحتاج صلاحيتين: الدخول إلى الوحدة، والإجراء المناسب على السجل.",
  },
  "wf-loc": {
    en: "Locations go from country to governorate, city, district, and finally the address of each office, branch or warehouse.",
    ar: "تتدرج المواقع من الدولة إلى المحافظة ثم المدينة ثم الحي، وأخيرًا عنوان كل مكتب أو فرع أو مخزن.",
  },
  "wf-catalog": {
    en: "Products are grouped by category and brand. Each stocked item is a variant, for example a laptop model, with its own code, cost and price. One limit: there is no conversion between units such as piece, box and carton.",
    ar: "تُجمَّع المنتجات حسب التصنيف والعلامة التجارية. وكل صنف مخزَّن هو متغير، مثل موديل لابتوب معيّن، بكود وتكلفة وسعر. وأحد القيود: لا يوجد تحويل بين الوحدات مثل القطعة والعلبة والكرتونة.",
  },
  "wf-wh": {
    en: "Warehouses are split into zones and shelves. The balance always comes from the stock ledger, and available stock is the balance minus reservations.",
    ar: "تُقسَّم المخازن إلى مناطق وأرفف. والرصيد يأتي دائمًا من سجل حركة المخزون، والمتاح هو الرصيد ناقص الحجوزات.",
  },
  "wf-purchase": {
    en: "Purchasing runs from requisition to purchase order, goods receipt and supplier invoice matching. The server supports all of it, but the screens are not built yet, so this is the next planned step.",
    ar: "تمتد المشتريات من طلب الشراء إلى أمر الشراء ثم استلام البضاعة ثم مطابقة فاتورة المورد. الخادم يدعم كل ذلك، لكن الشاشات لم تُبنَ بعد، وهي الخطوة المخططة التالية.",
  },
  "wf-payables": {
    en: "Accountants pay matched supplier invoices, allocate one payment across several invoices, and raise debit notes for returns. Payments are never edited; they are voided and the entry is reversed.",
    ar: "يسدد المحاسب فواتير الموردين المطابَقة، ويوزع الدفعة الواحدة على عدة فواتير، ويصدر إشعارات مدينة للمرتجعات. والدفعات لا تُعدَّل أبدًا، بل تُلغى ويُعكس قيدها.",
  },
  "wf-transfer": {
    en: "A transfer moves stock between warehouses: draft, approve, ship, and receive, fully or in part. The screens are built on a work branch and waiting to be merged.",
    ar: "التحويل ينقل المخزون بين المخازن: مسودة، ثم اعتماد، ثم شحن، ثم استلام كلي أو جزئي. والشاشات مبنية على فرع عمل وتنتظر الدمج.",
  },
  "wf-adjust": {
    en: "Adjustments correct the stock for damage, theft or counting errors. After approval they are posted to the ledger and to the accounts.",
    ar: "التسويات تصحح المخزون بسبب التلف أو السرقة أو أخطاء الجرد، وبعد الاعتماد تُرحَّل إلى سجل الحركة وإلى الحسابات.",
  },
  "wf-count": {
    en: "A cycle count generates a count sheet from system stock, records what was counted, and posts the differences when approved. It is ready in the server only.",
    ar: "الجرد الدوري يولّد ورقة جرد من رصيد النظام، ويسجل ما تم عدّه، ويرحّل الفروق عند الاعتماد. وهو جاهز في الخادم فقط.",
  },
  "wf-sales-order": {
    en: "A sales order starts as a draft. On confirmation the system checks the customer's credit and the available stock, and reserves the goods. If either check fails, the order is refused with the reason.",
    ar: "يبدأ أمر البيع كمسودة. وعند التأكيد يفحص النظام ائتمان العميل والرصيد المتاح ويحجز البضاعة. وإذا فشل أي فحص يُرفض الأمر مع ذكر السبب.",
  },
  "wf-delivery": {
    en: "Goods leave with a delivery note. Partial deliveries are allowed, the oldest batch is picked first, stock is issued, and the cost of goods sold is recorded automatically.",
    ar: "تخرج البضاعة بإذن تسليم. والتسليم الجزئي مسموح، وتُصرف أقدم دفعة أولًا، ويُخصم المخزون، وتُسجَّل تكلفة البضاعة المباعة تلقائيًا.",
  },
  "wf-invoice": {
    en: "After delivery, the invoice is created from the order and issued. Customers can pay in parts by cash, card, transfer or cheque. Every step posts its own journal entry.",
    ar: "بعد التسليم تُنشأ الفاتورة من الأمر وتُصدر. ويمكن للعميل السداد على دفعات نقدًا أو ببطاقة أو تحويل أو شيك. وكل خطوة تُنشئ قيدها المحاسبي بنفسها.",
  },
  "wf-cust-return": {
    en: "A customer return is requested, approved, received, inspected and closed. Inspection decides each item's fate: back to stock, quarantine, write off, back to the supplier, or repair.",
    ar: "مرتجع العميل يُطلب ثم يُعتمد ثم يُستلم ثم يُفحص ثم يُغلق. والفحص يحدد مصير كل صنف: عودة للمخزون، أو حجر، أو إعدام، أو إرجاع للمورد، أو إصلاح.",
  },
  "wf-sup-return": {
    en: "Goods going back to a supplier follow approve, ship, confirm and close. A debit note then reduces what the company owes that supplier.",
    ar: "البضاعة المرتجعة للمورد تمر بالاعتماد ثم الشحن ثم التأكيد ثم الإغلاق، ثم يخفّض إشعار مدين المبلغ المستحق لذلك المورد.",
  },
  "wf-accounting": {
    en: "Accounting is double entry. Operations post entries automatically, manual entries must balance, corrections are made by reversal, and months and years are closed in order.",
    ar: "المحاسبة بنظام القيد المزدوج. العمليات تُنشئ القيود تلقائيًا، والقيود اليدوية يجب أن تتوازن، والتصحيح يكون بقيد عكسي، وتُقفل الأشهر والسنوات بالترتيب.",
  },
  "wf-analytics": {
    en: "Managers open a dashboard for their area, compare with the previous period, act on alerts, and drill into thirty reports with export to Excel.",
    ar: "يفتح كل مدير لوحة متابعة مجاله، ويقارن بالفترة السابقة، ويتصرف في التنبيهات، ويتعمق في ثلاثين تقريرًا مع التصدير إلى إكسل.",
  },
  "wf-quality": {
    en: "Quality inspections, non-conformance reports and quarantine are ready in the server. Today only customer returns create inspection records.",
    ar: "فحوصات الجودة وتقارير عدم المطابقة والحجر جاهزة في الخادم، واليوم تُنشئ مرتجعات العملاء فقط سجلات الفحص.",
  },
  "wf-assembly": {
    en: "Work orders turn components into finished goods using a bill of materials, and compute the unit cost. Cutting, scrap and machine scheduling are not covered.",
    ar: "أوامر التشغيل تحوّل المكونات إلى منتج تام باستخدام قائمة المكونات وتحسب تكلفة الوحدة. ولا يغطي النظام القص أو الهالك أو جدولة الماكينات.",
  },
  "wf-approvals": {
    en: "Approval workflows support several stages, approvers by user or role, and hourly escalation to managers. They have no screens yet.",
    ar: "مسارات الاعتماد تدعم عدة مراحل، ومعتمدين بالاسم أو بالدور، وتصعيدًا كل ساعة إلى المديرين، ولا توجد لها شاشات بعد.",
  },
  "wf-planning": {
    en: "Every night the system recalculates reorder points, raises low stock and expiry alerts, and suggests what to buy and from whom.",
    ar: "كل ليلة يعيد النظام حساب نقاط إعادة الطلب، ويطلق تنبيهات نقص الرصيد وقرب انتهاء الصلاحية، ويقترح ما يجب شراؤه ومن أي مورد.",
  },
  "wf-support": {
    en: "Supporting modules: live notifications, Excel import with a trial run first, and signed webhooks for connecting other systems.",
    ar: "الوحدات المساندة: إشعارات فورية، واستيراد من إكسل مع تجربة قبل الحفظ، وإشعارات موقّعة لربط الأنظمة الأخرى.",
  },
  "not-built": {
    en: "To be clear: attendance and payroll appear in the subscription plans with nothing behind them. Expenses and custody do not exist. Today, expenses are recorded as manual journal entries.",
    ar: "للتوضيح: الحضور والرواتب يظهران في خطط الاشتراك بلا أي تنفيذ، والمصروفات والعُهد غير موجودة. واليوم تُسجَّل المصروفات كقيود يومية يدوية.",
  },
  "part-e": {
    en: "Part E. Ordinary days at a company, across modules.",
    ar: "الجزء الخامس. أيام عمل عادية في شركة، عبر الوحدات.",
  },
  "scn-buy": {
    en: "Scenario one. The company restocks twenty laptops from a supplier: a reorder suggestion, a purchase order, approval, goods receipt, invoice matching, and payment. Most of these steps wait for the purchasing screens.",
    ar: "السيناريو الأول. الشركة تعيد تخزين عشرين لابتوب من مورد: اقتراح إعادة طلب، ثم أمر شراء، ثم اعتماد، ثم استلام، ثم مطابقة الفاتورة، ثم السداد. ومعظم هذه الخطوات تنتظر شاشات المشتريات.",
  },
  "scn-sell": {
    en: "Scenario two. Six laptops and twelve mice sold on credit to a business customer, delivered in two loads, invoiced, and sixty percent paid by bank transfer. The rest appears in the receivables aging report. This scenario works fully today.",
    ar: "السيناريو الثاني. بيع ست لابتوبات واثني عشر ماوس بالآجل لعميل من الشركات، تُسلَّم على دفعتين، ثم تُصدر الفاتورة، ويُسدَّد ستون بالمئة بتحويل بنكي، ويظهر الباقي في تقرير أعمار الديون. وهذا السيناريو يعمل بالكامل اليوم.",
  },
  "scn-return": {
    en: "Scenario three. Four faulty mice come back. Two return to stock, the other two go back to the supplier with a debit note, and the customer receives a credit note.",
    ar: "السيناريو الثالث. يعود أربعة ماوس معيبة. اثنان يرجعان إلى المخزن، والاثنان الآخران يُعادان إلى المورد بإشعار مدين، ويحصل العميل على إشعار دائن.",
  },
  "scn-factory": {
    en: "Scenario four. A company assembles ten office workstation kits: the components are transferred, reserved, issued, and the kits are received at a known cost, then sold normally.",
    ar: "السيناريو الرابع. شركة تجمّع عشرة أطقم مكتب كاملة: تُحوَّل المكونات وتُحجز وتُصرف، ثم تُستلم الأطقم بتكلفة معروفة وتُباع بالطريقة المعتادة.",
  },
  "scn-close": {
    en: "Scenario five. At month end the company counts stock, writes off damaged items, follows up debtors, records expenses, reviews the statements, and closes the month.",
    ar: "السيناريو الخامس. في نهاية الشهر تجرد الشركة المخزون، وتعدم الأصناف التالفة، وتتابع المدينين، وتسجل المصروفات، وتراجع القوائم المالية، ثم تقفل الشهر.",
  },
  "part-f": {
    en: "Part F. How the modules work together.",
    ar: "الجزء السادس. كيف تعمل الوحدات معًا.",
  },
  "network": {
    en: "Everything flows into two ledgers. Purchasing, sales, returns and work orders move stock in the stock ledger, and every financial event becomes an entry in the general ledger. Dashboards read from all of them.",
    ar: "كل شيء يصب في دفترين. المشتريات والمبيعات والمرتجعات وأوامر التشغيل تحرك المخزون في سجل الحركة، وكل حدث مالي يصبح قيدًا في دفتر الأستاذ العام، ولوحات المتابعة تقرأ منها جميعًا.",
  },
  "impact": {
    en: "This table shows what each operation changes. For example, shipping reduces stock and records the cost of sales, issuing an invoice raises the customer's balance, and a payment lowers it.",
    ar: "يوضح هذا الجدول ما تغيّره كل عملية. فمثلًا الشحن يخفض المخزون ويسجل تكلفة المبيعات، وإصدار الفاتورة يرفع رصيد العميل، والتحصيل يخفضه.",
  },
  "part-g": {
    en: "Part G. Roles and permissions.",
    ar: "الجزء السابع. الأدوار والصلاحيات.",
  },
  "user-types": {
    en: "There are four kinds of user: Tanzim platform staff, the company admin, employees, and department managers who receive approval escalations.",
    ar: "هناك أربعة أنواع من المستخدمين: فريق منصة تنظيم، ومسؤول الشركة، والموظفون، ومديرو الأقسام الذين تصلهم تصعيدات الاعتماد.",
  },
  "access-model": {
    en: "Every request passes four gates: the subscription, the company, access to the module, and the specific action. Each company starts with twenty two ready permission groups.",
    ar: "كل طلب يمر بأربع بوابات: الاشتراك، ثم الشركة، ثم الدخول إلى الوحدة، ثم الإجراء المحدد. وتبدأ كل شركة باثنتين وعشرين مجموعة صلاحيات جاهزة.",
  },
  "role-map": {
    en: "This is our proposed starting setup for a trading company: an owner, a sales representative, a storekeeper, an accountant, a buyer and an auditor, built only from existing groups.",
    ar: "هذا إعداد مقترح للبداية لشركة تجارية: مالك، ومندوب مبيعات، وأمين مخزن، ومحاسب، ومشترٍ، ومراجع، مبني فقط من المجموعات الموجودة.",
  },
  "part-h": {
    en: "Part H. Business benefits.",
    ar: "الجزء الثامن. فوائد الأعمال.",
  },
  "benefits": {
    en: "The gains are concrete: one version of stock, credit discipline, no overselling, books without re-typing, traceable corrections, decisions based on data, and clear responsibilities. We do not claim savings figures, because there is no production data yet.",
    ar: "الفوائد ملموسة: نسخة واحدة من المخزون، وانضباط في الائتمان، ولا بيع لما لا يوجد، ودفاتر بلا إعادة إدخال، وتصحيحات قابلة للتتبع، وقرارات مبنية على البيانات، ومسؤوليات واضحة. ولا ندّعي أرقام توفير، فلا توجد بيانات تشغيل فعلية بعد.",
  },
  "part-i": {
    en: "Part I. Where the project stands today.",
    ar: "الجزء التاسع. أين يقف المشروع اليوم.",
  },
  "status-detail": {
    en: "In detail: platform, company, inventory visibility, sales, returns, accounting and analytics are live. Purchasing, production and quality live in the server. People management is only a name.",
    ar: "بالتفصيل: المنصة والشركة ورؤية المخزون والمبيعات والمرتجعات والمحاسبة والتحليلات تعمل. والمشتريات والإنتاج والجودة في الخادم فقط. وإدارة الأفراد مجرد اسم.",
  },
  "limits": {
    en: "Known limits in live features: invoices never become overdue automatically, opening stock posts to the wrong account, stock lists lack filters, some analytics labels are English only, the currency defaults to dollars, and units cannot be converted.",
    ar: "قيود معروفة في الخصائص المتاحة: الفواتير لا تصبح متأخرة تلقائيًا، ورصيد أول المدة يُرحَّل إلى حساب خطأ، وقوائم المخزون بلا فلاتر، وبعض نصوص التحليلات بالإنجليزية فقط، والعملة الافتراضية الدولار، ولا يوجد تحويل بين الوحدات.",
  },
  "part-j": {
    en: "Part J. Gaps and the roadmap.",
    ar: "الجزء العاشر. الفجوات وخارطة الطريق.",
  },
  "questions": {
    en: "Fourteen decisions are needed from the business, among them: whether items are sold in more than one unit, whether invoicing must wait for delivery, which currency, how to load opening balances, how to handle cheques, and what custody means for you.",
    ar: "نحتاج أربعة عشر قرارًا من الإدارة، منها: هل يُباع الصنف بأكثر من وحدة، وهل تنتظر الفاتورة التسليم، وما العملة، وكيف تُدخل الأرصدة الافتتاحية، وكيف تُعالج الشيكات، وماذا تعني العُهد لديكم.",
  },
  "roadmap": {
    en: "The roadmap has three steps. Now: finish transfers and build the purchasing screens. Next: open the modules the server already supports and fix the known limits. Later: the features that depend on your decisions.",
    ar: "خارطة الطريق ثلاث خطوات. الآن: إكمال التحويلات وبناء شاشات المشتريات. التالي: فتح الوحدات التي يدعمها الخادم ومعالجة القيود المعروفة. ولاحقًا: الخصائص التي تعتمد على قراراتكم.",
  },
  "part-k": {
    en: "Part K. Recommendations to grow the business. All of these are proposals.",
    ar: "الجزء الحادي عشر. توصيات لتنمية الأعمال، وكلها مقترحات.",
  },
  "rec-trade": {
    en: "For sales and cash: units with conversions, price lists, one step counter sales, a cheque book, a collections desk, and delivery tracking.",
    ar: "للمبيعات والتحصيل: وحدات مع تحويل تلقائي، وقوائم أسعار، وبيع فوري بخطوة واحدة، ودفتر شيكات، ومكتب تحصيل، وتتبع للتوصيل.",
  },
  "rec-ops": {
    en: "For operations and finance: an opening balance wizard, expenses and petty cash, a custody register, production, a decision on the people module, and tax e-invoicing where required.",
    ar: "للعمليات والمالية: معالج للأرصدة الافتتاحية، والمصروفات والنثرية، وسجل للعُهد، والإنتاج، وقرار بشأن وحدة الأفراد، والفاتورة الإلكترونية حيث تكون مطلوبة.",
  },
  "rec-adoption": {
    en: "For rollout: starter packs per activity, a one month pilot with a real company, phone screens for storekeepers, useful alerts to the owner, a daily summary email, and clear plan packaging.",
    ar: "لبدء التشغيل: حزم بداية حسب النشاط، وتجربة لمدة شهر مع شركة حقيقية، وشاشات هاتف لأمناء المخازن، وتنبيهات مفيدة للمالك، وملخص يومي بالبريد، وخطط اشتراك واضحة.",
  },
  "glossary": {
    en: "This glossary keeps the same meaning for each term in Arabic and English, so the team and customers speak one language.",
    ar: "يحافظ هذا القاموس على المعنى نفسه لكل مصطلح بالعربية والإنجليزية، حتى يتحدث الفريق والعملاء لغة واحدة.",
  },
  "close": {
    en: "To sum up: Tanzim already has a strong core for running a company. Purchasing screens come next, then the modules the server already supports. Your answers to the fourteen questions will shape everything after that. Thank you.",
    ar: "في الختام: يمتلك تنظيم بالفعل نواة قوية لإدارة الشركات. شاشات المشتريات هي الخطوة التالية، ثم الوحدات التي يدعمها الخادم. وإجاباتكم عن الأسئلة الأربعة عشر ستحدد كل ما بعد ذلك. شكرًا لكم.",
  },
};
