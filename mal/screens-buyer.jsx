/* eslint-disable */
// Mal — All persona screens. Compact, hi-fi, bilingual-aware.
// Each persona exports an *App that takes (route, setRoute, lang, viewport).
const { useState: uS, useEffect: uE, useMemo: uM } = React;

// ============================================================
// Reusable bits
// ============================================================
function HeroLimit({ lang, amount = 850000, tier = 'A', onContinue }) {
  const [revealed, setRev] = uS(false);
  uE(() => { const t = setTimeout(() => setRev(true), 900); return () => clearTimeout(t); }, []);
  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18, minHeight: '100%' }}>
      <div style={{ height: 220, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="mal-orb" style={{ width: 180, height: 180, animation: 'mal-orb-spin 14s linear infinite' }}/>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div className="mal-caption" style={{ marginBottom: 10 }}>{lang === 'ar' ? 'حدّك الائتماني' : 'Your credit limit'}</div>
        <div className="mal-display-md mal-iri-text" style={{ fontStyle: 'italic' }}>
          {revealed ? <CountUp to={amount} format={v => 'AED ' + v.toLocaleString()}/> : 'AED ─'}
        </div>
        <div style={{ marginTop: 14, display: 'inline-flex', gap: 8, alignItems: 'center' }}>
          <Pill tone="ink" dot>{lang === 'ar' ? 'فئة' : 'Tier'} {tier}</Pill>
          <Pill tone="success" dot>{lang === 'ar' ? 'موافق' : 'Approved'}</Pill>
        </div>
      </div>
      <Card padded style={{ marginTop: 6 }}>
        <div className="mal-caption" style={{ marginBottom: 10 }}>{lang === 'ar' ? 'خطط مفعّلة' : 'Plans unlocked'}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {[
            lang === 'ar' ? 'دفع لاحق ٣٠ يوم' : 'BNPL 30',
            lang === 'ar' ? 'دفع لاحق ٦٠ يوم' : 'BNPL 60',
            lang === 'ar' ? 'دفع لاحق ٩٠ يوم' : 'BNPL 90',
            lang === 'ar' ? 'أقساط ٢-٦' : 'Installments 2–6',
          ].map(p => <Pill key={p} tone="neutral">{p}</Pill>)}
        </div>
      </Card>
      <Card padded>
        <div className="mal-caption" style={{ marginBottom: 6 }}>{lang === 'ar' ? 'كيف بُني هذا الحد' : 'How we built this'}</div>
        {[
          { l: lang === 'ar' ? 'AECB التجاري' : 'AECB Commercial', v: '742' },
          { l: lang === 'ar' ? 'تدفق نقدي ١٢ شهر' : '12-mo cash flow', v: lang === 'ar' ? 'قوي' : 'Strong' },
          { l: lang === 'ar' ? 'ضريبة القيمة المضافة' : 'VAT filings', v: lang === 'ar' ? 'مكتملة' : 'Up to date' },
          { l: lang === 'ar' ? 'نمط مشتريات' : 'Supplier diversity', v: '14' },
        ].map((r, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0',
            borderTop: i ? '1px solid var(--mal-line-2)' : 'none', fontSize: 14 }}>
            <span style={{ color: 'var(--mal-mid)' }}>{r.l}</span>
            <span style={{ fontWeight: 500 }}>{r.v}</span>
          </div>
        ))}
      </Card>
      <Button kind="primary" full size="lg" onClick={onContinue} iconRight="arrow">
        {lang === 'ar' ? 'متابعة إلى لوحة المستخدم' : 'Continue to dashboard'}
      </Button>
    </div>
  );
}

