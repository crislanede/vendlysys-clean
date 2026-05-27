import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "../lib/supabase";

import PageHeader from "../components/ui/PageHeader";
import SectionCard from "../components/ui/SectionCard";
import PrimaryButton from "../components/ui/PrimaryButton";

type Financeiro = {
  id: string;
  tipo?: string | null;
  descricao?: string | null;
  valor?: number | null;
  valor_bruto?: number | null;
  valor_liquido?: number | null;
  comissao_valor?: number | null;
  agendamento_id?: string | null;
  data_lancamento?: string | null;
  status?: string | null;
  cliente?: string | null;
  profissional?: string | null;
  servico?: string | null;
  forma_pagamento?: string | null;
  created_at?: string | null;
};

type Despesa = {
  id: string;
  descricao?: string | null;
  valor?: number | null;
  categoria?: string | null;
  data?: string | null;
  data_lancamento?: string | null;
  status?: string | null;
};

type Agendamento = {
  id: string;
  cliente?: string | null;
  servico?: string | null;
  profissional?: string | null;
  data?: string | null;
  horario?: string | null;
  status?: string | null;
  valor?: number | null;
  preco?: number | null;
  valor_pago?: number | null;
  valor_final?: number | null;
  preco_servico?: number | null;
  created_at?: string | null;
};

type ClienteDashboard = {
  id: string;
  origem?: string | null;
  novo_cliente?: boolean | null;
  visualizado?: boolean | null;
  data_cadastro?: string | null;
  created_at?: string | null;
};


type GraficoLinha = {
  data: string;
  receita: number;
  aReceber: number;
  despesa: number;
  resultado: number;
  agendamentos: number;
};

type GraficoCategoria = {
  name: string;
  value: number;
};

type PeriodoRapido = "hoje" | "7dias" | "mes" | "30dias" | "personalizado";

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

