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
// Pre-auth status. Drives Mal's risk model far more than denial-risk
// scoring does — UAE clinics almost always pre-authorise before service,
// so "approved" claims are near-zero risk and just bridge the 28-78d
// insurer cycle. Direct-pay is the genuine risk segment.
const PREAUTH = {
  approved: { tone: '#0a8056', label: 'Pre-auth approved',  fee: 0.025 },
  pending:  { tone: '#b06a14', label: 'Pre-auth pending',   fee: 0.025 },  // advance held until approved
  direct:   { tone: '#5a3aa3', label: 'Direct-pay · premium', fee: 0.05 }, // VIP / emergency / Mal underwrites
};

const DEFAULT_BATCH = {
  id: 'BATCH-2026-0042',
  provider: 'Crescent Medical Center',
  providerLicence: 'DHA-F-0042871',
  submittedDay: 0,
  totalFace: 0,
  claims: [
    { id: 'CLM-2026-1001', payer: 'daman',   patient: 'P. Hashmi',    procedure: 'Upper GI Endoscopy',     cpt: '43235', amount: 18500, score: 94, preAuth: 'approved', insurancePct: 0.90, status: 'advanced', eligibility: 'active',   risk: ['Coverage match 98%', 'Pre-auth on file (PA-DAM-77412)', 'In-network · standard cycle 28d'] },
    { id: 'CLM-2026-1002', payer: 'daman',   patient: 'A. Khalid',    procedure: 'MRI · Lumbar Spine',     cpt: '72148', amount: 26000, score: 91, preAuth: 'approved', insurancePct: 0.80, status: 'advanced', eligibility: 'active',   risk: ['Coverage match 95%', 'Pre-auth on file (PA-DAM-77419)', 'No history of denial for this code'] },
    { id: 'CLM-2026-1003', payer: 'daman',   patient: 'D. Roy',       procedure: 'Diabetes follow-up',     cpt: '99214', amount:  6500, score: 96, preAuth: 'approved', insurancePct: 1.00, status: 'advanced', eligibility: 'active',   risk: ['Coverage match 99%', 'Chronic-care exempt from pre-auth', 'Patient policy active'] },
    { id: 'CLM-2026-1004', payer: 'thiqa',   patient: 'M. Saeed',     procedure: 'Cardiac stress test',    cpt: '93015', amount: 22000, score: 88, preAuth: 'approved', insurancePct: 0.90, status: 'advanced', eligibility: 'active',   risk: ['Coverage match 92%', 'Pre-auth on file (PA-THQ-22481)', 'Mild seasonal denial rate (Aug)'] },
    { id: 'CLM-2026-1005', payer: 'thiqa',   patient: 'N. Al-Hashmi', procedure: 'Paediatric ER visit',    cpt: '99284', amount:  8400, score: 95, preAuth: 'approved', insurancePct: 1.00, status: 'advanced', eligibility: 'active',   risk: ['Coverage match 97%', 'ER auto-approved under emergency rule', 'No prior denials this provider'] },
    { id: 'CLM-2026-1006', payer: 'thiqa',   patient: 'T. Khalifa',   procedure: 'GP consult x3',          cpt: '99213', amount:  4800, score: 97, preAuth: 'approved', insurancePct: 0.90, status: 'advanced', eligibility: 'active',   risk: ['Coverage match 99%', 'Primary-care no pre-auth needed', 'Repeat patient'] },
    { id: 'CLM-2026-1007', payer: 'adnic',   patient: 'R. Patel',     procedure: 'Orthopaedic surgery',    cpt: '27447', amount: 42000, score: 79, preAuth: 'pending',  insurancePct: 0.80, status: 'advanced', eligibility: 'active',   risk: ['Pre-auth requested · awaiting ADNIC clinical review', 'Mal advance held until approval lands', 'Expected approval in 24-48 hours'] },
    { id: 'CLM-2026-1008', payer: 'adnic',   patient: 'K. Hussain',   procedure: 'Dental crown · 3 units', cpt: 'D2740', amount: 11000, score: 65, preAuth: 'approved', insurancePct: 0.60, status: 'refer',    eligibility: 'active',   risk: ['Coverage match 68%', 'Dental policy excludes 2 of 3 crowns', 'Resubmit with itemised line items'] },
    { id: 'CLM-2026-1009', payer: 'axa',     patient: 'S. Ali',       procedure: 'Maternity package',      cpt: '59400', amount: 31000, score: 82, preAuth: 'approved', insurancePct: 0.90, status: 'advanced', eligibility: 'active',   risk: ['Coverage match 87%', 'Maternity rider active', 'Pre-auth on file (PA-AXA-90118)'] },
    { id: 'CLM-2026-1010', payer: 'axa',     patient: 'M. Tanaka',    procedure: 'Physiotherapy x10',      cpt: '97110', amount: 15500, score: 86, preAuth: 'approved', insurancePct: 0.85, status: 'advanced', eligibility: 'active',   risk: ['Coverage match 90%', 'Visit count below cap (10/20)', 'Standard rehab'] },
    { id: 'CLM-2026-1011', payer: 'bupa',    patient: 'F. Yousef',    procedure: 'CT · Abdomen',           cpt: '74170', amount:  9200, score: 90, preAuth: 'approved', insurancePct: 0.90, status: 'advanced', eligibility: 'active',   risk: ['Coverage match 94%', 'Pre-auth on file (PA-BUP-44012)', 'BUPA international rider'] },
    { id: 'CLM-2026-1012', payer: 'metlife', patient: 'L. Chen',      procedure: 'Eye surgery · cataract', cpt: '66984', amount: 19500, score: 71, preAuth: 'direct',   insurancePct: 0.70, status: 'advanced', eligibility: 'active',   risk: ['VIP plan · service delivered before pre-auth', 'Mal underwrites direct-pay risk · 5% premium fee', 'MetLife historic 78d cycle'] },
  ],
};
DEFAULT_BATCH.totalFace = DEFAULT_BATCH.claims.reduce((s, c) => s + c.amount, 0);

// ============================================================
// Risk-policy data model.
// Three layers: insurer concentration (top-down book caps),
// clinic revolving limit (the actual credit decision), and
// per-batch admission rules (per-payer mix, fraud flags).
// ============================================================
const CLINIC_UW = {
  facility: 'Crescent Medical Center',
  licence: { number: 'DHA-F-0042871', regulator: 'DHA', status: 'active', vintage: '14 mo' },
  scoreInputs: [
    { lab: 'Denial rate (12m)',      val: '4.2%',    weight: 25, sub: 'below 8% threshold · pass' },
    { lab: 'Collection cycle (12m)', val: '39 d',    weight: 20, sub: 'below 65d threshold · pass' },
    { lab: 'Coding accuracy',        val: '96%',     weight: 15, sub: 'top decile in DHA network' },
    { lab: 'Owner KYC + UBO',        val: '✓ clean', weight: 15, sub: '100% beneficial-owner trace' },
    { lab: 'Premises type',          val: 'Owned',   weight: 10, sub: 'physical premises since 2024' },
    { lab: 'Bank-account stability', val: '14 mo',   weight: 10, sub: 'no IBAN change in past year' },
    { lab: 'Peer LGD precedent',     val: '0.6%',    weight:  5, sub: 'segment historic loss' },
  ],
  composite: 84,        // out of 100
  tier: 'A',            // A · B · C
  limit: 2000000,       // revolving line ceiling
  advancePct: 0.92,     // headline advance rate
  feeBase: 0.025,       // base fee
  review: 'Quarterly · monthly soft-pull',
};

// Per-insurer concentration policy. Tier A = govt-backed (highest book cap).
// Tier C = niche / longer cycle = tightest concentration cap.
const INSURER_UW = [
  { key: 'daman',   tier: 'A', bookShare: 0.18, bookCap: 0.30, advanceCap: 0.95, cycleCap: 90, rating: 'A-',   notes: 'Government anchor · highest pay-rate' },
  { key: 'thiqa',   tier: 'A', bookShare: 0.14, bookCap: 0.30, advanceCap: 0.95, cycleCap: 90, rating: 'A',    notes: 'Abu Dhabi resident · government-backed' },
  { key: 'adnic',   tier: 'B', bookShare: 0.12, bookCap: 0.15, advanceCap: 0.88, cycleCap: 60, rating: 'BBB+', notes: 'Listed insurer · stable, slower' },
  { key: 'axa',     tier: 'B', bookShare: 0.10, bookCap: 0.15, advanceCap: 0.88, cycleCap: 60, rating: 'A',    notes: 'Global parent · UAE TPA arm' },
  { key: 'bupa',    tier: 'B', bookShare: 0.06, bookCap: 0.15, advanceCap: 0.88, cycleCap: 60, rating: 'A',    notes: 'International rider mix' },
  { key: 'metlife', tier: 'C', bookShare: 0.04, bookCap: 0.05, advanceCap: 0.80, cycleCap: 30, rating: 'BBB',  notes: 'Niche US plans · longer cycle' },
];

// Per-batch admission rules (Layer 3 — runs at batch entry).
const BATCH_ADMISSION_RULES = [
  { id: 'preauth',     label: 'Pre-auth or direct-pay carve-out (≤20%)' },
  { id: 'payer-mix',   label: 'Per-payer concentration vs book cap' },
  { id: 'procedure',   label: 'Single-procedure ≤40% of batch' },
  { id: 'fraud',       label: 'Density · duplicate-patient · code-stuff' },
  { id: 'limit',       label: 'Within clinic revolving headroom' },
];

// Rate-card matrix. Three pricing tiers driven by underwriting score
// crossed with pre-auth status / insurer tier.
const RATE_CARD = [
  { row: 'Pre-auth approved · Tier-A clinic · Tier-A insurer', advance: '95%',  fee: '2.0%', cycle: '28–35 d' },
  { row: 'Pre-auth approved · Tier-A clinic · Tier-B insurer', advance: '90%',  fee: '2.5%', cycle: '48–65 d' },
  { row: 'Pre-auth approved · Tier-B clinic · Tier-B insurer', advance: '85%',  fee: '3.0%', cycle: '48–65 d' },
  { row: 'Pre-auth approved · Tier-A clinic · Tier-C insurer', advance: '80%',  fee: '3.5%', cycle: '65–78 d' },
  { row: 'Direct-pay (VIP / emergency) · any tier',            advance: '70–80%', fee: '5.0%', cycle: '30–90 d' },
  { row: 'Denial-protection rider (add-on, any row)',           advance: '+0%',  fee: '+0.4%', cycle: 'same' },
];

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

