/* eslint-disable */
// Mal — lightweight SVG chart primitives used by Strategy and Financial
// Modeling sections. Pure SVG, no dependencies. Animates on data change.
const { useState: chS, useEffect: chE, useRef: chR } = React;

// ============================================================
// MalBarChart — vertical grouped bars (e.g., Year 1 / 2 / 3)
// ============================================================
//   data: [{ label, value, tone? }]
//   options: { height, barColor, formatValue }
function MalBarChart({ data = [], height = 220, barColor = 'var(--mal-primary-3)', formatValue, ariaLabel }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const w = Math.max(220, data.length * 80);
  const padTop = 24, padBottom = 38, padX = 16;
  const innerH = height - padTop - padBottom;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} role="img" aria-label={ariaLabel}
         style={{ width: '100%', height, display: 'block', overflow: 'visible' }}>
      {/* Baseline */}
      <line x1={padX} y1={height - padBottom} x2={w - padX} y2={height - padBottom}
            stroke="var(--mal-line)" strokeWidth="1"/>
      {data.map((d, i) => {
        const usableW = w - padX * 2;
        const slot = usableW / data.length;
        const bw = Math.min(60, slot * 0.55);
        const x = padX + slot * (i + 0.5) - bw / 2;
        const h = (d.value / max) * innerH;
        const y = padTop + innerH - h;
        const fill = d.tone === 'iri'
          ? 'url(#malBarGrad)'
          : d.tone === 'success' ? 'var(--mal-success)'
          : d.tone === 'warn' ? 'var(--mal-warn)'
          : d.tone === 'danger' ? 'var(--mal-danger)'
          : barColor;
        return (
          <g key={d.label} style={{ transition: 'transform .35s' }}>
            <rect x={x} y={y} width={bw} height={h} rx="6" fill={fill}>
              <animate attributeName="height" from={0} to={h} dur=".5s" fill="freeze"/>
              <animate attributeName="y" from={padTop + innerH} to={y} dur=".5s" fill="freeze"/>
            </rect>
            <text x={x + bw / 2} y={y - 6} textAnchor="middle"
                  fontSize="11" fontFamily="var(--mal-font-mono)"
                  fill="var(--mal-ink)">
              {formatValue ? formatValue(d.value) : d.value}
            </text>
            <text x={x + bw / 2} y={height - padBottom + 18} textAnchor="middle"
                  fontSize="11" fill="var(--mal-mid)">
              {d.label}
            </text>
          </g>
        );
      })}
      <defs>
        <linearGradient id="malBarGrad" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="var(--mal-primary)"/>
          <stop offset="100%" stopColor="var(--mal-primary-3)"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

// ============================================================
// MalLineChart — multi-series line over years
// ============================================================
//   series: [{ name, values: [n,n,n], color? }]
//   labels: ['Y1','Y2','Y3']
function MalLineChart({ series = [], labels = [], height = 220, formatValue, ariaLabel }) {
  const allValues = series.flatMap((s) => s.values);
  const max = Math.max(...allValues, 1);
  const min = Math.min(...allValues, 0);
  const range = (max - min) || 1;
  const w = 480;
  const padTop = 18, padBottom = 30, padX = 30;
  const innerH = height - padTop - padBottom;
  const innerW = w - padX * 2;
  const xAt = (i) => padX + (i / (labels.length - 1 || 1)) * innerW;
  const yAt = (v) => padTop + (1 - (v - min) / range) * innerH;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} role="img" aria-label={ariaLabel}
         style={{ width: '100%', height, display: 'block' }}>
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((p) => {
        const y = padTop + p * innerH;
        return <line key={p} x1={padX} y1={y} x2={w - padX} y2={y} stroke="var(--mal-line)" strokeDasharray="2 4" strokeWidth="1"/>;
      })}
      {labels.map((l, i) => (
        <text key={l} x={xAt(i)} y={height - padBottom + 18} textAnchor="middle"
              fontSize="11" fill="var(--mal-mid)">{l}</text>
      ))}
      {series.map((s, sIdx) => {
        const color = s.color || ['var(--mal-primary)', 'var(--mal-primary-3)', 'var(--mal-success)', 'var(--mal-warn)'][sIdx % 4];
        const points = s.values.map((v, i) => `${xAt(i)},${yAt(v)}`).join(' ');
        const areaD = `M${xAt(0)},${height - padBottom} L${s.values.map((v, i) => `${xAt(i)},${yAt(v)}`).join(' L')} L${xAt(s.values.length - 1)},${height - padBottom} Z`;
        return (
          <g key={s.name}>
            <path d={areaD} fill={color} opacity="0.06"/>
            <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            {s.values.map((v, i) => (
              <g key={i}>
                <circle cx={xAt(i)} cy={yAt(v)} r="4" fill="#fff" stroke={color} strokeWidth="2"/>
                <text x={xAt(i)} y={yAt(v) - 10} textAnchor="middle" fontSize="10" fontFamily="var(--mal-font-mono)" fill={color}>
                  {formatValue ? formatValue(v) : v}
                </text>
              </g>
            ))}
          </g>
        );
      })}
    </svg>
  );
}

