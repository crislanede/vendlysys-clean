import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

import AssinaturaCanvas from "../components/AssinaturaCanvas";
import PageHeader from "../components/ui/PageHeader";
import SectionCard from "../components/ui/SectionCard";
import PrimaryButton from "../components/ui/PrimaryButton";
import SecondaryButton from "../components/ui/SecondaryButton";
import StatusBadge from "../components/ui/StatusBadge";

import { gerarHash } from "../lib/hash";
import { gerarPdfBlob } from "../lib/pdfAnamnese";
import { uploadPdfAnamnese } from "../lib/uploadAnamnese";
import {
  abrirWhatsapp,
  montarMensagemPdfAnamnese,
} from "../lib/whatsapp";

type Agendamento = {
  id: string;
  cliente: string;
  cliente_id?: string | null;
  telefone?: string | null;
  servico: string;
  servico_id?: string | null;
  profissional: string;
  profissional_id?: string | null;
  data: string;
  horario: string;
  status: string;
  token?: string | null;
  token_cliente?: string | null;
  empresa_id?: string | null;
  observacoes?: string | null;
  duracao_minutos?: number | null;
  duracao?: number | null;
  valor?: number | null;
  preco?: number | null;
  preco_servico?: number | null;
};

type Cliente = {
  id: string;
  nome: string;
  telefone?: string | null;
  email?: string | null;
  cpf?: string | null;
  data_nascimento?: string | null;
  sexo?: string | null;
  tipo_pele?: string | null;
  alergias?: string | null;
  origem?: string | null;
  preferencias?: string | null;
  observacoes?: string | null;
};

type ConfiguracaoEmpresa = {
  id?: string | null;
  empresa_id?: string | null;
  nome_empresa?: string | null;
  nome_fantasia?: string | null;
  telefone?: string | null;
  endereco?: string | null;
  logo_url?: string | null;
  logo?: string | null;
};

type ModeloAnamnese = {
  id: string;
  empresa_id?: string | null;
  titulo?: string | null;
  descricao?: string | null;
  termo_responsabilidade?: string | null;
  obrigatoria?: boolean | null;
  ativo?: boolean | null;
};

type CampoAnamnese = {
  id: string;
  modelo_id?: string | null;
  nome_campo?: string | null;
  label?: string | null;
  tipo?: string | null;
  obrigatorio?: boolean | null;
  placeholder?: string | null;
  ajuda?: string | null;
  opcoes?: string[] | string | null;
  ordem?: number | null;
  ativo?: boolean | null;
  gera_alerta?: boolean | null;

  // compatibilidade com versões antigas
  pergunta?: string | null;
  titulo?: string | null;
  nome?: string | null;
};

type Servico = {
  id: string;
  nome: string;
  preco?: number | null;
  valor?: number | null;
  duracao_padrao_minutos?: number | null;
  duracao?: number | null;
  ativo?: boolean | null;
};

type Profissional = {
  id: string;
  nome: string;
  ativo?: boolean | null;
  hora_inicio?: string | null;
  hora_fim?: string | null;
  inicio_almoco?: string | null;
  fim_almoco?: string | null;
  intervalo_entre_atendimentos?: number | null;
  intervalo?: number | null;
};

type BloqueioAgenda = {
  id: string;
  data?: string | null;
  profissional_id?: string | null;
  profissional?: string | null;
  hora_inicio?: string | null;
  hora_fim?: string | null;
  inicio?: string | null;
  fim?: string | null;
  horario_inicio?: string | null;
  horario_fim?: string | null;
  ativo?: boolean | null;
};

type AnamneseCliente = {
  id: string;
  cliente_id?: string | null;
  cliente_nome?: string | null;
  preenchido_em?: string | null;
  assinado_em?: string | null;
  pdf_url?: string | null;
  respostas_json?: Record<string, string | undefined | null> | null;
  criado_em?: string | null;
  created_at?: string | null;
};

type ClientePacoteSaldo = {
  id: string;

  // Quando vem da tabela cliente_pacote_saldos
  cliente_pacote_id?: string | null;
  servico_id?: string | null;
  quantidade_total?: number | null;
  quantidade_usada?: number | null;

  // Dados enriquecidos do pacote do cliente
  cliente_id?: string | null;
  pacote_id?: string | null;
  data_inicio?: string | null;
  data_fim?: string | null;
  valor_pago?: number | null;
  status?: string | null;
  observacoes?: string | null;

  // Dados enriquecidos do pacote comercial
  pacote_nome?: string | null;
  pacote_descricao?: string | null;
  pacote_valor?: number | null;
  validade_dias?: number | null;

  // Dados enriquecidos do serviço
  servico?: string | null;
  servico_nome?: string | null;

  // Compatibilidade com versões antigas
  cliente_nome?: string | null;
  nome_cliente?: string | null;
  cliente?: string | null;
  nome_pacote?: string | null;
  nome?: string | null;
  quantidade_restante?: number | null;
  saldo_total?: number | null;
  saldo_usado?: number | null;
  saldo_restante?: number | null;
  saldo?: number | null;
  total?: number | null;
  usado?: number | null;
  validade_inicio?: string | null;
  validade_fim?: string | null;
  data_compra?: string | null;
  data_validade?: string | null;
  inicio?: string | null;
  fim?: string | null;
  marketing_pacotes?: {
    id?: string | null;
    nome?: string | null;
    valor?: number | null;
    validade_dias?: number | null;
  } | null;
};

type Aba = "agendamento" | "anamnese" | "dados" | "combos" | "novo";

