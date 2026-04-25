import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

import PageHeader from "../components/ui/PageHeader";
import SectionCard from "../components/ui/SectionCard";
import PrimaryButton from "../components/ui/PrimaryButton";

export default function DespesasPage() {
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [despesas, setDespesas] = useState<any[]>([]);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    const { data } = await supabase
      .from("financeiro")
      .select("*")
      .eq("tipo", "saida");

    setDespesas(data || []);
  }

  async function salvar() {
    if (!descricao || !valor) return;

    await supabase.from("financeiro").insert([
      {
        descricao,
        valor: Number(valor),
        tipo: "saida",
        status: "confirmado",
      },
    ]);

    setDescricao("");
    setValor("");
    carregar();
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Despesas" description="Controle de gastos" />

      <SectionCard title="Nova despesa">
        <div className="grid md:grid-cols-3 gap-3">
          <input
            placeholder="Descrição"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            className="border p-3 rounded-2xl"
          />

          <input
            type="number"
            placeholder="Valor"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            className="border p-3 rounded-2xl"
          />

          <PrimaryButton onClick={salvar}>
            Salvar
          </PrimaryButton>
        </div>
      </SectionCard>

      <SectionCard title="Lista de despesas">
        {despesas.map((d) => (
          <div key={d.id} className="border-b py-2 text-sm">
            {d.descricao} — R$ {d.valor}
          </div>
        ))}
      </SectionCard>
    </div>
  );
}