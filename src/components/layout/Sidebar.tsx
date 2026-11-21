import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  CalendarDays,
  Search,
  Users,
  UserSquare2,
  Scissors,
  Package,
  Wallet,
  DollarSign,
  BadgeDollarSign,
  CreditCard,
  Megaphone,
  FileText,
  Settings,
  ShieldCheck,
  MessageCircle,
  Ban,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useEmpresa } from "../../hooks/useEmpresa";

type SidebarProps = {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
};

type MenuItem = {
  nome: string;
  rota: string;
  icone?: any;
  badge?: number;
};

type MenuSecao = {
  titulo: string;
  itens: MenuItem[];
};

export default function Sidebar({ mobileOpen = false, onCloseMobile }: SidebarProps) {
  const { empresaId } = useEmpresa();
  const location = useLocation();
  const [novosClientes, setNovosClientes] = useState(0);

  const estaNaTelaClientes = location.pathname.startsWith("/clientes");

  useEffect(() => {
    if (!empresaId) return;

    void carregarNovosClientes();

    const canal = supabase
      .channel(`novos-clientes-${empresaId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "clientes",
          filter: `empresa_id=eq.${empresaId}`,
        },
        () => {
          void carregarNovosClientes();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [empresaId, location.pathname]);

  useEffect(() => {
    if (!empresaId || !estaNaTelaClientes) return;

    void marcarNovosClientesComoVisualizados();
  }, [empresaId, estaNaTelaClientes]);

  async function carregarNovosClientes() {
    if (!empresaId) return;

    if (estaNaTelaClientes) {
      setNovosClientes(0);
      return;
    }

    const { count, error } = await supabase
      .from("clientes")
      .select("id", { count: "exact", head: true })
      .eq("empresa_id", empresaId)
      .eq("novo_cliente", true)
      .or("visualizado.is.null,visualizado.eq.false");

    if (error) {
      console.warn("Não foi possível carregar novos clientes:", error.message);
      return;
    }

    setNovosClientes(count || 0);
  }

  async function marcarNovosClientesComoVisualizados() {
    if (!empresaId) return;

    setNovosClientes(0);

    const { error } = await supabase
      .from("clientes")
      .update({
        novo_cliente: false,
        visualizado: true,
      })
      .eq("empresa_id", empresaId)
      .eq("novo_cliente", true)
      .or("visualizado.is.null,visualizado.eq.false");

    if (error) {
      console.warn(
        "Não foi possível marcar novos clientes como visualizados:",
        error.message,
      );
      return;
    }

    setNovosClientes(0);
  }

  const menuAdmin: MenuSecao[] = [
    {
      titulo: "Principal",
      itens: [
        { nome: "Dashboard", rota: "/dashboard", icone: LayoutDashboard },
        { nome: "Agenda", rota: "/agenda", icone: CalendarDays },
        { nome: "Consulta", rota: "/consulta-agendamentos", icone: Search },
      ],
    },
    {
      titulo: "Cadastros",
      itens: [
        {
          nome: "Clientes",
          rota: "/clientes",
          icone: Users,
          badge: estaNaTelaClientes ? 0 : novosClientes,
        },
        { nome: "Profissionais", rota: "/profissionais", icone: UserSquare2 },
        { nome: "Serviços", rota: "/servicos", icone: Scissors },
        { nome: "Combos", rota: "/marketing-pacotes", icone: Package },
        { nome: "Produtos", rota: "/produtos", icone: Package },
      ],
    },
    {
      titulo: "Financeiro",
      itens: [
        { nome: "Financeiro", rota: "/financeiro", icone: Wallet },
        { nome: "Caixa", rota: "/caixa", icone: DollarSign },
        { nome: "Comissões", rota: "/comissoes", icone: BadgeDollarSign },
        { nome: "Pagamentos", rota: "/pagamentos", icone: CreditCard },
      ],
    },
    {
      titulo: "WhatsApp",
      itens: [
        { nome: "WhatsApp", rota: "/whatsapp", icone: MessageCircle },
        {
          nome: "Mensagens WhatsApp",
          rota: "/whatsapp-mensagens",
          icone: MessageCircle,
        },
        { nome: "Campanhas WhatsApp", rota: "/campanhas", icone: Megaphone },
        { nome: "Fila WhatsApp", rota: "/whatsapp-fila", icone: MessageCircle },
      ],
    },
    {
      titulo: "Sistema",
      itens: [
        { nome: "Bloqueios", rota: "/bloqueios", icone: Ban },
        { nome: "Configurações", rota: "/configuracoes", icone: Settings },
        { nome: "Relatórios", rota: "/relatorios", icone: FileText },
        {
          nome: "Anamnese",
          rota: "/anamnese-configuracao",
          icone: ShieldCheck,
        },
      ],
    },
  ];

  return (
    <>
      {mobileOpen && (
        <button type="button" aria-label="Fechar menu de navegação" className="fixed inset-0 z-40 bg-slate-950/60 lg:hidden" onClick={onCloseMobile} />
      )}
      <aside aria-label="Navegação principal" className={`fixed inset-y-0 left-0 z-50 flex w-[272px] max-w-[85vw] flex-col border-r border-white/10 bg-[#11142b] text-white shadow-2xl transition-transform duration-200 lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:min-h-screen lg:shrink-0 lg:translate-x-0 lg:shadow-none ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
      <div className="flex items-start justify-between gap-2 border-b border-white/10 px-6 py-7">
        <div><h1 className="text-[25px] font-black tracking-tight"><span className="text-violet-300">Vendly</span>Sys</h1>
        <p className="text-sm text-slate-300 mt-1">Gestão inteligente</p></div>
        <button type="button" aria-label="Fechar menu" onClick={onCloseMobile} className="rounded-lg px-2 py-1 text-xl text-white hover:bg-white/10 lg:hidden">×</button>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-5 [scrollbar-width:thin] [scrollbar-color:#4c4b6b_transparent]">
        {menuAdmin.map((secao) => (
          <div key={secao.titulo} className="mb-6">
            <h2 className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
              {secao.titulo}
            </h2>

            <div className="space-y-1">
              {secao.itens.map((item) => {
                const Icone = item.icone;

                return (
                  <NavLink
                    key={item.rota}
                    to={item.rota}
                    onClick={onCloseMobile}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-150 ${
                        isActive
                          ? "bg-violet-500/20 text-white font-semibold ring-1 ring-violet-400/30 shadow-sm"
                          : "text-slate-300 hover:bg-white/10 hover:text-white"
                      }`
                    }
                  >
                    {Icone && <Icone size={18} className="shrink-0" />}
                    <span className="flex-1">{item.nome}</span>

                    {!!item.badge && item.badge > 0 && (
                      <span className="min-w-6 rounded-full bg-red-500 px-2 py-0.5 text-center text-[11px] font-black text-white shadow">
                        {item.badge > 99 ? "99+" : item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
    </>
  );
}
