// Isolated orchestration for staging. Never call with real Auth Admin
// dependencies until the reset endpoint has passed end-to-end review.
export type ResetOutcome =
  | { status: "completed" }
  | { status: "blocked"; reason: "claim_rejected" | "factor_unavailable" }
  | { status: "manual_review"; reason: "delete_failed" | "delete_ambiguous" | "finalize_failed" };

export type ResetDependencies = {
  selectFactor: () => Promise<string | null>;
  claim: () => Promise<boolean>;
  deleteFactor: (id: string) => Promise<"deleted" | "failed" | "ambiguous">;
  finalize: (success: boolean) => Promise<boolean>;
  audit: (event: string) => Promise<void>;
};

// Audit failure is intentionally not swallowed before mutation: a missing
// durable audit trail must block destructive operations.
export async function orchestrateReset(deps: ResetDependencies): Promise<ResetOutcome> {
  const factor = await deps.selectFactor();
  if (!factor) return { status: "blocked", reason: "factor_unavailable" };
  await deps.audit("reset_preflight_passed");
  const claimed = await deps.claim();
  if (!claimed) return { status: "blocked", reason: "claim_rejected" };
  // Record the irreversible boundary before invoking Auth Admin.
  // If audit fails, keep the claim in "executing" for manual reconciliation.
  try {
    await deps.audit("reset_deletion_started");
  } catch {
    return { status: "manual_review", reason: "finalize_failed" };
  }
  // After claim, never retry deletion: network errors may mean the provider
  // deleted the factor despite the caller not receiving the response.
  let deletion: "deleted" | "failed" | "ambiguous" = "ambiguous";
  try {
    deletion = await deps.deleteFactor(factor);
  } catch {
    deletion = "ambiguous";
  }
  if (deletion !== "deleted") {
    // Fail closed: a failed/ambiguous deletion must never be retried
    // automatically. Preserve terminal state and flag human reconciliation.
    try {
      await deps.audit(deletion === "failed" ? "reset_delete_failed" : "reset_delete_ambiguous");
      // An ambiguous provider outcome is NOT a confirmed failure.
      // Leave it executing for human reconciliation rather than falsely
      // asserting the factor still exists.
      if (deletion === "failed") await deps.finalize(false);
    } catch { /* manual reconciliation still mandatory */ }
    return { status: "manual_review", reason: deletion === "failed" ? "delete_failed" : "delete_ambiguous" };
  }
  try {
    await deps.audit("reset_factor_deleted");
    if (!await deps.finalize(true)) return { status: "manual_review", reason: "finalize_failed" };
  } catch {
    return { status: "manual_review", reason: "finalize_failed" };
  }
  return { status: "completed" };
}
