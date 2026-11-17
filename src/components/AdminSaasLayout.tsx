import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { supabase } from "../lib/supabase";

export default function AdminSaasLayout() {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string>("");
  const [perfil, setPerfil] = useState<string>("");
  const [menuAberto, setMenuAberto] = useState(false);

  useEffect(() => {
    async function carregarUsuario() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const emailUsuario = user?.email || "";
      setEmail(emailUsuario);

      if (emailUsuario) {
        const { data } = await supabase
          .from("usuarios")
          .select("perfil")
          .eq("email", emailUsuario)
          .maybeSingle();

        setPerfil(data?.perfil || "");
      }
    }

    carregarUsuario();
  }, []);

  async function sair() {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  }

  const linkBase =
    "block rounded-2xl px-5 py-4 font-bold transition hover:bg-slate-800";

  return (
    <div className="min-h-screen min-w-0 bg-slate-100 lg:flex">
      {menuAberto && <button type="button" aria-label="Fechar menu" onClick={() => setMenuAberto(false)} className="fixed inset-0 z-40 bg-slate-950/60 lg:hidden" />}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-[#070B18] px-4 py-3 text-white lg:hidden">
        <span className="font-extrabold tracking-tight">VendlySys Admin</span>
        <button type="button" aria-label="Abrir menu administrativo" aria-expanded={menuAberto} onClick={() => setMenuAberto(true)} className="rounded-xl border border-white/20 p-2"><Menu size={22} /></button>
      </header>
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[min(85vw,300px)] flex-col justify-between overflow-y-auto bg-[#070B18] text-white shadow-2xl transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:w-[280px] lg:shrink-0 lg:translate-x-0 lg:shadow-none ${menuAberto ? "translate-x-0" : "-translate-x-full"}`}>
        <div>
          <div className="p-5 sm:p-7 border-b border-white/10">
            <button type="button" aria-label="Fechar menu administrativo" onClick={() => setMenuAberto(false)} className="float-right rounded-lg p-1 text-slate-300 lg:hidden"><X size={22} /></button>
            <p className="text-xs font-black uppercase text-pink-500 tracking-wide">
              Administração SaaS
            </p>
            <h1 className="text-3xl font-black mt-2">VendlySys Admin</h1>
            <p className="text-sm text-slate-300 mt-1">
              Gestão global do sistema
            </p>

            <div className="mt-5 rounded-2xl bg-slate-900 p-4 text-sm">
              <p className="text-slate-400 text-xs uppercase font-bold">Logado como</p>
              <p className="break-all font-bold mt-1">{email || "-"}</p>
              {perfil && <p className="text-slate-400 text-xs mt-1">{perfil}</p>}
            </div>
          </div>

          <nav className="p-5 space-y-3">
            <NavLink
              to="/admin/empresas"
              onClick={() => setMenuAberto(false)}
              className={({ isActive }) =>
                `${linkBase} ${
                  isActive ? "bg-pink-600 text-white" : "bg-slate-900 text-white"
                }`
              }
            >
              Empresas
            </NavLink>

            <NavLink
              to="/admin/usuarios"
              onClick={() => setMenuAberto(false)}
              className={({ isActive }) =>
                `${linkBase} ${
                  isActive ? "bg-pink-600 text-white" : "bg-slate-900 text-white"
                }`
              }
            >
              Usuários SaaS
            </NavLink>
          </nav>
        </div>

        <div className="p-5 border-t border-white/10">
          <button
            type="button"
            onClick={sair}
            className="w-full rounded-2xl bg-red-600 px-5 py-4 font-bold text-white hover:bg-red-700 transition"
          >
            Sair
          </button>
        </div>
      </aside>

      <main className="w-full min-w-0 flex-1 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}
