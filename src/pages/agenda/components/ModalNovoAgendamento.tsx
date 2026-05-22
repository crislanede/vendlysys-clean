import type { Dispatch, SetStateAction } from "react";
import PrimaryButton from "../../../components/ui/PrimaryButton";
import SecondaryButton from "../../../components/ui/SecondaryButton";
import AlertaAnamneseAgenda from "../../../components/agenda/AlertaAnamneseAgenda";
import type { AlertaAnamneseItem } from "../../../lib/anamneseAlerta";
import type { Cliente, Profissional, Servico } from "../types";
import { hojeISO, usuarioEhAdmin } from "../utils";

type Props = {
  aberto: boolean;
  clientes: Cliente[];
  servicos: Servico[];
  profissionais: Profissional[];
  servicosExtras: string[];
  horarios: string[];

  cliente: string;
  servico: string;
  profissional: string;
  data: string;
  hora: string;
  observacoes: string;
  aplicarPromocao: boolean;
  valorAgendamentoManual: string;
  atendimentoResidencial: boolean;
  percentualResidencialFormulario: number;
  valorBaseFormulario: number;
  valorFinalFormulario: number;
  localAtendimento?: string;
  alertas: AlertaAnamneseItem[];
  loadingAlerta: boolean;
  confirmou: boolean;
  loadingSalvar: boolean;

  setCliente: Dispatch<SetStateAction<string>>;
  setServico: Dispatch<SetStateAction<string>>;
  setProfissional: Dispatch<SetStateAction<string>>;
  setData: Dispatch<SetStateAction<string>>;
  setHora: Dispatch<SetStateAction<string>>;
  setObservacoes: Dispatch<SetStateAction<string>>;
  setAplicarPromocao: Dispatch<SetStateAction<boolean>>;
  setValorAgendamentoManual: Dispatch<SetStateAction<string>>;
  setAtendimentoResidencial: Dispatch<SetStateAction<boolean>>;
  setServicosExtras: Dispatch<SetStateAction<string[]>>;
  setConfirmou: Dispatch<SetStateAction<boolean>>;

  carregarAlertas: (nomeCliente: string) => void | Promise<void>;
  salvarAgendamento: () => void | Promise<void>;
  limparFormulario: () => void;
  onFechar: () => void;
};

