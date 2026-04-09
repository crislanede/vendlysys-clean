export default function AgendaPage() {
  const agendamentos = [
    {
      cliente: "Maria Oliveira",
      servico: "Corte + Escova",
      horario: "09:00",
      status: "confirmado",
    },
    {
      cliente: "Juliana Costa",
      servico: "Manicure",
      horario: "10:30",
      status: "pendente",
    },
    {
      cliente: "Fernanda Souza",
      servico: "Limpeza de pele",
      horario: "14:00",
      status: "cancelado",
    },
  ];

  const statusStyle: any = {
    confirmado: "bg-emerald-100 text-emerald-700",
    pendente: "bg-yellow-100 text-yellow-700",
    cancelado: "bg-red-100 text-red-700",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Agenda</h1>
          <p className="text-slate-500 mt-1">
            Gerencie seus agendamentos
          </p>
        </div>

        <button className="h-11 px-5 rounded-xl bg-orange-500 text-white font-medium hover:opacity-90 transition">
          Novo agendamento
        </button>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-3">
        {agendamentos.map((item) => (
          <div
            key={`${item.cliente}-${item.horario}`}
            className="flex items-center justify-between border border-slate-200 rounded-xl p-4 hover:bg-slate-50 transition"
          >
            <div>
              <p className="font-medium text-slate-800">
                {item.cliente}
              </p>
              <p className="text-sm text-slate-500">
                {item.servico}
              </p>
            </div>

            <div className="text-right space-y-1">
              <p className="text-sm font-semibold text-slate-800">
                {item.horario}
              </p>

              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${statusStyle[item.status]}`}
              >
                {item.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}