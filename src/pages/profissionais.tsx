import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { supabase } from "../lib/supabase";

import PageHeader from "../components/ui/PageHeader";
import SectionCard from "../components/ui/SectionCard";
import PrimaryButton from "../components/ui/PrimaryButton";
import EmptyState from "../components/ui/EmptyState";

type Profissional = {
  id: string;
  nome: string;
  telefone?: string | null;
  email?: string | null;
  especialidade?: string | null;
  especialidades?: string[] | null;
  dias_atendimento?: string[] | null;
  hora_inicio?: string | null;
  hora_fim?: string | null;
  inicio_almoco?: string | null;
  fim_almoco?: string | null;
  intervalo_minutos?: number | null;
  cor?: string | null;
  avatar_url?: string | null;
  ativo?: boolean | null;
  created_at?: string | null;
};

const especialidadesPadrao = [
  "Manicure e Pedicure",
  "Nail Design",
  "Alongamento",
  "Cabelo",
  "Sobrancelhas",
  "Cílios",
  "Estética",
  "Massagem",
];

const diasPadrao = [
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
  "Domingo",
];

const coresPadrao = [
  "#7c3aed",
  "#ea580c",
  "#0891b2",
  "#16a34a",
  "#dc2626",
  "#9333ea",
  "#0f766e",
  "#b45309",
];

