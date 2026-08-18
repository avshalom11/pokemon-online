// Focused coverage for Gyms & Leagues Phase 3's NPC battle SESSION
// lifecycle (start/unlock/party-limit/full-HP/abandon) — turn-by-turn
// combat resolution is covered separately in
// gym-battle-action.service.test.ts. Runs the REAL startNpcBattle/
// abandonNpcBattleSession unmodified against the in-memory fake DB (see
// battle-action.service.persistence.test.ts's own header comment for why).
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

async function selectPartyFor(playerId: string, target: Parameters<typeof startNpcBattle>[1]): Promise<string[]> {
  const options = await getGymBattlePartyOptions(playerId, target);
  if (options.status !== "ok") return [];
  return options.options.filter((o) => !o.fainted).slice(0, options.requiredCount).map((o) => o.id);
}

import { deriveGymNpcLevelRange } from "@/features/gyms/config/gym-level-scaling-lookup";
import { getGymNpcTeam } from "@/features/gyms/data/gym-npc-teams";
import { getRegionalChampionTeam } from "@/features/gyms/data/regional-champion-teams";
import { markGymBattleCompleted } from "@/features/gyms/services/gym-progression.service";
import { abandonNpcBattleSession, startNpcBattle, getGymBattlePartyOptions } from "@/features/gyms/services/gym-battle-session.service";
import { deriveSpeciesWildLevelRange } from "@/engine/evolution-stage-scaling/species-wild-level-range";
import { getSpeciesById } from "@/features/pokemon/services/species-catalog";
import { prisma } from "@/lib/db/prisma";
import {
  resetFakeDb,
  seedKnownMove,
  seedPlayerPokemon,
  seedPlayerProfile,
  getNpcBattleSessionRow,
  getGymBattleProgressRow,
} from "../../../test/support/fakes/prisma.fake.ts";

const PLAYER_ID = "owner-1";

beforeEach(() => {
  resetFakeDb();
  // GYMS & LEAGUES PHASE 4 — seeded at exactly MIN_GYM_PLAYER_LEVEL so this
  // file's own Phase 3 gym-order/completion tests keep testing THOSE rules
  // specifically, unaffected by the new Level-10 gate (its own dedicated
  // tests live in gym-access-rules.test.ts).
  seedPlayerProfile({ id: PLAYER_ID, level: 10, experience: 0 });
});

function seedParty(count: number) {
  for (let i = 1; i <= count; i++) {
    const id = `p${i}`;
    seedPlayerPokemon({ id, playerId: PLAYER_ID, speciesId: "charmander", level: 100, currentHp: 100, partySlot: i });
    seedKnownMove({ playerPokemonId: id, moveId: "scratch", slot: 1 });
  }
}

test("Gym 2 cannot start before Gym 1 is fully completed (locked)", async () => {
  seedParty(1);
  const result = await startNpcBattle(PLAYER_ID, { source: "gym", regionId: "kanto", gymNumber: 2, battleSlot: "easy" }, await selectPartyFor(PLAYER_ID, { source: "gym", regionId: "kanto", gymNumber: 2, battleSlot: "easy" }));
  assert.deepEqual(result, { status: "locked" });
});

test("a Gym Leader battle slot cannot start before Easy+Medium are completed (locked)", async () => {
  seedParty(1);
  const result = await startNpcBattle(PLAYER_ID, { source: "gym", regionId: "kanto", gymNumber: 1, battleSlot: "leader" }, await selectPartyFor(PLAYER_ID, { source: "gym", regionId: "kanto", gymNumber: 1, battleSlot: "leader" }));
  assert.deepEqual(result, { status: "locked" });
});

test("an already-completed battle cannot be replayed", async () => {
  seedParty(1);
  await prisma.$transaction(async (tx) => {
    await markGymBattleCompleted(tx, PLAYER_ID, "kanto", 1, "easy");
  });

  const result = await startNpcBattle(PLAYER_ID, { source: "gym", regionId: "kanto", gymNumber: 1, battleSlot: "easy" }, await selectPartyFor(PLAYER_ID, { source: "gym", regionId: "kanto", gymNumber: 1, battleSlot: "easy" }));
  assert.deepEqual(result, { status: "already-completed" });
});

