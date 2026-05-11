/* eslint-disable */
// Section 2. Prototype
// Full-bleed prototype stage. Floating top-right dropdown that groups the
// 20-product catalogue into 6 categories. Only the Smart Invoice flagship
// is interactive; everything else routes to a "Coming soon" stage.
//
// Reads window.MAL_PRODUCT_CATALOGUE (loaded from mal/product-catalogue.js).

const { useState: pS, useEffect: pE, useRef: pR } = React;

function SectionPrototype({ lang, setLang, isMobile }) {
  const isAr = lang === 'ar';
  const catalogue = window.MAL_PRODUCT_CATALOGUE || [];
  const flagshipId = 'p1-smart-invoice';

  // Honour cross-section deep-links: strategy doc CTAs stash the target
  // productId on window before navigating; pick it up on mount and clear.
  const initialProductId = (() => {
    const hint = typeof window !== 'undefined' ? window.__malNextProductId : null;
    if (hint && window.MAL_PRODUCT_BY_ID?.[hint]) {
      window.__malNextProductId = null;
      return hint;
    }
    return flagshipId;
  })();
  const [productId, setProductId] = pS(initialProductId);
  const [tourOpen, setTourOpen] = pS(false);
  const product = window.MAL_PRODUCT_BY_ID[productId] || window.MAL_PRODUCT_BY_ID[flagshipId];

  const [entryId, setEntryId] = pS(product?.defaultEntry || null);

  pE(() => {
    const p = window.MAL_PRODUCT_BY_ID[productId];
    setEntryId(p?.defaultEntry || null);
  }, [productId]);

  // Cross-section deep-link support: when a 'mal:nav' event arrives with
  // section='prototype' and a productId, pre-select that product. Fired
  // from inline links in the strategy doc so users can jump straight from
  // "Product 2 · Healthcare Receivables" → the matching live prototype.
  pE(() => {
    const onNav = (e) => {
      const target = e?.detail?.section;
      const pid = e?.detail?.productId;
      if (target !== 'prototype' || !pid) return;
      if (window.MAL_PRODUCT_BY_ID[pid]) setProductId(pid);
    };
    window.addEventListener('mal:nav', onNav);
    return () => window.removeEventListener('mal:nav', onNav);
  }, []);

  const Tour = window.MalTour;
  const TourBtn = window.MalTourButton;
  const tourSteps = buildPrototypeTourSteps(isAr, productId, entryId);

  // Map product id → which prototype to mount. P1 = Smart Invoice (full).
  // P2 = Healthcare Receivables (in-progress prototype). A11 = Embedded POS
  // Finance (in-progress prototype, the "P3" slot in the live demo).
  // Other products show ComingSoon.
  const hasPrototype =
    productId === 'p1-smart-invoice' ||
    productId === 'p2-healthcare-receivables' ||
    productId === 'a11-pos-mca';
  const showProto = hasPrototype && entryId === 'demo';

  return (
    <div dir={isAr ? 'rtl' : 'ltr'} style={{
      position: 'relative', minHeight: 'calc(100vh - 56px)',
      // Lavender wash so the toolbar and the around-phones area share
      // the same bluish background as the phone landing-screen gradient.
      background: 'linear-gradient(180deg, var(--mal-primary-50) 0%, var(--mal-surface) 380px)',
    }}>
      {/* Unified toolbar band at the top. All four controls live on one
          row so phones never overlap with any of them. */}
      <PrototypeToolbar
        catalogue={catalogue}
        productId={productId} entryId={entryId}
        setProductId={setProductId} setEntryId={setEntryId}
        lang={lang} setLang={setLang}
        showResetDemo={showProto}
        showLangToggle={showProto}
        onStartTour={TourBtn ? () => setTourOpen(true) : null}
        isAr={isAr} isMobile={isMobile}
      />

      <div style={{ minHeight: 'calc(100vh - 56px)', paddingTop: 12 }}>
        {!hasPrototype && <ComingSoon product={product} isAr={isAr}/>}
        {showProto && productId === 'p1-smart-invoice' && (
          <DemoMode embedded lang={lang} setLang={() => {}} isMobile={isMobile} onExit={() => {}}/>
        )}
        {showProto && productId === 'p2-healthcare-receivables' && window.HealthcareDemo && (
          <window.HealthcareDemo lang={lang} isMobile={isMobile}/>
        )}
        {showProto && productId === 'a11-pos-mca' && window.PosFinanceDemo && (
          <window.PosFinanceDemo lang={lang} isMobile={isMobile}/>
        )}
        {hasPrototype && entryId && entryId !== 'demo' && (
          <PersonaMount persona={entryId} lang={lang} isMobile={isMobile}/>
        )}
      </div>

      {Tour && tourOpen && (
        <Tour steps={tourSteps} onClose={() => setTourOpen(false)} isOpen={tourOpen} lang={lang}/>
      )}
    </div>
  );
}

