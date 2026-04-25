import { supabase } from "./supabase";

export type TipoMensagemWhatsapp =
  | "confirmacao_agendamento"
  | "cancelamento_agendamento"
  | "lembrete_agendamento"
  | "agradecimento_atendimento"
  | "pdf_anamnese"
  | "novo_agendamento_cliente"
  | "reagendamento_agendamento"
  | "campanha";

export type DadosMensagemWhatsapp = {
  empresa?: string | null;
  cliente?: string | null;
  profissional?: string | null;
  servico?: string | null;
  data?: string | null;
  horario?: string | null;
  novaData?: string | null;
  novoHorario?: string | null;
  valor?: string | number | null;
  linkMeuEspaco?: string | null;
  pdfUrl?: string | null;
  telefoneEmpresa?: string | null;

  titulo?: string | null;
  descricao?: string | null; // 👈 ADICIONA AQUI
  mensagem?: string | null;
};

type ConfigMensagemWhatsapp = {
  id?: string;
  tipo: TipoMensagemWhatsapp;
  titulo?: string | null;
  mensagem?: string | null;
  ativo?: boolean | null;
};

function somenteNumeros(valor?: string | null) {
  return String(valor || "").replace(/\D/g, "");
}

export function normalizarTelefoneWhatsapp(telefone?: string | null) {
  const numeroOriginal = somenteNumeros(telefone);

  if (!numeroOriginal) return "";

  if (numeroOriginal.startsWith("55")) return numeroOriginal;

  if (numeroOriginal.length === 10 || numeroOriginal.length === 11) {
    return `55${numeroOriginal}`;
  }

  return numeroOriginal;
}

export function abrirWhatsapp(telefone?: string | null, mensagem?: string | null) {
  const numero = normalizarTelefoneWhatsapp(telefone);
  const texto = encodeURIComponent(mensagem || "");

  if (!numero) {
    window.open(`https://wa.me/?text=${texto}`, "_blank");
    return;
  }

  window.open(`https://wa.me/${numero}?text=${texto}`, "_blank");
}

export function montarLinkMeuEspaco(token?: string | null) {
  if (!token) return "";

  return `${window.location.origin}/meu-espaco?token=${token}`;
}

function formatarData(data?: string | null) {
  if (!data) return "";

  const partes = String(data).split("-");

  if (partes.length !== 3) return String(data);

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function formatarValor(valor?: string | number | null) {
  if (valor === null || valor === undefined || valor === "") return "";

  const numero = Number(valor);

  if (Number.isNaN(numero)) return String(valor);

  return numero.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function aplicarVariaveis(template: string, dados: DadosMensagemWhatsapp) {
  const variaveis: Record<string, string> = {
    empresa: dados.empresa || "nosso espaço",
    cliente: dados.cliente || "cliente",
    profissional: dados.profissional || "",
    servico: dados.servico || "",
    data: formatarData(dados.data),
    horario: dados.horario || "",
    nova_data: formatarData(dados.novaData),
    novo_horario: dados.novoHorario || "",
    valor: formatarValor(dados.valor),
    link_meu_espaco: dados.linkMeuEspaco || "",
    pdf_url: dados.pdfUrl || "",
    telefone_empresa: dados.telefoneEmpresa || "",
    titulo: dados.titulo || "",
    mensagem: dados.mensagem || "",
  };

  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, chave) => {
    return variaveis[chave] ?? "";
  });
}

export const mensagensWhatsappPadrao: Record<TipoMensagemWhatsapp, string> = {
  confirmacao_agendamento:
    "Olá, {{cliente}}! 💜\n\nVocê tem um agendamento em {{empresa}}.\n\n📌 Serviço: {{servico}}\n👩‍💼 Profissional: {{profissional}}\n📅 Data: {{data}}\n⏰ Horário: {{horario}}\n\nPara confirmar ou cancelar sua presença, acesse:\n{{link_meu_espaco}}\n\nAté breve!",

  cancelamento_agendamento:
    "Olá, {{cliente}}! Seu agendamento em {{empresa}} foi cancelado.\n\n📌 Serviço: {{servico}}\n📅 Data: {{data}}\n⏰ Horário: {{horario}}\n\nCaso queira reagendar, acesse:\n{{link_meu_espaco}}",

  lembrete_agendamento:
    "Oi, {{cliente}}! Passando para lembrar do seu agendamento em {{empresa}}. 💜\n\n📌 Serviço: {{servico}}\n👩‍💼 Profissional: {{profissional}}\n📅 Data: {{data}}\n⏰ Horário: {{horario}}\n\nConfirme sua presença pelo link:\n{{link_meu_espaco}}",

  agradecimento_atendimento:
    "Olá, {{cliente}}! 💜\n\nObrigada por realizar seu atendimento em {{empresa}}.\n\nFoi um prazer cuidar de você!\n\nEsperamos te ver novamente em breve. Para acompanhar seus dados, histórico ou agendar um novo horário, acesse:\n{{link_meu_espaco}}",

  pdf_anamnese:
    "Olá, {{cliente}}! 💜\n\nSegue o PDF da sua ficha de anamnese preenchida em {{empresa}}:\n{{pdf_url}}\n\nGuarde esse documento para consulta sempre que precisar.",

  novo_agendamento_cliente:
    "Olá, {{cliente}}! Seu novo agendamento foi solicitado em {{empresa}}. 💜\n\n📌 Serviço: {{servico}}\n👩‍💼 Profissional: {{profissional}}\n📅 Data: {{data}}\n⏰ Horário: {{horario}}\n\nAcompanhe pelo link:\n{{link_meu_espaco}}",

  reagendamento_agendamento:
    "Olá, {{cliente}}! Seu agendamento em {{empresa}} foi reagendado. 💜\n\n📌 Serviço: {{servico}}\n👩‍💼 Profissional: {{profissional}}\n📅 Nova data: {{nova_data}}\n⏰ Novo horário: {{novo_horario}}\n\nAcompanhe pelo link:\n{{link_meu_espaco}}",

  campanha:
    "Olá, {{cliente}}! 💜\n\n{{titulo}}\n\n{{mensagem}}",
};

