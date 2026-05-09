/* eslint-disable */
// Mal — Demo Mode (side-by-side dual panel + lifecycle simulator).
//
// Two phases:
//   1) Narrative phase — autopilot script walks both panels through onboarding,
//      first invoice, plan pick, signing, wire arrival. Manual mode pauses the
//      script so the user can drive each panel themselves.
//   2) Live phase — full lifecycle simulator. simDay 0 → 200 advances the
//      calendar; the buyer + supplier panels re-render their state from the
//      schedule. Three scenarios: happy / late-cured / default-restructure.
//      User can scrub time, switch scenarios, switch modes, click into screens.

const { useState: dmS, useEffect: dmE, useRef: dmR, useMemo: dmM, useCallback: dmCB } = React;
const dmIco = window.MalIcon;
const A = window.MalAutopilot;

// ==================================================================
// 0. Phase model + scenario constants
// ==================================================================

const DM_PHASES = [
  { id: 'intro',      label: 'Welcome' },
  { id: 'onboarding', label: 'Onboarding' },
  { id: 'home',       label: 'Settled in' },
  { id: 'issue',      label: 'Invoice issued' },
  { id: 'receive',    label: 'Buyer receives' },
  { id: 'plan',       label: 'Plan picked' },
  { id: 'sign',       label: 'Signed · UAE Pass' },
  { id: 'funded',     label: 'Wire on the way' },
  { id: 'live',       label: 'Live · Day-by-day' },
];

const SCENARIOS = [
  { id: 'happy',         label: 'Happy path',          desc: 'All four EMIs auto-debit on time. Loan closes at Day 120.' },
  { id: 'late-cured',    label: 'Late EMI · cured',    desc: 'EMI 3 fails on Day 90. Buyer pays + 2% penalty on Day 95.' },
  { id: 'restructure',   label: 'Default · restructure', desc: 'EMI 3 fails. Tele-call Day 95. Restructured to 4 new EMIs.' },
];

// Buyer routes within phase=live
// home | invoice-detail | plan-picker | confirm | success
// extend-hero | extend-pick | extend-agree | extend-confirm | extend-active | extend-detail | extend-settle
// loan-detail | settle

// Supplier routes within phase=live
// home | activity | funded | watchlist | closed

// ==================================================================
// 1. Default state
// ==================================================================

const DEFAULT_PLAN = {
  type: 'installment_4',
  label: '4-month installments',
  tenorMonths: 4,
  principal: 250000,
  totalCost: 9000,           // fee
  emiAmount: 64750,          // (250000 + 9000) / 4
  startDay: 1,
  schedule: [
    { num: 1, dueDay: 30,  amount: 64750 },
    { num: 2, dueDay: 60,  amount: 64750 },
    { num: 3, dueDay: 90,  amount: 64750 },
    { num: 4, dueDay: 120, amount: 64750 },
  ],
};

const DEFAULT_SCENARIO = {
  // Onboarding control
  buyerStep: 0,
  supplierStep: 0,

  // Invoice the supplier issues
  invoice: {
    id: 'INV-2026-0418',
    buyer: 'Crescent Trading FZE',
    buyerTRN: '100123456700003',
    supplier: 'Atlas Packaging FZ',
    amount: 250000,
    issuedAt: null,
    dueDate: '30 Oct 2026',
    description: 'Industrial packaging — Q4 2026',
  },

  // Autopilot intro typing scratch
  draftBuyer: '',
  draftAmount: '',
  draftDescription: '',

  // Plan the buyer chose (set on autopilot finish or user pick)
  plan: null,                 // null until picked, then DEFAULT_PLAN
  signing: false,
  signed: false,

  // Term extension (if buyer takes the "Need more time" path)
  termExtension: null,        // null | { tenorMonths, principal, emiAmount, schedule, startDay }

  // Live phase — calendar + scenario
  simDay: 0,
  liveScenario: 'happy',     // 'happy' | 'late-cured' | 'restructure'

  // Buyer + supplier routes inside live phase (manual navigation)
  buyerRoute: 'home',
  supplierRoute: 'home',

  // Toasts + spotlight
  buyerToast: null,
  supplierToast: null,
  spotlight: null,
};

// ==================================================================
// 2. Lifecycle helpers — pure, derive from (plan, simDay, scenario)
// ==================================================================

// Compute the status of every EMI in the schedule given simDay + scenario.
// Returns an array of { num, dueDay, amount, status, paidDay?, daysOverdue? }.
function computeEmiStatuses(plan, simDay, scenario) {
  if (!plan) return [];
  return plan.schedule.map((emi, i) => {
    const isLateCuredEmi3 = scenario === 'late-cured' && emi.num === 3;
    const isRestructureEmi3 = scenario === 'restructure' && emi.num === 3;

    // Happy + late-cured (cures on Day 95) → EMI 3 paid on Day 95 instead of 90
    const effectivePaidDay = isLateCuredEmi3 ? 95 : emi.dueDay;
    // For restructure, EMI 3 onwards never auto-pays — collection stages handle it
    if (isRestructureEmi3) {
      // Days 90+ — overdue, escalating
      if (simDay < 90) return { ...emi, status: 'upcoming' };
      const dpd = simDay - 90;
      if (dpd < 5) return { ...emi, status: 'overdue', daysOverdue: dpd, stage: 'soft' };
      if (dpd < 15) return { ...emi, status: 'overdue', daysOverdue: dpd, stage: 'tele-call' };
      if (dpd < 31) return { ...emi, status: 'overdue', daysOverdue: dpd, stage: 'field' };
      return { ...emi, status: 'overdue', daysOverdue: dpd, stage: 'legal' };
    }

    if (isLateCuredEmi3 && simDay >= 90 && simDay < 95) {
      const dpd = simDay - 89;
      return { ...emi, status: 'overdue', daysOverdue: dpd, stage: 'soft' };
    }

    if (simDay >= effectivePaidDay) {
      return { ...emi, status: 'paid', paidDay: effectivePaidDay,
               penalty: (isLateCuredEmi3 ? 1295 : 0) /* 2% of EMI */ };
    }
    return { ...emi, status: 'upcoming' };
  });
}

// Currently-overdue EMI, if any.
function findOverdue(statuses) {
  return statuses.find((e) => e.status === 'overdue');
}

// Next upcoming (smallest dueDay among upcoming).
function findNextUpcoming(statuses) {
  return statuses.find((e) => e.status === 'upcoming');
}

// "Need more time?" CTA chronology rules. Returns true when we should show
// the extend banner on the buyer side.
function shouldShowExtendCta(plan, simDay, scenario, hasActiveExtension) {
  if (!plan || hasActiveExtension) return false;
  const statuses = computeEmiStatuses(plan, simDay, scenario);
  const overdue = findOverdue(statuses);
  if (overdue && overdue.daysOverdue <= 4) return true;     // first 4 days of soft overdue
  const next = findNextUpcoming(statuses);
  if (next && (next.dueDay - simDay) >= 0 && (next.dueDay - simDay) <= 7) return true; // last 7d
  return false;
}

// Friendly label for the calendar day (Day 0 → "Today (Aug 1)", Day 30 → "Aug 31", etc.)
function formatSimDay(day) {
  const start = new Date(2026, 7, 1); // Aug 1, 2026
  const d = new Date(start.getTime() + day * 86400000);
  const opts = { day: 'numeric', month: 'short' };
  return d.toLocaleDateString('en-AE', opts);
}

// Map simDay → relative human label
function relativeDayLabel(day, target, isAr) {
  const diff = target - day;
  if (diff > 0) return (isAr ? 'بعد ' : 'in ') + diff + (isAr ? ' يوم' : 'd');
  if (diff < 0) return (isAr ? 'قبل ' : '') + Math.abs(diff) + (isAr ? ' يوم' : 'd ago');
  return isAr ? 'اليوم' : 'today';
}

// Collections-stage banner content
function collectionsBanner(stage, dpd, isAr) {
  if (stage === 'soft') return {
    tone: 'warn',
    title: isAr ? `Day ${dpd} متأخّر — ادفع الآن أو أعد الجدولة` : `Day ${dpd} overdue · pay now or reschedule`,
    sub: isAr ? 'رسوم تأخير ٠٫٥٪ — لم تُبلَّغ AECB بعد' : '0.5% late fee · not yet reported to AECB',
  };
  if (stage === 'tele-call') return {
    tone: 'danger',
    title: isAr ? `Day ${dpd} — اتّصال من فريق التحصيل` : `Day ${dpd} · Tele-call from collections`,
    sub: isAr ? 'إعادة هيكلة متاحة · رسوم ٢٪' : 'Restructure available · 2% penalty',
  };
  if (stage === 'field') return {
    tone: 'danger',
    title: isAr ? `Day ${dpd} — إخطار رسمي` : `Day ${dpd} · Field/notice stage`,
    sub: isAr ? 'سيُبلّغ AECB خلال ٣ أيام' : 'AECB will be notified in 3 days',
  };
  return {
    tone: 'danger',
    title: isAr ? `Day ${dpd} — إجراءات قانونية` : `Day ${dpd} · Legal stage`,
    sub: isAr ? 'تمّ إيداع شيك السدّاد · شركة استرداد مُعيَّنة' : 'Cheque deposited · recovery partner engaged',
  };
}

// Build narrative event log for the live phase given scenario + simDay.
// Returns events that have already occurred up to simDay, newest first.
function buildEvents(scenario, simDay, plan, termExtension) {
  if (!plan) return [];
  const all = [];
  all.push({ day: 0, scope: 'buyer',    label: 'Plan signed · 4-mo installments', icon: 'check' });
  all.push({ day: 0, scope: 'supplier', label: 'AED 232,500 wired · 93% advance', icon: 'bank' });

  computeEmiStatuses(plan, simDay, scenario).forEach((e) => {
    if (e.status === 'paid') {
      all.push({ day: e.paidDay, scope: 'buyer',    label: `EMI ${e.num}/4 paid · AED ${e.amount.toLocaleString()}` + (e.penalty ? ` (+ AED ${e.penalty.toLocaleString()} penalty)` : ''), icon: 'check' });
      all.push({ day: e.paidDay, scope: 'supplier', label: `Buyer EMI ${e.num}/4 cleared`, icon: 'check' });
    }
    if (e.status === 'overdue') {
      const dpd = e.daysOverdue;
      const banner = collectionsBanner(e.stage, dpd, false);
      all.push({ day: e.dueDay + dpd, scope: 'buyer',    label: banner.title, icon: 'warning', tone: banner.tone });
      all.push({ day: e.dueDay + dpd, scope: 'supplier', label: `Buyer DPD ${dpd} · stage ${e.stage}`, icon: 'warning', tone: banner.tone });
    }
  });

  const lastEmi = plan.schedule[plan.schedule.length - 1];
  if (simDay >= lastEmi.dueDay && scenario === 'happy') {
    all.push({ day: lastEmi.dueDay + 1, scope: 'buyer',    label: 'Loan closed · AECB report positive · limit released', icon: 'star' });
    all.push({ day: lastEmi.dueDay + 1, scope: 'supplier', label: 'Cycle complete', icon: 'star' });
  }

  return all.filter((e) => e.day <= simDay).sort((a, b) => b.day - a.day);
}