// ============================================================
// BUYER (Product 1)
// ============================================================
function BuyerApp({ route, setRoute, lang, viewport }) {
  const navItems = [
    { id: 'home',     icon: 'home',     label: lang === 'ar' ? 'الرئيسية' : 'Home' },
    { id: 'invoices', icon: 'invoice',  label: lang === 'ar' ? 'الفواتير' : 'Invoices', badge: 3 },
    { id: 'limit',    icon: 'wallet',   label: lang === 'ar' ? 'الحد' : 'Limit' },
    { id: 'pay',      icon: 'pay',      label: lang === 'ar' ? 'الدفعات' : 'Payments' },
    { id: 'extend-active', icon: 'wallet', label: lang === 'ar' ? 'تمديد' : 'Extend' },
    { id: 'help',     icon: 'message',  label: lang === 'ar' ? 'المساعدة' : 'Help' },
  ];
  const tabItems = navItems.slice(0, 5).map(it => ({ ...it, label: it.label }));

  // pages
  const Page = {
    onboarding: <BuyerOnboardingFlow lang={lang} onDone={() => setRoute('home')} />,
    limitReveal: <HeroLimit lang={lang} onContinue={() => setRoute('home')} />,
    home: <BuyerHome lang={lang} viewport={viewport} setRoute={setRoute} />,
    invoices: <BuyerInvoices lang={lang} setRoute={setRoute} viewport={viewport}/>,
    invoice: <BuyerInvoiceDetail lang={lang} setRoute={setRoute} viewport={viewport}/>,
    plan: <BuyerPlanPicker lang={lang} setRoute={setRoute} viewport={viewport}/>,
    confirm: <BuyerConfirm lang={lang} setRoute={setRoute} viewport={viewport}/>,
    success: <BuyerSuccess lang={lang} setRoute={setRoute} viewport={viewport}/>,
    limit: <BuyerLimit lang={lang} viewport={viewport}/>,
    pay: <BuyerPayments lang={lang} viewport={viewport}/>,
    help: <PlaceholderHelp lang={lang}/>,
    'extend-hero':    <BuyerExtendHero lang={lang} setRoute={setRoute} viewport={viewport}/>,
    'extend-pick':    <BuyerExtendPicker lang={lang} setRoute={setRoute} viewport={viewport}/>,
    'extend-agree':   <BuyerExtendAgreement lang={lang} setRoute={setRoute} viewport={viewport}/>,
    'extend-confirm': <BuyerExtendConfirm lang={lang} setRoute={setRoute} viewport={viewport}/>,
    'extend-success': <BuyerExtendSuccess lang={lang} setRoute={setRoute} viewport={viewport}/>,
    'extend-active':  <BuyerExtendActive lang={lang} setRoute={setRoute} viewport={viewport}/>,
    'extend-detail':  <BuyerExtendDetail lang={lang} setRoute={setRoute} viewport={viewport}/>,
    'extend-settle':  <BuyerExtendSettle lang={lang} setRoute={setRoute} viewport={viewport}/>,
  };
  const _extendRoutes = ['extend-hero','extend-pick','extend-agree','extend-confirm','extend-success','extend-active','extend-detail','extend-settle'];

  if (viewport === 'mobile') {
    return (
      <>
        {!['onboarding','limitReveal','plan','confirm','success','invoice', ..._extendRoutes].includes(route) &&
          <MobileTopBar
            title={lang === 'ar' ? 'مرحباً، عيشة' : 'Hi, Aisha'}
            subtitle={lang === 'ar' ? 'تجارة الهلال (FZE)' : 'Crescent Trading FZE'}
            right={<IconBtn icon="bell" size={32}/>}
          />}
        <div style={{ flex: 1 }}>{Page[route] || Page.home}</div>
        {['home','invoices','limit','pay','extend-active','help'].includes(route) &&
          <MobileTabBar items={tabItems} active={route} onChange={setRoute}/>}
      </>
    );
  }

  // desktop
  if (route === 'onboarding') return <BuyerOnboardingFlow lang={lang} onDone={() => setRoute('home')} />;
  if (route === 'limitReveal') return <HeroLimit lang={lang} onContinue={() => setRoute('home')} />;
  return (
    <DesktopShell
      persona={lang === 'ar' ? 'مشتري' : 'Buyer'}
      productLabel={lang === 'ar' ? 'الفاتورة الذكية' : 'Smart Invoice'}
      navItems={navItems}
      active={route}
      onChange={setRoute}
      lang={lang}
      headerRight={<Button kind="iri" size="sm" icon="plus">{lang === 'ar' ? 'تمويل جديد' : 'New financing'}</Button>}
    >
      {Page[route] || Page.home}
    </DesktopShell>
  );
}

