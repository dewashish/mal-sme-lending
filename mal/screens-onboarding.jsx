/* eslint-disable */
// Mal. Full multi-screen onboarding journeys.
// Buyer SME and Supplier SME each get a 10+ step journey, each step a discrete
// screen. Driven by an `initialStep` prop so the design canvas can lay every
// step out side by side as its own artboard.

const { useState: oS, useEffect: oE } = React;

// ============================================================
// Buyer Onboarding. 11 screens (or 10 when supplier-invited; `license` is
// skipped because the inviting supplier has already DED-verified the buyer).
// `invitedBy` shape:
//   { supplier: { name, licence, tone? },
//     buyer:    { legalName, licenceNo, licenceEmirate, trn, sub? },
//     contact:  { name, mobile, email? },
//     invoice:  { id, amount, reservedLimit, eta }  // optional preview
//   }
// ============================================================
const BUYER_STEPS_COLD    = ['welcome', 'phone', 'otp', 'license', 'uaepass', 'owners', 'bank', 'documents', 'review', 'decision', 'limit'];
const BUYER_STEPS_INVITED = ['welcome', 'phone', 'otp',            'uaepass', 'owners', 'bank', 'documents', 'review', 'decision', 'limit'];
const BUYER_STEPS = BUYER_STEPS_COLD; // back-compat export

// Demo fixture for the supplier-invited buyer journey. Used by the persona
// picker / buyer 'invited' route to bypass the full supplier-side wizard.
const INVITE_DEMO_FIXTURE = {
  supplier: { name: 'Atlas Packaging FZ-LLC', licence: 'JAFZA-882140', tone: 'sky' },
  buyer:    { legalName: 'Crescent Trading FZE', licenceNo: 'DED-1247739', licenceEmirate: 'Dubai', trn: '100247531800003', sub: 'General Trading · Est. 2017 · Active' },
  contact:  { name: 'Aisha Bin Hamad', mobile: '50 247 8810', email: 'aisha.b@crescenttrading.ae' },
  invoice:  { id: 'INV-2026-1187', amount: 250000, reservedLimit: 220000, eta: 'Today, 14:00' },
};

