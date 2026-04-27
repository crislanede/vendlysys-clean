import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../../lib/supabase";

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
      className={`min-h-screen bg-[#4b2f3f] text-white flex flex-col transition-all duration-300 ${
        recolhida ? "w-20" : "w-72"
      }`}
    >
      <div className="px-4 py-6 border-b border-white/10">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-pink-500 flex items-center justify-center font-bold text-lg">
              V
            </div>

            {!recolhida && (
              <div>
                <h1 className="text-xl font-bold leading-tight">VendlySys</h1>
                <p className="text-xs text-white/60">Gestão de agendas</p>
              </div>
            )}
          </div>

          <button
            onClick={() => setRecolhida(!recolhida)}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-sm"
            title={recolhida ? "Expandir menu" : "Recolher menu"}
          >
            {recolhida ? "›" : "‹"}
          </button>
        </div>
      </div>

      <nav className="flex-1 px-3 py-5 space-y-6 overflow-y-auto">
        {menu.map((grupo) => (
          <div key={grupo.titulo}>
            {!recolhida && (
              <p className="text-[11px] uppercase tracking-wider text-white/50 font-bold mb-2 px-2">
                {grupo.titulo}
              </p>
            )}

            <div className="space-y-1">
              {grupo.itens.map((item) => (
                <button
                  key={item.rota}
                  onClick={() => navigate(item.rota)}
                  title={item.nome}
                  className={`w-full text-left px-4 py-3 rounded-2xl text-sm font-semibold transition ${
                    ativo(item.rota)
                      ? "bg-pink-500 text-white shadow"
                      : "text-white/85 hover:bg-white/10"
                  } ${recolhida ? "text-center px-2" : ""}`}
                >
                  {recolhida ? item.nome.charAt(0) : item.nome}
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-white/10">
        <button
          onClick={sair}
          title="Sair"
          className="w-full bg-white/10 hover:bg-white/20 rounded-2xl px-4 py-3 text-sm font-bold"
        >
          {recolhida ? "⎋" : "Sair"}
        </button>
      </div>
    </aside>
  );
}