import { supabase } from "./supabase";

export async function uploadPdfAnamnese(
  file: Blob,
  clienteNome: string,
  anamneseId: string
) {
  const nomeArquivo = `anamnese_${clienteNome}_${anamneseId}.pdf`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .toLowerCase();

  const caminho = `pdfs/${nomeArquivo}`;

  const { error } = await supabase.storage
    .from("anamneses")
    .upload(caminho, file, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (error) {
    console.error("Erro no upload do PDF:", error);
    throw error;
  }

  const { data } = supabase.storage
    .from("anamneses")
    .getPublicUrl(caminho);

  return data.publicUrl;
}