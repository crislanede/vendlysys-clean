import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import AssinaturaCanvas from "../components/AssinaturaCanvas";
import { gerarHash } from "../lib/hash";
import { gerarPdfBlob } from "../lib/pdfAnamnese";
import { uploadPdfAnamnese } from "../lib/uploadAnamnese";

type CampoAnamnese = {
  id: string;
  label: string;
  tipo: string;
  obrigatorio?: boolean;
  ordem?: number;
  placeholder?: string | null;
  ajuda?: string | null;
  opcoes?: string[] | null;
};

type ServicoCliente = {
  id: string;
  nome: string;
  duracao?: number | null;
  duracao_padrao_minutos?: number | null;
  preco?: number | string | null;
  valor?: number | string | null;
  preco_promocional?: number | string | null;
};

type ProfissionalCliente = {
  id: string;
  nome: string;
  inicio_expediente?: string | null;
  fim_expediente?: string | null;
  inicio_almoco?: string | null;
  fim_almoco?: string | null;
  intervalo_minutos?: number | string | null;
  intervalo?: number | string | null;
};

function limparTelefone(valor: string) {
  return valor.replace(/\D/g, "");
}

function formatarData(data?: string | null) {
  if (!data) return "-";
  return new Date(`${data}T00:00:00`).toLocaleDateString("pt-BR");
}

function formatarMoeda(valor?: number | null) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function primeiroNome(nome?: string | null) {
  return String(nome || "")
    .trim()
    .split(/\s+/)[0] || "cliente";
}

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

function obterDataBaseAnamnese(ficha: any) {
  return (
    ficha?.data_assinatura ||
    ficha?.preenchido_em ||
    ficha?.created_at ||
    ficha?.criado_em ||
    null
  );
}

function calcularValidadeAnamnese(ficha: any) {
  const dataBase = obterDataBaseAnamnese(ficha);

  if (!dataBase) return null;

  const validade = new Date(dataBase);
  validade.setMonth(validade.getMonth() + 12);
  return validade;
}

function anamneseEstaVencida(ficha: any) {
  const validade = calcularValidadeAnamnese(ficha);

  if (!validade) return true;

  return validade < new Date();
}

function formatarDataAnamnese(data?: string | Date | null) {
  if (!data) return "-";

  const dataObj = data instanceof Date ? data : new Date(data);

  if (Number.isNaN(dataObj.getTime())) return "-";

  return dataObj.toLocaleDateString("pt-BR");
}

function somarMinutos(horario: string, minutos: number) {
  const [h, m] = horario.split(":").map(Number);
  const data = new Date(2000, 0, 1, h || 0, m || 0);
  data.setMinutes(data.getMinutes() + minutos);
  return data.toTimeString().slice(0, 5);
}

function normalizarHorario(valor?: string | null, fallback = "") {
  if (!valor) return fallback;
  return String(valor).slice(0, 5);
}

function obterIntervaloAgenda(profissional: ProfissionalCliente | null) {
  const intervalo = Number(
    profissional?.intervalo_minutos || profissional?.intervalo || 30,
  );

  return !Number.isNaN(intervalo) && intervalo > 0 ? intervalo : 30;
}

function horarioSobrepoeIntervalo(
  inicioServico: string,
  duracaoMinutos: number,
  inicioBloqueio?: string | null,
  fimBloqueio?: string | null,
) {
  const inicio = normalizarHorario(inicioBloqueio);
  const fim = normalizarHorario(fimBloqueio);

  if (!inicio || !fim) return false;

  const fimServico = somarMinutos(inicioServico, duracaoMinutos);

  return inicioServico < fim && fimServico > inicio;
}

function gerarHorariosBase(inicio = "08:00", fim = "18:00", intervalo = 30) {
  const horarios: string[] = [];
  let atual = inicio;

  while (atual <= fim) {
    horarios.push(atual);
    atual = somarMinutos(atual, intervalo);
  }

  return horarios;
}

