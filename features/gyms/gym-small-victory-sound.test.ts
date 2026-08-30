// GYM SMALL VICTORY SOUND — FOCUSED CHANGE — focused coverage for the
// final 4-case mapping. Same split as the prior "LEADER/CHAMPION ONLY"
// task's own test file: the authoritative signal (outcome.reward, derived
// from the REAL executeGymBattleAction response) is proven behaviorally
// for all 4 cases here; the UI-side sound selection itself is
// source-checked (no React-render/DOM harness in this project).
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

// Easy win -> small_victory.mp3 (no reward -> outcome.reward === null ->
// the "small-victory" branch).
test("Easy win: no reward -> small_victory.mp3 branch", async () => {
  seedOverwhelmingPlayer();
  const result = await winBattle({ source: "gym", regionId: "kanto", gymNumber: 1, battleSlot: "easy" }, 3);
  assert.equal(result.victoryCompleted, true);
  assert.equal(result.reward, undefined);
});

// Medium win -> small_victory.mp3.
test("Medium win: no reward -> small_victory.mp3 branch", async () => {
  seedOverwhelmingPlayer();
  await prisma.$transaction((tx) => markGymBattleCompleted(tx, PLAYER_ID, "kanto", 1, "easy"));
  const result = await winBattle({ source: "gym", regionId: "kanto", gymNumber: 1, battleSlot: "medium" }, 4);
  assert.equal(result.victoryCompleted, true);
  assert.equal(result.reward, undefined);
});

// Gym Leader win -> victory.mp3 (real reward -> "victory" branch).
test("Gym Leader win: real reward (Badge) -> victory.mp3 branch", async () => {
  seedOverwhelmingPlayer();
  await prisma.$transaction(async (tx) => {
    await markGymBattleCompleted(tx, PLAYER_ID, "kanto", 1, "easy");
    await markGymBattleCompleted(tx, PLAYER_ID, "kanto", 1, "medium");
  });
  const result = await winBattle({ source: "gym", regionId: "kanto", gymNumber: 1, battleSlot: "leader" }, 6);
  assert.equal(result.victoryCompleted, true);
  assert.ok(result.reward);
});

// Regional Champion win -> victory.mp3.
test("Regional Champion win: real reward (Medal) -> victory.mp3 branch", async () => {
  seedOverwhelmingPlayer();
  await prisma.$transaction(async (tx) => {
    await markGymBattleCompleted(tx, PLAYER_ID, "kanto", 1, "leader");
    await markGymBattleCompleted(tx, PLAYER_ID, "kanto", 2, "leader");
    await markGymBattleCompleted(tx, PLAYER_ID, "kanto", 3, "leader");
  });
  const result = await winBattle({ source: "regional-champion", regionId: "kanto" }, 6);
  assert.equal(result.victoryCompleted, true);
  assert.ok(result.reward);
});

// The actual UI-side selection (source-level).
// LINE-ENDING AGNOSTIC — normalized to LF right after reading, so the
// substring checks below pass regardless of whether these files are
// checked out with LF or CRLF line endings (Windows checkouts commonly use
// CRLF; every literal pattern in this file is always written as LF).
const gymBattleContentSrc = fs.readFileSync("features/gyms/components/GymBattleContent.tsx", "utf8").replace(/\r\n/g, "\n");
const resultSoundSrc = fs.readFileSync("features/battle/utils/battle-result-sound.ts", "utf8").replace(/\r\n/g, "\n");

test("(source) the detected filename small_victory.mp3 is used exactly, and the file exists on disk", () => {
  assert.ok(resultSoundSrc.includes('export const SMALL_VICTORY_SOUND_PATH = "/sounds/battle/small_victory.mp3";'));
  assert.ok(fs.existsSync("public/sounds/battle/small_victory.mp3"));
});

test("(source) small_victory reuses the SAME shared one-shot playback primitive as victory/defeat — no duplicated Audio logic", () => {
  const audioCreationCount = resultSoundSrc.split("new Audio(path)").length - 1;
  assert.equal(audioCreationCount, 1, "there must be exactly one shared Audio-creation call site, reused by victory/defeat/small_victory alike");
  assert.ok(resultSoundSrc.includes("export function playSmallVictorySound() {\n  playResultSoundOnce(SMALL_VICTORY_SOUND_PATH);\n}"));
  assert.ok(!resultSoundSrc.includes("audio.loop = true"), "small_victory must never loop, same as victory/defeat");
});

test("(source) small_victory is gated by the SAME global sound toggle every other battle sound reads", () => {
  const fnBody = resultSoundSrc.slice(resultSoundSrc.indexOf("function playResultSoundOnce"), resultSoundSrc.indexOf("export function playVictorySound"));
  assert.ok(fnBody.includes("isSoundEnabled()"), "the shared playback primitive (used by all three result sounds) must check the global toggle");
});

test("(source) GymBattleContent selects the sound purely from outcome.reward (Easy/Medium -> playSmallVictorySound, Leader/Champion -> playVictorySound) — never from trainerName/UI text", () => {
  assert.ok(gymBattleContentSrc.includes("import { playDefeatSound, playSmallVictorySound, playVictorySound }"));
  assert.ok(gymBattleContentSrc.includes('outcome?.kind === "victory" && outcome.reward !== null && playedResultSoundRef.current !== "victory"'));
  assert.ok(gymBattleContentSrc.includes('outcome?.kind === "victory" && outcome.reward === null && playedResultSoundRef.current !== "small-victory"'));
  assert.ok(!/trainerName/.test(gymBattleContentSrc.slice(gymBattleContentSrc.indexOf("playedResultSoundRef"), gymBattleContentSrc.indexOf("function handleAttack"))));
});

test("(source) small_victory and victory are mutually exclusive by construction — one if/else-if chain, one ref value per victory, never both fired for the same result", () => {
  const effectBody = gymBattleContentSrc.slice(gymBattleContentSrc.indexOf("useEffect(() => {", gymBattleContentSrc.indexOf("playedResultSoundRef")), gymBattleContentSrc.indexOf("}, [outcome]);") + 20);
  assert.ok(effectBody.includes('} else if (outcome?.kind === "victory" && outcome.reward === null'), "small-victory must be an else-if of the victory branch, not a separate independent check");
  const victoryCallCount = (effectBody.match(/playVictorySound\(\)/g) ?? []).length;
  const smallVictoryCallCount = (effectBody.match(/playSmallVictorySound\(\)/g) ?? []).length;
  assert.equal(victoryCallCount, 1);
  assert.equal(smallVictoryCallCount, 1);
});

test("(source) each result sound is still played exactly once (ref-guarded) — replaying re-renders never re-trigger it", () => {
  assert.ok(gymBattleContentSrc.includes('playedResultSoundRef.current = "small-victory";'));
  assert.ok(gymBattleContentSrc.includes('playedResultSoundRef.current = "victory";'));
});

test("(source) defeat sound, battle music, and attack-hit are all untouched by this task", () => {
  assert.ok(gymBattleContentSrc.includes('outcome?.kind === "defeat" && playedResultSoundRef.current !== "defeat"'));
  assert.ok(gymBattleContentSrc.includes('musicActive={outcome === null}'));
  assert.ok(gymBattleContentSrc.includes("playAttackHitSound"));
});
