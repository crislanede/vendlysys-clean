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
