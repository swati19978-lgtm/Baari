-- Run once in the Supabase SQL editor. No names, contact details or health data.
create table if not exists public.baari_requests (
 id uuid primary key default gen_random_uuid(),
 created_at timestamptz not null default now(),
 visitor_id text not null,
 input jsonb not null,
 output text,
 input_tokens integer not null default 0,
 output_tokens integer not null default 0,
 status text not null default 'started' check(status in ('started','complete','error'))
);
create index if not exists baari_visitor_time on public.baari_requests(visitor_id,created_at);
alter table public.baari_requests enable row level security;
revoke all on public.baari_requests from anon,authenticated;
grant select,insert,update on public.baari_requests to service_role;
create or replace function public.baari_claim(p_visitor text,p_input jsonb)
returns uuid language plpgsql security invoker set search_path=public as $$
declare v_id uuid;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_visitor,0));
 if (select count(*) from public.baari_requests where visitor_id=p_visitor and created_at >= date_trunc('day',now() at time zone 'UTC') at time zone 'UTC') >=5 then return null; end if;
 insert into public.baari_requests(visitor_id,input) values(p_visitor,p_input) returning id into v_id;
 return v_id;
end; $$;
create or replace function public.baari_usage()
returns jsonb language sql security invoker set search_path=public as $$
 with completed as (
  select input from public.baari_requests where status='complete'
 ), language_counts as (
  select input->>'language' as language,count(*) as requests
  from completed group by input->>'language'
 )
 select jsonb_build_object(
  'messagesGenerated',count(*),
  'languages',count(distinct input->>'language'),
  'queueUpdates',count(*) filter(where input->>'scenario'='queue'),
  'medicalTests',count(*) filter(where input->>'scenario'='medical'),
  'languageCounts',coalesce((select jsonb_object_agg(language,requests) from language_counts),'{}'::jsonb)
 ) from completed;
$$;
revoke all on function public.baari_claim(text,jsonb) from public,anon,authenticated;
revoke all on function public.baari_usage() from public,anon,authenticated;
grant execute on function public.baari_claim(text,jsonb),public.baari_usage() to service_role;
