/* eslint-disable */
// Mal — Marketing landing + Design system page.

// ============================================================
// LANDING PAGE
// ============================================================
function MalLanding({ lang = 'en', viewport = 'desktop', onLaunch }) {
  const isAr = lang === 'ar';
  return (
    <div dir={isAr ? 'rtl' : 'ltr'} style={{ fontFamily: 'var(--mal-font-ui)', color: 'var(--mal-ink)', background: 'var(--mal-surface)', minHeight: '100%' }}>
      {/* Top nav */}
      <header style={{ height: 64, paddingInline: viewport === 'mobile' ? 18 : 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--mal-line)', background: 'var(--mal-surface)' }}>
        <MalLogo size={22}/>
        {viewport === 'desktop' && <nav style={{ display: 'flex', gap: 24, fontSize: 13, color: 'var(--mal-mid)' }}>
          {['Smart Invoice','Claims Engine','Anchor SCF','Pricing','About'].map(n =>
            <a key={n} href="#" style={{ color: 'inherit', textDecoration: 'none' }}>{n}</a>)}
        </nav>}
        <div style={{ display: 'flex', gap: 8 }}>
          <Button kind="ghost" size="sm">{isAr ? 'دخول' : 'Sign in'}</Button>
          <Button kind="primary" size="sm" iconRight="arrow" onClick={onLaunch}>{isAr ? 'ابدأ' : 'Get started'}</Button>
        </div>
      </header>

      {/* Hero */}
      <section style={{ paddingInline: viewport === 'mobile' ? 18 : 56, paddingBlock: viewport === 'mobile' ? 40 : 88, display: 'grid', gridTemplateColumns: viewport === 'desktop' ? '1.2fr 1fr' : '1fr', gap: 40, alignItems: 'center' }}>
        <div>
          <Pill tone="ink" dot>{isAr ? 'مرخّص من سلطة دبي للخدمات المالية' : 'DFSA-licensed · Abu Dhabi'}</Pill>
          <h1 className="mal-display" style={{ fontSize: viewport === 'desktop' ? 96 : 56, marginTop: 18, fontStyle: 'italic' }}>
            {isAr ? <>رأس مال<br/><span className="mal-iri-text">يتحرّك بسرعة التجارة.</span></> : <>Capital that moves<br/>at the <span className="mal-iri-text">speed of trade.</span></>}
          </h1>
          <p className="mal-body" style={{ marginTop: 20, color: 'var(--mal-mid)', maxWidth: 520 }}>
            {isAr ? 'منصّة تمويل واحدة لرواد الأعمال في الإمارات. ادفع موردينك الآن، اقبض من عملائك مبكراً، وموّل مطالباتك الصحية، كل ذلك في دقائق وبضمانة بياناتك.' : 'One credit platform for UAE SMEs. Pay suppliers now, get paid by buyers earlier, and advance healthcare claims — in minutes, underwritten by your own data.'}
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 28, flexWrap: 'wrap' }}>
            <Button kind="primary" size="lg" iconRight="arrow" onClick={onLaunch}>{isAr ? 'افتح حساباً' : 'Open an account'}</Button>
            <Button kind="secondary" size="lg" icon="play">{isAr ? 'شاهد كيف' : 'Watch the 90s tour'}</Button>
          </div>
          <div style={{ display: 'flex', gap: 24, marginTop: 36, fontSize: 12, color: 'var(--mal-mid)', flexWrap: 'wrap' }}>
            <span>{isAr ? 'تحت إشراف ADGM' : 'Regulated by ADGM FSRA'}</span>
            <span>·</span>
            <span>AECB · UAE Pass · Peppol</span>
            <span>·</span>
            <span>{isAr ? 'متاح بالعربية والإنجليزية' : 'EN · AR'}</span>
          </div>
        </div>
        {viewport === 'desktop' && (
          <div style={{ position: 'relative', height: 480, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="mal-orb" style={{ width: 380, height: 380, animation: 'mal-orb-spin 22s linear infinite' }}/>
            <div style={{ position: 'absolute', insetInlineEnd: 0, top: 30, background: 'var(--mal-paper)', border: '1px solid var(--mal-line)', borderRadius: 16, padding: 14, boxShadow: 'var(--mal-sh-3)', width: 240 }}>
              <div className="mal-caption">{isAr ? 'تمت الموافقة' : 'Approved'}</div>
              <div className="mal-display-sm" style={{ fontStyle: 'italic', marginTop: 4 }}>AED 850,000</div>
              <div style={{ fontSize: 11, color: 'var(--mal-mid)', marginTop: 4 }}>{isAr ? 'حد ائتماني · فئة A' : 'Credit limit · Tier A'}</div>
            </div>
            <div style={{ position: 'absolute', insetInlineStart: 0, bottom: 40, background: 'var(--mal-paper)', border: '1px solid var(--mal-line)', borderRadius: 16, padding: 14, boxShadow: 'var(--mal-sh-3)', width: 220 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Pill tone="success" dot>{isAr ? 'مموّل' : 'Wired'}</Pill>
                <span style={{ fontSize: 11, color: 'var(--mal-mid)' }}>2m ago</span>
              </div>
              <div className="mal-num" style={{ fontStyle: 'italic', fontFamily: 'var(--mal-font-display)', fontSize: 28, marginTop: 6 }}>AED 222,250</div>
              <div style={{ fontSize: 11, color: 'var(--mal-mid)' }}>{isAr ? 'إلى أطلس للتغليف' : 'to Atlas Packaging'}</div>
            </div>
          </div>
        )}
      </section>

      {/* Stats strip */}
      <section style={{ paddingInline: viewport === 'mobile' ? 18 : 56, paddingBlock: 32, borderBlock: '1px solid var(--mal-line)', background: 'var(--mal-surface-2)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: viewport === 'desktop' ? 'repeat(4, 1fr)' : 'repeat(2, 1fr)', gap: 24 }}>
          {[
            ['AED 12B+', isAr ? 'فرصة سوقية' : 'TAM in UAE SME credit'],
            ['<4h', isAr ? 'إلى تمويل' : 'to first wire'],
            ['400K+', isAr ? 'منشأة صغيرة ومتوسطة' : 'SMEs in UAE'],
            ['85%', isAr ? 'بدون كشف بنكي ورقي' : 'fully digital onboarding'],
          ].map(([v, l], i) => (
            <div key={i}>
              <div className="mal-display-sm" style={{ fontStyle: 'italic' }}>{v}</div>
              <div style={{ fontSize: 12, color: 'var(--mal-mid)', marginTop: 4 }}>{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Three products */}
      <section style={{ paddingInline: viewport === 'mobile' ? 18 : 56, paddingBlock: viewport === 'mobile' ? 40 : 88 }}>
        <div className="mal-caption">{isAr ? 'ثلاث منتجات' : 'Three products'}</div>
        <h2 className="mal-display" style={{ fontSize: viewport === 'desktop' ? 56 : 36, marginTop: 12, marginBottom: 36, fontStyle: 'italic' }}>
          {isAr ? 'تمويل لكل دورة في عملك.' : 'Financing for every cycle in your business.'}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: viewport === 'desktop' ? 'repeat(3, 1fr)' : '1fr', gap: 14 }}>
          <ProductCard num="01" tone="lilac" iri="linear-gradient(135deg, #C9B7E8, #B6CFE8)"
            title={isAr ? 'الفاتورة الذكية' : 'Smart Invoice'}
            tagline={isAr ? 'ادفع واستلم بين الشركات' : 'B2B Pay & Get Paid'}
            desc={isAr ? 'مشترٍ يحصل على ٥ خطط دفع. مورّد يحصل على نقد فوري. مال يُسوّيها بينهما.' : 'The buyer picks from 5 payment plans. The supplier gets paid in 4 hours. Mal settles in between.'}
            bullets={[isAr ? '٥ خطط دفع للمشتري' : '5 plans for buyer', isAr ? 'سداد ٤ ساعات للمورد' : '4-hour wire to supplier', isAr ? 'بدون رجوع متاح' : 'Non-recourse option']}
            personas={[isAr ? 'مشتري' : 'Buyer SME', isAr ? 'مورّد' : 'Supplier SME']}
            onClick={onLaunch}/>
          <ProductCard num="02" tone="coral" iri="linear-gradient(135deg, #F0B7C2, #FBD9B5)"
            title={isAr ? 'محرّك المطالبات' : 'Claims Engine'}
            tagline={isAr ? 'تمويل الذمم الصحية' : 'Healthcare Receivables'}
            desc={isAr ? 'سلفة على مطالبات التأمين قبل ٧٥ يوماً، مع نموذج تنبؤي يصلح المطالبات قبل الإرسال.' : 'Advance insurance claims 75 days early, with predictive scoring that fixes claims before they\'re submitted.'}
            bullets={[isAr ? 'حتى ٨٥٪ سلفة' : 'Up to 85% advance', isAr ? 'نموذج موافقة تنبؤي' : 'Predictive approval model', isAr ? 'تكامل HCP' : 'EMR / HCP integration']}
            personas={[isAr ? 'إدارة العيادة' : 'Provider Ops', isAr ? 'فريق الترميز' : 'Coding desk']}
            onClick={onLaunch}/>
          <ProductCard num="03" tone="ink" iri="linear-gradient(135deg, #2A1F6F, #5A47C2)"
            title={isAr ? 'تمويل سلسلة التوريد' : 'Anchor SCF'}
            tagline={isAr ? 'بقيادة الشركات الكبرى' : 'Anchor-led, dynamic-discount'}
            desc={isAr ? 'الشركات الكبرى تربط نظام مدفوعاتها. الموردون يقدّمون عروضاً تنافسية للسداد المبكّر.' : 'Anchors plug their AP. Suppliers bid for early payment in a daily auction. Mal funds the winning rate.'}
            bullets={[isAr ? 'مزاد يومي' : 'Daily auction', isAr ? 'تكامل ERP' : 'SAP / Oracle / NetSuite', isAr ? 'فائدة محسّنة للجميع' : 'Optimised yield, both sides']}
            personas={[isAr ? 'إدارة الذمم' : 'Anchor AP', isAr ? 'مورّد المرتكز' : 'Anchor Supplier']}
            onClick={onLaunch}/>
        </div>
      </section>

      {/* How it works (Smart Invoice) */}
      <section style={{ paddingInline: viewport === 'mobile' ? 18 : 56, paddingBlock: 64, background: 'var(--mal-paper)', borderBlock: '1px solid var(--mal-line)' }}>
        <div className="mal-caption">{isAr ? 'كيف تعمل الفاتورة الذكية' : 'How Smart Invoice works'}</div>
        <h2 className="mal-display" style={{ fontSize: viewport === 'desktop' ? 44 : 32, marginTop: 12, marginBottom: 32, fontStyle: 'italic' }}>
          {isAr ? 'فاتورة واحدة. خطّتا تمويل. أربع ساعات.' : 'One invoice. Two financings. Four hours.'}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: viewport === 'desktop' ? 'repeat(4, 1fr)' : '1fr', gap: 14 }}>
          {[
            { n: 1, h: isAr ? 'فاتورة' : 'Invoice raised', s: isAr ? 'المورد يصدر فاتورة عبر Peppol أو يرفعها للمنصّة.' : 'Supplier issues an e-invoice via Peppol or uploads to Mal.', i: 'invoice' },
            { n: 2, h: isAr ? 'خطّة المشتري' : 'Buyer picks plan', s: isAr ? '٥ خطط: مباشر، BNPL ٣٠/٦٠/٩٠، أو أقساط.' : 'Direct, BNPL 30/60/90, or installments — buyer chooses.', i: 'card' },
            { n: 3, h: isAr ? 'سلفة المورّد' : 'Supplier accepts', s: isAr ? 'يقبل ٩٣٪ سلفة الآن، ٧٪ احتياطي بعد السداد.' : 'Accepts 93% advance now, 7% holdback on settlement.', i: 'bolt' },
            { n: 4, h: isAr ? 'مال يُسوّي' : 'Mal settles', s: isAr ? 'الخصم البنكي يُجمّع من المشتري عبر الخطّة المختارة.' : 'Direct debit collects from buyer per their chosen plan.', i: 'check' },
          ].map(s => (
            <Card key={s.n} padded>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="mal-num" style={{ fontFamily: 'var(--mal-font-display)', fontStyle: 'italic', fontSize: 32, color: 'var(--mal-primary-3)' }}>0{s.n}</div>
                {Ico[s.i]({ width: 18, height: 18, stroke: 'var(--mal-mid)' })}
              </div>
              <div className="mal-h3" style={{ marginTop: 14 }}>{s.h}</div>
              <div style={{ fontSize: 13, color: 'var(--mal-mid)', marginTop: 6 }}>{s.s}</div>
            </Card>
          ))}
        </div>
      </section>

      {/* Personas band */}
      <section style={{ paddingInline: viewport === 'mobile' ? 18 : 56, paddingBlock: 64 }}>
        <div className="mal-caption">{isAr ? 'لمن صُمّمت' : 'Built for'}</div>
        <h2 className="mal-display" style={{ fontSize: viewport === 'desktop' ? 44 : 30, marginTop: 12, marginBottom: 28, fontStyle: 'italic' }}>
          {isAr ? 'لكل دور وجهة عمل خاصة.' : 'Each role gets its own surface.'}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: viewport === 'desktop' ? 'repeat(3, 1fr)' : '1fr', gap: 10 }}>
          {[
            { name: isAr ? 'مشتري المنشأة' : 'Buyer SME', sub: isAr ? 'يدفع ٥ خطط · حد ائتماني واحد' : '5 ways to pay · one limit', tone: 'lilac', icon: 'card' },
            { name: isAr ? 'مورّد المنشأة' : 'Supplier SME', sub: isAr ? 'يقبض اليوم · يعرف الفرع' : 'Get paid today · know your buyer', tone: 'sky', icon: 'truck' },
            { name: isAr ? 'إدارة العيادة' : 'Provider Ops', sub: isAr ? 'سلفة المطالبات · لوحة DSO' : 'Advance claims · DSO dashboard', tone: 'coral', icon: 'hospital' },
            { name: isAr ? 'فريق الترميز' : 'Coding desk', sub: isAr ? 'إصلاح المطالبات · نموذج تنبؤي' : 'Fix claims · predictive model', tone: 'peach', icon: 'shield' },
            { name: isAr ? 'إدارة الذمم' : 'Anchor AP', sub: isAr ? 'مدفوعات · مزاد يومي' : 'AP feed · daily auction', tone: 'ink', icon: 'building' },
            { name: isAr ? 'مورّد المرتكز' : 'Anchor Supplier', sub: isAr ? 'عروض تنافسية · سيولة' : 'Bid · liquidity', tone: 'lilac', icon: 'trade' },
          ].map((p, i) => (
            <Card key={i} padded onClick={onLaunch} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14 }}>
              <Avatar tone={p.tone} name={Ico[p.icon]({ width: 16, height: 16 })} size={42}/>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{p.name}</div>
                <div style={{ fontSize: 12, color: 'var(--mal-mid)' }}>{p.sub}</div>
              </div>
              {Ico.arrow({ color: 'var(--mal-mid)' })}
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ paddingInline: viewport === 'mobile' ? 18 : 56, paddingBlock: 88, textAlign: 'center', background: 'linear-gradient(135deg, #2A1F6F 0%, #1A1A28 100%)', color: '#fff', position: 'relative', overflow: 'hidden' }}>
        <div className="mal-orb" style={{ position: 'absolute', width: 480, height: 480, top: -200, insetInlineEnd: -200, opacity: .3, animation: 'mal-orb-spin 30s linear infinite' }}/>
        <div className="mal-orb" style={{ position: 'absolute', width: 320, height: 320, bottom: -160, insetInlineStart: -160, opacity: .25, animation: 'mal-orb-spin 40s linear infinite reverse' }}/>
        <div style={{ position: 'relative', maxWidth: 720, margin: '0 auto' }}>
          <h2 className="mal-display" style={{ fontSize: viewport === 'desktop' ? 64 : 38, fontStyle: 'italic' }}>
            {isAr ? 'سيولة تتحرّك بسرعتك.' : 'Cash that keeps up with you.'}
          </h2>
          <p style={{ marginTop: 20, color: 'rgba(255,255,255,.7)' }}>
            {isAr ? 'افتح حسابك في ١٠ دقائق. اطلب أول تمويل اليوم.' : 'Open an account in 10 minutes. Request your first wire today.'}
          </p>
          <div style={{ marginTop: 28, display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button kind="iri" size="lg" iconRight="arrow" onClick={onLaunch}>{isAr ? 'ابدأ' : 'Get started'}</Button>
            <Button kind="ghost" size="lg" style={{ color: '#fff' }}>{isAr ? 'تحدّث إلى المبيعات' : 'Talk to sales'}</Button>
          </div>
        </div>
      </section>

      <footer style={{ paddingInline: viewport === 'mobile' ? 18 : 56, paddingBlock: 36, fontSize: 11, color: 'var(--mal-mid)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <span>© 2026 Mal Capital Ltd. {isAr ? 'تحت إشراف ADGM FSRA.' : 'Regulated by ADGM FSRA.'}</span>
        <span>{isAr ? 'الخصوصية · الشروط · الأمان' : 'Privacy · Terms · Security'}</span>
      </footer>
    </div>
  );
}

function ProductCard({ num, title, tagline, desc, bullets, personas, iri, onClick }) {
  return (
    <Card padded onClick={onClick} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 14, height: '100%', padding: 24, transition: 'transform .14s, box-shadow .14s' }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = 'var(--mal-sh-2)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--mal-sh-1)'; }}>
      <div style={{ height: 120, borderRadius: 12, background: iri, position: 'relative', overflow: 'hidden' }}>
        <div className="mal-orb" style={{ position: 'absolute', width: 90, height: 90, top: -20, insetInlineEnd: -20, opacity: .8 }}/>
        <div style={{ position: 'absolute', insetInlineStart: 16, bottom: 12, color: 'rgba(0,0,0,.6)' }}>
          <div className="mal-num" style={{ fontFamily: 'var(--mal-font-display)', fontStyle: 'italic', fontSize: 28 }}>{num}</div>
        </div>
      </div>
      <div>
        <div style={{ fontSize: 11, color: 'var(--mal-mid)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{tagline}</div>
        <div className="mal-h2" style={{ marginTop: 4, fontStyle: 'italic', fontFamily: 'var(--mal-font-display)' }}>{title}</div>
      </div>
      <div style={{ fontSize: 13, color: 'var(--mal-mid)', lineHeight: 1.5 }}>{desc}</div>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {bullets.map((b, i) => (
          <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            {Ico.check({ width: 14, height: 14, stroke: 'var(--mal-success)' })}{b}
          </li>
        ))}
      </ul>
      <div style={{ marginTop: 'auto', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {personas.map(p => <Pill key={p} tone="neutral">{p}</Pill>)}
      </div>
    </Card>
  );
}

// ============================================================
// DESIGN SYSTEM PAGE
// ============================================================
function MalSystemPage() {
  return (
    <div style={{ background: 'var(--mal-surface)', color: 'var(--mal-ink)', padding: 56, fontFamily: 'var(--mal-font-ui)' }}>
      <header style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 48, borderBottom: '1px solid var(--mal-line)', paddingBottom: 32 }}>
        <div>
          <MalLogo size={32}/>
          <h1 className="mal-display" style={{ fontSize: 96, marginTop: 18, fontStyle: 'italic' }}>The Mal system.</h1>
          <p style={{ color: 'var(--mal-mid)', fontSize: 16, maxWidth: 540, marginTop: 12 }}>
            Warm pearl, iridescent indigo, Instrument Serif numerals. A fintech aesthetic that whispers — for SMEs across the UAE.
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="mal-caption">v1.0 · 2026</div>
          <div style={{ fontSize: 12, color: 'var(--mal-mid)', marginTop: 4 }}>Light · Dark · Cozy · LTR · RTL</div>
        </div>
      </header>

      <Section label="01 · Color">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 10 }}>
          {[
            ['#FAF7EE', 'Surface'], ['#F4F0E2', 'Surface 2'], ['#FFFEF9', 'Paper'],
            ['#E8E3D6', 'Line'], ['#5C5C72', 'Mid'], ['#1A1A28', 'Ink 2'], ['#0B0B14', 'Ink'], ['#FFFFFF', 'Elev'],
          ].map(([c, l]) => <Swatch key={l} color={c} label={l}/>)}
        </div>
        <div style={{ height: 16 }}/>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 10 }}>
          {[
            ['#EFEAFF', 'Primary 50'], ['#5A47C2', 'Primary 3'], ['#3D2E94', 'Primary 2'], ['#2A1F6F', 'Primary'],
            ['#1F7A4F', 'Success'], ['#B86F1A', 'Warn'], ['#B83A3A', 'Danger'], ['#1F5BAA', 'Info'],
          ].map(([c, l]) => <Swatch key={l} color={c} label={l}/>)}
        </div>
        <div style={{ marginTop: 20, height: 96, borderRadius: 14, background: 'linear-gradient(120deg, #B6CFE8 0%, #C9B7E8 35%, #F0B7C2 70%, #FBD9B5 100%)', display: 'flex', alignItems: 'center', paddingInline: 24 }}>
          <span style={{ fontFamily: 'var(--mal-font-display)', fontSize: 24, fontStyle: 'italic', color: '#1A1A28' }}>Iridescent — sky · lilac · coral · peach</span>
        </div>
      </Section>

      <Section label="02 · Type">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 36 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="mal-display-xl" style={{ fontStyle: 'italic' }}>Aa</div>
            <div style={{ fontSize: 12, color: 'var(--mal-mid)' }}>Instrument Serif · Display</div>
            <div className="mal-display-lg" style={{ fontStyle: 'italic' }}>AED 850K</div>
            <div className="mal-display-md" style={{ fontStyle: 'italic' }}>Capital that moves.</div>
            <div className="mal-display-sm" style={{ fontStyle: 'italic' }}>Smart Invoice</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div><div className="mal-h1">Heading 1 · 28/30</div><div style={{ fontSize: 11, color: 'var(--mal-mid)' }}>Geist 500</div></div>
            <div><div className="mal-h2">Heading 2 · 22/26</div></div>
            <div><div className="mal-h3">Heading 3 · 17/22</div></div>
            <div><div className="mal-body">Body · 15/24 — The quick brown fox jumps over the lazy dog.</div></div>
            <div><div className="mal-body-sm">Body small · 13/19</div></div>
            <div><div className="mal-caption">Caption · 11 uppercase</div></div>
            <div className="mal-num" style={{ fontFamily: 'var(--mal-font-mono)', fontSize: 14 }}>AED 1,247,395.00</div>
          </div>
        </div>
      </Section>

      <Section label="03 · Spacing & Radii">
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 18 }}>
          {[4, 8, 12, 16, 24, 32, 48, 64].map(n => (
            <div key={n} style={{ textAlign: 'center' }}>
              <div style={{ width: n, height: n, background: 'var(--mal-ink)', marginInline: 'auto' }}/>
              <div className="mal-mono" style={{ fontSize: 11, marginTop: 6 }}>{n}</div>
            </div>
          ))}
        </div>
        <div style={{ height: 24 }}/>
        <div style={{ display: 'flex', gap: 14 }}>
          {[['xs', 6], ['sm', 10], ['md', 14], ['lg', 20], ['xl', 28], ['pill', 999]].map(([n, r]) => (
            <div key={n} style={{ textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, background: 'var(--mal-paper)', border: '1px solid var(--mal-line)', borderRadius: r }}/>
              <div className="mal-mono" style={{ fontSize: 11, marginTop: 6 }}>{n}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section label="04 · Iconography (40)">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 12 }}>
          {Object.keys(Ico).map(k => (
            <div key={k} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: 10, background: 'var(--mal-paper)', border: '1px solid var(--mal-line)', borderRadius: 10 }}>
              {Ico[k]({ width: 20, height: 20 })}
              <span className="mal-mono" style={{ fontSize: 10, color: 'var(--mal-mid)' }}>{k}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section label="05 · Components">
        <SubLabel>Buttons</SubLabel>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button kind="primary" icon="bolt">Primary</Button>
          <Button kind="secondary">Secondary</Button>
          <Button kind="ghost">Ghost</Button>
          <Button kind="iri" icon="spark">Iridescent</Button>
          <Button kind="primary" size="sm">Small</Button>
          <Button kind="primary" size="lg" iconRight="arrow">Large</Button>
          <Button kind="primary" disabled>Disabled</Button>
        </div>

        <SubLabel>Inputs & form</SubLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, maxWidth: 720 }}>
          <Field label="Trade licence"><Input defaultValue="DED-1247739"/></Field>
          <Field label="TRN" hint="15 digits"><Input placeholder="100…"/></Field>
          <Field label="Amount" error="Above your limit"><Input defaultValue="950,000"/></Field>
        </div>

        <SubLabel>Status pills</SubLabel>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Pill tone="success" dot>Approved</Pill>
          <Pill tone="warn" dot>Action needed</Pill>
          <Pill tone="danger" dot>Overdue</Pill>
          <Pill tone="info" dot>Financed</Pill>
          <Pill tone="neutral">Draft</Pill>
          <Pill tone="ink" dot>Tier A</Pill>
        </div>

        <SubLabel>Cards</SubLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          <Card padded><Stat label="Available limit" value="AED 612K" delta="+18%"/></Card>
          <Card padded style={{ background: 'linear-gradient(135deg, #2A1F6F, #1A1A28)', color: '#fff', border: 'none' }}>
            <div className="mal-caption" style={{ color: 'rgba(255,255,255,.7)' }}>Hero</div>
            <div className="mal-display-sm" style={{ fontStyle: 'italic', marginTop: 4 }}>AED 850,000</div>
          </Card>
          <Card padded><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Avatar tone="lilac"/>
            <div><div style={{ fontSize: 14, fontWeight: 500 }}>Aisha B.</div><div style={{ fontSize: 11, color: 'var(--mal-mid)' }}>Buyer</div></div>
          </div></Card>
        </div>

        <SubLabel>Table</SubLabel>
        <Card padded={false}>
          <table className="mal-table">
            <thead><tr><th>Invoice</th><th>Buyer</th><th>Status</th><th style={{ textAlign: 'end' }}>Amount</th></tr></thead>
            <tbody>
              {[
                ['INV-2026-0418', 'Atlas Packaging', 'open', 250000],
                ['INV-2026-0407', 'Marina IT', 'financed', 47800],
                ['INV-2026-0392', 'Pearl Logistics', 'paid', 128400],
              ].map((r, i) => (
                <tr key={i}>
                  <td className="mal-mono">{r[0]}</td><td>{r[1]}</td>
                  <td><Pill tone={r[2] === 'paid' ? 'success' : r[2] === 'financed' ? 'info' : 'neutral'} dot>{r[2]}</Pill></td>
                  <td className="mal-num" style={{ textAlign: 'end' }}>AED {r[3].toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <SubLabel>Empty state</SubLabel>
        <Card padded style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 36, textAlign: 'center' }}>
          <MalOrb size={56}/>
          <div className="mal-h3">Nothing to finance yet</div>
          <div style={{ fontSize: 13, color: 'var(--mal-mid)', maxWidth: 360 }}>Upload your first invoice or sync Peppol — Mal will price the offer in seconds.</div>
          <Button kind="primary" size="sm" icon="upload">Upload invoice</Button>
        </Card>

        <SubLabel>Toggles, tabs, ring, sparkline</SubLabel>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          <Toggle on={true} onChange={() => {}}/>
          <Toggle on={false} onChange={() => {}}/>
          <Tabs value="bnpl" onChange={() => {}} items={[{value:'direct',label:'Direct'},{value:'bnpl',label:'BNPL'},{value:'inst',label:'Installments'}]}/>
          <Ring pct={68} label="68%"/>
          <Sparkline values={[8, 12, 6, 18, 14, 22, 28, 24, 32, 36]} fill width={140} height={40}/>
        </div>
      </Section>

      <Section label="06 · Brand">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
          <Card padded style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: 36 }}>
            <MalOrb size={120} animated/>
            <div className="mal-caption">Mal orb · iridescent</div>
          </Card>
          <Card padded style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: 36, background: '#0B0B14', color: '#fff' }}>
            <MalLogo size={42} light/>
            <div className="mal-caption" style={{ color: 'rgba(255,255,255,.6)' }}>Wordmark · italic display</div>
          </Card>
          <Card padded style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: 36, background: 'linear-gradient(135deg, #FAF7EE, #F0EBDE)' }}>
            <span className="mal-display-md mal-iri-text" style={{ fontStyle: 'italic' }}>مال</span>
            <div className="mal-caption">Arabic logotype · IBM Plex Sans Arabic</div>
          </Card>
        </div>
      </Section>

      <Section label="07 · Motion">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          <Card padded><div className="mal-caption">Easings</div>
            <div style={{ marginTop: 12, fontSize: 13 }}>
              <div>swift · cubic-bezier(.2,.7,.2,1) · 140ms</div>
              <div>graceful · cubic-bezier(.3,.7,.3,1) · 320ms</div>
              <div>reveal · cubic-bezier(.16,1,.3,1) · 540ms</div>
            </div>
          </Card>
          <Card padded><div className="mal-caption">Orb spin</div>
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}><MalOrb size={80} animated/></div>
          </Card>
          <Card padded><div className="mal-caption">Count-up</div>
            <div className="mal-display-sm mal-iri-text" style={{ fontStyle: 'italic', marginTop: 12 }}>
              <CountUp to={850000} format={v => 'AED ' + v.toLocaleString()}/>
            </div>
          </Card>
        </div>
      </Section>
    </div>
  );
}

function Section({ label, children }) {
  return (
    <section style={{ marginBottom: 80 }}>
      <div className="mal-caption" style={{ marginBottom: 18 }}>{label}</div>
      {children}
    </section>
  );
}
function SubLabel({ children }) {
  return <div className="mal-caption" style={{ marginBlock: '24px 12px', fontSize: 10, opacity: .6 }}>{children}</div>;
}
function Swatch({ color, label }) {
  return (
    <div>
      <div style={{ height: 80, background: color, borderRadius: 10, border: '1px solid var(--mal-line)' }}/>
      <div style={{ fontSize: 12, fontWeight: 500, marginTop: 8 }}>{label}</div>
      <div className="mal-mono" style={{ fontSize: 11, color: 'var(--mal-mid)' }}>{color}</div>
    </div>
  );
}

Object.assign(window, { MalLanding, MalSystemPage });
