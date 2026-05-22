import SecondaryButton from "../../../components/ui/SecondaryButton";
import PrimaryButton from "../../../components/ui/PrimaryButton";
import type { Agendamento, Servico } from "../types";

type Props = {
  aberto: boolean;
  agendamento: Agendamento | null;
  dataReagendamento: string;
  horaReagendamento: string;
  horarios: string[];
  minData?: string;
  loading: boolean;

  servicos: Servico[];
  servicoReagendamento: string;
  servicosExtrasReagendamento: string[];
  valoresServicosReagendamento: Record<string, number>;
  valorReagendamentoManual: string;
  atendimentoResidencialReagendamento: boolean;
  percentualResidencialReagendamento: number;
  valorBaseReagendamento: number;
  valorFinalReagendamento: number;
  localAtendimento?: string;

  onChangeData: (value: string) => void;
  onChangeHora: (value: string) => void;
  onChangeServico: (value: string) => void;
  onChangeServicosExtras: (value: string[]) => void;
  onChangeValorManual: (value: string) => void;
  onChangeValorServicoReagendamento: (nomeServico: string, valor: number) => void;
  onChangeAtendimentoResidencial: (value: boolean) => void;
  onFechar: () => void;
  onSalvar: () => void;
};

export default function ModalReagendamento({
  aberto,
  agendamento,
  dataReagendamento,
  horaReagendamento,
  horarios,
  minData,
  loading,

  servicos,
  servicoReagendamento,
  servicosExtrasReagendamento,
  valoresServicosReagendamento,
  atendimentoResidencialReagendamento,
  percentualResidencialReagendamento,
  valorBaseReagendamento,
  valorFinalReagendamento,
  localAtendimento,

  onChangeData,
  onChangeHora,
  onChangeServico,
  onChangeServicosExtras,
  onChangeValorServicoReagendamento,
  onChangeAtendimentoResidencial,
  onFechar,
  onSalvar,
}: Props) {
  if (!aberto || !agendamento) return null;

  function obterValorServicoReagendamentoModal(nomeServico: string) {
    const valorEditado = valoresServicosReagendamento[nomeServico];

    if (valorEditado !== undefined && Number.isFinite(Number(valorEditado))) {
      return Number(valorEditado);
    }

    const servicoEncontrado = servicos.find((item) => item.nome === nomeServico);

    return Number(servicoEncontrado?.preco ?? servicoEncontrado?.valor ?? 0);
  }

  const nomesServicosSelecionados = [
    servicoReagendamento,
    ...servicosExtrasReagendamento,
  ].filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-auto rounded-[28px] bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-orange-600">
              Reagendamento
            </p>
            <h2 className="text-2xl font-bold text-slate-900">
              Reagendar atendimento
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Altere data, horário e serviços incluídos neste atendimento.
            </p>
          </div>

          <button
            type="button"
            onClick={onFechar}
            className="rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-600"
          >
            Fechar
          </button>
        </div>

        <div className="space-y-1 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
          <p>
            <strong>Cliente:</strong> {agendamento.cliente}
          </p>
          <p>
            <strong>Serviço atual:</strong> {agendamento.servico}
          </p>
          <p>
            <strong>Profissional:</strong>{" "}
            {agendamento.profissional || "Não informado"}
          </p>
          <p>
            <strong>Atual:</strong> {agendamento.data} às {agendamento.horario}
          </p>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-bold text-slate-700">
              Nova data
            </label>
            <input
              type="date"
              value={dataReagendamento}
              min={minData}
              onChange={(e) => onChangeData(e.target.value)}
              className="mt-2 h-[44px] w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-orange-300"
            />
          </div>

          <div>
            <label className="text-sm font-bold text-slate-700">
              Novo horário
            </label>
            <select
              value={horaReagendamento}
              onChange={(e) => onChangeHora(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-orange-300"
            >
              <option value="">Selecione</option>
              {horarios.map((horarioOpcao) => (
                <option key={horarioOpcao} value={horarioOpcao}>
                  {horarioOpcao}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5 grid gap-4">
          <div>
            <label className="text-sm font-bold text-slate-700">
              Serviço principal
            </label>
            <select
              value={servicoReagendamento}
              onChange={(e) => onChangeServico(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-orange-300"
            >
              <option value="">Selecione o serviço</option>
              {servicos.map((item) => (
                <option key={item.id} value={item.nome}>
                  {item.nome}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {servicosExtrasReagendamento.map((servicoExtra, index) => (
            <div key={`reagendamento-extra-${index}`} className="flex gap-2">
              <select
                value={servicoExtra}
                onChange={(e) => {
                  const novos = [...servicosExtrasReagendamento];
                  novos[index] = e.target.value;
                  onChangeServicosExtras(novos);
                }}
                className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-orange-300"
              >
                <option value="">Selecione outro serviço</option>
                {servicos.map((item) => (
                  <option key={item.id} value={item.nome}>
                    {item.nome}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() =>
                  onChangeServicosExtras(
                    servicosExtrasReagendamento.filter(
                      (_, itemIndex) => itemIndex !== index,
                    ),
                  )
                }
                className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600"
              >
                Remover
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={() =>
              onChangeServicosExtras([...servicosExtrasReagendamento, ""])
            }
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700"
          >
            + Adicionar outro serviço
          </button>
        </div>

        {nomesServicosSelecionados.length > 0 && (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-3 text-sm font-bold text-slate-900">
              Valores por serviço
            </div>

            <div className="space-y-3">
              {nomesServicosSelecionados.map((nomeServico) => (
                <div
                  key={nomeServico}
                  className="flex flex-col gap-2 rounded-2xl bg-slate-50 p-3 md:flex-row md:items-center"
                >
                  <div className="flex-1 text-sm font-bold text-slate-700">
                    {nomeServico}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-500">
                      R$
                    </span>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={obterValorServicoReagendamentoModal(nomeServico)}
                      onChange={(e) =>
                        onChangeValorServicoReagendamento(
                          nomeServico,
                          Number(e.target.value || 0),
                        )
                      }
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-right text-sm font-bold text-slate-900 outline-none focus:border-orange-300 md:w-40"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {localAtendimento && (
          <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
            <p className="font-black">Local do atendimento</p>
            <p className="mt-1 font-semibold">{localAtendimento}</p>
          </div>
        )}

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <label className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
            <input
              type="checkbox"
              checked={atendimentoResidencialReagendamento}
              onChange={(e) =>
                onChangeAtendimentoResidencial(e.target.checked)
              }
            />
            Atendimento residencial (+{percentualResidencialReagendamento || 0}%)
          </label>

          {atendimentoResidencialReagendamento &&
            Number(percentualResidencialReagendamento || 0) <= 0 && (
              <div className="md:col-span-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-800">
                O percentual residencial está zerado nas configurações. Ajuste em Configurações para aplicar acréscimo automático.
              </div>
            )}

          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900">
            Serviços: {valorBaseReagendamento.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
            <br />
            Total: {valorFinalReagendamento.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <SecondaryButton onClick={onFechar}>Cancelar</SecondaryButton>
          <PrimaryButton onClick={onSalvar}>
            {loading ? "Salvando..." : "Salvar reagendamento"}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
