import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type Profissional = {
  id: string;
  nome: string;
  ativo?: boolean | null;
};

type Bloqueio = {
  id: string;
  profissional: string;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  motivo: string | null;
};

function horaParaMinutos(hora: string) {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

export default function BloqueiosPage() {
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [bloqueios, setBloqueios] = useState<Bloqueio[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [profissional, setProfissional] = useState("");
  const [data, setData] = useState("");
  const [horaInicio, setHoraInicio] = useState("08:00");
  const [horaFim, setHoraFim] = useState("18:00");
  const [motivo, setMotivo] = useState("");
  const [busca, setBusca] = useState("");

  useEffect(() => {
    void carregarTudo();
  }, []);

  async function carregarTudo() {
    setLoading(true);
    await Promise.all([carregarProfissionais(), carregarBloqueios()]);
    setLoading(false);
  }

  async function carregarProfissionais() {
    const { data, error } = await supabase
      .from("profissionais")
      .select("id, nome, ativo")
      .eq("ativo", true)
      .order("nome", { ascending: true });

    if (error) {
      console.error("Erro ao carregar profissionais:", error);
      setProfissionais([]);
      return;
    }

    setProfissionais((data || []) as Profissional[]);
  }

  async function carregarBloqueios() {
    const { data, error } = await supabase
      .from("bloqueios")
      .select("*")
      .order("data", { ascending: false })
      .order("hora_inicio", { ascending: true });

    if (error) {
      console.error("Erro ao carregar bloqueios:", error);
      setBloqueios([]);
      return;
    }

    setBloqueios((data || []) as Bloqueio[]);
  }

  function limparFormulario() {
    setProfissional("");
    setData("");
    setHoraInicio("08:00");
    setHoraFim("18:00");
    setMotivo("");
  }

  function validarFormulario() {
    if (!profissional || !data || !horaInicio || !horaFim) {
      alert("Preencha profissional, data, hora inicial e hora final.");
      return false;
    }

    if (horaParaMinutos(horaInicio) >= horaParaMinutos(horaFim)) {
      alert("A hora inicial precisa ser menor que a hora final.");
      return false;
    }

    return true;
  }

  async function salvarBloqueio(e: React.FormEvent) {
    e.preventDefault();

    if (!validarFormulario()) return;

    setSalvando(true);

    const { error } = await supabase.from("bloqueios").insert([
      {
        profissional,
        data,
        hora_inicio: horaInicio,
        hora_fim: horaFim,
        motivo: motivo || null,
      },
    ]);

    if (error) {
      console.error("Erro ao salvar bloqueio:", error);
      alert("Erro ao salvar bloqueio.");
      setSalvando(false);
      return;
    }

    alert("Bloqueio criado com sucesso.");
    setSalvando(false);
    limparFormulario();
    await carregarBloqueios();
  }

  async function excluirBloqueio(id: string) {
    const confirmar = window.confirm("Deseja excluir este bloqueio?");
    if (!confirmar) return;

    const { error } = await supabase.from("bloqueios").delete().eq("id", id);

    if (error) {
      console.error("Erro ao excluir bloqueio:", error);
      alert("Erro ao excluir bloqueio.");
      return;
    }

    await carregarBloqueios();
    alert("Bloqueio excluído com sucesso.");
  }

  const bloqueiosFiltrados = useMemo(() => {
    const termo = busca.toLowerCase().trim();
    if (!termo) return bloqueios;

    return bloqueios.filter((item) => {
      return (
        item.profissional?.toLowerCase().includes(termo) ||
        item.motivo?.toLowerCase().includes(termo) ||
        item.data?.toLowerCase().includes(termo)
      );
    });
  }, [bloqueios, busca]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-orange-500">Operação</p>
        <h1 className="text-3xl font-bold text-slate-900">Bloqueios</h1>
        <p className="text-slate-500">
          Bloqueie horários de profissionais para impedir agendamentos na agenda.
        </p>
      </div>

      <form
        onSubmit={salvarBloqueio}
        className="rounded-2xl bg-white p-6 shadow space-y-4"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-slate-600">
              Profissional
            </label>
            <select
              value={profissional}
              onChange={(e) => setProfissional(e.target.value)}
              className="w-full rounded-lg border p-2"
            >
              <option value="">Selecione</option>
              {profissionais.map((item) => (
                <option key={item.id} value={item.nome}>
                  {item.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-600">Data</label>
            <input
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              className="w-full rounded-lg border p-2"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm text-slate-600">
              Hora inicial
            </label>
            <input
              type="time"
              value={horaInicio}
              onChange={(e) => setHoraInicio(e.target.value)}
              className="w-full rounded-lg border p-2"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-600">
              Hora final
            </label>
            <input
              type="time"
              value={horaFim}
              onChange={(e) => setHoraFim(e.target.value)}
              className="w-full rounded-lg border p-2"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-600">Motivo</label>
            <input
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full rounded-lg border p-2"
              placeholder="Ex.: folga, curso, reunião"
            />
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={salvando}
            className="rounded-xl px-5 py-3 font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: "var(--color-primary)" }}
          >
            {salvando ? "Salvando..." : "Criar bloqueio"}
          </button>
        </div>
      </form>

      <div className="rounded-2xl bg-white p-6 shadow space-y-4">
        <div className="grid gap-4 md:grid-cols-[1fr_auto]">
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full rounded-lg border p-2"
            placeholder="Buscar por profissional, motivo ou data"
          />

          <button
            type="button"
            onClick={() => void carregarBloqueios()}
            className="rounded-xl border px-4 py-2 font-medium text-slate-700"
          >
            Recarregar
          </button>
        </div>

        {loading ? (
          <p>Carregando...</p>
        ) : bloqueiosFiltrados.length === 0 ? (
          <p className="text-slate-500">Nenhum bloqueio cadastrado.</p>
        ) : (
          <div className="space-y-4">
            {bloqueiosFiltrados.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="text-lg font-semibold text-slate-900">
                    {item.profissional}
                  </p>
                  <p className="text-sm text-slate-500">
                    {new Date(`${item.data}T00:00:00`).toLocaleDateString("pt-BR")}
                  </p>
                  <p className="text-sm text-slate-700">
                    {item.hora_inicio} às {item.hora_fim}
                  </p>
                  <p className="text-sm text-slate-500">
                    {item.motivo || "Sem motivo informado"}
                  </p>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => void excluirBloqueio(item.id)}
                    className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}