import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export type EmpresaUsuario = {
  id: string;
  nome: string;
  nome_fantasia?: string | null;
  slug?: string | null;

  cor_primaria?: string | null;
  cor_secundaria?: string | null;
  cor_fundo?: string | null;

  logo_url?: string | null;
  favicon_url?: string | null;

  ativa?: boolean | string | null;
  bloqueada?: boolean | string | null;
  plano?: string | null;
  status_assinatura?: string | null;
  licenca_vitalicia?: boolean | string | null;
  trial_inicio?: string | null;
  trial_fim?: string | null;

  perfil?: string | null;
};

type Retorno = {
  empresa: EmpresaUsuario | null;
  empresaId: string | null;
  empresaNome: string;
  corPrimaria: string;
  corSecundaria: string;
  corFundo: string;
  logoUrl: string | null;

  empresas: EmpresaUsuario[];
  trocarEmpresa: (novaEmpresaId: string) => void;
  carregandoEmpresa: boolean;
  recarregarEmpresa: () => Promise<void>;

  licencaAtiva: boolean;
  empresaBloqueada: boolean;
  statusAssinatura: string | null;
  trialFim: string | null;
};

const STORAGE_KEY = "vendlysys_empresa_ativa_id";

const TEMA_PADRAO = {
  primaria: "#4b2f3f",
  secundaria: "#4d6f53",
  fundo: "#f1f9f5",
};

