import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Agendamento = {
  id: string;
  cliente: string;
  profissional: string;
  servico: string;
  horario: string;
  status: string;
  data: string;
};

type Servico = {
  id: string;
  nome: string;
  duracao_padrao_minutos: number;
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

const profissionaisDisponiveis = [
  "Crislane",
  "Juliana",
  "Maria",
  "Fernanda",
];

export default function AgendaPage() {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingServicos, setLoadingServicos] = useState(true);

  const [cliente, setCliente] = useState("");
  const [profissional, setProfissional] = useState("");
  const [servico, setServico] = useState("");
  const [horario, setHorario] = useState("");
  const [status, setStatus] = useState("pendente");
  const [data, setData] = useState("");

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);

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

    setAgendamentos(data || []);
    setLoading(false);
  }

  async function carregarServicos() {
    setLoadingServicos(true);

    const { data, error } = await supabase
      .from("servicos")
      .select("id, nome, duracao_padrao_minutos")
      .order("nome", { ascending: true });

    if (error) {
      console.error("Erro ao carregar serviços:", error);
      setServicos([]);
      setLoadingServicos(false);
      return;
    }

    setServicos(data || []);
    setLoadingServicos(false);
  }

  useEffect(() => {
    carregarAgendamentos();
    carregarServicos();
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

  function getDuracao(servicoNome: string) {
    const servicoEncontrado = servicos.find((s) => s.nome === servicoNome);
    return servicoEncontrado?.duracao_padrao_minutos || 30;
  }

  function horaParaMinutos(h: string) {
    const [hora, min] = h.split(":").map(Number);
    return hora * 60 + min;
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
    setCliente(item.cliente);
    setProfissional(item.profissional || "");
    setServico(item.servico);
    setHorario(item.horario);
    setStatus(item.status);
    setData(item.data);
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

  const statusStyle: Record<string, string> = {
    confirmado: "bg-green-100 text-green-700",
    pendente: "bg-yellow-100 text-yellow-700",
    cancelado: "bg-red-100 text-red-700",
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Agenda</h1>

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

      {mostrarFormulario && (
        <form onSubmit={salvarAgendamento} className="space-y-3 bg-white p-4 rounded-lg border">
          <input
            placeholder="Cliente"
            value={cliente}
            onChange={(e) => setCliente(e.target.value)}
            className="border p-2 w-full rounded"
          />

          <select
            value={profissional}
            onChange={(e) => {
              setProfissional(e.target.value);
              setHorario("");
            }}
            className="border p-2 w-full rounded"
          >
            <option value="">Selecione o profissional</option>
            {profissionaisDisponiveis.map((p) => (
              <option key={p} value={p}>
                {p}
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
                {s.nome} ({s.duracao_padrao_minutos} min)
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
                ? "Selecione profissional, data e serviço primeiro"
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

          <button className="bg-black text-white px-4 py-2 rounded">
            {editandoId ? "Atualizar" : "Salvar"}
          </button>
        </form>
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
                  {new Date(item.data).toLocaleDateString()}
                </p>
              </div>

              <div className="text-right">
                <p>{item.horario}</p>

                <span
                  className={`text-xs px-2 py-1 rounded ${
                    statusStyle[item.status] || "bg-gray-100 text-gray-700"
                  }`}
                >
                  {item.status}
                </span>

                <div className="flex gap-2 mt-2 justify-end">
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
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}