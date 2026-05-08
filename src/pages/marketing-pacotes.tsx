import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { useEmpresa } from "../hooks/useEmpresa";

type Servico = {
  id: string;
  nome: string | null;
  valor?: number | null;
  preco?: number | null;
  preco_promocional?: number | null;
  empresa_id?: string | null;
};

type Pacote = {
  id: string;
  empresa_id: string;
  nome: string | null;
  descricao?: string | null;
  validade_dias?: number | null;
  status?: string | null;
  valor_original?: number | null;
  valor_final?: number | null;
  desconto_percentual?: number | null;
  desconto_valor?: number | null;
  tipo_desconto?: "percentual" | "valor" | string | null;
  criado_em?: string | null;
  created_at?: string | null;
};

type Cliente = {
  id: string;
  nome: string | null;
  telefone?: string | null;
  email?: string | null;
  empresa_id?: string | null;
};

type ItemPacote = {
  id?: string;
  pacote_id?: string;
  servico_id: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
};

const vazioItem: ItemPacote = {
  servico_id: "",
  quantidade: 1,
  valor_unitario: 0,
  valor_total: 0,
};

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

function dataAposDiasISO(dias: number) {
  const data = new Date();
  data.setDate(data.getDate() + Number(dias || 30));
  return data.toISOString().slice(0, 10);
}

function calcularDataFimPorDias(dataInicio: string, diasTexto: string) {
  const dias = Number(diasTexto || 0);
  if (!dias || dias <= 0) return "";

  const data = new Date(`${dataInicio}T00:00:00`);
  data.setDate(data.getDate() + dias);
  return data.toISOString().slice(0, 10);
}

