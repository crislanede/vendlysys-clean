import { createClient } from "npm:@supabase/supabase-js@2.103.0";

type Alerta = {
  id: string;
  destinatario: string;
  tentativa: number;
};

async function segredosIguais(a: string, b: string) {
  const encoder = new TextEncoder();
  const [digestA, digestB] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(a)),
    crypto.subtle.digest("SHA-256", encoder.encode(b)),
  ]);
  const left = new Uint8Array(digestA);
  const right = new Uint8Array(digestB);
  let diferente = 0;
  for (let i = 0; i < left.length; i += 1) diferente |= left[i] ^ right[i];
  return diferente === 0;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response(null, { status: 405, headers: { Allow: "POST" } });

  const segredo = Deno.env.get("AGENDA_ALERTAS_WORKER_SECRET");
  const fornecido = request.headers.get("x-agenda-alertas-secret");
  if (!segredo || !fornecido || !(await segredosIguais(segredo, fornecido))) {
    return new Response(null, { status: 401 });
  }

  const chave = Deno.env.get("RESEND_API_KEY");
  const remetente = Deno.env.get("AGENDA_ALERTAS_FROM_EMAIL");
  const origem = Deno.env.get("AGENDA_ALERTAS_WEB_URL");
  const urlSupabase = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!chave || !remetente || !origem || !urlSupabase || !serviceRole) {
    return Response.json({ erro: "Envio de alertas ainda indisponível." }, { status: 503 });
  }

  let agenda: URL;
  try {
    agenda = new URL("/agenda", origem);
    if (agenda.protocol !== "https:" || agenda.username || agenda.password) throw new Error();
  } catch {
    return Response.json({ erro: "Endereço interno da Agenda inválido." }, { status: 503 });
  }

  const banco = createClient(urlSupabase, serviceRole, { auth: { persistSession: false } });
  const { data, error } = await banco.rpc("agendamento_publico_alerta_buscar");
  if (error) return Response.json({ erro: "Não foi possível consultar a fila." }, { status: 500 });

  let enviados = 0;
  let respostasPendentes = 0;
  for (const alerta of (data || []) as Alerta[]) {
    let enviado = false;
    let repetir = true;
    try {
      const resultado = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${chave}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `agenda-solicitacao/${alerta.id}`,
        },
        body: JSON.stringify({
          from: remetente,
          to: [alerta.destinatario],
          subject: "Nova solicitação na Agenda do VendlySys",
          text: `Chegou uma solicitação de agendamento. Abra sua Agenda para consultar e responder ao pedido:\n${agenda.href}`,
        }),
        signal: AbortSignal.timeout(6000),
      });
      enviado = resultado.ok;
      repetir = resultado.status === 429 || resultado.status === 409 || resultado.status >= 500;
      await resultado.body?.cancel();
    } catch {
      repetir = true;
    }
    const { error: erroConclusao } = await banco.rpc("agendamento_publico_alerta_concluir", {
      p_id: alerta.id,
      p_tentativa: alerta.tentativa,
      p_enviado: enviado,
      p_repetir: repetir,
    });
    if (enviado) enviados += 1;
    if (erroConclusao) respostasPendentes += 1;
  }

  return Response.json({ enviados, respostasPendentes }, { status: respostasPendentes ? 500 : 200 });
});
