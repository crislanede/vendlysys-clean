import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Empresa = {
  id: string;
  nome: string;
  plano: string | null;
  status_assinatura: string | null;
  trial_fim: string | null;
  licenca_vitalicia: boolean | null;
  bloqueada: boolean | null;
};

export default function BloqueioTrial() {
  const [carregando, setCarregando] = useState(true);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [bloqueado, setBloqueado] = useState(false);

  useEffect(() => {
    verificarTrial();
  }, []);

  async function verificarTrial() {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    if (!user) {
      setCarregando(false);
      return;
    }

    const { data, error } = await supabase
      .from("empresas")
      .select(
        "id, nome, plano, status_assinatura, trial_fim, licenca_vitalicia, bloqueada"
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (error || !data) {
      setCarregando(false);
      return;
    }

    let empresaAtual = data as Empresa;

    const trialVencido =
      !empresaAtual.licenca_vitalicia &&
      empresaAtual.status_assinatura === "trial" &&
      empresaAtual.trial_fim &&
      new Date(empresaAtual.trial_fim) < new Date();

    if (trialVencido && !empresaAtual.bloqueada) {
      await supabase
        .from("empresas")
        .update({
          bloqueada: true,
          status_assinatura: "bloqueado",
          data_bloqueio: new Date().toISOString(),
          observacao_licenca: "Bloqueio automático por trial vencido.",
        })
        .eq("id", empresaAtual.id);

      empresaAtual = {
        ...empresaAtual,
        bloqueada: true,
        status_assinatura: "bloqueado",
      };
    }

    setEmpresa(empresaAtual);
    setBloqueado(Boolean(empresaAtual.bloqueada || trialVencido));
    setCarregando(false);
  }

  async function sair() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  if (carregando) return null;
  if (!bloqueado) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/80 flex items-center justify-center px-4">
      <div className="bg-white max-w-md w-full rounded-3xl shadow-2xl p-8 text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-red-100 flex items-center justify-center text-3xl mb-4">
          🔒
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          Acesso bloqueado
        </h1>

        <p className="text-slate-600 mb-6">
          O período de teste da empresa{" "}
          <strong>{empresa?.nome || "sua empresa"}</strong> terminou.
          Para continuar usando o VendlySys, regularize a assinatura.
        </p>

        <div className="bg-slate-50 rounded-2xl p-4 text-sm text-slate-600 mb-6">
          Status atual:{" "}
          <strong>{empresa?.status_assinatura || "bloqueado"}</strong>
        </div>

        <button
          onClick={sair}
          className="w-full bg-pink-600 text-white rounded-2xl py-3 font-bold"
        >
          Sair
        </button>

        <p className="text-xs text-slate-400 mt-4">
          Entre em contato com a administração para liberar o acesso.
        </p>
      </div>
    </div>
  );
}