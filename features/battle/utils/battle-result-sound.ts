import { isSoundEnabled } from "./game-audio-settings";

// BATTLE RESULT SOUNDS — one shared, non-looping "battle just ended" sound
// set, reused by Field Battle, Gym/Regional Champion, and League PvP
// alike (same folder/architecture as ATTACK_HIT_SOUND_PATH,
// battle-attack-effect.ts) — no battle type ever creates its own
// Audio instance or duplicates this playback logic.
export const VICTORY_SOUND_PATH = "/sounds/battle/victory.mp3";
export const DEFEAT_SOUND_PATH = "/sounds/battle/defeat.mp3";
// GYM SMALL VICTORY SOUND (later task) — a quieter "win" cue Gym battles
// use for Easy/Medium (no Badge/Medal awarded — see GymBattleContent's own
// outcome.reward-based branch); Field Battle and League PvP never call
// this at all, only ever playVictorySound(), completely unchanged.
export const SMALL_VICTORY_SOUND_PATH = "/sounds/battle/small_victory.mp3";

const RESULT_SOUND_VOLUME = 0.5;

// Fire-and-forget, gated by the same shared GLOBAL SOUND TOGGLE every other
// battle sound reads through (game-audio-settings.ts) — a missing/blocked
// file or soundEnabled=false is a same-tick no-op, never a delay. `loop`
// is never set (defaults to false) — plays exactly once.
function playResultSoundOnce(path: string) {
  if (typeof window === "undefined" || !isSoundEnabled()) return;

  const audio = new Audio(path);
  audio.volume = RESULT_SOUND_VOLUME;
  void audio.play().catch(() => {});
}

export function playVictorySound() {
  playResultSoundOnce(VICTORY_SOUND_PATH);
}

export function playDefeatSound() {
  playResultSoundOnce(DEFEAT_SOUND_PATH);
}

export function playSmallVictorySound() {
  playResultSoundOnce(SMALL_VICTORY_SOUND_PATH);
}
