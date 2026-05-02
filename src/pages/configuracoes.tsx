import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import { supabase } from "../lib/supabase";
import { useEmpresa } from "../hooks/useEmpresa";

export default function Configuracoes() {
  const { empresaId, recarregarEmpresa } = useEmpresa() as any;

  const [nome, setNome] = useState("");
  const [nomeFantasia, setNomeFantasia] = useState("");
  const [telefone, setTelefone] = useState("");
  const [endereco, setEndereco] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  const [corPrimaria, setCorPrimaria] = useState("#4b2f3f");
  const [corSecundaria, setCorSecundaria] = useState("#4d6f53");
  const [corFundo, setCorFundo] = useState("#f1f9f5");

  const [salvando, setSalvando] = useState(false);
  const [enviandoLogo, setEnviandoLogo] = useState(false);

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
        "nome, nome_fantasia, telefone, endereco, cor_primaria, cor_secundaria, cor_fundo, logo_url"
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
    setLogoUrl(data.logo_url || "");

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

  async function enviarLogo(event: ChangeEvent<HTMLInputElement>) {
    const arquivo = event.target.files?.[0];
    if (!arquivo || !empresaId) return;

    const tiposPermitidos = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/svg+xml"];
    if (!tiposPermitidos.includes(arquivo.type)) {
      alert("Envie uma imagem PNG, JPG, WEBP ou SVG.");
      return;
    }

    try {
      setEnviandoLogo(true);

      const extensao = arquivo.name.split(".").pop() || "png";
      const caminho = `${empresaId}/logo-${Date.now()}.${extensao}`;

      const { error: uploadError } = await supabase.storage
        .from("logos")
        .upload(caminho, arquivo, { upsert: true });

      if (uploadError) {
        alert("Erro ao enviar logo: " + uploadError.message);
        return;
      }

      const { data } = supabase.storage.from("logos").getPublicUrl(caminho);
      setLogoUrl(data.publicUrl);
    } finally {
      setEnviandoLogo(false);
    }
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
        logo_url: logoUrl || null,
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
    if (typeof recarregarEmpresa === "function") {
      await recarregarEmpresa();
    }
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
        <h2 className="font-bold text-lg text-slate-900">Logo da empresa</h2>

        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div
            className="w-20 h-20 rounded-full border bg-slate-50 flex items-center justify-center overflow-hidden"
            style={{ borderColor: "var(--cor-primaria, #4b2f3f)" }}
          >
            {logoUrl ? (
              <img src={logoUrl} alt="Logo da empresa" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-black text-slate-500">
                {(nomeFantasia || nome || "E").charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <div className="flex-1 space-y-3">
            <input
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="URL do logo, se preferir colar um link"
              className="w-full border rounded-xl px-4 py-3"
            />

            <label className="inline-flex items-center justify-center rounded-xl px-4 py-3 font-bold text-white cursor-pointer hover:opacity-90"
              style={{ backgroundColor: "var(--cor-primaria, #4b2f3f)" }}
            >
              {enviandoLogo ? "Enviando logo..." : "Enviar imagem do logo"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={enviarLogo}
                disabled={enviandoLogo}
              />
            </label>

            <p className="text-xs text-slate-500">
              Depois de enviar ou colar a URL, clique em Salvar configurações.
            </p>
          </div>
        </div>
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
