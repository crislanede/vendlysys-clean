import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type Empresa = {
  id: string;
  nome: string;
  slug: string | null;
  email: string | null;
  telefone: string | null;
  plano: string | null;
  status_assinatura: string | null;
  trial_inicio: string | null;
  trial_fim: string | null;
  licenca_vitalicia: boolean | null;
  bloqueada: boolean | null;
  ativa: boolean | null;
  data_bloqueio: string | null;
  created_at: string | null;
};

type PerfilUsuario = {
  perfil: string | null;
};

type NovaEmpresa = {
  nome: string;
  slug: string;
  email: string;
  telefone: string;
  plano: string;
  diasTrial: string;
};

const novaEmpresaInicial: NovaEmpresa = {
  nome: "",
  slug: "",
  email: "",
  telefone: "",
  plano: "teste",
  diasTrial: "7",
};

export default function AdminEmpresas() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mostrarCadastro, setMostrarCadastro] = useState(false);
  const [autorizado, setAutorizado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [novaEmpresa, setNovaEmpresa] = useState<NovaEmpresa>(novaEmpresaInicial);

  useEffect(() => {
    iniciar();
  }, []);

  async function iniciar() {
    setLoading(true);
    setErro(null);

    const { data: authData, error: authError } = await supabase.auth.getUser();
    const userId = authData.user?.id;

    if (authError || !userId) {
      setAutorizado(false);
      setErro("Você precisa estar logado para acessar a administração.");
      setLoading(false);
      return;
    }

    const email = authData.user?.email || "";
    let usuario: PerfilUsuario | null = null;

    const { data: usuarioPorId, error: erroPorId } = await supabase
      .from("usuarios")
      .select("perfil")
      .eq("id", userId)
      .maybeSingle<PerfilUsuario>();

    if (erroPorId) {
      setAutorizado(false);
      setErro("Não foi possível validar o perfil do usuário pelo ID: " + erroPorId.message);
      setLoading(false);
      return;
    }

    usuario = usuarioPorId || null;

    if (!usuario && email) {
      const { data: usuarioPorEmail, error: erroPorEmail } = await supabase
        .from("usuarios")
        .select("perfil")
        .eq("email", email)
        .maybeSingle<PerfilUsuario>();

      if (erroPorEmail) {
        setAutorizado(false);
        setErro("Não foi possível validar o perfil do usuário pelo e-mail: " + erroPorEmail.message);
        setLoading(false);
        return;
      }

      usuario = usuarioPorEmail || null;
    }

    if (!["super_admin", "admin_saas"].includes(usuario?.perfil || "")) {
      setAutorizado(false);
      setErro(
        `Acesso restrito aos perfis super_admin ou admin_saas. Login atual: ${email || "sem e-mail"}. Perfil encontrado: ${usuario?.perfil || "não cadastrado"}.`
      );
      setLoading(false);
      return;
    }

    setAutorizado(true);
    await carregar();
  }

  async function carregar() {
    setLoading(true);
    setErro(null);

    const { data, error } = await supabase
      .from("empresas")
      .select(
        "id,nome,slug,email,telefone,plano,status_assinatura,trial_inicio,trial_fim,licenca_vitalicia,bloqueada,ativa,data_bloqueio,created_at"
      )
      .order("created_at", { ascending: false });

    if (error) {
      setEmpresas([]);
      setErro("Erro ao carregar empresas: " + error.message);
      setLoading(false);
      return;
    }

    setEmpresas((data || []) as Empresa[]);
    setLoading(false);
  }

  function gerarSlug(valor: string) {
    return valor
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function atualizarNovaEmpresa(campo: keyof NovaEmpresa, valor: string) {
    setNovaEmpresa((atual) => {
      if (campo === "nome") {
        const slugAtualFoiManual = atual.slug && atual.slug !== gerarSlug(atual.nome);
        return {
          ...atual,
          nome: valor,
          slug: slugAtualFoiManual ? atual.slug : gerarSlug(valor),
        };
      }

      if (campo === "slug") {
        return { ...atual, slug: gerarSlug(valor) };
      }

      return { ...atual, [campo]: valor };
    });
  }

  async function criarEmpresa(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    setSucesso(null);

    const nome = novaEmpresa.nome.trim();
    const slug = gerarSlug(novaEmpresa.slug || novaEmpresa.nome);
    const email = novaEmpresa.email.trim() || null;
    const telefone = novaEmpresa.telefone.trim() || null;
    const diasTrial = Number(novaEmpresa.diasTrial || 7);

    if (!nome) {
      setErro("Informe o nome da empresa.");
      return;
    }

    if (!slug) {
      setErro("Informe um slug válido para a empresa.");
      return;
    }

    const trialInicio = new Date();
    const trialFim = new Date();
    trialFim.setDate(trialFim.getDate() + (Number.isFinite(diasTrial) ? diasTrial : 7));

    setSalvando(true);

    const plano = novaEmpresa.plano || "teste";
    const licencaVitalicia = plano === "vitalicio";
    const statusAssinatura = licencaVitalicia ? "vitalicio" : plano === "mensal" ? "ativo" : "trial";

    const { error } = await supabase.from("empresas").insert({
      nome,
      slug,
      email,
      telefone,
      ativa: true,
      bloqueada: false,
      plano,
      status_assinatura: statusAssinatura,
      licenca_vitalicia: licencaVitalicia,
      trial_inicio: licencaVitalicia ? null : trialInicio.toISOString(),
      trial_fim: licencaVitalicia ? null : trialFim.toISOString(),
      data_bloqueio: null,
    });

    setSalvando(false);

    if (error) {
      setErro("Erro ao criar empresa: " + error.message);
      return;
    }

    setNovaEmpresa(novaEmpresaInicial);
    setMostrarCadastro(false);
    setSucesso("Empresa cadastrada com sucesso.");
    await carregar();
  }

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return empresas;

    return empresas.filter((empresa) =>
      `${empresa.nome || ""} ${empresa.email || ""} ${empresa.slug || ""} ${empresa.telefone || ""}`
        .toLowerCase()
        .includes(termo)
    );
  }, [empresas, busca]);

  const metricas = useMemo(() => {
    return {
      total: empresas.length,
      ativas: empresas.filter((e) => e.ativa !== false && !e.bloqueada).length,
      bloqueadas: empresas.filter((e) => e.bloqueada).length,
      vitalicias: empresas.filter((e) => e.licenca_vitalicia).length,
      trial: empresas.filter((e) => e.status_assinatura === "trial").length,
    };
  }, [empresas]);

  async function atualizar(id: string, dados: Partial<Empresa>) {
    setErro(null);
    setSucesso(null);

    const { error } = await supabase.from("empresas").update(dados).eq("id", id);

    if (error) {
      setErro("Erro ao atualizar empresa: " + error.message);
      return;
    }

    await carregar();
  }

  async function ativarPago(empresa: Empresa) {
    await atualizar(empresa.id, {
      ativa: true,
      plano: "mensal",
      status_assinatura: "ativo",
      licenca_vitalicia: false,
      bloqueada: false,
      data_bloqueio: null,
    });
  }

  async function vitalicio(empresa: Empresa) {
    await atualizar(empresa.id, {
      ativa: true,
      plano: "vitalicio",
      status_assinatura: "vitalicio",
      licenca_vitalicia: true,
      bloqueada: false,
      trial_fim: null,
      data_bloqueio: null,
    });
  }

  async function bloquear(empresa: Empresa) {
    const confirmar = window.confirm(`Bloquear a empresa ${empresa.nome}?`);
    if (!confirmar) return;

    await atualizar(empresa.id, {
      bloqueada: true,
      ativa: false,
      status_assinatura: "bloqueado",
      data_bloqueio: new Date().toISOString(),
    });
  }

  async function desbloquear(empresa: Empresa) {
    await atualizar(empresa.id, {
      ativa: true,
      bloqueada: false,
      status_assinatura: empresa.licenca_vitalicia ? "vitalicio" : "ativo",
      data_bloqueio: null,
    });
  }

  async function renovarTrial(empresa: Empresa) {
    const novaData = new Date();
    novaData.setDate(novaData.getDate() + 7);

    await atualizar(empresa.id, {
      ativa: true,
      plano: "teste",
      status_assinatura: "trial",
      licenca_vitalicia: false,
      bloqueada: false,
      trial_inicio: new Date().toISOString(),
      trial_fim: novaData.toISOString(),
      data_bloqueio: null,
    });
  }

  function formatarData(data: string | null) {
    if (!data) return "-";
    return new Date(data).toLocaleDateString("pt-BR");
  }

  function statusVisual(empresa: Empresa) {
    if (empresa.bloqueada || empresa.ativa === false) return "Bloqueada";
    if (empresa.licenca_vitalicia) return "Vitalícia";

    if (
      empresa.trial_fim &&
      new Date(empresa.trial_fim).getTime() < Date.now() &&
      empresa.status_assinatura === "trial"
    ) {
      return "Trial vencido";
    }

    if (empresa.status_assinatura === "ativo") return "Ativa";
    if (empresa.status_assinatura === "trial") return "Trial";

    return empresa.status_assinatura || "-";
  }

  function classeStatus(empresa: Empresa) {
    if (empresa.bloqueada || empresa.ativa === false) return "bg-red-100 text-red-700";
    if (empresa.licenca_vitalicia) return "bg-purple-100 text-purple-700";
    if (empresa.status_assinatura === "ativo") return "bg-green-100 text-green-700";
    return "bg-yellow-100 text-yellow-700";
  }

  if (loading && empresas.length === 0) {
    return <div className="p-6">Carregando administração...</div>;
  }

  if (!autorizado) {
    return (
      <div className="p-6 max-w-2xl">
        <div className="bg-white border rounded-2xl shadow-sm p-6">
          <p className="text-sm font-bold uppercase text-red-600">Acesso negado</p>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Administração SaaS</h1>
          <p className="text-slate-600 mt-2">{erro || "Seu usuário não tem permissão para acessar esta página."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p style={{ color: "var(--cor-primaria, #4b2f3f)" }} className="text-sm font-bold uppercase">
            Administração SaaS
          </p>
          <h1 className="text-3xl font-bold text-slate-900">Empresas cadastradas</h1>
          <p className="text-slate-500">Acompanhe empresas, trials, bloqueios e licenças.</p>
        </div>

        <button
          onClick={() => setMostrarCadastro((valor) => !valor)}
          style={{ backgroundColor: "var(--cor-primaria, #4b2f3f)" }}
          className="text-white px-5 py-3 rounded-xl font-bold hover:opacity-90 transition"
        >
          {mostrarCadastro ? "Fechar cadastro" : "+ Nova empresa"}
        </button>
      </div>

      {erro && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm font-medium">
          {erro}
        </div>
      )}

      {sucesso && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-2xl p-4 text-sm font-medium">
          {sucesso}
        </div>
      )}

      {mostrarCadastro && (
        <form onSubmit={criarEmpresa} className="bg-white rounded-2xl border shadow-sm p-5 space-y-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Nova empresa</h2>
            <p className="text-sm text-slate-500">
              Cadastro administrativo para suporte, implantação ou criação manual de uma nova empresa.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Campo
              label="Nome da empresa"
              value={novaEmpresa.nome}
              onChange={(valor) => atualizarNovaEmpresa("nome", valor)}
              placeholder="Ex.: Espaço Áurea"
              required
            />

            <Campo
              label="Slug"
              value={novaEmpresa.slug}
              onChange={(valor) => atualizarNovaEmpresa("slug", valor)}
              placeholder="ex.: espaco-aurea"
              required
            />

            <Campo
              label="E-mail"
              type="email"
              value={novaEmpresa.email}
              onChange={(valor) => atualizarNovaEmpresa("email", valor)}
              placeholder="contato@empresa.com"
            />

            <Campo
              label="Telefone"
              value={novaEmpresa.telefone}
              onChange={(valor) => atualizarNovaEmpresa("telefone", valor)}
              placeholder="(00) 00000-0000"
            />

            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">Plano inicial</label>
              <select
                value={novaEmpresa.plano}
                onChange={(e) => atualizarNovaEmpresa("plano", e.target.value)}
                className="w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-purple-200"
              >
                <option value="teste">Teste grátis</option>
                <option value="mensal">Mensal pago</option>
                <option value="vitalicio">Vitalício</option>
              </select>
            </div>

            <Campo
              label="Dias de trial"
              type="number"
              value={novaEmpresa.diasTrial}
              onChange={(valor) => atualizarNovaEmpresa("diasTrial", valor)}
              placeholder="7"
              disabled={novaEmpresa.plano === "vitalicio"}
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={salvando}
              style={{ backgroundColor: "var(--cor-primaria, #4b2f3f)" }}
              className="text-white px-5 py-3 rounded-xl font-bold disabled:opacity-50"
            >
              {salvando ? "Salvando..." : "Cadastrar empresa"}
            </button>

            <button
              type="button"
              onClick={() => setNovaEmpresa(novaEmpresaInicial)}
              className="border px-5 py-3 rounded-xl font-bold"
            >
              Limpar
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card title="Total" value={metricas.total} />
        <Card title="Ativas" value={metricas.ativas} />
        <Card title="Bloqueadas" value={metricas.bloqueadas} />
        <Card title="Vitalícias" value={metricas.vitalicias} />
        <Card title="Trial" value={metricas.trial} />
      </div>

      <div className="bg-white rounded-2xl border shadow-sm p-4">
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por empresa, e-mail, telefone ou slug..."
          className="w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-purple-200"
        />
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center gap-3">
          <h2 className="font-bold">Lista de empresas</h2>
          <button onClick={carregar} disabled={loading} className="border px-4 py-2 rounded-xl font-bold disabled:opacity-50">
            {loading ? "Atualizando..." : "Atualizar"}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr className="text-left">
                <th className="p-4">Empresa</th>
                <th className="p-4">Status</th>
                <th className="p-4">Plano</th>
                <th className="p-4">Trial até</th>
                <th className="p-4">Criada em</th>
                <th className="p-4">Ações</th>
              </tr>
            </thead>

            <tbody>
              {filtradas.map((empresa) => (
                <tr key={empresa.id} className="border-t align-top">
                  <td className="p-4">
                    <p className="font-bold text-slate-900">{empresa.nome}</p>
                    <p className="text-xs text-slate-500">{empresa.email || "-"}</p>
                    <p className="text-xs text-slate-500">{empresa.telefone || "-"}</p>
                    <p className="text-xs text-slate-400">/{empresa.slug || "-"}</p>
                  </td>

                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${classeStatus(empresa)}`}>
                      {statusVisual(empresa)}
                    </span>
                  </td>

                  <td className="p-4">{empresa.plano || "-"}</td>
                  <td className="p-4">{formatarData(empresa.trial_fim)}</td>
                  <td className="p-4">{formatarData(empresa.created_at)}</td>

                  <td className="p-4">
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => ativarPago(empresa)} className="bg-green-600 text-white px-3 py-2 rounded-xl text-xs font-bold">
                        Ativar pago
                      </button>

                      <button onClick={() => renovarTrial(empresa)} className="bg-yellow-500 text-white px-3 py-2 rounded-xl text-xs font-bold">
                        +7 dias
                      </button>

                      <button
                        onClick={() => vitalicio(empresa)}
                        style={{ backgroundColor: "var(--cor-primaria, #4b2f3f)" }}
                        className="text-white px-3 py-2 rounded-xl text-xs font-bold hover:opacity-90 transition"
                      >
                        Vitalício
                      </button>

                      {empresa.bloqueada || empresa.ativa === false ? (
                        <button onClick={() => desbloquear(empresa)} className="border px-3 py-2 rounded-xl text-xs font-bold">
                          Desbloquear
                        </button>
                      ) : (
                        <button onClick={() => bloquear(empresa)} className="bg-red-600 text-white px-3 py-2 rounded-xl text-xs font-bold">
                          Bloquear
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {filtradas.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-slate-500">
                    Nenhuma empresa encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Campo({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (valor: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-bold text-slate-900 mb-2">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className="w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-purple-200 disabled:bg-slate-100"
      />
    </div>
  );
}

function Card({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="bg-white border rounded-2xl p-4 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
    </div>
  );
}
