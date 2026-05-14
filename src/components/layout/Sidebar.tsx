import { NavLink } from "react-router-dom";
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

type MenuItem = {
  nome: string;
  rota: string;
  icone?: any;
};

type MenuSecao = {
  titulo: string;
  itens: MenuItem[];
};

export default function Sidebar() {
  const menuAdmin: MenuSecao[] = [
    {
      titulo: "Principal",
      itens: [
        {
          nome: "Dashboard",
          rota: "/dashboard",
          icone: LayoutDashboard,
        },
        {
          nome: "Agenda",
          rota: "/agenda",
          icone: CalendarDays,
        },
        {
          nome: "Consulta",
          rota: "/consulta-agendamentos",
          icone: Search,
        },
      ],
    },

    {
      titulo: "Cadastros",
      itens: [
        {
          nome: "Clientes",
          rota: "/clientes",
          icone: Users,
        },
        {
          nome: "Profissionais",
          rota: "/profissionais",
          icone: UserSquare2,
        },
        {
          nome: "Serviços",
          rota: "/servicos",
          icone: Scissors,
        },
        {
  nome: "Combos",
  rota: "/marketing-pacotes",
  icone: Package,
},
        {
          nome: "Produtos",
          rota: "/produtos",
          icone: Package,
        },
      ],
    },

    {
      titulo: "Financeiro",
      itens: [
        {
          nome: "Financeiro",
          rota: "/financeiro",
          icone: Wallet,
        },
        {
          nome: "Caixa",
          rota: "/caixa",
          icone: DollarSign,
        },
        {
          nome: "Comissões",
          rota: "/comissoes",
          icone: BadgeDollarSign,
        },
        {
          nome: "Pagamentos",
          rota: "/pagamentos",
          icone: CreditCard,
        },
      ],
    },

    {
      titulo: "WhatsApp",
      itens: [
        {
          nome: "WhatsApp",
          rota: "/whatsapp",
          icone: MessageCircle,
        },
        {
          nome: "Mensagens WhatsApp",
          rota: "/whatsapp-mensagens",
          icone: MessageCircle,
        },
        {
          nome: "Campanhas WhatsApp",
          rota: "/campanhas",
          icone: Megaphone,
        },
        {
          nome: "Fila WhatsApp",
          rota: "/whatsapp-fila",
          icone: MessageCircle,
        },
      ],
    },

    {
      titulo: "Sistema",
      itens: [
        {
          nome: "Bloqueios",
          rota: "/bloqueios",
          icone: Ban,
        },
        {
          nome: "Configurações",
          rota: "/configuracoes",
          icone: Settings,
        },
        {
          nome: "Relatórios",
          rota: "/relatorios",
          icone: FileText,
        },
        {
          nome: "Anamnese",
          rota: "/anamnese-configuracao",
          icone: ShieldCheck,
        },
      ],
    },
  ];

  return (
    <aside className="w-72 min-h-screen bg-[#3d1d78] text-white flex flex-col">
      <div className="px-6 py-8">
        <h1 className="text-2xl font-black">VendlySys</h1>
        <p className="text-sm text-slate-300 mt-1">
          Gestão inteligente
        </p>
      </div>

      <nav className="flex-1 px-4 pb-10 overflow-y-auto">
        {menuAdmin.map((secao) => (
          <div key={secao.titulo} className="mb-8">
            <h2 className="px-3 mb-3 text-xs uppercase tracking-wider text-slate-300">
              {secao.titulo}
            </h2>

            <div className="space-y-1">
              {secao.itens.map((item) => {
                const Icone = item.icone;

                return (
                  <NavLink
                    key={item.rota}
                    to={item.rota}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-2xl px-4 py-3 transition-all ${
                        isActive
                          ? "bg-violet-500 text-white font-bold"
                          : "text-slate-200 hover:bg-white/10"
                      }`
                    }
                  >
                    {Icone && <Icone size={20} />}
                    <span>{item.nome}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}