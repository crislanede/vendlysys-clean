import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export type EmpresaPublica = {
  id: string;
  nome: string;
  slug: string;
  cor_primaria?: string | null;
  cor_secundaria?: string | null;
  cor_fundo?: string | null;
  telefone?: string | null;
  endereco?: string | null;
};

export function useEmpresaPublica(slug?: string) {
  const [empresa, setEmpresa] = useState<EmpresaPublica | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!slug) {
      setCarregando(false);
      return;
    }

    carregar();
  }, [slug]);

  async function carregar() {
    setCarregando(true);

    const { data, error } = await supabase
      .from("empresas")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    if (error) {
      console.error("Erro ao carregar empresa pública:", error);
      setEmpresa(null);
      setCarregando(false);
      return;
    }

    setEmpresa(data);

    // 🎨 aplica cores no layout público (Meu Espaço)
    if (data) {
      document.documentElement.style.setProperty(
        "--cor-primaria",
        data.cor_primaria || "#4b2f3f"
      );

      document.documentElement.style.setProperty(
        "--cor-secundaria",
        data.cor_secundaria || "#6c6c6c"
      );

      document.documentElement.style.setProperty(
        "--cor-fundo",
        data.cor_fundo || "#f1f5f9"
      );
    }

    setCarregando(false);
  }

  return {
    empresa,
    carregando,
  };
}