import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "../lib/supabase";

import PageHeader from "../components/ui/PageHeader";
import SectionCard from "../components/ui/SectionCard";
import PrimaryButton from "../components/ui/PrimaryButton";
import EmptyState from "../components/ui/EmptyState";

type Agendamento = {
  id: string;
  cliente_id: string | null;
  profissional_id: string | null;
  servico_id: string | null;
  cliente: string | null;
  profissional: string | null;
  servico: string | null;
  data: string | null;
  horario: string | null;
  status: string | null;
  observacoes: string | null;
  no_show: boolean | null;
  created_at: string | null;
};

type Cliente = {
  id: string;
  nome: string;
  telefone?: string | null;
};

type Profissional = {
  id: string;
  nome: string;
};

type Servico = {
  id: string;
  nome: string;
  categoria?: string | null;
  preco?: number | null;
  valor?: number | null;
  duracao_padrao_minutos?: number | null;
  duracao?: number | null;
};

const hoje = new Date();

function dataIso(date: Date) {
  return date.toISOString().slice(0, 10);
}

function adicionarDias(date: Date, dias: number) {
  const nova = new Date(date);
  nova.setDate(nova.getDate() + dias);
  return nova;
}

export default function ConsultaAgendamentos() {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [loading, setLoading] = useState(false);

  const [dataInicio, setDataInicio] = useState(dataIso(hoje));
  const [dataFim, setDataFim] = useState(dataIso(adicionarDias(hoje, 10)));
  const [clienteId, setClienteId] = useState("");
  const [clienteBusca, setClienteBusca] = useState("");
  const [categoria, setCategoria] = useState("");
  const [servicoId, setServicoId] = useState("");
  const [profissionalId, setProfissionalId] = useState("");
  const [status, setStatus] = useState("");
  const [agendadoPor, setAgendadoPor] = useState("Todos");
  const [somenteRecorrentes, setSomenteRecorrentes] = useState(false);

  const [pesquisou, setPesquisou] = useState(false);

  useEffect(() => {
    carregarFiltros();
  }, []);

  async function carregarFiltros() {
    const [clientesResp, profissionaisResp, servicosResp] = await Promise.all([
      supabase.from("clientes").select("id, nome, telefone").order("nome", { ascending: true }),
      supabase.from("profissionais").select("id, nome").order("nome", { ascending: true }),
      supabase.from("servicos").select("*").order("nome", { ascending: true }),
    ]);

    if (!clientesResp.error) setClientes(clientesResp.data || []);
    if (!profissionaisResp.error) setProfissionais(profissionaisResp.data || []);
    if (!servicosResp.error) setServicos(servicosResp.data || []);
  }

  async function pesquisar() {
    setLoading(true);
    setPesquisou(true);

    let query = supabase
      .from("agendamentos")
      .select("*")
      .order("data", { ascending: true })
      .order("horario", { ascending: true });

    if (dataInicio) query = query.gte("data", dataInicio);
    if (dataFim) query = query.lte("data", dataFim);
    if (profissionalId) query = query.eq("profissional_id", profissionalId);
    if (servicoId) query = query.eq("servico_id", servicoId);
    if (status) query = query.eq("status", status);

    if (clienteId) {
      query = query.eq("cliente_id", clienteId);
    }

    const { data, error } = await query;

    if (error) {
      alert("Erro ao consultar agendamentos: " + error.message);
      setAgendamentos([]);
      setLoading(false);
      return;
    }

    let resultado = (data || []) as Agendamento[];

    if (!clienteId && clienteBusca.trim()) {
      const termo = clienteBusca.toLowerCase().trim();

      resultado = resultado.filter((item) => {
        const clienteTexto = `${item.cliente || ""}`.toLowerCase();
        return clienteTexto.includes(termo);
      });
    }

    if (categoria) {
      const servicosDaCategoria = servicos
        .filter((servico) => servico.categoria === categoria)
        .map((servico) => servico.id);

      resultado = resultado.filter((item) => item.servico_id && servicosDaCategoria.includes(item.servico_id));
    }

    if (somenteRecorrentes) {
      // Campo de recorrência ainda não existe no banco. Mantido como filtro futuro.
      resultado = [];
    }

    setAgendamentos(resultado);
    setLoading(false);
  }

  function limpar() {
    setDataInicio(dataIso(hoje));
    setDataFim(dataIso(adicionarDias(hoje, 10)));
    setClienteId("");
    setClienteBusca("");
    setCategoria("");
    setServicoId("");
    setProfissionalId("");
    setStatus("");
    setAgendadoPor("Todos");
    setSomenteRecorrentes(false);
    setAgendamentos([]);
    setPesquisou(false);
  }

  function formatarData(valor?: string | null) {
    if (!valor) return "-";
    const [ano, mes, dia] = valor.split("-");
    return `${dia}/${mes}/${ano}`;
  }

  function formatarDataHora(valor?: string | null) {
    if (!valor) return "-";
    const data = new Date(valor);
    if (Number.isNaN(data.getTime())) return valor;
    return data.toLocaleString("pt-BR");
  }

  function formatarMoeda(valor: number | null | undefined) {
    return Number(valor || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function valorDoServico(agendamento: Agendamento) {
    const servico = servicos.find((item) => item.id === agendamento.servico_id);

    if (!servico) return null;

    return servico.preco ?? servico.valor ?? null;
  }

  function duracaoDoServico(agendamento: Agendamento) {
    const servico = servicos.find((item) => item.id === agendamento.servico_id);

    if (!servico) return null;

    return servico.duracao_padrao_minutos ?? servico.duracao ?? null;
  }

  function exportar() {
    const linhas = agendamentos.map((item) => ({
      Data: formatarData(item.data),
      Hora: item.horario || "",
      Profissional: item.profissional || "",
      Servico: item.servico || "",
      Duracao: duracaoDoServico(item) || "",
      Cliente: item.cliente || "",
      Valor: valorDoServico(item) || "",
      Status: item.status || "",
      Observacoes: item.observacoes || "",
      Cadastro: formatarDataHora(item.created_at),
    }));

    const worksheet = XLSX.utils.json_to_sheet(linhas);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Agendamentos");
    XLSX.writeFile(workbook, "consulta_agendamentos.xlsx");
  }

  const categorias = useMemo(() => {
    const set = new Set<string>();

    servicos.forEach((servico) => {
      if (servico.categoria) set.add(servico.categoria);
    });

    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [servicos]);

  const servicosFiltrados = useMemo(() => {
    if (!categoria) return servicos;
    return servicos.filter((servico) => servico.categoria === categoria);
  }, [servicos, categoria]);

  const clientesFiltrados = useMemo(() => {
    const termo = clienteBusca.toLowerCase().trim();

    if (!termo) return clientes;

    return clientes.filter((cliente) => {
      const texto = `${cliente.nome || ""} ${cliente.telefone || ""}`.toLowerCase();
      return texto.includes(termo);
    });
  }, [clientes, clienteBusca]);

  const totalValor = useMemo(() => {
    return agendamentos.reduce((total, item) => total + Number(valorDoServico(item) || 0), 0);
  }, [agendamentos, servicos]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Agenda"
        title="Consulta de Agendamentos"
        description="Consulte, filtre e exporte agendamentos por período, cliente, serviço, profissional e status."
      />

      <SectionCard>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[120px_1fr_40px_1fr] md:items-center">
              <label className="font-bold text-slate-700 md:text-right">Datas:</label>

              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="rounded-xl border border-slate-300 p-3"
              />

              <span className="text-center font-bold text-slate-600">até</span>

              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="rounded-xl border border-slate-300 p-3"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-[120px_1fr] md:items-center">
              <label className="font-bold text-slate-700 md:text-right">Cliente</label>

              <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_1fr]">
                <input
                  value={clienteBusca}
                  onChange={(e) => {
                    setClienteBusca(e.target.value);
                    setClienteId("");
                  }}
                  placeholder="Digite nome ou telefone"
                  className="rounded-xl border border-slate-300 p-3"
                />

                <select
                  value={clienteId}
                  onChange={(e) => setClienteId(e.target.value)}
                  className="rounded-xl border border-slate-300 p-3"
                >
                  <option value="">Todos os clientes</option>
                  {clientesFiltrados.map((cliente) => (
                    <option key={cliente.id} value={cliente.id}>
                      {cliente.nome} {cliente.telefone ? `- ${cliente.telefone}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-[120px_1fr] md:items-center">
              <label className="font-bold text-slate-700 md:text-right">Categoria</label>

              <select
                value={categoria}
                onChange={(e) => {
                  setCategoria(e.target.value);
                  setServicoId("");
                }}
                className="rounded-xl border border-slate-300 p-3"
              >
                <option value="">-- Selecione --</option>
                {categorias.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-[120px_1fr] md:items-center">
              <label className="font-bold text-slate-700 md:text-right">Serviço</label>

              <select
                value={servicoId}
                onChange={(e) => setServicoId(e.target.value)}
                className="rounded-xl border border-slate-300 p-3"
              >
                <option value="">-- Selecione --</option>
                {servicosFiltrados.map((servico) => (
                  <option key={servico.id} value={servico.id}>
                    {servico.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-[120px_1fr] md:items-center">
              <label className="font-bold text-slate-700 md:text-right">Agendado por</label>

              <select
                value={agendadoPor}
                onChange={(e) => setAgendadoPor(e.target.value)}
                className="rounded-xl border border-slate-300 p-3"
              >
                <option value="Todos">Todos</option>
                <option value="Sistema">Sistema</option>
                <option value="Cliente">Cliente</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[150px_1fr] md:items-center">
              <label className="font-bold text-slate-700 md:text-right">Profissional</label>

              <select
                value={profissionalId}
                onChange={(e) => setProfissionalId(e.target.value)}
                className="rounded-xl border border-slate-300 p-3"
              >
                <option value="">-- Selecione --</option>
                {profissionais.map((profissional) => (
                  <option key={profissional.id} value={profissional.id}>
                    {profissional.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-[150px_1fr] md:items-center">
              <label className="font-bold text-slate-700 md:text-right">Status</label>

              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="rounded-xl border border-slate-300 p-3"
              >
                <option value="">-- Selecione --</option>
                <option value="agendado">Agendado</option>
                <option value="confirmado">Confirmado</option>
                <option value="finalizado">Finalizado</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-[150px_1fr] md:items-center">
              <label className="font-bold text-slate-700 md:text-right">Fechamento Conta</label>

              <select className="rounded-xl border border-slate-300 p-3" disabled>
                <option>-- Selecione --</option>
              </select>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-[150px_1fr] md:items-center">
              <label className="font-bold text-slate-700 md:text-right">Serviços com Fotos</label>

              <select className="rounded-xl border border-slate-300 p-3" disabled>
                <option>Indiferente</option>
              </select>
            </div>

            <label className="ml-0 flex items-center gap-2 text-sm font-bold text-slate-700 md:ml-[150px]">
              <input
                type="checkbox"
                checked={somenteRecorrentes}
                onChange={(e) => setSomenteRecorrentes(e.target.checked)}
              />
              Somente agendamentos recorrentes
            </label>

            <div className="flex justify-end gap-3 pt-2">
              <PrimaryButton type="button" onClick={pesquisar}>
                {loading ? "Pesquisando..." : "Pesquisar"}
              </PrimaryButton>

              <button
                type="button"
                onClick={exportar}
                disabled={agendamentos.length === 0}
                className="rounded-2xl bg-orange-600 px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Exportar
              </button>

              <button
                type="button"
                onClick={limpar}
                className="rounded-2xl bg-slate-300 px-5 py-3 text-sm font-bold text-slate-700"
              >
                Limpar
              </button>
            </div>
          </div>
        </div>
      </SectionCard>

      {pesquisou && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
          <p className="italic">
            Agendamentos de <strong>{formatarData(dataInicio)}</strong> a <strong>{formatarData(dataFim)}</strong>
          </p>

          <p className="italic">
            Relatório gerado em <strong>{new Date().toLocaleString("pt-BR")}</strong>
          </p>
        </div>
      )}

      {loading ? (
        <SectionCard>
          <p>Carregando agendamentos...</p>
        </SectionCard>
      ) : !pesquisou ? (
        <SectionCard>
          <p className="text-sm text-slate-500">
            Use os filtros acima e clique em <strong>Pesquisar</strong>.
          </p>
        </SectionCard>
      ) : agendamentos.length === 0 ? (
        <EmptyState
          title="Nenhum agendamento encontrado"
          description="Ajuste os filtros ou selecione outro período."
        />
      ) : (
        <SectionCard>
          <div className="mb-4 flex flex-wrap justify-between gap-3">
            <div>
              <p className="text-sm text-slate-500">Total de registros</p>
              <p className="text-2xl font-extrabold text-slate-900">{agendamentos.length}</p>
            </div>

            <div>
              <p className="text-sm text-slate-500">Valor estimado</p>
              <p className="text-2xl font-extrabold text-orange-600">{formatarMoeda(totalValor)}</p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-orange-500 text-left text-sm text-white">
                  <th className="px-3 py-3">Data</th>
                  <th className="px-3 py-3">Hora</th>
                  <th className="px-3 py-3">Ações</th>
                  <th className="px-3 py-3">Profissional</th>
                  <th className="px-3 py-3">Serviço</th>
                  <th className="px-3 py-3">Duração</th>
                  <th className="px-3 py-3">Cliente</th>
                  <th className="px-3 py-3 text-right">Valor</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Observações</th>
                  <th className="px-3 py-3">Serviço com Foto</th>
                  <th className="px-3 py-3">Cadastro</th>
                </tr>
              </thead>

              <tbody>
                {agendamentos.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 odd:bg-white even:bg-slate-50">
                    <td className="px-3 py-3 text-sm text-slate-700">{formatarData(item.data)}</td>
                    <td className="px-3 py-3 text-sm text-slate-700">{item.horario || "-"}</td>
                    <td className="px-3 py-3 text-sm text-slate-700">
                      <span title="Ações">⚙️</span>
                    </td>
                    <td className="px-3 py-3 text-sm text-slate-700">{item.profissional || "-"}</td>
                    <td className="px-3 py-3 text-sm text-slate-700">{item.servico || "-"}</td>
                    <td className="px-3 py-3 text-sm text-slate-700">
                      {duracaoDoServico(item) ? `${duracaoDoServico(item)} min` : "-"}
                    </td>
                    <td className="px-3 py-3 text-sm text-slate-700">{item.cliente || "-"}</td>
                    <td className="px-3 py-3 text-right text-sm font-bold text-slate-900">
                      {formatarMoeda(valorDoServico(item))}
                    </td>
                    <td className="px-3 py-3 text-sm">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                        {item.status || "-"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-sm text-slate-700">
                      {item.observacoes ? "💬" : "-"}
                    </td>
                    <td className="px-3 py-3 text-sm text-slate-700">Não</td>
                    <td className="px-3 py-3 text-sm text-slate-700">
                      {formatarDataHora(item.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}
    </div>
  );
}
