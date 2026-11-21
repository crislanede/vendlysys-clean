import { assert, assertEquals, assertRejects } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { constantTimeHexEqual, generateRecoveryCode, recoveryCodeDigest } from "./recovery-crypto.ts";

Deno.test("recovery codes have exactly six numeric digits", () => {
  const generated = new Set<string>();
  for (let i = 0; i < 1000; i++) {
    const code = generateRecoveryCode();
    assert(/^\d{6}$/.test(code));
    generated.add(code);
  }
  assert(generated.size > 1);
});

Deno.test("HMAC binds the code to the recovery request", async () => {
  const previous = Deno.env.get("MFA_RECOVERY_TOKEN_SECRET");
  Deno.env.set("MFA_RECOVERY_TOKEN_SECRET", "test-only-secret-with-more-than-32-characters");
  try {
    const idA = "00000000-0000-4000-8000-000000000001";
    const idB = "00000000-0000-4000-8000-000000000002";
    const a = await recoveryCodeDigest(idA, "012345");
    assertEquals(a.length, 64);
    assert(constantTimeHexEqual(a, await recoveryCodeDigest(idA, "012345")));
    assert(!constantTimeHexEqual(a, await recoveryCodeDigest(idB, "012345")));
    assert(!constantTimeHexEqual(a, await recoveryCodeDigest(idA, "012346")));
    assert(!constantTimeHexEqual(a, "not-a-valid-digest"));
    await assertRejects(() => recoveryCodeDigest(idA, "12345"));
  } finally {
    if (previous === undefined) Deno.env.delete("MFA_RECOVERY_TOKEN_SECRET");
    else Deno.env.set("MFA_RECOVERY_TOKEN_SECRET", previous);
  }
});

Deno.test("missing server-side HMAC secret fails closed", async () => {
  const previous = Deno.env.get("MFA_RECOVERY_TOKEN_SECRET");
  Deno.env.delete("MFA_RECOVERY_TOKEN_SECRET");
  try {
    await assertRejects(() => recoveryCodeDigest("00000000-0000-4000-8000-000000000001", "123456"));
  } finally {
    if (previous !== undefined) Deno.env.set("MFA_RECOVERY_TOKEN_SECRET", previous);
  }
});
