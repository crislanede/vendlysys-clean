import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type Usuario = {
  id: string;
  nome: string | null;
  email: string | null;
  perfil: string | null;
  empresa_id: string | null;
  ativo?: boolean | null;
  created_at: string | null;
};

type Empresa = {
  id: string;
  nome: string | null;
  slug?: string | null;
};

const formInicial = {
  nome: "",
  email: "",
  perfil: "cliente",
  empresa_id: "",
  ativo: true,
};

const ITENS_POR_PAGINA = 8;

export default function AdminUsuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(1);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  const [modalAberto, setModalAberto] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState<Usuario | null>(null);
  const [form, setForm] = useState(formInicial);

  useEffect(() => {
    carregarTudo();
  }, []);

  async function carregarTudo() {
    setLoading(true);
    setErro(null);

    await Promise.all([carregarUsuarios(), carregarEmpresas()]);

    setLoading(false);
  }

  async function carregarUsuarios() {
    const { data, error } = await supabase
      .from("usuarios")
      .select("id, nome, email, perfil, empresa_id, ativo, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      setErro("Erro ao carregar usuários: " + error.message);
      setUsuarios([]);
      return;
    }

    setUsuarios((data || []) as Usuario[]);
  }

  async function carregarEmpresas() {
    const { data, error } = await supabase
      .from("empresas")
      .select("id, nome, slug")
      .order("nome", { ascending: true });

    if (error) {
      console.error("Erro ao carregar empresas:", error);
      setEmpresas([]);
      return;
    }

    setEmpresas((data || []) as Empresa[]);
  }

  function atualizarCampo(campo: keyof typeof formInicial, valor: string | boolean) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  }

  function abrirNovo() {
    setUsuarioEditando(null);
    setForm(formInicial);
    setErro(null);
    setSucesso(null);
    setModalAberto(true);
  }

  function editar(usuario: Usuario) {
    setUsuarioEditando(usuario);
    setForm({
      nome: usuario.nome || "",
      email: usuario.email || "",
      perfil: usuario.perfil || "cliente",
      empresa_id: usuario.empresa_id || "",
      ativo: usuario.ativo !== false,
    });
    setErro(null);
    setSucesso(null);
    setModalAberto(true);
  }

  async function salvarUsuario(e?: React.FormEvent) {
    e?.preventDefault();
    setErro(null);
    setSucesso(null);

    if (!form.email.trim()) {
      setErro("E-mail é obrigatório.");
      return;
    }

    setSalvando(true);

    const payload = {
      nome: form.nome.trim() || null,
      email: form.email.trim().toLowerCase(),
      perfil: form.perfil,
      empresa_id: form.empresa_id || null,
      ativo: form.ativo,
    };

    const { error } = usuarioEditando
      ? await supabase.from("usuarios").update(payload).eq("id", usuarioEditando.id)
      : await supabase.from("usuarios").insert(payload);

    setSalvando(false);

    if (error) {
      setErro("Erro ao salvar usuário: " + error.message);
      return;
    }

    setModalAberto(false);
    setForm(formInicial);
    setSucesso(usuarioEditando ? "Usuário atualizado com sucesso." : "Usuário cadastrado com sucesso.");
    await carregarUsuarios();
  }

  async function alternarAtivo(usuario: Usuario) {
    setErro(null);
    setSucesso(null);

    const novoStatus = usuario.ativo === false;

    const { error } = await supabase
      .from("usuarios")
      .update({ ativo: novoStatus })
      .eq("id", usuario.id);

    if (error) {
      setErro("Erro ao atualizar status do usuário: " + error.message);
      return;
    }

    setUsuarios((atuais) =>
      atuais.map((item) => (item.id === usuario.id ? { ...item, ativo: novoStatus } : item)),
    );
  }

  async function excluirUsuario(usuario: Usuario) {
    const confirmar = window.confirm(`Excluir o usuário ${usuario.email}?`);
    if (!confirmar) return;

    const { error } = await supabase.from("usuarios").delete().eq("id", usuario.id);

    if (error) {
      setErro("Erro ao excluir usuário: " + error.message);
      return;
    }

    setSucesso("Usuário excluído com sucesso.");
    await carregarUsuarios();
  }

  const empresasPorId = useMemo(() => {
    const mapa: Record<string, Empresa> = {};
    empresas.forEach((empresa) => {
      mapa[empresa.id] = empresa;
    });
    return mapa;
  }, [empresas]);

  const usuariosFiltrados = useMemo(() => {
    const termo = busca.toLowerCase().trim();
    if (!termo) return usuarios;

    return usuarios.filter((usuario) => {
      const empresa = usuario.empresa_id ? empresasPorId[usuario.empresa_id] : null;

      return `${usuario.nome || ""} ${usuario.email || ""} ${usuario.perfil || ""} ${empresa?.nome || ""} ${empresa?.slug || ""}`
        .toLowerCase()
        .includes(termo);
    });
  }, [busca, usuarios, empresasPorId]);

  const totalPaginas = Math.max(1, Math.ceil(usuariosFiltrados.length / ITENS_POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const usuariosPaginados = usuariosFiltrados.slice(
    (paginaAtual - 1) * ITENS_POR_PAGINA,
    paginaAtual * ITENS_POR_PAGINA,
  );

  const metricas = useMemo(() => {
    return {
      total: usuarios.length,
      ativos: usuarios.filter((u) => u.ativo !== false).length,
      inativos: usuarios.filter((u) => u.ativo === false).length,
      superAdmin: usuarios.filter((u) => u.perfil === "super_admin").length,
      adminSaas: usuarios.filter((u) => u.perfil === "admin_saas").length,
      adminEmpresa: usuarios.filter((u) => u.perfil === "admin").length,
    };
  }, [usuarios]);

  function nomeEmpresa(empresaId: string | null) {
    if (!empresaId) return "Sem empresa";
    return empresasPorId[empresaId]?.nome || "Empresa não encontrada";
  }

  function formatarData(data: string | null) {
    if (!data) return "-";
    return new Date(data).toLocaleDateString("pt-BR");
  }

  function badgePerfil(perfil: string | null) {
    const base = "inline-flex rounded-full px-3 py-1 text-xs font-black";

    if (perfil === "super_admin") return `${base} bg-pink-100 text-pink-700`;
    if (perfil === "admin_saas") return `${base} bg-purple-100 text-purple-700`;
    if (perfil === "admin") return `${base} bg-indigo-100 text-indigo-700`;
    if (perfil === "agenda") return `${base} bg-blue-100 text-blue-700`;
    if (perfil === "cliente") return `${base} bg-slate-100 text-slate-700`;

    return `${base} bg-yellow-100 text-yellow-700`;
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-6 space-y-6">
      <div className="rounded-[28px] bg-gradient-to-r from-slate-950 via-purple-950 to-pink-800 p-6 md:p-8 text-white shadow-xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-pink-300">Administração SaaS</p>
            <h1 className="mt-3 text-3xl md:text-4xl font-black">Usuários SaaS</h1>
            <p className="mt-2 max-w-3xl text-sm md:text-base text-white/80">
              Gerencie usuários globais, acessos administrativos, permissões e vínculos com empresas.
            </p>
          </div>

          <button
            onClick={abrirNovo}
            className="rounded-2xl bg-white px-5 py-3 font-black text-slate-950 shadow-lg transition hover:scale-[1.02]"
          >
            + Novo usuário
          </button>
        </div>
      </div>

      {erro && <Alerta tipo="erro" texto={erro} />}
      {sucesso && <Alerta tipo="sucesso" texto={sucesso} />}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Card titulo="Total" valor={metricas.total} detalhe="usuários" />
        <Card titulo="Ativos" valor={metricas.ativos} detalhe="com acesso" />
        <Card titulo="Inativos" valor={metricas.inativos} detalhe="bloqueados" />
        <Card titulo="Super Admin" valor={metricas.superAdmin} detalhe="global" />
        <Card titulo="Admin SaaS" valor={metricas.adminSaas} detalhe="operação" />
        <Card titulo="Admin Empresa" valor={metricas.adminEmpresa} detalhe="empresas" />
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row">
          <input
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setPagina(1);
            }}
            placeholder="Buscar por nome, e-mail, perfil ou empresa..."
            className="min-h-[48px] flex-1 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-pink-400 focus:ring-4 focus:ring-pink-100"
          />

          <button
            onClick={carregarTudo}
            disabled={loading}
            className="min-h-[48px] rounded-2xl border border-slate-200 px-5 text-sm font-black text-slate-800 transition hover:bg-slate-50 disabled:opacity-50"
          >
            {loading ? "Atualizando..." : "Atualizar"}
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-1 border-b border-slate-100 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-950">Lista de usuários</h2>
            <p className="text-sm text-slate-500">{usuariosFiltrados.length} usuário(s) encontrado(s).</p>
          </div>
          <p className="text-xs font-bold text-slate-500">Página {paginaAtual} de {totalPaginas}</p>
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-4">Usuário</th>
                <th className="px-5 py-4">Perfil</th>
                <th className="px-5 py-4">Empresa</th>
                <th className="px-5 py-4">Criado em</th>
                <th className="px-5 py-4">Ativo</th>
                <th className="px-5 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {usuariosPaginados.length === 0 ? (
                <tr>
                  <td className="px-5 py-10 text-center text-slate-500" colSpan={6}>Nenhum usuário encontrado.</td>
                </tr>
              ) : (
                usuariosPaginados.map((usuario) => (
                  <tr key={usuario.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-4">
                      <p className="font-black text-slate-900">{usuario.nome || "Sem nome"}</p>
                      <p className="text-xs text-slate-500">{usuario.email || "Sem e-mail"}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={badgePerfil(usuario.perfil)}>{usuario.perfil || "sem perfil"}</span>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{nomeEmpresa(usuario.empresa_id)}</td>
                    <td className="px-5 py-4 text-slate-600">{formatarData(usuario.created_at)}</td>
                    <td className="px-5 py-4">
                      <Switch ativo={usuario.ativo !== false} onClick={() => alternarAtivo(usuario)} />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => editar(usuario)} className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-100">Editar</button>
                        <button onClick={() => excluirUsuario(usuario)} className="rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-100">Excluir</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="space-y-3 p-4 md:hidden">
          {usuariosPaginados.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">Nenhum usuário encontrado.</p>
          ) : (
            usuariosPaginados.map((usuario) => (
              <div key={usuario.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black text-slate-950">{usuario.nome || "Sem nome"}</p>
                    <p className="text-xs text-slate-500">{usuario.email || "Sem e-mail"}</p>
                  </div>
                  <span className={badgePerfil(usuario.perfil)}>{usuario.perfil || "sem perfil"}</span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="font-bold text-slate-400">Empresa</p>
                    <p className="mt-1 font-bold text-slate-700">{nomeEmpresa(usuario.empresa_id)}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="font-bold text-slate-400">Criado em</p>
                    <p className="mt-1 font-bold text-slate-700">{formatarData(usuario.created_at)}</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <Switch ativo={usuario.ativo !== false} onClick={() => alternarAtivo(usuario)} />
                  <div className="flex gap-2">
                    <button onClick={() => editar(usuario)} className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-black text-blue-700">Editar</button>
                    <button onClick={() => excluirUsuario(usuario)} className="rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-700">Excluir</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 p-4">
          <button
            disabled={paginaAtual <= 1}
            onClick={() => setPagina((atual) => Math.max(1, atual - 1))}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-black disabled:opacity-40"
          >
            Anterior
          </button>

          <p className="text-sm font-black text-slate-700">Página {paginaAtual} de {totalPaginas}</p>

          <button
            disabled={paginaAtual >= totalPaginas}
            onClick={() => setPagina((atual) => Math.min(totalPaginas, atual + 1))}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-black disabled:opacity-40"
          >
            Próxima
          </button>
        </div>
      </div>

      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <form onSubmit={salvarUsuario} className="w-full max-w-2xl overflow-hidden rounded-[28px] bg-white shadow-2xl">
            <div className="bg-gradient-to-r from-slate-950 via-purple-950 to-pink-800 p-6 text-white">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-pink-200">
                {usuarioEditando ? "Editar acesso" : "Novo acesso"}
              </p>
              <h2 className="mt-2 text-2xl font-black">
                {usuarioEditando ? "Editar usuário" : "Novo usuário SaaS"}
              </h2>
              <p className="mt-1 text-sm text-white/75">Defina perfil, empresa vinculada e status de acesso.</p>
            </div>

            <div className="space-y-4 p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Campo label="Nome" value={form.nome} onChange={(valor) => atualizarCampo("nome", valor)} placeholder="Nome do usuário" />
                <Campo
                  label="E-mail"
                  type="email"
                  value={form.email}
                  onChange={(valor) => atualizarCampo("email", valor)}
                  placeholder="email@dominio.com"
                  disabled={Boolean(usuarioEditando)}
                  required
                />

                <div>
                  <label className="mb-2 block text-sm font-black text-slate-900">Perfil</label>
                  <select
                    value={form.perfil}
                    onChange={(e) => atualizarCampo("perfil", e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-pink-400 focus:ring-4 focus:ring-pink-100"
                  >
                    <option value="cliente">Cliente</option>
                    <option value="agenda">Agenda</option>
                    <option value="admin">Admin empresa</option>
                    <option value="admin_saas">Admin SaaS</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-black text-slate-900">Empresa vinculada</label>
                  <select
                    value={form.empresa_id}
                    onChange={(e) => atualizarCampo("empresa_id", e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-pink-400 focus:ring-4 focus:ring-pink-100"
                  >
                    <option value="">Sem empresa / acesso global</option>
                    {empresas.map((empresa) => (
                      <option key={empresa.id} value={empresa.id}>
                        {empresa.nome || empresa.slug || empresa.id}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div>
                  <p className="font-black text-slate-900">Usuário ativo</p>
                  <p className="text-sm text-slate-500">Quando inativo, o acesso pode ser bloqueado nas regras do sistema.</p>
                </div>
                <input
                  type="checkbox"
                  checked={form.ativo}
                  onChange={(e) => atualizarCampo("ativo", e.target.checked)}
                  className="h-5 w-5 accent-pink-600"
                />
              </label>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 p-6 md:flex-row md:justify-end">
              <button
                type="button"
                onClick={() => setModalAberto(false)}
                className="rounded-2xl border border-slate-200 px-5 py-3 font-black text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={salvando}
                className="rounded-2xl bg-pink-600 px-5 py-3 font-black text-white shadow-lg shadow-pink-600/20 hover:bg-pink-700 disabled:opacity-50"
              >
                {salvando ? "Salvando..." : usuarioEditando ? "Salvar alterações" : "Criar usuário"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function Card({ titulo, valor, detalhe }: { titulo: string; valor: number; detalhe: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
      <p className="text-xs font-black uppercase text-slate-500">{titulo}</p>
      <p className="mt-2 text-2xl font-black text-slate-950 md:text-3xl">{valor}</p>
      <p className="mt-1 text-xs text-slate-400">{detalhe}</p>
    </div>
  );
}

function Alerta({ tipo, texto }: { tipo: "erro" | "sucesso"; texto: string }) {
  const classe = tipo === "erro" ? "border-red-200 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-700";
  return <div className={`rounded-2xl border p-4 text-sm font-bold ${classe}`}>{texto}</div>;
}

function Campo({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  disabled = false,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (valor: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-black text-slate-900">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-pink-400 focus:ring-4 focus:ring-pink-100 disabled:bg-slate-100 disabled:text-slate-400"
      />
    </div>
  );
}

function Switch({ ativo, onClick }: { ativo: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative h-7 w-12 rounded-full transition ${ativo ? "bg-green-500" : "bg-slate-300"}`}
      title={ativo ? "Ativo" : "Inativo"}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${ativo ? "left-6" : "left-1"}`}
      />
    </button>
  );
}
