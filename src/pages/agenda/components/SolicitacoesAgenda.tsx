import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { montarLinkWhatsapp } from "../../../lib/whatsapp";
import PrimaryButton from "../../../components/ui/PrimaryButton";
import SecondaryButton from "../../../components/ui/SecondaryButton";
import { formatarData } from "../utils";

type Solicitacao = {
  id: string;
  cliente_nome: string;
  telefone: string;
  servicos_nome: string;
  profissional_nome: string;
  data: string;
  horario: string;
  valor: number;
};

type Props = {
  empresaId: string;
  slug?: string | null;
  aoAprovar: (data: string) => void;
};

export default function SolicitacoesAgenda({ empresaId, slug, aoAprovar }: Props) {
  const [lista, setLista] = useState<Solicitacao[]>([]);
  const [pronto, setPronto] = useState(false);
  const [decidindo, setDecidindo] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  const [resposta, setResposta] = useState<{ texto: string; link: string | null } | null>(null);
  const [copiado, setCopiado] = useState(false);
  const linkPublico = slug && new URL(`/agendar/${encodeURIComponent(slug)}`, window.location.origin).href;

  useEffect(() => {
    let vigente = true;
    async function atualizarPendentes() {
      const { data, error } = await supabase.rpc("agendamento_publico_pendentes", { p_empresa: empresaId });
      if (!vigente) return;
      if (error) {
        setErro("Não foi possível carregar as solicitações nesta versão.");
        return;
      }
      setPronto(true);
      setLista((data || []) as Solicitacao[]);
    }
    void atualizarPendentes();
    const timer = window.setInterval(() => void atualizarPendentes(), 25_000);
    return () => { vigente = false; window.clearInterval(timer); };
  }, [empresaId]);

  async function decidir(item: Solicitacao, aprovar: boolean) {
    if (decidindo) return;
    setDecidindo(item.id);
    setErro("");
    setResposta(null);
    try {
      const { data, error } = await supabase.rpc("agendamento_publico_decidir", {
        p_id: item.id,
        p_aprovar: aprovar,
      });
      if (error || (aprovar && !data)) {
        setErro(error?.code === "22023" ? error.message : "Não foi possível responder à solicitação.");
        return;
      }

      setLista((atual) => atual.filter((solicitacao) => solicitacao.id !== item.id));
      const detalhes = `${item.servicos_nome}, em ${formatarData(item.data)} às ${item.horario.slice(0, 5)}.`;
      const mensagem = aprovar
        ? `Olá, ${item.cliente_nome}! Seu horário está confirmado para ${detalhes}`
        : `Olá, ${item.cliente_nome}! Não conseguimos confirmar sua solicitação para ${detalhes} Podemos combinar outro horário por aqui.`;
      setResposta({
        texto: aprovar ? "Agendamento confirmado na Agenda." : "Solicitação recusada.",
        link: montarLinkWhatsapp(`+${item.telefone}`, mensagem),
      });
      if (aprovar) aoAprovar(item.data);
    } catch {
      setErro("Não foi possível responder à solicitação. Tente novamente.");
    } finally {
      setDecidindo(null);
    }
  }

  async function copiarLink() {
    if (!linkPublico) return;
    try {
      await navigator.clipboard.writeText(linkPublico);
      setCopiado(true);
    } catch {
      setErro("Não foi possível copiar. Selecione e copie o endereço do link público.");
    }
  }

  return (
    <section aria-labelledby="solicitacoes-agenda" className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="solicitacoes-agenda" className="text-lg font-bold text-slate-900">Solicitações pendentes</h2>
        {pronto && linkPublico && (
          <div className="flex flex-wrap items-center gap-2">
            <a href={linkPublico} target="_blank" rel="noopener noreferrer" className="px-2 text-sm font-semibold underline">Abrir link público</a>
            <SecondaryButton onClick={() => void copiarLink()}>{copiado ? "Link copiado" : "Copiar link"}</SecondaryButton>
          </div>
        )}
      </div>
      {erro && <p role="alert" className="mt-3 text-sm text-red-800">{erro}</p>}
      {resposta && (
        <div role="status" className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-950">
          <p>{resposta.texto}</p>
          {resposta.link && <a href={resposta.link} target="_blank" rel="noopener noreferrer" className="font-bold underline">Responder pelo WhatsApp</a>}
        </div>
      )}
      {pronto && !lista.length && <p className="mt-2 text-sm text-slate-600">Nenhuma solicitação pendente.</p>}
      {lista.length > 0 && (
        <ul className="mt-3 divide-y divide-slate-100">
          {lista.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0 text-sm">
                <p className="break-words font-bold text-slate-900">{item.cliente_nome} · +{item.telefone}</p>
                <p className="text-slate-700">{item.servicos_nome} · {item.profissional_nome}</p>
                <p className="text-slate-600">{formatarData(item.data)} às {item.horario.slice(0, 5)} · {Number(item.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <SecondaryButton disabled={!!decidindo} onClick={() => void decidir(item, false)}>Recusar</SecondaryButton>
                <PrimaryButton disabled={!!decidindo} onClick={() => void decidir(item, true)}>
                  {decidindo === item.id ? "Salvando..." : "Aprovar"}
                </PrimaryButton>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
