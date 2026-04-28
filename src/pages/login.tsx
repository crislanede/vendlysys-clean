import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function entrar() {
    if (!email || !senha) {
      alert("Informe e-mail e senha.");
      return;
    }

    setCarregando(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });

    setCarregando(false);

    if (error) {
      alert("Erro ao entrar: " + error.message);
      return;
    }

    window.location.href = "/agenda";
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">
          Entrar no VendlySys
        </h1>

        <p className="text-slate-500 mb-6">
          Acesse sua agenda, clientes e financeiro.
        </p>

        <div className="space-y-4">
          <input
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded-xl px-4 py-3"
          />

          <input
            type="password"
            placeholder="Senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="w-full border rounded-xl px-4 py-3"
          />

          <button
  onClick={entrar}
  disabled={carregando}
  style={{ backgroundColor: "var(--cor-primaria)" }}
  className="w-full text-white rounded-xl py-3 font-semibold"
>
            {carregando ? "Entrando..." : "Entrar"}
          </button>
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          Ainda não tem conta?{" "}
          <a href="/cadastro-empresa" style={{ color: "var(--cor-primaria, #4b2f3f)" }}
            className="font-semibold">
            Teste grátis por 7 dias
          </a>
        </p>
      </div>
    </div>
  );
}