// ============================================================
// MalDonut — single-value progress / share donut
// ============================================================
function MalDonut({ value, max = 100, label, sub, color = 'var(--mal-primary)', size = 140, stroke = 12, formatValue }) {
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value / max));
  const off = C - pct * C;
  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'inline-block' }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--mal-line)" strokeWidth={stroke}/>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
                strokeDasharray={C} strokeDashoffset={off} strokeLinecap="round"
                transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <animate attributeName="stroke-dashoffset" from={C} to={off} dur=".7s" fill="freeze"/>
        </circle>
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex',
        flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          fontFamily: 'var(--mal-font-display)', fontStyle: 'italic',
          fontSize: size * 0.28, color: 'var(--mal-ink)', lineHeight: 1,
        }}>
          {formatValue ? formatValue(value) : Math.round(pct * 100) + '%'}
        </div>
        {label && <div style={{ fontSize: 11, color: 'var(--mal-mid)', marginTop: 4 }}>{label}</div>}
        {sub && <div style={{ fontSize: 10, color: 'var(--mal-mid-2)', marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

// ============================================================
// MalStackedBar — horizontal stacked bar (capital stack etc.)
// ============================================================
function MalStackedBar({ segments = [], height = 24, formatLabel }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <div>
      <div style={{
        height, borderRadius: 999, overflow: 'hidden',
        display: 'flex', background: 'var(--mal-surface-2)',
      }}>
        {segments.map((s, i) => (
          <div key={i} style={{
            width: ((s.value / total) * 100) + '%',
            background: s.color || ['var(--mal-primary)', 'var(--mal-primary-3)', 'var(--mal-iri-2)', 'var(--mal-iri-4)', 'var(--mal-success)', 'var(--mal-warn)'][i % 6],
            transition: 'width .5s',
          }}/>
        ))}
      </div>
      <div style={{
        marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 14,
        fontSize: 11, color: 'var(--mal-mid)',
      }}>
        {segments.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              width: 10, height: 10, borderRadius: 2,
              background: s.color || ['var(--mal-primary)', 'var(--mal-primary-3)', 'var(--mal-iri-2)', 'var(--mal-iri-4)', 'var(--mal-success)', 'var(--mal-warn)'][i % 6],
            }}/>
            <span style={{ color: 'var(--mal-ink)' }}>{s.label}</span>
            <span>{formatLabel ? formatLabel(s.value) : s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// MalSlider — labelled input slider
// ============================================================
function MalSlider({ label, value, onChange, min, max, step = 1, suffix = '', formatValue, hint }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <span style={{ color: 'var(--mal-mid)', fontWeight: 500 }}>{label}</span>
        <span className="mal-num" style={{
          fontFamily: 'var(--mal-font-mono)', fontWeight: 600, color: 'var(--mal-ink)',
        }}>
          {formatValue ? formatValue(value) : value}{suffix}
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
             onChange={(e) => onChange(parseFloat(e.target.value))}
             style={{ width: '100%', accentColor: 'var(--mal-primary)' }}/>
      {hint && <span style={{ fontSize: 11, color: 'var(--mal-mid-2)' }}>{hint}</span>}
    </label>
  );
}

// ============================================================
// MalKpi — compact metric block
// ============================================================
function MalKpi({ label, value, delta, deltaTone = 'up', sub }) {
  return (
    <div style={{
      background: 'var(--mal-paper)', border: '1px solid var(--mal-line)',
      borderRadius: 14, padding: 16, minWidth: 140, flex: 1,
    }}>
      <div style={{ fontSize: 10.5, color: 'var(--mal-mid)', textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 500 }}>
        {label}
      </div>
      <div className="mal-num" style={{
        fontFamily: 'var(--mal-font-display)', fontStyle: 'italic',
        fontSize: 30, lineHeight: 1, marginTop: 8, letterSpacing: '-0.02em',
      }}>
        {value}
      </div>
      {(delta || sub) && (
        <div style={{ display: 'flex', gap: 6, fontSize: 11, marginTop: 6 }}>
          {delta && (
            <span style={{ color: deltaTone === 'down' ? 'var(--mal-danger)' : 'var(--mal-success)', fontWeight: 500 }}>
              {delta}
            </span>
          )}
          {sub && <span style={{ color: 'var(--mal-mid)' }}>{sub}</span>}
        </div>
      )}
    </div>
  );
}

// Expose globally
Object.assign(window, { MalBarChart, MalLineChart, MalDonut, MalStackedBar, MalSlider, MalKpi });
