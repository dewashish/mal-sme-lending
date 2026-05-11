/* eslint-disable */
// Mal. Demo Mode (side-by-side dual panel + lifecycle simulator).
//
// 100% manual. No autopilot, no scripted scenarios. Everything emerges from
// what the user clicks: pay an EMI or don't, scrub time forward, and the
// state derives from those actions.
//
// State model:
//   simDay               . The simulated calendar day (0..200)
//   paymentsByEmi        . { [emiNum]: { paidOnDay, withPenalty } }
//   refinancedPaymentsByEmi. Same shape, for EMIs of a refinanced plan
//
// EMI status comes from these two facts: did the user pay this EMI before
// scrubbing past its dueDay? If yes → paid. If no AND simDay > dueDay → overdue
// with daysOverdue = simDay - dueDay; collections stage derives from DPD.

const { useState: dmS, useEffect: dmE, useRef: dmR, useMemo: dmM, useCallback: dmCB } = React;
const dmIco = window.MalIcon;

// ==================================================================
// 0. Phase + scenario constants
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

// ==================================================================
// 1. Default state
// ==================================================================

// All five plan presets. Each is a fully-formed plan object the buyer
// state can adopt directly. Single-bullet plans (pay30, bnpl60, bnpl90)
// have a one-row schedule; instalment plans (inst3, installment_4) have
// N rows of equal monthly EMIs. Supplier always gets settled on Day 30
// regardless of which plan the buyer signs (Mal absorbs timing risk).
const PLAN_DEFS = {
  pay30: {
    type: 'pay30', label: 'Pay in 30d',
    tenorMonths: 1, principal: 250000, totalCost: 0, emiAmount: 250000,
    schedule: [{ num: 1, dueDay: 30, amount: 250000 }],
  },
  bnpl60: {
    type: 'bnpl60', label: 'BNPL 60d',
    tenorMonths: 2, principal: 250000, totalCost: 4500, emiAmount: 254500,
    schedule: [{ num: 1, dueDay: 60, amount: 254500 }],
  },
  bnpl90: {
    type: 'bnpl90', label: 'BNPL 90d',
    tenorMonths: 3, principal: 250000, totalCost: 6500, emiAmount: 256500,
    schedule: [{ num: 1, dueDay: 90, amount: 256500 }],
  },
  inst3: {
    type: 'inst3', label: 'Instalments · 3 mo',
    tenorMonths: 3, principal: 250000, totalCost: 7500, emiAmount: 85833,
    schedule: [
      { num: 1, dueDay: 30, amount: 85833 },
      { num: 2, dueDay: 60, amount: 85833 },
      { num: 3, dueDay: 90, amount: 85834 },
    ],
  },
  installment_4: {
    type: 'installment_4', label: 'Instalments · 4 mo',
    tenorMonths: 4, principal: 250000, totalCost: 9000, emiAmount: 64750,
    schedule: [
      { num: 1, dueDay: 30,  amount: 64750 },
      { num: 2, dueDay: 60,  amount: 64750 },
      { num: 3, dueDay: 90,  amount: 64750 },
      { num: 4, dueDay: 120, amount: 64750 },
    ],
  },
};
const DEFAULT_PLAN = PLAN_DEFS.installment_4;

const DEFAULT_SCENARIO = {
  // Onboarding control + per-side completion flags
  buyerStep: 0,
  supplierStep: 0,
  buyerOnboardingDone: false,
  supplierOnboardingDone: false,

  // Invoice the supplier issued
  invoice: {
    id: 'INV-2026-0418',
    buyer: 'Crescent Trading FZE',
    buyerTRN: '100123456700003',
    supplier: 'Atlas Packaging FZ',
    amount: 250000,
    issuedAt: null,
    dueDate: '30 Oct 2026',
    description: 'Industrial packaging. Q4 2026',
  },

  // Plan the buyer picked
  plan: null,
  signing: false,
  signed: false,

  // Term extension (separate, not the focus of this iteration)
  termExtension: null,

  // Live phase calendar + the user's payment record
  simDay: 0,
  paymentsByEmi: {},                  // { 1: { paidOnDay, withPenalty }, 2: {...} }
  refinancedPaymentsByEmi: {},        // EMIs paid on the refinanced schedule
  extensionPaymentsByEmi: {},         // EMIs paid on the term extension's schedule

  // Other concurrent loans the buyer is running for invoices from different
  // suppliers. Pre-seeded so the demo can illustrate multi-loan limit
  // utilization, multi-supplier scenarios, and bundling into one EMI.
  backgroundLoans: [
    {
      id: 'bg-marina',
      invoiceId: 'INV-2026-0411',
      supplier: 'Marina IT Services',
      issuedDay: -15,                 // signed 15 days before simDay=0
      plan: {
        type: 'bnpl60_bg',
        label: 'BNPL 60d',
        tenorMonths: 2,
        principal: 84000,
        totalCost: 1500,
        emiAmount: 85500,
        schedule: [{ num: 1, dueDay: 45, amount: 85500 }],
      },
      paymentsByEmi: {},
    },
    {
      id: 'bg-atlas',
      invoiceId: 'INV-2026-0397',
      supplier: 'Atlas Logistics WLL',
      issuedDay: -8,                  // signed 8 days before simDay=0
      plan: {
        type: 'inst3_bg',
        label: 'Instalments · 3 mo',
        tenorMonths: 3,
        principal: 165000,
        totalCost: 4500,
        emiAmount: 56500,
        schedule: [
          { num: 1, dueDay: 22, amount: 56500 },
          { num: 2, dueDay: 52, amount: 56500 },
          { num: 3, dueDay: 82, amount: 56500 },
        ],
      },
      paymentsByEmi: {},
    },
  ],

  // Most recent meaningful user action. Drives the live ExplainerDock
  // at the bottom of the stage. Shape: { id, day, extra }.
  lastAction: { id: 'demo-loaded', day: 0 },

  // Consolidation / "Bundle into one EMI". When set, replaces all active
  // obligations (primary plan + extension + background loans) with a single
  // consolidated repayment schedule. Settled-by-bundle markers go on every
  // unpaid EMI of every original obligation.
  bundledPlan: null,

  // Routes within live phase
  buyerRoute: 'home',
  supplierRoute: 'home',

  // Toasts + spotlight
  buyerToast: null,
  supplierToast: null,
  spotlight: null,

  // Refinance draft (transient, between picker and confirm)
  refinanceDraft: null,
};

// ==================================================================
// 2. Lifecycle helpers. Pure, derive from (plan, simDay, paymentsByEmi)
// ==================================================================

// EMI status from paymentsByEmi + simDay. No scenario flag.
function computeEmiStatuses(plan, simDay, paymentsByEmi) {
  if (!plan) return [];
  return plan.schedule.map((emi) => {
    const paid = paymentsByEmi && paymentsByEmi[emi.num];
    if (paid) {
      return {
        ...emi,
        status: 'paid',
        paidDay: paid.paidOnDay,
        penalty: paid.withPenalty || 0,
        settledByExtension: !!paid.settledByExtension,
      };
    }
    if (simDay >= emi.dueDay) {
      const dpd = simDay - emi.dueDay;
      const stage = dpd < 5 ? 'soft' : dpd < 15 ? 'tele-call' : dpd < 31 ? 'field' : 'legal';
      return { ...emi, status: 'overdue', daysOverdue: dpd, stage };
    }
    return { ...emi, status: 'upcoming' };
  });
}

function findOverdue(statuses) {
  return statuses.find((e) => e.status === 'overdue');
}

function findNextUpcoming(statuses) {
  return statuses.find((e) => e.status === 'upcoming');
}

function shouldShowExtendCta(plan, simDay, paymentsByEmi, hasActiveExtension) {
  if (!plan || hasActiveExtension) return false;
  const statuses = computeEmiStatuses(plan, simDay, paymentsByEmi);
  const overdue = findOverdue(statuses);
  if (overdue && overdue.daysOverdue <= 4) return true;
  const next = findNextUpcoming(statuses);
  if (next && (next.dueDay - simDay) >= 0 && (next.dueDay - simDay) <= 7) return true;
  return false;
}

function formatSimDay(day) {
  const start = new Date(2026, 7, 1);   // Aug 1, 2026
  const d = new Date(start.getTime() + day * 86400000);
  return d.toLocaleDateString('en-AE', { day: 'numeric', month: 'short' });
}

function relativeDayLabel(day, target, isAr) {
  const diff = target - day;
  if (diff > 0) return (isAr ? 'بعد ' : 'in ') + diff + (isAr ? ' يوم' : 'd');
  if (diff < 0) return (isAr ? 'قبل ' : '') + Math.abs(diff) + (isAr ? ' يوم' : 'd ago');
  return isAr ? 'اليوم' : 'today';
}

function collectionsBanner(stage, dpd, isAr) {
  if (stage === 'soft') return {
    tone: 'warn',
    title: isAr ? `Day ${dpd} متأخّر، ادفع الآن أو أعد الجدولة` : `Day ${dpd} overdue · pay now or reschedule`,
    sub: isAr ? 'رسوم تأخير ٠٫٥٪، لم تُبلَّغ AECB بعد' : '0.5% late fee · not yet reported to AECB',
  };
  if (stage === 'tele-call') return {
    tone: 'danger',
    title: isAr ? `Day ${dpd}، اتّصال من فريق التحصيل` : `Day ${dpd} · Tele-call from collections`,
    sub: isAr ? 'إعادة هيكلة متاحة · رسوم ٢٪' : 'Restructure available · 2% penalty',
  };
  if (stage === 'field') return {
    tone: 'danger',
    title: isAr ? `Day ${dpd}، إخطار رسمي` : `Day ${dpd} · Field/notice stage`,
    sub: isAr ? 'سيُبلّغ AECB خلال ٣ أيام' : 'AECB will be notified in 3 days',
  };
  return {
    tone: 'danger',
    title: isAr ? `Day ${dpd}، إجراءات قانونية` : `Day ${dpd} · Legal stage`,
    sub: isAr ? 'تمّ إيداع شيك السدّاد · شركة استرداد مُعيَّنة' : 'Cheque deposited · recovery partner engaged',
  };
}

function buildEvents(simDay, plan, paymentsByEmi, notifPrefs) {
  if (!plan) return [];
  const all = [];
  all.push({ day: 0, scope: 'buyer',    label: 'Plan signed · 4-mo installments', icon: 'check' });
  all.push({ day: 0, scope: 'supplier', label: 'AED 232,500 wired · 93% advance', icon: 'bank' });

  // Pre-due reminders fire at -3 and -1 days (only if not yet paid).
  const channels = notifPrefs && notifPrefs.channels && notifPrefs.channels.length
    ? notifPrefs.channels.join(' · ')
    : 'WhatsApp · SMS · in-app';
  computeEmiStatuses(plan, simDay, paymentsByEmi).forEach((e) => {
    if (e.status !== 'paid') {
      [3, 1].forEach((dDays) => {
        const remDay = e.dueDay - dDays;
        if (remDay >= 0 && remDay <= simDay) {
          all.push({
            day: remDay, scope: 'buyer',
            label: `EMI ${e.num} reminder · ${dDays === 1 ? 'tomorrow' : '3 days to go'} · sent via ${channels}`,
            icon: 'info', tone: 'iri',
          });
        }
      });
    }
  });

  computeEmiStatuses(plan, simDay, paymentsByEmi).forEach((e) => {
    if (e.status === 'paid') {
      all.push({ day: e.paidDay, scope: 'buyer',    label: `EMI ${e.num}/${plan.tenorMonths} paid · AED ${e.amount.toLocaleString()}` + (e.penalty ? ` (+ AED ${e.penalty.toLocaleString()} penalty)` : ''), icon: 'check' });
      all.push({ day: e.paidDay, scope: 'supplier', label: `Buyer EMI ${e.num}/${plan.tenorMonths} cleared`, icon: 'check' });
    }
    if (e.status === 'overdue') {
      const dpd = e.daysOverdue;
      const banner = collectionsBanner(e.stage, dpd, false);
      all.push({ day: e.dueDay + dpd, scope: 'buyer',    label: banner.title, icon: 'warning', tone: banner.tone });
      all.push({ day: e.dueDay + dpd, scope: 'supplier', label: `Buyer DPD ${dpd} · ${e.stage}`, icon: 'info', tone: 'iri' });
    }
  });

  const lastEmi = plan.schedule[plan.schedule.length - 1];
  const allPaid = plan.schedule.every((emi) => paymentsByEmi && paymentsByEmi[emi.num]);
  if (allPaid) {
    const closedDay = Math.max(...Object.values(paymentsByEmi).map((p) => p.paidOnDay)) + 1;
    if (simDay >= closedDay) {
      all.push({ day: closedDay, scope: 'buyer',    label: 'Loan closed · AECB report positive · limit released', icon: 'star' });
      all.push({ day: closedDay, scope: 'supplier', label: 'Cycle complete', icon: 'star' });
    }
  }

  return all.filter((e) => e.day <= simDay).sort((a, b) => b.day - a.day);
}

// ------------------------------------------------------------------
// Mid-loan refinance. "Convert remaining balance to a longer EMI"
// ------------------------------------------------------------------

function computeRemainingPrincipal(plan, simDay, paymentsByEmi) {
  if (!plan) return 0;
  const statuses = computeEmiStatuses(plan, simDay, paymentsByEmi);
  const paid = statuses.filter((e) => e.status === 'paid').length;
  return plan.principal - paid * (plan.principal / plan.schedule.length);
}

function canRefinanceNow(plan, simDay, paymentsByEmi, alreadyRefinanced) {
  if (!plan || alreadyRefinanced) return false;
  const statuses = computeEmiStatuses(plan, simDay, paymentsByEmi);
  const paid = statuses.filter((e) => e.status === 'paid').length;
  const remaining = statuses.length - paid;
  if (remaining < 1) return false;             // nothing left to refinance
  // Distress windows. Eligible regardless of plan size
  const overdue = findOverdue(statuses);
  if (overdue && overdue.daysOverdue <= 4) return true;
  const next = findNextUpcoming(statuses);
  if (next && (next.dueDay - simDay) >= 0 && (next.dueDay - simDay) <= 7) return true;
  // Mid-loan: only meaningful for multi-EMI plans, after at least one EMI paid
  if (paid >= 1 && plan.schedule.length >= 2) return true;
  return false;
}

function buildRefinancedPlan(plan, simDay, paymentsByEmi, tenorMonths) {
  const remaining = computeRemainingPrincipal(plan, simDay, paymentsByEmi);
  const processingFee = Math.round(remaining * 0.015);
  const aprByTenor = { 3: 13.5, 6: 14.5, 9: 16.0, 12: 17.5 };
  const aprPct = aprByTenor[tenorMonths] || 15.5;
  const totalInterest = Math.round(remaining * (aprPct / 100) * (tenorMonths / 12));
  const totalAmount = remaining + processingFee + totalInterest;
  const emiAmount = Math.round(totalAmount / tenorMonths);
  const startDay = simDay + 30;
  const schedule = Array.from({ length: tenorMonths }, (_, i) => ({
    num: i + 1,
    dueDay: startDay + i * 30,
    amount: emiAmount,
  }));
  return {
    type: 'refinanced_' + tenorMonths,
    label: `Refinanced · ${tenorMonths}-mo`,
    tenorMonths,
    principal: remaining,
    processingFee,
    aprPct,
    totalCost: processingFee + totalInterest,
    emiAmount,
    startDay,
    refinancedAt: simDay,
    schedule,
    refinancedFrom: { type: plan.type, principal: plan.principal, schedule: plan.schedule, tenorMonths: plan.tenorMonths },
  };
}

function computeMergedStatuses(plan, simDay, paymentsByEmi, refinancedPaymentsByEmi) {
  if (!plan || !plan.refinancedFrom) {
    return computeEmiStatuses(plan, simDay, paymentsByEmi);
  }
  const original = plan.refinancedFrom;
  const refinanceDay = plan.refinancedAt;
  const oldPaid = computeEmiStatuses({ ...original, schedule: original.schedule }, refinanceDay, paymentsByEmi)
    .filter((e) => e.status === 'paid')
    .map((e) => ({ ...e, fromOriginal: true }));
  // New EMIs: derive status from refinancedPaymentsByEmi
  const newEmis = plan.schedule.map((emi) => {
    const paid = refinancedPaymentsByEmi && refinancedPaymentsByEmi[emi.num];
    if (paid) return { ...emi, status: 'paid', paidDay: paid.paidOnDay, penalty: paid.withPenalty || 0, fromRefinanced: true };
    if (simDay >= emi.dueDay) {
      const dpd = simDay - emi.dueDay;
      const stage = dpd < 5 ? 'soft' : dpd < 15 ? 'tele-call' : dpd < 31 ? 'field' : 'legal';
      return { ...emi, status: 'overdue', daysOverdue: dpd, stage, fromRefinanced: true };
    }
    return { ...emi, status: 'upcoming', fromRefinanced: true };
  });
  return [...oldPaid, ...newEmis];
}

// Compute late-fee for an unpaid overdue EMI: 0.5% of EMI per DPD, capped at 10%.
function computeLatePenalty(emiAmount, dpd) {
  if (dpd <= 0) return 0;
  const pct = Math.min(0.10, 0.005 * dpd);
  return Math.round(emiAmount * pct);
}

// ==================================================================
// 3. DemoMode root
// ==================================================================

function DemoMode({ lang = 'en', setLang, onExit, isMobile, embedded = false }) {
  const [phase, setPhase] = dmS('intro');
  const [scenario, setScenario] = dmS(DEFAULT_SCENARIO);
  const isAr = lang === 'ar';

  const patch = dmCB((p) => setScenario((s) => ({ ...s, ...(typeof p === 'function' ? p(s) : p) })), []);

  const reset = () => {
    setPhase('intro');
    setScenario(DEFAULT_SCENARIO);
  };

  const stepDay = (delta) => {
    setScenario((s) => ({ ...s, simDay: Math.max(0, Math.min(200, s.simDay + delta)) }));
  };

  const setSimDay = (d) => setScenario((s) => ({ ...s, simDay: Math.max(0, Math.min(200, d)) }));

  // Auto-clear toasts after 4.5s
  dmE(() => {
    const t = setTimeout(() => patch({ buyerToast: null, supplierToast: null }), 4500);
    return () => clearTimeout(t);
  }, [scenario.buyerToast?.title, scenario.supplierToast?.title]);

  // Auto-advance phase to 'home' only when BOTH sides finish onboarding.
  // Independent: each side completes at its own pace, sees a "ready · waiting"
  // screen until the other catches up. ~700ms after both are done, advance.
  dmE(() => {
    if (phase === 'onboarding'
        && scenario.buyerOnboardingDone
        && scenario.supplierOnboardingDone) {
      const t = setTimeout(() => setPhase('home'), 700);
      return () => clearTimeout(t);
    }
  }, [phase, scenario.buyerOnboardingDone, scenario.supplierOnboardingDone]);

  // Cross-date toasts: when simDay changes, fire alerts for any EMI dueDay
  // that was just crossed without a payment. We only fire on forward movement.
  const lastSimDay = dmR(scenario.simDay);
  dmE(() => {
    const prev = lastSimDay.current;
    const curr = scenario.simDay;
    if (curr > prev) {
      // Helper. Fires the "now due" toast and DPD-stage toasts for any
      // schedule (plan, refinanced, extension). Whichever crosses first
      // wins the toast slot; we run plan first then extension so a single
      // forward scrub picks the most-relevant alert.
      const checkSchedule = (label, schedule, payments, isExtension) => {
        if (!schedule || !payments) return false;
        const justBecameOverdue = schedule.find((emi) => {
          if (payments[emi.num]) return false;
          return prev < emi.dueDay && curr >= emi.dueDay;
        });
        if (justBecameOverdue) {
          patch({
            buyerToast: {
              title: isAr
                ? `${label} ${justBecameOverdue.num} مستحقّ، ادفع لتجنّب الرسوم`
                : `${label} ${justBecameOverdue.num} now due. Pay to avoid late fee`,
              sub: `AED ${justBecameOverdue.amount.toLocaleString()} · ${formatSimDay(justBecameOverdue.dueDay)}`,
              icon: 'bolt', tone: 'iri',
            },
            // Extension EMIs are buyer↔Mal. Supplier already settled, so no toast there
            supplierToast: isExtension ? null : {
              title: isAr ? `مال يجمع من المشتري · إعلامي` : `Mal collecting · informational`,
              sub: isAr ? `قسط ${justBecameOverdue.num} مستحقّ، تحويلك آمن` : `EMI ${justBecameOverdue.num} due · your wire is safe`,
              icon: 'info', tone: 'iri',
            },
          });
          return true;
        }
        // Stage transitions: detect crossing soft → tele-call → field → legal
        const overdueEmi = schedule.find((emi) => !payments[emi.num] && curr > emi.dueDay);
        if (overdueEmi) {
          const prevDpd = Math.max(0, prev - overdueEmi.dueDay);
          const currDpd = curr - overdueEmi.dueDay;
          const stagePrefix = isExtension ? (isAr ? 'تمديد · ' : 'Extension · ') : '';
          if (prevDpd < 5 && currDpd >= 5) {
            patch({ buyerToast: { title: isAr ? `${stagePrefix}Day ${currDpd} · مرحلة الاتّصال` : `${stagePrefix}Day ${currDpd} · Tele-call stage`, sub: isAr ? 'إعادة هيكلة مُتاحة' : 'Restructure available · 2% penalty', icon: 'warning', tone: 'iri' } });
            return true;
          } else if (prevDpd < 15 && currDpd >= 15) {
            patch({ buyerToast: { title: isAr ? `${stagePrefix}Day ${currDpd} · إخطار رسمي` : `${stagePrefix}Day ${currDpd} · Field/notice`, sub: isAr ? 'سيُبلّغ AECB خلال ٣ أيام' : 'AECB will be notified in 3 days', icon: 'warning', tone: 'iri' } });
            return true;
          } else if (prevDpd < 31 && currDpd >= 31) {
            patch({ buyerToast: { title: isAr ? `${stagePrefix}Day ${currDpd} · إجراءات قانونية` : `${stagePrefix}Day ${currDpd} · Legal stage`, sub: isAr ? 'شركة استرداد مُعيَّنة' : 'Recovery partner engaged', icon: 'warning', tone: 'iri' } });
            return true;
          }
        }
        return false;
      };

      // Plan first, then extension. A toast can only show one at a time;
      // whichever fires the relevant alert wins.
      const planFired = checkSchedule(
        isAr ? 'قسط' : 'EMI',
        scenario.plan?.schedule,
        scenario.paymentsByEmi,
        false,
      );
      if (!planFired) {
        checkSchedule(
          isAr ? 'قسط التمديد' : 'Extension EMI',
          scenario.termExtension?.schedule,
          scenario.extensionPaymentsByEmi,
          true,
        );
      }
    }
    lastSimDay.current = curr;
  }, [scenario.simDay]);

  return (
    <div dir={isAr ? 'rtl' : 'ltr'} style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at top, #FAF7EE 0%, #EFEAFF 60%, #FAF7EE 100%)',
      color: 'var(--mal-ink)',
      fontFamily: isAr ? 'var(--mal-font-ar)' : 'var(--mal-font-ui)',
      paddingBottom: 60,
    }}>
      {!embedded && (
        <DemoTopBar lang={lang} setLang={setLang} onExit={onExit}
                    reset={reset} phase={phase} isMobile={isMobile}/>
      )}
      {/* Mobile uses the top horizontal scroller; desktop uses the floating
          left dotnav (position: fixed. Does not consume layout space). */}
      {isMobile && <DemoTimelineHorizontal phase={phase} setPhase={setPhase} lang={lang}/>}
      {!isMobile && <DemoTimelineSidebar phase={phase} setPhase={setPhase} lang={lang}/>}
      <DemoStage scenario={scenario} setScenario={setScenario} patch={patch}
                 phase={phase} setPhase={setPhase} setSimDay={setSimDay} stepDay={stepDay}
                 lang={lang} isMobile={isMobile}/>
    </div>
  );
}

