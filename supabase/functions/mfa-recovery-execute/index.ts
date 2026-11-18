import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";
import { resolveSingleCompanyAdmin } from "../_shared/recovery-authorization.ts";
import { canExecuteRecovery, selectSingleVerifiedTotpFactor } from "../_shared/recovery-execution.ts";

const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "content-type": "application/json", "cache-control": "no-store" },
});
const uuid = (value: unknown): value is string => typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

// Deliberate safety switch: no Auth Admin factor deletion is permitted until
// staging has verified reconciliation, audit persistence and session handling.
const FACTOR_DELETION_ENABLED = false;

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

  let input: { request_id?: unknown };
  try { input = await req.json(); } catch { return reply({ error: "Invalid request" }, 400); }
  if (!uuid(input.request_id)) return reply({ error: "Invalid request" }, 400);

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

  // No factor is selected or deleted until Auth Admin factor listing is
  // integration-tested. The policy helper rejects absent/multiple factors.
  // It is intentionally not enough to authorize a destructive Auth Admin call.
  if (!FACTOR_DELETION_ENABLED) {
    return reply({ error: "Factor replacement awaiting staging validation" }, 503);
  }
  // Never claim execution without a fully tested factor-deletion and
  // reconciliation implementation. This endpoint currently has no mutation.
  void selectSingleVerifiedTotpFactor;
  return reply({ error: "Factor replacement unavailable" }, 503);
});
