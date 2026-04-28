import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import { useEmpresa } from "../../hooks/useEmpresa";

export default function AppLayout() {
  const { empresaNome, corPrimaria } = useEmpresa();

  return (
    <div
      className="min-h-screen flex"
      style={{ backgroundColor: "var(--cor-fundo)" }}
    >
      {/* SIDEBAR */}
      <Sidebar />

      {/* CONTEÚDO */}
      <div className="flex-1 flex flex-col min-h-screen">
        
        {/* HEADER */}
        <header
          className="h-14 flex items-center justify-between px-6 shadow"
          style={{ backgroundColor: corPrimaria }}
        >
          {/* ESQUERDA (USUÁRIO) */}
          <div className="text-white font-semibold">
            👤 Usuário
          </div>

          {/* DIREITA (EMPRESA) */}
          <div className="text-white text-sm font-semibold bg-white/20 px-3 py-1 rounded-lg">
            {empresaNome || "Empresa"}
          </div>
        </header>

        {/* MAIN */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}