test("Regional Champion is locked before all 3 Badges are earned, and unlocks once they are", async () => {
  seedParty(1);

  const stillLocked = await startNpcBattle(PLAYER_ID, { source: "regional-champion", regionId: "kanto" }, await selectPartyFor(PLAYER_ID, { source: "regional-champion", regionId: "kanto" }));
  assert.deepEqual(stillLocked, { status: "locked" });

  await prisma.$transaction(async (tx) => {
    await markGymBattleCompleted(tx, PLAYER_ID, "kanto", 1, "leader");
    await markGymBattleCompleted(tx, PLAYER_ID, "kanto", 2, "leader");
    await markGymBattleCompleted(tx, PLAYER_ID, "kanto", 3, "leader");
  });

  const nowUnlocked = await startNpcBattle(PLAYER_ID, { source: "regional-champion", regionId: "kanto" }, await selectPartyFor(PLAYER_ID, { source: "regional-champion", regionId: "kanto" }));
  assert.equal(nowUnlocked.status, "started");
});

test("the correct fixed NPC team (Phase 2) is loaded, unmodified", async () => {
  seedParty(1);
  const result = await startNpcBattle(PLAYER_ID, { source: "gym", regionId: "kanto", gymNumber: 1, battleSlot: "easy" }, await selectPartyFor(PLAYER_ID, { source: "gym", regionId: "kanto", gymNumber: 1, battleSlot: "easy" }));
  assert.equal(result.status, "started");
  if (result.status !== "started") return;

  const expectedTeam = getGymNpcTeam("kanto", 1, "easy")!;
  const storedTeam = result.session.npcTeam as unknown as { speciesId: string; level: number }[];
  assert.deepEqual(
    storedTeam.map((m) => m.speciesId),
    expectedTeam.members.map((m) => m.speciesId)
  );
});

test("NPC levels are resolved only from Gym scaling — never from evolution-stage legality", async () => {
  seedParty(1);
  const result = await startNpcBattle(PLAYER_ID, { source: "gym", regionId: "kanto", gymNumber: 1, battleSlot: "leader" }, await selectPartyFor(PLAYER_ID, { source: "gym", regionId: "kanto", gymNumber: 1, battleSlot: "leader" }), () => 0);
  // Leader locked — Easy/Medium not completed yet (this PLAYER_ID is
  // already seeded at MIN_GYM_PLAYER_LEVEL, so this is purely the
  // within-Gym-order lock, not the Level-10 gate).
  assert.equal(result.status, "locked");

  await prisma.$transaction(async (tx) => {
    await markGymBattleCompleted(tx, PLAYER_ID, "kanto", 1, "easy");
    await markGymBattleCompleted(tx, PLAYER_ID, "kanto", 1, "medium");
  });

  const started = await startNpcBattle(PLAYER_ID, { source: "gym", regionId: "kanto", gymNumber: 1, battleSlot: "leader" }, await selectPartyFor(PLAYER_ID, { source: "gym", regionId: "kanto", gymNumber: 1, battleSlot: "leader" }), () => 0);
  assert.equal(started.status, "started");
  if (started.status !== "started") return;

  const gymRange = deriveGymNpcLevelRange(10, "hard");
  const storedTeam = started.session.npcTeam as unknown as { speciesId: string; level: number }[];

  for (const member of storedTeam) {
    // Every resolved level must fall within the Gym scaling range alone —
    // section 3.
    assert.ok(member.level >= gymRange.minLevel && member.level <= gymRange.maxLevel, `${member.speciesId} level ${member.level} outside Gym range ${gymRange.minLevel}-${gymRange.maxLevel}`);

    // And must NOT have been clamped/replaced to satisfy
    // deriveSpeciesWildLevelRange — the approved design explicitly allows
    // a resolved level below a species' own evolution-legal minimum (the
    // "Level-1 player may face a low-level Venusaur" example).
    const legalRange = deriveSpeciesWildLevelRange(member.speciesId);
    if (legalRange.minimumLevel > gymRange.maxLevel) {
      assert.ok(member.level < legalRange.minimumLevel, `expected ${member.speciesId} to demonstrate the ignored-legality case`);
    }
  }
});

