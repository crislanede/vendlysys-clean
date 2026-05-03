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

type Servico = {
  id: string;
  nome: string;
  ativo?: boolean | null;
};

type ProfissionalServico = {
  profissional_id: string;
  servico_id: string;
  comissao_percentual?: number | null;
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
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [profissionalServicos, setProfissionalServicos] = useState<ProfissionalServico[]>([]);
  const [servicosSelecionados, setServicosSelecionados] = useState<string[]>([]);
  const [comissoesServicos, setComissoesServicos] = useState<Record<string, string>>({});

  const [busca, setBusca] = useState("");
  const [form, setForm] = useState(formInicial);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (empresaId) carregarTudo();
  }, [empresaId]);

  async function carregarTudo() {
    await Promise.all([carregar(), carregarServicos(), carregarProfissionalServicos()]);
  }

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

  async function carregarServicos() {
    if (!empresaId) return;

    const { data, error } = await supabase
      .from("servicos")
      .select("id,nome,ativo")
      .eq("empresa_id", empresaId)
      .order("nome");

    if (error) {
      console.warn("Erro ao carregar serviços:", error.message);
      setServicos([]);
      return;
    }

    setServicos(data || []);
  }

  async function carregarProfissionalServicos() {
    const { data, error } = await supabase
      .from("profissional_servicos")
      .select("profissional_id,servico_id,comissao_percentual");

    if (error) {
      console.warn("Erro ao carregar vínculos de serviços:", error.message);
      setProfissionalServicos([]);
      return;
    }

    setProfissionalServicos(data || []);
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

    const payload = {
      ...form,
      nome: form.nome.trim(),
      telefone: form.telefone.trim() || null,
      email: form.email.trim() || null,
      especialidade: form.especialidade.trim() || null,
      intervalo_minutos: Number(form.intervalo_minutos || 0),
      empresa_id: empresaId,
      ativo: true,
    };

    let profissionalId = editandoId;

    if (editandoId) {
      const { error } = await supabase
        .from("profissionais")
        .update(payload)
        .eq("id", editandoId)
        .eq("empresa_id", empresaId);

      if (error) {
        setSalvando(false);
        alert("Erro ao atualizar profissional: " + error.message);
        return;
      }
    } else {
      const { data, error } = await supabase
        .from("profissionais")
        .insert(payload)
        .select("id")
        .single();

      if (error) {
        setSalvando(false);
        alert("Erro ao salvar profissional: " + error.message);
        return;
      }

      profissionalId = data.id;
    }

    if (profissionalId) {
      const { error: deleteError } = await supabase
        .from("profissional_servicos")
        .delete()
        .eq("profissional_id", profissionalId);

      if (deleteError) {
        setSalvando(false);
        alert("Profissional salvo, mas erro ao atualizar serviços: " + deleteError.message);
        return;
      }

      if (servicosSelecionados.length > 0) {
        const { error: insertError } = await supabase.from("profissional_servicos").insert(
          servicosSelecionados.map((servicoId) => ({
            profissional_id: profissionalId,
            servico_id: servicoId,
            comissao_percentual:
              comissoesServicos[servicoId] === "" || comissoesServicos[servicoId] == null
                ? 0
                : Number(comissoesServicos[servicoId]),
          }))
        );

        if (insertError) {
          setSalvando(false);
          alert("Profissional salvo, mas erro ao vincular serviços: " + insertError.message);
          return;
        }
      }
    }

    setSalvando(false);
    limparFormulario();
    carregarTudo();
  }

  function editar(profissional: Profissional) {
    setEditandoId(profissional.id);
    setForm({
      nome: profissional.nome || "",
      telefone: profissional.telefone || "",
      email: profissional.email || "",
      especialidade: profissional.especialidade || "",
      hora_inicio: profissional.hora_inicio || "08:00",
      hora_fim: profissional.hora_fim || "18:00",
      inicio_almoco: profissional.inicio_almoco || "12:00",
      fim_almoco: profissional.fim_almoco || "13:00",
      intervalo_minutos: Number(profissional.intervalo_minutos || 0),
    });

    const vinculos = profissionalServicos.filter(
      (item) => item.profissional_id === profissional.id
    );

    setServicosSelecionados(vinculos.map((item) => item.servico_id));

    setComissoesServicos(
      vinculos.reduce<Record<string, string>>((acc, item) => {
        acc[item.servico_id] = String(item.comissao_percentual ?? 0);
        return acc;
      }, {})
    );

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function limparFormulario() {
    setEditandoId(null);
    setForm(formInicial);
    setServicosSelecionados([]);
    setComissoesServicos({});
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

    carregarTudo();
  }

  function alternarServico(servicoId: string) {
    setServicosSelecionados((atual) => {
      if (atual.includes(servicoId)) {
        setComissoesServicos((comissoesAtuais) => {
          const copia = { ...comissoesAtuais };
          delete copia[servicoId];
          return copia;
        });

        return atual.filter((id) => id !== servicoId);
      }

      setComissoesServicos((comissoesAtuais) => ({
        ...comissoesAtuais,
        [servicoId]: comissoesAtuais[servicoId] ?? "0",
      }));

      return [...atual, servicoId];
    });
  }

  function atualizarComissaoServico(servicoId: string, valor: string) {
    const valorLimpo = valor.replace(",", ".");

    if (valorLimpo === "") {
      setComissoesServicos((atual) => ({ ...atual, [servicoId]: "" }));
      return;
    }

    const numero = Number(valorLimpo);

    if (Number.isNaN(numero)) return;

    const limitado = Math.min(Math.max(numero, 0), 100);

    setComissoesServicos((atual) => ({
      ...atual,
      [servicoId]: String(limitado),
    }));
  }

  function nomesServicosDoProfissional(profissionalId: string) {
    const vinculos = profissionalServicos.filter(
      (item) => item.profissional_id === profissionalId
    );

    const nomes = vinculos
      .map((vinculo) => {
        const servico = servicos.find((item) => item.id === vinculo.servico_id);
        if (!servico) return null;

        const comissao = Number(vinculo.comissao_percentual || 0);
        return `${servico.nome} (${comissao}% comissão)`;
      })
      .filter(Boolean);

    return nomes.length > 0 ? nomes.join(", ") : "-";
  }

  const filtrados = useMemo(() => {
    const termo = busca.toLowerCase();

    return lista.filter((p) =>
      `${p.nome} ${p.telefone || ""} ${p.email || ""} ${p.especialidade || ""} ${nomesServicosDoProfissional(p.id)}`
        .toLowerCase()
        .includes(termo)
    );
  }, [lista, busca, profissionalServicos, servicos]);

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
          <p
            style={{ color: "var(--cor-primaria, #4b2f3f)" }}
            className="text-sm font-bold uppercase"
          >
            Cadastros
          </p>
          <h1 className="text-3xl font-bold text-slate-900">Profissionais</h1>
          <p className="text-slate-500">
            Cadastre profissionais, horários de trabalho, intervalos e serviços atendidos.
          </p>
        </div>

        <button
          onClick={carregarTudo}
          className="border px-4 py-2 rounded-xl font-bold bg-white"
        >
          Atualizar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card title="Total" value={lista.length} />
        <Card title="Ativos" value={lista.filter((p) => p.ativo !== false).length} />
        <Card title="Com especialidade" value={lista.filter((p) => !!p.especialidade).length} />
        <Card title="Com telefone" value={lista.filter((p) => !!p.telefone).length} />
      </div>

      <div className="bg-white rounded-2xl border shadow-sm p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="font-bold text-slate-900">
            {editandoId ? "Editar profissional" : "Novo profissional"}
          </h2>

          {editandoId && (
            <button
              type="button"
              onClick={limparFormulario}
              className="border px-4 py-2 rounded-xl font-bold bg-white"
            >
              Cancelar edição
            </button>
          )}
        </div>

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
            onChange={(e) => setForm({ ...form, especialidade: e.target.value })}
            className="border rounded-xl px-4 py-3"
          />

          <div>
            <label className="text-xs font-bold text-slate-500">Início expediente</label>
            <input
              type="time"
              value={form.hora_inicio}
              onChange={(e) => setForm({ ...form, hora_inicio: e.target.value })}
              className="mt-1 w-full border rounded-xl px-4 py-3"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500">Fim expediente</label>
            <input
              type="time"
              value={form.hora_fim}
              onChange={(e) => setForm({ ...form, hora_fim: e.target.value })}
              className="mt-1 w-full border rounded-xl px-4 py-3"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500">Início almoço</label>
            <input
              type="time"
              value={form.inicio_almoco}
              onChange={(e) => setForm({ ...form, inicio_almoco: e.target.value })}
              className="mt-1 w-full border rounded-xl px-4 py-3"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500">Fim almoço</label>
            <input
              type="time"
              value={form.fim_almoco}
              onChange={(e) => setForm({ ...form, fim_almoco: e.target.value })}
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

          <div className="md:col-span-3 border rounded-2xl p-4 bg-slate-50">
            <p className="font-bold text-slate-900 mb-1">Serviços que este profissional realiza</p>
            <p className="text-xs text-slate-500 mb-3">
              Marque o serviço e informe o percentual de comissão deste profissional.
            </p>

            {servicos.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhum serviço cadastrado para esta empresa.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {servicos.map((servico) => {
                  const selecionado = servicosSelecionados.includes(servico.id);

                  return (
                    <div
                      key={servico.id}
                      className={`bg-white border rounded-xl px-3 py-3 text-sm ${
                        selecionado ? "border-violet-300 ring-2 ring-violet-100" : ""
                      }`}
                    >
                      <label className="flex items-center gap-2 font-semibold text-slate-800">
                        <input
                          type="checkbox"
                          checked={selecionado}
                          onChange={() => alternarServico(servico.id)}
                        />
                        <span>{servico.nome}</span>
                      </label>

                      {selecionado && (
                        <div className="mt-3">
                          <label className="text-xs font-bold text-slate-500">
                            Comissão do profissional (%)
                          </label>
                          <div className="mt-1 flex items-center gap-2">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              step="0.01"
                              value={comissoesServicos[servico.id] ?? "0"}
                              onChange={(e) =>
                                atualizarComissaoServico(servico.id, e.target.value)
                              }
                              className="w-full border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-violet-100"
                              placeholder="Ex: 40"
                            />
                            <span className="text-sm font-bold text-slate-500">%</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <button
            onClick={salvar}
            disabled={salvando}
            style={{ backgroundColor: "var(--cor-primaria, #4b2f3f)" }}
            className="text-white rounded-xl px-5 py-3 font-bold hover:opacity-90 transition disabled:opacity-60 md:col-span-4"
          >
            {salvando
              ? "Salvando..."
              : editandoId
                ? "Atualizar profissional"
                : "Salvar profissional"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="p-5 border-b flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-bold text-slate-900">Profissionais cadastrados</h2>
            <p className="text-sm text-slate-500">
              {filtrados.length} profissional(is) encontrado(s).
            </p>
          </div>

          <input
            placeholder="Buscar por nome, telefone, e-mail, especialidade ou serviço..."
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
                  <th>Serviços</th>
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
                    <td className="max-w-xs text-xs text-slate-600">
                      {nomesServicosDoProfissional(p.id)}
                    </td>
                    <td>{p.hora_inicio || "-"} às {p.hora_fim || "-"}</td>
                    <td>{p.inicio_almoco || "-"} às {p.fim_almoco || "-"}</td>
                    <td>{p.intervalo_minutos || 0} min</td>
                    <td className="text-right pr-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => editar(p)}
                          className="border px-3 py-2 rounded-xl text-xs font-bold bg-white"
                        >
                          Editar
                        </button>

                        <button
                          onClick={() => remover(p.id)}
                          className="bg-red-50 text-red-600 px-3 py-2 rounded-xl text-xs font-bold"
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filtrados.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-10 text-center text-slate-500">
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
