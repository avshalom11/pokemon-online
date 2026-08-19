// BATTLE RESULT SOUNDS + GLOBAL SOUND TOGGLE — the ONE shared reactive
// store every sound-playing primitive in this project reads through
// (playAttackHitSound, useBattleMusic, playVictorySound, playDefeatSound —
// see this same folder). Deliberately a plain module-level store, not
// React Context directly: several call sites that trigger a sound (e.g.
// triggerPlayerAttack in BattleContent.tsx, playAttackSoundsForTurn in
// GymBattleContent.tsx) are plain functions invoked from inside event
// handlers/async transitions, not component bodies — they have no hook
// access, and threading a `soundEnabled` boolean through every one of
// those call sites individually is exactly the "scattered checks" the
// ticket says not to do. The real React state stays in
// features/player/context/sound-settings-context.tsx (itself seeded from
// PlayerProfile.soundEnabled) — its own Provider mirrors every change into
// this store via a single `useEffect`.
//
// SOUND TOGGLE — LIVE UPDATE BUG FIX (later task) — the store now also
// supports SUBSCRIBING (subscribeSoundEnabled), not just a one-off read
// (isSoundEnabled). Root cause of the original bug: useBattleMusic only
// ever re-checked isSoundEnabled() at the moments its OWN `active` prop
// changed (mount, or a result-overlay transition) — toggling sound mid-
// battle updated this store's value correctly, but nothing ever told the
// already-running effect to re-evaluate, so already-playing music kept
// playing (or stayed silent) until something else happened to change
// `active`. useBattleMusic now subscribes via React's own
// useSyncExternalStore, so a toggle immediately re-renders it and re-runs
// its play/pause effect. playAttackHitSound/playVictorySound/
// playDefeatSound need no such subscription — they already call
// isSoundEnabled() synchronously at the exact moment they're invoked, so
// they always see the current value with no caching involved.
//
// Defaults to true (matching the schema's own default) so a sound
// triggered before the Provider's first effect has run (a vanishingly
// brief window) still behaves correctly for the overwhelmingly common
// case.
let soundEnabled = true;
const listeners = new Set<() => void>();

export function isSoundEnabled(): boolean {
  return soundEnabled;
}

// Only ever called by SoundSettingsProvider itself — never call this
// directly from a battle-sound call site.
export function setSoundEnabledMirror(value: boolean): void {
  if (soundEnabled === value) return;
  soundEnabled = value;
  for (const listener of listeners) listener();
}

// useSyncExternalStore's own `subscribe` argument shape (a listener with no
// arguments, returning an unsubscribe function) — the ONE reactive
// subscription surface for this store, used by useBattleMusic. Plain
// call-time functions never need this; see this file's own doc comment
// above.
export function subscribeSoundEnabled(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