// Phase metadata for the floating dotnav + central narrative ledger.
// Mirrors P1's DM_PHASES pattern so the two products share the same
// navigation language.
const HC_PHASES = [
  { id: 'intro',      label: 'Welcome' },
  { id: 'onboard',    label: 'Onboarding' },
  { id: 'underwrite', label: 'Credit committee' },
  { id: 'batch',      label: 'Batch uploaded' },
  { id: 'live',       label: 'Live · Day-by-day' },
];

// Narrative for the Mal action ledger. Three rows per phase: what Mal
// does + what the clinic + insurer need to do. Drives the central
// column when not in live phase.
const HC_PHASE_LEDGER = {
  intro: {
    mal:    'Awaiting provider · referral or DHA inbound',
    clinic: 'Lands on Mal · clicks Get started',
    insurer:'Standby · no exposure yet',
  },
  onboard: {
    mal:    'Pulls DHA licence · scores KYB · verifies IBAN via Open Finance',
    clinic: 'Signs UAE Pass · picks payer panel · confirms IBAN',
    insurer:'Webhook · new provider on Mal · panel registered',
  },
  underwrite: {
    mal:    'Credit committee · composite score · issues revolving limit',
    clinic: 'Awaits decision · reviews rate card',
    insurer:'Concentration cap re-checked vs new clinic exposure',
  },
  batch: {
    mal:    'Layer-3 admission · AI scores 12 claims · wires advance in 4h',
    clinic: 'Uploads batch (CSV) or syncs from DHA Insurance Hub',
    insurer:'Receives forward claim with Mal noted as payee',
  },
  live: {
    mal:    'Tracks per-payer cycle · resolves refers · collects at settlement',
    clinic: 'Cash in hand · continues to see patients',
    insurer:'Adjudicates claims · settles at 28–78d cycle',
  },
};