// ==================================================================
// 3. DemoMode root
// ==================================================================

function DemoMode({ lang = 'en', setLang, onExit, isMobile }) {
  const [phase, setPhase] = dmS('intro');
  const [running, setRunning] = dmS(false);
  const [speed, setSpeed] = dmS(1);
  const [mode, setMode] = dmS('autopilot');     // 'autopilot' | 'manual'
  const [scenario, setScenario] = dmS(DEFAULT_SCENARIO);
  const isAr = lang === 'ar';

  dmE(() => { A.setSpeed(speed); }, [speed]);

  const patch = dmCB((p) => setScenario((s) => ({ ...s, ...(typeof p === 'function' ? p(s) : p) })), []);

  // Autopilot scenario (intro narrative). Only runs when mode = autopilot AND running.
  const cancelRef = dmR({ cancelled: false });
  dmE(() => {
    cancelRef.current.cancelled = false;
    if (!running || mode !== 'autopilot') return;
    runScenario({ phase, scenario, patch, cancelRef, setPhase, setRunning, setMode });
    return () => { cancelRef.current.cancelled = true; };
    // eslint-disable-next-line
  }, [running, phase, mode]);

  // Live-phase day ticker (autopilot only)
  dmE(() => {
    if (phase !== 'live' || !running || mode !== 'autopilot') return;
    const id = setInterval(() => {
      setScenario((s) => ({ ...s, simDay: Math.min(150, s.simDay + 1) }));
    }, 1100 / speed);
    return () => clearInterval(id);
  }, [phase, running, mode, speed]);

  const reset = () => {
    cancelRef.current.cancelled = true;
    setRunning(false);
    setPhase('intro');
    setScenario(DEFAULT_SCENARIO);
  };

  const stepDay = (delta) => {
    patch((s) => ({ simDay: Math.max(0, Math.min(150, s.simDay + delta)) }));
  };

  const setSimDay = (d) => patch({ simDay: Math.max(0, Math.min(150, d)) });

  // Auto-clear toasts after 4.5s
  dmE(() => {
    const t = setTimeout(() => patch({ buyerToast: null, supplierToast: null }), 4500);
    return () => clearTimeout(t);
  }, [scenario.buyerToast?.title, scenario.supplierToast?.title]);

  return (
    <div dir={isAr ? 'rtl' : 'ltr'} style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at top, #FAF7EE 0%, #EFEAFF 60%, #FAF7EE 100%)',
      color: 'var(--mal-ink)',
      fontFamily: isAr ? 'var(--mal-font-ar)' : 'var(--mal-font-ui)',
      paddingBottom: 60,
    }}>
      <DemoTopBar lang={lang} setLang={setLang} onExit={onExit}
                  running={running} setRunning={setRunning}
                  speed={speed} setSpeed={setSpeed}
                  mode={mode} setMode={setMode}
                  reset={reset} phase={phase} isMobile={isMobile}/>

      <DemoTimeline phase={phase} setPhase={setPhase} lang={lang}/>

      {phase === 'live' && (
        <DemoLiveToolbar scenario={scenario} setScenario={(updates) => patch(updates)}
                         setSimDay={setSimDay} stepDay={stepDay} lang={lang}
                         mode={mode} setMode={setMode}
                         running={running} setRunning={setRunning}/>
      )}

      <DemoStage scenario={scenario} setScenario={setScenario} patch={patch}
                 phase={phase} setPhase={setPhase}
                 mode={mode}
                 lang={lang} isMobile={isMobile}/>

      <DemoFooterHint phase={phase} running={running} mode={mode} lang={lang} simDay={scenario.simDay}/>
    </div>
  );
}

// ==================================================================
// 4. Top bar
// ==================================================================

function DemoTopBar({ lang, setLang, onExit, running, setRunning, speed, setSpeed, mode, setMode, reset, phase, isMobile }) {
  const isAr = lang === 'ar';
  const inLive = phase === 'live';
  return (
    <header style={{
      display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
      padding: '14px 22px', borderBottom: '1px solid var(--mal-line)',
      background: 'var(--mal-paper)',
      position: 'sticky', top: 0, zIndex: 30,
    }}>
      <button onClick={onExit} className="mal-pill-btn" aria-label="Back">
        <span style={{ display: 'inline-flex', transform: isAr ? 'scaleX(-1)' : 'none' }}>
          {dmIco.arrowL ? dmIco.arrowL({ width: 12, height: 12 }) : '←'}
        </span>
        {isAr ? 'الصفحة الرئيسية' : 'Home'}
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <MalLogo size={18}/>
        <span style={{ fontSize: 12, color: 'var(--mal-mid)' }}>
          {isAr ? 'وضع العرض المُصاحَب' : 'Side-by-side demo'}
        </span>
      </div>

      <div style={{ flex: 1 }}/>

      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <button className="mal-pill-btn" onClick={reset}>
          {dmIco.refresh ? dmIco.refresh({ width: 12, height: 12 }) : '↻'}
          {isAr ? 'إعادة' : 'Reset'}
        </button>

        {/* Mode toggle */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: 4, background: 'var(--mal-surface-2)', borderRadius: 999,
        }}>
          {[
            { value: 'manual',    label: isAr ? 'يدوي'    : 'Manual'    },
            { value: 'autopilot', label: isAr ? 'تلقائي' : 'Autopilot' },
          ].map((opt) => (
            <button key={opt.value}
                    onClick={() => setMode(opt.value)}
                    className={`mal-tab ${mode === opt.value ? 'active' : ''}`}
                    aria-selected={mode === opt.value}
                    style={{ height: 28, minWidth: 64, padding: '0 10px' }}>
              {opt.label}
            </button>
          ))}
        </div>

        {mode === 'autopilot' && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: 4, background: 'var(--mal-surface-2)', borderRadius: 999,
          }}>
            {[1, 1.5, 2].map((s) => (
              <button key={s}
                      onClick={() => setSpeed(s)}
                      className={`mal-tab ${speed === s ? 'active' : ''}`}
                      aria-selected={speed === s}
                      style={{ height: 28, minWidth: 38, padding: '0 10px' }}>
                {s}×
              </button>
            ))}
          </div>
        )}

        <Tabs value={lang} onChange={setLang} size="sm" items={[
          { value: 'en', label: 'EN' }, { value: 'ar', label: 'AR' },
        ]}/>

        {mode === 'autopilot' && (
          <button className="mal-pill-btn" onClick={() => setRunning(!running)}
                  style={{
                    background: running ? 'var(--mal-ink)' : 'var(--mal-primary)',
                    color: '#fff', borderColor: 'transparent',
                    padding: '8px 16px',
                  }}>
            {running
              ? <>{dmIco.bolt ? dmIco.bolt({ width: 12, height: 12, color: '#fff' }) : '⏸'} {isAr ? 'إيقاف' : 'Pause'}</>
              : <>{dmIco.play ? dmIco.play({ width: 12, height: 12, color: '#fff' }) : '▶'} {phase === 'intro' ? (isAr ? 'تشغيل' : 'Run autopilot') : (isAr ? 'استئناف' : 'Resume')}</>}
          </button>
        )}
      </div>
    </header>
  );
}

// ==================================================================
// 5. Phase timeline (clickable navigation)
// ==================================================================

function DemoTimeline({ phase, setPhase, lang }) {
  const idx = DM_PHASES.findIndex((p) => p.id === phase);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
      padding: '14px 22px', overflowX: 'auto',
    }}>
      {DM_PHASES.map((p, i) => (
        <button key={p.id}
                onClick={() => setPhase(p.id)}
                style={{
                  all: 'unset', cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '6px 12px', borderRadius: 999, fontSize: 11,
                  background: i === idx ? 'var(--mal-ink)' : (i < idx ? 'var(--mal-primary-50)' : 'transparent'),
                  color: i === idx ? '#FAF7EE' : (i < idx ? 'var(--mal-primary)' : 'var(--mal-mid)'),
                  border: '1px solid ' + (i === idx ? 'transparent' : 'var(--mal-line)'),
                  fontWeight: i === idx ? 600 : 500,
                  letterSpacing: '.02em',
                  flexShrink: 0,
                }}>
          <span className="mal-mono" style={{ fontSize: 10, opacity: .7 }}>
            {String(i + 1).padStart(2, '0')}
          </span>
          {p.label}
          {i < idx && <span style={{ display: 'inline-flex' }}>{dmIco.check ? dmIco.check({ width: 11, height: 11 }) : '✓'}</span>}
        </button>
      ))}
    </div>
  );
}

// ==================================================================
// 6. Live-phase toolbar — scenario picker, day slider, day stepper
// ==================================================================

