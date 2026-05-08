import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import { supabase } from "../lib/supabase";
import { useEmpresa } from "../hooks/useEmpresa";

export default function Configuracoes() {
  const { empresaId, recarregarEmpresa } = useEmpresa() as any;

  const [nomeEmpresa, setNomeEmpresa] = useState("");
  const [nomeFantasia, setNomeFantasia] = useState("");
  const [telefone, setTelefone] = useState("");
  const [endereco, setEndereco] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  const [corPrimaria, setCorPrimaria] = useState("#4f46e5");
  const [corSecundaria, setCorSecundaria] = useState("#111827");
  const [corFundo, setCorFundo] = useState("#f8fafc");

  const [bannerAtivo, setBannerAtivo] = useState(true);
  const [bannerCategoria, setBannerCategoria] = useState("");
  const [bannerTitulo, setBannerTitulo] = useState("");
  const [bannerTexto, setBannerTexto] = useState("");
  const [bannerBotaoTexto, setBannerBotaoTexto] = useState("");
  const [bannerBotaoLink, setBannerBotaoLink] = useState("");
  const [bannerImagem, setBannerImagem] = useState("");

  const [bannerPosX, setBannerPosX] = useState(50);
  const [bannerPosY, setBannerPosY] = useState(50);
  const [bannerZoom, setBannerZoom] = useState(100);

  const [salvando, setSalvando] = useState(false);
  const [enviandoLogo, setEnviandoLogo] = useState(false);
  const [enviandoBanner, setEnviandoBanner] = useState(false);

  useEffect(() => {
    if (empresaId) carregarConfiguracoes();
  }, [empresaId]);

  useEffect(() => {
    aplicarTema();
  }, [corPrimaria, corSecundaria, corFundo]);

  function aplicarTema() {
    document.documentElement.style.setProperty("--cor-primaria", corPrimaria);
    document.documentElement.style.setProperty("--cor-secundaria", corSecundaria);
    document.documentElement.style.setProperty("--cor-fundo", corFundo);
    document.documentElement.style.setProperty("--color-primary", corPrimaria);
    document.documentElement.style.setProperty("--color-secondary", corSecundaria);
    document.documentElement.style.setProperty("--color-background", corFundo);
  }

  async function carregarConfiguracoes() {
    if (!empresaId) return;

    const { data, error } = await supabase
      .from("empresas")
      .select(`
        nome,
        nome_fantasia,
        telefone,
        endereco,
        logo_url,
        cor_primaria,
        cor_secundaria,
        cor_fundo,
        banner_cliente_ativo,
        banner_cliente_categoria,
        banner_cliente_titulo,
        banner_cliente_texto,
        banner_cliente_botao_texto,
        banner_cliente_botao_link,
        banner_cliente_imagem_url,
        banner_cliente_pos_x,
        banner_cliente_pos_y,
        banner_cliente_zoom
      `)
      .eq("id", empresaId)
      .maybeSingle();

    if (error) {
      console.error(error);
      alert("Erro ao carregar configurações: " + error.message);
      return;
    }

    if (!data) return;

    setNomeEmpresa(data.nome || "");
    setNomeFantasia(data.nome_fantasia || "");
    setTelefone(data.telefone || "");
    setEndereco(data.endereco || "");
    setLogoUrl(data.logo_url || "");

    setCorPrimaria(data.cor_primaria || "#4f46e5");
    setCorSecundaria(data.cor_secundaria || "#111827");
    setCorFundo(data.cor_fundo || "#f8fafc");

    setBannerAtivo(data.banner_cliente_ativo ?? true);
    setBannerCategoria(data.banner_cliente_categoria || "");
    setBannerTitulo(data.banner_cliente_titulo || "");
    setBannerTexto(data.banner_cliente_texto || "");
    setBannerBotaoTexto(data.banner_cliente_botao_texto || "");
    setBannerBotaoLink(data.banner_cliente_botao_link || "");
    setBannerImagem(data.banner_cliente_imagem_url || "");

    setBannerPosX(Number(data.banner_cliente_pos_x ?? 50));
    setBannerPosY(Number(data.banner_cliente_pos_y ?? 50));
    setBannerZoom(Number(data.banner_cliente_zoom ?? 100));
  }

  async function salvarConfiguracoes() {
    if (!empresaId) {
      alert("Empresa não encontrada. Saia e entre novamente no sistema.");
      return;
    }

    setSalvando(true);

    const { error } = await supabase
      .from("empresas")
      .update({
        nome: nomeEmpresa || null,
        nome_fantasia: nomeFantasia || null,
        telefone: telefone || null,
        endereco: endereco || null,
        logo_url: logoUrl || null,

        cor_primaria: corPrimaria || null,
        cor_secundaria: corSecundaria || null,
        cor_fundo: corFundo || null,

        banner_cliente_ativo: bannerAtivo,
        banner_cliente_categoria: bannerCategoria || null,
        banner_cliente_titulo: bannerTitulo || null,
        banner_cliente_texto: bannerTexto || null,
        banner_cliente_botao_texto: bannerBotaoTexto || null,
        banner_cliente_botao_link: bannerBotaoLink || null,
        banner_cliente_imagem_url: bannerImagem || null,
        banner_cliente_pos_x: bannerPosX,
        banner_cliente_pos_y: bannerPosY,
        banner_cliente_zoom: bannerZoom,
      })
      .eq("id", empresaId);

    setSalvando(false);

    if (error) {
      console.error(error);
      alert("Erro ao salvar configurações: " + error.message);
      return;
    }

    aplicarTema();
    await recarregarEmpresa?.();
    alert("Configurações salvas com sucesso!");
  }

  async function enviarLogo(event: ChangeEvent<HTMLInputElement>) {
    const arquivo = event.target.files?.[0];
    if (!arquivo) return;

    if (!empresaId) {
      alert("Empresa não encontrada para enviar o logo.");
      return;
    }

    try {
      setEnviandoLogo(true);

      const nomeSeguro = arquivo.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9.-]/g, "_");

      const extensao = nomeSeguro.split(".").pop() || "png";
      const caminho = `${empresaId}/logo-${Date.now()}.${extensao}`;

      const { error: uploadError } = await supabase.storage
        .from("logos")
        .upload(caminho, arquivo, {
          contentType: arquivo.type || "image/png",
          upsert: true,
        });

      if (uploadError) {
        alert("Erro ao enviar logo: " + uploadError.message);
        return;
      }

      const { data } = supabase.storage.from("logos").getPublicUrl(caminho);
      if (data?.publicUrl) setLogoUrl(data.publicUrl);
    } catch (error) {
      console.error(error);
      alert("Erro inesperado ao enviar logo.");
    } finally {
      setEnviandoLogo(false);
    }
  }

  async function handleUploadBanner(event: ChangeEvent<HTMLInputElement>) {
    const arquivo = event.target.files?.[0];
    if (!arquivo) return;

    if (!empresaId) {
      alert("Empresa não encontrada para enviar a imagem.");
      return;
    }

    try {
      setEnviandoBanner(true);

      const nomeSeguro = arquivo.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9.-]/g, "_");

      const nomeArquivo = `${empresaId}/banner_${Date.now()}_${nomeSeguro}`;

      const { error: uploadError } = await supabase.storage
        .from("campanhas")
        .upload(nomeArquivo, arquivo, {
          contentType: arquivo.type || "image/jpeg",
          upsert: true,
        });

      if (uploadError) {
        console.error("Erro upload banner:", uploadError);
        alert("Erro ao enviar imagem: " + uploadError.message);
        return;
      }

      const { data } = supabase.storage
        .from("campanhas")
        .getPublicUrl(nomeArquivo);

      if (data?.publicUrl) {
        setBannerImagem(data.publicUrl);
        setBannerPosX(50);
        setBannerPosY(50);
        setBannerZoom(100);
      }
    } catch (error) {
      console.error(error);
      alert("Erro inesperado ao enviar imagem.");
    } finally {
      setEnviandoBanner(false);
    }
  }

  return (
    <div className="space-y-8 p-6">
      <div>
        <p
          style={{ color: "var(--cor-primaria, #4f46e5)" }}
          className="text-xs font-bold uppercase"
        >
          Sistema
        </p>

        <h1 className="text-4xl font-black text-slate-900">
          Configurações
        </h1>

        <p className="mt-2 text-slate-500">
          Configure os dados, a identidade visual da empresa e o banner exibido
          no Meu Espaço.
        </p>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">
          Identidade do estabelecimento
        </h2>

        <div className="mt-6 grid gap-4">
          <input
            type="text"
            placeholder="Nome da empresa"
            value={nomeEmpresa}
            onChange={(e) => setNomeEmpresa(e.target.value)}
            className="rounded-2xl border border-slate-300 px-4 py-3"
          />

          <input
            type="text"
            placeholder="Nome fantasia / nome que aparece para o cliente"
            value={nomeFantasia}
            onChange={(e) => setNomeFantasia(e.target.value)}
            className="rounded-2xl border border-slate-300 px-4 py-3"
          />

          <input
            type="text"
            placeholder="Telefone / WhatsApp"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            className="rounded-2xl border border-slate-300 px-4 py-3"
          />

          <input
            type="text"
            placeholder="Endereço"
            value={endereco}
            onChange={(e) => setEndereco(e.target.value)}
            className="rounded-2xl border border-slate-300 px-4 py-3"
          />
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">Logo da empresa</h2>

        <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-center">
          <div
            className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border bg-slate-50"
            style={{ borderColor: "var(--cor-primaria, #4f46e5)" }}
          >
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Logo da empresa"
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-xl font-black text-slate-500">
                {(nomeFantasia || nomeEmpresa || "E").charAt(0)}
              </span>
            )}
          </div>

          <div className="flex-1 space-y-3">
            <input
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="URL do logo, se preferir colar um link"
              className="w-full rounded-2xl border border-slate-300 px-4 py-3"
            />

            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
              onChange={enviarLogo}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3"
            />

            <p className="text-xs text-slate-500">
              {enviandoLogo
                ? "Enviando logo..."
                : "Depois de enviar ou colar a URL, clique em Salvar configurações."}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">Paleta de cores</h2>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <label className="space-y-2">
            <span className="text-sm font-bold text-slate-700">
              Cor primária
            </span>
            <input
              type="color"
              value={corPrimaria}
              onChange={(e) => setCorPrimaria(e.target.value)}
              className="h-12 w-full rounded-xl"
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
              className="h-12 w-full rounded-xl"
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
              className="h-12 w-full rounded-xl"
            />
          </label>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Banner do Meu Espaço
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Edite a campanha, dica ou aviso que aparece para a cliente no Meu
              Espaço.
            </p>
          </div>

          <label className="flex items-center gap-2 rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={bannerAtivo}
              onChange={(e) => setBannerAtivo(e.target.checked)}
            />
            Exibir banner
          </label>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <input
            type="text"
            placeholder="Categoria (ex: Promoção especial)"
            value={bannerCategoria}
            onChange={(e) => setBannerCategoria(e.target.value)}
            className="rounded-2xl border border-slate-300 px-4 py-3"
          />

          <input
            type="text"
            placeholder="Título do banner"
            value={bannerTitulo}
            onChange={(e) => setBannerTitulo(e.target.value)}
            className="rounded-2xl border border-slate-300 px-4 py-3"
          />

          <input
            type="text"
            placeholder="Texto do botão"
            value={bannerBotaoTexto}
            onChange={(e) => setBannerBotaoTexto(e.target.value)}
            className="rounded-2xl border border-slate-300 px-4 py-3"
          />

          <input
            type="text"
            placeholder="Link do botão"
            value={bannerBotaoLink}
            onChange={(e) => setBannerBotaoLink(e.target.value)}
            className="rounded-2xl border border-slate-300 px-4 py-3"
          />
        </div>

        <textarea
          placeholder="Texto do banner"
          value={bannerTexto}
          onChange={(e) => setBannerTexto(e.target.value)}
          className="mt-4 min-h-[140px] w-full rounded-2xl border border-slate-300 px-4 py-3"
        />

        <div className="mt-4">
          <input
            type="file"
            accept="image/*"
            onChange={handleUploadBanner}
            className="w-full rounded-2xl border border-slate-300 px-4 py-3"
          />

          {enviandoBanner && (
            <p className="mt-2 text-sm font-semibold text-violet-700">
              Enviando imagem...
            </p>
          )}
        </div>

        <input
          type="text"
          placeholder="URL da imagem"
          value={bannerImagem}
          onChange={(e) => setBannerImagem(e.target.value)}
          className="mt-4 w-full rounded-2xl border border-slate-300 px-4 py-3"
        />

        <div className="mt-5 grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-3">
          <label className="space-y-2">
            <div className="flex justify-between text-sm font-bold text-slate-700">
              <span>Horizontal</span>
              <span>{bannerPosX}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={bannerPosX}
              onChange={(e) => setBannerPosX(Number(e.target.value))}
              className="w-full"
            />
          </label>

          <label className="space-y-2">
            <div className="flex justify-between text-sm font-bold text-slate-700">
              <span>Vertical</span>
              <span>{bannerPosY}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={bannerPosY}
              onChange={(e) => setBannerPosY(Number(e.target.value))}
              className="w-full"
            />
          </label>

          <label className="space-y-2">
            <div className="flex justify-between text-sm font-bold text-slate-700">
              <span>Zoom</span>
              <span>{bannerZoom}%</span>
            </div>
            <input
              type="range"
              min="100"
              max="200"
              value={bannerZoom}
              onChange={(e) => setBannerZoom(Number(e.target.value))}
              className="w-full"
            />
          </label>
        </div>

        <div className="relative mt-6 min-h-[220px] overflow-hidden rounded-3xl bg-slate-900 text-white">
          {bannerImagem ? (
            <img
              src={bannerImagem}
              alt="Preview do banner"
              className="absolute inset-0 h-full w-full"
              style={{
                objectFit: "cover",
                objectPosition: `${bannerPosX}% ${bannerPosY}%`,
                transform: `scale(${bannerZoom / 100})`,
                transition: "all .2s ease",
              }}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 to-slate-500" />
          )}

          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 to-slate-950/25" />

          <div className="relative z-10 max-w-2xl p-8 md:p-10">
            <p className="text-xs font-black uppercase tracking-widest">
              {bannerCategoria || "Novidade"}
            </p>

            <h3 className="mt-3 text-3xl font-black md:text-5xl">
              {bannerTitulo || "Bem-vinda ao Meu Espaço"}
            </h3>

            <p className="mt-4 max-w-2xl text-sm text-slate-200 md:text-lg">
              {bannerTexto ||
                "Acompanhe novidades, promoções e dicas exclusivas."}
            </p>

            {bannerBotaoTexto && (
              <a
                href={bannerBotaoLink || "#"}
                target="_blank"
                rel="noreferrer"
                className="mt-6 inline-flex rounded-2xl bg-white px-6 py-3 font-bold text-slate-900"
              >
                {bannerBotaoTexto}
              </a>
            )}
          </div>
        </div>
      </div>

      <button
        onClick={() => void salvarConfiguracoes()}
        disabled={salvando}
        style={{ backgroundColor: "var(--cor-primaria, #4f46e5)" }}
        className="rounded-2xl px-8 py-4 font-bold text-white hover:opacity-90 disabled:opacity-60"
      >
        {salvando ? "Salvando..." : "Salvar configurações"}
      </button>
    </div>
  );
}