test("resolved NPC levels stay fixed for the whole attempt — never rerolled turn to turn", async () => {
  seedParty(1);
  const started = await startNpcBattle(PLAYER_ID, { source: "gym", regionId: "kanto", gymNumber: 1, battleSlot: "easy" }, await selectPartyFor(PLAYER_ID, { source: "gym", regionId: "kanto", gymNumber: 1, battleSlot: "easy" }));
  assert.equal(started.status, "started");
  if (started.status !== "started") return;

  const initialTeam = JSON.stringify(started.session.npcTeam);
  const row = getNpcBattleSessionRow(PLAYER_ID)!;
  assert.equal(JSON.stringify(row.npcTeam), initialTeam);
});

test("Easy uses at most 3 of the player's current party, in slot order", async () => {
  seedParty(5);
  const result = await startNpcBattle(PLAYER_ID, { source: "gym", regionId: "kanto", gymNumber: 1, battleSlot: "easy" }, await selectPartyFor(PLAYER_ID, { source: "gym", regionId: "kanto", gymNumber: 1, battleSlot: "easy" }));
  assert.equal(result.status, "started");
  if (result.status !== "started") return;
  const ids = result.session.playerPokemonIds as unknown as string[];
  assert.deepEqual(ids, ["p1", "p2", "p3"]);
});

test("Medium uses at most 4 of the player's current party", async () => {
  seedParty(5);
  await prisma.$transaction(async (tx) => {
    await markGymBattleCompleted(tx, PLAYER_ID, "kanto", 1, "easy");
  });
  const result = await startNpcBattle(PLAYER_ID, { source: "gym", regionId: "kanto", gymNumber: 1, battleSlot: "medium" }, await selectPartyFor(PLAYER_ID, { source: "gym", regionId: "kanto", gymNumber: 1, battleSlot: "medium" }));
  assert.equal(result.status, "started");
  if (result.status !== "started") return;
  assert.equal((result.session.playerPokemonIds as unknown as string[]).length, 4);
});

test("Gym Leader / Regional Champion use at most 6 of the player's current party", async () => {
  seedParty(8);
  await prisma.$transaction(async (tx) => {
    await markGymBattleCompleted(tx, PLAYER_ID, "kanto", 1, "easy");
    await markGymBattleCompleted(tx, PLAYER_ID, "kanto", 1, "medium");
  });
  const result = await startNpcBattle(PLAYER_ID, { source: "gym", regionId: "kanto", gymNumber: 1, battleSlot: "leader" }, await selectPartyFor(PLAYER_ID, { source: "gym", regionId: "kanto", gymNumber: 1, battleSlot: "leader" }));
  assert.equal(result.status, "started");
  if (result.status !== "started") return;
  assert.equal((result.session.playerPokemonIds as unknown as string[]).length, 6);
});

// HP PERSISTENCE RULE CHANGE (later task, section 8) — this OVERRIDES the
// old Phase 3/4 "always full battle-local HP" rule: a Gym/Regional Champion
// battle now seeds battle-local HP from the participant's REAL, current
// (possibly damaged) PlayerPokemon.currentHp, and never auto-heals it.
test("a participating Pokémon starts at its REAL current HP, not full HP — the old always-full-HP rule no longer applies", async () => {
  seedPlayerPokemon({ id: "p1", playerId: PLAYER_ID, speciesId: "charmander", level: 100, currentHp: 37, partySlot: 1 });
  seedKnownMove({ playerPokemonId: "p1", moveId: "scratch", slot: 1 });

  const result = await startNpcBattle(PLAYER_ID, { source: "gym", regionId: "kanto", gymNumber: 1, battleSlot: "easy" }, await selectPartyFor(PLAYER_ID, { source: "gym", regionId: "kanto", gymNumber: 1, battleSlot: "easy" }));
  assert.equal(result.status, "started");
  if (result.status !== "started") return;

  const battleHp = result.session.playerBattleHp as unknown as Record<string, number>;
  assert.equal(battleHp.p1, 37);

  // The real PlayerPokemon row's HP is the actual source of the seeded
  // battle-local value above — unaffected by starting the battle itself.
  const { getPlayerPokemonRow } = await import("../../../test/support/fakes/prisma.fake.ts");
  assert.equal(getPlayerPokemonRow("p1")?.currentHp, 37);
});

