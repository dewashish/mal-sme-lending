// Supabase client — shared across the prototype.
// Loaded after the @supabase/supabase-js UMD bundle (window.supabase).
// Anon key is safe to expose; RLS / RPC handle authorization.
(function () {
  var URL = 'https://wnkrllrureljmezcoryf.supabase.co';
  var ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indua3JsbHJ1cmVsam1lemNvcnlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NzQ4MzEsImV4cCI6MjA4ODQ1MDgzMX0.WoCIAPaYis2AJbhE-ZifP1dtkZWCw6ebjSz9Jg65pHU';

  if (window.supabase && typeof window.supabase.createClient === 'function') {
    try {
      window.malSb = window.supabase.createClient(URL, ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false }
      });
    } catch (e) {
      console.warn('[mal] supabase client init failed:', e);
      window.malSb = null;
    }
  } else {
    console.warn('[mal] supabase UMD not loaded — persistence disabled.');
    window.malSb = null;
  }
})();
