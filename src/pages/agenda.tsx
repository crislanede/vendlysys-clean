import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Agendamento = {
  id: string;
  cliente: string;
  servico: string;
  horario: string;
  status: "confirmado" | "pendente" | "cancelado" | string;
};

export default function AgendaPage() {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);

  const [cliente, setCliente] = useState("");
  const [servico, setServico] = useState("");
  const [horario, setHorario] = useState("");
  const [status, setStatus] = useState("pendente");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [salvando, setSalvando] = useState(false);

  async function carregarAgendamentos() {
    setLoading(true);

    const { data, error } = await supabase
      .from("agendamentos")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao carregar agendamentos:", error);
      setLoading(false);
      return;
    }

    setAgendamentos((data as Agendamento[]) || []);
    setLoading(false);
  }

  async function criarAgendamento(e: React.FormEvent) {
    e.preventDefault();

    if (!cliente || !servico || !horario || !status) {
      alert("Preencha todos os campos.");
      return;
    }

    setSalvando(true);

    const { error } = await supabase.from("agendamentos").insert([
      {
        cliente,
        servico,
        horario,
        status,
      },
    ]);

    setSalvando(false);

    if (error) {
      console.error("Erro ao salvar agendamento:", error);
      alert("Erro ao salvar agendamento.");
      return;
    }

    setCliente("");
    setServico("");
    setHorario("");
    setStatus("pendente");
    setMostrarFormulario(false);

    await carregarAgendamentos();
  }

  useEffect(() => {
    carregarAgendamentos();
  }, []);

  const statusStyle: Record<string, string> = {
    confirmado: "bg-emerald-100 text-emerald-700",
    pendente: "bg-yellow-100 text-yellow-700",
    cancelado: "bg-red-100 text-red-700",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Agenda</h1>
          <p className="text-slate-500 mt-1">Gerencie seus agendamentos</p>
        </div>

        <button
          onClick={() => setMostrarFormulario(!mostrarFormulario)}
          className="h-11 px-5 rounded-xl bg-orange-500 text-white font-medium hover:opacity-90 transition"
        >
          {mostrarFormulario ? "Fechar" : "Novo agendamento"}
        </button>
      </div>

      {mostrarFormulario && (
        <form
          onSubmit={criarAgendamento}
          className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Cliente
            </label>
            <input
              type="text"
              value={cliente}
              onChange={(e) => setCliente(e.target.value)}
              className="w-full h-11 rounded-xl border border-slate-300 px-3 outline-none"
              placeholder="Nome do cliente"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Serviço
            </label>
            <input
              type="text"
              value={servico}
              onChange={(e) => setServico(e.target.value)}
              className="w-full h-11 rounded-xl border border-slate-300 px-3 outline-none"
              placeholder="Ex: Escova"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Horário
            </label>
            <input
              type="text"
              value={horario}
              onChange={(e) => setHorario(e.target.value)}
              className="w-full h-11 rounded-xl border border-slate-300 px-3 outline-none"
              placeholder="Ex: 15:30"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full h-11 rounded-xl border border-slate-300 px-3 outline-none bg-white"
            >
              <option value="pendente">pendente</option>
              <option value="confirmado">confirmado</option>
              <option value="cancelado">cancelado</option>
            </select>
          </div>

          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={salvando}
              className="h-11 px-5 rounded-xl bg-slate-900 text-white font-medium hover:opacity-90 transition disabled:opacity-50"
            >
              {salvando ? "Salvando..." : "Salvar agendamento"}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-3">
        {loading && (
          <p className="text-slate-500">Carregando agendamentos...</p>
        )}

        {!loading && agendamentos.length === 0 && (
          <p className="text-slate-500">Nenhum agendamento encontrado.</p>
        )}

        {!loading &&
          agendamentos.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between border border-slate-200 rounded-xl p-4 hover:bg-slate-50 transition"
            >
              <div>
                <p className="font-medium text-slate-800">{item.cliente}</p>
                <p className="text-sm text-slate-500">{item.servico}</p>
              </div>

              <div className="text-right space-y-1">
                <p className="text-sm font-semibold text-slate-800">
                  {item.horario}
                </p>

                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    statusStyle[item.status] ?? "bg-slate-100 text-slate-700"
                  }`}
                >
                  {item.status}
                </span>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}