function BuyerOnboarding({ lang, onDone, desktop }) {
  const [step, setStep] = uS(0);
  const steps = lang === 'ar'
    ? ['الرخصة', 'هوية رقمية', 'بيانات بنكية', 'القرار']
    : ['Trade licence', 'UAE Pass', 'Open Finance', 'Decision'];
  uE(() => {
    if (step < 3) return;
    const t = setTimeout(() => onDone(), 1600); return () => clearTimeout(t);
  }, [step]);

  return (
    <div style={{ padding: desktop ? 64 : 24, maxWidth: desktop ? 540 : '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Stepper steps={steps} current={step}/>
      <div className="mal-caption">{lang === 'ar' ? 'الخطوة' : 'Step'} {step + 1} / 4</div>
      <div className="mal-display-sm" style={{ fontStyle: 'italic' }}>{steps[step]}</div>
      {step === 0 && <>
        <Field label={lang === 'ar' ? 'رقم الرخصة التجارية' : 'Trade licence number'}>
          <Input placeholder="DED-1234567" defaultValue="DED-1247739"/>
        </Field>
        <Field label={lang === 'ar' ? 'الإمارة' : 'Emirate'}>
          <Tabs value="DUBAI" onChange={() => {}} items={[
            { value: 'DUBAI', label: 'Dubai' }, { value: 'AUH', label: 'Abu Dhabi' },
            { value: 'SHJ', label: 'Sharjah' }, { value: 'OTHER', label: 'Other' },
          ]}/>
        </Field>
        <Field label={lang === 'ar' ? 'الرقم الضريبي' : 'TRN'}>
          <Input placeholder="100123456700003" defaultValue="100247531800003"/>
        </Field>
      </>}
      {step === 1 && <Card padded style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 28 }}>
        <div className="mal-orb" style={{ width: 80, height: 80, animation: 'mal-orb-spin 8s linear infinite' }}/>
        <div className="mal-h2" style={{ textAlign: 'center' }}>{lang === 'ar' ? 'سجّل دخولك بهوية رقمية' : 'Sign in with UAE Pass'}</div>
        <div style={{ color: 'var(--mal-mid)', textAlign: 'center', fontSize: 14 }}>
          {lang === 'ar' ? 'سنسحب التراخيص والملاك المستفيدين تلقائياً.' : 'We pull licences, UBO, and signatories automatically.'}
        </div>
      </Card>}
      {step === 2 && <Card padded style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="mal-h3">{lang === 'ar' ? 'اختر بنكك الرئيسي' : 'Connect your primary bank'}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {['Emirates NBD', 'Mashreq', 'ADCB', 'FAB', 'ADIB', 'Wio'].map(b => (
            <button key={b} className="mal-card" style={{
              padding: 14, textAlign: 'start', background: 'var(--mal-paper)', cursor: 'pointer', border: '1px solid var(--mal-line)'
            }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{b}</div>
              <div style={{ fontSize: 11, color: 'var(--mal-mid)', marginTop: 2 }}>via Lean</div>
            </button>
          ))}
        </div>
        <div style={{ fontSize: 12, color: 'var(--mal-mid)' }}>
          {lang === 'ar' ? 'بيانات ١٢ شهراً للمراجعة فقط — لن نستطيع التحويل.' : '12-mo statements, read-only. We can\'t move money without your sign-off.'}
        </div>
      </Card>}
      {step === 3 && <Card padded style={{ textAlign: 'center', padding: 36 }}>
        <div className="mal-orb" style={{ width: 60, height: 60, margin: '0 auto 16px', animation: 'mal-orb-spin 4s linear infinite' }}/>
        <div className="mal-h2" style={{ marginBottom: 6 }}>{lang === 'ar' ? 'نُحلل بياناتك…' : 'Analysing your file…'}</div>
        <div style={{ color: 'var(--mal-mid)', fontSize: 13 }}>{lang === 'ar' ? 'AECB · ١٢ شهراً بنكي · فواتير Peppol' : 'AECB · 12-mo bank · Peppol invoices'}</div>
      </Card>}
      {step < 3 && <Button kind="primary" size="lg" full onClick={() => setStep(step + 1)} iconRight="arrow">
        {lang === 'ar' ? 'متابعة' : 'Continue'}
      </Button>}
    </div>
  );
}

// Sample invoices
const sampleInvoices = [
  { id: 'INV-2026-0418', sup: 'Atlas Packaging FZ', amt: 250000, due: '30 Oct', daysToDue: 14, status: 'open', plan: null },
  { id: 'INV-2026-0407', sup: 'Marina IT Services', amt: 47800, due: '02 Nov', daysToDue: 17, status: 'open', plan: 'BNPL 60' },
  { id: 'INV-2026-0392', sup: 'Pearl Logistics LLC', amt: 128400, due: '10 Nov', daysToDue: 25, status: 'financed', plan: '4× monthly' },
  { id: 'INV-2026-0388', sup: 'Crystal F&B Supply', amt: 72100, due: '15 Sep', daysToDue: -8, status: 'overdue', plan: 'BNPL 30' },
  { id: 'INV-2026-0301', sup: 'Northstar Equipment', amt: 96300, due: '02 Aug', daysToDue: -52, status: 'paid', plan: 'BNPL 30' },
];

function BuyerHome({ lang, viewport, setRoute }) {
  const desktop = viewport === 'desktop';
  return (
    <div style={{ padding: desktop ? 0 : 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Limit hero card */}
      <Card padded style={{ background: 'linear-gradient(135deg, #1A1A28 0%, #2A1F6F 100%)', color: '#fff', border: 'none', overflow: 'hidden', position: 'relative' }}>
        <div className="mal-orb" style={{ position: 'absolute', width: 220, height: 220, top: -80, insetInlineEnd: -80, opacity: .55 }}/>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 11, opacity: .7, textTransform: 'uppercase', letterSpacing: '.06em' }}>
            {lang === 'ar' ? 'الحد المتاح' : 'Available limit'}
          </div>
          <div style={{ fontFamily: 'var(--mal-font-display)', fontSize: 44, marginTop: 4, letterSpacing: '-0.02em', fontStyle: 'italic' }}>
            AED 612,400
          </div>
          <div style={{ fontSize: 12, opacity: .7, marginTop: 4 }}>
            {lang === 'ar' ? 'من أصل ٨٥٠٬٠٠٠ · يتجدد ٣١ أكتوبر' : 'of AED 850,000 · refreshes 31 Oct'}
          </div>
          <div style={{ height: 6, background: 'rgba(255,255,255,.15)', borderRadius: 99, marginTop: 14, overflow: 'hidden' }}>
            <div style={{ width: '72%', height: '100%', background: 'linear-gradient(90deg, #C9B7E8, #F0B7C2)' }}/>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <Button kind="iri" size="sm" icon="plus" onClick={() => setRoute('invoice')}>{lang === 'ar' ? 'فاتورة جديدة' : 'New invoice'}</Button>
            <Button kind="ghost" size="sm" style={{ color: '#fff' }} onClick={() => setRoute('pay')}>{lang === 'ar' ? 'الدفعات' : 'Payments'}</Button>
          </div>
        </div>
      </Card>

      {/* New: Term-extension entry tile */}
      {typeof ExtendBanner !== 'undefined' && <ExtendBanner lang={lang} onClick={() => setRoute('extend-hero')} daysToDue={14} principal={250000}/>}

      {/* Pending action */}
      <Card padded onClick={() => setRoute('invoice')} style={{ borderColor: 'var(--mal-primary-3)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 38, height: 38, borderRadius: 999, background: 'var(--mal-primary-50)', display: 'grid', placeItems: 'center', color: 'var(--mal-primary)' }}>{Ico.bolt({ width: 20, height: 20 })}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 500 }}>
            {lang === 'ar' ? 'فاتورة جديدة من أطلس للتغليف' : 'New invoice from Atlas Packaging'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--mal-mid)' }}>
            AED 250,000 · {lang === 'ar' ? 'اختر خطة الدفع' : 'choose how to pay'}
          </div>
        </div>
        {Ico.arrow({ color: 'var(--mal-mid)' })}
      </Card>

      <div className="mal-caption" style={{ marginTop: 6 }}>{lang === 'ar' ? 'الفواتير' : 'Invoices'}</div>
      {sampleInvoices.slice(0, 4).map(inv => <InvoiceRow key={inv.id} inv={inv} lang={lang} onClick={() => setRoute('invoice')}/>)}

      {desktop && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginTop: 6 }}>
          {[
            { l: lang === 'ar' ? 'مدفوع هذا الشهر' : 'Paid this month', v: 'AED 412K', d: '+18%' },
            { l: lang === 'ar' ? 'مستحق قريباً' : 'Due soon', v: 'AED 297K', d: lang === 'ar' ? '٣ فواتير' : '3 invoices' },
            { l: lang === 'ar' ? 'متوسط مهلة الدفع' : 'Avg days to pay', v: '52d', d: '−4d' },
          ].map((s, i) => <Card key={i} padded><Stat label={s.l} value={s.v} delta={s.d}/></Card>)}
        </div>
      )}
    </div>
  );
}

