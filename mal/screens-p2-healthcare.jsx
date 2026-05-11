/* eslint-disable */
// Mal · P2 Healthcare Insurance Receivables Engine prototype.
//
// Mirrors the P1 Smart Invoice side-by-side demo pattern:
//   Left phone:  healthcare Provider (clinic / polyclinic / pharmacy)
//   Right phone: Insurance Settlement panel (multi-payer aggregated view)
//   Centre:      Mal Ops AI adjudication + day-dial for time-travel
//
// Demo behaviour at launch:
//   - One pre-seeded claims batch (12 claims across 6 UAE payers)
//   - Mal AI has already scored every claim (approval-prob, predicted cycle)
//   - Provider has accepted a blended 78% advance against the batch
//   - Scrub the day dial to watch each payer settle at its own cadence
//
// Hidden complexity covered in the UI:
//   - Per-claim adjudication score (predicted approval %)
//   - Per-payer settlement cycle (Daman 28d, Thiqa 35d, ADNIC 48d, AXA 58d,
//     BUPA 65d, MetLife 78d)
//   - Per-claim status: advanced → paid / rejected / resubmitted
//   - Reconciliation: insurer pays Mal → Mal nets advance+fee → remainder
//     wired to provider
//
// Designed for "in progress" status — the catalogue keeps P2 flagged as
// in-progress but the prototype mounts when the user picks it.

const { useState: hS, useEffect: hE, useMemo: hM, useRef: hR } = React;

// ============================================================
// Data model. Pre-seeded scenario with 12 claims across 6 payers.
// ============================================================

const PAYERS = {
  daman:   { name: 'Daman',   short: 'DAM', tone: '#1f54c8', cycle: 28, rejRate: 0.04 },
  thiqa:   { name: 'Thiqa',   short: 'THQ', tone: '#5a3aa3', cycle: 35, rejRate: 0.06 },
  adnic:   { name: 'ADNIC',   short: 'ADN', tone: '#b06a14', cycle: 48, rejRate: 0.09 },
  axa:     { name: 'AXA',     short: 'AXA', tone: '#0a8056', cycle: 58, rejRate: 0.07 },
  bupa:    { name: 'BUPA',    short: 'BUP', tone: '#b8364b', cycle: 65, rejRate: 0.05 },
  metlife: { name: 'MetLife', short: 'MET', tone: '#7c5fb8', cycle: 78, rejRate: 0.11 },
};

const DEFAULT_BATCH = {
  id: 'BATCH-2026-0042',
  provider: 'Crescent Medical Center',
  providerLicence: 'DHA-F-0042871',
  submittedDay: 0,
  totalFace: 0,
  claims: [
    { id: 'CLM-2026-1001', payer: 'daman',   patient: 'P. Hashmi',      procedure: 'Upper GI Endoscopy',   amount: 18500, score: 94, status: 'advanced' },
    { id: 'CLM-2026-1002', payer: 'daman',   patient: 'A. Khalid',      procedure: 'MRI · Lumbar Spine',   amount: 26000, score: 91, status: 'advanced' },
    { id: 'CLM-2026-1003', payer: 'daman',   patient: 'D. Roy',         procedure: 'Diabetes follow-up',   amount:  6500, score: 96, status: 'advanced' },
    { id: 'CLM-2026-1004', payer: 'thiqa',   patient: 'M. Saeed',       procedure: 'Cardiac stress test',  amount: 22000, score: 88, status: 'advanced' },
    { id: 'CLM-2026-1005', payer: 'thiqa',   patient: 'N. Al-Hashmi',   procedure: 'Paediatric ER visit',  amount:  8400, score: 95, status: 'advanced' },
    { id: 'CLM-2026-1006', payer: 'thiqa',   patient: 'T. Khalifa',     procedure: 'GP consult x3',        amount:  4800, score: 97, status: 'advanced' },
    { id: 'CLM-2026-1007', payer: 'adnic',   patient: 'R. Patel',       procedure: 'Orthopaedic surgery',  amount: 42000, score: 79, status: 'advanced' },
    { id: 'CLM-2026-1008', payer: 'adnic',   patient: 'K. Hussain',     procedure: 'Dental crown · 3 units', amount: 11000, score: 65, status: 'refer' },
    { id: 'CLM-2026-1009', payer: 'axa',     patient: 'S. Ali',         procedure: 'Maternity package',    amount: 31000, score: 82, status: 'advanced' },
    { id: 'CLM-2026-1010', payer: 'axa',     patient: 'M. Tanaka',      procedure: 'Physiotherapy x10',    amount: 15500, score: 86, status: 'advanced' },
    { id: 'CLM-2026-1011', payer: 'bupa',    patient: 'F. Yousef',      procedure: 'CT · Abdomen',         amount:  9200, score: 90, status: 'advanced' },
    { id: 'CLM-2026-1012', payer: 'metlife', patient: 'L. Chen',        procedure: 'Eye surgery · cataract', amount: 19500, score: 71, status: 'advanced' },
  ],
};
DEFAULT_BATCH.totalFace = DEFAULT_BATCH.claims.reduce((s, c) => s + c.amount, 0);

