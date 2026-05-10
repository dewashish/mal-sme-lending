/* eslint-disable */
// Section 3 — Financial Modeling
// Per-product interactive financial model. User drives sliders for
// cost of funds, advance rate, default rate, opex, disbursement, tenor;
// the model recomputes NIM, risk-adjusted margin, net contribution,
// ROA, and a 3-year P&L live. Charts re-animate on change.
//
// Product 1 (Smart Invoice) is fully wired with its own assumption set.
// Products 2 (Healthcare), 3 (Anchor SCF), 4 (FLDG Distribution) get
// their own assumption shapes too, with model variants where needed
// (e.g. SCF auction discount, FLDG capital efficiency).

const { useState: fS, useEffect: fE, useMemo: fM, useCallback: fCB, useRef: fR } = React;
const fIco = window.MalIcon;

// ============================================================
// FX / formatting helpers
// ============================================================
const fmtAED = (n, opts = {}) => {
  const { compact = true } = opts;
  if (!compact) return 'AED ' + Math.round(n).toLocaleString('en-AE');
  if (Math.abs(n) >= 1_000_000_000) return 'AED ' + (n / 1_000_000_000).toFixed(2) + 'B';
  if (Math.abs(n) >= 1_000_000)     return 'AED ' + (n / 1_000_000).toFixed(1) + 'M';
  if (Math.abs(n) >= 1_000)         return 'AED ' + (n / 1_000).toFixed(0) + 'K';
  return 'AED ' + Math.round(n).toLocaleString('en-AE');
};
const fmtPct = (n, dp = 1) => (n).toFixed(dp) + '%';
const fmtMult = (n) => n.toFixed(2) + 'x';
const fmtMillionsBare = (n) => {
  if (Math.abs(n) >= 1000) return (n / 1000).toFixed(1) + 'B';
  return n.toFixed(0) + 'M';
};

// ============================================================
// Product catalogue
// ============================================================
const FIN_PRODUCTS = [
  {
    id: 'p1',
    code: 'Product 1',
    title: 'Smart Invoice + Term Extension',
    blurb: 'B2B Pay & Get Paid · 4-hour wire · 5 plans + extension',
    color: 'lilac',
    available: true,
  },
  {
    id: 'p2',
    code: 'Product 2',
    title: 'Healthcare Receivables Engine',
    blurb: 'Same-day claim advance · multi-payer · predictive adjudication',
    color: 'coral',
    available: true,
  },
  {
    id: 'p3',
    code: 'Product 3',
    title: 'Anchor-Led Supply Chain Finance',
    blurb: 'Reverse factoring · daily dynamic-discount auction',
    color: 'ink',
    available: true,
  },
  {
    id: 'p4',
    code: 'Product 4',
    title: 'EDB-Guaranteed Distribution + FLDG',
    blurb: 'Pathway B · partner-bank co-lending with First Loss Default Guarantee',
    color: 'peach',
    available: true,
  },
];

// ============================================================
// Default assumption sets (per-product) — calibrated to the strategy doc
// ============================================================
const DEFAULTS = {
  p1: {
    // Volume
    disbY1: 250, disbY2: 1500, disbY3: 4000,           // AED M
    avgTicketK: 80,                                    // AED K per invoice
    avgTenorD: 75,                                     // days (blend of 30/60/90/120/180 plans)
    // Pricing
    advanceRate: 90,                                   // % of invoice
    discountPctMo: 1.6,                                // % per month effective discount
    extPenetration: 22,                                // % of pay-30 books that roll into 6-mo extension
    extAprPct: 16,                                     // term extension APR
    // Cost
    cofPct: 6.5,                                       // cost of funds (annual)
    opexPctOfBook: 2.4,                                // opex as % of avg book
    defaultRatePct: 3.2,                               // annualised loss rate on book
    fldgRecoveryPct: 0,                                // P1 not on FLDG initially
    // Capital
    equityPctOfBook: 12,                               // equity per AED of avg book
  },
  p2: {
    disbY1: 150, disbY2: 700, disbY3: 2000,
    avgTicketK: 35,
    avgTenorD: 35,                                     // claim → adjudication float
    advanceRate: 92,
    discountPctMo: 2.1,
    extPenetration: 0, extAprPct: 0,
    cofPct: 6.5,
    opexPctOfBook: 3.4,                                // higher coding + adjudication ops
    defaultRatePct: 1.8,                               // mostly payer adjudication risk
    fldgRecoveryPct: 0,
    equityPctOfBook: 10,
  },
  p3: {
    disbY1: 200, disbY2: 1100, disbY3: 3200,
    avgTicketK: 220,                                    // anchor-pooled invoices, larger
    avgTenorD: 55,
    advanceRate: 96,
    discountPctMo: 0.95,                                // tight rates — anchor competition
    extPenetration: 0, extAprPct: 0,
    cofPct: 6.0,                                        // anchor-collateralised → cheap rev wholesale
    opexPctOfBook: 1.4,                                 // automation-heavy
    defaultRatePct: 0.8,                                // anchor-mitigated
    fldgRecoveryPct: 0,
    equityPctOfBook: 8,
  },
  p4: {
    disbY1: 50, disbY2: 600, disbY3: 2800,
    avgTicketK: 40,
    avgTenorD: 60,
    advanceRate: 90,
    discountPctMo: 1.7,
    extPenetration: 0, extAprPct: 0,
    cofPct: 5.5,                                        // partner-bank balance sheet → cheaper
    opexPctOfBook: 1.8,                                 // we are servicer, partner takes funding
    defaultRatePct: 3.5,
    fldgRecoveryPct: 65,                                // FLDG cushion absorbs first 5%
    equityPctOfBook: 4,                                 // capital-light: only FLDG is on us
  },
};

