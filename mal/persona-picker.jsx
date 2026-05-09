/* eslint-disable */
// Mal — Persona picker.
// Shown after the user clicks "Get started" / "Open an account" on the landing.
// Six cards in a 2x3 grid (single-column on mobile). Hover-lifts.
// Uses existing primitives: Card, Avatar, Button, Pill, MalLogo, IconBtn.

const PERSONA_DETAILS = [
  {
    id: 'buyer',
    en: { title: 'Buyer SME', desc: 'Pay suppliers later. Spread invoices over BNPL or extend with a real term loan.', cta: 'Enter as Buyer', sample: 'Sample: AED 850K limit · 5 plans' },
    ar: { title: 'مشترٍ', desc: 'ادفع موردينك لاحقاً. وزّع فواتيرك على دفعات أو مدّدها بقرض حقيقي.', cta: 'الدخول كمشترٍ', sample: 'مثال: حدّ 850 ألف · 5 خطط' },
    tone: 'lilac', icon: 'card', product: 'Smart Invoice',
  },
  {
    id: 'supplier',
    en: { title: 'Supplier SME', desc: 'Get paid in 4 hours. CC us on any invoice — wire lands in your bank.', cta: 'Enter as Supplier', sample: 'Sample: 12 offers · AED 339K available' },
    ar: { title: 'مورّد', desc: 'احصل على نقدك خلال 4 ساعات. أضفنا في نسخة أي فاتورة وسيصلك التحويل.', cta: 'الدخول كمورّد', sample: 'مثال: 12 عرضاً · 339 ألفاً' },
    tone: 'sky', icon: 'truck', product: 'Smart Invoice',
  },
  {
    id: 'hcops',
    en: { title: 'Healthcare Provider — Ops', desc: 'Advance insurance claims same-day. DSO, batches, advance requests at a glance.', cta: 'Enter as HC Ops', sample: 'Sample: AED 2.3M eligible · 4 batches' },
    ar: { title: 'مقدّم رعاية صحيّة — العمليات', desc: 'موّل مطالبات التأمين في يوم واحد. شاهد الدفعات والطلبات.', cta: 'الدخول كعمليات', sample: 'مثال: 2.3 مليون · 4 دفعات' },
    tone: 'coral', icon: 'hospital', product: 'Claims Engine',
  },
  {
    id: 'hccoder',
    en: { title: 'Healthcare Provider — Coder', desc: 'Pre-submission claim review with predictive rejection scores. Fix before you file.', cta: 'Enter as Coder', sample: 'Sample: 12 claims need review' },
    ar: { title: 'مقدّم رعاية صحيّة — التكويد', desc: 'راجع المطالبات قبل التقديم مع نسب الرفض المتوقّعة.', cta: 'الدخول كمكوّد', sample: 'مثال: 12 مطالبة تحتاج مراجعة' },
    tone: 'peach', icon: 'shield', product: 'Claims Engine',
  },
  {
    id: 'anchorAP',
    en: { title: 'Anchor — AP', desc: 'Run the daily dynamic-discount auction across your supplier panel.', cta: 'Enter as Anchor AP', sample: 'Sample: 487 suppliers · noon auction' },
    ar: { title: 'الشركة الراسية — الحسابات الدائنة', desc: 'أَدِر مزاد الخصم اليومي عبر شبكة موردينك.', cta: 'الدخول كحسابات دائنة', sample: 'مثال: 487 مورّداً · مزاد ظهراً' },
    tone: 'ink', icon: 'building', product: 'Anchor SCF',
  },
  {
    id: 'anchorSup',
    en: { title: 'Anchor — Supplier', desc: 'Bid into the auction. Win the wire. Watch the rate clock.', cta: 'Enter as Anchor Supplier', sample: 'Sample: AED 1.28M payable · live bid' },
    ar: { title: 'الشركة الراسية — مورّد', desc: 'قدّم عرضك في المزاد. اكسب التحويل. راقب الساعة.', cta: 'الدخول كمورّد راسٍ', sample: 'مثال: 1.28 مليون · عرض مباشر' },
    tone: 'lilac', icon: 'trade', product: 'Anchor SCF',
  },
];

