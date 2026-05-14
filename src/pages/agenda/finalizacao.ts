import type {
  Agendamento,
  Servico,
  Profissional,
  PacoteDisponivel,
} from "./types";

export type FinalizacaoPayload = {
  agendamento: Agendamento;
  servicosSelecionados: Servico[];
  profissional?: Profissional | null;
  valorPago?: number;
  formaPagamento?: string;
  observacoes?: string;
  pacotesDisponiveis?: PacoteDisponivel[];
};

export const calcularValorFinal = (
  servicos: Servico[],
  valorManual?: number | null
) => {
  if (typeof valorManual === "number") {
    return valorManual;
  }

  return servicos.reduce((total, servico) => {
    const valor = Number(servico.preco || servico.valor || 0);
    return total + valor;
  }, 0);
};

export const calcularComissao = (
  valor: number,
  percentual: number
) => {
  return (valor * percentual) / 100;
};

export const podeFinalizar = (agendamento: Agendamento) => {
  return (
    agendamento.status !== "finalizado" &&
    agendamento.status !== "cancelado"
  );
};

export const gerarPayloadFinanceiro = ({
  agendamento,
  servicosSelecionados,
  valorPago,
  formaPagamento,
}: FinalizacaoPayload) => {
  return {
    agendamento_id: agendamento.id,
    cliente_id: agendamento.cliente_id,
    profissional_id: agendamento.profissional_id,
    valor: calcularValorFinal(servicosSelecionados, valorPago),
    valor_pago: valorPago || 0,
    forma_pagamento: formaPagamento || "",
    status: "pago",
    data_pagamento: new Date().toISOString(),
  };
};

export const gerarPayloadFinalizacao = (
  observacoes?: string
) => {
  return {
    status: "finalizado",
    observacoes_finalizacao: observacoes || "",
    finalizado_em: new Date().toISOString(),
  };
};

export const calcularSaldoPacote = (
  pacote: PacoteDisponivel
) => {
  return pacote.quantidade_total - pacote.quantidade_usada;
};