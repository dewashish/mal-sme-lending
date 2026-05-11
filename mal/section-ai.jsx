/* eslint-disable */
// Section 4. AI Initiatives
// Mal-specific AI architecture, surfaced from Strategy Appendix B
// (the 20-agent swarm) + Appendix C (decision engine, early-warning
// system, AI-driven collections). All diagrams are interactive
// where the user can click into a node, scrub a slider, or watch
// an animated decision flow.

const { useState: aiS, useEffect: aiE, useRef: aiR, useMemo: aiM, useCallback: aiCB } = React;
const aiIco = window.MalIcon;

// ============================================================
// Agent inventory (20 agents grouped by lifecycle domain)
// ============================================================
const AGENT_DOMAINS = [
  {
    id: 'origination', label: 'Origination & onboarding', color: 'lilac',
    agents: [
      { id: 'kyc',    name: 'KYC Verifier',           role: 'Liveness, ID, beneficial-owner ladder', input: 'Emirates ID + facial scan',   output: 'KYC dossier · pass/refer/fail' },
      { id: 'aecb',   name: 'AECB Bureau Puller',     role: 'Hits AECB · scores both buyer + linked SMEs', input: 'Trade licence + ID',            output: 'Bureau report + tradeline graph' },
      { id: 'ocr',    name: 'Document Extractor',     role: 'Trade licences, MOA, audited statements (OCR)', input: 'PDF / image',                  output: 'Structured JSON · 96% F1' },
      { id: 'cashf',  name: 'Cashflow Analyser',      role: 'Pulls bank statements via UAE Open Finance', input: '3-12 mo statements',                  output: '12 ratios + DSCR + seasonality' },
    ],
  },
  {
    id: 'underwriting', label: 'Underwriting & decisioning', color: 'coral',
    agents: [
      { id: 'fraud',  name: 'Fraud Sentinel',         role: 'Device, network, behavioural, dup-Emirates-ID', input: 'Application + device fingerprint',   output: 'Fraud score + reason codes' },
      { id: 'invvet', name: 'Invoice Validator',      role: 'EmaraTax e-invoice match · duplicate detection', input: 'XML invoice + buyer XRef',           output: 'Authentic / duplicate / fabricated' },
      { id: 'dec',    name: 'Decision Engine',        role: 'Multi-model orchestrator · LightGBM + LLM rationale', input: 'Bureau + cashflow + invoice + fraud', output: 'Approve/refer/decline · limit · price' },
      { id: 'price',  name: 'Pricing Optimiser',      role: 'Risk-priced APR per plan, dynamic on supply-demand', input: 'Decision + funding stack state',     output: 'Per-plan APR ladder' },
    ],
  },
  {
    id: 'servicing', label: 'Servicing & collections', color: 'ink',
    agents: [
      { id: 'sched',  name: 'Schedule Builder',       role: 'EMI ladder · holiday-aware due-date hopping', input: 'Approved limit + tenor + plan',     output: 'Amortisation schedule' },
      { id: 'dunning',name: 'Dunning Orchestrator',   role: 'Pre-due nudges → DPD ladder → handoff', input: 'Payment events + DPD',              output: 'Action queue · channel · script' },
      { id: 'extend', name: 'Extension Recommender',  role: 'Predicts pay-30 → 6-mo extension demand', input: 'Behaviour + cashflow stress',        output: 'Pre-emptive extension offer' },
      { id: 'colvoice',name:'AI Collections Voice',   role: 'Bilingual (Ar/En) calls · empathetic · scripted', input: 'DPD bucket + customer profile',  output: 'Promise-to-pay · audio + transcript' },
    ],
  },
  {
    id: 'operations', label: 'Operations & finance', color: 'peach',
    agents: [
      { id: 'recon',  name: 'Reconciliation Agent',   role: 'Matches wires to invoices · auto-clears 92%+', input: 'Bank feed + invoice ledger',         output: 'Cleared / break / exception' },
      { id: 'settle', name: 'Settlement Router',      role: '4-hr SWIFT for AED/USD · multi-bank failover', input: 'Approved disbursement',              output: 'UETR + status timeline' },
      { id: 'audit',  name: 'Audit Trail Composer',   role: 'Immutable hash-chain of every state change', input: 'Event stream',                       output: 'Regulator-ready audit pack' },
      { id: 'anom',   name: 'Anomaly Detector',       role: 'Volume/velocity/geography out-of-pattern', input: 'Settlement & ledger streams',         output: 'Alert + drill-down' },
    ],
  },
  {
    id: 'risk', label: 'Risk · compliance · CX', color: 'iri',
    agents: [
      { id: 'sanc',   name: 'Sanctions Screener',     role: 'OFAC/UN/UAE Local · live re-screen on event', input: 'Counterparty list',                  output: 'Hit / clear · review queue' },
      { id: 'ews',    name: 'Early-Warning Sentinel', role: '32-feature signal · forecast next 14 days', input: 'Cashflow + behaviour + bureau Δ',    output: 'Risk score 0-100 + drivers' },
      { id: 'shar',   name: 'Sharia Validator',       role: 'Murabaha/Tawarruq compliance gate', input: 'Loan structure',                     output: 'Compliant / blocked + Sharia-board memo' },
      { id: 'cx',     name: 'Bilingual CX Co-pilot',  role: 'In-app help · doc Q&A · status lookups (Ar/En)', input: 'User query + customer record',       output: 'Grounded answer + citations' },
    ],
  },
];

// Flat helpers
const ALL_AGENTS = AGENT_DOMAINS.flatMap((d) => d.agents.map((a) => ({ ...a, domain: d.id, color: d.color })));
const AGENT_BY_ID = Object.fromEntries(ALL_AGENTS.map((a) => [a.id, a]));

// ============================================================
// Top-level. Long-form scroll, mirrors Strategy section style
// ============================================================
const AI_TOC = [
  { id: 'aiHero',       label: 'Overview' },
  { id: 'aiInventory',  label: '20-agent inventory' },
  { id: 'aiLifecycle',  label: 'Use cases by stage' },
  { id: 'aiArch',       label: 'Architecture' },
  { id: 'aiDecision',   label: 'Decision engine' },
  { id: 'aiPricing',    label: 'Dynamic pricing' },
  { id: 'aiEws',        label: 'Early-warning system' },
  { id: 'aiCollect',    label: 'AI collections' },
  { id: 'aiData',       label: 'Data + governance' },
  { id: 'aiRoadmap',    label: 'Roadmap' },
];

// Color palette for the model-family chips used in the lifecycle table.
const MODEL_FAMILIES = {
  document:       { label: 'Document AI',      color: '#1f54c8' },
  identity:       { label: 'Identity / fraud', color: '#b8364b' },
  scoring:        { label: 'Scoring',          color: '#5a3aa3' },
  propensity:     { label: 'Propensity',       color: '#b06a14' },
  recommendation: { label: 'Recommendation',   color: '#0a8056' },
  conversational: { label: 'Conversational',   color: '#088379' },
  optimization:   { label: 'Optimisation',     color: '#7c5fb8' },
};

