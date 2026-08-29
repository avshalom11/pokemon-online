// BATTLE UI — TYPE DISPLAY. `BattleParticipantDisplay.types` is optional
// (so any caller without species data on hand still compiles), which means
// TypeScript alone would never catch a caller silently dropping it. This
// guards each real call site — field battle, Gym/Regional Champion battle,
// and League PvP — so all three keep sourcing types from the Pokémon's own
// canonical species data, never a hardcoded/omitted value.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("Field Battle (BattleContent.tsx): both enemy and player pass their own species' real types through to BattleScene", () => {
  const source = readFileSync(new URL("../../features/battle/components/BattleContent.tsx", import.meta.url), "utf8");
  assert.ok(source.includes("types: wildState.pokemon.types,"), "enemy (wild) must source types from its own species");
  assert.ok(source.includes("types: activePokemon.species.types,"), "player must source types from its own active species");
});

test("Gym/Regional Champion Battle: the view service exposes real species types, and GymBattleContent forwards them", () => {
  const serviceSource = readFileSync(new URL("../../features/gyms/services/gym-battle-view.service.ts", import.meta.url), "utf8");
  assert.ok(serviceSource.includes("types: npcSpecies.types,"), "the NPC's view data must source types from its own species");
  assert.ok(serviceSource.includes("types: activePokemon.species.types,"), "the player's view data must source types from its own active species");

  const contentSource = readFileSync(new URL("../../features/gyms/components/GymBattleContent.tsx", import.meta.url), "utf8");
  assert.ok(contentSource.includes("types: data.npc.types,"));
  assert.ok(contentSource.includes("types: data.player.types,"));
});

test("League PvP: the view service exposes the active Pokémon's real species types, and LeagueMatchContent forwards them", () => {
  const serviceSource = readFileSync(new URL("../../features/leagues/services/league-battle-view.service.ts", import.meta.url), "utf8");
  assert.ok(serviceSource.includes("activeTypes: activeSpecies?.types ?? [],"), "the active side's view data must source types from its own resolved species");

  const contentSource = readFileSync(new URL("../../features/leagues/components/LeagueMatchContent.tsx", import.meta.url), "utf8");
  assert.ok(contentSource.includes("types: data.opponent.activeTypes,"));
  assert.ok(contentSource.includes("types: data.self.activeTypes,"));
});