function inicioDoMesISO() {
  const hoje = new Date();
  return new Date(hoje.getFullYear(), hoje.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
}

function diasAtrasISO(dias: number) {
  const data = new Date();
  data.setDate(data.getDate() - dias);
  return data.toISOString().slice(0, 10);
}

function formatarMoeda(valor: number) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarData(valor?: string | null) {
  if (!valor) return "-";
  const partes = valor.split("-");
  if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
  return valor;
}

function normalizarStatus(status?: string | null) {
  return (status || "").toLowerCase().trim();
}

function tipoFinanceiro(item: Financeiro) {
  return (item.tipo || "").toLowerCase().trim();
}

function statusPago(status?: string | null) {
  return ["pago", "recebido", "finalizado"].includes(normalizarStatus(status));
}

function statusPendente(status?: string | null) {
  return [
    "pendente",
    "aberto",
    "agendado",
    "aguardando",
    "confirmado",
  ].includes(normalizarStatus(status));
}

function entradaPaga(item: Financeiro) {
  return tipoFinanceiro(item) === "entrada" && statusPago(item.status);
}

function entradaPendente(item: Financeiro) {
  return tipoFinanceiro(item) === "entrada" && statusPendente(item.status);
}

function saidaFinanceira(item: Financeiro) {
  return tipoFinanceiro(item) === "saida";
}

function lancamentoCancelado(item: Financeiro | Despesa | Agendamento) {
  return normalizarStatus(item.status) === "cancelado";
}

function valorFinanceiro(item: Financeiro) {
  return Number(item.valor_bruto ?? item.valor ?? 0);
}

function valorAgendamento(item: Agendamento) {
  return Number(
    item.valor_final ??
      item.valor_pago ??
      item.valor ??
      item.preco ??
      item.preco_servico ??
      0,
  );
}

function dataDespesa(item: Despesa) {
  return item.data_lancamento || item.data || "";
}

function dataFinanceiro(item: Financeiro) {
  return item.data_lancamento || item.created_at?.slice(0, 10) || "";
}

function dataAgendamento(item: Agendamento) {
  return item.data || item.created_at?.slice(0, 10) || "";
}

function agruparPorData(
  financeiro: Financeiro[],
  despesas: Despesa[],
  agendamentos: Agendamento[],
  dataInicio: string,
  dataFim: string,
): GraficoLinha[] {
  const mapa = new Map<string, GraficoLinha>();
  const agendamentosComFinanceiro = new Set(
    financeiro.map((item) => item.agendamento_id).filter(Boolean),
  );

  function garantirData(data: string) {
    if (!mapa.has(data)) {
      mapa.set(data, {
        data,
        receita: 0,
        aReceber: 0,
        despesa: 0,
        resultado: 0,
        agendamentos: 0,
      });
    }

    return mapa.get(data)!;
  }

  for (const item of financeiro) {
    const data = dataFinanceiro(item);
    if (!data) continue;
    if (lancamentoCancelado(item)) continue;

    const linha = garantirData(data);
    const valor = valorFinanceiro(item);

    if (entradaPaga(item)) {
      linha.receita += valor;
    } else if (entradaPendente(item)) {
      linha.aReceber += valor;
    } else if (saidaFinanceira(item)) {
      linha.despesa += Number(item.valor || 0);
    }
  }

  for (const item of despesas) {
    const data = dataDespesa(item);
    if (!data) continue;
    if (lancamentoCancelado(item)) continue;

    const linha = garantirData(data);
    linha.despesa += Number(item.valor || 0);
  }

  for (const item of agendamentos) {
    const data = dataAgendamento(item);
    if (!data) continue;
    if (lancamentoCancelado(item)) continue;

    const status = normalizarStatus(item.status);
    const linha = garantirData(data);
    linha.agendamentos += 1;

    const jaTemFinanceiro = agendamentosComFinanceiro.has(item.id);
    const deveEntrarAReceber =
      !jaTemFinanceiro &&
      ["agendado", "confirmado", "pendente"].includes(status);

    if (deveEntrarAReceber) {
      linha.aReceber += valorAgendamento(item);
    }
  }

  const datas: string[] = [];
  const inicio = new Date(`${dataInicio}T00:00:00`);
  const fim = new Date(`${dataFim}T00:00:00`);

  for (let d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) {
    datas.push(d.toISOString().slice(0, 10));
  }

  return datas.map((data) => {
    const linha = mapa.get(data) || {
      data,
      receita: 0,
      aReceber: 0,
      despesa: 0,
      resultado: 0,
      agendamentos: 0,
    };

    return {
      ...linha,
      resultado: linha.receita - linha.despesa,
    };
  });
}

export default function Dashboard() {

   const [periodoRapido, setPeriodoRapido] = useState<PeriodoRapido>("mes");
  const [dataInicio, setDataInicio] = useState(inicioDoMesISO());
  const [dataFim, setDataFim] = useState(hojeISO());

  const [financeiro, setFinanceiro] = useState<Financeiro[]>([]);
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [clientesDashboard, setClientesDashboard] = useState<ClienteDashboard[]>([]);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    aplicarPeriodoRapido("mes");
  }, []);

  useEffect(() => {
    void carregarDados();
  }, [dataInicio, dataFim]);

  function aplicarPeriodoRapido(periodo: PeriodoRapido) {
    setPeriodoRapido(periodo);

    if (periodo === "hoje") {
      const hoje = hojeISO();
      setDataInicio(hoje);
      setDataFim(hoje);
      return;
    }

    if (periodo === "7dias") {
      setDataInicio(diasAtrasISO(6));
      setDataFim(hojeISO());
      return;
    }

    if (periodo === "30dias") {
      setDataInicio(diasAtrasISO(29));
      setDataFim(hojeISO());
      return;
    }

    if (periodo === "mes") {
      setDataInicio(inicioDoMesISO());
      setDataFim(hojeISO());
      return;
    }
  }

  async function carregarDados() {
    if (!dataInicio || !dataFim) return;

    setLoading(true);

    const [financeiroResp, despesasResp, agendamentosResp, clientesResp] = await Promise.all([
      supabase
        .from("financeiro")
        .select("*")
        .gte("data_lancamento", dataInicio)
        .lte("data_lancamento", dataFim)
        .order("data_lancamento", { ascending: true }),

      supabase
        .from("despesas")
        .select("*")
        .or(`data_lancamento.gte.${dataInicio},data.gte.${dataInicio}`)
        .order("created_at", { ascending: false }),

      supabase
        .from("agendamentos")
        .select("*")
        .gte("data", dataInicio)
        .lte("data", dataFim)
        .order("data", { ascending: true }),

      supabase
        .from("clientes")
        .select("id, origem, novo_cliente, visualizado, data_cadastro, created_at"),
    ]);

    if (financeiroResp.error) {
      console.error("Erro ao carregar financeiro:", financeiroResp.error);
      alert("Erro ao carregar financeiro: " + financeiroResp.error.message);
      setFinanceiro([]);
    } else {
      setFinanceiro((financeiroResp.data || []) as Financeiro[]);
    }

    if (despesasResp.error) {
      console.warn("Erro ao carregar despesas:", despesasResp.error);
      setDespesas([]);
    } else {
      const todasDespesas = ((despesasResp.data || []) as Despesa[]).filter(
        (item) => {
          const data = dataDespesa(item);
          if (!data) return false;
          return data >= dataInicio && data <= dataFim;
        },
      );

      setDespesas(todasDespesas);
    }

    if (agendamentosResp.error) {
      console.error("Erro ao carregar agendamentos:", agendamentosResp.error);
      alert("Erro ao carregar agendamentos: " + agendamentosResp.error.message);
      setAgendamentos([]);
    } else {
      setAgendamentos((agendamentosResp.data || []) as Agendamento[]);
    }

    if (clientesResp.error) {
      console.warn("Erro ao carregar clientes do dashboard:", clientesResp.error.message);
      setClientesDashboard([]);
    } else {
      setClientesDashboard((clientesResp.data || []) as ClienteDashboard[]);
    }

    setLoading(false);
  }

  const indicadores = useMemo(() => {
    const financeiroValido = financeiro.filter(
      (item) => !lancamentoCancelado(item),
    );

    const entradasPagas = financeiroValido.filter(entradaPaga);
    const entradasPendentes = financeiroValido.filter(entradaPendente);
    const saidasFinanceiro = financeiroValido.filter(saidaFinanceira);

    const despesasValidas = despesas.filter(
      (item) => !lancamentoCancelado(item),
    );
    const agendamentosValidos = agendamentos.filter(
      (item) => !lancamentoCancelado(item),
    );

    const agendamentosComFinanceiro = new Set(
      financeiroValido.map((item) => item.agendamento_id).filter(Boolean),
    );

    const agendamentosAReceber = agendamentosValidos.filter((item) => {
      const status = normalizarStatus(item.status);
      return (
        !agendamentosComFinanceiro.has(item.id) &&
        ["agendado", "confirmado", "pendente"].includes(status)
      );
    });

    const agendamentosFinalizados = agendamentosValidos.filter((item) => {
      const status = normalizarStatus(item.status);
      return status === "finalizado" || status === "pago";
    });

    const receita = entradasPagas.reduce(
      (acc, item) => acc + valorFinanceiro(item),
      0,
    );

    const aReceberFinanceiro = entradasPendentes.reduce(
      (acc, item) => acc + valorFinanceiro(item),
      0,
    );

    const aReceberAgendamentos = agendamentosAReceber.reduce(
      (acc, item) => acc + valorAgendamento(item),
      0,
    );

    const aReceber = aReceberFinanceiro + aReceberAgendamentos;

    const saidaFinanceiraTotal = saidasFinanceiro.reduce(
      (acc, item) => acc + Number(item.valor || 0),
      0,
    );

    const totalDespesas = despesasValidas.reduce(
      (acc, item) => acc + Number(item.valor || 0),
      0,
    );

    const despesaTotal = saidaFinanceiraTotal + totalDespesas;
    const resultado = receita - despesaTotal;

    const ticketMedio =
      entradasPagas.length > 0 ? receita / entradasPagas.length : 0;

    const online = entradasPagas
      .filter((item) => {
        const forma = (item.forma_pagamento || "").toLowerCase();
        return (
          forma.includes("pix") ||
          forma.includes("credito") ||
          forma.includes("débito") ||
          forma.includes("debito") ||
          forma.includes("online")
        );
      })
      .reduce((acc, item) => acc + valorFinanceiro(item), 0);

    return {
      faturamento: resultado,
      receita,
      aReceber,
      despesa: despesaTotal,
      agendamentos: agendamentosValidos.length,
      agendamentosFinalizados: agendamentosFinalizados.length,
      online,
      ticketMedio,
    };
  }, [financeiro, despesas, agendamentos]);

  const dadosPorData = useMemo(
    () =>
      agruparPorData(financeiro, despesas, agendamentos, dataInicio, dataFim),
    [financeiro, despesas, agendamentos, dataInicio, dataFim],
  );

  const temDadosFinanceiros = useMemo(() => {
    return dadosPorData.some(
      (item) =>
        item.receita > 0 ||
        item.aReceber > 0 ||
        item.despesa > 0 ||
        item.resultado !== 0 ||
        item.agendamentos > 0,
    );
  }, [dadosPorData]);

  const dadosPorCategoria = useMemo<GraficoCategoria[]>(() => {
    const mapa = new Map<string, number>();

    for (const item of financeiro) {
      if (lancamentoCancelado(item)) continue;
      if (!entradaPaga(item)) continue;

      const categoria = item.servico || item.descricao || "Sem categoria";
      mapa.set(categoria, (mapa.get(categoria) || 0) + valorFinanceiro(item));
    }

    return Array.from(mapa.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [financeiro]);

  const quantidadePorServico = useMemo<GraficoCategoria[]>(() => {
    const mapa = new Map<string, number>();

    for (const item of agendamentos) {
      if (normalizarStatus(item.status) === "cancelado") continue;

      const nome = item.servico || "Sem serviço";
      mapa.set(nome, (mapa.get(nome) || 0) + 1);
    }

    return Array.from(mapa.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [agendamentos]);

  const novosClientesPendentes = useMemo(() => {
    return clientesDashboard.filter(
      (cliente) => cliente.novo_cliente && cliente.visualizado !== true,
    ).length;
  }, [clientesDashboard]);

  const cadastrosMeuEspacoPeriodo = useMemo(() => {
    return clientesDashboard.filter((cliente) => {
      if (cliente.origem !== "meu_espaco") return false;

      const dataCadastroReal = cliente.created_at || cliente.data_cadastro || "";
      const dataISO = dataCadastroReal.slice(0, 10);

      return dataISO >= dataInicio && dataISO <= dataFim;
    }).length;
  }, [clientesDashboard, dataInicio, dataFim]);

  const ultimosLancamentos = useMemo(() => {
    return [...financeiro]
      .sort((a, b) => {
        const dataA = dataFinanceiro(a);
        const dataB = dataFinanceiro(b);
        return dataB.localeCompare(dataA);
      })
      .slice(0, 8);
  }, [financeiro]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <PageHeader
          eyebrow="Visão geral"
          title="Dashboard"
          description="Acompanhe o desempenho financeiro, atendimentos e indicadores do negócio por período."
        />
     
      </div>

      <SectionCard
        title="Período"
        description="Filtre os indicadores e gráficos por data."
      >
        <div className="flex flex-wrap items-end gap-3">
          <BotaoPeriodo
            ativo={periodoRapido === "hoje"}
            onClick={() => aplicarPeriodoRapido("hoje")}
          >
            Hoje
          </BotaoPeriodo>

          <BotaoPeriodo
            ativo={periodoRapido === "7dias"}
            onClick={() => aplicarPeriodoRapido("7dias")}
          >
            7 dias
          </BotaoPeriodo>

          <BotaoPeriodo
            ativo={periodoRapido === "mes"}
            onClick={() => aplicarPeriodoRapido("mes")}
          >
            Mês atual
          </BotaoPeriodo>

          <BotaoPeriodo
            ativo={periodoRapido === "30dias"}
            onClick={() => aplicarPeriodoRapido("30dias")}
          >
            30 dias
          </BotaoPeriodo>

          <label className="block">
            <span className="mb-1 block text-sm font-bold text-slate-600">
              De
            </span>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => {
                setPeriodoRapido("personalizado");
                setDataInicio(e.target.value);
              }}
              className="rounded-2xl border border-slate-200 bg-white p-3"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-bold text-slate-600">
              Até
            </span>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => {
                setPeriodoRapido("personalizado");
                setDataFim(e.target.value);
              }}
              className="rounded-2xl border border-slate-200 bg-white p-3"
            />
          </label>

          <PrimaryButton
            type="button"
            onClick={() => void carregarDados()}
            disabled={loading}
          >
            {loading ? "Atualizando..." : "Pesquisar"}
          </PrimaryButton>
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        <KpiCard
          title="Resultado"
          value={formatarMoeda(indicadores.faturamento)}
          variant="purple"
        />
        <KpiCard
          title="Receita"
          value={formatarMoeda(indicadores.receita)}
          variant="green"
        />
        <KpiCard
          title="A receber"
          value={formatarMoeda(indicadores.aReceber)}
          variant="orange"
        />
        <KpiCard
          title="Despesa"
          value={formatarMoeda(indicadores.despesa)}
          variant="red"
        />
        <KpiCard
          title="Agendamentos"
          value={String(indicadores.agendamentos)}
          variant="blue"
        />
        <KpiCard
          title="Novos clientes"
          value={String(novosClientesPendentes)}
          variant="red"
        />
        <KpiCard
          title="Meu Espaço"
          value={String(cadastrosMeuEspacoPeriodo)}
          variant="indigo"
        />
        <KpiCard
          title="Online"
          value={formatarMoeda(indicadores.online)}
          variant="indigo"
        />
        <KpiCard
          title="Ticket médio"
          value={formatarMoeda(indicadores.ticketMedio)}
          variant="slate"
        />
      </div>

      <SectionCard
        title="Resultado por dia"
        description="Receita paga, valores a receber, despesa e resultado líquido no período selecionado."
      >
        {loading ? (
          <ChartSkeleton />
        ) : !temDadosFinanceiros ? (
          <PremiumEmptyState
            icon="📊"
            title="Nenhum dado disponível no período"
            description="Quando houver agendamentos, receitas ou despesas, o gráfico aparecerá automaticamente aqui."
          />
        ) : (
          <ChartFrame>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dadosPorData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="data" tickFormatter={formatarData} />
                <YAxis />
                <Tooltip
                  formatter={(value) => formatarMoeda(Number(value))}
                  labelFormatter={(label) => formatarData(String(label))}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="receita"
                  name="Receita paga"
                  stroke="var(--color-primary)"
                  strokeWidth={3}
                />
                <Line
                  type="monotone"
                  dataKey="aReceber"
                  name="A receber"
                  stroke="#f59e0b"
                  strokeWidth={3}
                />
                <Line
                  type="monotone"
                  dataKey="despesa"
                  name="Despesa"
                  stroke="#ef4444"
                  strokeWidth={3}
                />
                <Line
                  type="monotone"
                  dataKey="resultado"
                  name="Resultado"
                  stroke="var(--color-secondary)"
                  strokeWidth={3}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartFrame>
        )}
      </SectionCard>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SectionCard title="Receita x Despesa">
          {loading ? (
            <ChartSkeleton />
          ) : !temDadosFinanceiros ? (
            <PremiumEmptyState
              icon="💰"
              title="Sem movimentação financeira"
              description="As receitas e despesas aparecerão aqui quando houver lançamentos no período."
            />
          ) : (
            <ChartFrame>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={dadosPorData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="data" tickFormatter={formatarData} />
                  <YAxis />
                  <Tooltip
                    formatter={(value) => formatarMoeda(Number(value))}
                    labelFormatter={(label) => formatarData(String(label))}
                  />
                  <Legend />
                  <Bar
                    dataKey="receita"
                    name="Receita paga"
                    fill="var(--color-primary)"
                  />
                  <Bar dataKey="aReceber" name="A receber" fill="#f59e0b" />
                  <Bar dataKey="despesa" name="Despesa" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </ChartFrame>
          )}
        </SectionCard>

        <SectionCard title="Quantidade de atendimentos">
          {loading ? (
            <ChartSkeleton />
          ) : !temDadosFinanceiros ? (
            <PremiumEmptyState
              icon="📅"
              title="Nenhum atendimento encontrado"
              description="Quando houver agendamentos no período, você verá a evolução por dia."
            />
          ) : (
            <ChartFrame>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={dadosPorData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="data" tickFormatter={formatarData} />
                  <YAxis allowDecimals={false} />
                  <Tooltip
                    labelFormatter={(label) => formatarData(String(label))}
                  />
                  <Bar
                    dataKey="agendamentos"
                    name="Agendamentos"
                    fill="var(--color-primary)"
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartFrame>
          )}
        </SectionCard>

        <SectionCard title="Representatividade por serviço em R$">
          {loading ? (
            <ChartSkeleton />
          ) : dadosPorCategoria.length === 0 ? (
            <PremiumEmptyState
              icon="🧾"
              title="Sem receita por serviço"
              description="Ao finalizar atendimentos ou lançar receitas, os serviços mais representativos aparecerão aqui."
            />
          ) : (
            <ChartFrame>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dadosPorCategoria} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    tickFormatter={(value) => formatarMoeda(Number(value))}
                  />
                  <YAxis type="category" dataKey="name" width={120} />
                  <Tooltip
                    formatter={(value) => formatarMoeda(Number(value))}
                  />
                  <Bar
                    dataKey="value"
                    name="Receita"
                    fill="var(--color-primary)"
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartFrame>
          )}
        </SectionCard>

        <SectionCard title="Distribuição de atendimentos">
          {loading ? (
            <ChartSkeleton />
          ) : quantidadePorServico.length === 0 ? (
            <PremiumEmptyState
              icon="✨"
              title="Sem atendimentos por serviço"
              description="Assim que os atendimentos forem registrados, a distribuição aparecerá neste gráfico."
            />
          ) : (
            <ChartFrame>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={quantidadePorServico}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={110}
                    label
                  >
                    {quantidadePorServico.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          index % 2 === 0
                            ? "var(--color-primary)"
                            : "var(--color-secondary)"
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartFrame>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Últimos lançamentos financeiros">
        {loading ? (
          <TableSkeleton />
        ) : ultimosLancamentos.length === 0 ? (
          <PremiumEmptyState
            icon="📂"
            title="Nenhum lançamento financeiro no período"
            description="Os lançamentos aparecerão aqui quando houver receitas ou saídas cadastradas."
          />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full border-collapse">
              <thead>
                <tr
                  className="text-left text-sm text-white"
                  style={{ backgroundColor: "var(--color-primary)" }}
                >
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Descrição</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Serviço</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {ultimosLancamentos.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-slate-100 odd:bg-white even:bg-slate-50"
                  >
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {formatarData(dataFinanceiro(item))}
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-slate-800">
                      {item.descricao || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {item.cliente || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {item.servico || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {item.status || "-"}
                    </td>
                    <td
                      className={`px-4 py-3 text-right text-sm font-extrabold ${
                        (item.tipo || "").toLowerCase() === "entrada"
                          ? "text-emerald-600"
                          : "text-red-600"
                      }`}
                    >
                      {(item.tipo || "").toLowerCase() === "entrada"
                        ? "+"
                        : "-"}{" "}
                      {formatarMoeda(valorFinanceiro(item))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function BotaoPeriodo({
  ativo,
  onClick,
  children,
}: {
  ativo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl px-4 py-3 text-sm font-extrabold transition-all duration-200 hover:scale-[1.02] ${
        ativo ? "text-white shadow-lg" : "bg-white text-slate-700"
      }`}
      style={{
        backgroundColor: ativo ? "var(--color-primary)" : undefined,
        border: ativo ? "none" : "1px solid rgb(226 232 240)",
      }}
    >
      {children}
    </button>
  );
}

function ChartFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-80 min-h-[320px] w-full rounded-2xl bg-white p-2">
      {children}
    </div>
  );
}

function PremiumEmptyState({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-gradient-to-br from-slate-50 to-white p-8 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-4xl shadow-sm">
        {icon}
      </div>
      <h3 className="text-lg font-extrabold text-slate-800">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-slate-500">{description}</p>
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="h-80 min-h-[320px] w-full animate-pulse rounded-3xl bg-slate-100 p-6">
      <div className="mb-6 h-5 w-40 rounded bg-slate-200" />
      <div className="h-56 rounded-2xl bg-slate-200" />
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-slate-200 p-4">
      <div className="mb-3 h-5 w-40 rounded bg-slate-200" />
      <div className="space-y-2">
        <div className="h-10 rounded bg-slate-100" />
        <div className="h-10 rounded bg-slate-100" />
        <div className="h-10 rounded bg-slate-100" />
      </div>
    </div>
  );
}

function KpiCard({
  title,
  value,
  variant,
}: {
  title: string;
  value: string;
  variant: "green" | "orange" | "red" | "blue" | "purple" | "indigo" | "slate";
}) {
  const variantClass = {
    green: "text-emerald-600 bg-emerald-50",
    orange: "text-orange-600 bg-orange-50",
    red: "text-red-600 bg-red-50",
    blue: "text-sky-600 bg-sky-50",
    purple: "text-purple-700 bg-purple-50",
    indigo: "text-indigo-600 bg-indigo-50",
    slate: "text-slate-700 bg-slate-50",
  }[variant];

  return (
    <div className="min-w-0 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg sm:p-5">
      <div
        className={`mb-3 inline-flex max-w-full rounded-2xl px-3 py-1 text-xs font-extrabold leading-tight ${variantClass}`}
      >
        <span className="break-words">{title}</span>
      </div>
      <p className="break-words text-[clamp(1.35rem,2vw,1.9rem)] font-extrabold leading-tight text-slate-900">
        {value}
      </p>
    </div>
  );
}
