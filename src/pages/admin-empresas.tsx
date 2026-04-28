import { useEffect, useMemo, useState } from "react";
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
  created_at: string | null;
};

export default function AdminEmpresas() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    setLoading(true);

    const { data, error } = await supabase
      .from("empresas")
      .select("*")
      .order("created_at", { ascending: false });

    setLoading(false);

    if (error) {
      alert("Erro ao carregar empresas: " + error.message);
      return;
    }

    setEmpresas(data || []);
  }

  const filtradas = useMemo(() => {
    return empresas.filter((empresa) =>
      `${empresa.nome} ${empresa.email} ${empresa.slug}`
        .toLowerCase()
        .includes(busca.toLowerCase())
    );
  }, [empresas, busca]);

  const metricas = useMemo(() => {
    return {
      total: empresas.length,
      ativas: empresas.filter((e) => !e.bloqueada).length,
      bloqueadas: empresas.filter((e) => e.bloqueada).length,
      vitalicias: empresas.filter((e) => e.licenca_vitalicia).length,
      trial: empresas.filter((e) => e.status_assinatura === "trial").length,
    };
  }, [empresas]);

  async function atualizar(id: string, dados: Partial<Empresa>) {
    const { error } = await supabase
      .from("empresas")
      .update(dados)
      .eq("id", id);

    if (error) {
      alert("Erro ao atualizar empresa: " + error.message);
      return;
    }

    carregar();
  }

  async function ativarPago(empresa: Empresa) {
    await atualizar(empresa.id, {
      plano: "mensal",
      status_assinatura: "ativo",
      licenca_vitalicia: false,
      bloqueada: false,
    });
  }

  async function vitalicio(empresa: Empresa) {
    await atualizar(empresa.id, {
      plano: "vitalicio",
      status_assinatura: "vitalicio",
      licenca_vitalicia: true,
      bloqueada: false,
      trial_fim: null,
    });
  }

  async function bloquear(empresa: Empresa) {
    await atualizar(empresa.id, {
      status_assinatura: "bloqueado",
      bloqueada: true,
      data_bloqueio: new Date().toISOString(),
    });
  }

  async function desbloquear(empresa: Empresa) {
    await atualizar(empresa.id, {
      bloqueada: false,
      status_assinatura: empresa.licenca_vitalicia ? "vitalicio" : "ativo",
    });
  }

  async function renovarTrial(empresa: Empresa) {
    const novaData = new Date();
    novaData.setDate(novaData.getDate() + 7);

    await atualizar(empresa.id, {
      plano: "teste",
      status_assinatura: "trial",
      licenca_vitalicia: false,
      bloqueada: false,
      trial_inicio: new Date().toISOString(),
      trial_fim: novaData.toISOString(),
    });
  }

  function formatarData(data: string | null) {
    if (!data) return "-";
    return new Date(data).toLocaleDateString("pt-BR");
  }

  function statusVisual(empresa: Empresa) {
    if (empresa.bloqueada) return "Bloqueada";
    if (empresa.licenca_vitalicia) return "Vitalícia";

    if (
      empresa.trial_fim &&
      new Date(empresa.trial_fim) < new Date() &&
      empresa.status_assinatura === "trial"
    ) {
      return "Trial vencido";
    }

    return empresa.status_assinatura || "-";
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <p style={{ color: "var(--cor-primaria, #4b2f3f)" }}
          className="text-sm font-bold uppercase">
          Administração SaaS
        </p>
        <h1 className="text-3xl font-bold text-slate-900">
          Empresas cadastradas
        </h1>
        <p className="text-slate-500">
          Acompanhe empresas, trials, bloqueios e licenças.
        </p>
      </div>

      {/* MÉTRICAS */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card title="Total" value={metricas.total} />
        <Card title="Ativas" value={metricas.ativas} />
        <Card title="Bloqueadas" value={metricas.bloqueadas} />
        <Card title="Vitalícias" value={metricas.vitalicias} />
        <Card title="Trial" value={metricas.trial} />
      </div>

      {/* BUSCA */}
      <div className="bg-white rounded-2xl border shadow-sm p-4">
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por empresa, e-mail ou slug..."
          className="w-full border rounded-xl px-4 py-3"
        />
      </div>

      {/* TABELA */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="font-bold">Lista de empresas</h2>

          <button
            onClick={carregar}
            className="border px-4 py-2 rounded-xl font-bold"
          >
            Atualizar
          </button>
        </div>

        {loading ? (
          <div className="p-6">Carregando...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr className="text-left">
                  <th className="p-4">Empresa</th>
                  <th>Status</th>
                  <th>Plano</th>
                  <th>Trial até</th>
                  <th>Criada em</th>
                  <th>Ações</th>
                </tr>
              </thead>

              <tbody>
                {filtradas.map((empresa) => (
                  <tr key={empresa.id} className="border-t">
                    <td className="p-4">
                      <p className="font-bold text-slate-900">
                        {empresa.nome}
                      </p>
                      <p className="text-xs text-slate-500">
                        {empresa.email || "-"}
                      </p>
                      <p className="text-xs text-slate-400">
                        /{empresa.slug || "-"}
                      </p>
                    </td>

                    <td>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          empresa.bloqueada
                            ? "bg-red-100 text-red-700"
                            : empresa.licenca_vitalicia
                            ? "bg-purple-100 text-purple-700"
                            : empresa.status_assinatura === "ativo"
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {statusVisual(empresa)}
                      </span>
                    </td>

                    <td>{empresa.plano || "-"}</td>
                    <td>{formatarData(empresa.trial_fim)}</td>
                    <td>{formatarData(empresa.created_at)}</td>

                    <td>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => ativarPago(empresa)}
                          className="bg-green-600 text-white px-3 py-2 rounded-xl text-xs font-bold"
                        >
                          Ativar pago
                        </button>

                        <button
                          onClick={() => renovarTrial(empresa)}
                          className="bg-yellow-500 text-white px-3 py-2 rounded-xl text-xs font-bold"
                        >
                          +7 dias
                        </button>

                        <button
                          onClick={() => vitalicio(empresa)}
                          style={{ backgroundColor: "var(--cor-primaria, #4b2f3f)" }}
                          className="text-white px-3 py-2 rounded-xl text-xs font-bold hover:opacity-90 transition"
                        >
                          Vitalício
                        </button>

                        {empresa.bloqueada ? (
                          <button
                            onClick={() => desbloquear(empresa)}
                            className="border px-3 py-2 rounded-xl text-xs font-bold"
                          >
                            Desbloquear
                          </button>
                        ) : (
                          <button
                            onClick={() => bloquear(empresa)}
                            className="bg-red-600 text-white px-3 py-2 rounded-xl text-xs font-bold"
                          >
                            Bloquear
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {filtradas.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-slate-500">
                      Nenhuma empresa encontrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Card({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="bg-white border rounded-2xl p-4 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
    </div>
  );
}