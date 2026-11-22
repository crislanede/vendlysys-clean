import { useState } from "react";
import { supabase } from "../lib/supabase";
import { filtroEmailExato, normalizarEmail } from "../lib/email";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: any) {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: normalizarEmail(email),
      password: senha,
    });

    if (error) {
      alert("E-mail ou senha inválidos");
      setLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      await supabase.auth.signOut();
      alert("Não foi possível validar sua sessão. Entre novamente.");
      setLoading(false);
      return;
    }

    const { data: admin, error: adminError } = await supabase
      .from("usuarios")
      .select("id")
      .filter("email", "imatch", filtroEmailExato(user.email))
      .in("perfil", ["super_admin", "admin_saas"])
      .limit(1)
      .maybeSingle();

    if (adminError) {
      alert("Não foi possível validar suas permissões. Tente novamente.");
      setLoading(false);
      return;
    }

    if (admin) {
      const { data: assurance, error: assuranceError } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      window.location.href = assuranceError || assurance?.currentLevel !== "aal2"
        ? "/mfa"
        : "/admin/empresas";
      return;
    }

    window.location.href = "/dashboard";
  }

  async function handleResetPassword() {
    const emailNormalizado = normalizarEmail(email);
    if (!emailNormalizado) {
      alert("Digite seu e-mail primeiro");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(emailNormalizado, {
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
          autoComplete="username"
          autoCapitalize="none"
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