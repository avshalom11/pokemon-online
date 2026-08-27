// PARTY MANAGEMENT — real service + fake DB, same convention every other
// persistence-layer test in this codebase already establishes. No test file
// existed for this service before — covers assignToPartySlot's existing
// guards once each, plus (this task's own focus) the new
// "marketplace-listed" guard added for MARKETPLACE PHASE 7 (hardening).
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { assignToPartySlot } from "@/features/party/services/party-management.service";
import {
  getPlayerPokemonRow,
  resetFakeDb,
  seedDaycareStay,
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

test("assigning an unowned/nonexistent Pokémon is rejected", async () => {
  const result = await assignToPartySlot(PLAYER_ID, "does-not-exist", 1);
  assert.deepEqual(result, { status: "not-owned" });
});

test("assigning a Pokémon another player owns is rejected", async () => {
  seedPlayerProfile({ id: "player-b", displayName: "נועה" });
  seedPlayerPokemon({ id: "theirs", playerId: "player-b", speciesId: "pidgey" });

  const result = await assignToPartySlot(PLAYER_ID, "theirs", 1);
  assert.deepEqual(result, { status: "not-owned" });
});

test("a Pokémon currently deposited in Daycare is rejected", async () => {
  seedPlayerPokemon({ id: "deposited", playerId: PLAYER_ID, speciesId: "pidgey" });
  seedDaycareStay({ playerPokemonId: "deposited", playerId: PLAYER_ID, startingLevel: 5 });

  const result = await assignToPartySlot(PLAYER_ID, "deposited", 1);
  assert.deepEqual(result, { status: "in-daycare" });
});

test("MARKETPLACE PHASE 7 — a Pokémon currently locked into a listing is rejected, and the assignment never touches partySlot", async () => {
  seedPlayerPokemon({ id: "listed", playerId: PLAYER_ID, speciesId: "pidgey" });
  const listing = seedMarketplaceListing({ sellerId: PLAYER_ID });
  seedMarketplaceListingPokemon({ playerPokemonId: "listed", listingId: listing.id });

  const result = await assignToPartySlot(PLAYER_ID, "listed", 1);

  assert.deepEqual(result, { status: "marketplace-listed" });
  assert.equal(getPlayerPokemonRow("listed")?.partySlot, null);
});

test("a genuinely free Pokémon is assigned successfully", async () => {
  seedPlayerPokemon({ id: "free", playerId: PLAYER_ID, speciesId: "pidgey" });

  const result = await assignToPartySlot(PLAYER_ID, "free", 1);

  assert.deepEqual(result, { status: "ok" });
  assert.equal(getPlayerPokemonRow("free")?.partySlot, 1);
});
