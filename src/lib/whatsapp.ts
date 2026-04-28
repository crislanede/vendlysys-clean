// 🔢 TIPOS DE MENSAGEM
export type TipoMensagemWhatsapp =
  | "confirmacao_agendamento"
  | "lembrete_agendamento"
  | "cancelamento_agendamento"
  | "agradecimento_atendimento"
  | "pdf_anamnese"
  | "novo_agendamento_cliente"
  | "reagendamento_agendamento"
  | "campanha";

// 📦 MENSAGENS PADRÃO
export const mensagensWhatsappPadrao: Record<
  TipoMensagemWhatsapp,
  string
> = {
  confirmacao_agendamento:
    "Olá, {{cliente}}! Seu agendamento na {{empresa}} está marcado para {{data}} às {{horario}} com {{profissional}}. Confirme pelo link: {{link_meu_espaco}}",

  lembrete_agendamento:
    "Olá, {{cliente}}! Passando para lembrar do seu atendimento na {{empresa}} amanhã às {{horario}}. Esperamos você!",

  cancelamento_agendamento:
    "Olá, {{cliente}}! Seu agendamento de {{servico}} em {{data}} às {{horario}} foi cancelado.",

  agradecimento_atendimento:
    "Olá, {{cliente}}! Obrigada pela preferência. Foi um prazer atender você na {{empresa}} 💖",

  pdf_anamnese:
    "Olá, {{cliente}}! Segue o link do PDF da sua anamnese: {{pdf_url}}",

  novo_agendamento_cliente:
    "Olá! Recebemos uma nova solicitação de agendamento de {{cliente}} para {{servico}}.",

  reagendamento_agendamento:
    "Olá, {{cliente}}! Seu agendamento foi reagendado para {{nova_data}} às {{novo_horario}}.",

  campanha:
    "Olá, {{cliente}}! Temos uma novidade especial para você: {{mensagem}}",
};

// 📱 NORMALIZA TELEFONE
export function normalizarTelefoneWhatsapp(telefone: string) {
  const numeroLimpo = String(telefone || "").replace(/\D/g, "");

  if (!numeroLimpo) return "";

  if (numeroLimpo.startsWith("55")) {
    return numeroLimpo;
  }

  return `55${numeroLimpo}`;
}

// 🚀 ABRIR WHATSAPP
export function abrirWhatsapp(telefone: string, mensagem: string) {
  const numeroFinal = normalizarTelefoneWhatsapp(telefone);
  const texto = encodeURIComponent(mensagem || "");

  if (!numeroFinal) {
    alert("Telefone inválido para WhatsApp.");
    return;
  }

  window.open(`https://wa.me/${numeroFinal}?text=${texto}`, "_blank");
}

// 🔗 LINK MEU ESPAÇO
export function montarLinkMeuEspaco(token?: string | null) {
  const baseUrl = window.location.origin;
  return token
    ? `${baseUrl}/meu-espaco?token=${token}`
    : `${baseUrl}/meu-espaco`;
}

// 📦 TIPAGEM FLEXÍVEL
type DadosMensagem = {
  cliente?: string | null;
  empresa?: string | null;
  profissional?: string | null;
  servico?: string | null;
  data?: string | null;
  horario?: string | null;
  valor?: number | string | null;
  token?: string | null;

  link_meu_espaco?: string | null;
  pdf_url?: string | null;

  linkMeuEspaco?: string | null;
  pdfUrl?: string | null;

  titulo?: string | null;
  descricao?: string | null;
  mensagem?: string | null;
};

// 📅 FORMATADORES
function formatarData(data?: string | null) {
  if (!data) return "";
  try {
    return new Date(data + "T00:00:00").toLocaleDateString("pt-BR");
  } catch {
    return data;
  }
}

function formatarValor(valor?: number | string | null) {
  const numero = Number(valor || 0);

  return numero.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

// 🔥 MOTOR DE TEMPLATE
export function aplicarVariaveisWhatsapp(
  modelo: string,
  dados: DadosMensagem
) {
  const linkMeuEspaco =
    dados.link_meu_espaco ||
    dados.linkMeuEspaco ||
    montarLinkMeuEspaco(dados.token);

  const pdfUrl = dados.pdf_url || dados.pdfUrl || "";

  return String(modelo || "")
    .replaceAll("{{cliente}}", dados.cliente || "")
    .replaceAll("{{empresa}}", dados.empresa || "VendlySys")
    .replaceAll("{{profissional}}", dados.profissional || "")
    .replaceAll("{{servico}}", dados.servico || "")
    .replaceAll("{{data}}", formatarData(dados.data))
    .replaceAll("{{horario}}", dados.horario || "")
    .replaceAll("{{hora}}", dados.horario || "")
    .replaceAll("{{valor}}", formatarValor(dados.valor))
    .replaceAll("{{link_meu_espaco}}", linkMeuEspaco)
    .replaceAll("{{pdf_url}}", pdfUrl)
    .replaceAll("{{titulo}}", dados.titulo || "")
    .replaceAll("{{descricao}}", dados.descricao || "")
    .replaceAll("{{mensagem}}", dados.mensagem || "");
}

// 💾 SALVAR MENSAGEM PERSONALIZADA
export async function salvarMensagemWhatsapp({
  tipo,
  mensagem,
  empresaId,
}: {
  tipo: TipoMensagemWhatsapp;
  mensagem: string;
  empresaId: string;
}) {
  const { supabase } = await import("./supabase");

  const { error } = await supabase
    .from("mensagens_whatsapp")
    .upsert({
      tipo,
      mensagem,
      empresa_id: empresaId,
    });

  if (error) {
    console.error(error);
    throw error;
  }
}

// 📩 HELPERS PRONTOS (compatibilidade com telas antigas)

export function montarMensagemConfirmacao(dados: DadosMensagem) {
  return aplicarVariaveisWhatsapp(
    mensagensWhatsappPadrao.confirmacao_agendamento,
    dados
  );
}

export function montarMensagemLembreteAgendamento(
  dados: DadosMensagem
) {
  return aplicarVariaveisWhatsapp(
    mensagensWhatsappPadrao.lembrete_agendamento,
    dados
  );
}

export function montarMensagemCancelamento(dados: DadosMensagem) {
  return aplicarVariaveisWhatsapp(
    mensagensWhatsappPadrao.cancelamento_agendamento,
    dados
  );
}

export function montarMensagemAgradecimento(dados: DadosMensagem) {
  return aplicarVariaveisWhatsapp(
    mensagensWhatsappPadrao.agradecimento_atendimento,
    dados
  );
}

export function montarMensagemPdfAnamnese(dados: DadosMensagem) {
  return aplicarVariaveisWhatsapp(
    mensagensWhatsappPadrao.pdf_anamnese,
    dados
  );
}

export function montarMensagemCampanha(dados: DadosMensagem) {
  return aplicarVariaveisWhatsapp(
    mensagensWhatsappPadrao.campanha,
    dados
  );
}