import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export function useEmpresaPublica() {
  const [empresa, setEmpresa] = useState<any>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    setCarregando(true);

    const path = window.location.pathname;
    const slug = path.split("/")[1]; // 👈 pega /fabio

    if (!slug) {
      setCarregando(false);
      return;
    }

    const { data } = await supabase
      .from("empresas")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    if (data) {
      setEmpresa(data);

      // 🎨 aplica tema
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