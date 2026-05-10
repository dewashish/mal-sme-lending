/* eslint-disable */
// Section 2 — Prototype
// Full-bleed prototype stage. A single floating selector in the top-right
// corner lets the user switch between Products 1-4 and their entries.
// Smart Invoice (Product 1) demo is the default.

const { useState: pS, useEffect: pE, useRef: pR } = React;
const pIco = window.MalIcon;

const PRODUCTS = [
  {
    id: 'p1', code: '01',
    title: 'Smart Invoice + Term Extension',
    short: 'Smart Invoice',
    color: 'lilac',
    available: true,
    defaultEntry: 'demo',
    entries: [
      { id: 'demo',     label: 'Side-by-side demo' },
      { id: 'buyer',    label: 'Buyer SME · standalone' },
      { id: 'supplier', label: 'Supplier SME · standalone' },
    ],
  },
  {
    id: 'p2', code: '02',
    title: 'Healthcare Receivables Engine',
    short: 'Healthcare',
    color: 'coral',
    available: true,
    defaultEntry: 'hcops',
    entries: [
      { id: 'hcops',   label: 'Provider Ops console' },
      { id: 'hccoder', label: 'Coding desk' },
    ],
  },
  {
    id: 'p3', code: '03',
    title: 'Anchor-Led Supply Chain Finance',
    short: 'Anchor SCF',
    color: 'ink',
    available: true,
    defaultEntry: 'anchorAP',
    entries: [
      { id: 'anchorAP',  label: 'Anchor AP console' },
      { id: 'anchorSup', label: 'Anchor Supplier app' },
    ],
  },
  {
    id: 'p4', code: '04',
    title: 'EDB-Guaranteed Distribution + FLDG',
    short: 'FLDG Distribution',
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

  pE(() => {
    const p = PRODUCTS.find((p) => p.id === productId);
    setEntryId(p ? p.defaultEntry : null);
  }, [productId]);

  return (
    <div dir={isAr ? 'rtl' : 'ltr'} style={{
      position: 'relative', minHeight: 'calc(100vh - 56px)', background: 'var(--mal-surface)',
    }}>
      {/* Floating selector — corner */}
      <ProductSelector products={PRODUCTS}
                       productId={productId} entryId={entryId}
                       onPickProduct={setProductId} onPickEntry={setEntryId}
                       isAr={isAr} isMobile={isMobile}/>

      {/* Stage — fills available space */}
      <div style={{ minHeight: 'calc(100vh - 56px)' }}>
        {!product.available && <ComingSoon product={product} isAr={isAr}/>}
        {product.available && entryId === 'demo' && (
          <DemoMode lang={lang} setLang={() => {}} isMobile={isMobile} onExit={() => {}}/>
        )}
        {product.available && entryId !== 'demo' && entryId && (
          <PersonaMount persona={entryId} lang={lang} isMobile={isMobile}/>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Floating product / entry selector — top-right corner
// ============================================================
function ProductSelector({ products, productId, entryId, onPickProduct, onPickEntry, isAr, isMobile }) {
  const [open, setOpen] = pS(false);
  const ref = pR(null);
  const product = products.find((p) => p.id === productId);
  const entry = product?.entries.find((e) => e.id === entryId);
  const display = product
    ? (entry ? product.short + ' · ' + entry.label : product.short)
    : (isAr ? 'اختر' : 'Select');

  // Close on outside click / Escape
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

  return (
    <div ref={ref} style={{
      position: 'fixed',
      top: 70,
      insetInlineEnd: 18,
      zIndex: 60,
    }}>
      <button onClick={() => setOpen((o) => !o)}
              aria-haspopup="menu"
              aria-expanded={open}
              style={{
                all: 'unset', cursor: 'pointer', boxSizing: 'border-box',
                display: 'inline-flex', alignItems: 'center', gap: 10,
                padding: '8px 14px',
                background: 'var(--mal-paper)',
                border: '1px solid var(--mal-line)',
                borderRadius: 999,
                fontSize: 12, fontWeight: 500,
                color: 'var(--mal-ink)',
                boxShadow: 'var(--mal-sh-2)',
                transition: 'border-color .15s, transform .15s',
                maxWidth: isMobile ? 240 : 320,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--mal-primary-3)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--mal-line)'; e.currentTarget.style.transform = ''; }}>
        <Avatar name={product?.code || '?'} tone={product?.color || 'lilac'} size={22}/>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {display}
        </span>
        <span style={{
          fontSize: 10, color: 'var(--mal-mid)',
          transform: open ? 'rotate(180deg)' : 'none',
          transition: 'transform .2s',
        }}>▾</span>
      </button>

      {open && (
        <div role="menu" style={{
          position: 'absolute', top: 'calc(100% + 8px)', insetInlineEnd: 0,
          minWidth: 320, maxWidth: '90vw',
          background: 'var(--mal-paper)',
          border: '1px solid var(--mal-line)',
          borderRadius: 16,
          boxShadow: 'var(--mal-sh-3)',
          padding: 8,
          animation: 'mal-fade-up .18s ease-out',
        }}>
          {products.map((p) => {
            const active = p.id === productId;
            return (
              <div key={p.id} style={{ marginBottom: 4 }}>
                <button onClick={() => {
                          if (!p.available) return;
                          onPickProduct(p.id);
                          if (p.entries.length <= 1) setOpen(false);
                        }}
                        disabled={!p.available}
                        style={{
                          all: 'unset', boxSizing: 'border-box',
                          display: 'flex', alignItems: 'center', gap: 10,
                          width: '100%', padding: '8px 10px',
                          borderRadius: 10,
                          cursor: p.available ? 'pointer' : 'not-allowed',
                          background: active ? 'var(--mal-primary-50)' : 'transparent',
                          opacity: p.available ? 1 : 0.5,
                          transition: 'background .15s',
                        }}
                        onMouseEnter={(e) => { if (!active && p.available) e.currentTarget.style.background = 'var(--mal-surface-2)'; }}
                        onMouseLeave={(e) => { if (!active && p.available) e.currentTarget.style.background = 'transparent'; }}>
                  <Avatar name={p.code} tone={p.color} size={26}/>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--mal-ink)' }}>{p.short}</div>
                    <div style={{ fontSize: 11, color: 'var(--mal-mid)' }}>{p.title}</div>
                  </div>
                  {!p.available && <Pill tone="neutral">Soon</Pill>}
                  {active && p.available && <span style={{ color: 'var(--mal-primary)', fontSize: 14 }}>●</span>}
                </button>
                {/* Entry sub-list — only for the active product with multiple entries */}
                {active && p.available && p.entries.length > 1 && (
                  <div style={{ paddingInlineStart: 36, paddingTop: 4 }}>
                    {p.entries.map((e) => {
                      const eActive = e.id === entryId;
                      return (
                        <button key={e.id} onClick={() => { onPickEntry(e.id); setOpen(false); }}
                                style={{
                                  all: 'unset', cursor: 'pointer', boxSizing: 'border-box',
                                  display: 'flex', alignItems: 'center', gap: 8,
                                  width: '100%', padding: '6px 10px',
                                  borderRadius: 8,
                                  background: eActive ? 'var(--mal-surface-2)' : 'transparent',
                                  fontSize: 12,
                                  color: eActive ? 'var(--mal-ink)' : 'var(--mal-mid)',
                                  fontWeight: eActive ? 600 : 400,
                                  transition: 'background .15s',
                                }}
                                onMouseEnter={(e2) => { if (!eActive) e2.currentTarget.style.background = 'var(--mal-surface)'; }}
                                onMouseLeave={(e2) => { if (!eActive) e2.currentTarget.style.background = 'transparent'; }}>
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
}

// ============================================================
// Persona mount — single-persona embed
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
// Coming-soon (Product 4) — full-screen card
// ============================================================
function ComingSoon({ product, isAr }) {
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
        filter: 'blur(80px)', opacity: 0.35, pointerEvents: 'none',
      }}/>
      <div style={{ textAlign: 'center', position: 'relative', zIndex: 2, maxWidth: 560 }}>
        <Pill tone="neutral" dot>{isAr ? 'قريباً' : 'Coming soon'}</Pill>
        <h2 style={{
          fontFamily: 'var(--mal-font-display)', fontStyle: 'italic',
          fontSize: 44, lineHeight: 1.1, margin: '18px 0 10px',
        }}>
          {product.title}
        </h2>
      </div>
    </div>
  );
}

window.SectionPrototype = SectionPrototype;
