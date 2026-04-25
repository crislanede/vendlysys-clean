import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  abrirWhatsapp,
  montarMensagemConfirmacao,
  montarMensagemLembreteAgendamento,
  montarMensagemCancelamento,
  montarMensagemAgradecimento,
} from "../lib/whatsapp";

type Agendamento = {
  id: string;
  cliente: string;
  telefone: string;
  servico: string;
  profissional: string;
  data: string;
  horario: string;
};

export default function Whatsapp() {
  const [lista, setLista] = useState<Agendamento[]>([]);
  const [tipoMensagem, setTipoMensagem] = useState("confirmacao");
  const [busca, setBusca] = useState("");

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    const { data, error } = await supabase
      .from("agendamentos")
      .select("*")
      .order("data", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    setLista(data || []);
  }

  async function enviar(ag: Agendamento) {
    let mensagem = "";

    const dados = {
      empresa: "Seu estabelecimento",
      cliente: ag.cliente,
      servico: ag.servico,
      profissional: ag.profissional,
      data: ag.data,
      hora: ag.horario,
    };

    if (tipoMensagem === "confirmacao") {
      mensagem = await montarMensagemConfirmacao(dados);
    }

    if (tipoMensagem === "lembrete") {
      mensagem = await montarMensagemLembreteAgendamento(dados);
    }

    if (tipoMensagem === "cancelamento") {
      mensagem = await montarMensagemCancelamento(dados);
    }

    if (tipoMensagem === "agradecimento") {
      mensagem = await montarMensagemAgradecimento(dados);
    }

    abrirWhatsapp(ag.telefone, mensagem);
  }

  const filtrados = lista.filter((item) =>
    `${item.cliente} ${item.servico} ${item.profissional}`
      .toLowerCase()
      .includes(busca.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-purple-600 font-bold uppercase">
          Comunicação
        </p>
        <h1 className="text-2xl font-bold">WhatsApp</h1>
        <p className="text-sm text-gray-500">
          Envie mensagens automáticas para seus clientes
        </p>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl p-4 shadow">
        <h2 className="font-semibold mb-2">Filtros</h2>

        <div className="flex gap-2">
          <input
            className="border rounded px-3 py-2 w-full"
            placeholder="Pesquisar por cliente, serviço ou profissional"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />

          <select
            className="border rounded px-3 py-2"
            value={tipoMensagem}
            onChange={(e) => setTipoMensagem(e.target.value)}
          >
            <option value="confirmacao">Confirmação</option>
            <option value="lembrete">Lembrete</option>
            <option value="cancelamento">Cancelamento</option>
            <option value="agradecimento">Agradecimento</option> {/* ✅ NOVO */}
          </select>
        </div>
      </div>

      {/* Lista */}
      <div className="bg-white rounded-xl p-4 shadow">
        <h2 className="font-semibold mb-4">
          Agendamentos ({filtrados.length})
        </h2>

        <div className="space-y-3">
          {filtrados.map((ag) => (
            <div
              key={ag.id}
              className="flex items-center justify-between border rounded-lg p-3"
            >
              <div>
                <p className="font-semibold">{ag.cliente}</p>
                <p className="text-sm text-gray-500">
                  {ag.servico} • {ag.profissional}
                </p>
                <p className="text-xs text-gray-400">
                  {ag.data} às {ag.horario}
                </p>
              </div>

              <button
                onClick={() => enviar(ag)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm"
              >
                Enviar WhatsApp
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}