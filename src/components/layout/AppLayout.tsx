import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import EmpresaSwitcher from "./EmpresaSwitcher";
import { useEmpresa } from "../../hooks/useEmpresa";
import { supabase } from "../../lib/supabase";
import { useEffect, useState } from "react";

export default function AppLayout() {
  const { corPrimaria } = useEmpresa();
  const [usuario, setUsuario] = useState("");

  useEffect(() => {
    carregarUsuario();
  }, []);

  async function carregarUsuario() {
    const { data } = await supabase.auth.getUser();
    const email = data.user?.email || "";
    setUsuario(email.split("@")[0]);
  }

  return (
    <div
      className="min-h-screen flex"
      style={{ backgroundColor: "var(--cor-fundo, #fbf4fb)" }}
    >
      <Sidebar />

      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <header
          className="h-16 flex items-center justify-between px-6 shadow z-40 relative"
          style={{ backgroundColor: corPrimaria || "var(--cor-primaria, #4b2f3f)" }}
        >
          <div className="text-white font-semibold flex items-center gap-2">
            <span>👤</span>
            <span>{usuario || "Usuário"}</span>
          </div>

          <div className="relative z-50">
            <EmpresaSwitcher />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}