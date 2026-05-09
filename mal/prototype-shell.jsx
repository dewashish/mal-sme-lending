/* eslint-disable */
// Mal SME Lending — Prototype shell.
// Persona switcher + lifecycle router. Renders selected persona's flow inside
// a chrome that matches the active viewport (mobile / desktop) and lang/theme.
const { useState, useEffect, useMemo, useRef, useCallback: useCB } = React;

const PERSONAS = [
  { id: 'buyer',     label: 'Buyer SME',          tone: 'lilac',  product: 'p1', icon: 'card' },
  { id: 'supplier',  label: 'Supplier SME',       tone: 'sky',    product: 'p1', icon: 'truck' },
  { id: 'hcops',     label: 'Healthcare Ops',     tone: 'coral',  product: 'p2', icon: 'hospital' },
  { id: 'hccoder',   label: 'Healthcare Coder',   tone: 'peach',  product: 'p2', icon: 'shield' },
  { id: 'anchorAP',  label: 'Anchor AP',          tone: 'ink',    product: 'p3', icon: 'building' },
  { id: 'anchorSup', label: 'Anchor Supplier',    tone: 'lilac',  product: 'p3', icon: 'trade' },
];

// ============================================================
// Top-level prototype shell
// ============================================================
function MalPrototype({ initialPersona = 'buyer', initialViewport = 'mobile', initialLang = 'en', initialTheme = 'light', initialDensity = 'cozy', initialRoute = 'home', embed = false }) {
  const [persona, setPersona] = useState(initialPersona);
  const [viewport, setViewport] = useState(initialViewport);
  const [lang, setLang] = useState(initialLang);
  const [theme, setTheme] = useState(initialTheme);
  const [density, setDensity] = useState(initialDensity);
  const [route, setRoute] = useState(initialRoute); // route within persona
  const t = useT(lang);

  const _firstRender = useRef(true);
  useEffect(() => {
    if (_firstRender.current) { _firstRender.current = false; return; }
    setRoute('home');
  }, [persona]);

  return (
    <div data-theme={theme} data-density={density} dir={lang === 'ar' ? 'rtl' : 'ltr'}
      style={{ background: 'var(--mal-surface)', minHeight: embed ? 'auto' : '100vh', color: 'var(--mal-ink)', padding: embed ? 0 : 24 }}>
      {!embed && <PrototypeChrome persona={persona} setPersona={setPersona} viewport={viewport} setViewport={setViewport}
        lang={lang} setLang={setLang} theme={theme} setTheme={setTheme} density={density} setDensity={setDensity} />}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: embed ? 0 : 16 }}>
        {viewport === 'mobile'
          ? <MobileFrame><PersonaApp persona={persona} route={route} setRoute={setRoute} lang={lang} viewport="mobile" /></MobileFrame>
          : <DesktopFrame><PersonaApp persona={persona} route={route} setRoute={setRoute} lang={lang} viewport="desktop" /></DesktopFrame>}
      </div>
    </div>
  );
}

// chrome (control bar)
function PrototypeChrome({ persona, setPersona, viewport, setViewport, lang, setLang, theme, setTheme, density, setDensity }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
      background: 'var(--mal-paper)', border: '1px solid var(--mal-line)', borderRadius: 999, padding: 6, paddingInline: 14 }}>
      <MalLogo size={20} />
      <span style={{ width: 1, height: 20, background: 'var(--mal-line)' }}/>
      <select value={persona} onChange={e => setPersona(e.target.value)}
        style={{ border: 'none', background: 'transparent', font: 'inherit', color: 'var(--mal-ink)', fontWeight: 500 }}>
        {PERSONAS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
      </select>
      <span style={{ width: 1, height: 20, background: 'var(--mal-line)' }}/>
      <Tabs value={viewport} onChange={setViewport} size="sm" items={[
        { value: 'mobile', label: 'Mobile' }, { value: 'desktop', label: 'Desktop' }
      ]}/>
      <Tabs value={lang} onChange={setLang} size="sm" items={[
        { value: 'en', label: 'EN' }, { value: 'ar', label: 'AR' }
      ]}/>
      <IconBtn icon={theme === 'dark' ? 'sun' : 'moon'} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} label="Theme" size={32}/>
    </div>
  );
}

