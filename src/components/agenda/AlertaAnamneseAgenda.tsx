import type { AlertaAnamneseItem } from "../../lib/anamneseAlerta";

type Props = {
  loading?: boolean;
  alertas: AlertaAnamneseItem[];
};

function tituloAlerta(item: any) {
  return (
    item.label ||
    item.pergunta ||
    item.campo ||
    item.nome_campo ||
    item.titulo ||
    "Informação da anamnese"
  );
}

function respostaAlerta(item: any) {
  return (
    item.resposta ||
    item.valor ||
    item.descricao ||
    item.observacao ||
    "-"
  );
}

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
        {alertas.map((item: any, index) => {
          const titulo = tituloAlerta(item);
          const resposta = respostaAlerta(item);

          return (
            <div
              key={`${titulo}-${index}`}
              className="rounded-xl bg-white p-3 text-sm text-slate-700 ring-1 ring-red-100"
            >
              <p className="font-bold text-slate-900">
                {titulo}
              </p>

              <p className="mt-1 text-red-700">
                {resposta}
              </p>

              {item.preenchido_em ? (
                <p className="mt-1 text-xs text-slate-500">
                  Última ficha:{" "}
                  {new Date(item.preenchido_em).toLocaleString("pt-BR")}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}