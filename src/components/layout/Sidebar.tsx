import { NavLink } from "react-router-dom";

const menuItems = [
  { label: "Dashboard", path: "/dashboard" },
  { label: "Agenda", path: "/agenda" },
  { label: "Clientes", path: "/clientes" },
  { label: "Financeiro", path: "/financeiro" },
  { label: "Serviços", path: "#" },
  { label: "Profissionais", path: "#" },
  { label: "Usuários", path: "#" },
  { label: "Configurações", path: "#" },
];

export default function Sidebar() {
  return (
    <aside className="w-72 min-h-screen bg-slate-950 text-white px-5 py-6">
      <div className="mb-10">
        <h1 className="text-2xl font-bold tracking-tight">VendlySys</h1>
        <p className="text-sm text-slate-400 mt-1">Gestão de agendas</p>
      </div>

      <nav className="space-y-2">
        {menuItems.map((item) =>
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
                    ? "bg-orange-500 text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`
              }
            >
              {item.label}
            </NavLink>
          )
        )}
      </nav>
    </aside>
  );
}