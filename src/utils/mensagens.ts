export function substituirVariaveisMensagemAgenda(
  modelo: string,
  variaveis: Record<string, string>,
) {
  return Object.entries(variaveis).reduce(
    (texto, [chave, valor]) =>
      texto.replaceAll(`{{${chave}}}`, valor),
    modelo,
  );
}