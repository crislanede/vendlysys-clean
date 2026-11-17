import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Building2, ChevronRight, LayoutDashboard, LogOut, Menu, ShieldCheck, UsersRound, X } from "lucide-react";
import { supabase } from "../lib/supabase";

export default function AdminSaasLayout() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [perfil, setPerfil] = useState("");
  const [menuAberto, setMenuAberto] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!mounted) return;
      const currentEmail = user?.email || "";
      setEmail(currentEmail);
      if (currentEmail) {
        const { data } = await supabase.from("usuarios").select("perfil").eq("email", currentEmail).maybeSingle();
        if (mounted) setPerfil(data?.perfil || "");
      }
    })();
    return () => { mounted = false; };
  }, []);

  async function sair() {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  }

  const links = [
    { to: "/admin/empresas", label: "Empresas", icon: Building2 },
    { to: "/admin/usuarios", label: "Usuários SaaS", icon: UsersRound },
  ];

  return (
    <div className="min-h-screen min-w-0 bg-[#F6F7FB] lg:flex">
      {menuAberto && <button aria-label="Fechar menu" type="button" onClick={() => setMenuAberto(false)} className="fixed inset-0 z-40 bg-[#090D1C]/60 backdrop-blur-[2px] lg:hidden" />}
      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur lg:hidden">
        <button type="button" aria-label="Abrir menu" aria-expanded={menuAberto} onClick={() => setMenuAberto(true)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-[#171331] shadow-sm"><Menu size={21}/></button>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#171331] text-white"><LayoutDashboard size={18}/></div>
        <div className="min-w-0"><p className="text-sm font-extrabold tracking-tight text-[#171331]">VendlySys</p><p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-slate-400">Administração</p></div>
      </header>
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[min(85vw,288px)] flex-col border-r border-white/10 bg-[#111427] text-white shadow-2xl transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:w-[264px] lg:shrink-0 lg:translate-x-0 lg:shadow-none ${menuAberto ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex-1 overflow-y-auto">
          <div className="border-b border-white/10 px-6 pb-7 pt-7">
            <div className="flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#A855F7] to-[#E34D9B] shadow-lg shadow-fuchsia-900/30"><LayoutDashboard size={21}/></div>
              <button type="button" aria-label="Fechar menu" onClick={() => setMenuAberto(false)} className="rounded-lg p-2 text-slate-400 lg:hidden"><X size={20}/></button>
            </div>
            <h1 className="mt-5 text-xl font-extrabold tracking-tight">VendlySys <span className="font-medium text-slate-400">Admin</span></h1>
            <p className="mt-1 text-xs text-slate-400">Central de gestão da plataforma</p>
          </div>
          <div className="px-4 pt-7">
            <p className="px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Workspace</p>
            <nav className="mt-3 space-y-1.5" aria-label="Administração SaaS">
              {links.map(({ to, label, icon: Icon }) => (
                <NavLink key={to} to={to} onClick={() => setMenuAberto(false)}
                  className={({isActive}) => `group flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition-colors ${isActive ? "bg-white/12 text-white ring-1 ring-white/10" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}>
                  <Icon size={19} className="shrink-0"/><span className="flex-1">{label}</span><ChevronRight size={15} className="opacity-50"/>
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="mx-4 mt-8 rounded-2xl border border-emerald-400/15 bg-emerald-400/5 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300"><ShieldCheck size={16}/> Área administrativa</div>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">Acesso reservado à gestão do VendlySys.</p>
          </div>
        </div>
        <div className="border-t border-white/10 p-4">
          <div className="mb-3 flex min-w-0 items-center gap-3 rounded-xl bg-white/5 px-3 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-fuchsia-500/20 text-sm font-bold text-fuchsia-200">{email ? email[0].toUpperCase() : "A"}</div>
            <div className="min-w-0"><p className="truncate text-xs font-semibold text-white" title={email}>{email || "Administrador"}</p><p className="mt-0.5 text-[11px] text-slate-400">{perfil || "Administração"}</p></div>
          </div>
          <button type="button" onClick={sair} className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/10 hover:text-white"><LogOut size={18}/> Sair da conta</button>
        </div>
      </aside>
      <main className="min-w-0 w-full flex-1 overflow-x-hidden"><Outlet /></main>
    </div>
  );
}
