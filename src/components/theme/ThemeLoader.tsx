import { useEffect } from "react";
import { supabase } from "../../lib/supabase";

type ConfiguracaoTema = {
  cor_primaria?: string | null;
  cor_secundaria?: string | null;
  cor_fundo?: string | null;
};

const temaPadrao = {
  cor_primaria: "#f97316",
  cor_secundaria: "#0f172a",
  cor_fundo: "#f8fafc",
};

export function aplicarTema(config?: ConfiguracaoTema | null) {
  const root = document.documentElement;

  root.style.setProperty(
    "--color-primary",
    config?.cor_primaria || temaPadrao.cor_primaria
  );

  root.style.setProperty(
    "--color-secondary",
    config?.cor_secundaria || temaPadrao.cor_secundaria
  );

  root.style.setProperty(
    "--color-background",
    config?.cor_fundo || temaPadrao.cor_fundo
  );

  document.body.style.backgroundColor =
    config?.cor_fundo || temaPadrao.cor_fundo;
}

export default function ThemeLoader() {
  useEffect(() => {
    async function carregarTema() {
      const { data, error } = await supabase
        .from("configuracoes")
        .select("cor_primaria, cor_secundaria, cor_fundo")
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Erro ao carregar tema:", error);
        aplicarTema(temaPadrao);
        return;
      }

      aplicarTema(data || temaPadrao);
    }

    void carregarTema();
  }, []);

  return null;
}