function DemoLiveToolbar({ scenario, setScenario, setSimDay, stepDay, lang, mode, setMode, running, setRunning }) {
  const isAr = lang === 'ar';
  const sc = scenario.liveScenario || 'happy';
  const day = scenario.simDay;

  // Event marker positions on the day axis (0-150)
  const markers = [
    { day: 0,   label: 'Wired',   tone: 'iri' },
    { day: 30,  label: 'EMI 1',   tone: sc === 'happy' || sc === 'late-cured' ? 'success' : 'success' },
    { day: 60,  label: 'EMI 2',   tone: 'success' },
    { day: 90,  label: 'EMI 3',   tone: sc === 'happy' ? 'success' : (sc === 'late-cured' ? 'warn' : 'danger') },
    { day: 95,  label: sc === 'late-cured' ? 'Cure' : (sc === 'restructure' ? 'Tele' : null), tone: sc === 'late-cured' ? 'success' : 'danger' },
    { day: 120, label: 'EMI 4',   tone: sc === 'restructure' ? 'danger' : 'success' },
    { day: 121, label: 'Closed',  tone: sc === 'restructure' ? 'danger' : 'success' },
  ].filter((m) => m.label);

  return (
    <div style={{
      borderTop: '1px solid var(--mal-line)',
      borderBottom: '1px solid var(--mal-line)',
      background: 'var(--mal-paper)',
      padding: '14px 22px',
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      {/* Row 1: scenario + day controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--mal-mid)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
            {isAr ? 'سيناريو' : 'Scenario'}
          </span>
          <select value={sc}
                  onChange={(e) => setScenario({ liveScenario: e.target.value })}
                  style={{
                    background: 'var(--mal-surface)', border: '1px solid var(--mal-line)',
                    borderRadius: 999, padding: '6px 10px', font: 'inherit',
                    fontSize: 12, fontWeight: 500, color: 'var(--mal-ink)',
                  }}>
            {SCENARIOS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>

        <div style={{ width: 1, height: 24, background: 'var(--mal-line)' }}/>

        {/* Day stepper */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--mal-mid)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
            {isAr ? 'اليوم' : 'Day'}
          </span>
          <button className="mal-pill-btn" onClick={() => stepDay(-30)} aria-label="-30">−30</button>
          <button className="mal-pill-btn" onClick={() => stepDay(-1)} aria-label="-1">−1</button>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', background: 'var(--mal-ink)', color: '#FAF7EE',
            borderRadius: 999, fontSize: 13, fontWeight: 600,
            fontFamily: 'var(--mal-font-mono)', minWidth: 96, justifyContent: 'center',
          }}>
            <span>Day {day}</span>
            <span style={{ opacity: .7, fontSize: 11 }}>· {formatSimDay(day)}</span>
          </span>
          <button className="mal-pill-btn" onClick={() => stepDay(1)} aria-label="+1">+1</button>
          <button className="mal-pill-btn" onClick={() => stepDay(30)} aria-label="+30">+30</button>
        </div>

        <div style={{ flex: 1 }}/>

        <div style={{ fontSize: 11, color: 'var(--mal-mid)', maxWidth: 360, lineHeight: 1.5 }}>
          {SCENARIOS.find((s) => s.id === sc)?.desc}
        </div>
      </div>

      {/* Row 2: day slider with event markers */}
      <div style={{ position: 'relative', height: 44, paddingTop: 6 }}>
        {/* Track */}
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 22,
          height: 6, background: 'var(--mal-line)', borderRadius: 999,
        }}>
          {/* Filled portion */}
          <div style={{
            width: ((day / 150) * 100) + '%', height: '100%',
            background: 'linear-gradient(90deg, var(--mal-primary) 0%, var(--mal-primary-3) 100%)',
            borderRadius: 999,
          }}/>
        </div>

        {/* Event markers */}
        {markers.map((m) => {
          const left = (m.day / 150) * 100;
          const tone = m.tone === 'success' ? 'var(--mal-success)'
                     : m.tone === 'warn' ? 'var(--mal-warn)'
                     : m.tone === 'danger' ? 'var(--mal-danger)'
                     : m.tone === 'iri' ? 'var(--mal-primary)' : 'var(--mal-mid)';
          const passed = day >= m.day;
          return (
            <button key={m.day + m.label}
                    onClick={() => setSimDay(m.day)}
                    title={`Day ${m.day} · ${m.label}`}
                    style={{
                      all: 'unset', cursor: 'pointer',
                      position: 'absolute', top: 16, left: `calc(${left}% - 8px)`,
                      width: 16, height: 16, borderRadius: 999,
                      background: passed ? tone : 'var(--mal-paper)',
                      border: `2px solid ${tone}`,
                      boxShadow: passed ? '0 0 0 4px ' + tone + '22' : 'none',
                      transition: 'all .2s',
                    }} aria-label={`Jump to Day ${m.day}: ${m.label}`}/>
          );
        })}

        {/* Day label scale */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', marginTop: 18,
          fontSize: 10, color: 'var(--mal-mid-2)', fontFamily: 'var(--mal-font-mono)',
        }}>
          {[0, 30, 60, 90, 120, 150].map((d) => <span key={d}>{d}</span>)}
        </div>

        {/* Hidden range input for click-anywhere scrubbing */}
        <input type="range" min="0" max="150" value={day}
               onChange={(e) => setSimDay(+e.target.value)}
               style={{
                 position: 'absolute', left: 0, right: 0, top: 16, height: 16,
                 width: '100%', opacity: 0, cursor: 'pointer',
               }}/>
      </div>
    </div>
  );
}

// ==================================================================
// 7. Stage — two phones side-by-side
// ==================================================================

function DemoStage({ scenario, setScenario, patch, phase, setPhase, mode, lang, isMobile }) {
  const stack = isMobile;
  return (
    <div style={{
      display: 'flex', flexDirection: stack ? 'column' : 'row', gap: 26,
      alignItems: 'flex-start', justifyContent: 'center',
      padding: stack ? '8px 12px 24px' : '20px 22px 40px', flexWrap: 'wrap',
    }}>
      <DemoPanel
        side="buyer"
        title="Buyer SME"
        sub="Aisha · Crescent Trading FZE"
        tone="lilac"
        spotlight={scenario.spotlight === 'buyer'}
        toast={scenario.buyerToast}
        lang={lang}>
        <BuyerSurface phase={phase} scenario={scenario} patch={patch} mode={mode} lang={lang}/>
      </DemoPanel>

      <SyncIndicator phase={phase} simDay={scenario.simDay} scenario={scenario.liveScenario} lang={lang} stack={stack}/>

      <DemoPanel
        side="supplier"
        title="Supplier SME"
        sub="Marwan · Atlas Packaging FZ"
        tone="sky"
        spotlight={scenario.spotlight === 'supplier'}
        toast={scenario.supplierToast}
        lang={lang}>
        <SupplierSurface phase={phase} scenario={scenario} patch={patch} mode={mode} lang={lang}/>
      </DemoPanel>
    </div>
  );
}

function SyncIndicator({ phase, simDay, scenario, lang, stack }) {
  const isAr = lang === 'ar';
  const flowing = phase === 'issue' || phase === 'receive' || phase === 'sign' || phase === 'funded'
                || (phase === 'live' && (simDay === 30 || simDay === 60 || simDay === 90 || simDay === 120));
  const direction = (phase === 'issue' || phase === 'receive') ? 'r2l'
                  : (phase === 'sign' || phase === 'funded' || phase === 'live') ? 'l2r' : null;

  if (stack) return null;
  return (
    <div style={{
      width: 70, alignSelf: 'stretch', display: 'flex',
      flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', gap: 8,
      paddingTop: 96, flexShrink: 0,
    }}>
      <div style={{
        width: 50, height: 50, borderRadius: 999,
        background: flowing
          ? 'conic-gradient(from 90deg, var(--mal-iri-1), var(--mal-iri-2), var(--mal-iri-3), var(--mal-iri-4), var(--mal-iri-1))'
          : 'var(--mal-line)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: flowing ? 'var(--mal-sh-orb)' : 'none',
        animation: flowing ? 'mal-orb-spin 4s linear infinite' : 'none',
      }}>
        <span style={{
          width: 42, height: 42, borderRadius: 999, background: 'var(--mal-paper)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          color: flowing ? 'var(--mal-primary)' : 'var(--mal-mid)',
        }}>
          {dmIco.swap ? dmIco.swap({ width: 18, height: 18 }) : '⇄'}
        </span>
      </div>
      <span style={{
        fontSize: 10, color: flowing ? 'var(--mal-primary)' : 'var(--mal-mid-2)',
        fontWeight: 500, textAlign: 'center', maxWidth: 80, lineHeight: 1.2,
      }}>
        {flowing
          ? (direction === 'r2l' ? (isAr ? 'يتدفّق ←' : 'flowing →') : (isAr ? 'يتدفّق →' : '← flowing'))
          : (isAr ? 'في انتظار' : 'idle')}
      </span>
    </div>
  );
}

// ==================================================================
// 8. Phone-frame Panel
// ==================================================================

function DemoPanel({ side, title, sub, tone, spotlight, toast, lang, children }) {
  const w = 380, h = 760;
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center',
      transition: 'transform .3s, filter .3s',
      transform: spotlight ? 'translateY(-4px) scale(1.012)' : 'none',
    }}>
      {/* Caption */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '6px 4px',
        textAlign: 'start', maxWidth: w,
      }}>
        <Avatar name={(title || '').slice(0, 2)} tone={tone} size={32}/>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--mal-font-display)', fontStyle: 'italic' }}>
            {title}
          </div>
          <div style={{ fontSize: 11, color: 'var(--mal-mid)' }}>{sub}</div>
        </div>
      </div>

      {/* Phone */}
      <div style={{
        width: w, height: h, borderRadius: 44, background: '#0B0B14', padding: 9,
        boxShadow: spotlight
          ? '0 30px 80px -20px rgba(42,31,111,.45), 0 4px 12px rgba(11,11,20,.18), 0 0 0 4px var(--mal-primary-50)'
          : '0 30px 80px -20px rgba(11,11,20,.32), 0 4px 12px rgba(11,11,20,.1)',
        position: 'relative', flexShrink: 0,
        transition: 'box-shadow .3s',
      }}>
        <div style={{
          width: '100%', height: '100%', borderRadius: 36, background: 'var(--mal-surface)',
          overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column',
        }}>
          {/* Status bar */}
          <div style={{
            height: 36, paddingInline: 22, display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: 'var(--mal-ink)', flexShrink: 0,
          }}>
            <span>9:41</span>
            <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
              <span style={{ width: 14, height: 8, border: '1.2px solid currentColor', borderRadius: 2, position: 'relative' }}>
                <span style={{ position: 'absolute', inset: '1px', background: 'currentColor', borderRadius: 1, width: '70%' }}/>
              </span>
            </span>
          </div>

          {toast && <DemoToast toast={toast}/>}

          <div className="mal-scroll" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', position: 'relative' }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function DemoToast({ toast }) {
  return (
    <div style={{
      position: 'absolute', top: 44, insetInline: 12, zIndex: 5,
      animation: 'mal-toast-pop .35s cubic-bezier(.4,1.4,.4,1) both',
    }}>
      <div style={{
        background: 'rgba(11,11,20,.94)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        color: '#FAF7EE',
        borderRadius: 22, padding: '12px 14px',
        display: 'flex', alignItems: 'center', gap: 12,
        boxShadow: '0 18px 36px -12px rgba(11,11,20,.5)',
        border: '1px solid rgba(255,255,255,.08)',
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: toast.tone === 'success' ? 'var(--mal-success-bg)'
            : toast.tone === 'iri' ? 'conic-gradient(from 90deg, var(--mal-iri-1), var(--mal-iri-2), var(--mal-iri-3), var(--mal-iri-4))'
            : 'rgba(255,255,255,.12)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          color: toast.tone === 'success' ? 'var(--mal-success)' : '#fff',
        }}>
          {dmIco[toast.icon || 'bell'] ? dmIco[toast.icon || 'bell']({ width: 16, height: 16 }) : '🔔'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{toast.title}</div>
          {toast.sub && <div style={{ fontSize: 11, opacity: .8, marginTop: 2 }}>{toast.sub}</div>}
        </div>
      </div>
    </div>
  );
}