export default function ProfissionaisPage() {
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState("");
  const [mostrarInativos, setMostrarInativos] = useState(false);

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [especialidades, setEspecialidades] = useState<string[]>([]);
  const [novaEspecialidade, setNovaEspecialidade] = useState("");
  const [diasAtendimento, setDiasAtendimento] = useState<string[]>([
    "Segunda",
    "Terça",
    "Quarta",
    "Quinta",
    "Sexta",
  ]);
  const [horaInicio, setHoraInicio] = useState("08:00");
  const [horaFim, setHoraFim] = useState("18:00");
  const [inicioAlmoco, setInicioAlmoco] = useState("12:00");
  const [fimAlmoco, setFimAlmoco] = useState("13:00");
  const [intervaloMinutos, setIntervaloMinutos] = useState("0");
  const [cor, setCor] = useState("#ea580c");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [ativo, setAtivo] = useState(true);

  useEffect(() => {
    carregarProfissionais();
  }, [mostrarInativos]);

  async function carregarProfissionais() {
    setLoading(true);

    let query = supabase
      .from("profissionais")
      .select("*")
      .order("nome", { ascending: true });

    if (!mostrarInativos) {
      query = query.eq("ativo", true);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Erro ao carregar profissionais:", error);
      alert("Erro ao carregar profissionais: " + error.message);
      setProfissionais([]);
      setLoading(false);
      return;
    }

    setProfissionais((data || []) as Profissional[]);
    setLoading(false);
  }

  function limparFormulario() {
    setEditandoId(null);
    setNome("");
    setTelefone("");
    setEmail("");
    setEspecialidades([]);
    setNovaEspecialidade("");
    setDiasAtendimento(["Segunda", "Terça", "Quarta", "Quinta", "Sexta"]);
    setHoraInicio("08:00");
    setHoraFim("18:00");
    setInicioAlmoco("12:00");
    setFimAlmoco("13:00");
    setIntervaloMinutos("0");
    setCor("#ea580c");
    setAvatarUrl("");
    setAtivo(true);
    setMostrarFormulario(false);
  }

  function normalizarHora(valor?: string | null) {
    if (!valor) return "";
    return valor.slice(0, 5);
  }

  function toggleArray(valor: string, lista: string[], setLista: (value: string[]) => void) {
    if (lista.includes(valor)) {
      setLista(lista.filter((item) => item !== valor));
    } else {
      setLista([...lista, valor]);
    }
  }

  function adicionarEspecialidadeManual() {
    const valor = novaEspecialidade.trim();

    if (!valor) return;

    if (!especialidades.some((item) => item.toLowerCase() === valor.toLowerCase())) {
      setEspecialidades([...especialidades, valor]);
    }

    setNovaEspecialidade("");
  }

  async function salvarProfissional(e: FormEvent) {
    e.preventDefault();

    if (!nome.trim()) {
      alert("Informe o nome do profissional.");
      return;
    }

    if (email && !email.includes("@")) {
      alert("Informe um e-mail válido ou deixe em branco.");
      return;
    }

    if (especialidades.length === 0) {
      alert("Selecione pelo menos uma especialidade.");
      return;
    }

    if (diasAtendimento.length === 0) {
      alert("Selecione pelo menos um dia de atendimento.");
      return;
    }

    const intervalo = Number(intervaloMinutos || 0);

    if (Number.isNaN(intervalo) || intervalo < 0) {
      alert("Intervalo entre atendimentos deve ser zero ou maior.");
      return;
    }

    setLoading(true);

    const payload = {
      nome: nome.trim(),
      telefone: telefone.trim() || null,
      email: email.trim() || null,
      especialidade: especialidades.join(", "),
      especialidades,
      dias_atendimento: diasAtendimento,
      hora_inicio: horaInicio || null,
      hora_fim: horaFim || null,
      inicio_almoco: inicioAlmoco || null,
      fim_almoco: fimAlmoco || null,
      intervalo_minutos: intervalo,
      cor,
      avatar_url: avatarUrl.trim() || null,
      ativo,
    };

    const resposta = editandoId
      ? await supabase.from("profissionais").update(payload).eq("id", editandoId)
      : await supabase.from("profissionais").insert([payload]);

    setLoading(false);

    if (resposta.error) {
      console.error("Erro ao salvar profissional:", resposta.error);
      alert("Erro ao salvar profissional: " + resposta.error.message);
      return;
    }

    alert(editandoId ? "Profissional atualizado com sucesso." : "Profissional criado com sucesso.");
    limparFormulario();
    await carregarProfissionais();
  }

  function editarProfissional(item: Profissional) {
    setEditandoId(item.id);
    setNome(item.nome || "");
    setTelefone(item.telefone || "");
    setEmail(item.email || "");
    setEspecialidades(
      Array.isArray(item.especialidades) && item.especialidades.length > 0
        ? item.especialidades
        : item.especialidade
          ? item.especialidade.split(",").map((x) => x.trim()).filter(Boolean)
          : []
    );
    setNovaEspecialidade("");
    setDiasAtendimento(
      Array.isArray(item.dias_atendimento) && item.dias_atendimento.length > 0
        ? item.dias_atendimento
        : ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"]
    );
    setHoraInicio(normalizarHora(item.hora_inicio) || "08:00");
    setHoraFim(normalizarHora(item.hora_fim) || "18:00");
    setInicioAlmoco(normalizarHora(item.inicio_almoco) || "12:00");
    setFimAlmoco(normalizarHora(item.fim_almoco) || "13:00");
    setIntervaloMinutos(item.intervalo_minutos != null ? String(item.intervalo_minutos) : "0");
    setCor(item.cor || "#ea580c");
    setAvatarUrl(item.avatar_url || "");
    setAtivo(item.ativo ?? true);
    setMostrarFormulario(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function inativarProfissional(item: Profissional) {
    const confirmar = window.confirm(`Deseja remover "${item.nome}" da listagem?`);

    if (!confirmar) return;

    const { error } = await supabase
      .from("profissionais")
      .update({ ativo: false })
      .eq("id", item.id);

    if (error) {
      alert("Erro ao remover profissional: " + error.message);
      return;
    }

    alert("Profissional removido da listagem com sucesso.");
    await carregarProfissionais();
  }

  async function ativarProfissional(item: Profissional) {
    const { error } = await supabase
      .from("profissionais")
      .update({ ativo: true })
      .eq("id", item.id);

    if (error) {
      alert("Erro ao ativar profissional: " + error.message);
      return;
    }

    await carregarProfissionais();
  }

  async function excluirDefinitivo(item: Profissional) {
    const confirmar = window.confirm(
      `Excluir definitivamente "${item.nome}"?\n\nIsso pode afetar histórico de agendamentos. Recomendo usar apenas "Remover da listagem".`
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("profissionais")
      .delete()
      .eq("id", item.id);

    if (error) {
      alert("Erro ao excluir profissional: " + error.message);
      return;
    }

    alert("Profissional excluído definitivamente.");
    await carregarProfissionais();
  }

  const profissionaisFiltrados = useMemo(() => {
    const termo = busca.toLowerCase().trim();

    if (!termo) return profissionais;

    return profissionais.filter((item) => {
      const texto = `${item.nome || ""} ${item.telefone || ""} ${item.email || ""} ${item.especialidade || ""} ${(item.especialidades || []).join(" ")}`.toLowerCase();
      return texto.includes(termo);
    });
  }, [profissionais, busca]);

  function iniciais(nomeProfissional: string) {
    const partes = nomeProfissional.trim().split(" ").filter(Boolean);

    if (partes.length === 0) return "?";
    if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();

    return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Equipe"
        title="Profissionais"
        description="Cadastre profissionais, configure agenda, avatar, dias, horários e cor."
        action={
          <PrimaryButton
            type="button"
            onClick={() => {
              if (mostrarFormulario) limparFormulario();
              else setMostrarFormulario(true);
            }}
          >
            {mostrarFormulario ? "Fechar" : "Novo profissional"}
          </PrimaryButton>
        }
      />

      <SectionCard>
        <div className="flex flex-wrap gap-3">
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, telefone ou especialidade"
            className="min-w-72 flex-1 rounded-2xl border border-slate-200 p-3"
          />

          <button
            type="button"
            onClick={() => carregarProfissionais()}
            className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            Recarregar
          </button>

          <label className="flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700">
            <input
              type="checkbox"
              checked={mostrarInativos}
              onChange={(e) => setMostrarInativos(e.target.checked)}
            />
            Mostrar inativos
          </label>
        </div>
      </SectionCard>

      {mostrarFormulario && (
        <SectionCard
          title={editandoId ? "Editar profissional" : "Novo profissional"}
          description="Preencha os dados do profissional e sua disponibilidade."
        >
          <form onSubmit={salvarProfissional} className="space-y-5">
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[160px_1fr_1fr]">
              <div>
                <div
                  className="flex h-32 w-32 items-center justify-center rounded-3xl border border-slate-300 text-2xl font-extrabold text-white"
                  style={{ background: cor }}
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={nome || "Avatar"} className="h-full w-full rounded-3xl object-cover" />
                  ) : (
                    iniciais(nome || "Profissional")
                  )}
                </div>

                <input
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="URL do avatar"
                  className="mt-3 w-full rounded-2xl border border-slate-200 p-3 text-sm"
                />
              </div>

              <div className="space-y-3">
                <input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Nome"
                  className="w-full rounded-2xl border border-slate-200 p-3"
                />

                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="E-mail (opcional)"
                  className="w-full rounded-2xl border border-slate-200 p-3"
                />

                <div>
                  <p className="mb-2 text-sm font-bold text-slate-700">Especialidades</p>

                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    {especialidadesPadrao.map((item) => (
                      <label key={item} className="flex items-center gap-2 rounded-2xl border border-slate-200 p-3 text-sm">
                        <input
                          type="checkbox"
                          checked={especialidades.includes(item)}
                          onChange={() => toggleArray(item, especialidades, setEspecialidades)}
                        />
                        {item}
                      </label>
                    ))}
                  </div>

                  <div className="mt-2 flex gap-2">
                    <input
                      value={novaEspecialidade}
                      onChange={(e) => setNovaEspecialidade(e.target.value)}
                      placeholder="Adicionar especialidade"
                      className="flex-1 rounded-2xl border border-slate-200 p-3"
                    />

                    <button
                      type="button"
                      onClick={adicionarEspecialidadeManual}
                      className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700"
                    >
                      Adicionar
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <input
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="Telefone"
                  className="w-full rounded-2xl border border-slate-200 p-3"
                />

                <div>
                  <p className="mb-2 text-sm font-bold text-slate-700">Dias de atendimento</p>

                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    {diasPadrao.map((item) => (
                      <label key={item} className="flex items-center gap-2 rounded-2xl border border-slate-200 p-3 text-sm">
                        <input
                          type="checkbox"
                          checked={diasAtendimento.includes(item)}
                          onChange={() => toggleArray(item, diasAtendimento, setDiasAtendimento)}
                        />
                        {item}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <label className="block">
                <span className="mb-1 block text-sm font-bold text-slate-700">Hora início</span>
                <input
                  type="time"
                  value={horaInicio}
                  onChange={(e) => setHoraInicio(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 p-3"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-bold text-slate-700">Hora fim</span>
                <input
                  type="time"
                  value={horaFim}
                  onChange={(e) => setHoraFim(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 p-3"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-bold text-slate-700">Intervalo entre atendimentos (min)</span>
                <input
                  type="number"
                  min="0"
                  value={intervaloMinutos}
                  onChange={(e) => setIntervaloMinutos(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 p-3"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-bold text-slate-700">Início do almoço</span>
                <input
                  type="time"
                  value={inicioAlmoco}
                  onChange={(e) => setInicioAlmoco(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 p-3"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-bold text-slate-700">Fim do almoço</span>
                <input
                  type="time"
                  value={fimAlmoco}
                  onChange={(e) => setFimAlmoco(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 p-3"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-bold text-slate-700">Cor</span>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={cor}
                    onChange={(e) => setCor(e.target.value)}
                    className="h-12 w-16 rounded-2xl border border-slate-200 p-1"
                  />

                  <div className="flex flex-wrap gap-2">
                    {coresPadrao.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setCor(item)}
                        className="h-8 w-8 rounded-full border border-white shadow"
                        style={{ background: item }}
                        title={item}
                      />
                    ))}
                  </div>
                </div>
              </label>
            </div>

            <label className="flex items-center gap-2 rounded-2xl border border-slate-200 p-3 text-sm font-bold text-slate-700">
              <input
                type="checkbox"
                checked={ativo}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setAtivo(e.target.checked)}
              />
              Profissional ativo
            </label>

            <div className="flex flex-wrap gap-2">
              <PrimaryButton type="submit">
                {loading ? "Salvando..." : editandoId ? "Atualizar" : "Salvar"}
              </PrimaryButton>

              <button
                type="button"
                onClick={limparFormulario}
                className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700"
              >
                Cancelar
              </button>
            </div>
          </form>
        </SectionCard>
      )}

      {loading ? (
        <SectionCard>
          <p>Carregando...</p>
        </SectionCard>
      ) : profissionaisFiltrados.length === 0 ? (
        <EmptyState
          title="Nenhum profissional encontrado"
          description="Cadastre um profissional para começar a usar a agenda."
        />
      ) : (
        <div className="space-y-4">
          {profissionaisFiltrados.map((item) => (
            <SectionCard key={item.id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex gap-4">
                  <div
                    className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-lg font-extrabold text-white"
                    style={{ background: item.cor || "#ea580c" }}
                  >
                    {item.avatar_url ? (
                      <img src={item.avatar_url} alt={item.nome} className="h-full w-full rounded-2xl object-cover" />
                    ) : (
                      iniciais(item.nome)
                    )}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-extrabold text-slate-900">{item.nome}</h3>

                      <span
                        className={
                          item.ativo
                            ? "rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700"
                            : "rounded-full bg-slate-200 px-3 py-1 text-xs font-bold text-slate-600"
                        }
                      >
                        {item.ativo ? "ativo" : "inativo"}
                      </span>
                    </div>

                    <p className="mt-1 text-sm text-slate-500">{item.telefone || "Sem telefone"}</p>
                    {item.email && <p className="text-sm text-slate-500">{item.email}</p>}

                    <p className="mt-2 text-sm text-slate-700">
                      <strong>Especialidades:</strong>{" "}
                      {Array.isArray(item.especialidades) && item.especialidades.length > 0
                        ? item.especialidades.join(", ")
                        : item.especialidade || "-"}
                    </p>

                    <p className="text-sm text-slate-700">
                      <strong>Dias:</strong>{" "}
                      {Array.isArray(item.dias_atendimento) && item.dias_atendimento.length > 0
                        ? item.dias_atendimento.join(", ")
                        : "-"}
                    </p>

                    <p className="text-sm text-slate-700">
                      <strong>Atendimento:</strong> {normalizarHora(item.hora_inicio) || "-"} às {normalizarHora(item.hora_fim) || "-"}
                    </p>

                    <p className="text-sm text-slate-700">
                      <strong>Almoço:</strong> {normalizarHora(item.inicio_almoco) || "-"} às {normalizarHora(item.fim_almoco) || "-"}
                    </p>

                    <p className="text-sm text-slate-700">
                      <strong>Intervalo:</strong> {item.intervalo_minutos ?? 0} min
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => editarProfissional(item)}
                    className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700"
                  >
                    Editar
                  </button>

                  {item.ativo ? (
                    <button
                      type="button"
                      onClick={() => inativarProfissional(item)}
                      className="rounded-2xl bg-red-600 px-4 py-2 text-sm font-bold text-white"
                    >
                      Remover da listagem
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => ativarProfissional(item)}
                      className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white"
                    >
                      Reativar
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => excluirDefinitivo(item)}
                    className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-bold text-white"
                  >
                    Excluir definitivo
                  </button>
                </div>
              </div>
            </SectionCard>
          ))}
        </div>
      )}
    </div>
  );
}
