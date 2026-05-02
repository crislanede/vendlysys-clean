import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { useEmpresa } from "../hooks/useEmpresa";

import PageHeader from "../components/ui/PageHeader";
import SectionCard from "../components/ui/SectionCard";
import PrimaryButton from "../components/ui/PrimaryButton";
import SecondaryButton from "../components/ui/SecondaryButton";
import EmptyState from "../components/ui/EmptyState";
import StatusBadge from "../components/ui/StatusBadge";

type Lancamento = {
  id: string;
  tipo: string;
  descricao: string;
  valor: number;
  data_lancamento: string;
  status: string;
  cliente: string | null;
  profissional: string | null;
  servico: string | null;
  agendamento_id: string | null;
  observacoes: string | null;
  forma_pagamento?: string | null;
  data_pagamento?: string | null;
  created_at?: string;
  empresa_id?: string | null;
};

type Despesa = {
  id: string;
  descricao: string;
  valor: number;
  categoria: string | null;
  data?: string | null;
  data_lancamento?: string | null;
  observacao?: string | null;
  observacoes?: string | null;
  status?: string | null;
  empresa_id?: string | null;
};

type Produto = {
  id: string;
  nome: string;
  preco: number | null;
  estoque: number | null;
  status?: string | null;
  empresa_id?: string | null;
};