// ==================================================================
// 9. Buyer surface dispatcher
// ==================================================================

function BuyerSurface({ phase, scenario, patch, mode, lang }) {
  if (phase === 'intro') return <DemoIntroBuyer lang={lang}/>;
  if (phase === 'onboarding') {
    return <BuyerOnboardingFlow lang={lang}
                                controlledStep={scenario.buyerStep}
                                onStepChange={(n) => patch({ buyerStep: n })}/>;
  }
  if (phase === 'home' || phase === 'issue') return <DemoBuyerHomeEmpty lang={lang}/>;
  if (phase === 'receive') return <DemoBuyerHomeWithInvoice lang={lang} scenario={scenario}/>;
  if (phase === 'plan' || phase === 'sign') return <DemoBuyerPlanPicker lang={lang} scenario={scenario} patch={patch} mode={mode}/>;
  if (phase === 'funded') return <DemoBuyerJustSigned lang={lang} scenario={scenario}/>;
  if (phase === 'live') {
    // Route within live phase
    const route = scenario.buyerRoute || 'home';
    const setBuyerRoute = (r) => patch({ buyerRoute: r });
    return <DemoBuyerLive route={route} setBuyerRoute={setBuyerRoute}
                          scenario={scenario} patch={patch} mode={mode} lang={lang}/>;
  }
  return null;
}

function DemoIntroBuyer({ lang }) {
  const isAr = lang === 'ar';
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #FAF7EE 0%, #EFEAFF 60%, #FAF7EE 100%)' }}/>
      <div style={{ position: 'absolute', top: 60, insetInlineEnd: -60, width: 280, height: 280, opacity: .5 }}>
        <div className="mal-orb" style={{ width: '100%', height: '100%', animation: 'mal-orb-spin 22s linear infinite' }}/>
      </div>
      <div style={{ flex: 1, padding: 30, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', position: 'relative', zIndex: 1 }}>
        <MalLogo size={22}/>
        <h1 className="mal-display" style={{ fontSize: 44, fontStyle: 'italic', lineHeight: 1, marginTop: 28, marginBottom: 12 }}>
          {isAr ? <>رأس مال<br/><span className="mal-iri-text">يتحرّك معك.</span></> : <>Capital that<br/><span className="mal-iri-text">moves with you.</span></>}
        </h1>
        <p style={{ fontSize: 13, color: 'var(--mal-mid)', maxWidth: 280, lineHeight: 1.5 }}>
          {isAr ? 'افتح حسابك في ١٠ دقائق.' : 'Open your account in 10 minutes.'}
        </p>
      </div>
    </div>
  );
}

function DemoBuyerHomeEmpty({ lang }) {
  const isAr = lang === 'ar';
  return (
    <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="mal-caption">{isAr ? 'مرحباً، عيشة' : 'Hi, Aisha'}</div>
      <div className="mal-h1" style={{ marginTop: -4 }}>{isAr ? 'تجارة الهلال (FZE)' : 'Crescent Trading FZE'}</div>
      <Card padded style={{ background: 'linear-gradient(135deg, #2A1F6F 0%, #1A1A28 100%)', color: '#fff', border: 'none', position: 'relative', overflow: 'hidden' }}>
        <div className="mal-orb" style={{ position: 'absolute', width: 220, height: 220, top: -90, insetInlineEnd: -90, opacity: .35 }}/>
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 11, opacity: .7, textTransform: 'uppercase', letterSpacing: '.06em' }}>
            {isAr ? 'الحد المتاح' : 'Available limit'}
          </div>
          <div style={{ fontFamily: 'var(--mal-font-display)', fontSize: 38, fontStyle: 'italic', marginTop: 6 }}>
            AED 850,000
          </div>
          <div style={{ fontSize: 12, opacity: .8, marginTop: 4 }}>
            {isAr ? 'فئة A · مفعّل الآن' : 'Tier A · Active now'}
          </div>
        </div>
      </Card>
      <div style={{ padding: '16px 14px', textAlign: 'center', color: 'var(--mal-mid)', fontSize: 12 }}>
        {isAr ? 'في انتظار أوّل فاتورة من مورّديك…' : 'Awaiting your first supplier invoice…'}
      </div>
    </div>
  );
}

function DemoBuyerHomeWithInvoice({ lang, scenario }) {
  const isAr = lang === 'ar';
  return (
    <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="mal-caption">{isAr ? 'مرحباً، عيشة' : 'Hi, Aisha'}</div>
      <div className="mal-h1" style={{ marginTop: -4 }}>{isAr ? 'تجارة الهلال (FZE)' : 'Crescent Trading FZE'}</div>
      <Card padded style={{ background: 'linear-gradient(135deg, #2A1F6F 0%, #1A1A28 100%)', color: '#fff', border: 'none', position: 'relative', overflow: 'hidden' }}>
        <div className="mal-orb" style={{ position: 'absolute', width: 220, height: 220, top: -90, insetInlineEnd: -90, opacity: .35 }}/>
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 11, opacity: .7, textTransform: 'uppercase', letterSpacing: '.06em' }}>
            {isAr ? 'الحد المتاح' : 'Available limit'}
          </div>
          <div style={{ fontFamily: 'var(--mal-font-display)', fontSize: 38, fontStyle: 'italic', marginTop: 6 }}>
            AED 850,000
          </div>
        </div>
      </Card>
      <Card padded style={{
        borderColor: 'var(--mal-primary-3)', borderWidth: 1.5,
        animation: 'mal-fade-up .4s ease-out',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'var(--mal-primary-50)', color: 'var(--mal-primary)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            {dmIco.invoice ? dmIco.invoice({ width: 18, height: 18 }) : '🧾'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              {isAr ? 'فاتورة جديدة من أطلس' : 'New invoice from Atlas'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--mal-mid)', marginTop: 2 }}>
              {scenario.invoice.id} · AED {scenario.invoice.amount.toLocaleString()}
            </div>
          </div>
          <Pill tone="warn" dot>{isAr ? 'إجراء' : 'Action'}</Pill>
        </div>
      </Card>
    </div>
  );
}

// ==================================================================
// 10. Buyer Plan Picker (used in both narrative + manual modes)
// ==================================================================

