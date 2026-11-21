-- DRAFT: NOT APPLIED. Review and test in staging before deploying.
-- Atomic, one-time reservation of an approved recovery for the server-side executor.
-- Authorization (JWT, requester identity, tenant and approver eligibility) MUST be
-- rechecked by the Edge Function before calling this RPC. This RPC alone does
-- not authorize MFA factor deletion.
create or replace function public.mfa_recovery_claim_execution(
  p_request_id uuid,
  p_requester_id uuid
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
begin
  update public.mfa_recovery_requests
     set status = 'executing', updated_at = now()
   where id = p_request_id
     and requester_id = p_requester_id
     and scope = 'company_admin'
     and empresa_id is not null
     and status = 'approved'
     and approved_by is not null
     and approved_by <> requester_id
     and email_verified_at is not null
     and approved_at is not null
     and email_verified_at >= created_at
     and approved_at >= email_verified_at
     and approved_at <= now()
     and created_at > now() - interval '30 minutes'
     and approved_at > now() - interval '10 minutes'
  returning id into v_id;
  return v_id is not null;
end;
$$;

-- PostgreSQL grants EXECUTE to PUBLIC on new functions by default.
revoke all on function public.mfa_recovery_claim_execution(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.mfa_recovery_claim_execution(uuid, uuid)
  to service_role;

comment on function public.mfa_recovery_claim_execution(uuid, uuid) is
  'Service-role-only atomic claim; not authorization to remove an MFA factor.';
