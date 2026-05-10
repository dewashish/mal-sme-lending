/* eslint-disable */
// Mal · Strategy section visual upgrade
// Components for all four upgrade phases:
//   1. Structure & navigation: ChapterCardsGrid, ChapterHero, ReadingProgress,
//      ChapterDivider, DropCap
//   2. Visual content blocks: ThreeProductComparison, CapitalStackDiagram,
//      RegulatoryTimeline, JourneyDiagram, AnchorCards, FldgWaterfall
//   3. Reading & discovery: GlossaryTerm, CrossRef, TableChartToggle,
//      SearchPalette
//   4. Aesthetic: ChapterAmbient, PullQuote
//
// All components consume window.MAL_STRATEGY_DOC and window.MAL_P1_DATA.
// Exported as window.MalStrategyVisuals.

const { useState: sV_S, useEffect: sV_E, useMemo: sV_M, useCallback: sV_CB, useRef: sV_R } = React;

// ============================================================
// Chapter abstracts (curated for the 13 H1s)
// ============================================================
const CHAPTER_ABSTRACTS = {
  '1-executive-overview':
    'The middle of the UAE SME credit market is empty. Banks are slow and collateral-heavy; fintechs are fast but expensive. Mal sits in between with bank-cost capital, digital-first speed, and Sharia by default.',
  '2-platform-context-and-foundations':
    'Foundational capabilities and the operating model the three products share — built once on a tight, AI-leveraged team running at 3x benchmark productivity.',
  '3-product-1-smart-invoice-with-flexible-installmen':
    'Smart Invoice — Mal\'s flagship. B2B Pay & Get Paid: supplier gets 90% advance on day one; buyer chooses Pay-30, BNPL 60-180d, or a 6-month term extension.',
  'product-1-path-2-buyer-led-invoice-extension-loan':
    'Path 2: when the buyer can\'t pay, they sign into a 6-month restructure. Mal takes over the invoice from the supplier.',
  '4-product-2-healthcare-insurance-receivables-engin':
    'Healthcare Receivables Engine — same-day claim advance for clinics, hospitals, and pharmacies against multi-payer insurance receivables.',
  '5-product-3-anchor-led-supply-chain-finance-with-d':
    'Anchor SCF — reverse factoring with daily dynamic-discount auctions, tied to large UAE anchors: Aldar, Majid Al Futtaim, AD Ports, IHC, e&, Lulu Group.',
  '6-cross-product-engineering-and-operations':
    'Capital stack, partner banks, tech architecture, and the unified operating model across the three products.',
  '7-key-risks-and-mitigants':
    'What can go wrong: credit, operational, regulatory, technology. How each risk is contained.',
  '8-closing':
    'Why the timing is right and how the three products together hit AED 17.5B disbursement by Year 3.',
  'appendix-a-wider-product-catalogue':
    '17 additional product cards Mal could launch beyond the core three — DMCC gold, government receivables, payroll bridges, EWA, marketplace seller financing, and more.',
  'appendix-b-ai-leverage-and-agent-architecture':
    'Where AI agents fit in the stack: the 20-agent inventory, decision engine, OCR pipeline, and early-warning system.',
  'appendix-c-product-operating-best-practices':
    'Practical playbook for the product organisation: rituals, comms, hiring, metrics.',
  'appendix-d-edb-guaranteed-sme-term-lending-distrib':
    'Pathway B: capital-light co-lending with the EDB partner-bank scheme and First Loss Default Guarantee. How the risk waterfall actually works.',
};

const CHAPTER_TONE = {
  '1-executive-overview':                              { color: 'lilac',  badge: '01' },
  '2-platform-context-and-foundations':                { color: 'sky',    badge: '02' },
  '3-product-1-smart-invoice-with-flexible-installmen':{ color: 'lilac',  badge: 'P1', live: true },
  'product-1-path-2-buyer-led-invoice-extension-loan': { color: 'lilac',  badge: 'P1·b' },
  '4-product-2-healthcare-insurance-receivables-engin':{ color: 'coral',  badge: 'P2' },
  '5-product-3-anchor-led-supply-chain-finance-with-d':{ color: 'ink',    badge: 'P3' },
  '6-cross-product-engineering-and-operations':        { color: 'sage',   badge: '06' },
  '7-key-risks-and-mitigants':                         { color: 'peach',  badge: '07' },
  '8-closing':                                         { color: 'lilac',  badge: '08' },
  'appendix-a-wider-product-catalogue':                { color: 'sky',    badge: 'A' },
  'appendix-b-ai-leverage-and-agent-architecture':     { color: 'lilac',  badge: 'B' },
  'appendix-c-product-operating-best-practices':       { color: 'sage',   badge: 'C' },
  'appendix-d-edb-guaranteed-sme-term-lending-distrib':{ color: 'peach',  badge: 'D' },
};

const TONE_TO_GRADIENT = {
  lilac: 'linear-gradient(135deg, rgba(201,183,232,0.25), rgba(182,163,220,0.12))',
  sky:   'linear-gradient(135deg, rgba(182,207,232,0.30), rgba(155,184,218,0.12))',
  coral: 'linear-gradient(135deg, rgba(240,183,194,0.28), rgba(229,159,172,0.12))',
  ink:   'linear-gradient(135deg, rgba(42,31,111,0.18), rgba(26,26,40,0.06))',
  peach: 'linear-gradient(135deg, rgba(251,217,181,0.30), rgba(240,199,149,0.12))',
  sage:  'linear-gradient(135deg, rgba(168,192,154,0.28), rgba(140,170,124,0.10))',
};

// Approximate word-count → read time per chapter (calibrated by manual sampling)
const READ_TIMES = {
  '1-executive-overview': 4,
  '2-platform-context-and-foundations': 6,
  '3-product-1-smart-invoice-with-flexible-installmen': 22,
  'product-1-path-2-buyer-led-invoice-extension-loan': 18,
  '4-product-2-healthcare-insurance-receivables-engin': 16,
  '5-product-3-anchor-led-supply-chain-finance-with-d': 14,
  '6-cross-product-engineering-and-operations': 9,
  '7-key-risks-and-mitigants': 5,
  '8-closing': 2,
  'appendix-a-wider-product-catalogue': 12,
  'appendix-b-ai-leverage-and-agent-architecture': 8,
  'appendix-c-product-operating-best-practices': 10,
  'appendix-d-edb-guaranteed-sme-term-lending-distrib': 14,
};

