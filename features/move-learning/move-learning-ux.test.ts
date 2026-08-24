// MOVE LEARNING UX — focused coverage for this task's own 12 requirements:
// the account-wide "Home safety net" prompt for a pending move-learning
// decision (mirroring features/evolution's own architecture), the move
// comparison data it's built from, the evolution-first ordering rule, and
// that Field Battle/Daycare both feed the one existing pending-move
// system rather than a duplicated implementation each. Real behavioral
// checks run the actual query/service/action layer against the in-memory
// fake DB — same "real service, fake DB" convention this codebase's other
// behavioral tests already use (see e.g. move-learning-service.persistence
// .test.ts); UI-wiring facts (button gating, component composition,
// ordering) are checked at the source level — this project's established
// "no React-render/DOM harness" convention (see e.g.
// features/friends/friends-quick-actions.test.ts,
// features/presence/presence.test.ts).
import assert from "node:assert/strict";
import fs from "node:fs";
import { test, beforeEach } from "node:test";

import { getMoveById } from "@/engine/moves";
import { declinePendingMove, resolvePendingMoveLearn } from "@/features/move-learning/move-learning-service";
import { getFirstPendingMoveLearningPlayerPokemonId } from "@/features/move-learning/move-learning-queries";
import { getFirstPendingMoveLearningView, getPendingMoveLearningView } from "@/features/move-learning/move-learning-view.service";
import {
  resetFakeDb,
  seedKnownMove,
  seedPendingMove,
  seedPlayerPokemon,
  getKnownMovesFor,
} from "../../test/support/fakes/prisma.fake.ts";

const FOUR_KNOWN_MOVES = ["growl", "scratch", "ember", "smokescreen"] as const;

function seedFullyKnownCharmander(playerPokemonId: string, playerId: string) {
  seedPlayerPokemon({ id: playerPokemonId, playerId, speciesId: "charmander" });
  FOUR_KNOWN_MOVES.forEach((moveId, index) => {
    seedKnownMove({ playerPokemonId, moveId, slot: index + 1 });
  });
}

beforeEach(() => {
  resetFakeDb();
});

// ===========================================================================
// 1 — fewer than 4 known moves still auto-learns with no popup.
// ===========================================================================
// (The auto-learn behavior itself is unchanged and already exhaustively
// covered by engine/move-learning/planning/plan-level-up-move-learning.test.ts
// — this proves the NEW popup surface specifically has nothing to show in
// that case: no pending row was ever created, so there's nothing for the
// Home safety net to surface.)
test("1: a Pokémon with fewer than 4 known moves and no pending row never surfaces the popup", async () => {
  seedPlayerPokemon({ id: "p1", playerId: "owner-1", speciesId: "charmander" });
  seedKnownMove({ playerPokemonId: "p1", moveId: "growl", slot: 1 });
  seedKnownMove({ playerPokemonId: "p1", moveId: "scratch", slot: 2 });

  const view = await getFirstPendingMoveLearningView("owner-1");
  assert.equal(view, null);
});

// ===========================================================================
// 2 — exactly 4 moves creates the popup.
// ===========================================================================
test("2: a Pokémon with 4 known moves plus a pending row surfaces the popup, identifying the correct Pokémon and pending decision", async () => {
  seedFullyKnownCharmander("p1", "owner-1");
  seedPendingMove({ id: "pend1", playerPokemonId: "p1", moveId: "dragon-rage", learnedAtLevel: 16 });

  const view = await getFirstPendingMoveLearningView("owner-1");

  assert.ok(view);
  assert.equal(view!.playerPokemonId, "p1");
  assert.equal(view!.nextPending?.id, "pend1");
  assert.equal(view!.nextPending?.moveId, "dragon-rage");
  assert.equal(view!.nextPending?.learnedAtLevel, 16);
});

// ===========================================================================
// 3 — new move shows name/type/power/accuracy, from the real registry.
// ===========================================================================
test("3: the new move's name/type/category/power/accuracy come from the real Move Registry, never hardcoded", async () => {
  seedFullyKnownCharmander("p1", "owner-1");
  seedPendingMove({ id: "pend1", playerPokemonId: "p1", moveId: "dragon-rage", learnedAtLevel: 16 });

  const view = await getFirstPendingMoveLearningView("owner-1");
  const realMove = getMoveById("dragon-rage")!;

  assert.equal(view!.nextPending?.moveName, realMove.name);
  assert.equal(view!.nextPending?.type, realMove.type);
  assert.equal(view!.nextPending?.category, realMove.category);
  assert.equal(view!.nextPending?.power, realMove.power);
  assert.equal(view!.nextPending?.accuracy, realMove.accuracy);
  // Dragon Rage is a fixed-damage move — power is null in the registry
  // itself (never a fabricated 0 or omitted field), which is what drives
  // the "—" display convention client-side.
  assert.equal(realMove.power, null);
});