// Advance %: blended target 78% — high-score claims get up to 90%, lower-score get 60%.
function advancePctForClaim(score) {
  if (score >= 90) return 0.90;
  if (score >= 80) return 0.80;
  if (score >= 70) return 0.70;
  return 0.60;
}

function buildDefaultScenario() {
  return {
    simDay: 0,
    batch: DEFAULT_BATCH,
    paymentsByClaim: {},      // claimId → { paidOnDay, gross, fee, net }
    rejectionsByClaim: {},    // claimId → { rejectedOnDay, reason }
  };
}

// ============================================================
// Top-level Healthcare demo
// ============================================================

function HealthcareDemo({ lang = 'en', isMobile }) {
  const isAr = lang === 'ar';
  const [scenario, setScenario] = hS(buildDefaultScenario);

  const patch = (partial) => setScenario((s) => typeof partial === 'function' ? { ...s, ...partial(s) } : { ...s, ...partial });
  const setSimDay = (d) => setScenario((s) => ({ ...s, simDay: Math.max(0, Math.min(200, d)) }));

  // Derived: per-claim ETA = submission day + payer cycle.
  const claimStates = hM(() => {
    return scenario.batch.claims.map((c) => {
      const payer = PAYERS[c.payer];
      const etaDay = scenario.batch.submittedDay + payer.cycle;
      const paid = scenario.paymentsByClaim[c.id];
      const rejected = scenario.rejectionsByClaim[c.id];
      let computedStatus = c.status;
      if (paid) computedStatus = 'paid';
      else if (rejected) computedStatus = 'rejected';
      else if (scenario.simDay >= etaDay && c.status === 'advanced') computedStatus = 'due';
      return { ...c, etaDay, computedStatus, paid, rejected, payerObj: payer };
    });
  }, [scenario]);

  // Auto-settle claims whose ETA has passed (1% per-claim auto-reject rate
  // for "refer" claims; everything else pays out at ETA).
  hE(() => {
    const toSettle = claimStates.filter((c) => {
      return c.simDay >= c.etaDay
          && c.computedStatus !== 'paid' && c.computedStatus !== 'rejected'
          && c.status !== 'refer';
    });
    // intentionally not auto-settling here. The Insurer panel exposes a
    // "Run settlement" CTA so the user drives it manually.
  }, [scenario.simDay]);

  const totals = hM(() => {
    const advanced = claimStates.reduce((s, c) => c.status === 'advanced' ? s + c.amount * advancePctForClaim(c.score) : s, 0);
    const paid = claimStates.reduce((s, c) => c.paid ? s + c.paid.gross : s, 0);
    const rejected = claimStates.reduce((s, c) => c.rejected ? s + c.amount : s, 0);
    const outstanding = scenario.batch.totalFace - paid - rejected;
    return { advanced, paid, rejected, outstanding };
  }, [claimStates, scenario.batch.totalFace]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Phones row */}
      <div style={{
        display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 26,
        alignItems: 'flex-start', justifyContent: 'center',
        padding: isMobile ? '8px 12px 24px' : '20px 22px 0 90px',
        flexWrap: 'wrap',
      }}>
        <HcPanel side="provider" title="Provider SME" sub="Dr. Ahmed · Crescent Medical Center" tone="lilac">
          <HcProviderHome scenario={scenario} claimStates={claimStates} totals={totals} isAr={isAr}/>
        </HcPanel>

        {!isMobile && (
          <HcCentralOps
            scenario={scenario} setSimDay={setSimDay}
            claimStates={claimStates} totals={totals} patch={patch}
            isAr={isAr}
          />
        )}

        <HcPanel side="insurer" title="Insurance settlement" sub="Multi-payer · live cycle" tone="sky">
          <HcInsurerPanel scenario={scenario} claimStates={claimStates} totals={totals}
                          patch={patch} isAr={isAr}/>
        </HcPanel>
      </div>

      <HcAboutStrip isAr={isAr}/>
    </div>
  );
}

