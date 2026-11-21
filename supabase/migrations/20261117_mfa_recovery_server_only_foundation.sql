-- Migration already applied to Supabase project on 2026-11-17.
-- Recovery is disabled until secure server-side handlers and email delivery are ready.
create table if not exists public.mfa_recovery_approvers (
 id uuid primary key default gen_random_uuid(),
 requester_id uuid not null references auth.users(id) on delete cascade,
 approver_id uuid not null references auth.users(id) on delete cascade,
 empresa_id uuid references public.empresas(id) on delete cascade,
 scope text not null check (scope in ('company_admin','saas_admin')),
 created_at timestamptz not null default now(),
 check (requester_id <> approver_id),
 check ((scope='company_admin' and empresa_id is not null) or (scope='saas_admin' and empresa_id is null)),
 unique(requester_id,approver_id,scope,empresa_id)
);
create unique index if not exists mfa_recovery_approvers_unique_saas on public.mfa_recovery_approvers(requester_id,approver_id) where scope='saas_admin';
create table if not exists public.mfa_recovery_requests (
 id uuid primary key default gen_random_uuid(),
 requester_id uuid not null references auth.users(id) on delete cascade,
 empresa_id uuid references public.empresas(id) on delete set null,
 scope text not null check (scope in ('regular','company_admin','saas_admin')),
 status text not null default 'pending_email' check (status in ('pending_email','pending_approval','approved','executing','completed','expired','rejected','failed')),
 token_hash text,
 token_expires_at timestamptz,
 attempts int not null default 0 check (attempts between 0 and 10),
 email_verified_at timestamptz,
 approved_by uuid references auth.users(id),
 approved_at timestamptz,
 completed_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create unique index if not exists mfa_recovery_one_active on public.mfa_recovery_requests(requester_id) where status in ('pending_email','pending_approval','approved','executing');
create table if not exists public.mfa_recovery_audit (
 id bigint generated always as identity primary key,
 request_id uuid references public.mfa_recovery_requests(id) on delete set null,
 actor_id uuid references auth.users(id) on delete set null,
 event text not null,
 details jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
alter table public.mfa_recovery_approvers enable row level security;
alter table public.mfa_recovery_requests enable row level security;
alter table public.mfa_recovery_audit enable row level security;
revoke all on public.mfa_recovery_approvers, public.mfa_recovery_requests, public.mfa_recovery_audit from anon, authenticated;