// ===========================================================================
// 4 — every one of the 4 existing moves shows name/type/power/accuracy.
// ===========================================================================
test("4: every one of the 4 current Known Moves carries its real type/category/power/accuracy, including a status move's null power", async () => {
  seedFullyKnownCharmander("p1", "owner-1");
  seedPendingMove({ id: "pend1", playerPokemonId: "p1", moveId: "dragon-rage", learnedAtLevel: 16 });

  const view = await getFirstPendingMoveLearningView("owner-1");
  assert.equal(view!.knownMoves.length, 4);

  for (const slot of view!.knownMoves) {
    const realMove = getMoveById(slot.moveId)!;
    assert.equal(slot.moveName, realMove.name);
    assert.equal(slot.type, realMove.type);
    assert.equal(slot.category, realMove.category);
    assert.equal(slot.power, realMove.power);
    assert.equal(slot.accuracy, realMove.accuracy);
  }

  // Growl is a status move — its power must be null in the real data
  // (never a fabricated numeric placeholder), which is exactly the "—"
  // case this task calls out.
  const growlSlot = view!.knownMoves.find((slot) => slot.moveId === "growl");
  assert.equal(growlSlot?.power, null);
  assert.equal(growlSlot?.category, "status");
});

// ===========================================================================
// 6 — replacement reuses the EXISTING resolvePendingMoveLearn logic.
// ===========================================================================
test("6: resolving the popup's decision via the existing resolvePendingMoveLearn replaces exactly the selected slot, and the popup then has nothing left to show", async () => {
  seedFullyKnownCharmander("p1", "owner-1");
  seedPendingMove({ id: "pend1", playerPokemonId: "p1", moveId: "dragon-rage", learnedAtLevel: 16 });

  const result = await resolvePendingMoveLearn("pend1", 2);
  assert.equal(result.status, "success");
  assert.deepEqual(getKnownMovesFor("p1"), [
    { moveId: "growl", slot: 1 },
    { moveId: "dragon-rage", slot: 2 },
    { moveId: "ember", slot: 3 },
    { moveId: "smokescreen", slot: 4 },
  ]);

  const view = await getFirstPendingMoveLearningView("owner-1");
  assert.equal(view, null, "the popup must have nothing left to show once its only pending decision is resolved");
});

// ===========================================================================
// 7 — decline reuses the EXISTING declinePendingMove logic.
// ===========================================================================
test("7: declining the popup's decision via the existing declinePendingMove leaves Known Moves untouched, and the popup then has nothing left to show", async () => {
  seedFullyKnownCharmander("p1", "owner-1");
  seedPendingMove({ id: "pend1", playerPokemonId: "p1", moveId: "dragon-rage", learnedAtLevel: 16 });
  const before = getKnownMovesFor("p1");

  const result = await declinePendingMove("pend1");
  assert.equal(result.status, "success");
  assert.deepEqual(getKnownMovesFor("p1"), before);

  const view = await getFirstPendingMoveLearningView("owner-1");
  assert.equal(view, null);
});