// ============================================================
// Frames (mobile + desktop)
// ============================================================
function MobileFrame({ children }) {
  return (
    <div style={{
      width: 390, height: 844, borderRadius: 48, background: '#0B0B14',
      padding: 10, boxShadow: '0 30px 80px -20px rgba(11,11,20,.4), 0 4px 12px rgba(11,11,20,.1)',
      position: 'relative', flexShrink: 0,
    }}>
      <div style={{
        width: '100%', height: '100%', borderRadius: 38, background: 'var(--mal-surface)',
        overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column'
      }}>
        <MobileStatusBar />
        <div className="mal-scroll" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', position: 'relative' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function MobileStatusBar() {
  return (
    <div style={{ height: 44, paddingInline: 24, display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', fontSize: 14, fontWeight: 600, color: 'var(--mal-ink)',
      flexShrink: 0, paddingTop: 4 }}>
      <span>9:41</span>
      <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
        <span style={{ width: 16, height: 9, border: '1.2px solid currentColor', borderRadius: 2, position: 'relative' }}>
          <span style={{ position: 'absolute', inset: '1px', background: 'currentColor', borderRadius: 1, width: '70%' }}/>
        </span>
      </span>
    </div>
  );
}

function DesktopFrame({ children }) {
  return (
    <div style={{
      width: 1280, height: 820, borderRadius: 14,
      background: 'var(--mal-paper)', boxShadow: 'var(--mal-sh-3)', overflow: 'hidden',
      border: '1px solid var(--mal-line)', flexShrink: 0,
      display: 'flex', flexDirection: 'column'
    }}>
      <div style={{
        height: 36, background: 'var(--mal-surface-2)', borderBottom: '1px solid var(--mal-line)',
        display: 'flex', alignItems: 'center', paddingInline: 14, gap: 8
      }}>
        <span style={{ width: 12, height: 12, background: '#FF5F57', borderRadius: 999 }}/>
        <span style={{ width: 12, height: 12, background: '#FEBC2E', borderRadius: 999 }}/>
        <span style={{ width: 12, height: 12, background: '#28C840', borderRadius: 999 }}/>
        <span style={{ marginLeft: 16, fontSize: 12, color: 'var(--mal-mid)' }}>app.mal.ai</span>
      </div>
      <div className="mal-scroll" style={{ flex: 1, overflowY: 'auto' }}>
        {children}
      </div>
    </div>
  );
}

// ============================================================
// Persona router
// ============================================================
function PersonaApp({ persona, route, setRoute, lang, viewport }) {
  const props = { route, setRoute, lang, viewport };
  switch (persona) {
    case 'buyer':     return <BuyerApp {...props}/>;
    case 'supplier':  return <SupplierApp {...props}/>;
    case 'hcops':     return <HealthcareOpsApp {...props}/>;
    case 'hccoder':   return <HealthcareCoderApp {...props}/>;
    case 'anchorAP':  return <AnchorAPApp {...props}/>;
    case 'anchorSup': return <AnchorSupplierApp {...props}/>;
    default:          return null;
  }
}

// ============================================================
// Shared chrome — mobile / desktop nav
// ============================================================
function MobileTopBar({ title, subtitle, onBack, right, transparent }) {
  return (
    <div style={{ paddingInline: 18, paddingBlock: 12, display: 'flex', alignItems: 'center', gap: 10,
      background: transparent ? 'transparent' : 'var(--mal-surface)', position: 'sticky', top: 0, zIndex: 10 }}>
      {onBack
        ? <IconBtn icon="arrowL" size={32} onClick={onBack}/>
        : <MalOrb size={28}/>}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 17, fontWeight: 500, color: 'var(--mal-ink)', letterSpacing: '-0.01em' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: 'var(--mal-mid)' }}>{subtitle}</div>}
      </div>
      {right}
    </div>
  );
}