export default function MarketingPacotes() {
  const { empresaId, corFundo } = useEmpresa() as any;

  const [isMobile, setIsMobile] = useState(false);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [pacotes, setPacotes] = useState<Pacote[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  const [modalVinculoAberto, setModalVinculoAberto] = useState(false);
  const [vinculando, setVinculando] = useState(false);
  const [vinculoClienteId, setVinculoClienteId] = useState("");
  const [vinculoPacoteId, setVinculoPacoteId] = useState("");
  const [vinculoDataInicio, setVinculoDataInicio] = useState(hojeISO());
  const [vinculoDataFim, setVinculoDataFim] = useState(dataAposDiasISO(30));
  const [vinculoQuantidadePacotes, setVinculoQuantidadePacotes] = useState("1");
  const [vinculoValidadeDias, setVinculoValidadeDias] = useState("30");

  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [validadeDias, setValidadeDias] = useState(30);
  const [status, setStatus] = useState("ativo");
  const [tipoDesconto, setTipoDesconto] = useState<"percentual" | "valor">(
    "percentual",
  );
  const [descontoPercentual, setDescontoPercentual] = useState(0);
  const [descontoValor, setDescontoValor] = useState(0);
  const [itens, setItens] = useState<ItemPacote[]>([{ ...vazioItem }]);

  useEffect(() => {
    function atualizarTela() {
      setIsMobile(window.innerWidth < 768);
    }

    atualizarTela();
    window.addEventListener("resize", atualizarTela);

    return () => window.removeEventListener("resize", atualizarTela);
  }, []);

  useEffect(() => {
    if (empresaId) {
      void carregarTudo();
    }
  }, [empresaId]);

  async function carregarTudo() {
    await Promise.all([
      carregarServicos(),
      carregarPacotes(),
      carregarClientes(),
    ]);
  }

  async function carregarServicos() {
    if (!empresaId) return;

    const { data, error } = await supabase
      .from("servicos")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("nome", { ascending: true });

    if (error) {
      alert("Erro ao carregar serviços: " + error.message);
      return;
    }

    setServicos(data || []);
  }

  async function carregarClientes() {
    if (!empresaId) return;

    const { data, error } = await supabase
      .from("clientes")
      .select("id, nome, telefone, email, empresa_id")
      .eq("empresa_id", empresaId)
      .order("nome", { ascending: true });

    if (error) {
      alert("Erro ao carregar clientes: " + error.message);
      return;
    }

    setClientes(data || []);
  }

  async function carregarPacotes() {
    if (!empresaId) return;

    setCarregando(true);

    const { data, error } = await supabase
      .from("marketing_pacotes")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("created_at", { ascending: false });

    setCarregando(false);

    if (error) {
      alert("Erro ao carregar pacotes: " + error.message);
      return;
    }

    setPacotes(data || []);
  }

  function valorServico(servico?: Servico | null) {
    if (!servico) return 0;
    return (
      Number(
        servico.preco_promocional ?? servico.preco ?? servico.valor ?? 0,
      ) || 0
    );
  }

  function formatarMoeda(valor: number) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(Number(valor || 0));
  }

  function limparFormulario() {
    setEditandoId(null);
    setNome("");
    setDescricao("");
    setValidadeDias(30);
    setStatus("ativo");
    setTipoDesconto("percentual");
    setDescontoPercentual(0);
    setDescontoValor(0);
    setItens([{ ...vazioItem }]);
  }

  function abrirNovoPacote() {
    limparFormulario();
    setModalAberto(true);
  }

  async function abrirEditarPacote(pacote: Pacote) {
    limparFormulario();
    setEditandoId(pacote.id);
    setNome(pacote.nome || "");
    setDescricao(pacote.descricao || "");
    setValidadeDias(Number(pacote.validade_dias || 30));
    setStatus(pacote.status || "ativo");
    setTipoDesconto(
      (pacote.tipo_desconto as "percentual" | "valor") || "percentual",
    );
    setDescontoPercentual(Number(pacote.desconto_percentual || 0));
    setDescontoValor(Number(pacote.desconto_valor || 0));

    const { data, error } = await supabase
      .from("marketing_pacote_servicos")
      .select("*")
      .eq("pacote_id", pacote.id);

    if (error) {
      alert("Erro ao carregar serviços do pacote: " + error.message);
      return;
    }

    const itensCarregados = (data || []).map((item: any) => ({
      id: item.id,
      pacote_id: item.pacote_id,
      servico_id: item.servico_id || "",
      quantidade: Number(item.quantidade || 1),
      valor_unitario: Number(item.valor_unitario || 0),
      valor_total: Number(item.valor_total || 0),
    }));

    setItens(itensCarregados.length ? itensCarregados : [{ ...vazioItem }]);
    setModalAberto(true);
  }

  function adicionarServico() {
    setItens((atuais) => [...atuais, { ...vazioItem }]);
  }

  function removerServico(index: number) {
    setItens((atuais) => {
      const novos = atuais.filter((_, i) => i !== index);
      return novos.length ? novos : [{ ...vazioItem }];
    });
  }

  function atualizarItem(
    index: number,
    campo: keyof ItemPacote,
    valor: string | number,
  ) {
    setItens((atuais) => {
      const novos = [...atuais];
      const item = { ...novos[index] };

      if (campo === "servico_id") {
        const servico = servicos.find((s) => s.id === valor);
        const unitario = valorServico(servico);
        item.servico_id = String(valor);
        item.valor_unitario = unitario;
        item.valor_total = unitario * Number(item.quantidade || 1);
      }

      if (campo === "quantidade") {
        const quantidade = Math.max(1, Number(valor || 1));
        item.quantidade = quantidade;
        item.valor_total = quantidade * Number(item.valor_unitario || 0);
      }

      novos[index] = item;
      return novos;
    });
  }

  const totalServicos = useMemo(() => {
    return itens.reduce(
      (total, item) => total + Number(item.valor_total || 0),
      0,
    );
  }, [itens]);

  const valorDesconto = useMemo(() => {
    if (tipoDesconto === "percentual") {
      return (totalServicos * Number(descontoPercentual || 0)) / 100;
    }

    return Math.min(Number(descontoValor || 0), totalServicos);
  }, [tipoDesconto, descontoPercentual, descontoValor, totalServicos]);

  const totalFinal = Math.max(totalServicos - valorDesconto, 0);

  async function salvarPacote() {
    if (!empresaId) {
      alert("Empresa não encontrada.");
      return;
    }

    if (!nome.trim()) {
      alert("Informe o nome do pacote.");
      return;
    }

    const itensValidos = itens.filter(
      (item) => item.servico_id && item.quantidade > 0,
    );

    if (itensValidos.length === 0) {
      alert("Adicione pelo menos um serviço ao pacote.");
      return;
    }

    setSalvando(true);

    const payload = {
      empresa_id: empresaId,
      nome: nome.trim(),
      descricao: descricao.trim() || null,
      validade_dias: validadeDias,
      status,
      tipo_desconto: tipoDesconto,
      desconto_percentual:
        tipoDesconto === "percentual" ? descontoPercentual : 0,
      desconto_valor: tipoDesconto === "valor" ? descontoValor : 0,
      valor_original: totalServicos,
      valor_final: totalFinal,
    };

    let pacoteId = editandoId;

    if (editandoId) {
      const { error } = await supabase
        .from("marketing_pacotes")
        .update(payload)
        .eq("id", editandoId)
        .eq("empresa_id", empresaId);

      if (error) {
        setSalvando(false);
        alert("Erro ao atualizar pacote: " + error.message);
        return;
      }

      await supabase
        .from("marketing_pacote_servicos")
        .delete()
        .eq("pacote_id", editandoId);
    } else {
      const { data, error } = await supabase
        .from("marketing_pacotes")
        .insert(payload)
        .select("id")
        .single();

      if (error) {
        setSalvando(false);
        alert("Erro ao salvar pacote: " + error.message);
        return;
      }

      pacoteId = data.id;
    }

    const itensPayload = itensValidos.map((item) => ({
      pacote_id: pacoteId,
      servico_id: item.servico_id,
      quantidade: item.quantidade,
      valor_unitario: item.valor_unitario,
      valor_total: item.valor_total,
    }));

    const { error: itensError } = await supabase
      .from("marketing_pacote_servicos")
      .insert(itensPayload);

    setSalvando(false);

    if (itensError) {
      alert("Pacote salvo, mas erro ao salvar serviços: " + itensError.message);
      return;
    }

    setModalAberto(false);
    limparFormulario();
    void carregarPacotes();
  }

  async function alterarStatusPacote(pacote: Pacote) {
    if (!empresaId) return;

    const novoStatus = pacote.status === "inativo" ? "ativo" : "inativo";

    const { error } = await supabase
      .from("marketing_pacotes")
      .update({ status: novoStatus })
      .eq("id", pacote.id)
      .eq("empresa_id", empresaId);

    if (error) {
      alert("Erro ao alterar status: " + error.message);
      return;
    }

    void carregarPacotes();
  }

  async function excluirPacote(id: string) {
    const confirmar = confirm("Tem certeza que deseja excluir este pacote?");
    if (!confirmar) return;

    await supabase
      .from("marketing_pacote_servicos")
      .delete()
      .eq("pacote_id", id);

    const { error } = await supabase
      .from("marketing_pacotes")
      .delete()
      .eq("id", id)
      .eq("empresa_id", empresaId);

    if (error) {
      alert("Erro ao excluir pacote: " + error.message);
      return;
    }

    void carregarPacotes();
  }

  function abrirVincularPacote(pacote?: Pacote) {
    const pacoteInicial =
      pacote ||
      pacotes.find((item) => (item.status || "ativo") === "ativo") ||
      pacotes[0];

    const diasPadrao = pacoteInicial?.validade_dias
      ? String(pacoteInicial.validade_dias)
      : "30";

    setVinculoClienteId("");
    setVinculoPacoteId(pacoteInicial?.id || "");
    setVinculoQuantidadePacotes("1");
    setVinculoValidadeDias(diasPadrao);
    setVinculoDataInicio(hojeISO());
    setVinculoDataFim(calcularDataFimPorDias(hojeISO(), diasPadrao));
    setModalVinculoAberto(true);
  }

  function atualizarPacoteDoVinculo(pacoteId: string) {
    const pacote = pacotes.find((item) => item.id === pacoteId);
    const diasPadrao = pacote?.validade_dias
      ? String(pacote.validade_dias)
      : "";

    setVinculoPacoteId(pacoteId);
    setVinculoValidadeDias(diasPadrao);
    setVinculoDataFim(calcularDataFimPorDias(vinculoDataInicio, diasPadrao));
  }

  function atualizarDataInicioVinculo(data: string) {
    setVinculoDataInicio(data);
    setVinculoDataFim(calcularDataFimPorDias(data, vinculoValidadeDias));
  }

  function atualizarValidadeDiasVinculo(dias: string) {
    setVinculoValidadeDias(dias);
    setVinculoDataFim(calcularDataFimPorDias(vinculoDataInicio, dias));
  }

  async function salvarVinculoClientePacote() {
    if (!empresaId) {
      alert("Empresa não encontrada.");
      return;
    }

    if (!vinculoClienteId) {
      alert("Selecione o cliente.");
      return;
    }

    if (!vinculoPacoteId) {
      alert("Selecione o pacote.");
      return;
    }

    const quantidadePacotes = Number(vinculoQuantidadePacotes || 1);

    if (!quantidadePacotes || quantidadePacotes < 1) {
      alert("Informe uma quantidade de pacotes válida.");
      return;
    }

    setVinculando(true);

    const { data: itensPacote, error: erroItens } = await supabase
      .from("marketing_pacote_servicos")
      .select("servico_id, quantidade")
      .eq("pacote_id", vinculoPacoteId);

    if (erroItens) {
      setVinculando(false);
      alert("Erro ao buscar serviços do pacote: " + erroItens.message);
      return;
    }

    if (!itensPacote || itensPacote.length === 0) {
      setVinculando(false);
      alert("Este pacote não possui serviços vinculados.");
      return;
    }

    const { data: clientePacote, error: erroVinculo } = await supabase
      .from("cliente_pacotes")
      .insert({
        empresa_id: empresaId,
        cliente_id: vinculoClienteId,
        pacote_id: vinculoPacoteId,
        data_inicio: vinculoDataInicio,
        data_fim: vinculoDataFim || null,
        validade_dias: vinculoValidadeDias ? Number(vinculoValidadeDias) : null,
        quantidade_pacotes: quantidadePacotes,
        status: "ativo",
      })
      .select("id")
      .single();

    if (erroVinculo) {
      setVinculando(false);
      alert("Erro ao vincular pacote ao cliente: " + erroVinculo.message);
      return;
    }

    const saldosPayload = itensPacote.map((item: any) => ({
      cliente_pacote_id: clientePacote.id,
      servico_id: item.servico_id,
      quantidade_total: Number(item.quantidade || 1) * quantidadePacotes,
      quantidade_usada: 0,
    }));

    const { error: erroSaldos } = await supabase
      .from("cliente_pacote_saldos")
      .insert(saldosPayload);

    setVinculando(false);

    if (erroSaldos) {
      alert(
        "Pacote vinculado, mas erro ao gerar saldos: " + erroSaldos.message,
      );
      return;
    }

    alert("Pacote vinculado ao cliente com sucesso!");
    setModalVinculoAberto(false);
  }

  const pacotesFiltrados = pacotes.filter((pacote) => {
    const texto =
      `${pacote.nome || ""} ${pacote.descricao || ""}`.toLowerCase();
    return texto.includes(busca.toLowerCase());
  });

  const inputStyle: React.CSSProperties = {
    width: "100%",
    border: "1px solid #cbd5e1",
    borderRadius: isMobile ? 12 : 14,
    padding: isMobile ? "12px 13px" : "14px 16px",
    fontSize: isMobile ? 14 : 15,
    background: "#fff",
    boxSizing: "border-box",
  };

  const cardStyle: React.CSSProperties = {
    background: "#fff",
    border: "1px solid #d8def0",
    borderRadius: isMobile ? 18 : 22,
    padding: isMobile ? 16 : 22,
    boxShadow: "0 8px 20px rgba(15, 23, 42, 0.06)",
  };

  const primaryButton: React.CSSProperties = {
    background: "var(--cor-primaria, #27245f)",
    color: "#fff",
    border: "none",
    borderRadius: 14,
    padding: isMobile ? "12px 14px" : "13px 18px",
    fontWeight: 800,
    cursor: "pointer",
    width: isMobile ? "100%" : undefined,
  };

  const secondaryButton: React.CSSProperties = {
    background: "#fff",
    color: "#172554",
    border: "1px solid #cbd5e1",
    borderRadius: 12,
    padding: isMobile ? "10px 12px" : "10px 14px",
    fontWeight: 800,
    cursor: "pointer",
  };

  const dangerButton: React.CSSProperties = {
    background: "#fee2e2",
    color: "#dc2626",
    border: "none",
    borderRadius: 12,
    padding: isMobile ? "10px 12px" : "10px 14px",
    fontWeight: 800,
    cursor: "pointer",
  };

  function renderStatus(pacote: Pacote) {
    const statusAtual = pacote.status || "ativo";

    return (
      <span
        style={{
          display: "inline-flex",
          padding: "5px 10px",
          borderRadius: 999,
          fontWeight: 800,
          fontSize: 12,
          background: statusAtual === "inativo" ? "#fee2e2" : "#dcfce7",
          color: statusAtual === "inativo" ? "#b91c1c" : "#15803d",
        }}
      >
        {statusAtual === "inativo" ? "Inativo" : "Ativo"}
      </span>
    );
  }

  function descontoDoPacote(pacote: Pacote) {
    const tipo = pacote.tipo_desconto || "percentual";
    return tipo === "valor"
      ? formatarMoeda(Number(pacote.desconto_valor || 0))
      : `${Number(pacote.desconto_percentual || 0)}%`;
  }

  function renderAcoesPacote(pacote: Pacote, mobile = false) {
    const statusAtual = pacote.status || "ativo";

    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: mobile ? "1fr 1fr" : undefined,
          gap: 8,
          justifyContent: mobile ? undefined : "flex-end",
        }}
      >
        {!mobile && (
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={() => abrirVincularPacote(pacote)}
              style={secondaryButton}
            >
              Vincular
            </button>
            <button
              type="button"
              onClick={() => void abrirEditarPacote(pacote)}
              style={secondaryButton}
            >
              Editar
            </button>
            <button
              type="button"
              onClick={() => void alterarStatusPacote(pacote)}
              style={secondaryButton}
            >
              {statusAtual === "inativo" ? "Ativar" : "Inativar"}
            </button>
            <button
              type="button"
              onClick={() => void excluirPacote(pacote.id)}
              style={dangerButton}
            >
              Excluir
            </button>
          </div>
        )}

        {mobile && (
          <>
            <button
              type="button"
              onClick={() => abrirVincularPacote(pacote)}
              style={secondaryButton}
            >
              Vincular
            </button>
            <button
              type="button"
              onClick={() => void abrirEditarPacote(pacote)}
              style={secondaryButton}
            >
              Editar
            </button>
            <button
              type="button"
              onClick={() => void alterarStatusPacote(pacote)}
              style={secondaryButton}
            >
              {statusAtual === "inativo" ? "Ativar" : "Inativar"}
            </button>
            <button
              type="button"
              onClick={() => void excluirPacote(pacote.id)}
              style={dangerButton}
            >
              Excluir
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        padding: isMobile ? "72px 14px 18px" : 28,
        background: corFundo || "transparent",
        minHeight: "100%",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          justifyContent: "space-between",
          gap: 16,
          alignItems: isMobile ? "stretch" : "flex-start",
        }}
      >
        <div>
          <div
            style={{
              color: "#172554",
              fontSize: 13,
              fontWeight: 900,
              textTransform: "uppercase",
            }}
          >
            Marketing
          </div>
          <h1
            style={{
              margin: "6px 0 8px",
              fontSize: isMobile ? 27 : 34,
              lineHeight: 1.1,
            }}
          >
            Pacotes / Combos
          </h1>
          <p
            style={{
              margin: 0,
              color: "#64748b",
              fontSize: isMobile ? 14 : 16,
              lineHeight: 1.5,
            }}
          >
            Crie combos, pacotes e saldos de serviços para aplicar na
            finalização do atendimento.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            gap: 10,
            alignItems: isMobile ? "stretch" : "center",
          }}
        >
          <button
            type="button"
            onClick={() => abrirVincularPacote()}
            style={{ ...secondaryButton, width: isMobile ? "100%" : undefined }}
          >
            + Vincular ao cliente
          </button>

          <button type="button" onClick={abrirNovoPacote} style={primaryButton}>
            + Novo pacote
          </button>
        </div>
      </div>

      <div style={{ ...cardStyle, marginTop: isMobile ? 18 : 26 }}>
        <div
          style={{
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            justifyContent: "space-between",
            gap: 14,
            alignItems: isMobile ? "stretch" : "center",
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: isMobile ? 19 : 22 }}>
              Pacotes cadastrados
            </h2>
            <p style={{ margin: "6px 0 0", color: "#64748b" }}>
              {pacotesFiltrados.length} pacote(s) encontrado(s).
            </p>
          </div>

          <input
            placeholder="Buscar pacote..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            style={{ ...inputStyle, maxWidth: isMobile ? undefined : 380 }}
          />
        </div>

        {!isMobile && (
          <div style={{ marginTop: 18, overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 14,
              }}
            >
              <thead>
                <tr style={{ background: "#f8fafc", color: "#475569" }}>
                  <th style={{ padding: 14, textAlign: "left" }}>Pacote</th>
                  <th style={{ padding: 14, textAlign: "left" }}>Validade</th>
                  <th style={{ padding: 14, textAlign: "left" }}>Desconto</th>
                  <th style={{ padding: 14, textAlign: "left" }}>Valor</th>
                  <th style={{ padding: 14, textAlign: "left" }}>Status</th>
                  <th style={{ padding: 14, textAlign: "right" }}>Ações</th>
                </tr>
              </thead>

              <tbody>
                {carregando ? (
                  <tr>
                    <td
                      colSpan={6}
                      style={{
                        padding: 24,
                        textAlign: "center",
                        color: "#64748b",
                      }}
                    >
                      Carregando pacotes...
                    </td>
                  </tr>
                ) : pacotesFiltrados.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      style={{
                        padding: 24,
                        textAlign: "center",
                        color: "#64748b",
                      }}
                    >
                      Nenhum pacote cadastrado ainda.
                    </td>
                  </tr>
                ) : (
                  pacotesFiltrados.map((pacote) => (
                    <tr
                      key={pacote.id}
                      style={{ borderTop: "1px solid #e2e8f0" }}
                    >
                      <td style={{ padding: 14 }}>
                        <div style={{ fontWeight: 900 }}>{pacote.nome}</div>
                        <div style={{ color: "#64748b", fontSize: 12 }}>
                          {pacote.descricao || "-"}
                        </div>
                      </td>
                      <td style={{ padding: 14 }}>
                        {Number(pacote.validade_dias || 0)} dias
                      </td>
                      <td style={{ padding: 14 }}>
                        {descontoDoPacote(pacote)}
                      </td>
                      <td style={{ padding: 14 }}>
                        <div style={{ color: "#64748b", fontSize: 12 }}>
                          De {formatarMoeda(Number(pacote.valor_original || 0))}
                        </div>
                        <strong>
                          {formatarMoeda(Number(pacote.valor_final || 0))}
                        </strong>
                      </td>
                      <td style={{ padding: 14 }}>{renderStatus(pacote)}</td>
                      <td style={{ padding: 14, textAlign: "right" }}>
                        {renderAcoesPacote(pacote)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {isMobile && (
          <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
            {carregando ? (
              <div
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: 18,
                  padding: 18,
                  color: "#64748b",
                  textAlign: "center",
                }}
              >
                Carregando pacotes...
              </div>
            ) : pacotesFiltrados.length === 0 ? (
              <div
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: 18,
                  padding: 18,
                  color: "#64748b",
                  textAlign: "center",
                }}
              >
                Nenhum pacote cadastrado ainda.
              </div>
            ) : (
              pacotesFiltrados.map((pacote) => (
                <div
                  key={pacote.id}
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: 18,
                    padding: 14,
                    background: "#fff",
                    boxShadow: "0 6px 16px rgba(15,23,42,.05)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 10,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <h3 style={{ margin: 0, fontSize: 16, color: "#0f172a" }}>
                        {pacote.nome}
                      </h3>
                      <p
                        style={{
                          margin: "4px 0 0",
                          color: "#64748b",
                          fontSize: 12,
                        }}
                      >
                        {pacote.descricao || "Sem descrição"}
                      </p>
                    </div>
                    {renderStatus(pacote)}
                  </div>

                  <div
                    style={{
                      marginTop: 12,
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        borderRadius: 14,
                        background: "#f8fafc",
                        padding: 10,
                      }}
                    >
                      <p style={{ margin: 0, color: "#64748b", fontSize: 12 }}>
                        Validade
                      </p>
                      <strong>{Number(pacote.validade_dias || 0)} dias</strong>
                    </div>
                    <div
                      style={{
                        borderRadius: 14,
                        background: "#f8fafc",
                        padding: 10,
                      }}
                    >
                      <p style={{ margin: 0, color: "#64748b", fontSize: 12 }}>
                        Desconto
                      </p>
                      <strong>{descontoDoPacote(pacote)}</strong>
                    </div>
                    <div
                      style={{
                        borderRadius: 14,
                        background: "#f8fafc",
                        padding: 10,
                      }}
                    >
                      <p style={{ margin: 0, color: "#64748b", fontSize: 12 }}>
                        De
                      </p>
                      <strong>
                        {formatarMoeda(Number(pacote.valor_original || 0))}
                      </strong>
                    </div>
                    <div
                      style={{
                        borderRadius: 14,
                        background: "#f8fafc",
                        padding: 10,
                      }}
                    >
                      <p style={{ margin: 0, color: "#64748b", fontSize: 12 }}>
                        Por
                      </p>
                      <strong>
                        {formatarMoeda(Number(pacote.valor_final || 0))}
                      </strong>
                    </div>
                  </div>

                  <div style={{ marginTop: 12 }}>
                    {renderAcoesPacote(pacote, true)}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {modalVinculoAberto && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.55)",
            zIndex: 55,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: isMobile ? 10 : 20,
          }}
        >
          <div
            style={{
              width: isMobile ? "100%" : "min(720px, 96vw)",
              maxHeight: "92vh",
              overflowY: "auto",
              background: "#fff",
              borderRadius: isMobile ? 20 : 22,
              padding: isMobile ? 16 : 26,
              boxShadow: "0 24px 60px rgba(15, 23, 42, 0.30)",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                justifyContent: "space-between",
                gap: 12,
                alignItems: isMobile ? "stretch" : "center",
              }}
            >
              <div>
                <h2 style={{ margin: 0 }}>Vincular pacote ao cliente</h2>
                <p
                  style={{ margin: "6px 0 0", color: "#64748b", fontSize: 14 }}
                >
                  Escolha o cliente e o pacote. O sistema vai gerar os saldos
                  automaticamente.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalVinculoAberto(false)}
                style={secondaryButton}
              >
                Fechar
              </button>
            </div>

            <div
              style={{
                marginTop: 22,
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                gap: 16,
              }}
            >
              <div style={{ gridColumn: isMobile ? undefined : "1 / -1" }}>
                <label style={{ fontWeight: 900, fontSize: 13 }}>
                  Cliente *
                </label>
                <select
                  value={vinculoClienteId}
                  onChange={(e) => setVinculoClienteId(e.target.value)}
                  style={inputStyle}
                >
                  <option value="">Selecione um cliente</option>
                  {clientes.map((cliente) => (
                    <option key={cliente.id} value={cliente.id}>
                      {cliente.nome || "Sem nome"}{" "}
                      {cliente.telefone ? `- ${cliente.telefone}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ gridColumn: isMobile ? undefined : "1 / -1" }}>
                <label style={{ fontWeight: 900, fontSize: 13 }}>
                  Pacote *
                </label>
                <select
                  value={vinculoPacoteId}
                  onChange={(e) => atualizarPacoteDoVinculo(e.target.value)}
                  style={inputStyle}
                >
                  <option value="">Selecione um pacote</option>
                  {pacotes
                    .filter((pacote) => (pacote.status || "ativo") === "ativo")
                    .map((pacote) => (
                      <option key={pacote.id} value={pacote.id}>
                        {pacote.nome} -{" "}
                        {formatarMoeda(Number(pacote.valor_final || 0))}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label style={{ fontWeight: 900, fontSize: 13 }}>
                  Quantidade de pacotes *
                </label>
                <input
                  type="number"
                  min="1"
                  value={vinculoQuantidadePacotes}
                  onChange={(e) => setVinculoQuantidadePacotes(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={{ fontWeight: 900, fontSize: 13 }}>
                  Validade em dias
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="Deixe vazio para não vencer"
                  value={vinculoValidadeDias}
                  onChange={(e) => atualizarValidadeDiasVinculo(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={{ fontWeight: 900, fontSize: 13 }}>
                  Data início
                </label>
                <input
                  type="date"
                  value={vinculoDataInicio}
                  onChange={(e) => atualizarDataInicioVinculo(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={{ fontWeight: 900, fontSize: 13 }}>
                  Válido até
                </label>
                <input
                  type="date"
                  value={vinculoDataFim}
                  onChange={(e) => setVinculoDataFim(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>

            <div
              style={{
                marginTop: 18,
                border: "1px solid #d8def0",
                background: "#f8fafc",
                borderRadius: 18,
                padding: 16,
                color: "#334155",
                fontSize: 14,
              }}
            >
              <strong>Importante:</strong> ao salvar, o cliente passa a ter
              saldo disponível dos serviços incluídos no pacote. A quantidade de
              pacotes multiplica o saldo.
            </div>

            <div
              style={{
                marginTop: 22,
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                gap: 10,
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                onClick={() => setModalVinculoAberto(false)}
                style={secondaryButton}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void salvarVinculoClientePacote()}
                disabled={vinculando}
                style={primaryButton}
              >
                {vinculando ? "Vinculando..." : "Vincular pacote"}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalAberto && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.55)",
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: isMobile ? 10 : 20,
          }}
        >
          <div
            style={{
              width: isMobile ? "100%" : "min(1180px, 96vw)",
              maxHeight: "92vh",
              overflowY: "auto",
              background: "#fff",
              borderRadius: isMobile ? 20 : 22,
              padding: isMobile ? 16 : 26,
              boxShadow: "0 24px 60px rgba(15, 23, 42, 0.30)",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                justifyContent: "space-between",
                gap: 12,
                alignItems: isMobile ? "stretch" : "center",
              }}
            >
              <h2 style={{ margin: 0 }}>
                {editandoId ? "Editar pacote" : "Novo pacote"}
              </h2>
              <button
                type="button"
                onClick={() => setModalAberto(false)}
                style={secondaryButton}
              >
                Fechar
              </button>
            </div>

            <div
              style={{
                marginTop: 22,
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                gap: 16,
              }}
            >
              <div>
                <label style={{ fontWeight: 900, fontSize: 13 }}>
                  Nome do pacote *
                </label>
                <input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Combo Pé e Mão Mensal"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={{ fontWeight: 900, fontSize: 13 }}>
                  Desconto
                </label>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                    gap: 10,
                  }}
                >
                  <select
                    value={tipoDesconto}
                    onChange={(e) =>
                      setTipoDesconto(e.target.value as "percentual" | "valor")
                    }
                    style={inputStyle}
                  >
                    <option value="percentual">Porcentagem (%)</option>
                    <option value="valor">Valor fixo (R$)</option>
                  </select>

                  <input
                    type="number"
                    min={0}
                    value={
                      tipoDesconto === "percentual"
                        ? descontoPercentual
                        : descontoValor
                    }
                    onChange={(e) => {
                      const valor = Number(e.target.value || 0);
                      if (tipoDesconto === "percentual")
                        setDescontoPercentual(valor);
                      else setDescontoValor(valor);
                    }}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontWeight: 900, fontSize: 13 }}>
                  Validade em dias
                </label>
                <input
                  type="number"
                  min={1}
                  value={validadeDias}
                  onChange={(e) =>
                    setValidadeDias(Number(e.target.value || 30))
                  }
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={{ fontWeight: 900, fontSize: 13 }}>Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  style={inputStyle}
                >
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </select>
              </div>

              <div style={{ gridColumn: isMobile ? undefined : "1 / -1" }}>
                <label style={{ fontWeight: 900, fontSize: 13 }}>
                  Descrição
                </label>
                <textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Descrição comercial do pacote"
                  style={{ ...inputStyle, minHeight: 88, resize: "vertical" }}
                />
              </div>
            </div>

            <div style={{ marginTop: 24 }}>
              <div
                style={{
                  display: "flex",
                  flexDirection: isMobile ? "column" : "row",
                  justifyContent: "space-between",
                  alignItems: isMobile ? "stretch" : "center",
                  gap: 12,
                }}
              >
                <h3 style={{ margin: 0 }}>Serviços incluídos</h3>
                <button
                  type="button"
                  onClick={adicionarServico}
                  style={secondaryButton}
                >
                  + Adicionar serviço
                </button>
              </div>

              <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
                {itens.map((item, index) => (
                  <div
                    key={index}
                    style={{
                      display: "grid",
                      gridTemplateColumns: isMobile
                        ? "1fr"
                        : "1fr 120px 150px 150px 110px",
                      gap: 10,
                      alignItems: "center",
                      border: isMobile ? "1px solid #e2e8f0" : undefined,
                      borderRadius: isMobile ? 16 : undefined,
                      padding: isMobile ? 12 : undefined,
                    }}
                  >
                    <select
                      value={item.servico_id}
                      onChange={(e) =>
                        atualizarItem(index, "servico_id", e.target.value)
                      }
                      style={inputStyle}
                    >
                      <option value="">Selecione um serviço</option>
                      {servicos.map((servico) => (
                        <option key={servico.id} value={servico.id}>
                          {servico.nome}
                        </option>
                      ))}
                    </select>

                    <input
                      type="number"
                      min={1}
                      value={item.quantidade}
                      onChange={(e) =>
                        atualizarItem(
                          index,
                          "quantidade",
                          Number(e.target.value || 1),
                        )
                      }
                      style={inputStyle}
                    />

                    <div style={{ ...inputStyle, background: "#f8fafc" }}>
                      <div style={{ fontSize: 12, color: "#475569" }}>
                        Valor unitário
                      </div>
                      <strong>{formatarMoeda(item.valor_unitario)}</strong>
                    </div>

                    <div style={{ ...inputStyle, background: "#f8fafc" }}>
                      <div style={{ fontSize: 12, color: "#475569" }}>
                        Subtotal
                      </div>
                      <strong>{formatarMoeda(item.valor_total)}</strong>
                    </div>

                    <button
                      type="button"
                      onClick={() => removerServico(index)}
                      style={{
                        ...dangerButton,
                        width: isMobile ? "100%" : undefined,
                      }}
                    >
                      Remover
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                marginTop: 24,
                border: "1px solid #d8def0",
                background: "#f8fafc",
                borderRadius: 18,
                padding: 18,
              }}
            >
              <div style={{ display: "grid", gap: 10 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <span>Total real dos serviços</span>
                  <strong>{formatarMoeda(totalServicos)}</strong>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <span>
                    Desconto{" "}
                    {tipoDesconto === "percentual"
                      ? `(${descontoPercentual}%)`
                      : "(R$)"}
                  </span>
                  <strong>- {formatarMoeda(valorDesconto)}</strong>
                </div>

                <hr
                  style={{
                    border: "none",
                    borderTop: "1px solid #cbd5e1",
                    margin: "4px 0",
                  }}
                />

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                    fontSize: isMobile ? 18 : 22,
                  }}
                >
                  <strong>Valor final do pacote</strong>
                  <strong>{formatarMoeda(totalFinal)}</strong>
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: 22,
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                gap: 10,
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                onClick={() => setModalAberto(false)}
                style={secondaryButton}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void salvarPacote()}
                disabled={salvando}
                style={primaryButton}
              >
                {salvando
                  ? "Salvando..."
                  : editandoId
                    ? "Salvar alterações"
                    : "Criar pacote"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
