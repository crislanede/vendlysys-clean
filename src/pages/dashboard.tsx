export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-500 mt-1">
          Visão geral do seu sistema de agendamentos
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <p className="text-sm text-slate-500">Agendamentos hoje</p>
          <h2 className="text-3xl font-bold text-slate-800 mt-2">18</h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <p className="text-sm text-slate-500">Clientes ativos</p>
          <h2 className="text-3xl font-bold text-slate-800 mt-2">124</h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <p className="text-sm text-slate-500">Faturamento do mês</p>
          <h2 className="text-3xl font-bold text-slate-800 mt-2">R$ 8.420</h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <p className="text-sm text-slate-500">Serviços cadastrados</p>
          <h2 className="text-3xl font-bold text-slate-800 mt-2">27</h2>
        </div>
      </div>
    </div>
  );
}