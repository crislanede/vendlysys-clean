import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { useEmpresa } from "../hooks/useEmpresa";

type Cliente = {
  id: string;
  nome: string | null;
  telefone: string | null;
  email?: string | null;
  data_nascimento?: string | null;
};

export default function Campanhas() {
  const { empresa } = useEmpresa() as any;

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("todos");

  const [mensagem, setMensagem] = useState(
    "Olá, {{cliente}}! 💜 Temos uma condição especial para você no {{empresa}}. Responda essa mensagem para saber mais."
  );

  useEffect(() => {
    carregarClientes();
  }, []);

  async function carregarClientes() {
    const { data, error } = await supabase
      .from("clientes")
      .select("id, nome, telefone, email, data_nascimento")
      .order("nome", { ascending: true });

    if (error) {
      alert("Erro ao carregar clientes.");
      console.error(error);
      return;
    }

    setClientes(data || []);
  }

  const clientesFiltrados = useMemo(() => {
    const termo = busca.toLowerCase().trim();

    return clientes.filter((cliente) => {
      const nome = cliente.nome || "";
      const telefone = cliente.telefone || "";

      const bateBusca =
        nome.toLowerCase().includes(termo) ||
        telefone.toLowerCase().includes(termo);

      if (!bateBusca) return false;

      if (filtro === "aniversariantes") {
        if (!cliente.data_nascimento) return false;

        const hoje = new Date();
        const nasc = new Date(cliente.data_nascimento);

        return (
          hoje.getMonth() === nasc.getMonth() &&
          hoje.getDate() === nasc.getDate()
        );
      }

      if (filtro === "sem_telefone") {
        return !cliente.telefone;
      }

      if (filtro === "com_telefone") {
        return !!cliente.telefone;
      }

      return true;
    });
  }, [clientes, busca, filtro]);

  function toggleCliente(id: string) {
    setSelecionados((atual) =>
      atual.includes(id)
        ? atual.filter((item) => item !== id)
        : [...atual, id]
    );
  }

  function selecionarTodos() {
    const ids = clientesFiltrados
      .filter((c) => c.telefone)
      .map((c) => c.id);

    setSelecionados(ids);
  }

  function limparSelecao() {
    setSelecionados([]);
  }

  function montarMensagem(cliente: Cliente) {
    return mensagem
      .replaceAll("{{cliente}}", cliente.nome || "")
      .replaceAll("{{empresa}}", empresa?.nome_fantasia || empresa?.nome || "");
  }

  function enviarWhatsApp(cliente: Cliente) {
    if (!cliente.telefone) {
      alert("Cliente sem telefone.");
      return;
    }

    const telefoneLimpo = cliente.telefone.replace(/\D/g, "");
    const texto = montarMensagem(cliente);

    const url = `https://wa.me/55${telefoneLimpo}?text=${encodeURIComponent(
      texto
    )}`;

    window.open(url, "_blank");
  }

  function enviarSelecionados() {
    const lista = clientes.filter((c) => selecionados.includes(c.id));

    if (lista.length === 0) {
      alert("Selecione pelo menos um cliente.");
      return;
    }

    lista.forEach((cliente, index) => {
      setTimeout(() => {
        enviarWhatsApp(cliente);
      }, index * 800);
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-r from-purple-950 to-purple-700 p-8 text-white shadow-xl">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-pink-300">
          Marketing
        </p>
        <h1 className="mt-2 text-4xl font-black">Campanhas WhatsApp</h1>
        <p className="mt-2 text-white/80">
          Envie promoções, lembretes e mensagens manuais para seus clientes.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <CardResumo titulo="Clientes" valor={clientes.length} />
        <CardResumo titulo="Filtrados" valor={clientesFiltrados.length} />
        <CardResumo titulo="Selecionados" valor={selecionados.length} />
      </div>

      <div className="rounded-3xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-black">Mensagem da campanha</h2>
        <p className="mb-4 text-sm text-slate-500">
          Use variáveis como {"{{cliente}}"} e {"{{empresa}}"}.
        </p>

        <textarea
          value={mensagem}
          onChange={(e) => setMensagem(e.target.value)}
          className="min-h-[160px] w-full rounded-2xl border border-slate-200 p-4 outline-none focus:border-purple-500"
        />

        <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800">
          <strong>Prévia:</strong>{" "}
          {clientesFiltrados[0]
            ? montarMensagem(clientesFiltrados[0])
            : "Selecione um cliente para visualizar a prévia."}
        </div>
      </div>

      <div className="rounded-3xl border bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-black">Clientes</h2>
            <p className="text-sm text-slate-500">
              Escolha para quem deseja enviar a campanha.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={selecionarTodos}
              className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold"
            >
              Selecionar todos
            </button>

            <button
              onClick={limparSelecao}
              className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold"
            >
              Limpar
            </button>

            <button
              onClick={enviarSelecionados}
              className="rounded-xl bg-purple-700 px-4 py-2 text-sm font-black text-white"
            >
              Enviar selecionados
            </button>
          </div>
        </div>

        <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2">
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou telefone"
            className="rounded-2xl border border-slate-200 p-3 outline-none focus:border-purple-500"
          />

          <select
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="rounded-2xl border border-slate-200 p-3 outline-none focus:border-purple-500"
          >
            <option value="todos">Todos</option>
            <option value="com_telefone">Com telefone</option>
            <option value="sem_telefone">Sem telefone</option>
            <option value="aniversariantes">Aniversariantes de hoje</option>
          </select>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-4 text-left">Selecionar</th>
                <th className="p-4 text-left">Cliente</th>
                <th className="p-4 text-left">Telefone</th>
                <th className="p-4 text-right">Ação</th>
              </tr>
            </thead>

            <tbody>
              {clientesFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-slate-500">
                    Nenhum cliente encontrado.
                  </td>
                </tr>
              ) : (
                clientesFiltrados.map((cliente) => (
                  <tr key={cliente.id} className="border-t">
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={selecionados.includes(cliente.id)}
                        disabled={!cliente.telefone}
                        onChange={() => toggleCliente(cliente.id)}
                      />
                    </td>

                    <td className="p-4 font-bold">
                      {cliente.nome || "Sem nome"}
                    </td>

                    <td className="p-4">
                      {cliente.telefone || (
                        <span className="text-red-500">Sem telefone</span>
                      )}
                    </td>

                    <td className="p-4 text-right">
                      <button
                        onClick={() => enviarWhatsApp(cliente)}
                        disabled={!cliente.telefone}
                        className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white disabled:opacity-40"
                      >
                        WhatsApp
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CardResumo({ titulo, valor }: { titulo: string; valor: number }) {
  return (
    <div className="rounded-3xl border bg-white p-5 shadow-sm">
      <p className="text-xs font-black uppercase text-slate-400">{titulo}</p>
      <p className="mt-2 text-3xl font-black text-slate-900">{valor}</p>
    </div>
  );
}