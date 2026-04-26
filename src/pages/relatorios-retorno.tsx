import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Agendamento = {
  id: string;
  cliente: string;
  servico: string;
  profissional: string;
  data: string;
  valor: number;
  status: string;
};

export default function Relatorios() {
  const [dados, setDados] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);

  const [total, setTotal] = useState(0);
  const [faturamento, setFaturamento] = useState(0);
  const [finalizados, setFinalizados] = useState(0);
  const [cancelados, setCancelados] = useState(0);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    setLoading(true);

    const { data, error } = await supabase
      .from("agendamentos")
      .select("*");

    if (error) {
      console.error("Erro ao carregar relatórios:", error);
      setLoading(false);
      return;
    }

    const lista = data || [];

    setDados(lista);

    // métricas
    setTotal(lista.length);

    const finalizadosList = lista.filter(
      (i) => i.status === "finalizado"
    );

    setFinalizados(finalizadosList.length);

    setCancelados(
      lista.filter((i) => i.status === "cancelado").length
    );

    const totalFaturado = finalizadosList.reduce(
      (acc, item) => acc + Number(item.valor || 0),
      0
    );

    setFaturamento(totalFaturado);

    setLoading(false);
  }

  function formatarValor(valor: number) {
    return valor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Relatórios</h1>

      {loading ? (
        <p>Carregando...</p>
      ) : (
        <>
          {/* Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card title="Total de atendimentos" value={total} />
            <Card title="Finalizados" value={finalizados} />
            <Card title="Cancelados" value={cancelados} />
            <Card
              title="Faturamento"
              value={formatarValor(faturamento)}
            />
          </div>

          {/* Tabela */}
          <div className="bg-white rounded-xl shadow p-4">
            <h2 className="font-semibold mb-3">
              Últimos atendimentos
            </h2>

            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th>Cliente</th>
                  <th>Serviço</th>
                  <th>Profissional</th>
                  <th>Data</th>
                  <th>Valor</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {dados.map((item) => (
                  <tr key={item.id} className="border-b">
                    <td>{item.cliente}</td>
                    <td>{item.servico}</td>
                    <td>{item.profissional}</td>
                    <td>{item.data}</td>
                    <td>{formatarValor(item.valor || 0)}</td>
                    <td>{item.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Card({ title, value }: any) {
  return (
    <div className="bg-white p-4 rounded-xl shadow">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}