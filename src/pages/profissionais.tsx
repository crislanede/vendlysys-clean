import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { useEmpresa } from "../hooks/useEmpresa";

type Profissional = {
  id: string;
  nome: string;
  telefone?: string | null;
  email?: string | null;
  especialidade?: string | null;
  hora_inicio?: string | null;
  hora_fim?: string | null;
  inicio_almoco?: string | null;
  fim_almoco?: string | null;
  intervalo_minutos?: number | null;
  ativo?: boolean | null;
};

const formInicial = {
  nome: "",
  telefone: "",
  email: "",
  especialidade: "",
  hora_inicio: "08:00",
  hora_fim: "18:00",
  inicio_almoco: "12:00",
  fim_almoco: "13:00",
  intervalo_minutos: 0,
};

export default function ProfissionaisPage() {
  const { empresaId, carregandoEmpresa } = useEmpresa();

  const [lista, setLista] = useState<Profissional[]>([]);
  const [busca, setBusca] = useState("");
  const [form, setForm] = useState(formInicial);
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (empresaId) carregar();
  }, [empresaId]);

  async function carregar() {
    if (!empresaId) return;

    setLoading(true);

    const { data, error } = await supabase
      .from("profissionais")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("nome");

    setLoading(false);

    if (error) {
      alert("Erro ao carregar profissionais: " + error.message);
      return;
    }

    setLista(data || []);
  }

  async function salvar() {
    if (!empresaId) {
      alert("Empresa não encontrada.");
      return;
    }

    if (!form.nome.trim()) {
      alert("Nome é obrigatório.");
      return;
    }

    setSalvando(true);

    const { error } = await supabase.from("profissionais").insert({
      ...form,
      nome: form.nome.trim(),
      telefone: form.telefone.trim() || null,
      email: form.email.trim() || null,
      especialidade: form.especialidade.trim() || null,
      intervalo_minutos: Number(form.intervalo_minutos || 0),
      empresa_id: empresaId,
      ativo: true,
    });

    setSalvando(false);

    if (error) {
      alert("Erro ao salvar profissional: " + error.message);
      return;
    }

    setForm(formInicial);
    carregar();
  }

  async function remover(id: string) {
    if (!confirm("Deseja excluir este profissional?")) return;

    const { error } = await supabase
      .from("profissionais")
      .delete()
      .eq("id", id)
      .eq("empresa_id", empresaId);

    if (error) {
      alert("Erro ao excluir profissional: " + error.message);
      return;
    }

    carregar();
  }

  const filtrados = useMemo(() => {
    const termo = busca.toLowerCase();

    return lista.filter((p) =>
      `${p.nome} ${p.telefone || ""} ${p.email || ""} ${p.especialidade || ""}`
        .toLowerCase()
        .includes(termo)
    );
  }, [lista, busca]);

  if (carregandoEmpresa) {
    return <div className="p-6">Carregando empresa...</div>;
  }

  if (!empresaId) {
    return <div className="p-6">Empresa não encontrada.</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-pink-600 uppercase">
            Cadastros
          </p>
          <h1 className="text-3xl font-bold text-slate-900">Profissionais</h1>
          <p className="text-slate-500">
            Cadastre profissionais, horários de trabalho e intervalos.
          </p>
        </div>

        <button
          onClick={carregar}
          className="border px-4 py-2 rounded-xl font-bold bg-white"
        >
          Atualizar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card title="Total" value={lista.length} />
        <Card title="Ativos" value={lista.filter((p) => p.ativo !== false).length} />
        <Card
          title="Com especialidade"
          value={lista.filter((p) => !!p.especialidade).length}
        />
        <Card
          title="Com telefone"
          value={lista.filter((p) => !!p.telefone).length}
        />
      </div>

      <div className="bg-white rounded-2xl border shadow-sm p-5">
        <h2 className="font-bold text-slate-900 mb-4">Novo profissional</h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            placeholder="Nome"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            className="border rounded-xl px-4 py-3"
          />

          <input
            placeholder="Telefone / WhatsApp"
            value={form.telefone}
            onChange={(e) => setForm({ ...form, telefone: e.target.value })}
            className="border rounded-xl px-4 py-3"
          />

          <input
            placeholder="E-mail"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="border rounded-xl px-4 py-3"
          />

          <input
            placeholder="Especialidade"
            value={form.especialidade}
            onChange={(e) =>
              setForm({ ...form, especialidade: e.target.value })
            }
            className="border rounded-xl px-4 py-3"
          />

          <div>
            <label className="text-xs font-bold text-slate-500">
              Início expediente
            </label>
            <input
              type="time"
              value={form.hora_inicio}
              onChange={(e) =>
                setForm({ ...form, hora_inicio: e.target.value })
              }
              className="mt-1 w-full border rounded-xl px-4 py-3"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500">
              Fim expediente
            </label>
            <input
              type="time"
              value={form.hora_fim}
              onChange={(e) => setForm({ ...form, hora_fim: e.target.value })}
              className="mt-1 w-full border rounded-xl px-4 py-3"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500">
              Início almoço
            </label>
            <input
              type="time"
              value={form.inicio_almoco}
              onChange={(e) =>
                setForm({ ...form, inicio_almoco: e.target.value })
              }
              className="mt-1 w-full border rounded-xl px-4 py-3"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500">
              Fim almoço
            </label>
            <input
              type="time"
              value={form.fim_almoco}
              onChange={(e) =>
                setForm({ ...form, fim_almoco: e.target.value })
              }
              className="mt-1 w-full border rounded-xl px-4 py-3"
            />
          </div>

          <input
            type="number"
            placeholder="Intervalo entre atendimentos (min)"
            value={form.intervalo_minutos}
            onChange={(e) =>
              setForm({
                ...form,
                intervalo_minutos: Number(e.target.value),
              })
            }
            className="border rounded-xl px-4 py-3"
          />

          <button
            onClick={salvar}
            disabled={salvando}
            className="bg-pink-600 text-white rounded-xl px-5 py-3 font-bold disabled:opacity-60 md:col-span-3"
          >
            {salvando ? "Salvando..." : "Salvar profissional"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="p-5 border-b flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-bold text-slate-900">
              Profissionais cadastrados
            </h2>
            <p className="text-sm text-slate-500">
              {filtrados.length} profissional(is) encontrado(s).
            </p>
          </div>

          <input
            placeholder="Buscar por nome, telefone, e-mail ou especialidade..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="border rounded-xl px-4 py-3 w-full md:w-96"
          />
        </div>

        {loading ? (
          <div className="p-6">Carregando...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr className="text-left">
                  <th className="p-4">Profissional</th>
                  <th>Contato</th>
                  <th>Especialidade</th>
                  <th>Expediente</th>
                  <th>Almoço</th>
                  <th>Intervalo</th>
                  <th className="text-right pr-4">Ações</th>
                </tr>
              </thead>

              <tbody>
                {filtrados.map((p) => (
                  <tr key={p.id} className="border-t hover:bg-slate-50">
                    <td className="p-4 font-bold text-slate-900">{p.nome}</td>
                    <td>
                      <p>{p.telefone || "-"}</p>
                      <p className="text-xs text-slate-400">{p.email || "-"}</p>
                    </td>
                    <td>{p.especialidade || "-"}</td>
                    <td>
                      {p.hora_inicio || "-"} às {p.hora_fim || "-"}
                    </td>
                    <td>
                      {p.inicio_almoco || "-"} às {p.fim_almoco || "-"}
                    </td>
                    <td>{p.intervalo_minutos || 0} min</td>
                    <td className="text-right pr-4">
                      <button
                        onClick={() => remover(p.id)}
                        className="bg-red-50 text-red-600 px-3 py-2 rounded-xl text-xs font-bold"
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}

                {filtrados.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-10 text-center text-slate-500">
                      Nenhum profissional encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Card({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="bg-white border rounded-2xl p-4 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
    </div>
  );
}