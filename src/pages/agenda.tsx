export default function AgendaPage() {
  const agendamentos = [
    { cliente: "Maria Oliveira", servico: "Corte + Escova", horario: "09:00" },
    { cliente: "Juliana Costa", servico: "Manicure", horario: "10:30" },
    { cliente: "Fernanda Souza", servico: "Limpeza de pele", horario: "14:00" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Agenda</h1>
        <p className="text-slate-500 mt-1">Gerencie os próximos atendimentos</p>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <div className="space-y-3">
          {agendamentos.map((item) => (
            <div
              key={`${item.cliente}-${item.horario}`}
              className="flex items-center justify-between border border-slate-200 rounded-xl p-4"
            >
              <div>
                <p className="font-medium text-slate-800">{item.cliente}</p>
                <p className="text-sm text-slate-500">{item.servico}</p>
              </div>
              <span className="text-sm font-semibold text-slate-700">
                {item.horario}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}