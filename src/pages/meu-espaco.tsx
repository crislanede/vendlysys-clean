import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import AssinaturaCanvas from "../components/AssinaturaCanvas";
import { gerarHash } from "../lib/hash";
import { gerarPdfBlob } from "../lib/pdfAnamnese";
import { uploadPdfAnamnese } from "../lib/uploadAnamnese";
import { abrirWhatsapp, montarMensagemPdfAnamnese } from "../lib/whatsapp";

type Empresa = {
  id: string;
  nome: string | null;
  nome_fantasia?: string | null;
  slug?: string | null;
  cor_primaria?: string | null;
  cor_secundaria?: string | null;
  cor_fundo?: string | null;
  telefone?: string | null;
  endereco?: string | null;
  logo_url?: string | null;
};

type Agendamento = {
  id: string;
  cliente: string;
  cliente_id?: string | null;
  telefone?: string | null;
  servico?: string | null;
  servico_id?: string | null;
  profissional?: string | null;
  profissional_id?: string | null;
  data: string;
  horario: string;
  status: string;
  empresa_id: string;
  observacoes?: string | null;
  token_cliente?: string | null;
  token?: string | null;
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
  alergias?: string | null;
  preferencias?: string | null;
  observacoes?: string | null;
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
  pergunta?: string | null;
  titulo?: string | null;
  nome?: string | null;
};

type ModeloAnamnese = {
  id: string;
  titulo?: string | null;
  descricao?: string | null;
  termo_responsabilidade?: string | null;
};

type AnamneseCliente = {
  id: string;
  preenchido_em?: string | null;
  assinado_em?: string | null;
  pdf_url?: string | null;
  respostas_json?: Record<string, string | null | undefined> | null;
};

type Aba = "agendamento" | "anamnese" | "dados" | "historico" | "combos" | "novo";

const STATUS_PENDENTES = ["agendado", "pendente", "confirmado"];

