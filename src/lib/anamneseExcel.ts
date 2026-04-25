import * as XLSX from "xlsx";

type CampoExcel = {
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

type ConfigExcel = {
  titulo: string;
  descricao: string;
  termo_responsabilidade: string;
  obrigatoria: boolean;
  campos: CampoExcel[];
};

export function baixarModeloExcelAnamnese() {
  const wb = XLSX.utils.book_new();

  const abaConfiguracao = XLSX.utils.json_to_sheet([
    {
      titulo: "Ficha de Anamnese",
      descricao: "Preencha suas informações",
      termo_responsabilidade:
        "Declaro que as informações prestadas são verdadeiras e me responsabilizo por sua exatidão.",
      obrigatoria: "SIM",
    },
  ]);

  const abaCampos = XLSX.utils.json_to_sheet([
    {
      nome_campo: "alergias",
      pergunta: "Possui alergia?",
      tipo: "sim_nao_justificativa",
      obrigatorio: "SIM",
      placeholder: "Descreva a alergia",
      ajuda: "Se marcar Sim, informe qual alergia possui",
      opcoes: "",
      gera_alerta: "SIM",
    },
    {
      nome_campo: "fungos",
      pergunta: "Possui fungo nas unhas?",
      tipo: "sim_nao_justificativa",
      obrigatorio: "SIM",
      placeholder: "Descreva a situação",
      ajuda: "Se marcar Sim, detalhe a região ou condição",
      opcoes: "",
      gera_alerta: "SIM",
    },
  ]);

  XLSX.utils.book_append_sheet(wb, abaConfiguracao, "configuracao");
  XLSX.utils.book_append_sheet(wb, abaCampos, "campos");

  XLSX.writeFile(wb, "modelo-anamnese.xlsx");
}

export async function lerModeloExcelAnamnese(
  file: File
): Promise<ConfigExcel> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array" });

  const sheetConfig = wb.Sheets["configuracao"];
  const sheetCampos = wb.Sheets["campos"];

  if (!sheetCampos) {
    throw new Error("A aba 'campos' não foi encontrada.");
  }

  const configRows = XLSX.utils.sheet_to_json<any>(sheetConfig || {});
  const camposRows = XLSX.utils.sheet_to_json<any>(sheetCampos);

  const config = configRows[0] || {};

  const camposNormalizados = camposRows
    .map((c: any, index: number) => ({
      nome_campo: String(c.nome_campo || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_"),
      label: String(c.pergunta || "").trim(),
      tipo: String(c.tipo || "text").trim(),
      obrigatorio: String(c.obrigatorio || "").toUpperCase() === "SIM",
      placeholder: String(c.placeholder || "").trim(),
      ajuda: String(c.ajuda || "").trim(),
      opcoes: c.opcoes
        ? String(c.opcoes)
            .split("|")
            .map((o: string) => o.trim())
            .filter(Boolean)
        : [],
      ordem: index,
      ativo: true,
      gera_alerta: String(c.gera_alerta || "").toUpperCase() === "SIM",
    }))
    .filter((campo) => campo.nome_campo && campo.label);

  const mapa = new Map<string, CampoExcel>();

  for (const campo of camposNormalizados) {
    if (!mapa.has(campo.nome_campo)) {
      mapa.set(campo.nome_campo, campo);
    }
  }

  return {
    titulo: config.titulo || "Ficha de Anamnese",
    descricao: config.descricao || "",
    termo_responsabilidade: config.termo_responsabilidade || "",
    obrigatoria: String(config.obrigatoria || "").toUpperCase() === "SIM",
    campos: Array.from(mapa.values()).map((campo, index) => ({
      ...campo,
      ordem: index,
    })),
  };
}