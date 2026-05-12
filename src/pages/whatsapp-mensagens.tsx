import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { useEmpresa } from "../hooks/useEmpresa";

type TipoMensagemWhatsapp =
  | "confirmacao_agendamento"
  | "lembrete_agendamento"
  | "cancelamento_agendamento"
  | "agradecimento_atendimento"
  | "pdf_anamnese"
  | "novo_agendamento_cliente"
  | "reagendamento_agendamento"
  | "campanha";

type MensagemBanco = {
  id?: string;
  empresa_id?: string | null;
  tipo: TipoMensagemWhatsapp;
  titulo?: string | null;
  mensagem: string;
  ativo?: boolean | null;
  criado_em?: string | null;
  atualizado_em?: string | null;
};

const mensagensPadrao: Record<TipoMensagemWhatsapp, string> = {
  confirmacao_agendamento:
    "Olá, {{cliente}}! Seu agendamento na {{empresa}} está marcado para {{data}} às {{horario}} com {{profissional}}. Confirme pelo link: {{link_meu_espaco}}",
  lembrete_agendamento:
    "Olá, {{cliente}}! Passando para lembrar do seu atendimento na {{empresa}} amanhã às {{horario}}. Esperamos você!",
  cancelamento_agendamento:
    "Olá, {{cliente}}! Seu agendamento de {{servico}} em {{data}} às {{horario}} foi cancelado.",
  agradecimento_atendimento:
    "Olá, {{cliente}}! Obrigada pela preferência. Foi um prazer atender você na {{empresa}} 💖",
  pdf_anamnese:
    "Olá, {{cliente}}! Segue o link do PDF da sua anamnese: {{pdf_url}}",
  novo_agendamento_cliente:
    "Olá! Recebemos uma nova solicitação de agendamento de {{cliente}} para {{servico}}.",
  reagendamento_agendamento:
    "Olá, {{cliente}}! Seu agendamento foi reagendado para {{nova_data}} às {{novo_horario}}.",
  campanha:
    "Olá, {{cliente}}! Temos uma novidade especial para você: {{mensagem}}",
};

const tiposMensagem: Array<{
  tipo: TipoMensagemWhatsapp;
  nome: string;
  descricao: string;
}> = [
  {
    tipo: "confirmacao_agendamento",
    nome: "Confirmação de agendamento",
    descricao: "Mensagem enviada para o cliente confirmar presença.",
  },
  {
    tipo: "lembrete_agendamento",
    nome: "Lembrete de agendamento",
    descricao: "Mensagem enviada antes do atendimento.",
  },
  {
    tipo: "cancelamento_agendamento",
    nome: "Cancelamento",
    descricao: "Mensagem enviada quando um agendamento é cancelado.",
  },
  {
    tipo: "agradecimento_atendimento",
    nome: "Agradecimento pós-atendimento",
    descricao: "Mensagem enviada após finalizar o atendimento.",
  },
  {
    tipo: "pdf_anamnese",
    nome: "PDF da anamnese",
    descricao: "Mensagem enviada com o link do PDF.",
  },
  {
    tipo: "novo_agendamento_cliente",
    nome: "Novo agendamento pelo cliente",
    descricao: "Aviso de nova solicitação pelo Meu Espaço.",
  },
  {
    tipo: "reagendamento_agendamento",
    nome: "Reagendamento",
    descricao: "Mensagem enviada quando o horário é alterado.",
  },
  {
    tipo: "campanha",
    nome: "Campanha",
    descricao: "Modelo base para campanhas de WhatsApp.",
  },
];

const variaveisDisponiveis = [
  "{{cliente}}",
  "{{empresa}}",
  "{{profissional}}",
  "{{servico}}",
  "{{data}}",
  "{{horario}}",
  "{{nova_data}}",
  "{{novo_horario}}",
  "{{valor}}",
  "{{link_meu_espaco}}",
  "{{pdf_url}}",
  "{{telefone_empresa}}",
  "{{titulo}}",
  "{{descricao}}",
  "{{mensagem}}",
];

