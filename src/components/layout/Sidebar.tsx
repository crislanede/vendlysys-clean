import { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { supabase } from "../../lib/supabase";

type Configuracao = {
  nome_empresa?: string | null;
  nome_fantasia?: string | null;
};

type MenuItem = {
  label: string;
  to: string;
};

type MenuGrupo = {
  titulo: string;
  itens: MenuItem[];
};

const menuGrupos: MenuGrupo[] = [
  {
    titulo: "Principal",
    itens: [
      { label: "Dashboard", to: "/dashboard" },
      { label: "Agenda", to: "/agenda" },
      { label: "Consulta de Agendamentos", to: "/consulta-agendamentos" },
    ],
  },
  {
    titulo: "Cadastros",
    itens: [
      { label: "Clientes", to: "/clientes" },
      { label: "Profissionais", to: "/profissionais" },
      { label: "Serviços", to: "/servicos" },
      { label: "Produtos", to: "/produtos" },
      { label: "Usuários", to: "/usuarios" },
    ],
  },
  {
    titulo: "Operação",
    itens: [
      { label: "Financeiro", to: "/financeiro" },
      { label: "Marketing", to: "/marketing" },
      { label: "Pacotes", to: "/marketing" },
      { label: "Pagamentos", to: "/pagamentos" },
      { label: "Despesas", to: "/despesas" },
      { label: "Caixa", to: "/caixa" },
      { label: "Comissões", to: "/comissoes" },
    ],
  },
  {
    titulo: "Comunicação",
    itens: [
      { label: "WhatsApp", to: "/whatsapp" },
      { label: "Campanhas", to: "/whatsapp-campanha" },
      { label: "Mensagens WhatsApp", to: "/whatsapp-mensagens" },
    ],
  },
  {
    titulo: "Sistema",
    itens: [
      { label: "Anamnese", to: "/anamnese-configuracao" },
      { label: "Bloqueios", to: "/bloqueios" },
      { label: "Relatórios", to: "/relatorios" },
      { label: "Configurações", to: "/configuracoes" },
    ],
  },
];

function grupoContemRota(grupo: MenuGrupo, pathname: string) {
  return grupo.itens.some((item) => {
    if (item.to === "/") return pathname === "/";
    return pathname === item.to || pathname.startsWith(`${item.to}/`);
  });
}

export default function Sidebar() {
  const location = useLocation();
  const [configuracao, setConfiguracao] = useState<Configuracao | null>(null);

  const gruposAbertosIniciais = useMemo(() => {
    const abertos: Record<string, boolean> = {};

    menuGrupos.forEach((grupo) => {
      abertos[grupo.titulo] = grupoContemRota(grupo, location.pathname);
    });

    const algumAberto = Object.values(abertos).some(Boolean);

    if (!algumAberto) {
      abertos.Principal = true;
    }

    return abertos;
  }, [location.pathname]);

  const [gruposAbertos, setGruposAbertos] =
    useState<Record<string, boolean>>(gruposAbertosIniciais);

  useEffect(() => {
    void carregarConfiguracao();
  }, []);

  useEffect(() => {
    setGruposAbertos((atual) => {
      const atualizado = { ...atual };

      menuGrupos.forEach((grupo) => {
        if (grupoContemRota(grupo, location.pathname)) {
          atualizado[grupo.titulo] = true;
        }
      });

      return atualizado;
    });
  }, [location.pathname]);

  async function carregarConfiguracao() {
    const { data, error } = await supabase
      .from("configuracoes")
      .select("nome_empresa, nome_fantasia")
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Erro ao carregar configurações da sidebar:", error);
      return;
    }

    setConfiguracao(data || null);
  }

  function alternarGrupo(titulo: string) {
    setGruposAbertos((atual) => ({
      ...atual,
      [titulo]: !atual[titulo],
    }));
  }

  const nomeEmpresa =
    configuracao?.nome_fantasia ||
    configuracao?.nome_empresa ||
    "VendlySys";

  return (
    <aside
      className="sticky top-0 flex h-screen w-72 shrink-0 flex-col overflow-hidden"
      style={{
        backgroundColor: "var(--color-secondary)",
        color: "#fff",
      }}
    >
      <div className="px-5 py-7">
        <div className="flex items-center gap-3">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-xl font-bold text-white"
            style={{ backgroundColor: "var(--color-primary)" }}
          >
            {nomeEmpresa.charAt(0).toUpperCase()}
          </div>

          <div className="min-w-0">
            <h2 className="truncate text-3xl font-extrabold leading-none">
              {nomeEmpresa}
            </h2>
            <p className="mt-1 text-sm text-white/80">Gestão de agendas</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-6">
        <div className="space-y-3">
          {menuGrupos.map((grupo) => {
            const aberto = gruposAbertos[grupo.titulo];

            return (
              <div key={grupo.titulo} className="space-y-1">
                <button
                  type="button"
                  onClick={() => alternarGrupo(grupo.titulo)}
                  className="flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left text-xs font-extrabold uppercase tracking-wide text-white/65 transition hover:bg-white/10 hover:text-white"
                >
                  <span>{grupo.titulo}</span>

                  <span
                    className="text-lg leading-none transition-transform"
                    style={{
                      transform: aberto ? "rotate(90deg)" : "rotate(0deg)",
                    }}
                  >
                    ›
                  </span>
                </button>

                {aberto && (
                  <div className="space-y-1">
                    {grupo.itens.map((item) => (
                      <NavLink
                        key={`${grupo.titulo}-${item.to}-${item.label}`}
                        to={item.to}
                        className="block rounded-2xl px-4 py-3 text-sm font-extrabold transition hover:bg-white/10"
                        style={({ isActive }) => ({
                          backgroundColor: isActive
                            ? "var(--color-primary)"
                            : "transparent",
                          color: "#ffffff",
                          opacity: isActive ? 1 : 0.9,
                        })}
                      >
                        {item.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}