export default function MeuEspaco() {
  const [aba, setAba] = useState("agenda");
  const [telefone, setTelefone] = useState("");
  const [modoCadastro, setModoCadastro] = useState(false);
  const [cadastro, setCadastro] = useState({
    nome: "",
    telefone: "",
    email: "",
    data_nascimento: "",
    cep: "",
    endereco: "",
    numero: "",
    bairro: "",
    cidade: "",
    estado: "",
  });
  const [editandoDados, setEditandoDados] = useState(false);
  const [salvandoDados, setSalvandoDados] = useState(false);
  const [dadosEdicao, setDadosEdicao] = useState({
    nome: "",
    email: "",
    data_nascimento: "",
    cep: "",
    endereco: "",
    numero: "",
    bairro: "",
    cidade: "",
    estado: "",
  });
  const [cadastrando, setCadastrando] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [cliente, setCliente] = useState<any>(null);
  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(false);

  const [agendamentos, setAgendamentos] = useState<any[]>([]);
  const [historico, setHistorico] = useState<any[]>([]);

  const [anamneseObrigatoria, setAnamneseObrigatoria] = useState(false);
  const [modalAnamneseAberto, setModalAnamneseAberto] = useState(false);
  const [
    assinaturaComplementarObrigatoria,
    setAssinaturaComplementarObrigatoria,
  ] = useState(false);
  const [modelo, setModelo] = useState<any>(null);
  const [empresaAnamneseId, setEmpresaAnamneseId] = useState<string | null>(
    null,
  );
  const [campos, setCampos] = useState<CampoAnamnese[]>([]);
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [justificativas, setJustificativas] = useState<Record<string, string>>(
    {},
  );
  const [aceitaTermo, setAceitaTermo] = useState(false);
  const [assinatura, setAssinatura] = useState("");
  const [anamnesePreenchida, setAnamnesePreenchida] = useState<any>(null);
  const [pdfAnamneseUrl, setPdfAnamneseUrl] = useState("");
  const [modoAtualizacaoAnamnese, setModoAtualizacaoAnamnese] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const acessoBloqueadoPorAnamnese =
    anamneseObrigatoria || assinaturaComplementarObrigatoria;

  function levarParaAnamneseObrigatoria() {
    setAba("anamnese");
    setModalAnamneseAberto(true);
    setMensagem(
      assinaturaComplementarObrigatoria
        ? "Para continuar, assine sua ficha de anamnese."
        : "Para continuar, preencha a ficha de anamnese obrigatória."
    );
  }

  const [servicos, setServicos] = useState<ServicoCliente[]>([]);
  const [profissionais, setProfissionais] = useState<ProfissionalCliente[]>([]);
  const [novoAgendamentoAberto, setNovoAgendamentoAberto] = useState(false);
  const [servicoAgendamentoId, setServicoAgendamentoId] = useState("");
  const [profissionalAgendamentoId, setProfissionalAgendamentoId] =
    useState("");
  const [dataAgendamento, setDataAgendamento] = useState(hojeISO());
  const [horarioAgendamento, setHorarioAgendamento] = useState("");
  const [horariosLivres, setHorariosLivres] = useState<string[]>([]);
  const [carregandoHorarios, setCarregandoHorarios] = useState(false);
  const [salvandoAgendamento, setSalvandoAgendamento] = useState(false);
  const [valorAgendamentoFinal, setValorAgendamentoFinal] = useState<
    number | null
  >(null);
  const [precoEspecialAplicado, setPrecoEspecialAplicado] = useState(false);
  const [carregandoValorAgendamento, setCarregandoValorAgendamento] =
    useState(false);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (token) carregarPorToken(token);
  }, []);

  useEffect(() => {
    if (
      cliente &&
      servicoAgendamentoId &&
      profissionalAgendamentoId &&
      dataAgendamento
    ) {
      void carregarHorariosLivres();
    } else {
      setHorariosLivres([]);
      setHorarioAgendamento("");
    }
  }, [
    cliente,
    servicoAgendamentoId,
    profissionalAgendamentoId,
    dataAgendamento,
  ]);

  useEffect(() => {
    if (cliente && servicoAgendamentoId) {
      void atualizarValorAgendamento();
    } else {
      setValorAgendamentoFinal(null);
      setPrecoEspecialAplicado(false);
    }
  }, [cliente, servicoAgendamentoId]);

  async function carregarPorToken(token: string) {
    setCarregando(true);

    const { data } = await supabase
      .from("agendamentos")
      .select("cliente_id")
      .eq("token_cliente", token)
      .maybeSingle();

    if (data?.cliente_id) {
      await carregarCliente(data.cliente_id);
    } else {
      setMensagem("Link inválido ou expirado.");
    }

    setCarregando(false);
  }

  async function entrarPorTelefone() {
    const tel = limparTelefone(telefone);

    if (tel.length < 10) {
      setMensagem("Informe um telefone válido.");
      return;
    }

    setCarregando(true);
    setMensagem("");

    const { data, error } = await supabase.from("clientes").select("*");

    if (error) {
      setMensagem("Erro ao buscar cliente.");
      setCarregando(false);
      return;
    }

    const encontrado = (data || []).find((c) => {
      const telBanco = limparTelefone(c.telefone || "");
      return telBanco.endsWith(tel) || tel.endsWith(telBanco);
    });

    if (!encontrado) {
      setMensagem("Cliente não encontrado.");
      setCarregando(false);
      return;
    }

    await carregarCliente(encontrado.id);
    setCarregando(false);
  }

  async function obterEmpresaPublica() {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get("empresa") || params.get("slug");

    if (slug) {
      const { data } = await supabase
        .from("empresas")
        .select("id, nome, slug")
        .eq("slug", slug)
        .maybeSingle();

      if (data?.id) return data;
    }

    // Quando o Meu Espaço está sendo testado sem slug na URL, usamos a empresa
    // ativa salva no navegador pelo painel administrativo. Isso evita cadastrar
    // cliente em uma empresa diferente da que possui os serviços.
    const empresaSalvaId = localStorage.getItem("empresa_id");
    if (empresaSalvaId) {
      const { data } = await supabase
        .from("empresas")
        .select("id, nome, slug")
        .eq("id", empresaSalvaId)
        .maybeSingle();

      if (data?.id) return data;
    }

    // Fallback mais seguro: escolhe uma empresa que tenha serviços cadastrados.
    const { data: servicoComEmpresa } = await supabase
      .from("servicos")
      .select("empresa_id")
      .not("empresa_id", "is", null)
      .limit(1)
      .maybeSingle();

    if (servicoComEmpresa?.empresa_id) {
      const { data } = await supabase
        .from("empresas")
        .select("id, nome, slug")
        .eq("id", servicoComEmpresa.empresa_id)
        .maybeSingle();

      if (data?.id) return data;
    }

    const { data } = await supabase
      .from("empresas")
      .select("id, nome, slug")
      .limit(1);

    return data?.[0] || null;
  }

  async function buscarCepCadastro(cepDigitado: string) {
    const cepLimpo = cepDigitado.replace(/\D/g, "");

    setCadastro((atual) => ({ ...atual, cep: cepDigitado }));

    if (cepLimpo.length !== 8) return;

    try {
      setBuscandoCep(true);
      setMensagem("");

      const resposta = await fetch(
        `https://viacep.com.br/ws/${cepLimpo}/json/`,
      );
      const dados = await resposta.json();

      if (dados?.erro) {
        setMensagem("CEP não encontrado. Confira o número digitado.");
        return;
      }

      setCadastro((atual) => ({
        ...atual,
        cep: cepDigitado,
        endereco: dados.logradouro || "",
        bairro: dados.bairro || "",
        cidade: dados.localidade || "",
        estado: dados.uf || "",
      }));
    } catch (error) {
      setMensagem(
        "Não foi possível buscar o CEP agora. Preencha o endereço manualmente.",
      );
    } finally {
      setBuscandoCep(false);
    }
  }

  async function buscarCepEdicao(cepDigitado: string) {
    const cepLimpo = cepDigitado.replace(/\D/g, "");

    setDadosEdicao((atual) => ({ ...atual, cep: cepDigitado }));

    if (cepLimpo.length !== 8) return;

    try {
      setBuscandoCep(true);
      setMensagem("");

      const resposta = await fetch(
        `https://viacep.com.br/ws/${cepLimpo}/json/`,
      );
      const dados = await resposta.json();

      if (dados?.erro) {
        setMensagem("CEP não encontrado. Confira o número digitado.");
        return;
      }

      setDadosEdicao((atual) => ({
        ...atual,
        cep: cepDigitado,
        endereco: dados.logradouro || "",
        bairro: dados.bairro || "",
        cidade: dados.localidade || "",
        estado: dados.uf || "",
      }));
    } catch (error) {
      setMensagem(
        "Não foi possível buscar o CEP agora. Preencha o endereço manualmente.",
      );
    } finally {
      setBuscandoCep(false);
    }
  }

  function iniciarEdicaoDados() {
    if (!cliente) return;

    setMensagem("");
    setDadosEdicao({
      nome: cliente.nome || "",
      email: cliente.email || "",
      data_nascimento: cliente.data_nascimento || "",
      cep: cliente.cep || "",
      endereco: cliente.endereco || "",
      numero: cliente.numero || "",
      bairro: cliente.bairro || "",
      cidade: cliente.cidade || "",
      estado: cliente.estado || "",
    });
    setEditandoDados(true);
  }

  function cancelarEdicaoDados() {
    setMensagem("");
    setEditandoDados(false);
  }

  async function salvarDadosCliente() {
    if (!cliente?.id) return;

    const nome = dadosEdicao.nome.trim();

    if (!nome) {
      setMensagem("Informe seu nome completo.");
      return;
    }

    setSalvandoDados(true);
    setMensagem("");

    const payload = {
      nome,
      email: dadosEdicao.email.trim() || null,
      data_nascimento: dadosEdicao.data_nascimento || null,
      cep: dadosEdicao.cep || null,
      endereco: dadosEdicao.endereco || null,
      numero: dadosEdicao.numero || null,
      bairro: dadosEdicao.bairro || null,
      cidade: dadosEdicao.cidade || null,
      estado: dadosEdicao.estado || null,
    };

    const { data, error } = await supabase
      .from("clientes")
      .update(payload)
      .eq("id", cliente.id)
      .select("*")
      .single();

    if (error) {
      setMensagem("Erro ao atualizar dados: " + error.message);
      setSalvandoDados(false);
      return;
    }

    setCliente(data || { ...cliente, ...payload });
    setEditandoDados(false);
    setSalvandoDados(false);
    setMensagem("Dados atualizados com sucesso.");
  }

  async function cadastrarClienteMeuEspaco() {
    const nome = cadastro.nome.trim();
    const telefoneCadastro = limparTelefone(cadastro.telefone);
    const email = cadastro.email.trim();

    if (!nome) {
      setMensagem("Informe seu nome completo.");
      return;
    }

    if (telefoneCadastro.length < 10) {
      setMensagem("Informe um telefone válido.");
      return;
    }

    setCadastrando(true);
    setMensagem("");

    const empresa = await obterEmpresaPublica();

    if (!empresa?.id) {
      setMensagem(
        "Não foi possível identificar a empresa para concluir o cadastro.",
      );
      setCadastrando(false);
      return;
    }

    const { data: clientesExistentes, error: erroBusca } = await supabase
      .from("clientes")
      .select("*")
      .eq("empresa_id", empresa.id);

    if (erroBusca) {
      setMensagem("Erro ao validar telefone. Tente novamente.");
      setCadastrando(false);
      return;
    }

    const clienteJaExiste = (clientesExistentes || []).find((c) => {
      const telBanco = limparTelefone(c.telefone || "");
      return (
        telBanco.endsWith(telefoneCadastro) ||
        telefoneCadastro.endsWith(telBanco)
      );
    });

    if (clienteJaExiste?.id) {
      setMensagem(
        "Este telefone já possui cadastro. Clique em Já tenho cadastro e entre usando esse número.",
      );
      setCadastrando(false);
      return;
    }

    const { data: novoCliente, error } = await supabase
      .from("clientes")
      .insert({
        nome,
        telefone: telefoneCadastro,
        email: email || null,
        data_nascimento: cadastro.data_nascimento || null,
        cep: cadastro.cep || null,
        endereco: cadastro.endereco || null,
        numero: cadastro.numero || null,
        bairro: cadastro.bairro || null,
        cidade: cadastro.cidade || null,
        estado: cadastro.estado || null,
        empresa_id: empresa.id,
      })
      .select("*")
      .single();

    if (error) {
      setMensagem("Erro ao cadastrar cliente: " + error.message);
      setCadastrando(false);
      return;
    }

    if (novoCliente?.id) {
      setTelefone(telefoneCadastro);
      setCadastro({
        nome: "",
        telefone: "",
        email: "",
        data_nascimento: "",
        cep: "",
        endereco: "",
        numero: "",
        bairro: "",
        cidade: "",
        estado: "",
      });
      setModoCadastro(false);
      await carregarCliente(novoCliente.id);
    }

    setCadastrando(false);
  }

  async function carregarCliente(clienteId: string) {
    const { data } = await supabase
      .from("clientes")
      .select("*")
      .eq("id", clienteId)
      .maybeSingle();

    if (!data) {
      setMensagem("Cliente não encontrado.");
      return;
    }

    setCliente(data);

    const ags = await carregarAgendamentos(data.id);
    await carregarHistorico(data.id);

    const empresaId =
      data.empresa_id || ags.find((a: any) => a.empresa_id)?.empresa_id || null;
    await carregarAnamnese(data.id, empresaId);
    await carregarOpcoesAgendamento(empresaId);
  }

  async function carregarAgendamentos(clienteId: string) {
    const { data } = await supabase
      .from("agendamentos")
      .select("*")
      .eq("cliente_id", clienteId)
      .neq("status", "finalizado")
      .order("data", { ascending: true });

    setAgendamentos(data || []);
    return data || [];
  }

  async function carregarHistorico(clienteId: string) {
    const { data } = await supabase
      .from("agendamentos")
      .select("*")
      .eq("cliente_id", clienteId)
      .eq("status", "finalizado")
      .order("data", { ascending: false });

    setHistorico(data || []);
  }

  async function carregarOpcoesAgendamento(empresaId: string | null) {
    if (!empresaId) return;

    let empresaConsultaId = empresaId;

    let servicosRes = await supabase
      .from("servicos")
      .select("*")
      .eq("empresa_id", empresaConsultaId)
      .order("nome", { ascending: true });

    // Se o cliente novo foi cadastrado em uma empresa sem serviços, tentamos
    // localizar a empresa correta a partir do navegador/serviços existentes.
    if (!servicosRes.error && (servicosRes.data || []).length === 0) {
      const empresaSalvaId = localStorage.getItem("empresa_id");
      if (empresaSalvaId && empresaSalvaId !== empresaConsultaId) {
        const tentativa = await supabase
          .from("servicos")
          .select("*")
          .eq("empresa_id", empresaSalvaId)
          .order("nome", { ascending: true });

        if (!tentativa.error && (tentativa.data || []).length > 0) {
          empresaConsultaId = empresaSalvaId;
          servicosRes = tentativa;

          if (cliente?.id) {
            await supabase
              .from("clientes")
              .update({ empresa_id: empresaConsultaId })
              .eq("id", cliente.id);

            setCliente((atual: any) =>
              atual ? { ...atual, empresa_id: empresaConsultaId } : atual,
            );
          }
        }
      }
    }

    if (!servicosRes.error && (servicosRes.data || []).length === 0) {
      const todosServicos = await supabase
        .from("servicos")
        .select("*")
        .order("nome", { ascending: true });

      if (!todosServicos.error && (todosServicos.data || []).length > 0) {
        empresaConsultaId =
          todosServicos.data?.[0]?.empresa_id || empresaConsultaId;
        servicosRes = todosServicos;

        if (cliente?.id && empresaConsultaId) {
          await supabase
            .from("clientes")
            .update({ empresa_id: empresaConsultaId })
            .eq("id", cliente.id);

          setCliente((atual: any) =>
            atual ? { ...atual, empresa_id: empresaConsultaId } : atual,
          );
        }
      }
    }

    const profissionaisRes = await supabase
      .from("profissionais")
      .select("*")
      .eq("empresa_id", empresaConsultaId)
      .order("nome", { ascending: true });

    if (servicosRes.error) {
      console.error(
        "Erro ao carregar serviços no Meu Espaço:",
        servicosRes.error,
      );
      setServicos([]);
    } else {
      setServicos((servicosRes.data || []) as ServicoCliente[]);
    }

    if (profissionaisRes.error) {
      console.error(
        "Erro ao carregar profissionais no Meu Espaço:",
        profissionaisRes.error,
      );
      setProfissionais([]);
    } else {
      setProfissionais((profissionaisRes.data || []) as ProfissionalCliente[]);
    }
  }

  function pegarServicoSelecionado() {
    return servicos.find((item) => item.id === servicoAgendamentoId) || null;
  }

  function pegarProfissionalSelecionado() {
    return (
      profissionais.find((item) => item.id === profissionalAgendamentoId) ||
      null
    );
  }

  function precoBaseServico(servico: ServicoCliente | null) {
    const valor = Number(
      servico?.preco_promocional ?? servico?.preco ?? servico?.valor ?? 0,
    );

    return Number.isNaN(valor) ? 0 : valor;
  }

  async function calcularValorServicoCliente(
    servico: ServicoCliente | null,
    clienteAtual = cliente,
  ) {
    if (!servico) {
      return { valor: 0, especial: false };
    }

    const valorPadrao = precoBaseServico(servico);

    if (!clienteAtual?.id) {
      return { valor: valorPadrao, especial: false };
    }

    const { data, error } = await supabase
      .from("cliente_precos_servicos")
      .select("valor_especial")
      .eq("cliente_id", clienteAtual.id)
      .eq("servico_id", servico.id)
      .eq("ativo", true)
      .maybeSingle();

    if (error) {
      console.warn("Erro ao buscar preço especial do cliente:", error);
      return { valor: valorPadrao, especial: false };
    }

    const valorEspecial = Number(data?.valor_especial);

    if (data && !Number.isNaN(valorEspecial) && valorEspecial >= 0) {
      return { valor: valorEspecial, especial: true };
    }

    return { valor: valorPadrao, especial: false };
  }

  async function atualizarValorAgendamento() {
    const servicoSelecionado = pegarServicoSelecionado();

    if (!servicoSelecionado) {
      setValorAgendamentoFinal(null);
      setPrecoEspecialAplicado(false);
      return;
    }

    setCarregandoValorAgendamento(true);
    const resultado = await calcularValorServicoCliente(servicoSelecionado);
    setValorAgendamentoFinal(resultado.valor);
    setPrecoEspecialAplicado(resultado.especial);
    setCarregandoValorAgendamento(false);
  }

  async function criarLancamentoFinanceiroAgendamento(
    agendamentoId: string | null,
    servicoSelecionado: ServicoCliente,
    profissionalSelecionado: ProfissionalCliente,
    valorFinal: number,
    especialAplicado: boolean,
  ) {
    const payloadFinanceiro = {
      empresa_id: cliente.empresa_id,
      tipo: "entrada",
      descricao: `Agendamento pelo cliente: ${servicoSelecionado.nome}`,
      valor: valorFinal,
      data_lancamento: dataAgendamento,
      status: "pendente",
      cliente: cliente.nome || null,
      profissional: profissionalSelecionado.nome || null,
      servico: servicoSelecionado.nome || null,
      agendamento_id: agendamentoId,
      forma_pagamento: null,
      data_pagamento: null,
      observacoes: especialAplicado
        ? "Preço especial por serviço aplicado automaticamente no Meu Espaço."
        : "Lançamento gerado automaticamente pelo Meu Espaço.",
    };

    const { error } = await supabase
      .from("financeiro")
      .insert([payloadFinanceiro]);

    if (error) {
      console.error("Erro ao gerar financeiro do agendamento:", error);
      alert(
        "Agendamento criado, mas houve erro ao lançar no financeiro: " +
          error.message,
      );
    }
  }

  function duracaoTotalServico(servico: ServicoCliente | null) {
    const duracaoBase = Number(
      servico?.duracao_padrao_minutos || servico?.duracao || 60,
    );
    return duracaoBase + 10;
  }

  function existeConflitoHorario(
    horarioInicio: string,
    duracaoMinutos: number,
    agendamentosDia: any[],
  ) {
    const horarioFim = somarMinutos(horarioInicio, duracaoMinutos);

    return agendamentosDia.some((item) => {
      if (item.status === "cancelado") return false;

      const inicioExistente = item.horario;
      const fimExistente = somarMinutos(
        item.horario,
        Number(item.duracao_minutos || 60),
      );

      return horarioInicio < fimExistente && horarioFim > inicioExistente;
    });
  }

  async function carregarHorariosLivres() {
    const servicoSelecionado = pegarServicoSelecionado();

    if (
      !cliente?.empresa_id ||
      !servicoSelecionado ||
      !profissionalAgendamentoId ||
      !dataAgendamento
    ) {
      setHorariosLivres([]);
      return;
    }

    setCarregandoHorarios(true);
    setHorarioAgendamento("");

    const duracaoTotal = duracaoTotalServico(servicoSelecionado);
    const profissionalSelecionado = pegarProfissionalSelecionado();

    if (!profissionalSelecionado) {
      setHorariosLivres([]);
      setCarregandoHorarios(false);
      return;
    }

    const inicioExpediente = normalizarHorario(
      profissionalSelecionado.inicio_expediente,
      "08:00",
    );
    const fimExpediente = normalizarHorario(
      profissionalSelecionado.fim_expediente,
      "18:00",
    );
    const inicioAlmoco = normalizarHorario(
      profissionalSelecionado.inicio_almoco,
    );
    const fimAlmoco = normalizarHorario(profissionalSelecionado.fim_almoco);
    const intervaloAgenda = obterIntervaloAgenda(profissionalSelecionado);

    const { data: agendamentosDia, error } = await supabase
      .from("agendamentos")
      .select("id, data, horario, status, duracao_minutos, profissional_id")
      .eq("empresa_id", cliente.empresa_id)
      .eq("profissional_id", profissionalAgendamentoId)
      .eq("data", dataAgendamento)
      .neq("status", "cancelado");

    if (error) {
      console.error("Erro ao buscar horários:", error);
      alert("Erro ao buscar horários disponíveis: " + error.message);
      setHorariosLivres([]);
      setCarregandoHorarios(false);
      return;
    }

    const livres = gerarHorariosBase(
      inicioExpediente,
      fimExpediente,
      intervaloAgenda,
    ).filter((horario) => {
      const fimServico = somarMinutos(horario, duracaoTotal);

      if (horario < inicioExpediente) return false;
      if (fimServico > fimExpediente) return false;

      if (
        horarioSobrepoeIntervalo(
          horario,
          duracaoTotal,
          inicioAlmoco,
          fimAlmoco,
        )
      ) {
        return false;
      }

      return !existeConflitoHorario(
        horario,
        duracaoTotal,
        agendamentosDia || [],
      );
    });

    setHorariosLivres(livres);
    setCarregandoHorarios(false);
  }

  async function salvarNovoAgendamentoCliente() {
    if (acessoBloqueadoPorAnamnese) {
      levarParaAnamneseObrigatoria();
      alert(
        assinaturaComplementarObrigatoria
          ? "Para agendar, primeiro assine sua ficha de anamnese."
          : "Para agendar, primeiro preencha a ficha de anamnese obrigatória."
      );
      return;
    }

    if (!cliente?.empresa_id) {
      alert("Empresa não encontrada para este cliente.");
      return;
    }

    const servicoSelecionado = pegarServicoSelecionado();
    const profissionalSelecionado = pegarProfissionalSelecionado();

    if (
      !servicoSelecionado ||
      !profissionalSelecionado ||
      !dataAgendamento ||
      !horarioAgendamento
    ) {
      alert("Escolha serviço, profissional, data e horário.");
      return;
    }

    const duracaoTotal = duracaoTotalServico(servicoSelecionado);

    const inicioExpediente = normalizarHorario(
      profissionalSelecionado.inicio_expediente,
      "08:00",
    );
    const fimExpediente = normalizarHorario(
      profissionalSelecionado.fim_expediente,
      "18:00",
    );

    if (
      horarioAgendamento < inicioExpediente ||
      somarMinutos(horarioAgendamento, duracaoTotal) > fimExpediente
    ) {
      alert("Este horário está fora do expediente do profissional.");
      await carregarHorariosLivres();
      return;
    }

    if (
      horarioSobrepoeIntervalo(
        horarioAgendamento,
        duracaoTotal,
        profissionalSelecionado.inicio_almoco,
        profissionalSelecionado.fim_almoco,
      )
    ) {
      alert("Este horário está no intervalo de almoço do profissional. Escolha outro horário.");
      await carregarHorariosLivres();
      return;
    }

    const { data: agendamentosDia, error: erroConsulta } = await supabase
      .from("agendamentos")
      .select("id, horario, status, duracao_minutos")
      .eq("empresa_id", cliente.empresa_id)
      .eq("profissional_id", profissionalSelecionado.id)
      .eq("data", dataAgendamento)
      .neq("status", "cancelado");

    if (erroConsulta) {
      alert("Erro ao validar horário: " + erroConsulta.message);
      return;
    }

    if (
      existeConflitoHorario(
        horarioAgendamento,
        duracaoTotal,
        agendamentosDia || [],
      )
    ) {
      alert("Já existe um agendamento nesse intervalo. Escolha outro horário.");
      await carregarHorariosLivres();
      return;
    }

    setSalvandoAgendamento(true);

    const valorCalculado =
      await calcularValorServicoCliente(servicoSelecionado);

    const { data: agendamentoCriado, error } = await supabase
      .from("agendamentos")
      .insert([
        {
          empresa_id: cliente.empresa_id,
          cliente: cliente.nome,
          cliente_id: cliente.id,
          servico: servicoSelecionado.nome,
          servico_id: servicoSelecionado.id,
          profissional: profissionalSelecionado.nome,
          profissional_id: profissionalSelecionado.id,
          data: dataAgendamento,
          horario: horarioAgendamento,
          duracao_minutos: duracaoTotal,
          status: "agendado",
          no_show: false,
          observacoes: valorCalculado.especial
            ? `Agendamento realizado pelo Meu Espaço. Preço especial aplicado: ${formatarMoeda(valorCalculado.valor)}`
            : "Agendamento realizado pelo Meu Espaço",
        },
      ])
      .select("id")
      .single();

    if (error) {
      setSalvandoAgendamento(false);
      alert("Erro ao criar agendamento: " + error.message);
      return;
    }

    await criarLancamentoFinanceiroAgendamento(
      agendamentoCriado?.id || null,
      servicoSelecionado,
      profissionalSelecionado,
      valorCalculado.valor,
      valorCalculado.especial,
    );

    setSalvandoAgendamento(false);

    alert("Agendamento criado com sucesso!");
    setNovoAgendamentoAberto(false);
    setServicoAgendamentoId("");
    setProfissionalAgendamentoId("");
    setDataAgendamento(hojeISO());
    setHorarioAgendamento("");
    setValorAgendamentoFinal(null);
    setPrecoEspecialAplicado(false);
    await carregarAgendamentos(cliente.id);
  }

  async function carregarAnamnese(clienteId: string, empresaId: string | null) {
    let query = supabase
      .from("anamnese_modelos")
      .select("*")
      .eq("ativo", true)
      .limit(1);

    if (empresaId) {
      query = query.or(`empresa_id.eq.${empresaId},empresa_id.is.null`);
    }

    const { data: modeloData } = await query.maybeSingle();

    if (!modeloData) {
      setModelo(null);
      setCampos([]);
      setEmpresaAnamneseId(empresaId || null);
      setAnamneseObrigatoria(false);
      setModalAnamneseAberto(false);
      setAnamnesePreenchida(null);
      setPdfAnamneseUrl("");
      setAssinaturaComplementarObrigatoria(false);
      return;
    }

    setModelo(modeloData);
    setEmpresaAnamneseId(modeloData.empresa_id || empresaId || null);

    const { data: camposData } = await supabase
      .from("anamnese_campos")
      .select("*")
      .eq("modelo_id", modeloData.id)
      .eq("ativo", true)
      .order("ordem", { ascending: true });

    setCampos(camposData || []);

    const { data: preenchida } = await supabase
      .from("anamneses_clientes")
      .select("*")
      .eq("cliente_id", clienteId)
      .eq("preenchido", true)
      .order("preenchido_em", { ascending: false })
      .limit(1);

    const fichaPreenchida =
      preenchida && preenchida.length > 0 ? preenchida[0] : null;
    setAnamnesePreenchida(fichaPreenchida);
    setPdfAnamneseUrl(fichaPreenchida?.pdf_url || "");

    const fichaVencida = fichaPreenchida
      ? anamneseEstaVencida(fichaPreenchida)
      : false;

    // Regra de produção:
    // - Sem ficha preenchida: bloqueia e força preenchimento.
    // - Ficha vencida após 12 meses: bloqueia e força atualização.
    // - Ficha preenchida sem assinatura: bloqueia e pede apenas assinatura complementar.
    // A anamnese ativa deve ser obrigatória no Meu Espaço para liberar agendamento, dados e histórico.
    const precisaPreencher = !fichaPreenchida || fichaVencida;
    const precisaAssinarFichaAntiga =
      Boolean(fichaPreenchida) && !fichaVencida && !fichaPreenchida?.assinatura;

    setAnamneseObrigatoria(precisaPreencher);
    setAssinaturaComplementarObrigatoria(precisaAssinarFichaAntiga);
    setModoAtualizacaoAnamnese(false);

    if (precisaPreencher || precisaAssinarFichaAntiga) {
      setRespostas({});
      setJustificativas({});
      setAceitaTermo(false);
      setAssinatura("");
      setAba("anamnese");
      setModalAnamneseAberto(true);
    } else {
      setModalAnamneseAberto(false);
      setAba("agenda");
    }
  }

  async function carregarRespostasAnamneseAtual() {
    if (!anamnesePreenchida?.id) {
      setRespostas({});
      setJustificativas({});
      return;
    }

    const { data } = await supabase
      .from("anamnese_respostas")
      .select("campo_id, resposta")
      .eq("anamnese_id", anamnesePreenchida.id);

    const novasRespostas: Record<string, string> = {};
    const novasJustificativas: Record<string, string> = {};

    (data || []).forEach((item: any) => {
      const campo = campos.find((c) => c.id === item?.campo_id);
      const respostaSalva = String(item?.resposta || "");

      if (
        campo?.tipo === "sim_nao_justificativa" &&
        respostaSalva.startsWith("Sim - ")
      ) {
        novasRespostas[item.campo_id] = "Sim";
        novasJustificativas[item.campo_id] = respostaSalva.replace(
          "Sim - ",
          "",
        );
      } else {
        novasRespostas[item.campo_id] = respostaSalva;
      }
    });

    setRespostas(novasRespostas);
    setJustificativas(novasJustificativas);
  }

  async function abrirAtualizacaoAnamnese() {
    await carregarRespostasAnamneseAtual();
    setModoAtualizacaoAnamnese(true);
    setAceitaTermo(false);
    setAssinatura("");
    setAba("anamnese");
  }

  function cancelarAtualizacaoAnamnese() {
    setModoAtualizacaoAnamnese(false);
    setRespostas({});
    setJustificativas({});
    setAceitaTermo(false);
    setAssinatura("");
  }

  function alterarResposta(id: string, valor: string) {
    setRespostas((prev) => ({ ...prev, [id]: valor }));

    if (valor !== "Sim") {
      setJustificativas((prev) => ({ ...prev, [id]: "" }));
    }
  }

  function alterarJustificativa(id: string, valor: string) {
    setJustificativas((prev) => ({ ...prev, [id]: valor }));
  }

  async function buscarIpCliente() {
    try {
      const resposta = await fetch("https://api.ipify.org?format=json");
      const dados = await resposta.json();
      return dados?.ip || "Não informado";
    } catch {
      return "Não informado";
    }
  }

  function montarRespostasParaPdf() {
    const respostasPdf: Record<string, string> = {};

    campos.forEach((campo) => {
      const resposta = respostas[campo.id] || "";
      const justificativa = justificativas[campo.id] || "";

      respostasPdf[campo.label] =
        campo.tipo === "sim_nao_justificativa" && resposta === "Sim"
          ? `Sim - ${justificativa}`
          : resposta;
    });

    return respostasPdf;
  }

  async function baixarPdfAnamnese() {
    if (pdfAnamneseUrl) {
      window.open(pdfAnamneseUrl, "_blank");
      return;
    }

    if (!anamnesePreenchida) {
      alert("PDF ainda não disponível para esta ficha.");
      return;
    }

    const { data: respostasSalvas } = await supabase
      .from("anamnese_respostas")
      .select("campo_id, resposta")
      .eq("anamnese_id", anamnesePreenchida.id);

    const respostasPdf: Record<string, string> = {};

    (respostasSalvas || []).forEach((item: any) => {
      const campo = campos.find((c) => c.id === item?.campo_id);
      const label = campo?.label || "Campo";
      respostasPdf[label] = item?.resposta || "";
    });

    const blob = gerarPdfBlob({
      empresaNome: cliente?.empresa_nome || "Seu estabelecimento",
      clienteNome: cliente?.nome || "Cliente",
      respostas: respostasPdf,
      assinatura: anamnesePreenchida?.assinatura || "",
      hash: anamnesePreenchida?.hash || "",
      ip: anamnesePreenchida?.ip || "",
      data:
        anamnesePreenchida?.data_assinatura ||
        anamnesePreenchida?.preenchido_em ||
        new Date().toISOString(),
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `anamnese-${cliente?.nome || "cliente"}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function salvarAssinaturaComplementar() {
    if (!cliente || !anamnesePreenchida) return;

    if (modelo?.termo_responsabilidade && !aceitaTermo) {
      alert("Aceite o termo de responsabilidade.");
      return;
    }

    if (!assinatura) {
      alert("Assine a ficha antes de enviar.");
      return;
    }

    setSalvando(true);

    const dataAssinatura = new Date().toISOString();
    const ip = await buscarIpCliente();

    const { data: respostasSalvas } = await supabase
      .from("anamnese_respostas")
      .select("campo_id, resposta")
      .eq("anamnese_id", anamnesePreenchida.id);

    const respostasPdf: Record<string, string> = {};

    (respostasSalvas || []).forEach((item: any) => {
      const campo = campos.find((c) => c.id === item?.campo_id);
      const label = campo?.label || "Campo";
      respostasPdf[label] = item?.resposta || "";
    });

    const hash = await gerarHash(
      JSON.stringify({
        anamnese_id: anamnesePreenchida.id,
        cliente_id: cliente.id,
        cliente_nome: cliente.nome,
        respostas: respostasPdf,
        assinatura,
        ip,
        dataAssinatura,
      }),
    );

    let pdfUrl = "";

    try {
      const pdfBlob = gerarPdfBlob({
        empresaNome: cliente?.empresa_nome || "Seu estabelecimento",
        clienteNome: cliente?.nome || "Cliente",
        respostas: respostasPdf,
        assinatura,
        hash,
        ip,
        data: dataAssinatura,
      });

      pdfUrl = await uploadPdfAnamnese(
        pdfBlob,
        cliente.nome || "cliente",
        anamnesePreenchida.id,
      );
    } catch (erroPdf) {
      console.warn(
        "Assinatura salva, mas houve erro ao gerar/upload do PDF:",
        erroPdf,
      );
    }

    const payloadCompleto: Record<string, any> = {
      assinatura,
      ip,
      hash,
      data_assinatura: dataAssinatura,
      aceita_termo: Boolean(
        modelo?.termo_responsabilidade ? aceitaTermo : true,
      ),
      pdf_url: pdfUrl || anamnesePreenchida?.pdf_url || null,
    };

    const payloadSemPdf: Record<string, any> = { ...payloadCompleto };
    delete payloadSemPdf.pdf_url;

    let error: any = null;

    for (const payload of [payloadCompleto, payloadSemPdf]) {
      const resultado = await supabase
        .from("anamneses_clientes")
        .update(payload)
        .eq("id", anamnesePreenchida.id);

      error = resultado.error;

      if (!error) break;

      const mensagemErro = String(error?.message || "").toLowerCase();
      const erroColuna =
        mensagemErro.includes("column") ||
        mensagemErro.includes("schema cache") ||
        mensagemErro.includes("could not find");

      if (!erroColuna) break;
    }

    if (error) {
      console.error("Erro ao salvar assinatura:", error);
      alert("Erro ao salvar assinatura: " + error.message);
      setSalvando(false);
      return;
    }

    alert("Assinatura salva com sucesso!");
    setAnamnesePreenchida({
      ...anamnesePreenchida,
      assinatura,
      ip,
      hash,
      data_assinatura: dataAssinatura,
      pdf_url: pdfUrl || anamnesePreenchida?.pdf_url || "",
    });
    setPdfAnamneseUrl(pdfUrl || anamnesePreenchida?.pdf_url || "");
    setAssinaturaComplementarObrigatoria(false);
    setModoAtualizacaoAnamnese(false);
    setModalAnamneseAberto(false);
    setAba("agenda");
    setAceitaTermo(false);
    setAssinatura("");
    setSalvando(false);
  }

  async function salvarAnamnese() {
    if (!cliente || !modelo) return;

    for (const campo of campos) {
      const resposta = String(respostas[campo.id] || "").trim();
      const justificativa = String(justificativas[campo.id] || "").trim();

      if (campo.obrigatorio && !resposta) {
        alert(`Preencha: ${campo.label}`);
        return;
      }

      if (
        campo.tipo === "sim_nao_justificativa" &&
        resposta === "Sim" &&
        !justificativa
      ) {
        alert(`Descreva os detalhes de: ${campo.label}`);
        return;
      }
    }

    if (modelo?.termo_responsabilidade && !aceitaTermo) {
      alert("Aceite o termo de responsabilidade.");
      return;
    }

    if (!assinatura) {
      alert("Assine a ficha antes de enviar.");
      return;
    }

    setSalvando(true);

    const dataAssinatura = new Date().toISOString();
    const ip = await buscarIpCliente();
    const respostasPdf = montarRespostasParaPdf();
    const hash = await gerarHash(
      JSON.stringify({
        cliente_id: cliente.id,
        cliente_nome: cliente.nome,
        modelo_id: modelo.id,
        respostas: respostasPdf,
        assinatura,
        ip,
        dataAssinatura,
      }),
    );

    const payloadCompleto: Record<string, any> = {
      cliente_id: cliente.id,
      cliente_nome: cliente.nome,
      empresa_id: empresaAnamneseId || cliente.empresa_id || null,
      modelo_id: modelo.id,
      preenchido: true,
      aceita_termo: Boolean(
        modelo?.termo_responsabilidade ? aceitaTermo : true,
      ),
      preenchido_em: dataAssinatura,
      assinatura,
      ip,
      hash,
      data_assinatura: dataAssinatura,
    };

    const payloadSemModelo: Record<string, any> = { ...payloadCompleto };
    delete payloadSemModelo.modelo_id;

    const payloadMinimo: Record<string, any> = {
      cliente_id: cliente.id,
      cliente_nome: cliente.nome,
      preenchido: true,
      aceita_termo: Boolean(
        modelo?.termo_responsabilidade ? aceitaTermo : true,
      ),
      preenchido_em: dataAssinatura,
      assinatura,
      ip,
      hash,
      data_assinatura: dataAssinatura,
    };

    let anamnese: any = null;
    let error: any = null;

    for (const payload of [payloadCompleto, payloadSemModelo, payloadMinimo]) {
      const resultado = await supabase
        .from("anamneses_clientes")
        .insert(payload)
        .select("id")
        .single();

      anamnese = resultado.data;
      error = resultado.error;

      if (!error && anamnese?.id) break;

      const mensagemErro = String(error?.message || "").toLowerCase();
      const erroColuna =
        mensagemErro.includes("column") ||
        mensagemErro.includes("schema cache") ||
        mensagemErro.includes("could not find");

      if (!erroColuna) break;
    }

    if (error || !anamnese) {
      console.error("Erro ao salvar anamnese:", error);
      alert(
        "Erro ao salvar anamnese: " +
          (error?.message || "registro não retornado"),
      );
      setSalvando(false);
      return;
    }

    const { error: erroRespostas } = await supabase
      .from("anamnese_respostas")
      .insert(
        campos.map((campo) => {
          const resposta = respostas[campo.id] || "";
          const justificativa = justificativas[campo.id] || "";

          return {
            anamnese_id: anamnese.id,
            campo_id: campo.id,
            resposta:
              campo.tipo === "sim_nao_justificativa" && resposta === "Sim"
                ? `Sim - ${justificativa}`
                : resposta,
          };
        }),
      );

    if (erroRespostas) {
      console.error("Erro ao salvar respostas:", erroRespostas);
      alert(
        "A ficha foi criada, mas houve erro ao salvar as respostas: " +
          erroRespostas.message,
      );
      setSalvando(false);
      return;
    }

    let pdfUrl = "";

    try {
      const pdfBlob = gerarPdfBlob({
        empresaNome: cliente?.empresa_nome || "Seu estabelecimento",
        clienteNome: cliente?.nome || "Cliente",
        respostas: respostasPdf,
        assinatura,
        hash,
        ip,
        data: dataAssinatura,
      });

      pdfUrl = await uploadPdfAnamnese(
        pdfBlob,
        cliente.nome || "cliente",
        anamnese.id,
      );

      const { error: erroPdfUrl } = await supabase
        .from("anamneses_clientes")
        .update({ pdf_url: pdfUrl })
        .eq("id", anamnese.id);

      if (erroPdfUrl) {
        console.warn(
          "PDF gerado, mas não foi possível salvar a URL no banco:",
          erroPdfUrl,
        );
      }
    } catch (erroPdf) {
      console.warn(
        "Anamnese salva, mas houve erro ao gerar/upload do PDF:",
        erroPdf,
      );
    }

    alert("Anamnese salva com sucesso!");
    setAnamnesePreenchida({
      id: anamnese.id,
      assinatura,
      ip,
      hash,
      data_assinatura: dataAssinatura,
      preenchido_em: dataAssinatura,
      pdf_url: pdfUrl,
    });
    setPdfAnamneseUrl(pdfUrl);
    setAnamneseObrigatoria(false);
    setAssinaturaComplementarObrigatoria(false);
    setModoAtualizacaoAnamnese(false);
    setModalAnamneseAberto(false);
    setAba("agenda");
    setRespostas({});
    setJustificativas({});
    setAceitaTermo(false);
    setAssinatura("");
    setSalvando(false);
  }

  function sair() {
    setCliente(null);
    setTelefone("");
    setMensagem("");
    setAba("agenda");
    setAnamneseObrigatoria(false);
    setAssinaturaComplementarObrigatoria(false);
    setModalAnamneseAberto(false);
    setAssinatura("");
    setAnamnesePreenchida(null);
    setPdfAnamneseUrl("");
    setNovoAgendamentoAberto(false);
    setServicoAgendamentoId("");
    setProfissionalAgendamentoId("");
    setHorarioAgendamento("");
    setValorAgendamentoFinal(null);
    setPrecoEspecialAplicado(false);
  }

  function renderizarCampo(campo: CampoAnamnese) {
    const estiloCampo = {
      width: "100%",
      padding: 14,
      borderRadius: 14,
      border: "1px solid #cbd5e1",
      marginTop: 8,
      boxSizing: "border-box" as const,
    };

    const valor = respostas[campo.id] || "";
    const opcoes = Array.isArray(campo.opcoes) ? campo.opcoes : [];

    if (campo.tipo === "sim_nao" || campo.tipo === "sim_nao_justificativa") {
      return (
        <>
          <select
            value={valor}
            onChange={(e) => alterarResposta(campo.id, e.target.value)}
            style={estiloCampo}
          >
            <option value="">Selecione</option>
            <option value="Não">Não</option>
            <option value="Sim">Sim</option>
          </select>

          {campo.tipo === "sim_nao_justificativa" && valor === "Sim" && (
            <textarea
              value={justificativas[campo.id] || ""}
              onChange={(e) => alterarJustificativa(campo.id, e.target.value)}
              placeholder={campo.placeholder || "Descreva os detalhes"}
              style={{
                ...estiloCampo,
                minHeight: 90,
                marginTop: 10,
                background: "#fff7ed",
                border: "1px solid #fdba74",
              }}
            />
          )}
        </>
      );
    }

    if (campo.tipo === "textarea") {
      return (
        <textarea
          value={valor}
          onChange={(e) => alterarResposta(campo.id, e.target.value)}
          placeholder={campo.placeholder || ""}
          style={{ ...estiloCampo, minHeight: 100 }}
        />
      );
    }

    if (campo.tipo === "select") {
      return (
        <select
          value={valor}
          onChange={(e) => alterarResposta(campo.id, e.target.value)}
          style={estiloCampo}
        >
          <option value="">Selecione</option>
          {opcoes.map((opcao) => (
            <option key={opcao} value={opcao}>
              {opcao}
            </option>
          ))}
        </select>
      );
    }

    if (campo.tipo === "checkbox") {
      return (
        <label
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            marginTop: 10,
            fontWeight: 700,
          }}
        >
          <input
            type="checkbox"
            checked={valor === "Sim"}
            onChange={(e) =>
              alterarResposta(campo.id, e.target.checked ? "Sim" : "Não")
            }
          />
          Sim
        </label>
      );
    }

    return (
      <input
        type={
          campo.tipo === "date" || campo.tipo === "number" ? campo.tipo : "text"
        }
        value={valor}
        onChange={(e) => alterarResposta(campo.id, e.target.value)}
        placeholder={campo.placeholder || ""}
        style={estiloCampo}
      />
    );
  }

  const formularioAssinaturaComplementar = (
    <div>
      <h2 style={{ marginTop: 0 }}>Assinatura da anamnese</h2>

      <div
        style={{
          background: "#fff7ed",
          border: "1px solid #fed7aa",
          color: "#9a3412",
          borderRadius: 18,
          padding: 18,
          marginBottom: 20,
          fontWeight: 800,
        }}
      >
        Sua ficha já está preenchida. Para finalizar e liberar o acesso
        completo, assine o termo abaixo.
      </div>

      {modelo?.termo_responsabilidade && (
        <div
          style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: 18,
            padding: 18,
            marginTop: 20,
          }}
        >
          <strong>Termo de responsabilidade</strong>
          <p style={{ color: "#475569" }}>{modelo.termo_responsabilidade}</p>

          <label style={{ fontWeight: 800 }}>
            <input
              type="checkbox"
              checked={aceitaTermo}
              onChange={(e) => setAceitaTermo(e.target.checked)}
            />{" "}
            Li e aceito o termo.
          </label>
        </div>
      )}

      <div
        style={{
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: 18,
          padding: 18,
          marginTop: 20,
        }}
      >
        <strong>Assinatura do cliente *</strong>
        <p style={{ color: "#475569", marginTop: 6 }}>
          Assine abaixo para validar a ficha de anamnese já preenchida.
        </p>

        <AssinaturaCanvas onChange={setAssinatura} initialValue={assinatura} />
      </div>

      <button
        type="button"
        onClick={salvarAssinaturaComplementar}
        disabled={salvando}
        style={{
          marginTop: 22,
          padding: "15px 22px",
          borderRadius: 16,
          border: 0,
          background: "#282663",
          color: "#fff",
          fontWeight: 900,
          cursor: "pointer",
        }}
      >
        {salvando ? "Salvando..." : "Salvar assinatura"}
      </button>
    </div>
  );

  const formularioAnamnese = (
    <div>
      <h2 style={{ marginTop: 0 }}>{modelo?.titulo || "Anamnese"}</h2>

      {modelo?.descricao && (
        <p style={{ color: "#64748b" }}>{modelo.descricao}</p>
      )}

      {campos.map((campo) => (
        <div key={campo.id} style={{ marginBottom: 18 }}>
          <label style={{ fontWeight: 900 }}>
            {campo.label}
            {campo.obrigatorio ? " *" : ""}
          </label>

          {campo.ajuda && (
            <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 13 }}>
              {campo.ajuda}
            </p>
          )}

          {renderizarCampo(campo)}
        </div>
      ))}

      {modelo?.termo_responsabilidade && (
        <div
          style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: 18,
            padding: 18,
            marginTop: 20,
          }}
        >
          <strong>Termo de responsabilidade</strong>
          <p style={{ color: "#475569" }}>{modelo.termo_responsabilidade}</p>

          <label style={{ fontWeight: 800 }}>
            <input
              type="checkbox"
              checked={aceitaTermo}
              onChange={(e) => setAceitaTermo(e.target.checked)}
            />{" "}
            Li e aceito o termo.
          </label>
        </div>
      )}

      <div
        style={{
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: 18,
          padding: 18,
          marginTop: 20,
        }}
      >
        <strong>Assinatura do cliente *</strong>
        <p style={{ color: "#475569", marginTop: 6 }}>
          Assine abaixo para validar a ficha de anamnese.
        </p>

        <AssinaturaCanvas onChange={setAssinatura} initialValue={assinatura} />
      </div>

      <button
        type="button"
        onClick={salvarAnamnese}
        disabled={salvando}
        style={{
          marginTop: 22,
          padding: "15px 22px",
          borderRadius: 16,
          border: 0,
          background: "#282663",
          color: "#fff",
          fontWeight: 900,
          cursor: "pointer",
        }}
      >
        {salvando
          ? "Salvando..."
          : modoAtualizacaoAnamnese
            ? "Salvar atualização da anamnese"
            : "Enviar anamnese"}
      </button>

      {modoAtualizacaoAnamnese && (
        <button
          type="button"
          onClick={cancelarAtualizacaoAnamnese}
          disabled={salvando}
          style={{
            marginTop: 12,
            marginLeft: 10,
            padding: "15px 22px",
            borderRadius: 16,
            border: "1px solid #cbd5e1",
            background: "#fff",
            color: "#334155",
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          Cancelar atualização
        </button>
      )}
    </div>
  );

  const botaoAba = (valor: string, label: string) => {
    const abaBloqueada = acessoBloqueadoPorAnamnese && valor !== "anamnese";

    return (
      <button
        type="button"
        onClick={() => {
          if (abaBloqueada) {
            levarParaAnamneseObrigatoria();
            return;
          }

          setAba(valor);
        }}
        disabled={abaBloqueada}
        title={
          abaBloqueada
            ? assinaturaComplementarObrigatoria
              ? "Assine a anamnese para liberar esta área."
              : "Preencha a anamnese para liberar esta área."
            : undefined
        }
        style={{
          border: aba === valor ? "2px solid #282663" : "1px solid #cbd5e1",
          background: aba === valor ? "#282663" : "#fff",
          color: aba === valor ? "#fff" : "#282663",
          padding: "13px 18px",
          borderRadius: 16,
          fontWeight: 900,
          cursor: abaBloqueada ? "not-allowed" : "pointer",
          opacity: abaBloqueada ? 0.55 : 1,
        }}
      >
        {label}
      </button>
    );
  };

  if (!cliente) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #eef3fb, #dbe7f7)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 520,
            background: "#fff",
            borderRadius: 28,
            padding: 36,
            boxShadow: "0 24px 60px rgba(15,23,42,.16)",
            maxHeight: "calc(100vh - 48px)",
            overflowY: "auto",
          }}
        >
          <h1 style={{ margin: 0, color: "#0f172a", fontSize: 30 }}>
            Meu Espaço
          </h1>

          <p style={{ color: "#64748b", lineHeight: 1.5 }}>
            Acesse seus agendamentos, dados pessoais, anamnese e histórico.
          </p>

          {!modoCadastro ? (
            <>
              <label style={{ fontWeight: 800 }}>Telefone</label>

              <input
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="Ex: 11999999999"
                style={{
                  width: "100%",
                  padding: "15px 16px",
                  borderRadius: 16,
                  border: "1px solid #cbd5e1",
                  marginTop: 8,
                  fontSize: 16,
                  boxSizing: "border-box",
                }}
              />

              {mensagem && (
                <div
                  style={{
                    background: "#fee2e2",
                    color: "#991b1b",
                    borderRadius: 14,
                    padding: 12,
                    marginTop: 14,
                  }}
                >
                  {mensagem}
                </div>
              )}

              <button
                type="button"
                onClick={entrarPorTelefone}
                disabled={carregando}
                style={{
                  width: "100%",
                  marginTop: 18,
                  padding: 15,
                  borderRadius: 16,
                  border: 0,
                  background: "#282663",
                  color: "#fff",
                  fontWeight: 900,
                  fontSize: 16,
                  cursor: "pointer",
                }}
              >
                {carregando ? "Entrando..." : "Entrar"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setMensagem("");
                  setCadastro((atual) => ({ ...atual, telefone }));
                  setModoCadastro(true);
                }}
                style={{
                  width: "100%",
                  marginTop: 12,
                  padding: 14,
                  borderRadius: 16,
                  border: "1px solid #282663",
                  background: "#fff",
                  color: "#282663",
                  fontWeight: 900,
                  fontSize: 15,
                  cursor: "pointer",
                }}
              >
                Primeiro acesso? Cadastre-se
              </button>
            </>
          ) : (
            <>
              <h2
                style={{ margin: "18px 0 8px", color: "#0f172a", fontSize: 22 }}
              >
                Criar cadastro
              </h2>

              <p style={{ color: "#64748b", lineHeight: 1.5, marginTop: 0 }}>
                Preencha seus dados para acessar o Meu Espaço e realizar
                agendamentos.
              </p>

              <label style={{ fontWeight: 800 }}>Nome completo *</label>
              <input
                value={cadastro.nome}
                onChange={(e) =>
                  setCadastro({ ...cadastro, nome: e.target.value })
                }
                placeholder="Seu nome completo"
                style={{
                  width: "100%",
                  padding: "15px 16px",
                  borderRadius: 16,
                  border: "1px solid #cbd5e1",
                  marginTop: 8,
                  marginBottom: 12,
                  fontSize: 16,
                  boxSizing: "border-box",
                }}
              />

              <label style={{ fontWeight: 800 }}>Telefone *</label>
              <input
                value={cadastro.telefone}
                onChange={(e) =>
                  setCadastro({ ...cadastro, telefone: e.target.value })
                }
                placeholder="Ex: 11999999999"
                style={{
                  width: "100%",
                  padding: "15px 16px",
                  borderRadius: 16,
                  border: "1px solid #cbd5e1",
                  marginTop: 8,
                  marginBottom: 12,
                  fontSize: 16,
                  boxSizing: "border-box",
                }}
              />

              <label style={{ fontWeight: 800 }}>E-mail</label>
              <input
                value={cadastro.email}
                onChange={(e) =>
                  setCadastro({ ...cadastro, email: e.target.value })
                }
                placeholder="seuemail@exemplo.com"
                style={{
                  width: "100%",
                  padding: "15px 16px",
                  borderRadius: 16,
                  border: "1px solid #cbd5e1",
                  marginTop: 8,
                  marginBottom: 12,
                  fontSize: 16,
                  boxSizing: "border-box",
                }}
              />

              <label style={{ fontWeight: 800 }}>Data de nascimento</label>
              <input
                type="date"
                value={cadastro.data_nascimento}
                onChange={(e) =>
                  setCadastro({ ...cadastro, data_nascimento: e.target.value })
                }
                style={{
                  width: "100%",
                  padding: "15px 16px",
                  borderRadius: 16,
                  border: "1px solid #cbd5e1",
                  marginTop: 8,
                  marginBottom: 12,
                  fontSize: 16,
                  boxSizing: "border-box",
                }}
              />

              <label style={{ fontWeight: 800 }}>CEP</label>
              <input
                value={cadastro.cep}
                onChange={(e) => buscarCepCadastro(e.target.value)}
                placeholder="Ex: 05888160"
                style={{
                  width: "100%",
                  padding: "15px 16px",
                  borderRadius: 16,
                  border: "1px solid #cbd5e1",
                  marginTop: 8,
                  marginBottom: 8,
                  fontSize: 16,
                  boxSizing: "border-box",
                }}
              />

              {buscandoCep && (
                <p
                  style={{ color: "#64748b", margin: "0 0 12px", fontSize: 13 }}
                >
                  Buscando endereço pelo CEP...
                </p>
              )}

              <label style={{ fontWeight: 800 }}>Endereço</label>
              <input
                value={cadastro.endereco}
                onChange={(e) =>
                  setCadastro({ ...cadastro, endereco: e.target.value })
                }
                placeholder="Rua, avenida..."
                style={{
                  width: "100%",
                  padding: "15px 16px",
                  borderRadius: 16,
                  border: "1px solid #cbd5e1",
                  marginTop: 8,
                  marginBottom: 12,
                  fontSize: 16,
                  boxSizing: "border-box",
                }}
              />

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                }}
              >
                <div>
                  <label style={{ fontWeight: 800 }}>Número</label>
                  <input
                    value={cadastro.numero}
                    onChange={(e) =>
                      setCadastro({ ...cadastro, numero: e.target.value })
                    }
                    placeholder="Número"
                    style={{
                      width: "100%",
                      padding: "15px 16px",
                      borderRadius: 16,
                      border: "1px solid #cbd5e1",
                      marginTop: 8,
                      marginBottom: 12,
                      fontSize: 16,
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontWeight: 800 }}>Bairro</label>
                  <input
                    value={cadastro.bairro}
                    onChange={(e) =>
                      setCadastro({ ...cadastro, bairro: e.target.value })
                    }
                    placeholder="Bairro"
                    style={{
                      width: "100%",
                      padding: "15px 16px",
                      borderRadius: 16,
                      border: "1px solid #cbd5e1",
                      marginTop: 8,
                      marginBottom: 12,
                      fontSize: 16,
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 110px",
                  gap: 12,
                }}
              >
                <div>
                  <label style={{ fontWeight: 800 }}>Cidade</label>
                  <input
                    value={cadastro.cidade}
                    onChange={(e) =>
                      setCadastro({ ...cadastro, cidade: e.target.value })
                    }
                    placeholder="Cidade"
                    style={{
                      width: "100%",
                      padding: "15px 16px",
                      borderRadius: 16,
                      border: "1px solid #cbd5e1",
                      marginTop: 8,
                      marginBottom: 12,
                      fontSize: 16,
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontWeight: 800 }}>UF</label>
                  <input
                    value={cadastro.estado}
                    onChange={(e) =>
                      setCadastro({
                        ...cadastro,
                        estado: e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="SP"
                    maxLength={2}
                    style={{
                      width: "100%",
                      padding: "15px 16px",
                      borderRadius: 16,
                      border: "1px solid #cbd5e1",
                      marginTop: 8,
                      marginBottom: 12,
                      fontSize: 16,
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              {mensagem && (
                <div
                  style={{
                    background: "#fee2e2",
                    color: "#991b1b",
                    borderRadius: 14,
                    padding: 12,
                    marginTop: 14,
                  }}
                >
                  {mensagem}
                </div>
              )}

              <button
                type="button"
                onClick={cadastrarClienteMeuEspaco}
                disabled={cadastrando}
                style={{
                  width: "100%",
                  marginTop: 18,
                  padding: 15,
                  borderRadius: 16,
                  border: 0,
                  background: "#282663",
                  color: "#fff",
                  fontWeight: 900,
                  fontSize: 16,
                  cursor: "pointer",
                }}
              >
                {cadastrando ? "Cadastrando..." : "Cadastrar e entrar"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setMensagem("");
                  setModoCadastro(false);
                }}
                style={{
                  width: "100%",
                  marginTop: 12,
                  padding: 14,
                  borderRadius: 16,
                  border: "1px solid #cbd5e1",
                  background: "#fff",
                  color: "#334155",
                  fontWeight: 900,
                  fontSize: 15,
                  cursor: "pointer",
                }}
              >
                Já tenho cadastro
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#eef3fb", padding: 28 }}>
      <div style={{ maxWidth: 1160, margin: "0 auto" }}>
        <div
          style={{
            background: "#282663",
            color: "#fff",
            borderRadius: 24,
            padding: 24,
            marginBottom: 24,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <p style={{ margin: 0, opacity: 0.8, fontWeight: 700 }}>
              Meu Espaço
            </p>
            <h1 style={{ margin: "4px 0 0", fontSize: 30 }}>
              Olá, {primeiroNome(cliente.nome)}
            </h1>
          </div>

          <button
            type="button"
            onClick={sair}
            style={{
              background: "#fff",
              color: "#282663",
              border: 0,
              borderRadius: 14,
              padding: "12px 16px",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Sair
          </button>
        </div>

        {anamneseObrigatoria || assinaturaComplementarObrigatoria ? (
          <div
            style={{
              background: "#fff7ed",
              border: "1px solid #fed7aa",
              color: "#9a3412",
              padding: 18,
              borderRadius: 20,
              marginBottom: 20,
              fontWeight: 800,
            }}
          >
            {assinaturaComplementarObrigatoria
              ? "Sua ficha já está preenchida. Assine para liberar o acesso completo."
              : "Sua anamnese está pendente. Preencha para liberar o acesso completo."}
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              gap: 12,
              marginBottom: 22,
              flexWrap: "wrap",
            }}
          >
            {botaoAba("agenda", "Agendamentos")}
            {botaoAba("dados", "Dados pessoais")}
            {botaoAba("anamnese", "Anamnese")}
            {botaoAba("historico", "Histórico")}
          </div>
        )}

        {(anamneseObrigatoria || assinaturaComplementarObrigatoria) &&
          modalAnamneseAberto && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(15,23,42,.65)",
                zIndex: 50,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 18,
              }}
            >
              <div
                style={{
                  width: "100%",
                  maxWidth: 780,
                  maxHeight: "90vh",
                  overflowY: "auto",
                  background: "#fff",
                  borderRadius: 28,
                  padding: 28,
                  boxShadow: "0 30px 80px rgba(0,0,0,.28)",
                }}
              >
                <div
                  style={{
                    background: "#fff7ed",
                    border: "1px solid #fed7aa",
                    color: "#9a3412",
                    padding: 14,
                    borderRadius: 16,
                    marginBottom: 20,
                    fontWeight: 800,
                  }}
                >
                  {assinaturaComplementarObrigatoria
                    ? "Para continuar no Meu Espaço, assine a ficha já preenchida."
                    : "Para continuar no Meu Espaço, preencha a ficha obrigatória abaixo."}
                </div>

                {assinaturaComplementarObrigatoria
                  ? formularioAssinaturaComplementar
                  : formularioAnamnese}
              </div>
            </div>
          )}

        <div
          style={{
            background: "#fff",
            borderRadius: 26,
            padding: 28,
            boxShadow: "0 14px 35px rgba(15,23,42,.08)",
          }}
        >
          {aba === "agenda" &&
            !anamneseObrigatoria &&
            !assinaturaComplementarObrigatoria && (
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    alignItems: "center",
                    marginBottom: 18,
                  }}
                >
                  <div>
                    <h2 style={{ margin: 0 }}>Agendamentos</h2>
                    <p style={{ color: "#64748b", margin: "6px 0 0" }}>
                      Escolha um serviço, profissional e um horário livre para
                      agendar.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (acessoBloqueadoPorAnamnese) {
                        levarParaAnamneseObrigatoria();
                        return;
                      }

                      setNovoAgendamentoAberto((valor) => !valor);
                    }}
                    disabled={acessoBloqueadoPorAnamnese}
                    style={{
                      padding: "13px 18px",
                      borderRadius: 14,
                      border: 0,
                      background: "#282663",
                      color: "#fff",
                      fontWeight: 900,
                      cursor: "pointer",
                    }}
                  >
                    {novoAgendamentoAberto ? "Fechar" : "+ Novo agendamento"}
                  </button>
                </div>

                {novoAgendamentoAberto && (
                  <div
                    style={{
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: 22,
                      padding: 20,
                      marginBottom: 22,
                    }}
                  >
                    <h3 style={{ marginTop: 0 }}>Novo agendamento</h3>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(220px, 1fr))",
                        gap: 14,
                      }}
                    >
                      <div>
                        <label style={{ fontWeight: 800 }}>Serviço *</label>
                        <select
                          value={servicoAgendamentoId}
                          onChange={(e) => {
                            setServicoAgendamentoId(e.target.value);
                            setHorarioAgendamento("");
                          }}
                          style={{
                            width: "100%",
                            padding: 14,
                            borderRadius: 14,
                            border: "1px solid #cbd5e1",
                            marginTop: 8,
                          }}
                        >
                          <option value="">Selecione</option>
                          {servicos.map((servico) => (
                            <option key={servico.id} value={servico.id}>
                              {servico.nome} -{" "}
                              {formatarMoeda(precoBaseServico(servico))} -{" "}
                              {servico.duracao_padrao_minutos ||
                                servico.duracao ||
                                60}{" "}
                              min
                            </option>
                          ))}
                        </select>

                        {servicos.length === 0 && (
                          <p
                            style={{
                              marginTop: 8,
                              color: "#b45309",
                              fontWeight: 800,
                              fontSize: 12,
                            }}
                          >
                            Nenhum serviço disponível para esta empresa. Verifique
                            o cadastro de serviços ou as permissões/RLS em produção.
                          </p>
                        )}

                        {servicoAgendamentoId && (
                          <div
                            style={{
                              marginTop: 10,
                              background: precoEspecialAplicado
                                ? "#dcfce7"
                                : "#fff",
                              border: precoEspecialAplicado
                                ? "1px solid #bbf7d0"
                                : "1px solid #e2e8f0",
                              color: precoEspecialAplicado
                                ? "#166534"
                                : "#0f172a",
                              borderRadius: 14,
                              padding: 12,
                              fontWeight: 900,
                            }}
                          >
                            {carregandoValorAgendamento
                              ? "Calculando valor..."
                              : `Valor: ${formatarMoeda(valorAgendamentoFinal)}`}
                            {precoEspecialAplicado && (
                              <span style={{ display: "block", fontSize: 12 }}>
                                Preço especial deste cliente aplicado.
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div>
                        <label style={{ fontWeight: 800 }}>
                          Profissional *
                        </label>
                        <select
                          value={profissionalAgendamentoId}
                          onChange={(e) =>
                            setProfissionalAgendamentoId(e.target.value)
                          }
                          style={{
                            width: "100%",
                            padding: 14,
                            borderRadius: 14,
                            border: "1px solid #cbd5e1",
                            marginTop: 8,
                          }}
                        >
                          <option value="">Selecione</option>
                          {profissionais.map((profissional) => (
                            <option
                              key={profissional.id}
                              value={profissional.id}
                            >
                              {profissional.nome}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={{ fontWeight: 800 }}>Data *</label>
                        <input
                          type="date"
                          value={dataAgendamento}
                          min={hojeISO()}
                          onChange={(e) => setDataAgendamento(e.target.value)}
                          style={{
                            width: "100%",
                            padding: 14,
                            borderRadius: 14,
                            border: "1px solid #cbd5e1",
                            marginTop: 8,
                            boxSizing: "border-box",
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ marginTop: 18 }}>
                      <label style={{ fontWeight: 800 }}>
                        Horários livres *
                      </label>

                      {carregandoHorarios && (
                        <p style={{ color: "#64748b" }}>
                          Buscando horários livres...
                        </p>
                      )}

                      {!carregandoHorarios &&
                        servicoAgendamentoId &&
                        profissionalAgendamentoId &&
                        dataAgendamento &&
                        horariosLivres.length === 0 && (
                          <div
                            style={{
                              background: "#fee2e2",
                              color: "#991b1b",
                              border: "1px solid #fecaca",
                              borderRadius: 14,
                              padding: 12,
                              marginTop: 10,
                              fontWeight: 800,
                            }}
                          >
                            Não há horários livres para esse serviço nessa data.
                            Escolha outra data ou outro profissional.
                          </div>
                        )}

                      <div
                        style={{
                          display: "flex",
                          gap: 10,
                          flexWrap: "wrap",
                          marginTop: 10,
                        }}
                      >
                        {horariosLivres.map((horario) => (
                          <button
                            key={horario}
                            type="button"
                            onClick={() => setHorarioAgendamento(horario)}
                            style={{
                              padding: "11px 14px",
                              borderRadius: 14,
                              border:
                                horarioAgendamento === horario
                                  ? "2px solid #282663"
                                  : "1px solid #cbd5e1",
                              background:
                                horarioAgendamento === horario
                                  ? "#282663"
                                  : "#fff",
                              color:
                                horarioAgendamento === horario
                                  ? "#fff"
                                  : "#0f172a",
                              fontWeight: 900,
                              cursor: "pointer",
                            }}
                          >
                            {horario}
                          </button>
                        ))}
                      </div>
                    </div>

                    {servicoAgendamentoId && horarioAgendamento && (
                      <div
                        style={{
                          marginTop: 18,
                          background: "#f0f9ff",
                          border: "1px solid #bae6fd",
                          color: "#075985",
                          borderRadius: 16,
                          padding: 14,
                          fontWeight: 800,
                        }}
                      >
                        Resumo: {pegarServicoSelecionado()?.nome} em{" "}
                        {formatarData(dataAgendamento)} às {horarioAgendamento}.
                        <br />
                        Valor do lançamento financeiro:{" "}
                        {formatarMoeda(valorAgendamentoFinal)}
                        {precoEspecialAplicado
                          ? " (preço especial aplicado)"
                          : ""}
                        .
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={salvarNovoAgendamentoCliente}
                      disabled={salvandoAgendamento}
                      style={{
                        marginTop: 20,
                        padding: "14px 20px",
                        borderRadius: 16,
                        border: 0,
                        background: "#282663",
                        color: "#fff",
                        fontWeight: 900,
                        cursor: "pointer",
                      }}
                    >
                      {salvandoAgendamento
                        ? "Agendando..."
                        : "Confirmar agendamento"}
                    </button>
                  </div>
                )}

                {agendamentos.length === 0 && (
                  <p style={{ color: "#64748b" }}>
                    Nenhum agendamento em aberto.
                  </p>
                )}

                {agendamentos.map((a) => (
                  <div
                    key={a.id}
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: 18,
                      padding: 18,
                      marginBottom: 14,
                    }}
                  >
                    <strong>{a.servico || a.servico_nome}</strong>
                    <div>
                      {formatarData(a.data)} às {a.horario}
                    </div>
                    <div>Status: {a.status}</div>
                  </div>
                ))}
              </div>
            )}

          {aba === "dados" &&
            !anamneseObrigatoria &&
            !assinaturaComplementarObrigatoria && (
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 18,
                    alignItems: "center",
                    marginBottom: 22,
                    flexWrap: "wrap",
                  }}
                >
                  <div
                    style={{ display: "flex", gap: 16, alignItems: "center" }}
                  >
                    <div
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: 22,
                        background: "linear-gradient(135deg, #282663, #5b5bd6)",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 26,
                        fontWeight: 900,
                        boxShadow: "0 14px 30px rgba(40,38,99,.22)",
                      }}
                    >
                      {String(cliente.nome || "C")
                        .slice(0, 1)
                        .toUpperCase()}
                    </div>

                    <div>
                      <p
                        style={{
                          margin: 0,
                          color: "#64748b",
                          fontWeight: 800,
                          textTransform: "uppercase",
                          fontSize: 12,
                          letterSpacing: 0.6,
                        }}
                      >
                        Perfil do cliente
                      </p>
                      <h2 style={{ margin: "4px 0 0", color: "#0f172a" }}>
                        {cliente.nome}
                      </h2>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <div
                      style={{
                        background:
                          anamnesePreenchida &&
                          !anamneseEstaVencida(anamnesePreenchida)
                            ? "#dcfce7"
                            : "#fff7ed",
                        color:
                          anamnesePreenchida &&
                          !anamneseEstaVencida(anamnesePreenchida)
                            ? "#166534"
                            : "#9a3412",
                        border:
                          anamnesePreenchida &&
                          !anamneseEstaVencida(anamnesePreenchida)
                            ? "1px solid #bbf7d0"
                            : "1px solid #fed7aa",
                        borderRadius: 999,
                        padding: "10px 14px",
                        fontWeight: 900,
                      }}
                    >
                      {anamnesePreenchida &&
                      !anamneseEstaVencida(anamnesePreenchida)
                        ? "Anamnese em dia"
                        : "Anamnese pendente"}
                    </div>

                    {!editandoDados && (
                      <button
                        type="button"
                        onClick={iniciarEdicaoDados}
                        style={{
                          padding: "12px 16px",
                          borderRadius: 14,
                          border: "1px solid #282663",
                          background: "#fff",
                          color: "#282663",
                          fontWeight: 900,
                          cursor: "pointer",
                        }}
                      >
                        Editar dados
                      </button>
                    )}
                  </div>
                </div>

                {mensagem && (
                  <div
                    style={{
                      background: mensagem.includes("sucesso") ? "#dcfce7" : "#fee2e2",
                      color: mensagem.includes("sucesso") ? "#166534" : "#991b1b",
                      borderRadius: 14,
                      padding: 12,
                      marginBottom: 16,
                      fontWeight: 800,
                    }}
                  >
                    {mensagem}
                  </div>
                )}

                {!editandoDados ? (
                  <>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                        gap: 14,
                      }}
                    >
                      {[
                        ["Nome completo", cliente.nome || "-"],
                        ["Telefone", cliente.telefone || "-"],
                        ["E-mail", cliente.email || "Não informado"],
                        ["Nascimento", formatarData(cliente.data_nascimento)],
                        ["CEP", cliente.cep || "Não informado"],
                        ["Endereço", cliente.endereco || "Não informado"],
                        ["Número", cliente.numero || "-"],
                        ["Bairro", cliente.bairro || "-"],
                        [
                          "Cidade/UF",
                          `${cliente.cidade || "-"}/${cliente.estado || "-"}`,
                        ],
                      ].map(([titulo, valor]) => (
                        <div
                          key={titulo}
                          style={{
                            background: "#f8fafc",
                            border: "1px solid #e2e8f0",
                            borderRadius: 20,
                            padding: 18,
                          }}
                        >
                          <p
                            style={{
                              margin: "0 0 6px",
                              color: "#64748b",
                              fontSize: 12,
                              fontWeight: 800,
                              textTransform: "uppercase",
                              letterSpacing: 0.5,
                            }}
                          >
                            {titulo}
                          </p>
                          <strong style={{ color: "#0f172a", fontSize: 16 }}>
                            {valor}
                          </strong>
                        </div>
                      ))}
                    </div>

                    <div
                      style={{
                        marginTop: 18,
                        background: "#eef2ff",
                        border: "1px solid #c7d2fe",
                        color: "#3730a3",
                        borderRadius: 20,
                        padding: 18,
                        fontWeight: 800,
                      }}
                    >
                      Você pode atualizar seus dados cadastrais por aqui. O telefone não fica editável porque ele é usado como login do Meu Espaço.
                    </div>
                  </>
                ) : (
                  <div
                    style={{
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: 22,
                      padding: 20,
                    }}
                  >
                    <h3 style={{ marginTop: 0 }}>Editar dados pessoais</h3>
                    <p style={{ color: "#64748b", marginTop: -6 }}>
                      Atualize seus dados. Para trocar o telefone de acesso, fale com o estabelecimento.
                    </p>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
                        gap: 14,
                      }}
                    >
                      <div>
                        <label style={{ fontWeight: 800 }}>Nome completo *</label>
                        <input
                          value={dadosEdicao.nome}
                          onChange={(e) =>
                            setDadosEdicao({ ...dadosEdicao, nome: e.target.value })
                          }
                          style={{
                            width: "100%",
                            padding: 14,
                            borderRadius: 14,
                            border: "1px solid #cbd5e1",
                            marginTop: 8,
                            boxSizing: "border-box",
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ fontWeight: 800 }}>Telefone/login</label>
                        <input
                          value={cliente.telefone || ""}
                          disabled
                          style={{
                            width: "100%",
                            padding: 14,
                            borderRadius: 14,
                            border: "1px solid #cbd5e1",
                            background: "#e2e8f0",
                            color: "#475569",
                            marginTop: 8,
                            boxSizing: "border-box",
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ fontWeight: 800 }}>E-mail</label>
                        <input
                          value={dadosEdicao.email}
                          onChange={(e) =>
                            setDadosEdicao({ ...dadosEdicao, email: e.target.value })
                          }
                          style={{
                            width: "100%",
                            padding: 14,
                            borderRadius: 14,
                            border: "1px solid #cbd5e1",
                            marginTop: 8,
                            boxSizing: "border-box",
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ fontWeight: 800 }}>Data de nascimento</label>
                        <input
                          type="date"
                          value={dadosEdicao.data_nascimento || ""}
                          onChange={(e) =>
                            setDadosEdicao({ ...dadosEdicao, data_nascimento: e.target.value })
                          }
                          style={{
                            width: "100%",
                            padding: 14,
                            borderRadius: 14,
                            border: "1px solid #cbd5e1",
                            marginTop: 8,
                            boxSizing: "border-box",
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ fontWeight: 800 }}>CEP</label>
                        <input
                          value={dadosEdicao.cep}
                          onChange={(e) => buscarCepEdicao(e.target.value)}
                          style={{
                            width: "100%",
                            padding: 14,
                            borderRadius: 14,
                            border: "1px solid #cbd5e1",
                            marginTop: 8,
                            boxSizing: "border-box",
                          }}
                        />
                        {buscandoCep && (
                          <p style={{ color: "#64748b", margin: "6px 0 0", fontSize: 13 }}>
                            Buscando endereço pelo CEP...
                          </p>
                        )}
                      </div>

                      <div>
                        <label style={{ fontWeight: 800 }}>Endereço</label>
                        <input
                          value={dadosEdicao.endereco}
                          onChange={(e) =>
                            setDadosEdicao({ ...dadosEdicao, endereco: e.target.value })
                          }
                          style={{
                            width: "100%",
                            padding: 14,
                            borderRadius: 14,
                            border: "1px solid #cbd5e1",
                            marginTop: 8,
                            boxSizing: "border-box",
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ fontWeight: 800 }}>Número</label>
                        <input
                          value={dadosEdicao.numero}
                          onChange={(e) =>
                            setDadosEdicao({ ...dadosEdicao, numero: e.target.value })
                          }
                          style={{
                            width: "100%",
                            padding: 14,
                            borderRadius: 14,
                            border: "1px solid #cbd5e1",
                            marginTop: 8,
                            boxSizing: "border-box",
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ fontWeight: 800 }}>Bairro</label>
                        <input
                          value={dadosEdicao.bairro}
                          onChange={(e) =>
                            setDadosEdicao({ ...dadosEdicao, bairro: e.target.value })
                          }
                          style={{
                            width: "100%",
                            padding: 14,
                            borderRadius: 14,
                            border: "1px solid #cbd5e1",
                            marginTop: 8,
                            boxSizing: "border-box",
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ fontWeight: 800 }}>Cidade</label>
                        <input
                          value={dadosEdicao.cidade}
                          onChange={(e) =>
                            setDadosEdicao({ ...dadosEdicao, cidade: e.target.value })
                          }
                          style={{
                            width: "100%",
                            padding: 14,
                            borderRadius: 14,
                            border: "1px solid #cbd5e1",
                            marginTop: 8,
                            boxSizing: "border-box",
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ fontWeight: 800 }}>UF</label>
                        <input
                          value={dadosEdicao.estado}
                          maxLength={2}
                          onChange={(e) =>
                            setDadosEdicao({
                              ...dadosEdicao,
                              estado: e.target.value.toUpperCase(),
                            })
                          }
                          style={{
                            width: "100%",
                            padding: 14,
                            borderRadius: 14,
                            border: "1px solid #cbd5e1",
                            marginTop: 8,
                            boxSizing: "border-box",
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 12, marginTop: 20, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        onClick={salvarDadosCliente}
                        disabled={salvandoDados}
                        style={{
                          padding: "14px 20px",
                          borderRadius: 16,
                          border: 0,
                          background: "#282663",
                          color: "#fff",
                          fontWeight: 900,
                          cursor: "pointer",
                        }}
                      >
                        {salvandoDados ? "Salvando..." : "Salvar alterações"}
                      </button>

                      <button
                        type="button"
                        onClick={cancelarEdicaoDados}
                        disabled={salvandoDados}
                        style={{
                          padding: "14px 20px",
                          borderRadius: 16,
                          border: "1px solid #cbd5e1",
                          background: "#fff",
                          color: "#334155",
                          fontWeight: 900,
                          cursor: "pointer",
                        }}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

          {aba === "anamnese" &&
            (assinaturaComplementarObrigatoria ? (
              formularioAssinaturaComplementar
            ) : anamneseObrigatoria || modoAtualizacaoAnamnese ? (
              formularioAnamnese
            ) : (
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 16,
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                    marginBottom: 18,
                  }}
                >
                  <div>
                    <h2 style={{ margin: 0 }}>Anamnese</h2>
                    <p style={{ color: "#64748b", margin: "6px 0 0" }}>
                      A ficha fica válida por 12 meses. Se algo mudar antes
                      disso, o cliente pode atualizar por aqui.
                    </p>
                  </div>

                  <div
                    style={{
                      background:
                        anamnesePreenchida &&
                        !anamneseEstaVencida(anamnesePreenchida)
                          ? "#dcfce7"
                          : "#fff7ed",
                      color:
                        anamnesePreenchida &&
                        !anamneseEstaVencida(anamnesePreenchida)
                          ? "#166534"
                          : "#9a3412",
                      border:
                        anamnesePreenchida &&
                        !anamneseEstaVencida(anamnesePreenchida)
                          ? "1px solid #bbf7d0"
                          : "1px solid #fed7aa",
                      borderRadius: 999,
                      padding: "10px 14px",
                      fontWeight: 900,
                    }}
                  >
                    {anamnesePreenchida &&
                    !anamneseEstaVencida(anamnesePreenchida)
                      ? "Ficha válida"
                      : "Atualização necessária"}
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: 14,
                    marginBottom: 18,
                  }}
                >
                  <div
                    style={{
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: 20,
                      padding: 18,
                    }}
                  >
                    <p
                      style={{
                        margin: "0 0 6px",
                        color: "#64748b",
                        fontSize: 12,
                        fontWeight: 800,
                      }}
                    >
                      Último preenchimento
                    </p>
                    <strong>
                      {formatarDataAnamnese(
                        obterDataBaseAnamnese(anamnesePreenchida),
                      )}
                    </strong>
                  </div>

                  <div
                    style={{
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: 20,
                      padding: 18,
                    }}
                  >
                    <p
                      style={{
                        margin: "0 0 6px",
                        color: "#64748b",
                        fontSize: 12,
                        fontWeight: 800,
                      }}
                    >
                      Próxima atualização obrigatória
                    </p>
                    <strong>
                      {formatarDataAnamnese(
                        calcularValidadeAnamnese(anamnesePreenchida),
                      )}
                    </strong>
                  </div>

                  <div
                    style={{
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: 20,
                      padding: 18,
                    }}
                  >
                    <p
                      style={{
                        margin: "0 0 6px",
                        color: "#64748b",
                        fontSize: 12,
                        fontWeight: 800,
                      }}
                    >
                      Assinatura
                    </p>
                    <strong>
                      {anamnesePreenchida?.assinatura ? "Assinada" : "Pendente"}
                    </strong>
                  </div>
                </div>

                <div
                  style={{
                    background: "#eef2ff",
                    color: "#3730a3",
                    border: "1px solid #c7d2fe",
                    borderRadius: 18,
                    padding: 18,
                    fontWeight: 800,
                  }}
                >
                  Caso tenha surgido alergia, doença, uso de medicamento ou
                  qualquer mudança importante, atualize sua ficha antes do
                  atendimento.
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    flexWrap: "wrap",
                    marginTop: 18,
                  }}
                >
                  <button
                    type="button"
                    onClick={baixarPdfAnamnese}
                    style={{
                      padding: "13px 18px",
                      borderRadius: 14,
                      border: 0,
                      background: "#282663",
                      color: "#fff",
                      fontWeight: 900,
                      cursor: "pointer",
                    }}
                  >
                    Baixar PDF da anamnese
                  </button>

                  <button
                    type="button"
                    onClick={abrirAtualizacaoAnamnese}
                    style={{
                      padding: "13px 18px",
                      borderRadius: 14,
                      border: "1px solid #282663",
                      background: "#fff",
                      color: "#282663",
                      fontWeight: 900,
                      cursor: "pointer",
                    }}
                  >
                    Atualizar minha anamnese
                  </button>
                </div>
              </div>
            ))}

          {aba === "historico" &&
            !anamneseObrigatoria &&
            !assinaturaComplementarObrigatoria && (
              <div>
                <h2 style={{ marginTop: 0 }}>Histórico</h2>

                {historico.length === 0 && (
                  <p style={{ color: "#64748b" }}>
                    Nenhum atendimento finalizado.
                  </p>
                )}

                {historico.map((h) => (
                  <div
                    key={h.id}
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: 18,
                      padding: 18,
                      marginBottom: 14,
                    }}
                  >
                    <strong>{h.servico || h.servico_nome}</strong>
                    <div>
                      {formatarData(h.data)} às {h.horario}
                    </div>
                    <div>Status: {h.status}</div>
                  </div>
                ))}
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
