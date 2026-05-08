import { supabase } from "./supabase";

export type AlertaAnamneseItem = {
  label: string;
  resposta: string;
  preenchido_em?: string | null;
};

export function respostaEhCritica(tipo: string, valor?: string | null) {
  const texto = String(valor || "").trim().toLowerCase();

  if (!texto) return false;

  if (tipo === "sim_nao_justificativa") {
    return texto.startsWith("sim");
  }

  if (tipo === "checkbox") {
    return texto === "true" || texto === "sim";
  }

  return texto !== "não" && texto !== "nao" && texto !== "false";
}

function limparLabel(valor?: string | null) {
  const texto = String(valor || "").trim();

  if (!texto) return "";

  return texto
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (letra) => letra.toUpperCase());
}

function montarLabelAlerta(item: any) {
  return (
    limparLabel(item.label) ||
    limparLabel(item.pergunta) ||
    limparLabel(item.nome_campo) ||
    limparLabel(item.campo) ||
    limparLabel(item.titulo) ||
    limparLabel(item.nome) ||
    "Informação importante"
  );
}

export async function buscarAlertasAnamneseCliente(cliente: {
  id?: string | null;
  nome?: string | null;
}): Promise<AlertaAnamneseItem[]> {
  if (!cliente?.id && !cliente?.nome) {
    return [];
  }

  let query = supabase.from("vw_anamnese_alertas").select("*");

  query = cliente.id
    ? query.eq("cliente_id", cliente.id)
    : query.eq("cliente_nome", cliente.nome);

  const { data, error } = await query;

  if (error) {
    console.error("Erro ao carregar alertas da anamnese:", error);
    return [];
  }

  const lista = (data || []) as any[];

  return lista
    .filter((item) => respostaEhCritica(item.tipo, item.resposta))
    .map((item) => ({
      label: montarLabelAlerta(item),
      resposta: item.resposta || "-",
      preenchido_em: item.preenchido_em || null,
    }));
}