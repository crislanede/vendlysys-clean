import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { abrirWhatsapp } from "../lib/whatsapp";
import { useEmpresa } from "../hooks/useEmpresa";

type Agendamento = {
  id: string;
  cliente: string;
  telefone: string;
  servico: string;
  profissional: string;
  data: string;
  horario: string;
  valor?: number | null;
};

const mapaTipos: Record<string, string> = {
  confirmacao: "confirmacao_agendamento",
  lembrete: "lembrete_agendamento",
  cancelamento: "cancelamento_agendamento",
  agradecimento: "agradecimento_atendimento",
};

export default function Whatsapp() {
  const { empresaId, carregandoEmpresa } = useEmpresa();

  const [empresaNome, setEmpresaNome] = useState("");
  const [lista, setLista] = useState<Agendamento[]>([]);
  const [tipoMensagem, setTipoMensagem] = useState("confirmacao");
  const [busca, setBusca] = useState("");

  useEffect(() => {
    if (empresaId) {
      carregar();
      carregarEmpresa();
    }
  }, [empresaId]);

  async function carregarEmpresa() {
    const { data } = await supabase
      .from("empresas")
      .select("nome")
      .eq("id", empresaId)
      .maybeSingle();

    setEmpresaNome(data?.nome || "VendlySys");
  }

  async function carregar() {
    const { data, error } = await supabase
      .from("agendamentos")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("data", { ascending: false });

    if (error) {
      alert("Erro ao carregar agendamentos: " + error.message);
      return;
    }

    setLista(data || []);
  }

  function formatarData(data: string) {
    if (!data) return "";
    return new Date(data + "T00:00:00").toLocaleDateString("pt-BR");
  }

  async function buscarModelo(tipo: string) {
    const tipoBanco = mapaTipos[tipo];

    const { data, error } = await supabase
      .from("whatsapp_mensagens")
      .select("*")
      .eq("empresa_id", empresaId)
      .eq("tipo", tipoBanco)
      .eq("ativo", true)
      .maybeSingle();

    if (error) {
      alert("Erro ao buscar mensagem: " + error.message);
      return null;
    }

    return data?.mensagem || null;
  }

  function aplicarVariaveis(modelo: string, ag: Agendamento) {
    return modelo
      .replaceAll("{{cliente}}", ag.cliente || "")
      .replaceAll("{{empresa}}", empresaNome || "")
      .replaceAll("{{profissional}}", ag.profissional || "")
      .replaceAll("{{servico}}", ag.servico || "")
      .replaceAll("{{data}}", formatarData(ag.data))
      .replaceAll("{{horario}}", ag.horario || "")
      .replaceAll("{{hora}}", ag.horario || "")
      .replaceAll("{{valor}}", Number(ag.valor || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      }))
      .replaceAll("{{link_meu_espaco}}", `${window.location.origin}/meu-espaco`)
      .replaceAll("{{telefone_empresa}}", "");
  }

  async function enviar(ag: Agendamento) {
    const modelo = await buscarModelo(tipoMensagem);

    if (!modelo) {
      alert("Mensagem não encontrada. Vá em Mensagens WhatsApp e clique em Criar padrões.");
      return;
    }

    const mensagemFinal = aplicarVariaveis(modelo, ag);

    abrirWhatsapp(ag.telefone, mensagemFinal);
  }

  const filtrados = lista.filter((item) =>
    `${item.cliente} ${item.servico} ${item.profissional}`
      .toLowerCase()
      .includes(busca.toLowerCase())
  );

  if (carregandoEmpresa) {
    return <div className="p-6">Carregando empresa...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <p className="text-sm font-bold text-pink-600 uppercase">
          Comunicação
        </p>
        <h1 className="text-3xl font-bold text-slate-900">WhatsApp</h1>
        <p className="text-slate-500">
          Envie mensagens usando os modelos configurados para {empresaNome}.
        </p>
      </div>

      <div className="bg-white rounded-2xl border p-4 shadow-sm">
        <h2 className="font-semibold mb-3">Filtros</h2>

        <div className="flex flex-wrap gap-3">
          <input
            className="border rounded-xl px-4 py-3 flex-1 min-w-[260px]"
            placeholder="Pesquisar por cliente, serviço ou profissional"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />

          <select
            className="border rounded-xl px-4 py-3"
            value={tipoMensagem}
            onChange={(e) => setTipoMensagem(e.target.value)}
          >
            <option value="confirmacao">Confirmação</option>
            <option value="lembrete">Lembrete</option>
            <option value="cancelamento">Cancelamento</option>
            <option value="agradecimento">Agradecimento</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border p-4 shadow-sm">
        <h2 className="font-semibold mb-4">
          Agendamentos ({filtrados.length})
        </h2>

        <div className="space-y-3">
          {filtrados.map((ag) => (
            <div
              key={ag.id}
              className="flex items-center justify-between border rounded-2xl p-4"
            >
              <div>
                <p className="font-semibold text-slate-900">{ag.cliente}</p>
                <p className="text-sm text-slate-500">
                  {ag.servico} • {ag.profissional}
                </p>
                <p className="text-xs text-slate-400">
                  {formatarData(ag.data)} às {ag.horario}
                </p>
              </div>

              <button
                onClick={() => enviar(ag)}
                className="bg-green-600 text-white px-5 py-3 rounded-xl text-sm font-bold"
              >
                Enviar WhatsApp
              </button>
            </div>
          ))}

          {filtrados.length === 0 && (
            <p className="text-center text-slate-400 py-8">
              Nenhum agendamento encontrado.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}