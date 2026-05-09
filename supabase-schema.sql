-- Mal SME Lending — session state schema.
-- Run once in the Supabase SQL editor for project wnkrllrureljmezcoryf.
-- Anonymous demo sessions: every browser holds a UUID in localStorage
-- and writes its state into a single row of mal_sessions via the RPC below.

create extension if not exists "pgcrypto";

create table if not exists public.mal_sessions (
  session_id text primary key,
  persona text,
  lang text,
  state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.mal_sessions enable row level security;

drop policy if exists "anon read all sessions" on public.mal_sessions;
drop policy if exists "anon insert sessions" on public.mal_sessions;
drop policy if exists "anon update sessions" on public.mal_sessions;

-- Demo posture: anon may read/insert/update. The session_id is a client-side
-- UUID; in practice no one knows another user's UUID. NOT suitable for prod.
create policy "anon read all sessions"
  on public.mal_sessions for select
  using (true);

create policy "anon insert sessions"
  on public.mal_sessions for insert
  with check (true);

create policy "anon update sessions"
  on public.mal_sessions for update
  using (true) with check (true);

-- Atomic "merge a JSON slice" RPC. The client never has to read-modify-write.
create or replace function public.mal_state_save(
  p_session_id text,
  p_slice text,
  p_data jsonb,
  p_persona text default null,
  p_lang text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.mal_sessions (session_id, persona, lang, state, updated_at)
    values (
      p_session_id,
      p_persona,
      p_lang,
      jsonb_build_object(p_slice, p_data),
      now()
    )
  on conflict (session_id) do update set
    persona    = coalesce(p_persona, public.mal_sessions.persona),
    lang       = coalesce(p_lang,    public.mal_sessions.lang),
    state      = public.mal_sessions.state || jsonb_build_object(p_slice, p_data),
    updated_at = now();
end;
$$;

grant execute on function public.mal_state_save(text, text, jsonb, text, text) to anon, authenticated;
