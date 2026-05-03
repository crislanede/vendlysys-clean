import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import EmpresaSwitcher from "./EmpresaSwitcher";
import { useEmpresa } from "../../hooks/useEmpresa";
import { supabase } from "../../lib/supabase";

const menuMobile = [
  { nome: "Dashboard", rota: "/dashboard", icone: "🏠" },
  { nome: "Agenda", rota: "/agenda", icone: "📅" },
  { nome: "Clientes", rota: "/clientes", icone: "👥" },
  { nome: "Financeiro", rota: "/financeiro", icone: "💰" },
  { nome: "Menu", rota: "menu", icone: "☰" },
];

const menuCompletoMobile = [
  { titulo: "Principal", itens: [
    { nome: "Dashboard", rota: "/dashboard" },
    { nome: "Agenda", rota: "/agenda" },
    { nome: "Consulta", rota: "/consulta-agendamentos" },
  ]},
  { titulo: "Cadastros", itens: [
    { nome: "Clientes", rota: "/clientes" },
    { nome: "Profissionais", rota: "/profissionais" },
    { nome: "Serviços", rota: "/servicos" },
    { nome: "Produtos", rota: "/produtos" },
    { nome: "Pacotes / Combos", rota: "/marketing-pacotes" },
    { nome: "Usuários", rota: "/usuarios" },
  ]},
  { titulo: "Operação", itens: [
    { nome: "Financeiro", rota: "/financeiro" },
    { nome: "Despesas", rota: "/despesas" },
    { nome: "Pagamentos", rota: "/pagamentos" },
    { nome: "Relatórios", rota: "/relatorios" },
  ]},
  { titulo: "Sistema", itens: [
    { nome: "Anamnese", rota: "/anamnese-configuracao" },
    { nome: "Mensagens", rota: "/whatsapp-mensagens" },
    { nome: "Bloqueios", rota: "/bloqueios" },
    { nome: "Configurações", rota: "/configuracoes" },
  ]},
];

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();

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
  const [menuAberto, setMenuAberto] = useState(false);

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

  function irPara(rota: string) {
    if (rota === "menu") {
      setMenuAberto(true);
      return;
    }

    navigate(rota);
    setMenuAberto(false);
  }

  function estaAtivo(rota: string) {
    return location.pathname === rota;
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
      className="min-h-screen flex overflow-x-hidden"
      style={{ backgroundColor: "var(--cor-fundo)" }}
    >
      {/* Sidebar desktop */}
      <div className="hidden md:block shrink-0">
        <Sidebar />
      </div>

      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* HEADER */}
        <header
          className="h-14 flex items-center justify-between px-3 md:px-6 shadow sticky top-0 z-30"
          style={{ backgroundColor: corPrimaria }}
        >
          <div className="min-w-0">
            <div className="text-white font-semibold truncate text-sm md:text-base">
              {empresaNome}
            </div>
            <div className="md:hidden text-white/70 text-xs truncate">
              {usuarioLogado}
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <div className="hidden md:block text-right text-white leading-tight">
              <div className="text-xs opacity-75">Usuário logado</div>
              <div className="font-bold">{usuarioLogado}</div>
            </div>

            <EmpresaSwitcher />

            <button
              type="button"
              className="md:hidden rounded-xl bg-white/15 text-white px-3 py-2 text-sm font-bold"
              onClick={() => setMenuAberto(true)}
            >
              ☰
            </button>
          </div>
        </header>

        {/* CONTEÚDO */}
        <main className="flex-1 overflow-y-auto p-3 md:p-6 pb-24 md:pb-6 w-full max-w-full">
          <Outlet />
        </main>
      </div>

      {/* Menu inferior mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 px-3 pb-3">
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 grid grid-cols-5 p-2">
          {menuMobile.map((item) => {
            const ativo = item.rota !== "menu" && estaAtivo(item.rota);

            return (
              <button
                key={item.rota}
                type="button"
                onClick={() => irPara(item.rota)}
                className={`flex flex-col items-center justify-center gap-0.5 rounded-2xl py-2 text-[11px] font-bold ${
                  ativo ? "text-white" : "text-slate-500"
                }`}
                style={ativo ? { backgroundColor: corPrimaria } : undefined}
              >
                <span className="text-base leading-none">{item.icone}</span>
                <span className="leading-none">{item.nome}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Drawer mobile */}
      {menuAberto && (
        <div className="md:hidden fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Fechar menu"
            className="absolute inset-0 bg-black/45"
            onClick={() => setMenuAberto(false)}
          />

          <aside
            className="absolute right-0 top-0 h-full w-[86%] max-w-sm bg-white shadow-2xl p-4 overflow-y-auto"
          >
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wide text-slate-500 font-bold">
                  Menu
                </p>
                <h2 className="font-extrabold text-slate-900 truncate">
                  {empresaNome}
                </h2>
              </div>

              <button
                type="button"
                className="rounded-xl border px-3 py-2 font-bold"
                onClick={() => setMenuAberto(false)}
              >
                Fechar
              </button>
            </div>

            <div className="space-y-5">
              {menuCompletoMobile.map((secao) => (
                <div key={secao.titulo}>
                  <p className="text-xs uppercase tracking-wide text-slate-400 font-extrabold mb-2">
                    {secao.titulo}
                  </p>

                  <div className="grid grid-cols-1 gap-2">
                    {secao.itens.map((item) => {
                      const ativo = estaAtivo(item.rota);

                      return (
                        <button
                          key={item.rota}
                          type="button"
                          onClick={() => irPara(item.rota)}
                          className={`w-full text-left rounded-2xl px-4 py-3 font-bold border ${
                            ativo
                              ? "text-white border-transparent"
                              : "text-slate-700 bg-slate-50 border-slate-100"
                          }`}
                          style={ativo ? { backgroundColor: corPrimaria } : undefined}
                        >
                          {item.nome}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
