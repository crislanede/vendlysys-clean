import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useEmpresa } from "../hooks/useEmpresa";
import {
  mensagensWhatsappPadrao,
  salvarMensagemWhatsapp,
  type TipoMensagemWhatsapp,
} from "../lib/whatsapp";

export default function WhatsappMensagens() {
  const { empresaId } = useEmpresa();

  const [tipo, setTipo] =
    useState<TipoMensagemWhatsapp>("confirmacao_agendamento");
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    carregar();
  }, [tipo, empresaId]);

  async function carregar() {
    if (!empresaId) return;

    const { data } = await supabase
      .from("whatsapp_mensagens")
      .select("*")
      .eq("empresa_id", empresaId)
      .eq("tipo", tipo)
      .maybeSingle();

    setMensagem(data?.mensagem || mensagensWhatsappPadrao[tipo]);
  }

  async function salvar() {
    if (!empresaId) {
      alert("Empresa não encontrada.");
      return;
    }

    await salvarMensagemWhatsapp({
      empresaId,
      tipo,
      mensagem,
    });

    alert("Mensagem salva!");
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <p
          style={{ color: "var(--cor-primaria, #4b2f3f)" }}
          className="text-sm font-bold uppercase"
        >
          Comunicação
        </p>

        <h1 className="text-2xl font-bold">Mensagens WhatsApp</h1>
      </div>

      <select
        value={tipo}
        onChange={(e) => setTipo(e.target.value as TipoMensagemWhatsapp)}
        className="border rounded px-3 py-2"
      >
        <option value="confirmacao_agendamento">Confirmação</option>
        <option value="lembrete_agendamento">Lembrete</option>
        <option value="cancelamento_agendamento">Cancelamento</option>
        <option value="agradecimento_atendimento">Agradecimento</option>
        <option value="pdf_anamnese">PDF Anamnese</option>
        <option value="novo_agendamento_cliente">Novo agendamento</option>
        <option value="reagendamento_agendamento">Reagendamento</option>
        <option value="campanha">Campanha</option>
      </select>

      <textarea
        value={mensagem}
        onChange={(e) => setMensagem(e.target.value)}
        className="w-full border rounded p-3 min-h-[220px]"
      />

      <button
        onClick={salvar}
        style={{ backgroundColor: "var(--cor-primaria, #4b2f3f)" }}
        className="text-white px-5 py-3 rounded font-bold"
      >
        Salvar
      </button>
    </div>
  );
}