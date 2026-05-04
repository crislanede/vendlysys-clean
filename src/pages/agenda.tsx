import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { useEmpresa } from "../hooks/useEmpresa";
import PageHeader from "../components/ui/PageHeader";
import PrimaryButton from "../components/ui/PrimaryButton";
import SecondaryButton from "../components/ui/SecondaryButton";
import AlertaAnamneseAgenda from "../components/agenda/AlertaAnamneseAgenda";
import {
  montarLinkMeuEspaco,
  montarMensagemAgradecimento,
  normalizarTelefoneWhatsapp,
} from "../lib/whatsapp";
import {
  buscarAlertasAnamneseCliente,
  type AlertaAnamneseItem,
} from "../lib/anamneseAlerta";

type Cliente = {
  id: string;
  nome: string;
  telefone?: string | null;
  email?: string | null;
  data_nascimento?: string | null;
};

type Servico = {
  id: string;
  nome: string;
  valor?: number | null;
  preco?: number | null;
  descricao?: string | null;
  duracao?: number | null;
  duracao_padrao_minutos?: number | null;
};

type Profissional = {
  id: string;
  nome: string;
};

type Agendamento = {
  id: string;
  cliente_id?: string | null;
  profissional_id?: string | null;
  servico_id?: string | null;
  cliente?: string | null;
  profissional?: string | null;
  servico?: string | null;
  data: string;
  horario: string;
  status?: string | null;
  observacoes?: string | null;
  no_show?: boolean | null;
  valor?: number | null;
  valor_pago?: number | null;
  forma_pagamento?: string | null;
  status_pagamento?: string | null;
  finalizado_em?: string | null;
  telefone?: string | null;
  token?: string | null;
  token_cliente?: string | null;
  duracao_minutos?: number | null;
  created_at?: string | null;
};

type PacoteDisponivel = {
  saldo_id: string;
  cliente_pacote_id: string;
  pacote_id: string | null;
  pacote_nome: string;
  servico_id: string;
  quantidade_total: number;
  quantidade_usada: number;
  restante: number;
  data_fim: string | null;
};

const HORARIOS = [
  "08:00",
  "08:30",
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
  "18:00",
];

const STATUS_OPTIONS = [
  { label: "Todos", value: "todos" },
  { label: "Agendado", value: "agendado" },
  { label: "Confirmado", value: "confirmado" },
  { label: "Finalizado", value: "finalizado" },
  { label: "Cancelado", value: "cancelado" },
];

const weekdayFormatter = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
});

const headerDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const monthFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
});

function getTodayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseTimeToMinutes(value?: string | null) {
  if (!value || !value.includes(":")) return 0;
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function somarMinutos(horario: string, minutos: number) {
  const [hours, minutes] = horario.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes + minutos, 0, 0);

  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes(),
  ).padStart(2, "0")}`;
}

function formatDisplayDate(dateValue: string) {
  if (!dateValue) return "";
  const date = new Date(`${dateValue}T00:00:00`);
  const weekday = weekdayFormatter.format(date);
  const fullDate = headerDateFormatter.format(date);
  return `${fullDate} · ${weekday.charAt(0).toUpperCase() + weekday.slice(1)}`;
}

function classByStatus(status?: string | null) {
  switch ((status || "").toLowerCase()) {
    case "finalizado":
      return {
        bg: "#dcfce7",
        border: "#86efac",
        text: "#166534",
      };
    case "cancelado":
      return {
        bg: "#fee2e2",
        border: "#fca5a5",
        text: "#991b1b",
      };
    case "confirmado":
      return {
        bg: "#dbeafe",
        border: "#93c5fd",
        text: "#1d4ed8",
      };
    default:
      return {
        bg: "#fef3c7",
        border: "#fcd34d",
        text: "#92400e",
      };
  }
}

function MiniCalendar({
  selectedDate,
  onSelect,
}: {
  selectedDate: string;
  onSelect: (date: string) => void;
}) {
  const selected = new Date(`${selectedDate}T00:00:00`);
  const year = selected.getFullYear();
  const month = selected.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = lastDay.getDate();

  const days: Array<number | null> = [];
  for (let i = 0; i < startOffset; i += 1) days.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) days.push(day);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold capitalize text-slate-800">
          {monthFormatter.format(selected)}
        </p>
      </div>

      <div className="mb-2 grid grid-cols-7 text-center text-[11px] uppercase tracking-wide text-slate-400">
        {["seg", "ter", "qua", "qui", "sex", "sáb", "dom"].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => {
          if (!day) {
            return <div key={`empty-${index}`} className="h-9" />;
          }

          const date = new Date(year, month, day);
          const iso = `${date.getFullYear()}-${String(
            date.getMonth() + 1,
          ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
          const isSelected = iso === selectedDate;
          const isToday = iso === getTodayString();

          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelect(iso)}
              className="flex h-9 items-center justify-center rounded-xl text-sm transition"
              style={{
                backgroundColor: isSelected
                  ? "var(--color-primary)"
                  : isToday
                    ? "rgba(249, 115, 22, 0.12)"
                    : "transparent",
                color: isSelected
                  ? "#fff"
                  : isToday
                    ? "var(--color-primary)"
                    : "#0f172a",
                fontWeight: isSelected || isToday ? 700 : 500,
              }}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function filtrarAniversariantesDoMes(clientes: Cliente[]) {
  const mesAtual = new Date().getMonth() + 1;

  return clientes
    .filter((cliente) => !!cliente.data_nascimento)
    .filter((cliente) => {
      const data = new Date(`${cliente.data_nascimento}T00:00:00`);
      return data.getMonth() + 1 === mesAtual;
    })
    .sort((a, b) => {
      const diaA = Number((a.data_nascimento || "").split("-")[2] || 0);
      const diaB = Number((b.data_nascimento || "").split("-")[2] || 0);
      return diaA - diaB;
    });
}

function formatarData(data?: string | null) {
  if (!data) return "-";
  return new Date(`${data}T00:00:00`).toLocaleDateString("pt-BR");
}

function formatarDataNascimento(data?: string | null) {
  if (!data) return "-";
  const partes = data.split("-");
  if (partes.length !== 3) return data;
  return `${partes[2]}/${partes[1]}`;
}

function montarMensagemAniversario(nome: string) {
  return `Olá, ${nome}! 🎉 Passando para te desejar um feliz aniversário! Temos uma condição especial para você este mês. 💝`;
}

export default function AgendaPage() {
  const { empresaId, carregandoEmpresa } = useEmpresa();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [aniversariantes, setAniversariantes] = useState<Cliente[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);

  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [profissionalFilter, setProfissionalFilter] = useState("todos");

  const [cliente, setCliente] = useState("");
  const [servico, setServico] = useState("");
  const [profissional, setProfissional] = useState("");
  const [data, setData] = useState(getTodayString());
  const [hora, setHora] = useState("09:00");
  const [observacoes, setObservacoes] = useState("");

  const [alertas, setAlertas] = useState<AlertaAnamneseItem[]>([]);
  const [confirmou, setConfirmou] = useState(false);
  const [loadingAlerta, setLoadingAlerta] = useState(false);

  const [modalNovoAberto, setModalNovoAberto] = useState(false);
  const [loadingSalvar, setLoadingSalvar] = useState(false);

  const [modalFinalizarAberto, setModalFinalizarAberto] = useState(false);
  const [agendamentoSelecionado, setAgendamentoSelecionado] =
    useState<Agendamento | null>(null);
  const [valorPagamento, setValorPagamento] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("pix");
  const [statusPagamento, setStatusPagamento] = useState("pago");
  const [loadingFinalizar, setLoadingFinalizar] = useState(false);

  const [modalReagendarAberto, setModalReagendarAberto] = useState(false);
  const [agendamentoReagendar, setAgendamentoReagendar] =
    useState<Agendamento | null>(null);
  const [dataReagendamento, setDataReagendamento] = useState(getTodayString());
  const [horaReagendamento, setHoraReagendamento] = useState("09:00");
  const [loadingReagendar, setLoadingReagendar] = useState(false);

  const [pacotesDisponiveis, setPacotesDisponiveis] = useState<
    PacoteDisponivel[]
  >([]);
  const [usarPacote, setUsarPacote] = useState(false);
  const [saldoPacoteSelecionadoId, setSaldoPacoteSelecionadoId] = useState("");

  useEffect(() => {
    if (empresaId) {
      void carregarTudo();
    }
  }, [empresaId]);

  async function carregarTudo() {
    if (!empresaId) return;

    const [clientesRes, servicosRes, profissionaisRes, agendamentosRes] =
      await Promise.all([
        supabase
          .from("clientes")
          .select("*")
          .eq("empresa_id", empresaId)
          .order("nome"),
        supabase
          .from("servicos")
          .select("*")
          .eq("empresa_id", empresaId)
          .order("nome"),
        supabase
          .from("profissionais")
          .select("*")
          .eq("empresa_id", empresaId)
          .order("nome"),
        supabase
          .from("agendamentos")
          .select("*")
          .eq("empresa_id", empresaId)
          .order("data", { ascending: true })
          .order("horario", { ascending: true }),
      ]);

    const clientesData = (clientesRes.data || []) as Cliente[];

    setClientes(clientesData);
    setAniversariantes(filtrarAniversariantesDoMes(clientesData));
    setServicos((servicosRes.data || []) as Servico[]);
    setProfissionais((profissionaisRes.data || []) as Profissional[]);
    setAgendamentos((agendamentosRes.data || []) as Agendamento[]);
  }

  function abrirWhatsAppAniversario(cliente: Cliente) {
    if (!cliente.telefone) {
      alert("Cliente sem telefone cadastrado.");
      return;
    }

    const numero = normalizarTelefoneWhatsapp(cliente.telefone);
    const mensagem = encodeURIComponent(
      montarMensagemAniversario(cliente.nome),
    );
    window.open(`https://wa.me/${numero}?text=${mensagem}`, "_blank");
  }

  async function carregarAlertas(nomeCliente: string) {
    const clienteEncontrado = clientes.find(
      (item) => item.nome === nomeCliente,
    );
    if (!clienteEncontrado) {
      setAlertas([]);
      return;
    }

    setLoadingAlerta(true);
    const dados = await buscarAlertasAnamneseCliente({
      id: clienteEncontrado.id,
      nome: clienteEncontrado.nome,
    });
    setAlertas(dados);
    setConfirmou(false);
    setLoadingAlerta(false);
  }

  function limparFormulario() {
    setCliente("");
    setServico("");
    setProfissional("");
    setData(selectedDate);
    setHora("09:00");
    setObservacoes("");
    setAlertas([]);
    setConfirmou(false);
  }

  async function salvarAgendamento() {
    if (!cliente || !servico || !profissional || !data || !hora) {
      alert("Preencha cliente, serviço, profissional, data e horário.");
      return;
    }

    if (alertas.length > 0 && !confirmou) {
      alert("Confirme a leitura dos alertas da anamnese antes de salvar.");
      return;
    }

    const clienteItem = clientes.find((item) => item.nome === cliente);
    const servicoItem = servicos.find((item) => item.nome === servico);
    const profissionalItem = profissionais.find(
      (item) => item.nome === profissional,
    );

    if (!profissionalItem) {
      alert("Selecione um profissional válido.");
      return;
    }

    if (!servicoItem) {
      alert("Selecione um serviço válido.");
      return;
    }

    const duracaoBase =
      servicoItem.duracao_padrao_minutos || servicoItem.duracao || 60;

    const duracaoTotal = duracaoBase + 10;
    const horarioFim = somarMinutos(hora, duracaoTotal);

    const conflito = agendamentos.some((item) => {
      if (item.status === "cancelado") return false;
      if (item.profissional_id !== profissionalItem.id) return false;
      if (item.data !== data) return false;

      const inicioExistente = item.horario;
      const fimExistente = somarMinutos(
        item.horario,
        item.duracao_minutos || 60,
      );

      return hora < fimExistente && horarioFim > inicioExistente;
    });

    if (conflito) {
      alert(
        "Já existe um agendamento nesse horário para esse profissional. Escolha outro horário.",
      );
      return;
    }

    setLoadingSalvar(true);

    const { error } = await supabase.from("agendamentos").insert([
      {
        empresa_id: empresaId,
        cliente,
        servico,
        profissional,
        cliente_id: clienteItem?.id || null,
        servico_id: servicoItem.id,
        profissional_id: profissionalItem.id,
        data,
        horario: hora,
        observacoes: observacoes || null,
        duracao_minutos: duracaoTotal,
        status: "agendado",
        no_show: false,
      },
    ]);

    setLoadingSalvar(false);

    if (error) {
      if (error.message.includes("agendamento_unico")) {
        alert(
          "Esse horário já está ocupado para esse profissional. Escolha outro horário.",
        );
        return;
      }

      alert(`Erro ao salvar agendamento: ${error.message}`);
      return;
    }

    limparFormulario();
    setModalNovoAberto(false);
    setSelectedDate(data);
    await carregarTudo();
  }

  async function confirmarAgendamento(agendamento: Agendamento) {
    const { error } = await supabase
      .from("agendamentos")
      .update({ status: "confirmado" })
      .eq("id", agendamento.id);

    if (error) {
      alert(`Erro ao confirmar: ${error.message}`);
      return;
    }

    await carregarTudo();

    const enviarWhatsapp = window.confirm(
      "Agendamento confirmado. Deseja abrir o WhatsApp para enviar a confirmação ao cliente?",
    );

    if (enviarWhatsapp) {
      await enviarConfirmacaoWhatsapp({ ...agendamento, status: "confirmado" });
    }
  }

  async function cancelarAgendamento(agendamento: Agendamento) {
    const confirmarCancelamento = window.confirm(
      "Deseja cancelar este agendamento? Ao cancelar, o horário será liberado para novo agendamento.",
    );

    if (!confirmarCancelamento) return;

    const payloadCompleto = {
      status: "cancelado",
      cancelado_em: new Date().toISOString(),
    };

    const payloadMinimo = {
      status: "cancelado",
    };

    let resultado = await supabase
      .from("agendamentos")
      .update(payloadCompleto)
      .eq("id", agendamento.id);

    if (resultado.error) {
      const mensagemErro = String(resultado.error.message || "").toLowerCase();
      const erroColunaCanceladoEm =
        mensagemErro.includes("cancelado_em") ||
        mensagemErro.includes("schema cache") ||
        mensagemErro.includes("could not find") ||
        mensagemErro.includes("column");

      if (erroColunaCanceladoEm) {
        resultado = await supabase
          .from("agendamentos")
          .update(payloadMinimo)
          .eq("id", agendamento.id);
      }
    }

    if (resultado.error) {
      alert(`Erro ao cancelar: ${resultado.error.message}`);
      return;
    }

    await carregarTudo();

    const enviarWhatsapp = window.confirm(
      "Agendamento cancelado e horário liberado. Deseja abrir o WhatsApp para avisar o cliente?",
    );

    if (enviarWhatsapp) {
      await enviarCancelamentoWhatsapp({ ...agendamento, status: "cancelado" });
    }
  }

  function abrirModalReagendar(agendamento: Agendamento) {
    setAgendamentoReagendar(agendamento);
    setDataReagendamento(agendamento.data || selectedDate);
    setHoraReagendamento(agendamento.horario || "09:00");
    setModalReagendarAberto(true);
  }

  async function salvarReagendamento() {
    if (!agendamentoReagendar) return;

    if (!dataReagendamento || !horaReagendamento) {
      alert("Informe a nova data e o novo horário.");
      return;
    }

    const duracaoTotal = Number(agendamentoReagendar.duracao_minutos || 60);
    const horarioFim = somarMinutos(horaReagendamento, duracaoTotal);

    const conflito = agendamentos.some((item) => {
      if (item.id === agendamentoReagendar.id) return false;
      if (item.status === "cancelado") return false;
      if (item.profissional_id !== agendamentoReagendar.profissional_id)
        return false;
      if (item.data !== dataReagendamento) return false;

      const inicioExistente = item.horario;
      const fimExistente = somarMinutos(
        item.horario,
        item.duracao_minutos || 60,
      );

      return horaReagendamento < fimExistente && horarioFim > inicioExistente;
    });

    if (conflito) {
      alert(
        "Já existe um agendamento nesse intervalo para esse profissional. Escolha outro horário.",
      );
      return;
    }

    setLoadingReagendar(true);

    const { error } = await supabase
      .from("agendamentos")
      .update({
        data: dataReagendamento,
        horario: horaReagendamento,
        status:
          agendamentoReagendar.status === "confirmado"
            ? "confirmado"
            : "agendado",
      })
      .eq("id", agendamentoReagendar.id);

    setLoadingReagendar(false);

    if (error) {
      alert(`Erro ao reagendar: ${error.message}`);
      return;
    }

    const agendamentoAtualizado: Agendamento = {
      ...agendamentoReagendar,
      data: dataReagendamento,
      horario: horaReagendamento,
      status:
        agendamentoReagendar.status === "confirmado"
          ? "confirmado"
          : "agendado",
    };

    setModalReagendarAberto(false);
    setAgendamentoReagendar(null);
    setSelectedDate(dataReagendamento);
    setData(dataReagendamento);
    await carregarTudo();

    const enviarWhatsapp = window.confirm(
      "Reagendamento salvo. Deseja abrir o WhatsApp para enviar a mensagem manualmente ao cliente?",
    );

    if (enviarWhatsapp) {
      await enviarReagendamentoWhatsapp(agendamentoAtualizado);
    }
  }

  function valorPadraoDoAgendamento(agendamento: Agendamento) {
    let valor = "";

    if (agendamento.servico_id) {
      const servicoBanco = servicos.find(
        (item) => item.id === agendamento.servico_id,
      );
      valor = String(servicoBanco?.valor ?? servicoBanco?.preco ?? "");
    }

    if (!valor && agendamento.servico) {
      const servicoPorNome = servicos.find(
        (item) => item.nome === agendamento.servico,
      );
      valor = String(servicoPorNome?.valor ?? servicoPorNome?.preco ?? "");
    }

    return valor && valor !== "undefined" ? valor : "";
  }

  async function abrirModalFinalizar(agendamento: Agendamento) {
    setAgendamentoSelecionado(agendamento);
    setFormaPagamento("pix");
    setStatusPagamento("pago");
    setUsarPacote(false);
    setSaldoPacoteSelecionadoId("");
    setPacotesDisponiveis([]);
    setValorPagamento(valorPadraoDoAgendamento(agendamento));

    const pacotes = await buscarPacotesDisponiveis(agendamento);
    setPacotesDisponiveis(pacotes);
    if (pacotes.length > 0) {
      setSaldoPacoteSelecionadoId(pacotes[0].saldo_id);
    }

    setModalFinalizarAberto(true);
  }

  async function buscarPacotesDisponiveis(
    agendamento: Agendamento,
  ): Promise<PacoteDisponivel[]> {
    const clienteId =
      agendamento.cliente_id ||
      clientes.find((item) => item.nome === agendamento.cliente)?.id;
    const servicoId =
      agendamento.servico_id ||
      servicos.find((item) => item.nome === agendamento.servico)?.id;

    if (!clienteId || !servicoId) return [];

    const { data: clientePacotes, error: erroClientePacotes } = await supabase
      .from("cliente_pacotes")
      .select("id, pacote_id, data_fim, status")
      .eq("cliente_id", clienteId)
      .eq("status", "ativo");

    if (erroClientePacotes) {
      console.error("Erro ao buscar pacotes do cliente:", erroClientePacotes);
      return [];
    }

    const hoje = getTodayString();
    const pacotesAtivos = (clientePacotes || []).filter((item: any) => {
      return !item.data_fim || item.data_fim >= hoje;
    });

    if (pacotesAtivos.length === 0) return [];

    const clientePacoteIds = pacotesAtivos.map((item: any) => item.id);

    const { data: saldos, error: erroSaldos } = await supabase
      .from("cliente_pacote_saldos")
      .select(
        "id, cliente_pacote_id, servico_id, quantidade_total, quantidade_usada",
      )
      .in("cliente_pacote_id", clientePacoteIds)
      .eq("servico_id", servicoId);

    if (erroSaldos) {
      console.error("Erro ao buscar saldos de pacote:", erroSaldos);
      return [];
    }

    const saldosDisponiveis = (saldos || []).filter((saldo: any) => {
      return (
        Number(saldo.quantidade_total || 0) -
          Number(saldo.quantidade_usada || 0) >
        0
      );
    });

    if (saldosDisponiveis.length === 0) return [];

    const pacoteIds = pacotesAtivos
      .map((item: any) => item.pacote_id)
      .filter(Boolean);

    const pacotesBase = pacoteIds.length
      ? (
          await supabase
            .from("marketing_pacotes")
            .select("id, nome")
            .in("id", pacoteIds)
        ).data || []
      : [];

    return saldosDisponiveis.map((saldo: any) => {
      const clientePacote = pacotesAtivos.find(
        (item: any) => item.id === saldo.cliente_pacote_id,
      );
      const pacoteBase = pacotesBase.find(
        (item: any) => item.id === clientePacote?.pacote_id,
      );
      const total = Number(saldo.quantidade_total || 0);
      const usada = Number(saldo.quantidade_usada || 0);

      return {
        saldo_id: saldo.id,
        cliente_pacote_id: saldo.cliente_pacote_id,
        pacote_id: clientePacote?.pacote_id || null,
        pacote_nome: pacoteBase?.nome || "Pacote do cliente",
        servico_id: saldo.servico_id,
        quantidade_total: total,
        quantidade_usada: usada,
        restante: total - usada,
        data_fim: clientePacote?.data_fim || null,
      };
    });
  }

  function telefoneDoAgendamento(agendamento: Agendamento) {
    if (agendamento.telefone) return agendamento.telefone;

    const clienteBanco = clientes.find((item) => {
      if (agendamento.cliente_id && item.id === agendamento.cliente_id)
        return true;
      return item.nome === agendamento.cliente;
    });

    return clienteBanco?.telefone || "";
  }

  async function garantirTokenReagendamento(agendamento: Agendamento) {
    const tokenExistente = agendamento.token_cliente || agendamento.token || "";

    if (tokenExistente) return tokenExistente;

    const novoToken =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const { error } = await supabase
      .from("agendamentos")
      .update({ token_cliente: novoToken })
      .eq("id", agendamento.id);

    if (error) {
      console.error("Erro ao gerar token de reagendamento:", error);
      alert(
        "Reagendamento salvo, mas não foi possível gerar o link do Meu Espaço para WhatsApp.",
      );
      return "";
    }

    return novoToken;
  }

  async function enviarConfirmacaoWhatsapp(agendamento: Agendamento) {
    const telefone = telefoneDoAgendamento(agendamento);

    if (!telefone) {
      alert(
        "Não foi possível abrir o WhatsApp: este cliente não possui telefone cadastrado.",
      );
      return;
    }

    const token = await garantirTokenReagendamento(agendamento);

    if (!token) return;

    const linkMeuEspaco = montarLinkMeuEspaco(token);
    const mensagem = `Olá, ${agendamento.cliente || "cliente"}! Seu agendamento foi confirmado.

Serviço: ${agendamento.servico || "não informado"}
Data: ${formatarData(agendamento.data)}
Horário: ${agendamento.horario || "não informado"}
Profissional: ${agendamento.profissional || "não informado"}

Para confirmar ou acompanhar seu agendamento, acesse:
${linkMeuEspaco}`;

    const numero = normalizarTelefoneWhatsapp(telefone);
    const texto = encodeURIComponent(mensagem);

    window.location.href = `https://wa.me/${numero}?text=${texto}`;
  }

  async function enviarCancelamentoWhatsapp(agendamento: Agendamento) {
    const telefone = telefoneDoAgendamento(agendamento);

    if (!telefone) {
      alert(
        "Não foi possível abrir o WhatsApp: este cliente não possui telefone cadastrado.",
      );
      return;
    }

    const mensagem = `Olá, ${agendamento.cliente || "cliente"}! Seu agendamento foi cancelado.

Serviço: ${agendamento.servico || "não informado"}
Data: ${formatarData(agendamento.data)}
Horário: ${agendamento.horario || "não informado"}
Profissional: ${agendamento.profissional || "não informado"}

Caso queira remarcar, entre em contato conosco.`;

    const numero = normalizarTelefoneWhatsapp(telefone);
    const texto = encodeURIComponent(mensagem);

    window.location.href = `https://wa.me/${numero}?text=${texto}`;
  }

  async function enviarReagendamentoWhatsapp(agendamento: Agendamento) {
    const telefone = telefoneDoAgendamento(agendamento);

    if (!telefone) {
      alert(
        "Não foi possível abrir o WhatsApp: este cliente não possui telefone cadastrado.",
      );
      return;
    }

    const token = await garantirTokenReagendamento(agendamento);

    if (!token) return;

    const linkMeuEspaco = montarLinkMeuEspaco(token);
    const mensagem = `Olá, ${agendamento.cliente || "cliente"}! Seu atendimento foi reagendado.

Serviço: ${agendamento.servico || "não informado"}
Data: ${formatarData(agendamento.data)}
Horário: ${agendamento.horario || "não informado"}
Profissional: ${agendamento.profissional || "não informado"}

Para confirmar ou acompanhar seu agendamento, acesse:
${linkMeuEspaco}`;

    const numero = normalizarTelefoneWhatsapp(telefone);
    const texto = encodeURIComponent(mensagem);

    window.location.href = `https://wa.me/${numero}?text=${texto}`;
  }

  async function enviarAgradecimentoWhatsapp(agendamento: Agendamento) {
    const telefone = telefoneDoAgendamento(agendamento);

    if (!telefone) {
      alert(
        "Não foi possível abrir o WhatsApp: este cliente não possui telefone cadastrado.",
      );
      return;
    }

    const token = agendamento.token_cliente || agendamento.token || "";

    const mensagem = montarMensagemAgradecimento({
      empresa: "Seu estabelecimento",
      cliente: agendamento.cliente || "",
      profissional: agendamento.profissional || "",
      servico: agendamento.servico || "",
      data: agendamento.data,
      horario: agendamento.horario,
      valor: usarPacote ? 0 : Number(valorPagamento || 0),
      linkMeuEspaco: montarLinkMeuEspaco(token),
    });

    const numero = normalizarTelefoneWhatsapp(telefone);
    const texto = encodeURIComponent(mensagem);

    // Usar href evita bloqueio de pop-up depois que a finalização salva no banco.
    window.location.href = `https://wa.me/${numero}?text=${texto}`;
  }

  async function finalizarComPagamento() {
    if (!agendamentoSelecionado) return;

    const pacoteSelecionado = pacotesDisponiveis.find(
      (item) => item.saldo_id === saldoPacoteSelecionadoId,
    );

    if (usarPacote && !pacoteSelecionado) {
      alert("Selecione um pacote válido para usar neste atendimento.");
      return;
    }

    if (!usarPacote && !valorPagamento) {
      alert("Informe o valor do atendimento.");
      return;
    }

    const confirmar = window.confirm(
      "Deseja finalizar este atendimento? Esta ação vai registrar o pagamento e, se selecionado, baixar o saldo do combo.",
    );

    if (!confirmar) return;

    setLoadingFinalizar(true);

    try {
      if (usarPacote && pacoteSelecionado) {
        const { error: erroSaldo } = await supabase
          .from("cliente_pacote_saldos")
          .update({ quantidade_usada: pacoteSelecionado.quantidade_usada + 1 })
          .eq("id", pacoteSelecionado.saldo_id);

        if (erroSaldo) {
          throw new Error(
            `Erro ao baixar saldo do pacote: ${erroSaldo.message}`,
          );
        }

        const { error: erroUso } = await supabase
          .from("cliente_pacote_usos")
          .insert([
            {
              cliente_pacote_id: pacoteSelecionado.cliente_pacote_id,
              agendamento_id: agendamentoSelecionado.id,
              servico_id: pacoteSelecionado.servico_id,
              quantidade_usada: 1,
            },
          ]);

        if (erroUso) {
          throw new Error(
            `Saldo baixado, mas houve erro ao registrar uso do pacote: ${erroUso.message}`,
          );
        }
      }

      const valorFinal = usarPacote ? 0 : Number(valorPagamento || 0);
      const formaFinal = usarPacote ? "pacote" : formaPagamento;
      const statusFinal = usarPacote ? "pago" : statusPagamento;
      const agora = new Date().toISOString();

      let comissaoPercentual = 0;

      if (!usarPacote && agendamentoSelecionado.profissional_id && agendamentoSelecionado.servico_id) {
        const { data: vinculoComissao, error: erroComissao } = await supabase
          .from("profissional_servicos")
          .select("comissao_percentual")
          .eq("profissional_id", agendamentoSelecionado.profissional_id)
          .eq("servico_id", agendamentoSelecionado.servico_id)
          .maybeSingle();

        if (erroComissao) {
          console.warn("Não foi possível buscar comissão do profissional:", erroComissao.message);
        }

        comissaoPercentual = Number(vinculoComissao?.comissao_percentual || 0);
      }

      const comissaoValor = Number(((valorFinal * comissaoPercentual) / 100).toFixed(2));
      const valorLiquido = Number((valorFinal - comissaoValor).toFixed(2));

      const payloadFinanceiro = {
        empresa_id: empresaId,
        tipo: "entrada",
        descricao:
          usarPacote && pacoteSelecionado
            ? `Atendimento via pacote: ${pacoteSelecionado.pacote_nome} - ${agendamentoSelecionado.servico || "Serviço"}`
            : `Atendimento: ${agendamentoSelecionado.servico || "Serviço"}`,
        valor: valorFinal,
        valor_bruto: valorFinal,
        comissao_percentual: comissaoPercentual,
        comissao_valor: comissaoValor,
        valor_liquido: valorLiquido,
        data_lancamento: selectedDate,
        status: statusFinal,
        cliente: agendamentoSelecionado.cliente || "",
        profissional: agendamentoSelecionado.profissional || "",
        servico: agendamentoSelecionado.servico || "",
        profissional_id: agendamentoSelecionado.profissional_id || null,
        servico_id: agendamentoSelecionado.servico_id || null,
        agendamento_id: agendamentoSelecionado.id,
        forma_pagamento: formaFinal,
        data_pagamento: statusFinal === "pago" ? agora : null,
        observacoes:
          usarPacote && pacoteSelecionado
            ? `Baixado 1 uso do pacote ${pacoteSelecionado.pacote_nome}. Saldo anterior: ${pacoteSelecionado.restante}/${pacoteSelecionado.quantidade_total}.`
            : comissaoPercentual > 0
              ? `Comissão do profissional: ${comissaoPercentual}% (${comissaoValor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}).`
              : null,
      };

      const { data: existente, error: erroBusca } = await supabase
        .from("financeiro")
        .select("id")
        .eq("agendamento_id", agendamentoSelecionado.id)
        .maybeSingle();

      if (erroBusca) {
        throw new Error(`Erro ao verificar financeiro: ${erroBusca.message}`);
      }

      const respostaFinanceiro = existente?.id
        ? await supabase
            .from("financeiro")
            .update(payloadFinanceiro)
            .eq("id", existente.id)
        : await supabase.from("financeiro").insert([payloadFinanceiro]);

      if (respostaFinanceiro.error) {
        throw new Error(
          `Erro ao salvar no financeiro: ${respostaFinanceiro.error.message}`,
        );
      }

      const { error: erroPagamento } = await supabase
        .from("pagamentos")
        .insert([
          {
            empresa_id: empresaId,
            agendamento_id: agendamentoSelecionado.id,
            profissional_id: agendamentoSelecionado.profissional_id || null,
            servico_id: agendamentoSelecionado.servico_id || null,
            valor: valorFinal,
            valor_bruto: valorFinal,
            comissao_percentual: comissaoPercentual,
            comissao_valor: comissaoValor,
            valor_liquido: valorLiquido,
            forma_pagamento: formaFinal,
            status: statusFinal,
            data_pagamento: statusFinal === "pago" ? agora : null,
            observacao:
              usarPacote && pacoteSelecionado
                ? `Pagamento via pacote ${pacoteSelecionado.pacote_nome}`
                : comissaoPercentual > 0
                  ? `Comissão do profissional: ${comissaoPercentual}%`
                  : null,
          },
        ]);

      if (erroPagamento) {
        throw new Error(
          `Financeiro salvo, mas houve erro ao registrar pagamento: ${erroPagamento.message}`,
        );
      }

      const { error: erroAgendamento } = await supabase
        .from("agendamentos")
        .update({
          status: "finalizado",
          status_atendimento: "finalizado",
          finalizado_em: agora,
          forma_pagamento: formaFinal,
          valor_pago: valorFinal,
          status_pagamento: statusFinal,
          no_show: false,
        })
        .eq("id", agendamentoSelecionado.id);

      if (erroAgendamento) {
        throw new Error(
          `Financeiro salvo, mas houve erro ao finalizar: ${erroAgendamento.message}`,
        );
      }

      if (empresaId && agendamentoSelecionado.servico_id) {
        const { data: servicoRetorno, error: erroServicoRetorno } =
          await supabase
            .from("servicos")
            .select(
              "id,nome,retorno_automatico,retorno_dias,retorno_alerta_dias,retorno_tipo",
            )
            .eq("id", agendamentoSelecionado.servico_id)
            .eq("empresa_id", empresaId)
            .maybeSingle();

        if (erroServicoRetorno) {
          console.warn(
            "Não foi possível verificar retorno automático:",
            erroServicoRetorno.message,
          );
        }

        if (
          servicoRetorno?.retorno_automatico &&
          servicoRetorno?.retorno_dias
        ) {
          const base = new Date();
          const dataRetorno = new Date(base);
          dataRetorno.setDate(
            base.getDate() + Number(servicoRetorno.retorno_dias || 0),
          );

          const dataAlerta = new Date(dataRetorno);
          dataAlerta.setDate(
            dataRetorno.getDate() -
              Number(servicoRetorno.retorno_alerta_dias || 0),
          );

          const retornoPayload = {
            empresa_id: empresaId,
            cliente_id: agendamentoSelecionado.cliente_id || null,
            agendamento_id: agendamentoSelecionado.id,
            procedimento:
              servicoRetorno.nome ||
              agendamentoSelecionado.servico ||
              "Procedimento",
            data_retorno: dataRetorno.toISOString().slice(0, 10),
            data_alerta: dataAlerta.toISOString().slice(0, 10),
            observacao: servicoRetorno.retorno_tipo || null,
            status: "pendente",
          };

          const { error: erroRetorno } = await supabase
            .from("retornos")
            .insert([retornoPayload]);

          if (erroRetorno) {
            console.warn(
              "Atendimento finalizado, mas não foi possível criar retorno automático:",
              erroRetorno.message,
            );
          }
        }
      }

      alert(
        "Atendimento finalizado com sucesso! O WhatsApp de agradecimento será aberto agora.",
      );

      await enviarAgradecimentoWhatsapp(agendamentoSelecionado);

      setModalFinalizarAberto(false);
      setAgendamentoSelecionado(null);
      setPacotesDisponiveis([]);
      setSaldoPacoteSelecionadoId("");
      setUsarPacote(false);
      setValorPagamento("");
      setFormaPagamento("pix");
      setStatusPagamento("pago");
      await carregarTudo();
    } catch (error: any) {
      console.error(error);
      alert(error?.message || "Erro ao finalizar atendimento.");
    } finally {
      setLoadingFinalizar(false);
    }
  }

  const agendamentosDoDia = useMemo(() => {
    return agendamentos
      .filter((item) => item.data === selectedDate)
      .filter((item) => item.status !== "cancelado")
      .filter((item) =>
        statusFilter === "todos" ? true : (item.status || "") === statusFilter,
      )
      .filter((item) =>
        profissionalFilter === "todos"
          ? true
          : (item.profissional_id || item.profissional || "") ===
              profissionalFilter ||
            (item.profissional || "") === profissionalFilter,
      )
      .filter((item) => {
        const term = search.trim().toLowerCase();
        if (!term) return true;
        return [item.cliente, item.servico, item.profissional]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));
      })
      .sort(
        (a, b) => parseTimeToMinutes(a.horario) - parseTimeToMinutes(b.horario),
      );
  }, [agendamentos, selectedDate, statusFilter, profissionalFilter, search]);

  const totaisDia = useMemo(() => {
    return {
      total: agendamentosDoDia.length,
      confirmados: agendamentosDoDia.filter(
        (item) => item.status === "confirmado",
      ).length,
      finalizados: agendamentosDoDia.filter(
        (item) => item.status === "finalizado",
      ).length,
      cancelados: agendamentosDoDia.filter(
        (item) => item.status === "cancelado",
      ).length,
    };
  }, [agendamentosDoDia]);

  function moveDate(days: number) {
    const current = new Date(`${selectedDate}T00:00:00`);
    current.setDate(current.getDate() + days);
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, "0");
    const day = String(current.getDate()).padStart(2, "0");
    const next = `${year}-${month}-${day}`;
    setSelectedDate(next);
    setData(next);
  }

  const currentMinutes = (() => {
    if (selectedDate !== getTodayString()) return null;
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  })();

  const topNowLine =
    currentMinutes !== null ? ((currentMinutes - 8 * 60) / 60) * 88 : null;

  if (carregandoEmpresa) {
    return <div className="p-6">Carregando empresa...</div>;
  }

  if (!empresaId) {
    return <div className="p-6">Empresa não encontrada.</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Agenda inteligente"
        title="Agenda"
        description="Visual diário com filtros, horários e cards de atendimento no estilo clínica/salão."
        action={
          <PrimaryButton
            onClick={() => {
              setData(selectedDate);
              setModalNovoAberto(true);
            }}
          >
            + Agendar
          </PrimaryButton>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <MiniCalendar
            selectedDate={selectedDate}
            onSelect={(date) => {
              setSelectedDate(date);
              setData(date);
            }}
          />

          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-amber-900">
                  🎉 Aniversariantes do mês
                </p>
                <p className="mt-1 text-xs text-amber-700">
                  Envie promoções e felicitações pelo WhatsApp.
                </p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-amber-700">
                {aniversariantes.length}
              </span>
            </div>

            {aniversariantes.length === 0 ? (
              <p className="mt-4 text-sm text-amber-700">
                Nenhum aniversariante este mês.
              </p>
            ) : (
              <div className="mt-4 space-y-2">
                {aniversariantes.map((cliente) => (
                  <div
                    key={cliente.id}
                    className="rounded-2xl border border-amber-200 bg-white p-3"
                  >
                    <p className="font-bold text-slate-900">{cliente.nome}</p>
                    <p className="text-xs text-slate-500">
                      {formatarDataNascimento(cliente.data_nascimento)} ·{" "}
                      {cliente.telefone || "sem telefone"}
                    </p>
                    <button
                      type="button"
                      onClick={() => abrirWhatsAppAniversario(cliente)}
                      className="mt-3 w-full rounded-xl bg-green-600 px-3 py-2 text-xs font-bold text-white hover:bg-green-700"
                    >
                      Enviar promoção
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-slate-800">Busca rápida</p>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar cliente, serviço ou profissional"
              className="mt-3 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-orange-300"
            />
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-slate-800">Profissional</p>
            <select
              value={profissionalFilter}
              onChange={(e) => setProfissionalFilter(e.target.value)}
              className="mt-3 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-orange-300"
            >
              <option value="todos">Todos</option>
              {profissionais.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nome}
                </option>
              ))}
              {profissionais.map((item) => (
                <option key={`${item.id}-nome`} value={item.nome}>
                  {item.nome} (nome)
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-slate-800">Status</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((item) => {
                const active = statusFilter === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setStatusFilter(item.value)}
                    className="rounded-full px-3 py-2 text-xs font-semibold transition"
                    style={{
                      backgroundColor: active
                        ? "var(--color-primary)"
                        : "#f8fafc",
                      color: active ? "#fff" : "#334155",
                      border: active
                        ? "none"
                        : "1px solid rgba(148, 163, 184, 0.24)",
                    }}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-slate-800">
              Resumo do dia
            </p>
            <div className="mt-4 grid gap-3">
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs text-slate-500">Total</p>
                <p className="text-2xl font-bold text-slate-900">
                  {totaisDia.total}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl bg-blue-50 px-3 py-3 text-center">
                  <p className="text-xs text-blue-600">Confirmados</p>
                  <p className="text-lg font-bold text-blue-700">
                    {totaisDia.confirmados}
                  </p>
                </div>
                <div className="rounded-2xl bg-emerald-50 px-3 py-3 text-center">
                  <p className="text-xs text-emerald-600">Finalizados</p>
                  <p className="text-lg font-bold text-emerald-700">
                    {totaisDia.finalizados}
                  </p>
                </div>
                <div className="rounded-2xl bg-rose-50 px-3 py-3 text-center">
                  <p className="text-xs text-rose-600">Cancelados</p>
                  <p className="text-lg font-bold text-rose-700">
                    {totaisDia.cancelados}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => moveDate(-1)}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-lg text-slate-700"
              >
                ←
              </button>

              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {formatDisplayDate(selectedDate)}
                </p>
                <p className="text-xs text-slate-500">Visão diária da agenda</p>
              </div>

              <button
                type="button"
                onClick={() => moveDate(1)}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-lg text-slate-700"
              >
                →
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <SecondaryButton
                onClick={() => {
                  const today = getTodayString();
                  setSelectedDate(today);
                  setData(today);
                }}
              >
                Hoje
              </SecondaryButton>

              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setData(e.target.value);
                }}
                className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-[72px_minmax(0,1fr)]">
            <div className="border-r border-slate-200 bg-slate-50">
              <div className="h-14 border-b border-slate-200" />
              {HORARIOS.map((horario) => (
                <div
                  key={horario}
                  className="flex h-[88px] items-start justify-center border-b border-slate-100 pt-2 text-xs font-medium text-slate-500"
                >
                  {horario}
                </div>
              ))}
            </div>

            <div className="relative">
              <div className="flex h-14 items-center border-b border-slate-200 px-5">
                <p className="text-sm font-semibold text-slate-700">
                  {agendamentosDoDia.length} agendamento(s) neste dia
                </p>
              </div>

              <div className="relative">
                {HORARIOS.map((horario) => (
                  <div
                    key={horario}
                    className="h-[88px] border-b border-slate-100"
                  />
                ))}

                {typeof topNowLine === "number" &&
                  topNowLine >= 0 &&
                  topNowLine <= HORARIOS.length * 88 && (
                    <div
                      className="pointer-events-none absolute left-0 right-0 z-10"
                      style={{ top: `${topNowLine}px` }}
                    >
                      <div className="flex items-center">
                        <span className="ml-2 h-3 w-3 rounded-full bg-rose-500" />
                        <div className="h-[2px] flex-1 bg-rose-500" />
                      </div>
                    </div>
                  )}

                {agendamentosDoDia.map((item) => {
                  const mins = parseTimeToMinutes(item.horario);
                  const top = ((mins - 8 * 60) / 60) * 88 + 8;
                  const visual = classByStatus(item.status);
                  const duracao = Number(item.duracao_minutos || 30);
                  const alturaCard = Math.max((duracao / 30) * 88 - 10, 78);
                  const horarioFim = somarMinutos(item.horario, duracao);

                  if (mins < 8 * 60 || mins > 20 * 60 + 59) return null;

                  return (
                    <div
                      key={item.id}
                      className="absolute left-3 right-3 rounded-2xl border px-4 py-3 shadow-sm"
                      style={{
                        top: `${top}px`,
                        minHeight: `${alturaCard}px`,
                        backgroundColor: visual.bg,
                        borderColor: visual.border,
                        color: visual.text,
                      }}
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold">
                              {item.cliente || "Sem cliente"}
                            </p>
                            <span className="rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide">
                              {item.status || "agendado"}
                            </span>
                          </div>
                          <p className="mt-1 text-sm font-medium">
                            {item.servico || "Serviço"}
                          </p>
                          <p className="text-xs opacity-80">
                            {item.horario} às {horarioFim} ·{" "}
                            {item.profissional || "Sem profissional"}
                          </p>
                          {item.observacoes && (
                            <p className="mt-2 text-xs opacity-80">
                              {item.observacoes}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2 lg:justify-end">
                          {item.status !== "finalizado" &&
                            item.status !== "cancelado" && (
                              <>
                                {item.status !== "confirmado" && (
                                  <SecondaryButton
                                    onClick={() =>
                                      void confirmarAgendamento(item)
                                    }
                                  >
                                    Confirmar
                                  </SecondaryButton>
                                )}

                                <SecondaryButton
                                  onClick={() => abrirModalReagendar(item)}
                                >
                                  Reagendar
                                </SecondaryButton>

                                <SecondaryButton
                                  onClick={() =>
                                    void cancelarAgendamento(item)
                                  }
                                >
                                  Cancelar
                                </SecondaryButton>

                                <PrimaryButton
                                  onClick={() => void abrirModalFinalizar(item)}
                                >
                                  Finalizar
                                </PrimaryButton>
                              </>
                            )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </div>

      {modalNovoAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-auto rounded-[28px] bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-orange-600">
                  Novo atendimento
                </p>
                <h2 className="text-2xl font-bold text-slate-900">
                  Agendar cliente
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Preencha os dados abaixo para inserir um novo horário na
                  agenda.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setModalNovoAberto(false)}
                className="rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-600"
              >
                Fechar
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <select
                value={cliente}
                onChange={(e) => {
                  setCliente(e.target.value);
                  void carregarAlertas(e.target.value);
                }}
                className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-orange-300"
              >
                <option value="">Selecione o cliente</option>
                {clientes.map((item) => (
                  <option key={item.id} value={item.nome}>
                    {item.nome}
                  </option>
                ))}
              </select>

              <select
                value={servico}
                onChange={(e) => setServico(e.target.value)}
                className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-orange-300"
              >
                <option value="">Selecione o serviço</option>
                {servicos.map((item) => (
                  <option key={item.id} value={item.nome}>
                    {item.nome}
                  </option>
                ))}
              </select>

              <select
                value={profissional}
                onChange={(e) => setProfissional(e.target.value)}
                className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-orange-300"
              >
                <option value="">Selecione o profissional</option>
                {profissionais.map((item) => (
                  <option key={item.id} value={item.nome}>
                    {item.nome}
                  </option>
                ))}
              </select>

              <input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-orange-300"
              />

              <select
                value={hora}
                onChange={(e) => setHora(e.target.value)}
                className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-orange-300"
              >
                <option value="">Selecione o horário</option>
                {HORARIOS.map((horarioOpcao) => (
                  <option key={horarioOpcao} value={horarioOpcao}>
                    {horarioOpcao}
                  </option>
                ))}
              </select>

              <input
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Observações do atendimento"
                className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-orange-300"
              />

              <div className="md:col-span-2">
                <AlertaAnamneseAgenda
                  alertas={alertas}
                  loading={loadingAlerta}
                />
              </div>

              {alertas.length > 0 && (
                <div className="md:col-span-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={confirmou}
                      onChange={(e) => setConfirmou(e.target.checked)}
                    />
                    Confirmo que li os alertas da anamnese antes de prosseguir.
                  </label>
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <PrimaryButton onClick={() => void salvarAgendamento()}>
                {loadingSalvar ? "Salvando..." : "Salvar agendamento"}
              </PrimaryButton>
              <SecondaryButton onClick={limparFormulario}>
                Limpar
              </SecondaryButton>
            </div>
          </div>
        </div>
      )}

      {modalReagendarAberto && agendamentoReagendar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-lg rounded-[28px] bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-orange-600">
                  Reagendamento
                </p>
                <h2 className="text-2xl font-bold text-slate-900">
                  Reagendar atendimento
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Escolha uma nova data e horário para este agendamento.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setModalReagendarAberto(false);
                  setAgendamentoReagendar(null);
                }}
                className="rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-600"
              >
                Fechar
              </button>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700 space-y-1">
              <p>
                <strong>Cliente:</strong> {agendamentoReagendar.cliente}
              </p>
              <p>
                <strong>Serviço:</strong> {agendamentoReagendar.servico}
              </p>
              <p>
                <strong>Profissional:</strong>{" "}
                {agendamentoReagendar.profissional || "Não informado"}
              </p>
              <p>
                <strong>Atual:</strong> {agendamentoReagendar.data} às{" "}
                {agendamentoReagendar.horario}
              </p>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-bold text-slate-700">
                  Nova data
                </label>
                <input
                  type="date"
                  value={dataReagendamento}
                  min={getTodayString()}
                  onChange={(e) => setDataReagendamento(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-orange-300"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700">
                  Novo horário
                </label>
                <select
                  value={horaReagendamento}
                  onChange={(e) => setHoraReagendamento(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-orange-300"
                >
                  <option value="">Selecione</option>
                  {HORARIOS.map((horarioOpcao) => (
                    <option key={horarioOpcao} value={horarioOpcao}>
                      {horarioOpcao}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <SecondaryButton
                onClick={() => {
                  setModalReagendarAberto(false);
                  setAgendamentoReagendar(null);
                }}
              >
                Cancelar
              </SecondaryButton>
              <PrimaryButton onClick={() => void salvarReagendamento()}>
                {loadingReagendar ? "Salvando..." : "Salvar reagendamento"}
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}

      {modalFinalizarAberto && agendamentoSelecionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-xl rounded-[28px] bg-white p-6 shadow-2xl">
            <div className="mb-5">
              <h2 className="text-2xl font-bold text-slate-900">
                Finalizar atendimento
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Confirme os dados antes de concluir e lançar no financeiro.
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700 space-y-1">
              <p>
                <strong>Cliente:</strong> {agendamentoSelecionado.cliente}
              </p>
              <p>
                <strong>Serviço:</strong> {agendamentoSelecionado.servico}
              </p>
              <p>
                <strong>Profissional:</strong>{" "}
                {agendamentoSelecionado.profissional || "Não informado"}
              </p>
              <p>
                <strong>Data:</strong> {agendamentoSelecionado.data} às{" "}
                {agendamentoSelecionado.horario}
              </p>
            </div>

            {pacotesDisponiveis.length > 0 && (
              <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm font-bold text-emerald-900">
                  Cliente possui pacote disponível para este serviço
                </p>

                <div className="mt-3 grid gap-3">
                  <select
                    value={saldoPacoteSelecionadoId}
                    onChange={(e) =>
                      setSaldoPacoteSelecionadoId(e.target.value)
                    }
                    className="w-full rounded-2xl border border-emerald-200 bg-white px-4 py-3 outline-none"
                  >
                    {pacotesDisponiveis.map((pacote) => (
                      <option key={pacote.saldo_id} value={pacote.saldo_id}>
                        {pacote.pacote_nome} — saldo {pacote.restante}/
                        {pacote.quantidade_total}
                        {pacote.data_fim
                          ? ` — válido até ${pacote.data_fim}`
                          : ""}
                      </option>
                    ))}
                  </select>

                  <label className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
                    <input
                      type="checkbox"
                      checked={usarPacote}
                      onChange={(e) => {
                        const marcado = e.target.checked;
                        setUsarPacote(marcado);
                        if (marcado) {
                          setValorPagamento("0");
                          setFormaPagamento("pacote");
                          setStatusPagamento("pago");
                        } else {
                          setValorPagamento(
                            valorPadraoDoAgendamento(agendamentoSelecionado),
                          );
                          setFormaPagamento("pix");
                          setStatusPagamento("pago");
                        }
                      }}
                    />
                    Usar pacote do cliente e baixar 1 unidade do saldo
                  </label>
                </div>
              </div>
            )}

            {pacotesDisponiveis.length === 0 && (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                Nenhum pacote ativo com saldo disponível para este serviço.
              </div>
            )}

            <div className="mt-5 grid gap-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Valor
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={valorPagamento}
                  onChange={(e) => setValorPagamento(e.target.value)}
                  disabled={usarPacote}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-orange-300 disabled:bg-slate-100"
                  placeholder="0,00"
                />
                {usarPacote && (
                  <p className="mt-1 text-xs font-semibold text-emerald-700">
                    Valor zerado porque o atendimento será baixado do pacote.
                  </p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Forma de pagamento
                </label>
                <select
                  value={formaPagamento}
                  onChange={(e) => setFormaPagamento(e.target.value)}
                  disabled={usarPacote}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-orange-300 disabled:bg-slate-100"
                >
                  <option value="pix">Pix</option>
                  <option value="dinheiro">Dinheiro</option>
                  <option value="cartao_credito">Cartão de crédito</option>
                  <option value="cartao_debito">Cartão de débito</option>
                  <option value="pacote">Pacote</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Status do pagamento
                </label>
                <select
                  value={statusPagamento}
                  onChange={(e) => setStatusPagamento(e.target.value)}
                  disabled={usarPacote}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-orange-300 disabled:bg-slate-100"
                >
                  <option value="pago">Pago</option>
                  <option value="pendente">Pendente</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <SecondaryButton onClick={() => setModalFinalizarAberto(false)}>
                Cancelar
              </SecondaryButton>
              <PrimaryButton onClick={() => void finalizarComPagamento()}>
                {loadingFinalizar ? "Salvando..." : "Confirmar finalização"}
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