function DemoBuyerPlanPicker({ lang, scenario, patch, mode, onContinue }) {
  const isAr = lang === 'ar';
  const plans = [
    { key: 'pay30',          label: isAr ? 'ادفع خلال ٣٠'        : 'Pay in 30d',        cost: '0%',       sub: isAr ? 'مجّاناً'      : 'Free' },
    { key: 'bnpl60',         label: isAr ? 'BNPL ٦٠ يوم'         : 'BNPL 60d',          cost: '+1.8%',    sub: 'AED 4,500' },
    { key: 'bnpl90',         label: isAr ? 'BNPL ٩٠ يوم'         : 'BNPL 90d',          cost: '+2.6%',    sub: 'AED 6,500' },
    { key: 'inst3',          label: isAr ? 'أقساط ٣ شهور'        : 'Instalments · 3 mo', cost: '+3.0%',    sub: 'AED 7,500' },
    { key: 'installment_4',  label: isAr ? 'أقساط ٤ شهور'        : 'Instalments · 4 mo', cost: '+3.6%',    sub: 'AED 9,000', recommended: true },
  ];
  const picked = scenario.plan?.type || (scenario.planPicked /* legacy */);
  return (
    <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="mal-caption">{isAr ? 'فاتورة' : 'Invoice'} {scenario.invoice.id}</div>
      <div style={{ fontFamily: 'var(--mal-font-display)', fontSize: 30, fontStyle: 'italic', lineHeight: 1.05 }}>
        {isAr ? 'كيف تريد أن تدفع؟' : 'How do you want to pay?'}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {plans.map((p, i) => {
          const selected = picked === p.key;
          return (
            <button key={p.key}
                    onClick={() => {
                      if (mode === 'manual') {
                        if (p.key === 'installment_4') {
                          patch({ plan: DEFAULT_PLAN, planPicked: p.key });
                        } else {
                          patch({ planPicked: p.key });
                        }
                      }
                    }}
                    className={selected ? '' : 'mal-fade-up'}
                    style={{
                      all: 'unset', cursor: mode === 'manual' ? 'pointer' : 'default',
                      padding: 14, borderRadius: 14,
                      background: selected ? 'var(--mal-paper)' : 'var(--mal-surface-2)',
                      border: '1.5px solid ' + (selected ? 'var(--mal-primary)' : 'transparent'),
                      boxShadow: selected ? 'var(--mal-sh-2)' : 'none',
                      display: 'flex', alignItems: 'center', gap: 12,
                      transition: 'all .3s',
                      animationDelay: (i * 60) + 'ms',
                    }}>
              <div style={{
                width: 18, height: 18, borderRadius: 999,
                border: '2px solid ' + (selected ? 'var(--mal-primary)' : 'var(--mal-line)'),
                background: selected ? 'var(--mal-primary)' : 'transparent',
                flexShrink: 0,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {selected && <span style={{ width: 6, height: 6, borderRadius: 999, background: '#fff' }}/>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{p.label}</span>
                  {p.recommended && <Pill tone="ink" dot>{isAr ? 'مُقترح' : 'Best fit'}</Pill>}
                </div>
                <div style={{ fontSize: 11, color: 'var(--mal-mid)', marginTop: 2 }}>{p.sub}</div>
              </div>
              <span className="mal-num" style={{ fontSize: 12, color: 'var(--mal-mid)' }}>{p.cost}</span>
            </button>
          );
        })}
      </div>

      {/* Need more time CTA — also from plan picker */}
      <button onClick={() => mode === 'manual' && patch({ buyerRoute: 'extend-hero' })} style={{
        all: 'unset', cursor: mode === 'manual' ? 'pointer' : 'default',
        padding: '12px 14px',
        background: 'linear-gradient(135deg, #2A1F6F 0%, #5B3FB2 60%, #C97AB6 100%)',
        color: '#fff', borderRadius: 14,
        display: 'flex', alignItems: 'center', gap: 12,
        position: 'relative', overflow: 'hidden',
      }}>
        <div className="mal-orb" style={{ width: 26, height: 26, animation: 'mal-orb-spin 18s linear infinite' }}/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, opacity: .85 }}>{isAr ? 'جديد · مال' : 'New · Mal'}</div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>
            {isAr ? 'تحتاج وقتاً أطول؟ مدّد لـ ١٢ شهر' : 'Need more time? Extend up to 12 months'}
          </div>
        </div>
        {dmIco.arrow ? dmIco.arrow({ color: '#fff', width: 14 }) : '→'}
      </button>

      {(scenario.plan || picked) && (
        <Button kind="primary" size="lg" full
                onClick={() => mode === 'manual' && patch({ buyerRoute: 'confirm' })}
                icon={scenario.signing ? 'check' : 'lock'}
                style={{
                  background: scenario.signed ? 'var(--mal-success)' : undefined,
                  pointerEvents: mode === 'manual' ? 'auto' : 'none',
                }}>
          {scenario.signed
            ? (isAr ? 'تمّ التوقيع' : 'Signed')
            : (scenario.signing ? (isAr ? 'جارٍ التوقيع…' : 'Signing…')
              : (isAr ? 'وقّع بهوية رقمية' : 'Sign with UAE Pass'))}
        </Button>
      )}
    </div>
  );
}

function DemoBuyerJustSigned({ lang, scenario }) {
  const isAr = lang === 'ar';
  return (
    <div style={{ padding: 24, minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, textAlign: 'center' }}>
      <div className="mal-orb" style={{ width: 110, height: 110, animation: 'mal-orb-spin 8s linear infinite' }}/>
      <div className="mal-display-md mal-iri-text" style={{ fontStyle: 'italic' }}>
        {isAr ? 'تمّ' : 'Done'}
      </div>
      <div style={{ color: 'var(--mal-mid)', fontSize: 13, maxWidth: 260, lineHeight: 1.5 }}>
        {isAr
          ? 'سنحوّل لأطلس خلال ٤ ساعات. أوّل قسط في ٣٠ نوفمبر — AED 64,750.'
          : 'Atlas gets paid within 4 hours. Your first instalment is 30 Nov — AED 64,750.'}
      </div>
    </div>
  );
}

// ==================================================================
// 11. BUYER LIVE PHASE — day-driven home + EMI confirms + extends
// ==================================================================

function DemoBuyerLive({ route, setBuyerRoute, scenario, patch, mode, lang }) {
  const isAr = lang === 'ar';

  // Ensure plan exists when entering live phase (manual mode may not have set it).
  // Run in effect so we don't setState during render.
  dmE(() => {
    if (!scenario.plan) patch({ plan: DEFAULT_PLAN });
  }, [scenario.plan]);
  if (!scenario.plan) return <DemoBuyerHomeWithInvoice lang={lang} scenario={scenario}/>;

  if (route === 'home') return <DemoBuyerLiveHome lang={lang} scenario={scenario} setBuyerRoute={setBuyerRoute} mode={mode} patch={patch}/>;
  if (route === 'plan-picker') return <DemoBuyerPlanPicker lang={lang} scenario={scenario} patch={patch} mode={mode}/>;
  if (route === 'confirm') return <DemoBuyerConfirm lang={lang} scenario={scenario} patch={patch} mode={mode}/>;
  if (route === 'loan-detail') return <DemoBuyerLoanDetail lang={lang} scenario={scenario} setBuyerRoute={setBuyerRoute} mode={mode}/>;

  // Term-extension routes — reuse the existing buyer-extend components
  if (route === 'extend-hero') {
    return <BuyerExtendHero lang={lang} setRoute={(r) => setBuyerRoute(r)} viewport="mobile"/>;
  }
  if (route === 'extend-pick') {
    return <BuyerExtendPicker lang={lang} setRoute={(r) => setBuyerRoute(r)} viewport="mobile"/>;
  }
  if (route === 'extend-agree') {
    return <BuyerExtendAgreement lang={lang} setRoute={(r) => setBuyerRoute(r)} viewport="mobile"/>;
  }
  if (route === 'extend-confirm') {
    return <BuyerExtendConfirm lang={lang} setRoute={(r) => {
      if (r === 'extend-success') {
        // Mark term extension active on scenario
        patch({
          termExtension: {
            principal: 250000, tenorMonths: 6, aprPct: 11.5, emi: 44063,
            startDay: scenario.simDay, signedAt: new Date().toISOString(),
          },
        });
      }
      setBuyerRoute(r);
    }} viewport="mobile"/>;
  }
  if (route === 'extend-success') {
    return <BuyerExtendSuccess lang={lang} setRoute={(r) => setBuyerRoute(r === 'home' ? 'home' : 'extend-active')} viewport="mobile"/>;
  }
  if (route === 'extend-active') {
    return <BuyerExtendActive lang={lang} setRoute={(r) => setBuyerRoute(r)} viewport="mobile"/>;
  }
  if (route === 'extend-detail') {
    return <BuyerExtendDetail lang={lang} setRoute={(r) => setBuyerRoute(r)} viewport="mobile"/>;
  }
  if (route === 'extend-settle') {
    return <BuyerExtendSettle lang={lang} setRoute={(r) => setBuyerRoute(r === 'home' ? 'home' : r)} viewport="mobile"/>;
  }

  return <DemoBuyerLiveHome lang={lang} scenario={scenario} setBuyerRoute={setBuyerRoute} mode={mode} patch={patch}/>;
}

function DemoBuyerLiveHome({ lang, scenario, setBuyerRoute, mode, patch }) {
  const isAr = lang === 'ar';
  const { simDay, plan, liveScenario, termExtension } = scenario;
  const statuses = computeEmiStatuses(plan, simDay, liveScenario);
  const overdue = findOverdue(statuses);
  const nextUpcoming = findNextUpcoming(statuses);
  const paidCount = statuses.filter((e) => e.status === 'paid').length;
  const totalCount = statuses.length;
  const isClosed = paidCount === totalCount;
  const usedAmount = plan.principal - (paidCount * plan.emiAmount);
  const availableLimit = 850000 - Math.max(0, usedAmount);
  const utilisationPct = Math.round((Math.max(0, usedAmount) / 850000) * 100);

  const showExtendCta = shouldShowExtendCta(plan, simDay, liveScenario, !!termExtension);

  return (
    <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="mal-caption">{isAr ? 'مرحباً، عيشة' : 'Hi, Aisha'}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div className="mal-h1" style={{ marginTop: -4 }}>{isAr ? 'تجارة الهلال' : 'Crescent Trading'}</div>
        <span style={{ fontSize: 11, color: 'var(--mal-mid)', fontFamily: 'var(--mal-font-mono)' }}>
          Day {simDay} · {formatSimDay(simDay)}
        </span>
      </div>

      {/* Overdue banner */}
      {overdue && (() => {
        const banner = collectionsBanner(overdue.stage, overdue.daysOverdue, isAr);
        return (
          <Card padded style={{
            background: banner.tone === 'danger' ? 'var(--mal-danger-bg)' : 'var(--mal-warn-bg)',
            borderColor: banner.tone === 'danger' ? 'var(--mal-danger)' : 'var(--mal-warn)',
            borderWidth: 1.5,
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: '#fff', flexShrink: 0,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                color: banner.tone === 'danger' ? 'var(--mal-danger)' : 'var(--mal-warn)',
              }}>
                {dmIco.warning ? dmIco.warning({ width: 18, height: 18 }) : '⚠'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600,
                              color: banner.tone === 'danger' ? 'var(--mal-danger)' : 'var(--mal-warn)' }}>
                  {banner.title}
                </div>
                <div style={{ fontSize: 11, color: 'var(--mal-ink)', marginTop: 2 }}>{banner.sub}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                  <Button kind="primary" size="sm" icon="bolt">
                    {isAr ? 'ادفع الآن' : 'Pay now'}
                  </Button>
                  {overdue.stage === 'soft' && (
                    <Button kind="ghost" size="sm">
                      {isAr ? 'أعد الجدولة' : 'Reschedule'}
                    </Button>
                  )}
                  {(overdue.stage === 'tele-call' || overdue.stage === 'field') && (
                    <Button kind="ghost" size="sm">
                      {isAr ? 'إعادة هيكلة' : 'Restructure'}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Card>
        );
      })()}

      {/* Limit hero */}
      <Card padded style={{
        background: isClosed
          ? 'linear-gradient(135deg, #1F7A4F 0%, #2A1F6F 100%)'
          : 'linear-gradient(135deg, #2A1F6F 0%, #1A1A28 100%)',
        color: '#fff', border: 'none', position: 'relative', overflow: 'hidden',
      }}>
        <div className="mal-orb" style={{ position: 'absolute', width: 220, height: 220, top: -90, insetInlineEnd: -90, opacity: .35 }}/>
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 11, opacity: .7, textTransform: 'uppercase', letterSpacing: '.06em' }}>
            {isClosed ? (isAr ? 'الحدّ — أُعيد إطلاقه' : 'Limit released') : (isAr ? 'الحد المتاح' : 'Available limit')}
          </div>
          <div style={{ fontFamily: 'var(--mal-font-display)', fontSize: 36, fontStyle: 'italic', marginTop: 6 }}>
            AED {availableLimit.toLocaleString()}
          </div>
          <div style={{ height: 6, background: 'rgba(255,255,255,.18)', borderRadius: 999, marginTop: 12, overflow: 'hidden' }}>
            <div style={{
              width: utilisationPct + '%', height: '100%',
              background: '#fff', transition: 'width .5s',
            }}/>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, opacity: .85 }}>
            <span>{isAr ? 'مستخدم' : 'In use'} AED {Math.max(0, usedAmount).toLocaleString()}</span>
            <span>{utilisationPct}%</span>
          </div>
        </div>
      </Card>

      {/* Active term extension card (if any) */}
      {termExtension && (
        <Card padded onClick={() => setBuyerRoute('extend-detail')} style={{
          cursor: 'pointer',
          background: 'linear-gradient(135deg, var(--mal-primary-50) 0%, var(--mal-paper) 100%)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="mal-orb" style={{ width: 36, height: 36 }}/>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: 'var(--mal-primary)', textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 600 }}>
                {isAr ? 'قرض تمديد نشِط' : 'Active term extension'}
              </div>
              <div style={{ fontSize: 14, fontWeight: 500, marginTop: 2 }}>
                AED {termExtension.principal.toLocaleString()} · {termExtension.tenorMonths}{isAr ? ' شهر' : ' mo'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--mal-mid)', marginTop: 2 }}>
                {isAr ? 'القسط' : 'EMI'} AED {termExtension.emi.toLocaleString()}/{isAr ? 'شهر' : 'mo'} · {termExtension.aprPct}% APR
              </div>
            </div>
            {dmIco.arrow ? dmIco.arrow({ width: 14, height: 14, color: 'var(--mal-mid)' }) : '→'}
          </div>
        </Card>
      )}

      {/* Active 4-mo installment plan with EMI ladder */}
      <Card padded>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div className="mal-caption">{isAr ? 'الخطة الحالية' : 'Active plan'} · {scenario.invoice.id}</div>
          {!isClosed && nextUpcoming && (
            <span style={{ fontSize: 11, color: 'var(--mal-mid)' }}>
              {isAr ? 'القسط التالي' : 'Next'} {relativeDayLabel(simDay, nextUpcoming.dueDay, isAr)}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
          <span style={{ fontFamily: 'var(--mal-font-display)', fontSize: 26, fontStyle: 'italic' }}>
            {plan.tenorMonths}{isAr ? ' شهر · أقساط' : '-mo installments'}
          </span>
          <Pill tone={isClosed ? 'success' : (overdue ? 'danger' : 'info')} dot>
            {isClosed ? (isAr ? 'مُغلق' : 'Closed')
              : overdue ? (isAr ? 'متأخّر' : 'Overdue')
              : (isAr ? 'في الوقت' : 'On track')}
          </Pill>
        </div>

        {/* EMI rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {statuses.map((e) => {
            const tone = e.status === 'paid' ? 'success'
                       : e.status === 'overdue' ? 'danger'
                       : 'neutral';
            return (
              <div key={e.num} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px', borderRadius: 12,
                background: e.status === 'overdue' ? 'var(--mal-danger-bg)'
                          : e.status === 'paid' ? 'var(--mal-success-bg)'
                          : 'var(--mal-surface-2)',
                border: e.status === 'upcoming' && nextUpcoming && nextUpcoming.num === e.num
                  ? '1.5px solid var(--mal-primary)' : 'none',
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 999,
                  background: e.status === 'paid' ? 'var(--mal-success)'
                            : e.status === 'overdue' ? 'var(--mal-danger)'
                            : '#fff',
                  color: e.status === 'upcoming' ? 'var(--mal-mid)' : '#fff',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, fontSize: 12, fontWeight: 600,
                  boxShadow: e.status === 'upcoming' ? 'inset 0 0 0 1px var(--mal-line)' : 'none',
                }}>
                  {e.status === 'paid'
                    ? (dmIco.check ? dmIco.check({ width: 13, height: 13, color: '#fff' }) : '✓')
                    : e.status === 'overdue'
                    ? (dmIco.warning ? dmIco.warning({ width: 13, height: 13, color: '#fff' }) : '!')
                    : e.num}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>
                    {isAr ? `القسط ${e.num} من ${totalCount}` : `EMI ${e.num} of ${totalCount}`}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--mal-mid)' }}>
                    {e.status === 'paid'
                      ? (isAr ? `دُفع · يوم ${e.paidDay}` : `Paid · ${formatSimDay(e.paidDay)}`)
                      : e.status === 'overdue'
                      ? (isAr ? `متأخّر بـ ${e.daysOverdue} يوم` : `${e.daysOverdue}d overdue · stage ${e.stage}`)
                      : (isAr ? `يستحق يوم ${e.dueDay}` : `Due ${formatSimDay(e.dueDay)}`)}
                  </div>
                </div>
                <span className="mal-num" style={{ fontSize: 13, fontWeight: 500 }}>
                  AED {e.amount.toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--mal-mid)' }}>
          <span>{isAr ? 'مدفوع' : 'Paid'}: AED {(paidCount * plan.emiAmount).toLocaleString()}</span>
          <span>{isAr ? 'متبقّي' : 'Remaining'}: AED {((totalCount - paidCount) * plan.emiAmount).toLocaleString()}</span>
        </div>
      </Card>

      {/* "Need more time?" CTA — only shows when chronologically appropriate */}
      {showExtendCta && (
        <button onClick={() => mode === 'manual' && setBuyerRoute('extend-hero')} style={{
          all: 'unset', cursor: mode === 'manual' ? 'pointer' : 'default',
          padding: '14px 16px', borderRadius: 14,
          background: 'linear-gradient(135deg, #2A1F6F 0%, #5B3FB2 60%, #C97AB6 100%)',
          color: '#fff',
          display: 'flex', alignItems: 'center', gap: 12,
          position: 'relative', overflow: 'hidden',
        }}>
          <div className="mal-orb" style={{ width: 32, height: 32, animation: 'mal-orb-spin 18s linear infinite' }}/>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, opacity: .8, textTransform: 'uppercase', letterSpacing: '.08em' }}>
              {isAr ? 'جديد · مال' : 'New · Mal'}
            </div>
            <div style={{ fontSize: 14, fontWeight: 500, marginTop: 2 }}>
              {isAr ? 'تحتاج وقتاً أطول؟ مدّد لـ ١٢ شهر' : 'Need more time? Extend up to 12 months'}
            </div>
            <div style={{ fontSize: 11, opacity: .8, marginTop: 2 }}>
              {isAr ? 'قرض غير مضمون · توقيع رقمي' : 'Unsecured term loan · UAE Pass'}
            </div>
          </div>
          {dmIco.arrow ? dmIco.arrow({ color: '#fff' }) : '→'}
        </button>
      )}

      {/* Recent activity */}
      {(() => {
        const events = buildEvents(liveScenario, simDay, plan, termExtension).filter((e) => e.scope === 'buyer').slice(0, 4);
        if (!events.length) return null;
        return (
          <Card padded>
            <div className="mal-caption" style={{ marginBottom: 8 }}>{isAr ? 'النشاط الأخير' : 'Recent activity'}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {events.map((ev, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: 999, flexShrink: 0,
                    background: ev.tone === 'danger' ? 'var(--mal-danger-bg)' : ev.tone === 'warn' ? 'var(--mal-warn-bg)' : 'var(--mal-success-bg)',
                    color: ev.tone === 'danger' ? 'var(--mal-danger)' : ev.tone === 'warn' ? 'var(--mal-warn)' : 'var(--mal-success)',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {dmIco[ev.icon] ? dmIco[ev.icon]({ width: 13, height: 13 }) : '•'}
                  </div>
                  <div style={{ flex: 1, fontSize: 12, color: 'var(--mal-ink)' }}>{ev.label}</div>
                  <span className="mal-mono" style={{ fontSize: 10, color: 'var(--mal-mid-2)' }}>
                    Day {ev.day}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        );
      })()}
    </div>
  );
}

function DemoBuyerConfirm({ lang, scenario, patch, mode }) {
  const isAr = lang === 'ar';
  const [signing, setSigning] = dmS(false);
  dmE(() => {
    if (signing) {
      const t = setTimeout(() => {
        patch({ signed: true, signing: false, plan: DEFAULT_PLAN, buyerRoute: 'home' });
        setSigning(false);
      }, 1300);
      return () => clearTimeout(t);
    }
  }, [signing]);
  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="mal-display-sm" style={{ fontStyle: 'italic' }}>{isAr ? 'تأكيد التوقيع' : 'Confirm to sign'}</div>
      <Card padded style={{ background: 'linear-gradient(135deg, #2A1F6F 0%, #5B3FB2 100%)', color: '#fff', border: 'none', position: 'relative', overflow: 'hidden' }}>
        <div className="mal-orb" style={{ position: 'absolute', width: 140, height: 140, top: -40, insetInlineEnd: -40, opacity: .45 }}/>
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 11, opacity: .7, textTransform: 'uppercase', letterSpacing: '.06em' }}>
            {isAr ? 'فاتورة' : 'Invoice'}
          </div>
          <div className="mal-num" style={{ fontFamily: 'var(--mal-font-display)', fontSize: 36, marginTop: 6, fontStyle: 'italic' }}>
            AED 250,000
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, fontSize: 12, opacity: .9 }}>
            <span>{isAr ? '٤ شهور' : '4 mo'} · 3.6% fee</span>
            <span className="mal-num">AED 64,750 / mo</span>
          </div>
        </div>
      </Card>
      <Card padded>
        {[
          [isAr ? 'إلى' : 'To',                 'Atlas Packaging FZ'],
          [isAr ? 'الخصم' : 'Auto-debit',        'ENBD ****4291'],
          [isAr ? 'القسط الأوّل' : 'First EMI',  formatSimDay(30)],
          [isAr ? 'القسط الأخير' : 'Final EMI',  formatSimDay(120)],
        ].map(([k, v], i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: i ? '1px solid var(--mal-line-2)' : 'none', fontSize: 13 }}>
            <span style={{ color: 'var(--mal-mid)' }}>{k}</span>
            <span style={{ fontWeight: 500 }}>{v}</span>
          </div>
        ))}
      </Card>
      <Button kind="primary" size="lg" full onClick={() => mode === 'manual' && setSigning(true)}
              icon={signing ? 'check' : 'lock'}
              style={{ pointerEvents: mode === 'manual' ? 'auto' : 'none' }}>
        {signing ? (isAr ? 'جارٍ التوقيع…' : 'Signing…') : (isAr ? 'وقّع بهوية رقمية' : 'Sign with UAE Pass')}
      </Button>
    </div>
  );
}

