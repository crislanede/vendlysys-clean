import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function MFA() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [factorId, setFactorId] = useState("");
  const [qr, setQr] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active) return;
      setLoggedIn(!!user);
      if (user) {
        const { data, error } = await supabase.auth.mfa.listFactors();
        if (error) setMessage("Não foi possível consultar os autenticadores.");
        else {
          const factor = data.totp.find((f) => f.status === "verified");
          if (factor) setFactorId(factor.id);
        }
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  async function enroll() {
    setBusy(true); setMessage("");
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "VendlySys" });
      if (error) throw error;
      setFactorId(data.id);
      setQr(data.totp.qr_code);
      setSecret(data.totp.secret);
      setMessage("Escaneie o QR Code e confirme o código para ativar a proteção.");
    } catch {
      setMessage("Não foi possível iniciar a configuração do autenticador.");
    } finally { setBusy(false); }
  }

  async function verify() {
    if (!factorId || !/^\d{6}$/.test(code)) {
      setMessage("Informe os 6 dígitos do aplicativo autenticador.");
      return;
    }
    setBusy(true); setMessage("");
    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) throw challengeError;
      const { error } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code });
      if (error) throw error;
      const { data: assurance } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (assurance?.currentLevel !== "aal2") throw new Error("Sessão sem AAL2");
      setVerified(true);
      setQr(""); setSecret(""); setCode("");
      setMessage("Autenticação em duas etapas confirmada!");
    } catch {
      setMessage("Código inválido ou expirado. Tente novamente.");
    } finally { setBusy(false); }
  }

  if (loading) return <main className="p-8">Verificando sessão...</main>;
  if (!loggedIn) return <Navigate to="/login" replace />;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 flex justify-center items-start">
      <section className="w-full max-w-md rounded-2xl bg-white shadow-lg border border-slate-200 p-6 sm:p-8 space-y-5">
        <div className="text-xs uppercase tracking-widest font-bold text-violet-700">VendlySys • Segurança</div>
        <h1 className="text-2xl font-bold text-slate-900">Verificação em duas etapas</h1>
        <p className="text-sm text-slate-600">Proteja seu acesso usando um aplicativo autenticador. Nunca compartilhe seu código.</p>
        {!factorId && <button disabled={busy} onClick={enroll} className="w-full rounded-xl bg-violet-700 text-white font-semibold py-3 disabled:opacity-50">Configurar autenticador</button>}
        {qr && <div className="space-y-3">
          <img src={qr} alt="QR Code para configurar aplicativo autenticador" className="w-48 h-48 mx-auto" />
          <p className="text-xs text-slate-600">Não consegue escanear? Insira esta chave manualmente no aplicativo:</p>
          <code className="block break-all text-sm bg-slate-100 rounded-lg p-3 select-all">{secret}</code>
        </div>}
        {factorId && !verified && <form onSubmit={(e) => { e.preventDefault(); void verify(); }} className="space-y-3">
          <label htmlFor="mfa-code" className="block text-sm font-medium text-slate-700">Código de 6 dígitos</label>
          <input id="mfa-code" autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))} className="w-full border border-slate-300 rounded-xl p-3 tracking-widest text-center text-lg" />
          <button disabled={busy} type="submit" className="w-full rounded-xl bg-violet-700 text-white font-semibold py-3 disabled:opacity-50">{busy ? "Verificando..." : "Confirmar código"}</button>
        </form>}
        {message && <p role="status" className="text-sm text-slate-700">{message}</p>}
        {verified && <button onClick={() => navigate("/admin/empresas", { replace: true })} className="w-full rounded-xl bg-violet-700 text-white font-semibold py-3">Continuar</button>}
        <button type="button" onClick={async () => { await supabase.auth.signOut(); navigate("/login", { replace: true }); }} className="w-full text-sm text-slate-600 underline">Sair da conta</button>
      </section>
    </main>
  );
}
