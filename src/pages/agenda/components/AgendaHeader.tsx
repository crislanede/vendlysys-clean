type Props = {
  dataSelecionada: string;
  onChangeData: (value: string) => void;
  onNovoAgendamento: () => void;
};

export default function AgendaHeader({
  dataSelecionada,
  onChangeData,
  onNovoAgendamento,
}: Props) {
  return (
    <div className="flex flex-col gap-4 rounded-3xl border bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="text-lg font-semibold text-slate-900">
          Agenda
        </p>

        <p className="text-sm text-slate-500">
          Gerencie os atendimentos do dia
        </p>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row">
        <input
          type="date"
          value={dataSelecionada}
          onChange={(e) => onChangeData(e.target.value)}
          className="rounded-2xl border px-4 py-2"
        />

        <button
          onClick={onNovoAgendamento}
          className="rounded-2xl bg-slate-900 px-4 py-2 text-white"
        >
          Novo agendamento
        </button>
      </div>
    </div>
  );
}