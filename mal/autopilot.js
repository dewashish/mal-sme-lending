// Mal — Demo-mode autopilot helpers.
// Tiny imperative helpers that return Promises, used by the scenario engine.
// All speeds are in milliseconds at speed=1; the global speed multiplier
// (set in DemoMode) is applied via wait().
(function () {
  const state = { speed: 1 };

  function setSpeed(s) { state.speed = s || 1; }
  function getSpeed() { return state.speed; }

  function wait(ms) {
    return new Promise((res) => setTimeout(res, ms / state.speed));
  }

  // Typewrite into a setter — calls setter(partial) at each char.
  // Returns a Promise that resolves when fully typed.
  function typewrite(setter, text, opts) {
    opts = opts || {};
    const perChar = opts.perChar != null ? opts.perChar : 38;  // ms
    const jitter = opts.jitter != null ? opts.jitter : 18;     // +/- ms
    let i = 0;
    return new Promise((resolve) => {
      function tick() {
        i += 1;
        const slice = text.slice(0, i);
        try { setter(slice); } catch (e) {}
        if (i >= text.length) { resolve(); return; }
        const dt = (perChar + (Math.random() * 2 - 1) * jitter) / state.speed;
        setTimeout(tick, Math.max(8, dt));
      }
      tick();
    });
  }

  // Type into multiple fields in sequence, with a small pause between.
  async function typeFields(spec, gap) {
    gap = gap != null ? gap : 220;
    for (const [setter, text, opts] of spec) {
      await typewrite(setter, text, opts);
      await wait(gap);
    }
  }

  // Brief flash on a setter (e.g. "Verifying…" → "Verified ✓")
  async function flashStatus(setter, frames) {
    for (const f of frames) {
      setter(f.text);
      await wait(f.hold || 600);
    }
  }

  window.MalAutopilot = {
    setSpeed, getSpeed,
    wait, typewrite, typeFields, flashStatus,
  };
})();
