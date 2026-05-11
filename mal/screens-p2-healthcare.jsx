/* eslint-disable */
// Mal · P2 Healthcare Insurance Receivables Engine prototype.
//
// 4-phase journey mirroring the P1 Smart Invoice pattern:
//   intro    → Welcome screen on the provider phone, insurer passive
//   onboard  → 4-step provider KYB (DHA + UAE Pass · payer panel · bank)
//   batch    → Batch upload screen with AI processing animation
//   live     → Day-by-day claim settlement (provider home + insurer rollup)
//
// Three-pane layout:
//   Left phone:  healthcare Provider (clinic / polyclinic / pharmacy)
//   Right phone: Insurance Settlement panel (multi-payer aggregated view)
//   Centre:      Mal Ops phase ribbon + AI adjudication + day-dial scrubber
//
// Pre-seeded scenario at "live" phase:
//   - 12 claims worth AED 214,400 across 6 UAE payers
//   - AI scored every claim (60-100); blended 78% advance accepted
//   - Per-payer settlement cycles: Daman 28d, Thiqa 35d, ADNIC 48d,
//     AXA 58d, BUPA 65d, MetLife 78d
//
// Interactive surfaces:
//   - Phase ribbon at top of central column (jump anywhere)
//   - Day-dial pills (jump to any payer's settlement day)
//   - Per-payer "Run settlement" CTAs (advance time to that payer's cycle
//     then click to settle the due claims)
//   - Tap any claim row → drill-in modal with full claim detail,
//     ML denial-risk decomposition, edit + resubmit if refer/rejected.

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

const PAYER_KEYS_ORDER = ['daman', 'thiqa', 'adnic', 'axa', 'bupa', 'metlife'];

// Each claim carries a procedure code (ICD / CPT) and a short ML
// adjudication trace: top 3 features that drove the score.
const DEFAULT_BATCH = {
  id: 'BATCH-2026-0042',
  provider: 'Crescent Medical Center',
  providerLicence: 'DHA-F-0042871',
  submittedDay: 0,
  totalFace: 0,
  claims: [
    { id: 'CLM-2026-1001', payer: 'daman',   patient: 'P. Hashmi',    procedure: 'Upper GI Endoscopy',     cpt: '43235', amount: 18500, score: 94, status: 'advanced', risk: ['Coverage match 98%', 'Provider in-network', 'Pre-auth not required'] },
    { id: 'CLM-2026-1002', payer: 'daman',   patient: 'A. Khalid',    procedure: 'MRI · Lumbar Spine',     cpt: '72148', amount: 26000, score: 91, status: 'advanced', risk: ['Coverage match 95%', 'Pre-auth attached', 'No history of denial for this code'] },
    { id: 'CLM-2026-1003', payer: 'daman',   patient: 'D. Roy',       procedure: 'Diabetes follow-up',     cpt: '99214', amount:  6500, score: 96, status: 'advanced', risk: ['Coverage match 99%', 'Standard chronic-care visit', 'Patient policy active'] },
    { id: 'CLM-2026-1004', payer: 'thiqa',   patient: 'M. Saeed',     procedure: 'Cardiac stress test',    cpt: '93015', amount: 22000, score: 88, status: 'advanced', risk: ['Coverage match 92%', 'Pre-auth attached', 'Mild seasonal denial rate (Aug)'] },
    { id: 'CLM-2026-1005', payer: 'thiqa',   patient: 'N. Al-Hashmi', procedure: 'Paediatric ER visit',    cpt: '99284', amount:  8400, score: 95, status: 'advanced', risk: ['Coverage match 97%', 'ER under emergency rule', 'No prior denials this provider'] },
    { id: 'CLM-2026-1006', payer: 'thiqa',   patient: 'T. Khalifa',   procedure: 'GP consult x3',          cpt: '99213', amount:  4800, score: 97, status: 'advanced', risk: ['Coverage match 99%', 'Standard primary-care', 'Repeat patient'] },
    { id: 'CLM-2026-1007', payer: 'adnic',   patient: 'R. Patel',     procedure: 'Orthopaedic surgery',    cpt: '27447', amount: 42000, score: 79, status: 'advanced', risk: ['Coverage match 84%', 'High-value, payer often disputes anaesthesia line', 'Pre-auth ID on file'] },
    { id: 'CLM-2026-1008', payer: 'adnic',   patient: 'K. Hussain',   procedure: 'Dental crown · 3 units', cpt: 'D2740', amount: 11000, score: 65, status: 'refer',    risk: ['Coverage match 68%', 'Dental policy excludes 2 of 3 crowns', 'Resubmit with itemised line items'] },
    { id: 'CLM-2026-1009', payer: 'axa',     patient: 'S. Ali',       procedure: 'Maternity package',      cpt: '59400', amount: 31000, score: 82, status: 'advanced', risk: ['Coverage match 87%', 'Maternity rider active', 'Slight historic delay (~58d)'] },
    { id: 'CLM-2026-1010', payer: 'axa',     patient: 'M. Tanaka',    procedure: 'Physiotherapy x10',      cpt: '97110', amount: 15500, score: 86, status: 'advanced', risk: ['Coverage match 90%', 'Visit count below cap (10/20)', 'Standard rehab'] },
    { id: 'CLM-2026-1011', payer: 'bupa',    patient: 'F. Yousef',    procedure: 'CT · Abdomen',           cpt: '74170', amount:  9200, score: 90, status: 'advanced', risk: ['Coverage match 94%', 'Pre-auth attached', 'BUPA international rider'] },
    { id: 'CLM-2026-1012', payer: 'metlife', patient: 'L. Chen',      procedure: 'Eye surgery · cataract', cpt: '66984', amount: 19500, score: 71, status: 'advanced', risk: ['Coverage match 77%', 'Bilateral procedure flag', 'MetLife long cycle (78d historic)'] },
  ],
};
DEFAULT_BATCH.totalFace = DEFAULT_BATCH.claims.reduce((s, c) => s + c.amount, 0);

