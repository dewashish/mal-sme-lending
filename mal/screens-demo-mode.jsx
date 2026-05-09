/* eslint-disable */
// Mal — Demo Mode (side-by-side dual panel).
// Buyer (left) + Supplier (right) phones, sharing a scenario state.
// An autopilot drives both panels through:
//   intro → parallel onboarding → home → supplier issues invoice →
//   buyer receives + picks 4-mo installment plan + signs → supplier funded → finale.
// Synchronised notification toasts on both panels at the right moments.

const { useState: dmS, useEffect: dmE, useRef: dmR, useMemo: dmM, useCallback: dmCB } = React;
const dmIco = window.MalIcon;
const A = window.MalAutopilot;

// ------------------------------------------------------------------
// Phases
// ------------------------------------------------------------------
const DM_PHASES = [
  { id: 'intro',      label: 'Welcome' },
  { id: 'onboarding', label: 'Onboarding' },
  { id: 'home',       label: 'Settled in' },
  { id: 'issue',      label: 'Invoice issued' },
  { id: 'receive',    label: 'Buyer receives' },
  { id: 'plan',       label: 'Plan picked' },
  { id: 'sign',       label: 'Signed · UAE Pass' },
  { id: 'funded',     label: 'Wire on the way' },
  { id: 'finale',     label: 'Done' },
];

const DEFAULT_SCENARIO = {
  buyerStep: 0,
  supplierStep: 0,
  // Invoice that the supplier will create
  invoice: {
    id: 'INV-2026-0418',
    buyer: 'Crescent Trading FZE',
    buyerTRN: '100123456700003',
    amount: 250000,
    issuedAt: null,
    dueDate: '30 Oct 2026',
    description: 'Industrial packaging — Q4 2026',
  },
  // Auto-typed fields on the supplier invoice form
  draftBuyer: '',
  draftAmount: '',
  draftDescription: '',
  // Plan / sign state
  planPicked: null,        // 'installment_4'
  signing: false,
  signed: false,
  // Buyer notification + supplier notification
  buyerToast: null,        // {title, sub, icon}
  supplierToast: null,
  // Spotlight: which side is currently active
  spotlight: null,         // 'buyer' | 'supplier' | null
};

// ------------------------------------------------------------------
// DemoMode root
// ------------------------------------------------------------------
function DemoMode({ lang = 'en', setLang, onExit, isMobile }) {
  const [phase, setPhase] = dmS('intro');
  const [running, setRunning] = dmS(false);
  const [speed, setSpeed] = dmS(1);
  const [scenario, setScenario] = dmS(DEFAULT_SCENARIO);
  const isAr = lang === 'ar';

  dmE(() => { A.setSpeed(speed); }, [speed]);

  // Patch helper
  const patch = dmCB((p) => setScenario((s) => ({ ...s, ...(typeof p === 'function' ? p(s) : p) })), []);

  // Run the autopilot when running flips to true OR phase changes while running.
  // Each phase handler advances the panels and then calls setPhase(next) — that
  // re-fires this effect so the next handler picks up.
  const cancelRef = dmR({ cancelled: false });
  dmE(() => {
    cancelRef.current.cancelled = false;
    if (!running) return;
    runScenario({ phase, scenario, patch, cancelRef, setPhase, setRunning });
    return () => { cancelRef.current.cancelled = true; };
    // eslint-disable-next-line
  }, [running, phase]);

  const reset = () => {
    cancelRef.current.cancelled = true;
    setRunning(false);
    setPhase('intro');
    setScenario(DEFAULT_SCENARIO);
  };

  // Top-bar
  return (
    <div dir={isAr ? 'rtl' : 'ltr'} style={{
      minHeight: '100vh', background: 'radial-gradient(ellipse at top, #FAF7EE 0%, #EFEAFF 60%, #FAF7EE 100%)',
      color: 'var(--mal-ink)',
      fontFamily: isAr ? 'var(--mal-font-ar)' : 'var(--mal-font-ui)',
      paddingBottom: 60,
    }}>
      <DemoTopBar lang={lang} setLang={setLang} onExit={onExit}
                  running={running} setRunning={setRunning}
                  speed={speed} setSpeed={setSpeed}
                  reset={reset} phase={phase} isMobile={isMobile}/>

      <DemoTimeline phase={phase} setPhase={setPhase} reset={reset} lang={lang}/>

      <DemoStage scenario={scenario} setScenario={setScenario} patch={patch}
                 phase={phase} setPhase={setPhase}
                 running={running}
                 lang={lang} isMobile={isMobile}/>

      <DemoFooterHint phase={phase} running={running} lang={lang}/>
    </div>
  );
}

