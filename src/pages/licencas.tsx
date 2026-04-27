import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Empresa = {
  id: string;
  nome: string;
  slug: string | null;
  email: string | null;
  telefone: string | null;
  plano: string | null;
  status_assinatura: string | null;
  trial_inicio: string | null;
  trial_fim: string | null;
  licenca_vitalicia: boolean | null;
  bloqueada: boolean | null;
  data_bloqueio: string | null;
  observacao_licenca: string | null;
};

export default function Licencas() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    carregarEmpresas();
  }, []);

  async function carregarEmpresas() {
    setCarregando(true);

    const { data, error } = await supabase
      .from("empresas")
      .select("*")
      .order("nome");

    setCarregando(false);

    if (error) {
      alert("Erro ao carregar licenças: " + error.message);
      return;
    }

    setEmpresas(data || []);
  }

  function trialVencido(empresa: Empresa) {
    if (empresa.licenca_vitalicia) return false;
    if (!empresa.trial_fim) return false;

    return new Date(empresa.trial_fim) < new Date();
  }

  async function atualizarLicenca(
    empresa: Empresa,
    dados: Partial<Empresa>
  ) {
    const { error } = await supabase
      .from("empresas")
      .update(dados)
      .eq("id", empresa.id);

    if (error) {
      alert("Erro ao atualizar licença: " + error.message);
      return;
    }

    carregarEmpresas();
  }

  async function liberarVitalicio(empresa: Empresa) {
    await atualizarLicenca(empresa, {
      plano: "vitalicio",
      status_assinatura: "vitalicio",
      licenca_vitalicia: true,
      bloqueada: false,
      trial_fim: null,
      observacao_licenca: "Licença vitalícia liberada manualmente.",
    });
  }

  async function liberarPago(empresa: Empresa) {
    await atualizarLicenca(empresa, {
      plano: "mensal",
      status_assinatura: "ativo",
      licenca_vitalicia: false,
      bloqueada: false,
      observacao_licenca: "Licença mensal ativa.",
    });
  }

  async function bloquear(empresa: Empresa) {
    await atualizarLicenca(empresa, {
      status_assinatura: "bloqueado",
      bloqueada: true,
      data_bloqueio: new Date().toISOString(),
      observacao_licenca: "Empresa bloqueada manualmente.",
    });
  }

  async function renovarTrial(empresa: Empresa) {
    const novaData = new Date();
    novaData.setDate(novaData.getDate() + 7);

    await atualizarLicenca(empresa, {
      plano: "teste",
      status_assinatura: "trial",
      licenca_vitalicia: false,
      bloqueada: false,
      trial_inicio: new Date().toISOString(),
      trial_fim: novaData.toISOString(),
      observacao_licenca: "Trial renovado por mais 7 dias.",
    });
  }

  if (carregando) {
    return <div className="p-6">Carregando licenças...</div>;
  }

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="mb-6">
        <p className="text-sm font-bold text-pink-600 uppercase">
          Administração
        </p>
        <h1 className="text-3xl font-bold text-slate-900">
          Licenças das empresas
        </h1>
        <p className="text-slate-500">
          Controle empresas em teste, pagantes, bloqueadas e vitalícias.
        </p>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              <th className="text-left p-4">Empresa</th>
              <th className="text-left p-4">Plano</th>
              <th className="text-left p-4">Status</th>
              <th className="text-left p-4">Trial até</th>
              <th className="text-left p-4">Bloqueio</th>
              <th className="text-left p-4">Ações</th>
            </tr>
          </thead>

          <tbody>
            {empresas.map((empresa) => {
              const vencido = trialVencido(empresa);

              return (
                <tr key={empresa.id} className="border-t">
                  <td className="p-4">
                    <div className="font-semibold text-slate-900">
                      {empresa.nome}
                    </div>
                    <div className="text-xs text-slate-500">
                      {empresa.email || "-"}
                    </div>
                    <div className="text-xs text-slate-400">
                      {empresa.slug || "-"}
                    </div>
                  </td>

                  <td className="p-4">
                    {empresa.licenca_vitalicia ? "Vitalício" : empresa.plano}
                  </td>

                  <td className="p-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        empresa.bloqueada || vencido
                          ? "bg-red-100 text-red-700"
                          : empresa.licenca_vitalicia
                          ? "bg-purple-100 text-purple-700"
                          : empresa.status_assinatura === "ativo"
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {empresa.bloqueada
                        ? "Bloqueado"
                        : vencido
                        ? "Trial vencido"
                        : empresa.status_assinatura}
                    </span>
                  </td>

                  <td className="p-4">
                    {empresa.trial_fim
                      ? new Date(empresa.trial_fim).toLocaleDateString("pt-BR")
                      : "-"}
                  </td>

                  <td className="p-4">
                    {empresa.bloqueada ? "Sim" : "Não"}
                  </td>

                  <td className="p-4">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => liberarPago(empresa)}
                        className="px-3 py-2 rounded-xl bg-green-600 text-white text-xs font-bold"
                      >
                        Ativar pago
                      </button>

                      <button
                        onClick={() => renovarTrial(empresa)}
                        className="px-3 py-2 rounded-xl bg-yellow-500 text-white text-xs font-bold"
                      >
                        +7 dias
                      </button>

                      <button
                        onClick={() => bloquear(empresa)}
                        className="px-3 py-2 rounded-xl bg-red-600 text-white text-xs font-bold"
                      >
                        Bloquear
                      </button>

                      <button
                        onClick={() => liberarVitalicio(empresa)}
                        className="px-3 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold"
                      >
                        Vitalício
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {empresas.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500">
                  Nenhuma empresa cadastrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}