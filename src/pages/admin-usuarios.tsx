import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { supabase } from "../lib/supabase";

type Usuario = {
  id: string;
  nome: string | null;
  email: string | null;
  perfil: string | null;
  ativo?: boolean | null;
  created_at?: string | null;
};

type Empresa = {
  id: string;
  nome_fantasia: string | null;
  nome?: string | null;
  slug?: string | null;
  ativa?: boolean | null;
  bloqueada?: boolean | null;
};

type Vinculo = {
  id?: string;
  user_id: string;
  empresa_id: string;
  perfil: string | null;
  nome_empresa?: string | null;
  empresas?: Empresa | null;
};

const PERFIS_SAAS = ["super_admin", "admin_saas"];
const PERFIS_USUARIO = ["super_admin", "admin_saas", "admin", "recepcao", "profissional", "financeiro", "consulta"];
const PERFIS_EMPRESA = ["admin", "recepcao", "profissional", "financeiro", "consulta"];

const LABEL_PERFIL: Record<string, string> = {
  super_admin: "Super admin",
  admin_saas: "Admin SaaS",
  admin: "Administrador da empresa",
  recepcao: "Recepção",
  profissional: "Profissional",
  financeiro: "Financeiro",
  consulta: "Consulta",
};

function nomeEmpresa(empresa?: Empresa | null) {
  return empresa?.nome_fantasia || empresa?.nome || empresa?.slug || empresa?.id || "Empresa";
}

