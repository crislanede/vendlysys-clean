import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import EmpresaSwitcher from "./EmpresaSwitcher";
import { useEmpresa } from "../../hooks/useEmpresa";
import { supabase } from "../../lib/supabase";

export default function AppLayout() {
  const navigate = useNavigate();

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
  const [perfilUsuario, setPerfilUsuario] = useState("");

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
    let perfilEncontrado =
      user.user_metadata?.perfil ||
      user.user_metadata?.tipo_usuario ||
      "";

    if (!nomeEncontrado && email) {
      const { data: usuario } = await supabase
        .from("usuarios")
        .select("nome, perfil")
        .eq("email", email)
        .maybeSingle();

      nomeEncontrado = usuario?.nome || "";
      perfilEncontrado = perfilEncontrado || usuario?.perfil || "";
    }

    if (!nomeEncontrado && user.id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("nome, perfil")
        .eq("id", user.id)
        .maybeSingle();

      nomeEncontrado = profile?.nome || "";
      perfilEncontrado = perfilEncontrado || profile?.perfil || "";
    }

    setUsuarioLogado(nomeEncontrado || email.split("@")[0] || "Usuário");
    setPerfilUsuario(String(perfilEncontrado || ""));
  }

  async function handleSair() {
    await supabase.auth.signOut();

    localStorage.removeItem("perfil");
    localStorage.removeItem("tipo_usuario");
    localStorage.removeItem("role");
    localStorage.removeItem("empresa_id");

    navigate("/login", { replace: true });
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

  if (!licencaAtiva || empresaBloqueada) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
        <div className="bg-white max-w-md w-full rounded-3xl shadow-xl p-8 text-center space-y-4">
          <h1 className="text-2xl font-extrabold text-slate-900">
            Acesso bloqueado
          </h1>

          <p className="text-slate-600">Sua licença não está ativa.</p>

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

          <button
            type="button"
            onClick={handleSair}
            className="w-full py-3 rounded-2xl border border-slate-200 text-slate-700 font-bold"
          >
            Sair
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex"
      style={{ backgroundColor: "var(--cor-fundo)" }}
    >
      <Sidebar />

      <div className="flex-1 flex flex-col min-h-screen">
        <header
          className="h-14 flex items-center justify-between px-6 shadow"
          style={{ backgroundColor: corPrimaria }}
        >
          <div className="text-white font-semibold">{empresaNome}</div>

          <div className="flex items-center gap-4">
            <div className="hidden md:block text-right text-white leading-tight">
              <div className="text-xs opacity-75">Usuário logado</div>
              <div className="font-bold">{usuarioLogado}</div>
            </div>

            {String(perfilUsuario).includes("super_admin") && (
              <button
                type="button"
                onClick={() => navigate("/admin/empresas")}
                className="rounded-2xl bg-fuchsia-600 px-4 py-2 text-sm font-bold text-white hover:bg-fuchsia-700"
              >
                Administração SaaS
              </button>
            )}

            <EmpresaSwitcher />

            <button
              type="button"
              onClick={handleSair}
              className="rounded-2xl bg-white/15 px-4 py-2 text-sm font-bold text-white hover:bg-white/25"
            >
              Sair
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}