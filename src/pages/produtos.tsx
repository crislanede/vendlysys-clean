import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

import PageHeader from "../components/ui/PageHeader";
import SectionCard from "../components/ui/SectionCard";
import PrimaryButton from "../components/ui/PrimaryButton";
import SecondaryButton from "../components/ui/SecondaryButton";
import EmptyState from "../components/ui/EmptyState";

type Produto = {
  id: string;
  nome: string;
  categoria?: string | null;
  preco: number;
  estoque: number;
  estoque_minimo?: number;
  ativo?: boolean;
};

export default function Produtos() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);

  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState("");
  const [preco, setPreco] = useState("");
  const [estoque, setEstoque] = useState("");
  const [estoqueMinimo, setEstoqueMinimo] = useState("");

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [busca, setBusca] = useState("");

  useEffect(() => {
    carregarProdutos();
  }, []);

  async function carregarProdutos() {
    setLoading(true);

    const { data, error } = await supabase
      .from("produtos")
      .select("*")
      .order("nome", { ascending: true });

    if (error) {
      alert("Erro ao carregar produtos: " + error.message);
      setProdutos([]);
    } else {
      setProdutos(data || []);
    }

    setLoading(false);
  }

  function limpar() {
    setNome("");
    setCategoria("");
    setPreco("");
    setEstoque("");
    setEstoqueMinimo("");
    setEditandoId(null);
    setMostrarFormulario(false);
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();

    if (!nome) return alert("Informe o nome");

    const payload = {
      nome,
      categoria,
      preco: Number(preco || 0),
      estoque: Number(estoque || 0),
      estoque_minimo: Number(estoqueMinimo || 0),
    };

    const resposta = editandoId
      ? await supabase.from("produtos").update(payload).eq("id", editandoId)
      : await supabase.from("produtos").insert([payload]);

    if (resposta.error) {
      alert("Erro: " + resposta.error.message);
      return;
    }

    limpar();
    carregarProdutos();
  }

  function editar(p: Produto) {
    setNome(p.nome);
    setCategoria(p.categoria || "");
    setPreco(String(p.preco));
    setEstoque(String(p.estoque));
    setEstoqueMinimo(String(p.estoque_minimo || ""));
    setEditandoId(p.id);
    setMostrarFormulario(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function excluir(id: string) {
    if (!confirm("Excluir produto?")) return;

    await supabase.from("produtos").delete().eq("id", id);
    carregarProdutos();
  }

  const filtrados = useMemo(() => {
    return produtos.filter((p) =>
      `${p.nome} ${p.categoria}`.toLowerCase().includes(busca.toLowerCase())
    );
  }, [produtos, busca]);

  const estoqueBaixo = filtrados.filter(
    (p) => p.estoque <= (p.estoque_minimo || 0)
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Estoque"
        title="Produtos"
        description="Gerencie os produtos vendidos no estabelecimento"
        action={
          <PrimaryButton
            onClick={() =>
              mostrarFormulario ? limpar() : setMostrarFormulario(true)
            }
          >
            {mostrarFormulario ? "Fechar" : "+ Novo produto"}
          </PrimaryButton>
        }
      />

      {/* RESUMO */}
      <div className="grid md:grid-cols-3 gap-4">
        <SectionCard>
          <p className="text-sm text-slate-500">Total</p>
          <p className="text-2xl font-bold">{produtos.length}</p>
        </SectionCard>

        <SectionCard>
          <p className="text-sm text-slate-500">Estoque baixo</p>
          <p className="text-2xl font-bold text-red-600">
            {estoqueBaixo.length}
          </p>
        </SectionCard>

        <SectionCard>
          <p className="text-sm text-slate-500">Categorias</p>
          <p className="text-2xl font-bold">
            {[...new Set(produtos.map((p) => p.categoria))].length}
          </p>
        </SectionCard>
      </div>

      {/* FORM */}
      {mostrarFormulario && (
        <SectionCard title="Cadastro de produto">
          <form onSubmit={salvar} className="grid md:grid-cols-2 gap-4">
            <input
              placeholder="Nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="input"
            />

            <input
              placeholder="Categoria"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="input"
            />

            <input
              placeholder="Preço"
              value={preco}
              onChange={(e) => setPreco(e.target.value)}
              className="input"
            />

            <input
              placeholder="Estoque"
              value={estoque}
              onChange={(e) => setEstoque(e.target.value)}
              className="input"
            />

            <input
              placeholder="Estoque mínimo"
              value={estoqueMinimo}
              onChange={(e) => setEstoqueMinimo(e.target.value)}
              className="input"
            />

            <div className="flex gap-2 col-span-2">
              <PrimaryButton type="submit">
                {editandoId ? "Atualizar" : "Salvar"}
              </PrimaryButton>

              <SecondaryButton type="button" onClick={limpar}>
                Cancelar
              </SecondaryButton>
            </div>
          </form>
        </SectionCard>
      )}

      {/* BUSCA */}
      <SectionCard>
        <input
          placeholder="Buscar produto..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="input w-full"
        />
      </SectionCard>

      {/* LISTA */}
      {loading ? (
        <SectionCard>Carregando...</SectionCard>
      ) : filtrados.length === 0 ? (
        <EmptyState title="Nenhum produto encontrado" />
      ) : (
        <SectionCard>
          <div className="overflow-auto">
            <table className="w-full">
              <thead
                style={{ background: "var(--color-primary)", color: "#fff" }}
              >
                <tr>
                  <th className="p-3 text-left">Nome</th>
                  <th>Categoria</th>
                  <th>Preço</th>
                  <th>Estoque</th>
                  <th>Ações</th>
                </tr>
              </thead>

              <tbody>
                {filtrados.map((p) => (
                  <tr key={p.id} className="border-b">
                    <td className="p-3 font-bold">{p.nome}</td>
                    <td>{p.categoria}</td>
                    <td>R$ {p.preco}</td>

                    <td>
                      <span
                        className={`font-bold ${
                          p.estoque <= (p.estoque_minimo || 0)
                            ? "text-red-600"
                            : ""
                        }`}
                      >
                        {p.estoque}
                      </span>
                    </td>

                    <td className="flex gap-2">
                      <SecondaryButton onClick={() => editar(p)}>
                        Editar
                      </SecondaryButton>

                      <button
                        onClick={() => excluir(p.id)}
                        className="text-red-600 font-bold"
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}
    </div>
  );
}