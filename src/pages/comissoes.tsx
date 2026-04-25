import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

import PageHeader from "../components/ui/PageHeader";
import SectionCard from "../components/ui/SectionCard";

type Agendamento = {
  id: string;
  profissional: string;
  data: string;
  valor: number | null;
  status: string;
  status_atendimento: string | null;
};

type Profissional = {
  id: string;
  nome: string;
  percentual_comissao: number | null;
};

type ResumoComissao = {
  profissional: string;
  percentual: number;
  atendimentos: number;
  faturado: number;
  comissao: number;
};

export default function ComissoesPage() {
  const hoje = new Date().toISOString().split("T")[0];
  const primeiroDiaMes = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1
  )
    .toISOString()
    .split("T")[0];

  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [loading, setLoading] = useState(true);

  const [dataInicio, setDataInicio] = useState(primeiroDiaMes);
  const [dataFim, setDataFim] = useState(hoje);

  useEffect(() => {
    void carregarDados();
  }, []);

  async function carregarDados() {
    setLoading(true);

    const { data: agData } = await supabase
      .from("agendamentos")
      .select("id, profissional, data, valor, status, status_atendimento")
      .order("data", { ascending: false });

    const { data: profData } = await supabase
      .from("profissionais")
      .select("id, nome, percentual_comissao")
      .eq("ativo", true)
      .order("nome", { ascending: true });

    setAgendamentos((agData || []) as Agendamento[]);
    setProfissionais((profData || []) as Profissional[]);
    setLoading(false);
  }

  function dentroDoPeriodo(dataStr: string) {
    if (dataInicio && dataStr < dataInicio) return false;
    if (dataFim && dataStr > dataFim) return false;
    return true;
  }

  const agendamentosBase = useMemo(() => {
    return agendamentos.filter((item) => {
      return (
        dentroDoPeriodo(item.data) &&
        item.status !== "cancelado" &&
        item.status_atendimento === "finalizado"
      );
    });
  }, [agendamentos, dataInicio, dataFim]);

  const resumoComissoes: ResumoComissao[] = useMemo(() => {
    return profissionais.map((prof) => {
      const atendimentosDoProfissional = agendamentosBase.filter(
        (ag) => ag.profissional === prof.nome
      );

      const faturado = atendimentosDoProfissional.reduce(
        (acc, item) => acc + Number(item.valor || 0),
        0
      );

      const percentual = Number(prof.percentual_comissao || 0);
      const comissao = faturado * (percentual / 100);

      return {
        profissional: prof.nome,
        percentual,
        atendimentos: atendimentosDoProfissional.length,
        faturado,
        comissao,
      };
    });
  }, [profissionais, agendamentosBase]);

  const totalFaturado = resumoComissoes.reduce(
    (acc, item) => acc + item.faturado,
    0
  );
  const totalComissoes = resumoComissoes.reduce(
    (acc, item) => acc + item.comissao,
    0
  );

  function formatarMoeda(valor: number) {
    return valor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function limparPeriodo() {
    setDataInicio(primeiroDiaMes);
    setDataFim(hoje);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Equipe"
        title="Comissões"
        description="Cálculo de comissão por profissional com base nos atendimentos finalizados."
      />

      <SectionCard title="Período">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <input
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            className="rounded-2xl border border-slate-200 p-3"
          />
          <input
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            className="rounded-2xl border border-slate-200 p-3"
          />
          <button
            type="button"
            onClick={limparPeriodo}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700"
          >
            Restaurar mês atual
          </button>
        </div>
      </SectionCard>

      {loading ? (
        <SectionCard>
          <p>Carregando...</p>
        </SectionCard>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <ResumoCard
              title="Atendimentos finalizados"
              value={String(agendamentosBase.length)}
              valueClassName="text-slate-800"
            />
            <ResumoCard
              title="Faturado no período"
              value={formatarMoeda(totalFaturado)}
              valueClassName="text-green-600"
            />
            <ResumoCard
              title="Total de comissões"
              value={formatarMoeda(totalComissoes)}
              valueClassName="text-orange-600"
            />
          </div>

          <SectionCard title="Resumo por profissional">
            <div className="space-y-3">
              {resumoComissoes.map((item) => (
                <div
                  key={item.profissional}
                  className="flex justify-between gap-4 rounded-2xl border border-slate-200 p-4"
                >
                  <div>
                    <p className="font-semibold text-slate-800">
                      {item.profissional}
                    </p>
                    <p className="text-sm text-slate-500">
                      Atendimentos: {item.atendimentos}
                    </p>
                    <p className="text-sm text-slate-500">
                      Comissão: {item.percentual}%
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm text-slate-500">
                      Faturado: {formatarMoeda(item.faturado)}
                    </p>
                    <p className="font-semibold text-orange-600">
                      Receber: {formatarMoeda(item.comissao)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </>
      )}
    </div>
  );
}

function ResumoCard({
  title,
  value,
  valueClassName,
}: {
  title: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>
      <p className={`mt-2 text-3xl font-bold ${valueClassName || "text-slate-800"}`}>
        {value}
      </p>
    </div>
  );
}