export default function MeuEspaco() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [agendamento, setAgendamento] = useState<Agendamento | null>(null);
  const [agendamentoToken, setAgendamentoToken] = useState<Agendamento | null>(null);
  const [historico, setHistorico] = useState<Agendamento[]>([]);
  const [cliente, setCliente] = useState<Cliente | null>(null);

  const [servicos, setServicos] = useState<Servico[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [novoServicoId, setNovoServicoId] = useState("");
  const [novoProfissionalId, setNovoProfissionalId] = useState("");
  const [novaData, setNovaData] = useState("");
  const [novoHorario, setNovoHorario] = useState("");
  const [novaObservacao, setNovaObservacao] = useState("");
  const [horariosDisponiveis, setHorariosDisponiveis] = useState<string[]>([]);
  const [mensagemHorarios, setMensagemHorarios] = useState("");

  const [modeloAnamnese, setModeloAnamnese] = useState<ModeloAnamnese | null>(null);
  const [camposAnamnese, setCamposAnamnese] = useState<CampoAnamnese[]>([]);
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [assinatura, setAssinatura] = useState<string | null>(null);
  const [aceiteTermo, setAceiteTermo] = useState(false);
  const [anamneseSalva, setAnamneseSalva] = useState<AnamneseCliente | null>(null);
  const [salvandoAnamnese, setSalvandoAnamnese] = useState(false);

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

  const [aba, setAba] = useState<Aba>("agendamento");
  const [loading, setLoading] = useState(true);
  const [salvandoDados, setSalvandoDados] = useState(false);
  const [salvandoNovo, setSalvandoNovo] = useState(false);

  useEffect(() => {
    carregarDados();
  }, [token]);

  useEffect(() => {
    setNovoHorario("");
    carregarHorariosDisponiveis();
  }, [novoServicoId, novoProfissionalId, novaData]);

  async function carregarDados() {
    setLoading(true);

    const slug = window.location.pathname.split("/")[1];
    let empresaPorSlug: Empresa | null = null;

    if (slug && slug !== "meu-espaco") {
      const { data } = await supabase
        .from("empresas")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      empresaPorSlug = data as Empresa | null;
    }

    if (!token) {
      if (empresaPorSlug) {
        setEmpresa(empresaPorSlug);
        aplicarTema(empresaPorSlug);
        await carregarServicosEProfissionais(empresaPorSlug.id);
      }
      setLoading(false);
      return;
    }

    const ag = await buscarAgendamentoPorToken(token);

    if (!ag) {
      if (empresaPorSlug) {
        setEmpresa(empresaPorSlug);
        aplicarTema(empresaPorSlug);
      }
      setLoading(false);
      return;
    }

    setAgendamentoToken(ag);

    const empresaFinal = await carregarEmpresa(ag.empresa_id, empresaPorSlug);
    await carregarCliente(ag);
    await carregarServicosEProfissionais(ag.empresa_id);
    await carregarModeloAnamnese(ag.empresa_id);
    await carregarAnamneseCliente(ag);
    await carregarHistorico(ag);

    const proximo = await buscarProximoPendente(ag);
    setAgendamento(proximo);

    if (empresaFinal) aplicarTema(empresaFinal);
    setLoading(false);
  }

  async function buscarAgendamentoPorToken(tokenBusca: string) {
    const porTokenCliente = await supabase
      .from("agendamentos")
      .select("*")
      .eq("token_cliente", tokenBusca)
      .maybeSingle();

    if (porTokenCliente.data) return porTokenCliente.data as Agendamento;

    const porToken = await supabase
      .from("agendamentos")
      .select("*")
      .eq("token", tokenBusca)
      .maybeSingle();

    return (porToken.data as Agendamento | null) || null;
  }

  async function carregarEmpresa(empresaId: string, fallback: Empresa | null) {
    const { data } = await supabase
      .from("empresas")
      .select("*")
      .eq("id", empresaId)
      .maybeSingle();

    const emp = (data as Empresa | null) || fallback;
    setEmpresa(emp);
    return emp;
  }

  function aplicarTema(emp: Empresa) {
    const primaria = emp.cor_primaria || "#4b2f3f";
    const secundaria = emp.cor_secundaria || "#4d6f53";
    const fundo = emp.cor_fundo || "#f1f9f5";

    document.documentElement.style.setProperty("--cor-primaria", primaria);
    document.documentElement.style.setProperty("--cor-secundaria", secundaria);
    document.documentElement.style.setProperty("--cor-fundo", fundo);
    document.documentElement.style.setProperty("--color-primary", primaria);
    document.documentElement.style.setProperty("--color-secondary", secundaria);
    document.documentElement.style.setProperty("--color-background", fundo);
  }

  async function carregarCliente(ag: Agendamento) {
    let cli: Cliente | null = null;

    if (ag.cliente_id) {
      const { data } = await supabase
        .from("clientes")
        .select("*")
        .eq("id", ag.cliente_id)
        .maybeSingle();
      cli = data as Cliente | null;
    }

    if (!cli && ag.telefone) {
      const { data } = await supabase
        .from("clientes")
        .select("*")
        .eq("empresa_id", ag.empresa_id)
        .eq("telefone", ag.telefone)
        .maybeSingle();
      cli = data as Cliente | null;
    }

    setCliente(cli);
    setFormCliente({
      nome: cli?.nome || ag.cliente || "",
      telefone: cli?.telefone || ag.telefone || "",
      email: cli?.email || "",
      cpf: cli?.cpf || "",
      data_nascimento: cli?.data_nascimento || "",
      sexo: cli?.sexo || "Não informado",
      alergias: cli?.alergias || "",
      preferencias: cli?.preferencias || "",
      observacoes: cli?.observacoes || "",
    });
  }

  async function carregarServicosEProfissionais(empresaId: string) {
    const [servicosResp, profissionaisResp] = await Promise.all([
      supabase
        .from("servicos")
        .select("*")
        .eq("empresa_id", empresaId)
        .order("nome", { ascending: true }),
      supabase
        .from("profissionais")
        .select("*")
        .eq("empresa_id", empresaId)
        .order("nome", { ascending: true }),
    ]);

    setServicos(((servicosResp.data || []) as Servico[]).filter((s) => s.ativo !== false));
    setProfissionais(((profissionaisResp.data || []) as Profissional[]).filter((p) => p.ativo !== false));
  }

  async function carregarHistorico(ag: Agendamento) {
    let query = supabase
      .from("agendamentos")
      .select("*")
      .eq("empresa_id", ag.empresa_id)
      .order("data", { ascending: false })
      .order("horario", { ascending: false })
      .limit(30);

    if (ag.cliente_id) query = query.eq("cliente_id", ag.cliente_id);
    else query = query.eq("cliente", ag.cliente);

    const { data } = await query;
    setHistorico((data || []) as Agendamento[]);
  }

  async function buscarProximoPendente(ag: Agendamento) {
    if (ehPendenteVisivel(ag)) return ag;

    let query = supabase
      .from("agendamentos")
      .select("*")
      .eq("empresa_id", ag.empresa_id)
      .gte("data", hojeISO())
      .in("status", STATUS_PENDENTES)
      .order("data", { ascending: true })
      .order("horario", { ascending: true })
      .limit(20);

    if (ag.cliente_id) query = query.eq("cliente_id", ag.cliente_id);
    else query = query.eq("cliente", ag.cliente);

    const { data } = await query;
    const lista = (data || []) as Agendamento[];
    return lista.find(ehPendenteVisivel) || null;
  }

  async function carregarModeloAnamnese(empresaId: string) {
    const { data: modelo } = await supabase
      .from("anamnese_modelos")
      .select("*")
      .eq("empresa_id", empresaId)
      .eq("ativo", true)
      .limit(1)
      .maybeSingle();

    if (!modelo) {
      setModeloAnamnese(null);
      setCamposAnamnese([]);
      return;
    }

    setModeloAnamnese(modelo as ModeloAnamnese);

    const { data: campos } = await supabase
      .from("anamnese_campos")
      .select("*")
      .eq("modelo_id", modelo.id)
      .order("ordem", { ascending: true });

    setCamposAnamnese(((campos || []) as CampoAnamnese[]).filter((c) => c.ativo !== false));
  }

  async function carregarAnamneseCliente(ag: Agendamento) {
    let query = supabase
      .from("anamneses_clientes")
      .select("*")
      .order("preenchido_em", { ascending: false })
      .limit(1);

    if (ag.cliente_id) query = query.eq("cliente_id", ag.cliente_id);
    else query = query.eq("cliente_nome", ag.cliente);

    const { data } = await query.maybeSingle();
    const anamnese = data as AnamneseCliente | null;
    setAnamneseSalva(anamnese);

    if (anamnese?.respostas_json) {
      const carregadas: Record<string, string> = {};
      Object.entries(anamnese.respostas_json).forEach(([pergunta, resposta]) => {
        carregadas[pergunta] = String(resposta || "");
      });
    }
  }

  async function atualizarStatus(status: "confirmado" | "cancelado") {
    if (!agendamento) return;

    const confirmar = window.confirm(
      status === "confirmado" ? "Deseja confirmar sua presença?" : "Deseja cancelar este agendamento?"
    );
    if (!confirmar) return;

    const { error } = await supabase
      .from("agendamentos")
      .update({ status })
      .eq("id", agendamento.id);

    if (error) {
      alert(error.message);
      return;
    }

    const atualizado = { ...agendamento, status };
    setAgendamento(status === "cancelado" ? null : atualizado);
    await carregarHistorico(atualizado);
    alert(status === "confirmado" ? "Presença confirmada!" : "Agendamento cancelado.");
  }

  async function salvarDadosCliente() {
    if (!formCliente.nome.trim() || !formCliente.telefone.trim()) {
      alert("Informe nome e telefone.");
      return;
    }

    setSalvandoDados(true);

    if (cliente?.id) {
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

      if (error) alert(error.message);
      else alert("Dados atualizados com sucesso.");
    } else {
      alert("Cliente não encontrado para atualização.");
    }

    setSalvandoDados(false);
  }

  async function salvarAnamnese() {
    const ag = agendamento || agendamentoToken;
    if (!ag) return;

    for (const campo of camposAnamnese) {
      if (campo.obrigatorio && !respostas[campo.id]) {
        alert(`Preencha o campo obrigatório: ${labelCampo(campo)}`);
        return;
      }
    }

    if (!aceiteTermo) {
      alert("Você precisa aceitar o termo.");
      return;
    }

    if (!assinatura) {
      alert("A assinatura é obrigatória.");
      return;
    }

    setSalvandoAnamnese(true);

    try {
      const respostasPdf: Record<string, string> = {};
      camposAnamnese.forEach((campo) => {
        respostasPdf[labelCampo(campo)] = respostas[campo.id] || "";
      });

      const dataAssinatura = new Date().toISOString();
      const hash = await gerarHash(JSON.stringify(respostasPdf) + assinatura);
      const ip = "0.0.0.0";

      const { data, error } = await supabase
        .from("anamneses_clientes")
        .insert({
          modelo_id: modeloAnamnese?.id || null,
          cliente_id: ag.cliente_id || null,
          cliente_nome: ag.cliente,
          respostas_json: respostasPdf,
          aceita_termo: true,
          preenchido: true,
          preenchido_em: dataAssinatura,
          assinatura_base64: assinatura,
          hash_assinatura: hash,
          ip_assinatura: ip,
          assinado_em: dataAssinatura,
          assinatura_nome: ag.cliente,
          assinatura_data: dataAssinatura,
          ip,
          hash_juridico: hash,
        })
        .select()
        .single();

      if (error) throw error;

      const pdfBlob = gerarPdfBlob({
        empresaNome: nomeEmpresa,
        clienteNome: ag.cliente,
        respostas: respostasPdf,
        assinatura,
        hash,
        ip,
        data: dataAssinatura,
      });

      const pdfUrl = await uploadPdfAnamnese(pdfBlob, ag.cliente, data.id);

      await supabase
        .from("anamneses_clientes")
        .update({ pdf_url: pdfUrl })
        .eq("id", data.id);

      setAnamneseSalva({
        id: data.id,
        preenchido_em: dataAssinatura,
        assinado_em: dataAssinatura,
        pdf_url: pdfUrl,
        respostas_json: respostasPdf,
      });

      alert("Ficha salva com sucesso!");
    } catch (error: any) {
      alert("Erro ao salvar anamnese: " + (error?.message || "erro inesperado"));
    } finally {
      setSalvandoAnamnese(false);
    }
  }

  function enviarPdfWhatsapp() {
    const ag = agendamento || agendamentoToken;
    if (!ag || !anamneseSalva?.pdf_url) return;

    abrirWhatsapp(
      formCliente.telefone || ag.telefone || "",
      montarMensagemPdfAnamnese({
        cliente: ag.cliente,
        empresa: nomeEmpresa,
        pdfUrl: anamneseSalva.pdf_url,
      })
    );
  }

  async function carregarHorariosDisponiveis() {
    if (!novoServicoId || !novoProfissionalId || !novaData) {
      setHorariosDisponiveis([]);
      setMensagemHorarios("Selecione serviço, profissional e data para ver horários.");
      return;
    }

    const servico = servicos.find((s) => s.id === novoServicoId);
    const profissional = profissionais.find((p) => p.id === novoProfissionalId);
    if (!servico || !profissional || !empresa) return;

    const duracao = duracaoServico(servico);
    const inicio = horaParaMinutos(profissional.hora_inicio || "08:00");
    const fim = horaParaMinutos(profissional.hora_fim || "18:00");
    const passo = 30;

    const { data: ags } = await supabase
      .from("agendamentos")
      .select("*")
      .eq("empresa_id", empresa.id)
      .eq("data", novaData)
      .eq("profissional_id", profissional.id);

    const ocupados = ((ags || []) as Agendamento[])
      .filter((a) => normalizarStatus(a.status) !== "cancelado")
      .map((a) => ({
        inicio: horaParaMinutos(a.horario),
        fim: horaParaMinutos(a.horario) + (Number(a.duracao_minutos || a.duracao || 0) || duracao),
      }));

    const disponiveis: string[] = [];

    for (let atual = inicio; atual + duracao <= fim; atual += passo) {
      const atualFim = atual + duracao;
      const conflita = ocupados.some((o) => atual < o.fim && atualFim > o.inicio);
      if (!conflita) disponiveis.push(minutosParaHora(atual));
    }

    setHorariosDisponiveis(disponiveis);
    setMensagemHorarios(disponiveis.length ? "" : "Nenhum horário disponível para esse dia.");
  }

  async function solicitarNovoAgendamento() {
    const agBase = agendamento || agendamentoToken;
    if (!agBase || !empresa) return;

    if (!novoServicoId || !novoProfissionalId || !novaData || !novoHorario) {
      alert("Selecione serviço, profissional, data e horário.");
      return;
    }

    const servico = servicos.find((s) => s.id === novoServicoId);
    const profissional = profissionais.find((p) => p.id === novoProfissionalId);
    if (!servico || !profissional) return;

    setSalvandoNovo(true);

    const { error } = await supabase.from("agendamentos").insert({
      empresa_id: empresa.id,
      cliente_id: agBase.cliente_id || cliente?.id || null,
      cliente: formCliente.nome || agBase.cliente,
      telefone: formCliente.telefone || agBase.telefone || null,
      servico_id: servico.id,
      servico: servico.nome,
      profissional_id: profissional.id,
      profissional: profissional.nome,
      data: novaData,
      horario: novoHorario,
      duracao_minutos: duracaoServico(servico),
      status: "agendado",
      observacoes: novaObservacao.trim() || "Solicitado pelo Meu Espaço",
      token_cliente: crypto.randomUUID(),
    });

    if (error) alert(error.message);
    else {
      alert("Novo agendamento solicitado com sucesso!");
      setNovoServicoId("");
      setNovoProfissionalId("");
      setNovaData("");
      setNovoHorario("");
      setNovaObservacao("");
      await carregarHistorico(agBase);
    }

    setSalvandoNovo(false);
  }

  const nomeEmpresa = empresa?.nome_fantasia || empresa?.nome || "Seu estabelecimento";

  const servicoSelecionado = useMemo(
    () => servicos.find((s) => s.id === novoServicoId),
    [servicos, novoServicoId]
  );

  const statusVisivel = agendamento && ehPendenteVisivel(agendamento) ? agendamento.status : "-";

  if (loading) {
    return <TelaCentral mensagem="Carregando Meu Espaço..." />;
  }

  if (!empresa) {
    return <TelaCentral mensagem="Empresa não encontrada. Verifique se o link está correto." />;
  }

  return (
    <div className="min-h-screen px-4 py-8" style={{ backgroundColor: "var(--cor-fundo)" }}>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-[2rem] p-8 text-white shadow-lg" style={{ backgroundColor: "var(--cor-secundaria)" }}>
          <div className="flex items-center gap-4">
            {empresa.logo_url && (
              <img src={empresa.logo_url} alt={nomeEmpresa} className="h-16 w-16 rounded-2xl object-cover bg-white" />
            )}
            <div>
              <p className="text-sm font-bold text-white/80">Meu Espaço</p>
              <h1 className="mt-2 text-4xl font-extrabold">{nomeEmpresa}</h1>
              {(empresa.telefone || empresa.endereco) && (
                <p className="mt-3 text-white/85">
                  {empresa.telefone || ""}{empresa.telefone && empresa.endereco ? " • " : ""}{empresa.endereco || ""}
                </p>
              )}
            </div>
          </div>
        </div>

        <div>
          <p className="text-sm font-extrabold uppercase" style={{ color: "var(--cor-primaria)" }}>Área do cliente</p>
          <h2 className="text-4xl font-extrabold text-slate-950">Olá, {formCliente.nome || agendamentoToken?.cliente || "cliente"}</h2>
          <p className="mt-2 text-slate-600">Acompanhe seus próximos horários, atualize seus dados, preencha a ficha e consulte o histórico.</p>
        </div>

        <div className="bg-white rounded-[2rem] p-2 shadow ring-1 ring-slate-200 flex flex-wrap gap-2">
          <Tab ativo={aba === "agendamento"} onClick={() => setAba("agendamento")}>Meu agendamento</Tab>
          <Tab ativo={aba === "historico"} onClick={() => setAba("historico")}>Histórico</Tab>
          <Tab ativo={aba === "anamnese"} onClick={() => setAba("anamnese")}>Ficha de anamnese</Tab>
          <Tab ativo={aba === "dados"} onClick={() => setAba("dados")}>Meus dados</Tab>
          <Tab ativo={aba === "combos"} onClick={() => setAba("combos")}>Meus combos</Tab>
          <Tab ativo={aba === "novo"} onClick={() => setAba("novo")}>Novo agendamento</Tab>
        </div>

        {aba === "agendamento" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <Card><p className="text-sm font-bold text-slate-500">Status</p><p className="mt-3 text-3xl font-extrabold text-slate-950">{statusVisivel}</p></Card>
              <Card><p className="text-sm font-bold text-slate-500">Data</p><p className="mt-3 text-3xl font-extrabold text-slate-950">{formatarData(agendamento?.data)}</p></Card>
              <Card><p className="text-sm font-bold text-slate-500">Horário</p><p className="mt-3 text-3xl font-extrabold text-slate-950">{agendamento?.horario || "-"}</p></Card>
            </div>

            <Card>
              <h3 className="text-2xl font-extrabold text-slate-950">Próximo agendamento</h3>
              <p className="text-slate-500 mt-1">Somente agendamentos pendentes ou futuros aparecem aqui. Os já ocorridos ficam no histórico.</p>

              {agendamento ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                    <Info label="Serviço" value={agendamento.servico || "-"} />
                    <Info label="Profissional" value={agendamento.profissional || "-"} />
                    <Info label="Cliente" value={agendamento.cliente || "-"} />
                    <Info label="Telefone" value={agendamento.telefone || "-"} />
                    <Info label="Observações" value={agendamento.observacoes || "-"} />
                  </div>
                  <div className="mt-6 flex flex-wrap gap-3">
                    {agendamento.status !== "confirmado" && (
                      <button onClick={() => atualizarStatus("confirmado")} className="rounded-2xl px-6 py-3 text-white font-extrabold shadow hover:opacity-90" style={{ backgroundColor: "var(--cor-primaria)" }}>Confirmar presença</button>
                    )}
                    <button onClick={() => atualizarStatus("cancelado")} className="rounded-2xl px-6 py-3 bg-white border border-slate-300 text-slate-700 font-extrabold hover:bg-slate-50">Cancelar agendamento</button>
                  </div>
                </>
              ) : (
                <div className="mt-6 rounded-2xl bg-slate-50 p-5 text-slate-600 font-semibold">Nenhum agendamento pendente encontrado.</div>
              )}
            </Card>
          </div>
        )}

        {aba === "historico" && (
          <Card>
            <h3 className="text-2xl font-extrabold">Histórico</h3>
            <p className="text-slate-500 mt-1">Agendamentos anteriores, cancelados e finalizados permanecem aqui.</p>
            <div className="mt-6 space-y-3">
              {historico.length === 0 ? <p className="text-slate-500">Nenhum histórico encontrado.</p> : historico.map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 flex flex-wrap justify-between gap-3">
                  <div>
                    <p className="font-extrabold text-slate-950">{item.servico || "Serviço"}</p>
                    <p className="text-sm text-slate-500">{formatarData(item.data)} às {item.horario} {item.profissional ? `• ${item.profissional}` : ""}</p>
                  </div>
                  <span className="rounded-full bg-white px-4 py-2 text-sm font-extrabold text-slate-700">{item.status || "-"}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {aba === "anamnese" && (
          <Card>
            <h3 className="text-2xl font-extrabold">{modeloAnamnese?.titulo || "Ficha de anamnese"}</h3>
            <p className="text-slate-500 mt-1">{modeloAnamnese?.descricao || "Preencha suas informações para um atendimento mais seguro."}</p>

            {anamneseSalva && (
              <div className="mt-5 rounded-2xl bg-emerald-50 p-4 text-emerald-700 font-semibold">
                Ficha salva em {new Date(anamneseSalva.preenchido_em || anamneseSalva.assinado_em || "").toLocaleString("pt-BR")}.
                {anamneseSalva.pdf_url && <a href={anamneseSalva.pdf_url} target="_blank" rel="noreferrer" className="ml-2 underline">Abrir PDF</a>}
              </div>
            )}

            <div className="mt-6 space-y-4">
              {camposAnamnese.length === 0 ? (
                <div className="rounded-2xl bg-orange-50 p-5 text-orange-700 font-bold">Nenhuma pergunta de anamnese configurada para esta empresa.</div>
              ) : camposAnamnese.map((campo) => (
                <Campo key={campo.id} campo={campo} valor={respostas[campo.id] || ""} onChange={(v) => setRespostas((atual) => ({ ...atual, [campo.id]: v }))} />
              ))}

              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                <p>{modeloAnamnese?.termo_responsabilidade || "Declaro que as informações fornecidas são verdadeiras."}</p>
                <label className="mt-3 flex items-center gap-2 font-bold"><input type="checkbox" checked={aceiteTermo} onChange={(e) => setAceiteTermo(e.target.checked)} /> Aceito o termo</label>
              </div>

              <div>
                <p className="mb-2 text-sm font-extrabold text-slate-700">Assinatura</p>
                <div className="rounded-2xl border border-slate-200 bg-white p-3"><AssinaturaCanvas onChange={setAssinatura} /></div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button onClick={salvarAnamnese} disabled={salvandoAnamnese} className="rounded-2xl px-6 py-3 text-white font-extrabold shadow hover:opacity-90 disabled:opacity-60" style={{ backgroundColor: "var(--cor-primaria)" }}>{salvandoAnamnese ? "Salvando..." : "Salvar anamnese"}</button>
                {anamneseSalva?.pdf_url && <button type="button" onClick={enviarPdfWhatsapp} className="rounded-2xl bg-emerald-600 px-6 py-3 text-white font-extrabold">Enviar PDF no WhatsApp</button>}
              </div>
            </div>
          </Card>
        )}

        {aba === "dados" && (
          <Card>
            <h3 className="text-2xl font-extrabold">Meus dados</h3>
            <p className="text-slate-500 mt-1">Atualize seus dados cadastrais.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <Input label="Nome" value={formCliente.nome} onChange={(v) => setFormCliente({ ...formCliente, nome: v })} />
              <Input label="Telefone" value={formCliente.telefone} onChange={(v) => setFormCliente({ ...formCliente, telefone: v })} />
              <Input label="E-mail" value={formCliente.email} onChange={(v) => setFormCliente({ ...formCliente, email: v })} />
              <Input label="CPF" value={formCliente.cpf} onChange={(v) => setFormCliente({ ...formCliente, cpf: v })} />
              <Input label="Data de nascimento" type="date" value={formCliente.data_nascimento} onChange={(v) => setFormCliente({ ...formCliente, data_nascimento: v })} />
              <Select label="Sexo" value={formCliente.sexo} onChange={(v) => setFormCliente({ ...formCliente, sexo: v })} options={["Não informado", "Feminino", "Masculino", "Outro"]} />
              <Textarea label="Alergias / restrições" value={formCliente.alergias} onChange={(v) => setFormCliente({ ...formCliente, alergias: v })} />
              <Textarea label="Preferências" value={formCliente.preferencias} onChange={(v) => setFormCliente({ ...formCliente, preferencias: v })} />
              <div className="md:col-span-2"><Textarea label="Observações" value={formCliente.observacoes} onChange={(v) => setFormCliente({ ...formCliente, observacoes: v })} /></div>
            </div>
            <button onClick={salvarDadosCliente} disabled={salvandoDados} className="mt-6 rounded-2xl px-6 py-3 text-white font-extrabold shadow hover:opacity-90 disabled:opacity-60" style={{ backgroundColor: "var(--cor-primaria)" }}>{salvandoDados ? "Salvando..." : "Salvar meus dados"}</button>
          </Card>
        )}

        {aba === "combos" && (
          <Card>
            <h3 className="text-2xl font-extrabold">Meus combos</h3>
            <p className="text-slate-500 mt-1">Acompanhe seus pacotes e saldos.</p>
            <div className="mt-6 rounded-2xl bg-orange-50 p-5 text-orange-700 font-bold">Nenhum combo ativo encontrado.</div>
          </Card>
        )}

        {aba === "novo" && (
          <Card>
            <h3 className="text-2xl font-extrabold">Novo agendamento</h3>
            <p className="text-slate-500 mt-1">Solicite um novo horário com o estabelecimento.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <Select label="Serviço" value={novoServicoId} onChange={setNovoServicoId} options={servicos.map((s) => ({ label: s.nome, value: s.id }))} placeholder="Selecione" />
              <Select label="Profissional" value={novoProfissionalId} onChange={setNovoProfissionalId} options={profissionais.map((p) => ({ label: p.nome, value: p.id }))} placeholder="Selecione" />
              <Input label="Data" type="date" value={novaData} onChange={setNovaData} />
              <Textarea label="Observações" value={novaObservacao} onChange={setNovaObservacao} />
            </div>
            {servicoSelecionado && <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-slate-600">Serviço: <strong>{servicoSelecionado.nome}</strong> • Duração: <strong>{duracaoServico(servicoSelecionado)} min</strong></div>}
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
              <p className="font-extrabold text-slate-800">Horários disponíveis</p>
              {horariosDisponiveis.length === 0 ? <p className="mt-3 rounded-2xl bg-orange-50 p-4 text-orange-700 font-semibold">{mensagemHorarios}</p> : <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">{horariosDisponiveis.map((h) => <button key={h} type="button" onClick={() => setNovoHorario(h)} className="rounded-2xl border px-4 py-3 font-extrabold" style={{ backgroundColor: novoHorario === h ? "var(--cor-primaria)" : "#fff", color: novoHorario === h ? "#fff" : "var(--cor-secundaria)" }}>{h}</button>)}</div>}
            </div>
            <button onClick={solicitarNovoAgendamento} disabled={salvandoNovo} className="mt-6 rounded-2xl px-6 py-3 text-white font-extrabold shadow hover:opacity-90 disabled:opacity-60" style={{ backgroundColor: "var(--cor-primaria)" }}>{salvandoNovo ? "Enviando..." : "Solicitar agendamento"}</button>
          </Card>
        )}
      </div>
    </div>
  );

  function ehPendenteVisivel(ag: Agendamento) {
    return STATUS_PENDENTES.includes(normalizarStatus(ag.status)) && ag.data >= hojeISO();
  }

  function hojeISO() {
    return new Date().toISOString().slice(0, 10);
  }

  function normalizarStatus(status?: string | null) {
    return (status || "").toLowerCase().trim();
  }

  function labelCampo(campo: CampoAnamnese) {
    return campo.label || campo.pergunta || campo.titulo || campo.nome || campo.nome_campo || "Pergunta";
  }

  function duracaoServico(servico?: Servico) {
    return Number(servico?.duracao_padrao_minutos || servico?.duracao || 60);
  }

  function horaParaMinutos(hora?: string | null) {
    const [h, m] = String(hora || "00:00").slice(0, 5).split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
  }

  function minutosParaHora(total: number) {
    const h = Math.floor(total / 60);
    const m = total % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }
}

function TelaCentral({ mensagem }: { mensagem: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="bg-white rounded-3xl shadow p-8 font-bold text-center max-w-md">{mensagem}</div>
    </div>
  );
}

function Tab({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="rounded-2xl px-5 py-3 text-sm font-extrabold transition" style={{ backgroundColor: ativo ? "var(--cor-primaria)" : "transparent", color: ativo ? "#fff" : "var(--cor-secundaria)" }}>{children}</button>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-white rounded-[2rem] p-6 shadow ring-1 ring-slate-200">{children}</div>;
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-bold text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-extrabold text-slate-950">{value}</p>
    </div>
  );
}

function Input({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (valor: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-slate-700">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 p-3 bg-slate-50" />
    </label>
  );
}

function Textarea({ label, value, onChange }: { label: string; value: string; onChange: (valor: string) => void }) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-slate-700">{label}</span>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} className="mt-2 min-h-28 w-full rounded-2xl border border-slate-200 p-3 bg-slate-50" />
    </label>
  );
}

function Select({ label, value, onChange, options, placeholder }: { label: string; value: string; onChange: (valor: string) => void; options: Array<string | { label: string; value: string }>; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-slate-700">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 p-3 bg-slate-50">
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opcao) => {
          const opt = typeof opcao === "string" ? { label: opcao, value: opcao } : opcao;
          return <option key={opt.value} value={opt.value}>{opt.label}</option>;
        })}
      </select>
    </label>
  );
}

