import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import * as XLSX from "xlsx";
import { supabase } from "../lib/supabase";
import { useEmpresa } from "../hooks/useEmpresa";

import PageHeader from "../components/ui/PageHeader";
import SectionCard from "../components/ui/SectionCard";
import PrimaryButton from "../components/ui/PrimaryButton";
import SecondaryButton from "../components/ui/SecondaryButton";
import EmptyState from "../components/ui/EmptyState";

type CategoriaServico = {
  id: string;
  nome: string;
  empresa_id?: string | null;
  created_at?: string | null;
};

type Servico = {
  id: string;
  empresa_id?: string | null;
  nome: string;
  categoria: string | null;
  preco: number | null;
  preco_promocional: number | null;
  preco_descricao: string | null;
  duracao_padrao_minutos: number | null;
  atendimento_residencial?: boolean | null;
  preco_residencial?: number | null;
  ativo: boolean;
  descricao?: string | null;
  retorno_automatico?: boolean | null;
  retorno_dias?: number | null;
  retorno_alerta_dias?: number | null;
  retorno_tipo?: string | null;
  created_at?: string | null;
};

type LinhaImportacao = {
  nome?: string;
  categoria?: string;
  valor?: string | number;
  preco?: string | number;
  preco_promocional?: string | number;
  preco_residencial?: string | number;
  duracao_minutos?: string | number;
  duracao_padrao_minutos?: string | number;
  atendimento_residencial?: string | boolean;
  preco_descricao?: string;
  descricao?: string;
  ativo?: string | boolean;
};

type ErroImportacao = {
  linha: number;
  motivo: string;
};

const categoriasPadrao = [
  "Manicure",
  "Pedicure",
  "Manicure e Pedicure",
  "Atendimento residencial",
  "Nail Design",
  "Alongamento",
  "Spa",
  "Sobrancelhas",
  "Cílios",
  "Cabelo",
  "Pele",
  "Calista",
];