// Use cases mapped to lifecycle stages. Each row: what we're solving,
// how we'd tackle it, the KPIs, success target, and methodology.
const LIFECYCLE_STAGES_DATA = [
  {
    key: 'acq',
    stage: 'Acquisition',
    badge: '01',
    tone: '#1f54c8',
    summary: 'Find SMEs likely to qualify and convert. Before they raise their hand.',
    cases: [
      {
        useCase: 'Pre-qualification scoring',
        family: 'scoring',
        approach: 'Score every operating-account holder weekly on revenue trend, balance, delinquency, days-since-last-overdraft and bureau (where available). Push an in-app "you may be eligible" notification. Soft pull, no commitment.',
        kpis: ['Notification CTR', 'Soft-pull → application rate', 'Cost per qualified lead'],
        success: '≥ 12% CTR · ≥ 25% pre-qual → application · CAC < AED 350',
        method: 'LightGBM on transaction features · weekly batch · SHAP attribution',
      },
      {
        useCase: 'Look-alike audience',
        family: 'recommendation',
        approach: 'Encode top-RAROC, low-loss customers into a feature embedding; match other SMEs by cosine similarity and push hashed audiences to ad platforms.',
        kpis: ['Look-alike CAC vs broad', 'Approval rate of look-alike leads', 'LTV-weighted CPA'],
        success: '40% lower CAC · 1.6× approval rate · LTV-CPA ratio ≥ 4.5',
        method: 'Customer-embedding model + cosine ranking · Meta / Google / TikTok Custom Audiences',
      },
      {
        useCase: 'Channel attribution & mix',
        family: 'optimization',
        approach: 'Multi-touch attribution across ad → app-visit → form-start → submit, weighted by 12-mo LTV. Steers spend toward channels that yield high-RAROC SMEs, not just cheap leads.',
        kpis: ['Channel ROAS', 'LTV-weighted CPA', 'Channel-mix-corrected CAC'],
        success: 'Blended ROAS ≥ 3.5× by Year 2',
        method: 'Markov-chain or Shapley attribution · uplift-modelled holdouts',
      },
    ],
  },
  {
    key: 'onb',
    stage: 'Onboarding',
    badge: '02',
    tone: '#5a3aa3',
    summary: 'Onboard fast and clean. Extract every signal, verify identity, build the cashflow picture.',
    cases: [
      {
        useCase: 'Document reader (OCR + extraction)',
        family: 'document',
        approach: 'Layout-aware parsing of trade licences, MOA, audited financials, Emirates IDs, VAT returns. Structured fields (entity, dates, amounts, signatories) plus table extraction for financial statements.',
        kpis: ['Field-extraction F1', 'STP rate (no human touch)', 'Avg processing latency'],
        success: 'F1 ≥ 96% · STP ≥ 85% · < 8s per multi-page doc',
        method: 'Layout-LLM + table-transformer · vendor blend (AWS Textract + UAE-Arabic fine-tunes) · ground-truth feedback loop',
      },
      {
        useCase: 'Document authenticity / forgery',
        family: 'identity',
        approach: 'Detect tampering (clone-stamps, font mismatches, MRZ inconsistencies), template forgery and duplicate hashes. Cross-check trade-licence against MoE registry.',
        kpis: ['Forgery TPR', 'False-positive rate', 'Review-queue volume'],
        success: 'TPR ≥ 92% at FPR ≤ 1.5% · queue < 4% of submissions',
        method: 'CNN ensemble for visual tampering + rule-based MRZ + registry lookup',
      },
      {
        useCase: 'Liveness + face match',
        family: 'identity',
        approach: 'Active liveness (nod / blink challenge) plus passive depth check, then face-match to Emirates ID photo via UAE Pass API.',
        kpis: ['Spoof detection rate', 'False-rejection rate', 'Time-to-pass'],
        success: 'Spoof detection ≥ 99% · FRR ≤ 1.5% · < 12s',
        method: 'NIST-PAD-aligned anti-spoof + ArcFace embedding · UAE Pass integration',
      },
      {
        useCase: 'KYB / beneficial-owner ladder',
        family: 'document',
        approach: 'Walk MOA + share registry to build the UBO graph to ≥ 25% threshold. Cross-reference sanctions and PEP lists; flag circular ownership.',
        kpis: ['UBO graph completeness', 'Sanctions hit recall', 'KYB time-to-complete'],
        success: 'Graph ≥ 95% complete · zero missed hits · < 60s automated',
        method: 'Graph-extraction LLM + Refinitiv / Acuris screening · automated UBO walking',
      },
      {
        useCase: 'Cashflow analyser',
        family: 'scoring',
        approach: 'Ingest 12 months of bank statements via UAE Open Finance / Lean. Parse to canonical category schema; compute DSCR, working-capital cycle, seasonality, volatility into 32 underwriting features.',
        kpis: ['Transaction-categorisation F1', 'Feature stability', 'PD-model AUC lift'],
        success: 'F1 ≥ 94% · PD AUC lift ≥ 0.06 vs bureau-only',
        method: 'Transformer-based transaction classifier · feature-store · monthly retrain',
      },
    ],
  },
  {
    key: 'uw',
    stage: 'Underwriting',
    badge: '03',
    tone: '#b06a14',
    summary: 'Decide quickly, fairly and explainably. With the right limit and the right price for each customer.',
    cases: [
      {
        useCase: 'Probability of default (PD)',
        family: 'scoring',
        approach: 'Predict 12-month default probability from cashflow, bureau, exposure, sector and behavioural features. Outputs feed both the approve/decline gate and the pricing engine.',
        kpis: ['AUC-ROC', 'KS statistic', 'Calibration (Brier score)', 'Population stability index (PSI)'],
        success: 'AUC ≥ 0.80 · KS ≥ 0.42 · PSI < 0.10 month-over-month',
        method: 'Gradient-boosted trees with monotonic constraints · SHAP for adverse-action notices · quarterly champion-challenger',
      },
      {
        useCase: 'Affordability assessment',
        family: 'scoring',
        approach: 'Compute sustainable working-capital need (30-day cash-cycle × stable revenue). Stress-test against −20% revenue and +200bps rate. Floors approved limit at affordability.',
        kpis: ['Affordability-cap hit-rate', 'Post-approval distress rate', 'DSCR drift'],
        success: 'Distress rate (12-mo DPD90+) ≤ 2.5%',
        method: 'Deterministic affordability calculator + stochastic stress simulator · IFRS-9 ECL aligned',
      },
      {
        useCase: 'Limit sizing',
        family: 'optimization',
        approach: 'Bayesian optimisation balancing approval rate, expected loss and customer LTV. Limit recommendation is the maximum the customer can absorb without breaching affordability or concentration.',
        kpis: ['Limit utilisation', 'Loss vs offered limit', 'Approval rate at fixed loss budget'],
        success: 'Utilisation ≥ 55% · loss ≤ 2.0% of book · approval rate ≥ 60%',
        method: 'Bayesian optimisation + Monte-Carlo loss simulation · constrained by policy ceilings',
      },
      {
        useCase: 'Risk-based dynamic pricing',
        family: 'optimization',
        approach: 'APR = CoF + μ + Σβⱼxⱼ + Σ G_f[…], passed through portfolio floor and cap. Three driver bands (Affluence / Risk / Sensitivity) interact via NxM grids.',
        kpis: ['Portfolio NIM', 'Price-elasticity-weighted conversion', 'Margin-per-customer'],
        success: 'Portfolio NIM hits target ± 30bps · approval rate not penalised',
        method: 'Linear backbone + 2-way interaction grids · governance min/max · monthly recalibration',
      },
      {
        useCase: 'Alt-data scoring (thin-file)',
        family: 'scoring',
        approach: 'For SMEs with < 12 months of bureau history, ingest POS data (Network / Magnati), telecom payments, e-invoicing trail and VAT filings. Build a lightweight scorecard for thin-file approvals.',
        kpis: ['Thin-file approval rate', 'Loss rate of thin-file vs main book', 'Coverage uplift'],
        success: '+15pp approval rate vs bureau-only · loss not > 1.5× main book',
        method: 'Boosted-tree scorecard with mandatory floor on AECB ≥ 550 · explainable feature contributions',
      },
      {
        useCase: 'Credit memo generator',
        family: 'conversational',
        approach: 'LLM compiles a structured credit memo from raw features, model outputs and policy gates. Saves 30-40 minutes of analyst write-up per Standard / Plus case.',
        kpis: ['Analyst-time-to-decision', 'Memo edit-distance vs final', 'Auditor-rated coverage'],
        success: '70% reduction in write-up time · ≤ 8% edit-distance · 100% policy fields covered',
        method: 'Retrieval-augmented LLM (Claude / GPT-4) · structured-output enforcement · grounding citations',
      },
    ],
  },
  {
    key: 'dis',
    stage: 'Disbursement',
    badge: '04',
    tone: '#0a8056',
    summary: 'Release cash safely. Verify the beneficiary, screen the transaction, route the rails.',
    cases: [
      {
        useCase: 'Beneficiary verification',
        family: 'identity',
        approach: 'For supplier-direct payments, validate IBAN ↔ legal-name match via central registry. Cross-check trade-licence and TRN before first payout to a new beneficiary.',
        kpis: ['First-time-right rate', 'Mis-routed payments', 'Onboarding latency for new beneficiary'],
        success: 'FTR ≥ 99.5% · zero mis-routes · new beneficiary onboarded < 4hr',
        method: 'IBAN-name-match service + UAE central registries · positive-payee logic',
      },
      {
        useCase: 'Drawdown fraud sentinel',
        family: 'identity',
        approach: 'Real-time check at every drawdown for device-change, location-mismatch, beneficiary-anomaly, velocity-spike. Step-up to OTP or human review at high-confidence flags.',
        kpis: ['Fraud loss rate', 'Step-up rate', 'False-positive friction'],
        success: 'Fraud loss ≤ 5bps · step-up rate ≤ 3% · false-positive friction < 0.5% of good actors',
        method: 'Streaming feature store + sub-second model serving · Isolation-forest + supervised classifier ensemble',
      },
      {
        useCase: 'Settlement-route optimiser',
        family: 'optimization',
        approach: 'Choose between AANI, IPP, UAEFTS, SWIFT corridors based on amount, currency, time-of-day, beneficiary bank, and cost. Auto-fail-over on rail outage.',
        kpis: ['Avg settlement cost', 'Settlement latency p95', 'Failed-payment rate'],
        success: 'Cost down 25% vs single-rail · latency p95 < 2 min for AED · 0.05% failure rate',
        method: 'Constrained optimisation with rail-availability heuristics · live monitoring + circuit-breakers',
      },
    ],
  },
  {
    key: 'svc',
    stage: 'Servicing · in-life',
    badge: '05',
    tone: '#5a3aa3',
    summary: 'Keep the customer healthy and informed. Anticipate questions, spot anomalies, save time.',
    cases: [
      {
        useCase: 'Cashflow forecaster',
        family: 'scoring',
        approach: 'Forecast inflows and outflows for the next 30 / 60 / 90 days at the customer level. Drives proactive nudges ("you have a tight week. Top up the limit?").',
        kpis: ['MAPE (mean absolute percentage error)', 'Customer engagement with nudges', 'Avoided-overdraft rate'],
        success: 'MAPE ≤ 12% · ≥ 35% nudge engagement',
        method: 'Temporal Fusion Transformer + customer-level baseline · daily refresh',
      },
      {
        useCase: 'Transaction anomaly detection',
        family: 'identity',
        approach: 'Spot volume / velocity / geography / beneficiary outliers in real time. Distinguishes deterministic events (large valid invoice) from systemic drift.',
        kpis: ['Precision @ alert', 'Customer-friction rate', 'Time to detect'],
        success: 'Precision ≥ 70% · friction ≤ 0.3% of customers · detect < 60s',
        method: 'Isolation-forest baseline + supervised classifier on labelled cases · streaming feature pipeline',
      },
      {
        useCase: 'Customer copilot (in-app)',
        family: 'conversational',
        approach: 'Bilingual (Ar/En) LLM grounded on the customer\'s own contract, schedule, statement and FAQ. Answers status questions, explains charges, drafts requests. Never invents policy.',
        kpis: ['Containment rate', 'CSAT', 'Hallucination rate (audited)'],
        success: 'Containment ≥ 65% · CSAT ≥ 4.4 / 5 · hallucination ≤ 0.5% (sampled)',
        method: 'Retrieval-augmented LLM with policy grounding · response-quality eval set + ongoing red-teaming',
      },
      {
        useCase: 'Reconciliation matcher',
        family: 'optimization',
        approach: 'Auto-match incoming wires to invoices, EMIs, partial payments. Splits, merges and fee allocations. Surfaces only true breaks for manual review.',
        kpis: ['Auto-clear rate', 'Days-to-close break', 'False-match rate'],
        success: 'Auto-clear ≥ 92% · break-close ≤ 1.5d · false-match < 0.1%',
        method: 'Supervised matcher (XGBoost on string + numeric features) · LLM tie-breaker for ambiguous cases',
      },
    ],
  },
  {
    key: 'ews',
    stage: 'Early warning',
    badge: '06',
    tone: '#b8364b',
    summary: 'Catch trouble two weeks before it shows up in DPD. Prevention is dramatically cheaper than collections.',
    cases: [
      {
        useCase: 'Stress / EWS scoring',
        family: 'scoring',
        approach: 'Fuse 32 features across financial, banking, operational, behavioural and macro signals into a single 0-100 score. Score → 4 risk bands → action ladder.',
        kpis: ['Lead-time vs DPD90', 'Recall at top-decile', 'Action-take-up rate'],
        success: 'Median lead-time ≥ 14d · top-decile recall ≥ 65% · action-take-up ≥ 50%',
        method: 'Survival model (Cox / DeepSurv) + classifier ensemble · features refreshed daily',
      },
      {
        useCase: 'Hardship-onset detection',
        family: 'propensity',
        approach: 'Predict the probability the customer will enter genuine hardship in the next 30 days. Drives pre-emptive outreach with restructure or holiday options before stigma sets in.',
        kpis: ['Hardship recall', 'Restructure-acceptance rate', 'Roll-rate to NPL'],
        success: 'Recall ≥ 60% · acceptance ≥ 40% on offers · roll-rate down 25% on hardship cohort',
        method: 'Survival classifier on cashflow + behaviour · uplift-modelled offer targeting',
      },
      {
        useCase: 'Behaviour-shift detector',
        family: 'identity',
        approach: 'Watch for login-pattern changes, device churn, location moves, communication-cadence drops. Often the earliest signal of hardship or fraud.',
        kpis: ['Behaviour-shift precision', 'Time to alert', 'Useful-alert rate (post-review)'],
        success: 'Precision ≥ 60% · time-to-alert < 24h · useful-alert rate ≥ 45%',
        method: 'Embedding-based anomaly model + change-point detection · ranked alert queue',
      },
      {
        useCase: 'Sector-stress overlay',
        family: 'scoring',
        approach: 'Daily macro / sector index based on news, payment-processor data, AECB defaults, sector-wage indices. Adjusts EWS thresholds per industry.',
        kpis: ['Sector-EWS calibration drift', 'Forward NPL correlation', 'Threshold-adjustment precision'],
        success: 'Forward NPL R² ≥ 0.55 at sector level · low calibration drift quarter-on-quarter',
        method: 'NLP on news + structured macro feeds · sector-mixed-effects regression',
      },
    ],
  },
  {
    key: 'col',
    stage: 'Repayment & collections',
    badge: '07',
    tone: '#b8364b',
    summary: 'Pre-empt default; when contact is needed, do it the way the customer prefers. Empathetic, well-timed, well-toned.',
    cases: [
      {
        useCase: 'Intent-to-pay scoring',
        family: 'propensity',
        approach: 'Score the probability the customer pays this EMI on time without contact. High-intent customers are left alone (zero friction); only low-intent receive proactive outreach.',
        kpis: ['False-positive rate (on-time customers contacted)', 'On-time payment rate', 'Cost-per-contact saved'],
        success: 'FP ≤ 5% · on-time rate ≥ 92% · contact savings ≥ AED 0.6M / month at scale',
        method: 'Boosted-tree classifier on EWS + behaviour features · weekly refresh · uplift-modelled holdouts',
      },
      {
        useCase: 'Propensity-to-pay (cure given contact)',
        family: 'propensity',
        approach: 'For customers who slip, predict the probability of cure given a specific contact treatment. Drives action-prioritisation and capacity allocation across the collections queue.',
        kpis: ['Cure-rate uplift vs control', 'Cost-per-cure', 'Recovery $ per agent-hour'],
        success: 'Uplift ≥ 8pp · cost-per-cure down 30% · recovery $ per hour up 1.8×',
        method: 'Causal uplift model (S-learner / X-learner) · A/B holdouts every cycle',
      },
      {
        useCase: 'Best-channel + best-time',
        family: 'recommendation',
        approach: 'Per customer, predict which channel (call, SMS, WhatsApp, in-app push) and which time-window has the highest contact + cure yield. Plays into the collections orchestrator.',
        kpis: ['Right-party-contact (RPC) rate', 'Conversation-to-PTP rate', 'Customer complaint rate'],
        success: 'RPC ≥ 70% · conversation→PTP ≥ 55% · complaints down 40%',
        method: 'Multi-class classifier with contextual bandit on top · explore / exploit budget',
      },
      {
        useCase: 'Promise-to-pay reliability',
        family: 'propensity',
        approach: 'Predict probability the customer keeps their PTP. Low-reliability promises trigger a reminder ladder and book reserves more conservatively for IFRS-9.',
        kpis: ['Kept-promise rate', 'Reserve accuracy', 'Roll-rate after broken PTP'],
        success: 'Kept-promise ≥ 75% on high-confidence band · reserve accuracy ± 5%',
        method: 'Calibrated classifier with reliability diagram · monthly back-test',
      },
      {
        useCase: 'AI voice agent (bilingual)',
        family: 'conversational',
        approach: 'Bilingual Ar/En voice agent calls first. Empathetic script, listens for context, proposes a plan, books a PTP. Hands off to humans for refer / sensitive cases.',
        kpis: ['Containment rate', 'PTP rate vs human baseline', 'Cost per contact', 'CSAT'],
        success: 'Containment ≥ 60% · PTP rate +18pp · cost AED 0.40 vs AED 7 human · CSAT ≥ 4.2',
        method: 'TTS + ASR + dialogue manager · LLM intent classifier · supervised playback dashboard',
      },
      {
        useCase: 'Restructure suitability',
        family: 'optimization',
        approach: 'Recommend the right restructure offer (tenor extension, EMI step-down, holiday, settlement) given case features and policy. Sized to maximise expected recovery NPV.',
        kpis: ['Offer-acceptance rate', 'Recovery NPV', 'Re-default rate at 6 months'],
        success: 'Acceptance ≥ 45% · recovery NPV up 20% vs flat policy · re-default ≤ 18%',
        method: 'Constrained optimisation over offer space · expected-NPV objective · policy guardrails',
      },
    ],
  },
  {
    key: 'grw',
    stage: 'Upsell · cross-sell',
    badge: '08',
    tone: '#7c5fb8',
    summary: 'Grow the relationship. Top up limits for the right customers, recommend the next product, defend against churn.',
    cases: [
      {
        useCase: 'Limit-uplift propensity',
        family: 'propensity',
        approach: 'For active customers, predict the probability they\'ll accept and use a top-up. Combines utilisation, growth signals and behavioural cues with risk gates.',
        kpis: ['Top-up offer take-up', 'Incremental utilisation', 'Loss on top-up book'],
        success: 'Take-up ≥ 30% on offered customers · loss on top-up ≤ main-book + 50bps',
        method: 'Boosted-tree propensity + risk-policy gate · uplift testing',
      },
      {
        useCase: 'Next-best-product (cross-sell)',
        family: 'recommendation',
        approach: 'Rank candidate products (FX, payroll, trade finance, payment-processing, insurance) per customer using collaborative filtering plus business rules. Surfaced as in-app recommendations.',
        kpis: ['Recommendation CTR', 'Cross-sell attach rate', 'Revenue-per-customer'],
        success: 'CTR ≥ 8% · attach rate ≥ 12% within 6 months · revenue-per-customer +20%',
        method: 'Hybrid CF + content-based ranker · explore / exploit · monthly catalogue refresh',
      },
      {
        useCase: 'Wallet-share estimator',
        family: 'scoring',
        approach: 'Estimate share of the customer\'s total banking spend captured by Mal vs competitors, using transaction-flow proxies (outbound transfers, FX volumes, payroll). Identifies under-penetrated relationships.',
        kpis: ['Wallet-share lift over time', 'Cross-sell pipeline value', 'Transfer-out volume'],
        success: 'Wallet share +15pp on actioned cohort over 12 months',
        method: 'Regression on transaction-flow features + benchmark anchoring · quarterly refresh',
      },
      {
        useCase: 'Churn / attrition risk',
        family: 'propensity',
        approach: 'Predict 90-day attrition risk (account-closure or sharp utilisation drop). Triggers retention plays. RM call, fee-waiver offer, alternative product.',
        kpis: ['Churn lift in top-decile', 'Save-rate on retention plays', 'Net retention'],
        success: 'Top-decile lift ≥ 5× · save-rate ≥ 25% · net retention ≥ 90%',
        method: 'Survival model + uplift on retention treatments · quarterly campaign back-test',
      },
    ],
  },
];

