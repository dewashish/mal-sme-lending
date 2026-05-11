/* eslint-disable */
// Mal · P3 Embedded POS Finance prototype.
//
// 6-phase journey for a UAE F&B / retail SME merchant being financed
// against their daily POS-acquirer settlements (A11 · POS-Receivables MCA
// from the strategy doc, re-positioned as P3 in the live prototype slot).
//
//   intro      → Merchant landing on Mal · "We finance against daily card sales"
//   onboard    → 4-step connect (UAE PASS · POS acquirers · bank · accounting)
//   underwrite → Decisioning engine pulls 7 features · composite score · tier
//   offer      → 3 preset offer tiers side-by-side · Shopify/Square pattern
//   disburse   → e-sign · DDM · AANI instant transfer · funds in account
//   live       → Daily-sweep dashboard · day-dial scrubber · top-up at 50%
//
// Three-pane layout:
//   Left phone:  the merchant (F&B operator, "Saffron Kitchen")
//   Right phone: connected data feed (POS · bank · VAT) — what Mal reads
//   Centre:      Mal ops column · phase ledger · underwriting · offer math
//
// Single external party (the merchant) — the right phone is data feeds,
// not a counterparty. This is the architectural difference vs P1 and P2.
//
// Seeded hero merchant:
//   Saffron Kitchen — 3 outlets in Dubai (JLT · Business Bay · Dubai Marina)
//   12-mo POS GMV ≈ AED 6.04M · Tier-A composite 84
//   Acquirers: Network International (60%) + NeoPay (40%)
//   Bank: ENBD via Lean Open Finance · Accounting: Zoho Books
//
// Reset behaviour: every page-load returns to phase 'intro' (matches P2).

const { useState: pS, useEffect: pE, useMemo: pM, useRef: pR } = React;

// ============================================================
// Data model · seeded F&B merchant "Saffron Kitchen"
// ============================================================

const MERCHANT = {
  name: 'Saffron Kitchen',
  legal: 'Saffron Kitchen Restaurants LLC',
  ownerName: 'Reem Al Suwaidi',
  outlets: ['JLT', 'Business Bay', 'Dubai Marina'],
  licence: { number: 'DED 1234567', regulator: 'DED Dubai', vintage: '38 mo' },
  vatTrn: '100123456789012',
  iban: 'AE07 0331 2345 6789 0123 456',
  bank: 'Emirates NBD',
  bankShort: 'ENBD',
  accountTail: '5421',
  posGmv12m: 6_040_000,     // AED, 12-mo gross merchant volume
  cardSharePct: 78,         // ~78% of revenue is card, rest cash/delivery
  avgDailySales: 16_550,    // AED per day total
  avgDailyCardSales: 12_910,// AED per day card (cardShare × avg)
  weeklyCV: 0.18,           // coefficient of variation, low volatility
  refundPct: 1.2,           // refund/chargeback %
  bankBufferAvg: 280_000,   // average operating balance AED
  vatHistoryOnTime: 4,      // last 4 quarters on time
};

const ACQUIRERS = [
  { id: 'ni',     name: 'Network International', short: 'NI',    share: 60, tone: '#1f54c8' },
  { id: 'neopay', name: 'Mashreq NeoPay',        short: 'NeoPay',share: 40, tone: '#0a8056' },
  { id: 'magnati',name: 'Magnati',               short: 'MAG',   share:  0, tone: '#b06a14' },
  { id: 'stripe', name: 'Stripe',                short: 'STR',   share:  0, tone: '#5a3aa3' },
  { id: 'telr',   name: 'Telr',                  short: 'TELR',  share:  0, tone: '#b8364b' },
  { id: 'checkout',name:'Checkout.com',          short: 'CKO',   share:  0, tone: '#7c5fb8' },
];

// 7-factor underwriting composite. Each row · label · weight · value · score
// out of 10 · pass/borderline/fail badge · source feed.
const UW_FACTORS = [
  { id: 'gmv',      label: '12-mo POS GMV',           weight: 25, value: 'AED 6.04M',  pts: 22, max: 25, badge: 'pass',       source: 'Acquirer (NI + NeoPay)' },
  { id: 'cv',       label: 'Weekly volatility (CV)',  weight: 15, value: '0.18',       pts: 14, max: 15, badge: 'pass',       source: 'POS feed · last 26 wk' },
  { id: 'refund',   label: 'Refund / chargeback',     weight: 10, value: '1.2%',       pts: 9,  max: 10, badge: 'pass',       source: 'POS feed' },
  { id: 'buffer',   label: 'Bank-balance buffer',     weight: 20, value: 'AED 280K avg', pts: 18, max: 20, badge: 'pass',     source: 'Lean (ENBD)' },
  { id: 'vat',      label: 'VAT paid · last 4 qtrs',  weight: 10, value: '4/4 on time', pts: 10, max: 10, badge: 'pass',      source: 'FTA · EmaraTax' },
  { id: 'sector',   label: 'Sector benchmark · F&B',  weight: 10, value: 'Top quartile',pts: 7,  max: 10, badge: 'borderline', source: 'Mal internal' },
  { id: 'licence',  label: 'Trade-licence vintage',   weight: 10, value: '38 mo',      pts: 9,  max: 10, badge: 'pass',       source: 'DED Dubai' },
];

const UW_COMPOSITE = UW_FACTORS.reduce((s, f) => s + f.pts, 0); // 89

const POS_RATE_CARD = [
  { tier: 'A', range: '80–100', advancePct: '100%', fee: '5.0%',  sweepPct: '12–18%', label: 'Top decile · Saffron Kitchen sits here' },
  { tier: 'B', range: '60–79',  advancePct: '80%',  fee: '5.5%',  sweepPct: '15–20%', label: 'Solid operator · standard pricing' },
  { tier: 'C', range: '40–59',  advancePct: '60%',  fee: '6.0%',  sweepPct: '12% cap',label: 'Conservative cap · coach to upgrade' },
];

// 3 preset offer tiers shown to a Tier-A merchant.
// Daily card sales × sweep% = daily sweep. Payoff ≈ (advance + fee) / sweep.
const OFFER_TIERS = [
  {
    id: 'conservative', amount: 250_000, feePct: 5.0, feeAmt: 12_500, sweepPct: 12,
    dailySweep: Math.round(MERCHANT.avgDailyCardSales * 0.12), // ~1,549
    payoffDays: Math.round((250_000 + 12_500) / (MERCHANT.avgDailyCardSales * 0.12)),
    label: 'Conservative', sub: 'Light sweep · slower payoff',
  },
  {
    id: 'balanced', amount: 400_000, feePct: 5.5, feeAmt: 22_000, sweepPct: 15, recommended: true,
    dailySweep: Math.round(MERCHANT.avgDailyCardSales * 0.15),
    payoffDays: Math.round((400_000 + 22_000) / (MERCHANT.avgDailyCardSales * 0.15)),
    label: 'Balanced', sub: 'Most operators pick this',
  },
  {
    id: 'aggressive', amount: 600_000, feePct: 6.0, feeAmt: 36_000, sweepPct: 18,
    dailySweep: Math.round(MERCHANT.avgDailyCardSales * 0.18),
    payoffDays: Math.round((600_000 + 36_000) / (MERCHANT.avgDailyCardSales * 0.18)),
    label: 'Aggressive', sub: 'Max headroom · 100% of monthly GMV',
  },
];

// 6 phases · floating dotnav + central narrative ledger
const POS_PHASES = [
  { id: 'intro',      label: 'Welcome' },
  { id: 'onboard',    label: 'Connect data' },
  { id: 'underwrite', label: 'Underwriting' },
  { id: 'offer',      label: 'Pre-approved offer' },
  { id: 'disburse',   label: 'Disbursal' },
  { id: 'live',       label: 'Live · Daily sweep' },
];

// Mal-perspective action ledger. Two rows per phase (Mal · merchant) since
// there is no second party — the acquirer / bank are data feeds.
const POS_PHASE_LEDGER = {
  intro: {
    mal:      'Awaiting inbound · merchant lands from acquirer referral or web',
    merchant: 'Reads the offer · clicks See if you qualify',
  },
  onboard: {
    mal:      'Pulls DED licence · streams POS + bank + VAT via APIs · zero PDF uploads',
    merchant: 'One-taps UAE PASS · picks acquirers · authorises Lean consent',
  },
  underwrite: {
    mal:      'Scores 7 factors in 90 sec · composite → tier → advance % + sweep band',
    merchant: 'Watches the engine score live · transparent decision-trail',
  },
  offer: {
    mal:      'Presents 3 tiers · prices each via base + advance + cost-of-funds + margin',
    merchant: 'Picks comfort level, not tenure · payoff is derived from sweep + sales',
  },
  disburse: {
    mal:      'e-Sign via UAE PASS · DDM via Lean · AANI instant rail · funds in 4 min',
    merchant: 'Watches AANI countdown · cash in operating account by 4 PM',
  },
  live: {
    mal:      'Daily sweep pre-payout · slow-week tolerance · top-up at 50% repaid',
    merchant: 'Sees today\'s sweep · cumulative repaid · projected payoff date',
  },
};

// 30-day rolling daily sales used by the day-dial scrubber. Weekly seasonality
// — Friday/Saturday peaks, Sunday/Monday troughs. AED card sales only.
const SALES_CURVE = (() => {
  const base = MERCHANT.avgDailyCardSales;
  // weekly multipliers · index 0 = Sun in UAE
  const weekMult = [0.78, 0.82, 0.92, 1.0, 1.04, 1.28, 1.18];
  const days = [];
  for (let d = 0; d < 210; d++) {
    const dow = d % 7;
    const drift = 1 + 0.04 * Math.sin(d / 14); // gentle bi-weekly drift
    // small noise via deterministic hash so the curve is reproducible
    const noise = 1 + ((Math.sin(d * 12.9898) * 43758.5453) % 1) * 0.05 - 0.025;
    days.push(Math.round(base * weekMult[dow] * drift * noise));
  }
  return days;
})();

