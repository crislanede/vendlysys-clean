import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { abrirWhatsapp } from "../lib/whatsapp";

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
  titulo?: string | null;
  conteudo?: string | null;
  mensagem?: string | null;
  texto?: string | null;
  corpo?: string | null;
  ativo?: boolean;
  criado_em?: string;
  atualizado_em?: string;
};

function obterConteudoModelo(modelo?: ModeloMensagem | null) {
  return (
    modelo?.conteudo ||
    modelo?.mensagem ||
    modelo?.texto ||
    modelo?.corpo ||
    ""
  );
}

function montarLinkMeuEspaco(token?: string | null) {
  if (!token) {
    return `${window.location.origin}/meu-espaco`;
  }

  return `${window.location.origin}/meu-espaco?token=${token}`;
}

function substituirVariaveis(
  texto?: string | null,
  dados: {
    cliente?: string;
    empresa?: string;
    link_meu_espaco?: string;
  } = {},
) {
  const mensagem = texto ?? "";

  return mensagem
    .replaceAll("{{cliente}}", dados.cliente || "")
    .replaceAll("{cliente}", dados.cliente || "")
    .replaceAll("{{empresa}}", dados.empresa || "")
    .replaceAll("{empresa}", dados.empresa || "")
    .replaceAll("{{link_meu_espaco}}", dados.link_meu_espaco || "")
    .replaceAll("{link_meu_espaco}", dados.link_meu_espaco || "");
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

    const modelosNormalizados = ((data || []) as ModeloMensagem[]).map((modelo) => ({
      ...modelo,
      titulo: modelo.titulo || modelo.nome || "",
      conteudo: obterConteudoModelo(modelo),
    }));

    setModelos(modelosNormalizados);
    setCarregandoModelos(false);
  }

  function selecionarModelo(modeloId: string) {
    setModeloSelecionadoId(modeloId);

    const modelo = modelos.find((m) => m.id === modeloId);
    if (!modelo) return;

    setNovoModeloNome(modelo.nome || "");
    setTitulo(modelo.titulo || modelo.nome || "");
    setConteudo(obterConteudoModelo(modelo));
  }

  async function buscarTokenMeuEspaco(clienteId: string) {
    const { data, error } = await supabase
      .from("agendamentos")
      .select("token_cliente, token, created_at")
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
      alert(`Erro ao salvar modelo: ${error.message}`);
      setSalvandoModelo(false);
      return;
    }

    setModelos((atual) =>
      [...atual, data as ModeloMensagem].sort((a, b) =>
        a.nome.localeCompare(b.nome),
      ),
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
      alert(`Erro ao atualizar modelo: ${error.message}`);
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
      alert(`Erro ao inativar modelo: ${error.message}`);
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

    const modeloSelecionado = modelos.find((m) => m.id === modeloSelecionadoId);
    const tituloEfetivo = titulo || modeloSelecionado?.titulo || modeloSelecionado?.nome || "";
    const conteudoEfetivo = conteudo || obterConteudoModelo(modeloSelecionado);

    if (!tituloEfetivo.trim() || !conteudoEfetivo.trim()) {
      alert("Preencha título e conteúdo.");
      return;
    }

    const token = await buscarTokenMeuEspaco(clienteSelecionado.id);
    const linkMeuEspaco = montarLinkMeuEspaco(token);

    const mensagemFinal = substituirVariaveis(conteudoEfetivo, {
      cliente: clienteSelecionado.nome,
      empresa: nomeEmpresa,
      link_meu_espaco: linkMeuEspaco,
    });

    abrirWhatsapp(clienteSelecionado.telefone, mensagemFinal);

    await supabase.from("whatsapp_logs").insert([
      {
        cliente_id: clienteSelecionado.id,
        cliente: clienteSelecionado.nome,
        telefone: clienteSelecionado.telefone,
        mensagem: mensagemFinal,
        tipo: "campanha",
        status: "enviado",
      },
    ]);
  }

  const preview = substituirVariaveis(conteudo || obterConteudoModelo(modelos.find((m) => m.id === modeloSelecionadoId)), {
    cliente: clienteSelecionado?.nome || "Cliente",
    empresa: nomeEmpresa,
    link_meu_espaco: montarLinkMeuEspaco("token-do-cliente"),
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
            placeholder="Use variáveis como {cliente}, {empresa} e {link_meu_espaco}"
          />
          <p className="mt-2 text-xs text-slate-500">
            Variáveis disponíveis: {"{cliente}"}, {"{empresa}"} e{" "}
            {"{link_meu_espaco}"}
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
