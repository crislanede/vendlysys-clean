import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

import PageHeader from "../components/ui/PageHeader";
import SectionCard from "../components/ui/SectionCard";
import PrimaryButton from "../components/ui/PrimaryButton";
import SecondaryButton from "../components/ui/SecondaryButton";

import {
  mensagensWhatsappPadrao,
  salvarMensagemWhatsapp,
  type TipoMensagemWhatsapp,
} from "../lib/whatsapp";

type MensagemBanco = {
  id?: string;
  tipo: TipoMensagemWhatsapp;
  titulo?: string | null;
  mensagem: string;
  ativo?: boolean | null;
  criado_em?: string | null;
  atualizado_em?: string | null;
};

const tiposMensagem: Array<{
  tipo: TipoMensagemWhatsapp;
  nome: string;
  descricao: string;
}> = [
  {
    tipo: "confirmacao_agendamento",
    nome: "Confirmação de agendamento",
    descricao: "Mensagem enviada para o cliente confirmar ou cancelar presença.",
  },
  {
    tipo: "lembrete_agendamento",
    nome: "Lembrete de agendamento",
    descricao: "Mensagem enviada antes do atendimento.",
  },
  {
    tipo: "cancelamento_agendamento",
    nome: "Cancelamento de agendamento",
    descricao: "Mensagem enviada quando um agendamento é cancelado.",
  },
  {
    tipo: "agradecimento_atendimento",
    nome: "Agradecimento pós-atendimento",
    descricao: "Mensagem enviada depois que o atendimento é finalizado.",
  },
  {
    tipo: "pdf_anamnese",
    nome: "PDF da anamnese",
    descricao: "Mensagem enviada junto com o link do PDF da ficha de anamnese.",
  },
  {
    tipo: "novo_agendamento_cliente",
    nome: "Novo agendamento pelo cliente",
    descricao: "Mensagem enviada quando o cliente solicita novo agendamento pelo Meu Espaço.",
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
  const [mensagens, setMensagens] = useState<Record<string, MensagemBanco>>({});
  const [tipoSelecionado, setTipoSelecionado] =
    useState<TipoMensagemWhatsapp>("confirmacao_agendamento");
  const [titulo, setTitulo] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    void carregarMensagens();
  }, []);

  useEffect(() => {
    carregarMensagemNoFormulario(tipoSelecionado);
  }, [tipoSelecionado, mensagens]);

  async function carregarMensagens() {
    setLoading(true);

    const { data, error } = await supabase
      .from("whatsapp_mensagens")
      .select("*")
      .order("tipo", { ascending: true });

    if (error) {
      console.warn("Erro ao carregar mensagens:", error);
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
    setMensagem(salva?.mensagem || mensagensWhatsappPadrao[tipo] || "");
    setAtivo(salva?.ativo !== false);
  }

  async function salvar() {
    if (!mensagem.trim()) {
      alert("Informe a mensagem.");
      return;
    }

    setSalvando(true);

    try {
      await salvarMensagemWhatsapp({
        tipo: tipoSelecionado,
        titulo: titulo.trim() || tipoSelecionado,
        mensagem: mensagem.trim(),
      });

      if (!ativo) {
        const { error } = await supabase
          .from("whatsapp_mensagens")
          .update({
            ativo: false,
            atualizado_em: new Date().toISOString(),
          })
          .eq("tipo", tipoSelecionado);

        if (error) throw error;
      }

      await carregarMensagens();
      alert("Mensagem salva com sucesso!");
    } catch (error: any) {
      console.error(error);
      alert("Erro ao salvar mensagem: " + (error?.message || "erro desconhecido"));
    } finally {
      setSalvando(false);
    }
  }

  async function restaurarPadrao() {
    const confirmar = window.confirm(
      "Deseja restaurar a mensagem padrão? O texto atual será substituído."
    );

    if (!confirmar) return;

    const config = tiposMensagem.find((item) => item.tipo === tipoSelecionado);

    setTitulo(config?.nome || tipoSelecionado);
    setMensagem(mensagensWhatsappPadrao[tipoSelecionado] || "");
    setAtivo(true);
  }

  async function criarTodasPadrao() {
    const confirmar = window.confirm(
      "Deseja criar/atualizar todas as mensagens com os modelos padrão?"
    );

    if (!confirmar) return;

    setSalvando(true);

    try {
      for (const item of tiposMensagem) {
        await salvarMensagemWhatsapp({
          tipo: item.tipo,
          titulo: item.nome,
          mensagem: mensagensWhatsappPadrao[item.tipo],
        });
      }

      await carregarMensagens();
      alert("Mensagens padrão criadas/atualizadas com sucesso!");
    } catch (error: any) {
      console.error(error);
      alert("Erro ao criar mensagens padrão: " + (error?.message || "erro desconhecido"));
    } finally {
      setSalvando(false);
    }
  }

  function inserirVariavel(variavel: string) {
    setMensagem((atual) => {
      const separador = atual && !atual.endsWith(" ") && !atual.endsWith("\n") ? " " : "";
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

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Comunicação"
        title="Mensagens de WhatsApp"
        description="Edite os modelos usados nas confirmações, lembretes, campanhas, anamnese e agradecimentos."
        action={
          <PrimaryButton type="button" onClick={criarTodasPadrao} disabled={salvando}>
            Criar padrões
          </PrimaryButton>
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_1fr]">
        <SectionCard title="Modelos" description="Selecione uma mensagem para editar.">
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
                    className="w-full rounded-2xl border p-4 text-left transition"
                    style={{
                      borderColor: selecionado ? "var(--color-primary)" : "rgb(226 232 240)",
                      backgroundColor: selecionado ? "rgba(249, 115, 22, 0.08)" : "#fff",
                    }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-extrabold text-slate-900">{item.nome}</p>

                      <span
                        className={`rounded-full px-2 py-1 text-xs font-extrabold ${
                          existe
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-orange-100 text-orange-700"
                        }`}
                      >
                        {existe ? "Editável" : "Padrão"}
                      </span>
                    </div>

                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      {item.descricao}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </SectionCard>

        <div className="space-y-6">
          <SectionCard
            title={tipoAtual?.nome || "Mensagem"}
            description={tipoAtual?.descricao || "Edite o texto desta mensagem."}
          >
            <div className="space-y-4">
              <label className="block">
                <span className="mb-1 block text-sm font-extrabold text-slate-700">
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
                <span className="mb-1 block text-sm font-extrabold text-slate-700">
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
                <PrimaryButton type="button" onClick={salvar} disabled={salvando}>
                  {salvando ? "Salvando..." : "Salvar mensagem"}
                </PrimaryButton>

                <SecondaryButton type="button" onClick={restaurarPadrao} disabled={salvando}>
                  Restaurar padrão
                </SecondaryButton>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Variáveis disponíveis"
            description="Clique para inserir no final da mensagem. O sistema troca automaticamente na hora do envio."
          >
            <div className="flex flex-wrap gap-2">
              {variaveisDisponiveis.map((variavel) => (
                <button
                  key={variavel}
                  type="button"
                  onClick={() => inserirVariavel(variavel)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-2 font-mono text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  {variavel}
                </button>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Prévia" description="Exemplo de como a mensagem ficará para o cliente.">
            <div className="whitespace-pre-wrap rounded-3xl bg-emerald-50 p-5 text-sm font-semibold text-emerald-900">
              {preview || "Digite uma mensagem para visualizar a prévia."}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
