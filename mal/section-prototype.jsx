/* eslint-disable */
// Section 2 — Prototype
// Tile grid showing 4 products, each routing into its own working prototype
// (or a "coming soon" placeholder). Product 1 is the existing buyer/supplier
// dual-panel demo. Products 2/3 surface the existing persona apps (HC Ops +
// HC Coder, Anchor AP + Anchor Supplier). Product 4 is FLDG distribution —
// placeholder for now.

const { useState: pS, useEffect: pE, useCallback: pCB } = React;
const pIco = window.MalIcon;

const PRODUCTS = [
  {
    id: 'p1',
    code: 'Product 1',
    title: 'Smart Invoice + Term Extension',
    tagline: 'B2B Pay & Get Paid · 4-hour wire · 5 plans + extension',
    color: 'lilac',
    available: true,
    entries: [
      { id: 'demo',     label: 'Side-by-side demo',          desc: 'Buyer + Supplier panels with synchronized lifecycle' },
      { id: 'buyer',    label: 'Buyer SME · standalone',      desc: 'Full buyer app · 11-step onboarding + invoices + plan picker + extend' },
      { id: 'supplier', label: 'Supplier SME · standalone',   desc: '8-step onboarding + financing inbox + cash position' },
    ],
  },
  {
    id: 'p2',
    code: 'Product 2',
    title: 'Healthcare Receivables Engine',
    tagline: 'Same-day claim advance · multi-payer · predictive adjudication',
    color: 'coral',
    available: true,
    entries: [
      { id: 'hcops',   label: 'Provider Ops console',  desc: 'Dashboard · claim batches · DSO trend · advance requests' },
      { id: 'hccoder', label: 'Coding desk',           desc: 'Pre-submission claim review with predictive scores' },
    ],
  },
  {
    id: 'p3',
    code: 'Product 3',
    title: 'Anchor-Led Supply Chain Finance',
    tagline: 'Reverse factoring · daily dynamic-discount auction',
    color: 'ink',
    available: true,
    entries: [
      { id: 'anchorAP',  label: 'Anchor AP console',     desc: 'AP feed · supplier panel · auction admin' },
      { id: 'anchorSup', label: 'Anchor Supplier app',   desc: 'Live auction · bid slider · clearing animation' },
    ],
  },
  {
    id: 'p4',
    code: 'Product 4',
    title: 'EDB-Guaranteed Distribution + FLDG',
    tagline: 'Pathway B · partner-bank co-lending with First Loss Default Guarantee',
    color: 'peach',
    available: false,
    entries: [],
  },
];

function SectionPrototype({ lang, isMobile }) {
  const isAr = lang === 'ar';
  // route: 'overview' | persona id ('buyer' | 'supplier' | 'hcops' | 'hccoder' | 'anchorAP' | 'anchorSup') | 'demo'
  const [route, setRoute] = pS('overview');

  // When user navigates into a persona/demo, hide the section nav for full-bleed
  if (route === 'demo') {
    return <DemoMode lang={lang} setLang={() => {}} isMobile={isMobile} onExit={() => setRoute('overview')}/>;
  }
  if (route !== 'overview') {
    return <PersonaShell persona={route} lang={lang} isMobile={isMobile} onBack={() => setRoute('overview')}/>;
  }

  return (
    <div className="mal-section-page" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Hero */}
      <div className="mal-fade-up" style={{ marginBottom: 36 }}>
        <Pill tone="ink" dot>{isAr ? 'النموذج الأولي · ٤ منتجات' : 'Prototype · 4 products'}</Pill>
        <h1 style={{
          fontFamily: 'var(--mal-font-display)',
          fontSize: isMobile ? 44 : 72,
          fontStyle: 'italic',
          margin: '14px 0 12px',
          lineHeight: 1.05, letterSpacing: '-0.02em',
        }}>
          {isAr
            ? <>كل المنتجات في <span className="mal-iri-text">مكان واحد.</span></>
            : <>Every product in <span className="mal-iri-text">one place.</span></>}
        </h1>
        <p style={{ color: 'var(--mal-mid)', maxWidth: 640, fontSize: 15, lineHeight: 1.6 }}>
          {isAr
            ? 'انقر على أي منتج لتشغيل النموذج الأولي. المنتج ١ يعمل بالكامل اليوم. الباقي يفتح قريباً.'
            : 'Click any product to launch its working prototype. Product 1 is fully wired today. Products 2 and 3 expose the existing persona apps. Product 4 is the next build.'}
        </p>
      </div>

      {/* Product tiles */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
        gap: 18,
      }}>
        {PRODUCTS.map((p, i) => (
          <ProductTile key={p.id} product={p} lang={lang} delay={i * 80}
                       onPickEntry={(entryId) => setRoute(entryId)}/>
        ))}
      </div>
    </div>
  );
}

