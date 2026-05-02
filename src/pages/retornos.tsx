import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { useEmpresa } from "../hooks/useEmpresa";

type Retorno = {
  id: string;
  empresa_id: string;
  cliente_id?: string | null;
  agendamento_id?: string | null;
  procedimento?: string | null;
  data_retorno: string;
  data_alerta?: string | null;
  observacao?: string | null;
  status?: string | null;
  mensagem_enviada_em?: string | null;
  created_at?: string | null;
  clientes?: {
    nome?: string | null;
    telefone?: string | null;
    email?: string | null;
  } | null;
};

const STATUS = [
  { value: "pendente", label: "Pendente" },
  { value: "enviado", label: "Mensagem enviada" },
  { value: "agendado", label: "Agendado" },
  { value: "concluido", label: "Concluído" },
];

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatarData(data?: string | null) {
  if (!data) return "-";
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

function normalizarTelefoneWhatsapp(telefone?: string | null) {
  const numeros = String(telefone || "").replace(/\D/g, "");
  if (!numeros) return "";
  if (numeros.startsWith("55")) return numeros;
  return `55${numeros}`;
}

export default function RetornosPage() {
  const { empresaId } = useEmpresa();

  const [retornos, setRetornos] = useState<Retorno[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState("pendente");
  const [busca, setBusca] = useState("");

  async function carregar() {
    if (!empresaId) return;

    setLoading(true);

    const { data, error } = await supabase
      .from("retornos")
      .select("*, clientes(nome, telefone, email)")
      .eq("empresa_id", empresaId)
      .order("data_alerta", { ascending: true })
      .order("data_retorno", { ascending: true });

    setLoading(false);

    if (error) {
      alert("Erro ao carregar retornos: " + error.message);
      setRetornos([]);
      return;
    }

    setRetornos((data || []) as Retorno[]);
  }

  useEffect(() => {
    carregar();
  }, [empresaId]);

  async function atualizarStatus(id: string, status: string) {
    const payload: Record<string, any> = { status };

    if (status === "enviado") {
      payload.mensagem_enviada_em = new Date().toISOString();
    }

    const { error } = await supabase
      .from("retornos")
      .update(payload)
      .eq("id", id)
      .eq("empresa_id", empresaId);

    if (error) {
      alert("Erro ao atualizar retorno: " + error.message);
      return;
    }

    await carregar();
  }

  function enviarWhatsApp(retorno: Retorno) {
    const telefone = normalizarTelefoneWhatsapp(retorno.clientes?.telefone);

    if (!telefone) {
      alert("Cliente sem telefone cadastrado.");
      return;
    }

    const nome = retorno.clientes?.nome || "cliente";
    const procedimento = retorno.procedimento || "procedimento";

    const msg = `Olá, ${nome}! Tudo bem? 😊\n\nPassando para lembrar do seu retorno de ${procedimento}. Podemos agendar?`;
    window.open(`https://wa.me/${telefone}?text=${encodeURIComponent(msg)}`, "_blank");

    atualizarStatus(retorno.id, "enviado");
  }

  async function excluir(id: string) {
    if (!confirm("Deseja excluir este retorno?")) return;

    const { error } = await supabase
      .from("retornos")
      .delete()
      .eq("id", id)
      .eq("empresa_id", empresaId);

    if (error) {
      alert("Erro ao excluir retorno: " + error.message);
      return;
    }

    await carregar();
  }

  const hoje = hojeISO();

  const retornosParaAlerta = useMemo(() => {
    return retornos.filter((r) => {
      if ((r.status || "pendente") !== "pendente") return false;
      const dataAlerta = r.data_alerta || r.data_retorno;
      return dataAlerta <= hoje;
    });
  }, [retornos, hoje]);

  const retornosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return retornos
      .filter((r) => filtroStatus === "todos" || (r.status || "pendente") === filtroStatus)
      .filter((r) => {
        if (!termo) return true;
        return [r.clientes?.nome, r.clientes?.telefone, r.procedimento, r.observacao]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(termo));
      });
  }, [retornos, filtroStatus, busca]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase text-[#27245f]">Relacionamento</p>
          <h1 className="text-3xl font-bold text-slate-900">Retornos</h1>
          <p className="text-slate-500">Acompanhe clientes que precisam receber mensagem de retorno.</p>
        </div>

        <button
          type="button"
          onClick={carregar}
          className="rounded-2xl border border-slate-300 bg-white px-5 py-3 font-bold text-slate-800 hover:bg-slate-50"
        >
          Atualizar
        </button>
      </div>

      {retornosParaAlerta.length > 0 && (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-bold text-amber-900">🔔 Alertas de retorno</p>
              <p className="text-sm text-amber-700">
                {retornosParaAlerta.length} cliente(s) precisam receber contato hoje ou estão em atraso.
              </p>
            </div>
            <span className="rounded-full bg-white px-4 py-2 text-sm font-bold text-amber-700">
              {retornosParaAlerta.length}
            </span>
          </div>
        </div>
      )}

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[1fr_220px]">
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por cliente, telefone, procedimento ou observação..."
            className="rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-[#27245f]"
          />

          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-[#27245f]"
          >
            <option value="todos">Todos os status</option>
            {STATUS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-[1.4fr_1fr_130px_130px_130px_220px] gap-4 border-b bg-slate-50 px-5 py-4 text-sm font-bold text-slate-500">
          <div>Cliente</div>
          <div>Procedimento</div>
          <div>Alerta</div>
          <div>Retorno</div>
          <div>Status</div>
          <div className="text-right">Ações</div>
        </div>

        {loading ? (
          <div className="p-6 text-center text-slate-500">Carregando...</div>
        ) : retornosFiltrados.length === 0 ? (
          <div className="p-8 text-center text-slate-500">Nenhum retorno encontrado.</div>
        ) : (
          retornosFiltrados.map((r) => {
            const status = r.status || "pendente";
            const emAlerta = status === "pendente" && (r.data_alerta || r.data_retorno) <= hoje;

            return (
              <div
                key={r.id}
                className="grid grid-cols-[1.4fr_1fr_130px_130px_130px_220px] gap-4 border-b px-5 py-4 text-sm last:border-b-0"
              >
                <div>
                  <p className="font-bold text-slate-900">{r.clientes?.nome || "Cliente não informado"}</p>
                  <p className="text-xs text-slate-500">{r.clientes?.telefone || "sem telefone"}</p>
                </div>

                <div>
                  <p className="font-semibold text-slate-800">{r.procedimento || "-"}</p>
                  {r.observacao && <p className="text-xs text-slate-500">{r.observacao}</p>}
                </div>

                <div className={emAlerta ? "font-bold text-amber-700" : "text-slate-600"}>
                  {formatarData(r.data_alerta || r.data_retorno)}
                </div>

                <div className="text-slate-600">{formatarData(r.data_retorno)}</div>

                <div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      status === "pendente"
                        ? "bg-amber-100 text-amber-700"
                        : status === "enviado"
                        ? "bg-blue-100 text-blue-700"
                        : status === "concluido"
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {STATUS.find((s) => s.value === status)?.label || status}
                  </span>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => enviarWhatsApp(r)}
                    className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-xs font-bold text-green-700 hover:bg-green-100"
                  >
                    WhatsApp
                  </button>

                  <button
                    type="button"
                    onClick={() => atualizarStatus(r.id, "concluido")}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                  >
                    Concluir
                  </button>

                  <button
                    type="button"
                    onClick={() => excluir(r.id)}
                    className="rounded-xl bg-red-100 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-200"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
