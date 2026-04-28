import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { abrirWhatsapp, aplicarVariaveisWhatsapp } from "../lib/whatsapp";
import { useEmpresa } from "../hooks/useEmpresa";

type ItemFila = {
  id: string;
  cliente: string | null;
  telefone: string | null;
  tipo: string | null;
  mensagem: string | null;
  status: string | null;
  criado_em: string | null;
};

type Agendamento = {
  id: string;
  cliente: string | null;
  telefone: string | null;
  servico: string | null;
  profissional: string | null;
  data: string | null;
  horario: string | null;
  valor: number | null;
  status: string | null;
  status_atendimento?: string | null;
  empresa_id: string | null;
};

export default function WhatsappFila() {
  const { empresaId, carregandoEmpresa } = useEmpresa();

  const [fila, setFila] = useState<ItemFila[]>([]);
  const [loading, setLoading] = useState(true);
  const [gerando, setGerando] = useState(false);

  useEffect(() => {
    if (empresaId) carregarFila();
  }, [empresaId]);

  async function carregarFila() {
    setLoading(true);

    const { data, error } = await supabase
      .from("whatsapp_fila")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("criado_em", { ascending: false });

    setLoading(false);

    if (error) {
      alert("Erro ao carregar fila: " + error.message);
      return;
    }

    setFila(data || []);
  }

  async function buscarEmpresaNome() {
    const { data } = await supabase
      .from("empresas")
      .select("nome")
      .eq("id", empresaId)
      .maybeSingle();

    return data?.nome || "VendlySys";
  }

  async function buscarModelo(tipo: string) {
    const { data } = await supabase
      .from("whatsapp_mensagens")
      .select("mensagem")
      .eq("empresa_id", empresaId)
      .eq("tipo", tipo)
      .eq("ativo", true)
      .maybeSingle();

    return data?.mensagem || null;
  }

  function hojeISO() {
    return new Date().toISOString().slice(0, 10);
  }

  function amanhaISO() {
    const data = new Date();
    data.setDate(data.getDate() + 1);
    return data.toISOString().slice(0, 10);
  }

  async function jaExisteNaFila(agendamentoId: string, tipo: string) {
    const { data } = await supabase
      .from("whatsapp_fila")
      .select("id")
      .eq("empresa_id", empresaId)
      .eq("agendamento_id", agendamentoId)
      .eq("tipo", tipo)
      .maybeSingle();

    return !!data;
  }

  async function gerarFilaAutomatica() {
    if (!empresaId) return;

    setGerando(true);

    const empresaNome = await buscarEmpresaNome();

    const modeloLembrete =
      (await buscarModelo("lembrete_agendamento")) ||
      "Olá, {{cliente}}! Lembrete do seu atendimento na {{empresa}} em {{data}} às {{horario}}.";

    const modeloAgradecimento =
      (await buscarModelo("agradecimento_atendimento")) ||
      "Olá, {{cliente}}! Obrigada pela preferência. Foi um prazer atender você na {{empresa}} 💖";

    const { data: agendamentos, error } = await supabase
      .from("agendamentos")
      .select("*")
      .eq("empresa_id", empresaId);

    if (error) {
      setGerando(false);
      alert("Erro ao buscar agendamentos: " + error.message);
      return;
    }

    const hoje = hojeISO();
    const amanha = amanhaISO();

    let criadas = 0;

    for (const ag of (agendamentos || []) as Agendamento[]) {
      if (!ag.telefone) continue;

      const isAmanha = ag.data === amanha;
      const isFinalizadoHoje =
        ag.data === hoje &&
        (ag.status === "finalizado" ||
          ag.status_atendimento === "finalizado");

      if (isAmanha) {
        const tipo = "lembrete_agendamento";
        const existe = await jaExisteNaFila(ag.id, tipo);

        if (!existe) {
          const mensagem = aplicarVariaveisWhatsapp(modeloLembrete, {
            cliente: ag.cliente,
            empresa: empresaNome,
            servico: ag.servico,
            profissional: ag.profissional,
            data: ag.data,
            horario: ag.horario,
            valor: ag.valor,
          });

          const { error: insertError } = await supabase
            .from("whatsapp_fila")
            .insert({
              empresa_id: empresaId,
              agendamento_id: ag.id,
              cliente: ag.cliente,
              telefone: ag.telefone,
              tipo,
              mensagem,
              status: "pendente",
            });

          if (!insertError) criadas++;
        }
      }

      if (isFinalizadoHoje) {
        const tipo = "agradecimento_atendimento";
        const existe = await jaExisteNaFila(ag.id, tipo);

        if (!existe) {
          const mensagem = aplicarVariaveisWhatsapp(modeloAgradecimento, {
            cliente: ag.cliente,
            empresa: empresaNome,
            servico: ag.servico,
            profissional: ag.profissional,
            data: ag.data,
            horario: ag.horario,
            valor: ag.valor,
          });

          const { error: insertError } = await supabase
            .from("whatsapp_fila")
            .insert({
              empresa_id: empresaId,
              agendamento_id: ag.id,
              cliente: ag.cliente,
              telefone: ag.telefone,
              tipo,
              mensagem,
              status: "pendente",
            });

          if (!insertError) criadas++;
        }
      }
    }

    setGerando(false);
    await carregarFila();

    alert(`${criadas} mensagem(ns) adicionada(s) à fila.`);
  }

  async function marcarEnviado(item: ItemFila) {
    const { error } = await supabase
      .from("whatsapp_fila")
      .update({
        status: "enviado",
        enviado_em: new Date().toISOString(),
      })
      .eq("id", item.id)
      .eq("empresa_id", empresaId);

    if (error) {
      alert("Erro ao marcar como enviado: " + error.message);
      return;
    }

    carregarFila();
  }

  async function enviar(item: ItemFila) {
    if (!item.telefone) {
      alert("Telefone não informado.");
      return;
    }

    if (!item.mensagem) {
      alert("Mensagem não informada.");
      return;
    }

    abrirWhatsapp(item.telefone, item.mensagem);
    await marcarEnviado(item);
  }

  async function excluir(item: ItemFila) {
    if (!confirm("Deseja excluir esta mensagem da fila?")) return;

    const { error } = await supabase
      .from("whatsapp_fila")
      .delete()
      .eq("id", item.id)
      .eq("empresa_id", empresaId);

    if (error) {
      alert("Erro ao excluir: " + error.message);
      return;
    }

    carregarFila();
  }

  if (carregandoEmpresa) {
    return <div className="p-6">Carregando empresa...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p style={{ color: "var(--cor-primaria, #4b2f3f)" }}
          className="text-sm font-bold uppercase">
            Comunicação
          </p>

          <h1 className="text-3xl font-bold text-slate-900">
            Fila WhatsApp
          </h1>

          <p className="text-slate-500">
            Gere lembretes de amanhã e agradecimentos dos atendimentos
            finalizados hoje.
          </p>
        </div>

        <button
          onClick={gerarFilaAutomatica}
          disabled={gerando}
          style={{ backgroundColor: "var(--cor-primaria, #4b2f3f)" }}
          className="text-white px-5 py-3 rounded-2xl font-bold hover:opacity-90 transition disabled:opacity-60"
        >
          {gerando ? "Gerando..." : "Gerar fila automática"}
        </button>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-bold">Mensagens</h2>

          <button
            onClick={carregarFila}
            className="border px-4 py-2 rounded-xl font-bold"
          >
            Atualizar
          </button>
        </div>

        {loading ? (
          <div className="p-6">Carregando...</div>
        ) : (
          <div className="divide-y">
            {fila.map((item) => (
              <div
                key={item.id}
                className="p-4 flex items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-slate-900">
                      {item.cliente || "Cliente não informado"}
                    </p>

                    <span
                      className={`text-xs px-2 py-1 rounded-full font-bold ${
                        item.status === "enviado"
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {item.status || "pendente"}
                    </span>
                  </div>

                  <p className="text-sm text-slate-500">
                    {item.tipo || "-"} • {item.telefone || "Sem telefone"}
                  </p>

                  <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">
                    {item.mensagem}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => enviar(item)}
                    disabled={item.status === "enviado"}
                    className="bg-green-600 text-white px-4 py-2 rounded-xl font-bold disabled:opacity-50"
                  >
                    Enviar
                  </button>

                  <button
                    onClick={() => excluir(item)}
                    className="border px-4 py-2 rounded-xl font-bold"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            ))}

            {fila.length === 0 && (
              <div className="p-10 text-center text-slate-500">
                Nenhuma mensagem na fila.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}