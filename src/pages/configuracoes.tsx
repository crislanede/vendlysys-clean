import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useEmpresa } from "../hooks/useEmpresa";

export default function Configuracoes() {
  const { empresaId } = useEmpresa();

  const [nome, setNome] = useState("");
  const [nomeFantasia, setNomeFantasia] = useState("");
  const [telefone, setTelefone] = useState("");
  const [endereco, setEndereco] = useState("");

  const [corPrimaria, setCorPrimaria] = useState("#4b2f3f");
  const [corSecundaria, setCorSecundaria] = useState("#4d6f53");
  const [corFundo, setCorFundo] = useState("#f1f9f5");

  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    carregar();
  }, [empresaId]);

  useEffect(() => {
    aplicarTema();
  }, [corPrimaria, corSecundaria, corFundo]);

  async function carregar() {
    if (!empresaId) return;

    const { data, error } = await supabase
      .from("empresas")
      .select(
        "nome, nome_fantasia, telefone, endereco, cor_primaria, cor_secundaria, cor_fundo"
      )
      .eq("id", empresaId)
      .maybeSingle();

    if (error) {
      alert("Erro ao carregar configurações: " + error.message);
      return;
    }

    if (!data) return;

    setNome(data.nome || "");
    setNomeFantasia(data.nome_fantasia || "");
    setTelefone(data.telefone || "");
    setEndereco(data.endereco || "");

    setCorPrimaria(data.cor_primaria || "#4b2f3f");
    setCorSecundaria(data.cor_secundaria || "#4d6f53");
    setCorFundo(data.cor_fundo || "#f1f9f5");
  }

  function aplicarTema() {
    document.documentElement.style.setProperty("--cor-primaria", corPrimaria);
    document.documentElement.style.setProperty("--cor-secundaria", corSecundaria);
    document.documentElement.style.setProperty("--cor-fundo", corFundo);

    document.documentElement.style.setProperty("--color-primary", corPrimaria);
    document.documentElement.style.setProperty("--color-secondary", corSecundaria);
    document.documentElement.style.setProperty("--color-background", corFundo);
  }

  async function salvar() {
    if (!empresaId) {
      alert("Empresa não encontrada.");
      return;
    }

    setSalvando(true);

    const { error } = await supabase
      .from("empresas")
      .update({
        nome,
        nome_fantasia: nomeFantasia,
        telefone,
        endereco,
        cor_primaria: corPrimaria,
        cor_secundaria: corSecundaria,
        cor_fundo: corFundo,
      })
      .eq("id", empresaId);

    setSalvando(false);

    if (error) {
      alert("Erro ao salvar: " + error.message);
      return;
    }

    aplicarTema();
    alert("Configurações salvas com sucesso!");
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <p
          style={{ color: "var(--cor-primaria, #4b2f3f)" }}
          className="text-sm font-bold uppercase"
        >
          Sistema
        </p>

        <h1 className="text-3xl font-bold text-slate-900">Configurações</h1>
        <p className="text-slate-500">
          Configure os dados e a identidade visual da empresa.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow p-6 space-y-4">
        <h2 className="font-bold text-lg text-slate-900">
          Identidade do estabelecimento
        </h2>

        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nome da empresa"
          className="w-full border rounded-xl px-4 py-3"
        />

        <input
          value={nomeFantasia}
          onChange={(e) => setNomeFantasia(e.target.value)}
          placeholder="Nome fantasia / nome que aparece para o cliente"
          className="w-full border rounded-xl px-4 py-3"
        />

        <input
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
          placeholder="Telefone / WhatsApp"
          className="w-full border rounded-xl px-4 py-3"
        />

        <input
          value={endereco}
          onChange={(e) => setEndereco(e.target.value)}
          placeholder="Endereço"
          className="w-full border rounded-xl px-4 py-3"
        />
      </div>

      <div className="bg-white rounded-2xl shadow p-6 space-y-4">
        <h2 className="font-bold text-lg text-slate-900">Paleta de cores</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="space-y-2">
            <span className="text-sm font-bold text-slate-700">
              Cor primária
            </span>
            <input
              type="color"
              value={corPrimaria}
              onChange={(e) => setCorPrimaria(e.target.value)}
              className="w-full h-12 rounded-xl"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-bold text-slate-700">
              Cor secundária
            </span>
            <input
              type="color"
              value={corSecundaria}
              onChange={(e) => setCorSecundaria(e.target.value)}
              className="w-full h-12 rounded-xl"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-bold text-slate-700">
              Cor de fundo
            </span>
            <input
              type="color"
              value={corFundo}
              onChange={(e) => setCorFundo(e.target.value)}
              className="w-full h-12 rounded-xl"
            />
          </label>
        </div>
      </div>

      <button
        onClick={salvar}
        disabled={salvando}
        style={{ backgroundColor: "var(--cor-primaria, #4b2f3f)" }}
        className="text-white px-6 py-3 rounded-xl font-bold hover:opacity-90 disabled:opacity-60"
      >
        {salvando ? "Salvando..." : "Salvar configurações"}
      </button>
    </div>
  );
}