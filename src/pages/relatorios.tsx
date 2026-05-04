import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { useEmpresa } from "../hooks/useEmpresa";

type Agendamento = {
  id: string;
  cliente: string | null;
  servico: string | null;
  profissional: string | null;
  data: string | null;
  valor: number | null;
  status: string | null;
  status_atendimento?: string | null;
};

type LancamentoFinanceiro = {
  id: string;
  tipo: string | null;
  descricao: string | null;
  cliente: string | null;
  servico: string | null;
  profissional: string | null;
  valor: number | null;
  valor_bruto?: number | null;
  comissao_valor?: number | null;
  valor_liquido?: number | null;
  data_lancamento: string | null;
  status: string | null;
  forma_pagamento?: string | null;
  agendamento_id?: string | null;
};

export default function RelatoriosRetorno() {
  const { empresaId, carregandoEmpresa } = useEmpresa();

  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [financeiro, setFinanceiro] = useState<LancamentoFinanceiro[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  useEffect(() => {
    if (empresaId) carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId]);

  async function carregar() {
    if (!empresaId) return;

    setLoading(true);

    let queryAgendamentos = supabase
      .from("agendamentos")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("data", { ascending: false });

    if (dataInicio) queryAgendamentos = queryAgendamentos.gte("data", dataInicio);
    if (dataFim) queryAgendamentos = queryAgendamentos.lte("data", dataFim);

    let queryFinanceiro = supabase
      .from("financeiro")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("data_lancamento", { ascending: false });

    if (dataInicio) queryFinanceiro = queryFinanceiro.gte("data_lancamento", dataInicio);
    if (dataFim) queryFinanceiro = queryFinanceiro.lte("data_lancamento", dataFim);

    const [resAgendamentos, resFinanceiro] = await Promise.all([
      queryAgendamentos,
      queryFinanceiro,
    ]);

    if (resAgendamentos.error) {
      alert("Erro ao carregar agendamentos: " + resAgendamentos.error.message);
      setAgendamentos([]);
    } else {
      setAgendamentos((resAgendamentos.data || []) as Agendamento[]);
    }

    if (resFinanceiro.error) {
      alert("Erro ao carregar financeiro: " + resFinanceiro.error.message);
      setFinanceiro([]);
    } else {
      setFinanceiro((resFinanceiro.data || []) as LancamentoFinanceiro[]);
    }

    setLoading(false);
  }

  const entradasValidas = useMemo(() => {
    return financeiro.filter(
      (item) => item.tipo === "entrada" && item.status !== "cancelado"
    );
  }, [financeiro]);

  function valorBruto(item: LancamentoFinanceiro) {
    return Number(item.valor_bruto ?? item.valor ?? 0);
  }

  const metricas = useMemo(() => {
    const total = agendamentos.length;

    const finalizados = agendamentos.filter(
      (i) => i.status === "finalizado" || i.status_atendimento === "finalizado"
    );

    const cancelados = agendamentos.filter(
      (i) => i.status === "cancelado" || i.status_atendimento === "cancelado"
    );

    const faturamento = entradasValidas.reduce(
      (acc, item) => acc + valorBruto(item),
      0
    );

    const comissoes = entradasValidas.reduce(
      (acc, item) => acc + Number(item.comissao_valor || 0),
      0
    );

    const liquido = entradasValidas.reduce((acc, item) => {
      const bruto = valorBruto(item);
      const valorLiquido = item.valor_liquido ?? bruto - Number(item.comissao_valor || 0);
      return acc + Number(valorLiquido || 0);
    }, 0);

    const ticketMedio = entradasValidas.length > 0 ? faturamento / entradasValidas.length : 0;

    const taxaCancelamento = total > 0 ? Math.round((cancelados.length / total) * 100) : 0;

    return {
      total,
      finalizados: finalizados.length,
      cancelados: cancelados.length,
      faturamento,
      comissoes,
      liquido,
      ticketMedio,
      taxaCancelamento,
    };
  }, [agendamentos, entradasValidas]);

  const rankingServicos = useMemo(() => {
    const mapa: Record<string, { nome: string; qtd: number; valor: number }> = {};

    entradasValidas.forEach((item) => {
      const nome = item.servico || item.descricao || "Não informado";
      if (!mapa[nome]) mapa[nome] = { nome, qtd: 0, valor: 0 };

      mapa[nome].qtd += 1;
      mapa[nome].valor += valorBruto(item);
    });

    return Object.values(mapa).sort((a, b) => b.valor - a.valor).slice(0, 5);
  }, [entradasValidas]);

  const rankingProfissionais = useMemo(() => {
    const mapa: Record<string, { nome: string; qtd: number; valor: number }> = {};

    entradasValidas.forEach((item) => {
      const nome = item.profissional || "Não informado";
      if (!mapa[nome]) mapa[nome] = { nome, qtd: 0, valor: 0 };

      mapa[nome].qtd += 1;
      mapa[nome].valor += valorBruto(item);
    });

    return Object.values(mapa).sort((a, b) => b.valor - a.valor).slice(0, 5);
  }, [entradasValidas]);

  function limpar() {
    setDataInicio("");
    setDataFim("");
    setTimeout(() => carregar(), 0);
  }

  function formatarValor(valor: number) {
    return Number(valor || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function formatarData(data: string | null) {
    if (!data) return "-";
    return new Date(data + "T00:00:00").toLocaleDateString("pt-BR");
  }

  if (carregandoEmpresa) {
    return <div className="p-6">Carregando empresa...</div>;
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <p
          style={{ color: "var(--cor-primaria, #4b2f3f)" }}
          className="text-sm font-bold uppercase"
        >
          BI
        </p>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard de Retorno</h1>
        <p className="text-slate-500">
          Analise faturamento, atendimentos, cancelamentos, serviços e profissionais.
        </p>
      </div>

      <div className="bg-white rounded-2xl border p-4 flex flex-wrap gap-4 items-end shadow-sm">
        <div>
          <label className="text-xs text-slate-500">Data inicial</label>
          <input
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            className="block mt-1 border rounded-xl px-3 py-2"
          />
        </div>

        <div>
          <label className="text-xs text-slate-500">Data final</label>
          <input
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            className="block mt-1 border rounded-xl px-3 py-2"
          />
        </div>

        <button
          onClick={carregar}
          style={{ backgroundColor: "var(--cor-primaria, #4b2f3f)" }}
          className="text-white px-5 py-2 rounded-xl font-semibold hover:opacity-90 transition"
        >
          Filtrar
        </button>

        <button onClick={limpar} className="border px-5 py-2 rounded-xl font-semibold">
          Limpar
        </button>
      </div>

      {loading ? (
        <p>Carregando...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 xl:grid-cols-7 gap-4">
            <Card title="Atendimentos" value={metricas.total} />
            <Card title="Finalizados" value={metricas.finalizados} />
            <Card title="Cancelados" value={metricas.cancelados} />
            <Card title="Faturamento" value={formatarValor(metricas.faturamento)} />
            <Card title="Comissões" value={formatarValor(metricas.comissoes)} />
            <Card title="Líquido" value={formatarValor(metricas.liquido)} />
            <Card title="Ticket médio" value={formatarValor(metricas.ticketMedio)} />
          </div>

          <div className="bg-white border rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-bold text-slate-900">Taxa de cancelamento</h2>
                <p className="text-sm text-slate-500">
                  Percentual de atendimentos cancelados no período.
                </p>
              </div>
              <span className="text-2xl font-bold text-red-600">
                {metricas.taxaCancelamento}%
              </span>
            </div>

            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-red-500 rounded-full"
                style={{ width: `${Math.min(metricas.taxaCancelamento, 100)}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Ranking
              titulo="Top serviços"
              subtitulo="Serviços com maior faturamento no período"
              dados={rankingServicos}
            />

            <Ranking
              titulo="Top profissionais"
              subtitulo="Profissionais com maior faturamento no período"
              dados={rankingProfissionais}
            />
          </div>

          <div className="bg-white rounded-2xl border shadow-sm">
            <div className="p-4 border-b">
              <h2 className="font-semibold">Histórico financeiro</h2>
              <p className="text-sm text-slate-500">
                Valores carregados da tabela financeiro, não da agenda.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left text-slate-500">
                    <th className="p-3">Cliente</th>
                    <th>Serviço</th>
                    <th>Profissional</th>
                    <th>Data</th>
                    <th>Bruto</th>
                    <th>Comissão</th>
                    <th>Líquido</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {entradasValidas.map((item) => {
                    const bruto = valorBruto(item);
                    const comissao = Number(item.comissao_valor || 0);
                    const liquido = Number(item.valor_liquido ?? bruto - comissao);

                    return (
                      <tr key={item.id} className="border-t hover:bg-slate-50">
                        <td className="p-3 font-medium">{item.cliente || "-"}</td>
                        <td>{item.servico || item.descricao || "-"}</td>
                        <td>{item.profissional || "-"}</td>
                        <td>{formatarData(item.data_lancamento)}</td>
                        <td>{formatarValor(bruto)}</td>
                        <td>{formatarValor(comissao)}</td>
                        <td>{formatarValor(liquido)}</td>
                        <td>
                          <span className="text-xs px-2 py-1 rounded-full bg-slate-100">
                            {item.status || "-"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}

                  {entradasValidas.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center py-10 text-slate-400">
                        Nenhum lançamento financeiro encontrado
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Card({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="bg-white border rounded-2xl p-4 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
    </div>
  );
}

function Ranking({
  titulo,
  subtitulo,
  dados,
}: {
  titulo: string;
  subtitulo: string;
  dados: { nome: string; qtd: number; valor: number }[];
}) {
  return (
    <div className="bg-white border rounded-2xl p-5 shadow-sm">
      <h2 className="font-bold text-slate-900">{titulo}</h2>
      <p className="text-sm text-slate-500 mb-4">{subtitulo}</p>

      <div className="space-y-3">
        {dados.map((item, index) => (
          <div key={item.nome} className="flex items-center justify-between border-b pb-2">
            <div>
              <p className="font-semibold">
                {index + 1}. {item.nome}
              </p>
              <p className="text-xs text-slate-500">{item.qtd} lançamento(s)</p>
            </div>

            <p className="font-bold">
              {item.valor.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </p>
          </div>
        ))}

        {dados.length === 0 && (
          <p className="text-sm text-slate-400">Nenhum dado encontrado.</p>
        )}
      </div>
    </div>
  );
}
