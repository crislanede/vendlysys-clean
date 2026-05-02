import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { supabase } from "../lib/supabase";
import { useEmpresa } from "../hooks/useEmpresa";

import PageHeader from "../components/ui/PageHeader";
import SectionCard from "../components/ui/SectionCard";
import PrimaryButton from "../components/ui/PrimaryButton";
import SecondaryButton from "../components/ui/SecondaryButton";
import EmptyState from "../components/ui/EmptyState";

type Produto = {
  id: string;
  empresa_id?: string | null;
  nome: string;
  categoria?: string | null;
  preco: number | null;
  estoque: number | null;
  estoque_minimo?: number | null;
  ativo?: boolean | null;
  created_at?: string | null;
};

const inputClass = "border rounded-xl px-4 py-3 w-full bg-white";

export default function Produtos() {
  const { empresaId, carregandoEmpresa } = useEmpresa();

  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState("");
  const [preco, setPreco] = useState("");
  const [estoque, setEstoque] = useState("");
  const [estoqueMinimo, setEstoqueMinimo] = useState("");
  const [ativo, setAtivo] = useState(true);

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [busca, setBusca] = useState("");

  useEffect(() => {
    if (empresaId) carregarProdutos();
  }, [empresaId]);

  async function carregarProdutos() {
    if (!empresaId) return;

    setLoading(true);

    const { data, error } = await supabase
      .from("produtos")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("nome", { ascending: true });

    if (error) {
      alert("Erro ao carregar produtos: " + error.message);
      setProdutos([]);
    } else {
      setProdutos((data || []) as Produto[]);
    }

    setLoading(false);
  }

  function limparFormulario() {
    setNome("");
    setCategoria("");
    setPreco("");
    setEstoque("");
    setEstoqueMinimo("");
    setAtivo(true);
    setEditandoId(null);
    setMostrarFormulario(false);
  }

  async function salvar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!empresaId) {
      alert("Empresa não encontrada.");
      return;
    }

    if (!nome.trim()) {
      alert("Informe o nome do produto.");
      return;
    }

    setSalvando(true);

    const payload = {
      empresa_id: empresaId,
      nome: nome.trim(),
      categoria: categoria.trim() || null,
      preco: Number(preco || 0),
      estoque: Number(estoque || 0),
      estoque_minimo: Number(estoqueMinimo || 0),
      ativo,
    };

    const resposta = editandoId
      ? await supabase
          .from("produtos")
          .update(payload)
          .eq("id", editandoId)
          .eq("empresa_id", empresaId)
      : await supabase.from("produtos").insert(payload);

    setSalvando(false);

    if (resposta.error) {
      alert("Erro ao salvar produto: " + resposta.error.message);
      return;
    }

    limparFormulario();
    carregarProdutos();
  }

  function editar(produto: Produto) {
    setNome(produto.nome || "");
    setCategoria(produto.categoria || "");
    setPreco(String(produto.preco ?? ""));
    setEstoque(String(produto.estoque ?? ""));
    setEstoqueMinimo(String(produto.estoque_minimo ?? ""));
    setAtivo(produto.ativo !== false);
    setEditandoId(produto.id);
    setMostrarFormulario(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function alterarStatus(produto: Produto) {
    if (!empresaId) return;

    const { error } = await supabase
      .from("produtos")
      .update({ ativo: produto.ativo === false })
      .eq("id", produto.id)
      .eq("empresa_id", empresaId);

    if (error) {
      alert("Erro ao alterar status: " + error.message);
      return;
    }

    carregarProdutos();
  }

  async function excluir(id: string) {
    if (!empresaId) return;
    if (!confirm("Excluir produto?")) return;

    const { error } = await supabase
      .from("produtos")
      .delete()
      .eq("id", id)
      .eq("empresa_id", empresaId);

    if (error) {
      alert("Erro ao excluir produto: " + error.message);
      return;
    }

    carregarProdutos();
  }

  const produtosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return produtos.filter((produto) =>
      `${produto.nome} ${produto.categoria || ""}`.toLowerCase().includes(termo)
    );
  }, [produtos, busca]);

  const estoqueBaixo = useMemo(() => {
    return produtos.filter((produto) =>
      Number(produto.estoque || 0) <= Number(produto.estoque_minimo || 0)
    );
  }, [produtos]);

  const categorias = useMemo(() => {
    return new Set(produtos.map((produto) => produto.categoria).filter(Boolean)).size;
  }, [produtos]);

  function formatarMoeda(valor?: number | null) {
    return Number(valor || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  if (carregandoEmpresa) {
    return <div className="p-6">Carregando empresa...</div>;
  }

  if (!empresaId) {
    return <div className="p-6">Empresa não encontrada.</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Estoque"
        title="Produtos"
        description="Gerencie os produtos vendidos no estabelecimento."
        action={
          <PrimaryButton
            type="button"
            onClick={() => (mostrarFormulario ? limparFormulario() : setMostrarFormulario(true))}
          >
            {mostrarFormulario ? "Fechar" : "+ Novo produto"}
          </PrimaryButton>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SectionCard>
          <p className="text-sm text-slate-500">Total</p>
          <p className="text-2xl font-bold">{produtos.length}</p>
        </SectionCard>

        <SectionCard>
          <p className="text-sm text-slate-500">Estoque baixo</p>
          <p className="text-2xl font-bold text-red-600">{estoqueBaixo.length}</p>
        </SectionCard>

        <SectionCard>
          <p className="text-sm text-slate-500">Categorias</p>
          <p className="text-2xl font-bold">{categorias}</p>
        </SectionCard>
      </div>

      {mostrarFormulario && (
        <SectionCard title={editandoId ? "Editar produto" : "Cadastro de produto"}>
          <form onSubmit={salvar} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              placeholder="Nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className={inputClass}
            />

            <input
              placeholder="Categoria"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className={inputClass}
            />

            <input
              type="number"
              step="0.01"
              placeholder="Preço"
              value={preco}
              onChange={(e) => setPreco(e.target.value)}
              className={inputClass}
            />

            <input
              type="number"
              placeholder="Estoque"
              value={estoque}
              onChange={(e) => setEstoque(e.target.value)}
              className={inputClass}
            />

            <input
              type="number"
              placeholder="Estoque mínimo"
              value={estoqueMinimo}
              onChange={(e) => setEstoqueMinimo(e.target.value)}
              className={inputClass}
            />

            <select
              value={ativo ? "ativo" : "inativo"}
              onChange={(e) => setAtivo(e.target.value === "ativo")}
              className={inputClass}
            >
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>

            <div className="md:col-span-2 flex flex-wrap gap-2">
              <PrimaryButton type="submit" disabled={salvando}>
                {salvando ? "Salvando..." : editandoId ? "Atualizar produto" : "Salvar produto"}
              </PrimaryButton>

              <SecondaryButton type="button" onClick={limparFormulario}>
                Cancelar
              </SecondaryButton>
            </div>
          </form>
        </SectionCard>
      )}

      <SectionCard>
        <input
          placeholder="Buscar produto..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className={inputClass}
        />
      </SectionCard>

      {loading ? (
        <SectionCard>Carregando...</SectionCard>
      ) : produtosFiltrados.length === 0 ? (
        <EmptyState title="Nenhum produto encontrado" />
      ) : (
        <SectionCard title="Produtos cadastrados">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="p-4 text-left">Produto</th>
                  <th className="p-4 text-left">Categoria</th>
                  <th className="p-4 text-left">Preço</th>
                  <th className="p-4 text-left">Estoque</th>
                  <th className="p-4 text-left">Status</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>

              <tbody>
                {produtosFiltrados.map((produto) => {
                  const baixo = Number(produto.estoque || 0) <= Number(produto.estoque_minimo || 0);

                  return (
                    <tr key={produto.id} className="border-t">
                      <td className="p-4 font-bold text-slate-900">{produto.nome}</td>
                      <td className="p-4 text-slate-600">{produto.categoria || "-"}</td>
                      <td className="p-4 font-semibold">{formatarMoeda(produto.preco)}</td>
                      <td className="p-4">
                        <span className={`font-bold ${baixo ? "text-red-600" : "text-slate-900"}`}>
                          {Number(produto.estoque || 0)}
                        </span>
                        <span className="text-xs text-slate-500 ml-1">
                          / mín. {Number(produto.estoque_minimo || 0)}
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-bold ${
                            produto.ativo === false
                              ? "bg-red-100 text-red-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {produto.ativo === false ? "Inativo" : "Ativo"}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex justify-end gap-2">
                          <SecondaryButton type="button" onClick={() => editar(produto)}>
                            Editar
                          </SecondaryButton>

                          <SecondaryButton type="button" onClick={() => alterarStatus(produto)}>
                            {produto.ativo === false ? "Ativar" : "Inativar"}
                          </SecondaryButton>

                          <button
                            type="button"
                            onClick={() => excluir(produto.id)}
                            className="text-xs bg-red-100 text-red-600 px-3 py-2 rounded-lg font-bold"
                          >
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}
    </div>
  );
}
