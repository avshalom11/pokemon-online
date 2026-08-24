// DAYCARE — SHOW EVOLUTION / MOVE LEARNING AFTER PICKUP. Focused coverage
// for this task's own 3 requirements: a successful pickup makes the
// existing account-wide pending-decisions data immediately available (what
// DaycareContent feeds into the reused LevelUpDecisionsGate), the same
// pickup can surface BOTH an evolution and a move-learning decision
// together (proving the reused ordering gate has both to work with), and a
// failed pickup creates nothing. Real behavioral checks run the actual
// action layer (collectFromDaycareAction, getPendingLevelUpDecisionsAction)
// against the in-memory fake DB — same "real service/action, fake DB"
// convention this codebase's other behavioral tests already use (see e.g.
// features/daycare/daycare.test.ts's own test 18b, features/move-learning/
// actions/move-learning.actions.persistence.test.ts); UI-wiring facts are
// checked at the source level — this project's established "no
// React-render/DOM harness" convention.
import assert from "node:assert/strict";
import fs from "node:fs";
import { test, beforeEach } from "node:test";

import { collectFromDaycareAction } from "@/features/daycare/actions/daycare.actions";
import { DAYCARE_MS_PER_HOUR } from "@/features/daycare/config/daycare.config";
import { getPendingLevelUpDecisionsAction } from "@/features/move-learning/actions/level-up-decisions.actions";
import { __setSession } from "../../test/support/fakes/auth-session.fake.ts";
import { resetFakeDb, seedDaycareStay, seedKnownMove, seedPlayerPokemon, seedPlayerProfile } from "../../test/support/fakes/prisma.fake.ts";

const HOUR = DAYCARE_MS_PER_HOUR;

beforeEach(() => {
  resetFakeDb();
  seedPlayerProfile({ id: "owner-1", displayName: "אביב", coins: 100_000 });
  __setSession({ user: { id: "owner-1" } });
});

// ===========================================================================
// 1 — successful pickup triggers the decision gate: the exact same
// account-wide data LevelUpDecisionsGate needs is available immediately
// after collectFromDaycareAction resolves, with no extra Daycare-specific
// query — getPendingLevelUpDecisionsAction is the shared entry point.
// ===========================================================================
test("1: a successful pickup that earns a pending evolution makes it immediately available via the shared account-wide action", async () => {
  seedPlayerPokemon({ id: "mon-evolve", playerId: "owner-1", level: 12, speciesId: "charmander", experience: 0 });
  seedDaycareStay({ playerPokemonId: "mon-evolve", playerId: "owner-1", startingLevel: 12, depositedAt: new Date(Date.now() - 10_000 * HOUR) });

  const pickupResult = await collectFromDaycareAction("mon-evolve");
  assert.equal(pickupResult.ok, true);

  const decisionsResult = await getPendingLevelUpDecisionsAction();
  assert.equal(decisionsResult.status, "ok");
  assert.equal(decisionsResult.status === "ok" ? decisionsResult.decisions.pendingEvolution?.playerPokemonId : undefined, "mon-evolve");
  assert.equal(
    decisionsResult.status === "ok" ? decisionsResult.decisions.pendingEvolution?.evolvedSpecies.id : undefined,
    "charmeleon"
  );
});

// ===========================================================================
// 2 — evolution appears before move learning: the SAME pickup can create
// both a pending evolution and a pending move-learning decision (Charmander
// crossing level 16 with Known Moves already full), and the shared action
// surfaces both together — LevelUpDecisionsGate (already covered by
// features/move-learning/move-learning-ux.test.ts's own tests 8/9) is what
// then guarantees evolution renders first; this only proves Daycare
// correctly feeds it both pieces from one pickup, never reimplementing the
// ordering itself.
// ===========================================================================
test("2: a pickup that crosses both an evolution threshold and a full-moveset move-learning opportunity surfaces BOTH pending decisions together", async () => {
  seedPlayerPokemon({ id: "mon-both", playerId: "owner-1", level: 10, speciesId: "charmander", experience: 0 });
  seedKnownMove({ playerPokemonId: "mon-both", moveId: "growl", slot: 1 });
  seedKnownMove({ playerPokemonId: "mon-both", moveId: "scratch", slot: 2 });
  seedKnownMove({ playerPokemonId: "mon-both", moveId: "ember", slot: 3 });
  seedKnownMove({ playerPokemonId: "mon-both", moveId: "smokescreen", slot: 4 });
  seedDaycareStay({ playerPokemonId: "mon-both", playerId: "owner-1", startingLevel: 10, depositedAt: new Date(Date.now() - 10_000 * HOUR) });

  const pickupResult = await collectFromDaycareAction("mon-both");
  assert.equal(pickupResult.ok, true);

  const decisionsResult = await getPendingLevelUpDecisionsAction();
  assert.equal(decisionsResult.status, "ok");
  if (decisionsResult.status !== "ok") return;

  assert.equal(decisionsResult.decisions.pendingEvolution?.playerPokemonId, "mon-both", "evolution must be pending from this same pickup");
  assert.equal(
    decisionsResult.decisions.pendingMoveLearning?.playerPokemonId,
    "mon-both",
    "move-learning must ALSO be pending from this same pickup (Known Moves were already full)"
  );
  assert.equal(decisionsResult.decisions.pendingMoveLearning?.nextPending?.moveId, "dragon-rage");
});