// Working prototype of the in-house decision-engine. Credentials below.
const DECISION_ENGINE_PROTOTYPE = {
  url: 'https://dec-e.vercel.app/home',
  username: 'abc@xyz.com',
  password: '12345678',
};

function SectionAi({ lang, isMobile }) {
  const [activeId, setActiveId] = aiS('aiHero');
  const sectionRefs = aiR({});
  const isAr = lang === 'ar';

  aiE(() => {
    const obs = new IntersectionObserver((entries) => {
      const visible = entries.filter((e) => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setActiveId(visible.target.id);
    }, { rootMargin: '-30% 0px -55% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] });
    Object.values(sectionRefs.current).forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const jumpTo = aiCB((id) => {
    sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);
  const setRef = (id) => (el) => { sectionRefs.current[id] = el; };

  return (
    <div style={{ position: 'relative' }} dir={isAr ? 'rtl' : 'ltr'}>
      {!isMobile && <AiTOC activeId={activeId} jumpTo={jumpTo} isAr={isAr}/>}
      <div className="mal-section-page" style={{
        maxWidth: 920, paddingInlineStart: isMobile ? 24 : 280,
      }}>
        <AiHero refFn={setRef('aiHero')} isAr={isAr} isMobile={isMobile}/>
        <AiInventory refFn={setRef('aiInventory')} isAr={isAr} isMobile={isMobile}/>
        <AiLifecycle refFn={setRef('aiLifecycle')} isAr={isAr} isMobile={isMobile}/>
        <AiArchitecture refFn={setRef('aiArch')} isAr={isAr} isMobile={isMobile}/>
        <AiDecisionEngine refFn={setRef('aiDecision')} isAr={isAr} isMobile={isMobile}/>
        <AiPricing refFn={setRef('aiPricing')} isAr={isAr} isMobile={isMobile}/>
        <AiEws refFn={setRef('aiEws')} isAr={isAr} isMobile={isMobile}/>
        <AiCollections refFn={setRef('aiCollect')} isAr={isAr} isMobile={isMobile}/>
        <AiData refFn={setRef('aiData')} isAr={isAr}/>
        <AiRoadmap refFn={setRef('aiRoadmap')} isAr={isAr}/>
      </div>
    </div>
  );
}

// ============================================================
// Sticky TOC (left)
// ============================================================
function AiTOC({ activeId, jumpTo, isAr }) {
  const idx = AI_TOC.findIndex((t) => t.id === activeId);
  return (
    <aside style={{
      position: 'sticky', top: 56, width: 240,
      alignSelf: 'flex-start', float: isAr ? 'right' : 'left',
      paddingInlineStart: 24, paddingTop: 32,
      maxHeight: 'calc(100vh - 56px)', overflowY: 'auto',
    }}>
      <div className="mal-caption" style={{ marginBottom: 14, color: 'var(--mal-mid-2)' }}>
        AI INITIATIVES · MAY 2026
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {AI_TOC.map((t, i) => {
          const active = i === idx;
          const past = i < idx;
          return (
            <button key={t.id} onClick={() => jumpTo(t.id)}
                    style={{
                      all: 'unset', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '6px 10px', borderRadius: 8,
                      background: active ? 'var(--mal-paper)' : 'transparent',
                      border: '1px solid ' + (active ? 'var(--mal-primary-3)' : 'transparent'),
                      transition: 'background .15s, border-color .15s',
                    }}>
              <span style={{
                width: active ? 22 : 12, height: 4, borderRadius: 999,
                background: active ? 'var(--mal-primary)' : past ? 'var(--mal-primary-3)' : 'var(--mal-line)',
                transition: 'width .25s, background .15s',
              }}/>
              <span style={{
                fontSize: 12, fontWeight: active ? 600 : 500,
                color: active ? 'var(--mal-ink)' : past ? 'var(--mal-ink)' : 'var(--mal-mid)',
                lineHeight: 1.3,
              }}>{t.label}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

// ============================================================
// Helpers (mirror strategy.jsx primitives)
// ============================================================
function AiSectionWrapper({ id, refFn, eyebrow, title, children }) {
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
function AiP({ children }) {
  return (
    <p style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--mal-ink)', marginBlock: '0 14px', maxWidth: 680 }}>{children}</p>
  );
}
function AiSub({ children }) {
  return (
    <h3 style={{ fontSize: 17, fontWeight: 600, marginTop: 28, marginBottom: 10 }}>{children}</h3>
  );
}

// ============================================================
// HERO
// ============================================================
function AiHero({ refFn, isAr, isMobile }) {
  return (
    <section id="aiHero" ref={refFn} style={{ paddingTop: 24, marginBottom: 32 }}>
      <h1 style={{
        fontFamily: 'var(--mal-font-display)', fontStyle: 'italic',
        fontSize: isMobile ? 36 : 48, lineHeight: 1.0, letterSpacing: '-0.02em',
        margin: 0,
      }}>
        {isAr ? 'مبادرات الذكاء' : 'AI Initiatives'}
      </h1>
    </section>
  );
}

// ============================================================
// INVENTORY. Clickable agent grid grouped by domain
// ============================================================
function AiInventory({ refFn, isAr, isMobile }) {
  const [openId, setOpenId] = aiS(null);
  const open = openId ? AGENT_BY_ID[openId] : null;
  return (
    <AiSectionWrapper id="aiInventory" refFn={refFn}
      eyebrow={isAr ? 'الفهرس · ٢٠ وكيلاً' : 'Inventory · 20 agents'}
      title={isAr ? 'الذكاء الاصطناعي بالكامل في صفحة واحدة.' : 'Every agent, on one page.'}>
      <AiP>
        {isAr
          ? 'كل بطاقة وكيل توضح المهمة، المدخل، والمخرج. اضغط لاكتشاف التفاصيل التقنية.'
          : 'Each card describes one agent: its job, what it consumes, and what it produces. Click any tile to see model class, latency budget, and where it sits in the request graph.'}
      </AiP>

      {AGENT_DOMAINS.map((domain) => (
        <div key={domain.id} style={{ marginTop: 24 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12,
          }}>
            <Avatar name={domain.label[0]} tone={domain.color} size={28}/>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{domain.label}</div>
              <div style={{ fontSize: 11, color: 'var(--mal-mid)' }}>
                {domain.agents.length} {isAr ? 'وكلاء' : 'agents'}
              </div>
            </div>
          </div>
          <div style={{
            display: 'grid', gap: 10,
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
          }}>
            {domain.agents.map((a) => (
              <button key={a.id} onClick={() => setOpenId(a.id)}
                      style={{
                        all: 'unset', cursor: 'pointer', boxSizing: 'border-box',
                        background: 'var(--mal-paper)', border: '1px solid var(--mal-line)',
                        borderRadius: 12, padding: 14,
                        display: 'flex', flexDirection: 'column', gap: 6,
                        transition: 'transform .15s, border-color .15s, box-shadow .15s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.borderColor = 'var(--mal-primary-3)';
                        e.currentTarget.style.boxShadow = 'var(--mal-sh-2)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = '';
                        e.currentTarget.style.borderColor = 'var(--mal-line)';
                        e.currentTarget.style.boxShadow = '';
                      }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{a.name}</div>
                <div style={{ fontSize: 12, color: 'var(--mal-mid)', lineHeight: 1.5 }}>{a.role}</div>
              </button>
            ))}
          </div>
        </div>
      ))}

      {open && (
        <div role="dialog" aria-modal onClick={() => setOpenId(null)} style={{
          position: 'fixed', inset: 0, zIndex: 90,
          background: 'rgba(20, 20, 30, .35)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: 'var(--mal-paper)', borderRadius: 'var(--mal-r-lg)',
            width: 'min(560px, 100%)', maxHeight: '80vh', overflowY: 'auto',
            border: '1px solid var(--mal-line)', boxShadow: 'var(--mal-sh-3)',
            padding: 22, position: 'relative',
          }}>
            <button onClick={() => setOpenId(null)} style={{
              all: 'unset', position: 'absolute', top: 12, insetInlineEnd: 14, cursor: 'pointer',
              fontSize: 16, color: 'var(--mal-mid)',
            }}>✕</button>
            <Pill tone={open.color} dot>{open.domain}</Pill>
            <h3 style={{
              fontFamily: 'var(--mal-font-display)', fontStyle: 'italic',
              fontSize: 28, margin: '8px 0 10px', lineHeight: 1.1,
            }}>{open.name}</h3>
            <p style={{ fontSize: 14, color: 'var(--mal-mid)', lineHeight: 1.6, marginTop: 0 }}>
              {open.role}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14 }}>
              <DetailCell label={isAr ? 'المدخل' : 'Input'} value={open.input}/>
              <DetailCell label={isAr ? 'المخرج' : 'Output'} value={open.output}/>
            </div>
            <div style={{
              marginTop: 14, padding: 12, background: 'var(--mal-surface-2)',
              borderRadius: 10, fontSize: 12, color: 'var(--mal-mid)',
            }}>
              {isAr ? 'يعمل خلف بوابة LLM واحدة مع تتبّع كامل وقابلية للإلغاء.' : 'Runs behind a single tool-gated LLM orchestrator with full tracing, replay, and human-override.'}
            </div>
          </div>
        </div>
      )}
    </AiSectionWrapper>
  );
}
function DetailCell({ label, value }) {
  return (
    <div style={{
      background: 'var(--mal-surface-2)', borderRadius: 10, padding: 10,
    }}>
      <div className="mal-caption" style={{ color: 'var(--mal-mid-2)' }}>{label}</div>
      <div style={{ fontSize: 12, color: 'var(--mal-ink)', marginTop: 4 }}>{value}</div>
    </div>
  );
}

// ============================================================
// LIFECYCLE USE CASES. Stage tabs · use-case table · coverage matrix
// ============================================================
function AiLifecycle({ refFn, isAr, isMobile }) {
  const [activeIdx, setActiveIdx] = aiS(0);
  const stage = LIFECYCLE_STAGES_DATA[activeIdx];
  const totalCases = aiM(() => LIFECYCLE_STAGES_DATA.reduce((a, s) => a + s.cases.length, 0), []);

  return (
    <AiSectionWrapper id="aiLifecycle" refFn={refFn}
      eyebrow={isAr ? 'حالات الاستخدام · المنهجية · المؤشرات' : 'Use cases · methods · KPIs'}
      title={isAr ? 'الذكاء الاصطناعي عبر دورة حياة الإقراض كاملةً.' : 'AI across every stage of the lending lifecycle.'}>
      <AiP>
        {isAr
          ? `${totalCases} حالة استخدام عبر ٨ مراحل: من الاكتساب إلى البيع المتقاطع. لكل حالة: ما المشكلة، كيف نحلها، أيّ مؤشرات نقيس، ما هو النجاح، وأيّ منهجية نستخدم.`
          : `${totalCases} use cases mapped across 8 lifecycle stages. From acquisition to cross-sell. For every case: what we're solving, how we'd tackle it, what to measure, what success looks like, and the methodology behind it.`}
      </AiP>

      {/* Stage chip ribbon */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 6,
        margin: '8px 0 18px',
      }}>
        {LIFECYCLE_STAGES_DATA.map((s, i) => {
          const active = i === activeIdx;
          return (
            <button key={s.key} onClick={() => setActiveIdx(i)} style={{
              appearance: 'none', cursor: 'pointer',
              fontFamily: 'var(--mal-font-ui)', fontSize: 12.5, fontWeight: active ? 700 : 500,
              padding: '7px 12px', borderRadius: 999,
              color: active ? '#fff' : 'var(--mal-ink-2)',
              background: active ? s.tone : 'var(--mal-paper)',
              border: '1px solid ' + (active ? s.tone : 'var(--mal-line)'),
              transition: 'all .2s ease',
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{
                fontFamily: 'var(--mal-font-mono)', fontSize: 10.5,
                opacity: active ? 0.85 : 0.6,
              }}>{s.badge}</span>
              <span>{s.stage}</span>
              <span style={{
                fontSize: 10.5, padding: '1px 6px', borderRadius: 999,
                background: active ? 'rgba(255,255,255,0.2)' : 'var(--mal-surface-2)',
                color: active ? '#fff' : 'var(--mal-mid)',
                fontFamily: 'var(--mal-font-mono)',
              }}>{s.cases.length}</span>
            </button>
          );
        })}
      </div>

      {/* Active stage summary */}
      <div style={{
        padding: '12px 14px', borderRadius: 12,
        background: stage.tone + '12',
        border: '1px solid ' + stage.tone + '38',
        marginBottom: 14,
        fontSize: 13.5, color: 'var(--mal-ink-1)', lineHeight: 1.55,
      }}>
        <strong style={{ color: stage.tone }}>{stage.stage}</strong>. {stage.summary}
      </div>

      {/* Use cases. Table on desktop, stacked cards on mobile */}
      {isMobile
        ? <UseCaseStack stage={stage}/>
        : <UseCaseTable stage={stage}/>}

      {/* Coverage matrix */}
      <AiSub>{isAr ? 'تغطية عائلات النماذج عبر المراحل' : 'Model-family coverage across stages'}</AiSub>
      <AiP>
        {isAr
          ? 'النقاط الملوّنة تشير إلى عائلات النماذج التي تنشط في كل مرحلة. أعمدة فارغة = لا توجد نماذج هناك بعد.'
          : 'Coloured dots show which model families fire at each stage. Empty cells = no model of that family at that stage today.'}
      </AiP>
      <CoverageMatrix data={LIFECYCLE_STAGES_DATA} isMobile={isMobile}/>
    </AiSectionWrapper>
  );
}

function FamilyChip({ family }) {
  const f = MODEL_FAMILIES[family];
  if (!f) return null;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '2px 8px', borderRadius: 999,
      fontSize: 10.5, fontWeight: 600, letterSpacing: '.02em',
      color: f.color,
      background: f.color + '15',
      border: '1px solid ' + f.color + '40',
      whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: 999, background: f.color }}/>
      {f.label}
    </span>
  );
}

function UseCaseTable({ stage }) {
  return (
    <div style={{
      background: 'var(--mal-paper)',
      border: '1px solid var(--mal-line)',
      borderRadius: 14, overflow: 'hidden',
    }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{
          width: '100%', borderCollapse: 'collapse',
          fontSize: 13, fontFamily: 'var(--mal-font-ui)',
          tableLayout: 'fixed', minWidth: 920,
        }}>
          <colgroup>
            <col style={{ width: '17%' }}/>
            <col style={{ width: '30%' }}/>
            <col style={{ width: '17%' }}/>
            <col style={{ width: '17%' }}/>
            <col style={{ width: '19%' }}/>
          </colgroup>
          <thead>
            <tr style={{
              background: 'var(--mal-surface-2)',
              borderBottom: '1px solid var(--mal-line)',
            }}>
              {['Use case', 'How we tackle it', 'KPIs', 'Success metric', 'Methodology'].map((h) => (
                <th key={h} style={{
                  textAlign: 'start', padding: '10px 14px',
                  fontSize: 11, fontWeight: 700, letterSpacing: '.06em',
                  textTransform: 'uppercase', color: 'var(--mal-mid)',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stage.cases.map((c, i) => (
              <tr key={i} style={{
                borderTop: i ? '1px solid var(--mal-line-2)' : 'none',
                verticalAlign: 'top',
              }}>
                <td style={{ padding: '12px 14px' }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--mal-ink)', lineHeight: 1.4, marginBottom: 6 }}>
                    {c.useCase}
                  </div>
                  <FamilyChip family={c.family}/>
                </td>
                <td style={{ padding: '12px 14px', fontSize: 12.5, lineHeight: 1.6, color: 'var(--mal-ink-1)' }}>
                  {c.approach}
                </td>
                <td style={{ padding: '12px 14px', fontSize: 12, lineHeight: 1.55, color: 'var(--mal-ink-1)' }}>
                  <ul style={{ margin: 0, paddingInlineStart: 16 }}>
                    {c.kpis.map((k, j) => <li key={j}>{k}</li>)}
                  </ul>
                </td>
                <td style={{ padding: '12px 14px', fontSize: 12.5, lineHeight: 1.55, color: 'var(--mal-ink)', fontFamily: 'var(--mal-font-mono)' }}>
                  {c.success}
                </td>
                <td style={{ padding: '12px 14px', fontSize: 12, lineHeight: 1.55, color: 'var(--mal-mid)' }}>
                  {c.method}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UseCaseStack({ stage }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {stage.cases.map((c, i) => (
        <div key={i} style={{
          background: 'var(--mal-paper)',
          border: '1px solid var(--mal-line)',
          borderRadius: 12, padding: 14,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--mal-ink)' }}>{c.useCase}</div>
            <FamilyChip family={c.family}/>
          </div>
          {[
            { lab: 'Approach',     val: c.approach,                mono: false },
            { lab: 'KPIs',         val: c.kpis.join(' · '),        mono: false },
            { lab: 'Success',      val: c.success,                 mono: true  },
            { lab: 'Methodology',  val: c.method,                  mono: false },
          ].map((row, j) => (
            <div key={j} style={{ marginTop: 6 }}>
              <div className="mal-caption" style={{ color: 'var(--mal-mid)' }}>{row.lab}</div>
              <div style={{
                fontSize: 12.5, lineHeight: 1.55,
                color: 'var(--mal-ink-1)',
                fontFamily: row.mono ? 'var(--mal-font-mono)' : 'inherit',
              }}>{row.val}</div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function CoverageMatrix({ data, isMobile }) {
  const families = Object.keys(MODEL_FAMILIES);
  // Build counts: family x stage -> count
  const counts = {};
  for (const f of families) counts[f] = {};
  for (const s of data) {
    for (const c of s.cases) {
      counts[c.family][s.key] = (counts[c.family][s.key] || 0) + 1;
    }
  }

  return (
    <div style={{
      background: 'var(--mal-paper)',
      border: '1px solid var(--mal-line)',
      borderRadius: 14, overflow: 'hidden',
    }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{
          width: '100%', borderCollapse: 'collapse',
          fontSize: 12, fontFamily: 'var(--mal-font-ui)',
          minWidth: 720,
        }}>
          <thead>
            <tr style={{
              background: 'var(--mal-surface-2)',
              borderBottom: '1px solid var(--mal-line)',
            }}>
              <th style={{
                textAlign: 'start', padding: '10px 14px',
                fontSize: 10.5, fontWeight: 700, letterSpacing: '.06em',
                textTransform: 'uppercase', color: 'var(--mal-mid)',
              }}>Family</th>
              {data.map((s) => (
                <th key={s.key} style={{
                  textAlign: 'center', padding: '10px 6px',
                  fontSize: 10.5, fontWeight: 700, letterSpacing: '.04em',
                  textTransform: 'uppercase', color: s.tone,
                }}>{s.stage.split(' ')[0].slice(0, 6)}</th>
              ))}
              <th style={{
                textAlign: 'center', padding: '10px 8px',
                fontSize: 10.5, fontWeight: 700, color: 'var(--mal-mid)',
              }}>Σ</th>
            </tr>
          </thead>
          <tbody>
            {families.map((f, i) => {
              const fam = MODEL_FAMILIES[f];
              const total = data.reduce((sum, s) => sum + (counts[f][s.key] || 0), 0);
              return (
                <tr key={f} style={{
                  borderTop: i ? '1px solid var(--mal-line-2)' : 'none',
                }}>
                  <td style={{ padding: '8px 14px' }}>
                    <FamilyChip family={f}/>
                  </td>
                  {data.map((s) => {
                    const n = counts[f][s.key] || 0;
                    const dotSize = n === 0 ? 4 : Math.min(20, 8 + n * 3);
                    return (
                      <td key={s.key} style={{ padding: '8px 6px', textAlign: 'center' }}>
                        {n === 0 ? (
                          <span style={{
                            display: 'inline-block',
                            width: 4, height: 4, borderRadius: 999,
                            background: 'var(--mal-line)',
                          }}/>
                        ) : (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            width: dotSize, height: dotSize, borderRadius: 999,
                            background: fam.color, color: '#fff',
                            fontSize: 10, fontWeight: 700,
                          }}>{n}</span>
                        )}
                      </td>
                    );
                  })}
                  <td style={{
                    padding: '8px 8px', textAlign: 'center',
                    fontFamily: 'var(--mal-font-mono)',
                    color: 'var(--mal-mid)',
                  }}>{total}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
// ARCHITECTURE. Five-layer SVG diagram
// ============================================================
function AiArchitecture({ refFn, isAr, isMobile }) {
  const layers = [
    { label: isAr ? 'تجربة العميل' : 'Customer surfaces',     items: ['Buyer app', 'Supplier app', 'Anchor portal', 'Provider console'], tone: 'lilac' },
    { label: isAr ? 'تنسيق الوكلاء' : 'Agent orchestration',  items: ['Tool router', 'Replay log', 'Eval harness', 'Human-override'],    tone: 'iri' },
    { label: isAr ? 'الوكلاء (٢٠)' : 'Agent fleet (20)',       items: ['Origination ×4', 'Underwriting ×4', 'Servicing ×4', 'Ops ×4', 'Risk/CX ×4'], tone: 'coral' },
    { label: isAr ? 'النماذج والميزات' : 'Models · features',  items: ['LightGBM', 'LLM (Claude/GPT)', 'Feature store', 'Embedding store'], tone: 'peach' },
    { label: isAr ? 'البيانات' : 'Data foundations',           items: ['AECB', 'EmaraTax e-invoice', 'Open Finance', 'Internal events'],   tone: 'ink' },
  ];
  return (
    <AiSectionWrapper id="aiArch" refFn={refFn}
      eyebrow={isAr ? 'البنية' : 'Architecture'}
      title={isAr ? 'خمس طبقات. مسار واحد للقرار.' : 'Five layers. One decision path.'}>
      <AiP>
        {isAr
          ? 'كل طلب ائتمان يهبط من تطبيق العميل عبر منسّق الوكلاء، ينشط الوكلاء المعنيين، يستفسر النماذج والمخازن، ويعود بقرار قابل للتفسير وعقد رقمي.'
          : 'A loan request descends from a customer surface through the orchestrator, fans out to whichever agents the request graph requires, reaches into models + the feature store + bureau / e-invoice / Open-Finance pulls, and returns with an explainable decision, price, and digital contract.'}
      </AiP>
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 10,
        marginTop: 22, position: 'relative',
      }}>
        {layers.map((l, i) => (
          <div key={i} style={{
            position: 'relative',
            background: 'var(--mal-paper)', border: '1px solid var(--mal-line)',
            borderRadius: 14, padding: '14px 16px',
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <Avatar name={(i + 1) + ''} tone={l.tone} size={32}/>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{l.label}</div>
              <div style={{
                fontSize: 11, color: 'var(--mal-mid)', marginTop: 4,
                fontFamily: 'var(--mal-font-mono)',
              }}>
                {l.items.join(' · ')}
              </div>
            </div>
            {i < layers.length - 1 && (
              <div aria-hidden style={{
                position: 'absolute', insetInlineStart: 24, bottom: -10,
                width: 2, height: 10, background: 'var(--mal-line)',
              }}/>
            )}
          </div>
        ))}
      </div>
    </AiSectionWrapper>
  );
}

// ============================================================
// DECISION ENGINE. Animated 5-step flow
// ============================================================
function AiDecisionEngine({ refFn, isAr, isMobile }) {
  const steps = [
    { k: 'pull',   label: isAr ? 'سحب البيانات' : 'Data pull',                desc: 'AECB, e-invoice match, bank feed, KYC docs' },
    { k: 'feat',   label: isAr ? 'حساب الميزات' : 'Feature build',            desc: '32 features · cashflow, exposure, sector' },
    { k: 'score',  label: isAr ? 'تسجيل المخاطر' : 'Score',                   desc: 'LightGBM PD + LGD + fraud z-score' },
    { k: 'rules',  label: isAr ? 'قواعد البوابة' : 'Policy gate',             desc: 'Sharia, sanctions, exposure caps' },
    { k: 'price',  label: isAr ? 'التسعير' : 'Price + decide',                desc: 'Plan ladder + APR + limit, rationale' },
  ];
  const [active, setActive] = aiS(0);
  const [running, setRunning] = aiS(true);
  aiE(() => {
    if (!running) return;
    const t = setInterval(() => setActive((i) => (i + 1) % steps.length), 1400);
    return () => clearInterval(t);
  }, [running]);

  return (
    <AiSectionWrapper id="aiDecision" refFn={refFn}
      eyebrow={isAr ? 'محرك القرار' : 'Decision engine'}
      title={isAr ? 'من الطلب إلى القرار في < ٤٠ ثانية.' : 'Application → decision in under 40 seconds.'}>
      <AiP>
        {isAr
          ? 'مدير المخاطر يرى كل خطوة. يستطيع التدخل، التراجع، أو تعديل الميزات وإعادة التشغيل.'
          : 'A risk manager can pause at any step, replay the agent trace, override a feature, and re-run. Every action is hashed into the audit ledger.'}
      </AiP>

      <DecisionPrototypeCta isAr={isAr} isMobile={isMobile}/>

      <AiSub>{isAr ? 'تتبع القرار' : 'Decision trace'}</AiSub>
      <div style={{
        marginTop: 8, display: 'flex', gap: 8, alignItems: 'center',
      }}>
        <button onClick={() => setRunning((r) => !r)} className="mal-pill-btn">
          {running ? '❚❚ ' + (isAr ? 'إيقاف' : 'Pause') : '▶ ' + (isAr ? 'تشغيل' : 'Play')}
        </button>
        <button onClick={() => setActive((i) => (i + 1) % steps.length)} className="mal-pill-btn">
          {isAr ? 'الخطوة التالية' : 'Step →'}
        </button>
      </div>

      <div style={{
        marginTop: 22, display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : `repeat(${steps.length}, 1fr)`,
        gap: 10,
      }}>
        {steps.map((s, i) => {
          const isActive = i === active;
          const isPast = i < active;
          return (
            <div key={s.k} style={{
              position: 'relative',
              background: isActive ? 'var(--mal-primary-50)' : 'var(--mal-paper)',
              border: '1px solid ' + (isActive ? 'var(--mal-primary)' : isPast ? 'var(--mal-primary-3)' : 'var(--mal-line)'),
              borderRadius: 14, padding: 14,
              transition: 'all .35s cubic-bezier(.4,0,.2,1)',
              transform: isActive ? 'translateY(-3px)' : 'none',
              boxShadow: isActive ? 'var(--mal-sh-3)' : 'none',
            }}>
              <div className="mal-caption" style={{
                color: isActive ? 'var(--mal-primary)' : 'var(--mal-mid-2)',
              }}>STEP {i + 1}</div>
              <div style={{
                fontSize: 14, fontWeight: 600, marginTop: 4,
                color: 'var(--mal-ink)',
              }}>{s.label}</div>
              <div style={{ fontSize: 11, color: 'var(--mal-mid)', marginTop: 6, lineHeight: 1.55 }}>
                {s.desc}
              </div>
              {isActive && (
                <div style={{
                  position: 'absolute', insetInlineStart: 14, bottom: -10,
                  width: 8, height: 8, borderRadius: 999, background: 'var(--mal-primary)',
                  boxShadow: '0 0 0 4px var(--mal-primary-50)',
                }}/>
              )}
            </div>
          );
        })}
      </div>

      {/* Decision card output */}
      <div style={{
        marginTop: 28, background: 'var(--mal-paper)',
        border: '1px solid var(--mal-line)', borderRadius: 16, padding: 18,
        display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 18,
      }}>
        <div>
          <div className="mal-caption" style={{ color: 'var(--mal-mid)' }}>
            {isAr ? 'مثال: SME #20451' : 'Sample · SME #20451'}
          </div>
          <div style={{
            fontFamily: 'var(--mal-font-display)', fontStyle: 'italic',
            fontSize: 22, marginTop: 4, lineHeight: 1.2,
          }}>{isAr ? 'مقاول مقاولات صغيرة، دبي' : 'Small contractor, Dubai'}</div>
          <div style={{ fontSize: 12, color: 'var(--mal-mid)', marginTop: 4 }}>
            {isAr ? 'طلب AED ٢٫٤ مليون · ٣٢ فاتورة معلقة' : 'Asks AED 2.4M · 32 outstanding invoices'}
          </div>
          <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Pill tone="success" dot>Approve</Pill>
            <Pill tone="iri">PD 2.1%</Pill>
            <Pill tone="iri">LGD 38%</Pill>
            <Pill tone="iri">Limit AED 1.8M</Pill>
          </div>
        </div>
        <div>
          <div className="mal-caption" style={{ color: 'var(--mal-mid)' }}>{isAr ? 'سلم الأسعار' : 'Plan ladder'}</div>
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { plan: 'Pay in 30',  apr: '13.5%' },
              { plan: '60 days',    apr: '14.1%' },
              { plan: '90 days',    apr: '14.8%' },
              { plan: '120 days',   apr: '15.6%' },
              { plan: '180 days',   apr: '16.9%' },
            ].map((r, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between',
                fontSize: 13, padding: '6px 0',
                borderBottom: i < 4 ? '1px solid var(--mal-line-2)' : 'none',
              }}>
                <span style={{ color: 'var(--mal-mid)' }}>{r.plan}</span>
                <span style={{ fontFamily: 'var(--mal-font-mono)', fontWeight: 500 }}>{r.apr}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AiSectionWrapper>
  );
}

// ============================================================
// EWS. Interactive 32-feature score visualizer
// ============================================================
function AiEws({ refFn, isAr, isMobile }) {
  // 6 leverage features the analyst can scrub
  const [cashCushion, setCashCushion] = aiS(45);   // days of cash on hand
  const [dpd, setDpd]                 = aiS(0);    // current DPD
  const [bureauDelta, setBureauDelta] = aiS(0);    // bureau score delta last 30d (negative = worsened)
  const [salesYoY, setSalesYoY]       = aiS(8);    // % YoY sales delta
  const [exposureSpike, setExposureSpike] = aiS(0); // % new debt picked up last 30d
  const [sectorStress, setSectorStress] = aiS(20); // 0-100 sector stress index

  // Composite risk 0..100 (linear blend, capped, calibrated to feel like the doc)
  const score = aiM(() => {
    let r = 0;
    r += clampN((30 - cashCushion) * 0.8, 0, 26);
    r += clampN(dpd * 1.1, 0, 30);
    r += clampN(-bureauDelta * 0.6, 0, 12);
    r += clampN((-salesYoY) * 0.6, 0, 10);
    r += clampN(exposureSpike * 0.4, 0, 12);
    r += clampN(sectorStress * 0.10, 0, 10);
    return Math.round(Math.min(100, Math.max(0, r)));
  }, [cashCushion, dpd, bureauDelta, salesYoY, exposureSpike, sectorStress]);

  const band = score < 25 ? { name: 'Healthy',    tone: 'success', desc: isAr ? 'لا حاجة لإجراء' : 'No action needed' }
            : score < 50 ? { name: 'Watch',      tone: 'iri',     desc: isAr ? 'تواصل لطيف' : 'Soft outreach + offer extension' }
            : score < 75 ? { name: 'Stressed',   tone: 'warn',    desc: isAr ? 'إعادة هيكلة' : 'Restructure conversation · pre-emptive plan' }
            :              { name: 'Distressed', tone: 'danger',  desc: isAr ? 'نقل للمعالجة' : 'Hand off to remediation team' };

  // Day-14 forecast = current score + recent direction (tiny mock momentum)
  const forecast = Math.round(Math.min(100, Math.max(0, score + (dpd > 0 ? 6 : -2) + exposureSpike * 0.05 - cashCushion * 0.03)));

  return (
    <AiSectionWrapper id="aiEws" refFn={refFn}
      eyebrow={isAr ? 'النظام التحذيري' : 'Early-warning system'}
      title={isAr ? 'يلتقط الضائقة قبل التعثر بأسبوعين.' : 'Catches distress two weeks before default.'}>
      <AiP>
        {isAr
          ? 'يربط EWS خمس فئات من إشارات الضائقة، مالية، مصرفية، تشغيلية، سلوكية، وكلية، في درجة واحدة، ثم يفعّل سُلم تدخل واضح. الهدف هو الوقاية، لا العلاج.'
          : 'EWS fuses five families of distress signals. Financial, Banking, Operational, Behavioural, and Macroeconomic. Into a single score, then triggers a clear action ladder. Prevention beats cure: catching trouble two weeks before it shows up in DPD is dramatically cheaper than collecting on it.'}
      </AiP>

      <EwsFlowDiagram isAr={isAr} isMobile={isMobile}/>

      <AiSub>{isAr ? 'جرّب النموذج' : 'Feel the model'}</AiSub>
      <AiP>
        {isAr
          ? 'حرّك أي إشارة لرؤية كيف تتغير الدرجة. يستهلك الإصدار الإنتاجي ٣٢ ميزة، هنا ست منها كعينة.'
          : 'Drag any of the levers below to see how the live score moves. Production EWS consumes 32 features; six representative ones are exposed here.'}
      </AiP>

      <div style={{
        background: 'var(--mal-paper)', border: '1px solid var(--mal-line)',
        borderRadius: 'var(--mal-r-lg)', padding: 18, marginTop: 18,
        display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 240px', gap: 22,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <MalSlider label={isAr ? 'أيام السيولة المتاحة' : 'Cash-cushion · days'} value={cashCushion}
                     onChange={setCashCushion} min={0} max={120} step={1} suffix={isAr ? ' يوم' : ' d'}/>
          <MalSlider label={isAr ? 'تأخر الاستحقاق (أيام)' : 'Current DPD (days)'} value={dpd}
                     onChange={setDpd} min={0} max={30} step={1}/>
          <MalSlider label={isAr ? 'تغيّر التصنيف الائتماني' : 'AECB delta · last 30d'} value={bureauDelta}
                     onChange={setBureauDelta} min={-50} max={20} step={1}
                     formatValue={(v) => v > 0 ? '+' + v : v} hint={isAr ? 'سالب = تدهور' : 'Negative = worsened'}/>
          <MalSlider label={isAr ? 'مبيعات سنوية%' : 'Sales · YoY'} value={salesYoY}
                     onChange={setSalesYoY} min={-40} max={60} step={1} suffix="%"/>
          <MalSlider label={isAr ? 'قفزة الديون' : 'New-debt spike · 30d'} value={exposureSpike}
                     onChange={setExposureSpike} min={0} max={60} step={1} suffix="%"/>
          <MalSlider label={isAr ? 'ضغط القطاع' : 'Sector stress index'} value={sectorStress}
                     onChange={setSectorStress} min={0} max={100} step={1}/>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, justifyContent: 'center' }}>
          <MalDonut value={score} max={100}
                    color={band.tone === 'danger' ? 'var(--mal-danger)' : band.tone === 'warn' ? 'var(--mal-warn)' : band.tone === 'success' ? 'var(--mal-success)' : 'var(--mal-primary)'}
                    label={isAr ? 'درجة المخاطر اليوم' : 'Risk score · today'}
                    sub={isAr ? 'من ١٠٠' : 'of 100'}
                    formatValue={(v) => Math.round(v) + ''}/>
          <Pill tone={band.tone} dot>{band.name}</Pill>
          <div style={{ fontSize: 11, color: 'var(--mal-mid)', textAlign: 'center', maxWidth: 200 }}>
            {band.desc}
          </div>
          <div style={{
            marginTop: 6, padding: '8px 12px', borderRadius: 999,
            background: 'var(--mal-surface-2)', fontSize: 11, color: 'var(--mal-mid)',
          }}>
            {isAr ? `توقع يوم ١٤: ${forecast}` : `14-day forecast: ${forecast}`}
          </div>
        </div>
      </div>

      {/* Trigger ladder */}
      <div style={{ marginTop: 22 }}>
        <AiSub>{isAr ? 'سُلم التدخل' : 'Action ladder'}</AiSub>
        <div style={{ display: 'grid', gap: 8, gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)' }}>
          {[
            { range: '0-24',  name: 'Healthy',    action: isAr ? 'لا شيء' : 'No-touch' },
            { range: '25-49', name: 'Watch',      action: isAr ? 'تذكير وتمديد محتمل' : 'Soft nudge · pre-offer extension' },
            { range: '50-74', name: 'Stressed',   action: isAr ? 'حوار إعادة هيكلة' : 'Restructure call within 48h' },
            { range: '75-100',name: 'Distressed', action: isAr ? 'فريق المعالجة' : 'Remediation team handoff' },
          ].map((b, i) => {
            const inBand = (i === 0 && score < 25) || (i === 1 && score >= 25 && score < 50) || (i === 2 && score >= 50 && score < 75) || (i === 3 && score >= 75);
            return (
              <div key={i} style={{
                background: inBand ? 'var(--mal-primary-50)' : 'var(--mal-paper)',
                border: '1px solid ' + (inBand ? 'var(--mal-primary)' : 'var(--mal-line)'),
                borderRadius: 12, padding: 12,
                transition: 'all .25s',
              }}>
                <div className="mal-caption" style={{ color: 'var(--mal-mid)' }}>{b.range}</div>
                <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>{b.name}</div>
                <div style={{ fontSize: 11, color: 'var(--mal-mid)', marginTop: 4, lineHeight: 1.5 }}>{b.action}</div>
              </div>
            );
          })}
        </div>
      </div>
    </AiSectionWrapper>
  );
}
function clampN(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// ============================================================
// COLLECTIONS. Bilingual AI dialer + outcome funnel
// ============================================================
function AiCollections({ refFn, isAr, isMobile }) {
  return (
    <AiSectionWrapper id="aiCollect" refFn={refFn}
      eyebrow={isAr ? 'التحصيل الذكي' : 'AI collections'}
      title={isAr ? 'حوارات تتعاطف، لا تطارد.' : 'Conversations that empathise، not chase.'}>
      <AiP>
        {isAr
          ? 'لا نتبع جدولة خطية ثابتة (يوم ٣، يوم ٧، يوم ١٤). المدخلات السلوكية، بيانات القرض، وملف العميل تغذّي نموذج التحصيل الذي يولّد توصية، أفضل قناة، أفضل وقت، أفضل نبرة، ثم تُنفّذ كحملة. حلقة التغذية الراجعة تدخل سجل الإجراءات لإعادة ضبط النموذج باستمرار.'
          : 'No linear day-3 / day-7 / day-14 cadence. Behavioural, loan-info, and profile signals feed a collection model that emits a personalised recommendation. Best channel, best time-slot, best message tone. Which is executed as a campaign. Whether the action worked or not is logged and feeds back to retune the model.'}
      </AiP>

      <CollectionsFlowDiagram isAr={isAr} isMobile={isMobile}/>

      <AiSub>{isAr ? 'الوكيل الصوتي · القمع · KPIs' : 'Voice agent · funnel · KPIs'}</AiSub>
      <AiP>
        {isAr
          ? 'الوكيل الصوتي الثنائي ينفّذ التوصية: يتصل أولاً، يستمع، يقترح خطة، ويسجّل الالتزام بالدفع. البشر يدخلون فقط عند الحاجة.'
          : 'The bilingual voice agent executes the recommendation: it calls first, listens for context, proposes a plan, and books a promise-to-pay. Humans only step in for refer cases or sensitive situations.'}
      </AiP>

      <div style={{
        marginTop: 16, display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16,
      }}>
        {/* Funnel */}
        <div style={{
          background: 'var(--mal-paper)', border: '1px solid var(--mal-line)',
          borderRadius: 14, padding: 16,
        }}>
          <div className="mal-caption" style={{ color: 'var(--mal-mid)' }}>
            {isAr ? 'دورة التحصيل · شهرياً' : 'Monthly collections funnel'}
          </div>
          <div style={{ marginTop: 12 }}>
            <FunnelRow label={isAr ? 'حالات DPD ١-٧' : 'DPD 1-7 cases'}     count={1240} pct={100} tone="iri"/>
            <FunnelRow label={isAr ? 'تواصل تلقائي' : 'AI auto-reach'}      count={1180} pct={95}  tone="iri"/>
            <FunnelRow label={isAr ? 'ردّ العميل' : 'Customer responded'}    count={870}  pct={70}  tone="iri"/>
            <FunnelRow label={isAr ? 'وعد بالدفع' : 'Promise-to-pay'}        count={680}  pct={55}  tone="success"/>
            <FunnelRow label={isAr ? 'دفع فعلي' : 'Actual payment'}          count={612}  pct={49}  tone="success"/>
          </div>
        </div>

        {/* Sample call transcript */}
        <div style={{
          background: 'var(--mal-paper)', border: '1px solid var(--mal-line)',
          borderRadius: 14, padding: 16, fontSize: 13,
        }}>
          <div className="mal-caption" style={{ color: 'var(--mal-mid)', marginBottom: 8 }}>
            {isAr ? 'مكالمة عينة · DPD ٤' : 'Sample call · DPD 4'}
          </div>
          <Bubble who="ai">
            {isAr
              ? 'مساء الخير، أتصل من مال بشأن قسط فاتورة #١٢٩٤. هل لديك دقيقة؟'
              : 'Hi, this is Mal calling about the EMI on invoice #1294. Got 60 seconds?'}
          </Bubble>
          <Bubble who="customer">
            {isAr
              ? 'نعم، الفاتورة عند العميل، تأخر التحويل أربعة أيام.'
              : 'Yes، buyer just delayed the wire by four days, money should land Friday.'}
          </Bubble>
          <Bubble who="ai">
            {isAr
              ? 'فهمت. أستطيع تأجيل القسط حتى الجمعة بدون رسوم تأخير. هل أرسل لك الرابط؟'
              : 'Understood. I can shift the EMI to Friday with the late-fee waived. Want me to text the confirmation link?'}
          </Bubble>
          <Bubble who="customer">{isAr ? 'نعم شكراً.' : 'Yes please.'}</Bubble>
          <div style={{ marginTop: 10, padding: '8px 10px', background: 'var(--mal-surface-2)', borderRadius: 8, fontSize: 11, color: 'var(--mal-mid)' }}>
            {isAr ? 'مدة المكالمة: ٤٢ ث · وعد بالدفع: نعم · الانتقال للبشر: لا' : 'Call duration 42s · PTP captured · No human handoff'}
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        <MalKpi label={isAr ? 'متوسط مدة المكالمة' : 'Avg call duration'} value="48s" sub={isAr ? 'مقابل ٣ د بشري' : 'vs 3m human'}/>
        <MalKpi label={isAr ? 'PTP rate' : 'PTP rate'} value="55%" delta="+18pp" deltaTone="up"/>
        <MalKpi label={isAr ? 'استرداد ٣٠ يوم' : '30-d cure rate'} value="49%" delta="+12pp" deltaTone="up"/>
        <MalKpi label={isAr ? 'تكلفة المكالمة' : 'Cost / contact'} value="AED 0.40" sub={isAr ? 'مقابل ٧ درهم' : 'vs AED 7 human'}/>
      </div>
    </AiSectionWrapper>
  );
}
function FunnelRow({ label, count, pct, tone }) {
  const color = tone === 'success' ? 'var(--mal-success)' : 'var(--mal-primary-3)';
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
        <span style={{ color: 'var(--mal-mid)' }}>{label}</span>
        <span style={{ fontFamily: 'var(--mal-font-mono)', color: 'var(--mal-ink)' }}>{count.toLocaleString()} · {pct}%</span>
      </div>
      <div style={{ height: 6, borderRadius: 999, background: 'var(--mal-surface-2)', overflow: 'hidden' }}>
        <div style={{
          width: pct + '%', height: '100%', background: color,
          transition: 'width .6s cubic-bezier(.4,0,.2,1)',
        }}/>
      </div>
    </div>
  );
}
function Bubble({ who, children }) {
  const isAi = who === 'ai';
  return (
    <div style={{
      display: 'flex', justifyContent: isAi ? 'flex-start' : 'flex-end',
      marginBottom: 6,
    }}>
      <div style={{
        maxWidth: '78%',
        background: isAi ? 'var(--mal-primary-50)' : 'var(--mal-surface-2)',
        color: 'var(--mal-ink)',
        padding: '8px 12px', borderRadius: 14, fontSize: 12.5, lineHeight: 1.5,
      }}>
        <div style={{ fontSize: 9.5, color: 'var(--mal-mid-2)', marginBottom: 2, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase' }}>
          {isAi ? 'AGENT' : 'CUSTOMER'}
        </div>
        {children}
      </div>
    </div>
  );
}

// ============================================================
// DECISION ENGINE. Live prototype CTA
// ============================================================
function DecisionPrototypeCta({ isAr, isMobile }) {
  const cfg = DECISION_ENGINE_PROTOTYPE;
  const [copied, setCopied] = aiS('');
  const copy = (txt, key) => {
    try {
      navigator.clipboard?.writeText(txt);
      setCopied(key);
      setTimeout(() => setCopied(''), 1300);
    } catch (e) {}
  };

  return (
    <div style={{
      marginTop: 18, marginBottom: 26,
      border: '1px solid var(--mal-line)',
      borderRadius: 16, overflow: 'hidden',
      background: 'var(--mal-paper)',
    }}>
      {/* Browser-frame mock header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 14px',
        borderBottom: '1px solid var(--mal-line)',
        background: 'var(--mal-surface-2)',
      }}>
        <span style={{ display: 'inline-flex', gap: 5 }}>
          <span style={{ width: 9, height: 9, borderRadius: 999, background: '#e85a4f' }}/>
          <span style={{ width: 9, height: 9, borderRadius: 999, background: '#e8b34f' }}/>
          <span style={{ width: 9, height: 9, borderRadius: 999, background: '#5fb260' }}/>
        </span>
        <code style={{
          fontFamily: 'var(--mal-font-mono)',
          fontSize: 12.5, color: 'var(--mal-mid)',
          flex: 1, minWidth: 0,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{cfg.url}</code>
        <Pill tone="success" dot>{isAr ? 'يعمل' : 'Live'}</Pill>
      </div>

      <div style={{
        padding: 18,
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 280px',
        gap: 18, alignItems: 'center',
      }}>
        <div>
          <div className="mal-caption" style={{ color: 'var(--mal-primary)' }}>
            {isAr ? 'نموذج عمل تفاعلي' : 'Working prototype'}
          </div>
          <div style={{
            fontFamily: 'var(--mal-font-display)', fontStyle: 'italic',
            fontSize: 24, lineHeight: 1.2, marginTop: 4,
          }}>
            {isAr
              ? 'محرك قرار قابل للضبط من فريق المخاطر.'
              : 'A decision engine the risk team can configure themselves.'}
          </div>
          <p style={{
            fontSize: 13.5, color: 'var(--mal-mid)',
            marginTop: 8, lineHeight: 1.6, maxWidth: 540,
          }}>
            {isAr
              ? 'بنينا واجهة منخفضة الكود حيث يضيف فريق المخاطر القواعد، يضبط البوابات، ويعدل السياسة دون الاعتماد على الهندسة. طبقة قواعد حتمية + طبقة تسجيل ذكي + محرك العروض.'
              : 'We built the in-house low-code / drag-and-drop interface where the risk team adds rules, tunes policy gates, and ships scoring criteria without an engineering hand-off. Deterministic rule layer + AI scoring layer + offer engine. Manageable day-to-day by risk.'}
          </p>
          <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <a href={cfg.url} target="_blank" rel="noopener noreferrer"
               className="mal-pill-btn"
               style={{
                 textDecoration: 'none',
                 background: 'var(--mal-primary)',
                 color: '#fff',
                 borderColor: 'transparent',
                 fontWeight: 600,
                 display: 'inline-flex', alignItems: 'center', gap: 6,
               }}>
              {isAr ? 'افتح في تبويب جديد' : 'Open prototype'}
              <span style={{ fontSize: 11 }}>↗</span>
            </a>
            <button onClick={() => copy(cfg.url, 'url')} className="mal-pill-btn">
              {copied === 'url' ? (isAr ? 'تم النسخ' : 'Copied') : (isAr ? 'نسخ الرابط' : 'Copy link')}
            </button>
          </div>
        </div>

        {/* Credentials box */}
        <div style={{
          background: 'var(--mal-surface-2)',
          border: '1px solid var(--mal-line)',
          borderRadius: 12, padding: 14,
        }}>
          <div className="mal-caption" style={{ color: 'var(--mal-mid)', marginBottom: 8 }}>
            {isAr ? 'بيانات الدخول' : 'Sign-in'}
          </div>
          <CredentialRow
            label={isAr ? 'اسم المستخدم' : 'Username'}
            value={cfg.username}
            onCopy={() => copy(cfg.username, 'u')}
            copied={copied === 'u'}
            isAr={isAr}
          />
          <div style={{ height: 8 }}/>
          <CredentialRow
            label={isAr ? 'كلمة المرور' : 'Password'}
            value={cfg.password}
            onCopy={() => copy(cfg.password, 'p')}
            copied={copied === 'p'}
            isAr={isAr}
            mono
          />
          <div style={{
            marginTop: 10, fontSize: 10.5, color: 'var(--mal-mid-2)',
            lineHeight: 1.5,
          }}>
            {isAr
              ? 'بيئة عرض داخلية. لا توجد بيانات حقيقية.'
              : 'Internal demo environment. No real customer data.'}
          </div>
        </div>
      </div>
    </div>
  );
}

function CredentialRow({ label, value, onCopy, copied, isAr, mono }) {
  return (
    <div>
      <div style={{
        fontSize: 10.5, color: 'var(--mal-mid)',
        textTransform: 'uppercase', letterSpacing: '.08em',
        marginBottom: 3,
      }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <code style={{
          fontFamily: 'var(--mal-font-mono)',
          fontSize: 13, color: 'var(--mal-ink)',
          background: 'var(--mal-paper)',
          border: '1px solid var(--mal-line)',
          borderRadius: 7, padding: '5px 9px',
          flex: 1, minWidth: 0,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{value}</code>
        <button onClick={onCopy} title={isAr ? 'نسخ' : 'Copy'} style={{
          appearance: 'none', cursor: 'pointer',
          fontFamily: 'var(--mal-font-ui)', fontSize: 11,
          padding: '5px 9px', borderRadius: 7,
          border: '1px solid var(--mal-line)',
          background: copied ? 'var(--mal-success-50, #e6f5ee)' : 'var(--mal-paper)',
          color: copied ? 'var(--mal-success, #0a8056)' : 'var(--mal-ink-2)',
          transition: 'background .2s, color .2s',
        }}>{copied ? '✓' : (isAr ? 'نسخ' : 'Copy')}</button>
      </div>
    </div>
  );
}

// ============================================================
// DYNAMIC PRICING. Diagram + linear equation
// ============================================================
function AiPricing({ refFn, isAr, isMobile }) {
  const dataLake = [
    { label: 'Device' }, { label: 'Profile' }, { label: 'LMS' },
  ];
  const realtime = [
    { label: 'KYC' }, { label: 'LOS' }, { label: 'Bureau' },
  ];
  const modules = [
    {
      key: 'aff', name: isAr ? 'الوفرة' : 'Affluence', tone: '#5a3aa3',
      bullets: ['Declared income', 'Estimated income', 'Bands D1, D2, …'],
    },
    {
      key: 'risk', name: isAr ? 'المخاطر' : 'Risk', tone: '#b8364b',
      bullets: ['Behavioural risk model (on-us)', 'Bureau, Price elasticity', 'Alternate-data model (off-us)'],
    },
    {
      key: 'sens', name: isAr ? 'الحساسية' : 'Sensitivity', tone: '#0a8056',
      bullets: ['Offer sensitivity', 'Loan amount, Price elasticity', 'Journey sensitivity, process convenience'],
    },
  ];
  const arrows = [
    { lhs: 'Risk',        dir: 'up',   rhs: 'Price', way: 'up'   },
    { lhs: 'Affluence',   dir: 'up',   rhs: 'Price', way: 'down' },
    { lhs: 'Sensitivity', dir: 'up',   rhs: 'Price', way: 'down' },
    { lhs: 'Amount',      dir: 'up',   rhs: 'Price', way: 'down' },
    { lhs: 'Tenure',      dir: 'up',   rhs: 'Price', way: 'up'   },
  ];

  return (
    <AiSectionWrapper id="aiPricing" refFn={refFn}
      eyebrow={isAr ? 'التسعير الديناميكي' : 'Dynamic pricing'}
      title={isAr ? 'لكل عميل سعر يستحقه، لا تسعير ثابت.' : 'Risk-based pricing، never a flat APR.'}>
      <AiP>
        {isAr
          ? 'الهدف ليس انتزاع أعلى هامش، بل العرض الصحيح للعميل الصحيح. مدخلات الجهاز والملف الشخصي و LMS، إلى جانب البيانات الحية من KYC و LOS والمكتب الائتماني، تغذي ثلاث وحدات تسعير: الوفرة، المخاطر، الحساسية. الناتج يمر بسقف وحدّ أدنى محكومين بسياسة المحفظة.'
          : 'The goal is not to extract maximum margin. It is to give the right offer to the right customer. Device, profile, and LMS context, alongside live KYC, LOS, and Bureau data, feed three pricing modules. Affluence, Risk, Sensitivity. The output passes through portfolio-level governance (floor and cap) before it reaches the customer.'}
      </AiP>

      {/* Diagram */}
      <div style={{
        marginTop: 18, padding: 20,
        background: 'var(--mal-paper)',
        border: '1px solid var(--mal-line)',
        borderRadius: 16,
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '210px 1fr 220px',
        gap: 18, alignItems: 'stretch',
      }}>
        {/* Left: data sources */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <DataPanel
            title={isAr ? 'بحيرة البيانات' : 'Data Lake · batch'}
            chips={dataLake}
            tone="#1f54c8"
          />
          <DataPanel
            title={isAr ? 'بيانات حية' : 'Real-time data'}
            chips={realtime}
            tone="#0a8056"
          />
        </div>

        {/* Middle: customer + 3 pricing modules */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 14, justifyContent: 'space-between',
        }}>
          <div style={{
            padding: '12px 16px', borderRadius: 999,
            background: 'var(--mal-surface-2)',
            border: '1px solid var(--mal-line)',
            fontSize: 13, fontWeight: 600,
            display: 'inline-flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{
              width: 26, height: 26, borderRadius: 999,
              background: 'var(--mal-primary)', color: '#fff',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13,
            }}>👤</span>
            {isAr ? 'العميل' : 'Customer'}
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 10, width: '100%',
          }}>
            {modules.map((m) => (
              <div key={m.key} style={{
                background: 'var(--mal-paper)',
                border: '1px solid ' + m.tone + '55',
                borderRadius: 12, padding: 12,
                position: 'relative', overflow: 'hidden',
              }}>
                <div style={{
                  position: 'absolute', insetInlineStart: 0, top: 0, bottom: 0,
                  width: 3, background: m.tone,
                }}/>
                <div style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: '.08em',
                  textTransform: 'uppercase', color: m.tone,
                  marginInlineStart: 8,
                }}>{m.name}</div>
                <ul style={{
                  margin: '8px 0 0 8px', paddingInlineStart: 14,
                  fontSize: 11, color: 'var(--mal-ink)', lineHeight: 1.55,
                }}>
                  {m.bullets.map((b, i) => <li key={i}>{b}</li>)}
                </ul>
              </div>
            ))}
          </div>

          <div style={{
            fontSize: 11, color: 'var(--mal-mid)', textAlign: 'center',
            fontFamily: 'var(--mal-font-mono)',
          }}>
            ↓ {isAr ? 'عرض السعر الديناميكي' : 'Dynamic price offer'} ↓
          </div>
        </div>

        {/* Right: approved offer + arrow legend */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{
            background: 'linear-gradient(135deg, var(--mal-primary-50), var(--mal-paper))',
            border: '1px solid var(--mal-primary-3)',
            borderRadius: 12, padding: 14,
          }}>
            <div className="mal-caption" style={{ color: 'var(--mal-primary)' }}>
              {isAr ? 'العرض المعتمد' : 'Approved offer'}
            </div>
            <ul style={{
              margin: '8px 0 0', paddingInlineStart: 14,
              fontSize: 12, color: 'var(--mal-ink)', lineHeight: 1.7,
            }}>
              <li>{isAr ? 'مبلغ القرض' : 'Selected loan amount'}</li>
              <li>{isAr ? 'المدة' : 'Selected tenure'}</li>
              <li>{isAr ? 'APR قائم على المخاطر' : 'Risk-based APR'}</li>
            </ul>
          </div>

          <div style={{
            background: 'var(--mal-surface-2)',
            border: '1px solid var(--mal-line)',
            borderRadius: 12, padding: 12,
          }}>
            <div className="mal-caption" style={{ color: 'var(--mal-mid)', marginBottom: 8 }}>
              {isAr ? 'حساسية السعر' : 'Price sensitivity'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {arrows.map((a, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontSize: 11.5, fontFamily: 'var(--mal-font-mono)',
                }}>
                  <span style={{ minWidth: 76, color: 'var(--mal-ink)' }}>{a.lhs}</span>
                  <span style={{ color: 'var(--mal-mid)' }}>{a.dir === 'up' ? '↑' : '↓'}</span>
                  <span style={{ color: 'var(--mal-mid-2)' }}>→</span>
                  <span style={{ color: 'var(--mal-ink)' }}>{a.rhs}</span>
                  <span style={{
                    color: a.way === 'up' ? '#b8364b' : '#0a8056',
                    fontWeight: 700,
                  }}>{a.way === 'up' ? '↑' : '↓'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Equation card */}
      <div style={{
        marginTop: 18, padding: 18,
        background: 'var(--mal-paper)',
        border: '1px solid var(--mal-line)',
        borderRadius: 14,
      }}>
        <AiSub>{isAr ? 'المعادلة الخطية الأساسية' : 'Core linear equation'}</AiSub>
        <p style={{
          fontSize: 12.5, color: 'var(--mal-mid)',
          margin: '0 0 10px', lineHeight: 1.55,
        }}>
          {isAr
            ? 'لكل مقترض i بميزات مستمرة xij ومتغيرات مبوبة b(1)f, b(2)f. السعر بـ bps:'
            : 'Borrower i has continuous features xij and bucketed attributes b(1)f, b(2)f. Price in bps:'}
        </p>
        <div style={{
          padding: '12px 14px', borderRadius: 10,
          background: 'var(--mal-surface-2)',
          border: '1px solid var(--mal-line)',
          fontFamily: 'var(--mal-font-mono)',
          fontSize: 14, lineHeight: 1.7,
          overflowX: 'auto', whiteSpace: 'nowrap',
        }}>
          APRᵢ = CoF + μ + Σⱼ βⱼ · xᵢⱼ + Σ_f G_f[ b<sup>(1)</sup>_f(i), b<sup>(2)</sup>_f(i) ]
        </div>
        <p style={{
          fontSize: 12.5, color: 'var(--mal-mid)',
          margin: '12px 0 6px', lineHeight: 1.55,
        }}>
          {isAr
            ? 'ثم تطبَّق الحوكمة:'
            : 'Then apply governance:'}
        </p>
        <div style={{
          padding: '12px 14px', borderRadius: 10,
          background: 'var(--mal-surface-2)',
          border: '1px solid var(--mal-line)',
          fontFamily: 'var(--mal-font-mono)',
          fontSize: 14, lineHeight: 1.7,
          overflowX: 'auto', whiteSpace: 'nowrap',
        }}>
          APRᵢ = min( max( APRᵢ, APR_floor ), APR_cap )
        </div>
        <div style={{
          marginTop: 12,
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
          gap: 10, fontSize: 12, color: 'var(--mal-ink)', lineHeight: 1.55,
        }}>
          <div><strong>μ</strong>: {isAr ? 'انتشار قاعدة المحفظة (مضبوط لتحقيق هدف P&L / RAROC)' : 'portfolio base spread, tuned to hit P&L / RAROC target'}</div>
          <div><strong>βⱼ</strong>: {isAr ? 'معاملات خطية للمحركات المستمرة' : 'linear coefficients for continuous drivers'}</div>
          <div><strong>G_f</strong>: {isAr ? 'شبكات NxM لتفاعلات ثنائية (مثل Risk × Affluence)' : 'NxM grids capturing 2-way interactions (e.g. Risk × Affluence)'}</div>
        </div>
      </div>

      {/* Tier band table. Mirrors the PDF */}
      <AiSub>{isAr ? 'نطاقات السعر حسب الفئة' : 'Risk-tier pricing bands'}</AiSub>
      <div style={{
        background: 'var(--mal-paper)', border: '1px solid var(--mal-line)',
        borderRadius: 14, overflow: 'hidden',
      }}>
        <table style={{
          width: '100%', borderCollapse: 'collapse',
          fontSize: 13, fontFamily: 'var(--mal-font-ui)',
        }}>
          <thead>
            <tr style={{ background: 'var(--mal-surface-2)', borderBottom: '1px solid var(--mal-line)' }}>
              <th style={{ textAlign: 'start', padding: '10px 14px', fontWeight: 600, color: 'var(--mal-mid)' }}>Risk tier</th>
              <th style={{ textAlign: 'start', padding: '10px 14px', fontWeight: 600, color: 'var(--mal-mid)' }}>Annual rate</th>
              <th style={{ textAlign: 'start', padding: '10px 14px', fontWeight: 600, color: 'var(--mal-mid)' }}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {[
              { t: 'Tier 1 · Prime',     r: '12 – 15 %', n: 'Competitive vs incumbent banks; speed premium' },
              { t: 'Tier 2 · Standard',  r: '16 – 22 %', n: 'Mainstream SME credit pricing' },
              { t: 'Tier 3 · Near-prime',r: '23 – 28 %', n: 'Risk-adjusted; still below fintech / informal credit' },
            ].map((row, i) => (
              <tr key={i} style={{ borderTop: i ? '1px solid var(--mal-line-2)' : 'none' }}>
                <td style={{ padding: '10px 14px', fontWeight: 600 }}>{row.t}</td>
                <td style={{ padding: '10px 14px', fontFamily: 'var(--mal-font-mono)' }}>{row.r}</td>
                <td style={{ padding: '10px 14px', color: 'var(--mal-mid)' }}>{row.n}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ marginTop: 8, fontSize: 11.5, color: 'var(--mal-mid-2)' }}>
        {isAr ? 'افتراض: تكلفة التمويل ٤–٥٪ بناءً على سوق الودائع الإماراتي + وصول التمويل بالجملة.' : 'Assumption: cost of funds at ~4–5% p.a. based on UAE deposit market + wholesale funding access.'}
      </p>
    </AiSectionWrapper>
  );
}

function DataPanel({ title, chips, tone }) {
  return (
    <div style={{
      background: 'var(--mal-paper)',
      border: '1px solid var(--mal-line)',
      borderRadius: 12, padding: 12,
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', insetInlineStart: 0, top: 0, bottom: 0,
        width: 3, background: tone,
      }}/>
      <div style={{
        fontSize: 10.5, fontWeight: 700, letterSpacing: '.08em',
        textTransform: 'uppercase', color: tone,
        marginInlineStart: 8, marginBottom: 8,
      }}>{title}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginInlineStart: 8 }}>
        {chips.map((c, i) => (
          <span key={i} style={{
            fontSize: 11, padding: '3px 8px',
            borderRadius: 999,
            background: 'var(--mal-surface-2)',
            border: '1px solid var(--mal-line)',
            color: 'var(--mal-ink-1)',
            fontFamily: 'var(--mal-font-mono)',
          }}>{c.label}</span>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// EWS event-flow diagram. 5 categories → score → action ladder
// ============================================================
function EwsFlowDiagram({ isAr, isMobile }) {
  const cats = [
    {
      key: 'fin', name: isAr ? 'مالية' : 'Financial', tone: '#1f54c8',
      events: ['Declining cash flow', 'Poor sales / profit', 'Adverse audit reports', 'Inventory pile-up', 'Receivables pile-up', 'Low debt-coverage ratio'],
    },
    {
      key: 'bank', name: isAr ? 'مصرفية' : 'Banking', tone: '#5a3aa3',
      events: ['Poor payment record', 'Cheque bounces', 'Over-utilisation of limit', 'Central fraud data', 'Public defaulter list', 'Increase in debt'],
    },
    {
      key: 'ops', name: isAr ? 'تشغيلية' : 'Operational', tone: '#b06a14',
      events: ['Loss of customers', 'Disputes with suppliers', 'Labour unrest', 'Project / supplier delays', 'Regulatory violations', 'Management disputes'],
    },
    {
      key: 'beh', name: isAr ? 'سلوكية' : 'Behavioural', tone: '#b8364b',
      events: ['-ve media reporting', '-ve analyst report', 'Lawsuits filed', 'Frequent device / location change', 'Delay in payment', 'Ceasing communication'],
    },
    {
      key: 'macro', name: isAr ? 'كلية' : 'Macroeconomic', tone: '#0a8056',
      events: ['Economy outlook', 'Sectoral performance', 'Unemployment rate', 'Inflation forecast', 'Recession indicators', 'Banking NPAs'],
    },
  ];
  const bands = [
    {
      name: isAr ? 'حرج' : 'Critical',  tone: '#b8364b',
      actions: ['Immediate Freeze', 'Intensive Review', 'Direct Engagement', 'Initiate Recovery', 'System Flag'],
    },
    {
      name: isAr ? 'مرتفع' : 'High',     tone: '#b06a14',
      actions: ['Limit Management', 'Proactive Intervention', 'Restructuring', 'Enhanced Monitoring'],
    },
    {
      name: isAr ? 'متوسط' : 'Medium',   tone: '#1f54c8',
      actions: ['Automated Monitoring', 'Suspend Pre-approvals', 'Soft Engagement', 'Portfolio Review'],
    },
    {
      name: isAr ? 'منخفض' : 'Low',      tone: '#0a8056',
      actions: ['Standard Management', 'Growth Opportunity', 'Customer Loyalty', 'Automated Monitoring'],
    },
  ];

  return (
    <div style={{
      marginTop: 8, padding: 18,
      background: 'var(--mal-paper)',
      border: '1px solid var(--mal-line)',
      borderRadius: 16,
    }}>
      {/* Top: 5 event-source columns */}
      <div className="mal-caption" style={{ color: 'var(--mal-mid)', marginBottom: 10 }}>
        {isAr ? 'مصادر الأحداث' : 'Event sources'}
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(5, 1fr)',
        gap: 10,
      }}>
        {cats.map((c) => (
          <div key={c.key} style={{
            background: 'var(--mal-surface-2)',
            border: '1px solid ' + c.tone + '40',
            borderRadius: 10, padding: 10,
          }}>
            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '.08em',
              textTransform: 'uppercase', color: c.tone,
              marginBottom: 6,
            }}>{c.name}</div>
            <ul style={{
              margin: 0, paddingInlineStart: 14,
              fontSize: 10.5, lineHeight: 1.5, color: 'var(--mal-ink)',
            }}>
              {c.events.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        ))}
      </div>

      {/* Trigger arrows */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(5, 1fr)',
        gap: 10, margin: '8px 0',
      }}>
        {cats.map((c) => (
          <div key={c.key} style={{
            display: 'flex', justifyContent: 'center',
            fontSize: 10, color: 'var(--mal-mid-2)',
            fontFamily: 'var(--mal-font-mono)', letterSpacing: '.08em',
          }}>↓ Trigger ↓</div>
        ))}
      </div>

      {/* EWS Score bar */}
      <div style={{
        padding: '12px 16px',
        background: 'linear-gradient(90deg, #0a805615, #1f54c815, #b06a1415, #b8364b15)',
        border: '1px solid var(--mal-line)',
        borderRadius: 10,
        textAlign: 'center',
        fontWeight: 700, fontSize: 14,
        letterSpacing: '.06em',
        color: 'var(--mal-ink-1)',
      }}>EWS SCORE</div>

      {/* 4 risk bands */}
      <div style={{
        marginTop: 14,
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
        gap: 10,
      }}>
        {bands.map((b) => (
          <div key={b.name} style={{
            background: 'var(--mal-paper)',
            border: '1px solid ' + b.tone + '40',
            borderRadius: 10, padding: 12,
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 3,
              background: b.tone,
            }}/>
            <div style={{
              fontSize: 12, fontWeight: 700,
              color: b.tone, marginTop: 6, marginBottom: 6,
            }}>{b.name}</div>
            <div className="mal-caption" style={{ color: 'var(--mal-mid)', marginBottom: 4 }}>
              {isAr ? 'الإجراءات' : 'Actions'}
            </div>
            <ul style={{
              margin: 0, paddingInlineStart: 14,
              fontSize: 10.5, lineHeight: 1.55, color: 'var(--mal-ink)',
            }}>
              {b.actions.map((a, i) => <li key={i}>{a}</li>)}
            </ul>
          </div>
        ))}
      </div>

      {/* Operating tools row */}
      <div style={{
        marginTop: 12,
        display: 'flex', flexWrap: 'wrap', gap: 8,
        fontSize: 11, color: 'var(--mal-mid)',
      }}>
        <span style={{ color: 'var(--mal-mid-2)' }}>{isAr ? 'الأدوات:' : 'Tools:'}</span>
        {['Reports & Dashboards', 'Case Management', 'Investigation Tools'].map((t) => (
          <span key={t} style={{
            padding: '3px 9px', borderRadius: 999,
            background: 'var(--mal-surface-2)',
            border: '1px solid var(--mal-line)',
          }}>{t}</span>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// COLLECTIONS. AI flow diagram
// ============================================================
function CollectionsFlowDiagram({ isAr, isMobile }) {
  const inputs = [
    { name: isAr ? 'سلوكية' : 'Behavioural' },
    { name: isAr ? 'بيانات القرض' : 'Loan info' },
    { name: isAr ? 'الملف' : 'Profile' },
  ];
  const outputs = [
    { name: isAr ? 'قنوات الاتصال / الاتصال التلقائي' : 'Communication channels / auto-diallers' },
    { name: isAr ? 'الفترة الزمنية' : 'Time slot' },
    { name: isAr ? 'نبرة الرسالة' : 'Message tone' },
  ];
  return (
    <div style={{
      marginTop: 8, padding: 18,
      background: 'var(--mal-paper)',
      border: '1px solid var(--mal-line)',
      borderRadius: 16,
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : '1fr 240px',
      gap: 18,
    }}>
      <div>
        {/* Inputs row */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10,
        }}>
          {inputs.map((it, i) => (
            <div key={i} style={{
              background: 'var(--mal-surface-2)',
              border: '1px solid var(--mal-line)',
              borderRadius: 10, padding: '10px 12px',
              textAlign: 'center', fontSize: 12.5, fontWeight: 600,
              color: 'var(--mal-ink)',
            }}>{it.name}</div>
          ))}
        </div>

        <div style={{
          textAlign: 'center', fontSize: 10.5, color: 'var(--mal-mid-2)',
          margin: '6px 0', fontFamily: 'var(--mal-font-mono)', letterSpacing: '.1em',
        }}>↓ {isAr ? 'علم البيانات' : 'Data science'} ↓</div>

        {/* Pipeline */}
        <div style={{
          padding: 14, borderRadius: 12,
          background: 'var(--mal-paper)',
          border: '1.5px dashed var(--mal-primary-3)',
        }}>
          {[
            { name: isAr ? 'نموذج التحصيل' : 'Collection model',  fill: 'var(--mal-surface-2)', mark: false },
            { name: isAr ? 'توصية الذكاء الاصطناعي' : 'AI Recommendation', fill: 'var(--mal-primary-50)', mark: true },
            { name: isAr ? 'حملات التحصيل' : 'Collection campaigns', fill: 'var(--mal-surface-2)', mark: false },
          ].map((b, i) => (
            <div key={i}>
              <div style={{
                background: b.fill,
                border: '1px solid ' + (b.mark ? 'var(--mal-primary)' : 'var(--mal-line)'),
                borderRadius: 10, padding: '10px 14px',
                textAlign: 'center', fontSize: 13, fontWeight: 600,
                color: b.mark ? 'var(--mal-primary)' : 'var(--mal-ink)',
              }}>{b.name}</div>
              {i < 2 && (
                <div style={{
                  textAlign: 'center', fontSize: 10, color: 'var(--mal-mid-2)',
                  margin: '4px 0', fontFamily: 'var(--mal-font-mono)',
                }}>{i === 0 ? (isAr ? 'منشئ الاستراتيجية' : 'Strategy builder') : '↓'}</div>
              )}
            </div>
          ))}

          {/* Feedback loop */}
          <div style={{
            marginTop: 14,
            background: 'rgba(184,54,75,0.06)',
            border: '1px dashed #b8364b66',
            borderRadius: 10, padding: '8px 12px',
            fontSize: 11, color: 'var(--mal-ink)', lineHeight: 1.55,
          }}>
            <span style={{ color: '#b8364b', fontWeight: 700 }}>
              {isAr ? '↺ حلقة التغذية الراجعة:' : '↺ Feedback loop:'}
            </span>{' '}
            {isAr
              ? 'هل اتُّخذ الإجراء؟ سجّل الحدث · أعِد ضبط توصيات النموذج.'
              : 'Action taken or not · event-action log · refines the model\'s recommendations.'}
          </div>
        </div>
      </div>

      {/* Right: outputs (channel / time / tone) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="mal-caption" style={{ color: 'var(--mal-mid)' }}>
          {isAr ? 'الإخراج' : 'Output'}
        </div>
        {outputs.map((o, i) => (
          <div key={i} style={{
            background: 'linear-gradient(135deg, var(--mal-primary-50), var(--mal-paper))',
            border: '1px solid var(--mal-primary-3)',
            borderRadius: 10, padding: '10px 12px',
            fontSize: 12.5, fontWeight: 600,
            color: 'var(--mal-ink)',
          }}>{o.name}</div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// DATA + governance
// ============================================================
function AiData({ refFn, isAr }) {
  return (
    <AiSectionWrapper id="aiData" refFn={refFn}
      eyebrow={isAr ? 'البيانات والحوكمة' : 'Data foundations · governance'}
      title={isAr ? 'بيانات نظيفة، نماذج قابلة للمراجعة.' : 'Clean data in, audited models out.'}>
      <AiP>
        {isAr
          ? 'كل النماذج تمر عبر بطاقة نموذج، مجموعة تقييم، حوكمة انحياز، واختبار توضيح. التغييرات تذهب إلى لجنة المخاطر النموذجية.'
          : 'Every shipped model carries a Model Card, a held-out eval set, a fairness check (segment vs national baseline), and an explainability harness. Material changes go to the Model Risk Committee, exactly the way IFRS-9 reserves do.'}
      </AiP>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginTop: 14 }}>
        {[
          { t: isAr ? 'مصادر البيانات' : 'Sources',           v: ['AECB', 'EmaraTax e-invoice', 'Open Finance', 'Internal events', 'Anchor APIs'] },
          { t: isAr ? 'التخزين' : 'Storage',                  v: ['PostgreSQL ledger', 'Feature store', 'Object lake (PDF/img)', 'Vector store'] },
          { t: isAr ? 'الحوكمة' : 'Governance',               v: ['Model Cards', 'Bias audit', 'Replay log', 'Override trail', 'MRC sign-off'] },
          { t: isAr ? 'الخصوصية' : 'Privacy',                 v: ['UAE PDPL', 'Tokenised PII', 'Field-level access', 'Redaction at egress'] },
        ].map((c, i) => (
          <div key={i} style={{
            background: 'var(--mal-paper)', border: '1px solid var(--mal-line)',
            borderRadius: 12, padding: 14,
          }}>
            <div className="mal-caption" style={{ color: 'var(--mal-mid)' }}>{c.t}</div>
            <ul style={{ margin: '8px 0 0', paddingInlineStart: 16, fontSize: 12, color: 'var(--mal-ink)', lineHeight: 1.7 }}>
              {c.v.map((it) => <li key={it}>{it}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </AiSectionWrapper>
  );
}

// ============================================================
// ROADMAP
// ============================================================
function AiRoadmap({ refFn, isAr }) {
  const phases = [
    { q: 'H1 2026', focus: isAr ? 'تشغيل المنتج ١' : 'Launch P1 · Smart Invoice',  ships: ['KYC + AECB + OCR', 'Decision engine v1', 'Schedule + dunning agents', 'Reconciliation + audit'] },
    { q: 'H2 2026', focus: isAr ? 'الرعاية الصحية + التحصيل الصوتي' : 'Healthcare engine + voice collections', ships: ['Invoice/claim validator', 'Bilingual voice agent', 'EWS v1 (24 features)', 'Sharia validator GA'] },
    { q: 'H1 2027', focus: isAr ? 'مزاد المرسل + FLDG' : 'Anchor auction + FLDG distribution',                ships: ['Pricing optimiser', 'Anchor portal AI', 'EWS v2 (32 features)', 'Co-lending settlement'] },
    { q: 'H2 2027', focus: isAr ? 'استقلالية أعمق' : 'Deeper autonomy',                                       ships: ['78% auto-decision', 'Self-tuning collections', 'Federated bureau update', 'Regulator API live'] },
  ];
  return (
    <AiSectionWrapper id="aiRoadmap" refFn={refFn}
      eyebrow={isAr ? 'خارطة الطريق' : 'Roadmap'}
      title={isAr ? 'كيف نشحن الذكاء.' : 'How we ship intelligence.'}>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12,
      }}>
        {phases.map((p, i) => (
          <div key={p.q} style={{
            background: 'var(--mal-paper)', border: '1px solid var(--mal-line)',
            borderRadius: 14, padding: 14, position: 'relative',
          }}>
            <div className="mal-caption" style={{ color: 'var(--mal-primary)' }}>{p.q}</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>{p.focus}</div>
            <ul style={{ margin: '10px 0 0', paddingInlineStart: 16, fontSize: 12, color: 'var(--mal-mid)', lineHeight: 1.7 }}>
              {p.ships.map((s) => <li key={s} style={{ color: 'var(--mal-ink)' }}>{s}</li>)}
            </ul>
          </div>
        ))}
      </div>

      <div style={{
        marginTop: 30, padding: 22,
        background: 'linear-gradient(135deg, var(--mal-iri-1), var(--mal-iri-2), var(--mal-iri-4))',
        borderRadius: 'var(--mal-r-lg)', color: '#0F1117',
      }}>
        <div style={{ fontFamily: 'var(--mal-font-display)', fontStyle: 'italic', fontSize: 26, lineHeight: 1.15 }}>
          {isAr
            ? 'الذكاء ليس ميزة. هو منظومتنا التشغيلية.'
            : 'AI isn\'t a feature here. It is the operating model.'}
        </div>
        <div style={{ fontSize: 13, marginTop: 8, lineHeight: 1.6, maxWidth: 600 }}>
          {isAr
            ? 'كل وكيل قابل للقياس، الإلغاء، والمراجعة. لا توجد صناديق سوداء، فقط قرارات قابلة للتفسير، تحت إشراف بشري متى لزم.'
            : 'Every agent is measurable, overridable, and replayable. No black boxes. Just explainable decisions, with humans in the loop wherever the risk merits it.'}
        </div>
      </div>
    </AiSectionWrapper>
  );
}

window.SectionAi = SectionAi;