function DemoBuyerLoanDetail({ lang, scenario, setBuyerRoute, mode }) {
  const isAr = lang === 'ar';
  const { simDay, plan, liveScenario } = scenario;
  const statuses = computeEmiStatuses(plan, simDay, liveScenario);
  return (
    <div>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--mal-line)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => setBuyerRoute('home')} style={{ all: 'unset', cursor: 'pointer' }}>
          {dmIco.arrowL ? dmIco.arrowL({ width: 18, height: 18 }) : '←'}
        </button>
        <span style={{ fontSize: 13, fontWeight: 500 }}>{isAr ? 'تفاصيل القرض' : 'Loan detail'}</span>
      </div>
      <div style={{ padding: 18 }}>
        <Card padded>
          <div className="mal-caption">{scenario.invoice.id}</div>
          <div style={{ fontFamily: 'var(--mal-font-display)', fontSize: 32, fontStyle: 'italic', marginTop: 6 }}>
            AED {plan.principal.toLocaleString()}
          </div>
          <div style={{ fontSize: 12, color: 'var(--mal-mid)', marginTop: 4 }}>
            {plan.tenorMonths}{isAr ? ' شهر' : ' mo'} · 3.6% fee · AED {plan.emiAmount.toLocaleString()}/{isAr ? 'شهر' : 'mo'}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ==================================================================