// Onboarding micro-steps for the provider phone.
const ONBOARD_STEPS = [
  { id: 'dha',     title: 'DHA licence',     sub: 'We pull your facility licence + provider IDs from the DHA registry.' },
  { id: 'uaepass', title: 'UAE Pass',        sub: 'Sign as facility owner / signatory.' },
  { id: 'payers',  title: 'Payer panel',     sub: 'Tell us which insurers you bill so we can pre-clear cycles.' },
  { id: 'bank',    title: 'Bank verification', sub: 'Mal wires advances to this IBAN within 4 hours of approval.' },
];

function advancePctForClaim(score) {
  if (score >= 90) return 0.90;
  if (score >= 80) return 0.80;
  if (score >= 70) return 0.70;
  return 0.60;
}

function buildDefaultScenario() {
  return {
    phase: 'live',            // intro | onboard | batch | live
    onboardStep: 0,
    payerPanel: ['daman', 'thiqa', 'adnic', 'axa', 'bupa', 'metlife'],
    simDay: 0,
    batch: DEFAULT_BATCH,
    paymentsByClaim: {},
    rejectionsByClaim: {},
    selectedClaimId: null,
    batchUploadProgress: 0,
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
  const setPhase = (p) => patch({ phase: p });

  const phase = scenario.phase || 'intro';

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

  const totals = hM(() => {
    const advanced = claimStates.reduce((s, c) => c.status === 'advanced' ? s + c.amount * advancePctForClaim(c.score) : s, 0);
    const paid = claimStates.reduce((s, c) => c.paid ? s + c.paid.gross : s, 0);
    const rejected = claimStates.reduce((s, c) => c.rejected ? s + c.amount : s, 0);
    const outstanding = scenario.batch.totalFace - paid - rejected;
    return { advanced, paid, rejected, outstanding };
  }, [claimStates, scenario.batch.totalFace]);

  const selectedClaim = claimStates.find((c) => c.id === scenario.selectedClaimId) || null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{
        display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 26,
        alignItems: 'flex-start', justifyContent: 'center',
        padding: isMobile ? '8px 12px 24px' : '20px 90px 0 90px',
        flexWrap: 'wrap',
      }}>
        <HcPanel side="provider" title="Provider SME" sub="Dr. Ahmed · Crescent Medical Center" tone="lilac">
          {phase === 'intro'   && <HcProviderIntro    isAr={isAr} onStart={() => setPhase('onboard')}/>}
          {phase === 'onboard' && <HcProviderOnboard  isAr={isAr} scenario={scenario} patch={patch} onDone={() => setPhase('batch')}/>}
          {phase === 'batch'   && <HcProviderBatch    isAr={isAr} scenario={scenario} patch={patch} onSubmitted={() => setPhase('live')}/>}
          {phase === 'live'    && <HcProviderHome     isAr={isAr} scenario={scenario} claimStates={claimStates} totals={totals} onSelectClaim={(id) => patch({ selectedClaimId: id })}/>}
        </HcPanel>

        {!isMobile && (
          <HcCentralOps
            scenario={scenario} setSimDay={setSimDay} setPhase={setPhase}
            phase={phase} claimStates={claimStates} totals={totals} patch={patch}
            isAr={isAr}
          />
        )}

        <HcPanel side="insurer" title="Insurance settlement" sub="Multi-payer · live cycle" tone="sky">
          {phase !== 'live'
            ? <HcInsurerIdle isAr={isAr} phase={phase}/>
            : <HcInsurerPanel isAr={isAr} scenario={scenario} claimStates={claimStates} totals={totals} patch={patch}/>}
        </HcPanel>
      </div>

      <HcAboutStrip isAr={isAr}/>

      {selectedClaim && (
        <HcClaimDrillIn
          isAr={isAr}
          claim={selectedClaim}
          simDay={scenario.simDay}
          onClose={() => patch({ selectedClaimId: null })}
          onResubmit={() => {
            // Resubmission: claim moves from 'refer' to 'advanced' with a small score bump
            const updated = scenario.batch.claims.map((c) => {
              if (c.id !== selectedClaim.id) return c;
              return { ...c, status: 'advanced', score: Math.min(98, c.score + 18),
                       risk: ['Resubmitted with corrected line items', 'Coverage match recomputed: 92%', 'AI suggested edits applied'] };
            });
            patch({
              batch: { ...scenario.batch, claims: updated },
              selectedClaimId: null,
              rejectionsByClaim: Object.fromEntries(Object.entries(scenario.rejectionsByClaim).filter(([k]) => k !== selectedClaim.id)),
            });
          }}
        />
      )}
    </div>
  );
}

