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

function formularioTemDados(formulario: typeof formularioVazio) {
  return Object.values(formulario).some((valor) => String(valor || "").trim() !== "");
}

function carregarRascunhoCliente(chave: string) {
  if (typeof window === "undefined") return null;

  const salvo = localStorage.getItem(chave);
  if (!salvo) return null;

  try {
    return JSON.parse(salvo) as typeof formularioVazio;
  } catch {
    localStorage.removeItem(chave);
    return null;
  }
}

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
  const [pacotesDoCliente, setPacotesDoCliente] = useState<any[]>([]);
  const [carregandoPacotesDoCliente, setCarregandoPacotesDoCliente] = useState(false);
  const [pacotesDisponiveis, setPacotesDisponiveis] = useState<any[]>([]);
  const [pacoteParaVincularId, setPacoteParaVincularId] = useState("");
  const [vinculandoPacote, setVinculandoPacote] = useState(false);
  const [editandoPacoteClienteId, setEditandoPacoteClienteId] = useState<string | null>(null);
  const [validadePacoteEdicao, setValidadePacoteEdicao] = useState("");
  const [statusPacoteEdicao, setStatusPacoteEdicao] = useState("ativo");
  const [saldosPacoteEdicao, setSaldosPacoteEdicao] = useState<Record<string, string>>({});
  const [salvandoEdicaoPacote, setSalvandoEdicaoPacote] = useState(false);

  const chaveRascunhoNovoCliente = empresaId
    ? `vendlysys:novo-cliente:${empresaId}`
    : "vendlysys:novo-cliente";

  useEffect(() => {
    if (empresaId) {
      carregarClientes();
      carregarServicos();
      carregarPacotesDisponiveis();
    }
  }, [empresaId]);

  useEffect(() => {
    if (!modalAberto || clienteEditando) return;

    if (!formularioTemDados(form)) {
      localStorage.removeItem(chaveRascunhoNovoCliente);
      return;
    }

    localStorage.setItem(chaveRascunhoNovoCliente, JSON.stringify(form));
  }, [form, modalAberto, clienteEditando, chaveRascunhoNovoCliente]);

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

  async function carregarPacotesDisponiveis() {
    if (!empresaId) return;

    const { data, error } = await supabase
      .from("marketing_pacotes")
      .select("id, nome, validade_dias, status, valor_final")
      .eq("empresa_id", empresaId)
      .order("nome", { ascending: true });

    if (error) {
      console.error("Erro ao carregar pacotes disponíveis:", error);
      setPacotesDisponiveis([]);
      return;
    }

    setPacotesDisponiveis((data || []).filter((item: any) => item.status !== "inativo"));
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


  async function carregarPacotesDoCliente(clienteId: string) {
    setCarregandoPacotesDoCliente(true);

    const { data: vinculos, error: erroVinculos } = await supabase
      .from("cliente_pacotes")
      .select("id, cliente_id, pacote_id, data_inicio, data_fim, validade_dias, quantidade_pacotes, status, created_at")
      .eq("cliente_id", clienteId)
      .order("created_at", { ascending: false });

    if (erroVinculos) {
      console.error("Erro ao carregar pacotes do cliente:", erroVinculos);
      setPacotesDoCliente([]);
      setCarregandoPacotesDoCliente(false);
      return;
    }

    const listaVinculos = vinculos || [];

    if (listaVinculos.length === 0) {
      setPacotesDoCliente([]);
      setCarregandoPacotesDoCliente(false);
      return;
    }

    const idsVinculos = listaVinculos.map((item: any) => item.id).filter(Boolean);
    const idsPacotes = Array.from(new Set(listaVinculos.map((item: any) => item.pacote_id).filter(Boolean)));

    const { data: pacotesBanco } = idsPacotes.length
      ? await supabase
          .from("marketing_pacotes")
          .select("id, nome, descricao, valor_final, valor_original, status")
          .in("id", idsPacotes)
      : { data: [] as any[] };

    const { data: saldosBanco } = idsVinculos.length
      ? await supabase
          .from("cliente_pacote_saldos")
          .select("id, cliente_pacote_id, servico_id, quantidade_total, quantidade_usada")
          .in("cliente_pacote_id", idsVinculos)
      : { data: [] as any[] };

    const idsServicos = Array.from(new Set((saldosBanco || []).map((item: any) => item.servico_id).filter(Boolean)));

    const { data: servicosBanco } = idsServicos.length
      ? await supabase.from("servicos").select("id, nome").in("id", idsServicos)
      : { data: [] as any[] };

    const mapaPacotes = new Map((pacotesBanco || []).map((item: any) => [item.id, item]));
    const mapaServicos = new Map((servicosBanco || []).map((item: any) => [item.id, item]));

    const montados = listaVinculos.map((vinculo: any) => {
      const pacote = mapaPacotes.get(vinculo.pacote_id) || null;
      const saldos = (saldosBanco || [])
        .filter((saldo: any) => saldo.cliente_pacote_id === vinculo.id)
        .map((saldo: any) => {
          const total = Number(saldo.quantidade_total || 0);
          const usada = Number(saldo.quantidade_usada || 0);
          return {
            ...saldo,
            servico_nome: mapaServicos.get(saldo.servico_id)?.nome || "Serviço",
            quantidade_total: total,
            quantidade_usada: usada,
            quantidade_restante: Math.max(total - usada, 0),
          };
        });

      const totalSessoes = saldos.reduce((total: number, saldo: any) => total + saldo.quantidade_total, 0);
      const totalUsado = saldos.reduce((total: number, saldo: any) => total + saldo.quantidade_usada, 0);

      return {
        ...vinculo,
        pacote,
        saldos,
        total_sessoes: totalSessoes,
        total_usado: totalUsado,
        total_restante: Math.max(totalSessoes - totalUsado, 0),
      };
    });

    setPacotesDoCliente(montados);
    setCarregandoPacotesDoCliente(false);
  }

  function hojePacoteISO() {
    return new Date().toISOString().slice(0, 10);
  }

  function calcularDataFimPacote(validadeDias?: number | string | null) {
    const dias = Number(validadeDias || 30);
    const data = new Date();
    data.setDate(data.getDate() + (Number.isNaN(dias) ? 30 : dias));
    return data.toISOString().slice(0, 10);
  }

  function iniciarEdicaoPacoteCliente(vinculo: any) {
    setEditandoPacoteClienteId(vinculo.id);
    setValidadePacoteEdicao(vinculo.data_fim || "");
    setStatusPacoteEdicao(vinculo.status || "ativo");

    const mapa: Record<string, string> = {};
    (vinculo.saldos || []).forEach((saldo: any) => {
      mapa[saldo.id] = String(saldo.quantidade_restante ?? 0);
    });

    setSaldosPacoteEdicao(mapa);
  }

  function cancelarEdicaoPacoteCliente() {
    setEditandoPacoteClienteId(null);
    setValidadePacoteEdicao("");
    setStatusPacoteEdicao("ativo");
    setSaldosPacoteEdicao({});
  }

  async function vincularPacoteAoCliente() {
    if (!clienteEditando?.id || !pacoteParaVincularId) {
      alert("Selecione um pacote para vincular.");
      return;
    }

    const pacoteSelecionado = pacotesDisponiveis.find((item) => item.id === pacoteParaVincularId);

    setVinculandoPacote(true);

    const dataInicio = hojePacoteISO();
    const dataFim = calcularDataFimPacote(pacoteSelecionado?.validade_dias);

    const { data: vinculo, error: erroVinculo } = await supabase
      .from("cliente_pacotes")
      .insert({
        cliente_id: clienteEditando.id,
        pacote_id: pacoteParaVincularId,
        data_inicio: dataInicio,
        data_fim: dataFim,
        validade_dias: Number(pacoteSelecionado?.validade_dias || 30),
        quantidade_pacotes: 1,
        status: "ativo",
      })
      .select("id")
      .single();

    if (erroVinculo || !vinculo?.id) {
      setVinculandoPacote(false);
      alert("Erro ao vincular pacote: " + (erroVinculo?.message || "registro não retornado"));
      return;
    }

    const { data: servicosPacote, error: erroServicosPacote } = await supabase
      .from("marketing_pacote_servicos")
      .select("servico_id, quantidade")
      .eq("pacote_id", pacoteParaVincularId);

    if (erroServicosPacote) {
      setVinculandoPacote(false);
      alert("Pacote vinculado, mas erro ao carregar serviços do pacote: " + erroServicosPacote.message);
      await carregarPacotesDoCliente(clienteEditando.id);
      return;
    }

    const saldosPayload = (servicosPacote || [])
      .filter((item: any) => item.servico_id)
      .map((item: any) => ({
        cliente_pacote_id: vinculo.id,
        servico_id: item.servico_id,
        quantidade_total: Number(item.quantidade || 1),
        quantidade_usada: 0,
        empresa_id: empresaId || null,
      }));

    if (saldosPayload.length > 0) {
      const { error: erroSaldos } = await supabase
        .from("cliente_pacote_saldos")
        .insert(saldosPayload);

      if (erroSaldos) {
        setVinculandoPacote(false);
        alert("Pacote vinculado, mas erro ao criar saldos: " + erroSaldos.message);
        await carregarPacotesDoCliente(clienteEditando.id);
        return;
      }
    }

    setPacoteParaVincularId("");
    setVinculandoPacote(false);
    await carregarPacotesDoCliente(clienteEditando.id);
    alert("Pacote vinculado com sucesso.");
  }

  async function salvarEdicaoPacoteCliente(vinculo: any) {
    if (!clienteEditando?.id || !vinculo?.id) return;

    setSalvandoEdicaoPacote(true);

    const { error: erroVinculo } = await supabase
      .from("cliente_pacotes")
      .update({
        data_fim: validadePacoteEdicao || null,
        status: statusPacoteEdicao || "ativo",
      })
      .eq("id", vinculo.id)
      .eq("cliente_id", clienteEditando.id);

    if (erroVinculo) {
      setSalvandoEdicaoPacote(false);
      alert("Erro ao salvar pacote: " + erroVinculo.message);
      return;
    }

    for (const saldo of vinculo.saldos || []) {
      const restanteDesejado = Number(saldosPacoteEdicao[saldo.id] ?? saldo.quantidade_restante ?? 0);

      if (Number.isNaN(restanteDesejado) || restanteDesejado < 0) {
        setSalvandoEdicaoPacote(false);
        alert(`Saldo inválido para ${saldo.servico_nome}.`);
        return;
      }

      const usadoAtual = Number(saldo.quantidade_usada || 0);
      let novoTotal = usadoAtual + restanteDesejado;

      if (novoTotal < usadoAtual) novoTotal = usadoAtual;

      const { error: erroSaldo } = await supabase
        .from("cliente_pacote_saldos")
        .update({ quantidade_total: novoTotal })
        .eq("id", saldo.id);

      if (erroSaldo) {
        setSalvandoEdicaoPacote(false);
        alert("Erro ao salvar saldo: " + erroSaldo.message);
        return;
      }
    }

    setSalvandoEdicaoPacote(false);
    cancelarEdicaoPacoteCliente();
    await carregarPacotesDoCliente(clienteEditando.id);
    alert("Pacote atualizado com sucesso.");
  }

  async function removerPacoteDoCliente(vinculo: any) {
    if (!clienteEditando?.id || !vinculo?.id) return;

    const confirmar = confirm(
      `Deseja remover o pacote ${vinculo.pacote?.nome || "selecionado"} desta cliente?`,
    );

    if (!confirmar) return;

    const { error: erroSaldos } = await supabase
      .from("cliente_pacote_saldos")
      .delete()
      .eq("cliente_pacote_id", vinculo.id);

    if (erroSaldos) {
      alert("Erro ao remover saldos do pacote: " + erroSaldos.message);
      return;
    }

    const { error: erroVinculo } = await supabase
      .from("cliente_pacotes")
      .delete()
      .eq("id", vinculo.id)
      .eq("cliente_id", clienteEditando.id);

    if (erroVinculo) {
      alert("Erro ao remover pacote: " + erroVinculo.message);
      return;
    }

    cancelarEdicaoPacoteCliente();
    await carregarPacotesDoCliente(clienteEditando.id);
    alert("Pacote removido da cliente.");
  }

  function formatarDataPacote(data?: string | null) {
    if (!data) return "-";
    const partes = data.split("-");
    if (partes.length !== 3) return data;
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
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
    const rascunhoSalvo = carregarRascunhoCliente(chaveRascunhoNovoCliente);

    setClienteEditando(null);
    setForm(rascunhoSalvo || formularioVazio);
    setPrecosEspeciais({});
    setPacotesDoCliente([]);
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
    carregarPacotesDoCliente(cliente.id);
  }

  function fecharModal() {
    setModalAberto(false);
    setClienteEditando(null);
    setForm(formularioVazio);
    setPrecosEspeciais({});
    setPacotesDoCliente([]);
    setPacoteParaVincularId("");
    cancelarEdicaoPacoteCliente();
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

    if (!clienteEditando?.id) {
      localStorage.removeItem(chaveRascunhoNovoCliente);
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
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-slate-900">Pacotes ativos da cliente</h3>
                      <p className="text-sm text-slate-500">
                        Consulte, edite, remova ou vincule pacotes para esta cliente.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => carregarPacotesDoCliente(clienteEditando.id)}
                      className="rounded-xl border bg-white px-4 py-2 font-bold text-slate-700"
                    >
                      Atualizar pacotes
                    </button>
                  </div>

                  <div className="mb-5 rounded-2xl border bg-slate-50 p-4">
                    <h4 className="mb-3 font-bold text-slate-900">Vincular novo pacote</h4>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
                      <select
                        value={pacoteParaVincularId}
                        onChange={(e) => setPacoteParaVincularId(e.target.value)}
                        className="rounded-xl border bg-white px-4 py-3"
                      >
                        <option value="">Selecione um pacote</option>
                        {pacotesDisponiveis.map((pacote) => (
                          <option key={pacote.id} value={pacote.id}>
                            {pacote.nome} {pacote.valor_final ? `- ${formatarMoeda(pacote.valor_final)}` : ""}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={vincularPacoteAoCliente}
                        disabled={vinculandoPacote || !pacoteParaVincularId}
                        className="rounded-xl px-4 py-3 font-bold text-white disabled:opacity-60"
                        style={{ backgroundColor: "var(--cor-primaria, #4b2f3f)" }}
                      >
                        {vinculandoPacote ? "Vinculando..." : "Vincular pacote"}
                      </button>
                    </div>

                    {pacotesDisponiveis.length === 0 && (
                      <p className="mt-3 text-sm text-amber-700">
                        Nenhum pacote ativo encontrado. Cadastre em Pacotes / Combos antes de vincular.
                      </p>
                    )}
                  </div>

                  {carregandoPacotesDoCliente ? (
                    <div className="rounded-2xl border bg-slate-50 p-4 text-sm text-slate-500">
                      Carregando pacotes da cliente...
                    </div>
                  ) : pacotesDoCliente.length === 0 ? (
                    <div className="rounded-2xl border bg-slate-50 p-4 text-sm text-slate-500">
                      Nenhum pacote vinculado para esta cliente.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {pacotesDoCliente.map((vinculo) => {
                        const percentual = vinculo.total_sessoes
                          ? Math.min((vinculo.total_usado / vinculo.total_sessoes) * 100, 100)
                          : 0;
                        const estaEditando = editandoPacoteClienteId === vinculo.id;

                        return (
                          <div key={vinculo.id} className="rounded-2xl border bg-white p-4 shadow-sm">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <p className="text-lg font-black text-slate-900">
                                  {vinculo.pacote?.nome || "Pacote"}
                                </p>
                                <p className="text-sm text-slate-500">
                                  Validade: {formatarDataPacote(vinculo.data_fim)} • Status: {vinculo.status || "ativo"}
                                </p>
                              </div>

                              <div className="rounded-full bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-700 ring-1 ring-emerald-200">
                                {vinculo.total_restante} restantes
                              </div>
                            </div>

                            <div className="mt-4">
                              <div className="mb-2 flex justify-between text-sm font-bold text-slate-700">
                                <span>Uso total</span>
                                <span>{vinculo.total_usado}/{vinculo.total_sessoes}</span>
                              </div>
                              <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${percentual}%`,
                                    background: "linear-gradient(90deg,#282663,#5b5bd6)",
                                  }}
                                />
                              </div>
                            </div>

                            {estaEditando && (
                              <div className="mt-4 grid grid-cols-1 gap-3 rounded-2xl border bg-violet-50 p-4 md:grid-cols-2">
                                <div>
                                  <label className="text-sm font-bold text-slate-700">Validade</label>
                                  <input
                                    type="date"
                                    value={validadePacoteEdicao}
                                    onChange={(e) => setValidadePacoteEdicao(e.target.value)}
                                    className="mt-1 w-full rounded-xl border px-4 py-3"
                                  />
                                </div>

                                <div>
                                  <label className="text-sm font-bold text-slate-700">Status</label>
                                  <select
                                    value={statusPacoteEdicao}
                                    onChange={(e) => setStatusPacoteEdicao(e.target.value)}
                                    className="mt-1 w-full rounded-xl border px-4 py-3"
                                  >
                                    <option value="ativo">Ativo</option>
                                    <option value="inativo">Inativo</option>
                                    <option value="cancelado">Cancelado</option>
                                    <option value="vencido">Vencido</option>
                                  </select>
                                </div>
                              </div>
                            )}

                            {vinculo.saldos.length > 0 && (
                              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                                {vinculo.saldos.map((saldo: any) => (
                                  <div key={saldo.id} className="rounded-xl border bg-slate-50 p-3">
                                    <p className="font-bold text-slate-900">{saldo.servico_nome}</p>

                                    {!estaEditando ? (
                                      <p className="text-sm text-slate-500">
                                        Restam {saldo.quantidade_restante} de {saldo.quantidade_total}
                                      </p>
                                    ) : (
                                      <div className="mt-2">
                                        <label className="text-xs font-bold text-slate-600">
                                          Restantes
                                        </label>
                                        <input
                                          type="number"
                                          min="0"
                                          value={saldosPacoteEdicao[saldo.id] ?? ""}
                                          onChange={(e) =>
                                            setSaldosPacoteEdicao((atual) => ({
                                              ...atual,
                                              [saldo.id]: e.target.value,
                                            }))
                                          }
                                          className="mt-1 w-full rounded-xl border bg-white px-4 py-3"
                                        />
                                        <p className="mt-1 text-xs text-slate-500">
                                          Usadas: {saldo.quantidade_usada}. O total será ajustado automaticamente.
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            <div className="mt-4 flex flex-wrap gap-2">
                              {!estaEditando ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => iniciarEdicaoPacoteCliente(vinculo)}
                                    className="rounded-xl bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700"
                                  >
                                    Editar pacote
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => removerPacoteDoCliente(vinculo)}
                                    className="rounded-xl bg-red-50 px-4 py-2 text-sm font-bold text-red-700"
                                  >
                                    Remover pacote
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => salvarEdicaoPacoteCliente(vinculo)}
                                    disabled={salvandoEdicaoPacote}
                                    className="rounded-xl px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                                    style={{ backgroundColor: "var(--cor-primaria, #4b2f3f)" }}
                                  >
                                    {salvandoEdicaoPacote ? "Salvando..." : "Salvar pacote"}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={cancelarEdicaoPacoteCliente}
                                    className="rounded-xl border bg-white px-4 py-2 text-sm font-bold text-slate-700"
                                  >
                                    Cancelar
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
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
