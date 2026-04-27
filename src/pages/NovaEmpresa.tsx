import { useState } from "react";
import { supabase } from "../lib/supabase";

function gerarSlug(nome: string) {
  return nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function somenteNumeros(valor: string) {
  return valor.replace(/\D/g, "");
}

export default function NovaEmpresa() {
  const [nomeEmpresa, setNomeEmpresa] = useState("");
  const [documento, setDocumento] = useState("");
  const [telefone, setTelefone] = useState("");

  const [carregando, setCarregando] = useState(false);

  async function criar() {
    if (!nomeEmpresa || !documento) {
      alert("Preencha nome e CPF/CNPJ");
      return;
    }

    setCarregando(true);

    const slug = gerarSlug(nomeEmpresa);
    const documentoLimpo = somenteNumeros(documento);

    const tipoDocumento =
      documentoLimpo.length > 11 ? "cnpj" : "cpf";

    // 🔐 pega usuário logado
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    if (!userId) {
      alert("Usuário não autenticado");
      setCarregando(false);
      return;
    }

    // 🚫 evita duplicidade por CNPJ/CPF
    const { data: existente } = await supabase
      .from("empresas")
      .select("id")
      .eq("documento", documentoLimpo)
      .maybeSingle();

    if (existente) {
      alert("Já existe uma empresa com esse CPF/CNPJ.");
      setCarregando(false);
      return;
    }

    // 💾 cria empresa
    const { data: empresaCriada, error } = await supabase
      .from("empresas")
      .insert({
        nome: nomeEmpresa,
        slug,
        telefone,
        documento: documentoLimpo,
        tipo_documento: tipoDocumento,
        user_id: userId,
        ativa: true,
        plano: "teste",
        status_assinatura: "trial",
        trial_inicio: new Date().toISOString(),
        trial_fim: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000
        ).toISOString(),
      })
      .select("id")
      .single();

    if (error || !empresaCriada) {
      alert("Erro ao criar empresa: " + error?.message);
      setCarregando(false);
      return;
    }

    // 🔗 vínculo com usuário
    await supabase.from("usuarios_empresas").insert({
      user_id: userId,
      empresa_id: empresaCriada.id,
      perfil: "admin",
      ativo: true,
    });

    alert("Empresa criada com sucesso!");

    // 🔄 força recarregar sistema com nova empresa
    window.location.href = "/dashboard";
  }

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">
        Nova empresa
      </h1>

      <div className="bg-white p-6 rounded-2xl shadow space-y-4">
        <input
          placeholder="Nome da empresa"
          value={nomeEmpresa}
          onChange={(e) => setNomeEmpresa(e.target.value)}
          className="w-full border rounded-xl px-4 py-3"
        />

        <input
          placeholder="CPF ou CNPJ"
          value={documento}
          onChange={(e) => setDocumento(e.target.value)}
          className="w-full border rounded-xl px-4 py-3"
        />

        <input
          placeholder="Telefone"
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
          className="w-full border rounded-xl px-4 py-3"
        />

        <button
          onClick={criar}
          disabled={carregando}
          className="w-full bg-pink-600 text-white rounded-xl py-3 font-bold"
        >
          {carregando
            ? "Criando..."
            : "Criar nova empresa"}
        </button>
      </div>
    </div>
  );
}