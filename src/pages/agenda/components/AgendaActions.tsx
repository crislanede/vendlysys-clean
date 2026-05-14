type Props = {
  item: any;
  onFotos: () => void;
  onConfirmar: () => void;
  onReagendar: () => void;
  onCancelar: () => void;
  onFinalizar: () => void;
};

export default function AgendaActions({
  item,
  onFotos,
  onConfirmar,
  onReagendar,
  onCancelar,
  onFinalizar,
}: Props) {
  return (
    <div className="flex flex-wrap gap-2 lg:justify-end">
      <button
        onClick={onFotos}
        className="rounded-xl border px-3 py-2 text-xs"
      >
        Ver fotos
      </button>

      {item.status !== "finalizado" &&
        item.status !== "cancelado" && (
          <>
            {item.status !== "confirmado" && (
              <button
                onClick={onConfirmar}
                className="rounded-xl border px-3 py-2 text-xs"
              >
                Confirmar
              </button>
            )}

            <button
              onClick={onReagendar}
              className="rounded-xl border px-3 py-2 text-xs"
            >
              Reagendar
            </button>

            <button
              onClick={onCancelar}
              className="rounded-xl border px-3 py-2 text-xs"
            >
              Cancelar
            </button>

            <button
              onClick={onFinalizar}
              className="rounded-xl bg-orange-500 px-3 py-2 text-xs text-white"
            >
              Finalizar
            </button>
          </>
        )}
    </div>
  );
}