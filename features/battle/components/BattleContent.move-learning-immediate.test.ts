// FIELD BATTLE — SHOW MOVE LEARNING IMMEDIATELY: regression guard for the
// reported bug (a Pokémon that leveled into a new move mid-battle only saw
// the move-learning popup later, on Home). A Field Battle victory must show
// the EXISTING PendingMoveLearningGate/MoveLearningDecisionDialog right on
// the battle screen the instant the XP grant creates a pending decision,
// never waiting for a navigation to Home — and, when both are pending,
// evolution must still resolve first (LevelUpDecisionsGate's own
// "evolution must come first" rule, reused here). BattleContent is a
// "use client"-tree component with no React Testing Library/jsdom set up in
// this project, so this checks the invariants via a static source read —
// same approach as this same directory's own BattleContent.egg-found.test.ts
// / BattleContent.chest-found.test.ts.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const contentSource = readFileSync(new URL("./BattleContent.tsx", import.meta.url), "utf8");
const homeDataServiceSrc = readFileSync(
  new URL("../../home/services/home-data.service.ts", import.meta.url),
  "utf8"
);

test("BattleContent reuses the EXISTING PendingMoveLearningGate — no new battle-specific move-learning dialog/markup", () => {
  assert.ok(contentSource.includes('import { PendingMoveLearningGate } from "@/features/move-learning/components/PendingMoveLearningGate";'));
  assert.ok(!contentSource.includes("<MoveLearningDecisionDialog"), "must never render the raw dialog directly — only via the existing gate");
  assert.ok(!contentSource.includes('from "@/features/move-learning/components/MoveLearningDecisionDialog"'), "must never import the raw dialog directly — only via the existing gate");
});

test("a freshly-created pending move-learning decision (moveLearning.pendingMoves) is detected the instant the victory reward is applied", () => {
  const body = contentSource.slice(contentSource.indexOf("function applyPokemonRewards"), contentSource.indexOf("function applyVictoryReward"));
  assert.ok(body.includes("result.moveLearning.pendingMoves.length > 0"), "must key off the real per-grant plan, never a fabricated/derived flag");
});

test("the pending move-learning view is fetched via the EXISTING account-wide action — reusing the exact same persisted-row query Home's safety net already uses, never a battle-only reimplementation", () => {
  assert.ok(contentSource.includes('import { getFirstPendingMoveLearningViewAction } from "@/features/move-learning/actions/move-learning.actions";'));
  assert.ok(contentSource.includes("await getFirstPendingMoveLearningViewAction()"));
  assert.ok(homeDataServiceSrc.includes("getFirstPendingMoveLearningView(profile.id)"), "Home fallback must remain wired to the same persisted-row query, so an unresolved decision still resurfaces there");
});

test("EVOLUTION MUST COME FIRST: the move-learning gate only mounts once BOTH evolution states are clear, never unconditionally or before evolution", () => {
  assert.match(
    contentSource,
    /\{!pendingEvolution && !pendingEvolutionBranch && pendingMoveLearningView \? \(\s*<PendingMoveLearningGate/,
    "move-learning must be gated on both pendingEvolution and pendingEvolutionBranch being clear, exactly like LevelUpDecisionsGate's own evolutionResolved rule"
  );
});

test("the move-learning gate is seeded once per fresh grant (guarded on !pendingMoveLearningView) and clears itself via onFullyResolved, so a later separate victory can show its own decision immediately too", () => {
  const body = contentSource.slice(contentSource.indexOf("function applyPokemonRewards"), contentSource.indexOf("function applyVictoryReward"));
  assert.match(body, /if \(!pendingMoveLearningView\) \{/);
  assert.ok(contentSource.includes("onFullyResolved={() => setPendingMoveLearningView(null)}"));
});