// ============================================================
// PHASE 1 — Chapter cards grid (replaces empty top of strategy section)
// ============================================================
function ChapterCardsGrid({ chapters, onJump, isAr, isMobile }) {
  return (
    <section style={{ margin: '4px 0 36px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em',
                        textTransform: 'uppercase', color: 'var(--mal-mid-2)', marginBottom: 6 }}>
            {isAr ? 'الفهرس · ١٣ فصلاً' : 'Chapters · 13'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--mal-mid)', lineHeight: 1.55, maxWidth: 520 }}>
            {isAr
              ? 'انقر أي فصل للقفز إليه. الأرقام المباشرة تظهر داخل فصول المنتجات في قسم الاقتصاد الوحدوي.'
              : 'Click any chapter to jump in. Live numbers appear inside the product chapters at their unit-economics sections.'}
          </div>
        </div>
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: 12,
      }}>
        {chapters.map((ch) => {
          const tone = CHAPTER_TONE[ch.id] || { color: 'lilac', badge: ch.text.slice(0, 2) };
          const grad = TONE_TO_GRADIENT[tone.color] || TONE_TO_GRADIENT.lilac;
          const abstract = CHAPTER_ABSTRACTS[ch.id] || '';
          const readMin = READ_TIMES[ch.id] || 5;
          return (
            <button key={ch.id} onClick={() => onJump(ch.id)} style={{
              all: 'unset', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', gap: 10,
              padding: 18, borderRadius: 14,
              background: grad,
              border: '1px solid var(--mal-line)',
              transition: 'transform .18s, border-color .18s, box-shadow .18s',
              minHeight: 160,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.borderColor = 'var(--mal-primary-3)';
              e.currentTarget.style.boxShadow = 'var(--mal-sh-2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = 'var(--mal-line)';
              e.currentTarget.style.boxShadow = 'none';
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{
                  fontFamily: 'var(--mal-font-display)', fontStyle: 'italic',
                  fontSize: 22, lineHeight: 1, color: 'var(--mal-ink)',
                  letterSpacing: '-0.02em',
                }}>{tone.badge}</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  {tone.live && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, letterSpacing: '.06em',
                      padding: '2px 6px', borderRadius: 999,
                      background: 'var(--mal-success)', color: '#fff',
                    }}>LIVE</span>
                  )}
                  <span style={{
                    fontSize: 10, fontWeight: 500, letterSpacing: '.04em',
                    padding: '2px 6px', borderRadius: 999,
                    background: 'rgba(255,255,255,.5)', color: 'var(--mal-mid)',
                  }}>{readMin} min</span>
                </div>
              </div>
              <div style={{
                fontFamily: 'var(--mal-font-display)', fontStyle: 'italic',
                fontSize: 17, lineHeight: 1.2, color: 'var(--mal-ink)',
                letterSpacing: '-0.01em',
              }}>{ch.text}</div>
              {abstract && (
                <div style={{ fontSize: 12, lineHeight: 1.55, color: 'var(--mal-mid)' }}>
                  {abstract}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

// ============================================================
// PHASE 1 — Per-chapter hero (rendered ABOVE each H1)
// ============================================================
function ChapterHero({ chapter, isAr }) {
  const tone = CHAPTER_TONE[chapter.id] || { color: 'lilac', badge: '··' };
  const abstract = CHAPTER_ABSTRACTS[chapter.id];
  const readMin = READ_TIMES[chapter.id] || 5;
  const grad = TONE_TO_GRADIENT[tone.color] || TONE_TO_GRADIENT.lilac;
  return (
    <div style={{
      margin: '40px 0 22px',
      padding: '20px 24px',
      borderRadius: 14,
      background: grad,
      border: '1px solid var(--mal-line)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
        <span style={{
          fontFamily: 'var(--mal-font-display)', fontStyle: 'italic',
          fontSize: 32, lineHeight: 1, color: 'var(--mal-ink)',
          letterSpacing: '-0.02em',
        }}>{tone.badge}</span>
        <span style={{
          fontSize: 10.5, fontWeight: 600, letterSpacing: '.08em',
          textTransform: 'uppercase', color: 'var(--mal-mid-2)',
        }}>{isAr ? 'فصل' : 'Chapter'} · {readMin} {isAr ? 'دقائق قراءة' : 'min read'}</span>
        {tone.live && (
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '.06em',
            padding: '2px 6px', borderRadius: 999,
            background: 'var(--mal-success)', color: '#fff',
          }}>{isAr ? 'نموذج مباشر' : 'LIVE MODEL'}</span>
        )}
      </div>
      {abstract && (
        <p style={{ fontSize: 14, lineHeight: 1.65, color: 'var(--mal-ink)', margin: 0, fontStyle: 'italic' }}>
          {abstract}
        </p>
      )}
    </div>
  );
}

// ============================================================
// PHASE 1 — Reading-progress sticky bar
// ============================================================
function ReadingProgress({ activeChapterIdx, totalChapters, currentTitle, isAr }) {
  const [pct, setPct] = sV_S(0);
  sV_E(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setPct(max > 0 ? Math.min(100, (h.scrollTop / max) * 100) : 0);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <div style={{
      position: 'sticky', top: 56, zIndex: 40,
      background: 'rgba(250,247,238,.92)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      borderBottom: '1px solid var(--mal-line)',
      marginInline: 0,
    }}>
      <div style={{ height: 2, background: 'var(--mal-line)' }}>
        <div style={{
          height: '100%', width: pct + '%',
          background: 'linear-gradient(90deg, var(--mal-primary), var(--mal-primary-3))',
          transition: 'width .12s linear',
        }}/>
      </div>
      <div style={{
        padding: '8px 18px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', gap: 10, flexWrap: 'wrap',
        fontSize: 11, color: 'var(--mal-mid)',
      }}>
        <span style={{ fontWeight: 500, color: 'var(--mal-ink)' }}>{currentTitle || (isAr ? 'الاستراتيجية' : 'Strategy')}</span>
        <span style={{ letterSpacing: '.04em' }}>
          {isAr ? `الفصل ${activeChapterIdx + 1} من ${totalChapters}` : `Chapter ${activeChapterIdx + 1} of ${totalChapters}`}
          <span style={{ marginInline: 8, color: 'var(--mal-mid-2)' }}>·</span>
          {Math.round(pct)}%
        </span>
      </div>
    </div>
  );
}

// ============================================================
// PHASE 1 — Chapter divider rule (between H1 chapters)
// ============================================================
function ChapterDivider({ nextLabel, nextNum }) {
  return (
    <div style={{
      margin: '64px 0 8px',
      display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <div style={{
        flex: 1, height: 1,
        background: 'linear-gradient(90deg, transparent, var(--mal-line), var(--mal-line))',
      }}/>
      <span style={{
        fontSize: 10, fontWeight: 600, letterSpacing: '.12em',
        textTransform: 'uppercase', color: 'var(--mal-mid-2)',
      }}>{nextNum && <span style={{ marginInlineEnd: 6 }}>{nextNum}</span>}{nextLabel}</span>
      <div style={{ flex: 0, width: 24, height: 1, background: 'var(--mal-line)' }}/>
    </div>
  );
}

// ============================================================
// PHASE 1 — Drop cap (first letter of first paragraph after H1)
// ============================================================
function applyDropCap(text) {
  if (!text || text.length < 4) return null;
  const first = text.charAt(0);
  const rest = text.slice(1);
  return { first, rest };
}

// ============================================================
// PHASE 2 — Three-product comparison strip
// ============================================================
function ThreeProductComparison({ isAr }) {
  const liveData = (typeof window !== 'undefined') ? window.MAL_P1_DATA : null;
  const products = [
    {
      code: 'P1', title: 'Smart Invoice', tone: 'lilac', live: true,
      disbY3: liveData ? liveData.disbursement.y3.face : 4000,
      ncY3:   liveData ? liveData.pnl.y3.netContrib : 46,
      roaY3:  liveData ? liveData.ratios.y3.roaPct : 5.65,
      blurb: 'B2B BNPL on invoices; supplier paid day one.',
    },
    {
      code: 'P2', title: 'Healthcare Receivables', tone: 'coral', live: false,
      disbY3: '—', ncY3: '—', roaY3: '—',
      blurb: 'Same-day claim advance · multi-payer.',
    },
    {
      code: 'P3', title: 'Anchor SCF', tone: 'ink', live: false,
      disbY3: '—', ncY3: '—', roaY3: '—',
      blurb: 'Reverse factoring · dynamic-discount auction.',
    },
  ];
  const fmtAed = (n) => {
    if (typeof n !== 'number') return n;
    if (n >= 1000) return 'AED ' + (n/1000).toFixed(1) + 'B';
    return 'AED ' + Math.round(n) + 'M';
  };
  return (
    <section style={{ margin: '24px 0 32px' }}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em',
                    textTransform: 'uppercase', color: 'var(--mal-mid-2)', marginBottom: 12 }}>
        {isAr ? 'مقارنة المنتجات الثلاثة · السنة ٣' : 'Three products at a glance · Year 3'}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        {products.map((p) => (
          <div key={p.code} style={{
            padding: 18, borderRadius: 14,
            background: TONE_TO_GRADIENT[p.tone],
            border: '1px solid var(--mal-line)',
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: 'var(--mal-font-display)', fontStyle: 'italic',
                             fontSize: 22, color: 'var(--mal-ink)' }}>{p.code}</span>
              {p.live ? (
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.06em',
                              padding: '2px 6px', borderRadius: 999,
                              background: 'var(--mal-success)', color: '#fff' }}>LIVE</span>
              ) : (
                <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '.06em',
                              padding: '2px 6px', borderRadius: 999,
                              background: 'var(--mal-line)', color: 'var(--mal-mid)' }}>SOON</span>
              )}
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--mal-ink)' }}>{p.title}</div>
            <div style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--mal-mid)' }}>{p.blurb}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginTop: 4 }}>
              {[
                [isAr ? 'صرف' : 'Disb', fmtAed(p.disbY3)],
                ['NC',   fmtAed(p.ncY3)],
                ['ROA',  typeof p.roaY3 === 'number' ? p.roaY3.toFixed(1) + '%' : p.roaY3],
              ].map(([lbl, v], i) => (
                <div key={i} style={{
                  padding: '6px 8px', borderRadius: 8,
                  background: 'rgba(255,255,255,.55)', border: '1px solid rgba(0,0,0,.06)',
                }}>
                  <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '.06em',
                                textTransform: 'uppercase', color: 'var(--mal-mid-2)' }}>{lbl}</div>
                  <div style={{ fontFamily: 'var(--mal-font-mono)', fontSize: 11.5,
                                fontWeight: 600, color: 'var(--mal-ink)' }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ============================================================
// PHASE 2 — Capital stack horizontal stacked bar
// ============================================================
function CapitalStackDiagram({ isAr }) {
  const data = (typeof window !== 'undefined') ? window.MAL_P1_DATA : null;
  if (!data?.fundingStack) return null;
  const tranches = data.fundingStack.tranches;
  const blended = data.fundingStack.blendedCof;
  return (
    <section style={{ margin: '20px 0 28px', padding: 18, borderRadius: 14,
                      background: 'var(--mal-paper)', border: '1px solid var(--mal-line)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                    marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--mal-ink)' }}>
          {isAr ? 'هيكل التمويل · شلال السيولة' : 'Capital stack · funding waterfall'}
        </div>
        <div style={{ fontSize: 11, color: 'var(--mal-mid)' }}>
          {isAr ? 'تكلفة مرجحة' : 'Blended COF'} <strong style={{ color: 'var(--mal-ink)' }}>{(blended * 100).toFixed(2)}%</strong>
        </div>
      </div>
      <div style={{ display: 'flex', height: 36, borderRadius: 6, overflow: 'hidden',
                    border: '1px solid var(--mal-line-2)' }}>
        {tranches.map((t, i) => {
          const pct = t.share * 100;
          const colors = ['#1A1A28', '#7B41E1', '#A8C09A'];
          return (
            <div key={i} style={{
              width: pct + '%', background: colors[i],
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 11, fontWeight: 600,
            }} title={t.name}>{Math.round(pct)}%</div>
          );
        })}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 12 }}>
        {tranches.map((t, i) => {
          const colors = ['#1A1A28', '#7B41E1', '#A8C09A'];
          return (
            <div key={i} style={{ fontSize: 11.5, lineHeight: 1.5 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: colors[i] }}/>
                <strong style={{ color: 'var(--mal-ink)' }}>{t.name}</strong>
              </div>
              <div style={{ color: 'var(--mal-mid)', fontFamily: 'var(--mal-font-mono)' }}>
                {Math.round(t.share * 100)}% · {t.spread ? '+' + t.spread + 'bps' : 'no interest'} · {t.allIn ? (t.allIn * 100).toFixed(1) + '%' : '—'}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ============================================================
// PHASE 2 — Regulatory timeline
// ============================================================
function RegulatoryTimeline({ isAr }) {
  const events = [
    { date: '10 Jul 2025', label: isAr ? 'تنظيم البنك المركزي للتمويل المفتوح' : 'CBUAE Open Finance Reg in force', tone: 'sage' },
    { date: 'Jul 2026',    label: isAr ? 'تجربة الفوترة الإلكترونية الفيدرالية' : 'Federal e-invoicing pilot', tone: 'lilac' },
    { date: 'Jan 2027',    label: isAr ? 'إلزامي للمموّلين الكبار' : 'Mandatory · large taxpayers', tone: 'coral' },
    { date: 'Jul 2027',    label: isAr ? 'إلزامي لجميع SMEs' : 'Mandatory · all SMEs', tone: 'peach' },
  ];
  return (
    <section style={{ margin: '20px 0 28px', padding: 18, borderRadius: 14,
                      background: 'var(--mal-paper)', border: '1px solid var(--mal-line)' }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--mal-ink)', marginBottom: 16 }}>
        {isAr ? 'الجدول الزمني التنظيمي' : 'Regulatory timeline · UAE'}
      </div>
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between',
                    paddingTop: 18, paddingBottom: 4 }}>
        <div style={{ position: 'absolute', top: 26, left: 16, right: 16, height: 2,
                      background: 'linear-gradient(90deg, #A8C09A, #C9B7E8, #F0B7C2, #FBD9B5)' }}/>
        {events.map((e, i) => (
          <div key={i} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 6, position: 'relative', flex: 1, textAlign: 'center',
          }}>
            <div style={{
              width: 18, height: 18, borderRadius: 999,
              background: '#FAF7EE', border: '2px solid var(--mal-ink)',
              boxShadow: '0 0 0 4px rgba(250,247,238,1)',
            }}/>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--mal-ink)',
                          fontFamily: 'var(--mal-font-mono)' }}>{e.date}</div>
            <div style={{ fontSize: 10.5, color: 'var(--mal-mid)', lineHeight: 1.4,
                          maxWidth: 140 }}>{e.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ============================================================
// PHASE 2 — Anchor cards (Section 5.2 Target Anchors)
// ============================================================
function AnchorCards({ isAr }) {
  const anchors = [
    { name: 'Aldar Properties', sector: isAr ? 'العقارات' : 'Real estate', key: 'AL' },
    { name: 'Majid Al Futtaim', sector: isAr ? 'تجزئة وترفيه' : 'Retail · leisure', key: 'MAF' },
    { name: 'AD Ports Group',   sector: isAr ? 'لوجستيات' : 'Logistics · ports', key: 'AD' },
    { name: 'IHC',              sector: isAr ? 'تكتل' : 'Conglomerate', key: 'IHC' },
    { name: 'e&',               sector: isAr ? 'اتصالات' : 'Telecom', key: 'E&' },
    { name: 'Lulu Group',       sector: isAr ? 'تجزئة' : 'Retail', key: 'LU' },
  ];
  return (
    <section style={{ margin: '20px 0 28px' }}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em',
                    textTransform: 'uppercase', color: 'var(--mal-mid-2)', marginBottom: 10 }}>
        {isAr ? 'المراسي المستهدفة · ٦' : 'Target anchors · 6'}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
        {anchors.map((a) => (
          <div key={a.key} style={{
            padding: 14, borderRadius: 12,
            background: 'var(--mal-paper)', border: '1px solid var(--mal-line)',
            transition: 'transform .15s, border-color .15s',
            cursor: 'default',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.borderColor = 'var(--mal-primary-3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.borderColor = 'var(--mal-line)';
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: 'linear-gradient(135deg, #2A1F6F, #1A1A28)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--mal-font-display)', fontStyle: 'italic',
              fontSize: 14, color: '#fff', marginBottom: 8,
            }}>{a.key}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--mal-ink)' }}>{a.name}</div>
            <div style={{ fontSize: 11, color: 'var(--mal-mid)', marginTop: 2 }}>{a.sector}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ============================================================
// PHASE 2 — Buyer / supplier journey (6-step horizontal flow)
// ============================================================
function JourneyDiagram({ persona, isAr }) {
  const steps = persona === 'supplier'
    ? [
        { n: '01', label: isAr ? 'تسجيل المورد' : 'Onboard',  sub: isAr ? 'KYB · ربط بنك' : 'KYB · bank link' },
        { n: '02', label: isAr ? 'رفع الفاتورة' : 'Upload invoice', sub: isAr ? 'OCR · فحص' : 'OCR · verify' },
        { n: '03', label: isAr ? 'دفع فوري' : 'Get paid Day 1', sub: isAr ? '٩٠٪ تقدّم' : '90% advance' },
        { n: '04', label: isAr ? 'تتبع' : 'Track', sub: isAr ? 'حالة المشتري' : 'Buyer status' },
        { n: '05', label: isAr ? 'تسوية احتجاز' : 'Holdback released', sub: isAr ? 'بعد الدفع' : 'after payoff' },
        { n: '06', label: isAr ? 'مغلق' : 'Closed', sub: isAr ? 'دورة جديدة' : 'next cycle' },
      ]
    : [
        { n: '01', label: isAr ? 'تسجيل المشتري' : 'Onboard',  sub: isAr ? 'KYB · WPS' : 'KYB · WPS' },
        { n: '02', label: isAr ? 'استلام الفاتورة' : 'Receive invoice', sub: isAr ? 'إشعار' : 'notification' },
        { n: '03', label: isAr ? 'اختر خطة' : 'Pick plan',  sub: isAr ? '٣٠/٦٠/٩٠/١٢٠/١٨٠' : '30/60/90/120/180d' },
        { n: '04', label: isAr ? 'وقّع' : 'Sign', sub: isAr ? 'OTP' : 'OTP signature' },
        { n: '05', label: isAr ? 'مباشر' : 'Live · repay', sub: isAr ? 'أقساط' : 'instalments' },
        { n: '06', label: isAr ? 'مغلق · أو تمديد' : 'Closed · or extend', sub: isAr ? '٦ أشهر' : '6-mo workout' },
      ];
  return (
    <section style={{ margin: '20px 0 28px', padding: 18, borderRadius: 14,
                      background: 'var(--mal-paper)', border: '1px solid var(--mal-line)' }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--mal-ink)', marginBottom: 14 }}>
        {persona === 'supplier'
          ? (isAr ? 'رحلة المورد · من الإعداد إلى التسوية' : 'Supplier journey · onboard → settle')
          : (isAr ? 'رحلة المشتري · من الاستلام إلى التمديد' : 'Buyer journey · receive → close or extend')}
      </div>
      <div style={{ display: 'flex', gap: 4, alignItems: 'stretch', overflowX: 'auto', paddingBottom: 4 }}>
        {steps.map((s, i) => (
          <React.Fragment key={i}>
            <div style={{
              flex: '1 1 0', minWidth: 110,
              padding: 12, borderRadius: 10,
              background: i === steps.length - 1 ? 'var(--mal-primary-50)' : 'var(--mal-surface-2)',
              border: '1px solid var(--mal-line-2)',
              display: 'flex', flexDirection: 'column', gap: 4,
            }}>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.08em',
                            color: 'var(--mal-mid-2)' }}>{s.n}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--mal-ink)' }}>{s.label}</span>
              <span style={{ fontSize: 10.5, color: 'var(--mal-mid)' }}>{s.sub}</span>
            </div>
            {i < steps.length - 1 && (
              <div style={{
                alignSelf: 'center', color: 'var(--mal-mid-2)', fontSize: 14, padding: '0 2px',
              }}>→</div>
            )}
          </React.Fragment>
        ))}
      </div>
    </section>
  );
}

// ============================================================
// PHASE 2 — FLDG waterfall (loss cascade)
// ============================================================
function FldgWaterfall({ isAr }) {
  const layers = [
    { label: isAr ? 'أول ٥٪ خسارة' : 'First 5% of losses', who: 'FLDG cushion (Mal-funded)', tone: 'lilac' },
    { label: isAr ? 'الخسائر بين ٥-١٥٪' : 'Losses 5–15%', who: isAr ? 'حقوق الملكية لدى Mal' : 'Mal equity', tone: 'sky' },
    { label: isAr ? 'فوق ١٥٪' : 'Beyond 15%', who: isAr ? 'البنك الشريك' : 'Partner bank (senior)', tone: 'sage' },
  ];
  return (
    <section style={{ margin: '20px 0 28px', padding: 18, borderRadius: 14,
                      background: 'var(--mal-paper)', border: '1px solid var(--mal-line)' }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--mal-ink)', marginBottom: 14 }}>
        {isAr ? 'شلال FLDG · توزيع الخسائر' : 'FLDG waterfall · loss cascade'}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {layers.map((l, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 14px', borderRadius: 10,
            background: TONE_TO_GRADIENT[l.tone] || 'var(--mal-surface-2)',
            border: '1px solid var(--mal-line-2)',
          }}>
            <div style={{
              fontFamily: 'var(--mal-font-display)', fontStyle: 'italic',
              fontSize: 18, color: 'var(--mal-ink)', minWidth: 40, textAlign: 'center',
            }}>{i+1}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--mal-ink)' }}>{l.label}</div>
              <div style={{ fontSize: 11, color: 'var(--mal-mid)', marginTop: 2 }}>{l.who}</div>
            </div>
            <div style={{ fontSize: 16, color: 'var(--mal-mid-2)' }}>↓</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 12, fontSize: 11, color: 'var(--mal-mid)', lineHeight: 1.6 }}>
        {isAr
          ? 'يحمي هذا الشلال البنك الشريك من ١٥٪ من الخسائر. Mal تأخذ المخاطر الأعلى مقابل تكلفة رأس مال أقل.'
          : 'Cushion shields the partner bank from the first 15% of losses. Mal absorbs first-loss risk in return for capital-light economics on the rest.'}
      </div>
    </section>
  );
}

// ============================================================
// PHASE 3 — Glossary terms (auto-tooltip)
// ============================================================
const GLOSSARY = {
  'CBUAE': 'Central Bank of the United Arab Emirates — primary financial-services regulator',
  'EDB': 'Emirates Development Bank — federal bank running the SME credit guarantee scheme',
  'FLDG': 'First Loss Default Guarantee — risk-sharing structure where Mal absorbs the first slice of losses',
  'BNPL': 'Buy Now Pay Later — instalment-based deferred payment',
  'EIBOR': 'Emirates Interbank Offered Rate — UAE benchmark interest rate',
  'FAB': 'First Abu Dhabi Bank',
  'IHC': 'International Holding Company — Abu Dhabi-listed conglomerate',
  'OCR': 'Optical Character Recognition — extracts data from invoice images',
  'KYC': 'Know Your Customer — identity verification for individuals',
  'KYB': 'Know Your Business — identity verification for entities',
  'NPL': 'Non-Performing Loan — loan in default or at risk of default',
  'RWA': 'Risk-Weighted Assets — Basel-defined capital base',
  'IRB': 'Internal Ratings Based — Basel III risk modelling approach',
  'SCF': 'Supply Chain Finance — financing across the buyer-supplier-anchor chain',
  'WPS': 'Wage Protection System — UAE central payroll registry',
  'FSRA': 'Financial Services Regulatory Authority — ADGM\'s financial regulator',
  'DMCC': 'Dubai Multi Commodities Centre — Dubai free zone for commodity trading',
  'NBFC': 'Non-Banking Financial Company',
  'NIM':  'Net Interest Margin — gross yield minus cost of funds',
  'RAROC':'Risk-Adjusted Return on Capital',
  'PD':   'Probability of Default',
  'LGD':  'Loss Given Default',
  'EAD':  'Exposure at Default',
};
function GlossaryTerm({ term, children }) {
  const def = GLOSSARY[term];
  if (!def) return <>{children || term}</>;
  return (
    <span title={def} style={{
      borderBottom: '1px dotted var(--mal-mid-2)', cursor: 'help',
    }}>{children || term}</span>
  );
}

// ============================================================
// PHASE 3 — Cross-references inside spans
// "Product 1" / "Section 4.12" / "Path 2" → click jumps
// ============================================================
function CrossRef({ to, children, jumpTo }) {
  return (
    <button onClick={() => jumpTo(to)} style={{
      all: 'unset', cursor: 'pointer', color: 'var(--mal-primary)',
      borderBottom: '1px solid transparent',
      transition: 'border-color .15s',
    }}
    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--mal-primary)'; }}
    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent'; }}>
      {children}
    </button>
  );
}

// ============================================================
// PHASE 3 — Cmd+K search palette
// ============================================================
function SearchPalette({ open, onClose, toc, onJump, isAr }) {
  const [q, setQ] = sV_S('');
  const inputRef = sV_R(null);
  sV_E(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQ('');
    }
  }, [open]);
  sV_E(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  const lower = q.toLowerCase().trim();
  const results = lower
    ? toc.filter((t) => t.text.toLowerCase().includes(lower)).slice(0, 12)
    : toc.slice(0, 12);

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
         style={{
           position: 'fixed', inset: 0, background: 'rgba(10,10,15,.55)',
           zIndex: 220, display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
           paddingTop: '15vh',
         }}>
      <div style={{
        width: 560, maxWidth: '90vw',
        background: '#FAF7EE', border: '1px solid var(--mal-line)',
        borderRadius: 14, boxShadow: '0 24px 70px rgba(10,10,28,.5)',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--mal-line)' }}>
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)}
                 placeholder={isAr ? 'ابحث في الفصول والأقسام...' : 'Search chapters and sections…'}
                 style={{
                   all: 'unset', width: '100%', fontSize: 16,
                   color: 'var(--mal-ink)',
                 }}/>
        </div>
        <div style={{ maxHeight: 420, overflowY: 'auto' }}>
          {results.map((t) => (
            <button key={t.id} onClick={() => { onJump(t.id); onClose(); }} style={{
              all: 'unset', cursor: 'pointer', display: 'block',
              padding: '10px 18px', width: '100%',
              borderTop: '1px solid var(--mal-line-2)',
              background: 'transparent',
              transition: 'background .12s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--mal-surface-2)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.06em',
                            textTransform: 'uppercase', color: 'var(--mal-mid-2)' }}>
                {t.level === 1 ? (isAr ? 'فصل' : 'Chapter') : (isAr ? 'قسم' : 'Section')}
              </div>
              <div style={{ fontSize: 13, color: 'var(--mal-ink)', marginTop: 2 }}>{t.text}</div>
            </button>
          ))}
          {!results.length && (
            <div style={{ padding: '18px 18px 24px', fontSize: 12, color: 'var(--mal-mid)', textAlign: 'center' }}>
              {isAr ? 'لا توجد نتائج' : 'No matches'}
            </div>
          )}
        </div>
        <div style={{
          padding: '8px 18px', fontSize: 10.5, color: 'var(--mal-mid-2)',
          background: 'var(--mal-surface-2)',
        }}>
          {isAr ? 'Esc لإغلاق · ↑↓ للتصفح · Enter للقفز' : 'Esc close · ↵ jump · ⌘K open'}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PHASE 4 — Chapter ambient orb (background tint)
// ============================================================
function ChapterAmbient({ chapterId }) {
  const tone = CHAPTER_TONE[chapterId];
  if (!tone) return null;
  const colors = {
    lilac: '#C9B7E8', sky: '#B6CFE8', coral: '#F0B7C2',
    ink: '#2A1F6F',   peach: '#FBD9B5', sage: '#A8C09A',
  };
  return (
    <div aria-hidden style={{
      position: 'fixed', insetInlineEnd: -240, top: 240,
      width: 480, height: 480, borderRadius: '50%',
      background: colors[tone.color] || '#C9B7E8',
      filter: 'blur(120px)', opacity: 0.18,
      pointerEvents: 'none', zIndex: 0,
      transition: 'background .8s',
    }}/>
  );
}

// ============================================================
// PHASE 4 — Pull-quote (oversized italic display)
// ============================================================
function PullQuote({ children }) {
  return (
    <blockquote style={{
      margin: '24px -20px',
      padding: '0 20px',
      borderInlineStart: '3px solid var(--mal-primary-3)',
      fontFamily: 'var(--mal-font-display)', fontStyle: 'italic',
      fontSize: 22, lineHeight: 1.4, color: 'var(--mal-ink)',
      letterSpacing: '-0.01em',
    }}>{children}</blockquote>
  );
}

// ============================================================
// ApiEndpoint — Stripe/Postman-style compact API container
// ============================================================
const METHOD_COLOR = {
  GET:    { fg: '#0a8056', bg: 'rgba(10,128,86,0.12)',  border: 'rgba(10,128,86,0.28)' },
  POST:   { fg: '#1f54c8', bg: 'rgba(31,84,200,0.10)',  border: 'rgba(31,84,200,0.26)' },
  PUT:    { fg: '#b06a14', bg: 'rgba(176,106,20,0.12)', border: 'rgba(176,106,20,0.28)' },
  PATCH:  { fg: '#b06a14', bg: 'rgba(176,106,20,0.12)', border: 'rgba(176,106,20,0.28)' },
  DELETE: { fg: '#b8364b', bg: 'rgba(184,54,75,0.12)',  border: 'rgba(184,54,75,0.28)' },
};

// Tiny JSON-ish syntax colorizer. Source isn't strict JSON (has // comments,
// pseudo-types like "buyer" | "supplier"), so we work line-by-line with regexes.
function colorizeJsonLine(line) {
  const out = [];
  let i = 0, n = line.length;
  while (i < n) {
    const ch = line[i];
    // line comment
    if (ch === '/' && line[i+1] === '/') {
      out.push({ kind: 'cmt', text: line.slice(i) });
      break;
    }
    // string / key (in double quotes)
    if (ch === '"') {
      let j = i + 1;
      while (j < n && (line[j] !== '"' || line[j-1] === '\\')) j++;
      const tok = line.slice(i, j + 1);
      // is this a key? next non-space char after the closing quote must be ':'
      let k = j + 1;
      while (k < n && line[k] === ' ') k++;
      const isKey = line[k] === ':';
      out.push({ kind: isKey ? 'key' : 'str', text: tok });
      i = j + 1; continue;
    }
    // number
    if (/[0-9]/.test(ch) || (ch === '-' && /[0-9]/.test(line[i+1]))) {
      let j = i + 1;
      while (j < n && /[0-9.eE+\-]/.test(line[j])) j++;
      out.push({ kind: 'num', text: line.slice(i, j) });
      i = j; continue;
    }
    // keywords
    const rest = line.slice(i);
    const kwm = rest.match(/^(true|false|null|undefined)\b/);
    if (kwm) {
      out.push({ kind: 'kw', text: kwm[0] });
      i += kwm[0].length; continue;
    }
    out.push({ kind: 'punct', text: ch });
    i++;
  }
  const palette = {
    key:   { color: '#5a3aa3' },           // brand purple (keys)
    str:   { color: '#0a8056' },           // green (strings)
    num:   { color: '#1f54c8' },           // blue (numbers)
    kw:    { color: '#b06a14' },           // orange (keywords)
    cmt:   { color: 'var(--mal-ink-3)', fontStyle: 'italic' },
    punct: { color: 'var(--mal-ink-2)' },
  };
  return out.map((t, k) => (
    <span key={k} style={palette[t.kind]}>{t.text}</span>
  ));
}

function CodeBlock({ body, dim }) {
  const lines = (body || '').split('\n');
  return (
    <pre style={{
      margin: 0,
      padding: '12px 14px',
      background: 'var(--mal-paper)',
      border: '1px solid var(--mal-line)',
      borderRadius: 10,
      fontFamily: 'var(--mal-font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)',
      fontSize: 12.5,
      lineHeight: 1.55,
      color: 'var(--mal-ink-1)',
      overflowX: 'auto',
      whiteSpace: 'pre',
      transition: 'opacity .25s ease',
      opacity: dim ? 0.55 : 1,
    }}>
      {lines.map((ln, i) => (
        <div key={i}>{ln.length === 0 ? '\u00a0' : colorizeJsonLine(ln)}</div>
      ))}
    </pre>
  );
}

function ApiEndpoint({ method, path, num, description, sections, isAr }) {
  const color = METHOD_COLOR[method] || METHOD_COLOR.POST;
  const requestSec = sections.find((s) => /^Request/i.test(s.label));
  const responseSecs = sections.filter((s) => /^Response/i.test(s.label));
  const otherSecs = sections.filter(
    (s) => !/^Request/i.test(s.label) && !/^Response/i.test(s.label)
  );
  const hasPayload = !!requestSec || responseSecs.length > 0;

  const [running, setRunning] = sV_S(false);
  const [shown, setShown] = sV_S(false);
  const [respIdx, setRespIdx] = sV_S(0);

  const onRun = () => {
    if (!hasPayload || running) return;
    setRunning(true);
    setShown(false);
    setTimeout(() => {
      setRunning(false);
      setShown(true);
    }, 520);
  };

  const onReset = () => {
    setShown(false);
    setRunning(false);
  };

  const activeResp = responseSecs[respIdx] || responseSecs[0];
  // Parse "Response 202 (Accepted)" → status code + label
  const respMeta = (s) => {
    if (!s) return { code: '200', sub: '' };
    const m = (s.label || '').match(/Response\s+(\d+)\s*(?:\((.*?)\))?/i);
    return { code: m ? m[1] : '200', sub: m && m[2] ? m[2] : '' };
  };

  return (
    <div style={{
      margin: '20px 0 28px',
      border: '1px solid var(--mal-line)',
      borderRadius: 14,
      background: 'var(--mal-surface-1, var(--mal-paper))',
      overflow: 'hidden',
      direction: isAr ? 'rtl' : 'ltr',
    }}>
      {/* Header bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px',
        borderBottom: '1px solid var(--mal-line)',
        background: 'var(--mal-surface-2)',
      }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center',
          fontFamily: 'var(--mal-font-mono)',
          fontSize: 11.5, fontWeight: 700, letterSpacing: 0.4,
          color: color.fg, background: color.bg,
          border: `1px solid ${color.border}`,
          borderRadius: 6, padding: '3px 8px',
        }}>{method}</span>
        <code style={{
          fontFamily: 'var(--mal-font-mono)',
          fontSize: 13.5, color: 'var(--mal-ink-1)',
          fontWeight: 500,
          flex: 1, minWidth: 0,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{path}</code>
        {num && (
          <span style={{
            fontSize: 11, color: 'var(--mal-ink-3)',
            fontFamily: 'var(--mal-font-mono)', letterSpacing: 0.3,
          }}>§{num}</span>
        )}
        {hasPayload && (
          <button
            onClick={running ? null : (shown ? onReset : onRun)}
            style={{
              appearance: 'none', cursor: 'pointer',
              fontFamily: 'var(--mal-font-ui)',
              fontSize: 12, fontWeight: 600,
              color: shown ? 'var(--mal-ink-2)' : '#fff',
              background: shown ? 'transparent' : 'var(--mal-primary, #5a3aa3)',
              border: shown ? '1px solid var(--mal-line)' : '1px solid transparent',
              borderRadius: 7, padding: '6px 12px',
              display: 'inline-flex', alignItems: 'center', gap: 6,
              transition: 'background .2s ease, color .2s ease, border-color .2s ease',
            }}>
            {running ? (
              <>
                <span style={{
                  width: 10, height: 10, borderRadius: '50%',
                  border: '1.5px solid #fff', borderTopColor: 'transparent',
                  animation: 'mal-api-spin .8s linear infinite',
                }}/>
                <span>Running</span>
              </>
            ) : shown ? (
              <>
                <span>Reset</span>
              </>
            ) : (
              <>
                <span>Run</span>
                <span style={{ fontSize: 10 }}>▶</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Description */}
      {description && (
        <div style={{
          padding: '12px 14px 6px',
          fontSize: 14, lineHeight: 1.6, color: 'var(--mal-ink-1)',
        }}>{description}</div>
      )}

      {/* Other free-form sections (Headers, Errors, Notes, Webhook…) */}
      {otherSecs.map((s, i) => (
        <div key={'o' + i} style={{ padding: '10px 14px 0' }}>
          <div style={{
            fontSize: 11, fontWeight: 700, letterSpacing: 0.6,
            color: 'var(--mal-ink-3)', textTransform: 'uppercase',
            marginBottom: 6,
          }}>{s.label}</div>
          <CodeBlock body={s.body}/>
        </div>
      ))}

      {/* Request panel */}
      {requestSec && (
        <div style={{ padding: '10px 14px 12px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 6,
          }}>
            <span style={{
              fontSize: 11, fontWeight: 700, letterSpacing: 0.6,
              color: 'var(--mal-ink-3)', textTransform: 'uppercase',
            }}>Request body</span>
            <span style={{
              fontSize: 11, fontFamily: 'var(--mal-font-mono)',
              color: 'var(--mal-ink-3)',
            }}>application/json</span>
          </div>
          <CodeBlock body={requestSec.body} dim={running}/>
        </div>
      )}

      {/* Response panel — slides in on Run */}
      {responseSecs.length > 0 && (
        <div style={{
          maxHeight: shown ? 1200 : 0,
          opacity: shown ? 1 : 0,
          overflow: 'hidden',
          transition: 'max-height .45s ease, opacity .35s ease',
          borderTop: shown ? '1px solid var(--mal-line)' : 'none',
        }}>
          <div style={{ padding: '10px 14px 14px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              marginBottom: 8,
            }}>
              <span style={{
                fontSize: 11, fontWeight: 700, letterSpacing: 0.6,
                color: 'var(--mal-ink-3)', textTransform: 'uppercase',
              }}>Response</span>
              {responseSecs.length > 1 ? (
                <div style={{ display: 'inline-flex', gap: 4 }}>
                  {responseSecs.map((s, i) => {
                    const meta = respMeta(s);
                    const active = i === respIdx;
                    return (
                      <button key={i} onClick={() => setRespIdx(i)} style={{
                        appearance: 'none', cursor: 'pointer',
                        fontFamily: 'var(--mal-font-mono)',
                        fontSize: 11.5, fontWeight: 600,
                        padding: '3px 9px', borderRadius: 6,
                        color: active ? '#0a8056' : 'var(--mal-ink-2)',
                        background: active ? 'rgba(10,128,86,0.12)' : 'transparent',
                        border: `1px solid ${active ? 'rgba(10,128,86,0.28)' : 'var(--mal-line)'}`,
                      }}>{meta.code}</button>
                    );
                  })}
                </div>
              ) : (
                (() => {
                  const meta = respMeta(activeResp);
                  return (
                    <span style={{
                      fontFamily: 'var(--mal-font-mono)',
                      fontSize: 11.5, color: '#0a8056',
                      background: 'rgba(10,128,86,0.12)',
                      border: '1px solid rgba(10,128,86,0.28)',
                      borderRadius: 6, padding: '2px 8px',
                    }}>{meta.code}</span>
                  );
                })()
              )}
              {(() => {
                const meta = respMeta(activeResp);
                return meta.sub ? (
                  <span style={{
                    fontSize: 11.5, color: 'var(--mal-ink-3)',
                  }}>{meta.sub}</span>
                ) : null;
              })()}
              <span style={{ marginInlineStart: 'auto', fontSize: 11, color: 'var(--mal-ink-3)' }}>
                ⏱ 245 ms · simulated
              </span>
            </div>
            <CodeBlock body={activeResp ? activeResp.body : ''}/>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Expose
// ============================================================
window.MalStrategyVisuals = {
  ChapterCardsGrid, ChapterHero, ReadingProgress, ChapterDivider, applyDropCap,
  ThreeProductComparison, CapitalStackDiagram, RegulatoryTimeline,
  AnchorCards, JourneyDiagram, FldgWaterfall,
  GlossaryTerm, CrossRef, SearchPalette,
  ChapterAmbient, PullQuote,
  ApiEndpoint,
  CHAPTER_ABSTRACTS, CHAPTER_TONE, READ_TIMES, GLOSSARY,
};