// ============================================================
// HcPanel: shared phone-frame wrapper
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
// Provider intro screen — landing before onboarding
// ============================================================
function HcProviderIntro({ isAr, onStart }) {
  return (
    <div style={{
      height: '100%', minHeight: 740,
      display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #FAF7EE 0%, #F0EAFE 60%, #FAF7EE 100%)' }}/>
      <div className="mal-orb" style={{ position: 'absolute', top: 60, insetInlineEnd: -80, width: 320, height: 320, opacity: .55 }}/>
      <div style={{ flex: 1, padding: 36, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', position: 'relative', zIndex: 1 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 999,
          background: 'var(--mal-primary-50)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 24,
        }}>🩺</div>
        <h1 style={{
          fontFamily: 'var(--mal-font-display)', fontStyle: 'italic',
          fontSize: 44, lineHeight: 1.05, margin: 0,
        }}>
          {isAr ? 'احصل على دفعة اليوم،' : 'Get paid today,'}<br/>
          <span style={{ background: 'linear-gradient(135deg, #5a3aa3, #b8364b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {isAr ? 'ليس في ٩٠ يوم.' : 'not in 90 days.'}
          </span>
        </h1>
        <p style={{ fontSize: 14.5, color: 'var(--mal-mid)', marginTop: 16, lineHeight: 1.55, maxWidth: 320 }}>
          {isAr
            ? 'مال يدفع لك مقدمًا على المطالبات التأمينية في نفس اليوم. شركة التأمين تسوّي مع مال، أنت تركّز على المرضى.'
            : 'Mal advances cash on your insurance claims same day. Insurers settle with Mal; you focus on patients.'}
        </p>
        <button onClick={onStart} style={{
          all: 'unset', cursor: 'pointer', textAlign: 'center',
          marginTop: 36, padding: '14px 0', borderRadius: 999,
          background: 'var(--mal-ink)', color: '#FAF7EE',
          fontSize: 14, fontWeight: 600,
        }}>{isAr ? 'ابدأ' : 'Get started'} →</button>
        <div style={{
          display: 'flex', gap: 12, marginTop: 18,
          fontSize: 10.5, color: 'var(--mal-mid)', justifyContent: 'center',
        }}>
          <span>DHA</span><span>·</span><span>UAE Pass</span><span>·</span><span>ADGM FSRA</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Provider onboarding — 4-step micro-flow
// ============================================================
function HcProviderOnboard({ isAr, scenario, patch, onDone }) {
  const step = scenario.onboardStep || 0;
  const cur = ONBOARD_STEPS[step];
  const next = () => {
    if (step + 1 >= ONBOARD_STEPS.length) onDone();
    else patch({ onboardStep: step + 1 });
  };
  const back = () => {
    if (step <= 0) return;
    patch({ onboardStep: step - 1 });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 740 }}>
      {/* Header with stepper */}
      <div style={{ padding: '14px 18px 6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {step > 0 ? (
            <button onClick={back} aria-label="Back" style={{
              all: 'unset', cursor: 'pointer',
              width: 28, height: 28, borderRadius: 999, background: 'var(--mal-surface-2)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>←</button>
          ) : <div style={{ width: 28 }}/>}
          <div className="mal-caption" style={{ flex: 1 }}>
            {isAr ? 'الخطوة' : 'Step'} {step + 1} / {ONBOARD_STEPS.length}
          </div>
          <span style={{ fontSize: 11, color: 'var(--mal-mid)' }}>~30s</span>
        </div>
        <div style={{ display: 'flex', gap: 4, marginTop: 10 }}>
          {ONBOARD_STEPS.map((_, i) => (
            <div key={i} style={{
              flex: 1, height: 4, borderRadius: 999,
              background: i <= step ? 'var(--mal-primary)' : 'var(--mal-line)',
              transition: 'background .25s',
            }}/>
          ))}
        </div>
      </div>

      {/* Step body */}
      <div style={{ flex: 1, padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ fontFamily: 'var(--mal-font-display)', fontStyle: 'italic', fontSize: 28 }}>
          {cur.title}
        </div>
        <div style={{ fontSize: 13, color: 'var(--mal-mid)', lineHeight: 1.55 }}>
          {cur.sub}
        </div>

        {cur.id === 'dha' && (
          <div style={{
            padding: 14, borderRadius: 14,
            background: 'var(--mal-surface-2)', border: '1px solid var(--mal-line)',
          }}>
            <div className="mal-caption" style={{ marginBottom: 6 }}>DHA Registry</div>
            <div style={{ fontSize: 12.5, lineHeight: 1.55 }}>
              <div><strong>Crescent Medical Center</strong></div>
              <div style={{ color: 'var(--mal-mid)' }}>Licence: DHA-F-0042871</div>
              <div style={{ color: 'var(--mal-mid)' }}>Type: Polyclinic · Multi-speciality</div>
              <div style={{ color: 'var(--mal-mid)' }}>Status: Active · Renewed Jun 2026</div>
            </div>
          </div>
        )}

        {cur.id === 'uaepass' && (
          <div style={{
            padding: 18, borderRadius: 14,
            background: 'var(--mal-surface-2)', border: '1px solid var(--mal-line)',
            textAlign: 'center',
          }}>
            <div style={{
              width: 60, height: 60, borderRadius: 16, margin: '0 auto',
              background: 'linear-gradient(135deg, #d63031, #2d3436)',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, fontWeight: 700,
            }}>UAE</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 10 }}>Dr. Ahmed Al-Maktoum</div>
            <div style={{ fontSize: 11, color: 'var(--mal-mid)', marginTop: 2 }}>EID 784-1985-XXXXXX-X · signatory</div>
            <div style={{
              marginTop: 12, padding: '6px 12px', borderRadius: 999,
              background: 'rgba(10,128,86,0.12)', color: '#0a8056',
              fontSize: 11, fontWeight: 600,
              display: 'inline-block',
            }}>✓ Signed via UAE Pass</div>
          </div>
        )}

        {cur.id === 'payers' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {PAYER_KEYS_ORDER.map((k) => {
              const p = PAYERS[k];
              const checked = (scenario.payerPanel || []).includes(k);
              return (
                <button key={k} onClick={() => {
                  const current = scenario.payerPanel || [];
                  const next = checked ? current.filter((x) => x !== k) : [...current, k];
                  patch({ payerPanel: next });
                }} style={{
                  all: 'unset', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', borderRadius: 10,
                  background: checked ? 'var(--mal-paper)' : 'var(--mal-surface-2)',
                  border: '1px solid ' + (checked ? p.tone : 'var(--mal-line)'),
                }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: 999,
                    border: '2px solid ' + (checked ? p.tone : 'var(--mal-line)'),
                    background: checked ? p.tone : 'transparent',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {checked && <span style={{ color: '#fff', fontSize: 10 }}>✓</span>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div>
                    <div style={{ fontSize: 10.5, color: 'var(--mal-mid)' }}>avg cycle {p.cycle}d · denial {Math.round(p.rejRate * 100)}%</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {cur.id === 'bank' && (
          <div style={{
            padding: 14, borderRadius: 14,
            background: 'var(--mal-surface-2)', border: '1px solid var(--mal-line)',
          }}>
            <div className="mal-caption" style={{ marginBottom: 6 }}>IBAN verified via Open Finance</div>
            <div style={{ fontSize: 12.5, lineHeight: 1.55 }}>
              <div><strong>Emirates NBD · Business Pro</strong></div>
              <div style={{ color: 'var(--mal-mid)', fontFamily: 'var(--mal-font-mono)' }}>AE 27 0260 0010 4894 2671 401</div>
              <div style={{ color: 'var(--mal-mid)' }}>Crescent Medical Center LLC</div>
              <div style={{
                marginTop: 8, padding: '4px 10px', borderRadius: 999,
                background: 'rgba(10,128,86,0.12)', color: '#0a8056',
                fontSize: 10.5, fontWeight: 600,
                display: 'inline-block',
              }}>✓ Verified via Lean / Open Finance</div>
            </div>
          </div>
        )}

        <div style={{ flex: 1 }}/>
        <button onClick={next} style={{
          all: 'unset', cursor: 'pointer', textAlign: 'center',
          padding: '14px 0', borderRadius: 999,
          background: 'var(--mal-ink)', color: '#FAF7EE',
          fontSize: 13.5, fontWeight: 600,
        }}>
          {step + 1 === ONBOARD_STEPS.length ? (isAr ? 'تفعيل' : 'Activate') : (isAr ? 'متابعة' : 'Continue')} →
        </button>
      </div>
    </div>
  );
}

// ============================================================
// Batch upload screen
// ============================================================
function HcProviderBatch({ isAr, scenario, patch, onSubmitted }) {
  const progress = scenario.batchUploadProgress || 0;
  const [uploading, setUploading] = hS(false);

  hE(() => {
    if (!uploading) return;
    if (progress >= 100) {
      const t = setTimeout(() => onSubmitted(), 600);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => patch({ batchUploadProgress: Math.min(100, progress + 12) }), 110);
    return () => clearTimeout(t);
  }, [uploading, progress]);

  return (
    <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14, height: '100%', minHeight: 740 }}>
      <div className="mal-caption">{isAr ? 'دفعة مطالبات جديدة' : 'New claim batch'}</div>
      <div style={{ fontFamily: 'var(--mal-font-display)', fontStyle: 'italic', fontSize: 28 }}>
        {isAr ? 'ارفع أو اسحب من DHA' : 'Upload or sync from DHA'}
      </div>

      {!uploading && (
        <>
          <button onClick={() => setUploading(true)} style={{
            all: 'unset', cursor: 'pointer',
            padding: 22, borderRadius: 14,
            border: '2px dashed var(--mal-primary-3)',
            background: 'var(--mal-primary-50)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
          }}>
            <span style={{ fontSize: 30 }}>📥</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--mal-primary)' }}>
              {isAr ? 'اسحب ملف CSV هنا' : 'Drop CSV or DHA export here'}
            </span>
            <span style={{ fontSize: 10.5, color: 'var(--mal-mid)' }}>
              {isAr ? 'أو اضغط للتصفّح' : 'or tap to browse'}
            </span>
          </button>

          <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--mal-mid-2)' }}>{isAr ? 'أو' : 'or'}</div>

          <button onClick={() => setUploading(true)} style={{
            all: 'unset', cursor: 'pointer',
            padding: 14, borderRadius: 12,
            background: 'var(--mal-paper)', border: '1px solid var(--mal-line)',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, #d63031, #2d3436)',
              color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 11,
            }}>DHA</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600 }}>{isAr ? 'استورد من DHA Insurance Hub' : 'Sync from DHA Insurance Hub'}</div>
              <div style={{ fontSize: 10.5, color: 'var(--mal-mid)' }}>{isAr ? 'يجلب جميع المطالبات النشطة' : '12 active claims found'}</div>
            </div>
            <span>→</span>
          </button>
        </>
      )}

      {uploading && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, padding: 24 }}>
          <div style={{ position: 'relative', width: 110, height: 110 }}>
            <svg width={110} height={110} viewBox="0 0 110 110">
              <circle cx={55} cy={55} r={48} fill="none" stroke="var(--mal-line)" strokeWidth={5}/>
              <circle cx={55} cy={55} r={48} fill="none" stroke="var(--mal-primary)" strokeWidth={5}
                      strokeDasharray={`${(progress / 100) * 301.6} 301.6`}
                      strokeLinecap="round"
                      transform="rotate(-90 55 55)"
                      style={{ transition: 'stroke-dasharray .12s linear' }}/>
            </svg>
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--mal-font-display)', fontStyle: 'italic', fontSize: 26,
            }}>{progress}%</div>
          </div>
          <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--mal-mid)', lineHeight: 1.55, maxWidth: 280 }}>
            {progress < 35 ? (isAr ? 'قراءة الأكواد ICD / CPT' : 'Parsing ICD / CPT codes')
              : progress < 70 ? (isAr ? 'تشغيل نموذج التقييم' : 'Running AI adjudication model')
              : progress < 95 ? (isAr ? 'حساب نسبة الدفع المسبق' : 'Computing advance rates')
              : (isAr ? 'تم!' : 'Done — entering live view')}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Provider home: limit hero, batch summary, per-claim ladder
// ============================================================
function HcProviderHome({ isAr, scenario, claimStates, totals, onSelectClaim }) {
  const { batch, simDay } = scenario;
  return (
    <div className="mal-scroll" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, height: '100%', overflowY: 'auto' }}>
      <div className="mal-caption">{isAr ? 'مرحباً، د. أحمد' : 'Hi, Dr. Ahmed'}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div className="mal-h1" style={{ marginTop: -4, fontSize: 24 }}>
          {isAr ? 'مركز كريسنت الطبي' : 'Crescent Medical Center'}
        </div>
        <span style={{ fontSize: 11, color: 'var(--mal-mid)', fontFamily: 'var(--mal-font-mono)' }}>
          Day {simDay}
        </span>
      </div>

      <div style={{
        padding: 14, borderRadius: 14,
        background: 'linear-gradient(135deg, #2A1F6F 0%, #1A1A28 100%)',
        color: '#fff', position: 'relative', overflow: 'hidden',
      }}>
        <div className="mal-orb" style={{ position: 'absolute', width: 200, height: 200, top: -90, insetInlineEnd: -80, opacity: .3 }}/>
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 10.5, opacity: .7, textTransform: 'uppercase', letterSpacing: '.06em' }}>
            {isAr ? 'سُلفة المطالبات · مُستلمة' : 'Claim advance · received'}
          </div>
          <div style={{ fontFamily: 'var(--mal-font-display)', fontStyle: 'italic', fontSize: 30, marginTop: 4 }}>
            AED {Math.round(totals.advanced).toLocaleString()}
          </div>
          <div style={{ fontSize: 11, opacity: .85, marginTop: 6 }}>
            {isAr
              ? `من ${batch.totalFace.toLocaleString()} د.إ · بمتوسط ٧٨٪`
              : `of AED ${batch.totalFace.toLocaleString()} face · blended 78%`}
          </div>
          <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', fontSize: 10.5, opacity: .8 }}>
            <span>{isAr ? 'مدفوع' : 'Settled'} AED {Math.round(totals.paid).toLocaleString()}</span>
            <span>{isAr ? 'متبقّي' : 'Pending'} AED {Math.round(totals.outstanding).toLocaleString()}</span>
          </div>
        </div>
      </div>

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

      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', color: 'var(--mal-mid)', textTransform: 'uppercase', marginTop: 4 }}>
        {isAr ? 'سُلم المطالبات · انقر لعرض التفاصيل' : 'Claim ladder · tap to drill in'}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {claimStates.map((c) => (
          <ClaimRow key={c.id} claim={c} simDay={simDay} isAr={isAr}
                    onClick={() => onSelectClaim(c.id)}/>
        ))}
      </div>
    </div>
  );
}