function Campo({ campo, valor, onChange }: { campo: CampoAnamnese; valor: string; onChange: (valor: string) => void }) {
  const label = campo.label || campo.pergunta || campo.titulo || campo.nome || campo.nome_campo || "Pergunta";
  const tipo = (campo.tipo || "texto").toLowerCase();
  const obrigatorio = campo.obrigatorio ? " *" : "";

  if (tipo.includes("sim_nao") || tipo.includes("boolean")) {
    return <Select label={`${label}${obrigatorio}`} value={valor} onChange={onChange} options={["Não", "Sim"]} placeholder="Selecione" />;
  }

  if (tipo.includes("select") || tipo.includes("opcao")) {
    const opcoes = Array.isArray(campo.opcoes)
      ? campo.opcoes
      : String(campo.opcoes || "").split(",").map((o) => o.trim()).filter(Boolean);
    return <Select label={`${label}${obrigatorio}`} value={valor} onChange={onChange} options={opcoes} placeholder="Selecione" />;
  }

  if (tipo.includes("data")) {
    return <Input label={`${label}${obrigatorio}`} type="date" value={valor} onChange={onChange} />;
  }

  if (tipo.includes("numero") || tipo.includes("number")) {
    return <Input label={`${label}${obrigatorio}`} type="number" value={valor} onChange={onChange} />;
  }

  return <Textarea label={`${label}${obrigatorio}`} value={valor} onChange={onChange} />;
}

function formatarData(data?: string | null) {
  if (!data) return "-";
  const partes = data.split("-");
  if (partes.length !== 3) return data;
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}