function InvoiceRow({ inv, lang, onClick }) {
  const tone = inv.status === 'paid' ? 'success' : inv.status === 'overdue' ? 'danger' : inv.status === 'financed' ? 'info' : 'neutral';
  return (
    <Card padded onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
      <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--mal-surface-2)', display: 'grid', placeItems: 'center' }}>{Ico.invoice()}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.sup}</div>
        <div style={{ fontSize: 11, color: 'var(--mal-mid)' }}>{inv.id} · {inv.due}</div>
      </div>
      <div style={{ textAlign: 'end' }}>
        <div className="mal-num" style={{ fontSize: 14, fontWeight: 500 }}>AED {inv.amt.toLocaleString()}</div>
        <div style={{ marginTop: 4 }}><Pill tone={tone}>{inv.plan || (lang === 'ar' ? 'مفتوح' : 'Open')}</Pill></div>
      </div>
    </Card>
  );
}

function BuyerInvoices({ lang, setRoute, viewport }) {
  const [tab, setTab] = uS('open');
  return (
    <div style={{ padding: viewport === 'desktop' ? 0 : 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {viewport === 'desktop' && <h1 className="mal-h1">{lang === 'ar' ? 'الفواتير' : 'Invoices'}</h1>}
      <Tabs value={tab} onChange={setTab} items={[
        { value: 'open', label: lang === 'ar' ? 'مفتوحة' : 'Open' },
        { value: 'financed', label: lang === 'ar' ? 'مموّلة' : 'Financed' },
        { value: 'paid', label: lang === 'ar' ? 'مدفوعة' : 'Paid' },
      ]}/>
      {sampleInvoices.filter(i => tab === 'open' ? i.status === 'open' || i.status === 'overdue' : i.status === tab).map(inv =>
        <InvoiceRow key={inv.id} inv={inv} lang={lang} onClick={() => setRoute('invoice')}/>
      )}
    </div>
  );
}

function BuyerInvoiceDetail({ lang, setRoute, viewport }) {
  return (
    <div style={{ padding: viewport === 'desktop' ? 0 : 0 }}>
      {viewport === 'mobile' && <MobileTopBar title={lang === 'ar' ? 'فاتورة' : 'Invoice'} onBack={() => setRoute('home')}/>}
      <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Card padded>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="mal-caption">Atlas Packaging FZ</div>
              <div className="mal-display-sm" style={{ fontStyle: 'italic', marginTop: 4 }}>AED 250,000</div>
            </div>
            <Pill tone="warn" dot>{lang === 'ar' ? 'بحاجة قرار' : 'Action needed'}</Pill>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 18 }}>
            {[
              [lang === 'ar' ? 'رقم الفاتورة' : 'Invoice', 'INV-2026-0418'],
              [lang === 'ar' ? 'تاريخ الإصدار' : 'Issued', '01 Oct 2026'],
              [lang === 'ar' ? 'الاستحقاق' : 'Due', '30 Oct 2026'],
              [lang === 'ar' ? 'الضريبة' : 'VAT', 'AED 11,905'],
            ].map(([k, v]) => (
              <div key={k}>
                <div style={{ fontSize: 11, color: 'var(--mal-mid)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{k}</div>
                <div style={{ fontSize: 14, fontWeight: 500, marginTop: 2 }}>{v}</div>
              </div>
            ))}
          </div>
        </Card>
        <Card padded>
          <div className="mal-caption" style={{ marginBottom: 10 }}>{lang === 'ar' ? 'بنود الفاتورة' : 'Line items'}</div>
          {[
            ['Corrugated cartons, 2-ply', '1,800 ea', 178200],
            ['Pallet wrap, 23μ', '120 rolls', 49500],
            ['Adhesive tape, 48mm', '60 rolls', 10395],
          ].map((r, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: i ? '1px solid var(--mal-line-2)' : 'none', fontSize: 13 }}>
              <span>{r[0]}</span><span style={{ color: 'var(--mal-mid)' }}>{r[1]}</span>
              <span className="mal-num" style={{ fontWeight: 500 }}>{r[2].toLocaleString()}</span>
            </div>
          ))}
        </Card>
        <Button kind="primary" size="lg" full onClick={() => setRoute('plan')} iconRight="arrow">
          {lang === 'ar' ? 'اختر خطة الدفع' : 'Choose how to pay'}
        </Button>
        {typeof ExtendBanner !== 'undefined' && <ExtendBanner lang={lang} onClick={() => setRoute('extend-hero')} daysToDue={14} principal={250000}/>}
      </div>
    </div>
  );
}