export default function ModalNovoAgendamento({
  aberto,
  clientes,
  servicos,
  profissionais,
  servicosExtras,
  horarios,
  cliente,
  servico,
  profissional,
  data,
  hora,
  observacoes,
  aplicarPromocao,
  valorAgendamentoManual,
  atendimentoResidencial,
  percentualResidencialFormulario,
  valorBaseFormulario,
  valorFinalFormulario,
  localAtendimento,
  alertas,
  loadingAlerta,
  confirmou,
  loadingSalvar,
  setCliente,
  setServico,
  setProfissional,
  setData,
  setHora,
  setObservacoes,
  setAplicarPromocao,
  setValorAgendamentoManual,
  setAtendimentoResidencial,
  setServicosExtras,
  setConfirmou,
  carregarAlertas,
  salvarAgendamento,
  limparFormulario,
  onFechar,
}: Props) {
  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-auto rounded-[28px] bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-orange-600">
              Novo atendimento
            </p>
            <h2 className="text-2xl font-bold text-slate-900">
              Agendar cliente
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Preencha os dados abaixo para inserir um novo horário na
              agenda.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onFechar()}
            className="rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-600"
          >
            Fechar
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <select
            value={cliente}
            onChange={(e) => {
              setCliente(e.target.value);
              void carregarAlertas(e.target.value);
            }}
            className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-orange-300"
          >
            <option value="">Selecione o cliente</option>
            {clientes.map((item) => (
              <option key={item.id} value={item.nome}>
                {item.nome}
              </option>
            ))}
          </select>

          <select
            value={servico}
            onChange={(e) => {
              const nomeServico = e.target.value;
              setServico(nomeServico);
              setAplicarPromocao(false);

              const servicoSelecionado = servicos.find(
                (item) => item.nome === nomeServico,
              );

              if (!servicoSelecionado) {
                setValorAgendamentoManual("");
                return;
              }

              setValorAgendamentoManual(
                String(
                  servicoSelecionado.preco ??
                    servicoSelecionado.valor ??
                    0,
                ),
              );
            }}
            className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-orange-300"
          >
            <option value="">Selecione o serviço</option>
            {servicos.map((item) => (
              <option key={item.id} value={item.nome}>
                {item.nome}
              </option>
            ))}
          </select>

          {servicosExtras.map((servicoExtra, index) => (
            <div key={`servico-extra-${index}`} className="flex gap-2">
              <select
                value={servicoExtra}
                onChange={(e) => {
                  const novos = [...servicosExtras];
                  novos[index] = e.target.value;
                  setServicosExtras(novos);
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
                  setServicosExtras((atuais) =>
                    atuais.filter((_, itemIndex) => itemIndex !== index),
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
            onClick={() => setServicosExtras((atual) => [...atual, ""])}
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700"
          >
            + Adicionar outro serviço
          </button>

          {servico && (
            <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900">
              Valor dos serviços: {valorBaseFormulario.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
              {atendimentoResidencial && (
                <span className="ml-2 text-emerald-700">
                  • Residencial: {valorFinalFormulario.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </span>
              )}
            </div>
          )}

          <label className="flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={aplicarPromocao}
              disabled={!servico}
              onChange={(e) => {
                const ativo = e.target.checked;
                setAplicarPromocao(ativo);

                const servicoSelecionado = servicos.find(
                  (item) => item.nome === servico,
                );

                if (!servicoSelecionado) return;

                if (ativo && servicoSelecionado.preco_promocional) {
                  setValorAgendamentoManual(
                    String(servicoSelecionado.preco_promocional),
                  );
                } else {
                  setValorAgendamentoManual(
                    String(
                      servicoSelecionado.preco ??
                        servicoSelecionado.valor ??
                        0,
                    ),
                  );
                }
              }}
            />
            Aplicar promoção
          </label>

          <input
            type="number"
            min="0"
            step="0.01"
            value={valorAgendamentoManual}
            onChange={(e) => setValorAgendamentoManual(e.target.value)}
            placeholder="Valor final"
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-orange-300"
          />

          <label className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
            <input
              type="checkbox"
              checked={atendimentoResidencial}
              onChange={(e) => setAtendimentoResidencial(e.target.checked)}
            />
            Local do atendimento\n{localAtendimento}\n\nAtendimento residencial (+{percentualResidencialFormulario}%)
          </label>

          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900">
            Total final: {valorFinalFormulario.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </div>

          <select
            value={profissional}
            onChange={(e) => setProfissional(e.target.value)}
            className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-orange-300"
          >
            <option value="">Selecione o profissional</option>
            {profissionais.map((item) => (
              <option key={item.id} value={item.nome}>
                {item.nome}
              </option>
            ))}
          </select>

       <input
      type="date"
      value={data}
      min={usuarioEhAdmin() ? undefined : hojeISO()}
      onChange={(e) => setData(e.target.value)}
      className="h-[44px] w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-orange-300"
    />

          <select
            value={hora}
            onChange={(e) => setHora(e.target.value)}
            className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-orange-300"
          >
            <option value="">Selecione o horário</option>
            {horarios.map((horarioOpcao) => (
              <option key={horarioOpcao} value={horarioOpcao}>
                {horarioOpcao}
              </option>
            ))}
          </select>

          <input
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            placeholder="Observações do atendimento"
            className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-orange-300"
          />

          <div className="md:col-span-2">
            <AlertaAnamneseAgenda
              alertas={alertas}
              loading={loadingAlerta}
            />
          </div>

          {alertas.length > 0 && (
            <div className="md:col-span-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={confirmou}
                  onChange={(e) => setConfirmou(e.target.checked)}
                />
                Confirmo que li os alertas da anamnese antes de prosseguir.
              </label>
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <PrimaryButton onClick={() => void salvarAgendamento()}>
            {loadingSalvar ? "Salvando..." : "Salvar agendamento"}
          </PrimaryButton>
          <SecondaryButton onClick={limparFormulario}>
            Limpar
          </SecondaryButton>
        </div>
      </div>
    </div>
  );
}
