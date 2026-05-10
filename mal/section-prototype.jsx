/* eslint-disable */
// Section 2 — Prototype
// Top-tab product switcher. Product 1 (Smart Invoice) demo opens by default.
// Each product has its own sub-tab row of entry points (demo, buyer-only,
// etc.) with the embedded prototype rendered inline below. Product 4 (FLDG)
// is still in placeholder state.

const { useState: pS, useEffect: pE, useRef: pR } = React;
const pIco = window.MalIcon;

const PRODUCTS = [
  {
    id: 'p1',
    code: '01',
    title: 'Smart Invoice + Term Extension',
    tagline: 'B2B Pay & Get Paid · 4-hour wire · 5 plans + extension',
    color: 'lilac',
    available: true,
    defaultEntry: 'demo',
    entries: [
      { id: 'demo',     label: 'Side-by-side demo',         desc: 'Buyer + Supplier panels with synchronized lifecycle' },
      { id: 'buyer',    label: 'Buyer SME · standalone',    desc: '11-step onboarding · invoices · plan picker · extend' },
      { id: 'supplier', label: 'Supplier SME · standalone', desc: '8-step onboarding · financing inbox · cash position' },
    ],
  },
  {
    id: 'p2',
    code: '02',
    title: 'Healthcare Receivables Engine',
    tagline: 'Same-day claim advance · multi-payer · predictive adjudication',
    color: 'coral',
    available: true,
    defaultEntry: 'hcops',
    entries: [
      { id: 'hcops',   label: 'Provider Ops console', desc: 'Dashboard · claim batches · DSO trend · advance requests' },
      { id: 'hccoder', label: 'Coding desk',          desc: 'Pre-submission claim review with predictive scores' },
    ],
  },
  {
    id: 'p3',
    code: '03',
    title: 'Anchor-Led Supply Chain Finance',
    tagline: 'Reverse factoring · daily dynamic-discount auction',
    color: 'ink',
    available: true,
    defaultEntry: 'anchorAP',
    entries: [
      { id: 'anchorAP',  label: 'Anchor AP console',   desc: 'AP feed · supplier panel · auction admin' },
      { id: 'anchorSup', label: 'Anchor Supplier app', desc: 'Live auction · bid slider · clearing animation' },
    ],
  },
  {
    id: 'p4',
    code: '04',
    title: 'EDB-Guaranteed Distribution + FLDG',
    tagline: 'Pathway B · partner-bank co-lending with First Loss Default Guarantee',
    color: 'peach',
    available: false,
    defaultEntry: null,
    entries: [],
  },
];

