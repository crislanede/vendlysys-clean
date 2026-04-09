export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-slate-500 mt-1">
            Visão geral do desempenho da operação
          </p>
        </div>

        <button className="h-11 px-5 rounded-xl bg-orange-500 text-white font-medium hover:opacity-90 transition">
          Novo agendamento
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <p className="text-sm text-slate-500">Agendamentos hoje</p>
          <h2 className="text-3xl font-bold text-slate-800 mt-2">18</h2>
          <p className="text-xs text-emerald-600 mt-3">+12% em relação a ontem</p>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <p className="text-sm text-slate-500">Clientes ativos</p>
          <h2 className="text-3xl font-bold text-slate-800 mt-2">124</h2>
          <p className="text-xs text-emerald-600 mt-3">Base em crescimento</p>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <p className="text-sm text-slate-500">Faturamento do mês</p>
          <h2 className="text-3xl font-bold text-slate-800 mt-2">R$ 8.420</h2>
          <p className="text-xs text-emerald-600 mt-3">Meta mensal em 64%</p>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <p className="text-sm text-slate-500">Serviços cadastrados</p>
          <h2 className="text-3xl font-bold text-slate-800 mt-2">27</h2>
          <p className="text-xs text-slate-500 mt-3">Catálogo atualizado</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">
                Próximos agendamentos
              </h3>
              <p className="text-sm text-slate-500">
                Atendimentos previstos para hoje
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {[
              { cliente: "Maria Oliveira", servico: "Corte + Escova", horario: "09:00" },
              { cliente: "Juliana Costa", servico: "Manicure", horario: "10:30" },
              { cliente: "Fernanda Souza", servico: "Limpeza de pele", horario: "14:00" },
              { cliente: "Patrícia Lima", servico: "Design de sobrancelha", horario: "15:30" },
            ].map((item) => (
              <div
                key={`${item.cliente}-${item.horario}`}
                className="flex items-center justify-between border border-slate-200 rounded-xl p-4"
              >
                <div>
                  <p className="font-medium text-slate-800">{item.cliente}</p>
                  <p className="text-sm text-slate-500">{item.servico}</p>
                </div>

                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-800">{item.horario}</p>
                  <p className="text-xs text-slate-500">Confirmado</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800 mb-5">Resumo rápido</h3>

          <div className="space-y-4">
            {[
              { label: "Confirmados", value: "12" },
              { label: "Pendentes", value: "4" },
              { label: "Cancelados", value: "2" },
              { label: "Profissionais", value: "6" },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between border-b border-slate-100 pb-3"
              >
                <span className="text-sm text-slate-500">{item.label}</span>
                <span className="font-semibold text-slate-800">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}