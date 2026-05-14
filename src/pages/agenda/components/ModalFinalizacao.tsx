import type { Agendamento, PacoteDisponivel } from "../types";
import type { AlertaAnamneseItem } from "../../../lib/anamneseAlerta";

type Props = {
  aberto: boolean;
  agendamento: Agendamento | null;

  loadingAlertasFinalizacao: boolean;
  alertasFinalizacao: AlertaAnamneseItem[];

  cuidadoEspecial: string;
  setCuidadoEspecial: (value: string) => void;

  acrescimoCuidado: string;
  setAcrescimoCuidado: (value: string) => void;

  observacaoCuidado: string;
  setObservacaoCuidado: (value: string) => void;

  pacotesDisponiveis: PacoteDisponivel[];

  saldoPacoteSelecionadoId: string;
  setSaldoPacoteSelecionadoId: (value: string) => void;

  usarPacote: boolean;
  onToggleUsarPacote: (marcado: boolean) => void;

  valorPagamento: string;
  setValorPagamento: (value: string) => void;

  formaPagamento: string;
  setFormaPagamento: (value: string) => void;

  statusPagamento: string;
  setStatusPagamento: (value: string) => void;

  fotoAtendimento: File | null;
  setFotoAtendimento: (file: File | null) => void;

  previewFotoAtendimento: string;
  setPreviewFotoAtendimento: (value: string) => void;

  tipoFotoAtendimento: "geral" | "antes" | "depois";
  setTipoFotoAtendimento: (
    value: "geral" | "antes" | "depois",
  ) => void;

  loadingFinalizar: boolean;

  onFechar: () => void;
  onFinalizar: () => void;
};

