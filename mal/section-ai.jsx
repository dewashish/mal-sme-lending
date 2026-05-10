/* eslint-disable */
// Section 4 — AI Initiatives
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
// Top-level — long-form scroll, mirrors Strategy section style
// ============================================================
const AI_TOC = [
  { id: 'aiHero',       label: 'Overview' },
  { id: 'aiInventory',  label: '20-agent inventory' },
  { id: 'aiArch',       label: 'Architecture' },
  { id: 'aiDecision',   label: 'Decision engine' },
  { id: 'aiEws',        label: 'Early-warning system' },
  { id: 'aiCollect',    label: 'AI collections' },
  { id: 'aiData',       label: 'Data + governance' },
  { id: 'aiRoadmap',    label: 'Roadmap' },
];

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
        <AiArchitecture refFn={setRef('aiArch')} isAr={isAr} isMobile={isMobile}/>
        <AiDecisionEngine refFn={setRef('aiDecision')} isAr={isAr} isMobile={isMobile}/>
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
    <section id="aiHero" ref={refFn} style={{ paddingTop: 32, marginBottom: 60 }}>
      <Pill tone="iri" dot>{isAr ? 'الذكاء الاصطناعي · مالي محدد' : 'AI · purpose-built for SME credit'}</Pill>
      <h1 style={{
        fontFamily: 'var(--mal-font-display)', fontStyle: 'italic',
        fontSize: isMobile ? 44 : 70, lineHeight: 1.04, letterSpacing: '-0.02em',
        margin: '20px 0 18px',
      }}>
        {isAr
          ? <>عشرون وكيلاً يديرون <span className="mal-iri-text">دورة الائتمان كاملة.</span></>
          : <>Twenty agents running <span className="mal-iri-text">the entire credit loop.</span></>}
      </h1>
      <p style={{ fontSize: 17, lineHeight: 1.55, color: 'var(--mal-mid)', maxWidth: 680, margin: 0 }}>
        {isAr
          ? 'لكل خطوة في رحلة العميل وكيل متخصص. لا يستبدل البشر — بل يضاعف قدرتهم. يقرر، ينبه، ويتفاوض في وقت لم يتوفر بشرياً.'
          : 'Every step of the customer journey has a purpose-built agent. The aim is not replacing humans — it is letting one analyst supervise hundreds of loans in real time, decide in seconds, and pre-empt distress weeks before it shows up in the bureau.'}
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 24 }}>
        <MalKpi label={isAr ? 'وكيل ذكي' : 'Production agents'} value="20" sub={isAr ? 'في خمس مجالات' : 'across five domains'}/>
        <MalKpi label={isAr ? 'قرار تلقائي' : 'Auto-decisions'} value="78%" delta="+22pp Y3" deltaTone="up" sub={isAr ? 'بدون تدخل بشري' : 'no human in loop'}/>
        <MalKpi label={isAr ? 'كشف التعثر مبكراً' : 'EWS lead time'} value="14 days" sub={isAr ? 'قبل التعثر الفعلي' : 'before actual default'}/>
        <MalKpi label={isAr ? 'كفاءة التحصيل' : 'Collections lift'} value="+34%" delta="recovery rate" deltaTone="up" sub={isAr ? 'مقابل المنادة البشرية' : 'vs human-only dialer'}/>
      </div>
    </section>
  );
}

// ============================================================
// INVENTORY — clickable agent grid grouped by domain
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
// ARCHITECTURE — five-layer SVG diagram
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
// DECISION ENGINE — animated 5-step flow
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
          : 'A risk manager can pause at any step, replay the agent trace, override a feature, and re-run — every action is hashed into the audit ledger.'}
      </AiP>

      <div style={{
        marginTop: 16, display: 'flex', gap: 8, alignItems: 'center',
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
// EWS — interactive 32-feature score visualizer
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
          ? 'حرّك أي إشارة لرؤية كيف تتغير درجة المخاطر. يستهلك EWS ٣٢ ميزة من نهج التشغيل والمكتب وقاعدة بياناتنا. هنا سبعة منها للتجربة.'
          : 'Drag any signal to see how the live score moves. The production EWS consumes 32 features (cashflow, exposure, behaviour, bureau, sector). Six representative levers are exposed here so you can feel the model.'}
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
// COLLECTIONS — bilingual AI dialer + outcome funnel
// ============================================================
function AiCollections({ refFn, isAr, isMobile }) {
  return (
    <AiSectionWrapper id="aiCollect" refFn={refFn}
      eyebrow={isAr ? 'التحصيل الذكي' : 'AI collections'}
      title={isAr ? 'حوارات تتعاطف، لا تطارد.' : 'Conversations that empathise — not chase.'}>
      <AiP>
        {isAr
          ? 'الوكيل الصوتي الثنائي يتصل أولاً، يستمع، يقترح خطة، ويسجّل الالتزام بالدفع. البشر يدخلون فقط عند الحاجة.'
          : 'The bilingual voice agent calls first, listens for context, proposes a plan, and books a promise-to-pay. Humans only step in for refer cases or sensitive situations — supervised by playback dashboards.'}
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
              : 'Hi, this is Mal calling about the EMI on invoice #1294 — got 60 seconds?'}
          </Bubble>
          <Bubble who="customer">
            {isAr
              ? 'نعم، الفاتورة عند العميل، تأخر التحويل أربعة أيام.'
              : 'Yes — buyer just delayed the wire by four days, money should land Friday.'}
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
            ? 'كل وكيل قابل للقياس، الإلغاء، والمراجعة. لا توجد صناديق سوداء — فقط قرارات قابلة للتفسير، تحت إشراف بشري متى لزم.'
            : 'Every agent is measurable, overridable, and replayable. No black boxes — just explainable decisions, with humans in the loop wherever the risk merits it.'}
        </div>
      </div>
    </AiSectionWrapper>
  );
}

window.SectionAi = SectionAi;
