import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import EmpresaSwitcher from "./EmpresaSwitcher";
import { useEmpresa } from "../../hooks/useEmpresa";

export default function AppLayout() {
  const {
    empresaNome,
    corPrimaria,
    carregandoEmpresa,
    licencaAtiva,
    empresaBloqueada,
    trialFim,
    statusAssinatura,
  } = useEmpresa();

  if (carregandoEmpresa) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white p-6 rounded-2xl shadow font-bold">
          Carregando sistema...
        </div>
      </div>
    );
  }

  // 🔒 BLOQUEIO SAAS
  if (!licencaAtiva || empresaBloqueada) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
        <div className="bg-white max-w-md w-full rounded-3xl shadow-xl p-8 text-center space-y-4">
          
          <h1 className="text-2xl font-extrabold text-slate-900">
            Acesso bloqueado
          </h1>

          <p className="text-slate-600">
            Sua licença não está ativa.
          </p>

          {statusAssinatura === "trial" && trialFim && (
            <p className="text-sm text-orange-600 font-bold">
              Seu período de teste expirou em{" "}
              {new Date(trialFim).toLocaleDateString("pt-BR")}
            </p>
          )}

          <button
            className="w-full mt-4 py-3 rounded-2xl text-white font-bold"
            style={{ backgroundColor: corPrimaria }}
            onClick={() => alert("Integrar com pagamento (Stripe / Pix)")}
          >
            Ativar plano
          </button>
        </div>
      </div>
    );
  }

  // ✅ SISTEMA LIBERADO
  return (
    <div
      className="min-h-screen flex"
      style={{ backgroundColor: "var(--cor-fundo)" }}
    >
      <Sidebar />

      <div className="flex-1 flex flex-col min-h-screen">
        {/* HEADER */}
        <header
  className="h-14 flex items-center justify-between px-6 shadow"
  style={{ backgroundColor: corPrimaria }}
>
  <div className="text-white font-semibold">
    {empresaNome}
  </div>

  <EmpresaSwitcher />
</header>

        {/* CONTEÚDO */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}