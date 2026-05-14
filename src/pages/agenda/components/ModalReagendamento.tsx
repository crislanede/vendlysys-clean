import SecondaryButton from "../../../components/ui/SecondaryButton";
import PrimaryButton from "../../../components/ui/PrimaryButton";
import type { Agendamento } from "../types";

type Props = {
  aberto: boolean;
  agendamento: Agendamento | null;
  dataReagendamento: string;
  horaReagendamento: string;
  horarios: string[];
  minData?: string;
  loading: boolean;
  onChangeData: (value: string) => void;
  onChangeHora: (value: string) => void;
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
  onChangeData,
  onChangeHora,
  onFechar,
  onSalvar,
}: Props) {
  if (!aberto || !agendamento) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
      <div className="w-full max-w-lg rounded-[28px] bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-orange-600">
              Reagendamento
            </p>
            <h2 className="text-2xl font-bold text-slate-900">
              Reagendar atendimento
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Escolha uma nova data e horário para este agendamento.
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
            <strong>Serviço:</strong> {agendamento.servico}
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