function BuyerOnboardingFlow({ lang, initialStep = 0, viewport = 'mobile', onDone, controlledStep, onStepChange, invitedBy = null }) {
  const STEPS = invitedBy ? BUYER_STEPS_INVITED : BUYER_STEPS_COLD;
  const [internalStep, setInternalStep] = oS(initialStep);
  const isControlled = typeof controlledStep === 'number';
  const stepIdx = isControlled ? controlledStep : internalStep;
  const setStepIdx = (n) => {
    const clamped = Math.min(STEPS.length - 1, Math.max(0, n));
    if (isControlled) onStepChange?.(clamped);
    else setInternalStep(clamped);
  };
  const step = STEPS[stepIdx];
  const next = () => setStepIdx(stepIdx + 1);
  const back = () => setStepIdx(stepIdx - 1);
  const isAr = lang === 'ar';
  const invitedSupplierName = invitedBy?.supplier?.name || '';
  const invitedBuyerLegalName = invitedBy?.buyer?.legalName || '';

  // Persist progress on each "Continue" click. Only commit-style, not keystrokes.
  React.useEffect(() => {
    if (window.MalSession) {
      window.MalSession.saveSlice('buyerOnboarding', {
        stepIdx, step, lang,
        updatedAt: new Date().toISOString(),
      });
      if (step === 'limit') {
        window.MalSession.saveSlice('buyerLimit', {
          amount: 850000, tier: 'A',
          revealedAt: new Date().toISOString(),
        });
      }
    }
  }, [stepIdx]);

  // The stepper shows the heavyweight phases (4 of them); micro-steps (otp,
  // owners, review) collapse into their parent.
  const phaseOf = { welcome: 0, phone: 0, otp: 0, license: 1, uaepass: 1, owners: 1, bank: 2, documents: 2, review: 2, decision: 3, limit: 3 };
  const phases = isAr
    ? ['ابدأ', 'تحقّق', 'بنك', 'الحدّ']
    : ['Start', 'Verify', 'Bank', 'Limit'];

  const Header = ({ showBack = true, title, sub }) => (
    <div style={{ padding: '14px 18px 6px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {showBack && stepIdx > 0
          ? <IconBtn icon="arrowL" size={32} onClick={back}/>
          : <MalOrb size={28}/>}
        <div className="mal-caption" style={{ flex: 1 }}>
          {isAr ? 'الخطوة' : 'Step'} {stepIdx + 1} / {BUYER_STEPS.length}
        </div>
        <span style={{ fontSize: 11, color: 'var(--mal-mid)' }}>{stepIdx >= BUYER_STEPS.length - 2 ? '~30s' : '~10s'}</span>
      </div>
      <Stepper steps={phases} current={phaseOf[step]} />
      {title && <div style={{ marginTop: 8 }}>
        <div className="mal-display-sm" style={{ fontStyle: 'italic' }}>{title}</div>
        {sub && <div style={{ fontSize: 13, color: 'var(--mal-mid)', marginTop: 4 }}>{sub}</div>}
      </div>}
    </div>
  );

  // ── 0 · Welcome ───────────────────────────────────────────
  if (step === 'welcome' && !invitedBy) return (
    <div style={{ height: '100%', minHeight: 760, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #FAF7EE 0%, #EFEAFF 60%, #FAF7EE 100%)' }}/>
      <div style={{ position: 'absolute', top: 60, insetInlineEnd: -80, width: 320, height: 320, opacity: .6 }}>
        <div className="mal-orb" style={{ width: '100%', height: '100%', animation: 'mal-orb-spin 22s linear infinite' }}/>
      </div>
      <div style={{ flex: 1, padding: 36, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', position: 'relative', zIndex: 1 }}>
        <MalLogo size={26}/>
        <h1 className="mal-display" style={{ fontSize: 56, fontStyle: 'italic', lineHeight: 1, marginTop: 32, marginBottom: 12 }}>
          {isAr ? <>رأس مال<br/><span className="mal-iri-text">يتحرّك معك.</span></> : <>Capital that<br/><span className="mal-iri-text">moves with you.</span></>}
        </h1>
        <p style={{ fontSize: 15, color: 'var(--mal-mid)', maxWidth: 320, lineHeight: 1.5 }}>
          {isAr ? 'افتح حسابك في ١٠ دقائق. اشترِ الآن، ادفع خلال ٣٠ إلى ١٢٠ يوم، مال يسدّد موردك اليوم.' : 'Open your account in 10 minutes. Buy now, pay in 30 to 120 days. Mal settles your supplier today.'}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 36 }}>
          <Button kind="primary" size="lg" full iconRight="arrow" onClick={next}>{isAr ? 'افتح حساباً' : 'Open an account'}</Button>
          <Button kind="ghost" size="lg" full>{isAr ? 'لدي حساب' : 'I already have an account'}</Button>
        </div>
        <div style={{ display: 'flex', gap: 14, marginTop: 24, fontSize: 11, color: 'var(--mal-mid)', justifyContent: 'center' }}>
          <span>ADGM FSRA</span><span>·</span><span>UAE Pass</span><span>·</span><span>AECB</span>
        </div>
      </div>
    </div>
  );

  // ── 0' · Welcome (invited) ───────────────────────────────
  if (step === 'welcome' && invitedBy) return (
    <div style={{ height: '100%', minHeight: 760, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #FAF7EE 0%, #E8F2FF 60%, #FAF7EE 100%)' }}/>
      <div style={{ position: 'absolute', top: 60, insetInlineEnd: -80, width: 320, height: 320, opacity: .55 }}>
        <div className="mal-orb" style={{ width: '100%', height: '100%', animation: 'mal-orb-spin 22s linear infinite' }}/>
      </div>
      <div style={{ flex: 1, padding: 28, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 20, position: 'relative', zIndex: 1 }}>
        <MalLogo size={26}/>
        <Pill tone="info" dot>{isAr ? 'دعوة من مورّد' : 'Supplier invite'}</Pill>
        <h1 className="mal-display" style={{ fontSize: 44, fontStyle: 'italic', lineHeight: 1.02, margin: 0 }}>
          {isAr
            ? <>دُعيتَ من<br/><span className="mal-iri-text">{invitedSupplierName}</span></>
            : <>You're invited by<br/><span className="mal-iri-text">{invitedSupplierName}</span></>}
        </h1>
        <Card padded style={{ display: 'flex', gap: 12, alignItems: 'center', background: 'var(--mal-paper)' }}>
          <Avatar tone={invitedBy.supplier?.tone || 'sky'} name={(invitedSupplierName.match(/\b\w/g) || []).slice(0,2).join('')} size={40}/>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{invitedBuyerLegalName}</div>
            <div style={{ fontSize: 11, color: 'var(--mal-mid)' }}>
              {isAr ? 'تم التحقّق مسبقاً من السجل التجاري' : 'Pre-verified via the trade register'} · {invitedBy.buyer?.licenceNo}
            </div>
          </div>
          {Ico.check({ stroke: 'var(--mal-success)' })}
        </Card>
        {invitedBy.invoice && (
          <Card padded style={{ background: 'linear-gradient(135deg, #EFEAFF, #FAF7EE)', border: '1px solid var(--mal-primary-50)' }}>
            <div className="mal-caption" style={{ marginBottom: 6 }}>{isAr ? 'فاتورة في الانتظار' : 'Invoice waiting'}</div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{invitedBy.invoice.id} · AED {invitedBy.invoice.amount.toLocaleString()}</div>
            <div style={{ fontSize: 11, color: 'var(--mal-mid)', marginTop: 2 }}>
              {isAr ? 'ستُحوَّل خلال ٤ ساعات بعد التفعيل' : 'Wires within 4h once you activate'}
            </div>
          </Card>
        )}
        <Button kind="primary" size="lg" full iconRight="arrow" onClick={next}>
          {isAr ? 'متابعة الإعداد · ٥ دقائق' : 'Continue setup · 5 min'}
        </Button>
        <div style={{ display: 'flex', gap: 14, fontSize: 11, color: 'var(--mal-mid)', justifyContent: 'center' }}>
          <span>ADGM FSRA</span><span>·</span><span>UAE Pass</span><span>·</span><span>AECB</span>
        </div>
      </div>
    </div>
  );

  // ── 1 · Phone ─────────────────────────────────────────────
  if (step === 'phone') {
    const phoneVal = invitedBy?.contact?.mobile || '50 247 8810';
    const emailVal = invitedBy?.contact?.email  || 'aisha.b@crescenttrading.ae';
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: 760 }}>
        <Header title={isAr ? 'رقم هاتف الشركة' : 'Your business mobile'} sub={
          invitedBy
            ? (isAr ? `تمّت تعبئة هذه البيانات من قِبل ${invitedSupplierName}. تأكَّد منها فقط.` : `Pre-filled by ${invitedSupplierName}. Just confirm.`)
            : (isAr ? 'سنرسل رمزاً للتحقّق.' : 'We\'ll send a 6-digit code.')
        }/>
        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
          <Field label={isAr ? 'رقم الجوّال' : 'Mobile number'}>
            <div style={{ display: 'flex', gap: 8 }}>
              <div className="mal-input" style={{ width: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <span style={{ fontSize: 16 }}>🇦🇪</span><span>+971</span>
              </div>
              <Input defaultValue={phoneVal} style={{ flex: 1 }}/>
            </div>
          </Field>
          <Field label={isAr ? 'البريد الإلكتروني للعمل' : 'Business email'}>
            <Input defaultValue={emailVal}/>
          </Field>
          {invitedBy && (
            <div style={{ display: 'flex', gap: 8, fontSize: 11, color: 'var(--mal-mid)', alignItems: 'center' }}>
              {Ico.check({ width: 12, height: 12, stroke: 'var(--mal-success)' })}
              <span>{isAr ? `مرسلة من ${invitedSupplierName}` : `Shared by ${invitedSupplierName}`}</span>
            </div>
          )}
          <label style={{ display: 'flex', gap: 10, fontSize: 12, color: 'var(--mal-mid)', alignItems: 'flex-start', marginTop: 6 }}>
            <input type="checkbox" defaultChecked style={{ marginTop: 3 }}/>
            <span>{isAr ? 'أوافق على الشروط وسياسة الخصوصية ومشاركة بيانات AECB.' : 'I agree to the Terms, Privacy, and AECB data sharing.'}</span>
          </label>
          <div style={{ marginTop: 'auto' }}>
            <Button kind="primary" size="lg" full onClick={next} iconRight="arrow">{isAr ? 'إرسال الرمز' : 'Send code'}</Button>
          </div>
        </div>
      </div>
    );
  }

  // ── 2 · OTP ───────────────────────────────────────────────
  if (step === 'otp') {
    const otpPhone = '+971 ' + (invitedBy?.contact?.mobile || '50 247 8810');
    return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 760 }}>
      <Header title={isAr ? 'أدخل الرمز' : 'Enter the code'} sub={isAr ? `أُرسل إلى ${otpPhone}` : `Sent to ${otpPhone}`}/>
      <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 24 }}>
          {['4','7','2','9','0','—'].map((d, i) => (
            <div key={i} style={{
              width: 44, height: 56, borderRadius: 12, border: '1.5px solid ' + (d === '—' ? 'var(--mal-primary-3)' : 'var(--mal-line)'),
              background: 'var(--mal-paper)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24, fontFamily: 'var(--mal-font-display)', fontStyle: 'italic',
              color: d === '—' ? 'var(--mal-primary-3)' : 'var(--mal-ink)'
            }}>{d === '—' ? '|' : d}</div>
          ))}
        </div>
        <button style={{ background: 'transparent', border: 'none', color: 'var(--mal-primary-3)', fontSize: 13, fontWeight: 500, marginTop: 8 }}>
          {isAr ? 'إعادة الإرسال خلال ٠٠:٢٤' : 'Resend in 00:24'}
        </button>
        <div style={{ marginTop: 'auto' }}>
          <Button kind="primary" size="lg" full onClick={next} iconRight="arrow">{isAr ? 'تحقّق' : 'Verify'}</Button>
        </div>
      </div>
    </div>
    );
  }

  // ── 3 · Trade Licence ─────────────────────────────────────
  if (step === 'license') return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 760 }}>
      <Header title={isAr ? 'الرخصة التجارية' : 'Trade licence'} sub={isAr ? 'سنتحقّق مباشرة مع DED.' : 'We\'ll verify with DED in real time.'}/>
      <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
        <Field label={isAr ? 'الإمارة' : 'Emirate of issue'}>
          <Tabs value="DUBAI" onChange={() => {}} items={[
            { value: 'DUBAI', label: 'Dubai' }, { value: 'AUH', label: 'Abu Dhabi' }, { value: 'SHJ', label: 'Sharjah' },
          ]}/>
        </Field>
        <Field label={isAr ? 'رقم الرخصة' : 'Licence number'}>
          <Input defaultValue="DED-1247739"/>
        </Field>
        <Card padded style={{ background: 'linear-gradient(135deg, #EFEAFF, #FAF7EE)', border: '1px solid var(--mal-primary-50)' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {Ico.check({ width: 22, height: 22, stroke: 'var(--mal-success)' })}
            <div>
              <div style={{ fontWeight: 500, fontSize: 14 }}>Crescent Trading FZE</div>
              <div style={{ fontSize: 11, color: 'var(--mal-mid)' }}>{isAr ? 'تجارة عامة · قيد ٢٠١٧ · سارية' : 'General Trading · Est. 2017 · Active'}</div>
            </div>
          </div>
        </Card>
        <Field label={isAr ? 'الرقم الضريبي (TRN)' : 'Tax registration number (TRN)'} hint="15 digits">
          <Input defaultValue="100247531800003"/>
        </Field>
        <div style={{ marginTop: 'auto' }}>
          <Button kind="primary" size="lg" full onClick={next} iconRight="arrow">{isAr ? 'متابعة' : 'Continue'}</Button>
        </div>
      </div>
    </div>
  );

  // ── 4 · UAE Pass ──────────────────────────────────────────
  if (step === 'uaepass') return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 760 }}>
      <Header title={isAr ? 'هويّة المالك' : 'Verify owner identity'} sub={isAr ? 'نُمرّر لك إلى تطبيق هويّة الإمارات.' : 'We\'ll redirect you to UAE Pass.'}/>
      <div style={{ padding: 18, flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Card padded style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: 28, textAlign: 'center' }}>
          <div style={{ width: 76, height: 76, borderRadius: 18, background: 'linear-gradient(135deg, #00B89F, #006B5C)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 24, fontFamily: 'var(--mal-font-display)', fontStyle: 'italic' }}>U</div>
          <div className="mal-h2">{isAr ? 'سجّل دخولك بـ UAE Pass' : 'Sign in with UAE Pass'}</div>
          <div style={{ fontSize: 13, color: 'var(--mal-mid)', maxWidth: 280 }}>
            {isAr ? 'سنسحب اسمك ومستنداتك بأمان. لن نشاهد معلومات التطبيقات الأخرى.' : 'We pull your name and documents securely. We can\'t see anything else on UAE Pass.'}
          </div>
          <Button kind="primary" full size="lg" iconRight="arrow" onClick={next}>{isAr ? 'افتح UAE Pass' : 'Open UAE Pass'}</Button>
        </Card>
        <div style={{ display: 'flex', gap: 8, fontSize: 12, color: 'var(--mal-mid)', alignItems: 'center', justifyContent: 'center' }}>
          {Ico.shield({ width: 14, height: 14 })}
          <span>{isAr ? 'تشفير بمستوى البنوك · ADGM FSRA' : 'Bank-grade encryption · ADGM FSRA'}</span>
        </div>
      </div>
    </div>
  );

  // ── 5 · Owners / UBO ──────────────────────────────────────
  if (step === 'owners') return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 760 }}>
      <Header title={isAr ? 'المالكون والمفوّضون' : 'Owners & signatories'} sub={
        invitedBy
          ? (isAr ? `سحبناهم من سجلّات ${invitedSupplierName}. تحقّق فقط.` : `Pulled via ${invitedSupplierName}'s trade register record. Just confirm.`)
          : (isAr ? 'سحبناهم من السجل التجاري.' : 'Pre-filled from the trade register. Adjust if needed.')
      }/>
      <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
        {[
          { name: 'Aisha Bin Hamad', role: isAr ? 'مالك ٦٠٪ · مفوّض' : 'Owner 60% · Signatory', tone: 'lilac', tag: 'UBO' },
          { name: 'Khalid Al Mansoori', role: isAr ? 'مالك ٤٠٪' : 'Owner 40%', tone: 'sky', tag: 'UBO' },
          { name: 'Reem A.', role: isAr ? 'مدير العمليات' : 'Ops manager', tone: 'peach', tag: '' },
        ].map((p, i) => (
          <Card key={i} padded style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Avatar tone={p.tone} name={p.name.split(' ').map(s => s[0]).join('')} size={40}/>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{p.name}</div>
              <div style={{ fontSize: 11, color: 'var(--mal-mid)' }}>{p.role}</div>
            </div>
            {p.tag && <Pill tone="ink">{p.tag}</Pill>}
            {Ico.check({ stroke: 'var(--mal-success)' })}
          </Card>
        ))}
        <button style={{ background: 'transparent', border: '1px dashed var(--mal-line)', borderRadius: 12, padding: 14, color: 'var(--mal-mid)', fontSize: 13, marginTop: 6 }}>
          + {isAr ? 'إضافة شخص' : 'Add a person'}
        </button>
        <div style={{ marginTop: 'auto' }}>
          <Button kind="primary" size="lg" full onClick={next} iconRight="arrow">{isAr ? 'متابعة' : 'Continue'}</Button>
        </div>
      </div>
    </div>
  );

  // ── 6 · Bank Connect ─────────────────────────────────────
  if (step === 'bank') return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 760 }}>
      <Header title={isAr ? 'اربط بنكك' : 'Connect your bank'} sub={isAr ? 'بيانات ١٢ شهراً للقراءة فقط.' : '12 months of statements, read-only.'}/>
      <div style={{ padding: 18, flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { b: 'Emirates NBD', c: '#9D2235' }, { b: 'Mashreq', c: '#E60012' },
            { b: 'ADCB', c: '#012169' }, { b: 'FAB', c: '#1F2A44' },
            { b: 'ADIB', c: '#00754A' }, { b: 'Wio', c: '#0B0B14' },
          ].map((x, i) => (
            <button key={i} className={i === 0 ? 'mal-card-selected' : 'mal-card'} style={{
              padding: 14, textAlign: 'start', cursor: 'pointer',
              background: 'var(--mal-paper)', border: i === 0 ? '1.5px solid var(--mal-primary-3)' : '1px solid var(--mal-line)',
              borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 8
            }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: x.c, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>{x.b[0]}</div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{x.b}</div>
              <div style={{ fontSize: 10, color: 'var(--mal-mid)' }}>via Lean</div>
            </button>
          ))}
        </div>
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8, fontSize: 11, color: 'var(--mal-mid)' }}>
            {Ico.shield({ width: 14, height: 14 })}
            <span>{isAr ? 'لا نستطيع تحريك الأموال بدون توقيعك.' : 'We can\'t move money without your sign-off.'}</span>
          </div>
          <Button kind="primary" size="lg" full onClick={next} iconRight="arrow">{isAr ? 'الاتصال بـ Emirates NBD' : 'Connect Emirates NBD'}</Button>
        </div>
      </div>
    </div>
  );

  // ── 7 · Documents ────────────────────────────────────────
  if (step === 'documents') return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 760 }}>
      <Header title={isAr ? 'مستندات الشركة' : 'Company documents'} sub={isAr ? 'بقي ٢ من ٤.' : '2 of 4 left.'}/>
      <div style={{ padding: 18, flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[
          { name: isAr ? 'الرخصة التجارية' : 'Trade licence', status: 'done', sub: 'DED-1247739.pdf · 1.2 MB' },
          { name: isAr ? 'عقد التأسيس' : 'Memorandum of Association', status: 'done', sub: 'MoA-Crescent.pdf · 880 KB' },
          { name: isAr ? 'كشف بنكي ١٢ شهر' : '12-mo bank statement', status: 'auto', sub: isAr ? 'سُحب من Emirates NBD' : 'Pulled from Emirates NBD' },
          { name: isAr ? 'الميزانية المدققة' : 'Audited financials FY24', status: 'todo', sub: isAr ? 'PDF حتى ١٠ ميجابايت' : 'PDF up to 10 MB' },
        ].map((d, i) => (
          <Card key={i} padded style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--mal-surface-2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {Ico.invoice({ stroke: 'var(--mal-mid)' })}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{d.name}</div>
              <div style={{ fontSize: 11, color: 'var(--mal-mid)' }}>{d.sub}</div>
            </div>
            {d.status === 'done' && <Pill tone="success" dot>{isAr ? 'تم' : 'Done'}</Pill>}
            {d.status === 'auto' && <Pill tone="info" dot>{isAr ? 'تلقائي' : 'Auto'}</Pill>}
            {d.status === 'todo' && <Button kind="secondary" size="sm" icon="upload">{isAr ? 'رفع' : 'Upload'}</Button>}
          </Card>
        ))}
        <div style={{ marginTop: 'auto' }}>
          <Button kind="primary" size="lg" full onClick={next} iconRight="arrow">{isAr ? 'تخطّي وإرسال' : 'Skip & submit'}</Button>
        </div>
      </div>
    </div>
  );

  // ── 8 · Review ────────────────────────────────────────────
  if (step === 'review') return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 760 }}>
      <Header title={isAr ? 'مراجعة الطلب' : 'Review your application'}/>
      <div style={{ padding: 18, flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[
          ...(invitedBy ? [[isAr ? 'دُعيت من' : 'Invited by', invitedSupplierName]] : []),
          [isAr ? 'الشركة' : 'Company', invitedBuyerLegalName || 'Crescent Trading FZE'],
          [isAr ? 'الرخصة' : 'Licence', (invitedBy?.buyer?.licenceNo || 'DED-1247739') + ' · ' + (invitedBy?.buyer?.licenceEmirate || 'Dubai')],
          [isAr ? 'TRN' : 'TRN', invitedBy?.buyer?.trn || '100247531800003'],
          [isAr ? 'المالك المستفيد' : 'Beneficial owner', invitedBy?.contact?.name || 'Aisha Bin Hamad'],
          [isAr ? 'البنك' : 'Bank', 'Emirates NBD · ●●●● 4419'],
          [isAr ? 'الإيرادات السنوية المقدّرة' : 'Est. annual revenue', 'AED 12.4M'],
        ].map(([k, v], i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0',
            borderBottom: '1px solid var(--mal-line-2)', fontSize: 13 }}>
            <span style={{ color: 'var(--mal-mid)' }}>{k}</span>
            <span style={{ fontWeight: 500 }}>{v}</span>
          </div>
        ))}
        <Card padded style={{ background: '#FFF8E1', border: '1px solid #F4D38C', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          {Ico.info({ stroke: '#B86F1A' })}
          <div style={{ fontSize: 12, color: '#5C4310' }}>
            {isAr ? 'بإرسال الطلب توافق على فحص AECB والتحقّق من السجلات الحكومية.' : 'Submitting authorises an AECB pull and government register checks.'}
          </div>
        </Card>
        <div style={{ marginTop: 'auto' }}>
          <Button kind="iri" size="lg" full onClick={next} iconRight="arrow">{isAr ? 'إرسال الطلب' : 'Submit application'}</Button>
        </div>
      </div>
    </div>
  );

  // ── 9 · Decision Loading ──────────────────────────────────
  if (step === 'decision') {
    return <DecisionStep isAr={isAr} onDone={next} invitedSupplierName={invitedSupplierName}/>;
  }

  // ── 10 · Limit Reveal (the hero) ──────────────────────────
  if (step === 'limit') return <HeroLimit lang={lang} onContinue={onDone || next} inviteContext={invitedBy}/>;

  return null;
}

