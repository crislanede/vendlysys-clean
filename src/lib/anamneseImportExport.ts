type CampoAnamneseExport = {
  nome_campo: string;
  label: string;
  tipo: string;
  obrigatorio: boolean;
  placeholder: string;
  ajuda: string;
  opcoes: string[];
  ordem: number;
  ativo: boolean;
};

type ModeloAnamneseExport = {
  titulo: string;
  descricao: string;
  termo_responsabilidade: string;
  obrigatoria: boolean;
  ativo: boolean;
  campos: CampoAnamneseExport[];
};

export function baixarConfiguracaoAnamnese(config: ModeloAnamneseExport) {
  const blob = new Blob([JSON.stringify(config, null, 2)], {
    type: "application/json",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "configuracao-anamnese.json";
  link.click();
  URL.revokeObjectURL(url);
}

export async function lerConfiguracaoAnamnese(
  file: File
): Promise<ModeloAnamneseExport> {
  const texto = await file.text();
  const json = JSON.parse(texto);

  if (!json || typeof json !== "object") {
    throw new Error("Arquivo inválido.");
  }

  if (!Array.isArray(json.campos)) {
    throw new Error("Arquivo sem campos da anamnese.");
  }

  return {
    titulo: json.titulo || "Ficha de Anamnese",
    descricao: json.descricao || "",
    termo_responsabilidade: json.termo_responsabilidade || "",
    obrigatoria: Boolean(json.obrigatoria),
    ativo: json.ativo !== false,
    campos: json.campos.map((campo: any, index: number) => ({
      nome_campo: campo.nome_campo || "",
      label: campo.label || "",
      tipo: campo.tipo || "text",
      obrigatorio: Boolean(campo.obrigatorio),
      placeholder: campo.placeholder || "",
      ajuda: campo.ajuda || "",
      opcoes: Array.isArray(campo.opcoes) ? campo.opcoes : [],
      ordem: typeof campo.ordem === "number" ? campo.ordem : index,
      ativo: campo.ativo !== false,
    })),
  };
}