// 12. SUPPLIER side
// ==================================================================

function SupplierSurface({ phase, scenario, patch, mode, lang }) {
  if (phase === 'intro') return <DemoIntroSupplier lang={lang}/>;
  if (phase === 'onboarding') {
    return <SupplierOnboardingFlow lang={lang}
                                   controlledStep={scenario.supplierStep}
                                   onStepChange={(n) => patch({ supplierStep: n })}/>;
  }
  if (phase === 'home') return <DemoSupplierHome lang={lang} funded={false}/>;
  if (phase === 'issue') return <DemoSupplierIssueInvoice lang={lang} scenario={scenario}/>;
  if (phase === 'receive' || phase === 'plan' || phase === 'sign') return <DemoSupplierAwaiting lang={lang} scenario={scenario}/>;
  if (phase === 'funded') return <DemoSupplierFunded lang={lang} scenario={scenario}/>;
  if (phase === 'live') return <DemoSupplierLive lang={lang} scenario={scenario} patch={patch} mode={mode}/>;
  return null;
}

function DemoIntroSupplier({ lang }) {
  const isAr = lang === 'ar';
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #FAF7EE 0%, #DCE8F8 60%, #FAF7EE 100%)' }}/>
      <div style={{ position: 'absolute', top: 60, insetInlineEnd: -60, width: 280, height: 280, opacity: .55 }}>
        <div className="mal-orb" style={{ width: '100%', height: '100%', animation: 'mal-orb-spin 26s linear infinite' }}/>
      </div>
      <div style={{ flex: 1, padding: 30, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', position: 'relative', zIndex: 1 }}>
        <MalLogo size={22}/>
        <h1 className="mal-display" style={{ fontSize: 42, fontStyle: 'italic', lineHeight: 1, marginTop: 28, marginBottom: 12 }}>
          {isAr ? <>اقبض اليوم،<br/><span className="mal-iri-text">لا الشهر القادم.</span></> : <>Get paid today,<br/><span className="mal-iri-text">not next month.</span></>}
        </h1>
        <p style={{ fontSize: 13, color: 'var(--mal-mid)', maxWidth: 280, lineHeight: 1.5 }}>
          {isAr ? 'أصدر فاتورة. اعتمدها مال. تحويل خلال ٤ ساعات.' : 'Issue an invoice. Mal funds it. Wire in 4 hours.'}
        </p>
      </div>
    </div>
  );
}

function DemoSupplierHome({ lang, funded }) {
  const isAr = lang === 'ar';
  return (
    <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Avatar name="MA" tone="sky" size={36}/>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>Atlas Packaging FZ</div>
          <div style={{ fontSize: 11, color: 'var(--mal-mid)' }}>{isAr ? 'مورّد · مفعّل' : 'Supplier · Active'}</div>
        </div>
      </div>
      <Card padded>
        <div className="mal-caption">{isAr ? 'متاح للتمويل اليوم' : 'Available to finance today'}</div>
        <div style={{ fontFamily: 'var(--mal-font-display)', fontSize: 36, fontStyle: 'italic', marginTop: 4 }}>
          AED 339,400
        </div>
      </Card>
    </div>
  );
}

function DemoSupplierIssueInvoice({ lang, scenario }) {
  const isAr = lang === 'ar';
  return (
    <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ fontFamily: 'var(--mal-font-display)', fontSize: 26, fontStyle: 'italic' }}>
        {isAr ? 'فاتورة جديدة' : 'New invoice'}
      </div>
      <Field label={isAr ? 'إلى مشترٍ' : 'Buyer'}>
        <div className="mal-input" style={{ paddingInline: 14, height: 44, display: 'flex', alignItems: 'center', background: 'var(--mal-paper)' }}>
          <span style={{ fontFamily: 'var(--mal-font-mono)', fontSize: 13.5 }}>{scenario.draftBuyer}</span>
          <span style={{ display: 'inline-block', width: 1.5, height: 18, marginInlineStart: 1, background: 'var(--mal-primary)', animation: 'mal-cursor-blink 1.1s steps(2) infinite', opacity: scenario.draftBuyer ? 1 : 0.5 }}/>
        </div>
      </Field>
      <Field label={isAr ? 'القيمة (AED)' : 'Amount (AED)'}>
        <div className="mal-input" style={{ paddingInline: 14, height: 44, display: 'flex', alignItems: 'center', background: 'var(--mal-paper)' }}>
          <span style={{ fontFamily: 'var(--mal-font-mono)', fontSize: 13.5 }}>{scenario.draftAmount}</span>
          <span style={{ display: 'inline-block', width: 1.5, height: 18, marginInlineStart: 1, background: 'var(--mal-primary)', animation: 'mal-cursor-blink 1.1s steps(2) infinite', opacity: scenario.draftAmount ? 1 : 0.5 }}/>
        </div>
      </Field>
      <Field label={isAr ? 'الوصف' : 'Description'}>
        <div className="mal-input" style={{ paddingInline: 14, minHeight: 44, padding: '12px 14px', background: 'var(--mal-paper)', fontFamily: 'var(--mal-font-mono)', fontSize: 13.5 }}>
          {scenario.draftDescription || ' '}
        </div>
      </Field>
      <Button kind="primary" size="lg" full icon={scenario.invoice.issuedAt ? 'check' : 'send'}
              style={{ background: scenario.invoice.issuedAt ? 'var(--mal-success)' : undefined, pointerEvents: 'none' }}>
        {scenario.invoice.issuedAt ? (isAr ? 'تمّ الإصدار' : 'Issued') : (isAr ? 'أصدر الفاتورة' : 'Issue invoice')}
      </Button>
    </div>
  );
}

function DemoSupplierAwaiting({ lang, scenario }) {
  const isAr = lang === 'ar';
  return (
    <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ fontFamily: 'var(--mal-font-display)', fontSize: 24, fontStyle: 'italic' }}>
        {isAr ? 'بانتظار المشتري' : 'Waiting on buyer'}
      </div>
      <Card padded style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--mal-primary-50)', color: 'var(--mal-primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {dmIco.invoice ? dmIco.invoice({ width: 22, height: 22 }) : '🧾'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500 }}>{scenario.invoice.id}</div>
          <div style={{ fontSize: 11, color: 'var(--mal-mid)', marginTop: 2 }}>
            {isAr ? 'إلى' : 'To'} {scenario.invoice.buyer}
          </div>
          <div className="mal-num" style={{ fontSize: 14, fontWeight: 500, marginTop: 6 }}>
            AED {scenario.invoice.amount.toLocaleString()}
          </div>
        </div>
        <Pill tone="info" dot>{isAr ? 'بانتظار' : 'Pending'}</Pill>
      </Card>
    </div>
  );
}

function DemoSupplierFunded({ lang, scenario }) {
  const isAr = lang === 'ar';
  return (
    <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Card padded style={{
        background: 'linear-gradient(135deg, #1F7A4F 0%, #2A1F6F 100%)',
        color: '#fff', border: 'none', position: 'relative', overflow: 'hidden',
        animation: 'mal-fade-up .55s cubic-bezier(.4,1.4,.4,1) both',
      }}>
        <div className="mal-orb" style={{ position: 'absolute', width: 200, height: 200, top: -90, insetInlineEnd: -90, opacity: .35, animation: 'mal-orb-spin 10s linear infinite' }}/>
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 11, opacity: .8, textTransform: 'uppercase', letterSpacing: '.06em' }}>
            {isAr ? 'وصل إلى حسابك' : 'Wired to your bank'}
          </div>
          <CountUpReveal value={232500}/>
          <div style={{ fontSize: 12, opacity: .9, marginTop: 6 }}>
            INV-2026-0418 · 7% fee · ENBD ****4291
          </div>
        </div>
      </Card>
    </div>
  );
}

