// Phase 7 — a small, focused test for the one battle-session.service.ts
// behavior this phase actually changes: a voluntary switch is rejected
// while the active Pokémon is trapped, but a forced replacement (after
// fainting) always goes through regardless.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { syncActivePokemon } from "@/features/battle-session/services/battle-session.service";
import { resetFakeDb, seedFieldBattleSession, seedPlayerPokemon, seedPlayerProfile, getFieldBattleSessionRow } from "../../../test/support/fakes/prisma.fake.ts";

beforeEach(() => {
  resetFakeDb();
});

test("a voluntary switch is rejected while trapped, but a forced replacement still switches", async () => {
  seedPlayerProfile({ id: "owner-1" });
  seedPlayerPokemon({ id: "p1", playerId: "owner-1", partySlot: 1 });
  seedPlayerPokemon({ id: "p2", playerId: "owner-1", partySlot: 2 });
  seedFieldBattleSession({
    playerId: "owner-1",
    zoneId: "grassland",
    wildSpeciesId: "bulbasaur",
    wildLevel: 5,
    wildCurrentHp: 20,
    wildMaxHp: 20,
    activePlayerPokemonId: "p1",
    playerVolatileState: { trapping: { source: "enemy", turnsRemaining: 3 } },
  });

  const voluntary = await syncActivePokemon("owner-1", "p2");
  assert.equal(voluntary.status, "trapped");
  assert.equal(getFieldBattleSessionRow("owner-1")?.activePlayerPokemonId, "p1", "the trapped switch must never persist");

  const forced = await syncActivePokemon("owner-1", "p2", { force: true });
  assert.equal(forced.status, "ok");
  assert.equal(getFieldBattleSessionRow("owner-1")?.activePlayerPokemonId, "p2");
});
