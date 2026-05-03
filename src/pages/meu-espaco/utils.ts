import type { ProfissionalCliente } from "./types";

export function limparTelefone(valor: string) {
  return valor.replace(/\D/g, "");
}

export function formatarData(data?: string | null) {
  if (!data) return "-";
  return new Date(`${data}T00:00:00`).toLocaleDateString("pt-BR");
}

export function formatarMoeda(valor?: number | null) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function primeiroNome(nome?: string | null) {
  return String(nome || "").trim().split(/\s+/)[0] || "cliente";
}

export function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

export function somarMinutos(horario: string, minutos: number) {
  const [h, m] = horario.split(":").map(Number);
  const data = new Date(2000, 0, 1, h || 0, m || 0);
  data.setMinutes(data.getMinutes() + minutos);
  return data.toTimeString().slice(0, 5);
}

export function normalizarHorario(valor?: string | null, fallback = "") {
  if (!valor) return fallback;
  return String(valor).slice(0, 5);
}

export function obterIntervaloAgenda(profissional: ProfissionalCliente | null) {
  const intervalo = Number(
    profissional?.intervalo_minutos || profissional?.intervalo || 30
  );

  return !Number.isNaN(intervalo) && intervalo > 0 ? intervalo : 30;
}

export function horarioSobrepoeIntervalo(
  inicioServico: string,
  duracaoMinutos: number,
  inicioBloqueio?: string | null,
  fimBloqueio?: string | null
) {
  const inicio = normalizarHorario(inicioBloqueio);
  const fim = normalizarHorario(fimBloqueio);

  if (!inicio || !fim) return false;

  const fimServico = somarMinutos(inicioServico, duracaoMinutos);

  return inicioServico < fim && fimServico > inicio;
}

export function gerarHorariosBase(inicio = "08:00", fim = "18:00", intervalo = 30) {
  const horarios: string[] = [];
  let atual = inicio;

  while (atual <= fim) {
    horarios.push(atual);
    atual = somarMinutos(atual, intervalo);
  }

  return horarios;
}