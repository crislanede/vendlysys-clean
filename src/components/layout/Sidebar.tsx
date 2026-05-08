import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

type MenuItem = {
  nome: string;
  rota: string;
};

type MenuSecao = {
  titulo: string;
  itens: MenuItem[];
};

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const [isMobile, setIsMobile] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);

  useEffect(() => {
    function verificarTela() {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);

      if (!mobile) {
        setMenuAberto(false);
      }
    }

    verificarTela();
    window.addEventListener("resize", verificarTela);

    return () => window.removeEventListener("resize", verificarTela);
  }, []);

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
        { nome: "Pacotes / Combos", rota: "/pacotes-clientes" },
        { nome: "Usuários", rota: "/usuarios" },
      ],
    },
   {
  titulo: "Operação",
  itens: [
    { nome: "Financeiro", rota: "/financeiro" },
    { nome: "Caixa", rota: "/caixa" },
    { nome: "Comissões", rota: "/comissoes" },
    { nome: "Configurações", rota: "/configuracoes" },
  ],
},
    {
      titulo: "Ajuda",
      itens: [{ nome: "Manual do Sistema", rota: "/manual" }],
    },
  ];

  function irPara(rota: string) {
    navigate(rota);
    setMenuAberto(false);
  }

  return (
    <>
      {isMobile && (
        <button
          type="button"
          onClick={() => setMenuAberto(true)}
          style={{
            position: "fixed",
            top: 12,
            left: 12,
            zIndex: 1000,
            width: 44,
            height: 44,
            borderRadius: 12,
            border: 0,
            background: "#5b3cc4",
            color: "#fff",
            fontSize: 24,
            fontWeight: 900,
            boxShadow: "0 8px 20px rgba(0,0,0,.22)",
            cursor: "pointer",
          }}
        >
          ☰
        </button>
      )}

      {isMobile && menuAberto && (
        <div
          onClick={() => setMenuAberto(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, .55)",
            zIndex: 998,
          }}
        />
      )}

      <aside
        style={{
          width: 240,
          background: "#5b3cc4",
          color: "#fff",
          height: "100vh",
          padding: "16px 12px",
          boxSizing: "border-box",
          position: isMobile ? "fixed" : "sticky",
          top: 0,
          left: isMobile ? (menuAberto ? 0 : -260) : 0,
          zIndex: 999,
          transition: "left .25s ease",
          overflowY: "auto",
          boxShadow:
            isMobile && menuAberto
              ? "10px 0 30px rgba(0,0,0,.28)"
              : "none",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 18 }}>Espaço Áurea</h2>

          {isMobile && (
            <button
              type="button"
              onClick={() => setMenuAberto(false)}
              style={{
                background: "rgba(255,255,255,.15)",
                color: "#fff",
                border: 0,
                borderRadius: 10,
                width: 34,
                height: 34,
                fontSize: 20,
                cursor: "pointer",
              }}
            >
              ×
            </button>
          )}
        </div>

        {menuAdmin.map((secao) => (
          <div key={secao.titulo} style={{ marginBottom: 20 }}>
            <div
              style={{
                fontSize: 12,
                opacity: 0.7,
                marginBottom: 8,
              }}
            >
              {secao.titulo}
            </div>

            {secao.itens.map((item) => {
              const ativo = location.pathname === item.rota;

              return (
                <div
                  key={item.rota}
                  onClick={() => irPara(item.rota)}
                  style={{
                    padding: "12px 12px",
                    borderRadius: 10,
                    cursor: "pointer",
                    background: ativo ? "#7c5ce6" : "transparent",
                    marginBottom: 6,
                    transition: "0.2s",
                    fontWeight: ativo ? 900 : 700,
                  }}
                >
                  {item.nome}
                </div>
              );
            })}
          </div>
        ))}
      </aside>
    </>
  );
}