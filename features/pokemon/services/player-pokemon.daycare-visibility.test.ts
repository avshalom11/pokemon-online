// DAYCARE — HIDE DEPOSITED POKÉMON + PROTECT FROM REMOVAL. Real service +
// fake DB, same convention every other persistence-layer test in this
// codebase already establishes. Covers: getAllOwnedPokemon (My Pokémon /
// evolution-item panel / league+gym team builder shared source) excluding
// a currently-deposited Pokémon, and it reappearing automatically the
// instant its PlayerDaycareStay row is gone — the exact effect a real
// collectFromDaycare produces (features/daycare/services/daycare.service.ts's
// own tx.playerDaycareStay.deleteMany), covered end-to-end for cost/XP/
// progression by features/daycare/daycare.test.ts already; this file only
// needs to prove getAllOwnedPokemon itself reacts to that row's presence,
// never a separate "un-hide" step.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { getAllOwnedPokemon, getOwnedPokemonStats } from "@/features/pokemon/services/player-pokemon";
import { prisma } from "@/lib/db/prisma";
import { resetFakeDb, seedDaycareStay, seedPlayerPokemon, seedPlayerProfile } from "../../../test/support/fakes/prisma.fake.ts";

const PLAYER_ID = "player-a";

beforeEach(() => {
  resetFakeDb();
  seedPlayerProfile({ id: PLAYER_ID, displayName: "אביב" });
});

test("a Pokémon currently deposited in Daycare is excluded from getAllOwnedPokemon — the shared source for My Pokémon, the evolution-item panel, and the league/gym team builders — while every other owned Pokémon still shows normally", async () => {
  seedPlayerPokemon({ id: "starter", playerId: PLAYER_ID, speciesId: "bulbasaur", isStarter: true, partySlot: 1 });
  seedPlayerPokemon({ id: "deposited", playerId: PLAYER_ID, speciesId: "pidgey" });
  seedPlayerPokemon({ id: "other", playerId: PLAYER_ID, speciesId: "rattata" });
  seedDaycareStay({ playerPokemonId: "deposited", playerId: PLAYER_ID, startingLevel: 5 });

  const owned = await getAllOwnedPokemon(PLAYER_ID);
  const ids = owned.map((pokemon) => pokemon.id);

  assert.ok(!ids.includes("deposited"), "a currently-deposited Pokémon must never appear");
  assert.ok(ids.includes("starter"));
  assert.ok(ids.includes("other"));
  assert.equal(owned.length, 2);
});

test("a Pokémon deposited by ANOTHER player is never hidden from this player's own list — the exclusion is scoped per-stay, never a blanket 'any deposited Pokémon anywhere'", async () => {
  seedPlayerProfile({ id: "player-b", displayName: "נועה" });
  seedPlayerPokemon({ id: "mine", playerId: PLAYER_ID, speciesId: "pidgey" });
  seedPlayerPokemon({ id: "theirs-deposited", playerId: "player-b", speciesId: "rattata" });
  seedDaycareStay({ playerPokemonId: "theirs-deposited", playerId: "player-b", startingLevel: 5 });

  const owned = await getAllOwnedPokemon(PLAYER_ID);
  assert.equal(owned.length, 1);
  assert.equal(owned[0].id, "mine");
});

test("after collection (the PlayerDaycareStay row is gone), the Pokémon automatically reappears — getAllOwnedPokemon needs no separate un-hide step", async () => {
  seedPlayerPokemon({ id: "deposited", playerId: PLAYER_ID, speciesId: "pidgey" });
  seedDaycareStay({ playerPokemonId: "deposited", playerId: PLAYER_ID, startingLevel: 5 });

  const whileDeposited = await getAllOwnedPokemon(PLAYER_ID);
  assert.ok(!whileDeposited.some((pokemon) => pokemon.id === "deposited"));

  await prisma.playerDaycareStay.deleteMany({ where: { playerPokemonId: "deposited" } });

  const afterCollection = await getAllOwnedPokemon(PLAYER_ID);
  assert.ok(afterCollection.some((pokemon) => pokemon.id === "deposited"), "must reappear automatically once the stay is gone");
});

test("a deposited Pokémon still counts toward ownership stats (getOwnedPokemonStats) — it remains genuinely owned, only hidden from management surfaces", async () => {
  seedPlayerPokemon({ id: "deposited", playerId: PLAYER_ID, speciesId: "pidgey" });
  seedDaycareStay({ playerPokemonId: "deposited", playerId: PLAYER_ID, startingLevel: 5 });

  const stats = await getOwnedPokemonStats(PLAYER_ID);
  assert.equal(stats.totalCaught, 1);
});