// Decision step. CSS-only staggered animation. Each row reveals at its
// own delay; no React state, so re-mounts don't break it. After ~4.5s
// total the Continue button fades in and is clickable.
function DecisionStep({ isAr, onDone, invitedSupplierName }) {
  const ROWS = [
    { l: isAr ? 'سحب AECB'                  : 'AECB pull' },
    { l: isAr ? 'تحليل ١٢ شهراً بنكي'        : '12-mo cash-flow scoring' },
    { l: isAr ? 'محرّك سياسة الائتمان'      : 'Credit policy engine' },
    { l: isAr ? 'مراجعة مستندات'            : 'Document review' },
    ...(invitedSupplierName
      ? [{ l: isAr ? `ربط علاقتك بـ ${invitedSupplierName}` : `Linking your ${invitedSupplierName} relationship` }]
      : []),
    { l: isAr ? 'القرار النهائي'             : 'Final decision' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 760, padding: 24, gap: 20 }}>
      <div style={{ height: 180, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 16 }}>
        <div className="mal-orb" style={{ width: 150, height: 150, animation: 'mal-orb-spin 4s linear infinite' }}/>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div className="mal-display-md" style={{ fontStyle: 'italic' }}>
          {isAr ? 'نُحلّل ملفك…' : 'Analysing your file…'}
        </div>
        <div style={{ color: 'var(--mal-mid)', fontSize: 13, marginTop: 8 }}>
          {isAr ? 'استغرق هذا ٤–٥ ثوانٍ في العادة' : 'This usually takes 4–5 seconds'}
        </div>
      </div>
      <Card padded style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {ROWS.map((r, i) => (
          <div key={i} className="mal-decision-row" style={{
            display: 'flex', alignItems: 'center', gap: 10, fontSize: 13,
            position: 'relative',
            // Row stays at 'wait' state, then transitions to 'done' via two
            // overlay layers each animated with its own delay.
          }}>
            <div style={{ width: 16, height: 16, position: 'relative', flexShrink: 0 }}>
              {/* Wait/load circle. Visible by default, fades out after row's delay */}
              <div style={{
                position: 'absolute', inset: 0,
                width: 14, height: 14,
                border: '2px solid var(--mal-primary-3)',
                borderTopColor: 'transparent',
                borderRadius: 999,
                animation: 'mal-spin 1s linear infinite, mal-decision-fade-out .3s ease forwards',
                animationDelay: `0s, ${0.3 + i * 0.85}s`,
              }}/>
              {/* Done check. Invisible by default, fades in at row's delay */}
              <div style={{
                position: 'absolute', inset: 0,
                width: 16, height: 16,
                opacity: 0,
                animation: 'mal-decision-fade-in .35s ease forwards',
                animationDelay: `${0.4 + i * 0.85}s`,
                color: 'var(--mal-success)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {Ico.check({ width: 16, height: 16, stroke: 'var(--mal-success)' })}
              </div>
            </div>
            <span style={{ color: 'var(--mal-ink)' }}>{r.l}</span>
            {/* "running" label that fades out as "done" fades in */}
            <span style={{
              marginLeft: 'auto', fontSize: 11, color: 'var(--mal-mid)',
              animation: 'mal-decision-fade-out .3s ease forwards',
              animationDelay: `${0.3 + i * 0.85}s`,
            }}>{isAr ? 'جارٍ' : 'running'}</span>
            <span style={{
              position: 'absolute', insetInlineEnd: 0,
              marginLeft: 'auto', fontSize: 11, color: 'var(--mal-success)',
              opacity: 0,
              animation: 'mal-decision-fade-in .35s ease forwards',
              animationDelay: `${0.4 + i * 0.85}s`,
            }}>{isAr ? 'تمّ' : 'done'}</span>
          </div>
        ))}
      </Card>
      <div style={{ marginTop: 'auto', position: 'relative' }}>
        {/* Continue button. Appears after all rows complete (~last row delay + .5s) */}
        <div style={{
          opacity: 0,
          animation: 'mal-decision-fade-in .4s ease forwards',
          animationDelay: `${0.4 + (ROWS.length - 1) * 0.85 + 0.5}s`,
        }}>
          <Button kind="primary" size="lg" full iconRight="arrow" onClick={onDone}>
            {isAr ? 'عرض حدّك الائتماني' : 'Reveal your limit'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Supplier Onboarding. 8 screens
// ============================================================
const SUPPLIER_STEPS = ['welcome', 'phone', 'license', 'invoice', 'bank', 'buyers', 'review', 'ready'];

function SupplierOnboardingFlow({ lang, initialStep = 0, onDone, controlledStep, onStepChange }) {
  const [internalStep, setInternalStep] = oS(initialStep);
  const isControlled = typeof controlledStep === 'number';
  const stepIdx = isControlled ? controlledStep : internalStep;
  const setStepIdx = (n) => {
    const clamped = Math.min(SUPPLIER_STEPS.length - 1, Math.max(0, n));
    if (isControlled) onStepChange?.(clamped);
    else setInternalStep(clamped);
  };
  const step = SUPPLIER_STEPS[stepIdx];
  const next = () => setStepIdx(stepIdx + 1);
  const back = () => setStepIdx(stepIdx - 1);
  const isAr = lang === 'ar';
  const phases = isAr ? ['ابدأ', 'تحقّق', 'فواتير', 'جاهز'] : ['Start', 'Verify', 'Invoice', 'Ready'];
  const phaseOf = { welcome: 0, phone: 0, license: 1, invoice: 2, bank: 2, buyers: 2, review: 2, ready: 3 };

  const Header = ({ title, sub }) => (
    <div style={{ padding: '14px 18px 6px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {stepIdx > 0 ? <IconBtn icon="arrowL" size={32} onClick={back}/> : <MalOrb size={28}/>}
        <div className="mal-caption" style={{ flex: 1 }}>{isAr ? 'الخطوة' : 'Step'} {stepIdx + 1} / {SUPPLIER_STEPS.length}</div>
      </div>
      <Stepper steps={phases} current={phaseOf[step]}/>
      {title && <div style={{ marginTop: 8 }}>
        <div className="mal-display-sm" style={{ fontStyle: 'italic' }}>{title}</div>
        {sub && <div style={{ fontSize: 13, color: 'var(--mal-mid)', marginTop: 4 }}>{sub}</div>}
      </div>}
    </div>
  );

  if (step === 'welcome') return (
    <div style={{ height: '100%', minHeight: 760, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #FAF7EE 0%, #FBE9D8 60%, #FAF7EE 100%)' }}/>
      <div style={{ position: 'absolute', top: 80, insetInlineEnd: -100, width: 320, height: 320, opacity: .55 }}>
        <div className="mal-orb" style={{ width: '100%', height: '100%', animation: 'mal-orb-spin 22s linear infinite' }}/>
      </div>
      <div style={{ flex: 1, padding: 36, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', position: 'relative', zIndex: 1 }}>
        <MalLogo size={26}/>
        <h1 className="mal-display" style={{ fontSize: 56, fontStyle: 'italic', lineHeight: 1, marginTop: 32, marginBottom: 12 }}>
          {isAr ? <>اقبض اليوم،<br/><span className="mal-iri-text">لا الشهر القادم.</span></> : <>Get paid today,<br/><span className="mal-iri-text">not next month.</span></>}
        </h1>
        <p style={{ fontSize: 15, color: 'var(--mal-mid)', maxWidth: 320, lineHeight: 1.5 }}>
          {isAr ? 'سلفة على فواتيرك خلال ٤ ساعات. اعرف فروعك قبل أن ترسل الفاتورة.' : 'Advance your invoices in 4 hours. Know your buyer before you send the bill.'}
        </p>
        <Button kind="primary" size="lg" full iconRight="arrow" onClick={next} style={{ marginTop: 36 }}>{isAr ? 'ابدأ' : 'Get started'}</Button>
      </div>
    </div>
  );

  if (step === 'phone') return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 760 }}>
      <Header title={isAr ? 'بياناتك' : 'About you'}/>
      <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
        <Field label={isAr ? 'الجوّال' : 'Mobile'}>
          <Input defaultValue="+971 50 882 1140"/>
        </Field>
        <Field label={isAr ? 'البريد' : 'Business email'}><Input defaultValue="ops@atlaspackaging.ae"/></Field>
        <Field label={isAr ? 'المسمّى' : 'Your role'}>
          <Tabs value="ops" onChange={() => {}} items={[
            { value: 'owner', label: isAr ? 'مالك' : 'Owner' }, { value: 'ops', label: isAr ? 'عمليات' : 'Ops' }, { value: 'fin', label: isAr ? 'مالية' : 'Finance' },
          ]}/>
        </Field>
        <div style={{ marginTop: 'auto' }}>
          <Button kind="primary" size="lg" full onClick={next} iconRight="arrow">{isAr ? 'متابعة' : 'Continue'}</Button>
        </div>
      </div>
    </div>
  );

  if (step === 'license') return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 760 }}>
      <Header title={isAr ? 'الشركة' : 'Your company'} sub={isAr ? 'تحقّق فوري عبر السجل التجاري.' : 'Live check against the trade register.'}/>
      <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
        <Field label={isAr ? 'رقم الرخصة' : 'Licence number'}><Input defaultValue="JAFZA-882140"/></Field>
        <Field label={isAr ? 'TRN' : 'TRN'}><Input defaultValue="100118720500003"/></Field>
        <Card padded style={{ background: 'linear-gradient(135deg, #FBE9D8, #FAF7EE)', border: '1px solid #F0C795' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {Ico.check({ width: 22, height: 22, stroke: 'var(--mal-success)' })}
            <div>
              <div style={{ fontWeight: 500, fontSize: 14 }}>Atlas Packaging FZ-LLC</div>
              <div style={{ fontSize: 11, color: 'var(--mal-mid)' }}>{isAr ? 'تصنيع · جبل علي · ٢٠١٢' : 'Manufacturing · JAFZA · Est. 2012'}</div>
            </div>
          </div>
        </Card>
        <div style={{ marginTop: 'auto' }}>
          <Button kind="primary" size="lg" full onClick={next} iconRight="arrow">{isAr ? 'متابعة' : 'Continue'}</Button>
        </div>
      </div>
    </div>
  );

  if (step === 'invoice') return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 760 }}>
      <Header title={isAr ? 'كيف تُرسل الفواتير؟' : 'How do you invoice?'}/>
      <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
        {[
          { id: 'peppol', t: isAr ? 'Peppol Network' : 'Peppol e-invoicing', s: isAr ? 'موصى به · موافقة هيئة الضرائب' : 'Recommended · FTA-aligned', sel: true, badge: 'Auto' },
          { id: 'zoho', t: 'Zoho Books', s: isAr ? 'ربط API' : 'API connect', sel: false },
          { id: 'tally', t: 'Tally Prime', s: isAr ? 'ربط API' : 'API connect', sel: false },
          { id: 'manual', t: isAr ? 'رفع PDF يدوي' : 'Upload PDFs manually', s: isAr ? 'بسيط لكن أبطأ' : 'Simple but slower', sel: false },
        ].map(o => (
          <Card key={o.id} padded style={{
            display: 'flex', alignItems: 'center', gap: 12,
            border: o.sel ? '1.5px solid var(--mal-primary-3)' : '1px solid var(--mal-line)',
            background: o.sel ? 'var(--mal-primary-50)' : 'var(--mal-paper)'
          }}>
            <div style={{ width: 18, height: 18, borderRadius: 999, border: '1.5px solid ' + (o.sel ? 'var(--mal-primary-3)' : 'var(--mal-line)'),
              background: o.sel ? 'var(--mal-primary-3)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {o.sel && <div style={{ width: 7, height: 7, borderRadius: 999, background: '#fff' }}/>}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{o.t}</div>
              <div style={{ fontSize: 11, color: 'var(--mal-mid)' }}>{o.s}</div>
            </div>
            {o.badge && <Pill tone="info" dot>{o.badge}</Pill>}
          </Card>
        ))}
        <div style={{ marginTop: 'auto' }}>
          <Button kind="primary" size="lg" full onClick={next} iconRight="arrow">{isAr ? 'متابعة' : 'Continue'}</Button>
        </div>
      </div>
    </div>
  );

  if (step === 'bank') return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 760 }}>
      <Header title={isAr ? 'حساب الإيداع' : 'Where do we wire?'} sub={isAr ? 'حساب IBAN باسم شركتك.' : 'IBAN in your company name.'}/>
      <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
        <Field label="IBAN"><Input defaultValue="AE 07 0331 2345 6789 0123 456" className="mal-mono"/></Field>
        <Card padded style={{ background: 'var(--mal-surface-2)', display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: '#9D2235', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>E</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>Emirates NBD</div>
            <div style={{ fontSize: 11, color: 'var(--mal-mid)' }}>Atlas Packaging FZ-LLC · {isAr ? 'مطابق' : 'Name match'}</div>
          </div>
          <Pill tone="success" dot>{isAr ? 'مؤكَّد' : 'Verified'}</Pill>
        </Card>
        <Field label={isAr ? 'تفضيل سرعة الإيداع' : 'Wire speed'}>
          <Tabs value="instant" onChange={() => {}} items={[
            { value: 'instant', label: isAr ? 'فوري · رسوم' : 'Instant · fee' }, { value: 'sameday', label: isAr ? 'نفس اليوم' : 'Same day' },
          ]}/>
        </Field>
        <div style={{ marginTop: 'auto' }}>
          <Button kind="primary" size="lg" full onClick={next} iconRight="arrow">{isAr ? 'متابعة' : 'Continue'}</Button>
        </div>
      </div>
    </div>
  );

  if (step === 'buyers') return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 760 }}>
      <Header title={isAr ? 'أكبر مشترين' : 'Your top buyers'} sub={isAr ? 'سنفحص قدرتهم الائتمانية.' : 'We\'ll pre-score them for financing.'}/>
      <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        {[
          { n: 'Crescent Trading FZE', s: 'A', amt: 'AED 4.2M / yr' },
          { n: 'Solea Hospitality', s: 'B', amt: 'AED 1.8M / yr' },
          { n: 'Pearl Logistics', s: 'A', amt: 'AED 1.1M / yr' },
        ].map((b, i) => (
          <Card key={i} padded style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Avatar tone={i === 0 ? 'lilac' : i === 1 ? 'coral' : 'sky'} name={b.n.split(' ').map(s => s[0]).join('').slice(0, 2)} size={36}/>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{b.n}</div>
              <div style={{ fontSize: 11, color: 'var(--mal-mid)' }}>{b.amt}</div>
            </div>
            <Pill tone="ink">{b.s}</Pill>
            {Ico.check({ stroke: 'var(--mal-success)' })}
          </Card>
        ))}
        <button style={{ background: 'transparent', border: '1px dashed var(--mal-line)', borderRadius: 12, padding: 14, color: 'var(--mal-mid)', fontSize: 13, marginTop: 6 }}>
          + {isAr ? 'أضف مشترٍ' : 'Add a buyer'}
        </button>
        <div style={{ marginTop: 'auto' }}>
          <Button kind="primary" size="lg" full onClick={next} iconRight="arrow">{isAr ? 'متابعة' : 'Continue'}</Button>
        </div>
      </div>
    </div>
  );

  if (step === 'review') return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 760 }}>
      <Header title={isAr ? 'مراجعة وتقديم' : 'Review & submit'}/>
      <div style={{ padding: 18, flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[
          [isAr ? 'الشركة' : 'Company', 'Atlas Packaging FZ-LLC'],
          [isAr ? 'الرخصة' : 'Licence', 'JAFZA-882140'],
          [isAr ? 'الفواتير' : 'Invoicing', 'Peppol'],
          [isAr ? 'الإيداع' : 'Wire to', 'Emirates NBD ●●●● 3456'],
          [isAr ? 'مشترين' : 'Buyers added', '3'],
        ].map(([k, v], i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0',
            borderBottom: '1px solid var(--mal-line-2)', fontSize: 13 }}>
            <span style={{ color: 'var(--mal-mid)' }}>{k}</span>
            <span style={{ fontWeight: 500 }}>{v}</span>
          </div>
        ))}
        <div style={{ marginTop: 'auto' }}>
          <Button kind="iri" size="lg" full onClick={next} iconRight="arrow">{isAr ? 'تقديم' : 'Submit'}</Button>
        </div>
      </div>
    </div>
  );

  if (step === 'ready') return (
    <div style={{ minHeight: 760, padding: 28, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, textAlign: 'center', justifyContent: 'center' }}>
      <div className="mal-orb" style={{ width: 140, height: 140, animation: 'mal-orb-spin 12s linear infinite' }}/>
      <div className="mal-display-md mal-iri-text" style={{ fontStyle: 'italic' }}>{isAr ? 'كل شيء جاهز.' : 'You\'re all set.'}</div>
      <div style={{ fontSize: 14, color: 'var(--mal-mid)', maxWidth: 280 }}>
        {isAr ? 'أرسل أول فاتورة وستظهر هنا خلال دقيقة. نحوّل خلال ٤ ساعات.' : 'Send your first invoice، it\'ll appear here within a minute. We wire in 4 hours.'}
      </div>
      <Card padded style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', maxWidth: 320 }}>
        <Avatar tone="ink" name="📨" size={36}/>
        <div style={{ flex: 1, textAlign: 'start' }}>
          <div style={{ fontSize: 13, fontWeight: 500 }}>billing@atlas.mal.ae</div>
          <div style={{ fontSize: 11, color: 'var(--mal-mid)' }}>{isAr ? 'CC هذا الإيميل لتمويل تلقائي' : 'CC this email for instant financing'}</div>
        </div>
        <IconBtn icon="copy" size={32}/>
      </Card>
      <Button kind="primary" size="lg" full iconRight="arrow" onClick={onDone || next}>{isAr ? 'افتح اللوحة' : 'Open dashboard'}</Button>
    </div>
  );

  return null;
}

