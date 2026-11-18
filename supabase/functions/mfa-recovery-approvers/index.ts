import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

const url = Deno.env.get("SUPABASE_URL")!;
const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const bearer = req.headers.get("authorization") || "";
  if (!bearer.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
  const jwt = bearer.slice(7);
  const client = createClient(url, anon);
  const admin = createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: userData, error: userError } = await client.auth.getUser(jwt);
  if (userError || !userData.user?.email) return json({ error: "Unauthorized" }, 401);
  const requester = userData.user;
  const requesterEmail = requester.email;
  if (!requesterEmail) return json({ error: "Unauthorized" }, 401);
  const { data: claimsData, error: claimsError } = await client.auth.getClaims(jwt);
  if (claimsError || claimsData?.claims?.aal !== "aal2") return json({ error: "MFA AAL2 required" }, 403);
  let input: { action?: string; scope?: string; empresa_id?: string; approver_id?: string };
  try { input = await req.json(); } catch { return json({ error: "Invalid body" }, 400); }
  const scope = input.scope;
  if (scope !== "saas_admin" && scope !== "company_admin") return json({ error: "Invalid scope" }, 400);
  const empresaId = scope === "company_admin" ? input.empresa_id : null;
  if (scope === "company_admin" && (!empresaId || !/^[0-9a-f-]{36}$/i.test(empresaId))) return json({ error: "Invalid company" }, 400);

  const isSaasAdmin = async (userId: string, email: string) => {
    const { data: authUser, error: authError } = await admin.auth.admin.getUserById(userId);
    if (authError || authUser.user?.email?.toLowerCase() !== email.toLowerCase()) return false;
    const { data } = await admin.from("usuarios").select("id").ilike("email", email).in("perfil", ["super_admin", "admin_saas"]).eq("ativo", true).limit(1);
    return !!data?.length && userId.length > 0;
  };
  const isCompanyAdmin = async (userId: string) => {
    const { data: memberships } = await admin.from("usuarios_empresas").select("id").eq("user_id", userId).eq("empresa_id", empresaId).eq("ativo", true).in("perfil", ["admin", "administrador"]);
    const { data: owner } = await admin.from("empresas").select("id").eq("id", empresaId).eq("user_id", userId).limit(1);
    return !!memberships?.length || !!owner?.length;
  };
  const authorized = scope === "saas_admin" ? await isSaasAdmin(requester.id, requesterEmail) : await isCompanyAdmin(requester.id);
  if (!authorized) return json({ error: "Forbidden" }, 403);

  if (input.action === "candidates") {
    if (scope === "company_admin") {
      const { data: memberships, error: membershipError } = await admin.from("usuarios_empresas")
        .select("user_id").eq("empresa_id", empresaId!).eq("ativo", true)
        .in("perfil", ["admin", "administrador"]).limit(200);
      if (membershipError) return json({ error: "Unable to list candidates" }, 500);
      const { data: company, error: companyError } = await admin.from("empresas")
        .select("user_id").eq("id", empresaId!).single();
      if (companyError) return json({ error: "Unable to list candidates" }, 500);
      const ids = [...new Set([...(memberships || []).map((m) => m.user_id), company?.user_id].filter((id): id is string => !!id && id !== requester.id))];
      const candidates: { id: string; name: string; email: string }[] = [];
      for (const id of ids) {
        const { data, error } = await admin.auth.admin.getUserById(id);
        if (!error && data.user?.email && await isCompanyAdmin(id)) {
          candidates.push({ id, name: data.user.email, email: data.user.email });
        }
      }
      return json({ candidates });
    }
    const { data: records, error: recordsError } = await admin.from("usuarios")
      .select("nome,email").in("perfil", ["super_admin", "admin_saas"]).eq("ativo", true).limit(100);
    if (recordsError) return json({ error: "Unable to list candidates" }, 500);
    const authUsers: { id: string; email?: string }[] = [];
    for (let page = 1; page <= 20; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) return json({ error: "Unable to list candidates" }, 500);
      authUsers.push(...data.users);
      if (data.users.length < 1000) break;
      if (page === 20) return json({ error: "Candidate directory too large" }, 503);
    }
    const candidates = (records || []).flatMap((record) => {
      const match = authUsers.find((user) => user.email?.toLowerCase() === record.email?.toLowerCase() && user.id !== requester.id);
      return match ? [{ id: match.id, name: record.nome || "Administrador", email: record.email }] : [];
    });
    return json({ candidates });
  }
  if (input.action === "list") {
    let query = admin.from("mfa_recovery_approvers").select("id,approver_id,scope,empresa_id,created_at").eq("requester_id", requester.id).eq("scope", scope);
    query = scope === "saas_admin" ? query.is("empresa_id", null) : query.eq("empresa_id", empresaId!);
    const { data, error } = await query;
    return error ? json({ error: "Unable to list approvers" }, 500) : json({ approvers: data });
  }
  if (input.action !== "add" && input.action !== "remove") return json({ error: "Invalid action" }, 400);
  if (!input.approver_id || !/^[0-9a-f-]{36}$/i.test(input.approver_id) || input.approver_id === requester.id) return json({ error: "Invalid approver" }, 400);

  if (input.action === "remove") {
    let query = admin.from("mfa_recovery_approvers").delete().eq("requester_id", requester.id).eq("approver_id", input.approver_id).eq("scope", scope);
    query = scope === "saas_admin" ? query.is("empresa_id", null) : query.eq("empresa_id", empresaId!);
    const { data: removed, error } = await query.select("id");
    if (error) return json({ error: "Unable to remove approver" }, 500);
    if (removed?.length) await admin.from("mfa_recovery_audit").insert({ actor_id: requester.id, event: "approver_removed", details: { scope, empresa_id: empresaId, approver_id: input.approver_id } });
    return json({ ok: true });
  }

  const { data: targetData, error: targetError } = await admin.auth.admin.getUserById(input.approver_id);
  if (targetError || !targetData.user?.email) return json({ error: "Approver not found" }, 404);
  const targetAllowed = scope === "saas_admin" ? await isSaasAdmin(input.approver_id, targetData.user.email) : await isCompanyAdmin(input.approver_id);
  if (!targetAllowed) return json({ error: "Approver must be an authorized administrator in the same scope" }, 403);
  let countQuery = admin.from("mfa_recovery_approvers").select("id", { count: "exact", head: true }).eq("requester_id", requester.id).eq("scope", scope);
  countQuery = scope === "saas_admin" ? countQuery.is("empresa_id", null) : countQuery.eq("empresa_id", empresaId!);
  const { count } = await countQuery;
  if ((count ?? 0) >= 2) return json({ error: "Maximum of two approvers" }, 409);
  const { error } = await admin.from("mfa_recovery_approvers").insert({ requester_id: requester.id, approver_id: input.approver_id, scope, empresa_id: empresaId });
  if (error) return json({ error: "Unable to add approver" }, 409);
  await admin.from("mfa_recovery_audit").insert({ actor_id: requester.id, event: "approver_added", details: { scope, empresa_id: empresaId, approver_id: input.approver_id } });
  return json({ ok: true }, 201);
});