function buildPosDefaultScenario() {
  return {
    phase: 'intro',
    // onboarding steps · 0..4 (uaepass · pos · bank · accounting · done)
    onboardStep: 0,
    connected: { uaepass: false, pos: false, bank: false, accounting: false },
    posPicked: ['ni', 'neopay'], // Network Int'l + NeoPay pre-selected
    bankPicked: 'enbd',
    accountingPicked: 'zoho',
    // underwriting animation
    uwRunning: false,
    uwFactorIdx: 0,   // 0..7 as factors light up
    uwDone: false,
    // offer selection
    selectedOfferIdx: 1, // default to balanced
    offerAccepted: false,
    // disbursal animation 0..4
    disburseStep: 0,
    funded: false,
    fundedAmount: 0,
    // live phase
    simDay: 0,
    topUpClaimed: false,
    showHardship: false,
    // top-up offer (when claimed)
    topUpAmount: 200_000,
  };
}

// ============================================================
// Top-level PosFinanceDemo component
// ============================================================

function PosFinanceDemo({ lang = 'en', isMobile }) {
  const isAr = lang === 'ar';
  const [scenario, setScenario] = pS(buildPosDefaultScenario);

  const patch = (partial) => setScenario((s) =>
    typeof partial === 'function' ? { ...s, ...partial(s) } : { ...s, ...partial });
  const setPhase = (p) => patch({ phase: p });
  const setSimDay = (d) => setScenario((s) => ({ ...s, simDay: Math.max(0, Math.min(SALES_CURVE.length - 1, d)) }));

  const phase = scenario.phase || 'intro';

  // Animated underwriting · factor pointer increments every 320ms while
  // uwRunning is true; ends at 7 then flips uwDone.
  pE(() => {
    if (!scenario.uwRunning) return;
    if (scenario.uwFactorIdx >= UW_FACTORS.length) {
      patch({ uwRunning: false, uwDone: true });
      return;
    }
    const t = setTimeout(() => patch((s) => ({ uwFactorIdx: s.uwFactorIdx + 1 })), 360);
    return () => clearTimeout(t);
  }, [scenario.uwRunning, scenario.uwFactorIdx]);

  // Disbursal animation · 4 steps, ~700ms apart
  pE(() => {
    if (phase !== 'disburse' || scenario.funded) return;
    if (scenario.disburseStep >= 4) {
      const amt = OFFER_TIERS[scenario.selectedOfferIdx].amount;
      patch({ funded: true, fundedAmount: amt });
      return;
    }
    const t = setTimeout(() => patch((s) => ({ disburseStep: s.disburseStep + 1 })), 720);
    return () => clearTimeout(t);
  }, [phase, scenario.disburseStep, scenario.funded]);

  // Live phase computed totals based on simDay + selected offer
  const liveTotals = pM(() => {
    const offer = OFFER_TIERS[scenario.selectedOfferIdx];
    const totalOwed = offer.amount + offer.feeAmt;
    let repaid = 0;
    for (let i = 0; i < scenario.simDay; i++) {
      const sales = SALES_CURVE[i] || 0;
      repaid += Math.round(sales * offer.sweepPct / 100);
    }
    repaid = Math.min(repaid, totalOwed);
    const outstanding = totalOwed - repaid;
    const todaySales = SALES_CURVE[scenario.simDay] || 0;
    const todaySweep = Math.round(todaySales * offer.sweepPct / 100);
    const pctRepaid = totalOwed === 0 ? 0 : Math.round(100 * repaid / totalOwed);
    return { offer, totalOwed, repaid, outstanding, todaySales, todaySweep, pctRepaid };
  }, [scenario.simDay, scenario.selectedOfferIdx]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {!isMobile && <PosTimelineSidebar phase={phase} setPhase={setPhase}/>}

      <div style={{
        display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 20,
        alignItems: 'flex-start', justifyContent: 'center',
        padding: isMobile ? '8px 12px 24px' : '20px 32px 0 32px',
        flexWrap: 'wrap',
      }}>
        <PosPhone side="merchant" title="Saffron Kitchen" sub="F&B · 3 outlets · Dubai" tone="lilac">
          {phase === 'intro'      && <MerchantIntro      isAr={isAr} onStart={() => setPhase('onboard')}/>}
          {phase === 'onboard'    && <MerchantOnboard    isAr={isAr} scenario={scenario} patch={patch} onDone={() => { patch({ uwRunning: true, uwFactorIdx: 0 }); setPhase('underwrite'); }}/>}
          {phase === 'underwrite' && <MerchantUnderwriting isAr={isAr} scenario={scenario} patch={patch} onContinue={() => setPhase('offer')}/>}
          {phase === 'offer'      && <MerchantOffer      isAr={isAr} scenario={scenario} patch={patch} onAccept={() => { patch({ offerAccepted: true, disburseStep: 0, funded: false }); setPhase('disburse'); }}/>}
          {phase === 'disburse'   && <MerchantDisburse   isAr={isAr} scenario={scenario} patch={patch} onLive={() => setPhase('live')}/>}
          {phase === 'live'       && <MerchantLive       isAr={isAr} scenario={scenario} patch={patch} liveTotals={liveTotals}/>}
        </PosPhone>

        {!isMobile && (
          <PosCentralOps
            scenario={scenario} phase={phase}
            setPhase={setPhase} setSimDay={setSimDay} patch={patch}
            liveTotals={liveTotals} isAr={isAr}
          />
        )}

        <PosPhone side="data" title="Connected data" sub="POS · Bank · VAT feed Mal reads" tone="sky">
          <DataFeedPhone scenario={scenario} liveTotals={liveTotals} phase={phase} isAr={isAr}/>
        </PosPhone>
      </div>

      <PosAboutStrip isAr={isAr}/>

      {scenario.showHardship && (
        <HardshipModal
          isAr={isAr}
          onClose={() => patch({ showHardship: false })}
          onPause={() => patch({ showHardship: false })}
        />
      )}
    </div>
  );
}

// ============================================================
// PosPhone · iPhone-frame wrapper, mirrors HcPanel from P2
// ============================================================
function PosPhone({ side, title, sub, tone, children }) {
  const iosFrame = window.IosFrame;
  const w = 380, h = 760;
  const label = side === 'merchant' ? 'ME' : 'DT';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flexShrink: 0 }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 999,
          background: tone === 'lilac' ? 'var(--mal-primary-50)' : 'rgba(31,84,200,0.16)',
          color: tone === 'lilac' ? 'var(--mal-primary)' : '#1f54c8',
          fontSize: 11, fontWeight: 700,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>{label}</div>
        <div>
          <div style={{ fontFamily: 'var(--mal-font-display)', fontStyle: 'italic', fontSize: 16 }}>{title}</div>
          <div style={{ fontSize: 10.5, color: 'var(--mal-mid)' }}>{sub}</div>
        </div>
      </div>
      {iosFrame
        ? React.createElement(iosFrame, { width: w, height: h, children })
        : <div style={{ width: w, height: h, borderRadius: 28, background: 'var(--mal-paper)', border: '1px solid var(--mal-line)', overflow: 'hidden' }}>{children}</div>}
    </div>
  );
}