// ============================================================
// Supplier-side: Invite a Buyer wizard
// Three-step flow: search by trade licence → buyer contact → preview & send.
// Output is a fixture-shaped `inviteRecord` written to MalSession so the
// supplier app can show it in the "Invited buyers" section.
// ============================================================
function SupplierInviteBuyerFlow({ lang, onDone, onCancel }) {
  const isAr = lang === 'ar';
  const [step, setStep] = oS(0);
  const [licenceNo, setLicenceNo] = oS('');
  const [emirate, setEmirate] = oS('DUBAI');
  const [foundCo, setFoundCo] = oS(null);
  const [contactName, setContactName] = oS('');
  const [contactMobile, setContactMobile] = oS('');
  const [contactEmail, setContactEmail] = oS('');
  const [paymentTerms, setPaymentTerms] = oS('60');
  const [annualVolume, setAnnualVolume] = oS('1-5M');
  const [verifying, setVerifying] = oS(false);

  const phases = isAr ? ['ابحث', 'جهة الاتصال', 'إرسال'] : ['Find', 'Contact', 'Send'];
  const back = () => step > 0 ? setStep(step - 1) : onCancel?.();
  const next = () => setStep(step + 1);

  const verifyLicence = () => {
    setVerifying(true);
    setTimeout(() => {
      setVerifying(false);
      // Demo: any licence number returns the Crescent fixture.
      setFoundCo({
        legalName: 'Crescent Trading FZE',
        licenceNo: licenceNo || 'DED-1247739',
        licenceEmirate: emirate === 'DUBAI' ? 'Dubai' : emirate === 'AUH' ? 'Abu Dhabi' : 'Sharjah',
        trn: '100247531800003',
        sub: isAr ? 'تجارة عامة · قيد ٢٠١٧ · سارية' : 'General Trading · Est. 2017 · Active',
      });
    }, 900);
  };

  const sendInvite = () => {
    const record = {
      id: 'INV-' + Math.random().toString(36).slice(2, 8).toUpperCase(),
      supplier: { name: 'Atlas Packaging FZ-LLC', licence: 'JAFZA-882140', tone: 'sky' },
      buyer: foundCo,
      contact: { name: contactName || 'Aisha Bin Hamad', mobile: contactMobile || '50 247 8810', email: contactEmail || 'aisha.b@crescenttrading.ae' },
      relationship: { paymentTerms, annualVolume },
      status: 'invited',
      sentAt: new Date().toISOString(),
    };
    if (window.MalSession) {
      const cache = window.MalSession.getCache() || {};
      const existing = (cache.supplierInvitedBuyers && cache.supplierInvitedBuyers.list) || [];
      window.MalSession.saveSlice('supplierInvitedBuyers', { list: [record, ...existing] });
    }
    window.__MAL_LAST_INVITE = record;
    setStep(3);
  };

  const Header = () => (
    <div style={{ padding: '14px 18px 6px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <IconBtn icon="arrowL" size={32} onClick={back}/>
        <div className="mal-caption" style={{ flex: 1 }}>{isAr ? 'دعوة مشترٍ' : 'Invite a buyer'}</div>
        <span style={{ fontSize: 11, color: 'var(--mal-mid)' }}>{Math.min(step + 1, phases.length)} / {phases.length}</span>
      </div>
      {step < 3 && <Stepper steps={phases} current={Math.min(step, phases.length - 1)}/>}
    </div>
  );

  // ── 0 · Find ──────────────────────────────────────────────
  if (step === 0) return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 760 }}>
      <Header/>
      <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
        <div style={{ marginTop: 4 }}>
          <div className="mal-display-sm" style={{ fontStyle: 'italic' }}>{isAr ? 'ابحث عن شركة المشتري' : 'Find your buyer'}</div>
          <div style={{ fontSize: 13, color: 'var(--mal-mid)', marginTop: 4 }}>
            {isAr ? 'تحقّق مباشر مع السجل التجاري.' : 'Live DED / trade-register check.'}
          </div>
        </div>
        <Field label={isAr ? 'الإمارة' : 'Emirate'}>
          <Tabs value={emirate} onChange={setEmirate} items={[
            { value: 'DUBAI', label: 'Dubai' }, { value: 'AUH', label: 'Abu Dhabi' }, { value: 'SHJ', label: 'Sharjah' },
          ]}/>
        </Field>
        <Field label={isAr ? 'رقم الرخصة التجارية' : 'Trade licence number'}>
          <Input placeholder="DED-1247739" value={licenceNo} onChange={e => { setLicenceNo(e.target.value); setFoundCo(null); }}/>
        </Field>
        {!foundCo && !verifying && (
          <Button kind="secondary" size="md" onClick={verifyLicence} icon="search">
            {isAr ? 'تحقّق من الشركة' : 'Verify with trade register'}
          </Button>
        )}
        {verifying && (
          <Card padded style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div className="mal-orb" style={{ width: 28, height: 28 }}/>
            <div style={{ fontSize: 13, color: 'var(--mal-mid)' }}>{isAr ? 'يتم التحقّق…' : 'Verifying with DED…'}</div>
          </Card>
        )}
        {foundCo && (
          <Card padded style={{ background: 'linear-gradient(135deg, #EFEAFF, #FAF7EE)', border: '1px solid var(--mal-primary-50)' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              {Ico.check({ width: 22, height: 22, stroke: 'var(--mal-success)' })}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, fontSize: 14 }}>{foundCo.legalName}</div>
                <div style={{ fontSize: 11, color: 'var(--mal-mid)' }}>{foundCo.sub} · {foundCo.licenceNo}</div>
              </div>
            </div>
          </Card>
        )}
        <div style={{ marginTop: 'auto' }}>
          <Button kind="primary" size="lg" full disabled={!foundCo} onClick={next} iconRight="arrow">
            {isAr ? 'متابعة' : 'Continue'}
          </Button>
        </div>
      </div>
    </div>
  );

  // ── 1 · Buyer contact + relationship ────────────────────
  if (step === 1) return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 760 }}>
      <Header/>
      <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
        <div>
          <div className="mal-display-sm" style={{ fontStyle: 'italic' }}>{isAr ? 'جهة الاتصال لدى المشتري' : 'Their contact at the buyer'}</div>
          <div style={{ fontSize: 13, color: 'var(--mal-mid)', marginTop: 4 }}>
            {isAr ? 'سنرسل لهم دعوة عبر الرسائل القصيرة والبريد.' : 'We\'ll send them an SMS + email invite.'}
          </div>
        </div>
        <Field label={isAr ? 'الاسم' : 'Contact name'}>
          <Input placeholder="Aisha Bin Hamad" value={contactName} onChange={e => setContactName(e.target.value)}/>
        </Field>
        <Field label={isAr ? 'الجوّال' : 'Mobile'}>
          <div style={{ display: 'flex', gap: 8 }}>
            <div className="mal-input" style={{ width: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <span style={{ fontSize: 16 }}>🇦🇪</span><span>+971</span>
            </div>
            <Input placeholder="50 247 8810" value={contactMobile} onChange={e => setContactMobile(e.target.value)} style={{ flex: 1 }}/>
          </div>
        </Field>
        <Field label={isAr ? 'البريد' : 'Business email'}>
          <Input placeholder="aisha.b@crescenttrading.ae" value={contactEmail} onChange={e => setContactEmail(e.target.value)}/>
        </Field>
        <Field label={isAr ? 'شروط الدفع المعتادة' : 'Typical payment terms'}>
          <Tabs value={paymentTerms} onChange={setPaymentTerms} items={[
            { value: '30', label: 'Net 30' }, { value: '60', label: 'Net 60' }, { value: '90', label: 'Net 90' },
          ]}/>
        </Field>
        <Field label={isAr ? 'حجم سنوي تقديري' : 'Estimated annual volume'}>
          <Tabs value={annualVolume} onChange={setAnnualVolume} items={[
            { value: '<1M', label: '< 1M' }, { value: '1-5M', label: '1–5M' }, { value: '>5M', label: '> 5M' },
          ]}/>
        </Field>
        <div style={{ marginTop: 'auto' }}>
          <Button kind="primary" size="lg" full onClick={next} iconRight="arrow">
            {isAr ? 'معاينة' : 'Preview'}
          </Button>
        </div>
      </div>
    </div>
  );

  // ── 2 · Preview + send ──────────────────────────────────
  if (step === 2) return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 760 }}>
      <Header/>
      <div style={{ padding: 18, flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="mal-display-sm" style={{ fontStyle: 'italic' }}>{isAr ? 'معاينة الدعوة' : 'Preview the invite'}</div>
        <Card padded style={{ background: 'var(--mal-surface-2)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 11, color: 'var(--mal-mid)' }}>{isAr ? 'إلى' : 'To'}</div>
          <div style={{ fontSize: 14, fontWeight: 500 }}>{contactName || 'Aisha Bin Hamad'} · {foundCo?.legalName}</div>
          <div style={{ fontSize: 12, color: 'var(--mal-mid)' }}>{contactMobile ? `+971 ${contactMobile}` : '+971 50 247 8810'} · {contactEmail || 'aisha.b@crescenttrading.ae'}</div>
        </Card>
        {[
          [isAr ? 'الشركة' : 'Company', foundCo?.legalName],
          [isAr ? 'الرخصة' : 'Licence', `${foundCo?.licenceNo} · ${foundCo?.licenceEmirate}`],
          [isAr ? 'شروط الدفع' : 'Payment terms', `Net ${paymentTerms}`],
          [isAr ? 'حجم سنوي' : 'Annual volume', annualVolume === '<1M' ? '< AED 1M' : annualVolume === '1-5M' ? 'AED 1–5M' : '> AED 5M'],
        ].map(([k, v], i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0',
            borderBottom: '1px solid var(--mal-line-2)', fontSize: 13 }}>
            <span style={{ color: 'var(--mal-mid)' }}>{k}</span>
            <span style={{ fontWeight: 500 }}>{v}</span>
          </div>
        ))}
        <Card padded style={{ background: '#FFF8E1', border: '1px solid #F4D38C', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          {Ico.info({ stroke: '#B86F1A' })}
          <div style={{ fontSize: 12, color: '#5C4310' }}>
            {isAr
              ? 'يجب على المشتري إكمال هويّة UAE Pass، والمالكين، والبنك. لا يمكن تمويل فواتيرهم قبل التفعيل.'
              : 'Buyer still completes UAE Pass, owners, and bank connect. You can\'t finance their invoices until they\'re Active.'}
          </div>
        </Card>
        <div style={{ marginTop: 'auto' }}>
          <Button kind="iri" size="lg" full onClick={sendInvite} iconRight="arrow">
            {isAr ? 'إرسال الدعوة' : 'Send invite'}
          </Button>
        </div>
      </div>
    </div>
  );

  // ── 3 · Sent ────────────────────────────────────────────
  if (step === 3) return (
    <div style={{ minHeight: 760, padding: 28, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, textAlign: 'center', justifyContent: 'center' }}>
      <div className="mal-orb" style={{ width: 120, height: 120, animation: 'mal-orb-spin 12s linear infinite' }}/>
      <div className="mal-display-md mal-iri-text" style={{ fontStyle: 'italic' }}>
        {isAr ? 'أُرسلت الدعوة' : 'Invite sent'}
      </div>
      <div style={{ fontSize: 14, color: 'var(--mal-mid)', maxWidth: 300 }}>
        {isAr
          ? `أرسلنا الدعوة إلى ${contactName || 'Aisha Bin Hamad'}. ستظهر هنا كـ "في الانتظار" حتى تكتمل.`
          : `We sent the invite to ${contactName || 'Aisha Bin Hamad'}. Track them in Buyers — status will move from Invited → Started → Active.`}
      </div>
      <Card padded style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', maxWidth: 340 }}>
        <Avatar tone="lilac" name={(foundCo?.legalName?.match(/\b\w/g) || ['A']).slice(0,2).join('')} size={40}/>
        <div style={{ flex: 1, textAlign: 'start' }}>
          <div style={{ fontSize: 13, fontWeight: 500 }}>{foundCo?.legalName}</div>
          <div style={{ fontSize: 11, color: 'var(--mal-mid)' }}>{contactName || 'Aisha Bin Hamad'}</div>
        </div>
        <Pill tone="warn" dot>{isAr ? 'مَدعو' : 'Invited'}</Pill>
      </Card>
      <div style={{ display: 'flex', gap: 10, marginTop: 8, width: '100%', maxWidth: 340 }}>
        <Button kind="secondary" size="lg" full onClick={() => { setStep(0); setFoundCo(null); setLicenceNo(''); setContactName(''); setContactMobile(''); setContactEmail(''); }}>
          {isAr ? 'دعوة أخرى' : 'Invite another'}
        </Button>
        <Button kind="primary" size="lg" full onClick={onDone} iconRight="arrow">
          {isAr ? 'انتهيت' : 'Done'}
        </Button>
      </div>
    </div>
  );

  return null;
}

Object.assign(window, {
  BuyerOnboardingFlow, SupplierOnboardingFlow,
  SupplierInviteBuyerFlow,
  BUYER_STEPS, BUYER_STEPS_COLD, BUYER_STEPS_INVITED, SUPPLIER_STEPS,
  INVITE_DEMO_FIXTURE,
});
