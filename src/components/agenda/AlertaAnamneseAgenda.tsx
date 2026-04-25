import type { AlertaAnamneseItem } from "../../lib/anamneseAlerta";

type Props = {
  loading?: boolean;
  alertas: AlertaAnamneseItem[];
};

export default function AlertaAnamneseAgenda({
  loading = false,
  alertas,
}: Props) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
        Carregando alertas da anamnese...
      </div>
    );
  }

  if (!alertas.length) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
      <p className="font-semibold text-red-700">
        Atenção: a cliente possui informações importantes na anamnese
      </p>

      <div className="mt-3 space-y-2">
        {alertas.map((item, index) => (
          <div
            key={`${item.label}-${index}`}
            className="rounded-xl bg-white p-3 text-sm text-slate-700 ring-1 ring-red-100"
          >
            <p className="font-medium text-slate-900">{item.label}</p>
            <p className="mt-1">{item.resposta}</p>

            {item.preenchido_em ? (
              <p className="mt-1 text-xs text-slate-500">
                Última ficha:{" "}
                {new Date(item.preenchido_em).toLocaleString("pt-BR")}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}