// ==================================================================
// 4. Top bar (simplified. No autopilot controls)
// ==================================================================

function DemoTopBar({ lang, setLang, onExit, reset, phase, isMobile }) {
  const isAr = lang === 'ar';
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
          {isAr ? 'وضع العرض المُصاحَب' : 'Side-by-side simulator'}
        </span>
      </div>

      <div style={{ flex: 1 }}/>

      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <button className="mal-pill-btn" onClick={reset}>
          {dmIco.refresh ? dmIco.refresh({ width: 12, height: 12 }) : '↻'}
          {isAr ? 'إعادة' : 'Reset'}
        </button>
        <Tabs value={lang} onChange={setLang} size="sm" items={[
          { value: 'en', label: 'EN' }, { value: 'ar', label: 'AR' },
        ]}/>
      </div>
    </header>
  );
}

// ==================================================================
// 5. Phase timeline (clickable)
// ==================================================================

// Floating vertical dotnav (cfodeck-faithful). A thin bar of horizontal
// dashes pinned to the left edge, vertically centered. Whole nav fades
// from .55 → .95 on rail-hover; each individual dash, when hovered, shows
// a label tooltip that slides in from the right.
function DemoTimelineSidebar({ phase, setPhase, lang }) {
  const isAr = lang === 'ar';
  const idx = DM_PHASES.findIndex((p) => p.id === phase);
  return (
    <nav className="mal-dotnav" aria-label="Phase navigation">
      {DM_PHASES.map((p, i) => {
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

// Horizontal timeline retained for mobile only.
function DemoTimelineHorizontal({ phase, setPhase, lang }) {
  const idx = DM_PHASES.findIndex((p) => p.id === phase);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'nowrap',
      padding: '12px 16px', overflowX: 'auto',
      borderBottom: '1px solid var(--mal-line)',
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
                  letterSpacing: '.02em', flexShrink: 0,
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
// 6. Stage. Two phones + central column with the dialer
// ==================================================================

function DemoStage({ scenario, setScenario, patch, phase, setPhase, setSimDay, stepDay, lang, isMobile }) {
  const stack = isMobile;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{
        display: 'flex', flexDirection: stack ? 'column' : 'row', gap: 26,
        alignItems: 'flex-start', justifyContent: 'center',
        // Reserve 80px on the left for the floating dotnav (only on desktop)
        padding: stack ? '8px 12px 24px' : '20px 90px 0 90px',
        flexWrap: 'wrap',
      }}>
        <DemoPanel side="buyer" title="Buyer SME" sub="Aisha · Crescent Trading FZE" tone="lilac"
                   spotlight={scenario.spotlight === 'buyer'} toast={scenario.buyerToast} lang={lang}>
          <BuyerSurface phase={phase} setPhase={setPhase} scenario={scenario} patch={patch} lang={lang}/>
        </DemoPanel>

        {/* CENTRAL COLUMN: in live phase shows the CircularDayDial; otherwise
            shows the iridescent sync-flow indicator we already had.
            The footer hint sits below the central widget so users see the
            usage tip between the two phone frames, not buried under them. */}
        {!stack && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
            {phase === 'live'
              ? <DemoCenterColumnLive scenario={scenario} setSimDay={setSimDay} stepDay={stepDay} setPhase={setPhase} patch={patch} lang={lang}/>
              : <SyncIndicatorNarrative phase={phase} lang={lang}/>}
            <DemoFooterHint phase={phase} lang={lang} simDay={scenario.simDay} plan={scenario.plan}/>
          </div>
        )}

        <DemoPanel side="supplier" title="Supplier SME" sub="Marwan · Atlas Packaging FZ" tone="sky"
                   spotlight={scenario.spotlight === 'supplier'} toast={scenario.supplierToast} lang={lang}>
          <SupplierSurface phase={phase} setPhase={setPhase} scenario={scenario} patch={patch} lang={lang}/>
        </DemoPanel>
      </div>

      {/* Live explainer dock. Product overview + last-action narrator */}
      <ExplainerDock scenario={scenario} phase={phase} lang={lang} isMobile={isMobile}/>
    </div>
  );
}

function SyncIndicatorNarrative({ phase, lang }) {
  const isAr = lang === 'ar';
  const flowing = phase === 'issue' || phase === 'receive' || phase === 'sign' || phase === 'funded';
  const direction = (phase === 'issue' || phase === 'receive') ? 'r2l'
                  : (phase === 'sign' || phase === 'funded') ? 'l2r' : null;
  return (
    <div style={{
      width: 70, marginInline: 'auto', display: 'flex',
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
// 7. CircularDayDial. Drag/scrub time
// ==================================================================

function CircularDayDial({ simDay, setSimDay, plan, paymentsByEmi, lang, maxDay = 200 }) {
  const isAr = lang === 'ar';
  const size = 256, cx = size / 2, cy = size / 2, r = 100;
  const dialRef = dmR(null);

  // Position on the rim (12 o'clock origin, clockwise)
  const pct = Math.max(0, Math.min(1, simDay / maxDay));
  const angleRad = (pct * 2 * Math.PI) - (Math.PI / 2);
  const handleX = cx + r * Math.cos(angleRad);
  const handleY = cy + r * Math.sin(angleRad);

  // Stable mousedown handler. Captures pointer movement until mouseup
  const onPointerDown = dmCB((e) => {
    e.preventDefault();
    const rect = dialRef.current.getBoundingClientRect();
    const update = (clientX, clientY) => {
      const x = clientX - rect.left - cx;
      const y = clientY - rect.top - cy;
      let angle = Math.atan2(y, x) + Math.PI / 2;
      if (angle < 0) angle += 2 * Math.PI;
      const newPct = angle / (2 * Math.PI);
      setSimDay(Math.round(newPct * maxDay));
    };
    update(e.clientX, e.clientY);
    const onMove = (ev) => update(ev.clientX, ev.clientY);
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [setSimDay, maxDay]);

  const onWheel = (e) => {
    e.preventDefault();
    setSimDay(simDay + (e.deltaY > 0 ? 1 : -1));
  };

  // Event markers along the rim (one per EMI dueDay)
  const events = (plan?.schedule || []).map((emi) => {
    const empct = emi.dueDay / maxDay;
    if (empct > 1) return null;
    const a = (empct * 2 * Math.PI) - (Math.PI / 2);
    const ex = cx + r * Math.cos(a);
    const ey = cy + r * Math.sin(a);
    const paid = paymentsByEmi && paymentsByEmi[emi.num];
    const status = paid ? 'paid' : (simDay >= emi.dueDay ? 'overdue' : 'upcoming');
    return { emi, x: ex, y: ey, status };
  }).filter(Boolean);

  return (
    <div ref={dialRef} onWheel={onWheel} style={{
      width: size, height: size, position: 'relative', userSelect: 'none', touchAction: 'none',
    }}>
      <svg width={size} height={size} style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="dialGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--mal-primary)"/>
            <stop offset="100%" stopColor="var(--mal-primary-3)"/>
          </linearGradient>
        </defs>
        {/* Track ring */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--mal-line)" strokeWidth="3"/>
        {/* Filled progress arc */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="url(#dialGrad)" strokeWidth="3"
                strokeDasharray={`${pct * 2 * Math.PI * r} ${2 * Math.PI * r}`}
                transform={`rotate(-90 ${cx} ${cy})`} strokeLinecap="round"/>
        {/* Tick marks every 30 days */}
        {Array.from({ length: Math.floor(maxDay / 30) + 1 }).map((_, i) => {
          const d = i * 30;
          if (d > maxDay) return null;
          const a = (d / maxDay) * 2 * Math.PI - Math.PI / 2;
          const x1 = cx + (r - 8) * Math.cos(a);
          const y1 = cy + (r - 8) * Math.sin(a);
          const x2 = cx + (r + 8) * Math.cos(a);
          const y2 = cy + (r + 8) * Math.sin(a);
          return <line key={d} x1={x1} y1={y1} x2={x2} y2={y2}
                       stroke={d <= simDay ? 'var(--mal-primary)' : 'var(--mal-mid-2)'}
                       strokeWidth="1.5" opacity={d <= simDay ? 1 : 0.4}/>;
        })}
        {/* Event markers per EMI */}
        {events.map((ev, i) => {
          const fill = ev.status === 'paid' ? 'var(--mal-success)'
                     : ev.status === 'overdue' ? 'var(--mal-danger)'
                     : 'var(--mal-paper)';
          const stroke = ev.status === 'paid' ? 'var(--mal-success)'
                       : ev.status === 'overdue' ? 'var(--mal-danger)'
                       : 'var(--mal-mid-2)';
          return (
            <g key={i}>
              <circle cx={ev.x} cy={ev.y} r="7" fill={fill} stroke={stroke} strokeWidth="2"/>
              {ev.status === 'overdue' && (
                <circle cx={ev.x} cy={ev.y} r="11" fill="none" stroke="var(--mal-danger)" strokeWidth="2" opacity="0.4">
                  <animate attributeName="r" values="7;14;7" dur="1.6s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" values="0.5;0;0.5" dur="1.6s" repeatCount="indefinite"/>
                </circle>
              )}
            </g>
          );
        })}
        {/* Drag handle */}
        <g onMouseDown={onPointerDown} style={{ cursor: 'grab' }}>
          <circle cx={handleX} cy={handleY} r="20" fill="transparent"/>{/* hit target */}
          <circle cx={handleX} cy={handleY} r="14" fill="var(--mal-ink)" stroke="#fff" strokeWidth="3"/>
          <circle cx={handleX} cy={handleY} r="5" fill="#fff"/>
        </g>
      </svg>

      {/* Center day number. Re-keyed so CSS animation snaps on each change */}
      <div style={{
        position: 'absolute', top: 0, left: 0, width: size, height: size,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none',
      }}>
        <div className="mal-caption" style={{ color: 'var(--mal-mid)', marginBottom: 2 }}>
          {isAr ? 'اليوم' : 'DAY'}
        </div>
        <div key={simDay} style={{
          fontFamily: 'var(--mal-font-display)', fontSize: 60, fontStyle: 'italic',
          lineHeight: 1, color: 'var(--mal-ink)',
          animation: 'mal-day-snap .35s cubic-bezier(.4,1.6,.4,1)',
        }}>
          {simDay}
        </div>
        <div style={{ fontSize: 12, color: 'var(--mal-mid)', marginTop: 4, fontFamily: 'var(--mal-font-mono)' }}>
          {formatSimDay(simDay)}
        </div>
      </div>
    </div>
  );
}

// ==================================================================
// 8. Center column for live phase. Dial + step buttons + mini event log
// ==================================================================

function DemoCenterColumnLive({ scenario, setSimDay, stepDay, setPhase, patch, lang }) {
  const isAr = lang === 'ar';
  const { simDay, plan, paymentsByEmi, refinancedPaymentsByEmi } = scenario;
  const events = plan ? buildEvents(simDay, plan, plan.refinancedFrom ? refinancedPaymentsByEmi : paymentsByEmi, scenario.notifPrefs).slice(0, 4) : [];

  return (
    <div style={{
      width: 300, alignSelf: 'stretch', display: 'flex', flexDirection: 'column',
      alignItems: 'center', gap: 14, paddingTop: 56, flexShrink: 0,
    }}>
      <CircularDayDial simDay={simDay} setSimDay={setSimDay}
                       plan={plan}
                       paymentsByEmi={plan?.refinancedFrom ? refinancedPaymentsByEmi : paymentsByEmi}
                       lang={lang}/>

      {/* Snap-to buttons for key simulation moments */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', maxWidth: 280 }}>
        {[
          { d: 0,   label: 'Day 0',   sub: isAr ? 'بدء' : 'start' },
          { d: 30,  label: 'Day 30',  sub: 'EMI 1' },
          { d: 60,  label: 'Day 60',  sub: 'EMI 2' },
          { d: 90,  label: 'Day 90',  sub: 'EMI 3' },
          { d: 120, label: 'Day 120', sub: 'EMI 4' },
        ].map((s) => {
          const reached = simDay >= s.d;
          return (
            <button key={s.d}
                    onClick={() => setSimDay(s.d)}
                    style={{
                      all: 'unset', cursor: 'pointer',
                      padding: '4px 10px', borderRadius: 999, fontSize: 10,
                      background: simDay === s.d ? 'var(--mal-ink)' : 'transparent',
                      color: simDay === s.d ? '#FAF7EE' : (reached ? 'var(--mal-primary)' : 'var(--mal-mid-2)'),
                      border: '1px solid ' + (simDay === s.d ? 'transparent' : 'var(--mal-line)'),
                      fontWeight: 500, letterSpacing: '.02em',
                    }}>
              {s.label} <span style={{ opacity: .65, fontSize: 9, marginLeft: 4 }}>{s.sub}</span>
            </button>
          );
        })}
      </div>

      {/* Mini activity log */}
      {events.length > 0 && (
        <div style={{
          width: '100%', maxWidth: 280, background: 'var(--mal-paper)',
          border: '1px solid var(--mal-line)', borderRadius: 14, padding: 12,
          boxShadow: 'var(--mal-sh-1)',
        }}>
          <div className="mal-caption" style={{ marginBottom: 8 }}>{isAr ? 'النشاط' : 'Activity'}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {events.slice(0, 3).map((ev, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 11 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: 999, flexShrink: 0,
                  background: ev.tone === 'danger' ? 'var(--mal-danger-bg)' : ev.tone === 'warn' ? 'var(--mal-warn-bg)' : ev.scope === 'supplier' ? 'var(--mal-info-bg)' : 'var(--mal-success-bg)',
                  color: ev.tone === 'danger' ? 'var(--mal-danger)' : ev.tone === 'warn' ? 'var(--mal-warn)' : ev.scope === 'supplier' ? 'var(--mal-info)' : 'var(--mal-success)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {dmIco[ev.icon] ? dmIco[ev.icon]({ width: 11, height: 11 }) : '•'}
                </div>
                <div style={{ flex: 1, lineHeight: 1.4 }}>
                  <div style={{ color: 'var(--mal-ink)' }}>{ev.label}</div>
                  <div className="mal-mono" style={{ fontSize: 9, color: 'var(--mal-mid-2)', marginTop: 1 }}>
                    Day {ev.day} · {ev.scope}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ==================================================================
// 9. Phone Panel
// ==================================================================

function DemoPanel({ side, title, sub, tone, spotlight, toast, lang, children }) {
  const w = 380, h = 820;
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center',
      transition: 'transform .3s, filter .3s',
      transform: spotlight ? 'translateY(-4px) scale(1.012)' : 'none',
    }}>
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
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
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
// 10. Buyer surface dispatcher
// ==================================================================

function BuyerSurface({ phase, setPhase, scenario, patch, lang }) {
  if (phase === 'intro') return <DemoIntroBuyer lang={lang} onProceed={() => setPhase('onboarding')}/>;
  if (phase === 'onboarding') {
    // Per-side completion: when buyer finishes, mark only the buyer flag.
    // Phase only advances when BOTH sides have completed (handled below).
    if (scenario.buyerOnboardingDone) {
      return <DemoOnboardingReady lang={lang} side="buyer" partnerDone={scenario.supplierOnboardingDone}/>;
    }
    return <BuyerOnboardingFlow lang={lang}
                                controlledStep={scenario.buyerStep}
                                onStepChange={(n) => patch({ buyerStep: n })}
                                onDone={() => patch({ buyerOnboardingDone: true })}/>;
  }
  if (phase === 'home' || phase === 'issue') return <DemoBuyerHomeEmpty lang={lang}/>;
  if (phase === 'receive') return <DemoBuyerHomeWithInvoice lang={lang} scenario={scenario} onProceed={() => setPhase('plan')}/>;
  if (phase === 'plan' || phase === 'sign') return <DemoBuyerPlanPicker lang={lang} scenario={scenario} patch={patch}
                                                                         onSign={() => setPhase('sign')}
                                                                         onSigned={() => setPhase('funded')}/>;
  if (phase === 'funded') return <DemoBuyerJustSigned lang={lang} scenario={scenario} onProceed={() => setPhase('live')}/>;
  if (phase === 'live') {
    const route = scenario.buyerRoute || 'home';
    const setBuyerRoute = (r) => {
      const patches = { buyerRoute: r };
      // Emit a lastAction for the explainer dock when entering key flows.
      const day = scenario.simDay;
      if (r === 'refinance-hero')      patches.lastAction = { id: 'refinance-opened', day };
      else if (r === 'extend-hero')    patches.lastAction = { id: 'extend-opened', day };
      else if (r === 'refinance-success') patches.lastAction = { id: 'refinance-signed', day, extra: { tenor: scenario.refinanceDraft?.tenorMonths } };
      patch(patches);
    };
    return <DemoBuyerLive route={route} setBuyerRoute={setBuyerRoute}
                          scenario={scenario} patch={patch} lang={lang}/>;
  }
  return null;
}

// Shown on the side that's already finished onboarding while the OTHER
// side is still going. Once both are done, DemoMode auto-advances to 'home'.
function DemoOnboardingReady({ lang, side, partnerDone }) {
  const isAr = lang === 'ar';
  const isBuyer = side === 'buyer';
  const personaTitle = isBuyer ? (isAr ? 'تجارة الهلال' : 'Crescent Trading FZE')
                               : (isAr ? 'أطلس باكدجنغ' : 'Atlas Packaging FZ');
  return (
    <div style={{ height: '100%', minHeight: 800, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: isBuyer
        ? 'linear-gradient(180deg, #FAF7EE 0%, #EFEAFF 60%, #FAF7EE 100%)'
        : 'linear-gradient(180deg, #FAF7EE 0%, #DCE8F8 60%, #FAF7EE 100%)' }}/>
      <div style={{ position: 'absolute', top: 60, insetInlineEnd: -60, width: 280, height: 280, opacity: .55 }}>
        <div className="mal-orb" style={{ width: '100%', height: '100%', animation: 'mal-orb-spin 22s linear infinite' }}/>
      </div>
      <div style={{ flex: 1, padding: 30, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', position: 'relative', zIndex: 1, textAlign: 'center', gap: 18 }}>
        <div style={{
          width: 70, height: 70, borderRadius: 999,
          background: 'var(--mal-success-bg)', color: 'var(--mal-success)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {dmIco.check ? dmIco.check({ width: 32, height: 32, stroke: 'var(--mal-success)' }) : '✓'}
        </div>
        <h2 className="mal-display-md" style={{ fontStyle: 'italic', margin: 0 }}>
          {isAr ? 'تمّ الإعداد' : 'You\'re onboarded'}
        </h2>
        <div style={{ color: 'var(--mal-mid)', fontSize: 13, lineHeight: 1.5, maxWidth: 280 }}>
          {personaTitle} · {isBuyer ? (isAr ? 'حدّ ائتمان AED 850,000' : 'AED 850,000 limit · Tier A')
                                    : (isAr ? 'حساب مورّد مفعّل' : 'Supplier account active')}
        </div>
        <div style={{
          marginTop: 18, padding: '14px 16px',
          background: 'var(--mal-paper)', borderRadius: 14,
          border: '1px solid var(--mal-line)',
          maxWidth: 300, width: '100%',
        }}>
          {partnerDone ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: 'var(--mal-success)' }}>
              {dmIco.check ? dmIco.check({ width: 16, height: 16, stroke: 'var(--mal-success)' }) : '✓'}
              {isAr ? 'الطرف الآخر جاهز أيضاً، جارٍ المتابعة…' : 'Other side ready too، proceeding…'}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: 'var(--mal-mid)' }}>
              <div style={{ width: 14, height: 14, border: '2px solid var(--mal-primary-3)', borderTopColor: 'transparent', borderRadius: 999, animation: 'mal-spin 1s linear infinite' }}/>
              {isAr
                ? `في انتظار إعداد ${isBuyer ? 'المورّد' : 'المشتري'}…`
                : `Waiting for ${isBuyer ? 'supplier' : 'buyer'} to finish onboarding…`}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DemoIntroBuyer({ lang, onProceed }) {
  const isAr = lang === 'ar';
  return (
    <div style={{ height: '100%', minHeight: 720, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #FAF7EE 0%, #EFEAFF 60%, #FAF7EE 100%)' }}/>
      <div style={{ position: 'absolute', top: 60, insetInlineEnd: -60, width: 280, height: 280, opacity: .5 }}>
        <div className="mal-orb" style={{ width: '100%', height: '100%', animation: 'mal-orb-spin 22s linear infinite' }}/>
      </div>
      <div style={{ flex: 1, padding: 30, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', position: 'relative', zIndex: 1 }}>
        <MalLogo size={22}/>
        <h1 className="mal-display" style={{ fontSize: 44, fontStyle: 'italic', lineHeight: 1, marginTop: 28, marginBottom: 12 }}>
          {isAr ? <>رأس مال<br/><span className="mal-iri-text">يتحرّك معك.</span></> : <>Capital that<br/><span className="mal-iri-text">moves with you.</span></>}
        </h1>
        <p style={{ fontSize: 13, color: 'var(--mal-mid)', maxWidth: 280, lineHeight: 1.5, marginBottom: 24 }}>
          {isAr ? 'افتح حسابك في ١٠ دقائق. اشترِ الآن، ادفع خلال ٣٠ إلى ١٢٠ يوم، مال يسدّد موردك اليوم.' : 'Open your account in 10 minutes. Buy now, pay in 30 to 120 days. Mal settles your supplier today.'}
        </p>
        <Button kind="primary" size="lg" full iconRight="arrow" onClick={onProceed}>
          {isAr ? 'افتح حساباً' : 'Get started'}
        </Button>
        <div style={{ fontSize: 11, color: 'var(--mal-mid)', textAlign: 'center', marginTop: 14 }}>
          ADGM FSRA · UAE Pass · AECB
        </div>
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

function DemoBuyerHomeWithInvoice({ lang, scenario, onProceed }) {
  const isAr = lang === 'ar';
  return (
    <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="mal-caption">{isAr ? 'مرحباً، عيشة' : 'Hi, Aisha'}</div>
      <div className="mal-h1" style={{ marginTop: -4 }}>{isAr ? 'تجارة الهلال' : 'Crescent Trading FZE'}</div>
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
      <Card padded onClick={onProceed} style={{
        borderColor: 'var(--mal-primary-3)', borderWidth: 1.5,
        animation: 'mal-fade-up .4s ease-out',
        cursor: 'pointer',
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
      <Button kind="primary" size="lg" full iconRight="arrow" onClick={onProceed}>
        {isAr ? 'افتح الفاتورة' : 'Open invoice'}
      </Button>
    </div>
  );
}

// ==================================================================
// 11. Plan picker + Confirm + JustSigned (used in narrative phases)
// ==================================================================

function DemoBuyerPlanPicker({ lang, scenario, patch, onSign, onSigned }) {
  const isAr = lang === 'ar';
  const plans = [
    { key: 'pay30',         label: isAr ? 'ادفع خلال ٣٠'  : 'Pay in 30d',         cost: '0%',     sub: isAr ? 'مجّاناً' : 'Free' },
    { key: 'bnpl60',        label: isAr ? 'BNPL ٦٠ يوم'   : 'BNPL 60d',           cost: '+1.8%',  sub: 'AED 4,500' },
    { key: 'bnpl90',        label: isAr ? 'BNPL ٩٠ يوم'   : 'BNPL 90d',           cost: '+2.6%',  sub: 'AED 6,500' },
    { key: 'inst3',         label: isAr ? 'أقساط ٣ شهور'  : 'Instalments · 3 mo', cost: '+3.0%',  sub: 'AED 7,500' },
    { key: 'installment_4', label: isAr ? 'أقساط ٤ شهور'  : 'Instalments · 4 mo', cost: '+3.6%',  sub: 'AED 9,000', recommended: true },
  ];
  const picked = scenario.plan?.type;
  const variant = scenario.productVariant || 'conventional';
  const [signing, setSigning] = dmS(false);
  const [showTawarruq, setShowTawarruq] = dmS(false);
  // Once signed, advance phase to 'funded' after a brief animation
  dmE(() => {
    if (signing) {
      const t = setTimeout(() => {
        patch({
          signed: true, signing: false,
          lastAction: { id: 'plan-signed', day: scenario.simDay, extra: { planLabel: scenario.plan?.label } },
        });
        setSigning(false);
        onSigned && onSigned();
      }, 1300);
      return () => clearTimeout(t);
    }
  }, [signing]);
  return (
    <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="mal-caption">{isAr ? 'فاتورة' : 'Invoice'} {scenario.invoice.id}</div>
      <div style={{ fontFamily: 'var(--mal-font-display)', fontSize: 30, fontStyle: 'italic', lineHeight: 1.05 }}>
        {isAr ? 'كيف تريد أن تدفع؟' : 'How do you want to pay?'}
      </div>

      {/* Conventional / Sharia variant toggle */}
      <div style={{
        display: 'inline-flex', padding: 3, gap: 3, borderRadius: 999,
        background: 'var(--mal-surface-2)', border: '1px solid var(--mal-line)',
        alignSelf: 'flex-start',
      }}>
        {[
          { v: 'conventional', label: isAr ? 'تقليدي' : 'Conventional' },
          { v: 'sharia',       label: isAr ? 'شرعي'   : 'Sharia · Tawarruq' },
        ].map((opt) => {
          const active = variant === opt.v;
          return (
            <button key={opt.v} onClick={() => patch({
              productVariant: opt.v,
              lastAction: { id: 'variant-toggled', day: scenario.simDay, extra: { variant: opt.v } },
            })} style={{
              all: 'unset', cursor: 'pointer',
              padding: '5px 12px', borderRadius: 999,
              fontSize: 11.5, fontWeight: active ? 700 : 500,
              color: active ? '#fff' : 'var(--mal-ink-2)',
              background: active ? 'var(--mal-primary)' : 'transparent',
              transition: 'background .15s, color .15s',
            }}>{opt.label}</button>
          );
        })}
      </div>
      {variant === 'sharia' && (
        <div style={{
          fontSize: 11, color: 'var(--mal-mid)', lineHeight: 1.5,
          padding: '8px 12px', borderRadius: 8,
          background: 'rgba(10,128,86,0.08)',
          border: '1px solid rgba(10,128,86,0.22)',
        }}>
          {isAr
            ? '✓ متوافق مع الشريعة عبر هيكل المرابحة بالتورّق (AAOIFI). نشتري سلعة لك، نبيعها لك بالأجل، ثم تُباع نقداً.'
            : '✓ Sharia-compliant via Commodity Murabaha (Tawarruq), AAOIFI-aligned. Mal buys a commodity, sells it to you on deferred terms, you sell it spot for cash.'}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {plans.map((p, i) => {
          const selected = picked === p.key;
          return (
            <button key={p.key}
                    onClick={() => {
                      // Each preset has a real schedule, so the lifecycle simulator
                      // works for any plan the buyer picks.
                      const preset = PLAN_DEFS[p.key] || PLAN_DEFS.installment_4;
                      patch({
                        plan: preset, paymentsByEmi: {},
                        lastAction: { id: 'plan-selected', day: scenario.simDay, extra: { planLabel: p.label, fee: p.cost } },
                      });
                    }}
                    className={`mal-plan-row ${selected ? 'selected' : 'mal-fade-up'}`}
                    style={{
                      all: 'unset', cursor: 'pointer',
                      padding: 14, borderRadius: 14,
                      background: selected ? 'var(--mal-paper)' : 'var(--mal-surface-2)',
                      border: '1.5px solid ' + (selected ? 'var(--mal-primary)' : 'transparent'),
                      boxShadow: selected ? 'var(--mal-sh-2)' : 'none',
                      display: 'flex', alignItems: 'center', gap: 12,
                      transition: 'transform .18s ease, background .18s ease, box-shadow .18s ease, border-color .18s ease',
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

      {scenario.plan && (
        <Button kind="primary" size="lg" full
                onClick={() => {
                  if (signing) return;
                  if (variant === 'sharia' && !showTawarruq) {
                    // Show the Tawarruq visualiser before signing the contract
                    setShowTawarruq(true);
                    return;
                  }
                  onSign && onSign();
                  setSigning(true);
                }}
                icon={signing ? 'check' : 'lock'}>
          {signing ? (isAr ? 'جارٍ التوقيع…' : 'Signing…')
            : variant === 'sharia'
              ? (isAr ? 'تابع، اعرض هيكل التورّق' : 'Continue، show Tawarruq structure')
              : (isAr ? 'وقّع بهوية رقمية' : 'Sign with UAE Pass')}
        </Button>
      )}

      {/* Tawarruq visualiser overlay */}
      {showTawarruq && (
        <TawarruqVisualiser
          isAr={isAr}
          principal={scenario.plan?.principal || 250000}
          totalCost={scenario.plan?.totalCost || 0}
          tenorMonths={scenario.plan?.tenorMonths || 4}
          onClose={() => setShowTawarruq(false)}
          onSign={() => {
            setShowTawarruq(false);
            onSign && onSign();
            setSigning(true);
          }}
        />
      )}
    </div>
  );
}

function DemoBuyerJustSigned({ lang, scenario, onProceed }) {
  const isAr = lang === 'ar';
  return (
    <div style={{ padding: 24, minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, textAlign: 'center' }}>
      <div className="mal-orb" style={{ width: 110, height: 110, animation: 'mal-orb-spin 8s linear infinite' }}/>
      <div className="mal-display-md mal-iri-text" style={{ fontStyle: 'italic' }}>
        {isAr ? 'تمّ' : 'Done'}
      </div>
      <div style={{ color: 'var(--mal-mid)', fontSize: 13, maxWidth: 260, lineHeight: 1.5 }}>
        {isAr
          ? 'تمّ تحويل ٢٣٢٬٥٠٠ د.إ لأطلس. القسط الأوّل في يوم ٣٠.'
          : 'AED 232,500 wired to Atlas. First instalment on Day 30.'}
      </div>
      <Button kind="primary" size="lg" iconRight="arrow" onClick={onProceed}>
        {isAr ? 'متابعة' : 'Continue'}
      </Button>
    </div>
  );
}

// ==================================================================
// 12. BUYER LIVE PHASE. Day-driven home + Pay buttons + extends
// ==================================================================

function DemoBuyerLive({ route, setBuyerRoute, scenario, patch, lang }) {
  // Ensure plan exists when entering live phase
  dmE(() => {
    if (!scenario.plan) patch({ plan: DEFAULT_PLAN });
  }, [scenario.plan]);
  if (!scenario.plan) return <DemoBuyerHomeWithInvoice lang={lang} scenario={scenario}/>;

  if (route === 'home')        return <DemoBuyerLiveHome lang={lang} scenario={scenario} setBuyerRoute={setBuyerRoute} patch={patch}/>;
  if (route === 'plan-picker') return <DemoBuyerPlanPicker lang={lang} scenario={scenario} patch={patch}/>;
  if (route === 'confirm') {
    return <DemoBuyerConfirm lang={lang} scenario={scenario} patch={patch}/>;
  }
  if (route === 'loan-detail') return <DemoBuyerLoanDetail lang={lang} scenario={scenario} setBuyerRoute={setBuyerRoute}/>;

  // Term-extension routes
  if (route === 'extend-hero')    return <BuyerExtendHero lang={lang} setRoute={setBuyerRoute} viewport="mobile"/>;
  if (route === 'extend-pick')    return <BuyerExtendPicker lang={lang} setRoute={setBuyerRoute} viewport="mobile"/>;
  if (route === 'extend-agree')   return <BuyerExtendAgreement lang={lang} setRoute={setBuyerRoute} viewport="mobile"/>;
  if (route === 'extend-confirm') {
    return <BuyerExtendConfirm lang={lang} setRoute={(r) => {
      if (r === 'extend-success') {
        // Signing the extension means Mal *takes over* the original invoice:
        // every unpaid EMI of the current plan flips to "settled by Mal via
        // extension". Penalty 0 (covered by the extension's own pricing).
        // The extension itself becomes a 6-mo loan with its own schedule.
        patch((s) => {
          const newPaid = { ...(s.paymentsByEmi || {}) };
          (s.plan?.schedule || []).forEach((emi) => {
            if (!newPaid[emi.num]) {
              newPaid[emi.num] = {
                paidOnDay: s.simDay,
                withPenalty: 0,
                settledByExtension: true,
              };
            }
          });
          // Build the extension's 6-month EMI schedule starting one month
          // after the sign date.
          const tenor = 6;
          const emi = 44063;
          const startDay = s.simDay;
          const schedule = Array.from({ length: tenor }, (_, i) => ({
            num: i + 1,
            dueDay: startDay + (i + 1) * 30,
            amount: emi,
          }));
          return {
            paymentsByEmi: newPaid,
            termExtension: {
              type: 'term_extension_6mo',
              label: '6-mo term extension',
              principal: 250000,
              tenorMonths: tenor,
              aprPct: 11.5,
              emi: emi,
              emiAmount: emi,           // mirror plan shape
              startDay,
              schedule,
              signedAt: new Date().toISOString(),
            },
            extensionPaymentsByEmi: {},
            buyerToast: {
              title: 'Original invoice settled by Mal',
              sub: `New ${tenor}-mo term loan begins · AED ${emi.toLocaleString()}/mo`,
              icon: 'check', tone: 'success',
            },
            lastAction: { id: 'extend-signed', day: s.simDay, extra: { tenor } },
          };
        });
      }
      setBuyerRoute(r);
    }} viewport="mobile"/>;
  }
  if (route === 'extend-success') return <BuyerExtendSuccess lang={lang} setRoute={(r) => setBuyerRoute(r === 'home' ? 'home' : 'extend-active')} viewport="mobile"/>;
  if (route === 'extend-active')  return <BuyerExtendActive lang={lang} setRoute={setBuyerRoute} viewport="mobile"/>;
  if (route === 'extend-detail')  return <BuyerExtendDetail lang={lang} setRoute={setBuyerRoute} viewport="mobile"/>;
  if (route === 'extend-settle')  return <BuyerExtendSettle lang={lang} setRoute={(r) => setBuyerRoute(r === 'home' ? 'home' : r)} viewport="mobile"/>;

  // Refinance routes
  if (route === 'refinance-hero')    return <DemoRefinanceHero    lang={lang} scenario={scenario} setBuyerRoute={setBuyerRoute}/>;
  if (route === 'refinance-pick')    return <DemoRefinancePicker  lang={lang} scenario={scenario} patch={patch} setBuyerRoute={setBuyerRoute}/>;
  if (route === 'refinance-confirm') return <DemoRefinanceConfirm lang={lang} scenario={scenario} patch={patch} setBuyerRoute={setBuyerRoute}/>;
  if (route === 'refinance-success') return <DemoRefinanceSuccess lang={lang} scenario={scenario} setBuyerRoute={setBuyerRoute}/>;

  return <DemoBuyerLiveHome lang={lang} scenario={scenario} setBuyerRoute={setBuyerRoute} patch={patch}/>;
}

// Buyer's main day-aware home. Renders limit, EMI ladder with Pay buttons,
// overdue banners and refinance/extension CTAs derived from current state.
function DemoBuyerLiveHome({ lang, scenario, setBuyerRoute, patch }) {
  const isAr = lang === 'ar';
  const { simDay, plan, paymentsByEmi, refinancedPaymentsByEmi, termExtension, extensionPaymentsByEmi } = scenario;
  const isRefinanced = !!plan?.refinancedFrom;
  const activePayments = isRefinanced ? refinancedPaymentsByEmi : paymentsByEmi;
  const statuses = isRefinanced
    ? computeMergedStatuses(plan, simDay, paymentsByEmi, refinancedPaymentsByEmi)
    : computeEmiStatuses(plan, simDay, paymentsByEmi);
  const overdue = findOverdue(statuses);
  const nextUpcoming = findNextUpcoming(statuses);
  const paidCount = statuses.filter((e) => e.status === 'paid').length;
  const totalCount = statuses.length;
  const isClosed = paidCount === totalCount && totalCount > 0;

  // Plan-side outstanding (only counts EMIs that AREN'T flagged settledByExtension —
  // those are absorbed by the extension and shouldn't double-count utilization).
  const originalPrincipal = isRefinanced ? plan.refinancedFrom.principal : plan.principal;
  const planTotalPaidAmount = statuses
    .filter(e => e.status === 'paid')
    .reduce((s, e) => s + (e.amount || 0), 0);
  const planRemainingForLimit = isClosed
    ? 0
    : Math.max(0, originalPrincipal - planTotalPaidAmount);

  // Extension-side outstanding
  const extStatuses = termExtension
    ? computeEmiStatuses(termExtension, simDay, extensionPaymentsByEmi)
    : [];
  const extOverdue   = findOverdue(extStatuses);
  const extNextUpcoming = findNextUpcoming(extStatuses);
  const extPaidCount = extStatuses.filter((e) => e.status === 'paid').length;
  const extTotalCount = extStatuses.length;
  const extIsClosed  = termExtension && extPaidCount === extTotalCount && extTotalCount > 0;
  const extPaidAmount = extStatuses
    .filter(e => e.status === 'paid')
    .reduce((s, e) => s + (e.amount || 0), 0);
  const extRemainingForLimit = !termExtension || extIsClosed
    ? 0
    : Math.max(0, termExtension.principal - extPaidAmount);

  // Background loans (other concurrent invoices the buyer is paying off).
  const backgroundLoans = scenario.backgroundLoans || [];
  const bgLoanSummaries = backgroundLoans.map((loan, idx) => {
    const bgStatuses = computeEmiStatuses(loan.plan, simDay, loan.paymentsByEmi);
    const bgPaidCount = bgStatuses.filter((e) => e.status === 'paid').length;
    const bgTotalCount = bgStatuses.length;
    const bgIsClosed = bgPaidCount === bgTotalCount && bgTotalCount > 0;
    const bgPaidAmount = bgStatuses
      .filter(e => e.status === 'paid')
      .reduce((s, e) => s + (e.amount || 0), 0);
    const bgRemainingForLimit = bgIsClosed ? 0 : Math.max(0, loan.plan.principal - bgPaidAmount);
    return { idx, loan, bgStatuses, bgPaidCount, bgTotalCount, bgIsClosed, bgPaidAmount, bgRemainingForLimit };
  });
  const bgUsedTotal = bgLoanSummaries.reduce((s, b) => s + b.bgRemainingForLimit, 0);

  // Bundled (consolidated) plan outstanding. Replaces the per-obligation
  // utilisation once the bundle is signed.
  const bundledPlan = scenario.bundledPlan;
  const bundledPaymentsByEmi = scenario.bundledPaymentsByEmi || {};
  const bundledPaidAmount = bundledPlan
    ? bundledPlan.schedule.filter((e) => bundledPaymentsByEmi[e.num])
                          .reduce((s, e) => s + (e.amount || 0), 0)
    : 0;
  const bundledIsClosed = bundledPlan
    ? bundledPlan.schedule.every((e) => bundledPaymentsByEmi[e.num])
    : true;
  const bundledRemaining = bundledPlan && !bundledIsClosed
    ? Math.max(0, bundledPlan.principal - bundledPaidAmount)
    : 0;

  // Combined utilization across all active obligations
  const usedAmount = bundledPlan
    ? bundledRemaining
    : planRemainingForLimit + extRemainingForLimit + bgUsedTotal;
  const allClosed = bundledPlan
    ? bundledIsClosed
    : isClosed && (!termExtension || extIsClosed) && bgLoanSummaries.every((b) => b.bgIsClosed);
  const availableLimit = 850000 - usedAmount;
  const utilisationPct = Math.round((usedAmount / 850000) * 100);

  // Active-loan count (for the section header). Once bundled, only the bundle
  // counts; original obligations are settled-by-bundle.
  const activeLoanCount = bundledPlan
    ? (bundledIsClosed ? 0 : 1)
    : (plan && !isClosed ? 1 : 0)
      + (termExtension && !extIsClosed ? 1 : 0)
      + bgLoanSummaries.filter((b) => !b.bgIsClosed).length;

  const showExtendCta = !termExtension && shouldShowExtendCta(plan, simDay, activePayments, !!termExtension);
  const showRefinanceCta = !isRefinanced && !termExtension && canRefinanceNow(plan, simDay, paymentsByEmi, isRefinanced);

  // Pay an EMI handler. Works for plan, refinanced plan, and extension.
  const payEmi = (emiNum, dueDay, amount, source) => {
    const dpd = Math.max(0, simDay - dueDay);
    const penalty = computeLatePenalty(amount, dpd);
    let updates;
    if (source === 'extension') {
      updates = { extensionPaymentsByEmi: { ...extensionPaymentsByEmi, [emiNum]: { paidOnDay: simDay, withPenalty: penalty } } };
    } else if (isRefinanced) {
      updates = { refinancedPaymentsByEmi: { ...refinancedPaymentsByEmi, [emiNum]: { paidOnDay: simDay, withPenalty: penalty } } };
    } else {
      updates = { paymentsByEmi: { ...paymentsByEmi, [emiNum]: { paidOnDay: simDay, withPenalty: penalty } } };
    }
    const sourceLabel = source === 'extension' ? (isAr ? 'تمديد' : 'extension') : (isAr ? 'خطة' : 'plan');
    patch({
      ...updates,
      buyerToast: {
        title: dpd > 0
          ? (isAr ? `قسط ${sourceLabel} ${emiNum} مدفوع · رسم ${penalty} د.إ` : `${source === 'extension' ? 'Extension' : 'Plan'} EMI ${emiNum} paid · AED ${penalty.toLocaleString()} late fee`)
          : (isAr ? `قسط ${sourceLabel} ${emiNum} مدفوع` : `${source === 'extension' ? 'Extension' : 'Plan'} EMI ${emiNum} paid`),
        sub: `AED ${(amount + penalty).toLocaleString()}`,
        icon: 'check', tone: 'success',
      },
      supplierToast: source === 'extension' ? null : {
        title: isAr ? `قسط ${emiNum} مكتمل` : `Buyer EMI ${emiNum} cleared`,
        sub: isAr ? 'دورتك تستمرّ' : 'Cycle continues',
        icon: 'check', tone: 'success',
      },
      lastAction: { id: 'emi-paid', day: simDay, extra: { emiNum, amount, withPenalty: penalty } },
    });
  };

  // Compatibility shim. The existing plan-card overdue banner uses payEmi
  // without a `source` arg, so default to plan.
  const payEmiPlan = (n, d, a) => payEmi(n, d, a, 'plan');

  // Pay handler for a background loan (e.g. Marina IT BNPL). Updates that
  // loan's paymentsByEmi without touching plan or extension state.
  const payBgEmi = (loanIdx, emiNum, dueDay, amount) => {
    const dpd = Math.max(0, simDay - dueDay);
    const penalty = computeLatePenalty(amount, dpd);
    const next = backgroundLoans.map((l, i) => i === loanIdx
      ? { ...l, paymentsByEmi: { ...l.paymentsByEmi, [emiNum]: { paidOnDay: simDay, withPenalty: penalty } } }
      : l);
    patch({
      backgroundLoans: next,
      buyerToast: {
        title: dpd > 0
          ? (isAr ? `قسط مدفوع · رسم ${penalty}` : `EMI paid · AED ${penalty.toLocaleString()} late fee`)
          : (isAr ? 'قسط مدفوع' : 'EMI paid'),
        sub: `AED ${(amount + penalty).toLocaleString()} · ${backgroundLoans[loanIdx].supplier}`,
        icon: 'check', tone: 'success',
      },
      lastAction: { id: 'bg-emi-paid', day: simDay, extra: { supplier: backgroundLoans[loanIdx].supplier, amount } },
    });
  };

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
                width: 36, height: 36, borderRadius: 10, background: '#fff',
                color: banner.tone === 'danger' ? 'var(--mal-danger)' : 'var(--mal-warn)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
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
                  <Button kind="primary" size="sm" icon="bolt"
                          onClick={() => payEmiPlan(overdue.num, overdue.dueDay, overdue.amount)}>
                    {isAr ? 'ادفع الآن' : `Pay AED ${(overdue.amount + computeLatePenalty(overdue.amount, overdue.daysOverdue)).toLocaleString()}`}
                  </Button>
                  {!isRefinanced && (
                    <Button kind="ghost" size="sm" onClick={() => setBuyerRoute('refinance-hero')}>
                      {isAr ? 'إعادة جدولة' : 'Reschedule'}
                    </Button>
                  )}
                  {!termExtension && (
                    <Button kind="ghost" size="sm" onClick={() => setBuyerRoute('extend-hero')}>
                      {isAr ? 'مدّد المدّة' : 'Extend tenure'}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Card>
        );
      })()}

      {/* Limit hero. Combined utilization across plan + extension */}
      <Card padded style={{
        background: allClosed
          ? 'linear-gradient(135deg, #1F7A4F 0%, #2A1F6F 100%)'
          : 'linear-gradient(135deg, #2A1F6F 0%, #1A1A28 100%)',
        color: '#fff', border: 'none', position: 'relative', overflow: 'hidden',
      }}>
        <div className="mal-orb" style={{ position: 'absolute', width: 220, height: 220, top: -90, insetInlineEnd: -90, opacity: .35 }}/>
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 11, opacity: .7, textTransform: 'uppercase', letterSpacing: '.06em' }}>
            {allClosed ? (isAr ? 'الحدّ، أُعيد إطلاقه' : 'Limit released') : (isAr ? 'الحد المتاح' : 'Available limit')}
          </div>
          <div style={{ fontFamily: 'var(--mal-font-display)', fontSize: 36, fontStyle: 'italic', marginTop: 6 }}>
            AED {availableLimit.toLocaleString()}
          </div>
          <div style={{ height: 6, background: 'rgba(255,255,255,.18)', borderRadius: 999, marginTop: 12, overflow: 'hidden' }}>
            <div style={{ width: utilisationPct + '%', height: '100%', background: '#fff', transition: 'width .5s' }}/>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, opacity: .85 }}>
            <span>{isAr ? 'مستخدم' : 'In use'} AED {Math.max(0, usedAmount).toLocaleString()}</span>
            <span>{utilisationPct}%</span>
          </div>
          {/* Breakdown. Shows source of utilization when both are active */}
          {planRemainingForLimit > 0 && extRemainingForLimit > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10, opacity: .65 }}>
              <span>{isAr ? 'خطة' : 'Plan'} AED {planRemainingForLimit.toLocaleString()}</span>
              <span>{isAr ? 'تمديد' : 'Extension'} AED {extRemainingForLimit.toLocaleString()}</span>
            </div>
          )}
        </div>
      </Card>

      {/* AECB rescheduled soft flag */}
      {isRefinanced && (
        <Card padded style={{
          background: 'var(--mal-info-bg)', borderColor: 'var(--mal-info)', borderWidth: 1,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, background: '#fff',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              color: 'var(--mal-info)',
            }}>
              {dmIco.info ? dmIco.info({ width: 18, height: 18 }) : 'ℹ'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--mal-info)' }}>
                {isAr ? 'جدولة جديدة · علم AECB ناعم' : 'Loan rescheduled · AECB soft flag'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--mal-ink)', marginTop: 2 }}>
                {isAr
                  ? 'ليس تعثّراً، مجرّد تنبيه أنّ القرض أعيدت هيكلته. لا يُؤثّر على وصولك للائتمان.'
                  : 'Not a default، just a notation that the loan was restructured. Doesn\'t hurt your access to credit.'}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Active loans section header */}
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        marginTop: 4, marginBottom: -4,
      }}>
        <div className="mal-caption">{isAr ? 'القروض النشطة' : 'Active loans'}</div>
        <span style={{ fontSize: 11, color: 'var(--mal-mid)' }}>
          {activeLoanCount} {isAr ? 'نشط' : (activeLoanCount === 1 ? 'active' : 'active')}
          {allClosed ? ` · ${isAr ? 'الكلّ مُغلق' : 'all closed'}` : ''}
        </span>
      </div>

      {/* Active plan card with EMI ladder and Pay buttons */}
      <Card padded>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div className="mal-caption">{isAr ? 'الخطة الحالية' : 'Active plan'} · {scenario.invoice.id}</div>
          {!isClosed && nextUpcoming && (
            <span style={{ fontSize: 11, color: 'var(--mal-mid)' }}>
              {isAr ? 'القسط التالي' : 'Next'} {relativeDayLabel(simDay, nextUpcoming.dueDay, isAr)}
            </span>
          )}
        </div>
        <EInvoiceBadge isAr={isAr} compact/>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--mal-font-display)', fontSize: 24, fontStyle: 'italic' }}>
            {plan.label}
          </span>
          <Pill tone={isClosed ? 'success' : (overdue ? 'danger' : 'info')} dot>
            {isClosed ? (isAr ? 'مُغلق' : 'Closed')
              : overdue ? (isAr ? 'متأخّر' : 'Overdue')
              : (isAr ? 'في الوقت' : 'On track')}
          </Pill>
          {!isClosed && !isRefinanced && (
            <SwitchTermPill
              isAr={isAr}
              currentType={plan.type}
              onPick={(newType) => {
                const preset = PLAN_DEFS[newType];
                if (!preset) return;
                patch({
                  plan: { ...preset, switchedFrom: plan.type },
                  paymentsByEmi: {},
                  buyerToast: {
                    title: isAr ? 'تم تبديل الخطة' : 'Plan switched',
                    sub: isAr ? `${plan.label} → ${preset.label}` : `${plan.label} → ${preset.label}`,
                    icon: 'check', tone: 'success',
                  },
                  lastAction: { id: 'switch-term', day: simDay, extra: { from: plan.label, to: preset.label } },
                });
              }}
            />
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {statuses.map((e, i) => {
            const origCount = isRefinanced ? plan.refinancedFrom.tenorMonths : totalCount;
            const newCount  = isRefinanced ? plan.tenorMonths : totalCount;
            const groupLabel = e.fromOriginal
              ? (isAr ? `قبل الجدولة · القسط ${e.num} من ${origCount}` : `Before reschedule · EMI ${e.num} of ${origCount}`)
              : e.fromRefinanced
              ? (isAr ? `جديد · القسط ${e.num} من ${newCount}` : `New · EMI ${e.num} of ${newCount}`)
              : (isAr ? `القسط ${e.num} من ${totalCount}` : `EMI ${e.num} of ${totalCount}`);
            const key = `${e.fromOriginal ? 'orig' : e.fromRefinanced ? 'new' : 'orig'}-${e.num}-${e.dueDay}`;
            const isFirstRefinanced = isRefinanced && e.fromRefinanced && (i === 0 || !statuses[i - 1].fromRefinanced);
            // Pay button visibility: original plan EMIs only payable when not refinanced;
            // refinanced EMIs payable when in refinanced schedule. Already paid / fromOriginal preserved EMIs hide button.
            const canPay = e.status !== 'paid' && !e.fromOriginal &&
              ((isRefinanced && e.fromRefinanced) || !isRefinanced);
            const isSoonOrLate = e.status === 'overdue' ||
                                 (e.status === 'upcoming' && (e.dueDay - simDay) <= 7);
            const dpd = Math.max(0, simDay - e.dueDay);
            const penalty = computeLatePenalty(e.amount, dpd);
            return (
              <React.Fragment key={key}>
                {isFirstRefinanced && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 0', fontSize: 11, color: 'var(--mal-primary)',
                    fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.06em',
                  }}>
                    <span style={{ flex: 1, height: 1, background: 'var(--mal-primary-50)' }}/>
                    <span>{isAr ? 'الجدول الجديد' : 'New schedule'}</span>
                    <span style={{ flex: 1, height: 1, background: 'var(--mal-primary-50)' }}/>
                  </div>
                )}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px', borderRadius: 12,
                  background: e.status === 'overdue' ? 'var(--mal-danger-bg)'
                            : e.status === 'paid' ? 'var(--mal-success-bg)'
                            : 'var(--mal-surface-2)',
                  border: e.status === 'upcoming' && nextUpcoming && nextUpcoming.num === e.num && (e.fromRefinanced || !isRefinanced)
                    ? '1.5px solid var(--mal-primary)' : 'none',
                  opacity: e.fromOriginal ? 0.85 : 1,
                  flexWrap: 'wrap',
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
                  <div style={{ flex: 1, minWidth: 100 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{groupLabel}</span>
                      {e.settledByExtension && (
                        <Pill tone="info" dot>{isAr ? 'سُدِّد عبر التمديد' : 'Settled by Mal · extension'}</Pill>
                      )}
                      {e.status === 'paid' && !e.settledByExtension && e.paidDay < e.dueDay && (
                        <Pill tone="success" dot>{isAr ? 'مبكّر' : 'Early'}</Pill>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--mal-mid)' }}>
                      {e.status === 'paid'
                        ? (isAr ? `دُفع · ${formatSimDay(e.paidDay)}` : `Paid · ${formatSimDay(e.paidDay)}`) + (e.penalty ? ' (+' + e.penalty + ')' : '')
                        : e.status === 'overdue'
                        ? (isAr ? `متأخّر بـ ${e.daysOverdue} يوم` : `${e.daysOverdue}d overdue · stage ${e.stage}`)
                        : (isAr ? `يستحق ${formatSimDay(e.dueDay)}` : `Due ${formatSimDay(e.dueDay)}`)}
                    </div>
                  </div>
                  <span className="mal-num" style={{ fontSize: 13, fontWeight: 500 }}>
                    AED {e.amount.toLocaleString()}
                  </span>
                  {/* Pay button. Visible only when actionable */}
                  {canPay && isSoonOrLate && (
                    <button onClick={() => payEmiPlan(e.num, e.dueDay, e.amount)} style={{
                      all: 'unset', cursor: 'pointer',
                      padding: '6px 12px', borderRadius: 999,
                      background: e.status === 'overdue' ? 'var(--mal-danger)' : 'var(--mal-ink)',
                      color: '#FAF7EE', fontSize: 11, fontWeight: 600, letterSpacing: '.02em',
                    }}>
                      {e.status === 'overdue'
                        ? (isAr ? `ادفع +${penalty}` : `Pay + ${penalty}`)
                        : (isAr ? 'ادفع الآن' : 'Pay early')}
                    </button>
                  )}
                </div>
              </React.Fragment>
            );
          })}
        </div>

        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--mal-mid)' }}>
          <span>{isAr ? 'مدفوع' : 'Paid'}: AED {planTotalPaidAmount.toLocaleString()}</span>
          <span>{isAr ? 'متبقّي' : 'Remaining'}: AED {Math.max(0, plan.principal - planTotalPaidAmount).toLocaleString()}</span>
        </div>
      </Card>

      {/* Loan-action CTAs. Sit right under the active-plan card so the buyer
          sees Extend / Reschedule options near the loan, not buried at bottom. */}
      {(showExtendCta || showRefinanceCta) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {showExtendCta && (
            <button onClick={() => setBuyerRoute('extend-hero')} style={{
              all: 'unset', cursor: 'pointer',
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
                  {isAr ? 'قرض جديد على فاتورة جديدة · UAE Pass' : 'New unsecured loan · UAE Pass'}
                </div>
              </div>
              {dmIco.arrow ? dmIco.arrow({ color: '#fff' }) : '→'}
            </button>
          )}
          {showRefinanceCta && (
            <button onClick={() => setBuyerRoute('refinance-hero')} style={{
              all: 'unset', cursor: 'pointer',
              padding: '14px 16px', borderRadius: 14,
              background: 'var(--mal-paper)',
              border: '1.5px solid var(--mal-primary)',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'var(--mal-primary-50)', color: 'var(--mal-primary)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                {dmIco.refresh ? dmIco.refresh({ width: 18, height: 18 }) : '↻'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--mal-primary)' }}>
                  {isAr ? 'حوّل الرصيد المتبقّي إلى أقساط أطول' : 'Convert remaining to longer EMI'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--mal-mid)', marginTop: 2 }}>
                  {isAr
                    ? 'قسّط ما تبقّى على ٣ · ٦ · ٩ · ١٢ شهور · رسم ١٫٥٪'
                    : 'Reschedule the balance over 3 · 6 · 9 · 12 mo · 1.5% fee'}
                </div>
              </div>
              {dmIco.arrow ? dmIco.arrow({ color: 'var(--mal-primary)' }) : '→'}
            </button>
          )}
        </div>
      )}

      {/* Extension card. Full EMI ladder with Pay buttons */}
      {termExtension && (() => {
        const banner = extOverdue ? collectionsBanner(extOverdue.stage, extOverdue.daysOverdue, isAr) : null;
        return (
          <Card padded style={{
            background: 'linear-gradient(180deg, var(--mal-paper) 0%, var(--mal-primary-50) 100%)',
            borderColor: 'var(--mal-primary-3)', borderWidth: 1,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div className="mal-caption" style={{ color: 'var(--mal-primary)' }}>
                {isAr ? 'قرض تمديد · نشط' : 'Term extension · active'} · {scenario.invoice.id}
              </div>
              {!extIsClosed && extNextUpcoming && (
                <span style={{ fontSize: 11, color: 'var(--mal-mid)' }}>
                  {isAr ? 'القسط التالي' : 'Next'} {relativeDayLabel(simDay, extNextUpcoming.dueDay, isAr)}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'var(--mal-font-display)', fontSize: 24, fontStyle: 'italic' }}>
                {termExtension.label}
              </span>
              <Pill tone={extIsClosed ? 'success' : (extOverdue ? 'danger' : 'info')} dot>
                {extIsClosed ? (isAr ? 'مُغلق' : 'Closed')
                  : extOverdue ? (isAr ? 'متأخّر' : 'Overdue')
                  : (isAr ? 'في الوقت' : 'On track')}
              </Pill>
              <span style={{ fontSize: 11, color: 'var(--mal-mid)', marginLeft: 'auto' }}>
                {termExtension.aprPct}% APR
              </span>
            </div>

            {extOverdue && banner && (
              <div style={{
                padding: '8px 12px', borderRadius: 10, marginBottom: 10,
                background: banner.tone === 'danger' ? 'var(--mal-danger-bg)' : 'var(--mal-warn-bg)',
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: banner.tone === 'danger' ? 'var(--mal-danger)' : 'var(--mal-warn)' }}>
                  {banner.title}
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--mal-ink)', marginTop: 2 }}>{banner.sub}</div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {extStatuses.map((e) => {
                const dpd = Math.max(0, simDay - e.dueDay);
                const penalty = computeLatePenalty(e.amount, dpd);
                const canPay = e.status !== 'paid';
                const isSoonOrLate = e.status === 'overdue' || (e.status === 'upcoming' && (e.dueDay - simDay) <= 7);
                return (
                  <div key={`ext-${e.num}-${e.dueDay}`} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 12px', borderRadius: 12,
                    background: e.status === 'overdue' ? 'var(--mal-danger-bg)'
                              : e.status === 'paid' ? 'var(--mal-success-bg)'
                              : 'var(--mal-paper)',
                    border: e.status === 'upcoming' && extNextUpcoming && extNextUpcoming.num === e.num
                      ? '1.5px solid var(--mal-primary)' : '1px solid var(--mal-line-2)',
                    flexWrap: 'wrap',
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
                    <div style={{ flex: 1, minWidth: 100 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13, fontWeight: 500 }}>
                          {isAr ? `قسط التمديد ${e.num} من ${extTotalCount}` : `Extension EMI ${e.num} of ${extTotalCount}`}
                        </span>
                        {e.status === 'paid' && e.paidDay < e.dueDay && (
                          <Pill tone="success" dot>{isAr ? 'مبكّر' : 'Early'}</Pill>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--mal-mid)' }}>
                        {e.status === 'paid'
                          ? (isAr ? `دُفع · ${formatSimDay(e.paidDay)}` : `Paid · ${formatSimDay(e.paidDay)}`) + (e.penalty ? ' (+' + e.penalty + ')' : '')
                          : e.status === 'overdue'
                          ? (isAr ? `متأخّر بـ ${e.daysOverdue} يوم` : `${e.daysOverdue}d overdue · stage ${e.stage}`)
                          : (isAr ? `يستحق ${formatSimDay(e.dueDay)}` : `Due ${formatSimDay(e.dueDay)}`)}
                      </div>
                    </div>
                    <span className="mal-num" style={{ fontSize: 13, fontWeight: 500 }}>
                      AED {e.amount.toLocaleString()}
                    </span>
                    {canPay && isSoonOrLate && (
                      <button onClick={() => payEmi(e.num, e.dueDay, e.amount, 'extension')} style={{
                        all: 'unset', cursor: 'pointer',
                        padding: '6px 12px', borderRadius: 999,
                        background: e.status === 'overdue' ? 'var(--mal-danger)' : 'var(--mal-ink)',
                        color: '#FAF7EE', fontSize: 11, fontWeight: 600, letterSpacing: '.02em',
                      }}>
                        {e.status === 'overdue'
                          ? (isAr ? `ادفع +${penalty}` : `Pay + ${penalty}`)
                          : (isAr ? 'ادفع الآن' : 'Pay early')}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--mal-mid)' }}>
              <span>{isAr ? 'مدفوع' : 'Paid'}: AED {extPaidAmount.toLocaleString()}</span>
              <span>{isAr ? 'متبقّي' : 'Remaining'}: AED {Math.max(0, termExtension.principal - extPaidAmount).toLocaleString()}</span>
            </div>

            {!extIsClosed && (
              <button onClick={() => setBuyerRoute('extend-settle')} style={{
                all: 'unset', cursor: 'pointer',
                marginTop: 10,
                padding: '8px 12px', borderRadius: 10,
                background: 'var(--mal-paper)', border: '1px solid var(--mal-line)',
                fontSize: 12, fontWeight: 500, color: 'var(--mal-primary)',
                display: 'inline-flex', alignItems: 'center', gap: 6,
                transition: 'transform .15s, border-color .15s',
              }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--mal-primary-3)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--mal-line)'; e.currentTarget.style.transform = ''; }}>
                {isAr ? 'سدّد المتبقّي مبكراً' : 'Settle remaining early'} →
              </button>
            )}
          </Card>
        );
      })()}

      {/* Notification preference centre. Channel + language picker, with timeline preview */}
      {!allClosed && (
        <NotifPrefsCard
          isAr={isAr}
          prefs={scenario.notifPrefs || { channels: ['WhatsApp', 'SMS', 'In-app'], language: isAr ? 'ar' : 'en' }}
          onChange={(prefs) => patch({ notifPrefs: prefs })}
        />
      )}

      {/* Bundle / Consolidate CTA. Show when ≥ 2 active obligations and not bundled. */}
      {!scenario.bundledPlan && activeLoanCount >= 2 && (
        <BundleConsolidateCard
          isAr={isAr}
          activeLoanCount={activeLoanCount}
          totalOutstanding={usedAmount}
          onBundle={(tenorMonths, aprPct, emiAmount) => {
            // Settle every unpaid EMI of every obligation under "settledByBundle".
            const newPaymentsByEmi = { ...paymentsByEmi };
            (plan?.schedule || []).forEach((emi) => {
              if (!newPaymentsByEmi[emi.num]) {
                newPaymentsByEmi[emi.num] = { paidOnDay: simDay, withPenalty: 0, settledByBundle: true };
              }
            });
            const newExtensionPaymentsByEmi = { ...extensionPaymentsByEmi };
            (termExtension?.schedule || []).forEach((emi) => {
              if (!newExtensionPaymentsByEmi[emi.num]) {
                newExtensionPaymentsByEmi[emi.num] = { paidOnDay: simDay, withPenalty: 0, settledByBundle: true };
              }
            });
            const newBg = backgroundLoans.map((l) => {
              const next = { ...l.paymentsByEmi };
              l.plan.schedule.forEach((emi) => {
                if (!next[emi.num]) {
                  next[emi.num] = { paidOnDay: simDay, withPenalty: 0, settledByBundle: true };
                }
              });
              return { ...l, paymentsByEmi: next };
            });
            // Build the new consolidated schedule.
            const principal = usedAmount;
            const monthly = emiAmount;
            const schedule = Array.from({ length: tenorMonths }, (_, i) => ({
              num: i + 1,
              dueDay: simDay + 30 * (i + 1),
              amount: monthly,
            }));
            patch({
              paymentsByEmi: newPaymentsByEmi,
              extensionPaymentsByEmi: newExtensionPaymentsByEmi,
              backgroundLoans: newBg,
              bundledPlan: {
                principal,
                tenorMonths,
                aprPct,
                emiAmount: monthly,
                startDay: simDay,
                schedule,
                signedAt: new Date().toISOString(),
              },
              buyerToast: {
                title: isAr ? 'تم التوحيد · خطة واحدة' : 'Bundled · one plan, one date',
                sub: isAr
                  ? `${activeLoanCount} فاتورة → خطة ${tenorMonths} أشهر`
                  : `${activeLoanCount} invoices → ${tenorMonths}-mo single EMI`,
                icon: 'check', tone: 'success',
              },
              lastAction: { id: 'bundle-signed', day: simDay, extra: { tenor: tenorMonths, count: activeLoanCount } },
            });
          }}
          onOpen={() => patch({ lastAction: { id: 'bundle-opened', day: simDay, extra: { count: activeLoanCount, total: usedAmount } } })}
        />
      )}

      {/* Bundled plan card. Replaces individual plans when consolidation is signed. */}
      {scenario.bundledPlan && (
        <BundledPlanCard
          isAr={isAr}
          bundled={scenario.bundledPlan}
          simDay={simDay}
          payments={scenario.bundledPaymentsByEmi || {}}
          onPay={(emiNum, dueDay, amount) => {
            const dpd = Math.max(0, simDay - dueDay);
            const penalty = computeLatePenalty(amount, dpd);
            patch({
              bundledPaymentsByEmi: {
                ...(scenario.bundledPaymentsByEmi || {}),
                [emiNum]: { paidOnDay: simDay, withPenalty: penalty },
              },
              buyerToast: {
                title: isAr ? `قسط الباقة ${emiNum} مدفوع` : `Bundle EMI ${emiNum} paid`,
                sub: `AED ${(amount + penalty).toLocaleString()}`,
                icon: 'check', tone: 'success',
              },
            });
          }}
        />
      )}

      {/* Background loans. Concurrent loans for invoices from other suppliers */}
      {!scenario.bundledPlan && bgLoanSummaries.map(({ idx, loan, bgStatuses, bgPaidCount, bgTotalCount, bgIsClosed, bgPaidAmount, bgRemainingForLimit }) => {
        const bgOverdue = findOverdue(bgStatuses);
        const bgNext = findNextUpcoming(bgStatuses);
        const bgBanner = bgOverdue ? collectionsBanner(bgOverdue.stage, bgOverdue.daysOverdue, isAr) : null;
        return (
          <Card key={loan.id} padded>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div className="mal-caption">
                {loan.supplier} · {loan.invoiceId}
              </div>
              {!bgIsClosed && bgNext && (
                <span style={{ fontSize: 11, color: 'var(--mal-mid)' }}>
                  {isAr ? 'القسط التالي' : 'Next'} {relativeDayLabel(simDay, bgNext.dueDay, isAr)}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'var(--mal-font-display)', fontSize: 22, fontStyle: 'italic' }}>
                {loan.plan.label}
              </span>
              <Pill tone={bgIsClosed ? 'success' : (bgOverdue ? 'danger' : 'info')} dot>
                {bgIsClosed ? (isAr ? 'مُغلق' : 'Closed')
                  : bgOverdue ? (isAr ? 'متأخّر' : 'Overdue')
                  : (isAr ? 'في الوقت' : 'On track')}
              </Pill>
              <span style={{ fontSize: 11, color: 'var(--mal-mid-2)', marginLeft: 'auto' }}>
                {isAr ? 'منذ' : 'Issued'} {Math.abs(loan.issuedDay)}{isAr ? ' يوم' : 'd ago'}
              </span>
            </div>

            {bgOverdue && bgBanner && (
              <div style={{
                padding: '8px 12px', borderRadius: 10, marginBottom: 10,
                background: bgBanner.tone === 'danger' ? 'var(--mal-danger-bg)' : 'var(--mal-warn-bg)',
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: bgBanner.tone === 'danger' ? 'var(--mal-danger)' : 'var(--mal-warn)' }}>
                  {bgBanner.title}
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--mal-ink)', marginTop: 2 }}>{bgBanner.sub}</div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {bgStatuses.map((e) => {
                const dpd = Math.max(0, simDay - e.dueDay);
                const penalty = computeLatePenalty(e.amount, dpd);
                const canPay = e.status !== 'paid';
                const isSoonOrLate = e.status === 'overdue' || (e.status === 'upcoming' && (e.dueDay - simDay) <= 7);
                return (
                  <div key={`bg-${loan.id}-${e.num}`} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 12px', borderRadius: 12,
                    background: e.status === 'overdue' ? 'var(--mal-danger-bg)'
                              : e.status === 'paid' ? 'var(--mal-success-bg)'
                              : 'var(--mal-surface-2)',
                    border: e.status === 'upcoming' && bgNext && bgNext.num === e.num
                      ? '1.5px solid var(--mal-primary)' : 'none',
                    flexWrap: 'wrap',
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
                    <div style={{ flex: 1, minWidth: 100 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13, fontWeight: 500 }}>
                          {isAr ? `قسط ${e.num} من ${bgTotalCount}` : `EMI ${e.num} of ${bgTotalCount}`}
                        </span>
                        {e.status === 'paid' && e.paidDay < e.dueDay && (
                          <Pill tone="success" dot>{isAr ? 'مبكّر' : 'Early'}</Pill>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--mal-mid)' }}>
                        {e.status === 'paid'
                          ? (isAr ? `دُفع · ${formatSimDay(e.paidDay)}` : `Paid · ${formatSimDay(e.paidDay)}`) + (e.penalty ? ' (+' + e.penalty + ')' : '')
                          : e.status === 'overdue'
                          ? (isAr ? `متأخّر بـ ${e.daysOverdue} يوم` : `${e.daysOverdue}d overdue · stage ${e.stage}`)
                          : (isAr ? `يستحق ${formatSimDay(e.dueDay)}` : `Due ${formatSimDay(e.dueDay)}`)}
                      </div>
                    </div>
                    <span className="mal-num" style={{ fontSize: 13, fontWeight: 500 }}>
                      AED {e.amount.toLocaleString()}
                    </span>
                    {canPay && isSoonOrLate && (
                      <button onClick={() => payBgEmi(idx, e.num, e.dueDay, e.amount)} style={{
                        all: 'unset', cursor: 'pointer',
                        padding: '6px 12px', borderRadius: 999,
                        background: e.status === 'overdue' ? 'var(--mal-danger)' : 'var(--mal-ink)',
                        color: '#FAF7EE', fontSize: 11, fontWeight: 600, letterSpacing: '.02em',
                      }}>
                        {e.status === 'overdue'
                          ? (isAr ? `ادفع +${penalty}` : `Pay + ${penalty}`)
                          : (isAr ? 'ادفع الآن' : 'Pay early')}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--mal-mid)' }}>
              <span>{isAr ? 'مدفوع' : 'Paid'}: AED {bgPaidAmount.toLocaleString()}</span>
              <span>{isAr ? 'متبقّي' : 'Remaining'}: AED {Math.max(0, loan.plan.principal - bgPaidAmount).toLocaleString()}</span>
            </div>
          </Card>
        );
      })}

      {/* Trust dashboard. Sits at the very bottom of the home so it
          doesn't interrupt the loan schedule above. */}
      <TrustBadgesRow isAr={isAr}/>
    </div>
  );
}

// Buyer's confirm screen (UAE Pass signature) used after picking a plan.
// Reads the actual selected plan; works for any of the 5 presets.
function DemoBuyerConfirm({ lang, scenario, patch }) {
  const isAr = lang === 'ar';
  const [signing, setSigning] = dmS(false);
  const plan = scenario.plan || DEFAULT_PLAN;
  dmE(() => {
    if (signing) {
      const t = setTimeout(() => {
        patch({ signed: true, signing: false, buyerRoute: 'home' });
        setSigning(false);
      }, 1300);
      return () => clearTimeout(t);
    }
  }, [signing]);
  const isInstallment = plan.schedule.length > 1;
  const feePct = plan.principal > 0 ? ((plan.totalCost / plan.principal) * 100).toFixed(1) : '0';
  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="mal-display-sm" style={{ fontStyle: 'italic' }}>{isAr ? 'تأكيد التوقيع' : 'Confirm to sign'}</div>
      <Card padded style={{ background: 'linear-gradient(135deg, #2A1F6F 0%, #5B3FB2 100%)', color: '#fff', border: 'none', position: 'relative', overflow: 'hidden' }}>
        <div className="mal-orb" style={{ position: 'absolute', width: 140, height: 140, top: -40, insetInlineEnd: -40, opacity: .45 }}/>
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 11, opacity: .7, textTransform: 'uppercase', letterSpacing: '.06em' }}>
            {isAr ? 'فاتورة' : 'Invoice'} {scenario.invoice.id}
          </div>
          <div className="mal-num" style={{ fontFamily: 'var(--mal-font-display)', fontSize: 36, marginTop: 6, fontStyle: 'italic' }}>
            AED {plan.principal.toLocaleString()}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, fontSize: 12, opacity: .9 }}>
            <span>{plan.label} · {feePct}% fee</span>
            <span className="mal-num">
              AED {plan.emiAmount.toLocaleString()}{isInstallment ? (isAr ? ' / شهر' : ' / mo') : ''}
            </span>
          </div>
        </div>
      </Card>
      <Card padded>
        {[
          [isAr ? 'إلى مورّد' : 'Paid to',           'Atlas Packaging FZ'],
          [isAr ? 'الخصم' : 'Auto-debit',            'ENBD ****4291'],
          [isAr ? 'القسط الأوّل' : 'First due',      formatSimDay(plan.schedule[0].dueDay)],
          [isAr ? 'القسط الأخير' : 'Last due',       formatSimDay(plan.schedule[plan.schedule.length - 1].dueDay)],
          [isAr ? 'إجمالي التكلفة' : 'Total cost',   plan.totalCost ? `AED ${plan.totalCost.toLocaleString()}` : (isAr ? 'مجّاناً' : 'Free')],
        ].map(([k, v], i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: i ? '1px solid var(--mal-line-2)' : 'none', fontSize: 13 }}>
            <span style={{ color: 'var(--mal-mid)' }}>{k}</span>
            <span style={{ fontWeight: 500 }}>{v}</span>
          </div>
        ))}
      </Card>
      <Button kind="primary" size="lg" full onClick={() => setSigning(true)}
              icon={signing ? 'check' : 'lock'}>
        {signing ? (isAr ? 'جارٍ التوقيع…' : 'Signing…') : (isAr ? 'وقّع بهوية رقمية' : 'Sign with UAE Pass')}
      </Button>
    </div>
  );
}

function DemoBuyerLoanDetail({ lang, scenario, setBuyerRoute }) {
  const isAr = lang === 'ar';
  const { plan } = scenario;
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
            {plan.tenorMonths}{isAr ? ' شهر' : ' mo'} · AED {plan.emiAmount.toLocaleString()}/{isAr ? 'شهر' : 'mo'}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ==================================================================
// 13. Refinance flow
// ==================================================================

function DemoRefinanceHero({ lang, scenario, setBuyerRoute }) {
  const isAr = lang === 'ar';
  const remaining = computeRemainingPrincipal(scenario.plan, scenario.simDay, scenario.paymentsByEmi);
  return (
    <div>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--mal-line)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => setBuyerRoute('home')} style={{ all: 'unset', cursor: 'pointer' }}>
          {dmIco.arrowL ? dmIco.arrowL({ width: 18, height: 18 }) : '←'}
        </button>
        <span style={{ fontSize: 13, fontWeight: 500 }}>{isAr ? 'إعادة جدولة' : 'Refinance loan'}</span>
      </div>
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Card padded style={{ background: 'linear-gradient(135deg, #2A1F6F 0%, #5B3FB2 60%, #1F5BAA 100%)', color: '#fff', border: 'none', position: 'relative', overflow: 'hidden' }}>
          <div className="mal-orb" style={{ position: 'absolute', width: 200, height: 200, top: -80, insetInlineEnd: -80, opacity: .35, animation: 'mal-orb-spin 14s linear infinite' }}/>
          <div style={{ position: 'relative' }}>
            <div style={{ fontSize: 11, opacity: .8, textTransform: 'uppercase', letterSpacing: '.08em' }}>
              {isAr ? 'بحاجة إلى متّسع؟' : 'Need breathing room?'}
            </div>
            <div style={{ fontFamily: 'var(--mal-font-display)', fontSize: 32, fontStyle: 'italic', lineHeight: 1.05, marginTop: 8 }}>
              {isAr ? 'حوّل ما تبقّى' : 'Reschedule what\'s left'}
            </div>
            <div style={{ fontSize: 12, opacity: .85, marginTop: 8, lineHeight: 1.5 }}>
              {isAr
                ? 'الرصيد الحالي: AED ' + remaining.toLocaleString() + '، وزّعه على ٣ إلى ١٢ شهر بقسط أصغر.'
                : `Outstanding: AED ${remaining.toLocaleString()}. Spread it over 3 to 12 months with a smaller EMI.`}
            </div>
          </div>
        </Card>
        <Card padded style={{ background: 'var(--mal-info-bg)', borderColor: 'var(--mal-info)', borderWidth: 1 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            {dmIco.info ? dmIco.info({ width: 16, height: 16, color: 'var(--mal-info)' }) : 'ℹ'}
            <div style={{ fontSize: 11.5, color: 'var(--mal-ink)', lineHeight: 1.5 }}>
              {isAr
                ? 'ليست تعثّراً. AECB يُسجّل الجدولة الجديدة كعلامة ناعمة فقط.'
                : 'Not a default. AECB records the new schedule as a soft notation only.'}
            </div>
          </div>
        </Card>
        <Button kind="primary" size="lg" full iconRight="arrow" onClick={() => setBuyerRoute('refinance-pick')}>
          {isAr ? 'اختر مدّة جديدة' : 'Pick a new tenor'}
        </Button>
      </div>
    </div>
  );
}

function DemoRefinancePicker({ lang, scenario, patch, setBuyerRoute }) {
  const isAr = lang === 'ar';
  const remaining = computeRemainingPrincipal(scenario.plan, scenario.simDay, scenario.paymentsByEmi);
  const [tenor, setTenor] = dmS(6);
  const newPlan = dmM(() => buildRefinancedPlan(scenario.plan, scenario.simDay, scenario.paymentsByEmi, tenor),
                     [scenario.plan, scenario.simDay, scenario.paymentsByEmi, tenor]);
  return (
    <div>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--mal-line)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => setBuyerRoute('refinance-hero')} style={{ all: 'unset', cursor: 'pointer' }}>
          {dmIco.arrowL ? dmIco.arrowL({ width: 18, height: 18 }) : '←'}
        </button>
        <span style={{ fontSize: 13, fontWeight: 500 }}>{isAr ? 'مدّة جديدة' : 'Choose tenor'}</span>
      </div>
      <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Card padded style={{ background: '#0B0B14', color: '#fff', border: 'none' }}>
          <div className="mal-caption" style={{ color: 'rgba(255,255,255,.7)' }}>{isAr ? 'الرصيد المتبقّي' : 'Outstanding'}</div>
          <div style={{ fontFamily: 'var(--mal-font-display)', fontSize: 32, fontStyle: 'italic', marginTop: 4 }}>
            AED {remaining.toLocaleString()}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 18, fontSize: 12 }}>
            <div>
              <div style={{ opacity: .65 }}>{isAr ? 'قسط جديد' : 'New EMI'}</div>
              <div className="mal-num" style={{ fontSize: 18, marginTop: 2 }}>AED {newPlan.emiAmount.toLocaleString()}</div>
            </div>
            <div style={{ textAlign: 'end' }}>
              <div style={{ opacity: .65 }}>{isAr ? 'إجمالي التكلفة' : 'Total cost'}</div>
              <div className="mal-num" style={{ fontSize: 18, marginTop: 2 }}>AED {newPlan.totalCost.toLocaleString()}</div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, opacity: .7 }}>
            <span>{newPlan.aprPct}% APR</span>
            <span>{tenor}{isAr ? ' شهر' : ' mo'} · {isAr ? 'رسم' : 'fee'} AED {newPlan.processingFee.toLocaleString()}</span>
          </div>
        </Card>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[3, 6, 9, 12].map((t) => {
            const sample = buildRefinancedPlan(scenario.plan, scenario.simDay, scenario.paymentsByEmi, t);
            const isPicked = tenor === t;
            return (
              <button key={t} onClick={() => setTenor(t)} style={{
                all: 'unset', cursor: 'pointer',
                padding: 14, borderRadius: 14,
                background: isPicked ? 'var(--mal-paper)' : 'var(--mal-surface-2)',
                border: '1.5px solid ' + (isPicked ? 'var(--mal-primary)' : 'transparent'),
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: 'var(--mal-font-display)', fontSize: 22, fontStyle: 'italic' }}>{t}{isAr ? ' شهر' : ' mo'}</span>
                  {t === 3 && <Pill tone="ink" dot>{isAr ? 'أقلّ تكلفة' : 'Best rate'}</Pill>}
                  {t === 12 && <Pill tone="info" dot>{isAr ? 'أصغر قسط' : 'Lowest EMI'}</Pill>}
                </div>
                <div className="mal-num" style={{ fontSize: 13, fontWeight: 500, marginTop: 8 }}>
                  AED {sample.emiAmount.toLocaleString()}/{isAr ? 'شهر' : 'mo'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--mal-mid)', marginTop: 2 }}>
                  {sample.aprPct}% APR
                </div>
              </button>
            );
          })}
        </div>
        <Button kind="primary" size="lg" full iconRight="arrow"
                onClick={() => { patch({ refinanceDraft: newPlan }); setBuyerRoute('refinance-confirm'); }}>
          {isAr ? 'متابعة' : 'Continue'}
        </Button>
      </div>
    </div>
  );
}

function DemoRefinanceConfirm({ lang, scenario, patch, setBuyerRoute }) {
  const isAr = lang === 'ar';
  const newPlan = scenario.refinanceDraft;
  const [signing, setSigning] = dmS(false);
  dmE(() => {
    if (signing && newPlan) {
      const t = setTimeout(() => {
        patch({
          plan: newPlan,
          refinancedPaymentsByEmi: {},
          refinanceDraft: null,
          buyerRoute: 'refinance-success',
          buyerToast: { title: 'Loan rescheduled', sub: `New EMI AED ${newPlan.emiAmount.toLocaleString()}/mo · ${newPlan.tenorMonths}-mo`, icon: 'check', tone: 'success' },
          supplierToast: { title: 'Buyer rescheduled their loan', sub: 'Cycle continues normally · your wire stays funded', icon: 'info', tone: 'iri' },
        });
        setSigning(false);
      }, 1400);
      return () => clearTimeout(t);
    }
  }, [signing]);
  if (!newPlan) {
    return (
      <div style={{ padding: 18 }}>
        <Card padded>{isAr ? 'لا توجد مسوّدة. ابدأ من الإعادة.' : 'No draft. Start over.'}</Card>
        <Button kind="ghost" onClick={() => setBuyerRoute('refinance-hero')}>{isAr ? 'العودة' : 'Back'}</Button>
      </div>
    );
  }
  return (
    <div>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--mal-line)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => setBuyerRoute('refinance-pick')} style={{ all: 'unset', cursor: 'pointer' }}>
          {dmIco.arrowL ? dmIco.arrowL({ width: 18, height: 18 }) : '←'}
        </button>
        <span style={{ fontSize: 13, fontWeight: 500 }}>{isAr ? 'تأكيد التوقيع' : 'Confirm to sign'}</span>
      </div>
      <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Card padded style={{ background: 'linear-gradient(135deg, #2A1F6F 0%, #1F5BAA 100%)', color: '#fff', border: 'none' }}>
          <div className="mal-caption" style={{ color: 'rgba(255,255,255,.7)' }}>{isAr ? 'إعادة جدولة' : 'Reschedule'}</div>
          <div style={{ fontFamily: 'var(--mal-font-display)', fontSize: 30, fontStyle: 'italic', marginTop: 4 }}>
            AED {newPlan.principal.toLocaleString()}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, fontSize: 12 }}>
            <span>{newPlan.tenorMonths}{isAr ? ' شهر' : ' mo'} · {newPlan.aprPct}% APR</span>
            <span className="mal-num">AED {newPlan.emiAmount.toLocaleString()} / {isAr ? 'شهر' : 'mo'}</span>
          </div>
        </Card>
        <Card padded>
          {[
            [isAr ? 'رسوم المعالجة' : 'Processing fee', `AED ${newPlan.processingFee.toLocaleString()}`],
            [isAr ? 'إجمالي التكلفة' : 'Total cost',    `AED ${newPlan.totalCost.toLocaleString()}`],
            [isAr ? 'القسط الأوّل'   : 'First EMI',     formatSimDay(newPlan.startDay)],
            [isAr ? 'القسط الأخير'   : 'Final EMI',     formatSimDay(newPlan.startDay + (newPlan.tenorMonths - 1) * 30)],
            [isAr ? 'تأثير AECB'     : 'AECB notation', isAr ? 'علم ناعم، ليس تعثّراً' : 'Soft flag، not a default'],
          ].map(([k, v], i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: i ? '1px solid var(--mal-line-2)' : 'none', fontSize: 13 }}>
              <span style={{ color: 'var(--mal-mid)' }}>{k}</span>
              <span style={{ fontWeight: 500 }}>{v}</span>
            </div>
          ))}
        </Card>
        <Button kind="primary" size="lg" full onClick={() => setSigning(true)}
                icon={signing ? 'check' : 'lock'}>
          {signing ? (isAr ? 'جارٍ التوقيع…' : 'Signing…') : (isAr ? 'وقّع لإعادة الجدولة' : 'Sign to reschedule')}
        </Button>
      </div>
    </div>
  );
}

function DemoRefinanceSuccess({ lang, scenario, setBuyerRoute }) {
  const isAr = lang === 'ar';
  const plan = scenario.plan;
  return (
    <div style={{ padding: 24, minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, textAlign: 'center' }}>
      <div className="mal-orb" style={{ width: 100, height: 100, animation: 'mal-orb-spin 8s linear infinite' }}/>
      <div className="mal-display-md mal-iri-text" style={{ fontStyle: 'italic' }}>
        {isAr ? 'تمّت إعادة الجدولة' : 'Rescheduled'}
      </div>
      <div style={{ color: 'var(--mal-mid)', fontSize: 13, maxWidth: 280, lineHeight: 1.5 }}>
        {isAr
          ? `قسطك الجديد AED ${plan.emiAmount.toLocaleString()} / شهر يبدأ في ${formatSimDay(plan.startDay)}.`
          : `Your new EMI is AED ${plan.emiAmount.toLocaleString()} / mo, starting ${formatSimDay(plan.startDay)}.`}
      </div>
      <Button kind="primary" onClick={() => setBuyerRoute('home')}>{isAr ? 'عرض الجدول' : 'View schedule'}</Button>
    </div>
  );
}

// ==================================================================
// 14. SUPPLIER side
// ==================================================================

function SupplierSurface({ phase, setPhase, scenario, patch, lang }) {
  if (phase === 'intro') return <DemoIntroSupplier lang={lang} onProceed={() => setPhase('onboarding')}/>;
  if (phase === 'onboarding') {
    if (scenario.supplierOnboardingDone) {
      return <DemoOnboardingReady lang={lang} side="supplier" partnerDone={scenario.buyerOnboardingDone}/>;
    }
    return <SupplierOnboardingFlow lang={lang}
                                   controlledStep={scenario.supplierStep}
                                   onStepChange={(n) => patch({ supplierStep: n })}
                                   onDone={() => patch({ supplierOnboardingDone: true })}/>;
  }
  if (phase === 'home') return <DemoSupplierHome lang={lang} onIssue={() => setPhase('issue')}/>;
  if (phase === 'issue') return <DemoSupplierIssueInvoice lang={lang} scenario={scenario} patch={patch} onIssued={() => setPhase('receive')}/>;
  if (phase === 'receive' || phase === 'plan' || phase === 'sign') return <DemoSupplierAwaiting lang={lang} scenario={scenario}/>;
  if (phase === 'funded') return <DemoSupplierFunded lang={lang} scenario={scenario}/>;
  if (phase === 'live') return <DemoSupplierLive lang={lang} scenario={scenario} patch={patch}/>;
  return null;
}

function DemoIntroSupplier({ lang, onProceed }) {
  const isAr = lang === 'ar';
  return (
    <div style={{ height: '100%', minHeight: 720, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #FAF7EE 0%, #DCE8F8 60%, #FAF7EE 100%)' }}/>
      <div style={{ position: 'absolute', top: 60, insetInlineEnd: -60, width: 280, height: 280, opacity: .55 }}>
        <div className="mal-orb" style={{ width: '100%', height: '100%', animation: 'mal-orb-spin 26s linear infinite' }}/>
      </div>
      <div style={{ flex: 1, padding: 30, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', position: 'relative', zIndex: 1 }}>
        <MalLogo size={22}/>
        <h1 className="mal-display" style={{ fontSize: 42, fontStyle: 'italic', lineHeight: 1, marginTop: 28, marginBottom: 12 }}>
          {isAr ? <>اقبض اليوم،<br/><span className="mal-iri-text">لا الشهر القادم.</span></> : <>Get paid today,<br/><span className="mal-iri-text">not next month.</span></>}
        </h1>
        <p style={{ fontSize: 13, color: 'var(--mal-mid)', maxWidth: 280, lineHeight: 1.5, marginBottom: 24 }}>
          {isAr ? 'أصدر فاتورة. اعتمدها مال. تحويل خلال ٤ ساعات.' : 'Issue an invoice. Mal funds it. Wire in 4 hours.'}
        </p>
        <Button kind="primary" size="lg" full iconRight="arrow" onClick={onProceed}>
          {isAr ? 'افتح حساباً' : 'Get started'}
        </Button>
        <div style={{ fontSize: 11, color: 'var(--mal-mid)', textAlign: 'center', marginTop: 14 }}>
          ADGM FSRA · UAE Pass · Peppol
        </div>
      </div>
    </div>
  );
}

function DemoSupplierHome({ lang, onIssue }) {
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
        <div style={{ fontSize: 12, color: 'var(--mal-mid)', marginTop: 4 }}>
          {isAr ? 'أصدر فاتورة لتبدأ' : 'Issue your first invoice to start'}
        </div>
      </Card>

      {/* Anchor pre-approved limits. Buyers Mal already cleared for this supplier */}
      <AnchorPreapprovedCard isAr={isAr}/>

      <Button kind="primary" size="lg" full icon="bolt" onClick={onIssue}>
        {isAr ? 'أصدر فاتورة جديدة' : 'Issue a new invoice'}
      </Button>
    </div>
  );
}

// Manual issue invoice. Pre-filled draft, click to issue + advance phase
function DemoSupplierIssueInvoice({ lang, scenario, patch, onIssued }) {
  const isAr = lang === 'ar';
  const issued = !!scenario.invoice.issuedAt;
  const draftBuyer = scenario.draftBuyer || 'Crescent Trading FZE';
  const draftAmount = scenario.draftAmount || '250,000';
  const draftDescription = scenario.draftDescription || 'Industrial packaging. Q4 2026';
  return (
    <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ fontFamily: 'var(--mal-font-display)', fontSize: 26, fontStyle: 'italic' }}>
        {isAr ? 'فاتورة جديدة' : 'New invoice'}
      </div>
      <Field label={isAr ? 'إلى مشترٍ' : 'Buyer'}>
        <div className="mal-input" style={{ paddingInline: 14, height: 44, display: 'flex', alignItems: 'center', background: 'var(--mal-paper)', fontFamily: 'var(--mal-font-mono)', fontSize: 13.5 }}>
          {draftBuyer}
        </div>
      </Field>
      <Field label={isAr ? 'القيمة (AED)' : 'Amount (AED)'}>
        <div className="mal-input" style={{ paddingInline: 14, height: 44, display: 'flex', alignItems: 'center', background: 'var(--mal-paper)', fontFamily: 'var(--mal-font-mono)', fontSize: 13.5 }}>
          {draftAmount}
        </div>
      </Field>
      <Field label={isAr ? 'الوصف' : 'Description'}>
        <div className="mal-input" style={{ paddingInline: 14, padding: '12px 14px', background: 'var(--mal-paper)', fontFamily: 'var(--mal-font-mono)', fontSize: 13.5 }}>
          {draftDescription}
        </div>
      </Field>
      <Card padded style={{ background: 'var(--mal-info-bg)', border: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          {dmIco.info ? dmIco.info({ width: 14, height: 14, color: 'var(--mal-info)' }) : 'ℹ'}
          <div style={{ fontSize: 11.5, color: 'var(--mal-ink)', lineHeight: 1.5 }}>
            {isAr
              ? 'بعد الإصدار: نُحوّل لك ٩٣٪ خلال ٤ ساعات (AED 232,500). الـ ٧٪ تبقى محتجزة (AED 17,500) وتُحرَّر فور سداد المشتري في يوم ٣٠.'
              : 'After issuing: we wire you 93% (AED 232,500) within 4 hours. The 7% holdback (AED 17,500) is released the moment the buyer settles on Day 30.'}
          </div>
        </div>
      </Card>
      <Button kind="primary" size="lg" full
              icon={issued ? 'check' : 'send'}
              onClick={() => {
                if (!issued) {
                  patch({
                    invoice: { ...scenario.invoice, issuedAt: new Date().toISOString() },
                    buyerToast: {
                      title: isAr ? 'فاتورة جديدة من أطلس' : 'New invoice from Atlas',
                      sub: `${scenario.invoice.id} · AED 250,000`, icon: 'invoice', tone: 'iri',
                    },
                  });
                  onIssued && onIssued();
                }
              }}
              style={{ background: issued ? 'var(--mal-success)' : undefined }}>
        {issued ? (isAr ? 'تمّ الإصدار' : 'Issued') : (isAr ? 'أصدر الفاتورة' : 'Issue invoice')}
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

// Live supplier panel. FACTORING view, not EMI tracker.
//
// Mental model: Atlas sold the AED 250K invoice to Mal at Day 0 in a
// non-recourse factoring deal. Atlas already received 93% (AED 232,500) on
// Day 0. The 7% (AED 17,500) holdback releases the moment buyer "settles"
// with Mal. Which here means buyer enrolled in any plan, since Mal then
// commits to absorb the buyer-side timing risk. If buyer never settles
// (no plan signed by the original due date + grace), the holdback is
// retained by Mal as the loss buffer; supplier keeps the 93%.
function DemoSupplierLive({ lang, scenario }) {
  const isAr = lang === 'ar';
  const { simDay, plan, signed, termExtension, bundledPlan } = scenario;
  const ADVANCE = 232500;          // 93% of 250K
  const HOLDBACK = 17500;          // 7% of 250K
  const TOTAL = ADVANCE + HOLDBACK;
  const DUE_DAY = 30;              // original invoice due date
  const GRACE_DAYS = 30;           // hold the holdback for 30d past due before forfeit

  // Settlement event: buyer entered ANY plan with Mal. Original plan, or
  // a term extension, or a bundled-consolidation plan. Any of these means
  // Mal has stepped into the receivable and the supplier-side risk is gone.
  const settled = !!((plan && signed) || termExtension || bundledPlan);

  // The buyer signed an extension or bundle: Mal has effectively paid off
  // the invoice on the buyer's behalf, so the holdback releases on the
  // signing day (not the original Day 30), giving the supplier cash earlier.
  const earlyReleaseSourceDay = termExtension?.startDay
    ?? bundledPlan?.startDay
    ?? null;
  const earlyReleaseSource = termExtension ? 'extension' : (bundledPlan ? 'bundle' : null);

  // Holdback status:
  //   pending    . Before due/release date, awaiting buyer settlement
  //   released   . Settled, holdback wired to supplier (released day depends on source)
  //   held       . Past due, buyer hasn't settled, within grace
  //   forfeit    . Past due + grace, supplier keeps the 93% only
  let holdbackStatus = 'pending';
  const releaseDay = earlyReleaseSourceDay != null
    ? Math.max(0, earlyReleaseSourceDay)        // released the day buyer signed extension/bundle
    : DUE_DAY;                                  // otherwise on the original due date
  if (settled && simDay >= releaseDay) holdbackStatus = 'released';
  else if (!settled && simDay > DUE_DAY && simDay <= DUE_DAY + GRACE_DAYS) holdbackStatus = 'held';
  else if (!settled && simDay > DUE_DAY + GRACE_DAYS) holdbackStatus = 'forfeit';

  const totalReceived = holdbackStatus === 'released' ? TOTAL : ADVANCE;

  return (
    <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Avatar name="MA" tone="sky" size={36}/>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>Atlas Packaging FZ</div>
          <div style={{ fontSize: 11,
                        color: holdbackStatus === 'released' ? 'var(--mal-success)'
                             : holdbackStatus === 'held' ? 'var(--mal-info)'
                             : holdbackStatus === 'forfeit' ? 'var(--mal-mid)' : 'var(--mal-mid)' }}>
            {holdbackStatus === 'released' ? (isAr ? 'فاتورة مُسدّدة بالكامل' : 'Invoice fully settled')
              : holdbackStatus === 'held' ? (isAr ? 'في انتظار تسوية المشتري' : 'Awaiting buyer settlement')
              : holdbackStatus === 'forfeit' ? (isAr ? 'انتهت مهلة الإحتجاز' : 'Holdback forfeit window passed')
              : (isAr ? 'مورّد · مفعّل' : 'Supplier · Active')}
          </div>
        </div>
      </div>

      {/* Big total received card. Animates 232,500 → 250,000 on holdback release */}
      <Card padded style={{
        background: holdbackStatus === 'released'
          ? 'linear-gradient(135deg, #1F7A4F 0%, #2A1F6F 100%)'
          : 'linear-gradient(135deg, #2A1F6F 0%, #1A1A28 100%)',
        color: '#fff', border: 'none', position: 'relative', overflow: 'hidden',
      }}>
        <div className="mal-orb" style={{ position: 'absolute', width: 200, height: 200, top: -90, insetInlineEnd: -90, opacity: .3 }}/>
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 11, opacity: .8, textTransform: 'uppercase', letterSpacing: '.06em' }}>
            {isAr ? 'استلمتَ من مال' : 'Received from Mal'}
          </div>
          <div key={totalReceived /* re-mount to retrigger snap */} style={{
            fontFamily: 'var(--mal-font-display)', fontSize: 38, fontStyle: 'italic', marginTop: 6,
            animation: 'mal-day-snap .4s cubic-bezier(.4,1.6,.4,1)',
          }}>
            AED {totalReceived.toLocaleString()}
          </div>
          <div style={{ fontSize: 12, opacity: .8, marginTop: 4 }}>
            {isAr ? 'فاتورة' : 'Invoice'} {scenario.invoice.id} · {isAr ? 'AED ٢٥٠٬٠٠٠ إجمالي' : 'AED 250,000 face value'}
          </div>
          <EInvoiceBadge isAr={isAr}/>
        </div>
      </Card>

      {/* Settlement breakdown. Day 0 advance + Day 30 holdback */}
      <Card padded>
        <div className="mal-caption" style={{ marginBottom: 12 }}>{isAr ? 'تفاصيل التسوية' : 'Settlement breakdown'}</div>

        {/* Day 0. Advance */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--mal-line-2)' }}>
          <div style={{
            width: 30, height: 30, borderRadius: 999,
            background: 'var(--mal-success)', color: '#fff',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            {dmIco.check ? dmIco.check({ width: 12, height: 12, color: '#fff' }) : '✓'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>
              {isAr ? 'سُلفة ٩٣٪' : '93% advance'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--mal-mid)' }}>
              {isAr ? `يوم ٠ · ${formatSimDay(0)}` : `Day 0 · ${formatSimDay(0)}`}
            </div>
          </div>
          <span className="mal-num" style={{ fontSize: 14, fontWeight: 500 }}>
            AED {ADVANCE.toLocaleString()}
          </span>
        </div>

        {/* Day 30. Holdback */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0' }}>
          <div style={{
            width: 30, height: 30, borderRadius: 999, flexShrink: 0,
            background: holdbackStatus === 'released' ? 'var(--mal-success)'
                      : holdbackStatus === 'forfeit' ? 'var(--mal-mid-2)'
                      : '#fff',
            color: holdbackStatus === 'released' ? '#fff'
                  : holdbackStatus === 'forfeit' ? '#fff'
                  : 'var(--mal-mid)',
            border: holdbackStatus === 'pending' || holdbackStatus === 'held' ? '1.5px solid var(--mal-line)' : 'none',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {holdbackStatus === 'released'
              ? (dmIco.check ? dmIco.check({ width: 12, height: 12, color: '#fff' }) : '✓')
              : holdbackStatus === 'forfeit'
              ? (dmIco.close ? dmIco.close({ width: 12, height: 12, color: '#fff' }) : '✕')
              : holdbackStatus === 'held'
              ? '!'
              : <div style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--mal-mid-2)' }}/>}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>
              {isAr ? 'احتجاز ٧٪' : '7% holdback'}
            </div>
            <div style={{ fontSize: 11,
                          color: holdbackStatus === 'released' ? 'var(--mal-success)'
                               : holdbackStatus === 'forfeit' ? 'var(--mal-mid)' : 'var(--mal-mid)' }}>
              {holdbackStatus === 'pending' && (isAr ? `يُحرَّر يوم ${DUE_DAY} · ${formatSimDay(DUE_DAY)}` : `Releases Day ${DUE_DAY} · ${formatSimDay(DUE_DAY)}`)}
              {holdbackStatus === 'released' && (
                earlyReleaseSource
                  ? (isAr
                      ? `حُرِّر مبكراً · يوم ${releaseDay} · ${earlyReleaseSource === 'extension' ? 'مدّد المشتري' : 'وحّد المشتري'}`
                      : `Released early · Day ${releaseDay} · buyer ${earlyReleaseSource === 'extension' ? 'extended' : 'bundled'}`)
                  : (isAr ? `حُرِّر · يوم ${DUE_DAY}` : `Released · Day ${DUE_DAY}`)
              )}
              {holdbackStatus === 'held' && (isAr ? `محجوز · لم يُسوِّ المشتري بعد` : `Held · buyer hasn't settled yet`)}
              {holdbackStatus === 'forfeit' && (isAr ? `محتفظ به من قِبَل مال (مصدّ خسارة)` : `Retained by Mal as loss buffer (non-recourse)`)}
            </div>
          </div>
          <span className="mal-num" style={{
            fontSize: 14, fontWeight: 500,
            color: holdbackStatus === 'forfeit' ? 'var(--mal-mid-2)' : 'var(--mal-ink)',
            textDecoration: holdbackStatus === 'forfeit' ? 'line-through' : 'none',
          }}>
            AED {HOLDBACK.toLocaleString()}
          </span>
        </div>
      </Card>

      {/* Status notice */}
      {holdbackStatus === 'released' && (
        <Card padded style={{ background: 'var(--mal-success-bg)', borderColor: 'var(--mal-success)', borderWidth: 1 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fff', color: 'var(--mal-success)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {dmIco.check ? dmIco.check({ width: 18, height: 18 }) : '✓'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--mal-success)' }}>
                {earlyReleaseSource
                  ? (isAr
                      ? `فاتورة مُسدّدة · ${earlyReleaseSource === 'extension' ? 'مدّد المشتري' : 'وحّد المشتري'} · تحرير مبكر`
                      : `Invoice settled · buyer ${earlyReleaseSource === 'extension' ? 'extended' : 'bundled'} · holdback released early`)
                  : (isAr ? 'فاتورة مُسدّدة بالكامل · تمّ تحرير الاحتجاز' : 'Invoice fully settled · holdback released')}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--mal-ink)', marginTop: 4, lineHeight: 1.5 }}>
                {earlyReleaseSource
                  ? (isAr
                      ? `وقّع المشتري ${earlyReleaseSource === 'extension' ? 'تمديد القرض' : 'باقة موحّدة'} مع مال يوم ${releaseDay}. مال يأخذ على عاتقه الفاتورة بالكامل ويحرّر الـ ٧٪ المتبقّية لك مبكراً، قبل تاريخ الاستحقاق الأصلي.`
                      : `Buyer signed a ${earlyReleaseSource === 'extension' ? 'term extension' : 'consolidation bundle'} with Mal on Day ${releaseDay}. Mal has stepped fully into the receivable and released your remaining 7% early. Before the original due date. You received AED ${TOTAL.toLocaleString()} in total.`)
                  : (isAr
                      ? `استلمتَ AED ${TOTAL.toLocaleString()} كاملاً. التزام المشتري للسداد يقع الآن مع مال، أيّ تأخّر هو مشكلة مال، ليس مشكلتك.`
                      : `You received AED ${TOTAL.toLocaleString()} in full. The buyer's payment commitment now sits with Mal. Any delay is Mal's problem, not yours.`)}
              </div>
            </div>
          </div>
        </Card>
      )}

      {holdbackStatus === 'held' && (
        <Card padded style={{ background: 'var(--mal-info-bg)', borderColor: 'var(--mal-info)', borderWidth: 1 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fff', color: 'var(--mal-info)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {dmIco.info ? dmIco.info({ width: 18, height: 18 }) : 'ℹ'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--mal-info)' }}>
                {isAr ? 'الاحتجاز محجوز · إعلاميّ فقط' : 'Holdback held · informational only'}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--mal-ink)', marginTop: 4, lineHeight: 1.5 }}>
                {isAr
                  ? `لم يُسوِّ المشتري الفاتورة في موعدها (يوم ${DUE_DAY}). مال يحتفظ بالـ ٧٪ كمصدّ. سُلفة ٩٣٪ التي حصلت عليها مضمونة، لا شيء عليك.`
                  : `Buyer hasn't settled by Day ${DUE_DAY}. Mal is holding the 7% as a buffer. The 93% advance you already received is yours. No claw-back, no action required.`}
              </div>
            </div>
          </div>
        </Card>
      )}

      {holdbackStatus === 'forfeit' && (
        <Card padded style={{ background: 'var(--mal-surface-2)', borderColor: 'var(--mal-line)', borderWidth: 1 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fff', color: 'var(--mal-mid)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {dmIco.shield ? dmIco.shield({ width: 18, height: 18 }) : '🛡'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--mal-ink)' }}>
                {isAr ? 'احتجاز محتفظ به من قِبَل مال' : 'Holdback retained by Mal'}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--mal-ink)', marginTop: 4, lineHeight: 1.5 }}>
                {isAr
                  ? `انتهت مهلة الإحتجاز (٣٠ يوم بعد موعد الاستحقاق). مال يحتفظ بالـ AED ${HOLDBACK.toLocaleString()} كمصدّ خسارة. أنت احتفظت بـ AED ${ADVANCE.toLocaleString()} كاملةً، هذا هو نموذج عدم الرجوع.`
                  : `Grace window passed (${GRACE_DAYS}d after due date). Mal absorbs the AED ${HOLDBACK.toLocaleString()} as the loss buffer. You keep your AED ${ADVANCE.toLocaleString()} in full. This is what non-recourse means.`}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Activity feed. Supplier-relevant only */}
      <Card padded>
        <div className="mal-caption" style={{ marginBottom: 8 }}>{isAr ? 'النشاط' : 'Activity'}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Always show: Day 0 wire */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 26, height: 26, borderRadius: 999,
              background: 'var(--mal-success-bg)', color: 'var(--mal-success)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              {dmIco.bank ? dmIco.bank({ width: 13, height: 13 }) : '$'}
            </div>
            <div style={{ flex: 1, fontSize: 12 }}>
              {isAr ? `تحويل سُلفة AED ${ADVANCE.toLocaleString()}` : `AED ${ADVANCE.toLocaleString()} advance wired`}
            </div>
            <span className="mal-mono" style={{ fontSize: 10, color: 'var(--mal-mid-2)' }}>Day 0</span>
          </div>
          {/* Day 30: settlement event */}
          {simDay >= DUE_DAY && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 26, height: 26, borderRadius: 999,
                background: settled ? 'var(--mal-success-bg)' : 'var(--mal-info-bg)',
                color: settled ? 'var(--mal-success)' : 'var(--mal-info)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                {dmIco[settled ? 'check' : 'info'] ? dmIco[settled ? 'check' : 'info']({ width: 13, height: 13 }) : '•'}
              </div>
              <div style={{ flex: 1, fontSize: 12 }}>
                {settled
                  ? (isAr ? `الاحتجاز AED ${HOLDBACK.toLocaleString()} مُحرَّر للمورّد` : `AED ${HOLDBACK.toLocaleString()} holdback released to supplier`)
                  : (isAr ? `موعد الاستحقاق · المشتري لم يُسوِّ` : `Invoice due · buyer hasn't settled`)}
              </div>
              <span className="mal-mono" style={{ fontSize: 10, color: 'var(--mal-mid-2)' }}>Day {DUE_DAY}</span>
            </div>
          )}
          {/* Day 60: forfeit event */}
          {holdbackStatus === 'forfeit' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 26, height: 26, borderRadius: 999,
                background: 'var(--mal-surface-2)', color: 'var(--mal-mid)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                {dmIco.shield ? dmIco.shield({ width: 13, height: 13 }) : '🛡'}
              </div>
              <div style={{ flex: 1, fontSize: 12 }}>
                {isAr ? 'انتهت مهلة الإحتجاز · مال احتفظ بالاحتجاز' : 'Grace expired · Mal retained the holdback'}
              </div>
              <span className="mal-mono" style={{ fontSize: 10, color: 'var(--mal-mid-2)' }}>Day {DUE_DAY + GRACE_DAYS}</span>
            </div>
          )}
        </div>
      </Card>
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

function DemoFooterHint({ phase, lang, simDay, plan }) {
  const isAr = lang === 'ar';
  return (
    <div style={{
      maxWidth: 280, marginInline: 'auto', textAlign: 'center',
      padding: '6px 10px', color: 'var(--mal-mid)', fontSize: 11, lineHeight: 1.5,
    }}>
      {phase === 'live' && (
        isAr
          ? '🎮 اسحب الدائرة لتحريك التاريخ. اضغط «ادفع» على القسط، أو تخطَّ ليوم لاحق لرؤية التعثّر.'
          : '🎮 Drag the dial to move the date. Click "Pay" on an EMI, or skip forward to see overdue stages emerge.'
      )}
      {phase !== 'live' && (
        isAr
          ? '🎮 اضغط على المراحل أعلاه للتنقّل. الدائرة تظهر عند «حيّ · يوميّاً».'
          : '🎮 Click any phase pill above to navigate. The dial appears at "Live · Day-by-day".'
      )}
    </div>
  );
}

// ============================================================
// BundleConsolidateCard. Appears when buyer has 2+ active obligations.
// Lets them merge all outstanding into a single 6-month EMI plan.
// ============================================================
function BundleConsolidateCard({ isAr, activeLoanCount, totalOutstanding, onBundle, onOpen }) {
  const [open, setOpen] = dmS(false);
  const [tenor, setTenor] = dmS(6);
  const tenors = [
    { mo: 3,  apr: 13.5 },
    { mo: 6,  apr: 14.5 },
    { mo: 9,  apr: 16.0 },
    { mo: 12, apr: 17.5 },
  ];
  const t = tenors.find((x) => x.mo === tenor) || tenors[1];
  // Simple monthly EMI math: principal * (1 + apr * months/12) / months
  const totalCost = Math.round(totalOutstanding * (t.apr / 100) * (t.mo / 12));
  const emiAmount = Math.round((totalOutstanding + totalCost) / t.mo);

  return (
    <div style={{
      padding: 16,
      borderRadius: 14,
      background: 'linear-gradient(135deg, var(--mal-primary-50), var(--mal-paper))',
      border: '1px solid var(--mal-primary-3)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: open ? 12 : 4 }}>
        <span style={{
          width: 32, height: 32, borderRadius: 999,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--mal-primary)', color: '#fff', fontSize: 14,
        }}>⊕</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: 'var(--mal-primary)', fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' }}>
            {isAr ? 'وحّد فواتيرك' : 'Bundle into one plan'}
          </div>
          <div style={{ fontSize: 13.5, color: 'var(--mal-ink)', marginTop: 2 }}>
            {isAr
              ? `لديك ${activeLoanCount} فواتير نشطة بإجمالي ${(totalOutstanding/1000).toFixed(0)} ألف د.إ. ادمجها في خطة واحدة بقسط واحد.`
              : `${activeLoanCount} active invoices totalling AED ${totalOutstanding.toLocaleString()}. Merge them into one plan, one due date.`}
          </div>
        </div>
        {!open && (
          <button onClick={() => { setOpen(true); onOpen && onOpen(); }} style={{
            all: 'unset', cursor: 'pointer',
            padding: '7px 14px', borderRadius: 999,
            background: 'var(--mal-primary)', color: '#fff',
            fontSize: 12, fontWeight: 600,
          }}>
            {isAr ? 'عرض الخيارات' : 'Show options →'}
          </button>
        )}
      </div>

      {open && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 12 }}>
            {tenors.map((opt) => {
              const active = opt.mo === tenor;
              return (
                <button key={opt.mo} onClick={() => setTenor(opt.mo)} style={{
                  all: 'unset', cursor: 'pointer',
                  textAlign: 'center', padding: '8px 4px', borderRadius: 10,
                  background: active ? 'var(--mal-primary)' : 'var(--mal-paper)',
                  color: active ? '#fff' : 'var(--mal-ink-2)',
                  border: '1px solid ' + (active ? 'var(--mal-primary)' : 'var(--mal-line)'),
                  transition: 'background .15s, color .15s',
                }}>
                  <div style={{
                    fontFamily: 'var(--mal-font-display)', fontStyle: 'italic',
                    fontSize: 16,
                  }}>{opt.mo}{isAr ? ' شهر' : ' mo'}</div>
                  <div style={{ fontSize: 10.5, opacity: 0.75, marginTop: 2 }}>
                    {opt.apr}% APR
                  </div>
                </button>
              );
            })}
          </div>

          <div style={{
            padding: '10px 12px', borderRadius: 10, marginBottom: 12,
            background: 'var(--mal-surface-2)',
            display: 'flex', justifyContent: 'space-between',
            fontSize: 12.5, color: 'var(--mal-ink)',
          }}>
            <span>{isAr ? 'القسط الجديد' : 'New EMI'}</span>
            <span style={{ fontWeight: 600, fontFamily: 'var(--mal-font-mono)' }}>
              AED {emiAmount.toLocaleString()} × {t.mo}
            </span>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setOpen(false)} style={{
              all: 'unset', cursor: 'pointer',
              padding: '8px 14px', borderRadius: 999,
              border: '1px solid var(--mal-line)',
              background: 'var(--mal-paper)', color: 'var(--mal-ink-2)',
              fontSize: 12, fontWeight: 500,
            }}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button onClick={() => onBundle(t.mo, t.apr, emiAmount)} style={{
              all: 'unset', cursor: 'pointer', flex: 1, textAlign: 'center',
              padding: '8px 14px', borderRadius: 999,
              background: 'var(--mal-primary)', color: '#fff',
              fontSize: 12.5, fontWeight: 600,
            }}>
              {isAr ? 'وحّد عبر UAE Pass' : 'Sign · UAE Pass · Bundle now'}
            </button>
          </div>
          <div style={{
            fontSize: 10.5, color: 'var(--mal-mid-2)', marginTop: 8,
            lineHeight: 1.5,
          }}>
            {isAr
              ? 'يدفع Mal جميع الموردين اليوم. أنت تدفع لـMal فقط، قسطاً واحداً، تاريخ استحقاق واحد. الخطط الأصلية تُغلق ويتم تسويتها بواسطة Mal.'
              : 'Mal settles every supplier today. You repay Mal only. One EMI, one due date. Original plans close and are marked settled by Mal.'}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// BundledPlanCard. Replaces individual loan cards once the bundle
// is signed. Single schedule, single Pay button per EMI.
// ============================================================
function BundledPlanCard({ isAr, bundled, simDay, payments, onPay }) {
  const total = bundled.schedule.length;
  const paidCount = bundled.schedule.filter((e) => payments[e.num]).length;
  const isClosed = paidCount === total;
  const next = bundled.schedule.find((e) => !payments[e.num] && simDay <= e.dueDay)
            || bundled.schedule.find((e) => !payments[e.num]);

  return (
    <Card padded>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{
          padding: '2px 8px', borderRadius: 999,
          background: 'rgba(90,58,163,0.10)', border: '1px solid rgba(90,58,163,0.32)',
          fontSize: 10.5, fontWeight: 700, color: 'var(--mal-primary)',
          letterSpacing: '.06em', textTransform: 'uppercase',
        }}>{isAr ? 'باقة موحّدة' : 'Bundled'}</span>
        <div className="mal-caption" style={{ marginLeft: 'auto' }}>
          {isAr ? `${total} قسط` : `${total} EMIs`}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
        <span style={{
          fontFamily: 'var(--mal-font-display)', fontSize: 22, fontStyle: 'italic',
        }}>
          {isAr ? `خطة موحّدة · ${bundled.tenorMonths} شهر` : `Bundled plan · ${bundled.tenorMonths} mo`}
        </span>
        <Pill tone={isClosed ? 'success' : 'info'} dot>
          {isClosed ? (isAr ? 'مُغلق' : 'Closed') : (isAr ? 'في الوقت' : 'On track')}
        </Pill>
      </div>
      <div style={{
        display: 'flex', gap: 10, fontSize: 12, color: 'var(--mal-mid)',
        marginBottom: 12,
      }}>
        <span>{isAr ? 'أصل' : 'Principal'} AED {bundled.principal.toLocaleString()}</span>
        <span>·</span>
        <span>APR {bundled.aprPct}%</span>
        <span>·</span>
        <span>{isAr ? 'القسط' : 'EMI'} AED {bundled.emiAmount.toLocaleString()}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {bundled.schedule.map((e) => {
          const paid = payments[e.num];
          const dpd = paid ? 0 : Math.max(0, simDay - e.dueDay);
          const status = paid ? 'paid' : (dpd > 0 ? 'overdue' : 'upcoming');
          const isNext = next && next.num === e.num;
          const isSoonOrLate = status === 'overdue' || (status === 'upcoming' && (e.dueDay - simDay) <= 7);
          return (
            <div key={e.num} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 12px', borderRadius: 12,
              background: status === 'overdue' ? 'var(--mal-danger-bg)'
                        : status === 'paid' ? 'var(--mal-success-bg)'
                        : 'var(--mal-surface-2)',
              border: isNext ? '1.5px solid var(--mal-primary)' : 'none',
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 999,
                background: status === 'paid' ? 'var(--mal-success)'
                          : status === 'overdue' ? 'var(--mal-danger)'
                          : '#fff',
                color: status === 'upcoming' ? 'var(--mal-mid)' : '#fff',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 600, flexShrink: 0,
                boxShadow: status === 'upcoming' ? 'inset 0 0 0 1px var(--mal-line)' : 'none',
              }}>{paid ? '✓' : status === 'overdue' ? '!' : e.num}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>
                  {isAr ? `قسط ${e.num} من ${total}` : `EMI ${e.num} of ${total}`}
                </div>
                <div style={{ fontSize: 11, color: 'var(--mal-mid)' }}>
                  {paid
                    ? (isAr ? `دُفع · ${formatSimDay(paid.paidOnDay)}` : `Paid · ${formatSimDay(paid.paidOnDay)}`)
                    : status === 'overdue'
                    ? (isAr ? `متأخّر بـ ${dpd} يوم` : `${dpd}d overdue`)
                    : (isAr ? `يستحق ${formatSimDay(e.dueDay)}` : `Due ${formatSimDay(e.dueDay)}`)}
                </div>
              </div>
              <span className="mal-num" style={{ fontSize: 13, fontWeight: 500 }}>
                AED {e.amount.toLocaleString()}
              </span>
              {!paid && isSoonOrLate && (
                <button onClick={() => onPay(e.num, e.dueDay, e.amount)} style={{
                  all: 'unset', cursor: 'pointer',
                  padding: '6px 12px', borderRadius: 999,
                  background: status === 'overdue' ? 'var(--mal-danger)' : 'var(--mal-ink)',
                  color: '#FAF7EE', fontSize: 11, fontWeight: 600,
                }}>
                  {isAr ? 'ادفع' : (status === 'overdue' ? 'Pay now' : 'Pay early')}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ============================================================
// AnchorPreapprovedCard. Surfaces buyers Mal has already pre-cleared
// for this supplier so the supplier can issue an invoice with zero
// underwriting friction. Shows up above "Issue invoice" CTA.
// ============================================================
function AnchorPreapprovedCard({ isAr }) {
  const buyers = [
    { name: 'Crescent Trading FZE',  limit: 850000, rating: 'A',  score: 'AECB 742', live: true },
    { name: 'Al Habtoor Group',      limit: 1200000, rating: 'A+', score: 'AECB 798' },
    { name: 'Lulu Hypermarket LLC',  limit: 950000, rating: 'A',  score: 'AECB 765' },
  ];
  return (
    <div style={{
      padding: 12, borderRadius: 12,
      background: 'linear-gradient(135deg, rgba(31,84,200,0.06), var(--mal-paper))',
      border: '1px solid rgba(31,84,200,0.30)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 12 }}>⭐</span>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: '#1f54c8',
            letterSpacing: '.06em', textTransform: 'uppercase',
          }}>
            {isAr ? 'مشترون مُعتمَدون مسبقاً' : 'Pre-approved buyers'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--mal-mid)', marginTop: 1 }}>
            {isAr ? 'تمويل فوري عند الإصدار · لا توجد فحوصات إضافية' : 'Instant funding on invoice · no buyer underwriting needed'}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {buyers.map((b, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 10px', borderRadius: 8,
            background: 'var(--mal-surface-2)',
            border: '1px solid var(--mal-line)',
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--mal-ink)' }}>
                {b.name}
                {b.live && (
                  <span style={{
                    fontSize: 9, fontWeight: 700, marginLeft: 6,
                    padding: '2px 6px', borderRadius: 999,
                    color: '#0a8056', background: 'rgba(10,128,86,0.14)',
                    letterSpacing: '.04em',
                  }}>
                    {isAr ? 'فاتورتك الحاليّة' : 'YOUR LIVE INVOICE'}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--mal-mid)', marginTop: 1 }}>
                {b.score} · {isAr ? 'تصنيف' : 'tier'} {b.rating}
              </div>
            </div>
            <div style={{ textAlign: 'end' }}>
              <div style={{
                fontSize: 11, color: 'var(--mal-mid)',
                fontFamily: 'var(--mal-font-mono)',
              }}>{isAr ? 'حتى' : 'up to'}</div>
              <div style={{
                fontSize: 12.5, fontWeight: 600, color: 'var(--mal-ink)',
                fontFamily: 'var(--mal-font-mono)',
              }}>AED {(b.limit / 1000).toFixed(0)}k</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// TrustBadgesRow. Compact regulator / bureau / Sharia / ISO row.
// Surfaces who oversees Mal so SME owners can verify in one glance.
// ============================================================
function TrustBadgesRow({ isAr }) {
  const [open, setOpen] = dmS(false);
  const badges = [
    {
      key: 'reg', label: isAr ? 'ADGM FSRA' : 'ADGM FSRA',
      sub: isAr ? 'فئة ٢، تقديم الائتمان' : 'Cat 2 · Providing Credit',
      tone: '#5a3aa3',
    },
    {
      key: 'cb', label: isAr ? 'CBUAE' : 'CBUAE',
      sub: isAr ? 'تسجيل المنتج · إفصاح حماية المستهلك' : 'Product reg · CPR-aligned',
      tone: '#1f54c8',
    },
    {
      key: 'aecb', label: isAr ? 'AECB' : 'AECB',
      sub: isAr ? 'إبلاغ شهري' : 'Monthly bureau reporting',
      tone: '#0a8056',
    },
    {
      key: 'sharia', label: isAr ? 'شرعي' : 'AAOIFI · Sharia',
      sub: isAr ? 'هيكل التورّق · فتوى متاحة' : 'Tawarruq · Fatwa on file',
      tone: '#0a8056',
    },
    {
      key: 'iso', label: 'ISO 27001',
      sub: isAr ? 'أمن المعلومات' : 'Information security',
      tone: '#b06a14',
    },
  ];
  return (
    <div style={{
      padding: '10px 12px', borderRadius: 12,
      background: 'var(--mal-paper)',
      border: '1px solid var(--mal-line)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        cursor: 'pointer',
      }} onClick={() => setOpen(!open)}>
        <span style={{ fontSize: 13 }}>🛡</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--mal-ink)' }}>
            {isAr ? 'مرخّص ومدقَّق' : 'Licensed · audited · transparent'}
          </div>
          <div style={{ fontSize: 10, color: 'var(--mal-mid)', marginTop: 1 }}>
            ADGM · CBUAE · AECB · AAOIFI · ISO 27001
          </div>
        </div>
        <span style={{ color: 'var(--mal-mid-2)', fontSize: 10 }}>
          {open ? '▾' : '▸'}
        </span>
      </div>
      {open && (
        <div style={{
          marginTop: 10, display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 6,
        }}>
          {badges.map((b) => (
            <div key={b.key} style={{
              padding: 8, borderRadius: 8,
              background: b.tone + '12',
              border: '1px solid ' + b.tone + '40',
            }}>
              <div style={{
                fontSize: 10.5, fontWeight: 700, color: b.tone,
                letterSpacing: '.04em', textTransform: 'uppercase',
              }}>{b.label}</div>
              <div style={{ fontSize: 10, color: 'var(--mal-mid)', marginTop: 2, lineHeight: 1.4 }}>{b.sub}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// EInvoiceBadge. Small "submitted to FTA / Peppol ID" badge that
// surfaces e-invoicing compliance on every invoice card. Reflects
// the UAE FTA mandate (pilot Jul 2026, full SME by Jul 2027).
// ============================================================
function EInvoiceBadge({ isAr, compact, peppolId = '0142.0042.0418' }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: compact ? '3px 8px' : '4px 10px',
      borderRadius: 999,
      background: 'rgba(10,128,86,0.12)',
      border: '1px solid rgba(10,128,86,0.32)',
      fontSize: compact ? 10 : 10.5,
      color: '#0a8056',
      fontWeight: 600,
      marginTop: compact ? 4 : 8,
    }}>
      <span style={{ fontSize: 11 }}>✓</span>
      <span>{isAr ? 'مُسجَّلة لدى الهيئة' : 'Submitted to FTA'}</span>
      <span style={{ opacity: 0.65, fontFamily: 'var(--mal-font-mono)' }}>· Peppol {peppolId}</span>
    </div>
  );
}

// ============================================================
// SwitchTermPill. Small dropdown on the active-plan card. Lets the
// buyer convert Pay-30 → BNPL-90 / Inst-3 / Inst-4 in one tap, before
// going through the full Restructure flow. Mondu-style post-purchase
// term flexibility. Only shown when the plan hasn't started accruing
// payments. See callsite gating.
// ============================================================
function SwitchTermPill({ isAr, currentType, onPick }) {
  const [open, setOpen] = dmS(false);
  const opts = [
    { type: 'pay30',         label: isAr ? 'ادفع خلال ٣٠'  : 'Pay 30d',           sub: '0%'   },
    { type: 'bnpl60',        label: isAr ? 'BNPL ٦٠'       : 'BNPL 60d',          sub: '+1.8%' },
    { type: 'bnpl90',        label: isAr ? 'BNPL ٩٠'       : 'BNPL 90d',          sub: '+2.6%' },
    { type: 'inst3',         label: isAr ? 'أقساط ٣ شهور' : 'Instal · 3 mo',     sub: '+3.0%' },
    { type: 'installment_4', label: isAr ? 'أقساط ٤ شهور' : 'Instal · 4 mo',     sub: '+3.6%' },
  ].filter((o) => o.type !== currentType);

  return (
    <div style={{ position: 'relative', marginInlineStart: 'auto' }}>
      <button onClick={() => setOpen((o) => !o)} style={{
        all: 'unset', cursor: 'pointer',
        padding: '4px 10px', borderRadius: 999,
        background: 'var(--mal-surface-2)',
        border: '1px solid var(--mal-line)',
        fontSize: 11, color: 'var(--mal-ink-2)',
        fontWeight: 500,
        display: 'inline-flex', alignItems: 'center', gap: 4,
      }}>
        <span>{isAr ? 'بدّل المدّة' : 'Switch term'}</span>
        <span style={{ fontSize: 9 }}>▾</span>
      </button>
      {open && (
        <div style={{
          position: 'absolute', insetInlineEnd: 0, top: '100%', marginTop: 6,
          zIndex: 5, minWidth: 170,
          background: 'var(--mal-paper)',
          border: '1px solid var(--mal-line)',
          borderRadius: 12,
          boxShadow: '0 8px 28px rgba(0,0,0,0.16)',
          padding: 4,
        }}>
          {opts.map((opt) => (
            <button key={opt.type} onClick={() => { onPick(opt.type); setOpen(false); }} style={{
              all: 'unset', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              width: '100%', padding: '8px 12px', borderRadius: 8,
              fontSize: 12, color: 'var(--mal-ink)',
              transition: 'background .15s',
            }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--mal-surface-2)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
              <span>{opt.label}</span>
              <span style={{ fontSize: 10.5, color: 'var(--mal-mid)', fontFamily: 'var(--mal-font-mono)' }}>{opt.sub}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// NotifPrefsCard. Collapsible card showing the buyer's reminder
// channel + language prefs + a timeline preview of when they fire.
// ============================================================
function NotifPrefsCard({ isAr, prefs, onChange }) {
  const [open, setOpen] = dmS(false);
  const allChannels = isAr
    ? ['واتساب', 'SMS', 'بريد', 'إشعار التطبيق']
    : ['WhatsApp', 'SMS', 'Email', 'In-app'];
  const channels = prefs.channels || ['WhatsApp', 'SMS', 'In-app'];
  const lang = prefs.language || (isAr ? 'ar' : 'en');

  const toggleChannel = (c) => {
    const next = channels.includes(c) ? channels.filter((x) => x !== c) : [...channels, c];
    onChange({ ...prefs, channels: next });
  };

  return (
    <div style={{
      padding: 14, borderRadius: 14,
      background: 'var(--mal-paper)',
      border: '1px solid var(--mal-line)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        cursor: 'pointer',
      }} onClick={() => setOpen(!open)}>
        <span style={{
          width: 28, height: 28, borderRadius: 999,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--mal-surface-2)', fontSize: 14,
        }}>🔔</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--mal-ink)' }}>
            {isAr ? 'كيف نذكّرك' : 'How we remind you'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--mal-mid)', marginTop: 2 }}>
            {channels.join(' · ')} · {lang === 'ar' ? 'العربية' : 'English'}
          </div>
        </div>
        <span style={{ color: 'var(--mal-mid-2)', fontSize: 12 }}>
          {open ? '▾' : '▸'}
        </span>
      </div>

      {open && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Channels */}
          <div>
            <div className="mal-caption" style={{ marginBottom: 6, color: 'var(--mal-mid)' }}>
              {isAr ? 'القنوات' : 'Channels'}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {allChannels.map((c) => {
                const active = channels.includes(c);
                return (
                  <button key={c} onClick={() => toggleChannel(c)} style={{
                    all: 'unset', cursor: 'pointer',
                    fontSize: 11, padding: '4px 10px', borderRadius: 999,
                    background: active ? 'var(--mal-primary)' : 'var(--mal-surface-2)',
                    color: active ? '#fff' : 'var(--mal-ink-2)',
                    border: '1px solid ' + (active ? 'var(--mal-primary)' : 'var(--mal-line)'),
                    transition: 'background .15s, color .15s',
                  }}>{c}</button>
                );
              })}
            </div>
          </div>

          {/* Language */}
          <div>
            <div className="mal-caption" style={{ marginBottom: 6, color: 'var(--mal-mid)' }}>
              {isAr ? 'لغة الرسائل' : 'Message language'}
            </div>
            <div style={{ display: 'inline-flex', gap: 4 }}>
              {[{ v: 'en', l: 'English' }, { v: 'ar', l: 'العربية' }].map((opt) => {
                const active = lang === opt.v;
                return (
                  <button key={opt.v} onClick={() => onChange({ ...prefs, language: opt.v })} style={{
                    all: 'unset', cursor: 'pointer',
                    fontSize: 11, padding: '4px 10px', borderRadius: 999,
                    background: active ? 'var(--mal-ink)' : 'var(--mal-surface-2)',
                    color: active ? '#FAF7EE' : 'var(--mal-ink-2)',
                  }}>{opt.l}</button>
                );
              })}
            </div>
          </div>

          {/* Timeline preview */}
          <div>
            <div className="mal-caption" style={{ marginBottom: 6, color: 'var(--mal-mid)' }}>
              {isAr ? 'متى ترسل الذكرى' : 'When reminders fire'}
            </div>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4,
              fontFamily: 'var(--mal-font-mono)', fontSize: 9.5,
            }}>
              {[
                { lab: '−3d', tone: '#1f54c8' },
                { lab: '−1d', tone: '#1f54c8' },
                { lab: 'Due', tone: '#5a3aa3' },
                { lab: '+1d', tone: '#b06a14' },
                { lab: '+7d', tone: '#b06a14' },
                { lab: '+15d', tone: '#b8364b' },
              ].map((t) => (
                <div key={t.lab} style={{
                  padding: '4px 6px', borderRadius: 6, textAlign: 'center',
                  background: t.tone + '14', color: t.tone,
                  border: '1px solid ' + t.tone + '40',
                }}>{t.lab}</div>
              ))}
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--mal-mid-2)', marginTop: 6, lineHeight: 1.5 }}>
              {isAr
                ? 'ذكرى مسبقة قبل ٣ أيّام · يوم قبل · يوم الاستحقاق · سُلم التحصيل بعد ذلك. كلّها تظهر في سجلّ النشاط أعلاه.'
                : 'Pre-due nudge at −3 and −1 days · day-of confirmation · collections ladder after. All log into the activity timeline above.'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// TawarruqVisualiser. Animated 4-leg commodity-murabaha trade flow.
// Shows AAOIFI-aligned structure before the buyer signs a Sharia contract.
// Modal-style overlay; can be closed or signed-through.
// ============================================================
function TawarruqVisualiser({ isAr, principal, totalCost, tenorMonths, onClose, onSign }) {
  const [step, setStep] = dmS(0);
  const total = principal + totalCost;
  const profitPct = totalCost > 0 ? ((totalCost / principal) * 100).toFixed(1) : '0.0';
  const monthly = Math.round(total / Math.max(1, tenorMonths));

  dmE(() => {
    if (step >= 4) return;
    const t = setTimeout(() => setStep((s) => s + 1), 1100);
    return () => clearTimeout(t);
  }, [step]);

  const legs = [
    {
      id: 1,
      title: isAr ? 'مال يشتري السلعة' : 'Mal buys commodity',
      sub: isAr
        ? `سلعة فضّيّة من DMCC · فوريّ · ${principal.toLocaleString()} د.إ`
        : `Silver from DMCC broker · spot · AED ${principal.toLocaleString()}`,
    },
    {
      id: 2,
      title: isAr ? 'مال يبيع لك السلعة' : 'Mal sells commodity to you',
      sub: isAr
        ? `بسعر ${total.toLocaleString()} د.إ · مؤجَّل ${tenorMonths} شهر · ربح ${profitPct}%`
        : `AED ${total.toLocaleString()} · deferred ${tenorMonths} mo · profit ${profitPct}%`,
    },
    {
      id: 3,
      title: isAr ? 'تبيع السلعة' : 'You sell commodity',
      sub: isAr
        ? `لوسيط آخر · فوريّ · ${principal.toLocaleString()} د.إ نقداً`
        : `to a different broker · spot · AED ${principal.toLocaleString()} cash`,
    },
    {
      id: 4,
      title: isAr ? 'لديك النقد · تسدّد لمال شهرياً' : 'You hold cash · repay Mal monthly',
      sub: isAr
        ? `${monthly.toLocaleString()} د.إ × ${tenorMonths}`
        : `AED ${monthly.toLocaleString()} × ${tenorMonths}`,
    },
  ];

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 10,
      background: 'rgba(15,17,23,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 14, borderRadius: 'inherit',
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: 'var(--mal-paper)',
        borderRadius: 16, width: '100%',
        padding: 18, display: 'flex', flexDirection: 'column', gap: 14,
        boxShadow: '0 14px 50px rgba(0,0,0,0.32)',
        maxHeight: '90%', overflowY: 'auto',
      }}>
        <div className="mal-caption" style={{ color: '#0a8056' }}>
          {isAr ? 'هيكل التورّق · شرعي' : 'Tawarruq structure · Sharia'}
        </div>
        <div style={{
          fontFamily: 'var(--mal-font-display)', fontSize: 22, lineHeight: 1.15,
          fontStyle: 'italic',
        }}>
          {isAr ? 'كيف يعمل التمويل الإسلامي هنا.' : 'How the Islamic structure works.'}
        </div>

        {/* 4 trade legs, each animating in */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {legs.map((leg, i) => {
            const active = step >= i;
            return (
              <div key={leg.id} style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: 10, borderRadius: 12,
                background: active ? 'rgba(10,128,86,0.10)' : 'var(--mal-surface-2)',
                border: '1px solid ' + (active ? 'rgba(10,128,86,0.32)' : 'var(--mal-line)'),
                opacity: active ? 1 : 0.45,
                transform: active ? 'translateY(0)' : 'translateY(4px)',
                transition: 'opacity .35s ease, transform .35s ease, background .25s, border-color .25s',
              }}>
                <span style={{
                  width: 26, height: 26, borderRadius: 999,
                  flexShrink: 0,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  background: active ? '#0a8056' : 'var(--mal-line)',
                  color: '#fff',
                  fontSize: 12, fontWeight: 700,
                }}>{leg.id}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--mal-ink)' }}>{leg.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--mal-mid)', marginTop: 2, lineHeight: 1.5 }}>{leg.sub}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 10px', borderRadius: 10,
          background: 'rgba(10,128,86,0.08)',
          border: '1px solid rgba(10,128,86,0.22)',
          fontSize: 11, color: 'var(--mal-ink)', lineHeight: 1.5,
        }}>
          <span style={{ fontSize: 14, color: '#0a8056' }}>✓</span>
          <span>{isAr
            ? 'تنفيذ السلعة على DMCC · مراجَع من قبل هيئة شرعية AAOIFI · فتوى متاحة للتنزيل.'
            : 'Commodity executed on DMCC · AAOIFI-aligned scholar review · fatwa PDF on request.'}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onClose} style={{
            all: 'unset', cursor: 'pointer',
            padding: '8px 14px', borderRadius: 999,
            border: '1px solid var(--mal-line)',
            background: 'var(--mal-paper)', color: 'var(--mal-ink-2)',
            fontSize: 12, fontWeight: 500,
          }}>
            {isAr ? 'رجوع' : 'Back'}
          </button>
          <button onClick={onSign} disabled={step < 3} style={{
            all: 'unset', cursor: step < 3 ? 'not-allowed' : 'pointer', flex: 1, textAlign: 'center',
            padding: '8px 14px', borderRadius: 999,
            background: step < 3 ? 'var(--mal-line)' : 'var(--mal-primary)',
            color: '#fff', fontSize: 12.5, fontWeight: 600,
            opacity: step < 3 ? 0.6 : 1,
            transition: 'background .2s, opacity .2s',
          }}>
            {step < 3
              ? (isAr ? 'يرجى مشاهدة التدفّق…' : 'Watch the trade flow…')
              : (isAr ? 'وقّع عقد المرابحة بـ UAE Pass' : 'Sign Murabaha contract · UAE Pass')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// ExplainerDock. Bottom-of-stage live narrator.
// Left pane: product manifest (what it is · who it serves · why · differentiators).
// Right pane: live action narrator driven by scenario.lastAction.
// ============================================================

const PRODUCT_EXPLAINER_P1 = {
  name: 'Smart Invoice · B2B Pay-and-Get-Paid',
  oneLine: 'Suppliers paid day one. Buyers settle over 30–120 days. Mal sits in between with the receivable.',
  solves: 'The UAE SME working-capital gap: suppliers wait 60–90 days for buyer payment; buyers want to defer their outflow without choking the supplier.',
  parties: [
    { who: 'Supplier', verb: 'Issues invoice',     outcome: '93% advance day 0' },
    { who: 'Buyer',    verb: 'Picks plan & signs', outcome: 'Pays Mal over 30–120d' },
    { who: 'Mal',      verb: 'Buys receivable',    outcome: 'Holds risk · services repayment' },
  ],
  differentiators: [
    'Sub-4-hour funding',
    'Sharia-native (Tawarruq)',
    'Anchor pre-clearance',
    'Multi-invoice bundle',
    'AECB-soft restructures',
  ],
};

const ACTION_EXPLAINERS = {
  'demo-loaded': () => ({
    title: 'Live prototype loaded',
    what: 'Both buyer and supplier apps are mounted side-by-side with synced state. Drag the central dial, click any phase, or open one of the journey screens to drive a flow.',
    why: 'Two-pane view lets you see the buyer-side decision land on the supplier side in real time. The same way the platform would behave in production.',
    business: 'No real money moves. Pure simulator for journey, policy, and economics.',
    who: 'You · the demo operator.',
  }),
  'plan-selected': ({ planLabel, fee }) => ({
    title: `Plan selected · ${planLabel || 'plan'}`,
    what: `The buyer chose ${planLabel || 'a plan'} for this invoice. Total cost to buyer: ${fee || '0%'}. Nothing has been signed yet. The buyer can switch plans freely until UAE Pass signature.`,
    why: 'Each plan trades buyer convenience against fee. Pay-in-30 is free; longer tenors carry a small spread that funds Mal\'s book.',
    business: 'No commitment yet · zero impact on supplier · zero impact on credit bureau.',
    who: 'Buyer-side only. Supplier still in awaiting state.',
  }),
  'variant-toggled': ({ variant }) => ({
    title: variant === 'sharia' ? 'Sharia variant selected' : 'Conventional variant selected',
    what: variant === 'sharia'
      ? 'The buyer chose Commodity Murabaha (Tawarruq) structuring. Signing now opens a 4-leg trade visualiser: Mal buys commodity → sells to buyer on deferred terms → buyer sells spot for cash → repays Mal monthly.'
      : 'The buyer chose conventional credit structuring. Standard interest-bearing loan; signing proceeds directly to UAE Pass.',
    why: variant === 'sharia'
      ? '~50% of UAE SME owners require Sharia-compliant credit. Mal offers it as a first-class variant with AAOIFI-aligned governance.'
      : 'Conventional is the default and faster to sign.',
    business: variant === 'sharia'
      ? 'Same economics for the buyer. Mal accrues profit via the commodity-trade spread rather than interest. DMCC executes the underlying trade.'
      : 'Standard finance structure; no commodity trade involved.',
    who: 'Buyer-side decision. Supplier is settled either way.',
  }),
  'plan-signed': ({ planLabel }) => ({
    title: 'Plan signed via UAE Pass',
    what: `The buyer digitally signed the ${planLabel || 'plan'} contract. Mal immediately wires 93% (AED 232,500) to the supplier; the 7% holdback (AED 17,500) is held until original Day 30 (or released early on extension/bundle).`,
    why: 'UAE Pass signature is binding under federal e-signature law. Mal records the contract hash on the audit ledger.',
    business: 'Supplier cashflow lands within 4 hours. Buyer limit drawn against the gross invoice value. Activity log marks "Plan signed · advance wired".',
    who: 'Buyer signs; supplier sees the advance hit; Mal books the receivable.',
  }),
  'emi-paid': ({ emiNum, amount, withPenalty }) => ({
    title: withPenalty ? `EMI ${emiNum} paid · with late fee` : `EMI ${emiNum} paid on time`,
    what: withPenalty
      ? `The buyer cleared EMI ${emiNum} (AED ${(amount || 0).toLocaleString()}) plus a AED ${withPenalty.toLocaleString()} late fee (0.5%/day capped at 10%).`
      : `The buyer cleared EMI ${emiNum} (AED ${(amount || 0).toLocaleString()}) on schedule. Activity log updates on both sides.`,
    why: withPenalty
      ? 'Late fees compound until paid. Capped to protect the buyer. AECB is notified only at field/legal stages.'
      : 'On-time payment feeds positive AECB tradelines that grow the buyer\'s limit over time.',
    business: 'Mal\'s NIM accrues on the paid principal. Supplier holdback releases automatically on Day 30 if all conditions are met.',
    who: 'Buyer · Mal · AECB (positive tradeline build).',
  }),
  'bg-emi-paid': ({ supplier, amount }) => ({
    title: `${supplier || 'Other supplier'} EMI paid`,
    what: 'The buyer cleared an EMI on a concurrent loan (different supplier · same Mal limit). The shared limit math updates immediately on the buyer\'s home.',
    why: 'A real SME holds invoices from multiple suppliers simultaneously. Mal aggregates them under one credit limit so the buyer sees one consolidated view.',
    business: 'Recovers limit headroom for new invoices. Lowers concentration risk in Mal\'s book.',
    who: 'Buyer · Mal · the other supplier.',
  }),
  'refinance-opened': () => ({
    title: 'Reschedule flow opened',
    what: 'The buyer is exploring rescheduling the remaining balance across 3 / 6 / 9 / 12 months. AECB records it as a rescheduled-tradeline, not a default.',
    why: 'Most cashflow tightness is a 3-6 month timing problem, not a credit-quality problem. Offering the option early prevents escalation to legal recovery.',
    business: 'Mal earns a 1.5% processing fee; preserves the receivable as performing; avoids a write-off. APR moves to 13.5–17.5% based on tenor.',
    who: 'Buyer-initiated. AECB notified as rescheduled (not default).',
  }),
  'refinance-signed': ({ tenor }) => ({
    title: `Reschedule signed · ${tenor || 6} months`,
    what: `Remaining balance now amortises over ${tenor || 6} months at the picked APR. Original plan is closed under "refinanced from".`,
    why: 'Locking in a smaller monthly EMI restores cashflow breathing room. Mal\'s exposure stays performing.',
    business: 'Activity log records "rescheduled" on both sides. Buyer-home reorganises around the new schedule.',
    who: 'Buyer · Mal. Supplier unaffected (already settled).',
  }),
  'extend-opened': () => ({
    title: 'Tenure extension flow opened',
    what: 'The buyer is exploring converting the invoice obligation into a longer unsecured term loan with Mal. 3 / 6 / 9 / 12 months at 9.9–14.5% APR.',
    why: 'When the buyer can\'t pay on the original due date, an extension lets Mal step fully into the receivable: supplier paid in full today, buyer pays Mal monthly.',
    business: 'Mal effectively pays the supplier\'s 7% holdback early and books a fresh term loan. Supplier sees holdback released the same day.',
    who: 'Buyer-initiated. Supplier benefits via early holdback release.',
  }),
  'extend-signed': ({ tenor }) => ({
    title: `Extension signed · ${tenor || 6} months`,
    what: `Mal has just settled the original invoice on the buyer\'s behalf. Buyer now owes Mal the term-extension EMIs for ${tenor || 6} months. Supplier holdback releases today, not Day 30.`,
    why: 'Once Mal pays the supplier in full, the buyer\'s contract is purely with Mal. The original invoice is closed; collections cadence resets.',
    business: 'Supplier total received jumps from 93% to 100% on the signing day. Buyer\'s limit utilisation shifts from invoice-financing to term-loan exposure.',
    who: 'Buyer · Mal · supplier (early settlement bonus).',
  }),
  'bundle-opened': ({ count, total }) => ({
    title: 'Bundle / consolidation flow opened',
    what: `The buyer is exploring merging ${count || 3} active invoices (total AED ${(total || 499000).toLocaleString()}) into one consolidated EMI plan with a single due date.`,
    why: 'Managing 3–5 invoices from different suppliers means 3–5 different due dates. Bundling collapses that into one EMI on one date.',
    business: 'Mal earns processing margin; reduces operational complexity on collections; deepens the buyer relationship.',
    who: 'Buyer-initiated. Every original supplier sees their holdback released early.',
  }),
  'bundle-signed': ({ tenor, count }) => ({
    title: `Bundled · ${count || 3} invoices → 1 plan`,
    what: `Mal has settled all original suppliers today. Buyer now owes Mal a single consolidated balance, repayable over ${tenor || 6} months on one due date.`,
    why: 'All original plans / extensions / background loans get marked "settled by bundle". Buyer home flips to show only the new bundled plan.',
    business: 'Each supplier\'s holdback releases early (same-day). Mal\'s exposure consolidates onto a single underwrite.',
    who: 'Buyer · Mal · every supplier touched by the bundle.',
  }),
  'switch-term': ({ from, to }) => ({
    title: `Term switched · ${from || 'old'} → ${to || 'new'}`,
    what: 'The buyer one-tap-switched the active plan to a different tenor before any EMI accrued. Schedule + total cost update instantly; no new signature required.',
    why: 'Mondu-style post-purchase flexibility. SMEs change their minds about cashflow needs in the first week; letting them switch keeps them in-flow.',
    business: 'Mal\'s margin shifts with the new fee. Supplier sees the same advance. They\'re already paid.',
    who: 'Buyer-only. Supplier unaffected.',
  }),
};

function ExplainerDock({ scenario, phase, lang, isMobile }) {
  const isAr = lang === 'ar';
  if (isMobile) return null;
  // "What just happened" live narrator hidden per user request; keep code
  // path intact so it can be re-enabled by flipping this flag.
  const SHOW_LIVE_NARRATOR = false;
  const last = scenario.lastAction || { id: 'demo-loaded', day: scenario.simDay };
  const product = PRODUCT_EXPLAINER_P1;
  const builder = ACTION_EXPLAINERS[last.id] || ACTION_EXPLAINERS['demo-loaded'];
  const card = builder(last.extra || {});

  return (
    <div style={{
      maxWidth: SHOW_LIVE_NARRATOR ? 1080 : 1080,
      margin: '0 auto', padding: '0 22px 30px',
      display: SHOW_LIVE_NARRATOR ? 'grid' : 'block',
      gridTemplateColumns: SHOW_LIVE_NARRATOR ? '0.4fr 0.6fr' : undefined,
      gap: 14,
    }}>
      {/* About this product. Horizontal strip with title on the left and
          Solves / Parties / Differentiators in 3 columns on the right. */}
      <div style={{
        padding: 16, borderRadius: 16,
        background: 'linear-gradient(135deg, #2A1F6F 0%, #1A1A28 100%)',
        color: '#fff', position: 'relative', overflow: 'hidden',
        display: 'grid',
        gridTemplateColumns: '0.95fr 1.05fr 1.4fr 0.9fr',
        gap: 18, alignItems: 'flex-start',
      }}>
        <div className="mal-orb" style={{
          position: 'absolute', width: 180, height: 180, top: -80,
          insetInlineEnd: -60, opacity: 0.32, pointerEvents: 'none',
        }}/>

        {/* Title column */}
        <div style={{ position: 'relative', minWidth: 0 }}>
          <div style={{ fontSize: 10, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>
            {isAr ? 'حول هذا المنتج' : 'About this product'}
          </div>
          <div style={{
            fontFamily: 'var(--mal-font-display)', fontStyle: 'italic',
            fontSize: 20, lineHeight: 1.15,
          }}>{product.name}</div>
        </div>

        {/* Solves */}
        <div style={{ position: 'relative', minWidth: 0 }}>
          <div style={{ fontSize: 10, opacity: 0.65, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>
            {isAr ? 'يحلّ' : 'Solves'}
          </div>
          <div style={{ fontSize: 11.5, lineHeight: 1.5, opacity: 0.92 }}>
            {product.solves}
          </div>
        </div>

        {/* Parties */}
        <div style={{ position: 'relative', minWidth: 0 }}>
          <div style={{ fontSize: 10, opacity: 0.65, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>
            {isAr ? 'الأطراف' : 'Parties'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {product.parties.map((p, i) => (
              <div key={i} style={{ fontSize: 11, lineHeight: 1.5 }}>
                <strong>{p.who}</strong>:
                <span style={{ opacity: 0.85 }}> {p.verb}</span>
                <span style={{ opacity: 0.6 }}> → {p.outcome}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Differentiators */}
        <div style={{ position: 'relative', minWidth: 0 }}>
          <div style={{ fontSize: 10, opacity: 0.65, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>
            {isAr ? 'الفروق' : 'Differentiators'}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {product.differentiators.map((d, i) => (
              <span key={i} style={{
                fontSize: 10, padding: '2px 8px', borderRadius: 999,
                background: 'rgba(255,255,255,0.14)',
                border: '1px solid rgba(255,255,255,0.22)',
              }}>{d}</span>
            ))}
          </div>
        </div>

        {/* One-line pitch as a thin strip below the 4-column grid */}
        <div style={{
          gridColumn: '1 / -1', position: 'relative',
          fontSize: 12, lineHeight: 1.55, opacity: 0.95,
          paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.12)',
        }}>
          {product.oneLine}
        </div>
      </div>

      {/* RIGHT. Live action narrator (hidden via SHOW_LIVE_NARRATOR flag) */}
      {SHOW_LIVE_NARRATOR && <div key={last.id + '·' + last.day} style={{
        padding: 16, borderRadius: 16,
        background: 'var(--mal-paper)',
        border: '1px solid var(--mal-line)',
        animation: 'mal-fade-up .35s ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '2px 8px', borderRadius: 999,
            fontSize: 9.5, fontWeight: 700, letterSpacing: '.08em',
            color: 'var(--mal-primary)', background: 'var(--mal-primary-50)',
            border: '1px solid var(--mal-primary-3)',
            textTransform: 'uppercase',
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: 999,
              background: 'var(--mal-primary)',
            }}/>
            {isAr ? 'يحدث الآن' : 'What just happened'}
          </span>
          <span style={{ fontSize: 10.5, color: 'var(--mal-mid-2)', fontFamily: 'var(--mal-font-mono)' }}>
            Day {last.day != null ? last.day : scenario.simDay}
          </span>
        </div>

        <div style={{
          fontFamily: 'var(--mal-font-display)', fontStyle: 'italic',
          fontSize: 20, lineHeight: 1.15, color: 'var(--mal-ink)',
          marginBottom: 10,
        }}>{card.title}</div>

        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
          fontSize: 11.5, lineHeight: 1.55,
        }}>
          {[
            { lab: isAr ? 'ماذا' : 'What',     body: card.what,     tone: '#1f54c8' },
            { lab: isAr ? 'لماذا' : 'Why',      body: card.why,      tone: '#5a3aa3' },
            { lab: isAr ? 'الأثر' : 'Business impact', body: card.business, tone: '#0a8056' },
            { lab: isAr ? 'الأطراف' : 'Who',     body: card.who,      tone: '#b06a14' },
          ].map((row, i) => (
            <div key={i}>
              <div style={{
                fontSize: 9.5, fontWeight: 700, letterSpacing: '.06em',
                textTransform: 'uppercase', color: row.tone, marginBottom: 3,
              }}>{row.lab}</div>
              <div style={{ color: 'var(--mal-ink)' }}>{row.body}</div>
            </div>
          ))}
        </div>
      </div>}
    </div>
  );
}
