/* eslint-disable */
// Mal — Landing (4-section hero) + Design system page.

// ============================================================
// LANDING PAGE — single-screen hero, 4 interactive section cards
// ============================================================
function MalLanding({ lang = 'en', viewport = 'desktop', onLaunch }) {
  const isAr = lang === 'ar';
  const isMobile = viewport === 'mobile';

  const SECTIONS = [
    { id: 'strategy',  num: '01', label: isAr ? 'الاستراتيجية' : 'Strategy',
      accent: 'linear-gradient(135deg, #C9B7E8, #B6CFE8 70%, #FBD9B5)' },
    { id: 'prototype', num: '02', label: isAr ? 'النموذج' : 'Prototype',
      accent: 'linear-gradient(135deg, #B6CFE8, #C9B7E8 70%, #F0B7C2)' },
    { id: 'financial', num: '03', label: isAr ? 'النمذجة المالية' : 'Financial Modeling',
      accent: 'linear-gradient(135deg, #FBD9B5, #F0B7C2 60%, #C9B7E8)' },
    { id: 'ai',        num: '04', label: isAr ? 'مبادرات الذكاء' : 'AI Initiatives',
      accent: 'linear-gradient(135deg, #C658FD, #8B41E1 60%, #C9B7E8)' },
  ];

  return (
    <div dir={isAr ? 'rtl' : 'ltr'} style={{
      fontFamily: 'var(--mal-font-ui)', color: 'var(--mal-ink)',
      background: '#C2D1E6', minHeight: '100vh',
      position: 'relative', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Ambient orbs */}
      <div aria-hidden style={{
        position: 'absolute', top: -200, insetInlineEnd: -200,
        width: 600, height: 600, borderRadius: '50%',
        background: 'conic-gradient(from 90deg, var(--mal-iri-1), var(--mal-iri-2), var(--mal-iri-3), var(--mal-iri-4), var(--mal-iri-1))',
        filter: 'blur(90px)', opacity: 0.4,
        animation: 'mal-orb-spin 40s linear infinite',
        pointerEvents: 'none',
      }}/>
      <div aria-hidden style={{
        position: 'absolute', bottom: -240, insetInlineStart: -240,
        width: 540, height: 540, borderRadius: '50%',
        background: 'conic-gradient(from 270deg, var(--mal-iri-3), var(--mal-iri-1), var(--mal-iri-4), var(--mal-iri-2))',
        filter: 'blur(110px)', opacity: 0.32,
        animation: 'mal-orb-spin 55s linear infinite reverse',
        pointerEvents: 'none',
      }}/>

      {/* Top bar — just wordmark */}
      <header style={{
        height: 64, paddingInline: isMobile ? 18 : 56,
        display: 'flex', alignItems: 'center',
        position: 'relative', zIndex: 2,
      }}>
        <MalLogo size={22}/>
      </header>

      {/* Center stage */}
      <section style={{
        flex: 1, position: 'relative', zIndex: 2,
        maxWidth: 1180, margin: '0 auto', width: '100%',
        paddingInline: isMobile ? 18 : 64,
        paddingBlock: isMobile ? 28 : 60,
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
      }}>
        {/* Hero — video alongside the wordmark */}
        <div className="mal-fade-up" style={{
          display: 'flex', alignItems: 'center',
          gap: isMobile ? 18 : 36, flexWrap: 'wrap',
          margin: 0, marginBottom: isMobile ? 22 : 40,
        }}>
          {/* Looping animated mark */}
          <div style={{
            position: 'relative',
            width: isMobile ? 110 : 200,
            height: isMobile ? 110 : 200,
            flexShrink: 0,
          }}>
            <div aria-hidden style={{
              position: 'absolute', inset: -14,
              borderRadius: '50%',
              background: 'conic-gradient(from 90deg, var(--mal-iri-1), var(--mal-iri-2), var(--mal-iri-3), var(--mal-iri-4), var(--mal-iri-1))',
              filter: 'blur(28px)', opacity: 0.55,
              animation: 'mal-orb-spin 20s linear infinite',
              pointerEvents: 'none',
            }}/>
            <video
              src="video.mp4"
              autoPlay loop muted playsInline
              aria-hidden
              style={{
                position: 'relative', zIndex: 2,
                width: '100%', height: '100%',
                borderRadius: '50%',
                objectFit: 'cover',
                display: 'block',
                mixBlendMode: 'multiply',
              }}
            />
          </div>

          {/* Wordmark */}
          <h1 className="mal-display" style={{
            fontSize: isMobile ? 64 : 140,
            fontStyle: 'italic',
            letterSpacing: '-0.04em',
            lineHeight: 0.9,
            margin: 0,
          }}>
            <span className="mal-iri-text">Mal</span>
            <span style={{
              display: 'block',
              fontSize: isMobile ? 14 : 18, fontStyle: 'normal',
              fontFamily: 'var(--mal-font-mono)', letterSpacing: '.18em',
              textTransform: 'uppercase', color: 'var(--mal-mid)',
              fontWeight: 500, marginTop: isMobile ? 8 : 14,
            }}>
              {isAr ? 'إقراض المنشآت الصغيرة والمتوسطة' : 'Mal · SME Lending'}
            </span>
          </h1>
        </div>

        {/* Four cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)',
          gap: isMobile ? 12 : 16,
        }}>
          {SECTIONS.map((s, i) => (
            <SectionCard key={s.id} section={s} index={i} isAr={isAr} isMobile={isMobile}
                         onClick={() => onLaunch && onLaunch(s.id)}/>
          ))}
        </div>
      </section>

      {/* Minimal footer */}
      <footer style={{
        paddingInline: isMobile ? 18 : 56, paddingBlock: 22,
        fontSize: 11, color: 'var(--mal-mid-2)',
        position: 'relative', zIndex: 2,
        fontFamily: 'var(--mal-font-mono)', letterSpacing: '.06em',
      }}>
        © 2026 Mal · {isAr ? 'مايو ٢٠٢٦' : 'May 2026'} · Dewashish Dey
      </footer>
    </div>
  );
}

// Single section card — number + name + arrow. No marketing copy.
function SectionCard({ section, index, isAr, isMobile, onClick }) {
  return (
    <button
      onClick={onClick}
      className="mal-fade-up"
      style={{
        all: 'unset', cursor: 'pointer', boxSizing: 'border-box',
        animationDelay: (120 + index * 70) + 'ms',
        position: 'relative', overflow: 'hidden',
        background: '#D0DDEE',                       /* mal.ai pill tint */
        border: '1px solid rgba(10,10,26,.06)',
        borderRadius: 22,
        padding: isMobile ? '24px 22px' : '28px 26px',
        minHeight: isMobile ? 180 : 280,
        transition: 'transform .3s cubic-bezier(.4,0,.2,1), box-shadow .3s, border-color .3s, background .3s',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        color: '#0A0A0A',                            /* black text */
        textAlign: 'start',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-6px)';
        e.currentTarget.style.boxShadow = '0 18px 50px -20px rgba(10,10,26,.30)';
        e.currentTarget.style.background = '#DCE6F2';
        const arrow = e.currentTarget.querySelector('.mal-card-arrow');
        if (arrow) arrow.style.transform = 'translateX(' + (isAr ? '-8px' : '8px') + ')';
        const halo = e.currentTarget.querySelector('.mal-card-halo');
        if (halo) { halo.style.transform = 'scale(1.25)'; halo.style.opacity = '0.7'; }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = '';
        e.currentTarget.style.boxShadow = '';
        e.currentTarget.style.background = '#D0DDEE';
        const arrow = e.currentTarget.querySelector('.mal-card-arrow');
        if (arrow) arrow.style.transform = '';
        const halo = e.currentTarget.querySelector('.mal-card-halo');
        if (halo) { halo.style.transform = ''; halo.style.opacity = '0.4'; }
      }}>
      {/* Iridescent accent halo */}
      <div className="mal-card-halo" aria-hidden style={{
        position: 'absolute', top: -100, insetInlineEnd: -100,
        width: 280, height: 280, borderRadius: '50%',
        background: section.accent,
        filter: 'blur(40px)', opacity: 0.4,
        transition: 'transform .55s cubic-bezier(.4,0,.2,1), opacity .55s',
        pointerEvents: 'none',
      }}/>

      {/* Top: number */}
      <div style={{
        position: 'relative', zIndex: 2,
        fontFamily: 'var(--mal-font-mono)',
        fontSize: 12, letterSpacing: '.16em',
        color: 'rgba(10,10,26,.55)',
        fontWeight: 500,
      }}>
        {section.num}
      </div>

      {/* Bottom: name + arrow */}
      <div style={{
        position: 'relative', zIndex: 2,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        gap: 12, marginTop: isMobile ? 22 : 100,
      }}>
        <div style={{
          fontFamily: 'var(--mal-font-display)', fontStyle: 'italic',
          fontSize: isMobile ? 30 : 36, lineHeight: 1.0,
          letterSpacing: '-0.02em',
          color: '#0A0A0A',
        }}>
          {section.label}
        </div>
        <span className="mal-card-arrow" aria-hidden style={{
          width: 36, height: 36, borderRadius: 999,
          background: 'rgba(10,10,26,.08)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          color: '#0A0A0A',
          fontSize: 18, transition: 'transform .3s cubic-bezier(.4,0,.2,1)',
          transform: isAr ? 'scaleX(-1)' : 'none',
          flexShrink: 0,
        }}>
          →
        </span>
      </div>
    </button>
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
