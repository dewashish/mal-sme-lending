/* eslint-disable */
// Mal. Supplier, Healthcare, Anchor persona screens (compact).
const { useState: usS, useEffect: usE } = React;

// ============================================================
// SUPPLIER (Product 1)
// ============================================================
const supplierInvoices = [
  { id: 'INV-2026-1187', buyer: 'Crescent Trading FZE', amt: 250000, score: 'A', advance: 0.93, fee30: 1.4, eta: 'Today, 14:00', status: 'offer', rec: 'recourse' },
  { id: 'INV-2026-1184', buyer: 'Solea Hospitality', amt: 89400, score: 'B', advance: 0.90, fee30: 1.8, eta: 'Today, 16:00', status: 'offer', rec: 'recourse' },
  { id: 'INV-2026-1170', buyer: 'Pinnacle Contracting', amt: 412000, score: 'A', advance: 0.93, fee30: 1.5, eta: '—', status: 'financed', rec: 'recourse' },
  { id: 'INV-2026-1142', buyer: 'Verity Construction', amt: 67800, score: 'B', advance: 0.90, fee30: 2.0, eta: '—', status: 'paid', rec: 'recourse' },
];

function SupplierApp({ route, setRoute, lang, viewport }) {
  const navItems = [
    { id: 'home',     icon: 'home',    label: lang === 'ar' ? 'الرئيسية' : 'Home' },
    { id: 'invoices', icon: 'invoice', label: lang === 'ar' ? 'الفواتير' : 'Invoices', badge: 2 },
    { id: 'cash',     icon: 'wallet',  label: lang === 'ar' ? 'السيولة' : 'Cash' },
    { id: 'buyers',   icon: 'group',   label: lang === 'ar' ? 'المشترون' : 'Buyers' },
    { id: 'help',     icon: 'message', label: lang === 'ar' ? 'المساعدة' : 'Help' },
  ];
  const Page = {
    home: <SupplierHome lang={lang} setRoute={setRoute} viewport={viewport}/>,
    invoices: <SupplierInvoices lang={lang} setRoute={setRoute} viewport={viewport}/>,
    invoice: <SupplierInvoiceAccept lang={lang} setRoute={setRoute} viewport={viewport}/>,
    success: <SupplierSuccess lang={lang} setRoute={setRoute}/>,
    cash: <SupplierCash lang={lang} viewport={viewport}/>,
    buyers: <SupplierBuyers lang={lang} viewport={viewport}/>,
    help: <PlaceholderHelp lang={lang}/>,
  };
  if (viewport === 'mobile') {
    return <>
      {!['invoice','success'].includes(route) &&
        <MobileTopBar title={lang === 'ar' ? 'أطلس للتغليف' : 'Atlas Packaging'}
          subtitle={lang === 'ar' ? 'مورّد · فعّال' : 'Supplier · Active'}
          right={<IconBtn icon="bell" size={32}/>}/>}
      <div style={{ flex: 1 }}>{Page[route] || Page.home}</div>
      {['home','invoices','cash','buyers','help'].includes(route) && <MobileTabBar items={navItems} active={route} onChange={setRoute}/>}
    </>;
  }
  return (
    <DesktopShell persona={lang === 'ar' ? 'مورّد' : 'Supplier'} productLabel={lang === 'ar' ? 'الفاتورة الذكية' : 'Smart Invoice'}
      navItems={navItems} active={route} onChange={setRoute} lang={lang}
      headerRight={<Button kind="iri" size="sm" icon="bolt">{lang === 'ar' ? 'موّل الكل' : 'Finance all'}</Button>}>
      {Page[route] || Page.home}
    </DesktopShell>
  );
}

function SupplierHome({ lang, setRoute, viewport }) {
  return (
    <div style={{ padding: viewport === 'desktop' ? 0 : 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Big balance card */}
      <Card padded style={{ background: 'linear-gradient(135deg, #FAF7EE 0%, #F0EBDE 100%)' }}>
        <div className="mal-caption">{lang === 'ar' ? 'متاح للتمويل اليوم' : 'Available to finance today'}</div>
        <div className="mal-display-md mal-iri-text" style={{ fontStyle: 'italic', marginTop: 6 }}>AED 339,400</div>
        <div style={{ display: 'flex', gap: 18, marginTop: 14, fontSize: 12, color: 'var(--mal-mid)' }}>
          <span>{lang === 'ar' ? '٢ عرض' : '2 offers'}</span><span>·</span>
          <span>{lang === 'ar' ? 'تحويل خلال ٤ ساعات' : 'wire in 4h'}</span>
        </div>
        <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
          <Button kind="primary" icon="bolt" onClick={() => setRoute('invoice')}>{lang === 'ar' ? 'موّل أحدث فاتورة' : 'Finance latest'}</Button>
          <Button kind="secondary" icon="upload">{lang === 'ar' ? 'رفع' : 'Upload'}</Button>
        </div>
      </Card>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        {[
          { l: lang === 'ar' ? 'مموّل اليوم' : 'Funded today', v: 'AED 412K' },
          { l: lang === 'ar' ? 'مستحق' : 'Pending', v: 'AED 96K' },
          { l: lang === 'ar' ? 'متأخر' : 'Overdue', v: '—' },
        ].map((s, i) => <Card key={i} padded><Stat label={s.l} value={s.v}/></Card>)}
      </div>
      <div className="mal-caption">{lang === 'ar' ? 'العروض' : 'Offers'}</div>
      {supplierInvoices.filter(i => i.status === 'offer').map(inv => <SupplierInvoiceRow key={inv.id} inv={inv} lang={lang} onClick={() => setRoute('invoice')}/>)}
    </div>
  );
}

function SupplierInvoiceRow({ inv, lang, onClick }) {
  const tone = inv.status === 'paid' ? 'success' : inv.status === 'financed' ? 'info' : 'warn';
  const advance = Math.round(inv.amt * inv.advance);
  const fee = Math.round(advance * (inv.fee30 * 3 / 100));
  const net = advance - fee;
  return (
    <Card padded onClick={onClick} style={{ cursor: 'pointer' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Avatar tone="lilac" name={inv.buyer.slice(0, 2)} size={36}/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 500 }}>{inv.buyer}</div>
          <div style={{ fontSize: 11, color: 'var(--mal-mid)' }}>{inv.id} · AED {inv.amt.toLocaleString()}</div>
        </div>
        <Pill tone={tone} dot>{inv.status === 'offer' ? (lang === 'ar' ? 'عرض' : 'Offer') : inv.status === 'financed' ? (lang === 'ar' ? 'مموّل' : 'Financed') : (lang === 'ar' ? 'مدفوع' : 'Paid')}</Pill>
      </div>
      {inv.status === 'offer' && <>
        <div style={{ height: 1, background: 'var(--mal-line-2)', margin: '12px 0' }}/>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--mal-mid)' }}>{lang === 'ar' ? 'صافي اليوم' : 'Net today'}</div>
            <div className="mal-num" style={{ fontFamily: 'var(--mal-font-display)', fontSize: 24, fontStyle: 'italic' }}>AED {net.toLocaleString()}</div>
          </div>
          <Button kind="primary" size="sm" iconRight="arrow">{lang === 'ar' ? 'اقبل' : 'Accept'}</Button>
        </div>
      </>}
    </Card>
  );
}

