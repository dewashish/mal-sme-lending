// Anonymous CTA click tracking. Fires a single Supabase RPC per click;
// reuses the existing `mal_session_id` UUID from localStorage as the
// device identifier (already generated on first load by session-store.js).
// IP is captured server-side inside the RPC from the gateway headers so
// we don't have to call any third-party geolocation service from the
// browser. No sign-in, no consent banner — the only thing stored is a
// click row (session id, cta id, timestamp, user agent, IP).
//
// Fire-and-forget: failures are swallowed so a flaky network never
// blocks the underlying CTA action.

(function () {
  var inflight = new Set();

  async function malTrack(ctaId, extra) {
    extra = extra || {};
    try {
      var sb = window.malSb;
      if (!sb || !window.MalSession) return;
      var sid = window.MalSession.getSessionId();
      if (!sid) return;
      // Coalesce duplicate clicks fired in the same tick (e.g., a button
      // wrapping an <a>). Keyed on cta id + nearest 250ms window.
      var key = ctaId + ':' + Math.floor(Date.now() / 250);
      if (inflight.has(key)) return;
      inflight.add(key);
      setTimeout(function () { inflight.delete(key); }, 1000);

      await sb.rpc('mal_track_cta_click', {
        p_session_id: sid,
        p_cta_id: ctaId,
        p_page: extra.page || (typeof location !== 'undefined' ? (location.pathname + location.hash) : null),
        p_user_agent: extra.userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : null),
      });
    } catch (e) {
      // Silent. Analytics must never break a click.
    }
  }

  window.malTrack = malTrack;
})();
