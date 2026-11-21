import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";
import { resolveSingleCompanyAdmin } from "../_shared/recovery-authorization.ts";
import { canExecuteRecovery } from "../_shared/recovery-execution.ts";
import { findRecoverableFactor, deleteRecoverableFactor } from "../_shared/recovery-auth-provider.ts";
import { orchestrateReset } from "../_shared/recovery-reset-orchestrator.ts";

const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "content-type": "application/json", "cache-control": "no-store" },
});
const uuid = (value: unknown): value is string => typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

Deno.serve(async (req) => {
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  const bearer = req.headers.get("authorization") ?? "";
  if (!bearer.startsWith("Bearer ")) return reply({ error: "Unauthorized" }, 401);
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !service) return reply({ error: "Service unavailable" }, 503);

  const userClient = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: identity, error: identityError } = await userClient.auth.getUser(bearer.slice(7));
  if (identityError || !identity.user) return reply({ error: "Unauthorized" }, 401);

  let input: { request_id?: unknown; password?: unknown };
  try { input = await req.json(); } catch { return reply({ error: "Invalid request" }, 400); }
  if (!uuid(input.request_id) || typeof input.password !== "string" ||
    input.password.length === 0 || input.password.length > 1024) {
    return reply({ error: "Invalid request" }, 400);
  }
  // Fresh password proof at execution: a bearer token alone is insufficient.
  if (!identity.user.email || !identity.user.email_confirmed_at) {
    return reply({ error: "Confirmed email required" }, 403);
  }
  // Gate password checks behind a valid, recently approved recovery.
  // Prevents using this endpoint as an unrestricted password oracle.
  const { data: candidate, error: candidateError } = await admin.from("mfa_recovery_requests")
    .select("id,requester_id,empresa_id,scope,status,created_at,email_verified_at,approved_at,approved_by")
    .eq("id", input.request_id).eq("requester_id", identity.user.id).maybeSingle();
  if (candidateError) return reply({ error: "Service unavailable" }, 503);
  if (!candidate || !canExecuteRecovery(candidate, identity.user.id, Date.now())) {
    return reply({ error: "Recovery unavailable or expired" }, 403);
  }

  const passwordClient = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  let passwordVerified = false;
  try {
    const { data: proof, error: proofError } = await passwordClient.auth.signInWithPassword({
      email: identity.user.email,
      password: input.password,
    });
    passwordVerified = !proofError && proof.user?.id === identity.user.id;
  } catch {
    return reply({ error: "Password verification unavailable" }, 503);
  } finally {
    try { await passwordClient.auth.signOut(); } catch { /* ephemeral client */ }
  }
  if (!passwordVerified) return reply({ error: "Password verification failed" }, 403);

  // Revalidate approval after the password round trip.
  const { data: recovery, error: recoveryError } = await admin.from("mfa_recovery_requests")
    .select("id,requester_id,empresa_id,scope,status,created_at,email_verified_at,approved_at,approved_by")
    .eq("id", input.request_id).eq("requester_id", identity.user.id).maybeSingle();
  if (recoveryError) return reply({ error: "Service unavailable" }, 503);
  if (!recovery || !canExecuteRecovery(recovery, identity.user.id, Date.now())) {
    return reply({ error: "Recovery unavailable or expired" }, 403);
  }

  // Validate requester, tenant and approver again at execution time.
  const { data: memberships, error: membershipsError } = await admin.from("usuarios_empresas")
    .select("empresa_id,perfil").eq("user_id", identity.user.id).eq("ativo", true);
  const { data: owned, error: ownedError } = await admin.from("empresas")
    .select("id").eq("user_id", identity.user.id);
  const { data: saas, error: saasError } = await admin.from("usuarios")
    .select("id").eq("id", identity.user.id).eq("ativo", true)
    .in("perfil", ["super_admin", "admin_saas"]).limit(1);
  if (membershipsError || ownedError || saasError) return reply({ error: "Authorization unavailable" }, 503);
  const scope = resolveSingleCompanyAdmin(memberships ?? [], owned ?? [], Boolean(saas?.length));
  if (!scope.allowed || scope.empresaId !== recovery.empresa_id) {
    return reply({ error: "Requester authorization changed" }, 403);
  }
  const { data: company, error: companyError } = await admin.from("empresas")
    .select("ativa,bloqueada,user_id").eq("id", recovery.empresa_id).maybeSingle();
  if (companyError || !company || company.ativa !== true || company.bloqueada === true) {
    return reply({ error: "Company unavailable" }, 403);
  }
  const { data: designated, error: designatedError } = await admin.from("mfa_recovery_approvers")
    .select("id").eq("requester_id", identity.user.id).eq("approver_id", recovery.approved_by)
    .eq("empresa_id", recovery.empresa_id).eq("scope", "company_admin")
    .lt("created_at", recovery.created_at).limit(1);
  if (designatedError || !designated?.length) return reply({ error: "Approval revoked" }, 403);
  const { data: approverMembership, error: approverError } = await admin.from("usuarios_empresas")
    .select("id").eq("user_id", recovery.approved_by).eq("empresa_id", recovery.empresa_id)
    .eq("ativo", true).in("perfil", ["admin", "administrador"]).limit(1);
  if (approverError) return reply({ error: "Approval unavailable" }, 503);
  if (company.user_id !== recovery.approved_by && !approverMembership?.length) {
    return reply({ error: "Approver no longer authorized" }, 403);
  }

  // Read-only provider preflight: fail closed if no single verified TOTP exists.
  // Never return the factor identifier to the client.
  let factorId: string | null = null;
  try {
    factorId = await findRecoverableFactor(admin.auth.admin, identity.user.id);
  } catch {
    return reply({ error: "Authenticator verification unavailable" }, 503);
  }
  if (!factorId) return reply({ error: "Authenticator unavailable or not uniquely verified" }, 409);

  // Disabled by default. No production reset is possible without an explicit
  // server-side opt-in after staging validation and migration rollout.
  if (Deno.env.get("MFA_RECOVERY_DESTRUCTIVE_ENABLED") !== "true") {
    return reply({
      status: "authorization_and_factor_preflight_passed",
      request_id: recovery.id,
      factor_verified: true,
      factor_deleted: false,
      approval_consumed: false,
    });
  }

  // The database claim is a compare-and-swap: exactly one concurrent
  // execution may consume an approval. The migration grants RPC to service_role.
  const outcome = await orchestrateReset({
    selectFactor: async () => {
      // Recheck immediately before claiming; no cached factor is trusted.
      return await findRecoverableFactor(admin.auth.admin, identity.user.id);
    },
    claim: async () => {
      const { data, error } = await admin.rpc("mfa_recovery_claim_execution", {
        p_request_id: recovery.id,
        p_requester_id: identity.user.id,
      });
      if (error) throw error;
      return data === true;
    },
    deleteFactor: async (id) =>
      await deleteRecoverableFactor(admin.auth.admin, identity.user.id, id),
    finalize: async (success) => {
      const { data, error } = await admin.rpc("mfa_recovery_finalize_execution", {
        p_request_id: recovery.id,
        p_requester_id: identity.user.id,
        p_success: success,
      });
      if (error) throw error;
      return data === true;
    },
    audit: async (event) => {
      const { error } = await admin.from("mfa_recovery_audit").insert({
        request_id: recovery.id,
        actor_id: identity.user.id,
        event,
      });
      if (error) throw error;
    },
  });
  if (outcome.status === "completed") {
    // Supabase Auth Admin invalidates sessions when a verified factor is removed.
    // The user must sign in again and enroll a new TOTP before AAL2 actions.
    return reply({ status: "completed", reauthentication_required: true, mfa_enrollment_required: true });
  }
  if (outcome.status === "manual_review") {
    return reply({ status: "manual_review", reason: outcome.reason }, 409);
  }
  return reply({ status: "blocked", reason: outcome.reason }, 409);

  // Dry-run only. This endpoint never consumes approval or deletes a factor.
  // Production reset requires a separately tested, auditable reconciliation
  // strategy for ambiguous Auth Admin outcomes and forced session revocation.
  return reply({
    status: "authorization_and_factor_preflight_passed",
    request_id: recovery.id,
    factor_verified: true,
    factor_deleted: false,
    approval_consumed: false,
  });
});
