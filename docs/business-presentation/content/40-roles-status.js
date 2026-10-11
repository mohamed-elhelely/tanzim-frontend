/* Part 4: roles (G), benefits (H), status (I), gaps and roadmap (J), recommendations (K), glossary. */
TANZIM_DECK.slides.push(
  {
    type: "section", id: "part-g", num: "G",
    title: { en: "Roles and permissions", ar: "الأدوار والصلاحيات" },
    lead: { en: "Who uses the system and how access is controlled.", ar: "من يستخدم النظام وكيف يُضبط الوصول." },
  },
  {
    type: "table", id: "user-types",
    kicker: { en: "Roles and permissions", ar: "الأدوار والصلاحيات" },
    title: { en: "Four kinds of user", ar: "أربعة أنواع من المستخدمين" },
    cols: [{ en: "User", ar: "المستخدم" }, { en: "How the system knows", ar: "كيف يعرفه النظام" }, { en: "What they do", ar: "ما يقوم به" }, { en: "Status", ar: "الحالة" }],
    rows: [
      [{ en: "Platform staff (Tanzim team)", ar: "فريق المنصة (فريق تنظيم)" }, { en: "Staff account, no company", ar: "حساب موظف منصة بلا شركة" }, { en: "Create companies; manage plans, modules, subscriptions, platform invoices and payments", ar: "إنشاء الشركات؛ إدارة الخطط والوحدات والاشتراكات وفواتير المنصة ومدفوعاتها" }, { st: "live" }],
      [{ en: "Company admin", ar: "مسؤول الشركة" }, { en: "Marked company admin on login", ar: "مُعرَّف كمسؤول شركة عند الدخول" }, { en: "Everything inside the company; sets up users and roles; sees the company's subscription and invoices", ar: "كل شيء داخل الشركة؛ يضبط المستخدمين والأدوار؛ ويطّلع على اشتراك الشركة وفواتيرها" }, { st: "live" }],
      [{ en: "Employee", ar: "الموظف" }, { en: "Company user with a role", ar: "مستخدم شركة له دور" }, { en: "Only the modules, screens and buttons the role allows", ar: "فقط الوحدات والشاشات والأزرار التي يسمح بها الدور" }, { st: "live" }],
      [{ en: "Department manager / team lead", ar: "مدير قسم / قائد فريق" }, { en: "Flags on the company user", ar: "علامات على مستخدم الشركة" }, { en: "Receive escalations of overdue approvals", ar: "يتلقون تصعيدات الاعتمادات المتأخرة" }, { st: "partial" }],
    ],
  },
  {
    type: "cards", id: "access-model", cols: 4,
    kicker: { en: "Roles and permissions", ar: "الأدوار والصلاحيات" },
    title: { en: "Four gates before any action", ar: "أربع بوابات قبل أي إجراء" },
    lead: { en: "The server checks all four on every request; the screens hide what a user cannot use.", ar: "يفحص الخادم الأربعة في كل طلب، وتُخفي الشاشات ما لا يستطيع المستخدم استخدامه." },
    cards: [
      { icon: "card", t: { en: "1 · Subscription", ar: "1 · الاشتراك" }, d: { en: "The company's plan includes the module (inventory, location, accounting) and the subscription is trial or active.", ar: "خطة الشركة تشمل الوحدة (المخزون، المواقع، المحاسبة) والاشتراك تجريبي أو فعّال." } },
      { icon: "building", t: { en: "2 · Company", ar: "2 · الشركة" }, d: { en: "Every record belongs to one company. Another company's record answers “not found”.", ar: "كل سجل يتبع شركة واحدة، وسجل شركة أخرى يُرد عليه «غير موجود»." } },
      { icon: "key", t: { en: "3 · Module access", ar: "3 · دخول الوحدة" }, d: { en: "The user holds `access_<module>` for Sales, Inventory, Accounting and so on.", ar: "المستخدم يملك `access_<module>` للمبيعات أو المخزون أو المحاسبة وغيرها." } },
      { icon: "shield", t: { en: "4 · Action", ar: "4 · الإجراء" }, d: { en: "View, add, change or delete on the resource. Workflow buttons such as confirm or ship need “change”.", ar: "عرض أو إضافة أو تعديل أو حذف على المورد. أزرار المسار مثل التأكيد والشحن تحتاج «تعديل»." } },
    ],
    note: {
      en: "A role = permission groups + single permissions. Each company starts with 22 locked groups (Full Access, Read Only, and Full / Read Only for each module) and can add its own.",
      ar: "الدور = مجموعات صلاحيات + صلاحيات منفردة. تبدأ كل شركة بـ22 مجموعة مقفلة (صلاحيات كاملة، قراءة فقط، وكاملة/قراءة لكل وحدة) ويمكنها إضافة مجموعاتها.",
    },
  },
  {
    type: "table", id: "role-map", status: "proposed",
    kicker: { en: "Roles and permissions · our proposal", ar: "الأدوار والصلاحيات · مقترحنا" },
    title: { en: "A starting role setup for a trading company", ar: "إعداد أدوار مبدئي لشركة تجارية" },
    lead: { en: "Built only from the existing groups. Confirm it with the business before use.", ar: "مبني فقط من المجموعات الموجودة. يُعتمد مع الإدارة قبل الاستخدام." },
    cols: [{ en: "Role", ar: "الدور" }, { en: "Groups to assign", ar: "المجموعات المقترحة" }, { en: "Main screens", ar: "الشاشات الرئيسية" }],
    rows: [
      [{ en: "Owner / general manager", ar: "المالك / المدير العام" }, { en: "Full Access", ar: "صلاحيات كاملة" }, { en: "Dashboards, reports, approvals", ar: "لوحات المتابعة والتقارير والاعتمادات" }],
      [{ en: "Sales representative", ar: "مندوب المبيعات" }, { en: "A custom copy of Sales – Full Access without delete; Inventory – Read Only", ar: "نسخة مخصصة من المبيعات – صلاحيات كاملة دون الحذف؛ المخزون – قراءة فقط" }, { en: "Customers, orders, stock levels", ar: "العملاء، أوامر البيع، أرصدة المخزون" }],
      [{ en: "Storekeeper", ar: "أمين المخزن" }, { en: "Inventory – Full Access, Sales – Read Only, Returns – Full Access", ar: "المخزون – صلاحيات كاملة، المبيعات – قراءة فقط، المرتجعات – صلاحيات كاملة" }, { en: "Deliveries, receipts, transfers, returns", ar: "التسليمات، الاستلامات، التحويلات، المرتجعات" }],
      [{ en: "Accountant", ar: "المحاسب" }, { en: "Accounting – Full Access, Sales – Full Access, Reports – Read Only", ar: "المحاسبة – صلاحيات كاملة، المبيعات – صلاحيات كاملة، التقارير – قراءة فقط" }, { en: "Invoices, payments, journal, supplier payments", ar: "الفواتير، التحصيل، القيود، مدفوعات الموردين" }],
      [{ en: "Buyer", ar: "المشتري" }, { en: "Inventory – Full Access, Reports – Read Only", ar: "المخزون – صلاحيات كاملة، التقارير – قراءة فقط" }, { en: "Suppliers, price lists; purchasing once its screens ship", ar: "الموردون وقوائم الأسعار؛ والمشتريات عند إطلاق شاشاتها" }],
      [{ en: "Auditor", ar: "المراجع" }, { en: "Read Only", ar: "قراءة فقط" }, { en: "Everything, without changes", ar: "كل شيء دون تعديل" }],
    ],
    note: {
      en: "Purchasing permissions sit inside the Inventory module, so a storekeeper with Inventory – Full Access can also approve purchase orders. Split them with custom groups if that matters.",
      ar: "صلاحيات المشتريات ضمن وحدة المخزون، لذلك أمين المخزن بصلاحيات المخزون الكاملة يستطيع اعتماد أوامر الشراء أيضًا. افصلها بمجموعات مخصصة إن كان ذلك مهمًا.",
    },
  },

  /* ---------------- Part H: benefits ---------------- */
  {
    type: "section", id: "part-h", num: "H",
    title: { en: "Business benefits", ar: "فوائد الأعمال" },
    lead: { en: "What a company gains from the features that are live today. Each benefit names the feature behind it.", ar: "ما تكسبه الشركة من الخصائص المتاحة اليوم. كل فائدة تذكر الخاصية التي تقف خلفها." },
  },
  {
    type: "cards", id: "benefits", cols: 3,
    kicker: { en: "Business benefits", ar: "فوائد الأعمال" },
    title: { en: "Organization, visibility, control", ar: "تنظيم ورؤية وضبط" },
    cards: [
      { icon: "eye", t: { en: "One version of stock", ar: "نسخة واحدة من المخزون" }, d: { en: "Balances come only from the stock ledger, with the document behind every change.", ar: "الأرصدة تأتي فقط من سجل الحركة، مع المستند وراء كل تغيير." } },
      { icon: "coins", t: { en: "Credit discipline", ar: "انضباط الائتمان" }, d: { en: "Orders above available credit are refused at confirmation; aging shows who owes what and for how long.", ar: "الأوامر التي تتجاوز الائتمان تُرفض عند التأكيد؛ وأعمار الديون توضح من يدين وبكم ومنذ متى." } },
      { icon: "cart", t: { en: "No overselling", ar: "لا بيع لما لا يوجد" }, d: { en: "Confirmed orders reserve stock; the next order sees only what is left.", ar: "الأوامر المؤكدة تحجز الرصيد، والأمر التالي يرى المتبقي فقط." } },
      { icon: "ledger", t: { en: "Books without re-typing", ar: "دفاتر دون إعادة إدخال" }, d: { en: "Invoices, payments, deliveries, returns and receipts post their own entries.", ar: "الفواتير والتحصيل والتسليم والمرتجعات والاستلام تُنشئ قيودها بنفسها." } },
      { icon: "shield", t: { en: "Traceable corrections", ar: "تصحيحات قابلة للتتبع" }, d: { en: "Issued documents are not edited; corrections are refunds, reversals and credit notes, so history stays intact.", ar: "المستندات المصدرة لا تُعدَّل؛ والتصحيح يكون باسترداد أو عكس أو إشعار دائن، فيبقى التاريخ كاملًا." } },
      { icon: "chart", t: { en: "Decisions on data", ar: "قرارات مبنية على البيانات" }, d: { en: "Dashboards for each role, comparison with the previous period, Excel export.", ar: "لوحات لكل دور، ومقارنة بالفترة السابقة، وتصدير إلى Excel." } },
      { icon: "warehouse", t: { en: "Many warehouses, one view", ar: "مخازن متعددة ورؤية واحدة" }, d: { en: "Stock by warehouse, zone and shelf, valued by FIFO, LIFO or average.", ar: "المخزون حسب المخزن والمنطقة والرف، مقيَّمًا بالوارد أولًا أو أخيرًا أو بالمتوسط." } },
      { icon: "users", t: { en: "Clear responsibilities", ar: "مسؤوليات واضحة" }, d: { en: "Each employee sees only their area; every document records who confirmed, shipped or cancelled it.", ar: "كل موظف يرى نطاقه فقط؛ وكل مستند يسجل من أكّده أو شحنه أو ألغاه." } },
      { icon: "globe", t: { en: "Arabic-first teams", ar: "فرق تعمل بالعربية" }, d: { en: "Full Arabic interface with right-to-left layout, and English for partners.", ar: "واجهة عربية كاملة من اليمين لليسار، والإنجليزية للشركاء." } },
    ],
    note: { en: "We make no claim of time or cost savings: there is no production usage data yet to measure them.", ar: "لا ندّعي توفيرًا في الوقت أو التكلفة؛ فلا توجد بعد بيانات استخدام فعلي لقياسه." },
  },

  /* ---------------- Part I: status ---------------- */
  {
    type: "section", id: "part-i", num: "I",
    title: { en: "Current project status", ar: "الحالة الحالية للمشروع" },
    lead: { en: "What is live, what is half-built, what is only a name, and what is missing.", ar: "ما المتاح، وما المبني جزئيًا، وما هو مجرد اسم، وما المفقود." },
  },
  {
    type: "table", id: "status-detail", legend: true,
    kicker: { en: "Current status", ar: "الحالة الحالية" },
    title: { en: "Feature status in detail", ar: "حالة الخصائص بالتفصيل" },
    cols: [{ en: "Area", ar: "المجال" }, { en: "Live in the app", ar: "متاح في التطبيق" }, { en: "Server only or in progress", ar: "في الخادم فقط أو قيد التطوير" }],
    rows: [
      [{ en: "Platform", ar: "المنصة" }, { en: "Companies, plans, modules, subscriptions, platform invoices, payments, revenue reports", ar: "الشركات، الخطط، الوحدات، الاشتراكات، فواتير المنصة، المدفوعات، تقارير الإيرادات" }, { en: "Online payment: absent", ar: "الدفع الإلكتروني: غير موجود" }],
      [{ en: "Company", ar: "الشركة" }, { en: "Users, departments, teams, roles, permission groups, profile, branding, locations", ar: "المستخدمون، الأقسام، الفرق، الأدوار، مجموعات الصلاحيات، الملف، الهوية، المواقع" }, { en: "Per-field hiding of sales data (server)", ar: "إخفاء حقول المبيعات (خادم)" }],
      [{ en: "Inventory", ar: "المخزون" }, { en: "Products, variants, categories, brands, warehouses, zones, shelves, suppliers, price lists, stock levels, ledger", ar: "المنتجات، المتغيرات، التصنيفات، العلامات، المخازن، المناطق، الأرفف، الموردون، قوائم الأسعار، الأرصدة، السجل" }, { en: "Transfers & adjustments (branch); cycle counts, batches, serials, bills of materials (server)", ar: "التحويلات والتسويات (فرع عمل)؛ الجرد، الدفعات، الأرقام التسلسلية، قوائم المكونات (خادم)" }],
      [{ en: "Purchasing", ar: "المشتريات" }, { en: "Supplier payments, debit notes", ar: "مدفوعات الموردين، الإشعارات المدينة" }, { en: "Requisitions, purchase orders, goods receipts, supplier invoices, approvals (server)", ar: "طلبات الشراء، أوامر الشراء، الاستلام، فواتير الموردين، الاعتمادات (خادم)" }],
      [{ en: "Sales & returns", ar: "المبيعات والمرتجعات" }, { en: "Customers, orders, deliveries, invoices, payments, refunds, customer and supplier returns", ar: "العملاء، الأوامر، التسليمات، الفواتير، التحصيل، الاسترداد، مرتجعات العملاء والموردين" }, { en: "Overdue status not automated", ar: "حالة التأخر غير مؤتمتة" }],
      [{ en: "Accounting", ar: "المحاسبة" }, { en: "Chart of accounts, journal, automatic entries, fiscal years and periods, 8 reports", ar: "دليل الحسابات، القيود، القيود التلقائية، السنوات والفترات المالية، 8 تقارير" }, { en: "Fixed assets, expenses module, bank reconciliation: absent", ar: "الأصول الثابتة، وحدة المصروفات، التسوية البنكية: غير موجودة" }],
      [{ en: "Analytics", ar: "التحليلات" }, { en: "7 dashboards, 30 reports, Excel", ar: "7 لوحات، 30 تقريرًا، Excel" }, { en: "Saved reports, email schedules (server)", ar: "التقارير المحفوظة، الجدولة بالبريد (خادم)" }],
      [{ en: "Production & quality", ar: "الإنتاج والجودة" }, "—", { en: "Work orders, inspections, NCRs, quarantine, planning, webhooks (server)", ar: "أوامر التشغيل، الفحوصات، عدم المطابقة، الحجر، التخطيط، Webhooks (خادم)" }],
      [{ en: "People", ar: "الأفراد" }, "—", { en: "Attendance, time tracking, payroll: names only. Custody: absent", ar: "الحضور وتتبع الوقت والرواتب: أسماء فقط. العُهد: غير موجودة" }],
    ],
  },
  {
    type: "cards", id: "limits", cols: 3,
    kicker: { en: "Current status", ar: "الحالة الحالية" },
    title: { en: "Known limitations in live features", ar: "قيود معروفة في الخصائص المتاحة" },
    lead: { en: "Recorded in the project's backend request list and confirmed in the code.", ar: "مسجلة في قائمة طلبات الخادم في المشروع ومؤكدة في الكود." },
    cards: [
      { icon: "alert", s: "partial", t: { en: "Overdue invoices", ar: "الفواتير المتأخرة" }, d: { en: "Nothing moves an unpaid sales invoice past its due date to overdue, so overdue filters stay empty. Aging still works.", ar: "لا شيء ينقل فاتورة غير مسددة بعد استحقاقها إلى «متأخرة»، فتبقى فلاتر التأخر فارغة. تقرير الأعمار يعمل." } },
      { icon: "box", s: "partial", t: { en: "Opening stock", ar: "رصيد أول المدة" }, d: { en: "Loading it through an adjustment credits a cost-of-sales account and distorts the first month's margin.", ar: "إدخاله عبر تسوية يقيّد في حساب تكلفة مبيعات ويشوّه هامش الشهر الأول." } },
      { icon: "eye", s: "partial", t: { en: "Stock filters", ar: "فلاتر المخزون" }, d: { en: "The ledger and reservations cannot be filtered by item or warehouse; there is no stock-level endpoint.", ar: "لا يمكن تصفية السجل والحجوزات حسب الصنف أو المخزن، ولا توجد نقطة خادم لأرصدة المخزون." } },
      { icon: "globe", s: "partial", t: { en: "English labels in analytics", ar: "نصوص إنجليزية في التحليلات" }, d: { en: "Some alert messages and chart categories arrive from the server in English only.", ar: "بعض رسائل التنبيه وفئات الرسوم تصل من الخادم بالإنجليزية فقط." } },
      { icon: "coins", s: "partial", t: { en: "Currency", ar: "العملة" }, d: { en: "Customers and documents default to USD; there is no exchange-rate handling.", ar: "العملاء والمستندات افتراضيًا بالدولار الأمريكي، ولا توجد معالجة لأسعار الصرف." } },
      { icon: "box", s: "partial", t: { en: "Units of measure", ar: "وحدات القياس" }, d: { en: "One text unit per product with no conversion between units such as piece, box and carton.", ar: "وحدة نصية واحدة لكل منتج دون تحويل بين الوحدات مثل القطعة والعلبة والكرتونة." } },
    ],
  },

  /* ---------------- Part J: gaps and roadmap ---------------- */
  {
    type: "section", id: "part-j", num: "J",
    title: { en: "Gaps and roadmap", ar: "الفجوات وخارطة الطريق" },
    lead: { en: "Questions only the business can answer, then the recommended order of work.", ar: "أسئلة لا تجيب عنها إلا الإدارة، ثم الترتيب المقترح للعمل." },
  },
  {
    type: "questions", id: "questions",
    kicker: { en: "Business questions", ar: "أسئلة للإدارة" },
    title: { en: "Decisions needed before the next build steps", ar: "قرارات مطلوبة قبل خطوات البناء التالية" },
    items: [
      { q: { en: "Do you sell the same item in more than one unit?", ar: "هل تبيعون الصنف نفسه بأكثر من وحدة؟" }, why: { en: "For example piece and carton: decides whether units need conversion.", ar: "مثل القطعة والكرتونة: يحدد الحاجة لتحويل الوحدات." } },
      { q: { en: "Must an invoice wait for full delivery?", ar: "هل يجب أن تنتظر الفاتورة التسليم الكامل؟" }, why: { en: "Today yes. Cash sales at the counter and per-load invoicing need a rule.", ar: "اليوم نعم. البيع النقدي الفوري والفوترة لكل حمولة يحتاجان قاعدة." } },
      { q: { en: "Which currency, and is more than one needed?", ar: "ما العملة، وهل نحتاج أكثر من عملة؟" }, why: { en: "Documents default to USD.", ar: "المستندات افتراضيًا بالدولار." } },
      { q: { en: "How should opening stock and opening balances be loaded?", ar: "كيف يُدخل رصيد أول المدة والأرصدة الافتتاحية؟" }, why: { en: "No correct path exists for stock, customers or suppliers.", ar: "لا يوجد مسار صحيح للمخزون أو العملاء أو الموردين." } },
      { q: { en: "When is an invoice overdue, and who is reminded?", ar: "متى تُعتبر الفاتورة متأخرة، ومن يُذكَّر؟" }, why: { en: "Grace days, reminders, and whether overdue customers are blocked.", ar: "أيام السماح والتذكيرات وهل يُوقَف العميل المتأخر." } },
      { q: { en: "Block or warn when credit is exceeded?", ar: "منع أم تحذير عند تجاوز الائتمان؟" }, why: { en: "Today the order is blocked; some companies allow a manager override.", ar: "اليوم يُمنع الأمر؛ وبعض الشركات تسمح باستثناء من المدير." } },
      { q: { en: "How are post-dated cheques handled?", ar: "كيف تُعالج الشيكات الآجلة؟" }, why: { en: "Needs due date, bank, and collected / bounced status.", ar: "تحتاج تاريخ استحقاق وبنكًا وحالة تحصيل أو ارتداد." } },
      { q: { en: "Which purchases need approval, above what amount?", ar: "أي المشتريات تحتاج اعتمادًا، وفوق أي مبلغ؟" }, why: { en: "Workflows exist but have no amount thresholds.", ar: "المسارات موجودة لكن بلا حدود للمبالغ." } },
      { q: { en: "What does “custody” (عُهد) mean for you?", ar: "ماذا تعني «العُهد» لديكم؟" }, why: { en: "Cash advances, tools, vehicles, or all three.", ar: "سلف نقدية، أو أدوات، أو سيارات، أو كلها." } },
      { q: { en: "Expenses: journal entries enough, or a module?", ar: "المصروفات: تكفي القيود أم نحتاج وحدة؟" }, why: { en: "Categories, petty cash, receipts and approvals.", ar: "تصنيفات، ونثرية، وإيصالات، واعتمادات." } },
      { q: { en: "Attendance and payroll: build, integrate or remove from plans?", ar: "الحضور والرواتب: نبني أم نتكامل أم نحذفها من الخطط؟" }, why: { en: "They are sold in plans with nothing behind them.", ar: "تُباع في الخطط دون أي تنفيذ خلفها." } },
      { q: { en: "Do you produce or assemble, and what do you need beyond work orders?", ar: "هل تُنتجون أو تجمّعون، وما الذي تحتاجونه بعد أوامر التشغيل؟" }, why: { en: "Production planning, labor cost, machines, scrap.", ar: "تخطيط الإنتاج وتكلفة العمالة والماكينات والهالك." } },
      { q: { en: "Is tax e-invoicing required for your customers?", ar: "هل الفاتورة الإلكترونية الضريبية مطلوبة لعملائكم؟" }, why: { en: "Not in the project; may be a legal requirement in your market.", ar: "غير موجودة في المشروع، وقد تكون إلزامية قانونيًا في سوقكم." } },
      { q: { en: "Do you need several price lists?", ar: "هل تحتاجون أكثر من قائمة أسعار؟" }, why: { en: "Wholesale and retail, or prices per customer group. Today each variant has one standard price.", ar: "جملة وتجزئة، أو أسعار لكل فئة عملاء. اليوم لكل متغير سعر قياسي واحد." } },
    ],
  },
  {
    type: "timeline", id: "roadmap", cols: 3,
    kicker: { en: "Roadmap", ar: "خارطة الطريق" },
    title: { en: "Recommended order of work", ar: "الترتيب المقترح للعمل" },
    steps: [
      { s: "wip", t: { en: "Now · finish what is started", ar: "الآن · إكمال ما بدأ" }, d: { en: "Merge transfers and adjustments; build purchasing screens (requisition, PO, receipt, supplier invoice); run the multi-company test campaign; deploy.", ar: "دمج التحويلات والتسويات؛ بناء شاشات المشتريات (طلب، أمر، استلام، فاتورة مورد)؛ تنفيذ حملة الاختبار متعددة الشركات؛ النشر." } },
      { s: "partial", t: { en: "Next · open the server-ready modules", ar: "التالي · فتح الوحدات الجاهزة في الخادم" }, d: { en: "Cycle counts, approvals, reorder suggestions, quality, batches and serials screens; fix overdue, opening stock, stock filters and Arabic analytics labels.", ar: "شاشات الجرد والاعتمادات واقتراحات إعادة الطلب والجودة والدفعات والأرقام التسلسلية؛ ومعالجة التأخر ورصيد أول المدة وفلاتر المخزون ونصوص التحليلات العربية." } },
      { s: "proposed", t: { en: "Later · after business decisions", ar: "لاحقًا · بعد قرارات الإدارة" }, d: { en: "Units and price lists, cheques, expenses, custody, production, e-invoicing, attendance and payroll (or remove them from plans).", ar: "الوحدات وقوائم الأسعار، الشيكات، المصروفات، العُهد، الإنتاج، الفاتورة الإلكترونية، الحضور والرواتب (أو حذفها من الخطط)." } },
    ],
    note: { en: "“Now” follows the project's own handoff plan; “Next” and “Later” are our recommendation.", ar: "مرحلة «الآن» تتبع خطة التسليم في المشروع، و«التالي» و«لاحقًا» توصيتنا." },
  },

  /* ---------------- Part K: recommendations ---------------- */
  {
    type: "section", id: "part-k", num: "K",
    title: { en: "Recommendations to grow the business", ar: "توصيات لتنمية الأعمال" },
    lead: {
      en: "Ideas that would make Tanzim more useful for companies. All are proposals: none exists in the code today.",
      ar: "أفكار تجعل تنظيم أكثر فائدة للشركات. كلها مقترحات ولا يوجد أي منها في الكود اليوم.",
    },
  },
  {
    type: "cards", id: "rec-trade", cols: 3, status: "proposed",
    kicker: { en: "Recommendations · sales and cash", ar: "توصيات · المبيعات والتحصيل" },
    title: { en: "Sell faster and collect on time", ar: "بيع أسرع وتحصيل في موعده" },
    cards: [
      { icon: "box", s: "proposed", t: { en: "Units and conversions", ar: "الوحدات والتحويلات" }, d: { en: "Sell the same item by piece, box or carton with automatic conversion and prices per unit.", ar: "بيع الصنف نفسه بالقطعة أو العلبة أو الكرتونة مع تحويل تلقائي وسعر لكل وحدة." } },
      { icon: "chart", s: "proposed", t: { en: "Price lists", ar: "قوائم الأسعار" }, d: { en: "Wholesale, retail and per-customer price lists with history and a margin check against the last cost.", ar: "قوائم أسعار للجملة والتجزئة ولكل عميل، مع السجل ومراجعة الهامش مقابل آخر تكلفة." } },
      { icon: "cart", s: "proposed", t: { en: "Counter sale in one step", ar: "بيع فوري بخطوة واحدة" }, d: { en: "Order, pick-up delivery, invoice and cash payment from a single screen for walk-in buyers.", ar: "أمر، تسليم من المخزن، فاتورة، وتحصيل نقدي من شاشة واحدة للمشتري المباشر." } },
      { icon: "receipt", s: "proposed", t: { en: "Cheque book", ar: "دفتر الشيكات" }, d: { en: "Post-dated cheques received and issued, due-date calendar, collected and bounced status.", ar: "الشيكات الآجلة الواردة والصادرة، تقويم الاستحقاق، وحالة التحصيل والارتداد." } },
      { icon: "coins", s: "proposed", t: { en: "Collections desk", ar: "مكتب التحصيل" }, d: { en: "Daily list from aging, reminders by SMS or WhatsApp, promised-payment dates, credit hold.", ar: "قائمة يومية من أعمار الديون، تذكير بالرسائل أو واتساب، مواعيد سداد موعودة، وإيقاف الائتمان." } },
      { icon: "truck", s: "proposed", t: { en: "Delivery tracking", ar: "تتبع التوصيل" }, d: { en: "Driver, vehicle and proof of delivery on every delivery note, with a daily route list.", ar: "السائق والسيارة وإثبات الاستلام على كل إذن تسليم، مع قائمة توصيل يومية." } },
    ],
  },
  {
    type: "cards", id: "rec-ops", cols: 3, status: "proposed",
    kicker: { en: "Recommendations · operations and finance", ar: "توصيات · العمليات والمالية" },
    title: { en: "Close the gaps owners ask about first", ar: "سد الفجوات التي يسأل عنها الملاك أولًا" },
    cards: [
      { icon: "file", s: "proposed", t: { en: "Opening-balance wizard", ar: "معالج الأرصدة الافتتاحية" }, d: { en: "Load stock, customer balances and supplier balances on day one, posted to opening-balance equity.", ar: "إدخال المخزون وأرصدة العملاء والموردين في اليوم الأول، مرحّلة إلى حساب الأرصدة الافتتاحية." } },
      { icon: "coins", s: "proposed", t: { en: "Expenses and petty cash", ar: "المصروفات والنثرية" }, d: { en: "Expense categories, receipt photos, approval, and a petty-cash box per branch posting to the ledger.", ar: "تصنيفات مصروفات، صور إيصالات، اعتماد، وصندوق نثرية لكل فرع يُرحَّل إلى الدفاتر." } },
      { icon: "key", s: "proposed", t: { en: "Custody register", ar: "سجل العُهد" }, d: { en: "Cash advances and tools held by employees, with handover, settlement and outstanding balance per person.", ar: "السلف النقدية والأدوات مع الموظفين، مع التسليم والتسوية والرصيد القائم لكل شخص." } },
      { icon: "factory", s: "proposed", t: { en: "Production", ar: "الإنتاج" }, d: { en: "Production planning, labor and machine cost, and scrap on top of the existing work orders.", ar: "تخطيط الإنتاج وتكلفة العمالة والماكينات والهالك فوق أوامر التشغيل الحالية." } },
      { icon: "clock", s: "proposed", t: { en: "People module, or remove it", ar: "وحدة الأفراد أو حذفها" }, d: { en: "Either build attendance and payroll, integrate an HR product, or stop selling those plan modules.", ar: "إما بناء الحضور والرواتب، أو التكامل مع نظام موارد بشرية، أو إيقاف بيع هذه الوحدات في الخطط." } },
      { icon: "receipt", s: "proposed", t: { en: "Tax e-invoicing", ar: "الفاتورة الإلكترونية" }, d: { en: "Connect issued invoices to the tax authority's e-invoicing system if your market requires it.", ar: "ربط الفواتير المصدرة بمنظومة الفاتورة الإلكترونية لمصلحة الضرائب إذا كان سوقكم يتطلبها." } },
    ],
  },
  {
    type: "cards", id: "rec-adoption", cols: 3, status: "proposed",
    kicker: { en: "Recommendations · rollout", ar: "توصيات · بدء التشغيل" },
    title: { en: "Make the first customers successful", ar: "إنجاح العملاء الأوائل" },
    cards: [
      { icon: "file", s: "proposed", t: { en: "Industry starter packs", ar: "حزم بداية حسب النشاط" }, d: { en: "Ready import templates and role setups for common activities (retail, wholesale, distribution, services).", ar: "قوالب استيراد وإعداد أدوار جاهزة للأنشطة الشائعة (تجزئة، جملة، توزيع، خدمات)." } },
      { icon: "users", s: "proposed", t: { en: "Pilot with one company", ar: "تجربة مع شركة واحدة" }, d: { en: "Run one real company for a month and measure order-to-invoice time and stock accuracy before and after.", ar: "تشغيل شركة حقيقية لمدة شهر وقياس زمن الدورة من الأمر للفاتورة ودقة المخزون قبل وبعد." } },
      { icon: "eye", s: "proposed", t: { en: "Storekeeper on a phone", ar: "أمين المخزن على الهاتف" }, d: { en: "Simple mobile screens for receiving, delivering and counting with barcode scanning.", ar: "شاشات هاتف بسيطة للاستلام والتسليم والجرد بمسح الباركود." } },
      { icon: "bell", s: "proposed", t: { en: "Alerts that matter", ar: "تنبيهات مفيدة" }, d: { en: "Push low stock, credit-limit breaches and overdue customers to the owner's phone.", ar: "إرسال نقص الرصيد وتجاوز الائتمان والعملاء المتأخرين إلى هاتف المالك." } },
      { icon: "chart", s: "proposed", t: { en: "Owner's daily summary", ar: "ملخص يومي للمالك" }, d: { en: "Use the existing report schedules to email yesterday's sales, cash and receivables each morning.", ar: "استخدام جدولة التقارير الموجودة لإرسال مبيعات الأمس والنقدية والمستحقات بالبريد كل صباح." } },
      { icon: "card", s: "proposed", t: { en: "Clear plan packaging", ar: "تغليف واضح للخطط" }, d: { en: "Sell plans that match the live modules (Sales & Stock, + Accounting, + Production) with a trial.", ar: "بيع خطط تطابق الوحدات المتاحة (المبيعات والمخزون، + المحاسبة، + الإنتاج) مع فترة تجريبية." } },
    ],
  },

  /* ---------------- Glossary and close ---------------- */
  {
    type: "table", id: "glossary",
    kicker: { en: "Glossary", ar: "قاموس المصطلحات" },
    title: { en: "Terms used in this presentation", ar: "المصطلحات المستخدمة في العرض" },
    cols: [{ en: "English", ar: "الإنجليزية" }, { en: "Arabic", ar: "العربية" }, { en: "Meaning", ar: "المعنى" }],
    rows: [
      ["Variant / SKU", "المتغير", { en: "The exact stocked item, e.g. a laptop model", ar: "الصنف الفعلي المخزَّن، مثل موديل لابتوب" }],
      ["Stock ledger", "سجل حركة المخزون", { en: "Every movement in or out; balances come from it", ar: "كل حركة داخلة أو خارجة؛ ومنه تأتي الأرصدة" }],
      ["Reservation", "الحجز", { en: "Stock held for a confirmed order", ar: "رصيد محجوز لأمر مؤكد" }],
      ["Delivery note", "إذن التسليم", { en: "Document that issues goods to a customer", ar: "مستند صرف البضاعة للعميل" }],
      ["Goods receipt", "إذن الاستلام", { en: "Document that brings purchased goods into stock", ar: "مستند إدخال البضاعة المشتراة للمخزن" }],
      ["GRNI", "بضاعة مستلمة لم تُفوتر", { en: "Liability between receipt and supplier invoice", ar: "التزام بين الاستلام وفاتورة المورد" }],
      ["Three-way match", "المطابقة الثلاثية", { en: "Order vs receipt vs supplier invoice", ar: "أمر الشراء مقابل الاستلام مقابل فاتورة المورد" }],
      ["Credit / debit note", "إشعار دائن / مدين", { en: "Reduces what a customer owes / what you owe a supplier", ar: "يخفّض ما على العميل / ما عليك للمورد" }],
      ["RMA", "مرتجع عميل", { en: "Authorized customer return", ar: "مرتجع عميل معتمد" }],
      ["Work order", "أمر التشغيل", { en: "Assembly, disassembly or repair job", ar: "مهمة تجميع أو تفكيك أو إصلاح" }],
      ["NCR", "تقرير عدم مطابقة", { en: "Record of a quality failure and its fix", ar: "سجل إخفاق جودة ومعالجته" }],
      ["Aging", "أعمار الديون", { en: "Open balances grouped by days overdue", ar: "الأرصدة المفتوحة مجمعة حسب أيام التأخر" }],
      ["Custody", "العُهدة", { en: "Cash or assets held by an employee (not in the project)", ar: "نقدية أو أصول في عهدة موظف (غير موجودة في المشروع)" }],
    ],
  },
  {
    type: "section", id: "close", num: "✓",
    title: { en: "A strong core, clear next steps", ar: "نواة قوية وخطوات تالية واضحة" },
    lead: {
      en: "Sales, returns, stock visibility and accounting run today. Purchasing screens are next, followed by the modules the server already supports. Decisions on the 14 business questions shape everything after that.",
      ar: "المبيعات والمرتجعات ورؤية المخزون والمحاسبة تعمل اليوم. شاشات المشتريات هي الخطوة التالية، ثم الوحدات التي يدعمها الخادم بالفعل. وقراراتكم في الأسئلة الأربعة عشر تحدد ما بعد ذلك.",
    },
    chips: [
      { en: "Supporting notes: docs/business-presentation/VERIFICATION.md", ar: "ملاحظات داعمة: docs/business-presentation/VERIFICATION.md" },
    ],
  },
);