// ============================================================
// PrototypeToolbar. A single horizontal band that holds every
// prototype-level control on one row. Tour · Reset · EN/AR on the
// left; product dropdown on the right.
// ============================================================
function PrototypeToolbar({
  catalogue, productId, entryId, setProductId, setEntryId,
  lang, setLang, showResetDemo, showLangToggle, onStartTour, isAr, isMobile,
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 10, flexWrap: 'wrap',
      padding: isMobile ? '10px 14px' : '14px 22px',
      background: 'transparent',
    }}>
      <div data-tour-id="reset-lang" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {onStartTour && (
          <button onClick={onStartTour} className="mal-pill-btn">
            <span>{isAr ? 'خذ جولة' : 'Take a tour'}</span>
            <span style={{ transform: isAr ? 'scaleX(-1)' : 'none', display: 'inline-flex' }}>→</span>
          </button>
        )}
        {showResetDemo && <ResetDemoButton lang={lang}/>}
        {showLangToggle && setLang && <PrototypeLangToggle lang={lang} setLang={setLang}/>}
      </div>
      <div style={{ display: 'inline-flex', alignItems: 'center' }}>
        <GroupedProductSelector
          catalogue={catalogue}
          productId={productId} entryId={entryId}
          onPickProduct={setProductId} onPickEntry={setEntryId}
          isAr={isAr} isMobile={isMobile} variant="inline"/>
      </div>
    </div>
  );
}

// ============================================================
// Tour steps for the Prototype section
// ============================================================
// ============================================================
// Tour steps. Product-aware — the journey changes based on the
// currently-selected catalogue entry. Selectors target real DOM
// hooks so the spotlight actually lands on the right element.
// Three live tracks: P1 Smart Invoice, P2 Healthcare, A11 POS.
// Anything else falls back to the catalogue / coming-soon track.
// ============================================================
const PICKER_PILL = 'button[aria-haspopup="menu"]';

function tourIntro(isAr, productCode, productName) {
  return [
    { title: isAr ? 'مرحباً بك في النموذج الحي' : 'Welcome to the live prototype',
      body: [
        isAr
          ? `أنت تنظر حالياً إلى ${productCode} · ${productName}. هذه واجهة تشغيلية حقيقية — تطبيقات الجوال والويب التي سيراها العميل.`
          : `You're looking at ${productCode} · ${productName}. This is the live, interactive prototype — the actual mobile / web experience the customer will see.`,
        isAr
          ? 'ثلاثة منتجات مفعّلة بالكامل: P1 الفاتورة الذكية، P2 إيرادات الرعاية الصحية، A11 تمويل نقاط البيع. الباقي يظهر بطاقة "قيد الإعداد".'
          : 'Three prototypes are fully wired: P1 Smart Invoice, P2 Healthcare Receivables, A11 Embedded POS Finance. The rest of the 21-product catalogue routes to a "coming soon" card.',
      ],
      position: 'center', selector: null },

    { title: isAr ? 'كتالوج المنتجات' : 'Browse the catalogue',
      body: isAr
        ? '٢١ منتجاً في ٦ فئات. الذي يحمل شارة LIVE خضراء يفتح بنموذج كامل، والباقي يعرض بطاقة قيد الإعداد. انقر الزر أعلاه لاستكشافها.'
        : '21 products across 6 categories. Anything with a green LIVE pill opens the full prototype; the rest land on a "coming soon" card. Click the pill above to explore.',
      selector: PICKER_PILL, position: 'bottom' },

    { title: isAr ? 'إعادة التعيين واللغة' : 'Reset · Language',
      body: isAr
        ? 'زر إعادة التعيين يمحو حالة العرض ويُعيد التحميل من البداية. مفتاح EN/AR يبدّل النموذج كاملاً إلى العربية مع تخطيط من اليمين لليسار.'
        : 'Reset clears the demo state and reloads from the start. The EN/AR pill flips the whole prototype to Arabic with full right-to-left layout.',
      selector: '[data-tour-id="reset-lang"]', position: 'bottom' },
  ];
}

