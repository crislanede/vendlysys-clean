// Provider adapter: isolate Auth Admin calls from recovery orchestration.
// This module does not enable factor deletion or deploy an endpoint.
import { selectSingleVerifiedTotpFactor, type RecoveryFactor } from "./recovery-execution.ts";

export type AdminFactorClient = {
  mfa: {
    listFactors: (params: { userId: string }) => Promise<{
      data: { factors: RecoveryFactor[] } | null;
      error: { message: string } | null;
    }>;
    deleteFactor: (params: { userId: string; id: string }) => Promise<{
      error: { message: string } | null;
    }>;
  };
};

export async function findRecoverableFactor(
  authAdmin: AdminFactorClient,
  userId: string,
): Promise<string | null> {
  const { data, error } = await authAdmin.mfa.listFactors({ userId });
  if (error || !data || !Array.isArray(data.factors)) return null;
  return selectSingleVerifiedTotpFactor(data.factors);
}

export async function deleteRecoverableFactor(
  authAdmin: AdminFactorClient,
  userId: string,
  factorId: string,
): Promise<"deleted" | "ambiguous"> {
  // Provider errors cannot establish whether a remote deletion occurred.
  // Fail closed and leave the execution for manual reconciliation.
  try {
    const { error } = await authAdmin.mfa.deleteFactor({ userId, id: factorId });
    return error ? "ambiguous" : "deleted";
  } catch {
    return "ambiguous";
  }
}