// ===========================================================================
// 10 — multiple pending moves resolve one at a time, in canonical order —
// across DIFFERENT owned Pokémon, proving the NEW account-wide query
// specifically (the single-Pokémon queue ordering itself is already
// covered by move-learning-service.persistence.test.ts).
// ===========================================================================
test("10: the account-wide popup surfaces pending decisions one at a time, in creation (sequence) order, across different owned Pokémon", async () => {
  seedFullyKnownCharmander("p1", "owner-1");
  seedPlayerPokemon({ id: "p2", playerId: "owner-1", speciesId: "squirtle" });
  seedKnownMove({ playerPokemonId: "p2", moveId: "tackle", slot: 1 });
  seedKnownMove({ playerPokemonId: "p2", moveId: "growl", slot: 2 });
  seedKnownMove({ playerPokemonId: "p2", moveId: "water-gun", slot: 3 });
  seedKnownMove({ playerPokemonId: "p2", moveId: "bite", slot: 4 });

  // Seeded out of Pokémon-creation order on purpose: p2's pending row was
  // created FIRST (lower sequence) even though p1 is seeded first here, to
  // prove the account-wide pick depends on creation order, not on
  // Pokémon id or seeding order.
  seedPendingMove({ id: "pend-p2", playerPokemonId: "p2", moveId: "bubble", learnedAtLevel: 8, sequence: 1 });
  seedPendingMove({ id: "pend-p1", playerPokemonId: "p1", moveId: "dragon-rage", learnedAtLevel: 16, sequence: 2 });

  const first = await getFirstPendingMoveLearningView("owner-1");
  assert.equal(first?.playerPokemonId, "p2");
  assert.equal(first?.nextPending?.id, "pend-p2");

  await declinePendingMove("pend-p2");

  const second = await getFirstPendingMoveLearningView("owner-1");
  assert.equal(second?.playerPokemonId, "p1");
  assert.equal(second?.nextPending?.id, "pend-p1");

  await declinePendingMove("pend-p1");

  const third = await getFirstPendingMoveLearningView("owner-1");
  assert.equal(third, null, "nothing left to show once every pending decision across the account has been resolved");
});

test("10b: getFirstPendingMoveLearningPlayerPokemonId never returns a Pokémon whose own pending decision already has an earlier one queued elsewhere on the account", async () => {
  seedFullyKnownCharmander("p1", "owner-1");
  seedPendingMove({ id: "pend-late", playerPokemonId: "p1", moveId: "dragon-rage", learnedAtLevel: 16, sequence: 5 });

  seedPlayerPokemon({ id: "p2", playerId: "owner-1", speciesId: "bulbasaur" });
  seedKnownMove({ playerPokemonId: "p2", moveId: "tackle", slot: 1 });
  seedPendingMove({ id: "pend-early", playerPokemonId: "p2", moveId: "growl", learnedAtLevel: 3, sequence: 1 });

  const playerPokemonId = await getFirstPendingMoveLearningPlayerPokemonId("owner-1");
  assert.equal(playerPokemonId, "p2");
});

// ===========================================================================
// Account isolation — never leaks another player's pending decisions.
// ===========================================================================
test("getFirstPendingMoveLearningView never returns another player's pending decision", async () => {
  seedFullyKnownCharmander("p1", "owner-A");
  seedPendingMove({ id: "pend1", playerPokemonId: "p1", moveId: "dragon-rage", learnedAtLevel: 16 });

  const viewForOtherPlayer = await getFirstPendingMoveLearningView("owner-B");
  assert.equal(viewForOtherPlayer, null);

  const viewForOwner = await getFirstPendingMoveLearningView("owner-A");
  assert.equal(viewForOwner?.playerPokemonId, "p1");
});

test("a player with no owned Pokémon at all never surfaces a popup", async () => {
  const view = await getFirstPendingMoveLearningView("owner-nobody");
  assert.equal(view, null);
});

// ===========================================================================
// 11 — refresh/navigation does not lose the pending decision: it is read
// fresh from the persisted row every time, never from any transient state.
// ===========================================================================
test("11: the pending decision is read fresh from the persisted row on every call — repeated reads agree, and a resolution made between reads is reflected on the very next read", async () => {
  seedFullyKnownCharmander("p1", "owner-1");
  seedPendingMove({ id: "pend1", playerPokemonId: "p1", moveId: "dragon-rage", learnedAtLevel: 16 });

  const firstRead = await getFirstPendingMoveLearningView("owner-1");
  const secondRead = await getFirstPendingMoveLearningView("owner-1");
  assert.deepEqual(firstRead, secondRead, "two reads with no mutation in between must agree — this IS the 'survives a refresh' guarantee, since a page refresh is just another read of the same persisted row");

  // Simulates the decision being resolved by some other means (e.g. the My
  // Pokémon on-demand panel, in a different tab) — the next read (what a
  // refreshed Home page would do) must see it, never a stale cached value.
  await resolvePendingMoveLearn("pend1", 1);
  const thirdRead = await getFirstPendingMoveLearningView("owner-1");
  assert.equal(thirdRead, null);
});

