import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { canExecuteRecovery, selectSingleVerifiedTotpFactor } from "./recovery-execution.ts";

const REQUESTER = "00000000-0000-4000-8000-000000000011";
const APPROVER = "00000000-0000-4000-8000-000000000012";
const FACTOR = "00000000-0000-4000-8000-000000000013";
const COMPANY = "00000000-0000-4000-8000-000000000014";
const now = Date.parse("2026-11-18T18:00:00Z");
const minutesAgo = (minutes: number) => new Date(now - minutes * 60_000).toISOString();
const valid = {
  requester_id: REQUESTER, empresa_id: COMPANY, scope: "company_admin",
  status: "approved", created_at: minutesAgo(5),
  email_verified_at: minutesAgo(4), approved_at: minutesAgo(2),
  approved_by: APPROVER,
};

Deno.test("valid independently approved recovery is eligible", () => {
  assertEquals(canExecuteRecovery(valid, REQUESTER, now), true);
});
Deno.test("cross-account use is denied", () => {
  assertEquals(canExecuteRecovery(valid, APPROVER, now), false);
});
Deno.test("self-approval is denied", () => {
  assertEquals(canExecuteRecovery({ ...valid, approved_by: REQUESTER }, REQUESTER, now), false);
});
Deno.test("unapproved, consumed and unsupported scopes are denied", () => {
  for (const status of ["pending_email", "pending_approval", "executing", "completed", "failed"]) {
    assertEquals(canExecuteRecovery({ ...valid, status }, REQUESTER, now), false);
  }
  assertEquals(canExecuteRecovery({ ...valid, scope: "regular" }, REQUESTER, now), false);
  assertEquals(canExecuteRecovery({ ...valid, scope: "saas_admin" }, REQUESTER, now), false);
  assertEquals(canExecuteRecovery({ ...valid, empresa_id: null }, REQUESTER, now), false);
});
Deno.test("expired and future-dated approvals are denied", () => {
  assertEquals(canExecuteRecovery({ ...valid, approved_at: minutesAgo(11) }, REQUESTER, now), false);
  assertEquals(canExecuteRecovery({ ...valid, created_at: minutesAgo(31) }, REQUESTER, now), false);
  assertEquals(canExecuteRecovery({ ...valid, approved_at: minutesAgo(-1) }, REQUESTER, now), false);
});
Deno.test("invalid chronology is denied", () => {
  assertEquals(canExecuteRecovery({ ...valid, email_verified_at: minutesAgo(6) }, REQUESTER, now), false);
  assertEquals(canExecuteRecovery({ ...valid, email_verified_at: minutesAgo(1) }, REQUESTER, now), false);
  assertEquals(canExecuteRecovery({ ...valid, approved_at: null }, REQUESTER, now), false);
});
Deno.test("only one verified TOTP factor can be selected", () => {
  const factor = { id: FACTOR, factor_type: "totp", status: "verified" };
  assertEquals(selectSingleVerifiedTotpFactor([factor]), FACTOR);
  assertEquals(selectSingleVerifiedTotpFactor([]), null);
  assertEquals(selectSingleVerifiedTotpFactor([factor, factor]), null);
  assertEquals(selectSingleVerifiedTotpFactor([{ ...factor, status: "unverified" }]), null);
  assertEquals(selectSingleVerifiedTotpFactor([{ ...factor, factor_type: "phone" }]), null);
  assertEquals(selectSingleVerifiedTotpFactor([{ ...factor, id: "invalid" }]), null);
});
