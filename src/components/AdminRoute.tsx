import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

type Props = {
  children: React.ReactNode;
};

export default function AdminRoute({ children }: Props) {
  const [loading, setLoading] = useState(true);
  const [liberado, setLiberado] = useState(false);

  useEffect(() => {
    verificarAcesso();
  }, []);

  async function verificarAcesso() {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user?.email) {
      setLiberado(false);
      setLoading(false);
      return;
    }

    const emailNormalizado = user.email.trim().toLowerCase();

    const { data: usuario, error } = await supabase
      .from("usuarios")
      .select("id, email, perfil")
      .ilike("email", emailNormalizado)
      .in("perfil", ["super_admin", "admin_saas"])
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Erro ao validar admin:", error);
      setLiberado(false);
    } else {
      setLiberado(!!usuario);
    }

    setLoading(false);
  }

  if (loading) {
    return <div className="p-6">Verificando acesso...</div>;
  }

  if (!liberado) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}