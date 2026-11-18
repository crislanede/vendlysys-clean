\set ON_ERROR_STOP on
-- Disposable PostgreSQL CI database only; never run against production.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin;
create table public.mfa_recovery_requests (
 id uuid primary key,
 requester_id uuid not null,
 empresa_id uuid,
 scope text not null,
 status text not null,
 approved_by uuid,
 email_verified_at timestamptz,
 approved_at timestamptz,
 created_at timestamptz not null,
 updated_at timestamptz not null default now()
);
\i supabase/migrations/20261118_mfa_recovery_atomic_execution_claim.sql
do $$
begin
 if has_function_privilege('anon', 'public.mfa_recovery_claim_execution(uuid,uuid)', 'EXECUTE')
 or has_function_privilege('authenticated', 'public.mfa_recovery_claim_execution(uuid,uuid)', 'EXECUTE')
 or has_function_privilege('public', 'public.mfa_recovery_claim_execution(uuid,uuid)', 'EXECUTE') then
  raise exception 'Unprivileged role can execute claim';
 end if;
 if not has_function_privilege('service_role', 'public.mfa_recovery_claim_execution(uuid,uuid)', 'EXECUTE') then
  raise exception 'service_role cannot execute claim';
 end if;
end $$;
insert into public.mfa_recovery_requests
(id,requester_id,empresa_id,scope,status,approved_by,email_verified_at,approved_at,created_at)
values
('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000021','company_admin','approved','00000000-0000-4000-8000-000000000031',now()-interval '2 minutes',now()-interval '1 minute',now()-interval '3 minutes'),
('00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000012','00000000-0000-4000-8000-000000000022','company_admin','approved','00000000-0000-4000-8000-000000000032',now()-interval '20 minutes',now()-interval '11 minutes',now()-interval '25 minutes'),
('00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000013','00000000-0000-4000-8000-000000000023','company_admin','approved','00000000-0000-4000-8000-000000000013',now()-interval '2 minutes',now()-interval '1 minute',now()-interval '3 minutes');
do $$
begin
 if public.mfa_recovery_claim_execution('00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000012') then
  raise exception 'Expired approval was claimed';
 end if;
 if public.mfa_recovery_claim_execution('00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000013') then
  raise exception 'Self-approved recovery was claimed';
 end if;
 if public.mfa_recovery_claim_execution('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000099') then
  raise exception 'Wrong requester claimed recovery';
 end if;
end $$;