function ProductTile({ product, lang, delay, onPickEntry }) {
  const isAr = lang === 'ar';
  const [open, setOpen] = pS(false);
  return (
    <div className="mal-fade-up" style={{
      animationDelay: delay + 'ms',
      background: 'var(--mal-paper)',
      border: '1px solid var(--mal-line)',
      borderRadius: 'var(--mal-r-lg)',
      overflow: 'hidden',
      position: 'relative',
      transition: 'transform .18s, box-shadow .18s, border-color .18s',
      cursor: product.available ? 'pointer' : 'default',
    }}
      onMouseEnter={(e) => {
        if (!product.available) return;
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = 'var(--mal-sh-3)';
        e.currentTarget.style.borderColor = 'var(--mal-primary-3)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = '';
        e.currentTarget.style.boxShadow = '';
        e.currentTarget.style.borderColor = 'var(--mal-line)';
      }}
      onClick={() => product.available && setOpen((o) => !o)}>
      {/* Iridescent halo */}
      <div aria-hidden style={{
        position: 'absolute', top: -60, insetInlineEnd: -60, width: 220, height: 220,
        borderRadius: '50%', filter: 'blur(40px)', opacity: 0.45,
        background: 'conic-gradient(from 90deg, var(--mal-iri-1), var(--mal-iri-2), var(--mal-iri-3), var(--mal-iri-4), var(--mal-iri-1))',
        pointerEvents: 'none',
      }}/>

      {/* Header */}
      <div style={{ padding: 22, position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar name={product.code.slice(-1)} tone={product.color} size={40}/>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="mal-caption" style={{ color: 'var(--mal-mid)', marginBottom: 2 }}>
              {product.code}
            </div>
            <div style={{
              fontFamily: 'var(--mal-font-display)', fontStyle: 'italic',
              fontSize: 22, lineHeight: 1.1, letterSpacing: '-0.01em',
            }}>
              {product.title}
            </div>
          </div>
          {product.available
            ? <Pill tone="success" dot>{isAr ? 'متاح' : 'Live'}</Pill>
            : <Pill tone="neutral" dot>{isAr ? 'قريباً' : 'Coming soon'}</Pill>}
        </div>
        <p style={{ color: 'var(--mal-mid)', fontSize: 13, lineHeight: 1.5, marginTop: 12, marginBottom: 0 }}>
          {product.tagline}
        </p>
      </div>

      {/* Entries — drawer style */}
      {product.available && (
        <div style={{
          maxHeight: open ? 320 : 56,
          overflow: 'hidden',
          transition: 'max-height .35s cubic-bezier(.4,0,.2,1)',
          borderTop: '1px solid var(--mal-line)',
        }}>
          <div style={{
            padding: '12px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            cursor: 'pointer',
          }}>
            <span style={{ fontSize: 12, color: 'var(--mal-mid)', fontWeight: 500 }}>
              {open
                ? (isAr ? 'اختر طريقة الدخول' : 'Choose how to enter')
                : (isAr ? `${product.entries.length} طرق دخول` : `${product.entries.length} ways to enter`)}
            </span>
            <span style={{
              fontSize: 12, color: 'var(--mal-primary)',
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform .25s',
            }}>▾</span>
          </div>
          {product.entries.map((entry) => (
            <button key={entry.id}
                    onClick={(e) => { e.stopPropagation(); onPickEntry(entry.id); }}
                    style={{
                      all: 'unset', cursor: 'pointer',
                      display: 'block', width: '100%', boxSizing: 'border-box',
                      padding: '12px 22px',
                      borderTop: '1px solid var(--mal-line-2)',
                      transition: 'background .15s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--mal-surface-2)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{entry.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--mal-mid)', marginTop: 2 }}>{entry.desc}</div>
                </div>
                <span style={{ fontSize: 12, color: 'var(--mal-primary)' }}>
                  {pIco.arrow ? pIco.arrow({ width: 14, height: 14 }) : '→'}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Wraps a persona app inside a back-to-overview chrome
function PersonaShell({ persona, lang, isMobile, onBack }) {
  const Ico = window.MalIcon;
  const personaPrefersMobile = persona === 'buyer' || persona === 'supplier' || persona === 'anchorSup';
  const [viewport, setViewport] = pS(isMobile ? 'mobile' : (personaPrefersMobile ? 'mobile' : 'desktop'));
  const personaLabel = {
    buyer: 'Buyer SME',
    supplier: 'Supplier SME',
    hcops: 'Healthcare Provider — Ops',
    hccoder: 'Healthcare Provider — Coder',
    anchorAP: 'Anchor — AP',
    anchorSup: 'Anchor — Supplier',
  }[persona] || persona;

  pE(() => { if (isMobile) setViewport('mobile'); }, [isMobile]);

  return (
    <div style={{ minHeight: 'calc(100vh - 56px)', background: 'var(--mal-surface)' }}>
      <div className="mal-app-bar" style={{ borderTop: '1px solid var(--mal-line)' }}>
        <button className="mal-pill-btn" onClick={onBack}>
          <span style={{ display: 'inline-flex', transform: lang === 'ar' ? 'scaleX(-1)' : 'none' }}>
            {Ico.arrowL ? Ico.arrowL({ width: 12, height: 12 }) : '←'}
          </span>
          {lang === 'ar' ? 'كل المنتجات' : 'All products'}
        </button>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--mal-mid)' }}>{personaLabel}</span>
        </div>
        <div className="mal-app-bar-actions">
          {!isMobile && (
            <Tabs value={viewport} onChange={setViewport} size="sm" items={[
              { value: 'mobile', label: 'Mobile' }, { value: 'desktop', label: 'Desktop' },
            ]}/>
          )}
        </div>
      </div>
      <div style={{ padding: 24 }}>
        <MalPrototype embed
                      initialPersona={persona}
                      initialViewport={viewport}
                      initialLang={lang}
                      initialTheme="light"
                      initialDensity="cozy"
                      initialRoute="home"/>
      </div>
    </div>
  );
}

window.SectionPrototype = SectionPrototype;
