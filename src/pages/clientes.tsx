import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { supabase } from "../lib/supabase";

import PageHeader from "../components/ui/PageHeader";
import SectionCard from "../components/ui/SectionCard";
import PrimaryButton from "../components/ui/PrimaryButton";
import SecondaryButton from "../components/ui/SecondaryButton";
import EmptyState from "../components/ui/EmptyState";
import StatusBadge from "../components/ui/StatusBadge";

type Cliente = {
  id: string;
  nome: string;
  telefone: string | null;
  email?: string | null;
  cpf?: string | null;
  data_nascimento?: string | null;
  sexo?: string | null;
  tipo_pele?: string | null;
  alergias?: string | null;
  origem?: string | null;
  preferencias?: string | null;
  observacoes?: string | null;
  ativo?: boolean | null;
  token?: string | null;
  created_at?: string | null;
};

type AgendamentoHistorico = {
  id: string;
  cliente_id: string | null;
  cliente: string | null;
  profissional: string | null;
  servico: string | null;
  data: string | null;
  horario: string | null;
  status: string | null;
  observacoes: string | null;
  created_at?: string | null;
};

const clienteInicial = {
  nome: "",
  telefone: "",
  email: "",
  cpf: "",
  data_nascimento: "",
  sexo: "Não informado",
  tipo_pele: "Não informado",
  alergias: "",
  origem: "Não informado",
  preferencias: "",
  observacoes: "",
  ativo: true,
};

