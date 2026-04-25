import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export type Configuracao = {
  nome_empresa: string | null;
  nome_fantasia: string | null;
  cor_primaria: string | null;
  cor_secundaria: string | null;
  cor_fundo: string | null;
};

export function useConfiguracao() {
  const [config, setConfig] = useState<Configuracao | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void carregar();
  }, []);

  async function carregar() {
    const { data, error } = await supabase
      .from("configuracoes")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Erro ao carregar config:", error);
      setLoading(false);
      return;
    }

    setConfig(data);
    setLoading(false);
  }

  return { config, loading };
}