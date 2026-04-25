import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

import PageHeader from "../components/ui/PageHeader";
import SectionCard from "../components/ui/SectionCard";
import PrimaryButton from "../components/ui/PrimaryButton";
import EmptyState from "../components/ui/EmptyState";

type Pagamento = {
  id: string;
  agendamento_id: string;
  valor: number;
  forma_pagamento: string;
  status: string;
  data_pagamento: string | null;
  observacao: string | null;

  cliente: string;
  servico: string;
};

type Agendamento = {
  id: string;
  cliente: string;
  servico: string;
  valor: number;
};

export default function PagamentosPage() {
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);

  const [loading, setLoading] = useState(true);

  const [agendamentoId, setAgendamentoId] = useState("");
  const [valor, setValor] = useState("");
  const [forma, setForma] = useState("pix");
  const [observacao, setObservacao] = useState("");

  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  useEffect(() => {
    carregarTudo();
  }, []);

  async function carregarTudo() {
    setLoading(true);

    const { data: ag } = await supabase.from("agendamentos").select("*");

    const { data: pg } = await supabase.from("pagamentos").select("*");

    const pagamentosFormatados =
      pg?.map((p) => {
        const agendamento = ag?.find((a) => a.id === p.agendamento_id);

        return {
          ...p,
          cliente: agendamento?.cliente || "",
          servico: agendamento?.servico || "",
        };
      }) || [];

    setAgendamentos(ag || []);
    setPagamentos(pagamentosFormatados);

    setLoading(false);
  }

  async function salvarPagamento(e: React.FormEvent) {
    e.preventDefault();

    if (!agendamentoId || !valor) {
      alert("Preencha os campos obrigatórios");
      return;
    }

    const { error } = await supabase.from("pagamentos").insert([
      {
        agendamento_id: agendamentoId,
        valor: Number(valor),
        forma_pagamento: forma,
        status: "pago",
        data_pagamento: new Date(),
        observacao,
      },
    ]);

    if (error) {
      console.error(error);
      alert("Erro ao salvar pagamento");
      return;
    }

    setAgendamentoId("");
    setValor("");
    setObservacao("");

    setMostrarFormulario(false);

    await carregarTudo();
  }

  async function estornar(id: string) {
    await supabase
      .from("pagamentos")
      .update({ status: "estornado" })
      .eq("id", id);

    await carregarTudo();
  }

  function formatarMoeda(valor: number) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(valor || 0);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pagamentos"
        description="Controle financeiro dos atendimentos"
        action={
          <PrimaryButton onClick={() => setMostrarFormulario(true)}>
            Novo pagamento
          </PrimaryButton>
        }
      />

      {mostrarFormulario && (
        <SectionCard title="Novo pagamento">
          <form onSubmit={salvarPagamento} className="space-y-4">
            <select
              value={agendamentoId}
              onChange={(e) => setAgendamentoId(e.target.value)}
              className="w-full rounded-xl border p-3"
            >
              <option value="">Selecione o agendamento</option>
              {agendamentos.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.cliente} - {a.servico}
                </option>
              ))}
            </select>

            <input
              type="number"
              placeholder="Valor"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              className="w-full rounded-xl border p-3"
            />

            <select
              value={forma}
              onChange={(e) => setForma(e.target.value)}
              className="w-full rounded-xl border p-3"
            >
              <option value="pix">Pix</option>
              <option value="dinheiro">Dinheiro</option>
              <option value="cartao">Cartão</option>
            </select>

            <input
              placeholder="Observação"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              className="w-full rounded-xl border p-3"
            />

            <PrimaryButton type="submit">Salvar</PrimaryButton>
          </form>
        </SectionCard>
      )}

      {loading ? (
        <p>Carregando...</p>
      ) : pagamentos.length === 0 ? (
        <EmptyState title="Nenhum pagamento" />
      ) : (
        <div className="grid gap-4">
          {pagamentos.map((p) => (
            <SectionCard key={p.id}>
              <div className="flex justify-between">
                <div>
                  <p className="font-semibold">{p.cliente}</p>
                  <p className="text-sm text-gray-500">{p.servico}</p>
                </div>

                <div className="text-right">
                  <p className="font-bold">{formatarMoeda(p.valor)}</p>
                  <p className="text-xs">{p.forma_pagamento}</p>
                </div>
              </div>

              <div className="mt-3 flex justify-between items-center">
                <span
                  className={`text-xs px-3 py-1 rounded-full ${
                    p.status === "pago"
                      ? "bg-green-100 text-green-700"
                      : p.status === "estornado"
                      ? "bg-red-100 text-red-700"
                      : "bg-gray-100"
                  }`}
                >
                  {p.status}
                </span>

                {p.status === "pago" && (
                  <button
                    onClick={() => estornar(p.id)}
                    className="text-red-500 text-sm"
                  >
                    Estornar
                  </button>
                )}
              </div>
            </SectionCard>
          ))}
        </div>
      )}
    </div>
  );
}