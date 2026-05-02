import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
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
      { nome: "Despesas", rota: "/despesas" },
      { nome: "Pagamentos", rota: "/pagamentos" },
      { nome: "Relatórios", rota: "/relatorios" },
    ],
  },
  {
    titulo: "Sistema",
    itens: [
      { nome: "Anamnese", rota: "/anamnese-configuracao" },
      { nome: "Bloqueios", rota: "/bloqueios" },
      { nome: "Configurações", rota: "/configuracoes" },
    ],
  },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const dadosEmpresa = useEmpresa() as any;

  const empresaNome = dadosEmpresa?.empresaNome || "VendlySys";
  const corPrimaria = dadosEmpresa?.corPrimaria || "#27245f";
  const empresaId = dadosEmpresa?.empresaId || dadosEmpresa?.empresa?.id || dadosEmpresa?.id || null;
  const logoUrlHook = dadosEmpresa?.logoUrl || dadosEmpresa?.empresa?.logo_url || dadosEmpresa?.logo_url || null;
  const [logoUrlBanco, setLogoUrlBanco] = useState<string | null>(null);
  const logoUrl = logoUrlHook || logoUrlBanco;

  const perfil: Perfil =
    dadosEmpresa?.perfilEmpresa ||
    dadosEmpresa?.perfil ||
    dadosEmpresa?.empresa?.perfil ||
    "admin";

  const [recolhida, setRecolhida] = useState(false);
  const [usuarioLogado, setUsuarioLogado] = useState("Usuário");
  const [emailLogado, setEmailLogado] = useState("");

  useEffect(() => {
    carregarUsuarioLogado();
  }, []);

  useEffect(() => {
    carregarLogoEmpresa();
  }, [empresaId, logoUrlHook]);

  async function carregarLogoEmpresa() {
    if (logoUrlHook) {
      setLogoUrlBanco(null);
      return;
    }

    if (!empresaId) return;

    const { data, error } = await supabase
      .from("empresas")
      .select("logo_url")
      .eq("id", empresaId)
      .maybeSingle();

    if (error) {
      console.warn("Erro ao carregar logo da empresa:", error);
      return;
    }

    setLogoUrlBanco(data?.logo_url || null);
  }

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
        .select("nome, email")
        .eq("email", email)
        .maybeSingle();

      nomeEncontrado = usuario?.nome || "";
    }

    if (!nomeEncontrado && user.id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("nome, email")
        .eq("id", user.id)
        .maybeSingle();

      nomeEncontrado = profile?.nome || "";
    }

    setUsuarioLogado(nomeEncontrado || email.split("@")[0] || "Usuário");
    setEmailLogado(email);
  }

  async function sair() {
    await supabase.auth.signOut();
    navigate("/login");
  }

  function estaAtivo(rota: string) {
    return location.pathname === rota;
  }

  const menu = useMemo<MenuSecao[]>(() => {
    if (perfil === "admin" || perfil === "super_admin" || perfil === "admin_saas") {
      return menuAdmin;
    }

    if (perfil === "recepcao") {
      return [
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
            { nome: "Usuários", rota: "/usuarios" },
          ],
        },
      ];
    }

    if (perfil === "consulta") {
      return [
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
      ];
    }

    if (perfil === "profissional") {
      return [
        {
          titulo: "Minha área",
          itens: [
            { nome: "Agenda", rota: "/agenda" },
            { nome: "Financeiro", rota: "/financeiro" },
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
    }

    if (perfil === "financeiro") {
      return [
        {
          titulo: "Operação",
          itens: [
            { nome: "Financeiro", rota: "/financeiro" },
            { nome: "Despesas", rota: "/despesas" },
            { nome: "Pagamentos", rota: "/pagamentos" },
            { nome: "Relatórios", rota: "/relatorios" },
          ],
        },
      ];
    }

    return [];
  }, [perfil]);

  return (
    <aside
      style={{
        width: recolhida ? 88 : 280,
        minHeight: "100vh",
        background: corPrimaria,
        color: "#fff",
        transition: "width 0.2s ease",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ padding: 18, borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {logoUrl ? (
            <div
              style={{
                width: 58,
                height: 58,
                borderRadius: 16,
                background: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 6,
                boxShadow: "0 8px 18px rgba(0,0,0,0.12)",
                flexShrink: 0,
              }}
            >
              <img
                src={logoUrl}
                alt={empresaNome}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  display: "block",
                }}
              />
            </div>
          ) : (
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 999,
                background: "rgba(255,255,255,0.18)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
              }}
            >
              {empresaNome.charAt(0).toUpperCase()}
            </div>
          )}

          {!recolhida && (
            <div>
              <div style={{ fontWeight: 800, fontSize: 18 }}>{empresaNome}</div>
              <div style={{ opacity: 0.75, fontSize: 13 }}>Gestão de agendas</div>
            </div>
          )}
        </div>

        {!recolhida && (
          <div
            style={{
              marginTop: 14,
              borderRadius: 14,
              padding: "10px 12px",
              background: "rgba(255,255,255,0.10)",
              border: "1px solid rgba(255,255,255,0.10)",
            }}
          >
            <div style={{ opacity: 0.7, fontSize: 11, fontWeight: 800, textTransform: "uppercase" }}>
              Usuário logado
            </div>
            <div style={{ fontWeight: 900, fontSize: 13, marginTop: 3 }}>
              {usuarioLogado}
            </div>
            {emailLogado && (
              <div style={{ opacity: 0.7, fontSize: 11, marginTop: 2, wordBreak: "break-all" }}>
                {emailLogado}
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={() => setRecolhida((valor) => !valor)}
          style={{
            marginTop: 14,
            width: recolhida ? 46 : 46,
            height: 36,
            border: "none",
            borderRadius: 12,
            padding: "8px 10px",
            cursor: "pointer",
            color: "#fff",
            background: "rgba(255,255,255,0.14)",
            fontWeight: 900,
            fontSize: 18,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {recolhida ? "›" : "‹"}
        </button>
      </div>

      <nav style={{ flex: 1, padding: 14, overflowY: "auto" }}>
        {menu.map((secao) => (
          <div key={secao.titulo} style={{ marginBottom: 24 }}>
            {!recolhida && (
              <div
                style={{
                  fontSize: 12,
                  textTransform: "uppercase",
                  opacity: 0.65,
                  fontWeight: 800,
                  marginBottom: 10,
                  letterSpacing: 0.5,
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
                  textAlign: "left",
                  border: "none",
                  borderRadius: 14,
                  padding: recolhida ? "14px 10px" : "14px 18px",
                  marginBottom: 8,
                  cursor: "pointer",
                  color: "#fff",
                  fontWeight: 800,
                  background: estaAtivo(item.rota)
                    ? "rgba(255,255,255,0.24)"
                    : "transparent",
                }}
              >
                {recolhida ? item.nome.charAt(0) : item.nome}
              </button>
            ))}
          </div>
        ))}
      </nav>

      <div style={{ padding: 14, borderTop: "1px solid rgba(255,255,255,0.12)" }}>
        <button
          type="button"
          onClick={sair}
          style={{
            width: "100%",
            border: "none",
            borderRadius: 14,
            padding: "13px 16px",
            cursor: "pointer",
            background: "#ef4444",
            color: "#fff",
            fontWeight: 800,
          }}
        >
          {recolhida ? "S" : "Sair"}
        </button>
      </div>
    </aside>
  );
}
