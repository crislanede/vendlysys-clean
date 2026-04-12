import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Cliente = {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  cep: string;
  endereco: string;
  bairro: string;
  cidade: string;
  estado: string;
  data_nascimento: string;
};

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [buscandoCep, setBuscandoCep] = useState(false);

  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [cep, setCep] = useState("");
  const [endereco, setEndereco] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  async function carregarClientes() {
    setLoading(true);

    const { data, error } = await supabase
      .from("clientes")
      .select("*")
      .order("nome", { ascending: true });

    if (error) {
      console.error("Erro ao carregar clientes:", error);
      setClientes([]);
      setLoading(false);
      return;
    }

    setClientes((data || []) as Cliente[]);
    setLoading(false);
  }

  useEffect(() => {
    carregarClientes();
  }, []);

  function limparFormulario() {
    setNome("");
    setTelefone("");
    setEmail("");
    setCep("");
    setEndereco("");
    setBairro("");
    setCidade("");
    setEstado("");
    setDataNascimento("");
    setEditandoId(null);
    setMostrarFormulario(false);
  }

  function limparCep(valor: string) {
    return valor.replace(/\D/g, "");
  }

  function formatarCep(valor: string) {
    const cepLimpo = limparCep(valor);

    if (cepLimpo.length <= 5) return cepLimpo;
    return `${cepLimpo.slice(0, 5)}-${cepLimpo.slice(5, 8)}`;
  }

  async function buscarEnderecoPorCep(cepDigitado: string) {
    const cepLimpo = limparCep(cepDigitado);

    if (cepLimpo.length !== 8) return;

    setBuscandoCep(true);

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await response.json();

      if (data.erro) {
        alert("CEP não encontrado.");
        setBuscandoCep(false);
        return;
      }

      setEndereco(data.logradouro || "");
      setBairro(data.bairro || "");
      setCidade(data.localidade || "");
      setEstado(data.uf || "");
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
      alert("Erro ao buscar CEP.");
    } finally {
      setBuscandoCep(false);
    }
  }

  async function salvarCliente(e: React.FormEvent) {
    e.preventDefault();

    if (!nome) {
      alert("Nome é obrigatório.");
      return;
    }

    const payload = {
      nome,
      telefone,
      email,
      cep: limparCep(cep),
      endereco,
      bairro,
      cidade,
      estado,
      data_nascimento: dataNascimento || null,
    };

    if (editandoId) {
      const { error } = await supabase
        .from("clientes")
        .update(payload)
        .eq("id", editandoId);

      if (error) {
        console.error("Erro ao atualizar cliente:", error);
        alert("Erro ao atualizar cliente.");
        return;
      }

      limparFormulario();
      carregarClientes();
      return;
    }

    const { error } = await supabase.from("clientes").insert([payload]);

    if (error) {
      console.error("Erro ao salvar cliente:", error);
      alert("Erro ao salvar cliente.");
      return;
    }

    limparFormulario();
    carregarClientes();
  }

  function editarCliente(item: Cliente) {
    setNome(item.nome || "");
    setTelefone(item.telefone || "");
    setEmail(item.email || "");
    setCep(item.cep ? formatarCep(item.cep) : "");
    setEndereco(item.endereco || "");
    setBairro(item.bairro || "");
    setCidade(item.cidade || "");
    setEstado(item.estado || "");
    setDataNascimento(item.data_nascimento || "");
    setEditandoId(item.id);
    setMostrarFormulario(true);
  }

  async function excluirCliente(id: string) {
    const confirmar = window.confirm("Excluir cliente?");
    if (!confirmar) return;

    const { error } = await supabase.from("clientes").delete().eq("id", id);

    if (error) {
      console.error("Erro ao excluir cliente:", error);
      alert("Erro ao excluir cliente.");
      return;
    }

    carregarClientes();
  }

  function formatarData(data?: string) {
    if (!data) return "";
    return new Date(data).toLocaleDateString("pt-BR");
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Clientes</h1>

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
          {mostrarFormulario ? "Fechar" : "Novo cliente"}
        </button>
      </div>

      {mostrarFormulario && (
        <form
          onSubmit={salvarCliente}
          className="space-y-3 bg-white p-4 rounded-lg border"
        >
          <input
            placeholder="Nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="border p-2 w-full rounded"
          />

          <input
            placeholder="Telefone"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            className="border p-2 w-full rounded"
          />

          <input
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border p-2 w-full rounded"
          />

          <input
            placeholder="CEP"
            value={cep}
            onChange={(e) => setCep(formatarCep(e.target.value))}
            onBlur={() => buscarEnderecoPorCep(cep)}
            className="border p-2 w-full rounded"
          />

          {buscandoCep && (
            <p className="text-sm text-slate-500">Buscando endereço pelo CEP...</p>
          )}

          <input
            placeholder="Endereço"
            value={endereco}
            onChange={(e) => setEndereco(e.target.value)}
            className="border p-2 w-full rounded"
          />

          <input
            placeholder="Bairro"
            value={bairro}
            onChange={(e) => setBairro(e.target.value)}
            className="border p-2 w-full rounded"
          />

          <input
            placeholder="Cidade"
            value={cidade}
            onChange={(e) => setCidade(e.target.value)}
            className="border p-2 w-full rounded"
          />

          <input
            placeholder="Estado"
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
            className="border p-2 w-full rounded"
          />

          <input
            type="date"
            value={dataNascimento}
            onChange={(e) => setDataNascimento(e.target.value)}
            className="border p-2 w-full rounded"
          />

          <button className="bg-black text-white px-4 py-2 rounded">
            {editandoId ? "Atualizar" : "Salvar"}
          </button>
        </form>
      )}

      <div className="space-y-2">
        {loading ? (
          <p>Carregando...</p>
        ) : clientes.length === 0 ? (
          <p>Nenhum cliente cadastrado.</p>
        ) : (
          clientes.map((item) => (
            <div
              key={item.id}
              className="border p-3 rounded flex justify-between"
            >
              <div>
                <p className="font-bold">{item.nome}</p>
                <p className="text-sm">{item.telefone}</p>
                <p className="text-sm text-gray-500">{item.email}</p>
                <p className="text-sm text-gray-500">
                  {item.endereco} {item.bairro ? `- ${item.bairro}` : ""}
                </p>
                <p className="text-sm text-gray-500">
                  {item.cidade} {item.estado ? `- ${item.estado}` : ""}
                </p>
                <p className="text-sm text-gray-500">
                  CEP: {item.cep ? formatarCep(item.cep) : ""}
                </p>
                <p className="text-xs text-gray-400">
                  Nascimento: {formatarData(item.data_nascimento)}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => editarCliente(item)}
                  className="text-blue-600"
                >
                  Editar
                </button>

                <button
                  type="button"
                  onClick={() => excluirCliente(item.id)}
                  className="text-red-600"
                >
                  Excluir
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}