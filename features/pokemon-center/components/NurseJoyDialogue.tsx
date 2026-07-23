import type { ReactNode } from "react";

import { SpriteImage } from "@/components/media/SpriteImage";

// Same public asset directory Professor Oak's portrait already uses
// (public/assets/characters/professor-oak/) and the same SpriteImage
// loading pattern as OnboardingWelcome — see
// features/onboarding/components/OnboardingWelcome.tsx. Kept as a literal
// path here, matching that existing convention rather than inventing a
// media-path helper for a single non-Pokémon character portrait.
const NURSE_JOY_IMAGE_PATH = "/assets/characters/professor-oak/Sister-Joy.png";

export interface DialogueAction {
  id: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary";
}

interface NurseJoyDialogueProps {
  message: string;
  actions?: DialogueAction[];
  children?: ReactNode;
}

// The Pokémon Center's recurring "portrait + speech bubble" surface — reused
// for every dialogue state (welcome Yes/No, already-full notice, empty-party
// notice, post-heal success) so there is exactly one place that lays out
// Nurse Joy's portrait and message, matching the message-box/action-button
// idiom already established by BattleMessageBox/BattleMenu for the battle
// screen. `actions` is optional so states with no buttons (e.g. the
// no-active-party notice, which instead renders a link via `children`) don't
// need to pass an empty array.
export function NurseJoyDialogue({ message, actions, children }: NurseJoyDialogueProps) {
  return (
    <div
      dir="rtl"
      className="flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-slate-900/60 p-5 text-center shadow-xl sm:flex-row sm:items-center sm:gap-6 sm:text-start"
    >
      <SpriteImage
        src={NURSE_JOY_IMAGE_PATH}
        alt="אחות ג'וי"
        // Portrait's natural aspect ratio is wider than tall — constraining
        // only the width (no explicit height class) lets the browser's
        // default img sizing keep it proportional, never stretched.
        className="h-auto w-48 shrink-0 object-contain sm:w-64"
        fallbackClassName="flex h-28 w-48 shrink-0 items-center justify-center rounded-xl border border-dashed border-white/20 bg-slate-800/60 text-slate-500 sm:w-64"
      />

      <div className="flex flex-1 flex-col items-center gap-3 sm:items-start">
        <div className="relative w-full rounded-xl border border-white/10 bg-slate-800/70 px-4 py-3 text-sm font-medium text-slate-100 shadow-inner sm:text-base">
          {message}
        </div>

        {actions && actions.length > 0 ? (
          <div className="flex flex-wrap justify-center gap-3 sm:justify-start">
            {actions.map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={action.onClick}
                disabled={action.disabled}
                className={`rounded-full border px-5 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  action.variant === "secondary"
                    ? "border-white/10 bg-slate-900/60 text-slate-300 hover:border-white/20 hover:bg-slate-800"
                    : "border-indigo-400/70 bg-indigo-500/20 text-indigo-200 hover:bg-indigo-500/30"
                }`}
              >
                {action.label}
              </button>
            ))}
          </div>
        ) : null}

        {children}
      </div>
    </div>
  );
}
