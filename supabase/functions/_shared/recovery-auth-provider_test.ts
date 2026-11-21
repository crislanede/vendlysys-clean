import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { deleteRecoverableFactor, findRecoverableFactor, type AdminFactorClient } from "./recovery-auth-provider.ts";
const userId = "10000000-0000-4000-8000-000000000001";
const factorId = "20000000-0000-4000-8000-000000000002";
function fixture(): AdminFactorClient {
  return { mfa: {
    listFactors: async () => ({ data: { factors: [{ id: factorId, factor_type: "totp", status: "verified" }] }, error: null }),
    deleteFactor: async () => ({ error: null }),
  } };
}
Deno.test("provider selects only a single verified TOTP factor", async () => {
  assertEquals(await findRecoverableFactor(fixture(), userId), factorId);
});
Deno.test("provider refuses multiple factors", async () => {
  const admin = fixture();
  admin.mfa.listFactors = async () => ({ data: { factors: [
    { id: factorId, factor_type: "totp", status: "verified" },
    { id: "30000000-0000-4000-8000-000000000003", factor_type: "totp", status: "verified" },
  ] }, error: null });
  assertEquals(await findRecoverableFactor(admin, userId), null);
});
Deno.test("provider refuses list errors and invalid data", async () => {
  const admin = fixture();
  admin.mfa.listFactors = async () => ({ data: null, error: { message: "offline" } });
  assertEquals(await findRecoverableFactor(admin, userId), null);
});
Deno.test("provider deletion sends exact user and factor IDs", async () => {
  const admin = fixture();
  let captured: { userId: string; id: string } | undefined;
  admin.mfa.deleteFactor = async (args) => { captured = args; return { error: null }; };
  assertEquals(await deleteRecoverableFactor(admin, userId, factorId), "deleted");
  assertEquals(captured, { userId, id: factorId });
});
Deno.test("provider error is ambiguous, not retryable", async () => {
  const admin = fixture();
  admin.mfa.deleteFactor = async () => ({ error: { message: "timeout" } });
  assertEquals(await deleteRecoverableFactor(admin, userId, factorId), "ambiguous");
});
Deno.test("provider exception is ambiguous, not retryable", async () => {
  const admin = fixture();
  admin.mfa.deleteFactor = async () => { throw Error("network"); };
  assertEquals(await deleteRecoverableFactor(admin, userId, factorId), "ambiguous");
});
