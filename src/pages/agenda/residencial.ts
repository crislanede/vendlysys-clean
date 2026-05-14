import type { Servico } from "./types";

export function obterPercentualResidencialAgenda(
  servicosSelecionados: Servico[],
  percentualEmpresa: number,
) {
  const percentualDoServico = servicosSelecionados
    .map((item) => Number(item.percentual_residencial || 0))
    .find((percentual) => percentual > 0);

  return Number(percentualDoServico ?? percentualEmpresa ?? 0);
}

export function calcularValorResidencialAgenda(
  valorBase: number,
  atendimentoResidencial: boolean,
  percentualResidencial: number,
) {
  if (!atendimentoResidencial) {
    return Number(valorBase.toFixed(2));
  }

  return Number(
    (valorBase + (valorBase * percentualResidencial) / 100).toFixed(2),
  );
}