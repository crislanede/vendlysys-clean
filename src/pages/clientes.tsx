import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { useEmpresa } from "../hooks/useEmpresa";

type Cliente = {
  id: string;
  nome: string;
  telefone: string;
  email?: string | null;
};

export default function ClientesPage() {
  const { empresaId, carregandoEmpresa } = useEmpresa();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busca, setBusca] = useState("");

  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");

  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (empresaId) carregarClientes();
  }, [empresaId]);

  async function carregarClientes() {
    if (!empresaId) return;

    setLoading(true);

    const { data, error } = await supabase
      .from("clientes")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("nome");

    setLoading(false);

    if (error) {
      alert("Erro ao carregar clientes: " + error.message);
      return;
    }

    setClientes(data || []);
  }

  async function salvar() {
    if (!empresaId) {
      alert("Empresa não encontrada.");
      return;
    }

    if (!nome.trim() || !telefone.trim()) {
      alert("Preencha nome e telefone.");
      return;
    }

    setSalvando(true);

    const { error } = await supabase.from("clientes").insert({
      nome: nome.trim(),
      telefone: telefone.trim(),
      email: email.trim() || null,
      empresa_id: empresaId,
    });

    setSalvando(false);

    if (error) {
      alert("Erro ao salvar cliente: " + error.message);
      return;
    }

    setNome("");
    setTelefone("");
    setEmail("");

    carregarClientes();
  }

  async function remover(id: string) {
    if (!confirm("Deseja excluir este cliente?")) return;

    const { error } = await supabase
      .from("clientes")
      .delete()
      .eq("id", id)
      .eq("empresa_id", empresaId);

    if (error) {
      alert("Erro ao excluir cliente: " + error.message);
      return;
    }

    carregarClientes();
  }

  const clientesFiltrados = useMemo(() => {
    const termo = busca.toLowerCase();

    return clientes.filter((cliente) =>
      `${cliente.nome} ${cliente.telefone} ${cliente.email || ""}`
        .toLowerCase()
        .includes(termo)
    );
  }, [clientes, busca]);

  if (carregandoEmpresa) {
    return <div className="p-6">Carregando empresa...</div>;
  }

  if (!empresaId) {
    return <div className="p-6">Empresa não encontrada.</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-pink-600 uppercase">
            Cadastros
          </p>
          <h1 className="text-3xl font-bold text-slate-900">Clientes</h1>
          <p className="text-slate-500">
            Cadastre e gerencie os clientes do estabelecimento.
          </p>
        </div>

        <button
          onClick={carregarClientes}
          className="border px-4 py-2 rounded-xl font-bold bg-white"
        >
          Atualizar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="Total de clientes" value={clientes.length} />
        <Card
          title="Com telefone"
          value={clientes.filter((c) => !!c.telefone).length}
        />
        <Card
          title="Com e-mail"
          value={clientes.filter((c) => !!c.email).length}
        />
      </div>

      <div className="bg-white rounded-2xl border shadow-sm p-5">
        <h2 className="font-bold text-slate-900 mb-4">Novo cliente</h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            placeholder="Nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="border rounded-xl px-4 py-3"
          />

          <input
            placeholder="Telefone / WhatsApp"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            className="border rounded-xl px-4 py-3"
          />

          <input
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border rounded-xl px-4 py-3"
          />

          <button
            onClick={salvar}
            disabled={salvando}
            className="bg-pink-600 text-white rounded-xl px-5 py-3 font-bold disabled:opacity-60"
          >
            {salvando ? "Salvando..." : "Salvar cliente"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="p-5 border-b flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-bold text-slate-900">Clientes cadastrados</h2>
            <p className="text-sm text-slate-500">
              {clientesFiltrados.length} cliente(s) encontrado(s).
            </p>
          </div>

          <input
            placeholder="Buscar por nome, telefone ou e-mail..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="border rounded-xl px-4 py-3 w-full md:w-96"
          />
        </div>

        {loading ? (
          <div className="p-6">Carregando...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr className="text-left">
                  <th className="p-4">Cliente</th>
                  <th>Telefone</th>
                  <th>E-mail</th>
                  <th className="text-right pr-4">Ações</th>
                </tr>
              </thead>

              <tbody>
                {clientesFiltrados.map((cliente) => (
                  <tr key={cliente.id} className="border-t hover:bg-slate-50">
                    <td className="p-4 font-bold text-slate-900">
                      {cliente.nome}
                    </td>
                    <td>{cliente.telefone || "-"}</td>
                    <td>{cliente.email || "-"}</td>
                    <td className="text-right pr-4">
                      <button
                        onClick={() => remover(cliente.id)}
                        className="bg-red-50 text-red-600 px-3 py-2 rounded-xl text-xs font-bold"
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}

                {clientesFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-10 text-center text-slate-500">
                      Nenhum cliente encontrado.
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