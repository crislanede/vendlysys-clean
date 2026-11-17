import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Approver = { id: string; approver_id: string; created_at: string };
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function SegurancaConta() {
  const [approvers, setApprovers] = useState<Approver[]>([]);
  const [newApprover, setNewApprover] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function call(action: "list" | "candidates" | "add" | "remove", approver_id?: string) {
    const { data, error: functionError } = await supabase.functions.invoke("mfa-recovery-approvers", {
      body: { action, scope: "saas_admin", ...(approver_id ? { approver_id } : {}) },
    });
    if (functionError) throw new Error("Não foi possível comunicar com o serviço de segurança.");
    if (data?.error) throw new Error(String(data.error));
    return data;
  }
  async function refresh() {
    try {
      const data = await call("list");
      setApprovers(data.approvers ?? []);
      const available = await call("candidates");
      setCandidates(available.candidates ?? []);
      setError("");
    } catch (e) { setError(e instanceof Error ? e.message : "Falha ao carregar."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); }, []);
  async function mutate(action: "add" | "remove", id: string) {
    setBusy(true); setMessage(""); setError("");
    try {
      await call(action, id);
      setMessage(action === "add" ? "Administrador secundário cadastrado." : "Administrador secundário removido.");
      setNewApprover("");
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Operação não concluída."); }
    finally { setBusy(false); }
  }
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8 space-y-6">
      <header className="space-y-2"><p className="text-xs font-bold uppercase tracking-widest text-violet-700">VendlySys • Segurança</p>
        <h1 className="text-3xl font-extrabold text-slate-900">Segurança da conta</h1>
        <p className="text-slate-600">Cadastre até dois administradores secundários para uma futura recuperação do autenticador.</p>
      </header>
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950 space-y-2">
        <h2 className="font-bold">Recuperação automática ainda indisponível</h2>
        <p>Este cadastro não permite redefinir MFA. O fluxo de e-mail, aprovação e substituição do autenticador será ativado somente após testes de segurança.</p>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 space-y-5">
        <h2 className="text-lg font-bold text-slate-900">Administradores secundários</h2>
        <p className="text-sm text-slate-600">O aprovador precisa ser outra conta administrativa autorizada do VendlySys, com MFA ativo. Não é possível aprovar a própria recuperação.</p>
        {loading ? <p className="text-sm text-slate-500">Carregando...</p> : approvers.length === 0 ? <p className="text-sm text-slate-500">Nenhum administrador secundário cadastrado.</p> :
          <ul className="space-y-2">{approvers.map((a) => <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
            <div className="min-w-0"><p className="text-xs font-medium text-slate-500">Identificador do aprovador</p><p className="break-all font-mono text-xs text-slate-800">{candidates.find((c) => c.id === a.approver_id)?.email || a.approver_id}</p></div>
            <button type="button" disabled={busy} onClick={() => void mutate("remove", a.approver_id)} className="rounded-lg border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700 disabled:opacity-50">Remover</button>
          </li>)}</ul>}
        <form onSubmit={(e) => { e.preventDefault(); if (candidates.some((c) => c.id === newApprover)) void mutate("add", newApprover); else setError("Selecione um administrador autorizado."); }} className="space-y-3">
          <label htmlFor="approver-id" className="block text-sm font-semibold text-slate-700">Selecione um administrador secundário</label>
          <select id="approver-id" value={newApprover} onChange={(e) => setNewApprover(e.target.value)} className="w-full rounded-xl border border-slate-300 p-3 text-sm" disabled={busy || loading || approvers.length >= 2} required>
            <option value="">Selecione uma conta autorizada</option>
            {candidates.filter((c) => !approvers.some((a) => a.approver_id === c.id)).map((c) => <option key={c.id} value={c.id}>{c.name} — {c.email}</option>)}
          </select>
          <p className="text-xs text-slate-500">Somente contas administrativas ativas aparecem aqui. A aprovação exigirá autenticação MFA do segundo administrador.</p>
          <button disabled={busy || loading || approvers.length >= 2} type="submit" className="rounded-xl bg-violet-700 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{busy ? "Salvando..." : "Cadastrar administrador secundário"}</button>
        </form>
        {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
        {message && <p role="status" className="text-sm text-emerald-700">{message}</p>}
      </section>
    </div>
  );
}
