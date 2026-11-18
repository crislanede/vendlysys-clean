import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function MFA() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [factorId, setFactorId] = useState("");
  const [verifiedFactors, setVerifiedFactors] = useState<{ id: string; friendly_name?: string | null }[]>([]);
  const [qr, setQr] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [showRecoveryInfo, setShowRecoveryInfo] = useState(false);
  const [recoveryPassword, setRecoveryPassword] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [recoveryRequestId, setRecoveryRequestId] = useState("");
  const [recoveryStatus, setRecoveryStatus] = useState("");
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  // Remains off until server-side tenant/role resolution and integration tests pass.
  const recoveryEnabled = false;

  async function requestRecovery() {
    if (!recoveryEnabled || !recoveryPassword) return;
    setRecoveryBusy(true); setMessage("");
    try {
      const { data, error } = await supabase.functions.invoke("mfa-recovery-request", {
        body: { password: recoveryPassword },
      });
      if (error || !data?.request_id) throw new Error("Não foi possível solicitar recuperação.");
      setRecoveryRequestId(data.request_id);
      setRecoveryStatus("pending_email");
      setMessage("Enviamos um código para seu e-mail cadastrado.");
    } catch {
      setMessage("Não foi possível iniciar a recuperação. Tente novamente mais tarde.");
    } finally { setRecoveryPassword(""); setRecoveryBusy(false); }
  }

  async function verifyRecoveryCode() {
    if (!recoveryEnabled || !recoveryRequestId || !/^\\d{6}$/.test(recoveryCode)) return;
    setRecoveryBusy(true); setMessage("");
    try {
      const { data, error } = await supabase.functions.invoke("mfa-recovery-verify", {
        body: { request_id: recoveryRequestId, code: recoveryCode },
      });
      if (error || data?.status !== "pending_approval") throw new Error("Falha na confirmação.");
      setRecoveryStatus(data.status);
      setMessage("E-mail confirmado. A recuperação ainda precisa de autorização adicional.");
    } catch {
      setMessage("Código inválido, expirado ou solicitação indisponível.");
    } finally { setRecoveryCode(""); setRecoveryBusy(false); }
  }

  async function refreshRecoveryStatus() {
    if (!recoveryEnabled || !recoveryRequestId) return;
    setRecoveryBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("mfa-recovery-status", {
        body: { request_id: recoveryRequestId },
      });
      if (error || !data?.recovery?.status) throw new Error("Status indisponível");
      setRecoveryStatus(data.recovery.status);
    } catch { setMessage("Não foi possível consultar a solicitação."); }
    finally { setRecoveryBusy(false); }
  }

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
          const verified = data.totp.filter((f) => f.status === "verified");
          setVerifiedFactors(verified);
          const factor = verified[0];
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
      setQr(""); setSecret(""); setCode("");
      navigate("/admin/empresas", { replace: true });
    } catch {
      setMessage("Código inválido ou expirado. Tente novamente.");
    } finally { setBusy(false); }
  }

  if (loading) return <main className="p-8">Verificando sessão...</main>;
  if (!loggedIn) return <Navigate to="/login" replace />;

  return (
    <main className="min-h-screen bg-[#F5F7F8] px-4 py-12 flex justify-center items-start">
      <section className="w-full max-w-md rounded-2xl bg-white shadow-lg border border-slate-200 p-6 sm:p-8 space-y-5">
        <div className="text-xs uppercase tracking-widest font-bold text-[#285963]">VendlySys • Segurança</div>
        <h1 className="text-2xl font-bold text-slate-900">Verificação em duas etapas</h1>
        <p className="text-sm text-slate-600">Proteja seu acesso usando um aplicativo autenticador. Nunca compartilhe seu código.</p>
        {!factorId && <button disabled={busy} onClick={enroll} className="w-full rounded-xl bg-[#285963] text-white font-semibold py-3 disabled:opacity-50">Configurar autenticador</button>}
        {qr && <div className="space-y-3">
          <img src={qr} alt="QR Code para configurar aplicativo autenticador" className="w-48 h-48 mx-auto" />
          <p className="text-xs text-slate-600">Não consegue escanear? Insira esta chave manualmente no aplicativo:</p>
          <code className="block break-all text-sm bg-slate-100 rounded-lg p-3 select-all">{secret}</code>
        </div>}
        {verifiedFactors.length > 1 && !qr && <div className="space-y-2">
          <label htmlFor="mfa-factor" className="block text-sm font-medium text-slate-700">Escolha o autenticador</label>
          <select id="mfa-factor" value={factorId} onChange={(e) => setFactorId(e.target.value)} className="w-full border border-slate-300 rounded-xl p-3">
            {verifiedFactors.map((factor, index) => <option key={factor.id} value={factor.id}>{factor.friendly_name || `Autenticador ${index + 1}`}</option>)}
          </select>
        </div>}
        {factorId && <form onSubmit={(e) => { e.preventDefault(); void verify(); }} className="space-y-3">
          <label htmlFor="mfa-code" className="block text-sm font-medium text-slate-700">Código de 6 dígitos</label>
          <input id="mfa-code" autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))} className="w-full border border-slate-300 rounded-xl p-3 tracking-widest text-center text-lg" />
          <button disabled={busy} type="submit" className="w-full rounded-xl bg-[#285963] text-white font-semibold py-3 disabled:opacity-50">{busy ? "Verificando..." : "Confirmar código"}</button>
        </form>}
        {factorId && !qr && <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
          <button type="button" onClick={() => setShowRecoveryInfo((current) => !current)} aria-expanded={showRecoveryInfo} className="w-full text-left text-sm font-semibold text-[#285963] underline">
            Perdi acesso ao aplicativo autenticador
          </button>
          {showRecoveryInfo && <div className="space-y-2 text-sm text-slate-700">
            <p>A recuperação por e-mail com aprovação de um segundo administrador está sendo preparada. Ela ainda não está disponível.</p>
            <p>Por segurança, o VendlySys não remove o MFA por meio de redefinição de senha ou somente pelo acesso ao e-mail.</p>
            <p>Se você possui outro autenticador cadastrado, selecione-o acima para entrar. Caso contrário, procure o responsável pela segurança da conta enquanto o fluxo de recuperação não estiver disponível.</p>
            {recoveryEnabled && <div className="space-y-3 border-t border-slate-200 pt-3">
              {!recoveryRequestId ? <form onSubmit={(e) => { e.preventDefault(); void requestRecovery(); }} className="space-y-2">
                <label htmlFor="recovery-password" className="block font-semibold">Confirme sua senha</label>
                <input id="recovery-password" type="password" autoComplete="current-password" value={recoveryPassword} onChange={(e) => setRecoveryPassword(e.target.value)} required className="w-full rounded-lg border border-slate-300 p-3" />
                <button disabled={recoveryBusy} className="w-full rounded-lg bg-[#285963] p-3 font-semibold text-white disabled:opacity-50">Solicitar código por e-mail</button>
              </form> : <>
                <p role="status">Situação da solicitação: {recoveryStatus === "pending_email" ? "Aguardando código" : recoveryStatus === "pending_approval" ? "Aguardando aprovação" : recoveryStatus}</p>
                {recoveryStatus === "pending_email" && <form onSubmit={(e) => { e.preventDefault(); void verifyRecoveryCode(); }} className="space-y-2">
                  <label htmlFor="recovery-code" className="block font-semibold">Código recebido por e-mail</label>
                  <input id="recovery-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={recoveryCode} onChange={(e) => setRecoveryCode(e.target.value.replace(/\\D/g, ""))} className="w-full rounded-lg border border-slate-300 p-3" />
                  <button disabled={recoveryBusy} className="w-full rounded-lg bg-[#285963] p-3 font-semibold text-white disabled:opacity-50">Confirmar código</button>
                </form>}
                <button type="button" disabled={recoveryBusy} onClick={() => void refreshRecoveryStatus()} className="text-[#285963] underline disabled:opacity-50">Atualizar situação</button>
              </>}
            </div>}
          </div>}
        </div>}
        {message && <p role="status" className="text-sm text-slate-700">{message}</p>}
        <button type="button" onClick={async () => { await supabase.auth.signOut(); navigate("/login", { replace: true }); }} className="w-full text-sm text-slate-600 underline">Sair da conta</button>
      </section>
    </main>
  );
}
