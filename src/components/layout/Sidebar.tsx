import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useEmpresa } from "../../hooks/useEmpresa";

type Perfil =
  | "admin"
  | "recepcao"
  | "consulta"
  | "profissional"
  | "financeiro"
  | "super_admin"
  | "admin_saas";

type MenuItem = {
  nome: string;
  rota: string;
};

type MenuSecao = {
  titulo: string;
  itens: MenuItem[];
};

const menuAdmin: MenuSecao[] = [
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
      { nome: "Pacotes / Combos", rota: "/marketing-pacotes" },
      { nome: "Usuários", rota: "/usuarios" },
    ],
  },
  {
    titulo: "Operação",
    itens: [
      { nome: "Financeiro", rota: "/financeiro" },
      { nome: "Caixa", rota: "/caixa" },
      { nome: "Comissões", rota: "/comissoes" },
      { nome: "Despesas", rota: "/despesas" },
      { nome: "Pagamentos", rota: "/pagamentos" },
      { nome: "Relatórios", rota: "/relatorios" },
    ],
  },
  {
    titulo: "Sistema",
    itens: [
      { nome: "Anamnese", rota: "/anamnese-configuracao" },
      { nome: "Mensagens", rota: "/whatsapp-mensagens" },
      { nome: "Campanhas", rota: "/campanhas" },
      { nome: "Bloqueios", rota: "/bloqueios" },
      { nome: "Configurações", rota: "/configuracoes" },
    ],
  },
];

const menuProfissional: MenuSecao[] = [
  {
    titulo: "Minha área",
    itens: [
      { nome: "Agenda", rota: "/agenda" },
      { nome: "Minhas comissões", rota: "/minhas-comissoes" },
    ],
  },
  {
    titulo: "Consulta",
    itens: [
      { nome: "Serviços", rota: "/servicos" },
      { nome: "Produtos", rota: "/produtos" },
    ],
  },
];

const menuRecepcao: MenuSecao[] = [
  {
    titulo: "Principal",
    itens: [
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
      { nome: "Pacotes / Combos", rota: "/marketing-pacotes" },
    ],
  },
  {
    titulo: "Sistema",
    itens: [
      { nome: "Mensagens", rota: "/whatsapp-mensagens" },
      { nome: "Campanhas", rota: "/campanhas" },
    ],
  },
];

const menuConsulta: MenuSecao[] = [
  {
    titulo: "Principal",
    itens: [
      { nome: "Agenda", rota: "/agenda" },
      { nome: "Consulta", rota: "/consulta-agendamentos" },
    ],
  },
  {
    titulo: "Cadastros",
    itens: [
      { nome: "Clientes", rota: "/clientes" },
      { nome: "Serviços", rota: "/servicos" },
      { nome: "Produtos", rota: "/produtos" },
    ],
  },
];

const menuFinanceiro: MenuSecao[] = [
  {
    titulo: "Operação",
    itens: [
      { nome: "Financeiro", rota: "/financeiro" },
      { nome: "Caixa", rota: "/caixa" },
      { nome: "Comissões", rota: "/comissoes" },
      { nome: "Despesas", rota: "/despesas" },
      { nome: "Pagamentos", rota: "/pagamentos" },
      { nome: "Relatórios", rota: "/relatorios" },
    ],
  },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const dadosEmpresa = useEmpresa() as any;

  const empresaNome = dadosEmpresa?.empresaNome || "VendlySys";
  const corPrimaria = dadosEmpresa?.corPrimaria || "#27245f";

  const perfil: Perfil =
    dadosEmpresa?.perfilEmpresa ||
    dadosEmpresa?.perfil ||
    dadosEmpresa?.empresa?.perfil ||
    "admin";

  const [recolhida, setRecolhida] = useState(false);

  const menu = useMemo<MenuSecao[]>(() => {
    if (perfil === "admin" || perfil === "super_admin" || perfil === "admin_saas") {
      return menuAdmin;
    }

    if (perfil === "profissional") {
      return menuProfissional;
    }

    if (perfil === "recepcao") {
      return menuRecepcao;
    }

    if (perfil === "consulta") {
      return menuConsulta;
    }

    if (perfil === "financeiro") {
      return menuFinanceiro;
    }

    return [];
  }, [perfil]);

  function estaAtivo(rota: string) {
    return location.pathname === rota;
  }

  return (
    <aside
      style={{
        width: recolhida ? 88 : 280,
        background: corPrimaria,
        color: "#fff",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ padding: 18 }}>
        <strong>{recolhida ? empresaNome.charAt(0) : empresaNome}</strong>
      </div>

      <nav style={{ flex: 1, padding: 14 }}>
        {menu.map((secao) => (
          <div key={secao.titulo} style={{ marginBottom: 20 }}>
            {!recolhida && (
              <div
                style={{
                  fontSize: 12,
                  opacity: 0.7,
                  marginBottom: 10,
                }}
              >
                {secao.titulo}
              </div>
            )}

            {secao.itens.map((item) => (
              <button
                key={item.rota}
                type="button"
                onClick={() => navigate(item.rota)}
                title={item.nome}
                style={{
                  width: "100%",
                  background: estaAtivo(item.rota)
                    ? "rgba(255,255,255,0.2)"
                    : "transparent",
                  color: "#fff",
                  border: "none",
                  padding: 12,
                  textAlign: "left",
                  cursor: "pointer",
                  borderRadius: 10,
                  marginBottom: 4,
                  fontWeight: estaAtivo(item.rota) ? 800 : 600,
                }}
              >
                {recolhida ? item.nome.charAt(0) : item.nome}
              </button>
            ))}
          </div>
        ))}
      </nav>

      <div style={{ padding: 14 }}>
        <button
          type="button"
          onClick={() => setRecolhida(!recolhida)}
          style={{
            width: "100%",
            border: "none",
            borderRadius: 12,
            padding: "10px 12px",
            cursor: "pointer",
            fontWeight: 800,
          }}
        >
          {recolhida ? "Abrir" : "Recolher"}
        </button>
      </div>
    </aside>
  );
}