function tourP1(isAr, inDemo) {
  return [
    inDemo ? {
      title: isAr ? 'إطاران متزامنان' : 'Two phones, one story',
      body: isAr
        ? 'يسار: المشتري (SME الذي يدفع الفاتورة). يمين: المورد (SME الذي يستلم السلفة). الإجراءات في أحدهما تنعكس في الآخر مباشرةً.'
        : 'Left phone is the buyer SME (paying the invoice). Right phone is the supplier SME (receiving the advance). Actions on one side reflect on the other in real time.',
      position: 'center', selector: null,
    } : {
      title: isAr ? 'ثلاث طرق دخول' : 'Three entry modes',
      body: [
        isAr ? 'العرض الجانبي: الهاتفان معاً.' : 'Side-by-side demo: both phones in one stage.',
        isAr ? 'المشتري المستقل: تطبيق المشتري وحده.' : 'Buyer SME standalone: just the buyer app.',
        isAr ? 'المورد المستقل: تطبيق المورد وحده.' : 'Supplier SME standalone: just the supplier app.',
      ],
      position: 'center', selector: null,
    },

    { title: isAr ? 'اختيار خطة السداد' : 'Pick a repayment plan',
      body: isAr
        ? 'يختار المشتري Pay-30 / BNPL 60-90 / تقسيط 3 أو 4 / تمديد ٦ أشهر. كل خيار يبدّل تجربة المورد ودورة السلفة.'
        : 'Buyer picks Pay-30, BNPL 60–90, Installments-3/4, or 6-month Term Extension. Each option flips the supplier-side view and the advance timeline.',
      position: 'center', selector: null },

    inDemo ? {
      title: isAr ? 'مؤشر التحكم بالوقت' : 'Day dial · scrub the timeline',
      body: isAr
        ? 'القرص الدوّار في الأسفل يقدّم محاكاة الأيام (٠ → ٢٠٠). اسحبه لرؤية الإشعارات، السلفة، التمديد، أو السداد المتأخر.'
        : 'The rotary day dial at the bottom advances the simulator from day 0 to day 200. Drag it to see notifications, advance, term extension, or overdue states.',
      position: 'center', selector: null,
    } : null,

    { title: isAr ? 'إعادة التمويل والتمديد' : 'Refinance + term extension',
      body: isAr
        ? 'الفاتورة الذكية تدعم تحويل خطة BNPL إلى قرض ٦ أشهر، أو تمديد مدة الدفع بعد بدء الأقساط. كلاهما متاح من شاشة "الخطة النشطة" داخل تطبيق المشتري.'
        : 'Smart Invoice can convert a BNPL plan into a 6-month loan, or extend the term mid-cycle. Both flows live on the "Active plan" card inside the buyer app.',
      position: 'center', selector: null },
  ].filter(Boolean);
}

function tourP2(isAr) {
  return [
    { title: isAr ? 'مهنّن وشركات تأمين · جنباً إلى جنب' : 'Provider + insurers, side by side',
      body: isAr
        ? 'يسار: عيادة Crescent Medical (د. أحمد). يمين: لوحة تسوية متعددة شركات التأمين (Daman، Thiqa، ADNIC، AXA، BUPA، MetLife). في المنتصف: لوحة عمليات Mal لكل مرحلة.'
        : 'Left phone: Crescent Medical Center (Dr. Ahmed). Right phone: multi-payer settlement panel (Daman, Thiqa, ADNIC, AXA, BUPA, MetLife). Centre: Mal\'s ops ledger for each phase.',
      position: 'center', selector: null },

    { title: isAr ? 'المراحل · شريط التنقّل العائم' : 'Phases · floating dotnav',
      body: isAr
        ? 'خمس مراحل: مرحباً ← التأهيل ← لجنة الائتمان ← الدُفعة مرفوعة ← الحياة اليومية. انقر أي نقطة على الحافة اليسرى للقفز إليها.'
        : 'Five phases: Welcome → Onboarding → Credit committee → Batch uploaded → Live · Day-by-day. Click any dash on the left edge to jump.',
      selector: '.mal-dotnav', position: 'right' },

    { title: isAr ? 'الذكاء الاصطناعي · التحكيم التنبئي' : 'AI · predictive adjudication',
      body: isAr
        ? 'في مرحلتي "الدُفعة" و"الحياة"، يقيّم محرّك AI كل مطالبة (٠-١٠٠) ويُظهر أعلى ٣ عوامل تتحكم بالنتيجة. انقر أي مطالبة لفتح نافذة التفاصيل.'
        : 'In the Batch and Live phases, the AI engine scores each claim (0–100) and surfaces the top 3 features driving the score. Click any claim row to open the drill-in modal.',
      position: 'center', selector: null },

    { title: isAr ? 'السياسة · حدود التركيز' : 'Risk policy · concentration caps',
      body: isAr
        ? 'سياسة المخاطر تعمل على ثلاث طبقات: حدّ تأمين، حدّ عيادة دوّار، وقواعد قبول الدُفعة. زر "Risk Hub" في العمود الأوسط يُظهر السياسات وبطاقة الأسعار.'
        : 'Risk policy runs in three layers: per-insurer concentration caps, the clinic\'s revolving line, and per-batch admission rules. The "Risk Hub" button in the centre column opens the policy + rate card.',
      position: 'center', selector: null },

    { title: isAr ? 'مؤشّر الأيام في الحياة اليومية' : 'Day-by-day · per-payer cycle',
      body: isAr
        ? 'في مرحلة "الحياة"، يحرّك مفتاح الأيام دورة التسوية لكل شركة تأمين (Daman ٢٨ يوم → MetLife ٧٨ يوم). الإحالات والرفض قابلة لإعادة الإرسال.'
        : 'In the Live phase, the day scrubber drives the per-payer settlement cycle (Daman 28d → MetLife 78d). Refers and rejections can be resubmitted from the drill-in modal.',
      position: 'center', selector: null },
  ];
}