function normalizarTexto(valor?: string | null) {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function valorBooleano(valor: boolean | string | null | undefined) {
  return valor === true || valor === "true";
}

export function useEmpresa(): Retorno {
  const [empresa, setEmpresa] = useState<EmpresaUsuario | null>(null);
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [empresaNome, setEmpresaNome] = useState("VendlySys");

  const [corPrimaria, setCorPrimaria] = useState(TEMA_PADRAO.primaria);
  const [corSecundaria, setCorSecundaria] = useState(TEMA_PADRAO.secundaria);
  const [corFundo, setCorFundo] = useState(TEMA_PADRAO.fundo);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const [empresas, setEmpresas] = useState<EmpresaUsuario[]>([]);
  const [carregandoEmpresa, setCarregandoEmpresa] = useState(true);

  const [licencaAtiva, setLicencaAtiva] = useState(false);
  const [empresaBloqueada, setEmpresaBloqueada] = useState(false);
  const [statusAssinatura, setStatusAssinatura] = useState<string | null>(null);
  const [trialFim, setTrialFim] = useState<string | null>(null);

  useEffect(() => {
    carregarEmpresa();
  }, []);

  function normalizarEmpresa(raw: any, perfil?: string | null): EmpresaUsuario | null {
    if (!raw?.id) return null;

    const nome = raw.nome_fantasia || raw.nome || "VendlySys";

    return {
      id: raw.id,
      nome,
      nome_fantasia: raw.nome_fantasia || null,
      slug: raw.slug || null,
      cor_primaria: raw.cor_primaria || null,
      cor_secundaria: raw.cor_secundaria || null,
      cor_fundo: raw.cor_fundo || null,
      logo_url: raw.logo_url || null,
      favicon_url: raw.favicon_url || null,
      ativa: raw.ativa,
      bloqueada: raw.bloqueada,
      plano: raw.plano || null,
      status_assinatura: raw.status_assinatura || null,
      licenca_vitalicia: raw.licenca_vitalicia,
      trial_inicio: raw.trial_inicio || null,
      trial_fim: raw.trial_fim || null,
      perfil: perfil || null,
    };
  }

  function aplicarTema(empresaAtual: EmpresaUsuario) {
    const primaria = empresaAtual.cor_primaria || TEMA_PADRAO.primaria;
    const secundaria = empresaAtual.cor_secundaria || TEMA_PADRAO.secundaria;
    const fundo = empresaAtual.cor_fundo || TEMA_PADRAO.fundo;

    setCorPrimaria(primaria);
    setCorSecundaria(secundaria);
    setCorFundo(fundo);
    setLogoUrl(empresaAtual.logo_url || null);

    document.documentElement.style.setProperty("--cor-primaria", primaria);
    document.documentElement.style.setProperty("--cor-secundaria", secundaria);
    document.documentElement.style.setProperty("--cor-fundo", fundo);

    document.documentElement.style.setProperty("--color-primary", primaria);
    document.documentElement.style.setProperty("--color-secondary", secundaria);
    document.documentElement.style.setProperty("--color-background", fundo);

    if (empresaAtual.favicon_url) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;

      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }

      link.href = empresaAtual.favicon_url;
    }
  }

  function calcularLicenca(empresaAtual: EmpresaUsuario) {
    const ativa = empresaAtual.ativa !== false && empresaAtual.ativa !== "false";
    const bloqueada = valorBooleano(empresaAtual.bloqueada);

    const plano = normalizarTexto(empresaAtual.plano);
    const status = normalizarTexto(empresaAtual.status_assinatura || "trial");

    const vitalicia =
      valorBooleano(empresaAtual.licenca_vitalicia) ||
      plano === "vitalicio" ||
      status === "vitalicio";

    const assinaturaAtiva =
      status === "ativo" ||
      status === "ativa" ||
      status === "pago" ||
      status === "paga";

    const trialValido =
      status === "trial" &&
      !!empresaAtual.trial_fim &&
      new Date(empresaAtual.trial_fim).getTime() >= Date.now();

    const temAcesso = ativa && !bloqueada && (vitalicia || assinaturaAtiva || trialValido);

    setLicencaAtiva(temAcesso);
    setEmpresaBloqueada(!temAcesso);
    setStatusAssinatura(empresaAtual.status_assinatura || status || null);
    setTrialFim(empresaAtual.trial_fim || null);

    return temAcesso;
  }

  async function carregarEmpresa() {
    setCarregandoEmpresa(true);

    const { data: userData, error: userError } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    if (userError || !userId) {
      finalizarSemEmpresa();
      return;
    }

    let lista: EmpresaUsuario[] = [];

    const { data: vinculos, error: vinculosError } = await supabase
      .from("usuarios_empresas")
      .select("empresa_id, perfil")
      .eq("user_id", userId)
      .eq("ativo", true);

    if (vinculosError) {
      console.warn("Erro ao buscar vínculos de empresas:", vinculosError);
    }

    const empresaIds = (vinculos || [])
      .map((v: any) => v.empresa_id)
      .filter(Boolean);

    if (empresaIds.length > 0) {
      const { data: empresasBanco, error: empresasError } = await supabase
        .from("empresas")
        .select(`
          id,
          nome,
          nome_fantasia,
          slug,
          cor_primaria,
          cor_secundaria,
          cor_fundo,
          logo_url,
          favicon_url,
          ativa,
          bloqueada,
          plano,
          status_assinatura,
          licenca_vitalicia,
          trial_inicio,
          trial_fim
        `)
        .in("id", empresaIds);

      if (empresasError) {
        console.warn("Erro ao buscar empresas vinculadas:", empresasError);
      }

      lista = (empresasBanco || [])
        .map((empresaBanco: any) => {
          const vinculo = (vinculos || []).find(
            (v: any) => v.empresa_id === empresaBanco.id
          );
          return normalizarEmpresa(empresaBanco, vinculo?.perfil);
        })
        .filter(Boolean) as EmpresaUsuario[];
    }

    if (lista.length === 0) {
      const { data: empresaDireta, error: empresaDiretaError } = await supabase
        .from("empresas")
        .select(`
          id,
          nome,
          nome_fantasia,
          slug,
          cor_primaria,
          cor_secundaria,
          cor_fundo,
          logo_url,
          favicon_url,
          ativa,
          bloqueada,
          plano,
          status_assinatura,
          licenca_vitalicia,
          trial_inicio,
          trial_fim
        `)
        .eq("user_id", userId);

      if (empresaDiretaError) {
        console.warn("Erro ao buscar empresa direta:", empresaDiretaError);
      }

      lista = (empresaDireta || [])
        .map((empresaBanco: any) => normalizarEmpresa(empresaBanco, "admin"))
        .filter(Boolean) as EmpresaUsuario[];
    }

    if (lista.length === 0) {
      finalizarSemEmpresa();
      return;
    }

    const empresaSalvaId = localStorage.getItem(STORAGE_KEY);
    const empresaAtiva = lista.find((e) => e.id === empresaSalvaId) || lista[0];

    localStorage.setItem(STORAGE_KEY, empresaAtiva.id);

    setEmpresas(lista);
    setEmpresa(empresaAtiva);
    setEmpresaId(empresaAtiva.id);
    setEmpresaNome(empresaAtiva.nome);

    aplicarTema(empresaAtiva);
    calcularLicenca(empresaAtiva);

    setCarregandoEmpresa(false);
  }

  function trocarEmpresa(novaEmpresaId: string) {
    const novaEmpresa = empresas.find((e) => e.id === novaEmpresaId);
    if (!novaEmpresa) return;

    localStorage.setItem(STORAGE_KEY, novaEmpresa.id);

    setEmpresa(novaEmpresa);
    setEmpresaId(novaEmpresa.id);
    setEmpresaNome(novaEmpresa.nome);

    aplicarTema(novaEmpresa);
    calcularLicenca(novaEmpresa);

    window.location.reload();
  }

  function finalizarSemEmpresa() {
    localStorage.removeItem(STORAGE_KEY);

    setEmpresa(null);
    setEmpresaId(null);
    setEmpresaNome("VendlySys");
    setCorPrimaria(TEMA_PADRAO.primaria);
    setCorSecundaria(TEMA_PADRAO.secundaria);
    setCorFundo(TEMA_PADRAO.fundo);
    setLogoUrl(null);
    setEmpresas([]);

    setLicencaAtiva(false);
    setEmpresaBloqueada(true);
    setStatusAssinatura(null);
    setTrialFim(null);

    setCarregandoEmpresa(false);
  }

  return {
    empresa,
    empresaId,
    empresaNome,
    corPrimaria,
    corSecundaria,
    corFundo,
    logoUrl,

    empresas,
    trocarEmpresa,
    carregandoEmpresa,
    recarregarEmpresa: carregarEmpresa,

    licencaAtiva,
    empresaBloqueada,
    statusAssinatura,
    trialFim,
  };
}
