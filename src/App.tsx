import AppLayout from "./components/layout/AppLayout";

export default function App() {
  return (
    <AppLayout>
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

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">
              Próximos agendamentos
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between border border-slate-200 rounded-xl p-4">
                <div>
                  <p className="font-medium text-slate-800">Maria Oliveira</p>
                  <p className="text-sm text-slate-500">Corte + Escova</p>
                </div>
                <span className="text-sm font-semibold text-slate-700">09:00</span>
              </div>

              <div className="flex items-center justify-between border border-slate-200 rounded-xl p-4">
                <div>
                  <p className="font-medium text-slate-800">Juliana Costa</p>
                  <p className="text-sm text-slate-500">Manicure</p>
                </div>
                <span className="text-sm font-semibold text-slate-700">10:30</span>
              </div>

              <div className="flex items-center justify-between border border-slate-200 rounded-xl p-4">
                <div>
                  <p className="font-medium text-slate-800">Fernanda Souza</p>
                  <p className="text-sm text-slate-500">Limpeza de pele</p>
                </div>
                <span className="text-sm font-semibold text-slate-700">14:00</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">
              Resumo rápido
            </h3>

            <div className="space-y-4 text-sm text-slate-600">
              <div className="flex justify-between">
                <span>Confirmados</span>
                <span className="font-semibold text-slate-800">12</span>
              </div>
              <div className="flex justify-between">
                <span>Pendentes</span>
                <span className="font-semibold text-slate-800">4</span>
              </div>
              <div className="flex justify-between">
                <span>Cancelados</span>
                <span className="font-semibold text-slate-800">2</span>
              </div>
              <div className="flex justify-between">
                <span>Profissionais</span>
                <span className="font-semibold text-slate-800">6</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}