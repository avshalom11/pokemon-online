// TM SYSTEM UI POLISH focused coverage for the read-only info action.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { getTmInfoAction } from "./tm-info.actions.ts";
import { __setSession } from "../../../test/support/fakes/auth-session.fake.ts";
import { resetFakeDb, seedPlayerPokemon } from "../../../test/support/fakes/prisma.fake.ts";

beforeEach(() => {
  resetFakeDb();
  __setSession({ user: { id: "owner-1" } });
});

test("getTmInfoAction returns the move info and compatible Pokémon end to end", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: "owner-1", speciesId: "pikachu" });

  const result = await getTmInfoAction("tm-thunderbolt");

  assert.equal(result.status, "ok");
  if (result.status !== "ok") return;
  assert.equal(result.moveName, "Thunderbolt");
  assert.equal(result.compatiblePokemon.length, 1);
});

test("getTmInfoAction rejects when there is no authenticated session", async () => {
  __setSession(null);
  const result = await getTmInfoAction("tm-thunderbolt");
  assert.deepEqual(result, { status: "error" });
});