// ============================================================
// Core financial model
// ============================================================
//
// Average book ≈ disbursement * (avgTenorD / 365)
// Gross yield = discountPctMo * 12  (≈ 19.2% APR at 1.6%/mo)
// Cost of funds drag on advanced principal = advanceRate * cofPct
// Risk = defaultRatePct on book * (1 - fldgRecoveryPct)
// OpEx = opexPctOfBook * book
// NIM = grossYield - cofDrag
// RAM = NIM - risk
// Net contribution = (RAM - opex) * book    (pre-tax pre-corp-allocations)
// ROA = netContribution / avgBook
// Equity = equityPctOfBook * avgBook
// RAROC = netContribution / equity
//
// FLDG variant (Product 4): only equityPctOfBook scaled down because
// the principal is on partner-bank balance sheet; we earn a servicing
// + risk-share fee modelled here as netContribution / FLDG capital.
//
function modelProduct(d) {
  const yearOf = (disb) => {
    const advancedPrincipal = disb * (d.advanceRate / 100);            // AED M deployed
    const book = advancedPrincipal * (d.avgTenorD / 365);               // AED M avg book
    const grossYieldPct = d.discountPctMo * 12;                         // % APR
    const cofDragPct = d.cofPct;                                        // % APR (on book)
    const fldgAdjustedDefaultPct = d.defaultRatePct * (1 - d.fldgRecoveryPct / 100);
    const nimPct = grossYieldPct - cofDragPct;                          // %
    const ramPct = nimPct - fldgAdjustedDefaultPct;                     // %
    const opexPct = d.opexPctOfBook;                                    // %
    const netContribPct = ramPct - opexPct;                             // %
    // AED M values (book * pct)
    const grossInterestM   = book * grossYieldPct  / 100;
    const cofM             = book * cofDragPct     / 100;
    const lossM            = book * fldgAdjustedDefaultPct / 100;
    const opexM            = book * opexPct        / 100;
    const netContribM      = book * netContribPct  / 100;
    const equityM          = book * d.equityPctOfBook / 100;
    const roaPct           = book > 0 ? (netContribM / book) * 100 : 0;
    const rarocPct         = equityM > 0 ? (netContribM / equityM) * 100 : 0;
    return {
      disbursement: disb,
      advancedPrincipal,
      book,
      grossYieldPct, cofDragPct, fldgAdjustedDefaultPct, opexPct,
      nimPct, ramPct, netContribPct,
      grossInterestM, cofM, lossM, opexM, netContribM,
      equityM, roaPct, rarocPct,
    };
  };
  const y1 = yearOf(d.disbY1);
  const y2 = yearOf(d.disbY2);
  const y3 = yearOf(d.disbY3);
  return { y1, y2, y3 };
}

