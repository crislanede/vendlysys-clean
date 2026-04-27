import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../../lib/supabase";

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  async function sair() {
    await supabase.auth.signOut();
    navigate("/login");
  }

  function ativo(rota: string) {
    return location.pathname === rota;
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      <aside className="w-72 min-h-screen bg-slate-950 text-white flex flex-col">
        <div className="px-6 py-6 border-b border-white/10">
          <p className="text-xs uppercase text-pink-400 font-bold">
            Administração SaaS
          </p>
          <h1 className="text-2xl font-bold">VendlySys Admin</h1>
          <p className="text-sm text-white/60">
            Gestão de empresas e licenças
          </p>
        </div>

        <nav className="flex-1 px-4 py-5 space-y-2">
          <button
            onClick={() => navigate("/admin/licencas")}
            className={`w-full text-left px-4 py-3 rounded-2xl text-sm font-semibold ${
              ativo("/admin/licencas")
                ? "bg-pink-600 text-white"
                : "hover:bg-white/10 text-white/80"
            }`}
          >
            Licenças
          </button>

          <button
            onClick={() => navigate("/admin/empresas")}
            className={`w-full text-left px-4 py-3 rounded-2xl text-sm font-semibold ${
              ativo("/admin/empresas")
                ? "bg-pink-600 text-white"
                : "hover:bg-white/10 text-white/80"
            }`}
          >
            Empresas
          </button>

          <button
            onClick={() => navigate("/dashboard")}
            className="w-full text-left px-4 py-3 rounded-2xl text-sm font-semibold hover:bg-white/10 text-white/80"
          >
            Voltar ao sistema
          </button>
        </nav>

        <div className="p-4 border-t border-white/10">
          <button
            onClick={sair}
            className="w-full bg-white/10 hover:bg-white/20 rounded-2xl px-4 py-3 text-sm font-bold"
          >
            Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 min-h-screen overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}