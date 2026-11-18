import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";
import { recoveryCodeDigest, constantTimeHexEqual } from "../_shared/recovery-crypto.ts";

const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "content-type": "application/json", "cache-control": "no-store" },
});
const uuid = (value: unknown): value is string =>
  typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

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
  const { data: auth, error: authError } = await client.auth.getUser(bearer.slice(7));
  if (authError || !auth.user) return reply({ error: "Unauthorized" }, 401);

  let input: { request_id?: unknown; code?: unknown };
  try { input = await req.json(); } catch { return reply({ error: "Invalid request" }, 400); }
  if (!uuid(input.request_id) || typeof input.code !== "string" || !/^\d{6}$/.test(input.code)) {
    return reply({ error: "Invalid request" }, 400);
  }
  const { data: request, error: lookupError } = await admin.from("mfa_recovery_requests")
    .select("id,requester_id,status,token_hash,token_expires_at,attempts")
    .eq("id", input.request_id).eq("requester_id", auth.user.id).maybeSingle();
  if (lookupError) return reply({ error: "Service unavailable" }, 503);
  if (!request || request.status !== "pending_email") return reply({ error: "Request unavailable" }, 409);
  if (!request.token_expires_at || Date.parse(request.token_expires_at) <= Date.now() || request.attempts >= 5) {
    await admin.from("mfa_recovery_requests").update({ status: "expired", token_hash: null, token_expires_at: null })
      .eq("id", request.id).eq("requester_id", auth.user.id).eq("status", "pending_email");
    return reply({ error: "Code expired or attempts exhausted" }, 410);
  }
  let valid = false;
  try {
    const hash = await recoveryCodeDigest(request.id, input.code);
    valid = constantTimeHexEqual(hash, request.token_hash ?? "");
  } catch { return reply({ error: "Service unavailable" }, 503); }

  if (!valid) {
    // Compare-and-swap on attempts: a concurrent attempt cannot silently overwrite
    // a newer counter. Caller must retry; never accept an ambiguous update.
    const next = request.attempts + 1;
    const { data: changed, error } = await admin.from("mfa_recovery_requests")
      .update({ attempts: next, ...(next >= 5 ? { status: "expired", token_hash: null, token_expires_at: null } : {}) })
      .eq("id", request.id).eq("requester_id", auth.user.id).eq("status", "pending_email")
      .eq("attempts", request.attempts).select("id");
    if (error || changed?.length !== 1) return reply({ error: "Please retry" }, 409);
    await admin.from("mfa_recovery_audit").insert({
      request_id: request.id, actor_id: auth.user.id, event: "email_challenge_invalid",
    });
    return reply({ error: "Invalid code" }, 403);
  }

  // IMPORTANT: This endpoint ONLY records email ownership. It cannot approve
  // recovery, change scope or remove MFA factors. A separate authorized workflow
  // must revalidate tenant membership and require independent proof.
  const { data: changed, error } = await admin.from("mfa_recovery_requests")
    .update({ email_verified_at: new Date().toISOString(), token_hash: null, token_expires_at: null,
      status: "pending_approval" })
    .eq("id", request.id).eq("requester_id", auth.user.id).eq("status", "pending_email")
    .eq("attempts", request.attempts).gt("token_expires_at", new Date().toISOString())
    .select("id");
  if (error || changed?.length !== 1) return reply({ error: "Request changed; retry" }, 409);
  await admin.from("mfa_recovery_audit").insert({
    request_id: request.id, actor_id: auth.user.id, event: "email_challenge_verified",
  });
  return reply({ status: "pending_approval", message: "Email verified; additional authorization required" });
});
