import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type Agendamento = {
  id: string;
  cliente?: string | null;
  telefone?: string | null;
  servico?: string | null;
  profissional?: string | null;
  data?: string | null;
  horario?: string | null;
  status?: string | null;
  valor?: number | null;
  observacoes?: string | null;
  token?: string | null;
  token_cliente?: string | null;
  created_at?: string | null;
};

type StatusFiltro =
  | "todos"
  | "agendado"
  | "confirmado"
  | "finalizado"
  | "cancelado";

function formatarData(data?: string | null) {
  if (!data) return "-";

  const partes = data.split("-");

  if (partes.length !== 3) return data;

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function formatarValor(valor?: number | null) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function normalizarTexto(valor?: string | null) {
  return String(valor || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function statusBadgeClass(status?: string | null) {
  const statusNormalizado = normalizarTexto(status);

  if (statusNormalizado === "confirmado") {
    return "bg-blue-100 text-blue-700";
  }

  if (statusNormalizado === "finalizado" || statusNormalizado === "pago") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (statusNormalizado === "cancelado") {
    return "bg-red-100 text-red-700";
  }

  return "bg-orange-100 text-orange-700";
}

function statusLabel(status?: string | null) {
  return status || "agendado";
}

export default function ConsultaAgendamentos() {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState<StatusFiltro>("todos");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void carregarAgendamentos();
  }, []);

  async function carregarAgendamentos() {
    setLoading(true);

    const { data, error } = await supabase
      .from("agendamentos")
      .select("*")
      .order("data", { ascending: false })
      .order("horario", { ascending: false })
      .limit(500);

    if (error) {
      console.error("Erro ao carregar agendamentos:", error);
      alert("Erro ao carregar agendamentos: " + error.message);
      setAgendamentos([]);
      setLoading(false);
      return;
    }

    setAgendamentos((data || []) as Agendamento[]);
    setLoading(false);
  }

  function limparFiltros() {
    setBusca("");
    setStatus("todos");
    setDataInicio("");
    setDataFim("");
  }

  const filtrados = useMemo(() => {
    const termo = normalizarTexto(busca);

    return agendamentos.filter((agendamento) => {
      const texto = normalizarTexto(
        `${agendamento.cliente || ""} ${agendamento.telefone || ""} ${
          agendamento.servico || ""
        } ${agendamento.profissional || ""} ${agendamento.status || ""}`
      );

      const bateBusca = !termo || texto.includes(termo);

      const statusAtual = normalizarTexto(agendamento.status || "agendado");
      const bateStatus = status === "todos" || statusAtual === status;

      const data = agendamento.data || "";
      const bateInicio = !dataInicio || data >= dataInicio;
      const bateFim = !dataFim || data <= dataFim;

      return bateBusca && bateStatus && bateInicio && bateFim;
    });
  }, [agendamentos, busca, status, dataInicio, dataFim]);

  const resumo = useMemo(() => {
    return {
      total: filtrados.length,
      agendados: filtrados.filter(
        (item) => normalizarTexto(item.status || "agendado") === "agendado"
      ).length,
      confirmados: filtrados.filter(
        (item) => normalizarTexto(item.status) === "confirmado"
      ).length,
      finalizados: filtrados.filter(
        (item) => normalizarTexto(item.status) === "finalizado"
      ).length,
      cancelados: filtrados.filter(
        (item) => normalizarTexto(item.status) === "cancelado"
      ).length,
    };
  }, [filtrados]);

  function abrirMeuEspaco(agendamento: Agendamento) {
    const token = agendamento.token_cliente || agendamento.token;

    if (!token) {
      alert("Este agendamento não possui token do cliente.");
      return;
    }

    window.open(`${window.location.origin}/meu-espaco?token=${token}`, "_blank");
  }

  return (
    <div className="space-y-6">
      <div>
        <p
          className="text-xs font-extrabold uppercase tracking-wide"
          style={{ color: "var(--color-primary)" }}
        >
          Agenda
        </p>

        <h1 className="mt-1 text-3xl font-extrabold text-slate-950">
          Consulta de Agendamentos
        </h1>

        <p className="mt-1 text-sm font-semibold text-slate-500">
          Pesquise, filtre e acompanhe todos os agendamentos cadastrados.
        </p>
      </div>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-5">
        <ResumoCard label="Total" valor={resumo.total} />
        <ResumoCard label="Agendados" valor={resumo.agendados} />
        <ResumoCard label="Confirmados" valor={resumo.confirmados} />
        <ResumoCard label="Finalizados" valor={resumo.finalizados} />
        <ResumoCard label="Cancelados" valor={resumo.cancelados} destaque="danger" />
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold text-slate-950">Filtros</h2>
            <p className="text-sm font-semibold text-slate-500">
              Combine busca, status e período.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={limparFiltros}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-extrabold text-slate-700 transition hover:bg-slate-50"
            >
              Limpar
            </button>

            <button
              type="button"
              onClick={() => void carregarAgendamentos()}
              className="rounded-2xl px-4 py-3 text-sm font-extrabold text-white transition disabled:opacity-50"
              style={{ backgroundColor: "var(--color-primary)" }}
              disabled={loading}
            >
              {loading ? "Atualizando..." : "Atualizar"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_220px_180px_180px]">
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-[var(--color-primary)]"
            placeholder="Buscar por cliente, telefone, serviço ou profissional"
          />

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFiltro)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-extrabold text-slate-700 outline-none transition focus:border-[var(--color-primary)]"
          >
            <option value="todos">Todos os status</option>
            <option value="agendado">Agendado</option>
            <option value="confirmado">Confirmado</option>
            <option value="finalizado">Finalizado</option>
            <option value="cancelado">Cancelado</option>
          </select>

          <input
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-[var(--color-primary)]"
          />

          <input
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-[var(--color-primary)]"
          />
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold text-slate-950">
              Resultado
            </h2>
            <p className="text-sm font-semibold text-slate-500">
              {filtrados.length} agendamento(s) encontrado(s)
            </p>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-slate-50 p-5 text-sm font-semibold text-slate-500">
            Carregando agendamentos...
          </div>
        ) : filtrados.length === 0 ? (
          <div className="rounded-2xl bg-orange-50 p-5 text-sm font-semibold text-orange-700">
            Nenhum agendamento encontrado para os filtros informados.
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-slate-200">
            <div className="hidden grid-cols-[1.2fr_1.2fr_1fr_130px_130px_150px] gap-3 bg-slate-50 px-4 py-3 text-xs font-extrabold uppercase text-slate-500 xl:grid">
              <span>Cliente</span>
              <span>Serviço</span>
              <span>Profissional</span>
              <span>Data</span>
              <span>Status</span>
              <span className="text-right">Ações</span>
            </div>

            <div className="divide-y divide-slate-200">
              {filtrados.map((agendamento) => (
                <div
                  key={agendamento.id}
                  className="grid grid-cols-1 gap-3 px-4 py-4 transition hover:bg-slate-50 xl:grid-cols-[1.2fr_1.2fr_1fr_130px_130px_150px] xl:items-center"
                >
                  <div>
                    <p className="font-extrabold text-slate-950">
                      {agendamento.cliente || "Cliente não informado"}
                    </p>
                    <p className="text-xs font-semibold text-slate-500">
                      {agendamento.telefone || "Sem telefone"}
                    </p>
                  </div>

                  <div>
                    <p className="font-bold text-slate-800">
                      {agendamento.servico || "Serviço não informado"}
                    </p>
                    <p className="text-xs font-semibold text-slate-500">
                      {agendamento.valor ? formatarValor(agendamento.valor) : ""}
                    </p>
                  </div>

                  <div className="text-sm font-semibold text-slate-600">
                    {agendamento.profissional || "-"}
                  </div>

                  <div>
                    <p className="text-sm font-extrabold text-slate-900">
                      {formatarData(agendamento.data)}
                    </p>
                    <p className="text-xs font-semibold text-slate-500">
                      {agendamento.horario || "-"}
                    </p>
                  </div>

                  <div>
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-extrabold ${statusBadgeClass(
                        agendamento.status
                      )}`}
                    >
                      {statusLabel(agendamento.status)}
                    </span>
                  </div>

                  <div className="flex justify-start gap-2 xl:justify-end">
                    <button
                      type="button"
                      onClick={() => abrirMeuEspaco(agendamento)}
                      className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-700 transition hover:bg-slate-50"
                    >
                      Meu Espaço
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function ResumoCard({
  label,
  valor,
  destaque,
}: {
  label: string;
  valor: number;
  destaque?: "danger";
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-extrabold uppercase text-slate-500">{label}</p>
      <p
        className={`mt-2 text-3xl font-extrabold ${
          destaque === "danger" ? "text-red-600" : "text-slate-950"
        }`}
      >
        {valor}
      </p>
    </div>
  );
}
