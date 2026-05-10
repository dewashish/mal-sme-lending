/* eslint-disable */
// Section 1 — Strategy
// Long-form rendering of the SME Lending Head of Product Strategy doc.
// Layout: sticky left TOC (cfodeck-style indicator strip) + scrollable
// main column with hero, executive overview, products, cross-product
// ops, risks, closing, appendices.
//
// Where the doc lists tabular numbers, we render real charts.
// Where the doc describes architectures (capital stack, agent swarm,
// customer lifecycle), we render real diagrams.

const { useState: stS, useEffect: stE, useRef: stR, useMemo: stM, useCallback: stCB } = React;
const stIco = window.MalIcon;

const STRATEGY_TOC = [
  { id: 'hero',         label: 'Overview' },
  { id: 'exec',         label: 'Executive numbers' },
  { id: 'platform',     label: 'Platform foundations' },
  { id: 'p1',           label: 'Product 1 · Smart Invoice' },
  { id: 'p1-economics', label: 'P1 · Unit economics' },
  { id: 'p1-path2',     label: 'P1 · Path 2 (Buyer-led)' },
  { id: 'p2',           label: 'Product 2 · Healthcare' },
  { id: 'p3',           label: 'Product 3 · Anchor SCF' },
  { id: 'capital',      label: 'Capital stack' },
  { id: 'build',        label: 'Build sequence' },
  { id: 'risks',        label: 'Risks & mitigants' },
  { id: 'appA',         label: 'Wider catalogue' },
  { id: 'appB',         label: 'AI architecture' },
  { id: 'appD',         label: 'Distribution + FLDG' },
  { id: 'closing',      label: 'Closing' },
];

