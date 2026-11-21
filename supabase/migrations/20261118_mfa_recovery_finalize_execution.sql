-- DRAFT ONLY: execute on disposable staging DB before any production migration.
-- An execution is terminal: ambiguous Auth Admin outcomes MUST be reconciled
-- manually, never retried with the same recovery approval.
create or replace function public.mfa_recovery_finalize_execution(
  p_request_id uuid,
  p_requester_id uuid,
  p_success boolean
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
     set status = case when p_success then 'completed' else 'failed' end,
         completed_at = case when p_success then now() else null end,
         updated_at = now()
   where id = p_request_id
     and requester_id = p_requester_id
     and scope = 'company_admin'
     and status = 'executing'
  returning id into v_id;
  return v_id is not null;
end;
$$;

revoke all on function public.mfa_recovery_finalize_execution(uuid, uuid, boolean)
  from public, anon, authenticated;
grant execute on function public.mfa_recovery_finalize_execution(uuid, uuid, boolean)
  to service_role;
comment on function public.mfa_recovery_finalize_execution(uuid, uuid, boolean) is
  'Terminal transition only; failure cannot be retried without new independent authorization.';
