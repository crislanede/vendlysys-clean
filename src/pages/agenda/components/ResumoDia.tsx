type Props = {
  total: number;
  confirmados: number;
  finalizados: number;
  cancelados: number;
};

export default function ResumoDia({
  total,
  confirmados,
  finalizados,
  cancelados,
}: Props) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold text-slate-800">Resumo do dia</p>

      <div className="mt-4 grid gap-3">
        <div className="rounded-2xl bg-slate-50 px-4 py-3">
          <p className="text-xs text-slate-500">Total</p>
          <p className="text-2xl font-bold text-slate-900">{total}</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-blue-50 px-3 py-3 text-center">
            <p className="text-xs text-blue-600">Confirmados</p>
            <p className="text-lg font-bold text-blue-700">{confirmados}</p>
          </div>

          <div className="rounded-2xl bg-emerald-50 px-3 py-3 text-center">
            <p className="text-xs text-emerald-600">Finalizados</p>
            <p className="text-lg font-bold text-emerald-700">{finalizados}</p>
          </div>

          <div className="rounded-2xl bg-rose-50 px-3 py-3 text-center">
            <p className="text-xs text-rose-600">Cancelados</p>
            <p className="text-lg font-bold text-rose-700">{cancelados}</p>
          </div>
        </div>
      </div>
    </div>
  );
}