// GYM VICTORY SOUND — LEADER/CHAMPION ONLY — focused coverage.
//
// The UI-side guard (GymBattleContent.tsx) is source-checked only (no
// React-render/DOM harness in this project — the established convention
// every other *-boundary.test.ts file here already follows). What IS
// directly, behaviorally runnable is the AUTHORITATIVE signal that guard
// reads: outcome.reward, which is `result.reward ?? null` off the real
// executeGymBattleAction response — so the four required cases (1-4) are
// proven here by running the REAL battle-to-victory flow for each battle
// slot and asserting reward is present/absent exactly as the sound rule
// requires, tying the ticket's own four scenarios directly to the same
// data the component's sound-gating condition reads.
import assert from "node:assert/strict";
import fs from "node:fs";
import { test, beforeEach } from "node:test";

import { executeGymBattleAction } from "@/features/gyms/services/gym-battle-action.service";
import { startNpcBattle, getGymBattlePartyOptions, type StartNpcBattleTarget } from "@/features/gyms/services/gym-battle-session.service";
import { markGymBattleCompleted } from "@/features/gyms/services/gym-progression.service";
import { prisma } from "@/lib/db/prisma";
import { resetFakeDb, seedKnownMove, seedPlayerPokemon, seedPlayerProfile } from "../../test/support/fakes/prisma.fake.ts";

const PLAYER_ID = "owner-1";
const MAX_ROLL = () => 0.999999;

beforeEach(() => {
  resetFakeDb();
  seedPlayerProfile({ id: PLAYER_ID, level: 10, experience: 0 });
});

function seedOverwhelmingPlayer() {
  seedPlayerPokemon({ id: "p1", playerId: PLAYER_ID, speciesId: "charmander", level: 100, currentHp: 100, partySlot: 1 });
  seedKnownMove({ playerPokemonId: "p1", moveId: "scratch", slot: 1 });
}

async function selectPartyFor(target: StartNpcBattleTarget): Promise<string[]> {
  const options = await getGymBattlePartyOptions(PLAYER_ID, target);
  if (options.status !== "ok") return [];
  return options.options.filter((o) => !o.fainted).slice(0, options.requiredCount).map((o) => o.id);
}

async function winBattle(target: StartNpcBattleTarget, turns: number) {
  const started = await startNpcBattle(PLAYER_ID, target, await selectPartyFor(target));
  assert.equal(started.status, "started");
  let final;
  for (let i = 0; i < turns; i++) final = await executeGymBattleAction(PLAYER_ID, "scratch", MAX_ROLL);
  return final as { victoryCompleted: boolean; reward?: unknown };
}

// 1. Easy victory: no victory sound — reward must be absent, the exact
// signal GymBattleContent's own guard (outcome.reward !== null, where
// outcome.reward is `result.reward ?? null`) reads.
test("1: Easy victory carries no reward — the sound-gating signal is absent, so no victory sound plays", async () => {
  seedOverwhelmingPlayer();
  const result = await winBattle({ source: "gym", regionId: "kanto", gymNumber: 1, battleSlot: "easy" }, 3);
  assert.equal(result.victoryCompleted, true);
  assert.equal(result.reward, undefined, "Easy must never carry a reward — this is what keeps victory sound silent for it");
});

// 2. Medium victory: no victory sound.
test("2: Medium victory carries no reward — the sound-gating signal is absent, so no victory sound plays", async () => {
  seedOverwhelmingPlayer();
  await prisma.$transaction((tx) => markGymBattleCompleted(tx, PLAYER_ID, "kanto", 1, "easy"));
  const result = await winBattle({ source: "gym", regionId: "kanto", gymNumber: 1, battleSlot: "medium" }, 4);
  assert.equal(result.victoryCompleted, true);
  assert.equal(result.reward, undefined, "Medium must never carry a reward — this is what keeps victory sound silent for it");
});

// 3. Gym Leader victory: victory sound plays once — a real reward
// (Badge-granting) is present.
test("3: Gym Leader victory carries a real reward (the Badge grant) — the sound-gating signal is present, so victory sound plays", async () => {
  seedOverwhelmingPlayer();
  await prisma.$transaction(async (tx) => {
    await markGymBattleCompleted(tx, PLAYER_ID, "kanto", 1, "easy");
    await markGymBattleCompleted(tx, PLAYER_ID, "kanto", 1, "medium");
  });
  const result = await winBattle({ source: "gym", regionId: "kanto", gymNumber: 1, battleSlot: "leader" }, 6);
  assert.equal(result.victoryCompleted, true);
  assert.ok(result.reward, "Gym Leader must always carry a real reward — this is what plays victory sound for it");
  assert.equal((result.reward as { badgeId?: string }).badgeId, "kanto-gym-1");
});

// 4. Regional Champion victory: victory sound plays once — a real reward
// (Medal-granting) is present.
test("4: Regional Champion victory carries a real reward (the Medal grant) — the sound-gating signal is present, so victory sound plays", async () => {
  seedOverwhelmingPlayer();
  await prisma.$transaction(async (tx) => {
    await markGymBattleCompleted(tx, PLAYER_ID, "kanto", 1, "leader");
    await markGymBattleCompleted(tx, PLAYER_ID, "kanto", 2, "leader");
    await markGymBattleCompleted(tx, PLAYER_ID, "kanto", 3, "leader");
  });
  const result = await winBattle({ source: "regional-champion", regionId: "kanto" }, 6);
  assert.equal(result.victoryCompleted, true);
  assert.ok(result.reward, "Regional Champion must always carry a real reward — this is what plays victory sound for it");
  assert.equal((result.reward as { medalId?: string }).medalId, "kanto-medal");
});

// The actual UI-side gate (source-level — no DOM harness in this project).
test("(source) GymBattleContent only plays victory.mp3 when outcome.reward is non-null — the exact same authoritative signal used to choose which victory dialog renders, never inferred from trainerName/UI text", () => {
  const src = fs.readFileSync("features/gyms/components/GymBattleContent.tsx", "utf8");
  assert.ok(
    src.includes('outcome?.kind === "victory" && outcome.reward !== null && playedResultSoundRef.current !== "victory"'),
    "the victory-sound guard must require a real reward, not just any victory outcome"
  );
  // The exact same field already decides which dialog renders — proves
  // this isn't a second/duplicated concept of "is this Leader/Champion".
  assert.ok(src.includes("return outcome.reward ? ("), "the dialog-selection branch must read the SAME outcome.reward field the sound guard now also reads");
  // Never hardcoded on trainer name or any Hebrew UI label.
  assert.ok(!/outcome\.reward[\s\S]{0,80}trainerName/.test(src.slice(src.indexOf("playedResultSoundRef"), src.indexOf("playedResultSoundRef") + 400)));
});

test("(source) defeat sound is completely unaffected — it never checked reward and still fires for every loss", () => {
  const src = fs.readFileSync("features/gyms/components/GymBattleContent.tsx", "utf8");
  assert.ok(src.includes('outcome?.kind === "defeat" && playedResultSoundRef.current !== "defeat"'), "the defeat-sound guard must be unchanged");
});