export default function AdminUsuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [vinculos, setVinculos] = useState<Vinculo[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [autorizado, setAutorizado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [busca, setBusca] = useState("");

  const [modalUsuarioAberto, setModalUsuarioAberto] = useState(false);
  const [modalVinculoAberto, setModalVinculoAberto] = useState(false);

  const [id, setId] = useState("");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [perfil, setPerfil] = useState("admin_saas");

  const [usuarioVinculo, setUsuarioVinculo] = useState<Usuario | null>(null);
  const [vinculoEmpresaId, setVinculoEmpresaId] = useState("");
  const [vinculoPerfil, setVinculoPerfil] = useState("admin");

  useEffect(() => {
    iniciar();
  }, []);

  async function iniciar() {
    setLoading(true);
    setErro(null);

    const { data: authData, error: authError } = await supabase.auth.getUser();
    const userId = authData.user?.id;
    const userEmail = authData.user?.email || "";

    if (authError || !userId) {
      setAutorizado(false);
      setErro("Você precisa estar logada para acessar a administração SaaS.");
      setLoading(false);
      return;
    }

    let perfilAtual: string | null = null;

    const { data: usuarioPorId, error: erroPorId } = await supabase
      .from("usuarios")
      .select("perfil")
      .eq("id", userId)
      .maybeSingle();

    if (erroPorId) {
      setAutorizado(false);
      setErro("Não foi possível validar seu perfil: " + erroPorId.message);
      setLoading(false);
      return;
    }

    perfilAtual = usuarioPorId?.perfil || null;

    if (!perfilAtual && userEmail) {
      const { data: usuarioPorEmail, error: erroPorEmail } = await supabase
        .from("usuarios")
        .select("perfil")
        .eq("email", userEmail)
        .maybeSingle();

      if (erroPorEmail) {
        setAutorizado(false);
        setErro("Não foi possível validar seu perfil por e-mail: " + erroPorEmail.message);
        setLoading(false);
        return;
      }

      perfilAtual = usuarioPorEmail?.perfil || null;
    }

    if (!PERFIS_SAAS.includes(perfilAtual || "")) {
      setAutorizado(false);
      setErro(`Acesso restrito aos perfis super_admin ou admin_saas. Perfil encontrado: ${perfilAtual || "não cadastrado"}.`);
      setLoading(false);
      return;
    }

    setAutorizado(true);
    await carregarTudo();
  }

  async function carregarTudo() {
    setLoading(true);
    setErro(null);

    const [usuariosResp, empresasResp, vinculosResp] = await Promise.all([
      supabase.from("usuarios").select("id,nome,email,perfil,ativo,created_at").order("nome", { ascending: true }),
      supabase.rpc("admin_listar_empresas"),
      supabase.rpc("admin_listar_vinculos"),
    ]);

    const usuariosData = (usuariosResp.data || []) as Usuario[];
    const empresasData = (empresasResp.data || []) as Empresa[];
    const vinculosData = (vinculosResp.data || []) as Vinculo[];

    if (usuariosResp.error) {
      setErro("Erro ao carregar usuários: " + usuariosResp.error.message);
      setUsuarios([]);
    } else {
      setUsuarios(usuariosData);
    }

    if (empresasResp.error) {
      setErro("Erro ao carregar empresas: " + empresasResp.error.message);
      setEmpresas([]);
    } else {
      setEmpresas(empresasData);
    }

    if (vinculosResp.error) {
      setErro("Erro ao carregar vínculos: " + vinculosResp.error.message);
      setVinculos([]);
    } else {
      const vinculosComEmpresa = vinculosData.map((vinculo) => ({
        ...vinculo,
        empresas:
          empresasData.find((empresa) => empresa.id === vinculo.empresa_id) ||
          (vinculo.nome_empresa
            ? { id: vinculo.empresa_id, nome_fantasia: vinculo.nome_empresa }
            : null),
      }));

      setVinculos(vinculosComEmpresa);
    }

    setLoading(false);
  }

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return usuarios;

    return usuarios.filter((usuario) => {
      const empresasDoUsuario = vinculos
        .filter((v) => v.user_id === usuario.id)
        .map((v) => nomeEmpresa(v.empresas) || v.nome_empresa || "")
        .join(" ");

      return `${usuario.nome || ""} ${usuario.email || ""} ${usuario.perfil || ""} ${empresasDoUsuario}`
        .toLowerCase()
        .includes(termo);
    });
  }, [usuarios, vinculos, busca]);

  function vinculosDoUsuario(userId: string) {
    return vinculos.filter((v) => v.user_id === userId);
  }

  function limparFormularioUsuario() {
    setId("");
    setNome("");
    setEmail("");
    setPerfil("admin_saas");
  }

  function abrirNovoUsuario() {
    limparFormularioUsuario();
    setErro(null);
    setSucesso(null);
    setModalUsuarioAberto(true);
  }

  function abrirEditarUsuario(usuario: Usuario) {
    setId(usuario.id || "");
    setNome(usuario.nome || "");
    setEmail(usuario.email || "");
    setPerfil(usuario.perfil || "admin_saas");
    setErro(null);
    setSucesso(null);
    setModalUsuarioAberto(true);
  }

  function abrirVinculo(usuario: Usuario) {
    setUsuarioVinculo(usuario);
    setVinculoEmpresaId("");
    setVinculoPerfil("admin");
    setErro(null);
    setSucesso(null);
    setModalVinculoAberto(true);
  }

  async function salvarUsuario(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    setSucesso(null);

    const idLimpo = id.trim();
    const nomeLimpo = nome.trim();
    const emailLimpo = email.trim().toLowerCase();

    if (!idLimpo) {
      setErro("Informe o ID do usuário criado no Supabase Auth.");
      return;
    }

    if (!nomeLimpo) {
      setErro("Informe o nome do usuário.");
      return;
    }

    if (!emailLimpo) {
      setErro("Informe o e-mail do usuário.");
      return;
    }

    if (!PERFIS_USUARIO.includes(perfil)) {
      setErro("Perfil inválido.");
      return;
    }

    setSalvando(true);

    const { error } = await supabase.from("usuarios").upsert(
      {
        id: idLimpo,
        nome: nomeLimpo,
        email: emailLimpo,
        perfil,
        ativo: true,
      },
      { onConflict: "id" }
    );

    setSalvando(false);

    if (error) {
      setErro("Erro ao salvar usuário: " + error.message);
      return;
    }

    setSucesso("Usuário salvo com sucesso.");
    setModalUsuarioAberto(false);
    limparFormularioUsuario();
    await carregarTudo();
  }

  async function salvarVinculo(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    setSucesso(null);

    if (!usuarioVinculo?.id) {
      setErro("Selecione o usuário.");
      return;
    }

    if (!vinculoEmpresaId) {
      setErro("Selecione a empresa.");
      return;
    }

    if (!PERFIS_EMPRESA.includes(vinculoPerfil)) {
      setErro("Perfil de empresa inválido.");
      return;
    }

    const { error } = await supabase.rpc("admin_salvar_vinculo", {
      p_user_id: usuarioVinculo.id,
      p_empresa_id: vinculoEmpresaId,
      p_perfil: vinculoPerfil,
    });

    if (error) {
      setErro("Erro ao salvar vínculo: " + error.message);
      return;
    }

    setSucesso("Vínculo salvo com sucesso.");
    setModalVinculoAberto(false);
    setUsuarioVinculo(null);
    setVinculoEmpresaId("");
    setVinculoPerfil("admin");
    await carregarTudo();
  }

  async function removerVinculo(vinculo: Vinculo) {
    const empresaNome = nomeEmpresa(vinculo.empresas) || vinculo.nome_empresa || vinculo.empresa_id;
    const confirmar = window.confirm(`Remover vínculo com ${empresaNome}?`);
    if (!confirmar) return;

    setErro(null);
    setSucesso(null);

    const { error } = await supabase.rpc("admin_remover_vinculo", {
      p_user_id: vinculo.user_id,
      p_empresa_id: vinculo.empresa_id,
    });

    if (error) {
      setErro("Erro ao remover vínculo: " + error.message);
      return;
    }

    setSucesso("Vínculo removido com sucesso.");
    await carregarTudo();
  }

  async function alterarPerfil(usuario: Usuario, novoPerfil: string) {
    setErro(null);
    setSucesso(null);

    if (!PERFIS_USUARIO.includes(novoPerfil)) {
      setErro("Perfil inválido.");
      return;
    }

    const { error } = await supabase.from("usuarios").update({ perfil: novoPerfil }).eq("id", usuario.id);

    if (error) {
      setErro("Erro ao alterar perfil: " + error.message);
      return;
    }

    setSucesso("Perfil atualizado com sucesso.");
    await carregarTudo();
  }

  async function enviarRedefinicaoSenha(usuario: Usuario) {
    setErro(null);
    setSucesso(null);

    const emailUsuario = (usuario.email || "").trim().toLowerCase();

    if (!emailUsuario) {
      setErro("Este usuário não possui e-mail cadastrado.");
      return;
    }

    const confirmar = window.confirm(`Enviar e-mail de redefinição de senha para ${emailUsuario}?`);
    if (!confirmar) return;

    const { error } = await supabase.auth.resetPasswordForEmail(emailUsuario, {
      redirectTo: `${window.location.origin}/resetar-senha`,
    });

    if (error) {
      setErro("Erro ao enviar redefinição de senha: " + error.message);
      return;
    }

    setSucesso(`E-mail de redefinição de senha enviado para ${emailUsuario}.`);
  }

  if (loading && !autorizado) {
    return <div className="p-6">Carregando...</div>;
  }

  if (!autorizado) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-2xl border shadow-sm p-6 max-w-2xl">
          <p className="text-red-600 font-bold uppercase">Acesso negado</p>
          <h1 className="text-2xl font-bold mt-2">Usuários SaaS</h1>
          <p className="text-slate-600 mt-2">{erro}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase" style={{ color: "var(--cor-primaria, #4b2f3f)" }}>
            Administração SaaS
          </p>
          <h1 className="text-3xl font-bold text-slate-900">Usuários e vínculos</h1>
          <p className="text-slate-500">
            Gerencie usuários globais, empresas vinculadas e redefinição de senha.
          </p>
        </div>

        <div className="flex gap-3">
          <button type="button" onClick={abrirNovoUsuario} className="px-4 py-2 rounded-xl font-bold text-white" style={{ background: "var(--cor-primaria, #4b2f3f)" }}>
            + Novo usuário
          </button>
          <button type="button" onClick={carregarTudo} className="border px-4 py-2 rounded-xl font-bold bg-white">
            Atualizar
          </button>
        </div>
      </div>

      {erro && <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 font-medium">{erro}</div>}
      {sucesso && <div className="bg-green-50 border border-green-200 text-green-700 rounded-2xl p-4 font-medium">{sucesso}</div>}

      <div className="bg-white rounded-2xl border shadow-sm p-4">
        <input
          value={busca}
          onChange={(event) => setBusca(event.target.value)}
          placeholder="Buscar por nome, e-mail, perfil ou empresa vinculada..."
          className="w-full border rounded-xl px-4 py-3"
        />
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="font-bold">Usuários cadastrados</h2>
          <span className="text-sm text-slate-500">{filtrados.length} usuário(s)</span>
        </div>

        {loading ? (
          <div className="p-6">Carregando...</div>
        ) : filtrados.length === 0 ? (
          <div className="p-6 text-slate-500">Nenhum usuário encontrado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr className="text-left">
                  <th className="p-4">Usuário</th>
                  <th className="p-4">Perfil global</th>
                  <th className="p-4">Empresas vinculadas</th>
                  <th className="p-4">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((usuario) => {
                  const listaVinculos = vinculosDoUsuario(usuario.id);

                  return (
                    <tr key={usuario.id} className="border-t align-top">
                      <td className="p-4 min-w-[260px]">
                        <p className="font-bold text-slate-900">{usuario.nome || "Sem nome"}</p>
                        <p className="text-xs text-slate-500">{usuario.email || "-"}</p>
                        <p className="text-xs text-slate-400">ID: {usuario.id}</p>
                      </td>

                      <td className="p-4 min-w-[170px]">
                        <select
                          value={usuario.perfil || "usuario"}
                          onChange={(event) => alterarPerfil(usuario, event.target.value)}
                          className="border rounded-xl px-3 py-2 bg-white"
                        >
                          {PERFIS_USUARIO.map((p) => (
                            <option key={p} value={p}>{LABEL_PERFIL[p] || p}</option>
                          ))}
                        </select>
                      </td>

                      <td className="p-4 min-w-[320px]">
                        {listaVinculos.length === 0 ? (
                          <span className="text-slate-400">Sem empresa vinculada</span>
                        ) : (
                          <div className="space-y-2">
                            {listaVinculos.map((vinculo) => (
                              <div key={`${vinculo.user_id}-${vinculo.empresa_id}`} className="flex flex-wrap items-center gap-2 bg-slate-50 border rounded-xl px-3 py-2">
                                <div>
                                  <p className="font-bold text-slate-800">{nomeEmpresa(vinculo.empresas) || vinculo.nome_empresa || vinculo.empresa_id}</p>
                                  <p className="text-xs text-slate-500">Perfil: {vinculo.perfil || "-"}</p>
                                </div>
                                <button type="button" onClick={() => removerVinculo(vinculo)} className="ml-auto border border-red-200 text-red-700 px-3 py-1 rounded-lg font-bold bg-red-50">
                                  Remover
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>

                      <td className="p-4 min-w-[300px]">
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => abrirEditarUsuario(usuario)} className="border px-3 py-2 rounded-xl font-bold bg-white">
                            Editar
                          </button>
                          <button type="button" onClick={() => enviarRedefinicaoSenha(usuario)} className="border border-blue-200 text-blue-700 px-3 py-2 rounded-xl font-bold bg-blue-50">
                            Resetar senha
                          </button>
                          <button type="button" onClick={() => abrirVinculo(usuario)} className="border border-emerald-200 text-emerald-700 px-3 py-2 rounded-xl font-bold bg-emerald-50">
                            Vincular empresa
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalUsuarioAberto && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl p-6">
            <div className="flex justify-between items-start gap-4 mb-4">
              <div>
                <h2 className="text-xl font-bold">{id ? "Editar usuário" : "Novo usuário"}</h2>
                <p className="text-sm text-slate-500">Primeiro crie o usuário em Authentication &gt; Users no Supabase. Depois cole aqui o ID do Auth.</p>
              </div>
              <button type="button" onClick={() => setModalUsuarioAberto(false)} className="border rounded-xl px-3 py-2 font-bold bg-white">Fechar</button>
            </div>

            <form onSubmit={salvarUsuario} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold mb-1">ID do usuário no Auth</label>
                <input value={id} onChange={(event) => setId(event.target.value)} placeholder="Ex.: 68c715e5-9695-458f-ba8d-5c145347e00a" className="w-full border rounded-xl px-4 py-3" />
              </div>

              <div>
                <label className="block text-sm font-bold mb-1">Nome</label>
                <input value={nome} onChange={(event) => setNome(event.target.value)} placeholder="Nome do usuário" className="w-full border rounded-xl px-4 py-3" />
              </div>

              <div>
                <label className="block text-sm font-bold mb-1">E-mail</label>
                <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="email@exemplo.com" className="w-full border rounded-xl px-4 py-3" />
              </div>

              <div>
                <label className="block text-sm font-bold mb-1">Perfil global</label>
                <select value={perfil} onChange={(event) => setPerfil(event.target.value)} className="w-full border rounded-xl px-4 py-3 bg-white">
                  {PERFIS_USUARIO.map((p) => (
                    <option key={p} value={p}>{LABEL_PERFIL[p] || p}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2 flex flex-col md:flex-row gap-3 pt-2">
                <button type="submit" disabled={salvando} className="px-5 py-3 rounded-xl font-bold text-white disabled:opacity-60" style={{ background: "var(--cor-primaria, #4b2f3f)" }}>
                  {salvando ? "Salvando..." : "Salvar usuário"}
                </button>
                <button type="button" onClick={limparFormularioUsuario} className="border px-5 py-3 rounded-xl font-bold bg-white">
                  Limpar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalVinculoAberto && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6">
            <div className="flex justify-between items-start gap-4 mb-4">
              <div>
                <h2 className="text-xl font-bold">Vincular empresa</h2>
                <p className="text-sm text-slate-500">
                  Usuário: <b>{usuarioVinculo?.nome || usuarioVinculo?.email}</b>
                </p>
              </div>
              <button type="button" onClick={() => setModalVinculoAberto(false)} className="border rounded-xl px-3 py-2 font-bold bg-white">Fechar</button>
            </div>

            <form onSubmit={salvarVinculo} className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-bold mb-1">Empresa</label>
                <select value={vinculoEmpresaId} onChange={(event) => setVinculoEmpresaId(event.target.value)} className="w-full border rounded-xl px-4 py-3 bg-white">
                  <option value="">Selecione...</option>
                  {empresas.map((empresa) => (
                    <option key={empresa.id} value={empresa.id}>
                      {nomeEmpresa(empresa)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold mb-1">Perfil na empresa</label>
                <select value={vinculoPerfil} onChange={(event) => setVinculoPerfil(event.target.value)} className="w-full border rounded-xl px-4 py-3 bg-white">
                  {PERFIS_EMPRESA.map((p) => (
                    <option key={p} value={p}>{LABEL_PERFIL[p] || p}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col md:flex-row gap-3 pt-2">
                <button type="submit" className="px-5 py-3 rounded-xl font-bold text-white" style={{ background: "#2563eb" }}>
                  Vincular / atualizar
                </button>
                <button type="button" onClick={() => setModalVinculoAberto(false)} className="border px-5 py-3 rounded-xl font-bold bg-white">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
