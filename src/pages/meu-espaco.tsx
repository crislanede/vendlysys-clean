import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useEmpresa } from "../hooks/useEmpresa";

export default function MeuEspaco() {
  const { empresaId } = useEmpresa();

  const [servicos, setServicos] = useState<any[]>([]);
  const [profissionais, setProfissionais] = useState<any[]>([]);
  const [horarios, setHorarios] = useState<string[]>([]);

  const [servicoSelecionado, setServicoSelecionado] = useState("");
  const [profissionalSelecionado, setProfissionalSelecionado] = useState("");
  const [dataSelecionada, setDataSelecionada] = useState("");
  const [horarioSelecionado, setHorarioSelecionado] = useState("");

  useEffect(() => {
    carregarDados();
  }, [empresaId]);

  async function carregarDados() {
    if (!empresaId) return;

    const { data: serv } = await supabase
      .from("servicos")
      .select("*")
      .eq("empresa_id", empresaId);

    const { data: prof } = await supabase
      .from("profissionais")
      .select("*")
      .eq("empresa_id", empresaId);

    setServicos(serv || []);
    setProfissionais(prof || []);
  }

  async function carregarHorarios() {
    // Simples (pode evoluir depois com bloqueio real)
    setHorarios([
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
    ]);
  }

  useEffect(() => {
    if (dataSelecionada && profissionalSelecionado) {
      carregarHorarios();
    }
  }, [dataSelecionada, profissionalSelecionado]);

  async function salvarAgendamento() {
    if (
      !servicoSelecionado ||
      !profissionalSelecionado ||
      !dataSelecionada ||
      !horarioSelecionado
    ) {
      alert("Preencha todos os campos");
      return;
    }

    const { error } = await supabase.from("agendamentos").insert([
      {
        empresa_id: empresaId,
        servico_id: servicoSelecionado,
        profissional_id: profissionalSelecionado,
        data: dataSelecionada,
        horario: horarioSelecionado,
        status: "agendado",
      },
    ]);

    if (error) {
      alert("Erro ao agendar");
      return;
    }

    alert("Agendamento realizado!");

    setHorarioSelecionado("");
    setDataSelecionada("");
  }

  return (
    <div className="max-w-md mx-auto p-4 space-y-5">
      <h1 className="text-xl font-bold text-center">Meu Espaço</h1>

      {/* SERVIÇO */}
      <div className="space-y-2">
        <label className="font-semibold">Serviço</label>
        <select
          className="w-full border rounded-lg px-3 py-3"
          value={servicoSelecionado}
          onChange={(e) => setServicoSelecionado(e.target.value)}
        >
          <option value="">Selecione</option>
          {servicos.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nome}
            </option>
          ))}
        </select>
      </div>

      {/* PROFISSIONAL */}
      <div className="space-y-2">
        <label className="font-semibold">Profissional</label>
        <select
          className="w-full border rounded-lg px-3 py-3"
          value={profissionalSelecionado}
          onChange={(e) => setProfissionalSelecionado(e.target.value)}
        >
          <option value="">Selecione</option>
          {profissionais.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>
      </div>

      {/* DATA */}
      <div className="space-y-2">
        <label className="font-semibold">Data</label>
        <input
          type="date"
          className="w-full border rounded-lg px-3 py-3"
          value={dataSelecionada}
          onChange={(e) => setDataSelecionada(e.target.value)}
        />
      </div>

      {/* HORÁRIOS */}
      {horarios.length > 0 && (
        <div className="space-y-2">
          <label className="font-semibold">Horários</label>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {horarios.map((h) => (
              <button
                key={h}
                onClick={() => setHorarioSelecionado(h)}
                className={`py-3 rounded-lg text-sm font-semibold border ${
                  horarioSelecionado === h
                    ? "bg-purple-600 text-white"
                    : "bg-white"
                }`}
              >
                {h}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* BOTÃO */}
      <button
        onClick={salvarAgendamento}
        className="w-full py-4 rounded-xl bg-green-600 text-white font-bold text-lg"
      >
        Confirmar agendamento
      </button>
    </div>
  );
}