function tourP3(isAr) {
  return [
    { title: isAr ? 'التاجر + بيانات Mal' : 'Merchant + Mal\'s data feeds',
      body: isAr
        ? 'يسار: مطعم Saffron Kitchen (٣ فروع في دبي). يمين: بيانات نقاط البيع + البنك + ضريبة القيمة المضافة التي يقرأها محرّك Mal. في المنتصف: لوحة عمليات Mal لكل مرحلة.'
        : 'Left phone: Saffron Kitchen (F&B, 3 outlets in Dubai). Right phone: the live POS + bank + VAT feeds Mal\'s engine reads from. Centre: Mal\'s operator ledger per phase.',
      position: 'center', selector: null },

    { title: isAr ? 'ست مراحل · شريط التنقّل العائم' : 'Six phases · floating dotnav',
      body: isAr
        ? 'مرحباً ← اربط البيانات ← الاكتتاب ← العرض المعتمد ← الصرف ← الحياة · الخصم اليومي. كل نقطة على الحافة اليسرى تقفز إلى مرحلتها.'
        : 'Welcome → Connect data → Underwriting → Pre-approved offer → Disbursal → Live · Daily sweep. Each dash on the left edge jumps to its phase.',
      selector: '.mal-dotnav', position: 'right' },

    { title: isAr ? 'الاكتتاب · ٧ عوامل' : 'Underwriting · 7 factors',
      body: isAr
        ? 'في مرحلة "الاكتتاب"، المحرّك يصنّف ٧ عوامل (حجم نقاط البيع، تذبذب المبيعات، رصيد البنك، VAT، إلخ.) إلى نتيجة مركّبة وفئة A/B/C.'
        : 'In the Underwriting phase the engine scores 7 factors — POS GMV, weekly volatility, bank-balance buffer, VAT history, etc. — into a composite score and a tier (A / B / C).',
      position: 'center', selector: null },

    { title: isAr ? 'العرض · ثلاث شرائح' : 'Offer · three tiers',
      body: isAr
        ? 'العرض يُقدَّم كثلاثة مستويات راحة (محافظ / متوازن / جريء) بدلاً من مدة قرض. يختار التاجر نسبة الخصم اليومي والسداد يُشتقّ من مبيعاته.'
        : 'The offer comes as three comfort tiers (Conservative / Balanced / Aggressive) instead of a fixed tenor. The merchant picks a sweep %, and payoff is derived from their daily sales.',
      position: 'center', selector: null },

    { title: isAr ? 'الخصم اليومي · إعادة تمويل تلقائي' : 'Daily sweep · auto top-up',
      body: isAr
        ? 'في مرحلة "الحياة"، يُسحب جزء من كل تسوية يومية من Network International و NeoPay قبل دفعها للتاجر. عند سداد ٥٠٪، تظهر بطاقة عرض إضافي تلقائياً.'
        : 'In Live, Mal sweeps a slice of every daily settlement from Network International and NeoPay before payout. Once 50% is repaid, a top-up offer card appears automatically.',
      position: 'center', selector: null },
  ];
}

