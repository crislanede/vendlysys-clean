import { useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { user, loading } = useAuth();

  const [modo, setModo] = useState<"login" | "cadastro">("login");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [enviando, setEnviando] = useState(false);

  if (!loading && user) {
    return <Navigate to="/agenda" replace />;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);

    try {
      if (modo === "cadastro") {
        const { error } = await supabase.auth.signUp({
          email,
          password: senha,
          options: {
            data: {
              nome,
            },
          },
        });

        if (error) {
          alert(error.message);
          return;
        }

        alert("Cadastro realizado. Agora faça login.");
        setModo("login");
        setSenha("");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: senha,
      });

      if (error) {
        alert(error.message);
        return;
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-800">VendlySys</h1>
        <p className="text-slate-500 mt-1">
          {modo === "login" ? "Entrar no sistema" : "Criar acesso"}
        </p>

        <form onSubmit={handleSubmit} className="space-y-3 mt-6">
          {modo === "cadastro" && (
            <input
              placeholder="Nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="border p-2 w-full rounded"
            />
          )}

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border p-2 w-full rounded"
          />

          <input
            type="password"
            placeholder="Senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="border p-2 w-full rounded"
          />

          <button
            type="submit"
            disabled={enviando}
            className="w-full bg-orange-500 text-white px-4 py-2 rounded"
          >
            {enviando
              ? "Processando..."
              : modo === "login"
              ? "Entrar"
              : "Cadastrar"}
          </button>
        </form>

        <button
          type="button"
          onClick={() =>
            setModo((prev) => (prev === "login" ? "cadastro" : "login"))
          }
          className="mt-4 text-sm text-blue-600"
        >
          {modo === "login"
            ? "Ainda não tenho acesso"
            : "Já tenho acesso"}
        </button>
      </div>
    </div>
  );
}