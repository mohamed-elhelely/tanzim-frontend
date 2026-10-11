/* Part 1: cover, overview and the company lifecycle. */
TANZIM_DECK.slides.push(
  {
    type: "cover", id: "cover",
    title: { en: "Tanzim ERP: one system to run your company", ar: "تنظيم ERP: نظام واحد لإدارة شركتك" },
    kicker: { en: "Business presentation", ar: "عرض تعريفي للأعمال" },
    lead: {
      en: "What the system does today, how a company runs on it from setup to monthly reporting, and what still has to be built.",
      ar: "ما يقدمه النظام اليوم، وكيف تعمل الشركة عليه من التأسيس حتى التقارير الشهرية، وما الذي ما زال يحتاج إلى بناء.",
    },
    meta: [
      { en: "Source: frontend + backend code, API_REFERENCE.md, BUSINESS_LOGIC.md", ar: "المصدر: كود الواجهة والخادم، API_REFERENCE.md، BUSINESS_LOGIC.md" },
      { en: "Status as of 11 October 2026", ar: "الحالة في 11 أكتوبر 2026" },
    ],
  },
  {
    type: "cards", id: "how-to-read", cols: 3,
    kicker: { en: "Before we start", ar: "قبل أن نبدأ" },
    title: { en: "How to read this presentation", ar: "كيف تقرأ هذا العرض" },
    lead: {
      en: "Every feature carries a status label. Only “Live in the app” means a business user can do it today from the screens.",
      ar: "كل خاصية عليها علامة حالة. علامة «متاح ويعمل» وحدها تعني أن المستخدم يستطيع تنفيذها اليوم من الشاشات.",
    },
    cards: [
      { s: "live", t: { en: "Live in the app", ar: "متاح ويعمل" }, d: { en: "Built in the server and in the screens, on the main branch.", ar: "منفّذ في الخادم وفي الشاشات، على الفرع الرئيسي." } },
      { s: "partial", t: { en: "Backend ready, no screens", ar: "جاهز في الخادم بلا شاشات" }, d: { en: "Rules and APIs exist and are tested; users cannot reach them until screens are built.", ar: "القواعد والواجهات البرمجية موجودة ومختبرة، لكن المستخدم لا يصل إليها حتى تُبنى الشاشات." } },
      { s: "wip", t: { en: "Screens in progress", ar: "الشاشات قيد التطوير" }, d: { en: "Screens exist on a work branch and are not merged yet.", ar: "الشاشات موجودة على فرع عمل ولم تُدمج بعد." } },
      { s: "placeholder", t: { en: "Name only, no logic", ar: "اسم فقط بلا تنفيذ" }, d: { en: "Appears in a list (for example a subscription plan) with nothing behind it.", ar: "يظهر في قائمة (مثل خطط الاشتراك) دون أي تنفيذ خلفه." } },
      { s: "absent", t: { en: "Not in the project", ar: "غير موجود في المشروع" }, d: { en: "Requested in business discussions but not present in code or documents.", ar: "مطلوب في نقاشات العمل لكنه غير موجود في الكود أو المستندات." } },
      { s: "proposed", t: { en: "Proposed", ar: "مقترح" }, d: { en: "Our recommendation for the roadmap. Needs a business decision first.", ar: "توصية لخارطة الطريق، وتحتاج قرارًا من الإدارة أولًا." } },
    ],
  },

  /* ---------------- Part A: overview ---------------- */
  {
    type: "section", id: "part-a", num: "A",
    title: { en: "Project overview", ar: "نظرة عامة على المشروع" },
    lead: { en: "What Tanzim is, who it is for, and the problems it addresses.", ar: "ما هو تنظيم، ولمن صُمّم، وما المشكلات التي يعالجها." },
  },
  {
    type: "cards", id: "what-is", cols: 3,
    kicker: { en: "Project overview", ar: "نظرة عامة" },
    title: { en: "One cloud system for buying, storing, selling and accounting", ar: "نظام سحابي واحد للشراء والتخزين والبيع والمحاسبة" },
    lead: {
      en: "Tanzim (“organization” in Arabic) is a multi-company ERP delivered as a subscription. Many companies share the platform, and each company sees only its own data.",
      ar: "«تنظيم» نظام ERP سحابي يُقدَّم بالاشتراك. تشترك شركات كثيرة في المنصة نفسها، وكل شركة ترى بياناتها فقط.",
    },
    cards: [
      { icon: "warehouse", t: { en: "Inventory", ar: "المخزون" }, d: { en: "Products, warehouses down to the shelf, and a stock ledger that records every unit in and out.", ar: "المنتجات، والمخازن حتى مستوى الرف، وسجل حركة يقيّد كل وحدة داخلة وخارجة." } },
      { icon: "cart", t: { en: "Sales and collection", ar: "المبيعات والتحصيل" }, d: { en: "Customers with credit limits, orders, deliveries, invoices and payments.", ar: "عملاء بحدود ائتمان، وأوامر بيع، وتسليمات، وفواتير، وتحصيل." } },
      { icon: "return", t: { en: "Returns", ar: "المرتجعات" }, d: { en: "Customer returns with inspection, and returns to suppliers.", ar: "مرتجعات العملاء مع الفحص، والمرتجعات إلى الموردين." } },
      { icon: "ledger", t: { en: "Accounting", ar: "المحاسبة" }, d: { en: "Double-entry ledger that posts journal entries automatically from operations.", ar: "دفتر أستاذ بالقيد المزدوج يُنشئ القيود تلقائيًا من العمليات." } },
      { icon: "chart", t: { en: "Dashboards and reports", ar: "لوحات المتابعة والتقارير" }, d: { en: "Seven role dashboards and 30 analytical reports with Excel export.", ar: "سبع لوحات متابعة حسب الدور و30 تقريرًا تحليليًا مع التصدير إلى Excel." } },
      { icon: "globe", t: { en: "Arabic and English", ar: "عربي وإنجليزي" }, d: { en: "Every screen in both languages, with right-to-left layout for Arabic, light and dark themes.", ar: "كل شاشة باللغتين، بتخطيط من اليمين لليسار للعربية، ووضعين فاتح وداكن." } },
    ],
  },
  {
    type: "cards", id: "problems", cols: 3,
    kicker: { en: "Business problems", ar: "مشكلات الأعمال" },
    title: { en: "Problems a trading or manufacturing company faces, and Tanzim's answer", ar: "مشكلات تواجه الشركات التجارية والصناعية، وكيف يعالجها تنظيم" },
    cards: [
      { icon: "alert", t: { en: "Stock nobody can confirm", ar: "رصيد لا يستطيع أحد تأكيده" }, d: { en: "Balances live in notebooks and spreadsheets. **Tanzim:** a single stock ledger per item and warehouse; the balance is the sum of recorded movements.", ar: "الأرصدة في دفاتر وجداول متفرقة. **تنظيم:** سجل حركة واحد لكل صنف ومخزن، والرصيد هو مجموع الحركات المسجلة." }, s: "live" },
      { icon: "coins", t: { en: "Credit sales out of control", ar: "بيع آجل بلا ضوابط" }, d: { en: "Goods leave before anyone checks what the customer owes. **Tanzim:** an order cannot be confirmed above the customer's available credit.", ar: "تخرج البضاعة قبل مراجعة مديونية العميل. **تنظيم:** لا يمكن تأكيد أمر بيع يتجاوز الائتمان المتاح للعميل." }, s: "live" },
      { icon: "cart", t: { en: "Selling stock you do not have", ar: "بيع بضاعة غير متوفرة" }, d: { en: "Two salespeople promise the same goods. **Tanzim:** confirming an order checks available stock and reserves it.", ar: "يعد بائعان العميل بالبضاعة نفسها. **تنظيم:** تأكيد الأمر يفحص الرصيد المتاح ويحجزه." }, s: "live" },
      { icon: "ledger", t: { en: "Accounts that lag behind the warehouse", ar: "حسابات متأخرة عن المخزن" }, d: { en: "Accountants re-key invoices weeks later. **Tanzim:** invoices, payments, deliveries and receipts post journal entries automatically.", ar: "يعيد المحاسب إدخال الفواتير بعد أسابيع. **تنظيم:** الفواتير والتحصيل والتسليم والاستلام تُنشئ القيود تلقائيًا." }, s: "live" },
      { icon: "return", t: { en: "Returns that vanish", ar: "مرتجعات تختفي" }, d: { en: "Returned goods are not inspected or traced. **Tanzim:** every return is approved, received, inspected and closed with a recorded decision.", ar: "البضاعة المرتجعة لا تُفحص ولا تُتتبع. **تنظيم:** كل مرتجع يُعتمد ويُستلم ويُفحص ويُغلق بقرار مسجّل." }, s: "live" },
      { icon: "eye", t: { en: "Owners without a clear view", ar: "إدارة بلا رؤية واضحة" }, d: { en: "Decisions are made on gut feeling. **Tanzim:** role dashboards for revenue, margin, stock value, receivables and aging.", ar: "القرارات تُتخذ بالحدس. **تنظيم:** لوحات متابعة للإيرادات والهامش وقيمة المخزون والمستحقات وأعمار الديون." }, s: "live" },
    ],
  },
  {
    type: "cols", id: "customers",
    kicker: { en: "Target customers and value", ar: "العملاء المستهدفون والقيمة" },
    title: { en: "Built for companies that buy, store and sell; production features are on the way", ar: "مصمَّم للشركات التي تشتري وتخزّن وتبيع، وخصائص الإنتاج في الطريق" },
    cols: [
      {
        icon: "warehouse", s: "live",
        t: { en: "Trading, distribution and retail companies", ar: "شركات التجارة والتوزيع والتجزئة" },
        d: { en: "The supported core today:", ar: "الجزء المدعوم اليوم:" },
        list: [
          { en: "Several warehouses or branches, each split into zones and shelves", ar: "عدة مخازن أو فروع، كل منها مقسّم إلى مناطق وأرفف" },
          { en: "Products with variants (for example size or color) and decimal quantities", ar: "منتجات لها متغيرات (مثل المقاس أو اللون) وكميات عشرية" },
          { en: "Credit customers with limits, partial deliveries and partial payments", ar: "عملاء آجل بحدود ائتمان، وتسليم جزئي وتحصيل جزئي" },
          { en: "Supplier price lists and supplier returns", ar: "قوائم أسعار الموردين ومرتجعات الموردين" },
          { en: "Automatic accounting and receivables aging", ar: "محاسبة تلقائية وأعمار ديون العملاء" },
        ],
      },
      {
        icon: "factory", s: "partial",
        t: { en: "Companies that assemble or produce", ar: "الشركات التي تجمّع أو تُنتج" },
        d: { en: "Ready in the server, waiting for screens:", ar: "جاهز في الخادم وينتظر الشاشات:" },
        list: [
          { en: "Bills of materials and work orders that consume components and produce finished goods", ar: "قوائم مكونات وأوامر تشغيل تصرف المكونات وتُنتج المنتج التام" },
          { en: "Quality inspections, non-conformance reports and quarantine", ar: "فحوصات الجودة وتقارير عدم المطابقة والحجر" },
          { en: "Purchasing from requisition to supplier invoice", ar: "المشتريات من طلب الشراء حتى فاتورة المورد" },
          { en: "Not covered at all: production planning, machine routing, labor and scrap costing", ar: "غير مغطى إطلاقًا: تخطيط الإنتاج، ومسارات الماكينات، وتكلفة العمالة والهالك" },
        ],
      },
    ],
    note: {
      en: "**Value proposition:** one record of every document and stock movement, controlled credit, and books that stay current without re-typing, in Arabic or English.",
      ar: "**القيمة المقدمة:** سجل واحد لكل مستند وكل حركة مخزون، وائتمان منضبط، ودفاتر محاسبية محدّثة دون إعادة إدخال، بالعربية أو الإنجليزية.",
    },
  },
  {
    type: "stats", id: "at-a-glance",
    kicker: { en: "At a glance", ar: "في لمحة" },
    title: { en: "The platform in numbers, counted from the code", ar: "المنصة بالأرقام، محسوبة من الكود" },
    stats: [
      { v: "12", l: { en: "business modules live in the app", ar: "وحدة أعمال متاحة في التطبيق" } },
      { v: "7", l: { en: "more modules ready in the server", ar: "وحدات أخرى جاهزة في الخادم" } },
      { v: "30", l: { en: "analytical report types", ar: "نوعًا من التقارير التحليلية" } },
      { v: "8", l: { en: "financial reports from the ledger", ar: "تقارير مالية من دفتر الأستاذ" } },
    ],
    cols: 3,
    cards: [
      { icon: "chart", t: { en: "7 role dashboards", ar: "7 لوحات متابعة" }, d: { en: "Overview, sales, inventory, finance, operations, purchasing, administration.", ar: "عامة، المبيعات، المخزون، المالية، العمليات، المشتريات، الإدارة." } },
      { icon: "shield", t: { en: "10 permission modules", ar: "10 وحدات صلاحيات" }, d: { en: "View, add, change and delete rights per resource, plus 22 ready-made permission groups per company.", ar: "صلاحيات عرض وإضافة وتعديل وحذف لكل مورد، و22 مجموعة صلاحيات جاهزة لكل شركة." } },
      { icon: "file", t: { en: "19 importable data sets", ar: "19 نوع بيانات قابل للاستيراد" }, d: { en: "Company structure, locations, catalog, warehouses, suppliers, batches and serials, via CSV or Excel.", ar: "هيكل الشركة والمواقع والكتالوج والمخازن والموردون والدفعات والأرقام التسلسلية عبر CSV أو Excel." } },
    ],
  },

  /* ---------------- Part B: company lifecycle ---------------- */
  {
    type: "section", id: "part-b", num: "B",
    title: { en: "The company lifecycle", ar: "دورة حياة الشركة" },
    lead: { en: "From the day a company subscribes to the day it closes its books for the year.", ar: "من يوم اشتراك الشركة حتى يوم إقفال دفاترها السنوية." },
  },
  {
    type: "timeline", id: "lifecycle", cols: 5,
    kicker: { en: "Company lifecycle", ar: "دورة حياة الشركة" },
    title: { en: "Ten stages from subscription to year-end close", ar: "عشر مراحل من الاشتراك حتى الإقفال السنوي" },
    steps: [
      { s: "live", t: { en: "Subscribe", ar: "الاشتراك" }, d: { en: "Tanzim staff create the company, its admin user and a subscription plan with modules.", ar: "ينشئ فريق تنظيم الشركة ومستخدمها المسؤول واشتراكًا بخطة ووحدات." } },
      { s: "live", t: { en: "Organize people", ar: "تنظيم الأفراد" }, d: { en: "Company admin adds departments, teams, users and roles with permissions.", ar: "يضيف مسؤول الشركة الأقسام والفرق والمستخدمين والأدوار بصلاحياتها." } },
      { s: "live", t: { en: "Map locations", ar: "تحديد المواقع" }, d: { en: "Country, governorate, city, district and site addresses for offices, branches and warehouses.", ar: "الدولة والمحافظة والمدينة والحي وعناوين المكاتب والفروع والمخازن." } },
      { s: "live", t: { en: "Build the catalog", ar: "بناء الكتالوج" }, d: { en: "Categories, brands, products, variants with cost and price; bulk import from Excel.", ar: "التصنيفات والعلامات والمنتجات والمتغيرات بالتكلفة والسعر، مع الاستيراد من Excel." } },
      { s: "live", t: { en: "Set up storage and suppliers", ar: "إعداد المخازن والموردين" }, d: { en: "Warehouses, zones, shelves, suppliers and supplier price lists.", ar: "المخازن والمناطق والأرفف والموردون وقوائم أسعارهم." } },
      { s: "wip", t: { en: "Load opening stock", ar: "إدخال رصيد أول المدة" }, d: { en: "Today only through a stock adjustment, which posts to the wrong account. A proper path is missing.", ar: "حاليًا عبر تسوية مخزون فقط، وهي تُرحَّل إلى حساب غير صحيح. لا يوجد مسار سليم بعد." } },
      { s: "partial", t: { en: "Buy and receive", ar: "الشراء والاستلام" }, d: { en: "Requisition, purchase order, goods receipt, supplier invoice. Server only.", ar: "طلب شراء، أمر شراء، استلام بضاعة، فاتورة مورد. في الخادم فقط." } },
      { s: "live", t: { en: "Sell, deliver, collect", ar: "البيع والتسليم والتحصيل" }, d: { en: "Order, delivery, invoice, payment and returns, with stock and credit checks.", ar: "أمر بيع، تسليم، فاتورة، تحصيل ومرتجعات، مع فحص الرصيد والائتمان." } },
      { s: "live", t: { en: "Monitor", ar: "المتابعة" }, d: { en: "Dashboards, reports, notifications, stock levels and the stock ledger.", ar: "لوحات المتابعة والتقارير والإشعارات وأرصدة المخزون وسجل الحركة." } },
      { s: "live", t: { en: "Close the books", ar: "إقفال الدفاتر" }, d: { en: "Close monthly periods in order, then close the fiscal year into retained earnings.", ar: "إقفال الفترات الشهرية بالترتيب، ثم إقفال السنة المالية إلى الأرباح المحتجزة." } },
    ],
  },
  {
    type: "cards", id: "ready-to-sell", cols: 4,
    kicker: { en: "Company lifecycle", ar: "دورة حياة الشركة" },
    title: { en: "What must exist before the first sale", ar: "ما يجب توفره قبل أول عملية بيع" },
    lead: { en: "The server enforces these links; a missing one stops the order at confirmation.", ar: "الخادم يفرض هذه الروابط، وغياب أي منها يوقف أمر البيع عند التأكيد." },
    cards: [
      { icon: "card", t: { en: "Active subscription", ar: "اشتراك فعّال" }, d: { en: "Status trial or active, with the inventory module (and accounting for the books).", ar: "حالة تجريبية أو فعّالة، مع وحدة المخزون (ووحدة المحاسبة للدفاتر)." } },
      { icon: "shield", t: { en: "A user with rights", ar: "مستخدم له صلاحيات" }, d: { en: "Access to the sales module plus add/change rights on sales orders.", ar: "صلاحية دخول وحدة المبيعات مع صلاحيات الإضافة والتعديل على أوامر البيع." } },
      { icon: "warehouse", t: { en: "A warehouse", ar: "مخزن" }, d: { en: "Each order ships from one warehouse; zones and shelves are optional.", ar: "كل أمر بيع يُصرف من مخزن واحد، والمناطق والأرفف اختيارية." } },
      { icon: "box", t: { en: "A sellable variant", ar: "متغير قابل للبيع" }, d: { en: "Product marked sellable, with a variant (SKU) and a standard price.", ar: "منتج قابل للبيع له متغير (SKU) وسعر قياسي." } },
      { icon: "box", t: { en: "Stock on hand", ar: "رصيد متاح" }, d: { en: "Available = ledger balance minus open reservations in that warehouse.", ar: "المتاح = رصيد السجل ناقص الحجوزات المفتوحة في ذلك المخزن." } },
      { icon: "users", t: { en: "A customer", ar: "عميل" }, d: { en: "Business or individual, numbered automatically (`CUST-00001`), with an optional credit limit.", ar: "شركة أو فرد، يُرقَّم تلقائيًا (`CUST-00001`)، مع حد ائتمان اختياري." } },
      { icon: "ledger", t: { en: "Chart of accounts", ar: "دليل الحسابات" }, d: { en: "Created automatically on first use; system accounts receive the automatic entries.", ar: "يُنشأ تلقائيًا عند أول استخدام، وتستقبل حسابات النظام القيود التلقائية." } },
      { icon: "pin", t: { en: "Locations (optional)", ar: "المواقع (اختياري)" }, d: { en: "Needed only for site addresses on warehouses and teams.", ar: "مطلوبة فقط لعناوين المخازن والفرق." } },
    ],
  },
);