// ============================================================
// HcPanel: shared phone-frame wrapper. Identical pattern to DemoPanel
// from screens-demo-mode.jsx but kept self-contained so P2 can evolve
// independently.
// ============================================================
function HcPanel({ side, title, sub, tone, children }) {
  const iosFrame = window.IosFrame;
  const w = 380, h = 760;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flexShrink: 0 }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 999,
          background: tone === 'lilac' ? 'var(--mal-primary-50)' : 'rgba(31,84,200,0.16)',
          color: tone === 'lilac' ? 'var(--mal-primary)' : '#1f54c8',
          fontSize: 11, fontWeight: 700,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>{side === 'provider' ? 'PR' : 'IN'}</div>
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
// Provider home: limit hero, batch summary, per-claim ladder
// ============================================================
function HcProviderHome({ scenario, claimStates, totals, isAr }) {
  const { batch, simDay } = scenario;
  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="mal-caption">{isAr ? 'مرحباً، د. أحمد' : 'Hi, Dr. Ahmed'}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div className="mal-h1" style={{ marginTop: -4, fontSize: 24 }}>
          {isAr ? 'مركز كريسنت الطبي' : 'Crescent Medical Center'}
        </div>
        <span style={{ fontSize: 11, color: 'var(--mal-mid)', fontFamily: 'var(--mal-font-mono)' }}>
          Day {simDay}
        </span>
      </div>

      {/* Cash advance hero */}
      <div style={{
        padding: 14, borderRadius: 14,
        background: 'linear-gradient(135deg, #2A1F6F 0%, #1A1A28 100%)',
        color: '#fff', position: 'relative', overflow: 'hidden',
      }}>
        <div className="mal-orb" style={{ position: 'absolute', width: 200, height: 200, top: -90, insetInlineEnd: -80, opacity: .3 }}/>
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 10.5, opacity: .7, textTransform: 'uppercase', letterSpacing: '.06em' }}>
            {isAr ? 'سُلفة المطالبات · مُتاحة' : 'Claim advance · received'}
          </div>
          <div style={{ fontFamily: 'var(--mal-font-display)', fontStyle: 'italic', fontSize: 30, marginTop: 4 }}>
            AED {Math.round(totals.advanced).toLocaleString()}
          </div>
          <div style={{ fontSize: 11, opacity: .85, marginTop: 6 }}>
            {isAr
              ? `من إجمالي AED ${batch.totalFace.toLocaleString()} · بمتوسط ٧٨٪`
              : `of AED ${batch.totalFace.toLocaleString()} face · blended 78%`}
          </div>
          <div style={{
            marginTop: 10, display: 'flex', justifyContent: 'space-between',
            fontSize: 10.5, opacity: .8,
          }}>
            <span>{isAr ? 'مدفوع' : 'Settled'} AED {Math.round(totals.paid).toLocaleString()}</span>
            <span>{isAr ? 'متبقّي' : 'Pending'} AED {Math.round(totals.outstanding).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Batch metadata */}
      <div style={{
        padding: '10px 12px', borderRadius: 12,
        background: 'var(--mal-paper)', border: '1px solid var(--mal-line)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="mal-caption">{batch.id}</div>
          <span style={{
            fontSize: 9.5, padding: '2px 7px', borderRadius: 999,
            background: 'rgba(10,128,86,0.14)', color: '#0a8056',
            fontWeight: 700, letterSpacing: '.06em',
          }}>{isAr ? '✓ مُصدَّر · DHA' : '✓ DHA verified'}</span>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 6, fontSize: 11, color: 'var(--mal-mid)' }}>
          <span>{batch.claims.length} {isAr ? 'مطالبة' : 'claims'}</span>
          <span>·</span>
          <span>{Object.keys(claimStates.reduce((m, c) => ({ ...m, [c.payer]: 1 }), {})).length} {isAr ? 'شركة تأمين' : 'payers'}</span>
        </div>
      </div>

      {/* Claim ladder */}
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', color: 'var(--mal-mid)', textTransform: 'uppercase', marginTop: 4 }}>
        {isAr ? 'سُلم المطالبات' : 'Claim ladder'}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {claimStates.map((c) => (
          <ClaimRow key={c.id} claim={c} simDay={simDay} isAr={isAr}/>
        ))}
      </div>
    </div>
  );
}

