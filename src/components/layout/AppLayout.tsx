import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import EmpresaSwitcher from "./EmpresaSwitcher";
import { useEmpresa } from "../../hooks/useEmpresa";
import { supabase } from "../../lib/supabase";

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

  const [usuarioLogado, setUsuarioLogado] = useState("Usuário");

  useEffect(() => {
    carregarUsuarioLogado();
  }, []);

  async function carregarUsuarioLogado() {
    const { data } = await supabase.auth.getUser();
    const user = data.user;

    if (!user) return;

    const email = user.email || "";
    const nomeMetadata =
      user.user_metadata?.nome ||
      user.user_metadata?.name ||
      user.user_metadata?.full_name ||
      "";

    let nomeEncontrado = nomeMetadata;

    if (!nomeEncontrado && email) {
      const { data: usuario } = await supabase
        .from("usuarios")
        .select("nome")
        .eq("email", email)
        .maybeSingle();

      nomeEncontrado = usuario?.nome || "";
    }

    if (!nomeEncontrado && user.id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("nome")
        .eq("id", user.id)
        .maybeSingle();

      nomeEncontrado = profile?.nome || "";
    }

    setUsuarioLogado(nomeEncontrado || email.split("@")[0] || "Usuário");
  }

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

  <div className="flex items-center gap-4">
    <div className="hidden md:block text-right text-white leading-tight">
      <div className="text-xs opacity-75">Usuário logado</div>
      <div className="font-bold">{usuarioLogado}</div>
    </div>
    <EmpresaSwitcher />
  </div>
</header>

        {/* CONTEÚDO */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}