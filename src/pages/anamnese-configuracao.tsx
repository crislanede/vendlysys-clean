import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { useEmpresa } from "../hooks/useEmpresa";
import {
  baixarModeloExcelAnamnese,
  lerModeloExcelAnamnese,
} from "../lib/anamneseExcel";

type Campo = {
  id: string;
  modelo_id?: string;
  nome_campo: string;
  label: string;
  tipo: string;
  obrigatorio: boolean;
  placeholder: string;
  ajuda: string;
  opcoes: string[];
  ordem: number;
  ativo: boolean;
  gera_alerta: boolean;
};

type Modelo = {
  id: string;
  empresa_id?: string | null;
  nome?: string | null;
  titulo?: string | null;
  descricao: string | null;
  termo_responsabilidade?: string | null;
  obrigatoria?: boolean | null;
  obrigatorio?: boolean | null;
  ativo: boolean;
};

const campoVazio = (ordem = 0, modeloId?: string | null): Campo => ({
  id: crypto.randomUUID(),
  modelo_id: modeloId || undefined,
  nome_campo: "",
  label: "",
  tipo: "text",
  obrigatorio: false,
  placeholder: "",
  ajuda: "",
  opcoes: [],
  ordem,
  ativo: true,
  gera_alerta: false,
});

export default function AnamneseConfiguracao() {
  const { empresaId: empresaIdAtiva, carregandoEmpresa } = useEmpresa();

  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [modeloId, setModeloId] = useState<string | null>(null);
  const [empresaId, setEmpresaId] = useState<string | null>(null);

  const [titulo, setTitulo] = useState("Ficha de Anamnese");
  const [descricao, setDescricao] = useState("");
  const [termoResponsabilidade, setTermoResponsabilidade] = useState("");
  const [obrigatoria, setObrigatoria] = useState(true);
  const [ativo, setAtivo] = useState(true);

  const [campos, setCampos] = useState<Campo[]>([]);
  const [modalCampoAberto, setModalCampoAberto] = useState(false);
  const [campoModal, setCampoModal] = useState<Campo>(() => campoVazio(0));
  const [campoEditandoId, setCampoEditandoId] = useState<string | null>(null);

  useEffect(() => {
    if (carregandoEmpresa) return;
    void carregarConfiguracao();
  }, [carregandoEmpresa, empresaIdAtiva]);

  async function resolverEmpresaId() {
    if (empresaIdAtiva) return empresaIdAtiva;

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    if (userId) {
      const { data: usuarioData } = await supabase
        .from("usuarios")
        .select("empresa_id")
        .eq("user_id", userId)
        .maybeSingle();

      if (usuarioData?.empresa_id) return usuarioData.empresa_id as string;

      const { data: empresaData } = await supabase
        .from("empresas")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (empresaData?.id) return empresaData.id as string;
    }

    const { data: configData } = await supabase
      .from("configuracoes")
      .select("empresa_id")
      .limit(1)
      .maybeSingle();

    return (configData?.empresa_id as string | null) || null;
  }

  async function carregarConfiguracao() {
    setLoading(true);

    try {
      const empresaIdAtual = await resolverEmpresaId();
      setEmpresaId(empresaIdAtual);

      if (!empresaIdAtual) {
        console.warn("Empresa não encontrada para carregar a anamnese.");
        setModeloId(null);
        setCampos([]);
        return;
      }

      const { data: modelosData, error: modeloError } = await supabase
        .from("anamnese_modelos")
        .select("*")
        .eq("empresa_id", empresaIdAtual)
        .order("created_at", { ascending: false })
        .limit(1);

      if (modeloError) {
        console.error("Erro ao carregar modelo:", modeloError);
        return;
      }

      const modeloData = modelosData?.[0] || null;

      if (!modeloData) {
        setModeloId(null);
        setTitulo("Ficha de Anamnese");
        setDescricao("");
        setTermoResponsabilidade("");
        setObrigatoria(true);
        setAtivo(true);
        setCampos([]);
        return;
      }

      const modelo = modeloData as Modelo;

      setModeloId(modelo.id);
      setTitulo(modelo.titulo || modelo.nome || "Ficha de Anamnese");
      setDescricao(modelo.descricao || "");
      setTermoResponsabilidade(modelo.termo_responsabilidade || "");
      setObrigatoria(Boolean(modelo.obrigatoria ?? modelo.obrigatorio ?? true));
      setAtivo(Boolean(modelo.ativo));

      const { data: camposData, error: camposError } = await supabase
        .from("anamnese_campos")
        .select("*")
        .eq("modelo_id", modelo.id)
        .order("ordem", { ascending: true });

      if (camposError) {
        console.error("Erro ao carregar campos:", camposError);
        setCampos([]);
        return;
      }

      const carregados = ((camposData || []) as any[]).map((campo, index) => {
        const pergunta = campo.label || campo.pergunta || `Pergunta ${index + 1}`;

        return {
          id: campo.id,
          modelo_id: campo.modelo_id,
          nome_campo:
            campo.nome_campo ||
            normalizarNomeCampo(pergunta, `campo_${index + 1}`),
          label: pergunta,
          tipo: campo.tipo || "text",
          obrigatorio: Boolean(campo.obrigatorio),
          placeholder: campo.placeholder || "",
          ajuda: campo.ajuda || "",
          opcoes: Array.isArray(campo.opcoes) ? campo.opcoes : [],
          ordem: typeof campo.ordem === "number" ? campo.ordem : index,
          ativo: campo.ativo !== false,
          gera_alerta: campo.gera_alerta === true,
        };
      });

      setCampos(carregados);
    } catch (error) {
      console.error("Erro geral ao carregar configuração:", error);
    } finally {
      setLoading(false);
    }
  }

  function abrirModalNovoCampo() {
    setCampoEditandoId(null);
    setCampoModal(campoVazio(campos.length, modeloId));
    setModalCampoAberto(true);
  }

  function abrirModalEditarCampo(campo: Campo) {
    setCampoEditandoId(campo.id);
    setCampoModal({ ...campo, opcoes: [...(campo.opcoes || [])] });
    setModalCampoAberto(true);
  }

  function salvarCampoModal() {
    const pergunta = campoModal.label.trim();
    const nomeInterno = normalizarNomeCampo(campoModal.nome_campo, pergunta);

    if (!pergunta) {
      alert("Preencha a pergunta do campo.");
      return;
    }

    if (!nomeInterno) {
      alert("Preencha o nome interno do campo.");
      return;
    }

    const duplicado = campos.some(
      (campo) =>
        campo.id !== campoEditandoId &&
        campo.nome_campo.trim().toLowerCase() === nomeInterno.toLowerCase()
    );

    if (duplicado) {
      alert(`Já existe um campo com o nome interno "${nomeInterno}".`);
      return;
    }

    const campoFinal: Campo = {
      ...campoModal,
      nome_campo: nomeInterno,
      label: pergunta,
      tipo: tipoSeguro(campoModal.tipo),
      placeholder: campoModal.placeholder || "",
      ajuda: campoModal.ajuda || "",
      opcoes:
        tipoSeguro(campoModal.tipo) === "sim_nao_justificativa"
          ? []
          : campoModal.opcoes || [],
      ativo: campoModal.ativo !== false,
      gera_alerta: campoModal.gera_alerta ?? false,
      ordem:
        typeof campoModal.ordem === "number" ? campoModal.ordem : campos.length,
    };

    if (campoEditandoId) {
      setCampos((prev) =>
        prev.map((campo) => (campo.id === campoEditandoId ? campoFinal : campo))
      );
    } else {
      setCampos((prev) => [...prev, { ...campoFinal, ordem: prev.length }]);
    }

    setModalCampoAberto(false);
  }

  function adicionarAvaliacaoProfissional() {
    setCampos((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        modelo_id: modeloId || undefined,
        nome_campo: "avaliacao_profissional",
        label: "Como você avalia o profissional que realizou seu atendimento?",
        tipo: "select",
        obrigatorio: true,
        placeholder: "",
        ajuda: "Essa informação ajuda a empresa a acompanhar a qualidade do atendimento.",
        opcoes: ["Excelente", "Bom", "Regular", "Ruim"],
        ordem: prev.length,
        ativo: true,
        gera_alerta: false,
      },
      {
        id: crypto.randomUUID(),
        modelo_id: modeloId || undefined,
        nome_campo: "comentario_profissional",
        label: "Deseja deixar algum comentário sobre o atendimento?",
        tipo: "textarea",
        obrigatorio: false,
        placeholder: "Digite aqui seu comentário",
        ajuda: "Campo opcional.",
        opcoes: [],
        ordem: prev.length + 1,
        ativo: true,
        gera_alerta: false,
      },
    ]);
  }

 

  function removerCampo(id: string) {
    // Não apagamos do banco para não quebrar respostas antigas.
    // Ao salvar, campos removidos serão apenas marcados como inativos.
    setCampos((prev) =>
      prev
        .map((c) => (c.id === id ? { ...c, ativo: false } : c))
        .map((c, index) => ({ ...c, ordem: index }))
    );
  }

  function reativarCampo(id: string) {
    setCampos((prev) => prev.map((c) => (c.id === id ? { ...c, ativo: true } : c)));
  }

  function exportarExcel() {
    baixarModeloExcelAnamnese();
  }

  async function importarExcel(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const config = await lerModeloExcelAnamnese(file);

      setTitulo(config.titulo);
      setDescricao(config.descricao);
      setTermoResponsabilidade(config.termo_responsabilidade);
      setObrigatoria(config.obrigatoria);

      setCampos((prev) => {
        const atuaisPorNome = new Map(
          prev.map((campo) => [campo.nome_campo.trim().toLowerCase(), campo])
        );

        return config.campos.map((campo, index) => {
          const nomeNormalizado = normalizarNomeCampo(
            campo.nome_campo,
            campo.label || `campo_${index + 1}`
          );
          const existente = atuaisPorNome.get(nomeNormalizado.toLowerCase());

          return {
            id: existente?.id || crypto.randomUUID(),
            modelo_id: existente?.modelo_id || modeloId || undefined,
            nome_campo: nomeNormalizado,
            label: campo.label,
            tipo: campo.tipo,
            obrigatorio: campo.obrigatorio,
            placeholder: campo.placeholder,
            ajuda: campo.ajuda,
            opcoes: campo.opcoes,
            ordem: typeof campo.ordem === "number" ? campo.ordem : index,
            ativo: campo.ativo ?? true,
            gera_alerta: campo.gera_alerta ?? false,
          };
        });
      });

      alert("Modelo importado com sucesso.");
    } catch (error) {
      console.error(error);
      alert("Erro ao importar o Excel da anamnese.");
    } finally {
      event.target.value = "";
    }
  }

  function normalizarNomeCampo(valor: string, fallback: string) {
    const base = (valor || fallback || "campo")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

    return base || "campo";
  }

  function tituloSeguro() {
    return titulo.trim() || "Ficha de Anamnese";
  }

  function tipoSeguro(tipo: string) {
    return tipo?.trim() || "text";
  }

  function perguntaSegura(campo: Campo, index: number) {
    return campo.label.trim() || `Pergunta ${index + 1}`;
  }

  function validarAntesDeSalvar() {
    if (!titulo.trim()) {
      alert("Preencha o título da ficha.");
      return false;
    }

    const camposAtivos = campos.filter((campo) => campo.ativo !== false);

    if (camposAtivos.length === 0) {
      alert("Adicione pelo menos um campo ativo na ficha.");
      return false;
    }

    const vistos = new Set<string>();

    for (const campo of camposAtivos) {
      const pergunta = perguntaSegura(campo, campo.ordem || 0);
      const nomeInterno = normalizarNomeCampo(campo.nome_campo, pergunta);

      if (!nomeInterno) {
        alert("Todos os campos precisam ter Nome interno.");
        return false;
      }

      if (vistos.has(nomeInterno)) {
        alert(`Campo duplicado: ${campo.nome_campo}`);
        return false;
      }

      vistos.add(nomeInterno);

      if (!campo.label.trim()) {
        alert("Todos os campos precisam ter Pergunta.");
        return false;
      }
    }

    return true;
  }

  async function salvarConfiguracao() {
    if (!validarAntesDeSalvar()) return;

    setSalvando(true);

    try {
      const empresaIdParaSalvar = empresaId || (await resolverEmpresaId());

      if (!empresaIdParaSalvar) {
        alert("Não foi possível identificar a empresa para salvar a anamnese.");
        return;
      }

      setEmpresaId(empresaIdParaSalvar);
      let idModelo = modeloId;

      if (!idModelo) {
        const payloadModelo = {
          empresa_id: empresaIdParaSalvar,
          nome: tituloSeguro(),
          titulo: tituloSeguro(),
          descricao: descricao.trim(),
          termo_responsabilidade: termoResponsabilidade.trim(),
          obrigatoria,
          obrigatorio: obrigatoria,
          ativo,
        };

        const { data, error } = await supabase
          .from("anamnese_modelos")
          .insert([payloadModelo])
          .select()
          .single();

        if (error || !data) {
          console.error("Erro ao criar modelo:", error);
          alert("Erro ao salvar configuração da anamnese.");
          return;
        }

        idModelo = data.id;
        setModeloId(idModelo);
      } else {
        const { error } = await supabase
          .from("anamnese_modelos")
          .update({
            empresa_id: empresaIdParaSalvar,
            nome: tituloSeguro(),
            titulo: tituloSeguro(),
            descricao: descricao.trim(),
            termo_responsabilidade: termoResponsabilidade.trim(),
            obrigatoria,
            obrigatorio: obrigatoria,
            ativo,
          })
          .eq("id", idModelo);

        if (error) {
          console.error("Erro ao atualizar modelo:", error);
          alert("Erro ao atualizar configuração da anamnese.");
          return;
        }
      }

      const camposBanco = await supabase
        .from("anamnese_campos")
        .select("id, nome_campo")
        .eq("modelo_id", idModelo);

      if (camposBanco.error) {
        console.error("Erro ao consultar campos existentes:", camposBanco.error);
        alert("Erro ao consultar campos existentes da anamnese.");
        return;
      }

      const existentesPorId = new Set((camposBanco.data || []).map((c: any) => c.id));
      const existentesPorNome = new Map(
        (camposBanco.data || []).map((c: any) => [
          String(c.nome_campo || "").trim().toLowerCase(),
          c.id,
        ])
      );

      const nomesQueContinuam = new Set<string>();

      for (const [index, campo] of campos.entries()) {
        const pergunta = perguntaSegura(campo, index);
        const nomeCampo = normalizarNomeCampo(campo.nome_campo, pergunta);
        const tipo = tipoSeguro(campo.tipo);
        nomesQueContinuam.add(nomeCampo.toLowerCase());

        const payloadCampo = {
          modelo_id: idModelo,
          nome_campo: nomeCampo,
          label: pergunta,
          pergunta,
          tipo,
          obrigatorio: campo.obrigatorio,
          placeholder: campo.placeholder || "",
          ajuda: campo.ajuda || "",
          opcoes: tipo === "sim_nao_justificativa" ? [] : campo.opcoes || [],
          ordem: index,
          ativo: campo.ativo !== false,
          gera_alerta: campo.gera_alerta ?? false,
        };

        const idExistente =
          existentesPorId.has(campo.id)
            ? campo.id
            : existentesPorNome.get(nomeCampo.toLowerCase());

        if (idExistente) {
          const { error } = await supabase
            .from("anamnese_campos")
            .update(payloadCampo)
            .eq("id", idExistente);

          if (error) {
            console.error("Erro ao atualizar campo:", error);
            alert(`Erro ao atualizar o campo: ${pergunta}`);
            return;
          }
        } else {
          const { error } = await supabase
            .from("anamnese_campos")
            .insert([payloadCampo]);

          if (error) {
            console.error("Erro ao inserir campo:", error);
            alert(`Erro ao inserir o campo: ${pergunta}`);
            return;
          }
        }
      }

      // Campos existentes que saíram da tela são apenas desativados.
      // Isso preserva respostas antigas e impede que perguntas antigas virem "novas" por troca de ID.
      for (const campoExistente of camposBanco.data || []) {
        const nome = String((campoExistente as any).nome_campo || "")
          .trim()
          .toLowerCase();

        if (nome && !nomesQueContinuam.has(nome)) {
          const { error } = await supabase
            .from("anamnese_campos")
            .update({ ativo: false })
            .eq("id", (campoExistente as any).id);

          if (error) {
            console.error("Erro ao desativar campo removido:", error);
            alert("Erro ao desativar um campo removido da anamnese.");
            return;
          }
        }
      }

      alert("Configuração da anamnese salva com sucesso.");
      await carregarConfiguracao();
    } catch (error) {
      console.error("Erro geral ao salvar:", error);
      alert("Erro ao salvar configuração da anamnese.");
    } finally {
      setSalvando(false);
    }
  }

  const camposVisiveis = useMemo(
    () => campos.filter((campo) => campo.ativo !== false),
    [campos]
  );

  const camposInativos = useMemo(
    () => campos.filter((campo) => campo.ativo === false),
    [campos]
  );

  if (loading || carregandoEmpresa) {
    return (
      <div className="space-y-6 p-6">
        <p className="text-slate-600">Carregando configuração da anamnese...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <p className="text-sm font-medium text-[var(--color-primary)]">
          Configurações
        </p>
        <h1 className="text-3xl font-bold text-slate-900">
          Configuração da Anamnese
        </h1>
        <p className="mt-1 text-slate-500">
          Monte a ficha, importe por Excel e deixe o preenchimento pronto para o
          cliente no Meu Espaço.
        </p>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={exportarExcel}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            📥 Baixar modelo Excel
          </button>

          <label className="cursor-pointer rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
            📤 Importar Excel
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={importarExcel}
              className="hidden"
            />
          </label>

          <button
            type="button"
            onClick={() => void salvarConfiguracao()}
            disabled={salvando}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: "var(--color-primary)" }}
          >
            {salvando ? "Salvando..." : "Salvar configuração"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Título da ficha
            </label>
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex.: Ficha de Anamnese"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-[var(--color-primary)]"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Descrição
            </label>
            <input
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex.: Preencha suas informações antes do atendimento."
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-[var(--color-primary)]"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Termo de responsabilidade
            </label>
            <textarea
              value={termoResponsabilidade}
              onChange={(e) => setTermoResponsabilidade(e.target.value)}
              rows={6}
              placeholder="Digite aqui o termo que o cliente deverá aceitar."
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-[var(--color-primary)]"
            />
          </div>

          <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={obrigatoria}
              onChange={(e) => setObrigatoria(e.target.checked)}
            />
            Ficha obrigatória
          </label>

          <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={ativo}
              onChange={(e) => setAtivo(e.target.checked)}
            />
            Configuração ativa
          </label>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Campos</h2>
            <p className="text-sm text-slate-500">
              Adicione manualmente ou importe pelo Excel. Campos removidos são
              desativados para preservar respostas antigas.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={adicionarAvaliacaoProfissional}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              + Avaliação do profissional
            </button>

            <button
              type="button"
              onClick={abrirModalNovoCampo}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-white"
              style={{ backgroundColor: "var(--color-primary)" }}
            >
              + Adicionar campo
            </button>
          </div>
        </div>

        {camposVisiveis.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-slate-500">
            Nenhum campo ativo adicionado ainda.
          </div>
        ) : (
          <div className="space-y-4">
            {camposVisiveis.map((campo, index) => (
              <div
                key={campo.id}
                className="rounded-2xl border border-slate-200 p-4"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Campo {index + 1}
                    </p>
                    <p className="text-xs text-slate-500">
                      {campo.nome_campo} • {campo.tipo}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => abrirModalEditarCampo(campo)}
                      className="rounded-lg px-3 py-1 text-sm font-medium text-blue-700 hover:bg-blue-50"
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      onClick={() => removerCampo(campo.id)}
                      className="rounded-lg px-3 py-1 text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                      Remover
                    </button>
                  </div>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">{campo.label}</p>
                  {campo.ajuda && (
                    <p className="mt-1 text-sm text-slate-500">{campo.ajuda}</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                    {campo.obrigatorio && (
                      <span className="rounded-full bg-purple-100 px-3 py-1 text-purple-700">
                        Obrigatório
                      </span>
                    )}
                    {campo.gera_alerta && (
                      <span className="rounded-full bg-orange-100 px-3 py-1 text-orange-700">
                        Gera alerta
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {camposInativos.length > 0 && (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="font-semibold text-slate-900">Campos inativos</h3>
            <p className="mt-1 text-sm text-slate-500">
              Eles não aparecem para novas fichas, mas continuam no banco para
              preservar o histórico.
            </p>

            <div className="mt-3 space-y-2">
              {camposInativos.map((campo) => (
                <div
                  key={campo.id}
                  className="flex items-center justify-between rounded-xl bg-white p-3 ring-1 ring-slate-200"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {campo.label || campo.nome_campo}
                    </p>
                    <p className="text-xs text-slate-500">{campo.nome_campo}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => reativarCampo(campo.id)}
                    className="rounded-lg px-3 py-1 text-sm font-semibold text-green-700 hover:bg-green-50"
                  >
                    Reativar
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {modalCampoAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold uppercase tracking-widest text-[var(--color-primary)]">
                  Campo da anamnese
                </p>
                <h2 className="text-2xl font-bold text-slate-900">
                  {campoEditandoId ? "Editar campo" : "Novo campo"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Configure a pergunta que aparecerá para o cliente.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setModalCampoAberto(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Fechar
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Nome interno
                </label>
                <input
                  value={campoModal.nome_campo}
                  onChange={(e) =>
                    setCampoModal((prev) => ({
                      ...prev,
                      nome_campo: e.target.value,
                    }))
                  }
                  placeholder="Ex.: diabetes"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-[var(--color-primary)]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Pergunta
                </label>
                <input
                  value={campoModal.label}
                  onChange={(e) =>
                    setCampoModal((prev) => ({ ...prev, label: e.target.value }))
                  }
                  placeholder="Ex.: Possui Diabetes?"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-[var(--color-primary)]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Tipo
                </label>
                <select
                  value={campoModal.tipo}
                  onChange={(e) =>
                    setCampoModal((prev) => ({ ...prev, tipo: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-[var(--color-primary)]"
                >
                  <option value="text">Texto</option>
                  <option value="textarea">Texto longo</option>
                  <option value="select">Seleção</option>
                  <option value="checkbox">Checkbox</option>
                  <option value="date">Data</option>
                  <option value="number">Número</option>
                  <option value="sim_nao_justificativa">
                    Sim / Não + justificativa
                  </option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Placeholder
                </label>
                <input
                  value={campoModal.placeholder}
                  onChange={(e) =>
                    setCampoModal((prev) => ({
                      ...prev,
                      placeholder: e.target.value,
                    }))
                  }
                  placeholder={
                    campoModal.tipo === "sim_nao_justificativa"
                      ? "Ex.: Se sim, descreva aqui"
                      : "Ex.: Descreva aqui"
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-[var(--color-primary)]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Ajuda
                </label>
                <input
                  value={campoModal.ajuda}
                  onChange={(e) =>
                    setCampoModal((prev) => ({ ...prev, ajuda: e.target.value }))
                  }
                  placeholder="Ex.: Se marcar Sim, informe detalhes"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-[var(--color-primary)]"
                />
              </div>

              {campoModal.tipo !== "sim_nao_justificativa" && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Opções
                  </label>
                  <input
                    value={campoModal.opcoes.join(" | ")}
                    onChange={(e) =>
                      setCampoModal((prev) => ({
                        ...prev,
                        opcoes: e.target.value
                          .split("|")
                          .map((item) => item.trim())
                          .filter(Boolean),
                      }))
                    }
                    placeholder="Ex.: Sim | Não | Talvez"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-[var(--color-primary)]"
                  />
                </div>
              )}

              <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={campoModal.obrigatorio}
                  onChange={(e) =>
                    setCampoModal((prev) => ({
                      ...prev,
                      obrigatorio: e.target.checked,
                    }))
                  }
                />
                Campo obrigatório
              </label>

              <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={campoModal.gera_alerta ?? false}
                  onChange={(e) =>
                    setCampoModal((prev) => ({
                      ...prev,
                      gera_alerta: e.target.checked,
                    }))
                  }
                />
                Gerar alerta na agenda
              </label>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setModalCampoAberto(false)}
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={salvarCampoModal}
                className="rounded-xl px-5 py-3 text-sm font-semibold text-white"
                style={{ backgroundColor: "var(--color-primary)" }}
              >
                {campoEditandoId ? "Salvar alteração" : "Adicionar campo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
