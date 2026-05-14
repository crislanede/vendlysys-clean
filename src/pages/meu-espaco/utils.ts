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
  const [hora, minuto] = String(horario || "00:00")
    .split(":")
    .map(Number);

  const data = new Date();
  data.setHours(hora || 0, (minuto || 0) + Number(minutos || 0), 0, 0);

  return `${String(data.getHours()).padStart(2, "0")}:${String(
    data.getMinutes(),
  ).padStart(2, "0")}`;
}

export function normalizarHorario(
  horario?: string | null,
  fallback = "",
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
    inicio: normalizarHorario(
      profissional?.hora_inicio ||
        profissional?.inicio_expediente,
      "08:00",
    ),

    fim: normalizarHorario(
      profissional?.hora_fim ||
        profissional?.fim_expediente,
      "18:00",
    ),
  };
}

export function horarioSobrepoeIntervalo(...args: any[]): boolean {
  // Caso:
  // horarioSobrepoeIntervalo(inicio, duracao, inicioAlmoco, fimAlmoco)
  if (args.length === 4 && typeof args[1] === "number") {
    const inicioA = normalizarHorario(args[0]);
    const duracaoA = Number(args[1] || 0);

    const inicioB = normalizarHorario(args[2]);
    const fimB = normalizarHorario(args[3]);

    if (!inicioA || !inicioB || !fimB) {
      return false;
    }

    const fimA = somarMinutos(inicioA, duracaoA);

    return inicioA < fimB && fimA > inicioB;
  }

  // Caso:
  // horarioSobrepoeIntervalo(inicio, duracao, intervaloAgenda, inicioAlmoco, fimAlmoco)
  if (args.length >= 5) {
    const inicioA = normalizarHorario(args[0]);

    const duracaoA = Number(args[1] || 0);

    const intervaloAgenda = args[2] as {
      inicio?: string;
      fim?: string;
    };

    const inicioAlmoco = normalizarHorario(args[3]);
    const fimAlmoco = normalizarHorario(args[4]);

    const fimA = somarMinutos(inicioA, duracaoA);

    // Fora do expediente
    if (intervaloAgenda?.inicio && intervaloAgenda?.fim) {
      if (
        inicioA < intervaloAgenda.inicio ||
        fimA > intervaloAgenda.fim
      ) {
        return true;
      }
    }

    // Sobreposição almoço
    if (inicioAlmoco && fimAlmoco) {
      return inicioA < fimAlmoco && fimA > inicioAlmoco;
    }

    return false;
  }

  // Caso genérico
  const [inicioA, fimA, inicioB, fimB] = args.map((item) =>
    normalizarHorario(item),
  );

  if (inicioA && fimA && inicioB && fimB) {
    return inicioA < fimB && fimA > inicioB;
  }

  return false;
}

export function gerarHorariosBase(
  inicio = "08:00",
  fim = "18:00",
  intervaloMinutos = 30,
) {
  const horarios: string[] = [];

  let atual = normalizarHorario(inicio, "08:00");

  const fimNormalizado = normalizarHorario(
    fim,
    "18:00",
  );

  while (atual <= fimNormalizado) {
    horarios.push(atual);

    atual = somarMinutos(
      atual,
      intervaloMinutos,
    );
  }

  return horarios;
}
