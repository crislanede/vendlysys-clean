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
  status_pagamento?: string | null;
  valor_mensal?: number | null;
  vencimento_assinatura?: string | null;
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
  valorMensal: string;
  vencimentoAssinatura: string;
};

const novaEmpresaInicial: NovaEmpresa = {
  nome: "",
  slug: "",
  email: "",
  telefone: "",
  plano: "teste",
  diasTrial: "7",
  valorMensal: "",
  vencimentoAssinatura: "",
};

const ITENS_POR_PAGINA = 8;

export default function AdminEmpresas() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(1);
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

  useEffect(() => {
    setPagina(1);
  }, [busca]);

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
      const emailNormalizado = email.trim().toLowerCase();

      const { data: usuarioPorEmail, error: erroPorEmail } = await supabase
        .from("usuarios")
        .select("perfil")
        .ilike("email", emailNormalizado)
        .in("perfil", ["super_admin", "admin_saas"])
        .limit(1)
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
        "id,nome,slug,email,telefone,plano,status_assinatura,status_pagamento,valor_mensal,vencimento_assinatura,trial_inicio,trial_fim,licenca_vitalicia,bloqueada,ativa,data_bloqueio,created_at"
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

  function moedaParaNumero(valor: string) {
    const limpo = valor
      .replace(/R\$/g, "")
      .replace(/\s/g, "")
      .replace(/\./g, "")
      .replace(",", ".");

    if (!limpo) return null;

    const numero = Number(limpo);
    return Number.isNaN(numero) ? null : numero;
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
    const valorMensal = moedaParaNumero(novaEmpresa.valorMensal);

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
    const statusPagamento = plano === "mensal" ? "pendente" : licencaVitalicia ? "dispensado" : "trial";

    const { error } = await supabase.from("empresas").insert({
      nome,
      slug,
      email,
      telefone,
      ativa: true,
      bloqueada: false,
      plano,
      status_assinatura: statusAssinatura,
      status_pagamento: statusPagamento,
      valor_mensal: valorMensal,
      vencimento_assinatura: novaEmpresa.vencimentoAssinatura || null,
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
      `${empresa.nome || ""} ${empresa.email || ""} ${empresa.slug || ""} ${empresa.telefone || ""} ${empresa.plano || ""} ${empresa.status_assinatura || ""}`
        .toLowerCase()
        .includes(termo)
    );
  }, [empresas, busca]);

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / ITENS_POR_PAGINA));

  const paginadas = useMemo(() => {
    const inicio = (pagina - 1) * ITENS_POR_PAGINA;
    return filtradas.slice(inicio, inicio + ITENS_POR_PAGINA);
  }, [filtradas, pagina]);

  const metricas = useMemo(() => {
    return {
      total: empresas.length,
      ativas: empresas.filter((e) => e.ativa !== false && !e.bloqueada).length,
      bloqueadas: empresas.filter((e) => e.bloqueada || e.ativa === false).length,
      vitalicias: empresas.filter((e) => e.licenca_vitalicia).length,
      trial: empresas.filter((e) => e.status_assinatura === "trial").length,
      mensal: empresas.filter((e) => e.plano === "mensal").length,
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
      status_pagamento: "pago",
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
      status_pagamento: "dispensado",
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
      status_assinatura: empresa.licenca_vitalicia ? "vitalicio" : empresa.plano === "teste" ? "trial" : "ativo",
      data_bloqueio: null,
    });
  }

  async function alternarAtivo(empresa: Empresa) {
    if (empresa.ativa === false || empresa.bloqueada) {
      await desbloquear(empresa);
    } else {
      await bloquear(empresa);
    }
  }

  async function renovarTrial(empresa: Empresa) {
    const novaData = new Date();
    novaData.setDate(novaData.getDate() + 7);

    await atualizar(empresa.id, {
      ativa: true,
      plano: "teste",
      status_assinatura: "trial",
      status_pagamento: "trial",
      licenca_vitalicia: false,
      bloqueada: false,
      trial_inicio: new Date().toISOString(),
      trial_fim: novaData.toISOString(),
      data_bloqueio: null,
    });
  }

  async function marcarPagamento(empresa: Empresa, pago: boolean) {
    await atualizar(empresa.id, {
      status_pagamento: pago ? "pago" : "pendente",
      status_assinatura: pago ? "ativo" : empresa.status_assinatura || "ativo",
      ativa: pago ? true : empresa.ativa,
      bloqueada: pago ? false : empresa.bloqueada,
    });
  }

  function formatarData(data: string | null | undefined) {
    if (!data) return "-";
    return new Date(data).toLocaleDateString("pt-BR");
  }

  function formatarMoeda(valor: number | null | undefined) {
    const numero = Number(valor || 0);
    return numero.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
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
    if (empresa.bloqueada || empresa.ativa === false) return "bg-red-100 text-red-700 ring-red-200";
    if (empresa.licenca_vitalicia) return "bg-purple-100 text-purple-700 ring-purple-200";
    if (empresa.status_assinatura === "ativo") return "bg-green-100 text-green-700 ring-green-200";
    if (empresa.status_assinatura === "trial") return "bg-yellow-100 text-yellow-700 ring-yellow-200";
    return "bg-slate-100 text-slate-700 ring-slate-200";
  }

  function classePagamento(empresa: Empresa) {
    if (empresa.status_pagamento === "pago") return "bg-green-50 text-green-700";
    if (empresa.status_pagamento === "pendente") return "bg-orange-50 text-orange-700";
    if (empresa.status_pagamento === "dispensado") return "bg-purple-50 text-purple-700";
    return "bg-slate-50 text-slate-600";
  }

  if (loading && empresas.length === 0) {
    return (
      <div className="min-h-[60vh] p-6 flex items-center justify-center">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm px-6 py-4 font-semibold text-slate-700">
          Carregando administração...
        </div>
      </div>
    );
  }

  if (!autorizado) {
    return (
      <div className="p-4 md:p-6 max-w-2xl">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
          <p className="text-sm font-bold uppercase text-red-600">Acesso negado</p>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Administração SaaS</h1>
          <p className="text-slate-600 mt-2">
            {erro || "Seu usuário não tem permissão para acessar esta página."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-6 space-y-5 bg-slate-50 min-h-screen">
      <div className="rounded-3xl bg-gradient-to-r from-slate-950 via-purple-950 to-fuchsia-900 text-white p-5 md:p-7 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
          <div>
            <p className="text-xs font-black tracking-[0.2em] uppercase text-fuchsia-200">
              Administração SaaS
            </p>
            <h1 className="text-2xl md:text-4xl font-black mt-2">Empresas cadastradas</h1>
            <p className="text-sm md:text-base text-slate-200 mt-1">
              Gerencie trials, licenças, bloqueios, pagamentos e planos do VendlySys.
            </p>
          </div>

          <button
            onClick={() => setMostrarCadastro(true)}
            className="bg-white text-slate-950 px-5 py-3 rounded-2xl font-black hover:scale-[1.01] active:scale-[0.99] transition shadow-sm"
          >
            + Nova empresa
          </button>
        </div>
      </div>

      {erro && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm font-semibold">
          {erro}
        </div>
      )}

      {sucesso && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-2xl p-4 text-sm font-semibold">
          {sucesso}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <Card title="Total" value={metricas.total} hint="empresas" />
        <Card title="Ativas" value={metricas.ativas} hint="liberadas" />
        <Card title="Bloqueadas" value={metricas.bloqueadas} hint="sem acesso" />
        <Card title="Vitalícias" value={metricas.vitalicias} hint="licença fixa" />
        <Card title="Trial" value={metricas.trial} hint="teste" />
        <Card title="Mensal" value={metricas.mensal} hint="recorrente" />
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por empresa, e-mail, telefone, slug, status ou plano..."
            className="w-full border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:ring-4 focus:ring-purple-100 focus:border-purple-300 text-sm"
          />

          <button
            onClick={carregar}
            disabled={loading}
            className="border border-slate-200 bg-white px-5 py-3 rounded-2xl font-bold text-sm disabled:opacity-50"
          >
            {loading ? "Atualizando..." : "Atualizar"}
          </button>
        </div>
      </div>

      <div className="hidden md:block bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-black text-slate-900">Lista de empresas</h2>
            <p className="text-sm text-slate-500">
              {filtradas.length} empresa(s) encontrada(s).
            </p>
          </div>

          <div className="text-sm text-slate-500">
            Página {pagina} de {totalPaginas}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr className="text-left">
                <th className="p-4">Empresa</th>
                <th className="p-4">Status</th>
                <th className="p-4">Plano</th>
                <th className="p-4">Cobrança</th>
                <th className="p-4">Trial até</th>
                <th className="p-4">Ativa</th>
                <th className="p-4">Ações</th>
              </tr>
            </thead>

            <tbody>
              {paginadas.map((empresa) => (
                <tr key={empresa.id} className="border-t border-slate-100 align-top hover:bg-slate-50/80">
                  <td className="p-4 min-w-[220px]">
                    <p className="font-black text-slate-900">{empresa.nome}</p>
                    <p className="text-xs text-slate-500">{empresa.email || "-"}</p>
                    <p className="text-xs text-slate-500">{empresa.telefone || "-"}</p>
                    <p className="text-xs text-slate-400">/{empresa.slug || "-"}</p>
                  </td>

                  <td className="p-4">
                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-black ring-1 ${classeStatus(empresa)}`}>
                      {statusVisual(empresa)}
                    </span>
                  </td>

                  <td className="p-4">
                    <p className="font-bold capitalize">{empresa.plano || "-"}</p>
                    <p className="text-xs text-slate-500">Criada em {formatarData(empresa.created_at)}</p>
                  </td>

                  <td className="p-4">
                    <p className="font-black">{formatarMoeda(empresa.valor_mensal)}</p>
                    <span className={`inline-flex mt-1 px-2 py-1 rounded-full text-xs font-bold ${classePagamento(empresa)}`}>
                      {empresa.status_pagamento || "não definido"}
                    </span>
                    <p className="text-xs text-slate-500 mt-1">
                      Vence: {formatarData(empresa.vencimento_assinatura)}
                    </p>
                  </td>

                  <td className="p-4">{formatarData(empresa.trial_fim)}</td>

                  <td className="p-4">
                    <Switch
                      ativo={empresa.ativa !== false && !empresa.bloqueada}
                      onClick={() => alternarAtivo(empresa)}
                    />
                  </td>

                  <td className="p-4 min-w-[260px]">
                    <div className="flex flex-wrap gap-2">
                      <BotaoAcao onClick={() => ativarPago(empresa)} variante="verde">
                        Ativar pago
                      </BotaoAcao>
                      <BotaoAcao onClick={() => marcarPagamento(empresa, empresa.status_pagamento !== "pago")} variante="azul">
                        {empresa.status_pagamento === "pago" ? "Marcar pendente" : "Marcar pago"}
                      </BotaoAcao>
                      <BotaoAcao onClick={() => renovarTrial(empresa)} variante="amarelo">
                        +7 dias
                      </BotaoAcao>
                      <BotaoAcao onClick={() => vitalicio(empresa)} variante="roxo">
                        Vitalício
                      </BotaoAcao>
                    </div>
                  </td>
                </tr>
              ))}

              {paginadas.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-slate-500">
                    Nenhuma empresa encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Paginacao pagina={pagina} totalPaginas={totalPaginas} setPagina={setPagina} />
      </div>

      <div className="md:hidden space-y-3">
        {paginadas.map((empresa) => (
          <div key={empresa.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-black text-slate-900">{empresa.nome}</p>
                <p className="text-xs text-slate-500">{empresa.email || "-"}</p>
                <p className="text-xs text-slate-400">/{empresa.slug || "-"}</p>
              </div>

              <span className={`shrink-0 px-3 py-1 rounded-full text-xs font-black ring-1 ${classeStatus(empresa)}`}>
                {statusVisual(empresa)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <Info label="Plano" value={empresa.plano || "-"} />
              <Info label="Mensalidade" value={formatarMoeda(empresa.valor_mensal)} />
              <Info label="Pagamento" value={empresa.status_pagamento || "-"} />
              <Info label="Trial até" value={formatarData(empresa.trial_fim)} />
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              <span className="text-sm font-bold text-slate-700">Acesso ativo</span>
              <Switch ativo={empresa.ativa !== false && !empresa.bloqueada} onClick={() => alternarAtivo(empresa)} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <BotaoAcao onClick={() => ativarPago(empresa)} variante="verde">Ativar pago</BotaoAcao>
              <BotaoAcao onClick={() => marcarPagamento(empresa, empresa.status_pagamento !== "pago")} variante="azul">
                {empresa.status_pagamento === "pago" ? "Pendente" : "Pago"}
              </BotaoAcao>
              <BotaoAcao onClick={() => renovarTrial(empresa)} variante="amarelo">+7 dias</BotaoAcao>
              <BotaoAcao onClick={() => vitalicio(empresa)} variante="roxo">Vitalício</BotaoAcao>
            </div>
          </div>
        ))}

        {paginadas.length === 0 && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 text-center text-slate-500">
            Nenhuma empresa encontrada.
          </div>
        )}

        <Paginacao pagina={pagina} totalPaginas={totalPaginas} setPagina={setPagina} />
      </div>

      {mostrarCadastro && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-end md:items-center justify-center p-3 md:p-6">
          <form onSubmit={criarEmpresa} className="bg-white w-full max-w-3xl rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-5 md:p-6 border-b border-slate-100 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black tracking-[0.2em] uppercase text-purple-600">Nova empresa</p>
                <h2 className="text-2xl font-black text-slate-900 mt-1">Cadastrar empresa SaaS</h2>
                <p className="text-sm text-slate-500">
                  Crie uma empresa manualmente com trial, plano mensal ou licença vitalícia.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setMostrarCadastro(false)}
                className="w-10 h-10 rounded-2xl bg-slate-100 font-black text-slate-600"
              >
                ×
              </button>
            </div>

            <div className="p-5 md:p-6 max-h-[72vh] overflow-y-auto space-y-5">
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
                  <label className="block text-sm font-black text-slate-900 mb-2">Plano inicial</label>
                  <select
                    value={novaEmpresa.plano}
                    onChange={(e) => atualizarNovaEmpresa("plano", e.target.value)}
                    className="w-full border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:ring-4 focus:ring-purple-100 focus:border-purple-300"
                  >
                    <option value="teste">Teste grátis</option>
                    <option value="mensal">Mensal pago</option>
                    <option value="vitalicio">Vitalício</option>
                  </select>
                </div>

                <Campo
                  label="Valor mensal"
                  value={novaEmpresa.valorMensal}
                  onChange={(valor) => atualizarNovaEmpresa("valorMensal", valor)}
                  placeholder="Ex.: 99,90"
                  disabled={novaEmpresa.plano !== "mensal"}
                />

                <Campo
                  label="Vencimento da assinatura"
                  type="date"
                  value={novaEmpresa.vencimentoAssinatura}
                  onChange={(valor) => atualizarNovaEmpresa("vencimentoAssinatura", valor)}
                  disabled={novaEmpresa.plano !== "mensal"}
                />

                <Campo
                  label="Dias de trial"
                  type="number"
                  value={novaEmpresa.diasTrial}
                  onChange={(valor) => atualizarNovaEmpresa("diasTrial", valor)}
                  placeholder="7"
                  disabled={novaEmpresa.plano === "vitalicio"}
                />
              </div>
            </div>

            <div className="p-5 md:p-6 border-t border-slate-100 flex flex-col md:flex-row md:items-center md:justify-end gap-3">
              <button
                type="button"
                onClick={() => setNovaEmpresa(novaEmpresaInicial)}
                className="border border-slate-200 px-5 py-3 rounded-2xl font-black text-slate-700"
              >
                Limpar
              </button>

              <button
                type="submit"
                disabled={salvando}
                className="bg-slate-950 text-white px-6 py-3 rounded-2xl font-black disabled:opacity-50"
              >
                {salvando ? "Salvando..." : "Cadastrar empresa"}
              </button>
            </div>
          </form>
        </div>
      )}
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
      <label className="block text-sm font-black text-slate-900 mb-2">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className="w-full border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:ring-4 focus:ring-purple-100 focus:border-purple-300 disabled:bg-slate-100 disabled:text-slate-400"
      />
    </div>
  );
}

function Card({ title, value, hint }: { title: string; value: string | number; hint?: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm">
      <p className="text-xs font-bold uppercase text-slate-500">{title}</p>
      <p className="text-2xl font-black text-slate-900 mt-1">{value}</p>
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}

function Switch({ ativo, onClick }: { ativo: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
        ativo ? "bg-green-500" : "bg-slate-300"
      }`}
      aria-label={ativo ? "Desativar empresa" : "Ativar empresa"}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
          ativo ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

function BotaoAcao({
  children,
  onClick,
  variante,
}: {
  children: React.ReactNode;
  onClick: () => void;
  variante: "verde" | "amarelo" | "roxo" | "azul";
}) {
  const classes = {
    verde: "bg-green-600 text-white",
    amarelo: "bg-yellow-500 text-white",
    roxo: "bg-purple-700 text-white",
    azul: "bg-blue-600 text-white",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${classes[variante]} px-3 py-2 rounded-xl text-xs font-black hover:opacity-90 transition`}
    >
      {children}
    </button>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-50 rounded-2xl p-3">
      <p className="text-[11px] uppercase font-black text-slate-400">{label}</p>
      <p className="text-sm font-bold text-slate-800 mt-1">{value}</p>
    </div>
  );
}

function Paginacao({
  pagina,
  totalPaginas,
  setPagina,
}: {
  pagina: number;
  totalPaginas: number;
  setPagina: (pagina: number) => void;
}) {
  return (
    <div className="p-4 border-t border-slate-100 flex items-center justify-between gap-3 bg-white rounded-b-3xl">
      <button
        type="button"
        disabled={pagina <= 1}
        onClick={() => setPagina(Math.max(1, pagina - 1))}
        className="border border-slate-200 px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-40"
      >
        Anterior
      </button>

      <p className="text-sm font-bold text-slate-600">
        Página {pagina} de {totalPaginas}
      </p>

      <button
        type="button"
        disabled={pagina >= totalPaginas}
        onClick={() => setPagina(Math.min(totalPaginas, pagina + 1))}
        className="border border-slate-200 px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-40"
      >
        Próxima
      </button>
    </div>
  );
}
