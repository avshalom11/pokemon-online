"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

import { isSoundEnabled, subscribeSoundEnabled } from "./game-audio-settings";

// BATTLE BACKGROUND MUSIC — FOCUSED ADDITION. One shared ambient-music
// PRIMITIVE for every battle type (Field Battle, Gym/Regional Champion,
// League PvP) — mirrors ATTACK_HIT_SOUND_PATH's own "one path constant,
// one small primitive" shape (battle-attack-effect.ts), reusing the same
// public/sounds/battle/ folder. Low background volume so
// playAttackHitSound's own 0.6 stays clearly audible above it.
//
// FIELD BATTLE MUSIC (later task) — BATTLE_MUSIC_PATH remains the shared
// DEFAULT track (Gym/Regional Champion/League PvP all still use it,
// unmodified, by never passing a track override); Field Battle now passes
// its own FIELD_BATTLE_MUSIC_PATH through BattleWindow's own musicTrack
// prop instead. The playback mechanism itself (create once per mount, loop,
// volume, play/pause reacting to active+soundEnabled) stays completely
// shared — only WHICH file is selected differs, via one optional parameter,
// never a second/duplicated hook or Audio-creation code path.
export const BATTLE_MUSIC_PATH = "/sounds/battle/battle-theme.mp3";
export const FIELD_BATTLE_MUSIC_PATH = "/sounds/battle/regular_battle.mp3";
const BATTLE_MUSIC_VOLUME = 0.18;

// Mounted exactly ONCE, by BattleWindow itself (the one shared page shell
// every battle type already renders through — see that component) — no
// battle-type-specific component ever creates its own <audio>/Audio
// instance, so this is the ONE place start/loop/stop logic exists at all.
//
// The Audio element is created a SINGLE time on mount (the empty-deps
// effect below) and never re-created on a re-render — every turn/Bag-open/
// Pokémon-switch re-renders BattleWindow's children constantly, but none
// of that touches this effect's own dependency array, so the track is
// never restarted mid-battle. `active` only ever pauses/resumes the SAME
// element (never creates a second one) — set to false for the brief window
// a victory/defeat result screen is showing on top of an otherwise still-
// mounted BattleWindow (Field Battle's captured/partyDefeated overlay, Gym's
// defeat overlay); a battle screen that fully unmounts instead (Gym's own
// victory branch, League PvP's completed screen) already stops the music
// via this same effect's cleanup, with no extra signal needed.
//
// Fire-and-forget throughout: a blocked/missing audio file (browser
// autoplay policy, a 404, ...) must never throw, delay, or otherwise affect
// battle timing — every play()/pause() call is wrapped exactly like
// playAttackHitSound's own established convention.
export function useBattleMusic(active: boolean, trackPath: string = BATTLE_MUSIC_PATH) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // SOUND TOGGLE — LIVE UPDATE BUG FIX (later task) — subscribes directly
  // to the shared game-audio-settings.ts store (React's own
  // useSyncExternalStore, the canonical way for a component to reactively
  // read an external mutable value) instead of only reading isSoundEnabled()
  // once whenever `active` happens to change. This is what makes toggling
  // sound mid-battle immediately pause/resume an already-mounted track —
  // the getServerSnapshot argument (third one) matches isSoundEnabled()'s
  // own default (true), so server-rendered HTML and the first client
  // render agree and never hydration-mismatch.
  const soundEnabled = useSyncExternalStore(subscribeSoundEnabled, isSoundEnabled, () => true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // `trackPath` is deliberately NOT a dependency here (same "created
    // exactly once per mount" rule as before this task) — every caller
    // passes one fixed, unchanging path for that battle screen's entire
    // lifetime (BATTLE_MUSIC_PATH for Gym/League, FIELD_BATTLE_MUSIC_PATH
    // for Field Battle), so this still only ever creates one Audio element
    // per mount, never re-created/restarted on a later render/turn.
    const audio = new Audio(trackPath);
    audio.loop = true;
    audio.volume = BATTLE_MUSIC_VOLUME;
    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.currentTime = 0;
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Reacts to EITHER `active` (a result overlay opening/closing) OR the
    // live `soundEnabled` value (the toolbar toggle) — a toggle while
    // `active` is already true immediately pauses the track, and toggling
    // back on resumes it automatically without needing `active` to change
    // or the battle to restart.
    if (active && soundEnabled) {
      void audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [active, soundEnabled]);
}
