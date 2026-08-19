"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { setSoundEnabledMirror } from "@/features/battle/utils/game-audio-settings";

interface SoundSettingsContextValue {
  soundEnabled: boolean;
  // Called by EditProfileModal's own save-success handler the instant
  // updateProfileAction resolves — no navigation, no full refresh, exactly
  // the same "push a fresh server-authoritative value immediately" pattern
  // PlayerProgressionProvider's own applyProgress already establishes.
  setSoundEnabled: (value: boolean) => void;
}

const SoundSettingsContext = createContext<SoundSettingsContextValue | null>(null);

interface SoundSettingsProviderProps {
  // Seeded from PlayerProfile.soundEnabled (app/(game)/layout.tsx, already
  // fetching the profile for other providers) — same "adjust state during
  // render on a changed initial prop" resync idiom PlayerProgressionProvider
  // uses, so a real navigation/full refresh that lands with a different
  // server value still corrects this.
  initial: boolean;
  children: ReactNode;
}

// BATTLE RESULT SOUNDS + GLOBAL SOUND TOGGLE — lives in app/(game)/layout.tsx,
// above {children}, so it survives client-side navigation between every
// page under this layout (battle screens included) instead of being
// re-created. This is the ONE reactive source of truth for
// `soundEnabled` — see game-audio-settings.ts's own doc comment for why a
// plain mirrored module variable (kept in sync by the effect below) is
// what every actual sound-playing primitive reads through instead of this
// context directly.
export function SoundSettingsProvider({ initial, children }: SoundSettingsProviderProps) {
  const [soundEnabled, setSoundEnabled] = useState(initial);
  const [prevInitial, setPrevInitial] = useState(initial);
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    setSoundEnabled(initial);
  }

  useEffect(() => {
    setSoundEnabledMirror(soundEnabled);
  }, [soundEnabled]);

  return <SoundSettingsContext.Provider value={{ soundEnabled, setSoundEnabled }}>{children}</SoundSettingsContext.Provider>;
}

export function useSoundSettings(): SoundSettingsContextValue {
  const context = useContext(SoundSettingsContext);
  if (!context) {
    throw new Error("useSoundSettings must be used within a SoundSettingsProvider");
  }
  return context;
}
