import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: any) {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });

    if (error) {
      alert("E-mail ou senha inválidos");
      setLoading(false);
      return;
    }

    // 🔥 REDIRECIONAMENTO POR PERFIL
    const { data: userData } = await supabase.auth.getUser();

    const userEmail = userData.user?.email;

    const { data: usuario } = await supabase
      .from("usuarios")
      .select("perfil")
      .eq("email", userEmail)
      .single();

    if (["super_admin", "admin_saas"].includes(usuario?.perfil)) {
      window.location.href = "/admin/empresas";
    } else {
      window.location.href = "/dashboard";
    }
  }

  async function handleResetPassword() {
    if (!email) {
      alert("Digite seu e-mail primeiro");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/resetar-senha",
    });

    if (error) {
      alert("Erro ao enviar e-mail de redefinição");
    } else {
      alert("E-mail de redefinição enviado!");
    }
  }

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#f3f4f6",
      }}
    >
      <form
        onSubmit={handleLogin}
        style={{
          background: "#fff",
          padding: 40,
          borderRadius: 16,
          width: 360,
          boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
        }}
      >
        <h1 style={{ marginBottom: 10 }}>Entrar no VendlySys</h1>
        <p style={{ marginBottom: 20, color: "#6b7280" }}>
          Acesse sua agenda, clientes e financeiro.
        </p>

        <input
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
        />

        <input
          type="password"
          placeholder="Senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          style={inputStyle}
        />

        <button type="submit" style={buttonStyle} disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
        </button>

        {/* 🔐 RESET SENHA */}
        <div style={{ marginTop: 12, textAlign: "center" }}>
          <button
            type="button"
            onClick={handleResetPassword}
            style={{
              background: "none",
              border: "none",
              color: "#6D28D9",
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            Esqueci minha senha
          </button>
        </div>

        <p style={{ marginTop: 20, textAlign: "center" }}>
          Ainda não tem conta?{" "}
          <span style={{ color: "#6D28D9", cursor: "pointer" }}>
            Teste grátis por 7 dias
          </span>
        </p>
      </form>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: 12,
  marginBottom: 12,
  borderRadius: 8,
  border: "1px solid #ccc",
};

const buttonStyle = {
  width: "100%",
  padding: 12,
  borderRadius: 8,
  border: "none",
  background: "#4c1d2f",
  color: "#fff",
  cursor: "pointer",
};