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
  promocao_ativa?: boolean | null;
  preco_descricao: string | null;
  duracao_padrao_minutos: number | null;
  atendimento_residencial?: boolean | null;
  preco_residencial?: number | null;
  percentual_residencial?: number | null;
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
  promocao_ativa?: string | boolean;
  preco_residencial?: string | number;
  percentual_residencial?: string | number;
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
  const [promocaoAtiva, setPromocaoAtiva] = useState(false);
  const [precoResidencial, setPrecoResidencial] = useState("");
  const [percentualResidencial, setPercentualResidencial] = useState("0");
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
  const [categoriaAberta, setCategoriaAberta] = useState<Record<string, boolean>>(
    {},
  );

  const [mostrarModalCategoria, setMostrarModalCategoria] = useState(false);
  const [categoriaEditandoId, setCategoriaEditandoId] = useState<string | null>(
    null,
  );
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
    setPromocaoAtiva(false);
    setPrecoResidencial("");
    setPercentualResidencial("0");
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
      (item) => item.nome.toLowerCase() === nomeDaCategoria.toLowerCase(),
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
        item.id !== categoriaEditandoId,
    );

    if (categoriaDuplicada) {
      alert("Já existe uma categoria com esse nome.");
      return;
    }

    if (categoriaEditandoId) {
      const categoriaAntiga = categorias.find(
        (item) => item.id === categoriaEditandoId,
      );

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
          alert(
            "Categoria editada, mas não foi possível atualizar os serviços: " +
              erroServicos.message,
          );
        }
      }
    } else {
      const { error } = await supabase.from("categorias_servicos").insert([
        {
          empresa_id: empresaId,
          nome: nomeFinal,
        },
      ]);

      if (error) {
        alert("Erro ao criar categoria: " + error.message);
        return;
      }
    }

    setMostrarModalCategoria(false);
    setCategoriaEditandoId(null);
    setNomeCategoria("");
    await Promise.all([carregarCategorias(), carregarServicos()]);
  }

  async function excluirCategoria(nomeDaCategoria: string) {
    if (!empresaId) return;

    const servicosNaCategoria = servicos.filter(
      (item) => item.categoria === nomeDaCategoria,
    );

    if (servicosNaCategoria.length > 0) {
      alert(
        `Não é possível excluir esta categoria porque existem ${servicosNaCategoria.length} serviço(s) vinculados a ela.`,
      );
      return;
    }

    const categoriaExistente = categorias.find(
      (item) => item.nome.toLowerCase() === nomeDaCategoria.toLowerCase(),
    );

    if (!categoriaExistente) {
      alert("Esta categoria é padrão ou não foi encontrada no banco.");
      return;
    }

    const confirmar = window.confirm(
      `Deseja excluir a categoria "${nomeDaCategoria}"?`,
    );
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
    const percentualResidencialNormalizado = normalizarNumero(percentualResidencial);
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

    if (
      promocaoAtiva &&
      (precoPromocionalNormalizado === null ||
        precoPromocionalNormalizado < 0)
    ) {
      alert("Informe um preço promocional válido ou desative a promoção.");
      return;
    }

    if (
      promocaoAtiva &&
      precoPromocionalNormalizado !== null &&
      precoPromocionalNormalizado >= precoNormalizado
    ) {
      alert("O preço promocional deve ser menor que o preço padrão.");
      return;
    }

    if (
      retornoAutomatico &&
      (!retornoDiasNormalizado || retornoDiasNormalizado <= 0)
    ) {
      alert("Informe o prazo de retorno em dias.");
      return;
    }

    if (
      retornoAutomatico &&
      retornoAlertaNormalizado !== null &&
      retornoAlertaNormalizado < 0
    ) {
      alert("O alerta de retorno não pode ser negativo.");
      return;
    }

    if (
      atendimentoResidencial &&
      precoResidencialNormalizado !== null &&
      precoResidencialNormalizado < 0
    ) {
      alert("O preço residencial não pode ser negativo.");
      return;
    }

    if (
      atendimentoResidencial &&
      percentualResidencialNormalizado !== null &&
      percentualResidencialNormalizado < 0
    ) {
      alert("O percentual residencial não pode ser negativo.");
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
      promocao_ativa: promocaoAtiva,
      preco_residencial:
        atendimentoResidencial && precoResidencialNormalizado !== null
          ? precoResidencialNormalizado
          : null,
      atendimento_residencial: atendimentoResidencial,
      percentual_residencial:
        atendimentoResidencial && percentualResidencialNormalizado !== null
          ? percentualResidencialNormalizado
          : 0,
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
      ? await supabase
          .from("servicos")
          .update(payload)
          .eq("id", editandoId)
          .eq("empresa_id", empresaId)
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
      item.preco_promocional != null ? String(item.preco_promocional) : "",
    );
    setPromocaoAtiva(!!item.promocao_ativa);
    setPrecoResidencial(
      item.preco_residencial != null ? String(item.preco_residencial) : "",
    );
    setPrecoDescricao(item.preco_descricao || "");
    setDescricao(item.descricao || "");
    setDuracao(
      item.duracao_padrao_minutos != null
        ? String(item.duracao_padrao_minutos)
        : "60",
    );
    setAtendimentoResidencial(!!item.atendimento_residencial);
    setPercentualResidencial(
      item.percentual_residencial != null
        ? String(item.percentual_residencial)
        : "0",
    );
    setAtivo(item.ativo ?? true);
    setRetornoAutomatico(!!item.retorno_automatico);
    setRetornoDias(item.retorno_dias != null ? String(item.retorno_dias) : "");
    setRetornoAlertaDias(
      item.retorno_alerta_dias != null ? String(item.retorno_alerta_dias) : "0",
    );
    setRetornoTipo(item.retorno_tipo || "");
    setEditandoId(item.id);
    setMostrarFormulario(true);
  }

  async function alternarAtivo(item: Servico) {
    const { error } = await supabase
      .from("servicos")
      .update({ ativo: !item.ativo })
      .eq("id", item.id)
      .eq("empresa_id", empresaId);

    if (error) {
      alert("Erro ao alterar status: " + error.message);
      return;
    }

    await carregarServicos();
  }

  async function excluirServico(item: Servico) {
    const confirmar = window.confirm(
      `Deseja excluir o serviço "${item.nome}"?`,
    );
    if (!confirmar) return;

    const { error } = await supabase
      .from("servicos")
      .delete()
      .eq("id", item.id)
      .eq("empresa_id", empresaId);

    if (error) {
      alert("Erro ao excluir serviço: " + error.message);
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
        promocao_ativa: "NÃO",
        atendimento_residencial: "SIM",
        percentual_residencial: 30,
        preco_residencial: "",
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
        promocao_ativa: "SIM",
        atendimento_residencial: "NÃO",
        percentual_residencial: "",
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
      promocao_ativa: item.promocao_ativa ? "SIM" : "NÃO",
      atendimento_residencial: item.atendimento_residencial ? "SIM" : "NÃO",
      percentual_residencial: item.percentual_residencial || "",
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
    if (["nao", "não", "n", "false", "0", "inativo"].includes(texto)) {
      return false;
    }
    return null;
  }

  function normalizarNumero(valor: unknown) {
    if (valor === null || valor === undefined || valor === "") return null;

    const numero = Number(
      String(valor).replace(/R\$/g, "").replace(/\./g, "").replace(",", "."),
    );

    return Number.isFinite(numero) ? numero : null;
  }

  async function importarServicos(e: ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo || !empresaId) return;

    setImportando(true);
    setResumoImportacao(null);

    try {
      const buffer = await arquivo.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const nomeAba =
        workbook.SheetNames.find(
          (nomeSheet) => nomeSheet.toLowerCase() === "servicos",
        ) || workbook.SheetNames[0];

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
        promocao_ativa: boolean;
        preco_residencial: number | null;
        percentual_residencial: number | null;
        atendimento_residencial: boolean;
        preco_descricao: string | null;
        descricao: string | null;
        duracao_padrao_minutos: number;
        ativo: boolean;
        empresa_id: string;
      }> = [];

      const categoriasParaCriar = new Set<string>();
      const chavesArquivo = new Set<string>();

      const servicosExistentes = servicos;
      const categoriasDisponiveis = [
        ...categoriasPadrao,
        ...categorias.map((item) => item.nome),
      ];
      const chavesExistentes = new Set(
        servicosExistentes.map(
          (item) =>
            `${item.nome.toLowerCase()}|${(item.categoria || "").toLowerCase()}`,
        ),
      );

      linhas.forEach((linha, index) => {
        const numeroLinha = index + 2;

        const nomeServico = normalizarTexto(linha.nome);
        const categoriaServico = normalizarTexto(linha.categoria);
        const valorServico = normalizarNumero(linha.valor ?? linha.preco);
        const valorPromocional = normalizarNumero(linha.preco_promocional);
        const promocaoAtivaNormalizada = normalizarBoolean(
          linha.promocao_ativa,
        );
        const valorResidencial = normalizarNumero(linha.preco_residencial);
        const percentualResidencialLinha = normalizarNumero(
          linha.percentual_residencial,
        );
        const duracaoServico = normalizarNumero(
          linha.duracao_minutos ?? linha.duracao_padrao_minutos,
        );
        const descricaoPreco = normalizarTexto(linha.preco_descricao);
        const descricaoServico = normalizarTexto(linha.descricao);
        const ativoNormalizado = normalizarBoolean(linha.ativo);
        const residencialNormalizado = normalizarBoolean(
          linha.atendimento_residencial,
        );

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

        if (promocaoAtivaNormalizada === null) {
          erros.push({
            linha: numeroLinha,
            motivo: "Campo promocao_ativa deve ser SIM ou NÃO.",
          });
          return;
        }

        if (
          promocaoAtivaNormalizada &&
          (valorPromocional === null || valorPromocional < 0)
        ) {
          erros.push({
            linha: numeroLinha,
            motivo: "Preço promocional obrigatório quando promocao_ativa = SIM.",
          });
          return;
        }

        if (
          promocaoAtivaNormalizada &&
          valorPromocional !== null &&
          valorPromocional >= valorServico
        ) {
          erros.push({
            linha: numeroLinha,
            motivo: "Preço promocional deve ser menor que o valor normal.",
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

        if (
          residencialNormalizado &&
          valorResidencial !== null &&
          valorResidencial < 0
        ) {
          erros.push({
            linha: numeroLinha,
            motivo: "Preço residencial não pode ser negativo.",
          });
          return;
        }

        if (
          residencialNormalizado &&
          percentualResidencialLinha !== null &&
          percentualResidencialLinha < 0
        ) {
          erros.push({
            linha: numeroLinha,
            motivo: "Percentual residencial não pode ser negativo.",
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
          (cat) => cat.toLowerCase() === categoriaServico.toLowerCase(),
        );

        if (!categoriaExiste) categoriasParaCriar.add(categoriaServico);

        payloadValido.push({
          nome: nomeServico,
          categoria: categoriaServico,
          preco: valorServico,
          preco_promocional:
            valorPromocional !== null && valorPromocional >= 0
              ? valorPromocional
              : null,
          promocao_ativa: promocaoAtivaNormalizada ?? false,
          preco_residencial:
            residencialNormalizado && valorResidencial !== null
              ? valorResidencial
              : null,
          atendimento_residencial: residencialNormalizado,
          percentual_residencial:
            residencialNormalizado && percentualResidencialLinha !== null
              ? percentualResidencialLinha
              : 0,
          preco_descricao: descricaoPreco || null,
          descricao: descricaoServico || null,
          duracao_padrao_minutos:
            duracaoServico && duracaoServico > 0 ? duracaoServico : 60,
          ativo: ativoNormalizado ?? true,
          empresa_id: empresaId,
        });
      });

      if (categoriasParaCriar.size > 0) {
        const payloadCategorias = Array.from(categoriasParaCriar).map(
          (nomeCategoria) => ({
            empresa_id: empresaId,
            nome: nomeCategoria,
          }),
        );

        const { error } = await supabase
          .from("categorias_servicos")
          .insert(payloadCategorias);

        if (error) {
          alert("Erro ao criar categorias da planilha: " + error.message);
          setImportando(false);
          e.target.value = "";
          return;
        }
      }

      if (payloadValido.length > 0) {
        const { error } = await supabase.from("servicos").insert(payloadValido);

        if (error) {
          alert("Erro ao importar serviços: " + error.message);
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
    } catch (error: any) {
      alert(error?.message || "Erro ao importar arquivo.");
    } finally {
      setImportando(false);
      e.target.value = "";
    }
  }

  const categoriasDisponiveis = useMemo(() => {
    return Array.from(
      new Set([
        ...categoriasPadrao,
        ...categorias.map((item) => item.nome),
        ...servicos.map((item) => item.categoria || "").filter(Boolean),
      ]),
    ).sort((a, b) => a.localeCompare(b));
  }, [categorias, servicos]);

  const servicosPorCategoria = useMemo(() => {
    return categoriasDisponiveis.reduce<Record<string, Servico[]>>(
      (acc, categoriaNome) => {
        acc[categoriaNome] = servicos.filter(
          (item) => (item.categoria || "Sem categoria") === categoriaNome,
        );
        return acc;
      },
      {},
    );
  }, [categoriasDisponiveis, servicos]);

  const totalResidenciais = servicos.filter(
    (item) => item.atendimento_residencial,
  ).length;

  if (carregandoEmpresa || loading) {
    return <div className="p-6">Carregando serviços...</div>;
  }

  if (!empresaId) {
    return <div className="p-6">Empresa não encontrada.</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Catálogo comercial"
        title="Serviços"
        description="Cadastre serviços, categorias, preços, duração e opções residenciais."
        action={
          <div className="flex flex-wrap gap-2">
            <PrimaryButton
              onClick={() => {
                limparFormulario();
                setMostrarFormulario(true);
              }}
            >
              + Serviço
            </PrimaryButton>
            <PrimaryButton onClick={abrirNovaCategoria}>+ Categoria</PrimaryButton>
            <SecondaryButton onClick={exportarServicos}>Exportar</SecondaryButton>
            <SecondaryButton onClick={baixarModelo}>Baixar modelo</SecondaryButton>
            <label className="cursor-pointer rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">
              {importando ? "Importando..." : "Importar serviços"}
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                disabled={importando}
                onChange={importarServicos}
              />
            </label>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <SectionCard>
          <p className="text-sm font-semibold text-slate-500">
            Serviços cadastrados
          </p>
          <p className="mt-4 text-4xl font-black text-slate-900">
            {servicos.length}
          </p>
        </SectionCard>

        <SectionCard>
          <p className="text-sm font-semibold text-slate-500">Categorias</p>
          <p className="mt-4 text-4xl font-black text-slate-900">
            {categoriasDisponiveis.length}
          </p>
        </SectionCard>

        <SectionCard>
          <p className="text-sm font-semibold text-slate-500">Residenciais</p>
          <p className="mt-4 text-4xl font-black text-purple-700">
            {totalResidenciais}
          </p>
        </SectionCard>
      </div>

      {resumoImportacao && (
        <SectionCard>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h3 className="text-lg font-black text-slate-900">
                Resultado da importação
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {resumoImportacao.sucesso} serviço(s) importado(s) com sucesso.
              </p>
            </div>
            <SecondaryButton onClick={() => setResumoImportacao(null)}>
              Fechar resumo
            </SecondaryButton>
          </div>

          {resumoImportacao.erros.length > 0 && (
            <div className="mt-4 max-h-64 overflow-auto rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="font-bold text-amber-900">
                Linhas ignoradas ({resumoImportacao.erros.length})
              </p>
              <div className="mt-3 space-y-2 text-sm text-amber-800">
                {resumoImportacao.erros.map((erro, index) => (
                  <p key={`${erro.linha}-${index}`}>
                    Linha {erro.linha}: {erro.motivo}
                  </p>
                ))}
              </div>
            </div>
          )}
        </SectionCard>
      )}

      {mostrarFormulario && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/50 p-3 md:p-6">
          <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-[32px] bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 md:px-6 md:py-5">
              <div>
                <p className="text-sm font-bold uppercase tracking-wide text-purple-700">
                  {editandoId ? "Edição" : "Novo cadastro"}
                </p>
                <h2 className="text-2xl font-black text-slate-900">
                  {editandoId ? "Editar serviço" : "Novo serviço"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Cadastre ou ajuste as informações do serviço sem sair da lista.
                </p>
              </div>

              <button
                type="button"
                onClick={limparFormulario}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                Fechar
              </button>
            </div>

            <div className="overflow-y-auto px-5 py-5 md:px-6 md:py-6">
              <form onSubmit={salvarServico}>

            <div className="grid gap-4 md:grid-cols-2">
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

              <div className="rounded-2xl border border-slate-200 p-3">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={promocaoAtiva}
                    onChange={(e) => setPromocaoAtiva(e.target.checked)}
                  />
                  Ativar promoção
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Preço promocional"
                  value={precoPromocional}
                  onChange={(e) => setPrecoPromocional(e.target.value)}
                  disabled={!promocaoAtiva}
                  className="mt-3 w-full rounded-2xl border border-slate-200 p-3 disabled:bg-slate-100"
                />
                <p className="mt-2 text-xs text-slate-500">
                  O valor promocional só será usado quando esta opção estiver
                  marcada.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4 md:col-span-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={atendimentoResidencial}
                    onChange={(e) => setAtendimentoResidencial(e.target.checked)}
                  />
                  Permite atendimento residencial
                </label>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Percentual residencial (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Ex: 30"
                      value={percentualResidencial}
                      onChange={(e) => setPercentualResidencial(e.target.value)}
                      disabled={!atendimentoResidencial}
                      className="w-full rounded-2xl border border-slate-200 p-3 disabled:bg-slate-100"
                    />
                    <p className="mt-2 text-xs text-slate-500">
                      Exemplo: 30 acrescenta 30% ao preço do serviço. Se ficar 0, a agenda pode usar o percentual padrão da empresa.
                    </p>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Preço residencial fixo opcional
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Opcional"
                      value={precoResidencial}
                      onChange={(e) => setPrecoResidencial(e.target.value)}
                      disabled={!atendimentoResidencial}
                      className="w-full rounded-2xl border border-slate-200 p-3 disabled:bg-slate-100"
                    />
                    <p className="mt-2 text-xs text-slate-500">
                      Use apenas se quiser um valor fixo específico para este serviço.
                    </p>
                  </div>
                </div>
              </div>

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
                placeholder="Duração padrão em minutos"
                value={duracao}
                onChange={(e) => setDuracao(e.target.value)}
                className="rounded-2xl border border-slate-200 p-3"
              />

              <label className="flex items-center gap-2 rounded-2xl border border-slate-200 p-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={ativo}
                  onChange={(e) => setAtivo(e.target.checked)}
                />
                Serviço ativo
              </label>
            </div>

            <div className="mt-5 rounded-2xl border border-purple-100 bg-purple-50 p-4">
              <label className="flex items-center gap-2 text-sm font-black text-purple-900">
                <input
                  type="checkbox"
                  checked={retornoAutomatico}
                  onChange={(e) => setRetornoAutomatico(e.target.checked)}
                />
                Criar retorno automático ao finalizar este serviço
              </label>

              {retornoAutomatico && (
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <input
                    type="number"
                    min="1"
                    placeholder="Retorno em dias"
                    value={retornoDias}
                    onChange={(e) => setRetornoDias(e.target.value)}
                    className="rounded-2xl border border-purple-100 bg-white p-3"
                  />
                  <input
                    type="number"
                    min="0"
                    placeholder="Alertar antes em dias"
                    value={retornoAlertaDias}
                    onChange={(e) => setRetornoAlertaDias(e.target.value)}
                    className="rounded-2xl border border-purple-100 bg-white p-3"
                  />
                  <input
                    placeholder="Tipo/observação do retorno"
                    value={retornoTipo}
                    onChange={(e) => setRetornoTipo(e.target.value)}
                    className="rounded-2xl border border-purple-100 bg-white p-3"
                  />
                </div>
              )}
            </div>

                <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5">
                  <SecondaryButton type="button" onClick={limparFormulario}>
                    Cancelar
                  </SecondaryButton>
                  <PrimaryButton type="submit">
                    {editandoId ? "Salvar alterações" : "Cadastrar serviço"}
                  </PrimaryButton>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {categoriasDisponiveis.map((categoriaNome) => {
          const lista = servicosPorCategoria[categoriaNome] || [];
          const aberta = categoriaAberta[categoriaNome] ?? true;

          return (
            <SectionCard key={categoriaNome}>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <button
                  type="button"
                  onClick={() =>
                    setCategoriaAberta((prev) => ({
                      ...prev,
                      [categoriaNome]: !aberta,
                    }))
                  }
                  className="flex items-center gap-3 text-left"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-100 text-purple-700">
                    {aberta ? "−" : "+"}
                  </span>
                  <div>
                    <h3 className="text-xl font-black text-slate-900">
                      {categoriaNome}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {lista.length} serviço(s)
                    </p>
                  </div>
                </button>

                <div className="flex flex-wrap gap-2">
                  <SecondaryButton onClick={() => editarCategoria(categoriaNome)}>
                    Editar categoria
                  </SecondaryButton>
                  <SecondaryButton
                    onClick={() => excluirCategoria(categoriaNome)}
                  >
                    Excluir categoria
                  </SecondaryButton>
                </div>
              </div>

              {aberta && (
                <div className="mt-5 overflow-x-auto">
                  {lista.length === 0 ? (
                    <EmptyState
                      title="Nenhum serviço nesta categoria"
                      description="Cadastre serviços ou importe uma planilha para preencher este grupo."
                    />
                  ) : (
                    <table className="min-w-full divide-y divide-slate-100">
                      <thead>
                        <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                          <th className="px-4 py-3">Serviço</th>
                          <th className="px-4 py-3">Descrição</th>
                          <th className="px-4 py-3 text-right">Preço</th>
                          <th className="px-4 py-3 text-right">Promoção</th>
                          <th className="px-4 py-3 text-right">Residencial</th>
                          <th className="px-4 py-3 text-right">Duração</th>
                          <th className="px-4 py-3 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {lista.map((item) => (
                          <tr key={item.id}>
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
                              {item.promocao_ativa && item.preco_promocional
                                ? formatarMoeda(item.preco_promocional)
                                : "--"}
                              {item.promocao_ativa &&
                                item.preco_promocional && (
                                  <div className="mt-1 text-xs font-bold text-emerald-600">
                                    Promoção ativa
                                  </div>
                                )}
                            </td>

                            <td className="px-4 py-4 text-right text-slate-700">
                              {item.atendimento_residencial ? (
                                <div>
                                  <div className="font-bold text-slate-900">
                                    {Number(item.percentual_residencial || 0) > 0
                                      ? `+${Number(item.percentual_residencial || 0)}%`
                                      : "Padrão da empresa"}
                                  </div>
                                  {item.preco_residencial != null && (
                                    <div className="mt-1 text-xs text-slate-500">
                                      Fixo: {formatarMoeda(item.preco_residencial)}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                "--"
                              )}
                            </td>

                            <td className="px-4 py-4 text-right font-bold text-slate-900">
                              {item.duracao_padrao_minutos || 0} min
                            </td>

                            <td className="px-4 py-4">
                              <div className="flex flex-wrap justify-end gap-2">
                                <SecondaryButton
                                  onClick={() => editarServico(item)}
                                >
                                  Editar
                                </SecondaryButton>
                                <SecondaryButton
                                  onClick={() => alternarAtivo(item)}
                                >
                                  {item.ativo ? "Inativar" : "Ativar"}
                                </SecondaryButton>
                                <SecondaryButton
                                  onClick={() => excluirServico(item)}
                                >
                                  Excluir
                                </SecondaryButton>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </SectionCard>
          );
        })}
      </div>

      {mostrarModalCategoria && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <form
            onSubmit={salvarCategoria}
            className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-purple-700">
                  Categoria
                </p>
                <h2 className="text-2xl font-black text-slate-900">
                  {categoriaEditandoId ? "Editar categoria" : "Nova categoria"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMostrarModalCategoria(false);
                  setCategoriaEditandoId(null);
                  setNomeCategoria("");
                }}
                className="rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-600"
              >
                Fechar
              </button>
            </div>

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

              <PrimaryButton type="submit">Salvar categoria</PrimaryButton>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
