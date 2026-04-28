import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useEmpresa } from "../../hooks/useEmpresa";

const menu = [
  {
    titulo: "Principal",
    itens: [
      { nome: "Dashboard", rota: "/dashboard" },
      { nome: "Agenda", rota: "/agenda" },
      { nome: "Consulta", rota: "/consulta-agendamentos" },
    ],
  },
  {
    titulo: "Cadastros",
    itens: [
      { nome: "Clientes", rota: "/clientes" },
      { nome: "Profissionais", rota: "/profissionais" },
      { nome: "Serviços", rota: "/servicos" },
      { nome: "Produtos", rota: "/produtos" },
      { nome: "Usuários", rota: "/usuarios" },
    ],
  },
  {
    titulo: "Operação",
    itens: [
      { nome: "Financeiro", rota: "/financeiro" },
      { nome: "Despesas", rota: "/despesas" },
      { nome: "Pagamentos", rota: "/pagamentos" },
      { nome: "Relatórios", rota: "/relatorios" },
      { nome: "Retorno", rota: "/relatorios-retorno" },
    ],
  },
  {
    titulo: "Comunicação",
    itens: [
      { nome: "WhatsApp", rota: "/whatsapp" },
      { nome: "Fila WhatsApp", rota: "/whatsapp-fila" },
      { nome: "Mensagens", rota: "/whatsapp-mensagens" },
      { nome: "Campanhas", rota: "/whatsapp-campanha" },
    ],
  },
  {
    titulo: "Sistema",
    itens: [{ nome: "Configurações", rota: "/configuracoes" }],
  },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const { empresaNome, corPrimaria, logoUrl } = useEmpresa();

  const [recolhida, setRecolhida] = useState(false);

  async function sair() {
    await supabase.auth.signOut();
    navigate("/login");
  }

  function ativo(rota: string) {
    return location.pathname === rota;
  }

  return (
    <aside
      className={`min-h-screen text-white flex flex-col transition-all duration-300 ${
        recolhida ? "w-20" : "w-72"
      }`}
      style={{
        backgroundColor: corPrimaria || "var(--cor-primaria, #4b2f3f)",
      }}
    >
      {/* TOPO */}
      <div className="px-4 py-6 border-b border-white/15">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {logoUrl ? (
              <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center overflow-hidden shrink-0">
                <img
                  src={logoUrl}
                  alt={empresaNome || "Logo"}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg shrink-0">
                {(empresaNome || "V").charAt(0).toUpperCase()}
              </div>
            )}

            {!recolhida && (
              <div className="min-w-0">
                <h1 className="text-xl font-bold leading-tight truncate">
                  {empresaNome || "VendlySys"}
                </h1>
                <p className="text-xs text-white/70 truncate">
                  Gestão de agendas
                </p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setRecolhida(!recolhida)}
            className="w-8 h-8 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center text-sm shrink-0"
            title={recolhida ? "Expandir menu" : "Recolher menu"}
          >
            {recolhida ? "›" : "‹"}
          </button>
        </div>
      </div>

      {/* MENU */}
      <nav className="flex-1 px-3 py-5 space-y-6 overflow-y-auto">
        {menu.map((grupo) => (
          <div key={grupo.titulo}>
            {!recolhida && (
              <p className="text-[11px] uppercase tracking-wider text-white/60 font-bold mb-2 px-2">
                {grupo.titulo}
              </p>
            )}

            <div className="space-y-1">
              {grupo.itens.map((item) => {
                const selecionado = ativo(item.rota);

                return (
                  <button
                    key={item.rota}
                    type="button"
                    onClick={() => navigate(item.rota)}
                    title={item.nome}
                    className={`w-full rounded-2xl text-sm font-semibold transition ${
                      recolhida
                        ? "px-2 py-3 text-center"
                        : "px-4 py-3 text-left"
                    } ${
                      selecionado
                        ? "text-white shadow"
                        : "text-white/85 hover:bg-white/10"
                    }`}
                    style={
                      selecionado
                        ? {
                            backgroundColor: "rgba(255,255,255,0.22)",
                            borderLeft: recolhida
                              ? undefined
                              : "4px solid rgba(255,255,255,0.9)",
                          }
                        : undefined
                    }
                  >
                    {recolhida ? item.nome.charAt(0) : item.nome}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* RODAPÉ */}
      <div className="p-4 border-t border-white/15">
        <button
          type="button"
          onClick={sair}
          title="Sair"
          className="w-full bg-white/15 hover:bg-white/25 rounded-2xl px-4 py-3 text-sm font-bold transition"
        >
          {recolhida ? "⎋" : "Sair"}
        </button>
      </div>
    </aside>
  );
}