function SectionStrategy({ lang, isMobile }) {
  const [activeId, setActiveId] = stS('hero');
  const containerRef = stR(null);
  const sectionRefs = stR({});

  // Track which section is currently in view via IntersectionObserver
  stE(() => {
    const obs = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setActiveId(visible.target.id);
    }, { rootMargin: '-30% 0px -55% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] });
    Object.values(sectionRefs.current).forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const jumpTo = stCB((id) => {
    sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const setRef = (id) => (el) => { sectionRefs.current[id] = el; };

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {!isMobile && <StrategyTOC activeId={activeId} jumpTo={jumpTo}/>}

      <div className="mal-section-page" style={{
        maxWidth: 920,
        marginInline: isMobile ? 'auto' : 'auto',
        paddingInlineStart: isMobile ? 24 : 280,
      }}>
        <SectionHero refFn={setRef('hero')} lang={lang}/>
        <SectionExecNumbers refFn={setRef('exec')} lang={lang}/>
        <SectionPlatform refFn={setRef('platform')} lang={lang}/>
        <SectionProduct1 refFn={setRef('p1')} lang={lang}/>
        <SectionP1Economics refFn={setRef('p1-economics')} lang={lang}/>
        <SectionP1Path2 refFn={setRef('p1-path2')} lang={lang}/>
        <SectionProduct2 refFn={setRef('p2')} lang={lang}/>
        <SectionProduct3 refFn={setRef('p3')} lang={lang}/>
        <SectionCapitalStack refFn={setRef('capital')} lang={lang}/>
        <SectionBuildSequence refFn={setRef('build')} lang={lang}/>
        <SectionRisks refFn={setRef('risks')} lang={lang}/>
        <SectionAppendixA refFn={setRef('appA')} lang={lang}/>
        <SectionAppendixB refFn={setRef('appB')} lang={lang}/>
        <SectionAppendixD refFn={setRef('appD')} lang={lang}/>
        <SectionClosing refFn={setRef('closing')} lang={lang}/>
      </div>
    </div>
  );
}

// ============================================================
// Sticky TOC (left side)
// ============================================================
function StrategyTOC({ activeId, jumpTo }) {
  const idx = STRATEGY_TOC.findIndex((t) => t.id === activeId);
  return (
    <aside className="mal-strategy-toc" style={{
      position: 'sticky', top: 56,
      width: 240, alignSelf: 'flex-start',
      float: 'left',
      paddingInlineStart: 24, paddingTop: 32,
      maxHeight: 'calc(100vh - 56px)',
      overflowY: 'auto',
    }}>
      <div className="mal-caption" style={{ marginBottom: 14, color: 'var(--mal-mid-2)' }}>
        STRATEGY · MAY 2026
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {STRATEGY_TOC.map((t, i) => {
          const active = i === idx;
          const past = i < idx;
          return (
            <button key={t.id}
                    onClick={() => jumpTo(t.id)}
                    style={{
                      all: 'unset', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '6px 10px', borderRadius: 8,
                      background: active ? 'var(--mal-paper)' : 'transparent',
                      border: '1px solid ' + (active ? 'var(--mal-primary-3)' : 'transparent'),
                      transition: 'background .15s, border-color .15s',
                    }}
                    onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--mal-surface-2)'; }}
                    onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
              <span style={{
                width: active ? 22 : 12, height: 4,
                borderRadius: 999,
                background: active ? 'var(--mal-primary)' : past ? 'var(--mal-primary-3)' : 'var(--mal-line)',
                transition: 'width .25s, background .15s',
              }}/>
              <span style={{
                fontSize: 12, fontWeight: active ? 600 : 500,
                color: active ? 'var(--mal-ink)' : past ? 'var(--mal-ink)' : 'var(--mal-mid)',
                lineHeight: 1.3,
              }}>
                {t.label}
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

// ============================================================
// Section helpers
// ============================================================
function SectionWrapper({ id, refFn, eyebrow, title, children }) {
  return (
    <section id={id} ref={refFn} style={{ marginBottom: 80, scrollMarginTop: 70 }}>
      {eyebrow && (
        <div style={{
          fontSize: 11, color: 'var(--mal-primary)', fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 10,
        }}>{eyebrow}</div>
      )}
      {title && (
        <h2 style={{
          fontFamily: 'var(--mal-font-display)', fontStyle: 'italic',
          fontSize: 44, lineHeight: 1.05, letterSpacing: '-0.02em',
          margin: '0 0 22px',
        }}>{title}</h2>
      )}
      {children}
    </section>
  );
}

function P({ children }) {
  return (
    <p style={{
      fontSize: 15, lineHeight: 1.7, color: 'var(--mal-ink)',
      marginBlock: '0 14px', maxWidth: 680,
    }}>{children}</p>
  );
}

function Sub({ children }) {
  return (
    <h3 style={{
      fontSize: 17, fontWeight: 600, color: 'var(--mal-ink)',
      marginTop: 28, marginBottom: 10,
    }}>{children}</h3>
  );
}

function Quote({ children, author }) {
  return (
    <div style={{
      borderInlineStart: '3px solid var(--mal-primary-3)',
      paddingInlineStart: 16, paddingBlock: 6,
      fontStyle: 'italic', color: 'var(--mal-mid)',
      fontSize: 14, lineHeight: 1.6, margin: '14px 0',
    }}>
      {children}
      {author && <div style={{ marginTop: 6, fontStyle: 'normal', fontSize: 11, color: 'var(--mal-mid-2)' }}>— {author}</div>}
    </div>
  );
}

function CalloutCard({ tone = 'info', icon, title, children }) {
  const bg = tone === 'success' ? 'var(--mal-success-bg)'
           : tone === 'warn' ? 'var(--mal-warn-bg)'
           : tone === 'danger' ? 'var(--mal-danger-bg)'
           : 'var(--mal-info-bg)';
  const fg = tone === 'success' ? 'var(--mal-success)'
           : tone === 'warn' ? 'var(--mal-warn)'
           : tone === 'danger' ? 'var(--mal-danger)'
           : 'var(--mal-info)';
  return (
    <div style={{
      background: bg, padding: '14px 16px', borderRadius: 14,
      margin: '14px 0', display: 'flex', gap: 12,
    }}>
      <div style={{ width: 28, height: 28, borderRadius: 8, background: '#fff', color: fg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {stIco[icon || 'info'] ? stIco[icon || 'info']({ width: 16, height: 16 }) : 'ℹ'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {title && <div style={{ fontSize: 13, fontWeight: 600, color: fg, marginBottom: 4 }}>{title}</div>}
        <div style={{ fontSize: 13, color: 'var(--mal-ink)', lineHeight: 1.55 }}>{children}</div>
      </div>
    </div>
  );
}

function StatGrid({ items = [] }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
      gap: 12, margin: '18px 0',
    }}>
      {items.map((it, i) => (
        <MalKpi key={i} label={it.label} value={it.value} delta={it.delta} deltaTone={it.deltaTone} sub={it.sub}/>
      ))}
    </div>
  );
}

function DataTable({ headers, rows, highlightLast }) {
  return (
    <div style={{ overflowX: 'auto', margin: '16px 0' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} style={{
                textAlign: 'start', padding: '10px 12px',
                fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em',
                color: 'var(--mal-mid)',
                borderBottom: '2px solid var(--mal-line)',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} style={{
              background: highlightLast && ri === rows.length - 1 ? 'var(--mal-primary-50)' : 'transparent',
              fontWeight: highlightLast && ri === rows.length - 1 ? 600 : 400,
            }}>
              {row.map((cell, ci) => (
                <td key={ci} style={{
                  padding: '10px 12px',
                  borderBottom: '1px solid var(--mal-line-2)',
                  color: ci === 0 ? 'var(--mal-mid)' : 'var(--mal-ink)',
                  fontFamily: ci === 0 ? 'inherit' : 'var(--mal-font-mono)',
                }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================
// HERO
// ============================================================
function SectionHero({ refFn }) {
  return (
    <section id="hero" ref={refFn} style={{ paddingTop: 32, marginBottom: 60 }}>
      <Pill tone="ink" dot>Confidential · Internal · Working Draft · May 2026</Pill>
      <h1 style={{
        fontFamily: 'var(--mal-font-display)', fontStyle: 'italic',
        fontSize: 78, lineHeight: 1, letterSpacing: '-0.02em',
        margin: '20px 0 18px',
      }}>
        Head of Product Strategy<br/>
        <span className="mal-iri-text">UAE SME Lending Platform</span>
      </h1>
      <p style={{ fontSize: 17, lineHeight: 1.55, color: 'var(--mal-mid)', maxWidth: 680, margin: 0 }}>
        Three differentiated products. End-to-end product-manager workflow.
        Three-year unit economics. The bet: build first on the e-invoicing,
        Open Finance, and EDB-guarantee rails arriving 2026 to 2027.
      </p>

      <StatGrid items={[
        { label: 'Year 3 disbursement', value: 'AED 12B', sub: 'across 4 pillars' },
        { label: 'Year 3 net contrib.', value: 'AED 144M', delta: '+34M from FLDG' },
        { label: 'Capital deployed', value: '~AED 530M', sub: 'equity + warehouse + FLDG' },
        { label: 'Blended ROC', value: '~27%', sub: 'Year 3 run-rate' },
      ]}/>

      <CalloutCard tone="info" icon="info" title="What this document is">
        Picks three SME lending products for a new platform in the UAE and lays out the full PM
        view: who they serve, the buyer / supplier journeys, origination and servicing operations,
        the collections playbook, the technology stack, the API contracts, the OCR and verification
        flow, the Sharia variant, and the three-year unit economics.
      </CalloutCard>

      <CalloutCard tone="warn" icon="info" title="What this document is NOT">
        Not a market study (that sits separately). Not a corporate strategy or investor pitch.
        It is the Head-of-Product specification: <strong>what we build, in what sequence, with which tools, for which customers, at what economics</strong>.
      </CalloutCard>
    </section>
  );
}

// ============================================================
// EXECUTIVE NUMBERS (combined 3-year outlook table)
// ============================================================
function SectionExecNumbers({ refFn }) {
  return (
    <SectionWrapper id="exec" refFn={refFn} eyebrow="Section 1 · Executive overview" title="The combined three-year outlook">
      <P>Volume disbursed across the three flagship products plus the FLDG distribution pillar:</P>

      <Sub>Disbursement (AED M)</Sub>
      <MalBarChart
        ariaLabel="Disbursement"
        data={[
          { label: 'Year 1', value: 650,    tone: 'iri' },
          { label: 'Year 2', value: 3500,   tone: 'iri' },
          { label: 'Year 3', value: 10000,  tone: 'iri' },
        ]}
        formatValue={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}B` : `${v}M`}
      />

      <Sub>Average outstanding book (AED M)</Sub>
      <MalBarChart
        ariaLabel="Avg book"
        data={[
          { label: 'Year 1', value: 220,  tone: 'iri' },
          { label: 'Year 2', value: 1200, tone: 'iri' },
          { label: 'Year 3', value: 3450, tone: 'iri' },
        ]}
        formatValue={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}B` : `${v}M`}
      />

      <Sub>Margin walk · Year 3</Sub>
      <DataTable
        headers={['Metric', 'Year 1', 'Year 2', 'Year 3']}
        rows={[
          ['Active SME customers',   '1,500',  '8,500',  '22,000'],
          ['Active anchors / payers','5',      '12',     '20'],
          ['Gross yield (blended)',  '18.0%',  '16.5%',  '15.0%'],
          ['Cost of funds',          '8.8%',   '8.3%',   '7.8%'],
          ['Net interest margin',    '9.2%',   '8.2%',   '7.2%'],
          ['PCL (provision)',        '1.8%',   '1.7%',   '1.6%'],
          ['Risk-adjusted margin',   '7.4%',   '6.5%',   '5.6%'],
          ['Operating expense (% book)','5.0%','3.2%',   '2.4%'],
          ['Net contribution (%)',   '2.4%',   '3.3%',   '3.2%'],
          ['Net contribution (AED M)','5.3',   '39.6',   '110.4'],
        ]}
        highlightLast
      />

      <CalloutCard tone="success" title="Capital plan">
        USD 75 to 100 M senior warehouse (Pollen Street, Channel Capital, Stride Ventures, EBRD, IFC).
        USD 20 to 30 M mezzanine from regional family offices. Equity sufficient to cover Year 1 to
        Year 2 burn plus regulatory minimum capital.
      </CalloutCard>
    </SectionWrapper>
  );
}

// ============================================================
// PLATFORM FOUNDATIONS
// ============================================================
function SectionPlatform({ refFn }) {
  return (
    <SectionWrapper id="platform" refFn={refFn} eyebrow="Section 2" title="Platform context and foundations">
      <P>
        The three products share a common platform stack. We build it once and reuse across products.
        Five capabilities sit at the centre. Each must be live, tested, and operating at SLA before a
        product launches in production.
      </P>

      <DataTable
        headers={['Capability', 'What it does', 'Vendor / build', 'SLA']}
        rows={[
          ['Identity & KYB',         'Trade licence, UBO, signatories, sanctions, AECB, FTA TRN',  'UAE Pass · Sumsub · Refinitiv', '5 min clean · 4 hr review'],
          ['Open Finance',            '12-mo bank statements + balances + transactions',           'Lean (primary) · Tarabut',       '30 sec first pull · 60 min refresh'],
          ['Credit bureau',           'AECB Commercial Score · cheque clearance flag',             'Etihad Bureau API',              '10 sec'],
          ['Peppol e-invoice',        'Receive · validate · parse Peppol PINT AE invoices',         'Avalara · Pagero · RTC',         '60 sec issuance → dashboard'],
          ['Decisioning engine',      'Scorecard · policy rules · exception flags · decision',      'In-house · XGBoost · Feast',     '5 sec scoring · 5 min e2e'],
          ['LMS / core ledger',       'Booking · accruals · schedules · statements · write-offs',  'Mambu cloud',                     '99.9% uptime'],
          ['Document & OCR',          'Capture · structure · cross-check fraud signals',           'Textract + Layoutlmv3 fine-tune', '10 sec / doc'],
        ]}
      />

      <Sub>Operating model</Sub>
      <P>
        Three product managers (one per product line). One head of product. One staff engineer for platform.
        Two designers for buyer-supplier journeys. One head of credit risk reporting into the CRO. The risk
        model is central to the platform and shared across products. <strong>Product managers do not own the
        model; risk owns it.</strong> Product owns the user experience that delivers it.
      </P>

      <Sub>Regulatory posture</Sub>
      <P>
        ADGM Financial Services Permission Cat 2 (Providing Credit) and Cat 4 (Operating a Private Financing
        Platform). ADGM RegLab if useful for a 12-18 month sandbox period for Product 1's installment-BNPL
        feature. CBUAE compliance for cross-border payments via partner-bank arrangements. FATF Recommendation
        16 wire-transfer rules. CBUAE AML/CFT Decision 24 of 2022. Sharia products under a Shariah Supervisory
        Board fatwa from Dar Al Sharia or Shariyah Review Bureau.
      </P>

      <CalloutCard tone="warn" title="CBUAE Customer Protection Regulation">
        Takes effect 13 September 2026. Product disclosures, complaints handling, and cooling-off
        rights are designed around that regulation from day one.
      </CalloutCard>
    </SectionWrapper>
  );
}

// ============================================================
// PRODUCT 1 — Smart Invoice
// ============================================================
function SectionProduct1({ refFn }) {
  return (
    <SectionWrapper id="p1" refFn={refFn} eyebrow="Product 1" title="Smart Invoice with Flexible Installment B2B BNPL">
      <P>
        A typical UAE SME pays its suppliers on 60-90 day terms. The supplier wants the cash now.
        The buyer wants to spread the outflow. Existing players solve only one side.
      </P>

      <DataTable
        headers={['Player', 'Buyer side', 'Supplier side', 'Installment option']}
        rows={[
          ['Comfi',                        'BNPL 30/60/90', 'No · only buyer-served', 'No'],
          ['Beehive · Funding Souq',       'No',            'Single-invoice discounting', 'No'],
          ['eFunder · Aura · Zelo',        'No',            'Single-invoice discounting', 'No'],
          ['Banks (sub-AED 500K)',         'No (offline)',  'No (offline)',           'No'],
          ['Mal — this product',           'BNPL 30/60/90 + 2-6 mo installments', 'Day-1 advance 90-95%', 'Yes — UAE first'],
        ]}
        highlightLast
      />

      <P>
        One workflow clears one invoice. The supplier gets paid in 4 hours at 90 to 95 percent advance.
        The buyer chooses the repayment plan. Both sides see the same invoice number, the same amount,
        the same due date, the same audit trail.
      </P>

      <CalloutCard tone="info" title="The differentiator">
        The instalment option for the buyer is the headline differentiator. <strong>No competitor in the
        UAE today gives a buyer the choice to settle one invoice over six monthly instalments at a
        competitive rate.</strong>
      </CalloutCard>

      <Sub>Who it serves</Sub>
      <P>
        <strong>Supplier side:</strong> Trading SMEs in DMCC, JAFZA, IFZA, DMC, RAKEZ selling to mainland
        UAE buyers on net 30 to net 90 terms. Service SMEs in marketing, IT, recruitment, F&amp;B supply,
        equipment maintenance. Light manufacturers selling FMCG inputs, packaging, building materials,
        MEP and HVAC components.
      </P>
      <P>
        <strong>Buyer side:</strong> Mid-market SMEs and corporates with monthly purchase volume AED 100K
        to AED 5M. Family businesses with multiple trading entities under one group. Healthcare groups
        buying medical consumables and IT services. Construction main contractors paying sub-contractors.
        Hospitality groups paying F&amp;B and laundry suppliers. Government contractors paying their own
        suppliers (downstream of slow government payments).
      </P>

      <Sub>The 5-plan picker</Sub>
      <DataTable
        headers={['Plan', 'Buyer pays', 'Fee (conventional)', 'Differentiator']}
        rows={[
          ['Pay supplier directly',   'Net term agreed',           '0%',                'No financing'],
          ['BNPL 30 days',             '30 days from invoice',      '1.0% – 1.5%',       'Equivalent to Comfi'],
          ['BNPL 60 days',             '60 days from invoice',      '1.8% – 2.6%',       'Equivalent to Comfi'],
          ['BNPL 90 days',             '90 days from invoice',      '2.6% – 3.6%',       'Equivalent to Comfi'],
          ['Installments 2-6 mo',      'Equal monthly payments',    '1.0% – 1.5% / 30d', 'No UAE competitor'],
        ]}
      />

      <CalloutCard tone="success" title="Sharia variant" icon="shield">
        Tawarruq commodity transaction screen records the LME aluminium parcel purchase + immediate sale
        instructions. Standard fatwa-approved language is auto-populated. Late-payment: no compounding
        profit; flat administrative fee donated to charity through the Shariah Supervisory Board.
        Shariah Board: Dar Al Sharia (preferred) or Shariyah Review Bureau.
      </CalloutCard>
    </SectionWrapper>
  );
}

// ============================================================
// P1 — Unit economics
// ============================================================
function SectionP1Economics({ refFn }) {
  return (
    <SectionWrapper id="p1-economics" refFn={refFn} eyebrow="Product 1 · Unit economics" title="P1 economics — three-year outlook">
      <Sub>Disbursement & book (AED M)</Sub>
      <MalLineChart
        ariaLabel="P1 disbursement and book"
        labels={['Y1', 'Y2', 'Y3']}
        series={[
          { name: 'Disbursement',     values: [200, 1200, 3500], color: 'var(--mal-primary-3)' },
          { name: 'Avg outstanding',  values: [80,  480,  1400], color: 'var(--mal-primary)' },
        ]}
        formatValue={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}B` : `${v}M`}
      />

      <Sub>Margin walk</Sub>
      <DataTable
        headers={['Driver', 'Y1', 'Y2', 'Y3']}
        rows={[
          ['Active suppliers',         '500',     '5,000',   '12,000'],
          ['Active buyers',            '1,000',   '6,500',   '15,000'],
          ['Avg invoice ticket',       '180K',    '200K',    '210K'],
          ['Gross yield on book',      '22.0%',   '20.0%',   '18.0%'],
          ['Cost of funds',            '9.0%',    '8.5%',    '8.0%'],
          ['Net interest / fee margin','13.0%',   '11.5%',   '10.0%'],
          ['Provision for credit loss','2.5%',    '2.5%',    '2.5%'],
          ['Risk-adjusted margin',     '10.5%',   '9.0%',    '7.5%'],
          ['Operating expense %',      '6.0%',    '4.0%',    '3.0%'],
          ['Net contribution (AED M)', '3.6',     '24.0',    '63.0'],
        ]}
        highlightLast
      />

      <CalloutCard tone="info" title="Path 1 + Path 2 combined (Year 3)">
        AED 5B disbursement · AED 1.81B average book · AED 90M net contribution.
        Path 2 contributes 30% of net contribution on 30% of disbursement, at slightly higher yield
        and tighter risk-adjusted margin per dirham of book.
      </CalloutCard>
    </SectionWrapper>
  );
}

// ============================================================
// P1 — Path 2 (Buyer-led)
// ============================================================
function SectionP1Path2({ refFn }) {
  return (
    <SectionWrapper id="p1-path2" refFn={refFn} eyebrow="Product 1 · Path 2" title="Buyer-led invoice extension loan">
      <P>
        Path 1 is supplier-led: the supplier sells the invoice, gets paid Day 1, and the buyer settles per
        their chosen schedule. <strong>Path 2 is the mirror image:</strong> the supplier is paid in full on
        the original due date with no enrolment needed; the buyer separately takes a loan from us to make
        that payment and to spread their own outflow.
      </P>

      <CalloutCard tone="info" title="Why a second product inside Product 1">
        Acquisition is not gated by supplier enrolment. Path 1 scales at the rate suppliers join. Path 2
        scales at the rate buyers see invoices — daily across the UAE economy. A buyer can use Path 2
        to pay any supplier with a UAE TRN, on any invoice, without the supplier ever knowing.
      </CalloutCard>

      <Sub>Globally validated, UAE first-mover</Sub>
      <P>
        <strong>Two</strong> (Norway/UK), <strong>Mondu</strong> (Germany), <strong>Hokodo</strong> (UK),
        <strong> Slope</strong> (US), and <strong>Resolve</strong> (US) all run buyer-led B2B BNPL as a
        primary product, collectively disbursing several billion USD per year. None operate in the UAE today.
      </P>

      <Sub>Path 2 unit economics</Sub>
      <DataTable
        headers={['Driver', 'Y1', 'Y2', 'Y3']}
        rows={[
          ['Disbursement (AED M)',     '100',   '500',   '1,500'],
          ['Avg outstanding book',     '27',    '137',   '411'],
          ['Gross yield on book',      '28.0%', '26.0%', '25.0%'],
          ['Net interest margin',      '19.0%', '17.5%', '17.0%'],
          ['PCL (annual on book)',     '5.5%',  '7.5%',  '8.0%'],
          ['Risk-adjusted margin',     '13.5%', '10.0%', '9.0%'],
          ['OpEx % of book',           '8.0%',  '4.0%',  '2.5%'],
          ['Net contribution (AED M)', '1.5',   '8.2',   '26.7'],
        ]}
        highlightLast
      />

      <CalloutCard tone="warn" icon="info" title="Higher loss expectations than Path 1">
        Lifetime expected loss: 2.0 to 3.0% of disbursement. Annualised PCL on book: 7-10%. Higher than
        Path 1 due to the shorter tenor and fully-unsecured construct. Stress at 2× expected loss is
        manageable within the platform's capital buffer + FLDG-style retention against the senior warehouse.
      </CalloutCard>
    </SectionWrapper>
  );
}

// ============================================================
// PRODUCT 2 — Healthcare Receivables
// ============================================================
function SectionProduct2({ refFn }) {
  return (
    <SectionWrapper id="p2" refFn={refFn} eyebrow="Product 2" title="Healthcare insurance receivables engine">
      <P>
        UAE annual medical claim flow runs at AED 22 billion. At any moment, AED 5 to 6 billion is
        outstanding to providers waiting on insurer settlement. Cycles run 60-112 days even after the
        regulator's shift to electronic adjudication.
      </P>

      <Sub>Whitespace beyond Klaim</Sub>
      <P>
        Klaim has built the first specialist platform in this space and partners with EDB. We see four
        whitespaces left open: <strong>multi-payer aggregation</strong> (whole-receivable-book purchase
        across all payers in one contract), <strong>predictive adjudication</strong> (ML model fed on
        historical adjudication outcomes), <strong>Sharia ABS at fund scale</strong> (USD 100M+ via ADGM
        SPV in Year 2), and <strong>embedded receivables finance inside HIS / EMR / PMS systems</strong>
        (InstaHMS, Bayanaty, ClinicMaster, NextGen, eClaimLink).
      </P>

      <Sub>Predictive adjudication model — the technical moat</Sub>
      <P>
        Inputs: ICD-10 diagnosis · CPT procedure · payer · provider · DOS · place of service · patient
        demographics · prior-auth flag · claim amount · historical adjudication outcomes for the same
        provider-payer-CPT triplet. Output: probability of full approval, partial approval percentage,
        rejection probability + top-3 predicted reasons, expected days to settlement.
      </P>
      <P>
        <strong>Performance target:</strong> AUC 0.85+ on full-approval prediction by end of Year 1.
        Feedback loop: every actual adjudication outcome feeds back into the training set within 24 hours.
      </P>

      <Sub>P2 economics</Sub>
      <DataTable
        headers={['Driver', 'Y1', 'Y2', 'Y3']}
        rows={[
          ['Active providers',         '30',    '180',   '550'],
          ['Annual claim flow (AED M)','216',   '2,160', '9,900'],
          ['Disbursement (AED M)',     '150',   '800',   '2,500'],
          ['Avg book (AED M)',         '50',    '270',   '850'],
          ['Gross yield',              '18.0%', '16.0%', '15.0%'],
          ['Net contribution (AED M)', '1.25',  '6.75',  '25.5'],
        ]}
        highlightLast
      />
    </SectionWrapper>
  );
}

// ============================================================
// PRODUCT 3 — Anchor SCF
// ============================================================
function SectionProduct3({ refFn }) {
  return (
    <SectionWrapper id="p3" refFn={refFn} eyebrow="Product 3" title="Anchor-led supply-chain finance with dynamic discount">
      <P>
        Reverse factoring against approved-payable invoices from large UAE anchors. The risk is anchor
        risk, not supplier risk. Yet UAE anchor SCF is concentrated in two banks (HSBC, Standard
        Chartered) at one end and a single emerging non-bank platform (Comera, partnered with ADNOC)
        at the other. There is no mid-corporate anchor SCF tier at scale.
      </P>

      <Sub>The dynamic discount auction</Sub>
      <P>
        Each weekday at noon, suppliers with approved invoices can review the standard payment date
        (typically anchor T+60-90 days) and submit a bid for an earlier date at a steeper discount.
        The platform clears the auction at noon plus 30 minutes. Suppliers who win get paid that
        afternoon at the bid rate. Suppliers who don't bid receive standard early-payment terms.
      </P>

      <CalloutCard tone="info" title="Why uniform-price auction over pay-as-bid">
        Easier to communicate to suppliers. More honest bidding (suppliers reveal true reservation
        rate). Market-clearing discovery price benefits both supplier and platform over time.
      </CalloutCard>

      <Sub>First-wave anchors (Years 1-2)</Sub>
      <DataTable
        headers={['Anchor', 'Sector', 'Indicative SME panel', 'Annual procurement (AED B)']}
        rows={[
          ['Aldar Properties',       'Real estate',        'Contractors · MEP · FM · fit-out · landscaping', '8 - 12'],
          ['Majid Al Futtaim',       'Retail / real estate','F&B · contractors · marketing · IT',            '10 - 15'],
          ['AD Ports',               'Logistics / ports',   'Logistics · equipment · services · IT',         '5 - 8'],
          ['e&',                     'Telecom',             'IT services · contractors · marketing · FM',    '6 - 10'],
          ['Lulu Hypermarkets',      'Retail',              'FMCG · fresh produce · packaging',              '8 - 12'],
          ['IHC Group portfolio',    'Holding / industrials','Trade · services · FMCG · healthcare',         '7 - 10'],
        ]}
      />

      <Sub>P3 economics — thinner margins, much higher quality</Sub>
      <DataTable
        headers={['Driver', 'Y1', 'Y2', 'Y3']}
        rows={[
          ['Live anchor partners',    '3',     '8',     '15'],
          ['Avg suppliers per anchor','100',   '300',   '500'],
          ['Disbursement (AED M)',    '300',   '1,500', '4,000'],
          ['Avg book (AED M)',        '90',    '450',   '1,200'],
          ['Gross yield',             '14.0%', '13.0%', '12.0%'],
          ['PCL',                     '0.5%',  '0.5%',  '0.5%'],
          ['Net contribution (AED M)','1.8',   '11.25', '30.0'],
        ]}
        highlightLast
      />
    </SectionWrapper>
  );
}

// ============================================================
// CAPITAL STACK
// ============================================================
function SectionCapitalStack({ refFn }) {
  return (
    <SectionWrapper id="capital" refFn={refFn} eyebrow="Section 6.2" title="Capital stack and funding">
      <P>
        The platform's funding stack maps to Mal's ambition: USD 100M+ senior warehouse, USD 30M
        mezzanine, USD 50-80M equity, plus FLDG capital for the distribution model.
      </P>

      <Sub>Year 3 capital mix</Sub>
      <MalStackedBar segments={[
        { label: 'Senior warehouse (USD)', value: 400, color: 'var(--mal-primary)' },
        { label: 'Senior warehouse (AED)', value: 1000, color: 'var(--mal-primary-3)' },
        { label: 'Mezzanine',              value: 60,  color: 'var(--mal-iri-2)' },
        { label: 'Sharia ABS',             value: 100, color: 'var(--mal-iri-3)' },
        { label: 'EDB guarantee',          value: 500, color: 'var(--mal-iri-4)' },
        { label: 'Equity (Tier 1)',        value: 50,  color: 'var(--mal-success)' },
      ]} formatLabel={(v) => `~$${v}M`}/>

      <DataTable
        headers={['Layer', 'Source', 'Year 1', 'Year 2', 'Year 3', 'Cost (indicative)']}
        rows={[
          ['Senior (USD)',     'Pollen Street · Channel · Stride · EBRD',  'USD 50M',   'USD 150M',  'USD 400M',  'SOFR + 4.5–6%'],
          ['Senior (AED)',     'FAB · ADCB · Mashreq',                      'AED 100M',  'AED 400M',  'AED 1B',    'EIBOR + 3.5–4.5%'],
          ['Mezzanine',         'Shorooq · family offices · Channel mezz',   'USD 10M',   'USD 25M',   'USD 60M',   'SOFR + 8–10%'],
          ['Sharia ABS',        'ADGM SPV · investors via fund admin',        '0',         'USD 25M',   'USD 100M',  'Profit 8–11%'],
          ['EDB guarantee',     'Up to 50% on eligible facilities',           'AED 50M',   'AED 200M',  'AED 500M',  'Fee 0.5–1.0%'],
          ['Equity (Tier 1)',   'Lead institutional + group capital',         'USD 20M',   'USD 30M',   'USD 50M',   'CoE 18–22%'],
        ]}
      />
    </SectionWrapper>
  );
}

// ============================================================
// BUILD SEQUENCE
// ============================================================
function SectionBuildSequence({ refFn }) {
  return (
    <SectionWrapper id="build" refFn={refFn} eyebrow="Section 6.4" title="Build sequence — 24 months, four parallel tracks">
      <P>
        Each quarter ships measurable progress on three product tracks plus the platform layer. The
        platform layer is the foundation — every product depends on it.
      </P>

      <DataTable
        headers={['Quarter', 'Product 1', 'Product 2', 'Product 3', 'Platform']}
        rows={[
          ['Q3 2026', 'MVP supplier discount · OCR Phase 1', 'Klaim-style MVP · 2 payers',           'LOI with 2 anchors',                      'ADGM Cat 2/4 · Mambu · Lean · AECB · UAE Pass'],
          ['Q4 2026', 'Buyer BNPL 30/60/90 · Open Finance DD',  '5 payers · Bayanaty connector',       'Aldar pilot live',                        'Decisioning v2 · Sumsub'],
          ['Q1 2027', 'Installment + Sharia Tawarruq',         'Predictive Adjudication v1 · 8 payers','Auction MVP · 2nd anchor',               'Peppol ASP · e-invoice flow'],
          ['Q2 2027', 'Confidential mode · supplier non-recourse','Sharia ABS USD 25M issuance',         '3rd anchor · dynamic auction live',       'Snowflake / dbt · Sharia variants live'],
          ['Q3 2027', 'Wafeq / Zoho integrations',              'Coding Assistant SaaS launch',         '4th + 5th anchor',                        'Open Finance Service Init · full coverage'],
          ['Q4 2027', 'Iterate installment UX',                  'Multi-payer dashboards mature',        '6th anchor · 1,000+ supplier auction',    'ESG / climate-linked overlay'],
        ]}
      />

      <CalloutCard tone="success" title="Talent ramp">
        Year 1: 75 people. Year 2: 160. Year 3: 269. Indicative payroll: AED 75M / 175M / 320M. This is
        the dominant component of operating expense and what drives the OpEx-ratio compression as the
        book scales.
      </CalloutCard>
    </SectionWrapper>
  );
}

// ============================================================
// RISKS
// ============================================================
function SectionRisks({ refFn }) {
  return (
    <SectionWrapper id="risks" refFn={refFn} eyebrow="Section 7" title="Key risks and mitigants">
      <DataTable
        headers={['Risk', 'Mitigant']}
        rows={[
          ['E-invoicing delay (federal mandate slips beyond July 2027 SME date)',        'OCR Phase 1 stack production-grade from day one; can run on it indefinitely'],
          ['Open Finance bank coverage gap (one of ENBD/FAB/Mashreq/ADCB lags)',         'Lean + Tarabut both integrated; secondary post-dated-cheque fallback'],
          ['Anchor concentration (first major anchor 40%+ of P3 book)',                   'Hard 25% cap from day one; Year 1 plan = 3 anchors live'],
          ['Insurer payment delay (Daman shifts to 120+ day cycle)',                      'Insurer-specific advance rates flex; direct claim-head relationships at all major payers'],
          ['Predictive model underperformance (AUC < 0.75 in production)',                'Conservative advance rates until model proves; human review for any model-flagged claim above AED 50K'],
          ['Sharia structuring delay (SSB takes longer than planned)',                    'Board engaged at design stage; conventional product launches first; Sharia follows in Q1 2027'],
          ['Funding line covenant breach (NPL or watchlist exceeds thresholds)',          'Conservative covenants negotiated; quarterly portfolio reviews; cure rights pre-agreed'],
          ['Buyer abuse of installment feature (chain installments to float vendors)',    'Limit at canonical identity; rolling 12-month behaviour scoring across all open invoices'],
          ['Fraud (synthetic invoices through Peppol post-mandate)',                      'Duplicate-pledge database; behavioural anomaly detection; cross-platform fraud information sharing'],
          ['Regulatory shift (ADGM or CBUAE introduces new licence requirements)',        'Quarterly engagement with both regulators; build with regulatory headroom'],
          ['Talent (senior credit + engineering scarce in UAE)',                          'Remote-first eng with India / Eastern Europe hubs; UAE-based for credit, ops, sales, compliance'],
        ]}
      />
    </SectionWrapper>
  );
}

// ============================================================
// APPENDIX A — Wider catalogue (17 products)
// ============================================================
function SectionAppendixA({ refFn }) {
  const items = [
    ['A1', 'DMCC Gold and Commodity Murabaha Trade Line',     'Trade',          5000],
    ['A2', 'EDB-Guaranteed Sharia Term Lending Co-Lend',       'Working Capital', 3000],
    ['A3', 'Insurance Premium Financing for SME Group Medical','Hybrid',         1500],
    ['A4', 'WPS-Linked SME Payroll Stretch',                    'Working Capital', 1000],
    ['A5', 'UAE-Africa Re-Export Murabaha',                     'Trade',          2000],
    ['A6', 'Tokenised SME Invoice Marketplace',                 'Invoice',        1500],
    ['A7', 'Franchise and Acquisition Finance',                 'Working Capital', 1000],
    ['A8', 'Government Receivables Discount Program',           'Invoice',        2000],
    ['A9', 'Subscription / SaaS RBF for B2B Tech',              'Working Capital',  600],
    ['A10','Embedded Accounting-Platform Lending',              'Working Capital', 1500],
    ['A11','POS-Receivables Merchant Cash Advance',             'Working Capital', 1200],
    ['A12','Marketplace Seller Financing',                       'Working Capital',  800],
    ['A13','Trade Licence and Visa Renewal Finance',             'Working Capital',  400],
    ['A14','Corporate Tax and VAT Instalment Financing',          'Working Capital', 1000],
    ['A15','ESG and Solar Equipment Finance',                    'Equipment',      2000],
    ['A16','Education Sector Receivables Finance',               'Invoice',         700],
    ['A17','EWA Plus SME Payroll Bridge (Sharia)',                'Hybrid',          600],
  ];
  return (
    <SectionWrapper id="appA" refFn={refFn} eyebrow="Appendix A" title="The wider catalogue — 17 products beyond the flagship 3">
      <P>
        Each item below carries a one-line target, the structure, the indicative AUM at maturity, and
        the reason it is whitespace today. AUM figures are 3-5 year potential, not Year 1 targets.
        <strong> Total catalogue potential: AED 25.8B</strong>.
      </P>

      <DataTable
        headers={['#', 'Product', 'Category', 'AUM at maturity (AED M)']}
        rows={items.map((r) => [r[0], r[1], r[2], r[3].toLocaleString()])}
      />

      <CalloutCard tone="info" title="Sequencing recommendation">
        Year 2: A8 (Government Receivables) and A10 (Embedded Accounting). Year 3: A2 (EDB-Guaranteed
        Sharia Term Lending) and A14 (Corporate Tax). Year 4: A1 (DMCC Gold) and A5 (Africa Re-Export)
        once the trade-finance operation is staffed.
      </CalloutCard>
    </SectionWrapper>
  );
}

// ============================================================
// APPENDIX B — AI architecture (preview, deeper coverage in §4)
// ============================================================
function SectionAppendixB({ refFn }) {
  return (
    <SectionWrapper id="appB" refFn={refFn} eyebrow="Appendix B · Preview" title="AI leverage and agent architecture">
      <P>
        SME lending is a sequence of micro-decisions taken under deadline. Verify a trade licence. Pull
        a bank statement. Compute a debt-service ratio. Check sanctions. Score a buyer. Match a remittance.
        Send a reminder. Each step is a candidate for an AI agent.
      </P>

      <P>
        Year 3 plan headcount sits at 269 staff. Half of that is operations and servicing functions
        where the core work is structured. <strong>A serious agent stack reduces ops + servicing
        headcount by 35-50% at the same volume, saves AED 40-60M of payroll annually by Year 3,</strong>
        and ships customer experiences no banks-on-banks competitor can match.
      </P>

      <CalloutCard tone="info" title="Full coverage in Section 4">
        The full architecture, 20-agent inventory, infrastructure stack, build sequence, risks /
        guardrails, and indicative cost & ROI are in the AI Initiatives section of this app.
      </CalloutCard>
    </SectionWrapper>
  );
}

// ============================================================
// APPENDIX D — FLDG distribution
// ============================================================
function SectionAppendixD({ refFn }) {
  return (
    <SectionWrapper id="appD" refFn={refFn} eyebrow="Appendix D" title="EDB-Guaranteed SME term lending — distribution + FLDG">
      <P>
        The three balance-sheet products cover the whitespace where the platform funds the customer
        directly. There is a separate, equally large opportunity that does not need the platform's
        balance sheet at all: <strong>distributing EDB-guaranteed SME term loans on behalf of a partner
        bank</strong>, taking origination + servicing fees, and providing a First Loss Default Guarantee
        (FLDG) to share the credit risk.
      </P>

      <Sub>The risk waterfall on a default</Sub>
      <DataTable
        headers={['Tier', 'Coverage', 'Source']}
        rows={[
          ['Tier 1 · FLDG',           'First 8% of disbursement loss (configurable 5-10%)',     'Platform cash collateral, lien-marked at the bank'],
          ['Tier 2 · EDB Guarantee',   '50% of any loss above FLDG, capped at AED 10M / SME',    'EDB Credit Guarantee Scheme'],
          ['Tier 3 · Partner Bank',    'Remaining 50% above FLDG (residual)',                     'Bank\'s own credit reserve'],
        ]}
      />

      <Sub>Worked example — AED 100M cohort</Sub>
      <DataTable
        headers={['Loss scenario', 'Total loss', 'FLDG pays', 'EDB pays', 'Bank pays']}
        rows={[
          ['Expected (1.5%)',    'AED 1.5M',  'AED 1.5M', 'AED 0',    'AED 0'],
          ['Stressed (5%)',      'AED 5.0M',  'AED 5.0M', 'AED 0',    'AED 0'],
          ['Severe (10%)',       'AED 10.0M', 'AED 8.0M', 'AED 1.0M', 'AED 1.0M'],
          ['Catastrophic (20%)', 'AED 20.0M', 'AED 8.0M', 'AED 6.0M', 'AED 6.0M'],
        ]}
      />

      <Sub>Capital efficiency vs. balance-sheet products (Year 3)</Sub>
      <DataTable
        headers={['Metric', 'P1 (Smart Invoice)', 'P2 (Healthcare)', 'P3 (Anchor SCF)', 'P4 (Distribution + FLDG)']}
        rows={[
          ['Disbursement (AED M)',   '3,500',  '2,500',  '4,000',  '2,000'],
          ['Average book (AED M)',   '1,400',  '850',    '1,200',  '1,400'],
          ['Net contribution',       'AED 63M','AED 26M','AED 30M','AED 25M'],
          ['Capital required',       '180M',   '110M',   '140M',   '100M (FLDG only)'],
          ['Return on capital',      '35%',    '23%',    '21%',    '25%'],
          ['Capital intensity',      '13%',    '13%',    '12%',    '7%'],
        ]}
        highlightLast
      />

      <CalloutCard tone="success" title="Why this is not optional">
        Without the distribution model, the platform cannot meaningfully participate in the segment of
        UAE SME credit that EDB has explicitly chosen to support: term loans in priority sectors at bank
        pricing. AED 30B of EDB-backed lending targeted by 2026.
      </CalloutCard>
    </SectionWrapper>
  );
}

// ============================================================
// CLOSING
// ============================================================
function SectionClosing({ refFn }) {
  return (
    <SectionWrapper id="closing" refFn={refFn} eyebrow="Section 8" title="Closing">
      <P>
        These three products are not picked because they are easy. They are picked because the moats
        they build — e-invoicing-anchored data, multi-payer healthcare claim purchase, anchor SCF
        panels — are the moats that compound. Once an anchor is on, suppliers come for free. Once a
        polyclinic is on, every claim goes through us. Once a buyer has chosen an instalment plan once,
        they keep coming back.
      </P>

      <Quote>
        The UAE SME lending market today is a bank market underserved by banks. The structural fixes —
        e-invoicing, Open Finance, EDB guarantees, AECB enhancements — are arriving in 2026 to 2027.
        Whoever builds first on these rails owns the next decade.
      </Quote>

      <Sub>The next decisions to take</Sub>
      <ol style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--mal-ink)', paddingLeft: 24 }}>
        <li>Sign off on the three-product scope</li>
        <li>Begin the ADGM Cat 2 / Cat 4 licence application</li>
        <li>Close the first anchor letter of intent and the first three insurer master agreements in the same quarter</li>
        <li>Hire the staff product engineer, the head of data and ML, and the head of credit risk</li>
        <li>Negotiate with Pollen Street and Channel Capital on the senior warehouse term sheet</li>
      </ol>

      <CalloutCard tone="success" title="Year 3 platform-level outlook">
        AED 12B disbursement · AED 4.85B average book · AED 144M net contribution · AED 530M of capital
        deployed · blended return on capital ~27%. Materially better than any single-pillar plan.
      </CalloutCard>
    </SectionWrapper>
  );
}

window.SectionStrategy = SectionStrategy;
