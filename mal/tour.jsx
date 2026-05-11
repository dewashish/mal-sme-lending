/* eslint-disable */
// Mal · Tour engine
// Shared step-by-step product tour overlay. Used by Prototype and Economics
// sections via window.MalTour({ steps, onClose, isOpen }).
//
// Each step:
//   { selector?: string,           // CSS selector OR data-tour-id="..."
//     title: string,
//     body: string | (string[]),   // string or list of paragraphs
//     position?: 'auto'|'top'|'bottom'|'left'|'right'|'center',
//     scrollIntoView?: boolean,    // default true
//     padding?: number,            // spotlight padding, default 8
//   }
//
// If selector resolves to nothing (or step has no selector), the step shows
// as a centred modal-style card with no spotlight.

const { useState: tS, useEffect: tE, useMemo: tM, useCallback: tCB, useRef: tR } = React;

function MalTour({ steps, onClose, isOpen, lang = 'en' }) {
  const isAr = lang === 'ar';
  const [idx, setIdx] = tS(0);
  const [rect, setRect] = tS(null);
  const [vp, setVp] = tS({ w: window.innerWidth, h: window.innerHeight });
  const popRef = tR(null);

  const step = steps[idx];

  // Clamp idx if steps shrink
  tE(() => { if (idx >= steps.length) setIdx(0); }, [steps.length]);

  // On open or step change: locate target, scroll into view, compute rect
  tE(() => {
    if (!isOpen || !step) return;
    let el = null;
    if (step.selector) {
      el = document.querySelector(step.selector);
      if (!el && step.selector.startsWith('[data-tour-id=')) {
        // Try without quotes wrapping
      }
    }
    if (!el) { setRect(null); return; }
    if (step.scrollIntoView !== false) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    // Wait for scroll, then read rect
    const t = setTimeout(() => {
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    }, 350);
    return () => clearTimeout(t);
  }, [isOpen, idx, step?.selector]);

  // Recompute on viewport changes
  tE(() => {
    if (!isOpen) return;
    const onResize = () => {
      setVp({ w: window.innerWidth, h: window.innerHeight });
      if (step?.selector) {
        const el = document.querySelector(step.selector);
        if (el) {
          const r = el.getBoundingClientRect();
          setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
        }
      }
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
  }, [isOpen, idx]);

  // Keyboard navigation
  tE(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight' || e.key === 'Enter') next();
      else if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, idx, steps.length]);

  if (!isOpen || !step) return null;

  const next = () => {
    if (idx + 1 >= steps.length) onClose();
    else setIdx(idx + 1);
  };
  const prev = () => { if (idx > 0) setIdx(idx - 1); };

  const padding = step.padding ?? 8;
  const hasSpotlight = !!rect;

  // Build spotlight rectangles (4 sides) when rect known
  const spotlightTop    = hasSpotlight ? Math.max(0, rect.top - padding) : 0;
  const spotlightLeft   = hasSpotlight ? Math.max(0, rect.left - padding) : 0;
  const spotlightW      = hasSpotlight ? rect.width + padding * 2 : 0;
  const spotlightH      = hasSpotlight ? rect.height + padding * 2 : 0;
  const spotlightBottom = spotlightTop + spotlightH;
  const spotlightRight  = spotlightLeft + spotlightW;

  // Compute popover position
  const popMaxW = 380;
  let popTop, popLeft, popPosition = step.position || 'auto';

  if (!hasSpotlight || popPosition === 'center') {
    popTop = vp.h / 2 - 120;
    popLeft = vp.w / 2 - popMaxW / 2;
  } else {
    // Auto: prefer below if space; else above; else right; else left
    const spaceBelow = vp.h - spotlightBottom;
    const spaceAbove = spotlightTop;
    const spaceRight = vp.w - spotlightRight;
    const spaceLeft  = spotlightLeft;

    let chosen = popPosition;
    if (chosen === 'auto') {
      if (spaceBelow >= 200) chosen = 'bottom';
      else if (spaceAbove >= 200) chosen = 'top';
      else if (spaceRight >= popMaxW + 24) chosen = 'right';
      else if (spaceLeft >= popMaxW + 24) chosen = 'left';
      else chosen = 'bottom';
    }

    if (chosen === 'bottom') {
      popTop = spotlightBottom + 14;
      popLeft = Math.max(16, Math.min(spotlightLeft, vp.w - popMaxW - 16));
    } else if (chosen === 'top') {
      popTop = Math.max(16, spotlightTop - 220);
      popLeft = Math.max(16, Math.min(spotlightLeft, vp.w - popMaxW - 16));
    } else if (chosen === 'right') {
      popLeft = spotlightRight + 14;
      popTop = Math.max(16, Math.min(spotlightTop, vp.h - 220));
    } else if (chosen === 'left') {
      popLeft = Math.max(16, spotlightLeft - popMaxW - 14);
      popTop = Math.max(16, Math.min(spotlightTop, vp.h - 220));
    }
  }

  const overlayBase = {
    position: 'fixed',
    background: 'rgba(10,10,15,0.62)',
    zIndex: 200,
    transition: 'all .25s cubic-bezier(.4,0,.2,1)',
    pointerEvents: 'auto',
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200 }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      {/* Four overlay rectangles forming spotlight cutout (or full screen if no rect) */}
      {hasSpotlight ? (
        <>
          <div style={{ ...overlayBase, top: 0, left: 0, right: 0, height: spotlightTop }}/>
          <div style={{ ...overlayBase, top: spotlightTop, left: 0, width: spotlightLeft, height: spotlightH }}/>
          <div style={{ ...overlayBase, top: spotlightTop, left: spotlightRight, right: 0, height: spotlightH }}/>
          <div style={{ ...overlayBase, top: spotlightBottom, left: 0, right: 0, bottom: 0 }}/>
          {/* Spotlight border */}
          <div style={{
            position: 'fixed',
            top: spotlightTop, left: spotlightLeft, width: spotlightW, height: spotlightH,
            borderRadius: 12,
            boxShadow: '0 0 0 2px var(--mal-primary), 0 0 0 6px rgba(180, 130, 230, 0.35)',
            pointerEvents: 'none',
            transition: 'all .25s cubic-bezier(.4,0,.2,1)',
            zIndex: 201,
          }}/>
        </>
      ) : (
        <div style={{ ...overlayBase, inset: 0 }}/>
      )}

      {/* Popover card */}
      <div ref={popRef} style={{
        position: 'fixed',
        top: popTop, left: popLeft,
        width: popMaxW, maxWidth: 'calc(100vw - 32px)',
        background: '#FAF7EE',
        border: '1px solid var(--mal-line)',
        borderRadius: 16,
        boxShadow: '0 20px 60px rgba(10,10,28,.45)',
        zIndex: 202,
        padding: 22,
        animation: 'mal-fade-up .22s ease-out',
        direction: isAr ? 'rtl' : 'ltr',
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{
            fontSize: 10.5, fontWeight: 700, letterSpacing: '.08em',
            textTransform: 'uppercase', color: 'var(--mal-mid-2)',
          }}>
            {isAr ? `الجولة · ${idx + 1}/${steps.length}` : `TOUR · STEP ${idx + 1} OF ${steps.length}`}
          </span>
          <button onClick={onClose} aria-label={isAr ? 'إغلاق' : 'Close'} style={{
            all: 'unset', cursor: 'pointer', padding: '4px 8px',
            fontSize: 11, color: 'var(--mal-mid)', borderRadius: 6,
          }}>{isAr ? 'تخطّي' : 'Skip'} ✕</button>
        </div>
        <div style={{
          fontFamily: 'var(--mal-font-display)', fontStyle: 'italic',
          fontSize: 22, lineHeight: 1.2, letterSpacing: '-0.01em',
          color: 'var(--mal-ink)', marginBottom: 8,
        }}>{step.title}</div>
        <div style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--mal-ink)' }}>
          {Array.isArray(step.body)
            ? step.body.map((p, i) => <p key={i} style={{ margin: i ? '8px 0 0' : '0' }}>{p}</p>)
            : <p style={{ margin: 0 }}>{step.body}</p>}
        </div>

        {/* Progress dots */}
        <div style={{ display: 'flex', gap: 4, marginTop: 16, flexWrap: 'wrap' }}>
          {steps.map((_, i) => (
            <div key={i} style={{
              width: i === idx ? 18 : 6, height: 4, borderRadius: 4,
              background: i <= idx ? 'var(--mal-primary)' : 'var(--mal-line)',
              transition: 'width .2s, background .2s',
            }}/>
          ))}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 16 }}>
          <button onClick={prev} disabled={idx === 0}
                  style={{
                    all: 'unset', cursor: idx === 0 ? 'default' : 'pointer',
                    padding: '8px 14px', borderRadius: 999,
                    fontSize: 12, fontWeight: 500,
                    color: idx === 0 ? 'var(--mal-mid-2)' : 'var(--mal-ink)',
                    border: '1px solid var(--mal-line)',
                    opacity: idx === 0 ? 0.5 : 1,
                  }}>
            {isAr ? '← السابق' : '← Previous'}
          </button>
          <button onClick={next} style={{
            all: 'unset', cursor: 'pointer',
            padding: '8px 18px', borderRadius: 999,
            fontSize: 12, fontWeight: 600,
            background: 'var(--mal-ink)', color: '#FAF7EE',
          }}>
            {idx + 1 >= steps.length
              ? (isAr ? 'إنهاء ✓' : 'Finish ✓')
              : (isAr ? 'التالي →' : 'Next →')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// TourButton. The "Take a tour" pill, top-right corner
// ============================================================
function TourButton({ onStart, lang = 'en', style }) {
  const isAr = lang === 'ar';
  const baseStyle = {
    all: 'unset', cursor: 'pointer', display: 'inline-flex',
    alignItems: 'center', gap: 6,
    padding: '6px 12px',
    background: 'transparent',
    color: 'var(--mal-mid)',
    border: '1px solid var(--mal-line)',
    borderRadius: 999, fontSize: 11.5, fontWeight: 500,
    transition: 'color .15s, border-color .15s, background .15s',
  };
  return (
    <button onClick={onStart}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--mal-ink)';
              e.currentTarget.style.borderColor = 'var(--mal-ink)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--mal-mid)';
              e.currentTarget.style.borderColor = 'var(--mal-line)';
            }}
            style={{ ...baseStyle, ...style }}>
      <span>{isAr ? 'خذ جولة' : 'Take a tour'}</span>
      <span style={{ fontSize: 11, opacity: 0.7 }}>→</span>
    </button>
  );
}

window.MalTour = MalTour;
window.MalTourButton = TourButton;
