import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export type EmpresaUsuario = {
  id: string;
  nome: string;
  slug: string | null;
  cor_primaria?: string | null;
};

const STORAGE_KEY = "vendlysys_empresa_ativa_id";

export function useEmpresa() {
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [empresaNome, setEmpresaNome] = useState("");
  const [corPrimaria, setCorPrimaria] = useState("#0f766e"); // fallback
  const [empresas, setEmpresas] = useState<EmpresaUsuario[]>([]);
  const [carregandoEmpresa, setCarregandoEmpresa] = useState(true);

  useEffect(() => {
    carregarEmpresa();
  }, []);

  async function carregarEmpresa() {
    setCarregandoEmpresa(true);

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    if (!userId) {
      finalizarSemEmpresa();
      return;
    }

    let lista: EmpresaUsuario[] = [];

    // 🔗 busca vínculo correto
    const { data: vinculos } = await supabase
      .from("usuarios_empresas")
      .select(`
        empresa_id,
        empresas (
          id,
          nome,
          slug,
          cor_primaria
        )
      `)
      .eq("user_id", userId)
      .eq("ativo", true);

    if (vinculos && vinculos.length > 0) {
      lista = vinculos
        .map((item: any) => item.empresas)
        .filter(Boolean);
    }

    // fallback (empresa criada direto)
    if (lista.length === 0) {
      const { data: empresaDireta } = await supabase
        .from("empresas")
        .select("id, nome, slug, cor_primaria")
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

    // 🔥 AQUI ESTAVA O PROBLEMA
    setCorPrimaria(ativa.cor_primaria || "#0f766e");

    setCarregandoEmpresa(false);
  }

  function trocarEmpresa(novaEmpresaId: string) {
    const empresa = empresas.find((e) => e.id === novaEmpresaId);

    if (!empresa) return;

    localStorage.setItem(STORAGE_KEY, empresa.id);

    setEmpresaId(empresa.id);
    setEmpresaNome(empresa.nome);

    // 🔥 aplica cor na troca também
    setCorPrimaria(empresa.cor_primaria || "#0f766e");

    window.location.reload();
  }

  function finalizarSemEmpresa() {
    localStorage.removeItem(STORAGE_KEY);
    setEmpresaId(null);
    setEmpresaNome("");
    setCorPrimaria("#0f766e");
    setEmpresas([]);
    setCarregandoEmpresa(false);
  }

  return {
    empresaId,
    empresaNome,
    corPrimaria,
    empresas,
    trocarEmpresa,
    carregandoEmpresa,
    recarregarEmpresa: carregarEmpresa,
  };
}