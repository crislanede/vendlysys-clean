import type { AlertaAnamneseItem } from "../../lib/anamneseAlerta";
import type { Cliente, FotoAtendimento } from "./types";

const weekdayFormatter = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
});

const headerDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function hojeISO() {
  return new Date().toISOString().split("T")[0];
}

export function usuarioEhAdmin() {
  const perfis = [
    localStorage.getItem("tipo_usuario"),
    localStorage.getItem("perfil"),
    localStorage.getItem("role"),
  ]
    .filter(Boolean)
    .map((item) => String(item).trim().toLowerCase());

  return perfis.some((perfil) =>
    ["admin", "administrador", "owner", "super_admin", "admin_saas"].includes(perfil),
  );
}

export function dataPassada(data?: string | null) {
  if (!data) return false;
  return data < hojeISO();
}

export function podeEditarData(data?: string | null) {
  return !dataPassada(data) || usuarioEhAdmin();
}

export function getTodayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseTimeToMinutes(value?: string | null) {
  if (!value || !value.includes(":")) return 0;
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function somarMinutos(horario: string, minutos: number) {
  const [hours, minutes] = horario.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes + minutos, 0, 0);

  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes(),
  ).padStart(2, "0")}`;
}

export function formatDisplayDate(dateValue: string) {
  if (!dateValue) return "";
  const date = new Date(`${dateValue}T00:00:00`);
  const weekday = weekdayFormatter.format(date);
  const fullDate = headerDateFormatter.format(date);
  return `${fullDate} · ${weekday.charAt(0).toUpperCase() + weekday.slice(1)}`;
}

export function classByStatus(status?: string | null) {
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

export function filtrarAniversariantesDoMes(clientes: Cliente[]) {
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

export function formatarData(data?: string | null) {
  if (!data) return "-";
  return new Date(`${data}T00:00:00`).toLocaleDateString("pt-BR");
}

export function formatarDataNascimento(data?: string | null) {
  if (!data) return "-";
  const partes = data.split("-");
  if (partes.length !== 3) return data;
  return `${partes[2]}/${partes[1]}`;
}

export function montarMensagemAniversario(nome: string) {
  return `Olá, ${nome}! 🎉 Passando para te desejar um feliz aniversário! Temos uma condição especial para você este mês. 💝`;
}

export function caminhoDaFoto(foto: FotoAtendimento) {
  return foto.caminho || foto.url_foto || "";
}

const PALAVRAS_ALERTA_CUIDADO = [
  "diabetes",
  "diabete",
  "diabético",
  "diabetico",
  "micose",
  "fungo",
  "fungos",
  "unha encravada",
  "encravada",
  "ferida",
  "inflamação",
  "inflamacao",
  "infecção",
  "infeccao",
];

export function textoDoAlerta(alerta: AlertaAnamneseItem) {
  return Object.values(alerta as any)
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function filtrarAlertasDeCuidado(alertas: AlertaAnamneseItem[]) {
  return alertas.filter((alerta) => {
    const texto = textoDoAlerta(alerta);
    return PALAVRAS_ALERTA_CUIDADO.some((palavra) => texto.includes(palavra));
  });
}

export function rotuloAlertaAgenda(alerta: AlertaAnamneseItem) {
  const item = alerta as any;
  const textoBase =
    item.pergunta ||
    item.campo ||
    item.titulo ||
    item.label ||
    item.nome ||
    textoDoAlerta(alerta);

  return String(textoBase || "Alerta de anamnese")
    .replace(/possui/gi, "")
    .replace(/alguma/gi, "")
    .replace(/algum/gi, "")
    .replace(/\?/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
