/* eslint-disable */
// Mal — UI primitives shared across all screens.
// Provides: Button, IconBtn, Card, Pill, Field, Toggle, Tabs, Stat, Avatar,
// MalLogo, MalOrb, useLang, useT, BiDi helpers.
const { useState, useEffect, useRef, useMemo, useCallback } = React;
const Ico = window.MalIcon;

// ============================================================
// Logo + orb
// ============================================================
function MalLogo({ size = 28, light = false }) {
  // Real Mal wordmark from mal.ai · 71×29 viewBox
  return (
    <img
      src="mal-logo.svg"
      alt="Mal"
      style={{
        height: size, width: 'auto', display: 'block',
        filter: light ? 'invert(1)' : undefined,
      }}
    />
  );
}

function MalOrb({ size = 28, animated = false }) {
  return (
    <div className="mal-orb" style={{
      width: size, height: size,
      animation: animated ? 'mal-orb-spin 18s linear infinite' : undefined,
    }}/>
  );
}

// ============================================================
// Buttons
// ============================================================
function Button({ kind = 'primary', size = 'md', icon, iconRight, children, onClick, disabled, full, style, ...rest }) {
  const cls = `mal-btn mal-btn-${kind}${size === 'sm' ? ' mal-btn-sm' : size === 'lg' ? ' mal-btn-lg' : ''}`;
  return (
    <button className={cls} onClick={onClick} disabled={disabled}
      style={{ width: full ? '100%' : undefined, opacity: disabled ? 0.5 : 1, ...style }} {...rest}>
      {icon && Ico[icon] && Ico[icon]({ width: size === 'sm' ? 14 : 16, height: size === 'sm' ? 14 : 16 })}
      {children}
      {iconRight && Ico[iconRight] && Ico[iconRight]({ width: size === 'sm' ? 14 : 16, height: size === 'sm' ? 14 : 16 })}
    </button>
  );
}

function IconBtn({ icon, onClick, label, size = 36, kind = 'ghost' }) {
  const bg = kind === 'ghost' ? 'transparent' : 'var(--mal-paper)';
  const border = kind === 'ghost' ? 'transparent' : 'var(--mal-line)';
  return (
    <button onClick={onClick} aria-label={label} style={{
      width: size, height: size, borderRadius: 999, background: bg,
      border: `1px solid ${border}`, color: 'var(--mal-ink)',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
    }}>
      {Ico[icon] ? Ico[icon]({ width: 18, height: 18 }) : null}
    </button>
  );
}

// ============================================================
// Cards
// ============================================================
function Card({ children, style, padded = true, elev = false, onClick, ...rest }) {
  return (
    <div className={elev ? 'mal-card-elev' : 'mal-card'} onClick={onClick}
      style={{ padding: padded ? 'var(--mal-pad-card)' : 0, cursor: onClick ? 'pointer' : 'default', ...style }} {...rest}>
      {children}
    </div>
  );
}

// ============================================================
// Pills / status
// ============================================================
function Pill({ tone = 'neutral', dot = false, children, style }) {
  return (
    <span className={`mal-pill mal-pill-${tone}${dot ? ' mal-pill-dot' : ''}`} style={style}>{children}</span>
  );
}

// ============================================================
// Form field
// ============================================================
function Field({ label, hint, error, children, optional, style }) {
  return (
    <div style={{ marginBottom: 14, ...style }}>
      {label && (
        <label className="mal-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>{label}</span>
          {optional && <span style={{ color: 'var(--mal-mid-2)', fontWeight: 400 }}>Optional</span>}
        </label>
      )}
      {children}
      {hint && !error && <div style={{ fontSize: 12, color: 'var(--mal-mid)', marginTop: 6 }}>{hint}</div>}
      {error && <div style={{ fontSize: 12, color: 'var(--mal-danger)', marginTop: 6 }}>{error}</div>}
    </div>
  );
}

function Input({ ...props }) {
  return <input className="mal-input" {...props}/>;
}

function Toggle({ on, onChange, label }) {
  return (
    <button onClick={() => onChange(!on)} style={{
      width: 36, height: 22, borderRadius: 999,
      background: on ? 'var(--mal-ink)' : 'var(--mal-line)',
      position: 'relative', border: 'none', cursor: 'pointer', padding: 0, transition: 'background .14s'
    }} aria-label={label} aria-pressed={on}>
      <span style={{
        position: 'absolute', top: 2, left: on ? 16 : 2, width: 18, height: 18, borderRadius: 999,
        background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.2)', transition: 'left .16s'
      }}/>
    </button>
  );
}