// ===========================================================================
// UI wiring (source-level — this project has no React-render/DOM harness).
// ===========================================================================
const dialogSrc = fs.readFileSync("features/move-learning/components/MoveLearningDecisionDialog.tsx", "utf8");
const gateSrc = fs.readFileSync("features/move-learning/components/PendingMoveLearningGate.tsx", "utf8");
const levelUpGateSrc = fs.readFileSync("features/move-learning/components/LevelUpDecisionsGate.tsx", "utf8");
const evolutionGateSrc = fs.readFileSync("features/evolution/components/PendingEvolutionGate.tsx", "utf8");
const homeContentSrc = fs.readFileSync("features/home/components/HomeContent.tsx", "utf8");
const homeDataServiceSrc = fs.readFileSync("features/home/services/home-data.service.ts", "utf8");
const battleAttackPanelSrc = fs.readFileSync("components/battle/BattleAttackPanel.tsx", "utf8");
const battleSessionServiceSrc = fs.readFileSync("features/battle-session/services/battle-session.service.ts", "utf8");
const daycareServiceSrc = fs.readFileSync("features/daycare/services/daycare.service.ts", "utf8");

// 5 — "Learn" is disabled until a current move is selected; "Decline" is
// never gated on a selection at all.
test("5: (source) the Learn button is disabled until an existing move is selected, and never auto-replaces one on its own", () => {
  assert.match(dialogSrc, /disabled=\{isSubmitting \|\| selectedSlot === null\}/, "Learn must stay disabled with no slot selected");
  assert.ok(!dialogSrc.includes('"למד את המתקפה"'), "the label must be produced via the shared moveLearningLearnButtonLabel constant, not inlined a second time");
  assert.ok(dialogSrc.includes("moveLearningLearnButtonLabel"));
  assert.ok(dialogSrc.includes("moveLearningDeclineButtonLabel"));
});

test("5b: (source) the exact Hebrew button labels required by this task exist in the shared messages module", () => {
  const messagesSrc = fs.readFileSync("features/move-learning/messages/move-learning-messages.ts", "utf8");
  assert.match(messagesSrc, /moveLearningLearnButtonLabel = "למד את המתקפה"/);
  assert.match(messagesSrc, /moveLearningDeclineButtonLabel = "אל תלמד את המתקפה"/);
});

test("5c: (source) the dialog cannot be dismissed except via its own two buttons — no backdrop-click handler, no close (X) control", () => {
  const componentBody = dialogSrc.slice(dialogSrc.indexOf("export function MoveLearningDecisionDialog"));
  const jsx = componentBody.slice(componentBody.indexOf("return ("));
  const overlayOpenTag = jsx.slice(jsx.indexOf('role="dialog"'), jsx.indexOf(">", jsx.indexOf('role="dialog"')));
  assert.ok(!overlayOpenTag.includes("onClick"), "the fixed-overlay backdrop div itself must never carry a dismiss-on-click handler");
  assert.ok(!jsx.includes("✕"), "no close-X control (checked in the rendered JSX only — a doc comment is free to describe this rule in prose), mirroring EvolutionPromptDialog's own 'no accidental dismissal' rule");
});

test("5d: (source) move stats reuse the EXACT existing power/accuracy display convention BattleAttackPanel already established (`?? \"—\"`), never a duplicated/hardcoded convention", () => {
  assert.match(battleAttackPanelSrc, /power \?\? "—"/);
  assert.match(battleAttackPanelSrc, /accuracy \?\? "—"/);
  assert.match(dialogSrc, /power \?\? "—"/);
  assert.match(dialogSrc, /accuracy \?\? "—"/);
});

// 6b — the gate calls the EXISTING actions, never a new/duplicated
// persistence path (and, being a "use client" component, can't touch
// Prisma directly regardless).
test("6b: (source) PendingMoveLearningGate calls the existing resolvePendingMoveLearnAction/declinePendingMoveAction — no new persistence logic of its own", () => {
  assert.ok(gateSrc.includes('from "@/features/move-learning/actions/move-learning.actions"'));
  assert.ok(gateSrc.includes("resolvePendingMoveLearnAction") && gateSrc.includes("declinePendingMoveAction"));
  assert.ok(gateSrc.includes("resolvePendingMoveLearnAction(pending.id, selectedSlot)"), "must call the existing action with the pending id + chosen slot, not a reimplemented replace");
  assert.ok(gateSrc.includes("declinePendingMoveAction(pending.id)"));
  assert.ok(!gateSrc.includes("prisma"), "a client component must never touch Prisma directly");
  assert.ok(!gateSrc.includes("$transaction"));
});

