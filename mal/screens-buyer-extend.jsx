/* eslint-disable */
// Mal. Buyer Term-Extension product. The innovation: a true unsecured term loan
// stacked on top of a supplier's net-30/60/90 invoice. Buyer can extend the
// effective payment date by 3 / 6 / 9 / 12 months by taking a Mal-funded loan
// that pays the supplier on the original due date.
const { useState: uSx, useEffect: uEx, useMemo: uMx } = React;

// ---- math helpers (flat APR, equal monthly EMI) ----
function ext_calc(principal, tenorMo, apr) {
  // simple flat-fee model for clarity in the mock
  const profit = principal * (apr / 100) * (tenorMo / 12);
  const total = principal + profit;
  const emi = total / tenorMo;
  return { profit, total, emi };
}
const EXT_TENORS = [
  { mo: 3,  apr: 9.9,  badge: 'Best rate' },
  { mo: 6,  apr: 11.5, badge: null },
  { mo: 9,  apr: 13.0, badge: null },
  { mo: 12, apr: 14.5, badge: 'Lowest EMI' },
];

// ============================================================
// Entry CTA card. Sits inside InvoiceDetail near the "Choose plan" button
// ============================================================
function ExtendBanner({ lang, onClick, daysToDue = 12, principal = 250000 }) {
  const isAr = lang === 'ar';
  return (
    <button onClick={onClick} className="mal-extend-banner" style={{
      cursor: 'pointer', textAlign: 'start', padding: 16, borderRadius: 16,
      background: 'linear-gradient(135deg, #2A1F6F 0%, #5B3FB2 60%, #C97AB6 100%)',
      color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: 14,
      width: '100%', boxShadow: 'var(--mal-sh-2)', position: 'relative', overflow: 'hidden'
    }}>
      <div className="mal-orb" style={{ position: 'absolute', width: 120, height: 120, top: -30, insetInlineEnd: -30, opacity: .35 }}/>
      <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,.18)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
        {Ico.clock ? Ico.clock({ color: '#fff', width: 22, height: 22 }) : Ico.bolt({ color: '#fff', width: 22, height: 22 })}
      </div>
      <div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: 11, opacity: .8, textTransform: 'uppercase', letterSpacing: '.06em' }}>
          {isAr ? 'جديد · مال' : 'New · Mal'}
        </div>
        <div style={{ fontSize: 15, fontWeight: 500, marginTop: 2 }}>
          {isAr ? `تحتاج وقتاً أكثر؟ مدّد لـ ١٢ شهر` : `Need more time? Extend up to 12 months`}
        </div>
        <div style={{ fontSize: 12, opacity: .8, marginTop: 2 }}>
          {isAr ? `بدلاً من ${daysToDue} يوم، قسّط على راحتك` : `Instead of ${daysToDue} days، pay monthly`}
        </div>
      </div>
      {Ico.arrow({ color: '#fff' })}
    </button>
  );
}