// Segmented tabs
function Tabs({ items, value, onChange, size = 'md' }) {
  return (
    <div style={{ display: 'inline-flex', padding: 4, background: 'var(--mal-surface-2)', borderRadius: 999, gap: 2 }}>
      {items.map(it => (
        <button key={it.value} className={`mal-tab ${value === it.value ? 'active' : ''}`}
          aria-selected={value === it.value} onClick={() => onChange(it.value)}
          style={{ height: size === 'sm' ? 28 : 32 }}>
          {it.icon && Ico[it.icon]({ width: 14, height: 14 })}
          {it.label}
        </button>
      ))}
    </div>
  );
}

// Stat block
function Stat({ label, value, delta, deltaTone, sub, large }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--mal-mid)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>{label}</div>
      <div className="mal-num" style={{ fontFamily: 'var(--mal-font-display)', fontSize: large ? 44 : 28, lineHeight: 1, color: 'var(--mal-ink)', letterSpacing: '-0.02em' }}>{value}</div>
      {(delta || sub) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 12 }}>
          {delta && <span style={{ color: deltaTone === 'down' ? 'var(--mal-danger)' : 'var(--mal-success)' }}>{delta}</span>}
          {sub && <span style={{ color: 'var(--mal-mid)' }}>{sub}</span>}
        </div>
      )}
    </div>
  );
}

// Avatar circle
function Avatar({ name = 'AB', size = 32, tone = 'lilac', src }) {
  const tones = {
    lilac: 'linear-gradient(135deg, #C9B7E8, #B6A3DC)',
    sky: 'linear-gradient(135deg, #B6CFE8, #9BB8DA)',
    coral: 'linear-gradient(135deg, #F0B7C2, #E59FAC)',
    peach: 'linear-gradient(135deg, #FBD9B5, #F0C795)',
    ink: 'linear-gradient(135deg, #2A1F6F, #1A1A28)',
  };
  return (
    <div style={{
      width: size, height: size, borderRadius: 999,
      background: src ? `url(${src}) center/cover` : tones[tone],
      color: tone === 'ink' ? '#fff' : 'var(--mal-ink)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--mal-font-display)', fontSize: size * 0.42, fontStyle: 'italic'
    }}>
      {!src && (typeof name === 'string' ? name.slice(0, 2).toUpperCase() : name)}
    </div>
  );
}

// ============================================================
// Bilingual helpers
// ============================================================
function useT(lang) {
  return useCallback((path, fallback) => {
    const v = window.MAL_T(lang, path);
    return v !== undefined ? v : (fallback ?? path);
  }, [lang]);
}

// ============================================================
// Sparklines / mini charts
// ============================================================
function Sparkline({ values, color = 'var(--mal-primary-3)', width = 120, height = 36, fill }) {
  const min = Math.min(...values), max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => [
    (i / (values.length - 1)) * width,
    height - ((v - min) / range) * height
  ]);
  const d = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(' ');
  const fillD = `${d} L${width},${height} L0,${height} Z`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {fill && <path d={fillD} fill={fill === true ? color : fill} opacity={0.2}/>}
      <path d={d} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// Donut/ring
function Ring({ pct, size = 64, stroke = 6, color = 'var(--mal-primary-3)', track = 'var(--mal-line)', label }) {
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  const off = C - (pct / 100) * C;
  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'inline-block' }}>
      <svg width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={track} strokeWidth={stroke}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={C} strokeDashoffset={off} strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`}/>
      </svg>
      {label && <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--mal-font-display)', fontSize: size * 0.32, color: 'var(--mal-ink)'
      }}>{label}</div>}
    </div>
  );
}

// ============================================================
// Mock data helpers
// ============================================================
const mockNames = {
  buyerSME: ['Cresent Trading FZE', 'Al Wasl Catering LLC', 'Pinnacle Contracting LLC', 'Solea Hospitality Group', 'Verity Construction LLC'],
  supplierSME: ['Atlas Packaging FZ', 'Marina IT Services', 'Pearl Logistics LLC', 'Crystal F&B Supply', 'Northstar Equipment'],
  anchors: ['Aldar Properties', 'Majid Al Futtaim', 'AD Ports Group', 'e&', 'Lulu Group', 'IHC'],
  payers: ['Daman', 'Sukoon', 'Orient', 'ADNIC', 'MetLife', 'Cigna ME'],
  clinics: ['Crescent Polyclinic', 'Pearl Dental Group', 'Riviera Day Surgery', 'Apex Diagnostics']
};

// AED format
const AED = (n, lang = 'en', opts = {}) => window.MAL_FMT(n, lang, opts);

// Persist tweak rotation utility — tiny helper
function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

Object.assign(window, {
  MalLogo, MalOrb, Button, IconBtn, Card, Pill, Field, Input, Toggle, Tabs, Stat, Avatar,
  Sparkline, Ring, useT, AED, mockNames, clamp,
  Ico,
});