function buildDefaultScenario() {
  return {
    phase: 'intro',           // intro | onboard | underwrite | batch | live
    onboardStep: 0,
    payerPanel: ['daman', 'thiqa', 'adnic', 'axa', 'bupa', 'metlife'],
    simDay: 0,
    batch: DEFAULT_BATCH,
    paymentsByClaim: {},
    rejectionsByClaim: {},
    selectedClaimId: null,
    batchUploadProgress: 0,
    denialProtection: false,
    // Tier-2 flags
    showPreAuthOrchestrator: false,    // modal: 6 payer APIs in parallel
    showCodingCopilot: false,          // modal: paste clinical note → CPT codes
    showRevolvingDetails: false,       // inline expand of the credit line card
    patientFinancing: {},              // claimId → true if patient opted into 3-mo instalments
    // Risk-policy state
    underwriteApproved: true,          // demo lands with limit already issued
    batchAdmitted: true,               // demo lands with current batch admitted
    showRiskHub: false,                // Mal-side Risk Hub modal toggle
    riskHubTab: 'portfolio',           // portfolio | policy | ratecard
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
    // Pre-auth-approved claims advance immediately. Pre-auth-pending
    // claims are held until approval lands. Direct-pay claims advance
    // too, just at the 5% premium fee.
    const advancedClaims = claimStates.filter((c) => c.status === 'advanced' && c.preAuth !== 'pending');
    const advanced = advancedClaims.reduce((s, c) => s + c.amount * advancePctForClaim(c.score), 0);
    const held = claimStates.filter((c) => c.preAuth === 'pending').reduce((s, c) => s + c.amount, 0);
    const paid = claimStates.reduce((s, c) => c.paid ? s + c.paid.gross : s, 0);
    const rejected = claimStates.reduce((s, c) => c.rejected ? s + c.amount : s, 0);
    const outstanding = scenario.batch.totalFace - paid - rejected;
    // Co-pay / patient-pay portion: the slice the patient owes (out of pocket)
    const patientPay = claimStates.reduce((s, c) => s + c.amount * (1 - (c.insurancePct ?? 1)), 0);
    // Denial-protection rider premium = 0.4% of face value
    const denialRiderFee = scenario.denialProtection ? Math.round(scenario.batch.totalFace * 0.004) : 0;
    // Mal's blended fee = 2.5% baseline + extra 2.5% on direct-pay claims
    const standardFee = Math.round(advancedClaims.filter((c) => c.preAuth !== 'direct').reduce((s, c) => s + c.amount, 0) * 0.025);
    const directFee = Math.round(advancedClaims.filter((c) => c.preAuth === 'direct').reduce((s, c) => s + c.amount, 0) * 0.05);
    return { advanced, held, paid, rejected, outstanding, patientPay, denialRiderFee, standardFee, directFee };
  }, [claimStates, scenario.batch.totalFace, scenario.denialProtection]);

  const selectedClaim = claimStates.find((c) => c.id === scenario.selectedClaimId) || null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {!isMobile && <HcTimelineSidebar phase={phase} setPhase={setPhase}/>}
      <div style={{
        display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 20,
        alignItems: 'flex-start', justifyContent: 'center',
        padding: isMobile ? '8px 12px 24px' : '20px 32px 0 32px',
        flexWrap: 'wrap',
      }}>
        <HcPanel side="provider" title="Provider SME" sub="Dr. Ahmed · Crescent Medical Center" tone="lilac">
          {phase === 'intro'      && <HcProviderIntro      isAr={isAr} onStart={() => setPhase('onboard')}/>}
          {phase === 'onboard'    && <HcProviderOnboard    isAr={isAr} scenario={scenario} patch={patch} onDone={() => setPhase('underwrite')}/>}
          {phase === 'underwrite' && <HcProviderUnderwrite isAr={isAr} scenario={scenario} patch={patch} onApprove={() => { patch({ underwriteApproved: true }); setPhase('batch'); }}/>}
          {phase === 'batch'      && <HcProviderBatch      isAr={isAr} scenario={scenario} patch={patch} onSubmitted={() => setPhase('live')}/>}
          {phase === 'live'       && <HcProviderHome       isAr={isAr} scenario={scenario} claimStates={claimStates} totals={totals} patch={patch} onSelectClaim={(id) => patch({ selectedClaimId: id })}/>}
        </HcPanel>

        {!isMobile && (
          <HcCentralOps
            scenario={scenario} setSimDay={setSimDay} setPhase={setPhase}
            phase={phase} claimStates={claimStates} totals={totals} patch={patch}
            isAr={isAr}
          />
        )}

        <HcPanel side="insurer" title="Insurance settlement" sub="Multi-payer · live cycle" tone="sky">
          {phase === 'underwrite'
            ? <HcInsurerUnderwrite isAr={isAr}/>
            : phase !== 'live'
              ? <HcInsurerIdle isAr={isAr} phase={phase}/>
              : <HcInsurerPanel isAr={isAr} scenario={scenario} claimStates={claimStates} totals={totals} patch={patch}/>}
        </HcPanel>
      </div>

      <HcAboutStrip isAr={isAr}/>

      {scenario.showPreAuthOrchestrator && (
        <HcPreAuthOrchestrator
          isAr={isAr}
          pendingClaims={claimStates.filter((c) => c.preAuth === 'pending')}
          onClose={() => patch({ showPreAuthOrchestrator: false })}
        />
      )}

      {scenario.showCodingCopilot && (
        <HcCodingCopilot
          isAr={isAr}
          onClose={() => patch({ showCodingCopilot: false })}
        />
      )}

      {scenario.showRiskHub && (
        <HcRiskHub
          isAr={isAr}
          scenario={scenario}
          claimStates={claimStates}
          totals={totals}
          tab={scenario.riskHubTab || 'portfolio'}
          onTab={(t) => patch({ riskHubTab: t })}
          onClose={() => patch({ showRiskHub: false })}
        />
      )}

      {selectedClaim && (
        <HcClaimDrillIn
          isAr={isAr}
          claim={selectedClaim}
          scenario={scenario}
          patch={patch}
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
function HcProviderHome({ isAr, scenario, claimStates, totals, onSelectClaim, patch }) {
  const { batch, simDay } = scenario;
  const directClaims = claimStates.filter((c) => c.preAuth === 'direct');
  const pendingPreAuth = claimStates.filter((c) => c.preAuth === 'pending');
  const eligibilityCounts = {
    active: claimStates.filter((c) => c.eligibility === 'active').length,
    total: claimStates.length,
  };

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

      {/* Revolving line — replaces per-batch advances for high-volume
          providers. Tap to expand for utilisation breakdown. */}
      <HcRevolvingLine
        isAr={isAr}
        open={!!scenario.showRevolvingDetails}
        onToggle={() => patch({ showRevolvingDetails: !scenario.showRevolvingDetails })}
        currentBatchAdvanced={totals.advanced}
      />

      {/* Provider scorecard — Mal aggregates the clinic's denial rate,
          settlement speed, and coding accuracy vs network median. */}
      <HcProviderScorecard isAr={isAr}/>

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

      {/* Batch admission card — Layer-3 risk check that ran before
          Mal advanced. Compact strip with the 5 rules + result. */}
      <HcBatchAdmissionCard isAr={isAr} totals={totals} claimStates={claimStates}/>

      {/* Eligibility check banner — runs real-time policy verification
          for every patient before the batch is submitted. */}
      <div style={{
        padding: '10px 12px', borderRadius: 12,
        background: 'rgba(10,128,86,0.08)',
        border: '1px solid rgba(10,128,86,0.24)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 22, height: 22, borderRadius: 999, flexShrink: 0,
            background: '#0a8056', color: '#fff',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700,
          }}>✓</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: '#0a8056' }}>
              {isAr
                ? `الأهلية مُتحقَّقة · ${eligibilityCounts.active} من ${eligibilityCounts.total} مرضى`
                : `Eligibility verified · ${eligibilityCounts.active} / ${eligibilityCounts.total} patients`}
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--mal-mid)', marginTop: 1 }}>
              {isAr
                ? 'فحص فوري للبوليصة عبر جميع شركات التأمين'
                : 'Real-time policy check across all 6 payers'}
            </div>
          </div>
        </div>
      </div>

      {/* Pre-auth pending notice — visible only if any claim is awaiting approval */}
      {pendingPreAuth.length > 0 && (
        <div style={{
          padding: '10px 12px', borderRadius: 12,
          background: 'rgba(176,106,20,0.10)',
          border: '1px solid rgba(176,106,20,0.32)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14 }}>⏳</span>
            <div style={{ flex: 1, fontSize: 11.5, color: 'var(--mal-ink)', lineHeight: 1.5 }}>
              <strong style={{ color: '#b06a14' }}>
                {pendingPreAuth.length} {isAr ? 'مطالبة بانتظار الموافقة المسبقة' : pendingPreAuth.length === 1 ? 'claim awaiting pre-auth' : 'claims awaiting pre-auth'}
              </strong>
              <div style={{ fontSize: 10.5, color: 'var(--mal-mid)', marginTop: 1 }}>
                {isAr ? 'سُلفة مال مُعلَّقة حتى تصل الموافقة' : 'Mal advance held until approval lands'}
              </div>
            </div>
            <button onClick={() => patch({ showPreAuthOrchestrator: true })} style={{
              all: 'unset', cursor: 'pointer',
              padding: '5px 10px', borderRadius: 999,
              background: '#b06a14', color: '#fff',
              fontSize: 10.5, fontWeight: 600, letterSpacing: '.02em',
            }}>
              {isAr ? 'شغّل التحقّق' : 'Run orchestrator ▸'}
            </button>
          </div>
        </div>
      )}

      {/* Direct-pay segment — VIP / emergency / unauthorized claims that
          Mal underwrites at a 5% premium fee. */}
      {directClaims.length > 0 && (
        <div style={{
          padding: '10px 12px', borderRadius: 12,
          background: 'linear-gradient(135deg, rgba(90,58,163,0.10), var(--mal-paper))',
          border: '1px solid rgba(90,58,163,0.32)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14 }}>⚡</span>
            <div style={{ flex: 1, fontSize: 11.5, color: 'var(--mal-ink)', lineHeight: 1.5 }}>
              <strong style={{ color: '#5a3aa3' }}>
                {directClaims.length} {isAr ? 'مطالبة مباشرة الدفع · مال يتحمّل المخاطر' : directClaims.length === 1 ? 'direct-pay claim · Mal underwrites' : 'direct-pay claims · Mal underwrites'}
              </strong>
              <div style={{ fontSize: 10.5, color: 'var(--mal-mid)', marginTop: 1 }}>
                {isAr ? 'VIP / طوارئ · رسم ٥٪' : 'VIP / emergency · 5% premium fee · advance on day 1'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Denial-protection rider toggle */}
      <button onClick={() => patch({ denialProtection: !scenario.denialProtection })} style={{
        all: 'unset', cursor: 'pointer',
        padding: '10px 12px', borderRadius: 12,
        background: scenario.denialProtection ? 'rgba(10,128,86,0.10)' : 'var(--mal-surface-2)',
        border: '1px solid ' + (scenario.denialProtection ? 'rgba(10,128,86,0.32)' : 'var(--mal-line)'),
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{
          width: 18, height: 18, borderRadius: 4, flexShrink: 0,
          background: scenario.denialProtection ? '#0a8056' : '#fff',
          border: '1px solid ' + (scenario.denialProtection ? '#0a8056' : 'var(--mal-line)'),
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 11, fontWeight: 700,
        }}>{scenario.denialProtection ? '✓' : ''}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--mal-ink)' }}>
            🛡 {isAr ? 'حماية من رفض المطالبات' : 'Denial-protection rider'}
            <span style={{ fontSize: 10.5, color: 'var(--mal-mid)', fontWeight: 500, marginLeft: 6 }}>
              +0.4% · AED {Math.round(scenario.batch.totalFace * 0.004).toLocaleString()}
            </span>
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--mal-mid)', marginTop: 1 }}>
            {isAr ? 'مال يُغطّي أي مطالبة مرفوضة بعد تقديم الخدمة' : 'Mal covers any post-service denial in this batch'}
          </div>
        </div>
      </button>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', color: 'var(--mal-mid)', textTransform: 'uppercase' }}>
          {isAr ? 'سُلم المطالبات · انقر للتفاصيل' : 'Claim ladder · tap to drill in'}
        </div>
        <button onClick={() => patch({ showCodingCopilot: true })} style={{
          all: 'unset', cursor: 'pointer',
          padding: '4px 10px', borderRadius: 999,
          background: 'var(--mal-primary-50)', color: 'var(--mal-primary)',
          border: '1px solid var(--mal-primary-3)',
          fontSize: 10.5, fontWeight: 600,
          display: 'inline-flex', alignItems: 'center', gap: 4,
        }}>
          <span>🧬</span>
          <span>{isAr ? 'مساعد الترميز' : 'Coding co-pilot'}</span>
        </button>
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
  const preAuth = PREAUTH[c.preAuth || 'approved'];
  const insPct = Math.round((c.insurancePct ?? 1) * 100);
  const patPct = 100 - insPct;
  const isDirect = c.preAuth === 'direct';
  const isPending = c.preAuth === 'pending';
  const statusTone = status === 'paid' ? '#0a8056'
                  : status === 'rejected' ? '#b8364b'
                  : status === 'refer' ? '#b06a14'
                  : status === 'due' ? '#b06a14'
                  : isPending ? '#b06a14'
                  : 'var(--mal-mid)';
  const statusLabel = status === 'paid' ? (isAr ? 'مدفوعة' : 'Settled')
                    : status === 'rejected' ? (isAr ? 'مرفوضة' : 'Rejected')
                    : status === 'refer' ? (isAr ? 'إحالة · للفحص' : 'Refer · fixable')
                    : status === 'due' ? (isAr ? 'مستحقة' : 'Due')
                    : isPending ? (isAr ? 'سُلفة معلَّقة' : 'Advance held')
                    : (isAr ? 'مُسلَّفة' : 'Advanced');
  const daysToEta = c.etaDay - simDay;

  return (
    <button onClick={onClick} style={{
      all: 'unset', cursor: 'pointer',
      padding: '8px 10px', borderRadius: 10,
      background: status === 'paid' ? 'var(--mal-success-bg)'
                : status === 'rejected' ? 'var(--mal-danger-bg)'
                : status === 'refer' ? 'rgba(176,106,20,0.10)'
                : isPending ? 'rgba(176,106,20,0.06)'
                : isDirect ? 'linear-gradient(135deg, rgba(90,58,163,0.08), var(--mal-surface-2))'
                : 'var(--mal-surface-2)',
      border: '1px solid ' + (status === 'refer' ? 'rgba(176,106,20,0.32)'
                            : isDirect ? 'rgba(90,58,163,0.32)'
                            : isPending ? 'rgba(176,106,20,0.32)'
                            : 'var(--mal-line)'),
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
          {/* Pre-auth badge */}
          <span style={{
            fontSize: 9, padding: '1px 5px', borderRadius: 999,
            background: preAuth.tone + '18', color: preAuth.tone,
            fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase',
          }}>
            {c.preAuth === 'approved' ? '✓ pre-auth' : c.preAuth === 'pending' ? '⏳ pre-auth' : '⚡ direct'}
          </span>
        </div>
        <div style={{ fontSize: 10, color: 'var(--mal-mid)', marginTop: 1 }}>
          {c.id} · {c.patient}
          {/* Co-pay split */}
          <span style={{ marginLeft: 4 }}>
            · <span style={{ color: '#0a8056', fontWeight: 600 }}>{insPct}%</span>
            <span style={{ color: 'var(--mal-mid-2)' }}> ins </span>
            / <span style={{ color: patPct > 0 ? '#b06a14' : 'var(--mal-mid-2)', fontWeight: patPct > 0 ? 600 : 400 }}>{patPct}%</span>
            <span style={{ color: 'var(--mal-mid-2)' }}> pt</span>
          </span>
          {status === 'advanced' && daysToEta > 0 && !isPending && ` · ${isAr ? `يستحق خلال ${daysToEta}ي` : `ETA ${daysToEta}d`}`}
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
          {status === 'advanced' && !isPending && ` · ${(advPct * 100).toFixed(0)}%`}
          {isDirect && status === 'advanced' && !isPending && ' · 5% fee'}
        </div>
      </div>
    </button>
  );
}

// ============================================================
// Claim drill-in modal: full claim detail + AI risk decomposition +
// resubmit CTA when refer/rejected.
// ============================================================
function HcClaimDrillIn({ isAr, claim, scenario, patch, simDay, onClose, onResubmit }) {
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
          {/* Pre-auth + coverage card */}
          {(() => {
            const pa = PREAUTH[claim.preAuth || 'approved'];
            const insPct = Math.round((claim.insurancePct ?? 1) * 100);
            const insAmt = Math.round(claim.amount * (claim.insurancePct ?? 1));
            const ptAmt = claim.amount - insAmt;
            const fee = Math.round(claim.amount * pa.fee);
            return (
              <div style={{
                padding: 12, borderRadius: 12,
                background: pa.tone + '12',
                border: '1px solid ' + pa.tone + '40',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{
                    fontSize: 11, padding: '2px 8px', borderRadius: 999,
                    background: pa.tone, color: '#fff',
                    fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase',
                  }}>{pa.label}</span>
                  <span style={{ fontSize: 10.5, color: 'var(--mal-mid)' }}>
                    {isAr ? 'رسم مال' : 'Mal fee'} <strong>{(pa.fee * 100).toFixed(1)}%</strong> · AED {fee.toLocaleString()}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 11, color: 'var(--mal-ink)' }}>
                  <div>
                    <div style={{ fontSize: 9.5, color: 'var(--mal-mid-2)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                      {isAr ? 'تأمين' : 'Insurance covers'}
                    </div>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: '#0a8056', fontFamily: 'var(--mal-font-mono)' }}>
                      AED {insAmt.toLocaleString()} · {insPct}%
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 9.5, color: 'var(--mal-mid-2)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                      {isAr ? 'حصّة المريض' : 'Patient co-pay'}
                    </div>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: ptAmt > 0 ? '#b06a14' : 'var(--mal-mid)', fontFamily: 'var(--mal-font-mono)' }}>
                      AED {ptAmt.toLocaleString()} · {100 - insPct}%
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

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

          {/* Patient-financing widget: only when patient has co-pay > 0 */}
          {(() => {
            const ptAmt = Math.round(claim.amount * (1 - (claim.insurancePct ?? 1)));
            if (ptAmt <= 0) return null;
            const enrolled = !!(scenario && scenario.patientFinancing && scenario.patientFinancing[claim.id]);
            const installments = 3;
            const ptEmi = Math.round((ptAmt * 1.08) / installments);   // 8% flat for 3 months
            const toggle = () => {
              if (!patch) return;
              const next = { ...(scenario.patientFinancing || {}) };
              if (enrolled) delete next[claim.id];
              else next[claim.id] = true;
              patch({ patientFinancing: next });
            };
            return (
              <div style={{
                padding: 12, borderRadius: 12,
                background: enrolled ? 'rgba(10,128,86,0.10)' : 'var(--mal-surface-2)',
                border: '1px solid ' + (enrolled ? 'rgba(10,128,86,0.32)' : 'var(--mal-line)'),
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 14 }}>💳</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: enrolled ? '#0a8056' : 'var(--mal-ink)' }}>
                      {isAr ? 'تمويل حصّة المريض' : 'Patient co-pay financing'}
                    </div>
                    <div style={{ fontSize: 10.5, color: 'var(--mal-mid)', marginTop: 1 }}>
                      {isAr
                        ? `يقسّم المريض ${ptAmt.toLocaleString()} د.إ على ${installments} أشهر`
                        : `Patient splits AED ${ptAmt.toLocaleString()} into ${installments} monthly instalments`}
                    </div>
                  </div>
                  <button onClick={toggle} style={{
                    all: 'unset', cursor: 'pointer',
                    padding: '5px 12px', borderRadius: 999,
                    background: enrolled ? '#0a8056' : 'var(--mal-ink)',
                    color: '#fff', fontSize: 11, fontWeight: 700,
                  }}>
                    {enrolled ? (isAr ? '✓ مُفعَّل' : '✓ Enrolled') : (isAr ? 'فعِّل' : 'Offer')}
                  </button>
                </div>
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6,
                  fontSize: 10.5, color: 'var(--mal-ink)',
                }}>
                  {[1, 2, 3].map((n) => (
                    <div key={n} style={{
                      padding: '6px 8px', borderRadius: 8,
                      background: 'var(--mal-paper)', border: '1px solid var(--mal-line)',
                    }}>
                      <div style={{ fontSize: 9, color: 'var(--mal-mid-2)' }}>EMI {n} · day {n * 30}</div>
                      <div style={{ fontFamily: 'var(--mal-font-mono)', fontWeight: 600 }}>AED {ptEmi.toLocaleString()}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 6, fontSize: 10, color: 'var(--mal-mid)' }}>
                  {isAr
                    ? '٨٪ سعر فائدة ثابت · مال يدفع المركز يوم الخدمة · يستردّ من المريض شهرياً'
                    : '8% flat · Mal pays the clinic on service day · collects from patient over 3 months'}
                </div>
              </div>
            );
          })()}
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

  const phaseIdx = HC_PHASES.findIndex((p) => p.id === phase);
  const phaseMeta = HC_PHASES[phaseIdx] || HC_PHASES[0];
  const ledger = HC_PHASE_LEDGER[phase] || HC_PHASE_LEDGER.intro;

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
      {/* Mal action ledger — what each party does this phase */}
      <div style={{
        width: '100%', padding: 12, borderRadius: 14,
        background: 'var(--mal-paper)', border: '1px solid var(--mal-line)',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
          <div className="mal-caption" style={{ color: 'var(--mal-primary)' }}>
            {isAr ? 'مال · هذه المرحلة' : 'Mal · this phase'}
          </div>
          <span style={{ fontSize: 9.5, fontFamily: 'var(--mal-font-mono)', color: 'var(--mal-mid-2)' }}>
            {String(phaseIdx + 1).padStart(2, '0')}/{String(HC_PHASES.length).padStart(2, '0')}
          </span>
        </div>
        <div style={{
          fontFamily: 'var(--mal-font-display)', fontStyle: 'italic',
          fontSize: 17, lineHeight: 1.2, marginBottom: 10,
        }}>{phaseMeta.label}</div>

        {[
          { role: 'Mal',     who: isAr ? 'مال' : 'Mal',    body: ledger.mal,     tone: 'var(--mal-primary)' },
          { role: 'Clinic',  who: isAr ? 'المركز' : 'Clinic',  body: ledger.clinic,  tone: '#0a8056' },
          { role: 'Insurer', who: isAr ? 'التأمين' : 'Insurer', body: ledger.insurer, tone: '#1f54c8' },
        ].map((row) => (
          <div key={row.role} style={{
            display: 'grid', gridTemplateColumns: '52px 1fr', gap: 8, alignItems: 'flex-start',
            padding: '6px 0',
            borderTop: '1px solid var(--mal-line)',
          }}>
            <span style={{
              fontSize: 9.5, fontWeight: 700, color: row.tone,
              letterSpacing: '.06em', textTransform: 'uppercase', paddingTop: 1,
            }}>{row.who}</span>
            <span style={{ fontSize: 11, lineHeight: 1.5, color: 'var(--mal-ink)' }}>{row.body}</span>
          </div>
        ))}
      </div>

      {/* Risk Hub launcher — Mal-side credit committee view */}
      <button onClick={() => patch({ showRiskHub: true })} style={{
        all: 'unset', cursor: 'pointer',
        width: '100%', padding: '8px 12px', borderRadius: 12,
        background: 'linear-gradient(135deg, #2A1F6F 0%, #1A1A28 100%)',
        color: '#fff', display: 'flex', alignItems: 'center', gap: 8,
        boxSizing: 'border-box',
      }}>
        <span style={{ fontSize: 14 }}>🛡</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase' }}>
            {isAr ? 'مركز المخاطر' : 'Risk Hub'}
          </div>
          <div style={{ fontSize: 9.5, opacity: 0.78, marginTop: 1 }}>
            {isAr ? 'محفظة · سياسة · سعر' : 'Portfolio · Policy · Rate card'}
          </div>
        </div>
        <span style={{ fontSize: 11, opacity: 0.8 }}>→</span>
      </button>

      {/* AI adjudication card — only meaningful once a batch exists */}
      {(phase === 'batch' || phase === 'live') && <div style={{
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
      </div>}

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
          {phase === 'underwrite' && (
            <>
              <div>Day 0 · {isAr ? 'تجميع بيانات المركز' : 'Clinic profile assembled'}</div>
              <div>Day 0 · {isAr ? 'حساب درجة المخاطر' : 'Composite score computed'}</div>
              <div>Day 0 · {isAr ? 'لجنة الائتمان · موافقة' : 'Credit committee · approving'}</div>
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

// ============================================================
// HcBatchAdmissionCard — compact Layer-3 admission proof. Renders the
// 5 admission checks (pre-auth · payer-mix · procedure · fraud · limit)
// with their concrete values for the current batch.
// ============================================================
function HcBatchAdmissionCard({ isAr, totals, claimStates }) {
  // Compute payer-mix and concentration values from the live batch.
  const byPayer = {};
  let totalFace = 0;
  claimStates.forEach((c) => {
    byPayer[c.payer] = (byPayer[c.payer] || 0) + c.amount;
    totalFace += c.amount;
  });
  const topPayerKey = Object.keys(byPayer).sort((a, b) => byPayer[b] - byPayer[a])[0];
  const topPayer = PAYERS[topPayerKey];
  const topPayerPct = Math.round((byPayer[topPayerKey] / totalFace) * 100);
  // Per-batch single-payer concentration cap. Separate from the
  // book-level cap (Layer 1) — a single batch can reasonably be 50%
  // one payer as long as it doesn't push the *book* over its cap.
  const batchPayerCap = 50;
  const directShare = claimStates.filter((c) => c.preAuth === 'direct').reduce((s, c) => s + c.amount, 0);
  const directPct = Math.round((directShare / totalFace) * 100);
  const advancedFace = Math.round(totals.advanced + totals.held);
  const limit = CLINIC_UW.limit;
  const utilPct = Math.round((advancedFace / limit) * 100);

  const checks = [
    {
      label: isAr ? 'موافقة مسبقة · أو دفع مباشر ≤٢٠٪' : 'Pre-auth · direct-pay carve-out ≤20%',
      result: `${directPct}% direct`,
      pass: directPct <= 20,
    },
    {
      label: isAr ? `تركّز ${topPayer.name} ≤${batchPayerCap}٪ من الدفعة` : `${topPayer.name} ≤${batchPayerCap}% of batch face`,
      result: `${topPayerPct}%`,
      pass: topPayerPct <= batchPayerCap,
    },
    {
      label: isAr ? 'لا إجراء واحد >٤٠٪ من الدفعة' : 'No single procedure >40% of batch',
      result: isAr ? '✓' : 'clean',
      pass: true,
    },
    {
      label: isAr ? 'فحوصات الاحتيال · كثافة · مرضى مكرّرون' : 'Fraud flags · density · duplicate-patient',
      result: '0',
      pass: true,
    },
    {
      label: isAr ? `داخل الحدّ المتجدّد · ${utilPct}% مستخدم` : `Within revolving headroom · ${utilPct}% util`,
      result: 'AED ' + Math.round(advancedFace / 1000) + 'K',
      pass: utilPct <= 100,
    },
  ];
  const allPass = checks.every((c) => c.pass);

  return (
    <div style={{
      padding: 12, borderRadius: 12,
      background: allPass ? 'rgba(10,128,86,0.06)' : 'rgba(184,54,75,0.08)',
      border: '1px solid ' + (allPass ? 'rgba(10,128,86,0.32)' : 'rgba(184,54,75,0.32)'),
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{
          width: 22, height: 22, borderRadius: 999, flexShrink: 0,
          background: allPass ? '#0a8056' : '#b8364b', color: '#fff',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700,
        }}>{allPass ? '✓' : '✗'}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: allPass ? '#0a8056' : '#b8364b' }}>
            {allPass
              ? (isAr ? 'الدفعة مقبولة · ٥/٥ فحوصات' : 'Batch admitted · 5/5 checks pass')
              : (isAr ? 'الدفعة محجوبة' : 'Batch blocked')}
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--mal-mid)' }}>
            {isAr ? 'الطبقة ٣ · قبل الدفع' : 'Layer-3 admission · ran before pay-out'}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {checks.map((c, i) => (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '14px 1fr auto', gap: 6, alignItems: 'center',
            fontSize: 10.5,
          }}>
            <span style={{ color: c.pass ? '#0a8056' : '#b8364b', fontWeight: 700 }}>{c.pass ? '✓' : '✗'}</span>
            <span style={{ color: 'var(--mal-ink)' }}>{c.label}</span>
            <span style={{ fontFamily: 'var(--mal-font-mono)', color: 'var(--mal-mid)' }}>{c.result}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// HcRevolvingLine: top-of-home credit-facility card. Collapsed shows
// utilisation %; expanded shows tranche breakdown (standard + direct
// + denial-protection rider). Replaces per-batch advance once the
// provider crosses the volume threshold.
// ============================================================
function HcRevolvingLine({ isAr, open, onToggle, currentBatchAdvanced }) {
  const limit = 2000000;
  const baseUsed = 1140000;       // historic batches already advanced
  const used = baseUsed + Math.round(currentBatchAdvanced || 0);
  const utilPct = Math.round((used / limit) * 100);
  return (
    <div style={{
      padding: 12, borderRadius: 12,
      background: 'var(--mal-paper)',
      border: '1px solid var(--mal-line)',
    }}>
      <div onClick={onToggle} style={{
        display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
      }}>
        <span style={{ fontSize: 14 }}>🪙</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--mal-ink)' }}>
            {isAr ? 'خط مال للسيولة العاملة' : 'Mal Working Capital Line'}
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--mal-mid)', marginTop: 1 }}>
            AED {Math.round(used / 1000)}K {isAr ? 'مستخدم' : 'used'} / AED {Math.round(limit / 1000)}K {isAr ? 'حدّ' : 'limit'}
          </div>
        </div>
        <span style={{
          fontSize: 11, fontFamily: 'var(--mal-font-mono)', color: utilPct > 80 ? '#b06a14' : '#0a8056',
          fontWeight: 700,
        }}>{utilPct}%</span>
        <span style={{ color: 'var(--mal-mid-2)', fontSize: 10 }}>{open ? '▾' : '▸'}</span>
      </div>
      {/* Utilisation bar */}
      <div style={{ height: 4, marginTop: 8, background: 'var(--mal-line)', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ width: utilPct + '%', height: '100%', background: utilPct > 80 ? '#b06a14' : '#0a8056', transition: 'width .4s' }}/>
      </div>
      {open && (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 10.5, color: 'var(--mal-ink)' }}>
          {[
            { lab: isAr ? 'دفعات سابقة (٧ دفعات)' : 'Historic batches (7)', val: 'AED 1.14M' },
            { lab: isAr ? 'الدفعة الحالية' : 'Current batch', val: 'AED ' + Math.round((currentBatchAdvanced || 0) / 1000) + 'K' },
            { lab: isAr ? 'متاح' : 'Available', val: 'AED ' + Math.round((limit - used) / 1000) + 'K' },
          ].map((r, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--mal-mid)' }}>{r.lab}</span>
              <span style={{ fontFamily: 'var(--mal-font-mono)', fontWeight: 500 }}>{r.val}</span>
            </div>
          ))}
          <div style={{
            marginTop: 6, padding: '6px 8px', borderRadius: 8,
            background: 'rgba(10,128,86,0.10)', color: '#0a8056',
            fontSize: 10, lineHeight: 1.5,
          }}>
            {isAr
              ? 'الفائدة الصافية ١٢٪/سنة على الرصيد المسحوب · إعادة استخدام تلقائي عند التسوية'
              : '12% p.a. on drawn balance · auto-replenishes as insurers settle · evergreen facility'}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// HcProviderScorecard: small 4-KPI strip showing the clinic's own
// performance vs Mal's network median. Drives provider-side stickiness
// (Mal becomes their performance dashboard, not just their lender).
// ============================================================
function HcProviderScorecard({ isAr }) {
  const kpis = [
    { lab: isAr ? 'رفض' : 'Denial rate', val: '4.2%', sub: 'net 8.1%', good: true },
    { lab: isAr ? 'دورة' : 'Avg cycle',  val: '39d',  sub: 'net 52d',  good: true },
    { lab: isAr ? 'دقّة الترميز' : 'Coding',   val: '96%',  sub: '+12pp', good: true },
    { lab: isAr ? 'الفئة' : 'Mal tier',    val: 'A',    sub: 'top 18%', good: true },
  ];
  return (
    <div style={{
      padding: '10px 12px', borderRadius: 12,
      background: 'var(--mal-paper)', border: '1px solid var(--mal-line)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <span style={{ fontSize: 12 }}>📊</span>
        <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--mal-mid)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
          {isAr ? 'بطاقة أداء المركز' : 'Provider scorecard'}
        </div>
        <span style={{ marginInlineStart: 'auto', fontSize: 9.5, color: 'var(--mal-mid-2)' }}>
          {isAr ? 'مقابل متوسط الشبكة' : 'vs network median'}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
        {kpis.map((k) => (
          <div key={k.lab} style={{
            padding: '6px 8px', borderRadius: 8,
            background: 'var(--mal-surface-2)',
          }}>
            <div style={{ fontSize: 9, color: 'var(--mal-mid-2)', textTransform: 'uppercase', letterSpacing: '.04em' }}>{k.lab}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: k.good ? '#0a8056' : 'var(--mal-ink)', fontFamily: 'var(--mal-font-mono)' }}>{k.val}</div>
            <div style={{ fontSize: 9.5, color: 'var(--mal-mid)' }}>{k.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// HcPreAuthOrchestrator: full-screen modal showing 6 payer APIs
// hit in parallel for pending claims. Each payer animates from
// "Querying" → "Response received · approved/refer". Mal's wedge
// vs Klaim and Cedar: aggregating all 6 UAE payers under one call.
// ============================================================
function HcPreAuthOrchestrator({ isAr, pendingClaims, onClose }) {
  const [statuses, setStatuses] = hS(() => Object.fromEntries(PAYER_KEYS_ORDER.map((k) => [k, 'idle'])));
  // Trigger sequential responses for each payer
  hE(() => {
    const order = PAYER_KEYS_ORDER;
    let cancelled = false;
    setStatuses(Object.fromEntries(order.map((k) => [k, 'querying'])));
    order.forEach((k, i) => {
      setTimeout(() => {
        if (cancelled) return;
        // ADNIC (matches our pending claim) returns approved; others "no pending"
        const verdict = k === 'adnic' ? 'approved' : 'no-pending';
        setStatuses((s) => ({ ...s, [k]: verdict }));
      }, 600 + i * 350);
    });
    return () => { cancelled = true; };
  }, []);

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 80,
      background: 'rgba(15,17,23,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        maxWidth: 520, width: '100%',
        background: 'var(--mal-paper)', borderRadius: 18,
        boxShadow: '0 24px 80px rgba(0,0,0,0.32)',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        animation: 'mal-fade-up .25s ease',
      }}>
        <div style={{
          padding: '14px 18px', borderBottom: '1px solid var(--mal-line)',
          display: 'flex', alignItems: 'flex-start', gap: 10,
          background: 'linear-gradient(135deg, rgba(176,106,20,0.10), transparent)',
        }}>
          <div style={{ flex: 1 }}>
            <div className="mal-caption" style={{ color: '#b06a14' }}>
              {isAr ? 'منسّق الموافقة المسبقة' : 'Pre-auth orchestrator'}
            </div>
            <div style={{ fontFamily: 'var(--mal-font-display)', fontStyle: 'italic', fontSize: 22, lineHeight: 1.2, marginTop: 4 }}>
              {isAr ? 'استعلام موازٍ · ٦ شركات تأمين' : '6 payers · queried in parallel'}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--mal-mid)', marginTop: 4 }}>
              {pendingClaims.length} {isAr ? 'مطالبة بانتظار الموافقة' : pendingClaims.length === 1 ? 'claim awaiting approval' : 'claims awaiting approval'}
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{
            all: 'unset', cursor: 'pointer',
            width: 28, height: 28, borderRadius: 999,
            background: 'var(--mal-surface-2)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
        </div>

        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {PAYER_KEYS_ORDER.map((k) => {
            const p = PAYERS[k];
            const st = statuses[k] || 'idle';
            const stTone = st === 'approved' ? '#0a8056'
                         : st === 'no-pending' ? 'var(--mal-mid)'
                         : '#b06a14';
            const stLabel = st === 'idle' ? (isAr ? 'في الانتظار' : 'Idle')
                         : st === 'querying' ? (isAr ? 'استعلام جارٍ…' : 'Querying API…')
                         : st === 'approved' ? (isAr ? '✓ موافقة سُلِّمت' : '✓ Approval received')
                         : (isAr ? 'لا توجد معلَّقة' : 'No pending claim');
            return (
              <div key={k} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 10,
                background: st === 'approved' ? 'rgba(10,128,86,0.08)' : 'var(--mal-surface-2)',
                border: '1px solid ' + (st === 'approved' ? 'rgba(10,128,86,0.32)' : 'var(--mal-line)'),
              }}>
                <span style={{
                  width: 36, height: 28, borderRadius: 6,
                  background: p.tone, color: '#fff',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 10.5, fontFamily: 'var(--mal-font-mono)',
                }}>{p.short}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>{p.name}</div>
                  <div style={{ fontSize: 10.5, color: stTone, marginTop: 1 }}>{stLabel}</div>
                </div>
                {st === 'querying' && (
                  <div style={{
                    width: 14, height: 14, borderRadius: 999,
                    border: '2px solid var(--mal-line)',
                    borderTopColor: '#b06a14',
                    animation: 'mal-api-spin .8s linear infinite',
                  }}/>
                )}
                {st === 'approved' && (
                  <span style={{
                    fontSize: 10, padding: '2px 7px', borderRadius: 999,
                    background: '#0a8056', color: '#fff',
                    fontWeight: 700, letterSpacing: '.04em',
                  }}>PA-ADN-89215</span>
                )}
              </div>
            );
          })}

          <div style={{
            marginTop: 6, padding: '8px 12px', borderRadius: 10,
            background: 'var(--mal-primary-50)',
            border: '1px solid var(--mal-primary-3)',
            fontSize: 11, color: 'var(--mal-ink)', lineHeight: 1.55,
          }}>
            {isAr
              ? 'مال يُجمِّع ٦ شركات تأمين في استدعاء واحد. الموافقة في دقائق · من ساعات أو أيّام عبر بوّابات شركات التأمين الفرديّة.'
              : 'Mal aggregates all 6 UAE payers under one call. Approval in minutes — vs. hours-to-days when hitting payer portals individually.'}
          </div>
        </div>

        <div style={{
          padding: 12, borderTop: '1px solid var(--mal-line)',
          background: 'var(--mal-surface-2)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 10.5, color: 'var(--mal-mid)' }}>
            {isAr ? 'وقت الاستجابة' : 'Total time'}: <strong>3.2s</strong> · {isAr ? 'كان' : 'was'} ~4h
          </span>
          <button onClick={onClose} style={{
            all: 'unset', cursor: 'pointer',
            padding: '8px 14px', borderRadius: 999,
            background: 'var(--mal-ink)', color: '#FAF7EE',
            fontSize: 12, fontWeight: 600,
          }}>{isAr ? 'تم' : 'Done'}</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// HcCodingCopilot: LLM-style coding assistant. Paste clinical note,
// get suggested ICD/CPT codes + reasoning. Cedar/Olive equivalent
// but inside Mal so denial rates drop and Mal's exposure stays clean.
// ============================================================
function HcCodingCopilot({ isAr, onClose }) {
  const [note, setNote] = hS('45-yo male, T2DM, presenting with epigastric pain x 2 weeks. Endoscopy revealed antral gastritis, biopsies taken. H. pylori test pending. Patient on metformin + losartan. Discussed PPI therapy.');
  const [analysed, setAnalysed] = hS(false);
  const suggestions = [
    { code: '43239', sys: 'CPT', label: 'Upper GI endoscopy w/ biopsy', confidence: 96, reason: 'Endoscopy + biopsy explicit in note · highest match' },
    { code: 'K29.70',sys: 'ICD-10', label: 'Gastritis, unspecified, without bleeding', confidence: 92, reason: 'Antral gastritis confirmed; bleeding not noted' },
    { code: 'E11.9', sys: 'ICD-10', label: 'Type 2 diabetes mellitus without complications', confidence: 88, reason: 'Patient is T2DM, no complication code applicable from note' },
    { code: '99214', sys: 'CPT',   label: 'Office visit · established · moderate complexity', confidence: 84, reason: 'Documentation supports moderate complexity decision-making' },
  ];

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 80,
      background: 'rgba(15,17,23,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        maxWidth: 620, width: '100%', maxHeight: '92vh',
        background: 'var(--mal-paper)', borderRadius: 18,
        boxShadow: '0 24px 80px rgba(0,0,0,0.32)',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        animation: 'mal-fade-up .25s ease',
      }}>
        <div style={{
          padding: '14px 18px', borderBottom: '1px solid var(--mal-line)',
          display: 'flex', alignItems: 'flex-start', gap: 10,
          background: 'linear-gradient(135deg, var(--mal-primary-50), transparent)',
        }}>
          <div style={{ flex: 1 }}>
            <div className="mal-caption" style={{ color: 'var(--mal-primary)' }}>
              🧬 {isAr ? 'مساعد الترميز AI' : 'Coding co-pilot'}
            </div>
            <div style={{ fontFamily: 'var(--mal-font-display)', fontStyle: 'italic', fontSize: 22, lineHeight: 1.2, marginTop: 4 }}>
              {isAr ? 'الصق المُلاحظة · احصل على الأكواد' : 'Paste the clinical note. Get ICD + CPT.'}
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{
            all: 'unset', cursor: 'pointer',
            width: 28, height: 28, borderRadius: 999,
            background: 'var(--mal-surface-2)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
        </div>

        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
          <div>
            <div className="mal-caption" style={{ color: 'var(--mal-mid)', marginBottom: 4 }}>
              {isAr ? 'ملاحظة سريرية' : 'Clinical note'}
            </div>
            <textarea value={note} onChange={(e) => { setNote(e.target.value); setAnalysed(false); }} rows={5} style={{
              width: '100%', boxSizing: 'border-box',
              padding: 10, borderRadius: 10,
              border: '1px solid var(--mal-line)',
              background: 'var(--mal-surface-2)',
              fontFamily: 'var(--mal-font-ui)', fontSize: 12,
              lineHeight: 1.55, resize: 'vertical',
            }}/>
          </div>

          <button onClick={() => setAnalysed(true)} style={{
            all: 'unset', cursor: 'pointer', textAlign: 'center',
            padding: '10px 14px', borderRadius: 999,
            background: 'var(--mal-primary)', color: '#fff',
            fontSize: 12.5, fontWeight: 600,
          }}>
            {analysed ? (isAr ? 'أعد التحليل' : 'Re-analyse') : (isAr ? 'حلّل بالذكاء الاصطناعي →' : 'Analyse with AI →')}
          </button>

          {analysed && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div className="mal-caption" style={{ color: 'var(--mal-mid)' }}>
                {isAr ? `${suggestions.length} كود مقترح · مُرتَّب بالثقة` : `${suggestions.length} codes suggested · sorted by confidence`}
              </div>
              {suggestions.map((s, i) => (
                <div key={i} style={{
                  padding: '10px 12px', borderRadius: 10,
                  background: 'var(--mal-paper)', border: '1px solid var(--mal-line)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{
                      fontFamily: 'var(--mal-font-mono)', fontSize: 11,
                      padding: '2px 7px', borderRadius: 6,
                      background: s.sys === 'CPT' ? 'rgba(31,84,200,0.14)' : 'rgba(90,58,163,0.14)',
                      color: s.sys === 'CPT' ? '#1f54c8' : '#5a3aa3',
                      fontWeight: 700,
                    }}>{s.sys} {s.code}</span>
                    <span style={{ fontSize: 12.5, fontWeight: 600, flex: 1 }}>{s.label}</span>
                    <span style={{
                      fontSize: 10.5, fontFamily: 'var(--mal-font-mono)',
                      color: s.confidence >= 90 ? '#0a8056' : s.confidence >= 80 ? '#b06a14' : '#b8364b',
                      fontWeight: 700,
                    }}>{s.confidence}%</span>
                  </div>
                  <div style={{ fontSize: 10.5, color: 'var(--mal-mid)', lineHeight: 1.55 }}>{s.reason}</div>
                </div>
              ))}
              <div style={{
                marginTop: 4, padding: '8px 12px', borderRadius: 10,
                background: 'rgba(10,128,86,0.10)', border: '1px solid rgba(10,128,86,0.32)',
                fontSize: 11, color: 'var(--mal-ink)', lineHeight: 1.55,
              }}>
                {isAr
                  ? '✓ مرّر هذه الأكواد للنظام بنقرة واحدة · يقلّ معدّل الرفض ٣٥-٤٠٪ تجريبيّاً'
                  : '✓ One-tap apply to your PMS · drops denial rate 35-40% in piloting clinics'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


// ============================================================
// HcProviderUnderwrite — Layer-2 clinic underwriting screen.
// Shows the composite score, scoring inputs, tier, revolving limit,
// advance rate, fee. Approve & continue → batch.
// ============================================================
function HcProviderUnderwrite({ isAr, scenario, patch, onApprove }) {
  const uw = CLINIC_UW;
  return (
    <div className="mal-scroll" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, height: '100%', overflowY: 'auto' }}>
      <div className="mal-caption">{isAr ? 'لجنة الائتمان · مال' : 'Mal credit committee'}</div>
      <div className="mal-h1" style={{ fontSize: 22, marginTop: -2 }}>
        {isAr ? 'الضمان · المركز' : 'Clinic underwriting'}
      </div>

      {/* Composite score hero */}
      <div style={{
        padding: 14, borderRadius: 14,
        background: 'linear-gradient(135deg, #2A1F6F 0%, #1A1A28 100%)',
        color: '#fff', position: 'relative', overflow: 'hidden',
      }}>
        <div className="mal-orb" style={{ position: 'absolute', width: 200, height: 200, top: -90, insetInlineEnd: -80, opacity: .3 }}/>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 60, height: 60, borderRadius: 999,
            background: 'rgba(255,255,255,0.12)',
            border: '1px solid rgba(255,255,255,0.24)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--mal-font-display)', fontStyle: 'italic',
            fontSize: 26, fontWeight: 700,
          }}>{uw.composite}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10.5, opacity: .7, textTransform: 'uppercase', letterSpacing: '.06em' }}>
              {isAr ? 'الدرجة المركّبة' : 'Composite UW score'}
            </div>
            <div style={{ fontFamily: 'var(--mal-font-display)', fontStyle: 'italic', fontSize: 22, marginTop: 2 }}>
              {isAr ? 'فئة' : 'Tier'} {uw.tier} · {uw.facility}
            </div>
            <div style={{ fontSize: 10.5, opacity: .8, marginTop: 2 }}>
              {uw.licence.regulator} · {uw.licence.number} · {isAr ? 'صلاحية' : 'vintage'} {uw.licence.vintage}
            </div>
          </div>
        </div>
      </div>

      {/* Limit + advance + fee summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
        {[
          { lab: isAr ? 'حدّ متجدّد' : 'Revolving limit', val: 'AED ' + (uw.limit / 1000000).toFixed(1) + 'M', tone: 'var(--mal-primary)' },
          { lab: isAr ? 'نسبة السلفة' : 'Advance rate',  val: (uw.advancePct * 100).toFixed(0) + '%',      tone: '#0a8056' },
          { lab: isAr ? 'الرسم الأساسي' : 'Base fee',    val: (uw.feeBase * 100).toFixed(1) + '%',         tone: 'var(--mal-ink-2)' },
        ].map((k) => (
          <div key={k.lab} style={{
            padding: '8px 10px', borderRadius: 10,
            background: 'var(--mal-surface-2)', border: '1px solid var(--mal-line)',
          }}>
            <div style={{ fontSize: 9.5, color: 'var(--mal-mid-2)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{k.lab}</div>
            <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--mal-font-mono)', color: k.tone, marginTop: 2 }}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* Scoring breakdown */}
      <div style={{
        padding: 12, borderRadius: 12,
        background: 'var(--mal-paper)', border: '1px solid var(--mal-line)',
      }}>
        <div className="mal-caption" style={{ color: 'var(--mal-mid)', marginBottom: 6 }}>
          {isAr ? 'مدخلات التقييم' : 'Scoring inputs · weighted'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {uw.scoreInputs.map((row) => (
            <div key={row.lab} style={{
              display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 8, alignItems: 'center',
              padding: '6px 8px', borderRadius: 8,
              background: 'var(--mal-surface-2)',
            }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11.5, fontWeight: 600 }}>{row.lab}</div>
                <div style={{ fontSize: 10, color: 'var(--mal-mid)', marginTop: 1 }}>{row.sub}</div>
              </div>
              <div style={{ fontSize: 11.5, fontFamily: 'var(--mal-font-mono)', fontWeight: 600, color: '#0a8056' }}>{row.val}</div>
              <div style={{ fontSize: 9.5, color: 'var(--mal-mid-2)', fontFamily: 'var(--mal-font-mono)' }}>w {row.weight}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{
        padding: '8px 12px', borderRadius: 10,
        background: 'rgba(10,128,86,0.08)',
        border: '1px solid rgba(10,128,86,0.32)',
        fontSize: 11, color: 'var(--mal-ink)', lineHeight: 1.55,
      }}>
        ✓ {isAr
          ? `كل الحدود مُحترَمة · مراجعة دوريّة: ${uw.review}`
          : `All thresholds clear · review cadence: ${uw.review}`}
      </div>

      <button onClick={onApprove} style={{
        all: 'unset', cursor: 'pointer', textAlign: 'center',
        padding: '12px 0', borderRadius: 999,
        background: 'var(--mal-ink)', color: '#FAF7EE',
        fontSize: 13, fontWeight: 600,
      }}>
        {scenario.underwriteApproved
          ? (isAr ? 'تابع للرفع' : 'Continue to batch upload')
          : (isAr ? 'وافق وأصدر الحدّ' : 'Approve & issue limit')} →
      </button>
    </div>
  );
}

// ============================================================
// HcInsurerUnderwrite — Layer-1 insurer concentration policy view.
// Renders the 6 payers as cards with their book share, cap, advance
// cap, cycle cap. Shows utilisation vs cap so the concentration
// headroom is visible.
// ============================================================
function HcInsurerUnderwrite({ isAr }) {
  return (
    <div className="mal-scroll" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, height: '100%', overflowY: 'auto' }}>
      <div className="mal-caption">{isAr ? 'سياسة التركّز · شركات التأمين' : 'Concentration policy · insurers'}</div>
      <div className="mal-h1" style={{ fontSize: 22, marginTop: -2 }}>
        {isAr ? '٦ شركات · ٣ فئات' : '6 payers · 3 tiers'}
      </div>

      <div style={{
        padding: '8px 12px', borderRadius: 10,
        background: 'var(--mal-primary-50)', border: '1px solid var(--mal-primary-3)',
        fontSize: 11, lineHeight: 1.55,
      }}>
        {isAr
          ? 'كل شركة تأمين لها حدّ تركّز في محفظة مال. التصنيف يُحدِّد حصّة الكتاب القصوى ونسبة التقدّم والدورة المسموحة.'
          : 'Every insurer carries a book-concentration cap. Tier sets the maximum book share, advance rate, and cycle Mal will fund.'}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {INSURER_UW.map((i) => {
          const p = PAYERS[i.key];
          const utilPct = Math.round((i.bookShare / i.bookCap) * 100);
          const utilTone = utilPct >= 90 ? '#b8364b' : utilPct >= 70 ? '#b06a14' : '#0a8056';
          return (
            <div key={i.key} style={{
              padding: '10px 12px', borderRadius: 10,
              background: 'var(--mal-paper)',
              border: '1px solid var(--mal-line)',
              borderInlineStart: '3px solid ' + p.tone,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: p.tone }}>{p.name}</span>
                <span style={{
                  fontSize: 9.5, padding: '1px 6px', borderRadius: 999,
                  background: i.tier === 'A' ? 'rgba(10,128,86,0.14)' : i.tier === 'B' ? 'rgba(176,106,20,0.14)' : 'rgba(184,54,75,0.14)',
                  color: i.tier === 'A' ? '#0a8056' : i.tier === 'B' ? '#b06a14' : '#b8364b',
                  fontWeight: 700, letterSpacing: '.04em',
                }}>{isAr ? 'فئة' : 'Tier'} {i.tier}</span>
                <span style={{ marginInlineStart: 'auto', fontSize: 9.5, color: 'var(--mal-mid-2)', fontFamily: 'var(--mal-font-mono)' }}>
                  S&P {i.rating}
                </span>
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--mal-mid)', marginBottom: 6 }}>{i.notes}</div>
              {/* Utilisation bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--mal-mid)', marginBottom: 3 }}>
                <span>{isAr ? 'حصّة الكتاب' : 'Book share'} <strong style={{ color: 'var(--mal-ink)' }}>{(i.bookShare * 100).toFixed(0)}%</strong></span>
                <span>{isAr ? 'حدّ' : 'cap'} {(i.bookCap * 100).toFixed(0)}% · <span style={{ color: utilTone, fontWeight: 700 }}>{utilPct}% util</span></span>
              </div>
              <div style={{ height: 4, background: 'var(--mal-line)', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ width: utilPct + '%', height: '100%', background: utilTone, transition: 'width .4s' }}/>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 6, fontSize: 10, color: 'var(--mal-mid)' }}>
                <span>{isAr ? 'حد التقدّم' : 'Advance cap'} <strong style={{ color: 'var(--mal-ink)' }}>{(i.advanceCap * 100).toFixed(0)}%</strong></span>
                <span>·</span>
                <span>{isAr ? 'الدورة' : 'Cycle cap'} <strong style={{ color: 'var(--mal-ink)' }}>{i.cycleCap}d</strong></span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// HcRiskHub — Mal credit-committee view, opened from the central
// column. 3 tabs: Portfolio, Policy, Rate Card.
//   Portfolio · book by insurer with utilisation + by-clinic top-5
//   Policy    · the three-layer framework + EWS triggers
//   Rate card · pricing matrix by tier × pre-auth × insurer
// ============================================================
function HcRiskHub({ isAr, scenario, claimStates, totals, tab, onTab, onClose }) {
  const tabs = [
    { id: 'portfolio', label: isAr ? 'المحفظة' : 'Portfolio' },
    { id: 'policy',    label: isAr ? 'السياسة' : 'Policy' },
    { id: 'ratecard',  label: isAr ? 'الأسعار' : 'Rate card' },
  ];

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 80,
      background: 'rgba(15,17,23,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        maxWidth: 760, width: '100%', maxHeight: '92vh',
        background: 'var(--mal-paper)', borderRadius: 18,
        boxShadow: '0 24px 80px rgba(0,0,0,0.32)',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        animation: 'mal-fade-up .25s ease',
      }}>
        {/* Header */}
        <div style={{
          padding: '14px 18px', borderBottom: '1px solid var(--mal-line)',
          display: 'flex', alignItems: 'flex-start', gap: 10,
          background: 'linear-gradient(135deg, #2A1F6F 0%, #1A1A28 100%)',
          color: '#fff',
        }}>
          <div style={{ flex: 1 }}>
            <div className="mal-caption" style={{ opacity: 0.7 }}>🛡 {isAr ? 'مركز مخاطر مال' : 'Mal Risk Hub'}</div>
            <div style={{ fontFamily: 'var(--mal-font-display)', fontStyle: 'italic', fontSize: 22, lineHeight: 1.2, marginTop: 4 }}>
              {isAr ? 'محفظة · سياسة · أسعار' : 'Portfolio · Policy · Rate card'}
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{
            all: 'unset', cursor: 'pointer',
            width: 28, height: 28, borderRadius: 999,
            background: 'rgba(255,255,255,0.12)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', gap: 6, padding: '10px 14px 0',
          borderBottom: '1px solid var(--mal-line)',
          background: 'var(--mal-surface-2)',
        }}>
          {tabs.map((t) => (
            <button key={t.id} onClick={() => onTab(t.id)} style={{
              all: 'unset', cursor: 'pointer',
              padding: '7px 14px', borderRadius: '10px 10px 0 0',
              fontSize: 12, fontWeight: tab === t.id ? 700 : 500,
              color: tab === t.id ? 'var(--mal-primary)' : 'var(--mal-mid)',
              borderBottom: '2px solid ' + (tab === t.id ? 'var(--mal-primary)' : 'transparent'),
              marginBottom: -1,
            }}>{t.label}</button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 18 }}>
          {tab === 'portfolio' && <HcRiskHubPortfolio isAr={isAr} scenario={scenario} totals={totals} claimStates={claimStates}/>}
          {tab === 'policy'    && <HcRiskHubPolicy    isAr={isAr}/>}
          {tab === 'ratecard'  && <HcRiskHubRateCard  isAr={isAr}/>}
        </div>
      </div>
    </div>
  );
}

function HcRiskHubPortfolio({ isAr, scenario, totals, claimStates }) {
  // Simulated book-level numbers (the active batch is one slice of it).
  const bookFace = 84000000;          // AED 84M book
  const bookOutstanding = 31500000;   // AED 31.5M outstanding
  const bookEws = 2;                  // 2 EWS triggers firing
  const topClinics = [
    { name: 'Crescent Medical Center', tier: 'A', exposure: 1450000, denial: '4.2%' },
    { name: 'Al Noor Polyclinic',      tier: 'A', exposure: 1180000, denial: '5.1%' },
    { name: 'Bayan Dental Group',      tier: 'B', exposure:  920000, denial: '7.4%' },
    { name: 'Reem Diagnostics',        tier: 'A', exposure:  860000, denial: '3.9%' },
    { name: 'Dubai Eye Specialists',   tier: 'B', exposure:  640000, denial: '6.8%' },
  ];
  const ews = [
    { code: 'INS · ADNIC', tone: '#b06a14', msg: isAr ? 'تأخّر ٤ أيام عن الدورة المتوقَّعة' : '4-day slippage vs forecast cycle' },
    { code: 'CLN · Bayan Dental', tone: '#b06a14', msg: isAr ? 'معدّل الرفض ارتفع ٢.٣ نقطة هذا الشهر' : 'denial rate up 2.3pp this month' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Book summary strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        {[
          { lab: isAr ? 'الكتاب الإجمالي' : 'Book face',      val: 'AED ' + (bookFace / 1000000).toFixed(0) + 'M', tone: 'var(--mal-mid)' },
          { lab: isAr ? 'المتبقّي' : 'Outstanding',           val: 'AED ' + (bookOutstanding / 1000000).toFixed(1) + 'M', tone: 'var(--mal-primary)' },
          { lab: isAr ? 'العائد المتوقّع (٩٠ي)' : 'Yield 90d', val: '3.1%', tone: '#0a8056' },
          { lab: isAr ? 'إنذارات نشطة' : 'EWS firing',         val: String(bookEws), tone: '#b06a14' },
        ].map((k) => (
          <div key={k.lab} style={{
            padding: '8px 10px', borderRadius: 10,
            background: 'var(--mal-surface-2)', border: '1px solid var(--mal-line)',
          }}>
            <div style={{ fontSize: 9.5, color: 'var(--mal-mid-2)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{k.lab}</div>
            <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--mal-font-mono)', color: k.tone, marginTop: 2 }}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* By-insurer concentration */}
      <div>
        <div className="mal-caption" style={{ color: 'var(--mal-mid)', marginBottom: 6 }}>
          {isAr ? 'التركّز · حسب شركة التأمين' : 'Concentration · by insurer'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {INSURER_UW.map((i) => {
            const p = PAYERS[i.key];
            const utilPct = Math.round((i.bookShare / i.bookCap) * 100);
            const utilTone = utilPct >= 90 ? '#b8364b' : utilPct >= 70 ? '#b06a14' : '#0a8056';
            return (
              <div key={i.key} style={{
                display: 'grid', gridTemplateColumns: '90px 1fr 80px', gap: 10, alignItems: 'center',
                padding: '6px 10px', borderRadius: 8,
                background: 'var(--mal-surface-2)',
                borderInlineStart: '3px solid ' + p.tone,
              }}>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: p.tone }}>{p.name}</div>
                <div>
                  <div style={{ height: 6, background: 'var(--mal-line)', borderRadius: 999, overflow: 'hidden', position: 'relative' }}>
                    <div style={{ width: (i.bookShare * 100 / i.bookCap * 100) * 0.6 + '%', height: '100%', background: utilTone, transition: 'width .4s' }}/>
                  </div>
                </div>
                <div style={{ textAlign: 'end', fontSize: 10.5, fontFamily: 'var(--mal-font-mono)' }}>
                  <span style={{ color: 'var(--mal-ink)', fontWeight: 600 }}>{(i.bookShare * 100).toFixed(0)}%</span>
                  <span style={{ color: 'var(--mal-mid-2)' }}> / {(i.bookCap * 100).toFixed(0)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top-5 clinics by exposure */}
      <div>
        <div className="mal-caption" style={{ color: 'var(--mal-mid)', marginBottom: 6 }}>
          {isAr ? 'أعلى ٥ مراكز · حسب التعرّض' : 'Top 5 clinics · by exposure'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {topClinics.map((c) => (
            <div key={c.name} style={{
              display: 'grid', gridTemplateColumns: '1fr 60px 90px 60px', gap: 8, alignItems: 'center',
              padding: '6px 10px', borderRadius: 8,
              background: 'var(--mal-paper)', border: '1px solid var(--mal-line)',
            }}>
              <span style={{ fontSize: 11.5, fontWeight: 600 }}>{c.name}</span>
              <span style={{
                fontSize: 9.5, padding: '1px 6px', borderRadius: 999,
                background: c.tier === 'A' ? 'rgba(10,128,86,0.14)' : 'rgba(176,106,20,0.14)',
                color: c.tier === 'A' ? '#0a8056' : '#b06a14',
                fontWeight: 700, justifySelf: 'start',
              }}>{c.tier}</span>
              <span style={{ fontSize: 11, fontFamily: 'var(--mal-font-mono)', textAlign: 'end' }}>
                AED {(c.exposure / 1000).toFixed(0)}K
              </span>
              <span style={{ fontSize: 10, color: 'var(--mal-mid)', textAlign: 'end' }}>{c.denial}</span>
            </div>
          ))}
        </div>
      </div>

      {/* EWS triggers */}
      <div>
        <div className="mal-caption" style={{ color: 'var(--mal-mid)', marginBottom: 6 }}>
          {isAr ? 'إنذارات مبكّرة · نشطة' : 'Early-warning triggers · live'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {ews.map((e, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '7px 10px', borderRadius: 8,
              background: e.tone + '14',
              border: '1px solid ' + e.tone + '40',
            }}>
              <span style={{ fontSize: 12 }}>⚠️</span>
              <span style={{ fontSize: 10, fontFamily: 'var(--mal-font-mono)', fontWeight: 700, color: e.tone }}>{e.code}</span>
              <span style={{ fontSize: 11, color: 'var(--mal-ink)' }}>{e.msg}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HcRiskHubPolicy({ isAr }) {
  const layers = [
    {
      n: 1,
      title: isAr ? 'الطبقة ١ · تركّز شركات التأمين' : 'Layer 1 · Insurer concentration',
      desc: isAr
        ? 'حدود الكتاب القصوى لكل شركة تأمين · يحمي مال من تجميد دفعات شركة واحدة.'
        : 'Top-down book caps per insurer. Protects Mal from a single payer freezing its book.',
      rules: ['Tier A ≤ 30% book · advance ≤ 95% · cycle ≤ 90d',
              'Tier B ≤ 15% book · advance ≤ 88% · cycle ≤ 60d',
              'Tier C ≤ 5%  book · advance ≤ 80% · cycle ≤ 30d',
              'Quarterly re-rating off CBUAE pay-cycle stats + S&P / AM Best'],
    },
    {
      n: 2,
      title: isAr ? 'الطبقة ٢ · حدّ المركز' : 'Layer 2 · Clinic revolving limit',
      desc: isAr
        ? 'القرار الائتماني الفعلي · درجة مركَّبة → فئة → حدّ متجدّد.'
        : 'The actual credit decision. Composite score → tier → revolving line.',
      rules: ['Licence vintage + regulator (DOH / DHA / MOH)',
              '12-month denial rate (>8% = decline)',
              '12-month collection cycle (>65d = haircut)',
              'Coding accuracy + UBO / KYC + premises type + peer LGD',
              'Limit tiers: AED 250k → 10M · 12-month review · monthly soft-pull'],
    },
    {
      n: 3,
      title: isAr ? 'الطبقة ٣ · قبول الدفعة' : 'Layer 3 · Per-batch admission',
      desc: isAr
        ? 'فحص الدفعة قبل التقدّم · يمنع التركّز السيئ والاحتيال.'
        : 'Pre-pay-out check on every batch. Stops concentration and fraud.',
      rules: BATCH_ADMISSION_RULES.map((r) => r.label),
    },
    {
      n: 0,
      title: isAr ? 'مُتقاطع · إنذار مبكّر' : 'Cross-cutting · Early warning',
      desc: isAr
        ? 'مُحفِّزات تُوقِف السلف الجديدة وتُكرّم الالتزامات القائمة.'
        : 'Triggers that pause new advances while honouring committed ones.',
      rules: ['Denial-rate breach · insurer slippage >5 days',
              'Regulator notice · bank-account change',
              'Patient-complaint spike · audit notice',
              'Loss waterfall: clinic recourse → rider reserve → book'],
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{
        padding: '10px 12px', borderRadius: 10,
        background: 'var(--mal-primary-50)', border: '1px solid var(--mal-primary-3)',
        fontSize: 11, lineHeight: 1.6, color: 'var(--mal-ink)',
      }}>
        {isAr
          ? 'سياسة مال للمخاطر تعمل على ثلاث طبقات. الطبقة ١ تحمي من تركّز شركات التأمين. الطبقة ٢ هي القرار الائتماني للمراكز. الطبقة ٣ فلتر الدفعة قبل الدفع.'
          : 'Mal\'s risk policy operates in three layers. Layer 1 caps insurer concentration. Layer 2 is the credit decision per clinic. Layer 3 filters every batch before advance.'}
      </div>

      {layers.map((L) => (
        <div key={L.n} style={{
          padding: 12, borderRadius: 12,
          background: 'var(--mal-paper)', border: '1px solid var(--mal-line)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{
              width: 22, height: 22, borderRadius: 999,
              background: L.n === 0 ? '#b06a14' : 'var(--mal-primary)',
              color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700,
            }}>{L.n === 0 ? '⚠' : L.n}</span>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{L.title}</div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--mal-mid)', lineHeight: 1.55, marginBottom: 6 }}>{L.desc}</div>
          <ul style={{ margin: 0, paddingInlineStart: 18, fontSize: 11, lineHeight: 1.65 }}>
            {L.rules.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>
      ))}
    </div>
  );
}

function HcRiskHubRateCard({ isAr }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{
        padding: '10px 12px', borderRadius: 10,
        background: 'var(--mal-primary-50)', border: '1px solid var(--mal-primary-3)',
        fontSize: 11, lineHeight: 1.55,
      }}>
        {isAr
          ? 'السعر دالّة لفئة المركز × فئة شركة التأمين × حالة الموافقة المسبقة. كل سطر يظهر للعميل في صفحة المطالبة.'
          : 'Price is a function of clinic tier × insurer tier × pre-auth status. Every row is shown to the provider on the claim page.'}
      </div>

      <div style={{
        borderRadius: 12, overflow: 'hidden',
        border: '1px solid var(--mal-line)',
      }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 70px 70px 90px', gap: 0,
          padding: '8px 12px',
          background: 'var(--mal-surface-2)',
          fontSize: 10, fontWeight: 700, color: 'var(--mal-mid)', textTransform: 'uppercase', letterSpacing: '.06em',
        }}>
          <span>{isAr ? 'الصفّ' : 'Row'}</span>
          <span style={{ textAlign: 'end' }}>{isAr ? 'سلفة' : 'Advance'}</span>
          <span style={{ textAlign: 'end' }}>{isAr ? 'رسم' : 'Fee'}</span>
          <span style={{ textAlign: 'end' }}>{isAr ? 'دورة' : 'Cycle'}</span>
        </div>
        {RATE_CARD.map((r, i) => (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '1fr 70px 70px 90px', gap: 0,
            padding: '9px 12px',
            background: i % 2 ? 'var(--mal-paper)' : 'transparent',
            borderTop: '1px solid var(--mal-line)',
            fontSize: 11, alignItems: 'center',
          }}>
            <span style={{ color: 'var(--mal-ink)' }}>{r.row}</span>
            <span style={{ textAlign: 'end', fontFamily: 'var(--mal-font-mono)', color: '#0a8056', fontWeight: 600 }}>{r.advance}</span>
            <span style={{ textAlign: 'end', fontFamily: 'var(--mal-font-mono)', color: 'var(--mal-primary)', fontWeight: 600 }}>{r.fee}</span>
            <span style={{ textAlign: 'end', fontFamily: 'var(--mal-font-mono)', color: 'var(--mal-mid)' }}>{r.cycle}</span>
          </div>
        ))}
      </div>

      <div style={{
        padding: '8px 12px', borderRadius: 10,
        background: 'rgba(10,128,86,0.08)', border: '1px solid rgba(10,128,86,0.32)',
        fontSize: 10.5, lineHeight: 1.55, color: 'var(--mal-ink)',
      }}>
        {isAr
          ? '✓ السعر النهائي مساوٍ للقاعدة + (١-معدّل الاسترداد × مضاعف فئة شركة التأمين) + (دورة × كلفة التمويل) + التشغيل.'
          : '✓ Final fee = base + (1 - recovery × insurer-tier multiplier) + (cycle × cost-of-funds) + ops load.'}
      </div>
    </div>
  );
}


// ============================================================
// HcTimelineSidebar — floating vertical dotnav, mirrors P1's
// DemoTimelineSidebar so the two products share the same phase-nav
// idiom. Pinned to the left edge, fades up on hover, each dash
// tooltips its label.
// ============================================================
function HcTimelineSidebar({ phase, setPhase }) {
  const idx = HC_PHASES.findIndex((p) => p.id === phase);
  return (
    <nav className="mal-dotnav" aria-label="Phase navigation">
      {HC_PHASES.map((p, i) => {
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

window.HealthcareDemo = HealthcareDemo;
