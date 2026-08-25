// GAME TUTORIAL — PHASE 3: SCRIPTED PIDGEY BATTLE. Runs the real
// getOrStartBattle (battle-session.service.ts) against the fake Prisma DB,
// same "real service, fake DB" convention this codebase's other
// battle-session tests already use (see field-battle-stuck-phantom-session
// .test.ts).
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { getOrStartBattle } from "@/features/battle-session/services/battle-session.service";
import {
  getFieldBattleSessionRow,
  resetFakeDb,
  seedKnownMove,
  seedPlayerPokemon,
  seedPlayerProfile,
} from "../../../test/support/fakes/prisma.fake.ts";

const PLAYER_ID = "owner-1";

beforeEach(() => {
  resetFakeDb();
  seedPlayerProfile({ id: PLAYER_ID, level: 10, experience: 0, regionId: "kanto" });
  seedPlayerPokemon({ id: "p1", playerId: PLAYER_ID, speciesId: "charmander", level: 10, currentHp: 30, partySlot: 1 });
  seedKnownMove({ playerPokemonId: "p1", moveId: "scratch", slot: 1 });
});

test("forceTutorialEncounter creates a deterministic Pidgey session, never the real RNG encounter engine", async () => {
  const result = await getOrStartBattle(PLAYER_ID, "grassland", "kanto", { forceTutorialEncounter: true });

  assert.equal(result.status, "ready");
  if (result.status !== "ready") return;
  assert.equal(result.battle.wild.pokemon.id, "pidgey");
  // OPPONENT NAME — the real battle UI (BattleContent.tsx's own
  // `enemy: { name: wildState.pokemon.name, ... }`) reads this exact field
  // — the species catalog's own real English name, never a hardcoded
  // Hebrew transliteration.
  assert.equal(result.battle.wild.pokemon.name, "Pidgey");
  assert.equal(result.battle.wild.level, 6, "must be the fixed, safety-verified level, never rolled");
  assert.equal(result.battle.wild.currentHealth, result.battle.wild.maximumHealth, "a freshly-started encounter must be at full HP");

  const row = getFieldBattleSessionRow(PLAYER_ID);
  assert.equal(row?.isTutorialEncounter, true);
  assert.equal(row?.wildSpeciesId, "pidgey");
  assert.equal(row?.wildLevel, 6);
});

test("without forceTutorialEncounter, a brand-new session is a completely normal (non-tutorial) encounter", async () => {
  const result = await getOrStartBattle(PLAYER_ID, "grassland", "kanto");

  assert.equal(result.status, "ready");
  const row = getFieldBattleSessionRow(PLAYER_ID);
  assert.equal(row?.isTutorialEncounter, false, "normal Field Battles must remain completely unaffected by this phase");
});

test("forceTutorialEncounter: false behaves identically to omitting the option entirely", async () => {
  const result = await getOrStartBattle(PLAYER_ID, "grassland", "kanto", { forceTutorialEncounter: false });

  assert.equal(result.status, "ready");
  assert.equal(getFieldBattleSessionRow(PLAYER_ID)?.isTutorialEncounter, false);
});

test("resuming an existing tutorial session (refresh/navigation) never re-rolls it, even without forceTutorialEncounter on the resuming call", async () => {
  const started = await getOrStartBattle(PLAYER_ID, "grassland", "kanto", { forceTutorialEncounter: true });
  assert.equal(started.status, "ready");

  // Simulates a plain page reload of /battle?zone=grassland — the real
  // page never re-passes forceTutorialEncounter on a restore, since
  // battle-view.service.ts's own decision is irrelevant once a session
  // already exists (see getOrStartBattle's own "existing session" branch,
  // checked first).
  const resumed = await getOrStartBattle(PLAYER_ID, "grassland", "kanto");

  assert.equal(resumed.status, "ready");
  if (resumed.status !== "ready") return;
  assert.equal(resumed.battle.wild.pokemon.id, "pidgey", "the SAME tutorial encounter must be restored, never replaced by a normal one");
  assert.equal(getFieldBattleSessionRow(PLAYER_ID)?.isTutorialEncounter, true);
});

test("calling forceTutorialEncounter twice in a row never creates two sessions or re-rolls the encounter", async () => {
  const first = await getOrStartBattle(PLAYER_ID, "grassland", "kanto", { forceTutorialEncounter: true });
  const second = await getOrStartBattle(PLAYER_ID, "grassland", "kanto", { forceTutorialEncounter: true });

  assert.equal(first.status, "ready");
  assert.equal(second.status, "ready");
  if (first.status === "ready" && second.status === "ready") {
    assert.equal(first.battle.wild.pokemon.id, second.battle.wild.pokemon.id);
  }
});

test("a tutorial session for a different zone still redirects like any other session — the tutorial flag never bypasses that rule", async () => {
  await getOrStartBattle(PLAYER_ID, "grassland", "kanto", { forceTutorialEncounter: true });

  const result = await getOrStartBattle(PLAYER_ID, "cave", "kanto");
  assert.equal(result.status, "redirect");
  if (result.status === "redirect") {
    assert.equal(result.zoneId, "grassland");
  }
});