function PersonaPicker({ lang = 'en', setLang, onPick, onBack, isMobile }) {
  const isAr = lang === 'ar';
  const t = PERSONA_DETAILS;
  const Ico = window.MalIcon;

  return (
    <div dir={isAr ? 'rtl' : 'ltr'} style={{
      minHeight: '100vh', background: 'var(--mal-surface)', color: 'var(--mal-ink)',
      fontFamily: isAr ? 'var(--mal-font-ar)' : 'var(--mal-font-ui)',
      paddingBottom: 80,
    }}>
      {/* Top bar */}
      <header style={{
        height: 64, paddingInline: isMobile ? 16 : 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid var(--mal-line)', background: 'var(--mal-surface)',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <button onClick={onBack} style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'transparent', border: 'none', color: 'var(--mal-mid)',
          cursor: 'pointer', font: 'inherit', fontSize: 13, padding: 0,
        }} aria-label="Back to landing">
          <span style={{ display: 'inline-flex', transform: isAr ? 'scaleX(-1)' : 'none' }}>
            {Ico.arrowL ? Ico.arrowL({ width: 14, height: 14 }) : '←'}
          </span>
          {isAr ? 'الصفحة الرئيسية' : 'Back to landing'}
        </button>
        <MalLogo size={22} />
        <Tabs value={lang} onChange={setLang} size="sm" items={[
          { value: 'en', label: 'EN' }, { value: 'ar', label: 'AR' },
        ]} />
      </header>

      {/* Hero */}
      <section style={{
        paddingInline: isMobile ? 22 : 56,
        paddingBlock: isMobile ? 36 : 72,
        maxWidth: 1280, marginInline: 'auto',
      }}>
        <div className="mal-fade-up">
          <Pill tone="ink" dot>
            {isAr ? 'منصّة واحدة · ستّ تجارب' : 'One platform · six experiences'}
          </Pill>
          <h1 style={{
            fontFamily: 'var(--mal-font-display)',
            fontSize: isMobile ? 56 : 96,
            margin: '18px 0 0', lineHeight: 1.02, letterSpacing: '-0.02em',
            fontStyle: 'italic',
          }}>
            {isAr ? <>من أنت<br/><span className="mal-iri-text">اليوم؟</span></> : <>Who are you<br/><span className="mal-iri-text">today?</span></>}
          </h1>
          <p style={{
            marginTop: 18, color: 'var(--mal-mid)', maxWidth: 560,
            fontSize: isMobile ? 14 : 16, lineHeight: 1.5,
          }}>
            {isAr
              ? 'اختر التجربة المناسبة لدورك. كل واحدة تطلق رحلة كاملة بأرقام واقعية، تنبيهات حيّة، ومحاكاة كاملة من البداية للنهاية.'
              : 'Pick the experience that matches your role. Each one launches a full journey — realistic numbers, live signals, end-to-end simulation.'}
          </p>
        </div>

        {/* Persona grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
          gap: isMobile ? 14 : 18,
          marginTop: isMobile ? 32 : 48,
        }}>
          {t.map((p, i) => {
            const txt = p[lang] || p.en;
            return (
              <button key={p.id}
                onClick={() => onPick(p.id)}
                className="mal-persona-card"
                style={{
                  textAlign: isAr ? 'right' : 'left',
                  background: 'var(--mal-paper)',
                  border: '1px solid var(--mal-line)',
                  borderRadius: 'var(--mal-r-lg)',
                  padding: isMobile ? 20 : 24,
                  cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', gap: 14,
                  minHeight: 220,
                  position: 'relative', overflow: 'hidden',
                  transition: 'transform .18s ease, box-shadow .18s ease, border-color .18s ease',
                  font: 'inherit', color: 'inherit',
                  animationDelay: (i * 60) + 'ms',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = 'var(--mal-sh-3)';
                  e.currentTarget.style.borderColor = 'var(--mal-primary-3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = '';
                  e.currentTarget.style.boxShadow = '';
                  e.currentTarget.style.borderColor = 'var(--mal-line)';
                }}>
                {/* Soft brand orb in the corner */}
                <div aria-hidden style={{
                  position: 'absolute', top: -40, insetInlineEnd: -40, width: 140, height: 140,
                  background: 'conic-gradient(from 90deg, var(--mal-iri-1), var(--mal-iri-2), var(--mal-iri-3), var(--mal-iri-4), var(--mal-iri-1))',
                  borderRadius: '50%', filter: 'blur(28px)', opacity: 0.45,
                  pointerEvents: 'none',
                }}/>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative', zIndex: 1 }}>
                  <Avatar name={(txt.title || '').slice(0, 2)} tone={p.tone} size={44} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span className="mal-caption" style={{ color: 'var(--mal-mid)' }}>{p.product}</span>
                    <span style={{ fontFamily: 'var(--mal-font-display)', fontStyle: 'italic', fontSize: 22, lineHeight: 1, letterSpacing: '-0.01em' }}>
                      {txt.title}
                    </span>
                  </div>
                </div>

                <p style={{
                  margin: 0, color: 'var(--mal-mid)', fontSize: 13.5, lineHeight: 1.5,
                  position: 'relative', zIndex: 1,
                }}>{txt.desc}</p>

                <div style={{ flex: 1 }} />

                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  paddingTop: 12, borderTop: '1px solid var(--mal-line)', position: 'relative', zIndex: 1,
                }}>
                  <span className="mal-mono" style={{ fontSize: 11, color: 'var(--mal-mid-2)', letterSpacing: '.04em' }}>
                    {txt.sample}
                  </span>
                  <span aria-hidden style={{
                    width: 32, height: 32, borderRadius: 999,
                    background: 'var(--mal-primary)', color: '#fff',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    transform: isAr ? 'scaleX(-1)' : 'none',
                  }}>
                    {Ico.arrow ? Ico.arrow({ width: 14, height: 14 }) : '→'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Helper line */}
        <div style={{
          marginTop: isMobile ? 28 : 40,
          display: 'flex', alignItems: 'center', gap: 10,
          color: 'var(--mal-mid)', fontSize: 12,
          flexWrap: 'wrap',
        }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {Ico.shield ? Ico.shield({ width: 14, height: 14 }) : null}
            {isAr ? 'بيانات تجريبيّة فقط — لا توجد عمليّات حقيقيّة.' : 'Demo data only — no real money moves.'}
          </span>
          <span>·</span>
          <span>{isAr ? 'يمكنك تبديل الهويّة في أي وقت.' : 'Switch persona any time from the top bar.'}</span>
        </div>
      </section>
    </div>
  );
}

window.PersonaPicker = PersonaPicker;
