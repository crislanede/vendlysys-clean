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
export async function criarUrlPdfPrivado(referencia: string) {
  const url = new URL(referencia, import.meta.env.VITE_SUPABASE_URL);
  const projeto = new URL(import.meta.env.VITE_SUPABASE_URL);
  const arquivo = url.pathname.match(/^\/storage\/v1\/object\/(?:public|sign)\/(anamnese|anamneses)\/(.+)$/);
  if (url.origin !== projeto.origin || !arquivo) return null;

  const { data, error } = await supabase.storage.from(arquivo[1]).createSignedUrl(decodeURIComponent(arquivo[2]), 900);
  if (error) return null;
  return data.signedUrl;
}
