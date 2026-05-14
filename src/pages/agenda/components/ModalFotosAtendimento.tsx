import type { FotoAtendimento } from "../types";

type Props = {
  aberto: boolean;
  fotos: FotoAtendimento[];

  onFechar: () => void;

  onExcluir: (foto: FotoAtendimento) => void;
};

export default function ModalFotosAtendimento({
  aberto,
  fotos,
  onFechar,
  onExcluir,
}: Props) {
  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-auto rounded-[32px] bg-white p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-orange-600">
              Atendimento
            </p>

            <h2 className="text-3xl font-black text-slate-900">
              Fotos do atendimento
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Antes, depois e registros gerais
            </p>
          </div>

          <button
            type="button"
            onClick={onFechar}
            className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700"
          >
            Fechar
          </button>
        </div>

        {fotos.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 p-10 text-center">
            <p className="text-sm font-bold text-slate-500">
              Nenhuma foto encontrada
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {fotos.map((foto) => (
              <div
                key={foto.id}
                className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="aspect-square bg-slate-100">
                  <img
                    src={
                      foto.signedUrl ||
                      foto.url_foto ||
                      ""
                    }
                    alt="Foto atendimento"
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="space-y-3 p-4">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-black uppercase text-orange-700">
                      {foto.tipo || "geral"}
                    </span>

                    {foto.created_at && (
                      <span className="text-xs font-medium text-slate-500">
                        {new Date(
                          foto.created_at,
                        ).toLocaleDateString("pt-BR")}
                      </span>
                    )}
                  </div>

                  {foto.descricao && (
                    <p className="text-sm text-slate-600">
                      {foto.descricao}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={() => onExcluir(foto)}
                    className="w-full rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-700 transition hover:bg-red-100"
                  >
                    Excluir foto
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}