function ClaimRow({ claim, simDay, isAr }) {
  const c = claim;
  const payer = c.payerObj;
  const advPct = advancePctForClaim(c.score);
  const status = c.computedStatus;
  const statusTone = status === 'paid' ? '#0a8056'
                  : status === 'rejected' ? '#b8364b'
                  : status === 'refer' ? '#b06a14'
                  : status === 'due' ? '#b06a14'
                  : 'var(--mal-mid)';
  const statusLabel = status === 'paid' ? (isAr ? 'مدفوعة' : 'Settled')
                    : status === 'rejected' ? (isAr ? 'مرفوضة' : 'Rejected')
                    : status === 'refer' ? (isAr ? 'إحالة' : 'Refer')
                    : status === 'due' ? (isAr ? 'مستحقة' : 'Due')
                    : (isAr ? 'مُسلَّفة' : 'Advanced');
  const daysToEta = c.etaDay - simDay;

  return (
    <div style={{
      padding: '8px 10px', borderRadius: 10,
      background: status === 'paid' ? 'var(--mal-success-bg)'
                : status === 'rejected' ? 'var(--mal-danger-bg)'
                : 'var(--mal-surface-2)',
      border: '1px solid var(--mal-line)',
      display: 'grid',
      gridTemplateColumns: '8px 1fr auto',
      gap: 8, alignItems: 'center',
    }}>
      <span style={{ width: 4, height: '100%', minHeight: 28, borderRadius: 999, background: payer.tone, display: 'block' }}/>
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontSize: 11.5, fontWeight: 600, color: 'var(--mal-ink)',
          display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
        }}>
          <span style={{
            fontFamily: 'var(--mal-font-mono)', fontSize: 9.5,
            padding: '1px 5px', borderRadius: 4,
            background: payer.tone + '18', color: payer.tone,
            fontWeight: 700,
          }}>{payer.name}</span>
          <span>{c.procedure}</span>
        </div>
        <div style={{ fontSize: 10, color: 'var(--mal-mid)', marginTop: 1 }}>
          {c.id} · {c.patient}
          {' · '}
          {isAr ? 'AI' : 'AI score'} <strong style={{ color: c.score >= 85 ? '#0a8056' : c.score >= 70 ? '#b06a14' : '#b8364b' }}>{c.score}</strong>
          {status === 'advanced' && daysToEta > 0 && ` · ${isAr ? `يستحق خلال ${daysToEta}ي` : `ETA ${daysToEta}d`}`}
          {status === 'paid' && ` · ${isAr ? `دُفع يوم ${c.paid.paidOnDay}` : `paid day ${c.paid.paidOnDay}`}`}
          {status === 'rejected' && c.rejected && ` · ${c.rejected.reason}`}
        </div>
      </div>
      <div style={{ textAlign: 'end' }}>
        <div style={{ fontSize: 12, fontWeight: 600, fontFamily: 'var(--mal-font-mono)' }}>
          AED {c.amount.toLocaleString()}
        </div>
        <div style={{ fontSize: 9.5, color: statusTone, fontWeight: 600 }}>
          {statusLabel}
          {status === 'advanced' && ` · ${(advPct * 100).toFixed(0)}%`}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Insurer settlement panel: per-payer rollup with "Run settlement"