// HERO: 5-plan picker
const PLANS = (lang) => [
  { id: 'direct', label: lang === 'ar' ? 'دفع مباشر للمورد' : 'Pay supplier directly', sub: lang === 'ar' ? 'حسب شروطك معه' : 'On terms agreed with supplier', fee: 0, total: 250000, schedule: 'Net 30', tag: lang === 'ar' ? 'مجاني' : 'Free', tone: 'sky' },
  { id: 'b30', label: 'BNPL 30', sub: lang === 'ar' ? 'سدّد بعد ٣٠ يوماً' : 'Settle in 30 days', fee: 1.2, total: 253000, schedule: lang === 'ar' ? 'دفعة ٣٠ يوم' : 'One payment, 30d', tag: '+1.2%', tone: 'lilac' },
  { id: 'b60', label: 'BNPL 60', sub: lang === 'ar' ? 'سدّد بعد ٦٠ يوماً' : 'Settle in 60 days', fee: 2.2, total: 255500, schedule: lang === 'ar' ? 'دفعة ٦٠ يوم' : 'One payment, 60d', tag: '+2.2%', tone: 'lilac' },
  { id: 'b90', label: 'BNPL 90', sub: lang === 'ar' ? 'سدّد بعد ٩٠ يوماً' : 'Settle in 90 days', fee: 3.0, total: 257500, schedule: lang === 'ar' ? 'دفعة ٩٠ يوم' : 'One payment, 90d', tag: '+3.0%', tone: 'lilac' },
  { id: 'inst4', label: lang === 'ar' ? 'أقساط — ٤ شهور' : 'Installments — 4 months', sub: lang === 'ar' ? 'دفعة شهرية ٦٤٬٧٥٠ د.إ' : 'AED 64,750 / month × 4', fee: 4.4, total: 259000, schedule: '4 × monthly', tag: lang === 'ar' ? 'حصري' : 'Mal exclusive', tone: 'coral', highlight: true },
];