// ============================================================
// MerchantIntro · landing screen on the left phone
// ============================================================
function MerchantIntro({ isAr, onStart }) {
  return (
    <div style={{
      height: '100%', minHeight: 740,
      display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #FAF7EE 0%, #EAF0FB 60%, #FAF7EE 100%)' }}/>
      <div className="mal-orb" style={{ position: 'absolute', top: 80, insetInlineEnd: -80, width: 320, height: 320, opacity: .5 }}/>
      <div style={{ flex: 1, padding: 36, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', position: 'relative', zIndex: 1 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 999,
          background: 'var(--mal-primary-50)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 24,
        }}>💳</div>
        <h1 style={{
          fontFamily: 'var(--mal-font-display)', fontStyle: 'italic',
          fontSize: 42, lineHeight: 1.05, margin: 0,
        }}>
          {isAr ? 'تمويل من ' : 'Cash today,'}<br/>
          <span style={{ background: 'linear-gradient(135deg, #1f54c8, #5a3aa3)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {isAr ? 'مبيعاتك اليومية.' : 'paid by tomorrow\'s sales.'}
          </span>
        </h1>
        <p style={{ fontSize: 14.5, color: 'var(--mal-mid)', marginTop: 16, lineHeight: 1.55, maxWidth: 320 }}>
          {isAr
            ? 'مال يقدّم لك سُلفة بناءً على مبيعات بطاقات نقاط البيع. يتم الخصم اليومي كنسبة من مبيعاتك — بدون أقساط ثابتة.'
            : 'Mal advances cash against your POS card sales. We sweep a small slice of each day\'s settlement — no fixed EMI, no missed-payment fees.'}
        </p>
        <div style={{ display: 'flex', gap: 14, marginTop: 22, fontSize: 11, color: 'var(--mal-mid)' }}>
          <div><strong style={{ color: 'var(--mal-ink)', fontSize: 14 }}>AED 1.2B</strong><br/>{isAr ? 'مُمَوَّل' : 'funded'}</div>
          <div><strong style={{ color: 'var(--mal-ink)', fontSize: 14 }}>240+</strong><br/>{isAr ? 'تاجر' : 'merchants'}</div>
          <div><strong style={{ color: 'var(--mal-ink)', fontSize: 14 }}>~4 hr</strong><br/>{isAr ? 'متوسط القرار' : 'avg decision'}</div>
        </div>
        <button onClick={onStart} style={{
          all: 'unset', cursor: 'pointer', textAlign: 'center',
          marginTop: 36, padding: '14px 0', borderRadius: 999,
          background: 'var(--mal-ink)', color: '#FAF7EE',
          fontSize: 15, fontWeight: 600,
        }}>{isAr ? 'تحقق من الأهلية ←' : 'See if you qualify →'}</button>
        <div style={{ fontSize: 10.5, color: 'var(--mal-mid)', marginTop: 14, textAlign: 'center' }}>
          {isAr ? '٩٠ ثانية · بدون رفع مستندات' : '90 sec · no document uploads'}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MerchantOnboard · 4-step connect wizard
// ============================================================
function MerchantOnboard({ isAr, scenario, patch, onDone }) {
  const step = scenario.onboardStep;
  const c = scenario.connected;
  const allDone = c.uaepass && c.pos && c.bank;  // accounting is optional

  const setStep = (n) => patch({ onboardStep: n });
  const connect = (k) => patch((s) => ({ connected: { ...s.connected, [k]: true } }));

  return (
    <div style={{ padding: 22, height: '100%', overflow: 'auto' }}>
      <div style={{ fontSize: 11, color: 'var(--mal-mid)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>
        {isAr ? 'الخطوة' : 'Step'} {Math.min(step + 1, 4)} / 4
      </div>
      <h2 style={{ fontFamily: 'var(--mal-font-display)', fontStyle: 'italic', fontSize: 22, margin: 0, marginBottom: 4 }}>
        {isAr ? 'اربط بياناتك' : 'Connect your data'}
      </h2>
      <div style={{ fontSize: 12, color: 'var(--mal-mid)', marginBottom: 18 }}>
        {isAr ? 'بدون رفع مستندات · ٩٠ ثانية' : 'No document uploads · ~90 seconds'}
      </div>

      <OnboardRow
        idx={1} active={step === 0} done={c.uaepass}
        title={isAr ? 'هوية إماراتية · UAE PASS' : 'UAE PASS · Emirates ID'}
        sub={isAr ? 'يجلب الرخصة التجارية ورقم VAT تلقائياً' : 'Auto-pulls trade licence + VAT TRN'}
        result={c.uaepass ? `${MERCHANT.licence.number} · TRN ${MERCHANT.vatTrn.slice(0, 8)}…` : null}
        onConnect={() => { connect('uaepass'); setStep(1); }}
        cta={isAr ? 'تسجيل بـ UAE PASS' : 'Sign in with UAE PASS'}
      />

      <OnboardRow
        idx={2} active={step === 1} done={c.pos}
        title={isAr ? 'اربط نقاط البيع' : 'Connect POS acquirer(s)'}
        sub={isAr ? 'Network International, NeoPay, Stripe, Telr...' : 'Network International, NeoPay, Magnati, Stripe, Telr, Checkout.com'}
        result={c.pos ? 'Network International ✓ · NeoPay ✓ · 12-mo GMV streamed' : null}
        onConnect={() => { connect('pos'); setStep(2); }}
        cta={isAr ? 'اربط نقاط البيع' : 'Connect POS'}
      >
        {step === 1 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
            {ACQUIRERS.map((a) => (
              <div key={a.id} style={{
                padding: '8px 10px', borderRadius: 10, border: '1px solid var(--mal-line)',
                background: scenario.posPicked.includes(a.id) ? 'var(--mal-primary-50)' : 'transparent',
                display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5,
                cursor: 'pointer',
              }} onClick={() => {
                patch((s) => ({ posPicked: s.posPicked.includes(a.id) ? s.posPicked.filter((x) => x !== a.id) : [...s.posPicked, a.id] }));
              }}>
                <div style={{ width: 20, height: 20, borderRadius: 5, background: a.tone, color: '#fff', fontSize: 9, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{a.short.slice(0, 2)}</div>
                <span>{a.name}</span>
                {scenario.posPicked.includes(a.id) && <span style={{ marginInlineStart: 'auto', color: 'var(--mal-primary)' }}>✓</span>}
              </div>
            ))}
          </div>
        )}
      </OnboardRow>

      <OnboardRow
        idx={3} active={step === 2} done={c.bank}
        title={isAr ? 'اربط الحساب البنكي' : 'Connect bank · Open Finance'}
        sub={isAr ? 'Lean / Tarabut · موافقة بلمسة واحدة' : 'Lean / Tarabut · one-tap consent'}
        result={c.bank ? `${MERCHANT.bank} · IBAN …${MERCHANT.accountTail} · 12-mo flows streamed` : null}
        onConnect={() => { connect('bank'); setStep(3); }}
        cta={isAr ? 'اربط البنك عبر Lean' : 'Authorise via Lean'}
      />

      <OnboardRow
        idx={4} active={step === 3} done={c.accounting}
        title={isAr ? 'اربط برنامج المحاسبة (اختياري)' : 'Connect accounting (optional)'}
        sub={isAr ? 'Zoho · QuickBooks · Xero' : 'Zoho Books · QuickBooks · Xero'}
        result={c.accounting ? 'Zoho Books · 2 yr ledger access' : null}
        onConnect={() => { connect('accounting'); setStep(4); }}
        cta={isAr ? 'اربط Zoho Books' : 'Connect Zoho Books'}
        skipLabel={isAr ? 'تخطّى' : 'Skip · proceed to underwriting'}
        onSkip={() => { setStep(4); }}
      />

      {allDone && (
        <button onClick={onDone} style={{
          all: 'unset', cursor: 'pointer', textAlign: 'center', display: 'block',
          marginTop: 18, padding: '14px 0', borderRadius: 999,
          background: 'var(--mal-ink)', color: '#FAF7EE',
          fontSize: 14, fontWeight: 600,
        }}>{isAr ? 'متابعة الاكتتاب ←' : 'Continue to underwriting →'}</button>
      )}
    </div>
  );
}

function OnboardRow({ idx, active, done, title, sub, result, onConnect, cta, children, skipLabel, onSkip }) {
  return (
    <div style={{
      padding: 12, borderRadius: 14, marginBottom: 10,
      border: '1px solid ' + (active ? 'var(--mal-primary)' : 'var(--mal-line)'),
      background: done ? '#F5FAF6' : (active ? 'var(--mal-paper)' : 'transparent'),
      opacity: done || active ? 1 : 0.55,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{
          width: 24, height: 24, borderRadius: 999,
          background: done ? '#0a8056' : 'var(--mal-line)',
          color: done ? '#fff' : 'var(--mal-mid)',
          fontSize: 11, fontWeight: 700,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>{done ? '✓' : idx}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{title}</div>
          <div style={{ fontSize: 11, color: 'var(--mal-mid)', marginTop: 2 }}>{sub}</div>
          {result && <div style={{ fontSize: 11, color: '#0a8056', marginTop: 6, fontFamily: 'var(--mal-font-mono)' }}>{result}</div>}
          {active && !done && (
            <>
              {children}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10 }}>
                <button onClick={onConnect} style={{
                  all: 'unset', cursor: 'pointer',
                  padding: '8px 16px', borderRadius: 999,
                  background: 'var(--mal-ink)', color: '#FAF7EE',
                  fontSize: 12, fontWeight: 600,
                }}>{cta}</button>
                {skipLabel && (
                  <button onClick={onSkip} style={{
                    all: 'unset', cursor: 'pointer', fontSize: 11, color: 'var(--mal-mid)', textDecoration: 'underline',
                  }}>{skipLabel}</button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MerchantUnderwriting · animated 7-factor scoring
// ============================================================
function MerchantUnderwriting({ isAr, scenario, patch, onContinue }) {
  const idx = scenario.uwFactorIdx;
  const done = scenario.uwDone;
  return (
    <div style={{ padding: 22, height: '100%', overflow: 'auto' }}>
      <div style={{ fontSize: 11, color: 'var(--mal-mid)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>
        {isAr ? 'الاكتتاب · مال' : 'Underwriting · Mal'}
      </div>
      <h2 style={{ fontFamily: 'var(--mal-font-display)', fontStyle: 'italic', fontSize: 22, margin: 0, marginBottom: 6 }}>
        {done ? (isAr ? 'تمت الموافقة' : 'You qualify') : (isAr ? 'جارٍ تقييم بياناتك...' : 'Scoring your business…')}
      </h2>
      <div style={{ fontSize: 12, color: 'var(--mal-mid)', marginBottom: 16 }}>
        {done ? (isAr ? '٧ عوامل · معدل مركّب ٨٩' : '7 factors · composite 89') : (isAr ? '٧ عوامل · ~٩٠ ثانية' : '7 factors · ~90 seconds')}
      </div>

      {UW_FACTORS.map((f, i) => {
        const reached = i < idx || done;
        return (
          <div key={f.id} style={{
            padding: 11, borderRadius: 10, marginBottom: 6,
            border: '1px solid var(--mal-line)',
            background: reached ? '#F5FAF6' : 'transparent',
            opacity: reached ? 1 : 0.4,
            transition: 'all 280ms ease',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
              <div style={{
                width: 18, height: 18, borderRadius: 999,
                background: reached ? '#0a8056' : 'var(--mal-line)',
                color: reached ? '#fff' : 'transparent',
                fontSize: 10, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}>{reached ? '✓' : ''}</div>
              <span style={{ flex: 1, fontWeight: 500 }}>{f.label}</span>
              {reached && <span style={{ fontSize: 11, fontFamily: 'var(--mal-font-mono)', color: 'var(--mal-mid)' }}>{f.value}</span>}
            </div>
            {reached && (
              <div style={{ fontSize: 10, color: 'var(--mal-mid)', marginTop: 4, marginInlineStart: 26 }}>
                {f.source} · {f.pts}/{f.max} pts
              </div>
            )}
          </div>
        );
      })}

      {done && (
        <>
          <div style={{
            marginTop: 16, padding: 14, borderRadius: 14,
            background: 'linear-gradient(135deg, #5a3aa3, #1f54c8)', color: '#FAF7EE',
          }}>
            <div style={{ fontSize: 11, opacity: 0.8, letterSpacing: 0.5 }}>{isAr ? 'النتيجة المركّبة' : 'Composite score'}</div>
            <div style={{ fontFamily: 'var(--mal-font-display)', fontStyle: 'italic', fontSize: 40, lineHeight: 1 }}>{UW_COMPOSITE}<span style={{ fontSize: 18, opacity: 0.7 }}>/100</span></div>
            <div style={{ fontSize: 12, marginTop: 6 }}>{isAr ? 'الفئة' : 'Tier'} <strong>A</strong> · {isAr ? 'العشرة الأعلى' : 'top decile'}</div>
          </div>
          <button onClick={onContinue} style={{
            all: 'unset', cursor: 'pointer', textAlign: 'center', display: 'block',
            marginTop: 14, padding: '14px 0', borderRadius: 999,
            background: 'var(--mal-ink)', color: '#FAF7EE',
            fontSize: 14, fontWeight: 600,
          }}>{isAr ? 'شاهد العرض ←' : 'See your offer →'}</button>
        </>
      )}
    </div>
  );
}

// ============================================================
// MerchantOffer · 3 tier cards · Shopify/Square pattern
// ============================================================
function MerchantOffer({ isAr, scenario, patch, onAccept }) {
  return (
    <div style={{ padding: 18, height: '100%', overflow: 'auto' }}>
      <div style={{ fontSize: 11, color: 'var(--mal-mid)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 }}>
        {isAr ? 'عرض مُعتمد مسبقاً' : 'Pre-approved offer'}
      </div>
      <h2 style={{ fontFamily: 'var(--mal-font-display)', fontStyle: 'italic', fontSize: 22, margin: 0, marginBottom: 4 }}>
        {isAr ? 'اختر مستوى الراحة' : 'Pick your comfort level'}
      </h2>
      <div style={{ fontSize: 11.5, color: 'var(--mal-mid)', marginBottom: 14, lineHeight: 1.5 }}>
        {isAr ? 'ليس مدة ثابتة — السداد يتكيّف مع مبيعاتك اليومية.' : 'Not a tenure — sweep adapts to your daily sales. Slow weeks pay less.'}
      </div>

      {OFFER_TIERS.map((t, i) => {
        const picked = scenario.selectedOfferIdx === i;
        return (
          <div key={t.id}
               onClick={() => patch({ selectedOfferIdx: i })}
               style={{
                 padding: 13, borderRadius: 14, marginBottom: 10,
                 border: '2px solid ' + (picked ? 'var(--mal-primary)' : 'var(--mal-line)'),
                 background: picked ? 'var(--mal-primary-50)' : 'var(--mal-paper)',
                 cursor: 'pointer', position: 'relative',
               }}>
            {t.recommended && (
              <div style={{
                position: 'absolute', top: -8, insetInlineStart: 12,
                background: '#0a8056', color: '#fff', fontSize: 9, fontWeight: 700,
                padding: '2px 8px', borderRadius: 999, letterSpacing: 0.5,
              }}>{isAr ? 'مُوصى به' : 'RECOMMENDED'}</div>
            )}
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 10.5, color: 'var(--mal-mid)', textTransform: 'uppercase', letterSpacing: 0.4 }}>{t.label}</div>
                <div style={{ fontFamily: 'var(--mal-font-display)', fontStyle: 'italic', fontSize: 28, lineHeight: 1 }}>
                  AED {(t.amount / 1000).toFixed(0)}K
                </div>
              </div>
              <div style={{ textAlign: 'end' }}>
                <div style={{ fontSize: 11, color: 'var(--mal-mid)' }}>{isAr ? 'الرسوم' : 'Fee'}</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>AED {(t.feeAmt / 1000).toFixed(1)}K <span style={{ color: 'var(--mal-mid)', fontWeight: 400 }}>({t.feePct.toFixed(1)}%)</span></div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 10, fontSize: 11, color: 'var(--mal-mid)' }}>
              <div><strong style={{ color: 'var(--mal-ink)' }}>{t.sweepPct}%</strong> {isAr ? 'من المبيعات' : 'of daily sales'}</div>
              <div>·</div>
              <div>{isAr ? 'سداد متوقع' : 'Expected payoff'} <strong style={{ color: 'var(--mal-ink)' }}>~{Math.round(t.payoffDays / 30)} {isAr ? 'شهر' : 'mo'}</strong></div>
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--mal-mid)', marginTop: 4, fontStyle: 'italic' }}>{t.sub}</div>
          </div>
        );
      })}

      <div style={{
        marginTop: 8, padding: '8px 12px', borderRadius: 999,
        background: 'rgba(31,84,200,0.08)', border: '1px dashed rgba(31,84,200,0.32)',
        fontSize: 11, color: 'var(--mal-mid)', textAlign: 'center',
      }}>
        {isAr ? 'متغيّر إسلامي (تورّق) — قريباً' : 'Sharia variant (Tawarruq / Murabaha) — coming soon'}
      </div>

      <button onClick={onAccept} style={{
        all: 'unset', cursor: 'pointer', textAlign: 'center', display: 'block',
        marginTop: 14, padding: '14px 0', borderRadius: 999,
        background: 'var(--mal-ink)', color: '#FAF7EE',
        fontSize: 14, fontWeight: 600,
      }}>
        {isAr ? `اقبل · AED ${(OFFER_TIERS[scenario.selectedOfferIdx].amount / 1000).toFixed(0)}K` : `Accept · AED ${(OFFER_TIERS[scenario.selectedOfferIdx].amount / 1000).toFixed(0)}K`}
      </button>
    </div>
  );
}

// ============================================================
// MerchantDisburse · 4-step disbursal animation
// ============================================================
function MerchantDisburse({ isAr, scenario, patch, onLive }) {
  const offer = OFFER_TIERS[scenario.selectedOfferIdx];
  const steps = [
    { en: 'e-Sign agreement via UAE PASS',          ar: 'توقيع إلكتروني عبر UAE PASS' },
    { en: 'Authorise daily-sweep mandate · Lean',   ar: 'تفويض الخصم اليومي · Lean' },
    { en: 'AANI instant transfer initiated',        ar: 'بدء التحويل الفوري · AANI' },
    { en: 'Funds in operating account',             ar: 'الأموال في الحساب التشغيلي' },
  ];

  return (
    <div style={{ padding: 22, height: '100%', overflow: 'auto' }}>
      <div style={{ fontSize: 11, color: 'var(--mal-mid)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>
        {isAr ? 'الصرف' : 'Disbursal'}
      </div>
      <h2 style={{ fontFamily: 'var(--mal-font-display)', fontStyle: 'italic', fontSize: 22, margin: 0, marginBottom: 4 }}>
        AED {(offer.amount / 1000).toFixed(0)}K
      </h2>
      <div style={{ fontSize: 12, color: 'var(--mal-mid)', marginBottom: 18 }}>
        {isAr ? 'إلى ' : 'To '}{MERCHANT.bank} •••{MERCHANT.accountTail} · {isAr ? 'فوري' : 'instant'}
      </div>

      {steps.map((s, i) => {
        const done = i < scenario.disburseStep;
        const active = i === scenario.disburseStep && !scenario.funded;
        return (
          <div key={i} style={{
            padding: 12, borderRadius: 10, marginBottom: 8,
            border: '1px solid ' + (done ? '#0a8056' : 'var(--mal-line)'),
            background: done ? '#F5FAF6' : (active ? 'var(--mal-paper)' : 'transparent'),
            opacity: done || active ? 1 : 0.4,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{
              width: 22, height: 22, borderRadius: 999,
              background: done ? '#0a8056' : (active ? 'var(--mal-primary)' : 'var(--mal-line)'),
              color: '#fff', fontSize: 11, fontWeight: 700,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>{done ? '✓' : (active ? <span className="mal-spin" style={{ width: 10, height: 10, borderRadius: 999, border: '2px solid #FAF7EE', borderTopColor: 'transparent', display: 'inline-block' }}/> : i + 1)}</div>
            <span style={{ fontSize: 13, fontWeight: 500 }}>{isAr ? s.ar : s.en}</span>
          </div>
        );
      })}

      {scenario.funded && (
        <>
          <div style={{
            marginTop: 16, padding: 14, borderRadius: 14,
            background: 'linear-gradient(135deg, #0a8056, #1f54c8)', color: '#FAF7EE',
          }}>
            <div style={{ fontSize: 11, opacity: 0.85 }}>✓ {isAr ? 'وصلت الأموال' : 'Funds landed'}</div>
            <div style={{ fontFamily: 'var(--mal-font-display)', fontStyle: 'italic', fontSize: 32, marginTop: 4 }}>AED {(offer.amount / 1000).toFixed(0)}K</div>
            <div style={{ fontSize: 11, opacity: 0.85, marginTop: 4 }}>{isAr ? 'إلى ' : 'To '}{MERCHANT.bank} •••{MERCHANT.accountTail} · WhatsApp ✓</div>
          </div>
          <button onClick={onLive} style={{
            all: 'unset', cursor: 'pointer', textAlign: 'center', display: 'block',
            marginTop: 14, padding: '14px 0', borderRadius: 999,
            background: 'var(--mal-ink)', color: '#FAF7EE',
            fontSize: 14, fontWeight: 600,
          }}>{isAr ? 'افتح لوحة التحكم ←' : 'Open dashboard →'}</button>
        </>
      )}
    </div>
  );
}

// ============================================================
// MerchantLive · daily-sweep dashboard
// ============================================================
function MerchantLive({ isAr, scenario, patch, liveTotals }) {
  const { offer, totalOwed, repaid, outstanding, todaySales, todaySweep, pctRepaid } = liveTotals;
  const topUpEligible = pctRepaid >= 50 && !scenario.topUpClaimed;

  const last7 = [];
  for (let i = Math.max(0, scenario.simDay - 6); i <= scenario.simDay; i++) {
    last7.push({ day: i, sales: SALES_CURVE[i] || 0, sweep: Math.round((SALES_CURVE[i] || 0) * offer.sweepPct / 100) });
  }
  const maxSales = Math.max(...last7.map((d) => d.sales)) || 1;

  return (
    <div style={{ padding: 18, height: '100%', overflow: 'auto' }}>
      <div style={{ fontSize: 11, color: 'var(--mal-mid)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>
        {isAr ? 'لوحة التاجر · اليوم ' : 'Merchant home · Day '}{scenario.simDay}
      </div>

      {/* today's sales + sweep */}
      <div style={{
        padding: 14, borderRadius: 14, marginBottom: 12,
        background: 'linear-gradient(135deg, #FAF7EE, #EAF0FB)',
        border: '1px solid var(--mal-line)',
      }}>
        <div style={{ fontSize: 11, color: 'var(--mal-mid)' }}>{isAr ? 'مبيعات اليوم' : 'Today\'s card sales'}</div>
        <div style={{ fontFamily: 'var(--mal-font-display)', fontStyle: 'italic', fontSize: 30, lineHeight: 1 }}>AED {todaySales.toLocaleString()}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 8, fontSize: 11.5 }}>
          <span style={{ color: 'var(--mal-mid)' }}>{isAr ? 'خصم مال' : 'Mal sweep'}</span>
          <strong style={{ fontSize: 14, color: 'var(--mal-ink)' }}>AED {todaySweep.toLocaleString()}</strong>
          <span style={{ color: 'var(--mal-mid)' }}>({offer.sweepPct}%)</span>
        </div>
      </div>

      {/* progress bar */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 6 }}>
          <span style={{ color: 'var(--mal-mid)' }}>{isAr ? 'مُسدّد' : 'Repaid'}</span>
          <span style={{ fontWeight: 600 }}>AED {repaid.toLocaleString()} / {totalOwed.toLocaleString()} <span style={{ color: 'var(--mal-mid)', fontWeight: 400 }}>({pctRepaid}%)</span></span>
        </div>
        <div style={{ height: 8, borderRadius: 999, background: 'var(--mal-line)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: pctRepaid + '%', background: 'linear-gradient(90deg, #1f54c8, #0a8056)', transition: 'width 300ms ease' }}/>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--mal-mid)', marginTop: 4 }}>
          <span>{isAr ? 'متبقّي AED ' : 'Outstanding AED '}{outstanding.toLocaleString()}</span>
          <span>{isAr ? 'سداد متوقع يوم ' : 'Payoff ~ day '}{Math.round((totalOwed - 0) / Math.max(1, offer.dailySweep))}</span>
        </div>
      </div>

      {/* last 7 days bar chart */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: 'var(--mal-mid)', marginBottom: 6 }}>{isAr ? 'آخر ٧ أيام' : 'Last 7 days'}</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 70 }}>
          {last7.map((d, idx) => (
            <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: '100%', borderRadius: 4,
                height: (d.sales / maxSales) * 50,
                background: 'linear-gradient(180deg, #5a3aa3, #1f54c8)',
                position: 'relative',
              }}>
                <div style={{
                  width: '100%', height: '24%', position: 'absolute', bottom: 0,
                  background: '#0a8056', borderBottomLeftRadius: 4, borderBottomRightRadius: 4,
                }}/>
              </div>
              <div style={{ fontSize: 9, color: 'var(--mal-mid)' }}>D{d.day}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 9, color: 'var(--mal-mid)', marginTop: 4 }}>{isAr ? '🟦 المبيعات · 🟩 الخصم' : '🟦 Sales · 🟩 Mal sweep'}</div>
      </div>

      {/* top-up offer at 50%+ */}
      {topUpEligible && (
        <div style={{
          padding: 14, borderRadius: 14,
          background: 'linear-gradient(135deg, #5a3aa3, #b8364b)', color: '#FAF7EE',
          marginBottom: 12,
        }}>
          <div style={{ fontSize: 11, opacity: 0.85, letterSpacing: 0.5, textTransform: 'uppercase' }}>{isAr ? 'عرض إضافي مُعتمد' : 'Top-up unlocked'}</div>
          <div style={{ fontFamily: 'var(--mal-font-display)', fontStyle: 'italic', fontSize: 22, marginTop: 4 }}>+ AED {(scenario.topUpAmount / 1000).toFixed(0)}K</div>
          <div style={{ fontSize: 11, opacity: 0.85, marginTop: 4 }}>{isAr ? 'سدّدت ٥٠٪+ · بضغطة واحدة، بدون موافقة جديدة' : 'You\'ve repaid 50%+ · one tap, no re-consent'}</div>
          <button onClick={() => patch({ topUpClaimed: true })} style={{
            all: 'unset', cursor: 'pointer', textAlign: 'center', display: 'block',
            marginTop: 10, padding: '10px 0', borderRadius: 999,
            background: '#FAF7EE', color: '#5a3aa3',
            fontSize: 13, fontWeight: 600,
          }}>{isAr ? 'استلم الزيادة' : 'Accept top-up'}</button>
        </div>
      )}

      {/* hardship CTA */}
      <button onClick={() => patch({ showHardship: true })} style={{
        all: 'unset', cursor: 'pointer', textAlign: 'center', display: 'block',
        padding: '11px 0', borderRadius: 999,
        background: 'transparent', color: 'var(--mal-mid)',
        border: '1px dashed var(--mal-line)',
        fontSize: 12,
      }}>{isAr ? 'إيقاف الخصم مؤقتاً (أسبوعان)' : 'Need a 14-day sweep pause?'}</button>
    </div>
  );
}

// ============================================================
// DataFeedPhone (right phone) · 3 stacked live feeds Mal reads from
// ============================================================
function DataFeedPhone({ scenario, liveTotals, phase, isAr }) {
  const c = scenario.connected;
  const posLive  = c.pos  || phase === 'underwrite' || phase === 'offer' || phase === 'disburse' || phase === 'live';
  const bankLive = c.bank || phase === 'underwrite' || phase === 'offer' || phase === 'disburse' || phase === 'live';
  const vatLive  = c.uaepass || phase === 'underwrite' || phase === 'offer' || phase === 'disburse' || phase === 'live';

  return (
    <div style={{ padding: 16, height: '100%', overflow: 'auto', background: '#F4F2EC' }}>
      <div style={{ fontSize: 10.5, color: 'var(--mal-mid)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 }}>
        {isAr ? 'موجزات API الحيّة' : 'Live API feeds'}
      </div>
      <div style={{ fontSize: 11, color: 'var(--mal-mid)', marginBottom: 14, lineHeight: 1.5 }}>
        {isAr ? 'ما يقرأه محرّك الاكتتاب في مال · في الوقت الحقيقي' : 'What Mal\'s underwriting engine reads · real-time'}
      </div>

      {/* POS feed */}
      <FeedCard
        title={isAr ? 'موجز نقاط البيع' : 'POS acquirer feed'}
        sub={posLive ? 'NI + NeoPay · streaming' : (isAr ? 'بانتظار الاتصال' : 'awaiting connect')}
        live={posLive}
      >
        {posLive ? <PosFeedBody simDay={scenario.simDay} phase={phase}/> : <FeedEmpty isAr={isAr}/>}
      </FeedCard>

      {/* Bank feed */}
      <FeedCard
        title={isAr ? 'موجز البنك · Lean' : 'Bank feed · Lean'}
        sub={bankLive ? 'ENBD · streaming' : (isAr ? 'بانتظار الموافقة' : 'awaiting consent')}
        live={bankLive}
      >
        {bankLive ? <BankFeedBody phase={phase} liveTotals={liveTotals}/> : <FeedEmpty isAr={isAr}/>}
      </FeedCard>

      {/* VAT / FTA feed */}
      <FeedCard
        title={isAr ? 'موجز VAT · FTA' : 'VAT feed · FTA EmaraTax'}
        sub={vatLive ? `TRN ${MERCHANT.vatTrn.slice(0, 8)}…` : (isAr ? 'بانتظار UAE PASS' : 'awaiting UAE PASS')}
        live={vatLive}
      >
        {vatLive ? <VatFeedBody isAr={isAr}/> : <FeedEmpty isAr={isAr}/>}
      </FeedCard>
    </div>
  );
}

function FeedCard({ title, sub, live, children }) {
  return (
    <div style={{
      marginBottom: 10, padding: 10, borderRadius: 12,
      background: 'var(--mal-paper)', border: '1px solid var(--mal-line)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <div style={{
          width: 6, height: 6, borderRadius: 999,
          background: live ? '#0a8056' : 'var(--mal-line)',
          boxShadow: live ? '0 0 0 3px rgba(10,128,86,0.18)' : 'none',
        }}/>
        <div style={{ fontSize: 11.5, fontWeight: 600 }}>{title}</div>
        <div style={{ fontSize: 9.5, color: 'var(--mal-mid)', marginInlineStart: 'auto', fontFamily: 'var(--mal-font-mono)' }}>{sub}</div>
      </div>
      {children}
    </div>
  );
}

function FeedEmpty({ isAr }) {
  return (
    <div style={{ fontSize: 11, color: 'var(--mal-mid)', fontStyle: 'italic', padding: '12px 4px' }}>
      {isAr ? 'لا تتدفّق أيّ بيانات بعد' : 'No data flowing yet…'}
    </div>
  );
}

// Last few card-acquirer transactions (deterministic seed)
function PosFeedBody({ simDay, phase }) {
  const seed = [
    { acq: 'NI',     term: 'POS-JLT-04',  amt: 184,  type: 'CARD',  time: '12:32' },
    { acq: 'NeoPay', term: 'POS-BBY-02',  amt: 412,  type: 'CARD',  time: '13:14' },
    { acq: 'NI',     term: 'POS-MAR-01',  amt: 96,   type: 'CARD',  time: '13:48' },
    { acq: 'NeoPay', term: 'POS-JLT-04',  amt: 268,  type: 'CARD',  time: '14:06' },
    { acq: 'NI',     term: 'POS-BBY-02',  amt: 144,  type: 'CARD',  time: '14:31' },
  ];
  return (
    <div style={{ fontSize: 10.5, fontFamily: 'var(--mal-font-mono)' }}>
      {seed.map((tx, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', borderTop: i === 0 ? 'none' : '1px dashed rgba(0,0,0,0.06)' }}>
          <span style={{ color: 'var(--mal-mid)', minWidth: 36 }}>{tx.time}</span>
          <span style={{
            padding: '1px 5px', borderRadius: 4, fontSize: 9, fontWeight: 700,
            background: tx.acq === 'NI' ? 'rgba(31,84,200,0.16)' : 'rgba(10,128,86,0.16)',
            color: tx.acq === 'NI' ? '#1f54c8' : '#0a8056',
          }}>{tx.acq}</span>
          <span style={{ color: 'var(--mal-mid)', flex: 1, fontSize: 10 }}>{tx.term}</span>
          <span style={{ fontWeight: 600 }}>AED {tx.amt}</span>
        </div>
      ))}
      {(phase === 'live' || phase === 'disburse') && (
        <div style={{ marginTop: 8, fontSize: 10, color: 'var(--mal-mid)' }}>
          {`Day ${simDay} · sweep applied pre-payout`}
        </div>
      )}
    </div>
  );
}

function BankFeedBody({ phase, liveTotals }) {
  const seed = [
    { date: 'Today',  desc: 'NI settlement', amt: 9_842,  dir: 'in' },
    { date: 'Today',  desc: 'NeoPay settle', amt: 6_481,  dir: 'in' },
    { date: '-1d',    desc: 'Salary run',    amt: -54_220,dir: 'out' },
    { date: '-2d',    desc: 'Supplier · Bakery',  amt: -8_400, dir: 'out' },
    { date: '-3d',    desc: 'NI settlement', amt: 11_204, dir: 'in' },
  ];
  return (
    <div style={{ fontSize: 10.5, fontFamily: 'var(--mal-font-mono)' }}>
      {seed.map((tx, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', borderTop: i === 0 ? 'none' : '1px dashed rgba(0,0,0,0.06)' }}>
          <span style={{ color: 'var(--mal-mid)', minWidth: 38 }}>{tx.date}</span>
          <span style={{ color: 'var(--mal-mid)', flex: 1, fontSize: 10 }}>{tx.desc}</span>
          <span style={{ fontWeight: 600, color: tx.dir === 'in' ? '#0a8056' : 'var(--mal-ink)' }}>
            {tx.dir === 'in' ? '+' : ''}AED {Math.abs(tx.amt).toLocaleString()}
          </span>
        </div>
      ))}
      {phase === 'live' && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--mal-line)', fontSize: 10, color: 'var(--mal-mid)' }}>
          {`Buffer ${MERCHANT.bankBufferAvg.toLocaleString()} · sweep coverage ${(MERCHANT.bankBufferAvg / Math.max(1, liveTotals.offer.dailySweep)).toFixed(0)}× daily`}
        </div>
      )}
    </div>
  );
}

function VatFeedBody({ isAr }) {
  const quarters = [
    { q: 'Q4 2025', status: 'Filed · on-time', tone: '#0a8056' },
    { q: 'Q3 2025', status: 'Filed · on-time', tone: '#0a8056' },
    { q: 'Q2 2025', status: 'Filed · on-time', tone: '#0a8056' },
    { q: 'Q1 2025', status: 'Filed · on-time', tone: '#0a8056' },
  ];
  return (
    <div style={{ fontSize: 10.5, fontFamily: 'var(--mal-font-mono)' }}>
      {quarters.map((q, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', borderTop: i === 0 ? 'none' : '1px dashed rgba(0,0,0,0.06)' }}>
          <span style={{ color: 'var(--mal-mid)', minWidth: 56 }}>{q.q}</span>
          <span style={{ color: q.tone, flex: 1 }}>{q.status}</span>
          <span style={{ color: '#0a8056' }}>✓</span>
        </div>
      ))}
      <div style={{ marginTop: 6, fontSize: 10, color: 'var(--mal-mid)' }}>
        {isAr ? 'تاريخ نظيف لـ ٤ أرباع' : '4 / 4 quarters clean · Mal weights this 10%'}
      </div>
    </div>
  );
}

// ============================================================
// PosCentralOps · central column with phase ledger + per-phase detail
// ============================================================
function PosCentralOps({ scenario, phase, setPhase, setSimDay, patch, liveTotals, isAr }) {
  const phaseIdx = POS_PHASES.findIndex((p) => p.id === phase);
  const ledger = POS_PHASE_LEDGER[phase] || POS_PHASE_LEDGER.intro;

  return (
    <div style={{
      flex: '1 1 360px', minWidth: 360, maxWidth: 540, alignSelf: 'stretch',
      display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 36,
    }}>
      {/* Top: phase indicator + ledger card */}
      <div style={{
        padding: 16, borderRadius: 14,
        background: 'var(--mal-paper)', border: '1px solid var(--mal-line)',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: 'var(--mal-mid)', textTransform: 'uppercase', letterSpacing: 0.6 }}>
            {isAr ? 'مال · حركة المُشغّل' : 'Mal · operator ledger'}
          </div>
          <div style={{ fontFamily: 'var(--mal-font-mono)', fontSize: 11, color: 'var(--mal-mid)' }}>
            {String(phaseIdx + 1).padStart(2, '0')} / {String(POS_PHASES.length).padStart(2, '0')} · {POS_PHASES[phaseIdx].label}
          </div>
        </div>
        <LedgerRow tag="MAL"      tone="lilac" text={ledger.mal}/>
        <LedgerRow tag="MERCHANT" tone="ink"   text={ledger.merchant}/>
      </div>

      {/* Per-phase detail content */}
      {phase === 'intro'      && <CentralIntro      isAr={isAr}/>}
      {phase === 'onboard'    && <CentralOnboard    isAr={isAr} scenario={scenario}/>}
      {phase === 'underwrite' && <CentralUnderwrite isAr={isAr} scenario={scenario}/>}
      {phase === 'offer'      && <CentralOffer      isAr={isAr} scenario={scenario}/>}
      {phase === 'disburse'   && <CentralDisburse   isAr={isAr} scenario={scenario}/>}
      {phase === 'live'       && <CentralLive       isAr={isAr} scenario={scenario} setSimDay={setSimDay} liveTotals={liveTotals}/>}
    </div>
  );
}

function LedgerRow({ tag, tone, text }) {
  const bg = tone === 'lilac' ? 'var(--mal-primary-50)' : 'rgba(0,0,0,0.06)';
  const col = tone === 'lilac' ? 'var(--mal-primary)' : 'var(--mal-ink)';
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '6px 0' }}>
      <div style={{
        padding: '2px 7px', borderRadius: 5, fontSize: 9, fontWeight: 700, letterSpacing: 0.5,
        background: bg, color: col, fontFamily: 'var(--mal-font-mono)',
        flexShrink: 0, marginTop: 2,
      }}>{tag}</div>
      <div style={{ fontSize: 12.5, lineHeight: 1.45, color: 'var(--mal-ink)' }}>{text}</div>
    </div>
  );
}

// --- per-phase central cards ---

function CentralIntro({ isAr }) {
  return (
    <div style={{
      padding: 16, borderRadius: 14,
      background: 'linear-gradient(135deg, #FAF7EE 0%, #EAF0FB 100%)',
      border: '1px solid var(--mal-line)',
    }}>
      <div style={{ fontSize: 11, color: 'var(--mal-mid)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>
        {isAr ? 'من وثيقة الاستراتيجية · A11' : 'From the strategy doc · A11'}
      </div>
      <div style={{ fontSize: 13.5, lineHeight: 1.55, fontStyle: 'italic', color: 'var(--mal-ink)' }}>
        {isAr
          ? '«الهدف: المطاعم، التجزئة، الصالونات، والعيادات بحجم شهري لنقاط البيع بين ٥٠٠ ألف و ١٥ مليون درهم. ٨٠-١٢٠٪ من حجم الشهر، تقسيم تسوية يومي، مدة ٦-١٢ شهر، تسعير ٢-٣٪ كل ٣٠ يوم.»'
          : '"Target: F&B, retail, salons, clinics with monthly POS volume AED 500K – 15M. Structure: 80–120% of monthly POS advance, daily settlement split, 6–12 month tenor, pricing 2–3% per 30 days."'}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        {ACQUIRERS.map((a) => (
          <div key={a.id} style={{
            padding: '4px 9px', borderRadius: 999, fontSize: 10.5,
            background: 'var(--mal-paper)', border: '1px solid var(--mal-line)',
            color: 'var(--mal-mid)', display: 'inline-flex', alignItems: 'center', gap: 5,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: a.tone }}/>
            {a.name}
          </div>
        ))}
      </div>
    </div>
  );
}

function CentralOnboard({ isAr, scenario }) {
  const c = scenario.connected;
  const rows = [
    { k: 'uaepass',    label: isAr ? 'UAE PASS · هوية إماراتية' : 'UAE PASS · Emirates ID', detail: c.uaepass ? `${MERCHANT.licence.number} · TRN auto` : '—' },
    { k: 'pos',        label: isAr ? 'نقاط البيع' : 'POS acquirers',                   detail: c.pos ? `${scenario.posPicked.length} acquirers · 12-mo GMV ${(MERCHANT.posGmv12m / 1e6).toFixed(1)}M` : '—' },
    { k: 'bank',       label: isAr ? 'البنك · Lean' : 'Bank · Lean Open Finance',         detail: c.bank ? `${MERCHANT.bank} · IBAN …${MERCHANT.accountTail}` : '—' },
    { k: 'accounting', label: isAr ? 'المحاسبة (اختياري)' : 'Accounting (optional)',    detail: c.accounting ? 'Zoho Books · 2-yr ledger' : (isAr ? 'تم التخطّي' : 'skipped (allowed)') },
  ];
  return (
    <div style={{
      padding: 14, borderRadius: 14,
      background: 'var(--mal-paper)', border: '1px solid var(--mal-line)',
    }}>
      <div style={{ fontSize: 11, color: 'var(--mal-mid)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>
        {isAr ? 'حالة الاتصال' : 'Connection status'}
      </div>
      {rows.map((r) => {
        const ok = !!c[r.k];
        return (
          <div key={r.k} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderTop: '1px dashed rgba(0,0,0,0.06)', fontSize: 12 }}>
            <div style={{
              width: 8, height: 8, borderRadius: 999,
              background: ok ? '#0a8056' : 'var(--mal-line)',
              boxShadow: ok ? '0 0 0 3px rgba(10,128,86,0.16)' : 'none',
              flexShrink: 0,
            }}/>
            <span style={{ flex: 1 }}>{r.label}</span>
            <span style={{ fontFamily: 'var(--mal-font-mono)', fontSize: 10.5, color: 'var(--mal-mid)' }}>{r.detail}</span>
          </div>
        );
      })}
    </div>
  );
}

function CentralUnderwrite({ isAr, scenario }) {
  const idx = scenario.uwFactorIdx;
  const done = scenario.uwDone;
  return (
    <>
      <div style={{
        padding: 14, borderRadius: 14,
        background: 'var(--mal-paper)', border: '1px solid var(--mal-line)',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: 'var(--mal-mid)', textTransform: 'uppercase', letterSpacing: 0.6 }}>
            {isAr ? 'محرّك القرار · ٧ عوامل' : 'Decisioning engine · 7 factors'}
          </div>
          {done && <div style={{ fontSize: 11, fontFamily: 'var(--mal-font-mono)' }}>{UW_COMPOSITE}/100 · Tier A</div>}
        </div>
        {UW_FACTORS.map((f, i) => {
          const reached = i < idx || done;
          return (
            <div key={f.id} style={{
              display: 'grid', gridTemplateColumns: '1fr 80px 56px 56px',
              alignItems: 'center', gap: 8, padding: '5px 0',
              borderTop: i === 0 ? 'none' : '1px dashed rgba(0,0,0,0.06)',
              opacity: reached ? 1 : 0.3, transition: 'opacity 220ms ease',
              fontSize: 11.5,
            }}>
              <div>{f.label} <span style={{ color: 'var(--mal-mid)', fontSize: 10 }}>· {f.source}</span></div>
              <div style={{ fontFamily: 'var(--mal-font-mono)', fontSize: 10.5, color: 'var(--mal-mid)' }}>{f.value}</div>
              <div style={{
                padding: '1px 5px', borderRadius: 4, fontSize: 9, fontWeight: 700, textAlign: 'center',
                background: f.badge === 'pass' ? 'rgba(10,128,86,0.16)' : (f.badge === 'borderline' ? 'rgba(176,106,20,0.16)' : 'rgba(184,54,75,0.16)'),
                color:      f.badge === 'pass' ? '#0a8056'              : (f.badge === 'borderline' ? '#b06a14'              : '#b8364b'),
              }}>{f.badge.toUpperCase().slice(0, 4)}</div>
              <div style={{ textAlign: 'end', fontFamily: 'var(--mal-font-mono)', fontSize: 10.5 }}>{f.pts}<span style={{ color: 'var(--mal-mid)' }}>/{f.max}</span> · {f.weight}%</div>
            </div>
          );
        })}
      </div>

      {/* Rate card */}
      <div style={{
        padding: 14, borderRadius: 14,
        background: 'var(--mal-paper)', border: '1px solid var(--mal-line)',
      }}>
        <div style={{ fontSize: 11, color: 'var(--mal-mid)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>
          {isAr ? 'بطاقة الأسعار' : 'Rate card · tier → advance % · fee · sweep band'}
        </div>
        {POS_RATE_CARD.map((r) => (
          <div key={r.tier} style={{
            display: 'grid', gridTemplateColumns: '40px 80px 80px 80px 1fr',
            gap: 8, alignItems: 'center', padding: '6px 0',
            borderTop: r.tier === 'A' ? 'none' : '1px dashed rgba(0,0,0,0.06)',
            background: r.tier === 'A' ? 'rgba(10,128,86,0.08)' : 'transparent',
            borderRadius: r.tier === 'A' ? 6 : 0, paddingInline: r.tier === 'A' ? 8 : 0,
            fontSize: 11.5,
          }}>
            <div style={{ fontFamily: 'var(--mal-font-display)', fontStyle: 'italic', fontSize: 18, fontWeight: 700 }}>{r.tier}</div>
            <div style={{ fontFamily: 'var(--mal-font-mono)', fontSize: 10.5 }}>{r.range}</div>
            <div style={{ fontFamily: 'var(--mal-font-mono)', fontSize: 10.5 }}>{r.advancePct}</div>
            <div style={{ fontFamily: 'var(--mal-font-mono)', fontSize: 10.5 }}>{r.fee} / {r.sweepPct}</div>
            <div style={{ fontSize: 10.5, color: 'var(--mal-mid)' }}>{r.label}</div>
          </div>
        ))}
      </div>
    </>
  );
}

function CentralOffer({ isAr, scenario }) {
  const offer = OFFER_TIERS[scenario.selectedOfferIdx];
  // SHAP-style top contributors
  const contributors = [
    { label: 'Bank-balance buffer · 20%', pct: 90 },
    { label: '12-mo POS GMV · 25%',       pct: 88 },
    { label: 'Low weekly volatility · 15%', pct: 93 },
  ];
  // pricing math
  const baseRate = 2.0;
  const advanceLoad = 1.5;
  const cof = 1.5;
  const margin = offer.feePct - baseRate - advanceLoad - cof;

  return (
    <>
      <div style={{
        padding: 14, borderRadius: 14,
        background: 'var(--mal-paper)', border: '1px solid var(--mal-line)',
      }}>
        <div style={{ fontSize: 11, color: 'var(--mal-mid)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>
          {isAr ? 'تفسير القرار · أعلى مساهمين' : 'Decision explainer · top contributors'}
        </div>
        {contributors.map((c) => (
          <div key={c.label} style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 3 }}>
              <span>{c.label}</span>
              <span style={{ fontFamily: 'var(--mal-font-mono)', color: 'var(--mal-mid)' }}>{c.pct}%</span>
            </div>
            <div style={{ height: 5, borderRadius: 999, background: 'var(--mal-line)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: c.pct + '%', background: 'linear-gradient(90deg, #1f54c8, #5a3aa3)' }}/>
            </div>
          </div>
        ))}
        <div style={{ fontSize: 10.5, color: 'var(--mal-mid)', marginTop: 8, fontStyle: 'italic' }}>
          {isAr ? '✓ هذه العوامل الثلاثة تشكّل ٧٤٪ من الموافقة. الباقي يأتي من VAT والقطاع والرخصة.' : '✓ These three explain ~74% of the approval. The rest comes from VAT history, sector, and licence vintage.'}
        </div>
      </div>

      <div style={{
        padding: 14, borderRadius: 14,
        background: 'var(--mal-paper)', border: '1px solid var(--mal-line)',
      }}>
        <div style={{ fontSize: 11, color: 'var(--mal-mid)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>
          {isAr ? 'تفكيك التسعير' : 'Pricing breakdown · ' + offer.label}
        </div>
        <PriceRow label={isAr ? 'سعر الأساس · مرجع تكلفة الأموال' : 'Base rate (cost-of-funds anchor)'}     val={baseRate.toFixed(1) + '%'}/>
        <PriceRow label={isAr ? 'حمل سُلفة المبيعات' : 'Sales-advance load (advance %)'}                    val={'+' + advanceLoad.toFixed(1) + '%'}/>
        <PriceRow label={isAr ? 'تكلفة العمليات · جمع يومي' : 'Ops cost (daily sweep + reconciliation)'}     val={'+' + cof.toFixed(1) + '%'}/>
        <PriceRow label={isAr ? 'هامش مال' : 'Mal margin'}                                                    val={'+' + margin.toFixed(1) + '%'} strong/>
        <PriceRow label={isAr ? 'الإجمالي · رسوم العرض' : 'Total · offer fee'}                                val={offer.feePct.toFixed(1) + '%'} total/>
        <div style={{ fontSize: 10.5, color: 'var(--mal-mid)', marginTop: 6, fontStyle: 'italic' }}>
          {isAr ? '✓ AED ' + offer.feeAmt.toLocaleString() + ' رسم ثابت · لا فوائد مركّبة' : '✓ AED ' + offer.feeAmt.toLocaleString() + ' fixed fee · no compounding interest'}
        </div>
      </div>
    </>
  );
}

function PriceRow({ label, val, strong, total }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', padding: '5px 0',
      borderTop: total ? '1px solid var(--mal-line)' : '1px dashed rgba(0,0,0,0.06)',
      marginTop: total ? 6 : 0, paddingTop: total ? 8 : 5,
      fontSize: total ? 13 : 11.5,
      fontWeight: total ? 700 : (strong ? 600 : 400),
    }}>
      <span>{label}</span>
      <span style={{ fontFamily: 'var(--mal-font-mono)' }}>{val}</span>
    </div>
  );
}

function CentralDisburse({ isAr, scenario }) {
  const offer = OFFER_TIERS[scenario.selectedOfferIdx];
  return (
    <div style={{
      padding: 14, borderRadius: 14,
      background: 'var(--mal-paper)', border: '1px solid var(--mal-line)',
    }}>
      <div style={{ fontSize: 11, color: 'var(--mal-mid)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>
        {isAr ? 'خط زمن الصرف' : 'Disbursal timeline · target T+4 min'}
      </div>
      {[
        { t: '00:00', en: 'Offer accepted',                           ar: 'تم قبول العرض' },
        { t: '00:18', en: 'UAE PASS e-sign captured',                 ar: 'تم التوقيع الإلكتروني' },
        { t: '00:54', en: 'Lean DDM mandate installed at ENBD',       ar: 'تركيب تفويض الخصم في ENBD' },
        { t: '02:21', en: 'AANI instant transfer · in flight',        ar: 'تحويل AANI الفوري قيد التنفيذ' },
        { t: '04:08', en: `Funds confirmed in IBAN …${MERCHANT.accountTail}`, ar: `تأكيد الأموال في IBAN …${MERCHANT.accountTail}` },
      ].map((row, i) => {
        const reached = i < scenario.disburseStep + 1 || scenario.funded;
        return (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0',
            borderTop: i === 0 ? 'none' : '1px dashed rgba(0,0,0,0.06)',
            opacity: reached ? 1 : 0.35,
          }}>
            <span style={{ fontFamily: 'var(--mal-font-mono)', fontSize: 10.5, minWidth: 46, color: 'var(--mal-mid)' }}>{row.t}</span>
            <span style={{
              width: 7, height: 7, borderRadius: 999,
              background: reached ? '#0a8056' : 'var(--mal-line)',
            }}/>
            <span style={{ fontSize: 12 }}>{isAr ? row.ar : row.en}</span>
          </div>
        );
      })}
      {scenario.funded && (
        <div style={{ marginTop: 10, padding: 10, borderRadius: 10, background: '#F5FAF6', fontSize: 11, color: '#0a8056' }}>
          ✓ AED {offer.amount.toLocaleString()} {isAr ? 'صُرفت · ' : 'disbursed · '}
          {isAr ? 'تفويض السحب اليومي ' : 'daily-sweep mandate '}
          <strong>{offer.sweepPct}%</strong> {isAr ? 'مفعّل' : 'live'}
        </div>
      )}
    </div>
  );
}

function CentralLive({ isAr, scenario, setSimDay, liveTotals }) {
  const { offer, totalOwed, repaid, outstanding, todaySales, todaySweep, pctRepaid } = liveTotals;
  const stops = [0, 14, 30, 60, 90, 120, 150, 180];
  return (
    <>
      {/* day-dial scrubber */}
      <div style={{
        padding: 14, borderRadius: 14,
        background: 'var(--mal-paper)', border: '1px solid var(--mal-line)',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: 'var(--mal-mid)', textTransform: 'uppercase', letterSpacing: 0.6 }}>
            {isAr ? 'تقدّم الزمن · يوم ' : 'Time scrubber · day '}{scenario.simDay}
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--mal-mid)' }}>{pctRepaid}% {isAr ? 'مُسدّد' : 'repaid'}</div>
        </div>
        <input
          type="range" min={0} max={SALES_CURVE.length - 1} value={scenario.simDay}
          onChange={(e) => setSimDay(parseInt(e.target.value, 10))}
          style={{ width: '100%' }}
        />
        <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
          {stops.map((d) => (
            <button key={d} onClick={() => setSimDay(d)} style={{
              all: 'unset', cursor: 'pointer',
              padding: '4px 10px', borderRadius: 999, fontSize: 10.5,
              background: scenario.simDay === d ? 'var(--mal-ink)' : 'transparent',
              color: scenario.simDay === d ? '#FAF7EE' : 'var(--mal-mid)',
              border: '1px solid ' + (scenario.simDay === d ? 'var(--mal-ink)' : 'var(--mal-line)'),
              fontFamily: 'var(--mal-font-mono)',
            }}>D{d}</button>
          ))}
        </div>
      </div>

      {/* sweep timeline · sales line + sweep area */}
      <div style={{
        padding: 14, borderRadius: 14,
        background: 'var(--mal-paper)', border: '1px solid var(--mal-line)',
      }}>
        <div style={{ fontSize: 11, color: 'var(--mal-mid)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>
          {isAr ? 'مبيعات يومية · خصم مال' : 'Daily sales · Mal sweep'}
        </div>
        <SweepSparkline simDay={scenario.simDay} sweepPct={offer.sweepPct}/>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 12 }}>
          <PosStat label={isAr ? 'مبيعات اليوم' : 'Sales today'}  val={'AED ' + todaySales.toLocaleString()} tone="ink"/>
          <PosStat label={isAr ? 'خصم اليوم'   : 'Sweep today'} val={'AED ' + todaySweep.toLocaleString()} tone="primary"/>
          <PosStat label={isAr ? 'متبقّي'      : 'Outstanding'}  val={'AED ' + outstanding.toLocaleString()} tone="green"/>
        </div>
      </div>

      {/* per-acquirer split */}
      <div style={{
        padding: 14, borderRadius: 14,
        background: 'var(--mal-paper)', border: '1px solid var(--mal-line)',
      }}>
        <div style={{ fontSize: 11, color: 'var(--mal-mid)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>
          {isAr ? 'تقسيم الخصم حسب المُكتسِب' : 'Sweep split · by acquirer'}
        </div>
        {ACQUIRERS.filter((a) => a.share > 0).map((a) => {
          const slice = Math.round(todaySweep * a.share / 100);
          return (
            <div key={a.id} style={{ marginBottom: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: a.tone }}/>
                  {a.name}
                </span>
                <span style={{ fontFamily: 'var(--mal-font-mono)', color: 'var(--mal-mid)' }}>{a.share}% · AED {slice.toLocaleString()}</span>
              </div>
              <div style={{ height: 4, borderRadius: 999, background: 'var(--mal-line)', overflow: 'hidden', marginTop: 3 }}>
                <div style={{ height: '100%', width: a.share + '%', background: a.tone }}/>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function PosStat({ label, val, tone }) {
  const bg = tone === 'primary' ? 'var(--mal-primary-50)' : (tone === 'green' ? '#F5FAF6' : 'rgba(0,0,0,0.04)');
  return (
    <div style={{ padding: 10, borderRadius: 10, background: bg }}>
      <div style={{ fontSize: 10, color: 'var(--mal-mid)', textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2, fontFamily: 'var(--mal-font-mono)' }}>{val}</div>
    </div>
  );
}

// 21-day rolling sparkline of sales + sweep, ending at simDay
function SweepSparkline({ simDay, sweepPct }) {
  const window = 21;
  const start = Math.max(0, simDay - window + 1);
  const slice = SALES_CURVE.slice(start, start + window);
  while (slice.length < window) slice.push(0);
  const max = Math.max(...slice) || 1;
  const w = 460, h = 80;
  const dx = w / (window - 1);
  const pts = slice.map((s, i) => `${(i * dx).toFixed(1)},${(h - (s / max) * h).toFixed(1)}`).join(' ');
  const sweepPts = slice.map((s, i) => `${(i * dx).toFixed(1)},${(h - ((s * sweepPct / 100) / max) * h).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 80 }}>
      <defs>
        <linearGradient id="posSweepGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0a8056" stopOpacity="0.35"/>
          <stop offset="100%" stopColor="#0a8056" stopOpacity="0"/>
        </linearGradient>
      </defs>
      <polyline points={`0,${h} ${pts} ${w},${h}`} fill="rgba(31,84,200,0.16)" stroke="none"/>
      <polyline points={pts} fill="none" stroke="#1f54c8" strokeWidth="2"/>
      <polyline points={`0,${h} ${sweepPts} ${w},${h}`} fill="url(#posSweepGrad)" stroke="none"/>
      <polyline points={sweepPts} fill="none" stroke="#0a8056" strokeWidth="1.5"/>
    </svg>
  );
}

// ============================================================
// HardshipModal · 14-day sweep pause CTA
// ============================================================
function HardshipModal({ isAr, onClose, onPause }) {
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 20,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: 'var(--mal-paper)', borderRadius: 18,
        padding: 24, maxWidth: 460, width: '100%',
      }}>
        <h3 style={{ fontFamily: 'var(--mal-font-display)', fontStyle: 'italic', fontSize: 22, margin: 0, marginBottom: 8 }}>
          {isAr ? 'إيقاف الخصم مؤقتاً' : 'Pause your sweep · 14 days'}
        </h3>
        <p style={{ fontSize: 13, color: 'var(--mal-mid)', lineHeight: 1.5 }}>
          {isAr
            ? 'إذا كانت لديك أسبوع بطيء أو ضغط مؤقت، يمكننا إيقاف الخصم اليومي لمدة ١٤ يوماً. المدّة تطول بنفس عدد الأيام — لا رسوم إضافية، لا تأثير على السجل الائتماني.'
            : 'If you\'re having a slow stretch, we can pause the daily sweep for 14 days. Your payoff date slides by the same amount — no extra fees, no AECB hit. You can pause once per loan cycle.'}
        </p>
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button onClick={onPause} style={{
            all: 'unset', cursor: 'pointer', flex: 1, textAlign: 'center',
            padding: '12px 0', borderRadius: 999, background: 'var(--mal-ink)', color: '#FAF7EE', fontSize: 13, fontWeight: 600,
          }}>{isAr ? 'إيقاف لمدة ١٤ يوم' : 'Pause 14 days'}</button>
          <button onClick={onClose} style={{
            all: 'unset', cursor: 'pointer', padding: '12px 18px',
            borderRadius: 999, background: 'transparent', color: 'var(--mal-mid)',
            border: '1px solid var(--mal-line)', fontSize: 13,
          }}>{isAr ? 'إلغاء' : 'Cancel'}</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PosAboutStrip · footer explainer
// ============================================================
function PosAboutStrip({ isAr }) {
  return (
    <div style={{
      maxWidth: 1280, margin: '12px auto 24px', padding: '0 24px',
      display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14,
      fontSize: 12, color: 'var(--mal-mid)',
    }}>
      <AboutItem
        title={isAr ? 'لماذا الخصم اليومي؟' : 'Why daily sweep?'}
        body={isAr ? 'يتناسب مع تدفّقك النقدي — أسبوع بطيء = خصم أقل. لا فاتورة شهرية ضخمة في يوم سيّئ.' : 'Repayment scales with your daily card sales. Slow weeks pay less. No big monthly bill on a bad day.'}
      />
      <AboutItem
        title={isAr ? 'البيانات التي نقرؤها' : 'Data we read'}
        body={isAr ? 'حجم نقاط البيع · رصيد بنكي · سداد VAT · رخصة تجارية · معيار القطاع. صفر مستندات.' : 'POS GMV · bank buffer · VAT history · trade licence · sector benchmark. Zero document uploads.'}
      />
      <AboutItem
        title={isAr ? 'إعادة استلام' : 'Auto top-up'}
        body={isAr ? 'عند سداد ٥٠٪، يصلك عرض زيادة قابل للقبول بضغطة واحدة — لا حاجة لإعادة الاكتتاب.' : 'At 50% repaid, a top-up offer auto-appears. One tap, no fresh consent. Square/Shopify pattern.'}
      />
      <AboutItem
        title={isAr ? 'دفعة فورية' : 'Instant disbursal'}
        body={isAr ? 'AANI · إلى IBAN في غضون دقائق. تأكيد عبر واتساب + التطبيق.' : 'AANI instant rail to your IBAN in ~4 minutes. Confirmation via WhatsApp + in-app.'}
      />
    </div>
  );
}

function AboutItem({ title, body }) {
  return (
    <div style={{
      padding: 12, borderRadius: 10,
      background: 'var(--mal-paper)', border: '1px solid var(--mal-line)',
    }}>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--mal-ink)' }}>{title}</div>
      <div style={{ fontSize: 11.5, marginTop: 4, lineHeight: 1.5 }}>{body}</div>
    </div>
  );
}

// ============================================================
// PosTimelineSidebar · floating left-edge dotnav, mirrors P2's
// HcTimelineSidebar and P1's DemoTimelineSidebar.
// ============================================================
function PosTimelineSidebar({ phase, setPhase }) {
  const idx = POS_PHASES.findIndex((p) => p.id === phase);
  return (
    <nav className="mal-dotnav" aria-label="Phase navigation">
      {POS_PHASES.map((p, i) => {
        const active = i === idx;
        const past   = i < idx;
        const state = active ? 'active' : past ? 'past' : 'upcoming';
        const label = `${String(i + 1).padStart(2, '0')} · ${p.label}`;
        return (
          <button key={p.id}
                  onClick={() => setPhase(p.id)}
                  className={`mal-dotnav-btn mal-dotnav-${state}`}
                  data-label={label}
                  aria-label={label}/>
        );
      })}
    </nav>
  );
}

window.PosFinanceDemo = PosFinanceDemo;
