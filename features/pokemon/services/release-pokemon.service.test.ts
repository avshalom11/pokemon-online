// RELEASE POKÉMON — real service + fake DB, same convention every other
// persistence-layer test in this codebase already establishes. No test
// file existed for this service before — covers its existing guards once
// each, plus (this task's own focus) the new "in-daycare" guard added
// alongside DAYCARE — HIDE DEPOSITED POKÉMON + PROTECT FROM REMOVAL.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { releasePokemon } from "@/features/pokemon/services/release-pokemon.service";
import {
  getPlayerPokemonRow,
  resetFakeDb,
  seedDaycareStay,
  seedFieldBattleSession,
  seedMarketplaceListing,
  seedMarketplaceListingPokemon,
  seedPlayerPokemon,
  seedPlayerProfile,
} from "../../../test/support/fakes/prisma.fake.ts";

const PLAYER_ID = "player-a";

beforeEach(() => {
  resetFakeDb();
  seedPlayerProfile({ id: PLAYER_ID, displayName: "אביב" });
});

test("releasing an unowned/nonexistent Pokémon is rejected", async () => {
  const result = await releasePokemon(PLAYER_ID, "does-not-exist");
  assert.deepEqual(result, { status: "not-owned" });
});

test("releasing a Pokémon another player owns is rejected", async () => {
  seedPlayerProfile({ id: "player-b", displayName: "נועה" });
  seedPlayerPokemon({ id: "theirs", playerId: "player-b", speciesId: "pidgey" });

  const result = await releasePokemon(PLAYER_ID, "theirs");
  assert.deepEqual(result, { status: "not-owned" });
});

test("a Pokémon currently in the active party is rejected", async () => {
  seedPlayerPokemon({ id: "extra", playerId: PLAYER_ID, speciesId: "rattata" });
  seedPlayerPokemon({ id: "in-party", playerId: PLAYER_ID, speciesId: "pidgey", partySlot: 1 });

  const result = await releasePokemon(PLAYER_ID, "in-party");
  assert.deepEqual(result, { status: "in-party" });
});

test("a Pokémon currently mid-battle is rejected", async () => {
  seedPlayerPokemon({ id: "extra", playerId: PLAYER_ID, speciesId: "rattata" });
  seedPlayerPokemon({ id: "battling", playerId: PLAYER_ID, speciesId: "pidgey" });
  seedFieldBattleSession({
    playerId: PLAYER_ID,
    zoneId: "grassland",
    wildSpeciesId: "rattata",
    wildLevel: 3,
    wildCurrentHp: 10,
    wildMaxHp: 10,
    activePlayerPokemonId: "battling",
  });

  const result = await releasePokemon(PLAYER_ID, "battling");
  assert.deepEqual(result, { status: "in-battle" });
});

test("DAYCARE — a Pokémon currently deposited in Daycare is rejected, and the release never touches the deposit row", async () => {
  seedPlayerPokemon({ id: "extra", playerId: PLAYER_ID, speciesId: "rattata" });
  seedPlayerPokemon({ id: "deposited", playerId: PLAYER_ID, speciesId: "pidgey" });
  seedDaycareStay({ playerPokemonId: "deposited", playerId: PLAYER_ID, startingLevel: 5 });

  const result = await releasePokemon(PLAYER_ID, "deposited");

  assert.deepEqual(result, { status: "in-daycare" });
  // The Pokémon row itself must still exist — release must reject BEFORE
  // ever attempting the delete, never partially succeed.
  assert.ok(getPlayerPokemonRow("deposited"), "the deposited Pokémon must still exist after a rejected release");
});

test("DAYCARE — once collected (the PlayerDaycareStay row is gone), the same Pokémon can be released normally again", async () => {
  seedPlayerPokemon({ id: "extra", playerId: PLAYER_ID, speciesId: "rattata" });
  seedPlayerPokemon({ id: "was-deposited", playerId: PLAYER_ID, speciesId: "pidgey" });
  seedDaycareStay({ playerPokemonId: "was-deposited", playerId: PLAYER_ID, startingLevel: 5 });

  const blocked = await releasePokemon(PLAYER_ID, "was-deposited");
  assert.deepEqual(blocked, { status: "in-daycare" });

  const { prisma } = await import("@/lib/db/prisma");
  await prisma.playerDaycareStay.deleteMany({ where: { playerPokemonId: "was-deposited" } });

  const result = await releasePokemon(PLAYER_ID, "was-deposited");
  assert.deepEqual(result, { status: "released" });
  assert.equal(getPlayerPokemonRow("was-deposited"), undefined);
});

test("MARKETPLACE PHASE 7 — a Pokémon currently locked into a listing is rejected, and the release never touches the listing lock", async () => {
  seedPlayerPokemon({ id: "extra", playerId: PLAYER_ID, speciesId: "rattata" });
  seedPlayerPokemon({ id: "listed", playerId: PLAYER_ID, speciesId: "pidgey" });
  const listing = seedMarketplaceListing({ sellerId: PLAYER_ID });
  seedMarketplaceListingPokemon({ playerPokemonId: "listed", listingId: listing.id });

  const result = await releasePokemon(PLAYER_ID, "listed");

  assert.deepEqual(result, { status: "marketplace-listed" });
  assert.ok(getPlayerPokemonRow("listed"), "the listed Pokémon must still exist after a rejected release");
});

test("the player's last remaining Pokémon is rejected, even the last one that happens to be free (not in-party/battle/Daycare)", async () => {
  seedPlayerPokemon({ id: "only-one", playerId: PLAYER_ID, speciesId: "pidgey" });

  const result = await releasePokemon(PLAYER_ID, "only-one");
  assert.deepEqual(result, { status: "last-pokemon" });
});

test("a genuinely free, non-last Pokémon is released successfully and the row is actually deleted", async () => {
  seedPlayerPokemon({ id: "keep", playerId: PLAYER_ID, speciesId: "rattata" });
  seedPlayerPokemon({ id: "release-me", playerId: PLAYER_ID, speciesId: "pidgey" });

  const result = await releasePokemon(PLAYER_ID, "release-me");

  assert.deepEqual(result, { status: "released" });
  assert.equal(getPlayerPokemonRow("release-me"), undefined);
  assert.ok(getPlayerPokemonRow("keep"));
});
