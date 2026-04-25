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
import EmptyState from "../components/ui/EmptyState";

type Financeiro = {
  id: string;
  tipo?: string | null;
  descricao?: string | null;
  valor?: number | null;
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
  created_at?: string | null;
};

type GraficoLinha = {
  data: string;
  receita: number;
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
  return new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10);
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
  dataFim: string
): GraficoLinha[] {
  const mapa = new Map<string, GraficoLinha>();

  function garantirData(data: string) {
    if (!mapa.has(data)) {
      mapa.set(data, {
        data,
        receita: 0,
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

    const linha = garantirData(data);
    const valor = Number(item.valor || 0);
    const status = normalizarStatus(item.status);

    if (status === "cancelado") continue;

    if ((item.tipo || "").toLowerCase() === "entrada") {
      linha.receita += valor;
    } else if ((item.tipo || "").toLowerCase() === "saida") {
      linha.despesa += valor;
    }
  }

  for (const item of despesas) {
    const data = dataDespesa(item);
    if (!data) continue;

    const status = normalizarStatus(item.status);
    if (status === "cancelado") continue;

    const linha = garantirData(data);
    linha.despesa += Number(item.valor || 0);
  }

  for (const item of agendamentos) {
    const data = dataAgendamento(item);
    if (!data) continue;

    const status = normalizarStatus(item.status);
    if (status === "cancelado") continue;

    const linha = garantirData(data);
    linha.agendamentos += 1;
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

    const [financeiroResp, despesasResp, agendamentosResp] = await Promise.all([
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
      const todasDespesas = ((despesasResp.data || []) as Despesa[]).filter((item) => {
        const data = dataDespesa(item);
        if (!data) return false;
        return data >= dataInicio && data <= dataFim;
      });

      setDespesas(todasDespesas);
    }

    if (agendamentosResp.error) {
      console.error("Erro ao carregar agendamentos:", agendamentosResp.error);
      alert("Erro ao carregar agendamentos: " + agendamentosResp.error.message);
      setAgendamentos([]);
    } else {
      setAgendamentos((agendamentosResp.data || []) as Agendamento[]);
    }

    setLoading(false);
  }

  const indicadores = useMemo(() => {
    const financeiroValido = financeiro.filter(
      (item) => normalizarStatus(item.status) !== "cancelado"
    );

    const entradas = financeiroValido.filter(
      (item) => (item.tipo || "").toLowerCase() === "entrada"
    );

    const saidasFinanceiro = financeiroValido.filter(
      (item) => (item.tipo || "").toLowerCase() === "saida"
    );

    const despesasValidas = despesas.filter(
      (item) => normalizarStatus(item.status) !== "cancelado"
    );

    const agendamentosValidos = agendamentos.filter(
      (item) => normalizarStatus(item.status) !== "cancelado"
    );

    const agendamentosFinalizados = agendamentos.filter((item) => {
      const status = normalizarStatus(item.status);
      return status === "finalizado" || status === "pago";
    });

    const receita = entradas.reduce((acc, item) => acc + Number(item.valor || 0), 0);
    const saidaFinanceira = saidasFinanceiro.reduce(
      (acc, item) => acc + Number(item.valor || 0),
      0
    );
    const totalDespesas = despesasValidas.reduce(
      (acc, item) => acc + Number(item.valor || 0),
      0
    );

    const despesaTotal = saidaFinanceira + totalDespesas;
    const resultado = receita - despesaTotal;

    const ticketMedio =
      entradas.length > 0 ? receita / entradas.length : 0;

    const online = entradas
      .filter((item) => {
        const forma = (item.forma_pagamento || "").toLowerCase();
        return forma.includes("pix") || forma.includes("credito") || forma.includes("débito") || forma.includes("debito") || forma.includes("online");
      })
      .reduce((acc, item) => acc + Number(item.valor || 0), 0);

    return {
      faturamento: resultado,
      receita,
      despesa: despesaTotal,
      agendamentos: agendamentosValidos.length,
      agendamentosFinalizados: agendamentosFinalizados.length,
      online,
      ticketMedio,
    };
  }, [financeiro, despesas, agendamentos]);

  const dadosPorData = useMemo(
    () => agruparPorData(financeiro, despesas, agendamentos, dataInicio, dataFim),
    [financeiro, despesas, agendamentos, dataInicio, dataFim]
  );

  const dadosPorCategoria = useMemo<GraficoCategoria[]>(() => {
    const mapa = new Map<string, number>();

    for (const item of financeiro) {
      if (normalizarStatus(item.status) === "cancelado") continue;
      if ((item.tipo || "").toLowerCase() !== "entrada") continue;

      const categoria = item.servico || item.descricao || "Sem categoria";
      mapa.set(categoria, (mapa.get(categoria) || 0) + Number(item.valor || 0));
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
      <PageHeader
        eyebrow="Visão geral"
        title="Dashboard"
        description="Acompanhe o desempenho financeiro, atendimentos e indicadores do negócio por período."
      />

      <SectionCard title="Período" description="Filtre os indicadores e gráficos por data.">
        <div className="flex flex-wrap items-end gap-3">
          <button
            type="button"
            onClick={() => aplicarPeriodoRapido("hoje")}
            className={`rounded-2xl px-4 py-3 text-sm font-extrabold ${
              periodoRapido === "hoje" ? "text-white" : "bg-white text-slate-700"
            }`}
            style={{
              backgroundColor:
                periodoRapido === "hoje" ? "var(--color-primary)" : undefined,
              border:
                periodoRapido === "hoje" ? "none" : "1px solid rgb(226 232 240)",
            }}
          >
            Hoje
          </button>

          <button
            type="button"
            onClick={() => aplicarPeriodoRapido("7dias")}
            className={`rounded-2xl px-4 py-3 text-sm font-extrabold ${
              periodoRapido === "7dias" ? "text-white" : "bg-white text-slate-700"
            }`}
            style={{
              backgroundColor:
                periodoRapido === "7dias" ? "var(--color-primary)" : undefined,
              border:
                periodoRapido === "7dias" ? "none" : "1px solid rgb(226 232 240)",
            }}
          >
            7 dias
          </button>

          <button
            type="button"
            onClick={() => aplicarPeriodoRapido("mes")}
            className={`rounded-2xl px-4 py-3 text-sm font-extrabold ${
              periodoRapido === "mes" ? "text-white" : "bg-white text-slate-700"
            }`}
            style={{
              backgroundColor:
                periodoRapido === "mes" ? "var(--color-primary)" : undefined,
              border:
                periodoRapido === "mes" ? "none" : "1px solid rgb(226 232 240)",
            }}
          >
            Mês atual
          </button>

          <button
            type="button"
            onClick={() => aplicarPeriodoRapido("30dias")}
            className={`rounded-2xl px-4 py-3 text-sm font-extrabold ${
              periodoRapido === "30dias" ? "text-white" : "bg-white text-slate-700"
            }`}
            style={{
              backgroundColor:
                periodoRapido === "30dias" ? "var(--color-primary)" : undefined,
              border:
                periodoRapido === "30dias" ? "none" : "1px solid rgb(226 232 240)",
            }}
          >
            30 dias
          </button>

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

          <PrimaryButton type="button" onClick={() => void carregarDados()} disabled={loading}>
            {loading ? "Atualizando..." : "Pesquisar"}
          </PrimaryButton>
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
        <KpiCard title="Resultado" value={formatarMoeda(indicadores.faturamento)} />
        <KpiCard title="Receita" value={formatarMoeda(indicadores.receita)} />
        <KpiCard title="Despesa" value={formatarMoeda(indicadores.despesa)} />
        <KpiCard title="Agendamentos" value={String(indicadores.agendamentos)} />
        <KpiCard title="Online" value={formatarMoeda(indicadores.online)} />
        <KpiCard title="Ticket médio" value={formatarMoeda(indicadores.ticketMedio)} />
      </div>

      <SectionCard
        title="Resultado por dia"
        description="Receita, despesa e resultado líquido no período selecionado."
      >
        {dadosPorData.length === 0 ? (
          <EmptyState title="Sem dados no período" />
        ) : (
          <div className="h-80 w-full">
            <ResponsiveContainer>
              <LineChart data={dadosPorData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="data" tickFormatter={formatarData} />
                <YAxis />
                <Tooltip
                  formatter={(value) => formatarMoeda(Number(value))}
                  labelFormatter={(label) => formatarData(String(label))}
                />
                <Legend />
                <Line type="monotone" dataKey="receita" name="Receita" stroke="var(--color-primary)" strokeWidth={3} />
                <Line type="monotone" dataKey="despesa" name="Despesa" stroke="#ef4444" strokeWidth={3} />
                <Line type="monotone" dataKey="resultado" name="Resultado" stroke="var(--color-secondary)" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </SectionCard>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SectionCard title="Receita x Despesa">
          <div className="h-80 w-full">
            <ResponsiveContainer>
              <BarChart data={dadosPorData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="data" tickFormatter={formatarData} />
                <YAxis />
                <Tooltip
                  formatter={(value) => formatarMoeda(Number(value))}
                  labelFormatter={(label) => formatarData(String(label))}
                />
                <Legend />
                <Bar dataKey="receita" name="Receita" fill="var(--color-primary)" />
                <Bar dataKey="despesa" name="Despesa" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Quantidade de atendimentos">
          <div className="h-80 w-full">
            <ResponsiveContainer>
              <BarChart data={dadosPorData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="data" tickFormatter={formatarData} />
                <YAxis allowDecimals={false} />
                <Tooltip labelFormatter={(label) => formatarData(String(label))} />
                <Bar dataKey="agendamentos" name="Agendamentos" fill="var(--color-primary)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Representatividade por serviço em R$">
          {dadosPorCategoria.length === 0 ? (
            <EmptyState title="Sem receita por serviço" />
          ) : (
            <div className="h-80 w-full">
              <ResponsiveContainer>
                <BarChart data={dadosPorCategoria} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(value) => formatarMoeda(Number(value))} />
                  <YAxis type="category" dataKey="name" width={120} />
                  <Tooltip formatter={(value) => formatarMoeda(Number(value))} />
                  <Bar dataKey="value" name="Receita" fill="var(--color-primary)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Distribuição de atendimentos">
          {quantidadePorServico.length === 0 ? (
            <EmptyState title="Sem atendimentos por serviço" />
          ) : (
            <div className="h-80 w-full">
              <ResponsiveContainer>
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
                        fill={index % 2 === 0 ? "var(--color-primary)" : "var(--color-secondary)"}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Últimos lançamentos financeiros">
        {ultimosLancamentos.length === 0 ? (
          <EmptyState title="Nenhum lançamento financeiro no período" />
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
                  <tr key={item.id} className="border-b border-slate-100 odd:bg-white even:bg-slate-50">
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
                      {(item.tipo || "").toLowerCase() === "entrada" ? "+" : "-"}{" "}
                      {formatarMoeda(Number(item.valor || 0))}
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

function KpiCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-extrabold text-slate-900">{value}</p>
    </div>
  );
}
