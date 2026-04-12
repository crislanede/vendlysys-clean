import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type Lancamento = {
  id: string;
  tipo: string;
  descricao: string;
  valor: number;
  data_lancamento: string;
  status: string;
  cliente: string | null;
  profissional: string | null;
  servico: string | null;
  agendamento_id: string | null;
  observacoes: string | null;
  created_at?: string;
};

export default function FinanceiroPage() {
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [loading, setLoading] = useState(true);

  const [tipo, setTipo] = useState("entrada");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [dataLancamento, setDataLancamento] = useState("");
  const [status, setStatus] = useState("pendente");
  const [cliente, setCliente] = useState("");
  const [profissional, setProfissional] = useState("");
  const [servico, setServico] = useState("");
  const [observacoes, setObservacoes] = useState("");

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  const [filtroData, setFiltroData] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");

  async function carregarLancamentos() {
    setLoading(true);

    const { data, error } = await supabase
      .from("financeiro")
      .select("*")
      .order("data_lancamento", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao carregar financeiro:", error);
      setLancamentos([]);
      setLoading(false);
      return;
    }

    setLancamentos((data || []) as Lancamento[]);
    setLoading(false);
  }

  useEffect(() => {
    carregarLancamentos();
  }, []);

  function limparFormulario() {
    setTipo("entrada");
    setDescricao("");
    setValor("");
    setDataLancamento("");
    setStatus("pendente");
    setCliente("");
    setProfissional("");
    setServico("");
    setObservacoes("");
    setEditandoId(null);
    setMostrarFormulario(false);
  }

  async function salvarLancamento(e: React.FormEvent) {
    e.preventDefault();

    if (!descricao || !valor || !dataLancamento) {
      alert("Preencha descrição, valor e data.");
      return;
    }

    const payload = {
      tipo,
      descricao,
      valor: Number(valor),
      data_lancamento: dataLancamento,
      status,
      cliente: cliente || null,
      profissional: profissional || null,
      servico: servico || null,
      observacoes: observacoes || null,
    };

    if (editandoId) {
      const { error } = await supabase
        .from("financeiro")
        .update(payload)
        .eq("id", editandoId);

      if (error) {
        console.error("Erro ao atualizar lançamento:", error);
        alert("Erro ao atualizar lançamento.");
        return;
      }

      limparFormulario();
      carregarLancamentos();
      return;
    }

    const { error } = await supabase.from("financeiro").insert([payload]);

    if (error) {
      console.error("Erro ao salvar lançamento:", error);
      alert("Erro ao salvar lançamento.");
      return;
    }

    limparFormulario();
    carregarLancamentos();
  }

  function editarLancamento(item: Lancamento) {
    setTipo(item.tipo);
    setDescricao(item.descricao);
    setValor(String(item.valor));
    setDataLancamento(item.data_lancamento);
    setStatus(item.status);
    setCliente(item.cliente || "");
    setProfissional(item.profissional || "");
    setServico(item.servico || "");
    setObservacoes(item.observacoes || "");
    setEditandoId(item.id);
    setMostrarFormulario(true);
  }

  async function excluirLancamento(id: string) {
    const confirmar = window.confirm("Excluir lançamento?");
    if (!confirmar) return;

    const { error } = await supabase.from("financeiro").delete().eq("id", id);

    if (error) {
      console.error("Erro ao excluir lançamento:", error);
      alert("Erro ao excluir lançamento.");
      return;
    }

    carregarLancamentos();
  }

  async function marcarComoPago(id: string) {
    const { error } = await supabase
      .from("financeiro")
      .update({ status: "pago" })
      .eq("id", id);

    if (error) {
      console.error("Erro ao marcar como pago:", error);
      alert("Erro ao marcar como pago.");
      return;
    }

    carregarLancamentos();
  }

  const lancamentosFiltrados = useMemo(() => {
    return lancamentos.filter((item) => {
      const bateData = filtroData ? item.data_lancamento === filtroData : true;
      const bateTipo = filtroTipo ? item.tipo === filtroTipo : true;
      const bateStatus = filtroStatus ? item.status === filtroStatus : true;

      return bateData && bateTipo && bateStatus;
    });
  }, [lancamentos, filtroData, filtroTipo, filtroStatus]);

  const totalEntradas = lancamentosFiltrados
    .filter((item) => item.tipo === "entrada" && item.status !== "cancelado")
    .reduce((acc, item) => acc + Number(item.valor), 0);

  const totalSaidas = lancamentosFiltrados
    .filter((item) => item.tipo === "saida" && item.status !== "cancelado")
    .reduce((acc, item) => acc + Number(item.valor), 0);

  const saldo = totalEntradas - totalSaidas;

  function formatarMoeda(valor: number) {
    return valor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function formatarData(data: string) {
    return new Date(data).toLocaleDateString("pt-BR");
  }

  function limparFiltros() {
    setFiltroData("");
    setFiltroTipo("");
    setFiltroStatus("");
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Financeiro</h1>

        <button
          onClick={() => {
            if (mostrarFormulario) {
              limparFormulario();
            } else {
              setMostrarFormulario(true);
            }
          }}
          className="bg-orange-500 text-white px-4 py-2 rounded"
        >
          {mostrarFormulario ? "Fechar" : "Novo lançamento"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border rounded-lg p-4">
          <p className="text-sm text-slate-500">Entradas</p>
          <p className="text-2xl font-bold text-green-600">
            {formatarMoeda(totalEntradas)}
          </p>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <p className="text-sm text-slate-500">Saídas</p>
          <p className="text-2xl font-bold text-red-600">
            {formatarMoeda(totalSaidas)}
          </p>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <p className="text-sm text-slate-500">Saldo</p>
          <p className="text-2xl font-bold text-slate-800">
            {formatarMoeda(saldo)}
          </p>
        </div>
      </div>

      <div className="bg-white border rounded-lg p-4 space-y-3">
        <h2 className="font-semibold">Filtros</h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            type="date"
            value={filtroData}
            onChange={(e) => setFiltroData(e.target.value)}
            className="border p-2 rounded"
          />

          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="border p-2 rounded"
          >
            <option value="">Todos os tipos</option>
            <option value="entrada">entrada</option>
            <option value="saida">saida</option>
          </select>

          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="border p-2 rounded"
          >
            <option value="">Todos os status</option>
            <option value="pendente">pendente</option>
            <option value="pago">pago</option>
            <option value="cancelado">cancelado</option>
          </select>

          <button
            onClick={limparFiltros}
            className="border px-4 py-2 rounded text-slate-700"
          >
            Limpar filtros
          </button>
        </div>
      </div>

      {mostrarFormulario && (
        <form
          onSubmit={salvarLancamento}
          className="bg-white border rounded-lg p-4 space-y-3"
        >
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className="border p-2 w-full rounded"
          >
            <option value="entrada">entrada</option>
            <option value="saida">saida</option>
          </select>

          <input
            placeholder="Descrição"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            className="border p-2 w-full rounded"
          />

          <input
            type="number"
            step="0.01"
            placeholder="Valor"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            className="border p-2 w-full rounded"
          />

          <input
            type="date"
            value={dataLancamento}
            onChange={(e) => setDataLancamento(e.target.value)}
            className="border p-2 w-full rounded"
          />

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border p-2 w-full rounded"
          >
            <option value="pendente">pendente</option>
            <option value="pago">pago</option>
            <option value="cancelado">cancelado</option>
          </select>

          <input
            placeholder="Cliente"
            value={cliente}
            onChange={(e) => setCliente(e.target.value)}
            className="border p-2 w-full rounded"
          />

          <input
            placeholder="Profissional"
            value={profissional}
            onChange={(e) => setProfissional(e.target.value)}
            className="border p-2 w-full rounded"
          />

          <input
            placeholder="Serviço"
            value={servico}
            onChange={(e) => setServico(e.target.value)}
            className="border p-2 w-full rounded"
          />

          <textarea
            placeholder="Observações"
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            className="border p-2 w-full rounded"
          />

          <button className="bg-black text-white px-4 py-2 rounded">
            {editandoId ? "Atualizar" : "Salvar"}
          </button>
        </form>
      )}

      <div className="space-y-2">
        {loading ? (
          <p>Carregando...</p>
        ) : lancamentosFiltrados.length === 0 ? (
          <p>Nenhum lançamento encontrado.</p>
        ) : (
          lancamentosFiltrados.map((item) => (
            <div
              key={item.id}
              className="border rounded-lg p-4 flex justify-between gap-4"
            >
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold">{item.descricao}</p>

                  {item.agendamento_id && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      vindo da agenda
                    </span>
                  )}
                </div>

                <p className="text-sm text-slate-500">
                  {item.cliente || "-"} • {item.profissional || "-"} •{" "}
                  {item.servico || "-"}
                </p>

                <p className="text-sm text-slate-500">
                  {formatarData(item.data_lancamento)}
                </p>

                {item.observacoes && (
                  <p className="text-sm text-slate-400 mt-1">
                    {item.observacoes}
                  </p>
                )}
              </div>

              <div className="text-right">
                <p
                  className={`font-bold ${
                    item.tipo === "entrada" ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {item.tipo === "entrada" ? "+" : "-"}{" "}
                  {formatarMoeda(Number(item.valor))}
                </p>

                <p className="text-xs text-slate-500">{item.status}</p>

                <div className="flex gap-2 mt-2 justify-end flex-wrap">
                  {item.status !== "pago" && (
                    <button
                      type="button"
                      onClick={() => marcarComoPago(item.id)}
                      className="text-green-600"
                    >
                      Marcar como pago
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => editarLancamento(item)}
                    className="text-blue-600"
                  >
                    Editar
                  </button>

                  <button
                    type="button"
                    onClick={() => excluirLancamento(item.id)}
                    className="text-red-600"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}