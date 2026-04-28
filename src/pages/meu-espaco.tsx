import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";

type Empresa = {
  id: string;
  nome: string | null;
  nome_fantasia?: string | null;
  cor_primaria?: string | null;
  cor_secundaria?: string | null;
  cor_fundo?: string | null;
  telefone?: string | null;
  endereco?: string | null;
};

type Agendamento = {
  id: string;
  cliente: string;
  telefone?: string | null;
  servico?: string | null;
  profissional?: string | null;
  data: string;
  horario: string;
  status: string;
  empresa_id: string;
  observacoes?: string | null;
};

type Aba = "agendamento" | "anamnese" | "dados" | "combos" | "novo";

export default function MeuEspaco() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [agendamento, setAgendamento] = useState<Agendamento | null>(null);
  const [aba, setAba] = useState<Aba>("agendamento");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) carregarDados();
  }, [token]);

  async function carregarDados() {
    setLoading(true);

    const { data: ag } = await supabase
      .from("agendamentos")
      .select("*")
      .eq("token_cliente", token)
      .maybeSingle();

    if (!ag) {
      setLoading(false);
      return;
    }

    setAgendamento(ag);

    const { data: emp } = await supabase
      .from("empresas")
      .select("*")
      .eq("id", ag.empresa_id)
      .maybeSingle();

    if (emp) {
      setEmpresa(emp);
      aplicarTema(emp);
    }

    setLoading(false);
  }

  function aplicarTema(emp: Empresa) {
    const primaria = emp.cor_primaria || "#4b2f3f";
    const secundaria = emp.cor_secundaria || "#4d6f53";
    const fundo = emp.cor_fundo || "#f1f9f5";

    document.documentElement.style.setProperty("--cor-primaria", primaria);
    document.documentElement.style.setProperty("--cor-secundaria", secundaria);
    document.documentElement.style.setProperty("--cor-fundo", fundo);
  }

  async function atualizarStatus(status: "confirmado" | "cancelado") {
    if (!agendamento) return;

    const { error } = await supabase
      .from("agendamentos")
      .update({ status })
      .eq("id", agendamento.id);

    if (error) {
      alert(error.message);
      return;
    }

    setAgendamento({ ...agendamento, status });
    alert(status === "confirmado" ? "Presença confirmada!" : "Agendamento cancelado.");
  }

  const nomeEmpresa =
    empresa?.nome_fantasia ||
    empresa?.nome ||
    "Seu estabelecimento";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white rounded-3xl shadow p-8 font-bold">
          Carregando Meu Espaço...
        </div>
      </div>
    );
  }

  if (!agendamento) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white rounded-3xl shadow p-8">
          <h1 className="text-xl font-bold">Link inválido</h1>
          <p className="text-slate-500 mt-2">
            Não encontramos este agendamento.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen px-4 py-8"
      style={{ backgroundColor: "var(--cor-fundo)" }}
    >
      <div className="mx-auto max-w-6xl space-y-6">
        {/* HERO */}
        <div
          className="rounded-[2rem] p-8 text-white shadow-lg"
          style={{ backgroundColor: "var(--cor-secundaria)" }}
        >
          <p className="text-sm font-bold text-white/80">Meu Espaço</p>

          <h1 className="mt-2 text-4xl font-extrabold">
            {nomeEmpresa}
          </h1>

          {(empresa?.telefone || empresa?.endereco) && (
            <p className="mt-3 text-white/85">
              {empresa?.telefone || ""}
              {empresa?.telefone && empresa?.endereco ? " • " : ""}
              {empresa?.endereco || ""}
            </p>
          )}
        </div>

        {/* HEADER CLIENTE */}
        <div>
          <p
            className="text-sm font-extrabold uppercase"
            style={{ color: "var(--cor-primaria)" }}
          >
            Área do cliente
          </p>

          <h2 className="text-4xl font-extrabold text-slate-950">
            Olá, {agendamento.cliente}
          </h2>

          <p className="mt-2 text-slate-600">
            Acompanhe seu agendamento, confirme presença, atualize seus dados e solicite novos horários.
          </p>
        </div>

        {/* ABAS */}
        <div className="bg-white rounded-[2rem] p-2 shadow ring-1 ring-slate-200 flex flex-wrap gap-2">
          <Tab ativo={aba === "agendamento"} onClick={() => setAba("agendamento")}>
            Meu agendamento
          </Tab>
          <Tab ativo={aba === "anamnese"} onClick={() => setAba("anamnese")}>
            Ficha de anamnese
          </Tab>
          <Tab ativo={aba === "dados"} onClick={() => setAba("dados")}>
            Meus dados
          </Tab>
          <Tab ativo={aba === "combos"} onClick={() => setAba("combos")}>
            Meus combos
          </Tab>
          <Tab ativo={aba === "novo"} onClick={() => setAba("novo")}>
            Novo agendamento
          </Tab>
        </div>

        {/* CONTEÚDO */}
        {aba === "agendamento" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <Card>
                <p className="text-sm font-bold text-slate-500">Status</p>
                <span className="inline-block mt-3 rounded-full bg-orange-100 px-4 py-2 text-sm font-extrabold text-orange-700">
                  {agendamento.status}
                </span>
              </Card>

              <Card>
                <p className="text-sm font-bold text-slate-500">Data</p>
                <p className="mt-3 text-3xl font-extrabold text-slate-950">
                  {formatarData(agendamento.data)}
                </p>
              </Card>

              <Card>
                <p className="text-sm font-bold text-slate-500">Horário</p>
                <p className="mt-3 text-3xl font-extrabold text-slate-950">
                  {agendamento.horario}
                </p>
              </Card>
            </div>

            <Card>
              <h3 className="text-2xl font-extrabold text-slate-950">
                Dados do agendamento
              </h3>

              <p className="text-slate-500 mt-1">
                Confira as informações antes de confirmar.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <Info label="Serviço" value={agendamento.servico || "-"} />
                <Info label="Profissional" value={agendamento.profissional || "-"} />
                <Info label="Cliente" value={agendamento.cliente || "-"} />
                <Info label="Telefone" value={agendamento.telefone || "-"} />
                <Info label="Observações" value={agendamento.observacoes || "-"} />
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                {agendamento.status !== "confirmado" &&
                  agendamento.status !== "cancelado" && (
                    <button
                      onClick={() => atualizarStatus("confirmado")}
                      className="rounded-2xl px-6 py-3 text-white font-extrabold shadow hover:opacity-90"
                      style={{ backgroundColor: "var(--cor-primaria)" }}
                    >
                      Confirmar presença
                    </button>
                  )}

                {agendamento.status !== "cancelado" && (
                  <button
                    onClick={() => atualizarStatus("cancelado")}
                    className="rounded-2xl px-6 py-3 bg-white border border-slate-300 text-slate-700 font-extrabold hover:bg-slate-50"
                  >
                    Cancelar agendamento
                  </button>
                )}
              </div>
            </Card>
          </div>
        )}

        {aba === "anamnese" && (
          <Card>
            <h3 className="text-2xl font-extrabold">Ficha de anamnese</h3>
            <p className="text-slate-500 mt-1">
              Esta área será integrada novamente com a ficha dinâmica.
            </p>

            <div className="mt-6 rounded-2xl bg-slate-50 p-5 text-slate-600">
              Em breve: perguntas, assinatura e PDF.
            </div>
          </Card>
        )}

        {aba === "dados" && (
          <Card>
            <h3 className="text-2xl font-extrabold">Meus dados</h3>
            <p className="text-slate-500 mt-1">
              Atualize seus dados cadastrais.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <Input label="Nome" value={agendamento.cliente} />
              <Input label="Telefone" value={agendamento.telefone || ""} />
            </div>
          </Card>
        )}

        {aba === "combos" && (
          <Card>
            <h3 className="text-2xl font-extrabold">Meus combos</h3>
            <p className="text-slate-500 mt-1">
              Acompanhe seus pacotes e saldos.
            </p>

            <div className="mt-6 rounded-2xl bg-orange-50 p-5 text-orange-700 font-bold">
              Nenhum combo ativo encontrado.
            </div>
          </Card>
        )}

        {aba === "novo" && (
          <Card>
            <h3 className="text-2xl font-extrabold">Novo agendamento</h3>
            <p className="text-slate-500 mt-1">
              Solicite um novo horário com o estabelecimento.
            </p>

            <div className="mt-6 rounded-2xl bg-slate-50 p-5 text-slate-600">
              Em breve: seleção de serviço, profissional, data e horário.
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function Tab({
  ativo,
  onClick,
  children,
}: {
  ativo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl px-5 py-3 text-sm font-extrabold transition"
      style={{
        backgroundColor: ativo ? "var(--cor-primaria)" : "transparent",
        color: ativo ? "#fff" : "var(--cor-secundaria)",
      }}
    >
      {children}
    </button>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-[2rem] p-6 shadow ring-1 ring-slate-200">
      {children}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-bold text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-extrabold text-slate-950">
        {value}
      </p>
    </div>
  );
}

function Input({ label, value }: { label: string; value: string }) {
  return (
    <label>
      <span className="text-sm font-bold text-slate-700">{label}</span>
      <input
        value={value}
        readOnly
        className="mt-2 w-full rounded-2xl border border-slate-200 p-3 bg-slate-50"
      />
    </label>
  );
}

function formatarData(data?: string | null) {
  if (!data) return "-";
  const partes = data.split("-");
  if (partes.length !== 3) return data;
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}