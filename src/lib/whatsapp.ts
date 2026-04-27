export function normalizarTelefoneWhatsapp(telefone: string) {
  const numeroLimpo = String(telefone || "").replace(/\D/g, "");

  if (!numeroLimpo) return "";

  if (numeroLimpo.startsWith("55")) {
    return numeroLimpo;
  }

  return `55${numeroLimpo}`;
}

export function abrirWhatsapp(telefone: string, mensagem: string) {
  const numeroFinal = normalizarTelefoneWhatsapp(telefone);
  const texto = encodeURIComponent(mensagem || "");

  if (!numeroFinal) {
    alert("Telefone inválido para WhatsApp.");
    return;
  }

  window.open(`https://wa.me/${numeroFinal}?text=${texto}`, "_blank");
}

export function montarLinkMeuEspaco(token?: string | null) {
  const baseUrl = window.location.origin;
  return token
    ? `${baseUrl}/meu-espaco?token=${token}`
    : `${baseUrl}/meu-espaco`;
}

/**
 * 🔥 Compatível com versão antiga e nova
 */
type DadosMensagem = {
  cliente?: string | null;
  empresa?: string | null;
  profissional?: string | null;
  servico?: string | null;
  data?: string | null;
  horario?: string | null;
  valor?: number | string | null;
  token?: string | null;

  // NOVO PADRÃO
  link_meu_espaco?: string | null;
  pdf_url?: string | null;

  // LEGADO (evita quebrar telas antigas)
  linkMeuEspaco?: string | null;
  pdfUrl?: string | null;

  titulo?: string | null;
  descricao?: string | null;
  mensagem?: string | null;
};

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

/**
 * 🔥 MOTOR PRINCIPAL DE TEMPLATE
 */
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

/**
 * 🔹 Mensagens prontas (fallback)
 */
export function montarMensagemAgradecimento(dados: DadosMensagem) {
  return aplicarVariaveisWhatsapp(
    "Olá, {{cliente}}! Obrigada pela preferência. Foi um prazer atender você na {{empresa}} 💖\n\nAcesse seu espaço: {{link_meu_espaco}}",
    dados
  );
}

export function montarMensagemPdfAnamnese(dados: DadosMensagem) {
  return aplicarVariaveisWhatsapp(
    "Olá, {{cliente}}! Segue o PDF da sua anamnese da {{empresa}}:\n{{pdf_url}}",
    dados
  );
}

export function montarMensagemCampanha(dados: DadosMensagem) {
  return aplicarVariaveisWhatsapp(
    "{{titulo}}\n\nOlá, {{cliente}}!\n\n{{mensagem}}\n\n{{descricao}}",
    dados
  );
}