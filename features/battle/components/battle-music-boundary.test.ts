// BATTLE BACKGROUND MUSIC — FOCUSED ADDITION. A static source check rather
// than a runtime one on purpose — the Web Audio primitive this feature is
// built on has no practical way to unit-test in this project's Node-based
// test setup (no React Testing Library / jsdom / DOM Audio implementation
// installed here — see BattleContent.no-damage-math.test.ts's own doc
// comment for the same established reasoning). What IS verifiable
// statically: the shared-helper architecture the ticket requires (one
// hook, mounted from the one shared BattleWindow shell, never duplicated
// per battle type), the required file path, and that the existing attack
// SFX is untouched.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const musicSrc = readFileSync(new URL("../utils/battle-music.ts", import.meta.url), "utf8");
const windowSrc = readFileSync(new URL("./BattleWindow.tsx", import.meta.url), "utf8");
const battleContentSrc = readFileSync(new URL("./BattleContent.tsx", import.meta.url), "utf8");
const attackEffectSrc = readFileSync(new URL("../utils/battle-attack-effect.ts", import.meta.url), "utf8");
const gymBattleContentSrc = readFileSync(new URL("../../gyms/components/GymBattleContent.tsx", import.meta.url), "utf8");
const leagueMatchContentSrc = readFileSync(new URL("../../leagues/components/LeagueMatchContent.tsx", import.meta.url), "utf8");

test("the required audio file path is used exactly", () => {
  assert.ok(musicSrc.includes('"/sounds/battle/battle-theme.mp3"'));
});

test("music loops continuously and plays at a low background volume, well below the attack SFX's own volume", () => {
  assert.ok(musicSrc.includes("audio.loop = true"), "the track must loop");
  const volumeMatch = musicSrc.match(/BATTLE_MUSIC_VOLUME\s*=\s*([\d.]+)/);
  assert.ok(volumeMatch, "a music volume constant must exist");
  const musicVolume = Number(volumeMatch![1]);
  const sfxVolumeMatch = attackEffectSrc.match(/audio\.volume\s*=\s*([\d.]+)/);
  assert.ok(sfxVolumeMatch, "the attack SFX must still set its own volume");
  const sfxVolume = Number(sfxVolumeMatch![1]);
  assert.ok(musicVolume > 0 && musicVolume < sfxVolume, "background music must be clearly quieter than the attack SFX so the SFX stays audible above it");
});

test("the Audio element is created exactly ONCE per mount (empty-deps effect) — never re-created on every re-render/turn, even though trackPath is now a parameter", () => {
  assert.ok(musicSrc.includes("useEffect(() => {") && musicSrc.includes("new Audio(trackPath)"));
  // The creation effect's own dependency array is empty — mount/unmount
  // only, confirmed by the literal `}, []);` immediately following its
  // cleanup return. trackPath is deliberately NOT a dependency (see the
  // file's own doc comment) — every caller passes one fixed path for that
  // battle screen's whole lifetime.
  const creationEffect = musicSrc.slice(musicSrc.indexOf("new Audio(trackPath)"), musicSrc.indexOf("new Audio(trackPath)") + 600);
  assert.ok(creationEffect.includes("}, []);"), "the Audio element must only ever be created once per mount, never per turn/render");
});

test("unmounting stops the music immediately (pause + reset, in the cleanup function)", () => {
  const cleanupSection = musicSrc.slice(musicSrc.indexOf("return () => {"), musicSrc.indexOf("audioRef.current = null;") + 30);
  assert.ok(cleanupSection.includes("audio.pause()"));
});

test("BattleWindow is the ONE place useBattleMusic is mounted — no battle-type component creates its own Audio instance", () => {
  assert.ok(windowSrc.includes("useBattleMusic(musicActive, musicTrack)"));
  for (const src of [battleContentSrc, gymBattleContentSrc, leagueMatchContentSrc]) {
    assert.ok(!src.includes("new Audio(") && !src.includes("useBattleMusic"), "no battle-type-specific component may create its own audio instance or call the hook directly — it must go through the SHARED BattleWindow only");
  }
});

test("Field Battle, Gym Battle, and League PvP all render through the SAME shared BattleWindow — no duplicated shell/audio logic per battle type", () => {
  assert.ok(battleContentSrc.includes("<BattleWindow"));
  assert.ok(gymBattleContentSrc.includes("<BattleWindow"));
  assert.ok(leagueMatchContentSrc.includes("<BattleWindow"));
});

test("music pauses (not unmount-only) once a result overlay is showing while BattleWindow itself stays mounted — Field Battle's captured/partyDefeated overlay and Gym's defeat overlay", () => {
  assert.ok(battleContentSrc.includes('musicActive={phase !== "captured" && phase !== "partyDefeated"}'));
  assert.ok(gymBattleContentSrc.includes("musicActive={outcome === null}"));
});

test("the existing attack-hit sound is completely untouched by this task", () => {
  assert.ok(attackEffectSrc.includes('"/sounds/battle/attack-hit.mp3"'));
  assert.ok(attackEffectSrc.includes("audio.volume = 0.6"));
});

test("play()/pause() failures are always swallowed — a blocked or missing audio file must never throw, delay, or affect battle timing", () => {
  const playCallCount = musicSrc.split(".play().catch(() => {})").length - 1;
  assert.ok(playCallCount >= 1, "every play() call must be wrapped with a swallowed .catch");
  assert.ok(!musicSrc.includes("await audio.play()") , "play() must never be awaited — it must never block or delay anything");
});

// SOUND TOGGLE — LIVE UPDATE BUG FIX (later task) — the actual fix: the
// play/pause effect used to depend on `[active]` alone, so toggling sound
// mid-battle never re-ran it (already-playing music kept playing until
// something else — a result overlay, a remount — happened to change
// `active`). It now subscribes to the shared store reactively and
// re-evaluates whenever the live value changes too.
test("1/2: the play/pause effect reacts to the LIVE sound-enabled value, not just `active` — the exact fix for the reported live-update bug", () => {
  assert.ok(musicSrc.includes("import { isSoundEnabled, subscribeSoundEnabled } from \"./game-audio-settings\";"));
  assert.ok(musicSrc.includes("useSyncExternalStore(subscribeSoundEnabled, isSoundEnabled"), "must subscribe via React's own useSyncExternalStore — a real reactive subscription, not a one-off read");
  assert.ok(musicSrc.includes("if (active && soundEnabled) {"), "the play condition must check the LIVE subscribed value");
  assert.ok(musicSrc.includes("}, [active, soundEnabled]);"), "the effect's dependency array must include the live soundEnabled value, not just active — this is the exact bug that made an already-mounted track ignore the toggle");
});

test("no second/independent sound state is introduced — useBattleMusic holds no local useState of its own for this; the shared store is the only source", () => {
  assert.ok(!musicSrc.includes("useState"), "useBattleMusic must never track its own separate soundEnabled state — only the shared store via useSyncExternalStore");
});

test("a getServerSnapshot is provided to useSyncExternalStore, matching the store's own default, so SSR/first client render never hydration-mismatch", () => {
  assert.ok(musicSrc.includes("useSyncExternalStore(subscribeSoundEnabled, isSoundEnabled, () => true)"));
});
