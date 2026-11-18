import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "content-type": "application/json", "cache-control": "no-store" },
});

Deno.serve(async (req) => {
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  const authorization = req.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) return reply({ error: "Unauthorized" }, 401);
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !service) return reply({ error: "Service unavailable" }, 503);

  const userClient = createClient(url, anon);
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: auth, error: authError } = await userClient.auth.getUser(authorization.slice(7));
  if (authError || !auth.user) return reply({ error: "Unauthorized" }, 401);

  let input: { request_id?: unknown };
  try { input = await req.json(); } catch { return reply({ error: "Invalid request" }, 400); }
  if (typeof input.request_id !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.request_id)) {
    return reply({ error: "Invalid request" }, 400);
  }

  const { data: recovery, error } = await admin.from("mfa_recovery_requests")
    .select("id,status,created_at,token_expires_at,email_verified_at,approved_at,completed_at")
    .eq("id", input.request_id).eq("requester_id", auth.user.id).maybeSingle();
  if (error) return reply({ error: "Service unavailable" }, 503);
  if (!recovery) return reply({ error: "Request not found" }, 404);
  // Do not expose hashes, approver identities, audit details, tenant metadata,
  // or any other user's recovery request.
  return reply({ recovery });
});
