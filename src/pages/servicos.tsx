import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Servico = {
  id: string;
  nome: string;
  categoria: string | null;
  descricao: string | null;
  preco: number | null;
  preco_promocional: number | null;
  preco_descricao: string | null;
  duracao_padrao_minutos: number | null;
  ativo: boolean;
};

export default function ServicosPage() {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [loading, setLoading] = useState(true);

  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState("");
  const [descricao, setDescricao] = useState("");
  const [preco, setPreco] = useState("");
  const [precoPromocional, setPrecoPromocional] = useState("");
  const [precoDescricao, setPrecoDescricao] = useState("");
  const [duracao, setDuracao] = useState("");
  const [ativo, setAtivo] = useState(true);

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  async function carregarServicos() {
    setLoading(true);

    const { data, error } = await supabase
      .from("servicos")
      .select("*")
      .order("nome", { ascending: true });

    if (error) {
      console.error("Erro ao carregar serviços:", error);
      setServicos([]);
      setLoading(false);
      return;
    }

    setServicos((data || []) as Servico[]);
    setLoading(false);
  }

  useEffect(() => {
    carregarServicos();
  }, []);

  function limparFormulario() {
    setNome("");
    setCategoria("");
    setDescricao("");
    setPreco("");
    setPrecoPromocional("");
    setPrecoDescricao("");
    setDuracao("");
    setAtivo(true);
    setEditandoId(null);
    setMostrarFormulario(false);
  }

  async function salvarServico(e: React.FormEvent) {
    e.preventDefault();

    if (!nome) {
      alert("Nome do serviço é obrigatório.");
      return;
    }

    const payload = {
      nome,
      categoria: categoria || null,
      descricao: descricao || null,
      preco: preco ? Number(preco) : null,
      preco_promocional: precoPromocional ? Number(precoPromocional) : null,
      preco_descricao: precoDescricao || null,
      duracao_padrao_minutos: duracao ? Number(duracao) : 30,
      ativo,
    };

    if (editandoId) {
      const { error } = await supabase
        .from("servicos")
        .update(payload)
        .eq("id", editandoId);

      if (error) {
        console.error("Erro ao atualizar serviço:", error);
        alert("Erro ao atualizar serviço.");
        return;
      }

      limparFormulario();
      carregarServicos();
      return;
    }

    const { error } = await supabase.from("servicos").insert([payload]);

    if (error) {
      console.error("Erro ao salvar serviço:", error);
      alert("Erro ao salvar serviço.");
      return;
    }

    limparFormulario();
    carregarServicos();
  }

  function editarServico(item: Servico) {
    setNome(item.nome || "");
    setCategoria(item.categoria || "");
    setDescricao(item.descricao || "");
    setPreco(item.preco != null ? String(item.preco) : "");
    setPrecoPromocional(
      item.preco_promocional != null ? String(item.preco_promocional) : ""
    );
    setPrecoDescricao(item.preco_descricao || "");
    setDuracao(
      item.duracao_padrao_minutos != null
        ? String(item.duracao_padrao_minutos)
        : ""
    );
    setAtivo(item.ativo);
    setEditandoId(item.id);
    setMostrarFormulario(true);
  }

  async function toggleAtivo(id: string, ativoAtual: boolean) {
    const { error } = await supabase
      .from("servicos")
      .update({ ativo: !ativoAtual })
      .eq("id", id);

    if (error) {
      console.error("Erro ao atualizar status do serviço:", error);
      alert("Erro ao atualizar serviço.");
      return;
    }

    carregarServicos();
  }

  function formatarMoeda(valor: number | null) {
    return Number(valor || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Serviços</h1>
          <p className="text-slate-500">Gerencie serviços, preços e duração</p>
        </div>

        <button
          onClick={() => {
            if (mostrarFormulario) {
              limparFormulario();
            } else {
              setMostrarFormulario(true);
            }
          }}
          className="bg-orange-500 text-white px-4 py-2 rounded"
        >
          {mostrarFormulario ? "Fechar" : "Novo serviço"}
        </button>
      </div>

      {mostrarFormulario && (
        <form
          onSubmit={salvarServico}
          className="bg-white border rounded-lg p-4 space-y-3"
        >
          <input
            placeholder="Nome do serviço"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="border p-2 w-full rounded"
          />

          <input
            placeholder="Categoria"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            className="border p-2 w-full rounded"
          />

          <textarea
            placeholder="Descrição"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            className="border p-2 w-full rounded"
          />

          <input
            type="number"
            step="0.01"
            placeholder="Preço normal"
            value={preco}
            onChange={(e) => setPreco(e.target.value)}
            className="border p-2 w-full rounded"
          />

          <input
            type="number"
            step="0.01"
            placeholder="Preço promocional"
            value={precoPromocional}
            onChange={(e) => setPrecoPromocional(e.target.value)}
            className="border p-2 w-full rounded"
          />

          <input
            placeholder="Descrição do preço (ex: a partir de R$ 20)"
            value={precoDescricao}
            onChange={(e) => setPrecoDescricao(e.target.value)}
            className="border p-2 w-full rounded"
          />

          <input
            type="number"
            placeholder="Duração em minutos"
            value={duracao}
            onChange={(e) => setDuracao(e.target.value)}
            className="border p-2 w-full rounded"
          />

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={ativo}
              onChange={(e) => setAtivo(e.target.checked)}
            />
            Serviço ativo
          </label>

          <button className="bg-black text-white px-4 py-2 rounded">
            {editandoId ? "Atualizar" : "Salvar"}
          </button>
        </form>
      )}

      <div className="space-y-3">
        {loading ? (
          <p>Carregando...</p>
        ) : servicos.length === 0 ? (
          <p>Nenhum serviço encontrado.</p>
        ) : (
          servicos.map((item) => (
            <div
              key={item.id}
              className="bg-white border rounded-lg p-4 flex justify-between items-start"
            >
              <div>
                <p className="font-bold">{item.nome}</p>
                <p className="text-sm text-slate-500">{item.categoria}</p>
                {item.descricao && (
                  <p className="text-sm text-slate-500">{item.descricao}</p>
                )}
                <p className="text-sm text-slate-700">
                  Preço: {formatarMoeda(item.preco)}
                </p>
                {item.preco_promocional != null && (
                  <p className="text-sm text-green-600">
                    Promoção: {formatarMoeda(item.preco_promocional)}
                  </p>
                )}
                {item.preco_descricao && (
                  <p className="text-xs text-slate-400">{item.preco_descricao}</p>
                )}
                <p className="text-sm text-slate-500">
                  Duração: {item.duracao_padrao_minutos || 0} min
                </p>
                <p className="text-xs mt-1">
                  {item.ativo ? "Ativo" : "Inativo"}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => editarServico(item)}
                  className="text-blue-600"
                >
                  Editar
                </button>

                <button
                  type="button"
                  onClick={() => toggleAtivo(item.id, item.ativo)}
                  className="text-orange-600"
                >
                  {item.ativo ? "Inativar" : "Ativar"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}