function BuyerPlanPicker({ lang, setRoute, viewport }) {
  const plans = PLANS(lang);
  const [picked, setPicked] = uS('inst4');
  return (
    <div>
      {viewport === 'mobile' && <MobileTopBar title={lang === 'ar' ? 'خطط الدفع' : 'Pick a plan'} onBack={() => setRoute('invoice')}/>}
      <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="mal-caption">{lang === 'ar' ? 'فاتورة' : 'Invoice'} INV-2026-0418 · AED 250,000</div>
        <div className="mal-display-sm" style={{ fontStyle: 'italic' }}>
          {lang === 'ar' ? 'كيف تحب أن تدفع؟' : 'How would you like to pay?'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {plans.map(p => (
            <button key={p.id} onClick={() => setPicked(p.id)} style={{
              textAlign: 'start', cursor: 'pointer', padding: 16,
              background: picked === p.id ? 'var(--mal-paper)' : 'var(--mal-paper)',
              border: `1.5px solid ${picked === p.id ? 'var(--mal-ink)' : 'var(--mal-line)'}`,
              borderRadius: 16, display: 'flex', alignItems: 'center', gap: 14,
              transform: picked === p.id ? 'translateY(-2px)' : 'none',
              boxShadow: picked === p.id ? 'var(--mal-sh-2)' : 'var(--mal-sh-1)',
              transition: 'all .14s'
            }}>
              <div style={{ width: 24, height: 24, borderRadius: 999, border: `2px solid ${picked === p.id ? 'var(--mal-ink)' : 'var(--mal-line)'}`, display: 'grid', placeItems: 'center' }}>
                {picked === p.id && <div style={{ width: 10, height: 10, borderRadius: 999, background: 'var(--mal-ink)' }}/>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 15, fontWeight: 500 }}>{p.label}</div>
                  {p.highlight && <Pill tone="ink" dot>{p.tag}</Pill>}
                </div>
                <div style={{ fontSize: 12, color: 'var(--mal-mid)', marginTop: 2 }}>{p.sub}</div>
              </div>
              <div style={{ textAlign: 'end' }}>
                <div className="mal-num" style={{ fontSize: 14, fontWeight: 500 }}>AED {p.total.toLocaleString()}</div>
                <div style={{ fontSize: 11, color: 'var(--mal-mid)' }}>{p.fee === 0 ? (lang === 'ar' ? 'بدون رسوم' : 'No fee') : `+${p.fee}%`}</div>
              </div>
            </button>
          ))}
        </div>
        <Card padded style={{ background: 'var(--mal-surface-2)', border: 'none' }}>
          <div className="mal-caption" style={{ marginBottom: 4 }}>{lang === 'ar' ? 'ملخّص' : 'Summary'}</div>
          {picked && (() => {
            const p = plans.find(x => x.id === picked);
            return (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{p.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--mal-mid)' }}>{p.schedule}</div>
                </div>
                <div className="mal-num mal-display-sm" style={{ fontStyle: 'italic' }}>AED {p.total.toLocaleString()}</div>
              </div>
            );
          })()}
        </Card>
        <Button kind="primary" size="lg" full onClick={() => setRoute('confirm')} iconRight="arrow">
          {lang === 'ar' ? 'متابعة' : 'Continue'}
        </Button>
      </div>
    </div>
  );
}

