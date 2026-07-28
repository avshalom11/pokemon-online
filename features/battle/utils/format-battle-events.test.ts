import assert from "node:assert/strict";
import { test } from "node:test";

import { formatBattleEvent } from "./format-battle-events.ts";

const CONTEXT = { playerPokemonName: "Charmander", enemyPokemonName: "Bulbasaur" };

test("move-used resolves the move's display name from its id", () => {
  const message = formatBattleEvent({ type: "move-used", actor: "player", pokemonId: "p1", moveId: "scratch" }, CONTEXT);
  assert.equal(message, "Charmander השתמש ב־Scratch");
});

test("move-used falls back to the raw moveId for an unknown move", () => {
  const message = formatBattleEvent({ type: "move-used", actor: "enemy", pokemonId: "w1", moveId: "not-a-real-move" }, CONTEXT);
  assert.equal(message, "Bulbasaur השתמש ב־not-a-real-move");
});

test("move-missed, critical-hit, and effectiveness produce the expected fixed Hebrew lines", () => {
  assert.equal(formatBattleEvent({ type: "move-missed", actor: "player", pokemonId: "p1", moveId: "scratch" }, CONTEXT), "המתקפה פספסה!");
  assert.equal(formatBattleEvent({ type: "critical-hit", actor: "player" }, CONTEXT), "פגיעה קריטית!");
  assert.equal(formatBattleEvent({ type: "effectiveness", actor: "player", value: "super-effective" }, CONTEXT), "המתקפה הייתה יעילה מאוד!");
  assert.equal(formatBattleEvent({ type: "effectiveness", actor: "player", value: "not-very-effective" }, CONTEXT), "המתקפה לא הייתה יעילה במיוחד.");
  assert.equal(formatBattleEvent({ type: "effectiveness", actor: "player", value: "none" }, CONTEXT), "למתקפה לא הייתה השפעה.");
});

test("damage-dealt names the target (the one who lost HP), not the attacker", () => {
  const message = formatBattleEvent(
    { type: "damage-dealt", actor: "player", target: "enemy", damage: 12, remainingHp: 8 },
    CONTEXT
  );
  assert.equal(message, "Bulbasaur איבד 12 חיים.");
});

test("fainted reuses the existing faintedMessage wording", () => {
  const message = formatBattleEvent({ type: "fainted", actor: "enemy", pokemonId: "w1" }, CONTEXT);
  assert.equal(message, "Bulbasaur התעלף!");
});

test("action-skipped distinguishes fainted-before-action from no-valid-target", () => {
  const faintedBeforeAction = formatBattleEvent(
    { type: "action-skipped", actor: "player", reason: "fainted-before-action" },
    CONTEXT
  );
  assert.equal(faintedBeforeAction, "Charmander לא הספיק לפעול.");

  const noValidTarget = formatBattleEvent({ type: "action-skipped", actor: "enemy", reason: "no-valid-target" }, CONTEXT);
  assert.equal(noValidTarget, "לא נותר יריב לתקוף!");
});

test("stat-stage-changed distinguishes a drop from a big rise", () => {
  const drop = formatBattleEvent(
    { type: "stat-stage-changed", actor: "enemy", stat: "attack", previousStage: 0, newStage: -1 },
    CONTEXT
  );
  assert.equal(drop, "ההתקפה של Bulbasaur ירדה!");

  const bigRise = formatBattleEvent(
    { type: "stat-stage-changed", actor: "player", stat: "speed", previousStage: 0, newStage: 2 },
    CONTEXT
  );
  assert.equal(bigRise, "המהירות של Charmander עלתה מאוד!");
});

test("status-applied and status-damage produce the expected fixed lines", () => {
  assert.equal(formatBattleEvent({ type: "status-applied", actor: "enemy", status: "burn" }, CONTEXT), "Bulbasaur נכווה!");
  assert.equal(formatBattleEvent({ type: "status-applied", actor: "player", status: "paralysis" }, CONTEXT), "Charmander שותק!");
  assert.equal(
    formatBattleEvent({ type: "status-damage", actor: "enemy", status: "poison", damage: 5, remainingHp: 10 }, CONTEXT),
    "Bulbasaur נפגע מהרעל!"
  );
});

test("status-prevented-action and status-application-failed produce the expected lines", () => {
  assert.equal(
    formatBattleEvent({ type: "status-prevented-action", actor: "player", status: "paralysis" }, CONTEXT),
    "Charmander לא יכול לזוז בגלל השיתוק!"
  );
  assert.equal(
    formatBattleEvent({ type: "status-application-failed", actor: "enemy", status: "burn", reason: "immune" }, CONTEXT),
    "זה לא השפיע."
  );
});
