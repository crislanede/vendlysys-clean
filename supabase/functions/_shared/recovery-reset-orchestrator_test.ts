import { assertEquals, assertRejects } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { orchestrateReset, type ResetDependencies } from "./recovery-reset-orchestrator.ts";

function fixture() {
  const events: string[] = [];
  const deps: ResetDependencies = {
    selectFactor: async () => { events.push("select"); return "factor-id"; },
    audit: async (event) => { events.push("audit:" + event); },
    claim: async () => { events.push("claim"); return true; },
    deleteFactor: async () => { events.push("delete"); return "deleted"; },
    finalize: async (success) => { events.push("finalize:" + success); return true; },
  };
  return { deps, events };
}

Deno.test("successful reset is claimed once and finalized after deletion", async () => {
  const { deps, events } = fixture();
  assertEquals(await orchestrateReset(deps), { status: "completed" });
  assertEquals(events, ["select", "audit:reset_preflight_passed", "claim", "delete", "audit:reset_factor_deleted", "finalize:true"]);
});
Deno.test("no factor blocks claim and deletion", async () => {
  const { deps, events } = fixture();
  deps.selectFactor = async () => null;
  assertEquals(await orchestrateReset(deps), { status: "blocked", reason: "factor_unavailable" });
  assertEquals(events, []);
});
Deno.test("claim rejected blocks factor deletion", async () => {
  const { deps, events } = fixture();
  deps.claim = async () => false;
  assertEquals(await orchestrateReset(deps), { status: "blocked", reason: "claim_rejected" });
  assertEquals(events.includes("delete"), false);
});
Deno.test("provider-reported deletion failure is terminal", async () => {
  const { deps, events } = fixture();
  deps.deleteFactor = async () => { events.push("delete"); return "failed"; };
  assertEquals(await orchestrateReset(deps), { status: "manual_review", reason: "delete_failed" });
  assertEquals(events.filter((event) => event === "delete").length, 1);
  assertEquals(events.includes("finalize:false"), true);
});
Deno.test("ambiguous deletion response never retries", async () => {
  const { deps, events } = fixture();
  deps.deleteFactor = async () => { events.push("delete"); throw Error("timeout"); };
  assertEquals(await orchestrateReset(deps), { status: "manual_review", reason: "delete_ambiguous" });
  assertEquals(events.filter((event) => event === "delete").length, 1);
  assertEquals(events.includes("finalize:false"), true);
});
Deno.test("finalization failure requires manual reconciliation", async () => {
  const { deps, events } = fixture();
  deps.finalize = async () => false;
  assertEquals(await orchestrateReset(deps), { status: "manual_review", reason: "finalize_failed" });
  assertEquals(events.includes("delete"), true);
});
Deno.test("audit failure before claim blocks mutation", async () => {
  const { deps, events } = fixture();
  deps.audit = async () => { throw Error("audit unavailable"); };
  await assertRejects(() => orchestrateReset(deps));
  assertEquals(events.includes("claim"), false);
  assertEquals(events.includes("delete"), false);
});
