import { ExperienceBar } from "./ExperienceBar";
import { HealthBar } from "./HealthBar";
import type { BattleTheme } from "@/shared/types/battle-theme";
import type { BattleParticipantDisplay } from "@/shared/types/battle-ui";

interface BattleHUDProps {
  theme: BattleTheme;
  participant: BattleParticipantDisplay;
  /** Present only for the player HUD — enemy HUDs never show EXP. */
  experience?: { current: number; max: number };
}

export function BattleHUD({ theme, participant, experience }: BattleHUDProps) {
  return (
    <div
      className="relative w-56 overflow-hidden rounded-lg border border-white/10 bg-slate-900/75 py-3 pr-4 pl-4 shadow-xl backdrop-blur-md sm:w-64 sm:py-4 sm:pr-5 sm:pl-5"
      style={{ boxShadow: `0 12px 30px -14px ${theme.colors.panelAccent}66, 0 0 0 1px rgba(255,255,255,0.03) inset` }}
    >
      <div
        className="absolute inset-y-0 start-0 w-1"
        style={{ backgroundColor: theme.colors.panelAccent }}
      />

      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className="font-fantasy truncate text-sm font-semibold tracking-wide text-slate-50 sm:text-base">
          {participant.name}
        </span>
        <span
          className="shrink-0 rounded border border-white/10 bg-black/30 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-slate-200"
        >
          רמה {participant.level}
        </span>
      </div>

      <HealthBar current={participant.currentHealth} max={participant.maxHealth} />

      {experience ? (
        <div className="mt-2.5">
          <ExperienceBar
            current={experience.current}
            max={experience.max}
            accent={theme.colors.panelAccent}
          />
        </div>
      ) : null}
    </div>
  );
}
