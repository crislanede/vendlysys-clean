import { createClient } from "@supabase/supabase-js";

export const supabaseMeuEspaco = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      storageKey: "vendlysys-meu-espaco-auth",
      detectSessionInUrl: false,
    },
  },
);

export function telefoneBrasileiroWhatsApp(telefone: string) {
  const digitos = telefone.replace(/\D/g, "");
  if (/^[1-9]\d{9,10}$/.test(digitos)) return `+55${digitos}`;
  if (/^55[1-9]\d{9,10}$/.test(digitos)) return `+${digitos}`;
  return null;
}
