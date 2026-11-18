import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";
import { sendRecoveryEmail } from "../_shared/recovery-email.ts";
import { generateRecoveryCode, recoveryCodeDigest } from "../_shared/recovery-crypto.ts";

const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "content-type": "application/json", "cache-control": "no-store" },
});

Deno.serve(async (req) => {
  if (req.method !== "POST") return response({ error: "Method not allowed" }, 405);
  const bearer = req.headers.get("authorization") ?? "";
  if (!bearer.startsWith("Bearer ")) return response({ error: "Unauthorized" }, 401);
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !service) return response({ error: "Service unavailable" }, 503);
  const client = createClient(url, anon);
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: userData, error: userError } = await client.auth.getUser(bearer.slice(7));
  const user = userData.user;
  if (userError || !user?.email || !user.email_confirmed_at) return response({ error: "Unauthorized" }, 401);

  // Revalidate the password independently of the existing AAL1 session.
  // This endpoint is intentionally unavailable to accounts using passwordless-only auth.
  let input: { password?: unknown };
  try { input = await req.json(); } catch { return response({ error: "Invalid request" }, 400); }
  if (typeof input.password !== "string" || input.password.length < 1 || input.password.length > 1024) {
    return response({ error: "Password confirmation required" }, 400);
  }
  const passwordClient = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: passwordData, error: passwordError } = await passwordClient.auth.signInWithPassword({
    email: user.email, password: input.password,
  });
  if (passwordError || passwordData.user?.id !== user.id) {
    return response({ error: "Unable to verify credentials" }, 403);
  }
  // Avoid retaining a second authenticated session on this server request.
  await passwordClient.auth.signOut();

  // Scope is deliberately server-derived. Until the account/tenant role schema is
  // verified, only a pending-email request can be created; no approval or reset.
  const { data: existing, error: lookupError } = await admin.from("mfa_recovery_requests")
    .select("id,created_at,status").eq("requester_id", user.id)
    .in("status", ["pending_email", "pending_approval", "approved", "executing"])
    .limit(1);
  if (lookupError) return response({ error: "Service unavailable" }, 503);
  if (existing?.length) return response({ error: "An active recovery request already exists" }, 429);

  // Bound request volume even when a previous email delivery failed or a
  // previous request expired. This is per-account defense in depth; enforce
  // per-IP throttling at the gateway before enabling this endpoint publicly.
  const hourAgo = new Date(Date.now() - 60 * 60_000).toISOString();
  const { count: recentCount, error: rateError } = await admin
    .from("mfa_recovery_requests")
    .select("id", { count: "exact", head: true })
    .eq("requester_id", user.id).gte("created_at", hourAgo);
  if (rateError) return response({ error: "Service unavailable" }, 503);
  if ((recentCount ?? 0) >= 3) {
    return response({ error: "Too many recovery requests; try again later" }, 429);
  }

  const code = generateRecoveryCode();
  const requestId = crypto.randomUUID();
  let digest: string;
  try { digest = await recoveryCodeDigest(requestId, code); }
  catch { return response({ error: "Service unavailable" }, 503); }
  const expires = new Date(Date.now() + 10 * 60_000).toISOString();
  // Fail closed: scope='regular' is only a provisional holding state. It is NOT
  // evidence that the user is regular, and must never authorize factor deletion.
  const { error: insertError } = await admin.from("mfa_recovery_requests").insert({
    id: requestId, requester_id: user.id, scope: "regular", status: "pending_email",
    token_hash: digest, token_expires_at: expires,
  });
  if (insertError) return response({ error: "Unable to create recovery request" }, 409);
  try {
    await sendRecoveryEmail({ recipient: user.email, code, expiresInMinutes: 10 });
  } catch {
    await admin.from("mfa_recovery_requests").update({
      status: "failed", token_hash: null, token_expires_at: null,
    }).eq("id", requestId).eq("status", "pending_email");
    await admin.from("mfa_recovery_audit").insert({
      request_id: requestId, actor_id: user.id, event: "email_delivery_failed",
    });
    return response({ error: "Unable to send recovery email" }, 503);
  }
  await admin.from("mfa_recovery_audit").insert({
    request_id: requestId, actor_id: user.id, event: "email_challenge_sent",
  });
  return response({ request_id: requestId, status: "pending_email", expires_at: expires }, 202);
});