function BuyerConfirm({ lang, setRoute, viewport }) {
  const [signed, setSigned] = uS(false);
  uE(() => {
    if (signed) {
      if (window.MalSession) window.MalSession.saveSlice('buyerPlans', {
        ['INV-2026-0418']: { plan: 'installment_4', total: 259000, signedAt: new Date().toISOString(), signedVia: 'UAE Pass' }
      });
      const t = setTimeout(() => setRoute('success'), 1200);
      return () => clearTimeout(t);
    }
  }, [signed]);
  return (
    <div>
      {viewport === 'mobile' && <MobileTopBar title={lang === 'ar' ? 'تأكيد' : 'Confirm'} onBack={() => setRoute('plan')}/>}
      <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="mal-display-sm" style={{ fontStyle: 'italic' }}>
          {lang === 'ar' ? 'وقّع للتأكيد' : 'Sign to confirm'}
        </div>
        <Card padded>
          {[
            [lang === 'ar' ? 'إلى' : 'To', 'Atlas Packaging FZ'],
            [lang === 'ar' ? 'فاتورة' : 'Invoice', 'INV-2026-0418'],
            [lang === 'ar' ? 'الخطة' : 'Plan', lang === 'ar' ? 'أقساط — ٤ شهور' : 'Installments — 4 mo'],
            [lang === 'ar' ? 'الإجمالي' : 'Total', 'AED 259,000'],
            [lang === 'ar' ? 'الخصم البنكي' : 'Direct debit', 'ENBD ****4291'],
          ].map((r, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: i ? '1px solid var(--mal-line-2)' : 'none', fontSize: 14 }}>
              <span style={{ color: 'var(--mal-mid)' }}>{r[0]}</span><span style={{ fontWeight: 500 }}>{r[1]}</span>
            </div>
          ))}
        </Card>
        <Card padded style={{ background: 'var(--mal-surface-2)', border: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            {Ico.shield({ color: 'var(--mal-mid)' })}
            <div style={{ fontSize: 12, color: 'var(--mal-mid)' }}>
              {lang === 'ar' ? 'سيتم خصم كل قسط تلقائياً من حسابك. يمكنك إعادة الجدولة مرّتين سنوياً.' : 'Each installment auto-debits on its due date. You can reschedule twice per year.'}
            </div>
          </div>
        </Card>
        <Button kind="primary" size="lg" full onClick={() => setSigned(true)} icon={signed ? 'check' : 'lock'}>
          {signed ? (lang === 'ar' ? 'تمّ التوقيع…' : 'Signing…') : (lang === 'ar' ? 'وقّع بهوية رقمية' : 'Sign with UAE Pass')}
        </Button>
      </div>
    </div>
  );
}

function BuyerSuccess({ lang, setRoute }) {
  return (
    <div style={{ padding: 24, minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, textAlign: 'center' }}>
      <div className="mal-orb" style={{ width: 110, height: 110, animation: 'mal-orb-spin 8s linear infinite' }}/>
      <div className="mal-display-md mal-iri-text" style={{ fontStyle: 'italic' }}>
        {lang === 'ar' ? 'تمّ' : 'Done'}
      </div>
      <div style={{ color: 'var(--mal-mid)', fontSize: 14, maxWidth: 280 }}>
        {lang === 'ar' ? 'سيُدفع لأطلس خلال ٤ ساعات. القسط الأول في ١ نوفمبر.' : 'Atlas will be paid within 4 hours. First installment on 1 Nov.'}
      </div>
      <Button kind="secondary" onClick={() => setRoute('home')}>{lang === 'ar' ? 'إلى الرئيسية' : 'Back to home'}</Button>
    </div>
  );
}

