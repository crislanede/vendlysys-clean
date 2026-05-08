import { supabase } from "../supabase";

export async function uploadFotoAtendimento(file: File, empresaId: string) {
  const extensao = file.name.split(".").pop() || "jpg";
  const nomeArquivo = `${empresaId}/${Date.now()}-${crypto.randomUUID()}.${extensao}`;

  const { error } = await supabase.storage
    .from("fotos-atendimentos")
    .upload(nomeArquivo, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  return nomeArquivo;
}

export async function criarUrlFotoAtendimento(caminho: string) {
  const { data, error } = await supabase.storage
    .from("fotos-atendimentos")
    .createSignedUrl(caminho, 60 * 60);

  if (error) {
    throw new Error(error.message);
  }

  return data.signedUrl;
}