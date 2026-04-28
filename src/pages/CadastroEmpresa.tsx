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

export default function CadastroEmpresa() {
  const [nomeEmpresa, setNomeEmpresa] = useState("");
  const [nomeResponsavel, setNomeResponsavel] = useState("");
  const [documento, setDocumento] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");

  const [cep, setCep] = useState("");
  const [endereco, setEndereco] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");

  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function cadastrar() {
    if (
      !nomeEmpresa ||
      !nomeResponsavel ||
      !documento ||
      !email ||
      !telefone ||
      !senha
    ) {
      alert("Preencha empresa, responsável, CPF/CNPJ, e-mail, telefone e senha.");
      return;
    }

    if (senha.length < 6) {
      alert("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    setCarregando(true);

    const slug = gerarSlug(nomeEmpresa);
    const documentoLimpo = somenteNumeros(documento);
    const telefoneLimpo = somenteNumeros(telefone);

    const tipoDocumento =
      documentoLimpo.length > 11 ? "cnpj" : "cpf";

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password: senha,
    });

    if (authError) {
      setCarregando(false);
      alert("Erro ao criar usuário: " + authError.message);
      return;
    }

    const userId = authData.user?.id;

    if (!userId) {
      setCarregando(false);
      alert("Erro ao obter ID do usuário.");
      return;
    }

    const ehAurea = slug.includes("aurea") || slug.includes("espaco-aurea");

    const trialFim = new Date();
    trialFim.setDate(trialFim.getDate() + 7);

    const { data: empresaCriada, error: empresaError } = await supabase
      .from("empresas")
      .insert({
        nome: nomeEmpresa.trim(),
        slug,
        email: email.trim().toLowerCase(),
        telefone: telefoneLimpo,
        responsavel_nome: nomeResponsavel.trim(),
        documento: documentoLimpo,
        tipo_documento: tipoDocumento,
        endereco: endereco.trim(),
        numero: numero.trim(),
        complemento: complemento.trim(),
        bairro: bairro.trim(),
        cidade: cidade.trim(),
        estado: estado.trim().toUpperCase(),
        cep: somenteNumeros(cep),
        user_id: userId,
        ativa: true,
        plano: ehAurea ? "vitalicio" : "teste",
        status_assinatura: ehAurea ? "vitalicio" : "trial",
        licenca_vitalicia: ehAurea,
        trial_inicio: ehAurea ? null : new Date().toISOString(),
        trial_fim: ehAurea ? null : trialFim.toISOString(),
        bloqueada: false,
        origem_cadastro: "site",
      })
      .select("id")
      .single();

    if (empresaError || !empresaCriada?.id) {
      setCarregando(false);
      alert(
        "Usuário criado, mas erro ao criar empresa: " +
          (empresaError?.message || "empresa não retornada")
      );
      return;
    }

    const { error: vinculoError } = await supabase
      .from("usuarios_empresas")
      .insert({
        user_id: userId,
        empresa_id: empresaCriada.id,
        perfil: "admin",
        ativo: true,
      });

    setCarregando(false);

    if (vinculoError) {
      alert(
        "Empresa criada, mas erro ao vincular usuário: " +
          vinculoError.message
      );
      return;
    }

    alert(
      ehAurea
        ? "Cadastro criado com licença vitalícia!"
        : "Cadastro criado com sucesso! Você tem 7 dias grátis."
    );

    window.location.href = "/login";
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-xl p-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">
          Comece seu teste grátis
        </h1>

        <p className="text-slate-500 mb-6">
          Cadastre sua empresa e use o VendlySys por 7 dias grátis.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            placeholder="Nome da empresa"
            value={nomeEmpresa}
            onChange={(e) => setNomeEmpresa(e.target.value)}
            className="w-full border rounded-xl px-4 py-3"
          />

          <input
            placeholder="Nome do responsável"
            value={nomeResponsavel}
            onChange={(e) => setNomeResponsavel(e.target.value)}
            className="w-full border rounded-xl px-4 py-3"
          />

          <input
            placeholder="CPF ou CNPJ"
            value={documento}
            onChange={(e) => setDocumento(e.target.value)}
            className="w-full border rounded-xl px-4 py-3"
          />

          <input
            type="email"
            placeholder="E-mail de acesso"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded-xl px-4 py-3"
          />

          <input
            placeholder="Telefone / WhatsApp"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            className="w-full border rounded-xl px-4 py-3"
          />

          <input
            type="password"
            placeholder="Crie uma senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="w-full border rounded-xl px-4 py-3"
          />

          <input
            placeholder="CEP"
            value={cep}
            onChange={(e) => setCep(e.target.value)}
            className="w-full border rounded-xl px-4 py-3"
          />

          <input
            placeholder="Endereço"
            value={endereco}
            onChange={(e) => setEndereco(e.target.value)}
            className="w-full border rounded-xl px-4 py-3"
          />

          <input
            placeholder="Número"
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            className="w-full border rounded-xl px-4 py-3"
          />

          <input
            placeholder="Complemento"
            value={complemento}
            onChange={(e) => setComplemento(e.target.value)}
            className="w-full border rounded-xl px-4 py-3"
          />

          <input
            placeholder="Bairro"
            value={bairro}
            onChange={(e) => setBairro(e.target.value)}
            className="w-full border rounded-xl px-4 py-3"
          />

          <input
            placeholder="Cidade"
            value={cidade}
            onChange={(e) => setCidade(e.target.value)}
            className="w-full border rounded-xl px-4 py-3"
          />

          <input
            placeholder="Estado / UF"
            value={estado}
            maxLength={2}
            onChange={(e) => setEstado(e.target.value)}
            className="w-full border rounded-xl px-4 py-3"
          />
        </div>

        <button
          onClick={cadastrar}
          disabled={carregando}
          style={{ backgroundColor: "var(--cor-primaria, #4b2f3f)" }}
          className="w-full mt-6 text-white rounded-xl py-3 font-semibold hover:opacity-90 transition disabled:opacity-60"
        >
          {carregando ? "Criando cadastro..." : "Criar conta grátis"}
        </button>

        <p className="text-center text-sm text-slate-500 mt-6">
          Já tem conta?{" "}
          <a href="/login" style={{ color: "var(--cor-primaria, #4b2f3f)" }}
            className="font-semibold">
            Entrar
          </a>
        </p>
      </div>
    </div>
  );
}