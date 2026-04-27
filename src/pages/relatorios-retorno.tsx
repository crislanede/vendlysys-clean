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

export default function RelatoriosRetorno() {
  const { empresaId, carregandoEmpresa } = useEmpresa();

  const [dados, setDados] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  useEffect(() => {
    if (empresaId) carregar();
  }, [empresaId]);

  async function carregar() {
    if (!empresaId) return;

    setLoading(true);

    let query = supabase
      .from("agendamentos")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("data", { ascending: false });

    if (dataInicio) query = query.gte("data", dataInicio);
    if (dataFim) query = query.lte("data", dataFim);

    const { data, error } = await query;

    if (error) {
      alert("Erro ao carregar retorno: " + error.message);
      setLoading(false);
      return;
    }

    setDados(data || []);
    setLoading(false);
  }

  const metricas = useMemo(() => {
    const total = dados.length;

    const finalizados = dados.filter(
      (i) => i.status === "finalizado" || i.status_atendimento === "finalizado"
    );

    const cancelados = dados.filter(
      (i) => i.status === "cancelado" || i.status_atendimento === "cancelado"
    );

    const faturamento = finalizados.reduce(
      (acc, item) => acc + Number(item.valor || 0),
      0
    );

    const ticketMedio =
      finalizados.length > 0 ? faturamento / finalizados.length : 0;

    const taxaCancelamento =
      total > 0 ? Math.round((cancelados.length / total) * 100) : 0;

    return {
      total,
      finalizados: finalizados.length,
      cancelados: cancelados.length,
      faturamento,
      ticketMedio,
      taxaCancelamento,
    };
  }, [dados]);

  const rankingServicos = useMemo(() => {
    const mapa: Record<string, { nome: string; qtd: number; valor: number }> =
      {};

    dados.forEach((item) => {
      const nome = item.servico || "Não informado";
      if (!mapa[nome]) mapa[nome] = { nome, qtd: 0, valor: 0 };

      mapa[nome].qtd += 1;
      mapa[nome].valor += Number(item.valor || 0);
    });

    return Object.values(mapa).sort((a, b) => b.qtd - a.qtd).slice(0, 5);
  }, [dados]);

  const rankingProfissionais = useMemo(() => {
    const mapa: Record<string, { nome: string; qtd: number; valor: number }> =
      {};

    dados.forEach((item) => {
      const nome = item.profissional || "Não informado";
      if (!mapa[nome]) mapa[nome] = { nome, qtd: 0, valor: 0 };

      mapa[nome].qtd += 1;
      mapa[nome].valor += Number(item.valor || 0);
    });

    return Object.values(mapa).sort((a, b) => b.qtd - a.qtd).slice(0, 5);
  }, [dados]);

  function limpar() {
    setDataInicio("");
    setDataFim("");
    setTimeout(() => carregar(), 0);
  }

  function formatarValor(valor: number) {
    return valor.toLocaleString("pt-BR", {
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
    <div className="p-6 space-y-6">
      <div>
        <p className="text-sm font-bold text-pink-600 uppercase">BI</p>
        <h1 className="text-3xl font-bold text-slate-900">
          Dashboard de Retorno
        </h1>
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
          className="bg-pink-600 text-white px-5 py-2 rounded-xl font-semibold"
        >
          Filtrar
        </button>

        <button
          onClick={limpar}
          className="border px-5 py-2 rounded-xl font-semibold"
        >
          Limpar
        </button>
      </div>

      {loading ? (
        <p>Carregando...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card title="Atendimentos" value={metricas.total} />
            <Card title="Finalizados" value={metricas.finalizados} />
            <Card title="Cancelados" value={metricas.cancelados} />
            <Card title="Faturamento" value={formatarValor(metricas.faturamento)} />
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
              subtitulo="Serviços mais realizados no período"
              dados={rankingServicos}
            />

            <Ranking
              titulo="Top profissionais"
              subtitulo="Profissionais com mais atendimentos"
              dados={rankingProfissionais}
            />
          </div>

          <div className="bg-white rounded-2xl border shadow-sm">
            <div className="p-4 border-b">
              <h2 className="font-semibold">Histórico de atendimentos</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left text-slate-500">
                    <th className="p-3">Cliente</th>
                    <th>Serviço</th>
                    <th>Profissional</th>
                    <th>Data</th>
                    <th>Valor</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {dados.map((item) => (
                    <tr key={item.id} className="border-t hover:bg-slate-50">
                      <td className="p-3 font-medium">{item.cliente || "-"}</td>
                      <td>{item.servico || "-"}</td>
                      <td>{item.profissional || "-"}</td>
                      <td>{formatarData(item.data)}</td>
                      <td>{formatarValor(Number(item.valor || 0))}</td>
                      <td>
                        <span className="text-xs px-2 py-1 rounded-full bg-slate-100">
                          {item.status || item.status_atendimento || "-"}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {dados.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-slate-400">
                        Nenhum atendimento encontrado
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
              <p className="font-semibold text-slate-800">
                {index + 1}. {item.nome}
              </p>
              <p className="text-xs text-slate-500">{item.qtd} atendimento(s)</p>
            </div>

            <p className="text-sm font-bold text-slate-900">
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