function SupplierInvoices({ lang, setRoute, viewport }) {
  const [tab, setTab] = usS('offer');
  const filt = supplierInvoices.filter(i => tab === 'offer' ? i.status === 'offer' : i.status === tab);
  return (
    <div style={{ padding: viewport === 'desktop' ? 0 : 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {viewport === 'desktop' && <h1 className="mal-h1">{lang === 'ar' ? 'الفواتير' : 'Invoices'}</h1>}
      <Tabs value={tab} onChange={setTab} items={[
        { value: 'offer', label: lang === 'ar' ? 'عروض' : 'Offers' },
        { value: 'financed', label: lang === 'ar' ? 'مموّلة' : 'Financed' },
        { value: 'paid', label: lang === 'ar' ? 'مدفوعة' : 'Paid' },
      ]}/>
      {filt.map(inv => <SupplierInvoiceRow key={inv.id} inv={inv} lang={lang} onClick={() => setRoute('invoice')}/>)}
    </div>
  );
}

// HERO: Supplier financing accept
function SupplierInvoiceAccept({ lang, setRoute, viewport }) {
  const inv = supplierInvoices[0];
  const advance = Math.round(inv.amt * inv.advance);
  const [tenor, setTenor] = usS(60);
  const fee = Math.round(advance * (inv.fee30 * (tenor / 30) / 100));
  const net = advance - fee;
  const [recourse, setRecourse] = usS('recourse');
  return (
    <div>
      {viewport === 'mobile' && <MobileTopBar title={lang === 'ar' ? 'اقبض الآن' : 'Get paid'} onBack={() => setRoute('home')}/>}
      <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="mal-caption">{lang === 'ar' ? 'فاتورة' : 'Invoice'} {inv.id}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span className="mal-display-md mal-iri-text" style={{ fontStyle: 'italic' }}>AED {net.toLocaleString()}</span>
          <span style={{ fontSize: 13, color: 'var(--mal-mid)' }}>{lang === 'ar' ? 'إلى حسابك خلال ٤ ساعات' : 'in your account in 4h'}</span>
        </div>
        <Card padded>
          <div className="mal-caption" style={{ marginBottom: 6 }}>{lang === 'ar' ? 'تفاصيل' : 'Breakdown'}</div>
          {[
            [lang === 'ar' ? 'قيمة الفاتورة' : 'Invoice', inv.amt],
            [lang === 'ar' ? 'سلفة (٩٣٪)' : 'Advance (93%)', advance],
            [lang === 'ar' ? `خصم ${tenor} يوم` : `Discount, ${tenor}d`, -fee],
            [lang === 'ar' ? 'محجوز للضمان (٧٪)' : 'Holdback (7%)', inv.amt - advance],
          ].map((r, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0',
              borderTop: i ? '1px solid var(--mal-line-2)' : 'none', fontSize: 14 }}>
              <span style={{ color: 'var(--mal-mid)' }}>{r[0]}</span>
              <span className="mal-num" style={{ fontWeight: 500, color: r[1] < 0 ? 'var(--mal-danger)' : 'var(--mal-ink)' }}>
                {r[1] < 0 ? '−' : ''}AED {Math.abs(r[1]).toLocaleString()}
              </span>
            </div>
          ))}
        </Card>
        <Card padded>
          <div className="mal-caption" style={{ marginBottom: 8 }}>{lang === 'ar' ? 'مدّة الخصم' : 'Tenor'}</div>
          <Tabs value={tenor} onChange={setTenor} items={[
            { value: 30, label: '30 d' }, { value: 60, label: '60 d' }, { value: 90, label: '90 d' },
          ]}/>
          <div className="mal-caption" style={{ marginTop: 14, marginBottom: 8 }}>{lang === 'ar' ? 'الرجوع' : 'Recourse'}</div>
          <Tabs value={recourse} onChange={setRecourse} items={[
            { value: 'recourse', label: lang === 'ar' ? 'بحقّ الرجوع' : 'With recourse' },
            { value: 'non', label: lang === 'ar' ? 'بدون رجوع' : 'Non-recourse' },
          ]}/>
        </Card>
        <Card padded style={{ background: 'var(--mal-surface-2)', border: 'none' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            {Ico.shield({ color: 'var(--mal-mid)' })}
            <div style={{ fontSize: 12, color: 'var(--mal-mid)' }}>
              {lang === 'ar' ? 'الكريسنت ترايدنغ هو مشتري معروف لنا بدرجة A. إشعار التحويل يُرسل إلكترونياً.' : 'Crescent Trading is a Tier-A buyer we know. Notice of assignment sent via Peppol.'}
            </div>
          </div>
        </Card>
        <Button kind="primary" size="lg" full icon="bolt" onClick={() => {
          if (window.MalSession) window.MalSession.saveSlice('supplierAccepts', {
            [inv.id]: {
              tenor, recourse, advance, fee, net, invoiceAmt: inv.amt,
              acceptedAt: new Date().toISOString(),
              wireSlaHours: 4,
            }
          });
          setRoute('success');
        }}>{lang === 'ar' ? 'اقبل واقبض' : 'Accept & get paid'}</Button>
      </div>
    </div>
  );
}

function SupplierSuccess({ lang, setRoute }) {
  return (
    <div style={{ padding: 24, minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, textAlign: 'center' }}>
      <div className="mal-orb" style={{ width: 110, height: 110, animation: 'mal-orb-spin 8s linear infinite' }}/>
      <div className="mal-display-md mal-iri-text" style={{ fontStyle: 'italic' }}>AED 222,250</div>
      <div style={{ color: 'var(--mal-mid)', fontSize: 14 }}>{lang === 'ar' ? 'في طريقها إلى حسابك' : 'on the way to your bank'}</div>
      <Button kind="secondary" onClick={() => setRoute('home')}>{lang === 'ar' ? 'رجوع' : 'Done'}</Button>
    </div>
  );
}

function SupplierCash({ lang, viewport }) {
  const days = Array.from({length: 14}, (_, i) => 10 + Math.sin(i * 0.5) * 6 + Math.random() * 4);
  return (
    <div style={{ padding: viewport === 'desktop' ? 0 : 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {viewport === 'desktop' && <h1 className="mal-h1">{lang === 'ar' ? 'سيولة' : 'Cash position'}</h1>}
      <Card padded>
        <Stat large label={lang === 'ar' ? 'مموّل ٣٠ يوم' : 'Funded last 30d'} value="AED 2.4M" delta="+38%"/>
        <div style={{ marginTop: 18 }}>
          <Sparkline values={days} width={300} height={60} fill color="var(--mal-primary-3)"/>
        </div>
      </Card>
      <Card padded>
        <div className="mal-caption" style={{ marginBottom: 8 }}>{lang === 'ar' ? 'الكشف' : 'Statement'}</div>
        {[
          ['12 Oct', 'Wire. Mal Capital', '+222,250'],
          ['11 Oct', 'Wire. Mal Capital', '+78,200'],
          ['10 Oct', 'Buyer payment routed', '17,750'],
          ['07 Oct', 'Wire. Mal Capital', '+392,400'],
        ].map((r, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: i ? '1px solid var(--mal-line-2)' : 'none' }}>
            <div><div style={{ fontSize: 13, fontWeight: 500 }}>{r[1]}</div><div style={{ fontSize: 11, color: 'var(--mal-mid)' }}>{r[0]}</div></div>
            <div className="mal-num" style={{ fontWeight: 500, color: r[2].startsWith('+') ? 'var(--mal-success)' : 'var(--mal-ink)' }}>{r[2]}</div>
          </div>
        ))}
      </Card>
    </div>
  );
}

function SupplierBuyers({ lang, viewport }) {
  return (
    <div style={{ padding: viewport === 'desktop' ? 0 : 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {viewport === 'desktop' && <h1 className="mal-h1">{lang === 'ar' ? 'المشترون' : 'Buyers'}</h1>}
      {[
        { n: 'Crescent Trading FZE', g: 'A', exp: 412000, fin: 1.4 },
        { n: 'Solea Hospitality', g: 'B', exp: 89400, fin: 1.8 },
        { n: 'Pinnacle Contracting LLC', g: 'A', exp: 612000, fin: 1.5 },
        { n: 'Verity Construction LLC', g: 'B', exp: 67800, fin: 2.0 },
      ].map((b, i) => (
        <Card key={i} padded>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Avatar tone="sky" name={b.n.slice(0, 2)}/>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{b.n}</div>
              <div style={{ fontSize: 11, color: 'var(--mal-mid)' }}>{lang === 'ar' ? 'تعرّض' : 'Exposure'} AED {b.exp.toLocaleString()}</div>
            </div>
            <Pill tone={b.g === 'A' ? 'success' : 'neutral'}>Tier {b.g}</Pill>
            <span className="mal-num" style={{ fontSize: 13, color: 'var(--mal-mid)' }}>{b.fin}%/30d</span>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ============================================================
// HEALTHCARE OPS (Product 2)
// ============================================================
const claimBatches = [
  { id: 'CLM-2026-0019', payer: 'Daman', count: 412, amt: 1240000, p: 0.86, eta: 75, advance: 0.85 },
  { id: 'CLM-2026-0020', payer: 'Sukoon', count: 187, amt: 612000, p: 0.78, eta: 82, advance: 0.80 },
  { id: 'CLM-2026-0021', payer: 'Orient', count: 96, amt: 297000, p: 0.84, eta: 68, advance: 0.82 },
  { id: 'CLM-2026-0022', payer: 'ADNIC', count: 78, amt: 178000, p: 0.71, eta: 92, advance: 0.74 },
];

function HealthcareOpsApp({ route, setRoute, lang, viewport }) {
  const navItems = [
    { id: 'home',     icon: 'home',     label: lang === 'ar' ? 'الرئيسية' : 'Home' },
    { id: 'claims',   icon: 'doc',      label: lang === 'ar' ? 'المطالبات' : 'Claim book', badge: 4 },
    { id: 'advance',  icon: 'bolt',     label: lang === 'ar' ? 'تمويل' : 'Advance' },
    { id: 'recon',    icon: 'refresh',  label: lang === 'ar' ? 'التسوية' : 'Reconcile' },
    { id: 'help',     icon: 'message',  label: lang === 'ar' ? 'المساعدة' : 'Help' },
  ];
  const Page = {
    home: <HCOpsHome lang={lang} setRoute={setRoute} viewport={viewport}/>,
    claims: <HCOpsClaimBook lang={lang} setRoute={setRoute} viewport={viewport}/>,
    advance: <HCOpsAdvance lang={lang} setRoute={setRoute} viewport={viewport}/>,
    recon: <HCOpsRecon lang={lang} viewport={viewport}/>,
    help: <PlaceholderHelp lang={lang}/>,
  };
  if (viewport === 'mobile') {
    return <>
      <MobileTopBar title="Crescent Polyclinic" subtitle={lang === 'ar' ? 'دبي · DHA' : 'Dubai · DHA'} right={<IconBtn icon="bell" size={32}/>}/>
      <div style={{ flex: 1 }}>{Page[route] || Page.home}</div>
      <MobileTabBar items={navItems} active={route} onChange={setRoute}/>
    </>;
  }
  return (
    <DesktopShell persona="Provider Ops" productLabel={lang === 'ar' ? 'محرّك المطالبات' : 'Claims Engine'}
      navItems={navItems} active={route} onChange={setRoute} lang={lang}>
      {Page[route] || Page.home}
    </DesktopShell>
  );
}

function HCOpsHome({ lang, setRoute, viewport }) {
  return (
    <div style={{ padding: viewport === 'desktop' ? 0 : 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Card padded style={{ background: 'linear-gradient(135deg, #1A1A28 0%, #2A1F6F 100%)', color: '#fff', border: 'none', position: 'relative', overflow: 'hidden' }}>
        <div className="mal-orb" style={{ position: 'absolute', width: 200, height: 200, top: -60, insetInlineEnd: -60, opacity: .55 }}/>
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 11, opacity: .7, textTransform: 'uppercase', letterSpacing: '.06em' }}>{lang === 'ar' ? 'متاح للسلفة اليوم' : 'Eligible to advance'}</div>
          <div style={{ fontFamily: 'var(--mal-font-display)', fontSize: 40, marginTop: 6, fontStyle: 'italic' }}>AED 2,327,000</div>
          <div style={{ fontSize: 12, opacity: .7, marginTop: 4 }}>{lang === 'ar' ? '٧٧٣ مطالبة · ٤ شركات تأمين' : '773 claims · 4 payers'}</div>
          <div style={{ marginTop: 14 }}>
            <Button kind="iri" size="sm" icon="bolt" onClick={() => setRoute('advance')}>{lang === 'ar' ? 'احصل على السلفة' : 'Get advance'}</Button>
          </div>
        </div>
      </Card>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Card padded><Stat label={lang === 'ar' ? 'مطالبات اليوم' : 'Claims today'} value="412" delta="+12"/></Card>
        <Card padded><Stat label={lang === 'ar' ? 'متوسط أيام الدفع' : 'Avg DSO'} value="78d" delta="−6d"/></Card>
      </div>
      <div className="mal-caption">{lang === 'ar' ? 'دفعات حسب شركة التأمين' : 'Batches by payer'}</div>
      {claimBatches.map(b => (
        <Card key={b.id} padded onClick={() => setRoute('advance')} style={{ cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Ring pct={b.p * 100} size={48} stroke={5} label={Math.round(b.p * 100) + '%'}/>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{b.payer}</div>
              <div style={{ fontSize: 11, color: 'var(--mal-mid)' }}>{b.count} {lang === 'ar' ? 'مطالبة' : 'claims'} · {b.eta}d ETA</div>
            </div>
            <div style={{ textAlign: 'end' }}>
              <div className="mal-num" style={{ fontSize: 14, fontWeight: 500 }}>AED {b.amt.toLocaleString()}</div>
              <div style={{ fontSize: 11, color: 'var(--mal-mid)' }}>{Math.round(b.advance * 100)}% advance</div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function HCOpsClaimBook({ lang, viewport }) {
  return (
    <div style={{ padding: viewport === 'desktop' ? 0 : 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {viewport === 'desktop' && <h1 className="mal-h1">{lang === 'ar' ? 'المطالبات' : 'Claim book'}</h1>}
      <Card padded={false}>
        <table className="mal-table">
          <thead><tr>
            <th>Claim ID</th><th>Payer</th><th>CPT</th><th>{lang === 'ar' ? 'احتمال موافقة' : 'P(approve)'}</th><th>ETA</th><th style={{ textAlign: 'end' }}>Amount</th>
          </tr></thead>
          <tbody>
            {[
              ['CLM-26-0001', 'Daman', '99213', 0.92, 68, 350],
              ['CLM-26-0002', 'Daman', '99214', 0.88, 71, 580],
              ['CLM-26-0003', 'Sukoon', '70450', 0.74, 84, 1200],
              ['CLM-26-0004', 'Orient', '99203', 0.91, 62, 410],
              ['CLM-26-0005', 'ADNIC', '23472', 0.62, 95, 8400],
              ['CLM-26-0006', 'Daman', '99215', 0.86, 70, 720],
              ['CLM-26-0007', 'MetLife', '99213', 0.81, 75, 350],
              ['CLM-26-0008', 'Sukoon', '99214', 0.79, 88, 580],
            ].map((r, i) => (
              <tr key={i}>
                <td><span className="mal-mono">{r[0]}</span></td>
                <td>{r[1]}</td>
                <td><span className="mal-mono">{r[2]}</span></td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 60, height: 4, background: 'var(--mal-line)', borderRadius: 99 }}>
                      <div style={{ width: (r[3] * 100) + '%', height: '100%', background: r[3] > 0.85 ? 'var(--mal-success)' : r[3] > 0.7 ? 'var(--mal-warn)' : 'var(--mal-danger)', borderRadius: 99 }}/>
                    </div>
                    <span className="mal-num" style={{ fontSize: 12 }}>{Math.round(r[3] * 100)}%</span>
                  </div>
                </td>
                <td className="mal-num">{r[4]}d</td>
                <td className="mal-num" style={{ textAlign: 'end' }}>AED {r[5].toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function HCOpsAdvance({ lang, setRoute, viewport }) {
  const [selected, setSel] = usS(claimBatches.map(b => b.id));
  const total = claimBatches.filter(b => selected.includes(b.id)).reduce((s, b) => s + b.amt * b.advance, 0);
  return (
    <div style={{ padding: viewport === 'desktop' ? 0 : 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {viewport === 'desktop' && <h1 className="mal-h1">{lang === 'ar' ? 'احصل على السلفة' : 'Advance request'}</h1>}
      <Card padded>
        <div className="mal-caption" style={{ marginBottom: 6 }}>{lang === 'ar' ? 'إجمالي السلفة' : 'Total advance'}</div>
        <div className="mal-display-md mal-iri-text" style={{ fontStyle: 'italic' }}>AED {Math.round(total).toLocaleString()}</div>
        <div style={{ fontSize: 12, color: 'var(--mal-mid)', marginTop: 4 }}>{lang === 'ar' ? 'تحويل خلال ٢٤ ساعة' : 'wired within 24h'}</div>
      </Card>
      {claimBatches.map(b => (
        <Card key={b.id} padded onClick={() => setSel(selected.includes(b.id) ? selected.filter(x => x !== b.id) : [...selected, b.id])}
          style={{ cursor: 'pointer', border: selected.includes(b.id) ? '1.5px solid var(--mal-ink)' : '1px solid var(--mal-line)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 22, height: 22, borderRadius: 6, background: selected.includes(b.id) ? 'var(--mal-ink)' : 'transparent',
              border: `1.5px solid ${selected.includes(b.id) ? 'var(--mal-ink)' : 'var(--mal-line)'}`, color: '#fff',
              display: 'grid', placeItems: 'center' }}>
              {selected.includes(b.id) && Ico.check({ width: 14, height: 14 })}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{b.payer}</div>
              <div style={{ fontSize: 12, color: 'var(--mal-mid)' }}>{b.count} {lang === 'ar' ? 'مطالبة' : 'claims'} · {Math.round(b.p * 100)}% {lang === 'ar' ? 'موافقة متوقّعة' : 'predicted'}</div>
            </div>
            <div style={{ textAlign: 'end' }}>
              <div className="mal-num" style={{ fontSize: 13, fontWeight: 500 }}>AED {Math.round(b.amt * b.advance).toLocaleString()}</div>
              <div style={{ fontSize: 11, color: 'var(--mal-mid)' }}>@ {Math.round(b.advance * 100)}%</div>
            </div>
          </div>
        </Card>
      ))}
      <Button kind="primary" size="lg" full icon="bolt">{lang === 'ar' ? 'تأكيد السلفة' : 'Confirm advance'}</Button>
    </div>
  );
}

function HCOpsRecon({ lang, viewport }) {
  return (
    <div style={{ padding: viewport === 'desktop' ? 0 : 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {viewport === 'desktop' && <h1 className="mal-h1">{lang === 'ar' ? 'التسوية' : 'Reconciliation'}</h1>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        <Card padded><Stat label={lang === 'ar' ? 'مطابقة آلية' : 'Auto-matched'} value="94%" delta="+2pp"/></Card>
        <Card padded><Stat label={lang === 'ar' ? 'بحاجة مراجعة' : 'Needs review'} value="38" deltaTone="down"/></Card>
        <Card padded><Stat label={lang === 'ar' ? 'مرفوضة' : 'Rejected'} value="12" deltaTone="down"/></Card>
      </div>
      <Card padded={false}>
        <table className="mal-table">
          <thead><tr><th>Claim</th><th>Status</th><th>Match</th><th style={{ textAlign: 'end' }}>Amount</th></tr></thead>
          <tbody>
            {[
              ['CLM-26-0001','Settled','100%', 350],
              ['CLM-26-0002','Settled','100%', 580],
              ['CLM-26-0003','Partial','85%', 1020],
              ['CLM-26-0004','Rejected','—', 0],
              ['CLM-26-0005','Pending','—', 0],
            ].map((r, i) => (
              <tr key={i}>
                <td className="mal-mono">{r[0]}</td>
                <td><Pill tone={r[1] === 'Settled' ? 'success' : r[1] === 'Rejected' ? 'danger' : 'warn'}>{r[1]}</Pill></td>
                <td>{r[2]}</td>
                <td className="mal-num" style={{ textAlign: 'end' }}>AED {r[3].toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ============================================================
// HEALTHCARE CODER (Product 2)
// ============================================================
function HealthcareCoderApp({ route, setRoute, lang, viewport }) {
  const navItems = [
    { id: 'home',    icon: 'home',  label: lang === 'ar' ? 'الرئيسية' : 'Home' },
    { id: 'queue',   icon: 'doc',   label: lang === 'ar' ? 'قائمة المراجعة' : 'Review', badge: 12 },
    { id: 'fix',     icon: 'shield',label: lang === 'ar' ? 'إصلاح' : 'Fix' },
    { id: 'help',    icon: 'message',label: lang === 'ar' ? 'المساعدة' : 'Help' },
  ];
  const Page = {
    home: <HCCoderHome lang={lang} setRoute={setRoute} viewport={viewport}/>,
    queue: <HCCoderQueue lang={lang} setRoute={setRoute} viewport={viewport}/>,
    fix: <HCCoderFix lang={lang} setRoute={setRoute} viewport={viewport}/>,
    help: <PlaceholderHelp lang={lang}/>,
  };
  if (viewport === 'mobile') return <>
    <MobileTopBar title={lang === 'ar' ? 'فريق الترميز' : 'Coding desk'} subtitle="Crescent Polyclinic" right={<IconBtn icon="bell" size={32}/>}/>
    <div style={{ flex: 1 }}>{Page[route] || Page.home}</div>
    <MobileTabBar items={navItems} active={route} onChange={setRoute}/>
  </>;
  return <DesktopShell persona="Coder" productLabel={lang === 'ar' ? 'محرّك المطالبات' : 'Claims Engine'}
    navItems={navItems} active={route} onChange={setRoute} lang={lang}>{Page[route] || Page.home}</DesktopShell>;
}

function HCCoderHome({ lang, setRoute, viewport }) {
  return (
    <div style={{ padding: viewport === 'desktop' ? 0 : 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Card padded><Stat label={lang === 'ar' ? 'احتمال رفض' : 'Likely-reject'} value="12" delta="−4" sub={lang === 'ar' ? 'من ٧٧٣' : 'of 773'}/></Card>
        <Card padded><Stat label={lang === 'ar' ? 'تم إصلاحها' : 'Fixed today'} value="29" delta="+11"/></Card>
      </div>
      <Card padded onClick={() => setRoute('queue')} style={{ cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 999, background: 'var(--mal-warn-bg)', display: 'grid', placeItems: 'center', color: 'var(--mal-warn)' }}>{Ico.warning({ width: 20, height: 20 })}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{lang === 'ar' ? '١٢ مطالبة بحاجة مراجعة' : '12 claims need review'}</div>
            <div style={{ fontSize: 12, color: 'var(--mal-mid)' }}>{lang === 'ar' ? 'مال يقترح إصلاحات' : 'Mal has suggested fixes'}</div>
          </div>
          {Ico.arrow({ color: 'var(--mal-mid)' })}
        </div>
      </Card>
    </div>
  );
}

function HCCoderQueue({ lang, setRoute, viewport }) {
  return (
    <div style={{ padding: viewport === 'desktop' ? 0 : 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {viewport === 'desktop' && <h1 className="mal-h1">{lang === 'ar' ? 'قائمة المراجعة' : 'Review queue'}</h1>}
      {[
        { id: 'CLM-26-0203', cpt: '99214', dx: 'I10', issue: lang === 'ar' ? 'تصريح مسبق ناقص' : 'Missing prior auth', p: 0.18 },
        { id: 'CLM-26-0211', cpt: '70551', dx: 'M54.5', issue: lang === 'ar' ? 'عدم تطابق الترميز' : 'Code mismatch', p: 0.32 },
        { id: 'CLM-26-0224', cpt: '23472', dx: 'M75.1', issue: lang === 'ar' ? 'تغطية غير مؤكدة' : 'Coverage unclear', p: 0.41 },
        { id: 'CLM-26-0227', cpt: '99213', dx: 'E11.9', issue: lang === 'ar' ? 'لا يوجد تشخيص داعم' : 'No supporting Dx', p: 0.27 },
      ].map(c => (
        <Card key={c.id} padded onClick={() => setRoute('fix')} style={{ cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ width: 8, height: 36, borderRadius: 4, background: c.p < 0.3 ? 'var(--mal-danger)' : 'var(--mal-warn)' }}/>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}><span className="mal-mono" style={{ fontSize: 12 }}>{c.id}</span> · {c.cpt} · {c.dx}</div>
              <div style={{ fontSize: 12, color: 'var(--mal-mid)' }}>{c.issue}</div>
            </div>
            <Pill tone="danger" dot>{Math.round(c.p * 100)}%</Pill>
          </div>
        </Card>
      ))}
    </div>
  );
}

function HCCoderFix({ lang, setRoute, viewport }) {
  return (
    <div style={{ padding: viewport === 'desktop' ? 0 : 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {viewport === 'mobile' && <MobileTopBar title={lang === 'ar' ? 'إصلاح المطالبة' : 'Fix claim'} onBack={() => setRoute('queue')}/>}
      <Card padded>
        <div className="mal-caption">{lang === 'ar' ? 'مطالبة' : 'Claim'} CLM-26-0203</div>
        <div style={{ fontSize: 18, fontWeight: 500, marginTop: 4 }}>Daman · 99214 · I10</div>
        <div style={{ marginTop: 8 }}><Pill tone="danger" dot>{lang === 'ar' ? 'احتمال رفض ٨٢٪' : 'P(reject) 82%'}</Pill></div>
      </Card>
      <Card padded style={{ background: 'linear-gradient(135deg, #EFEAFF, #FAF7EE)', border: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <MalOrb size={32}/>
          <div>
            <div style={{ fontSize: 12, color: 'var(--mal-mid)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{lang === 'ar' ? 'اقتراح مال' : 'Mal suggests'}</div>
            <div style={{ fontSize: 14, marginTop: 6, lineHeight: 1.5 }}>
              {lang === 'ar'
                ? 'أضف رمز التشخيص الثانوي E11.9 وارفق طلب التصريح المسبق #PA-2026-1183. هذا يرفع احتمال الموافقة إلى ٩١٪.'
                : 'Add secondary Dx E11.9 and attach prior-auth ref #PA-2026-1183. This raises P(approve) to 91%.'}
            </div>
          </div>
        </div>
      </Card>
      <Field label={lang === 'ar' ? 'تشخيص ثانوي' : 'Secondary Dx'}><Input defaultValue="E11.9. Type 2 diabetes mellitus"/></Field>
      <Field label={lang === 'ar' ? 'مرجع التصريح' : 'Prior-auth ref'}><Input defaultValue="PA-2026-1183"/></Field>
      <Button kind="primary" size="lg" full icon="check" onClick={() => {
        if (window.MalSession) window.MalSession.saveSlice('hcCoderFixes', {
          ['CLM-26-0203']: {
            secondaryDx: 'E11.9', priorAuthRef: 'PA-2026-1183',
            pApproveBefore: 0.18, pApproveAfter: 0.91,
            savedAt: new Date().toISOString(),
          }
        });
        setRoute('queue');
      }}>{lang === 'ar' ? 'حفظ وإعادة الإرسال' : 'Save & resubmit'}</Button>
    </div>
  );
}

// ============================================================
// ANCHOR AP (Product 3)
// ============================================================
function AnchorAPApp({ route, setRoute, lang, viewport }) {
  const navItems = [
    { id: 'home',     icon: 'home',     label: lang === 'ar' ? 'الرئيسية' : 'Home' },
    { id: 'feed',     icon: 'invoice',  label: lang === 'ar' ? 'المدفوعات' : 'AP feed' },
    { id: 'panel',    icon: 'group',    label: lang === 'ar' ? 'الموردون' : 'Suppliers' },
    { id: 'auctions', icon: 'bolt',     label: lang === 'ar' ? 'المزادات' : 'Auctions' },
    { id: 'help',     icon: 'message',  label: lang === 'ar' ? 'المساعدة' : 'Help' },
  ];
  const Page = {
    home: <AnchorAPHome lang={lang} viewport={viewport} setRoute={setRoute}/>,
    feed: <AnchorAPFeed lang={lang} viewport={viewport}/>,
    panel: <AnchorAPPanel lang={lang} viewport={viewport}/>,
    auctions: <AnchorAuctionAdmin lang={lang} viewport={viewport}/>,
    help: <PlaceholderHelp lang={lang}/>,
  };
  if (viewport === 'mobile') return <>
    <MobileTopBar title="Aldar Properties" subtitle={lang === 'ar' ? 'إدارة الذمم الدائنة' : 'AP / Procurement'} right={<IconBtn icon="bell" size={32}/>}/>
    <div style={{ flex: 1 }}>{Page[route] || Page.home}</div>
    <MobileTabBar items={navItems} active={route} onChange={setRoute}/>
  </>;
  return <DesktopShell persona="Anchor AP" productLabel={lang === 'ar' ? 'تمويل سلسلة التوريد' : 'Anchor SCF'}
    navItems={navItems} active={route} onChange={setRoute} lang={lang}>{Page[route] || Page.home}</DesktopShell>;
}

function AnchorAPHome({ lang, viewport, setRoute }) {
  return (
    <div style={{ padding: viewport === 'desktop' ? 0 : 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        <Card padded><Stat label={lang === 'ar' ? 'فواتير معتمدة' : 'Approved AP'} value="AED 142M" delta="+18%"/></Card>
        <Card padded><Stat label={lang === 'ar' ? 'موردون فعّالون' : 'Active suppliers'} value="487"/></Card>
        <Card padded><Stat label={lang === 'ar' ? 'مزاد اليوم' : 'Today\'s auction'} value="12:00" sub={lang === 'ar' ? 'يبدأ بعد ١:٢٠' : 'starts 1h 20m'}/></Card>
        <Card padded><Stat label={lang === 'ar' ? 'وفر الفائدة' : 'Float captured'} value="AED 412K" delta="+9%"/></Card>
      </div>
      <Card padded={false}>
        <div style={{ padding: 18, borderBottom: '1px solid var(--mal-line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="mal-h2">{lang === 'ar' ? 'دفعات اليوم' : 'Today\'s AP feed'}</div>
          <Button kind="secondary" size="sm" icon="upload">{lang === 'ar' ? 'استيراد' : 'Sync ERP'}</Button>
        </div>
        <table className="mal-table">
          <thead><tr><th>{lang === 'ar' ? 'رقم الفاتورة' : 'Invoice'}</th><th>{lang === 'ar' ? 'المورد' : 'Supplier'}</th>
            <th>{lang === 'ar' ? 'المبلغ' : 'Amount'}</th><th>{lang === 'ar' ? 'الاستحقاق' : 'Due'}</th><th>{lang === 'ar' ? 'حالة' : 'Status'}</th></tr></thead>
          <tbody>
            {[
              ['INV-AL-23311', 'Pinnacle Contracting LLC', 412000, '+62d', 'approved'],
              ['INV-AL-23310', 'Atlas Packaging FZ', 87600, '+58d', 'approved'],
              ['INV-AL-23309', 'Marina IT Services', 124000, '+45d', 'auction'],
              ['INV-AL-23308', 'Pearl Logistics LLC', 296500, '+72d', 'auction'],
              ['INV-AL-23307', 'Northstar Equipment', 198400, '+30d', 'paid'],
            ].map((r, i) => (
              <tr key={i}>
                <td className="mal-mono">{r[0]}</td><td>{r[1]}</td>
                <td className="mal-num">AED {r[2].toLocaleString()}</td><td>{r[3]}</td>
                <td><Pill tone={r[4] === 'paid' ? 'success' : r[4] === 'auction' ? 'info' : 'neutral'} dot>{r[4]}</Pill></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function AnchorAPFeed({ lang, viewport }) { return AnchorAPHome({ lang, viewport, setRoute: () => {} }); }
function AnchorAPPanel({ lang, viewport }) {
  return (
    <div style={{ padding: viewport === 'desktop' ? 0 : 18 }}>
      {viewport === 'desktop' && <h1 className="mal-h1" style={{ marginBottom: 14 }}>{lang === 'ar' ? 'قائمة الموردين' : 'Supplier panel'}</h1>}
      <Card padded={false}>
        <table className="mal-table">
          <thead><tr><th>{lang === 'ar' ? 'المورد' : 'Supplier'}</th><th>{lang === 'ar' ? 'فئة' : 'Tier'}</th><th>{lang === 'ar' ? 'حجم' : 'Volume YTD'}</th><th>{lang === 'ar' ? 'مزاد' : 'Auction'}</th></tr></thead>
          <tbody>
            {[
              ['Pinnacle Contracting LLC', 'A', 12400000, 'in'],
              ['Atlas Packaging FZ', 'A', 4280000, 'in'],
              ['Marina IT Services', 'B', 1820000, 'in'],
              ['Pearl Logistics LLC', 'A', 8970000, 'out'],
              ['Northstar Equipment', 'B', 3120000, 'in'],
            ].map((r, i) => (
              <tr key={i}>
                <td><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Avatar tone="lilac" name={r[0].slice(0, 2)} size={28}/><span>{r[0]}</span></div></td>
                <td><Pill tone={r[1] === 'A' ? 'success' : 'neutral'}>{r[1]}</Pill></td>
                <td className="mal-num">AED {r[2].toLocaleString()}</td>
                <td><Toggle on={r[3] === 'in'} onChange={()=>{}}/></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function AnchorAuctionAdmin({ lang, viewport }) {
  return (
    <div style={{ padding: viewport === 'desktop' ? 0 : 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {viewport === 'desktop' && <h1 className="mal-h1">{lang === 'ar' ? 'إعدادات المزاد' : 'Auction settings'}</h1>}
      <Card padded>
        <div className="mal-caption" style={{ marginBottom: 12 }}>{lang === 'ar' ? 'المزاد اليومي' : 'Daily auction'}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
          <span>{lang === 'ar' ? 'وقت الإغلاق' : 'Window'}</span><span className="mal-mono">12:00. 12:30 GST</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
          <span>{lang === 'ar' ? 'سعر أساسي' : 'Base rate'}</span><span className="mal-mono">1.50%/30d</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
          <span>{lang === 'ar' ? 'سقف العرض' : 'Max bid'}</span><span className="mal-mono">4.00%/30d</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
          <span>{lang === 'ar' ? 'رأس مال اليوم' : 'Capital pool today'}</span><span className="mal-mono">AED 8.0M</span>
        </div>
      </Card>
    </div>
  );
}

// ============================================================
// ANCHOR SUPPLIER (Product 3). Hero auction screen
// ============================================================
function AnchorSupplierApp({ route, setRoute, lang, viewport }) {
  const navItems = [
    { id: 'home',    icon: 'home',     label: lang === 'ar' ? 'الرئيسية' : 'Home' },
    { id: 'auction', icon: 'bolt',     label: lang === 'ar' ? 'المزاد' : 'Auction', badge: 'Live' },
    { id: 'won',     icon: 'spark',    label: lang === 'ar' ? 'المربوحة' : 'Won' },
    { id: 'help',    icon: 'message',  label: lang === 'ar' ? 'المساعدة' : 'Help' },
  ];
  const Page = {
    home: <AnchorSupHome lang={lang} setRoute={setRoute} viewport={viewport}/>,
    auction: <AnchorSupAuction lang={lang} setRoute={setRoute} viewport={viewport}/>,
    won: <AnchorSupWon lang={lang} viewport={viewport}/>,
    help: <PlaceholderHelp lang={lang}/>,
  };
  if (viewport === 'mobile') return <>
    <MobileTopBar title="Pinnacle Contracting" subtitle={lang === 'ar' ? 'مورد لـ Aldar' : 'Aldar supplier panel'} right={<IconBtn icon="bell" size={32}/>}/>
    <div style={{ flex: 1 }}>{Page[route] || Page.home}</div>
    <MobileTabBar items={navItems} active={route} onChange={setRoute}/>
  </>;
  return <DesktopShell persona="Anchor Supplier" productLabel={lang === 'ar' ? 'تمويل سلسلة التوريد' : 'Anchor SCF'}
    navItems={navItems} active={route} onChange={setRoute} lang={lang}>{Page[route] || Page.home}</DesktopShell>;
}

function AnchorSupHome({ lang, setRoute, viewport }) {
  return (
    <div style={{ padding: viewport === 'desktop' ? 0 : 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Card padded style={{ background: 'linear-gradient(135deg, #FAF7EE 0%, #F0EBDE 100%)', border: 'none' }}>
        <div className="mal-caption">{lang === 'ar' ? 'فواتير قابلة للتمويل' : 'Approved-payable balance'}</div>
        <div className="mal-display-md mal-iri-text" style={{ fontStyle: 'italic', marginTop: 4 }}>AED 1,287,400</div>
        <div style={{ display: 'flex', gap: 14, marginTop: 14, fontSize: 12, color: 'var(--mal-mid)' }}>
          <span>3 {lang === 'ar' ? 'مرتكزات' : 'anchors'}</span><span>·</span>
          <span>{lang === 'ar' ? 'مزاد قادم ١٢:٠٠' : 'Auction at 12:00'}</span>
        </div>
        <div style={{ marginTop: 14 }}>
          <Button kind="primary" icon="bolt" onClick={() => setRoute('auction')}>{lang === 'ar' ? 'افتح المزاد' : 'Open auction'}</Button>
        </div>
      </Card>
      {[
        { a: 'Aldar Properties', n: 'INV-AL-23311', amt: 412000, due: 62 },
        { a: 'Aldar Properties', n: 'INV-AL-23306', amt: 287000, due: 41 },
        { a: 'AD Ports Group', n: 'INV-ADP-08841', amt: 168000, due: 78 },
        { a: 'e&', n: 'INV-ETI-19022', amt: 420400, due: 55 },
      ].map((r, i) => (
        <Card key={i} padded>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Avatar tone="ink" name={r.a.slice(0, 2)}/>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{r.a}</div>
              <div style={{ fontSize: 11, color: 'var(--mal-mid)' }}>{r.n} · {lang === 'ar' ? 'استحقاق' : 'in'} {r.due}d</div>
            </div>
            <div className="mal-num" style={{ fontSize: 14, fontWeight: 500 }}>AED {r.amt.toLocaleString()}</div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// HERO: Dynamic discount auction
function AnchorSupAuction({ lang, setRoute, viewport }) {
  const baseRate = 1.5; // % / 30d
  const [bid, setBid] = usS(2.4);
  const [submitted, setSubmitted] = usS(false);
  const [remaining, setRemaining] = usS(740); // seconds
  const [stage, setStage] = usS('open'); // open, cleared
  usE(() => {
    const i = setInterval(() => setRemaining(r => Math.max(0, r - 1)), 1000);
    return () => clearInterval(i);
  }, []);
  usE(() => {
    if (submitted) {
      const t = setTimeout(() => setStage('cleared'), 2400);
      return () => clearTimeout(t);
    }
  }, [submitted]);
  const mins = Math.floor(remaining / 60), secs = remaining % 60;
  const inv = { id: 'INV-AL-23311', anchor: 'Aldar Properties', amt: 412000, due: 62 };
  const earlyBy = 56;
  const fee = inv.amt * (bid / 100) * (earlyBy / 30);
  const net = inv.amt - fee;
  return (
    <div>
      {viewport === 'mobile' && <MobileTopBar title={lang === 'ar' ? 'المزاد المباشر' : 'Live auction'} onBack={() => setRoute('home')}
        right={<Pill tone="danger" dot>LIVE</Pill>}/>}
      <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {stage === 'open' && <>
          <Card padded style={{ background: 'linear-gradient(135deg, #2A1F6F 0%, #1A1A28 100%)', color: '#fff', border: 'none', position: 'relative', overflow: 'hidden' }}>
            <div className="mal-orb" style={{ position: 'absolute', width: 240, height: 240, top: -100, insetInlineEnd: -100, opacity: .35, animation: 'mal-orb-spin 12s linear infinite' }}/>
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Pill tone="ink" dot style={{ background: 'rgba(255,255,255,.15)', color: '#fff' }}>{lang === 'ar' ? 'مباشر' : 'LIVE'}</Pill>
                <div style={{ fontSize: 12, opacity: .7 }}>{lang === 'ar' ? 'يُغلق خلال' : 'Closes in'}</div>
                <div className="mal-mono" style={{ fontSize: 14, fontVariantNumeric: 'tabular-nums' }}>
                  {String(mins).padStart(2,'0')}:{String(secs).padStart(2,'0')}
                </div>
              </div>
              <div style={{ marginTop: 14 }} className="mal-caption" >{inv.anchor} · {inv.id}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
                <span style={{ fontFamily: 'var(--mal-font-display)', fontSize: 38, fontStyle: 'italic' }}>AED {Math.round(net).toLocaleString()}</span>
                <span style={{ fontSize: 12, opacity: .7 }}>{lang === 'ar' ? 'صافي إن فزت' : 'net if you win'}</span>
              </div>
              <div style={{ fontSize: 12, opacity: .7, marginTop: 4 }}>{lang === 'ar' ? `أبكر بـ ${earlyBy} يوم` : `${earlyBy}d earlier than +${inv.due}d`}</div>
            </div>
          </Card>

          <Card padded>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
              <div className="mal-caption">{lang === 'ar' ? 'عرضك' : 'Your bid'}</div>
              <div className="mal-num" style={{ fontFamily: 'var(--mal-font-display)', fontSize: 28, fontStyle: 'italic' }}>{bid.toFixed(2)}<span style={{ fontSize: 14, color: 'var(--mal-mid)' }}>%/30d</span></div>
            </div>
            <input type="range" min="1.5" max="4.0" step="0.05" value={bid} onChange={e => setBid(+e.target.value)} style={{ width: '100%', accentColor: 'var(--mal-ink)' }}/>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--mal-mid)', marginTop: 4 }}>
              <span>{lang === 'ar' ? 'أساسي' : 'Base'} 1.50%</span>
              <span>{lang === 'ar' ? 'سقف' : 'Cap'} 4.00%</span>
            </div>
            {/* Bid distribution histogram */}
            <div style={{ marginTop: 18 }}>
              <div className="mal-caption" style={{ marginBottom: 6 }}>{lang === 'ar' ? 'توزيع العروض الحالي' : 'Live bid distribution'}</div>
              <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 60 }}>
                {[6, 12, 22, 38, 52, 78, 94, 84, 62, 38, 22, 14, 8, 4].map((h, i) => {
                  const r = 1.5 + i * 0.18;
                  const inBucket = Math.abs(r - bid) < 0.18;
                  return <div key={i} style={{
                    flex: 1, height: h + '%',
                    background: inBucket ? 'var(--mal-ink)' : 'var(--mal-line)', borderRadius: 2
                  }}/>;
                })}
              </div>
            </div>
          </Card>

          <Card padded style={{ background: 'var(--mal-surface-2)', border: 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13 }}>
              <span style={{ color: 'var(--mal-mid)' }}>{lang === 'ar' ? 'فاتورة' : 'Invoice'}</span><span className="mal-num">AED {inv.amt.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13 }}>
              <span style={{ color: 'var(--mal-mid)' }}>{lang === 'ar' ? 'خصم' : 'Discount'}</span><span className="mal-num" style={{ color: 'var(--mal-danger)' }}>−AED {Math.round(fee).toLocaleString()}</span>
            </div>
            <div style={{ height: 1, background: 'var(--mal-line)', margin: '6px 0' }}/>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 14, fontWeight: 500 }}>
              <span>{lang === 'ar' ? 'صافي اليوم' : 'Net today'}</span><span className="mal-num">AED {Math.round(net).toLocaleString()}</span>
            </div>
          </Card>

          <Button kind="primary" size="lg" full icon="send" onClick={() => {
            if (window.MalSession) window.MalSession.saveSlice('anchorBids', {
              [inv.id]: {
                anchor: inv.anchor, invoiceAmt: inv.amt,
                bidPct: bid, earlyByDays: earlyBy,
                netIfWin: Math.round(net),
                submittedAt: new Date().toISOString(),
              }
            });
            setSubmitted(true);
          }} disabled={submitted}>
            {submitted ? (lang === 'ar' ? 'في انتظار الإغلاق…' : 'Waiting for clear…') : (lang === 'ar' ? 'قدّم العرض' : 'Submit bid')}
          </Button>
        </>}

        {stage === 'cleared' && <ClearedPanel lang={lang} bid={bid} cleared={2.20} won={bid >= 2.20} net={Math.round(inv.amt - inv.amt * 0.022 * (earlyBy / 30))} setRoute={setRoute}/>}
      </div>
    </div>
  );
}

function ClearedPanel({ lang, bid, cleared, won, net, setRoute }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center', padding: 12, animation: 'mal-fade-up .5s ease' }}>
      <div className="mal-orb" style={{ width: 90, height: 90, animation: 'mal-orb-spin 8s linear infinite' }}/>
      <div className="mal-display-md mal-iri-text" style={{ fontStyle: 'italic' }}>{won ? (lang === 'ar' ? 'فزت' : 'You won') : (lang === 'ar' ? 'لم تفز' : 'No fill')}</div>
      <Card padded style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
          <span style={{ color: 'var(--mal-mid)' }}>{lang === 'ar' ? 'سعر التسوية' : 'Cleared rate'}</span><span className="mal-num">{cleared.toFixed(2)}%/30d</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
          <span style={{ color: 'var(--mal-mid)' }}>{lang === 'ar' ? 'عرضك' : 'Your bid'}</span><span className="mal-num">{bid.toFixed(2)}%</span>
        </div>
        {won && <>
          <div style={{ height: 1, background: 'var(--mal-line)', margin: '6px 0' }}/>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 14, fontWeight: 500 }}>
            <span>{lang === 'ar' ? 'إلى حسابك' : 'To your account'}</span><span className="mal-num">AED {net.toLocaleString()}</span>
          </div>
        </>}
      </Card>
      <Button kind="secondary" full onClick={() => setRoute('home')}>{lang === 'ar' ? 'تمّ' : 'Done'}</Button>
    </div>
  );
}

function AnchorSupWon({ lang, viewport }) {
  return (
    <div style={{ padding: viewport === 'desktop' ? 0 : 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {viewport === 'desktop' && <h1 className="mal-h1">{lang === 'ar' ? 'مزادات سابقة' : 'Past auctions'}</h1>}
      <Card padded={false}>
        <table className="mal-table">
          <thead><tr><th>{lang === 'ar' ? 'تاريخ' : 'Date'}</th><th>{lang === 'ar' ? 'فاتورة' : 'Invoice'}</th><th>{lang === 'ar' ? 'عرضك' : 'Bid'}</th><th>{lang === 'ar' ? 'تسوية' : 'Cleared'}</th><th>{lang === 'ar' ? 'صافي' : 'Net'}</th></tr></thead>
          <tbody>
            {[
              ['10 Oct', 'INV-AL-23306', '2.20%', '2.10%', 'AED 268,300'],
              ['09 Oct', 'INV-ETI-19011', '1.95%', '2.05%', '—'],
              ['07 Oct', 'INV-ADP-08840', '2.40%', '2.30%', 'AED 162,400'],
            ].map((r, i) => (
              <tr key={i}>{r.map((c, j) => <td key={j} className={j > 0 ? 'mal-num' : ''}>{c}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

Object.assign(window, { SupplierApp, HealthcareOpsApp, HealthcareCoderApp, AnchorAPApp, AnchorSupplierApp });
