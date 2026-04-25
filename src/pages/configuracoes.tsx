import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

import PageHeader from "../components/ui/PageHeader";
import SectionCard from "../components/ui/SectionCard";
import PrimaryButton from "../components/ui/PrimaryButton";
import SecondaryButton from "../components/ui/SecondaryButton";
import { aplicarTema } from "../components/theme/ThemeLoader";

type Configuracao = {
  id?: string | number;
  nome_empresa?: string | null;
  nome_fantasia?: string | null;
  cor_primaria?: string | null;
  cor_secundaria?: string | null;
  cor_fundo?: string | null;
};

const configPadrao: Configuracao = {
  nome_empresa: "",
  nome_fantasia: "",
  cor_primaria: "#f97316",
  cor_secundaria: "#0f172a",
  cor_fundo: "#f8fafc",
};

export default function Configuracoes() {
  const [config, setConfig] = useState<Configuracao>(configPadrao);
  const [configOriginal, setConfigOriginal] = useState<Configuracao>(configPadrao);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    void carregarConfiguracao();
  }, []);

  async function carregarConfiguracao() {
    setLoading(true);

    const { data, error } = await supabase
      .from("configuracoes")
      .select("id, nome_empresa, nome_fantasia, cor_primaria, cor_secundaria, cor_fundo")
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Erro ao carregar configurações:", error);
      alert("Erro ao carregar configurações: " + error.message);
      setLoading(false);
      return;
    }

    const novaConfig: Configuracao = data
      ? {
          id: data.id,
          nome_empresa: data.nome_empresa || "",
          nome_fantasia: data.nome_fantasia || "",
          cor_primaria: data.cor_primaria || "#f97316",
          cor_secundaria: data.cor_secundaria || "#0f172a",
          cor_fundo: data.cor_fundo || "#f8fafc",
        }
      : configPadrao;

    setConfig(novaConfig);
    setConfigOriginal(novaConfig);
    aplicarTema(novaConfig);
    setLoading(false);
  }

  function handleChange(campo: keyof Configuracao, valor: string) {
    const novaConfig = {
      ...config,
      [campo]: valor,
    };

    setConfig(novaConfig);
    aplicarTema(novaConfig);
  }

  function cancelarAlteracoes() {
    setConfig(configOriginal);
    aplicarTema(configOriginal);
  }

  async function salvar() {
    setSalvando(true);

    const payload = {
      nome_empresa: config.nome_empresa || null,
      nome_fantasia: config.nome_fantasia || null,
      cor_primaria: config.cor_primaria || "#f97316",
      cor_secundaria: config.cor_secundaria || "#0f172a",
      cor_fundo: config.cor_fundo || "#f8fafc",
    };

    if (config.id) {
      const { error } = await supabase
        .from("configuracoes")
        .update(payload)
        .eq("id", config.id);

      if (error) {
        console.error("Erro ao atualizar configurações:", error);
        alert("Erro ao atualizar configurações: " + error.message);
        setSalvando(false);
        return;
      }
    } else {
      const { data, error } = await supabase
        .from("configuracoes")
        .insert([payload])
        .select("id, nome_empresa, nome_fantasia, cor_primaria, cor_secundaria, cor_fundo")
        .single();

      if (error) {
        console.error("Erro ao salvar configurações:", error);
        alert("Erro ao salvar configurações: " + error.message);
        setSalvando(false);
        return;
      }

      setConfig((atual) => ({ ...atual, id: data.id }));
    }

    await carregarConfiguracao();
    alert("Configurações salvas com sucesso!");
    setSalvando(false);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Sistema"
          title="Configurações"
          description="Carregando configurações do estabelecimento..."
        />

        <SectionCard>
          <p className="text-sm text-slate-500">Carregando...</p>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Sistema"
        title="Configurações"
        description="Personalize o nome e a identidade visual do sistema para cada estabelecimento."
      />

      <SectionCard
        title="Identidade do estabelecimento"
        description="Essas informações aparecem no menu, cabeçalhos e experiência visual do sistema."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-bold text-slate-700">
              Nome da empresa
            </span>

            <input
              value={config.nome_empresa || ""}
              onChange={(e) => handleChange("nome_empresa", e.target.value)}
              className="w-full rounded-2xl border border-slate-200 p-3"
              placeholder="Ex: Studio Beleza"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-bold text-slate-700">
              Nome fantasia
            </span>

            <input
              value={config.nome_fantasia || ""}
              onChange={(e) => handleChange("nome_fantasia", e.target.value)}
              className="w-full rounded-2xl border border-slate-200 p-3"
              placeholder="Ex: Studio da Cris"
            />
          </label>
        </div>
      </SectionCard>

      <SectionCard
        title="Cores do sistema"
        description="Essas cores alimentam o layout padrão: botões, menu lateral, destaques e fundo."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <ColorField
            label="Cor primária"
            value={config.cor_primaria || "#f97316"}
            onChange={(valor) => handleChange("cor_primaria", valor)}
          />

          <ColorField
            label="Cor secundária"
            value={config.cor_secundaria || "#0f172a"}
            onChange={(valor) => handleChange("cor_secundaria", valor)}
          />

          <ColorField
            label="Cor de fundo"
            value={config.cor_fundo || "#f8fafc"}
            onChange={(valor) => handleChange("cor_fundo", valor)}
          />
        </div>
      </SectionCard>

      <SectionCard title="Prévia">
        <div
          className="rounded-3xl p-5"
          style={{
            backgroundColor: config.cor_fundo || "#f8fafc",
            border: "1px solid rgba(15,23,42,0.08)",
          }}
        >
          <div
            className="mb-4 rounded-2xl px-5 py-4 text-white"
            style={{ backgroundColor: config.cor_secundaria || "#0f172a" }}
          >
            <p className="text-sm opacity-80">Painel administrativo</p>

            <h3 className="text-2xl font-extrabold">
              {config.nome_fantasia || config.nome_empresa || "Sua empresa"}
            </h3>
          </div>

          <div className="flex flex-wrap gap-3">
            <PrimaryButton type="button">Botão principal</PrimaryButton>

            <SecondaryButton type="button" onClick={cancelarAlteracoes}>
              Cancelar
            </SecondaryButton>
          </div>
        </div>
      </SectionCard>

      <div className="flex flex-wrap justify-end gap-3">
        <SecondaryButton type="button" onClick={cancelarAlteracoes} disabled={salvando}>
          Cancelar alterações
        </SecondaryButton>

        <PrimaryButton type="button" onClick={salvar} disabled={salvando}>
          {salvando ? "Salvando..." : "Salvar configurações"}
        </PrimaryButton>
      </div>
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (valor: string) => void;
}) {
  return (
    <label className="block rounded-3xl border border-slate-200 bg-white p-4">
      <span className="mb-3 block text-sm font-bold text-slate-700">
        {label}
      </span>

      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-12 w-16 rounded-xl border border-slate-200 p-1"
        />

        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-2xl border border-slate-200 p-3 font-mono text-sm"
        />
      </div>
    </label>
  );
}
