import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function AdminSaasLayout() {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string>("");
  const [perfil, setPerfil] = useState<string>("");

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
    <div className="min-h-screen bg-slate-100 flex">
      <aside className="w-[280px] bg-[#070B18] text-white flex flex-col justify-between">
        <div>
          <div className="p-7 border-b border-white/10">
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

      <main className="flex-1 min-w-0 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
