import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function CadastroEmpresa() {
  const [nome, setNome] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [telefone, setTelefone] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function cadastrar() {
    if (!nome || !responsavel || !email || !senha) {
      alert("Preencha os campos obrigatórios.");
      return;
    }

    setCarregando(true);

    try {
      // 🔹 1. Criar usuário no Supabase Auth
      const { data: userData, error: userError } =
        await supabase.auth.signUp({
          email,
          password: senha,
        });

      if (userError) throw userError;

      const userId = userData.user?.id;

      if (!userId) throw new Error("Erro ao criar usuário.");

      // 🔹 2. Criar empresa
      const { data: empresaCriada, error: empresaError } =
        await supabase
          .from("empresas")
          .insert({
            nome,
            responsavel,
            telefone,
            user_id: userId,
            slug: nome.toLowerCase().replace(/\s+/g, "-"),
          })
          .select()
          .single();

      if (empresaError) throw empresaError;

      // 🔥 3. VINCULAR USUÁRIO À EMPRESA (ESSENCIAL)
      const { error: vinculoError } = await supabase
        .from("usuarios_empresas")
        .upsert({
          user_id: userId,
          empresa_id: empresaCriada.id,
          perfil: "admin",
          ativo: true,
        });

      if (vinculoError) throw vinculoError;

      // 🔹 4. Inserir também na tabela usuarios (opcional, se usar)
      await supabase.from("usuarios").upsert({
        id: userId,
        email,
        perfil: "admin",
        empresa_id: empresaCriada.id,
      });

      alert("Empresa criada com sucesso 🚀");

      window.location.href = "/login";
    } catch (err: any) {
      console.error(err);
      alert("Erro: " + err.message);
    }

    setCarregando(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl p-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">
          Comece seu teste grátis
        </h1>

        <p className="text-slate-500 mb-6">
          Cadastre sua empresa e use o sistema por 7 dias grátis.
        </p>

        <div className="grid grid-cols-2 gap-4">
          <input
            placeholder="Nome da empresa"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="border rounded-xl px-4 py-3"
          />

          <input
            placeholder="Responsável"
            value={responsavel}
            onChange={(e) => setResponsavel(e.target.value)}
            className="border rounded-xl px-4 py-3"
          />

          <input
            placeholder="Telefone"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            className="border rounded-xl px-4 py-3"
          />

          <input
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border rounded-xl px-4 py-3"
          />

          <input
            type="password"
            placeholder="Senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="border rounded-xl px-4 py-3 col-span-2"
          />
        </div>

        <button
          onClick={cadastrar}
          disabled={carregando}
          className="w-full mt-6 bg-purple-700 text-white rounded-xl py-3 font-semibold"
        >
          {carregando ? "Criando..." : "Criar conta grátis"}
        </button>
      </div>
    </div>
  );
}