// ============================================================
// 01 · Hero. Explains the concept
// ============================================================
function BuyerExtendHero({ lang, setRoute, viewport }) {
  const isAr = lang === 'ar';
  return (
    <div style={{ padding: 0 }}>
      {viewport === 'mobile' && <MobileTopBar title={isAr ? 'تمديد الدفع' : 'Extend payment'} onBack={() => setRoute('invoice')}/>}
      <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* Visual */}
        <div style={{
          height: 200, borderRadius: 20, overflow: 'hidden', position: 'relative',
          background: 'linear-gradient(135deg, #1A1A28 0%, #2A1F6F 100%)', color: '#fff',
        }}>
          <div className="mal-orb" style={{ position: 'absolute', width: 220, height: 220, top: -60, insetInlineEnd: -60, opacity: .55, animation: 'mal-orb-spin 14s linear infinite' }}/>
          <div style={{ position: 'absolute', inset: 0, padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 11, opacity: .7, textTransform: 'uppercase', letterSpacing: '.08em' }}>
              {isAr ? 'منتج جديد' : 'A new way to pay'}
            </div>
            <div>
              <div style={{ fontFamily: 'var(--mal-font-display)', fontSize: 30, lineHeight: 1.05, fontStyle: 'italic', letterSpacing: '-0.02em' }}>
                {isAr ? 'مدّد فاتورتك،\nادفع شهرياً.' : 'Extend the term.\nPay monthly.'}
              </div>
              <div style={{ fontSize: 12, opacity: .85, marginTop: 8, maxWidth: 280 }}>
                {isAr ? 'يحصل المورّد على المبلغ في موعده. أنت تختار مدة سداد تصل إلى ١٢ شهراً.' : 'Your supplier gets paid on time. You choose a tenor up to 12 months. Unsecured, fully digital.'}
              </div>
            </div>
          </div>
        </div>

        {/* The 3-step explainer */}
        <Card padded>
          <div className="mal-caption" style={{ marginBottom: 12 }}>{isAr ? 'كيف تعمل' : 'How it works'}</div>
          {[
            { n: '1', t: isAr ? 'اختر فاتورة' : 'Pick the invoice', s: isAr ? 'أي فاتورة قبل تاريخ الاستحقاق' : 'Any open invoice before its due date' },
            { n: '2', t: isAr ? 'اختر المدّة' : 'Pick a tenor', s: isAr ? '٣ · ٦ · ٩ · ١٢ شهر' : '3 · 6 · 9 · 12 months · APR shown upfront' },
            { n: '3', t: isAr ? 'مال يدفع · أنت تقسّط' : 'We pay · you pay us', s: isAr ? 'يستلم المورّد كاملاً في موعده. أنت تسدّد لنا شهرياً.' : 'Supplier paid in full on the original due date. You repay Mal in equal monthly EMIs.' },
          ].map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: 14, padding: '12px 0', borderTop: i ? '1px solid var(--mal-line-2)' : 'none' }}>
              <div style={{
                width: 28, height: 28, borderRadius: 999, background: 'var(--mal-ink)', color: '#fff',
                display: 'grid', placeItems: 'center', fontFamily: 'var(--mal-font-display)', fontStyle: 'italic', fontSize: 14, flexShrink: 0,
              }}>{s.n}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{s.t}</div>
                <div style={{ fontSize: 12, color: 'var(--mal-mid)', marginTop: 2 }}>{s.s}</div>
              </div>
            </div>
          ))}
        </Card>

        {/* Eligibility / fine print */}
        <Card padded style={{ background: 'var(--mal-surface-2)', border: 'none' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              [isAr ? 'الحد المتاح' : 'Available', 'AED 612,400'],
              [isAr ? 'فائدة من' : 'APR from', '9.9% p.a.'],
              [isAr ? 'الحد الأقصى' : 'Max tenor', isAr ? '١٢ شهر' : '12 months'],
              [isAr ? 'تسوية مبكّرة' : 'Early settle', isAr ? 'بلا غرامة' : 'No penalty'],
            ].map(([k, v]) => (
              <div key={k}>
                <div style={{ fontSize: 11, color: 'var(--mal-mid)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{k}</div>
                <div className="mal-num" style={{ fontSize: 14, fontWeight: 500, marginTop: 2 }}>{v}</div>
              </div>
            ))}
          </div>
        </Card>

        <Button kind="primary" size="lg" full onClick={() => setRoute('extend-pick')} iconRight="arrow">
          {isAr ? 'اختر مدّة السداد' : 'Pick a tenor'}
        </Button>
        <button onClick={() => setRoute('extend-active')} style={{
          background: 'transparent', border: 'none', color: 'var(--mal-mid)', fontSize: 13,
          padding: 8, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 4,
        }}>
          {isAr ? 'قروضي النشطة' : 'See my active loans'}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// 02 · Tenor picker. The heart of the flow
// ============================================================
function BuyerExtendPicker({ lang, setRoute, viewport, principal = 250000 }) {
  const isAr = lang === 'ar';
  const [tenor, setTenor] = uSx(6);
  const apr = EXT_TENORS.find(t => t.mo === tenor).apr;
  const { profit, total, emi } = ext_calc(principal, tenor, apr);
  const orig = isAr ? 'الاستحقاق الأصلي · ٣٠ أكتوبر' : 'Original due · 30 Oct';
  const ext = (() => {
    const d = new Date(2026, 9, 30); d.setMonth(d.getMonth() + tenor);
    return d.toLocaleDateString(isAr ? 'ar' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  })();

  return (
    <div>
      {viewport === 'mobile' && <MobileTopBar title={isAr ? 'مدّة السداد' : 'Choose tenor'} onBack={() => setRoute('extend-hero')}/>}
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="mal-caption">{isAr ? 'فاتورة أطلس · ٢٥٠٬٠٠٠ د.إ' : 'Atlas Packaging · AED 250,000'}</div>

        {/* EMI hero number */}
        <Card padded style={{ background: '#1A1A28', color: '#fff', border: 'none', position: 'relative', overflow: 'hidden' }}>
          <div className="mal-orb" style={{ position: 'absolute', width: 160, height: 160, top: -50, insetInlineEnd: -50, opacity: .4 }}/>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: 11, opacity: .7, textTransform: 'uppercase', letterSpacing: '.06em' }}>
              {isAr ? 'القسط الشهري' : 'Monthly EMI'}
            </div>
            <div className="mal-num" style={{ fontFamily: 'var(--mal-font-display)', fontSize: 44, marginTop: 6, fontStyle: 'italic', letterSpacing: '-0.02em' }}>
              AED {Math.round(emi).toLocaleString()}
            </div>
            <div style={{ display: 'flex', gap: 18, marginTop: 14, fontSize: 12, opacity: .85 }}>
              <div>
                <div style={{ opacity: .65, fontSize: 10, textTransform: 'uppercase', letterSpacing: '.05em' }}>{isAr ? 'إجمالي السداد' : 'Total'}</div>
                <div className="mal-num" style={{ marginTop: 2 }}>AED {Math.round(total).toLocaleString()}</div>
              </div>
              <div>
                <div style={{ opacity: .65, fontSize: 10, textTransform: 'uppercase', letterSpacing: '.05em' }}>{isAr ? 'تكلفة التمويل' : 'Cost of finance'}</div>
                <div className="mal-num" style={{ marginTop: 2 }}>AED {Math.round(profit).toLocaleString()}</div>
              </div>
              <div>
                <div style={{ opacity: .65, fontSize: 10, textTransform: 'uppercase', letterSpacing: '.05em' }}>APR</div>
                <div className="mal-num" style={{ marginTop: 2 }}>{apr}%</div>
              </div>
            </div>
          </div>
        </Card>

        {/* Tenor cards */}
        <div className="mal-caption" style={{ marginTop: 4 }}>{isAr ? 'اختر المدة' : 'Tenor'}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {EXT_TENORS.map(opt => {
            const sel = opt.mo === tenor;
            const c = ext_calc(principal, opt.mo, opt.apr);
            return (
              <button key={opt.mo} onClick={() => setTenor(opt.mo)} style={{
                cursor: 'pointer', textAlign: 'start', padding: 14, borderRadius: 14,
                background: sel ? 'var(--mal-paper)' : 'var(--mal-paper)',
                border: `1.5px solid ${sel ? 'var(--mal-ink)' : 'var(--mal-line)'}`,
                position: 'relative', boxShadow: sel ? 'var(--mal-sh-2)' : 'var(--mal-sh-1)',
                transform: sel ? 'translateY(-2px)' : 'none', transition: 'all .14s',
              }}>
                {opt.badge && (
                  <div style={{ position: 'absolute', top: 8, insetInlineEnd: 8, fontSize: 9, fontWeight: 500,
                    background: 'var(--mal-ink)', color: '#fff', padding: '3px 7px', borderRadius: 99, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                    {isAr ? (opt.badge === 'Best rate' ? 'أفضل سعر' : 'أقل قسط') : opt.badge}
                  </div>
                )}
                <div className="mal-display-sm" style={{ fontStyle: 'italic', fontSize: 24 }}>
                  {opt.mo}<span style={{ fontSize: 12, opacity: .55, marginInlineStart: 4, fontStyle: 'normal' }}>{isAr ? 'شهر' : 'mo'}</span>
                </div>
                <div className="mal-num" style={{ fontSize: 13, fontWeight: 500, marginTop: 4 }}>
                  AED {Math.round(c.emi).toLocaleString()}<span style={{ fontSize: 10, color: 'var(--mal-mid)', fontWeight: 400 }}>/mo</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--mal-mid)', marginTop: 2 }}>{opt.apr}% APR</div>
              </button>
            );
          })}
        </div>

        {/* Date comparison */}
        <Card padded>
          <div className="mal-caption" style={{ marginBottom: 10 }}>{isAr ? 'تاريخ السداد' : 'Pay-by date'}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: 'var(--mal-mid)' }}>{isAr ? 'بدون مال' : 'Without Mal'}</div>
              <div style={{ fontSize: 14, fontWeight: 500, textDecoration: 'line-through', textDecorationColor: 'var(--mal-mid)', marginTop: 2 }}>30 Oct 2026</div>
            </div>
            {Ico.arrow ? Ico.arrow({ color: 'var(--mal-mid)' }) : '→'}
            <div style={{ flex: 1, textAlign: 'end' }}>
              <div style={{ fontSize: 11, color: 'var(--mal-primary)' }}>{isAr ? 'مع مال' : 'With Mal'}</div>
              <div style={{ fontSize: 14, fontWeight: 500, marginTop: 2, color: 'var(--mal-primary)' }}>{ext}</div>
            </div>
          </div>
          <div style={{ height: 4, background: 'var(--mal-line)', borderRadius: 99, marginTop: 14, overflow: 'hidden', display: 'flex' }}>
            <div style={{ width: '14%', background: 'var(--mal-mid)' }}/>
            <div style={{ width: ((tenor / 12) * 86) + '%', background: 'linear-gradient(90deg, var(--mal-primary-3), var(--mal-primary))' }}/>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: 'var(--mal-mid)' }}>
            <span>{isAr ? 'اليوم' : 'Today'}</span>
            <span>{tenor + (isAr ? ' شهر مع مال' : ' mo with Mal')}</span>
          </div>
        </Card>

        <Button kind="primary" size="lg" full onClick={() => setRoute('extend-agree')} iconRight="arrow">
          {isAr ? 'متابعة · ' : 'Continue · '}{tenor}{isAr ? ' شهر' : ' mo'}
        </Button>
        <div style={{ fontSize: 11, color: 'var(--mal-mid)', textAlign: 'center' }}>
          {isAr ? 'قابل للتسوية المبكّرة في أي وقت بدون غرامات' : 'Settle early any time, no penalty'}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 03 · Agreement / disclosure. Full T&Cs surfaced clearly
