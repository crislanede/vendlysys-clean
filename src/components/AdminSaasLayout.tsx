import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Building2, ChevronRight, LayoutDashboard, LogOut, Menu, ShieldCheck, UsersRound, X } from "lucide-react";
import { supabase } from "../lib/supabase";
import { filtroEmailExato } from "../lib/email";
import { useEmpresa } from "../hooks/useEmpresa";

export default function AdminSaasLayout() {
  const navigate = useNavigate();
  const { empresas, empresaId, trocarEmpresa, carregandoEmpresa } = useEmpresa();
  const [empresaDestino, setEmpresaDestino] = useState("");
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
        const { data } = await supabase
          .from("usuarios")
          .select("perfil")
          .filter("email", "imatch", filtroEmailExato(currentEmail))
          .maybeSingle();
        if (mounted) setPerfil(data?.perfil || "");
      }
    })();
    return () => { mounted = false; };
  }, []);

  const empresaSelecionada = empresas.find((item) => item.id === empresaDestino)
    || empresas.find((item) => item.id === empresaId)
    || empresas[0];

  function acessarMinhaEmpresa() {
    if (carregandoEmpresa || !empresaSelecionada) return;
    // A seleção é limitada às empresas retornadas por useEmpresa, a partir
    // dos vínculos ativos do usuário ou de sua titularidade.
    navigate("/agenda");
    setMenuAberto(false);
    if (empresaSelecionada.id !== empresaId) {
      // trocarEmpresa recarrega a página; navegue antes para manter /agenda.
      trocarEmpresa(empresaSelecionada.id);
    }
  }

  async function sair() {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  }

  const links = [
    { to: "/admin/empresas", label: "Empresas", icon: Building2 },
    { to: "/admin/usuarios", label: "Usuários SaaS", icon: UsersRound },
    { to: "/admin/seguranca", label: "Segurança da conta", icon: ShieldCheck },
  ];

  return (
    <div className="min-h-screen min-w-0 bg-[#F5F7F8] lg:flex">
      {menuAberto && <button aria-label="Fechar menu" type="button" onClick={() => setMenuAberto(false)} className="fixed inset-0 z-40 bg-[#101F2A]/60 backdrop-blur-[2px] lg:hidden" />}
      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur lg:hidden">
        <button type="button" aria-label="Abrir menu" aria-expanded={menuAberto} onClick={() => setMenuAberto(true)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-[#20313A] shadow-sm"><Menu size={21}/></button>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#20313A] text-white"><LayoutDashboard size={18}/></div>
        <div className="min-w-0"><p className="text-sm font-extrabold tracking-tight text-[#20313A]">VendlySys</p><p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-slate-400">Administração</p></div>
      </header>
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[min(85vw,288px)] flex-col border-r border-white/10 bg-[#182B34] text-white shadow-2xl transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:w-[232px] lg:shrink-0 lg:translate-x-0 lg:shadow-none ${menuAberto ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex-1 overflow-y-auto">
          <div className="border-b border-white/10 px-5 pb-5 pt-5">
            <div className="flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#427F87] to-[#5B9296] shadow-lg shadow-slate-900/10"><LayoutDashboard size={21}/></div>
              <button type="button" aria-label="Fechar menu" onClick={() => setMenuAberto(false)} className="rounded-lg p-2 text-slate-400 lg:hidden"><X size={20}/></button>
            </div>
            <h1 className="mt-3 text-lg font-extrabold tracking-tight">VendlySys <span className="font-medium text-slate-400">Admin</span></h1>
            <p className="mt-1 text-xs text-slate-400">Central de gestão da plataforma</p>
          </div>
          <div className="px-3 pt-5">
            <p className="px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Workspace</p>
            <nav className="mt-2 space-y-1" aria-label="Administração SaaS">
              {links.map(({ to, label, icon: Icon }) => (
                <NavLink key={to} to={to} onClick={() => setMenuAberto(false)}
                  className={({isActive}) => `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${isActive ? "bg-white/12 text-white ring-1 ring-white/10" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}>
                  <Icon size={19} className="shrink-0"/><span className="flex-1">{label}</span><ChevronRight size={15} className="opacity-50"/>
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="mx-3 mt-5 rounded-2xl border border-white/15 bg-white/5 p-3">
            <p className="px-1 text-xs font-semibold text-white">Acessar minha empresa</p>
            {empresas.length > 1 && (
              <select
                aria-label="Selecione sua empresa"
                value={empresaSelecionada?.id || ""}
                onChange={(event) => setEmpresaDestino(event.target.value)}
                className="mt-2 w-full rounded-lg border border-white/20 bg-[#203943] px-2 py-2 text-xs text-white"
              >
                {empresas.map((item) => (
                  <option key={item.id} value={item.id}>{item.nome}</option>
                ))}
              </select>
            )}
            <button
              type="button"
              onClick={acessarMinhaEmpresa}
              disabled={carregandoEmpresa || !empresaSelecionada}
              className="mt-2 w-full rounded-xl bg-teal-600 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {carregandoEmpresa ? "Verificando vínculo..." : empresaSelecionada ? `Abrir ${empresaSelecionada.nome}` : "Sem empresa vinculada"}
            </button>
            {!carregandoEmpresa && empresas.length === 0 && (
              <p className="mt-2 text-xs text-amber-200">Sua conta não possui vínculo ativo com uma empresa. Solicite o vínculo antes de acessar a agenda.</p>
            )}
          </div>
          <div className="mx-3 mt-5 rounded-2xl border border-emerald-400/15 bg-emerald-400/5 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300"><ShieldCheck size={16}/> Área administrativa</div>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">Acesso reservado à gestão do VendlySys.</p>
          </div>
        </div>
        <div className="border-t border-white/10 p-4">
          <div className="mb-3 flex min-w-0 items-center gap-3 rounded-xl bg-white/5 px-3 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-500/15 text-sm font-bold text-teal-100">{email ? email[0].toUpperCase() : "A"}</div>
            <div className="min-w-0"><p className="truncate text-xs font-semibold text-white" title={email}>{email || "Administrador"}</p><p className="mt-0.5 text-[11px] text-slate-400">{perfil || "Administração"}</p></div>
          </div>
          <button type="button" onClick={sair} className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/10 hover:text-white"><LogOut size={18}/> Sair da conta</button>
        </div>
      </aside>
      <main className="min-w-0 w-full flex-1 overflow-x-hidden"><Outlet /></main>
    </div>
  );
}