// ============================================================
function HcInsurerPanel({ scenario, claimStates, totals, patch, isAr }) {
  const { simDay } = scenario;
  const byPayer = hM(() => {
    const m = {};
    claimStates.forEach((c) => {
      const key = c.payer;
      if (!m[key]) m[key] = { ...c.payerObj, claims: [], face: 0, paid: 0, due: 0 };
      m[key].claims.push(c);
      m[key].face += c.amount;
      if (c.paid) m[key].paid += c.paid.gross;
      if (c.computedStatus === 'due') m[key].due += c.amount;
    });
    return Object.values(m);
  }, [claimStates]);

  const runSettlement = (payerKey) => {
    const dueClaims = claimStates.filter((c) => c.payer === payerKey && c.computedStatus === 'due');
    if (dueClaims.length === 0) return;
    const newPayments = { ...scenario.paymentsByClaim };
    dueClaims.forEach((c) => {
      const fee = Math.round(c.amount * 0.025); // Mal's claim-finance fee = 2.5% of face
      newPayments[c.id] = { paidOnDay: simDay, gross: c.amount, fee, net: c.amount - fee };
    });
    patch({ paymentsByClaim: newPayments });
  };

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="mal-caption">{isAr ? 'تسوية شركات التأمين' : 'Insurance settlement'}</div>
      <div className="mal-h1" style={{ fontSize: 22, marginTop: -2 }}>
        {isAr ? '٦ شركات · ١٢ مطالبة' : '6 payers · 12 claims'}
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
        {[
          { lab: isAr ? 'إجمالي' : 'Face', val: 'AED ' + (scenario.batch.totalFace / 1000).toFixed(0) + 'K', tone: 'var(--mal-mid)' },
          { lab: isAr ? 'مسوّى' : 'Settled', val: 'AED ' + Math.round(totals.paid / 1000) + 'K', tone: '#0a8056' },
          { lab: isAr ? 'متبقّي' : 'Pending', val: 'AED ' + Math.round(totals.outstanding / 1000) + 'K', tone: '#b06a14' },
        ].map((k) => (
          <div key={k.lab} style={{
            padding: '8px 10px', borderRadius: 10,
            background: 'var(--mal-surface-2)', border: '1px solid var(--mal-line)',
          }}>
            <div style={{ fontSize: 9.5, color: 'var(--mal-mid-2)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{k.lab}</div>
            <div style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--mal-font-mono)', color: k.tone, marginTop: 2 }}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* Per-payer rollup */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {byPayer.map((p) => {
          const dueCount = p.claims.filter((c) => c.computedStatus === 'due').length;
          const paidCount = p.claims.filter((c) => c.computedStatus === 'paid').length;
          const rejectedCount = p.claims.filter((c) => c.computedStatus === 'rejected').length;
          const totalCount = p.claims.length;
          return (
            <div key={p.name} style={{
              padding: '10px 12px', borderRadius: 10,
              background: 'var(--mal-paper)',
              border: '1px solid var(--mal-line)',
              borderInlineStart: '3px solid ' + p.tone,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: p.tone }}>{p.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--mal-mid)', marginTop: 1 }}>
                    {totalCount} {isAr ? 'مطالبة' : 'claims'} · AED {(p.face / 1000).toFixed(1)}K · {isAr ? `دورة ${p.cycle}ي` : `cycle ${p.cycle}d`}
                  </div>
                </div>
                <div style={{ textAlign: 'end', fontSize: 10, color: 'var(--mal-mid)' }}>
                  {paidCount > 0 && <div style={{ color: '#0a8056', fontWeight: 600 }}>✓ {paidCount} {isAr ? 'مدفوعة' : 'paid'}</div>}
                  {dueCount > 0 && <div style={{ color: '#b06a14', fontWeight: 600 }}>⏱ {dueCount} {isAr ? 'مستحقة' : 'due'}</div>}
                  {rejectedCount > 0 && <div style={{ color: '#b8364b', fontWeight: 600 }}>✗ {rejectedCount} {isAr ? 'مرفوضة' : 'rejected'}</div>}
                </div>
              </div>
              {dueCount > 0 && (
                <button onClick={() => runSettlement(p.short.toLowerCase() === p.short ? p.short.toLowerCase() : Object.keys(PAYERS).find((k) => PAYERS[k].name === p.name))} style={{
                  all: 'unset', cursor: 'pointer',
                  marginTop: 8, padding: '5px 10px', borderRadius: 999,
                  background: p.tone, color: '#fff',
                  fontSize: 10.5, fontWeight: 600, letterSpacing: '.02em',
                  display: 'inline-block',
                }}>
                  {isAr ? `سوِّ ${dueCount} مطالبة الآن` : `Run settlement (${dueCount})`}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// Central Ops column: AI adjudication summary + day-dial scrubber
// ============================================================
function HcCentralOps({ scenario, setSimDay, claimStates, totals, patch, isAr }) {
  const { simDay, batch } = scenario;
  const avgScore = Math.round(claimStates.reduce((s, c) => s + c.score, 0) / claimStates.length);
  const refers = claimStates.filter((c) => c.status === 'refer').length;
  const advanced = claimStates.filter((c) => c.status === 'advanced' || c.computedStatus === 'paid').length;

  const cyclePills = [
    { day: 0,   label: 'Day 0',   sub: 'submit' },
    { day: 28,  label: 'Day 28',  sub: 'Daman' },
    { day: 35,  label: 'Day 35',  sub: 'Thiqa' },
    { day: 48,  label: 'Day 48',  sub: 'ADNIC' },
    { day: 58,  label: 'Day 58',  sub: 'AXA' },
    { day: 65,  label: 'Day 65',  sub: 'BUPA' },
    { day: 78,  label: 'Day 78',  sub: 'MetLife' },
  ];

  return (
    <div style={{
      width: 260, display: 'flex', flexDirection: 'column',
      alignItems: 'center', gap: 14, paddingTop: 40, flexShrink: 0,
    }}>
      {/* AI adjudication card */}
      <div style={{
        width: '100%', padding: 12, borderRadius: 14,
        background: 'var(--mal-paper)', border: '1px solid var(--mal-line)',
        textAlign: 'center',
      }}>
        <div className="mal-caption" style={{ color: 'var(--mal-primary)' }}>
          {isAr ? 'تقييم الذكاء الاصطناعي' : 'AI Adjudication'}
        </div>
        <div style={{
          fontFamily: 'var(--mal-font-display)', fontStyle: 'italic',
          fontSize: 28, lineHeight: 1, marginTop: 4,
        }}>
          {avgScore}<span style={{ fontSize: 12, color: 'var(--mal-mid)' }}>/100</span>
        </div>
        <div style={{ fontSize: 10, color: 'var(--mal-mid)', marginTop: 2 }}>
          {isAr ? 'متوسط الدرجة' : 'avg score'}
        </div>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6,
          marginTop: 10, fontSize: 10,
        }}>
          <div style={{ padding: 6, borderRadius: 8, background: 'rgba(10,128,86,0.10)', color: '#0a8056' }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{advanced}</div>
            <div>{isAr ? 'مُسلَّفة' : 'advanced'}</div>
          </div>
          <div style={{ padding: 6, borderRadius: 8, background: 'rgba(176,106,20,0.10)', color: '#b06a14' }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{refers}</div>
            <div>{isAr ? 'إحالة' : 'refer'}</div>
          </div>
        </div>
      </div>

      {/* Day dial */}
      <div style={{ textAlign: 'center' }}>
        <div className="mal-caption" style={{ color: 'var(--mal-mid)' }}>{isAr ? 'اليوم' : 'DAY'}</div>
        <div style={{
          fontFamily: 'var(--mal-font-display)', fontStyle: 'italic',
          fontSize: 56, lineHeight: 1, marginTop: 4,
        }}>{simDay}</div>
      </div>

      {/* Cycle pills */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }}>
        {cyclePills.map((p) => {
          const active = simDay === p.day;
          return (
            <button key={p.day} onClick={() => setSimDay(p.day)} style={{
              all: 'unset', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '6px 10px', borderRadius: 999,
              background: active ? 'var(--mal-ink)' : 'var(--mal-paper)',
              color: active ? '#FAF7EE' : 'var(--mal-ink-2)',
              border: '1px solid ' + (active ? 'var(--mal-ink)' : 'var(--mal-line)'),
              fontSize: 11.5, fontWeight: active ? 700 : 500,
              transition: 'background .15s, color .15s',
            }}>
              <span style={{ fontFamily: 'var(--mal-font-mono)' }}>{p.label}</span>
              <span style={{ fontSize: 10, opacity: 0.85 }}>{p.sub}</span>
            </button>
          );
        })}
      </div>

      {/* Activity log */}
      <div style={{
        width: '100%', padding: 10, borderRadius: 10,
        background: 'var(--mal-paper)', border: '1px solid var(--mal-line)',
        fontSize: 10.5, color: 'var(--mal-ink)',
      }}>
        <div className="mal-caption" style={{ color: 'var(--mal-mid)', marginBottom: 4 }}>
          {isAr ? 'النشاط' : 'Activity'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div>Day 0 · {isAr ? 'دفعة قُدّمت' : 'Batch submitted'}</div>
          <div>Day 0 · {isAr ? 'AI سجّل ١٢ مطالبة' : 'AI scored 12 claims'}</div>
          <div>Day 0 · {isAr ? `سُلفة ${Math.round(totals.advanced / 1000)}K مرّت` : `Advance AED ${Math.round(totals.advanced / 1000)}K wired`}</div>
          {totals.paid > 0 && <div style={{ color: '#0a8056' }}>Day {simDay} · {isAr ? `تسوية ${Math.round(totals.paid / 1000)}K` : `Settled AED ${Math.round(totals.paid / 1000)}K`}</div>}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// About-strip: same horizontal layout as P1's ExplainerDock
// ============================================================
function HcAboutStrip({ isAr }) {
  const parties = [
    { who: 'Provider', verb: 'Submits claim batch', outcome: '78% blended advance same day' },
    { who: 'Insurer',  verb: 'Settles claim',      outcome: 'Pays Mal at standard cycle (28-78d)' },
    { who: 'Mal',      verb: 'Scores + advances',  outcome: 'Nets advance + 2.5% fee, remits remainder' },
  ];
  const diffs = [
    'Multi-payer aggregation',
    'ML claim adjudication',
    'Same-day advance',
    'Resubmission recovery',
    'Sharia variant (Murabaha)',
  ];

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 22px 30px' }}>
      <div style={{
        padding: 16, borderRadius: 16,
        background: 'linear-gradient(135deg, #2A1F6F 0%, #1A1A28 100%)',
        color: '#fff', position: 'relative', overflow: 'hidden',
        display: 'grid', gridTemplateColumns: '0.95fr 1.05fr 1.4fr 0.9fr',
        gap: 18, alignItems: 'flex-start',
      }}>
        <div className="mal-orb" style={{
          position: 'absolute', width: 180, height: 180, top: -80,
          insetInlineEnd: -60, opacity: 0.32, pointerEvents: 'none',
        }}/>

        <div style={{ position: 'relative', minWidth: 0 }}>
          <div style={{ fontSize: 10, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>
            {isAr ? 'حول هذا المنتج' : 'About this product'}
          </div>
          <div style={{ fontFamily: 'var(--mal-font-display)', fontStyle: 'italic', fontSize: 20, lineHeight: 1.15 }}>
            Healthcare Receivables · Engine
          </div>
          <div style={{
            display: 'inline-block', fontSize: 9.5, padding: '2px 8px', borderRadius: 999,
            background: 'rgba(176,106,20,0.16)', color: '#f0b46e',
            border: '1px solid rgba(240,180,110,0.28)',
            marginTop: 6, fontWeight: 700, letterSpacing: '.06em',
          }}>IN PROGRESS</div>
        </div>

        <div style={{ position: 'relative', minWidth: 0 }}>
          <div style={{ fontSize: 10, opacity: 0.65, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>
            {isAr ? 'يحلّ' : 'Solves'}
          </div>
          <div style={{ fontSize: 11.5, lineHeight: 1.5, opacity: 0.92 }}>
            Clinics, polyclinics, dental groups and pharmacies wait 60–112 days for insurers to settle. That working-capital gap costs the UAE healthcare SME book billions a year. Mal advances on the receivable the day the claim is submitted.
          </div>
        </div>

        <div style={{ position: 'relative', minWidth: 0 }}>
          <div style={{ fontSize: 10, opacity: 0.65, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>
            {isAr ? 'الأطراف' : 'Parties'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {parties.map((p, i) => (
              <div key={i} style={{ fontSize: 11, lineHeight: 1.5 }}>
                <strong>{p.who}</strong>:
                <span style={{ opacity: 0.85 }}> {p.verb}</span>
                <span style={{ opacity: 0.6 }}> → {p.outcome}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ position: 'relative', minWidth: 0 }}>
          <div style={{ fontSize: 10, opacity: 0.65, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>
            {isAr ? 'الفروق' : 'Differentiators'}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {diffs.map((d, i) => (
              <span key={i} style={{
                fontSize: 10, padding: '2px 8px', borderRadius: 999,
                background: 'rgba(255,255,255,0.14)',
                border: '1px solid rgba(255,255,255,0.22)',
              }}>{d}</span>
            ))}
          </div>
        </div>

        <div style={{
          gridColumn: '1 / -1', position: 'relative',
          fontSize: 12, lineHeight: 1.55, opacity: 0.95,
          paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.12)',
        }}>
          Benchmark: Klaim (UAE) advances on single-payer claims; Cedar / Olive (US) do RCM but no advance. Mal aggregates across all 6+ UAE payers, scores every claim with ML before advance, and offers a Sharia (Murabaha-on-receivables) variant.
        </div>
      </div>
    </div>
  );
}

window.HealthcareDemo = HealthcareDemo;