// ============================================================
function BuyerExtendAgreement({ lang, setRoute, viewport }) {
  const isAr = lang === 'ar';
  const [acks, setAcks] = uSx({ apr: false, autodebit: false, default: false });
  const allAck = acks.apr && acks.autodebit && acks.default;
  return (
    <div>
      {viewport === 'mobile' && <MobileTopBar title={isAr ? 'الاتفاقية' : 'Agreement'} onBack={() => setRoute('extend-pick')}/>}
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="mal-display-sm" style={{ fontStyle: 'italic' }}>
          {isAr ? 'اقرأ الشروط' : 'Read the terms'}
        </div>
        <div style={{ fontSize: 13, color: 'var(--mal-mid)' }}>
          {isAr ? 'كل شيء واضح. لا رسوم خفية. هذه قرض غير مضمون من Mal Capital.' : 'No hidden fees. This is an unsecured term loan issued by Mal Capital Ltd, regulated by ADGM FSRA.'}
        </div>

        {/* Key terms */}
        <Card padded>
          {[
            [isAr ? 'المبلغ الأصلي' : 'Principal', 'AED 250,000'],
            [isAr ? 'المدّة' : 'Tenor', isAr ? '٦ أشهر' : '6 months'],
            [isAr ? 'الفائدة الفعلية' : 'APR', '11.5%'],
            [isAr ? 'تكلفة التمويل' : 'Cost of finance', 'AED 14,375'],
            [isAr ? 'إجمالي السداد' : 'Total payable', 'AED 264,375'],
            [isAr ? 'القسط الشهري' : 'Monthly EMI', 'AED 44,063'],
            [isAr ? 'تاريخ أول قسط' : 'First EMI', '30 Nov 2026'],
            [isAr ? 'تاريخ آخر قسط' : 'Last EMI', '30 Apr 2027'],
            [isAr ? 'رسوم الإعداد' : 'Setup fee', isAr ? 'بدون' : 'None'],
            [isAr ? 'تأخر السداد' : 'Late fee', 'AED 100 + 2% p.m.'],
          ].map(([k, v], i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: i ? '1px solid var(--mal-line-2)' : 'none', fontSize: 13 }}>
              <span style={{ color: 'var(--mal-mid)' }}>{k}</span>
              <span style={{ fontWeight: 500 }}>{v}</span>
            </div>
          ))}
        </Card>

        {/* Acknowledgements */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { id: 'apr', t: isAr ? 'فهمت معدل الفائدة (APR) ١١٫٥٪ والتكلفة الإجمالية' : 'I understand the 11.5% APR and total cost of finance' },
            { id: 'autodebit', t: isAr ? 'أوافق على الخصم التلقائي من حساب ENBD ****4291' : 'I authorise auto-debit from ENBD ****4291 on each EMI date' },
            { id: 'default', t: isAr ? 'أعلم أن التخلّف عن السداد قد يُسجّل في AECB' : 'I understand default may be reported to AECB and trigger collection' },
          ].map(a => (
            <button key={a.id} onClick={() => setAcks({ ...acks, [a.id]: !acks[a.id] })} style={{
              cursor: 'pointer', textAlign: 'start', padding: 14, borderRadius: 12,
              background: 'var(--mal-paper)', border: `1.5px solid ${acks[a.id] ? 'var(--mal-ink)' : 'var(--mal-line)'}`,
              display: 'flex', alignItems: 'flex-start', gap: 12,
            }}>
              <div style={{
                width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                border: `2px solid ${acks[a.id] ? 'var(--mal-ink)' : 'var(--mal-line)'}`,
                background: acks[a.id] ? 'var(--mal-ink)' : 'transparent',
                display: 'grid', placeItems: 'center', color: '#fff',
                fontSize: 13, fontWeight: 600, marginTop: 1,
              }}>{acks[a.id] ? '✓' : ''}</div>
              <div style={{ fontSize: 13, lineHeight: 1.4 }}>{a.t}</div>
            </button>
          ))}
        </div>

        <Button kind="primary" size="lg" full disabled={!allAck} onClick={() => allAck && setRoute('extend-confirm')} iconRight="arrow">
          {isAr ? 'متابعة' : 'Continue'}
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// 04 · Confirm. UAE Pass signing
// ============================================================
function BuyerExtendConfirm({ lang, setRoute, viewport }) {
  const isAr = lang === 'ar';
  const [signing, setSigning] = uSx(false);
  uEx(() => {
    if (signing) {
      if (window.MalSession) window.MalSession.saveSlice('termExtensions', {
        ['INV-2026-0418']: {
          principal: 250000, tenorMonths: 6, aprPct: 11.5, emi: 44063,
          paidTo: 'Atlas Packaging FZ', firstEmiDate: '2026-11-30',
          signedAt: new Date().toISOString(),
        }
      });
      const t = setTimeout(() => setRoute('extend-success'), 1400);
      return () => clearTimeout(t);
    }
  }, [signing]);
  return (
    <div>
      {viewport === 'mobile' && <MobileTopBar title={isAr ? 'تأكيد' : 'Confirm'} onBack={() => setRoute('extend-agree')}/>}
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="mal-display-sm" style={{ fontStyle: 'italic' }}>
          {isAr ? 'وقّع لإتمام التمديد' : 'Sign to confirm'}
        </div>
        <Card padded style={{ background: 'linear-gradient(135deg, #2A1F6F 0%, #5B3FB2 100%)', color: '#fff', border: 'none', position: 'relative', overflow: 'hidden' }}>
          <div className="mal-orb" style={{ position: 'absolute', width: 140, height: 140, top: -40, insetInlineEnd: -40, opacity: .45 }}/>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: 11, opacity: .7, textTransform: 'uppercase', letterSpacing: '.06em' }}>
              {isAr ? 'قرض تمديد' : 'Extension loan'}
            </div>
            <div className="mal-num" style={{ fontFamily: 'var(--mal-font-display)', fontSize: 38, marginTop: 6, fontStyle: 'italic' }}>AED 250,000</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 18, fontSize: 12, opacity: .9 }}>
              <span>{isAr ? '٦ شهر' : '6 mo'} · 11.5% APR</span>
              <span className="mal-num">AED 44,063 / mo</span>
            </div>
          </div>
        </Card>
        <Card padded>
          {[
            [isAr ? 'المورد المُسدّد' : 'Paid to', 'Atlas Packaging FZ'],
            [isAr ? 'تاريخ سداد المورّد' : 'Wire date', '30 Oct 2026'],
            [isAr ? 'الخصم البنكي' : 'Auto-debit from', 'ENBD ****4291'],
            [isAr ? 'يُسحب في' : 'Each month on', isAr ? 'يوم ٣٠' : '30th'],
          ].map(([k, v], i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: i ? '1px solid var(--mal-line-2)' : 'none', fontSize: 13 }}>
              <span style={{ color: 'var(--mal-mid)' }}>{k}</span>
              <span style={{ fontWeight: 500 }}>{v}</span>
            </div>
          ))}
        </Card>
        <Card padded style={{ background: 'var(--mal-surface-2)', border: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            {Ico.shield({ color: 'var(--mal-mid)' })}
            <div style={{ fontSize: 12, color: 'var(--mal-mid)' }}>
              {isAr ? 'ستتلقى رسالة من UAE Pass للتوقيع. توقيعك يُعدّ ملزماً قانونياً.' : 'You\'ll receive a UAE Pass push to sign. Your signature is legally binding under ADGM Electronic Transactions Regulations 2021.'}
            </div>
          </div>
        </Card>
        <Button kind="primary" size="lg" full onClick={() => setSigning(true)} icon={signing ? 'check' : 'lock'}>
          {signing ? (isAr ? 'جارٍ التوقيع…' : 'Signing…') : (isAr ? 'وقّع بهوية رقمية' : 'Sign with UAE Pass')}
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// 05 · Success / ladder
// ============================================================
function BuyerExtendSuccess({ lang, setRoute, viewport }) {
  const isAr = lang === 'ar';
  const months = ['Nov','Dec','Jan','Feb','Mar','Apr'];
  return (
    <div>
      {viewport === 'mobile' && <MobileTopBar title={isAr ? 'تمّ' : 'Done'} onBack={() => setRoute('home')}/>}
      <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
        <div className="mal-orb" style={{ width: 96, height: 96, animation: 'mal-orb-spin 8s linear infinite', marginTop: 8 }}/>
        <div className="mal-display-md mal-iri-text" style={{ fontStyle: 'italic', textAlign: 'center' }}>
          {isAr ? 'تمّ التمديد' : 'You\'ve got more time'}
        </div>
        <div style={{ color: 'var(--mal-mid)', fontSize: 13, textAlign: 'center', maxWidth: 300 }}>
          {isAr ? 'سيستلم أطلس ٢٥٠٬٠٠٠ د.إ في ٣٠ أكتوبر. أول قسط لك في ٣٠ نوفمبر.' : 'Atlas will receive AED 250,000 on 30 Oct. Your first EMI is 30 Nov.'}
        </div>

        {/* Ladder visualisation */}
        <Card padded style={{ width: '100%' }}>
          <div className="mal-caption" style={{ marginBottom: 12 }}>{isAr ? 'جدول السداد' : 'Repayment ladder'}</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 80, marginBottom: 8 }}>
            {months.map((m, i) => (
              <div key={m} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: '100%', height: 50,
                  background: i === 0 ? 'var(--mal-ink)' : 'var(--mal-primary-3)',
                  borderRadius: 4, opacity: i === 0 ? 1 : .4 + (i * .1),
                }}/>
                <div style={{ fontSize: 10, color: 'var(--mal-mid)' }}>{m}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 12 }}>
            <span style={{ color: 'var(--mal-mid)' }}>{isAr ? 'كل شهر' : 'Every month'}</span>
            <span className="mal-num" style={{ fontWeight: 500 }}>AED 44,063</span>
          </div>
        </Card>

        <Card padded style={{ width: '100%', background: 'var(--mal-surface-2)', border: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 999, background: 'var(--mal-success-50)', display: 'grid', placeItems: 'center', color: 'var(--mal-success)' }}>
              {Ico.check ? Ico.check({ color: 'var(--mal-success)' }) : '✓'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{isAr ? 'سجّل في AECB' : 'Reported to AECB'}</div>
              <div style={{ fontSize: 11, color: 'var(--mal-mid)' }}>{isAr ? 'الدفعات المنتظمة تبني تاريخك الائتماني' : 'On-time payments build your credit history'}</div>
            </div>
          </div>
        </Card>

        <div style={{ display: 'flex', gap: 8, width: '100%' }}>
          <Button kind="secondary" full onClick={() => setRoute('extend-detail')}>{isAr ? 'تفاصيل القرض' : 'View loan'}</Button>
          <Button kind="primary" full onClick={() => setRoute('home')}>{isAr ? 'إلى الرئيسية' : 'Back home'}</Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 06 · Active loans list (multiple extensions)
// ============================================================
const SAMPLE_LOANS = [
  { id: 'EXT-2026-0418', sup: 'Atlas Packaging FZ', principal: 250000, tenor: 6, paid: 1, apr: 11.5, status: 'on-track', emi: 44063, next: '30 Nov' },
  { id: 'EXT-2026-0392', sup: 'Pearl Logistics LLC', principal: 128400, tenor: 9, paid: 3, apr: 13.0, status: 'on-track', emi: 15810, next: '5 Nov' },
  { id: 'EXT-2026-0301', sup: 'Northstar Equipment', principal: 96300, tenor: 3, paid: 3, apr: 9.9, status: 'paid', emi: 33094, next: '—' },
];

function BuyerExtendActive({ lang, setRoute, viewport }) {
  const isAr = lang === 'ar';
  return (
    <div>
      {viewport === 'mobile' && <MobileTopBar title={isAr ? 'قروض التمديد' : 'Extension loans'} onBack={() => setRoute('home')}/>}
      <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {viewport === 'desktop' && <h1 className="mal-h1">{isAr ? 'قروض تمديد الفاتورة' : 'Invoice extension loans'}</h1>}

        {/* Aggregate hero */}
        <Card padded style={{ background: '#1A1A28', color: '#fff', border: 'none', position: 'relative', overflow: 'hidden' }}>
          <div className="mal-orb" style={{ position: 'absolute', width: 180, height: 180, top: -50, insetInlineEnd: -50, opacity: .4 }}/>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: 11, opacity: .7, textTransform: 'uppercase', letterSpacing: '.06em' }}>{isAr ? 'إجمالي الرصيد' : 'Outstanding'}</div>
            <div className="mal-num" style={{ fontFamily: 'var(--mal-font-display)', fontSize: 38, fontStyle: 'italic', marginTop: 4 }}>AED 305,400</div>
            <div style={{ display: 'flex', gap: 18, marginTop: 14, fontSize: 12, opacity: .85 }}>
              <span>{isAr ? '٢ نشط' : '2 active'}</span>
              <span>·</span>
              <span>{isAr ? '١ مكتمل' : '1 completed'}</span>
              <span>·</span>
              <span>{isAr ? 'القسط القادم ٥ نوفمبر' : 'Next 5 Nov'}</span>
            </div>
          </div>
        </Card>

        {/* Loan cards */}
        {SAMPLE_LOANS.map(l => (
          <Card key={l.id} padded onClick={() => setRoute('extend-detail')} style={{ cursor: 'pointer' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{l.sup}</div>
                <div style={{ fontSize: 11, color: 'var(--mal-mid)', marginTop: 2 }}>{l.id} · {l.tenor}{isAr ? ' شهر' : ' mo'} · {l.apr}% APR</div>
              </div>
              <Pill tone={l.status === 'paid' ? 'success' : 'info'}>
                {l.status === 'paid' ? (isAr ? 'مسدّد' : 'Paid off') : (isAr ? 'منتظم' : 'On track')}
              </Pill>
            </div>
            {/* Progress dots */}
            <div style={{ display: 'flex', gap: 4, marginTop: 14 }}>
              {Array.from({ length: l.tenor }).map((_, i) => (
                <div key={i} style={{
                  flex: 1, height: 6, borderRadius: 99,
                  background: i < l.paid ? 'var(--mal-ink)' : 'var(--mal-line)',
                }}/>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 12 }}>
              <span style={{ color: 'var(--mal-mid)' }}>
                {l.status === 'paid' ? (isAr ? 'مكتمل' : 'Completed') : `${l.paid}/${l.tenor} ${isAr ? 'مدفوع' : 'paid'}`}
              </span>
              <span className="mal-num" style={{ fontWeight: 500 }}>
                {l.status === 'paid' ? (isAr ? '—' : 'Done') : `AED ${l.emi.toLocaleString()} · ${l.next}`}
              </span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// 07 · Loan detail with full ladder + early settle
// ============================================================
function BuyerExtendDetail({ lang, setRoute, viewport }) {
  const isAr = lang === 'ar';
  const sched = [
    { d: '30 Nov 2026', amt: 44063, status: 'paid' },
    { d: '30 Dec 2026', amt: 44063, status: 'next' },
    { d: '30 Jan 2027', amt: 44063, status: 'scheduled' },
    { d: '28 Feb 2027', amt: 44063, status: 'scheduled' },
    { d: '30 Mar 2027', amt: 44063, status: 'scheduled' },
    { d: '30 Apr 2027', amt: 44063, status: 'scheduled' },
  ];
  return (
    <div>
      {viewport === 'mobile' && <MobileTopBar title={isAr ? 'تفاصيل القرض' : 'Loan detail'} onBack={() => setRoute('extend-active')}/>}
      <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Header */}
        <Card padded>
          <div className="mal-caption">EXT-2026-0418 · Atlas Packaging FZ</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 6 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--mal-mid)' }}>{isAr ? 'الرصيد المتبقي' : 'Outstanding'}</div>
              <div className="mal-num mal-display-sm" style={{ fontStyle: 'italic' }}>AED 220,313</div>
            </div>
            <div style={{ textAlign: 'end' }}>
              <div style={{ fontSize: 11, color: 'var(--mal-mid)' }}>{isAr ? 'مكتمل' : 'Paid'}</div>
              <div className="mal-num" style={{ fontSize: 16, fontWeight: 500 }}>1 / 6</div>
            </div>
          </div>
          <div style={{ height: 6, background: 'var(--mal-line)', borderRadius: 99, marginTop: 14, overflow: 'hidden' }}>
            <div style={{ width: '17%', height: '100%', background: 'var(--mal-ink)' }}/>
          </div>
        </Card>

        {/* Schedule */}
        <Card padded>
          <div className="mal-caption" style={{ marginBottom: 8 }}>{isAr ? 'جدول الأقساط' : 'EMI schedule'}</div>
          {sched.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: i ? '1px solid var(--mal-line-2)' : 'none' }}>
              <div style={{
                width: 26, height: 26, borderRadius: 999, flexShrink: 0,
                background: s.status === 'paid' ? 'var(--mal-success)' : s.status === 'next' ? 'var(--mal-ink)' : 'var(--mal-line)',
                color: '#fff', display: 'grid', placeItems: 'center', fontSize: 12,
              }}>{s.status === 'paid' ? '✓' : i + 1}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{s.d}</div>
                <div style={{ fontSize: 11, color: 'var(--mal-mid)' }}>
                  {s.status === 'paid' ? (isAr ? 'مدفوع' : 'Paid') : s.status === 'next' ? (isAr ? 'القسط القادم' : 'Next EMI') : (isAr ? 'مجدول' : 'Scheduled')}
                </div>
              </div>
              <div className="mal-num" style={{ fontSize: 14, fontWeight: 500 }}>AED {s.amt.toLocaleString()}</div>
            </div>
          ))}
        </Card>

        {/* Early settle */}
        <Card padded style={{ background: 'linear-gradient(135deg, var(--mal-primary-50), var(--mal-surface-2))', border: '1px solid var(--mal-primary-3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{isAr ? 'سدّد الباقي اليوم' : 'Settle in full today'}</div>
              <div style={{ fontSize: 12, color: 'var(--mal-mid)', marginTop: 2 }}>{isAr ? 'وفّر ٧٬٢٠٠ د.إ من الفائدة' : 'Save AED 7,200 in profit · no penalty'}</div>
            </div>
            <Button kind="iri" size="sm" onClick={() => setRoute('extend-settle')}>{isAr ? 'سدّد' : 'Settle'}</Button>
          </div>
        </Card>

        <div style={{ display: 'flex', gap: 8 }}>
          <Button kind="secondary" full>{isAr ? 'كشف حساب' : 'Statement'}</Button>
          <Button kind="secondary" full>{isAr ? 'الاتفاقية' : 'Agreement'}</Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 08 · Early settlement
// ============================================================
function BuyerExtendSettle({ lang, setRoute, viewport }) {
  const isAr = lang === 'ar';
  const [done, setDone] = uSx(false);
  return (
    <div>
      {viewport === 'mobile' && <MobileTopBar title={isAr ? 'تسوية مبكّرة' : 'Early settlement'} onBack={() => setRoute('extend-detail')}/>}
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {!done ? (
          <>
            <div className="mal-display-sm" style={{ fontStyle: 'italic' }}>
              {isAr ? 'سدّد القرض كاملاً' : 'Pay it off today'}
            </div>
            <Card padded style={{ background: '#1A1A28', color: '#fff', border: 'none' }}>
              <div style={{ fontSize: 11, opacity: .7, textTransform: 'uppercase', letterSpacing: '.06em' }}>{isAr ? 'المبلغ المطلوب' : 'Settlement amount'}</div>
              <div className="mal-num" style={{ fontFamily: 'var(--mal-font-display)', fontSize: 40, fontStyle: 'italic', marginTop: 6 }}>AED 213,113</div>
              <div style={{ fontSize: 12, opacity: .85, marginTop: 8 }}>
                {isAr ? '٥ أقساط متبقية · خصم ٧٬٢٠٠ د.إ' : '5 remaining EMIs · AED 7,200 rebated'}
              </div>
            </Card>
            <Card padded>
              {[
                [isAr ? 'رصيد رئيسي' : 'Outstanding principal', 'AED 208,333'],
                [isAr ? 'فائدة مستحقة' : 'Profit due to date', 'AED 4,780'],
                [isAr ? 'رسوم تسوية' : 'Settlement fee', isAr ? 'بدون' : 'None'],
                [isAr ? 'خصم تعجيل' : 'Early-pay rebate', '− AED 7,200'],
              ].map(([k, v], i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: i ? '1px solid var(--mal-line-2)' : 'none', fontSize: 13 }}>
                  <span style={{ color: 'var(--mal-mid)' }}>{k}</span>
                  <span style={{ fontWeight: 500, color: i === 3 ? 'var(--mal-success)' : 'inherit' }}>{v}</span>
                </div>
              ))}
            </Card>
            <Button kind="primary" size="lg" full onClick={() => setDone(true)} icon="check">
              {isAr ? 'سدّد ٢١٣٬١١٣ د.إ' : 'Pay AED 213,113'}
            </Button>
          </>
        ) : (
          <div style={{ padding: 24, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center', minHeight: 480, justifyContent: 'center' }}>
            <div className="mal-orb" style={{ width: 96, height: 96, animation: 'mal-orb-spin 8s linear infinite' }}/>
            <div className="mal-display-md mal-iri-text" style={{ fontStyle: 'italic' }}>{isAr ? 'مسدّد بالكامل' : 'Cleared'}</div>
            <div style={{ color: 'var(--mal-mid)', fontSize: 13, maxWidth: 280 }}>
              {isAr ? 'تم تسوية القرض. سيُحدَّث ملفك في AECB خلال ٤٨ ساعة.' : 'Loan settled. Your AECB record will reflect this within 48 hours.'}
            </div>
            <Button kind="primary" onClick={() => setRoute('home')}>{isAr ? 'إلى الرئيسية' : 'Back home'}</Button>
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, {
  BuyerExtendHero, BuyerExtendPicker, BuyerExtendAgreement, BuyerExtendConfirm,
  BuyerExtendSuccess, BuyerExtendActive, BuyerExtendDetail, BuyerExtendSettle,
  ExtendBanner,
});
