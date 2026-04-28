import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export type EmpresaUsuario = {
  id: string;
  nome: string;
  slug: string | null;

  cor_primaria?: string | null;
  cor_secundaria?: string | null;
  cor_fundo?: string | null;

  logo_url?: string | null;
  favicon_url?: string | null;

  ativa?: boolean | null;
  bloqueada?: boolean | null;
  plano?: string | null;
  status_assinatura?: string | null;
  licenca_vitalicia?: boolean | null;
  trial_inicio?: string | null;
  trial_fim?: string | null;
};

const STORAGE_KEY = "vendlysys_empresa_ativa_id";

export function useEmpresa() {
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [empresaNome, setEmpresaNome] = useState("");

  const [corPrimaria, setCorPrimaria] = useState("#4b2f3f");
  const [corSecundaria, setCorSecundaria] = useState("#4d6f53");
  const [corFundo, setCorFundo] = useState("#f1f9f5");

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

  // 🎨 aplica tema + favicon + logo
  function aplicarTema(empresa: EmpresaUsuario) {
    const primaria = empresa.cor_primaria || "#4b2f3f";
    const secundaria = empresa.cor_secundaria || "#4d6f53";
    const fundo = empresa.cor_fundo || "#f1f9f5";

    setCorPrimaria(primaria);
    setCorSecundaria(secundaria);
    setCorFundo(fundo);

    setLogoUrl(empresa.logo_url || null);

    document.documentElement.style.setProperty("--cor-primaria", primaria);
    document.documentElement.style.setProperty("--cor-secundaria", secundaria);
    document.documentElement.style.setProperty("--cor-fundo", fundo);

    document.documentElement.style.setProperty("--color-primary", primaria);
    document.documentElement.style.setProperty("--color-secondary", secundaria);
    document.documentElement.style.setProperty("--color-background", fundo);

    // 🔥 favicon dinâmico
    if (empresa.favicon_url) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;

      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }

      link.href = empresa.favicon_url;
    }
  }

  // 🔐 licenciamento
  function calcularLicenca(empresa: EmpresaUsuario) {
    const ativa = empresa.ativa !== false;
    const bloqueada = empresa.bloqueada === true;
    const vitalicia = empresa.licenca_vitalicia === true;
    const status = empresa.status_assinatura || "trial";

    const trialValido =
      status === "trial" &&
      !!empresa.trial_fim &&
      new Date(empresa.trial_fim).getTime() >= Date.now();

    const assinaturaAtiva = status === "ativo";

    const temAcesso =
      ativa && !bloqueada && (vitalicia || assinaturaAtiva || trialValido);

    setLicencaAtiva(temAcesso);
    setEmpresaBloqueada(!temAcesso);
    setStatusAssinatura(status);
    setTrialFim(empresa.trial_fim || null);
  }

  async function carregarEmpresa() {
    setCarregandoEmpresa(true);

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    if (!userId) {
      finalizarSemEmpresa();
      return;
    }

    let lista: EmpresaUsuario[] = [];

    const { data: vinculos } = await supabase
      .from("usuarios_empresas")
      .select(`
        empresa_id,
        empresas (
          id,
          nome,
          slug,
          cor_primaria,
          cor_secundaria,
          cor_fundo,
          logo_url,
          favicon_url,
          ativa,
          bloqueada,
          status_assinatura,
          licenca_vitalicia,
          trial_inicio,
          trial_fim
        )
      `)
      .eq("user_id", userId)
      .eq("ativo", true);

    if (vinculos && vinculos.length > 0) {
      lista = vinculos.map((v: any) => v.empresas).filter(Boolean);
    }

    if (lista.length === 0) {
      const { data: empresaDireta } = await supabase
        .from("empresas")
        .select(`
          id,
          nome,
          slug,
          cor_primaria,
          cor_secundaria,
          cor_fundo,
          logo_url,
          favicon_url,
          ativa,
          bloqueada,
          status_assinatura,
          licenca_vitalicia,
          trial_inicio,
          trial_fim
        `)
        .eq("user_id", userId);

      lista = empresaDireta || [];
    }

    if (lista.length === 0) {
      finalizarSemEmpresa();
      return;
    }

    const salva = localStorage.getItem(STORAGE_KEY);
    const ativa = lista.find((e) => e.id === salva) || lista[0];

    localStorage.setItem(STORAGE_KEY, ativa.id);

    setEmpresas(lista);
    setEmpresaId(ativa.id);
    setEmpresaNome(ativa.nome);

    aplicarTema(ativa);
    calcularLicenca(ativa);

    setCarregandoEmpresa(false);
  }

  function trocarEmpresa(novaEmpresaId: string) {
    const empresa = empresas.find((e) => e.id === novaEmpresaId);
    if (!empresa) return;

    localStorage.setItem(STORAGE_KEY, empresa.id);

    setEmpresaId(empresa.id);
    setEmpresaNome(empresa.nome);

    aplicarTema(empresa);
    calcularLicenca(empresa);

    window.location.reload();
  }

  function finalizarSemEmpresa() {
    localStorage.removeItem(STORAGE_KEY);

    setEmpresaId(null);
    setEmpresaNome("");
    setCorPrimaria("#4b2f3f");
    setCorSecundaria("#4d6f53");
    setCorFundo("#f1f9f5");
    setLogoUrl(null);
    setEmpresas([]);

    setLicencaAtiva(false);
    setEmpresaBloqueada(true);
    setStatusAssinatura(null);
    setTrialFim(null);

    setCarregandoEmpresa(false);
  }

  return {
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