// ============================================================
// Top-level section — tabs across products
// ============================================================
function SectionFinancial({ lang, isMobile }) {
  const [activeId, setActiveId] = fS('p1');
  const [tweaks, setTweaks] = fS({
    p1: { ...DEFAULTS.p1 },
    p2: { ...DEFAULTS.p2 },
    p3: { ...DEFAULTS.p3 },
    p4: { ...DEFAULTS.p4 },
  });
  const isAr = lang === 'ar';

  const setForProduct = fCB((pid, key, value) => {
    setTweaks((t) => ({ ...t, [pid]: { ...t[pid], [key]: value } }));
  }, []);
  const resetProduct = fCB((pid) => {
    setTweaks((t) => ({ ...t, [pid]: { ...DEFAULTS[pid] } }));
  }, []);

  return (
    <div className="mal-section-page" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Section title */}
      <h1 className="mal-fade-up" style={{
        fontFamily: 'var(--mal-font-display)', fontStyle: 'italic',
        fontSize: isMobile ? 36 : 48, lineHeight: 1.0, letterSpacing: '-0.02em',
        margin: '0 0 22px',
      }}>
        {isAr ? 'النمذجة المالية' : 'Financial Modeling'}
      </h1>

      {/* Product tabs */}
      <div style={{
        display: 'flex', gap: 8, flexWrap: 'wrap',
        borderBottom: '1px solid var(--mal-line)',
        marginBottom: 26, paddingBottom: 0,
      }}>
        {FIN_PRODUCTS.map((p) => {
          const active = p.id === activeId;
          return (
            <button key={p.id} onClick={() => setActiveId(p.id)}
                    style={{
                      all: 'unset', cursor: 'pointer',
                      padding: '10px 14px', borderRadius: '8px 8px 0 0',
                      borderBottom: active ? '2px solid var(--mal-primary)' : '2px solid transparent',
                      color: active ? 'var(--mal-ink)' : 'var(--mal-mid)',
                      fontWeight: active ? 600 : 500,
                      fontSize: 13, marginBottom: -1,
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                      transition: 'border-color .15s, color .15s',
                    }}>
              <Avatar name={p.code.slice(-1)} tone={p.color} size={26}/>
              <span>{p.title}</span>
            </button>
          );
        })}
      </div>

      {/* Active product modeller */}
      {activeId === 'p1' && <ProductModel pid="p1" tweaks={tweaks.p1} setKey={(k, v) => setForProduct('p1', k, v)} onReset={() => resetProduct('p1')} lang={lang} isMobile={isMobile}/>}
      {activeId === 'p2' && <ProductModel pid="p2" tweaks={tweaks.p2} setKey={(k, v) => setForProduct('p2', k, v)} onReset={() => resetProduct('p2')} lang={lang} isMobile={isMobile}/>}
      {activeId === 'p3' && <ProductModel pid="p3" tweaks={tweaks.p3} setKey={(k, v) => setForProduct('p3', k, v)} onReset={() => resetProduct('p3')} lang={lang} isMobile={isMobile}/>}
      {activeId === 'p4' && <ProductModel pid="p4" tweaks={tweaks.p4} setKey={(k, v) => setForProduct('p4', k, v)} onReset={() => resetProduct('p4')} lang={lang} isMobile={isMobile}/>}

      {/* Cross-product roll-up */}
      <CrossRollup tweaks={tweaks} isMobile={isMobile} lang={lang}/>
    </div>
  );
}