// Live supplier — shows the buyer journey from the supplier's POV
function DemoSupplierLive({ lang, scenario, patch, mode }) {
  const isAr = lang === 'ar';
  const { simDay, plan, liveScenario } = scenario;
  const statuses = plan ? computeEmiStatuses(plan, simDay, liveScenario) : [];
  const overdue = findOverdue(statuses);
  const paidCount = statuses.filter((e) => e.status === 'paid').length;
  const totalCount = statuses.length;
  const isClosed = paidCount === totalCount;
  const buyerEvents = plan ? buildEvents(liveScenario, simDay, plan, scenario.termExtension).filter((e) => e.scope === 'supplier') : [];

  // Total received YTD = 232500 (Day 0 wire) + paid EMIs are NOT to supplier — they're to Mal
  // For supplier: they got paid Day 0 once and that's it. So balance shows 232500.
  const balanceReceived = scenario.invoice.issuedAt || simDay >= 0 ? 232500 : 0;

  return (
    <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Avatar name="MA" tone="sky" size={36}/>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>Atlas Packaging FZ</div>
          <div style={{ fontSize: 11, color: overdue ? 'var(--mal-danger)' : isClosed ? 'var(--mal-success)' : 'var(--mal-mid)' }}>
            {overdue ? (isAr ? 'تنبيه: المشتري متأخّر' : 'Watchlist: buyer overdue')
              : isClosed ? (isAr ? 'دورة مكتملة' : 'Cycle complete')
              : (isAr ? 'مورّد · مفعّل' : 'Supplier · Active')}
          </div>
        </div>
      </div>

      {/* Watchlist alert when buyer is overdue */}
      {overdue && (
        <Card padded style={{
          background: 'var(--mal-danger-bg)',
          borderColor: 'var(--mal-danger)', borderWidth: 1.5,
        }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fff', color: 'var(--mal-danger)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {dmIco.warning ? dmIco.warning({ width: 18, height: 18 }) : '⚠'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--mal-danger)' }}>
                {isAr ? `المشتري متأخّر · ${overdue.daysOverdue} يوم` : `Buyer DPD ${overdue.daysOverdue} · stage ${overdue.stage}`}
              </div>
              <div style={{ fontSize: 11, color: 'var(--mal-ink)', marginTop: 4 }}>
                {isAr
                  ? 'مال يمتصّ المخاطر · تحويلك آمن. سنُنبّهك عند الحلّ.'
                  : 'Mal absorbs the risk — your wire is safe. We\'ll notify you at resolution.'}
              </div>
            </div>
          </div>
        </Card>
      )}

      <Card padded>
        <div className="mal-caption">{isAr ? 'استلمتَ من مال' : 'Received from Mal'}</div>
        <div style={{ fontFamily: 'var(--mal-font-display)', fontSize: 30, fontStyle: 'italic', marginTop: 4 }}>
          AED {balanceReceived.toLocaleString()}
        </div>
        <div style={{ fontSize: 11, color: 'var(--mal-mid)', marginTop: 4 }}>
          {isAr ? 'فاتورة' : 'Invoice'} {scenario.invoice.id} · 93% advance · 7% holdback
        </div>
      </Card>

      {/* Buyer payment journey */}
      <Card padded>
        <div className="mal-caption" style={{ marginBottom: 8 }}>{isAr ? 'رحلة المشتري' : 'Buyer journey'} ({plan?.tenorMonths || 4}{isAr ? ' شهر' : ' mo'})</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {statuses.map((e) => (
            <div key={e.num} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 22, height: 22, borderRadius: 999, flexShrink: 0,
                background: e.status === 'paid' ? 'var(--mal-success)' : e.status === 'overdue' ? 'var(--mal-danger)' : 'var(--mal-line)',
                color: '#fff',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600,
              }}>
                {e.status === 'paid' ? (dmIco.check ? dmIco.check({ width: 11, height: 11 }) : '✓')
                  : e.status === 'overdue' ? '!' : e.num}
              </div>
              <div style={{ flex: 1, fontSize: 12 }}>
                {isAr ? `القسط ${e.num}` : `EMI ${e.num}`}
                {e.status === 'paid' && <span style={{ color: 'var(--mal-mid)' }}> · {formatSimDay(e.paidDay)}</span>}
                {e.status === 'overdue' && <span style={{ color: 'var(--mal-danger)' }}> · {e.daysOverdue}d late</span>}
              </div>
              <span className="mal-mono" style={{ fontSize: 11, color: 'var(--mal-mid-2)' }}>
                Day {e.dueDay}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Supplier-side activity feed */}
      {buyerEvents.length > 0 && (
        <Card padded>
          <div className="mal-caption" style={{ marginBottom: 8 }}>{isAr ? 'النشاط' : 'Activity'}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {buyerEvents.slice(0, 4).map((ev, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 26, height: 26, borderRadius: 999, flexShrink: 0,
                  background: ev.tone === 'danger' ? 'var(--mal-danger-bg)' : ev.tone === 'warn' ? 'var(--mal-warn-bg)' : 'var(--mal-success-bg)',
                  color: ev.tone === 'danger' ? 'var(--mal-danger)' : ev.tone === 'warn' ? 'var(--mal-warn)' : 'var(--mal-success)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {dmIco[ev.icon] ? dmIco[ev.icon]({ width: 13, height: 13 }) : '•'}
                </div>
                <div style={{ flex: 1, fontSize: 12 }}>{ev.label}</div>
                <span className="mal-mono" style={{ fontSize: 10, color: 'var(--mal-mid-2)' }}>Day {ev.day}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function CountUpReveal({ value }) {
  const [n, setN] = dmS(0);
  dmE(() => {
    const start = performance.now(), dur = 1400;
    let raf;
    function tick(t) {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(value * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return (
    <div style={{ fontFamily: 'var(--mal-font-display)', fontSize: 40, fontStyle: 'italic', marginTop: 6 }}>
      AED {n.toLocaleString()}
    </div>
  );
}

// ==================================================================
// Footer hint
// ==================================================================

function DemoFooterHint({ phase, running, mode, lang, simDay }) {
  const isAr = lang === 'ar';
  return (
    <div style={{
      maxWidth: 880, marginInline: 'auto', textAlign: 'center',
      padding: '0 22px', color: 'var(--mal-mid)', fontSize: 12, lineHeight: 1.6,
    }}>
      {phase === 'live' && mode === 'manual' && (
        isAr
          ? '🎮 الوضع اليدوي. حرّك اليوم بالأسهم أو اسحب الشريط. اضغط على لوحة المشتري للوصول إلى تفاصيل القرض، التمديد، الإعادة، إلخ.'
          : '🎮 Manual mode. Step through days with the arrows or drag the slider. Click into the buyer panel for loan detail, extension, restructure, etc.')
      }
      {phase === 'live' && mode === 'autopilot' && (
        isAr
          ? `▶ الوضع التلقائي · اليوم يتقدّم بـ ١ يوم لكل ${(1.1).toFixed(1)} ثانية. اختر سيناريو من الأعلى لرؤية الفروقات.`
          : `▶ Autopilot · 1 day per ~1.1s at 1×. Switch scenario above to see different lifecycle paths.`)
      }
      {phase === 'intro' && mode === 'autopilot' && (
        isAr
          ? '⏵ اضغط «تشغيل» لمشاهدة المشتري والمورّد يتزامنان. ثمّ اضغط «يدوي» للسيطرة بنفسك.'
          : '⏵ Press Run to watch both panels sync, then switch to Manual to drive each panel yourself.')
      }
      {phase === 'intro' && mode === 'manual' && (
        isAr
          ? '🎮 الوضع اليدوي. اضغط على «الإعداد» في الجدول الزمني أعلاه لبدء تشغيل الإعداد بنفسك.'
          : '🎮 Manual mode. Click "Onboarding" in the timeline above to step through the flow yourself.')
      }
    </div>
  );
}

// ==================================================================
// Autopilot — narrative engine for the intro phase. Lands on phase=live
// with simDay=1, plan signed, ready for user scrubbing.
// ==================================================================

async function runScenario({ phase, scenario, patch, cancelRef, setPhase, setRunning, setMode }) {
  const cancel = () => cancelRef.current.cancelled;

  const handlers = {
    intro: async () => {
      patch({ spotlight: null });
      await A.wait(900);
      setPhase('onboarding');
    },
    onboarding: async () => {
      patch({ spotlight: null, buyerStep: 0, supplierStep: 0 });
      const total = 13;
      for (let i = 1; i <= total; i++) {
        if (cancel()) return;
        const frac = i / total;
        const bs = Math.min(10, Math.round(frac * 10));
        const ss = Math.min(7, Math.round(frac * 7));
        patch({ buyerStep: bs, supplierStep: ss });
        const hero = bs === 9 || bs === 10;
        await A.wait(hero ? 2000 : 1300);
      }
      if (cancel()) return;
      patch({ buyerToast: { title: 'Account opened', sub: 'AED 850K limit · Tier A', icon: 'check', tone: 'success' },
              supplierToast: { title: 'You\'re ready', sub: 'CC us on any invoice — wire in 4h', icon: 'bolt', tone: 'iri' } });
      await A.wait(2200);
      patch({ buyerToast: null, supplierToast: null });
      setPhase('home');
    },
    home: async () => {
      patch({ spotlight: 'supplier' });
      await A.wait(900);
      patch({ supplierToast: { title: 'Issue your first invoice', sub: 'Pre-filled from your top buyer · Crescent', icon: 'invoice', tone: 'iri' } });
      await A.wait(2400);
      patch({ supplierToast: null });
      setPhase('issue');
    },
    issue: async () => {
      patch({ spotlight: 'supplier', draftBuyer: '', draftAmount: '', draftDescription: '' });
      await A.wait(700);
      await A.typewrite((v) => patch({ draftBuyer: v }), 'Crescent Trading FZE', { perChar: 36 });
      if (cancel()) return;
      await A.wait(280);
      await A.typewrite((v) => patch({ draftAmount: v }), '250,000', { perChar: 60 });
      if (cancel()) return;
      await A.wait(280);
      await A.typewrite((v) => patch({ draftDescription: v }), 'Industrial packaging — Q4 2026', { perChar: 32 });
      if (cancel()) return;
      await A.wait(700);
      patch((s) => ({ invoice: { ...s.invoice, issuedAt: new Date().toISOString() } }));
      await A.wait(800);
      patch({
        buyerToast: { title: 'New invoice from Atlas Packaging', sub: 'INV-2026-0418 · AED 250,000 · due 30 Oct', icon: 'invoice', tone: 'iri' },
        spotlight: 'buyer',
      });
      await A.wait(2200);
      setPhase('receive');
    },
    receive: async () => {
      patch({ spotlight: 'buyer', buyerToast: null });
      await A.wait(2200);
      setPhase('plan');
    },
    plan: async () => {
      patch({ spotlight: 'buyer', planPicked: null });
      await A.wait(900);
      patch({ planPicked: 'installment_4', plan: DEFAULT_PLAN });
      await A.wait(1700);
      setPhase('sign');
    },
    sign: async () => {
      patch({ spotlight: 'buyer', signing: true });
      await A.wait(1400);
      patch({ signed: true, signing: false });
      await A.wait(700);
      patch({
        supplierToast: { title: 'Buyer signed · 4-mo installments', sub: 'Wire incoming — AED 232,500 (93%)', icon: 'bolt', tone: 'iri' },
        spotlight: 'supplier',
      });
      await A.wait(2200);
      setPhase('funded');
    },
    funded: async () => {
      patch({ spotlight: 'supplier', supplierToast: null });
      await A.wait(2400);
      patch({
        buyerToast: { title: 'Atlas was paid', sub: 'AED 232,500 wired · first instalment in 30 days', icon: 'check', tone: 'success' },
        supplierToast: { title: 'AED 232,500 wired', sub: 'Arriving in your ENBD account · 4h SLA', icon: 'bank', tone: 'success' },
      });
      await A.wait(2400);
      // Land in live phase at Day 1
      patch({ simDay: 1, buyerToast: null, supplierToast: null });
      setPhase('live');
    },
    live: async () => {
      // Day ticker is handled by the separate effect in DemoMode.
      // Nothing to do here.
    },
  };

  const handler = handlers[phase];
  if (handler) await handler();
}

window.DemoMode = DemoMode;
