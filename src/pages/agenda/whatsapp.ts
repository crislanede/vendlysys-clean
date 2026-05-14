export function somarMinutos(
  horario: string,
  minutos: number,
) {
  const [hora, minuto] = horario
    .split(":")
    .map(Number);

  const data = new Date();

  data.setHours(hora);
  data.setMinutes(minuto + minutos);

  const horaFinal = String(
    data.getHours(),
  ).padStart(2, "0");

  const minutoFinal = String(
    data.getMinutes(),
  ).padStart(2, "0");

  return `${horaFinal}:${minutoFinal}`;
}