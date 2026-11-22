import { supabase } from "./supabase";

const bucket = "anamnese";

export async function uploadPdfAnamnese(file: Blob, anamneseId: string, banco = supabase) {
  const caminho = `pdfs/${anamneseId}/${crypto.randomUUID()}.pdf`;
  const { error } = await banco.storage.from(bucket).upload(caminho, file, {
    contentType: "application/pdf",
    upsert: false,
  });
  if (error) throw error;
  return caminho;
}

export async function criarUrlPdfAnamnese(referencia: string) {
  let balde = bucket;
  let caminho = referencia;

  if (/^https?:\/\//.test(referencia)) {
    const url = new URL(referencia);
    const urlProjeto = new URL(import.meta.env.VITE_SUPABASE_URL);
    const arquivo = url.pathname.match(/^\/storage\/v1\/object\/(?:public|sign)\/(anamnese|anamneses)\/(.+)$/);
    if (url.origin !== urlProjeto.origin || !arquivo) return null;
    balde = arquivo[1];
    caminho = decodeURIComponent(arquivo[2]);
  }

  const { data, error } = await supabase.storage.from(balde).createSignedUrl(caminho, 300);
  if (error) return null;
  return data.signedUrl;
}