// ------------------------------------------------------------------
// Top bar
// ------------------------------------------------------------------
function DemoTopBar({ lang, setLang, onExit, running, setRunning, speed, setSpeed, reset, phase, isMobile }) {
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
          {isAr ? 'وضع العرض المُصاحَب' : 'Side-by-side demo'}
        </span>
      </div>

      <div style={{ flex: 1 }}/>

      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <button className="mal-pill-btn" onClick={reset}>
          {dmIco.refresh ? dmIco.refresh({ width: 12, height: 12 }) : '↻'}
          {isAr ? 'إعادة' : 'Reset'}
        </button>

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

        <Tabs value={lang} onChange={setLang} size="sm" items={[
          { value: 'en', label: 'EN' }, { value: 'ar', label: 'AR' },
        ]}/>

        <button className="mal-pill-btn" onClick={() => setRunning(!running)}
                style={{
                  background: running ? 'var(--mal-ink)' : 'var(--mal-primary)',
                  color: '#fff', borderColor: 'transparent',
                  padding: '8px 16px',
                }}>
          {running
            ? <>{dmIco.bolt ? dmIco.bolt({ width: 12, height: 12, color: '#fff' }) : '⏸'} {isAr ? 'إيقاف' : 'Pause'}</>
            : <>{dmIco.play ? dmIco.play({ width: 12, height: 12, color: '#fff' }) : '▶'} {phase === 'intro' || phase === 'finale' ? (isAr ? 'تشغيل' : 'Run autopilot') : (isAr ? 'استئناف' : 'Resume')}</>}
        </button>
      </div>
    </header>
  );
}

