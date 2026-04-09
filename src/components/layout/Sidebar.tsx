const menuItems = [
  "Dashboard",
  "Agenda",
  "Clientes",
  "Serviços",
  "Financeiro",
  "Profissionais",
  "Usuários",
  "Configurações",
];

export default function Sidebar() {
  return (
    <aside className="w-72 min-h-screen bg-slate-950 text-white px-5 py-6">
      <div className="mb-10">
        <h1 className="text-2xl font-bold tracking-tight">VendlySys</h1>
        <p className="text-sm text-slate-400 mt-1">Gestão de agendas</p>
      </div>

      <nav className="space-y-2">
        {menuItems.map((item, index) => (
          <a
            key={item}
            href="#"
            className={`block rounded-xl px-4 py-3 text-sm font-medium transition ${
              index === 0
                ? "bg-orange-500 text-white"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            {item}
          </a>
        ))}
      </nav>
    </aside>
  );
}