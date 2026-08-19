// BATTLE RESULT SOUNDS + GLOBAL SOUND TOGGLE — source-level boundary
// coverage. Same "no React-render/DOM/Web-Audio harness in this project"
// convention battle-music-boundary.test.ts already established — what IS
// verifiable statically: the shared-helper architecture (one gate, one
// result-sound module, reused by all 3 battle types), the required file
// paths, the "play once" ref-guard at every trigger point, and that
// battle-theme music is paused on result.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const resultSoundSrc = readFileSync(new URL("../utils/battle-result-sound.ts", import.meta.url), "utf8");
const musicSrc = readFileSync(new URL("../utils/battle-music.ts", import.meta.url), "utf8");
const attackEffectSrc = readFileSync(new URL("../utils/battle-attack-effect.ts", import.meta.url), "utf8");
const gameAudioSettingsSrc = readFileSync(new URL("../utils/game-audio-settings.ts", import.meta.url), "utf8");
const battleContentSrc = readFileSync(new URL("./BattleContent.tsx", import.meta.url), "utf8");
const gymBattleContentSrc = readFileSync(new URL("../../gyms/components/GymBattleContent.tsx", import.meta.url), "utf8");
const leagueMatchContentSrc = readFileSync(new URL("../../leagues/components/LeagueMatchContent.tsx", import.meta.url), "utf8");

test("the required victory/defeat audio file paths are used exactly", () => {
  assert.ok(resultSoundSrc.includes('"/sounds/battle/victory.mp3"'));
  assert.ok(resultSoundSrc.includes('"/sounds/battle/defeat.mp3"'));
});

test("victory/defeat sounds never loop — audio.loop is never set to true anywhere in this file", () => {
  assert.ok(!resultSoundSrc.includes("audio.loop = true"), "result sounds must play exactly once, never loop like battle-theme does");
});

test("victory and defeat both go through the SAME shared playback primitive — never two duplicated Audio-creation code paths", () => {
  const creationCount = resultSoundSrc.split("new Audio(path)").length - 1;
  assert.equal(creationCount, 1, "there must be exactly one shared Audio-creation call site, reused by both playVictorySound and playDefeatSound");
});

test("both victory and defeat sounds respect the global sound toggle, through the SAME shared gate every other battle sound uses", () => {
  assert.ok(resultSoundSrc.includes("isSoundEnabled()"), "battle-result-sound.ts must gate playback on the shared toggle");
  assert.ok(attackEffectSrc.includes("isSoundEnabled()"), "playAttackHitSound must gate on the shared toggle too");
  assert.ok(musicSrc.includes("isSoundEnabled()"), "battle-theme music must gate on the shared toggle too");
});

test("the shared game-audio-settings module is the ONE place soundEnabled state is mirrored for non-hook code — a plain getter/setter, not duplicated per sound type", () => {
  assert.ok(gameAudioSettingsSrc.includes("export function isSoundEnabled"));
  assert.ok(gameAudioSettingsSrc.includes("export function setSoundEnabledMirror"));
});

test("no battle-type component creates its own victory/defeat Audio instance — all three go through the shared playVictorySound/playDefeatSound helpers only", () => {
  for (const src of [battleContentSrc, gymBattleContentSrc, leagueMatchContentSrc]) {
    assert.ok(src.includes("playVictorySound") && src.includes("playDefeatSound"), "each battle component must call the shared helpers");
    assert.ok(!src.includes("new Audio("), "no battle component may create its own Audio instance directly");
    assert.ok(!src.includes('"/sounds/battle/victory.mp3"') && !src.includes('"/sounds/battle/defeat.mp3"'), "no battle component may hardcode the result-sound paths itself");
  }
});

test("Field Battle: victory/defeat playback is ref-guarded (played exactly once) and keyed off the two real terminal phases", () => {
  assert.ok(battleContentSrc.includes('useRef<"captured" | "partyDefeated" | null>(null)'));
  assert.ok(battleContentSrc.includes('phase === "captured" && playedResultSoundRef.current !== "captured"'));
  assert.ok(battleContentSrc.includes('phase === "partyDefeated" && playedResultSoundRef.current !== "partyDefeated"'));
});

test("Gym Battle: victory/defeat playback is ref-guarded (played exactly once) and keyed off the real outcome state, placed before any early return (Rules of Hooks)", () => {
  // GYM SMALL VICTORY SOUND (later task) — the ref now also tracks
  // "small-victory" (Easy/Medium) alongside "victory" (Leader/Champion) —
  // see gym-small-victory-sound.test.ts for the full focused coverage.
  assert.ok(gymBattleContentSrc.includes('useRef<"victory" | "small-victory" | "defeat" | null>(null)'));
  // GYM VICTORY SOUND — LEADER/CHAMPION ONLY (later task) — the guard now
  // also requires a real reward (Easy/Medium never plays victory.mp3); see
  // gym-victory-sound-leader-champion-only.test.ts for the full focused
  // coverage of that rule.
  assert.ok(gymBattleContentSrc.includes('outcome?.kind === "victory" && outcome.reward !== null && playedResultSoundRef.current !== "victory"'));
  assert.ok(gymBattleContentSrc.includes('outcome?.kind === "defeat" && playedResultSoundRef.current !== "defeat"'));
  // The ref/effect must be declared BEFORE the victory early return.
  const refIndex = gymBattleContentSrc.indexOf("playedResultSoundRef");
  const earlyReturnIndex = gymBattleContentSrc.indexOf('if (outcome?.kind === "victory") {');
  assert.ok(refIndex > -1 && earlyReturnIndex > -1 && refIndex < earlyReturnIndex, "the result-sound hook must run unconditionally, before the victory early return");
});

test("League PvP: victory/defeat playback is ref-guarded (played exactly once even though `data` re-fetches repeatedly via polling) and keyed off the real server-reported winner", () => {
  assert.ok(leagueMatchContentSrc.includes('useRef<"self" | "opponent" | null>(null)'));
  assert.ok(leagueMatchContentSrc.includes('data.status !== "completed" || data.winnerSide === null'));
  assert.ok(leagueMatchContentSrc.includes('data.winnerSide === "self"'));
});

test("battle-theme music is paused on the result screen for every battle type — either via musicActive going false, or the whole BattleWindow unmounting for the result screen", () => {
  assert.ok(battleContentSrc.includes('musicActive={phase !== "captured" && phase !== "partyDefeated"}'));
  assert.ok(gymBattleContentSrc.includes("musicActive={outcome === null}"));
  // League PvP's own "completed" branch returns a dialog OUTSIDE
  // BattleWindow entirely (an early return, same pattern Gym's own victory
  // branch uses) — BattleWindow unmounts, which already stops the music via
  // useBattleMusic's own cleanup; no separate musicActive prop is needed
  // there.
  const completedBranch = leagueMatchContentSrc.slice(leagueMatchContentSrc.indexOf('if (data.status === "completed") {'), leagueMatchContentSrc.indexOf('const theme = getBattleTheme();'));
  assert.ok(!completedBranch.includes("<BattleWindow"), "the completed result screen must render OUTSIDE BattleWindow so the music-owning component unmounts");
});
