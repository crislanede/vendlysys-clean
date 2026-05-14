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

export function textoStatus(status?: string | null) {
  switch ((status || "").toLowerCase()) {
    case "finalizado":
      return "Finalizado";
    case "cancelado":
      return "Cancelado";
    case "confirmado":
      return "Confirmado";
    default:
      return "Agendado";
  }
}
