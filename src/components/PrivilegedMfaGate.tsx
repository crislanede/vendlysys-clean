import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { filtroEmailExato } from "../lib/email";

export default function PrivilegedMfaGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"loading" | "allowed" | "mfa" | "login">("loading");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (!active) return;
        if (userError || !user?.email) { setStatus("login"); return; }
        const { data: admin, error } = await supabase.from("usuarios")
          .select("id").filter("email", "imatch", filtroEmailExato(user.email))
          .in("perfil", ["super_admin", "admin_saas"]).limit(1).maybeSingle();
        if (!active) return;
        if (error) { setStatus("login"); return; }
        if (!admin) { setStatus("allowed"); return; }
        const { data: assurance, error: mfaError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (active) setStatus(!mfaError && assurance?.currentLevel === "aal2" ? "allowed" : "mfa");
      } catch {
        if (active) setStatus("login");
      }
    })();
    return () => { active = false; };
  }, []);

  if (status === "loading") return <div className="p-8">Verificando segurança da sessão...</div>;
  if (status === "login") return <Navigate to="/login" replace />;
  if (status === "mfa") return <Navigate to="/mfa" replace />;
  return <>{children}</>;
}