// ------------------------------------------------------------------
// Timeline (scrubber)
// ------------------------------------------------------------------
function DemoTimeline({ phase, setPhase, reset, lang }) {
  const isAr = lang === 'ar';
  const idx = DM_PHASES.findIndex((p) => p.id === phase);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
      padding: '14px 22px', overflowX: 'auto',
    }}>
      {DM_PHASES.map((p, i) => (
        <button key={p.id}
                onClick={() => { setPhase(p.id); }}
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
          {i < idx && (
            <span style={{ display: 'inline-flex' }}>
              {dmIco.check ? dmIco.check({ width: 11, height: 11 }) : '✓'}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------
// Stage — two phones side-by-side
// ------------------------------------------------------------------
function DemoStage({ scenario, setScenario, patch, phase, setPhase, running, lang, isMobile }) {
  const stack = isMobile;
  const orientation = stack ? 'column' : 'row';

  // On phase transition we may want auto-clear toasts
  dmE(() => {
    const t = setTimeout(() => patch({ buyerToast: null, supplierToast: null }), 4500);
    return () => clearTimeout(t);
  }, [scenario.buyerToast?.title, scenario.supplierToast?.title]);

  return (
    <div style={{
      display: 'flex', flexDirection: orientation, gap: 26, alignItems: 'flex-start', justifyContent: 'center',
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
        <BuyerSurface phase={phase} scenario={scenario} patch={patch} lang={lang}/>
      </DemoPanel>

      <SyncIndicator phase={phase} lang={lang} stack={stack}/>

      <DemoPanel
        side="supplier"
        title="Supplier SME"
        sub="Marwan · Atlas Packaging FZ"
        tone="sky"
        spotlight={scenario.spotlight === 'supplier'}
        toast={scenario.supplierToast}
        lang={lang}>
        <SupplierSurface phase={phase} scenario={scenario} patch={patch} lang={lang}/>
      </DemoPanel>
    </div>
  );
}

// Mid-stage indicator that shows "data flow" between the two phones
function SyncIndicator({ phase, lang, stack }) {
  const isAr = lang === 'ar';
  const flowing = phase === 'issue' || phase === 'receive' || phase === 'sign' || phase === 'funded';
  const direction = phase === 'issue' || phase === 'receive'
    ? 'supplier-to-buyer' // (visually right-to-left if buyer is on the left)
    : (phase === 'sign' || phase === 'funded') ? 'buyer-to-supplier' : null;

  if (stack) return null;
  return (
    <div style={{
      width: 70, alignSelf: 'stretch', display: 'flex',
      flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
      paddingTop: 80,
      flexShrink: 0,
    }}>
      <div style={{
        width: 50, height: 50, borderRadius: 999,
        background: flowing
          ? 'conic-gradient(from 90deg, var(--mal-iri-1), var(--mal-iri-2), var(--mal-iri-3), var(--mal-iri-4), var(--mal-iri-1))'
          : 'var(--mal-line)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: flowing ? 'var(--mal-sh-orb)' : 'none',
        animation: flowing ? 'mal-orb-spin 4s linear infinite' : 'none',
        position: 'relative',
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
          ? (direction === 'supplier-to-buyer' ? (isAr ? 'يتدفّق ←' : 'flowing →') : (isAr ? 'يتدفّق →' : '← flowing'))
          : (isAr ? 'في انتظار' : 'idle')}
      </span>
    </div>
  );
}

// ------------------------------------------------------------------
// Panel — phone-shaped frame + label + toast slot
// ------------------------------------------------------------------
function DemoPanel({ side, title, sub, tone, spotlight, toast, lang, children }) {
  const w = 380, h = 760;
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center',
      transition: 'transform .3s, filter .3s',
      transform: spotlight ? 'translateY(-4px) scale(1.012)' : 'none',
      filter: spotlight ? 'none' : '',
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
        width: w, height: h,
        borderRadius: 44, background: '#0B0B14',
        padding: 9,
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

          {/* Toast overlay */}
          {toast && <DemoToast toast={toast}/>}

          {/* Body */}
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

// ------------------------------------------------------------------
// Buyer surface — phase-driven
// ------------------------------------------------------------------
function BuyerSurface({ phase, scenario, patch, lang }) {
  const isAr = lang === 'ar';

  if (phase === 'intro') return <DemoIntroBuyer lang={lang}/>;
  if (phase === 'onboarding') {
    return (
      <BuyerOnboardingFlow
        lang={lang}
        controlledStep={scenario.buyerStep}
        onStepChange={(n) => patch({ buyerStep: n })}/>
    );
  }
  if (phase === 'home' || phase === 'issue') {
    return <DemoBuyerHome lang={lang} hasInvoice={false}/>;
  }
  if (phase === 'receive') {
    return <DemoBuyerHome lang={lang} hasInvoice scenario={scenario}/>;
  }
  if (phase === 'plan' || phase === 'sign') {
    return <DemoBuyerPlanPicker lang={lang} scenario={scenario} patch={patch}/>;
  }
  if (phase === 'funded' || phase === 'finale') {
    return <DemoBuyerSuccess lang={lang}/>;
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

function DemoBuyerHome({ lang, hasInvoice, scenario }) {
  const isAr = lang === 'ar';
  return (
    <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="mal-caption">{isAr ? 'مرحباً، عيشة' : 'Hi, Aisha'}</div>
      <div className="mal-h1" style={{ marginTop: -4 }}>{isAr ? 'تجارة الهلال (FZE)' : 'Crescent Trading FZE'}</div>

      {/* Limit hero */}
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

      {hasInvoice && scenario && (
        <Card padded style={{
          borderColor: 'var(--mal-primary-3)', borderWidth: 1.5, background: 'var(--mal-paper)',
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
                {scenario.invoice.id} · AED {scenario.invoice.amount.toLocaleString()} · {isAr ? 'تستحق' : 'due'} {scenario.invoice.dueDate}
              </div>
            </div>
            <Pill tone="warn" dot>{isAr ? 'إجراء' : 'Action'}</Pill>
          </div>
        </Card>
      )}

      {/* Static recent rows for visual density */}
      <div className="mal-caption">{isAr ? 'أحدث الفواتير' : 'Recent'}</div>
      {[
        { id: 'INV-2026-0411', sup: 'Marina IT', amt: 84000, status: 'paid' },
        { id: 'INV-2026-0407', sup: 'Pearl Logistics', amt: 132500, status: 'financed' },
      ].map((r) => (
        <Card key={r.id} padded style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{r.sup}</div>
            <div style={{ fontSize: 11, color: 'var(--mal-mid)' }}>{r.id}</div>
          </div>
          <div className="mal-num" style={{ fontSize: 13, fontWeight: 500 }}>AED {r.amt.toLocaleString()}</div>
          <Pill tone={r.status === 'paid' ? 'success' : 'info'} dot>{r.status === 'paid' ? (isAr ? 'مدفوع' : 'Paid') : (isAr ? 'مموّل' : 'Financed')}</Pill>
        </Card>
      ))}
    </div>
  );
}

function DemoBuyerPlanPicker({ lang, scenario, patch }) {
  const isAr = lang === 'ar';
  const plans = [
    { key: 'pay30', label: isAr ? 'ادفع خلال ٣٠' : 'Pay in 30d', cost: '0%', subtitle: isAr ? 'مجّاناً' : 'Free' },
    { key: 'bnpl60', label: isAr ? 'BNPL ٦٠ يوم' : 'BNPL 60d', cost: '+1.8%', subtitle: 'AED 4,500' },
    { key: 'bnpl90', label: isAr ? 'BNPL ٩٠ يوم' : 'BNPL 90d', cost: '+2.6%', subtitle: 'AED 6,500' },
    { key: 'inst3', label: isAr ? 'أقساط ٣ شهور' : 'Instalments · 3 mo', cost: '+3.0%', subtitle: 'AED 7,500' },
    { key: 'installment_4', label: isAr ? 'أقساط ٤ شهور' : 'Instalments · 4 mo',
      cost: '+3.6%', subtitle: 'AED 9,000', recommended: true },
  ];
  return (
    <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="mal-caption">{isAr ? 'فاتورة' : 'Invoice'} {scenario.invoice.id}</div>
      <div style={{ fontFamily: 'var(--mal-font-display)', fontSize: 30, fontStyle: 'italic', lineHeight: 1.05 }}>
        {isAr ? 'كيف تريد أن تدفع؟' : 'How do you want to pay?'}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {plans.map((p, i) => {
          const selected = scenario.planPicked === p.key;
          return (
            <div key={p.key}
                 className={selected ? '' : 'mal-fade-up'}
                 style={{
                   padding: 14,
                   borderRadius: 14,
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
                <div style={{ fontSize: 11, color: 'var(--mal-mid)', marginTop: 2 }}>{p.subtitle}</div>
              </div>
              <span className="mal-num" style={{ fontSize: 12, color: 'var(--mal-mid)' }}>{p.cost}</span>
            </div>
          );
        })}
      </div>

      {scenario.planPicked && (
        <Button kind="primary" size="lg" full
                icon={scenario.signing ? 'check' : 'lock'}
                style={{
                  background: scenario.signed ? 'var(--mal-success)' : undefined,
                  pointerEvents: 'none',
                }}>
          {scenario.signed
            ? (isAr ? 'تمّ التوقيع' : 'Signed')
            : (scenario.signing ? (isAr ? 'جارٍ التوقيع…' : 'Signing…') : (isAr ? 'وقّع بهوية رقمية' : 'Sign with UAE Pass'))}
        </Button>
      )}
    </div>
  );
}

function DemoBuyerSuccess({ lang }) {
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
      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{
            width: 50, height: 4, borderRadius: 999,
            background: i === 0 ? 'var(--mal-primary)' : 'var(--mal-line)',
          }}/>
        ))}
      </div>
      <span className="mal-caption">{isAr ? 'القسط ١ / ٤' : 'Instalment 1 / 4'}</span>
    </div>
  );
}

// ------------------------------------------------------------------
// Supplier surface — phase-driven
// ------------------------------------------------------------------
function SupplierSurface({ phase, scenario, patch, lang }) {
  const isAr = lang === 'ar';

  if (phase === 'intro') return <DemoIntroSupplier lang={lang}/>;
  if (phase === 'onboarding') {
    return (
      <SupplierOnboardingFlow
        lang={lang}
        controlledStep={scenario.supplierStep}
        onStepChange={(n) => patch({ supplierStep: n })}/>
    );
  }
  if (phase === 'home') {
    return <DemoSupplierHome lang={lang} funded={false}/>;
  }
  if (phase === 'issue') {
    return <DemoSupplierIssueInvoice lang={lang} scenario={scenario}/>;
  }
  if (phase === 'receive' || phase === 'plan' || phase === 'sign') {
    return <DemoSupplierAwaiting lang={lang} scenario={scenario}/>;
  }
  if (phase === 'funded' || phase === 'finale') {
    return <DemoSupplierFunded lang={lang} scenario={scenario}/>;
  }
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
        <div style={{ fontSize: 12, color: 'var(--mal-mid)', marginTop: 4 }}>
          {funded ? (isAr ? 'تمّ تمويل آخر فاتورة' : 'Latest invoice funded') : (isAr ? 'أصدر فاتورة لتبدأ' : 'Issue an invoice to start')}
        </div>
      </Card>

      <Card padded>
        <div className="mal-caption">{isAr ? 'أكبر المشترين' : 'Top buyers'}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
          {[
            { name: 'Crescent Trading FZE', tier: 'A', vol: 612000 },
            { name: 'Pinnacle Contracting', tier: 'B', vol: 248000 },
            { name: 'Solea Hospitality', tier: 'A', vol: 176500 },
          ].map((b) => (
            <div key={b.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Avatar name={b.name.slice(0, 2)} tone="lilac" size={28}/>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{b.name}</div>
                <div style={{ fontSize: 11, color: 'var(--mal-mid)' }}>
                  {isAr ? 'فئة' : 'Tier'} {b.tier} · AED {b.vol.toLocaleString()}
                </div>
              </div>
              {dmIco.arrow ? dmIco.arrow({ width: 14, height: 14, color: 'var(--mal-mid)' }) : null}
            </div>
          ))}
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
      <div className="mal-caption">{isAr ? 'املأ التفاصيل' : 'Fill the details'}</div>

      <Field label={isAr ? 'إلى مشترٍ' : 'Buyer'}>
        <div className="mal-input" style={{
          paddingInline: 14, height: 44, display: 'flex', alignItems: 'center',
          background: 'var(--mal-paper)',
        }}>
          <span style={{ fontFamily: 'var(--mal-font-mono)', fontSize: 13.5 }}>{scenario.draftBuyer}</span>
          <span className="mal-cursor" style={{
            display: 'inline-block', width: 1.5, height: 18, marginInlineStart: 1,
            background: 'var(--mal-primary)',
            animation: 'mal-cursor-blink 1.1s steps(2) infinite',
            opacity: scenario.draftBuyer ? 1 : 0.5,
          }}/>
        </div>
      </Field>

      <Field label={isAr ? 'القيمة (AED)' : 'Amount (AED)'}>
        <div className="mal-input" style={{
          paddingInline: 14, height: 44, display: 'flex', alignItems: 'center',
          background: 'var(--mal-paper)',
        }}>
          <span style={{ fontFamily: 'var(--mal-font-mono)', fontSize: 13.5 }}>{scenario.draftAmount}</span>
          <span className="mal-cursor" style={{
            display: 'inline-block', width: 1.5, height: 18, marginInlineStart: 1,
            background: 'var(--mal-primary)',
            animation: 'mal-cursor-blink 1.1s steps(2) infinite',
            opacity: scenario.draftAmount ? 1 : 0.5,
          }}/>
        </div>
      </Field>

      <Field label={isAr ? 'الوصف' : 'Description'}>
        <div className="mal-input" style={{
          paddingInline: 14, minHeight: 44, padding: '12px 14px',
          background: 'var(--mal-paper)',
          fontFamily: 'var(--mal-font-mono)', fontSize: 13.5,
        }}>
          {scenario.draftDescription || ' '}
        </div>
      </Field>

      <Card padded style={{ background: 'var(--mal-surface-2)', border: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          {dmIco.shield ? dmIco.shield({ color: 'var(--mal-mid)' }) : null}
          <div style={{ fontSize: 11.5, color: 'var(--mal-mid)' }}>
            {isAr
              ? 'سيتم إرسال الفاتورة عبر Peppol وتظهر فوراً في تطبيق المشتري.'
              : 'Sent via Peppol — appears in the buyer\'s app instantly.'}
          </div>
        </div>
      </Card>

      <Button kind="primary" size="lg" full
              icon={scenario.invoice.issuedAt ? 'check' : 'send'}
              style={{
                background: scenario.invoice.issuedAt ? 'var(--mal-success)' : undefined,
                pointerEvents: 'none',
              }}>
        {scenario.invoice.issuedAt
          ? (isAr ? 'تمّ الإصدار' : 'Issued')
          : (isAr ? 'أصدر الفاتورة' : 'Issue invoice')}
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
        <div style={{
          width: 48, height: 48, borderRadius: 14,
          background: 'var(--mal-primary-50)', color: 'var(--mal-primary)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
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

      <Card padded>
        <div className="mal-caption">{isAr ? 'الحدث' : 'Activity'}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 10 }}>
          {[
            { label: isAr ? 'تمّ الإصدار' : 'Issued', sub: '9:41 AM', done: true },
            { label: isAr ? 'تمّ التسليم للمشتري' : 'Delivered', sub: '9:41 AM', done: true },
            { label: isAr ? 'يفتح المشتري الفاتورة' : 'Buyer opens', sub: '9:41 AM', done: true },
            { label: isAr ? 'يختار خطّة سداد' : 'Buyer picks plan', sub: '...', done: !!scenario.planPicked },
            { label: isAr ? 'يوقّع' : 'Signs', sub: '...', done: !!scenario.signed },
          ].map((row, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 18, height: 18, borderRadius: 999,
                background: row.done ? 'var(--mal-success)' : 'var(--mal-line)',
                color: '#fff',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                animation: row.done ? 'mal-fade-up .35s ease-out' : 'none',
              }}>
                {row.done && (dmIco.check ? dmIco.check({ width: 11, height: 11, color: '#fff' }) : '✓')}
              </div>
              <div style={{ flex: 1, fontSize: 13, color: row.done ? 'var(--mal-ink)' : 'var(--mal-mid)' }}>{row.label}</div>
              <span className="mal-mono" style={{ fontSize: 10, color: 'var(--mal-mid-2)' }}>{row.sub}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function DemoSupplierFunded({ lang, scenario }) {
  const isAr = lang === 'ar';
  return (
    <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Avatar name="MA" tone="sky" size={36}/>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>Atlas Packaging FZ</div>
          <div style={{ fontSize: 11, color: 'var(--mal-success)' }}>{isAr ? 'تحويل وارد' : 'Wire incoming'}</div>
        </div>
      </div>

      <Card padded style={{
        background: 'linear-gradient(135deg, #1F7A4F 0%, #2A1F6F 100%)',
        color: '#fff', border: 'none', position: 'relative', overflow: 'hidden',
        animation: 'mal-fade-up .55s cubic-bezier(.4,1.4,.4,1) both',
      }}>
        <div className="mal-orb" style={{
          position: 'absolute', width: 200, height: 200, top: -90, insetInlineEnd: -90, opacity: .35,
          animation: 'mal-orb-spin 10s linear infinite',
        }}/>
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 11, opacity: .8, textTransform: 'uppercase', letterSpacing: '.06em' }}>
            {isAr ? 'وصل إلى حسابك' : 'Wired to your bank'}
          </div>
          <CountUpReveal value={232500}/>
          <div style={{ fontSize: 12, opacity: .9, marginTop: 6 }}>
            {isAr
              ? 'فاتورة INV-2026-0418 · رسوم ٧٪ · ENBD ****4291'
              : 'Invoice INV-2026-0418 · 7% fee · ENBD ****4291'}
          </div>
        </div>
      </Card>

      <Card padded>
        <div className="mal-caption">{isAr ? 'تفاصيل التحويل' : 'Wire details'}</div>
        {[
          [isAr ? 'قيمة الفاتورة' : 'Invoice', `AED ${scenario.invoice.amount.toLocaleString()}`],
          [isAr ? 'سلفة (٩٣٪)' : 'Advance (93%)', 'AED 232,500'],
          [isAr ? 'محجوز (٧٪)' : 'Holdback (7%)', 'AED 17,500'],
          [isAr ? 'وصول متوقّع' : 'Expected arrival', isAr ? 'خلال ٤ ساعات' : 'within 4 hours'],
        ].map((r, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: i ? '1px solid var(--mal-line-2)' : 'none', fontSize: 13 }}>
            <span style={{ color: 'var(--mal-mid)' }}>{r[0]}</span>
            <span style={{ fontWeight: 500 }} className="mal-num">{r[1]}</span>
          </div>
        ))}
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

// ------------------------------------------------------------------
// Footer hint
// ------------------------------------------------------------------
function DemoFooterHint({ phase, running, lang }) {
  const isAr = lang === 'ar';
  if (running) return null;
  return (
    <div style={{
      maxWidth: 880, marginInline: 'auto', textAlign: 'center',
      padding: '0 22px', color: 'var(--mal-mid)', fontSize: 12, lineHeight: 1.6,
    }}>
      {phase === 'intro' && (
        isAr
          ? '⏵ اضغط «تشغيل» لمشاهدة المشتري والمورّد يتزامنان عبر الإعداد، إصدار الفاتورة، اختيار الخطّة، ووصول التحويل.'
          : '⏵ Press Run to watch Buyer & Supplier sync through onboarding → invoice → plan → wire arrival.')
      }
      {phase === 'finale' && (
        isAr
          ? 'انتهى السيناريو. اضغط «إعادة» لإعادة تشغيل العرض من البداية.'
          : 'Scenario complete. Hit Reset to replay the demo from the top.')
      }
      {phase !== 'intro' && phase !== 'finale' && (
        isAr
          ? '⏸ متوقّف. اضغط «استئناف» لمتابعة السيناريو، أو اقفز عبر الجدول الزمني أعلاه.'
          : '⏸ Paused. Press Resume to continue, or jump phases via the timeline above.')
      }
    </div>
  );
}

// ------------------------------------------------------------------
// Scenario engine — drives both panels through the timeline
// ------------------------------------------------------------------
async function runScenario({ phase, setPhase, scenario, patch, cancelRef, setRunning }) {
  const cancel = () => cancelRef.current.cancelled;

  // Map phase → handler. Each handler advances the panels and sets the next phase.
  const handlers = {
    intro: async () => {
      patch({ spotlight: null });
      await A.wait(900);
      setPhase('onboarding');
    },

    onboarding: async () => {
      // Buyer has 11 steps, supplier 8 steps — drive in parallel
      // Roughly: every 2.0s, advance whichever is behind by ratio
      patch({ spotlight: null, buyerStep: 0, supplierStep: 0 });
      const BUYER_STEPS_N = 11, SUPPLIER_STEPS_N = 8;
      const total = 13;          // total visual ticks
      for (let i = 1; i <= total; i++) {
        if (cancel()) return;
        // Compute proportional step
        const frac = i / total;
        const bs = Math.min(BUYER_STEPS_N - 1, Math.round(frac * (BUYER_STEPS_N - 1)));
        const ss = Math.min(SUPPLIER_STEPS_N - 1, Math.round(frac * (SUPPLIER_STEPS_N - 1)));
        patch({ buyerStep: bs, supplierStep: ss });
        // Linger longer on hero moments
        const hero = bs === 9 /* decision */ || bs === 10 /* limit reveal */;
        await A.wait(hero ? 2000 : 1300);
      }
      if (cancel()) return;
      // Both reach their final step; allow user to see them briefly then advance
      patch({ buyerToast: { title: 'Account opened', sub: 'AED 850K limit · Tier A', icon: 'check', tone: 'success' },
              supplierToast: { title: 'You\'re ready', sub: 'CC us on any invoice — wire in 4h', icon: 'bolt', tone: 'iri' } });
      await A.wait(2200);
      patch({ buyerToast: null, supplierToast: null });
      setPhase('home');
    },

    home: async () => {
      patch({ spotlight: 'supplier' });
      await A.wait(900);
      // Supplier nudge: time to issue invoice
      patch({ supplierToast: { title: 'Issue your first invoice', sub: 'Pre-filled from your top buyer · Crescent', icon: 'invoice', tone: 'iri' } });
      await A.wait(2400);
      patch({ supplierToast: null });
      setPhase('issue');
    },

    issue: async () => {
      patch({ spotlight: 'supplier', draftBuyer: '', draftAmount: '', draftDescription: '' });
      await A.wait(700);
      // Type buyer name
      await A.typewrite((v) => patch({ draftBuyer: v }), 'Crescent Trading FZE', { perChar: 36 });
      if (cancel()) return;
      await A.wait(280);
      // Type amount
      await A.typewrite((v) => patch({ draftAmount: v }), '250,000', { perChar: 60 });
      if (cancel()) return;
      await A.wait(280);
      // Type description
      await A.typewrite((v) => patch({ draftDescription: v }), 'Industrial packaging — Q4 2026', { perChar: 32 });
      if (cancel()) return;
      await A.wait(700);
      // Issue
      patch((s) => ({ invoice: { ...s.invoice, issuedAt: new Date().toISOString() } }));
      await A.wait(800);
      // Buyer notification slides in
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
      // Buyer taps the invoice — flip to plan picker
      setPhase('plan');
    },

    plan: async () => {
      patch({ spotlight: 'buyer', planPicked: null });
      await A.wait(900);
      // Highlight installments_4 (the recommended)
      patch({ planPicked: 'installment_4' });
      await A.wait(1700);
      setPhase('sign');
    },

    sign: async () => {
      patch({ spotlight: 'buyer', signing: true });
      await A.wait(1400);
      patch({ signed: true, signing: false });
      await A.wait(700);
      // Supplier toast: confirms plan
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
        buyerToast: { title: 'Atlas was paid', sub: 'AED 232,500 wired · first instalment 30 Nov', icon: 'check', tone: 'success' },
        supplierToast: { title: 'AED 232,500 wired', sub: 'Arriving in your ENBD account · 4h SLA', icon: 'bank', tone: 'success' },
      });
      await A.wait(2400);
      setPhase('finale');
    },

    finale: async () => {
      patch({ spotlight: null, buyerToast: null, supplierToast: null });
      await A.wait(800);
      setRunning(false);
    },
  };

  const handler = handlers[phase];
  if (handler) await handler();
}

// ------------------------------------------------------------------
// Export
// ------------------------------------------------------------------
window.DemoMode = DemoMode;