// 10c — the gate re-fetches the account's NEXT pending decision after
// every resolve/decline, which is what makes "Move 1 -> Move 2 -> Move 3"
// work without stacking multiple dialogs.
test("10c: (source) PendingMoveLearningGate re-fetches the next pending decision via getFirstPendingMoveLearningViewAction after every learn/decline, and only ever renders ONE dialog at a time", () => {
  assert.ok(gateSrc.includes("getFirstPendingMoveLearningViewAction"));
  const learnBody = gateSrc.slice(gateSrc.indexOf("function handleLearn"), gateSrc.indexOf("function handleDecline"));
  const declineBody = gateSrc.slice(gateSrc.indexOf("function handleDecline"));
  assert.ok(learnBody.includes("advanceToNextPending"), "learning must advance to whatever pending decision comes next");
  assert.ok(declineBody.includes("advanceToNextPending"), "declining must advance to whatever pending decision comes next");
  assert.equal((gateSrc.match(/<MoveLearningDecisionDialog/g) ?? []).length, 1, "only one dialog element in the whole component — never a list/stack of them");
});

// 8/9 — EVOLUTION MUST COME FIRST.
test("8: (source) LevelUpDecisionsGate only mounts PendingMoveLearningGate once evolution is fully resolved, and never renders both dialogs unconditionally", () => {
  assert.ok(levelUpGateSrc.includes("<PendingEvolutionGate"));
  assert.match(levelUpGateSrc, /\{evolutionResolved \? <PendingMoveLearningGate[\s\S]*?\/> : null\}/, "move-learning must be conditionally gated on evolutionResolved, never unconditional");
  assert.match(
    levelUpGateSrc,
    /useState\(!initialPendingEvolution && !initialPendingEvolutionBranch\)/,
    "evolutionResolved must start true only when there was never a pending evolution/branch to begin with"
  );
});

test("9: (source) PendingEvolutionGate reports 'fully resolved' the instant both its own pending states are null, and only then — LevelUpDecisionsGate is the only thing that reacts to it", () => {
  assert.match(evolutionGateSrc, /onFullyResolved\?:\s*\(\) => void/, "must be an optional prop — every existing caller that doesn't pass it keeps its exact prior behavior");
  assert.match(evolutionGateSrc, /if \(!pending && !pendingBranch\) \{\s*onFullyResolved\?\.\(\);\s*\}/);
  assert.match(levelUpGateSrc, /onFullyResolved=\{\(\) => setEvolutionResolved\(true\)\}/);
});

test("9b: (source) HomeContent mounts LevelUpDecisionsGate (not a raw, unordered PendingEvolutionGate) as the one entry point for both decision gates", () => {
  assert.ok(homeContentSrc.includes("<LevelUpDecisionsGate"));
  assert.ok(!homeContentSrc.includes("<PendingEvolutionGate"), "Home must no longer mount PendingEvolutionGate directly, unordered relative to move-learning");
});

// 11b — server-seeded, not client-only state: HomeViewData carries the
// pending-move prompt from the same server read every other Home data
// comes from, so it genuinely survives a refresh/navigation (a Server
// Component re-render, not a client memory value).
test("11b: (source) getHomeViewData fetches pendingMoveLearning via the real persisted-row query, in the same server-side read as pendingEvolution — never client-only state", () => {
  assert.ok(homeDataServiceSrc.includes("getFirstPendingMoveLearningView(profile.id)"));
  assert.match(homeDataServiceSrc, /pendingMoveLearning,\s*significantCaptures,/, "must be awaited in the same Promise.all as the rest of Home's server-rendered data");
});

// 12 — Field Battle and Daycare both feed the ONE existing pending-move
// system; this task adds no separate/duplicated implementation for either.
test("12: (source) neither battle-session.service.ts nor daycare.service.ts were given their own move-learning implementation — both still rely solely on the shared applyPokemonXpGrant/applyLevelUpMoveLearning pipeline", () => {
  for (const src of [battleSessionServiceSrc, daycareServiceSrc]) {
    assert.ok(!src.includes("features/move-learning"), "must never import the move-learning feature directly — move learning is entirely a side effect of applyPokemonXpGrant, the one shared XP-write path");
    assert.ok(!src.includes("PlayerPendingMoveLearning"), "must never touch the pending-move table directly");
  }
  assert.ok(battleSessionServiceSrc.includes("grantBattlePokemonXp("), "Field Battle XP must still go through the one shared grant function");
  assert.ok(daycareServiceSrc.includes('applyPokemonXpGrant(tx, pokemon.id, xpAmount, "finisher", 1, "daycare")'), "Daycare XP must still go through the one shared grant function, unchanged");
});
