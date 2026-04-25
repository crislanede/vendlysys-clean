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
    return texto === "true";
  }

  return texto !== "não" && texto !== "nao" && texto !== "false";
}

export async function buscarAlertasAnamneseCliente(cliente: {
  id?: string | null;
  nome?: string | null;
}): Promise<AlertaAnamneseItem[]> {
  if (!cliente?.id && !cliente?.nome) {
    return [];
  }

  let query = supabase
    .from("vw_anamnese_alertas")
    .select("*")
    .order("preenchido_em", { ascending: false });

  query = cliente.id
    ? query.eq("cliente_id", cliente.id)
    : query.eq("cliente_nome", cliente.nome);

  const { data, error } = await query;

  if (error) {
    console.error("Erro ao carregar alertas da anamnese:", error);
    return [];
  }

  const lista = (data || []) as any[];

  if (lista.length === 0) {
    return [];
  }

  const dataMaisRecente = lista[0]?.preenchido_em;

  const ultimaAnamnese = lista.filter(
    (item) => item.preenchido_em === dataMaisRecente
  );

  return ultimaAnamnese
    .filter((item) => respostaEhCritica(item.tipo, item.resposta))
    .map((item) => ({
      label: item.label,
      resposta: item.resposta,
      preenchido_em: item.preenchido_em,
    }));
}