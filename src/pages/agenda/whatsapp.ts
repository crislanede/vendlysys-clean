import type { Agendamento } from "./types";
import { montarLinkMeuEspaco } from "../../lib/whatsapp";
import { formatarData } from "./utils";

export function montarMensagemConfirmacaoAgenda(
  agendamento: Agendamento,
  token: string,
) {
  const linkMeuEspaco = montarLinkMeuEspaco(token);

  return `Olá, ${agendamento.cliente || "cliente"}! Seu agendamento foi confirmado.

Serviço: ${agendamento.servico || "não informado"}
Data: ${formatarData(agendamento.data)}
Horário: ${agendamento.horario || "não informado"}
Profissional: ${agendamento.profissional || "não informado"}

Para confirmar ou acompanhar seu agendamento, acesse:
${linkMeuEspaco}`;
}

export function montarMensagemCancelamentoAgenda(agendamento: Agendamento) {
  return `Olá, ${agendamento.cliente || "cliente"}! Seu agendamento foi cancelado.

Serviço: ${agendamento.servico || "não informado"}
Data: ${formatarData(agendamento.data)}
Horário: ${agendamento.horario || "não informado"}
Profissional: ${agendamento.profissional || "não informado"}

Caso queira remarcar, entre em contato conosco.`;
}

export function montarMensagemReagendamentoAgenda(
  agendamento: Agendamento,
  token: string,
) {
  const linkMeuEspaco = montarLinkMeuEspaco(token);

  return `Olá, ${agendamento.cliente || "cliente"}! Seu atendimento foi reagendado.

Serviço: ${agendamento.servico || "não informado"}
Data: ${formatarData(agendamento.data)}
Horário: ${agendamento.horario || "não informado"}
Profissional: ${agendamento.profissional || "não informado"}

Para confirmar ou acompanhar seu agendamento, acesse:
${linkMeuEspaco}`;
}

export function montarMensagemFotoAtendimentoAgenda(
  agendamento: Agendamento,
  linkFoto?: string,
) {
  return `Olá, ${agendamento.cliente || "cliente"}! 😊

Seu atendimento foi registrado com sucesso.

Serviço: ${agendamento.servico || "não informado"}
Data: ${formatarData(agendamento.data)} às ${agendamento.horario || ""}

${
  linkFoto
    ? `Veja a foto do atendimento aqui:
${linkFoto}`
    : "As fotos do atendimento já estão registradas no sistema."
}

Obrigada pela preferência! 💜`;
}

export function abrirWhatsappManual(telefone: string, mensagem: string) {
  const texto = encodeURIComponent(mensagem);
  window.location.href = `https://wa.me/${telefone}?text=${texto}`;
}

export function abrirWhatsappManualNovaAba(
  telefone: string,
  mensagem: string,
) {
  const texto = encodeURIComponent(mensagem);
  window.open(`https://wa.me/${telefone}?text=${texto}`, "_blank");
}