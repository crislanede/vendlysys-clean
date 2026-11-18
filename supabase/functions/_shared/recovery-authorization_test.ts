import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { resolveSingleCompanyAdmin } from "./recovery-authorization.ts";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
Deno.test("owner of one company is eligible", () => {
  assertEquals(resolveSingleCompanyAdmin([], [{ id: A }], false), { allowed: true, empresaId: A });
});
Deno.test("active company admin of one company is eligible", () => {
  assertEquals(resolveSingleCompanyAdmin([{ empresa_id: A, perfil: "administrador" }], [], false),
    { allowed: true, empresaId: A });
});
Deno.test("employee cannot impersonate administrator", () => {
  assertEquals(resolveSingleCompanyAdmin([{ empresa_id: A, perfil: "funcionario" }], [], false), { allowed: false });
});
Deno.test("multiple tenants are rejected, even if admin in only one", () => {
  assertEquals(resolveSingleCompanyAdmin([
    { empresa_id: A, perfil: "admin" }, { empresa_id: B, perfil: "funcionario" },
  ], [], false), { allowed: false });
});
Deno.test("SaaS administrator cannot be downgraded to company scope", () => {
  assertEquals(resolveSingleCompanyAdmin([{ empresa_id: A, perfil: "admin" }], [], true), { allowed: false });
});
Deno.test("no company is rejected", () => {
  assertEquals(resolveSingleCompanyAdmin([], [], false), { allowed: false });
});
