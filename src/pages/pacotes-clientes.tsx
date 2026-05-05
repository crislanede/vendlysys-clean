import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { useEmpresa } from "../hooks/useEmpresa";

type Cliente = {
  id: string;
  nome: string | null;
  telefone?: string | null;
  empresa_id?: string | null;
};

type Pacote = {
  id: string;
  nome: string | null;
  valor_final?: number | null;
  valor_original?: number | null;
  empresa_id?: string | null;
};

type Servico = {
  id: string;
  nome: string | null;
  empresa_id?: string | null;
};

type ClientePacote = {
  id: string;
  empresa_id: string | null;
  cliente_id: string;
  pacote_id: string;
  data_inicio: string | null;
  data_fim: string | null;
  validade_dias?: number | null;
  quantidade_pacotes?: number | null;
  status: string | null;
  created_at?: string | null;
  criado_em?: string | null;
};

type SaldoPacote = {
  id: string;
  cliente_pacote_id: string;
  servico_id: string;
  quantidade_total: number | null;
  quantidade_usada: number | null;
};

type VinculoLista = ClientePacote & {
  clienteNome: string;
  clienteTelefone: string;
  pacoteNome: string;
  saldos: Array<SaldoPacote & { servicoNome: string; restante: number }>;
};

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatarData(data?: string | null) {
  if (!data) return "Sem vencimento";
  const partes = data.split("-");
  if (partes.length !== 3) return data;
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function calcularDataFim(dataInicio: string, dias: number) {
  const data = new Date(`${dataInicio}T00:00:00`);
  data.setDate(data.getDate() + Number(dias || 0));
  return data.toISOString().slice(0, 10);
}

export default function PacotesClientes() {
  const { empresaId } = useEmpresa() as any;

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [pacotes, setPacotes] = useState<Pacote[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [vinculos, setVinculos] = useState<ClientePacote[]>([]);
  const [saldos, setSaldos] = useState<SaldoPacote[]>([]);

  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("ativo");
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [modalVinculoAberto, setModalVinculoAberto] = useState(false);
  const [vinculoEditando, setVinculoEditando] = useState<VinculoLista | null>(null);
  const [formVinculo, setFormVinculo] = useState({
    data_inicio: hojeISO(),
    data_fim: "",
    validade_dias: "",
    quantidade_pacotes: "1",
    status: "ativo",
  });

  const [modalSaldoAberto, setModalSaldoAberto] = useState(false);
  const [saldoEditando, setSaldoEditando] = useState<(SaldoPacote & { servicoNome: string }) | null>(null);
  const [formSaldo, setFormSaldo] = useState({
    quantidade_total: "0",
    quantidade_usada: "0",
  });

  useEffect(() => {
    if (empresaId) carregarTudo();
  }, [empresaId]);

  async function carregarTudo() {
    if (!empresaId) return;
    setLoading(true);

    const [clientesResp, pacotesResp, servicosResp, vinculosResp] = await Promise.all([
      supabase
        .from("clientes")
        .select("id, nome, telefone, empresa_id")
        .eq("empresa_id", empresaId)
        .order("nome", { ascending: true }),
      supabase
        .from("marketing_pacotes")
        .select("id, nome, valor_final, valor_original, empresa_id")
        .eq("empresa_id", empresaId)
        .order("nome", { ascending: true }),
      supabase
        .from("servicos")
        .select("id, nome, empresa_id")
        .eq("empresa_id", empresaId)
        .order("nome", { ascending: true }),
      supabase
        .from("cliente_pacotes")
        .select("*")
        .eq("empresa_id", empresaId)
        .order("created_at", { ascending: false }),
    ]);

    if (clientesResp.error) alert("Erro ao carregar clientes: " + clientesResp.error.message);
    if (pacotesResp.error) alert("Erro ao carregar pacotes: " + pacotesResp.error.message);
    if (servicosResp.error) alert("Erro ao carregar serviços: " + servicosResp.error.message);
    if (vinculosResp.error) alert("Erro ao carregar pacotes dos clientes: " + vinculosResp.error.message);

    const vinculosData = (vinculosResp.data || []) as ClientePacote[];
    const vinculoIds = vinculosData.map((item) => item.id);

    let saldosData: SaldoPacote[] = [];

    if (vinculoIds.length > 0) {
      const saldosResp = await supabase
        .from("cliente_pacote_saldos")
        .select("id, cliente_pacote_id, servico_id, quantidade_total, quantidade_usada")
        .in("cliente_pacote_id", vinculoIds);

      if (saldosResp.error) {
        alert("Erro ao carregar saldos: " + saldosResp.error.message);
      } else {
        saldosData = (saldosResp.data || []) as SaldoPacote[];
      }
    }

    setClientes((clientesResp.data || []) as Cliente[]);
    setPacotes((pacotesResp.data || []) as Pacote[]);
    setServicos((servicosResp.data || []) as Servico[]);
    setVinculos(vinculosData);
    setSaldos(saldosData);
    setLoading(false);
  }

  const lista = useMemo<VinculoLista[]>(() => {
    return vinculos.map((vinculo) => {
      const cliente = clientes.find((item) => item.id === vinculo.cliente_id);
      const pacote = pacotes.find((item) => item.id === vinculo.pacote_id);

      const saldosDoVinculo = saldos
        .filter((saldo) => saldo.cliente_pacote_id === vinculo.id)
        .map((saldo) => {
          const total = Number(saldo.quantidade_total || 0);
          const usada = Number(saldo.quantidade_usada || 0);
          const servico = servicos.find((item) => item.id === saldo.servico_id);

          return {
            ...saldo,
            servicoNome: servico?.nome || "Serviço não encontrado",
            restante: total - usada,
          };
        });

      return {
        ...vinculo,
        clienteNome: cliente?.nome || "Cliente não encontrado",
        clienteTelefone: cliente?.telefone || "",
        pacoteNome: pacote?.nome || "Pacote não encontrado",
        saldos: saldosDoVinculo,
      };
    });
  }, [vinculos, clientes, pacotes, saldos, servicos]);

  const listaFiltrada = useMemo(() => {
    const termo = busca.toLowerCase().trim();

    return lista.filter((item) => {
      const texto = `${item.clienteNome} ${item.clienteTelefone} ${item.pacoteNome}`.toLowerCase();
      const bateBusca = !termo || texto.includes(termo);
      const bateStatus = filtroStatus === "todos" || (item.status || "") === filtroStatus;
      return bateBusca && bateStatus;
    });
  }, [lista, busca, filtroStatus]);

  function abrirEditarVinculo(item: VinculoLista) {
    setVinculoEditando(item);
    setFormVinculo({
      data_inicio: item.data_inicio || hojeISO(),
      data_fim: item.data_fim || "",
      validade_dias: item.validade_dias ? String(item.validade_dias) : "",
      quantidade_pacotes: String(item.quantidade_pacotes || 1),
      status: item.status || "ativo",
    });
    setModalVinculoAberto(true);
  }

  async function salvarVinculo() {
    if (!vinculoEditando) return;

    setSalvando(true);

    const { error } = await supabase
      .from("cliente_pacotes")
      .update({
        data_inicio: formVinculo.data_inicio || null,
        data_fim: formVinculo.data_fim || null,
        validade_dias: formVinculo.validade_dias ? Number(formVinculo.validade_dias) : null,
        quantidade_pacotes: Number(formVinculo.quantidade_pacotes || 1),
        status: formVinculo.status,
      })
      .eq("id", vinculoEditando.id);

    setSalvando(false);

    if (error) {
      alert("Erro ao atualizar pacote do cliente: " + error.message);
      return;
    }

    setModalVinculoAberto(false);
    setVinculoEditando(null);
    await carregarTudo();
  }

  function abrirEditarSaldo(saldo: SaldoPacote & { servicoNome: string }) {
    setSaldoEditando(saldo);
    setFormSaldo({
      quantidade_total: String(saldo.quantidade_total || 0),
      quantidade_usada: String(saldo.quantidade_usada || 0),
    });
    setModalSaldoAberto(true);
  }

  async function salvarSaldo() {
    if (!saldoEditando) return;

    const total = Number(formSaldo.quantidade_total || 0);
    const usada = Number(formSaldo.quantidade_usada || 0);

    if (total < 0 || usada < 0) {
      alert("As quantidades não podem ser negativas.");
      return;
    }

    if (usada > total) {
      alert("A quantidade usada não pode ser maior que a quantidade total.");
      return;
    }

    setSalvando(true);

    const { error } = await supabase
      .from("cliente_pacote_saldos")
      .update({
        quantidade_total: total,
        quantidade_usada: usada,
      })
      .eq("id", saldoEditando.id);

    setSalvando(false);

    if (error) {
      alert("Erro ao atualizar saldo: " + error.message);
      return;
    }

    setModalSaldoAberto(false);
    setSaldoEditando(null);
    await carregarTudo();
  }

  async function inativarVinculo(item: VinculoLista) {
    const confirmar = confirm(`Inativar o pacote ${item.pacoteNome} de ${item.clienteNome}?`);
    if (!confirmar) return;

    const { error } = await supabase
      .from("cliente_pacotes")
      .update({ status: "inativo" })
      .eq("id", item.id);

    if (error) {
      alert("Erro ao inativar pacote: " + error.message);
      return;
    }

    await carregarTudo();
  }

  function aplicarValidadeDias() {
    const dias = Number(formVinculo.validade_dias || 0);
    if (!dias || dias < 1) {
      setFormVinculo({ ...formVinculo, data_fim: "" });
      return;
    }

    setFormVinculo({
      ...formVinculo,
      data_fim: calcularDataFim(formVinculo.data_inicio || hojeISO(), dias),
    });
  }

  const totalAtivos = lista.filter((item) => item.status === "ativo").length;
  const totalSemVencimento = lista.filter((item) => !item.data_fim).length;
  const totalSaldosRestantes = lista.reduce(
    (acc, item) => acc + item.saldos.reduce((soma, saldo) => soma + Math.max(0, saldo.restante), 0),
    0
  );

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-r from-purple-950 to-purple-700 p-8 text-white shadow-xl">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-pink-200">
          Marketing
        </p>
        <h1 className="mt-2 text-4xl font-black">Pacotes vinculados aos clientes</h1>
        <p className="mt-2 text-white/80">
          Acompanhe validade, quantidade comprada e saldo disponível de cada serviço por cliente.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <CardResumo titulo="Vínculos" valor={lista.length} subtitulo="total" />
        <CardResumo titulo="Ativos" valor={totalAtivos} subtitulo="liberados" />
        <CardResumo titulo="Sem vencimento" valor={totalSemVencimento} subtitulo="validade aberta" />
        <CardResumo titulo="Saldos restantes" valor={totalSaldosRestantes} subtitulo="serviços disponíveis" />
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_220px_auto]">
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por cliente, telefone ou pacote..."
            className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-purple-500"
          />

          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-purple-500"
          >
            <option value="todos">Todos os status</option>
            <option value="ativo">Ativos</option>
            <option value="inativo">Inativos</option>
            <option value="cancelado">Cancelados</option>
          </select>

          <button
            type="button"
            onClick={carregarTudo}
            className="rounded-2xl bg-slate-950 px-5 py-3 font-black text-white"
          >
            Atualizar
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <h2 className="text-xl font-black text-slate-900">Lista de pacotes dos clientes</h2>
          <p className="text-sm text-slate-500">{listaFiltrada.length} vínculo(s) encontrado(s).</p>
        </div>

        {loading ? (
          <div className="p-8 text-slate-500">Carregando pacotes dos clientes...</div>
        ) : listaFiltrada.length === 0 ? (
          <div className="p-10 text-center text-slate-500">Nenhum pacote vinculado encontrado.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {listaFiltrada.map((item) => (
              <div key={item.id} className="p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-black text-slate-900">{item.clienteNome}</h3>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                        {item.clienteTelefone || "sem telefone"}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${
                          item.status === "ativo"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {item.status || "-"}
                      </span>
                    </div>

                    <p className="mt-1 text-sm text-slate-500">
                      Pacote: <strong>{item.pacoteNome}</strong> · Quantidade comprada: {item.quantidade_pacotes || 1}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Início: {formatarData(item.data_inicio)} · Validade: {formatarData(item.data_fim)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => abrirEditarVinculo(item)}
                      className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50"
                    >
                      Editar vínculo
                    </button>

                    {item.status === "ativo" && (
                      <button
                        type="button"
                        onClick={() => inativarVinculo(item)}
                        className="rounded-2xl bg-red-50 px-4 py-2 text-sm font-black text-red-600 hover:bg-red-100"
                      >
                        Inativar
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="p-3 text-left font-black text-slate-500">Serviço</th>
                        <th className="p-3 text-center font-black text-slate-500">Total</th>
                        <th className="p-3 text-center font-black text-slate-500">Usado</th>
                        <th className="p-3 text-center font-black text-slate-500">Restante</th>
                        <th className="p-3 text-right font-black text-slate-500">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {item.saldos.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-slate-500">
                            Nenhum saldo encontrado para este pacote.
                          </td>
                        </tr>
                      ) : (
                        item.saldos.map((saldo) => (
                          <tr key={saldo.id} className="border-t border-slate-100">
                            <td className="p-3 font-bold text-slate-800">{saldo.servicoNome}</td>
                            <td className="p-3 text-center">{Number(saldo.quantidade_total || 0)}</td>
                            <td className="p-3 text-center">{Number(saldo.quantidade_usada || 0)}</td>
                            <td className="p-3 text-center font-black text-purple-700">{saldo.restante}</td>
                            <td className="p-3 text-right">
                              <button
                                type="button"
                                onClick={() => abrirEditarSaldo(saldo)}
                                className="rounded-xl bg-purple-700 px-4 py-2 text-xs font-black text-white hover:bg-purple-800"
                              >
                                Editar saldo
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalVinculoAberto && vinculoEditando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase text-purple-700">Editar pacote do cliente</p>
                <h2 className="text-2xl font-black text-slate-900">{vinculoEditando.clienteNome}</h2>
                <p className="text-sm text-slate-500">{vinculoEditando.pacoteNome}</p>
              </div>
              <button
                type="button"
                onClick={() => setModalVinculoAberto(false)}
                className="rounded-2xl border border-slate-200 px-4 py-2 font-black"
              >
                Fechar
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-black">Data início</span>
                <input
                  type="date"
                  value={formVinculo.data_inicio}
                  onChange={(e) => setFormVinculo({ ...formVinculo, data_inicio: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-black">Validade em dias opcional</span>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    value={formVinculo.validade_dias}
                    onChange={(e) => setFormVinculo({ ...formVinculo, validade_dias: e.target.value })}
                    placeholder="Ex: 30, 90 ou vazio"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3"
                  />
                  <button
                    type="button"
                    onClick={aplicarValidadeDias}
                    className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-black"
                  >
                    Aplicar
                  </button>
                </div>
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-black">Válido até</span>
                <input
                  type="date"
                  value={formVinculo.data_fim}
                  onChange={(e) => setFormVinculo({ ...formVinculo, data_fim: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-black">Quantidade de pacotes</span>
                <input
                  type="number"
                  min="1"
                  value={formVinculo.quantidade_pacotes}
                  onChange={(e) => setFormVinculo({ ...formVinculo, quantidade_pacotes: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3"
                />
              </label>

              <label className="block md:col-span-2">
                <span className="mb-1 block text-sm font-black">Status</span>
                <select
                  value={formVinculo.status}
                  onChange={(e) => setFormVinculo({ ...formVinculo, status: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3"
                >
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </label>
            </div>

            <div className="mt-4 rounded-2xl bg-blue-50 p-4 text-sm text-blue-900">
              Para pacote sem vencimento, deixe o campo <strong>Válido até</strong> em branco.
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setFormVinculo({ ...formVinculo, data_fim: "", validade_dias: "" })}
                className="rounded-2xl border border-slate-200 px-5 py-3 font-black"
              >
                Deixar sem vencimento
              </button>
              <button
                type="button"
                onClick={salvarVinculo}
                disabled={salvando}
                className="rounded-2xl bg-purple-800 px-5 py-3 font-black text-white disabled:opacity-60"
              >
                {salvando ? "Salvando..." : "Salvar alterações"}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalSaldoAberto && saldoEditando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-5">
              <p className="text-xs font-black uppercase text-purple-700">Editar saldo</p>
              <h2 className="text-2xl font-black text-slate-900">{saldoEditando.servicoNome}</h2>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="mb-1 block text-sm font-black">Quantidade total contratada</span>
                <input
                  type="number"
                  min="0"
                  value={formSaldo.quantidade_total}
                  onChange={(e) => setFormSaldo({ ...formSaldo, quantidade_total: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-black">Quantidade usada</span>
                <input
                  type="number"
                  min="0"
                  value={formSaldo.quantidade_usada}
                  onChange={(e) => setFormSaldo({ ...formSaldo, quantidade_usada: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3"
                />
              </label>
            </div>

            <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
              Exemplo: se a cliente já usou 2 sessões, informe <strong>2</strong> em quantidade usada.
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setModalSaldoAberto(false)}
                className="rounded-2xl border border-slate-200 px-5 py-3 font-black"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={salvarSaldo}
                disabled={salvando}
                className="rounded-2xl bg-purple-800 px-5 py-3 font-black text-white disabled:opacity-60"
              >
                {salvando ? "Salvando..." : "Salvar saldo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CardResumo({ titulo, valor, subtitulo }: { titulo: string; valor: number; subtitulo: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-black uppercase text-slate-400">{titulo}</p>
      <p className="mt-2 text-3xl font-black text-slate-900">{valor}</p>
      <p className="mt-1 text-sm text-slate-500">{subtitulo}</p>
    </div>
  );
}