function ClaimRow({ claim, simDay, isAr, onClick }) {
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
                    : status === 'refer' ? (isAr ? 'إحالة · للفحص' : 'Refer · fixable')
                    : status === 'due' ? (isAr ? 'مستحقة' : 'Due')
                    : (isAr ? 'مُسلَّفة' : 'Advanced');
  const daysToEta = c.etaDay - simDay;

  return (
    <button onClick={onClick} style={{
      all: 'unset', cursor: 'pointer',
      padding: '8px 10px', borderRadius: 10,
      background: status === 'paid' ? 'var(--mal-success-bg)'
                : status === 'rejected' ? 'var(--mal-danger-bg)'
                : status === 'refer' ? 'rgba(176,106,20,0.10)'
                : 'var(--mal-surface-2)',
      border: '1px solid ' + (status === 'refer' ? 'rgba(176,106,20,0.32)' : 'var(--mal-line)'),
      display: 'grid',
      gridTemplateColumns: '8px 1fr auto',
      gap: 8, alignItems: 'center',
      transition: 'transform .15s, box-shadow .15s',
    }}
    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = 'var(--mal-sh-1, 0 2px 6px rgba(0,0,0,0.06))'; }}
    onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}>
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
    </button>
  );
}

// ============================================================
// Claim drill-in modal: full claim detail + AI risk decomposition +
// resubmit CTA when refer/rejected.
// ============================================================
function HcClaimDrillIn({ isAr, claim, simDay, onClose, onResubmit }) {
  const payer = claim.payerObj;
  const isRefer = claim.computedStatus === 'refer' || claim.status === 'refer';
  const isRejected = claim.computedStatus === 'rejected';
  const isPaid = claim.computedStatus === 'paid';

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 80,
      background: 'rgba(15,17,23,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        maxWidth: 520, width: '100%', maxHeight: '90vh',
        background: 'var(--mal-paper)', borderRadius: 18,
        boxShadow: '0 24px 80px rgba(0,0,0,0.32)',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        animation: 'mal-fade-up .25s ease',
      }}>
        {/* Header */}
        <div style={{
          padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 10,
          borderBottom: '1px solid var(--mal-line)',
          background: 'linear-gradient(135deg, ' + payer.tone + '14, transparent)',
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="mal-caption" style={{ color: payer.tone }}>
              {claim.id} · {payer.name} · CPT {claim.cpt}
            </div>
            <div style={{
              fontFamily: 'var(--mal-font-display)', fontStyle: 'italic',
              fontSize: 22, lineHeight: 1.2, marginTop: 4,
            }}>{claim.procedure}</div>
            <div style={{ fontSize: 11.5, color: 'var(--mal-mid)', marginTop: 4 }}>
              {claim.patient} · {isAr ? 'مريض مجهول الهوية' : 'patient (anonymised)'}
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{
            all: 'unset', cursor: 'pointer',
            width: 28, height: 28, borderRadius: 999,
            background: 'var(--mal-surface-2)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Money line */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8,
          }}>
            {[
              { lab: isAr ? 'القيمة الإسمية' : 'Face value', val: 'AED ' + claim.amount.toLocaleString(), tone: 'var(--mal-mid)' },
              { lab: isAr ? 'نسبة السلفة' : 'Advance %', val: (advancePctForClaim(claim.score) * 100).toFixed(0) + '%', tone: 'var(--mal-primary)' },
              { lab: isAr ? 'سُلفة المال' : 'Mal advance', val: 'AED ' + Math.round(claim.amount * advancePctForClaim(claim.score)).toLocaleString(), tone: '#0a8056' },
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

          {/* AI score panel */}
          <div style={{
            padding: 14, borderRadius: 12,
            background: 'var(--mal-surface-2)', border: '1px solid var(--mal-line)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 999,
                background: claim.score >= 85 ? 'rgba(10,128,86,0.16)'
                         : claim.score >= 70 ? 'rgba(176,106,20,0.16)'
                         : 'rgba(184,54,75,0.16)',
                color: claim.score >= 85 ? '#0a8056' : claim.score >= 70 ? '#b06a14' : '#b8364b',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--mal-font-display)', fontStyle: 'italic', fontSize: 18, fontWeight: 700,
              }}>{claim.score}</div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--mal-primary)', letterSpacing: '.06em', textTransform: 'uppercase' }}>
                  {isAr ? 'تقييم AI المخاطر' : 'AI denial-risk score'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--mal-mid)', marginTop: 1 }}>
                  {isAr ? 'احتمال الموافقة' : 'predicted approval'} · {claim.score}%
                </div>
              </div>
            </div>
            <div style={{ marginTop: 10 }}>
              <div className="mal-caption" style={{ color: 'var(--mal-mid)', marginBottom: 6 }}>
                {isAr ? 'العوامل الرئيسية' : 'Top features driving the score'}
              </div>
              <ul style={{ margin: 0, paddingInlineStart: 16, fontSize: 11.5, lineHeight: 1.55 }}>
                {claim.risk.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          </div>

          {/* Status / payer cycle */}
          <div style={{
            padding: '10px 12px', borderRadius: 10,
            background: 'var(--mal-paper)', border: '1px solid var(--mal-line)',
          }}>
            <div className="mal-caption" style={{ color: 'var(--mal-mid)' }}>
              {isAr ? 'حالة شركة التأمين' : 'Payer cycle'}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginTop: 4 }}>
              <span>{payer.name}</span>
              <span style={{ fontFamily: 'var(--mal-font-mono)', color: 'var(--mal-mid)' }}>{payer.cycle}d avg cycle · ETA day {claim.etaDay}</span>
            </div>
            {isPaid && (
              <div style={{ marginTop: 6, fontSize: 11, color: '#0a8056', fontWeight: 600 }}>
                ✓ {isAr ? `سُوّيت يوم ${claim.paid.paidOnDay} · صافي AED ${claim.paid.net.toLocaleString()}` : `Settled day ${claim.paid.paidOnDay} · net AED ${claim.paid.net.toLocaleString()}`}
              </div>
            )}
          </div>

          {/* Refer / resubmit guidance */}
          {(isRefer || isRejected) && (
            <div style={{
              padding: 12, borderRadius: 12,
              background: 'rgba(176,106,20,0.10)',
              border: '1px solid rgba(176,106,20,0.32)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14 }}>⚠️</span>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: '#b06a14' }}>
                  {isAr ? 'إصلاح وإعادة تقديم' : 'Edit and resubmit'}
                </div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--mal-ink)', marginTop: 6, lineHeight: 1.55 }}>
                {isAr
                  ? 'النموذج اقترح ٣ تعديلات. اقبلها لإعادة التقديم بدرجة ٨٣ متوقّعة.'
                  : 'The model suggests 3 line-item edits. Apply them to re-score at predicted 83 and resubmit.'}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div style={{
          padding: 14, borderTop: '1px solid var(--mal-line)',
          display: 'flex', gap: 8, justifyContent: 'space-between',
          background: 'var(--mal-surface-2)',
        }}>
          <button onClick={onClose} style={{
            all: 'unset', cursor: 'pointer',
            padding: '10px 16px', borderRadius: 999,
            border: '1px solid var(--mal-line)',
            background: 'var(--mal-paper)', color: 'var(--mal-ink-2)',
            fontSize: 12.5, fontWeight: 500,
          }}>{isAr ? 'إغلاق' : 'Close'}</button>

          {(isRefer || isRejected) && (
            <button onClick={onResubmit} style={{
              all: 'unset', cursor: 'pointer',
              padding: '10px 16px', borderRadius: 999,
              background: 'var(--mal-primary)', color: '#fff',
              fontSize: 12.5, fontWeight: 700,
            }}>{isAr ? 'إعادة تقديم بعد التعديل' : 'Apply AI edits + resubmit'} →</button>
          )}
          {!isRefer && !isRejected && !isPaid && (
            <span style={{ fontSize: 10.5, color: 'var(--mal-mid)', alignSelf: 'center' }}>
              {isAr ? 'لا حاجة لأي إجراء' : 'No action needed'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Insurer side: idle vs live panel
// ============================================================
function HcInsurerIdle({ isAr, phase }) {
  const label = phase === 'intro' ? (isAr ? 'بانتظار التهيئة' : 'Awaiting provider onboarding')
             : phase === 'onboard' ? (isAr ? 'في التحقّق' : 'Verifying provider with DHA + Open Finance')
             : (isAr ? 'استلام دفعة المطالبات' : 'Receiving claim batch · scoring 12 claims');
  return (
    <div style={{
      padding: 24, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 16, height: '100%',
    }}>
      <div className="mal-orb" style={{ width: 120, height: 120, opacity: .55 }}/>
      <div className="mal-caption" style={{ textAlign: 'center', color: 'var(--mal-mid)' }}>{label}</div>
      <div style={{ fontSize: 11.5, color: 'var(--mal-mid-2)', textAlign: 'center', maxWidth: 260, lineHeight: 1.55 }}>
        {isAr
          ? 'تظهر تسوية شركات التأمين فور دخول مرحلة "حيّ".'
          : 'The 6-payer settlement rollup appears once the batch enters the live cycle.'}
      </div>
    </div>
  );
}

function HcInsurerPanel({ scenario, claimStates, totals, patch, isAr }) {
  const { simDay } = scenario;
  const byPayer = hM(() => {
    const m = {};
    claimStates.forEach((c) => {
      const key = c.payer;
      if (!m[key]) m[key] = { ...c.payerObj, key, claims: [], face: 0, paid: 0, due: 0 };
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
      const fee = Math.round(c.amount * 0.025);
      newPayments[c.id] = { paidOnDay: simDay, gross: c.amount, fee, net: c.amount - fee };
    });
    patch({ paymentsByClaim: newPayments });
  };

  return (
    <div className="mal-scroll" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, height: '100%', overflowY: 'auto' }}>
      <div className="mal-caption">{isAr ? 'تسوية شركات التأمين' : 'Insurance settlement'}</div>
      <div className="mal-h1" style={{ fontSize: 22, marginTop: -2 }}>
        {isAr ? '٦ شركات · ١٢ مطالبة' : '6 payers · 12 claims'}
      </div>

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
                <button onClick={() => runSettlement(p.key)} style={{
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
// Central Ops column: phase ribbon + AI adjudication + day-dial
// ============================================================
function HcCentralOps({ scenario, setSimDay, setPhase, phase, claimStates, totals, patch, isAr }) {
  const { simDay, batch } = scenario;
  const avgScore = Math.round(claimStates.reduce((s, c) => s + c.score, 0) / claimStates.length);
  const refers = claimStates.filter((c) => c.status === 'refer').length;
  const advanced = claimStates.filter((c) => c.status === 'advanced' || c.computedStatus === 'paid').length;

  const phasePills = [
    { id: 'intro',   label: isAr ? 'البداية' : 'Intro',   badge: '1' },
    { id: 'onboard', label: isAr ? 'التسجيل' : 'Onboard', badge: '2' },
    { id: 'batch',   label: isAr ? 'الرفع' : 'Batch',     badge: '3' },
    { id: 'live',    label: isAr ? 'حيّ' : 'Live',       badge: '4' },
  ];

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
      {/* Phase ribbon */}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 3 }}>
        <div className="mal-caption" style={{ color: 'var(--mal-mid)', textAlign: 'center', marginBottom: 4 }}>
          {isAr ? 'المرحلة' : 'Phase'}
        </div>
        {phasePills.map((p) => {
          const active = phase === p.id;
          return (
            <button key={p.id} onClick={() => setPhase(p.id)} style={{
              all: 'unset', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 10px', borderRadius: 999,
              background: active ? 'var(--mal-primary)' : 'var(--mal-paper)',
              color: active ? '#fff' : 'var(--mal-ink-2)',
              border: '1px solid ' + (active ? 'var(--mal-primary)' : 'var(--mal-line)'),
              fontSize: 11, fontWeight: active ? 700 : 500,
              transition: 'background .15s, color .15s',
            }}>
              <span style={{ fontFamily: 'var(--mal-font-mono)', fontSize: 9.5, opacity: 0.7 }}>{p.badge}</span>
              <span>{p.label}</span>
            </button>
          );
        })}
      </div>

      {/* AI adjudication card */}
      <div style={{
        width: '100%', padding: 12, borderRadius: 14,
        background: 'var(--mal-paper)', border: '1px solid var(--mal-line)',
        textAlign: 'center',
      }}>
        <div className="mal-caption" style={{ color: 'var(--mal-primary)' }}>
          {isAr ? 'تقييم AI' : 'AI Adjudication'}
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 10, fontSize: 10 }}>
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
      {phase === 'live' && (
        <>
          <div style={{ textAlign: 'center' }}>
            <div className="mal-caption" style={{ color: 'var(--mal-mid)' }}>{isAr ? 'اليوم' : 'DAY'}</div>
            <div style={{
              fontFamily: 'var(--mal-font-display)', fontStyle: 'italic',
              fontSize: 56, lineHeight: 1, marginTop: 4,
            }}>{simDay}</div>
          </div>

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
        </>
      )}

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
          {phase === 'intro' && <div>Day 0 · {isAr ? 'أهلاً بالطبيب' : 'Provider arrived'}</div>}
          {phase === 'onboard' && (
            <>
              <div>Day 0 · DHA registry sync</div>
              <div>Day 0 · UAE Pass signed</div>
              <div>Day 0 · IBAN verified</div>
            </>
          )}
          {phase === 'batch' && <div>Day 0 · {isAr ? 'جارٍ معالجة الدفعة' : 'Batch processing'}</div>}
          {phase === 'live' && (
            <>
              <div>Day 0 · {isAr ? 'دفعة قُدّمت' : 'Batch submitted'}</div>
              <div>Day 0 · {isAr ? 'AI سجّل ١٢ مطالبة' : 'AI scored 12 claims'}</div>
              <div>Day 0 · {isAr ? `سُلفة ${Math.round(totals.advanced / 1000)}K مرّت` : `Advance AED ${Math.round(totals.advanced / 1000)}K wired`}</div>
              {totals.paid > 0 && <div style={{ color: '#0a8056' }}>Day {simDay} · {isAr ? `تسوية ${Math.round(totals.paid / 1000)}K` : `Settled AED ${Math.round(totals.paid / 1000)}K`}</div>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// About-strip
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
