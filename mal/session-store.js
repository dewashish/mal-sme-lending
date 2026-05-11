// Mal SME Lending. Session state persistence.
// Anonymous demo sessions: a UUID is generated on first load and stored in
// localStorage. All commit-style actions (sign, accept, submit) call
// MalSession.saveSlice('sliceName', data). Debounced upsert via the
// `mal_state_save` RPC. On app mount, MalSession.loadState() rehydrates the
// JSONB state. If Supabase is unreachable, everything still works via the
// in-memory cache; nothing throws.

(function () {
  var SESSION_KEY = 'mal_session_id';
  var memCache = {};
  var saveTimers = {};
  var saveListeners = [];

  function uuid() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    // RFC4122 v4 fallback
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      var v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function getSessionId() {
    var id = null;
    try { id = localStorage.getItem(SESSION_KEY); } catch (e) {}
    if (!id) {
      id = uuid();
      try { localStorage.setItem(SESSION_KEY, id); } catch (e) {}
    }
    return id;
  }

  function getCache() { return memCache; }

  function notifySaved(slice) {
    saveListeners.forEach(function (fn) {
      try { fn(slice); } catch (e) {}
    });
  }

  function onSaved(fn) {
    saveListeners.push(fn);
    return function () {
      saveListeners = saveListeners.filter(function (f) { return f !== fn; });
    };
  }

  async function loadState() {
    var sb = window.malSb;
    if (!sb) return memCache;
    try {
      var resp = await sb.from('mal_sessions').select('persona, lang, state').eq('session_id', getSessionId()).maybeSingle();
      if (resp.error) {
        console.warn('[mal] loadState error', resp.error.message);
        return memCache;
      }
      if (resp.data) {
        memCache = Object.assign({}, resp.data.state || {}, {
          __persona: resp.data.persona,
          __lang: resp.data.lang,
        });
      }
      return memCache;
    } catch (e) {
      console.warn('[mal] loadState exception', e);
      return memCache;
    }
  }

  function saveSlice(slice, data, opts) {
    opts = opts || {};
    memCache[slice] = Object.assign({}, memCache[slice] || {}, data);
    var sb = window.malSb;
    if (!sb) return Promise.resolve(memCache);

    if (saveTimers[slice]) clearTimeout(saveTimers[slice]);
    return new Promise(function (resolve) {
      saveTimers[slice] = setTimeout(async function () {
        try {
          var resp = await sb.rpc('mal_state_save', {
            p_session_id: getSessionId(),
            p_slice: slice,
            p_data: memCache[slice],
            p_persona: opts.persona || memCache.__persona || null,
            p_lang: opts.lang || memCache.__lang || null,
          });
          if (resp.error) {
            console.warn('[mal] saveSlice', slice, 'error', resp.error.message);
          } else {
            notifySaved(slice);
          }
        } catch (e) {
          console.warn('[mal] saveSlice exception', e);
        }
        resolve(memCache);
      }, opts.debounce != null ? opts.debounce : 200);
    });
  }

  function setMeta(persona, lang) {
    memCache.__persona = persona;
    memCache.__lang = lang;
    var sb = window.malSb;
    if (!sb) return;
    sb.rpc('mal_state_save', {
      p_session_id: getSessionId(),
      p_slice: '__meta',
      p_data: { ts: Date.now() },
      p_persona: persona,
      p_lang: lang,
    }).then(function (r) {
      if (!r.error) notifySaved('__meta');
    }).catch(function () {});
  }

  window.MalSession = {
    getSessionId: getSessionId,
    getCache: getCache,
    loadState: loadState,
    saveSlice: saveSlice,
    setMeta: setMeta,
    onSaved: onSaved,
  };
})();
