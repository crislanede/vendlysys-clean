import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { abrirWhatsapp, aplicarVariaveisWhatsapp, montarLinkMeuEspaco } from "../lib/whatsapp";
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
  cliente_id?: string | null;
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

type ClientePacote = {
  id: string;
  empresa_id: string | null;
  cliente_id: string | null;
  pacote_id: string | null;
  data_inicio?: string | null;
  data_fim?: string | null;
  status?: string | null;
  created_at?: string | null;
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

  async function jaExisteComboNaFila(clienteId: string, tipo: string) {
    const { data } = await supabase
      .from("whatsapp_fila")
      .select("id")
      .eq("empresa_id", empresaId)
      .eq("cliente_id", clienteId)
      .eq("tipo", tipo)
      .neq("status", "enviado")
      .limit(1);

    return !!data?.length;
  }

  async function buscarTokenMeuEspaco(clienteId: string) {
    const { data, error } = await supabase
      .from("agendamentos")
      .select("token_cliente, token, created_at")
      .eq("empresa_id", empresaId)
      .eq("cliente_id", clienteId)
      .not("token_cliente", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn("Não foi possível buscar token do Meu Espaço:", error);
      return "";
    }

    return data?.token_cliente || data?.token || "";
  }

  async function gerarLembretesCombo(empresaNome: string, hoje: string) {
    const tipo = "lembrete_combo";

    const modeloCombo =
      (await buscarModelo(tipo)) ||
      `Olá, {{cliente}}!

Percebemos que você ainda não agendou o uso do seu combo desta semana.

Para não perder nenhuma sessão do seu pacote, recomendamos que realize o agendamento o quanto antes 😊

Para aproveitar suas sessões dentro do prazo, clique abaixo e escolha seu horário:

{{link_meu_espaco}}`;

    const { data: vinculos, error: erroVinculos } = await supabase
      .from("cliente_pacotes")
      .select("id, empresa_id, cliente_id, pacote_id, data_inicio, data_fim, status, created_at")
      .eq("empresa_id", empresaId)
      .eq("status", "ativo");

    if (erroVinculos) {
      console.error("Erro ao buscar combos ativos:", erroVinculos);
      return 0;
    }

    const listaVinculos = ((vinculos || []) as ClientePacote[]).filter((vinculo) => {
      if (!vinculo.cliente_id) return false;
      if (vinculo.data_fim && vinculo.data_fim < hoje) return false;
      return true;
    });

    if (listaVinculos.length === 0) return 0;

    const idsVinculos = listaVinculos.map((item) => item.id).filter(Boolean);
    const idsClientes = Array.from(
      new Set(listaVinculos.map((item) => item.cliente_id).filter(Boolean)),
    ) as string[];
    const idsPacotes = Array.from(
      new Set(listaVinculos.map((item) => item.pacote_id).filter(Boolean)),
    ) as string[];

    const { data: clientesBanco } = idsClientes.length
      ? await supabase
          .from("clientes")
          .select("id, nome, telefone")
          .in("id", idsClientes)
      : { data: [] as any[] };

    const { data: pacotesBanco } = idsPacotes.length
      ? await supabase
          .from("marketing_pacotes")
          .select("id, nome")
          .in("id", idsPacotes)
      : { data: [] as any[] };

    const { data: saldosBanco, error: erroSaldos } = idsVinculos.length
      ? await supabase
          .from("cliente_pacote_saldos")
          .select("cliente_pacote_id, quantidade_total, quantidade_usada")
          .in("cliente_pacote_id", idsVinculos)
      : { data: [] as any[], error: null };

    if (erroSaldos) {
      console.error("Erro ao buscar saldos dos combos:", erroSaldos);
      return 0;
    }

    const { data: agendamentosFuturos } = idsClientes.length
      ? await supabase
          .from("agendamentos")
          .select("id, cliente_id, data, status, status_atendimento")
          .eq("empresa_id", empresaId)
          .gte("data", hoje)
          .in("cliente_id", idsClientes)
      : { data: [] as any[] };

    const mapaClientes = new Map<string, any>(
      (clientesBanco || []).map((item: any) => [item.id, item]),
    );
    const mapaPacotes = new Map<string, any>(
      (pacotesBanco || []).map((item: any) => [item.id, item]),
    );

    let criadas = 0;

    for (const vinculo of listaVinculos) {
      const clienteId = vinculo.cliente_id || "";
      const cliente = mapaClientes.get(clienteId);
      const pacote = mapaPacotes.get(vinculo.pacote_id || "");

      if (!cliente?.telefone) continue;

      const saldos = (saldosBanco || []).filter(
        (saldo: any) => saldo.cliente_pacote_id === vinculo.id,
      );

      const totalSessoes = saldos.reduce(
        (total: number, saldo: any) => total + Number(saldo.quantidade_total || 0),
        0,
      );
      const totalUsado = saldos.reduce(
        (total: number, saldo: any) => total + Number(saldo.quantidade_usada || 0),
        0,
      );
      const totalRestante = Math.max(totalSessoes - totalUsado, 0);

      if (totalRestante <= 0) continue;

      const temAgendamentoFuturo = (agendamentosFuturos || []).some((ag: any) => {
        const status = String(ag.status || ag.status_atendimento || "").toLowerCase();
        return ag.cliente_id === clienteId && !["cancelado", "cancelada"].includes(status);
      });

      if (temAgendamentoFuturo) continue;

      const existe = await jaExisteComboNaFila(clienteId, tipo);
      if (existe) continue;

      const token = await buscarTokenMeuEspaco(clienteId);
      const linkMeuEspaco = montarLinkMeuEspaco(token);

      const mensagem = aplicarVariaveisWhatsapp(modeloCombo, {
        cliente: cliente.nome,
        empresa: empresaNome,
        servico: pacote?.nome || "combo",
        titulo: pacote?.nome || "Combo",
        mensagem: pacote?.nome || "Combo",
        link_meu_espaco: linkMeuEspaco,
      });

      const { error: insertError } = await supabase.from("whatsapp_fila").insert({
        empresa_id: empresaId,
        cliente_id: clienteId,
        cliente: cliente.nome,
        telefone: cliente.telefone,
        tipo,
        mensagem,
        status: "pendente",
      });

      if (insertError) {
        console.error("Erro ao inserir lembrete de combo:", insertError);
        continue;
      }

      criadas++;
    }

    return criadas;
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

    const combosCriados = await gerarLembretesCombo(empresaNome, hoje);
    criadas += combosCriados;

    setGerando(false);
    await carregarFila();

    alert(`${criadas} mensagem(ns) adicionada(s) à fila. (${combosCriados} de combo)`);
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
            Gere lembretes de amanhã, agradecimentos e lembretes de uso de combos.
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