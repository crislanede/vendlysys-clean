import { resolveSingleCompanyAdmin } from "../_shared/recovery-authorization.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "content-type": "application/json", "cache-control": "no-store" },
});
const uuid = (v: unknown): v is string => typeof v === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

Deno.serve(async (req) => {
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  const bearer = req.headers.get("authorization") ?? "";
  if (!bearer.startsWith("Bearer ")) return reply({ error: "Unauthorized" }, 401);
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !service) return reply({ error: "Service unavailable" }, 503);
  const client = createClient(url, anon);
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const token = bearer.slice(7);
  const { data: identity, error: identityError } = await client.auth.getUser(token);
  const { data: assurance, error: assuranceError } = await client.auth.getClaims(token);
  if (identityError || !identity.user || assuranceError || assurance?.claims?.aal !== "aal2") {
    return reply({ error: "Verified MFA session required" }, 403);
  }
  const approverId = identity.user.id;
  let input: { request_id?: unknown };
  try { input = await req.json(); } catch { return reply({ error: "Invalid request" }, 400); }
  if (!uuid(input.request_id)) return reply({ error: "Invalid request" }, 400);

  const { data: recovery, error: recoveryError } = await admin.from("mfa_recovery_requests")
    .select("id,requester_id,empresa_id,scope,status,email_verified_at,created_at")
    .eq("id", input.request_id).maybeSingle();
  if (recoveryError) return reply({ error: "Service unavailable" }, 503);
  if (!recovery || recovery.status !== "pending_approval" || !recovery.email_verified_at ||
      recovery.requester_id === approverId) return reply({ error: "Request unavailable" }, 409);
  // Fail closed: regular accounts and SaaS admins need separately designed
  // authorization rules. Never trust provisional 'regular' scope.
  if (recovery.scope !== "company_admin" || !uuid(recovery.empresa_id)) {
    return reply({ error: "Approval workflow not enabled for this scope" }, 403);
  }
  if (!Number.isFinite(Date.parse(recovery.created_at)) || Date.now() - Date.parse(recovery.created_at) > 30 * 60_000) {
    return reply({ error: "Request expired" }, 410);
  }
  // Re-evaluate the REQUESTER at approval time. Their company access may
  // have been revoked or changed since the email challenge was created.
  const { data: requesterMemberships, error: requesterMembershipError } = await admin
    .from("usuarios_empresas").select("empresa_id,perfil")
    .eq("user_id", recovery.requester_id).eq("ativo", true);
  const { data: requesterOwned, error: requesterOwnedError } = await admin
    .from("empresas").select("id").eq("user_id", recovery.requester_id);
  const { data: requesterSaas, error: requesterSaasError } = await admin
    .from("usuarios").select("id").eq("id", recovery.requester_id)
    .eq("ativo", true).in("perfil", ["super_admin", "admin_saas"]).limit(1);
  if (requesterMembershipError || requesterOwnedError || requesterSaasError) {
    return reply({ error: "Unable to validate requester authorization" }, 503);
  }
  const requesterScope = resolveSingleCompanyAdmin(
    requesterMemberships ?? [], requesterOwned ?? [], Boolean(requesterSaas?.length),
  );
  if (!requesterScope.allowed || requesterScope.empresaId !== recovery.empresa_id) {
    return reply({ error: "Requester authorization changed" }, 403);
  }

  // A company suspended or blocked after the request must not approve recovery.
  const { data: tenant, error: tenantError } = await admin.from("empresas")
    .select("id,ativa,bloqueada").eq("id", recovery.empresa_id).maybeSingle();
  if (tenantError) return reply({ error: "Unable to validate company" }, 503);
  if (!tenant || tenant.ativa !== true || tenant.bloqueada === true) {
    return reply({ error: "Company is not eligible for recovery" }, 403);
  }
  // A verified email timestamp must be after creation and not in the future.
  const createdAt = Date.parse(recovery.created_at);
  const verifiedAt = Date.parse(recovery.email_verified_at);
  if (!Number.isFinite(verifiedAt) || verifiedAt < createdAt || verifiedAt > Date.now()) {
    return reply({ error: "Invalid email verification state" }, 403);
  }

  // Explicit pre-registration is mandatory, before the recovery was requested.
  const { data: registration, error: registrationError } = await admin.from("mfa_recovery_approvers")
    .select("id").eq("requester_id", recovery.requester_id)
    .eq("approver_id", approverId).eq("scope", "company_admin")
    .eq("empresa_id", recovery.empresa_id).lt("created_at", recovery.created_at).limit(1);
  if (registrationError || !registration?.length) return reply({ error: "Approver not authorized" }, 403);
  // Validate the approver's current tenant membership, not only the historic registration.
  const { data: membership, error: membershipError } = await admin.from("usuarios_empresas")
    .select("id").eq("user_id", approverId).eq("empresa_id", recovery.empresa_id)
    .eq("ativo", true).in("perfil", ["admin", "administrador"]).limit(1);
  const { data: owner, error: ownerError } = await admin.from("empresas")
    .select("id").eq("id", recovery.empresa_id).eq("user_id", approverId).limit(1);
  if (membershipError || ownerError || (!membership?.length && !owner?.length)) {
    return reply({ error: "Approver not authorized for this company" }, 403);
  }
  // Compare-and-swap prevents double approval; no factor is removed here.
  const { data: changed, error: updateError } = await admin.from("mfa_recovery_requests")
    .update({ status: "approved", approved_by: approverId,
      approved_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", recovery.id).eq("requester_id", recovery.requester_id)
    .eq("empresa_id", recovery.empresa_id).eq("scope", "company_admin")
    .eq("status", "pending_approval").is("approved_by", null)
    .gt("created_at", new Date(Date.now() - 30 * 60_000).toISOString())
    .select("id");
  if (updateError || changed?.length !== 1) return reply({ error: "Request changed" }, 409);
  await admin.from("mfa_recovery_audit").insert({
    request_id: recovery.id, actor_id: approverId,
    event: "recovery_approved", details: { empresa_id: recovery.empresa_id },
  });
  return reply({ status: "approved", message: "Approval recorded; factor reset remains disabled" });
});
