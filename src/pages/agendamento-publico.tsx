import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { CalendarDays, CheckCircle2 } from "lucide-react";
import { supabase } from "../lib/supabase";

type Catalogo = {
  nome: string;
  servicos: { id: string; nome: string; valor: number }[];
  profissionais: { id: string; nome: string; servicos_ids: string[] }[];
};

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const campo = "mt-2 w-full rounded-xl border border-stone-300 bg-white px-3 py-3 text-base text-stone-900";

function hojeEmSaoPaulo() {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const valor = (tipo: string) => partes.find((parte) => parte.type === tipo)?.value;
  return `${valor("year")}-${valor("month")}-${valor("day")}`;
}

export default function AgendamentoPublico() {
  const { slug } = useParams<{ slug: string }>();
  const [catalogo, setCatalogo] = useState<Catalogo | null>(null);
  const [carregando, setCarregando] = useState(Boolean(slug));
  const [servicos, setServicos] = useState<string[]>([]);
  const [profissional, setProfissional] = useState("");
  const [data, setData] = useState(hojeEmSaoPaulo);
  const [horario, setHorario] = useState("");
  const [horarios, setHorarios] = useState<string[]>([]);
  const [carregandoHorarios, setCarregandoHorarios] = useState(false);
  const [erroHorarios, setErroHorarios] = useState(false);
  const [atualizarHorarios, setAtualizarHorarios] = useState(0);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    if (!slug) return;
    let vigente = true;
    void supabase.rpc("agendamento_publico_catalogo", { p_slug: slug }).then(({ data }) => {
      if (!vigente) return;
      setCatalogo(data as Catalogo | null);
      setCarregando(false);
    });
    return () => { vigente = false; };
  }, [slug]);

  useEffect(() => {
    if (!slug || !profissional || !servicos.length || !data) return;
    let vigente = true;
    setCarregandoHorarios(true);
    void supabase.rpc("agendamento_publico_horarios", {
      p_slug: slug, p_profissional: profissional, p_servicos: servicos, p_data: data,
    }).then(({ data: resposta, error }) => {
      if (!vigente) return;
      setHorarios((resposta || []) as string[]);
      setErroHorarios(Boolean(error));
      setCarregandoHorarios(false);
    });
    return () => { vigente = false; };
  }, [slug, profissional, servicos, data, atualizarHorarios]);

  function limparHorarios() {
    setHorarios([]);
    setHorario("");
    setErroHorarios(false);
    setCarregandoHorarios(false);
  }

  function selecionarServico(id: string) {
    setServicos((atual) => atual.includes(id) ? atual.filter((item) => item !== id) : [...atual, id]);
    setProfissional("");
    limparHorarios();
  }

  async function solicitar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!slug || !horario || !profissional || !servicos.length || salvando) return;

    setSalvando(true);
    setMensagem("");
    try {
      const { data: resposta, error } = await supabase.rpc("agendamento_publico_solicitar", {
        p_slug: slug, p_profissional: profissional, p_servicos: servicos, p_data: data,
        p_horario: horario, p_nome: nome, p_telefone: telefone,
      });
      if (error || resposta !== true) {
        setMensagem(error?.code === "22023" ? error.message : "Não foi possível enviar a solicitação. Tente novamente.");
        limparHorarios();
        setAtualizarHorarios((atual) => atual + 1);
        return;
      }
      setEnviado(true);
    } catch {
      setMensagem("Não foi possível enviar a solicitação. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  const profissionais = catalogo?.profissionais.filter((item) =>
    !item.servicos_ids.length || servicos.every((id) => item.servicos_ids.includes(id))) || [];

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-7 font-sans text-stone-900 sm:py-12">
      <section className="mx-auto max-w-xl rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm sm:p-8">
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800">
          {enviado ? <CheckCircle2 aria-hidden="true" /> : <CalendarDays aria-hidden="true" />}
        </div>
        {catalogo && <p className="mb-1 text-sm font-semibold text-emerald-800">{catalogo.nome}</p>}
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {enviado ? "Solicitação enviada" : "Solicitar horário"}
        </h1>
        {enviado ? (
          <div role="status" className="mt-4 space-y-2 text-stone-700">
            <p>Seu pedido está aguardando a confirmação do estabelecimento.</p>
            <p className="text-sm">A equipe pode responder pelo WhatsApp informado.</p>
          </div>
        ) : carregando ? (
          <p role="status" className="mt-4 text-stone-600">Carregando serviços...</p>
        ) : !catalogo ? (
          <p className="mt-4 text-stone-700">Abra o link de agendamento enviado pelo estabelecimento.</p>
        ) : (
          <form onSubmit={solicitar} className="mt-6 space-y-5">
            <fieldset disabled={salvando} className="space-y-5 disabled:opacity-70">
              <fieldset>
                <legend className="font-bold">Serviços</legend>
                <div className="mt-2 space-y-2">
                  {catalogo.servicos.map((item) => (
                    <label key={item.id} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-stone-200 px-3 py-2 has-checked:border-emerald-700 has-checked:bg-emerald-50">
                      <input type="checkbox" className="h-4 w-4 accent-emerald-800"
                        checked={servicos.includes(item.id)}
                        disabled={servicos.length >= 8 && !servicos.includes(item.id)}
                        onChange={() => selecionarServico(item.id)} />
                      <span className="flex-1">{item.nome}</span>
                      <span className="text-sm font-semibold">{moeda.format(item.valor)}</span>
                    </label>
                  ))}
                  {!catalogo.servicos.length && <p>Nenhum serviço disponível para solicitação.</p>}
                </div>
              </fieldset>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="font-bold">Profissional
                  <select required className={campo} value={profissional} disabled={!servicos.length}
                    onChange={(evento) => { setProfissional(evento.target.value); limparHorarios(); }}>
                    <option value="">Selecione</option>
                    {profissionais.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
                  </select>
                </label>
                <label className="font-bold">Data
                  <input required className={campo} type="date" min={hojeEmSaoPaulo()} value={data}
                    onChange={(evento) => { setData(evento.target.value); limparHorarios(); }} />
                </label>
              </div>
              {profissional && data && (
                <label className="block font-bold">Horário
                  <select required className={campo} value={horario} disabled={carregandoHorarios || !horarios.length}
                    onChange={(evento) => setHorario(evento.target.value)}>
                    <option value="">{carregandoHorarios ? "Buscando horários..." : horarios.length ? "Selecione" : "Nenhum horário disponível"}</option>
                    {horarios.map((hora) => <option key={hora} value={hora}>{hora}</option>)}
                  </select>
                  {erroHorarios && <span role="status" className="text-sm font-normal text-red-800">Não foi possível consultar os horários. Escolha outra data ou tente novamente.</span>}
                </label>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="font-bold">Seu nome
                  <input required minLength={2} maxLength={100} className={campo} autoComplete="name" value={nome}
                    onChange={(evento) => setNome(evento.target.value)} />
                </label>
                <label className="font-bold">WhatsApp com DDD
                  <input required className={campo} type="tel" autoComplete="tel" maxLength={22} value={telefone}
                    onChange={(evento) => setTelefone(evento.target.value)} />
                </label>
              </div>
            </fieldset>
            <p className="text-sm text-stone-600">O horário será reservado após a confirmação do estabelecimento.</p>
            {mensagem && <p role="alert" className="text-sm font-semibold text-red-800">{mensagem}</p>}
            <button type="submit" disabled={!horario || salvando} className="min-h-12 w-full rounded-xl bg-emerald-800 px-4 font-bold text-white disabled:opacity-55">
              {salvando ? "Enviando..." : "Enviar solicitação"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}

export function AcessoMeuEspacoPublico() {
  const parametros = new URLSearchParams(window.location.search);
  const slug = parametros.get("empresa") || parametros.get("slug");

  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-50 p-4">
      <section className="w-full max-w-md rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">Meu Espaço</h1>
        <p className="mt-3 text-stone-700">{slug ? "Você pode solicitar um horário pelo link do estabelecimento." : "Para solicitar um horário ou consultar um atendimento, fale com o estabelecimento."}</p>
        {slug && <a className="mt-4 inline-block rounded-xl bg-emerald-800 px-4 py-3 font-semibold text-white" href={`/agendar/${encodeURIComponent(slug)}`}>Solicitar horário</a>}
      </section>
    </main>
  );
}