export default function ModalFinalizacao({
  aberto,
  agendamento,

  loadingAlertasFinalizacao,
  alertasFinalizacao,

  cuidadoEspecial,
  setCuidadoEspecial,

  acrescimoCuidado,
  setAcrescimoCuidado,

  observacaoCuidado,
  setObservacaoCuidado,

  pacotesDisponiveis,

  saldoPacoteSelecionadoId,
  setSaldoPacoteSelecionadoId,

  usarPacote,
  onToggleUsarPacote,

  valorPagamento,
  setValorPagamento,

  formaPagamento,
  setFormaPagamento,

  statusPagamento,
  setStatusPagamento,

  fotoAtendimento,
  setFotoAtendimento,

  previewFotoAtendimento,
  setPreviewFotoAtendimento,

  tipoFotoAtendimento,
  setTipoFotoAtendimento,

  loadingFinalizar,

  onFechar,
  onFinalizar,
}: Props) {
  if (!aberto || !agendamento) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[95vh] w-full max-w-3xl overflow-auto rounded-[32px] bg-white p-6 shadow-2xl">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-600">
              Finalização
            </p>

            <h2 className="text-3xl font-black text-slate-900">
              Finalizar atendimento
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {agendamento.cliente} • {agendamento.servico}
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

        {loadingAlertasFinalizacao ? (
          <div className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-bold text-orange-700">
            Carregando alertas da anamnese...
          </div>
        ) : alertasFinalizacao.length > 0 ? (
          <div className="mb-5 rounded-3xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-black text-red-700">
              Alertas importantes
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              {alertasFinalizacao.map((alerta, index) => (
                <span
                  key={index}
                  className="rounded-full border border-red-200 bg-white px-3 py-1 text-xs font-black text-red-700"
                >
                  ⚠️ {alerta.label || "Alerta"}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 p-4">
            <p className="text-sm font-black text-slate-900">
              Pagamento
            </p>

            <label className="mt-4 flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={usarPacote}
                onChange={(e) =>
                  onToggleUsarPacote(e.target.checked)
                }
              />

              Usar pacote/combo do cliente
            </label>

            {pacotesDisponiveis.length > 0 && (
              <select
                value={saldoPacoteSelecionadoId}
                onChange={(e) =>
                  setSaldoPacoteSelecionadoId(e.target.value)
                }
                className="mt-3 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none"
              >
                {pacotesDisponiveis.map((pacote) => (
                  <option
                    key={pacote.saldo_id}
                    value={pacote.saldo_id}
                  >
                    {pacote.pacote_nome} • saldo {pacote.restante}
                  </option>
                ))}
              </select>
            )}

            <input
              type="number"
              value={valorPagamento}
              onChange={(e) =>
                setValorPagamento(e.target.value)
              }
              placeholder="Valor pago"
              disabled={usarPacote}
              className="mt-4 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none"
            />

            <select
              value={formaPagamento}
              onChange={(e) =>
                setFormaPagamento(e.target.value)
              }
              disabled={usarPacote}
              className="mt-4 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none"
            >
              <option value="pix">PIX</option>
              <option value="dinheiro">Dinheiro</option>
              <option value="cartao">Cartão</option>
              <option value="boleto">Boleto</option>
              <option value="pacote">Pacote</option>
            </select>

            <select
              value={statusPagamento}
              onChange={(e) =>
                setStatusPagamento(e.target.value)
              }
              className="mt-4 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none"
            >
              <option value="pago">Pago</option>
              <option value="pendente">Pendente</option>
            </select>
          </div>

          <div className="rounded-3xl border border-slate-200 p-4">
            <p className="text-sm font-black text-slate-900">
              Cuidados especiais
            </p>

            <select
              value={cuidadoEspecial}
              onChange={(e) =>
                setCuidadoEspecial(e.target.value)
              }
              className="mt-4 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none"
            >
              <option value="nenhum">Nenhum</option>
              <option value="sensibilidade">
                Sensibilidade
              </option>
              <option value="alergia">Alergia</option>
              <option value="gestante">Gestante</option>
              <option value="pos_operatorio">
                Pós-operatório
              </option>
            </select>

            <input
              type="number"
              value={acrescimoCuidado}
              onChange={(e) =>
                setAcrescimoCuidado(e.target.value)
              }
              placeholder="Acréscimo"
              className="mt-4 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none"
            />

            <textarea
              value={observacaoCuidado}
              onChange={(e) =>
                setObservacaoCuidado(e.target.value)
              }
              placeholder="Observações"
              className="mt-4 min-h-[120px] w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none"
            />
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-slate-200 p-4">
          <p className="text-sm font-black text-slate-900">
            Foto do atendimento
          </p>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {["geral", "antes", "depois"].map((tipo) => (
              <button
                key={tipo}
                type="button"
                onClick={() =>
                  setTipoFotoAtendimento(
                    tipo as "geral" | "antes" | "depois",
                  )
                }
                className={`rounded-2xl px-3 py-2 text-xs font-black ${
                  tipoFotoAtendimento === tipo
                    ? "bg-orange-600 text-white"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                {tipo}
              </button>
            ))}
          </div>

          <input
            type="file"
            accept="image/*"
            className="mt-4 w-full rounded-2xl border border-slate-200 px-4 py-3"
            onChange={(e) => {
              const file = e.target.files?.[0] || null;

              setFotoAtendimento(file);

              if (file) {
                const reader = new FileReader();

                reader.onloadend = () => {
                  setPreviewFotoAtendimento(
                    reader.result as string,
                  );
                };

                reader.readAsDataURL(file);
              } else {
                setPreviewFotoAtendimento("");
              }
            }}
          />

          {previewFotoAtendimento && (
            <div className="mt-4">
              <img
                src={previewFotoAtendimento}
                alt="Preview"
                className="h-56 w-full rounded-3xl object-cover"
              />

              {fotoAtendimento && (
                <p className="mt-2 text-xs font-bold text-slate-500">
                  {fotoAtendimento.name}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            disabled={loadingFinalizar}
            onClick={onFinalizar}
            className="flex-1 rounded-3xl bg-emerald-600 px-5 py-4 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {loadingFinalizar
              ? "Finalizando..."
              : "Finalizar atendimento"}
          </button>

          <button
            type="button"
            onClick={onFechar}
            className="rounded-3xl border border-slate-200 px-5 py-4 text-sm font-black text-slate-700"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}