export default function FinanceiroPage() {
  const { empresaId, carregandoEmpresa } = useEmpresa();

  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);

  const [tipo, setTipo] = useState("entrada");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [dataLancamento, setDataLancamento] = useState("");
  const [status, setStatus] = useState("pendente");
  const [formaPagamento, setFormaPagamento] = useState("");
  const [cliente, setCliente] = useState("");
  const [profissional, setProfissional] = useState("");
  const [servico, setServico] = useState("");
  const [observacoes, setObservacoes] = useState("");

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  const [modalVendaProduto, setModalVendaProduto] = useState(false);
  const [produtoIdVenda, setProdutoIdVenda] = useState("");
  const [quantidadeVenda, setQuantidadeVenda] = useState("1");
  const [formaPagamentoVenda, setFormaPagamentoVenda] = useState("pix");
  const [observacaoVenda, setObservacaoVenda] = useState("");
  const [salvandoVenda, setSalvandoVenda] = useState(false);

  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");

  useEffect(() => {
    if (empresaId) carregarDados();
  }, [empresaId]);

  async function carregarDados() {
    setLoading(true);

    if (!empresaId) {
      setLancamentos([]);
      setDespesas([]);
      setProdutos([]);
      setLoading(false);
      return;
    }

    const [resFinanceiro, resDespesas, resProdutos] = await Promise.all([
      supabase
        .from("financeiro")
        .select("*")
        .eq("empresa_id", empresaId)
        .order("data_lancamento", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("despesas")
        .select("*")
        .eq("empresa_id", empresaId)
        .order("data_lancamento", { ascending: false }),
      supabase
        .from("produtos")
        .select("id,nome,preco,estoque,status,empresa_id")
        .eq("empresa_id", empresaId)
        .order("nome", { ascending: true }),
    ]);

    if (resFinanceiro.error) {
      console.error("Erro ao carregar financeiro:", resFinanceiro.error);
      alert("Erro ao carregar financeiro: " + resFinanceiro.error.message);
      setLancamentos([]);
    } else {
      setLancamentos((resFinanceiro.data || []) as Lancamento[]);
    }

    if (resDespesas.error) {
      console.warn("Erro ao carregar despesas:", resDespesas.error);
      setDespesas([]);
    } else {
      setDespesas((resDespesas.data || []) as Despesa[]);
    }

    if (resProdutos.error) {
      console.warn("Erro ao carregar produtos:", resProdutos.error);
      setProdutos([]);
    } else {
      setProdutos((resProdutos.data || []) as Produto[]);
    }

    setLoading(false);
  }

  function limparFormulario() {
    setTipo("entrada");
    setDescricao("");
    setValor("");
    setDataLancamento("");
    setStatus("pendente");
    setFormaPagamento("");
    setCliente("");
    setProfissional("");
    setServico("");
    setObservacoes("");
    setEditandoId(null);
    setMostrarFormulario(false);
  }

  function limparVendaProduto() {
    setProdutoIdVenda("");
    setQuantidadeVenda("1");
    setFormaPagamentoVenda("pix");
    setObservacaoVenda("");
    setModalVendaProduto(false);
    setSalvandoVenda(false);
  }

  function normalizarNumero(valorDigitado: string) {
    if (!valorDigitado) return null;
    const numero = Number(String(valorDigitado).replace(",", "."));
    if (Number.isNaN(numero)) return null;
    return numero;
  }

  async function salvarLancamento(e: React.FormEvent) {
    e.preventDefault();

    const valorNormalizado = normalizarNumero(valor);

    if (!descricao.trim()) {
      alert("Preencha a descrição.");
      return;
    }

    if (valorNormalizado === null || valorNormalizado < 0) {
      alert("Informe um valor válido.");
      return;
    }

    if (!dataLancamento) {
      alert("Informe a data do lançamento.");
      return;
    }

    const payload = {
      tipo,
      descricao: descricao.trim(),
      valor: valorNormalizado,
      data_lancamento: dataLancamento,
      status,
      forma_pagamento: formaPagamento || null,
      data_pagamento: status === "pago" ? new Date().toISOString() : null,
      cliente: cliente.trim() || null,
      profissional: profissional.trim() || null,
      servico: servico.trim() || null,
      observacoes: observacoes.trim() || null,
      empresa_id: empresaId,
    };

    const resposta = editandoId
      ? await supabase
          .from("financeiro")
          .update(payload)
          .eq("id", editandoId)
          .eq("empresa_id", empresaId)
      : await supabase.from("financeiro").insert([payload]);

    if (resposta.error) {
      console.error("Erro ao salvar lançamento:", resposta.error);
      alert("Erro ao salvar lançamento: " + resposta.error.message);
      return;
    }

    limparFormulario();
    await carregarDados();
  }

  async function salvarVendaProduto() {
    if (!empresaId) return;

    const produto = produtos.find((item) => item.id === produtoIdVenda);
    const quantidade = normalizarNumero(quantidadeVenda);

    if (!produto) {
      alert("Selecione um produto.");
      return;
    }

    if (quantidade === null || quantidade <= 0) {
      alert("Informe uma quantidade válida.");
      return;
    }

    const estoqueAtual = Number(produto.estoque || 0);
    const precoUnitario = Number(produto.preco || 0);

    if (quantidade > estoqueAtual) {
      alert("Estoque insuficiente para essa venda.");
      return;
    }

    if (precoUnitario <= 0) {
      alert("Este produto não possui preço cadastrado.");
      return;
    }

    setSalvandoVenda(true);

    const valorTotal = precoUnitario * quantidade;
    const hoje = new Date().toISOString().slice(0, 10);

    const { error: erroVenda } = await supabase.from("produto_vendas").insert({
      empresa_id: empresaId,
      produto_id: produto.id,
      quantidade,
      valor_unitario: precoUnitario,
      valor_total: valorTotal,
      forma_pagamento: formaPagamentoVenda || null,
      observacao: observacaoVenda.trim() || null,
    });

    if (erroVenda) {
      setSalvandoVenda(false);
      alert("Erro ao registrar venda: " + erroVenda.message);
      return;
    }

    const { error: erroEstoque } = await supabase
      .from("produtos")
      .update({ estoque: estoqueAtual - quantidade })
      .eq("id", produto.id)
      .eq("empresa_id", empresaId);

    if (erroEstoque) {
      setSalvandoVenda(false);
      alert("Venda salva, mas erro ao baixar estoque: " + erroEstoque.message);
      return;
    }

    const { error: erroFinanceiro } = await supabase.from("financeiro").insert({
      empresa_id: empresaId,
      tipo: "entrada",
      descricao: `Venda de produto: ${produto.nome}`,
      valor: valorTotal,
      data_lancamento: hoje,
      status: "pago",
      forma_pagamento: formaPagamentoVenda || null,
      data_pagamento: new Date().toISOString(),
      cliente: null,
      profissional: null,
      servico: "Produto",
      observacoes: observacaoVenda.trim() || null,
    });

    if (erroFinanceiro) {
      setSalvandoVenda(false);
      alert("Venda e estoque atualizados, mas erro ao lançar financeiro: " + erroFinanceiro.message);
      return;
    }

    limparVendaProduto();
    await carregarDados();
  }

  function editarLancamento(item: Lancamento) {
    setTipo(item.tipo || "entrada");
    setDescricao(item.descricao || "");
    setValor(String(item.valor || ""));
    setDataLancamento(item.data_lancamento || "");
    setStatus(item.status || "pendente");
    setFormaPagamento(item.forma_pagamento || "");
    setCliente(item.cliente || "");
    setProfissional(item.profissional || "");
    setServico(item.servico || "");
    setObservacoes(item.observacoes || "");
    setEditandoId(item.id);
    setMostrarFormulario(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function excluirLancamento(id: string) {
    const confirmar = window.confirm("Deseja excluir este lançamento?");
    if (!confirmar) return;

    const { error } = await supabase
      .from("financeiro")
      .delete()
      .eq("id", id)
      .eq("empresa_id", empresaId);

    if (error) {
      console.error("Erro ao excluir lançamento:", error);
      alert("Erro ao excluir lançamento: " + error.message);
      return;
    }

    await carregarDados();
  }

  async function marcarComoPago(id: string) {
    const { error } = await supabase
      .from("financeiro")
      .update({
        status: "pago",
        data_pagamento: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("empresa_id", empresaId);

    if (error) {
      console.error("Erro ao marcar como pago:", error);
      alert("Erro ao marcar como pago: " + error.message);
      return;
    }

    await carregarDados();
  }

  async function cancelarLancamento(id: string) {
    const confirmar = window.confirm("Deseja cancelar este lançamento?");
    if (!confirmar) return;

    const { error } = await supabase
      .from("financeiro")
      .update({ status: "cancelado" })
      .eq("id", id)
      .eq("empresa_id", empresaId);

    if (error) {
      alert("Erro ao cancelar lançamento: " + error.message);
      return;
    }

    await carregarDados();
  }

  function dataDespesa(item: Despesa) {
    return item.data_lancamento || item.data || "";
  }

  function dentroDoPeriodo(dataStr: string) {
    if (!dataStr) return true;
    if (filtroDataInicio && dataStr < filtroDataInicio) return false;
    if (filtroDataFim && dataStr > filtroDataFim) return false;
    return true;
  }

  const lancamentosFiltrados = useMemo(() => {
    return lancamentos.filter((item) => {
      const batePeriodo = dentroDoPeriodo(item.data_lancamento);
      const bateTipo = filtroTipo ? item.tipo === filtroTipo : true;
      const bateStatus = filtroStatus ? item.status === filtroStatus : true;

      return batePeriodo && bateTipo && bateStatus;
    });
  }, [lancamentos, filtroDataInicio, filtroDataFim, filtroTipo, filtroStatus]);

  const despesasFiltradas = useMemo(() => {
    return despesas.filter((item) => dentroDoPeriodo(dataDespesa(item)));
  }, [despesas, filtroDataInicio, filtroDataFim]);

  const produtoVendaSelecionado = produtos.find((item) => item.id === produtoIdVenda);
  const quantidadeVendaNumero = normalizarNumero(quantidadeVenda) || 0;
  const valorVendaProduto = Number(produtoVendaSelecionado?.preco || 0) * quantidadeVendaNumero;

  const totalReceitas = lancamentosFiltrados
    .filter((item) => item.tipo === "entrada" && item.status !== "cancelado")
    .reduce((acc, item) => acc + Number(item.valor || 0), 0);

  const totalSaidasFinanceiro = lancamentosFiltrados
    .filter((item) => item.tipo === "saida" && item.status !== "cancelado")
    .reduce((acc, item) => acc + Number(item.valor || 0), 0);

  const totalDespesas = despesasFiltradas
    .filter((item) => item.status !== "cancelado")
    .reduce((acc, item) => acc + Number(item.valor || 0), 0);

  const lucroLiquido = totalReceitas - totalSaidasFinanceiro - totalDespesas;

  function formatarMoeda(valor: number) {
    return Number(valor || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function formatarData(data?: string | null) {
    if (!data) return "-";
    return new Date(`${data}T00:00:00`).toLocaleDateString("pt-BR");
  }

  function limparFiltros() {
    setFiltroDataInicio("");
    setFiltroDataFim("");
    setFiltroTipo("");
    setFiltroStatus("");
  }

  if (carregandoEmpresa) {
    return <div className="p-6">Carregando empresa...</div>;
  }

  if (!empresaId) {
    return <div className="p-6">Empresa não encontrada para este usuário.</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Gestão"
        title="Financeiro"
        description="Controle receitas, saídas, despesas, pagamentos vindos da agenda e lucro líquido."
        action={
          <div className="flex flex-wrap gap-2">
            <SecondaryButton type="button" onClick={() => setModalVendaProduto(true)}>
              + Venda de produto
            </SecondaryButton>

            <PrimaryButton
              type="button"
              onClick={() => {
                if (mostrarFormulario) {
                  limparFormulario();
                } else {
                  setMostrarFormulario(true);
                }
              }}
            >
              {mostrarFormulario ? "Fechar" : "+ Novo lançamento"}
            </PrimaryButton>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <ResumoCard title="Receitas" value={formatarMoeda(totalReceitas)} valueClassName="text-emerald-600" />
        <ResumoCard title="Saídas financeiras" value={formatarMoeda(totalSaidasFinanceiro)} valueClassName="text-orange-600" />
        <ResumoCard title="Despesas" value={formatarMoeda(totalDespesas)} valueClassName="text-red-600" />
        <ResumoCard
          title="Lucro líquido"
          value={formatarMoeda(lucroLiquido)}
          valueClassName={lucroLiquido >= 0 ? "text-emerald-700" : "text-red-700"}
        />
      </div>

      <SectionCard title="Filtros" description="Refine a visualização por período, tipo e status">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <input
            type="date"
            value={filtroDataInicio}
            onChange={(e) => setFiltroDataInicio(e.target.value)}
            className="rounded-2xl border border-slate-200 p-3"
          />

          <input
            type="date"
            value={filtroDataFim}
            onChange={(e) => setFiltroDataFim(e.target.value)}
            className="rounded-2xl border border-slate-200 p-3"
          />

          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="rounded-2xl border border-slate-200 p-3"
          >
            <option value="">Todos os tipos</option>
            <option value="entrada">Entrada</option>
            <option value="saida">Saída</option>
          </select>

          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="rounded-2xl border border-slate-200 p-3"
          >
            <option value="">Todos os status</option>
            <option value="pendente">Pendente</option>
            <option value="pago">Pago</option>
            <option value="cancelado">Cancelado</option>
          </select>

          <SecondaryButton type="button" onClick={limparFiltros}>
            Limpar filtros
          </SecondaryButton>
        </div>
      </SectionCard>

      {mostrarFormulario && (
        <SectionCard
          title={editandoId ? "Editar lançamento" : "Novo lançamento"}
          description="Cadastre manualmente entradas ou saídas financeiras."
        >
          <form onSubmit={salvarLancamento} className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="rounded-2xl border border-slate-200 p-3">
              <option value="entrada">Entrada</option>
              <option value="saida">Saída</option>
            </select>

            <input
              placeholder="Descrição"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="rounded-2xl border border-slate-200 p-3"
            />

            <input
              type="number"
              step="0.01"
              placeholder="Valor"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              className="rounded-2xl border border-slate-200 p-3"
            />

            <input
              type="date"
              value={dataLancamento}
              onChange={(e) => setDataLancamento(e.target.value)}
              className="rounded-2xl border border-slate-200 p-3"
            />

            <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-2xl border border-slate-200 p-3">
              <option value="pendente">Pendente</option>
              <option value="pago">Pago</option>
              <option value="cancelado">Cancelado</option>
            </select>

            <select
              value={formaPagamento}
              onChange={(e) => setFormaPagamento(e.target.value)}
              className="rounded-2xl border border-slate-200 p-3"
            >
              <option value="">Forma de pagamento</option>
              <option value="dinheiro">Dinheiro</option>
              <option value="pix">Pix</option>
              <option value="debito">Débito</option>
              <option value="credito">Crédito</option>
              <option value="pacote">Pacote</option>
              <option value="outro">Outro</option>
            </select>

            <input placeholder="Cliente" value={cliente} onChange={(e) => setCliente(e.target.value)} className="rounded-2xl border border-slate-200 p-3" />
            <input placeholder="Profissional" value={profissional} onChange={(e) => setProfissional(e.target.value)} className="rounded-2xl border border-slate-200 p-3" />
            <input placeholder="Serviço" value={servico} onChange={(e) => setServico(e.target.value)} className="rounded-2xl border border-slate-200 p-3 md:col-span-2" />

            <textarea
              placeholder="Observações"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              className="rounded-2xl border border-slate-200 p-3 md:col-span-2"
            />

            <div className="flex flex-wrap gap-2 md:col-span-2">
              <PrimaryButton type="submit">
                {editandoId ? "Atualizar" : "Salvar"}
              </PrimaryButton>

              <SecondaryButton type="button" onClick={limparFormulario}>
                Cancelar
              </SecondaryButton>
            </div>
          </form>
        </SectionCard>
      )}

      <SectionCard title="Receitas e lançamentos" description="Movimentações registradas no financeiro">
        {loading ? (
          <p>Carregando...</p>
        ) : lancamentosFiltrados.length === 0 ? (
          <EmptyState title="Nenhum lançamento encontrado" description="Os lançamentos filtrados aparecerão aqui." />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-left text-sm text-white" style={{ backgroundColor: "var(--color-primary)" }}>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Descrição</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Serviço</th>
                  <th className="px-4 py-3">Forma</th>
                  <th className="px-4 py-3 text-right">Valor</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>

              <tbody>
                {lancamentosFiltrados.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 odd:bg-white even:bg-slate-50">
                    <td className="px-4 py-3 text-sm text-slate-700">{formatarData(item.data_lancamento)}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      <div className="font-bold text-slate-900">{item.descricao}</div>
                      {item.agendamento_id && (
                        <span className="mt-1 inline-flex rounded-full bg-blue-100 px-2 py-1 text-xs font-bold text-blue-700">
                          vindo da agenda
                        </span>
                      )}
                      {item.observacoes && <div className="mt-1 text-xs text-slate-500">{item.observacoes}</div>}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">{item.cliente || "-"}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{item.servico || "-"}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{item.forma_pagamento || "-"}</td>
                    <td className={`px-4 py-3 text-right text-sm font-extrabold ${item.tipo === "entrada" ? "text-emerald-600" : "text-orange-600"}`}>
                      {item.tipo === "entrada" ? "+" : "-"} {formatarMoeda(Number(item.valor))}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        {item.status !== "pago" && item.status !== "cancelado" && (
                          <button type="button" onClick={() => marcarComoPago(item.id)} className="text-sm font-bold text-emerald-600 hover:underline">
                            Pago
                          </button>
                        )}

                        <button type="button" onClick={() => editarLancamento(item)} className="text-sm font-bold text-blue-600 hover:underline">
                          Editar
                        </button>

                        {item.status !== "cancelado" && (
                          <button type="button" onClick={() => cancelarLancamento(item.id)} className="text-sm font-bold text-orange-600 hover:underline">
                            Cancelar
                          </button>
                        )}

                        <button type="button" onClick={() => excluirLancamento(item.id)} className="text-sm font-bold text-red-600 hover:underline">
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Despesas do período" description="Itens vindos da tabela despesas">
        {loading ? (
          <p>Carregando...</p>
        ) : despesasFiltradas.length === 0 ? (
          <EmptyState title="Nenhuma despesa encontrada" description="As despesas do período aparecerão aqui." />
        ) : (
          <div className="space-y-3">
            {despesasFiltradas.map((item) => (
              <div key={item.id} className="flex justify-between gap-4 rounded-2xl border border-slate-200 p-4">
                <div>
                  <p className="font-bold text-slate-800">{item.descricao}</p>
                  <p className="text-sm text-slate-500">{item.categoria || "Sem categoria"}</p>
                  <p className="text-sm text-slate-500">{formatarData(dataDespesa(item))}</p>
                  {(item.observacao || item.observacoes) && (
                    <p className="mt-1 text-sm text-slate-400">{item.observacao || item.observacoes}</p>
                  )}
                </div>

                <div className="text-right">
                  <p className="font-extrabold text-red-600">- {formatarMoeda(Number(item.valor))}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {modalVendaProduto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold uppercase text-slate-500">Estoque</p>
                <h2 className="text-2xl font-extrabold text-slate-900">Venda de produto</h2>
                <p className="text-sm text-slate-500">Registre a venda, baixe estoque e lance no financeiro.</p>
              </div>

              <SecondaryButton type="button" onClick={limparVendaProduto}>
                Fechar
              </SecondaryButton>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <select
                value={produtoIdVenda}
                onChange={(e) => setProdutoIdVenda(e.target.value)}
                className="rounded-2xl border border-slate-200 p-3"
              >
                <option value="">Selecione o produto</option>
                {produtos.map((produto) => (
                  <option key={produto.id} value={produto.id}>
                    {produto.nome} — estoque: {Number(produto.estoque || 0)} — {formatarMoeda(Number(produto.preco || 0))}
                  </option>
                ))}
              </select>

              <input
                type="number"
                min="1"
                step="1"
                value={quantidadeVenda}
                onChange={(e) => setQuantidadeVenda(e.target.value)}
                placeholder="Quantidade"
                className="rounded-2xl border border-slate-200 p-3"
              />

              <select
                value={formaPagamentoVenda}
                onChange={(e) => setFormaPagamentoVenda(e.target.value)}
                className="rounded-2xl border border-slate-200 p-3"
              >
                <option value="dinheiro">Dinheiro</option>
                <option value="pix">Pix</option>
                <option value="debito">Débito</option>
                <option value="credito">Crédito</option>
                <option value="outro">Outro</option>
              </select>

              <textarea
                value={observacaoVenda}
                onChange={(e) => setObservacaoVenda(e.target.value)}
                placeholder="Observações da venda"
                className="rounded-2xl border border-slate-200 p-3"
              />

              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Produto</span>
                  <strong>{produtoVendaSelecionado?.nome || "-"}</strong>
                </div>
                <div className="mt-2 flex justify-between text-sm text-slate-600">
                  <span>Total da venda</span>
                  <strong>{formatarMoeda(valorVendaProduto)}</strong>
                </div>
              </div>

              <div className="mt-2 flex flex-wrap justify-end gap-2">
                <SecondaryButton type="button" onClick={limparVendaProduto}>
                  Cancelar
                </SecondaryButton>

                <PrimaryButton type="button" onClick={salvarVendaProduto} disabled={salvandoVenda}>
                  {salvandoVenda ? "Salvando..." : "Salvar venda"}
                </PrimaryButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ResumoCard({
  title,
  value,
  valueClassName,
}: {
  title: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-slate-500">{title}</p>
      <p className={`mt-2 text-3xl font-extrabold ${valueClassName || "text-slate-800"}`}>
        {value}
      </p>
    </div>
  );
}