function SectionPrototype({ lang, isMobile }) {
  const isAr = lang === 'ar';
  const [productId, setProductId] = pS('p1');
  const product = PRODUCTS.find((p) => p.id === productId) || PRODUCTS[0];
  const [entryId, setEntryId] = pS(product.defaultEntry);

  // When user picks a different product, reset to that product's default entry
  pE(() => {
    const p = PRODUCTS.find((p) => p.id === productId);
    setEntryId(p ? p.defaultEntry : null);
  }, [productId]);

  return (
    <div className="mal-section-page" dir={isAr ? 'rtl' : 'ltr'} style={{
      maxWidth: 1280, padding: isMobile ? '20px 14px 60px' : '28px 24px 60px',
    }}>
      {/* Section title */}
      <h1 className="mal-fade-up" style={{
        fontFamily: 'var(--mal-font-display)', fontStyle: 'italic',
        fontSize: isMobile ? 36 : 48, lineHeight: 1.0, letterSpacing: '-0.02em',
        margin: '0 0 22px',
      }}>
        {isAr ? 'النموذج' : 'Prototype'}
      </h1>

      {/* Product tabs */}
      <ProductTabs products={PRODUCTS} activeId={productId} onPick={setProductId} isMobile={isMobile}/>

      {/* Entry sub-tabs */}
      {product.available && product.entries.length > 1 && (
        <EntryTabs entries={product.entries} activeId={entryId} onPick={setEntryId} isMobile={isMobile}/>
      )}

      {/* Body */}
      <div style={{ marginTop: 22 }}>
        {!product.available && <ComingSoon product={product} isAr={isAr}/>}
        {product.available && entryId === 'demo' && (
          <DemoMount lang={lang} isMobile={isMobile}/>
        )}
        {product.available && entryId !== 'demo' && entryId && (
          <PersonaMount persona={entryId} lang={lang} isMobile={isMobile}/>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Product top tabs
// ============================================================
function ProductTabs({ products, activeId, onPick, isMobile }) {
  return (
    <div style={{
      display: 'flex', gap: 8, flexWrap: 'wrap',
      borderBottom: '1px solid var(--mal-line)', paddingBottom: 0,
      overflowX: isMobile ? 'auto' : 'visible',
    }}>
      {products.map((p) => {
        const active = p.id === activeId;
        return (
          <button key={p.id} onClick={() => onPick(p.id)}
                  disabled={!p.available}
                  style={{
                    all: 'unset', cursor: p.available ? 'pointer' : 'not-allowed',
                    padding: '12px 16px', borderRadius: '10px 10px 0 0',
                    borderBottom: active ? '2px solid var(--mal-primary)' : '2px solid transparent',
                    color: active ? 'var(--mal-ink)' : p.available ? 'var(--mal-mid)' : 'var(--mal-mid-2)',
                    fontWeight: active ? 600 : 500,
                    fontSize: 13, marginBottom: -1,
                    display: 'inline-flex', alignItems: 'center', gap: 10,
                    transition: 'border-color .15s, color .15s, background .15s',
                    background: active ? 'var(--mal-paper)' : 'transparent',
                    flexShrink: 0,
                    opacity: p.available ? 1 : 0.55,
                  }}
                  onMouseEnter={(e) => { if (!active && p.available) e.currentTarget.style.background = 'var(--mal-surface-2)'; }}
                  onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = active ? 'var(--mal-paper)' : 'transparent'; }}>
            <Avatar name={p.code} tone={p.color} size={28}/>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0 }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>{p.title}</span>
              {!isMobile && (
                <span style={{ fontSize: 10.5, color: 'var(--mal-mid)', fontWeight: 400 }}>
                  {p.tagline}
                </span>
              )}
            </div>
            {!p.available && <Pill tone="neutral" dot>Soon</Pill>}
          </button>
        );
      })}
    </div>
  );
}

// ============================================================
// Entry sub-tabs
// ============================================================
function EntryTabs({ entries, activeId, onPick, isMobile }) {
  return (
    <div style={{
      display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 16,
      paddingBlock: 4, overflowX: isMobile ? 'auto' : 'visible',
    }}>
      {entries.map((e) => {
        const active = e.id === activeId;
        return (
          <button key={e.id} onClick={() => onPick(e.id)}
                  style={{
                    all: 'unset', cursor: 'pointer', boxSizing: 'border-box',
                    padding: '7px 14px', borderRadius: 999,
                    border: '1px solid ' + (active ? 'var(--mal-primary)' : 'var(--mal-line)'),
                    background: active ? 'var(--mal-primary-50)' : 'var(--mal-paper)',
                    color: active ? 'var(--mal-primary)' : 'var(--mal-mid)',
                    fontSize: 12, fontWeight: active ? 600 : 500,
                    transition: 'all .15s',
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e2) => { if (!active) e2.currentTarget.style.borderColor = 'var(--mal-primary-3)'; }}
                  onMouseLeave={(e2) => { if (!active) e2.currentTarget.style.borderColor = 'var(--mal-line)'; }}>
            {e.label}
          </button>
        );
      })}
    </div>
  );
}

// ============================================================
// Demo mount (Product 1 dual-panel) — rendered full-width
// ============================================================
function DemoMount({ lang, isMobile }) {
  return (
    <div style={{
      marginTop: 6,
      borderRadius: 'var(--mal-r-lg)',
      border: '1px solid var(--mal-line)',
      overflow: 'hidden',
      background: 'var(--mal-paper)',
    }}>
      <DemoMode lang={lang} setLang={() => {}} isMobile={isMobile} onExit={() => {}}/>
    </div>
  );
}

// ============================================================
// Persona mount — embeds a single persona app
// ============================================================
function PersonaMount({ persona, lang, isMobile }) {
  const personaPrefersMobile = persona === 'buyer' || persona === 'supplier' || persona === 'anchorSup';
  const [viewport, setViewport] = pS(isMobile ? 'mobile' : (personaPrefersMobile ? 'mobile' : 'desktop'));
  pE(() => { if (isMobile) setViewport('mobile'); }, [isMobile]);
  const personaLabel = {
    buyer: 'Buyer SME',
    supplier: 'Supplier SME',
    hcops: 'Healthcare Provider — Ops',
    hccoder: 'Healthcare Provider — Coder',
    anchorAP: 'Anchor — AP',
    anchorSup: 'Anchor — Supplier',
  }[persona] || persona;

  return (
    <div style={{
      marginTop: 6,
      background: 'var(--mal-paper)',
      border: '1px solid var(--mal-line)',
      borderRadius: 'var(--mal-r-lg)',
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 18px',
        borderBottom: '1px solid var(--mal-line)',
        background: 'var(--mal-surface)',
      }}>
        <span style={{ fontSize: 12, color: 'var(--mal-mid)', fontWeight: 500 }}>{personaLabel}</span>
        {!isMobile && (
          <Tabs value={viewport} onChange={setViewport} size="sm" items={[
            { value: 'mobile', label: 'Mobile' }, { value: 'desktop', label: 'Desktop' },
          ]}/>
        )}
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

// ============================================================
// Coming-soon placeholder for Product 4
// ============================================================
function ComingSoon({ product, isAr }) {
  return (
    <div style={{
      marginTop: 18, padding: '60px 28px',
      background: 'var(--mal-paper)',
      border: '1px solid var(--mal-line)',
      borderRadius: 'var(--mal-r-lg)',
      textAlign: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      <div aria-hidden style={{
        position: 'absolute', top: -100, insetInlineEnd: -100,
        width: 320, height: 320, borderRadius: '50%',
        background: 'conic-gradient(from 90deg, var(--mal-iri-1), var(--mal-iri-2), var(--mal-iri-3), var(--mal-iri-4))',
        filter: 'blur(60px)', opacity: 0.35, pointerEvents: 'none',
      }}/>
      <Pill tone="neutral" dot>{isAr ? 'قريباً' : 'Coming soon'}</Pill>
      <h2 style={{
        fontFamily: 'var(--mal-font-display)', fontStyle: 'italic',
        fontSize: 36, lineHeight: 1.1, margin: '14px 0 10px',
        position: 'relative', zIndex: 2,
      }}>
        {product.title}
      </h2>
      <p style={{ fontSize: 14, color: 'var(--mal-mid)', maxWidth: 560, margin: '0 auto', position: 'relative', zIndex: 2 }}>
        {product.tagline}
      </p>
      <p style={{ fontSize: 13, color: 'var(--mal-mid-2)', marginTop: 18, position: 'relative', zIndex: 2 }}>
        {isAr
          ? 'النموذج الأوليّ لهذا المنتج تحت البناء. الاستراتيجية وحدة الاقتصاد متاحتان في تبويب «الاستراتيجية» و«النمذجة المالية».'
          : 'Prototype for this pillar is under construction. Its strategy and economics are already wired into the Strategy and Financial Modeling tabs.'}
      </p>
    </div>
  );
}

window.SectionPrototype = SectionPrototype;
