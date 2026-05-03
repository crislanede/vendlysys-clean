import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useEmpresa } from "../hooks/useEmpresa";

// ✅ Função usada (não dá mais erro)
function formatarData(data?: string | null) {
  if (!data) return "-";
  return new Date(`${data}T00:00:00`).toLocaleDateString("pt-BR");
}

export default function AgendaPage() {
  const { empresaId } = useEmpresa();
  const [agendamentos, setAgendamentos] = useState<any[]>([]);

  useEffect(() => {
    carregar();
  }, [empresaId]);

  async function carregar() {
    if (!empresaId) return;

    const { data } = await supabase
      .from("agendamentos")
      .select("*")
      .eq("empresa_id", empresaId)
      .neq("status", "cancelado") // ✅ some da agenda
      .order("data", { ascending: true })
      .order("horario", { ascending: true });

    setAgendamentos(data || []);
  }

  // ============================
  // 📲 WHATSAPP
  // ============================

  function abrirWhatsApp(mensagem: string) {
    const telefone = "5511990040469";
    const apikey = "9623932";

    const url = `https://api.callmebot.com/whatsapp.php?phone=${telefone}&text=${encodeURIComponent(
      mensagem
    )}&apikey=${apikey}`;

    window.open(url, "_blank");
  }

  function mensagemConfirmacao(a: any) {
    return `Olá, ${a.cliente}!

Seu agendamento foi CONFIRMADO ✅

Serviço: ${a.servico}
Data: ${formatarData(a.data)}
Horário: ${a.horario}`;
  }

  function mensagemCancelamento(a: any) {
    return `Olá, ${a.cliente}!

Seu agendamento foi CANCELADO ❌

Serviço: ${a.servico}
Data: ${formatarData(a.data)}
Horário: ${a.horario}`;
  }

  function mensagemReagendamento(a: any) {
    return `Olá, ${a.cliente}!

Seu agendamento foi REAGENDADO 🔄

Serviço: ${a.servico}
Data: ${formatarData(a.data)}
Horário: ${a.horario}`;
  }

  // ============================
  // 🔄 AÇÕES
  // ============================

  async function confirmar(a: any) {
    await supabase
      .from("agendamentos")
      .update({ status: "confirmado" })
      .eq("id", a.id);

    abrirWhatsApp(mensagemConfirmacao(a));
    carregar();
  }

  async function cancelar(a: any) {
    await supabase
      .from("agendamentos")
      .update({ status: "cancelado" })
      .eq("id", a.id);

    abrirWhatsApp(mensagemCancelamento(a));
    carregar();
  }

  function reagendar(a: any) {
    abrirWhatsApp(mensagemReagendamento(a));
  }

  async function finalizar(a: any) {
    await supabase
      .from("agendamentos")
      .update({ status: "finalizado" })
      .eq("id", a.id);

    carregar();
  }

  // ============================
  // 🎨 UI
  // ============================

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Agenda</h1>

      {agendamentos.map((a) => (
        <div
          key={a.id}
          className="border rounded-lg p-4 flex justify-between items-center"
        >
          <div>
            <p className="font-bold">{a.cliente}</p>
            <p>{a.servico}</p>
            <p>
              {formatarData(a.data)} às {a.horario}
            </p>
            <p>Status: {a.status}</p>
          </div>

          <div className="flex gap-2">
            {a.status === "agendado" && (
              <button
                onClick={() => confirmar(a)}
                className="px-3 py-1 border rounded"
              >
                Confirmar
              </button>
            )}

            <button
              onClick={() => reagendar(a)}
              className="px-3 py-1 border rounded"
            >
              Reagendar
            </button>

            <button
              onClick={() => cancelar(a)}
              className="px-3 py-1 border rounded"
            >
              Cancelar
            </button>

            <button
              onClick={() => finalizar(a)}
              className="px-3 py-1 bg-purple-600 text-white rounded"
            >
              Finalizar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}