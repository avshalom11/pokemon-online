import { isSoundEnabled } from "./game-audio-settings";

// Reusable "player attack" audio primitive. Today there is exactly ONE
// universal sound for every player attack in every battle type — but every
// caller only ever imports playAttackHitSound(), so a future type-specific
// system (fire/water/electric...) only ever means changing what happens
// inside this one function, never touching BattleContent or any other
// call site.
export const ATTACK_HIT_SOUND_PATH = "/sounds/battle/attack-hit.mp3";

// Fire-and-forget: a missing/blocked audio file must never break or delay
// the battle flow, so playback failures (404, browser autoplay policy,
// etc.) are silently swallowed rather than surfaced anywhere.
//
// GLOBAL SOUND TOGGLE (later task) — gated through the ONE shared
// game-audio-settings.ts getter (see that file's own doc comment for why),
// same as every other battle sound; when OFF this is a same-tick no-op,
// never a delayed/queued skip.
export function playAttackHitSound() {
  if (typeof window === "undefined" || !isSoundEnabled()) return;

  const audio = new Audio(ATTACK_HIT_SOUND_PATH);
  audio.volume = 0.6;
  void audio.play().catch(() => {});
}