export default function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState(clienteInicial);

  const [clienteHistorico, setClienteHistorico] = useState<Cliente | null>(null);
  const [historicoAgendamentos, setHistoricoAgendamentos] = useState<AgendamentoHistorico[]>([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);

  useEffect(() => {
    void carregarClientes();
  }, []);

  async function carregarClientes() {
    setLoading(true);

    const { data, error } = await supabase
      .from("clientes")
      .select("*")
      .order("nome", { ascending: true });

    if (error) {
      console.error("Erro ao carregar clientes:", error);
      alert("Erro ao carregar clientes: " + error.message);
      setClientes([]);
      setLoading(false);
      return;
    }

    setClientes((data || []) as Cliente[]);
    setLoading(false);
  }

  function atualizarCampo(campo: keyof typeof clienteInicial, valor: string | boolean) {
    setForm((atual) => ({
      ...atual,
      [campo]: valor,
    }));
  }

  function limparFormulario() {
    setForm(clienteInicial);
    setEditandoId(null);
    setMostrarFormulario(false);
    setSalvando(false);
  }

  function gerarToken() {
    if (crypto?.randomUUID) return crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  async function salvarCliente(event: FormEvent) {
    event.preventDefault();

    if (!form.nome.trim()) {
      alert("Informe o nome do cliente.");
      return;
    }

    if (!form.telefone.trim()) {
      alert("Informe o telefone/WhatsApp do cliente.");
      return;
    }

    if (form.email.trim() && !form.email.includes("@")) {
      alert("Informe um e-mail válido ou deixe em branco.");
      return;
    }

    setSalvando(true);

    const payload = {
      nome: form.nome.trim(),
      telefone: form.telefone.trim(),
      email: form.email.trim() || null,
      cpf: form.cpf.trim() || null,
      data_nascimento: form.data_nascimento || null,
      sexo: form.sexo || "Não informado",
      tipo_pele: form.tipo_pele || "Não informado",
      alergias: form.alergias.trim() || null,
      origem: form.origem || "Não informado",
      preferencias: form.preferencias.trim() || null,
      observacoes: form.observacoes.trim() || null,
      ativo: form.ativo,
      token: editandoId ? undefined : gerarToken(),
    };

    const resposta = editandoId
      ? await supabase.from("clientes").update(payload).eq("id", editandoId)
      : await supabase.from("clientes").insert([payload]);

    if (resposta.error) {
      console.error("Erro ao salvar cliente:", resposta.error);
      alert("Erro ao salvar cliente: " + resposta.error.message);
      setSalvando(false);
      return;
    }

    limparFormulario();
    await carregarClientes();
  }

  function editarCliente(cliente: Cliente) {
    setEditandoId(cliente.id);
    setForm({
      nome: cliente.nome || "",
      telefone: cliente.telefone || "",
      email: cliente.email || "",
      cpf: cliente.cpf || "",
      data_nascimento: cliente.data_nascimento || "",
      sexo: cliente.sexo || "Não informado",
      tipo_pele: cliente.tipo_pele || "Não informado",
      alergias: cliente.alergias || "",
      origem: cliente.origem || "Não informado",
      preferencias: cliente.preferencias || "",
      observacoes: cliente.observacoes || "",
      ativo: cliente.ativo ?? true,
    });
    setMostrarFormulario(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function alternarStatus(cliente: Cliente) {
    const novoStatus = !(cliente.ativo ?? true);

    const { error } = await supabase
      .from("clientes")
      .update({ ativo: novoStatus })
      .eq("id", cliente.id);

    if (error) {
      alert("Erro ao atualizar cliente: " + error.message);
      return;
    }

    await carregarClientes();
  }

  async function abrirHistoricoCliente(cliente: Cliente) {
    setClienteHistorico(cliente);
    setLoadingHistorico(true);
    setHistoricoAgendamentos([]);

    const { data: porId, error: erroPorId } = await supabase
      .from("agendamentos")
      .select("*")
      .eq("cliente_id", cliente.id)
      .order("data", { ascending: false })
      .order("horario", { ascending: false });

    if (erroPorId) {
      console.error("Erro ao buscar histórico por ID:", erroPorId);
    }

    let resultado = (porId || []) as AgendamentoHistorico[];

    if (resultado.length === 0 && cliente.nome) {
      const { data: porNome, error: erroPorNome } = await supabase
        .from("agendamentos")
        .select("*")
        .eq("cliente", cliente.nome)
        .order("data", { ascending: false })
        .order("horario", { ascending: false });

      if (erroPorNome) {
        alert("Erro ao buscar histórico do cliente: " + erroPorNome.message);
      } else {
        resultado = (porNome || []) as AgendamentoHistorico[];
      }
    }

    setHistoricoAgendamentos(resultado);
    setLoadingHistorico(false);
  }

  function fecharHistoricoCliente() {
    setClienteHistorico(null);
    setHistoricoAgendamentos([]);
    setLoadingHistorico(false);
  }

  function formatarData(valor?: string | null) {
    if (!valor) return "-";
    const partes = valor.split("-");
    if (partes.length !== 3) return valor;
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }

  function idadeCliente(dataNascimento?: string | null) {
    if (!dataNascimento) return "-";

    const nascimento = new Date(dataNascimento);
    if (Number.isNaN(nascimento.getTime())) return "-";

    const hoje = new Date();
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const mes = hoje.getMonth() - nascimento.getMonth();

    if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
      idade--;
    }

    return `${idade} anos`;
  }

  function iniciais(nome: string) {
    const partes = nome.trim().split(" ").filter(Boolean);

    if (partes.length === 0) return "?";
    if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();

    return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
  }

  const clientesFiltrados = useMemo(() => {
    const termo = busca.toLowerCase().trim();

    if (!termo) return clientes;

    return clientes.filter((cliente) => {
      const texto = `${cliente.nome || ""} ${cliente.telefone || ""} ${cliente.email || ""} ${cliente.cpf || ""}`.toLowerCase();
      return texto.includes(termo);
    });
  }, [clientes, busca]);

  const totalAtivos = clientes.filter((cliente) => cliente.ativo ?? true).length;
  const totalInativos = clientes.length - totalAtivos;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Relacionamento"
        title="Clientes"
        description="Cadastre, gerencie e acompanhe o histórico dos clientes do estabelecimento."
        action={
          <PrimaryButton
            type="button"
            onClick={() => {
              if (mostrarFormulario) limparFormulario();
              else setMostrarFormulario(true);
            }}
          >
            {mostrarFormulario ? "Fechar" : "+ Novo cliente"}
          </PrimaryButton>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SectionCard>
          <p className="text-sm font-semibold text-slate-500">Total de clientes</p>
          <p className="mt-2 text-3xl font-extrabold text-slate-900">{clientes.length}</p>
        </SectionCard>

        <SectionCard>
          <p className="text-sm font-semibold text-slate-500">Clientes ativos</p>
          <p className="mt-2 text-3xl font-extrabold text-emerald-600">{totalAtivos}</p>
        </SectionCard>

        <SectionCard>
          <p className="text-sm font-semibold text-slate-500">Clientes inativos</p>
          <p className="mt-2 text-3xl font-extrabold text-slate-500">{totalInativos}</p>
        </SectionCard>
      </div>

      {mostrarFormulario && (
        <SectionCard
          title={editandoId ? "Editar cliente" : "Novo cliente"}
          description="Nome e telefone são obrigatórios. E-mail e CPF são opcionais."
        >
          <form onSubmit={salvarCliente} className="space-y-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Nome *">
                <input
                  value={form.nome}
                  onChange={(e) => atualizarCampo("nome", e.target.value)}
                  placeholder="Nome completo"
                  className="w-full rounded-2xl border border-slate-200 p-3"
                />
              </Field>

              <Field label="Telefone / WhatsApp *">
                <input
                  value={form.telefone}
                  onChange={(e) => atualizarCampo("telefone", e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="w-full rounded-2xl border border-slate-200 p-3"
                />
              </Field>

              <Field label="Email (opcional)">
                <input
                  value={form.email}
                  onChange={(e) => atualizarCampo("email", e.target.value)}
                  placeholder="cliente@email.com"
                  className="w-full rounded-2xl border border-slate-200 p-3"
                />
              </Field>

              <Field label="CPF (opcional)">
                <input
                  value={form.cpf}
                  onChange={(e) => atualizarCampo("cpf", e.target.value)}
                  placeholder="000.000.000-00"
                  className="w-full rounded-2xl border border-slate-200 p-3"
                />
              </Field>

              <Field label="Data de nascimento">
                <input
                  type="date"
                  value={form.data_nascimento}
                  onChange={(e) => atualizarCampo("data_nascimento", e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 p-3"
                />
              </Field>

              <Field label="Sexo">
                <select
                  value={form.sexo}
                  onChange={(e) => atualizarCampo("sexo", e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 p-3"
                >
                  <option>Não informado</option>
                  <option>Feminino</option>
                  <option>Masculino</option>
                  <option>Outro</option>
                </select>
              </Field>

              <Field label="Tipo de pele">
                <select
                  value={form.tipo_pele}
                  onChange={(e) => atualizarCampo("tipo_pele", e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 p-3"
                >
                  <option>Não informado</option>
                  <option>Normal</option>
                  <option>Seca</option>
                  <option>Oleosa</option>
                  <option>Mista</option>
                  <option>Sensível</option>
                </select>
              </Field>

              <Field label="Origem do cliente">
                <select
                  value={form.origem}
                  onChange={(e) => atualizarCampo("origem", e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 p-3"
                >
                  <option>Não informado</option>
                  <option>Indicação</option>
                  <option>Instagram</option>
                  <option>WhatsApp</option>
                  <option>Google</option>
                  <option>Passou em frente</option>
                  <option>Outro</option>
                </select>
              </Field>

              <Field label="Alergias / restrições">
                <textarea
                  value={form.alergias}
                  onChange={(e) => atualizarCampo("alergias", e.target.value)}
                  placeholder="Ex: alergia a esmalte, látex, produtos químicos..."
                  className="min-h-28 w-full rounded-2xl border border-slate-200 p-3"
                />
              </Field>

              <Field label="Preferências">
                <textarea
                  value={form.preferencias}
                  onChange={(e) => atualizarCampo("preferencias", e.target.value)}
                  placeholder="Ex: prefere horário da manhã, profissional específico..."
                  className="min-h-28 w-full rounded-2xl border border-slate-200 p-3"
                />
              </Field>

              <div className="md:col-span-2">
                <Field label="Observações gerais">
                  <textarea
                    value={form.observacoes}
                    onChange={(e) => atualizarCampo("observacoes", e.target.value)}
                    placeholder="Informações importantes sobre o cliente"
                    className="min-h-28 w-full rounded-2xl border border-slate-200 p-3"
                  />
                </Field>
              </div>
            </div>

            <label className="flex items-center gap-2 rounded-2xl border border-slate-200 p-3 text-sm font-bold text-slate-700">
              <input
                type="checkbox"
                checked={form.ativo}
                onChange={(e) => atualizarCampo("ativo", e.target.checked)}
              />
              Cliente ativo
            </label>

            <div className="flex flex-wrap gap-2">
              <PrimaryButton type="submit" disabled={salvando}>
                {salvando ? "Salvando..." : editandoId ? "Atualizar cliente" : "Cadastrar cliente"}
              </PrimaryButton>

              <SecondaryButton type="button" onClick={limparFormulario}>
                Cancelar
              </SecondaryButton>
            </div>
          </form>
        </SectionCard>
      )}

      <SectionCard>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">Clientes cadastrados</h2>
            <p className="text-sm text-slate-500">Pesquise por nome, telefone, e-mail ou CPF.</p>
          </div>

          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar cliente..."
            className="min-w-72 rounded-2xl border border-slate-200 p-3"
          />
        </div>
      </SectionCard>

      {loading ? (
        <SectionCard>
          <p>Carregando clientes...</p>
        </SectionCard>
      ) : clientesFiltrados.length === 0 ? (
        <EmptyState
          title="Nenhum cliente encontrado"
          description="Cadastre um novo cliente ou ajuste sua busca."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {clientesFiltrados.map((cliente) => (
            <SectionCard key={cliente.id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex gap-4">
                  <div
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-lg font-extrabold text-white"
                    style={{ backgroundColor: "var(--color-primary)" }}
                  >
                    {iniciais(cliente.nome)}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-extrabold text-slate-900">{cliente.nome}</h3>
                      <StatusBadge status={cliente.ativo ?? true ? "Ativo" : "Inativo"} />
                    </div>

                    <p className="mt-1 text-sm text-slate-500">{cliente.telefone || "Sem telefone"}</p>

                    {cliente.email && <p className="text-sm text-slate-500">{cliente.email}</p>}

                    <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-slate-600 sm:grid-cols-2">
                      <p><strong>Nascimento:</strong> {formatarData(cliente.data_nascimento)}</p>
                      <p><strong>Idade:</strong> {idadeCliente(cliente.data_nascimento)}</p>
                      <p><strong>Origem:</strong> {cliente.origem || "-"}</p>
                      <p><strong>Sexo:</strong> {cliente.sexo || "-"}</p>
                    </div>

                    {(cliente.alergias || cliente.preferencias || cliente.observacoes) && (
                      <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">
                        {cliente.alergias && <p><strong>Alergias:</strong> {cliente.alergias}</p>}
                        {cliente.preferencias && <p><strong>Preferências:</strong> {cliente.preferencias}</p>}
                        {cliente.observacoes && <p><strong>Observações:</strong> {cliente.observacoes}</p>}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap justify-end gap-2">
                  <SecondaryButton type="button" onClick={() => abrirHistoricoCliente(cliente)}>
                    Histórico
                  </SecondaryButton>

                  <SecondaryButton type="button" onClick={() => editarCliente(cliente)}>
                    Editar
                  </SecondaryButton>

                  <button
                    type="button"
                    onClick={() => alternarStatus(cliente)}
                    className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-red-700"
                  >
                    {cliente.ativo ?? true ? "Inativar" : "Ativar"}
                  </button>
                </div>
              </div>
            </SectionCard>
          ))}
        </div>
      )}

      {clienteHistorico && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[85vh] w-full max-w-5xl overflow-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900">Histórico do cliente</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {clienteHistorico.nome} — inclui atendimentos finalizados, agendados e cancelados.
                </p>
              </div>

              <SecondaryButton type="button" onClick={fecharHistoricoCliente}>
                Fechar
              </SecondaryButton>
            </div>

            {loadingHistorico ? (
              <p>Carregando histórico...</p>
            ) : historicoAgendamentos.length === 0 ? (
              <EmptyState
                title="Nenhum histórico encontrado"
                description="Ainda não há agendamentos vinculados a este cliente."
              />
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full border-collapse">
                  <thead>
                    <tr
                      className="text-left text-sm text-white"
                      style={{ backgroundColor: "var(--color-primary)" }}
                    >
                      <th className="px-4 py-3">Data</th>
                      <th className="px-4 py-3">Hora</th>
                      <th className="px-4 py-3">Serviço</th>
                      <th className="px-4 py-3">Profissional</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Observações</th>
                    </tr>
                  </thead>

                  <tbody>
                    {historicoAgendamentos.map((item) => (
                      <tr key={item.id} className="border-b border-slate-100 odd:bg-white even:bg-slate-50">
                        <td className="px-4 py-3 text-sm text-slate-700">{formatarData(item.data)}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{item.horario || "-"}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{item.servico || "-"}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{item.profissional || "-"}</td>
                        <td className="px-4 py-3 text-sm"><StatusBadge status={item.status || "-"} /></td>
                        <td className="px-4 py-3 text-sm text-slate-700">{item.observacoes || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-extrabold text-slate-700">
        {label}
      </span>
      {children}
    </label>
  );
}
