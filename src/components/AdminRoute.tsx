import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function AdminRoute({ children }: any) {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    verificarAdmin();
  }, []);

  async function verificarAdmin() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("admins")
      .select("id")
      .eq("email", user.email)
      .eq("ativo", true)
      .maybeSingle();

    setIsAdmin(!!data);
    setLoading(false);
  }

  if (loading) {
    return <div className="p-6">Verificando acesso...</div>;
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}