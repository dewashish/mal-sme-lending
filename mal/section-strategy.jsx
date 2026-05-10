/* eslint-disable */
// Section 1 — Strategy
// Faithful, word-for-word renderer of the SME Lending Head of Product
// Strategy doc. Reads window.MAL_STRATEGY_DOC (auto-generated from the
// .docx) and renders every paragraph with display-grade typography.
//
// Layout: sticky left TOC (auto-built from H1+H2) + scrollable main column.
// Tables and charts are kept out of this surface — the doc speaks for itself.

const { useState: stS, useEffect: stE, useRef: stR, useMemo: stM, useCallback: stCB } = React;

function SectionStrategy({ lang, isMobile }) {
  const isAr = lang === 'ar';
  const doc = window.MAL_STRATEGY_DOC || [];

  // Build TOC from H1 + H2 (skip H3 to keep it scannable; the doc has 100+ H2s)
  const toc = stM(() => {
    return doc
      .filter((p) => (p.tag === 'h1' || p.tag === 'h2') && p.id)
      .map((p) => ({ id: p.id, text: p.text, level: p.tag === 'h1' ? 1 : 2 }));
  }, [doc]);

  const [activeId, setActiveId] = stS(toc[0]?.id || null);
  const sectionRefs = stR({});

  // Scroll-spy via IntersectionObserver
  stE(() => {
    const obs = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setActiveId(visible.target.id);
    }, { rootMargin: '-25% 0px -65% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] });
    Object.values(sectionRefs.current).forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, [doc]);

  const jumpTo = stCB((id) => {
    sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  if (!doc.length) {
    return (
      <div className="mal-section-page" style={{ textAlign: 'center', paddingTop: 80 }}>
        <div style={{ fontFamily: 'var(--mal-font-display)', fontStyle: 'italic', fontSize: 28 }}>
          {isAr ? 'جاري تحميل الوثيقة…' : 'Loading the strategy doc…'}
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }} dir={isAr ? 'rtl' : 'ltr'}>
      {!isMobile && <StrategyTOC toc={toc} activeId={activeId} jumpTo={jumpTo} isAr={isAr}/>}

      <article className="mal-section-page" style={{
        maxWidth: 880,
        marginInline: 'auto',
        paddingInlineStart: isMobile ? 24 : 280,
        paddingTop: 28,
      }}>
        <DocHero isAr={isAr} isMobile={isMobile}/>
        <LiveUnitEconomicsCallout isAr={isAr} isMobile={isMobile}/>
        <DocBody doc={doc} sectionRefs={sectionRefs}/>
        <DocOutro isAr={isAr}/>
      </article>
    </div>
  );
}

// ============================================================
// Sticky TOC
// ============================================================
function StrategyTOC({ toc, activeId, jumpTo, isAr }) {
  const idx = toc.findIndex((t) => t.id === activeId);
  return (
    <aside style={{
      position: 'sticky', top: 56,
      width: 240, alignSelf: 'flex-start',
      float: isAr ? 'right' : 'left',
      paddingInlineStart: 24, paddingTop: 32, paddingBottom: 32,
      maxHeight: 'calc(100vh - 56px)', overflowY: 'auto',
    }}>
      <div className="mal-caption" style={{ marginBottom: 14, color: 'var(--mal-mid-2)' }}>
        {isAr ? 'الفهرس · مايو ٢٠٢٦' : 'CONTENTS · MAY 2026'}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {toc.map((t, i) => {
          const active = i === idx;
          const past = i < idx;
          return (
            <button key={t.id + '-' + i}
                    onClick={() => jumpTo(t.id)}
                    title={t.text}
                    style={{
                      all: 'unset', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: t.level === 1 ? '10px 10px 4px' : '4px 10px 4px ' + (t.level === 2 ? '20px' : '10px'),
                      borderRadius: 8,
                      background: active ? 'var(--mal-paper)' : 'transparent',
                      border: '1px solid ' + (active ? 'var(--mal-primary-3)' : 'transparent'),
                      transition: 'background .15s, border-color .15s',
                      marginInlineStart: t.level === 2 ? 12 : 0,
                    }}
                    onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--mal-surface-2)'; }}
                    onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
              <span style={{
                width: active ? 22 : t.level === 1 ? 14 : 8,
                height: t.level === 1 ? 4 : 3,
                borderRadius: 999,
                background: active ? 'var(--mal-primary)' : past ? 'var(--mal-primary-3)' : 'var(--mal-line)',
                transition: 'width .25s, background .15s',
                flexShrink: 0,
              }}/>
              <span style={{
                fontSize: t.level === 1 ? 12 : 11.5,
                fontWeight: active ? 600 : t.level === 1 ? 600 : 500,
                color: active ? 'var(--mal-ink)' : past ? 'var(--mal-ink)' : 'var(--mal-mid)',
                lineHeight: 1.35,
                textTransform: t.level === 1 ? 'uppercase' : 'none',
                letterSpacing: t.level === 1 ? '.04em' : 0,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{t.text}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

// ============================================================
// Live Unit Economics callout — pulls from window.MAL_P1_DATA
// ============================================================
function LiveUnitEconomicsCallout({ isAr, isMobile }) {
  const data = (typeof window !== 'undefined') ? window.MAL_P1_DATA : null;
  if (!data) return null;
  const fy = data.fiveYearSummary;
  const r3 = data.ratios.y3;
  const r5 = data.ratios.y5;
  const ue = data.unitEconomics;

  const fmtAedM = (n, dp = 0) => 'AED ' + (n).toFixed(dp) + 'M';
  const fmtAedB = (n, dp = 1) => 'AED ' + (n / 1000).toFixed(dp) + 'B';
  const fmtPct  = (n, dp = 1) => n.toFixed(dp) + '%';

  return (
    <section style={{
      margin: '12px 0 36px',
      padding: isMobile ? 20 : 26,
      borderRadius: 16,
      background: 'linear-gradient(135deg, rgba(201,183,232,0.18) 0%, rgba(168,192,154,0.12) 100%)',
      border: '1px solid var(--mal-line)',
      position: 'relative',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <Pill tone="iri" dot>{isAr ? 'مباشر · النموذج المالي' : 'Live · canonical financial model'}</Pill>
        <span style={{ fontSize: 11, color: 'var(--mal-mid)' }}>
          {data.meta.workbook} · {data.meta.sheets} {isAr ? 'ورقة' : 'sheets'} · {isAr ? 'مزامنة' : 'synced'} {data.meta.lastUpdated}
        </span>
      </div>
      <div style={{
        fontFamily: 'var(--mal-font-display)', fontStyle: 'italic',
        fontSize: isMobile ? 22 : 28, lineHeight: 1.15, letterSpacing: '-0.01em',
        marginBottom: 6,
      }}>
        {isAr ? 'الاقتصاد الوحدوي · المنتج ١ (بطاقة الفاتورة الذكية)' : 'Unit economics · P1 (Smart Invoice)'}
      </div>
      <div style={{ fontSize: 13, color: 'var(--mal-mid)', marginBottom: 18, lineHeight: 1.55 }}>
        {isAr
          ? 'الأرقام المحدثة من النموذج المعتمد. كل تعديل في إكسل ينعكس هنا تلقائياً.'
          : 'Live numbers from the canonical Excel model. Updates flow automatically when the workbook is re-synced.'}
      </div>

      {/* Five headline KPIs */}
      <div style={{
        display: 'grid', gap: 10,
        gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(5, 1fr)',
        marginBottom: 22,
      }}>
        {[
          [isAr ? 'صرف ٥ سنوات' : '5-yr disbursement', fmtAedB(fy.face, 1), isAr ? '٢٥٠M → ١٣B' : 'Y1 250M → Y5 13B'],
          [isAr ? 'مساهمة صافية تراكمية' : 'Cum. net contribution', fmtAedM(fy.cumNetContrib, 0), isAr ? 'Y1 → Y5' : 'Y1 → Y5'],
          [isAr ? 'العائد على الأصول · Y3' : 'ROA · Y3', fmtPct(r3.roaPct, 2), isAr ? `Y5: ${fmtPct(r5.roaPct, 2)}` : `Y5: ${fmtPct(r5.roaPct, 2)}`],
          ['RAROC · Y3', fmtPct(r3.rarocPct, 0), isAr ? 'مقابل ٢٠٪ هدف' : 'vs 20% target'],
          [isAr ? 'حقوق ملكية مرفوعة' : 'Equity raised', fmtAedM(fy.totalEquityRaised, 0), isAr ? 'بذرة + A/B/C' : 'Seed + A + B + C'],
        ].map(([label, value, sub], i) => (
          <div key={i} style={{
            padding: 12, background: 'rgba(255,255,255,0.55)',
            borderRadius: 12, border: '1px solid rgba(0,0,0,0.06)',
          }}>
            <div style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: '.06em',
                          textTransform: 'uppercase', color: 'var(--mal-mid-2)' }}>{label}</div>
            <div style={{ fontFamily: 'var(--mal-font-display)', fontStyle: 'italic',
                          fontSize: 22, lineHeight: 1.05, marginTop: 6,
                          color: 'var(--mal-ink)' }}>{value}</div>
            <div style={{ fontSize: 10.5, color: 'var(--mal-mid)', marginTop: 4 }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Per-track unit economics */}
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.06em',
                    textTransform: 'uppercase', color: 'var(--mal-mid-2)', marginBottom: 10 }}>
        {isAr ? 'الاقتصاد لكل ١٠٠ ألف درهم فاتورة' : 'Per AED 100k of invoice'}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12.5 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'start', padding: '6px 10px', color: 'var(--mal-mid)',
                           fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.06em',
                           borderBottom: '1px solid var(--mal-line)' }}/>
              {[isAr ? 'مدة' : 'Tenor', isAr ? 'العائد' : 'Yield',
                isAr ? 'خسارة متوقعة' : 'Exp. loss', isAr ? 'مساهمة صافية' : 'Net contrib.',
                isAr ? 'هامش %' : 'Margin %'].map((h, i) => (
                <th key={i} style={{ textAlign: 'end', padding: '6px 10px', color: 'var(--mal-mid)',
                                     fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.06em',
                                     borderBottom: '1px solid var(--mal-line)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              ['Pay-30',    ue.pay30],
              ['BNPL',      ue.bnpl],
              [isAr ? 'تمديد' : 'Term Extension', ue.ext],
            ].map(([name, t], ri) => (
              <tr key={ri}>
                <td style={{ padding: '8px 10px', color: 'var(--mal-ink)', fontWeight: 500 }}>{name}</td>
                <td style={{ padding: '8px 10px', textAlign: 'end', fontFamily: 'var(--mal-font-mono)' }}>{t.tenor.toFixed(0)}d</td>
                <td style={{ padding: '8px 10px', textAlign: 'end', fontFamily: 'var(--mal-font-mono)' }}>{fmtPct(t.yieldPct, 1)}</td>
                <td style={{ padding: '8px 10px', textAlign: 'end', fontFamily: 'var(--mal-font-mono)', color: 'var(--mal-danger)' }}>
                  AED {Math.round(t.expectedLoss).toLocaleString()}
                </td>
                <td style={{ padding: '8px 10px', textAlign: 'end', fontFamily: 'var(--mal-font-mono)', fontWeight: 600 }}>
                  AED {Math.round(t.netContrib).toLocaleString()}
                </td>
                <td style={{ padding: '8px 10px', textAlign: 'end', fontFamily: 'var(--mal-font-mono)', fontWeight: 600,
                             color: 'var(--mal-success)' }}>
                  {fmtPct(t.netContribPct, 2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 16, fontSize: 11, color: 'var(--mal-mid)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <span>
          {isAr ? 'هدف العائد على الأصول > ٥٪ مع تحمل إجهاد PD ١.٣×' : `ROA target ≥5% · PD-stress tolerance ${data.breakEven.pdMultiplier.toFixed(2)}×`}
        </span>
        <a href="#" onClick={(e) => { e.preventDefault();
            window.dispatchEvent(new CustomEvent('mal:nav', { detail: { section: 'financial' } })); }}
           style={{ color: 'var(--mal-primary)', fontWeight: 600, textDecoration: 'none' }}>
          {isAr ? 'افتح النموذج المالي الكامل ←' : 'Open full financial model →'}
        </a>
      </div>
    </section>
  );
}

// ============================================================
// HERO — title block
// ============================================================
function DocHero({ isAr, isMobile }) {
  return (
    <section style={{ marginBottom: 24, paddingTop: 4 }}>
      <h1 style={{
        fontFamily: 'var(--mal-font-display)', fontStyle: 'italic',
        fontSize: isMobile ? 36 : 48, lineHeight: 1.0, letterSpacing: '-0.02em',
        margin: 0,
      }}>
        {isAr ? 'الاستراتيجية' : 'Strategy'}
      </h1>
    </section>
  );
}

// ============================================================
// BODY — render every paragraph
// ============================================================
function DocBody({ doc, sectionRefs }) {
  // Group consecutive list items into <ul> blocks for nicer rendering.
  const blocks = stM(() => {
    const out = [];
    let listBuffer = [];
    const flushList = () => {
      if (listBuffer.length) { out.push({ type: 'list', items: listBuffer }); listBuffer = []; }
    };
    doc.forEach((p, i) => {
      if (p.tag === 'li') {
        listBuffer.push({ ...p, key: i });
      } else {
        flushList();
        if (p.tag === 'table') {
          out.push({ type: 'table', table: { ...p, key: i } });
        } else {
          out.push({ type: 'para', para: { ...p, key: i } });
        }
      }
    });
    flushList();
    return out;
  }, [doc]);

  return (
    <>
      {blocks.map((b, bi) => {
        if (b.type === 'list') {
          return (
            <ul key={'l' + bi} style={{
              margin: '0 0 18px', paddingInlineStart: 22,
              listStyle: 'disc',
            }}>
              {b.items.map((it) => (
                <li key={it.key} style={{
                  fontSize: 15, lineHeight: 1.7, color: 'var(--mal-ink)',
                  marginBottom: 6, marginInlineStart: it.lvl ? it.lvl * 18 : 0,
                }}>
                  <RenderSpans spans={it.spans}/>
                </li>
              ))}
            </ul>
          );
        }
        if (b.type === 'table') {
          return <TableBlock key={'t' + bi} rows={b.table.rows}/>;
        }
        const p = b.para;
        return <ParaBlock key={p.key} para={p} sectionRefs={sectionRefs}/>;
      })}
    </>
  );
}

// ============================================================
// TableBlock — beautiful, scrollable, sticky-header data table
// ============================================================
function TableBlock({ rows }) {
  if (!rows || rows.length === 0) return null;
  const headerRow = rows[0];
  const bodyRows = rows.slice(1);
  // Heuristic: a row is "numeric" if 2+ cells parse as numbers, percentages, or AED amounts
  const isNumericCell = (s) => /^[\-\+]?[\d.,]+%?$/.test((s || '').trim()) || /^AED/i.test((s || '').trim());

  return (
    <div style={{
      margin: '20px 0 26px',
      border: '1px solid var(--mal-line)',
      borderRadius: 14,
      overflow: 'hidden',
      background: 'var(--mal-paper)',
    }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 13,
          fontFamily: 'var(--mal-font-ui)',
        }}>
          <thead>
            <tr style={{
              background: 'var(--mal-surface-2)',
              borderBottom: '1px solid var(--mal-line)',
            }}>
              {headerRow.map((cell, ci) => (
                <th key={ci} style={{
                  textAlign: 'start', verticalAlign: 'top',
                  padding: '12px 14px',
                  fontSize: 11, fontWeight: 600,
                  textTransform: 'uppercase', letterSpacing: '.06em',
                  color: 'var(--mal-mid)',
                  borderInlineStart: ci > 0 ? '1px solid var(--mal-line-2)' : 'none',
                  whiteSpace: 'nowrap',
                }}>{cell}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bodyRows.map((row, ri) => (
              <tr key={ri} style={{
                background: ri % 2 ? 'transparent' : 'rgba(0,0,0,.012)',
                borderBottom: ri < bodyRows.length - 1 ? '1px solid var(--mal-line-2)' : 'none',
              }}>
                {row.map((cell, ci) => {
                  const numeric = isNumericCell(cell) && ci > 0;
                  return (
                    <td key={ci} style={{
                      padding: '11px 14px',
                      verticalAlign: 'top',
                      color: ci === 0 ? 'var(--mal-mid)' : 'var(--mal-ink)',
                      borderInlineStart: ci > 0 ? '1px solid var(--mal-line-2)' : 'none',
                      fontFamily: numeric ? 'var(--mal-font-mono)' : 'inherit',
                      fontWeight: ci === 0 ? 500 : 400,
                      whiteSpace: numeric ? 'nowrap' : 'normal',
                      lineHeight: 1.5,
                      minWidth: 80,
                    }}>{cell || ''}</td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ParaBlock({ para, sectionRefs }) {
  const setRef = (el) => {
    if (para.id && el) sectionRefs.current[para.id] = el;
  };
  if (para.tag === 'h1') {
    return (
      <h2 id={para.id} ref={setRef} style={{
        fontFamily: 'var(--mal-font-display)', fontStyle: 'italic',
        fontSize: 48, lineHeight: 1.05, letterSpacing: '-0.02em',
        margin: '64px 0 24px', scrollMarginTop: 70,
        color: 'var(--mal-ink)',
        paddingBottom: 14, borderBottom: '1px solid var(--mal-line)',
      }}>
        <RenderSpans spans={para.spans}/>
      </h2>
    );
  }
  if (para.tag === 'h2') {
    return (
      <h3 id={para.id} ref={setRef} style={{
        fontFamily: 'var(--mal-font-display)', fontStyle: 'italic',
        fontSize: 30, lineHeight: 1.15, letterSpacing: '-0.015em',
        margin: '38px 0 14px', scrollMarginTop: 70,
        color: 'var(--mal-ink)',
      }}>
        <RenderSpans spans={para.spans}/>
      </h3>
    );
  }
  if (para.tag === 'h3') {
    return (
      <h4 ref={setRef} style={{
        fontSize: 18, fontWeight: 600,
        margin: '22px 0 8px', color: 'var(--mal-ink)',
      }}>
        <RenderSpans spans={para.spans}/>
      </h4>
    );
  }
  if (para.tag === 'h4') {
    return (
      <div ref={setRef} style={{
        fontSize: 11, fontWeight: 600, letterSpacing: '.08em',
        textTransform: 'uppercase', color: 'var(--mal-mid)',
        margin: '20px 0 6px',
      }}>
        <RenderSpans spans={para.spans}/>
      </div>
    );
  }
  // default: paragraph
  return (
    <p style={{
      fontSize: 15, lineHeight: 1.75, color: 'var(--mal-ink)',
      margin: '0 0 14px',
    }}>
      <RenderSpans spans={para.spans}/>
    </p>
  );
}

function RenderSpans({ spans }) {
  if (typeof spans === 'string') return spans;
  if (!Array.isArray(spans)) return null;
  return spans.map((s, i) => {
    let node = s.t;
    if (s.b) node = <strong key={i} style={{ color: 'var(--mal-ink)', fontWeight: 600 }}>{node}</strong>;
    if (s.i) node = <em key={'i' + i}>{node}</em>;
    if (!s.b && !s.i) return <React.Fragment key={i}>{s.t}</React.Fragment>;
    return <React.Fragment key={'f' + i}>{node}</React.Fragment>;
  });
}

// ============================================================
// OUTRO — a soft close + back-to-top
// ============================================================
function DocOutro({ isAr }) {
  return (
    <section style={{
      marginTop: 80, paddingBlock: 32,
      borderTop: '1px solid var(--mal-line)',
      textAlign: 'center', color: 'var(--mal-mid)',
    }}>
      <div style={{ fontFamily: 'var(--mal-font-display)', fontStyle: 'italic', fontSize: 22 }}>
        {isAr ? 'نهاية الوثيقة' : 'End of document'}
      </div>
      <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="mal-pill-btn" style={{ marginTop: 16 }}>
        ↑ {isAr ? 'إلى الأعلى' : 'Back to top'}
      </button>
    </section>
  );
}

window.SectionStrategy = SectionStrategy;
