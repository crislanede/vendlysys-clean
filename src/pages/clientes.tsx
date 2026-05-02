import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { useEmpresa } from "../hooks/useEmpresa";
import HistoricoAnamnese from "../components/clientes/HistoricoAnamnese";

type Cliente = {
  id: string;
  nome: string;
  telefone: string;
  email?: string | null;
  data_nascimento?: string | null;
  cep?: string | null;
  endereco?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  empresa_id?: string | null;
};

type Servico = {
  id: string;
  nome: string;
  preco?: number | null;
  valor?: number | null;
  preco_promocional?: number | null;
  ativo?: boolean | null;
};

const formularioVazio = {
  nome: "",
  telefone: "",
  email: "",
  dataNascimento: "",
  cep: "",
  endereco: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  estado: "",
};

export default function ClientesPage() {
  const { empresaId, carregandoEmpresa } = useEmpresa();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [anamnesePorCliente, setAnamnesePorCliente] = useState<Record<string, { preenchida: boolean; preenchido_em?: string | null }>>({});
  const [busca, setBusca] = useState("");
  const [form, setForm] = useState(formularioVazio);
  const [clienteEditando, setClienteEditando] = useState<Cliente | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [precosEspeciais, setPrecosEspeciais] = useState<Record<string, string>>({});
  const [salvandoPrecoEspecial, setSalvandoPrecoEspecial] = useState(false);

  useEffect(() => {
    if (empresaId) {
      carregarClientes();
      carregarServicos();
    }
  }, [empresaId]);

  function atualizarCampo(campo: keyof typeof formularioVazio, valor: string) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  }

  async function carregarClientes() {
    if (!empresaId) return;

    setLoading(true);

    const { data, error } = await supabase
      .from("clientes")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("nome");

    setLoading(false);

    if (error) {
      alert("Erro ao carregar clientes: " + error.message);
      return;
    }

    const lista = (data || []) as Cliente[];
    setClientes(lista);
    await carregarStatusAnamnese(lista);
  }

  async function carregarStatusAnamnese(listaClientes: Cliente[]) {
    if (listaClientes.length === 0) {
      setAnamnesePorCliente({});
      return;
    }

    const ids = listaClientes.map((cliente) => cliente.id);

    const { data, error } = await supabase
      .from("anamneses_clientes")
      .select("id, cliente_id, preenchido, preenchido_em")
      .in("cliente_id", ids)
      .eq("preenchido", true)
      .order("preenchido_em", { ascending: false });

    if (error) {
      console.error("Erro ao carregar status da anamnese:", error);
      setAnamnesePorCliente({});
      return;
    }

    const mapa: Record<string, { preenchida: boolean; preenchido_em?: string | null }> = {};

    (data || []).forEach((item: any) => {
      if (!item.cliente_id || mapa[item.cliente_id]) return;
      mapa[item.cliente_id] = {
        preenchida: Boolean(item.preenchido),
        preenchido_em: item.preenchido_em || null,
      };
    });

    setAnamnesePorCliente(mapa);
  }

  async function carregarServicos() {
    if (!empresaId) return;

    const { data, error } = await supabase
      .from("servicos")
      .select("id, nome, preco, valor, preco_promocional, ativo")
      .eq("empresa_id", empresaId)
      .order("nome", { ascending: true });

    if (error) {
      console.error("Erro ao carregar serviços para preço especial:", error);
      return;
    }

    setServicos((data || []) as Servico[]);
  }

  async function carregarPrecosEspeciais(clienteId: string) {
    const { data, error } = await supabase
      .from("cliente_precos_servicos")
      .select("id, cliente_id, servico_id, valor_especial, ativo")
      .eq("cliente_id", clienteId)
      .eq("ativo", true);

    if (error) {
      console.error("Erro ao carregar preços especiais:", error);
      setPrecosEspeciais({});
      return;
    }

    const mapa: Record<string, string> = {};
    (data || []).forEach((item: any) => {
      mapa[item.servico_id] = String(item.valor_especial ?? "");
    });

    setPrecosEspeciais(mapa);
  }

  function atualizarPrecoEspecial(servicoId: string, valor: string) {
    setPrecosEspeciais((atual) => ({ ...atual, [servicoId]: valor }));
  }

  function precoPadraoServico(servico: Servico) {
    const valor = Number(servico.preco_promocional ?? servico.preco ?? servico.valor ?? 0);
    return Number.isNaN(valor) ? 0 : valor;
  }

  function formatarMoeda(valor?: number | string | null) {
    const numero = Number(valor || 0);
    return numero.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function normalizarValorDinheiro(valor: string) {
    const limpo = valor
      .replace(/R\$/g, "")
      .replace(/\s/g, "")
      .replace(/\./g, "")
      .replace(",", ".");

    if (!limpo) return null;

    const numero = Number(limpo);
    return Number.isNaN(numero) ? null : numero;
  }

  async function salvarPrecosEspeciaisCliente(mostrarAlerta = true) {
    if (!empresaId || !clienteEditando?.id) return true;

    setSalvandoPrecoEspecial(true);

    for (const servico of servicos) {
      const valorTexto = (precosEspeciais[servico.id] || "").trim();
      const valorNormalizado = normalizarValorDinheiro(valorTexto);

      if (valorTexto && (valorNormalizado === null || valorNormalizado < 0)) {
        alert(`Informe um valor especial válido para: ${servico.nome}`);
        setSalvandoPrecoEspecial(false);
        return false;
      }

      if (valorNormalizado !== null) {
        const { error } = await supabase
          .from("cliente_precos_servicos")
          .upsert(
            {
              empresa_id: empresaId,
              cliente_id: clienteEditando.id,
              servico_id: servico.id,
              valor_especial: valorNormalizado,
              ativo: true,
              atualizado_em: new Date().toISOString(),
            },
            { onConflict: "cliente_id,servico_id" },
          );

        if (error) {
          alert("Erro ao salvar preço especial: " + error.message);
          setSalvandoPrecoEspecial(false);
          return false;
        }
      } else {
        const { error } = await supabase
          .from("cliente_precos_servicos")
          .update({ ativo: false, atualizado_em: new Date().toISOString() })
          .eq("cliente_id", clienteEditando.id)
          .eq("servico_id", servico.id);

        if (error) {
          console.error("Erro ao desativar preço especial:", error);
        }
      }
    }

    setSalvandoPrecoEspecial(false);
    if (mostrarAlerta) alert("Preços especiais salvos com sucesso.");
    await carregarPrecosEspeciais(clienteEditando.id);
    return true;
  }

  async function buscarCepAutomatico(valorCep = form.cep) {
    const cepLimpo = valorCep.replace(/\D/g, "");

    if (cepLimpo.length !== 8) return;

    try {
      setBuscandoCep(true);
      const resposta = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const dados = await resposta.json();

      if (dados?.erro) {
        alert("CEP não encontrado.");
        return;
      }

      setForm((atual) => ({
        ...atual,
        endereco: dados.logradouro || "",
        bairro: dados.bairro || "",
        cidade: dados.localidade || "",
        estado: dados.uf || "",
      }));
    } catch (error) {
      alert("Erro ao buscar CEP.");
    } finally {
      setBuscandoCep(false);
    }
  }

  function abrirNovoCliente() {
    setClienteEditando(null);
    setForm(formularioVazio);
    setPrecosEspeciais({});
    setModalAberto(true);
  }

  function abrirEdicao(cliente: Cliente) {
    setClienteEditando(cliente);
    setForm({
      nome: cliente.nome || "",
      telefone: cliente.telefone || "",
      email: cliente.email || "",
      dataNascimento: cliente.data_nascimento || "",
      cep: cliente.cep || "",
      endereco: cliente.endereco || "",
      numero: cliente.numero || "",
      complemento: cliente.complemento || "",
      bairro: cliente.bairro || "",
      cidade: cliente.cidade || "",
      estado: cliente.estado || "",
    });
    setModalAberto(true);
    carregarPrecosEspeciais(cliente.id);
  }

  function fecharModal() {
    setModalAberto(false);
    setClienteEditando(null);
    setForm(formularioVazio);
    setPrecosEspeciais({});
  }

  async function salvar() {
    if (!empresaId) {
      alert("Empresa não encontrada.");
      return;
    }

    if (!form.nome.trim() || !form.telefone.trim()) {
      alert("Preencha nome e telefone.");
      return;
    }

    setSalvando(true);

    const payload = {
      nome: form.nome.trim(),
      telefone: form.telefone.trim(),
      email: form.email.trim() || null,
      data_nascimento: form.dataNascimento || null,
      cep: form.cep.replace(/\D/g, "") || null,
      endereco: form.endereco.trim() || null,
      numero: form.numero.trim() || null,
      complemento: form.complemento.trim() || null,
      bairro: form.bairro.trim() || null,
      cidade: form.cidade.trim() || null,
      estado: form.estado.trim().toUpperCase() || null,
      empresa_id: empresaId,
    };

    const { error } = clienteEditando?.id
      ? await supabase
          .from("clientes")
          .update(payload)
          .eq("id", clienteEditando.id)
          .eq("empresa_id", empresaId)
      : await supabase.from("clientes").insert(payload);

    if (error) {
      setSalvando(false);
      alert("Erro ao salvar cliente: " + error.message);
      return;
    }

    if (clienteEditando?.id) {
      const precosOk = await salvarPrecosEspeciaisCliente(false);
      if (!precosOk) {
        setSalvando(false);
        return;
      }
    }

    setSalvando(false);
    fecharModal();
    carregarClientes();
  }

  async function remover(id: string) {
    if (!confirm("Deseja excluir este cliente?")) return;

    const { error } = await supabase
      .from("clientes")
      .delete()
      .eq("id", id)
      .eq("empresa_id", empresaId);

    if (error) {
      alert("Erro ao excluir cliente: " + error.message);
      return;
    }

    carregarClientes();
  }

  const aniversariantesMes = useMemo(() => {
    const mesAtual = new Date().getMonth() + 1;

    return clientes.filter((cliente) => {
      if (!cliente.data_nascimento) return false;
      const data = new Date(`${cliente.data_nascimento}T00:00:00`);
      return data.getMonth() + 1 === mesAtual;
    });
  }, [clientes]);

  const clientesFiltrados = useMemo(() => {
    const termo = busca.toLowerCase();

    return clientes.filter((cliente) =>
      `${cliente.nome} ${cliente.telefone} ${cliente.email || ""} ${formatarDataNascimento(
        cliente.data_nascimento
      )} ${cliente.cep || ""} ${cliente.endereco || ""} ${cliente.bairro || ""} ${
        cliente.cidade || ""
      } ${cliente.estado || ""}`
        .toLowerCase()
        .includes(termo)
    );
  }, [clientes, busca]);

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
          <h1 className="text-3xl font-bold text-slate-900">Clientes</h1>
          <p className="text-slate-500">
            Cadastre e gerencie os clientes do estabelecimento.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={carregarClientes}
            className="border px-4 py-2 rounded-xl font-bold bg-white"
          >
            Atualizar
          </button>

          <button
            onClick={abrirNovoCliente}
            style={{ backgroundColor: "var(--cor-primaria, #4b2f3f)" }}
            className="text-white px-4 py-2 rounded-xl font-bold shadow-sm"
          >
            + Novo cliente
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card title="Total de clientes" value={clientes.length} />
        <Card title="Com telefone" value={clientes.filter((c) => !!c.telefone).length} />
        <Card title="Com e-mail" value={clientes.filter((c) => !!c.email).length} />
        <Card title="Aniversariantes do mês" value={aniversariantesMes.length} />
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="p-5 border-b flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-bold text-slate-900">Clientes cadastrados</h2>
            <p className="text-sm text-slate-500">
              {clientesFiltrados.length} cliente(s) encontrado(s).
            </p>
          </div>

          <input
            placeholder="Buscar por nome, telefone, e-mail, endereço ou nascimento..."
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
                  <th className="p-4">Cliente</th>
                  <th>Telefone</th>
                  <th>E-mail</th>
                  <th>Nascimento</th>
                  <th>Endereço</th>
                  <th>Anamnese</th>
                  <th className="text-right pr-4">Ações</th>
                </tr>
              </thead>

              <tbody>
                {clientesFiltrados.map((cliente) => (
                  <tr key={cliente.id} className="border-t hover:bg-slate-50">
                    <td className="p-4 font-bold text-slate-900">{cliente.nome}</td>
                    <td>{cliente.telefone || "-"}</td>
                    <td>{cliente.email || "-"}</td>
                    <td>{formatarDataNascimento(cliente.data_nascimento)}</td>
                    <td>{formatarEndereco(cliente)}</td>
                    <td>
                      {anamnesePorCliente[cliente.id]?.preenchida ? (
                        <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
                          Preenchida
                        </span>
                      ) : (
                        <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700">
                          Pendente
                        </span>
                      )}
                    </td>
                    <td className="text-right pr-4 whitespace-nowrap space-x-2">
                      <button
                        onClick={() => abrirEdicao(cliente)}
                        className="bg-blue-50 text-blue-700 px-3 py-2 rounded-xl text-xs font-bold"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => remover(cliente.id)}
                        className="bg-red-50 text-red-600 px-3 py-2 rounded-xl text-xs font-bold"
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}

                {clientesFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-10 text-center text-slate-500">
                      Nenhum cliente encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-5 rounded-t-3xl flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  {clienteEditando ? "Editar cliente" : "Novo cliente"}
                </h2>
                <p className="text-sm text-slate-500">
                  Dados pessoais, contato e endereço do cliente.
                </p>
              </div>

              <button
                onClick={fecharModal}
                className="border rounded-xl px-4 py-2 font-bold bg-white"
              >
                Fechar
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h3 className="font-bold text-slate-900 mb-3">Dados do cliente</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <input
                    placeholder="Nome"
                    value={form.nome}
                    onChange={(e) => atualizarCampo("nome", e.target.value)}
                    className="border rounded-xl px-4 py-3 md:col-span-2"
                  />

                  <input
                    placeholder="Telefone / WhatsApp"
                    value={form.telefone}
                    onChange={(e) => atualizarCampo("telefone", e.target.value)}
                    className="border rounded-xl px-4 py-3"
                  />

                  <input
                    type="date"
                    value={form.dataNascimento}
                    onChange={(e) => atualizarCampo("dataNascimento", e.target.value)}
                    className="border rounded-xl px-4 py-3"
                    title="Data de nascimento"
                  />

                  <input
                    placeholder="E-mail"
                    value={form.email}
                    onChange={(e) => atualizarCampo("email", e.target.value)}
                    className="border rounded-xl px-4 py-3 md:col-span-4"
                  />
                </div>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 mb-3">Endereço</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <input
                    placeholder="CEP"
                    value={form.cep}
                    onChange={(e) => {
                      const valor = e.target.value;
                      atualizarCampo("cep", valor);
                      if (valor.replace(/\D/g, "").length === 8) buscarCepAutomatico(valor);
                    }}
                    onBlur={() => buscarCepAutomatico()}
                    className="border rounded-xl px-4 py-3"
                  />

                  <input
                    placeholder="Endereço"
                    value={form.endereco}
                    onChange={(e) => atualizarCampo("endereco", e.target.value)}
                    className="border rounded-xl px-4 py-3 md:col-span-2"
                  />

                  <input
                    placeholder="Número"
                    value={form.numero}
                    onChange={(e) => atualizarCampo("numero", e.target.value)}
                    className="border rounded-xl px-4 py-3"
                  />

                  <input
                    placeholder="Complemento"
                    value={form.complemento}
                    onChange={(e) => atualizarCampo("complemento", e.target.value)}
                    className="border rounded-xl px-4 py-3"
                  />

                  <input
                    placeholder="Bairro"
                    value={form.bairro}
                    onChange={(e) => atualizarCampo("bairro", e.target.value)}
                    className="border rounded-xl px-4 py-3"
                  />

                  <input
                    placeholder="Cidade"
                    value={form.cidade}
                    onChange={(e) => atualizarCampo("cidade", e.target.value)}
                    className="border rounded-xl px-4 py-3"
                  />

                  <input
                    placeholder="UF"
                    value={form.estado}
                    onChange={(e) => atualizarCampo("estado", e.target.value.toUpperCase())}
                    maxLength={2}
                    className="border rounded-xl px-4 py-3"
                  />
                </div>
              </div>


              {clienteEditando && (
                <div className="border-t pt-6">
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                    <div>
                      <h3 className="font-bold text-slate-900">Preços especiais por serviço</h3>
                      <p className="text-sm text-slate-500">
                        Preencha somente os serviços que este cliente paga com valor diferenciado.
                        Se deixar vazio, o sistema usa o valor normal do serviço.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => salvarPrecosEspeciaisCliente()}
                      disabled={salvandoPrecoEspecial}
                      className="rounded-xl px-4 py-2 font-bold text-white disabled:opacity-60"
                      style={{ backgroundColor: "var(--cor-primaria, #4b2f3f)" }}
                    >
                      {salvandoPrecoEspecial ? "Salvando..." : "Salvar preços VIP"}
                    </button>
                  </div>

                  {servicos.length === 0 ? (
                    <div className="rounded-2xl border bg-slate-50 p-4 text-sm text-slate-500">
                      Nenhum serviço encontrado. Cadastre os serviços antes de definir preços VIP.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {servicos.map((servico) => (
                        <div key={servico.id} className="rounded-2xl border p-4 bg-slate-50">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-bold text-slate-900">{servico.nome}</p>
                              <p className="text-xs text-slate-500">
                                Valor normal: {formatarMoeda(precoPadraoServico(servico))}
                              </p>
                            </div>
                          </div>

                          <input
                            placeholder="Valor VIP deste cliente. Ex: 80,00"
                            value={precosEspeciais[servico.id] || ""}
                            onChange={(e) => atualizarPrecoEspecial(servico.id, e.target.value)}
                            className="mt-3 w-full rounded-xl border px-4 py-3"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {clienteEditando && (
                <div className="border-t pt-6">
                  <h3 className="font-bold text-slate-900 mb-3">Anamnese preenchida</h3>
                  <HistoricoAnamnese
                    clienteId={clienteEditando.id}
                    clienteNome={clienteEditando.nome}
                    telefoneCliente={clienteEditando.telefone}
                  />
                </div>
              )}

              <div className="flex flex-wrap justify-end gap-3 border-t pt-5">
                <button
                  onClick={fecharModal}
                  className="border px-5 py-3 rounded-xl font-bold bg-white"
                >
                  Cancelar
                </button>

                <button
                  onClick={salvar}
                  disabled={salvando || buscandoCep}
                  style={{ backgroundColor: "var(--cor-primaria, #4b2f3f)" }}
                  className="text-white rounded-xl px-5 py-3 font-bold disabled:opacity-60"
                >
                  {salvando
                    ? "Salvando..."
                    : buscandoCep
                    ? "Buscando CEP..."
                    : clienteEditando
                    ? "Salvar alterações"
                    : "Salvar cliente"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatarDataNascimento(data?: string | null) {
  if (!data) return "-";

  const partes = data.split("-");
  if (partes.length !== 3) return data;

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function formatarEndereco(cliente: Cliente) {
  const partes = [
    cliente.endereco,
    cliente.numero,
    cliente.bairro,
    cliente.cidade,
    cliente.estado,
  ].filter(Boolean);

  return partes.length ? partes.join(", ") : "-";
}

function Card({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="bg-white border rounded-2xl p-4 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
    </div>
  );
}