function tourComingSoon(isAr, productCode, productName) {
  return [
    { title: isAr ? 'قيد الإعداد' : 'Coming soon',
      body: isAr
        ? `${productCode} · ${productName} لم يُنفَّذ كنموذج تفاعلي بعد. ستجد هنا بطاقة بملخّص المنتج وفئته. للتجارب الكاملة، اختر منتجاً يحمل شارة LIVE.`
        : `${productCode} · ${productName} isn\'t built out as an interactive prototype yet. You\'ll see a clean coming-soon card with the product\'s blurb and category. For full flows, pick one of the LIVE products.`,
      position: 'center', selector: null },
  ];
}

function tourOutro(isAr) {
  return [
    { title: isAr ? 'انتهت الجولة' : 'You\'re set',
      body: [
        isAr
          ? 'هذا كل شيء. جرّب الشاشات، اسحب القرص الزمني، بدّل بين المنتجات. الجولة محفوظة في زر "خذ جولة" أعلى اليسار.'
          : 'That\'s the tour. Play with the screens, scrub the timeline, switch between products. The tour stays one click away in the toolbar.',
        isAr
          ? 'لرؤية النموذج المالي خلف هذه التدفقات، انتقل لقسم الاقتصاد.'
          : 'For the financial model behind these flows, head to the Economics section.',
      ],
      position: 'center', selector: null },
  ];
}

function buildPrototypeTourSteps(isAr, productId, entryId) {
  const inDemo = entryId === 'demo';
  const product = window.MAL_PRODUCT_BY_ID?.[productId];
  const code = product?.code || '';
  const name = product?.short || product?.title || '';

  let body;
  if (productId === 'p1-smart-invoice') {
    body = tourP1(isAr, inDemo);
  } else if (productId === 'p2-healthcare-receivables') {
    body = tourP2(isAr);
  } else if (productId === 'a11-pos-mca') {
    body = tourP3(isAr);
  } else {
    body = tourComingSoon(isAr, code, name);
  }

  return [
    ...tourIntro(isAr, code, name),
    ...body,
    ...tourOutro(isAr),
  ];
}

// ============================================================
// PrototypeLangToggle. Compact EN/AR pill, only mounted from inside
// the Prototype section while phones are visible. Keeps the Arabic
// switch out of the global header for the other (English-only)
// sections.
// ============================================================
function PrototypeLangToggle({ lang, setLang, style }) {
  return (
    <div role="tablist" aria-label="Language" style={{
      display: 'inline-flex', padding: 3, gap: 2, borderRadius: 999,
      background: 'var(--mal-paper)',
      border: '1px solid var(--mal-line)',
      boxShadow: 'var(--mal-sh-1, 0 1px 2px rgba(0,0,0,0.06))',
      ...style,
    }}>
      {[{ v: 'en', l: 'EN' }, { v: 'ar', l: 'AR' }].map((opt) => {
        const active = lang === opt.v;
        return (
          <button key={opt.v} role="tab" aria-selected={active}
                  onClick={() => setLang(opt.v)} style={{
            all: 'unset', cursor: 'pointer',
            fontFamily: 'var(--mal-font-ui)',
            fontSize: 11.5, fontWeight: active ? 700 : 500,
            padding: '5px 14px', borderRadius: 999,
            color: active ? '#FAF7EE' : 'var(--mal-mid)',
            background: active ? 'var(--mal-ink)' : 'transparent',
            transition: 'background .15s, color .15s',
          }}>{opt.l}</button>
        );
      })}
    </div>
  );
}

// ============================================================
// ResetDemoButton. Clears the persisted demo state (Supabase session
// UUID + in-memory cache) and forces a fresh mount. Pure simulator,
// no real data is touched. Confirms before nuking.
// ============================================================
function ResetDemoButton({ lang, style }) {
  const isAr = lang === 'ar';
  const [confirming, setConfirming] = pS(false);
  pE(() => {
    if (!confirming) return;
    const t = setTimeout(() => setConfirming(false), 3500);
    return () => clearTimeout(t);
  }, [confirming]);

  const onClick = () => {
    if (!confirming) { setConfirming(true); return; }
    try { localStorage.removeItem('mal_session_id'); } catch (e) {}
    try { sessionStorage.clear(); } catch (e) {}
    // Hard-reload so React state machine remounts with a new session UUID.
    window.location.reload();
  };

  return (
    <button onClick={onClick} aria-label={isAr ? 'إعادة تعيين العرض التجريبي' : 'Reset demo state'} style={{
      appearance: 'none', cursor: 'pointer',
      fontFamily: 'var(--mal-font-ui)',
      fontSize: 12.5, fontWeight: 600,
      padding: '8px 14px',
      borderRadius: 999,
      color: confirming ? '#fff' : 'var(--mal-ink-2)',
      background: confirming ? '#b8364b' : 'var(--mal-paper)',
      border: '1px solid ' + (confirming ? '#b8364b' : 'var(--mal-line)'),
      transition: 'background .2s, color .2s, border-color .2s',
      display: 'inline-flex', alignItems: 'center', gap: 6,
      boxShadow: 'var(--mal-sh-1, 0 1px 2px rgba(0,0,0,0.06))',
      ...style,
    }}>
      <span style={{ fontSize: 13 }}>{confirming ? '⚠' : '↺'}</span>
      <span>
        {confirming
          ? (isAr ? 'تأكيد المسح' : 'Tap again to clear')
          : (isAr ? 'إعادة تعيين' : 'Reset demo')}
      </span>
    </button>
  );
}

