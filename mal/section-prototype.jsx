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

  const [productId, setProductId] = pS(flagshipId);
  const [tourOpen, setTourOpen] = pS(false);
  const product = window.MAL_PRODUCT_BY_ID[productId] || window.MAL_PRODUCT_BY_ID[flagshipId];

  const [entryId, setEntryId] = pS(product?.defaultEntry || null);

  pE(() => {
    const p = window.MAL_PRODUCT_BY_ID[productId];
    setEntryId(p?.defaultEntry || null);
  }, [productId]);

  const Tour = window.MalTour;
  const TourBtn = window.MalTourButton;
  const tourSteps = buildPrototypeTourSteps(isAr, entryId);

  // Map product id → which prototype to mount. P1 = Smart Invoice (full).
  // P2 = Healthcare Receivables (in-progress prototype, mounts but stays
  // flagged 'in-progress' in the catalogue). Other products show ComingSoon.
  const hasPrototype = productId === 'p1-smart-invoice' || productId === 'p2-healthcare-receivables';
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
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
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
function buildPrototypeTourSteps(isAr, entryId) {
  const inDemo = entryId === 'demo';
  return [
    { title: isAr ? 'مرحباً بك في النموذج الحي' : 'Welcome to the live prototype',
      body: [
        isAr
          ? 'هذه هي الواجهة التشغيلية لـMal، كيف ستبدو التطبيقات على الهاتف للمشتري والمورد.'
          : 'This is the live prototype. What the buyer and supplier mobile apps will actually look and behave like.',
        isAr
          ? 'الفاتورة الذكية فقط مفعلة كاملة. المنتجات الـ٢٠ الأخرى في الكتالوج تظهر بطاقة "قيد الإعداد".'
          : 'Only Smart Invoice is fully wired. The other 20 products in the catalogue route to an "in progress" card.',
      ],
      position: 'center', selector: null },

    { title: isAr ? 'كتالوج المنتجات' : 'Product catalogue',
      body: isAr
        ? 'منسدلة في الزاوية اليمنى، ٢١ منتجاً في ٦ فئات: تمويل الفواتير، الرعاية الصحية، سلسلة التوريد، رأس المال العامل، المضمن، والمتخصص.'
        : '21 products grouped into 6 categories. Click a category header to expand it, then hover any product for a one-line description.',
      selector: '.mal-section-page button[aria-haspopup="menu"], div[style*="position: fixed"] button[aria-haspopup="menu"]' },

    { title: isAr ? 'الفاتورة الذكية · ثلاث طرق دخول' : 'Smart Invoice · three entry modes',
      body: [
        isAr ? 'العرض الجانبي: الهاتفان معاً (المشتري + المورد) لرؤية النفقات بالتزامن.' : 'Side-by-side demo: both phones (buyer + supplier) so you see flows synced in real time.',
        isAr ? 'المشتري المستقل: تطبيق المشتري وحده.' : 'Buyer SME standalone: just the buyer app.',
        isAr ? 'المورد المستقل: تطبيق المورد وحده.' : 'Supplier SME standalone: just the supplier app.',
      ],
      position: 'center', selector: null },

    inDemo ? {
      title: isAr ? 'الإطاران' : 'The two phone frames',
      body: isAr
        ? 'يسار: المشتري (SME الذي يدفع الفاتورة). يمين: المورد (SME الذي يتلقى التمويل).'
        : 'Left frame: buyer SME (the one paying an invoice). Right frame: supplier SME (the one receiving the advance against the invoice).',
      position: 'center', selector: null,
    } : null,

    inDemo ? {
      title: isAr ? 'مؤشر التحكم بالوقت' : 'Time control / day dial',
      body: isAr
        ? 'في الأسفل ستجد مفتاح التنقل بين أيام السيناريو. اسحب أو انقر اليوم لرؤية كيف تتطور الحالة.'
        : 'At the bottom of the stage there\'s a day dial. Drag or click any day to see how the buyer and supplier flows evolve through the 30/60/90/180-day cycle.',
      position: 'center', selector: null,
    } : null,

    { title: isAr ? 'التنقل بين المراحل' : 'Phase navigation',
      body: isAr
        ? 'مراحل المنتج: التهيئة → اختيار الخطة → الحياة (الأقساط) → التمديد إذا لزم. كل مرحلة لها واجهة مختلفة.'
        : 'Product phases: onboarding → plan picker → live (instalments) → extension if needed. Each phase has its own UI states.',
      position: 'center', selector: null },

    { title: isAr ? 'تجربة منتج "قيد الإعداد"' : 'Try an "in progress" product',
      body: isAr
        ? 'انقر أي منتج آخر في القائمة (مثل الرعاية الصحية أو SCF). ستظهر بطاقة "قيد الإعداد" مع تفسير المنتج.'
        : 'Click any other product in the dropdown (e.g. Healthcare Receivables or Anchor SCF). You\'ll see a clean "in progress" card with the product\'s blurb and category.',
      position: 'center', selector: null },

    { title: isAr ? 'انتهت الجولة' : 'End of tour',
      body: [
        isAr
          ? 'هذا كل شيء، جربها. الجولة محفوظة في زر "خذ جولة" أعلى اليمين.'
          : 'That\'s it، go play. The tour stays one click away via the "Take a tour" button.',
        isAr
          ? 'إذا أردت رؤية النموذج المالي، انتقل لقسم الاقتصاد.'
          : 'For the financial model behind these flows, head to the Economics section.',
      ],
      position: 'center', selector: null },
  ].filter(Boolean);
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
