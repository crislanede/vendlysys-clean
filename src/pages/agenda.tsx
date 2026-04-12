import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

type Agendamento = {
  id: string;
  cliente: string;
  profissional: string;
  servico: string;
  horario: string;
  status: string;
  data: string;
  valor: number | null;
  status_atendimento: string | null;
  finalizado_em: string | null;
};

type Servico = {
  id: string;
  nome: string;
  categoria: string | null;
  preco: number | null;
  preco_promocional: number | null;
  preco_descricao: string | null;
  duracao_padrao_minutos: number;
  ativo: boolean;
};

type Profissional = {
  id: string;
  nome: string;
};

type Cliente = {
  id: string;
  nome: string;
};

const horariosDisponiveis = [
  "08:00",
  "08:30",
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
  "18:00",
];

export default function AgendaPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const isAdmin = profile?.perfil === "admin";
  const podeFinalizar = profile?.perfil === "admin" || profile?.perfil === "agenda";

  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingServicos, setLoadingServicos] = useState(true);
  const [loadingProfissionais, setLoadingProfissionais] = useState(true);
  const [loadingClientes, setLoadingClientes] = useState(true);

  const [cliente, setCliente] = useState("");
  const [profissional, setProfissional] = useState("");
  const [servico, setServico] = useState("");
  const [horario, setHorario] = useState("");
  const [status, setStatus] = useState("pendente");
  const [data, setData] = useState("");

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  const [editandoFinalizacaoId, setEditandoFinalizacaoId] = useState<string | null>(null);
  const [dataHoraFinalizacao, setDataHoraFinalizacao] = useState("");

  async function carregarAgendamentos() {
    setLoading(true);

    const { data, error } = await supabase
      .from("agendamentos")
      .select("*")
      .order("data", { ascending: true })
      .order("horario", { ascending: true });

    if (error) {
      console.error("Erro ao carregar agendamentos:", error);
      setAgendamentos([]);
      setLoading(false);
      return;
    }

    setAgendamentos((data || []) as Agendamento[]);
    setLoading(false);
  }

  async function carregarServicos() {
    setLoadingServicos(true);

    const { data, error } = await supabase
      .from("servicos")
      .select(
        "id, nome, categoria, preco, preco_promocional, preco_descricao, duracao_padrao_minutos, ativo"
      )
      .eq("ativo", true)
      .order("nome", { ascending: true });

    if (error) {
      console.error("Erro ao carregar serviços:", error);
      setServicos([]);
      setLoadingServicos(false);
      return;
    }

    setServicos((data || []) as Servico[]);
    setLoadingServicos(false);
  }

  async function carregarProfissionais() {
    setLoadingProfissionais(true);

    const { data, error } = await supabase
      .from("profissionais")
      .select("id, nome")
      .order("nome", { ascending: true });

    if (error) {
      console.error("Erro ao carregar profissionais:", error);
      setProfissionais([]);
      setLoadingProfissionais(false);
      return;
    }

    setProfissionais((data || []) as Profissional[]);
    setLoadingProfissionais(false);
  }

  async function carregarClientes() {
    setLoadingClientes(true);

    const { data, error } = await supabase
      .from("clientes")
      .select("id, nome")
      .order("nome", { ascending: true });

    if (error) {
      console.error("Erro ao carregar clientes:", error);
      setClientes([]);
      setLoadingClientes(false);
      return;
    }

    setClientes((data || []) as Cliente[]);
    setLoadingClientes(false);
  }

  useEffect(() => {
    carregarAgendamentos();
    carregarServicos();
    carregarProfissionais();
    carregarClientes();
  }, []);

  function limparFormulario() {
    setCliente("");
    setProfissional("");
    setServico("");
    setHorario("");
    setStatus("pendente");
    setData("");
    setEditandoId(null);
    setMostrarFormulario(false);
  }

  function getServico(servicoNome: string) {
    return servicos.find((s) => s.nome === servicoNome);
  }

  function getDuracao(servicoNome: string) {
    const servicoEncontrado = getServico(servicoNome);
    return servicoEncontrado?.duracao_padrao_minutos || 30;
  }

  function getPreco(servicoNome: string) {
    const s = getServico(servicoNome);

    if (!s) return 0;

    if (s.preco_promocional && Number(s.preco_promocional) > 0) {
      return Number(s.preco_promocional);
    }

    return Number(s.preco || 0);
  }

  function getPrecoLabel(servicoItem: Servico) {
    const valor = servicoItem.preco_promocional || servicoItem.preco || 0;
    return Number(valor).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function formatarMoeda(valor: number | null | undefined) {
    return Number(valor || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function horaParaMinutos(h: string) {
    const [hora, min] = h.split(":").map(Number);
    return hora * 60 + min;
  }

  function minutosParaHora(totalMinutos: number) {
    const hora = Math.floor(totalMinutos / 60);
    const min = totalMinutos % 60;
    return `${String(hora).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
  }

  function calcularHorarioTermino(horarioInicio: string, servicoNome: string) {
    if (!horarioInicio || !servicoNome) return "";
    const inicio = horaParaMinutos(horarioInicio);
    const duracao = getDuracao(servicoNome);
    return minutosParaHora(inicio + duracao);
  }

  function horarioConflito(horarioNovo: string) {
    if (!data || !servico || !horarioNovo || !profissional) return false;

    const inicioNovo = horaParaMinutos(horarioNovo);
    const duracaoNovo = getDuracao(servico);
    const fimNovo = inicioNovo + duracaoNovo;

    return agendamentos.some((item) => {
      if (item.data !== data) return false;
      if (item.profissional !== profissional) return false;
      if (item.id === editandoId) return false;
      if (item.status === "cancelado") return false;

      const inicioExistente = horaParaMinutos(item.horario);
      const duracaoExistente = getDuracao(item.servico);
      const fimExistente = inicioExistente + duracaoExistente;

      return inicioNovo < fimExistente && fimNovo > inicioExistente;
    });
  }

  async function salvarAgendamento(e: React.FormEvent) {
    e.preventDefault();

    if (!cliente || !profissional || !servico || !horario || !data) {
      alert("Preencha todos os campos.");
      return;
    }

    if (horarioConflito(horario)) {
      alert("Esse horário já está ocupado para esse profissional.");
      return;
    }

    const valorCalculado = getPreco(servico);

    if (editandoId) {
      const { error } = await supabase
        .from("agendamentos")
        .update({
          cliente,
          profissional,
          servico,
          horario,
          status,
          data,
          valor: valorCalculado,
        })
        .eq("id", editandoId);

      if (error) {
        console.error("Erro ao editar agendamento:", error);
        alert("Erro ao editar agendamento.");
        return;
      }

      limparFormulario();
      await carregarAgendamentos();
      return;
    }

    const { error } = await supabase.from("agendamentos").insert([
      {
        cliente,
        profissional,
        servico,
        horario,
        status,
        data,
        valor: valorCalculado,
        status_atendimento: "em_andamento",
      },
    ]);

    if (error) {
      console.error("Erro ao salvar agendamento:", error);
      alert("Erro ao salvar agendamento.");
      return;
    }

    limparFormulario();
    await carregarAgendamentos();
  }

  function editarAgendamento(item: Agendamento) {
    setCliente(item.cliente || "");
    setProfissional(item.profissional || "");
    setServico(item.servico || "");
    setHorario(item.horario || "");
    setStatus(item.status || "pendente");
    setData(item.data || "");
    setEditandoId(item.id);
    setMostrarFormulario(true);
  }

  async function cancelarAgendamento(id: string) {
    const confirmar = window.confirm("Cancelar agendamento?");
    if (!confirmar) return;

    const { error } = await supabase
      .from("agendamentos")
      .update({ status: "cancelado" })
      .eq("id", id);

    if (error) {
      console.error("Erro ao cancelar agendamento:", error);
      alert("Erro ao cancelar agendamento.");
      return;
    }

    await carregarAgendamentos();
  }

  async function gerarFinanceiro(item: Agendamento) {
    const confirmar = window.confirm(
      "Gerar lançamento financeiro para este agendamento?"
    );
    if (!confirmar) return;

    const { data: existente, error: erroBusca } = await supabase
      .from("financeiro")
      .select("id")
      .eq("agendamento_id", item.id)
      .limit(1);

    if (erroBusca) {
      console.error("Erro ao verificar financeiro existente:", erroBusca);
      alert("Erro ao verificar financeiro.");
      return;
    }

    if (existente && existente.length > 0) {
      alert("Este agendamento já possui lançamento financeiro.");
      return;
    }

    const valorLancamento = Number(item.valor || getPreco(item.servico));

    const { error } = await supabase.from("financeiro").insert([
      {
        tipo: "entrada",
        descricao: item.servico,
        valor: valorLancamento,
        data_lancamento: item.data,
        status: "pendente",
        cliente: item.cliente,
        profissional: item.profissional,
        servico: item.servico,
        agendamento_id: item.id,
      },
    ]);

    if (error) {
      console.error("Erro ao gerar financeiro:", error);
      alert("Erro ao gerar lançamento financeiro.");
      return;
    }

    alert("Lançamento financeiro criado com sucesso.");
  }

  async function finalizarAtendimento(item: Agendamento) {
    if (!podeFinalizar) {
      alert("Você não tem permissão para finalizar atendimento.");
      return;
    }

    const confirmar = window.confirm("Finalizar atendimento agora?");
    if (!confirmar) return;

    const agora = new Date().toISOString();

    const { error } = await supabase
      .from("agendamentos")
      .update({
        status_atendimento: "finalizado",
        finalizado_em: agora,
      })
      .eq("id", item.id);

    if (error) {
      console.error("Erro ao finalizar atendimento:", error);
      alert("Erro ao finalizar atendimento.");
      return;
    }

    await carregarAgendamentos();
  }

  function abrirEdicaoFinalizacao(item: Agendamento) {
    if (!isAdmin) {
      alert("Apenas admin pode editar a finalização.");
      return;
    }

    const valorInicial = item.finalizado_em
      ? item.finalizado_em.slice(0, 16)
      : new Date().toISOString().slice(0, 16);

    setEditandoFinalizacaoId(item.id);
    setDataHoraFinalizacao(valorInicial);
  }

  async function salvarFinalizacaoManual() {
    if (!isAdmin) {
      alert("Apenas admin pode salvar a finalização manual.");
      return;
    }

    if (!editandoFinalizacaoId || !dataHoraFinalizacao) {
      alert("Informe a data e hora de finalização.");
      return;
    }

    const iso = new Date(dataHoraFinalizacao).toISOString();

    const { error } = await supabase
      .from("agendamentos")
      .update({
        status_atendimento: "finalizado",
        finalizado_em: iso,
      })
      .eq("id", editandoFinalizacaoId);

    if (error) {
      console.error("Erro ao salvar finalização manual:", error);
      alert("Erro ao salvar finalização manual.");
      return;
    }

    setEditandoFinalizacaoId(null);
    setDataHoraFinalizacao("");
    await carregarAgendamentos();
  }

  const statusStyle: Record<string, string> = {
    confirmado: "bg-green-100 text-green-700",
    pendente: "bg-yellow-100 text-yellow-700",
    cancelado: "bg-red-100 text-red-700",
  };

  const statusAtendimentoStyle: Record<string, string> = {
    em_andamento: "bg-blue-100 text-blue-700",
    finalizado: "bg-emerald-100 text-emerald-700",
  };

  const valorSelecionado = useMemo(() => {
    if (!servico) return 0;
    return getPreco(servico);
  }, [servico, servicos]);

  const terminoSelecionado = useMemo(() => {
    if (!servico || !horario) return "";
    return calcularHorarioTermino(horario, servico);
  }, [horario, servico, servicos]);

  function formatarDataHora(dataHora?: string | null) {
    if (!dataHora) return "";
    return new Date(dataHora).toLocaleString("pt-BR");
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Agenda</h1>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => navigate("/clientes")}
            className="border px-4 py-2 rounded text-slate-700"
          >
            Novo cliente
          </button>

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
            {mostrarFormulario ? "Fechar" : "Novo agendamento"}
          </button>
        </div>
      </div>

      {mostrarFormulario && (
        <form
          onSubmit={salvarAgendamento}
          className="space-y-3 bg-white p-4 rounded-lg border"
        >
          <select
            value={cliente}
            onChange={(e) => setCliente(e.target.value)}
            className="border p-2 w-full rounded"
            disabled={loadingClientes}
          >
            <option value="">
              {loadingClientes ? "Carregando clientes..." : "Selecione o cliente"}
            </option>

            {clientes.map((c) => (
              <option key={c.id} value={c.nome}>
                {c.nome}
              </option>
            ))}
          </select>

          <select
            value={profissional}
            onChange={(e) => {
              setProfissional(e.target.value);
              setHorario("");
            }}
            className="border p-2 w-full rounded"
            disabled={loadingProfissionais}
          >
            <option value="">
              {loadingProfissionais
                ? "Carregando profissionais..."
                : "Selecione o profissional"}
            </option>

            {profissionais.map((p) => (
              <option key={p.id} value={p.nome}>
                {p.nome}
              </option>
            ))}
          </select>

          <select
            value={servico}
            onChange={(e) => {
              setServico(e.target.value);
              setHorario("");
            }}
            className="border p-2 w-full rounded"
            disabled={loadingServicos}
          >
            <option value="">
              {loadingServicos ? "Carregando serviços..." : "Selecione o serviço"}
            </option>

            {servicos.map((s) => (
              <option key={s.id} value={s.nome}>
                {s.nome} - {getPrecoLabel(s)} ({s.duracao_padrao_minutos} min)
              </option>
            ))}
          </select>

          <input
            type="date"
            value={data}
            onChange={(e) => {
              setData(e.target.value);
              setHorario("");
            }}
            className="border p-2 w-full rounded"
          />

          <select
            value={horario}
            onChange={(e) => setHorario(e.target.value)}
            className="border p-2 w-full rounded"
            disabled={!data || !servico || !profissional}
          >
            <option value="">
              {!data || !servico || !profissional
                ? "Selecione cliente, profissional, data e serviço primeiro"
                : "Selecione o horário"}
            </option>

            {horariosDisponiveis.map((h) => {
              const ocupado = horarioConflito(h);

              return (
                <option key={h} value={h} disabled={ocupado}>
                  {h} {ocupado ? "❌ ocupado" : ""}
                </option>
              );
            })}
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border p-2 w-full rounded"
          >
            <option value="pendente">pendente</option>
            <option value="confirmado">confirmado</option>
            <option value="cancelado">cancelado</option>
          </select>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="border rounded p-3 bg-slate-50">
              <p className="text-sm text-slate-500">Valor do serviço</p>
              <p className="font-semibold text-slate-800">
                {formatarMoeda(valorSelecionado)}
              </p>
            </div>

            <div className="border rounded p-3 bg-slate-50">
              <p className="text-sm text-slate-500">Horário de término previsto</p>
              <p className="font-semibold text-slate-800">
                {terminoSelecionado || "--:--"}
              </p>
            </div>
          </div>

          <button className="bg-black text-white px-4 py-2 rounded">
            {editandoId ? "Atualizar" : "Salvar"}
          </button>
        </form>
      )}

      {isAdmin && editandoFinalizacaoId && (
        <div className="bg-white border rounded-lg p-4 space-y-3">
          <h2 className="font-semibold">Editar finalização real</h2>

          <input
            type="datetime-local"
            value={dataHoraFinalizacao}
            onChange={(e) => setDataHoraFinalizacao(e.target.value)}
            className="border p-2 w-full rounded"
          />

          <div className="flex gap-2">
            <button
              onClick={salvarFinalizacaoManual}
              className="bg-black text-white px-4 py-2 rounded"
            >
              Salvar finalização
            </button>

            <button
              onClick={() => {
                setEditandoFinalizacaoId(null);
                setDataHoraFinalizacao("");
              }}
              className="border px-4 py-2 rounded"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {loading ? (
          <p>Carregando...</p>
        ) : agendamentos.length === 0 ? (
          <p>Nenhum agendamento encontrado.</p>
        ) : (
          agendamentos.map((item) => (
            <div
              key={item.id}
              className="border p-3 rounded flex justify-between items-start"
            >
              <div>
                <p className="font-bold">{item.cliente}</p>
                <p>{item.profissional}</p>
                <p>{item.servico}</p>
                <p className="text-sm text-gray-500">
                  {new Date(item.data).toLocaleDateString("pt-BR")}
                </p>
              </div>

              <div className="text-right space-y-1">
                <p>
                  {item.horario} - {calcularHorarioTermino(item.horario, item.servico)}
                </p>

                <p className="text-sm font-semibold text-slate-700">
                  {formatarMoeda(item.valor)}
                </p>

                <span
                  className={`text-xs px-2 py-1 rounded ${
                    statusStyle[item.status] || "bg-gray-100 text-gray-700"
                  }`}
                >
                  {item.status}
                </span>

                <div>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      statusAtendimentoStyle[item.status_atendimento || "em_andamento"] ||
                      "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {item.status_atendimento || "em_andamento"}
                  </span>
                </div>

                <p className="text-xs text-slate-500">
                  Finalizado em: {item.finalizado_em ? formatarDataHora(item.finalizado_em) : "--"}
                </p>

                <div className="flex gap-2 mt-2 justify-end flex-wrap">
                  <button
                    type="button"
                    onClick={() => editarAgendamento(item)}
                    className="text-blue-600"
                  >
                    Editar
                  </button>

                  <button
                    type="button"
                    onClick={() => cancelarAgendamento(item.id)}
                    className="text-red-600"
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    onClick={() => gerarFinanceiro(item)}
                    className="text-green-600"
                  >
                    Gerar financeiro
                  </button>

                  {podeFinalizar && item.status_atendimento !== "finalizado" && (
                    <button
                      type="button"
                      onClick={() => finalizarAtendimento(item)}
                      className="text-emerald-700"
                    >
                      Finalizar atendimento
                    </button>
                  )}

                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => abrirEdicaoFinalizacao(item)}
                      className="text-slate-700"
                    >
                      Editar finalização
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}