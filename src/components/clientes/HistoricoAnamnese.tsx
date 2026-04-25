import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import {
  abrirWhatsapp,
  montarMensagemPdfAnamnese,
} from "../../lib/whatsapp";

type Props = {
  clienteId?: string;
  clienteNome?: string;
  telefoneCliente?: string;
  empresaNome?: string;
};

type AnamneseCliente = {
  id: string;
  cliente_id: string | null;
  cliente_nome: string | null;
  aceita_termo: boolean | null;
  preenchido: boolean | null;
  preenchido_em: string | null;
  criado_em: string | null;
  assinatura_base64?: string | null;
  hash_assinatura?: string | null;
  ip_assinatura?: string | null;
  assinado_em?: string | null;
  pdf_url?: string | null;
};

type CampoRelacionado = {
  label: string;
  nome_campo: string;
  tipo: string;
};

type RespostaItem = {
  id: string;
  resposta: string | null;
  anamnese_campos: CampoRelacionado[] | null;
};

export default function HistoricoAnamnese({
  clienteId,
  clienteNome,
  telefoneCliente,
  empresaNome = "Seu estabelecimento",
}: Props) {
  const [loading, setLoading] = useState(true);
  const [anamneses, setAnamneses] = useState<AnamneseCliente[]>([]);
  const [anamneseSelecionadaId, setAnamneseSelecionadaId] = useState<string | null>(null);
  const [respostas, setRespostas] = useState<RespostaItem[]>([]);

  useEffect(() => {
    if (!clienteId && !clienteNome) {
      setLoading(false);
      return;
    }

    void carregarHistorico();
  }, [clienteId, clienteNome]);

  useEffect(() => {
    if (!anamneseSelecionadaId) {
      setRespostas([]);
      return;
    }

    void carregarRespostas(anamneseSelecionadaId);
  }, [anamneseSelecionadaId]);

  async function carregarHistorico() {
    setLoading(true);

    let query = supabase
      .from("anamneses_clientes")
      .select("*")
      .order("preenchido_em", { ascending: false });

    query = clienteId
      ? query.eq("cliente_id", clienteId)
      : query.eq("cliente_nome", clienteNome);

    const { data, error } = await query;

    if (error) {
      console.error("Erro ao carregar histórico da anamnese:", error);
      setAnamneses([]);
      setLoading(false);
      return;
    }

    const lista = (data || []) as AnamneseCliente[];
    setAnamneses(lista);
    setAnamneseSelecionadaId(lista[0]?.id || null);
    setLoading(false);
  }

  async function carregarRespostas(anamneseId: string) {
    const { data, error } = await supabase
      .from("anamnese_respostas")
      .select(`
        id,
        resposta,
        anamnese_campos (
          label,
          nome_campo,
          tipo
        )
      `)
      .eq("anamnese_id", anamneseId);

    if (error) {
      console.error("Erro ao carregar respostas da anamnese:", error);
      setRespostas([]);
      return;
    }

    setRespostas((data || []) as unknown as RespostaItem[]);
  }

  function reenviarWhatsapp() {
    if (!anamneseAtual?.pdf_url) {
      alert("PDF não encontrado para esta anamnese.");
      return;
    }

    if (!telefoneCliente) {
      alert("Telefone do cliente não encontrado.");
      return;
    }

    const mensagem = montarMensagemPdfAnamnese({
      cliente: clienteNome || anamneseAtual.cliente_nome || "cliente",
      empresa: empresaNome,
      pdfUrl: anamneseAtual.pdf_url,
    });

    abrirWhatsapp(telefoneCliente, mensagem);
  }

  if (loading) {
    return <p className="text-slate-500">Carregando anamnese...</p>;
  }

  if (!clienteId && !clienteNome) {
    return <p className="text-slate-500">Cliente não identificado.</p>;
  }

  if (anamneses.length === 0) {
    return (
      <div className="rounded-2xl border p-4">
        <p className="font-medium text-slate-900">Histórico da anamnese</p>
        <p className="mt-2 text-slate-500">
          Nenhuma ficha preenchida até o momento.
        </p>
      </div>
    );
  }

  const anamneseAtual =
    anamneses.find((item) => item.id === anamneseSelecionadaId) || null;

  return (
    <div className="space-y-4">
      <div>
        <p className="font-medium text-slate-900">Histórico da anamnese</p>
        <p className="text-sm text-slate-500">
          Visualize as fichas preenchidas pelo cliente.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-[280px_1fr]">
        <div className="space-y-3">
          {anamneses.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setAnamneseSelecionadaId(item.id)}
              className={`w-full rounded-2xl border p-4 text-left ${
                anamneseSelecionadaId === item.id
                  ? "border-slate-900 bg-slate-50"
                  : "border-slate-200"
              }`}
            >
              <p className="font-medium text-slate-900">
                {item.preenchido_em
                  ? new Date(item.preenchido_em).toLocaleString("pt-BR")
                  : "Sem data"}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Status: {item.preenchido ? "Preenchida" : "Pendente"}
              </p>

              <p className="text-sm text-slate-500">
                Termo: {item.aceita_termo ? "Aceito" : "Não aceito"}
              </p>
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-slate-200 p-4 space-y-4">
          {anamneseAtual && (
            <div className="space-y-1 border-b pb-4">
              <p className="text-sm text-slate-600">
                <strong>Preenchido em:</strong>{" "}
                {anamneseAtual.preenchido_em
                  ? new Date(anamneseAtual.preenchido_em).toLocaleString("pt-BR")
                  : "Não informado"}
              </p>

              <p className="text-sm text-slate-600">
                <strong>Hash:</strong>{" "}
                {anamneseAtual.hash_assinatura || "Não informado"}
              </p>

              <p className="text-sm text-slate-600">
                <strong>IP:</strong>{" "}
                {anamneseAtual.ip_assinatura || "Não informado"}
              </p>

              <p className="text-sm text-slate-600">
                <strong>Assinado em:</strong>{" "}
                {anamneseAtual.assinado_em
                  ? new Date(anamneseAtual.assinado_em).toLocaleString("pt-BR")
                  : "Não informado"}
              </p>

              <div className="flex flex-wrap gap-3 pt-3">
                {anamneseAtual.pdf_url && (
                  <a
                    href={anamneseAtual.pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    📄 Ver PDF da Anamnese
                  </a>
                )}

                {anamneseAtual.pdf_url && (
                  <button
                    type="button"
                    onClick={reenviarWhatsapp}
                    className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                  >
                    💬 Reenviar no WhatsApp
                  </button>
                )}
              </div>
            </div>
          )}

          {respostas.length === 0 ? (
            <p className="text-slate-500">Nenhuma resposta encontrada.</p>
          ) : (
            <div className="space-y-4">
              {respostas.map((item) => {
                const campo = item.anamnese_campos?.[0];

                return (
                  <div
                    key={item.id}
                    className="border-b pb-3 last:border-b-0"
                  >
                    <p className="font-medium text-slate-900">
                      {campo?.label || campo?.nome_campo || "Campo"}
                    </p>

                    <p className="mt-1 whitespace-pre-line text-slate-600">
                      {item.resposta || "Sem resposta"}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {anamneseAtual?.assinatura_base64 && (
            <div className="pt-2">
              <p className="mb-2 font-medium text-slate-900">
                Assinatura
              </p>

              <img
                src={anamneseAtual.assinatura_base64}
                alt="Assinatura do cliente"
                className="max-h-36 rounded-xl border bg-white p-2"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}