function BuyerLimit({ lang, viewport }) {
  return (
    <div style={{ padding: viewport === 'desktop' ? 0 : 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {viewport === 'desktop' && <h1 className="mal-h1">{lang === 'ar' ? 'الحد الائتماني' : 'Credit limit'}</h1>}
      <Card padded>
        <Stat large label={lang === 'ar' ? 'حدّك' : 'Your limit'} value="AED 850,000" sub={lang === 'ar' ? 'فئة A' : 'Tier A'}/>
        <div style={{ height: 8, background: 'var(--mal-line)', borderRadius: 999, marginTop: 14, overflow: 'hidden' }}>
          <div style={{ width: '28%', height: '100%', background: 'var(--mal-ink)' }}/>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 12, color: 'var(--mal-mid)' }}>
          <span>{lang === 'ar' ? 'مستخدم' : 'In use'} AED 237,600</span>
          <span>{lang === 'ar' ? 'متاح' : 'Available'} AED 612,400</span>
        </div>
      </Card>
      <Card padded>
        <div className="mal-caption" style={{ marginBottom: 8 }}>{lang === 'ar' ? 'كيف يُحسب' : 'How it\'s calculated'}</div>
        {[
          ['AECB Commercial', '742', 78],
          [lang === 'ar' ? 'تدفق نقدي' : 'Cash flow', lang === 'ar' ? 'قوي' : 'Strong', 85],
          [lang === 'ar' ? 'تنوّع المورّدين' : 'Supplier diversity', '14', 64],
          [lang === 'ar' ? 'حركة فواتير' : 'Invoice flow 12mo', 'AED 8.4M', 72],
        ].map(([k, v, p], i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: i ? '1px solid var(--mal-line-2)' : 'none' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13 }}>{k}</div>
              <div style={{ height: 4, background: 'var(--mal-line)', borderRadius: 99, marginTop: 6 }}>
                <div style={{ width: p + '%', height: '100%', background: 'var(--mal-primary-3)', borderRadius: 99 }}/>
              </div>
            </div>
            <div className="mal-num" style={{ fontSize: 13, fontWeight: 500 }}>{v}</div>
          </div>
        ))}
      </Card>
    </div>
  );
}

function BuyerPayments({ lang, viewport }) {
  const schedule = [
    { date: '1 Nov', label: 'INV-2026-0418', amt: 64750, status: 'upcoming' },
    { date: '5 Nov', label: 'INV-2026-0407', amt: 47800, status: 'upcoming' },
    { date: '1 Dec', label: 'INV-2026-0418', amt: 64750, status: 'scheduled' },
    { date: '1 Jan', label: 'INV-2026-0418', amt: 64750, status: 'scheduled' },
    { date: '1 Feb', label: 'INV-2026-0418', amt: 64750, status: 'scheduled' },
  ];
  return (
    <div style={{ padding: viewport === 'desktop' ? 0 : 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {viewport === 'desktop' && <h1 className="mal-h1">{lang === 'ar' ? 'الدفعات' : 'Payments'}</h1>}
      <Card padded>
        <div className="mal-caption" style={{ marginBottom: 8 }}>{lang === 'ar' ? 'الجدول الزمني' : 'Schedule'}</div>
        {schedule.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: i ? '1px solid var(--mal-line-2)' : 'none' }}>
            <div style={{ width: 44, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--mal-mid)', textTransform: 'uppercase' }}>{s.date.split(' ')[1]}</div>
              <div className="mal-display-sm" style={{ fontStyle: 'italic', fontSize: 22, lineHeight: 1 }}>{s.date.split(' ')[0]}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{s.label}</div>
              <div style={{ fontSize: 11, color: 'var(--mal-mid)' }}>{s.status === 'upcoming' ? (lang === 'ar' ? 'قريباً' : 'Upcoming') : (lang === 'ar' ? 'مجدول' : 'Scheduled')}</div>
            </div>
            <div className="mal-num" style={{ fontSize: 14, fontWeight: 500 }}>AED {s.amt.toLocaleString()}</div>
            <Button kind="secondary" size="sm">{lang === 'ar' ? 'ادفع الآن' : 'Pay now'}</Button>
          </div>
        ))}
      </Card>
    </div>
  );
}

function PlaceholderHelp({ lang }) {
  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="mal-display-sm" style={{ fontStyle: 'italic' }}>{lang === 'ar' ? 'كيف نُساعدك؟' : 'How can we help?'}</div>
      <Card padded style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--mal-paper)' }}>
        <MalOrb size={42}/>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>{lang === 'ar' ? 'اسأل مال' : 'Ask Mal'}</div>
          <div style={{ fontSize: 12, color: 'var(--mal-mid)' }}>{lang === 'ar' ? 'بالعربية أو الإنجليزية' : 'Arabic or English'}</div>
        </div>
      </Card>
    </div>
  );
}

Object.assign(window, { BuyerApp });
