import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Empresa = {
  id: string;
  nome: string;
  slug: string | null;
  email: string | null;
  plano: string | null;
  status_assinatura: string | null;
  trial_fim: string | null;
  licenca_vitalicia: boolean | null;
  bloqueada: boolean | null;
};

export function useEmpresa() {
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [carregandoEmpresa, setCarregandoEmpresa] = useState(true);

  useEffect(() => {
    carregarEmpresa();
  }, []);

  async function carregarEmpresa() {
    setCarregandoEmpresa(true);

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    if (!userId) {
      setEmpresa(null);
      setCarregandoEmpresa(false);
      return;
    }

    const { data, error } = await supabase
      .from("empresas")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data) {
      setEmpresa(null);
      setCarregandoEmpresa(false);
      return;
    }

    localStorage.setItem("empresa_id", data.id);
    localStorage.setItem("empresa_slug", data.slug || "");

    setEmpresa(data);
    setCarregandoEmpresa(false);
  }

  return {
    empresa,
    empresaId: empresa?.id || null,
    carregandoEmpresa,
    recarregarEmpresa: carregarEmpresa,
  };
}