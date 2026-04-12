import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const menuItems = [
  { label: "Dashboard", path: "/dashboard", perfis: ["admin"] },
  { label: "Agenda", path: "/agenda", perfis: ["admin", "agenda"] },
  { label: "Clientes", path: "/clientes", perfis: ["admin", "agenda"] },
  { label: "Financeiro", path: "/financeiro", perfis: ["admin"] },
  { label: "Serviços", path: "/servicos", perfis: ["admin"] },
  { label: "Profissionais", path: "#", perfis: ["admin"] },
  { label: "Usuários", path: "/usuarios", perfis: ["admin"] },
  { label: "Configurações", path: "#", perfis: ["admin"] },
];

export default function Sidebar() {
  const { profile } = useAuth();

  const perfil = profile?.perfil ?? "agenda";
  const nome = profile?.nome ?? "Usuário";

  const menuFiltrado = menuItems.filter((item) =>
    item.perfis.includes(perfil)
  );

  return (
    <aside className="w-72 min-h-screen bg-slate-950 text-white px-5 py-6 border-r border-slate-800">
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-11 w-11 rounded-2xl bg-orange-500 flex items-center justify-center font-bold text-lg">
            V
          </div>

          <div>
            <h1 className="text-xl font-bold tracking-tight">VendlySys</h1>
            <p className="text-xs text-slate-400">Gestão de agendas</p>
          </div>
        </div>
      </div>

      <nav className="space-y-2">
        {menuFiltrado.map((item) =>
          item.path === "#" ? (
            <span
              key={item.label}
              className="block rounded-xl px-4 py-3 text-sm font-medium text-slate-500 cursor-not-allowed"
            >
              {item.label}
            </span>
          ) : (
            <NavLink
              key={item.label}
              to={item.path}
              className={({ isActive }) =>
                `block rounded-xl px-4 py-3 text-sm font-medium transition ${
                  isActive
                    ? "bg-orange-500 text-white shadow-sm"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`
              }
            >
              {item.label}
            </NavLink>
          )
        )}
      </nav>

      <div className="mt-10 rounded-2xl bg-slate-900 border border-slate-800 p-4">
        <p className="text-sm font-medium text-white">Usuário</p>
        <p className="text-xs text-slate-400 mt-1">{nome}</p>
        <p className="text-xs text-slate-400 mt-1">Perfil: {perfil}</p>
      </div>
    </aside>
  );
}