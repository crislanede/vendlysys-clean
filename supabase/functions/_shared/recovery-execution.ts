// Fail-closed policy for the final MFA recovery step.
// The database's atomic claim is still mandatory after this policy passes.
export type RecoveryExecution = {
  requester_id: string;
  empresa_id: string | null;
  scope: string;
  status: string;
  created_at: string;
  email_verified_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
};

export type RecoveryFactor = {
  id: string;
  factor_type: string;
  status: string;
};

export function canExecuteRecovery(
  recovery: RecoveryExecution,
  authenticatedUserId: string,
  now: number,
): boolean {
  const created = Date.parse(recovery.created_at);
  const verified = Date.parse(recovery.email_verified_at ?? "");
  const approved = Date.parse(recovery.approved_at ?? "");
  if (!Number.isFinite(created) || !Number.isFinite(verified) ||
      !Number.isFinite(approved) || !Number.isFinite(now)) return false;
  return recovery.requester_id === authenticatedUserId &&
    recovery.scope === "company_admin" &&
    Boolean(recovery.empresa_id) &&
    recovery.status === "approved" &&
    Boolean(recovery.approved_by) &&
    recovery.approved_by !== authenticatedUserId &&
    created <= verified && verified <= approved && approved <= now &&
    created > now - 30 * 60_000 &&
    approved > now - 10 * 60_000;
}

// Never choose a factor by index, nor remove multiple factors automatically.
// Multiple verified factors require a separately reviewed recovery process.
export function selectSingleVerifiedTotpFactor(factors: RecoveryFactor[]): string | null {
  if (factors.length !== 1) return null;
  const factor = factors[0];
  return factor.factor_type === "totp" && factor.status === "verified" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(factor.id)
    ? factor.id : null;
}
