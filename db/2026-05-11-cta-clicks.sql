-- Mal · Anonymous CTA click tracking.
--
-- Run this once in the Supabase SQL editor for the shared project at
-- https://wnkrllrureljmezcoryf.supabase.co/project/_/sql.
--
-- Captures every CTA click against the existing per-browser
-- `mal_session_id` UUID. The gateway IP is read server-side from
-- the `request.headers` Postgres app setting that Supabase populates
-- on every PostgREST / RPC call. Anon role can insert via the RPC
-- but cannot select rows back — only the project owner / service_role
-- can read the table.

-- ============================================================
-- 1. Table
-- ============================================================
create table if not exists public.mal_cta_clicks (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null,
  cta_id      text not null,
  page        text,
  user_agent  text,
  ip          inet,
  created_at  timestamptz not null default now()
);

create index if not exists mal_cta_clicks_session_idx
  on public.mal_cta_clicks(session_id, created_at desc);
create index if not exists mal_cta_clicks_cta_idx
  on public.mal_cta_clicks(cta_id, created_at desc);

-- ============================================================
-- 2. Row-level security
-- ============================================================
alter table public.mal_cta_clicks enable row level security;

-- Anon role gets no direct table access — all writes flow through
-- the RPC below. (No select / insert / update / delete policies.)
-- service_role bypasses RLS, so the project owner can still read
-- the data from the dashboard or via the REST API with the
-- service key.

-- ============================================================
-- 3. Tracking RPC (the only entry point for anon clients)
-- ============================================================
create or replace function public.mal_track_cta_click(
  p_session_id uuid,
  p_cta_id     text,
  p_page       text default null,
  p_user_agent text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ip_text text;
  v_ip      inet;
begin
  -- Best-effort IP extraction from the gateway header.
  -- x-forwarded-for is "client, proxy1, proxy2"; we take the first hop.
  v_ip_text := nullif(
    split_part(
      coalesce(current_setting('request.headers', true)::json->>'x-forwarded-for', ''),
      ',', 1),
    '');
  -- Trim any surrounding whitespace
  v_ip_text := nullif(trim(v_ip_text), '');
  begin
    v_ip := v_ip_text::inet;
  exception when others then
    v_ip := null;
  end;

  insert into public.mal_cta_clicks (session_id, cta_id, page, user_agent, ip)
  values (p_session_id, p_cta_id, p_page, p_user_agent, v_ip);
end;
$$;

grant execute on function public.mal_track_cta_click(uuid, text, text, text) to anon;

-- ============================================================
-- 4. Read helper (owner-only via service_role; convenience view)
-- ============================================================
-- Quick rollups you can run in the SQL editor:
--
--   select cta_id, count(*) as clicks, count(distinct session_id) as devices
--     from public.mal_cta_clicks
--     where created_at > now() - interval '7 days'
--     group by cta_id order by clicks desc;
--
--   select created_at, cta_id, session_id, ip, user_agent
--     from public.mal_cta_clicks
--     order by created_at desc limit 100;