export default function ServicosPage() {
  const { empresaId, carregandoEmpresa } = useEmpresa();

  const [servicos, setServicos] = useState<Servico[]>([]);
  const [categorias, setCategorias] = useState<CategoriaServico[]>([]);
  const [loading, setLoading] = useState(true);
  const [importando, setImportando] = useState(false);

  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState("");
  const [preco, setPreco] = useState("");
  const [precoPromocional, setPrecoPromocional] = useState("");
  const [precoResidencial, setPrecoResidencial] = useState("");
  const [precoDescricao, setPrecoDescricao] = useState("");
  const [descricao, setDescricao] = useState("");
  const [duracao, setDuracao] = useState("60");
  const [atendimentoResidencial, setAtendimentoResidencial] = useState(false);
  const [ativo, setAtivo] = useState(true);
  const [retornoAutomatico, setRetornoAutomatico] = useState(false);
  const [retornoDias, setRetornoDias] = useState("");
  const [retornoAlertaDias, setRetornoAlertaDias] = useState("0");
  const [retornoTipo, setRetornoTipo] = useState("");

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [categoriaAberta, setCategoriaAberta] = useState<Record<string, boolean>>({});

  const [mostrarModalCategoria, setMostrarModalCategoria] = useState(false);
  const [categoriaEditandoId, setCategoriaEditandoId] = useState<string | null>(null);
  const [nomeCategoria, setNomeCategoria] = useState("");

  const [resumoImportacao, setResumoImportacao] = useState<{
    sucesso: number;
    erros: ErroImportacao[];
  } | null>(null);

  useEffect(() => {
    if (empresaId) carregarTudo();
  }, [empresaId]);

  async function carregarTudo() {
    if (!empresaId) return;
    setLoading(true);
    await Promise.all([carregarServicos(), carregarCategorias()]);
    setLoading(false);
  }

  async function carregarServicos() {
    const { data, error } = await supabase
      .from("servicos")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("categoria", { ascending: true })
      .order("nome", { ascending: true });

    if (error) {
      console.error("Erro ao carregar serviços:", error);
      alert(`Erro ao carregar serviços: ${error.message}`);
      setServicos([]);
      return;
    }

    setServicos((data || []) as Servico[]);
  }

  async function carregarCategorias() {
    const { data, error } = await supabase
      .from("categorias_servicos")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("nome", { ascending: true });

    if (error) {
      console.warn("Erro ao carregar categorias:", error.message);
      setCategorias([]);
      return;
    }

    setCategorias((data || []) as CategoriaServico[]);
  }

  function limparFormulario() {
    setNome("");
    setCategoria("");
    setPreco("");
    setPrecoPromocional("");
    setPrecoResidencial("");
    setPrecoDescricao("");
    setDescricao("");
    setDuracao("60");
    setAtendimentoResidencial(false);
    setAtivo(true);
    setRetornoAutomatico(false);
    setRetornoDias("");
    setRetornoAlertaDias("0");
    setRetornoTipo("");
    setEditandoId(null);
    setMostrarFormulario(false);
  }

  function abrirNovaCategoria() {
    setCategoriaEditandoId(null);
    setNomeCategoria("");
    setMostrarModalCategoria(true);
  }

  function editarCategoria(nomeDaCategoria: string) {
    const categoriaExistente = categorias.find(
      (item) => item.nome.toLowerCase() === nomeDaCategoria.toLowerCase()
    );

    setCategoriaEditandoId(categoriaExistente?.id || null);
    setNomeCategoria(nomeDaCategoria);
    setMostrarModalCategoria(true);
  }

  async function salvarCategoria(e: FormEvent) {
    e.preventDefault();

    if (!empresaId) {
      alert("Empresa não identificada. Faça login novamente.");
      return;
    }

    const nomeFinal = nomeCategoria.trim();

    if (!nomeFinal) {
      alert("Informe o nome da categoria.");
      return;
    }

    const categoriaDuplicada = categorias.some(
      (item) =>
        item.nome.toLowerCase() === nomeFinal.toLowerCase() &&
        item.id !== categoriaEditandoId
    );

    if (categoriaDuplicada) {
      alert("Já existe uma categoria com esse nome.");
      return;
    }

    if (categoriaEditandoId) {
      const categoriaAntiga = categorias.find((item) => item.id === categoriaEditandoId);

      const { error } = await supabase
        .from("categorias_servicos")
        .update({ nome: nomeFinal })
        .eq("id", categoriaEditandoId)
        .eq("empresa_id", empresaId);

      if (error) {
        alert("Erro ao editar categoria: " + error.message);
        return;
      }

      if (categoriaAntiga?.nome && categoriaAntiga.nome !== nomeFinal) {
        const { error: erroServicos } = await supabase
          .from("servicos")
          .update({ categoria: nomeFinal })
          .eq("categoria", categoriaAntiga.nome)
          .eq("empresa_id", empresaId);

        if (erroServicos) {
          alert("Categoria editada, mas não foi possível atualizar os serviços: " + erroServicos.message);
        }
      }
    } else {
      const { error } = await supabase
        .from("categorias_servicos")
        .insert([{ nome: nomeFinal, empresa_id: empresaId }]);

      if (error) {
        alert("Erro ao criar categoria: " + error.message);
        return;
      }
    }

    setMostrarModalCategoria(false);
    setCategoriaEditandoId(null);
    setNomeCategoria("");
    await carregarTudo();
  }

  async function excluirCategoria(nomeDaCategoria: string) {
    if (!empresaId) {
      alert("Empresa não identificada. Faça login novamente.");
      return;
    }
    const categoriaUsada = servicos.some((item) => item.categoria === nomeDaCategoria);

    if (categoriaUsada) {
      alert("Essa categoria possui serviços vinculados. Mova ou edite os serviços antes de excluir.");
      return;
    }

    const categoriaExistente = categorias.find(
      (item) => item.nome.toLowerCase() === nomeDaCategoria.toLowerCase()
    );

    if (!categoriaExistente) {
      alert("Essa categoria foi criada pelos serviços existentes e não pode ser excluída diretamente.");
      return;
    }

    const confirmar = window.confirm(`Deseja excluir a categoria "${nomeDaCategoria}"?`);
    if (!confirmar) return;

    const { error } = await supabase
      .from("categorias_servicos")
      .delete()
      .eq("id", categoriaExistente.id)
      .eq("empresa_id", empresaId);

    if (error) {
      alert("Erro ao excluir categoria: " + error.message);
      return;
    }

    await carregarCategorias();
  }

  async function salvarServico(e: FormEvent) {
    e.preventDefault();

    if (!empresaId) {
      alert("Empresa não identificada. Faça login novamente.");
      return;
    }

    const precoNormalizado = normalizarNumero(preco);
    const precoPromocionalNormalizado = normalizarNumero(precoPromocional);
    const precoResidencialNormalizado = normalizarNumero(precoResidencial);
    const duracaoNormalizada = normalizarNumero(duracao);
    const retornoDiasNormalizado = normalizarNumero(retornoDias);
    const retornoAlertaNormalizado = normalizarNumero(retornoAlertaDias);

    if (!nome.trim()) {
      alert("Informe o nome do serviço.");
      return;
    }

    if (!categoria.trim()) {
      alert("Selecione uma categoria.");
      return;
    }

    if (precoNormalizado === null || precoNormalizado < 0) {
      alert("Informe um preço válido.");
      return;
    }

    if (duracaoNormalizada !== null && duracaoNormalizada <= 0) {
      alert("Informe uma duração válida.");
      return;
    }

    if (retornoAutomatico && (!retornoDiasNormalizado || retornoDiasNormalizado <= 0)) {
      alert("Informe o prazo de retorno em dias.");
      return;
    }

    if (retornoAutomatico && retornoAlertaNormalizado !== null && retornoAlertaNormalizado < 0) {
      alert("O alerta de retorno não pode ser negativo.");
      return;
    }

    if (atendimentoResidencial && (precoResidencialNormalizado === null || precoResidencialNormalizado < 0)) {
      alert("Informe o preço residencial ou desmarque atendimento residencial.");
      return;
    }

    const payload = {
      nome: nome.trim(),
      categoria: categoria.trim(),
      preco: precoNormalizado,
      preco_promocional:
        precoPromocionalNormalizado !== null && precoPromocionalNormalizado >= 0
          ? precoPromocionalNormalizado
          : null,
      preco_residencial:
        atendimentoResidencial && precoResidencialNormalizado !== null
          ? precoResidencialNormalizado
          : null,
      atendimento_residencial: atendimentoResidencial,
      preco_descricao: precoDescricao.trim() || null,
      descricao: descricao.trim() || null,
      duracao_padrao_minutos:
        duracaoNormalizada && duracaoNormalizada > 0 ? duracaoNormalizada : 60,
      ativo,
      retorno_automatico: retornoAutomatico,
      retorno_dias: retornoAutomatico ? retornoDiasNormalizado : null,
      retorno_alerta_dias: retornoAutomatico ? retornoAlertaNormalizado || 0 : 0,
      retorno_tipo: retornoAutomatico ? retornoTipo.trim() || null : null,
      empresa_id: empresaId,
    };

    const resposta = editandoId
      ? await supabase.from("servicos").update(payload).eq("id", editandoId).eq("empresa_id", empresaId)
      : await supabase.from("servicos").insert([payload]);

    if (resposta.error) {
      console.error("Erro ao salvar serviço:", resposta.error);
      alert(`Erro ao salvar serviço: ${resposta.error.message}`);
      return;
    }

    limparFormulario();
    await carregarServicos();
  }

  function editarServico(item: Servico) {
    setNome(item.nome || "");
    setCategoria(item.categoria || "");
    setPreco(item.preco != null ? String(item.preco) : "");
    setPrecoPromocional(
      item.preco_promocional != null ? String(item.preco_promocional) : ""
    );
    setPrecoResidencial(
      item.preco_residencial != null ? String(item.preco_residencial) : ""
    );
    setPrecoDescricao(item.preco_descricao || "");
    setDescricao(item.descricao || "");
    setDuracao(
      item.duracao_padrao_minutos != null
        ? String(item.duracao_padrao_minutos)
        : "60"
    );
    setAtendimentoResidencial(!!item.atendimento_residencial);
    setAtivo(item.ativo ?? true);
    setRetornoAutomatico(!!item.retorno_automatico);
    setRetornoDias(item.retorno_dias != null ? String(item.retorno_dias) : "");
    setRetornoAlertaDias(item.retorno_alerta_dias != null ? String(item.retorno_alerta_dias) : "0");
    setRetornoTipo(item.retorno_tipo || "");
    setEditandoId(item.id);
    setMostrarFormulario(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function toggleAtivo(id: string, ativoAtual: boolean) {
    if (!empresaId) {
      alert("Empresa não identificada. Faça login novamente.");
      return;
    }
    const { error } = await supabase
      .from("servicos")
      .update({ ativo: !ativoAtual })
      .eq("id", id)
      .eq("empresa_id", empresaId);

    if (error) {
      console.error("Erro ao atualizar status do serviço:", error);
      alert(`Erro ao atualizar serviço: ${error.message}`);
      return;
    }

    await carregarServicos();
  }

  function formatarMoeda(valor: number | null | undefined) {
    return Number(valor || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function baixarModelo() {
    const linhasModelo = [
      {
        nome: "Blindagem",
        categoria: "Atendimento residencial",
        valor: 60,
        preco_promocional: "",
        atendimento_residencial: "SIM",
        preco_residencial: 80,
        duracao_minutos: 60,
        preco_descricao: "",
        descricao: "Manicure com base gel",
        ativo: "SIM",
      },
      {
        nome: "Manicure simples",
        categoria: "Manicure",
        valor: 30,
        preco_promocional: 25,
        atendimento_residencial: "NÃO",
        preco_residencial: "",
        duracao_minutos: 60,
        preco_descricao: "",
        descricao: "Serviço de manicure tradicional",
        ativo: "SIM",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(linhasModelo);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Serviços");
    XLSX.writeFile(workbook, "modelo_servicos.xlsx");
  }

  function exportarServicos() {
    const linhas = servicos.map((item) => ({
      nome: item.nome,
      categoria: item.categoria || "",
      valor: item.preco || 0,
      preco_promocional: item.preco_promocional || "",
      atendimento_residencial: item.atendimento_residencial ? "SIM" : "NÃO",
      preco_residencial: item.preco_residencial || "",
      duracao_minutos: item.duracao_padrao_minutos || 0,
      preco_descricao: item.preco_descricao || "",
      descricao: item.descricao || "",
      ativo: item.ativo ? "SIM" : "NÃO",
    }));

    const worksheet = XLSX.utils.json_to_sheet(linhas);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Serviços");
    XLSX.writeFile(workbook, "servicos_exportados.xlsx");
  }

  function normalizarTexto(valor: unknown) {
    return String(valor || "").trim();
  }

  function normalizarBoolean(valor: unknown) {
    const texto = String(valor || "")
      .trim()
      .toLowerCase();

    if (!texto) return true;
    if (["sim", "s", "true", "1", "ativo"].includes(texto)) return true;
    if (["nao", "não", "n", "false", "0", "inativo"].includes(texto)) return false;
    return null;
  }

  function normalizarNumero(valor: unknown) {
    if (valor === null || valor === undefined || valor === "") return null;

    const texto = String(valor).trim().replace(/\./g, "").replace(",", ".");
    const numero = Number(texto);

    if (Number.isNaN(numero)) return null;
    return numero;
  }

  const categoriasDisponiveis = useMemo(() => {
    const set = new Set<string>(categoriasPadrao);

    categorias.forEach((item) => {
      if (item.nome) set.add(item.nome);
    });

    servicos.forEach((item) => {
      if (item.categoria) set.add(item.categoria);
    });

    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [categorias, servicos]);

  const servicosPorCategoria = useMemo(() => {
    const grupos: Record<string, Servico[]> = {};

    servicos.forEach((item) => {
      const chave = item.categoria || "Sem categoria";
      if (!grupos[chave]) grupos[chave] = [];
      grupos[chave].push(item);
    });

    return Object.entries(grupos).sort(([a], [b]) => a.localeCompare(b));
  }, [servicos]);

  const chavesExistentes = useMemo(() => {
    return new Set(
      servicos.map((item) =>
        `${(item.nome || "").trim().toLowerCase()}|${(item.categoria || "")
          .trim()
          .toLowerCase()}`
      )
    );
  }, [servicos]);

  async function importarArquivo(e: ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;

    if (!empresaId) {
      alert("Empresa não identificada. Faça login novamente.");
      e.target.value = "";
      return;
    }

    setImportando(true);
    setResumoImportacao(null);

    try {
      const buffer = await arquivo.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });

      const nomeAba =
        workbook.SheetNames.find(
          (nomeSheet) => nomeSheet.toLowerCase() === "serviços"
        ) ||
        workbook.SheetNames.find(
          (nomeSheet) => nomeSheet.toLowerCase() === "servicos"
        ) ||
        workbook.SheetNames[0];

      const worksheet = workbook.Sheets[nomeAba];
      const linhas = XLSX.utils.sheet_to_json<LinhaImportacao>(worksheet, {
        defval: "",
      });

      if (!linhas.length) {
        alert("O arquivo está vazio.");
        setImportando(false);
        e.target.value = "";
        return;
      }

      const erros: ErroImportacao[] = [];
      const payloadValido: Array<{
        nome: string;
        categoria: string | null;
        preco: number;
        preco_promocional: number | null;
        preco_residencial: number | null;
        atendimento_residencial: boolean;
        preco_descricao: string | null;
        descricao: string | null;
        duracao_padrao_minutos: number;
        ativo: boolean;
        empresa_id: string;
      }> = [];

      const categoriasParaCriar = new Set<string>();
      const chavesArquivo = new Set<string>();

      linhas.forEach((linha, index) => {
        const numeroLinha = index + 2;

        const nomeServico = normalizarTexto(linha.nome);
        const categoriaServico = normalizarTexto(linha.categoria);
        const valorServico = normalizarNumero(linha.valor ?? linha.preco);
        const valorPromocional = normalizarNumero(linha.preco_promocional);
        const valorResidencial = normalizarNumero(linha.preco_residencial);
        const duracaoServico = normalizarNumero(
          linha.duracao_minutos ?? linha.duracao_padrao_minutos
        );
        const descricaoPreco = normalizarTexto(linha.preco_descricao);
        const descricaoServico = normalizarTexto(linha.descricao);
        const ativoNormalizado = normalizarBoolean(linha.ativo);
        const residencialNormalizado = normalizarBoolean(linha.atendimento_residencial);

        if (!nomeServico) {
          erros.push({
            linha: numeroLinha,
            motivo: "Nome do serviço é obrigatório.",
          });
          return;
        }

        if (!categoriaServico) {
          erros.push({
            linha: numeroLinha,
            motivo: "Categoria é obrigatória.",
          });
          return;
        }

        if (valorServico === null || valorServico < 0) {
          erros.push({
            linha: numeroLinha,
            motivo: "Valor deve ser preenchido e não pode ser negativo.",
          });
          return;
        }

        if (duracaoServico !== null && duracaoServico <= 0) {
          erros.push({
            linha: numeroLinha,
            motivo: "Duração deve ser maior que zero.",
          });
          return;
        }

        if (ativoNormalizado === null) {
          erros.push({
            linha: numeroLinha,
            motivo: "Campo ativo deve ser SIM ou NÃO.",
          });
          return;
        }

        if (residencialNormalizado === null) {
          erros.push({
            linha: numeroLinha,
            motivo: "Campo atendimento_residencial deve ser SIM ou NÃO.",
          });
          return;
        }

        if (residencialNormalizado && (valorResidencial === null || valorResidencial < 0)) {
          erros.push({
            linha: numeroLinha,
            motivo: "Preço residencial obrigatório quando atendimento residencial = SIM.",
          });
          return;
        }

        const chave = `${nomeServico.toLowerCase()}|${categoriaServico.toLowerCase()}`;

        if (chavesExistentes.has(chave)) {
          erros.push({
            linha: numeroLinha,
            motivo: "Serviço já existe na base.",
          });
          return;
        }

        if (chavesArquivo.has(chave)) {
          erros.push({
            linha: numeroLinha,
            motivo: "Serviço duplicado dentro da própria planilha.",
          });
          return;
        }

        chavesArquivo.add(chave);

        const categoriaExiste = categoriasDisponiveis.some(
          (cat) => cat.toLowerCase() === categoriaServico.toLowerCase()
        );

        if (!categoriaExiste) categoriasParaCriar.add(categoriaServico);

        payloadValido.push({
          nome: nomeServico,
          categoria: categoriaServico,
          preco: valorServico,
          preco_promocional:
            valorPromocional !== null && valorPromocional >= 0 ? valorPromocional : null,
          preco_residencial:
            residencialNormalizado && valorResidencial !== null ? valorResidencial : null,
          atendimento_residencial: residencialNormalizado,
          preco_descricao: descricaoPreco || null,
          descricao: descricaoServico || null,
          duracao_padrao_minutos:
            duracaoServico && duracaoServico > 0 ? duracaoServico : 60,
          ativo: ativoNormalizado ?? true,
          empresa_id: empresaId,
        });
      });

      if (categoriasParaCriar.size > 0) {
        const payloadCategorias = Array.from(categoriasParaCriar).map((nomeCategoria) => ({
          nome: nomeCategoria,
          empresa_id: empresaId,
        }));

        const { error: erroCategorias } = await supabase
          .from("categorias_servicos")
          .insert(payloadCategorias);

        if (erroCategorias) {
          console.warn("Não foi possível criar algumas categorias:", erroCategorias.message);
        }
      }

      if (payloadValido.length > 0) {
        const { error } = await supabase.from("servicos").insert(payloadValido);

        if (error) {
          console.error("Erro ao importar serviços:", error);
          alert(`Erro ao importar serviços: ${error.message}`);
          setImportando(false);
          e.target.value = "";
          return;
        }
      }

      setResumoImportacao({
        sucesso: payloadValido.length,
        erros,
      });

      await carregarTudo();
    } catch (error) {
      console.error("Erro ao processar arquivo:", error);
      alert("Não foi possível ler o arquivo. Verifique se está no modelo correto.");
    } finally {
      setImportando(false);
      e.target.value = "";
    }
  }

  function alternarCategoria(nomeCategoria: string) {
    setCategoriaAberta((prev) => ({
      ...prev,
      [nomeCategoria]: prev[nomeCategoria] === false ? true : false,
    }));
  }

  if (carregandoEmpresa) {
    return (
      <SectionCard>
        <p>Carregando empresa...</p>
      </SectionCard>
    );
  }

  if (!empresaId) {
    return (
      <SectionCard>
        <p>Empresa não encontrada. Faça login novamente.</p>
      </SectionCard>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Catálogo"
        title="Serviços"
        description="Gerencie categorias, preços, atendimento residencial, promoções, duração e importação em lote."
        action={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={abrirNovaCategoria}
              className="rounded-2xl px-4 py-2 text-sm font-bold text-white transition hover:opacity-90"
              style={{ backgroundColor: "var(--color-primary)", border: "1px solid var(--color-primary)" }}
            >
              + Categoria
            </button>

            <PrimaryButton
              type="button"
              onClick={() => {
                if (mostrarFormulario) {
                  limparFormulario();
                } else {
                  setMostrarFormulario(true);
                }
              }}
            >
              {mostrarFormulario ? "Fechar" : "+ Serviço"}
            </PrimaryButton>

            <button
              type="button"
              onClick={exportarServicos}
              className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Exportar
            </button>

            <button
              type="button"
              onClick={baixarModelo}
              className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Baixar modelo
            </button>

            <label className="cursor-pointer rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
              {importando ? "Importando..." : "Importar serviços"}
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={importarArquivo}
                className="hidden"
                disabled={importando}
              />
            </label>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SectionCard>
          <p className="text-sm font-semibold text-slate-500">Serviços cadastrados</p>
          <p className="mt-2 text-3xl font-extrabold text-slate-900">{servicos.length}</p>
        </SectionCard>

        <SectionCard>
          <p className="text-sm font-semibold text-slate-500">Categorias</p>
          <p className="mt-2 text-3xl font-extrabold text-slate-900">{categoriasDisponiveis.length}</p>
        </SectionCard>

        <SectionCard>
          <p className="text-sm font-semibold text-slate-500">Residenciais</p>
          <p className="mt-2 text-3xl font-extrabold" style={{ color: "var(--color-primary)" }}>
            {servicos.filter((item) => item.atendimento_residencial).length}
          </p>
        </SectionCard>
      </div>

      {resumoImportacao && (
        <SectionCard
          title="Resultado da importação"
          description={`${resumoImportacao.sucesso} serviço(s) importado(s) com sucesso`}
        >
          {resumoImportacao.erros.length === 0 ? (
            <p className="text-sm text-emerald-700">
              Importação concluída sem erros.
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-amber-700">
                Algumas linhas não foram importadas:
              </p>

              <div className="max-h-60 space-y-2 overflow-auto rounded-2xl border border-slate-200 p-3">
                {resumoImportacao.erros.map((erro, index) => (
                  <p key={`${erro.linha}-${index}`} className="text-sm text-slate-600">
                    <span className="font-medium">Linha {erro.linha}:</span> {erro.motivo}
                  </p>
                ))}
              </div>
            </div>
          )}
        </SectionCard>
      )}

      {mostrarFormulario && (
        <SectionCard
          title={editandoId ? "Editar serviço" : "Novo serviço"}
          description="Cadastre ou ajuste as informações do serviço"
        >
          <form
            onSubmit={salvarServico}
            className="grid grid-cols-1 gap-3 md:grid-cols-2"
          >
            <input
              placeholder="Nome do serviço"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="rounded-2xl border border-slate-200 p-3"
            />

            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="rounded-2xl border border-slate-200 p-3"
            >
              <option value="">Selecione a categoria</option>
              {categoriasDisponiveis.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <input
              type="number"
              step="0.01"
              placeholder="Preço padrão"
              value={preco}
              onChange={(e) => setPreco(e.target.value)}
              className="rounded-2xl border border-slate-200 p-3"
            />

            <input
              type="number"
              step="0.01"
              placeholder="Preço promocional"
              value={precoPromocional}
              onChange={(e) => setPrecoPromocional(e.target.value)}
              className="rounded-2xl border border-slate-200 p-3"
            />

            <label className="flex items-center gap-2 rounded-2xl border border-slate-200 p-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={atendimentoResidencial}
                onChange={(e) => setAtendimentoResidencial(e.target.checked)}
              />
              Permite atendimento residencial
            </label>

            <input
              type="number"
              step="0.01"
              placeholder="Preço residencial"
              value={precoResidencial}
              onChange={(e) => setPrecoResidencial(e.target.value)}
              disabled={!atendimentoResidencial}
              className="rounded-2xl border border-slate-200 p-3 disabled:bg-slate-100"
            />

            <input
              placeholder="Descrição do preço (ex: a partir de R$20)"
              value={precoDescricao}
              onChange={(e) => setPrecoDescricao(e.target.value)}
              className="rounded-2xl border border-slate-200 p-3 md:col-span-2"
            />

            <textarea
              placeholder="Descrição do serviço"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="rounded-2xl border border-slate-200 p-3 md:col-span-2"
            />

            <input
              type="number"
              min="1"
              placeholder="Duração em minutos"
              value={duracao}
              onChange={(e) => setDuracao(e.target.value)}
              className="rounded-2xl border border-slate-200 p-3"
            />

            <div className="flex items-center">
              <label className="flex items-center gap-2 rounded-2xl border border-slate-200 p-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={ativo}
                  onChange={(e) => setAtivo(e.target.checked)}
                />
                Serviço ativo
              </label>
            </div>

            <div className="md:col-span-2 rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={retornoAutomatico}
                  onChange={(e) => setRetornoAutomatico(e.target.checked)}
                />
                Criar retorno automático ao finalizar atendimento
              </label>

              {retornoAutomatico && (
                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <input
                    type="number"
                    min="1"
                    placeholder="Prazo do retorno (dias)"
                    value={retornoDias}
                    onChange={(e) => setRetornoDias(e.target.value)}
                    className="rounded-2xl border border-slate-200 p-3"
                  />

                  <input
                    type="number"
                    min="0"
                    placeholder="Alertar antes (dias)"
                    value={retornoAlertaDias}
                    onChange={(e) => setRetornoAlertaDias(e.target.value)}
                    className="rounded-2xl border border-slate-200 p-3"
                  />

                  <input
                    placeholder="Tipo de retorno (manutenção, avaliação...)"
                    value={retornoTipo}
                    onChange={(e) => setRetornoTipo(e.target.value)}
                    className="rounded-2xl border border-slate-200 p-3"
                  />
                </div>
              )}

              <p className="mt-2 text-xs text-slate-500">
                Exemplo: prazo 20 dias e alerta 3 dias antes → o alerta aparece 17 dias após o atendimento.
              </p>
            </div>

            <div className="md:col-span-2 flex gap-2">
              <PrimaryButton type="submit">
                {editandoId ? "Atualizar" : "Salvar"}
              </PrimaryButton>

              <SecondaryButton type="button" onClick={limparFormulario}>
                Cancelar
              </SecondaryButton>
            </div>
          </form>
        </SectionCard>
      )}

      {loading ? (
        <SectionCard>
          <p>Carregando...</p>
        </SectionCard>
      ) : servicos.length === 0 ? (
        <EmptyState
          title="Nenhum serviço cadastrado"
          description="Cadastre o primeiro serviço ou importe uma planilha para começar."
        />
      ) : (
        <div className="space-y-5">
          {servicosPorCategoria.map(([nomeCategoria, itens]) => {
            const aberta = categoriaAberta[nomeCategoria] !== false;

            return (
              <div key={nomeCategoria} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between px-5 py-4 text-white"
                style={{ backgroundColor: "var(--color-primary)" }}>
                  <button
                    type="button"
                    onClick={() => alternarCategoria(nomeCategoria)}
                    className="flex flex-1 items-center gap-3 text-left"
                  >
                    <span className="text-xl">{aberta ? "▾" : "▸"}</span>
                    <div>
                      <h3 className="text-xl font-bold">{nomeCategoria}</h3>
                      <p className="text-sm text-white/85">
                        {itens.length} serviço(s) cadastrado(s)
                      </p>
                    </div>
                  </button>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => editarCategoria(nomeCategoria)}
                      className="text-sm font-bold text-white hover:underline"
                    >
                      Editar categoria
                    </button>

                    <button
                      type="button"
                      onClick={() => excluirCategoria(nomeCategoria)}
                      className="text-sm font-bold text-white hover:underline"
                    >
                      Excluir categoria
                    </button>
                  </div>
                </div>

                {aberta && (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-left text-sm text-slate-600">
                          <th className="px-4 py-3">Serviço</th>
                          <th className="px-4 py-3">Descrição</th>
                          <th className="px-4 py-3 text-right">Preço padrão</th>
                          <th className="px-4 py-3 text-right">Preço promocional</th>
                          <th className="px-4 py-3 text-right">Residencial</th>
                          <th className="px-4 py-3 text-right">Duração</th>
                          <th className="px-4 py-3 text-right">Ações</th>
                        </tr>
                      </thead>

                      <tbody>
                        {itens.map((item) => (
                          <tr key={item.id} className="border-b border-slate-100 last:border-0">
                            <td className="px-4 py-4">
                              <div className="text-lg font-semibold text-slate-900">
                                {item.nome}
                              </div>
                              <div className="mt-1 text-sm text-slate-500">
                                {item.ativo ? "Ativo" : "Inativo"}
                              </div>
                            </td>

                            <td className="px-4 py-4 text-sm text-slate-600">
                              <strong className="text-slate-800">
                                {item.descricao || item.preco_descricao || "--"}
                              </strong>
                            </td>

                            <td className="px-4 py-4 text-right font-bold text-slate-900">
                              {formatarMoeda(item.preco)}
                            </td>

                            <td className="px-4 py-4 text-right text-slate-700">
                              {item.preco_promocional
                                ? formatarMoeda(item.preco_promocional)
                                : "--"}
                            </td>

                            <td className="px-4 py-4 text-right text-slate-700">
                              {item.atendimento_residencial
                                ? formatarMoeda(item.preco_residencial)
                                : "--"}
                            </td>

                            <td className="px-4 py-4 text-right font-bold text-slate-900">
                              {item.duracao_padrao_minutos || 0} min
                            </td>

                            <td className="px-4 py-4">
                              <div className="flex justify-end gap-3">
                                <button
                                  type="button"
                                  onClick={() => editarServico(item)}
                                  className="text-sm font-bold text-blue-600 hover:underline"
                                >
                                  Editar
                                </button>

                                <button
                                  type="button"
                                  onClick={() => toggleAtivo(item.id, item.ativo)}
                                  className="text-sm font-bold hover:underline"
                                  style={{ color: "var(--color-primary)" }}
                                >
                                  {item.ativo ? "Inativar" : "Ativar"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {mostrarModalCategoria && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={salvarCategoria}
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
          >
            <h3 className="text-xl font-extrabold text-slate-900">
              {categoriaEditandoId ? "Editar categoria" : "Nova categoria"}
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Organize seus serviços por área, tipo de atendimento ou categoria comercial.
            </p>

            <input
              value={nomeCategoria}
              onChange={(e) => setNomeCategoria(e.target.value)}
              placeholder="Ex: Atendimento residencial"
              className="mt-5 w-full rounded-2xl border border-slate-200 p-3"
            />

            <div className="mt-6 flex justify-end gap-2">
              <SecondaryButton
                type="button"
                onClick={() => {
                  setMostrarModalCategoria(false);
                  setCategoriaEditandoId(null);
                  setNomeCategoria("");
                }}
              >
                Cancelar
              </SecondaryButton>

              <PrimaryButton type="submit">
                Salvar categoria
              </PrimaryButton>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