// ============================================================
// Product model — input panel + computed output
// ============================================================
function ProductModel({ pid, tweaks, setKey, onReset, lang, isMobile }) {
  const isAr = lang === 'ar';
  const product = FIN_PRODUCTS.find((p) => p.id === pid);
  const result = fM(() => modelProduct(tweaks), [tweaks]);

  // --- KPIs (Year 3) ---------------------------------------------------------
  const k3 = result.y3;

  // --- CSV export ------------------------------------------------------------
  const exportCsv = fCB(() => {
    const rows = [
      ['Metric', 'Year 1', 'Year 2', 'Year 3'],
      ['Disbursement (AED M)',        result.y1.disbursement.toFixed(0), result.y2.disbursement.toFixed(0), result.y3.disbursement.toFixed(0)],
      ['Advanced principal (AED M)',  result.y1.advancedPrincipal.toFixed(0), result.y2.advancedPrincipal.toFixed(0), result.y3.advancedPrincipal.toFixed(0)],
      ['Avg book (AED M)',            result.y1.book.toFixed(1), result.y2.book.toFixed(1), result.y3.book.toFixed(1)],
      ['Gross yield %',               result.y1.grossYieldPct.toFixed(2), result.y2.grossYieldPct.toFixed(2), result.y3.grossYieldPct.toFixed(2)],
      ['Cost of funds %',             result.y1.cofDragPct.toFixed(2), result.y2.cofDragPct.toFixed(2), result.y3.cofDragPct.toFixed(2)],
      ['Effective default %',         result.y1.fldgAdjustedDefaultPct.toFixed(2), result.y2.fldgAdjustedDefaultPct.toFixed(2), result.y3.fldgAdjustedDefaultPct.toFixed(2)],
      ['NIM %',                       result.y1.nimPct.toFixed(2), result.y2.nimPct.toFixed(2), result.y3.nimPct.toFixed(2)],
      ['Risk-Adj margin %',           result.y1.ramPct.toFixed(2), result.y2.ramPct.toFixed(2), result.y3.ramPct.toFixed(2)],
      ['OpEx % of book',              result.y1.opexPct.toFixed(2), result.y2.opexPct.toFixed(2), result.y3.opexPct.toFixed(2)],
      ['Net contribution %',          result.y1.netContribPct.toFixed(2), result.y2.netContribPct.toFixed(2), result.y3.netContribPct.toFixed(2)],
      ['Net contribution (AED M)',    result.y1.netContribM.toFixed(2), result.y2.netContribM.toFixed(2), result.y3.netContribM.toFixed(2)],
      ['Equity allocated (AED M)',    result.y1.equityM.toFixed(2), result.y2.equityM.toFixed(2), result.y3.equityM.toFixed(2)],
      ['ROA %',                       result.y1.roaPct.toFixed(2), result.y2.roaPct.toFixed(2), result.y3.roaPct.toFixed(2)],
      ['RAROC %',                     result.y1.rarocPct.toFixed(1), result.y2.rarocPct.toFixed(1), result.y3.rarocPct.toFixed(1)],
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `mal-${pid}-financials.csv`; a.click();
    URL.revokeObjectURL(url);
  }, [result, pid]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '320px 1fr', gap: 24 }}>
      {/* ============= Input panel ============= */}
      <div className="mal-fade-up" style={{
        position: isMobile ? 'static' : 'sticky', top: 70, alignSelf: 'flex-start',
        background: 'var(--mal-paper)', border: '1px solid var(--mal-line)',
        borderRadius: 'var(--mal-r-lg)', padding: 18,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div className="mal-caption" style={{ color: 'var(--mal-mid)' }}>{product.code}</div>
          <button onClick={onReset} style={{
            all: 'unset', cursor: 'pointer', fontSize: 11, color: 'var(--mal-primary)',
            fontWeight: 500,
          }}>↺ {isAr ? 'إعادة تعيين' : 'Reset'}</button>
        </div>
        <div style={{
          fontFamily: 'var(--mal-font-display)', fontStyle: 'italic',
          fontSize: 22, lineHeight: 1.15, marginBottom: 4,
        }}>{product.title}</div>
        <div style={{ fontSize: 12, color: 'var(--mal-mid)', marginBottom: 16 }}>{product.blurb}</div>

        {/* Volume */}
        <SectionLabel>{isAr ? 'الحجم' : 'Volume'}</SectionLabel>
        <MalSlider label={isAr ? 'صرف السنة ١' : 'Disbursement Y1'} value={tweaks.disbY1}
                   onChange={(v) => setKey('disbY1', v)} min={20} max={2000} step={10}
                   formatValue={(v) => v + 'M'}
                   hint={isAr ? 'بالدرهم الإماراتي بالملايين' : 'AED, millions'}/>
        <MalSlider label={isAr ? 'صرف السنة ٢' : 'Disbursement Y2'} value={tweaks.disbY2}
                   onChange={(v) => setKey('disbY2', v)} min={50} max={6000} step={50}
                   formatValue={(v) => v + 'M'}/>
        <MalSlider label={isAr ? 'صرف السنة ٣' : 'Disbursement Y3'} value={tweaks.disbY3}
                   onChange={(v) => setKey('disbY3', v)} min={100} max={15000} step={100}
                   formatValue={(v) => v + 'M'}/>
        <MalSlider label={isAr ? 'متوسط مدة (يوم)' : 'Avg tenor'} value={tweaks.avgTenorD}
                   onChange={(v) => setKey('avgTenorD', v)} min={15} max={180} step={5}
                   suffix={isAr ? ' يوم' : ' days'}/>

        {/* Pricing */}
        <SectionLabel>{isAr ? 'التسعير' : 'Pricing'}</SectionLabel>
        <MalSlider label={isAr ? 'نسبة التقدم' : 'Advance rate'} value={tweaks.advanceRate}
                   onChange={(v) => setKey('advanceRate', v)} min={70} max={100} step={1}
                   suffix="%"/>
        <MalSlider label={isAr ? 'الخصم الشهري' : 'Discount / month'} value={tweaks.discountPctMo}
                   onChange={(v) => setKey('discountPctMo', v)} min={0.4} max={3.5} step={0.05}
                   suffix="%/mo"
                   hint={isAr ? `≈ ${(tweaks.discountPctMo * 12).toFixed(1)}% APR` : `≈ ${(tweaks.discountPctMo * 12).toFixed(1)}% APR`}/>

        {/* Cost */}
        <SectionLabel>{isAr ? 'التكلفة والمخاطر' : 'Cost & risk'}</SectionLabel>
        <MalSlider label={isAr ? 'تكلفة التمويل' : 'Cost of funds'} value={tweaks.cofPct}
                   onChange={(v) => setKey('cofPct', v)} min={3} max={10} step={0.1}
                   suffix="% APR"/>
        <MalSlider label={isAr ? 'التشغيل ÷ الكتاب' : 'OpEx / avg book'} value={tweaks.opexPctOfBook}
                   onChange={(v) => setKey('opexPctOfBook', v)} min={0.5} max={6} step={0.1}
                   suffix="%"/>
        <MalSlider label={isAr ? 'معدل التعثر' : 'Default rate'} value={tweaks.defaultRatePct}
                   onChange={(v) => setKey('defaultRatePct', v)} min={0.3} max={8} step={0.1}
                   suffix="% APR"/>
        {pid === 'p4' && (
          <MalSlider label={isAr ? 'استرداد FLDG' : 'FLDG recovery'} value={tweaks.fldgRecoveryPct}
                     onChange={(v) => setKey('fldgRecoveryPct', v)} min={0} max={90} step={5}
                     suffix="%"
                     hint={isAr ? 'النسبة المغطاة بالضمان' : 'Share of losses absorbed by FLDG'}/>
        )}

        {/* Capital */}
        <SectionLabel>{isAr ? 'رأس المال' : 'Capital'}</SectionLabel>
        <MalSlider label={isAr ? 'حقوق الملكية ÷ الكتاب' : 'Equity / avg book'} value={tweaks.equityPctOfBook}
                   onChange={(v) => setKey('equityPctOfBook', v)} min={2} max={20} step={0.5}
                   suffix="%"/>

        <button onClick={exportCsv} style={{
          all: 'unset', cursor: 'pointer', display: 'block',
          marginTop: 18, padding: '10px 14px',
          background: 'var(--mal-ink)', color: '#FAF7EE',
          borderRadius: 999, fontSize: 12, fontWeight: 500,
          textAlign: 'center',
        }}>
          ↓ {isAr ? 'تحميل CSV' : 'Download CSV'}
        </button>
      </div>

      {/* ============= Output panel ============= */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        {/* KPI strip — Year 3 */}
        <div className="mal-fade-up" style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <MalKpi label={isAr ? 'هامش الفائدة (Y3)' : 'NIM · Y3'}
                  value={fmtPct(k3.nimPct)}
                  delta={fmtPct(k3.nimPct - result.y1.nimPct)}
                  deltaTone={(k3.nimPct - result.y1.nimPct) >= 0 ? 'up' : 'down'}
                  sub={isAr ? 'بعد تكلفة التمويل' : 'after cost of funds'}/>
          <MalKpi label={isAr ? 'هامش معدل بالمخاطر (Y3)' : 'Risk-Adj margin · Y3'}
                  value={fmtPct(k3.ramPct)}
                  sub={isAr ? 'بعد الخسائر' : 'after expected loss'}/>
          <MalKpi label={isAr ? 'مساهمة صافية (Y3)' : 'Net contrib · Y3'}
                  value={'AED ' + k3.netContribM.toFixed(0) + 'M'}
                  delta={(k3.netContribM - result.y1.netContribM > 0 ? '+' : '') + (k3.netContribM - result.y1.netContribM).toFixed(0) + 'M vs Y1'}
                  deltaTone={(k3.netContribM - result.y1.netContribM) >= 0 ? 'up' : 'down'}/>
          <MalKpi label={isAr ? 'العائد على الأصول' : 'ROA · Y3'}
                  value={fmtPct(k3.roaPct)}
                  sub={isAr ? 'صافي ÷ الكتاب' : 'net ÷ avg book'}/>
          <MalKpi label={'RAROC · Y3'}
                  value={fmtPct(k3.rarocPct, 0)}
                  sub={isAr ? 'مقابل ٢٠٪ هدف' : 'vs 20% target'}
                  deltaTone={k3.rarocPct >= 20 ? 'up' : 'down'}/>
        </div>

        {/* Margin walk chart — bars by year */}
        <ChartCard title={isAr ? 'تدرّج الهامش' : 'Margin walk · % of book'}
                   sub={isAr ? 'الإيراد الإجمالي → بعد التكلفة → بعد الخسائر → الصافي' : 'Gross yield → after cost-of-funds → after expected loss → net contribution'}>
          <MalBarChart
            ariaLabel="Margin walk"
            height={240}
            data={[
              { label: 'Gross',   value: +k3.grossYieldPct.toFixed(2),    tone: 'iri' },
              { label: '− CoF',   value: +k3.nimPct.toFixed(2),           tone: 'iri' },
              { label: '− Loss',  value: +k3.ramPct.toFixed(2),           tone: 'iri' },
              { label: '− OpEx',  value: +k3.netContribPct.toFixed(2),    tone: k3.netContribPct >= 0 ? 'success' : 'danger' },
            ]}
            formatValue={(v) => v.toFixed(1) + '%'}
          />
        </ChartCard>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 22 }}>
          <ChartCard title={isAr ? 'الصرف على ٣ سنوات' : 'Disbursement · Y1 → Y3'}>
            <MalBarChart
              height={220}
              ariaLabel="Disbursement"
              data={[
                { label: 'Y1', value: result.y1.disbursement, tone: 'iri' },
                { label: 'Y2', value: result.y2.disbursement, tone: 'iri' },
                { label: 'Y3', value: result.y3.disbursement, tone: 'iri' },
              ]}
              formatValue={(v) => fmtMillionsBare(v)}
            />
          </ChartCard>
          <ChartCard title={isAr ? 'المساهمة الصافية' : 'Net contribution · AED M'}>
            <MalLineChart
              height={220}
              ariaLabel="Net contribution"
              labels={['Y1', 'Y2', 'Y3']}
              series={[{
                name: 'NC',
                values: [result.y1.netContribM, result.y2.netContribM, result.y3.netContribM],
                color: 'var(--mal-primary)',
              }]}
              formatValue={(v) => v.toFixed(1) + 'M'}
            />
          </ChartCard>
        </div>

        {/* Capital + ROA cards */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 22 }}>
          <ChartCard title={isAr ? 'هيكل التكلفة (Y3)' : 'Cost stack · Y3'}
                     sub={isAr ? 'كنسبة من الكتاب' : 'as % of avg book'}>
            <MalStackedBar
              segments={[
                { label: 'Net contrib', value: Math.max(0, k3.netContribPct), color: 'var(--mal-success)' },
                { label: 'OpEx',        value: k3.opexPct,                    color: 'var(--mal-primary-3)' },
                { label: 'Loss',        value: k3.fldgAdjustedDefaultPct,     color: 'var(--mal-danger)' },
                { label: 'CoF',         value: k3.cofDragPct,                 color: 'var(--mal-warn)' },
              ]}
              formatLabel={(v) => v.toFixed(1) + '%'}
            />
          </ChartCard>
          <ChartCard title={isAr ? 'كفاءة رأس المال' : 'Capital efficiency'}>
            <div style={{ display: 'flex', gap: 20, alignItems: 'center', justifyContent: 'space-around', flexWrap: 'wrap' }}>
              <MalDonut value={k3.rarocPct} max={40}
                        color="var(--mal-primary)"
                        label="RAROC · Y3" sub={k3.rarocPct >= 20 ? 'above target' : 'below 20% target'}
                        formatValue={(v) => v.toFixed(0) + '%'}/>
              <MalDonut value={k3.roaPct} max={Math.max(8, k3.roaPct * 1.4)}
                        color="var(--mal-primary-3)"
                        label="ROA · Y3" sub={'on AED ' + k3.book.toFixed(0) + 'M book'}
                        formatValue={(v) => v.toFixed(1) + '%'}/>
            </div>
          </ChartCard>
        </div>

        {/* P&L table */}
        <PLTable result={result} isAr={isAr}/>

        {/* Sensitivity */}
        <SensitivityCard tweaks={tweaks} isAr={isAr}/>

        {/* Formula reference */}
        <FormulaCard isAr={isAr}/>
      </div>
    </div>
  );
}