// A fully-healthy Pokémon's real and battle-local HP are simply the same
// number — this is not a special case, just the natural result of seeding
// from real HP when real HP already happens to be full.
test("a fully-healthy participating Pokémon's battle-local HP equals its real (full) HP", async () => {
  const species = getSpeciesById("charmander")!;
  const { calculatePokemonStats } = await import("@/engine/battle/pokemon-stat-calculations");
  const expectedMaxHp = calculatePokemonStats({ baseStats: species.baseStats, level: 100 }).maxHp;

  seedPlayerPokemon({ id: "p1", playerId: PLAYER_ID, speciesId: "charmander", level: 100, currentHp: expectedMaxHp, partySlot: 1 });
  seedKnownMove({ playerPokemonId: "p1", moveId: "scratch", slot: 1 });

  const result = await startNpcBattle(PLAYER_ID, { source: "gym", regionId: "kanto", gymNumber: 1, battleSlot: "easy" }, await selectPartyFor(PLAYER_ID, { source: "gym", regionId: "kanto", gymNumber: 1, battleSlot: "easy" }));
  assert.equal(result.status, "started");
  if (result.status !== "started") return;

  const battleHp = result.session.playerBattleHp as unknown as Record<string, number>;
  assert.equal(battleHp.p1, expectedMaxHp);
});

test("the NPC team's first Pokémon starts at its own full HP", async () => {
  seedParty(1);
  const result = await startNpcBattle(PLAYER_ID, { source: "gym", regionId: "kanto", gymNumber: 1, battleSlot: "easy" }, await selectPartyFor(PLAYER_ID, { source: "gym", regionId: "kanto", gymNumber: 1, battleSlot: "easy" }));
  assert.equal(result.status, "started");
  if (result.status !== "started") return;

  const firstNpc = (result.session.npcTeam as unknown as { speciesId: string; level: number }[])[0];
  const species = getSpeciesById(firstNpc.speciesId)!;
  const { calculatePokemonStats } = await import("@/engine/battle/pokemon-stat-calculations");
  const expectedMaxHp = calculatePokemonStats({ baseStats: species.baseStats, level: firstNpc.level }).maxHp;
  assert.equal(result.session.npcCurrentHp, expectedMaxHp);
});

test("abandoning an in-progress battle deletes the session and marks no completion", async () => {
  seedParty(1);
  const started = await startNpcBattle(PLAYER_ID, { source: "gym", regionId: "kanto", gymNumber: 1, battleSlot: "easy" }, await selectPartyFor(PLAYER_ID, { source: "gym", regionId: "kanto", gymNumber: 1, battleSlot: "easy" }));
  assert.equal(started.status, "started");

  await abandonNpcBattleSession(PLAYER_ID);

  assert.equal(getNpcBattleSessionRow(PLAYER_ID), undefined);
  assert.equal(getGymBattleProgressRow(PLAYER_ID, "kanto", 1, "easy"), undefined);
});

test("Regional Champion team is loaded from Phase 2 (getRegionalChampionTeam), not re-selected", async () => {
  seedParty(1);
  await prisma.$transaction(async (tx) => {
    await markGymBattleCompleted(tx, PLAYER_ID, "kanto", 1, "leader");
    await markGymBattleCompleted(tx, PLAYER_ID, "kanto", 2, "leader");
    await markGymBattleCompleted(tx, PLAYER_ID, "kanto", 3, "leader");
  });

  const result = await startNpcBattle(PLAYER_ID, { source: "regional-champion", regionId: "kanto" }, await selectPartyFor(PLAYER_ID, { source: "regional-champion", regionId: "kanto" }));
  assert.equal(result.status, "started");
  if (result.status !== "started") return;

  const expected = getRegionalChampionTeam("kanto")!;
  const storedTeam = result.session.npcTeam as unknown as { speciesId: string }[];
  assert.deepEqual(
    storedTeam.map((m) => m.speciesId),
    expected.members.map((m) => m.speciesId)
  );
});