function MobileTabBar({ items, active, onChange }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-around', padding: 10, paddingBottom: 22,
      background: 'var(--mal-paper)', borderTop: '1px solid var(--mal-line)',
      position: 'sticky', bottom: 0, zIndex: 10,
    }}>
      {items.map(it => (
        <button key={it.id} onClick={() => onChange(it.id)} style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: active === it.id ? 'var(--mal-ink)' : 'var(--mal-mid-2)',
        }}>
          {Ico[it.icon]({ width: 22, height: 22 })}
          <span style={{ fontSize: 10 }}>{it.label}</span>
        </button>
      ))}
    </div>
  );
}

function DesktopShell({ persona, productLabel, navItems, active, onChange, lang, headerRight, children }) {
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 784 }}>
      <aside style={{
        width: 240, background: 'var(--mal-surface-2)',
        borderInlineEnd: '1px solid var(--mal-line)', padding: 18, display: 'flex', flexDirection: 'column'
      }}>
        <MalLogo size={22}/>
        <div style={{ fontSize: 11, color: 'var(--mal-mid)', marginTop: 14, textTransform: 'uppercase', letterSpacing: '.06em' }}>{productLabel}</div>
        <nav style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {navItems.map(it => (
            <button key={it.id} onClick={() => onChange(it.id)} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
              borderRadius: 10, border: 'none', textAlign: dir === 'rtl' ? 'right' : 'left',
              background: active === it.id ? 'var(--mal-paper)' : 'transparent',
              color: active === it.id ? 'var(--mal-ink)' : 'var(--mal-mid)',
              boxShadow: active === it.id ? 'var(--mal-sh-1)' : 'none',
              cursor: 'pointer', font: 'inherit', fontSize: 14,
            }}>
              {Ico[it.icon]({ width: 18, height: 18 })}
              <span>{it.label}</span>
              {it.badge && <span style={{ marginInlineStart: 'auto', background: 'var(--mal-ink)', color: 'var(--mal-paper)', fontSize: 11, padding: '2px 8px', borderRadius: 999 }}>{it.badge}</span>}
            </button>
          ))}
        </nav>
        <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid var(--mal-line)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar tone="lilac" name="AB"/>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>Aisha B.</div>
              <div style={{ fontSize: 11, color: 'var(--mal-mid)' }}>{persona}</div>
            </div>
          </div>
        </div>
      </aside>
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header style={{ height: 64, padding: '0 24px', borderBottom: '1px solid var(--mal-line)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--mal-paper)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ position: 'relative' }}>
              <input className="mal-input" placeholder="Search invoices, suppliers..." style={{ width: 320, paddingInlineStart: 38 }}/>
              <span style={{ position: 'absolute', insetInlineStart: 12, top: 12, color: 'var(--mal-mid)' }}>{Ico.search()}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {headerRight}
            <IconBtn icon="bell" size={36} kind="elev"/>
            <IconBtn icon="settings" size={36} kind="elev"/>
          </div>
        </header>
        <div style={{ flex: 1, overflow: 'auto', padding: 24, background: 'var(--mal-surface)' }}>
          {children}
        </div>
      </main>
    </div>
  );
}

// ============================================================
// Generic step header (used in onboarding / repayment / etc)
// ============================================================
function Stepper({ steps, current }) {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      {steps.map((s, i) => (
        <div key={i} style={{ flex: 1, height: 3, borderRadius: 999,
          background: i <= current ? 'var(--mal-ink)' : 'var(--mal-line)' }}/>
      ))}
    </div>
  );
}

// ============================================================
// CountUp animator
// ============================================================
function CountUp({ to, duration = 1400, format = (v) => v.toLocaleString(), prefix = '' }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const t0 = performance.now();
    let raf;
    const step = (t) => {
      const p = Math.min(1, (t - t0) / duration);
      const e = 1 - Math.pow(1 - p, 3);
      setV(Math.round(to * e));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);
  return <span>{prefix}{format(v)}</span>;
}

Object.assign(window, {
  MalPrototype, MobileFrame, DesktopFrame, MobileTopBar, MobileTabBar, DesktopShell,
  PersonaApp, Stepper, CountUp, PERSONAS,
});
