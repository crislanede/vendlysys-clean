import { type ChangeEvent, useEffect, useState } from "react";
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
        setLoading(false);
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
        setLoading(false);
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
        setLoading(false);
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
        setLoading(false);
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

  function adicionarCampo() {
    setCampos((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        modelo_id: modeloId || undefined,
        nome_campo: "",
        label: "",
        tipo: "text",
        obrigatorio: false,
        placeholder: "",
        ajuda: "",
        opcoes: [],
        ordem: prev.length,
        ativo: true,
        gera_alerta: false,
      },
    ]);
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

  function atualizarCampo(id: string, campo: Partial<Campo>) {
    setCampos((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...campo } : c))
    );
  }

  function removerCampo(id: string) {
    setCampos((prev) =>
      prev
        .filter((c) => c.id !== id)
        .map((c, index) => ({ ...c, ordem: index }))
    );
  }

  function exportarExcel() {
    baixarModeloExcelAnamnese();
  }

  async function importarExcel(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const config = await lerModeloExcelAnamnese(file);

      setTitulo(config.titulo);
      setDescricao(config.descricao);
      setTermoResponsabilidade(config.termo_responsabilidade);
      setObrigatoria(config.obrigatoria);

      setCampos(
        config.campos.map((campo, index) => ({
          id: crypto.randomUUID(),
          modelo_id: modeloId || undefined,
          nome_campo: campo.nome_campo,
          label: campo.label,
          tipo: campo.tipo,
          obrigatorio: campo.obrigatorio,
          placeholder: campo.placeholder,
          ajuda: campo.ajuda,
          opcoes: campo.opcoes,
          ordem: typeof campo.ordem === "number" ? campo.ordem : index,
          ativo: campo.ativo ?? true,
          gera_alerta: campo.gera_alerta ?? false,
        }))
      );

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

    if (campos.length === 0) {
      alert("Adicione pelo menos um campo na ficha.");
      return false;
    }

    const vistos = new Set<string>();

    for (const campo of campos) {
      const nomeInterno = campo.nome_campo.trim().toLowerCase();

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
        setSalvando(false);
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
          setSalvando(false);
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
          setSalvando(false);
          return;
        }

        const { error: deleteError } = await supabase
          .from("anamnese_campos")
          .delete()
          .eq("modelo_id", idModelo);

        if (deleteError) {
          console.error("Erro ao limpar campos antigos:", deleteError);
          alert("Erro ao atualizar os campos da anamnese.");
          setSalvando(false);
          return;
        }
      }

      const vistos = new Set<string>();

      const payloadCampos = campos
        .map((campo, index) => {
          const pergunta = perguntaSegura(campo, index);
          const nomeCampo = normalizarNomeCampo(campo.nome_campo, pergunta);
          const tipo = tipoSeguro(campo.tipo);

          return {
            modelo_id: idModelo,
            nome_campo: nomeCampo,
            label: pergunta,
            pergunta,
            tipo,
            obrigatorio: campo.obrigatorio,
            placeholder: campo.placeholder || "",
            ajuda: campo.ajuda || "",
            opcoes:
              tipo === "sim_nao_justificativa" ? [] : campo.opcoes || [],
            ordem: index,
            ativo: campo.ativo,
            gera_alerta: campo.gera_alerta ?? false,
          };
        })
        .filter((campo) => {
          const chave = campo.nome_campo;
          if (!chave || vistos.has(chave)) return false;
          vistos.add(chave);
          return true;
        });

      const { error: camposError } = await supabase
        .from("anamnese_campos")
        .insert(payloadCampos);

      if (camposError) {
        console.error("Erro ao salvar campos:", camposError);
        alert("Erro ao salvar os campos da anamnese.");
        setSalvando(false);
        return;
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
              Adicione manualmente ou importe pelo Excel.
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
              onClick={adicionarCampo}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-white"
              style={{ backgroundColor: "var(--color-primary)" }}
            >
              + Adicionar campo
            </button>
          </div>
        </div>

        {campos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-slate-500">
            Nenhum campo adicionado ainda.
          </div>
        ) : (
          <div className="space-y-4">
            {campos.map((campo, index) => (
              <div
                key={campo.id}
                className="rounded-2xl border border-slate-200 p-4"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">
                    Campo {index + 1}
                  </p>

                  <button
                    type="button"
                    onClick={() => removerCampo(campo.id)}
                    className="rounded-lg px-3 py-1 text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    Remover
                  </button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Nome interno
                    </label>
                    <input
                      value={campo.nome_campo}
                      onChange={(e) =>
                        atualizarCampo(campo.id, {
                          nome_campo: e.target.value,
                        })
                      }
                      placeholder="Ex.: alergias"
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-[var(--color-primary)]"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Pergunta
                    </label>
                    <input
                      value={campo.label}
                      onChange={(e) =>
                        atualizarCampo(campo.id, {
                          label: e.target.value,
                        })
                      }
                      placeholder="Ex.: Possui alergia?"
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-[var(--color-primary)]"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Tipo
                    </label>
                    <select
                      value={campo.tipo}
                      onChange={(e) =>
                        atualizarCampo(campo.id, {
                          tipo: e.target.value,
                        })
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
                      value={campo.placeholder}
                      onChange={(e) =>
                        atualizarCampo(campo.id, {
                          placeholder: e.target.value,
                        })
                      }
                      placeholder={
                        campo.tipo === "sim_nao_justificativa"
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
                      value={campo.ajuda}
                      onChange={(e) =>
                        atualizarCampo(campo.id, {
                          ajuda: e.target.value,
                        })
                      }
                      placeholder="Ex.: Se marcar Sim, informe detalhes"
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-[var(--color-primary)]"
                    />
                  </div>

                  {campo.tipo !== "sim_nao_justificativa" && (
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Opções
                      </label>
                      <input
                        value={campo.opcoes.join(" | ")}
                        onChange={(e) =>
                          atualizarCampo(campo.id, {
                            opcoes: e.target.value
                              .split("|")
                              .map((item) => item.trim())
                              .filter(Boolean),
                          })
                        }
                        placeholder="Ex.: Sim | Não | Talvez"
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-[var(--color-primary)]"
                      />
                    </div>
                  )}

                  <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={campo.obrigatorio}
                      onChange={(e) =>
                        atualizarCampo(campo.id, {
                          obrigatorio: e.target.checked,
                        })
                      }
                    />
                    Campo obrigatório
                  </label>

                  <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={campo.gera_alerta ?? false}
                      onChange={(e) =>
                        atualizarCampo(campo.id, {
                          gera_alerta: e.target.checked,
                        })
                      }
                    />
                    Gerar alerta na agenda
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}