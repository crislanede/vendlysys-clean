// Shared server-only email adapter. Do not import into browser bundles.
// A missing key or verified sender fails closed; no fallback to client-side email.
export type RecoveryEmailInput = {
  recipient: string;
  code: string;
  expiresInMinutes: number;
};

export async function sendRecoveryEmail(input: RecoveryEmailInput): Promise<void> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("MFA_RECOVERY_FROM_EMAIL");
  if (!apiKey || !from) throw new Error("Recovery email provider is not configured");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.recipient)) throw new Error("Invalid recipient");
  if (!/^\d{6}$/.test(input.code)) throw new Error("Invalid recovery code");
  if (!Number.isInteger(input.expiresInMinutes) || input.expiresInMinutes < 1 || input.expiresInMinutes > 30) throw new Error("Invalid expiration");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": crypto.randomUUID(),
    },
    body: JSON.stringify({
      from,
      to: [input.recipient],
      subject: "VendlySys — código de verificação de recuperação",
      text: `Você solicitou a recuperação do autenticador VendlySys. Seu código é ${input.code}. Ele expira em ${input.expiresInMinutes} minutos. Se não foi você, ignore esta mensagem e contate o administrador da sua empresa. Este código não remove o MFA por si só.`,
    }),
  });
  if (!response.ok) throw new Error(`Recovery email delivery failed (HTTP ${response.status})`);
}