// ============================================================
// Helpers
// ============================================================
function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
      letterSpacing: '.1em', color: 'var(--mal-mid-2)',
      marginTop: 18, marginBottom: 8,
    }}>{children}</div>
  );
}

function ChartCard({ title, sub, children }) {
  return (
    <div className="mal-fade-up" style={{
      background: 'var(--mal-paper)', border: '1px solid var(--mal-line)',
      borderRadius: 'var(--mal-r-lg)', padding: 18,
    }}>
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--mal-ink)' }}>{title}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--mal-mid)', marginTop: 2 }}>{sub}</div>}
      </div>
      {children}
    </div>
  );
}

function PLTable({ result, isAr }) {
  const rows = [
    [isAr ? 'الصرف' : 'Disbursement (AED M)',     result.y1.disbursement, result.y2.disbursement, result.y3.disbursement, (v) => v.toFixed(0)],
    [isAr ? 'الكتاب المتوسط' : 'Avg book',         result.y1.book, result.y2.book, result.y3.book, (v) => v.toFixed(0) + 'M'],
    [isAr ? 'إيراد الفائدة' : 'Gross interest',    result.y1.grossInterestM, result.y2.grossInterestM, result.y3.grossInterestM, (v) => v.toFixed(1) + 'M'],
    [isAr ? 'تكلفة التمويل' : '− Cost of funds',   -result.y1.cofM, -result.y2.cofM, -result.y3.cofM, (v) => v.toFixed(1) + 'M'],
    [isAr ? 'الخسائر المتوقعة' : '− Expected loss', -result.y1.lossM, -result.y2.lossM, -result.y3.lossM, (v) => v.toFixed(1) + 'M'],
    [isAr ? 'مصاريف التشغيل' : '− OpEx',           -result.y1.opexM, -result.y2.opexM, -result.y3.opexM, (v) => v.toFixed(1) + 'M'],
    [isAr ? 'المساهمة الصافية' : 'Net contribution', result.y1.netContribM, result.y2.netContribM, result.y3.netContribM, (v) => v.toFixed(1) + 'M'],
    [isAr ? 'حقوق الملكية المخصصة' : 'Equity allocated', result.y1.equityM, result.y2.equityM, result.y3.equityM, (v) => v.toFixed(1) + 'M'],
    [isAr ? 'العائد على الأصول' : 'ROA',           result.y1.roaPct, result.y2.roaPct, result.y3.roaPct, (v) => v.toFixed(2) + '%'],
    ['RAROC',                                        result.y1.rarocPct, result.y2.rarocPct, result.y3.rarocPct, (v) => v.toFixed(0) + '%'],
  ];
  return (
    <ChartCard title={isAr ? 'الربح والخسارة المتوقع' : 'Pro-forma P&L · Y1 → Y3'}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
          <thead>
            <tr>
              {['', 'Year 1', 'Year 2', 'Year 3'].map((h, i) => (
                <th key={i} style={{
                  textAlign: i === 0 ? 'start' : 'end',
                  padding: '8px 10px', fontSize: 11,
                  textTransform: 'uppercase', letterSpacing: '.06em',
                  color: 'var(--mal-mid)',
                  borderBottom: '2px solid var(--mal-line)',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => {
              const isTotal = ri === 6;
              const isCapital = ri >= 7;
              return (
                <tr key={ri} style={{
                  background: isTotal ? 'var(--mal-primary-50)' : 'transparent',
                  fontWeight: isTotal ? 600 : 400,
                }}>
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--mal-line-2)', color: 'var(--mal-mid)' }}>
                    {row[0]}
                  </td>
                  {[row[1], row[2], row[3]].map((v, vi) => (
                    <td key={vi} style={{
                      padding: '8px 10px', textAlign: 'end',
                      borderBottom: '1px solid var(--mal-line-2)',
                      borderTop: isCapital && vi === 0 ? '2px solid var(--mal-line)' : 'none',
                      color: v < 0 ? 'var(--mal-danger)' : 'var(--mal-ink)',
                      fontFamily: 'var(--mal-font-mono)',
                    }}>
                      {row[4](v)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </ChartCard>
  );
}

// ============================================================
// Sensitivity — small heatmap of net-contribution under
// (default rate × cost of funds) flexes
// ============================================================
function SensitivityCard({ tweaks, isAr }) {
  // Build a 5x5 grid: rows = default rate flex (-50%..+100%), cols = cof flex
  const dfx = [-50, -25, 0, 50, 100];   // % delta on default rate
  const cfx = [-100, -50, 0, 50, 150];  // bps delta on COF (negative bps = cheaper funds)
  const grid = dfx.map((dr) => cfx.map((cof) => {
    const d = {
      ...tweaks,
      defaultRatePct: tweaks.defaultRatePct * (1 + dr / 100),
      cofPct: tweaks.cofPct + cof / 100,
    };
    const m = modelProduct(d);
    return m.y3.netContribM;
  }));
  const flat = grid.flat();
  const min = Math.min(...flat);
  const max = Math.max(...flat);
  const cellColor = (v) => {
    if (max === min) return 'var(--mal-surface-2)';
    const t = (v - min) / (max - min);
    if (v < 0) return `rgba(214, 80, 78, ${0.12 + 0.55 * (1 - t)})`;
    return `rgba(126, 199, 159, ${0.12 + 0.65 * t})`;
  };
  return (
    <ChartCard title={isAr ? 'حساسية المساهمة الصافية (Y3)' : 'Sensitivity · Y3 net contribution (AED M)'}
               sub={isAr ? 'الصفوف: تغيّر معدل التعثر · الأعمدة: تغيّر تكلفة التمويل (نقاط أساس)' : 'Rows: default-rate flex · Cols: cost-of-funds flex (bps)'}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'separate', borderSpacing: 4, fontFamily: 'var(--mal-font-mono)', fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ padding: 6, color: 'var(--mal-mid)', fontWeight: 500, fontSize: 11 }}/>
              {cfx.map((c, i) => (
                <th key={i} style={{ padding: 6, color: 'var(--mal-mid)', fontWeight: 500, fontSize: 11, textAlign: 'center' }}>
                  {c > 0 ? '+' + c : c} bps
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.map((row, ri) => (
              <tr key={ri}>
                <td style={{
                  padding: 6, color: 'var(--mal-mid)',
                  fontSize: 11, fontWeight: 500, textAlign: 'end',
                }}>
                  {dfx[ri] > 0 ? '+' + dfx[ri] : dfx[ri]}%
                </td>
                {row.map((v, ci) => (
                  <td key={ci} style={{
                    width: 76, textAlign: 'center', padding: '8px 6px',
                    background: cellColor(v),
                    border: dfx[ri] === 0 && cfx[ci] === 0 ? '2px solid var(--mal-primary)' : '1px solid var(--mal-line-2)',
                    borderRadius: 6,
                    color: 'var(--mal-ink)',
                  }}>
                    {v.toFixed(0)}M
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ChartCard>
  );
}

// ============================================================
// Formula reference (collapsible)
// ============================================================
function FormulaCard({ isAr }) {
  const [open, setOpen] = fS(false);
  return (
    <div style={{
      background: 'var(--mal-surface-2)', borderRadius: 'var(--mal-r-lg)',
      padding: 14, border: '1px solid var(--mal-line-2)',
    }}>
      <button onClick={() => setOpen((o) => !o)}
              style={{
                all: 'unset', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', fontSize: 12, fontWeight: 500, color: 'var(--mal-mid)',
              }}>
        <span>{isAr ? 'الصيغ المستخدمة في النموذج' : 'Formulas used in this model'}</span>
        <span style={{ transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform .25s' }}>▾</span>
      </button>
      {open && (
        <div style={{
          marginTop: 10, fontSize: 12, lineHeight: 1.7,
          color: 'var(--mal-ink)', fontFamily: 'var(--mal-font-mono)',
        }}>
          <div>book = disbursement × advance_rate × (avg_tenor_d ÷ 365)</div>
          <div>gross_yield_pct = discount_pct_per_month × 12</div>
          <div>effective_default_pct = default_rate_pct × (1 − fldg_recovery_pct)</div>
          <div>nim_pct = gross_yield_pct − cof_pct</div>
          <div>ram_pct = nim_pct − effective_default_pct</div>
          <div>net_contrib_pct = ram_pct − opex_pct_of_book</div>
          <div>net_contrib_M = book × net_contrib_pct</div>
          <div>equity_M = book × equity_pct_of_book</div>
          <div>roa = net_contrib_M ÷ book</div>
          <div>raroc = net_contrib_M ÷ equity_M</div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Cross-product roll-up — sum of all four
// ============================================================
function CrossRollup({ tweaks, isMobile, lang }) {
  const isAr = lang === 'ar';
  const all = fM(() => {
    const r = { p1: modelProduct(tweaks.p1), p2: modelProduct(tweaks.p2), p3: modelProduct(tweaks.p3), p4: modelProduct(tweaks.p4) };
    const sumYr = (yk) =>
      ['p1', 'p2', 'p3', 'p4'].reduce((acc, p) => ({
        disbursement: acc.disbursement + r[p][yk].disbursement,
        book:         acc.book + r[p][yk].book,
        netContribM:  acc.netContribM + r[p][yk].netContribM,
        equityM:      acc.equityM + r[p][yk].equityM,
      }), { disbursement: 0, book: 0, netContribM: 0, equityM: 0 });
    return { y1: sumYr('y1'), y2: sumYr('y2'), y3: sumYr('y3'), perProduct: r };
  }, [tweaks]);

  const blendedROC = all.y3.equityM > 0 ? (all.y3.netContribM / all.y3.equityM) * 100 : 0;

  return (
    <div style={{ marginTop: 60 }}>
      <div className="mal-fade-up" style={{ marginBottom: 16 }}>
        <Pill tone="iri" dot>{isAr ? 'الإجمالي · جميع المنتجات' : 'Total · all products'}</Pill>
        <h2 style={{
          fontFamily: 'var(--mal-font-display)', fontStyle: 'italic',
          fontSize: isMobile ? 32 : 44, lineHeight: 1.05, letterSpacing: '-0.02em',
          margin: '12px 0 10px',
        }}>
          {isAr ? 'المنصة كاملة' : 'The full platform'}
        </h2>
        <p style={{ color: 'var(--mal-mid)', fontSize: 14, lineHeight: 1.6, maxWidth: 720 }}>
          {isAr
            ? 'مجموع المنتجات الأربعة بالمدخلات الحالية. عدّل أي منتج وستتحدث الأرقام هنا فوراً.'
            : 'The sum of all four products at your current settings. Tweak any product above and these totals update instantly.'}
        </p>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 22 }}>
        <MalKpi label={isAr ? 'إجمالي الصرف Y3' : 'Total disb. Y3'}
                value={fmtAED(all.y3.disbursement * 1_000_000)}/>
        <MalKpi label={isAr ? 'الكتاب المتوسط Y3' : 'Avg book Y3'}
                value={fmtAED(all.y3.book * 1_000_000)}/>
        <MalKpi label={isAr ? 'مساهمة صافية Y3' : 'Net contrib Y3'}
                value={fmtAED(all.y3.netContribM * 1_000_000)}/>
        <MalKpi label={isAr ? 'حقوق الملكية' : 'Equity needed'}
                value={fmtAED(all.y3.equityM * 1_000_000)}/>
        <MalKpi label={isAr ? 'العائد المركّب' : 'Blended RAROC'}
                value={fmtPct(blendedROC, 0)}
                deltaTone={blendedROC >= 20 ? 'up' : 'down'}/>
      </div>

      <ChartCard title={isAr ? 'مساهمة كل منتج (Y3)' : 'Net contribution by product · Y3 (AED M)'}>
        <MalBarChart
          height={240}
          ariaLabel="Per-product net contribution"
          data={[
            { label: 'P1 · Smart',     value: +all.perProduct.p1.y3.netContribM.toFixed(1), tone: 'iri' },
            { label: 'P2 · Health',    value: +all.perProduct.p2.y3.netContribM.toFixed(1), tone: 'iri' },
            { label: 'P3 · Anchor',    value: +all.perProduct.p3.y3.netContribM.toFixed(1), tone: 'iri' },
            { label: 'P4 · FLDG',      value: +all.perProduct.p4.y3.netContribM.toFixed(1), tone: 'success' },
          ]}
          formatValue={(v) => v.toFixed(0) + 'M'}
        />
      </ChartCard>

      <div style={{ marginTop: 16 }}>
        <ChartCard title={isAr ? 'تخصيص رأس المال (Y3)' : 'Capital allocated by product · Y3'}>
          <MalStackedBar
            segments={[
              { label: 'P1 Smart',  value: all.perProduct.p1.y3.equityM, color: 'var(--mal-primary)' },
              { label: 'P2 Health', value: all.perProduct.p2.y3.equityM, color: 'var(--mal-primary-3)' },
              { label: 'P3 Anchor', value: all.perProduct.p3.y3.equityM, color: 'var(--mal-iri-2)' },
              { label: 'P4 FLDG',   value: all.perProduct.p4.y3.equityM, color: 'var(--mal-iri-4)' },
            ]}
            formatLabel={(v) => v.toFixed(1) + 'M AED'}
          />
        </ChartCard>
      </div>
    </div>
  );
}

window.SectionFinancial = SectionFinancial;