export default function WhatsappMensagens() {
  const { empresaId, carregandoEmpresa } = useEmpresa();

  const [mensagens, setMensagens] = useState<Record<string, MensagemBanco>>({});
  const [tipoSelecionado, setTipoSelecionado] =
    useState<TipoMensagemWhatsapp>("confirmacao_agendamento");

  const [titulo, setTitulo] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (empresaId) carregarMensagens();
  }, [empresaId]);

  useEffect(() => {
    carregarMensagemNoFormulario(tipoSelecionado);
  }, [tipoSelecionado, mensagens]);

  async function carregarMensagens() {
    if (!empresaId) return;

    setLoading(true);

    const { data, error } = await supabase
      .from("whatsapp_mensagens")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("tipo", { ascending: true });

    if (error) {
      alert("Erro ao carregar mensagens: " + error.message);
      setMensagens({});
      setLoading(false);
      return;
    }

    const mapa: Record<string, MensagemBanco> = {};

    (data || []).forEach((item) => {
      mapa[item.tipo] = item as MensagemBanco;
    });

    setMensagens(mapa);
    setLoading(false);
  }

  function carregarMensagemNoFormulario(tipo: TipoMensagemWhatsapp) {
    const salva = mensagens[tipo];
    const config = tiposMensagem.find((item) => item.tipo === tipo);

    setTitulo(salva?.titulo || config?.nome || tipo);
    setMensagem(salva?.mensagem || mensagensPadrao[tipo] || "");
    setAtivo(salva?.ativo !== false);
  }

 async function salvar() {
  if (!empresaId) {
    alert("Empresa não encontrada.");
    return;
  }

  if (!mensagem.trim()) {
    alert("Informe a mensagem.");
    return;
  }

  setSalvando(true);

  const existente = mensagens[tipoSelecionado];

  const payload = {
    empresa_id: empresaId,
    tipo: tipoSelecionado,
    titulo: titulo.trim() || tipoSelecionado,
    mensagem: mensagem.trim(),
    ativo,
    atualizado_em: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("whatsapp_mensagens")
    .upsert(
      {
        ...payload,
        criado_em:
          existente?.criado_em || new Date().toISOString(),
      },
      {
        onConflict: "tipo",
      }
    );

  setSalvando(false);

  if (error) {
    alert("Erro ao salvar mensagem: " + error.message);
    return;
  }

  await carregarMensagens();

  alert("Mensagem salva com sucesso!");
}

  async function criarTodasPadrao() {
  if (!empresaId) {
    alert("Empresa não encontrada.");
    return;
  }

  const confirmar = window.confirm(
    "Deseja criar ou atualizar todas as mensagens com os modelos padrão?"
  );

  if (!confirmar) return;

  setSalvando(true);

  for (const item of tiposMensagem) {
    const existente = mensagens[item.tipo];

    const payload = {
      empresa_id: empresaId,
      tipo: item.tipo,
      titulo: item.nome,
      mensagem: mensagensPadrao[item.tipo],
      ativo: true,
      atualizado_em: new Date().toISOString(),
    };

    await supabase
      .from("whatsapp_mensagens")
      .upsert(
        {
          ...payload,
          criado_em:
            existente?.criado_em ||
            new Date().toISOString(),
        },
        {
          onConflict: "empresa_id,tipo",
        }
      );
  }

  setSalvando(false);

  await carregarMensagens();

  alert("Mensagens padrão criadas/atualizadas com sucesso!");
}

  function restaurarPadrao() {
    const confirmar = window.confirm(
      "Deseja restaurar a mensagem padrão? O texto atual será substituído."
    );

    if (!confirmar) return;

    const config = tiposMensagem.find((item) => item.tipo === tipoSelecionado);

    setTitulo(config?.nome || tipoSelecionado);
    setMensagem(mensagensPadrao[tipoSelecionado] || "");
    setAtivo(true);
  }

  function inserirVariavel(variavel: string) {
    setMensagem((atual) => {
      const separador =
        atual && !atual.endsWith(" ") && !atual.endsWith("\n") ? " " : "";
      return `${atual}${separador}${variavel}`;
    });
  }

  const tipoAtual = useMemo(
    () => tiposMensagem.find((item) => item.tipo === tipoSelecionado),
    [tipoSelecionado]
  );

  const preview = useMemo(() => {
    return mensagem
      .replaceAll("{{cliente}}", "Daniele")
      .replaceAll("{{empresa}}", "Espaço Áurea")
      .replaceAll("{{profissional}}", "Cris")
      .replaceAll("{{servico}}", "Pé e mão")
      .replaceAll("{{data}}", "25/04/2026")
      .replaceAll("{{horario}}", "14:00")
      .replaceAll("{{nova_data}}", "26/04/2026")
      .replaceAll("{{novo_horario}}", "15:00")
      .replaceAll("{{valor}}", "R$ 100,00")
      .replaceAll("{{link_meu_espaco}}", "https://seusite.com/meu-espaco?token=...")
      .replaceAll("{{pdf_url}}", "https://arquivo.pdf")
      .replaceAll("{{telefone_empresa}}", "(11) 99999-9999")
      .replaceAll("{{titulo}}", "Promoção especial")
      .replaceAll("{{descricao}}", "Condição válida até o fim do mês")
      .replaceAll("{{mensagem}}", "Temos uma novidade para você!");
  }, [mensagem]);

  if (carregandoEmpresa) {
    return <div className="p-6">Carregando empresa...</div>;
  }

  if (!empresaId) {
    return <div className="p-6">Empresa não encontrada.</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p
            style={{ color: "var(--cor-primaria, #4b2f3f)" }}
            className="text-sm font-bold uppercase"
          >
            Comunicação
          </p>

          <h1 className="text-3xl font-bold text-slate-900">
            Mensagens de WhatsApp
          </h1>

          <p className="text-slate-500">
            Edite os modelos usados em confirmações, lembretes, campanhas,
            anamnese e agradecimentos.
          </p>
        </div>

        <button
          type="button"
          onClick={criarTodasPadrao}
          disabled={salvando}
          style={{ backgroundColor: "var(--cor-primaria, #4b2f3f)" }}
          className="text-white px-5 py-3 rounded-2xl font-bold disabled:opacity-60 hover:opacity-90 transition"
        >
          Criar padrões
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_1fr]">
        <div className="bg-white rounded-2xl border shadow-sm p-5">
          <h2 className="font-bold text-slate-900">Modelos</h2>
          <p className="text-sm text-slate-500 mb-4">
            Selecione uma mensagem para editar.
          </p>

          {loading ? (
            <p className="text-sm text-slate-500">Carregando...</p>
          ) : (
            <div className="space-y-2">
              {tiposMensagem.map((item) => {
                const selecionado = item.tipo === tipoSelecionado;
                const existe = Boolean(mensagens[item.tipo]);

                return (
                  <button
                    key={item.tipo}
                    type="button"
                    onClick={() => setTipoSelecionado(item.tipo)}
                    style={
                      selecionado
                        ? {
                            borderColor: "var(--cor-primaria, #4b2f3f)",
                            backgroundColor: "color-mix(in srgb, var(--cor-primaria, #4b2f3f) 10%, white)",
                          }
                        : undefined
                    }
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      selecionado
                        ? ""
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-bold text-slate-900">{item.nome}</p>

                      <span
                        className={`rounded-full px-2 py-1 text-xs font-bold ${
                          existe
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-orange-100 text-orange-700"
                        }`}
                      >
                        {existe ? "Editável" : "Padrão"}
                      </span>
                    </div>

                    <p className="mt-1 text-sm text-slate-500">
                      {item.descricao}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl border shadow-sm p-5">
            <h2 className="font-bold text-slate-900">
              {tipoAtual?.nome || "Mensagem"}
            </h2>
            <p className="text-sm text-slate-500 mb-4">
              {tipoAtual?.descricao || "Edite o texto desta mensagem."}
            </p>

            <div className="space-y-4">
              <label className="block">
                <span className="mb-1 block text-sm font-bold text-slate-700">
                  Título interno
                </span>
                <input
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 p-3"
                  placeholder="Ex: Confirmação de agendamento"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-bold text-slate-700">
                  Mensagem
                </span>
                <textarea
                  value={mensagem}
                  onChange={(e) => setMensagem(e.target.value)}
                  className="min-h-80 w-full rounded-2xl border border-slate-200 p-3 font-mono text-sm"
                  placeholder="Digite a mensagem..."
                />
              </label>

              <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={ativo}
                  onChange={(e) => setAtivo(e.target.checked)}
                />
                Mensagem ativa
              </label>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={salvar}
                  disabled={salvando}
                  style={{ backgroundColor: "var(--cor-primaria, #4b2f3f)" }}
                  className="text-white px-5 py-3 rounded-2xl font-bold disabled:opacity-60 hover:opacity-90 transition"
                >
                  {salvando ? "Salvando..." : "Salvar mensagem"}
                </button>

                <button
                  type="button"
                  onClick={restaurarPadrao}
                  disabled={salvando}
                  className="border px-5 py-3 rounded-2xl font-bold disabled:opacity-60"
                >
                  Restaurar padrão
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border shadow-sm p-5">
            <h2 className="font-bold text-slate-900">Variáveis disponíveis</h2>
            <p className="text-sm text-slate-500 mb-4">
              Clique para inserir no final da mensagem.
            </p>

            <div className="flex flex-wrap gap-2">
              {variaveisDisponiveis.map((variavel) => (
                <button
                  key={variavel}
                  type="button"
                  onClick={() => inserirVariavel(variavel)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-2 font-mono text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  {variavel}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border shadow-sm p-5">
            <h2 className="font-bold text-slate-900">Prévia</h2>
            <p className="text-sm text-slate-500 mb-4">
              Exemplo de como a mensagem ficará para o cliente.
            </p>

            <div className="whitespace-pre-wrap rounded-3xl bg-emerald-50 p-5 text-sm font-semibold text-emerald-900">
              {preview || "Digite uma mensagem para visualizar a prévia."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}