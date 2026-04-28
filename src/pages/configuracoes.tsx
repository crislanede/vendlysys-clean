import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useEmpresa } from "../hooks/useEmpresa";

export default function Configuracoes() {
  const { empresaId } = useEmpresa();

  const [nome, setNome] = useState("");

  const [corPrimaria, setCorPrimaria] = useState("#4b2f3f");
  const [corSecundaria, setCorSecundaria] = useState("#6b4c5a");
  const [corFundo, setCorFundo] = useState("#f5f5f5");

  useEffect(() => {
    carregar();
  }, [empresaId]);

  useEffect(() => {
    aplicarTema();
  }, [corPrimaria, corSecundaria, corFundo]);

  async function carregar() {
    if (!empresaId) return;

    const { data } = await supabase
      .from("empresas")
      .select("nome, cor_primaria, cor_secundaria, cor_fundo")
      .eq("id", empresaId)
      .maybeSingle();

    if (!data) return;

    setNome(data.nome || "");

    setCorPrimaria(data.cor_primaria || "#4b2f3f");
    setCorSecundaria(data.cor_secundaria || "#6b4c5a");
    setCorFundo(data.cor_fundo || "#f5f5f5");
  }

  function aplicarTema() {
    document.documentElement.style.setProperty(
      "--cor-primaria",
      corPrimaria
    );

    document.documentElement.style.setProperty(
      "--cor-secundaria",
      corSecundaria
    );

    document.documentElement.style.setProperty(
      "--cor-fundo",
      corFundo
    );
  }

  async function salvar() {
    if (!empresaId) return;

    const { error } = await supabase
      .from("empresas")
      .update({
        nome,
        cor_primaria: corPrimaria,
        cor_secundaria: corSecundaria,
        cor_fundo: corFundo,
      })
      .eq("id", empresaId);

    if (error) {
      alert(error.message);
      return;
    }

    aplicarTema();
    alert("Configurações salvas!");
  }

  return (
    <div
      className="p-6 space-y-6"
      style={{ backgroundColor: "var(--cor-fundo)" }}
    >
      <div>
        <p
          style={{ color: "var(--cor-primaria)" }}
          className="text-sm font-bold uppercase"
        >
          Sistema
        </p>

        <h1 className="text-2xl font-bold">
          Configurações
        </h1>
      </div>

      {/* EMPRESA */}
      <div className="bg-white rounded-xl p-6 shadow">
        <h2 className="font-bold mb-4">
          Identidade do estabelecimento
        </h2>

        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="w-full border rounded-xl px-4 py-3"
          placeholder="Nome da empresa"
        />
      </div>

      {/* CORES */}
      <div className="bg-white rounded-xl p-6 shadow">
        <h2 className="font-bold mb-4">
          Cores do sistema
        </h2>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-sm">Cor primária</label>
            <input
              type="color"
              value={corPrimaria}
              onChange={(e) =>
                setCorPrimaria(e.target.value)
              }
              className="w-full h-10 mt-1"
            />
          </div>

          <div>
            <label className="text-sm">Cor secundária</label>
            <input
              type="color"
              value={corSecundaria}
              onChange={(e) =>
                setCorSecundaria(e.target.value)
              }
              className="w-full h-10 mt-1"
            />
          </div>

          <div>
            <label className="text-sm">Cor de fundo</label>
            <input
              type="color"
              value={corFundo}
              onChange={(e) =>
                setCorFundo(e.target.value)
              }
              className="w-full h-10 mt-1"
            />
          </div>
        </div>
      </div>

      {/* BOTÃO */}
      <button
        onClick={salvar}
        style={{ backgroundColor: "var(--cor-primaria)" }}
        className="text-white px-6 py-3 rounded-xl font-bold"
      >
        Salvar
      </button>
    </div>
  );
} 