// ===========================================================================
// 3 — failed pickup shows no decision popup: nothing is created, and the
// shared action reports nothing pending.
// ===========================================================================
test("3: a failed pickup (no active stay) creates no pending decision at all", async () => {
  seedPlayerPokemon({ id: "mon-none", playerId: "owner-1" });
  // Deliberately no seedDaycareStay for "mon-none" — collectFromDaycare
  // must reject with "not-found".

  const pickupResult = await collectFromDaycareAction("mon-none");
  assert.equal(pickupResult.ok, false);

  const decisionsResult = await getPendingLevelUpDecisionsAction();
  assert.equal(decisionsResult.status, "ok");
  if (decisionsResult.status !== "ok") return;
  assert.equal(decisionsResult.decisions.pendingEvolution, null);
  assert.equal(decisionsResult.decisions.pendingEvolutionBranch, null);
  assert.equal(decisionsResult.decisions.pendingMoveLearning, null);
});

// ===========================================================================
// UI wiring (source-level — this project has no React-render/DOM harness).
// ===========================================================================
const daycareContentSrc = fs.readFileSync("features/daycare/components/DaycareContent.tsx", "utf8");
const levelUpDecisionsGateSrc = fs.readFileSync("features/move-learning/components/LevelUpDecisionsGate.tsx", "utf8");
const daycareServiceSrc = fs.readFileSync("features/daycare/services/daycare.service.ts", "utf8");
const daycareActionsSrc = fs.readFileSync("features/daycare/actions/daycare.actions.ts", "utf8");

test("4: (source) DaycareContent mounts the EXISTING LevelUpDecisionsGate (never a Daycare-specific evolution/move-learning component)", () => {
  assert.ok(daycareContentSrc.includes('import { LevelUpDecisionsGate } from "@/features/move-learning/components/LevelUpDecisionsGate";'));
  assert.match(
    daycareContentSrc,
    /<LevelUpDecisionsGate\s+key=\{decisionsKey\}\s+initialPendingEvolution=\{pendingDecisions\.pendingEvolution\}\s+initialPendingEvolutionBranch=\{pendingDecisions\.pendingEvolutionBranch\}\s+initialPendingMoveLearning=\{pendingDecisions\.pendingMoveLearning\}\s*\/>/,
    "must pass all three pending pieces through, so the gate's own existing evolution-first ordering has both to work with"
  );
});

test("5: (source) a failed pickup returns before ever calling the pending-decisions action or touching decision state", () => {
  const handlePickupBody = daycareContentSrc.slice(
    daycareContentSrc.indexOf("function handlePickup"),
    daycareContentSrc.indexOf("\n  }", daycareContentSrc.indexOf("function handlePickup"))
  );
  const failureBranch = handlePickupBody.slice(0, handlePickupBody.indexOf("setData(await getDaycareViewAction())"));
  assert.match(failureBranch, /if \(!result\.ok\) \{[\s\S]*?return;\s*\}/, "the failure branch must return before any success-only code runs");
  assert.ok(!failureBranch.includes("getPendingLevelUpDecisionsAction"), "a failed pickup must never call the pending-decisions action");
  assert.ok(!failureBranch.includes("setPendingDecisions"), "a failed pickup must never set pending-decision state");
  assert.ok(!failureBranch.includes("setDecisionsKey"), "a failed pickup must never bump the decisions key");
});

test("6: (source) a successful pickup fetches the pending decisions via the shared action and forces LevelUpDecisionsGate to re-seed via a changed key", () => {
  const handlePickupBody = daycareContentSrc.slice(
    daycareContentSrc.indexOf("function handlePickup"),
    daycareContentSrc.indexOf("\n  }", daycareContentSrc.indexOf("function handlePickup"))
  );
  const successBranch = handlePickupBody.slice(handlePickupBody.indexOf("setData(await getDaycareViewAction())"));
  assert.ok(successBranch.includes("getPendingLevelUpDecisionsAction()"));
  assert.ok(successBranch.includes("setPendingDecisions("));
  assert.match(successBranch, /setDecisionsKey\(\(key\) => key \+ 1\)/);
});

test("7: (source) LevelUpDecisionsGate itself has no Daycare-specific branching — the exact same component Home already uses", () => {
  assert.ok(!levelUpDecisionsGateSrc.toLowerCase().includes("daycare"));
});

test("8: (source) neither daycare.service.ts nor daycare.actions.ts were given their own evolution/move-learning implementation — Daycare still relies solely on the shared applyPokemonXpGrant pipeline", () => {
  for (const src of [daycareServiceSrc, daycareActionsSrc]) {
    assert.ok(!src.includes("features/move-learning"), "must never import the move-learning feature directly");
    assert.ok(!src.includes("features/evolution/services"), "must never call the evolution services directly — that only ever happens inside applyPokemonXpGrant");
  }
  assert.ok(daycareServiceSrc.includes('applyPokemonXpGrant(tx, pokemon.id, xpAmount, "finisher", 1, "daycare")'));
});
