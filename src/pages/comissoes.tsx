import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useEmpresa } from "../hooks/useEmpresa";

type LancamentoComissao = {
  id: string;
  data_lancamento?: string | null;
  descricao?: string | null;
  cliente?: string | null;
  servico?: string | null;
  profissional?: string | null;
  profissional_id?: string | null;
  valor_bruto?: number | null;
  comissao_percentual?: number | null;
  comissao_valor?: number | null;
  status?: string | null;
};

export default function Comissoes() {
  const location = useLocation();
  const { empresaId, carregandoEmpresa, empresa } = useEmpresa() as any;

  const rotaMinhasComissoes = location.pathname.includes("minhas-comissoes");

  const perfil =
    empresa?.perfil ||
    (empresa as any)?.perfilEmpresa ||
    "admin";

  const isAdmin =
    perfil === "admin" ||
    perfil === "super_admin" ||
    perfil === "admin_saas" ||
    perfil === "financeiro";

  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [profissionalId, setProfissionalId] = useState<string | null>(null);
  const [filtroProfissional, setFiltroProfissional] = useState("todos");
  const [lancamentos, setLancamentos] = useState<LancamentoComissao[]>([]);

  useEffect(() => {
    if (!empresaId) return;
    carregarComissoes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId, location.pathname]);

  async function carregarComissoes() {
    setLoading(true);
    setErro("");

    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;

      if (!user?.email) {
        setErro("Usuário não identificado.");
        return;
      }

      let idProfissional: string | null = null;

      const { data: usuario } = await supabase
        .from("usuarios")
        .select("email, profissional_id, perfil")
        .eq("email", user.email)
        .maybeSingle();

      idProfissional = usuario?.profissional_id || null;
      setProfissionalId(idProfissional);

      let query = supabase
        .from("financeiro")
        .select(
          "id, data_lancamento, descricao, cliente, servico, profissional, profissional_id, valor_bruto, comissao_percentual, comissao_valor, status"
        )
        .eq("empresa_id", empresaId)
        .gt("comissao_valor", 0)
        .order("data_lancamento", { ascending: false });

      if (rotaMinhasComissoes || !isAdmin) {
        if (!idProfissional) {
          setErro("Este usuário ainda não está vinculado a um profissional.");
          setLancamentos([]);
          return;
        }

        query = query.eq("profissional_id", idProfissional);
      }

      const { data, error } = await query;

      if (error) {
        setErro(error.message);
        return;
      }

      setLancamentos((data || []) as LancamentoComissao[]);
    } catch (error: any) {
      setErro(error?.message || "Erro ao carregar comissões.");
    } finally {
      setLoading(false);
    }
  }

  const profissionais = useMemo(() => {
    const mapa = new Map<string, string>();

    lancamentos.forEach((item) => {
      if (item.profissional_id) {
        mapa.set(item.profissional_id, item.profissional || "Sem nome");
      }
    });

    return Array.from(mapa.entries())
      .map(([id, nome]) => ({ id, nome }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [lancamentos]);

  const lancamentosFiltrados = useMemo(() => {
    if (!isAdmin || rotaMinhasComissoes || filtroProfissional === "todos") {
      return lancamentos;
    }

    return lancamentos.filter(
      (item) => item.profissional_id === filtroProfissional,
    );
  }, [lancamentos, filtroProfissional, isAdmin, rotaMinhasComissoes]);

  const totais = useMemo(() => {
    const total = lancamentosFiltrados.reduce(
      (acc, item) => acc + Number(item.comissao_valor || 0),
      0,
    );

    const pagos = lancamentosFiltrados
      .filter((item) => item.status === "pago")
      .reduce((acc, item) => acc + Number(item.comissao_valor || 0), 0);

    const pendentes = total - pagos;

    return { total, pagos, pendentes };
  }, [lancamentosFiltrados]);

  function moeda(valor: number) {
    return valor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function dataBR(data?: string | null) {
    if (!data) return "-";
    return new Date(`${data}T00:00:00`).toLocaleDateString("pt-BR");
  }

  if (carregandoEmpresa || loading) {
    return <div className="p-6">Carregando comissões...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-bold uppercase text-purple-700">
          {rotaMinhasComissoes ? "Minha área" : "Operação"}
        </p>
        <h1 className="text-3xl font-black text-slate-900">
          {rotaMinhasComissoes ? "Minhas comissões" : "Comissões"}
        </h1>
        <p className="text-sm text-slate-500">
          {rotaMinhasComissoes
            ? "Acompanhe seus atendimentos, valores de comissão e histórico."
            : "Acompanhe as comissões de todos os profissionais."}
        </p>
      </div>

      {erro && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          {erro}
        </div>
      )}

      {isAdmin && !rotaMinhasComissoes && (
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <label className="text-sm font-bold text-slate-700">
            Filtrar por profissional
          </label>

          <select
            value={filtroProfissional}
            onChange={(e) => setFiltroProfissional(e.target.value)}
            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-purple-400"
          >
            <option value="todos">Todos os profissionais</option>
            {profissionais.map((profissional) => (
              <option key={profissional.id} value={profissional.id}>
                {profissional.nome}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total em comissões</p>
          <p className="mt-2 text-2xl font-black text-purple-700">
            {moeda(totais.total)}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Pago</p>
          <p className="mt-2 text-2xl font-black text-emerald-600">
            {moeda(totais.pagos)}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Pendente</p>
          <p className="mt-2 text-2xl font-black text-orange-600">
            {moeda(totais.pendentes)}
          </p>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <h2 className="text-lg font-black text-slate-900">
            Histórico de comissões
          </h2>
          <p className="text-sm text-slate-500">
            Registros gerados a partir dos atendimentos finalizados.
          </p>
        </div>

        {lancamentosFiltrados.length === 0 ? (
          <div className="p-8 text-center text-sm font-bold text-slate-500">
            Nenhuma comissão encontrada.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-purple-700 text-white">
                <tr>
                  <th className="px-4 py-3 text-left">Data</th>
                  {!rotaMinhasComissoes && (
                    <th className="px-4 py-3 text-left">Profissional</th>
                  )}
                  <th className="px-4 py-3 text-left">Cliente</th>
                  <th className="px-4 py-3 text-left">Serviço</th>
                  <th className="px-4 py-3 text-left">Bruto</th>
                  <th className="px-4 py-3 text-left">%</th>
                  <th className="px-4 py-3 text-left">Comissão</th>
                  <th className="px-4 py-3 text-left">Status</th>
                </tr>
              </thead>

              <tbody>
                {lancamentosFiltrados.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100">
                    <td className="px-4 py-3">{dataBR(item.data_lancamento)}</td>

                    {!rotaMinhasComissoes && (
                      <td className="px-4 py-3">{item.profissional || "-"}</td>
                    )}

                    <td className="px-4 py-3">{item.cliente || "-"}</td>
                    <td className="px-4 py-3">{item.servico || "-"}</td>
                    <td className="px-4 py-3">
                      {moeda(Number(item.valor_bruto || 0))}
                    </td>
                    <td className="px-4 py-3">
                      {Number(item.comissao_percentual || 0)}%
                    </td>
                    <td className="px-4 py-3 font-black text-purple-700">
                      {moeda(Number(item.comissao_valor || 0))}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                        {item.status || "pendente"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!isAdmin && !profissionalId && (
        <p className="text-xs text-slate-400">
          Para aparecerem dados aqui, o usuário precisa estar vinculado a um profissional.
        </p>
      )}
    </div>
  );
}