// ============================================================
// GroupedProductSelector. Shared dropdown for prototype + financial.
// variant: 'floating' (top-right corner pill) | 'inline' (block-level)
// ============================================================
function GroupedProductSelector({ catalogue, productId, entryId, onPickProduct, onPickEntry, isAr, isMobile, variant = 'floating' }) {
  const [open, setOpen] = pS(false);
  const [hoveredId, setHoveredId] = pS(null);
  const [expandedCats, setExpandedCats] = pS(() => {
    // Expand the category that contains the current product
    const obj = {};
    const current = window.MAL_PRODUCT_BY_ID[productId];
    if (current) obj[current.categoryId] = true;
    return obj;
  });
  const ref = pR(null);

  const product = window.MAL_PRODUCT_BY_ID[productId];
  const entry = product?.protoEntries?.find((e) => e.id === entryId);

  pE(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // When we open, ensure the current product's category is expanded
  pE(() => {
    if (!open || !product) return;
    setExpandedCats((s) => ({ ...s, [product.categoryId]: true }));
  }, [open, productId]);

  const toggleCat = (id) => setExpandedCats((s) => ({ ...s, [id]: !s[id] }));

  const display = product
    ? (entry ? product.short + ' · ' + entry.label : product.short)
    : (isAr ? 'اختر' : 'Select');

  // Container always establishes a stacking context so the open menu
  // floats above the phone frames below it (which set their own
  // shadows / borders that can otherwise create competing stacking
  // contexts).
  const containerStyle = variant === 'floating'
    ? { position: 'fixed', top: 70, insetInlineEnd: 18, zIndex: 70 }
    : { position: 'relative', display: 'inline-block', zIndex: open ? 70 : 'auto' };

  return (
    <div ref={ref} style={containerStyle}>
      <button onClick={() => setOpen((o) => !o)}
              aria-haspopup="menu" aria-expanded={open}
              style={{
                all: 'unset', cursor: 'pointer', boxSizing: 'border-box',
                display: 'inline-flex', alignItems: 'center', gap: 10,
                padding: '8px 14px',
                background: 'var(--mal-paper)',
                border: '1px solid var(--mal-line)',
                borderRadius: 999,
                fontSize: 12, fontWeight: 500,
                color: 'var(--mal-ink)',
                boxShadow: variant === 'floating' ? 'var(--mal-sh-2)' : 'none',
                transition: 'border-color .15s, transform .15s',
                maxWidth: isMobile ? 260 : 360,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--mal-primary-3)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--mal-line)'; e.currentTarget.style.transform = ''; }}>
        <Avatar name={product?.code || '?'} tone={product?.categoryColor || 'lilac'} size={22}/>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {display}
        </span>
        {product?.status === 'live' && (
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '.06em',
            padding: '2px 6px', borderRadius: 999,
            background: 'var(--mal-success)', color: '#fff',
          }}>LIVE</span>
        )}
        <span style={{
          fontSize: 10, color: 'var(--mal-mid)',
          transform: open ? 'rotate(180deg)' : 'none',
          transition: 'transform .2s',
        }}>▾</span>
      </button>

      {open && (
        <div role="menu" style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          // Both variants anchor the menu to the RIGHT edge of the
          // trigger so it opens leftward into the viewport. The trigger
          // sits at the right side of the toolbar (and the floating
          // variant sits at top-right), so a left-anchored menu would
          // overflow the right edge.
          insetInlineEnd: 0,
          insetInlineStart: 'auto',
          width: 420, maxWidth: '94vw',
          maxHeight: 560, overflowY: 'auto',
          background: 'var(--mal-paper)',
          border: '1px solid var(--mal-line)',
          borderRadius: 16,
          boxShadow: 'var(--mal-sh-3)',
          padding: 8,
          animation: 'mal-fade-up .18s ease-out',
          zIndex: 75,
        }}>
          <div style={{
            padding: '6px 10px 8px', fontSize: 10.5, fontWeight: 600,
            color: 'var(--mal-mid)', letterSpacing: '.08em', textTransform: 'uppercase',
            display: 'flex', justifyContent: 'space-between',
          }}>
            <span>{isAr ? 'كتالوج المنتجات' : 'Product catalogue'}</span>
            <span>{window.MAL_PRODUCT_FLAT?.length || 0} {isAr ? 'منتج' : 'products'}</span>
          </div>

          {catalogue.map((cat) => {
            const expanded = !!expandedCats[cat.id];
            const liveCount = cat.products.filter((p) => p.status === 'live').length;
            return (
              <div key={cat.id} style={{ marginBottom: 4 }}>
                <button onClick={() => toggleCat(cat.id)} style={{
                  all: 'unset', cursor: 'pointer', boxSizing: 'border-box',
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', padding: '10px 10px',
                  borderRadius: 10,
                  background: expanded ? 'var(--mal-surface-2)' : 'transparent',
                  transition: 'background .15s',
                }}
                onMouseEnter={(e) => { if (!expanded) e.currentTarget.style.background = 'var(--mal-surface)'; }}
                onMouseLeave={(e) => { if (!expanded) e.currentTarget.style.background = 'transparent'; }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: 999,
                    background: 'var(--mal-' + (cat.color === 'sky' ? 'iri-2' : cat.color === 'sage' ? 'success' : cat.color === 'coral' ? 'danger' : cat.color === 'peach' ? 'warn' : cat.color === 'ink' ? 'ink' : 'primary') + ')',
                  }}/>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--mal-ink)' }}>
                      {cat.name}
                      {liveCount > 0 && (
                        <span style={{
                          marginInlineStart: 8, fontSize: 9, fontWeight: 700,
                          letterSpacing: '.06em', padding: '1px 5px', borderRadius: 999,
                          background: 'var(--mal-success)', color: '#fff',
                        }}>{liveCount} LIVE</span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--mal-mid)' }}>{cat.blurb}</div>
                  </div>
                  <span style={{
                    fontSize: 11, color: 'var(--mal-mid-2)',
                    fontFamily: 'var(--mal-font-mono)',
                  }}>{cat.products.length}</span>
                  <span style={{
                    fontSize: 12, color: 'var(--mal-mid)',
                    transform: expanded ? 'rotate(180deg)' : 'none',
                    transition: 'transform .2s',
                  }}>▾</span>
                </button>
                {expanded && (
                  <div style={{ paddingInlineStart: 24, paddingTop: 4 }}>
                    {cat.products.map((p) => {
                      const active = p.id === productId;
                      const isLive = p.status === 'live';
                      const showBlurb = hoveredId === p.id;
                      return (
                        <div key={p.id}>
                          <button
                            onClick={() => {
                              onPickProduct(p.id);
                              if (!p.protoEntries || p.protoEntries.length <= 1) setOpen(false);
                            }}
                            onMouseEnter={() => setHoveredId(p.id)}
                            onMouseLeave={() => setHoveredId(null)}
                            style={{
                              all: 'unset', boxSizing: 'border-box',
                              display: 'flex', alignItems: 'center', gap: 10,
                              width: '100%', padding: '8px 10px',
                              borderRadius: 8, cursor: 'pointer',
                              background: active ? 'var(--mal-primary-50)' : 'transparent',
                              transition: 'background .15s',
                            }}>
                            <span style={{
                              fontSize: 9, fontWeight: 700,
                              fontFamily: 'var(--mal-font-mono)',
                              color: 'var(--mal-mid-2)',
                              minWidth: 22,
                            }}>{p.code}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 12.5, fontWeight: 500,
                                            color: isLive ? 'var(--mal-ink)' : 'var(--mal-mid)' }}>
                                {p.short}
                              </div>
                            </div>
                            {isLive && (
                              <span style={{
                                fontSize: 9, fontWeight: 700, letterSpacing: '.06em',
                                padding: '1px 5px', borderRadius: 999,
                                background: 'var(--mal-success)', color: '#fff',
                              }}>LIVE</span>
                            )}
                            {!isLive && (
                              <span style={{
                                fontSize: 9, fontWeight: 600, letterSpacing: '.06em',
                                padding: '1px 5px', borderRadius: 999,
                                background: 'var(--mal-line)', color: 'var(--mal-mid)',
                                textTransform: 'uppercase',
                              }}>{isAr ? 'قيد الإعداد' : 'In progress'}</span>
                            )}
                            {active && <span style={{ color: 'var(--mal-primary)', fontSize: 12 }}>●</span>}
                          </button>
                          {/* Hover blurb */}
                          {showBlurb && p.blurb && (
                            <div style={{
                              padding: '0 14px 8px 32px', fontSize: 11.5, lineHeight: 1.55,
                              color: 'var(--mal-mid)', maxWidth: 360,
                            }}>
                              {p.blurb}
                            </div>
                          )}
                          {/* Sub-entries (only for active live product with multiple entries) */}
                          {active && isLive && p.protoEntries && p.protoEntries.length > 1 && (
                            <div style={{ paddingInlineStart: 32, paddingTop: 2, paddingBottom: 4 }}>
                              {p.protoEntries.map((e) => {
                                const eActive = e.id === entryId;
                                return (
                                  <button key={e.id}
                                    onClick={() => { onPickEntry(e.id); setOpen(false); }}
                                    style={{
                                      all: 'unset', cursor: 'pointer', boxSizing: 'border-box',
                                      display: 'flex', alignItems: 'center', gap: 8,
                                      width: '100%', padding: '5px 10px',
                                      borderRadius: 8,
                                      background: eActive ? 'var(--mal-surface-2)' : 'transparent',
                                      fontSize: 11.5,
                                      color: eActive ? 'var(--mal-ink)' : 'var(--mal-mid)',
                                      fontWeight: eActive ? 600 : 400,
                                    }}
                                    onMouseEnter={(ev) => { if (!eActive) ev.currentTarget.style.background = 'var(--mal-surface)'; }}
                                    onMouseLeave={(ev) => { if (!eActive) ev.currentTarget.style.background = 'transparent'; }}>
                                    <span style={{
                                      width: 4, height: 4, borderRadius: 999,
                                      background: eActive ? 'var(--mal-primary)' : 'var(--mal-mid-2)',
                                    }}/>
                                    {e.label}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Persona mount. Single-persona embed
// ============================================================
function PersonaMount({ persona, lang, isMobile }) {
  const personaPrefersMobile = persona === 'buyer' || persona === 'supplier' || persona === 'anchorSup';
  const [viewport, setViewport] = pS(isMobile ? 'mobile' : (personaPrefersMobile ? 'mobile' : 'desktop'));
  pE(() => { if (isMobile) setViewport('mobile'); }, [isMobile]);

  return (
    <div style={{ padding: isMobile ? 0 : 24, minHeight: 'calc(100vh - 56px)' }}>
      <MalPrototype embed
                    initialPersona={persona}
                    initialViewport={viewport}
                    initialLang={lang}
                    initialTheme="light"
                    initialDensity="cozy"
                    initialRoute="home"/>
    </div>
  );
}

// ============================================================
// Coming-soon. Shown for any in-progress product
// ============================================================
function ComingSoon({ product, isAr }) {
  if (!product) return null;
  return (
    <div style={{
      minHeight: 'calc(100vh - 56px)', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      padding: 32, position: 'relative', overflow: 'hidden',
    }}>
      <div aria-hidden style={{
        position: 'absolute', top: '20%', insetInlineEnd: '15%',
        width: 420, height: 420, borderRadius: '50%',
        background: 'conic-gradient(from 90deg, var(--mal-iri-1), var(--mal-iri-2), var(--mal-iri-3), var(--mal-iri-4))',
        filter: 'blur(80px)', opacity: 0.28, pointerEvents: 'none',
      }}/>
      <div style={{ textAlign: 'center', position: 'relative', zIndex: 2, maxWidth: 600 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em',
                      textTransform: 'uppercase', color: 'var(--mal-mid-2)', marginBottom: 10 }}>
          {product.categoryName} · {product.code}
        </div>
        <Pill tone="neutral" dot>{isAr ? 'قيد الإعداد' : 'In progress'}</Pill>
        <h2 style={{
          fontFamily: 'var(--mal-font-display)', fontStyle: 'italic',
          fontSize: 44, lineHeight: 1.1, margin: '18px 0 16px', letterSpacing: '-0.015em',
        }}>
          {product.title}
        </h2>
        <p style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--mal-mid)', maxWidth: 520, margin: '0 auto 24px' }}>
          {product.blurb}
        </p>
        <Pill tone="neutral">{isAr ? 'المنتج النشط الوحيد: Smart Invoice' : 'Live product: Smart Invoice'}</Pill>
      </div>
    </div>
  );
}

window.SectionPrototype = SectionPrototype;
