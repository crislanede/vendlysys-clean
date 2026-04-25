import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type Agendamento = {
  id: string;
  cliente: string;
  profissional: string;
  servico: string;
  data: string;
  horario: string;
  status: string;
  valor: number | null;
  valor_pago?: number | null;
  forma_pagamento?: string | null;
  status_pagamento?: string | null;
  finalizado_em?: string | null;
};

type Financeiro = {
  id: string;
  tipo: string;
  descricao: string;
  valor: number;
  data_lancamento: string;
  status: string;
};

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function normalizarStatus(status?: string | null) {
  return (status || "").trim().toLowerCase();
}

export default function RelatoriosPage() {
  const hoje = new Date().toISOString().split("T")[0];

  const [dataInicio, setDataInicio] = useState(hoje);
  const [dataFim, setDataFim] = useState(hoje);

  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [financeiro, setFinanceiro] = useState<Financeiro[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void carregarDados();
  }, []);

  async function carregarDados() {
    setLoading(true);

    const [{ data: agData, error: agError }, { data: finData, error: finError }] =
      await Promise.all([
        supabase
          .from("agendamentos")
          .select("*")
          .order("data", { ascending: false })
          .order("horario", { ascending: false }),

        supabase
          .from("financeiro")
          .select("*")
          .order("data_lancamento", { ascending: false }),
      ]);

    if (agError) {
      console.error("Erro ao carregar agendamentos:", agError);
    }

    if (finError) {
      console.error("Erro ao carregar financeiro:", finError);
    }

    setAgendamentos((agData || []) as Agendamento[]);
    setFinanceiro((finData || []) as Financeiro[]);
    setLoading(false);
  }

  const agendamentosFiltrados = useMemo(() => {
    return agendamentos.filter((item) => {
      return item.data >= dataInicio && item.data <= dataFim;
    });
  }, [agendamentos, dataInicio, dataFim]);

  const financeiroFiltrado = useMemo(() => {
    return financeiro.filter((item) => {
      return item.data_lancamento >= dataInicio && item.data_lancamento <= dataFim;
    });
  }, [financeiro, dataInicio, dataFim]);

  const totalAgendamentos = agendamentosFiltrados.length;

  const totalConfirmados = agendamentosFiltrados.filter(
    (a) => normalizarStatus(a.status) === "confirmado"
  ).length;

  const totalCancelados = agendamentosFiltrados.filter(
    (a) => normalizarStatus(a.status) === "cancelado"
  ).length;

  const totalFinalizados = agendamentosFiltrados.filter(
    (a) => normalizarStatus(a.status) === "finalizado"
  ).length;

  const faturamentoAgendamentos = agendamentosFiltrados
    .filter((a) => normalizarStatus(a.status) === "finalizado")
    .reduce((acc, item) => acc + Number(item.valor_pago || item.valor || 0), 0);

  const totalEntradas = financeiroFiltrado
    .filter((f) => f.tipo === "entrada")
    .reduce((acc, item) => acc + Number(item.valor || 0), 0);

  const totalSaidas = financeiroFiltrado
    .filter((f) => f.tipo === "saida")
    .reduce((acc, item) => acc + Number(item.valor || 0), 0);

  const lucroLiquido = totalEntradas - totalSaidas;

  const porProfissional = useMemo(() => {
    const mapa: Record<string, number> = {};

    agendamentosFiltrados.forEach((item) => {
      const nome = item.profissional || "Não informado";
      const valor = Number(item.valor_pago || item.valor || 0);

      if (normalizarStatus(item.status) === "finalizado") {
        mapa[nome] = (mapa[nome] || 0) + valor;
      }
    });

    return Object.entries(mapa)
      .map(([profissional, total]) => ({ profissional, total }))
      .sort((a, b) => b.total - a.total);
  }, [agendamentosFiltrados]);

  const porServico = useMemo(() => {
    const mapa: Record<string, number> = {};

    agendamentosFiltrados.forEach((item) => {
      const nome = item.servico || "Não informado";
      mapa[nome] = (mapa[nome] || 0) + 1;
    });

    return Object.entries(mapa)
      .map(([servico, quantidade]) => ({ servico, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade);
  }, [agendamentosFiltrados]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-orange-500">Análises</p>
        <h1 className="text-4xl font-bold text-slate-900">Relatórios</h1>
        <p className="mt-2 text-base text-slate-500">
          Acompanhe agendamentos, faturamento e desempenho por período.
        </p>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-2xl font-semibold text-slate-900">Filtros</h2>
          <p className="text-sm text-slate-500">
            Refine os dados para analisar o período desejado.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_1fr_auto]">
          <input
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            className="rounded-2xl border border-slate-200 px-4 py-3"
          />

          <input
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            className="rounded-2xl border border-slate-200 px-4 py-3"
          />

          <button
            type="button"
            onClick={() => void carregarDados()}
            className="rounded-2xl bg-orange-500 px-5 py-3 font-semibold text-white transition hover:bg-orange-600"
          >
            Recarregar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <CardResumo
          titulo="Total de agendamentos"
          valor={String(totalAgendamentos)}
          subtitulo="No período selecionado"
        />
        <CardResumo
          titulo="Confirmados"
          valor={String(totalConfirmados)}
          subtitulo="Agendamentos confirmados"
        />
        <CardResumo
          titulo="Cancelados"
          valor={String(totalCancelados)}
          subtitulo="Agendamentos cancelados"
        />
        <CardResumo
          titulo="Finalizados"
          valor={String(totalFinalizados)}
          subtitulo="Atendimentos concluídos"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <CardResumo
          titulo="Faturamento dos agendamentos"
          valor={formatarMoeda(faturamentoAgendamentos)}
          subtitulo="Com base nos finalizados"
        />
        <CardResumo
          titulo="Entradas financeiras"
          valor={formatarMoeda(totalEntradas)}
          subtitulo="Tabela financeiro"
        />
        <CardResumo
          titulo="Lucro líquido"
          valor={formatarMoeda(lucroLiquido)}
          subtitulo="Entradas - saídas"
          destaque={lucroLiquido >= 0 ? "positivo" : "negativo"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900">
            Faturamento por profissional
          </h2>
          <p className="mb-4 text-sm text-slate-500">
            Soma dos atendimentos finalizados por profissional.
          </p>

          {porProfissional.length === 0 ? (
            <p className="text-slate-500">Nenhum dado encontrado.</p>
          ) : (
            <div className="space-y-3">
              {porProfissional.map((item) => (
                <div
                  key={item.profissional}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3"
                >
                  <span className="font-medium text-slate-800">
                    {item.profissional}
                  </span>
                  <span className="font-semibold text-emerald-600">
                    {formatarMoeda(item.total)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900">
            Serviços mais agendados
          </h2>
          <p className="mb-4 text-sm text-slate-500">
            Quantidade de vezes que cada serviço apareceu no período.
          </p>

          {porServico.length === 0 ? (
            <p className="text-slate-500">Nenhum dado encontrado.</p>
          ) : (
            <div className="space-y-3">
              {porServico.map((item) => (
                <div
                  key={item.servico}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3"
                >
                  <span className="font-medium text-slate-800">
                    {item.servico}
                  </span>
                  <span className="font-semibold text-slate-700">
                    {item.quantidade}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-slate-900">
          Agendamentos do período
        </h2>
        <p className="mb-4 text-sm text-slate-500">
          Lista detalhada para auditoria e acompanhamento.
        </p>

        {loading ? (
          <p className="text-slate-500">Carregando...</p>
        ) : agendamentosFiltrados.length === 0 ? (
          <p className="text-slate-500">Nenhum agendamento encontrado.</p>
        ) : (
          <div className="space-y-3">
            {agendamentosFiltrados.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 xl:flex-row xl:items-center xl:justify-between"
              >
                <div>
                  <p className="text-lg font-semibold text-slate-900">
                    {item.cliente}
                  </p>
                  <p className="text-sm text-slate-500">
                    {item.profissional} • {item.servico}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {new Date(`${item.data}T00:00:00`).toLocaleDateString("pt-BR")}{" "}
                    às {item.horario}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                    {item.status}
                  </span>

                  <span className="text-sm font-semibold text-slate-800">
                    {formatarMoeda(Number(item.valor_pago || item.valor || 0))}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CardResumo({
  titulo,
  valor,
  subtitulo,
  destaque = "normal",
}: {
  titulo: string;
  valor: string;
  subtitulo: string;
  destaque?: "normal" | "positivo" | "negativo";
}) {
  const corValor =
    destaque === "positivo"
      ? "text-emerald-600"
      : destaque === "negativo"
      ? "text-red-600"
      : "text-slate-900";

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-lg text-slate-500">{titulo}</p>
      <p className={`mt-3 text-4xl font-bold ${corValor}`}>{valor}</p>
      <p className="mt-2 text-sm text-slate-400">{subtitulo}</p>
    </div>
  );
}