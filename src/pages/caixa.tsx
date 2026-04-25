import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

import PageHeader from "../components/ui/PageHeader";
import SectionCard from "../components/ui/SectionCard";

export default function CaixaPage() {
  const [movimentos, setMovimentos] = useState<any[]>([]);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    const { data } = await supabase
      .from("financeiro")
      .select("*")
      .order("created_at", { ascending: false });

    setMovimentos(data || []);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Caixa"
        description="Movimentações financeiras"
      />

      <SectionCard>
        {movimentos.map((m) => (
          <div
            key={m.id}
            className="flex justify-between border-b py-3 text-sm"
          >
            <span>{m.descricao}</span>

            <span
              className={
                m.tipo === "entrada"
                  ? "text-emerald-600"
                  : "text-red-500"
              }
            >
              R$ {m.valor}
            </span>
          </div>
        ))}
      </SectionCard>
    </div>
  );
}