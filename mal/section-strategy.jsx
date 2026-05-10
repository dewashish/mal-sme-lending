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
        out.push({ type: 'para', para: { ...p, key: i } });
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
        const p = b.para;
        return <ParaBlock key={p.key} para={p} sectionRefs={sectionRefs}/>;
      })}
    </>
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
        fontSize: 52, lineHeight: 1.05, letterSpacing: '-0.02em',
        margin: '60px 0 22px', scrollMarginTop: 70,
        color: 'var(--mal-ink)',
      }}>
        <span style={{
          display: 'block', fontFamily: 'var(--mal-font-mono)',
          fontStyle: 'normal', fontSize: 11, letterSpacing: '.16em',
          textTransform: 'uppercase', color: 'var(--mal-primary)',
          marginBottom: 12, fontWeight: 600,
        }}>
          ─── Chapter
        </span>
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
