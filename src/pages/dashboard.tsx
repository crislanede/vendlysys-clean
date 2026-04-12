import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Agendamento = {
  id: string;
  cliente: string;
  servico: string;
  horario: string;
  status: string;
  data: string;
  valor: number | null;
};

export default function DashboardPage() {
  const [agendamentosHoje, setAgendamentosHoje] = useState(0);
  const [clientes, setClientes] = useState(0);
  const [faturamento, setFaturamento] = useState(0);
  const [servicos, setServicos] = useState(0);
  const [proximos, setProximos] = useState<Agendamento[]>([]);
  const [resumo, setResumo] = useState({
    confirmado: 0,
    pendente: 0,
    cancelado: 0,
  });

  useEffect(() => {
    carregarDashboard();
  }, []);

  async function carregarDashboard() {
    const hoje = new Date().toISOString().split("T")[0];
    const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split("T")[0];

    // AGENDAMENTOS DE HOJE
    const { data: agHoje } = await supabase
      .from("agendamentos")
      .select("*")
      .eq("data", hoje);

    setAgendamentosHoje(agHoje?.length || 0);

    // CLIENTES
    const { count: totalClientes } = await supabase
      .from("clientes")
      .select("*", { count: "exact", head: true });

    setClientes(totalClientes || 0);

    // SERVIÇOS
    const { count: totalServicos } = await supabase
      .from("servicos")
      .select("*", { count: "exact", head: true });

    setServicos(totalServicos || 0);

    // FATURAMENTO DO MÊS
    const { data: financeiro } = await supabase
      .from("financeiro")
      .select("valor")
      .gte("data_lancamento", inicioMes);

    const total = financeiro?.reduce((acc, item) => acc + Number(item.valor || 0), 0) || 0;
    setFaturamento(total);

    // PRÓXIMOS AGENDAMENTOS
    const { data: proximosData } = await supabase
      .from("agendamentos")
      .select("*")
      .gte("data", hoje)
      .order("data", { ascending: true })
      .order("horario", { ascending: true })
      .limit(4);

    setProximos((proximosData || []) as Agendamento[]);

    // RESUMO
    const confirmado = agHoje?.filter((a) => a.status === "confirmado").length || 0;
    const pendente = agHoje?.filter((a) => a.status === "pendente").length || 0;
    const cancelado = agHoje?.filter((a) => a.status === "cancelado").length || 0;

    setResumo({ confirmado, pendente, cancelado });
  }

  function formatarMoeda(valor: number) {
    return valor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-slate-500">Visão geral do sistema</p>
        </div>
      </div>

      {/* CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card title="Agendamentos hoje" value={agendamentosHoje} />
        <Card title="Clientes ativos" value={clientes} />
        <Card title="Faturamento do mês" value={formatarMoeda(faturamento)} />
        <Card title="Serviços cadastrados" value={servicos} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* PRÓXIMOS */}
        <div className="col-span-2 bg-white p-4 rounded border">
          <h2 className="font-bold mb-3">Próximos agendamentos</h2>

          {proximos.map((a) => (
            <div key={a.id} className="border p-3 rounded mb-2 flex justify-between">
              <div>
                <p className="font-semibold">{a.cliente}</p>
                <p className="text-sm text-gray-500">{a.servico}</p>
              </div>

              <div className="text-right">
                <p>{a.horario}</p>
                <p className="text-xs">{a.status}</p>
              </div>
            </div>
          ))}
        </div>

        {/* RESUMO */}
        <div className="bg-white p-4 rounded border">
          <h2 className="font-bold mb-3">Resumo</h2>

          <Item label="Confirmados" value={resumo.confirmado} />
          <Item label="Pendentes" value={resumo.pendente} />
          <Item label="Cancelados" value={resumo.cancelado} />
        </div>
      </div>
    </div>
  );
}

function Card({ title, value }: any) {
  return (
    <div className="bg-white p-4 rounded border">
      <p className="text-sm text-gray-500">{title}</p>
      <h2 className="text-2xl font-bold">{value}</h2>
    </div>
  );
}

function Item({ label, value }: any) {
  return (
    <div className="flex justify-between py-2 border-b">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}