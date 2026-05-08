export function limparTelefone(valor?: string | null) {
  return String(valor || "").replace(/\D/g, "");
}

export function formatarData(data?: string | null) {
  if (!data) return "-";
  return new Date(`${data}T00:00:00`).toLocaleDateString("pt-BR");
}

export function formatarMoeda(valor?: number | string | null) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function primeiroNome(nome?: string | null) {
  return String(nome || "").trim().split(" ")[0] || "";
}

export function hojeISO() {
  const hoje = new Date();
  return hoje.toISOString().slice(0, 10);
}

export function somarMinutos(horario: string, minutos: number) {
  const [hora, minuto] = String(horario || "00:00").split(":").map(Number);

  const data = new Date();
  data.setHours(hora || 0, (minuto || 0) + Number(minutos || 0), 0, 0);

  return `${String(data.getHours()).padStart(2, "0")}:${String(
    data.getMinutes()
  ).padStart(2, "0")}`;
}

export function normalizarHorario(
  horario?: string | null,
  fallback = ""
) {
  const valor = horario || fallback;
  if (!valor) return "";

  const partes = String(valor).split(":");
  const hora = String(partes[0] || "00").padStart(2, "0");
  const minuto = String(partes[1] || "00").padStart(2, "0");

  return `${hora}:${minuto}`;
}

export function obterIntervaloAgenda(profissional: any) {
  return {
    inicio: normalizarHorario(profissional?.inicio_expediente, "08:00"),
    fim: normalizarHorario(profissional?.fim_expediente, "18:00"),
  };
}

/**
 * FUNÇÃO FLEXÍVEL (resolve seu erro atual)
 */
export function horarioSobrepoeIntervalo(...args: any[]): boolean {
  // Caso 1 (seu meu-espaco.tsx usa)
  if (args.length >= 5) {
    const inicioA = String(args[0] || "00:00");
    const duracaoA = Number(args[1] || 0);
    const intervaloAgenda = args[2] as { inicio?: string; fim?: string };
    const inicioAlmoco = args[3] ? String(args[3]) : "";
    const fimAlmoco = args[4] ? String(args[4]) : "";

    const fimA = somarMinutos(inicioA, duracaoA);

    // Fora do expediente
    if (intervaloAgenda?.inicio && intervaloAgenda?.fim) {
      if (inicioA < intervaloAgenda.inicio || fimA > intervaloAgenda.fim) {
        return true;
      }
    }

    // Sobreposição com almoço
    if (inicioAlmoco && fimAlmoco) {
      if (inicioA < fimAlmoco && fimA > inicioAlmoco) {
        return true;
      }
    }

    return false;
  }

  // Caso 2 (genérico)
  const [inicioA, fimA, inicioB, fimB] = args.map((item) =>
    String(item || "")
  );

  if (inicioA && fimA && inicioB && fimB) {
    return inicioA < fimB && fimA > inicioB;
  }

  return false;
}

export function gerarHorariosBase(
  inicio = "08:00",
  fim = "18:00",
  intervaloMinutos = 30
) {
  const horarios: string[] = [];

  let atual = normalizarHorario(inicio, "08:00");
  const fimNormalizado = normalizarHorario(fim, "18:00");

  while (atual <= fimNormalizado) {
    horarios.push(atual);
    atual = somarMinutos(atual, intervaloMinutos);
  }

  return horarios;
}