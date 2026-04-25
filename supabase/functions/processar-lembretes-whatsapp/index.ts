import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function limparTelefone(telefone: string) {
  const numero = (telefone || "").replace(/\D/g, "");

  if (!numero) return "";

  if (numero.startsWith("55")) return numero;

  return `55${numero}`;
}

function formatarDataBR(data: string) {
  return new Date(`${data}T00:00:00`).toLocaleDateString("pt-BR");
}

type AgendamentoWhatsapp = {
  id: string;
  cliente: string;
  profissional: string;
  servico: string;
  data: string;
  horario: string;
  status?: string;
  telefone?: string;
  nome_fantasia?: string;
  data_hora_agendamento: string;
};

function montarMensagemLembrete(item: AgendamentoWhatsapp) {
  const empresa = item.nome_fantasia || "nossa equipe";

  return `Olá, ${item.cliente}! 😊

Passando para lembrar do seu atendimento.

📅 Data: ${formatarDataBR(item.data)}
🕒 Horário: ${item.horario}
💼 Serviço: ${item.servico}
👩‍🔧 Profissional: ${item.profissional}

Aguardamos você.
${empresa}`;
}

Deno.serve(async () => {
  const debug: Record<string, unknown> = {
    etapa: "inicio",
    agora: new Date().toISOString(),
  };

  try {
    const agora = new Date();

    // janela ampla para teste
    const inicio = new Date(agora.getTime() - 24 * 60 * 60 * 1000);
    const fim = new Date(agora.getTime() + 24 * 60 * 60 * 1000);

    debug["janela_teste"] = {
      inicio: inicio.toISOString(),
      fim: fim.toISOString(),
    };

    const { data: agendamentos, error } = await supabase
      .from("vw_agendamentos_whatsapp_pendentes")
      .select("*")
      .gte("data_hora_agendamento", inicio.toISOString())
      .lt("data_hora_agendamento", fim.toISOString());

    if (error) {
      debug["erro"] = error.message;

      return new Response(JSON.stringify(debug, null, 2), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const lista = (agendamentos ?? []) as AgendamentoWhatsapp[];

    debug["total_agendamentos_encontrados"] = lista.length;

    const resultados: Array<Record<string, unknown>> = [];

    for (const item of lista) {
      const telefone = limparTelefone(item.telefone || "");

      if (!telefone) {
        resultados.push({
          id: item.id,
          resultado: "sem_telefone",
        });
        continue;
      }

      const mensagem = montarMensagemLembrete(item);

      try {
        const response = await fetch(
          `https://graph.facebook.com/v18.0/${Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")}/messages`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get("WHATSAPP_TOKEN")}`,
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to: telefone,
              type: "text",
              text: {
                body: mensagem,
              },
            }),
          },
        );

        const result = await response.json();

        resultados.push({
          id: item.id,
          telefone,
          status_http: response.status,
          resposta_meta: result,
        });

        await supabase.from("whatsapp_logs").insert([
          {
            agendamento_id: item.id,
            cliente: item.cliente,
            telefone,
            tipo: "lembrete",
            mensagem,
            status: response.ok ? "enviado" : "erro",
            erro: response.ok ? null : JSON.stringify(result),
            enviado_em: new Date().toISOString(),
          },
        ]);
      } catch (e) {
        resultados.push({
          id: item.id,
          erro: e instanceof Error ? e.message : String(e),
        });
      }
    }

    debug["resultados"] = resultados;

    return new Response(JSON.stringify(debug, null, 2), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify(
        {
          erro: err instanceof Error ? err.message : String(err),
        },
        null,
        2,
      ),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
});