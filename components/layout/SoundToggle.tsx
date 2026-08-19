"use client";

import { useTransition } from "react";

import { useSoundSettings } from "@/features/player/context/sound-settings-context";
import { updateSoundEnabledAction } from "@/features/profile/actions/update-profile.action";

// MOVE SOUND TO TOP TOOLBAR — the ONE user-facing sound control (replaces
// the old Edit Profile modal toggle entirely). Reads/writes the SAME
// SoundSettingsContext every battle sound already respects (features/
// player/context/sound-settings-context.tsx) — never a second sound
// state. Clicking flips the live context value immediately (so every
// mounted battle sound primitive reacts instantly, no reload) and
// persists the new value in the background through the existing
// authenticated profile-update architecture (updateSoundEnabledAction —
// ownership resolved server-side from the session, never trusted from
// this click). The persist call is fire-and-forget on purpose, same
// "never let a settings write block or delay anything visible" reasoning
// every sound primitive in this project already follows for playback
// itself — a rare failed request just means the next real edit (or a
// fresh page load) resolves back to the DB's own value.
export function SoundToggle() {
  const { soundEnabled, setSoundEnabled } = useSoundSettings();
  const [, startTransition] = useTransition();

  function handleToggle() {
    const next = !soundEnabled;
    setSoundEnabled(next);
    startTransition(async () => {
      await updateSoundEnabledAction(next);
    });
  }

  const stateLabel = soundEnabled ? "פעיל" : "כבוי";

  return (
    <button
      type="button"
      onClick={handleToggle}
      title={`סאונד: ${stateLabel}`}
      aria-label={`סאונד: ${stateLabel}`}
      aria-pressed={soundEnabled}
      className="flex items-center gap-1.5 rounded-full border border-white/10 bg-slate-900/60 px-2 py-1 text-xs font-semibold text-slate-100 transition-colors hover:border-white/20 sm:px-2.5 sm:text-sm"
    >
      <span
        aria-hidden="true"
        className={`h-2 w-2 shrink-0 rounded-full transition-colors ${
          soundEnabled ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" : "bg-slate-500"
        }`}
      />
      סאונד
    </button>
  );
}
