type StatusBadgeProps = {
  status?: string | null;
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const normalizado = (status || "").toLowerCase();

  let classes = "bg-slate-100 text-slate-700";
  let label = status || "-";

  if (normalizado === "ativo" || normalizado === "confirmado" || normalizado === "finalizado" || normalizado === "pago") {
    classes = "bg-emerald-100 text-emerald-700";
  }

  if (normalizado === "cancelado" || normalizado === "inativo") {
    classes = "bg-red-100 text-red-700";
  }

  if (normalizado === "agendado" || normalizado === "pendente") {
    classes = "bg-orange-100 text-orange-700";
  }

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-extrabold ${classes}`}>
      {label}
    </span>
  );
}