export function montarMensagemWhatsappLocal(
  tipo: TipoMensagemWhatsapp,
  dados: DadosMensagemWhatsapp
) {
  return aplicarVariaveis(mensagensWhatsappPadrao[tipo], dados);
}

export async function buscarMensagemWhatsapp(tipo: TipoMensagemWhatsapp): Promise<string> {
  const { data, error } = await supabase
    .from("whatsapp_mensagens")
    .select("tipo, mensagem, ativo")
    .eq("tipo", tipo)
    .eq("ativo", true)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn("Erro ao buscar mensagem de WhatsApp:", error);
    return mensagensWhatsappPadrao[tipo];
  }

  const configuracao = data as ConfigMensagemWhatsapp | null;

  return configuracao?.mensagem || mensagensWhatsappPadrao[tipo];
}

export async function montarMensagemWhatsappEditavel(
  tipo: TipoMensagemWhatsapp,
  dados: DadosMensagemWhatsapp
) {
  const template = await buscarMensagemWhatsapp(tipo);

  return aplicarVariaveis(template, dados);
}

export async function enviarWhatsappPorTipo(
  telefone: string | null | undefined,
  tipo: TipoMensagemWhatsapp,
  dados: DadosMensagemWhatsapp
) {
  const mensagem = await montarMensagemWhatsappEditavel(tipo, dados);
  abrirWhatsapp(telefone, mensagem);
}

export async function enviarWhatsapp(
  telefone: string | null | undefined,
  tipo: TipoMensagemWhatsapp,
  dados: DadosMensagemWhatsapp
) {
  return enviarWhatsappPorTipo(telefone, tipo, dados);
}

export function montarMensagemConfirmacaoAgendamento(dados: DadosMensagemWhatsapp) {
  return montarMensagemWhatsappLocal("confirmacao_agendamento", dados);
}

export function montarMensagemLembreteAgendamento(dados: DadosMensagemWhatsapp) {
  return montarMensagemWhatsappLocal("lembrete_agendamento", dados);
}

export function montarMensagemCancelamentoAgendamento(dados: DadosMensagemWhatsapp) {
  return montarMensagemWhatsappLocal("cancelamento_agendamento", dados);
}

export function montarMensagemAgradecimentoAtendimento(dados: DadosMensagemWhatsapp) {
  return montarMensagemWhatsappLocal("agradecimento_atendimento", dados);
}

export function montarMensagemReagendamento(dados: DadosMensagemWhatsapp) {
  return montarMensagemWhatsappLocal("reagendamento_agendamento", dados);
}

export function montarMensagemCampanha(
  clienteOuDados?: string | DadosMensagemWhatsapp | null,
  mensagemCampanha?: string | null
) {
  if (typeof clienteOuDados === "object" && clienteOuDados !== null) {
    return montarMensagemWhatsappLocal("campanha", clienteOuDados);
  }

  return montarMensagemWhatsappLocal("campanha", {
    cliente: clienteOuDados || "",
    mensagem: mensagemCampanha || "",
  });
}

export function montarMensagemPdfAnamnese({
  cliente,
  empresa,
  pdfUrl,
}: {
  cliente: string;
  empresa: string;
  pdfUrl: string;
}) {
  return montarMensagemWhatsappLocal("pdf_anamnese", {
    cliente,
    empresa,
    pdfUrl,
  });
}

export async function salvarMensagemWhatsapp({
  tipo,
  titulo,
  mensagem,
}: {
  tipo: TipoMensagemWhatsapp;
  titulo?: string;
  mensagem: string;
}) {
  const { data: existente } = await supabase
    .from("whatsapp_mensagens")
    .select("id")
    .eq("tipo", tipo)
    .limit(1)
    .maybeSingle();

  if (existente?.id) {
    const { error } = await supabase
      .from("whatsapp_mensagens")
      .update({
        titulo: titulo || tipo,
        mensagem,
        ativo: true,
        atualizado_em: new Date().toISOString(),
      })
      .eq("id", existente.id);

    if (error) throw error;

    return;
  }

  const { error } = await supabase.from("whatsapp_mensagens").insert({
    tipo,
    titulo: titulo || tipo,
    mensagem,
    ativo: true,
  });

  if (error) throw error;
}

export async function criarMensagensWhatsappPadraoSeNaoExistirem() {
  const registros = Object.entries(mensagensWhatsappPadrao).map(
    ([tipo, mensagem]) => ({
      tipo,
      titulo: tipo,
      mensagem,
      ativo: true,
    })
  );

  for (const registro of registros) {
    const { data } = await supabase
      .from("whatsapp_mensagens")
      .select("id")
      .eq("tipo", registro.tipo)
      .limit(1)
      .maybeSingle();

    if (!data?.id) {
      const { error } = await supabase.from("whatsapp_mensagens").insert(registro);

      if (error) {
        console.warn("Erro ao criar mensagem padrão:", registro.tipo, error);
      }
    }
  }
}

/* Compatibilidade com nomes antigos usados no sistema */
export const montarMensagemWhatsapp = montarMensagemWhatsappLocal;
export const montarMensagemCancelamento = montarMensagemCancelamentoAgendamento;
export const montarMensagemConfirmacao = montarMensagemConfirmacaoAgendamento;
export const montarMensagemLembrete = montarMensagemLembreteAgendamento;
export const montarMensagemAgradecimento = montarMensagemAgradecimentoAtendimento;
