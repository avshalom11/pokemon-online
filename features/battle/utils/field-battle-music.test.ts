// FIELD BATTLE MUSIC — FOCUSED CHANGE — source-level coverage proving each
// battle type selects the correct music track through the ONE shared
// useBattleMusic/BattleWindow mechanism (no React-render/DOM harness in
// this project — same established convention as every other
// *-boundary.test.ts file here). Complements game-audio-settings.test.ts's
// own real, runnable proof (item 5) that the global sound toggle's
// subscribe/notify mechanism is a single shared primitive, independent of
// which track is currently loaded.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

// battle-music.ts is a "use client" component-adjacent module (imports
// react's useEffect/useRef/useSyncExternalStore, which this plain
// node:test environment can't resolve outside a real bundler context —
// same reasoning battle-music-boundary.test.ts's own doc comment already
// establishes) — read as source text only, never imported directly.
const musicSrc = readFileSync(new URL("./battle-music.ts", import.meta.url), "utf8");
const BATTLE_MUSIC_PATH = "/sounds/battle/battle-theme.mp3";
const FIELD_BATTLE_MUSIC_PATH = "/sounds/battle/regular_battle.mp3";
const windowSrc = readFileSync(new URL("../components/BattleWindow.tsx", import.meta.url), "utf8");
const battleContentSrc = readFileSync(new URL("../components/BattleContent.tsx", import.meta.url), "utf8");
const gymBattleContentSrc = readFileSync(new URL("../../gyms/components/GymBattleContent.tsx", import.meta.url), "utf8");
const leagueMatchContentSrc = readFileSync(new URL("../../leagues/components/LeagueMatchContent.tsx", import.meta.url), "utf8");

test("the exact detected filename is used for Field Battle's own track", () => {
  assert.ok(musicSrc.includes(`export const FIELD_BATTLE_MUSIC_PATH = "${FIELD_BATTLE_MUSIC_PATH}";`));
});

test("the existing shared track path is unchanged", () => {
  assert.ok(musicSrc.includes(`export const BATTLE_MUSIC_PATH = "${BATTLE_MUSIC_PATH}";`));
});

test("both audio files actually exist on disk at the referenced paths", () => {
  assert.ok(existsSync("public" + FIELD_BATTLE_MUSIC_PATH), `${FIELD_BATTLE_MUSIC_PATH} must exist on disk`);
  assert.ok(existsSync("public" + BATTLE_MUSIC_PATH), `${BATTLE_MUSIC_PATH} must exist on disk`);
});

// 1. Field Battle uses regular_battle.
test("1: Field Battle passes musicTrack={FIELD_BATTLE_MUSIC_PATH} into the shared BattleWindow", () => {
  assert.ok(battleContentSrc.includes('import { FIELD_BATTLE_MUSIC_PATH } from "@/features/battle/utils/battle-music";'));
  assert.ok(battleContentSrc.includes("musicTrack={FIELD_BATTLE_MUSIC_PATH}"));
});

// 2/3. Gym uses battle-theme (both regular Gym battles and Regional
// Champion share the SAME GymBattleContent screen/mount, gated only by the
// existing outcome-based musicActive — this task never touches which
// track that screen loads).
test("2/3: Gym AND Regional Champion (the same GymBattleContent screen) never pass musicTrack — both keep the default shared battle-theme.mp3", () => {
  assert.ok(!gymBattleContentSrc.includes("musicTrack"), "GymBattleContent must not select a per-battle-source track — Gym and Regional Champion share the same default music");
  assert.ok(gymBattleContentSrc.includes("<BattleWindow musicActive={outcome === null}>"), "the existing musicActive wiring must be completely unchanged");
});

// 4. League uses battle-theme.
test("4: League PvP never passes musicTrack — keeps the default shared battle-theme.mp3", () => {
  assert.ok(!leagueMatchContentSrc.includes("musicTrack"), "LeagueMatchContent must not select a per-battle-type track");
});

// The actual default-resolution mechanism: useBattleMusic's own default
// parameter is what makes "omit musicTrack -> battle-theme.mp3" true for
// Gym/League, proven at the source level here (game-audio-settings.test.ts
// / battle-music-boundary.test.ts already prove the playback mechanism
// itself is shared and unduplicated).
test("useBattleMusic defaults trackPath to the shared BATTLE_MUSIC_PATH when a caller omits it — this is what makes Gym/League 'do nothing' correct", () => {
  assert.ok(musicSrc.includes("trackPath: string = BATTLE_MUSIC_PATH"));
  assert.ok(windowSrc.includes("useBattleMusic(musicActive, musicTrack)"), "BattleWindow must forward musicTrack straight through, undefined when omitted");
});

test("no per-battle-type duplication: there is exactly ONE Audio-creation call site (inside useBattleMusic), reused by all four battle screens", () => {
  const audioCreationCount = musicSrc.split("new Audio(trackPath)").length - 1;
  assert.equal(audioCreationCount, 1);
  for (const src of [battleContentSrc, gymBattleContentSrc, leagueMatchContentSrc]) {
    assert.ok(!src.includes("new Audio("), "no battle-type component may create its own Audio instance");
  }
});

test("volumes, loop behavior, and the sound-toggle gating are all completely unchanged by this task", () => {
  assert.ok(musicSrc.includes("audio.loop = true"));
  assert.ok(musicSrc.includes("BATTLE_MUSIC_VOLUME = 0.18"));
  assert.ok(musicSrc.includes("if (active && soundEnabled) {"));
});
