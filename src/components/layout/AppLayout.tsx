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

    const nome = email.split("@")[0]; // pega antes do @
    setUsuario(nome);
  }

  return (
    <div className="min-h-screen flex bg-[#fbf4fb]">
      <Sidebar />

      <div className="flex-1 flex flex-col min-h-screen">
        
        {/* HEADER */}
        <header
          className="h-16 flex items-center justify-between px-6 shadow"
          style={{ backgroundColor: corPrimaria }}
        >
          {/* 👤 USUÁRIO (ESQUERDA) */}
          <div className="text-white font-semibold flex items-center gap-2">
            <span>👤</span>
            <span>{usuario || "Usuário"}</span>
          </div>

          {/* 🏢 EMPRESA (DIREITA) */}
          <EmpresaSwitcher />
        </header>

        {/* CONTEÚDO */}
        <main className="flex-1 overflow-y-auto p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}