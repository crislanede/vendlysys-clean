import { supabase } from "../supabase";

export async function uploadFotoAtendimento(file: File, empresaId: string) {
  const nomeSeguro = file.name.replace(/\s+/g, "-").toLowerCase();
  const caminho = `${empresaId}/${Date.now()}-${nomeSeguro}`;

  const { error } = await supabase.storage
    .from("fotos-atendimentos")
    .upload(caminho, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) throw error;

  return caminho;
}

export async function criarUrlFotoAtendimento(caminho: string) {
  const { data, error } = await supabase.storage
    .from("fotos-atendimentos")
    .createSignedUrl(caminho, 60 * 60);

  if (error) throw error;

  return data.signedUrl;
}
