import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

import PageHeader from "../components/ui/PageHeader";
import SectionCard from "../components/ui/SectionCard";

export default function CaixaPage() {
  const [movimentos, setMovimentos] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    setCarregando(true);

    const { data } = await supabase
      .from("financeiro")
      .select("*")
      .order("created_at", { ascending: false });

    setMovimentos(data || []);
    setCarregando(false);
  }

  async function abrirCaixa() {
    const valorDigitado = prompt("Informe o valor inicial do caixa:");

    if (!valorDigitado) return;

    const valor = Number(
      valorDigitado.replace(".", "").replace(",", ".")
    );

    if (Number.isNaN(valor) || valor < 0) {
      alert("Informe um valor válido.");
      return;
    }

    const { error } = await supabase.from("financeiro").insert([
      {
        tipo: "entrada",
        descricao: "Saldo inicial do caixa",
        valor,
        origem: "caixa_inicial",
        status: "pago",
        created_at: new Date().toISOString(),
      },
    ]);

    if (error) {
      alert("Erro ao abrir caixa: " + error.message);
      return;
    }

    await carregar();
  }

  const saldo = useMemo(() => {
    return movimentos.reduce((acc, item) => {
      const valor = Number(item.valor || 0);

      if (item.tipo === "entrada") return acc + valor;
      return acc - valor;
    }, 0);
  }, [movimentos]);

  const jaTemAbertura = movimentos.some(
    (item) => item.origem === "caixa_inicial"
  );

  function moeda(valor: number) {
    return valor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Caixa"
        description="Controle do saldo em caixa do estabelecimento."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <SectionCard>
          <p className="text-sm text-slate-500">Saldo atual</p>
          <p className="mt-2 text-3xl font-black text-emerald-600">
            {moeda(saldo)}
          </p>
        </SectionCard>

        <SectionCard>
          <p className="text-sm text-slate-500">Movimentações</p>
          <p className="mt-2 text-3xl font-black text-purple-700">
            {movimentos.length}
          </p>
        </SectionCard>

        <SectionCard>
          <p className="text-sm text-slate-500">Status</p>
          <p className="mt-2 text-xl font-black">
            {jaTemAbertura ? "Caixa aberto" : "Sem saldo inicial"}
          </p>
        </SectionCard>
      </div>

      {!jaTemAbertura && (
        <button
          type="button"
          onClick={abrirCaixa}
          className="rounded-2xl bg-emerald-600 px-5 py-3 font-black text-white"
        >
          Abrir caixa com saldo inicial
        </button>
      )}

      <SectionCard>
        <h2 className="mb-4 text-lg font-black">Movimentações do caixa</h2>

        {carregando ? (
          <p>Carregando...</p>
        ) : movimentos.length === 0 ? (
          <p className="text-sm text-slate-500">
            Nenhuma movimentação encontrada.
          </p>
        ) : (
          movimentos.map((m) => (
            <div
              key={m.id}
              className="flex justify-between border-b py-3 text-sm"
            >
              <div>
                <strong>{m.descricao}</strong>
                <div className="text-xs text-slate-500">
                  {m.origem || "manual"} · {m.status || "-"}
                </div>
              </div>

              <span
                className={
                  m.tipo === "entrada"
                    ? "font-black text-emerald-600"
                    : "font-black text-red-500"
                }
              >
                {m.tipo === "entrada" ? "+" : "-"} {moeda(Number(m.valor || 0))}
              </span>
            </div>
          ))
        )}
      </SectionCard>
    </div>
  );
}