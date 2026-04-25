import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { abrirWhatsapp, montarMensagemCampanha } from "../lib/whatsapp";

type Cliente = {
  id: string;
  nome: string;
  telefone: string;
};

type Configuracao = {
  nome_empresa?: string | null;
  nome_fantasia?: string | null;
};

type ModeloMensagem = {
  id: string;
  nome: string;
  titulo: string;
  conteudo: string;
  ativo?: boolean;
  criado_em?: string;
  atualizado_em?: string;
};

function substituirVariaveis(
  texto: string,
  dados: {
    cliente?: string;
    empresa?: string;
  }
) {
  return texto
    .replaceAll("{cliente}", dados.cliente || "")
    .replaceAll("{empresa}", dados.empresa || "");
}

export default function WhatsappCampanhaPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteSelecionadoId, setClienteSelecionadoId] = useState("");
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);

  const [configuracao, setConfiguracao] = useState<Configuracao | null>(null);

  const [modelos, setModelos] = useState<ModeloMensagem[]>([]);
  const [modeloSelecionadoId, setModeloSelecionadoId] = useState("");

  const [titulo, setTitulo] = useState("");
  const [conteudo, setConteudo] = useState("");

  const [novoModeloNome, setNovoModeloNome] = useState("");
  const [salvandoModelo, setSalvandoModelo] = useState(false);
  const [carregandoModelos, setCarregandoModelos] = useState(true);

  const nomeEmpresa = useMemo(() => {
    return (
      configuracao?.nome_fantasia ||
      configuracao?.nome_empresa ||
      "Seu estabelecimento"
    );
  }, [configuracao]);

  useEffect(() => {
    void carregarClientes();
    void carregarConfiguracao();
    void carregarModelos();
  }, []);

  useEffect(() => {
    const cliente = clientes.find((c) => c.id === clienteSelecionadoId) || null;
    setClienteSelecionado(cliente);
  }, [clienteSelecionadoId, clientes]);

  async function carregarClientes() {
    const { data, error } = await supabase
      .from("clientes")
      .select("id, nome, telefone")
      .order("nome", { ascending: true });

    if (error) {
      console.error("Erro ao carregar clientes:", error);
      return;
    }

    setClientes((data || []) as Cliente[]);
  }

  async function carregarConfiguracao() {
    const { data, error } = await supabase
      .from("configuracoes")
      .select("nome_empresa, nome_fantasia")
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Erro ao carregar configurações:", error);
      return;
    }

    setConfiguracao((data || null) as Configuracao | null);
  }

  async function carregarModelos() {
    setCarregandoModelos(true);

    const { data, error } = await supabase
      .from("whatsapp_modelos")
      .select("*")
      .eq("ativo", true)
      .order("nome", { ascending: true });

    if (error) {
      console.error("Erro ao carregar modelos:", error);
      setCarregandoModelos(false);
      return;
    }

    setModelos((data || []) as ModeloMensagem[]);
    setCarregandoModelos(false);
  }

  function selecionarModelo(modeloId: string) {
    setModeloSelecionadoId(modeloId);

    const modelo = modelos.find((m) => m.id === modeloId);
    if (!modelo) return;

    setNovoModeloNome(modelo.nome);
    setTitulo(modelo.titulo);
    setConteudo(modelo.conteudo);
  }

  async function salvarNovoModelo() {
    if (!novoModeloNome.trim()) {
      alert("Informe o nome do modelo.");
      return;
    }

    if (!titulo.trim() || !conteudo.trim()) {
      alert("Preencha título e conteúdo antes de salvar o modelo.");
      return;
    }

    setSalvandoModelo(true);

    const payload = {
      nome: novoModeloNome.trim(),
      titulo: titulo.trim(),
      conteudo: conteudo.trim(),
      ativo: true,
    };

    const { data, error } = await supabase
      .from("whatsapp_modelos")
      .insert([payload])
      .select("*")
      .single();

    if (error) {
      console.error("Erro ao salvar modelo:", error);
      alert("Erro ao salvar modelo.");
      setSalvandoModelo(false);
      return;
    }

    setModelos((atual) =>
      [...atual, data as ModeloMensagem].sort((a, b) =>
        a.nome.localeCompare(b.nome)
      )
    );
    setModeloSelecionadoId(data.id);
    alert("Modelo salvo com sucesso.");
    setSalvandoModelo(false);
  }

  async function atualizarModeloSelecionado() {
    if (!modeloSelecionadoId) {
      alert("Selecione um modelo para atualizar.");
      return;
    }

    if (!novoModeloNome.trim()) {
      alert("Informe o nome do modelo.");
      return;
    }

    if (!titulo.trim() || !conteudo.trim()) {
      alert("Preencha título e conteúdo.");
      return;
    }

    const { error } = await supabase
      .from("whatsapp_modelos")
      .update({
        nome: novoModeloNome.trim(),
        titulo: titulo.trim(),
        conteudo: conteudo.trim(),
      })
      .eq("id", modeloSelecionadoId);

    if (error) {
      console.error("Erro ao atualizar modelo:", error);
      alert("Erro ao atualizar modelo.");
      return;
    }

    await carregarModelos();
    alert("Modelo atualizado com sucesso.");
  }

  async function inativarModeloSelecionado() {
    if (!modeloSelecionadoId) {
      alert("Selecione um modelo para excluir.");
      return;
    }

    const confirmar = window.confirm("Deseja inativar este modelo?");
    if (!confirmar) return;

    const { error } = await supabase
      .from("whatsapp_modelos")
      .update({ ativo: false })
      .eq("id", modeloSelecionadoId);

    if (error) {
      console.error("Erro ao inativar modelo:", error);
      alert("Erro ao inativar modelo.");
      return;
    }

    setModeloSelecionadoId("");
    setNovoModeloNome("");
    setTitulo("");
    setConteudo("");
    await carregarModelos();
    alert("Modelo inativado com sucesso.");
  }

  async function enviarCampanha() {
    if (!clienteSelecionado) {
      alert("Selecione um cliente.");
      return;
    }

    if (!clienteSelecionado.telefone) {
      alert("Esse cliente não possui telefone cadastrado.");
      return;
    }

    if (!titulo.trim() || !conteudo.trim()) {
      alert("Preencha título e conteúdo.");
      return;
    }

    const descricaoFinal = substituirVariaveis(conteudo, {
      cliente: clienteSelecionado.nome,
      empresa: nomeEmpresa,
    });

    const mensagem = montarMensagemCampanha({
      cliente: clienteSelecionado.nome,
      titulo: titulo.trim(),
      descricao: descricaoFinal,
      empresa: nomeEmpresa,
    });

    abrirWhatsapp(clienteSelecionado.telefone, mensagem);

    await supabase.from("whatsapp_logs").insert([
      {
        cliente_id: clienteSelecionado.id,
        cliente: clienteSelecionado.nome,
        telefone: clienteSelecionado.telefone,
        mensagem,
        tipo: "campanha",
        status: "enviado",
      },
    ]);
  }

  const preview = substituirVariaveis(conteudo, {
    cliente: clienteSelecionado?.nome || "Cliente",
    empresa: nomeEmpresa,
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-orange-500">Comunicação</p>
        <h1 className="text-3xl font-bold text-slate-900">Campanhas WhatsApp</h1>
        <p className="text-slate-500">
          Use modelos prontos, edite antes do envio ou salve novos modelos.
        </p>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-slate-600">Cliente</label>
            <select
              value={clienteSelecionadoId}
              onChange={(e) => setClienteSelecionadoId(e.target.value)}
              className="w-full rounded-lg border p-2"
            >
              <option value="">Selecione um cliente</option>
              {clientes.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-600">
              Modelo de mensagem
            </label>
            <select
              value={modeloSelecionadoId}
              onChange={(e) => selecionarModelo(e.target.value)}
              className="w-full rounded-lg border p-2"
            >
              <option value="">
                {carregandoModelos ? "Carregando modelos..." : "Selecione um modelo"}
              </option>
              {modelos.map((modelo) => (
                <option key={modelo.id} value={modelo.id}>
                  {modelo.nome}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
          <div>
            <label className="mb-1 block text-sm text-slate-600">
              Nome do modelo
            </label>
            <input
              value={novoModeloNome}
              onChange={(e) => setNovoModeloNome(e.target.value)}
              className="w-full rounded-lg border p-2"
              placeholder="Ex.: Promoção de retorno"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-600">
              Título da mensagem
            </label>
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="w-full rounded-lg border p-2"
              placeholder="Ex.: Promoção especial"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-600">
            Conteúdo da mensagem
          </label>
          <textarea
            value={conteudo}
            onChange={(e) => setConteudo(e.target.value)}
            className="min-h-[180px] w-full rounded-lg border p-3"
            placeholder="Use variáveis como {cliente} e {empresa}"
          />
          <p className="mt-2 text-xs text-slate-500">
            Variáveis disponíveis: {"{cliente}"} e {"{empresa}"}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={salvarNovoModelo}
            disabled={salvandoModelo}
            className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white disabled:opacity-60"
          >
            {salvandoModelo ? "Salvando..." : "Salvar novo modelo"}
          </button>

          <button
            type="button"
            onClick={atualizarModeloSelecionado}
            className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white"
          >
            Atualizar modelo
          </button>

          <button
            type="button"
            onClick={inativarModeloSelecionado}
            className="rounded-xl bg-red-600 px-5 py-3 font-semibold text-white"
          >
            Excluir modelo
          </button>
        </div>

        <div className="rounded-2xl border p-4">
          <p className="mb-2 text-sm font-medium text-slate-600">Prévia</p>
          <div className="whitespace-pre-line rounded-xl bg-slate-50 p-4 text-slate-800">
            {titulo ? `*${titulo}*\n\n` : ""}
            {preview || "Sua mensagem aparecerá aqui."}
          </div>
        </div>

        <div>
          <button
            type="button"
            onClick={enviarCampanha}
            className="rounded-xl bg-green-600 px-6 py-3 font-semibold text-white"
          >
            Enviar WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}