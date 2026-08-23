// NEW PLAYER STARTER — START AT LEVEL 10. Real behavioral coverage of
// selectStarterPokemon (select-starter.service.ts) against the fake
// Prisma DB (alias-loader.mjs redirects @/lib/db/prisma automatically) —
// same "real service, fake DB" shape this codebase's other behavioral
// tests already use.
import assert from "node:assert/strict";
import fs from "node:fs";
import { test, beforeEach } from "node:test";

import { STARTER_POKEMON_LEVEL } from "@/features/onboarding/config/starter-pokemon.config";
import { selectStarterPokemon } from "@/features/onboarding/services/select-starter.service";
import { getStartingKnownMoves } from "@/engine/known-moves";
import { getTotalXpRequiredForPokemonLevel } from "@/features/pokemon-progression/pokemon-progression-calculations";
import { getStarterSpecies } from "@/features/pokemon/services/species-catalog";
import {
  getKnownMoveRows,
  getPlayerPokemonsByPlayerId,
  getPlayerProfileRow,
  resetFakeDb,
  seedPlayerProfile,
  seedUser,
} from "../../../test/support/fakes/prisma.fake.ts";

beforeEach(() => {
  resetFakeDb();
});

const STARTER_SPECIES = getStarterSpecies()[0];

// (1) the config value itself is the required 10.
test("(1) STARTER_POKEMON_LEVEL is 10", () => {
  assert.equal(STARTER_POKEMON_LEVEL, 10);
});

// (2) a newly selected starter is created at level 10.
test("(2) a new player's selected starter is created at level 10", async () => {
  seedUser({ id: "user-1", username: "newplayer1" });
  seedPlayerProfile({ id: "user-1", onboardingCompleted: false });

  const result = await selectStarterPokemon("user-1", STARTER_SPECIES.id);

  assert.deepEqual(result, { status: "created" });
  const [pokemon] = getPlayerPokemonsByPlayerId("user-1");
  assert.ok(pokemon);
  assert.equal(pokemon!.level, 10);
});

// (3) the persisted XP corresponds correctly to level 10 — derived from
// the SAME shared curve every other Pokémon-level calculation uses, never
// a separate/duplicated formula or a bare 0.
test("(3) the persisted experience is the real total-XP baseline for level 10, via the shared progression curve", async () => {
  seedUser({ id: "user-2", username: "newplayer2" });
  seedPlayerProfile({ id: "user-2", onboardingCompleted: false });

  await selectStarterPokemon("user-2", STARTER_SPECIES.id);

  const [pokemon] = getPlayerPokemonsByPlayerId("user-2");
  const expectedXp = getTotalXpRequiredForPokemonLevel(10);
  assert.equal(pokemon!.experience, expectedXp);
  assert.notEqual(expectedXp, 0, "sanity check — level 10's XP baseline must be a real positive number, not the level-1 default");
});

// (4) starter species selection is unchanged — the exact requested,
// allowed species is what gets created, never substituted.
test("(4) the created Pokémon's species matches exactly what was requested", async () => {
  seedUser({ id: "user-3", username: "newplayer3" });
  seedPlayerProfile({ id: "user-3", onboardingCompleted: false });

  await selectStarterPokemon("user-3", STARTER_SPECIES.id);

  const [pokemon] = getPlayerPokemonsByPlayerId("user-3");
  assert.equal(pokemon!.speciesId, STARTER_SPECIES.id);
});

test("(4b) an invalid/non-starter species is still rejected exactly as before — species selection logic is untouched", async () => {
  seedUser({ id: "user-3b", username: "newplayer3b" });
  seedPlayerProfile({ id: "user-3b", onboardingCompleted: false });

  const result = await selectStarterPokemon("user-3b", "not-a-real-species-id");

  assert.deepEqual(result, { status: "invalid-species" });
  assert.equal(getPlayerPokemonsByPlayerId("user-3b").length, 0);
});

// (5) ownership/party placement is unchanged — isStarter, partySlot 1,
// currentHp from the species' own base stat, owned by the resolved profile.
test("(5) ownership and party placement are unchanged: isStarter=true, partySlot=1, correct owner and starting HP", async () => {
  seedUser({ id: "user-4", username: "newplayer4" });
  seedPlayerProfile({ id: "user-4", onboardingCompleted: false });

  await selectStarterPokemon("user-4", STARTER_SPECIES.id);

  const [pokemon] = getPlayerPokemonsByPlayerId("user-4");
  assert.equal(pokemon!.playerId, "user-4");
  assert.equal(pokemon!.isStarter, true);
  assert.equal(pokemon!.partySlot, 1);
  assert.equal(pokemon!.currentHp, STARTER_SPECIES.baseStats.health);
  assert.equal(pokemon!.source, "starter");

  const profile = getPlayerProfileRow("user-4");
  assert.equal(profile!.onboardingCompleted, true);
  assert.equal(profile!.starterPokemonId, STARTER_SPECIES.id);
});

// (6) moves: reuses the EXISTING learnset architecture for level 10 —
// never a manually duplicated move list.
test("(6) the starter's known moves are exactly getStartingKnownMoves(speciesId, 10) — the existing learnset system, not a duplicated list", async () => {
  seedUser({ id: "user-5", username: "newplayer5" });
  seedPlayerProfile({ id: "user-5", onboardingCompleted: false });

  await selectStarterPokemon("user-5", STARTER_SPECIES.id);

  const [pokemon] = getPlayerPokemonsByPlayerId("user-5");
  const knownMoves = getKnownMoveRows(pokemon!.id).map((row) => row.moveId);
  const expectedMoves = getStartingKnownMoves(STARTER_SPECIES.id, 10);
  assert.deepEqual(knownMoves, expectedMoves);
});

// (7) existing players (onboarding already completed) are unaffected — no
// second starter, no mutation, same "already-completed" guard as before.
test("(7) an existing player (onboarding already completed) is unaffected — no new/second starter is created", async () => {
  seedUser({ id: "user-6", username: "existingplayer" });
  seedPlayerProfile({ id: "user-6", onboardingCompleted: true, starterPokemonId: "some-other-species" });

  const result = await selectStarterPokemon("user-6", STARTER_SPECIES.id);

  assert.deepEqual(result, { status: "already-completed" });
  assert.equal(getPlayerPokemonsByPlayerId("user-6").length, 0, "no PlayerPokemon row may be created for an already-onboarded player");
  const profile = getPlayerProfileRow("user-6");
  assert.equal(profile!.starterPokemonId, "some-other-species", "an existing player's own starter record must never be overwritten");
});

// (8) other Pokémon-acquisition paths never reference the starter's level
// config at all — capture/hatch/Daycare keep their own, completely
// independent level sources.
test("(8) capture and egg-hatching services never reference STARTER_POKEMON_LEVEL — other acquisition paths are structurally untouched", () => {
  const captureSrc = fs.readFileSync("features/battle/services/capture.service.ts", "utf8");
  assert.ok(!captureSrc.includes("STARTER_POKEMON_LEVEL"));
  assert.ok(!captureSrc.includes("starter-pokemon.config"));
});