export default function MeuEspaco() {
  const [aba, setAba] = useState<Aba>("agendamento");

  const [agendamento, setAgendamento] = useState<Agendamento | null>(null);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [empresa, setEmpresa] = useState<ConfiguracaoEmpresa | null>(null);
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(true);

  const [modeloAnamnese, setModeloAnamnese] = useState<ModeloAnamnese | null>(null);
  const [camposAnamnese, setCamposAnamnese] = useState<CampoAnamnese[]>([]);
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [assinatura, setAssinatura] = useState<string | null>(null);
  const [aceiteTermo, setAceiteTermo] = useState(false);
  const [salvandoAnamnese, setSalvandoAnamnese] = useState(false);
  const [pdfUrlGerado, setPdfUrlGerado] = useState("");
  const [anamneseSalva, setAnamneseSalva] = useState<AnamneseCliente | null>(null);
  const [historicoAgendamentos, setHistoricoAgendamentos] = useState<Agendamento[]>([]);
  const [pacotesAtivos, setPacotesAtivos] = useState<ClientePacoteSaldo[]>([]);
  const [telefoneCliente, setTelefoneCliente] = useState("");

  const [formCliente, setFormCliente] = useState({
    nome: "",
    telefone: "",
    email: "",
    cpf: "",
    data_nascimento: "",
    sexo: "Não informado",
    alergias: "",
    preferencias: "",
    observacoes: "",
  });
  const [salvandoDados, setSalvandoDados] = useState(false);

  const [servicos, setServicos] = useState<Servico[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [novoServicoId, setNovoServicoId] = useState("");
  const [novoProfissionalId, setNovoProfissionalId] = useState("");
  const [novaData, setNovaData] = useState("");
  const [novoHorario, setNovoHorario] = useState("");
  const [novaObservacao, setNovaObservacao] = useState("");
  const [salvandoNovoAgendamento, setSalvandoNovoAgendamento] = useState(false);
  const [horariosDisponiveis, setHorariosDisponiveis] = useState<string[]>([]);
  const [loadingHorarios, setLoadingHorarios] = useState(false);
  const [mensagemHorarios, setMensagemHorarios] = useState("");

  useEffect(() => {
    void carregarDados();
  }, []);

  useEffect(() => {
    setNovoHorario("");
    void carregarHorariosDisponiveis();
  }, [novoServicoId, novoProfissionalId, novaData]);

  async function carregarDados() {
    setLoading(true);
    setErro("");

    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (!token) {
      setErro("Link inválido. O token do agendamento não foi informado.");
      setLoading(false);
      return;
    }

    const agendamentoEncontrado = await buscarAgendamentoPorToken(token);

    if (!agendamentoEncontrado) {
      setErro("Não encontramos este agendamento. Verifique se o link está correto.");
      setLoading(false);
      return;
    }

    const agendamentoPrincipal =
      !agendamentoEstaAtivo(agendamentoEncontrado) || !agendamentoFuturoOuHoje(agendamentoEncontrado)
        ? await buscarProximoAgendamentoDoCliente(agendamentoEncontrado)
        : agendamentoEncontrado;

    setAgendamento(agendamentoPrincipal);

    const empresaEncontrada = await carregarEmpresa(agendamentoPrincipal.empresa_id || agendamentoEncontrado.empresa_id || null);

    await Promise.all([
      carregarCliente(agendamentoPrincipal),
      carregarCamposAnamnese(empresaEncontrada?.empresa_id || agendamentoPrincipal.empresa_id || agendamentoEncontrado.empresa_id || null),
      carregarServicosEProfissionais(),
      carregarHistoricoCliente(agendamentoPrincipal),
      carregarAnamneseCliente(agendamentoPrincipal),
      carregarPacotesCliente(agendamentoPrincipal),
    ]);

    setLoading(false);
  }

  async function buscarAgendamentoPorToken(token: string) {
    const { data: porTokenCliente, error: erroTokenCliente } = await supabase
      .from("agendamentos")
      .select("*")
      .eq("token_cliente", token)
      .maybeSingle();

    if (!erroTokenCliente && porTokenCliente) {
      return porTokenCliente as Agendamento;
    }

    const { data: porToken, error: erroToken } = await supabase
      .from("agendamentos")
      .select("*")
      .eq("token", token)
      .maybeSingle();

    if (!erroToken && porToken) {
      return porToken as Agendamento;
    }

    console.warn("Erro ao buscar agendamento por token:", erroTokenCliente || erroToken);
    return null;
  }


  function hojeISO() {
    return new Date().toISOString().slice(0, 10);
  }

  function agendamentoEstaAtivo(ag: Agendamento) {
    const status = normalizarStatusAgendamento(ag.status);
    return status !== "cancelado" && status !== "finalizado";
  }

  function agendamentoFuturoOuHoje(ag: Agendamento) {
    return (ag.data || "") >= hojeISO();
  }

  async function buscarProximoAgendamentoDoCliente(agBase: Agendamento) {
    const nomeReferencia = textoNormalizado(agBase.cliente);
    const clienteIds = new Set<string>();

    if (agBase.cliente_id) {
      clienteIds.add(agBase.cliente_id);
    }

    const { data: clientesEncontrados, error: erroClientes } = await supabase
      .from("clientes")
      .select("id, nome")
      .limit(500);

    if (!erroClientes) {
      ((clientesEncontrados || []) as Array<{ id: string; nome?: string | null }>).forEach((cliente) => {
        const nomeCliente = textoNormalizado(cliente.nome || "");

        if (!nomeCliente || !nomeReferencia) return;

        if (
          nomeCliente === nomeReferencia ||
          nomeCliente.includes(nomeReferencia) ||
          nomeReferencia.includes(nomeCliente)
        ) {
          clienteIds.add(cliente.id);
        }
      });
    }

    const { data, error } = await supabase
      .from("agendamentos")
      .select("*")
      .gte("data", hojeISO())
      .order("data", { ascending: true })
      .order("horario", { ascending: true })
      .limit(200);

    if (error) {
      console.warn("Erro ao buscar próximo agendamento ativo:", error);
      return agBase;
    }

    const candidatos = ((data || []) as Agendamento[]).filter((item) => {
      if (!agendamentoEstaAtivo(item) || !agendamentoFuturoOuHoje(item)) {
        return false;
      }

      if (item.cliente_id && clienteIds.has(item.cliente_id)) {
        return true;
      }

      const nomeItem = textoNormalizado(item.cliente);

      return (
        nomeItem === nomeReferencia ||
        nomeItem.includes(nomeReferencia) ||
        nomeReferencia.includes(nomeItem)
      );
    });

    console.log("PRÓXIMO AGENDAMENTO ATIVO LOCALIZADO:", {
      agendamentoToken: agBase,
      clienteIds: Array.from(clienteIds),
      candidatos,
    });

    return candidatos[0] || agBase;
  }

  async function carregarEmpresa(empresaId: string | null) {
    async function buscarConfiguracaoPorEmpresaId() {
      if (!empresaId) return null;

      const { data, error } = await supabase
        .from("configuracoes")
        .select("*")
        .or(`empresa_id.eq.${empresaId},id.eq.${empresaId}`)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.warn("Erro ao carregar empresa por empresa_id:", error);
        return null;
      }

      return data as ConfiguracaoEmpresa | null;
    }

    async function buscarConfiguracaoPadrao() {
      const { data, error } = await supabase
        .from("configuracoes")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (error) {
        console.warn("Erro ao carregar configuração padrão:", error);
        return null;
      }

      return data as ConfiguracaoEmpresa | null;
    }

    const configuracao =
      (await buscarConfiguracaoPorEmpresaId()) ||
      (await buscarConfiguracaoPadrao());

    setEmpresa(configuracao || null);
    return configuracao || null;
  }

  async function carregarCliente(ag: Agendamento) {
    if (!ag.cliente_id) {
      setTelefoneCliente(ag.telefone || "");
      setFormCliente((atual) => ({
        ...atual,
        nome: ag.cliente || "",
        telefone: ag.telefone || "",
      }));
      return;
    }

    const { data, error } = await supabase
      .from("clientes")
      .select("*")
      .eq("id", ag.cliente_id)
      .maybeSingle();

    if (error) {
      console.warn("Erro ao carregar cliente:", error);
      return;
    }

    const clienteEncontrado = data as Cliente | null;
    setCliente(clienteEncontrado);
    setTelefoneCliente(clienteEncontrado?.telefone || ag.telefone || "");

    setFormCliente({
      nome: clienteEncontrado?.nome || ag.cliente || "",
      telefone: clienteEncontrado?.telefone || ag.telefone || "",
      email: clienteEncontrado?.email || "",
      cpf: clienteEncontrado?.cpf || "",
      data_nascimento: clienteEncontrado?.data_nascimento || "",
      sexo: clienteEncontrado?.sexo || "Não informado",
      alergias: clienteEncontrado?.alergias || "",
      preferencias: clienteEncontrado?.preferencias || "",
      observacoes: clienteEncontrado?.observacoes || "",
    });
  }


  async function carregarHistoricoCliente(ag: Agendamento) {
    let query = supabase
      .from("agendamentos")
      .select("*")
      .order("data", { ascending: false })
      .order("horario", { ascending: false })
      .limit(20);

    if (ag.cliente_id) {
      query = query.eq("cliente_id", ag.cliente_id);
    } else {
      query = query.eq("cliente", ag.cliente);
    }

    const { data, error } = await query;

    if (error) {
      console.warn("Erro ao carregar histórico de agendamentos:", error);
      setHistoricoAgendamentos([]);
      return;
    }

    setHistoricoAgendamentos((data || []) as Agendamento[]);
  }

  async function carregarAnamneseCliente(ag: Agendamento) {
    if (!ag.cliente_id && !ag.cliente) return;

    let query = supabase
      .from("anamneses_clientes")
      .select("*")
      .order("preenchido_em", { ascending: false })
      .limit(1);

    if (ag.cliente_id) {
      query = query.eq("cliente_id", ag.cliente_id);
    } else {
      query = query.eq("cliente_nome", ag.cliente);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      console.warn("Erro ao carregar anamnese do cliente:", error);
      setAnamneseSalva(null);
      setPdfUrlGerado("");
      return;
    }

    const anamnese = data as AnamneseCliente | null;

    setAnamneseSalva(anamnese);
    setPdfUrlGerado(anamnese?.pdf_url || "");

    if (anamnese?.respostas_json) {
      const respostasCarregadas: Record<string, string> = {};

      for (const [pergunta, resposta] of Object.entries(anamnese.respostas_json)) {
        respostasCarregadas[pergunta] = String(resposta || "");
      }
    }
  }

  
  async function carregarPacotesCliente(ag: Agendamento) {
    const hoje = hojeISO();

    async function localizarPossiveisClientes() {
      const ids = new Set<string>();

      if (ag.cliente_id) {
        ids.add(ag.cliente_id);
      }

      const nomeReferencia = textoNormalizado(formCliente.nome || ag.cliente);

      const { data, error } = await supabase
        .from("clientes")
        .select("id, nome")
        .limit(500);

      if (error) {
        console.warn("Erro ao buscar clientes para localizar combo:", error);
        return Array.from(ids);
      }

      ((data || []) as Array<{ id: string; nome?: string | null }>).forEach((cliente) => {
        const nomeCliente = textoNormalizado(cliente.nome || "");

        if (!nomeCliente || !nomeReferencia) return;

        const nomesIguais = nomeCliente === nomeReferencia;
        const nomeContem = nomeCliente.includes(nomeReferencia) || nomeReferencia.includes(nomeCliente);

        if (nomesIguais || nomeContem) {
          ids.add(cliente.id);
        }
      });

      return Array.from(ids);
    }

    const clienteIds = await localizarPossiveisClientes();

    if (clienteIds.length === 0) {
      console.log("NENHUM CLIENTE ENCONTRADO PARA BUSCAR COMBO:", {
        cliente_id: ag.cliente_id,
        cliente: ag.cliente,
        formCliente,
      });
      setPacotesAtivos([]);
      return;
    }

    const { data: clientePacotesData, error: erroClientePacotes } = await supabase
      .from("cliente_pacotes")
      .select("*")
      .in("cliente_id", clienteIds);

    if (erroClientePacotes) {
      console.warn("Erro ao carregar cliente_pacotes:", erroClientePacotes);
      setPacotesAtivos([]);
      return;
    }

    const clientePacotes = (clientePacotesData || []) as any[];

    const pacotesAtivosDoCliente = clientePacotes.filter((pacote) => {
      const status = (pacote.status || "ativo").toLowerCase();
      const validade = pacote.data_fim || "";

      if (status === "cancelado" || status === "expirado" || status === "inativo") return false;
      if (validade && validade < hoje) return false;

      return true;
    });

    if (pacotesAtivosDoCliente.length === 0) {
      console.log("CLIENTE SEM PACOTES ATIVOS:", {
        cliente_id_do_agendamento: ag.cliente_id,
        cliente_nome: ag.cliente,
        clienteIdsLocalizados: clienteIds,
        clientePacotes,
      });
      setPacotesAtivos([]);
      return;
    }

    const clientePacoteIds = pacotesAtivosDoCliente.map((pacote) => pacote.id);
    const pacoteIds = Array.from(
      new Set(pacotesAtivosDoCliente.map((pacote) => pacote.pacote_id).filter(Boolean))
    );

    const { data: saldosData, error: erroSaldos } = await supabase
      .from("cliente_pacote_saldos")
      .select("*")
      .in("cliente_pacote_id", clientePacoteIds);

    if (erroSaldos) {
      console.warn("Erro ao carregar cliente_pacote_saldos:", erroSaldos);
      setPacotesAtivos([]);
      return;
    }

    const { data: marketingPacotesData, error: erroMarketingPacotes } = await supabase
      .from("marketing_pacotes")
      .select("*")
      .in("id", pacoteIds as string[]);

    if (erroMarketingPacotes) {
      console.warn("Erro ao carregar marketing_pacotes:", erroMarketingPacotes);
    }

    const servicoIds = Array.from(
      new Set(((saldosData || []) as any[]).map((item) => item.servico_id).filter(Boolean))
    );

    let servicosDoPacote: any[] = [];

    if (servicoIds.length > 0) {
      const { data: servicosData, error: erroServicos } = await supabase
        .from("servicos")
        .select("id, nome")
        .in("id", servicoIds as string[]);

      if (erroServicos) {
        console.warn("Erro ao carregar nomes dos serviços dos pacotes:", erroServicos);
      } else {
        servicosDoPacote = servicosData || [];
      }
    }

    const mapaClientePacotes = new Map<string, any>();
    pacotesAtivosDoCliente.forEach((pacote) => mapaClientePacotes.set(pacote.id, pacote));

    const mapaMarketingPacotes = new Map<string, any>();
    (marketingPacotesData || []).forEach((pacote: any) => mapaMarketingPacotes.set(pacote.id, pacote));

    const mapaServicos = new Map<string, any>();
    servicosDoPacote.forEach((servico: any) => mapaServicos.set(servico.id, servico));

    const saldos = ((saldosData || []) as any[])
      .map((saldo) => {
        const clientePacote = mapaClientePacotes.get(saldo.cliente_pacote_id);
        const pacoteComercial = clientePacote?.pacote_id
          ? mapaMarketingPacotes.get(clientePacote.pacote_id)
          : null;
        const servico = saldo.servico_id ? mapaServicos.get(saldo.servico_id) : null;

        const quantidadeTotal = Number(saldo.quantidade_total || 0);
        const quantidadeUsada = Number(saldo.quantidade_usada || 0);
        const restante = quantidadeTotal - quantidadeUsada;

        return {
          id: saldo.id,
          cliente_pacote_id: saldo.cliente_pacote_id,
          servico_id: saldo.servico_id,
          quantidade_total: quantidadeTotal,
          quantidade_usada: quantidadeUsada,
          quantidade_restante: Math.max(0, restante),

          cliente_id: clientePacote?.cliente_id || ag.cliente_id,
          pacote_id: clientePacote?.pacote_id || null,
          data_inicio: clientePacote?.data_inicio || null,
          data_fim: clientePacote?.data_fim || null,
          valor_pago: clientePacote?.valor_pago || null,
          status: clientePacote?.status || "ativo",
          observacoes: clientePacote?.observacoes || null,

          pacote_nome: pacoteComercial?.nome || "Pacote ativo",
          pacote_descricao: pacoteComercial?.descricao || null,
          pacote_valor: pacoteComercial?.valor || null,
          validade_dias: pacoteComercial?.validade_dias || null,

          servico: servico?.nome || null,
          servico_nome: servico?.nome || null,
          marketing_pacotes: pacoteComercial
            ? {
                id: pacoteComercial.id,
                nome: pacoteComercial.nome,
                valor: pacoteComercial.valor,
                validade_dias: pacoteComercial.validade_dias,
              }
            : null,
        } as ClientePacoteSaldo;
      })
      .filter((saldo) => saldoRestantePacote(saldo) > 0);

    console.log("BUSCA DE COMBOS CORRIGIDA:", {
      cliente_id_do_agendamento: ag.cliente_id,
      cliente_nome: ag.cliente,
      clienteIdsLocalizados: clienteIds,
      pacotesAtivosDoCliente,
      saldos,
    });

    setPacotesAtivos(saldos);
  }

  async function carregarCamposAnamnese(empresaId: string | null) {
    let modelosQuery = supabase
      .from("anamnese_modelos")
      .select("*")
      .eq("ativo", true)
      .limit(1);

    modelosQuery = empresaId
      ? modelosQuery.eq("empresa_id", empresaId)
      : modelosQuery.is("empresa_id", null);

    let { data: modelo, error: erroModelo } = await modelosQuery.maybeSingle();

    // Fallback: se não encontrar por empresa, pega o primeiro modelo ativo.
    if ((!modelo || erroModelo) && empresaId) {
      const fallback = await supabase
        .from("anamnese_modelos")
        .select("*")
        .eq("ativo", true)
        .limit(1)
        .maybeSingle();

      modelo = fallback.data;
      erroModelo = fallback.error;
    }

    if (erroModelo || !modelo) {
      console.warn("Modelo de anamnese não encontrado:", erroModelo);
      setModeloAnamnese(null);
      setCamposAnamnese([]);
      return;
    }

    setModeloAnamnese(modelo as ModeloAnamnese);

    const { data: campos, error: erroCampos } = await supabase
      .from("anamnese_campos")
      .select("*")
      .eq("modelo_id", modelo.id)
      .order("ordem", { ascending: true });

    if (erroCampos) {
      console.warn("Erro ao carregar campos de anamnese:", erroCampos);
      setCamposAnamnese([]);
      return;
    }

    const camposNormalizados = ((campos || []) as any[])
      .filter((campo) => campo.ativo !== false)
      .map((campo) => ({
        ...campo,
        label:
          campo.label ||
          campo.pergunta ||
          campo.titulo ||
          campo.nome ||
          campo.nome_campo ||
          "Pergunta",
        nome_campo: campo.nome_campo || campo.nome || campo.id,
        tipo: campo.tipo || "texto",
        placeholder: campo.placeholder || "",
        ajuda: campo.ajuda || "",
        obrigatorio: Boolean(campo.obrigatorio),
      }));

    console.log("ANAMNESE MODELO CARREGADO:", modelo);
    console.log("ANAMNESE CAMPOS CARREGADOS:", camposNormalizados);

    setCamposAnamnese(camposNormalizados as CampoAnamnese[]);
  }

  async function carregarServicosEProfissionais() {
    const [servicosResp, profissionaisResp] = await Promise.all([
      supabase.from("servicos").select("*").order("nome", { ascending: true }),
      supabase.from("profissionais").select("*").order("nome", { ascending: true }),
    ]);

    if (!servicosResp.error) {
      setServicos(((servicosResp.data || []) as Servico[]).filter((s) => s.ativo !== false));
    }

    if (!profissionaisResp.error) {
      setProfissionais(((profissionaisResp.data || []) as Profissional[]).filter((p) => p.ativo !== false));
    }
  }

  async function atualizarStatus(status: "confirmado" | "cancelado") {
    if (!agendamento) return;

    const mensagem =
      status === "confirmado"
        ? "Deseja confirmar este agendamento?"
        : "Deseja cancelar este agendamento?";

    const confirmar = window.confirm(mensagem);
    if (!confirmar) return;

    const { error } = await supabase
      .from("agendamentos")
      .update({ status })
      .eq("id", agendamento.id);

    if (error) {
      alert("Não foi possível atualizar o agendamento: " + error.message);
      return;
    }

    const atualizado = {
      ...agendamento,
      status,
    };

    if (status === "cancelado") {
      await carregarHistoricoCliente(atualizado);

      const proximo = await buscarProximoAgendamentoDoCliente(atualizado);
      setAgendamento(proximo);
    } else {
      setAgendamento(atualizado);
      await carregarHistoricoCliente(atualizado);
    }

    alert(status === "confirmado" ? "Agendamento confirmado!" : "Agendamento cancelado.");
  }

  function atualizarResposta(campoId: string, valor: string) {
    setRespostas((atual) => ({
      ...atual,
      [campoId]: valor,
    }));
  }

  function atualizarJustificativa(campoId: string, valor: string) {
    setRespostas((atual) => ({
      ...atual,
      [`${campoId}_justificativa`]: valor,
    }));
  }

  function nomeCampo(campo: CampoAnamnese) {
    const qualquerCampo = campo as any;

    return (
      qualquerCampo.label ||
      qualquerCampo.pergunta ||
      qualquerCampo.titulo ||
      qualquerCampo.nome ||
      qualquerCampo.nome_campo ||
      "Pergunta"
    );
  }

  function tipoCampo(campo: CampoAnamnese) {
    return (campo.tipo || "text").toLowerCase();
  }

  function placeholderCampo(campo: CampoAnamnese) {
    return campo.placeholder || "";
  }

  function ajudaCampo(campo: CampoAnamnese) {
    return campo.ajuda || "";
  }

  function opcoesCampo(campo: CampoAnamnese) {
    if (!campo.opcoes) return [];

    if (Array.isArray(campo.opcoes)) return campo.opcoes;

    try {
      const parsed = JSON.parse(campo.opcoes);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return campo.opcoes.split(",").map((item) => item.trim()).filter(Boolean);
    }

    return [];
  }

  function validarAnamnese() {
    for (const campo of camposAnamnese) {
      const respostaPrincipal = respostas[campo.id];
      const justificativa = respostas[`${campo.id}_justificativa`];

      if (campo.obrigatorio && !respostaPrincipal) {
        alert(`Preencha o campo obrigatório: ${nomeCampo(campo)}`);
        setAba("anamnese");
        return false;
      }

      if (
        campo.obrigatorio &&
        tipoCampo(campo) === "sim_nao_justificativa" &&
        respostaPrincipal === "Sim" &&
        !justificativa
      ) {
        alert(`Informe a justificativa do campo: ${nomeCampo(campo)}`);
        setAba("anamnese");
        return false;
      }
    }

    if (!aceiteTermo) {
      alert("Você precisa aceitar o termo.");
      setAba("anamnese");
      return false;
    }

    if (!assinatura) {
      alert("A assinatura é obrigatória.");
      setAba("anamnese");
      return false;
    }

    return true;
  }

  function respostasParaPdf() {
    const agrupado: Record<string, string> = {};

    camposAnamnese.forEach((campo) => {
      const pergunta = nomeCampo(campo);
      const resposta = respostas[campo.id] || "";
      const justificativa = respostas[`${campo.id}_justificativa`] || "";

      agrupado[pergunta] = justificativa ? `${resposta} - ${justificativa}` : resposta;
    });

    return agrupado;
  }

  async function salvarAnamnese() {
    if (!agendamento) return;
    if (!validarAnamnese()) return;

    setSalvandoAnamnese(true);

    try {
      const dataAssinatura = new Date().toISOString();
      const ip = "0.0.0.0";
      const respostasPdf = respostasParaPdf();
      const hash = await gerarHash(JSON.stringify(respostasPdf) + assinatura);

      const payload = {
        modelo_id: modeloAnamnese?.id || null,
        cliente_id: agendamento.cliente_id,
        cliente_nome: agendamento.cliente,
        respostas_json: respostasPdf,
        aceita_termo: true,
        preenchido: true,
        preenchido_em: dataAssinatura,
        assinatura_base64: assinatura,
        hash_assinatura: hash,
        ip_assinatura: ip,
        assinado_em: dataAssinatura,

        assinatura_nome: agendamento.cliente,
        assinatura_data: dataAssinatura,
        ip,
        hash_juridico: hash,
      };

      const { data: anamnese, error } = await supabase
        .from("anamneses_clientes")
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error(error);
        alert("Erro ao salvar anamnese: " + error.message);
        setSalvandoAnamnese(false);
        return;
      }

      await salvarRespostasSeparadas(anamnese.id);

      const pdfBlob = gerarPdfBlob({
        empresaNome,
        clienteNome: agendamento.cliente,
        respostas: respostasPdf,
        assinatura: assinatura || "",
        hash,
        ip,
        data: dataAssinatura,
      });

      const urlPdf = await uploadPdfAnamnese(
        pdfBlob,
        agendamento.cliente,
        anamnese.id
      );

      await supabase
        .from("anamneses_clientes")
        .update({ pdf_url: urlPdf })
        .eq("id", anamnese.id);

      setPdfUrlGerado(urlPdf);
      setAnamneseSalva({
        id: anamnese.id,
        cliente_id: agendamento.cliente_id,
        cliente_nome: agendamento.cliente,
        preenchido_em: dataAssinatura,
        assinado_em: dataAssinatura,
        pdf_url: urlPdf,
        respostas_json: respostasPdf,
      });
      alert("Anamnese salva com sucesso!");
    } catch (error) {
      console.error(error);
      alert("Erro inesperado ao salvar anamnese.");
    } finally {
      setSalvandoAnamnese(false);
    }
  }

  async function salvarRespostasSeparadas(anamneseId: string) {
    if (camposAnamnese.length === 0) return;

    const linhas = camposAnamnese.map((campo) => {
      const resposta = respostas[campo.id] || null;
      const justificativa = respostas[`${campo.id}_justificativa`] || null;

      return {
        anamnese_cliente_id: anamneseId,
        campo_id: campo.id,
        pergunta: nomeCampo(campo),
        resposta: justificativa ? `${resposta} - ${justificativa}` : resposta,
      };
    });

    const { error } = await supabase.from("anamnese_respostas").insert(linhas);

    if (error) {
      console.warn("Não foi possível salvar respostas separadas:", error);
    }
  }

  function enviarPdfWhatsapp() {
    if (!agendamento || !pdfUrlGerado) return;

    const mensagem = montarMensagemPdfAnamnese({
      cliente: agendamento.cliente,
      empresa: empresaNome,
      pdfUrl: pdfUrlGerado,
    });

    abrirWhatsapp(telefoneCliente, mensagem);
  }

  async function salvarDadosCliente() {
    if (!cliente?.id) {
      alert("Cliente não encontrado para atualização.");
      return;
    }

    if (!formCliente.nome.trim()) {
      alert("Informe seu nome.");
      return;
    }

    if (!formCliente.telefone.trim()) {
      alert("Informe seu telefone.");
      return;
    }

    setSalvandoDados(true);

    const { error } = await supabase
      .from("clientes")
      .update({
        nome: formCliente.nome.trim(),
        telefone: formCliente.telefone.trim(),
        email: formCliente.email.trim() || null,
        cpf: formCliente.cpf.trim() || null,
        data_nascimento: formCliente.data_nascimento || null,
        sexo: formCliente.sexo || "Não informado",
        alergias: formCliente.alergias.trim() || null,
        preferencias: formCliente.preferencias.trim() || null,
        observacoes: formCliente.observacoes.trim() || null,
      })
      .eq("id", cliente.id);

    if (error) {
      alert("Erro ao atualizar dados: " + error.message);
      setSalvandoDados(false);
      return;
    }

    alert("Dados atualizados com sucesso.");
    setSalvandoDados(false);

    if (agendamento) {
      await carregarCliente(agendamento);
    }
  }


  function horaParaMinutos(hora?: string | null) {
    if (!hora) return 0;

    const limpa = hora.slice(0, 5);
    const [h, m] = limpa.split(":").map(Number);

    if (Number.isNaN(h) || Number.isNaN(m)) return 0;

    return h * 60 + m;
  }

  function minutosParaHora(total: number) {
    const h = Math.floor(total / 60);
    const m = total % 60;

    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  function horarioFinalAtendimento(horarioInicio: string, servico?: Servico) {
    const inicio = horaParaMinutos(horarioInicio);
    const duracao = duracaoServico(servico);

    return minutosParaHora(inicio + duracao);
  }

  function faixaHorarioAtendimento(horarioInicio: string, servico?: Servico) {
    return `${horarioInicio} às ${horarioFinalAtendimento(horarioInicio, servico)}`;
  }

  function intervalosSobrepoem(inicioA: number, fimA: number, inicioB: number, fimB: number) {
    return inicioA < fimB && fimA > inicioB;
  }

  function duracaoServico(servico: Servico | undefined) {
    return (
      Number(servico?.duracao_padrao_minutos || 0) ||
      Number(servico?.duracao || 0) ||
      60
    );
  }

  function intervaloProfissional(profissional: Profissional | undefined) {
    return (
      Number(profissional?.intervalo_entre_atendimentos || 0) ||
      Number(profissional?.intervalo || 0) ||
      0
    );
  }

  function horarioInicioBloqueio(bloqueio: BloqueioAgenda) {
    return (
      bloqueio.hora_inicio ||
      bloqueio.horario_inicio ||
      bloqueio.inicio ||
      "00:00"
    );
  }

  function horarioFimBloqueio(bloqueio: BloqueioAgenda) {
    return (
      bloqueio.hora_fim ||
      bloqueio.horario_fim ||
      bloqueio.fim ||
      "23:59"
    );
  }

  function pertenceAoProfissional(item: {
    profissional_id?: string | null;
    profissional?: string | null;
  }, profissional: Profissional) {
    if (item.profissional_id && item.profissional_id === profissional.id) return true;
    if (item.profissional && item.profissional === profissional.nome) return true;
    return false;
  }

  async function carregarHorariosDisponiveis() {
    if (!novoServicoId || !novoProfissionalId || !novaData) {
      setHorariosDisponiveis([]);
      setMensagemHorarios("Selecione serviço, profissional e data para ver os horários disponíveis.");
      return;
    }

    const servico = servicos.find((item) => item.id === novoServicoId);
    const profissional = profissionais.find((item) => item.id === novoProfissionalId);

    if (!servico || !profissional) {
      setHorariosDisponiveis([]);
      setMensagemHorarios("Serviço ou profissional inválido.");
      return;
    }

    setLoadingHorarios(true);
    setMensagemHorarios("");

    const duracao = duracaoServico(servico);
    const intervalo = intervaloProfissional(profissional);
    const passo = 30;

    const inicioExpediente = horaParaMinutos(profissional.hora_inicio || "08:00");
    const fimExpediente = horaParaMinutos(profissional.hora_fim || "18:00");
    const inicioAlmoco = profissional.inicio_almoco
      ? horaParaMinutos(profissional.inicio_almoco)
      : null;
    const fimAlmoco = profissional.fim_almoco
      ? horaParaMinutos(profissional.fim_almoco)
      : null;

    const { data: ags, error: erroAgs } = await supabase
      .from("agendamentos")
      .select("*")
      .eq("data", novaData);

    if (erroAgs) {
      console.error("Erro ao consultar agenda:", erroAgs);
      setHorariosDisponiveis([]);
      setMensagemHorarios("Não foi possível consultar a agenda.");
      setLoadingHorarios(false);
      return;
    }

    const { data: bloqueios, error: erroBloqueios } = await supabase
      .from("bloqueios_agenda")
      .select("*")
      .eq("data", novaData);

    if (erroBloqueios) {
      console.warn("Não foi possível consultar bloqueios:", erroBloqueios);
    }

    const agendamentosDoProfissional = ((ags || []) as Agendamento[])
      .filter((item) => pertenceAoProfissional(item, profissional))
      .filter((item) => normalizarStatusAgendamento(item.status) !== "cancelado");

    const bloqueiosDoProfissional = ((bloqueios || []) as BloqueioAgenda[])
      .filter((item) => item.ativo !== false)
      .filter((item) => pertenceAoProfissional(item, profissional));

    const ocupados = agendamentosDoProfissional.map((item) => {
      const inicio = horaParaMinutos(item.horario);
      const fim = inicio + (
        Number(item.duracao_minutos || 0) ||
        Number(item.duracao || 0) ||
        duracao
      ) + intervalo;

      return { inicio, fim };
    });

    const bloqueados = bloqueiosDoProfissional.map((item) => ({
      inicio: horaParaMinutos(horarioInicioBloqueio(item)),
      fim: horaParaMinutos(horarioFimBloqueio(item)),
    }));

    const horarios: string[] = [];

    for (let inicio = inicioExpediente; inicio + duracao <= fimExpediente; inicio += passo) {
      const fim = inicio + duracao;

      const passaNoAlmoco =
        inicioAlmoco !== null &&
        fimAlmoco !== null &&
        intervalosSobrepoem(inicio, fim, inicioAlmoco, fimAlmoco);

      const conflitaAgendamento = ocupados.some((item) =>
        intervalosSobrepoem(inicio, fim, item.inicio, item.fim)
      );

      const conflitaBloqueio = bloqueados.some((item) =>
        intervalosSobrepoem(inicio, fim, item.inicio, item.fim)
      );

      if (!passaNoAlmoco && !conflitaAgendamento && !conflitaBloqueio) {
        horarios.push(minutosParaHora(inicio));
      }
    }

    setHorariosDisponiveis(horarios);

    if (horarios.length === 0) {
      setMensagemHorarios("Nenhum horário disponível para esse dia.");
    }

    setLoadingHorarios(false);
  }

  function normalizarStatusAgendamento(status?: string | null) {
    return (status || "").toLowerCase().trim();
  }


  async function solicitarNovoAgendamento() {
    if (!agendamento) return;

    if (!novoServicoId || !novoProfissionalId || !novaData || !novoHorario) {
      alert("Selecione serviço, profissional, data e um horário disponível.");
      return;
    }

    if (!horariosDisponiveis.includes(novoHorario)) {
      alert("Este horário não está mais disponível. Selecione outro horário.");
      await carregarHorariosDisponiveis();
      return;
    }

    const servico = servicos.find((item) => item.id === novoServicoId);
    const profissional = profissionais.find((item) => item.id === novoProfissionalId);

    if (!servico || !profissional) {
      alert("Serviço ou profissional inválido.");
      return;
    }

    setSalvandoNovoAgendamento(true);

    const novoToken = crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;

    const { error } = await supabase.from("agendamentos").insert([
      {
        cliente_id: agendamento.cliente_id || null,
        cliente: formCliente.nome || agendamento.cliente,
        telefone: formCliente.telefone || telefoneCliente || null,
        servico_id: servico.id,
        servico: servico.nome,
        profissional_id: profissional.id,
        profissional: profissional.nome,
        data: novaData,
        horario: novoHorario,
        duracao_minutos: duracaoServico(servico),
        status: "agendado",
        observacoes: novaObservacao.trim() || "Solicitado pelo Meu Espaço",
        token_cliente: novoToken,
        empresa_id: agendamento.empresa_id || null,
      },
    ]);

    if (error) {
      alert("Erro ao solicitar novo agendamento: " + error.message);
      setSalvandoNovoAgendamento(false);
      return;
    }

    alert("Novo agendamento solicitado com sucesso!");
    await carregarHistoricoCliente(agendamento);
    setNovoServicoId("");
    setNovoProfissionalId("");
    setNovaData("");
    setNovoHorario("");
    setNovaObservacao("");
    setSalvandoNovoAgendamento(false);
  }

  function formatarData(valor?: string | null) {
    if (!valor) return "-";
    const partes = valor.split("-");
    if (partes.length !== 3) return valor;
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }

  function formatarMoeda(valor?: number | null) {
    return Number(valor || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function valorAgendamentoAtual() {
    const servicoAtual = servicos.find((item) => {
      if (agendamento?.servico_id && item.id === agendamento.servico_id) return true;
      return item.nome === agendamento?.servico;
    });

    return (
      Number(agendamento?.valor || 0) ||
      Number(agendamento?.preco || 0) ||
      Number(agendamento?.preco_servico || 0) ||
      Number(servicoAtual?.preco || 0) ||
      Number(servicoAtual?.valor || 0) ||
      0
    );
  }

  function duracaoAgendamentoAtual() {
    const servicoAtual = servicos.find((item) => {
      if (agendamento?.servico_id && item.id === agendamento.servico_id) return true;
      return item.nome === agendamento?.servico;
    });

    return (
      Number(agendamento?.duracao_minutos || 0) ||
      Number(agendamento?.duracao || 0) ||
      duracaoServico(servicoAtual)
    );
  }

  function saldoRestantePacote(pacote: ClientePacoteSaldo) {
    return (
      Number(pacote.quantidade_restante || 0) ||
      Number(pacote.saldo_restante || 0) ||
      Number(pacote.saldo || 0) ||
      Math.max(
        0,
        Number(pacote.quantidade_total || pacote.saldo_total || pacote.total || 0) -
          Number(pacote.quantidade_usada || pacote.saldo_usado || pacote.usado || 0)
      )
    );
  }

  function validadePacote(pacote: ClientePacoteSaldo) {
    return pacote.data_fim || pacote.validade_fim || pacote.data_validade || pacote.fim || "";
  }

  function textoNormalizado(valor?: string | null) {
    return (valor || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }

  function nomePacote(pacote: ClientePacoteSaldo) {
    return (
      pacote.marketing_pacotes?.nome ||
      pacote.pacote_nome ||
      pacote.nome_pacote ||
      pacote.nome ||
      "Pacote ativo disponível"
    );
  }


  function statusPacote(pacote: ClientePacoteSaldo) {
    const validade = validadePacote(pacote);
    const hoje = hojeISO();
    const saldo = saldoRestantePacote(pacote);
    const status = (pacote.status || "ativo").toLowerCase();

    if (status === "cancelado" || status === "inativo") return "cancelado";
    if (status === "expirado" || (validade && validade < hoje)) return "expirado";
    if (saldo <= 0) return "utilizado";
    return "ativo";
  }

  function classeStatusPacote(status: string) {
    if (status === "ativo") return "bg-emerald-100 text-emerald-700";
    if (status === "expirado") return "bg-orange-100 text-orange-700";
    if (status === "utilizado") return "bg-slate-100 text-slate-700";
    return "bg-red-100 text-red-700";
  }

  function pacoteCompativelComAgendamento(pacote: ClientePacoteSaldo) {
    if (!agendamento) return false;

    if (pacote.servico_id && agendamento.servico_id) {
      return pacote.servico_id === agendamento.servico_id;
    }

    const nomeServicoPacote = textoNormalizado(pacote.servico_nome || pacote.servico);
    const nomeServicoAgendamento = textoNormalizado(agendamento.servico);

    if (nomeServicoPacote && nomeServicoAgendamento) {
      return (
        nomeServicoPacote === nomeServicoAgendamento ||
        nomeServicoPacote.includes(nomeServicoAgendamento) ||
        nomeServicoAgendamento.includes(nomeServicoPacote)
      );
    }

    return false;
  }

  const pacoteDisponivelAgendamento =
    pacotesAtivos.find(pacoteCompativelComAgendamento) ||
    (pacotesAtivos.length === 1 ? pacotesAtivos[0] : undefined);

  const empresaNome =
    empresa?.nome_fantasia ||
    empresa?.nome_empresa ||
    "Seu estabelecimento";

  const servicoSelecionado = useMemo(
    () => servicos.find((item) => item.id === novoServicoId),
    [servicos, novoServicoId]
  );

  if (loading) {
    return (
      <div className="min-h-screen px-4 py-8" style={{ backgroundColor: "var(--color-background)" }}>
        <div className="mx-auto max-w-5xl">
          <SectionCard>
            <p className="text-sm text-slate-500">Carregando Meu Espaço...</p>
          </SectionCard>
        </div>
      </div>
    );
  }

  if (erro || !agendamento) {
    return (
      <div className="min-h-screen px-4 py-8" style={{ backgroundColor: "var(--color-background)" }}>
        <div className="mx-auto max-w-5xl">
          <SectionCard title="Meu Espaço">
            <p className="text-sm text-red-600">{erro || "Agendamento não encontrado."}</p>
          </SectionCard>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-8" style={{ backgroundColor: "var(--color-background)" }}>
      <div className="mx-auto max-w-5xl space-y-6">
        <div
          className="rounded-3xl p-6 text-white shadow-sm"
          style={{ backgroundColor: "var(--color-secondary)" }}
        >
          <div className="flex items-center gap-3">
            {(empresa?.logo_url || empresa?.logo) && (
              <img
                src={empresa.logo_url || empresa.logo || ""}
                alt={empresaNome}
                className="h-14 w-14 rounded-2xl bg-white object-cover"
              />
            )}

            <div>
              <p className="text-sm font-semibold text-white/80">Meu Espaço</p>
              <h1 className="mt-1 text-3xl font-extrabold">{empresaNome}</h1>
            </div>
          </div>

          {(empresa?.telefone || empresa?.endereco) && (
            <p className="mt-2 text-sm text-white/80">
              {empresa.telefone || ""} {empresa.telefone && empresa.endereco ? "•" : ""} {empresa.endereco || ""}
            </p>
          )}
        </div>

        <PageHeader
          eyebrow="Área do cliente"
          title={`Olá, ${agendamento.cliente}`}
          description="Aqui você acompanha seu agendamento, confirma presença, preenche sua ficha e atualiza seus dados."
        />

        <div className="flex flex-wrap gap-2 rounded-3xl bg-white p-2 shadow-sm ring-1 ring-slate-200">
          <TabButton ativo={aba === "agendamento"} onClick={() => setAba("agendamento")}>
            Meu agendamento
          </TabButton>
          <TabButton ativo={aba === "anamnese"} onClick={() => setAba("anamnese")}>
            Ficha de anamnese
          </TabButton>
          <TabButton ativo={aba === "dados"} onClick={() => setAba("dados")}>
            Meus dados
          </TabButton>
          <TabButton ativo={aba === "combos"} onClick={() => setAba("combos")}>
            Meus combos
          </TabButton>
          <TabButton ativo={aba === "novo"} onClick={() => setAba("novo")}>
            Novo agendamento
          </TabButton>
        </div>

        {aba === "agendamento" && (
          <>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <SectionCard>
                <p className="text-sm font-semibold text-slate-500">Status</p>
                <div className="mt-2">
                  <StatusBadge status={agendamento.status || "agendado"} />
                </div>
              </SectionCard>

              <SectionCard>
                <p className="text-sm font-semibold text-slate-500">Data</p>
                <p className="mt-2 text-2xl font-extrabold text-slate-900">
                  {formatarData(agendamento.data)}
                </p>
              </SectionCard>

              <SectionCard>
                <p className="text-sm font-semibold text-slate-500">Horário</p>
                <p className="mt-2 text-2xl font-extrabold text-slate-900">
                  {agendamento.horario}
                </p>
              </SectionCard>
            </div>

            <SectionCard title="Dados do agendamento" description="Confira as informações antes de confirmar.">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Info label="Serviço" value={agendamento.servico} />
                <Info label="Profissional" value={agendamento.profissional} />
                <Info label="Cliente" value={agendamento.cliente} />
                <Info label="Observações" value={agendamento.observacoes || "-"} />
                <Info label="Valor" value={formatarMoeda(valorAgendamentoAtual())} />
                <Info label="Duração" value={`${duracaoAgendamentoAtual()} min`} />
              </div>

              <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-base font-extrabold text-slate-900">
                  Combo / pacote
                </p>

                {pacoteDisponivelAgendamento ? (
                  <div className="mt-2 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800">
                    <p className="font-extrabold">
                      {nomePacote(pacoteDisponivelAgendamento)}
                    </p>
                    <p className="mt-1 font-semibold">
                      Saldo disponível: {saldoRestantePacote(pacoteDisponivelAgendamento)} atendimento(s)
                    </p>
                    <p className="mt-1 font-semibold">
                      Validade:{" "}
                      {validadePacote(pacoteDisponivelAgendamento)
                        ? formatarData(validadePacote(pacoteDisponivelAgendamento))
                        : "Sem validade informada"}
                    </p>
                    <p className="mt-2 text-xs font-semibold">
                      Se o atendimento for finalizado dentro da validade, será abatido do combo.
                    </p>
                  </div>
                ) : (
                  <div className="mt-2 rounded-2xl bg-orange-50 p-4 text-sm font-semibold text-orange-700">
                    {pacotesAtivos.length > 0
                      ? "Você possui combo ativo, mas nenhum saldo compatível com este serviço."
                      : "Nenhum combo ativo disponível para este serviço. O pagamento será feito pelo valor normal."}
                  </div>
                )}
              </div>

              <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-4">
                  <p className="text-base font-extrabold text-slate-900">
                    Confirmação de presença
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    Confirme sua presença para manter o horário reservado. Caso não consiga comparecer,
                    cancele para liberar o horário para outro cliente.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  {agendamento.status !== "confirmado" && agendamento.status !== "cancelado" && (
                    <PrimaryButton type="button" onClick={() => void atualizarStatus("confirmado")}>
                      Confirmar presença
                    </PrimaryButton>
                  )}

                  {agendamento.status !== "cancelado" && (
                    <SecondaryButton type="button" onClick={() => void atualizarStatus("cancelado")}>
                      Cancelar agendamento
                    </SecondaryButton>
                  )}

                  {agendamento.status === "confirmado" && (
                    <span className="rounded-2xl bg-emerald-100 px-4 py-3 text-sm font-extrabold text-emerald-700">
                      Presença confirmada
                    </span>
                  )}

                  {agendamento.status === "cancelado" && (
                    <span className="rounded-2xl bg-red-100 px-4 py-3 text-sm font-extrabold text-red-700">
                      Agendamento cancelado
                    </span>
                  )}
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Histórico do cliente"
              description="Últimos agendamentos vinculados ao seu cadastro."
            >
              {historicoAgendamentos.length === 0 ? (
                <p className="text-sm text-slate-500">Nenhum histórico encontrado.</p>
              ) : (
                <div className="space-y-3">
                  {historicoAgendamentos.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4"
                    >
                      <div>
                        <p className="font-extrabold text-slate-900">{item.servico || "Serviço"}</p>
                        <p className="text-sm font-semibold text-slate-500">
                          {formatarData(item.data)} às {item.horario || "-"}
                          {item.profissional ? ` • ${item.profissional}` : ""}
                        </p>
                      </div>

                      <StatusBadge status={item.status || "agendado"} />
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </>
        )}

        {aba === "anamnese" && (
          <SectionCard
            title={modeloAnamnese?.titulo || "Ficha de anamnese"}
            description={modeloAnamnese?.descricao || "Responda as perguntas e assine o termo para deixar seu atendimento mais seguro."}
          >
            {anamneseSalva && (
              <div className="mb-5 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
                Ficha salva em{" "}
                {new Date(anamneseSalva.preenchido_em || anamneseSalva.assinado_em || "").toLocaleString("pt-BR")}.
                {anamneseSalva.pdf_url && (
                  <>
                    {" "}
                    <a
                      href={anamneseSalva.pdf_url}
                      target="_blank"
                      rel="noreferrer"
                      className="underline"
                    >
                      Abrir PDF salvo
                    </a>
                  </>
                )}
              </div>
            )}

            <div className="space-y-5">
              {camposAnamnese.length === 0 ? (
                <div className="rounded-2xl bg-orange-50 p-4 text-sm text-orange-700">
                  Nenhuma pergunta de anamnese configurada. Você ainda pode aceitar o termo e assinar.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {camposAnamnese.map((campo) => (
                    <CampoResposta
                      key={campo.id}
                      campo={campo}
                      label={nomeCampo(campo)}
                      tipo={tipoCampo(campo)}
                      opcoes={opcoesCampo(campo)}
                      placeholder={placeholderCampo(campo)}
                      ajuda={ajudaCampo(campo)}
                      valor={respostas[campo.id] || ""}
                      justificativa={respostas[`${campo.id}_justificativa`] || ""}
                      onChange={(valor) => atualizarResposta(campo.id, valor)}
                      onJustificativaChange={(valor) => atualizarJustificativa(campo.id, valor)}
                    />
                  ))}
                </div>
              )}

              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                <p>
                  {modeloAnamnese?.termo_responsabilidade ||
                    "Declaro que as informações fornecidas são verdadeiras e autorizo o uso desses dados para fins de atendimento, segurança e histórico do cliente."}
                </p>

                <label className="mt-3 flex items-center gap-2 font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={aceiteTermo}
                    onChange={(e) => setAceiteTermo(e.target.checked)}
                  />
                  Aceito o termo
                </label>
              </div>

              <div>
                <p className="mb-2 text-sm font-extrabold text-slate-700">
                  Assinatura
                </p>

                <div className="rounded-2xl border border-slate-200 bg-white p-3">
                  <AssinaturaCanvas onChange={setAssinatura} />
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <PrimaryButton
                  type="button"
                  onClick={() => void salvarAnamnese()}
                  disabled={salvandoAnamnese}
                >
                  {salvandoAnamnese ? "Salvando..." : "Salvar anamnese"}
                </PrimaryButton>

                {pdfUrlGerado && (
                  <>
                    <a
                      href={pdfUrlGerado}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-extrabold text-slate-700 transition hover:bg-slate-50"
                    >
                      Abrir PDF
                    </a>

                    <button
                      type="button"
                      onClick={enviarPdfWhatsapp}
                      className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-emerald-700"
                    >
                      Enviar PDF no WhatsApp
                    </button>
                  </>
                )}
              </div>
            </div>
          </SectionCard>
        )}

        {aba === "dados" && (
          <SectionCard title="Meus dados" description="Atualize seus dados de contato e preferências.">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input label="Nome" value={formCliente.nome} onChange={(v) => setFormCliente({ ...formCliente, nome: v })} />
              <Input label="Telefone / WhatsApp" value={formCliente.telefone} onChange={(v) => setFormCliente({ ...formCliente, telefone: v })} />
              <Input label="E-mail" value={formCliente.email} onChange={(v) => setFormCliente({ ...formCliente, email: v })} />
              <Input label="CPF" value={formCliente.cpf} onChange={(v) => setFormCliente({ ...formCliente, cpf: v })} />
              <Input label="Data de nascimento" type="date" value={formCliente.data_nascimento} onChange={(v) => setFormCliente({ ...formCliente, data_nascimento: v })} />

              <label className="block">
                <span className="mb-1 block text-sm font-extrabold text-slate-700">Sexo</span>
                <select
                  value={formCliente.sexo}
                  onChange={(e) => setFormCliente({ ...formCliente, sexo: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 p-3"
                >
                  <option>Não informado</option>
                  <option>Feminino</option>
                  <option>Masculino</option>
                  <option>Outro</option>
                </select>
              </label>

              <Textarea label="Alergias / restrições" value={formCliente.alergias} onChange={(v) => setFormCliente({ ...formCliente, alergias: v })} />
              <Textarea label="Preferências" value={formCliente.preferencias} onChange={(v) => setFormCliente({ ...formCliente, preferencias: v })} />

              <div className="md:col-span-2">
                <Textarea label="Observações" value={formCliente.observacoes} onChange={(v) => setFormCliente({ ...formCliente, observacoes: v })} />
              </div>
            </div>

            <div className="mt-5">
              <PrimaryButton type="button" onClick={() => void salvarDadosCliente()} disabled={salvandoDados}>
                {salvandoDados ? "Salvando..." : "Salvar meus dados"}
              </PrimaryButton>
            </div>
          </SectionCard>
        )}

        {aba === "combos" && (
          <SectionCard
            title="Meus combos"
            description="Acompanhe seus combos, validade e quantidade disponível."
          >
            {pacotesAtivos.length === 0 ? (
              <div className="rounded-2xl bg-orange-50 p-4 text-sm font-semibold text-orange-700">
                Você ainda não possui combo ativo disponível.
              </div>
            ) : (
              <div className="space-y-4">
                {pacotesAtivos.map((pacote) => {
                  const status = statusPacote(pacote);
                  const saldo = saldoRestantePacote(pacote);
                  const validade = validadePacote(pacote);

                  return (
                    <div
                      key={pacote.id}
                      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-lg font-extrabold text-slate-900">
                            {nomePacote(pacote)}
                          </p>

                          {(pacote.servico_nome || pacote.servico) && (
                            <p className="mt-1 text-sm font-semibold text-slate-500">
                              Serviço: {pacote.servico_nome || pacote.servico}
                            </p>
                          )}
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-extrabold uppercase ${classeStatusPacote(status)}`}
                        >
                          {status}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                        <div className="rounded-2xl bg-slate-50 p-4">
                          <p className="text-xs font-bold uppercase text-slate-500">
                            Saldo disponível
                          </p>
                          <p className="mt-1 text-2xl font-extrabold text-slate-900">
                            {saldo}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-4">
                          <p className="text-xs font-bold uppercase text-slate-500">
                            Validade
                          </p>
                          <p className="mt-1 text-2xl font-extrabold text-slate-900">
                            {validade ? formatarData(validade) : "Sem validade"}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-4">
                          <p className="text-xs font-bold uppercase text-slate-500">
                            Uso
                          </p>
                          <p className="mt-1 text-2xl font-extrabold text-slate-900">
                            {Number(pacote.quantidade_usada || pacote.saldo_usado || pacote.usado || 0)} /{" "}
                            {Number(pacote.quantidade_total || pacote.saldo_total || pacote.total || saldo)}
                          </p>
                        </div>
                      </div>

                      {status === "ativo" && validade && (
                        <p className="mt-4 rounded-2xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
                          Use até {formatarData(validade)} para não expirar.
                        </p>
                      )}

                      {status === "expirado" && (
                        <p className="mt-4 rounded-2xl bg-orange-50 p-3 text-sm font-semibold text-orange-700">
                          Este combo expirou e não pode mais ser utilizado.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>
        )}

        {aba === "novo" && (
          <SectionCard title="Novo agendamento" description="Solicite um novo horário para o estabelecimento.">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-extrabold text-slate-700">Serviço</span>
                <select
                  value={novoServicoId}
                  onChange={(e) => setNovoServicoId(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 p-3"
                >
                  <option value="">Selecione</option>
                  {servicos.map((servico) => (
                    <option key={servico.id} value={servico.id}>
                      {servico.nome}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-extrabold text-slate-700">Profissional</span>
                <select
                  value={novoProfissionalId}
                  onChange={(e) => setNovoProfissionalId(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 p-3"
                >
                  <option value="">Selecione</option>
                  {profissionais.map((profissional) => (
                    <option key={profissional.id} value={profissional.id}>
                      {profissional.nome}
                    </option>
                  ))}
                </select>
              </label>

              <Input label="Data" type="date" value={novaData} onChange={setNovaData} />

              <div className="md:col-span-2">
                <Textarea label="Observações" value={novaObservacao} onChange={setNovaObservacao} />
              </div>
            </div>

            {servicoSelecionado && (
              <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                Serviço selecionado: <strong>{servicoSelecionado.nome}</strong> • Valor:{" "}
                <strong>{formatarMoeda(Number(servicoSelecionado.preco || servicoSelecionado.valor || 0))}</strong> • Duração estimada:{" "}
                <strong>{duracaoServico(servicoSelecionado)} min</strong>
                {novoHorario && (
                  <>
                    {" "}• Atendimento:{" "}
                    <strong>{faixaHorarioAtendimento(novoHorario, servicoSelecionado)}</strong>
                  </>
                )}
              </div>
            )}

            <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-extrabold text-slate-800">Horários disponíveis</p>
                  <p className="text-xs font-semibold text-slate-500">
                    Os horários abaixo são consultados na agenda real do sistema.
                  </p>
                </div>

                <SecondaryButton type="button" onClick={() => void carregarHorariosDisponiveis()}>
                  Atualizar horários
                </SecondaryButton>
              </div>

              {loadingHorarios ? (
                <p className="text-sm text-slate-500">Consultando horários disponíveis...</p>
              ) : horariosDisponiveis.length === 0 ? (
                <p className="rounded-2xl bg-orange-50 p-4 text-sm font-semibold text-orange-700">
                  {mensagemHorarios || "Nenhum horário disponível."}
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                  {horariosDisponiveis.map((horario) => (
                    <button
                      key={horario}
                      type="button"
                      onClick={() => setNovoHorario(horario)}
                      className="rounded-2xl border px-4 py-3 text-sm font-extrabold transition"
                      style={{
                        borderColor: novoHorario === horario ? "var(--color-primary)" : "rgb(226 232 240)",
                        backgroundColor: novoHorario === horario ? "var(--color-primary)" : "#fff",
                        color: novoHorario === horario ? "#fff" : "var(--color-secondary)",
                      }}
                    >
                      <span className="block">{faixaHorarioAtendimento(horario, servicoSelecionado)}</span>
                      <span className="mt-1 block text-xs font-semibold opacity-70">
                        {duracaoServico(servicoSelecionado)} min
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-5">
              <PrimaryButton
                type="button"
                onClick={() => void solicitarNovoAgendamento()}
                disabled={salvandoNovoAgendamento || !novoHorario}
              >
                {salvandoNovoAgendamento ? "Enviando..." : "Solicitar agendamento"}
              </PrimaryButton>
            </div>
          </SectionCard>
        )}
      </div>
    </div>
  );
}

function TabButton({
  ativo,
  onClick,
  children,
}: {
  ativo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl px-4 py-3 text-sm font-extrabold transition"
      style={{
        backgroundColor: ativo ? "var(--color-primary)" : "transparent",
        color: ativo ? "#fff" : "var(--color-secondary)",
      }}
    >
      {children}
    </button>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-extrabold text-slate-900">{value}</p>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (valor: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-extrabold text-slate-700">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-slate-200 p-3"
      />
    </label>
  );
}

function Textarea({
  label,
  value,
  onChange,
  placeholder = "",
}: {
  label: string;
  value: string;
  onChange: (valor: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-extrabold text-slate-700">{label}</span>
      <textarea
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-28 w-full rounded-2xl border border-slate-200 p-3"
      />
    </label>
  );
}

function CampoResposta({
  campo,
  label,
  tipo,
  opcoes,
  placeholder,
  ajuda,
  valor,
  justificativa,
  onChange,
  onJustificativaChange,
}: {
  campo: CampoAnamnese;
  label: string;
  tipo: string;
  opcoes: string[];
  placeholder: string;
  ajuda: string;
  valor: string;
  justificativa: string;
  onChange: (valor: string) => void;
  onJustificativaChange: (valor: string) => void;
}) {
  const obrigatorio = campo.obrigatorio ? " *" : "";

  if (tipo === "sim_nao_justificativa") {
    return (
      <div className="rounded-2xl border border-slate-200 p-4">
        <label className="block">
          <span className="mb-1 block text-sm font-extrabold text-slate-700">
            {label}{obrigatorio}
          </span>
          <select
            value={valor}
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 p-3"
          >
            <option value="">Selecione</option>
            <option value="Não">Não</option>
            <option value="Sim">Sim</option>
          </select>
        </label>

        {ajuda && <p className="mt-2 text-xs font-semibold text-slate-500">{ajuda}</p>}

        {valor === "Sim" && (
          <div className="mt-3">
            <Textarea
              label="Descreva"
              value={justificativa}
              placeholder={placeholder}
              onChange={onJustificativaChange}
            />
          </div>
        )}
      </div>
    );
  }

  if (tipo.includes("sim_nao") || tipo.includes("sim/não") || tipo.includes("boolean")) {
    return (
      <label className="block">
        <span className="mb-1 block text-sm font-extrabold text-slate-700">
          {label}{obrigatorio}
        </span>
        <select
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-2xl border border-slate-200 p-3"
        >
          <option value="">Selecione</option>
          <option value="Não">Não</option>
          <option value="Sim">Sim</option>
        </select>
        {ajuda && <p className="mt-2 text-xs font-semibold text-slate-500">{ajuda}</p>}
      </label>
    );
  }

  if (tipo.includes("select") || tipo.includes("opcao")) {
    return (
      <label className="block">
        <span className="mb-1 block text-sm font-extrabold text-slate-700">
          {label}{obrigatorio}
        </span>
        <select
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-2xl border border-slate-200 p-3"
        >
          <option value="">Selecione</option>
          {opcoes.map((opcao) => (
            <option key={opcao} value={opcao}>
              {opcao}
            </option>
          ))}
        </select>
        {ajuda && <p className="mt-2 text-xs font-semibold text-slate-500">{ajuda}</p>}
      </label>
    );
  }

  if (tipo.includes("data")) {
    return (
      <Input label={`${label}${obrigatorio}`} type="date" value={valor} onChange={onChange} />
    );
  }

  if (tipo.includes("numero") || tipo.includes("number")) {
    return (
      <Input label={`${label}${obrigatorio}`} type="number" value={valor} onChange={onChange} />
    );
  }

  return (
    <Textarea
      label={`${label}${obrigatorio}`}
      value={valor}
      placeholder={placeholder}
      onChange={onChange}
    />
  );
}
